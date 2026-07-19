import type { NodeDoc } from '../types';

export const typeformDoc: NodeDoc = {
  "slug": "typeform",
  "displayName": "Typeform",
  "category": "Data",
  "logoUrl": "/icons/nodes/typeform.svg",
  "description": "List forms, retrieve form responses, create forms, and fetch form definitions using Typeform.",
  "credentialType": "Typeform Personal Access Token",
  "credentialSetupSteps": [
    "What this is: The Typeform connection lets CtrlChecks access your Typeform account safely without putting secrets in workflow fields.",
    "Where to start: Typeform -> Account -> Personal tokens.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Typeform, then sign in or paste the secret value requested there.",
    "Example: tfp_... or the token Typeform shows.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Typeform step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://developer.typeform.com/get-started/personal-access-token/",
  "resources": [
    {
      "name": "Operations",
      "description": "Typeform exposes operation choices directly.",
      "operations": [
        {
          "name": "Get forms",
          "value": "get_forms",
          "description": "List forms available to the connected Typeform account.",
          "fields": [
            {
              "name": "Personal Access Token",
              "internalKey": "apiKey",
              "type": "password",
              "required": false,
              "description": "Optional fallback Typeform personal access token",
              "helpText": "Prefer Connections -> Add Connection -> Typeform. Paste a personal access token here only when you need a node-level fallback.",
              "placeholder": "Optional if saved in Connections",
              "notes": "Stored and displayed as a masked credential value."
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "get_forms",
            "items": [
              {
                "id": "abc123",
                "title": "Customer intake"
              }
            ],
            "totalItems": 1
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\nitems: Available Typeform forms.\ntotalItems: Number of forms returned when provided by Typeform.",
          "usageExample": {
            "scenario": "List Typeform forms before selecting one for a response workflow",
            "inputValues": {
              "Personal Access Token": ""
            },
            "expectedOutput": "Typeform returns forms that downstream nodes can reference with {{$json.items}}."
          },
          "externalDocsUrl": "https://www.typeform.com/developers/"
        },
        {
          "name": "Get responses",
          "value": "get_responses",
          "description": "Get responses using the Typeform node.",
          "fields": [
            {
              "name": "Personal Access Token",
              "internalKey": "apiKey",
              "type": "password",
              "required": false,
              "description": "Optional fallback Typeform personal access token",
              "helpText": "Prefer Connections -> Add Connection -> Typeform. Paste a personal access token here only when you need a node-level fallback.",
              "placeholder": "Optional if saved in Connections",
              "notes": "Stored and displayed as a masked credential value."
            },
            {
              "name": "Form Id",
              "internalKey": "formId",
              "type": "string",
              "required": false,
              "description": "Form ID",
              "helpText": "What this field is: The unique ID of your Typeform.\nWhere to find it: Open the form in Typeform → the ID is in the URL after /forms/.\nExample: If URL is typeform.com/to/FORM_ID, enter FORM_ID.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Title",
              "internalKey": "title",
              "type": "string",
              "required": false,
              "description": "Form title (for create_form)",
              "helpText": "What this field is: Form title.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Title value.\nTip: This field is used for create_form. Leave it blank when this operation does not need it.",
              "placeholder": "Enter Title"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "get_responses",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Typeform data with get responses after a related upstream event is received",
            "inputValues": {
              "Api Key": "",
              "Form Id": "abc123",
              "Title": ""
            },
            "expectedOutput": "Typeform returns structured get responses data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.typeform.com/developers/"
        },
        {
          "name": "Create form",
          "value": "create_form",
          "description": "Create form using the Typeform node.",
          "fields": [
            {
              "name": "Personal Access Token",
              "internalKey": "apiKey",
              "type": "password",
              "required": false,
              "description": "Optional fallback Typeform personal access token",
              "helpText": "Prefer Connections -> Add Connection -> Typeform. Paste a personal access token here only when you need a node-level fallback.",
              "placeholder": "Optional if saved in Connections",
              "notes": "Stored and displayed as a masked credential value."
            },
            {
              "name": "Form Id",
              "internalKey": "formId",
              "type": "string",
              "required": false,
              "description": "Form ID",
              "helpText": "What this field is: The unique ID of your Typeform.\nWhere to find it: Open the form in Typeform → the ID is in the URL after /forms/.\nExample: If URL is typeform.com/to/FORM_ID, enter FORM_ID.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Title",
              "internalKey": "title",
              "type": "string",
              "required": false,
              "description": "Form title (for create_form)",
              "helpText": "What this field is: Form title.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Title value.\nTip: This field is used for create_form. Leave it blank when this operation does not need it.",
              "placeholder": "Enter Title"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "create_form",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Typeform data with create form after a related upstream event is received",
            "inputValues": {
              "Api Key": "",
              "Form Id": "abc123",
              "Title": ""
            },
            "expectedOutput": "Typeform returns structured create form data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.typeform.com/developers/"
        },
        {
          "name": "Get form",
          "value": "get_form",
          "description": "Get form using the Typeform node.",
          "fields": [
            {
              "name": "Personal Access Token",
              "internalKey": "apiKey",
              "type": "password",
              "required": false,
              "description": "Optional fallback Typeform personal access token",
              "helpText": "Prefer Connections -> Add Connection -> Typeform. Paste a personal access token here only when you need a node-level fallback.",
              "placeholder": "Optional if saved in Connections",
              "notes": "Stored and displayed as a masked credential value."
            },
            {
              "name": "Form Id",
              "internalKey": "formId",
              "type": "string",
              "required": false,
              "description": "Form ID",
              "helpText": "What this field is: The unique ID of your Typeform.\nWhere to find it: Open the form in Typeform → the ID is in the URL after /forms/.\nExample: If URL is typeform.com/to/FORM_ID, enter FORM_ID.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Title",
              "internalKey": "title",
              "type": "string",
              "required": false,
              "description": "Form title (for create_form)",
              "helpText": "What this field is: Form title.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Title value.\nTip: This field is used for create_form. Leave it blank when this operation does not need it.",
              "placeholder": "Enter Title"
            }
          ],
          "outputExample": {
            "success": true,
            "operation": "get_form",
            "data": {
              "id": "item_123",
              "status": "completed"
            }
          },
          "outputDescription": "success: Whether the service accepted the request.\noperation: Value returned by this operation.\ndata: Returned records from the service.",
          "usageExample": {
            "scenario": "Process incoming Typeform data with get form after a related upstream event is received",
            "inputValues": {
              "Api Key": "",
              "Form Id": "abc123",
              "Title": ""
            },
            "expectedOutput": "Typeform returns structured get form data that downstream nodes can reference with {{$json.fieldName}}."
          },
          "externalDocsUrl": "https://www.typeform.com/developers/"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Typeform node."
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
