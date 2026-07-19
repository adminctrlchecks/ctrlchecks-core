import type { NodeDoc } from '../types';

export const webhookDoc: NodeDoc = {
  slug: 'webhook',
  displayName: 'Webhook Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/webhook.svg',
  description: 'Start a workflow the moment another app, website, or internal system sends data to a CtrlChecks webhook URL.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account connection is required for this trigger. CtrlChecks receives the incoming request for the workflow.',
    'Add Webhook Trigger as the first node, set the path, choose the HTTP method the sending app will use, then save the workflow.',
    'Open the workflow Webhook button, enable the webhook, and copy the generated URL into the sending app, website form, payment tool, or internal service.',
    'If signature verification is enabled, use the generated/shared webhook secret in the sending app and make sure it sends the X-Webhook-Signature header.',
    'Connect the output line from Webhook Trigger to the service node that should act on the request. That next service node may need its own account connection.',
    'Test with a sample request before sharing the URL with a production system. Secrets are stored as protected connection/config values, not as ordinary customer data fields.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Incoming Request',
      description: 'Receive an HTTP request from another system and pass its body, headers, method, and query values to the next workflow step.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Starts the workflow when a request reaches the generated webhook URL. Use this when a form builder, payment processor, internal app, website, or automation platform needs to tell CtrlChecks that something just happened.',
          fields: [
            {
              name: 'Path',
              internalKey: 'path',
              type: 'string',
              required: true,
              description: 'The readable ending of the webhook URL, used to identify what this trigger receives.',
              helpText: `What this field means: Path is the short address ending for this webhook, such as /new-order or /support-ticket.
Why it matters: A clear path helps teammates recognize which outside event starts this workflow when they copy or review webhook URLs.
When to fill it: Fill it before saving and enabling the workflow webhook.
What to enter: Type a short name that starts with / and uses lowercase words separated by hyphens.
Where the value comes from: You choose this value. It does not come from the sending app, although you will paste the full generated CtrlChecks URL into that app later.
How to use it later: The path itself is mainly setup information. The next node usually uses request values such as {{$json.body.email}}, {{$json.orderId}}, or {{$json.query.source}}.
Accepted format: Start with /, avoid spaces, and keep it stable after the sending app has been configured.
Real workplace example: Use /new-lead when a website demo form should create a CRM lead and send a Slack alert.
If it is empty or wrong: CtrlChecks cannot create a clear endpoint, or the sending app may keep calling an old address.
Common mistake: Renaming the path in CtrlChecks but forgetting to update the webhook URL saved in the outside app.`,
              placeholder: '/new-order',
              example: '/new-order',
              notes: 'After the workflow is saved, use the workflow Webhook button to copy the full URL. Do not share partial paths with the sending app.',
            },
            {
              name: 'HTTP Method',
              internalKey: 'httpMethod',
              type: 'select',
              required: false,
              description: 'The request type CtrlChecks should expect from the sending app. Options: GET, POST, PUT, PATCH, DELETE.',
              helpText: `What this field means: HTTP Method tells CtrlChecks which kind of request should start the workflow.
Why it matters: The sending app must use the same method you choose here, otherwise the webhook may not be treated as the expected event.
When to fill it: Set it while copying instructions from the sending app's webhook settings or API documentation.
What to enter: Choose POST for most events with a JSON body. Choose GET for a simple ping or link with query values. Choose PUT when the sender says it replaces a record. Choose PATCH when it sends a partial update. Choose DELETE when it sends removal events.
Where the value comes from: The sending app's webhook or API setup screen usually says which method it sends.
How to use it later: Downstream nodes can check {{$json.method}} or {{$json._method}} when one workflow receives multiple styles of requests.
Accepted format: One dropdown option: GET, POST, PUT, PATCH, or DELETE.
Real workplace example: Choose POST when Stripe, Typeform, or an internal lead form sends a full event payload to the workflow.
If it is empty or wrong: The request may arrive without the body you expect, or the sender may receive an error instead of starting the workflow.
Common mistake: Choosing GET because the webhook is a URL; most business webhooks that send data use POST.`,
              defaultValue: 'POST',
              options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              example: 'POST',
              notes: 'POST is the safest default for form submissions, payment events, support tickets, CRM updates, and most app webhooks.',
            },
            {
              name: 'Response Mode',
              internalKey: 'responseMode',
              type: 'select',
              required: false,
              description: 'Controls what the calling app receives after it sends the webhook. Options: responseNode, onReceived, lastNode.',
              helpText: `What this field means: Response Mode decides what reply CtrlChecks sends back to the app that called the webhook.
Why it matters: Some apps only need a quick success response, while others need a custom message, status code, or JSON result.
When to fill it: Choose this before testing the sending app so you know whether the response should come immediately or after the workflow runs.
What to enter: Choose responseNode when you will add a Respond to Webhook node and control the status, headers, and body yourself. Choose onReceived when the sender only needs a fast confirmation that the request was accepted. Choose lastNode when the sender should receive the final step's output.
Where the value comes from: Pick it based on what the sending app expects in its webhook documentation.
How to use it later: With responseNode, map fields such as {{$json.orderId}} into a Respond to Webhook node. With lastNode, design the final node output carefully because it becomes the reply.
Accepted format: One dropdown option: responseNode, onReceived, or lastNode.
Real workplace example: Choose responseNode when an internal form should receive a custom "Ticket created" JSON response with the helpdesk ticket ID.
If it is empty or wrong: The sending app may time out, receive a generic response, or miss the confirmation data it expected.
Common mistake: Choosing lastNode when the final node sends an email or Slack message instead of returning clean response data.`,
              defaultValue: 'responseNode',
              options: ['responseNode', 'onReceived', 'lastNode'],
              example: 'responseNode',
              notes: 'Use Respond to Webhook when the caller needs a dependable, intentional response contract.',
            },
            {
              name: 'Verify Signature',
              internalKey: 'verifySignature',
              type: 'boolean',
              required: false,
              description: 'Checks whether each incoming request was signed with the shared webhook secret.',
              helpText: `What this field means: Verify Signature is an on/off security check for incoming webhook requests.
Why it matters: A public webhook URL can be called by anyone who knows it. Signature verification helps CtrlChecks reject requests that were not sent by the trusted app or service.
When to fill it: Turn it on for payment events, customer data, production workflows, or any public webhook that should only accept trusted senders. Leave it off for a quick internal test or a sender that cannot sign requests.
What to enter: Turn true/on to require a matching signature. Turn false/off to accept requests without this check.
Where the value comes from: The sending app's webhook security settings tell you whether it supports request signatures.
How to use it later: When true, failed requests stop before downstream nodes can use fields like {{$json.body}} or {{$json.customerEmail}}.
Accepted format: true or false.
Real workplace example: Turn true for an order-payment webhook so only the payment provider can start invoice and fulfillment workflows.
If it is empty or wrong: Leaving it off can allow unwanted test traffic; turning it on without a matching sender signature causes valid requests to be rejected.
Common mistake: Turning this on but forgetting to set the same secret in the sending app or forgetting the required X-Webhook-Signature header.`,
              defaultValue: 'false',
              options: ['true', 'false'],
              example: 'true',
              notes: 'Signature verification protects the trigger URL; it is separate from account connections used by later action nodes.',
            },
            {
              name: 'Signature Secret',
              internalKey: 'secretToken',
              type: 'password',
              required: false,
              description: 'The shared secret used to verify signed webhook requests when signature verification is enabled.',
              helpText: `What this field means: Signature Secret is the shared value used to prove that the incoming request came from the app you trust.
Why it matters: CtrlChecks compares this secret with the request signature before starting the workflow.
When to fill it: Fill it only when Verify Signature is on and the sending app requires you to provide or reuse a specific secret. If CtrlChecks generates a webhook secret for the workflow, prefer that generated value.
What to enter: Enter the same webhook signing secret configured in the sending app. Do not enter an API key, login password, OAuth token, or customer data value.
Where the value comes from: It comes from the sending app's webhook security screen, or from the generated CtrlChecks webhook secret when the app lets you paste your own secret there.
How to use it later: You should not map this value into later nodes. Downstream nodes only need verified request data such as {{$json.body.orderId}} or {{$json.headers}}.
Accepted format: A secret text value supplied by the sender or generated for this workflow.
Real workplace example: Use a shared secret for an internal order system so fake requests cannot create warehouse tasks.
If it is empty or wrong: Signed requests fail with an invalid signature error, or unsigned requests are rejected when verification is required.
Common mistake: Treating this as normal workflow input. It is security setup, not data that later workflow steps should read.`,
              placeholder: 'Use the generated secret, or paste a shared secret',
              example: 'whsec_production_shared_value',
              notes: 'Keep this private. Rotate it if the URL or secret was pasted into chat, logs, screenshots, or public documentation.',
            },
          ],
          outputExample: {
            event: 'order.created',
            orderId: 'ORD-1048',
            customerEmail: 'alex@example.com',
            total: 249.5,
            headers: {
              'content-type': 'application/json',
              'x-webhook-signature': 'sha256=...',
            },
            query: {
              source: 'website',
            },
            method: 'POST',
            body: {
              event: 'order.created',
              orderId: 'ORD-1048',
              customerEmail: 'alex@example.com',
              total: 249.5,
            },
          },
          outputDescription: 'body: The parsed request body sent by the caller. event, orderId, customerEmail, and total: Common body fields that may also be available directly for easy mapping. headers: HTTP headers from the request, including signature headers when present. method: HTTP method used, usually POST for business webhooks. query: URL query parameters such as source or campaign. The next node can use output fields like {{$json.body.orderId}}, {{$json.customerEmail}}, {{$json.headers}}, {{$json.method}}, and {{$json.query.source}}.',
          usageExample: {
            scenario: 'When the website checkout system sends a paid order webhook, create a fulfillment task and notify the finance channel.',
            inputValues: {
              path: '/paid-order',
              httpMethod: 'POST',
              responseMode: 'responseNode',
              verifySignature: 'true',
              secretToken: 'shared with the checkout system',
            },
            expectedOutput: 'The workflow receives {{$json.body.orderId}}, {{$json.customerEmail}}, {{$json.total}}, {{$json.headers}}, {{$json.method}}, and {{$json.query.source}} so later nodes can create a task, send a message, and return a confirmation response.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Required path is missing or does not start with /',
      cause: 'The Path field is empty, has spaces, or was typed without the leading slash.',
      fix: 'Use a short path such as /new-lead or /paid-order, save the workflow, then copy the full generated URL again.',
    },
    {
      error: 'Sending app receives workflow not active',
      cause: 'The workflow was not saved, the workflow Webhook toggle is off, or the workflow is still in draft status.',
      fix: 'Save the workflow, open the workflow Webhook button, enable the webhook, and test the copied URL again.',
    },
    {
      error: 'HTTP method does not match expected event',
      cause: 'The sending app is using GET, POST, PUT, PATCH, or DELETE differently from the method selected in the node.',
      fix: 'Check the sending app webhook settings and choose the same HTTP Method in CtrlChecks. Use POST for most JSON event payloads.',
    },
    {
      error: 'Invalid signature or signature header missing',
      cause: 'Verify Signature is on, but the sending app is using a different secret or is not sending X-Webhook-Signature.',
      fix: 'Set the same signature secret in both systems, confirm the sender supports signatures, and retry with a fresh signed request.',
    },
    {
      error: 'Next node cannot find a value such as orderId or email',
      cause: 'The sending app nested the data inside body, used different field names, or sent a test payload with blank values.',
      fix: 'Open the latest execution output and map the exact field path, such as {{$json.body.orderId}} or {{$json.customerEmail}}.',
    },
    {
      error: 'Caller times out or receives the wrong response',
      cause: 'The selected Response Mode does not match what the sending app expects.',
      fix: 'Use responseNode with a Respond to Webhook node for custom responses, onReceived for fast acknowledgement, or lastNode only when the final output is the intended response.',
    },
    {
      error: 'Permission denied in a later service node',
      cause: 'Webhook Trigger itself does not need a third-party account, but the connected output node may need its own account connection.',
      fix: 'Open the connected service node, choose the right account connection, test it, and confirm it has permission to create, update, send, or read the target record.',
    },
  ],
  relatedNodes: ['respond_to_webhook', 'http_request', 'form', 'slack_message', 'database_write'],
};
