import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * The signing secret of an Uptrack webhook alert channel. The trigger node uses it to check that
 * a request really comes from Uptrack. It is not used to call the Uptrack API.
 */
export class UptrackWebhookApi implements ICredentialType {
	name = 'uptrackWebhookApi';

	displayName = 'Uptrack Webhook API';

	icon: Icon = {
		light: 'file:../nodes/Uptrack/uptrack.svg',
		dark: 'file:../nodes/Uptrack/uptrack.dark.svg',
	};

	documentationUrl = 'https://uptrack.app/guides/webhook-payloads';

	properties: INodeProperties[] = [
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'whsec_...',
			description:
				'Shown once when you create the webhook alert channel in Uptrack. It starts with whsec_.',
		},
	];
}
