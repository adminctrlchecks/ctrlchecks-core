import { NodeUsageGuide } from './nodeTypes';

export const NODE_USAGE_GUIDES: Record<string, NodeUsageGuide> = {
  // Trigger Nodes
  manual_trigger: {
    overview: 'Starts your workflow when you click the "Run" button. Perfect for testing or on-demand tasks. No input required - fires once per manual execution.',
    inputs: ['None - This is a start node'],
    outputs: ['trigger', 'workflow_id', 'executed_at'],
    example: `Connect → OpenAI GPT → Slack Message

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
    overview: 'Runs workflow repeatedly at fixed intervals. Non-blocking and prevents duplicate executions. Supports seconds (s), minutes (m), and hours (h) units.',
    inputs: ['None - Triggered by interval'],
    outputs: ['trigger', 'interval', 'executed_at'],
    example: `Interval: "10m" (every 10 minutes)
Interval: "30s" (every 30 seconds)
Interval: "1h" (every 1 hour)

Output: {
  trigger: "interval",
  interval: "10m",
  executed_at: "2024-01-15T10:30:00Z"
}`,
    tips: ['Use format: number + unit (s/m/h)', 'Examples: 30s, 5m, 1h', 'Non-blocking execution', 'Duplicate executions are prevented', 'Deactivate when not needed'],
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
    overview: 'Processes text using OpenAI GPT models. Provide a system prompt and the input will be sent as the user message.',
    inputs: ['apiKey', 'model', 'prompt', 'temperature', 'memory'],
    outputs: ['response', 'usage', 'model'],
    example: `System Prompt: "You are a helpful assistant that summarizes emails."

Input: { text: "Meeting tomorrow at 3pm..." }
Output: { response: "Summary: Meeting scheduled for tomorrow afternoon", usage: { tokens: 45 } }

Connect: Webhook → OpenAI GPT → Slack`,
    tips: ['Leave API Key empty to use Lovable AI (free)', 'Lower temperature = more focused responses', 'Use {{input.text}} in prompts for dynamic content'],
  },

  anthropic_claude: {
    overview: 'Processes text using Anthropic Claude models. Known for nuanced understanding and detailed responses.',
    inputs: ['text', 'any JSON data'],
    outputs: ['response', 'usage', 'model'],
    example: `System Prompt: "Analyze customer feedback and categorize sentiment."

Input: { text: "Great product but shipping was slow" }
Output: { 
  response: "Mixed sentiment. Positive: product quality. Negative: shipping speed.",
  sentiment: "mixed"
}`,
    tips: ['Claude excels at analysis and nuanced tasks', 'Great for longer documents', 'Sonnet offers best balance of speed/quality'],
  },

  google_gemini: {
    overview: 'Processes text using Google Gemini models. Fast and efficient with strong reasoning capabilities.',
    inputs: ['apiKey', 'model', 'prompt', 'temperature', 'memory'],
    outputs: ['response', 'usage', 'model'],
    example: `System Prompt: "Extract key dates and action items from text."

Input: { text: "Call John on Friday about Q2 review" }
Output: { 
  response: "Date: Friday\nAction: Call John\nTopic: Q2 review"
}`,
    tips: ['Gemini Flash is fastest for simple tasks', 'Flash Lite for high volume, low cost', 'Pro for complex reasoning'],
  },

  text_summarizer: {
    overview: 'Automatically summarizes long text content. Choose between concise summaries, detailed overviews, or bullet points.',
    inputs: ['text', 'content'],
    outputs: ['summary', 'word_count'],
    example: `Input: { text: "Long article about AI trends..." }
Style: "bullets"
Max Length: 100

Output: {
  summary: "• AI adoption growing 40% YoY\n• Focus on automation\n• Privacy concerns rising",
  word_count: 15
}`,
    tips: ['Use bullets for quick scanning', 'Detailed for comprehensive summaries', 'Adjust max length for your needs'],
  },

  sentiment_analyzer: {
    overview: 'Analyzes the emotional tone of text. Returns sentiment score and classification (positive, negative, neutral).',
    inputs: ['text'],
    outputs: ['sentiment', 'score', 'confidence'],
    example: `Input: { text: "I love this product!" }
Output: {
  sentiment: "positive",
  score: 0.95,
  confidence: 0.92
}

Connect: Webhook → Sentiment → If/Else (route by sentiment)`,
    tips: ['Score ranges from -1 (negative) to 1 (positive)', 'Use with If/Else to route messages', 'Great for customer feedback analysis'],
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
    overview: 'Pauses workflow execution for a specified duration. Use for rate limiting or delays between actions.',
    inputs: ['any (passes through)'],
    outputs: ['input (unchanged)'],
    example: `Duration: 5000 (5 seconds)

API Call → Wait (5s) → API Call
Prevents hitting rate limits.

Common durations:
• 1000ms = 1 second
• 60000ms = 1 minute`,
    tips: ['Use between API calls to avoid rate limits', 'Data passes through unchanged', 'Duration is in milliseconds'],
  },

  error_handler: {
    overview: 'Catches errors from connected nodes and provides retry logic or fallback values. Prevents workflow failures.',
    inputs: ['any (wraps connected node)'],
    outputs: ['result', 'error', 'attempts'],
    example: `Max Retries: 3
Retry Delay: 2000 (2 seconds)
Fallback: {"status": "failed"}

If connected node fails:
1. Retry up to 3 times
2. Wait 2s between retries
3. If still failing, return fallback`,
    tips: ['Wrap unreliable API calls', 'Set appropriate retry delays', 'Log errors for debugging'],
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
    outputs: ['combined payload', 'items in append mode', 'mergeMode/sourceCount metadata'],
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
    overview: 'Stops workflow execution and triggers an error. Useful for validation failures, business rule violations, or intentional workflow termination with custom error messages.',
    inputs: ['any data'],
    outputs: ['error (workflow stops)'],
    example: `Error Message: "Payment validation failed"
Error Code: "PAYMENT_INVALID"

When this node executes:
1. Workflow stops immediately
2. Error trigger fires (if configured)
3. Error message and code are logged

Use with If/Else to conditionally stop workflows:
If/Else (condition fails) → Stop And Error`,
    tips: ['Use for validation failures', 'Error code helps categorize errors', 'Triggers error handler if configured', 'Use with conditional logic for smart stopping'],
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
    overview: 'Execute custom JavaScript function at dataset level. Receives both input and data parameters. Useful for complex data processing across entire datasets.',
    inputs: ['any data as "input" and "data"'],
    outputs: ['return value'],
    example: `Code:
const processed = data.map(item => ({
  ...item,
  processed: true,
  timestamp: Date.now()
}));
return { items: processed, count: processed.length };

Input: {items: [{id: 1}, {id: 2}]}
Output: {
  items: [
    {id: 1, processed: true, timestamp: 1234567890},
    {id: 2, processed: true, timestamp: 1234567890}
  ],
  count: 2
}`,
    tips: ['Receives both "input" and "data" variables', 'Use for dataset-level operations', 'Higher timeout than JavaScript node', 'Always return a value'],
  },

  function_item: {
    overview: 'Execute custom JavaScript function for each item in an array. Processes items individually with access to item, index, and input context.',
    inputs: ['array of items'],
    outputs: ['array of processed items'],
    example: `Code:
return {
  ...item,
  doubled: item.value * 2,
  index: index,
  processed: true
};

Input: [
  {id: 1, value: 10},
  {id: 2, value: 20}
]
Output: [
  {id: 1, value: 10, doubled: 20, index: 0, processed: true},
  {id: 2, value: 20, doubled: 40, index: 1, processed: true}
]`,
    tips: ['Receives "item", "index", and "input" variables', 'Processes each array item separately', 'Useful for item-level transformations', 'Returns array of processed items'],
  },

  execute_command: {
    overview: 'Execute system commands or shell scripts. ⚠️ WARNING: Disabled by default for security. Enable only if you trust the command and understand the risks.',
    inputs: ['command parameters'],
    outputs: ['stdout', 'stderr', 'exitCode'],
    example: `Command: echo "Hello {{input.name}}"
Enabled: true (⚠️ Security risk)

Input: {name: "World"}
Output: {
  stdout: "Hello World",
  stderr: "",
  exitCode: 0
}

⚠️ Only enable for trusted commands in secure environments.`,
    tips: ['⚠️ Disabled by default for security', 'Only enable if you trust the command', 'Use for system operations and scripts', 'Set appropriate timeout', 'Be careful with user input'],
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
    tips: ['Leave field empty to aggregate items directly', 'Use delimiter with Join to create readable text', 'Supports sum, avg, count, min, max, join', 'Great for analytics, reporting, and preparing text for AI'],
  },

  limit: {
    overview: 'Limits the number of items in an array. Returns only the first N items, useful for pagination or processing subsets.',
    inputs: ['limit', 'optional array expression', 'or input.items/input.array'],
    outputs: ['items and array containing the limited values'],
    example: `Limit: 5

Input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
Output: {items: [1, 2, 3, 4, 5], array: [1, 2, 3, 4, 5]}

Useful for:
• Pagination (first page)
• Processing top N items
• Preventing large array processing`,
    tips: ['Returns first N items in items and array', 'Useful for pagination', 'Prevents processing large arrays', 'Combine with Sort to get top/bottom items'],
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
    tips: ['Leave field empty to sort items directly', 'Use "auto" type for automatic detection', 'Ascending = smallest to largest', 'Descending = largest to smallest'],
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
    overview: 'Combines data from multiple input sources. Supports overwrite, append, and deep_merge modes.',
    inputs: ['multiple data inputs'],
    outputs: ['merged data'],
    example: `Mode: overwrite
Input 1: {name: "John", age: 30}
Input 2: {email: "john@test.com"}

Output: {name: "John", age: 30, email: "john@test.com"}

Mode: append
Input 1: [1, 2, 3]
Input 2: [4, 5, 6]
Output: {items: [1, 2, 3, 4, 5, 6]}`,
    tips: ['overwrite combines object properties with later values winning', 'append combines inputs into items', 'deep_merge recursively combines nested objects', 'Legacy concat aliases still work at runtime'],
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
    overview: 'Format text using templates with variable substitution. Create dynamic messages, emails, or any text content.',
    inputs: ['data for template variables'],
    outputs: ['formatted_text'],
    example: `Template: "Hello {{name}}! Your order #{{orderId}} ships on {{shipDate}}."

Input: {name: "John", orderId: 123, shipDate: "Jan 20"}
Output: "Hello John! Your order #123 ships on Jan 20."`,
    tips: ['Use {{$json.field}} expressions for substitution', 'The runtime does not read a separate values field', 'Great for email/message templates'],
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
    overview: 'Execute GraphQL queries and mutations. Send GraphQL requests to any GraphQL API endpoint with custom queries and variables.',
    inputs: ['url', 'query', 'variables', 'operationName (optional)', 'headers'],
    outputs: ['data', 'errors'],
    example: `Endpoint: https://api.example.com/graphql
Query: 
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
Variables: {"id": "{{input.userId}}"}

Output: {
  data: {
    user: {
      name: "John",
      email: "john@test.com"
    }
  },
  errors: null
}`,
    tips: ['Use GraphQL query syntax', 'Variables can use {{input.x}} templates', 'Check errors array for GraphQL errors', 'Supports both queries and mutations'],
  },

  respond_to_webhook: {
    overview: 'Send HTTP response back to webhook caller. Use this at the end of webhook-triggered workflows to return data or status to the caller.',
    inputs: ['statusCode', 'responseBody', 'headers'],
    outputs: ['status', 'response'],
    example: `Status Code: 200
Headers: {"Content-Type": "application/json"}
Body: {"status": "success", "data": "{{input}}"}

When webhook receives request:
1. Process workflow
2. Respond with this node's configuration
3. Caller receives the response`,
    tips: ['Use at end of webhook workflows', 'Set appropriate status codes (200, 400, 500)', 'Add headers for content type', 'Body supports template variables'],
  },

  webhook_response: {
    overview: 'Return a custom HTTP response to an incoming webhook. Functionally identical to Respond to Webhook — use whichever label fits your workflow.',
    inputs: ['statusCode', 'body', 'headers'],
    outputs: ['statusCode', 'headers', 'body'],
    example: `Status Code: 200
Headers: {"Content-Type": "application/json"}
Body: {"success": true, "data": "{{input}}"}

When the webhook receives a request:
1. Process the workflow
2. Respond with this node's configuration
3. Caller receives the response`,
    tips: ['Use at the end of webhook workflows', 'Set appropriate status codes (200, 400, 500)', 'Add headers for content type', 'Body supports template variables'],
  },

  set_variable: {
    overview: 'Create one or more named output values for later workflow steps.',
    inputs: ['name/value or legacy values array', 'optional keepSource'],
    outputs: ['assigned variable fields'],
    example: `Variable Name: totalCount
Value: {{$json.items.length}}

Later nodes can access: {{$json.totalCount}}

Useful for storing computed values to use in multiple places.`,
    tips: ['Access output fields as {{$json.name}} in the next node', 'Use keepSource to preserve incoming fields', 'Legacy values array supports multiple assignments'],
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
      'Allow Write Access has no runtime effect — write/append/update run regardless of this checkbox',
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
    overview: 'Send data to external APIs via HTTP POST. Perfect for webhooks, API integrations, and data sync.',
    inputs: ['url', 'headers', 'body'],
    outputs: ['response', 'status'],
    example: `URL: https://api.example.com/webhook
Headers: {"Content-Type": "application/json"}
Body: {"event": "workflow_complete", "data": {{input}}}

Sends POST request with workflow data.`,
    tips: [
      'Use {{input.x}} template variables inside the body for dynamic content',
      'Add auth headers (Bearer/API key) if needed',
      'Set Content-Type to match your body',
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
      'Verify the From Address (and Return Path, if used) in AWS SES for the exact AWS Region set on this node — verification is per-region',
      'Field-validation failures (missing recipients/subject/body) return _error; actual AWS SES send failures (unverified sender, rate limiting, missing connection) return a plain error field instead — check both downstream',
      'Attachments are limited to specific file types (PDF, Word, Excel, common images, TXT/CSV, ZIP) and a 40MB total email size',
      'Do not paste the Access Key ID or Secret Access Key into Recipients, Subject, Body, or any other workflow field — save them in Connections',
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
      'Mailgun requires at least one of Text, HTML, or Template — leaving all three empty fails before Mailgun is contacted',
      'There is no success: false on failure — only check {{$json._error}} downstream to detect a failed send',
      'Sandbox domains can only send to recipients you have explicitly authorized in the Mailgun dashboard',
      'Do not paste the Private API Key into From, To, or any other workflow field — save it in the Mailgun connection under Connections',
      'Connect downstream service accounts separately; the Mailgun connection only authorizes this node\'s own email send',
    ],
  },

  sendgrid: {
    overview: 'Send a one-off transactional email through SendGrid\'s Mail Send API using a saved API Key connection. Only From, To, Subject, Text, and HTML are supported — this node does not implement SendGrid CC/BCC, Reply-To, attachments, categories, or Dynamic Templates.',
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
      'Neither Text nor HTML is actually required — leaving both blank sends an email with an empty body instead of failing',
      'There is no success: false on failure — only check {{$json._error}} downstream to detect a failed send',
      'This node does not support CC, BCC, Reply-To, attachments, or SendGrid Dynamic Templates; use Mailgun or the HTTP Request node for those',
      'Do not paste the API Key into From, To, or any other workflow field — save it in the SendGrid connection under Connections',
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
      'Invite the bot to your server via OAuth2 → URL Generator with the bot scope and Send Messages permission',
      'Use {{$json.channelId}} from Discord Trigger to reply in the same channel, or use Interaction Token + Application ID to reply to a slash command without a bot token',
      'Reference the sent message later with {{$json.discord.id}}',
      'Connect downstream service accounts separately; the Discord Bot Token only authorizes Discord sends',
    ],
  },
  discord_webhook: {
    overview: 'Send messages to Discord channels via a selected webhook connection. Great for notifications and alerts.',
    inputs: ['message', 'username (optional)', 'avatarUrl (optional)'],
    outputs: ['success', 'sent', 'message', 'discord_webhook', '_error'],
    example: `Message: "✅ Workflow completed successfully!"
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
    overview: 'Log data for debugging and monitoring. View logs in the execution history. This is a terminal node — it cannot connect to further downstream nodes.',
    inputs: ['any data'],
    outputs: ['the resolved log message (string)'],
    example: `Message: "Processing order: {{input.orderId}}"
Level: info

Appears in execution logs:
[INFO] Processing order: 12345

Useful for debugging workflow flow.`,
    tips: ['Use different levels for filtering', 'This node is terminal — it does not forward data to further nodes', 'Check execution history for logs'],
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
    tips: ['Set correct delimiter (comma, semicolon, tab, pipe)', 'Enable hasHeader for column names', 'Generate uses the same delimiter and quotes cells when needed'],
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
    overview: 'Manipulate dates and times with timezone support. Format dates, add/subtract time, calculate differences, convert timezones, and get current time.',
    inputs: ['date string or timestamp'],
    outputs: ['formatted_date', 'timestamp', 'timezone_info'],
    example: `Operation: Format
Date: 2024-01-15T10:30:00Z
Timezone: America/New_York
Format: ISO

Output: "2024-01-15T05:30:00-05:00"

Operation: Add
Date: 2024-01-15T10:30:00Z
Value: 7
Unit: Days
Output: "2024-01-22T10:30:00Z"

Operation: Now
Timezone: UTC
Output: Current date/time in UTC`,
    tips: ['Supports ISO 8601 date format', 'Use IANA timezone identifiers (e.g., America/New_York)', 'Leave date empty for current time', 'Custom format: YYYY-MM-DD HH:mm:ss'],
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
    tips: ['Use parse for page title, meta tags, and body HTML', 'Use extract with a CSS selector for matching element text', 'Use toText to get body text without markup'],
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
    tips: ['Supports template expressions like {{$json.x}}', 'Use comma-separated values or arrays for min, max, avg, and sum', 'Set precision for decimal operations (0-20)', 'Supports: add, subtract, multiply, divide, modulo, power, sqrt, abs, round, floor, ceil, min, max, avg, sum'],
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
      'This node\'s output replaces $json entirely — fields from before this node do not survive past it, so capture anything needed later first',
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
      'Get Document ID from the Google Docs URL: https://docs.google.com/document/d/DOCUMENT_ID/edit — you can paste the full Document URL, or just the DOCUMENT_ID into Document ID',
      'Read only extracts plain text — there is no table/list structure in the output, and choosing Markdown does not convert formatting',
      'Write deletes ALL existing content before inserting the new text — use Append to add without removing what is already there',
      'Create makes a brand-new document and returns documentUrl to share it',
      'Always connect a Google account first via Connections',
      'For read/write/append, ensure the connected Google account has access to the target document',
    ],
  },

  google_drive: {
    overview: 'List, upload, or download files in Google Drive. The Delete option is shown in the dropdown but is not implemented by the runtime executor — selecting it always fails.',
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
      'Delete is not implemented — it always fails with "Unsupported Google Drive operation: delete"',
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
      'Times must be ISO 8601 format (UTC) — Start Time/End Time are converted automatically',
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
      'List/Search only return {id, threadId} per message — use a Get step with that id for full content',
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
      'Task IDs are returned at {{$json.data.id}} when creating tasks — everything is nested under data, not top-level',
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
      'All contact fields are nested under data — there is no top-level resourceName/names/emailAddresses',
      'List Contacts with Contact ID empty returns every contact in data.connections; filling Contact ID fetches just that one contact instead',
      'Max Results (pageSize) only limits how many contacts a full listing returns — it does not filter or search',
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
      'Get credentials from Auth0 Dashboard → Applications',
      'User ID format: "auth0|123456" or "google-oauth2|123456"',
      'Use Management API for user operations',
      'Get token operation uses client credentials grant',
    ],
  },

  // ============================================
  // PAYMENT & FINANCE NODES
  // ============================================
  stripe: {
    overview: 'Stripe payment processing. Create payments, manage customers, handle subscriptions, and process refunds.',
    inputs: ['apiKey', 'amount', 'currency', 'paymentMethodId', 'customerId'],
    outputs: ['payment_intent', 'payment', 'customer', 'subscription', 'refund'],
    example: `Operation: Create Payment Intent
API Key: sk_test_...
Amount: 1000 (cents)
Currency: usd

Output: {
  id: "pi_1234567890",
  amount: 1000,
  currency: "usd",
  status: "requires_payment_method",
  client_secret: "pi_1234567890_secret_..."
}`,
    tips: [
      'Amount is in smallest currency unit (cents for USD)',
      'Use test keys (sk_test_) for development',
      'Payment Intent is required for modern payment flows',
      'Customer ID format: cus_...',
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
    overview: 'PayPal payment processing. Create orders, capture payments, process refunds, and manage transactions.',
    inputs: ['clientId', 'clientSecret', 'environment', 'amount', 'currency', 'orderId'],
    outputs: ['order', 'access_token', 'capture', 'refund'],
    example: `Operation: Create Order
Client ID: your-client-id
Client Secret: your-client-secret
Environment: sandbox
Amount: 10.00
Currency: USD

Output: {
  id: "5O190127TN364715T",
  status: "CREATED",
  links: [{
    href: "https://api.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T",
    rel: "self"
  }]
}`,
    tips: [
      'Use sandbox for testing, production for live',
      'Amount is decimal string (e.g., "10.00")',
      'Order must be captured after creation',
      'Access token auto-generated for API calls',
    ],
  },

  // ============================================
  // E-COMMERCE NODES
  // ============================================
  shopify: {
    overview: 'Shopify e-commerce operations. Manage products, orders, customers, and inventory.',
    inputs: ['shopDomain', 'accessToken', 'productId', 'orderId', 'customerId'],
    outputs: ['product', 'products array', 'order', 'orders array', 'customer', 'customers array'],
    example: `Operation: Get Product
Shop Domain: mystore.myshopify.com
Access Token: shpat_...
Product ID: 123456789

Output: {
  product: {
    id: 123456789,
    title: "Product Name",
    vendor: "Vendor Name",
    product_type: "Type",
    variants: [...],
    images: [...]
  }
}`,
    tips: [
      'Get access token from Shopify Admin → Settings → Apps → Develop apps',
      'Shop domain format: your-shop.myshopify.com',
      'Product ID is numeric',
      'Use Admin API version 2024-01 or later',
    ],
  },

  woocommerce: {
    overview: 'WooCommerce store operations. Manage products, orders, customers, and store data.',
    inputs: ['storeUrl', 'consumerKey', 'consumerSecret', 'productId', 'orderId', 'customerId'],
    outputs: ['product', 'products array', 'order', 'orders array', 'customer'],
    example: `Operation: Get Product
Store URL: https://yourstore.com
Consumer Key: ck_...
Consumer Secret: cs_...
Product ID: 123

Output: {
  id: 123,
  name: "Product Name",
  sku: "PRODUCT-SKU",
  price: "29.99",
  stock_status: "instock"
}`,
    tips: [
      'Get API keys from WooCommerce → Settings → Advanced → REST API',
      'Store URL without trailing slash',
      'Consumer key starts with ck_, secret with cs_',
      'Product/Order IDs are numeric',
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
      'Get access token from Magento Admin → System → Integrations',
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
      'Get credentials from BigCommerce → Advanced Settings → API Accounts',
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
      'Get project token from Mixpanel → Project Settings',
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
      'Get write key from Segment → Settings → API Keys',
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
      'Get API key from Amplitude → Settings → Projects',
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
4. All approvers approve → Workflow continues with "approved" branch
5. Any approver rejects or timeout → Workflow continues with "rejected" branch

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
2. If fails → Try backup_handler
3. If fails → Try default_handler
4. If all fail → Error

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
- If all fail → Error

Output (success on attempt 3): {
  result: {...},
  attempts: 3,
  total_delay: 3000,
  success: true
}`,
    tips: [
      'Exponential backoff prevents overwhelming services',
      'Initial delay × multiplier^attempt = delay for each retry',
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
3. If completes within timeout → Continue
4. If exceeds timeout → Terminate with error

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
      'Can rename nested keys with dot notation',
      'Mappings are applied in order',
      'Useful for data normalization',
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
      'Use backticks and fully qualify table names as `project.dataset.table` — Dataset ID above is not applied automatically',
      'Standard SQL recommended (leave Use Legacy SQL off)',
      'Results are BigQuery\'s raw {f: [{v}]} row format, not plain column-named objects — zip data.schema.fields with each row in a JavaScript node to get friendly objects',
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
      'Get endpoint from Azure Portal → Your Resource → Keys and Endpoint',
      'Deployment name is the name you gave your model deployment in Azure',
      'API version defaults to latest preview',
      'Use Azure endpoints for better data residency control',
      'Same models available as OpenAI but hosted on Azure',
    ],
  },

  hugging_face: {
    overview: 'Use Hugging Face Inference API to access thousands of open-source AI models. Supports text generation, classification, question answering, summarization, and translation tasks. Perfect for experimenting with different models or using specialized models.',
    inputs: ['apiKey', 'model', 'task', 'parameters'],
    outputs: ['output', 'model', 'task'],
    example: `Model ID: gpt2
Task: text-generation
Parameters: {"max_length": 100, "temperature": 0.7}
Input Text: "The future of AI is"

Output: {
  output: "The future of AI is bright and full of possibilities...",
  model: "gpt2",
  task: "text-generation"
}`,
    tips: [
      'Find model IDs at huggingface.co/models',
      'Task must match model capabilities',
      'Many models available for free',
      'Use model-specific parameters for best results',
      'Token starts with hf_',
    ],
  },

  cohere: {
    overview: 'Use Cohere AI models for text generation and language understanding. Cohere specializes in command models optimized for following instructions and generating high-quality text. Great for content generation, summarization, and classification tasks.',
    inputs: ['apiKey', 'model', 'prompt', 'temperature'],
    outputs: ['text', 'generation_id', 'model'],
    example: `Model: command
Prompt: "Summarize this text: [text]"
Temperature: 0.7

Output: {
  text: "Summary of the provided text...",
  generation_id: "gen_abc123",
  model: "command"
}`,
    tips: [
      'Command model is best for general tasks',
      'Command Light is faster and cheaper',
      'Command R/R+ for complex multi-step tasks',
      'Lower temperature for factual tasks',
      'Get API key from dashboard.cohere.com',
    ],
  },

  ollama: {
    overview: 'AI chat completion using Gemini 3.5 Flash, the platform\'s default LLM. Send a prompt and get a text response back — no setup or API key required.',
    inputs: ['prompt', 'temperature'],
    outputs: ['response_text', 'response', 'text'],
    example: `Prompt: "Explain quantum computing in simple terms"
Temperature: 0.7

Output: {
  response_text: "Quantum computing uses quantum mechanics...",
}`,
    tips: [
      'Uses the platform\'s built-in Gemini 3.5 Flash model — no API key needed',
      'Lower temperature (0.0-0.5) for factual, consistent answers',
      'Higher temperature (0.7-1.2) for creative, varied answers',
      'For more control (system prompt, response format), use the AI Chat Model node instead',
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
    overview: 'Unified interface for multiple AI chat providers (OpenAI, Anthropic, Google Gemini, Azure). Switch between providers easily or use multiple providers in the same workflow. Perfect for multi-provider strategies or cost optimization.',
    inputs: ['provider', 'apiKey', 'model', 'prompt', 'temperature', 'endpoint', 'deploymentName'],
    outputs: ['response', 'provider', 'model', 'usage'],
    example: `Provider: OpenAI
Model: gpt-4o
System Prompt: "You are a helpful assistant..."
Temperature: 0.7

Output: {
  response: "Hello! How can I help you?",
  provider: "openai",
  model: "gpt-4o",
  usage: { tokens: 150 }
}`,
    tips: [
      'Switch providers easily without changing workflow logic',
      'Each provider has different model options',
      'Azure requires endpoint and deploymentName',
      'Use for cost optimization across providers',
      'Test with different providers to find best fit',
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
    overview: 'Store, retrieve, clear, or search conversation memory for AI applications. Maintains context across multiple interactions using different memory types (short-term, long-term, or both). Perfect for chatbots, AI assistants, or multi-turn conversations.',
    inputs: ['operation', 'memoryType', 'ttl', 'maxMessages', 'key', 'sessionId'],
    outputs: ['memory', 'messages', 'searchResults'],
    example: `Operation: store
Memory Type: both
TTL: 3600 seconds (1 hour)
Max Messages: 100
Session ID: session_123

Stored memory for session_123 with 1 hour TTL

Retrieve Operation:
Output: {
  memory: {...},
  messages: [...]
}`,
    tips: [
      'Store: save conversation memory',
      'Retrieve: get stored memory by key/session',
      'Clear: delete stored memory',
      'Search: find memory by content',
      'Short-term: session-based, Long-term: persistent',
    ],
  },

  // ============================================
  // DATABASE NODES
  // ============================================
  redis: {
    overview: 'Interact with Redis key-value store for caching, session management, or fast data storage. Supports get, set, and delete operations with optional TTL (time-to-live). Perfect for caching frequently accessed data or managing sessions.',
    inputs: ['host', 'port', 'password', 'operation', 'key', 'value', 'ttl'],
    outputs: ['value', 'result'],
    example: `Operation: set
Key: "user:123:cache"
Value: "cached_data"
TTL: 3600 seconds (1 hour)

Get Operation:
Output: {
  value: "cached_data",
  result: "success"
}`,
    tips: [
      'Use namespaces like "user:123" or "session:abc"',
      'TTL sets expiration time in seconds',
      'Fast key-value operations',
      'Perfect for caching and session storage',
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
    overview: 'Query TimescaleDB (PostgreSQL extension for time-series data) using SELECT queries or raw SQL. Perfect for time-series data, metrics, IoT data, or time-based analytics. Supports hypertables and time-series functions.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'operation', 'table', 'query', 'filters', 'limit'],
    outputs: ['rows', 'count'],
    example: `Host: timescale.example.com
Database: metrics_db
Operation: query
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
      'Hypertables automatically partitioned by time',
      'Use time_bucket() for time-based aggregations',
      'Perfect for metrics, IoT, and time-series data',
      'Optimized for time-based queries',
    ],
  },

  // ============================================
  // STORAGE NODES
  // ============================================
  read_binary_file: {
    overview: 'Read managed workflow file assets or files under the backend binary storage root. Use this after Write Binary File, or for server-side temporary files. For Drive/cloud links, use Google Drive, HTTP Request, S3, Dropbox, or OneDrive first.',
    inputs: ['sourceType', 'assetId', 'filePath', 'maxSize'],
    outputs: ['assetId', 'fileName', 'mimeType', 'dataBase64', 'sizeBytes', 'storageKey'],
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
      'Returns file bytes as dataBase64',
      'Set max size to prevent memory issues',
      'Use assetId from Write Binary File for durable workflow handoff',
      'Server paths are restricted to the backend binary storage root',
      'Do not paste Google Drive/share URLs here',
    ],
  },

  aws_s3: {
    overview: 'Interact with AWS S3 for cloud file storage. Upload, download, list, or delete files in S3 buckets. Perfect for file backups, media storage, or cloud file management. Supports folders using object key paths.',
    inputs: ['accessKeyId', 'secretAccessKey', 'region', 'bucket', 'operation', 'key', 'content', 'prefix'],
    outputs: ['result', 'content', 'objects'],
    example: `Operation: put
Bucket: my-bucket
Key: "folder/file.txt"
Content: "Hello from CtrlChecks!"
Region: us-east-1

Get Operation:
Output: {
  content: "Hello from CtrlChecks!",
  result: "success"
}`,
    tips: [
      'Use folder structure in object keys: "folder/subfolder/file.txt"',
      'Content can be plain text or base64-encoded binary',
      'Region must match bucket region',
      'List operation supports prefix filtering',
      'Secure credentials - use IAM best practices',
    ],
  },

  ftp: {
    overview: 'Interact with FTP servers for file transfer. Upload, download, list, or delete files on FTP servers. Supports standard FTP (port 21) and FTPS (port 990). Perfect for legacy file transfer workflows.',
    inputs: ['host', 'port', 'username', 'password', 'operation', 'remotePath', 'content'],
    outputs: ['result', 'content', 'files'],
    example: `Operation: get
Host: ftp.example.com
Port: 21
Remote Path: /files/data.txt

Output: {
  content: "File content...",
  result: "success"
}`,
    tips: [
      'Port 21 for standard FTP, 990 for FTPS',
      'Use absolute paths starting with /',
      'Content for put operation can be text or base64',
      'List operation returns files in directory',
      'Consider SFTP for better security',
    ],
  },

  sftp: {
    overview: 'Interact with SFTP servers for secure file transfer over SSH. Upload, download, list, or delete files on SFTP servers. More secure than FTP. Perfect for secure file transfers to servers.',
    inputs: ['host', 'port', 'username', 'password', 'privateKey', 'operation', 'remotePath', 'content'],
    outputs: ['result', 'content', 'files'],
    example: `Operation: put
Host: sftp.example.com
Port: 22
Remote Path: /var/www/uploads/file.txt
Content: "Hello World"

Output: {
  result: "success"
}`,
    tips: [
      'Port 22 is standard SSH/SFTP port',
      'Use private key for better security than password',
      'Private key format: -----BEGIN RSA PRIVATE KEY----- ...',
      'Supports absolute and relative paths',
      'More secure than FTP - uses SSH protocol',
    ],
  },

  dropbox: {
    overview: 'Interact with Dropbox cloud storage. Upload, download, list, or delete files in Dropbox. Perfect for cloud file management, backups, or syncing files with Dropbox accounts.',
    inputs: ['accessToken', 'operation', 'path', 'content'],
    outputs: ['result', 'content', 'files'],
    example: `Operation: upload
Path: /Documents/file.txt
Content: "Hello from CtrlChecks!"

List Operation:
Output: {
  files: [
    {name: "file.txt", path: "/Documents/file.txt", size: 1234}
  ]
}`,
    tips: [
      'Paths start with / for root',
      'Get access token from Dropbox App Console',
      'Set required permissions (files.read, files.write)',
      'Content for upload can be text or base64',
      'List operation shows files in folder',
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
    inputs: ['eventTypes', 'instagramBusinessAccountId', 'allowedSenderIds', 'verifyToken', 'validateSignature'],
    outputs: ['chatId', 'senderId', 'recipientId', 'text', 'eventType', 'messageId', 'commentId', 'mediaId', 'mentionId', 'instagramBusinessAccountId', 'raw'],
    example: `Incoming Instagram DM:
{
  chatId: "1234567890",
  senderId: "1234567890",
  recipientId: "17841400000000000",
  text: "Can you help me?"
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
    overview: 'Send WhatsApp messages, media, locations, contact cards, approved templates, and interactive buttons/lists through the WhatsApp Business Cloud API. Connect a WhatsApp/Facebook account under Connections — credentials are resolved automatically. The visual panel exposes the Message resource; Contact, Conversation, Template, Campaign, and AI Agent resources are runtime-supported for advanced or AI-generated workflows.',
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
      'Connect a WhatsApp account under Connections — no access tokens entered on the node itself',
      'Phone numbers should be in E.164 format, e.g. +12345678900',
      'First message to a new contact must use Send Template; free-form Send Text only works inside the 24-hour customer service window',
      'Use {{$json.messages[0].id}} to track delivery, and {{$json.chatId}} or {{$json.from}} from WhatsApp Trigger for replies',
      'Contact, Conversation, Template, Campaign, and AI Agent actions are documented on the WhatsApp node page but are only reachable via AI-generated or manually edited workflow configs, not this visual Resource dropdown yet',
    ],
  },

  // Deprecated alias for 'whatsapp' — kept only for workflows saved before the merge.
  whatsapp_cloud: {
    overview: 'Deprecated — use the WhatsApp node instead. This node only ever sends a plain WhatsApp text message and is kept only for backward compatibility with existing workflows; it delegates execution and credentials to the WhatsApp node under the hood.',
    inputs: ['to', 'text (labeled "Message" in the panel)', 'messageType (inert)'],
    outputs: ['success', 'data', '_error / _errorCode / _errorDetails on failure'],
    example: `To: +1234567890
Message: "Hello from CtrlChecks!"

Output: {
  success: true,
  data: { messaging_product: "whatsapp", contacts: [...], messages: [{ id: "wamid.xxx" }] }
}`,
    tips: [
      'Deprecated — replace with the WhatsApp node in new workflows; it supports media, locations, contacts, templates, and interactive messages that this node cannot reach',
      'The Message field is stored under the key text, not message — a prior panel version used message, which the shared runtime never read, so those sends went out empty',
      'Message Type has no effect on the send — this node always sends plain text regardless of its value',
      'Connect a WhatsApp account under Connections — no API keys entered on the node itself',
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
      'status is the initial queue state (queued/sent), not final delivery — this node does not poll for delivered/failed',
      'On failure, check {{$json._errorDetails}} for the real reason — {{$json._error}} alone is just a bare status-code message, and there is no success: false to check instead',
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
      'Use /root/item style paths for extract',
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
    overview: 'Connects to HubSpot CRM to create, update, retrieve, delete, or search contacts, companies, deals, tickets, and other objects. Perfect for automating sales, marketing, and support workflows.',
    inputs: ['authType', 'apiKey', 'accessToken', 'resource', 'operation', 'id', 'properties', 'searchQuery', 'limit', 'after'],
    outputs: ['result', 'records', 'paging'],
    example: `Resource: contact
Operation: create
Properties: {
  "email": "john@example.com",
  "firstname": "John",
  "lastname": "Doe"
}

Output: {
  result: {
    id: "12345",
    properties: {
      email: "john@example.com",
      firstname: "John",
      lastname: "Doe"
    }
  }
}`,
    tips: [
      'Use Private App access tokens when possible',
      'Choose the correct resource (contact, company, deal, ticket)',
      'Search before create to avoid duplicates',
      'Use pagination (after) for large datasets',
      'Respect HubSpot API rate limits',
    ],
  },
  bitbucket: {
    overview: 'Automates Bitbucket tasks like managing repositories, branches, commits, pull requests, comments, and pipelines. Great for DevOps workflows, approvals, and repository automation.',
    inputs: [
      'username',
      'appPassword',
      'operation',
      'workspace',
      'repo',
      'title',
      'description',
      'sourceBranch',
      'destinationBranch',
      'prId',
      'comment',
      'mergeStrategy',
      'branchName',
      'targetBranch',
      'commitSha',
      'pipelineUuid',
    ],
    outputs: ['result', 'records', 'paging'],
    example: `Operation: create_pr
Workspace: my-team
Repository: backend-api
Title: "Add login feature"
Source Branch: feature/login
Destination Branch: main

Output: {
  result: {
    id: 42,
    title: "Add login feature",
    state: "OPEN"
  }
}`,
    tips: [
      'Use App Passwords, not your login password',
      'Verify workspace and repo names from the URL',
      'Use Search/Get before Update or Merge',
      'Use PRs for changes instead of direct merges',
      'Respect API rate limits for large repos',
    ],
  },

  salesforce: {
    overview: 'Interact with Salesforce CRM using SOQL queries, SOSL search, or CRUD operations. Supports standard objects (Account, Contact, Lead, Opportunity) and custom objects. Perfect for enterprise CRM automation, sales pipeline management, or Salesforce data integration.',
    inputs: ['instanceUrl', 'accessToken', 'resource', 'customObject', 'operation', 'soql', 'sosl', 'id', 'fields', 'externalIdField', 'externalIdValue'],
    outputs: ['records', 'result', 'totalSize'],
    example: `Resource: Contact
Operation: query
SOQL Query: SELECT Id, Name, Email FROM Contact WHERE Email = 'john@example.com' LIMIT 10

Output: {
  records: [
    {
      Id: "003xx000004TmiQAAS",
      Name: "John Doe",
      Email: "john@example.com"
    }
  ],
  totalSize: 1
}`,
    tips: [
      'Instance URL: https://yourinstance.salesforce.com',
      'Use SOQL for structured queries',
      'Use SOSL for full-text search',
      'Upsert uses External ID fields',
      'Bulk operations for large data sets',
    ],
  },

  zoho_crm: {
    overview: 'Interact with Zoho CRM to manage leads, contacts, accounts, deals, and other CRM modules. Supports CRUD operations, search, and bulk processing. Perfect for small to medium business CRM automation or Zoho ecosystem integration.',
    inputs: ['accessToken', 'apiDomain', 'module', 'customModule', 'operation', 'id', 'data', 'criteria', 'fields', 'page', 'perPage'],
    outputs: ['result', 'data', 'info'],
    example: `Module: Contacts
Operation: create
Data: {
  "First_Name": "John",
  "Last_Name": "Doe",
  "Email": "john@example.com"
}

Output: {
  result: {
    id: "1234567890123456789",
    status: "success"
  },
  data: {
    First_Name: "John",
    Last_Name: "Doe",
    Email: "john@example.com"
  }
}`,
    tips: [
      'Get access token from Zoho Developer Console',
      'Modules: Leads, Contacts, Accounts, Deals, etc.',
      'Use criteria for search operations',
      'Bulk operations available for efficiency',
      'Field names are case-sensitive',
    ],
  },

  pipedrive: {
    overview: 'Interact with Pipedrive CRM to manage deals, persons, organizations, and activities. Supports CRUD operations and search. Perfect for sales pipeline management, deal tracking, or Pipedrive automation.',
    inputs: ['apiToken', 'resource', 'operation', 'id', 'data', 'filter', 'limit'],
    outputs: ['result', 'data', 'additional_data'],
    example: `Resource: deals
Operation: create
Data: {
  "title": "New Deal",
  "value": 10000,
  "currency": "USD",
  "person_id": 123
}

Output: {
  result: {
    id: 12345,
    title: "New Deal",
    value: 10000,
    currency: "USD"
  }
}`,
    tips: [
      'Get API token from Pipedrive Settings → Personal → API',
      'Resources: deals, persons, organizations, activities',
      'Filter operations for searching',
      'Use person_id or org_id to link deals',
      'Currency codes: USD, EUR, GBP, etc.',
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
    overview: 'Interact with Xero accounting software to manage contacts, invoices, payments, and financial data. Supports CRUD operations and queries. Perfect for accounting automation, invoice management, or Xero ecosystem integration.',
    inputs: ['accessToken', 'tenantId', 'resource', 'operation', 'recordId', 'payload', 'where'],
    outputs: ['success', 'resource', 'operation', 'record', 'records', 'count', 'pagination'],
    example: `Resource: Contacts
Operation: create
Payload: {
  "Name": "Acme Corp",
  "EmailAddress": "contact@acme.com"
}

Output: {
  success: true,
  record: {
    ContactID: "12345678-1234-1234-1234-123456789012",
    Name: "Acme Corp",
    EmailAddress: "contact@acme.com"
  }
}`,
    tips: [
      'Get access token from Xero Developer Portal',
      'Tenant ID is your organization ID',
      'Resources: Contacts, Invoices, Payments, Items, Accounts',
      'Use the where field for filtering (Xero WHERE clause syntax)',
      'OAuth2 authentication required',
    ],
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
    overview: 'Query PostgreSQL databases using SELECT queries or raw SQL. Supports standard PostgreSQL SQL syntax, joins, subqueries, and advanced features. Perfect for relational database operations, data analysis, or PostgreSQL-specific features.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'operation', 'table', 'query', 'filters', 'limit', 'orderBy', 'ascending'],
    outputs: ['rows', 'count'],
    example: `Operation: query
SQL Query: SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = 'completed' LIMIT 10

Output: {
  rows: [
    {name: "John Doe", total: 1000},
    {name: "Jane Smith", total: 1500}
  ],
  count: 2
}`,
    tips: [
      'Supports standard PostgreSQL SQL syntax',
      'Use Raw SQL for complex queries with JOINs',
      'Select operation for simple queries with filters',
      'PostgreSQL-specific features supported in Raw SQL',
      'Use connection pooling for better performance',
    ],
  },

  supabase: {
    overview: 'Query Supabase (PostgreSQL-based) databases using SELECT queries or raw SQL. Supabase uses PostgreSQL, so same syntax applies. Perfect for Supabase projects, real-time applications, or PostgreSQL database operations.',
    inputs: ['projectUrl', 'apiKey', 'operation', 'table', 'query', 'filters', 'limit', 'orderBy', 'ascending'],
    outputs: ['rows', 'count'],
    example: `Operation: select
Table: users
Filters: {"status": "active"}
Limit: 10

Output: {
  rows: [
    {id: 1, name: "John", status: "active"},
    {id: 2, name: "Jane", status: "active"}
  ],
  count: 2
}`,
    tips: [
      'Uses PostgreSQL syntax (same as PostgreSQL node)',
      'Get project URL and API key from Supabase dashboard',
      'Select operation for simple queries',
      'Raw SQL for complex queries with JOINs',
      'Perfect for Supabase project integration',
    ],
  },

  mysql: {
    overview: 'Query MySQL databases using SELECT queries. Currently supports simple SELECT operations with filters. Perfect for MySQL database queries, data retrieval, or MySQL-specific operations.',
    inputs: ['host', 'port', 'database', 'username', 'password', 'table', 'filters', 'limit'],
    outputs: ['rows', 'count'],
    example: `Table: users
Filters: {"status": "active"}
Limit: 10

Output: {
  rows: [
    {id: 1, name: "John", status: "active"},
    {id: 2, name: "Jane", status: "active"}
  ],
  count: 2
}`,
    tips: [
      'Currently supports SELECT operations only',
      'Use filters for WHERE clause conditions',
      'Simple query interface for quick data retrieval',
      'Use PostgreSQL node for complex queries',
      'Perfect for basic MySQL queries',
    ],
  },

  mongodb: {
    overview: 'Query MongoDB collections using find operations. Supports MongoDB query syntax with operators ($gt, $gte, $regex, etc.). Perfect for NoSQL database operations, document queries, or MongoDB-specific features.',
    inputs: ['connectionString', 'database', 'collection', 'query', 'limit'],
    outputs: ['documents', 'count'],
    example: `Collection: users
Query: {"status": "active", "age": {"$gte": 18}}
Limit: 10

Output: {
  documents: [
    {_id: "123", name: "John", status: "active", age: 25},
    {_id: "456", name: "Jane", status: "active", age: 30}
  ],
  count: 2
}`,
    tips: [
      'Currently supports Find operation only',
      'Use MongoDB query operators ($gt, $gte, $regex, etc.)',
      'Collection names are similar to tables in SQL',
      'Query format is JSON with MongoDB operators',
      'Perfect for NoSQL document queries',
    ],
  },

  // ============================================
  // DEVOPS NODES
  // ============================================
  github: {
    overview: 'Interact with GitHub API to manage repositories, issues, pull requests, branches, commits, releases, and workflows. Supports comprehensive GitHub operations. Perfect for GitHub automation, CI/CD integration, or repository management.',
    inputs: ['token', 'owner', 'repo', 'operation', 'title', 'body', 'workflowId', 'ref'],
    outputs: ['result', 'data', 'workflowRuns'],
    example: `Operation: create_issue
Owner: octocat
Repo: Hello-World
Title: "Bug in login"
Body: "Login button not working"

Output: {
  result: {
    number: 123,
    title: "Bug in login",
    state: "open"
  }
}`,
    tips: [
      'Get token from GitHub Settings → Developer settings → Personal access tokens',
      'Owner is username or organization name',
      'Repo is repository name',
      'Supports issues, PRs, branches, commits, releases, workflows',
      'Use for GitHub automation and CI/CD integration',
    ],
  },

  gitlab: {
    overview: 'Interact with GitLab API to manage projects, issues, merge requests, branches, commits, pipelines, and releases. Supports comprehensive GitLab operations. Perfect for GitLab automation, CI/CD integration, or project management.',
    inputs: ['token', 'projectId', 'operation', 'data'],
    outputs: ['result', 'data'],
    example: `Operation: create_issue
Project ID: 12345
Data: {
  "title": "Feature request",
  "description": "Add new feature"
}

Output: {
  result: {
    iid: 1,
    title: "Feature request",
    state: "opened"
  }
}`,
    tips: [
      'Get token from GitLab Settings → Access Tokens',
      'Project ID is numeric identifier or path',
      'Supports issues, MRs, branches, commits, pipelines',
      'Use for GitLab automation and CI/CD',
      'Works with GitLab.com and self-hosted instances',
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
    overview: 'Connects to Jenkins to trigger jobs, monitor builds, fetch build logs, and automate CI/CD steps. Ideal for deployment pipelines and build notifications.',
    inputs: ['baseUrl', 'username', 'token', 'jobName', 'operation', 'parameters'],
    outputs: ['result', 'jobs', 'builds', 'buildStatus'],
    example: `Operation: trigger_build
Base URL: https://jenkins.example.com
Job Name: my-job
Parameters: {"BRANCH": "main"}

Output: {
  result: {
    buildNumber: 123,
    status: "QUEUED"
  }
}`,
    tips: [
      'Use API token instead of password',
      'Base URL must include https:// or http://',
      'Use parameterized jobs for dynamic values',
      'Polling is useful for long-running builds',
      'Limit permissions to required jobs',
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
      'Get API key and App key from Datadog Settings → API Keys',
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
      'Get auth token from Sentry Settings → Auth Tokens',
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
    overview: 'Interact with Trello API to manage boards, lists, cards, and members. Supports creating cards, moving cards, adding comments, and managing boards. Perfect for task management automation or Trello integration.',
    inputs: ['apiKey', 'apiToken', 'boardId', 'operation', 'data'],
    outputs: ['result', 'cards', 'boards', 'lists'],
    example: `Operation: create_card
Board ID: board123
List ID: list456
Data: {
  "name": "New task",
  "desc": "Task description"
}

Output: {
  result: {
    id: "card_id",
    name: "New task",
    idList: "list456"
  }
}`,
    tips: [
      'Get API key and token from Trello Developer API Keys',
      'Board ID and List ID required for card operations',
      'Supports boards, lists, cards, members',
      'Use for task management automation',
      'Move cards between lists, add comments, attach files',
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
      'Get API token from Todoist Settings → Integrations → Developer',
      'Project ID required for project-specific tasks',
      'Supports tasks, projects, labels, comments',
      'Use for task automation and reminders',
      'Due dates support natural language (tomorrow, next week)',
    ],
  },

  notion: {
    overview: 'Interact with Notion API to manage pages, databases, blocks, and content. Supports creating pages, querying databases, updating content, and managing workspaces. Perfect for knowledge management automation or Notion integration.',
    inputs: ['accessToken', 'operation', 'databaseId', 'pageId', 'data'],
    outputs: ['result', 'pages', 'databases', 'blocks'],
    example: `Operation: create_page
Database ID: database_id
Data: {
  "properties": {
    "Name": {"title": [{"text": {"content": "New Page"}}]},
    "Status": {"select": {"name": "Active"}}
  }
}

Output: {
  result: {
    id: "page_id",
    properties: {
      Name: {"title": [{"text": {"content": "New Page"}}]}
    }
  }
}`,
    tips: [
      'Get access token from Notion → Settings & Members → Integrations',
      'Share database/page with integration bot',
      'Supports pages, databases, blocks management',
      'Use for knowledge management automation',
      'Query databases and create pages programmatically',
    ],
  },

  clickup: {
    overview: 'Interact with ClickUp API to manage workspaces, spaces, folders, lists, and tasks. Supports creating tasks, updating status, assigning tasks, and managing projects. Perfect for project management automation or ClickUp integration.',
    inputs: ['apiToken', 'workspaceId', 'spaceId', 'operation', 'data'],
    outputs: ['result', 'tasks', 'lists', 'spaces'],
    example: `Operation: create_task
List ID: list123
Data: {
  "name": "Complete task",
  "assignees": ["user_id"],
  "due_date": 1735689600000
}

Output: {
  result: {
    id: "task_id",
    name: "Complete task",
    status: {"status": "to do"}
  }
}`,
    tips: [
      'Get API token from ClickUp Settings → Apps → API',
      'Workspace, Space, and List IDs required',
      'Supports tasks, lists, folders, spaces',
      'Use for project management automation',
      'Create, update, assign tasks programmatically',
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
      'Get API token from Monday.com Account → Admin → API',
      'Board ID and Group ID required',
      'Supports items, boards, groups, columns',
      'Use for project management automation',
      'Update column values and create items programmatically',
    ],
  },

  jira: {
    overview: 'Interact with Jira API to manage projects, issues, workflows, and users. Supports creating issues, updating status, adding comments, and managing projects. Perfect for issue tracking automation or Jira integration.',
    inputs: ['baseUrl', 'email', 'apiToken', 'operation', 'projectKey', 'data'],
    outputs: ['result', 'issues', 'projects'],
    example: `Operation: create_issue
Project Key: PROJ
Data: {
  "summary": "Bug in login",
  "description": "Login button not working",
  "issuetype": {"name": "Bug"}
}

Output: {
  result: {
    id: "10000",
    key: "PROJ-1",
    summary: "Bug in login"
  }
}`,
    tips: [
      'Get API token from Atlassian Account Settings → Security → API tokens',
      'Base URL: your Jira instance URL',
      'Project Key required for issue operations',
      'Supports issues, projects, workflows, users',
      'Use for issue tracking automation',
    ],
  },

  airtable: {
    overview: 'Interact with Airtable API to manage bases, tables, records, and fields. Supports creating records, updating fields, querying records, and managing bases. Perfect for database automation or Airtable integration.',
    inputs: ['apiKey', 'baseId', 'tableId', 'operation', 'data', 'fields'],
    outputs: ['result', 'records', 'tables'],
    example: `Operation: create_record
Base ID: app123
Table ID: tbl456
Data: {
  "fields": {
    "Name": "John Doe",
    "Email": "john@example.com"
  }
}

Output: {
  result: {
    id: "rec123",
    fields: {
      Name: "John Doe",
      Email: "john@example.com"
    }
  }
}`,
    tips: [
      'Get API key from Airtable Account → Developers → Personal access tokens',
      'Base ID and Table ID required',
      'Supports records, tables, fields management',
      'Use for database automation',
      'Query, create, update records programmatically',
    ],
  },

  // ============================================
  // SOCIAL MEDIA NODES
  // ============================================
  facebook: {
    overview: 'Interact with Facebook Graph API to manage posts, pages, comments, and messages. Supports creating posts, reading feeds, managing pages, and sending messages. Perfect for social media automation or Facebook integration.',
    inputs: ['accessToken', 'pageId', 'operation', 'data'],
    outputs: ['result', 'posts', 'comments', 'messages'],
    example: `Operation: create_post
Page ID: page123
Data: {
  "message": "Hello from CtrlChecks!",
  "link": "https://example.com"
}

Output: {
  result: {
    id: "post_id",
    message: "Hello from CtrlChecks!",
    created_time: "2024-01-15T10:30:00Z"
  }
}`,
    tips: [
      'Get access token from Facebook Developers → App → Tools → Graph API Explorer',
      'Page ID required for page operations',
      'Supports posts, pages, comments, messages',
      'Use for social media automation',
      'Requires appropriate Facebook App permissions',
    ],
  },

  twitter: {
    overview: 'Interact with Twitter API to manage tweets, users, timelines, and direct messages. Supports creating tweets, reading timelines, managing followers, and sending DMs. Perfect for social media automation or Twitter integration.',
    inputs: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret', 'operation', 'data'],
    outputs: ['result', 'tweets', 'users'],
    example: `Operation: create_tweet
Data: {
  "text": "Hello from CtrlChecks!"
}

Output: {
  result: {
    id: "tweet_id",
    text: "Hello from CtrlChecks!",
    created_at: "2024-01-15T10:30:00Z"
  }
}`,
    tips: [
      'Get credentials from Twitter Developer Portal → App → Keys and tokens',
      'Requires API key, secret, access token, and access token secret',
      'Supports tweets, users, timelines, direct messages',
      'Use for social media automation',
      'Rate limits apply - respect Twitter API limits',
    ],
  },

  linkedin: {
    overview: 'Interact with LinkedIn API to manage posts, profiles, connections, and messages. Supports creating posts, reading profiles, managing connections, and sending messages. Perfect for professional networking automation or LinkedIn integration.',
    inputs: ['accessToken', 'operation', 'data'],
    outputs: ['result', 'posts', 'profiles'],
    example: `Operation: create_post
Data: {
  "text": "Excited to share our new feature!",
  "visibility": "PUBLIC"
}

Output: {
  result: {
    id: "post_id",
    text: "Excited to share our new feature!",
    created: {"time": 1705314600000}
  }
}`,
    tips: [
      'Get access token from LinkedIn Developer Portal → App → Auth',
      'Requires OAuth 2.0 authentication',
      'Supports posts, profiles, connections, messages',
      'Use for professional networking automation',
      'Requires appropriate LinkedIn API permissions',
    ],
  },

  instagram: {
    overview: 'Interact with Instagram Graph API to manage posts, stories, comments, and media. Supports creating posts, reading feeds, managing comments, and uploading media. Perfect for Instagram automation or social media integration.',
    inputs: ['accessToken', 'pageId', 'operation', 'data'],
    outputs: ['result', 'posts', 'comments', 'media'],
    example: `Operation: create_post
Page ID: page123
Data: {
  "image_url": "https://example.com/image.jpg",
  "caption": "Check out our new product!"
}

Output: {
  result: {
    id: "media_id",
    permalink: "https://instagram.com/p/..."
  }
}`,
    tips: [
      'Get access token from Facebook Developers (Instagram uses Facebook Graph API)',
      'Page ID required (Instagram Business account)',
      'Supports posts, stories, comments, media',
      'Use for Instagram automation',
      'Requires Instagram Business account and appropriate permissions',
    ],
  },

  youtube: {
    overview: 'Interact with YouTube Data API to manage videos, playlists, channels, and comments. Supports uploading videos, reading playlists, managing channels, and moderating comments. Perfect for video content automation or YouTube integration.',
    inputs: ['apiKey', 'operation', 'channelId', 'data'],
    outputs: ['result', 'videos', 'playlists', 'channels'],
    example: `Operation: list_videos
Channel ID: channel123
Max Results: 10

Output: {
  videos: [
    {
      id: "video_id",
      title: "Video Title",
      publishedAt: "2024-01-15T10:30:00Z"
    }
  ]
}`,
    tips: [
      'Get API key from Google Cloud Console → APIs & Services → Credentials',
      'Enable YouTube Data API v3',
      'Channel ID required for channel-specific operations',
      'Supports videos, playlists, channels, comments',
      'Use for video content automation',
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
      'Get credentials from Reddit → Preferences → Apps → create app',
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
      'Get access token from Box Developer Console → OAuth 2.0',
      'Use OAuth 2.0 flow for authentication',
      'Supports files and folders management',
      'Use for cloud file management',
      'List, upload, download files programmatically',
    ],
  },

  onedrive: {
    overview: 'Interact with Microsoft OneDrive to manage files and folders. Supports uploading, downloading, listing files, and managing folders using Microsoft Graph API. Perfect for cloud file management or Microsoft integration.',
    inputs: ['accessToken', 'operation', 'path', 'content'],
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
      'Get access token from Azure Portal → App registrations → Microsoft Graph API',
      'Requires Files.ReadWrite permission',
      'Supports files and folders via Microsoft Graph API',
      'Use for cloud file management',
      'List, upload, download files programmatically',
    ],
  },

  write_binary_file: {
    overview: 'Create a managed workflow file asset from base64, a data URL, or plain text. Perfect for staging generated PDFs/images before upload, email attachment, OCR, or later workflow steps.',
    inputs: ['fileName', 'mimeType', 'dataBase64', 'folder', 'persist'],
    outputs: ['assetId', 'fileName', 'mimeType', 'dataBase64', 'sizeBytes', 'storageKey', 'metadataPersisted'],
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
    overview: 'Interact with Intercom API to manage contacts, conversations, messages, and teams. Supports creating contacts, sending messages, managing conversations, and accessing help center. Perfect for customer support automation or Intercom integration.',
    inputs: ['accessToken', 'resource', 'operation', 'id', 'data'],
    outputs: ['result', 'contacts', 'conversations', 'messages'],
    example: `Resource: contacts
Operation: create
Data: {
  "email": "user@example.com",
  "name": "John Doe"
}

Output: {
  result: {
    id: "contact_id",
    email: "user@example.com",
    name: "John Doe"
  }
}`,
    tips: [
      'Get access token from Intercom → Settings → Developers → Access tokens',
      'Resources: contacts, conversations, messages, teams',
      'Use for customer support automation',
      'Create contacts, send messages, manage conversations',
      'Integrate with help center and live chat',
    ],
  },

  mailchimp: {
    overview: 'Interact with Mailchimp API to manage audiences, campaigns, lists, and members. Supports creating campaigns, managing subscribers, segmenting audiences, and tracking analytics. Perfect for email marketing automation or Mailchimp integration.',
    inputs: ['apiKey', 'dataCenter', 'resource', 'operation', 'listId', 'data'],
    outputs: ['result', 'members', 'campaigns', 'audiences'],
    example: `Resource: audience
Operation: add_member
List ID: list123
Data: {
  "email_address": "user@example.com",
  "status": "subscribed"
}

Output: {
  result: {
    id: "member_id",
    email_address: "user@example.com",
    status: "subscribed"
  }
}`,
    tips: [
      'Get API key from Mailchimp Account → Extras → API keys',
      'Data center from API key (e.g., us1, us2, eu1)',
      'Resources: audience, campaigns, lists, members',
      'Use for email marketing automation',
      'Add subscribers, create campaigns, manage lists',
    ],
  },

  freshdesk: {
    overview: 'Interact with Freshdesk API to manage tickets, contacts, agents, and conversations. Supports creating tickets, updating status, managing contacts, and accessing knowledge base. Perfect for customer support automation or Freshdesk integration.',
    inputs: ['apiKey', 'domain', 'resource', 'operation', 'id', 'data'],
    outputs: ['result', 'tickets', 'contacts', 'agents'],
    example: `Resource: ticket
Operation: create
Data: {
  "subject": "Support request",
  "description": "Need help with login",
  "email": "user@example.com"
}

Output: {
  result: {
    id: 12345,
    subject: "Support request",
    status: 2
  }
}`,
    tips: [
      'Get API key from Freshdesk Profile → API',
      'Domain: your Freshdesk subdomain',
      'Resources: ticket, contact, agent, conversation',
      'Use for customer support automation',
      'Create tickets, update status, manage contacts',
    ],
  },

  // ============================================
  // SPECIALIZED AI AGENTS & AUTOMATION NODES
  // ============================================
  ai_agent: {
    overview: 'Autonomous intelligent agent capable of understanding user input, reasoning over context, using memory, invoking tools, validating outputs, and producing structured responses. Acts as a decision-making and execution unit inside workflows. Supports multiple execution modes (chat, task, tool-only, planning, validation, autonomous) and can connect to Chat Model (required), Memory (optional), and Tool (optional) nodes.',
    inputs: [
      'systemPrompt (System instructions defining agent behavior)',
      'mode (Execution mode: chat, task, tool_only, planning, validation, autonomous)',
      'userInput (User prompt or input data)',
      'chat_model (Connected Chat Model node - required)',
      'memory (Connected Memory node - optional)',
      'tool (Connected Tool/Function nodes - optional)',
      'temperature, maxTokens, topP, frequencyPenalty, presencePenalty',
      'strictMode, creativityLevel, timeoutLimit, retryCount',
      'outputFormat (text, json, keyvalue, markdown)',
      'includeReasoning, errorHandlingMode, enableValidation',
    ],
    outputs: [
      'response_text (Plain text response)',
      'response_json (Structured JSON response)',
      'response_markdown (Markdown formatted response)',
      'confidence_score (Confidence level 0-1)',
      'used_tools (Array of tools invoked)',
      'memory_written (Whether memory was updated)',
      'error_flag (Whether an error occurred)',
      'error_message (Error details if any)',
      'reasoning (Reasoning steps if includeReasoning enabled)',
    ],
    example: `Configuration:
System Prompt: "You are a customer support agent..."
Mode: chat
Temperature: 0.7
Output Format: json
Enable Memory: true
Enable Tools: true

Connections:
- Chat Model node → AI Agent (chat_model port)
- Memory node → AI Agent (memory port)
- Tool node → AI Agent (tool port)

Input: {
  userInput: "I need help with my order"
}

Output: {
  response_text: "I'd be happy to help with your order...",
  response_json: {
    action: "lookup_order",
    message: "I'd be happy to help..."
  },
  confidence_score: 0.85,
  used_tools: ["order_lookup"],
  memory_written: true,
  error_flag: false
}`,
    tips: [
      'Connect Chat Model node to the top port (required)',
      'Connect Memory node to bottom-left port for conversation history',
      'Connect Tool/Function nodes to bottom-right port for tool execution',
      'Use Chat Mode for conversational interactions',
      'Use Task Mode for single task completion',
      'Use Tool-Only Mode when you only want tool execution',
      'Use Planning Mode to generate action plans',
      'Use Validation Mode to validate inputs/outputs',
      'Use Autonomous Mode for full autonomy',
      'Set strictMode=true to prevent assumptions',
      'Lower temperature (0.1-0.5) for factual tasks',
      'Higher temperature (0.7-1.2) for creative tasks',
      'Enable includeReasoning for debugging and transparency',
      'Configure errorHandlingMode based on workflow needs',
      'Use JSON output format for structured data',
      'Memory connection enables multi-turn conversations',
      'Tool connection enables function calling and API integration',
      'Set appropriate timeoutLimit for complex tasks',
      'Configure retryCount for resilience',
      'Enable validation to reduce hallucinations',
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
      'riskThreshold (0–1, default 0.7)',
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
      'Get API key from ActiveCampaign Settings → Developer',
      'API URL is your account URL, e.g. https://youraccount.api-us1.com',
      'Update and Delete require Contact ID',
      'Data (JSON) overrides Email/First Name/Last Name if both are set',
    ],
  },

  schedulewise: {
    overview: 'Read and manage appointments/schedules through the ScheduleWise API — list schedules, and create, update, or delete appointments.',
    inputs: ['operation', 'dateFrom/dateTo (Get Schedules)', 'patientId', 'staffId', 'appointmentId', 'startDateTime/endDateTime', 'serviceType', 'notes', 'status'],
    outputs: ['success', 'operation', 'data', 'executionTimeMs', 'error'],
    example: `Operation: Get Schedules
Date From: {{$json.startDate}}
Date To: {{$json.endDate}}

Output: {
  success: true,
  operation: "getSchedules",
  data: { records: [...], count: 2 }
}`,
    tips: [
      'Requires a saved ScheduleWise connection (Connections page → ScheduleWise, or paste an API key/access token directly)',
      'Use Mock Mode to test the workflow without calling the real ScheduleWise API',
      'Update and Delete Appointment require Appointment ID',
      'Create Appointment requires Start/End Date-Time, Patient ID, and Staff ID',
    ],
  },
};
