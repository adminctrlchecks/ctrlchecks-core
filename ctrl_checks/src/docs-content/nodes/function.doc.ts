import type { NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

export const functionDoc: NodeDoc = {
  slug: 'function',
  displayName: 'Function',
  category: 'Logic',
  logoUrl: '/icons/nodes/function.svg',
  description: 'Run custom JavaScript once against the incoming object and return the value that the next node should receive.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node does not use credentials or a saved third-party account connection.',
    'Connect the Function node output to the next step with an outgoing line so the returned value is available downstream.',
    'Downstream service node account connection setup is still required for service nodes that run after this Function node.',
    'Do not paste API keys, tokens, or passwords into the code field; use connected service nodes or secure references for real integrations.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'JavaScript Function',
      description: 'Executes one JavaScript body in the sandbox with input, data, $json, and json bound to the incoming object.',
      operations: [
        {
          name: 'Run Function',
          value: 'default',
          description: 'Run custom JavaScript once for the current payload. Return a value directly, assign result, or leave both unset to pass the original input object through unchanged.',
          fields: [
            {
              name: 'Function Code',
              internalKey: 'code',
              type: 'textarea',
              required: true,
              description: 'JavaScript body executed once with input, data, $json, and json available.',
              helpText: richFieldHelp({
                what: 'The JavaScript body that runs once for the incoming workflow payload.',
                why: 'The runtime returns this code result directly, so this field controls the exact object, array, string, number, or boolean the next node receives.',
                when: 'Fill it when simple mapping fields cannot express the transformation, calculation, cleanup, or branching data shape you need.',
                enter: 'Write JavaScript that reads input, data, $json, or json. Use return for the final value, or assign result and let the wrapper return result.',
                source: 'Use fields from the previous node, such as $json.orderTotal or input.customer.email. Keep external secrets out of this field.',
                later: 'Downstream nodes read whatever you return as {{$json.fieldName}} when the return value is an object, or as the whole current value for arrays and primitives.',
                format: 'JavaScript body text. Example: const total = Number($json.orderTotal || 0); return { ...$json, highValue: total > 5000 };',
                example: 'A finance workflow adds a highValue flag before routing orders over 5000 to manual review.',
                empty: 'Runtime returns _error with "Function node: Code is required" and the incoming fields are preserved.',
                mistake: 'Expecting the node to wrap the result under output or data. It returns exactly the JavaScript return value.',
              }),
              placeholder: 'return { ...$json, processed: true };',
              example: 'return { ...$json, processed: true };',
            },
            {
              name: 'Timeout',
              internalKey: 'timeout',
              type: 'number',
              required: false,
              description: 'Maximum JavaScript execution time in milliseconds, capped at 30000.',
              helpText: richFieldHelp({
                what: 'The maximum time this Function code may run before the sandbox stops it.',
                why: 'It protects the workflow from long-running scripts while still allowing heavier transformations than the JavaScript data node default.',
                when: 'Leave the default for normal transformations, increase it for real data processing, and lower it when this step is inside a time-sensitive webhook path.',
                enter: 'Type milliseconds such as 10000. Runtime caps any larger value at 30000.',
                source: 'Choose the value from workflow latency needs, payload size, and expected script complexity. You can map it from {{$json.timeoutMs}} only when upstream data provides a trusted number.',
                later: 'Timeout failures return _error, so later error handling can branch on {{$json._error}}.',
                format: 'Positive number in milliseconds. The visible default is 10000 and the hard runtime maximum is 30000.',
                example: 'A data cleanup workflow uses 10000 for normal records and 30000 for a scheduled batch that enriches a large payload.',
                empty: 'Runtime uses the default 10000 milliseconds.',
                mistake: 'Typing 30 when you mean 30 seconds; enter 30000 for thirty seconds.',
              }),
              placeholder: '10000',
              example: '10000',
              defaultValue: '10000',
            },
          ],
          outputExample: {
            orderId: 'ord_1042',
            processed: true,
            highValue: true,
          },
          outputDescription: [
            'return value: The node returns exactly the value returned by the JavaScript body.',
            'result: If code assigns result and does not return first, result becomes the output.',
            'input: If neither return nor result is used, the original input object is returned.',
            '_error: Present on missing code, disabled JavaScript execution, timeout, or thrown script errors.',
          ].join('\n'),
          usageExample: {
            scenario: 'Add a high-value review flag to an order before sending the workflow to an approval branch.',
            inputValues: {
              code: 'const total = Number($json.orderTotal || 0); return { ...$json, highValue: total > 5000 };',
              timeout: '10000',
            },
            expectedOutput: 'The next node can branch on {{$json.highValue}} and still read {{$json.orderId}} from the returned object.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Function node: Code is required',
      cause: 'The Code field is blank or resolves to an empty string.',
      fix: 'Add a JavaScript body that returns the value the next node should receive.',
    },
    {
      error: 'Function node execution is disabled for security reasons',
      cause: 'The worker has DISABLE_JAVASCRIPT_NODE=true, so custom code nodes cannot run.',
      fix: 'Use non-code transformation nodes or ask an admin to enable JavaScript execution for trusted environments.',
    },
    {
      error: 'Execution timeout: Code exceeded <timeout>ms execution limit',
      cause: 'The script ran longer than the configured timeout or the 30000 ms hard cap.',
      fix: 'Simplify the code, reduce payload size, or raise Timeout up to 30000 when the longer runtime is expected.',
    },
    {
      error: 'Next node cannot find expected fields after Function',
      cause: 'Function returns exactly the script value, so returning a primitive or a partial object can remove fields later nodes expect.',
      fix: 'Return { ...$json, newField: value } when you want to preserve the incoming object and add fields.',
    },
  ],
  relatedNodes: ['javascript', 'function_item', 'set', 'if_else'],
};
