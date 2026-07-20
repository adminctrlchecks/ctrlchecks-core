# Fully Functional Node Status (Client Share Version)

This documentation includes only node types that currently have implemented execution paths in `worker/src/api/execute-workflow.ts` and are registered through the unified runtime (`UnifiedNodeRegistry` + dynamic execution).

- Fully functional node types: **98**
- Explicitly excluded (marked not implemented in executor): **html, oauth2_auth, xml, youtube**

---
# Documentation 2: Fully Functional Nodes by Category

This includes all fully functional node types (triggers, logic, AI, transformations, utilities, and connectors).

## actions

| Node Type | Required Config | Execution Status |
|---|---|---|
| `clickup` | `operation` | Complete |

## ai

| Node Type | Required Config | Execution Status |
|---|---|---|
| `ai_agent` | None | Complete |
| `ai_chat_model` | `prompt` | Complete |
| `chat_model` | None | Complete |
| `google_gemini` | `model`, `prompt`, `apiKey` | Complete |
| `memory` | None | Complete |
| `ollama` | `prompt` | Complete |
| `openai_gpt` | `model`, `messages`, `apiKey` | Complete |
| `sentiment_analyzer` | `text` | Complete |
| `text_summarizer` | `text` | Complete |
| `tool` | `toolName` | Complete |

## auth

| Node Type | Required Config | Execution Status |
|---|---|---|
| `api_key_auth` | `apiKeyName` | Complete |

## cache

| Node Type | Required Config | Execution Status |
|---|---|---|
| `cache_get` | `key` | Complete |
| `cache_set` | `key`, `value` | Complete |

## communication

| Node Type | Required Config | Execution Status |
|---|---|---|
| `whatsapp` | `resource`, `operation` | Complete |

## crm

| Node Type | Required Config | Execution Status |
|---|---|---|
| `freshdesk` | `resource`, `operation` | Complete |
| `hubspot` | `resource`, `operation` | Complete |
| `pipedrive` | `resource`, `operation` | Complete |

## data

| Node Type | Required Config | Execution Status |
|---|---|---|
| `aggregate` | `operation` | Complete |
| `csv` | `operation` | Complete |
| `date_time` | `operation` | Complete |
| `edit_fields` | None | Complete |
| `javascript` | `code` | Complete |
| `json_parser` | `json` | Complete |
| `limit` | `limit` | Complete |
| `math` | `operation` | Complete |
| `merge_data` | `mode` | Complete |
| `rename_keys` | `mappings` | Complete |
| `set` | `fields` | Complete |
| `set_variable` | `name` | Complete |
| `sort` | None | Complete |
| `text_formatter` | `template` | Complete |

## database

| Node Type | Required Config | Execution Status |
|---|---|---|
| `airtable` | `baseId`, `tableId`, `operation` | Complete |
| `database_read` | `query` | Complete |
| `mongodb` | `operation`, `collection` | Complete |
| `redis` | `operation`, `key` | Complete |

## devops

| Node Type | Required Config | Execution Status |
|---|---|---|
| `github` | `operation` | Complete |
| `gitlab` | `operation` | Complete |
| `jira` | `operation` | Complete |

## ecommerce

| Node Type | Required Config | Execution Status |
|---|---|---|
| `paypal` | `operation` | Complete |
| `shopify` | `resource`, `operation` | Complete |
| `stripe` | `operation` | Complete |
| `woocommerce` | `resource`, `operation` | Complete |

## file

| Node Type | Required Config | Execution Status |
|---|---|---|
| `aws_s3` | `operation`, `bucket` | Complete |
| `dropbox` | `operation` | Complete |
| `onedrive` | `operation` | Complete |
| `read_binary_file` | `filePath` | Complete |
| `write_binary_file` | `filePath`, `data` | Complete |

## flow

| Node Type | Required Config | Execution Status |
|---|---|---|
| `parallel` | None | Complete |
| `retry` | `maxAttempts` | Complete |
| `return` | None | Complete |
| `timeout` | `limit` | Complete |
| `try_catch` | None | Complete |

## google

| Node Type | Required Config | Execution Status |
|---|---|---|
| `google_calendar` | `resource`, `operation` | Complete |
| `google_doc` | `documentId`, `operation` | Complete |
| `google_gmail` | None | Complete |
| `google_sheets` | `spreadsheetId`, `operation` | Complete |

## http_api

| Node Type | Required Config | Execution Status |
|---|---|---|
| `graphql` | `url`, `query` | Complete |
| `http_post` | `url`, `body` | Complete |
| `http_request` | `url` | Complete |
| `webhook_response` | `responseCode` | Complete |

## logic

| Node Type | Required Config | Execution Status |
|---|---|---|
| `error_handler` | None | Complete |
| `filter` | `condition` | Complete |
| `function` | `description` | Complete |
| `function_item` | `description` | Complete |
| `if_else` | `conditions` | Complete |
| `loop` | `items` | Complete |
| `merge` | `mode` | Complete |
| `noop` | None | Complete |
| `split_in_batches` | `batchSize` | Complete |
| `stop_and_error` | `errorMessage` | Complete |
| `switch` | `expression`, `cases` | Complete |
| `wait` | `duration` | Complete |

## microsoft

| Node Type | Required Config | Execution Status |
|---|---|---|
| `outlook` | None | Complete |

## output

| Node Type | Required Config | Execution Status |
|---|---|---|
| `discord` | `channelId`, `message` | Complete |
| `discord_webhook` | `webhookUrl`, `message` | Complete |
| `email` | `to`, `subject`, `text` | Complete |
| `microsoft_teams` | `webhookUrl`, `message` | Complete |
| `slack_message` | `webhookUrl` | Complete |
| `slack_webhook` | `webhookUrl`, `message` | Complete |
| `telegram` | `chatId`, `messageType` | Complete |
| `twilio` | `to`, `message` | Complete |

## productivity

| Node Type | Required Config | Execution Status |
|---|---|---|
| `notion` | `resource`, `operation` | Complete |

## queue

| Node Type | Required Config | Execution Status |
|---|---|---|
| `queue_consume` | `queueName` | Complete |
| `queue_push` | `queueName`, `message` | Complete |

## social

| Node Type | Required Config | Execution Status |
|---|---|---|
| `instagram` | `resource`, `operation` | Complete |
| `linkedin` | None | Complete |
| `twitter` | `resource`, `operation` | Complete |

## triggers

| Node Type | Required Config | Execution Status |
|---|---|---|
| `chat_trigger` | None | Complete |
| `error_trigger` | None | Complete |
| `form` | `formTitle`, `fields` | Complete |
| `interval` | `interval`, `unit` | Complete |
| `manual_trigger` | None | Complete |
| `schedule` | `cron` | Complete |
| `webhook` | `path` | Complete |
| `workflow_trigger` | None | Complete |

## utility

| Node Type | Required Config | Execution Status |
|---|---|---|
| `delay` | `duration` | Complete |

## workflow

| Node Type | Required Config | Execution Status |
|---|---|---|
| `execute_workflow` | `workflowId` | Complete |
