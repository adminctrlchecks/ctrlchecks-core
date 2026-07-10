import type { NodeDoc } from '../types';

export const discordWebhookDoc: NodeDoc = {
  "slug": "discord_webhook",
  "displayName": "Discord Webhook",
  "category": "Communication",
  "logoUrl": "/integrations-logos/Discord.svg",
  "description": "Send messages to a Discord channel via an incoming webhook URL",
  "credentialType": "Discord Webhook URL",
  "credentialSetupSteps": [
    "What this is: The Discord Webhook connection lets CtrlChecks access your Discord Webhook account safely without putting secrets in workflow fields.",
    "Where to start: Discord Webhook account settings or developer settings.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Discord Webhook, then sign in or paste the secret value requested there.",
    "Example: the token format shown by Discord Webhook.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Discord Webhook step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://discord.com/developers/docs/getting-started",
  "resources": [
    {
      "name": "Configuration",
      "description": "Discord Webhook uses a saved webhook URL connection plus message fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send a message to a Discord channel using a Webhook URL — no bot required.",
          "fields": [
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": true,
              "description": "Message text",
              "helpText": "What this field is: Message text.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: {{$json.message}}.\nTip: Use {{$json.message}} when this value comes from an earlier step.",
              "placeholder": "{{$json.message}}",
              "example": "{{$json.message}}"
            }
          ],
          "outputExample": {
            "success": true,
            "status": 204
          },
          "outputDescription": "success: true if the message was accepted. status: HTTP 204 means Discord accepted the webhook payload.",
          "usageExample": {
            "scenario": "Post GitHub commit notifications to a Discord channel",
            "inputValues": {
              "message": "📦 New commit by {{$json.author}}: {{$json.message}}\n{{$json.url}}"
            },
            "expectedOutput": "Message appears in the Discord channel. No bot setup required — just the webhook URL."
          },
          "externalDocsUrl": "https://discord.com/developers/docs/resources/webhook"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Discord Webhook node."
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
