import type { DocsSearchIndexItem } from '../search-index';

export const gmailTriggerSearchIndex = [
  {
    slug: 'gmail_trigger',
    title: 'Gmail Trigger',
    href: '/docs/nodes/gmail_trigger',
    text: 'Gmail Trigger starts workflows from watched Gmail mailbox changes delivered through Google Cloud Pub/Sub push notifications. It registers Gmail users.watch, validates Pub/Sub push auth, reads Gmail history from a stored historyId, and outputs normalized email fields.',
  },
  {
    slug: 'gmail_trigger',
    title: 'Gmail Trigger operation',
    href: '/docs/nodes/gmail_trigger#operation-receive',
    text: 'Receive Gmail notification operation validates OIDC bearer tokens or a validation secret, decodes the Pub/Sub envelope, fetches Gmail history, filters message_added label_added label_removed message_deleted events, and starts one workflow run per accepted event.',
  },
  {
    slug: 'gmail_trigger',
    title: 'Gmail Trigger fields',
    href: '/docs/nodes/gmail_trigger#fields',
    text: 'Fields include Pub/Sub Topic projects/PROJECT/topics/TOPIC, Event Types, Label IDs, Keyword Filter, Validate Push Auth, OIDC Audience, and Validation Secret for simulations.',
  },
  {
    slug: 'gmail_trigger',
    title: 'Gmail Trigger outputs',
    href: '/docs/nodes/gmail_trigger#operation-receive',
    text: 'Outputs eventId eventType source userId username text timestamp emailAddress historyId messageId threadId subject from to snippet labelIds raw trigger workflow_id node_id sessionId _gmail for downstream AI triage, replies, routing, and ticket creation.',
  },
  {
    slug: 'gmail_trigger',
    title: 'Gmail Trigger connection setup',
    href: '/docs/nodes/gmail_trigger#connection-setup',
    text: 'Connect Google OAuth2 in Connections with gmail.readonly Gmail read access. Google OAuth access token and refresh token stay in the credential vault. Create a Pub/Sub topic, grant gmail-api-push@system.gserviceaccount.com publisher access, configure a push subscription, and use oauth2/v2/userinfo for Google account identity checks.',
  },
] satisfies DocsSearchIndexItem[];
