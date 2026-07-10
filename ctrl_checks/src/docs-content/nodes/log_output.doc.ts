import type { NodeDoc } from '../types';

export const logOutputDoc: NodeDoc = {
  "slug": "log_output",
  "displayName": "Log Output",
  "category": "Utility",
  "logoUrl": "/icons/nodes/log_output.svg",
  "description": "Log data to console or file. This is a terminal node — it cannot connect to further downstream nodes.",
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
      "description": "Log Output is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Write a log message to the CtrlChecks execution log for debugging and monitoring.",
          "fields": [
            {
              "name": "Level",
              "internalKey": "level",
              "type": "string",
              "required": false,
              "description": "Log level",
              "helpText": "What this field is: Log level.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: info.\nTip: Use {{$json.level}} when this value comes from an earlier step.",
              "placeholder": "info",
              "example": "info",
              "defaultValue": "info"
            },
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": false,
              "description": "Log message",
              "helpText": "What this field is: Log message.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Hello {{$json.name}}.\nTip: Use {{$json.message}} when this value comes from an earlier step.",
              "placeholder": "Hello {{$json.name}}"
            }
          ],
          "outputExample": {
            "message": "Processing user u_123"
          },
          "outputDescription": "message: The resolved log text, with any {{...}} template expressions substituted — this is the entire output value (a plain string, not an object with separate fields). Because log_output is a terminal node with no outgoing edges, this value is not forwarded to any further node; it is recorded in the execution history only.",
          "usageExample": {
            "scenario": "Log progress checkpoints in a long-running data pipeline",
            "inputValues": {
              "message": "Processed {{$json.rowCount}} rows from {{$json.tableName}}",
              "level": "info"
            },
            "expectedOutput": "The message appears in the workflow execution log. Useful for debugging without halting the workflow."
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
