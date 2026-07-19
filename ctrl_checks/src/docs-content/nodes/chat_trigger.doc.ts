import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const chatTriggerDocs = 'https://docs.ctrlchecks.com';

const fields: FieldDoc[] = [
  {
    name: 'Message',
    internalKey: 'message',
    type: 'textarea',
    required: false,
    description: 'Incoming chat text supplied by the CtrlChecks chat interface or by an AI-generated workflow payload.',
    helpText: 'What this field means: Message is the text the chat visitor typed. The visual Chat Trigger panel does not expose this as a setup field; the chat page sends it when the workflow runs, and AI-generated workflows may also pass it as message, text, or input. Why it matters: Downstream AI Agent, HTTP Request, routing, and logging nodes usually read this as the user question or command. When to fill it: You normally do not fill it in the node panel. Provide it only in a test payload, API simulation, or generated workflow input. What to enter: Use the exact chat text, such as I want to track order ORD-1048. Where the value comes from: The CtrlChecks chat UI sends it from the visitor message box, or a manual/API test can provide it. How to use it later: Map {{$json.message}} into an AI Agent user input, ticket note, search request, or Chat Send reply. Accepted format: Plain text string after trimming; blank or whitespace-only HTTP messages are rejected as Invalid message. Real workplace example: A customer asks What is the status of order ORD-1048? and the next AI Agent uses {{$json.message}} to look up the order. If it is empty or wrong: The chat message endpoint returns Message is required and must be a non-empty string, or later nodes receive an empty message in manual tests. Common mistake: Treating this as a saved prompt. Put reusable assistant instructions in the AI Agent or model node, not in Chat Trigger.',
    placeholder: 'What is the status of order ORD-1048?',
    example: 'What is the status of order ORD-1048?',
    notes: 'The backend schema lists message as optional because it is runtime input, not saved node configuration. The HTTP chat endpoint requires a non-empty message body before starting an execution.',
  },
  {
    name: 'Channel',
    internalKey: 'channel',
    type: 'string',
    required: false,
    description: 'Optional chat context listed in the backend schema; the current visual panel does not expose or enforce channel filtering.',
    helpText: 'What this field means: Channel is optional context for where the chat came from, such as a support chat, embedded page, or session. The current visual panel does not show this field, and the active chat API does not use it to filter messages before starting the workflow. Why it matters: When present in a test or generated payload, the registry output can include it so later nodes know the chat context. In normal chat runs, the registry sets channel from sessionId first, then channel. When to fill it: Leave it alone in normal visual workflows. Use it only when simulating chat input or building an AI-generated workflow payload that already carries a channel value. What to enter: A short channel or context name such as support-chat, pricing-page, or {{$json.channel}}. Where the value comes from: It can come from an embedding page, upstream API request, workflow simulation, or generated workflow input. How to use it later: Map {{$json.channel}} in a Switch node to route support-chat differently from sales-chat, or log it with the user request. Accepted format: Plain text string. Real workplace example: A website sends channel support-chat so the workflow routes urgent support questions to the helpdesk queue. If it is empty or wrong: Empty is allowed; the workflow still starts, and downstream channel-based routing may not match. Common mistake: Expecting this field to limit who can start the chat in the current visual workflow. Use workflow branches or a future dedicated filter when sender/channel enforcement is required.',
    placeholder: 'support-chat',
    example: 'support-chat',
    notes: 'Runtime-supported/backend schema field. Not exposed as a Chat Trigger panel field today.',
  },
  {
    name: 'Allowed Senders',
    internalKey: 'allowedSenders',
    type: 'json',
    required: false,
    description: 'Optional sender allowlist listed in the backend schema; the current visual panel does not expose or enforce it.',
    helpText: 'What this field means: Allowed Senders is an optional list of sender names or IDs in the backend schema. The current CtrlChecks chat page does not pass a sender identity into this trigger and the visual panel does not enforce this allowlist. Why it matters: It documents a schema-supported intent for generated workflows and future filtered chat contexts, but it is not an active access-control setting in the current panel. When to fill it: Do not rely on it for normal visual workflows. Use it only in controlled tests or generated workflow payloads where sender IDs are already present and later nodes will check them. What to enter: A JSON list such as ["agent_17","manager@example.com"] or map {{$json.allowedSenders}} from a prior setup payload. Where the value comes from: A workplace directory, internal user list, chatbot embedding context, or upstream API that knows the sender identity. How to use it later: A later If/Else, Switch, or JavaScript node can compare {{$json.senderId}} or a mapped user field against this list if your workflow supplies sender data. Accepted format: JSON array of strings. Real workplace example: An internal assistant prototype passes ["ops-lead@example.com","finance-lead@example.com"] and a later branch checks whether the current sender is allowed to create a finance ticket. If it is empty or wrong: Empty is allowed and does not block chat messages; invalid JSON in generated config can fail validation or make custom sender checks unreliable. Common mistake: Assuming this protects a public chat link today. Use workflow activation, sharing controls, and downstream checks until the panel exposes a real sender filter.',
    placeholder: '["agent_17","manager@example.com"]',
    example: '["agent_17","manager@example.com"]',
    notes: 'Runtime-supported/backend schema field. It is not a credential or secret field, and it is not currently shown in the visual node settings.',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive chat message',
  value: 'default',
  description: 'Starts a workflow when someone sends a message through the CtrlChecks chat interface for an active workflow. The chat route validates that the workflow and Chat Trigger node exist, creates a running execution, uses a stable sessionId based on workflowId and nodeId, and passes the trimmed message plus chat metadata to the workflow.',
  fields,
  outputExample: {
    message: 'What is the status of order ORD-1048?',
    channel: 'workflow_123_chat-trigger-1',
    sessionId: 'workflow_123_chat-trigger-1',
    trigger: 'chat',
    node_id: 'chat-trigger-1',
    workflow_id: 'workflow_123',
    timestamp: '2026-07-19T09:15:00.000Z',
    _chat: true,
  },
  outputDescription: 'message: The trimmed chat text. channel: In the migrated registry path this is the sessionId when one exists, otherwise the supplied channel value. sessionId: Stable chat session ID in workflowId_nodeId format so Chat Send can reply to the same open chat. trigger: chat marker. node_id: Chat Trigger node ID. workflow_id: Workflow receiving the message. timestamp: Time the chat request was accepted, or the supplied timestamp in tests. _chat: true marker for chat-triggered executions. Legacy simple execution paths may return only the message string, so use the migrated structured fields when wiring new workflows.',
  usageExample: {
    scenario: 'Build a customer support chatbot that answers order status questions and replies in the same chat window',
    inputValues: {
      message: 'What is the status of order ORD-1048?',
      channel: 'support-chat',
      allowedSenders: '[]',
    },
    expectedOutput: 'The next node can use {{$json.message}} as the user question, {{$json.sessionId}} in Chat Send to reply to the same chat, and {{$json.workflow_id}} or {{$json.node_id}} for audit logs.',
  },
  externalDocsUrl: chatTriggerDocs,
};

export const chatTriggerDoc: NodeDoc = {
  slug: 'chat_trigger',
  displayName: 'Chat Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/chat_trigger.svg',
  description: 'Start a workflow from the CtrlChecks chat interface, usually as the first step in a chatbot, assistant, intake, support, or guided request workflow.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account is required. Chat Trigger uses the built-in CtrlChecks chat page and does not use credentials for the trigger itself.',
    'Add Chat Trigger as the first node, save the workflow, activate it, and open the generated chat URL for that workflow and node.',
    'A chat visitor sends a message through the CtrlChecks chat UI, or a system posts a non-empty message to /api/chat-trigger/:workflowId/:nodeId/message.',
    'CtrlChecks stores no external OAuth token for this trigger. The execution input contains chat text and session metadata, not account passwords, API keys, or provider tokens.',
    'Connect the trigger output to the next step with the outgoing line. Most chatbot flows connect to AI Agent, HTTP Request, Switch, or Chat Send.',
    'Each downstream service node still needs its own account connection. For example, Slack, Gmail, CRM, ticketing, or database nodes must be connected separately before they can send, read, write, or update records.',
    'Use Chat Send after an AI Agent or lookup node when the workflow should answer in the same chat session; it can read {{$json.sessionId}} from Chat Trigger when the nodes are connected.',
  ],
  credentialDocsUrl: chatTriggerDocs,
  resources: [
    {
      name: 'CtrlChecks chat',
      description: 'Receives messages from the built-in chat interface or compatible chat-message API calls and starts one workflow execution for each accepted message.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Invalid message',
      cause: 'The chat message endpoint received no message, a non-text value, or only spaces.',
      fix: 'Send a real text message. The body must include a non-empty message string, for example {"message":"Track order ORD-1048"}.',
    },
    {
      error: 'Workflow not found',
      cause: 'The workflow ID in the chat URL or API route does not exist, or the workflow is still in setup-pending state.',
      fix: 'Open the saved workflow, use the current generated chat URL, and make sure the workflow has finished setup before sharing the link.',
    },
    {
      error: 'Chat expired',
      cause: 'The chat configuration page was opened for a workflow that exists but is no longer active.',
      fix: 'Activate the workflow again, then refresh or reopen the chat link.',
    },
    {
      error: 'Workflow not active',
      cause: 'A message was posted to a workflow that is saved but inactive.',
      fix: 'Activate the workflow before testing or sharing the chat URL.',
    },
    {
      error: 'Chat trigger not found',
      cause: 'The workflow does not contain a Chat Trigger node matching the requested node ID, or the workflow was changed after the link was copied.',
      fix: 'Add or keep a Chat Trigger node in the workflow, save it, and copy the fresh chat URL for that node.',
    },
    {
      error: 'PUBLIC_BASE_URL environment variable is required in production.',
      cause: 'The worker accepted the chat message but cannot call the internal execute-workflow route because production has no public base URL configured.',
      fix: 'Set PUBLIC_BASE_URL to the externally reachable CtrlChecks app URL, then restart the worker and retry the chat message.',
    },
    {
      error: 'Failed to create workflow execution. Please try again.',
      cause: 'The database insert for the new chat-triggered execution failed.',
      fix: 'Retry after checking database availability, workflow ownership, and execution table errors in the worker logs.',
    },
    {
      error: 'Failed to process chat message. Please try again.',
      cause: 'The chat route hit an unexpected server error, or the WebSocket-to-HTTP fallback could not hand the message to the workflow executor.',
      fix: 'Refresh the chat page, send a new message, and check worker logs for the exact route failure.',
    },
    {
      error: 'Next node cannot find Chat Trigger fields',
      cause: 'A downstream node is mapped to a field that Chat Trigger does not emit, or it is running through an older simple execution path that returned only the message string.',
      fix: 'Use {{$json.message}} for the visitor text and {{$json.sessionId}} for chat replies. For new workflows, use the migrated structured output fields shown in this page.',
    },
    {
      error: 'Permission denied after Chat Trigger',
      cause: 'Chat Trigger itself has no external account connection, but the next service node is trying to read, send, write, or update data without its own credentials.',
      fix: 'Connect the service node account connection for the app that performs the action, then run the chat workflow again.',
    },
  ],
  relatedNodes: ['ai_agent', 'chat_send', 'http_request', 'switch'],
};
