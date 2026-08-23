import type { NodeDoc, FieldDoc } from '../types';

const messageField: FieldDoc = {
  name: 'Message',
  internalKey: 'message',
  type: 'textarea',
  required: true,
  description: 'The text this node delivers back into the open chat conversation.',
  helpText: "What this field is: The exact text shown to the person on the other end of the chat conversation.\nWhy it matters: This node's only job is to push this text into the live chat session - without it, nothing is sent.\nWhen to fill it: Every time, unless you are relying entirely on an upstream node's output (see below) and deliberately leaving this blank so the runtime fills it in for you.\nWhat to enter: A literal reply, or a template expression that pulls the reply from an earlier node, such as {{$json.response_text}} after an AI Agent/AI Chat Model, or a fixed confirmation like \"Your request has been submitted.\"\nWhere the value comes from: Usually the response_text (or response, output, message) field from an AI Agent, AI Chat Model, or similar node placed right before this one. Can also be a fixed string you type for a scripted reply.\nHow to get the value: Add an AI Agent or AI Chat Model node before this one, run it once, and check its output panel for the exact field name it returned (commonly response_text) - then map that field here. If this field is left blank entirely, the runtime automatically searches the incoming data for response_text, message, text, content, output, result, body, data, or value (checking this node's own input first, then walking back through upstream node outputs) and uses the first non-empty one it finds.\nHow to map it from a previous step: Place this node right after an AI Agent and set Message to {{$json.response_text}}. If the AI Agent has response_text empty but response_json filled, map the specific field you need instead, such as {{$json.response_json.reply}}.\nHow to use it later: The sent text is echoed back at {{$json.message}} on this node's own output, useful for logging or a follow-up confirmation step.\nAccepted format: Plain text or a template expression that resolves to text; non-string values (objects, numbers) are automatically converted to text before sending.\nReal workplace example: A support chatbot workflow maps {{$json.response_text}} from its AI Agent step so the customer sees the agent's actual answer.\nIf it is empty or wrong: If this field is blank AND nothing upstream contains a message-like field, the node returns {{$json._error}} = \"Chat Send node: Message is required\" and nothing is delivered to the chat.\nCommon mistake: Mapping a field name that does not actually exist on the upstream node's output (for example {{$json.output}} when the AI Agent actually returned response_text) - check the exact output field name in the upstream node's own output example before mapping it here.",
  placeholder: 'Hello! How can I help you?',
  example: '{{$json.response_text}}',
};

const sessionIdField: FieldDoc = {
  name: 'Session ID (optional)',
  internalKey: 'sessionId',
  type: 'string',
  required: false,
  description: 'Identifies which open chat conversation should receive this message.',
  helpText: "What this field is: The identifier of the specific live chat session this message should be delivered into.\nWhy it matters: A CtrlChecks worker can have many chat conversations open at once (different users, different tabs); this tells the chat server exactly which one to push the message to.\nWhen to fill it: Almost never in practice - leave it blank whenever this workflow starts from a Chat Trigger node, since the runtime automatically finds the session ID from the trigger's own output without you doing anything. Fill it manually only for an unusual workflow shape where no Chat Trigger data is available in this node's input or upstream node chain.\nWhat to enter: A template expression pointing at wherever the session ID actually lives in this run, such as {{$json.sessionId}} or {{chat_trigger.sessionId}}, rather than typing a fixed ID (a hardcoded session ID would only ever match one specific past conversation).\nWhere the value comes from: The Chat Trigger node's own output includes sessionId; this node also automatically scans every upstream node's output for a sessionId field if this one is left blank, so an explicit mapping is rarely needed.\nHow to get the value: Run the workflow once from a Chat Trigger, inspect the Chat Trigger node's output panel, and confirm it includes a sessionId field - then you already know the automatic lookup will work and you can leave this blank.\nHow to map it from a previous step: Only needed if this Chat Send is not a simple descendant of a Chat Trigger in this run (for example, a workflow that branches or merges paths before reaching this node) - in that case map {{$json.sessionId}} from whichever node actually carries it forward.\nHow to use it later: The resolved session ID is echoed back at {{$json.sessionId}} on this node's own output.\nAccepted format: A plain session ID string (the same value the Chat Trigger produced).\nReal workplace example: A branching support workflow that merges two paths before the final reply sets this to {{$json.sessionId}} to guarantee the right session is targeted, since the automatic upstream scan only checks the most recently produced values.\nIf it is empty or wrong: If this field is blank and no upstream node output contains a sessionId, the node returns {{$json._error}} = \"Chat Send node: Session ID is required. Connect this node to a Chat Trigger node to get the session ID, or provide it in the Session ID field.\" A wrong (stale or mistyped) session ID returns {{$json._error}} = \"Chat Send node: Failed to send message. Chat session <id> may not be connected.\" because the chat interface for that ID is not currently open.\nCommon mistake: Manually typing a session ID copied from a previous test run - session IDs are per-conversation and expire when that chat closes, so a hardcoded value works once and then silently fails on every later run.",
  placeholder: '{{chat_trigger.sessionId}}',
  example: '{{$json.sessionId}}',
};

