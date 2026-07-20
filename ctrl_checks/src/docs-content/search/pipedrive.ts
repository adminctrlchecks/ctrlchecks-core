import type { DocsSearchIndexItem } from '../search-index';

export const pipedriveSearchIndex = [
  {
    "type": "node",
    "title": "Pipedrive",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive",
    "text": "Pipedrive Get, list, create, update, delete, or search Pipedrive deals, persons, organizations, and more. CRM"
  },
  {
    "type": "operation",
    "title": "Pipedrive: Get",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-get",
    "text": "Pipedrive Get Fetches one existing record by its resource-specific ID."
  },
  {
    "type": "operation",
    "title": "Pipedrive: List",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-list",
    "text": "Pipedrive List Fetches multiple records. The Get Many dropdown label does not match this real value."
  },
  {
    "type": "operation",
    "title": "Pipedrive: Create",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-create",
    "text": "Pipedrive Create Creates a new record using resource-specific field names."
  },
  {
    "type": "operation",
    "title": "Pipedrive: Update",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-update",
    "text": "Pipedrive Update Updates an existing record identified by its resource-specific ID."
  },
  {
    "type": "operation",
    "title": "Pipedrive: Delete",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-delete",
    "text": "Pipedrive Delete Permanently deletes an existing record identified by its resource-specific ID."
  },
  {
    "type": "operation",
    "title": "Pipedrive: Search",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-search",
    "text": "Pipedrive Search Finds records matching a text term using searchTerm/searchFields/exactMatch."
  },
  {
    "type": "field",
    "title": "Pipedrive: Fields (Operation, Resource, API Token, Company Domain, Credential Id, Resource ID, Data, Search Term, Fields, Limit, Start)",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#operation-get",
    "text": "Pipedrive Operation Resource API Token Company Domain Credential Id Resource ID Data Search Term Fields Limit Start person deal organization"
  },
  {
    "type": "guide",
    "title": "Pipedrive: Connection setup",
    "slug": "pipedrive",
    "category": "CRM",
    "href": "/docs/nodes/pipedrive#connection",
    "text": "Pipedrive API Token Connections credential vault Personal Preferences api.pipedrive.com"
  }
] satisfies DocsSearchIndexItem[];
