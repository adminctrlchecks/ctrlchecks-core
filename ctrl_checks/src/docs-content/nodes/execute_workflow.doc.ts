import type { NodeDoc } from '../types';

export const executeWorkflowDoc: NodeDoc = {
  "slug": "execute_workflow",
  "displayName": "Execute Workflow",
  "category": "Logic",
  "logoUrl": "/icons/nodes/execute_workflow.svg",
  "description": "Executes another workflow and returns its result",
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
      "description": "Execute Workflow is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Call another confirmed or active workflow and return its final result.",
          "fields": [
            {
              "name": "Workflow Id",
              "internalKey": "workflowId",
              "type": "string",
              "required": true,
              "description": "ID of the workflow to execute",
              "helpText": "What this field is: The ID of the workflow to execute that tells Execute Workflow which item to use.\nWhere to find it: Open the item in Execute Workflow and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123e4567-e89b-12d3-a456-426614174000.\nTip: Use {{$json.workflowId}} when an earlier Execute Workflow step provides this value.",
              "placeholder": "123e4567-e89b-12d3-a456-426614174000",
              "example": "123e4567-e89b-12d3-a456-426614174000"
            },
            {
              "name": "Input",
              "internalKey": "input",
              "type": "json",
              "required": false,
              "description": "Input data to pass to the sub-workflow",
              "helpText": "What this field is: Structured data for Input data to pass to the sub-workflow.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Execute Workflow.\nExample: {{$json}}.\nTip: Use {{$json.input}} when an earlier step already prepared this data.",
              "placeholder": "{{$json}}",
              "example": "{{$json}}"
            }
          ],
          "outputExample": {
            "success": true,
            "result": {
              "processedCount": 42
            },
            "workflowId": "wf_sub123"
          },
          "outputDescription": "success: true when the sub-workflow was found and executed. result: The final output or Return-node value from the called workflow. workflowId: The called workflow ID.",
          "usageExample": {
            "scenario": "Call a reusable \"send-notification\" sub-workflow from multiple workflows",
            "inputValues": {
              "workflowId": "{{$env.NOTIFY_WORKFLOW_ID}}",
              "input": "{\"userId\": \"{{$json.userId}}\", \"message\": \"{{$json.message}}\"}"
            },
            "expectedOutput": "The sub-workflow runs and returns its result in `{{$json.result}}`."
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
