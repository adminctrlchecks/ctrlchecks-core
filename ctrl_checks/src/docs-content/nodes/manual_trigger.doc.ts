import type { NodeDoc } from '../types';

export const manualTriggerDoc: NodeDoc = {
  "slug": "manual_trigger",
  "displayName": "Manual Trigger",
  "category": "Triggers",
  "logoUrl": "/icons/nodes/manual_trigger.svg",
  "description": "Start a workflow only when a person chooses to run it. Use Manual Trigger for testing, approvals, one-off operations, and internal workflows that should not run on a schedule or from an outside app.",
  "credentialType": "None",
  "credentialSetupSteps": [
    "No third-party account, API key, token, or saved connection is needed for this node.",
    "Place Manual Trigger as the first node in the workflow and connect its output to the next action node.",
    "Use the workflow Run button or the node debug panel when you want to start the workflow.",
    "If the next node needs sample data, provide it as test input in the debug/run panel or use the optional Input Data payload documented below.",
    "Connection problems for this node are canvas-link problems, not credential problems: check that Manual Trigger has an outgoing line to the first action node."
  ],
  "credentialDocsUrl": "https://docs.ctrlchecks.com",
  "resources": [
    {
      "name": "Configuration",
      "description": "Manual Trigger has one operation: start the workflow on demand. It can pass optional sample data to the next node, but it never connects to an outside account.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Starts the workflow when you click Run. Choose this trigger when a person should decide exactly when the workflow starts, such as testing a new automation, reprocessing a small list, sending an approved report, or running a month-end cleanup.",
          "fields": [
            {
              "name": "Input Data",
              "internalKey": "inputData",
              "type": "json",
              "required": false,
              "description": "Optional sample data that becomes available to the next node when you run the workflow manually.",
              "helpText": "What this field means: Input Data is the test or one-off information you want the workflow to start with.\nWhy it matters: The next node can read these values, so you can test mappings before connecting a real form, webhook, schedule, or app trigger.\nWhen to fill it: Leave it empty when the workflow can start without sample data. Fill it when the next node expects fields such as a customer email, ticket ID, order number, or report date.\nWhat to enter: Use a JSON object with clear field names, such as {\"customerEmail\":\"maya@acme.com\",\"ticketId\":\"SUP-1042\",\"priority\":\"high\"}.\nWhere the value comes from: For manual runs, you usually type this sample data yourself or paste a small example from a real workplace record.\nHow to use it later: In the next node, map a value with expressions such as {{$json.customerEmail}}, {{$json.ticketId}}, or {{$json.reportDate}}.\nAccepted format: A valid JSON object such as {\"reportDate\":\"2026-07-31\"} or a JSON list such as [{\"orderId\":\"ORD-1001\"},{\"orderId\":\"ORD-1002\"}]. Use double quotes around field names and text values.\nReal workplace example: A finance manager runs a month-end report with {\"reportDate\":\"2026-07-31\",\"department\":\"Sales\",\"requestedBy\":\"nina@company.com\"}.\nIf it is empty or wrong: Empty input is allowed, but later nodes that expect fields may show missing value errors. Invalid JSON can stop the run before the first action receives data.\nCommon mistake to avoid: Do not paste API keys, passwords, or account tokens here. Store secrets in Connections or credential settings for the service node that needs them.",
              "placeholder": "{\"customerEmail\":\"maya@acme.com\",\"ticketId\":\"SUP-1042\"}",
              "example": "{\"reportDate\":\"2026-07-31\",\"department\":\"Sales\",\"requestedBy\":\"nina@company.com\"}",
              "notes": "This field is optional and is mainly useful for testing or one-off manual runs."
            }
          ],
          "outputExample": {
            "executedAt": "2025-01-15T14:30:00.000Z",
            "triggeredBy": "manual",
            "workflowId": "wf_abc123",
            "inputData": {
              "reportDate": "2026-07-31",
              "department": "Sales",
              "requestedBy": "nina@company.com"
            },
            "output": {}
          },
          "outputDescription": "executedAt: The date and time when the manual run started. triggeredBy: Shows that this run was started by a person. workflowId: The workflow that was run. inputData: The optional sample payload you provided, which the next node can read. output: A reserved object for trigger output metadata.",
          "usageExample": {
            "scenario": "A support lead manually reruns a priority ticket notification after confirming the ticket should be escalated.",
            "inputValues": {
              "inputData": "{\"ticketId\":\"SUP-1042\",\"customerEmail\":\"maya@acme.com\",\"priority\":\"high\"}"
            },
            "expectedOutput": "The workflow starts immediately. The next node can use {{$json.ticketId}}, {{$json.customerEmail}}, and {{$json.priority}} to look up the ticket, send a message, or create an audit log."
          },
          "externalDocsUrl": "https://docs.ctrlchecks.com"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "The workflow runs but the next node has blank values",
      "cause": "Manual Trigger started correctly, but the Input Data payload did not include the field the next node mapped, such as customerEmail or ticketId.",
      "fix": "Open the run/debug input and add the missing field with the exact same name used by the next node expression, for example {{$json.customerEmail}}."
    },
    {
      "error": "Invalid JSON in Input Data",
      "cause": "The sample payload is not valid JSON, often because field names use single quotes, text values are not quoted, or a comma is missing.",
      "fix": "Use double quotes around JSON field names and text values. Example: {\"reportDate\":\"2026-07-31\",\"department\":\"Sales\"}."
    },
    {
      "error": "Nothing happens after the manual run starts",
      "cause": "Manual Trigger is not connected to the first action node, or the workflow only contains the trigger.",
      "fix": "Draw a connection from Manual Trigger to the next node, then run the workflow again and inspect the next node output."
    },
    {
      "error": "Permission denied in a later service node",
      "cause": "Manual Trigger does not use credentials, but a connected service node such as Gmail, Slack, or Google Sheets still needs its own account connection.",
      "fix": "Open the service node that failed, connect the correct account, and make sure that account has permission to read, write, send, upload, or delete as required by that node."
    }
  ],
  "relatedNodes": ["schedule", "webhook", "form", "workflow_trigger"]
};
