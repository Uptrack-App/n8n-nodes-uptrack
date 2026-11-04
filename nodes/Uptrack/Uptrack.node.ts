import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	getIdParameter,
	pathId,
	uptrackApiRequest,
	uptrackGetAllMonitors,
} from './GenericFunctions';
import { incidentFields, incidentOperations } from './IncidentDescription';
import { monitorFields, monitorOperations } from './MonitorDescription';

// Programmatic on purpose: "Get Many" reads several pages, and list and detail endpoints wrap their
// result in `data`, which a declarative node would have to unwrap with extra post-processing for each call.
export class Uptrack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Uptrack',
		name: 'uptrack',
		icon: { light: 'file:uptrack.svg', dark: 'file:uptrack.dark.svg' },
		group: ['output'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Uptrack uptime monitors and incidents',
		defaults: {
			name: 'Uptrack',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'uptrackApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Incident', value: 'incident' },
					{ name: 'Monitor', value: 'monitor' },
				],
				default: 'monitor',
			},
			...monitorOperations,
			...monitorFields,
			...incidentOperations,
			...incidentFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let results: IDataObject[] = [];

				if (resource === 'monitor') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						results = await uptrackGetAllMonitors.call(this, filters, limit);
					} else if (operation === 'get') {
						const id = getIdParameter.call(this, 'monitorId', i);
						const response = await uptrackApiRequest.call(this, 'GET', `/api/monitors/${pathId(id)}`);
						results = [response.data as IDataObject];
					} else if (operation === 'create') {
						const body: IDataObject = {
							name: this.getNodeParameter('name', i) as string,
							monitor_type: this.getNodeParameter('monitorType', i) as string,
							...(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
						};
						const url = this.getNodeParameter('url', i, '') as string;
						if (url) body.url = url;
						const response = await uptrackApiRequest.call(this, 'POST', '/api/monitors', body);
						results = [response.data as IDataObject];
					} else if (operation === 'update') {
						const id = getIdParameter.call(this, 'monitorId', i);
						const body = this.getNodeParameter('updateFields', i, {}) as IDataObject;
						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(this.getNode(), 'Add at least one field to update', {
								itemIndex: i,
							});
						}
						const response = await uptrackApiRequest.call(this, 'PATCH', `/api/monitors/${pathId(id)}`, body);
						results = [response.data as IDataObject];
					} else if (['pause', 'resume', 'delete'].includes(operation)) {
						const id = getIdParameter.call(this, 'monitorId', i);
						await uptrackApiRequest.call(this, 'POST', '/api/monitors/bulk', {
							action: operation,
							monitor_ids: [id],
						});
						results = [{ success: true, action: operation, monitorId: id }];
					}
				} else if (resource === 'incident') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const onlyOngoing = filters.onlyOngoing === true;
						const response = await uptrackApiRequest.call(
							this,
							'GET',
							'/api/incidents',
							{},
							onlyOngoing ? { status: 'ongoing' } : {},
						);
						results = (response.data as IDataObject[] | undefined) ?? [];
						if (!returnAll) results = results.slice(0, this.getNodeParameter('limit', i) as number);
					} else if (operation === 'get' || operation === 'acknowledge') {
						const id = getIdParameter.call(this, 'incidentId', i);
						const response =
							operation === 'get'
								? await uptrackApiRequest.call(this, 'GET', `/api/incidents/${pathId(id)}`)
								: await uptrackApiRequest.call(this, 'POST', `/api/incidents/${pathId(id)}/acknowledge`);
						const data = response.data as IDataObject;
						results = [{ ...(data.incident as IDataObject), updates: data.updates }];
					} else if (operation === 'postUpdate') {
						const id = getIdParameter.call(this, 'incidentId', i);
						const body: IDataObject = {
							status: this.getNodeParameter('status', i) as string,
							...(this.getNodeParameter('updateFields', i, {}) as IDataObject),
						};
						const response = await uptrackApiRequest.call(
							this,
							'POST',
							`/api/incidents/${pathId(id)}/updates`,
							body,
						);
						const data = response.data as IDataObject;
						results = [{ ...(data.incident as IDataObject), updates: data.updates }];
					}
				}

				if (results.length === 0 && !['getAll'].includes(operation)) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}

				for (const json of results) {
					returnData.push({ json, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
