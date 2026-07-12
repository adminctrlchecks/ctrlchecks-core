import type { NodeDoc } from '../types';

export const errorHandlerDoc: NodeDoc = {
  "slug": "error_handler",
  "displayName": "Error Handler",
  "category": "Logic",
  "logoUrl": "/icons/nodes/error_handler.svg",
  "description": "Mark an upstream error as handled and optionally emit a fallback value",
  "credentialType": "None",
  "credentialSetupSteps": [
    "This node does not need a saved account connection.",
    "Open the node settings and fill the visible input fields.",
    "Run the workflow when the required fields are complete."
  ],
  "credentialDocsUrl": "https://docs.ctrlchecks.com",
  "resources": [
    {
      "name": "Configuration",
      "description": "Error Handler is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Inspect the incoming payload for `_error`, mark it as handled, and optionally return a fallback value.",
          "fields": [
            {
              "name": "Fallback Value",
              "internalKey": "fallbackValue",
              "type": "json",
              "required": false,
              "description": "Optional value emitted as `value` when the incoming payload contains `_error`.",
              "helpText": "What this field is: A fallback object returned when the previous step already produced an error.\nHow to fill it: Enter a JSON object such as {\"status\":\"unavailable\"}. Leave it empty to only mark whether an error was handled.\nRuntime note: Retry and backoff are handled by the execution engine, not by this node.",
              "placeholder": "{\"status\":\"unavailable\"}",
              "example": "{\"status\":\"unavailable\"}"
            }
          ],
          "outputExample": {
            "handled": true,
            "_error": "Connection timeout",
            "value": {
              "status": "error_handled"
            }
          },
          "outputDescription": "Passes through the incoming payload. Adds handled: true and value when `_error` exists and fallbackValue is configured; otherwise adds handled: false.",
          "usageExample": {
            "scenario": "Convert an upstream `_error` payload into a handled fallback object",
            "inputValues": {
              "fallbackValue": "{\"status\": \"unavailable\"}"
            },
            "expectedOutput": "When the input has `_error`, the next node can read `{{$json.handled}}` and `{{$json.value.status}}`."
          },
          "externalDocsUrl": "https://docs.ctrlchecks.com"
        }
      ]
    }
  ],
  "commonErrors": [
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
