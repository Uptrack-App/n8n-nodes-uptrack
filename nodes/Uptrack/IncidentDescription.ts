import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ resource: ['incident'], operation });

export const incidentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['incident'] } },
		options: [
			{
				name: 'Acknowledge',
				value: 'acknowledge',
				description: 'Acknowledge an incident and pause its escalation',
				action: 'Acknowledge an incident',
			},
			{ name: 'Get', value: 'get', description: 'Get an incident with its updates', action: 'Get an incident' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many incidents', action: 'Get many incidents' },
			{
				name: 'Post Update',
				value: 'postUpdate',
				description: 'Post an update to an incident',
				action: 'Post an update to an incident',
			},
		],
		default: 'getAll',
	},
];

export const incidentFields: INodeProperties[] = [
	{
		displayName: 'Incident ID',
		name: 'incidentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: show(['get', 'acknowledge', 'postUpdate']) },
		description: 'The ID of the incident (a UUID, shown by "Get Many" and in the trigger payload)',
	},

	// Get Many
	{
		displayName: 'Only Ongoing',
		name: 'onlyOngoing',
		type: 'boolean',
		default: true,
		displayOptions: { show: show(['getAll']) },
		description: 'Whether to return only incidents that are still open',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: show(['getAll']) },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['incident'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},

	// Post Update
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		default: 'investigating',
		displayOptions: { show: show(['postUpdate']) },
		options: [
			{ name: 'Identified', value: 'identified' },
			{ name: 'Investigating', value: 'investigating' },
			{ name: 'Monitoring', value: 'monitoring' },
			{ name: 'Resolved', value: 'resolved' },
		],
		description: 'The status shown on the update. "Resolved" also closes the incident.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show(['postUpdate']) },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'The text of the update',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'A short title for the update',
			},
		],
	},
];
