import type { DocsSearchIndexItem } from '../search-index';

export const intercomSearchIndex = [
  {
    "type": "node",
    "title": "Intercom",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom",
    "text": "Intercom List Intercom conversations, fetch one conversation, or reply to a conversation. CRM"
  },
  {
    "type": "operation",
    "title": "Intercom: List",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom#operation-list",
    "text": "Intercom List Fetches a page of Intercom conversations using cursor-based pagination."
  },
  {
    "type": "operation",
    "title": "Intercom: Get",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom#operation-get",
    "text": "Intercom Get Fetches one existing Intercom conversation by its ID."
  },
  {
    "type": "operation",
    "title": "Intercom: Send",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom#operation-send",
    "text": "Intercom Send Posts a reply into an existing Intercom conversation. Not selectable from the Operation dropdown today."
  },
  {
    "type": "field",
    "title": "Intercom: Fields (Operation, Resource, Access Token, Conversation Id, Resource ID, Data, Message, Admin Id, Search Query, Records Per Page, Starting After)",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom#operation-list",
    "text": "Intercom Operation Resource Access Token Conversation Id Resource ID Data Message Admin Id Search Query Records Per Page Starting After"
  },
  {
    "type": "guide",
    "title": "Intercom: Connection setup",
    "slug": "intercom",
    "category": "CRM",
    "href": "/docs/nodes/intercom#connection",
    "text": "Intercom Access Token Connections credential vault developers.intercom.com api.intercom.io"
  }
] satisfies DocsSearchIndexItem[];
