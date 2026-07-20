import type { DocsSearchIndexItem } from '../search-index';

export const freshdeskSearchIndex = [
  {
    "type": "node",
    "title": "Freshdesk",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk",
    "text": "Freshdesk Get, list, create, update, or delete Freshdesk tickets, contacts, and companies from a workflow. CRM"
  },
  {
    "type": "operation",
    "title": "Freshdesk: Get",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-get",
    "text": "Freshdesk Get Fetches one existing Freshdesk record by its numeric ID and returns Freshdesk's full raw record."
  },
  {
    "type": "operation",
    "title": "Freshdesk: List",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-list",
    "text": "Freshdesk List Fetches every existing Freshdesk record of the chosen Resource type in one request."
  },
  {
    "type": "operation",
    "title": "Freshdesk: Create",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-create",
    "text": "Freshdesk Create Creates a new Freshdesk ticket, contact, or company record."
  },
  {
    "type": "operation",
    "title": "Freshdesk: Update",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-update",
    "text": "Freshdesk Update Updates an existing Freshdesk record identified by ID."
  },
  {
    "type": "operation",
    "title": "Freshdesk: Delete",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-delete",
    "text": "Freshdesk Delete Permanently deletes an existing Freshdesk record identified by ID."
  },
  {
    "type": "field",
    "title": "Freshdesk: Fields (Operation, Resource, Domain, Api Key, Id, Data, Subject, Description Text, Email, Priority, Status)",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#operation-get",
    "text": "Freshdesk Operation Resource Domain Api Key Id Data Subject Description Text Email Priority Status ticket contact company"
  },
  {
    "type": "guide",
    "title": "Freshdesk: Connection setup",
    "slug": "freshdesk",
    "category": "CRM",
    "href": "/docs/nodes/freshdesk#connection",
    "text": "Freshdesk API Key Connections credential vault agents/me basic auth domain freshdesk.com"
  }
] satisfies DocsSearchIndexItem[];
