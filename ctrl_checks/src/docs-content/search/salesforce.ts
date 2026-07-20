import type { DocsSearchIndexItem } from '../search-index';

export const salesforceSearchIndex = [
  {
    "type": "node",
    "title": "Salesforce",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce",
    "text": "Salesforce Query (SOQL), search (SOSL), get, create, update, delete, upsert, or bulk-process Salesforce records. CRM"
  },
  {
    "type": "operation",
    "title": "Salesforce: Query (SOQL)",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-query",
    "text": "Salesforce Query SOQL Runs a SOQL query and returns matching records."
  },
  {
    "type": "operation",
    "title": "Salesforce: Search (SOSL)",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-search",
    "text": "Salesforce Search SOSL Runs a full-text search across one or more object types."
  },
  {
    "type": "operation",
    "title": "Salesforce: Get",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-get",
    "text": "Salesforce Get Fetches one existing record by its ID."
  },
  {
    "type": "operation",
    "title": "Salesforce: Create",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-create",
    "text": "Salesforce Create Creates a new record; only the new ID is returned, not the saved field values."
  },
  {
    "type": "operation",
    "title": "Salesforce: Update",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-update",
    "text": "Salesforce Update Updates an existing record; returns no body on success."
  },
  {
    "type": "operation",
    "title": "Salesforce: Delete",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-delete",
    "text": "Salesforce Delete Permanently deletes an existing record identified by ID."
  },
  {
    "type": "operation",
    "title": "Salesforce: Upsert",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-upsert",
    "text": "Salesforce Upsert Inserts or updates a record matched by an External ID field."
  },
  {
    "type": "operation",
    "title": "Salesforce: Bulk Create",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-bulkCreate",
    "text": "Salesforce Bulk Create Creates up to 200 records in one Composite sObject Collections request."
  },
  {
    "type": "operation",
    "title": "Salesforce: Bulk Update",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-bulkUpdate",
    "text": "Salesforce Bulk Update Updates up to 200 records in one Composite sObject Collections request."
  },
  {
    "type": "operation",
    "title": "Salesforce: Bulk Delete",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-bulkDelete",
    "text": "Salesforce Bulk Delete Deletes records one at a time in a loop, not via a true bulk-delete endpoint."
  },
  {
    "type": "operation",
    "title": "Salesforce: Bulk Upsert",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-bulkUpsert",
    "text": "Salesforce Bulk Upsert Inserts or updates up to 200 records matched by an External ID field."
  },
  {
    "type": "field",
    "title": "Salesforce: Fields (Instance URL, OAuth2 Access Token, Resource/Object, Custom Object API Name, Operation, SOQL Query, SOSL Search Query, Record ID, External ID Field, External ID Value, Fields, Records Array)",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#operation-query",
    "text": "Salesforce Instance URL OAuth2 Access Token Resource Object Custom Object Operation SOQL Query SOSL Search Query Record ID External ID Field External ID Value Fields Records Array"
  },
  {
    "type": "guide",
    "title": "Salesforce: Connection setup",
    "slug": "salesforce",
    "category": "CRM",
    "href": "/docs/nodes/salesforce#connection",
    "text": "Salesforce OAuth2 Connections credential vault Instance URL login.salesforce.com"
  }
] satisfies DocsSearchIndexItem[];
