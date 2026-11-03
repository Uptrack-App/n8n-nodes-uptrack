import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { verifyUptrackSignature } from './signature';

// Programmatic on purpose: a trigger needs a webhook handler, which a declarative node cannot express.
export class UptrackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Uptrack Trigger',
		name: 'uptrackTrigger',
		icon: { light: 'file:uptrack.svg', dark: 'file:uptrack.dark.svg' },
		group: ['trigger'],
		version: [1],
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when Uptrack reports that a monitor went down or recovered',
		defaults: {
			name: 'Uptrack Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'uptrackWebhookApi',
				required: true,
				testedBy: 'uptrackWebhookApiTest',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'In Uptrack, add an alert channel of type Webhook and paste this node\'s webhook URL into it. Webhook alert channels need a paid Uptrack plan. Copy the signing secret that Uptrack shows once into the credential of this node.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['monitor.down', 'monitor.up'],
				options: [
					{
						name: 'Monitor Down',
						value: 'monitor.down',
						description: 'A monitor fails its check and an incident is created',
					},
					{
						name: 'Monitor Recovered',
						value: 'monitor.up',
						description: 'A monitor recovers and its incident is resolved',
					},
					{
						name: 'Third-Party Status Unreadable',
						value: 'monitor.third_party_unreadable',
						description: 'Uptrack could not read the status page of a watched third-party service',
					},
				],
				description: 'Which events start the workflow. Other events are ignored.',
			},
		],
	};

	methods = {
		credentialTest: {
			// The secret cannot be tested against Uptrack, so this checks its shape.
			async uptrackWebhookApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const secret = String((credential.data as IDataObject | undefined)?.signingSecret ?? '');
				if (secret.startsWith('whsec_') && secret.length > 10) {
					return { status: 'OK', message: 'The signing secret looks right' };
				}
				return { status: 'Error', message: 'A signing secret starts with whsec_' };
			},
		},
	};

	// Uptrack has no API that registers a webhook for one monitor, so the user adds the webhook
	// alert channel in Uptrack by hand (see the notice above). These methods only say so to n8n.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const response = this.getResponseObject();
		const credentials = await this.getCredentials('uptrackWebhookApi');

		// n8n keeps the exact bytes of the body; the signature covers those bytes.
		const rawBody =
			(request as unknown as { rawBody?: Buffer }).rawBody ?? JSON.stringify(this.getBodyData());
		const header = this.getHeaderData()['x-uptrack-signature'] as string | undefined;

		if (!verifyUptrackSignature(rawBody, header, credentials.signingSecret as string)) {
			response.status(401).send('Invalid signature');
			return { noWebhookResponse: true };
		}

		const body = this.getBodyData() as IDataObject;
		const selected = this.getNodeParameter('events', []) as string[];
		const event = (body.event as string | undefined) ?? '';

		// Answer 200 for events the user did not pick, so Uptrack does not retry them.
		if (selected.length > 0 && !selected.includes(event)) {
			return { webhookResponse: { ignored: true } };
		}

		return { workflowData: [this.helpers.returnJsonArray(body)] };
	}
}
