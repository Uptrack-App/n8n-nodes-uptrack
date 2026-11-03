import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
