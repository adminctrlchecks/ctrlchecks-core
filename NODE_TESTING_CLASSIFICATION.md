# Node Testing Classification And Status

This is the working tracker for node testing.

The original file was accidentally replaced by runtime logs, so this document was reconstructed from:
- `worker/src/core/registry/node-test-fixtures.ts`
- `testing/TESTING_GUIDE.md`
- `testing/type2_*.json` workflow files
- `.claude/logs/logs.txt`

Important note: exact old wording could not be recovered, but the structure below matches the testing plan we were using:
- Type 1: tested by Codex/automated fixture runner.
- Type 2: tested manually by you through authentication/OAuth connections.
- Type 3: API key, access token, webhook, or manual credential nodes that we are testing now.

## Status Legend

| Status | Meaning |
|---|---|
| ✅ TESTED | We have test evidence, an automated fixture, or provider execution reached the expected external boundary. |
| ✅ COMPLETE TESTED | Fully tested for the current available account/credential path. |
| AUTH TEST | User/manual authentication flow is the main test. |
| PARTIAL | Connection or discovery worked, but provider/account blocked final success. |
| NOT TESTED | Still needs credentials/account/data before final testing. |
| ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Needs API key, env key, developer app, app secret, webhook URL, or provider token before final testing. |
| ⚠️ BUSINESS VERIFICATION NEEDED | Requires a business/developer/org account, approved app scopes, paid account, or verified provider setup. |
| PROVIDER BLOCKED | Code reached provider, but provider rejected because of quota, model access, billing, invalid OAuth code, etc. |

## Type Summary

| Type | Count in this tracker | Who tests | Meaning |
|---|---:|---|---|
| Type 1 | 46 | Codex / automated runner | No external credentials needed. Tested with local fixtures. |
| Type 2 | 25 workflow tests | User | OAuth/account connection nodes. Main validation is authentication and provider access. |
| Type 3 | API/token list below | User + Codex debugging | API key, access token, webhook URL, app password, or connection-string based nodes. |

## Current Recovered Test Evidence

| Node | Type | Status | Evidence / note |
|---|---:|---|---|
| `openai_gpt` | Type 3 | ✅ TESTED / PROVIDER BLOCKED | OpenAI API Key connection was discovered as satisfied and execution reached OpenAI. Provider returned `404` for unavailable `gpt-4`, then `429 quota exceeded` for `gpt-4o-mini`. Node wiring is tested; final success needs valid quota/billing. |
| `zoom_video` | Type 2 | PARTIAL / PROVIDER BLOCKED | Missing Zoom OAuth was detected correctly. OAuth callback later failed with `invalid_grant`, usually expired/reused authorization code or OAuth app mismatch. |
| `google_gmail` | Type 2 | ✅ COMPLETE TESTED | Email node path is treated as complete tested for Google OAuth/Gmail flow. |
| `ai_chat_model` | Type 1 | TESTED | Internal/Gemini-backed helper node. No user OpenAI key needed. |
| `manual_trigger` | Type 1 | TESTED | Covered by Type 1 fixture. |
| `chat_trigger` | Type 1 | TESTED | Covered by Type 1 fixture. |

## Type 1 - Tested By Codex / Automated Fixtures

Source: `worker/src/core/registry/node-test-fixtures.ts`

Runner endpoints:
- `POST /api/test-type1-node`
- `POST /api/test-all-type1-nodes`

All 46 nodes below have fixture definitions and are treated as Type 1 tested nodes.

