import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class UptrackApi implements ICredentialType {
	name = 'uptrackApi';

	displayName = 'Uptrack API';

	icon: Icon = {
		light: 'file:../nodes/Uptrack/uptrack.svg',
		dark: 'file:../nodes/Uptrack/uptrack.dark.svg',
	};

	documentationUrl = 'https://uptrack.app/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create an API key in the Uptrack dashboard under API keys',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.uptrack.app',
			description: 'Only change this if you were given a different Uptrack API address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/auth/me',
			method: 'GET',
		},
	};
}
