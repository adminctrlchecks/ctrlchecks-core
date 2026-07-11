import type { NodeDoc } from '../types';

export const twilioDoc: NodeDoc = {
  "slug": "twilio",
  "displayName": "Twilio",
  "category": "Communication",
  "logoUrl": "/icons/nodes/twilio.svg",
  "description": "Send SMS messages via a Twilio account connection.",
  "credentialType": "Twilio Credential",
  "credentialSetupSteps": [
    "What this is: The Twilio connection lets CtrlChecks access your Twilio account safely without putting secrets in workflow fields.",
    "Where to start: Twilio Console -> Account -> API keys and tokens.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Twilio, then sign in or paste the secret value requested there.",
    "Example: the auth token Twilio shows.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Twilio step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://www.twilio.com/docs/usage/api",
  "resources": [
    {
      "name": "Configuration",
      "description": "Twilio is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send an SMS message via Twilio.",
          "fields": [
            {
              "name": "To",
              "internalKey": "to",
              "type": "string",
              "required": true,
              "description": "Recipient phone number",
              "helpText": "What this field is: Recipient phone number.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: +1234567890.\nTip: Use {{$json.to}} when this value comes from an earlier step.",
              "placeholder": "+1234567890",
              "example": "+1234567890"
            },
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": true,
              "description": "SMS message text",
              "helpText": "What this field is: SMS message text.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: {{$json.message}}.\nTip: Use {{$json.message}} when this value comes from an earlier step.",
              "placeholder": "{{$json.message}}",
              "example": "{{$json.message}}"
            },
            {
              "name": "From",
              "internalKey": "from",
              "type": "string",
              "required": false,
              "description": "Sender phone number. Required unless Messaging Service SID is set.",
              "helpText": "What this field is: Your Twilio phone number — the number the SMS will be sent FROM.\nWhere to find it: Log in to console.twilio.com → Phone Numbers → Manage → Active Numbers. Copy one of your Twilio numbers.\nExample: +15005550006\nNote: This must be a number you own in Twilio — you cannot use a personal number here. Use either From or Messaging Service SID.",
              "placeholder": "+1234567890",
              "example": "+1234567890"
            },
            {
              "name": "Messaging Service SID",
              "internalKey": "messagingServiceSid",
              "type": "string",
              "required": false,
              "description": "Send via a Twilio Messaging Service instead of a single From number",
              "helpText": "What this field is: The SID of a Twilio Messaging Service, used to send from a pool of numbers instead of one fixed From number.\nWhere to find it: console.twilio.com → Messaging → Services.\nExample: MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nUse either From or Messaging Service SID, not both.",
              "placeholder": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
              "example": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            },
            {
              "name": "Media URL",
              "internalKey": "mediaUrl",
              "type": "string",
              "required": false,
              "description": "Publicly accessible media URL to send as an MMS attachment",
              "helpText": "What this field is: A public URL of an image, GIF, or other media file to attach to the message (sends as MMS instead of SMS).\nExample: https://example.com/image.jpg",
              "placeholder": "https://example.com/image.jpg",
              "example": "https://example.com/image.jpg"
            }
          ],
          "outputExample": {
            "success": true,
            "sid": "SM1234abcd5678efgh",
            "status": "queued",
            "twilio": {
              "sid": "SM1234abcd5678efgh",
              "status": "queued",
              "to": "+15551234567",
              "from": "+15559876543",
              "body": "Your verification code is 4821."
            }
          },
          "outputDescription": "sid / status: Twilio message SID and delivery status (queued, sent, delivered, failed), flattened for convenience. twilio: the full raw Twilio API response.",
          "usageExample": {
            "scenario": "Send a 2FA SMS verification code to a user who is logging in",
            "inputValues": {
              "to": "{{$json.phoneNumber}}",
              "message": "Your CtrlChecks verification code is {{$json.otpCode}}. Expires in 10 minutes."
            },
            "expectedOutput": "SMS is queued. Use `{{$json.sid}}` or `{{$json.twilio.sid}}` to check delivery status via the Twilio console."
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
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Twilio node."
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
