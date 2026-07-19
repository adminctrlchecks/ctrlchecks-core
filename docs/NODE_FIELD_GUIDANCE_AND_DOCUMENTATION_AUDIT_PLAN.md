# Node Field Guidance And Documentation Audit Plan

## Goal

Make every workflow node understandable for a non-technical user directly from the node panel and the node documentation.

The user should not need to open a third-party product document just to understand:

- What the node does.
- Which operation to choose.
- What every input field means.
- How to fill every field.
- Which fields are required for each operation.
- How to map data from previous workflow steps.
- What output the node will produce.
- How to connect the required account or service.
- What common mistakes to avoid.

This plan must be followed one node at a time until every node in the product has been audited and improved.

## Current Problem

Many "How to set" field descriptions are too thin. Some only show a placeholder or a short technical hint. That is not enough for a workplace user, student, operations employee, support agent, sales employee, or any non-IT user who wants to build a workflow.

The improved guidance must explain the actual purpose and real-world behavior of each field.

Examples of weak guidance:

- Only showing `example@example.com` for an email field.
- Saying "Enter ID" without explaining where the ID comes from or what object it identifies.
- Showing a dropdown without explaining what each option does.
- Explaining only one operation while the node supports many operations.
- Showing a connection field without explaining which account, permission, or service access is needed.

## Non-Negotiable Definition Of Done

A node is complete only when all of the following are true:

- The node exists in the backend node inventory and has matching frontend documentation coverage.
- Every operation/resource is documented.
- Every operation explains what it does in plain language.
- Every input field has clear "How to set" guidance.
- Every dropdown option is explained.
- Required and optional fields are clearly marked per operation.
- Conditional fields explain when they appear and why.
- Connection setup is explained for that exact node or provider.
- Credentials and secrets are never described as plain workflow inputs.
- Input examples show realistic workplace data.
- Output examples show what the next workflow step can use.
- Common mistakes are documented.
- The documentation UI is readable, aligned, and easy to scan.
- Tests or coverage checks prevent missing fields from returning later.

## Files To Audit And Update

Use the repo as the source of truth. Do not rely on memory.