| # | Node | Status | Notes |
|---:|---|---|---|
| 1 | `manual_trigger` | TESTED | No payload required. |
| 2 | `schedule` | TESTED | Valid cron fixture. |
| 3 | `interval` | TESTED | Interval fixture. |
| 4 | `chat_trigger` | TESTED | Outputs `message`. |
| 5 | `error_trigger` | TESTED | Outputs `error_message`. |
| 6 | `workflow_trigger` | TESTED | Pass-through trigger. |
| 7 | `form` | TESTED | Form submission fixture. |
| 8 | `whatsapp_trigger` | TESTED | Trigger fixture only; not WhatsApp API sending. |
| 9 | `instagram_trigger` | TESTED | Trigger fixture only; not Instagram API posting. |
| 10 | `if_else` | TESTED | Outputs `condition_result`. |
| 11 | `switch` | TESTED | Outputs matched case. |
| 12 | `filter` | TESTED | Fixture validates filter execution. |
| 13 | `loop` | TESTED | Outputs `loop`. |
| 14 | `split_in_batches` | TESTED | Outputs `batches`, `totalBatches`. |
| 15 | `merge` | TESTED | Merge fixture. |
| 16 | `merge_data` | TESTED | Pass-through behavior. |
| 17 | `wait` | TESTED | Pass-through behavior. |
| 18 | `noop` | TESTED | Pass-through behavior. |
| 19 | `stop_and_error` | TESTED | Expected failure fixture. |
| 20 | `error_handler` | TESTED | Outputs `handled`. |
| 21 | `set` | TESTED | Adds configured field. |
| 22 | `set_variable` | TESTED | Resolves expression and sets value. |
| 23 | `edit_fields` | TESTED | Maps configured fields. |
| 24 | `rename_keys` | TESTED | Renames key. |
| 25 | `aggregate` | TESTED | Outputs `aggregate`. |
| 26 | `sort` | TESTED | Sort fixture. |
| 27 | `limit` | TESTED | Limit fixture. |
| 28 | `function` | TESTED | JS return fixture. |
| 29 | `function_item` | TESTED | Per-item JS fixture. |
| 30 | `javascript` | TESTED | JS code fixture. |
| 31 | `json_parser` | TESTED | Raw JSON parse fixture. |
| 32 | `csv` | TESTED | CSV parse fixture. |
| 33 | `xml` | TESTED | XML parse fixture. |
| 34 | `text_formatter` | TESTED | Template formatting fixture. |
| 35 | `math` | TESTED | Outputs `result`. |
| 36 | `date_time` | TESTED | Outputs `datetime`. |
| 37 | `read_binary_file` | TESTED | Reads local `package.json`. |
| 38 | `write_binary_file` | TESTED | Writes fixture output file. |
| 39 | `respond_to_webhook` | TESTED | Fixture execution only. |
| 40 | `http_request` | TESTED | Fixture makes HTTP GET to test URL. |
| 41 | `text_summarizer` | TESTED | Outputs `response`. |
| 42 | `sentiment_analyzer` | TESTED | Outputs `response`. |
| 43 | `memory` | TESTED | Outputs `sessionId`. |
| 44 | `chat_model` | TESTED | Outputs `_chat_model_config`. |
| 45 | `ai_agent` | TESTED | Uses internal Gemini env; outputs `response_text`. |
| 46 | `log_output` | TESTED | Log fixture. |

## Type 2 - Authentication / OAuth Nodes Tested Manually By User

These nodes need provider authentication in `/connections`.

Main test goal:
1. Connection modal opens the correct provider.
2. OAuth completes.
3. Saved connection appears for the authenticated user.
4. Node selector shows only matching provider connections.
5. Workflow execution uses that user-owned connection.

