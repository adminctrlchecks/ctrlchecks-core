import type { NodeDoc, OperationDoc, FieldDoc } from '../types';

const baseUrlField: FieldDoc = {
  name: 'SAP Base URL',
  internalKey: 'baseUrl',
  type: 'url',
  required: true,
  description: 'The base web address of your SAP system.',
  helpText: "What this field is: The base web address of your SAP system - every request this node makes is built on top of this URL plus the Endpoint Path.\nWhy it matters: Without it, the node has no host to send the OData/REST request to; every operation fails immediately if this is empty, even though the backend schema does not mark it required (only Operation and Endpoint Path are formally required) - the runtime itself still demands it.\nWhen to fill it: Every time you add a SAP node.\nWhat to enter: Your SAP system's full base URL including protocol and port if needed, for example https://my-sap.s4hana.ondemand.com (SAP S/4HANA Cloud) or https://your-sap-host:44300 (on-premise/ECC).\nWhere the value comes from: Your SAP Basis administrator, or the URL you use to reach SAP Fiori/Gateway services in a browser.\nHow to use it later: Not included in the output, but it determines which SAP system every {{$json.data}} result comes from.\nAccepted format: A full https:// URL, with any trailing slash automatically stripped.\nReal workplace example: https://my-sap.s4hana.ondemand.com for an S/4HANA Cloud tenant.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"SAP node: baseUrl is required (e.g. https://your-sap-host:44300)\"; a wrong URL causes every request to fail to connect.\nCommon mistake: Pointing this at the SAP Fiori Launchpad URL instead of the underlying Gateway/OData host - the two can differ, especially on-premise.",
  placeholder: 'https://your-sap-host:44300',
  example: 'https://your-sap-host:44300',
};

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The HTTP method used for the SAP OData/REST call.',
  options: ['get', 'post', 'put', 'patch', 'delete'],
  helpText: "What this field is: The HTTP method this node uses when calling your SAP OData/REST endpoint - a direct, literal HTTP verb rather than a named action like other CRM nodes in this product.\nWhy it matters: SAP's OData services follow standard REST conventions, so the HTTP method itself decides whether you are reading, creating, replacing, partially updating, or deleting data at the given Endpoint Path.\nWhen to fill it: Every time you add a SAP node; all 5 values are real and map directly to the matching HTTP method.\nWhat to enter: Choose GET to read data, POST to create a new record, PUT to fully replace a record, PATCH to partially update a record, or DELETE to remove a record - matching whatever the target SAP OData service actually supports for that entity.\nWhere the value comes from: Chosen directly in the Properties Panel, based on what the specific SAP OData service/entity you are calling supports.\nHow to use it later: Downstream nodes read {{$json.data}} for the SAP response on Get/Post/Put/Patch, or {{$json.deleted}} for Delete.\nAccepted format: One of get, post, put, patch, delete (case-insensitive - the node uppercases it before sending).\nReal workplace example: Set Operation to get with an Endpoint Path targeting the Sales Order service to fetch open sales orders.\nIf it is empty or wrong: An empty value defaults to get.\nCommon mistake: Choosing PUT expecting a partial update - PUT typically means \"replace the whole entity\" in OData/REST conventions, and many SAP services expect PATCH instead for partial changes; check the specific service's documentation for which it supports.",
  placeholder: 'get',
  example: 'get',
  defaultValue: 'get',
};

const endpointField: FieldDoc = {
  name: 'Endpoint Path',
  internalKey: 'endpoint',
  type: 'string',
  required: true,
  description: 'The OData or REST endpoint path, relative to SAP Base URL.',
  helpText: "What this field is: The specific OData service and entity set (or REST path) this node calls, appended directly to SAP Base URL.\nWhy it matters: This is the actual SAP business object/service being read or written - the wrong path calls the wrong service entirely or returns a 404.\nWhen to fill it: Every time you add a SAP node.\nWhat to enter: The full path starting with a slash, for example /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder for the standard Sales Order API, or /sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner for business partners. For SAP Business One, the REST path is different, typically under /b1s/v1/.\nWhere the value comes from: SAP's API Business Hub (api.sap.com) for standard APIs, or your SAP Gateway/Fiori administrator for custom services.\nHow to use it later: Not included in the output, but determines the shape of {{$json.data}}.\nAccepted format: A path string starting with /, following the target SAP service's own URL structure.\nReal workplace example: /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('0000012345') to fetch one specific sales order by its key.\nIf it is empty or wrong: An empty value returns {{$json._error}} = \"SAP node: endpoint is required (e.g. /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder)\"; a wrong path returns a SAP 404 or service-not-found error.\nCommon mistake: Forgetting that SAP Business One uses a completely different REST API base path (/b1s/v1/) than standard OData services on S/4HANA/ECC - copying an S/4HANA endpoint path into a Business One system (or vice versa) always fails.",
  placeholder: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder',
  example: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder',
};