- `worker/public/node-library.json`
- `worker/src/services/nodes/node-library.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/nodes/*.doc.ts`
- `ctrl_checks/src/docs-content/types.ts`
- `ctrl_checks/src/docs-content/index.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- `ctrl_checks/src/docs-content/search-index.ts`
- `ctrl_checks/src/docs-content/search/*.ts`
- `worker/src/api/connections-catalog.ts`
- `worker/src/credentials-system/credential-type-registry.ts`
- `worker/src/credentials-system/credential-guides.ts`
- `ctrl_checks/src/components/connections/*`
- `ctrl_checks/src/components/workflow/*PropertiesPanel*`
- `ctrl_checks/src/components/workflow/FormNodeSettings.tsx`
- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx`

Also search for node-specific components, helpers, validators, and tests before editing each node.

## Required Per-Node Workflow

Work one node at a time. Do not skip ahead and do not mark a node complete until the checklist is satisfied.

1. Identify the node in `worker/public/node-library.json`.
2. Locate the matching frontend node definition in `ctrl_checks/src/components/workflow/nodeTypes.ts` or related node config files.
3. Locate the node's documentation in `ctrl_checks/src/docs-content/nodes`.
4. Locate field help content in `ctrl_checks/src/docs-content/node-field-content.ts`.
5. Locate any connection or credential guidance for that node/provider.
6. Build a field matrix for the node.
7. Compare backend schema fields, frontend config fields, docs fields, and connection requirements.
8. Rewrite every field's "How to set" text in non-technical language.
9. Rewrite operation documentation so every operation is covered.
10. Add realistic input examples and output examples.
11. Add or improve connection guidance.
12. Improve documentation UI structure if needed.
13. Add or update coverage tests.
14. Run focused verification.
15. Update this tracker only after the node passes the audit.

## Field Matrix Template

Create this matrix for each node before editing:

| Field | Label | Type | Operation(s) | Required When | Current Help | Docs Coverage | Connection Needed | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fieldKey` | Human label | text/dropdown/etc. | create/update/etc. | clear condition | summary | missing/partial/complete | yes/no | todo |

## Required Field Explanation Template

Every field should answer these points in plain language:

### Standard Field

- What this field means.
- Why this field matters for the selected operation.
- When the user must fill it.
- What value the user should enter.
- Where the user can find the value if it comes from another app.
- How to use data from a previous workflow step.
- Accepted format.
- Real workplace example.
- What happens if it is empty or wrong.
- Common mistake to avoid.

### Dropdown Field

Every dropdown option must explain:

- What the option does.
- When to choose it.
- Which fields become important after choosing it.
- Example workplace use case.
- Expected output or behavior.

### Expression Or Mapping Field

Expression-capable fields must explain:

- How to type a fixed value manually.
- How to insert data from a previous node.
- Example expression such as `{{$json.email}}` or the local equivalent used by the app.
- What the expression should resolve to.
- What error happens when the previous node does not contain that data.

### Credential Or Connection Field

Credential fields must explain:

- Which account to connect.
- What access or permission is needed.
- Whether the connection is used for read, write, send, upload, delete, or admin actions.
- What data the platform stores.
- What the platform never stores in plain workflow fields.
- How to test the connection.
- Common permission errors and how to fix them.

## Required Node Documentation Structure

Each node documentation page should be structured like this:

1. Node summary
   - What this node is used for.
   - Typical users who use it.
   - Common workplace scenarios.

2. Before you start
   - Required account or service.
   - Required permissions.
   - Required trigger/input data.

3. Operations
   - Every operation/resource supported by the node.
   - Plain-language explanation for each operation.
   - When to use each operation.

4. Required fields by operation
   - Table of required fields.
   - Conditional fields.
   - Optional fields that change behavior.

5. Field guide
   - One clear section per field.
   - Real examples.
   - Mapping examples.
   - Common mistakes.

6. Input example
   - Example data coming into the node.
   - Show realistic values.

7. Output example
   - Example data produced by the node.
   - Explain which output fields are useful for the next step.

8. Connection setup
   - How to connect the service.
   - Which permissions are needed.
   - How to test the connection.
   - What to check if the connection fails.

9. Common workflow examples
   - At least 2 to 4 real-world workflows for major nodes.
   - Example: "When a form is submitted, create a CRM lead and send a Slack message."

10. Troubleshooting
   - Missing required field.
   - Wrong ID.
   - Permission denied.
   - Rate limit.
   - Empty result.
   - Invalid format.

## Documentation UI Requirements

The documentation UI must be easy to scan, visually aligned, and readable.

Use a clear layout:

- Summary band at the top.
- Operation cards or tabs.
- Required fields table.
- Field guide cards.
- Input -> Node -> Output visual flow.
- Connection/setup panel.
- Common mistakes panel.
- Related workflow examples.

Visual direction:

- Use clean spacing and consistent alignment.
- Use gradients only where they help hierarchy and readability.
- Do not make long walls of text.
- Use point-wise explanations.
- Keep field names, examples, and outputs visually distinct.
- Make required fields obvious.
- Keep mobile and desktop layouts readable.
- Avoid nested cards and clutter.

## Quality Rules For Help Text

Do not use placeholder-only explanations.

Avoid weak text like:

- "Enter the value."
- "Type the ID."
- "Select an option."
- "Example: test."
- "Configure this field."

Use clear text like:

- "Enter the email address of the person who should receive this message. You can type a fixed address such as `manager@company.com`, or map an email from a previous step such as `{{$json.customerEmail}}`."
- "Choose `Create Contact` when the workflow should add a new person to your CRM. Use this when a form submission, chat request, or checkout event gives you a new lead."
- "The Contact ID identifies the existing contact you want to update. You usually get this value from a previous `Find Contact` step."

## Coverage Tests To Add Or Improve

Add tests that fail when documentation falls behind node definitions.

Recommended coverage checks:

- Every node in `worker/public/node-library.json` has documentation.
- Every frontend `configFields` field has field guidance.
- Every operation has a documentation section.
- Every dropdown option has a plain-language explanation.
- Required fields are documented per operation.
- Provider nodes have connection guidance.
- Help text is not blank or placeholder-only.
- Input and output examples exist for every node.

Possible test names:

- `node-doc-coverage.test.ts`
- `node-field-guidance-coverage.test.ts`
- `node-operation-docs-coverage.test.ts`
- `node-connection-guidance-coverage.test.ts`

## Verification Commands

Run focused checks while working, then broader checks after a batch.

Backend:

```powershell
cd worker
npm run type-check
npm run build
```

Frontend:

```powershell
cd ctrl_checks
npm run build
```

Tests:

```powershell
cd ctrl_checks
npx vitest run
```

If the repo has more specific test scripts, use the local package scripts.

## Full Node Tracker

Status values:

- `Not Started`
- `In Progress`
- `Docs Updated`
- `UI Updated`
- `Tests Added`
- `Verified`
- `Complete`

Do not mark a node `Complete` until all field guidance, operation documentation, connection guidance, examples, UI alignment, and tests are done.

### actions

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `clickup` | ClickUp |

### ai

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `ai_agent` | AI Agent |
| Not Started | `ai_chat_model` | AI Chat Model |
| Not Started | `anthropic_claude` | Anthropic Claude |
| Not Started | `chat_model` | Chat Model |
| Not Started | `cohere` | Cohere |
| Not Started | `google_gemini` | Google Gemini |
| Not Started | `huggingface` | Hugging Face |
| Not Started | `langchain` | LangChain |
| Not Started | `lightricks` | Lightricks |
| Not Started | `memory` | Memory |
| Not Started | `mistral` | Mistral AI |
| Not Started | `ollama` | Ollama |
| Not Started | `openai_gpt` | OpenAI GPT |
| Not Started | `sentiment_analyzer` | Sentiment Analyzer |
| Not Started | `text_summarizer` | Text Summarizer |
| Not Started | `tool` | Tool |

### cache

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `cache_get` | Cache Get |
| Not Started | `cache_set` | Cache Set |

### cms

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `contentful` | Contentful |
| Not Started | `wordpress` | WordPress |

### communication

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `whatsapp` | WhatsApp |
| Complete | `zoom_video` | Zoom Video |

### crm

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `activecampaign` | ActiveCampaign |
| Not Started | `freshdesk` | Freshdesk |
| Not Started | `hubspot` | HubSpot |
| Not Started | `intercom` | Intercom |
| Not Started | `intuit_smes` | Intuit SMEs |
| Not Started | `mailchimp` | Mailchimp |
| Not Started | `microsoft_dynamics` | Microsoft Dynamics |
| Not Started | `odoo` | Odoo |
| Not Started | `pipedrive` | Pipedrive |
| Not Started | `salesforce` | Salesforce |
| Not Started | `sap` | SAP |
| Not Started | `tally` | Tally |
| Not Started | `zendesk` | Zendesk |
| Not Started | `zoho_crm` | Zoho CRM |

### data

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `aggregate` | Aggregate |
| Not Started | `csv` | CSV |
| Not Started | `date_time` | Date & Time |
| Complete | `edit_fields` | Edit Fields |
| Not Started | `html` | HTML |
| Complete | `javascript` | JavaScript |
| Not Started | `json_parser` | JSON Parser |
| Not Started | `limit` | Limit |
| Not Started | `math` | Math |
| Not Started | `merge_data` | Merge Data |
| Not Started | `rename_keys` | Rename Keys |
| Complete | `set` | Set |
| Not Started | `set_variable` | Set Variable |
| Not Started | `sort` | Sort |
| Not Started | `text_formatter` | Text Formatter |
| Not Started | `xml` | XML |

### database

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `airtable` | Airtable |
| Not Started | `database_read` | Database Read |
| Not Started | `database_write` | Database Write |
| Not Started | `db` | Database |
| Not Started | `firebase` | Firebase |
| Not Started | `google_cloud_storage` | Google Cloud Storage |
| Not Started | `mongodb` | MongoDB |
| Not Started | `mysql` | MySQL |
| Not Started | `oracle_database` | Oracle Database |
| Not Started | `pinecone` | Pinecone |
| Not Started | `postgresql` | PostgreSQL |
| Not Started | `qdrant` | Qdrant |
| Not Started | `redis` | Redis |
| Not Started | `sql_server` | SQL Server |
| Not Started | `timescaledb` | TimescaleDB |

### devops

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `bitbucket` | Bitbucket |
| Not Started | `github` | GitHub |
| Not Started | `gitlab` | GitLab |
| Not Started | `jenkins` | Jenkins |
| Not Started | `jira` | Jira |
| Not Started | `netlify` | Netlify |
| Not Started | `vercel` | Vercel |

### ecommerce

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `paypal` | PayPal |
| Not Started | `shopify` | Shopify |
| Not Started | `stripe` | Stripe |
| Not Started | `woocommerce` | WooCommerce |

### file

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `aws_s3` | AWS S3 |
| Not Started | `dropbox` | Dropbox |
| Not Started | `ftp` | FTP |
| Not Started | `onedrive` | OneDrive |
| Not Started | `read_binary_file` | Read Binary File |
| Not Started | `sftp` | SFTP |
| Not Started | `write_binary_file` | Write Binary File |

### flow

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `parallel` | Parallel |
| Not Started | `retry` | Retry |
| Not Started | `return` | Return |
| Not Started | `timeout` | Timeout |
| Not Started | `try_catch` | Try/Catch |

### google

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `google_bigquery` | Google BigQuery |
| Complete | `google_calendar` | Google Calendar |
| Complete | `google_contacts` | Google Contacts |
| Complete | `google_doc` | Google Doc |
| Complete | `google_drive` | Google Drive |
| Complete | `google_gmail` | Gmail |
| Complete | `google_sheets` | Google Sheets |
| Complete | `google_tasks` | Google Tasks |

### http_api

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `graphql` | GraphQL |
| Not Started | `http_post` | HTTP POST |
| Complete | `http_request` | HTTP Request |
| Not Started | `respond_to_webhook` | Respond to Webhook |
| Not Started | `schedulewise` | Schedulewise |
| Not Started | `webhook_response` | Webhook Response |
| Not Started | `workday` | Workday |
| Not Started | `xero` | Xero |

### logic

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `error_handler` | Error Handler |
| Complete | `filter` | Filter |
| Not Started | `function` | Function |
| Not Started | `function_item` | Function Item |
| Complete | `if_else` | If/Else |
| Complete | `loop` | Loop |
| Complete | `merge` | Merge |
| Not Started | `noop` | No Operation |
| Complete | `split_in_batches` | Split In Batches |
| Not Started | `stop_and_error` | Stop and Error |
| Complete | `switch` | Switch |
| Not Started | `wait` | Wait |

### microsoft

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `outlook` | Outlook |

### output

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `amazon_ses` | Amazon SES |
| Complete | `discord` | Discord |
| Complete | `discord_webhook` | Discord Webhook |
| Complete | `email` | Email |
| Complete | `log_output` | Log Output |
| Complete | `mailgun` | Mailgun |
| Complete | `microsoft_teams` | Microsoft Teams |
| Complete | `sendgrid` | SendGrid |
| Complete | `slack_message` | Slack Message |
| Complete | `slack_webhook` | Slack Webhook |
| Complete | `telegram` | Telegram |
| Complete | `twilio` | Twilio |
| Complete | `whatsapp_cloud` | WhatsApp Cloud |

### payment

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `chargebee` | Chargebee |

### productivity

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `calendly` | Calendly |
| Not Started | `linear` | Linear |
| Not Started | `notion` | Notion |
| Not Started | `trello` | Trello |
| Not Started | `typeform` | Typeform |

### queue

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `queue_consume` | Queue Consume |
| Not Started | `queue_push` | Queue Push |

### social

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `facebook` | Facebook |
| Not Started | `instagram` | Instagram |
| Not Started | `linkedin` | LinkedIn |
| Not Started | `twitter` | Twitter/X |
| Not Started | `youtube` | YouTube |

### triggers

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `chat_trigger` | Chat Trigger |
| Complete | `discord_trigger` | Discord Trigger |
| Complete | `error_trigger` | Error Trigger |
| Complete | `facebook_trigger` | Facebook Trigger |
| Complete | `form` | Form Trigger |
| Complete | `github_trigger` | GitHub Trigger |
| Complete | `gitlab_trigger` | GitLab Trigger |
| Complete | `gmail_trigger` | Gmail Trigger |
| Complete | `google_calendar_trigger` | Google Calendar Trigger |
| Complete | `google_drive_trigger` | Google Drive Trigger |
| Complete | `google_sheets_trigger` | Google Sheets Trigger |
| Not Started | `instagram_trigger` | Instagram Trigger |
| Not Started | `interval` | Interval Trigger |
| Not Started | `jira_trigger` | Jira Trigger |
| Not Started | `linear_trigger` | Linear Trigger |
| Complete | `manual_trigger` | Manual Trigger |
| Not Started | `microsoft_teams_trigger` | Microsoft Teams Trigger |
| Not Started | `outlook_trigger` | Outlook Trigger |
| Complete | `schedule` | Schedule Trigger |
| Not Started | `shopify_trigger` | Shopify Trigger |
| Not Started | `slack_trigger` | Slack Trigger |
| Not Started | `stripe_trigger` | Stripe Trigger |
| Not Started | `tally_trigger` | Tally Trigger |
| Not Started | `telegram_trigger` | Telegram Trigger |
| Not Started | `trello_trigger` | Trello Trigger |
| Not Started | `typeform_trigger` | Typeform Trigger |
| Complete | `webhook` | Webhook Trigger |
| Not Started | `whatsapp_trigger` | WhatsApp Trigger |
| Complete | `workflow_trigger` | Workflow Trigger |

### utility

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `delay` | Delay |

### workflow

| Status | Node Type | Label |
| --- | --- | --- |
| Not Started | `execute_workflow` | Execute Workflow |

## Suggested Execution Order

Start with high-impact, high-frequency nodes first, then provider groups.

1. Core triggers: manual, schedule, webhook, form, workflow trigger.
2. Core logic/data nodes: if/else, switch, filter, set, edit fields, merge, loop, split in batches, javascript, http request.
3. Communication/output nodes: email, slack, teams, telegram, whatsapp, discord.
4. Google nodes and triggers.
5. CRM nodes.
6. Ecommerce/payment nodes.
7. Database/file nodes.
8. AI nodes.
9. Remaining provider and utility nodes.

Even if this priority order is used, the full tracker must still be completed.

## Cloud Continuation Handoff

Use this section as the exact handoff for the next cloud implementation run. The work is intentionally long-running. The cloud agent must continue node by node, update this tracker only after verification, and must not repeat or undo completed node work.

### Current Verified Status

The following nodes are already audited and marked `Complete` in the tracker:

- Core triggers: `manual_trigger`, `schedule`, `webhook`, `form`, `workflow_trigger`, `chat_trigger`, `error_trigger`, `facebook_trigger`, `github_trigger`, `gitlab_trigger`
- Core logic/data: `if_else`, `switch`, `filter`, `set`, `edit_fields`, `merge`, `loop`, `split_in_batches`, `javascript`, `http_request`
- Communication/output: `email`, `slack_message`, `microsoft_teams`, `telegram`, `whatsapp`, `discord`, `discord_webhook`, `zoom_video`
- Google (complete): `google_gmail`, `google_sheets`, `google_calendar`, `google_drive`, `google_doc`, `google_contacts`, `google_tasks`, `google_bigquery` — all 8 core Google data/action nodes are audited. `google_sheets_trigger`, `google_calendar_trigger`, `google_drive_trigger`, and `gmail_trigger` are also audited and marked `Complete`; the Google trigger group is now complete.

`discord` and `discord_webhook` are both real, distinct backend node types (confirmed in `worker/src/services/nodes/node-library.ts` via `createDiscordSchema()` and `createDiscordWebhookSchema()`, with separate override files `worker/src/core/registry/overrides/discord.ts` and `discord-webhook.ts`, and separate credential types `discord_bot_token` vs `discord_webhook`). Both are now audited and marked `Complete`.

`google_gmail` is also now audited and marked `Complete`. It has 4 operations (send/list/get/search) and 17 total documented config fields (`operation`, `credentialId`, `recipientSource`, `recipientEmails`, `spreadsheetId`, `sheetName`, `range`, `useAiRecipientMapping`, `to`, `subject`, `body`, `cc`, `bcc`, `from`, `messageId`, `query`, `maxResults`).

`google_sheets` is also now audited and marked `Complete`. It has 4 operations (read/write/append/update) and 9 documented config fields (`operation`, `spreadsheetId`, `sheetName`, `range`, `outputFormat`, `readDirection`, `values`, `data`, `allowWrite`).

`google_calendar` is also now audited and marked `Complete`. This node's runtime supports 9 resources (event, calendar, calendarList, eventInstance, acl, settings, colors, freebusy, watch) but the visual panel only ever uses the `event` resource with 4 exposed operations (list/create/update/delete); 3 more event operations (get/quickAdd/move) are runtime-supported but not yet in the dropdown. Per the plan's guidance to not silently drop runtime-supported operations, all 7 event operations were fully documented (matching the `whatsapp` precedent), but the other 8 non-event resources were deliberately scoped out — see the completed-files note below for the reasoning.

`google_drive` is also now audited and marked `Complete`. **Important finding**: the visual panel's Operation dropdown includes a "Delete File" option, but the runtime override (`worker/src/core/registry/overrides/google-drive.ts`, `overrideGoogleDrive`) only implements `list`/`download`/`upload` — selecting Delete always throws `"Unsupported Google Drive operation: delete"`. This was a real, pre-existing false claim repeated across `node-content-overrides.ts`, `nodeUsageGuides.ts`, and `nodeGuides.ts` (all previously described Delete as if it worked); all three were corrected to state plainly that Delete is non-functional today, following the same transparency principle used for `google_sheets`'s `allowWrite` and `whatsapp`'s `returnAll` findings.

`google_doc` is also now audited and marked `Complete`. **Important finding**: all three auxiliary content files (`node-content-overrides.ts`, `nodeUsageGuides.ts`, `nodeGuides.ts`) previously described a fourth operation called "Update" that does not exist — the real operations are `read`/`write`/`create`/`append` (confirmed in both `worker/src/services/nodes/node-library.ts`'s schema options and `execute-workflow.ts`'s `case 'google_doc'`). The previous content also fabricated output fields (`title`, `body.content` structure, `revisionId`, `contentLength`, `hasContent`, `text` alias) that the runtime never returns — the real output is much simpler (`content`/`format`/`documentId` for read; `success`/`documentId`/`content` for write/append; plus `title`/`documentUrl` for create). All three files were corrected.

`google_contacts` is also now audited and marked `Complete`. **This batch included an actual bug fix, not just documentation**: the visual panel's "List Contacts" dropdown option sent `operation: 'list'`, but the runtime executor (`worker/src/core/registry/overrides/google-contacts.ts`) only recognizes `create`/`read`/`update`/`delete` — `list` was never a valid value, so the node's own default configuration (`operation: 'list'`) always failed with `"Unsupported Google Contacts operation: list"`. Separately, the panel's "Max Results" field was named `maxResults`, but the executor reads a field called `pageSize` — so that field silently had zero effect. Both were small, safe, one-value/one-key fixes (not architectural), so they were fixed directly in `ctrl_checks/src/components/workflow/nodeTypes.ts` (dropdown option value and default now `read`; field key renamed `maxResults` → `pageSize`) rather than only documented as broken, unlike `google_drive`'s Delete (which has no working backend path at all) or `google_sheets`'s `allowWrite` (a checkbox with no reasonable "fix" — it's just decorative by design). The doc, `node-content-overrides.ts`, `nodeUsageGuides.ts`, and `nodeGuides.ts` were all written/updated to describe the now-corrected behavior.

`google_tasks` is also now audited and marked `Complete`. Good news: unlike `google_contacts`, its frontend dropdown values (`read`/`create`/`update`/`delete`) already matched the runtime executor exactly — no operation-value bug here. A smaller, additive gap was found and fixed instead: the backend/override (`worker/src/core/registry/overrides/google-tasks.ts`) supports a `status` field (`needsAction`/`completed`) for marking tasks done on `update`, but the visual panel never exposed it at all. Added a `status` select field to `nodeTypes.ts` (`visibleIf: operation === 'update'`), following the same "small, safe, additive" precedent as `google_gmail`'s sheet-fallback fields.

`google_bigquery` is also now audited and marked `Complete`, finishing the entire Google node group. A usability gap (not a breakage) was found: the visual panel's "Dataset ID" field is marked `required` but is **never read by the query executor at all** (`worker/src/core/registry/overrides/google-bigquery.ts` only reads `projectId`/`query`/`useLegacySql`) — the SQL query itself must fully qualify every table as `` `project.dataset.table` ``. Fixed by making the field optional and relabeling it "Dataset ID (reference only)" with clarifying help text, rather than leaving it falsely marked required (a safe, additive fix, same class as the `google_tasks` `status` field addition). Also found and fixed a completely fabricated `insert` operation in `node-content-overrides.ts` (streaming inserts are not implemented anywhere in this node) and corrected the row-shape misconception repeated in `node-content-overrides.ts`/`nodeUsageGuides.ts`: BigQuery's raw `jobs.query` response returns rows as `{f: [{v: value}, ...]}`, not plain column-named objects — every one of the previous docs claimed the latter.

The suggested-order Google data/action group and Google trigger group are now fully complete.

`slack_webhook` is also now audited and marked `Complete`. **Important finding, unique to this node**: unlike almost every other node in this codebase, `case 'slack_webhook'` in `worker/src/api/execute-workflow.ts` does **not** spread `...inputObj` into its return value on either success or failure — its output completely replaces `$json` with just `{id, status, provider, message}` (success) or `{id: '', status: 'failed', provider, error}` (failure). Any upstream fields (like `{{$json.customerEmail}}`) that existed before this node do not survive past it. It also uses a plain `error` field (no underscore) on failure instead of the `_error` convention almost every other audited node follows. Both were previously undocumented and are now called out explicitly in `slack_webhook.doc.ts`, `node-content-overrides.ts`, `nodeUsageGuides.ts`, and `nodeGuides.ts`. The prior `node-content-overrides.ts` entry for this node was also fully fabricated (`{success, status: 200, response: 'ok'}` — none of those keys are ever returned) and has been corrected to the real `{id, status, provider, message}` shape.

**Session interruption note**: the `slack_webhook` batch's frontend verification (focused vitest suite: 187/187 passing, and `npm run build` for `ctrl_checks`) both passed cleanly before this session was interrupted. No worker source files were touched in this batch, so the worker `npm run type-check && npm run build` re-confirmation is very low-risk, but it was not re-run before the session ended — run it as the very first step of the next session purely as a sanity check (it is not expected to surface anything related to this batch).

`amazon_ses` is also now audited and marked `Complete` (see the "Implementation Already Completed" section below for full details). Its most notable finding: pre-flight validation failures return `_error`, but actual AWS SES send failures (including "no AWS connection configured", the most common real-world case) return a plain `error` field instead — a downstream node checking only `{{$json._error}}` will miss those.

`chat_trigger` is also now audited and marked `Complete`. Important finding: the visual Chat Trigger node has no setup fields today even though the backend schema lists optional `message`, `channel`, and `allowedSenders`. The docs now state that `message` is runtime input from the CtrlChecks chat UI/API, while `channel` and `allowedSenders` are backend schema/generated-payload fields and are not currently exposed or enforced as visual filters. Runtime output is documented from the migrated registry override (`message`, `channel`, `sessionId`, `trigger`, `node_id`, `workflow_id`, `timestamp`, `_chat`), with an explicit note that older/simple execution paths may reduce output to the message string. Chat Send handoff through `{{$json.sessionId}}` and no-credential/downstream-service connection guidance are now covered.

`error_trigger` is also now audited and marked `Complete`. Important finding: the old docs described a fabricated `error.message`/`failedWorkflowId`/`failedNodeId` output shape, but the registry override and legacy switch both return `failed_node`, `error_message`, and `error_type`, plus optional `error_stack` and `node_output` only when those values are supplied. The docs now explain that Error Trigger is a zero-config sidecar trigger: it is skipped during the normal execution order and invoked out-of-band by the workflow failure handler. No-credential guidance and downstream service-node connection requirements are covered.

`facebook_trigger` is also now audited and marked `Complete`. Important finding: the backend/registry schema includes six setup fields (`connectionId`, `eventTypes`, `pageId`, `allowedSenderIds`, `verifyToken`, `validateSignature`), but the visual panel intentionally exposes only the five user-editable webhook/filter fields; `connectionId` is credential-owned and resolved from the saved Facebook OAuth2 connection. The old docs were missing `connectionId`, `allowedSenderIds`, `validateSignature`, Meta connection/scopes/signature setup, and most runtime outputs. The docs now cover Meta webhook verification, optional X-Hub-Signature-256 validation, event alias filtering, Page/sender filters, normalized outputs (`eventId`, `eventType`, `senderId`, `commentId`, `leadgenId`, `sessionId`, `_facebook`, and related fields), downstream Facebook reply handoff, and downstream service-node connection requirements. A small frontend metadata fix was made: `verifyToken` now uses the supported visual field type `text` instead of unsupported `password`.

`facebook_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/facebook_trigger.doc.ts` (fully rewritten with all six backend/registry fields, Meta webhook verification/signature behavior, normalized output shape, setup, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/facebook_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `connectionId`, `eventTypes`, `pageId`, `allowedSenderIds`, `verifyToken`, and `validateSignature`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Facebook Trigger panel help/usage text and changed `verifyToken` config field type from unsupported `password` to supported `text`; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added/rewrote Facebook Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Facebook Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `facebookTriggerDoc` coverage and a `facebook_trigger` credential branch)
- `ctrl_checks/src/components/workflow/__tests__/facebook-trigger-node-types.test.ts` (tightened assertions for config fields, supported `verifyToken` type, runtime output guidance, backend support, logo, and Facebook reply action fields)

`github_trigger` is also now audited and marked `Complete`. Important finding: the trigger is passive during normal node execution; real workflow starts come from `worker/src/api/github-trigger.ts` after the service validates `X-Hub-Signature-256` against a signing secret stored in Redis. The backend schema requires `owner` and `repo`; optional fields are `eventTypes`, `webhookSecret`, and `query`, while the registry override also understands credential-owned `connectionId`. The visual panel exposes the five user-editable fields and now documents the credential-owned behavior through docs/guidance. A small frontend metadata fix was made: `webhookSecret` now uses supported visual field type `text` instead of unsupported `password`. The docs now cover automatic repository webhook registration through `/repos/{owner}/{repo}/hooks`, PAT/OAuth connection requirements, PUBLIC_BASE_URL requirements, ping handling, event filtering, simple keyword filtering, normalized output fields, and downstream service-node connection requirements.

`github_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/github_trigger.doc.ts` (fully rewritten with connection/setup guidance, all backend/frontend/registry fields, webhook registration, signature validation, normalized output shape, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/github_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `connectionId`, `owner`, `repo`, `eventTypes`, `webhookSecret`, and `query`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote GitHub Trigger panel help/usage text and changed `webhookSecret` config field type from unsupported `password` to supported `text`; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added GitHub Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated GitHub Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `githubTriggerDoc` coverage and a `github_trigger` credential branch)
- `ctrl_checks/src/components/workflow/__tests__/github-trigger-node-types.test.ts` (tightened assertions for config fields, supported `webhookSecret` type, runtime output guidance, backend support, logo, and distinct GitHub action node)

`gitlab_trigger` is also now audited and marked `Complete`. Important finding: GitLab project webhooks do not use an HMAC signature in this runtime. GitLab echoes the plain shared secret in the `X-Gitlab-Token` header, and CtrlChecks compares that value to the stored/generated secret. The backend schema requires `projectId`; optional fields are `baseUrl`, `eventTypes`, `secretToken`, and `query`, while the registry override also understands credential-owned `connectionId`. The visual panel exposes the five user-editable fields and now documents credential-owned behavior through docs/guidance. A small frontend metadata fix was made: `secretToken` now uses supported visual field type `text` instead of unsupported `password`. The docs now cover GitLab PAT/OAuth `api` scope requirements, automatic project webhook registration through `/api/v4/projects/:id/hooks`, PUBLIC_BASE_URL requirements, exact `object_kind` event filtering, simple keyword filtering, normalized output fields, and downstream service-node connection requirements.

`gitlab_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/gitlab_trigger.doc.ts` (fully rewritten with connection/setup guidance, all backend/frontend/registry fields, project webhook registration, X-Gitlab-Token validation, normalized output shape, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/gitlab_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `connectionId`, `baseUrl`, `projectId`, `eventTypes`, `secretToken`, and `query`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (tightened GitLab Trigger panel help/usage text and changed `secretToken` config field type from unsupported `password` to supported `text`; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added GitLab Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `gitlabTriggerDoc` coverage and a `gitlab_trigger` credential branch)
- `ctrl_checks/src/components/workflow/__tests__/gitlab-trigger-node-types.test.ts` (tightened assertions for config fields, supported `secretToken` type, runtime output guidance, backend support, logo, and distinct GitLab action node)

The next high-impact incomplete node is `instagram_trigger`, the next remaining trigger node still marked `Not Started` in the tracker table.

### Implementation Already Completed

`if_else` was completed before this handoff. The completed work included:

- Re-checked backend schema, frontend config fields, docs content, search content, usage guide, examples, and branching requirements.
- Updated `ctrl_checks/src/docs-content/nodes/if_else.doc.ts`.
- Updated `ctrl_checks/src/components/workflow/ConditionBuilder.tsx`.
- Updated `ctrl_checks/src/components/workflow/nodeTypes.ts`.
- Updated `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`.
- Updated `ctrl_checks/src/docs-content/node-field-content.ts` for `conditions`, `conditionField`, `conditionOperator`, `conditionValue`, and `combineOperation`.
- Updated `ctrl_checks/src/docs-content/node-content-overrides.ts` with runtime-aligned examples.
- Updated search/manifest content as needed.
- Extended `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` to include `ifElseDoc`.
- Confirmed dropdown guidance covers `equals`, `not_equals`, `greater_than`, `less_than`, `greater_than_or_equal`, `less_than_or_equal`, `contains`, `not_contains`, `AND`, and `OR`.
- Confirmed connection guidance says If/Else has no credentials, TRUE and FALSE branches must be connected, and downstream service nodes still need their own account connections.

The latest completed communication/output batch was `slack_message`, `microsoft_teams`, and `telegram`.

`slack_message` completed files:

- `ctrl_checks/src/docs-content/nodes/slack_message.doc.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`
- `ctrl_checks/src/docs-content/search/slack_message.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`

Slack coverage now includes fields `channel`, `message`, `threadTs`, `blocks`, `username`, and `iconEmoji`; runtime-aligned outputs `id`, `status`, `provider`, `ok`, `channel`, `ts`, `threadTs`, `message`, and `error`; and connection guidance for Slack OAuth2, the Connections/credential system, `chat:write`, private channel bot membership, no tokens in workflow fields, and downstream service connections.

`microsoft_teams` completed files:

- `ctrl_checks/src/docs-content/nodes/microsoft_teams.doc.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`
- `ctrl_checks/src/docs-content/search/microsoft_teams.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- `worker/src/credentials-system/credential-guides.ts`
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`

Teams coverage now includes Incoming Webhook and Bot Framework reply paths; fields `webhookUrl`, `message`, `serviceUrl`, `conversationId`, and `replyToId`; runtime-aligned outputs `success`, `teams.status`, `teams.response`, `teams.id`, `botReply`, `_error`, and `_errorDetails`; and connection guidance for Incoming Webhook URL, Microsoft Teams Bot credentials, Microsoft App ID, App Password/client secret, service URL/conversation ID trigger replies, no secrets in workflow fields, and downstream service connections.

`telegram` completed files:

- `ctrl_checks/src/docs-content/nodes/telegram.doc.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`
- `ctrl_checks/src/docs-content/search/telegram.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`

Telegram coverage now includes fields `operation`, `chatId`, `messageType`, `message`, `text`, `parseMode`, `disableWebPagePreview`, `mediaUrl`, `caption`, `replyToMessageId`, `editMessageId`, `replyMarkup`, `disableNotification`, `protectContent`, and `allowSendingWithoutReply`; dropdown explanations for `send_message`, `send_photo`, `edit_message`, `text`, `photo`, `video`, `document`, `audio`, `animation`, `none`, `HTML`, `Markdown`, and `MarkdownV2`; runtime-aligned outputs `success`, `operation`, `chatId`, `messageId`, `data`, `raw`, `telegram`, `_error`, and `_errorDetails`; and connection guidance for Telegram Bot Token, BotFather, chat ID, bot start/add requirements, no bot token in normal fields, and downstream service connections.

`whatsapp` completed files:

- `ctrl_checks/src/docs-content/nodes/whatsapp.doc.ts` (fully rewritten)
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
- `ctrl_checks/src/components/workflow/__tests__/whatsapp-trigger-node-types.test.ts` (updated to match the expanded operation dropdown)
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts`
- `ctrl_checks/src/docs-content/search/whatsapp.ts` (regenerated from the new doc via a one-off script, then the script was deleted)
- `ctrl_checks/src/docs-content/manifest.ts`
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`

Reconciliation decision made for the frontend/backend mismatch flagged in the prior handoff: the visual Resource dropdown still only exposes `message` (expanding it to the other five resources would require the `operation` dropdown's backend-fallback mechanism in `nodeTypes.ts`/`backendSupportedNodeOperations.ts` to become resource-aware, since operation values collide across resources such as `create`/`list`/`get` — that is a shared-architecture change affecting every multi-resource node, out of scope for a doc-audit pass). Instead:

- The visual `operation` dropdown was expanded from 4 to all 9 real `message`-resource operations (`sendText`, `sendMedia`, `sendLocation`, `sendContact`, `sendTemplate`, `sendInteractiveButtons`, `sendInteractiveList`, `sendInteractiveCTA`, `markAsRead`), each with correct conditional fields wired via `visibleIf`/`requiredIf` (including array-valued `equals` for fields shared across several operations, e.g. `bodyText`).
- `contact`, `conversation`, `template`, `campaign`, and `aiAgent` resources/operations (all runtime-supported, reachable via AI-generated or manually edited workflow configs) are fully documented as separate `ResourceDoc` sections in `whatsapp.doc.ts` (29 operations total across all 6 resources), each with plain-language descriptions, required/optional fields, realistic input/output examples aligned to the actual Meta Graph API response shapes, and troubleshooting — but are clearly marked as not yet selectable from the visual Resource dropdown.
- Corrected the prior generated doc's wrong field guidance (e.g. `to` used `alice@example.com` as an example instead of a phone number).
- Documented that `returnAll` is accepted by the schema but **not actually implemented** in `worker/src/services/social/whatsapp-node.ts` (no auto-pagination loop reads it) — flagged in field help text and troubleshooting rather than silently repeating the schema's misleading "ignores limit" description.
- Verified runtime output shape precisely from `worker/src/core/registry/overrides/whatsapp.ts` → `worker/src/services/social/social-dispatcher.ts` (`executeWhatsAppNode`) → `worker/src/services/social/whatsapp-node.ts`: the node's `execute()` returns `{ success, output, error }` where `output` is the raw Meta API response merged directly into `$json` (not nested), and errors surface as `_error`/`_errorCode` (`WHATSAPP_ERROR`)/`_errorDetails`.
- Confirmed `worker/src/api/connections-catalog.ts`, `worker/src/credentials-system/credential-type-registry.ts`, and `worker/src/credentials-system/credential-guides.ts` already had adequate WhatsApp connection guidance (OAuth scopes, System User token steps, Phone Number ID) from a prior session; no changes were needed there.

`discord` and `discord_webhook` completed files:

- `ctrl_checks/src/docs-content/nodes/discord.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/nodes/discord_webhook.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-field-content.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added a missing `discord` section; `discord_webhook` already existed)
- `ctrl_checks/src/docs-content/search/discord.ts`
- `ctrl_checks/src/docs-content/search/discord_webhook.ts`
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `discordDoc`/`discordWebhookDoc` imports, `AUDITED_NODE_DOCS` entries, and new `discord`/`discord_webhook` `credentialKind` branches in the connection-guidance assertion)

`ctrl_checks/src/components/workflow/nodeTypes.ts` was reviewed but not changed — its `discord` and `discord_webhook` `configFields` already had adequate non-technical `helpText` for every field (`channelId`, `message`, `interactionToken`, `applicationId`, `replyToMessageId` for `discord`; `message`, `username`, `avatarUrl` for `discord_webhook`) from a prior session, so no frontend panel rewrite was needed this batch.

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts`, `case 'discord'` and `case 'discord_webhook'`, plus the two override files):

- `discord` has two independent send paths in one `default` operation: (1) if `interactionToken` + `applicationId` are both present, it POSTs to Discord's interaction follow-up webhook (no bot token or channel ID needed) and returns `{ success: true, discord: data, interactionReply: true }`; (2) otherwise it POSTs to the Bot API channel endpoint using the `discord` credential (or `botToken`/`token` config fallback) plus `channelId`, optionally threading via `replyToMessageId`, and returns `{ success: true, discord: data }` where `data` is Discord's raw message object (`id`, `channel_id`, `content`, `author`, `timestamp`, ...). Both paths share one required field: `message`.
- `discord_webhook` always uses the saved `discord_webhook` credential (or `webhookUrl`/`headerName` config fallback), POSTs `{ content, username?, avatar_url? }`, and returns `{ success: true, sent: true, message, discord_webhook: { status, delivered: true } }`. Discord's webhook API returns HTTP 204 with an empty body on success by design, which the previous doc's output example did not reflect accurately (it fabricated a flattened `id`/`channelId`/`content`/`timestamp` shape that runtime never produces for either node).
- The previous `discord.doc.ts` documented only `channelId` and `message`, completely omitting `interactionToken`, `applicationId`, and `replyToMessageId` even though all three are real backend/frontend config fields. The previous `discord_webhook.doc.ts` similarly omitted `username` and `avatarUrl`. Both gaps are fixed.
- `nodeUsageGuides.ts` had no `discord` entry at all (only `discord_webhook`, and its `outputs` field incorrectly said `['message_id']` — runtime never returns a `message_id` key). Added the missing `discord` entry and corrected `discord_webhook`'s documented outputs to `success`/`sent`/`message`/`discord_webhook`/`_error`.
- Backend connection guidance (`worker/src/api/connections-catalog.ts`, `credential-type-registry.ts`, `credential-guides.ts`) for `discord_bot_token` and `discord_webhook` was already detailed and accurate (Developer Portal steps, OAuth2 bot invite, Manage Webhooks permission, etc.) from a prior session — no worker changes were needed.

`google_gmail` completed files:

- `ctrl_checks/src/docs-content/nodes/google_gmail.doc.ts` (fully rewritten)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (added 4 missing config fields — see below)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added missing field entries, fixed inaccurate default claims)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected all 4 operations' output examples)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (corrected output shape claims)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added `recipientSource`, `spreadsheetId`, `sheetName`, `range`, `useAiRecipientMapping` field guides)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleGmailDoc` import, `AUDITED_NODE_DOCS` entry, and a new `gmail` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'google_gmail'`, `worker/src/core/registry/overrides/google-gmail.ts` `executeGmailSend`, `worker/src/shared/gmail-executor.ts`, and `worker/src/core/utils/recipient-resolver.ts`):

- **Major pre-existing inaccuracy fixed**: the previous `google_gmail.doc.ts`, `node-content-overrides.ts`, and `nodeUsageGuides.ts` all fabricated output shapes that runtime never produces. Send's real output (via the `overrideGoogleGmail` registry override, not the legacy switch case, which only handles list/get/search) is `{ success, subject, to, messageId (single-recipient only), sentCount, failedCount, results[] }` — not the previously documented `{ messageId, threadId, labelIds }`. List/Search's real `messages` array items only have `id` and `threadId` — Gmail's `users.messages.list` endpoint does not return `snippet`, so the previous docs' `snippet`-containing examples were fabricated. Get returns the **full raw Gmail API message resource** (`id`, `threadId`, `labelIds`, `snippet`, `payload.headers` as a `{name, value}` array, `payload.body.data` as base64url-encoded content) — not the simplified `{ id, subject, from, to, body, date }` shape the previous docs claimed; a user following the old docs would have mapped `{{$json.body}}` and gotten `undefined`.
- The node has two execution paths for `send`: the modern path through `overrideGoogleGmail`'s `executeGmailSend` (handles `recipientSource` strategy, sheet-fallback recipient resolution via `resolveRecipients`/`fetchGoogleSheetReadRange`, per-recipient send loop) and a separate, simpler legacy path in `execute-workflow.ts`'s `case 'google_gmail'` that only reads `recipientEmails`/`to` directly and is reached for `list`/`get`/`search` via `executeViaLegacyExecutor`. Documented both paths' actual field usage and output shapes accurately rather than conflating them.
- **UI/backend gap found and fixed** (small, safe addition, not architectural): the backend schema and the override file (`worker/src/core/registry/overrides/google-gmail.ts`) fully support `spreadsheetId`, `sheetName`, `range`, and `useAiRecipientMapping` as the "Extract from sheet" fallback fields (already present in `worker/public/node-library.json`'s `optionalConfig`), but `ctrl_checks/src/components/workflow/nodeTypes.ts` never exposed them in the visual panel at all — the Recipient Source dropdown had an `extract_from_sheet` option with no fields ever appearing for it. Added all 4 fields to `nodeTypes.ts` with `visibleIf: { field: 'recipientSource', equals: 'extract_from_sheet' }`, matching the pattern already used for `recipientSource` itself in the same node. This was safe/non-architectural (unlike `whatsapp`'s resource-dropdown limitation) because the `visibleIf` conditional-field mechanism already existed and was already used for this exact node's `recipientSource`-driven fields.
- `to` is a real, working legacy fallback field (read directly by both the override and the legacy case) that exists in `nodeTypes.ts` `configFields` but not in the backend schema's `optionalConfig` list — documented it anyway since the coverage test requires every **frontend** configField to be documented too, not only backend ones.
- `credentialId` is in the backend `optionalConfig` list but is an internal/advanced credential-system reference, not a normal user input — documented it as such (analogous to how `discord`'s `botToken` was handled), with explicit guidance not to type an email/password into it.

`google_sheets` completed files:

- `ctrl_checks/src/docs-content/nodes/google_sheets.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added missing `data`/`values` per-operation entries and a `'*'` block for `operation`/`outputFormat`/`readDirection`/`allowWrite`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected all 4 operations' output examples)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (corrected fabricated output shape, fixed `allowWrite` claim)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added the entire `google_sheets` section — it did not exist before)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleSheetsDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_sheets` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'google_sheets'` and `worker/src/shared/google-sheets-write-values.ts` `normalizeGoogleSheetsWriteValues`):

- **Major pre-existing inaccuracy fixed**: the previous docs (`google_sheets.doc.ts`, `node-content-overrides.ts`, `nodeUsageGuides.ts`) all fabricated output shapes. Read's real output is `{ items, rows, headers, values, google_sheets: {...}, range, outputFormat }` (with `text`/`keyValue` added only for those output formats) — there is **no `count` field**, contrary to what every one of the three files previously claimed. Append's real output flattens `updatedRange`/`updatedRows` to the **top level** — the previous docs claimed a nested `updates: { updatedRange, updatedRows }` object, which would have sent users looking for a field path (`{{$json.updates.updatedRange}}`) that runtime never produces.
- This node throws JavaScript `Error`s for its failure paths (`Google Sheets node: Spreadsheet ID is required`, `Google Sheets: OAuth token not found`, `Google Sheets: Sheet "..." not found in spreadsheet`, `Google Sheets node: No values provided for write/append/update operation`, `Google Sheets API error`, `Google Sheets node: Unsupported operation`) rather than returning an `_error` field like `discord`/`google_gmail` do — documented this distinction in the troubleshooting section instead of assuming a uniform `_error` shape across nodes.
- **Dead/decorative field found and documented plainly**: `allowWrite` (labeled "Allow Write Access") exists as a frontend `configFields` checkbox in `nodeTypes.ts` and is grep-confirmed **absent from the entire worker codebase** — it has zero runtime effect. Write/Append/Update execute regardless of its value. The previous `nodeUsageGuides.ts` entry actively claimed "Admin can enable write access for updates," reinforcing a false belief that it gates write operations. Corrected this everywhere it appeared (doc.ts, node-field-content.ts, nodeUsageGuides.ts, nodeGuides.ts) rather than silently repeating the misleading claim — the same transparency approach used for `whatsapp`'s non-functional `returnAll` field in a prior batch.
- `values` and `data` both accept an array of arrays, an array of row objects, or a single object (verified in `normalizeGoogleSheetsWriteValues`/`toRows`), and **`data` is checked before `values`** when both are filled — the previous docs described `data` as strictly "a single JSON object," which was too narrow and didn't mention the precedence order. Corrected in all four files.
- `readDirection` is read directly by the legacy switch case but is **not declared in the backend schema's `configSchema.optional`** (only `spreadsheetId`, `sheetName`, `range`, `operation`, `outputFormat`, `values`, `data` are) — it is a frontend-only field, analogous to `google_gmail`'s `to`. Documented it since the coverage test requires every frontend `configFields` entry to be documented too, not only backend-declared ones.
- Required-field flags were corrected to match the real `operationContracts` in `worker/src/services/nodes/node-library.ts`: the previous doc marked `range` as `required: true` for both Write and Append, but the operation contracts only list `range` as optional for those two (only Update truly requires it).

`google_calendar` completed files:

- `ctrl_checks/src/docs-content/nodes/google_calendar.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added the entire `google_calendar` `'*'` block — it did not exist before)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (fixed wrong `startDateTime`/`endDateTime` field-name usage — the real field names are `startTime`/`endTime` — and corrected the create/list output shapes)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fixed the `eventId` vs `id` output-field naming error)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleCalendarDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_calendar` `credentialKind` branch)

`ctrl_checks/src/components/workflow/nodeGuides.ts` already had an accurate, adequate `google_calendar` section from a prior session (operation/calendarId/eventId/summary/startTime/endTime/description) — no changes were needed there. `ctrl_checks/src/components/workflow/nodeTypes.ts` was reviewed but not changed — its 7 `configFields` already had adequate helpText.

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'google_calendar'` plus the `if (nodeType === 'google_calendar')` config-normalization block right before the main switch, and `worker/src/shared/google-calendar-executor.ts`):

- **Scope decision**: this node's runtime executor (`executeGoogleCalendarOperation`) supports 9 distinct resources (`event`, `calendar`, `calendarList`, `eventInstance`, `acl`, `settings`, `colors`, `freebusy`, `watch`), each with its own operations — roughly 25+ resource.operation combinations total, on the same scale as `whatsapp`'s 29 operations. The visual panel's `resource` field is never exposed at all (always defaults to `event` internally), so only the `event` resource is reachable without hand-editing workflow JSON. Given that, this batch fully documented all 7 real `event`-resource operations (`list`, `create`, `update`, `delete` — the 4 in the visual dropdown — plus `get`, `quickAdd`, `move`, which are runtime-supported but not yet in the dropdown), and deliberately did **not** build out the other 8 resources, since none of them have any UI entry point at all (unlike `whatsapp`'s `contact`/`conversation`/`template` resources, which are legitimate business needs reachable only through AI generation). This is called out explicitly in the doc's top-level `description` and is a documented, reasoned scope boundary rather than a silent drop.
- **Confirmed real field-normalization behavior** (not a bug): the visual panel's `startTime`/`endTime`/`description` fields are flat strings/text, while the Calendar API and the executor's `GoogleCalendarOperationParams` expect `start`/`end` as objects (`{dateTime}`) and `description` nested inside `eventData`. A `google_calendar`-specific block in `execute-workflow.ts` (right before the main switch, not inside the `case` itself) converts `startTime` → `start.dateTime`, `endTime` → `end.dateTime`, and `description` → `eventData.description` automatically before the case handler runs. Documented this conversion explicitly in `startTimeHelpText`/`endTimeHelpText`/`descriptionHelpText` and added the raw `start`/`end`/`eventData` fields as advanced alternatives (needed anyway since they appear in the backend schema's `optionalConfig` and must be documented for coverage).
- **Pre-existing inaccuracy fixed**: `node-content-overrides.ts`'s `create`/`update` usage examples used `startDateTime`/`endDateTime` as field names, which do not exist anywhere in the schema or frontend (the real names are `startTime`/`endTime`). `nodeUsageGuides.ts` claimed the create/update output field was named `eventId`, but the executor returns Google's raw event resource merged directly into `$json`, whose ID field is `id`, not `eventId`. Both corrected.
- Runtime throws are wrapped into `_error`/`_errorDetails` by the `case 'google_calendar'` handler's catch block (unlike `google_sheets`, which lets `Error`s propagate unwrapped) — documented this per-operation via the shared `_error`/`_errorDetails` output-description terms.
- `resource`, `credentialId`, `start`, `end`, and `eventData` are all in the backend schema's `optionalConfig` (confirmed in `worker/public/node-library.json`) but not in the frontend `configFields` at all; `startTime`/`endTime` are the reverse (frontend-only, backend does not declare them). All were documented to satisfy the coverage test's union requirement, consistent with the `google_gmail`/`google_sheets` precedent for frontend-only/backend-only field mismatches.

`google_drive` completed files:

- `ctrl_checks/src/docs-content/nodes/google_drive.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected output examples; fixed `content`/`fileData` field-name confusion for upload)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (removed the false "Delete" claim, corrected output field names)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (corrected the `operation` field guide's Delete bullet to state it is non-functional)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleDriveDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_drive` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/core/registry/overrides/google-drive.ts`, `overrideGoogleDrive`, and `worker/src/core/registry/overrides/google-workspace-utils.ts`):

- This node has **no `case 'google_drive'` in `execute-workflow.ts` at all** — it is handled entirely through the unified registry override (`overrideGoogleDrive`), unlike `google_sheets`/`google_calendar`/`google_gmail`'s legacy-switch-case-based paths. Its `execute()` returns `{ success, output }` / `{ success: false, error: { code, message } }`, which `dynamic-node-executor.ts` turns into either the flattened `output` merged into `$json`, or `{ _error, _errorCode, _errorDetails, _nodeType }` on failure — the same normalized failure shape used for `whatsapp`.
- **Confirmed non-functional UI option**: `nodeTypes.ts`'s Operation dropdown lists `list`/`upload`/`download`/`delete`, but `overrideGoogleDrive`'s `execute()` only branches on `list`/`download`/`upload` — any other value (including `delete`) falls through to `throw new Error(\`Unsupported Google Drive operation: ${operation}\`)`. This is documented explicitly in the doc's operation-level help text, the `operation` field's dropdown-option explanation, and a dedicated `commonErrors` entry, rather than silently describing Delete as if it worked (which the pre-existing `nodeUsageGuides.ts`/`nodeGuides.ts` content did).
- The execute()'s success path returns `{ operation, data: output, ...output }` — a deliberate double-exposure where every key of the operation-specific `output` object is spread both under `data` and at the top level. Documented that fields are reliably accessible directly (e.g. `{{$json.id}}`, `{{$json.files}}`) without needing to drill into `{{$json.data.*}}`.
- Upload's real field name for file content is `fileData` (with `fileContent` and `dataBase64` as accepted aliases per `normalizeUploadPayload`), not `content` as the previous `node-content-overrides.ts` usage example incorrectly showed.
- Download's real content field is `dataBase64` for binary files (the common case — PDFs, images) or `content` for text/JSON files, verified via the `'dataBase64' in downloaded` branch check in `overrideGoogleDrive`; the previous `node-content-overrides.ts` example only showed the `content` (text) path, which would mislead someone downloading a typical binary file.
- Backend schema fields (`worker/public/node-library.json` `optionalConfig`: `operation`, `fileId`, `fileName`) and frontend `configFields` (`operation`, `folderId`, `fileId`, `fileName`, `fileData`, `mimeType`) were unioned per the coverage test's requirement; `pageSize` is runtime-accepted (`inputs.pageSize || 100`) but appears in neither list, so it was mentioned in prose within the List operation rather than given a dedicated required `FieldDoc` entry, to keep scope bounded.

`google_doc` completed files:

- `ctrl_checks/src/docs-content/nodes/google_doc.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (replaced the fabricated `read`/`create`/`update` set with accurate `read`/`write`/`create`/`append`)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the entire overview/inputs/outputs/example/tips block)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (corrected the `operation` field guide's terminology, fixed `title`/`content` field notes, added missing `documentUrl` and `format` field guides)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleDocDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_doc` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'google_doc'`):

- **Non-functional dropdown option found**: the `format` field (Output Format: text/markdown) is accepted by both frontend and backend schemas, but the `read` branch always extracts plain text via the same paragraph/textRun traversal regardless of its value — `format` is only echoed back in the output, never used to actually produce Markdown. Documented this plainly in `formatHelpText` and the field-guide entries, consistent with the `google_sheets`/`google_drive` precedent for non-functional-but-present fields.
- **`documentId` vs `documentUrl` visibility gap**: the frontend's `documentId` field has `visibleIf: { field: 'operation', equals: 'read' }`, so it is hidden for write/append — for those operations the only usable field in the visual panel is `documentUrl` (which works for every operation except `create`, since runtime extracts the ID from the URL via regex). Documented this explicitly per-operation rather than assuming both fields are always available.
- `write` deletes the entire existing document body (via a `deleteContentRange` batchUpdate request covering the whole document) before inserting new text, while `append` computes the insertion point just before the document's mandatory trailing newline — documented this distinction clearly since choosing the wrong one is a real risk of data loss.
- Three previously-fabricated fields (`title` and structured `body.content` for read; `revisionId` for create; a nonexistent `update` operation with a `replies` array) were removed everywhere they appeared, since none of them are ever produced by the actual `case 'google_doc'` handler.

`google_contacts` completed files:

- `ctrl_checks/src/docs-content/nodes/google_contacts.doc.ts` (fully rewritten)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (bug fix: `operation` dropdown's List Contacts value changed from `'list'` to `'read'`, `defaultConfig.operation` changed to `'read'`, and the Max Results field's key renamed from `maxResults` to `pageSize` to match what the executor actually reads)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected operation keys from the fabricated `list`/`create`/`get` set to the real `create`/`update`/`delete`/`read`, fixed output shapes)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the entire block)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (fixed the `operation` field guide, renamed `maxResults` → `pageSize` field-guide entry to match the frontend fix)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleContactsDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_contacts` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/core/registry/overrides/google-contacts.ts`, `overrideGoogleContacts`):

- **Real bug found and fixed** (not just documented, unlike this session's other non-functional-field findings): `nodeTypes.ts`'s Operation dropdown had `{ label: 'List Contacts', value: 'list' }` as both an option and the `defaultConfig`/`defaultValue`, but `overrideGoogleContacts`'s `execute()` only branches on `operation === 'read'` (plus `create`/`update`/`delete`) — any other value, including the node's own default, falls through to `throw new Error(\`Unsupported Google Contacts operation: ${operation}\`)`. This meant a freshly added `google_contacts` node, run with zero configuration changes, always failed. Grepped the rest of the worker codebase and `node-operation-semantics.ts`/`unified-node-registry.ts` for any `list`→`read` alias mapping (the kind `google_gmail`'s `startTime`→`start` normalization or Shopify's friendly-operation-name mapping use) and found none — this was a genuine, unmitigated mismatch, not an intentional alias.
- **Second bug found and fixed in the same batch**: the panel's "Max Results" field used key `maxResults`, but `overrideGoogleContacts`'s `execute()` reads `inputs.pageSize` (defaulting to 100) — `maxResults` is never read anywhere, so the field had zero effect even once the operation-value bug above is fixed. Renamed the field key to `pageSize` to match.
- Both fixes were judged safe to apply directly (unlike `google_drive`'s Delete, which has no backend implementation at all to wire up, or `google_sheets`'s `allowWrite`, which is an intentionally-inert reminder checkbox) because they were single-value/single-key corrections with no architectural scope, verified via grep that `maxResults`/`'list'` weren't referenced anywhere else (only this session's own new test file referenced the node at all), and the coverage test suite plus a full frontend build were used to confirm nothing broke.
- Output shape is `{ operation, data: <raw Google People API person-or-connections resource> }` — unlike `google_drive`, contact/person fields are **only** nested under `data`, never duplicated at the top level. Documented this distinction explicitly, since it's easy to assume Google nodes behave uniformly after seeing `google_drive`'s double-exposure pattern.
- `create`/`update` require at least one of `name`/`email`/`phone`/`contactData`; `update` additionally auto-fetches the existing contact's `etag` before sending the PATCH request (needed by the People API for optimistic concurrency) — this happens transparently and isn't a user-facing field.

`google_tasks` completed files:

- `ctrl_checks/src/docs-content/nodes/google_tasks.doc.ts` (fully rewritten)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (added the missing `status` field, `visibleIf` scoped to `operation === 'update'`, plus `status: ''` in `defaultConfig`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added the entire `google_tasks` block — it did not exist before)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (corrected the fabricated flat output shape to the real `{operation, data}` nesting)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added the missing `status` field guide entry)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleTasksDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_tasks` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/core/registry/overrides/google-tasks.ts`, `overrideGoogleTasks`):

- Confirmed this node's frontend dropdown does **not** have the `google_contacts`-style operation-value bug — `nodeTypes.ts` already used `read`/`create`/`update`/`delete` correctly, matching the executor's `if (operation === 'read')`/etc. branches exactly.
- `taskId` resolution is unusually resilient: `resolveTaskId()` checks the configured field first, then falls back through several common upstream shapes (`inputs.id`, `inputs.data?.id`, `inputs.task?.id`, and the same paths on `context.rawInput` and every upstream node's output) before giving up — meaning a workflow can often omit Task ID entirely on Update/Delete when it directly follows a Read/Create step, since the ID is auto-detected. Documented this in `taskIdHelpText` as a helpful implicit behavior, not just a required field.
- `due` accepts either a plain calendar date or a full RFC3339 timestamp (the executor extracts just the date portion and reconstructs a `T00:00:00.000Z` value), consistent with Google Tasks only storing day-level granularity — documented clearly that time-of-day is never preserved.
- Setting `status` to `completed` on `update` causes `withGoogleTasksCompletionFields()` to automatically stamp `completed` with the current server time; there is no way to set a custom completion timestamp through this field — documented as a common-mistake note.
- Output is `{ operation, data: <task-or-{items} object> }`, matching `google_contacts`'s nesting pattern (never spread at the top level, unlike `google_drive`) — kept the output-shape documentation consistent with that established distinction across the three People/Tasks/Contacts-style Google nodes audited this session.

`google_bigquery` completed files:

- `ctrl_checks/src/docs-content/nodes/google_bigquery.doc.ts` (fully rewritten)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed `datasetId`: `required: true` → `false`, relabeled "Dataset ID (reference only)", clarified helpText; clarified `query` helpText about needing full table qualification)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (removed the fabricated `insert` operation entirely; corrected `query`'s output shape)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the entire block to reflect the raw `{f: [{v}]}` row format and the non-required Dataset ID)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (clarified `datasetId` is reference-only, added missing `query` and `useLegacySql` field-guide entries)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleBigqueryDoc` import, `AUDITED_NODE_DOCS` entry, and a new `google_bigquery` `credentialKind` branch)

Key findings verified directly from runtime source (`worker/src/core/registry/overrides/google-bigquery.ts`, `overrideGoogleBigQuery`):

- **Non-functional required field found and fixed**: `datasetId` was marked `required: true` in `nodeTypes.ts`, forcing every user to fill it in, but `execute()` only ever reads `inputs.projectId`, `inputs.query`, and `inputs.useLegacySql` — `datasetId` is never referenced. Verified via full-text read of the override file. Made it optional and relabeled it clearly as a reference-only note, rather than silently leaving a mandatory field that does nothing (the query's own fully-qualified table paths are what actually matter).
- **Fabricated operation removed**: `node-content-overrides.ts` had a full `insert` operation entry (streaming inserts via `tableDataInsertAllResponse`) that has no corresponding code anywhere in the override — the executor only implements one operation, `query`, via BigQuery's synchronous `jobs.query` endpoint. Removed entirely rather than leaving a documented capability that doesn't exist.
- **Row-shape misconception corrected everywhere it appeared**: BigQuery's `jobs.query` REST response returns `rows` as an array of `{f: [{v: value}, ...]}` objects (values are always strings, in the same order as `schema.fields`) — not plain `{columnName: value}` objects. `node-content-overrides.ts` and `nodeUsageGuides.ts` both previously showed friendly flattened row examples that runtime never produces; a user following either would map `{{$json.rows[0].column1}}` and get `undefined`. All three files now show the raw shape and explain that a JavaScript node is needed to zip `schema.fields` names with each row's `f` values.
- Output is wrapped as `{ operation: 'query', data: <raw BigQuery response> }`, consistent with the `google_contacts`/`google_tasks` nesting-only pattern (no top-level field spread) established earlier in this session's Google audit.

`slack_webhook` completed files:

- `ctrl_checks/src/docs-content/nodes/slack_webhook.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the fully fabricated output shape)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the no-upstream-data-preserved and plain-`error`-field warnings)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added the same warning to the `message` field guide)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `slackWebhookDoc` import, `AUDITED_NODE_DOCS` entry, and a new `slack_webhook` `credentialKind` branch)

No changes were needed to `ctrl_checks/src/components/workflow/nodeTypes.ts` — its single `message` field already had adequate helpText.

`amazon_ses` completed files:

- `ctrl_checks/src/docs-content/nodes/amazon_ses.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the fully fabricated output shape)
- `ctrl_checks/src/docs-content/node-field-content.ts` (replaced wrong `to`/`from` field keys — which do not exist on this node — with all 13 real field keys)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added missing `subject`, `body`, `useTemplate`, `replyToAddresses`, `configurationSetName`, `tags`, `returnPath` field guides; kept and lightly extended the existing `recipients`/`fromAddress`/`awsRegion`/`templateName`/`templateData`/`attachments` entries)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `amazon_ses` entry — it did not exist before)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (corrected the inline `usageGuide` block's `outputs`/`tips` — no `configFields` changes; all 13 fields already existed with adequate helpText)
- `ctrl_checks/src/docs-content/search/amazon_ses.ts` (regenerated field/operation entries to match new field names and descriptions)
- `ctrl_checks/src/docs-content/manifest.ts` (updated the node description to match the rewritten doc)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `amazonSesDoc` import, `AUDITED_NODE_DOCS` entry, and a new `amazon_ses` `credentialKind` branch)

No changes were needed to `worker/src/credentials-system/credential-type-registry.ts` or `credential-guides.ts` — both already had accurate, detailed Amazon SES Access Key connection guidance (IAM steps, Access Key ID/Secret Access Key/region fields) from a prior session. `worker/src/api/connections-catalog.ts` has no `amazon_ses` entry, confirmed consistent with the pattern: that catalog only lists OAuth providers, and `amazon_ses` is an API-key credential type (same reason `discord_webhook`/`slack_webhook` are absent from it too).

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'amazon_ses'` and its ~15 helper functions spanning lines 1012–2254, e.g. `getAWSCredentials`, `resolveEmailTemplates`, `fetchAWSSESTemplate`, `processRecipients`/`validateRecipients`, `processAttachments`/`validateAttachmentSize`/`validateAttachmentFormat`, `constructEmailMessage`, `sendEmailWithRetry`/`sendEmailViaSES`, `classifyAWSError`/`formatErrorResponse`):

- **Major pre-existing inaccuracy fixed**: the previous `amazon_ses.doc.ts` and `node-content-overrides.ts` both fabricated the success output as the raw AWS SDK response shape `{MessageId, ResponseMetadata: {RequestId, HTTPStatusCode}}` (PascalCase, nested). The real `case 'amazon_ses'` handler never returns that shape — it returns a flattened, lowercase `{success, messageId, recipientCount, failedRecipients, attempts, timestamp}`. A user following the old docs would have mapped `{{$json.MessageId}}` and gotten `undefined`.
- **Real, previously-undocumented `_error` vs `error` split found** (same class of finding as `slack_webhook`'s plain-`error` convention, but more consequential here): every pre-flight validation failure (missing credentials format, missing subject/body, invalid recipients, sender format, attachment size/format, template-not-found) returns `_error` (underscore) + `success: false`. But actual AWS SES API failures — unverified sender, message rejected, rate limiting, **and also the single most common real-world failure: no AWS connection configured at all** — are caught by the outer `catch` block and go through `formatErrorResponse`, which returns a plain `error` field (no underscore) plus `errorCode`/`errorType`/`retryable`/`details`, with **no `_error` at all**. A workflow that only checks `{{$json._error}}` downstream (the convention used by most other audited nodes) will silently miss AWS-side send failures, including the "no AWS connection" case. This is called out explicitly in the field help text, the output description, and a dedicated `commonErrors` entry, and is genuinely more novel than an average dead-code finding because Phase 1's `if (!credentials)` check in the source is actually unreachable dead code — `getAWSCredentials` never returns falsy, it always either returns valid credentials or throws, so that branch's `_error` return is never hit in practice.
- **Undocumented constraint found and documented**: `validateAttachmentFormat` enforces a hard whitelist of attachment content types (PDF, Word `.doc`/`.docx`, Excel `.xls`/`.xlsx`, images `.jpg`/`.jpeg`/`.png`/`.gif`/`.webp`, `.txt`/`.csv`, `.zip`) and requires the file extension to match the declared `contentType`, plus a 40MB total-email-size cap (`validateAttachmentSize`) — none of this was mentioned anywhere in the previous docs, frontend helpText, or node guides. Documented in the `attachments` field guide, `node-field-content.ts`, `nodeGuides.ts`, and a dedicated `commonErrors` entry.
- **`failedRecipients` clarified as intentionally always-empty**: the field exists in the backend `outputSchema` and suggests per-recipient failure tracking, but the runtime hardcodes it to `[]` on every successful send — Amazon SES's `SendEmail`/`SendRawEmail` APIs are all-or-nothing per call, so there is no partial-failure data to report. Documented as expected behavior, not a bug, unlike the `google_drive` Delete or `google_sheets` `allowWrite` findings which were genuine dead ends.
- Confirmed the credential-alias chain end to end: a config-selected connection's `apiKey`/`secretKey` (the field names used by the `amazon_ses_access_key` credential type in `credential-type-registry.ts`) are aliased to `awsAccessKeyId`/`awsSecretAccessKey` by `mergeRuntimeCredentials` before `getAWSCredentials`/`validateAWSCredentialsStructure` read them — documented this passthrough in the credential setup steps rather than assuming a single unified field name.
- Type mismatches fixed in the doc: the previous `amazon_ses.doc.ts` marked `useTemplate` and `templateName` as `type: "textarea"` even though both are boolean/select-style fields in the real frontend `configFields` (`boolean` and `text` respectively) — corrected to `boolean` and `string`, and `awsRegion` was upgraded from a plain `string` field to a `select` field with all 7 real dropdown region options (`us-east-1`, `us-west-2`, `eu-west-1`, `eu-central-1`, `ap-southeast-1`, `ap-northeast-1`, `ap-southeast-2`) explained individually, since the frontend panel already renders it as a dropdown but the doc never described the options.
- `nodeUsageGuides.ts` had no `amazon_ses` entry at all before this batch (only the inline `usageGuide` block inside `nodeTypes.ts` existed, and its `outputs` list was missing `failedRecipients`/`attempts` and didn't mention the `_error`/`error` split) — added the missing `NODE_USAGE_GUIDES` entry and corrected the inline block, following the same "add the missing entry" precedent set by `discord` in an earlier batch.

`log_output` is also now audited and marked `Complete`. Unlike every communication/output node audited so far, it has **no credentials at all** and only 2 fields (`level`, `message`). Its most important, previously-undocumented-in-the-hand-authored-doc finding (though `nodeUsageGuides.ts` already had it half-right): this node's entire output is the resolved `message` string itself — there is no `{message, level}` wrapper object, no `success` field, and no `_error` field on any failure path, because there is nothing that can fail validation (both fields are fully optional). It is also always a structurally-enforced terminal node (`isTerminal: true`, `maxOutDegree: 0`) that accepts only a single incoming connection (`allowsMultipleInputs: false`), so — unlike `slack_webhook`'s "downstream fields don't survive" finding, which is a real footgun — here it is a non-issue in practice, since the workflow builder never allows a node to be placed after it at all. A field-level finding worth flagging: choosing `level: error` does **not** stop or fail the workflow (confirmed via `worker/src/core/execution/nodes/log-output-executor.ts` — `level` only selects which `console.*` method is used and the `[LOG LEVEL]` prefix); this was already correctly hinted at in the pre-existing frontend `helpText` ("Error = errors that don't stop workflow") but was not explained anywhere in the doc-facing content until this batch.

`log_output` completed files:

- `ctrl_checks/src/docs-content/nodes/log_output.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (relabeled the misleading `message`-keyed `outputExample` to a documentation-only `(entire output)` key, since the real output has no `message` key at all)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added the entire `log_output` block — it did not exist before)
- `ctrl_checks/src/docs-content/search/log_output.ts` (regenerated to match the new operation name and field descriptions)
- `ctrl_checks/src/docs-content/manifest.ts` (updated the node description to match the rewritten doc)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `logOutputDoc` import and an `AUDITED_NODE_DOCS` entry with `credentialKind` left as the default `'none'`)

No changes were needed to `ctrl_checks/src/components/workflow/nodeTypes.ts` (its `level`/`message` `configFields` already had adequate helpText, including an existing correct note that Error level doesn't stop the workflow) or `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (its existing `log_output` entry already correctly described the terminal, string-only output — no changes needed, unlike `amazon_ses` which had no entry at all). `ctrl_checks/src/components/workflow/nodeGuides.ts` intentionally has no `log_output` entry and none was added — that file is scoped to credential/API-key/URL acquisition guides specifically (per its own file header comment), and `log_output` has no credentials, API keys, or URLs to document.

Key findings verified directly from runtime source (`worker/src/core/execution/nodes/log-output-executor.ts` `executeLogOutputWithCache`, and `worker/src/core/registry/overrides/log-output.ts` `overrideLogOutput`, which both the legacy `execute-workflow.ts` `case 'log_output'` switch branch and the modern unified-registry execute() path route through):

- **Output shape confirmed as a bare string, not an object**: `executeLogOutputWithCache` returns `resolvedMessage` (a plain string) directly — not `{message, level}`. The legacy switch case (`execute-workflow.ts:5857`) returns this string directly as the node's entire result (the same pattern used by `text_formatter`'s `return formattedText;`), and the registry override wraps it as `{success: true, output: cleaned}`, which `dynamic-node-executor.ts` (`candidateOutput = result.output`) then returns as-is — a string, not an object — confirming both execution paths converge on identical behavior. `ctrl_checks/src/docs-content/node-content-overrides.ts`'s previous `outputExample: { message: '...' }` implied a real `message` key existed in the output; there is none, and this has been corrected to a documentation-only `(entire output)` label with an explanation in `outputDescription`.
- **`level` never affects control flow, confirmed from source**: `executeLogOutputWithCache`'s `switch (level)` only selects `console.error`/`console.warn`/`console.debug`/`console.log` and the `[LOG LEVEL]` string prefix — there is no throw, no early return, and no different behavior based on level beyond that. Documented explicitly as a dropdown-option explanation and a dedicated `commonErrors` entry, since "Error" reasonably invites the assumption that it behaves like the separate `stop_and_error` node.
- **Structural terminal/single-input constraints confirmed** from the override's own `workflowBehavior`/capability flags: `isTerminal: true`, `maxOutDegree: 0` (the workflow builder enforces zero outgoing connections), and `allowsMultipleInputs: false` (exactly one incoming connection only) — matching the override file's own code comment "each branch must have its own log_output instance." Documented in the node summary, connection setup steps, and a dedicated `commonErrors` entry about routing multiple branches into one shared node.
- No required fields exist at all (`requiredConfig: []` in both the backend schema and the operation contract) — this node cannot fail on missing input, which is unusual among audited nodes and is called out explicitly rather than assuming a generic "Required field missing" error applies.

`mailgun` completed files:

- `ctrl_checks/src/docs-content/nodes/mailgun.doc.ts` (fully rewritten, expanded from 11 documented fields to all 14 backend+frontend fields)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the output shape to include `mailgun` and clarified the no-`success:false`-on-failure behavior)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added the missing `operation` field entry to the existing `send_email` block)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added missing `operation`, `subject`, `cc`, `bcc`, `replyTo`, `tags`, `domain`, `apiKey` field guides; kept the existing `from`/`to`/`text`/`html`/`template`/`templateVariables` entries, which were already accurate)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `mailgun` entry — it did not exist before)
- `ctrl_checks/src/docs-content/search/mailgun.ts` (regenerated to include all 14 fields, up from 11)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `mailgunDoc` import, `AUDITED_NODE_DOCS` entry, and a new `mailgun` `credentialKind` branch)

No changes were needed to `ctrl_checks/src/components/workflow/nodeTypes.ts` (its 12 visible `configFields` already had adequate helpText — `domain`/`apiKey` are intentionally absent from the visual panel since they are credential-owned) or to `worker/src/credentials-system/credential-type-registry.ts`/`credential-guides.ts` (both already had accurate, detailed Mailgun API Key connection guidance — Private API Key, Sending Domain, US/EU Region — from a prior session).

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'mailgun'`, lines 4880–4994):

- **Recipient format differs from Amazon SES, previously undocumented as a contrast point**: `to`/`cc`/`bcc` on this node are plain comma-separated strings read directly via `getStringProperty`, not a JSON `{"to": [...]}` object like `amazon_ses`'s `recipients` field. Documented explicitly as a "common mistake" in the `to` field guide, since a user who just finished the `amazon_ses` node could reasonably expect the same JSON convention here.
- **No `success: false` on any failure path, confirmed by reading every return statement in the case block**: every failure (missing `domain`/`apiKey`/`from`/`to`, missing `text`/`html`/`template`, invalid `templateVariables` JSON, non-OK HTTP response, no response after retries, or a thrown exception) returns only `{...inputObj, _error: '...'}` (plus `_errorDetails` for HTTP-level failures) — there is no `success` key at all on failure, not even set to `false`. This is a smaller but real nuance versus `amazon_ses` (which does set `success: false` on every failure path) and was called out explicitly in the output description and a dedicated `commonErrors` entry.
- **Unlike `slack_webhook`, original upstream `$json` fields survive past this node** on both success and failure, since every return path spreads `...inputObj` first — confirmed this is the norm here rather than assuming uniform behavior across every audited communication node.
- **Built-in retry-with-backoff confirmed**: the fetch loop retries up to 3 total attempts on HTTP 429/500/502/503/504 responses with a `250ms * (attempt + 1)` delay between attempts, before giving up — this happens silently with no `attempts` output field (unlike `amazon_ses`, which does return `attempts`). Documented as an internal reliability behavior in the operation description and troubleshooting rather than a user-facing field.
- **`domain`/`apiKey` are schema-declared but frontend-invisible by design** (`ownership: 'credential'` in the backend schema, and absent from `nodeTypes.ts`'s `configFields`) — documented per the `google_gmail`/`google_calendar` precedent for backend-only fields that must still be documented for coverage, explaining plainly that they come from the selected Mailgun connection rather than being typed fields.
- Confirmed `region`/`baseUrl` are read directly from `config` (`getStringProperty(config, 'region', ...)`) but declared in **neither** the backend schema's `optionalConfig` nor the frontend `configFields` — both are purely credential-derived (from the parsed dashboard credential's `region`/`baseUrl`, or a legacy fallback), so no `FieldDoc` entry was created for them (consistent with the coverage test's union-of-declared-fields requirement), but `region`'s effect (US vs EU API endpoint selection) is explained in the `domain` field guide and the credential setup steps.

`sendgrid` is also now audited and marked `Complete`. Unlike `amazon_ses`/`mailgun`, its `doc.ts` and `search/sendgrid.ts` files already existed but used the thin, generator-template helpText ("What this field is: ... How to fill it: ... Example: ... Tip: ...") that fails the rich-helpText coverage check — both were fully rewritten. This node's standout finding is a genuine **scope limitation, not a bug**: the runtime executor (`case 'sendgrid'` in `execute-workflow.ts`) only ever reads `from`/`to`/`subject`/`text`/`html` from config — the backend schema's own `operationContracts[0].forbiddenFields` list explicitly names `apiKey`, `credentialId`, `templateId`, `dynamicTemplateData`, `categories`, `attachments`, `replyTo`, `cc`, `bcc` as fields the AI-generation pipeline must never try to set on this node, even though SendGrid's real Mail Send API supports every one of them. This is unlike Mailgun's node (same product category) which does support `cc`/`bcc`/`replyTo`/`template`/`templateVariables`. Documented explicitly as a dedicated `commonErrors` entry and in the node's top-level `description`, so a user is not misled into assuming feature parity between the two email-provider nodes.

`sendgrid` completed files:

- `ctrl_checks/src/docs-content/nodes/sendgrid.doc.ts` (fully rewritten from generator-template placeholder text; added the previously-undocumented `operation` field)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the output description to note the no-`success:false`-on-failure behavior and add `_error`/`_errorDetails`)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added the missing `operation` field entry to the existing `send_email` block)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added the entire `sendgrid` section — it did not exist before — covering `operation`, `from`, `to`, and `apiKey`)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `sendgrid` entry — it did not exist before)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (corrected the inline `usageGuide` block's `outputs`/`tips` to mention the scope limitation and the `_error`-only failure convention)
- `ctrl_checks/src/docs-content/search/sendgrid.ts` (regenerated to match the new description and add the missing `operation` field entry)
- `ctrl_checks/src/docs-content/manifest.ts` (updated the node description to match the rewritten doc)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `sendgridDoc` import, `AUDITED_NODE_DOCS` entry, and a new `sendgrid` `credentialKind` branch)

No changes were needed to `worker/src/credentials-system/credential-type-registry.ts`/`credential-guides.ts` (both already had accurate SendGrid API Key connection guidance — Restricted Access, Mail Send scope, Sender Authentication — from a prior session).

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'sendgrid'`, lines 4996–5069):

- **Scope limitation confirmed and documented** (see above) — this is the node's single most important finding, since it directly contradicts what a user familiar with SendGrid's real API (or with this product's own `mailgun` node) would reasonably expect to be configurable.
- **No `success: false` on failure, same nuance as `mailgun`**: every failure path (`apiKey`/`from`/`to` missing, non-202 HTTP response, thrown exception) returns only `{...inputObj, _error: '...', _errorDetails: ...}` — no `success` key at all on failure. Documented explicitly, consistent with the `mailgun` precedent from earlier in this same batch.
- **Neither Text nor HTML is actually required, confirmed as a real (if minor) gap versus Mailgun**: if both `text` and `html` resolve empty, the code pushes `{type: 'text/plain', value: ' '}` (a single space) as fallback content rather than returning an error — so this node silently sends a nearly-empty email instead of failing loudly. Documented as a "silent mistake" in the `text`/`html` field guides, in contrast to `mailgun`'s explicit `"Mailgun: text, html, or template is required"` validation.
- **`messageId` source confirmed**: it comes from the `x-message-id` response header on a 202 response (SendGrid's Mail Send endpoint has no JSON body on success) — not a JSON field, unlike `mailgun`'s `data.id`. This distinction was implicit in the pre-existing doc but is now stated explicitly.
- Credential flow confirmed end-to-end via `mergeRuntimeCredentials`'s alias table (`execute-workflow.ts:554`, `['token', 'apiKey']`): the `sendgrid_api_key` credential type stores the key under a field named `token`, which is aliased to the `apiKey` config key this node's `case` reads — verified this is not a bug by tracing `injectSelectedConnectionCredentials`, which runs generically for every node routed through `executeNodeLegacy` before the switch statement executes.

`twilio` is also now audited and marked `Complete`. Unlike `sendgrid`, this node's `doc.ts`/`node-content-overrides.ts`/`nodeGuides.ts`/`nodeUsageGuides.ts` files already existed with reasonably solid content from a prior session — the main gap was the doc.ts's `to`/`message` fields still using the thin generator-template helpText (fails the rich-helpText coverage check) while `from`/`messagingServiceSid`/`mediaUrl` had partial custom content; all 5 were rewritten to the full rich pattern. This node's standout finding: on any Twilio API-level send failure, the node's `_error` field is only a bare `"Twilio send failed (<status>)"` string with **no actual reason** — the real error message/code from Twilio lives only in `_errorDetails`, which every other audited email/SMS node in this batch (`mailgun`, `sendgrid`) does NOT need, since both of those extract a human-readable message into `_error` itself. This is a genuine, previously-undocumented inconsistency across the three "send external message" nodes completed in this session, called out explicitly in the field guides and a dedicated `commonErrors` entry.

`twilio` completed files:

- `ctrl_checks/src/docs-content/nodes/twilio.doc.ts` (fully rewritten)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added the `_error`-vs-`_errorDetails` nuance and clarified `status` is only the initial queue state, not final delivery)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed mojibake-corrupted `→` arrows in the `from`/`messagingServiceSid` helpText that had been mangled to `â†’`, and added a missing inline `usageGuide` block — this node previously had none)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (corrected the existing `twilio` entry's `outputs`/`tips` to mention `success` presence-on-success-only, the `_error`/`_errorDetails` split, and the trial-account Verified Caller ID restriction)
- `ctrl_checks/src/docs-content/search/twilio.ts` (regenerated to match the renamed "Send SMS/MMS" operation and updated field labels/descriptions)
- `ctrl_checks/src/docs-content/manifest.ts` (updated the node description to match the rewritten doc)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `twilioDoc` import, `AUDITED_NODE_DOCS` entry, and a new `twilio` `credentialKind` branch)

No changes were needed to `ctrl_checks/src/docs-content/node-field-content.ts` (already had accurate `to`/`from`/`message`/`messagingServiceSid`/`mediaUrl` entries) or `worker/src/credentials-system/credential-type-registry.ts`/`credential-guides.ts` (already had accurate Twilio Account Credentials connection guidance — Account SID, Auth Token, and the trial-account Verified Caller IDs note — from a prior session). `ctrl_checks/src/components/workflow/nodeGuides.ts` already had a reasonably thorough `twilio` section (`accountSid`, `authToken`, `from`) from a prior session and was left as-is, consistent with the "already adequate" precedent used for other nodes this session.

Key findings verified directly from runtime source (`worker/src/api/execute-workflow.ts` `case 'twilio'`, lines 4757–4878):

- **`_error` vs `_errorDetails` gap confirmed** (see above) — on a non-OK HTTP response, the code returns `{ ...inputObj, _error: \`Twilio send failed (${resp.status})\`, _errorDetails: data }`, with no extraction of Twilio's own `data.message`/`data.code`/`data.more_info` fields into `_error` at all, unlike `mailgun`'s `${(data as any)?.message || 'Unknown error'}` or `sendgrid`'s `${(data as any)?.errors?.[0]?.message || 'Unknown error'}` extraction patterns used earlier in this same file.
- **No `success: false` on failure, same nuance as `mailgun`/`sendgrid`**: every failure path (missing `to`/`message`, invalid E.164 format, missing credentials, missing `from`/`messagingServiceSid`, non-OK HTTP response, thrown exception) returns only `_error` (and `_errorDetails` for the HTTP case) — never a `success` key at all.
- **`status` is the initial queue status only, not final delivery confirmation**: Twilio's Messages API returns a status like `queued` or `sent` synchronously, then updates it asynchronously (`delivered`, `failed`, `undelivered`) via webhooks or polling that this node does not implement — documented explicitly so a workflow author does not mistake `{{$json.status}}` for proof of actual delivery.
- **Credential fallback format confirmed as unusually flexible**: the legacy vault fallback (reached only if `accountSid`/`authToken` are still empty after the modern connection-based injection) accepts three different raw storage shapes — a JSON object (`{accountSid|sid|username, authToken|token|password, from}`), a colon-separated `"sid:token"` string, or a bare token-only string — documented as an implementation detail in the credential setup steps rather than a normal user-facing field.
- Confirmed the `mergeRuntimeCredentials` alias chain (`execute-workflow.ts:560-561`, `['username', 'accountSid']` and `['password', 'authToken']`) correctly maps the `twilio_api_key` credential type's stored `username`/`password` fields (labeled "Account SID"/"Auth Token" in the Connections UI) to the `accountSid`/`authToken` config keys this node's `case` reads — same generic `injectSelectedConnectionCredentials` pre-switch mechanism verified for `sendgrid` earlier in this batch.

`whatsapp_cloud` is also now audited and marked `Complete`. **This batch included a real bug fix, not just documentation, on the scale of the `google_contacts` fix from an earlier session.** `whatsapp_cloud` is a fully deprecated node (`internalOnly: true`, empty `aiSelectionCriteria`, `label: 'WhatsApp Cloud (Deprecated)'`) whose entire execution is delegated verbatim to the `whatsapp` node's runtime via `worker/src/core/registry/overrides/whatsapp-cloud.ts`'s `overrideWhatsappCloud()`, which literally spreads `overrideWhatsapp(def, schema)` and only overrides `type`/`label`/`description`. Despite that, the frontend panel (`ctrl_checks/src/components/workflow/nodeTypes.ts`) had a config field keyed `message`, but the shared `whatsapp` executor (`worker/src/services/social/whatsapp-node.ts`'s `handleMessage`/`sendText`) only ever reads `params.text` — confirmed by grep that `config.message`/`params.message` appear nowhere in the WhatsApp send path. **Every message sent through this deprecated node's visual panel was going out with an empty body**, regardless of what a user typed into the "Message" field, because the field's value was never read at all. Fixed directly (small, safe, single-key rename, same class of fix as `google_contacts`'s `list`→`read` and `maxResults`→`pageSize` fixes): renamed the `configFields` key from `message` to `text` in `nodeTypes.ts`, updated `defaultConfig` to match, and grepped the rest of the frontend codebase (`contextualFieldGuides.ts`, `workflowValidation.ts`, `backendSupportedNodeOperations.ts`, `schemaConverter.ts`, and the relevant test files) to confirm nothing else depended on the old `message` key in a way that would break from this rename — `contextualFieldGuides.ts` already listed both `'text'` and `'message'` as recognized field names for this operation, so it required no change.

A second, smaller finding in the same file: the frontend `from`/`messagingServiceSid` helpText strings for **`twilio`** (fixed in the twilio batch above) had mojibake-corrupted `→` arrows (displaying as `â†’`) — likely from a prior encoding mismatch during a bulk edit; both were also fixed while in the file for this batch's twilio work.

`whatsapp_cloud` completed files:

- `ctrl_checks/src/docs-content/nodes/whatsapp_cloud.doc.ts` (fully rewritten — the previous version had 6 near-duplicate fabricated "operations" including a nonexistent `apiKey`/`credentialId` field pair that do not exist anywhere in the real backend schema, and an output shape claiming the raw Meta API response `{messaging_product, contacts, messages}` at the top level, when the real shared-executor output is `{success, data, _error, _errorCode, _errorDetails}` — the same wrapper shape already documented for the `whatsapp` node in a prior session)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (**bug fix**: renamed the dead `message` config field key to `text` to match what the shared runtime actually reads; updated `defaultConfig`; also fixed unrelated mojibake `→` corruption in the `twilio` node's helpText while in this file for the twilio batch)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the fabricated output shape and added the `message`-vs-`text` key-history note)
- `ctrl_checks/src/docs-content/node-field-content.ts` (rewrote the block: kept the already-correct `text`/`to` entries, fixed the fabricated `resource` description — the real values are `message`/`contact`/`conversation`/`template`/`campaign`/`aiAgent`, not `send_text`/`send_template`/`send_media`, which don't exist anywhere — and added `operation`/`messageType`/`mediaUrl` entries)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (corrected `inputs`/`outputs` and added tips explaining the deprecated scope and the historical `message`-key bug)
- `ctrl_checks/src/docs-content/search/whatsapp_cloud.ts` (fully replaced — the previous version had 1,164 lines describing 24 duplicate fabricated operation blocks, all sharing the same wrong fields; rewritten to a clean, accurate single-operation index)
- `ctrl_checks/src/docs-content/manifest.ts` (updated the node description to match the rewritten doc)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `whatsappCloudDoc` import and an `AUDITED_NODE_DOCS` entry reusing the existing `whatsapp` `credentialKind` branch, since this node shares the identical WhatsApp Business API connection with no separate credential type)

Grepped `ctrl_checks/src/lib/contextualFieldGuides.ts`, `workflowValidation.ts`, `backendSupportedNodeOperations.ts`, `schemaConverter.ts`, and `src/lib/__tests__/integrationLogos.test.ts`/`contextualFieldGuides.test.ts` before making the `message`→`text` rename to confirm no other file depended on the old key in a way that would break — none did.

Key findings verified directly from runtime source (`worker/src/core/registry/overrides/whatsapp-cloud.ts`, `worker/src/core/registry/overrides/whatsapp.ts`, `worker/src/services/social/whatsapp-node.ts`, and `worker/src/services/nodes/node-library.ts`'s `createWhatsappCloudSchema`):

- **The `message`-field bug** (see above) — this is the headline finding of the entire batch.
- **Backend schema confirms this node is intentionally hidden from new-workflow generation**: `aiSelectionCriteria.whenToUse: []`, `whenNotToUse: ['Always — this node is deprecated, use the WhatsApp node instead']`, and `keywords: ['deprecated_whatsapp_cloud_legacy_alias']` — the class-level doc comment states it exists "only so existing saved workflows referencing type 'whatsapp_cloud' keep working."
- **`resource`/`operation` are backend-required but panel-invisible, always fixed to `message`/`sendText`**: the frontend panel exposes no way to set either field, and the shared executor's own `defaultConfig()` (inherited via the `{...whatsapp}` spread) supplies `resource: 'message', operation: 'sendText'` regardless of what workflow JSON contains — documented as backend-only, always-fixed fields rather than inventing a fake "Resource dropdown" the way the previous doc did.
- **`phoneNumberId`/`mediaUrl` are backend-declared but panel-invisible too**: both exist in `node-library.json`'s `optionalConfig` for this node type (confirming legacy workflows could have set them via direct JSON), but neither is exposed in `nodeTypes.ts`'s `configFields` — documented as reachable only by editing workflow JSON directly, with a pointer to the WhatsApp node's fully-exposed equivalents.
- Confirmed via the override file's own code comment that this node "never reads accessToken/phoneNumberId from node config" for authentication — credentials always come from the shared WhatsApp Business API connection (Facebook/Meta OAuth), identical to the already-documented `whatsapp` node; no separate credential type exists for `whatsapp_cloud`.

The next high-impact incomplete node is `chat_trigger`, since the Google trigger group is now fully audited.

Do not mark the Google trigger nodes or any later node complete until the full per-node checklist and focused verification pass.

`zoom_video` is also now audited and marked `Complete`. The backend schema (`worker/src/services/nodes/node-library.ts`'s `createZoomVideoSchema()`), public library, generated operation contracts, frontend panel, and runtime executor all agree on five implemented operations: `createMeeting`, `listMeetings`, `getMeeting`, `updateMeeting`, and `deleteMeeting`. The runtime executor is the legacy `case 'zoom_video'` path in `worker/src/api/execute-workflow.ts`, reached through `worker/src/core/registry/overrides/zoom-video.ts`'s `executeViaLegacyExecutor` adapter. No runtime operation mismatch was found: the visual panel already exposes all five operations, `meetingId` is required for get/update/delete, and `topic`/`duration`/`startTime` are optional for create/update. Runtime-specific behavior now documented: create defaults `topic` to `Meeting`, `duration` to `60`, blank `startTime` creates an instant meeting, update/delete return small `{updated/deleted, meetingId}` confirmation objects after HTTP 204, and create/list/get return raw Zoom API data under `data`.

`zoom_video` completed files:

- `ctrl_checks/src/docs-content/nodes/zoom_video.doc.ts` (fully rewritten with all five operations, required/optional fields, rich field help, realistic examples, runtime-aligned output shapes, connection setup, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/zoom_video.ts` (expanded operation, field, connection, output, and permission search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added rich operation-specific field guidance for `operation`, `topic`, `duration`, `startTime`, and `meetingId`; parked the old short create-only block as legacy notes)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (expanded output examples and usage examples for all five operations)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Zoom panel help text only; no field keys or operation values changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Zoom usage guide with inputs, outputs, examples, and tips)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added Zoom field-level guide entries)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Zoom description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `zoomVideoDoc` coverage and a `zoom` credential branch)

Key credential findings verified from `worker/src/core/registry/overrides/zoom-video.ts`, `worker/src/credentials-system/credential-type-registry.ts`, and `worker/src/credentials-system/credential-guides.ts`:

- Credential provider is `zoom`; credential type is `zoom_oauth2`.
- Required OAuth scopes are `meeting:write:meeting`, `meeting:read:meeting`, `meeting:read:list_meetings`, and `user:read:user`.
- Test request calls `https://api.zoom.us/v2/users/me`.
- OAuth access/refresh tokens belong in Connections and the credential vault; normal workflow fields should hold meeting values such as topic, time, duration, and meeting ID only.
- Downstream nodes such as Gmail, Slack, or Google Calendar still need their own account connection after Zoom creates or reads a meeting.

`discord_trigger` is also now audited and marked `Complete`. Runtime is intentionally split: `worker/src/core/registry/overrides/discord-trigger.ts` is passive during ordinary workflow execution and returns `{ success: true, output: { triggered: false } }`, while real starts are handled by `worker/src/api/discord-trigger.ts` and `worker/src/services/discord/discord-trigger-service.ts`. The Discord API handler validates signed requests, handles Discord ping responses, checks workflow status, normalizes interactions/webhook events/message-like events, filters them with `shouldAcceptDiscordEvent`, creates one execution per accepted event, and hands off to `/api/execute-workflow` using the internal Discord trigger headers. This passive-vs-real-time behavior is now documented plainly so users do not expect a manual run of the trigger node to simulate Discord traffic.

`discord_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/discord_trigger.doc.ts` (fully rewritten with all eight backend/frontend fields, real-time trigger behavior, normalized output shape, setup, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/discord_trigger.ts` (rewritten with operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added operation-specific field guidance for `eventTypes`, `guildIds`, `channelIds`, `allowedUserIds`, `commandFilter`, `applicationId`, `publicKey`, and `validateSignature`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added real output and usage override for the receive operation)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Discord Trigger panel help text and usage setup; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Discord Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Discord Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `discordTriggerDoc` coverage and a `discord_trigger` credential branch)

Key findings verified directly from `worker/src/api/discord-trigger.ts`, `worker/src/services/discord/discord-trigger-service.ts`, `worker/src/core/registry/overrides/discord-trigger.ts`, `worker/src/services/nodes/node-library.ts`, and the Discord credential registry/guides:

- Backend/frontend fields match: `eventTypes`, `guildIds`, `channelIds`, `allowedUserIds`, `commandFilter`, `applicationId`, `publicKey`, and `validateSignature`.
- The registry override also understands credential-owned `connectionId`, but the visual panel does not expose it; registration and lookup resolve through saved Discord Bot Token connections and connection references.
- The trigger normalizes outputs to top-level fields including `eventId`, `eventType`, `text`, `userId`, `username`, `guildId`, `channelId`, `messageId`, `command`, `interactionToken`, `applicationId`, `responseUrl`, `rawEventType`, `raw`, `sessionId`, and `_discord`.
- `validateSignature` checks Discord `X-Signature-Ed25519` and `X-Signature-Timestamp` and rejects timestamps older than five minutes.
- Discord Bot Token connections can store bot token, public key, and application ID. The worker tests bot credentials with `https://discord.com/api/v10/users/@me`.
- Public Key Fallback is a runtime fallback only; the preferred place is the Discord Bot Token connection or `DISCORD_PUBLIC_KEY`.
- Downstream Discord replies still need a Discord action node and Discord Bot Token connection with server/channel permissions.

`google_sheets_trigger` is also now audited and marked `Complete`. Runtime behavior is polling-based, not real-time push: `worker/src/api/google-sheets-trigger.ts` registers/unregisters polling for active workflows, while `worker/src/services/google-sheets/google-sheets-trigger-service.ts` captures an activation baseline and polls all active Google Sheets Trigger nodes about every two minutes. The registry override (`worker/src/core/registry/overrides/google-sheets-trigger.ts`) is intentionally passive during ordinary workflow execution and returns a non-triggered result; real executions are created by the polling service when an accepted row event is found.

`google_sheets_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/google_sheets_trigger.doc.ts` (fully rewritten with all five backend/frontend fields, baseline behavior, polling caveats, normalized output shape, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/google_sheets_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `spreadsheetId`, `sheetName`, `hasHeaderRow`, `eventTypes`, and `query`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned polling output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Google Sheets Trigger panel help text and usage setup; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Google Sheets Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Google Sheets Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleSheetsTriggerDoc` coverage and a `google_sheets_trigger` credential branch)

Key findings verified directly from `worker/src/api/google-sheets-trigger.ts`, `worker/src/services/google-sheets/google-sheets-trigger-service.ts`, `worker/src/core/registry/overrides/google-sheets-trigger.ts`, `worker/src/services/nodes/node-library.ts`, and the Google credential registry/catalog/guides:

- Backend/frontend fields match: `spreadsheetId`, `sheetName`, `hasHeaderRow`, `eventTypes`, and `query`; the override also supports credential-owned `connectionId`/connection references, but the visual panel does not expose it as a normal field.
- Google Sheets does not provide native push notifications for cell changes, so CtrlChecks polls about every two minutes with `node-cron` (`*/2 * * * *`).
- Activation/register captures the current row count and up to 5000 row hashes as baseline state in Redis for 30 days, so pre-existing rows do not trigger.
- `row_added` fires only for rows with indexes beyond the saved baseline row count; `row_updated` fires when an existing tracked row hash changes.
- `eventTypes` defaults to `row_added`; it accepts comma/newline text or arrays and normalizes spaces/hyphens to underscores.
- `query` is a simple case-insensitive keyword filter against joined row text, not a formula or expression.
- When `hasHeaderRow` is true, row 1 becomes the header used to build `$json.row`; when false, `$json.row` is empty and downstream mappings should use `$json.values[n]`.
- Blank `sheetName` fetches range `A:ZZ` from the default/first sheet; a filled `sheetName` fetches that exact tab.
- Normalized trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `spreadsheetId`, `sheetName`, `rowNumber`, `values`, `row`, `raw`, plus runtime handoff fields `trigger`, `workflow_id`, `node_id`, `sessionId`, and `_googleSheets`.
- Google OAuth2 is the credential type. The runtime asks for Sheets read access; the current Google OAuth connection includes the Sheets scope. The connected Google account still needs Viewer access or Editor access to the spreadsheet, and downstream service nodes still need their own account connections.

`google_calendar_trigger` is also now audited and marked `Complete`. Runtime is split between a passive registry override and real push-channel execution: `worker/src/core/registry/overrides/google-calendar-trigger.ts` returns `{ success: true, output: { triggered: false } }` during ordinary node execution, while `worker/src/api/google-calendar-trigger.ts` handles Google webhook notifications and `worker/src/services/google-calendar/google-calendar-trigger-service.ts` registers, validates, renews, and syncs Google Calendar watch channels.

`google_calendar_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/google_calendar_trigger.doc.ts` (fully rewritten with all three backend/frontend fields, channel registration, sync-token behavior, normalized output shape, setup, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/google_calendar_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `calendarId`, `eventTypes`, and `query`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Google Calendar Trigger panel help text and usage setup; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Google Calendar Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Google Calendar Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleCalendarTriggerDoc` coverage and a `google_calendar_trigger` credential branch)

