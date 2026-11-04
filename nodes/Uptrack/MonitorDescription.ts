import type { INodeProperties } from 'n8n-workflow';

const show = (operation: string[]) => ({ resource: ['monitor'], operation });

export const monitorOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['monitor'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a monitor', action: 'Create a monitor' },
			{ name: 'Delete', value: 'delete', description: 'Delete a monitor', action: 'Delete a monitor' },
			{ name: 'Get', value: 'get', description: 'Get a monitor', action: 'Get a monitor' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many monitors', action: 'Get many monitors' },
			{ name: 'Pause', value: 'pause', description: 'Pause a monitor', action: 'Pause a monitor' },
			{ name: 'Resume', value: 'resume', description: 'Resume a paused monitor', action: 'Resume a monitor' },
			{ name: 'Update', value: 'update', description: 'Update a monitor', action: 'Update a monitor' },
		],
		default: 'getAll',
	},
];

export const monitorFields: INodeProperties[] = [
	// ID, for every operation on one monitor
	{
		displayName: 'Monitor ID',
		name: 'monitorId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: show(['get', 'update', 'pause', 'resume', 'delete']) },
		description: 'The ID of the monitor (a UUID, shown in the monitor URL and in "Get Many")',
	},

	// Get Many
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
		displayOptions: { show: { resource: ['monitor'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: show(['getAll']) },
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				default: 'browser',
				options: [
					{ name: 'Browser', value: 'browser' },
					{ name: 'Third Party', value: 'third_party' },
				],
				description: 'Only monitors of this kind',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Only monitors whose name or URL contains this text',
			},
		],
	},

	// Create
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: show(['create']) },
		description: 'A name for the monitor',
	},
	{
		displayName: 'Monitor Type',
		name: 'monitorType',
		type: 'options',
		required: true,
		default: 'http',
		displayOptions: { show: show(['create']) },
		options: [
			{ name: 'Heartbeat', value: 'heartbeat' },
			{ name: 'HTTP', value: 'http' },
		],
		description: 'What the monitor checks. More types may follow; other types can be made in the Uptrack dashboard.',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com',
		displayOptions: { show: { resource: ['monitor'], operation: ['create'], monitorType: ['http'] } },
		description: 'The address to check',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show(['create']) },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A note about the monitor',
			},
			{
				displayName: 'Interval (Seconds)',
				name: 'interval',
				type: 'number',
				default: 60,
				typeOptions: { minValue: 1 },
				description: 'How often to check. The shortest interval depends on your plan.',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1 },
				description: 'How long to wait for an answer before the check fails',
			},
		],
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: show(['update']) },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A note about the monitor',
			},
			{
				displayName: 'Interval (Seconds)',
				name: 'interval',
				type: 'number',
				default: 60,
				typeOptions: { minValue: 1 },
				description: 'How often to check. The shortest interval depends on your plan.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'A new name for the monitor',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1 },
				description: 'How long to wait for an answer before the check fails',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'A new address to check',
			},
		],
	},
];
