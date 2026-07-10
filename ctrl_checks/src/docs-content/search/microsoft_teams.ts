import type { DocsSearchIndexItem } from '../search-index';

export const microsoftTeamsSearchIndex = [
  {
    "type": "node",
    "title": "Microsoft Teams",
    "slug": "microsoft_teams",
    "category": "Communication",
    "href": "/docs/nodes/microsoft_teams",
    "text": "Microsoft Teams Send messages to Microsoft Teams through an incoming webhook URL. Communication"
  },
  {
    "type": "operation",
    "title": "Microsoft Teams: Configure",
    "slug": "microsoft_teams",
    "category": "Communication",
    "href": "/docs/nodes/microsoft_teams#operation-configure",
    "text": "Microsoft Teams Configuration Configure Send a webhook message to a Teams channel. configure"
  },
  {
    "type": "field",
    "title": "Microsoft Teams: Webhook Url",
    "slug": "microsoft_teams",
    "category": "Communication",
    "href": "/docs/nodes/microsoft_teams#operation-configure",
    "text": "Microsoft Teams Configuration Configure Webhook Url webhookUrl Teams webhook URL"
  },
  {
    "type": "field",
    "title": "Microsoft Teams: Message",
    "slug": "microsoft_teams",
    "category": "Communication",
    "href": "/docs/nodes/microsoft_teams#operation-configure",
    "text": "Microsoft Teams Configuration Configure Message message Message text"
  }
] satisfies DocsSearchIndexItem[];