const queryParamsField: FieldDoc = {
  name: 'Query Parameters',
  internalKey: 'queryParams',
  type: 'string',
  required: false,
  description: 'OData query string parameters ($top, $filter, $select, $expand, etc.), without the leading question mark.',
  helpText: "What this field is: OData system query options that narrow, shape, or expand the data returned by a GET request.\nWhy it matters: Without these, Get requests return SAP's default result set with no filtering, sorting, or field selection.\nWhen to fill it: Optional for Get (and technically appended to any operation's URL, though it matters most for reads).\nWhat to enter: Standard OData query options joined with &, without a leading question mark, for example $top=10&$filter=SalesOrderType eq 'OR'&$select=SalesOrder,SoldToParty.\nWhere the value comes from: SAP's OData v2/v4 query options reference, or the specific service's own $metadata document listing available fields.\nHow to use it later: Only matching/selected data appears inside {{$json.data}}.\nAccepted format: A query string using OData syntax - this node automatically adds $format=json unless you already specify $format or set Response Format to XML.\nReal workplace example: $top=25&$filter=OverallSDProcessStatus eq 'A'&$select=SalesOrder,SoldToParty,TotalNetAmount to pull the first 25 open sales orders with just a few fields.\nIf it is empty or wrong: Left empty, Get returns SAP's default page/fields for that service; invalid OData syntax returns a SAP parsing error inside {{$json._error}}.\nCommon mistake: Including a leading ? - this field's value is appended after the endpoint's own ? or & automatically, so a leading ? here would produce a malformed URL.",
  placeholder: "$top=10&$filter=SalesOrderType eq 'OR'&$select=SalesOrder,SoldToParty",
  example: "$top=10&$filter=SalesOrderType eq 'OR'&$select=SalesOrder,SoldToParty",
};

const payloadField: FieldDoc = {
  name: 'Request Body (JSON)',
  internalKey: 'payload',
  type: 'json',
  required: false,
  description: 'The request body for Post, Put, or Patch operations.',
  helpText: "What this field is: The JSON body sent with Post, Put, or Patch requests - the actual field values SAP will create or change.\nWhy it matters: Without it, Post/Put/Patch send no body at all, so SAP has nothing to create or apply as a change.\nWhen to fill it: Required in practice for Post, Put, and Patch (though not enforced by this node itself - SAP's own API validation will reject an empty/invalid body). Ignored for Get and Delete.\nWhat to enter: A JSON object whose keys are the exact SAP OData property names for the target entity, for example {\"SalesOrderType\": \"OR\", \"SoldToParty\": \"{{$json.customerId}}\"}.\nWhere the value comes from: The target OData service's $metadata document (lists every property name and type), or SAP's API Business Hub documentation for standard APIs.\nHow to use it later: Not always echoed back - whether SAP returns the saved values or an empty response depends on the specific service (see the Post/Put/Patch operations' output descriptions).\nAccepted format: Valid JSON wrapped in { }, matching the SAP OData property names and types exactly (SAP is often strict about data types, especially dates and decimals).\nReal workplace example: {\"SalesOrderType\": \"OR\", \"SoldToParty\": \"{{$json.customerId}}\", \"SalesOrganization\": \"1010\"} to create a new sales order.\nIf it is empty or wrong: An empty payload on Post/Put/Patch is sent as no body, which SAP typically rejects for required-field validation; an incorrect property name or data type returns a SAP OData error inside {{$json._error}}.\nCommon mistake: Using a display label instead of the exact OData property name (for example \"Customer\" instead of SoldToParty) - SAP's API rejects unrecognized property names rather than guessing what you meant.",
  placeholder: '{"SalesOrderType": "OR", "SoldToParty": "{{$json.customerId}}"}',
  example: '{"SalesOrderType": "OR", "SoldToParty": "{{$json.customerId}}"}',
};

