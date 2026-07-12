import type { NodeDoc } from '../types';

export const functionDoc: NodeDoc = {
  "slug": "function",
  "displayName": "Function",
  "category": "Logic",
  "logoUrl": "/icons/nodes/function.svg",
  "description": "Execute custom JavaScript against the incoming item or object",
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
      "description": "Function is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Run a JavaScript body once with `input`, `data`, `$json`, and `json` bound to the incoming object.",
          "fields": [
            {
              "name": "Code",
              "internalKey": "code",
              "type": "string",
              "required": true,
              "description": "JavaScript body to run once. Return a value or assign `result`.",
              "helpText": "What this field is: JavaScript code that transforms the incoming object.\nHow to fill it: Use `return ...` or assign `result`. You can read incoming data from `$json`, `json`, `input`, or `data`.\nExample: return { ...$json, processed: true };",
              "placeholder": "return { ...$json, processed: true };",
              "example": "return { ...$json, processed: true };"
            },
            {
              "name": "Timeout",
              "internalKey": "timeout",
              "type": "number",
              "required": false,
              "description": "Execution timeout in milliseconds (max 30000)",
              "helpText": "What this field is: Maximum JavaScript execution time in milliseconds.\nHow to fill it: Type a number from 100 up to 30000. The runtime caps larger values at 30000.\nExample: 10000.",
              "placeholder": "5000",
              "example": "5000",
              "defaultValue": "10000"
            }
          ],
          "outputExample": {
            "processed": true,
            "id": "item_123"
          },
          "outputDescription": "Returns exactly the JavaScript return value. If no value is returned and `result` is not assigned, the original input object is returned.",
          "usageExample": {
            "scenario": "Add a processed flag to the incoming object",
            "inputValues": {
              "Code": "return { ...$json, processed: true };",
              "Timeout": "5000"
            },
            "expectedOutput": "Downstream nodes can reference `{{$json.processed}}`."
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
