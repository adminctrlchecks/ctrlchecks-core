import type { DocsSearchIndexItem } from '../search-index';

export const odooSearchIndex = [
  {
    "type": "node",
    "title": "Odoo",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo",
    "text": "Odoo Search, read, create, update, or delete records in any Odoo model, or call a custom Odoo method, via JSON-RPC. CRM"
  },
  {
    "type": "operation",
    "title": "Odoo: Get Records",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-getRecords",
    "text": "Odoo Get Records Searches and reads records from an Odoo model via search_read."
  },
  {
    "type": "operation",
    "title": "Odoo: Create Record",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-createRecord",
    "text": "Odoo Create Record Creates a new record; only the new ID is returned."
  },
  {
    "type": "operation",
    "title": "Odoo: Update Record",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-updateRecord",
    "text": "Odoo Update Record Updates an existing record identified by Record ID."
  },
  {
    "type": "operation",
    "title": "Odoo: Delete Record",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-deleteRecord",
    "text": "Odoo Delete Record Permanently deletes an existing record identified by Record ID."
  },
  {
    "type": "operation",
    "title": "Odoo: Execute Method",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-executeMethod",
    "text": "Odoo Execute Method Calls any custom method Odoo exposes on a model, such as action_confirm."
  },
  {
    "type": "field",
    "title": "Odoo: Fields (Odoo URL, Database, Username, Password, Operation, Model, Domain Filter, Fields, Limit, Offset, Field Values, Record ID, Method Name, Method Arguments, Method Keyword Arguments)",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#operation-getRecords",
    "text": "Odoo URL Database Username Password Operation Model Domain Filter Fields Limit Offset Field Values Record ID Method Name Method Arguments Method Keyword Arguments"
  },
  {
    "type": "guide",
    "title": "Odoo: Connection setup",
    "slug": "odoo",
    "category": "CRM",
    "href": "/docs/nodes/odoo#connection",
    "text": "Odoo Credentials Database API Key does not currently auto-fill not currently wired"
  }
] satisfies DocsSearchIndexItem[];