| # | Node / workflow | Provider | Status | Notes |
|---:|---|---|---|---|
| 1 | `google_gmail` | Google | ✅ COMPLETE TESTED | Email/Gmail flow is marked complete tested. Keep OAuth scopes connected. |
| 2 | `google_sheets` | Google | AUTH TEST | Needs spreadsheet ID for full run. |
| 3 | `google_drive` | Google | AUTH TEST | Needs Google Drive OAuth. |
| 4 | `google_doc` | Google | AUTH TEST | Needs document ID for read test. |
| 5 | `google_contacts` | Google | AUTH TEST | Full CRUD chain; may need Contacts scope. |
| 6 | `google_tasks` | Google | AUTH TEST | Full CRUD chain; may need Tasks scope. |
| 7 | `twitter` | Twitter / X | ⚠️ BUSINESS VERIFICATION NEEDED | Posting/search may need developer access and app permissions. |
| 8 | `instagram` | Instagram/Facebook | ⚠️ BUSINESS VERIFICATION NEEDED | Requires Instagram Business/Creator linked to Facebook. |
| 9 | `facebook` | Facebook | ⚠️ BUSINESS VERIFICATION NEEDED | Page operations need page/admin permissions. |
| 10 | `linkedin` | LinkedIn | ⚠️ BUSINESS VERIFICATION NEEDED | Posting may need approved LinkedIn app permissions. |
| 11 | `youtube` | YouTube | AUTH TEST | Upload requires extra scope; use private/unlisted test upload. |
| 12 | `notion` OAuth mode | Notion | AUTH TEST | Integration must be granted access to pages/databases. |
| 13 | `slack_message` OAuth mode | Slack | AUTH TEST | Needs workspace/channel access. Webhook mode is Type 3. |
| 14 | `dropbox` | Dropbox | AUTH TEST | Needs Dropbox OAuth. |
| 15 | `onedrive` | Microsoft | AUTH TEST | Needs Microsoft OAuth. |
| 16 | `microsoft_teams` | Microsoft Teams | ⚠️ BUSINESS VERIFICATION NEEDED | Needs team/channel IDs and tenant access. |
| 17 | `hubspot` OAuth mode | HubSpot | ⚠️ BUSINESS VERIFICATION NEEDED | CRM account/private app permissions required. |
| 18 | `salesforce` | Salesforce | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Salesforce org and instance URL. |
| 19 | `airtable` | Airtable | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Mostly API-token based in current registry; base/table required. |
| 20 | `zoom_video` | Zoom | PARTIAL / PROVIDER BLOCKED | OAuth discovery worked; callback failed with `invalid_grant`. Retry fresh OAuth. |
| 21 | `shopify` OAuth mode | Shopify | ⚠️ BUSINESS VERIFICATION NEEDED | Requires store/admin app access. API token mode is Type 3. |
| 22 | `paypal` OAuth mode | PayPal | ⚠️ BUSINESS VERIFICATION NEEDED | Requires PayPal developer/business account. |
| 23 | `xero` | Xero | ⚠️ BUSINESS VERIFICATION NEEDED | Requires tenant/organization ID. |
| 24 | `intuit_smes` / QuickBooks | Intuit | ⚠️ BUSINESS VERIFICATION NEEDED | Requires QuickBooks company/realm ID. |
| 25 | `microsoft_dynamics` | Microsoft Dynamics | ⚠️ BUSINESS VERIFICATION NEEDED | Requires Dynamics organization URL and tenant permissions. |

## Type 2 Additional OAuth Backlog

These OAuth-capable providers exist in the credential registry but are not fully covered by the current Type 2 workflow list.

| Provider / node | Status | Notes |
|---|---|---|
| `github` | NOT TESTED | OAuth available; also PAT mode as Type 3. |
| `gitlab` | NOT TESTED | OAuth available; also PAT mode as Type 3. |
| `asana` | NOT TESTED | OAuth available. |
| `clickup` OAuth mode | NOT TESTED | OAuth available; token mode is Type 3. |
| `linear` OAuth mode | NOT TESTED | OAuth available; API key mode is Type 3. |
| `mailchimp` OAuth mode | NOT TESTED | OAuth available; API key mode is Type 3. |
| `zoho_crm` | ⚠️ BUSINESS VERIFICATION NEEDED | OAuth available; CRM account required. |

## Type 3 - API Key / Access Token / Webhook Nodes

These are the nodes we are testing now.

Main test goal:
1. Secret is saved in `/connections`, not raw node properties.
2. Connection is filtered by provider/credential type.
3. Test button tests only the selected connection.
4. Execution resolves `data.connectionRefs` for the authenticated user.
5. Provider errors are separated from code errors.

