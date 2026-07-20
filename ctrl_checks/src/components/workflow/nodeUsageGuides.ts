import { NodeUsageGuide } from './nodeTypes';

export const NODE_USAGE_GUIDES: Record<string, NodeUsageGuide> = {
  // Trigger Nodes
  manual_trigger: {
    overview: 'Starts your workflow when you click the "Run" button. Perfect for testing or on-demand tasks. No input required - fires once per manual execution.',
    inputs: ['None - This is a start node'],
    outputs: ['trigger', 'workflow_id', 'executed_at'],
    example: `Connect â†’ OpenAI GPT â†’ Slack Message

When you click Run, the workflow executes.
Output: { 
  trigger: "manual",
  workflow_id: "uuid",
  executed_at: "2024-01-15T10:30:00Z"
}`,
    tips: ['Use for testing before adding automated triggers', 'Can pass custom input data when running', 'workflow_id is auto-generated', 'executed_at is ISO-8601 timestamp'],
  },

  schedule: {
    overview: 'Runs your workflow automatically on a schedule using a simple time picker. Select your time (HH:MM format) and timezone, and the workflow will execute daily at that time. Great for daily reports, periodic checks, or recurring tasks.',
    inputs: ['None - Triggered by schedule'],
    outputs: ['trigger', 'time', 'cron', 'timezone', 'executed_at'],
    example: `Time: "09:00"
Timezone: "Asia/Kolkata" (IST)
Meaning: Daily at 9:00 AM Indian Standard Time

Time: "14:30"
Timezone: "America/New_York"
Meaning: Daily at 2:30 PM Eastern Time

Output: {
  trigger: "schedule",
  time: "09:00",
  cron: "0 9 * * *",
  timezone: "Asia/Kolkata",
  executed_at: "2024-01-15T03:30:00Z"
}`,
    tips: ['Use 24-hour format (e.g., 09:00 for 9 AM, 14:30 for 2:30 PM)', 'Select your timezone from the dropdown (IST, UTC, etc.)', 'Workflow runs daily at the specified time', 'Test with manual trigger first', 'Timezone conversion is handled automatically'],
  },

  webhook: {
    overview: 'Starts a workflow when an external app, website form, payment system, or internal service sends data to the generated CtrlChecks webhook URL. Captures the request body, headers, query values, and method for the next node.',
    inputs: ['path: readable URL ending such as /paid-order', 'httpMethod: GET, POST, PUT, PATCH, or DELETE', 'responseMode: responseNode, onReceived, or lastNode', 'verifySignature and secretToken for signed production requests'],
    outputs: ['body', 'method', 'headers', 'query', 'event-specific fields such as orderId or customerEmail'],
    example: `Path: /paid-order
HTTP Method: POST
Response Mode: responseNode

Checkout system sends:
{
  "event": "order_created",
  "orderId": "ORD-1048",
  "customerEmail": "alex@example.com",
  "total": 249.50
}

Output: {
  event: "order_created",
  orderId: "ORD-1048",
  customerEmail: "alex@example.com",
  total: 249.50,
  method: "POST",
  headers: {"content-type": "application/json"},
  query: {"source": "website"},
  body: {"event": "order_created", "orderId": "ORD-1048"}
}`,
    tips: [
      'Enable the workflow Webhook button after saving, then paste the generated URL into the sending app.',
      'Use POST for most workplace events that include JSON data.',
      'Use responseNode with a Respond to Webhook node when the caller needs a custom status or JSON reply.',
      'Turn on signature verification for production or public URLs when the sender supports signed requests.',
      'Map request data from the execution output, usually {{$json.body.email}}, {{$json.orderId}}, {{$json.headers}}, or {{$json.query.source}}.',
    ],
  },

  chat_trigger: {
    overview: 'Starting node that runs when someone sends a message through the CtrlChecks chat interface for an active workflow. The node panel has no setup fields today; the chat page supplies the message and session details at runtime.',
    inputs: [
      'No visible setup fields in the node panel',
      'message comes from the chat box or a compatible /message API call',
      'sessionId is generated as workflowId_nodeId so replies go back to the same chat',
      'channel and allowedSenders are backend schema fields for generated/test payloads, not enforced visual filters',
    ],
    outputs: ['message', 'channel', 'sessionId', 'trigger', 'node_id', 'workflow_id', 'timestamp', '_chat'],
    example: `Chat message request:
{
  "message": "I want to track order ORD-1048",
  "sessionId": "workflow_123_chat-trigger-1"
}

Output: {
  trigger: "chat",
  message: "I want to track order ORD-1048",
  sessionId: "workflow_123_chat-trigger-1",
  channel: "workflow_123_chat-trigger-1",
  workflow_id: "workflow_123",
  node_id: "chat-trigger-1",
  timestamp: "2026-07-19T09:15:00.000Z",
  _chat: true
}`,
    tips: [
      'Use as the first node in chatbot, assistant, support intake, or guided request workflows',
      'Map {{$json.message}} into AI Agent or HTTP Request when the next step needs the visitor question',
      'Use Chat Send after the answer is prepared; it can read {{$json.sessionId}} from the connected Chat Trigger output',
      'The workflow must be active before the public chat URL accepts messages',
      'Downstream app nodes such as Slack, Gmail, CRM, or database actions still need their own account connection',
    ],
  },

  error_trigger: {
    overview: 'Runs when another node in the same workflow fails. Error Trigger is skipped during normal successful execution and is invoked by the failure handler with the failed node name, error message, and error type.',
    inputs: ['No visible setup fields', 'Internal failure payload from the workflow executor', 'Simulation payloads should use failed_node, error_message, and error_type'],
    outputs: ['failed_node', 'error_message', 'error_type', 'error_stack (optional)', 'node_output (optional)'],
    example: `When a node fails:

Output: {
  failed_node: "HTTP Request",
  error_message: "HTTP Request node: URL is required",
  error_type: "Error",
  error_stack: "Error: HTTP Request node: URL is required\\n    at executeNode...",
  node_output: {"_error": "HTTP Request node: URL is required"}
}`,
    tips: [
      'Use {{$json.error_message}} for Slack, email, ticket, or log text.',
      'Use {{$json.failed_node}} to name the failing step in the alert.',
      'Do not map old fields like {{$json.error.message}}, {{$json.failedWorkflowId}}, or {{$json.failedNodeId}}.',
      'Downstream alert or ticket nodes still need their own service account connection.',
      'Test with a controlled failure before relying on the error path in production.',
    ],
  },

  interval: {
    overview: 'Starts the workflow automatically on a repeating timer, such as every 5 minutes or every 6 hours. No account connection needed. Recurring runs are driven by a scheduler running in an open CtrlChecks browser tab, not a separate always-on server job.',
    inputs: ['interval', 'unit'],
    outputs: ['executed_at', '_scheduled', '_trigger'],
    example: `Interval = 5, Unit = Minutes (runs every 5 minutes)
Interval = 6, Unit = Hours (runs every 6 hours)

Output: {
  executed_at: "2026-07-19T10:05:00.000Z",
  _scheduled: "true",
  _trigger: "schedule"
}`,
    tips: [
      'Only Minutes (1-59) and Hours (1-23) are supported â€” there is no seconds unit',
      'Save the workflow first; the interval activates automatically right after saving',
      'Keep a CtrlChecks browser tab open so the recurring scheduler keeps firing the workflow',
      'Map only {{$json.executed_at}} from this trigger; any other data must come from a node placed after it',
      'Use the Schedule Trigger node instead when you need an exact daily time or weekly/monthly pattern',
    ],
  },

  workflow_trigger: {
    overview: 'Starts this workflow when an allowed parent workflow calls it with Execute Workflow. Use it to make reusable child workflows for notifications, enrichment, approvals, or shared cleanup steps.',
    inputs: ['source_workflow_id: the parent workflow allowed to call this child workflow', 'payload passed by the parent Execute Workflow node'],
    outputs: ['payload fields sent by the parent, such as customerEmail, ticketId, or priority', 'inputData object when the parent wraps the payload', 'workflowId and timestamp when provided for logging'],
    example: `Parent workflow: Support Intake
Child workflow: Send Escalation Alert

Parent Execute Workflow sends:
{
  "customerEmail": "maya@acme.com",
  "ticketId": "SUP-1042",
  "priority": "high"
}

Child workflow receives:
{
  customerEmail: "maya@acme.com",
  ticketId: "SUP-1042",
  priority: "high"
}

Use in child nodes:
customerEmail = {{$json.customerEmail}}
ticketId = {{$json.ticketId}}`,
    tips: [
      'Source Workflow ID should be the parent workflow ID, not this child workflow ID.',
      'The parent still needs an Execute Workflow node that selects this child workflow.',
      'Run the parent once and inspect the child execution before mapping fields.',
      'Use {{$json.customerEmail}} for top-level payload fields or {{$json.inputData.customerEmail}} when the parent wraps input under inputData.',
      'Avoid circular calls where a child workflow eventually calls the parent again.',
    ],
  },
  // AI Processing
  openai_gpt: {
    overview: 'Calls OpenAI through the legacy LLM adapter. Prompt is the main input; Messages is only a fallback when Prompt is blank. Temperature and Memory are visible legacy fields ignored by the current executor.',
    inputs: ['apiKey', 'accessToken', 'token', 'model', 'prompt', 'messages', 'temperature (ignored)', 'memory (ignored)'],
    outputs: ['response', 'model', 'usage', 'finishReason', 'success false with error on OpenAI credential failure'],
    example: `Prompt: "Summarize {{$json.text}} in three bullets."
Model: gpt-4o

Output: {
  response: "Meeting scheduled for tomorrow afternoon.",
  model: "gpt-4o",
  usage: { prompt_tokens: 38, completion_tokens: 8 },
  finishReason: "stop"
}

Connect: Webhook -> OpenAI GPT -> Slack`,
    tips: [
      'Prefer a saved OpenAI connection or credential vault value; apiKey/accessToken/token are direct fallbacks.',
      'Successful output does not preserve incoming fields, so keep needed IDs before this node.',
      'Use {{$json.response}} downstream; there is no content output key.',
      'Temperature and Memory currently have no runtime effect.',
    ],
  },

  anthropic_claude: {
    overview: 'Calls Anthropic Claude through the legacy LLM adapter. Use Prompt for normal UI workflows; Messages is only a fallback when Prompt is blank. Temperature and Memory are visible but ignored by the current executor.',
    inputs: ['apiKey', 'model', 'prompt', 'messages', 'temperature', 'memory'],
    outputs: ['response', 'model', 'usage', 'finishReason', 'error'],
    example: `Model: claude-3-5-sonnet
Prompt: "Summarize {{$json.contractText}} and list the top risks."

Output: { 
  response: "The main risk is the 30-day termination clause.",
  model: "claude-3-5-sonnet",
  usage: { inputTokens: 920, outputTokens: 64 },
  finishReason: "end_turn"
}`,
    tips: [
      'Prefer a saved Anthropic connection or vault credential; direct apiKey is only a legacy fallback.',
      'Prompt wins over Messages. Messages are joined only when Prompt is blank.',
      'Successful output does not spread incoming fields, so preserve needed IDs before this node.',
      'Temperature and Memory currently have no runtime effect.',
    ],
  },

  google_gemini: {
    overview: 'Calls Google Gemini through the LLM adapter and returns response, model, usage, and finishReason. The current executor resolves Gemini credentials from connection/wallet/key-pool/direct config, and it does not preserve incoming fields on success.',
    inputs: ['apiKey', 'model', 'prompt', 'temperature', 'memory'],
    outputs: ['response', 'model', 'usage', 'finishReason', 'error on credential failure'],
    example: `Prompt: "Extract key dates and action items from {{$json.text}}."
Model: gemini-3.5-flash

Input: { text: "Call John on Friday about Q2 review" }
Output: { 
  response: "Date: Friday\nAction: Call John\nTopic: Q2 review",
  model: "gemini-3.5-flash",
  usage: { inputTokens: 42, outputTokens: 14 },
  finishReason: "STOP"
}`,
    tips: [
      'Prefer a saved Gemini connection, wallet, key pool, or credential vault mapping; direct apiKey is only a fallback.',
      'Temperature and Memory are visible legacy fields ignored by the current google_gemini executor.',
      'If Prompt is static and upstream text exists, runtime can use Prompt as context and upstream text as the user message.',
      'Successful output does not spread incoming fields, so preserve needed IDs before this node.',
    ],
  },

  text_summarizer: {
    overview: 'Builds a summarization prompt from Text and optional Max Length, then delegates to Gemini through AI Chat Model.',
    inputs: ['text', 'maxLength', 'apiKey', 'temperature'],
    outputs: ['response', 'model', '_error', 'preserved incoming fields'],
    example: `Text: {{$json.articleText}}
Max Length: 100

Output: {
  response: "AI adoption is growing, teams are focusing on automation, and privacy concerns are increasing.",
  model: "gemini-3.5-flash"
}`,
    tips: [
      'The summary is in {{$json.response}}, not {{$json.summary}}.',
      'Max Length only changes the generated prompt; it is not a hard truncation.',
      'Blank Text is not locally rejected, so validate upstream content if empty text should stop the workflow.',
      'Credential failures from the delegated Gemini call appear in _error.',
    ],
  },

  sentiment_analyzer: {
    overview: 'Builds a Gemini prompt that asks for JSON sentiment data, then delegates to AI Chat Model.',
    inputs: ['text', 'apiKey', 'temperature'],
    outputs: ['response.sentiment', 'response.score', 'response.summary', 'model', '_error', 'preserved incoming fields'],
    example: `Input: { text: "I love this product!" }
Output: {
  response: {
    sentiment: "positive",
    score: 0.95,
    summary: "Customer expresses strong satisfaction."
  },
  model: "gemini-3.5-flash"
}

Connect: Webhook -> Sentiment -> If/Else (route by response.sentiment)`,
    tips: [
      'Use {{$json.response.sentiment}}, not {{$json.sentiment}}.',
      'If Gemini returns invalid JSON, response falls back to raw text.',
      'Blank Text is not locally rejected, so validate upstream content when needed.',
      'Credential failures from the delegated Gemini call appear in _error.',
    ],
  },

  // Logic & Control
  if_else: {
    overview: 'Makes a yes/no decision from previous-step data and routes matching work through TRUE and non-matching work through FALSE.',
    inputs: ['conditions', 'condition field', 'condition operator', 'condition value', 'combineOperation'],
    outputs: ['TRUE branch', 'FALSE branch', 'conditionResult', 'original input data'],
    example: `Conditions:
1. Field: $json.orderTotal
   Operator: Greater than or equal
   Value: 500
2. Field: $json.status
   Operator: Equals
   Value: paid

Combine Operation: AND

If orderTotal is 725 and status is paid, the run leaves through TRUE.
If orderTotal is 120 or status is unpaid, the run leaves through FALSE.

Connect TRUE to Finance Review.
Connect FALSE to Standard Fulfillment.

Both branches can still use {{$json.customerEmail}}, {{$json.orderTotal}}, and other incoming fields.`,
    tips: [
      'Use the builder for normal setup; use JSON mode only when pasting prepared condition objects.',
      'Choose AND when every row must match; choose OR when any row can match.',
      'Use equals for statuses and categories, greater-than operators for numeric thresholds, and contains for text or lists.',
      'Connect both TRUE and FALSE outputs so no business case silently disappears.',
    ],
  },

  switch: {
    overview: 'Routes a run into one of several named branches by matching one incoming value against configured case values.',
    inputs: ['expression', 'cases', 'routingType (legacy optional)', 'rules (legacy alias)'],
    outputs: ['case outputs named by cases[].value', '__routing.matchedCase', 'original input data'],
    example: `Expression: {{$json.category}}
Cases: [
  {"value": "billing", "label": "Billing"},
  {"value": "technical", "label": "Technical"},
  {"value": "general", "label": "General"}
]

If category is billing, the billing branch runs.
If category is technical, the technical branch runs.
If category is general, the general branch runs.

Connect billing to Finance Queue.
Connect technical to Engineering Support.
Connect general to Customer Care.

Each branch can still use {{$json.customerEmail}} and {{$json.ticketId}}.`,
    tips: [
      'Use Switch for three or more outcomes; use If/Else for a yes/no decision.',
      'The case value is the real branch handle, so keep values unique and stable.',
      'Make case values exactly match the expression result, including spelling.',
      'Add a fallback or review path for unexpected values when the business process needs one.',
    ],
  },

  loop: {
    overview: 'Exposes an upstream array as {{$json.items}}, caps it with Max Iterations, and adds loop metadata. The current DAG runtime does not run the next branch once per item.',
    inputs: ['array expression (optional)', 'maxIterations limit'],
    outputs: ['items', 'loop.maxIterations', 'loop.iterations', 'loop.truncated', '_warning'],
    example: `Input: { reportDate: "2026-07-18", overdueTickets: [{ticketId: "SUP-1001"}, {ticketId: "SUP-1002"}] }
Array Expression: {{$json.overdueTickets}}
Max Iterations: 25

Output metadata:
{
  reportDate: "2026-07-18",
  items: [{ticketId: "SUP-1001"}, {ticketId: "SUP-1002"}],
  loop: {maxIterations: 25, iterations: 2, truncated: false},
  _warning: "Loop exposes items and metadata; DAG runtime does not run the next branch once per item."
}`,
    tips: ['Leave Array Expression empty only when input.items already contains the list', 'Use Max Iterations to cap large lists before rate-limited services', 'Use Function Item or a supported batch path when each item needs its own action', 'Loop has no credentials; downstream service nodes still need connected accounts'],
  },

  wait: {
    overview: 'Pauses workflow execution for a fixed duration, then passes the same input object forward unchanged. Use for short rate-limit gaps or ordering delays, not for condition polling.',
    inputs: ['duration in milliseconds', 'optional backend unit for imported configs'],
    outputs: ['input object unchanged'],
    example: `Duration: 5000 (5 seconds)

API Call -> Wait (5s) -> API Call
Prevents hitting rate limits.

Common durations:
1000ms = 1 second
60000ms = 1 minute
300000ms = 5 minute runtime cap`,
    tips: ['Use between API calls to avoid rate limits', 'Data passes through unchanged', 'Duration is in milliseconds in the visible UI', 'The Wait node does not return waitedMs, resumed, or reason fields'],
  },

  error_handler: {
    overview: 'Inspect an incoming payload for _error, mark whether it was handled, and optionally put a configured fallback under value. Retry and backoff are handled by the execution engine, not this node.',
    inputs: ['fallbackValue (optional)', 'incoming payload with or without _error'],
    outputs: ['incoming fields preserved', 'handled', 'value only when _error exists and fallbackValue is configured'],
    example: `Input: {_error: "Connection timeout", ticketId: "SUP-1042"}
Fallback Value: {"status": "crm_unavailable"}

Output:
{
  _error: "Connection timeout",
  ticketId: "SUP-1042",
  handled: true,
  value: {status: "crm_unavailable"}
}`,
    tips: ['Use after nodes that report failures through _error', 'Map fallback fields from {{$json.value.fieldName}}', 'Do not expect retry attempts from this node', 'If there is no _error, output has handled: false'],
  },

  filter: {
    overview: 'Keeps only the records in a list that match a rule, then passes the smaller list to the next node.',
    inputs: ['array expression (optional)', 'condition'],
    outputs: ['items replaced with filtered list', 'other incoming fields preserved', '_error when filtering cannot run'],
    example: `Array: {{$json.contacts}}
Condition: item.status === "active" && item.email && !item.email.includes("test")

Input contacts:
[
  {name: "Asha", status: "active", email: "asha@example.com"},
  {name: "Ben", status: "inactive", email: "ben@example.com"},
  {name: "Test", status: "active", email: "test@example.com"}
]

Output {{$json.items}}:
[
  {name: "Asha", status: "active", email: "asha@example.com"}
]

Other incoming fields, such as {{$json.batchId}}, stay available.`,
    tips: [
      'Leave Array empty when the previous node already outputs items.',
      'Use item.fieldName inside the condition because the rule runs once per array item.',
      'Use source-node filters when possible for very large lists.',
      'Some secured deployments disable JavaScript-style filtering; in that case the output includes _error.',
    ],
  },

  merge: {
    overview: 'Rejoins multiple workflow branches and combines their data into one payload for the next step.',
    inputs: ['mode', 'multiple data inputs from different branches'],
    outputs: ['combined payload (overwrite/deep_merge)', 'items array only, in append mode'],
    example: `Mode: overwrite
Input 1: {ticketId: "TCK-2048", status: "approved"}
Input 2: {assignee: "finance@example.com", status: "reviewed"}

Output: {ticketId: "TCK-2048", status: "reviewed", assignee: "finance@example.com"}

Mode: append
Input 1: {ticketId: "TCK-2048", branch: "billing"}
Input 2: {ticketId: "TCK-2048", branch: "technical"}
Output: {items: [{ticketId: "TCK-2048", branch: "billing"}, {ticketId: "TCK-2048", branch: "technical"}]}

Mode: deep_merge
Input 1: {customer: {email: "customer@example.com"}}
Input 2: {approval: {status: "approved"}}
Output: {customer: {email: "customer@example.com"}, approval: {status: "approved"}}`,
    tips: [
      'Use overwrite for simple flat objects when duplicate keys can be replaced.',
      'Use append when the next node should receive a list at {{$json.items}}.',
      'Use deep_merge when branches add different nested details that should survive together.',
      'Connect every branch that should rejoin into Merge, then connect Merge output to the final action.',
    ],
  },

  parallel: {
    overview: 'Marks a point where the surrounding workflow should treat connected paths as parallel. The node passes object input forward, adds mode, and returns results as an empty placeholder; real branch wiring and later merging are handled by the workflow canvas and Merge nodes.',
    inputs: ['mode: all for Wait for all, or race for Race (first completes)'],
    outputs: ['incoming object fields', 'mode', 'results (empty placeholder)', 'metadata.parallelMode in registry execution'],
    example: `Input: {orderId: "ord_1042", customerEmail: "buyer@example.com"}
Mode: all

Output:
{
  orderId: "ord_1042",
  customerEmail: "buyer@example.com",
  mode: "all",
  results: []
}`,
    tips: ['Connect the outgoing lines to the actual branch nodes; Parallel does not create branches by itself', 'Use Merge when branch data must be recombined', 'Race records intent but does not cancel already-running downstream work', 'Downstream service nodes still need their own account connections'],
  },

  retry: {
    overview: 'Attaches retry settings to the workflow data and registry metadata. The legacy node body does not rerun the previous node itself; engine-level retry orchestration and branch wiring handle actual replay.',
    inputs: ['maxAttempts', 'delayBetween in milliseconds', 'backoff: none, linear, or exponential'],
    outputs: ['incoming object fields', 'attempts: 0', 'maxAttempts', 'delayBetween', 'backoff', 'metadata.retryConfig'],
    example: `Input: {ticketId: "SUP-1008"}
Max Attempts: 3
Delay Between: 1000
Backoff: exponential

Output:
{
  ticketId: "SUP-1008",
  attempts: 0,
  maxAttempts: 3,
  delayBetween: 1000,
  backoff: "exponential"
}`,
    tips: ['Use delayBetween, not the old delay key', 'Use backoff, not the old backoffMultiplier key', 'Enter milliseconds, so 5000 means five seconds', 'Make downstream side effects idempotent before allowing retries'],
  },

  return: {
    overview: 'Stops the current workflow path and emits a special return payload. Runtime output is success, __return, and returnedValue; it is not returned/value from older examples.',
    inputs: ['value (optional JSON/expression)', 'includeInput (optional checkbox; overrides value when true)'],
    outputs: ['success', '__return', 'returnedValue'],
    example: `Value: {"success": true, "ticketId": "{{$json.ticketId}}"}
Include Input: false

Output:
{
  success: true,
  __return: true,
  returnedValue: {
    success: true,
    ticketId: "SUP-1042"
  }
}`,
    tips: ['Map {{$json.returnedValue}} after this node', 'Turn Include Input on only when the whole incoming object should be returned', 'If Value is blank and Include Input is off, returnedValue is null', 'No credentials are required; service nodes around it still need connections'],
  },

  execute_workflow: {
    overview: 'Calls a reusable child workflow by workflowId, skips the child trigger node, runs the remaining child nodes inline, and returns the child final result to the parent workflow.',
    inputs: ['workflowId: required saved child workflow ID', 'input: optional JSON payload for the child workflow', 'inputData: legacy fallback used only when input is absent'],
    outputs: ['success', 'result', 'workflowId', 'error on lookup or child execution failure'],
    example: `Workflow ID: {{$json.escalationWorkflowId}}
Input:
{
  "ticketId": "{{$json.ticketId}}",
  "customerEmail": "{{$json.customerEmail}}",
  "priority": "{{$json.priority}}"
}

Output:
{
  success: true,
  workflowId: "123e4567-e89b-12d3-a456-426614174000",
  result: {
    notificationSent: true,
    ticketId: "SUP-1042"
  }
}`,
    tips: [
      'The child workflow must be confirmed or active and include a trigger node.',
      'Map returned child fields from {{$json.result.fieldName}} in the parent workflow.',
      'Use a Return node inside the child workflow when you want a clean returnedValue contract.',
      'Execute Workflow has no third-party credentials, but service nodes inside the child still need their own account connections.',
    ],
  },

  timeout: {
    overview: 'Compares elapsed workflow time with the Limit field and routes to success or timeout. It does not pause execution or cancel an API call already in progress.',
    inputs: ['limit: positive milliseconds such as 30000'],
    outputs: ['elapsedMs', 'limitMs', 'timedOut', 'originalInput', '__routing.branch'],
    example: `Input: {ticketId: "SUP-2001", priority: "urgent"}
Limit: 30000

Output:
{
  elapsedMs: 42150,
  limitMs: 30000,
  timedOut: true,
  originalInput: {ticketId: "SUP-2001", priority: "urgent"},
  __routing: {branch: "timeout"}
}`,
    tips: ['Use 30000 for 30 seconds; the field is milliseconds', 'Map {{$json.limitMs}}, not {{$json.limit}}', 'Connect the timeout outgoing line to a fallback path', 'Invalid Limit returns INVALID_CONFIG'],
  },

  try_catch: {
    overview: 'Marks try/catch routing and preserves input for connected try and catch paths. The Try/Catch node itself does not call the protected service; the nodes connected to the try branch do that work.',
    inputs: ['No visible setup fields'],
    outputs: ['incoming object fields', '__routing.branch = try on normal execution', 'error and errorType only when catch routing receives error context'],
    example: `Input: {ticketId: "SUP-3001", customerEmail: "buyer@example.com"}

Normal output:
{
  ticketId: "SUP-3001",
  customerEmail: "buyer@example.com",
  __routing: {branch: "try"}
}`,
    tips: ['Connect the try outgoing line to the risky service node', 'Connect the catch outgoing line to fallback handling', 'Catch data appears only when the engine routes an error', 'Service nodes inside try/catch still need their own account connections'],
  },

  noop: {
    overview: 'No operation node - passes input data through unchanged. Useful for debugging, adding breakpoints, or maintaining workflow structure without modification.',
    inputs: ['any data'],
    outputs: ['input (unchanged)'],
    example: `Input: {orderId: 123, status: "pending"}

Output: {orderId: 123, status: "pending"}

No transformation applied - data passes through exactly as received.`,
    tips: ['Useful for debugging workflow flow', 'Can add comments or notes in workflow', 'Maintains data structure without changes', 'No configuration needed'],
  },

  stop_and_error: {
    overview: 'Stops workflow execution intentionally by throwing an error in the format ERROR_CODE: message. Useful for validation failures, business rule violations, or unsafe branches.',
    inputs: ['errorMessage', 'errorCode'],
    outputs: ['thrown error; no normal downstream output object'],
    example: `Error Message: "Payment validation failed"
Error Code: "PAYMENT_INVALID"

When this node executes:
1. Workflow stops immediately
2. The thrown error text is PAYMENT_INVALID: Payment validation failed
3. Later normal nodes do not run and cannot read {{$json.errorMessage}}

Use with If/Else to conditionally stop workflows:
If/Else (condition fails) -> Stop And Error`,
    tips: ['Use for validation failures', 'Error code helps categorize errors', 'Do not paste secrets into error text because it can appear in logs', 'Use with conditional logic for smart stopping'],
  },

  split_in_batches: {
    overview: 'Divides an incoming array into smaller groups, returns every group in batches, and exposes the first group as items. Current DAG runtime does not run the next branch once per batch.',
    inputs: ['array expression (optional)', 'batchSize'],
    outputs: ['batches', 'batchSize', 'totalBatches', 'items', '_warning'],
    example: `Input: { syncDate: "2026-07-18", contacts: [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}] }
Array Expression: {{$json.contacts}}
Batch Size: 2

Output:
{
  syncDate: "2026-07-18",
  batches: [[{id: 1}, {id: 2}], [{id: 3}, {id: 4}], [{id: 5}]],
  batchSize: 2,
  totalBatches: 3,
  items: [{id: 1}, {id: 2}],
  _warning: "Split In Batches exposes batch data; DAG runtime does not run the next branch once per batch."
}`,
    tips: ['Leave Array Expression empty only when input.items already contains the list', 'Use smaller batch sizes for rate-limited services', 'Use {{$json.batches}} for all groups and {{$json.items}} for the first exposed group', 'Split In Batches has no credentials; downstream service nodes still need connected accounts'],
  },

  // Data Transformation
  javascript: {
    overview: 'Run sandboxed JavaScript once against the current workflow data and return the transformed value for downstream nodes.',
    inputs: ['current workflow data as input, $json, or json', 'optional timeout in milliseconds', 'optional outputSchema top-level type hint'],
    outputs: ['whatever the script returns as downstream {{$json}} data', '_error when code is missing, execution is disabled, the script throws, or it times out'],
    example: `Code:
const total = Number($json.orderTotal || 0);
return {
  ...$json,
  riskScore: total > 5000 ? 90 : 20,
  eligibleForReview: total > 5000,
  processedAt: "2026-07-18T09:30:00.000Z"
};

Input: {orderId: "ord_1042", customerEmail: "asha.rao@example.com", orderTotal: 6400}
Output: {orderId: "ord_1042", customerEmail: "asha.rao@example.com", orderTotal: 6400, riskScore: 90, eligibleForReview: true, processedAt: "2026-07-18T09:30:00.000Z"}`,
    tips: ['Always return the value the next node should receive', 'Default timeout is 5000ms and runtime caps at 30000ms', 'Use Output Schema such as {"type":"object"} only as a top-level shape hint', 'JavaScript has no credentials; connect downstream service node accounts separately', 'Do not paste API keys, tokens, or passwords into code'],
  },

  function: {
    overview: 'Run custom JavaScript once against the incoming object. The sandbox exposes input, data, $json, and json, and the node returns exactly the script return value or assigned result.',
    inputs: ['code', 'timeout', 'incoming object as input/data/$json/json'],
    outputs: ['exact JavaScript return value', 'assigned result when no return runs first', 'original input when neither return nor result is used', '_error on code/runtime/timeout failure'],
    example: `Code:
const total = Number($json.orderTotal || 0);
return {
  ...$json,
  highValue: total > 5000
};

Input: {orderId: "ord_1042", orderTotal: 6400}
Output: {
  orderId: "ord_1042",
  orderTotal: 6400,
  highValue: true
}`,
    tips: ['Use return or assign result', 'Return {...$json, newField} to preserve incoming fields', 'Runtime caps timeout at 30000ms', 'Do not paste API keys, tokens, or passwords into code'],
  },

  function_item: {
    overview: 'Run custom JavaScript once for each element in input.items and replace items with the mapped results. Runtime exposes item, input, data, $json, and json as the current item; it does not expose index today.',
    inputs: ['code', 'timeout', 'input.items array'],
    outputs: ['incoming top-level fields preserved', 'items replaced with mapped array', '_error on code/runtime failure'],
    example: `Code:
return {
  ...item,
  doubled: item.value * 2,
  processed: true
};

Input: {batchId: "b1", items: [{id: 1, value: 10}, {id: 2, value: 20}]}
Output: {
  batchId: "b1",
  items: [
    {id: 1, value: 10, doubled: 20, processed: true},
    {id: 2, value: 20, doubled: 40, processed: true}
  ]
}`,
    tips: ['Use item for the current row', 'Do not use index because runtime does not define it', 'If input.items is missing, the input passes through unchanged after code validation', 'Runtime caps timeout at 30000ms'],
  },

  execute_command: {
    overview: 'Execute system commands or shell scripts. âš ï¸ WARNING: Disabled by default for security. Enable only if you trust the command and understand the risks.',
    inputs: ['command parameters'],
    outputs: ['stdout', 'stderr', 'exitCode'],
    example: `Command: echo "Hello {{input.name}}"
Enabled: true (âš ï¸ Security risk)

Input: {name: "World"}
Output: {
  stdout: "Hello World",
  stderr: "",
  exitCode: 0
}

âš ï¸ Only enable for trusted commands in secure environments.`,
    tips: ['âš ï¸ Disabled by default for security', 'Only enable if you trust the command', 'Use for system operations and scripts', 'Set appropriate timeout', 'Be careful with user input'],
  },

  set: {
    overview: 'Adds clean field names to the current item or overwrites existing fields before later steps use the data. Use it to normalize form, webhook, sheet, CRM, or API payloads.',
    inputs: ['incoming workflow item', 'required fields JSON object'],
    outputs: ['incoming item plus configured fields'],
    example: `Fields (JSON): {
  "customerEmail": "{{$json.email}}",
  "fullName": "{{$json.firstName}} {{$json.lastName}}",
  "leadSource": "Website demo request",
  "readyForSales": true
}

Input: {firstName: "Asha", lastName: "Rao", email: "asha.rao@example.com", leadId: "lead_1042"}
Output: {
  firstName: "Asha",
  lastName: "Rao",
  email: "asha.rao@example.com",
  leadId: "lead_1042",
  customerEmail: "asha.rao@example.com",
  fullName: "Asha Rao",
  leadSource: "Website demo request",
  readyForSales: true
}`,
    tips: ['Use {{$json.field}} expressions for values from earlier steps', 'Keys you set are available later as {{$json.keyName}}', 'Matching field names overwrite incoming values', 'Set has no credentials; connect accounts on downstream service nodes'],
  },

  edit_fields: {
    overview: 'Adds or overwrites fields on the current item with simple key-value rows. Use it to make messy incoming data easier for later nodes to map.',
    inputs: ['incoming workflow item', 'optional field mappings'],
    outputs: ['incoming item plus edited fields'],
    example: `Fields: {
  "customerEmail": "{{$json.email}}",
  "fullName": "{{$json.fname}} {{$json.lname}}",
  "priorityLabel": "High",
  "needsManagerReview": true
}

Input: {ticketId: "SUP-1042", email: "maya@example.com", fname: "Maya", lname: "Chen"}
Output: {ticketId: "SUP-1042", email: "maya@example.com", fname: "Maya", lname: "Chen", customerEmail: "maya@example.com", fullName: "Maya Chen", priorityLabel: "High", needsManagerReview: true}`,
    tips: ['Configured fields are added or overwritten', 'Leave fields empty only when pass-through is intentional', 'Use {{$json.field}} expressions for values from earlier steps', 'Edit Fields has no credentials; downstream service nodes still need connected accounts'],
  },

  aggregate: {
    overview: 'Performs aggregation operations on input.items: sum, average, count, min, max, or join. Can aggregate a named field or each item directly.',
    inputs: ['array of items'],
    outputs: ['aggregated result'],
    example: `Operation: Sum
Field: price

Input: [
  {name: "Item 1", price: 10, category: "A"},
  {name: "Item 2", price: 20, category: "A"},
  {name: "Item 3", price: 15, category: "B"}
]

Output: {aggregate: 45, operation: "sum", field: "price"}`,
    tips: ['Leave field empty to aggregate items directly', 'Use delimiter with Join to create readable text', 'Supports sum, avg, count, min, max, join', 'If input.items is missing or not an array, this node silently passes the input through unchanged with no error and no aggregate key'],
  },

  limit: {
    overview: 'Limits the number of items in an array. Returns only the first N items, useful for pagination or processing subsets. Never raises an error - a missing array or an invalid Limit value both silently pass the input through unchanged.',
    inputs: ['limit', 'optional array expression', 'or input.items/input.array'],
    outputs: ['items (no separate array key)'],
    example: `Limit: 5

Input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
Output: {items: [1, 2, 3, 4, 5]}

Useful for:
â€¢ Pagination (first page)
â€¢ Processing top N items
â€¢ Preventing large array processing`,
    tips: ['Returns first N items in items only - there is no separate array output key', 'Useful for pagination', 'Prevents processing large arrays', 'Combine with Sort to get top/bottom items', 'A missing array or invalid Limit value never errors - both silently return the input unchanged'],
  },

  sort: {
    overview: 'Sorts input.items in ascending or descending order. Can sort by a specific field or sort items directly. Supports string, number, and date types.',
    inputs: ['input.items', 'field', 'direction', 'type'],
    outputs: ['input object with sorted items array'],
    example: `Field: price
Direction: Ascending
Type: Number

Input: [
  {name: "Item A", price: 30},
  {name: "Item B", price: 10},
  {name: "Item C", price: 20}
]

Output: [
  {name: "Item B", price: 10},
  {name: "Item C", price: 20},
  {name: "Item A", price: 30}
]`,
    tips: [
      'Leave field empty to sort items directly',
      'Use "auto" type for automatic detection',
      'Ascending = smallest to largest',
      'Descending = largest to smallest',
      'If items is missing or not an array, this node silently returns the input unchanged â€” no error is raised',
      'An item missing the sort field is silently treated as the smallest possible value rather than flagged',
    ],
  },

  item_lists: {
    overview: 'Converts an object into a key-value list format. Useful for displaying object data in lists, tables, or for iteration.',
    inputs: ['object'],
    outputs: ['array of key-value pairs'],
    example: `Input: {
  name: "John",
  age: 30,
  city: "NYC"
}

Output: [
  {key: "name", value: "John"},
  {key: "age", value: 30},
  {key: "city", value: "NYC"}
]`,
    tips: ['Converts object to array format', 'Useful for UI display', 'Each item has key and value', 'Preserves all object properties'],
  },

  merge_data: {
    overview: 'Combines data from multiple connected workflow branches. Runs the exact same code as the Merge node in the Logic category â€” Merge Data is the same behavior under the Data category. Supports overwrite, append, and deep_merge modes.',
    inputs: ['mode', 'multiple data inputs from different branches'],
    outputs: ['combined payload (overwrite/deep_merge)', 'items array only, in append mode'],
    example: `Mode: overwrite
Input 1: {name: "John", age: 30}
Input 2: {email: "john@test.com"}

Output: {name: "John", age: 30, email: "john@test.com"}

Mode: append
Input 1: {name: "John", branch: "billing"}
Input 2: {name: "John", branch: "technical"}
Output: {items: [{name: "John", branch: "billing"}, {name: "John", branch: "technical"}]}`,
    tips: [
      'overwrite (the default) combines flat object fields with later branch values winning on collision',
      'append replaces the entire output with {{$json.items}} â€” an array of each branch\'s full output object, not a concatenation of array contents',
      'deep_merge recursively combines nested objects, but replaces (does not merge) arrays and mismatched types at the same field',
      'There is no error for missing branches or an unrecognized Mode value â€” this node silently falls back to unchanged passthrough instead',
    ],
  },

  json_parser: {
    overview: 'Parse JSON text into structured workflow data and optionally copy top-level fields.',
    inputs: ['json', 'optional extractFields array'],
    outputs: ['parsed object plus extracted top-level fields'],
    example: `JSON: {
  "name": "John",
  "email": "john@test.com",
  "plan": "pro"
}

Extract Fields: ["email"]
Output: {parsed: {name: "John", email: "john@test.com", plan: "pro"}, email: "john@test.com"}`,
    tips: ['json is required; legacy jsonData and data aliases still work', 'extractFields copies only top-level keys', 'Leave extractFields empty to keep the full parsed object under parsed'],
  },

  text_formatter: {
    overview: 'Format text using a template with {{$json.field}} substitution. The resolved text is returned directly as the entire output â€” not wrapped in a formatted_text field.',
    inputs: ['template'],
    outputs: ['the resolved text directly (no wrapper field) when Template is filled in', 'data and formatted (both the whole item as JSON text) when Template is left blank'],
    example: `Template: "Hello {{$json.name}}! Your order #{{$json.orderId}} ships on {{$json.shipDate}}."

Input: {name: "John", orderId: 123, shipDate: "Jan 20"}
Output: "Hello John! Your order #123 ships on Jan 20." (this string IS the entire output â€” read it as {{$json}}, not {{$json.formatted_text}})`,
    tips: [
      'Use {{$json.field}} expressions for substitution',
      'The runtime does not read a separate values field',
      'The output is the raw resolved string, not an object â€” reference it downstream as {{$json}}',
      'A Template that is a single bare {{$json.field}} expression with no surrounding text outputs the literal text "null" if that field is missing, instead of an empty string',
      'Great for email/message templates',
    ],
  },

  http_request: {
    overview: 'Call an external API or webhook, optionally adding headers, query parameters, body data, and a timeout.',
    inputs: ['url', 'method', 'headers', 'body for POST/PUT/PATCH', 'qs query parameters', 'timeout'],
    outputs: ['status and statusText', 'headers', 'body and data', 'final url', 'acknowledgementStatus', '_error on request failures'],
    example: `URL: https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices
Method: GET
Headers: {"Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}
Query String Params: {"limit":1,"status":"latest"}

Output: {
  status: 200,
  statusText: "OK",
  body: {customerEmail: "asha.rao@example.com", invoiceStatus: "paid"},
  data: {customerEmail: "asha.rao@example.com", invoiceStatus: "paid"},
  url: "https://api.billing.example.com/v1/customers/cus_1042/invoices?limit=1&status=latest",
  acknowledgementStatus: "acknowledged"
}`,
    tips: ['Use {{$json.field}} in the URL, body, or query values when data comes from an earlier step', 'GET reads, POST creates, PUT replaces, PATCH partially updates, DELETE removes', 'Runtime sends Body only for POST, PUT, and PATCH', 'HTTP Request has no saved credentials; use secure secret references for protected API headers', 'Downstream service nodes still need their own account connections'],
  },

  graphql: {
    overview: 'Execute GraphQL queries and mutations by wrapping HTTP Request with method POST. GraphQL data is inside the HTTP response body, not returned as a separate top-level data/errors pair.',
    inputs: ['url', 'query', 'variables', 'operationName (optional)', 'headers', 'timeout'],
    outputs: ['status', 'statusText', 'headers', 'body', 'data', 'url', 'method', 'responseTime', '_error'],
    example: `Endpoint: https://api.example.com/graphql
Query: 
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      email
    }
  }
Variables: {"id": "{{$json.customerId}}"}

Output: {
  status: 200,
  body: {data: {customer: {id: "cus_1042", email: "asha.rao@example.com"}}},
  data: {data: {customer: {id: "cus_1042", email: "asha.rao@example.com"}}},
  method: "POST"
}`,
    tips: ['Use GraphQL query syntax with $variables and map values in Variables', 'Variables that cannot be parsed silently become {}', 'GraphQL errors are inside {{$json.body.errors}}', 'HTTP/network failures return {{$json._error}} from the wrapped HTTP Request runtime'],
  },

  respond_to_webhook: {
    overview: 'Normalize the response object intended for a webhook caller. Runtime returns statusCode, headers, and body; the surrounding webhook/API layer is what actually sends that response.',
    inputs: ['statusCode', 'responseBody', 'headers', 'body (backend alias)'],
    outputs: ['statusCode', 'headers', 'body'],
    example: `Status Code: 200
Headers: {"Content-Type": "application/json"}
Response Body: {"received": true, "orderId": "{{$json.orderId}}"}

Output: {
  statusCode: 200,
  headers: {"Content-Type": "application/json"},
  body: {received: true, orderId: "ord_1042"}
}`,
    tips: ['Use statusCode in the UI; responseCode is only a runtime alias', 'responseBody is normalized to {{$json.body}}', 'No sent flag is returned', 'Use at the end of webhook response-mode workflows'],
  },

  webhook_response: {
    overview: 'Return a custom HTTP response object for an incoming webhook. Functionally similar to Respond to Webhook and returns only statusCode, headers, and body.',
    inputs: ['statusCode', 'body', 'headers'],
    outputs: ['statusCode', 'headers', 'body'],
    example: `Status Code: 200
Headers: {"Content-Type": "application/json"}
Body: {"success": true, "ticketId": "{{$json.ticketId}}"}

Output: {
  statusCode: 200,
  headers: {"Content-Type": "application/json"},
  body: {success: true, ticketId: "CASE-1042"}
}`,
    tips: ['Use at the end of webhook workflows', 'Set appropriate status codes such as 200, 201, 400, or 500', 'Body falls back to incoming input when blank', 'No sent flag is returned'],
  },

  set_variable: {
    overview: 'Create exactly one named output value from Variable Name and Value. The Values (legacy array) and Keep Source fields are visible in the panel but are never read â€” this node\'s output always replaces the entire item with just the one new field.',
    inputs: ['name', 'value'],
    outputs: ['a single field, named by Variable Name'],
    example: `Variable Name: totalCount
Value: {{$json.items.length}}

Later nodes can access: {{$json.totalCount}}

Every other field the item had (such as {{$json.orderId}}) is gone after this node runs.`,
    tips: [
      'Access the new field as {{$json.name}} in the next node',
      'Values and Keep Source have no effect â€” this node\'s execution code never reads either field',
      'Use the Set (Edit Fields) node instead when several fields need to be created, or when incoming fields must be preserved alongside a new one',
    ],
  },

  google_sheets: {
    overview: 'Read, write, append, or update data in Google Sheets. Connect your spreadsheets to workflows for data extraction, logging, and automation.',
    inputs: ['operation', 'spreadsheetId', 'sheetName', 'range', 'outputFormat', 'readDirection (read)', 'values or data (write/append/update)'],
    outputs: ['rows/items, headers, values (read)', 'success, updatedRange, updatedCells, values (write/update)', 'success, tableRange, updatedRange, appendedValues (append)'],
    example: `Operation: Read
Spreadsheet ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
Sheet: Sheet1
Range: A1:D100
Output Format: JSON

Output: {
  rows: [
    {row_number: 2, Name: "John", Email: "john@example.com", Status: "Active"},
    {row_number: 3, Name: "Jane", Email: "jane@example.com", Status: "Pending"}
  ],
  headers: ["Name", "Email", "Status"]
}

AI Agent can then analyze, filter, or process this data.`,
    tips: [
      'Get Spreadsheet ID from URL: /d/SPREADSHEET_ID/edit',
      'Leave range empty to read all used cells',
      'Use key-value or text Output Format for easier AI processing',
      'Allow Write Access has no runtime effect â€” write/append/update run regardless of this checkbox',
      'Data is checked before Values when both are filled',
      'Authenticate with Google account first',
    ],
  },

  google_sheets_trigger: {
    overview: 'Start a workflow from Google Sheets row changes by polling a watched spreadsheet about every two minutes. Activation captures the current rows as a baseline, so old rows do not fire as new events.',
    inputs: ['spreadsheetId', 'sheetName (optional)', 'hasHeaderRow', 'eventTypes: row_added and/or row_updated', 'query keyword filter (optional)', 'Google OAuth2 connection'],
    outputs: ['eventId', 'eventType', 'source', 'timestamp', 'spreadsheetId', 'sheetName', 'rowNumber', 'values', 'row', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_googleSheets'],
    example: `Spreadsheet ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
Sheet Name: Leads
Has Header Row: true
Event Types: row_added
Keyword Filter: urgent

When a new row containing "urgent" appears after activation, the workflow receives {{$json.row.Email}}, {{$json.row.Priority}}, {{$json.rowNumber}}, and {{$json.eventType}}.`,
    tips: [
      'Google Sheets does not push cell-change webhooks, so this trigger polls about every two minutes',
      'Existing rows become the activation baseline; add or edit rows after activation to test it',
      'Use row_added for new appended rows and row_updated for changes to tracked rows',
      'Keep Has Header Row on when downstream nodes should use {{$json.row.ColumnName}}; use {{$json.values[0]}} style paths when it is off',
      'Save Google OAuth2 in Connections with Sheets access; do not put OAuth tokens or Google passwords into workflow fields',
      'Connect downstream service accounts separately; this connection only authorizes sheet polling',
    ],
  },



  database_read: {
    overview: 'Read data from your database tables. Query with filters, ordering, and limits.',
    inputs: ['filter criteria'],
    outputs: ['rows', 'count'],
    example: `Table: orders
Columns: id, customer_name, total
Filters: {"status": "pending"}
Limit: 10
Order By: created_at

Output: [
  {id: 1, customer_name: "John", total: 99},
  {id: 2, customer_name: "Jane", total: 150}
]`,
    tips: ['Use * for all columns', 'Filters use exact match', 'Combine with Loop for batch processing'],
  },

  // Output Actions
  http_post: {
    overview: 'Send data to external APIs via HTTP POST. This node is an alias for HTTP Request with method forced to POST.',
    inputs: ['url', 'headers', 'body'],
    outputs: ['status', 'statusText', 'headers', 'body', 'data', 'url', 'method', 'responseTime', '_error'],
    example: `URL: https://api.example.com/webhook
Headers: {"Content-Type": "application/json"}
Body: {"event": "workflow_complete", "email": "{{$json.email}}"}

Output: {
  status: 201,
  body: {id: "sub_1042", created: true},
  data: {id: "sub_1042", created: true},
  method: "POST"
}`,
    tips: [
      'Use {{$json.field}} template variables inside the body for dynamic content',
      'Add auth headers (Bearer/API key) if needed',
      'Set Content-Type to match your body',
      'Use HTTP Request directly when you need GET, PUT, PATCH, DELETE, query parameters, or more method control',
    ],
  },

  email_resend: {
    overview: 'Send emails using Resend. Supports HTML content, templates, and dynamic content from workflow data.',
    inputs: ['email content', 'recipient data'],
    outputs: ['message_id', 'status'],
    example: `To: {{input.customer.email}}
From: notifications@yourapp.com
Subject: Order Confirmed #{{input.orderId}}
Body: "<h1>Thank you!</h1><p>Order {{input.orderId}} confirmed.</p>"

Sends personalized order confirmation.`,
    tips: ['Requires RESEND_API_KEY secret', 'Use HTML for rich emails', 'Use {{input.x}} for personalization'],
  },
  email: {
    overview: 'Send plain-text or HTML emails through a saved SMTP Account connection. Use this for company mail relays or SMTP providers when Gmail/Outlook OAuth is not the right sender path.',
    inputs: ['to', 'subject', 'text', 'html (optional)', 'from (optional)'],
    outputs: ['incoming fields are kept', 'success', 'messageId', 'accepted', 'rejected', '_error on missing fields, missing SMTP credentials, or SMTP send failure'],
    example: `To: {{$json.customerEmail}}
Subject: "Invoice {{$json.invoiceNumber}} is ready"
Text: "Hi {{$json.firstName}}, your invoice is ready: {{$json.invoiceUrl}}"
HTML: "<p>Hi {{$json.firstName}},</p><p><a href='{{$json.invoiceUrl}}'>View invoice</a></p>"
From: billing@company.com

Output: {
  customerEmail: "asha.rao@example.com",
  invoiceNumber: "INV-1042",
  success: true,
  messageId: "<abc123@smtp.example.com>",
  accepted: ["asha.rao@example.com"],
  rejected: []
}`,
    tips: [
      'Save SMTP host, port, username, and password or app password in an SMTP Account connection',
      'Do not paste SMTP passwords into To, Subject, Text, HTML, or From fields',
      'Use text as a reliable fallback, even when html is provided',
      'Leave From blank unless the SMTP provider allows the sender address',
      'Connect downstream service accounts separately; SMTP only authorizes this email send',
    ],
  },

  amazon_ses: {
    overview: 'Send transactional or templated emails through Amazon Simple Email Service (SES) using a saved AWS Access Key connection. Use it for order confirmations, notifications, and bulk transactional sends when you need AWS-native retry logic, delivery tracking, and attachments.',
    inputs: ['recipients', 'fromAddress', 'subject/body (raw send) or templateName/templateData (template send)', 'awsRegion (optional)', 'attachments (optional)'],
    outputs: ['success', 'messageId', 'recipientCount', 'failedRecipients (always empty)', 'attempts', 'timestamp', '_error on validation failures, error on AWS SES send failures'],
    example: `Recipients: {"to": ["{{$json.customerEmail}}"]}
From Address: orders@yourcompany.com
Subject: "Order {{$json.orderId}} Confirmation"
Body: "Hi {{$json.customerName}}, your order {{$json.orderId}} is confirmed."

Output: {
  success: true,
  messageId: "0102018e2b3c7abc-def1234-...",
  recipientCount: 1,
  failedRecipients: [],
  attempts: 1,
  timestamp: "2026-07-18T09:15:00.000Z"
}`,
    tips: [
      'Verify the From Address (and Return Path, if used) in AWS SES for the exact AWS Region set on this node â€” verification is per-region',
      'Field-validation failures (missing recipients/subject/body) return _error; actual AWS SES send failures (unverified sender, rate limiting, missing connection) return a plain error field instead â€” check both downstream',
      'Attachments are limited to specific file types (PDF, Word, Excel, common images, TXT/CSV, ZIP) and a 40MB total email size',
      'Do not paste the Access Key ID or Secret Access Key into Recipients, Subject, Body, or any other workflow field â€” save them in Connections',
      'Connect downstream service accounts separately; the Amazon SES connection only authorizes this node\'s own email send',
    ],
  },

  mailgun: {
    overview: 'Send transactional emails through Mailgun using a saved API Key connection (private API key, sending domain, and region). Use it for password resets, receipts, and other transactional emails, with support for stored Mailgun templates.',
    inputs: ['from', 'to', 'subject', 'text and/or html (or template)', 'cc/bcc/replyTo/tags (optional)', 'templateVariables (optional, with template)'],
    outputs: ['success (on success only)', 'messageId', 'message', 'mailgun', '_error / _errorDetails on failure'],
    example: `From: noreply@mg.yourcompany.com
To: {{$json.email}}
Subject: "Reset your password"
Html: "<p>Click <a href=\\"{{$json.resetUrl}}\\">here</a> to reset your password.</p>"

Output: {
  success: true,
  messageId: "<20260718091500.1.ABCDEF@mg.yourcompany.com>",
  message: "Queued. Thank you.",
  mailgun: { id: "...", message: "Queued. Thank you." }
}`,
    tips: [
      'To/CC/BCC are comma-separated strings on this node, not a JSON {"to": [...]} object like Amazon SES uses',
      'Mailgun requires at least one of Text, HTML, or Template â€” leaving all three empty fails before Mailgun is contacted',
      'There is no success: false on failure â€” only check {{$json._error}} downstream to detect a failed send',
      'Sandbox domains can only send to recipients you have explicitly authorized in the Mailgun dashboard',
      'Do not paste the Private API Key into From, To, or any other workflow field â€” save it in the Mailgun connection under Connections',
      'Connect downstream service accounts separately; the Mailgun connection only authorizes this node\'s own email send',
    ],
  },

  sendgrid: {
    overview: 'Send a one-off transactional email through SendGrid\'s Mail Send API using a saved API Key connection. Only From, To, Subject, Text, and HTML are supported â€” this node does not implement SendGrid CC/BCC, Reply-To, attachments, categories, or Dynamic Templates.',
    inputs: ['from', 'to', 'subject (optional)', 'text and/or html (optional)'],
    outputs: ['success (on success only)', 'status', 'messageId', '_error / _errorDetails on failure'],
    example: `From: receipts@yourapp.com
To: {{$json.customerEmail}}
Subject: "Your receipt for order #{{$json.orderId}}"
Html: "<h1>Thank you!</h1><p>You paid \${{$json.amount}}.</p>"

Output: {
  success: true,
  status: 202,
  messageId: "a1B2c3D4e5F6.filter-node-1...@sgrp"
}`,
    tips: [
      'To is a comma-separated string on this node, not a JSON {"to": [...]} object like Amazon SES uses',
      'Neither Text nor HTML is actually required â€” leaving both blank sends an email with an empty body instead of failing',
      'There is no success: false on failure â€” only check {{$json._error}} downstream to detect a failed send',
      'This node does not support CC, BCC, Reply-To, attachments, or SendGrid Dynamic Templates; use Mailgun or the HTTP Request node for those',
      'Do not paste the API Key into From, To, or any other workflow field â€” save it in the SendGrid connection under Connections',
      'Connect downstream service accounts separately; the SendGrid connection only authorizes this node\'s own email send',
    ],
  },

  slack_message: {
    overview: 'Send Slack bot messages to channels, direct messages, or existing threads through a saved Slack OAuth2 connection. Use it for workplace alerts, support replies, incident updates, approvals, report summaries, and deployment notifications.',
    inputs: ['channel', 'message', 'threadTs (optional)', 'blocks (optional)', 'username (optional)', 'iconEmoji (optional)'],
    outputs: ['id', 'status', 'provider', 'ok', 'channel', 'ts', 'threadTs', 'message', 'error'],
    example: `Channel: {{$json.channelId}}
Message: "Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs review"
Thread Timestamp: {{$json.threadTs}}
Blocks: []
Bot Name: Support Workflow
Icon Emoji: :memo:

Sends a Slack bot message with chat.postMessage and returns the Slack timestamp in {{$json.ts}}.`,
    tips: [
      'Select a Slack OAuth2 connection; do not paste bot tokens into message fields',
      'The Slack app needs chat:write, and the bot must be invited before it can post in private channels',
      'Use {{$json.channelId}} and {{$json.threadTs}} from Slack Trigger to reply in the same conversation',
      'Keep Message filled as readable fallback text even when Blocks contains a rich Block Kit layout',
      'Connect downstream service accounts separately; Slack OAuth2 only authorizes the Slack send',
    ],
  },
  discord_trigger: {
    overview: 'Start workflows from Discord slash commands, interactions, modal submits, autocomplete, message-like events, or supported Discord Webhook Events. The worker validates Discord signatures, applies optional filters, and emits normalized Discord fields for downstream nodes.',
    inputs: ['eventTypes', 'guildIds', 'channelIds', 'allowedUserIds', 'commandFilter', 'applicationId', 'publicKey fallback', 'validateSignature', 'Discord Bot Token connection'],
    outputs: ['eventId', 'eventType', 'text', 'userId', 'username', 'guildId', 'channelId', 'messageId', 'command', 'interactionToken', 'applicationId', 'responseUrl', 'rawEventType', 'raw', 'sessionId', '_discord'],
    example: `Event Types: slash_command, interaction
Command Filter: /support
Validate Signature: true

Output:
{
  eventType: "slash_command",
  text: "priority:urgent",
  command: "/support",
  channelId: "333333333333333333",
  interactionToken: "interaction-token",
  applicationId: "999999999999999999"
}`,
    tips: [
      'Use the generated CtrlChecks URL as the Discord Interactions Endpoint URL and optional Webhook Events URL',
      'Save bot token, public key, and application ID in the Discord Bot Token connection; do not store private credentials in normal fields',
      'Keep Validate Signature enabled for production',
      'Use {{$json.channelId}} for same-channel bot replies and {{$json.interactionToken}} with {{$json.applicationId}} for interaction follow-ups',
      'Downstream Discord action nodes still need a Discord Bot Token connection and bot permissions in the server',
    ],
  },

  discord: {
    overview: 'Send messages to Discord channels via a Discord bot token, or reply to a slash command/component interaction using an interaction token. Use it for bot notifications, support bot replies, and Discord Trigger follow-ups.',
    inputs: ['channelId', 'message', 'interactionToken (optional)', 'applicationId (optional)', 'replyToMessageId (optional)'],
    outputs: ['success', 'discord', 'interactionReply', '_error', '_errorDetails'],
    example: `Channel ID: {{$json.channelId}}
Message: "New ticket {{$json.ticketId}} from {{$json.customerEmail}} needs review"

Posts the message with the Discord Bot API and returns the new message object in {{$json.discord}}.`,
    tips: [
      'Create a bot at discord.com/developers/applications and save the Bot Token in Connections; do not paste it into workflow fields',
      'Invite the bot to your server via OAuth2 â†’ URL Generator with the bot scope and Send Messages permission',
      'Use {{$json.channelId}} from Discord Trigger to reply in the same channel, or use Interaction Token + Application ID to reply to a slash command without a bot token',
      'Reference the sent message later with {{$json.discord.id}}',
      'Connect downstream service accounts separately; the Discord Bot Token only authorizes Discord sends',
    ],
  },
  discord_webhook: {
    overview: 'Send messages to Discord channels via a selected webhook connection. Great for notifications and alerts.',
    inputs: ['message', 'username (optional)', 'avatarUrl (optional)'],
    outputs: ['success', 'sent', 'message', 'discord_webhook', '_error'],
    example: `Message: "âœ… Workflow completed successfully!"
Username: "Alert Bot"

Sends message to Discord channel.`,
    tips: [
      'Save the Discord webhook URL as a Connection; anyone with the raw URL can post to that channel',
      'Customize username and avatar per message to distinguish sources sharing one webhook',
      'Supports markdown formatting',
      'Discord returns HTTP 204 with no body on success; check {{$json.success}} and {{$json.discord_webhook.status}}',
    ],
  },

  database_write: {
    overview: 'Write data to your database tables. Supports insert, update, upsert, and delete operations.',
    inputs: ['data to write'],
    outputs: ['affected_rows', 'inserted_id'],
    example: `Table: orders
Operation: insert
Data: {
  "customer_id": "{{input.userId}}",
  "total": "{{input.cart.total}}",
  "status": "pending"
}

Creates new order record from workflow data.`,
    tips: ['Use upsert to update or insert', 'Match column required for updates', 'Data uses {{input.x}} for dynamic values'],
  },

  log_output: {
    overview: 'Log data for debugging and monitoring. View logs in the execution history. This is a terminal node â€” it cannot connect to further downstream nodes.',
    inputs: ['any data'],
    outputs: ['the resolved log message (string)'],
    example: `Message: "Processing order: {{input.orderId}}"
Level: info

Appears in execution logs:
[INFO] Processing order: 12345

Useful for debugging workflow flow.`,
    tips: ['Use different levels for filtering', 'This node is terminal â€” it does not forward data to further nodes', 'Check execution history for logs'],
  },

  llm_chain: {
    overview: 'Chain multiple AI prompts together where each step builds on the previous. Great for complex reasoning tasks.',
    inputs: ['initial text/data'],
    outputs: ['final_response', 'step_outputs'],
    example: `Steps: [
  {"prompt": "Summarize: {{input}}"},
  {"prompt": "Extract key points from: {{previous}}"},
  {"prompt": "Format as bullet list: {{previous}}"}
]

Each step uses output from previous step.`,
    tips: ['Use {{previous}} to reference last output', 'Build complex reasoning chains', 'Each step can use different prompts'],
  },

  csv: {
    overview: 'Parse CSV text into rows/items or generate CSV text from an array of objects.',
    inputs: ['operation', 'csv text or data array', 'delimiter', 'hasHeader for parse'],
    outputs: ['items/rows/headers for parse, csv for generate'],
    example: `Input CSV:
"name,email,age
John,john@test.com,30
Jane,jane@test.com,25"

Output items: [
  {name: "John", email: "john@test.com", age: "30"},
  {name: "Jane", email: "jane@test.com", age: "25"}
]`,
    tips: ['Set correct delimiter (comma, semicolon, tab, pipe)', 'Enable hasHeader for column names', 'Generate uses the same delimiter and quotes cells when needed', 'Empty or missing input never raises an error on either operation - Parse silently returns empty arrays and Generate silently returns an empty string'],
  },

  // Backward-compatibility alias for legacy workflows saved before canonical CSV migration.
  csv_processor: {
    overview: 'Parse and process CSV data. Converts CSV text to JSON array for further processing.',
    inputs: ['CSV text'],
    outputs: ['rows', 'headers', 'count'],
    example: `Input CSV:
"name,email,age
John,john@test.com,30
Jane,jane@test.com,25"

Output: [
  {name: "John", email: "john@test.com", age: "30"},
  {name: "Jane", email: "jane@test.com", age: "25"}
]`,
    tips: ['Set correct delimiter (comma, tab, etc)', 'Enable "has header" for column names', 'Output is JSON array'],
  },

  date_time: {
    overview: 'Create, format, offset, compare, and inspect date/time values with IANA timezone support: now, format, add, subtract, diff, convertTimezone, getTimezoneInfo.',
    inputs: ['operation', 'date', 'timezone', 'format', 'locale', 'customFormat', 'value', 'unit', 'endDate'],
    outputs: ['datetime', 'timestamp', 'diff', 'diffMs', 'unit', 'timezone', 'offset', 'longName', 'isoDate', '_error'],
    example: `Operation: add
Date: 2026-07-12T09:00:00Z
Value: 7
Unit: days

Output: { datetime: "2026-07-19T09:00:00.000Z" }

Operation: now
Timezone: UTC
Output: { datetime: "2026-07-12T09:00:00.000Z", timestamp: 1783855800000 }`,
    tips: [
      'Every operation except now reads the date field, defaulting to the current moment when left blank; an unparseable date fails immediately with a clear _error',
      'Use real IANA timezone identifiers (America/New_York, Asia/Kolkata) - abbreviations like EST or raw offsets are not accepted',
      'Add/Subtract support months and years as approximations (30/365 days); Diff does not support months or years at all and silently falls back to minutes for any unrecognized unit',
      'Custom format tokens (YYYY, MM, DD, HH, mm, ss) are each replaced only once - a repeated token in the same pattern is not fully substituted',
      'diff (endDate minus date) is negative when date is later than endDate, which is easy to misread as an error',
    ],
  },

  html: {
    overview: 'Parse HTML into title/meta/body, extract text from elements with a CSS selector, or convert body content to plain text.',
    inputs: ['operation', 'html', 'selector for extract'],
    outputs: ['title/meta/body for parse, results/count for extract, text for toText'],
    example: `Operation: extract
HTML: "<html><body><h1>Order Ready</h1><p class='price'>$42</p></body></html>"
Selector: ".price"

Output: {
  results: ["$42"],
  count: 1,
  success: true
}`,
    tips: ['Use parse for page title, meta tags, and body HTML', 'Use extract with a CSS selector for matching element text', 'Use toText to get body text without markup', 'A selector matching zero elements is not an error - it silently returns results: [] and count: 0, so always check count rather than assuming a match happened'],
  },

  math: {
    overview: 'Perform mathematical operations with precision control. Supports basic arithmetic, advanced functions, and array operations. Deterministic and precise calculations.',
    inputs: ['numeric values or arrays'],
    outputs: ['input object with result and operation'],
    example: `Operation: Add
Value 1: {{$json.price}}
Value 2: {{$json.tax}}
Precision: 2

Input: {price: 10.50, tax: 1.25}
Output: 11.75

Operation: Average
Value 1: 10,20,30,40,50
Output: 30

Operation: Power
Value 1: 2
Value 2: 8
Output: 256`,
    tips: ['Supports template expressions like {{$json.x}}', 'Use comma-separated values or arrays for min, max, avg, and sum', 'Set precision for decimal operations (0-20)', 'Supports: add, subtract, multiply, divide, modulo, power, sqrt, abs, round, floor, ceil, min, max, avg, sum', 'Non-numeric Value 1/Value 2 and invalid Precision are silently treated as 0/10 respectively - there is no numeric validation anywhere in this node', 'Minimum/Maximum on an empty list return Infinity/-Infinity, and Average on an empty list returns NaN, rather than an error'],
  },

  crypto: {
    overview: 'Perform secure cryptographic operations: hash data, encode/decode Base64, generate UUIDs, create random strings, and compute HMAC signatures.',
    inputs: ['data to process'],
    outputs: ['hashed_value', 'encoded_value', 'uuid', 'random_string', 'hmac_signature'],
    example: `Operation: Hash
Data: "Hello World"
Algorithm: SHA-256

Output: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"

Operation: Generate UUID v4
Output: "550e8400-e29b-41d4-a716-446655440000"

Operation: HMAC
Data: "message"
Secret Key: "secret"
Algorithm: SHA-256
Output: HMAC signature`,
    tips: ['SHA-256 is most commonly used', 'Keep secret keys secure for HMAC', 'UUID v4 generates random UUIDs', 'Random string length: 1-256 characters'],
  },

  slack_webhook: {
    overview: 'Send a simple Slack message through a saved Slack Incoming Webhook connection.',
    inputs: ['message'],
    outputs: ['id', 'status', 'provider', 'message'],
    example: `Message: "Workflow completed at {{input.timestamp}}"

Sends a simple text payload to the webhook channel.`,
    tips: [
      'Save the Incoming Webhook URL as a Connection',
      'The target channel is chosen when the webhook is created in Slack',
      'Use Slack Message for OAuth bot sending, dynamic channels, and Block Kit',
      'This node\'s output replaces $json entirely â€” fields from before this node do not survive past it, so capture anything needed later first',
      'Failures set status to "failed" and add a plain error field (no underscore), unlike most nodes\' _error convention',
    ],
  },
  google_doc: {
    overview: 'Read, overwrite (write), create, or append content in Google Docs. Read extracts plain text only; the Output Format "Markdown" option is currently a label and does not actually convert formatting.',
    inputs: ['operation', 'documentId (read only in this panel) or documentUrl (works for write/append)', 'title (for create)', 'content (for write/create/append)', 'format (for read)'],
    outputs: ['content, format, documentId (read)', 'success, documentId, content (write/append)', 'success, documentId, title, documentUrl, content (create)'],
    example: `Operation: Read
Document ID or URL: https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit
(You can paste the full URL or just the DOCUMENT_ID part)

Output: {
  content: "Full plain text extracted from the document...",
  format: "text",
  documentId: "1a2b3c4d5e6f7g8h9i0j"
}

Access the content in the next node using: {{$json.content}}

Operation: Create
Title: "New Report"
Content: "This is the document content..."

Output: {
  success: true,
  documentId: "new_doc_id",
  title: "New Report",
  documentUrl: "https://docs.google.com/document/d/new_doc_id/edit",
  content: "This is the document content..."
}

Operation: Append
Document Url: https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit
Content: "New content added at the end"

Output: {
  success: true,
  documentId: "1a2b3c4d5e6f7g8h9i0j",
  content: "New content added at the end"
}`,
    tips: [
      'Get Document ID from the Google Docs URL: https://docs.google.com/document/d/DOCUMENT_ID/edit â€” you can paste the full Document URL, or just the DOCUMENT_ID into Document ID',
      'Read only extracts plain text â€” there is no table/list structure in the output, and choosing Markdown does not convert formatting',
      'Write deletes ALL existing content before inserting the new text â€” use Append to add without removing what is already there',
      'Create makes a brand-new document and returns documentUrl to share it',
      'Always connect a Google account first via Connections',
      'For read/write/append, ensure the connected Google account has access to the target document',
    ],
  },

  google_drive: {
    overview: 'List, upload, or download files in Google Drive. The Delete option is shown in the dropdown but is not implemented by the runtime executor â€” selecting it always fails.',
    inputs: ['operation', 'folderId (for list/upload)', 'fileId (for download)', 'fileName and fileData (for upload)', 'mimeType (optional for upload)'],
    outputs: ['files array (list)', 'id/fileId and webViewLink (upload)', 'id/fileId and dataBase64 or content (download)'],
    example: `Operation: List Files
Folder ID: (leave empty for whole Drive)

Output: {
  files: [
    {id: "file1", name: "document.pdf", mimeType: "application/pdf"},
    {id: "file2", name: "image.jpg", mimeType: "image/jpeg"}
  ]
}

Operation: Upload File
File Name: "report.pdf"
File Data: [Base64 encoded content]

Output: {
  id: "uploaded_file_id",
  name: "report.pdf",
  webViewLink: "https://drive.google.com/file/d/.../view"
}`,
    tips: [
      'Leave Folder ID empty to list/upload across the whole Drive, not just the root',
      'File IDs are in the URL: /file/d/FILE_ID/view',
      'Upload requires base64, plain text, or a data URL for File Data',
      'Download returns dataBase64 for binary files (PDFs, images), or content for text/JSON files',
      'Delete is not implemented â€” it always fails with "Unsupported Google Drive operation: delete"',
    ],
  },

  gmail_trigger: {
    overview: 'Start a workflow when Gmail reports a watched mailbox change through Google Cloud Pub/Sub. CtrlChecks registers Gmail users.watch for the connected Google account, validates each Pub/Sub push request, reads Gmail history from the saved historyId, and emits normalized message or label events.',
    inputs: ['pubsubTopic full projects/PROJECT/topics/TOPIC path', 'eventTypes: message_added, label_added, label_removed, or message_deleted', 'labelIds filter such as INBOX or IMPORTANT', 'query keyword filter against subject, sender, and snippet', 'validateAuth, audience, and validationSecret for Pub/Sub push security', 'Google OAuth2 connection with gmail.readonly access'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'emailAddress', 'historyId', 'messageId', 'threadId', 'subject', 'from', 'to', 'snippet', 'labelIds', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_gmail'],
    example: `Pub/Sub Topic: projects/acme-support/topics/gmail-inbox-notifications
Event Types: message_added
Label IDs: INBOX, IMPORTANT
Keyword Filter: invoice
Validate Push Auth: enabled

When a new matching email arrives after activation, the workflow receives {{$json.subject}}, {{$json.from}}, {{$json.snippet}}, {{$json.threadId}}, and {{$json.eventType}}.`,
    tips: [
      'Create the Pub/Sub topic yourself, then grant Pub/Sub Publisher to gmail-api-push@system.gserviceaccount.com',
      'Create a Pub/Sub push subscription whose endpoint is the generated CtrlChecks webhook URL',
      'Keep Validate Push Auth enabled in production; use Google-signed OIDC or a shared Validation Secret for controlled simulations',
      'Leave OIDC Audience empty unless your Pub/Sub subscription uses a custom audience; the default is the webhook URL',
      'Label IDs must be Gmail API label IDs such as INBOX or IMPORTANT, not always the visible custom label name',
      'Keyword Filter is a simple case-insensitive contains check against subject, sender, and snippet, not Gmail search syntax',
      'Existing messages are not replayed: registration stores a Gmail historyId baseline and future pushes read changes after that point',
      'Use {{$json.threadId}} with the Google Gmail action node when replying in the same conversation',
    ],
  },

  google_drive_trigger: {
    overview: 'Start a workflow when Google Drive reports that files changed. CtrlChecks registers a Drive push notification channel automatically, validates channel notifications, and then syncs changed file metadata from the Drive changes feed.',
    inputs: ['folderId (optional)', 'eventTypes: file_changed and/or file_deleted', 'query keyword filter (optional)', 'Google OAuth2 connection with drive.readonly access'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'fileId', 'name', 'mimeType', 'parents', 'modifiedTime', 'webViewLink', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_googleDrive'],
    example: `Folder ID: 1a2b3c4d5e6f7g8h9i0j
Event Types: file_changed
Keyword Filter: invoice

When a matching file is created or updated after activation, the workflow receives {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.webViewLink}}, and {{$json.eventType}}.`,
    tips: [
      'Leave Folder ID empty to consider broad Drive changes, or copy a folder ID from the URL after /folders/',
      'Activation stores a fresh start page token, so old Drive changes do not replay',
      'Google sends an initial sync notification when the channel is created; that handshake does not start the workflow',
      'file_changed covers created, edited, or metadata-changed files; file_deleted covers removed or trashed files',
      'Keyword Filter checks the file name only, not the file contents',
      'Connect downstream service accounts separately; this Google OAuth2 connection only authorizes Drive watch and sync',
    ],
  },

  google_calendar_trigger: {
    overview: 'Start a workflow when Google Calendar reports that a watched calendar changed. CtrlChecks registers the push notification channel automatically, validates channel notifications, and then syncs the changed events.',
    inputs: ['calendarId (default primary)', 'eventTypes: event_changed and/or event_cancelled', 'query keyword filter (optional)', 'Google OAuth2 connection with calendar.events access'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'calendarId', 'eventIdRaw', 'subject', 'organizer', 'start', 'end', 'attendees', 'htmlLink', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_googleCalendar'],
    example: `Calendar ID: primary
Event Types: event_changed, event_cancelled
Keyword Filter: renewal

When a matching event is created, updated, or cancelled after activation, the workflow receives {{$json.subject}}, {{$json.start}}, {{$json.organizer}}, {{$json.attendees}}, and {{$json.eventType}}.`,
    tips: [
      'Use primary for the connected account main calendar, or copy a shared Calendar ID from Google Calendar settings',
      'Google sends an initial sync notification when the channel is created; that handshake does not start the workflow',
      'event_changed covers created and updated events; event_cancelled covers events with cancelled status',
      'Keyword Filter matches event title plus description, not attendee names or a Calendar search query',
      'Watch channels last roughly 7 days and CtrlChecks renews them on a background sweep',
      'Connect downstream service accounts separately; this Google OAuth2 connection only authorizes Calendar watch and sync',
    ],
  },

  google_calendar: {
    overview: 'Create, list, update, or delete Google Calendar events. Manage your calendar programmatically. Runtime also supports get, quickAdd, and move for events, plus non-event resources, when set directly in workflow JSON.',
    inputs: ['operation', 'calendarId', 'eventId (for update/delete)', 'summary', 'startTime', 'endTime', 'description'],
    outputs: ['items array (list)', 'id and htmlLink (create/update/get)', 'success (delete)'],
    example: `Operation: Create Event
Calendar ID: primary
Event Title: "Team Meeting"
Start Time: 2024-01-15T14:00:00Z
End Time: 2024-01-15T15:00:00Z
Description: "Weekly sync"

Output: {
  id: "event_id",
  summary: "Team Meeting",
  htmlLink: "https://calendar.google.com/event?eid=..."
}`,
    tips: [
      'Use "primary" for main calendar',
      'Times must be ISO 8601 format (UTC) â€” Start Time/End Time are converted automatically',
      'The new/updated event ID is returned as id, not eventId',
      'List returns events in the Time Min/Time Max window, with no date filtering by default',
    ],
  },

  google_gmail: {
    overview: 'Send, list, get, or search Gmail messages. Send recipients can be typed manually or extracted from upstream/fallback Google Sheets rows.',
    inputs: ['recipientSource, recipientEmails, subject, body (for send)', 'cc, bcc, from, spreadsheetId/sheetName/range fallback (optional for send)', 'messageId (for get)', 'query and maxResults (for list/search)'],
    outputs: ['success, messageId, sentCount, failedCount, results (send)', 'messages array of {id, threadId} (list/search)', 'full raw message object (get)'],
    example: `Operation: Send Email
Recipient Emails: recipient@example.com
Subject: "Workflow Notification"
Body: "Your workflow completed successfully!"

Output: {
  success: true,
  messageId: "18abc123def456",
  sentCount: 1,
  failedCount: 0
}

Operation: Search Messages
Search Query: from:example@gmail.com
Max Results: 10

Output: {
  messages: [{id: "18abc1", threadId: "18abc1"}, {id: "18abc2", threadId: "18abc2"}],
  resultSizeEstimate: 2
}`,
    tips: [
      'Connect Google OAuth in Connections; do not paste tokens into workflow fields',
      'Gmail search syntax: from:, subject:, is:unread, has:attachment',
      'List/Search only return {id, threadId} per message â€” use a Get step with that id for full content',
      'Body is plain text only',
      'Get returns Gmail\'s raw API message; the body text is base64url-encoded inside message.payload.body.data',
      'Use search to filter messages before getting details',
    ],
  },

  google_tasks: {
    overview: 'Create, read, update, or delete Google Tasks, including marking tasks complete via Status. Manage your task list programmatically.',
    inputs: ['operation', 'taskListId', 'taskId (for read-one/update/delete)', 'title', 'notes', 'due', 'status (update only)'],
    outputs: ['data.items or data (single task) for read', 'data (task object) for create/update', 'data.deleted, data.taskId for delete'],
    example: `Operation: Create Task
Task List ID: @default
Task Title: "Review proposal"
Notes: "Check budget and timeline"
Due Date: 2026-12-31

Output: {
  operation: "create",
  data: {
    id: "task_id",
    title: "Review proposal",
    status: "needsAction"
  }
}`,
    tips: [
      'Use "@default" for the default task list',
      'Task IDs are returned at {{$json.data.id}} when creating tasks â€” everything is nested under data, not top-level',
      'Due dates are selected as local calendar dates; Google Tasks stores the day, not a time of day',
      'Set Status to Completed on Update to check a task off; Google Tasks records the completion time automatically',
      'Completed tasks may be hidden from a plain listing depending on Google Tasks defaults',
    ],
  },

  google_contacts: {
    overview: 'List, create, update, or delete Google Contacts.',
    inputs: ['operation', 'contactId (for list-one/update/delete)', 'name', 'email', 'phone', 'pageSize (for listing)'],
    outputs: ['data.connections (list, Contact ID empty)', 'data.resourceName, data.names, data.emailAddresses, data.phoneNumbers (list-one/create/update)', 'data.deleted, data.contactId (delete)'],
    example: `Operation: Create Contact
Name: "John Doe"
Email: john@example.com
Phone: +1234567890

Output: {
  operation: "create",
  data: {
    resourceName: "people/c1234567890",
    names: [{ displayName: "John Doe" }],
    emailAddresses: [{ value: "john@example.com" }]
  }
}`,
    tips: [
      'Contact ID is the resourceName field (e.g., people/c1234567890) from a previous List/Create/Update result',
      'At least one of Name, Email, or Phone is required for create and update',
      'Phone should include a country code (e.g., +1234567890)',
      'All contact fields are nested under data â€” there is no top-level resourceName/names/emailAddresses',
      'List Contacts with Contact ID empty returns every contact in data.connections; filling Contact ID fetches just that one contact instead',
      'Max Results (pageSize) only limits how many contacts a full listing returns â€” it does not filter or search',
    ],
  },

  // ============================================
  // AUTHENTICATION & IDENTITY NODES
  // ============================================
  oauth2: {
    overview: 'OAuth2 authentication and token management. Get access tokens, refresh tokens, validate tokens, and revoke access.',
    inputs: ['clientId', 'clientSecret', 'tokenUrl', 'code (for authorization_code)', 'refreshToken (for refresh)'],
    outputs: ['access_token', 'refresh_token', 'expires_in', 'token_type'],
    example: `Operation: Get Access Token
Grant Type: Authorization Code
Client ID: your-client-id
Client Secret: your-client-secret
Token URL: https://api.example.com/oauth/token
Code: authorization-code-from-callback

Output: {
  access_token: "eyJhbGci...",
  refresh_token: "def502...",
  expires_in: 3600,
  token_type: "Bearer"
}`,
    tips: [
      'Use authorization_code for user authorization flows',
      'Use client_credentials for server-to-server',
      'Store refresh tokens securely for token renewal',
      'Token URL is usually: https://provider.com/oauth/token',
    ],
  },

  auth0: {
    overview: 'Auth0 identity and access management. Manage users, get tokens, and perform identity operations.',
    inputs: ['domain', 'clientId', 'clientSecret', 'userId (for user ops)', 'userData (for create/update)'],
    outputs: ['user object', 'users array', 'access_token (get_token)', 'success status'],
    example: `Operation: Get User
Domain: dev-abc123.us.auth0.com
Client ID: your-client-id
Client Secret: your-client-secret
User ID: auth0|123456

Output: {
  user_id: "auth0|123456",
  email: "user@example.com",
  name: "John Doe",
  created_at: "2024-01-15T10:00:00Z"
}`,
    tips: [
      'Get credentials from Auth0 Dashboard â†’ Applications',
      'User ID format: "auth0|123456" or "google-oauth2|123456"',
      'Use Management API for user operations',
      'Get token operation uses client credentials grant',
    ],
  },

  // ============================================
  // PAYMENT & FINANCE NODES
  // ============================================
  stripe: {
    overview: 'Stripe payment processing via runtime-supported operations: paymentintent/charge/payment, refund, create_customer, get_payment_intent, list_payment_intents, create_subscription, and create_invoice.',
    inputs: ['operation', 'apiKey', 'amount', 'currency', 'paymentMethodId', 'customerId', 'paymentIntentId', 'priceId'],
    outputs: ['success', 'paymentIntent', 'charge', 'customer', 'refund', 'items', 'stripe', 'subscription', 'invoice', '_error', '_errorDetails'],
    example: `Operation: paymentintent
API Key: sk_test_...
Amount: 1000 (cents)
Currency: usd

Output: {
  success: true,
  paymentIntent: {
    id: "pi_1234567890",
    amount: 1000,
    currency: "usd",
    status: "requires_payment_method"
  }
}`,
    tips: [
      'Amount is in smallest currency unit (cents for USD)',
      'Use test keys (sk_test_) for development',
      'The visible aliases create_payment, create_payment_intent, get_payment, list_payments, and create_refund are not translated by the runtime today',
      'Metadata is not sent as Stripe metadata; create_subscription only reads it as a fallback priceId string',
    ],
  },

  razorpay: {
    overview: 'Razorpay payment gateway. Create orders, process payments, handle refunds, and manage customers.',
    inputs: ['keyId', 'keySecret', 'amount', 'currency', 'orderId', 'paymentId'],
    outputs: ['order', 'payment', 'refund', 'customer'],
    example: `Operation: Create Order
Key ID: rzp_test_...
Key Secret: your-key-secret
Amount: 10000 (paise)
Currency: INR

Output: {
  id: "order_1234567890",
  amount: 10000,
  currency: "INR",
  status: "created",
  created_at: 1642234567
}`,
    tips: [
      'Amount is in smallest currency unit (paise for INR)',
      'Use test keys (rzp_test_) for development',
      'Order must be created before payment',
      'Payment ID format: pay_...',
    ],
  },

  paypal: {
    overview: 'PayPal creates Checkout orders and refunds captures. Runtime-supported values are charge/createorder/order and refund; current visual operation aliases are not translated.',
    inputs: ['operation', 'accessToken', 'environment', 'amount', 'currency', 'description', 'paymentId', 'autoCapture'],
    outputs: ['success', 'order', 'refund', '_error', '_errorDetails'],
    example: `Operation: charge
Environment: sandbox
Amount: 10.00
Currency: USD

Output: {
  success: true,
  order: {
    id: "5O190127TN364715T",
    status: "CREATED",
    links: [{ rel: "approve", href: "https://www.paypal.com/checkoutnow?token=5O190127TN364715T" }]
  }
}`,
    tips: [
      'Use Connections/credential vault for PayPal OAuth; clientId and clientSecret fields are visible but not read by the runtime',
      'The node creates an order and returns approval links; it does not implement capture_order today',
      'Refund needs paymentId as a PayPal capture ID, not an order ID',
      'Visible values create_order, get_order, capture_order, create_refund, and get_access_token currently fail as unsupported',
    ],
  },

  // ============================================
  // E-COMMERCE NODES
  // ============================================
  shopify: {
    overview: 'Shopify Admin API operations. Runtime expects resource plus generic operation values get/list/create/update/delete; current product/order/customer operation aliases are not translated.',
    inputs: ['resource', 'operation', 'shopDomain', 'apiKey', 'id', 'productId', 'orderId', 'customerId', 'data', 'limit'],
    outputs: ['success', 'item', 'items', 'deleted', 'id', '_error', '_errorDetails'],
    example: `Resource: product
Operation: get
Shop Domain: mystore.myshopify.com
Product ID: 123456789

Output: {
  success: true,
  item: { product: { id: 123456789, title: "Product Name" } }
}`,
    tips: [
      'Get access token from Shopify Admin â†’ Settings â†’ Apps â†’ Develop apps',
      'Shop domain format: your-shop.myshopify.com',
      'Use operation get/list/create/update/delete with resource product/order/customer; aliases like get_product currently fail',
      'Get with no ID behaves like list in the current runtime',
    ],
  },

  woocommerce: {
    overview: 'WooCommerce REST API operations. Runtime expects resource plus generic operation values and reads apiKey/apiSecret plus generic id.',
    inputs: ['resource', 'operation', 'storeUrl', 'apiKey', 'apiSecret', 'id', 'data', 'perPage'],
    outputs: ['success', 'item', 'items', 'deleted', '_error', '_errorDetails'],
    example: `Resource: product
Operation: get
Store URL: https://yourstore.com
ID: 123

Output: {
  success: true,
  item: { id: 123, name: "Product Name", price: "29.99" }
}`,
    tips: [
      'Get API keys from WooCommerce â†’ Settings â†’ Advanced â†’ REST API',
      'Store URL without trailing slash',
      'Visible consumerKey/consumerSecret and productId/orderId/customerId fields are not read directly by the executor today',
      'Use generic id for get/update/delete until the panel is aligned',
    ],
  },

  chargebee: {
    overview: 'Chargebee billing operations for creating customers, creating subscriptions, retrieving customers, and cancelling subscriptions.',
    inputs: ['operation', 'apiKey', 'site', 'customerId', 'email', 'planId', 'subscriptionId'],
    outputs: ['success', 'operation', 'customer', 'customerId', 'subscription', 'subscriptionId', 'error'],
    example: `Operation: create_customer
Site: acme
Email: buyer@example.com

Output: {
  success: true,
  operation: "create_customer",
  customerId: "cust_abc123",
  customer: { id: "cust_abc123", email: "buyer@example.com" }
}`,
    tips: [
      'Site is only the subdomain, such as acme for acme.chargebee.com',
      'API key is used as the HTTP Basic Auth username; store it in Connections/credential vault when possible',
      'Failures return success:false and a plain error field, not _error',
      'Get Customer needs customerId even though the current panel visibility mainly highlights it for Create Subscription',
    ],
  },

  magento: {
    overview: 'Magento e-commerce operations. Manage products, orders, and store data via REST API.',
    inputs: ['storeUrl', 'accessToken', 'productId (SKU)', 'orderId', 'searchCriteria'],
    outputs: ['product', 'products array', 'order', 'orders array'],
    example: `Operation: Get Product
Store URL: https://yourstore.com
Access Token: your-access-token
Product ID (SKU): PRODUCT-SKU

Output: {
  sku: "PRODUCT-SKU",
  name: "Product Name",
  price: 29.99,
  status: 1,
  type_id: "simple"
}`,
    tips: [
      'Get access token from Magento Admin â†’ System â†’ Integrations',
      'Product ID is the SKU (string)',
      'Order ID is numeric',
      'Use searchCriteria for filtering list operations',
    ],
  },

  bigcommerce: {
    overview: 'BigCommerce store operations. Manage products, orders, customers, and store data.',
    inputs: ['storeHash', 'accessToken', 'productId', 'orderId', 'customerId'],
    outputs: ['product', 'products array', 'order', 'orders array', 'customer'],
    example: `Operation: Get Product
Store Hash: your-store-hash
Access Token: your-access-token
Product ID: 123

Output: {
  data: {
    id: 123,
    name: "Product Name",
    sku: "PRODUCT-SKU",
    price: "29.99",
    inventory_level: 100
  }
}`,
    tips: [
      'Get credentials from BigCommerce â†’ Advanced Settings â†’ API Accounts',
      'Store hash is in API URL: /stores/{storeHash}/v3',
      'Product/Order IDs are numeric',
      'API uses v3 endpoint',
    ],
  },

  // ============================================
  // ANALYTICS & DATA TOOLS NODES
  // ============================================
  google_analytics: {
    overview: 'Google Analytics data and reporting. Get reports, track events, and analyze user behavior.',
    inputs: ['accessToken', 'propertyId', 'dateRanges', 'dimensions', 'metrics', 'eventName'],
    outputs: ['report data', 'properties array', 'success status'],
    example: `Operation: Get Report
Access Token: your-access-token
Property ID: properties/123456789
Date Ranges: [{"startDate": "2024-01-01", "endDate": "2024-01-31"}]
Dimensions: ["date", "country"]
Metrics: ["activeUsers", "sessions"]

Output: {
  rows: [{
    dimensionValues: [{value: "20240101"}, {value: "US"}],
    metricValues: [{value: "1000"}, {value: "1500"}]
  }]
}`,
    tips: [
      'Get access token via OAuth2 or Service Account',
      'Property ID format: properties/123456789',
      'Use GA4 Data API for reports',
      'Measurement Protocol for event tracking',
    ],
  },

  mixpanel: {
    overview: 'Mixpanel analytics and event tracking. Track events, identify users, and query insights.',
    inputs: ['projectToken', 'apiSecret (for queries)', 'eventName', 'distinctId', 'properties'],
    outputs: ['success status', 'insights data'],
    example: `Operation: Track Event
Project Token: your-project-token
Event Name: Button Clicked
Distinct ID: user-123
Properties: {"button": "signup", "page": "home"}

Output: {
  status: 1,
  error: null
}`,
    tips: [
      'Get project token from Mixpanel â†’ Project Settings',
      'API secret needed for query operations',
      'Distinct ID identifies the user',
      'Properties are custom event data',
    ],
  },

  segment: {
    overview: 'Segment analytics and data routing. Track events, identify users, track page views, and group users.',
    inputs: ['writeKey', 'userId', 'event', 'properties', 'traits'],
    outputs: ['success status'],
    example: `Operation: Track
Write Key: your-write-key
User ID: user-123
Event: Button Clicked
Properties: {"button": "signup", "page": "home"}

Output: {
  success: true
}`,
    tips: [
      'Get write key from Segment â†’ Settings â†’ API Keys',
      'User ID identifies the user across events',
      'Traits are user properties (for identify)',
      'Segment routes data to your connected destinations',
    ],
  },

  amplitude: {
    overview: 'Amplitude product analytics. Track events, identify users, and analyze product usage.',
    inputs: ['apiKey', 'secretKey (for get_event)', 'userId', 'eventType', 'eventProperties'],
    outputs: ['success status', 'event data'],
    example: `Operation: Track Event
API Key: your-api-key
User ID: user-123
Event Type: Button Clicked
Event Properties: {"button": "signup", "page": "home"}

Output: {
  code: 200,
  events_ingested: 1
}`,
    tips: [
      'Get API key from Amplitude â†’ Settings â†’ Projects',
      'Secret key needed for get_event operation',
      'Event type is the event name',
      'Event properties are custom data',
    ],
  },

  elasticsearch: {
    overview: 'Elasticsearch search and analytics. Search documents, index data, update records, and perform bulk operations.',
    inputs: ['nodeUrl', 'username/password (optional)', 'index', 'query', 'documentId', 'document'],
    outputs: ['search results', 'document', 'success status'],
    example: `Operation: Search
Node URL: https://localhost:9200
Index: my-index
Query: {"query": {"match": {"field": "value"}}}

Output: {
  hits: {
    total: {value: 10},
    hits: [{
      _id: "1",
      _source: {field: "value"}
    }]
  }
}`,
    tips: [
      'Node URL is your Elasticsearch cluster URL',
      'Index is the index name',
      'Query uses Elasticsearch Query DSL',
      'Bulk operations use NDJSON format',
    ],
  },

  // ============================================
  // MISSING TRIGGER NODES
  // ============================================
  form: {
    overview: 'Creates a public CtrlChecks form that starts the workflow when someone submits structured answers. Use it for lead capture, support intake, employee requests, surveys, applications, registrations, and feedback.',
    inputs: ['formTitle and at least one field', 'field labels, internal names, field types, required settings, placeholders, and options', 'submit button text, success message, optional redirect URL', 'allowMultipleSubmissions, requireAuthentication, and captcha behavior'],
    outputs: ['answers at top level by internal name, such as customer_email', 'data object with the same submitted answers', 'submitted_at timestamp', 'form title and id', 'files for upload fields', 'meta with submittedAt, masked IP, and userAgent'],
    example: `Form Fields:
- Name (text, required, internal name: name)
- Customer Email (email, required, internal name: customer_email)
- Issue Category (select, required, options: billing, technical, sales)
- Message (textarea, required, internal name: message)

User submits form with:
{
  "name": "Alex Morgan",
  "customer_email": "alex@example.com",
  "issue_category": "billing",
  "message": "Invoice INV-4821 has the wrong address."
}

Output: {
  name: "Alex Morgan",
  customer_email: "alex@example.com",
  issue_category: "billing",
  message: "Invoice INV-4821 has the wrong address.",
  data: { customer_email: "alex@example.com", issue_category: "billing" },
  submitted_at: "2026-07-18T08:45:00.000Z",
  form: { title: "Support Request", id: "form_node_1" }
}

Connect: Form -> If/Else -> Helpdesk Ticket -> Email Confirmation`,
    tips: [
      'Use friendly labels for submitters and stable internal names for workflow mapping.',
      'Map answers with {{$json.customer_email}} or {{$json.data.customer_email}} after checking a test execution.',
      'Use select or radio options for values that drive routing, approvals, reporting, or branch conditions.',
      'Turn CAPTCHA on for public forms that can create tickets, leads, or notifications.',
      'Require authentication only for internal or sensitive forms.',
      'Changing an internal name after downstream nodes are mapped requires updating those mappings too.',
    ],
  },
  // ============================================
  // MISSING LOGIC & CONTROL NODES
  // ============================================
  human_approval: {
    overview: 'Pauses workflow execution until a human approves or rejects the request. Sends approval requests to specified approvers via email or notification. Supports single or multiple approval modes (all approvers must approve vs. any approver can approve). Perfect for compliance, quality control, or authorization workflows.',
    inputs: ['any data to include in approval request'],
    outputs: ['approved', 'rejected', 'approval_data', 'approver', 'approved_at', 'timeout'],
    example: `Approvers: ["manager@example.com", "admin@example.com"]
Approval Type: Multiple (all must approve)
Timeout: 3600 seconds (1 hour)
Default Action: Reject

Workflow flow:
1. Human Approval node executes
2. Approval emails sent to approvers
3. Workflow pauses, waiting for approvals
4. All approvers approve â†’ Workflow continues with "approved" branch
5. Any approver rejects or timeout â†’ Workflow continues with "rejected" branch

Output (approved): {
  approved: true,
  approver: "manager@example.com",
  approved_at: "2024-01-15T10:30:00Z",
  approval_data: {...}
}

Output (rejected/timeout): {
  approved: false,
  reason: "timeout" or "rejected",
  approved_at: null
}`,
    tips: [
      'Use single approval for faster processing',
      'Use multiple approvals for critical decisions',
      'Set appropriate timeout (default 1 hour)',
      'Choose default action for timeout scenarios',
      'Approval emails include workflow context',
      'Approvers can approve/reject via email or dashboard',
      'Approval status is tracked and logged',
    ],
  },

  escalation_router: {
    overview: 'Routes workflow execution based on severity levels (low, medium, high, critical). Assigns different handlers or workflows for each severity level. Useful for incident management, alert routing, or priority-based processing.',
    inputs: ['severity', 'item_data', 'routing_rules'],
    outputs: ['routed_to', 'severity', 'handler_id'],
    example: `Severity: "high"
Routing Rules: {
  "low": "handler_low",
  "medium": "handler_medium",
  "high": "handler_urgent",
  "critical": "handler_critical"
}

Input: {
  severity: "high",
  issue: "Server error rate > 5%",
  timestamp: "2024-01-15T10:30:00Z"
}

Output: {
  routed_to: "handler_urgent",
  severity: "high",
  handler_id: "handler_urgent"
}

Routes to urgent handler for immediate response.`,
    tips: [
      'Define routing rules for each severity level',
      'Use severity levels to prioritize handling',
      'Each severity routes to different handler/node',
      'Critical and High should route to priority handlers',
      'Low and Medium can route to standard handlers',
      'Severity must match one of the defined levels',
    ],
  },

  fallback_router: {
    overview: 'Provides fallback routing when primary path fails. Tries primary handler first, then falls back to alternative handlers in sequence if failures occur. Useful for high availability, backup systems, or graceful degradation.',
    inputs: ['any data', 'fallback_paths'],
    outputs: ['successful_path', 'fallback_used', 'attempts'],
    example: `Fallback Paths: ["primary_handler", "backup_handler", "default_handler"]

Execution flow:
1. Try primary_handler
2. If fails â†’ Try backup_handler
3. If fails â†’ Try default_handler
4. If all fail â†’ Error

Output (primary succeeds): {
  successful_path: "primary_handler",
  fallback_used: false,
  attempts: 1
}

Output (backup succeeds): {
  successful_path: "backup_handler",
  fallback_used: true,
  attempts: 2
}`,
    tips: [
      'Order fallback paths by priority',
      'Use for high availability scenarios',
      'Each path is tried in sequence',
      'Stops at first successful path',
      'Logs all attempts for debugging',
      'Useful for backup systems or load balancing',
    ],
  },

  retry_with_backoff: {
    overview: 'Implements exponential backoff retry strategy. Retries failed operations with increasing delays (1s, 2s, 4s, 8s, etc.). Prevents overwhelming services while giving transient failures time to recover. Perfect for API calls, database operations, or network requests.',
    inputs: ['any data from previous node'],
    outputs: ['result', 'attempts', 'total_delay', 'success'],
    example: `Max Retries: 5
Initial Delay: 1000ms (1 second)
Backoff Multiplier: 2

Retry sequence:
- Attempt 1: Immediate
- Attempt 2: Wait 1s (1000ms)
- Attempt 3: Wait 2s (2000ms)
- Attempt 4: Wait 4s (4000ms)
- Attempt 5: Wait 8s (8000ms)
- If all fail â†’ Error

Output (success on attempt 3): {
  result: {...},
  attempts: 3,
  total_delay: 3000,
  success: true
}`,
    tips: [
      'Exponential backoff prevents overwhelming services',
      'Initial delay Ã— multiplier^attempt = delay for each retry',
      'Use for transient failures (network, rate limits)',
      'Increase max retries for critical operations',
      'Adjust multiplier based on service recovery time',
      'Total delay increases exponentially: 1s, 2s, 4s, 8s, 16s...',
    ],
  },

  timeout_guard: {
    overview: 'Enforces maximum execution time for workflow or node execution. Terminates execution if timeout is exceeded. Prevents infinite loops, hanging operations, or resource exhaustion. Useful for protecting against slow APIs, long-running processes, or runaway workflows.',
    inputs: ['any data'],
    outputs: ['result', 'timeout_exceeded', 'execution_time'],
    example: `Timeout: 30000ms (30 seconds)

Execution:
1. Start timer
2. Execute connected node
3. If completes within timeout â†’ Continue
4. If exceeds timeout â†’ Terminate with error

Output (within timeout): {
  result: {...},
  timeout_exceeded: false,
  execution_time: 15000
}

Output (exceeded): {
  result: null,
  timeout_exceeded: true,
  execution_time: 30000,
  error: "Execution timeout exceeded"
}`,
    tips: [
      'Set timeout based on expected execution time',
      'Use for slow APIs or long-running operations',
      'Prevents infinite loops or hanging processes',
      'Timeout is in milliseconds',
      'Common timeouts: 5s (fast), 30s (normal), 60s (slow)',
      'Increase for complex operations, decrease for quick checks',
    ],
  },

  circuit_breaker: {
    overview: 'Implements circuit breaker pattern to protect against cascading failures. Opens circuit after threshold failures, preventing further requests to failing service. Circuit closes after cooldown period. Essential for resilience and preventing service overload.',
    inputs: ['service_name', 'operation_data'],
    outputs: ['result', 'circuit_state', 'failures_count', 'circuit_opened'],
    example: `Service Name: "api_service"
Failure Threshold: 5 failures
Cooldown Period: 60000ms (1 minute)

Behavior:
1. Normal: Circuit closed, requests pass through
2. After 5 failures: Circuit opens, requests blocked
3. After 1 minute cooldown: Circuit closes, allows 1 test request
4. If test succeeds: Circuit stays closed
5. If test fails: Circuit reopens

Output (circuit closed): {
  result: {...},
  circuit_state: "closed",
  failures_count: 0
}

Output (circuit opened): {
  result: null,
  circuit_state: "open",
  failures_count: 5,
  circuit_opened: true,
  error: "Circuit breaker is open"
}`,
    tips: [
      'Circuit breaker prevents cascading failures',
      'Opens after failure threshold is reached',
      'Cooldown period allows service to recover',
      'Test request validates service health',
      'Use for external APIs or unreliable services',
      'Failure threshold: 3-10 depending on service',
      'Cooldown: 30s-5min depending on recovery time',
    ],
  },

  workflow_state_manager: {
    overview: 'Manages workflow state and persistence. Stores workflow data, retrieves previous state, or resets state. Enables stateful workflows, resumable executions, or data persistence across workflow runs. Useful for long-running processes or stateful automation.',
    inputs: ['state_data', 'operation'],
    outputs: ['state', 'retrieved_data', 'success'],
    example: `Operation: Store State
State Key: "order_processing"
State Data: {
  "orderId": 123,
  "step": "payment_processing",
  "progress": 50
}

Operation: Retrieve State
State Key: "order_processing"

Output: {
  state: {
    "orderId": 123,
    "step": "payment_processing",
    "progress": 50,
    "updated_at": "2024-01-15T10:30:00Z"
  },
  retrieved_data: {...}
}

Useful for resuming interrupted workflows.`,
    tips: [
      'Store state for resumable workflows',
      'State persists across workflow executions',
      'Use unique state keys per workflow instance',
      'Retrieve state to resume from last step',
      'Clear state when workflow completes',
      'State is scoped to workflow instance',
      'Useful for long-running processes',
    ],
  },

  execution_context_store: {
    overview: 'Stores execution context and metadata for workflow runs. Preserves context across nodes, tracks execution history, or maintains workflow-wide variables. Useful for debugging, audit trails, or context passing.',
    inputs: ['context_data', 'execution_id'],
    outputs: ['context', 'stored_at', 'execution_id'],
    example: `Context Data: {
  "user_id": "user_123",
  "session_id": "session_abc",
  "workflow_run": "run_xyz",
  "metadata": {"source": "webhook"}
}

Stores context for entire workflow execution.
All nodes can access this context.

Output: {
  context: {...},
  stored_at: "2024-01-15T10:30:00Z",
  execution_id: "exec_123"
}`,
    tips: [
      'Context persists for entire workflow execution',
      'All nodes can access stored context',
      'Useful for audit trails and debugging',
      'Store user/session/workflow metadata',
      'Context is cleared after workflow completes',
      'Execution ID links context to workflow run',
    ],
  },

  session_manager: {
    overview: 'Manages user sessions with TTL (Time To Live). Creates, validates, and terminates sessions. Useful for authentication, state management, or temporary data storage with expiration.',
    inputs: ['session_id', 'action', 'ttl'],
    outputs: ['session_id', 'valid', 'expires_at', 'session_data'],
    example: `Action: Create Session
TTL: 3600 seconds (1 hour)

Output: {
  session_id: "session_abc123",
  valid: true,
  expires_at: "2024-01-15T11:30:00Z",
  session_data: {}
}

Action: Validate Session
Session ID: "session_abc123"

Output (valid): {
  session_id: "session_abc123",
  valid: true,
  expires_at: "2024-01-15T11:30:00Z"
}

Output (expired): {
  session_id: "session_abc123",
  valid: false,
  error: "Session expired"
}`,
    tips: [
      'Create session with TTL for expiration',
      'Validate session before accessing protected resources',
      'TTL is in seconds (3600 = 1 hour)',
      'Terminate session for logout',
      'Session ID is auto-generated for create',
      'Useful for user authentication workflows',
      'Sessions expire automatically after TTL',
    ],
  },

  // ============================================
  // MISSING DATA MANIPULATION NODES
  // ============================================
  rename_keys: {
    overview: 'Renames object keys while preserving values. Maps old key names to new key names. Useful for data normalization, API compatibility, or restructuring data format.',
    inputs: ['object with keys to rename', 'key_mappings'],
    outputs: ['object with renamed keys'],
    example: `Mappings: {
  "firstName": "first_name",
  "lastName": "last_name",
  "emailAddress": "email"
}

Input: {
  firstName: "John",
  lastName: "Doe",
  emailAddress: "john@example.com",
  age: 30
}

Output: {
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  age: 30  // Unmapped keys preserved
}`,
    tips: [
      'Keys not in mappings remain unchanged',
      'Useful for API field name conversion',
      'Preserves all values',
      'Only renames top-level keys â€” there is no dot-notation support for nested fields',
      'A mapping whose current name is not found on the item is silently skipped, not reported as an error',
      'If two mappings resolve to the same new name (or the new name already exists), the later rename silently overwrites the earlier value',
    ],
  },

  // ============================================
  // MISSING GOOGLE NODES (Already have most)
  // ============================================
  google_bigquery: {
    overview: 'Execute a SQL query against BigQuery and get back the raw BigQuery API response. Supports standard SQL and legacy SQL modes.',
    inputs: ['projectId', 'query', 'useLegacySql (optional)', 'datasetId (reference-only note, not sent to BigQuery)'],
    outputs: ['data.rows (raw {f: [{v}]} format)', 'data.schema.fields', 'data.totalRows', 'data.jobComplete'],
    example: `Project ID: my-project-id
SQL Query: SELECT * FROM \`my-project-id.my_dataset.my_table\` LIMIT 10
Use Legacy SQL: false

Output: {
  operation: "query",
  data: {
    rows: [
      { f: [{ v: "value1" }, { v: "value2" }] },
      { f: [{ v: "value3" }, { v: "value4" }] }
    ],
    schema: { fields: [{ name: "column1", type: "STRING" }, { name: "column2", type: "STRING" }] },
    totalRows: "2",
    jobComplete: true
  }
}`,
    tips: [
      'Use backticks and fully qualify table names as `project.dataset.table` â€” Dataset ID above is not applied automatically',
      'Standard SQL recommended (leave Use Legacy SQL off)',
      'Results are BigQuery\'s raw {f: [{v}]} row format, not plain column-named objects â€” zip data.schema.fields with each row in a JavaScript node to get friendly objects',
      'Large queries may take time',
      'Authenticate with Google account first',
      'Only Project ID and SQL Query are actually required; Dataset ID is a reference-only note',
    ],
  },

  // ============================================
  // ADDITIONAL AI & ML NODES
  // ============================================
  azure_openai: {
    overview: 'Interact with Azure OpenAI service to use GPT models hosted on Microsoft Azure. Provides the same capabilities as OpenAI GPT but with Azure infrastructure and deployment control. Perfect for enterprises using Azure services or requiring data residency.',
    inputs: ['endpoint', 'apiKey', 'deploymentName', 'prompt', 'temperature', 'memory'],
    outputs: ['response', 'usage', 'model'],
    example: `Endpoint: https://my-resource.openai.azure.com
Deployment Name: gpt-4
System Prompt: "You are a helpful assistant..."
Temperature: 0.7

Output: {
  response: "Hello! How can I help you today?",
  usage: { tokens: 150 },
  model: "gpt-4"
}`,
    tips: [
      'Get endpoint from Azure Portal â†’ Your Resource â†’ Keys and Endpoint',
      'Deployment name is the name you gave your model deployment in Azure',
      'API version defaults to latest preview',
      'Use Azure endpoints for better data residency control',
      'Same models available as OpenAI but hosted on Azure',
    ],
  },

  huggingface: {
    overview: 'Calls the active Hugging Face inference router node. Runtime reads apiKey, model, prompt, maxTokens, and temperature; Task and Parameters are visible hints only and are not sent by the current executor.',
    inputs: ['apiKey', 'model', 'prompt', 'task', 'maxTokens', 'temperature', 'parameters'],
    outputs: ['success', 'model', 'response', 'output', 'error', 'preserved input fields'],
    example: `Model ID: facebook/bart-large-cnn
Prompt: "Summarize {{$json.reviewText}}."
Max Tokens: 256
Temperature: 0.2

Output: {
  customerId: "C-1048",
  success: true,
  model: "facebook/bart-large-cnn",
  response: "Customer reports a duplicate billing charge.",
  output: [{ summary_text: "Customer reports a duplicate billing charge." }]
}`,
    tips: [
      'Use a Hugging Face token that starts with hf_ and store it through Connections or the credential vault when possible.',
      'Copy the exact model ID from huggingface.co/models.',
      'The executor retries once without parameters only when max_new_tokens is rejected.',
      'Task and Parameters do not currently affect the HTTP request.',
    ],
  },

  hugging_face: {
    overview: 'Legacy alias guide only. The active UI-visible node key is huggingface.',
    inputs: ['See huggingface'],
    outputs: ['See huggingface'],
    example: 'Use the huggingface node entry for current runtime behavior.',
    tips: ['Do not add new workflows using the hugging_face key unless a legacy importer requires it.'],
  },

  ai_chat_model: {
    overview: 'Calls the platform Gemini chat path directly. The runtime preserves incoming fields, returns response plus model, and currently hardcodes provider gemini and model gemini-3.5-flash even though a model dropdown is visible.',
    inputs: ['prompt', 'systemPrompt', 'model', 'responseFormat', 'temperature'],
    outputs: ['response', 'model', '_error'],
    example: `Prompt: "Summarize this email as JSON: {{$json.emailBody}}"
System Prompt: "Return only JSON with summary and urgency."
Response Format: json
Temperature: 0.2

Input: { customerId: "1048", emailBody: "I was charged twice..." }
Output: {
  customerId: "1048",
  response: {
    summary: "Customer says they were charged twice.",
    urgency: "high"
  },
  model: "gemini-3.5-flash"
}`,
    tips: [
      'A blank effective prompt returns _error: AI Chat Model node: prompt is required.',
      'Response Format json uses best-effort JSON.parse; invalid JSON falls back to raw text in response.',
      'The current executor ignores the selected model and uses gemini-3.5-flash.',
      'Incoming fields are preserved, so IDs from previous steps remain available after this node.',
      'Use a Gemini connection, wallet, key pool, or worker key; do not paste keys into Prompt.',
    ],
  },

  cohere: {
    overview: 'Calls Cohere /v1/chat with a Command model, prompt, optional preamble, temperature, and max token limit. The current runtime reads apiKey directly and returns plain success/error fields.',
    inputs: ['apiKey', 'model', 'prompt', 'preamble', 'temperature', 'maxTokens'],
    outputs: ['success', 'response', 'model', 'finishReason', 'inputTokens', 'outputTokens', 'error'],
    example: `Model: command-r-08-2024
Prompt: "Summarize this support ticket: {{$json.ticketBody}}"
Preamble: "Be concise and factual."
Temperature: 0.2
Max Tokens: 512

Output: {
  success: true,
  response: "The customer is asking for a refund because delivery was late.",
  model: "command-r-08-2024",
  finishReason: "COMPLETE",
  inputTokens: 87,
  outputTokens: 19,
  error: null
}`,
    tips: [
      'Get the API key from dashboard.cohere.com and store it through a secure credential mapping.',
      'This node reports failures in error with success=false; it does not use _error.',
      'If Prompt is static and upstream text exists, the runtime may use upstream text as the message and Prompt as preamble.',
      'Use command-r-08-2024 for balanced work, command-r-plus-08-2024 for stronger reasoning, and command-r7b-12-2024 for faster smaller jobs.',
      'Use maxTokens to limit cost and keep downstream payloads small.',
    ],
  },

  ollama: {
    overview: 'Legacy Ollama slug that delegates to AI Chat Model using Gemini 3.5 Flash. It is not a local Ollama server call.',
    inputs: ['prompt', 'temperature'],
    outputs: ['response', 'model', '_error', 'preserved incoming fields'],
    example: `Prompt: "Explain quantum computing in simple terms"
Temperature: 0.7

Output: {
  response: "Quantum computing uses quantum mechanics...",
  model: "gemini-3.5-flash"
}`,
    tips: [
      'This does not call a local Ollama model; runtime rewrites it to ai_chat_model.',
      'A blank effective prompt can return _error: AI Chat Model node: prompt is required.',
      'Gemini credential errors appear in _error, and wallet failures may include code.',
      'Use {{$json.response}} downstream and keep preserved input fields normally.',
    ],
  },

  embeddings: {
    overview: 'Generate vector embeddings for text using OpenAI or Google Gemini models. Embeddings convert text into numerical vectors for similarity search, semantic search, or AI applications. Perfect for building search systems, recommendation engines, or RAG applications.',
    inputs: ['provider', 'apiKey', 'model', 'text', 'dimensions'],
    outputs: ['embedding', 'model', 'dimensions'],
    example: `Provider: OpenAI
Model: text-embedding-ada-002
Text: "Machine learning is fascinating"

Output: {
  embedding: [0.123, -0.456, 0.789, ...],
  model: "text-embedding-ada-002",
  dimensions: 1536
}`,
    tips: [
      'OpenAI ada-002: 1536 dimensions, fast and cheap',
      'text-embedding-3-small: 1536 dimensions, better quality',
      'text-embedding-3-large: 3072 dimensions, best quality',
      'Dimensions only for text-embedding-3 models',
      'Use embeddings for semantic search and similarity',
    ],
  },

  vector_store: {
    overview: 'Store and query vector embeddings in vector databases (Pinecone or Supabase pgvector). Perfect for building RAG systems, semantic search, or recommendation engines. Store embeddings with metadata and query for similar vectors.',
    inputs: ['provider', 'apiKey', 'indexName', 'operation', 'vectors', 'queryVector', 'ids'],
    outputs: ['result', 'matches', 'count'],
    example: `Provider: Pinecone
Operation: upsert
Vectors: [{"id": "1", "values": [0.1, 0.2, ...], "metadata": {"text": "hello"}}]

Query Operation:
Query Vector: {"vector": [0.1, 0.2, ...], "topK": 5}

Output: {
  matches: [
    {"id": "1", "score": 0.95, "metadata": {"text": "hello"}}
  ],
  count: 1
}`,
    tips: [
      'Pinecone is cloud-hosted vector database',
      'Supabase uses pgvector extension on PostgreSQL',
      'Upsert: insert or update vectors',
      'Query: search for similar vectors',
      'Delete: remove vectors by IDs',
    ],
  },

  chat_model: {
    overview: 'Support/config node for legacy agent wiring. The current runtime does not call an AI provider; it returns a Gemini config object, reads only Temperature, and ignores Provider, API Key, Model, and Prompt.',
    inputs: ['provider', 'apiKey', 'model', 'prompt', 'temperature'],
    outputs: ['provider', 'model', 'temperature', '_chat_model_config'],
    example: `Provider: gemini
Model: gemini-3.5-flash
Prompt: "You are a helpful assistant."
Temperature: 0.7

Output: {
  provider: "gemini",
  model: "gemini-3.5-flash",
  temperature: 0.7,
  _chat_model_config: true
}`,
    tips: [
      'Use AI Chat Model, AI Agent, or provider-specific AI nodes for real prompt responses.',
      'Do not paste production API keys here; the current executor ignores apiKey.',
      'Changing Model or Prompt does not change runtime behavior today.',
      'Downstream service nodes still need their own account connections.',
    ],
  },

  intent_classification_agent: {
    overview: 'AI agent that classifies user intent from text input. Identifies primary and secondary intents, calculates confidence scores, and handles ambiguous cases. Perfect for chatbots, customer service automation, or routing user requests.',
    inputs: ['apiKey', 'model', 'prompt', 'text', 'confidenceThreshold', 'temperature'],
    outputs: ['primaryIntent', 'secondaryIntents', 'confidence', 'isAmbiguous', 'clarificationQuestions'],
    example: `Text: "I want to cancel my subscription"
Confidence Threshold: 0.7

Output: {
  primaryIntent: "cancel_subscription",
  secondaryIntents: [],
  confidence: 0.95,
  isAmbiguous: false,
  clarificationQuestions: []
}`,
    tips: [
      'Lower confidence threshold = more classifications but less certain',
      'Higher threshold = fewer but more confident classifications',
      'Handles ambiguous cases by requesting clarification',
      'Use for routing user requests to appropriate handlers',
      'Temperature 0.3 recommended for classification tasks',
    ],
  },

  sentiment_analysis_agent: {
    overview: 'AI agent that analyzes sentiment and emotions in text. Detects sentiment polarity (positive/negative/neutral), emotional tones (joy, anger, sadness, etc.), and intensity. Perfect for customer feedback analysis, social media monitoring, or content moderation.',
    inputs: ['apiKey', 'model', 'prompt', 'text', 'granularity', 'temperature'],
    outputs: ['sentiment', 'confidence', 'emotions', 'intensity'],
    example: `Text: "I love this product! It works perfectly."
Granularity: overall

Output: {
  sentiment: "positive",
  confidence: 0.92,
  emotions: {
    joy: 0.85,
    anger: 0.02,
    sadness: 0.01,
    fear: 0.01,
    surprise: 0.10
  },
  intensity: "high"
}`,
    tips: [
      'Overall: single sentiment for entire text',
      'Sentence: sentiment per sentence for detailed analysis',
      'Aspect: sentiment for specific topics/aspects mentioned',
      'Handles sarcasm when possible',
      'Use for customer feedback and social media monitoring',
    ],
  },

  confidence_scoring_agent: {
    overview: 'AI agent that evaluates the confidence and certainty of AI-generated responses. Penalizes vague or speculative language and assigns confidence scores. Perfect for quality control, filtering unreliable outputs, or ensuring factual accuracy.',
    inputs: ['apiKey', 'model', 'prompt', 'responseText', 'context', 'temperature'],
    outputs: ['confidenceScore', 'confidenceLevel', 'riskFactors'],
    example: `Response Text: "This might be true, I think..."
Context: "Factual question about science"

Output: {
  confidenceScore: 0.35,
  confidenceLevel: "low",
  riskFactors: [
    "Uses vague language (might, think)",
    "Lacks definitive statements",
    "Speculative tone"
  ]
}`,
    tips: [
      'Penalizes vague language (might, think, possibly)',
      'Lower score for speculative or uncertain responses',
      'Higher score for clear, factual statements',
      'Use for filtering unreliable AI outputs',
      'Helps ensure quality control in AI workflows',
    ],
  },

  lead_qualification_agent: {
    overview: 'AI agent that qualifies sales leads using BANT or MEDDIC frameworks. Evaluates lead readiness, identifies missing information, and assigns qualification stages. Perfect for sales automation, lead routing, or CRM integration.',
    inputs: ['apiKey', 'model', 'prompt', 'leadData', 'framework', 'temperature'],
    outputs: ['qualified', 'qualificationStage', 'missingInformation', 'reasoning'],
    example: `Lead Data: {
  name: "John Doe",
  company: "Acme Corp",
  budget: 50000,
  timeline: "Q2 2024"
}
Framework: BANT

Output: {
  qualified: true,
  qualificationStage: "hot",
  missingInformation: [],
  reasoning: "Budget, Authority, Need, Timeline all present"
}`,
    tips: [
      'BANT: Budget, Authority, Need, Timeline (sales qualification)',
      'MEDDIC: Complex sales qualification framework',
      'Identifies missing information automatically',
      'Use for routing qualified leads to sales team',
      'Temperature 0.3 recommended for consistent evaluation',
    ],
  },

  lead_scoring_agent: {
    overview: 'AI agent that assigns weighted scores to sales leads based on attributes. Normalizes scores to 0-100 range and provides recommended actions. Perfect for prioritizing leads, lead nurturing, or sales pipeline management.',
    inputs: ['apiKey', 'model', 'prompt', 'leadAttributes', 'scoringRules', 'temperature'],
    outputs: ['leadScore', 'scoreCategory', 'scoreBreakdown', 'recommendedAction'],
    example: `Lead Attributes: {
  companySize: "enterprise",
  engagement: "high",
  budget: 100000
}
Scoring Rules: {"companySize": 20, "engagement": 30, "budget": 50}

Output: {
  leadScore: 85,
  scoreCategory: "high",
  scoreBreakdown: {
    companySize: 20,
    engagement: 30,
    budget: 50
  },
  recommendedAction: "Immediate follow-up with sales team"
}`,
    tips: [
      'Custom scoring rules available (optional)',
      'Scores normalized to 0-100 range',
      'Categories: low (0-40), medium (41-70), high (71-100)',
      'Use for prioritizing leads in CRM',
      'Integrate with lead nurturing workflows',
    ],
  },

  skill_matching_agent: {
    overview: 'AI agent that matches candidate skills with required skills and identifies gaps. Calculates match percentage and provides recommendations. Perfect for recruitment, team building, or skill gap analysis.',
    inputs: ['apiKey', 'model', 'prompt', 'candidateSkills', 'requiredSkills', 'experienceLevel', 'temperature'],
    outputs: ['matchPercentage', 'matchedSkills', 'missingSkills', 'recommendations'],
    example: `Candidate Skills: ["JavaScript", "React", "Node.js"]
Required Skills: ["JavaScript", "React", "TypeScript", "GraphQL"]
Experience Level: "mid-level"

Output: {
  matchPercentage: 66.7,
  matchedSkills: ["JavaScript", "React"],
  missingSkills: ["TypeScript", "GraphQL"],
  recommendations: [
    "Candidate has strong foundation",
    "Recommend training in TypeScript and GraphQL",
    "Good fit with some skill development"
  ]
}`,
    tips: [
      'Calculates match percentage automatically',
      'Identifies both matched and missing skills',
      'Provides actionable recommendations',
      'Use for recruitment and team planning',
      'Helps identify training needs',
    ],
  },

  document_qa_agent: {
    overview: 'AI agent that answers questions strictly from provided document text. Cites reference sections and rejects hallucinations. Perfect for document search, knowledge bases, or RAG applications where factual accuracy is critical.',
    inputs: ['apiKey', 'model', 'prompt', 'documentText', 'question', 'temperature'],
    outputs: ['answer', 'confidence', 'sourceExcerpt', 'found'],
    example: `Document Text: "The company was founded in 2020..."
Question: "When was the company founded?"

Output: {
  answer: "The company was founded in 2020.",
  confidence: 0.98,
  sourceExcerpt: "The company was founded in 2020...",
  found: true
}`,
    tips: [
      'Answers strictly from document - no hallucinations',
      'Cites source excerpts for verification',
      'Returns found: false if answer not in document',
      'Use for factual Q&A from documents',
      'Perfect for RAG and knowledge base systems',
    ],
  },

  policy_reasoning_agent: {
    overview: 'AI agent that interprets and applies policies or rules to given situations. Provides reasoning for policy decisions and identifies applicable rules. Perfect for compliance checking, policy enforcement, or automated decision-making.',
    inputs: ['apiKey', 'model', 'prompt', 'policy', 'situation', 'temperature'],
    outputs: ['decision', 'reasoning', 'applicableRules', 'compliance'],
    example: `Policy: "Employees must work 40 hours per week"
Situation: "Employee worked 35 hours"

Output: {
  decision: "Non-compliant",
  reasoning: "Employee worked 35 hours, which is less than the required 40 hours per week",
  applicableRules: ["Minimum 40 hours per week"],
  compliance: false
}`,
    tips: [
      'Interprets complex policies and rules',
      'Provides clear reasoning for decisions',
      'Identifies applicable rules automatically',
      'Use for compliance automation',
      'Perfect for HR and legal workflows',
    ],
  },

  memory: {
    overview: 'Passes sessionId, context, and incoming messages forward for AI workflows. The current runtime does not store, retrieve, clear, search, expire, or limit memory; those visible controls are legacy no-ops.',
    inputs: ['operation', 'memoryType', 'ttl', 'maxMessages', 'sessionId', 'session_id', 'context'],
    outputs: ['sessionId', 'context', 'messages'],
    example: `Operation: store
Memory Type: both
Session ID: ticket-{{$json.ticketId}}
Context: {{$json.customerContext}}

Output: {
  sessionId: "ticket-1048",
  context: "Customer has an open billing dispute for invoice INV-1048.",
  messages: []
}`,
    tips: [
      'Use Session ID and Context as the real data passed to downstream AI steps.',
      'Store, Retrieve, Clear, and Search currently behave the same.',
      'TTL, Memory Type, and Max Messages are ignored by the current executor.',
      'No memory or searchResults field is produced.',
    ],
  },

  mistral: {
    overview: 'Calls Mistral chat completions with optional systemPrompt and required prompt. It preserves incoming fields and adds success, model, response, inputTokens, and outputTokens.',
    inputs: ['apiKey', 'model', 'systemPrompt', 'prompt', 'temperature', 'maxTokens'],
    outputs: ['success', 'model', 'response', 'inputTokens', 'outputTokens', 'error', 'preserved input fields'],
    example: `Model: mistral-small-latest
System Prompt: "Return one concise sentence."
Prompt: "Summarize {{$json.ticketBody}}."

Output: {
  ticketId: "TCK-1048",
  success: true,
  model: "mistral-small-latest",
  response: "The customer is requesting a refund for a duplicate invoice charge.",
  inputTokens: 96,
  outputTokens: 15
}`,
    tips: [
      'Store the Mistral key in Connections or credential vault and map it into apiKey.',
      'Use low temperature for extraction or JSON-shaped output.',
      'Failures preserve incoming fields and return success=false with error.',
      'This node returns error, not _error.',
    ],
  },

  langchain: {
    overview: 'Calls OpenAI or Anthropic through the LangChain node facade. OpenAI is hardcoded to gpt-4o-mini, Anthropic to claude-3-5-sonnet-20241022; Memory is ignored.',
    inputs: ['operation', 'provider', 'apiKey', 'prompt', 'tools', 'memory'],
    outputs: ['success', 'operation', 'response', 'steps', 'error'],
    example: `Operation: run_agent
Provider: openai
Prompt: "Use a tool if needed: {{$json.customerQuestion}}"
Tools: [{"name":"lookup_order","description":"Find order details","parameters":{"type":"object","properties":{"orderId":{"type":"string"}}}}]

Output: {
  success: true,
  operation: "run_agent",
  response: "",
  steps: [{ id: "call_123", type: "function", function: { name: "lookup_order", arguments: "{\"orderId\":\"ORD-1048\"}" } }],
  error: null
}`,
    tips: [
      'apiKey must match provider: OpenAI key for openai, Anthropic key for anthropic.',
      'Tools affect only OpenAI run_agent; Anthropic tools are not sent by the current executor.',
      'Successful output does not preserve incoming fields.',
      'Memory toggle has no runtime effect, so map needed context into Prompt.',
    ],
  },

  // ============================================
  // DATABASE NODES
  // ============================================
  redis: {
    overview: 'Read, write, delete, increment, and manage Redis keys, hashes, lists, TTLs, and controlled custom commands. Use it for short-lived caches, session handoff, counters, and queue-like lists.',
    inputs: ['host', 'port', 'password', 'db', 'tls', 'operation', 'key', 'value', 'ttl', 'hash', 'field', 'command', 'args'],
    outputs: ['value', 'result', 'deleted', 'count', 'length', 'key', 'hash', 'field', '_error'],
    example: `Operation: set
Key: "user:123:cache"
Value: "cached_data"
TTL: 3600 seconds (1 hour)

Get Operation:
Output: {
  key: "user:123:cache",
  value: "cached_data",
  result: "OK"
}`,
    tips: [
      'Use namespaces like "user:123" or "session:abc"',
      'TTL sets expiration time in seconds',
      'Hash operations need Hash Key and Hash Field',
      'Custom Command should be limited to approved commands',
      'Get operation returns null if key not found',
    ],
  },

  sql_server: {
    overview: 'Query Microsoft SQL Server databases using T-SQL, table operations, or stored procedures. Supports Azure SQL Database and on-premise SQL Server.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'operation', 'query', 'table', 'data', 'where', 'procedureName', 'params'],
    outputs: ['rows', 'rowsAffected', 'inserted', 'records', 'returnValue'],
    example: `Host: myserver.database.windows.net
Database: mydb
Operation: executeQuery
Query: SELECT TOP 100 * FROM dbo.Users WHERE status = @status
Params: {"status": "active"}

Output: {
  rows: [
    {id: 1, name: "John", status: "active"},
    {id: 2, name: "Jane", status: "active"}
  ],
  count: 2
}`,
    tips: [
      'Azure SQL format: username@servername',
      'Use Execute Query for custom T-SQL',
      'Use Stored Procedure when the database already owns the logic',
      'Insert and Update use Data JSON; Update and Delete also require Where JSON',
      'Use connection pooling for better performance',
    ],
  },

  sqlite: {
    overview: 'Query SQLite databases using SELECT queries or raw SQL. SQLite is a file-based database perfect for local development, embedded applications, or lightweight data storage. No server required - just a file path.',
    inputs: ['databasePath', 'operation', 'table', 'query', 'filters', 'limit'],
    outputs: ['rows', 'count'],
    example: `Database Path: /tmp/mydb.db
Operation: select
Table: users
Filters: {"active": true}

Output: {
  rows: [
    {id: 1, name: "John", active: true}
  ],
  count: 1
}`,
    tips: [
      'Database file created automatically if not exists',
      'Use absolute or relative file paths',
      'Perfect for local development and testing',
      'Single-file database - easy to backup',
      'Standard SQL syntax supported',
    ],
  },

  snowflake: {
    overview: 'Query Snowflake data warehouse using SELECT queries or raw SQL. Snowflake is optimized for analytics and data warehousing. Perfect for large-scale data analytics, reporting, or data warehouse operations.',
    inputs: ['account', 'username', 'password', 'warehouse', 'database', 'schema', 'operation', 'table', 'query', 'limit'],
    outputs: ['rows', 'count'],
    example: `Account: xy12345
Warehouse: COMPUTE_WH
Database: MY_DATABASE
Schema: PUBLIC
Operation: select
Table: sales_data

Output: {
  rows: [
    {date: "2024-01-15", revenue: 10000},
    {date: "2024-01-16", revenue: 12000}
  ],
  count: 2
}`,
    tips: [
      'Account identifier from Snowflake URL',
      'Warehouse required for compute resources',
      'Case-sensitive: database and schema names',
      'Use Raw SQL for complex analytics queries',
      'Optimized for large-scale data processing',
    ],
  },

  timescaledb: {
    overview: 'Run PostgreSQL/TimescaleDB SQL, table writes, deletes, and time-series helpers such as timeBucket, first, and last. Use Execute Query for advanced time windows, joins, averages, and continuous aggregates.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'ssl', 'operation', 'query', 'params', 'table', 'data', 'where', 'timeColumn', 'interval', 'bucketColumn', 'valueColumn'],
    outputs: ['rows', 'rowsAffected', 'inserted', 'count', '_error'],
    example: `Host: timescale.example.com
Database: metrics_db
Operation: executeQuery
SQL Query: SELECT time_bucket('1 hour', time) AS hour, AVG(value) FROM metrics GROUP BY hour

Output: {
  rows: [
    {hour: "2024-01-15 10:00:00", avg: 45.5},
    {hour: "2024-01-15 11:00:00", avg: 48.2}
  ],
  count: 2
}`,
    tips: [
      'Uses PostgreSQL syntax plus time-series functions',
      'The live runtime uses executeQuery, not the old select/query values',
      'Hypertables automatically partitioned by time',
      'Use time_bucket() for time-based aggregations',
      'Update and Delete require Where JSON',
      'Time Bucket currently requires Group Column',
    ],
  },

  // ============================================
  // STORAGE NODES
  // ============================================
  read_binary_file: {
    overview: 'Read a managed workflow file asset by Asset ID, or a trusted serverPath/storageKey under the backend binary storage root. It is not a cloud-link reader.',
    inputs: ['sourceType', 'assetId', 'filePath', 'storageKey', 'maxSize'],
    outputs: ['success', 'assetId', 'fileName', 'mimeType', 'dataBase64', 'sizeBytes', 'checksumSha256', 'storageProvider', 'storageKey', 'filePath', '_error'],
    example: `Source Type: assetId
Asset ID: {{$json.assetId}}
Max Size: 10485760 (10 MB)

Output: {
  assetId: "asset-id",
  fileName: "document.pdf",
  dataBase64: "JVBERi0x...",
  sizeBytes: 5242880,
  mimeType: "application/pdf",
  storageKey: "users/.../document.pdf"
}`,
    tips: [
      'Use assetId from Write Binary File for normal workflow handoff',
      'Use serverPath/storageKey only for files under the backend binary root',
      'Returns dataBase64 for downstream email, storage, OCR, or parser nodes',
      'Set Max Size in bytes to protect worker memory',
      'Cloud links need their own connector node first',
    ],
  },

  aws_s3: {
    overview: 'List, download, upload, and delete Amazon S3 objects. The UI uses get/put/list/delete; the runtime normalizes get to download and put to upload internally.',
    inputs: ['region', 'accessKeyId', 'secretAccessKey', 'sessionToken', 'operation', 'bucket', 'key', 'prefix', 'content', 'dataBase64', 'data'],
    outputs: ['bucket', 'key', 'items', 'count', 'dataBase64', 'sizeBytes', 'contentType', 'etag', 'uploaded', 'deleted', '_error'],
    example: `Operation: put
Bucket: my-bucket
Key: "folder/file.txt"
Content: "Hello from CtrlChecks!"
Region: us-east-1

Get Operation:
Output: {
  key: "folder/file.txt",
  dataBase64: "SGVsbG8...",
  sizeBytes: 22,
  contentType: "text/plain"
}`,
    tips: [
      'Use folder structure in object keys: "folder/subfolder/file.txt"',
      'Upload accepts dataBase64, data, or content',
      'Region must match bucket region',
      'List operation supports prefix filtering',
      'Use least-privilege IAM permissions for the selected bucket',
    ],
  },

  ftp: {
    overview: 'Transfer files with an FTP server using get, put, list, or delete. The registry path accepts the UI field names remotePath/content and generated aliases download/upload.',
    inputs: ['operation', 'host', 'port', 'username', 'password', 'secure', 'remotePath', 'path', 'content', 'dataBase64', 'fileData'],
    outputs: ['success', 'output.operation', 'output.data', 'items', 'count', 'dataBase64', 'sizeBytes', 'path', 'deleted', '_error'],
    example: `Operation: get
Host: ftp.example.com
Port: 21
Remote Path: /files/data.txt

Output: {
  success: true,
  output: {
    operation: "get",
    data: {
      path: "/files/data.txt",
      size: 2048,
      dataBase64: "SGVsbG8..."
    }
  }
}`,
    tips: [
      'Use SFTP instead of FTP whenever the server supports it',
      'Put requires Content, Data Base64, or File Data',
      'Remote Path is a file path for get/put/delete and a folder for list',
      'Secure FTP means explicit FTPS/TLS, not SFTP',
      'Legacy execution may return flattened items/dataBase64/path/deleted fields',
    ],
  },

  sftp: {
    overview: 'Transfer files securely over SSH/SFTP using get, put, list, or delete. Authentication can use a password or an SSH private key with an optional passphrase.',
    inputs: ['operation', 'host', 'port', 'username', 'password', 'privateKey', 'passphrase', 'remotePath', 'path', 'content', 'dataBase64', 'fileData'],
    outputs: ['success', 'output.operation', 'output.data', 'items', 'count', 'dataBase64', 'sizeBytes', 'path', 'deleted', '_error'],
    example: `Operation: put
Host: sftp.example.com
Port: 22
Remote Path: /var/www/uploads/file.txt
Content: {{$json.dataBase64}}

Output: {
  success: true,
  output: {
    operation: "put",
    data: {
      path: "/var/www/uploads/file.txt",
      size: 2048,
      uploaded: true
    }
  }
}`,
    tips: [
      'Port 22 is standard SSH/SFTP port',
      'Use either password or private key authentication',
      'Private key must include the full BEGIN/END block',
      'Put requires Content, Data Base64, or File Data',
      'Remote Path is a file path for get/put/delete and a folder for list',
      'SFTP is SSH-based and different from FTPS',
    ],
  },

  dropbox: {
    overview: 'List, download, upload, and delete Dropbox files. The UI value read is normalized to download by the runtime; failures return _error and often _errorDetails.',
    inputs: ['accessToken', 'operation', 'path', 'content', 'dataBase64', 'data', 'recursive'],
    outputs: ['success', 'items', 'cursor', 'hasMore', 'dataBase64', 'sizeBytes', 'metadata', 'deleted', '_error', '_errorDetails'],
    example: `Operation: upload
Path: /Documents/file.txt
Content: "Hello from CtrlChecks!"

List Operation:
Output: {
  success: true,
  items: [
    {name: "file.txt", path_display: "/Documents/file.txt", size: 1234}
  ],
  hasMore: false
}`,
    tips: [
      'Paths start with / for root',
      'Use a saved Dropbox OAuth2 connection instead of pasting tokens',
      'Scopes needed: files.metadata.read, files.content.read, files.content.write',
      'Upload accepts dataBase64, data, or content',
      'Recursive list can return many files',
    ],
  },

  telegram: {
    overview: 'Send Telegram text messages, media URLs, and message edits through a saved Telegram Bot Token connection. Use it for Telegram bot replies, support alerts, report delivery, approval buttons, and status updates.',
    inputs: ['operation', 'chatId', 'messageType', 'message/text', 'parseMode', 'mediaUrl', 'caption', 'replyToMessageId', 'editMessageId', 'replyMarkup', 'disableNotification', 'protectContent', 'allowSendingWithoutReply'],
    outputs: ['success', 'operation', 'chatId', 'messageId', 'data', 'raw', 'telegram', '_error', '_errorDetails'],
    example: `Operation: send_message
Chat ID: {{$json.chatId}}
Message Type: text
Message: "Answer for ticket {{$json.ticketId}}: {{$json.aiResponse}}"
Reply To Message ID: {{$json.messageId}}
Reply Markup: {"inline_keyboard":[[{"text":"Open ticket","url":"{{$json.ticketUrl}}"}]]}

Replies to the same Telegram chat and returns {{$json.messageId}} for later edits or logs.`,
    tips: [
      'Create the bot with @BotFather, then save the Telegram Bot Token in Connections',
      'Use {{$json.chatId}} and {{$json.messageId}} from Telegram Trigger to reply in the same chat',
      'Choose send_message for text, send_photo plus Media URL for images, and edit_message when updating a previous bot message',
      'For media message types, use a public HTTPS Media URL that Telegram can fetch without signing in',
      'Connect downstream service accounts separately; Telegram credentials only authorize Telegram sends',
    ],
  },
  telegram_trigger: {
    overview: 'Start a workflow in real time when your Telegram bot receives a message. Use this for chatbot workflows such as Telegram Trigger -> AI Agent -> Telegram Send Message.',
    inputs: ['updateTypes', 'allowedChatIds', 'commandFilter', 'secretToken'],
    outputs: ['chatId', 'messageId', 'text', 'username', 'firstName', 'lastName', 'userId', 'updateType', 'raw'],
    example: `Incoming Telegram message:
{
  chatId: "123456789",
  messageId: 42,
  text: "Can you help me?"
}

Reply node:
chatId = {{$json.chatId}}
message = {{$json.aiResponse}}`,
    tips: [
      'Create a bot in Telegram with BotFather, then save the bot token in Connections',
      'Telegram allows one webhook URL per bot token; use separate bots for separate active workflows',
      'Allowed Chat IDs and Command Filter are optional but useful for production bot control',
    ],
  },

  whatsapp_trigger: {
    overview: 'Start a workflow in real time when your WhatsApp Business number receives a Meta WhatsApp Cloud webhook. Use this for chatbot workflows such as WhatsApp Trigger -> AI Agent -> WhatsApp Send Text.',
    inputs: ['eventTypes', 'phoneNumberId', 'allowedWaIds', 'verifyToken', 'validateSignature'],
    outputs: ['chatId', 'from', 'waId', 'text', 'messageId', 'phoneNumberId', 'eventType', 'status', 'raw'],
    example: `Incoming WhatsApp message:
{
  chatId: "15551234567",
  from: "15551234567",
  text: "Can you help me?"
}

Reply node:
to = {{$json.chatId}}
text = {{$json.aiResponse}}`,
    tips: [
      'Save a WhatsApp connection with a permanent access token and Phone Number ID before activating the workflow',
      'Use the same Verify Token in Meta for Developers -> WhatsApp -> Configuration',
      'Keep signature validation on in production and configure META_APP_SECRET, FACEBOOK_APP_SECRET, or WHATSAPP_APP_SECRET on the worker',
    ],
  },

  instagram_trigger: {
    overview: 'Start a workflow in real time when Instagram receives a DM, comment, mention, story reply, or postback through Meta webhooks. Use this for workflows such as Instagram Trigger -> AI Agent -> Instagram Send Text or Reply to Comment.',
    inputs: ['connectionId', 'eventTypes', 'instagramBusinessAccountId', 'allowedSenderIds', 'verifyToken', 'validateSignature'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'chatId', 'senderId', 'recipientId', 'instagramBusinessAccountId', 'pageId', 'messageId', 'messageType', 'commentId', 'mediaId', 'mentionId', 'postbackPayload', 'isStoryReply', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_instagram'],
    example: `Incoming Instagram DM:
{
  eventId: "mid.$abc123",
  eventType: "message.text",
  chatId: "1234567890",
  senderId: "1234567890",
  recipientId: "17841400000000000",
  instagramBusinessAccountId: "17841400000000000",
  text: "Can you help me?",
  sessionId: "instagram_workflow_123_1234567890"
}

Reply node:
resource = message
operation = sendText
recipientId = {{$json.senderId}}
text = {{$json.aiResponse}}`,
    tips: [
      'Connect Instagram through Connections with Instagram messaging/comment permissions before activating the workflow',
      'Use the same Verify Token in Meta for Developers -> Webhooks when verifying the callback URL',
      'Keep signature validation on in production and configure META_APP_SECRET, INSTAGRAM_APP_SECRET, or FACEBOOK_APP_SECRET on the worker',
      'Use commentId for comment reply operations and senderId for DM reply operations',
      'Use {{$json.eventType}} to route message, message.story_reply, comment, mention, and postback events to different branches',
    ],
  },

  facebook_trigger: {
    overview: 'Start a workflow in real time when Meta sends a Facebook Page or Messenger webhook. It normalizes Messenger messages, comments, mentions, postbacks, lead ads, and feed changes into one event output.',
    inputs: ['eventTypes: message, comment, mention, postback, leadgen, feed', 'pageId: optional Facebook Page ID filter', 'allowedSenderIds: optional sender allowlist', 'verifyToken: shared Meta webhook verification value', 'validateSignature: verify X-Hub-Signature-256 with META_APP_SECRET or FACEBOOK_APP_SECRET'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'chatId', 'senderId', 'recipientId', 'pageId', 'messageId', 'messageType', 'commentId', 'postId', 'parentId', 'leadgenId', 'formId', 'postbackPayload', 'field', 'verb', 'item', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_facebook'],
    example: `Incoming Facebook Messenger message:
{
  eventId: "m_abc123",
  eventType: "message.text",
  chatId: "1234567890",
  senderId: "1234567890",
  recipientId: "123456789012345",
  pageId: "123456789012345",
  text: "Can you help me track my order?",
  sessionId: "facebook_workflow_123_1234567890"
}

Reply node:
operation = sendTextMessage
pageId = {{$json.pageId}}
recipientId = {{$json.senderId}}
text = {{$json.aiResponse}}

Comment reply:
operation = createComment
commentId = {{$json.commentId}}
replyText = "Thanks, our team is checking this."`,
    tips: [
      'Connect Facebook OAuth2 through Connections with a Page-managing account before activating the workflow.',
      'Use the same Verify Token in CtrlChecks and Meta for Developers -> Webhooks when verifying the callback URL.',
      'Keep signature validation on in production and configure META_APP_SECRET or FACEBOOK_APP_SECRET on the worker.',
      'Use {{$json.eventType}} to branch before relying on event-specific fields.',
      'Use senderId for Messenger replies, commentId for comment replies, and leadgenId/formId for Lead Ads routing.',
      'Downstream Slack, CRM, email, ticketing, or database nodes still need their own account connection.',
    ],
  },

  github_trigger: {
    overview: 'Start a workflow in real time when GitHub sends a signed repository webhook for pushes, issues, pull requests, releases, comments, or other configured repository events.',
    inputs: ['owner: GitHub user or organization', 'repo: repository name', 'eventTypes: push, issues, pull_request, release, issue_comment, or another GitHub webhook event', 'webhookSecret: optional signing secret override; normally leave blank', 'query: optional keyword filter against normalized event text'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'repository', 'action', 'ref', 'commits', 'issueNumber', 'issueTitle', 'issueUrl', 'prNumber', 'prTitle', 'prUrl', 'merged', 'releaseTag', 'releaseName', 'commentBody', 'commentUrl', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_github'],
    example: `Incoming GitHub issue:
{
  eventId: "a1b2c3d4-0000-0000-0000-000000000000",
  eventType: "issues.opened",
  repository: "acme-platform/api-service",
  username: "octocat",
  issueNumber: 42,
  issueTitle: "Bug: billing export fails for July invoices",
  issueUrl: "https://github.com/acme-platform/api-service/issues/42",
  text: "Bug: billing export fails for July invoices",
  sessionId: "github_workflow_123_a1b2c3d4-0000-0000-0000-000000000000"
}

AI triage:
prompt = "Summarize {{$json.issueTitle}} from {{$json.repository}}"

Slack alert:
message = "New {{$json.eventType}} by {{$json.username}}: {{$json.issueUrl}}"`,
    tips: [
      'Connect GitHub in Connections with a PAT or OAuth token that can administer repository webhooks.',
      'Owner and Repository are path parts from github.com/owner/repo, not the full URL.',
      'Leave Webhook Secret Override blank unless you are reusing a manually managed signing secret.',
      'GitHub ping deliveries confirm the webhook exists but do not start workflow executions.',
      'Use {{$json.eventType}} before mapping event-specific fields, because push events have commits while issue_comment events have commentBody.',
      'Downstream Slack, email, CRM, database, ticketing, or GitHub action nodes still need their own account connection.',
    ],
  },

  gitlab_trigger: {
    overview: 'Start a workflow in real time when GitLab sends a project webhook for pushes, tag pushes, issues, merge requests, notes/comments, pipelines, jobs, or releases. CtrlChecks validates GitLab deliveries with the X-Gitlab-Token shared secret header, not an HMAC signature.',
    inputs: ['baseUrl: GitLab instance root, usually https://gitlab.com', 'projectId: numeric GitLab project ID or URL-encoded path such as group%2Fproject', 'eventTypes: push, tag_push, issue, merge_request, note, pipeline, job, release', 'secretToken: optional X-Gitlab-Token shared secret override; normally leave blank', 'query: optional keyword filter against normalized event text'],
    outputs: ['eventId', 'eventType', 'source', 'userId', 'username', 'text', 'timestamp', 'projectId', 'projectName', 'action', 'ref', 'commits', 'issueIid', 'issueTitle', 'issueUrl', 'mrIid', 'mrTitle', 'mrUrl', 'mrState', 'noteBody', 'noteUrl', 'raw', 'trigger', 'workflow_id', 'node_id', 'sessionId', '_gitlab'],
    example: `Incoming GitLab issue:
{
  eventId: "987654321",
  eventType: "issue",
  projectId: "12345",
  projectName: "acme-platform/api-service",
  username: "asha",
  issueIid: 42,
  issueTitle: "Bug: billing export fails for July invoices",
  issueUrl: "https://gitlab.com/acme-platform/api-service/-/issues/42",
  text: "Bug: billing export fails for July invoices",
  sessionId: "gitlab_workflow_123_987654321"
}

AI triage:
prompt = "Summarize {{$json.issueTitle}} from {{$json.projectName}}"

Slack alert:
message = "New {{$json.eventType}} by {{$json.username}}: {{$json.issueUrl}}"`,
    tips: [
      'Connect GitLab in Connections with OAuth api scope or a Personal Access Token with api scope before activating the workflow.',
      'Use Project ID from GitLab project Settings -> General, or URL-encode the group/project path as group%2Fproject.',
      'Leave Webhook Secret Override blank unless you are reusing a manually managed GitLab project webhook secret token.',
      'Use exact GitLab object_kind values such as merge_request and note, not friendly labels like merge requests or comments.',
      'Use {{$json.eventType}} before mapping event-specific fields, because push events have commits while note events have noteBody.',
      'Downstream GitLab action nodes, Slack, email, CRM, database, or ticketing nodes still need their own account connection.',
    ],
  },

  whatsapp: {
    overview: 'Send WhatsApp messages, media, locations, contact cards, approved templates, and interactive buttons/lists through the WhatsApp Business Cloud API. Connect a WhatsApp/Facebook account under Connections â€” credentials are resolved automatically. The visual panel exposes the Message resource; Contact, Conversation, Template, Campaign, and AI Agent resources are runtime-supported for advanced or AI-generated workflows.',
    inputs: ['resource', 'operation', 'to', 'text', 'mediaType/mediaUrl', 'templateName/language', 'bodyText/buttons'],
    outputs: ['messages[0].id', 'contacts', 'success', '_error', '_errorCode', '_errorDetails'],
    example: `Operation: sendText
To: {{$json.chatId}}
Message: "Hi {{$json.customerName}}, your order #{{$json.orderId}} has been confirmed! Expected delivery: {{$json.deliveryDate}}."

Output: {
  messaging_product: "whatsapp",
  contacts: [{ input: "+12345678900", wa_id: "12345678900" }],
  messages: [{ id: "wamid.xxx" }]
}`,
    tips: [
      'Connect a WhatsApp account under Connections â€” no access tokens entered on the node itself',
      'Phone numbers should be in E.164 format, e.g. +12345678900',
      'First message to a new contact must use Send Template; free-form Send Text only works inside the 24-hour customer service window',
      'Use {{$json.messages[0].id}} to track delivery, and {{$json.chatId}} or {{$json.from}} from WhatsApp Trigger for replies',
      'Contact, Conversation, Template, Campaign, and AI Agent actions are documented on the WhatsApp node page but are only reachable via AI-generated or manually edited workflow configs, not this visual Resource dropdown yet',
    ],
  },

  // Deprecated alias for 'whatsapp' â€” kept only for workflows saved before the merge.
  whatsapp_cloud: {
    overview: 'Deprecated â€” use the WhatsApp node instead. This node only ever sends a plain WhatsApp text message and is kept only for backward compatibility with existing workflows; it delegates execution and credentials to the WhatsApp node under the hood.',
    inputs: ['to', 'text (labeled "Message" in the panel)', 'messageType (inert)'],
    outputs: ['success', 'data', '_error / _errorCode / _errorDetails on failure'],
    example: `To: +1234567890
Message: "Hello from CtrlChecks!"

Output: {
  success: true,
  data: { messaging_product: "whatsapp", contacts: [...], messages: [{ id: "wamid.xxx" }] }
}`,
    tips: [
      'Deprecated â€” replace with the WhatsApp node in new workflows; it supports media, locations, contacts, templates, and interactive messages that this node cannot reach',
      'The Message field is stored under the key text, not message â€” a prior panel version used message, which the shared runtime never read, so those sends went out empty',
      'Message Type has no effect on the send â€” this node always sends plain text regardless of its value',
      'Connect a WhatsApp account under Connections â€” no API keys entered on the node itself',
    ],
  },

  twilio: {
    overview: 'Send SMS or MMS messages using a Twilio account connection. Requires a From number or Messaging Service SID. Perfect for SMS notifications, alerts, or two-factor authentication.',
    inputs: ['to', 'message', 'from', 'messagingServiceSid', 'mediaUrl'],
    outputs: ['success (on success only)', 'sid', 'status', 'twilio', '_error / _errorDetails on failure'],
    example: `From: +1234567890
To: +1987654321
Message: "Hello from CtrlChecks!"

Output: {
  success: true,
  sid: "SM1234567890abcdef1234567890abcd",
  status: "queued",
  twilio: { sid, status, to, from, body, price, ... }
}`,
    tips: [
      'Phone numbers in E.164 format (include + and country code)',
      "Connect your Twilio account from the node's connection picker (Account SID + Auth Token)",
      'Use either a From number or a Messaging Service SID, not both',
      'Set Media URL to send an MMS attachment',
      'status is the initial queue state (queued/sent), not final delivery â€” this node does not poll for delivered/failed',
      'On failure, check {{$json._errorDetails}} for the real reason â€” {{$json._error}} alone is just a bare status-code message, and there is no success: false to check instead',
      'Trial Twilio accounts can only send to Verified Caller IDs until upgraded',
      'Supports template variables',
    ],
  },

  zoom_video: {
    overview: 'Create, list, get, update, or delete Zoom meetings using a saved Zoom OAuth2 connection. Use it for booking flows, support calls, classes, sales demos, and cancellation workflows where Zoom meeting details need to move through the workflow.',
    inputs: ['operation', 'topic, duration, startTime for createMeeting/updateMeeting', 'meetingId for getMeeting/updateMeeting/deleteMeeting', 'Zoom OAuth2 connection selected in Connections'],
    outputs: ['success and raw Zoom data for create/list/get', 'data.updated and data.meetingId for updateMeeting', 'data.deleted and data.meetingId for deleteMeeting', '_error and _errorDetails on failures'],
    example: `Operation: Create Meeting
Topic: "Discovery call with {{$json.companyName}}"
Start Time: {{$json.startsAt}}
Duration: 30

Output: {
  success: true,
  data: {
    id: 81234567890,
    topic: "Discovery call with Acme Corp",
    join_url: "https://zoom.us/j/81234567890",
    start_url: "https://zoom.us/s/81234567890",
    start_time: "2026-05-01T10:00:00Z",
    duration: 30
  }
}`,
    tips: [
      'Connect Zoom OAuth2 from Connections; CtrlChecks stores OAuth tokens in the credential vault, not in normal node fields',
      'Required scopes are meeting:write:meeting, meeting:read:meeting, meeting:read:list_meetings, and user:read:user',
      'Leave Start Time blank on Create Meeting only when you want an instant meeting; use ISO 8601 timestamps for scheduled meetings',
      'Use {{$json.data.id}} as Meeting ID for later Get, Update, or Delete Meeting steps; do not use join_url as the ID',
      'Update and Delete return small confirmation objects, not the full meeting details, so run Get Meeting first if later steps need the join link or topic',
      'Downstream nodes such as Gmail, Slack, or Google Calendar need their own account connection before they can share the Zoom link',
    ],
  },

  email_sequence_sender: {
    overview: 'Send email sequences (drip campaigns) with multiple steps, delays, and conditions. Perfect for onboarding, marketing campaigns, or automated follow-ups. Stop sequence if recipient replies.',
    inputs: ['recipient', 'sequence', 'stopOnReply', 'tracking'],
    outputs: ['sequenceId', 'sentCount', 'status'],
    example: `Recipient: {"email": "user@example.com", "name": "John"}
Sequence: [
  {"step": 1, "subject": "Welcome", "body": "Hello!", "delayAfter": 0},
  {"step": 2, "subject": "Day 1", "body": "Check this out...", "delayAfter": 86400}
]
Stop on Reply: true

Output: {
  sequenceId: "seq_123",
  sentCount: 1,
  status: "active"
}`,
    tips: [
      'delayAfter in seconds (86400 = 1 day)',
      'Sequence stops if recipient replies (if enabled)',
      'Supports tracking (open, click)',
      'Use for onboarding and marketing campaigns',
      'Each step sends after delay from previous step',
    ],
  },

  auto_followup_sender: {
    overview: 'Automatically send follow-up messages if original message receives no reply. Monitors original message and sends follow-up after wait time. Perfect for ensuring important messages are seen.',
    inputs: ['originalMessageId', 'recipient', 'followUpMessage', 'waitTime', 'maxAttempts'],
    outputs: ['followUpId', 'attempt', 'status'],
    example: `Original Message ID: msg_123
Wait Time: 86400 seconds (24 hours)
Max Attempts: 3
Follow-up Message: {"subject": "Follow-up", "body": "Just checking in..."}

Output: {
  followUpId: "followup_456",
  attempt: 1,
  status: "scheduled"
}`,
    tips: [
      'Wait time in seconds before sending follow-up',
      'Max attempts limits number of follow-ups',
      'Stops if recipient replies',
      'Use for important messages that need response',
      'Helps ensure messages are seen',
    ],
  },

  human_handoff_notification: {
    overview: 'Notify humans when workflow needs manual intervention. Sends notification via email, Slack, or SMS with workflow context. Perfect for escalation, approval requests, or manual review.',
    inputs: ['channel', 'recipient', 'context', 'priority'],
    outputs: ['notificationId', 'status'],
    example: `Channel: email
Recipient: agent@example.com
Priority: high
Context: {
  "workflowId": "wf_123",
  "reason": "Manual review needed",
  "data": {...}
}

Output: {
  notificationId: "notif_789",
  status: "sent"
}`,
    tips: [
      'Channels: email, slack, sms',
      'Priority: low, medium, high',
      'Context includes workflow details',
      'Use for escalation and manual review',
      'Ensures humans are notified when needed',
    ],
  },

  approval_request_sender: {
    overview: 'Send approval requests to approvers and wait for response. Supports approve/reject options and timeout handling. Perfect for workflow approvals, purchase requests, or content moderation.',
    inputs: ['approver', 'approvalMessage', 'approvalOptions', 'timeout'],
    outputs: ['approvalId', 'status', 'decision'],
    example: `Approver: manager@example.com
Approval Message: "Please approve this request..."
Approval Options: ["approve", "reject"]
Timeout: 86400 seconds (24 hours)

Output: {
  approvalId: "approval_123",
  status: "pending",
  decision: null
}`,
    tips: [
      'Timeout in seconds - auto-handles if timeout reached',
      'Approval options: approve, reject, or custom',
      'Approver receives notification',
      'Use for workflow approvals and permissions',
      'Workflow pauses until approval received',
    ],
  },

  reminder_scheduler: {
    overview: 'Schedule reminders to be sent at specific times or on recurring schedules. Supports email, SMS, or push notifications. Perfect for deadline reminders, task reminders, or recurring notifications.',
    inputs: ['recipient', 'message', 'channel', 'schedule'],
    outputs: ['reminderId', 'scheduledTime'],
    example: `Recipient: user@example.com
Message: "Don't forget to submit your report"
Channel: email
Schedule: {
  "type": "one_time",
  "time": "2024-01-20T09:00:00Z"
}

Output: {
  reminderId: "reminder_123",
  scheduledTime: "2024-01-20T09:00:00Z"
}`,
    tips: [
      'Schedule type: one_time or recurring (with cron)',
      'Channels: email, sms, push',
      'Time in ISO-8601 format',
      'Use for deadline and task reminders',
      'Recurring reminders use cron expressions',
    ],
  },

  // ============================================
  // STORAGE & DOCUMENT PROCESSING NODES
  // ============================================
  resume_parser: {
    overview: 'Parses resume/CV files into structured candidate data like name, contact info, skills, education, and experience. Ideal for recruitment, applicant tracking, and automated screening.',
    inputs: [
      'file (resume document)',
      'normalizeSkills (standardize skill names)',
      'experienceCalculation (total years)',
    ],
    outputs: ['contactInfo', 'skills', 'experience', 'education', 'totalExperience'],
    example: `File: {
  "name": "candidate_resume.pdf",
  "type": "pdf",
  "binary": "base64_encoded_pdf..."
}
Normalize Skills: true
Experience Calculation: true

Output: {
  contactInfo: {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890"
  },
  skills: ["JavaScript", "React", "Node.js", "Python"],
  experience: [
    {
      company: "Tech Corp",
      position: "Senior Developer",
      duration: "2 years"
    }
  ],
  education: [...],
  totalExperience: 5.5
}`,
    tips: [
      'Use clean, text-based resumes when possible',
      'Enable OCR upstream if the resume is scanned',
      'Normalize skills for consistent matching',
      'Verify parsed data before automation decisions',
      'Great for ATS and candidate ranking workflows',
    ],
  },

  invoice_parser: {
    overview: 'Extract structured data from invoice files (PDF, images). Parses invoice number, date, line items, totals, tax information, and vendor details. Normalizes currency values and detects tax amounts. Perfect for accounts payable automation, expense tracking, or invoice processing workflows.',
    inputs: ['file', 'currencyNormalization', 'taxDetection'],
    outputs: ['invoiceNumber', 'date', 'vendor', 'lineItems', 'subtotal', 'tax', 'total', 'currency'],
    example: `File: {
  "name": "invoice.pdf",
  "type": "pdf",
  "binary": "base64_encoded_pdf..."
}
Currency Normalization: true
Tax Detection: true

Output: {
  invoiceNumber: "INV-2024-001",
  date: "2024-01-15",
  vendor: {
    name: "Acme Corp",
    address: "123 Main St..."
  },
  lineItems: [
    {
      description: "Service A",
      quantity: 2,
      unitPrice: 100,
      total: 200
    }
  ],
  subtotal: 200,
  tax: 20,
  total: 220,
  currency: "USD"
}`,
    tips: [
      'Supports PDF and image formats',
      'Normalizes currency to standard format',
      'Detects and extracts tax information',
      'Extracts all line items with quantities and prices',
      'Use for automated invoice processing and accounting',
    ],
  },

  document_classifier: {
    overview: 'Classify documents into predefined categories based on text content. Uses AI to analyze document text and assign it to the most likely category. Returns confidence scores for classification. Perfect for document routing, categorization, or content management workflows.',
    inputs: ['text', 'availableClasses', 'confidenceThreshold'],
    outputs: ['classification', 'confidence', 'alternativeClasses'],
    example: `Text: "Invoice #12345 dated January 15, 2024..."
Available Classes: ["invoice", "resume", "contract", "report"]
Confidence Threshold: 0.7

Output: {
  classification: "invoice",
  confidence: 0.95,
  alternativeClasses: [
    {class: "contract", confidence: 0.05},
    {class: "report", confidence: 0.00}
  ]
}`,
    tips: [
      'Requires text content from document',
      'Available classes define possible categories',
      'Confidence threshold filters low-confidence classifications',
      'Returns alternative classifications with scores',
      'Use for automatic document routing and categorization',
    ],
  },

  file_metadata_extractor: {
    overview: 'Extract metadata from files including file type, size, creation date, modification date, MIME type, and format-specific metadata (EXIF for images, PDF metadata, etc.). Perfect for file organization, metadata indexing, or content management.',
    inputs: ['file'],
    outputs: ['metadata', 'type', 'size', 'mimeType', 'createdAt', 'modifiedAt'],
    example: `File: {
  "name": "photo.jpg",
  "type": "image/jpeg",
  "size": 1024000,
  "binary": "base64_encoded_image..."
}

Output: {
  metadata: {
    width: 1920,
    height: 1080,
    camera: "Canon EOS 5D",
    location: {...}
  },
  type: "image/jpeg",
  size: 1024000,
  mimeType: "image/jpeg",
  createdAt: "2024-01-15T10:30:00Z",
  modifiedAt: "2024-01-15T10:30:00Z"
}`,
    tips: [
      'Extracts format-specific metadata (EXIF, PDF info, etc.)',
      'Returns file type and MIME type',
      'Includes file size and timestamps',
      'Metadata varies by file type',
      'Use for file indexing and organization',
    ],
  },

  // ============================================
  // UTILITY NODES
  // ============================================
  html_extract: {
    overview: 'Legacy alias for the canonical HTML node. Parse an HTML document, extract text from matching CSS selectors, or convert body content to plain text.',
    inputs: ['operation', 'html', 'selector'],
    outputs: ['title', 'meta', 'body', 'results', 'count', 'text', 'success'],
    example: `HTML: "<div class='content'><p>Hello World</p></div>"
Operation: extract
Selector: ".content p"

Output: {
  results: ["Hello World"],
  count: 1,
  success: true
}`,
    tips: [
      'Use the canonical html node type for new workflows',
      'Supported operations are parse, extract, and toText',
      'Selector is required only for extract',
      'Use {{$json.html}} when the HTML comes from an earlier step',
    ],
  },

  xml: {
    overview: 'Parse, extract, or validate XML documents. Converts XML to data, extracts data using an XPath-style slash path, or validates XML structure.',
    inputs: ['xml', 'operation', 'xpath for extract', 'maxSize'],
    outputs: ['data/result/valid depending on operation'],
    example: `Operation: parse
XML: "<root><item id='1'>Value</item></root>"
Output: {
  data: {
    root: {
      item: {
        "@_id": 1,
        "#text": "Value"
      }
    }
  },
  success: true
}`,
    tips: [
      'Parse: converts XML to JSON object',
      'Extract: uses xpath to extract a specific slash path',
      'Validate: checks XML structure and syntax',
      'Default maxSize is 5242880 bytes',
      'Use /root/item style paths for extract â€” this is a simplified path walker, not real XPath (no wildcards, attribute selectors, or array indices)',
      'A non-matching XPath silently returns result: null and success: false â€” no error is raised',
      'Invalid XML during Validate is a normal successful result (valid: false), not an error',
    ],
  },

  rss_feed_read: {
    overview: 'Read and parse RSS/Atom feeds from URLs. Extracts feed items with titles, descriptions, links, dates, and authors. Can detect and filter duplicate entries. Perfect for content aggregation, blog monitoring, or news feeds.',
    inputs: ['feedUrl', 'maxItems', 'detectDuplicates', 'timeout'],
    outputs: ['items', 'feedInfo', 'totalItems'],
    example: `Feed URL: https://example.com/feed.xml
Max Items: 10
Detect Duplicates: true

Output: {
  items: [
    {
      title: "Article Title",
      description: "Article description...",
      link: "https://example.com/article",
      pubDate: "2024-01-15T10:30:00Z",
      author: "John Doe"
    },
    ...
  ],
  feedInfo: {
    title: "Example Blog",
    description: "Blog description",
    link: "https://example.com"
  },
  totalItems: 10
}`,
    tips: [
      'Supports RSS and Atom feed formats',
      'Max items limits number of articles returned',
      'Detect duplicates prevents same article appearing twice',
      'Timeout prevents hanging on slow feeds',
      'Use for content aggregation and monitoring',
    ],
  },

  pdf: {
    overview: 'Extract text content or metadata from PDF files. Can extract all text from PDF documents or read PDF metadata (title, author, creation date, etc.). Perfect for document processing, content extraction, or PDF analysis.',
    inputs: ['pdfUrl', 'operation', 'maxSize'],
    outputs: ['text', 'metadata', 'pageCount'],
    example: `Operation: extractText
PDF URL: https://example.com/document.pdf
Max Size: 10485760 (10 MB)

Output: {
  text: "Full text content of the PDF document...",
  pageCount: 5,
  metadata: {
    title: "Document Title",
    author: "John Doe",
    creationDate: "2024-01-15"
  }
}`,
    tips: [
      'Extract text: gets all text content from PDF',
      'Read metadata: extracts PDF properties (title, author, etc.)',
      'Supports URLs or base64-encoded PDF data',
      'Set max size to prevent memory issues',
      'Use for document processing and content analysis',
    ],
  },

  image_manipulation: {
    overview: 'Resize, crop, convert format, or extract metadata from images. Supports JPEG, PNG, WebP formats. Can preserve or remove EXIF metadata. Perfect for image processing, thumbnail generation, or format conversion workflows.',
    inputs: ['imageUrl', 'operation', 'width', 'height', 'format', 'preserveMetadata', 'maxSize'],
    outputs: ['image', 'metadata', 'dimensions'],
    example: `Operation: resize
Image URL: https://example.com/photo.jpg
Width: 800
Height: 600
Format: jpeg
Preserve Metadata: true

Output: {
  image: "base64_encoded_resized_image...",
  dimensions: {
    width: 800,
    height: 600
  },
  metadata: {...}
}`,
    tips: [
      'Resize: changes image dimensions',
      'Crop: crops image to specific size',
      'Convert format: changes image format (JPEG, PNG, WebP)',
      'Read metadata: extracts EXIF and image information',
      'Preserve metadata to keep EXIF data (enabled by default)',
    ],
  },

  // ============================================
  // CRM NODES
  // ============================================
  hubspot: {
    overview: 'Connects to HubSpot CRM to get, list, create, update, delete, search, or bulk-create contacts, companies, deals, and tickets. Only Access Token is vault-backed - Api Key and Credential Id are legacy/unused. Perfect for automating sales, marketing, and support workflows.',
    inputs: ['operation', 'resource', 'id', 'objectId', 'properties', 'records', 'searchQuery', 'limit', 'after', 'accessToken', 'apiKey', 'credentialId'],
    outputs: ['success', 'id', 'record', 'properties', 'results', 'total', 'paging', 'deleted', 'createdAt', 'updatedAt', '_error', '_errorCode', '_errorDetails'],
    example: `Resource: contact
Operation: create
Properties: {
  "email": "john@example.com",
  "firstname": "John",
  "lastname": "Doe"
}

Output: {
  success: true,
  id: "12345",
  record: {
    id: "12345",
    properties: { email: "john@example.com", firstname: "John", lastname: "Doe" }
  },
  properties: { email: "john@example.com", firstname: "John", lastname: "Doe" },
  createdAt: "2026-07-19T00:00:00Z",
  updatedAt: "2026-07-19T00:00:00Z"
}`,
    tips: [
      'Use a Private App access token (starts with pat-) or OAuth2 - both save under the same HubSpot connection and auto-fill Access Token; do not use the legacy Api Key field for new setups',
      'Only Contact, Company, Deal, and Ticket are selectable in Resource today; other HubSpot object types (product, quote, call, etc.) are runtime-supported but not in this dropdown',
      'Search uses HubSpot CRM search syntax (e.g. email:test@example.com), not a plain keyword search - it does not return a pagination cursor like Get Many does',
      'Search before Create to avoid duplicate contacts',
      'Get Many is capped at 100 records per run - use After with the previous run\'s {{$json.paging.next.after}} to fetch more',
      'Credential Id is a reserved field the execution engine never reads - manage the connection through Connections instead',
    ],
  },
  bitbucket: {
    overview: 'Manages Bitbucket repositories through the runtime override. The visible node supports only read, create, update, and delete repository operations.',
    inputs: ['operation', 'workspace', 'repoSlug', 'repo', 'username', 'appPassword', 'accessToken', 'description', 'isPrivate', 'data'],
    outputs: ['success', 'output.operation', 'output.data', 'error.code', 'error.message'],
    example: `Operation: create
Workspace: acme-platform
Repository Slug: customer-portal-api
Private Repository: true

Output: {
  success: true,
  output: {
    operation: "create",
    data: {
      slug: "customer-portal-api",
      full_name: "acme-platform/customer-portal-api"
    }
  }
}`,
    tips: [
      'Use a Bitbucket app password with Username, or use Access Token for Bearer OAuth auth',
      'Workspace is required unless Repo provides workspace/repoSlug',
      'Repo Slug is required for create, update, and delete',
      'Read lists repositories when Repo Slug is blank',
      'Data JSON replaces the default create/update payload; otherwise runtime sends scm git, is_private, and description',
    ],
  },

  salesforce: {
    overview: 'Interact with Salesforce CRM using SOQL queries, SOSL search, or CRUD/upsert/bulk operations. Supports standard objects (Account, Contact, Lead, Opportunity, etc.) and custom objects. All 11 dropdown operations are real and implemented - one of the most accurately-matched CRM nodes in this product. Instance URL is not vault-backed and must be typed on every node even after connecting Salesforce.',
    inputs: ['operation', 'resource', 'instanceUrl', 'accessToken', 'customObject', 'soql', 'sosl', 'id', 'fields', 'externalIdField', 'externalIdValue', 'records'],
    outputs: ['operation', 'resource', 'data', '_error'],
    example: `Resource: Contact
Operation: query
SOQL Query: SELECT Id, Name, Email FROM Contact WHERE Email = 'john@example.com' LIMIT 10

Output: {
  operation: "query",
  resource: "",
  data: {
    records: [
      { Id: "003xx000004TmiQAAS", Name: "John Doe", Email: "john@example.com" }
    ],
    totalSize: 1
  }
}`,
    tips: [
      'Instance URL is never auto-filled from a saved connection - type it directly (e.g. https://yourinstance.my.salesforce.com) even after connecting Salesforce',
      'Use SOQL for structured queries, SOSL for full-text search across multiple object types at once',
      'Create returns only the new record ID (not saved field values); Update returns no body at all (data is null) - use a follow-up Get to see saved data',
      'Upsert matches by an External ID field, not Salesforce\'s own record ID - data is populated only when a new record is created, null when an existing one is matched and updated',
      'Bulk Create/Update/Upsert use Salesforce\'s real Composite sObject Collections API (per-record success/failure); Bulk Delete instead loops one DELETE at a time and stops entirely if any single delete fails',
    ],
  },

  zoho_crm: {
    overview: 'Get, create, update, delete, search, or upsert Zoho CRM records via OAuth2. Built on a shared multi-service Zoho API client - only 6 of the 9 dropdown operations (get/create/update/delete/search/upsert) are actually implemented for CRM records; Get Many, Bulk Create, and Bulk Update are visible but non-functional today.',
    inputs: ['operation', 'accessToken', 'apiDomain', 'module', 'customModule', 'recordId', 'data', 'criteria', 'fields', 'page', 'per_page'],
    outputs: ['success', 'data', 'service', 'resource', 'operation', '_error'],
    example: `Module: Contacts
Operation: create
Data: {"First_Name":"John","Last_Name":"Doe","Email":"john@example.com"}

Output: {
  success: true,
  data: { data: [{ code: "SUCCESS", details: { id: "1234567890123456789" }, message: "record added successfully", status: "success" }] },
  service: "crm",
  resource: "record",
  operation: "create"
}`,
    tips: [
      'Get Many always fails with "Unknown CRM record operation: getMany" - the underlying client only recognizes the literal value "list"; use Search with broad criteria as a substitute for listing records',
      'Bulk Create and Bulk Update are unreachable through this panel - they require a different resource value the visual panel never sets, so both fail with "Unknown CRM record operation"',
      'API Domain has no effect on which region is called - confirmed from source, the client always uses the US Zoho data center regardless of this field\'s value',
      'Record ID is sent to Zoho as recordId; Records Per Page is sent as per_page - both fields were renamed from their older "id"/"perPage" keys, which the runtime never read',
      'Create/Update/Upsert only return system fields (id, created_time, modified_time) in the response, never the field values you sent - use a follow-up Get to see saved data',
    ],
  },

  pipedrive: {
    overview: 'Important: this node supports 11 real Pipedrive resources (person, organization, deal, activity, note, pipeline, stage, product, lead, file, webhook), each using its own individually-named ID and create/update fields - but the visual panel\'s generic Resource ID, Data (JSON), Search Term, and Fields inputs are never read by any of them. The real fields (like personId, dealTitle, searchTerm) must currently be set via workflow JSON or an AI-generated workflow. The "Get Many" dropdown option also never works - the real value is "list". Company Domain is fully decorative; the API client always calls the single global api.pipedrive.com address using only the API Token.',
    inputs: ['operation', 'resource', 'apiToken', 'companyDomain', 'credentialId', 'id', 'data', 'term', 'fields', 'limit', 'start'],
    outputs: ['success', 'data', '_error', '_errorDetails'],
    example: `Resource: person
Operation: get
(real personId supplied via workflow JSON, since the generic Resource ID field is never read)

Output: {
  success: true,
  data: {
    id: 1,
    name: "Alice Chen",
    email: [{ value: "alice@example.com", primary: true }]
  }
}`,
    tips: [
      'Get the API Token from Pipedrive Settings -> Personal Preferences -> API; save it once in Connections and reuse it on every Pipedrive node',
      'Company Domain has zero effect - Pipedrive\'s API client always calls https://api.pipedrive.com/v1 using only the API Token',
      'Get Many never works - set the underlying operation value to list via workflow JSON instead',
      'Every resource uses its own ID/field names (personId, dealId, personName, dealTitle, etc.) - the generic Resource ID/Data/Search Term/Fields inputs in this panel are never read for any of them',
      'Only Limit and Start are genuinely wired correctly for listing operations across resources that support them',
    ],
  },

  // ============================================
  // ADDITIONAL NODES
  // ============================================
  quickbooks: {
    overview: 'Interact with QuickBooks Online API to manage customers, invoices, payments, and accounting data. Supports CRUD operations and queries. Perfect for accounting automation, invoice processing, or financial data integration.',
    inputs: ['accessToken', 'realmId', 'resource', 'operation', 'id', 'data', 'query'],
    outputs: ['result', 'QueryResponse'],
    example: `Resource: Customer
Operation: create
Data: {
  "DisplayName": "Acme Corp",
  "PrimaryEmailAddr": {
    "Address": "contact@acme.com"
  }
}

Output: {
  result: {
    Id: "123",
    DisplayName: "Acme Corp",
    PrimaryEmailAddr: {
      Address: "contact@acme.com"
    }
  }
}`,
    tips: [
      'Get credentials from QuickBooks Developer account',
      'Realm ID is your company ID',
      'Resources: Customer, Invoice, Payment, Item, etc.',
      'Use query for filtering and searching',
      'OAuth2 authentication required',
    ],
  },

  xero: {
    overview: 'Call Xero Accounting API resources for contacts, invoices, items, payments, and accounts. Runtime requires resolved accessToken and tenantId fields, then returns normalized record/records metadata.',
    inputs: ['accessToken', 'tenantId', 'resource', 'operation', 'recordId', 'payload', 'where', 'order', 'page', 'modifiedAfter', 'summarizeErrors', 'includeArchived', 'unitdp'],
    outputs: ['success', 'resource', 'operation', 'tenantId', 'record', 'records', 'count', 'pagination', 'meta', 'error', '_error for config/request failures'],
    example: `Resource: Invoices
Operation: get_many
Where: Status=="AUTHORISED"
Order: Date DESC

Output: {
  success: true,
  resource: "invoices",
  operation: "get_many",
  record: null,
  records: [
    {InvoiceID: "inv_1042", Status: "AUTHORISED", AmountDue: 250}
  ],
  count: 1,
  pagination: {page: 1, pageSize: 1, hasMore: false},
  error: null
}`,
    tips: ['Use accessToken without the word Bearer; runtime adds it', 'Get tenantId from GET https://api.xero.com/connections after OAuth authorization', 'Create uses PUT and wraps one payload object under the plural Xero resource key', 'Xero HTTP errors return success: false with error details, not only _error', 'Use where and order only with get_many'],
  },

  workday: {
    overview: 'Call Workday REST API paths for workers, jobs, organizations, supervisory organizations, and positions. rawPath can override the standard resource path for advanced endpoints.',
    inputs: ['baseUrl', 'tenant', 'authType', 'accessToken', 'username', 'password', 'resource', 'operation', 'recordId', 'payload', 'limit', 'offset', 'rawPath'],
    outputs: ['success', 'resource', 'operation', 'tenant', 'records', 'record', 'count', 'pagination', 'meta', 'error'],
    example: `Base URL: https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant
Auth Type: oauth2
Resource: workers
Operation: get_many
Limit: 50
Offset: 0

Output: {
  success: true,
  resource: "workers",
  operation: "get_many",
  tenant: "mytenant",
  records: [{id: "worker_1042", descriptor: "Asha Rao"}],
  count: 1,
  pagination: {limit: 50, offset: 0, total: 1}
}`,
    tips: ['OAuth uses accessToken; Basic Auth uses username and password', 'Runtime does not pre-validate blank auth fields before sending the request', 'rawPath bypasses the resource path for URL construction', 'Use records for get_many and record for get_by_id/create/update', 'Workday API failures return success: false with error text'],
  },

  jwt: {
    overview: 'Create, verify, or decode JSON Web Tokens (JWT). Supports HS256, RS256, and other algorithms. Perfect for authentication, API security, or token-based authorization.',
    inputs: ['operation', 'algorithm', 'secret', 'header', 'payload', 'token'],
    outputs: ['token', 'decoded', 'valid'],
    example: `Operation: create
Algorithm: HS256
Secret: "your-secret-key"
Payload: {
  "sub": "user123",
  "exp": 1735689600,
  "iat": 1704153600
}

Output: {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNzM1Njg5NjAwLCJpYXQiOjE3MDQxNTM2MDB9.signature"
}`,
    tips: [
      'Create: generates new JWT token',
      'Verify: validates token signature and expiration',
      'Decode: extracts payload without verification',
      'HS256: symmetric algorithm (requires secret)',
      'RS256: asymmetric algorithm (requires public/private key)',
    ],
  },

  okta: {
    overview: 'Interact with Okta identity management platform. Manage users, groups, applications, and authentication. Perfect for user management automation, SSO integration, or identity provider workflows.',
    inputs: ['domain', 'apiToken', 'resource', 'operation', 'id', 'data'],
    outputs: ['result', 'profile'],
    example: `Resource: users
Operation: create
Data: {
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "login": "john@example.com"
  }
}

Output: {
  result: {
    id: "00u1234567890abcdef",
    profile: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com"
    }
  }
}`,
    tips: [
      'Domain: your-org.okta.com',
      'Get API token from Okta Admin Console',
      'Resources: users, groups, applications, factors',
      'Profile contains user attributes',
      'Use for user provisioning and management',
    ],
  },

  keycloak: {
    overview: 'Interact with Keycloak identity and access management. Manage users, roles, clients, and authentication. Perfect for SSO automation, user management, or Keycloak administration workflows.',
    inputs: ['serverUrl', 'realm', 'clientId', 'clientSecret', 'resource', 'operation', 'id', 'data'],
    outputs: ['result', 'access_token'],
    example: `Server URL: https://keycloak.example.com
Realm: master
Resource: users
Operation: create
Data: {
  "username": "john",
  "email": "john@example.com",
  "enabled": true
}

Output: {
  result: {
    id: "12345678-1234-1234-1234-123456789012",
    username: "john",
    email: "john@example.com"
  }
}`,
    tips: [
      'Server URL: your Keycloak server address',
      'Realm: authentication realm name',
      'Client ID and Secret for authentication',
      'Resources: users, roles, clients, groups',
      'Use for identity management automation',
    ],
  },

  // ============================================
  // AI AGENT NODES
  // ============================================
  meeting_notes_agent: {
    overview: 'AI agent that extracts structured meeting notes from transcripts. Identifies agenda items, decisions made, and action items. Perfect for automating meeting documentation, note-taking workflows, or meeting summary generation.',
    inputs: ['apiKey', 'model', 'prompt', 'meetingTranscript', 'temperature'],
    outputs: ['agenda', 'decisions', 'notes', 'actionItems'],
    example: `Meeting Transcript: "In today's meeting, we discussed Q4 goals. John agreed to finish the project by Friday. Decision: Launch next week."
Temperature: 0.5

Output: {
  agenda: ["Q4 Goals", "Project Timeline"],
  decisions: ["Launch next week"],
  notes: "Discussed Q4 goals and project timeline...",
  actionItems: [
    {
      task: "Finish project",
      owner: "John",
      deadline: "Friday"
    }
  ]
}`,
    tips: [
      'Extracts structured data from unstructured transcripts',
      'Identifies agenda items, decisions, and action items',
      'Temperature 0.5 recommended for balanced extraction',
      'Use for automated meeting documentation',
      'Customize prompt for specific meeting formats',
    ],
  },

  action_items_extractor: {
    overview: 'AI agent that extracts action items (tasks, owners, deadlines) from text. Perfect for task management automation, email processing, or document analysis workflows.',
    inputs: ['apiKey', 'model', 'prompt', 'text', 'temperature'],
    outputs: ['actionItems'],
    example: `Text: "John will complete the report by Friday. Sarah should review the proposal. Mike needs to schedule the meeting."
Temperature: 0.5

Output: {
  actionItems: [
    {
      task: "Complete the report",
      owner: "John",
      deadline: "Friday"
    },
    {
      task: "Review the proposal",
      owner: "Sarah",
      deadline: null
    },
    {
      task: "Schedule the meeting",
      owner: "Mike",
      deadline: null
    }
  ]
}`,
    tips: [
      'Extracts tasks, owners, and deadlines from text',
      'Handles natural language descriptions',
      'Temperature 0.5 recommended for consistent extraction',
      'Use for task management automation',
      'Can extract from emails, documents, or messages',
    ],
  },

  workflow_planner_agent: {
    overview: 'AI agent that analyzes requirements and generates workflow plans. Creates step-by-step workflows based on goals and constraints. Perfect for workflow automation planning or intelligent workflow generation.',
    inputs: ['apiKey', 'model', 'prompt', 'requirements', 'temperature'],
    outputs: ['workflow', 'steps', 'recommendations'],
    example: `Requirements: "Send email notification when new order is created"
Temperature: 0.3

Output: {
  workflow: {
    steps: [
      {
        step: 1,
        node: "webhook",
        description: "Trigger on new order"
      },
      {
        step: 2,
        node: "email_resend",
        description: "Send notification email"
      }
    ]
  },
  recommendations: ["Add error handling", "Include order details in email"]
}`,
    tips: [
      'Generates workflow plans from requirements',
      'Provides step-by-step instructions',
      'Temperature 0.3 recommended for planning tasks',
      'Use for workflow automation planning',
      'Customize prompt for specific workflow patterns',
    ],
  },

  // ============================================
  // DATABASE NODES
  // ============================================
  postgresql: {
    overview: 'Run PostgreSQL executeQuery, insert, update, or delete through the real database executor. The visual panel now uses runtime operation values and Parameters maps to the executor parameter array.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'ssl', 'operation', 'query', 'parameters', 'table', 'data', 'where', 'connectionString (schema-visible but not directly read by the executor)'],
    outputs: ['rows', 'rowsAffected', 'inserted', 'count', '_error'],
    example: `Operation: executeQuery
Query: SELECT id, email FROM customers WHERE status = $1 LIMIT 50
Parameters: ["active"]

Output: {
  rows: [
    {id: 101, email: "alex@example.com", status: "active"}
  ],
  rowsAffected: 1
}`,
    tips: [
      'Use executeQuery for raw SQL with $1, $2 placeholders and Parameters as a JSON array.',
      'Insert returns inserted/count; update and delete return rows/rowsAffected because PostgreSQL uses RETURNING *.',
      'The backend schema still lists connectionString, but the executor validates host, username, password, database, port, and ssl.',
      'Update and delete require Where; the executor refuses missing where clauses.',
      'Store database passwords in Connections rather than ordinary workflow fields.',
    ],
  },

  db: {
    overview: 'Use the canonical Supabase node to run Supabase SDK operations. Runtime supports select, insert, update, delete, and rpc; the old Raw SQL query option is not executed by this node.',
    inputs: ['url', 'anonKey', 'serviceRoleKey', 'schema', 'operation', 'table', 'columns', 'filters', 'filter', 'limit', 'order', 'data', 'functionName', 'params'],
    outputs: ['rows', 'inserted', 'count', 'result', '_error'],
    example: `Operation: select
Table: users
Filters: {"status": "active"}
Limit: 10

Output: {
  rows: [
    {id: 1, name: "John", status: "active"},
    {id: 2, name: "Jane", status: "active"}
  ],
  rowsAffected: 2
}`,
    tips: [
      'Use url plus anonKey or serviceRoleKey from Supabase project settings',
      'Use select, insert, update, delete, or rpc; query is unsupported here',
      'Use order as JSON, for example {"column":"created_at","ascending":false}',
      'Insert returns inserted/count; update and delete return rows/count',
      'Use PostgreSQL nodes if you need raw SQL text',
    ],
  },

  supabase: {
    overview: 'Legacy guide key for older Supabase references. The UI-visible canonical node type is db.',
    inputs: ['See db'],
    outputs: ['rows', 'inserted', 'count', 'result', '_error'],
    example: `Use node type: db
Operation: select
Table: users

Output: {
  rows: [{id: 1, status: "active"}],
  count: 1
}`,
    tips: [
      'Prefer the db node guide for active workflows',
      'Raw SQL query is not supported by the db runtime',
      'Use PostgreSQL for raw SQL workflows',
    ],
  },

  mysql: {
    overview: 'Run MySQL executeQuery, insert, update, or delete through the real mysql2 executor. The old select-only table/filter UI was not what the runtime used.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'ssl', 'operation', 'query', 'parameters', 'table', 'data', 'where'],
    outputs: ['rows', 'rowsAffected', 'inserted', 'count', '_error'],
    example: `Operation: executeQuery
Query: SELECT id, email FROM customers WHERE status = ? LIMIT 50
Parameters: ["active"]

Output: {
  rows: [
    {id: 101, email: "alex@example.com", status: "active"}
  ],
  rowsAffected: 0
}`,
    tips: [
      'Use executeQuery for raw SQL with ? placeholders and Parameters as a JSON array.',
      'Insert returns inserted/count; update and delete return rowsAffected.',
      'Update and delete require Where; the executor refuses missing where clauses.',
      'Use least-privilege MySQL users: read-only for reports, writer only when needed.',
      'Store database passwords in Connections rather than ordinary workflow fields.',
    ],
  },

  oracle_database: {
    overview: 'Run Oracle Database select, insert, update, insert_or_update, delete, or execute_sql through node-oracledb. Table operations require Schema and Table; execute_sql requires Statement and rejects a trailing semicolon.',
    inputs: ['user', 'password', 'connectionString', 'operation', 'schema', 'table', 'columnMappings', 'selectRows', 'combineConditions', 'sort', 'returnAll', 'limit', 'deleteCommand', 'statement', 'bindParams', 'autoCommit', 'outputColumns'],
    outputs: ['success', 'operation', 'schema', 'table', 'rows', 'rowsAffected', 'meta', 'warning', 'error'],
    example: `Operation: select
Schema: HR
Table: EMPLOYEES
Row Filters: [{"column":"STATUS","operator":"=","value":"ACTIVE"}]
Limit: 50

Output: {
  success: true,
  operation: "select",
  rows: [{EMPLOYEE_ID: 101, STATUS: "ACTIVE"}],
  rowsAffected: 1,
  meta: {returnedAll: false, limit: 50}
}`,
    tips: [
      'Use bind parameters such as :id in execute_sql; never string-interpolate values into SQL.',
      'Do not end execute_sql statements with a semicolon; the executor rejects that before running.',
      'Update without Row Filters is blocked to avoid accidental all-row updates.',
      'insert_or_update uses Row Filters as MERGE match keys.',
      'Delete Command truncate/drop is irreversible and should come from a DBA-approved runbook.',
    ],
  },

  pinecone: {
    overview: 'Store, query, and delete embedding vectors in a Pinecone index. Query returns matches with metadata, upsert returns upsertedCount, and delete returns a successful empty match list.',
    inputs: ['operation', 'index', 'apiKey', 'vector', 'topK', 'id', 'metadata', 'namespace'],
    outputs: ['success', 'operation', 'matches', 'upsertedCount', 'error'],
    example: `Operation: query
Index: https://support-kb-abcd123.svc.us-east-1-aws.pinecone.io
Vector: {{$json.embedding}}
Top K: 5

Output: {
  success: true,
  operation: "query",
  matches: [{id: "kb-returns-policy-0003", score: 0.92, metadata: {title: "Returns Policy"}}],
  upsertedCount: 0
}`,
    tips: [
      'Use the full index host URL for serverless Pinecone indexes.',
      'Vector must match the index dimension exactly.',
      'Use stable IDs for upsert so re-indexing updates the same vector instead of creating duplicates.',
      'Store API keys in Connections or a credential vault.',
      'Use namespaces to separate tenants, environments, or source systems.',
    ],
  },

  qdrant: {
    overview: 'Search, upsert, and delete embedding vectors in Qdrant collections. The UI value for Query/Search is now query, matching the runtime; the old search/get_collection values were not supported by the executor.',
    inputs: ['operation', 'url', 'collection', 'apiKey', 'vector', 'limit', 'withPayload', 'id', 'payload'],
    outputs: ['success', 'operation', 'matches', 'upsertedCount', 'error'],
    example: `Operation: query
URL: https://support-search.us-east.aws.cloud.qdrant.io
Collection: support_articles
Vector: {{$json.embedding}}
Limit: 5

Output: {
  success: true,
  operation: "query",
  matches: [{id: "kb-returns-policy-0003", score: 0.91, payload: {title: "Returns Policy"}}],
  upsertedCount: 0
}`,
    tips: [
      'Qdrant Cloud usually requires an API key; self-hosted local Qdrant may not.',
      'Vector length must match the collection vector size.',
      'Upsert can auto-create a missing collection with Cosine distance when Vector is supplied.',
      'Always set Point ID for upsert; otherwise the current runtime can fall back to point 1.',
      'Use Include Payload when downstream AI steps need document titles, URLs, or IDs.',
    ],
  },

  mongodb: {
    overview: 'Run MongoDB driver operations against one collection. The visible panel exposes find, insertOne, updateOne, and deleteOne; generated config can also use insertMany, updateMany, deleteMany, and aggregate.',
    inputs: ['connectionString', 'host', 'database', 'operation', 'collection', 'filter', 'projection', 'sort', 'limit', 'skip', 'document', 'documents', 'update', 'pipeline', 'options'],
    outputs: ['documents', 'count', 'insertedId', 'insertedCount', 'matchedCount', 'modifiedCount', 'deletedCount', 'acknowledged', '_error'],
    example: `Collection: users
Filter: {"status": "active", "age": {"$gte": 18}}
Limit: 10

Output: {
  documents: [
    {_id: "123", name: "John", status: "active", age: 25},
    {_id: "456", name: "Jane", status: "active", age: 30}
  ],
  count: 2
}`,
    tips: [
      'Use Filter, not legacy Query; the runtime does not read a query field',
      'Find and aggregate return documents/count',
      'Insert returns insertedId or insertedIds and insertedCount',
      'Update returns matchedCount/modifiedCount/upserted fields',
      'Delete returns deletedCount and acknowledged',
    ],
  },

  firebase: {
    overview: 'Run Firebase Admin SDK operations for Firestore documents/collections and Realtime Database paths. Object data can be flattened to top-level output by the database wrapper.',
    inputs: ['projectId', 'clientEmail', 'privateKey', 'operation', 'collection', 'documentId', 'data', 'filter', 'limit', 'databaseUrl'],
    outputs: ['documentId', 'data', 'count', 'deleted', 'path', '_error'],
    example: `Operation: query
Collection: users
Filter: {"status": "active"}
Limit: 100

Output: {
  data: [
    {id: "user_123", email: "john@example.com", status: "active"}
  ],
  count: 1
}`,
    tips: [
      'Uses Firebase service account credentials, not a Firebase web API key',
      'Firestore operations use collection; Realtime operations use collection as the path',
      'Get/update/delete require documentId',
      'Add/update/realtime_set require data',
      'Realtime operations require databaseUrl',
    ],
  },

  google_cloud_storage: {
    overview: 'Upload, download, delete, and list objects in a Google Cloud Storage bucket using service account credentials.',
    inputs: ['projectId', 'clientEmail', 'privateKey', 'operation', 'bucket', 'fileName', 'fileContent', 'filter'],
    outputs: ['fileName', 'fileSize', 'data', 'deleted', 'count', '_error'],
    example: `Operation: upload
Bucket: company-uploads
File Name: invoices/inv-1001.txt
File Content: Paid invoice text

Output: {
  fileName: "invoices/inv-1001.txt",
  fileSize: 17
}`,
    tips: [
      'Uses service account projectId/clientEmail/privateKey',
      'Upload requires fileName and fileContent',
      'Download and delete require fileName',
      'List uses filter as an optional object-name prefix',
      'Download returns UTF-8 string content in data',
    ],
  },

  airtable: {
    overview: 'List, get, create, update, upsert, and delete Airtable records. The resource dropdown is visual only; runtime implements record operations, not table-management APIs.',
    inputs: ['apiKey', 'accessToken', 'baseId', 'table', 'tableId', 'resource', 'operation', 'recordId', 'recordIds', 'records', 'fields', 'matchField', 'filterByFormula', 'view', 'maxRecords', 'pageSize', 'sort', 'typecast'],
    outputs: ['records', 'count', 'id', 'fields', 'deletedRecords', 'created', 'updated', '_error'],
    example: `Operation: create
Base ID: app123
Table: Leads
Records: [
  {
    "fields": {
      "Name": "John Doe",
      "Email": "john@example.com"
    }
  }
]

Output: {
  records: [
    {
      id: "rec123",
      fields: {
        Name: "John Doe",
        Email: "john@example.com"
      }
    }
  ],
  count: 1
}`,
    tips: [
      'Use a Personal Access Token with data.records scopes or a saved Airtable connection',
      'Base ID plus table/tableId are required for every operation',
      'Create/update/upsert return records/count',
      'Upsert also returns created and updated counts',
      'Delete returns deletedRecords/count, not top-level deleted:true',
    ],
  },

  // ============================================
  // DEVOPS NODES
  // ============================================
  github: {
    overview: 'Interact with GitHub through the connected GitHub account/token manager to manage repositories, issues, pull requests, branches, commits, releases, workflows, and contributors.',
    inputs: ['operation', 'owner', 'repo', 'title', 'body', 'workflowId', 'ref', 'issueNumber', 'prNumber', 'state', 'comment', 'mergeMethod', 'branchName', 'sha', 'commitMessage', 'filePath', 'fileContent', 'tagName', 'releaseName', 'releaseBody', 'releaseId', 'commitSha'],
    outputs: ['success', 'provider', 'action', 'top-level GitHub response fields', '_error'],
    example: `Operation: create_issue
Owner: octocat
Repo: Hello-World
Title: "Bug in login"
Body: "Login button not working"

Output: {
  success: true,
  provider: "github",
  action: "issues.create",
  number: 123,
  title: "Bug in login",
  state: "open",
  html_url: "https://github.com/octocat/Hello-World/issues/123"
}`,
    tips: [
      'Connect GitHub in Connections; runtime retrieves the token from the connected account',
      'Owner is username or organization name, Repo is only the repository slug',
      'Successful output spreads GitHub response fields at the top level, not under data',
      'No connected token returns _error: github node: No github token found',
      'Use Workflow ID as the YAML filename such as deploy.yml for Actions dispatch',
    ],
  },

  gitlab: {
    overview: 'Read GitLab issues or create a new GitLab issue. This action node is issue-only today; it does not run merge request, pipeline, branch, file, or release operations.',
    inputs: ['operation', 'accessToken', 'baseUrl', 'projectId', 'issueIid', 'title', 'descriptionText'],
    outputs: ['success', 'items', 'issue', 'created', '_error', '_errorDetails'],
    example: `Operation: create_issue
Project ID: 12345
Title: "Feature request"
Description Text: "Add the export button to the billing dashboard"

Output: {
  success: true,
  created: {
    iid: 1,
    title: "Feature request",
    state: "opened"
  }
}`,
    tips: [
      'Connect GitLab in Connections or provide accessToken; runtime reads accessToken, not token',
      'Base URL must be the API root such as https://gitlab.com/api/v4',
      'Read lists issues when issueIid is blank and gets one issue when issueIid is filled',
      'Create Issue requires title and reads descriptionText, not the old description field',
      'Unsupported operation values return an _error that names create and read as the supported operations',
    ],
  },

  docker: {
    overview: 'Connects to Docker to manage containers and images. Supports listing, building, tagging, pulling, pushing, and container lifecycle actions. Ideal for DevOps automation and repeatable environments.',
    inputs: ['host', 'port', 'operation', 'containerId', 'imageName', 'dockerfilePath', 'buildContext', 'tag', 'sourceTag', 'registry', 'registryUsername', 'registryPassword'],
    outputs: ['result', 'containers', 'images', 'logs'],
    example: `Operation: list_containers
Host: localhost
Port: 2375

Output: {
  containers: [
    {
      id: "abc123",
      name: "my-container",
      status: "running",
      image: "nginx:latest"
    }
  ]
}`,
    tips: [
      'Host can be a local socket or TCP host',
      'Port 2375 = TCP, 2376 = TLS',
      'Use container name or ID for container actions',
      'Build image uses Dockerfile path + context',
      'Push/Pull require registry credentials if private',
    ],
  },

  kubernetes: {
    overview: 'Connects to a Kubernetes cluster to list, deploy, scale, restart, and inspect workloads. Ideal for CI/CD automation and cluster management.',
    inputs: ['apiServer', 'token', 'namespace', 'operation', 'resourceName', 'deploymentManifest', 'replicas'],
    outputs: ['result', 'pods', 'deployments', 'services', 'logs'],
    example: `Operation: list_pods
Namespace: default
API Server: https://kubernetes.example.com:6443

Output: {
  pods: [
    {
      name: "my-pod",
      namespace: "default",
      status: "Running",
      ready: true
    }
  ]
}`,
    tips: [
      'Use kubeconfig or service account token',
      'Namespace defaults to "default"',
      'Use list operations to confirm resource names',
      'Scale and restart apply to deployments',
      'Validate manifests before creating resources',
    ],
  },

  jenkins: {
    overview: 'Trigger a Jenkins job, read build status, or stop a running build. The runtime uses Jenkins Basic Auth with username and apiToken and wraps failures as JENKINS_FAILED.',
    inputs: ['operation', 'baseUrl', 'username', 'apiToken', 'jobName', 'buildNumber', 'parameters'],
    outputs: ['success', 'output.operation', 'output.jobName', 'output.data', 'error.code', 'error.message'],
    example: `Operation: build
Base URL: https://jenkins.example.com
Job Name: my-job
Parameters: {"BRANCH": "main"}

Output: {
  success: true,
  output: {
    operation: "build",
    jobName: "my-job",
    data: {
      queued: true,
      location: "https://jenkins.example.com/queue/item/123/"
    }
  }
}`,
    tips: [
      'Use apiToken; the old token field is not read by this runtime',
      'Operation values are build, status, and cancel',
      'Status uses lastBuild when buildNumber is blank',
      'Cancel requires buildNumber because Jenkins needs an exact build to stop',
      'Parameters must be a JSON object for /buildWithParameters; leave it blank for a normal /build call',
    ],
  },

  vercel: {
    overview: 'Deploy a Vercel project or list recent deployments through the Vercel v13 deployments API. Successful output is under data and validation failures use structured error codes.',
    inputs: ['operation', 'projectName', 'token'],
    outputs: ['success', 'data.deploymentId', 'data.deployments', 'data.total', 'error.code', 'error.message'],
    example: `Operation: deploy
Project Name: marketing-site

Output: {
  success: true,
  data: {
    deploymentId: "dpl_123",
    projectName: "marketing-site",
    url: "marketing-site.vercel.app",
    status: "READY",
    createdAt: "2026-07-20T10:30:00.000Z"
  },
  error: null
}`,
    tips: [
      'Connect Vercel in Connections or provide token; runtime can read the saved vercel credential',
      'Deploy requires projectName; list_deployments does not',
      'Invalid operation values return INVALID_OPERATION',
      'Missing or badly formatted tokens return MISSING_TOKEN or INVALID_TOKEN_FORMAT',
      'The node does not preserve incoming fields on success',
    ],
  },

  netlify: {
    overview: 'List Netlify sites, inspect a site or deploy, create a deploy, or list deploys for a site. Forms are not returned by this executor today.',
    inputs: ['operation', 'resource', 'accessToken', 'siteId', 'deployId', 'payload', 'limit'],
    outputs: ['success', 'resource', 'operation', 'record', 'records', 'count', 'meta', 'error'],
    example: `Operation: list_sites
Access Token: nfp_...

Output: {
  success: true,
  resource: "sites",
  operation: "list_sites",
  records: [
    { id: "site_123", name: "marketing-site" }
  ],
  count: 1
}`,
    tips: [
      'Use a Netlify personal access token in accessToken or a saved Netlify connection',
      'Supported operations are list_sites, get_site, create_deploy, list_deploys, and get_deploy',
      'siteId is required for get_site, create_deploy, and list_deploys',
      'deployId is required for get_deploy',
      'payload must be a JSON object for create_deploy',
    ],
  },

  pagerduty: {
    overview: 'Creates and manages PagerDuty incidents, acknowledgments, resolutions, and on-call lookups. Ideal for alert automation and incident response workflows.',
    inputs: ['apiKey', 'operation', 'incidentId', 'title', 'serviceId', 'urgency', 'status', 'escalationPolicyId', 'assigneeId', 'note', 'scheduleId'],
    outputs: ['result', 'incidents', 'onCallSchedules'],
    example: `Operation: create_incident
API Key: your-api-key
Service ID: PABC123
Title: "Service Down"
Urgency: high

Output: {
  result: {
    id: "QWER456",
    title: "Service Down",
    status: "triggered"
  }
}`,
    tips: [
      'Use API token with incident permissions',
      'Service ID is required for Create Incident',
      'Incident ID is required for acknowledge/resolve',
      'Use notes to add context to updates',
      'List schedules or on-calls for routing',
    ],
  },

  datadog: {
    overview: 'Interact with Datadog API to query metrics, events, logs, and monitors. Supports time-series queries, event creation, and monitor management. Perfect for monitoring automation, metric analysis, or Datadog integration.',
    inputs: ['apiKey', 'appKey', 'operation', 'query', 'data'],
    outputs: ['result', 'metrics', 'events', 'logs'],
    example: `Operation: query_metrics
Query: "avg:system.cpu.usage{*}"
Time Range: "1h"

Output: {
  result: {
    series: [
      {
        pointlist: [[1234567890, 45.5], [1234567900, 46.2]],
        metric: "system.cpu.usage"
      }
    ]
  }
}`,
    tips: [
      'Get API key and App key from Datadog Settings â†’ API Keys',
      'Supports metrics, events, logs, monitors',
      'Query metrics using Datadog query syntax',
      'Use for monitoring automation and analysis',
      'Create events and manage monitors programmatically',
    ],
  },

  sentry: {
    overview: 'Interact with Sentry API to manage projects, issues, events, and releases. Supports querying errors, creating releases, and managing projects. Perfect for error tracking automation or Sentry integration.',
    inputs: ['authToken', 'organization', 'project', 'operation', 'data'],
    outputs: ['result', 'issues', 'events', 'releases'],
    example: `Operation: list_issues
Organization: my-org
Project: my-project

Output: {
  issues: [
    {
      id: "issue_id",
      title: "Error in login",
      level: "error",
      count: 10
    }
  ]
}`,
    tips: [
      'Get auth token from Sentry Settings â†’ Auth Tokens',
      'Organization and project slug required',
      'Supports issues, events, releases management',
      'Use for error tracking automation',
      'Query issues and events programmatically',
    ],
  },

  // ============================================
  // PRODUCTIVITY NODES
  // ============================================
  asana: {
    overview: 'Interact with Asana API to manage projects, tasks, subtasks, and teams. Supports creating tasks, updating status, assigning tasks, and managing projects. Perfect for project management automation or Asana integration.',
    inputs: ['accessToken', 'workspace', 'project', 'operation', 'data'],
    outputs: ['result', 'tasks', 'projects'],
    example: `Operation: create_task
Project: 12345
Data: {
  "name": "Complete report",
  "assignee": "user@example.com",
  "due_on": "2024-01-20"
}

Output: {
  result: {
    gid: "task_id",
    name: "Complete report",
    completed: false
  }
}`,
    tips: [
      'Get access token from Asana Developer Console',
      'Workspace and project IDs required',
      'Supports tasks, projects, teams management',
      'Use for project management automation',
      'Create, update, assign tasks programmatically',
    ],
  },

  trello: {
    overview: 'Manage Trello boards, lists, cards, labels, movement, and checklists through the Trello REST API. Prefer a saved Trello API Key and Token connection; node fields are fallbacks.',
    inputs: ['operation', 'apiKey', 'token', 'boardId', 'listId', 'cardId', 'cardName', 'cardDesc', 'dueDate', 'idLabels', 'idMembers', 'newListId', 'checklistName'],
    outputs: ['success', 'operation', 'data', 'card', 'cards', 'boards', 'lists', 'labels', 'count', 'error'],
    example: `Operation: create_card
List ID: {{$json.lists[0].id}}
Card Name: {{$json.title}}
Card Description: {{$json.description}}

Output: {
  success: true,
  operation: "create_card",
  card: { id: "card_id", name: "New task", idList: "list456" },
  data: { id: "card_id", name: "New task" }
}`,
    tips: [
      'Run get_boards, then get_lists, before creating or moving cards if you do not know the IDs',
      'create_card requires listId and cardName',
      'cardId is required for get_card, update_card, delete_card, move_card, add_label, and add_checklist',
      'add_label requires comma-separated label IDs, not label names',
      'Runtime preserves incoming fields and adds normalized card/cards/boards/lists/count fields where applicable',
    ],
  },

  linear: {
    overview: 'Create, update, fetch, and list Linear issues and teams through the Linear GraphQL API. Prefer a saved Linear Personal API Key connection.',
    inputs: ['operation', 'apiKey', 'teamId', 'issueId', 'title', 'description', 'stateId', 'priority'],
    outputs: ['success', 'operation', 'data', 'issue', 'issues', 'teams', 'count', 'error'],
    example: `Operation: create_issue
Team ID: {{$json.teams[0].id}}
Title: {{$json.title}}
Description: {{$json.summary}}

Output: {
  success: true,
  operation: "create_issue",
  issue: { id: "issue_uuid", identifier: "ENG-124", url: "https://linear.app/acme/issue/ENG-124" }
}`,
    tips: [
      'Run get_teams first if you need the team UUID for create_issue',
      'create_issue requires teamId and title',
      'get_issue and update_issue require issueId',
      'priority is numeric: 0 none, 1 urgent, 2 high, 3 medium, 4 low',
      'Runtime preserves incoming fields and adds issue/issues/teams/count depending on the operation',
    ],
  },

  typeform: {
    overview: 'Retrieve Typeform responses, create a basic titled form, or fetch a form definition. The runtime supports get_responses, create_form, and get_form; it does not support get_forms.',
    inputs: ['operation', 'apiKey', 'formId', 'title'],
    outputs: ['success', 'operation', 'data', 'items', 'totalItems', 'formId', 'error'],
    example: `Operation: get_responses
Form ID: {{$json.formId}}

Output: {
  success: true,
  operation: "get_responses",
  items: [{ response_id: "rsp_123", answers: [] }],
  totalItems: 1,
  formId: "abc123"
}`,
    tips: [
      'Save a Typeform Personal Access Token in Connections',
      'get_responses and get_form require formId',
      'create_form requires title and currently sends only the title',
      'Old get_forms workflow configs are unsupported and return success false',
      'Runtime preserves incoming fields and adds items/totalItems/formId when Typeform returns them',
    ],
  },

  todoist: {
    overview: 'Interact with Todoist API to manage tasks, projects, labels, and comments. Supports creating tasks, updating status, completing tasks, and managing projects. Perfect for task automation or Todoist integration.',
    inputs: ['apiToken', 'operation', 'projectId', 'data'],
    outputs: ['result', 'tasks', 'projects'],
    example: `Operation: create_task
Project ID: 1234567890
Data: {
  "content": "Buy groceries",
  "due_string": "tomorrow",
  "priority": 4
}

Output: {
  result: {
    id: 12345,
    content: "Buy groceries",
    completed: false
  }
}`,
    tips: [
      'Get API token from Todoist Settings â†’ Integrations â†’ Developer',
      'Project ID required for project-specific tasks',
      'Supports tasks, projects, labels, comments',
      'Use for task automation and reminders',
      'Due dates support natural language (tomorrow, next week)',
    ],
  },

  notion: {
    overview: 'Read, create, update, archive, restore, query, search, and manage Notion pages, databases, blocks, users, and comments. The runtime resolves Notion OAuth from Connections and returns raw Notion data under data.',
    inputs: ['resource', 'operation', 'pageId', 'databaseId', 'blockId', 'userId', 'parentPageId', 'title', 'content', 'children', 'properties', 'query', 'schema', 'richText', 'parentDiscussionId', 'searchQuery', 'filter', 'sort', 'pageSize', 'returnAll', 'isInline'],
    outputs: ['success', 'data', '_error', '_errorDetails'],
    example: `Resource: database
Operation: query
Database ID: {{$json.databaseId}}
Query: {"filter":{"property":"Status","select":{"equals":"Done"}}}

Output: {
  success: true,
  data: { object: "list", results: [{ object: "page", id: "page_id" }] }
}`,
    tips: [
      'Connect Notion in Connections and share the target page or database with the connected account/integration',
      'Valid resource-operation pairs matter; mismatches return _error',
      'Search uses sort, not the old sorts key',
      'Comment get is not supported by this runtime; use comment list by pageId or blockId',
      'Successful output is in data, often data.results for list/query/search operations',
    ],
  },

  clickup: {
    overview: 'Interact with ClickUp tasks and workspace discovery APIs. The node creates/updates/reads/deletes tasks, lists tasks, adds comments, updates status, and discovers teams, spaces, folders, and lists.',
    inputs: ['operation', 'workspaceId', 'spaceId', 'folderId', 'listId', 'taskId', 'name', 'description', 'status', 'priority', 'assignees', 'dueDate', 'commentText', 'includeClosed'],
    outputs: ['raw ClickUp data', 'id', 'name', 'url', '_statusSkipped', '_statusNote', '_error'],
    example: `Operation: create_task
List ID: 901614760992
Task Name: Follow up with Acme trial signup
Due Date: 1735689600000

Output: {
  id: "86d31vafd",
  name: "Follow up with Acme trial signup",
  status: {"status": "to do"},
  url: "https://app.clickup.com/t/86d31vafd"
}`,
    tips: [
      'Prefer a saved ClickUp connection; runtime also recognizes apiKey/apiToken/token credential aliases',
      'Use Get Teams, Get Spaces, Get Folders, and Get Lists to discover IDs before creating tasks',
      'create_task requires List ID and Task Name',
      'Status must exactly match a status in the target list; invalid status can be skipped after a retry',
      'Assignees must be a JSON array of ClickUp user IDs',
    ],
  },

  monday: {
    overview: 'Interact with Monday.com API to manage boards, groups, items, and columns. Supports creating items, updating column values, and managing boards. Perfect for project management automation or Monday.com integration.',
    inputs: ['apiToken', 'boardId', 'operation', 'data'],
    outputs: ['result', 'items', 'boards', 'groups'],
    example: `Operation: create_item
Board ID: 1234567890
Group ID: new_group
Data: {
  "item_name": "New item",
  "column_values": {
    "status": {"label": "Working on it"}
  }
}

Output: {
  result: {
    id: "item_id",
    name: "New item",
    board: {"id": "1234567890"}
  }
}`,
    tips: [
      'Get API token from Monday.com Account â†’ Admin â†’ API',
      'Board ID and Group ID required',
      'Supports items, boards, groups, columns',
      'Use for project management automation',
      'Update column values and create items programmatically',
    ],
  },

  jira: {
    overview: 'Create, read, update, delete, search, transition, and comment on Jira Cloud issues. The node uses a Jira API-token connection and preserves incoming fields while adding operation-specific Jira fields.',
    inputs: ['operation', 'domain', 'projectKey', 'issueKey', 'summary', 'description', 'issueType', 'assignee', 'priority', 'labels', 'transitionId', 'commentBody', 'jql', 'maxResults'],
    outputs: ['success', 'issueKey', 'issueId', 'issue', 'issues', 'projects', 'comment', 'updated', 'deleted', 'transitioned', '_error'],
    example: `Operation: create_issue
Domain: acme.atlassian.net
Project Key: PROJ
Summary: "Bug in login"
Description: "Login button is not responding for finance users"
Issue Type: Bug

Output: {
  success: true,
  issueKey: "PROJ-1",
  issueId: "10000",
  created: true
}`,
    tips: [
      'Domain is the Atlassian host such as acme.atlassian.net; the runtime also accepts baseUrl aliases',
      'Email and API token usually come from the saved Jira connection',
      'Create Issue requires projectKey and summary',
      'Search Issues requires jql and calls the Jira Cloud /rest/api/3/search/jql endpoint',
      'Description and comments are converted to Atlassian Document Format before sending',
    ],
  },

  // ============================================
  // SOCIAL MEDIA NODES
  // ============================================
  facebook: {
    overview: 'Use a saved Facebook OAuth connection to list managed Pages, send Messenger text, and create comment replies. The broader visible Graph API options are scaffolded and return _error until handlers are implemented.',
    inputs: ['resource', 'operation', 'pageId', 'message', 'text', 'recipientId', 'postId', 'commentId', 'replyText', 'limit'],
    outputs: ['success', 'provider', 'action', 'pages', 'count', 'messageId', 'commentId', 'raw', '_error'],
    example: `Resource: page
Operation: list
Limit: 25

Output: {
  success: true,
  provider: "facebook",
  action: "page.getAllPages",
  pages: [{ id: "123456789012345", name: "Acme Support" }],
  count: 1
}`,
    tips: [
      'Implemented pairs today: page/list, page_message/sendTextMessage, and comment/createComment',
      'Run page/list first to discover Page IDs from {{$json.pages}}',
      'sendTextMessage requires pageId, recipientId, and message or text',
      'createComment requires commentId or postId, plus reply text',
      'createPost, media, insights, lead, event, and album operations are scaffolded and return not-yet-implemented errors',
    ],
  },

  twitter: {
    overview: 'Use a saved Twitter/X OAuth connection to publish and read tweets, search posts, manage users/lists/media/DMs, and inspect Spaces. Successful runtime output preserves object input and spreads raw X API response fields at the top level.',
    inputs: ['resource', 'operation', 'text', 'tweetId', 'tweetIds', 'mediaIds', 'userId', 'username', 'query', 'listId', 'mediaData', 'mediaId', 'recipientId', 'spaceId', 'maxResults', 'returnAll'],
    outputs: ['data', 'meta', 'includes', 'errors', 'id', 'media_id', 'event', '_error', '_errorDetails'],
    example: `Resource: search
Operation: recent
Query: "workflow automation" -is:retweet
Max Results: 10

Output: {
  data: [{ id: "1749876543210", text: "Workflow automation update" }],
  meta: { result_count: 1 }
}`,
    tips: [
      'Connect Twitter/X in Connections; the runtime resolves OAuth access from the credential vault',
      'Resource and Operation must be a valid pair, such as tweet/create, user/getMe, search/recent, media/upload, directMessage/send, or space/search',
      'Tweet IDs come from /status/<id> URLs or previous X API results',
      'Full archive search (operation all) requires elevated X developer access',
      'On failure the node returns _error instead of a success wrapper',
    ],
  },

  linkedin: {
    overview: 'Use LinkedIn OAuth to get your profile, read recent posts, publish personal/company/article/media posts, delete posts, or dry-run a simulated API request before publishing.',
    inputs: ['operation', 'text', 'articleUrl', 'mediaUrl', 'visibility', 'personUrn', 'organizationId', 'postId', 'limit', 'dryRun'],
    outputs: ['success', 'profile', 'posts', 'postCount', 'postId', 'assetUrn', 'message', 'dryRun', 'simulatedRequest', '_error'],
    example: `Operation: create_post_media
Text: New demo is live
Media URL: https://cdn.example.com/demo-card.jpg
Visibility: PUBLIC

Output: {
  success: true,
  postId: "urn:li:activity:7123456789012345678",
  assetUrn: "urn:li:digitalmediaAsset:D4D22AQFexample"
}`,
    tips: [
      'Connect LinkedIn in Connections; accessToken is only a legacy fallback',
      'Get My Profile verifies OAuth and returns profile.personUrn',
      'Create Post (Media) requires a public Media URL; text can be empty only for media posts',
      'Company Page posts require Organization ID and page/admin permission',
      'Dry Run returns simulatedRequest and does not publish, upload, or delete',
    ],
  },

  instagram: {
    overview: 'Use a saved Instagram/Meta connection to read, publish, moderate comments, inspect hashtags/stories, and fetch insights for an Instagram Business Account. The current service node does not implement the old message/sendText resource.',
    inputs: ['resource', 'operation', 'instagramBusinessAccountId', 'media_type', 'media_url', 'video_url', 'caption', 'creation_id', 'mediaId', 'commentId', 'message', 'metric', 'period', 'fields', 'limit', 'returnAll'],
    outputs: ['id', 'data', 'paging', 'status_code', '_error', '_errorDetails'],
    example: `Resource: media
Operation: createAndPublish
Media Type: IMAGE
Media URL: https://cdn.example.com/product.jpg
Caption: New product drop

Output: {
  id: "17900000000000000"
}`,
    tips: [
      'Connect Instagram/Meta in Connections; accessToken is a legacy fallback',
      'Leave Instagram Business Account ID blank only when the connected Page can auto-resolve it',
      'Use media_url for image posts and video_url for VIDEO/REELS',
      'Comment replies must put the reply body in Message because the runtime reads message',
      'Valid pairs include media/createAndPublish, media/publish, comment/reply, hashtag/getRecentMedia, story/list, and insights/get',
    ],
  },

  youtube: {
    overview: 'Use a YouTube OAuth connection to list authenticated channels, get a channel, search videos, fetch video statistics, upload videos, update metadata, or delete owned videos. Execution is owned by the YouTube registry override.',
    inputs: ['operation', 'title', 'description', 'tags', 'videoUrl', 'videoDataBase64', 'mimeType', 'privacyStatus', 'madeForKids', 'categoryId', 'videoId', 'channelId', 'query', 'maxResults'],
    outputs: ['success', 'operation', 'items', 'pageInfo', 'channel', 'channelId', 'video', 'videoId', 'url', 'statistics', 'deleted', '_error'],
    example: `Operation: get_video_stats
Video ID: dQw4w9WgXcQ

Output: {
  success: true,
  operation: "get_video_stats",
  videoId: "dQw4w9WgXcQ",
  statistics: { viewCount: "2450", likeCount: "120" }
}`,
    tips: [
      'Connect YouTube in Connections with youtube.force-ssl and youtube.upload scopes',
      'Upload Video requires Title and either Video URL or Video Data Base64',
      'Update Video Metadata requires Video ID and at least one of Title, Description, or Tags',
      'Search Videos requires Query; Max Results is clamped to 1-50',
      'Stale create_post, reply_comment, and get_comments values are rejected by the registry override',
    ],
  },

  reddit: {
    overview: 'Interact with Reddit API to manage posts, comments, subreddits, and messages. Supports creating posts, reading feeds, managing comments, and sending messages. Perfect for Reddit automation or content management.',
    inputs: ['clientId', 'clientSecret', 'username', 'password', 'operation', 'data'],
    outputs: ['result', 'posts', 'comments', 'subreddits'],
    example: `Operation: create_post
Subreddit: test
Data: {
  "title": "New Post",
  "text": "Post content"
}

Output: {
  result: {
    id: "post_id",
    title: "New Post",
    subreddit: "test"
  }
}`,
    tips: [
      'Get credentials from Reddit â†’ Preferences â†’ Apps â†’ create app',
      'Client ID and Secret required',
      'Username and password for authentication',
      'Supports posts, comments, subreddits, messages',
      'Use for Reddit automation and content management',
    ],
  },

  // ============================================
  // STORAGE & OTHER NODES
  // ============================================
  box: {
    overview: 'Interact with Box cloud storage to manage files and folders. Supports uploading, downloading, listing files, and managing folders. Perfect for cloud file management or Box integration.',
    inputs: ['accessToken', 'operation', 'fileId', 'path', 'content'],
    outputs: ['result', 'file', 'files'],
    example: `Operation: upload
Path: /Documents/file.txt
Content: "Hello World"

Output: {
  result: {
    id: "file_id",
    name: "file.txt",
    size: 11
  }
}`,
    tips: [
      'Get access token from Box Developer Console â†’ OAuth 2.0',
      'Use OAuth 2.0 flow for authentication',
      'Supports files and folders management',
      'Use for cloud file management',
      'List, upload, download files programmatically',
    ],
  },

  onedrive: {
    overview: 'List, read, upload, and delete files in Microsoft OneDrive through Microsoft Graph. Prefer a saved Microsoft connection; Access Token is a direct legacy fallback.',
    inputs: ['accessToken', 'operation', 'path', 'fileId', 'fileName', 'content', 'dataBase64', 'data'],
    outputs: ['success', 'items', 'path', 'dataBase64', 'sizeBytes', 'metadata', 'deleted', '_error', '_errorDetails'],
    example: `Operation: upload
Path: /Documents/file.txt
Content: {{$json.dataBase64}}

Output: {
  success: true,
  path: "/Documents/file.txt",
  sizeBytes: 11,
  metadata: {
    id: "01ABC123",
    name: "file.txt"
  }
}`,
    tips: [
      'Get access token from Azure Portal â†’ App registrations â†’ Microsoft Graph API',
      'Read and upload require Path',
      'Delete can use File ID or Path',
      'Legacy File Name is not read by runtime; include the file name in Path',
      'Upload accepts dataBase64, data, or content',
      'Use Microsoft Graph file scopes such as Files.ReadWrite',
    ],
  },

  write_binary_file: {
    overview: 'Create a managed workflow file asset from base64, a data URL, or plain text. Use it to stage generated PDFs/images/CSVs before read, upload, email attachment, OCR, or approval steps.',
    inputs: ['fileName', 'mimeType', 'dataBase64', 'folder', 'filePath', 'persist', 'data', 'content', 'fileData'],
    outputs: ['success', 'written', 'assetId', 'fileName', 'mimeType', 'dataBase64', 'sizeBytes', 'checksumSha256', 'storageProvider', 'storageKey', 'filePath', 'metadataPersisted', 'metadataError', '_error'],
    example: `File Name: report.pdf
MIME Type: application/pdf
Binary Data: {{$json.dataBase64}}

Output: {
  assetId: "asset-id",
  fileName: "report.pdf",
  dataBase64: "JVBERi0x...",
  sizeBytes: 2048,
  metadataPersisted: true
}`,
    tips: [
      'Use dataBase64 from download/PDF/file nodes',
      'Legacy body aliases data, content, and fileData are accepted',
      'Data URLs like data:application/pdf;base64,... are accepted',
      'Keep Persist Metadata enabled when later nodes should read by assetId',
      'Custom paths are restricted to the backend binary storage root',
      'Use Google Drive/S3/Dropbox/OneDrive nodes for cloud storage upload',
    ],
  },

  document_ocr: {
    overview: 'Extract text from images or PDF documents using OCR (Optical Character Recognition). Supports multiple languages, layout detection, and confidence scoring. Perfect for document digitization, text extraction, or document processing.',
    inputs: ['file', 'language', 'detectLayout', 'confidenceRequired'],
    outputs: ['text', 'confidence', 'layout'],
    example: `File: {
  "name": "document.pdf",
  "type": "pdf",
  "binary": "base64_encoded_pdf..."
}
Language: auto
Detect Layout: true

Output: {
  text: "Extracted text from document...",
  confidence: 0.95,
  layout: {...}
}`,
    tips: [
      'Supports PDF, PNG, JPEG, TIFF formats',
      'Language: auto-detect or specify (en, es, fr, etc.)',
      'Detect layout for structured documents',
      'Confidence score indicates extraction quality',
      'Use for document digitization and text extraction',
    ],
  },

  intercom: {
    overview: 'List Intercom conversations, fetch one conversation, or reply to a conversation. Important: the visual Operation dropdown offers 6 values (Get/List/Create/Update/Delete/Search) but the runtime only implements List, Get, and Send - Create/Update/Delete/Search always fail, and Send (the real reply capability) is not even in the dropdown. Resource, Resource ID, and Search Query fields are all decorative and never read.',
    inputs: ['operation', 'accessToken', 'conversationId', 'resource', 'id', 'data', 'query', 'perPage', 'startingAfter', 'message', 'adminId'],
    outputs: ['operation', 'data', '_error', '_errorCode'],
    example: `Operation: get
Conversation Id: 123456789

Output: {
  operation: "get",
  data: {
    type: "conversation",
    id: "123456789",
    conversation_message: { body: "Hi, I need help with my order." }
  }
}`,
    tips: [
      'Get the access token from developers.intercom.com -> Your App -> Configure -> Authentication, then save it once in Connections',
      'Only List and Get work from the Operation dropdown today; Create/Update/Delete/Search always fail with "Unsupported Intercom operation"',
      'Send (replying to a conversation) is real and required-field-validated, but is not selectable in the Operation dropdown - it can only be set via workflow JSON or an AI-generated workflow, and Message/Admin Id must currently go through the Data (JSON) field as a raw payload',
      'Get needs the Conversation Id field filled - the "Resource ID" field looks similar but is never read',
      'Resource and Search Query are both decorative - every operation always works against Intercom Conversations regardless of what Resource is set to',
    ],
  },

  intuit_smes: {
    overview: 'Important: this is a mock/demo node - it does not call the real Intuit/QuickBooks API today. Get Customers and Get Invoices always return the same two fixed demo rows; Create Customer, Update Customer, and Create Invoice only echo back the values you typed as a fabricated confirmation, without saving anything in Intuit/QuickBooks. Use this node to prototype a workflow\'s shape, not for production QuickBooks data.',
    inputs: ['operation', 'apiKey', 'accessToken', 'customerId', 'name', 'email', 'amount'],
    outputs: ['success', 'data', 'message', 'error'],
    example: `Operation: createCustomer
Customer Name: Acme Corp
Customer Email: contact@acme.com

Output: {
  success: true,
  data: {
    customerId: "CUST-1752940800000",
    name: "Acme Corp",
    email: "contact@acme.com",
    createdAt: "2026-07-19T00:00:00.000Z"
  },
  message: "Successfully created customer",
  error: null
}`,
    tips: [
      'This node never contacts the real Intuit/QuickBooks API - Api Key/Access Token are only checked for being non-empty, never validated or sent anywhere',
      'Get Customers and Get Invoices always return the exact same two hardcoded demo rows, regardless of your account',
      'Create Customer/Update Customer/Create Invoice only echo back what you typed as a fabricated confirmation - nothing is saved in Intuit/QuickBooks',
      'This node performs almost no field validation (unlike other CRM nodes) - missing Customer Id/Name/Email/Amount does not raise an error, values just come back undefined',
      'Use this node to prototype a workflow\'s shape before a real Intuit/QuickBooks integration exists',
    ],
  },

  mailchimp: {
    overview: 'Important: the visual Operation dropdown (List/Get/Create/Update/Delete/Add Member/Update Member/Delete Member) is entirely non-functional - the real runtime only implements subscribe, unsubscribe, and send, none of which are selectable from that dropdown. A working run requires setting operation to subscribe/unsubscribe/send via workflow JSON or AI generation. Resource, Data Center, Member Email, Member Data, Count, and Offset are all decorative fields the engine never reads.',
    inputs: ['operation', 'apiKey', 'listId', 'email', 'data', 'mergeFields', 'campaignId', 'serverPrefix'],
    outputs: ['operation', 'data', '_error', '_errorCode'],
    example: `Operation: subscribe (set via JSON - not selectable in the dropdown)
List/Audience ID: list123
Email: user@example.com

Output: {
  operation: "subscribe",
  data: {
    id: "member_hash_id",
    email_address: "user@example.com",
    status: "subscribed"
  }
}`,
    tips: [
      'None of the 8 Operation dropdown values work - only subscribe/unsubscribe/send do, and none of those 3 are selectable from the dropdown today',
      'Get the API Key from Mailchimp Account -> Extras -> API Keys; the data-center suffix on the key (e.g. -us21) is auto-detected, the visible "Data Center" field is unused',
      'Subscribe/Unsubscribe need a real config value under the key email (not the visible "Member Email" field, which is a different unused key)',
      'Send only triggers an already-created campaign (Campaign Id) - it cannot create a new campaign, and its response data is always null on success',
      'Resource, Member Data, Count, and Offset are all decorative and never read by the runtime',
    ],
  },

  microsoft_dynamics: {
    overview: 'Get, list, create, update, or delete Microsoft Dynamics 365 records, or run an advanced FetchXML query. Unlike most CRM nodes in this product, there is no Connections/credential-vault support - Instance URL and OAuth2 Access Token must always be typed directly on the node.',
    inputs: ['instanceUrl', 'accessToken', 'resource', 'customEntity', 'operation', 'id', 'fields', 'fetchXml', 'select', 'filter', 'top'],
    outputs: ['success', 'data', 'count', 'id', 'entityId', 'deleted', '_error'],
    example: `Resource: contacts
Operation: getRecord
Record ID (GUID): 00000000-0000-0000-0000-000000000000

Output: {
  success: true,
  data: {
    contactid: "00000000-0000-0000-0000-000000000000",
    fullname: "Alice Chen",
    emailaddress1: "alice@example.com"
  }
}`,
    tips: [
      'No Connections support today - Instance URL and OAuth2 Access Token must be typed on every node; the Azure AD token also expires (typically ~1 hour) and must be refreshed manually',
      '6 of the 8 Operation dropdown values work (Get Records/Get Record/Create Record/Update Record/Delete Record/Search FetchXML); Associate Records and Disassociate Records are not implemented',
      'Create Record and Update Record only return the record ID, not the field values - run a follow-up Get Record to see the saved data',
      'Use Dynamics 365 logical field names (like firstname, emailaddress1), not the display labels shown in the Dynamics UI',
      'Max Records ($top) is capped at 5000 by Dynamics itself; this node does not implement follow-up paging beyond that',
    ],
  },

  odoo: {
    overview: 'Search, read, create, update, or delete records in any Odoo model, or call a custom Odoo method, via JSON-RPC. A saved "Odoo Credentials" Connections entry exists but does not currently auto-fill this node - URL, Database, Username, and Password must always be typed directly on the node.',
    inputs: ['url', 'db', 'username', 'password', 'operation', 'model', 'domain', 'fields', 'limit', 'offset', 'values', 'recordId', 'method', 'methodArgs', 'methodKwargs'],
    outputs: ['success', 'operation', 'model', 'data', 'error', '_error'],
    example: `Model: res.partner
Operation: getRecords
Domain Filter: [["customer_rank", ">", 0]]

Output: {
  success: true,
  operation: "getRecords",
  model: "res.partner",
  data: [
    { id: 42, name: "Acme Corp", email: "info@acme.com" }
  ],
  error: null
}`,
    tips: [
      'This node logs in as a real Odoo user on every single run - the saved "Odoo Credentials" Connections entry exists but is not wired to auto-fill this node yet, so URL/Database/Username/Password must be typed on the node itself',
      'Use technical field/model names (like res.partner, name, email), not the display labels shown in the Odoo UI - enable Developer Mode in Odoo to see them',
      'Create Record and Update Record do not return the saved field values - Create returns only the new numeric ID, Update returns only true; use a follow-up Get Records to see the data',
      'Odoo record IDs are plain integers, not GUIDs',
      'Execute Method can call any model method (like action_confirm) for actions beyond basic create/read/update/delete',
    ],
  },

  sap: {
    overview: 'Read and write SAP business objects (sales orders, business partners, materials, and more) via OData v2/v4 and REST APIs. Operation is a direct HTTP method (GET/POST/PUT/PATCH/DELETE) rather than a named CRM action. Only Access Token is confirmed to auto-fill from a saved SAP connection - Basic Auth Username/Password must be typed directly on the node.',
    inputs: ['baseUrl', 'operation', 'endpoint', 'queryParams', 'payload', 'accessToken', 'username', 'password', 'csrfToken', 'format'],
    outputs: ['success', 'data', 'count', 'statusCode', 'deleted', '_error'],
    example: `Operation: get
SAP Base URL: https://your-sap-host:44300
Endpoint Path: /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder

Output: {
  success: true,
  data: [
    { SalesOrder: "0000012345", SoldToParty: "0000100001", TotalNetAmount: "15000.00" }
  ],
  count: 1,
  statusCode: 200
}`,
    tips: [
      'SAP Base URL is required at runtime even though the backend schema only formally requires Operation and Endpoint Path - leaving it blank fails every operation',
      'OData v2 write services (POST/PUT/PATCH/DELETE) typically require X-CSRF-Token, but this node cannot fetch or capture that token itself - obtain it separately (e.g. with an HTTP Request node reading response headers) and paste it in manually',
      'OData v2 list responses are automatically unwrapped from the {d: {results}} envelope, so {{$json.data}} is a plain array or object, not the raw SAP envelope',
      'DELETE has no data or count key at all on success - only success, statusCode, and deleted',
      'This node never returns an _errorDetails key on failure, unlike several other CRM nodes - the full error text is already inside _error',
    ],
  },

  tally: {
    overview: 'Connect directly to a locally-running Tally ERP / TallyPrime instance via its XML API gateway to read ledgers, vouchers, and stock items, read company info, or create new vouchers. There is no cloud credential - this is a direct network connection, and Tally must be running with its XML gateway enabled.',
    inputs: ['operation', 'endpoint', 'companyName', 'ledgerName', 'voucherId', 'payload'],
    outputs: ['success', 'data', 'statusCode', '_error'],
    example: `Operation: get_ledger
Tally Server URL: http://localhost:9000
Ledger Name: Cash

Output: {
  success: true,
  data: "<ENVELOPE><BODY>...ledger XML...</BODY></ENVELOPE>",
  statusCode: 200
}`,
    tips: [
      'Tally is desktop software, not a cloud service - it must be running with Enable XML Server turned on (Gateway of Tally -> F12: Configure -> Advanced Configuration) before any operation will work',
      'The response in data is always raw XML text, never JSON - use a JavaScript node after this one to parse out specific values like a balance or an amount',
      'Create Voucher has no default template and requires a complete custom XML payload; the other four operations build their own XML automatically and only need Custom XML Payload for advanced filtering',
      'A 200 status code from Create Voucher does not guarantee the voucher was saved - parse data for <CREATED>1</CREATED> to confirm, since Tally can reject the voucher with a validation error inside a 200 response',
      'Company Name, Ledger Name, and Voucher ID matching is exact and case-sensitive in Tally - there is no fuzzy matching',
    ],
  },

  zendesk: {
    overview: 'List, fetch, create, update, or delete Zendesk support tickets, or list users, via HTTP Basic Auth (agent email + API token) against the Zendesk REST API. Unlike most other CRM nodes in this product, failures are reported as {success: false, error: {message, status}} rather than an _error key.',
    inputs: ['operation', 'subdomain', 'email', 'apiToken', 'ticketId', 'subject', 'description', 'status', 'priority', 'assigneeId', 'limit'],
    outputs: ['success', 'data', 'error'],
    example: `Operation: create_ticket
Subject: Issue reported by {{$json.name}}
Description: Customer reports login failure

Output: {
  success: true,
  data: { ticket: { id: 12345, subject: "Issue reported by John Doe", status: "open", priority: "normal" } },
  error: {}
}`,
    tips: [
      'This node never returns an _error key - check {{$json.success}} and {{$json.error.message}}/{{$json.error.status}} instead, unlike most other CRM nodes in this product',
      'Subdomain, Agent Email, and API Token all auto-fill from a saved Zendesk API Token connection - Agent Email fills via the same generic credential alias Jira also uses',
      'Update Ticket only sends fields you actually filled in - a blank Subject, Status, Priority, or Assignee ID leaves the current value unchanged rather than clearing it',
      'Delete Ticket returns an empty data object {} on success since Zendesk itself sends no body back for deletes - check {{$json.success}}, not {{$json.data}}, to confirm',
      'Get Tickets and Get Users return at most one page (default 25, max 100 via Results Per Page) - use {{$json.data.next_page}} with a Loop node to fetch further pages in a large account',
    ],
  },

  freshdesk: {
    overview: 'Get, list, create, update, or delete Freshdesk tickets, contacts, or companies. Operation and Resource together choose the exact Freshdesk API call; the output key differs per operation (item/items/created/updated/deleted). Only the API Key is stored in Connections - Domain must always be typed on the node.',
    inputs: ['operation', 'resource', 'domain', 'apiKey', 'id', 'data', 'subject', 'descriptionText', 'email', 'priority', 'status'],
    outputs: ['success', 'item', 'items', 'created', 'updated', 'deleted', 'id', '_error', '_errorDetails'],
    example: `Resource: ticket
Operation: create
Subject: Support request
Description Text: Need help with login
Email: user@example.com

Output: {
  success: true,
  created: {
    id: 12345,
    subject: "Support request",
    status: 2
  }
}`,
    tips: [
      'Get the API Key from Freshdesk Profile Settings; save it once in CtrlChecks Connections and reuse it on every Freshdesk node',
      'Domain (e.g. mycompany.freshdesk.com) is never vault-backed - type the full domain, including .freshdesk.com, on every node',
      'Resources: ticket, contact, company work fully tested; avoid time_entry (mispluralized internally and will fail)',
      'The Search operation is present in the dropdown but not implemented yet - it always returns an "Unsupported operation" error; use List + a downstream Filter node instead',
      'Subject/Description Text/Email/Priority/Status only apply to Create with Resource = ticket; Update always reads the Data field instead',
    ],
  },

  // ============================================
  // SPECIALIZED AI AGENTS & AUTOMATION NODES
  // ============================================
  ai_agent: {
    overview: 'Runs one prompt-driven AI step. The runtime extracts userInput from this node or upstream message-like fields, infers the provider from Model, calls the LLM adapter, and packages response_text plus optional structured fields.',
    inputs: [
      'userInput (User prompt or input data)',
      'model (gemini, claude, or gpt-style model name)',
      'systemPrompt (System instructions defining behavior)',
      'temperature, maxTokens, topP, frequencyPenalty, presencePenalty',
      'timeoutLimit, retryCount',
      'outputFormat (text, json, keyvalue, markdown)',
      'includeReasoning',
    ],
    outputs: [
      'response_text (Plain text response)',
      'response_json (Structured JSON response)',
      'response_markdown (Markdown formatted response)',
      'confidence_score (currently fixed at 0.8)',
      'used_tools (currently always empty)',
      'memory_written (currently false)',
      'error_flag (Whether an error occurred)',
      'error_message (Error details if any)',
      'reasoning (provider/model metadata when includeReasoning is enabled)',
    ],
    example: `Configuration:
Model: gemini-3.5-flash
User Input: "{{$json.message}}"
System Prompt: "Classify support requests and return JSON with category and priority."
Temperature: 0.2
Output Format: json
Include Reasoning: true


Output: {
  response_text: "{\\"category\\":\\"billing\\",\\"priority\\":\\"medium\\"}",
  response_json: {
    category: "billing",
    priority: "medium"
  },
  confidence_score: 0.8,
  used_tools: [],
  memory_written: false,
  error_flag: false,
  error_message: null,
  reasoning: { steps: 1, provider: "gemini", model: "gemini-3.5-flash" }
}`,
    tips: [
      'Provider is inferred from Model: gemini, claude, and gpt prefixes route to their provider paths.',
      'topP, frequencyPenalty, and presencePenalty are parsed but not currently passed into the model adapter.',
      'Tool and memory outputs are placeholders today: used_tools is [] and memory_written is false.',
      'For json/keyvalue output, invalid JSON is wrapped as response_json.content instead of raising a parse error.',
      'Use JSON output format for structured data.',
      'Use timeoutLimit and retryCount for slow providers, but fix missing credentials before relying on retries.',
    ],
  },

  accuracy_evaluator: {
    overview: 'AI agent that evaluates the accuracy of AI-generated responses or predictions. Compares outputs against ground truth or known correct answers. Perfect for quality assurance, model evaluation, or accuracy monitoring.',
    inputs: ['apiKey', 'model', 'prompt', 'response', 'groundTruth', 'temperature'],
    outputs: ['accuracy', 'score', 'errors', 'feedback'],
    example: `Response: "Paris is the capital of France"
Ground Truth: "Paris is the capital of France"

Output: {
  accuracy: true,
  score: 1.0,
  errors: [],
  feedback: "Correct answer"
}`,
    tips: [
      'Evaluates AI response accuracy',
      'Compares against ground truth',
      'Provides accuracy score and feedback',
      'Use for quality assurance',
      'Temperature 0.3 recommended for evaluation',
    ],
  },

  agent_performance_tracker: {
    overview: 'Tracks and monitors performance metrics for AI agents. Collects execution time, success rate, cost, and other performance indicators. Perfect for agent monitoring, optimization, or performance analysis.',
    inputs: ['agentId', 'metrics', 'timeWindow'],
    outputs: ['performance', 'metrics', 'trends'],
    example: `Agent ID: agent_123
Metrics: ["executionTime", "successRate", "cost"]
Time Window: "24h"

Output: {
  performance: {
    executionTime: 1.5,
    successRate: 0.95,
    cost: 0.02
  },
  trends: {...}
}`,
    tips: [
      'Tracks agent performance metrics',
      'Monitors execution time, success rate, cost',
      'Time window for metric aggregation',
      'Use for agent optimization',
      'Identifies performance trends',
    ],
  },

  agent_role_assigner: {
    overview: 'AI agent that assigns roles to team members or agents based on skills, availability, and workload. Perfect for task distribution, workload balancing, or team management automation.',
    inputs: ['apiKey', 'model', 'prompt', 'teamMembers', 'tasks', 'criteria'],
    outputs: ['assignments', 'reasoning'],
    example: `Team Members: [
  {"name": "John", "skills": ["frontend", "react"]},
  {"name": "Jane", "skills": ["backend", "python"]}
]
Tasks: ["Build UI", "Create API"]

Output: {
  assignments: {
    "Build UI": "John",
    "Create API": "Jane"
  },
  reasoning: "Based on skills match..."
}`,
    tips: [
      'Assigns roles based on criteria',
      'Considers skills, availability, workload',
      'Provides assignment reasoning',
      'Use for task distribution',
      'Temperature 0.3 recommended for consistent assignments',
    ],
  },

  agent_voting_consensus: {
    overview: 'Coordinates multiple AI agents to reach consensus through voting. Collects opinions from multiple agents and determines the final decision. Perfect for multi-agent systems, consensus building, or decision-making automation.',
    inputs: ['agents', 'question', 'votingMethod'],
    outputs: ['consensus', 'votes', 'confidence'],
    example: `Question: "Is this code secure?"
Agents: [agent1, agent2, agent3]
Voting Method: "majority"

Output: {
  consensus: "Yes",
  votes: {"Yes": 2, "No": 1},
  confidence: 0.67
}`,
    tips: [
      'Coordinates multiple AI agents',
      'Reaches consensus through voting',
      'Voting methods: majority, unanimous, weighted',
      'Use for multi-agent decision making',
      'Higher confidence with more agents',
    ],
  },

  alert_correlation_engine: {
    overview: 'Correlates multiple alerts to identify root causes and reduce alert fatigue. Groups related alerts and identifies patterns. Perfect for monitoring automation, incident management, or alert optimization.',
    inputs: ['alerts', 'correlationRules', 'timeWindow'],
    outputs: ['correlatedAlerts', 'patterns', 'rootCauses'],
    example: `Alerts: [
  {"source": "server1", "type": "cpu_high"},
  {"source": "server1", "type": "memory_high"}
]
Time Window: "5m"

Output: {
  correlatedAlerts: {
    "incident_123": ["cpu_high", "memory_high"]
  },
  rootCauses: ["server1 overload"],
  patterns: {...}
}`,
    tips: [
      'Correlates related alerts',
      'Reduces alert fatigue',
      'Identifies root causes',
      'Time window for correlation',
      'Use for monitoring automation',
    ],
  },

  anomaly_detection_agent: {
    overview: 'AI agent that detects anomalies in datasets or time-series data. Identifies outliers and explains deviations from baseline patterns. Perfect for monitoring, fraud detection, or anomaly identification.',
    inputs: ['apiKey', 'model', 'prompt', 'dataset', 'baseline', 'temperature'],
    outputs: ['anomalies', 'anomalyScore', 'pattern'],
    example: `Dataset: [10, 11, 12, 9, 50, 11, 10]
Baseline: {"mean": 10.5, "std": 1.0}

Output: {
  anomalies: [50],
  anomalyScore: 0.95,
  pattern: "Single outlier significantly above mean"
}`,
    tips: [
      'Detects outliers in datasets',
      'Compares against baseline patterns',
      'Provides anomaly scores',
      'Use for monitoring and fraud detection',
      'Temperature 0.3 recommended for analysis',
    ],
  },

  audit_trail_generator: {
    overview: 'Generates audit trails for workflow executions, user actions, or system events. Tracks who did what, when, and why. Perfect for compliance, security, or audit logging.',
    inputs: ['events', 'userId', 'metadata'],
    outputs: ['auditTrail', 'timeline'],
    example: `Events: [
  {"action": "login", "timestamp": "2024-01-15T10:00:00Z"},
  {"action": "create_record", "timestamp": "2024-01-15T10:05:00Z"}
]
User ID: user123

Output: {
  auditTrail: [
    {"user": "user123", "action": "login", "timestamp": "..."},
    {"user": "user123", "action": "create_record", "timestamp": "..."}
  ],
  timeline: {...}
}`,
    tips: [
      'Generates comprehensive audit trails',
      'Tracks user actions and events',
      'Includes timestamps and metadata',
      'Use for compliance and security',
      'Creates immutable audit logs',
    ],
  },

  auto_remediation_planner: {
    overview: 'AI agent that analyzes incidents and generates remediation plans. Identifies issues and suggests automated fixes. Perfect for incident response automation or self-healing systems.',
    inputs: ['apiKey', 'model', 'prompt', 'incident', 'availableActions', 'temperature'],
    outputs: ['remediationPlan', 'steps', 'riskAssessment'],
    example: `Incident: {
  "type": "high_cpu",
  "severity": "critical",
  "source": "server1"
}

Output: {
  remediationPlan: {
    steps: [
      {"action": "scale_up", "target": "server1"},
      {"action": "restart_service", "service": "app"}
    ]
  },
  riskAssessment: "Low risk - automated actions"
}`,
    tips: [
      'Generates automated remediation plans',
      'Analyzes incidents and suggests fixes',
      'Assesses risk of remediation actions',
      'Use for incident response automation',
      'Temperature 0.3 recommended for planning',
    ],
  },

  compliance_check_agent: {
    overview: 'AI agent that validates data against compliance rules and regulations. Detects violations and assesses risk levels. Perfect for compliance automation, regulatory checking, or governance workflows.',
    inputs: ['apiKey', 'model', 'prompt', 'data', 'rules', 'temperature'],
    outputs: ['compliant', 'violations', 'riskLevel'],
    example: `Data: {
  "userAge": 16,
  "consent": true
}
Rules: ["GDPR: Minimum age 18", "Require explicit consent"]

Output: {
  compliant: false,
  violations: ["GDPR: Minimum age 18"],
  riskLevel: "high"
}`,
    tips: [
      'Validates against compliance rules',
      'Detects regulatory violations',
      'Assesses risk levels',
      'Use for compliance automation',
      'Temperature 0.3 recommended for validation',
    ],
  },

  compliance_log_writer: {
    overview: 'Writes compliance logs for audit and regulatory purposes. Formats logs according to compliance standards (GDPR, HIPAA, SOX, etc.). Perfect for compliance logging or audit trail generation.',
    inputs: ['event', 'userId', 'data', 'complianceStandard'],
    outputs: ['logEntry', 'formattedLog'],
    example: `Event: "data_access"
User ID: user123
Compliance Standard: "GDPR"

Output: {
  logEntry: {
    timestamp: "2024-01-15T10:30:00Z",
    userId: "user123",
    event: "data_access",
    data: {...}
  },
  formattedLog: "GDPR-compliant log format..."
}`,
    tips: [
      'Writes compliance-standard logs',
      'Supports GDPR, HIPAA, SOX formats',
      'Includes required fields for compliance',
      'Use for audit and regulatory logging',
      'Creates formatted compliance logs',
    ],
  },

  conversation_summarizer: {
    overview: 'AI agent that summarizes conversations, chat logs, or meeting transcripts. Extracts key topics and identifies sentiment trends. Perfect for conversation analysis, meeting documentation, or chat log processing.',
    inputs: ['apiKey', 'model', 'prompt', 'conversation', 'summaryLength', 'temperature'],
    outputs: ['summary', 'keyTopics', 'sentimentTrend'],
    example: `Conversation: [
  "Hello, how can I help?",
  "I need help with login",
  "Let me check your account..."
]
Summary Length: medium

Output: {
  summary: "Customer requested help with login issue. Agent checked account.",
  keyTopics: ["login", "account", "support"],
  sentimentTrend: "neutral"
}`,
    tips: [
      'Summarizes conversations and transcripts',
      'Extracts key topics automatically',
      'Summary lengths: short, medium, long',
      'Use for conversation analysis',
      'Temperature 0.5 recommended for summarization',
    ],
  },

  cost_monitor: {
    overview: 'Monitors and tracks costs for workflows, API calls, or cloud resources. Provides cost analytics and budget alerts. Perfect for cost optimization, budget management, or spending tracking.',
    inputs: ['workflowId', 'metrics', 'budget', 'alertThreshold'],
    outputs: ['cost', 'usage', 'alerts'],
    example: `Workflow ID: workflow_123
Budget: 100.00
Alert Threshold: 80

Output: {
  cost: 45.50,
  usage: {
    apiCalls: 1200,
    computeTime: "2.5h"
  },
  alerts: []
}`,
    tips: [
      'Monitors workflow and API costs',
      'Tracks usage metrics',
      'Budget alerts when threshold reached',
      'Use for cost optimization',
      'Provides cost analytics',
    ],
  },

  crm_duplicate_detector: {
    overview: 'Detects duplicate records in CRM systems based on similarity matching. Identifies potential duplicates using fuzzy matching algorithms. Perfect for data quality, CRM cleanup, or duplicate prevention.',
    inputs: ['records', 'matchingFields', 'threshold'],
    outputs: ['duplicates', 'confidence', 'groups'],
    example: `Records: [
  {"name": "John Doe", "email": "john@example.com"},
  {"name": "John D.", "email": "john@example.com"}
]
Threshold: 0.8

Output: {
  duplicates: [{"record1": 0, "record2": 1, "confidence": 0.95}],
  groups: [{"records": [0, 1], "confidence": 0.95}]
}`,
    tips: [
      'Detects duplicate CRM records',
      'Uses fuzzy matching algorithms',
      'Confidence threshold for matching',
      'Use for data quality and cleanup',
      'Groups similar records together',
    ],
  },

  crm_lead_router: {
    overview: 'Routes leads to appropriate sales representatives based on criteria such as geography, product interest, or workload. Perfect for lead distribution, sales routing, or CRM automation.',
    inputs: ['lead', 'routingRules', 'salesReps'],
    outputs: ['assignedRep', 'reasoning'],
    example: `Lead: {
  "location": "NYC",
  "product": "Enterprise"
}
Routing Rules: {"location": "priority", "product": "secondary"}

Output: {
  assignedRep: "sales_rep_123",
  reasoning: "Assigned based on location match"
}`,
    tips: [
      'Routes leads to sales representatives',
      'Considers geography, product, workload',
      'Routing rules define assignment logic',
      'Use for lead distribution automation',
      'Ensures balanced workload distribution',
    ],
  },

  crm_sla_monitor: {
    overview: 'Monitors SLA (Service Level Agreement) compliance for CRM tickets, cases, or support requests. Tracks response times and resolution deadlines. Perfect for SLA compliance, service monitoring, or performance tracking.',
    inputs: ['tickets', 'slaRules', 'timeWindow'],
    outputs: ['slaStatus', 'violations', 'metrics'],
    example: `Tickets: [
  {"id": 1, "created": "2024-01-15T10:00:00Z", "status": "open"}
]
SLA Rules: {"responseTime": "1h", "resolutionTime": "24h"}

Output: {
  slaStatus: {
    "1": {"responseTime": "compliant", "resolutionTime": "pending"}
  },
  violations: [],
  metrics: {...}
}`,
    tips: [
      'Monitors SLA compliance',
      'Tracks response and resolution times',
      'Identifies SLA violations',
      'Use for service level monitoring',
      'Provides SLA metrics and reports',
    ],
  },

  crm_ticket_prioritizer: {
    overview: 'AI agent that prioritizes CRM tickets based on severity, impact, customer value, and other factors. Assigns priority levels automatically. Perfect for ticket management automation or support optimization.',
    inputs: ['apiKey', 'model', 'prompt', 'ticket', 'prioritizationRules', 'temperature'],
    outputs: ['priority', 'score', 'reasoning'],
    example: `Ticket: {
  "subject": "Service down",
  "customer": "enterprise",
  "impact": "high"
}

Output: {
  priority: "P0",
  score: 95,
  reasoning: "Enterprise customer, high impact issue"
}`,
    tips: [
      'Automatically prioritizes tickets',
      'Considers severity, impact, customer value',
      'Custom prioritization rules available',
      'Use for ticket management automation',
      'Temperature 0.3 recommended for consistent prioritization',
    ],
  },

  decision_recommendation_agent: {
    overview: 'AI agent that provides decision recommendations based on context, constraints, and objectives. Analyzes options and suggests optimal decisions. Perfect for decision support, recommendation systems, or automated decision-making.',
    inputs: ['apiKey', 'model', 'prompt', 'context', 'options', 'criteria', 'temperature'],
    outputs: ['recommendation', 'confidence', 'reasoning'],
    example: `Context: "Choose cloud provider"
Options: ["AWS", "GCP", "Azure"]
Criteria: ["cost", "performance", "reliability"]

Output: {
  recommendation: "AWS",
  confidence: 0.85,
  reasoning: "Best balance of cost and performance"
}`,
    tips: [
      'Provides decision recommendations',
      'Analyzes options and criteria',
      'Includes confidence scores',
      'Use for decision support systems',
      'Temperature 0.3 recommended for consistent recommendations',
    ],
  },

  employee_faq_indexer: {
    overview: 'Indexes and organizes employee FAQ knowledge base for search and retrieval. Creates searchable index from documents, chat logs, or knowledge bases. Perfect for internal knowledge management or employee self-service.',
    inputs: ['documents', 'indexType', 'updateMode'],
    outputs: ['index', 'documentCount'],
    example: `Documents: [
  {"id": "doc1", "title": "VPN Setup", "content": "How to setup VPN..."},
  {"id": "doc2", "title": "Password Reset", "content": "How to reset password..."}
]
Index Type: "vector"

Output: {
  index: "faq_index_id",
  documentCount: 2
}`,
    tips: [
      'Indexes FAQ documents for search',
      'Creates searchable knowledge base',
      'Vector or keyword indexing supported',
      'Use for knowledge management',
      'Enables fast FAQ retrieval',
    ],
  },

  execution_explainer: {
    overview: 'AI agent that explains workflow execution steps, decisions, and outcomes in human-readable format. Provides execution summaries and reasoning. Perfect for workflow debugging, documentation, or user explanations.',
    inputs: ['apiKey', 'model', 'prompt', 'executionLog', 'format', 'temperature'],
    outputs: ['explanation', 'summary', 'reasoning'],
    example: `Execution Log: {
  "steps": ["webhook", "filter", "email"],
  "decisions": {"filter": "passed"},
  "duration": "2.5s"
}

Output: {
  explanation: "Workflow received webhook trigger, filtered data (passed), and sent email notification in 2.5 seconds.",
  summary: "3 steps executed successfully",
  reasoning: {...}
}`,
    tips: [
      'Explains workflow execution',
      'Human-readable summaries',
      'Documents decisions and outcomes',
      'Use for debugging and documentation',
      'Temperature 0.5 recommended for explanations',
    ],
  },

  expense_categorizer: {
    overview: 'AI agent that categorizes expenses automatically based on descriptions, amounts, and merchant information. Perfect for expense management, accounting automation, or financial categorization.',
    inputs: ['apiKey', 'model', 'prompt', 'expense', 'categories', 'temperature'],
    outputs: ['category', 'confidence', 'subcategory'],
    example: `Expense: {
  "description": "Lunch at Restaurant ABC",
  "amount": 45.50,
  "merchant": "Restaurant ABC"
}
Categories: ["Meals", "Travel", "Office Supplies"]

Output: {
  category: "Meals",
  confidence: 0.95,
  subcategory: "Business Lunch"
}`,
    tips: [
      'Categorizes expenses automatically',
      'Uses description and merchant info',
      'Custom categories available',
      'Use for expense management automation',
      'Temperature 0.3 recommended for categorization',
    ],
  },

  feedback_loop_collector: {
    overview: 'Collects and aggregates feedback from multiple sources (users, systems, metrics). Creates feedback loops for continuous improvement. Perfect for product feedback, user satisfaction tracking, or improvement automation.',
    inputs: ['sources', 'feedbackTypes', 'aggregationMethod'],
    outputs: ['aggregatedFeedback', 'trends', 'insights'],
    example: `Sources: [
  {"source": "user_survey", "rating": 4.5},
  {"source": "support_tickets", "sentiment": "positive"},
  {"source": "usage_metrics", "engagement": "high"}
]

Output: {
  aggregatedFeedback: {
    overallScore: 4.5,
    sentiment: "positive",
    engagement: "high"
  },
  trends: {...},
  insights: ["High user satisfaction", "Good engagement"]
}`,
    tips: [
      'Collects feedback from multiple sources',
      'Aggregates and analyzes feedback',
      'Identifies trends and insights',
      'Use for continuous improvement',
      'Creates feedback loops automatically',
    ],
  },

  fraud_detection_node: {
    overview: 'Analyzes transaction or user activity data to identify potentially fraudulent behavior. Evaluates factors like amount, location, device, frequency, and user history to produce a fraud risk score or decision.',
    inputs: [
      'transaction (id, amount, currency, merchant, location, timestamp)',
      'historicalPatterns (averageAmount, commonMerchants, commonLocations)',
      'riskThreshold (0â€“1, default 0.7)',
    ],
    outputs: ['fraudulent', 'riskScore', 'indicators'],
    example: `Transaction: {
  "id": "txn_98456321",
  "amount": 15000,
  "currency": "INR",
  "merchant": "Unknown",
  "location": "Different country",
  "timestamp": "2026-02-01T14:32:00Z"
}
Historical Patterns: {
  "averageAmount": 800,
  "commonLocations": ["India"]
}
Risk Threshold: 0.6

Output: {
  fraudulent: true,
  riskScore: 0.82,
  indicators: ["location_mismatch", "high_amount"]
}`,
    tips: [
      'Always include amount and user/transaction IDs',
      'Add location, device, and history data for better accuracy',
      'Start with a medium threshold and tune over time',
      'Combine rule-based checks with ML scoring when possible',
      'Review flagged cases and refine rules regularly',
    ],
  },

  incident_classifier: {
    overview: 'AI agent that classifies incidents by type, severity, and category. Automatically categorizes incidents for proper routing and handling. Perfect for incident management, support automation, or alert classification.',
    inputs: ['apiKey', 'model', 'prompt', 'incident', 'categories', 'temperature'],
    outputs: ['classification', 'severity', 'confidence'],
    example: `Incident: {
  "title": "Server CPU at 100%",
  "description": "High CPU usage detected"
}

Output: {
  classification: "performance",
  severity: "high",
  confidence: 0.92
}`,
    tips: [
      'Classifies incidents automatically',
      'Assigns severity levels',
      'Categories: performance, security, availability, etc.',
      'Use for incident management automation',
      'Temperature 0.3 recommended for classification',
    ],
  },

  knowledge_base_search: {
    overview: 'Searches knowledge base using semantic search or keyword matching. Retrieves relevant articles, documents, or FAQ entries. Perfect for self-service support, knowledge retrieval, or documentation search.',
    inputs: ['query', 'knowledgeBaseId', 'searchType', 'maxResults'],
    outputs: ['results', 'relevance', 'snippets'],
    example: `Query: "How to reset password"
Knowledge Base ID: kb_123
Search Type: semantic

Output: {
  results: [
    {
      "id": "article_1",
      "title": "Password Reset Guide",
      "relevance": 0.95,
      "snippet": "To reset your password..."
    }
  ]
}`,
    tips: [
      'Searches knowledge base content',
      'Semantic or keyword search supported',
      'Returns relevant articles and snippets',
      'Use for self-service support',
      'Ranked by relevance score',
    ],
  },

  ldap: {
    overview: 'Interact with LDAP (Lightweight Directory Access Protocol) directories for authentication, user management, or directory queries. Supports user authentication, group membership, and directory search. Perfect for enterprise authentication or directory services.',
    inputs: ['server', 'port', 'bindDn', 'password', 'baseDn', 'operation', 'query'],
    outputs: ['result', 'users', 'groups'],
    example: `Operation: authenticate
Bind DN: cn=user,dc=example,dc=com
Password: password123

Output: {
  result: {
    authenticated: true,
    user: "user",
    groups: ["users", "developers"]
  }
}`,
    tips: [
      'LDAP server for directory services',
      'Bind DN for authentication',
      'Base DN for search operations',
      'Use for enterprise authentication',
      'Query users and groups',
    ],
  },

  microsoft_teams: {
    overview: 'Send Microsoft Teams channel notifications through an Incoming Webhook, or reply to Microsoft Teams Trigger conversations through a saved Microsoft Teams Bot connection.',
    inputs: ['webhookUrl (for channel webhooks)', 'message', 'serviceUrl (for trigger replies)', 'conversationId (for trigger replies)', 'replyToId (optional)'],
    outputs: ['success', 'teams.status', 'teams.response', 'teams.id', 'botReply', '_error', '_errorDetails'],
    example: `Webhook URL: 
Message: "Answer for {{$json.userName}} about ticket {{$json.ticketId}}: {{$json.response}}"
Service URL: {{$json.serviceUrl}}
Conversation ID: {{$json.conversationId}}
Reply To Activity ID: {{$json.replyToId}}

Replies in the same Teams bot conversation and returns {{$json.success}} plus Teams response details.`,
    tips: [
      'Use Webhook URL for fixed channel notifications, and Service URL plus Conversation ID for Microsoft Teams Trigger replies',
      'Save Incoming Webhook URLs or Microsoft Teams Bot credentials in Connections when possible',
      'The Teams Bot connection needs Microsoft App ID and Microsoft App Password / client secret',
      'Use {{$json.serviceUrl}}, {{$json.conversationId}}, and {{$json.replyToId}} directly from Microsoft Teams Trigger',
      'Connect downstream service accounts separately; Teams credentials only authorize the Teams send',
    ],
  },

  minio: {
    overview: 'Interact with MinIO (S3-compatible object storage) to manage buckets and objects. Supports uploading, downloading, listing objects, and managing buckets. Perfect for private cloud storage or S3-compatible storage automation.',
    inputs: ['endpoint', 'accessKey', 'secretKey', 'bucket', 'operation', 'objectKey', 'content'],
    outputs: ['result', 'objects', 'buckets'],
    example: `Operation: upload
Bucket: my-bucket
Object Key: "file.txt"
Content: "Hello World"

Output: {
  result: {
    etag: "abc123",
    size: 11
  }
}`,
    tips: [
      'MinIO endpoint URL required',
      'Access Key and Secret Key for authentication',
      'S3-compatible API',
      'Use for private cloud storage',
      'Supports buckets and objects management',
    ],
  },

  multi_agent_coordinator: {
    overview: 'Coordinates multiple AI agents to work together on complex tasks. Manages agent communication, task distribution, and result aggregation. Perfect for multi-agent systems, complex workflows, or collaborative AI tasks.',
    inputs: ['agents', 'task', 'coordinationStrategy'],
    outputs: ['results', 'coordination', 'finalResult'],
    example: `Task: "Analyze customer feedback and create report"
Agents: [sentiment_agent, summarizer_agent, report_generator]

Output: {
  results: {
    sentiment: "positive",
    summary: "Customers are satisfied...",
    report: "Customer Feedback Report..."
  },
  finalResult: "Generated comprehensive report"
}`,
    tips: [
      'Coordinates multiple AI agents',
      'Manages task distribution',
      'Aggregates results from agents',
      'Use for complex multi-agent tasks',
      'Supports various coordination strategies',
    ],
  },

  node_selector_agent: {
    overview: 'AI agent that selects the most appropriate workflow nodes based on requirements and context. Recommends optimal node configurations. Perfect for workflow optimization, node selection, or intelligent workflow building.',
    inputs: ['apiKey', 'model', 'prompt', 'requirements', 'availableNodes', 'temperature'],
    outputs: ['selectedNodes', 'reasoning', 'configuration'],
    example: `Requirements: "Send email when order created"
Available Nodes: ["webhook", "email_resend", "slack_message"]

Output: {
  selectedNodes: ["webhook", "email_resend"],
  reasoning: "Webhook for trigger, email_resend for notification",
  configuration: {...}
}`,
    tips: [
      'Selects optimal workflow nodes',
      'Recommends node configurations',
      'Considers requirements and context',
      'Use for workflow optimization',
      'Temperature 0.3 recommended for selection',
    ],
  },

  onboarding_flow_generator: {
    overview: 'Generates onboarding workflows and sequences for new users, employees, or customers. Creates personalized onboarding experiences based on user type or role. Perfect for user onboarding automation or personalized experiences.',
    inputs: ['userType', 'role', 'onboardingTemplate'],
    outputs: ['onboardingFlow', 'steps', 'timeline'],
    example: `User Type: "customer"
Role: "enterprise"
Template: "enterprise_onboarding"

Output: {
  onboardingFlow: {
    steps: [
      {"step": 1, "action": "welcome_email"},
      {"step": 2, "action": "product_tour"},
      {"step": 3, "action": "setup_call"}
    ]
  },
  timeline: "7 days"
}`,
    tips: [
      'Generates personalized onboarding flows',
      'User type and role-based templates',
      'Creates step-by-step onboarding sequences',
      'Use for onboarding automation',
      'Customizable onboarding templates',
    ],
  },

  payment_reminder_engine: {
    overview: 'Automatically sends payment reminders based on due dates, payment status, and customer preferences. Manages payment reminder sequences and escalations. Perfect for accounts receivable automation or payment collection workflows.',
    inputs: ['invoices', 'reminderRules', 'customerPreferences'],
    outputs: ['reminders', 'sent', 'scheduled'],
    example: `Invoices: [
  {"id": 1, "amount": 1000, "dueDate": "2024-01-20", "status": "unpaid"}
]
Reminder Rules: {"before": "3d", "after": "1d", "escalate": "7d"}

Output: {
  reminders: [
    {"invoiceId": 1, "type": "pre_due", "sent": true}
  ],
  sent: 1,
  scheduled: 0
}`,
    tips: [
      'Automates payment reminders',
      'Before and after due date reminders',
      'Escalation rules for overdue payments',
      'Use for accounts receivable automation',
      'Customer preference-aware reminders',
    ],
  },

  policy_sync_node: {
    overview: 'Synchronizes policies across multiple systems or environments. Ensures policy consistency and updates policies automatically. Perfect for policy management, compliance automation, or multi-system policy sync.',
    inputs: ['sourcePolicy', 'targetSystems', 'syncRules'],
    outputs: ['synced', 'updated', 'conflicts'],
    example: `Source Policy: {
  "name": "Password Policy",
  "minLength": 12,
  "requireComplexity": true
}
Target Systems: ["system1", "system2"]

Output: {
  synced: true,
  updated: ["system1", "system2"],
  conflicts: []
}`,
    tips: [
      'Synchronizes policies across systems',
      'Ensures policy consistency',
      'Handles policy conflicts',
      'Use for policy management automation',
      'Multi-system policy synchronization',
    ],
  },

  postmortem_generator: {
    overview: 'AI agent that generates postmortem reports for incidents, outages, or failures. Creates structured postmortem documents with root cause analysis and action items. Perfect for incident documentation or postmortem automation.',
    inputs: ['apiKey', 'model', 'prompt', 'incident', 'timeline', 'temperature'],
    outputs: ['postmortem', 'rootCause', 'actionItems'],
    example: `Incident: {
  "type": "outage",
  "duration": "2h",
  "impact": "high"
}

Output: {
  postmortem: {
    summary: "Service outage for 2 hours...",
    rootCause: "Database connection pool exhaustion",
    actionItems: ["Increase pool size", "Add monitoring"]
  }
}`,
    tips: [
      'Generates structured postmortem reports',
      'Includes root cause analysis',
      'Creates action items automatically',
      'Use for incident documentation',
      'Temperature 0.5 recommended for postmortem generation',
    ],
  },

  prompt_synthesizer: {
    overview: 'AI agent that synthesizes and optimizes prompts for AI models. Creates effective prompts based on desired outputs and use cases. Perfect for prompt engineering, prompt optimization, or prompt generation automation.',
    inputs: ['apiKey', 'model', 'useCase', 'desiredOutput', 'examples', 'temperature'],
    outputs: ['prompt', 'optimizedPrompt', 'explanation'],
    example: `Use Case: "Extract email addresses from text"
Desired Output: "Array of email addresses"
Examples: ["john@example.com", "jane@test.com"]

Output: {
  prompt: "Extract all email addresses from the following text and return as JSON array...",
  optimizedPrompt: "Enhanced prompt with better instructions...",
  explanation: "Prompt optimized for email extraction accuracy"
}`,
    tips: [
      'Synthesizes effective AI prompts',
      'Optimizes prompts for better results',
      'Considers use case and desired output',
      'Use for prompt engineering',
      'Temperature 0.7 recommended for creative prompt generation',
    ],
  },

  root_cause_analysis_agent: {
    overview: 'AI agent that performs root cause analysis for incidents, failures, or issues. Identifies underlying causes and contributing factors. Perfect for incident investigation, problem-solving automation, or root cause identification.',
    inputs: ['apiKey', 'model', 'prompt', 'incident', 'evidence', 'temperature'],
    outputs: ['rootCause', 'contributingFactors', 'confidence'],
    example: `Incident: {
  "symptoms": "Service slow, errors increasing",
  "timeline": "Started at 10:00 AM"
}

Output: {
  rootCause: "Database connection pool exhaustion due to unclosed connections",
  contributingFactors: ["Recent code deployment", "Increased traffic"],
  confidence: 0.88
}`,
    tips: [
      'Performs root cause analysis',
      'Identifies underlying causes',
      'Analyzes contributing factors',
      'Use for incident investigation',
      'Temperature 0.3 recommended for analysis',
    ],
  },

  tax_rule_engine: {
    overview: 'Applies tax rules and calculates taxes based on location, product type, and tax regulations. Supports multiple tax jurisdictions and rules. Perfect for e-commerce, invoicing, or tax calculation automation.',
    inputs: ['amount', 'location', 'productType', 'taxRules'],
    outputs: ['tax', 'taxBreakdown', 'total'],
    example: `Amount: 100.00
Location: "CA, USA"
Product Type: "physical"

Output: {
  tax: 8.50,
  taxBreakdown: {
    "state": 7.25,
    "local": 1.25
  },
  total: 108.50
}`,
    tips: [
      'Calculates taxes based on rules',
      'Supports multiple tax jurisdictions',
      'Considers product type and location',
      'Use for e-commerce and invoicing',
      'Tax rules configurable per jurisdiction',
    ],
  },

  workflow_generator_agent: {
    overview: 'AI agent that generates complete workflows based on requirements and objectives. Creates workflow definitions with nodes, connections, and configurations. Perfect for workflow automation, intelligent workflow creation, or workflow generation.',
    inputs: ['apiKey', 'model', 'prompt', 'requirements', 'availableNodes', 'temperature'],
    outputs: ['workflow', 'nodes', 'connections'],
    example: `Requirements: "Automate customer onboarding with email sequence"

Output: {
  workflow: {
    nodes: [
      {"type": "webhook", "config": {...}},
      {"type": "email_sequence_sender", "config": {...}}
    ],
    connections: [{"from": 0, "to": 1}]
  }
}`,
    tips: [
      'Generates complete workflows',
      'Creates nodes and connections',
      'Configures workflow based on requirements',
      'Use for workflow automation',
      'Temperature 0.5 recommended for workflow generation',
    ],
  },

  workflow_summary_generator: {
    overview: 'Generates human-readable summaries of workflow executions, definitions, or changes. Creates concise summaries for documentation or reporting. Perfect for workflow documentation, execution summaries, or workflow change tracking.',
    inputs: ['workflow', 'executionLog', 'summaryType'],
    outputs: ['summary', 'keyPoints', 'statistics'],
    example: `Workflow: {
  "name": "Customer Onboarding",
  "nodes": 5,
  "executions": 120
}

Output: {
  summary: "Customer Onboarding workflow with 5 nodes, executed 120 times with 98% success rate.",
  keyPoints: ["5 nodes", "120 executions", "98% success"],
  statistics: {...}
}`,
    tips: [
      'Generates workflow summaries',
      'Human-readable format',
      'Includes key points and statistics',
      'Use for documentation and reporting',
      'Various summary types available',
    ],
  },

  activecampaign: {
    overview: 'Add, update, or delete a contact in ActiveCampaign via its REST API. Perfect for syncing new leads or customers into an ActiveCampaign marketing automation.',
    inputs: ['apiUrl', 'apiKey', 'operation', 'contactId', 'email', 'firstName', 'lastName', 'data'],
    outputs: ['operation', 'data'],
    example: `Operation: add
Email: user@example.com
First Name: John
Last Name: Doe

Output: {
  operation: "add",
  data: {
    contact: {
      id: "contact_id",
      email: "user@example.com",
      firstName: "John"
    }
  }
}`,
    tips: [
      'Get API URL and API Key from ActiveCampaign Settings â†’ Developer',
      'API URL is your account URL, e.g. https://youraccount.api-us1.com â€” always entered on the node itself, even when using a saved connection',
      'A saved Connections â†’ ActiveCampaign credential can supply API Key automatically; typing it directly into the node keeps it in plain workflow config instead',
      'Update and Delete require Contact ID',
      'Data (JSON) completely replaces Email/First Name/Last Name when set, it does not merge with them',
      'Delete returns {deleted: true, contactId} â€” not the ActiveCampaign contact object Add/Update return',
    ],
  },

  outlook: {
    overview: 'Send a plain-text email from the selected Microsoft Outlook account through Microsoft Graph sendMail. The node supports Send Email only and keeps incoming workflow fields on success.',
    inputs: ['operation', 'to', 'subject', 'body', 'selected Microsoft connection'],
    outputs: ['incoming fields preserved', 'success', '_error', '_errorDetails'],
    example: `Operation: send_email
To: {{$json.customerEmail}}
Subject: Order {{$json.orderId}} received
Body: Hi {{$json.firstName}}, we received your order.

Output:
{
  orderId: "ORD-1042",
  customerEmail: "buyer@example.com",
  success: true
}`,
    tips: [
      'Requires a Microsoft OAuth2 connection with Mail.Send',
      'Use comma-separated addresses in To for multiple recipients',
      'Body is sent as plain text, not HTML',
      'Microsoft Graph sendMail does not return a message ID in this runtime path',
    ],
  },

  calendly: {
    overview: 'Read Calendly user, event type, and scheduled event data using a saved Calendly Personal Access Token connection. Operations are read-only.',
    inputs: ['operation', 'Calendly connection or fallback accessToken', 'userUri', 'eventTypeUri'],
    outputs: ['success', 'operation', 'data', 'collection', 'user', 'count', 'error'],
    example: `Operation: get_user
Access Token: saved in Connections

Output:
{
  success: true,
  operation: "get_user",
  user: {uri: "https://api.calendly.com/users/AAAAAAAAAAAAAAAA"}
}

Next step User URI: {{$json.user.uri}}`,
    tips: [
      'Prefer Connections instead of pasting a token into the node',
      'Run Get User first to get the User URI',
      'Get Event Types and Get Scheduled Events require User URI',
      'Event Type URI only filters Get Scheduled Events',
    ],
  },

  schedulewise: {
    overview: 'Read and manage appointments through the ScheduleWise REST API. Live runs require a saved ScheduleWise credential unless Mock Mode is on.',
    inputs: ['operation', 'credentialId reference', 'dateFrom/dateTo', 'patientId', 'staffId', 'appointmentId', 'startDateTime/endDateTime', 'serviceType', 'notes', 'status', 'limit', 'hardDelete', 'mockMode', 'timeoutSec', 'retries', 'outputFormat'],
    outputs: ['success', 'operation', 'data', 'executionTimeMs', 'error'],
    example: `Operation: Get Schedules
Date From: {{$json.startDate}}
Date To: {{$json.endDate}}
Mock Mode: false

Output: {
  success: true,
  operation: "getSchedules",
  data: {schedules: [...], totalCount: 1, nextPageToken: null},
  executionTimeMs: 41
}`,
    tips: [
      'Requires a saved ScheduleWise API Key connection in Connections unless Mock Mode is on',
      'Use Mock Mode to test the workflow without calling the real ScheduleWise API',
      'Update and Delete Appointment require Appointment ID',
      'Create Appointment requires Start/End Date-Time, Patient ID, and Staff ID',
      'Output Format Raw is visible but not honored today; runtime always parses JSON and returns PARSE_ERROR when parsing fails',
    ],
  },
};
