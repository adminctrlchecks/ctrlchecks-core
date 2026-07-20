import type { NodeDoc } from '../types';

const errorMessageHelp = [
  'What this field is: The human-readable message that will be included in the thrown workflow error.',
  'Why it matters: This is the text someone sees in the run log when the workflow is intentionally stopped.',
  'When to fill it: Fill it whenever this branch should fail on purpose, such as after an If/Else validation branch detects missing or unsafe data.',
  'What to enter: Write a short business explanation, for example Customer email is missing. Cannot send confirmation.',
  'Where the value comes from: Type a fixed message, or map the reason from an earlier validation step.',
  'How to use it later: The workflow stops, so normal downstream nodes do not read this as {{$json.errorMessage}}; error-handling paths and run logs use the thrown error text.',
  'Accepted format: Plain text. Keep it specific enough for support or operations staff to fix the issue.',
  'Real workplace example: Order ORD-1042 is missing a billing email, so fulfillment was stopped before sending a receipt.',
  'If it is empty or wrong: The runtime falls back to Workflow stopped, or the logs show a vague message that is harder to investigate.',
  'Common mistake: Do not write only Failed. Include the field, record, or business rule that caused the stop.',
].join('\n');

const errorCodeHelp = [
  'What this field is: A short machine-friendly label placed before the message in the thrown error.',
  'Why it matters: It lets people and error workflows group intentional failures such as validation, permission, or approval problems.',
  'When to fill it: Fill it when different stop reasons need different reporting or error-trigger handling.',
  'What to enter: Use uppercase words separated by underscores, such as VALIDATION_FAILED, PAYMENT_BLOCKED, or PERMISSION_DENIED.',
  'Where the value comes from: Usually this is a fixed code chosen by the workflow builder; it can also come from an earlier rules step.',
  'How to use it later: The thrown error looks like {{$json.errorCode}}: message in logs, but normal next nodes do not run after this node.',
  'Accepted format: Plain text is accepted by runtime; uppercase letters, numbers, and underscores are easiest to scan.',
  'Real workplace example: VALIDATION_FAILED: Customer email is missing. Cannot send confirmation.',
  'If it is empty or wrong: The runtime falls back to STOPPED or logs a code that does not match your team reporting rules.',
  'Common mistake: Do not paste a stack trace or secret value here; use a stable category label only.',
].join('\n');

export const stopAndErrorDoc: NodeDoc = {
  slug: 'stop_and_error',
  displayName: 'Stop And Error',
  category: 'Logic',
  logoUrl: '/icons/nodes/stop_and_error.svg',
  description: 'Intentionally fail the current workflow run with a clear error code and message.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account is required. Stop And Error does not use credentials, API keys, tokens, or passwords.',
    'Use it after a condition, validation step, or business-rule branch where continuing would create bad work.',
    'The node throws an error in the format ERROR_CODE: message. It does not call an outside service.',
    'Connect an output or outgoing line only when the workflow editor requires wiring, but normal downstream nodes do not receive data after this node throws.',
    'Every downstream service node still needs its own account connection on branches where execution should continue.',
    'Do not put secrets in the message or code. These values can appear in execution logs and error notifications.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Intentional failure',
      description: 'Stop And Error has one runtime operation: throw an error and stop this workflow path.',
      operations: [
        {
          name: 'Stop Workflow',
          value: 'default',
          description: 'Use this operation when a workflow should fail intentionally instead of continuing with incomplete, unsafe, or invalid data. The runtime reads Error Message and Error Code, then throws a single error string in the format ERROR_CODE: message. It does not return a success object to ordinary downstream nodes.',
          fields: [
            {
              name: 'Error Message',
              internalKey: 'errorMessage',
              type: 'string',
              required: true,
              description: 'Message included in the intentional workflow error.',
              helpText: errorMessageHelp,
              placeholder: 'Workflow stopped',
              example: 'Customer email is missing. Cannot send confirmation.',
            },
            {
              name: 'Error Code',
              internalKey: 'errorCode',
              type: 'string',
              required: false,
              description: 'Short category code placed before the error message.',
              helpText: errorCodeHelp,
              placeholder: 'STOPPED',
              defaultValue: 'STOPPED',
              example: 'VALIDATION_FAILED',
            },
          ],
          outputExample: {
            error: 'VALIDATION_FAILED: Customer email is missing. Cannot send confirmation.',
          },
          outputDescription: 'This node throws an error and stops execution. The error text is ERROR_CODE: message, for example VALIDATION_FAILED: Customer email is missing. There is no structured success output, no stopped flag, and no {{$json.errorMessage}} for ordinary next nodes because the workflow path does not continue.',
          usageExample: {
            scenario: 'Stop an order workflow after a validation branch confirms the customer email is missing.',
            inputValues: {
              errorMessage: 'Customer email is missing. Cannot send confirmation.',
              errorCode: 'VALIDATION_FAILED',
            },
            expectedOutput: 'The workflow run fails intentionally, the run log shows VALIDATION_FAILED: Customer email is missing, and later normal nodes cannot read {{$json.errorMessage}} because they do not run.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Workflow stopped earlier than expected',
      cause: 'The branch leading into Stop And Error matched, so the node threw the configured error.',
      fix: 'Check the If/Else, Switch, or validation logic before this node and confirm only invalid records route here.',
    },
    {
      error: 'Message is too vague',
      cause: 'The Error Message does not say which record or business rule failed.',
      fix: 'Include a clear reason and useful mapped context such as the order ID, ticket ID, or customer email when safe.',
    },
    {
      error: 'Expected a structured output object',
      cause: 'Stop And Error throws an exception. It does not return stopped, stoppedAt, success, or data fields.',
      fix: 'Use Error Trigger or platform run logs for failure handling. Use a normal Set or Return node if the workflow should continue with a status object.',
    },
    {
      error: 'Sensitive data appears in logs',
      cause: 'A token, password, or private customer detail was placed in Error Message or Error Code.',
      fix: 'Remove secrets from both fields and store credentials only in Connections or the credential vault.',
    },
  ],
  relatedNodes: ['if_else', 'switch', 'error_handler', 'return'],
};