Key findings verified directly from `worker/src/api/google-calendar-trigger.ts`, `worker/src/services/google-calendar/google-calendar-trigger-service.ts`, `worker/src/core/registry/overrides/google-calendar-trigger.ts`, `worker/src/services/nodes/node-library.ts`, and the Google credential scope registry/catalog/guides:

- Backend/frontend fields match: `calendarId`, `eventTypes`, and `query`; the override/service also understands credential-owned `connectionId`/connection references, but the visual panel does not expose it as a normal field.
- Google Calendar Trigger uses Google push notification channels, not polling. Activation registers a Google `web_hook` channel pointed at the generated CtrlChecks webhook URL.
- `PUBLIC_BASE_URL` is required both to register watch channels and to hand accepted events off to workflow execution.
- Channel state is stored in Redis under `gcal:channel:${workflowId}:${nodeId}` with channel ID, resource ID, shared channel token, calendar ID, sync token, expiration, user, connection, workflow, and node IDs.
- Watch channels are requested with a roughly 7-day lifetime, Redis state keeps a 9-day TTL buffer, and a renewal scheduler runs every 6 hours to refresh expiring channels.
- Google sends an initial `sync` notification when a channel is created; the handler acknowledges it but does not start the workflow.
- After a real notification, CtrlChecks validates the stored channel ID/token, fetches changed events with the saved sync token, stores the next sync token, and starts one execution per accepted event.
- If Google returns sync-token status 410, the service reseeds with a fresh full sync and emits no replay events.
- `eventTypes` defaults to `event_changed,event_cancelled`; `event_changed` covers created or updated events, and `event_cancelled` covers events with Google status `cancelled`.
- `query` is a simple case-insensitive filter against event `subject` plus description `text`.
- Normalized trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `calendarId`, `eventIdRaw`, `subject`, `organizer`, `start`, `end`, `attendees`, `htmlLink`, `raw`, plus runtime handoff fields `trigger`, `workflow_id`, `node_id`, `sessionId`, and `_googleCalendar`.
- Google OAuth2 is the credential type. The runtime asks for `https://www.googleapis.com/auth/calendar.events`; the connected Google account needs access to the watched calendar, and downstream service nodes still need their own account connections.

