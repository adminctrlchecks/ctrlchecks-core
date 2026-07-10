import type { NodeDoc } from '../types';

export const sendgridDoc: NodeDoc = {
  "slug": "sendgrid",
  "displayName": "SendGrid",
  "category": "Communication",
  "logoUrl": "/icons/nodes/sendgrid.svg",
  "description": "Send transactional emails using the SendGrid API.",
  "credentialType": "SendGrid API Key",
  "credentialSetupSteps": [
    "What this is: The SendGrid connection lets CtrlChecks access your SendGrid account safely without putting secrets in workflow fields.",
    "Where to start: SendGrid -> Settings -> API Keys -> Create API Key.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> SendGrid, then sign in or paste the secret value requested there.",
    "Example: SG.....",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple SendGrid step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/authentication",
  "resources": [
    {
      "name": "Configuration",
      "description": "SendGrid sends email through a saved SendGrid API Key connection plus message fields on the node.",
      "operations": [
        {
          "name": "Send email",
          "value": "send_email",
          "description": "Send a transactional or marketing email via SendGrid.",
          "fields": [
            {
              "name": "From",
              "internalKey": "from",
              "type": "string",
              "required": true,
              "description": "Sender email address (must be a verified sender in SendGrid)",
              "helpText": "What this field is: Sender email address.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: noreply@yourdomain.com.\nTip: Use {{$json.from}} when this value comes from an earlier step.",
              "placeholder": "noreply@yourdomain.com",
              "example": "noreply@yourdomain.com"
            },
            {
              "name": "To",
              "internalKey": "to",
              "type": "string",
              "required": true,
              "description": "Recipient email address(es), comma-separated",
              "helpText": "What this field is: Recipient email address , comma-separated.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: user@example.com.\nTip: Use {{$json.to}} when this value comes from an earlier step.",
              "placeholder": "user@example.com",
              "example": "user@example.com"
            },
            {
              "name": "Subject",
              "internalKey": "subject",
              "type": "string",
              "required": false,
              "description": "Email subject line",
              "helpText": "What this field is: Email subject line.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Hello!.\nTip: Use {{$json.subject}} when this value comes from an earlier step.",
              "placeholder": "Hello!",
              "example": "Hello!"
            },
            {
              "name": "Text",
              "internalKey": "text",
              "type": "textarea",
              "required": false,
              "description": "Plain text body of the email",
              "helpText": "What this field is: Plain text body of the email.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Your message here.\nTip: Use {{$json.text}} when this value comes from an earlier step.",
              "placeholder": "Your message here",
              "example": "Your message here"
            },
            {
              "name": "Html",
              "internalKey": "html",
              "type": "textarea",
              "required": false,
              "description": "HTML body of the email (overrides plain text for HTML clients)",
              "helpText": "What this field is: HTML body of the email.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: <p>Your message</p>.\nTip: Use {{$json.html}} when this value comes from an earlier step.",
              "placeholder": "<p>Your message</p>",
              "example": "<p>Your message</p>"
            }
          ],
          "outputExample": {
            "statusCode": 202,
            "body": "",
            "headers": {
              "x-message-id": "ABC123"
            }
          },
          "outputDescription": "statusCode: HTTP 202 means the message was accepted. headers[x-message-id]: SendGrid message ID for tracking in the SendGrid Activity Feed.",
          "usageExample": {
            "scenario": "Send a receipt email after a successful payment",
            "inputValues": {
              "to": "{{$json.customerEmail}}",
              "from": "receipts@yourapp.com",
              "subject": "Your receipt for order #{{$json.orderId}}",
              "html": "<h1>Thank you!</h1><p>You paid ${{$json.amount}} on {{$json.date}}.</p>"
            },
            "expectedOutput": "Email is accepted by SendGrid for delivery. Track via the x-message-id in the SendGrid Activity Feed."
          },
          "externalDocsUrl": "https://docs.sendgrid.com/api-reference/mail-send/mail-send"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved SendGrid API Key connection is missing, invalid, or lacks Mail Send permission.",
      "fix": "Reconnect SendGrid in CtrlChecks Connections, then re-run the SendGrid node."
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
