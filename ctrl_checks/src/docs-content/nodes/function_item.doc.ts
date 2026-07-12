import type { NodeDoc } from '../types';

export const functionItemDoc: NodeDoc = {
  "slug": "function_item",
  "displayName": "Function Item",
  "category": "Logic",
  "logoUrl": "/icons/nodes/function_item.svg",
  "description": "Execute custom JavaScript once for each item in input.items",
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
      "description": "Function Item is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Run a JavaScript body for each element in `input.items` and replace `items` with the mapped results.",
          "fields": [
            {
              "name": "Code",
              "internalKey": "code",
              "type": "string",
              "required": true,
              "description": "JavaScript body to run for each item. Return a value or assign `result`.",
              "helpText": "What this field is: JavaScript code that transforms one item at a time.\nHow to fill it: Use `item`, `input`, `data`, `$json`, or `json` for the current item. Return the mapped item.\nExample: return { ...item, processed: true };",
              "placeholder": "return { ...item, processed: true };",
              "example": "return { ...item, processed: true };"
            },
            {
              "name": "Timeout",
              "internalKey": "timeout",
              "type": "number",
              "required": false,
              "description": "Execution timeout in milliseconds (max 30000)",
              "helpText": "What this field is: Maximum JavaScript execution time in milliseconds.\nHow to fill it: Type a number from 100 up to 30000. The runtime caps larger values at 30000.\nExample: 10000.",
              "placeholder": "10000",
              "example": "10000",
              "defaultValue": "10000"
            }
          ],
          "outputExample": {
            "items": [
              {
                "id": "1",
                "name": "Example item",
                "processed": true
              }
            ]
          },
          "outputDescription": "Passes through the incoming object and replaces items with the mapped array. If input.items is missing, the input passes through unchanged.",
          "usageExample": {
            "scenario": "Mark every item in an array as processed",
            "inputValues": {
              "Code": "return { ...item, processed: true };",
              "Timeout": "10000"
            },
            "expectedOutput": "The next node receives `{{$json.items}}` with every item transformed."
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