`google_drive_trigger` is also now audited and marked `Complete`. Runtime is split between a passive registry override and real push-channel execution: `worker/src/core/registry/overrides/google-drive-trigger.ts` returns `{ success: true, output: { triggered: false } }` during ordinary node execution, while `worker/src/api/google-drive-trigger.ts` handles Google webhook registration/notifications and `worker/src/services/google-drive/google-drive-trigger-service.ts` registers, validates, renews, and syncs Google Drive watch channels.

`google_drive_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/google_drive_trigger.doc.ts` (fully rewritten with all three backend/frontend fields, push notification behavior, page-token baseline behavior, normalized output shape, setup, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/google_drive_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `folderId`, `eventTypes`, and `query`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Google Drive Trigger panel help text and usage setup; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Google Drive Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Google Drive Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `googleDriveTriggerDoc` coverage and a `google_drive_trigger` credential branch)

Key findings verified directly from `worker/src/api/google-drive-trigger.ts`, `worker/src/services/google-drive/google-drive-trigger-service.ts`, `worker/src/core/registry/overrides/google-drive-trigger.ts`, `worker/src/services/nodes/node-library.ts`, and the Google credential scope registry/catalog/guides:

- Backend/frontend fields match: `folderId`, `eventTypes`, and `query`; the override/service also understands credential-owned `connectionId`/connection references, but the visual panel does not expose it as a normal field.
- Google Drive Trigger uses Google Drive `changes.watch` push channels, not polling. Activation registers a Google `web_hook` channel pointed at the generated CtrlChecks webhook URL.
- `PUBLIC_BASE_URL` is required both to register watch channels and to hand accepted events off to workflow execution.
- Channel state is stored in Redis under `gdrive:channel:${workflowId}:${nodeId}` with channel ID, resource ID, shared channel token, folder/query filters, page token, expiration, user, connection, workflow, and node IDs.
- Watch channels are requested with a roughly 7-day lifetime, Redis state keeps a 9-day TTL buffer, and a renewal scheduler runs every 6 hours to refresh channels expiring within 2 days.
- Activation captures a fresh `/changes/startPageToken`, so old Drive changes do not replay; Google's initial `sync` notification is acknowledged but does not start the workflow.
- After a real notification, CtrlChecks validates the stored channel ID/token, fetches Drive `changes` with the saved page token, stores the next token, and starts one execution per accepted file change.
- If Google returns an expired changes token with status 404, the service reseeds with a fresh start page token and emits no replay events.
- `folderId` is checked against file `parents` after metadata is fetched; deleted or removed changes may not pass a folder filter if Drive no longer returns parent metadata.
- `eventTypes` defaults to `file_changed,file_deleted`; `file_changed` covers created/updated/metadata changes, and `file_deleted` covers removed or trashed files.
- `query` is a simple case-insensitive filter against the Drive file name only, not full text search or Drive query syntax.
- Normalized trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `fileId`, `name`, `mimeType`, `parents`, `modifiedTime`, `webViewLink`, `raw`, plus runtime handoff fields `trigger`, `workflow_id`, `node_id`, `sessionId`, and `_googleDrive`.
- Google OAuth2 is the credential type. The runtime asks for Drive read access (`https://www.googleapis.com/auth/drive.readonly`); the current Google OAuth connection includes broad Drive scope. The connected Google account needs Viewer or Editor access to watched files/folders, and downstream service nodes still need their own account connections.

