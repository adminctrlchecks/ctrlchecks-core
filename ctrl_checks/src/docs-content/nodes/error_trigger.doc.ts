import type { NodeDoc, OperationDoc } from '../types';

const errorTriggerDocs = 'https://docs.ctrlchecks.com';

const catchFailureOperation: OperationDoc = {
  name: 'Catch workflow error',
  value: 'default',
  description: 'Runs when another node in the same workflow fails during execution. Error Trigger is a sidecar trigger: the main execution order skips it during normal successful runs, and the failure handler invokes it out-of-band with the failed node name, error message, and error type.',
  fields: [],
  outputExample: {
    failed_node: 'HTTP Request',
    error_message: 'HTTP Request node: URL is required',
    error_type: 'Error',
    error_stack: 'Error: HTTP Request node: URL is required\n    at executeNode...',
    node_output: {
      _error: 'HTTP Request node: URL is required',
      _nodeType: 'http_request',
    },
  },
  outputDescription: 'failed_node: Label or ID of the node that failed. error_message: Plain text failure message to show in alerts, logs, tickets, or recovery notes. error_type: JavaScript error class name such as Error, TypeError, or unknown. error_stack: Optional stack trace when the error payload includes it. node_output: Optional failed-node output object when the runtime payload includes it. The normal workflow failure handler currently supplies failed_node, error_message, error_type, workflow_id, and execution_id as input, but the Error Trigger output keeps only failed_node, error_message, error_type, plus optional error_stack and node_output.',
  usageExample: {
    scenario: 'Log workflow failures and notify operations when a customer-facing automation breaks',
    inputValues: {},
    expectedOutput: 'Use {{$json.error_message}} in the alert body, {{$json.failed_node}} in the subject or log title, and {{$json.error_type}} for routing different kinds of failures.',
  },
  externalDocsUrl: errorTriggerDocs,
};

export const errorTriggerDoc: NodeDoc = {
  slug: 'error_trigger',
  displayName: 'Error Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/error_trigger.svg',
  description: 'Start an error-handling path when another node in the same workflow fails, so teams can log the failure, send an alert, or create a follow-up task.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account is required for Error Trigger itself. It listens to CtrlChecks workflow execution failures and does not use credentials.',
    'Add Error Trigger to the same workflow that needs failure handling. The runtime skips it during successful runs and invokes it only when another node throws or returns an execution failure that stops the run.',
    'Connect the trigger output to the next error-handling step with the outgoing line, such as Log Output, Slack Message, Email, HTTP Request, or a ticketing node.',
    'Map error fields from the trigger output: use {{$json.error_message}} for the failure text, {{$json.failed_node}} for the failing step, and {{$json.error_type}} for the error class.',
    'Error Trigger stores no external token, password, or API key. The payload contains workflow error details only.',
    'Each downstream service node still needs its own account connection. For example, Slack alerts need a Slack connection, Gmail/Email replies need mail credentials, and ticketing nodes need their own app connection.',
  ],
  credentialDocsUrl: errorTriggerDocs,
  resources: [
    {
      name: 'Workflow failure',
      description: 'Receives an internal failure payload from the workflow executor when a node fails.',
      operations: [catchFailureOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Error Trigger does not fire during a successful run',
      cause: 'No node failed. Error Trigger is intentionally skipped in the main execution order and only runs from the failure handler.',
      fix: 'Test it with a controlled failing node, such as an HTTP Request with a missing URL, then check the execution log for the error-handler output.',
    },
    {
      error: 'Next node cannot find Error Trigger fields',
      cause: 'The next step is mapped to old or fabricated fields such as {{$json.error.message}}, {{$json.failedWorkflowId}}, or {{$json.failedNodeId}} instead of the current runtime keys.',
      fix: 'Use {{$json.error_message}}, {{$json.failed_node}}, and {{$json.error_type}}. Only use {{$json.error_stack}} or {{$json.node_output}} when your error payload includes those optional fields.',
    },
    {
      error: 'Error message is blank',
      cause: 'A manual test or generated payload used error, message, code, or nodeId fields, but the executor reads error_message, failed_node, and error_type.',
      fix: 'For simulations, send {"failed_node":"HTTP Request","error_message":"URL is required","error_type":"Error"}.',
    },
    {
      error: 'Expected stack trace or failed-node output is missing',
      cause: 'The normal workflow failure handler does not always pass error_stack or node_output into Error Trigger.',
      fix: 'Build alerts around the stable fields failed_node, error_message, and error_type. Treat error_stack and node_output as optional diagnostic extras.',
    },
    {
      error: 'Permission denied after Error Trigger',
      cause: 'Error Trigger itself needs no credentials, but the alert, ticket, email, database, or webhook node connected after it does need its own service connection and permission.',
      fix: 'Connect the downstream service node account connection and test that node separately before relying on the error workflow.',
    },
  ],
  relatedNodes: ['log_output', 'slack_message', 'email', 'http_request'],
};