export const chatSendDoc: NodeDoc = {
  slug: 'chat_send',
  displayName: 'Chat Send',
  category: 'AI',
  logoUrl: '/icons/nodes/chat_send.svg',
  description: 'Sends a reply back into the live chat conversation that a Chat Trigger started. Not offered in the node palette for new placements (it is added automatically as part of chat-trigger workflows), but it still executes fully in any existing workflow that already contains one.',
  credentialType: 'No third-party account needed - this node does not use credentials.',
  credentialSetupSteps: [
    'This node needs no Connections setup: it delivers the message directly to the CtrlChecks in-app chat server over the same session the Chat Trigger opened, not to an outside service.',
    'What it does need is a live chat session: this node only succeeds while the chat conversation that started the workflow is still open in the browser. If that tab/session was closed before this node runs, delivery fails even though the node itself is configured correctly.',
    'This node is the sender-of-record for chat replies: if an AI Agent node earlier in the same workflow already auto-forwarded its own answer to the chat (internally marked _chatSent), this node detects that and skips sending again instead of duplicating the message.',
    'Downstream service node account connection setup is still required for any node placed after this one; this node only delivers to the chat interface itself.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Chat Delivery',
      description: 'Chat Send has one operation: push one message into one open chat session.',
      operations: [
        {
          name: 'Send Chat Message',
          value: 'default',
          description: 'Resolves the message text (from Message, or automatically from this node\'s input/upstream output when Message is blank) and the target session ID (from Session ID, or automatically from a Chat Trigger/upstream output), then delivers the message to that live chat session.',
          fields: [messageField, sessionIdField],
          outputExample: { id: 'sess_8f2c1a', status: 'sent', provider: 'chat', message: 'Your order has shipped and should arrive Thursday.', sessionId: 'sess_8f2c1a', sentAt: '2026-08-23T09:00:00.000Z' },
          outputDescription: 'On success: id and sessionId both equal the resolved chat session ID, status is "sent", provider is always "chat", message is the exact text delivered, and sentAt is an ISO timestamp. If an upstream node already delivered this reply (AI Agent auto-forward), status is "skipped_duplicate_delivery" instead and no second message is sent. On a resolvable failure (missing message, missing session, or a closed/disconnected session) the node still returns success at the workflow-engine level but the output carries _error (and sometimes _warning) describing what went wrong - check for _error rather than assuming every run actually delivered a message.',
          usageExample: {
            scenario: 'A support chatbot workflow (Chat Trigger -> AI Agent -> Chat Send) replies to the customer with the agent\'s generated answer',
            inputValues: { message: '{{$json.response_text}}', sessionId: '' },
            expectedOutput: 'The customer sees the AI Agent\'s answer appear in the chat. {{$json.status}} confirms "sent" (or "skipped_duplicate_delivery" if the AI Agent already forwarded it itself).',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Chat Send node: Message is required', cause: 'Message was left blank and no upstream node output contained a message-like field (response_text, message, text, content, output, result, body, data, or value).', fix: 'Map an explicit field such as {{$json.response_text}} into Message, or confirm the node directly before this one actually produced one of those fields.' },
    { error: 'Chat Send node: Session ID is required. Connect this node to a Chat Trigger node to get the session ID, or provide it in the Session ID field.', cause: 'Session ID was left blank and no upstream node output (including the Chat Trigger) contained a sessionId field.', fix: 'Confirm this workflow actually starts from a Chat Trigger, or map {{$json.sessionId}} explicitly from whichever node carries it in this workflow shape.' },
    { error: 'Chat Send node: Failed to send message. Chat session <id> may not be connected.', cause: 'The resolved session ID does not match any currently open chat connection - most often because the user closed the chat tab, the session expired, or a stale/hardcoded session ID was used.', fix: 'Re-run the workflow from a fresh Chat Trigger session with the chat interface still open, and avoid hardcoding a session ID from an earlier test run.' },
    { error: 'Message appears twice in the chat', cause: 'Both an upstream AI Agent\'s own auto-forward behavior and this Chat Send node delivered the same reply. This node checks for that (_chatSent) and skips sending when it detects it, so seeing a duplicate points at an older workflow/version predating that guard.', fix: 'Keep this node as the single sender-of-record and confirm the workflow is on a current version; do not add a second Chat Send (or other chat-delivery node) after the same AI Agent reply.' },
  ],
  relatedNodes: ['chat_trigger', 'ai_agent', 'ai_chat_model'],
};
