'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createHmac } = require('node:crypto');
const { Uptrack } = require('../dist/nodes/Uptrack/Uptrack.node.js');
const { UptrackTrigger } = require('../dist/nodes/UptrackTrigger/UptrackTrigger.node.js');

// A small fake of n8n's execute context. `routes` maps "METHOD /path" to a function (options) => response.
function fakeExecute(params, routes, { items = 1, continueOnFail = false } = {}) {
	const calls = [];
	const context = {
		getInputData: () => Array.from({ length: items }, () => ({ json: {} })),
		getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
		getCredentials: async () => ({ apiKey: 'k', baseUrl: 'https://api.uptrack.app/' }),
		getNode: () => ({ name: 'Uptrack', type: 'uptrack', typeVersion: 1, id: 'n1', position: [0, 0], parameters: {} }),
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async function (cred, options) {
				const path = options.url.replace('https://api.uptrack.app', '');
				calls.push({ cred, method: options.method, path, qs: options.qs, body: options.body });
				const handler = routes[`${options.method} ${path}`];
				if (!handler) throw new Error(`no route for ${options.method} ${path}`);
				return handler(options);
			},
		},
	};
	return { context, calls };
}
const run = (params, routes, opts) => {
	const { context, calls } = fakeExecute(params, routes, opts);
	return new Uptrack().execute.call(context).then((out) => ({ out: out[0], calls }));
};

test('monitor get many reads every page (100 per page) and stops at the total', async () => {
	const mk = (n, from) => Array.from({ length: n }, (_, k) => ({ id: `m${from + k}` }));
	const { out, calls } = await run(
		{ resource: 'monitor', operation: 'getAll', returnAll: true, filters: { search: 'api' } },
		{
			'GET /api/monitors': (o) =>
				o.qs.page === 1 ? { data: mk(100, 0), meta: { total: 130, page: 1, per_page: 100 } } : { data: mk(30, 100), meta: { total: 130, page: 2, per_page: 100 } },
		},
	);
	assert.strictEqual(out.length, 130);
	assert.strictEqual(calls.length, 2);
	assert.deepStrictEqual([calls[0].qs.page, calls[1].qs.page], [1, 2]);
	assert.strictEqual(calls[0].qs.search, 'api');
	assert.strictEqual(calls[0].qs.per_page, 100);
	assert.strictEqual(calls[0].cred, 'uptrackApi');
});

test('monitor get many with a limit stops early', async () => {
	const { out, calls } = await run(
		{ resource: 'monitor', operation: 'getAll', returnAll: false, limit: 5, filters: {} },
		{ 'GET /api/monitors': () => ({ data: Array.from({ length: 100 }, (_, k) => ({ id: `m${k}` })), meta: { total: 500 } }) },
	);
	assert.strictEqual(out.length, 5);
	assert.strictEqual(calls.length, 1);
});

test('monitor get unwraps data', async () => {
	const { out } = await run({ resource: 'monitor', operation: 'get', monitorId: 'abc' }, { 'GET /api/monitors/abc': () => ({ data: { id: 'abc', name: 'Site' } }) });
	assert.deepStrictEqual(out[0].json, { id: 'abc', name: 'Site' });
});

test('monitor create sends the minimal body and the optional fields', async () => {
	const { calls } = await run(
		{ resource: 'monitor', operation: 'create', name: 'Site', monitorType: 'http', url: 'https://example.com', additionalFields: { interval: 60 } },
		{ 'POST /api/monitors': () => ({ data: { id: 'new' } }) },
	);
	assert.deepStrictEqual(calls[0].body, { name: 'Site', monitor_type: 'http', interval: 60, url: 'https://example.com' });
});

test('heartbeat create leaves url out when empty', async () => {
	const { calls } = await run(
		{ resource: 'monitor', operation: 'create', name: 'Cron', monitorType: 'heartbeat', url: '', additionalFields: {} },
		{ 'POST /api/monitors': () => ({ data: { id: 'new', heartbeat_ping_url: 'https://x' } }) },
	);
	assert.strictEqual('url' in calls[0].body, false);
});

test('monitor update needs at least one field', async () => {
	await assert.rejects(
		run({ resource: 'monitor', operation: 'update', monitorId: 'abc', updateFields: {} }, {}),
		/at least one field/,
	);
});

for (const action of ['pause', 'resume', 'delete']) {
	test(`monitor ${action} uses the bulk endpoint`, async () => {
		const { out, calls } = await run({ resource: 'monitor', operation: action, monitorId: 'abc' }, { 'POST /api/monitors/bulk': () => ({ data: { count: 1, action } }) });
		assert.deepStrictEqual(calls[0].body, { action, monitor_ids: ['abc'] });
		assert.deepStrictEqual(out[0].json, { success: true, action, monitorId: 'abc' });
	});
}

