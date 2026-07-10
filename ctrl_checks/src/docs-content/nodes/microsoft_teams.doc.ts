import type { NodeDoc } from '../types';

export const microsoftTeamsDoc: NodeDoc = {
  "slug": "microsoft_teams",
  "displayName": "Microsoft Teams",
  "category": "Communication",
  "logoUrl": "/integrations-logos/Microsoft-Teams.svg",
  "description": "Send messages to Microsoft Teams through an incoming webhook URL.",
  "credentialType": "Incoming Webhook URL",
  "credentialSetupSteps": [
    "What this is: The Microsoft Teams node sends directly to an Incoming Webhook URL for one Teams channel.",
    "Where to start: Open Microsoft Teams, choose the target channel, then open channel integrations or connectors.",
    "How to configure: Create or select Incoming Webhook, copy the webhook URL, and paste it into the node's Webhook URL field.",
    "Important: This node does not use Microsoft OAuth or Microsoft Graph team/channel IDs.",
    "Test it: Run a simple workflow with a short message and confirm it appears in the configured Teams channel."
  ],
  "credentialDocsUrl": "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using",
  "resources": [
    {
      "name": "Configuration",
      "description": "Microsoft Teams is configured with the webhook URL and message text.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send a message to a Microsoft Teams channel through an incoming webhook URL.",
          "fields": [
            {
              "name": "Webhook Url",
              "internalKey": "webhookUrl",
              "type": "url",
              "required": true,
              "description": "Teams incoming webhook URL",
              "helpText": "What this field is: The Incoming Webhook URL for the Microsoft Teams channel you want to post to.\nWhere to find it: In Teams, open the target channel integrations/connectors, create or select Incoming Webhook, then copy the URL.\nExample: https://outlook.office.com/webhook/xxx.../IncomingWebhook/...",
              "placeholder": "https://outlook.office.com/webhook/...",
              "example": "https://outlook.office.com/webhook/..."
            },
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": true,
              "description": "Message text",
              "helpText": "What this field is: The text sent to the Teams channel through the webhook.\nHow to fill it: Type the message or map text from an earlier workflow step.\nExample: {{$json.message}}.",
              "placeholder": "{{$json.message}}",
              "example": "{{$json.message}}"
            }
          ],
          "outputExample": {
            "success": true,
            "teams": {
              "status": 200,
              "response": "1"
            }
          },
          "outputDescription": "success: True when Teams accepted the webhook request. teams.status: HTTP status returned by Teams. teams.response: Raw Teams webhook response text.",
          "usageExample": {
            "scenario": "Post a sprint completion summary to a Teams channel",
            "inputValues": {
              "webhookUrl": "{{$env.TEAMS_WEBHOOK_URL}}",
              "message": "Sprint {{$json.sprintName}} completed!\n\nDelivered: {{$json.storiesCompleted}} stories\nVelocity: {{$json.velocity}} points"
            },
            "expectedOutput": "The message is posted in Teams and the node returns the webhook HTTP status."
          },
          "externalDocsUrl": "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Teams: webhookUrl and message are required",
      "cause": "The webhook URL or message field is empty, or an expression resolved to an empty value.",
      "fix": "Fill Webhook URL and Message, then verify any mapped upstream value is present."
    },
    {
      "error": "Teams webhook failed",
      "cause": "Microsoft Teams rejected the incoming webhook request or the URL is invalid.",
      "fix": "Create a fresh Incoming Webhook URL for the target channel and paste the complete URL into the node."
    },
    {
      "error": "Teams error",
      "cause": "The request could not be sent to the webhook URL.",
      "fix": "Check the webhook URL, network access, and that the Teams webhook connector is still enabled."
    }
  ],
  "relatedNodes": []
};
