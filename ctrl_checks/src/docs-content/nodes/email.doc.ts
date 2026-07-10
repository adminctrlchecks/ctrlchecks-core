import type { NodeDoc } from '../types';

export const emailDoc: NodeDoc = {
  "slug": "email",
  "displayName": "Send Email (SMTP)",
  "category": "Communication",
  "logoUrl": "/icons/nodes/email.svg",
  "description": "Send emails through your own SMTP server or mail relay",
  "credentialType": "SMTP Account",
  "credentialSetupSteps": [
    "What this is: The SMTP Account connection stores your mail server's host, port, username, and password so workflows can send email without putting secrets in workflow fields.",
    "Where to start: Your email provider's SMTP settings page — e.g. Gmail: smtp.gmail.com port 587; Outlook: smtp-mail.outlook.com port 587; custom domains often use mail.yourdomain.com.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> SMTP Account, then enter the host, port, your full email address as username, and the password.",
    "Important: Gmail and Outlook personal accounts reject normal login passwords over SMTP — create an app password in the account's security settings and use that instead.",
    "Important: Treat SMTP passwords like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Send Email (SMTP) step to your own address, and confirm the message arrives."
  ],
  "credentialDocsUrl": "https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol",
  "resources": [
    {
      "name": "Configuration",
      "description": "Email is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send an email via SMTP using custom server credentials.",
          "fields": [
            {
              "name": "To",
              "internalKey": "to",
              "type": "string",
              "required": true,
              "description": "Recipient email address",
              "helpText": "What this field is: Recipient email address.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: alice@example.com.\nTip: Use {{$json.to}} when this value comes from an earlier step.",
              "placeholder": "alice@example.com"
            },
            {
              "name": "Subject",
              "internalKey": "subject",
              "type": "string",
              "required": true,
              "description": "Email subject",
              "helpText": "What this field is: Email subject.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Welcome, {{$json.name}}.\nTip: Use {{$json.subject}} when this value comes from an earlier step.",
              "placeholder": "Welcome, {{$json.name}}"
            },
            {
              "name": "Text",
              "internalKey": "text",
              "type": "textarea",
              "required": true,
              "description": "Email body (text)",
              "helpText": "What this field is: Email body.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Hello {{$json.name}}.\nTip: Use {{$json.text}} when this value comes from an earlier step.",
              "placeholder": "Hello {{$json.name}}"
            },
            {
              "name": "Html",
              "internalKey": "html",
              "type": "textarea",
              "required": false,
              "description": "Email body (HTML)",
              "helpText": "What this field is: Email body.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Html value.\nTip: Use {{$json.html}} when this value comes from an earlier step.",
              "placeholder": "Enter Html"
            },
            {
              "name": "From",
              "internalKey": "from",
              "type": "string",
              "required": false,
              "description": "Sender email address (defaults to the SMTP username from the connection)",
              "helpText": "What this field is: The address the email is sent from.\nHow to fill it: Leave blank to send from the SMTP username, or enter another address your mail server allows.\nExample: noreply@example.com.",
              "placeholder": "noreply@example.com"
            }
          ],
          "outputExample": {
            "success": true,
            "messageId": "<abc@smtp.example.com>",
            "accepted": [
              "recipient@example.com"
            ],
            "rejected": []
          },
          "outputDescription": "success: Whether the SMTP server accepted the message. messageId: The SMTP message ID. accepted: Addresses that accepted the message. rejected: Addresses rejected by the server.",
          "usageExample": {
            "scenario": "Send transactional emails via your own SMTP server (e.g. a company mail relay)",
            "inputValues": {
              "to": "{{$json.email}}",
              "subject": "Password Reset",
              "html": "<p>Click <a href=\"{{$json.resetLink}}\">here</a> to reset your password.</p>"
            },
            "expectedOutput": "Email is delivered. Check `accepted` to confirm delivery was accepted by the server."
          },
          "externalDocsUrl": "https://docs.ctrlchecks.com"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Email node."
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
