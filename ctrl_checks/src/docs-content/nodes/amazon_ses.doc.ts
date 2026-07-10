import type { NodeDoc } from '../types';

export const amazonSesDoc: NodeDoc = {
  "slug": "amazon_ses",
  "displayName": "Amazon SES",
  "category": "Communication",
  "logoUrl": "/integrations-logos/Amazon-SES.svg",
  "description": "Send emails through Amazon Simple Email Service (SES)",
  "credentialType": "Amazon SES Access Key",
  "credentialSetupSteps": [
    "What this is: The Amazon SES connection lets CtrlChecks access your Amazon SES account safely without putting secrets in workflow fields.",
    "Where to start: AWS IAM -> Users or Roles -> Security credentials, then verify sender identities in Amazon SES.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Amazon SES Access Key, then paste the Access Key ID, Secret Access Key, and SES region.",
    "Example: Access key ID plus secret access key plus us-east-1.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Amazon SES step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://docs.aws.amazon.com/ses/latest/dg/security-iam.html",
  "resources": [
    {
      "name": "Configuration",
      "description": "Amazon SES is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send an email via Amazon Simple Email Service (SES).",
          "fields": [
            {
              "name": "Recipients",
              "internalKey": "recipients",
              "type": "json",
              "required": true,
              "description": "Email recipients (To, Cc, Bcc)",
              "helpText": "What this field is: Structured data for Email recipients.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Amazon SES.\nExample: {\"to\":[\"user@example.com\"]}.\nTip: Use {{$json.recipients}} when an earlier step already prepared this data.",
              "placeholder": "{\"to\":[\"user@example.com\"]}",
              "example": "{\"to\":[\"user@example.com\"]}"
            },
            {
              "name": "Subject",
              "internalKey": "subject",
              "type": "string",
              "required": false,
              "description": "Email subject line (required when not using an AWS SES template)",
              "helpText": "What this field is: Email subject line for raw SES emails.\nHow to fill it: Type the value exactly as it should be sent to the service when Use Template is false.\nExample: Order Confirmation.\nTip: Use {{$json.subject}} when this value comes from an earlier step.",
              "placeholder": "Order Confirmation",
              "example": "Order Confirmation"
            },
            {
              "name": "Body",
              "internalKey": "body",
              "type": "textarea",
              "required": false,
              "description": "Email body content for raw SES emails",
              "helpText": "What this field is: Email body for raw SES emails. CtrlChecks sends this value as both HTML and text.\nHow to fill it: Type the value exactly as it should be sent when Use Template is false.\nExample: Hello {{$json.name}}, your order is confirmed.\nTip: Use {{$json.body}} when an earlier step already prepared this data.",
              "placeholder": "Hello {{$json.name}}, your order is confirmed.",
              "example": "Hello {{$json.name}}, your order is confirmed."
            },
            {
              "name": "Use Template",
              "internalKey": "useTemplate",
              "type": "textarea",
              "required": false,
              "description": "Use AWS SES template instead of raw email",
              "helpText": "What this field is: Use AWS SES template instead of raw email.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: false.\nTip: Use {{$json.useTemplate}} when this value comes from an earlier step.",
              "placeholder": "false",
              "example": "false",
              "defaultValue": "false"
            },
            {
              "name": "Template Name",
              "internalKey": "templateName",
              "type": "textarea",
              "required": false,
              "description": "AWS SES template name (required if useTemplate is true)",
              "helpText": "What this field is: The name of an AWS SES email template to use (only required when Use Template is true).\nWhere to find it: AWS Console → SES → Email templates. The template name is shown in the list.\nExample: OrderConfirmationV2 or WelcomeEmail\nCreate templates with the AWS CLI: aws ses create-template --cli-input-json file://template.json",
              "placeholder": "OrderConfirmation",
              "example": "OrderConfirmation"
            },
            {
              "name": "Template Data",
              "internalKey": "templateData",
              "type": "textarea",
              "required": false,
              "description": "Template variables as JSON object",
              "helpText": "What this field is: Structured data for Template variables as structured data in { } brackets object.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Amazon SES.\nExample: {\"name\":\"John\",\"orderId\":\"12345\"}.\nTip: Use {{$json.templateData}} when an earlier step already prepared this data.",
              "placeholder": "{\"name\":\"John\",\"orderId\":\"12345\"}",
              "example": "{\"name\":\"John\",\"orderId\":\"12345\"}"
            },
            {
              "name": "From Address",
              "internalKey": "fromAddress",
              "type": "string",
              "required": true,
              "description": "Sender email address (must be verified in SES)",
              "helpText": "What this field is: Sender email address.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: noreply@example.com.\nTip: Use {{$json.fromAddress}} when this value comes from an earlier step.",
              "placeholder": "noreply@example.com",
              "example": "noreply@example.com"
            },
            {
              "name": "Reply To Addresses",
              "internalKey": "replyToAddresses",
              "type": "json",
              "required": false,
              "description": "Reply-to email addresses",
              "helpText": "What this field is: Structured data for Reply-to email addresses.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Amazon SES.\nExample: [\"support@example.com\"].\nTip: Use {{$json.replyToAddresses}} when an earlier step already prepared this data.",
              "placeholder": "[\"support@example.com\"]",
              "example": "[\"support@example.com\"]"
            },
            {
              "name": "Attachments",
              "internalKey": "attachments",
              "type": "json",
              "required": false,
              "description": "Email attachments",
              "helpText": "What this field is: Structured data for Email attachments.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Amazon SES.\nExample: [{\"filename\":\"report.pdf\",\"content\":\"{{$json.pdfContent}}\",\"contentType\":\"application/pdf\"}].\nTip: Use {{$json.attachments}} when an earlier step already prepared this data.",
              "placeholder": "[{\"filename\":\"report.pdf\",\"content\":\"{{$json.pdfContent}}\",\"contentType\":\"application/pdf\"}]",
              "example": "[{\"filename\":\"report.pdf\",\"content\":\"{{$json.pdfContent}}\",\"contentType\":\"application/pdf\"}]"
            },
            {
              "name": "Aws Region",
              "internalKey": "awsRegion",
              "type": "string",
              "required": false,
              "description": "AWS region for SES service",
              "helpText": "What this field is: AWS region for SES service.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: us-east-1.\nTip: Use {{$json.awsRegion}} when this value comes from an earlier step.",
              "placeholder": "us-east-1",
              "example": "us-east-1",
              "defaultValue": "us-east-1"
            },
            {
              "name": "Configuration Set Name",
              "internalKey": "configurationSetName",
              "type": "string",
              "required": false,
              "description": "SES configuration set for tracking",
              "helpText": "What this field is: SES configuration set for tracking.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: my-config-set.\nTip: Use {{$json.configurationSetName}} when this value comes from an earlier step.",
              "placeholder": "my-config-set",
              "example": "my-config-set"
            },
            {
              "name": "Tags",
              "internalKey": "tags",
              "type": "json",
              "required": false,
              "description": "Email tags for tracking and filtering",
              "helpText": "What this field is: Structured data for Email tags for tracking and filtering.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Amazon SES.\nExample: {\"campaign\":\"newsletter\",\"type\":\"promotional\"}.\nTip: Use {{$json.tags}} when an earlier step already prepared this data.",
              "placeholder": "{\"campaign\":\"newsletter\",\"type\":\"promotional\"}",
              "example": "{\"campaign\":\"newsletter\",\"type\":\"promotional\"}"
            },
            {
              "name": "Return Path",
              "internalKey": "returnPath",
              "type": "string",
              "required": false,
              "description": "Bounce handling email address",
              "helpText": "What this field is: Bounce handling email address.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: bounces@example.com.\nTip: Use {{$json.returnPath}} when this value comes from an earlier step.",
              "placeholder": "bounces@example.com",
              "example": "bounces@example.com"
            }
          ],
          "outputExample": {
            "MessageId": "0102018e2b3c7abc-def1234-...",
            "ResponseMetadata": {
              "RequestId": "abc-123",
              "HTTPStatusCode": 200
            }
          },
          "outputDescription": "MessageId: The SES message ID for tracking. ResponseMetadata.HTTPStatusCode: 200 means success.",
          "usageExample": {
            "scenario": "Send bulk email notifications to a list of subscribers",
            "inputValues": {
              "to": "{{$json.email}}",
              "from": "notifications@yourapp.com",
              "subject": "{{$json.subject}}",
              "body": "{{$json.bodyText}}"
            },
            "expectedOutput": "Email is sent via SES. Use `{{$json.MessageId}}` to track in the SES console."
          },
          "externalDocsUrl": "https://docs.aws.amazon.com/ses/latest/APIReference/Welcome.html"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Amazon SES node."
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
