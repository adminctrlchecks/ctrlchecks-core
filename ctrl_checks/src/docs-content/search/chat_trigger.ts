import type { DocsSearchIndexItem } from '../search-index';

export const chatTriggerSearchIndex = [
  {
    type: 'node',
    title: 'Chat Trigger',
    slug: 'chat_trigger',
    category: 'Triggers',
    href: '/docs/nodes/chat_trigger',
    text: 'Chat Trigger starts workflows from the built-in CtrlChecks chat interface. Use it for chatbots, AI assistants, support intake, guided request flows, and conversations that need a workflow run for each accepted message.',
  },
  {
    type: 'operation',
    title: 'Chat Trigger: Receive chat message',
    slug: 'chat_trigger',
    category: 'Triggers',
    href: '/docs/nodes/chat_trigger#operation-default',
    text: 'Receive chat message validates the active workflow and Chat Trigger node, requires a non-empty message, creates a running execution, uses a stable workflowId_nodeId sessionId, and emits message sessionId trigger node_id workflow_id timestamp _chat fields.',
  },
  {
    type: 'field',
    title: 'Chat Trigger: Message',
    slug: 'chat_trigger',
    category: 'Triggers',
    href: '/docs/nodes/chat_trigger#operation-default',
    text: 'Message is runtime chat text supplied by the CtrlChecks chat UI or API payload. Map {{$json.message}} into AI Agent, HTTP Request, Switch, Log Output, or Chat Send response workflows.',
  },
  {
    type: 'field',
    title: 'Chat Trigger: Channel',
    slug: 'chat_trigger',
    category: 'Triggers',
    href: '/docs/nodes/chat_trigger#operation-default',
    text: 'Channel is an optional backend schema context field for generated or simulated payloads. The current visual panel does not expose or enforce channel filtering; downstream nodes can read {{$json.channel}} when supplied.',
  },
  {
    type: 'field',
    title: 'Chat Trigger: Allowed Senders',
    slug: 'chat_trigger',
    category: 'Triggers',
    href: '/docs/nodes/chat_trigger#operation-default',
    text: 'Allowed Senders is an optional backend schema allowlist for generated or future filtered chat contexts. It is not currently enforced by the visual Chat Trigger panel, so use downstream checks for sender rules.',
  },
] satisfies DocsSearchIndexItem[];
