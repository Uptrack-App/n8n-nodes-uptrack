'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createHmac } = require('node:crypto');
const { verifyUptrackSignature } = require('../dist/nodes/UptrackTrigger/signature.js');

const secret = 'whsec_test_secret';
const body = '{"event":"monitor.down","monitor":{"id":"m1"}}';
const sign = (t, b = body, s = secret) =>
	`t=${t},v1=${createHmac('sha256', s).update(`${t}.${b}`).digest('hex')}`;
const NOW = 1_712_000_000_000;
const T = 1_712_000_000;

test('accepts a correct signature (string and Buffer body)', () => {
	assert.strictEqual(verifyUptrackSignature(body, sign(T), secret, NOW), true);
	assert.strictEqual(verifyUptrackSignature(Buffer.from(body), sign(T), secret, NOW), true);
});

test('accepts the example header from the Uptrack docs format', () => {
	assert.strictEqual(verifyUptrackSignature(body, ` t=${T} , v1=${sign(T).split('v1=')[1]}`, secret, NOW), true);
});

test('rejects a wrong secret, a changed body and a missing header', () => {
	assert.strictEqual(verifyUptrackSignature(body, sign(T, body, 'whsec_other'), secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body + ' ', sign(T), secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, undefined, secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, '', secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, sign(T), '', NOW), false);
});

test('rejects malformed headers', () => {
	assert.strictEqual(verifyUptrackSignature(body, 'v1=abc', secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, `t=${T}`, secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, `t=abc,v1=${'0'.repeat(64)}`, secret, NOW), false);
	assert.strictEqual(verifyUptrackSignature(body, `t=${T},v1=short`, secret, NOW), false);
});

test('rejects requests outside the 5 minute window, in both directions', () => {
	assert.strictEqual(verifyUptrackSignature(body, sign(T), secret, NOW + 299_000), true);
	assert.strictEqual(verifyUptrackSignature(body, sign(T), secret, NOW + 301_000), false);
	assert.strictEqual(verifyUptrackSignature(body, sign(T), secret, NOW - 301_000), false);
});
