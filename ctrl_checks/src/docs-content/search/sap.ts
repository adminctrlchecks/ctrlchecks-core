import type { DocsSearchIndexItem } from '../search-index';

export const sapSearchIndex = [
  {
    "type": "node",
    "title": "SAP",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap",
    "text": "SAP Read and write SAP business objects (sales orders, business partners, materials, and more) via OData v2/v4 and REST APIs, using a direct HTTP-method-based Operation field. CRM"
  },
  {
    "type": "operation",
    "title": "SAP: GET (Read)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Reads data from a SAP OData/REST endpoint via an HTTP GET request. OData v2 list responses are automatically unwrapped from the {d: {results}} envelope so data is a plain array. get"
  },
  {
    "type": "operation",
    "title": "SAP: POST (Create)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-post",
    "text": "SAP Operations POST (Create) Creates a new SAP business object via an HTTP POST request, sending Request Body (JSON) as the payload. Most SAP OData v2 write services require a valid X-CSRF-Token on this request. post"
  },
  {
    "type": "operation",
    "title": "SAP: PUT (Replace)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-put",
    "text": "SAP Operations PUT (Replace) Fully replaces an existing SAP business object via an HTTP PUT request, sending Request Body (JSON) as the complete new representation. put"
  },
  {
    "type": "operation",
    "title": "SAP: PATCH (Update)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-patch",
    "text": "SAP Operations PATCH (Update) Partially updates an existing SAP business object via an HTTP PATCH request, sending only the changed fields in Request Body (JSON). patch"
  },
  {
    "type": "operation",
    "title": "SAP: DELETE (Remove)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-delete",
    "text": "SAP Operations DELETE (Remove) Permanently deletes an existing SAP business object via an HTTP DELETE request. SAP returns HTTP 204 with no body on success, so this node reports a synthetic confirmation instead. delete"
  },
  {
    "type": "field",
    "title": "SAP: SAP Base URL",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) SAP Base URL baseUrl The base web address of your SAP system, required at runtime even though the backend schema does not mark it required."
  },
  {
    "type": "field",
    "title": "SAP: Endpoint Path",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Endpoint Path endpoint The OData or REST endpoint path, relative to SAP Base URL."
  },
  {
    "type": "field",
    "title": "SAP: Query Parameters",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Query Parameters queryParams OData query string parameters ($top, $filter, $select, $expand)."
  },
  {
    "type": "field",
    "title": "SAP: Request Body (JSON)",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-post",
    "text": "SAP Operations POST (Create) Request Body (JSON) payload The request body for Post, Put, or Patch operations."
  },
  {
    "type": "field",
    "title": "SAP: OAuth2 / Bearer Token",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) OAuth2 / Bearer Token accessToken An OAuth2 or SAML bearer token for SAP authentication. If provided, Username/Password (Basic Auth) are ignored entirely. Only field confirmed to auto-fill from a saved Connections entry."
  },
  {
    "type": "field",
    "title": "SAP: Basic Auth Username",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Basic Auth Username username SAP Basic Auth username, used only when Access Token is empty."
  },
  {
    "type": "field",
    "title": "SAP: Basic Auth Password",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Basic Auth Password password SAP Basic Auth password, used only when Access Token is empty."
  },
  {
    "type": "field",
    "title": "SAP: X-CSRF-Token",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-post",
    "text": "SAP Operations POST (Create) X-CSRF-Token csrfToken A CSRF token required by many SAP OData v2 services for Post/Put/Patch/Delete. This node does not fetch or capture the token for you."
  },
  {
    "type": "field",
    "title": "SAP: Response Format",
    "slug": "sap",
    "category": "CRM",
    "href": "/docs/nodes/sap#operation-get",
    "text": "SAP Operations GET (Read) Response Format format The response format to request from SAP: JSON (recommended) or XML."
  }
] satisfies DocsSearchIndexItem[];
