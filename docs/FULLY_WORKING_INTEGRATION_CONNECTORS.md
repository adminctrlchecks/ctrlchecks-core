# Fully Functional Node Status (Client Share Version)

This documentation includes only node types that currently have implemented execution paths in `worker/src/api/execute-workflow.ts` and are registered through the unified runtime (`UnifiedNodeRegistry` + dynamic execution).

- Fully functional node types: **98**
- Explicitly excluded (marked not implemented in executor): **html, oauth2_auth, xml, youtube**

---
# Documentation 1: Fully Working Integrations and Connectors

This list covers only third-party integration/connectors that are currently fully executable in backend.

| Node Type | Integration Family | Library Category | Config Readiness (required fields) | Backend Execution Status |
|---|---|---|---|---|
| `airtable` | Airtable | `database` | `baseId`, `tableId`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `api_key_auth` | Platform/Internal | `auth` | `apiKeyName` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `aws_s3` | AWS S3 | `file` | `operation`, `bucket` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `database_read` | Platform/Internal | `database` | `query` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `discord` | Discord | `output` | `channelId`, `message` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `discord_webhook` | Discord | `output` | `webhookUrl`, `message` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `dropbox` | Dropbox | `file` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `email` | SMTP/Email | `output` | `to`, `subject`, `text` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `freshdesk` | Platform/Internal | `crm` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `github` | GitHub | `devops` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `gitlab` | GitLab | `devops` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `google_calendar` | Google | `google` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `google_doc` | Google | `google` | `documentId`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `google_gemini` | Google | `ai` | `model`, `prompt`, `apiKey` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `google_gmail` | Google | `google` | None | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `google_sheets` | Google | `google` | `spreadsheetId`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `graphql` | GraphQL API | `http_api` | `url`, `query` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `http_post` | HTTP API | `http_api` | `url`, `body` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `http_request` | HTTP API | `http_api` | `url` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `hubspot` | HubSpot | `crm` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `instagram` | Instagram | `social` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `jira` | Jira | `devops` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `linkedin` | LinkedIn | `social` | None | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `microsoft_teams` | Microsoft Teams | `output` | `webhookUrl`, `message` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `mongodb` | MongoDB | `database` | `operation`, `collection` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `notion` | Notion | `productivity` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `onedrive` | OneDrive | `file` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `outlook` | Microsoft Outlook | `microsoft` | None | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `paypal` | PayPal | `ecommerce` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `pipedrive` | Pipedrive | `crm` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `read_binary_file` | Platform/Internal | `file` | `filePath` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `redis` | Redis | `database` | `operation`, `key` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `shopify` | Shopify | `ecommerce` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `slack_message` | Slack | `output` | `webhookUrl` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `slack_webhook` | Slack | `output` | `webhookUrl`, `message` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `stripe` | Stripe | `ecommerce` | `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `telegram` | Telegram | `output` | `chatId`, `messageType` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `twilio` | Twilio | `output` | `to`, `message` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `twitter` | Twitter/X | `social` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `webhook_response` | Platform/Internal | `http_api` | `responseCode` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `whatsapp` | WhatsApp | `communication` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `woocommerce` | WooCommerce | `ecommerce` | `resource`, `operation` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |
| `write_binary_file` | Platform/Internal | `file` | `filePath`, `data` | Complete (dynamic executor -> unified registry -> legacy execution case implemented) |

## Notes
- All above connectors are executable through the unified runtime path.
- Connector credential validation is schema-driven via node definitions.
- Nodes intentionally excluded from this document are those marked as not implemented in backend executor.
