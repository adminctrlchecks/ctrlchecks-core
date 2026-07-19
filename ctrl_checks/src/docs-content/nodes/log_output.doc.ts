import type { NodeDoc } from '../types';

const levelHelpText = `What this field means: Level is a label that marks how important this log entry is, and which console method CtrlChecks uses internally to write it (info, warn, error, or debug).

Why it matters: Level only affects how the entry looks and can be filtered in the execution log — it does not change whether the workflow continues, and it does not affect Message in any way.

When to fill it: Optional. It always has a value (defaults to Info) even if you never touch it.

What to enter: Choose the option that matches how you want this checkpoint to read later when scanning execution history.
- Info: a normal checkpoint with no special urgency — the default choice for routine progress notes such as "reached step 3" or "processed batch of 50 rows."
- Warning: something worth a second look but not serious enough to need immediate action — for example, a fallback value was used, or an optional field was missing.
- Error: a problem worth flagging clearly in the log — but choosing Error here does NOT stop, fail, or halt the workflow. It is only a visual label; use the Stop and Error node instead if you actually need the workflow to fail.
- Debug: detailed technical detail useful mainly while actively building and testing a workflow, that you would normally turn off or ignore once the workflow is finished and running in production.

Where the value comes from: This is a manual choice based on how you want the entry to read, not something normally mapped from upstream data.

How to use it later: Level is not part of this node's own output (see Message below) — it only changes the console method and the "[LOG LEVEL]" prefix shown in the execution log.

Accepted format: One of the four dropdown values: info, warn, error, debug.

Real workplace example: Use Warning when an order is missing an optional discount code so it still gets logged for review, and use Info for the standard "order processed" checkpoint on every run.

If it is empty or wrong: An empty or unset value falls back to Info automatically — there is no error either way.

Common mistake: Choosing Error expecting it to stop the workflow like the Stop and Error node does. Log Output never fails or halts a run regardless of Level — it only ever writes a log line.`;

const messageHelpText = `What this field means: Message is the actual text CtrlChecks writes to the execution log — and, since Log Output has no other output fields, this resolved text also becomes the entire output value of this node.

Why it matters: This is the one field that actually determines what shows up in the execution log. Everything else about this node (Level, terminal-only behavior) just affects how or whether Message gets recorded.

When to fill it: Optional, but leaving it empty produces a blank, uninformative log line with nothing after the "[LOG INFO]"-style prefix — always fill it in practice.

What to enter: A short description of the checkpoint, combined with any workflow values you want captured at this exact point in the run.

Where the value comes from: Reference data from the node connected directly into this one, such as an order record, a loop item, or an error object from a previous step.

How to use it later: Map upstream values with expressions such as {{$json.orderId}} or {{$json.rowCount}}. If Message resolves to an object or array (for example {{$json}} with no field path), it is automatically pretty-printed as indented JSON before being logged — you do not need to JSON.stringify it yourself.

Accepted format: Plain text, optionally containing one or more {{$json.field}} expressions. The resolved text becomes this node's entire output — there are no separate message/level output fields to read afterward.

Real workplace example: "Processed {{$json.rowCount}} rows from {{$json.tableName}} in {{$json.durationMs}}ms" as a checkpoint in a long-running data import.

If it is empty or wrong: An empty Message logs an empty string with no error — the run continues normally either way. There is no "Message is required" failure for this node, unlike most action nodes.

Common mistake: Adding a node after Log Output expecting it to receive the original upstream data. Log Output is always a terminal node (the workflow builder does not allow it to have an outgoing connection), and even if it somehow did, its output is only the resolved Message text — none of the original {{$json}} fields survive past it.`;