test('incident get many filters ongoing and applies the limit', async () => {
	const { out, calls } = await run(
		{ resource: 'incident', operation: 'getAll', returnAll: false, limit: 2, onlyOngoing: true },
		{ 'GET /api/incidents': () => ({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }) },
	);
	assert.strictEqual(out.length, 2);
	assert.deepStrictEqual(calls[0].qs, { status: 'ongoing' });
});

test('incident get and acknowledge merge the incident with its updates', async () => {
	const reply = { data: { incident: { id: 'i1', status: 'ongoing' }, updates: [{ id: 'u1' }] } };
	const get = await run({ resource: 'incident', operation: 'get', incidentId: 'i1' }, { 'GET /api/incidents/i1': () => reply });
	assert.deepStrictEqual(get.out[0].json, { id: 'i1', status: 'ongoing', updates: [{ id: 'u1' }] });
	const ack = await run({ resource: 'incident', operation: 'acknowledge', incidentId: 'i1' }, { 'POST /api/incidents/i1/acknowledge': () => reply });
	assert.strictEqual(ack.calls[0].method, 'POST');
	assert.strictEqual(ack.out[0].json.id, 'i1');
});

test('incident post update sends status plus the optional text', async () => {
	const { calls } = await run(
		{ resource: 'incident', operation: 'postUpdate', incidentId: 'i1', status: 'resolved', updateFields: { description: 'Fixed' } },
		{ 'POST /api/incidents/i1/updates': () => ({ data: { incident: { id: 'i1' }, updates: [] } }) },
	);
	assert.deepStrictEqual(calls[0].body, { status: 'resolved', description: 'Fixed' });
});

test('an API error becomes a node error, or an error item with continue on fail', async () => {
	const failing = { 'GET /api/monitors/abc': () => { throw { httpCode: '404', message: 'Not found', description: 'no such monitor' }; } };
	await assert.rejects(run({ resource: 'monitor', operation: 'get', monitorId: 'abc' }, failing), (e) => e.constructor.name === 'NodeApiError');
	const { out } = await run({ resource: 'monitor', operation: 'get', monitorId: 'abc' }, failing, { continueOnFail: true });
	assert.ok(out[0].json.error);
});

// ---- trigger
function fakeWebhook({ body, secret = 'whsec_abc12345678', signature, events = ['monitor.down', 'monitor.up'], useRaw = true }) {
	const raw = Buffer.from(JSON.stringify(body));
	const res = { code: 0, sent: '', status(c) { this.code = c; return this; }, send(s) { this.sent = s; return this; } };
	const context = {
		getRequestObject: () => ({ rawBody: useRaw ? raw : undefined }),
		getResponseObject: () => res,
		getBodyData: () => body,
		getHeaderData: () => (signature ? { 'x-uptrack-signature': signature } : {}),
		getNodeParameter: (n, d) => (n === 'events' ? events : d),
		getCredentials: async () => ({ signingSecret: secret }),
		helpers: { returnJsonArray: (b) => [{ json: b }] },
	};
	return { context, res, raw };
}
const signed = (raw, secret = 'whsec_abc12345678', t = Math.floor(Date.now() / 1000)) =>
	`t=${t},v1=${createHmac('sha256', secret).update(`${t}.`).update(raw).digest('hex')}`;

test('trigger passes a correctly signed event to the workflow', async () => {
	const body = { event: 'monitor.down', monitor: { id: 'm1' } };
	const w = fakeWebhook({ body });
	w.context.getHeaderData = () => ({ 'x-uptrack-signature': signed(w.raw) });
	const out = await new UptrackTrigger().webhook.call(w.context);
	assert.deepStrictEqual(out.workflowData[0][0].json, body);
});

test('trigger refuses a bad or missing signature with 401', async () => {
	for (const signature of [undefined, 'garbage', signed(Buffer.from('other'))]) {
		const w = fakeWebhook({ body: { event: 'monitor.down' }, signature });
		const out = await new UptrackTrigger().webhook.call(w.context);
		assert.strictEqual(w.res.code, 401);
		assert.strictEqual(out.noWebhookResponse, true);
		assert.strictEqual(out.workflowData, undefined);
	}
});

test('trigger ignores events the user did not select but answers 200', async () => {
	const w = fakeWebhook({ body: { event: 'monitor.up' }, events: ['monitor.down'] });
	w.context.getHeaderData = () => ({ 'x-uptrack-signature': signed(w.raw) });
	const out = await new UptrackTrigger().webhook.call(w.context);
	assert.strictEqual(out.workflowData, undefined);
	assert.deepStrictEqual(out.webhookResponse, { ignored: true });
});

test('trigger credential test checks the whsec_ shape', async () => {
	const t = new UptrackTrigger().methods.credentialTest.uptrackWebhookApiTest;
	assert.strictEqual((await t.call({}, { data: { signingSecret: 'whsec_abcdefghij' } })).status, 'OK');
	assert.strictEqual((await t.call({}, { data: { signingSecret: 'nope' } })).status, 'Error');
});
