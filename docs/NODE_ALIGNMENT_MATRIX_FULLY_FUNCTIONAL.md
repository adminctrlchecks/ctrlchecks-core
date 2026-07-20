# Fully Functional Node Status (Client Share Version)

This documentation includes only node types that currently have implemented execution paths in `worker/src/api/execute-workflow.ts` and are registered through the unified runtime (`UnifiedNodeRegistry` + dynamic execution).

- Fully functional node types: **98**
- Explicitly excluded (marked not implemented in executor): **html, oauth2_auth, xml, youtube**

---
# Documentation 3: Node Alignment Matrix (Node Name + Classification + Backend + Connector)

Client-ready alignment view for currently complete node types.

| Node Type | Classification | Connector/App | Backend Operational Alignment | Runtime Path |
|---|---|---|---|---|
| `aggregate` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `ai_agent` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `ai_chat_model` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `airtable` | `database` | Airtable | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `api_key_auth` | `auth` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `aws_s3` | `file` | AWS S3 | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `cache_get` | `cache` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `cache_set` | `cache` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `chat_model` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `chat_trigger` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `clickup` | `actions` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `csv` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `database_read` | `database` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `date_time` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `delay` | `utility` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `discord` | `output` | Discord | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `discord_webhook` | `output` | Discord | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `dropbox` | `file` | Dropbox | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `edit_fields` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `email` | `output` | SMTP/Email | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `error_handler` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `error_trigger` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `execute_workflow` | `workflow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `filter` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `form` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `freshdesk` | `crm` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `function` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `function_item` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `github` | `devops` | GitHub | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `gitlab` | `devops` | GitLab | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `google_calendar` | `google` | Google | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `google_doc` | `google` | Google | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `google_gemini` | `ai` | Google | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `google_gmail` | `google` | Google | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `google_sheets` | `google` | Google | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `graphql` | `http_api` | GraphQL API | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `http_post` | `http_api` | HTTP API | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `http_request` | `http_api` | HTTP API | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `hubspot` | `crm` | HubSpot | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `if_else` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `instagram` | `social` | Instagram | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `interval` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `javascript` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `jira` | `devops` | Jira | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `json_parser` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `limit` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `linkedin` | `social` | LinkedIn | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `loop` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `manual_trigger` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `math` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `memory` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `merge` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `merge_data` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `microsoft_teams` | `output` | Microsoft Teams | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `mongodb` | `database` | MongoDB | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `noop` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `notion` | `productivity` | Notion | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `ollama` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `onedrive` | `file` | OneDrive | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `openai_gpt` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `outlook` | `microsoft` | Microsoft Outlook | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `parallel` | `flow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `paypal` | `ecommerce` | PayPal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `pipedrive` | `crm` | Pipedrive | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `queue_consume` | `queue` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `queue_push` | `queue` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `read_binary_file` | `file` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `redis` | `database` | Redis | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `rename_keys` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `retry` | `flow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `return` | `flow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `schedule` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `sentiment_analyzer` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `set` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `set_variable` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `shopify` | `ecommerce` | Shopify | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `slack_message` | `output` | Slack | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `slack_webhook` | `output` | Slack | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `sort` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `split_in_batches` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `stop_and_error` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `stripe` | `ecommerce` | Stripe | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `switch` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `telegram` | `output` | Telegram | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `text_formatter` | `data` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `text_summarizer` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `timeout` | `flow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `tool` | `ai` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `try_catch` | `flow` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `twilio` | `output` | Twilio | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `twitter` | `social` | Twitter/X | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `wait` | `logic` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `webhook` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `webhook_response` | `http_api` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `whatsapp` | `communication` | WhatsApp | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `woocommerce` | `ecommerce` | WooCommerce | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `workflow_trigger` | `triggers` | No (internal/platform node) | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |
| `write_binary_file` | `file` | Platform/Internal | Complete | UnifiedNodeRegistry -> DynamicNodeExecutor -> execute-workflow case |

## Completion Rule Applied
- Included only if node case exists in executor and is not labeled as not implemented.
- Excluded: `html`, `oauth2_auth`, `xml`, `youtube`.
