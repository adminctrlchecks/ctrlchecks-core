import type { NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

export const errorHandlerDoc: NodeDoc = {
  slug: 'error_handler',
  displayName: 'Error Handler',
  category: 'Logic',
  logoUrl: '/icons/nodes/error_handler.svg',
  description: 'Inspect an incoming payload for _error, mark whether it was handled, and optionally emit a fallback value.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not use credentials or a saved third-party account connection.',
    'Connect the Error Handler node output to the next step with an outgoing line so handled and value can be used downstream.',
    'Downstream service node account connection setup is still required for service nodes that run after this Error Handler node.',
    'Retries and backoff are handled by the execution engine, not by credentials or fields on this node.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Fallback Handling',
      description: 'Adds handled metadata based on whether the incoming payload already contains _error.',
      operations: [
        {
          name: 'Handle Error Payload',
          value: 'default',
          description: 'Check the incoming payload for _error. When _error exists and Fallback Value is configured, the node passes through the input, sets handled to true, and places the fallback under value.',
          fields: [
            {
              name: 'Fallback Value',
              internalKey: 'fallbackValue',
              type: 'json',
              required: false,
              description: 'Optional JSON value returned as output.value when the incoming payload contains _error.',
              helpText: richFieldHelp({
                what: 'The fallback value to place in output.value when the previous node already produced _error.',
                why: 'It lets the workflow continue with a known substitute payload while preserving the original _error for auditing.',
                when: 'Fill it when downstream nodes need a stable value after a failed API call, parser, or custom code step.',
                enter: 'Enter JSON such as {"status":"unavailable","retryLater":true}, or leave it empty when you only need handled metadata.',
                source: 'Choose a fallback shape that later nodes already understand, or map a prepared object from {{$json.defaultResponse}}.',
                later: 'Downstream nodes can check {{$json.handled}}, read {{$json.value.status}}, and still inspect {{$json._error}}.',
                format: 'Any JSON value is accepted, but an object is easiest for later field mapping.',
                example: 'A support workflow returns {"status":"crm_unavailable"} when a CRM lookup failed but the ticket should still be created.',
                empty: 'If _error exists but fallbackValue is empty, runtime sets handled: false and does not add value.',
                mistake: 'Expecting this node to retry the failed step. Retry timing is handled elsewhere by the execution engine.',
              }),
              placeholder: '{"status":"unavailable"}',
              example: '{"status":"unavailable"}',
            },
          ],
          outputExample: {
            _error: 'Connection timeout',
            handled: true,
            value: { status: 'unavailable' },
          },
          outputDescription: [
            'handled: true only when the incoming payload contains _error and fallbackValue is configured.',
            'handled: false when there is no _error, or when _error exists but no fallbackValue is configured.',
            'value: The configured fallbackValue, added only when _error exists and fallbackValue is not undefined.',
            'input: Incoming fields, including _error, pass through unchanged.',
          ].join('\n'),
          usageExample: {
            scenario: 'Continue a customer-support workflow with a known fallback when an upstream CRM lookup returned _error.',
            inputValues: {
              fallbackValue: '{"status":"crm_unavailable","retryLater":true}',
            },
            expectedOutput: 'The next node can branch on {{$json.handled}} and read {{$json.value.status}} while keeping {{$json._error}} for logs.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Fallback does not run when there is no _error',
      cause: 'Runtime only uses fallbackValue when the incoming payload already has an _error field.',
      fix: 'Place Error Handler after a node that reports failures through _error, or branch before it when no error exists.',
    },
    {
      error: 'handled is false even though fallbackValue is set',
      cause: 'The upstream payload did not contain _error, so the node reports that nothing was handled.',
      fix: 'Check the previous node output and confirm the failure shape uses _error rather than error or status.',
    },
    {
      error: 'No retry attempts happen in Error Handler',
      cause: 'This node does not perform retries, delay, or backoff; the execution engine handles retry timing separately.',
      fix: 'Use runtime retry settings or a Retry node when the workflow needs another attempt before fallback handling.',
    },
    {
      error: 'Next node cannot find fallback fields',
      cause: 'The fallback is nested under value, not spread into the top-level payload.',
      fix: 'Map downstream fields from {{$json.value.fieldName}} or add a Set/Function step if top-level fields are required.',
    },
  ],
  relatedNodes: ['retry', 'try_catch', 'timeout', 'return'],
};
