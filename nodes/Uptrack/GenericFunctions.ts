import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/** One call to the Uptrack API with the API key of the selected credential. */
export async function uptrackApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('uptrackApi');
	const baseUrl = ((credentials.baseUrl as string) || 'https://api.uptrack.app').replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		qs,
		json: true,
	};
	if (method !== 'GET' && method !== 'DELETE' && Object.keys(body).length > 0) {
		options.body = body;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'uptrackApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Reads the monitor list page by page (100 per page) until `limit` items are collected,
 * or all of them when `limit` is 0.
 */
export async function uptrackGetAllMonitors(
	this: IExecuteFunctions,
	qs: IDataObject,
	limit: number,
): Promise<IDataObject[]> {
	const perPage = 100;
	const items: IDataObject[] = [];
	let page = 1;

	for (;;) {
		const response = await uptrackApiRequest.call(this, 'GET', '/api/monitors', {}, {
			...qs,
			page,
			per_page: perPage,
		});
		const data = (response.data as IDataObject[] | undefined) ?? [];
		items.push(...data);

		const total = Number((response.meta as IDataObject | undefined)?.total ?? items.length);
		if (limit > 0 && items.length >= limit) return items.slice(0, limit);
		if (data.length < perPage || items.length >= total) return items;
		page += 1;
	}
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads a monitor or incident ID and checks that it is a UUID, which is what the Uptrack API uses.
 * The value goes into a URL path, and it can come from earlier workflow data. A value such as
 * `../api-keys` must never change which endpoint is called, so anything else is refused.
 */
export function getIdParameter(this: IExecuteFunctions, name: string, itemIndex: number): string {
	const value = String(this.getNodeParameter(name, itemIndex, '')).trim();
	if (!UUID.test(value)) {
		throw new NodeOperationError(
			this.getNode(),
			`The ${name === 'monitorId' ? 'monitor' : 'incident'} ID must be a UUID like 0192f1c4-7c8a-7000-8000-4b1d2e3f5a6c`,
			{ itemIndex },
		);
	}
	return value;
}

/** An ID for use in a URL path, encoded as well as validated. */
export const pathId = (id: string): string => encodeURIComponent(id);
