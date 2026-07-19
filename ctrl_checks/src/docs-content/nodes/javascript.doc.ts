import type { NodeDoc } from '../types';

const codeHelpText = `What this field means: JavaScript Code is the script this node runs against the current workflow data.

Why it matters: Use it when Set, Edit Fields, Math, Filter, or other built-in nodes cannot express the business rule you need, such as scoring a lead, reshaping a nested API response, or calculating several related values.

When to fill it: Fill it every time you use the JavaScript node. The backend requires code, and the node returns an _error when this field is blank.

What to enter: Enter JavaScript that returns the final value downstream nodes should receive. You can read the incoming item as input, $json, or json. Return an object when later nodes need named fields, or return an array when later nodes should receive a list.

Where the value comes from: Run the previous node and inspect its output. Copy exact field paths from that output, such as $json.customer.email, $json.orders, or $json.invoice.total.

How to use it later: Whatever your code returns becomes the next node's {{$json}} value. If you return { "customerEmail": "...", "riskScore": 82 }, a downstream Email, Slack, CRM, or If/Else node can use {{$json.customerEmail}} and {{$json.riskScore}}.

Accepted format: JavaScript statements inside the function body. Use return to send a value, or assign result and let the runtime return result. Avoid browser-only APIs and long-running loops. Template expressions such as {{$json.email}} are resolved before execution when present.

Real workplace example: After a checkout webhook, calculate whether an order needs finance review: const total = Number($json.orderTotal || 0); return { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000 };

If it is empty or wrong: Blank code returns _error: "JavaScript node: Code is required". Syntax errors, missing fields, thrown errors, disabled execution, or timeout problems also return _error with the incoming data where possible.

Common mistake: Do not paste API keys, passwords, or private tokens into the code. JavaScript does not create account connections; downstream service nodes still need their own saved connections. Also avoid returning nothing, because the runtime falls back to the original input when result is not set.`;

const timeoutHelpText = `What this field means: Timeout is the maximum time this node may spend running the JavaScript code before runtime stops it.

Why it matters: It protects the workflow from accidental long loops, slow calculations, or code that never finishes, so later nodes are not held open forever.

When to fill it: Fill it when your code does more than a quick field reshape, such as calculating totals across a large list, validating many records, or preparing a complex report object. Leave the default for simple transformations.

What to enter: Enter the number of milliseconds to allow. 5000 means five seconds, 10000 means ten seconds, and 30000 means thirty seconds.

Where the value comes from: Choose it from the size of the incoming data and the work the code performs. Test with real sample data from the previous node, then raise the value only if the script needs more time.

How to use it later: Timeout does not create an output field. It changes whether the node finishes normally or returns an _error that a later error-handling, logging, Slack, or email step can inspect as {{$json._error}}.

Accepted format: Positive whole number in milliseconds. The runtime defaults to 5000 when the value is blank or invalid and caps every value at 30000.

Real workplace example: A daily sales summary loops through 2,000 order records to calculate region totals. Set Timeout to 10000 so the summary has time to complete while still stopping accidental infinite loops.

If it is empty or wrong: Blank or invalid values use 5000. Values above 30000 are reduced to 30000. If the code exceeds the allowed time, the node returns _error: "Execution timeout".

Common mistake: Raising Timeout to hide inefficient code. First confirm the previous node sent the expected list and that the script is not looping forever or reading a missing field.`;

const outputSchemaHelpText = `What this field means: Output Schema is an optional JSON text hint that tells runtime what top-level type you expect the script to return.

Why it matters: JavaScript can return almost anything. A schema hint helps catch mistakes where the code returns an array when the next node expects an object, or returns text when a downstream step expects named fields.

When to fill it: Fill it when the next workflow step depends on a specific output shape, especially before service nodes, reports, database writes, or conditional routing. Leave it empty for quick experiments or when the output can vary safely.

What to enter: Enter a small JSON schema object with a top-level type, such as {"type":"object"} or {"type":"array"}. The current runtime checks the top-level type and logs a warning when it does not match.

Where the value comes from: Decide it from the code's return statement and from what the next node needs. If your code returns { customerEmail, riskScore }, use object. If it returns contacts.map(...), use array.

How to use it later: Output Schema itself is not passed to the next node. The returned script value is still the downstream {{$json}} data. Use the schema to keep the return shape predictable for fields like {{$json.customerEmail}} or {{$json.items}}.

Accepted format: Valid JSON string, not JavaScript. Use double quotes around keys and values, for example {"type":"object"}. Supported top-level examples are object, array, string, number, and boolean.

Real workplace example: Before creating CRM records, set Output Schema to {"type":"object"} when your code should return { "customerEmail": "...", "lifecycleStage": "new_lead" } for the CRM mapping.

If it is empty or wrong: Empty skips the shape check. Invalid JSON is ignored by runtime. A mismatched type does not stop the node today; it logs a warning, so still test downstream fields after changing code.

Common mistake: Treating Output Schema as a way to transform data. It only describes the expected return shape. The JavaScript Code field must still return the actual object, array, text, number, or boolean.`;

