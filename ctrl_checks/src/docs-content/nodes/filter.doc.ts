import type { NodeDoc } from '../types';

export const filterDoc: NodeDoc = {
  "slug": "filter",
  "displayName": "Filter",
  "category": "Logic",
  "logoUrl": "/icons/nodes/filter.svg",
  "description": "Filter array items by condition",
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
      "description": "Filter is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Filter an array of items, keeping only those that match a condition.",
          "fields": [
            {
              "name": "Array",
              "internalKey": "array",
              "type": "string",
              "required": false,
              "description": "Optional expression that resolves to the array to filter. Defaults to input.items.",
              "helpText": "What this field is: The array this node should filter.\nHow to fill it: Leave empty when the previous node already outputs `items`, or use an expression such as {{$json.contacts}}.\nExample: {{$json.items}}.",
              "placeholder": "{{$json.items}}",
              "example": "{{$json.items}}"
            },
            {
              "name": "Condition",
              "internalKey": "condition",
              "type": "string",
              "required": true,
              "description": "JavaScript expression evaluated for each item. Use item for the current item and input for the full incoming object.",
              "helpText": "What this field is: A JavaScript expression that must return true for items you want to keep.\nHow to fill it: Use `item` for each current array element, such as item.age >= 18.\nExample: item.status === \"active\".",
              "placeholder": "item.age >= 18",
              "example": "item.age >= 18"
            }
          ],
          "outputExample": {
            "items": [
              {
                "id": 2,
                "status": "active",
                "name": "Bob"
              }
            ]
          },
          "outputDescription": "Passes through the incoming object and replaces items with the filtered array. If no array is available, the input passes through unchanged.",
          "usageExample": {
            "scenario": "Keep only active users from a database query result",
            "inputValues": {
              "condition": "item.status === \"active\""
            },
            "expectedOutput": "The next node receives `{{$json.items}}` containing only active users."
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