const accessTokenField: FieldDoc = {
  name: 'OAuth2 / Bearer Token',
  internalKey: 'accessToken',
  type: 'password',
  required: false,
  description: 'An OAuth2 or SAML bearer token for SAP authentication. If provided, Username/Password (Basic Auth) are ignored entirely.',
  helpText: "What this field is: An OAuth2 or SAML bearer token that authenticates this node's requests to SAP.\nWhy it matters: If this field has any value, the node uses it exclusively and never falls back to Username/Password, even if those are also filled in.\nWhen to fill it: Leave this field blank once you have saved a SAP connection in CtrlChecks Connections; the node automatically retrieves the token from the credential vault at run time (only this field is confirmed to auto-fill from a saved connection - see the Basic Auth Username/Password fields' notes). Fill it directly only for a quick one-off test, or if your SAP system requires OAuth2/SAML rather than Basic Auth.\nWhat to enter: The raw bearer token, with no \"Bearer\" prefix and no surrounding quotes.\nWhere the value comes from: Your SAP BTP (Business Technology Platform) service instance credentials for S/4HANA Cloud, or your organization's SAML/OAuth2 identity provider for on-premise setups configured for token-based auth.\nHow to use it later: Never included in the node output.\nAccepted format: A single bearer token string.\nReal workplace example: Save an S/4HANA Cloud OAuth2 client credential once in Connections, then reuse the same saved connection across every SAP node in every workflow.\nIf it is empty or wrong: If both this field and Username/Password are empty, the node returns {{$json._error}} = \"SAP node: authentication required - provide accessToken (OAuth2) or username + password (Basic Auth)\"; a wrong/expired token returns a SAP authentication error.\nCommon mistake: Filling in both this field and Username/Password expecting some kind of fallback behavior - if Access Token has any value, Username/Password are completely ignored, not used as a backup.",
  placeholder: 'your-oauth2-bearer-token',
  notes: 'Stored and displayed as a masked credential value once saved through Connections. Confirmed (via connector-registry.ts) to be the only SAP field that auto-fills from a saved Connections entry.',
};

const usernameField: FieldDoc = {
  name: 'Basic Auth Username',
  internalKey: 'username',
  type: 'string',
  required: false,
  description: 'SAP Basic Auth username, used only when Access Token is empty. Not confirmed to auto-fill from a saved connection - see notes.',
  notes: 'The SAP credential type in Connections can store a Username/Password pair alongside an Access Token, but the connector\'s auto-fill mapping (credentialFieldName) only names accessToken - username and password are not confirmed to be auto-injected the same way. Type these directly on the node if you are using Basic Auth rather than a bearer token.',
  helpText: "What this field is: The SAP Communication User (or dialog user) name used for HTTP Basic Authentication.\nWhy it matters: This is the fallback authentication method whenever Access Token is left empty - many on-premise SAP systems without OAuth2 configured rely on this instead.\nWhen to fill it: Only when you are not using an OAuth2/Bearer token; required together with Basic Auth Password in that case.\nWhat to enter: The exact SAP user ID for a Communication User (recommended for integrations) or a regular dialog user with appropriate authorizations.\nWhere the value comes from: Your SAP Basis administrator, who creates a dedicated Communication User (transaction SU01 or SICF-related setup) for external integrations.\nHow to use it later: Not included in the output.\nAccepted format: A SAP user ID string, typically uppercase by SAP convention.\nReal workplace example: A dedicated technical user like CTRLCHECKS_INT created specifically for this integration, rather than a real employee's personal SAP login.\nIf it is empty or wrong: If both Access Token and this field (with Basic Auth Password) are empty, the node returns {{$json._error}} = \"SAP node: authentication required - provide accessToken (OAuth2) or username + password (Basic Auth)\"; a wrong username/password combination returns a SAP authentication error.\nCommon mistake: Using a personal SAP login instead of a dedicated Communication User - if the employee's password changes or their account is locked/disabled, every workflow using this node breaks.",
  placeholder: 'SAP_USER',
};

