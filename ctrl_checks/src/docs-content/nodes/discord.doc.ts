import type { NodeDoc } from '../types';

export const discordDoc: NodeDoc = {
  "slug": "discord",
  "displayName": "Discord",
  "category": "Communication",
  "logoUrl": "/integrations-logos/Discord.svg",
  "description": "Send messages to Discord channels via a Discord bot token",
  "credentialType": "Discord Bot Token",
  "credentialSetupSteps": [
    "What this is: The Discord connection lets CtrlChecks access your Discord account safely without putting secrets in workflow fields.",
    "Where to start: Discord account settings or developer settings.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Discord, then sign in or paste the secret value requested there.",
    "Example: the token format shown by Discord.",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Discord step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://discord.com/developers/docs/getting-started",
  "resources": [
    {
      "name": "Configuration",
      "description": "Discord is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send a message to a Discord channel via a bot.",
          "fields": [
            {
              "name": "Channel Id",
              "internalKey": "channelId",
              "type": "string",
              "required": true,
              "description": "Discord channel ID where the bot should post the message",
              "helpText": "What this field is: The unique ID of the Discord channel where the message will be posted.\nWhere to find it:\n  Step 1: Open Discord → User Settings (gear icon at bottom left) → Advanced → turn on \"Developer Mode\".\n  Step 2: Right-click the channel name → Copy ID.\nThe ID is a 17–19 digit number.\nExample: 1234567890123456789",
              "placeholder": "123456789012345678",
              "example": "123456789012345678"
            },
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": true,
              "description": "Message text to send",
              "helpText": "What this field is: Message text to send.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: Hello from workflow!.\nTip: Use {{$json.message}} when this value comes from an earlier step.",
              "placeholder": "Hello from workflow!",
              "example": "Hello from workflow!"
            }
          ],
          "outputExample": {
            "id": "1234567890123456789",
            "channelId": "9876543210987654321",
            "content": "Build #42 passed ✅",
            "timestamp": "2025-01-15T11:00:00.000000+00:00"
          },
          "outputDescription": "id: Discord message ID. channelId: The channel it was sent to. content: The message text. timestamp: When the message was sent.",
          "usageExample": {
            "scenario": "Post CI/CD build status to a #ci-notifications Discord channel",
            "inputValues": {
              "channelId": "{{$env.DISCORD_CI_CHANNEL_ID}}",
              "message": "{{$json.status === \"pass\" ? \"✅\" : \"❌\"}} Build #{{$json.buildNumber}} — {{$json.status}}"
            },
            "expectedOutput": "Message appears in the Discord channel. Use `{{$json.id}}` to track or edit the message."
          },
          "externalDocsUrl": "https://discord.com/developers/docs/intro"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Discord node."
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