export const javascriptDoc: NodeDoc = {
  slug: 'javascript',
  displayName: 'JavaScript',
  category: 'Data',
  logoUrl: '/icons/nodes/javascript.svg',
  description: 'Run sandboxed JavaScript against the incoming workflow data and return the transformed value for downstream steps.',
  credentialType: 'None - JavaScript does not use credentials or connect to a third-party account.',
  credentialSetupSteps: [
    'No third-party account is required because JavaScript only works with data already inside the workflow.',
    'Connect the incoming output from a trigger, webhook, form, lookup, API, sheet, or CRM node into JavaScript so the script has real data to read.',
    'Connect the JavaScript output to the next node that should use the returned object, array, text, number, boolean, or _error value.',
    'Downstream service node account connection setup is still required for Gmail, Slack, CRM, database, storage, API, and messaging nodes; JavaScript does not replace those credentials.',
    'Do not paste API keys, passwords, bearer tokens, or private credentials into JavaScript Code. Store service access through Connections or credential settings instead.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Use this resource to write the code, choose the execution timeout, and optionally describe the expected top-level return type.',
      operations: [
        {
          name: 'Execute',
          value: 'default',
          description: 'Runs the configured JavaScript once for the current workflow item and returns the script result directly. Choose this operation when a workplace rule needs custom calculations, nested field cleanup, advanced validation, or response shaping that the simpler transformation nodes cannot handle.',
          fields: [
            {
              name: 'JavaScript Code',
              internalKey: 'code',
              type: 'textarea',
              required: true,
              description: 'Script body to run against the incoming data. Use input, $json, or json for the current item and return the value that downstream nodes should receive.',
              helpText: codeHelpText,
              placeholder: 'return { ...$json, processed: true };',
              example: 'const total = Number($json.orderTotal || 0); return { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000 };',
              notes: 'Runtime wraps the code in a function, provides input, $json, and json, and returns result when it is assigned. If neither return nor result is used, the original input is returned.',
            },
            {
              name: 'Timeout (ms)',
              internalKey: 'timeout',
              type: 'number',
              required: false,
              description: 'Maximum execution time in milliseconds. Runtime defaults to 5000 and caps the value at 30000.',
              helpText: timeoutHelpText,
              placeholder: '5000',
              defaultValue: '5000',
              example: '10000',
              notes: 'Timeout controls only the JavaScript execution window. It does not change downstream service rate limits or account permissions.',
            },
            {
              name: 'Output Schema',
              internalKey: 'outputSchema',
              type: 'textarea',
              required: false,
              description: 'Optional JSON schema string used as a top-level type hint for the returned value.',
              helpText: outputSchemaHelpText,
              placeholder: '{"type":"object"}',
              example: '{"type":"object"}',
              notes: 'The current runtime checks the top-level type only and logs a warning on mismatch; it does not block execution.',
            },
          ],
          outputExample: {
            orderId: 'ord_1042',
            customerEmail: 'asha.rao@example.com',
            orderTotal: 6400,
            riskScore: 90,
            eligibleForReview: true,
            processedAt: '2026-07-18T09:30:00.000Z',
          },
          outputDescription: 'The output, data, and result are the value returned by the script. If the script returns an object, fields such as orderId, customerEmail, orderTotal, riskScore, eligibleForReview, and processedAt become available to the next node as {{$json.orderId}}, {{$json.customerEmail}}, {{$json.riskScore}}, and {{$json.eligibleForReview}}. Runtime errors, disabled JavaScript, missing code, and timeouts return _error where possible.',
          usageExample: {
            scenario: 'Score large checkout orders before routing them to finance review or normal fulfillment',
            inputValues: {
              code: 'const total = Number($json.orderTotal || 0);\nreturn { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000, processedAt: "2026-07-18T09:30:00.000Z" };',
              timeout: '10000',
              outputSchema: '{"type":"object"}',
            },
            expectedOutput: 'The next If/Else, Slack, Email, or CRM node can use {{$json.customerEmail}}, {{$json.riskScore}}, {{$json.eligibleForReview}}, and {{$json.processedAt}} from the returned object.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'JavaScript node: Code is required',
      cause: 'The Code field was left blank, or an AI-generated workflow did not provide a script body.',
      fix: 'Add JavaScript that returns a value, such as return { ...$json, processed: true }; then run the previous step once to confirm source fields exist.',
    },
    {
      error: 'JavaScript node execution is disabled for security reasons',
      cause: 'The worker has DISABLE_JAVASCRIPT_NODE set to true, so custom JavaScript is intentionally blocked in this environment.',
      fix: 'Use built-in transformation nodes such as Set, Edit Fields, Math, Filter, or Merge, or ask an administrator whether JavaScript execution is allowed for this deployment.',
    },
    {
      error: 'Execution timeout',
      cause: 'The code exceeded the configured timeout after runtime applied the 30000 ms maximum cap.',
      fix: 'Check for endless loops, reduce the amount of data processed, test with a smaller sample, or raise Timeout only up to the 30000 ms cap.',
    },
    {
      error: 'Script returned unexpected shape',
      cause: 'The script returned a different top-level type than the optional Output Schema hint or than the next node expects.',
      fix: 'Make the return statement match the next node mapping. Return an object for named fields like customerEmail and riskScore, or an array only when the next node expects a list.',
    },
    {
      error: 'Next node cannot find returned field',
      cause: 'The script returned a primitive value, an array, or an object with different field names than the downstream node is mapping.',
      fix: 'Return an object with stable keys and update downstream references to the exact names, such as {{$json.customerEmail}} or {{$json.eligibleForReview}}.',
    },
    {
      error: 'Permission denied after JavaScript',
      cause: 'JavaScript has no credentials, but a downstream service node may still be missing its own connected account or permission to send, create, update, upload, or write data.',
      fix: 'Connect the required account on the downstream service node and confirm that service permission separately from the JavaScript configuration.',
    },
  ],
  relatedNodes: ['set', 'edit_fields', 'math', 'filter', 'function', 'function_item'],
};
