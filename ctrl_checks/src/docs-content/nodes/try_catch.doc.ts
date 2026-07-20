import type { NodeDoc } from '../types';

const noCredentialSteps = [
  'No third-party account is required; Try/Catch only marks workflow routing and preserves incoming workflow data.',
  'Connect this node output to the try and catch outgoing lines so the workflow engine has explicit paths to follow.',
  'Any service node inside the try or catch path still needs its own service node account connection.',
];

export const tryCatchDoc: NodeDoc = {
  slug: 'try_catch',
  displayName: 'Try/Catch',
  category: 'Flow',
  logoUrl: '/icons/nodes/try_catch.svg',
  description: 'Mark try/catch routing, preserve input data, and provide error context when the engine routes a failure.',
  credentialType: 'None',
  credentialSetupSteps: noCredentialSteps,
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Try/Catch has no user-entered fields. It starts the try path, preserves object-shaped input, and gives the workflow engine metadata for catch routing when downstream execution fails.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Place this node before work that should have a fallback path. The node itself does not call the protected API or database; connected try-branch service nodes do that work, and the engine uses the Try/Catch metadata to route errors to the catch branch.',
          fields: [],
          outputExample: {
            ticketId: 'SUP-3001',
            customerEmail: 'buyer@example.com',
            __routing: {
              branch: 'try',
            },
          },
          outputDescription: 'On normal execution, object input fields are preserved and __routing.branch is try. Metadata includes branch try, tryCatchNodeId, and errorHandling true. If the Try/Catch node itself throws, the catch path can receive error, errorType, TRY_CATCH_ERROR details, and metadata branch catch.',
          usageExample: {
            scenario: 'Try to create a CRM ticket, then send a fallback Slack alert from the catch path if the CRM step fails.',
            inputValues: {},
            expectedOutput: 'The try branch can read {{$json.ticketId}}, {{$json.customerEmail}}, and {{$json.__routing.branch}}; a catch branch can use {{$json.error}} when the engine routes an error.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Try/Catch node itself does not run the protected service call',
      cause: 'The node marks routing and preserves data. The connected try branch service node performs the actual API, database, or message operation.',
      fix: 'Wire the try outgoing line to the service node that may fail, then wire the catch outgoing line to fallback handling.',
    },
    {
      error: 'Catch branch only receives error context when the engine routes an error',
      cause: 'A normal Try/Catch execution starts on the try branch and does not invent an error object.',
      fix: 'Test with a real failing downstream node or intentional error path to confirm catch routing.',
    },
    {
      error: 'input fields are preserved',
      cause: 'The override merges object input and upstream output for the try path, so existing fields remain available unless another downstream node changes them.',
      fix: 'Map the original field names such as {{$json.ticketId}} in try-branch nodes instead of expecting a nested output wrapper.',
    },
    {
      error: 'TRY_CATCH_ERROR',
      cause: 'The Try/Catch node implementation itself threw an exception before normal try routing completed.',
      fix: 'Review the error message and details, then simplify upstream input or inspect the registry override if the error repeats.',
    },
  ],
  relatedNodes: ['retry', 'timeout', 'error_handler'],
};