const passwordField: FieldDoc = {
  name: 'Basic Auth Password',
  internalKey: 'password',
  type: 'password',
  required: false,
  description: 'SAP Basic Auth password, used only when Access Token is empty.',
  helpText: "What this field is: The password for the SAP user named in Basic Auth Username.\nWhy it matters: Combined with Basic Auth Username, this authenticates the request via HTTP Basic Auth whenever no Access Token is provided.\nWhen to fill it: Only when you are not using an OAuth2/Bearer token; required together with Basic Auth Username in that case.\nWhat to enter: The exact password for the SAP Communication/dialog user named in Basic Auth Username.\nWhere the value comes from: Your SAP Basis administrator.\nHow to use it later: Never included in the node output.\nAccepted format: A single password string.\nReal workplace example: A rotated, dedicated password for a Communication User account, stored only in this field (or, once auto-fill is available, in Connections).\nIf it is empty or wrong: If both Access Token and this field (with Basic Auth Username) are empty, the node returns {{$json._error}} = \"SAP node: authentication required - provide accessToken (OAuth2) or username + password (Basic Auth)\"; a wrong password returns a SAP authentication error.\nCommon mistake: Storing this directly on the node in a shared workflow instead of treating it as a secret - like any password, avoid pasting it where other collaborators with view access can see it.",
  placeholder: 'your-sap-password',
};

const csrfTokenField: FieldDoc = {
  name: 'X-CSRF-Token',
  internalKey: 'csrfToken',
  type: 'string',
  required: false,
  description: 'A CSRF token required by many SAP OData v2 services for Post/Put/Patch/Delete. This node does not fetch or capture the token for you - see Notes.',
  notes: 'SAP OData v2 services typically require a session-bound CSRF token on every mutating request, obtained by first sending a separate GET request with the header X-CSRF-Token: Fetch and reading the token back from that response\'s own X-CSRF-Token response header. This node\'s Get operation does not expose response headers in its output at all (only body/data, count, and statusCode) - there is currently no way to capture the CSRF token value from a Get call made by this node and feed it into a later Post/Put/Patch/Delete call automatically. You must obtain the token through some other means (an HTTP Request node with full header visibility, or a separately-issued long-lived token from your Basis team) and paste it in here manually.',
  helpText: "What this field is: A session-bound security token SAP OData v2 services require on requests that change data, to prevent cross-site request forgery.\nWhy it matters: Without it, many SAP OData v2 services reject Post/Put/Patch/Delete requests outright, even with valid credentials - see Notes for why this node cannot currently fetch it for you automatically.\nWhen to fill it: Only needed for Post, Put, Patch, or Delete against OData v2 services that enforce CSRF protection (most standard SAP Gateway services do). Not needed for Get, and not needed for OData v4 services or REST APIs that don't use this pattern (like SAP Business One's API).\nWhat to enter: The exact CSRF token value returned in the X-CSRF-Token response header from a prior GET request sent with the request header X-CSRF-Token: Fetch.\nWhere the value comes from: An HTTP Request node (which can read response headers) configured to GET the same SAP endpoint with header X-CSRF-Token: Fetch, then map its response header value into this field on a following SAP node.\nHow to use it later: Not included in the output.\nAccepted format: An opaque token string exactly as SAP's response header provided it.\nReal workplace example: Use an HTTP Request node to fetch the token first, then map {{$json.headers['x-csrf-token']}} (or your HTTP node's equivalent) into this field on the SAP node that performs the actual Post/Put/Patch/Delete.\nIf it is empty or wrong: An empty or wrong CSRF token on a service that requires one returns a SAP 403 Forbidden error inside {{$json._error}}, often with a message about an invalid or missing CSRF token.\nCommon mistake: Assuming this node fetches the CSRF token automatically just because Operation is set to Get first - it does not; the token must be obtained through a separate mechanism and pasted in manually.",
  placeholder: 'fetch-or-your-csrf-token',
};

