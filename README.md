# n8n-nodes-uptrack

An [n8n](https://n8n.io) community node for [Uptrack](https://uptrack.app), an uptime monitoring service. Use it to manage monitors and incidents from a workflow, and to start a workflow when a monitor goes down or recovers.

- [Installation](#installation)
- [Credentials](#credentials)
- [Uptrack node](#uptrack-node)
- [Uptrack Trigger node](#uptrack-trigger-node)
- [Limits](#limits)
- [Compatibility](#compatibility)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) and install the package `n8n-nodes-uptrack`.

## Credentials

### Uptrack API

1. In Uptrack, open **API keys** in the dashboard and create a key.
2. In n8n, create an **Uptrack API** credential and paste the key. Leave **Base URL** as `https://api.uptrack.app`.
3. Select **Test**. n8n calls `GET /api/auth/me`.

### Uptrack Webhook API (trigger only)

The **Uptrack Trigger** node checks the signature of each request. It needs the signing secret of the webhook alert channel (it starts with `whsec_`). Uptrack shows the secret once when you create the channel.

## Uptrack node

| Resource | Operations |
|---|---|
| Monitor | Get Many (search and category filters, Return All), Get, Create (HTTP or Heartbeat), Update, Pause, Resume, Delete |
| Incident | Get Many (only ongoing, or all), Get (with its updates), Acknowledge, Post Update (investigating, identified, monitoring, resolved) |

"Resolved" on Post Update also closes the incident, as in the Uptrack dashboard. Pause, Resume and Delete use Uptrack's bulk endpoint with one monitor.

## Uptrack Trigger node

Starts a workflow when Uptrack sends a **Monitor Down**, **Monitor Recovered**, or **Third-Party Status Unreadable** event.

Set up:

1. Add the **Uptrack Trigger** node to a workflow and copy its webhook URL (use the production URL for an active workflow).
2. In Uptrack, create an alert channel of type **Webhook**, paste the URL, and add the channel to the monitors you want. Copy the signing secret.
3. Create an **Uptrack Webhook API** credential in n8n with that secret and select it in the trigger.

The node refuses requests with a missing or wrong signature (HTTP 401) and requests older than five minutes. Events you did not select are answered with 200 and ignored. Payload format: [Uptrack webhook payloads](https://uptrack.app/guides/webhook-payloads).

## Limits

- Webhook alert channels need a paid Uptrack plan. The trigger does not work on the free plan. The Uptrack node works on every plan that has API access.
- This first version creates **HTTP** and **Heartbeat** monitors only. Other monitor types can be made in the Uptrack dashboard and are read and updated by this node like any other.
- The webhook is added by hand in Uptrack (steps above); the node does not register it for you.
- Your plan sets the shortest check interval and the number of monitors. Uptrack answers with an error when you go over; the node shows that message.

## Compatibility

Built with `n8n-node` 0.55 and `n8n-workflow`. Tested with a fake n8n runtime (22 tests) and n8n's community-node linter. It has not yet been run inside a live n8n instance.

## Resources

- [Uptrack API reference](https://api.uptrack.app/openapi.json)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](https://github.com/hoangbits/n8n-nodes-uptrack/blob/main/LICENSE.md)
