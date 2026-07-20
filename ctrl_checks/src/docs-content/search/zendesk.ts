import type { DocsSearchIndexItem } from '../search-index';

export const zendeskSearchIndex = [
  {
    "type": "node",
    "title": "Zendesk",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk",
    "text": "Zendesk List, fetch, create, update, and delete Zendesk support tickets, or list users, using HTTP Basic Auth against the Zendesk REST API. CRM"
  },
  {
    "type": "operation",
    "title": "Zendesk: Get Tickets",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations Get Tickets Lists tickets from your Zendesk account, one page at a time. get_tickets"
  },
  {
    "type": "operation",
    "title": "Zendesk: Get Ticket",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_ticket",
    "text": "Zendesk Operations Get Ticket Fetches one ticket by its numeric ID. get_ticket"
  },
  {
    "type": "operation",
    "title": "Zendesk: Create Ticket",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-create_ticket",
    "text": "Zendesk Operations Create Ticket Creates a new support ticket. Subject is required; Description becomes the first comment. create_ticket"
  },
  {
    "type": "operation",
    "title": "Zendesk: Update Ticket",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-update_ticket",
    "text": "Zendesk Operations Update Ticket Updates an existing ticket by ID. Only filled fields are sent. update_ticket"
  },
  {
    "type": "operation",
    "title": "Zendesk: Delete Ticket",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-delete_ticket",
    "text": "Zendesk Operations Delete Ticket Permanently deletes a ticket by ID. Cannot be undone. delete_ticket"
  },
  {
    "type": "operation",
    "title": "Zendesk: Get Users",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_users",
    "text": "Zendesk Operations Get Users Lists users from your Zendesk account, agents and end users together. get_users"
  },
  {
    "type": "field",
    "title": "Zendesk: Operation",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations Operation operation Selects which Zendesk ticket or user action this node performs."
  },
  {
    "type": "field",
    "title": "Zendesk: Subdomain",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations Subdomain subdomain The short account name used to build the Zendesk API URL."
  },
  {
    "type": "field",
    "title": "Zendesk: Agent Email",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations Agent Email email The Zendesk agent email used as the Basic Auth username."
  },
  {
    "type": "field",
    "title": "Zendesk: API Token",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations API Token apiToken The Zendesk API token that replaces your password for Basic Auth."
  },
  {
    "type": "field",
    "title": "Zendesk: Ticket ID",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_ticket",
    "text": "Zendesk Operations Ticket ID ticketId The numeric ID of the ticket to target."
  },
  {
    "type": "field",
    "title": "Zendesk: Subject",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-create_ticket",
    "text": "Zendesk Operations Subject subject The ticket's subject line, required for Create Ticket."
  },
  {
    "type": "field",
    "title": "Zendesk: Description",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-create_ticket",
    "text": "Zendesk Operations Description description The body text that becomes the ticket's first comment on Create Ticket."
  },
  {
    "type": "field",
    "title": "Zendesk: Status",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-create_ticket",
    "text": "Zendesk Operations Status status The ticket's workflow state: new, open, pending, hold, solved, closed."
  },
  {
    "type": "field",
    "title": "Zendesk: Priority",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-create_ticket",
    "text": "Zendesk Operations Priority priority The ticket's urgency level: low, normal, high, urgent."
  },
  {
    "type": "field",
    "title": "Zendesk: Assignee ID",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-update_ticket",
    "text": "Zendesk Operations Assignee ID assigneeId The numeric agent ID to assign the ticket to, Update Ticket only."
  },
  {
    "type": "field",
    "title": "Zendesk: Results Per Page",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk#operation-get_tickets",
    "text": "Zendesk Operations Results Per Page limit How many records to return per page for Get Tickets and Get Users."
  },
  {
    "type": "connection",
    "title": "Zendesk: Connection setup",
    "slug": "zendesk",
    "category": "CRM",
    "href": "/docs/nodes/zendesk",
    "text": "Zendesk connection setup Zendesk API Token connection using agent email plus a generated API token combined into Basic Auth."
  }
] satisfies DocsSearchIndexItem[];