`gmail_trigger` is also now audited and marked `Complete`. Runtime is split between a passive registry override and real Pub/Sub push execution: `worker/src/core/registry/overrides/gmail-trigger.ts` returns `{ success: true, output: { triggered: false } }` during ordinary node execution, while `worker/src/api/gmail-trigger.ts` receives Pub/Sub pushes and `worker/src/services/gmail/gmail-trigger-service.ts` validates push auth, registers Gmail watches, renews watches, fetches Gmail history, filters events, and builds workflow execution input.

`gmail_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/gmail_trigger.doc.ts` (fully rewritten with all seven frontend fields, Pub/Sub topic setup, OIDC/shared-secret validation behavior, Gmail history baseline behavior, normalized output shape, setup, connection guidance, examples, common mistakes, and troubleshooting)
- `ctrl_checks/src/docs-content/search/gmail_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `pubsubTopic`, `eventTypes`, `labelIds`, `query`, `validateAuth`, `audience`, and `validationSecret`)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Gmail Trigger panel help text and usage setup; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added Gmail Trigger usage guide)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides)
- `ctrl_checks/src/docs-content/manifest.ts` (updated Gmail Trigger description)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `gmailTriggerDoc` coverage and a `gmail_trigger` credential branch)

Key findings verified directly from `worker/src/api/gmail-trigger.ts`, `worker/src/services/gmail/gmail-trigger-service.ts`, `worker/src/core/registry/overrides/gmail-trigger.ts`, `worker/src/services/nodes/node-library.ts`, and the Google credential scope registry/catalog/guides:

- Backend required config is `pubsubTopic`; backend optional config is `eventTypes`, `labelIds`, `query`, and `validateAuth`. The frontend/override also expose `audience` and credential-owned `validationSecret`; the override also understands credential-owned `connectionId`.
- Gmail Trigger uses Gmail `users.watch` plus Google Cloud Pub/Sub push notifications. The user/admin must create the Pub/Sub topic and push subscription, grant Pub/Sub Publisher to `gmail-api-push@system.gserviceaccount.com`, and point the subscription to the generated CtrlChecks webhook URL.
- `PUBLIC_BASE_URL` is required both to return/register the Gmail webhook URL and to hand accepted events off to workflow execution.
- Push auth validation accepts either a matching shared Validation Secret (or `GMAIL_PUBSUB_TOKEN`) via `token` query/header or a Google-signed OIDC bearer token. If `audience` is empty, the expected OIDC audience defaults to the generated webhook URL.
- Watch state is stored in Redis under `gmail:watch:${workflowId}:${nodeId}` with history ID, expiration, topic name, label IDs, user, connection, workflow, and node IDs.
- Gmail watches expire after roughly 7 days, Redis state keeps a 9-day TTL buffer, and a renewal scheduler runs every 6 hours to refresh watches expiring within 2 days.
- Registration stores the Gmail `historyId` returned by `users.watch`. If the first notification arrives before state exists, CtrlChecks seeds state from that notification and skips replaying old mailbox history.
- After a real notification, CtrlChecks decodes the Pub/Sub envelope, gets the connected Google token, fetches Gmail history from the stored `historyId`, updates the stored history cursor, filters accepted events, and starts one execution per accepted event.
- If Gmail returns history status 404 because the stored history ID is too old, the service emits no replay events for the unrecoverable gap.
- `eventTypes` defaults to `message_added`; supported values are `message_added`, `label_added`, `label_removed`, and `message_deleted`.
- `labelIds` is an allowlist against returned Gmail API label IDs. `query` is a simple case-insensitive filter against subject, sender, and snippet; it is not Gmail search syntax.
- Deleted-message events may not have normal subject/from/to/snippet metadata because the runtime cannot fetch metadata for deleted messages.
- Normalized trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `emailAddress`, `historyId`, `messageId`, `threadId`, `subject`, `from`, `to`, `snippet`, `labelIds`, `raw`, plus runtime handoff fields `trigger`, `workflow_id`, `node_id`, `sessionId`, and `_gmail`.
- Google OAuth2 is the credential type. The runtime asks for Gmail read access (`https://www.googleapis.com/auth/gmail.readonly`); the shared Google OAuth connection may also include `gmail.send` for the Google Gmail action node. Downstream service nodes still need their own account connections.