export const logOutputDoc: NodeDoc = {
  slug: 'log_output',
  displayName: 'Log Output',
  category: 'Utility',
  logoUrl: '/icons/nodes/log_output.svg',
  description: 'Write a labeled checkpoint message to the workflow execution log for debugging, monitoring, and audit trails. This is always a terminal node — it cannot have an outgoing connection to any other node.',
  credentialType: 'None - Log Output does not use credentials or a third-party account.',
  credentialSetupSteps: [
    'No third-party account is needed for the Log Output node itself. It only writes to CtrlChecks\'s own execution log using data that already arrived from an earlier workflow step.',
    'There is nothing to connect or authorize before using Log Output; open the node, fill Message (and optionally Level), and it is ready to run.',
    'Because Log Output is always terminal — the workflow builder does not allow it to connect an outgoing line to any other node — and accepts only a single incoming connection, add one Log Output node per branch that needs its own checkpoint rather than trying to route several branches into one shared Log Output node.',
    'Log Output itself does not use credentials, but any earlier service node in the same branch (Gmail, Slack, a database, etc.) still needs its own separate account connection — Log Output has no downstream service node to worry about, since it can never have one.',
    'Test it: run the workflow and open the execution history/console for this run — the resolved Message text appears there under the chosen Level, confirming the node worked correctly.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Log Output has a single write operation, configured directly with input fields — there is no separate resource/operation dropdown.',
      operations: [
        {
          name: 'Write Log Entry',
          value: 'default',
          description: 'Resolves Message against the data from the connected upstream node, writes it to the CtrlChecks execution log under the chosen Level, and returns that resolved text as this node\'s own output.',
          fields: [
            {
              name: 'Level',
              internalKey: 'level',
              type: 'select',
              required: false,
              description: 'Log severity label used only for filtering and display in the execution log',
              helpText: levelHelpText,
              placeholder: 'info',
              example: 'info',
              defaultValue: 'info',
              options: ['info', 'warn', 'error', 'debug'],
            },
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: false,
              description: 'The text written to the execution log, and this node\'s entire output value',
              helpText: messageHelpText,
              placeholder: 'Debug: {{$json.orderId}}',
              example: 'Processing user: {{$json.userId}}',
            },
          ],
          outputExample: { '(entire output)': 'Processed 42 rows from orders_table' },
          outputDescription: 'This node has no structured output object — its entire output value is the resolved Message text itself (a plain string), with every {{$json.field}} expression already substituted. The "(entire output)" key shown here is only a documentation label; at runtime there is no wrapper object or key name at all, just the bare string. There are no separate message, level, or success fields to read afterward, and no _error field on failure, because there is nothing in this node that can fail validation (both Level and Message are optional). Because Log Output is always a terminal node with zero outgoing connections, this output value is never actually consumed by another node — it exists only in the execution history for people reviewing the run.',
          usageExample: {
            scenario: 'Log a progress checkpoint after each batch in a long-running data import pipeline',
            inputValues: {
              message: 'Processed {{$json.rowCount}} rows from {{$json.tableName}}',
              level: 'info',
            },
            expectedOutput: 'The resolved text "Processed 42 rows from orders_table" appears in the workflow execution log under Info. It also becomes this node\'s own output — but since Log Output is terminal, no next node can ever map {{$json.field}} from it.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Nothing appears in the execution log',
      cause: 'Message was left empty, so the node logged a blank line with no visible text after the "[LOG INFO]"-style prefix.',
      fix: 'Open the node and fill Message with a description and any {{$json.field}} values you want recorded.',
    },
    {
      error: 'Expected value shows as {{$json.field}} literally instead of the real data',
      cause: 'The field name in the expression does not exist on the output of the node connected directly into this Log Output node.',
      fix: 'Check the actual field names in the upstream node\'s output (for example in the execution console) and correct the expression to match exactly.',
    },
    {
      error: 'Chose Level: Error but the workflow kept running past a real failure',
      cause: 'Level only changes the log line\'s label and console method — it never stops, fails, or halts the workflow, even at Error.',
      fix: 'Use the Stop and Error node (or an If/Else check that routes to one) when the workflow itself needs to fail on a condition; use Log Output only for passive recording.',
    },
    {
      error: 'Cannot connect an outgoing line from Log Output',
      cause: 'Log Output is always a terminal node by design — the workflow builder enforces zero outgoing connections, so nothing can be chained after it.',
      fix: 'Add the next step earlier in the branch, before Log Output, or duplicate the branch so the follow-up action happens in parallel rather than after this node.',
    },
    {
      error: 'One shared Log Output node is not receiving all the messages from several branches',
      cause: 'Log Output only accepts a single incoming connection — routing multiple branches into one shared Log Output node is not supported.',
      fix: 'Add a separate Log Output node at the end of each branch that needs its own checkpoint.',
    },
  ],
  relatedNodes: ['http_request', 'javascript', 'stop_and_error', 'error_handler'],
};
