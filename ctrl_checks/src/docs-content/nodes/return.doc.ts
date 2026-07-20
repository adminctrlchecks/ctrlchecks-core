import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const noCredentialSteps = [
  'No third-party account is required; Return only reads its own value settings and incoming workflow data.',
  'Connect this node output to the next step or caller path with the outgoing line that should receive the returned payload.',
  'Any service node before or after this node still needs its own service node account connection.',
];

const valueField: FieldDoc = {
  name: 'Value',
  internalKey: 'value',
  type: 'json',
  required: false,
  description: 'Static JSON, text, or resolved expression to send back as returnedValue when Include Input is off.',
  helpText: richFieldHelp({
    what: 'Value is the payload the Return node sends back when Include Input is not enabled.',
    why: 'It lets a sub-workflow or early-exit path return one clear result to the caller instead of continuing through later steps.',
    when: 'Fill it when the caller needs a specific success object, error summary, ID, approval result, or mapped value from earlier data.',
    enter: 'Enter JSON such as {"success": true, "recordId": "{{$json.id}}"} or a resolved expression such as {{$json.approvalResult}}.',
    source: 'The value usually comes from earlier workflow output, such as a created ticket ID, payment status, or validation result.',
    later: 'The runtime emits the payload under {{$json.returnedValue}} together with {{$json.success}} and {{$json.__return}}.',
    format: 'JSON object, array, string, number, boolean, null, or an expression that resolves to one of those values.',
    example: 'A sub-workflow returns {"success": true, "ticketId": "SUP-1042"} after creating a support ticket.',
    empty: 'If Value is empty and Include Input is off, the runtime returns returnedValue: null.',
    mistake: 'Do not map {{$json.value}} after this node. The runtime output key is returnedValue because value is a config key that output cleaning strips.',
  }),
  placeholder: '{"success": true, "recordId": "{{$json.id}}"}',
  example: '{"success": true, "recordId": "{{$json.id}}"}',
};

const includeInputField: FieldDoc = {
  name: 'Include Input',
  internalKey: 'includeInput',
  type: 'boolean',
  required: false,
  description: 'When enabled, return the entire incoming input object instead of the Value field.',
  helpText: richFieldHelp({
    what: 'Include Input is a switch that makes returnedValue equal the full input object received by this node.',
    why: 'It is useful when the caller should receive everything gathered so far, not just one manually written Value.',
    when: 'Turn it on for sub-workflows that act as reusable processors and should return the complete current payload.',
    enter: 'Turn on the checkbox for full input passthrough. Leave it off when you want the Value field to define the response.',
    source: 'This is a workflow design choice. The actual returned data comes from the previous node output.',
    later: 'When enabled, downstream or caller logic reads the whole input object under {{$json.returnedValue}}.',
    format: 'Boolean checkbox true or false.',
    example: 'A reusable customer enrichment workflow turns Include Input on so the caller receives the original customer plus added enrichment fields.',
    empty: 'When off or blank, Return uses Value if it exists; otherwise returnedValue is null.',
    mistake: 'Do not fill Value and enable Include Input expecting both to be merged. Include Input takes precedence and ignores Value.',
  }),
  placeholder: 'false',
  example: 'false',
  defaultValue: 'false',
};

export const returnDoc: NodeDoc = {
  slug: 'return',
  displayName: 'Return',
  category: 'Flow',
  logoUrl: '/icons/nodes/return.svg',
  description: 'Stop the current workflow path and emit a returnedValue payload for a caller or downstream handler.',
  credentialType: 'None',
  credentialSetupSteps: noCredentialSteps,
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Return has one operation. It creates the special __return marker and places the selected response under returnedValue; it does not call an external service.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Return a specific value, the whole incoming input, or null to the caller. Use it at the end of a sub-workflow or on an early-exit branch when later workflow steps should not keep running after the result is known.',
          fields: [valueField, includeInputField],
          outputExample: {
            success: true,
            __return: true,
            returnedValue: {
              success: true,
              ticketId: 'SUP-1042',
            },
          },
          outputDescription: 'The runtime returns success true, __return true, and returnedValue. returnedValue is the configured Value, the entire input when includeInput is true, or null when neither is provided.',
          usageExample: {
            scenario: 'Return a compact result from a reusable support-ticket sub-workflow back to the workflow that called it.',
            inputValues: {
              value: '{"success": true, "ticketId": "{{$json.ticketId}}"}',
              includeInput: 'false',
            },
            expectedOutput: 'The caller can read {{$json.returnedValue.ticketId}}, {{$json.success}}, and {{$json.__return}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'returnedValue is the real output key',
      cause: 'Older docs and examples referred to value or returned. The runtime emits returnedValue and __return.',
      fix: 'Map {{$json.returnedValue}} in caller workflows and downstream steps.',
    },
    {
      error: 'value is stripped by config cleaning',
      cause: 'Output keys that shadow config keys can be removed by the executor, so the implementation intentionally uses returnedValue instead of value.',
      fix: 'Use returnedValue for all output mappings and reserve value for the input setting.',
    },
    {
      error: 'Include Input overrides Return Value',
      cause: 'When includeInput is true, the runtime returns the incoming input object and does not use the Value field.',
      fix: 'Turn Include Input off when you need the manually configured Value payload.',
    },
    {
      error: 'Return node failed',
      cause: 'An unexpected exception occurred while resolving or returning the configured payload.',
      fix: 'Check the Value expression, confirm referenced upstream fields exist, and rerun with a simple static JSON object to isolate the issue.',
    },
  ],
  relatedNodes: ['execute_workflow', 'if_else', 'stop_and_error'],
};
