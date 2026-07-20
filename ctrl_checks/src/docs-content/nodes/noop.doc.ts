import type { NodeDoc } from '../types';

export const noopDoc: NodeDoc = {
  slug: 'noop',
  displayName: 'NoOp',
  category: 'Logic',
  logoUrl: '/icons/nodes/noop.svg',
  description: 'Pass the current workflow data through unchanged without calling a service or changing any field.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account is required. NoOp does not use credentials, API keys, tokens, or passwords.',
    'Add it when you need a placeholder step, a clean visual break in a branch, or a simple pass-through point while building a workflow.',
    'There are no settings to fill. The node returns exactly the object it received from the previous step.',
    'Connect the output or outgoing line to the next node that should receive the unchanged data.',
    'Every downstream service node still needs its own account connection. NoOp does not borrow, create, or test any credentials.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Pass-through',
      description: 'NoOp has no configurable fields and performs no operation beyond preserving the incoming object.',
      operations: [
        {
          name: 'Pass Through',
          value: 'passthrough',
          description: 'Use this operation when a workflow branch needs to continue without transforming data, calling an outside app, or adding runtime metadata. It is useful as a placeholder while designing a branch, as a visual marker between larger workflow sections, or as a harmless step for checking what data reaches a point in the workflow.',
          fields: [],
          outputExample: {
            orderId: 'ORD-1042',
            status: 'pending_review',
            customerEmail: 'buyer@example.com',
          },
          outputDescription: 'The same object is returned unchanged. There is no wrapper key, no success flag, and no extra metadata; downstream nodes keep reading the original fields such as {{$json.orderId}}, {{$json.status}}, and {{$json.customerEmail}}.',
          usageExample: {
            scenario: 'Keep a placeholder in a fulfillment branch while preserving order data for the next connected action.',
            inputValues: {},
            expectedOutput: 'Downstream nodes receive the same fields and can still use {{$json.orderId}}, {{$json.status}}, and {{$json.customerEmail}} exactly as they entered NoOp.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Expected a field to change',
      cause: 'NoOp intentionally does not add, remove, rename, or format any data.',
      fix: 'Use Set, Rename Keys, JavaScript, or another transformation node when the next step needs a changed field.',
    },
    {
      error: 'Downstream service still needs a connection',
      cause: 'NoOp has no credentials and cannot satisfy the account connection requirements of the next Microsoft, Google, Slack, or other service node.',
      fix: 'Open the downstream service node and select or create the required Connection there.',
    },
    {
      error: 'Next node cannot find expected data',
      cause: 'The missing field was not present before NoOp, because NoOp only passes through the incoming object unchanged.',
      fix: 'Check the output of the node before NoOp and map the exact existing field path, such as {{$json.orderId}}.',
    },
    {
      error: 'NoOp did not test the workflow',
      cause: 'NoOp only preserves data; it does not validate that later service calls, credentials, or mappings work.',
      fix: 'Run the connected downstream node or add a Log Output step when you need to inspect or verify real workflow behavior.',
    },
  ],
  relatedNodes: ['set', 'rename_keys', 'wait', 'log_output'],
};
