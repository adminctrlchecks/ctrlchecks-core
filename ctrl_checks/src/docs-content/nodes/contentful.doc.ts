import type { NodeDoc } from '../types';

export const contentfulDoc: NodeDoc = {
  "slug": "contentful",
  "displayName": "Contentful",
  "category": "Data",
  "logoUrl": "/icons/nodes/contentful.svg",
  "description": "Create, read, update, and delete content entries on any Contentful space.",
  "credentialType": "Contentful CMA Personal Access Token",
  "credentialSetupSteps": [
    "What this is: The Contentful connection lets CtrlChecks access your Contentful account safely without putting secrets in workflow fields.",
    "Where to start: Contentful -> Settings -> CMA tokens.",
    "Create a personal access token and copy the CFPAT value immediately.",
    "Important: In the CMA tokens list, click Authorize on the token row and grant access to the organization/space you want CtrlChecks to use.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Contentful, then paste the authorized CFPAT token.",
    "Do not use Content Delivery API or Content Preview API tokens for this node.",
    "Troubleshooting: OrganizationAccessGrantRequired means the token is valid but has not been authorized for that organization/space.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Contentful step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://www.contentful.com/developers/docs/references/authentication/",
  "resources": [
    {
      "name": "Operations",
      "description": "Contentful exposes operation choices directly.",
      "operations": [
        {
          "name": "Get entries",
          "value": "get_entries",
          "description": "Get entries using the Contentful node.",
          "fields": [
            {
              "name": "Space Id",
              "internalKey": "spaceId",
              "type": "string",
              "required": true,
              "description": "Contentful space ID",
              "helpText": "What this field is: Your Contentful space ID — identifies your content workspace.\nWhere to find it: Contentful Dashboard → Settings → General Settings → Space ID.\nExample: abcd1234efgh",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Access Token",
              "internalKey": "accessToken",
              "type": "string",
              "required": true,
              "description": "Contentful CMA personal access token",
              "helpText": "What this field is: Contentful access token, a secret password that lets CtrlChecks talk to Contentful safely.\nWhere to find it: Contentful -> Settings -> API keys.\nHow to fill it: Store this secret in CtrlChecks Connections when possible. Paste it here only when this field is explicitly asking for the token.\nExample: a Delivery token for reading or a Management token for writing.\nImportant: Treat this like a bank password. Use the token type that matches the operation.",
              "placeholder": "token_..."
            },
            {
              "name": "Environment",
              "internalKey": "environment",
              "type": "string",
              "required": false,
              "description": "Contentful environment",
              "helpText": "What this field is: Contentful environment.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: master.\nTip: Use {{$json.environment}} when this value comes from an earlier step.",
              "placeholder": "master",
              "example": "master",
              "defaultValue": "master"
            },
            {
              "name": "Content Type",
              "internalKey": "contentType",
              "type": "textarea",
              "required": false,
              "description": "Content type ID",
              "helpText": "What this field is: Content type ID.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Content Type value.\nTip: Use {{$json.contentType}} when this value comes from an earlier step.",
              "placeholder": "Enter Content Type"
            },
            {
              "name": "Entry Id",
              "internalKey": "entryId",
              "type": "string",
              "required": false,
              "description": "Entry ID",
              "helpText": "What this field is: The Entry ID that tells Contentful which item to use.\nWhere to find it: Open the item in Contentful and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.entryId}} when an earlier Contentful step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Fields",
              "internalKey": "fields",
              "type": "string",
              "required": false,
              "description": "JSON string of entry fields",
              "helpText": "What this field is: Structured data for structured data in { } brackets string of entry fields.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Contentful.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.fields}} when an earlier step already prepared this data.",
              "placeholder": "Enter Fields"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "get_entries",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Contentful data with get entries after a related upstream event is received",
            "inputValues": {
              "Space Id": "abc123",
              "Access Token": "",
              "Environment": "master",
              "Content Type": "",
              "Entry Id": "abc123"
            },
            "expectedOutput": "Contentful returns structured get entries data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.contentful.com/developers/docs/references/content-management-api/"
        },
        {
          "name": "Get entry",
          "value": "get_entry",
          "description": "Get entry using the Contentful node.",
          "fields": [
            {
              "name": "Space Id",
              "internalKey": "spaceId",
              "type": "string",
              "required": true,
              "description": "Contentful space ID",
              "helpText": "What this field is: Your Contentful space ID — identifies your content workspace.\nWhere to find it: Contentful Dashboard → Settings → General Settings → Space ID.\nExample: abcd1234efgh",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Access Token",
              "internalKey": "accessToken",
              "type": "string",
              "required": true,
              "description": "Contentful CMA personal access token",
              "helpText": "What this field is: Contentful access token, a secret password that lets CtrlChecks talk to Contentful safely.\nWhere to find it: Contentful -> Settings -> API keys.\nHow to fill it: Store this secret in CtrlChecks Connections when possible. Paste it here only when this field is explicitly asking for the token.\nExample: a Delivery token for reading or a Management token for writing.\nImportant: Treat this like a bank password. Use the token type that matches the operation.",
              "placeholder": "token_..."
            },
            {
              "name": "Environment",
              "internalKey": "environment",
              "type": "string",
              "required": false,
              "description": "Contentful environment",
              "helpText": "What this field is: Contentful environment.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: master.\nTip: Use {{$json.environment}} when this value comes from an earlier step.",
              "placeholder": "master",
              "example": "master",
              "defaultValue": "master"
            },
            {
              "name": "Content Type",
              "internalKey": "contentType",
              "type": "textarea",
              "required": false,
              "description": "Content type ID",
              "helpText": "What this field is: Content type ID.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Content Type value.\nTip: Use {{$json.contentType}} when this value comes from an earlier step.",
              "placeholder": "Enter Content Type"
            },
            {
              "name": "Entry Id",
              "internalKey": "entryId",
              "type": "string",
              "required": false,
              "description": "Entry ID",
              "helpText": "What this field is: The Entry ID that tells Contentful which item to use.\nWhere to find it: Open the item in Contentful and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.entryId}} when an earlier Contentful step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Fields",
              "internalKey": "fields",
              "type": "string",
              "required": false,
              "description": "JSON string of entry fields",
              "helpText": "What this field is: Structured data for structured data in { } brackets string of entry fields.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Contentful.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.fields}} when an earlier step already prepared this data.",
              "placeholder": "Enter Fields"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "get_entry",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Contentful data with get entry after a related upstream event is received",
            "inputValues": {
              "Space Id": "abc123",
              "Access Token": "",
              "Environment": "master",
              "Content Type": "",
              "Entry Id": "abc123"
            },
            "expectedOutput": "Contentful returns structured get entry data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.contentful.com/developers/docs/references/content-management-api/"
        },
        {
          "name": "Create entry",
          "value": "create_entry",
          "description": "Create entry using the Contentful node.",
          "fields": [
            {
              "name": "Space Id",
              "internalKey": "spaceId",
              "type": "string",
              "required": true,
              "description": "Contentful space ID",
              "helpText": "What this field is: Your Contentful space ID — identifies your content workspace.\nWhere to find it: Contentful Dashboard → Settings → General Settings → Space ID.\nExample: abcd1234efgh",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Access Token",
              "internalKey": "accessToken",
              "type": "string",
              "required": true,
              "description": "Contentful CMA personal access token",
              "helpText": "What this field is: Contentful access token, a secret password that lets CtrlChecks talk to Contentful safely.\nWhere to find it: Contentful -> Settings -> API keys.\nHow to fill it: Store this secret in CtrlChecks Connections when possible. Paste it here only when this field is explicitly asking for the token.\nExample: a Delivery token for reading or a Management token for writing.\nImportant: Treat this like a bank password. Use the token type that matches the operation.",
              "placeholder": "token_..."
            },
            {
              "name": "Environment",
              "internalKey": "environment",
              "type": "string",
              "required": false,
              "description": "Contentful environment",
              "helpText": "What this field is: Contentful environment.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: master.\nTip: Use {{$json.environment}} when this value comes from an earlier step.",
              "placeholder": "master",
              "example": "master",
              "defaultValue": "master"
            },
            {
              "name": "Content Type",
              "internalKey": "contentType",
              "type": "textarea",
              "required": false,
              "description": "Content type ID",
              "helpText": "What this field is: Content type ID.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Content Type value.\nTip: Use {{$json.contentType}} when this value comes from an earlier step.",
              "placeholder": "Enter Content Type"
            },
            {
              "name": "Entry Id",
              "internalKey": "entryId",
              "type": "string",
              "required": false,
              "description": "Entry ID",
              "helpText": "What this field is: The Entry ID that tells Contentful which item to use.\nWhere to find it: Open the item in Contentful and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.entryId}} when an earlier Contentful step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Fields",
              "internalKey": "fields",
              "type": "string",
              "required": false,
              "description": "JSON string of entry fields",
              "helpText": "What this field is: Structured data for structured data in { } brackets string of entry fields.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Contentful.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.fields}} when an earlier step already prepared this data.",
              "placeholder": "Enter Fields"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "create_entry",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Contentful data with create entry after a related upstream event is received",
            "inputValues": {
              "Space Id": "abc123",
              "Access Token": "",
              "Environment": "master",
              "Content Type": "",
              "Entry Id": "abc123"
            },
            "expectedOutput": "Contentful returns structured create entry data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.contentful.com/developers/docs/references/content-management-api/"
        },
        {
          "name": "Update entry",
          "value": "update_entry",
          "description": "Update entry using the Contentful node.",
          "fields": [
            {
              "name": "Space Id",
              "internalKey": "spaceId",
              "type": "string",
              "required": true,
              "description": "Contentful space ID",
              "helpText": "What this field is: Your Contentful space ID — identifies your content workspace.\nWhere to find it: Contentful Dashboard → Settings → General Settings → Space ID.\nExample: abcd1234efgh",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Access Token",
              "internalKey": "accessToken",
              "type": "string",
              "required": true,
              "description": "Contentful CMA personal access token",
              "helpText": "What this field is: Contentful access token, a secret password that lets CtrlChecks talk to Contentful safely.\nWhere to find it: Contentful -> Settings -> API keys.\nHow to fill it: Store this secret in CtrlChecks Connections when possible. Paste it here only when this field is explicitly asking for the token.\nExample: a Delivery token for reading or a Management token for writing.\nImportant: Treat this like a bank password. Use the token type that matches the operation.",
              "placeholder": "token_..."
            },
            {
              "name": "Environment",
              "internalKey": "environment",
              "type": "string",
              "required": false,
              "description": "Contentful environment",
              "helpText": "What this field is: Contentful environment.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: master.\nTip: Use {{$json.environment}} when this value comes from an earlier step.",
              "placeholder": "master",
              "example": "master",
              "defaultValue": "master"
            },
            {
              "name": "Content Type",
              "internalKey": "contentType",
              "type": "textarea",
              "required": false,
              "description": "Content type ID",
              "helpText": "What this field is: Content type ID.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Content Type value.\nTip: Use {{$json.contentType}} when this value comes from an earlier step.",
              "placeholder": "Enter Content Type"
            },
            {
              "name": "Entry Id",
              "internalKey": "entryId",
              "type": "string",
              "required": false,
              "description": "Entry ID",
              "helpText": "What this field is: The Entry ID that tells Contentful which item to use.\nWhere to find it: Open the item in Contentful and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.entryId}} when an earlier Contentful step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Fields",
              "internalKey": "fields",
              "type": "string",
              "required": false,
              "description": "JSON string of entry fields",
              "helpText": "What this field is: Structured data for structured data in { } brackets string of entry fields.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Contentful.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.fields}} when an earlier step already prepared this data.",
              "placeholder": "Enter Fields"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "update_entry",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Contentful data with update entry after a related upstream event is received",
            "inputValues": {
              "Space Id": "abc123",
              "Access Token": "",
              "Environment": "master",
              "Content Type": "",
              "Entry Id": "abc123"
            },
            "expectedOutput": "Contentful returns structured update entry data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.contentful.com/developers/docs/references/content-management-api/"
        },
        {
          "name": "Delete entry",
          "value": "delete_entry",
          "description": "Delete entry using the Contentful node.",
          "fields": [
            {
              "name": "Space Id",
              "internalKey": "spaceId",
              "type": "string",
              "required": true,
              "description": "Contentful space ID",
              "helpText": "What this field is: Your Contentful space ID — identifies your content workspace.\nWhere to find it: Contentful Dashboard → Settings → General Settings → Space ID.\nExample: abcd1234efgh",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Access Token",
              "internalKey": "accessToken",
              "type": "string",
              "required": true,
              "description": "Contentful CMA personal access token",
              "helpText": "What this field is: Contentful access token, a secret password that lets CtrlChecks talk to Contentful safely.\nWhere to find it: Contentful -> Settings -> API keys.\nHow to fill it: Store this secret in CtrlChecks Connections when possible. Paste it here only when this field is explicitly asking for the token.\nExample: a Delivery token for reading or a Management token for writing.\nImportant: Treat this like a bank password. Use the token type that matches the operation.",
              "placeholder": "token_..."
            },
            {
              "name": "Environment",
              "internalKey": "environment",
              "type": "string",
              "required": false,
              "description": "Contentful environment",
              "helpText": "What this field is: Contentful environment.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: master.\nTip: Use {{$json.environment}} when this value comes from an earlier step.",
              "placeholder": "master",
              "example": "master",
              "defaultValue": "master"
            },
            {
              "name": "Content Type",
              "internalKey": "contentType",
              "type": "textarea",
              "required": false,
              "description": "Content type ID",
              "helpText": "What this field is: Content type ID.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Content Type value.\nTip: Use {{$json.contentType}} when this value comes from an earlier step.",
              "placeholder": "Enter Content Type"
            },
            {
              "name": "Entry Id",
              "internalKey": "entryId",
              "type": "string",
              "required": false,
              "description": "Entry ID",
              "helpText": "What this field is: The Entry ID that tells Contentful which item to use.\nWhere to find it: Open the item in Contentful and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.entryId}} when an earlier Contentful step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Fields",
              "internalKey": "fields",
              "type": "string",
              "required": false,
              "description": "JSON string of entry fields",
              "helpText": "What this field is: Structured data for structured data in { } brackets string of entry fields.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Contentful.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.fields}} when an earlier step already prepared this data.",
              "placeholder": "Enter Fields"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "delete_entry",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Contentful data with delete entry after a related upstream event is received",
            "inputValues": {
              "Space Id": "abc123",
              "Access Token": "",
              "Environment": "master",
              "Content Type": "",
              "Entry Id": "abc123"
            },
            "expectedOutput": "Contentful returns structured delete entry data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.contentful.com/developers/docs/references/content-management-api/"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Contentful node."
    },
    {
      "error": "Required field missing",
      "cause": "A required input is empty or an upstream expression resolved to an empty value.",
      "fix": "Open the node, fill every required field, and verify the upstream node output before running."
    },
    {
      "error": "Invalid input format",
      "cause": "A field value does not match the format expected by the node or service API.",
      "fix": "Check JSON, date, URL, email, and ID fields against the examples shown in the node documentation."
    }
  ],
  "relatedNodes": []
};
