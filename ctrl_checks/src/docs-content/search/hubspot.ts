import type { DocsSearchIndexItem } from '../search-index';

export const hubspotSearchIndex = [
  {
    "type": "node",
    "title": "HubSpot",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot",
    "text": "HubSpot Get, list, create, update, delete, search, or bulk-create HubSpot CRM contacts, companies, deals, and tickets from a workflow. CRM"
  },
  {
    "type": "operation",
    "title": "HubSpot: Get",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-get",
    "text": "HubSpot Get Fetches one existing HubSpot CRM record by its numeric ID and returns the full raw record."
  },
  {
    "type": "operation",
    "title": "HubSpot: Get Many",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-getMany",
    "text": "HubSpot Get Many Fetches a page of existing HubSpot CRM records using cursor-based pagination."
  },
  {
    "type": "operation",
    "title": "HubSpot: Create",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-create",
    "text": "HubSpot Create Creates a new HubSpot CRM contact, company, deal, or ticket record."
  },
  {
    "type": "operation",
    "title": "HubSpot: Update",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-update",
    "text": "HubSpot Update Updates an existing HubSpot CRM record identified by ID."
  },
  {
    "type": "operation",
    "title": "HubSpot: Delete",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-delete",
    "text": "HubSpot Delete Permanently deletes an existing HubSpot CRM record identified by ID."
  },
  {
    "type": "operation",
    "title": "HubSpot: Search",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-search",
    "text": "HubSpot Search Finds HubSpot CRM records matching a search query using CRM search syntax."
  },
  {
    "type": "operation",
    "title": "HubSpot: Create Multiple",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-batchCreate",
    "text": "HubSpot Create Multiple Bulk-creates several HubSpot CRM records in one request."
  },
  {
    "type": "field",
    "title": "HubSpot: Fields (Operation, Resource, Id, Object Id, Properties, Records, Search Query, Limit, After, Access Token, Api Key, Credential Id)",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#operation-get",
    "text": "HubSpot Operation Resource Id Object Id Properties Records Search Query Limit After Access Token Api Key Credential Id contact company deal ticket"
  },
  {
    "type": "guide",
    "title": "HubSpot: Connection setup",
    "slug": "hubspot",
    "category": "CRM",
    "href": "/docs/nodes/hubspot#connection",
    "text": "HubSpot API Key Connections credential vault Private App OAuth2 api.hubapi.com"
  }
] satisfies DocsSearchIndexItem[];