### Verification Already Run

The exact glob command requested earlier:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/**tests**/manual-trigger-doc-coverage.test.ts src/components/docs/**tests**/FieldsTable.test.tsx
```

failed with `No test files found` because PowerShell/Vitest treated the glob literally.

The equivalent explicit focused command was run instead:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed after the Telegram batch with 115 tests passing.

Frontend build was also run:

```powershell
cd ctrl_checks
npm run build
```

It passed after the Telegram batch. The only warning was the existing Browserslist/caniuse-lite freshness warning.

After the `whatsapp` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 121 tests passing (120 doc-coverage + 1 FieldsTable). The related node-specific test `src/components/workflow/__tests__/whatsapp-trigger-node-types.test.ts` was also run and passed (2 tests) after being updated to expect the expanded 9-value operation dropdown.

`npm run build` (frontend) was re-run after the `whatsapp` batch and passed with only the pre-existing Browserslist warning.

`npm run type-check` and `npm run build` (worker) were both re-run after the `whatsapp` batch and passed with exit code 0. No worker source files were changed in the `whatsapp` batch, so this only confirms no regression; `worker/public/node-library.json` gets regenerated by `npm run build` and will show as a diff purely from that deterministic export step, not from a `whatsapp`-specific change.

Historical note from the `whatsapp` batch: while running the broader (non-focused) `npx vitest run` sweep, 12 unrelated pre-existing failures were observed in `src/__tests__/registry-metadata-contract.test.ts`, including then-current `facebook_trigger` and `github_trigger` `password` configField failures plus a `linear_trigger` `checkbox` configField failure. Correction after the `facebook_trigger`/`github_trigger`/`gitlab_trigger` batches: Facebook Trigger, GitHub Trigger, and GitLab Trigger no longer appear in that failure list because their secret fields now use supported type `text`; the remaining metadata-contract failures are tracked in the later verification notes and Required Next Cloud Prompt below.

After the `discord`/`discord_webhook` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 133 tests passing (132 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `discord`/`discord_webhook` assertions or `credentialKind` branches.

`npm run build` (frontend) was re-run after the `discord`/`discord_webhook` batch and passed with only the pre-existing Browserslist warning.

`npm run type-check` and `npm run build` (worker) were both re-run after the `discord`/`discord_webhook` batch and passed with exit code 0. No worker source files were changed in this batch (only frontend `docs-content`/`components` files), so this only confirms no regression; `worker/public/node-library.json` gets regenerated by `npm run build` and will show as a diff purely from that deterministic export step, not from a `discord`-specific schema change.

After the `google_gmail` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 139 tests passing (138 doc-coverage + 1 FieldsTable) on the first attempt.

`npm run build` (frontend) was re-run after the `google_gmail` batch and passed with only the pre-existing Browserslist warning. This batch did touch `nodeTypes.ts` (added 4 new config fields), so the build serves as a real regression check, not just a no-op confirmation.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_gmail` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_sheets` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 145 tests passing (144 doc-coverage + 1 FieldsTable) on the first attempt.

`npm run build` (frontend) was re-run after the `google_sheets` batch and passed with only the pre-existing Browserslist warning. No `nodeTypes.ts` changes were needed for this node (unlike `google_gmail`), since the existing `data` field already covers everything `values` would, and `data` takes precedence at runtime.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_sheets` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_calendar` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 151 tests passing (150 doc-coverage + 1 FieldsTable). Two initial issues were caught and fixed before this passed: two operation `description` strings (`list`, `delete`) were originally under the required 100-character minimum, and one operation's (`move`) `expectedOutput` string was missing the required `{{$json.` substring — both were lengthened/corrected, then the suite passed clean.

`npm run build` (frontend) was re-run after the `google_calendar` batch and passed with only the pre-existing Browserslist warning.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_calendar` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_drive` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 157 tests passing (156 doc-coverage + 1 FieldsTable). One issue was caught and fixed before this passed: the "Download File" operation's `description` was originally 59 characters (under the required 100-character minimum) and was lengthened.

`npm run build` (frontend) was re-run after the `google_drive` batch and passed with only the pre-existing Browserslist warning.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_drive` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_doc` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 163 tests passing (162 doc-coverage + 1 FieldsTable). Three operation `description` strings (`read`, `write`, `append`) were originally under the required 100-character minimum and were lengthened before this passed.

`npm run build` (frontend) was re-run after the `google_doc` batch and passed with only the pre-existing Browserslist warning.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_doc` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_contacts` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 169 tests passing (168 doc-coverage + 1 FieldsTable). Two issues were caught and fixed before this passed: the "Delete Contact" operation's `description` was originally under the 100-character minimum, and the "List Contacts" `usageExample.scenario` was originally under the 40-character minimum — both were lengthened.

`npm run build` (frontend) was re-run after the `google_contacts` batch and passed with only the pre-existing Browserslist warning. This batch changed `nodeTypes.ts` (the operation-value and field-key bug fixes), so the build serves as a real regression check.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_contacts` batch and passed with exit code 0, even though no worker source files were changed in this batch (the fix was entirely frontend-side, matching what the worker already expected).

After the `google_tasks` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 175 tests passing (174 doc-coverage + 1 FieldsTable). Three operation `description` strings (`read`, `create`, `delete`) were originally under the 100-character minimum and were lengthened before this passed.

`npm run build` (frontend) was re-run after the `google_tasks` batch and passed with only the pre-existing Browserslist warning. This batch added a new field to `nodeTypes.ts`, so the build serves as a real regression check.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_tasks` batch and passed with exit code 0, even though no worker source files were changed in this batch.

After the `google_bigquery` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 181 tests passing (180 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions this time.

`npm run build` (frontend) was re-run after the `google_bigquery` batch and passed with only the pre-existing Browserslist warning. This batch changed `nodeTypes.ts` (the `datasetId` required-flag fix), so the build serves as a real regression check.

`npm run type-check` and `npm run build` (worker) were both re-run after the `google_bigquery` batch and passed with exit code 0, even though no worker source files were changed in this batch. This completes the entire Google node group for this audit.

After the `slack_webhook` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 187 tests passing (186 doc-coverage + 1 FieldsTable) on the first attempt.

`npm run build` (frontend) was re-run after the `slack_webhook` batch and passed with only the pre-existing Browserslist warning.

**The worker `npm run type-check && npm run build` re-run for the `slack_webhook` batch was not completed before this session was interrupted.** No worker source files were touched in this batch (only `ctrl_checks` docs-content/components files), so this is expected to pass cleanly, but run it as the first action of the next session to confirm before continuing to the next node.

At the start of this session, `cd worker && npm run type-check` and `npm run build` were both re-run to confirm the `slack_webhook` batch left the worker clean — both passed with exit code 0, confirming the note above.

After the `amazon_ses` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 193 tests passing (192 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `amazon_ses` assertions or `credentialKind` branch.

`npm run build` (frontend) was re-run after the `amazon_ses` batch and passed cleanly (only the pre-existing Browserslist/caniuse-lite freshness warning, if any).

`npm run type-check` (worker) was re-run after the `amazon_ses` batch and passed with exit code 0, even though no worker source files were changed in this batch (only `ctrl_checks` docs-content/components files).

After the `log_output` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 199 tests passing (198 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `log_output` assertions.

`npm run build` (frontend) was re-run after the `log_output` batch and passed cleanly in about 1m28s with no new warnings.

No worker files were touched in the `log_output` batch, so the worker type-check/build re-confirmation from the start of this session (which already passed) remains valid; it was not re-run a second time for this specific batch.

After the `mailgun` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 205 tests passing (204 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `mailgun` assertions or `credentialKind` branch.

`npm run build` (frontend) was re-run after the `mailgun` batch and passed cleanly in about 18.5s with no new warnings.

No worker files were touched in the `mailgun` batch either, so the worker type-check/build confirmation from the start of this session remains the most recent valid one.

After the `sendgrid` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 211 tests passing (210 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `sendgrid` assertions or `credentialKind` branch.

`npm run build` (frontend) was re-run after the `sendgrid` batch and passed cleanly in about 16.5s with no new warnings.

No worker files were touched in the `sendgrid` batch either, so the worker type-check/build confirmation from the start of this session remains the most recent valid one.

After the `twilio` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 217 tests passing (216 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new `twilio` assertions or `credentialKind` branch.

`npm run build` (frontend) was re-run after the `twilio` batch and passed cleanly in about 15s with no new warnings.

No worker files were touched in the `twilio` batch either, so the worker type-check/build confirmation from the start of this session remains the most recent valid one.

After the `whatsapp_cloud` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It initially failed on the first attempt with one failure — `whatsapp_cloud is missing docs for config field "operation"` — because the backend schema's `requiredConfig: ['resource', 'operation']` needed an `operation` `FieldDoc` entry that had not yet been added. Added the `operation` field (documented as backend-only, always fixed to `sendText`, matching the `resource` field's treatment) to `whatsapp_cloud.doc.ts` and `node-field-content.ts`/`search/whatsapp_cloud.ts`, then re-ran: it passed with 223 tests passing (222 doc-coverage + 1 FieldsTable).

`npm run build` (frontend) was re-run after the `whatsapp_cloud` batch and passed cleanly in about 55s with no new warnings. This batch changed `nodeTypes.ts` with a real behavior-affecting fix (the `message`→`text` key rename), so the build serves as a real regression check, not just a no-op confirmation.

No worker files were touched in the `whatsapp_cloud` batch (the bug fix was entirely in the frontend `configFields` key, matching what the worker already expected via `text`), so the worker type-check/build confirmation from the start of this session remains the most recent valid one.

After the `zoom_video` batch, the same focused command was re-run:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

It passed with 229 tests passing (228 doc-coverage + 1 FieldsTable) on the first attempt after adding Zoom coverage.

`npm run build` (frontend) was re-run after the `zoom_video` batch and passed in about 1m17s. It emitted two pre-existing/non-Zoom warnings: Browserslist/caniuse-lite data is stale, and `src/components/workflow/nodeGuides.ts` already has a duplicate `google_sheets` object key warning. No Zoom runtime code was changed.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed; as part of the worker build it regenerated `worker/public/node-library.json`. That file was already dirty before this Zoom audit started, and no intentional Zoom schema/runtime source changes were made. The worker build emitted existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `discord_trigger` batch, the focused command was expanded to include the existing Discord trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/discord-trigger-node-types.test.ts
```

It passed with 237 tests passing (234 doc-coverage + 1 FieldsTable + 2 Discord trigger node-types tests) on the first attempt after adding Discord Trigger coverage.

`npm run build` (frontend) was re-run after the `discord_trigger` batch and passed in about 18.7s. It emitted the same pre-existing/non-Discord warnings as the Zoom batch: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed; as before, the build regenerated `worker/public/node-library.json`, which was already dirty before this session. No intentional worker runtime/source changes were made for Discord Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `google_sheets_trigger` batch, the focused command was expanded to include the existing Google Sheets trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/google-sheets-trigger-node-types.test.ts
```

It passed with 243 tests passing (240 doc-coverage + 1 FieldsTable + 2 Google Sheets trigger node-types tests) on the first attempt after adding Google Sheets Trigger coverage.

`npm run build` (frontend) was re-run after the `google_sheets_trigger` batch and passed in about 17s. It emitted the same existing warnings as the Zoom/Discord batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed; as before, the build regenerated `worker/public/node-library.json`, which was already dirty before this session. No intentional worker runtime/source changes were made for Google Sheets Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `google_calendar_trigger` batch, the focused command was expanded to include the existing Google Calendar trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/google-calendar-trigger-node-types.test.ts
```

It passed with 249 tests passing (246 doc-coverage + 1 FieldsTable + 2 Google Calendar trigger node-types tests) on the first attempt after adding Google Calendar Trigger coverage.

`npm run build` (frontend) was re-run after the `google_calendar_trigger` batch and passed in about 18s. It emitted the same existing warnings as the recent trigger batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed; as before, the build regenerated `worker/public/node-library.json`, which was already dirty before this session. No intentional worker runtime/source changes were made for Google Calendar Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `google_drive_trigger` batch, the focused command was expanded to include the existing Google Drive trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/google-drive-trigger-node-types.test.ts
```

It passed with 255 tests passing (252 doc-coverage + 1 FieldsTable + 2 Google Drive trigger node-types tests) on the first attempt after adding Google Drive Trigger coverage.

`npm run build` (frontend) was re-run after the `google_drive_trigger` batch and passed in about 19s. It emitted the same existing warnings as the recent trigger batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed; as before, the build regenerated `worker/public/node-library.json`, which was already dirty before this session. No intentional worker runtime/source changes were made for Google Drive Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `gmail_trigger` batch, the focused command was expanded to include the existing Gmail trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/gmail-trigger-node-types.test.ts
```

It passed with 261 tests passing (258 doc-coverage + 1 FieldsTable + 2 Gmail trigger node-types tests). Two doc wording issues were caught and fixed before this passed: `pubsubTopic` and `labelIds`/`audience` field help initially used "Where to find it" instead of the required "Where the value comes from" checklist phrase, and the credential guide needed the standard outgoing-line/downstream-service connection wording.

`npm run build` (frontend) was re-run after the `gmail_trigger` batch and passed in about 1m13s. It emitted the same existing warnings as the recent trigger batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. The first `npm run build` (worker) attempt timed out before returning a result; it was re-run with a longer timeout and passed. As before, the build regenerated `worker/public/node-library.json`, which was already dirty before this session. No intentional worker runtime/source changes were made for Gmail Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `chat_trigger` batch, the focused command was expanded to include a new Chat Trigger node-types test:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/chat-trigger-node-types.test.ts
```

It passed with 267 tests passing (264 doc-coverage + 1 FieldsTable + 2 Chat Trigger node-types tests). The new assertions preserve the intentional zero-config visual panel, the documented runtime output fields, and the availability of Chat Send for replying with `sessionId`.

`npm run build` (frontend) passed in about 14s. It emitted the same existing warnings as the recent trigger batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json` as part of schema export. No intentional worker runtime/source changes were made for Chat Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `error_trigger` batch, the focused command was expanded to include both Chat Trigger and Error Trigger node-types tests because this turn touched both catalog entries:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/chat-trigger-node-types.test.ts src/components/workflow/__tests__/error-trigger-node-types.test.ts
```

It passed with 275 tests passing (270 doc-coverage + 1 FieldsTable + 2 Chat Trigger node-types tests + 2 Error Trigger node-types tests). The new Error Trigger assertions preserve the intentional zero-config visual panel, the failure-handler/runtime-output guidance, and availability of common downstream alert/log nodes.

`npm run build` (frontend) passed in about 26s. It emitted the same existing warnings as the recent trigger batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json` as part of schema export. No intentional worker runtime/source changes were made for Error Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `facebook_trigger` batch, the focused command was expanded to include Chat Trigger, Error Trigger, and Facebook Trigger node-types tests because this turn touched the shared trigger catalog/docs coverage:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/chat-trigger-node-types.test.ts src/components/workflow/__tests__/error-trigger-node-types.test.ts src/components/workflow/__tests__/facebook-trigger-node-types.test.ts
```

It passed with 283 tests passing (276 doc-coverage + 1 FieldsTable + 2 Chat Trigger node-types tests + 2 Error Trigger node-types tests + 2 Facebook Trigger node-types tests). The first two attempts caught and then fixed one syntax issue in `facebook_trigger.doc.ts` caused by an apostrophe in a single-quoted helpText string; the final run passed cleanly.

`npx vitest run src/__tests__/registry-metadata-contract.test.ts` was also run as a probe because an older handoff said this broad contract failed partly because of `facebook_trigger`'s unsupported `password` field type. At the end of the Facebook batch it still failed with 12 unrelated invalid field-type assertions, but `facebook_trigger` no longer appeared in the failure list after changing `verifyToken` to `text`. The immediately following GitHub batch then removed `github_trigger` from that same failure list as well; see the GitHub verification note below for the current remaining failures.

`npm run build` (frontend) passed in about 12.6s. It emitted the same existing warnings as recent batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied worker data files. No intentional worker runtime/source changes were made for Facebook Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `github_trigger` batch, the focused command was expanded to include Chat Trigger, Error Trigger, Facebook Trigger, and GitHub Trigger node-types tests because this turn touched the shared trigger catalog/docs coverage:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/chat-trigger-node-types.test.ts src/components/workflow/__tests__/error-trigger-node-types.test.ts src/components/workflow/__tests__/facebook-trigger-node-types.test.ts src/components/workflow/__tests__/github-trigger-node-types.test.ts
```

It passed with 291 tests passing (282 doc-coverage + 1 FieldsTable + 2 Chat Trigger node-types tests + 2 Error Trigger node-types tests + 2 Facebook Trigger node-types tests + 2 GitHub Trigger node-types tests).

`npx vitest run src/__tests__/registry-metadata-contract.test.ts` was re-run after the GitHub batch. It still fails, but the failure count dropped from 12 to 11 and `github_trigger` no longer appears in the failure list after changing `webhookSecret` to `text`. Remaining failures are out of this node's batch and include `google_gmail`, `gmail_trigger`, `google_sheets_trigger`, `discord_trigger`, `microsoft_teams_trigger`, `mongodb`, `firebase`, `gitlab_trigger`, `jira_trigger`, `instagram_trigger`, and `linear_trigger`.

`npm run build` (frontend) passed in about 15.2s. It emitted the same existing warnings as recent batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied worker data files. No intentional worker runtime/source changes were made for GitHub Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

After the `gitlab_trigger` batch, the focused command was expanded to include Chat Trigger, Error Trigger, Facebook Trigger, GitHub Trigger, and GitLab Trigger node-types tests because this turn touched the shared trigger catalog/docs coverage:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx src/components/workflow/__tests__/chat-trigger-node-types.test.ts src/components/workflow/__tests__/error-trigger-node-types.test.ts src/components/workflow/__tests__/facebook-trigger-node-types.test.ts src/components/workflow/__tests__/github-trigger-node-types.test.ts src/components/workflow/__tests__/gitlab-trigger-node-types.test.ts
```

It passed with 299 tests passing (288 doc-coverage + 1 FieldsTable + 2 Chat Trigger node-types tests + 2 Error Trigger node-types tests + 2 Facebook Trigger node-types tests + 2 GitHub Trigger node-types tests + 2 GitLab Trigger node-types tests).

`npx vitest run src/__tests__/registry-metadata-contract.test.ts` was re-run after the GitLab batch. It still fails, but the failure count dropped from 11 to 10 and `gitlab_trigger` no longer appears in the failure list after changing `secretToken` to `text`. Remaining failures are out of this node's batch and include `google_gmail`, `gmail_trigger`, `google_sheets_trigger`, `discord_trigger`, `microsoft_teams_trigger`, `mongodb`, `firebase`, `jira_trigger`, `instagram_trigger`, and `linear_trigger`.

`npm run build` (frontend) passed in about 14.1s. It emitted the same existing warnings as recent batches: stale Browserslist/caniuse-lite data and the duplicate `google_sheets` object key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied worker data files. No intentional worker runtime/source changes were made for GitLab Trigger. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

### Required Next Cloud Prompt

Paste this prompt into the cloud run:

```text
/goal Read docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md in full before doing anything else.

Continue the persistent node documentation audit goal. This is a long-running, multi-session effort — a prior session already completed 17 nodes (discord, discord_webhook, google_gmail, google_sheets, google_calendar, google_drive, google_doc, google_contacts, google_tasks, google_bigquery, slack_webhook, amazon_ses, log_output, mailgun, sendgrid, twilio, whatsapp_cloud), each marked `Complete` in the "Full Node Tracker" section's tables below and described in detail in "### Current Verified Status" and the per-node "completed files" notes above. Do NOT re-audit or redo any node already marked `Complete` in the tracker tables — check the table first, every single time, before starting work on any node, so nothing is repeated.

Do not commit.
Do not revert unrelated user changes.
Do not skip any node, field, operation, dropdown option, conditional field, input example, output example, or connection requirement.

Goal: audit and improve every node's "How to set" field guidance, node documentation, operation documentation, input/output examples, and connection UI guidance, one node at a time, until every node in the tracker is complete and coverage checks pass.

First action of this session: run `cd worker && npm run type-check && npm run build` once, purely to confirm the `whatsapp_cloud` batch (finished just before the prior session ended) left the worker in a clean state. No worker source files were touched in that batch, so this is expected to pass with no action needed — just confirm, then move on.

Start with the first high-impact node that is not marked `Complete` in the tracker tables. As of this handoff, the current next node is `zoom_video` (the last remaining `output`-category communication node still `Not Started`); also still `Not Started`: `discord_trigger` in `triggers`, and the four Google trigger nodes `google_sheets_trigger`/`google_calendar_trigger`/`google_drive_trigger`/`gmail_trigger`, which were explicitly out of scope for the earlier Google data/action node pass. After `zoom_video`, the entire `output` category tracker section will be fully `Complete`. Re-check the tracker table yourself before starting in case this handoff note is stale by the time you run it.

Current correction to the older handoff text above: `zoom_video`, `discord_trigger`, `google_sheets_trigger`, `google_calendar_trigger`, `google_drive_trigger`, `gmail_trigger`, `chat_trigger`, `error_trigger`, `facebook_trigger`, `github_trigger`, and `gitlab_trigger` are now complete. The next high-impact incomplete node is `instagram_trigger` if the tracker still shows it as `Not Started`.

Before editing each node:
1. Read `docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md`.
2. Check git status and do not revert unrelated user changes.
3. Build a field matrix from:
   - `worker/public/node-library.json`
   - `worker/src/services/nodes/node-library.ts`
   - runtime implementation/overrides for that node
   - `ctrl_checks/src/components/workflow/nodeTypes.ts`
   - `ctrl_checks/src/docs-content/nodes/<node>.doc.ts`
   - `ctrl_checks/src/docs-content/node-field-content.ts`
   - `ctrl_checks/src/docs-content/node-content-overrides.ts`
   - `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
   - `ctrl_checks/src/components/workflow/nodeGuides.ts`
   - `ctrl_checks/src/docs-content/search/<node>.ts`
   - `ctrl_checks/src/docs-content/manifest.ts`
   - connection and credential definitions in the worker and frontend connection UI
4. Compare every backend field, frontend config field, docs field, search field, dropdown option, conditional visibility rule, input example, output example, runtime output, and connection requirement.

If a node's visual panel exposes fewer operations/resources than the runtime executor actually supports (as was the case for `whatsapp`), do not silently drop the extra runtime operations from the docs. Either wire them into the visual panel if it's a small, safe, non-architectural change, or document them clearly as runtime-supported/AI-generated-workflow-only with an explicit note about what the visual panel currently exposes — the `whatsapp` node's `Message`/`Contact`/`Conversation`/`Template`/`Campaign`/`AI Agent` resource split in `ctrl_checks/src/docs-content/nodes/whatsapp.doc.ts` is a worked example of the documentation-only approach, used because fully wiring every resource into the panel would have required making the shared `operation`-dropdown backend-fallback mechanism in `nodeTypes.ts`/`backendSupportedNodeOperations.ts` resource-aware (a cross-cutting change affecting other multi-resource nodes, out of scope for a single-node doc pass).

For each node:
1. Rewrite every field guidance entry in plain non-technical language for real workplace users.
2. Ensure every field help text explains:
   - What this field means.
   - Why it matters.
   - When to fill it.
   - What to enter.
   - Where the value comes from.
   - How to map from a previous workflow step.
   - Accepted format.
   - Real workplace example.
   - What happens if it is empty or wrong.
   - Common mistake to avoid.
3. Make every dropdown option explain:
   - What the option does.
   - When to choose it.
   - Which fields become important.
   - A realistic workplace use case.
   - Expected behavior/output.
4. Update the node documentation so every operation has:
   - Plain-language operation summary.
   - Required fields.
   - Optional fields.
   - Conditional fields.
   - Input example.
   - Output example.
   - Common mistakes.
   - Troubleshooting.
5. Update `node-field-content.ts`, node docs, node usage guide, inline node guide, search docs, manifest, and node-content overrides where needed.
6. Update connection UI/docs so node-specific setup is clear:
   - Which account/service to connect.
   - Required permissions/scopes.
   - What the connection is used for.
   - What is stored in Connections/credential vault.
   - What must not be stored in normal workflow fields.
   - How to test the connection.
   - Common permission errors and fixes.
   - Downstream service nodes still need their own connections.
7. Add or update tests that prevent:
   - missing docs,
   - missing field guidance,
   - placeholder-only help,
   - missing dropdown option explanations,
   - missing connection guidance,
   - missing input/output examples,
   - stale runtime output examples.
8. Run focused verification after each node or small batch.
9. Mark the node `Complete` in `docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md`'s tracker table only after all checks pass, and add a short "completed files" + "key findings" note in the same style as the existing entries above (this is what lets the next session avoid repeating work and understand what was actually verified).
10. Continue to the next high-impact incomplete node (re-check the tracker table each time — do not rely on memory of what was done in a previous turn), then continue through the remaining tracker until every node is `Complete`.

Verification to run:

Frontend focused docs tests:
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx

Also run any node-type-specific test file for the node you touched (e.g. `src/components/workflow/__tests__/<node>-node-types.test.ts`), and update its expectations if you intentionally changed dropdown options or config fields — do not weaken the assertions to make them pass.

Frontend build:
cd ctrl_checks
npm run build

Backend checks (run every batch, not only when credential files change):
cd worker
npm run type-check
npm run build

Known pre-existing/out-of-scope failures: `npx vitest run src/__tests__/registry-metadata-contract.test.ts` currently shows 10 invalid configField-type failures outside the completed `facebook_trigger`, `github_trigger`, and `gitlab_trigger` batches. `facebook_trigger`, `github_trigger`, and `gitlab_trigger` no longer appear in this failure list after their secret fields were changed from `password` to `text`. Remaining failures are currently in `google_gmail`, `gmail_trigger`, `google_sheets_trigger`, `discord_trigger`, `microsoft_teams_trigger`, `mongodb`, `firebase`, `jira_trigger`, `instagram_trigger`, and `linear_trigger`; fix each when the active audit batch reaches that node or when explicitly assigned a broader metadata-contract cleanup.

If the exact glob command below is requested, be aware it previously failed in PowerShell because the glob was treated literally:
cd ctrl_checks
npx vitest run src/docs-content/**tests**/manual-trigger-doc-coverage.test.ts src/components/docs/**tests**/FieldsTable.test.tsx

Report clearly after each completed node:
- Node completed.
- Files changed.
- Tests/builds run.
- Any warnings.
- Next node to continue.

Do not commit.
Do not revert unrelated user changes.
Continue node by node until the whole tracker is complete or a real blocker is reached.
```
