import type { NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const outputDescription = [
  'statusCode: HTTP status code normalized by runtime from statusCode, responseCode, status, or default 200.',
  'headers: Response headers object returned by the node.',
  'body: Response payload chosen from body, responseBody, incoming body, or the full incoming input object.',
].join('\n');

export const webhookResponseDoc: NodeDoc = {
  slug: 'webhook_response',
  displayName: 'Webhook Response',
  category: 'HTTP & API',
  logoUrl: '/icons/nodes/webhook_response.svg',
  description: 'Return the status code, headers, and body intended for the caller of an incoming webhook request.',
  credentialType: 'None',
  credentialSetupSteps: [
    'Webhook Response does not use credentials or a third-party account; it shapes the HTTP response object for an incoming webhook workflow.',
    'Use it after the workflow has validated, stored, or processed the incoming webhook data.',
    'Connect this node output to the next node with an outgoing line only when later steps should inspect {{$json.statusCode}}, {{$json.headers}}, or {{$json.body}}; downstream service node account connection setup is still required for those later service nodes.',
    'Do not place API keys, tokens, or passwords in this node. It is response content only, not an outbound authenticated request.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Webhook Response',
      description: 'Normalizes the response object for a webhook caller.',
      operations: [
        {
          name: 'Return HTTP Response',
          value: 'default',
          description: 'Configure the response body, response headers, and status code a webhook caller should receive. The runtime returns the object shape statusCode, headers, and body; it does not return a sent flag or top-level responseCode.',
          fields: [
            {
              name: 'Status Code',
              internalKey: 'statusCode',
              type: 'number',
              required: true,
              description: 'HTTP status code to return.',
              helpText: richFieldHelp({
                what: 'The HTTP status number for the response.',
                why: 'The calling app uses it to decide whether the webhook request succeeded, failed validation, or should be retried.',
                when: 'Fill it for every response. The default is 200.',
                enter: 'Use 200 for success, 201 for created, 400 for bad request, 401 for unauthorized, 404 for missing data, or 500 for server error.',
                source: 'Choose the code from the caller contract or map a decision result such as {{$json.statusCode}} from earlier workflow logic.',
                later: 'Use {{$json.statusCode}} in any later branch or log step.',
                format: 'Number only, usually an HTTP code from 100 to 599.',
                example: 'A customer portal webhook returns 201 after a support ticket is created.',
                empty: 'Runtime converts the configured value to a number and falls back to 200 if conversion fails.',
                mistake: 'Looking for responseCode in the output; runtime returns statusCode.',
              }),
              placeholder: '200',
              example: '200',
              defaultValue: '200',
            },
            {
              name: 'Response Body',
              internalKey: 'body',
              type: 'textarea',
              required: false,
              description: 'Body returned to the webhook caller.',
              helpText: richFieldHelp({
                what: 'The response payload sent back to the calling app or service.',
                why: 'It tells the caller what happened, such as accepted, created, rejected, or which record ID was produced.',
                when: 'Fill it when the caller needs a JSON object, plain text, created ID, or validation message.',
                enter: 'Enter JSON or text such as {"ok":true,"ticketId":"{{$json.ticketId}}"} or map a full object from {{$json.response}}.',
                source: 'Use outputs from earlier workflow nodes, including database IDs, order numbers, validation results, or error text.',
                later: 'The normalized output is available as {{$json.body}}.',
                format: 'Textarea value containing JSON, plain text, or an expression. JSON is best for API callers.',
                example: 'A form handler returns {"ok":true,"caseId":"CASE-1042"} after saving a support request.',
                empty: 'Runtime falls back to incoming inputObj.body, then the full incoming input object.',
                mistake: 'Expecting the node to merge incoming fields into the response body automatically; set the exact body you want returned.',
              }),
              placeholder: '{"success":true}',
              example: '{"success":true,"ticketId":"CASE-1042"}',
            },
            {
              name: 'Custom Headers',
              internalKey: 'headers',
              type: 'json',
              required: false,
              description: 'Optional headers returned with the response.',
              helpText: richFieldHelp({
                what: 'HTTP response headers for the caller.',
                why: 'Headers tell clients how to parse, cache, or accept the response.',
                when: 'Fill it for Content-Type, CORS, cache-control, or custom response metadata required by the caller.',
                enter: 'Use a key/value object such as {"Content-Type":"application/json","Cache-Control":"no-store"}.',
                source: 'Use the caller API contract, frontend needs, or a previous node value such as {{$json.responseHeaders}}.',
                later: 'Runtime returns headers at {{$json.headers}} for logging or downstream inspection.',
                format: 'JSON object with header names and values.',
                example: 'A browser-facing webhook returns {"Content-Type":"application/json","Access-Control-Allow-Origin":"https://app.example.com"}.',
                empty: 'Runtime returns an empty headers object.',
                mistake: 'Putting request authentication headers here; this controls the response back to the caller.',
              }),
              placeholder: '{"Content-Type":"application/json"}',
              example: '{"Content-Type":"application/json"}',
            },
          ],
          outputExample: {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { ok: true, ticketId: 'CASE-1042' },
          },
          outputDescription,
          usageExample: {
            scenario: 'Return a success message to a checkout form after the workflow creates an order and stores the audit record.',
            inputValues: {
              statusCode: '200',
              body: '{"ok":true,"orderId":"{{$json.orderId}}"}',
              headers: '{"Content-Type":"application/json"}',
            },
            expectedOutput: 'Use {{$json.statusCode}} for response routing, {{$json.body.orderId}} for the confirmed order ID, and {{$json.headers}} for response metadata.',
          },
          externalDocsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'No sent flag is returned',
      cause: 'Runtime returns only statusCode, headers, and body. Older docs that showed sent: true did not match execution.',
      fix: 'Use {{$json.statusCode}} and {{$json.body}} for later workflow logic.',
    },
    {
      error: 'responseCode is only an alias',
      cause: 'The runtime accepts responseCode for compatibility, but the UI and normalized output use statusCode.',
      fix: 'Use statusCode in the visible node settings and in downstream expressions.',
    },
    {
      error: 'Body defaults to incoming input',
      cause: 'When body is empty, runtime falls back to inputObj.body and then the whole input object.',
      fix: 'Set body explicitly when the caller should receive a controlled response payload.',
    },
    {
      error: 'Use with a webhook response-mode workflow',
      cause: 'The node prepares the response object; the surrounding webhook/API layer is what actually sends it to the caller.',
      fix: 'Test the whole webhook flow from an external caller, not only the isolated node output.',
    },
  ],
  relatedNodes: ['webhook', 'respond_to_webhook', 'http_request'],
};
