import type { NodeDoc } from '../types';

export const telegramDoc: NodeDoc = {
  "slug": "telegram",
  "displayName": "Telegram",
  "category": "Communication",
  "logoUrl": "/icons/nodes/telegram.svg",
  "description": "Send messages to Telegram chats, groups, or channels using a bot connection.",
  "credentialType": "Telegram Bot Token",
  "credentialSetupSteps": [
    "What this is: The Telegram connection lets CtrlChecks access your Telegram account safely without putting secrets in workflow fields.",
    "Where to start: Telegram -> chat with @BotFather -> /mybots -> your bot -> API Token.",
    "How to connect: In CtrlChecks, open Connections -> Add Connection -> Telegram, then sign in or paste the secret value requested there.",
    "Example: 123456789:AA....",
    "Important: Treat tokens, passwords, API keys, and client secrets like bank passwords. Store them in Connections, not in regular workflow fields.",
    "Test it: Save the connection, run a simple Telegram step, and confirm CtrlChecks can reach the account."
  ],
  "credentialDocsUrl": "https://core.telegram.org/bots/tutorial",
  "resources": [
    {
      "name": "Configuration",
      "description": "Telegram is configured directly with input fields.",
      "operations": [
        {
          "name": "Execute",
          "value": "default",
          "description": "Send a message to a Telegram chat, group, or channel via a bot.",
          "fields": [
            {
              "name": "Chat Id",
              "internalKey": "chatId",
              "type": "string",
              "required": true,
              "description": "Target chat or channel ID (numeric, can be negative for channels)",
              "helpText": "What this field is: The Telegram chat, group, or channel ID where the bot sends the message.\nWhere to find it: Send a message to the bot or group, then open https://api.telegram.org/botYOUR_TOKEN/getUpdates and look for chat.id.\nExample: 987654321 for a personal chat or -1001234567890 for a group or channel.\nTip: Add the bot to the group or channel before sending messages.",
              "placeholder": "123456789",
              "example": "123456789"
            },
            {
              "name": "Message Type",
              "internalKey": "messageType",
              "type": "string",
              "required": true,
              "description": "Telegram message type",
              "helpText": "What this field is: Telegram message type.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: text.\nTip: Use {{$json.messageType}} when this value comes from an earlier step.",
              "placeholder": "text",
              "example": "text",
              "defaultValue": "text"
            },
            {
              "name": "Message",
              "internalKey": "message",
              "type": "textarea",
              "required": true,
              "description": "Message text (required when messageType is \"text\")",
              "helpText": "What this field is: The Telegram message text.\nHow to fill it: Type the message. You can include values from earlier steps.\nExample: Alert: {{$json.serverName}} CPU is {{$json.cpuPercent}}%.\nTip: If you use formatting, choose the matching Parse Mode.",
              "placeholder": "Hello {{$json.name}}"
            },
            {
              "name": "Parse Mode",
              "internalKey": "parseMode",
              "type": "string",
              "required": false,
              "description": "Text formatting mode: none, HTML, Markdown, MarkdownV2",
              "helpText": "What this field is: Text formatting mode: none, HTML, Markdown, MarkdownV2.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: HTML.\nTip: Use {{$json.parseMode}} when this value comes from an earlier step.",
              "placeholder": "HTML",
              "example": "HTML",
              "defaultValue": "HTML"
            },
            {
              "name": "Disable Web Page Preview",
              "internalKey": "disableWebPagePreview",
              "type": "boolean",
              "required": false,
              "description": "Disable automatic link previews",
              "helpText": "What this field is: An on/off switch for Disable automatic link previews.\nHow to fill it: Turn ON to enable this option. Turn OFF to leave it disabled.\nExample: Turn ON when this workflow should use disable web page preview; turn OFF for the default behavior.",
              "placeholder": "false",
              "example": "false",
              "defaultValue": "false"
            },
            {
              "name": "Media Url",
              "internalKey": "mediaUrl",
              "type": "url",
              "required": false,
              "description": "Media URL for photo/video/document/audio/animation message types",
              "helpText": "What this field is: The web address for Media URL.\nHow to fill it: Paste the full URL, including https:// when it is an external service.\nExample: https://api.example.com.\nTip: Use {{$json.mediaUrl}} when the URL comes from an earlier step.",
              "placeholder": "https://api.example.com",
              "example": "https://api.example.com"
            },
            {
              "name": "Caption",
              "internalKey": "caption",
              "type": "string",
              "required": false,
              "description": "Caption for media messages",
              "helpText": "What this field is: Caption for media messages.\nHow to fill it: Type the value exactly as it should be sent to the service.\nExample: Caption value.\nTip: Use {{$json.caption}} when this value comes from an earlier step.",
              "placeholder": "Enter Caption"
            },
            {
              "name": "Reply To Message Id",
              "internalKey": "replyToMessageId",
              "type": "number",
              "required": false,
              "description": "Message ID to reply to",
              "helpText": "What this field is: The Message ID to reply to that tells Telegram which item to use.\nWhere to find it: Open the item in Telegram and copy the ID, name, or URL part shown by that service. You can also use the value returned by a previous step.\nExample: 123456789.\nTip: Use {{$json.replyToMessageId}} when an earlier Telegram step provides this value.",
              "placeholder": "abc123",
              "example": "abc123"
            },
            {
              "name": "Reply Markup",
              "internalKey": "replyMarkup",
              "type": "json",
              "required": false,
              "description": "Reply markup JSON (inline keyboard, reply keyboard, etc.)",
              "helpText": "What this field is: Structured data for Reply markup structured data in { } brackets.\nHow to fill it: Enter data in { } brackets for an object or [ ] brackets for a list. Use exact field names expected by Telegram.\nExample: {\"name\":\"Alice\",\"email\":\"alice@example.com\"}.\nTip: Use {{$json.replyMarkup}} when an earlier step already prepared this data.",
              "placeholder": "{\"key\":\"value\"}",
              "example": "{\"key\":\"value\"}"
            },
            {
              "name": "Disable Notification",
              "internalKey": "disableNotification",
              "type": "boolean",
              "required": false,
              "description": "Send message silently without notification",
              "helpText": "What this field is: An on/off switch for Send message silently without notification.\nHow to fill it: Turn ON to enable this option. Turn OFF to leave it disabled.\nExample: Turn ON when this workflow should use disable notification; turn OFF for the default behavior.",
              "placeholder": "false",
              "example": "false",
              "defaultValue": "false"
            },
            {
              "name": "Protect Content",
              "internalKey": "protectContent",
              "type": "textarea",
              "required": false,
              "description": "Protect content from being forwarded or saved",
              "helpText": "What this field is: Protect content from being forwarded or saved.\nHow to fill it: Type the text to send or save. You can include values from earlier workflow steps.\nExample: false.\nTip: Use {{$json.protectContent}} when this value comes from an earlier step.",
              "placeholder": "false",
              "example": "false",
              "defaultValue": "false"
            },
            {
              "name": "Allow Sending Without Reply",
              "internalKey": "allowSendingWithoutReply",
              "type": "boolean",
              "required": false,
              "description": "Allow sending even if replied-to message is missing",
              "helpText": "What this field is: An on/off switch for Allow sending even if replied-to message is missing.\nHow to fill it: Turn ON to enable this option. Turn OFF to leave it disabled.\nExample: Turn ON when this workflow should use allow sending without reply; turn OFF for the default behavior.",
              "placeholder": "false",
              "example": "false",
              "defaultValue": "false"
            }
          ],
          "outputExample": {
            "ok": true,
            "result": {
              "message_id": 101,
              "from": {
                "username": "my_bot"
              },
              "chat": {
                "id": -100123456
              },
              "text": "Alert: server CPU above 90%"
            }
          },
          "outputDescription": "ok: true if message was sent. result.message_id: Telegram message ID. result.chat.id: The chat ID the message was sent to. result.text: The message text.",
          "usageExample": {
            "scenario": "Send a server alert to a monitoring group when CPU exceeds a threshold",
            "inputValues": {
              "chatId": "-100123456",
              "text": "🚨 Alert: {{$json.serverName}} CPU is {{$json.cpuPercent}}%\nTime: {{$now}}"
            },
            "expectedOutput": "Message appears in the Telegram chat. Use `{{$json.result.message_id}}` to track or reply to the message."
          },
          "externalDocsUrl": "https://core.telegram.org/bots/api"
        }
      ]
    }
  ],
  "commonErrors": [
    {
      "error": "Authentication failed",
      "cause": "The saved credential, token, API key, or OAuth grant is missing, expired, or lacks the required scope.",
      "fix": "Reconnect the service in CtrlChecks → Connections, then re-run the Telegram node."
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
