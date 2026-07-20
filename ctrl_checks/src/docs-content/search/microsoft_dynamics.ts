import type { DocsSearchIndexItem } from '../search-index';

export const microsoftDynamicsSearchIndex = [
  {
    "type": "node",
    "title": "Microsoft Dynamics",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics",
    "text": "Microsoft Dynamics Get, list, create, update, or delete Microsoft Dynamics 365 records, or run an advanced FetchXML query. CRM"
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Get Records",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-getRecords",
    "text": "Microsoft Dynamics Get Records Fetches multiple Dynamics 365 records with optional select, filter, and top."
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Get Record",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-getRecord",
    "text": "Microsoft Dynamics Get Record Fetches one existing record by its GUID."
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Create Record",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-createRecord",
    "text": "Microsoft Dynamics Create Record Creates a new record; only the new ID is returned, not the record data."
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Update Record",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-updateRecord",
    "text": "Microsoft Dynamics Update Record Updates an existing record identified by GUID."
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Delete Record",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-deleteRecord",
    "text": "Microsoft Dynamics Delete Record Permanently deletes an existing record identified by GUID."
  },
  {
    "type": "operation",
    "title": "Microsoft Dynamics: Search (FetchXML)",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-fetchXml",
    "text": "Microsoft Dynamics Search FetchXML Runs an advanced FetchXML query for filtering, sorting, or joins."
  },
  {
    "type": "field",
    "title": "Microsoft Dynamics: Fields (Instance URL, OAuth2 Access Token, Entity/Resource, Custom Entity Name, Operation, Record ID, Fields, FetchXML Query, Select, Filter, Max Records)",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#operation-getRecords",
    "text": "Microsoft Dynamics Instance URL OAuth2 Access Token Entity Resource Custom Entity Name Operation Record ID Fields FetchXML Query Select Filter Max Records"
  },
  {
    "type": "guide",
    "title": "Microsoft Dynamics: Connection setup",
    "slug": "microsoft_dynamics",
    "category": "CRM",
    "href": "/docs/nodes/microsoft_dynamics#connection",
    "text": "Azure AD OAuth2 Access Token no Connections support user_impersonation token expires"
  }
] satisfies DocsSearchIndexItem[];