const formatField: FieldDoc = {
  name: 'Response Format',
  internalKey: 'format',
  type: 'select',
  required: false,
  description: 'The response format to request from SAP: JSON (recommended) or XML.',
  options: ['json', 'xml'],
  helpText: "What this field is: Which response format this node asks SAP to return - JSON or XML.\nWhy it matters: Most OData v2/v4 services support both, but JSON is far easier to work with in downstream nodes; XML is returned as a raw text string with no parsing.\nWhen to fill it: Optional for every operation; JSON is the default and recommended choice.\nWhat to enter: JSON for the vast majority of use cases, or XML only if a specific SAP service requires it or you specifically need the raw XML/Atom feed format.\nWhere the value comes from: Chosen directly in the Properties Panel based on what the target service returns most usefully.\nHow to use it later: With JSON, {{$json.data}} is a parsed object/array; with XML, {{$json.data}} is a raw XML string requiring a separate XML-parsing node downstream.\nAccepted format: One of json, xml.\nReal workplace example: Leave this at JSON for virtually every standard SAP OData integration.\nIf it is empty or wrong: Left empty, this defaults to json, and the node automatically appends $format=json to the request URL unless a $format parameter is already present in Query Parameters.\nCommon mistake: Setting this to XML without a downstream XML-parsing step - the raw XML string in {{$json.data}} is not usable directly in most later nodes without first converting it.",
  placeholder: 'json',
  example: 'json',
  defaultValue: 'json',
};

const sharedFields: FieldDoc[] = [operationField, baseUrlField, endpointField, accessTokenField, usernameField, passwordField];