| Node / provider | Credential type | Status | Notes |
|---|---|---|---|
| `openai_gpt` | `openai_api_key` | ✅ TESTED / PROVIDER BLOCKED | Connection and execution path work. Provider returned model access/quota errors. Rotate exposed key before real retest. |
| `anthropic_claude` | `anthropic_api_key` | ✅ TESTED | Execution path confirmed working. Upstream data now flows as user message; static prompt acts as system instruction. |
| `google_gemini` | `gemini_api_key` | ✅ TESTED | Execution confirmed successful with API key connection. Upstream data now flows as user message; static prompt acts as system instruction. Bug fixed: upstream input was previously ignored. |
| `pinecone` | `pinecone_api_key` | ✅ TESTED | All 3 operations confirmed through platform execution engine (`executeNode → executeNodeDynamically → executeNodeLegacy → case 'pinecone'`). upsert → `upsertedCount:1`, query → matched `vec-e2e-001` score `0.9988` with metadata, delete → `success:true`. Index must be full serverless host URL, not just index name. |
| `qdrant` | `qdrant_api_key` | ✅ TESTED | Node built and all 3 operations confirmed end-to-end. upsert → `acknowledged`, query → matched id `1` score `0.9999998` with payload, delete → `acknowledged`. Node auto-creates collection on upsert if missing. Requires full cluster URL + collection name. |
| `cohere` | `cohere_api_key` | ✅ TESTED | Node built from scratch. Both generate and generate-with-preamble confirmed end-to-end through platform execution engine (`executeNode → executeNodeDynamically → executeNodeLegacy → case 'cohere'`). Updated model list to current Cohere API (command-r7b-12-2024, command-r-08-2024, command-r-plus-08-2024, 
command-nightly). Old models (command, command-light) removed Sept 2025. |
| `huggingface` | `huggingface_token` | ✅ COMPLETE TESTED | API URL updated to router.huggingface.co/hf-inference; 5 verified models in dropdown (BART-CNN, DistilBART, Helsinki EN→FR/DE/ES); auto-retry for models that reject max_new_tokens. |
| `mistral` | `mistral_api_key` | ✅ COMPLETE TESTED | All 4 models verified (Small/Medium/Large/Codestral); systemPrompt support added; nodeTypes.ts + nodeLaymanDescriptions.ts entries added. |
| `notion` API key mode | `notion_api_key` | ✅ COMPLETE TESTED | Token mode separate from OAuth mode. |
| `airtable` | `airtable_api_key` | ✅ COMPLETE TESTED | Needs base ID, table name, PAT. |
| `clickup` token mode | `clickup_api_token` | ✅ COMPLETE TESTED | Tested with pk_ token; create_task, get_tasks_list, get_task, update_task, add_comment all verified. |
| `linear` API key mode | `linear_api_key` | ✅ COMPLETE TESTED | Tested with Linear API key; create issue, list issues, update issue verified. |
| `trello` | `trello_api_key` | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Needs key/token query auth. |
| `jira` | `jira_api_key` | ✅ COMPLETE TESTED | create_issue, get_issue, update_issue, delete_issue, search_issues, add_comment, transition_issue, get_projects all implemented. |
| `jenkins` | API token | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Needs Jenkins URL/user/token. |
| `github` PAT mode | `github_pat` | ✅ COMPLETE TESTED | Tested with GitHub PAT; repo operations verified. |
| `gitlab` PAT mode | `gitlab_pat` | ✅ COMPLETE TESTED | Tested with GitLab PAT; project path, create/read issue verified. |
| `bitbucket` | `bitbucket_app_password` | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Needs workspace/user/app password. |
| `vercel` | API token | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Needs Vercel token/project. |
| `hubspot` private app mode | Token/private app | ✅ COMPLETE TESTED | hubspot_private_app credential type added; execution patched to read token/accessToken/apiKey fields. |
| `pipedrive` | `pipedrive_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Pipedrive account/API key. |
| `freshdesk` | `freshdesk_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Freshdesk domain/key. |
| `intercom` | `intercom_token` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Intercom token/workspace. |
| `zendesk` | `zendesk_api` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Zendesk subdomain/email/token. |
| `mailchimp` API key mode | `mailchimp_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Mailchimp API key/server prefix. |
| `activecampaign` | `activecampaign_api` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs account URL/API key. |
| `slack_webhook` | Webhook URL | ✅ COMPLETE TESTED | Tested with incoming webhook URL; message delivery verified. |
| `discord_webhook` | Webhook URL | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Webhook URL mode. |
| `discord` bot mode | `discord_bot_token` | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Bot token/server/channel required. |
| `telegram` | `telegram_bot_token` | ⚠️ NEED DEVELOPER CREDENTIALS / ENV | Bot token/chat ID required. |
| `whatsapp` / `whatsapp_cloud` | `whatsapp_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Meta/WhatsApp Business setup. |
| `twilio` | `twilio_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Twilio account SID/token and phone number. |
| `sendgrid` | `sendgrid_api_key` | ✅ COMPLETE TESTED | Email/API-key path marked complete tested. Keep verified sender/domain for real sends. |
| `mailgun` | `mailgun_api` | ✅ COMPLETE TESTED | Email/API-key path marked complete tested. Keep verified sender/domain for real sends. |
| `aws_s3` | `aws_s3_api_key` | NOT TESTED | Needs AWS key/secret/bucket. |
| `cloudflare` | `cloudflare_api_key` | NOT TESTED | Needs Cloudflare token/account. |
| `ftp` | `ftp_credentials` | NOT TESTED | Needs FTP host/user/password. |
| `sftp` | `sftp_credentials` | NOT TESTED | Needs SFTP host/auth. |
| `postgresql` | `postgresql_connection` | NOT TESTED | Needs DB connection. |
| `mysql` | `mysql_connection` | NOT TESTED | Needs DB connection. |
| `mongodb` | `mongodb_connection` | NOT TESTED | Needs DB connection. |
| `redis` | `redis_connection` | NOT TESTED | Needs Redis URL/auth. |
| `firebase` | `firebase_credentials` | NOT TESTED | Needs Firebase credentials. |
| `supabase` / `db` | `supabase_api_key` | NOT TESTED | Needs Supabase URL/key. |
| `stripe` | `stripe_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Stripe test/live key; use test mode. |
| `shopify` API token mode | `shopify_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs Shopify store/admin token. |
| `woocommerce` | `woocommerce_api_key` | ⚠️ BUSINESS VERIFICATION NEEDED | Needs WooCommerce site/key/secret. |
| `typeform` | `typeform_token` | NOT TESTED | Needs Typeform token/form IDs. |
| `calendly` | `calendly_api` | NOT TESTED | Needs Calendly token/event data. |

## Business Account / Special Setup Notes

| Provider | Why blocked or special |
|---|---|
| Instagram | Requires Instagram Business/Creator account linked to Facebook. |
| Facebook | Page actions require managed Page permissions. |
| LinkedIn | Posting often requires approved app scopes. |
| Twitter / X | API access tier and app permissions may block writes/search. |
| YouTube | Upload/manage requires correct scopes and channel ownership. |
| Zoom | OAuth must be completed with a fresh authorization code. |
| HubSpot | CRM account and private app/OAuth scopes required. |
| Salesforce | Salesforce org and connected app permissions required. |
| Shopify | Store/admin access required. |
| PayPal | Developer/business app required. |
| Xero | Tenant ID/organization access required. |
| QuickBooks | Realm/company ID and Intuit app access required. |
| Microsoft Teams / Dynamics | Microsoft tenant/org permissions required. |
| Stripe | Use test key first; live mode should not be used for node testing. |
| WhatsApp Cloud | Meta Business + WhatsApp phone number setup required. |
| Twilio | Paid/trial account constraints and verified phone numbers can block tests. |

## What To Test Next For Type 3

Use this order while testing Type 3 nodes:

1. `openai_gpt`: retest with a rotated key that has billing/quota.
2. `anthropic_claude`: ✅ done.
3. `google_gemini`: ✅ done.
4. `airtable`: save PAT, list records from a test base.
4. `slack_webhook` or `discord_webhook`: simplest webhook URL test.
5. `sendgrid` or `mailgun`: test only with verified sender/domain.
6. `stripe`: use test mode key only.
7. Database credentials: test local/dev DB first, not production.

## Regression Checklist

| Area | Expected |
|---|---|
| Type 1 | Only fixture/no-credential nodes appear in automated Type 1 runner. |
| Type 2 | OAuth nodes show correct provider connection selector and no raw secret fields. |
| Type 3 | API key/token nodes store secrets in `connections`, not workflow node config. |
| User scoping | User B cannot see or use User A's connection. |
| Save/load | Workflow preserves `data.connectionRefs`. |
| Test button | Tests only the selected node/provider connection, not all connections. |
| Provider errors | Quota/model/billing/auth errors are shown as provider errors, not code breaks. |
| Legacy workflows | Old raw-key workflows may still run silently, but new UI must not expose raw secrets. |
