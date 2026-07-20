import type { DocsSearchIndexItem } from '../search-index';

export const zohoCrmSearchIndex = [
  {
    "type": "node",
    "title": "Zoho CRM",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm",
    "text": "Zoho CRM Get, create, update, delete, search, or upsert Zoho CRM records across standard and custom modules via OAuth2. Only 6 of the 9 dropdown operations are currently implemented. CRM"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Get",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations Get Fetches a single record by its Record ID from a Zoho CRM module. get"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Create",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-create",
    "text": "Zoho CRM Operations Create Creates a new record in a Zoho CRM module from the JSON object in Data. create"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Update",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-update",
    "text": "Zoho CRM Operations Update Updates an existing record by its Record ID, replacing only the fields present in Data. update"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Delete",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-delete",
    "text": "Zoho CRM Operations Delete Permanently deletes a record by its Record ID. Cannot be undone. delete"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Search",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-search",
    "text": "Zoho CRM Operations Search Searches a module for records matching a Zoho criteria expression. search"
  },
  {
    "type": "operation",
    "title": "Zoho CRM: Upsert",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-upsert",
    "text": "Zoho CRM Operations Upsert Creates a new record or updates an existing one based on Zoho's own duplicate-check rules. upsert"
  },
  {
    "type": "field",
    "title": "Zoho CRM: Operation",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations Operation operation Chooses which Zoho CRM record action this node performs. Get Many, Bulk Create, and Bulk Update are visible but not functional."
  },
  {
    "type": "field",
    "title": "Zoho CRM: OAuth2 Access Token",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations OAuth2 Access Token accessToken Authenticates every request to the Zoho CRM API."
  },
  {
    "type": "field",
    "title": "Zoho CRM: API Domain",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations API Domain apiDomain Region dropdown that currently has no effect on the actual request."
  },
  {
    "type": "field",
    "title": "Zoho CRM: Module",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations Module module The Zoho CRM module this operation acts on: Contacts, Leads, Deals, and more."
  },
  {
    "type": "field",
    "title": "Zoho CRM: Record ID",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-get",
    "text": "Zoho CRM Operations Record ID recordId The numeric ID of one specific record, required for Get, Update, and Delete."
  },
  {
    "type": "field",
    "title": "Zoho CRM: Data (JSON)",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-create",
    "text": "Zoho CRM Operations Data (JSON) data The record field values as a JSON object, required for Create, Update, and Upsert."
  },
  {
    "type": "field",
    "title": "Zoho CRM: Search Criteria",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm#operation-search",
    "text": "Zoho CRM Operations Search Criteria criteria A Zoho search expression used to filter records for Search."
  },
  {
    "type": "connection",
    "title": "Zoho CRM: Connection setup",
    "slug": "zoho_crm",
    "category": "CRM",
    "href": "/docs/nodes/zoho_crm",
    "text": "Zoho CRM connection setup Zoho CRM OAuth2 connection with automatic token refresh; API Domain region selection currently has no effect."
  }
] satisfies DocsSearchIndexItem[];