const getOperation: OperationDoc = {
  name: 'GET (Read)',
  value: 'get',
  description: 'Reads data from a SAP OData/REST endpoint via an HTTP GET request. OData v2 list responses are automatically unwrapped from the {d: {results}} envelope so {{$json.data}} is a plain array.',
  fields: [...sharedFields, queryParamsField, formatField],
  outputExample: {
    success: true,
    data: [
      { SalesOrder: '0000012345', SoldToParty: '0000100001', TotalNetAmount: '15000.00' },
    ],
    count: 1,
    statusCode: 200,
  },
  outputDescription: 'success: true when SAP accepted the request. data: the normalized response - SAP\'s OData v2 {d: {results: [...]}} or {d: {...}} envelope is automatically unwrapped, so this is either a plain array (list) or a plain object (single entity). count: present only when data is an array, showing how many records came back. statusCode: the raw HTTP status code. _error: present only when the request failed, for example "SAP node: baseUrl is required (e.g. https://your-sap-host:44300)" or a SAP OData error message. Unlike several other CRM nodes in this product, there is no _errorDetails key on failure - the full error text is already inside _error.',
  usageExample: {
    scenario: 'A sales reporting workflow fetches open sales orders every morning to build a backlog summary.',
    inputValues: { operation: 'get', baseUrl: 'https://your-sap-host:44300', endpoint: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder' },
    expectedOutput: 'SAP returns matching sales orders as {{$json.data}}, which a Loop node can iterate, with {{$json.count}} showing how many were returned.',
  },
  externalDocsUrl: 'https://api.sap.com/api/API_SALES_ORDER_SRV/overview',
};

const postOperation: OperationDoc = {
  name: 'POST (Create)',
  value: 'post',
  description: 'Creates a new SAP business object via an HTTP POST request, sending Request Body (JSON) as the payload. Most SAP OData v2 write services require a valid X-CSRF-Token on this request.',
  fields: [...sharedFields, payloadField, csrfTokenField],
  outputExample: {
    success: true,
    data: { SalesOrder: '0000012346', SoldToParty: '0000100001' },
    statusCode: 201,
  },
  outputDescription: 'success: true when SAP accepted the create request. data: SAP\'s response body for the newly created entity, unwrapped the same way as Get if it arrives in an OData v2 envelope - the exact fields returned depend on the specific SAP service. statusCode: typically 201 (Created). _error: present only when the request failed, for example a missing X-CSRF-Token (SAP returns 403) or a required-field validation error from SAP. No _errorDetails key is provided.',
  usageExample: {
    scenario: 'An order-intake workflow creates a new SAP sales order as soon as a customer completes checkout in an external e-commerce platform.',
    inputValues: { operation: 'post', baseUrl: 'https://your-sap-host:44300', endpoint: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', payload: '{"SalesOrderType":"OR","SoldToParty":"0000100001"}' },
    expectedOutput: 'SAP returns the created sales order as {{$json.data}}.',
  },
  externalDocsUrl: 'https://api.sap.com/api/API_SALES_ORDER_SRV/overview',
};

const putOperation: OperationDoc = {
  name: 'PUT (Replace)',
  value: 'put',
  description: 'Fully replaces an existing SAP business object via an HTTP PUT request, sending Request Body (JSON) as the complete new representation. Most SAP OData v2 write services require a valid X-CSRF-Token on this request.',
  fields: [...sharedFields, payloadField, csrfTokenField],
  outputExample: {
    success: true,
    data: { SalesOrder: '0000012345', SoldToParty: '0000100002' },
    statusCode: 200,
  },
  outputDescription: 'success: true when SAP accepted the replace request. data: SAP\'s response body, if the service returns one (some SAP services return no body for PUT, in which case data may come back as an empty string rather than an object - check the specific service\'s behavior). statusCode: the raw HTTP status code. _error: present only when the request failed, for example a missing X-CSRF-Token or a validation error. No _errorDetails key is provided.',
  usageExample: {
    scenario: 'A data-migration workflow fully replaces a SAP business partner record with a corrected complete data set from a legacy system.',
    inputValues: { operation: 'put', baseUrl: 'https://your-sap-host:44300', endpoint: "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('0000100001')", payload: '{"BusinessPartnerFullName":"Acme Corp"}' },
    expectedOutput: 'SAP confirms the replacement; check {{$json.statusCode}} and the absence of {{$json._error}}.',
  },
  externalDocsUrl: 'https://api.sap.com/api/API_BUSINESS_PARTNER/overview',
};

const patchOperation: OperationDoc = {
  name: 'PATCH (Update)',
  value: 'patch',
  description: 'Partially updates an existing SAP business object via an HTTP PATCH request, sending only the changed fields in Request Body (JSON). Most SAP OData v2 write services require a valid X-CSRF-Token on this request.',
  fields: [...sharedFields, payloadField, csrfTokenField],
  outputExample: {
    success: true,
    data: '',
    statusCode: 204,
  },
  outputDescription: 'success: true when SAP accepted the update request. data: many SAP OData services return HTTP 204 with no body for PATCH, in which case this node\'s JSON-parse attempt fails and falls back to an empty text string rather than an object - check for the absence of {{$json._error}} to confirm the update succeeded rather than relying on {{$json.data}} having content. statusCode: typically 204 (No Content) or 200. _error: present only when the request failed. No _errorDetails key is provided.',
  usageExample: {
    scenario: 'A billing workflow updates a SAP sales order\'s delivery block field after a payment issue is resolved.',
    inputValues: { operation: 'patch', baseUrl: 'https://your-sap-host:44300', endpoint: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('0000012345')", payload: '{"DeliveryBlockReason":""}' },
    expectedOutput: 'SAP confirms the update; the absence of {{$json._error}} confirms success even though {{$json.data}} may be empty.',
  },
  externalDocsUrl: 'https://api.sap.com/api/API_SALES_ORDER_SRV/overview',
};

const deleteOperation: OperationDoc = {
  name: 'DELETE (Remove)',
  value: 'delete',
  description: 'Permanently deletes an existing SAP business object via an HTTP DELETE request. SAP returns HTTP 204 with no body on success, so this node reports a synthetic confirmation instead. Most SAP OData v2 services require a valid X-CSRF-Token on this request.',
  fields: [...sharedFields, csrfTokenField],
  outputExample: {
    success: true,
    statusCode: 204,
    deleted: true,
  },
  outputDescription: 'success: true when SAP accepted the delete request. statusCode: the raw HTTP status code, typically 204. deleted: always true on a successful delete - there is no data or count key at all for this operation, unlike every other operation on this node. _error: present only when the request failed, for example a missing X-CSRF-Token or a "not found" error, and includes up to 500 characters of SAP\'s raw error response text directly in the message.',
  usageExample: {
    scenario: 'A data-cleanup workflow removes a duplicate test sales order created accidentally during an integration test run.',
    inputValues: { operation: 'delete', baseUrl: 'https://your-sap-host:44300', endpoint: "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('0000099999')" },
    expectedOutput: 'SAP confirms removal as {{$json.deleted}}.',
  },
  externalDocsUrl: 'https://api.sap.com/api/API_SALES_ORDER_SRV/overview',
};

export const sapDoc: NodeDoc = {
  slug: 'sap',
  displayName: 'SAP',
  category: 'CRM',
  logoUrl: '/icons/nodes/sap.svg',
  description: 'Read and write SAP business objects (sales orders, business partners, materials, and more) via OData v2/v4 and REST APIs, using a direct HTTP-method-based Operation field.',
  credentialType: 'SAP Connection',
  credentialSetupSteps: [
    'What this is: The SAP connection lets CtrlChecks store your SAP OAuth2/Bearer token safely in Connections, instead of pasting it into every workflow that uses SAP.',
    'Where to start: For SAP S/4HANA Cloud, create a Communication Arrangement and OAuth2 client in your SAP BTP subaccount. For on-premise systems using Basic Auth instead, ask your Basis team for a dedicated Communication User.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> SAP, then paste your Access Token (or Username/Password for Basic Auth).',
    'Important: Only the Access Token field is confirmed to auto-fill from a saved SAP connection at run time (per the connector registry\'s field mapping) - if you are using Basic Auth (Username/Password) instead, type those directly on the node even after saving a connection.',
    'Important: Treat the Access Token (or Password) like a bank password. Store it in Connections when possible, and never share it outside CtrlChecks.',
    'Test it: Save the connection, add a SAP node with Operation set to get and a real Endpoint Path for a service you have access to, run it, and confirm CtrlChecks returns real SAP data instead of an authentication error.',
    'Connect the SAP output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.data}}. Downstream service node account connection setup is still required for nodes after SAP; this connection only authorizes SAP OData/REST operations.',
  ],
  credentialDocsUrl: 'https://help.sap.com/docs/',
  resources: [
    {
      name: 'Operations',
      description: 'SAP OData/REST actions, expressed directly as HTTP methods rather than named CRM actions: GET (Read), POST (Create), PUT (Replace), PATCH (Update), and DELETE (Remove). All 5 dropdown values are real and map exactly to their HTTP method.',
      operations: [getOperation, postOperation, putOperation, patchOperation, deleteOperation],
    },
  ],
  commonErrors: [
    {
      error: 'SAP node: endpoint is required (e.g. /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder)',
      cause: 'The Endpoint Path field was left empty when the node ran.',
      fix: 'Fill the Endpoint Path field with the OData service/entity path or REST path for the SAP object you want to work with.',
    },
    {
      error: 'SAP node: baseUrl is required (e.g. https://your-sap-host:44300)',
      cause: 'The SAP Base URL field was left empty - this is enforced by the runtime even though the backend schema does not formally mark it required.',
      fix: 'Fill the SAP Base URL field with your SAP system\'s full base address.',
    },
    {
      error: 'SAP node: authentication required — provide accessToken (OAuth2) or username + password (Basic Auth)',
      cause: 'Neither Access Token nor a complete Username + Password pair was supplied.',
      fix: 'Connect SAP in CtrlChecks -> Connections (Access Token), or fill both Basic Auth Username and Basic Auth Password directly on the node.',
    },
    {
      error: 'SAP: DELETE failed (<status>): <details>',
      cause: 'SAP rejected the delete request - common causes are a missing/invalid X-CSRF-Token, insufficient authorization, or the record no longer existing.',
      fix: 'Confirm a valid X-CSRF-Token is supplied (see that field\'s notes on how to obtain one) and that the authenticated SAP user has delete authorization for this object.',
    },
    {
      error: 'SAP: <OPERATION> failed (<status>): <details>',
      cause: 'SAP rejected the request for the given HTTP method - common causes are an invalid property name/value in Request Body (JSON), a missing X-CSRF-Token on a mutating call, or an incorrect Endpoint Path.',
      fix: 'Check Request Body (JSON) against the target service\'s $metadata property names, confirm X-CSRF-Token is present for Post/Put/Patch/Delete, and verify Endpoint Path is correct for this SAP system.',
    },
  ],
  relatedNodes: [],
};
