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

## Important Process Note (added after CRM batch began)

`ctrl_checks/src/docs-content/node-field-content.ts` (the `NODE_FIELD_CONTENT` export) was confirmed **dead code**: a full-repo search found zero imports of it anywhere in `ctrl_checks/src`, and the actual docs UI (`ctrl_checks/src/components/docs/FieldsTable.tsx`) renders `field.helpText` directly from each node's `.doc.ts` file — never from `NODE_FIELD_CONTENT`. The user was asked and confirmed: **stop maintaining `node-field-content.ts` for all remaining nodes.** Do not add, edit, or "complete" entries in that file going forward — it has zero effect on the live product. The 48+ nodes already marked `Complete` (including the 14 triggers from the previous session) have entries in that file from before this was discovered; leave those alone too, do not spend time backfilling or removing them. All other files in the list below (`.doc.ts`, `node-content-overrides.ts`, `nodeUsageGuides.ts`, `nodeGuides.ts`, `nodeTypes.ts`, search files, manifest, coverage test) remain required — only `node-field-content.ts` is now out of scope.

## Files To Audit And Update

Use the repo as the source of truth. Do not rely on memory.

- `worker/public/node-library.json`
- `worker/src/services/nodes/node-library.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts`
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
4. Do not use `ctrl_checks/src/docs-content/node-field-content.ts` for remaining nodes; it is confirmed dead code. Field help belongs in each node's `.doc.ts`.
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
| Complete | `clickup` | ClickUp |

### ai

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `ai_agent` | AI Agent |
| Complete | `ai_chat_model` | AI Chat Model |
| Complete | `anthropic_claude` | Anthropic Claude |
| Complete | `chat_model` | Chat Model |
| Complete | `cohere` | Cohere |
| Complete | `google_gemini` | Google Gemini |
| Complete | `huggingface` | Hugging Face |
| Complete | `langchain` | LangChain |
| Out of Scope (not UI-visible) | `lightricks` | Lightricks |
| Complete | `memory` | Memory |
| Complete | `mistral` | Mistral AI |
| Complete | `ollama` | Ollama |
| Complete | `openai_gpt` | OpenAI GPT |
| Complete | `sentiment_analyzer` | Sentiment Analyzer |
| Complete | `text_summarizer` | Text Summarizer |
| Out of Scope (not UI-visible) | `tool` | Tool |

### cache

| Status | Node Type | Label |
| --- | --- | --- |
| Out of Scope (not UI-visible) | `cache_get` | Cache Get |
| Out of Scope (not UI-visible) | `cache_set` | Cache Set |

### cms

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `contentful` | Contentful |
| Complete | `wordpress` | WordPress |

### communication

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `whatsapp` | WhatsApp |
| Complete | `zoom_video` | Zoom Video |

### crm

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `activecampaign` | ActiveCampaign |
| Complete | `freshdesk` | Freshdesk |
| Complete | `hubspot` | HubSpot |
| Complete | `intercom` | Intercom |
| Complete | `intuit_smes` | Intuit SMEs |
| Complete | `mailchimp` | Mailchimp |
| Complete | `microsoft_dynamics` | Microsoft Dynamics |
| Complete | `odoo` | Odoo |
| Complete | `pipedrive` | Pipedrive |
| Complete | `salesforce` | Salesforce |
| Complete | `sap` | SAP |
| Complete | `tally` | Tally |
| Complete | `zendesk` | Zendesk |
| Complete | `zoho_crm` | Zoho CRM |

### data

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `aggregate` | Aggregate |
| Complete | `csv` | CSV |
| Complete | `date_time` | Date & Time |
| Complete | `edit_fields` | Edit Fields |
| Complete | `html` | HTML |
| Complete | `javascript` | JavaScript |
| Complete | `json_parser` | JSON Parser |
| Complete | `limit` | Limit |
| Complete | `math` | Math |
| Complete | `merge_data` | Merge Data |
| Complete | `rename_keys` | Rename Keys |
| Complete | `set` | Set |
| Complete | `set_variable` | Set Variable |
| Complete | `sort` | Sort |
| Complete | `text_formatter` | Text Formatter |
| Complete | `xml` | XML |

### database

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `airtable` | Airtable |
| Out of Scope (not UI-visible) | `database_read` | Database Read |
| Out of Scope (not UI-visible) | `database_write` | Database Write |
| Complete | `db` | Database |
| Complete | `firebase` | Firebase |
| Complete | `google_cloud_storage` | Google Cloud Storage |
| Complete | `mongodb` | MongoDB |
| Complete | `mysql` | MySQL |
| Complete | `oracle_database` | Oracle Database |
| Complete | `pinecone` | Pinecone |
| Complete | `postgresql` | PostgreSQL |
| Complete | `qdrant` | Qdrant |
| Complete | `redis` | Redis |
| Complete | `sql_server` | SQL Server |
| Complete | `timescaledb` | TimescaleDB |

### devops

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `bitbucket` | Bitbucket |
| Complete | `github` | GitHub |
| Complete | `gitlab` | GitLab |
| Complete | `jenkins` | Jenkins |
| Complete | `jira` | Jira |
| Complete | `netlify` | Netlify |
| Complete | `vercel` | Vercel |

### ecommerce

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `paypal` | PayPal |
| Complete | `shopify` | Shopify |
| Complete | `stripe` | Stripe |
| Complete | `woocommerce` | WooCommerce |

### file

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `aws_s3` | AWS S3 |
| Complete | `dropbox` | Dropbox |
| Complete | `ftp` | FTP |
| Complete | `onedrive` | OneDrive |
| Complete | `read_binary_file` | Read Binary File |
| Complete | `sftp` | SFTP |
| Complete | `write_binary_file` | Write Binary File |

### flow

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `parallel` | Parallel |
| Complete | `retry` | Retry |
| Complete | `return` | Return |
| Complete | `timeout` | Timeout |
| Complete | `try_catch` | Try/Catch |

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
| Complete | `graphql` | GraphQL |
| Complete | `http_post` | HTTP POST |
| Complete | `http_request` | HTTP Request |
| Complete | `respond_to_webhook` | Respond to Webhook |
| Complete | `schedulewise` | Schedulewise |
| Complete | `webhook_response` | Webhook Response |
| Complete | `workday` | Workday |
| Complete | `xero` | Xero |

### logic

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `error_handler` | Error Handler |
| Complete | `filter` | Filter |
| Complete | `function` | Function |
| Complete | `function_item` | Function Item |
| Complete | `if_else` | If/Else |
| Complete | `loop` | Loop |
| Complete | `merge` | Merge |
| Complete | `noop` | No Operation |
| Complete | `split_in_batches` | Split In Batches |
| Complete | `stop_and_error` | Stop and Error |
| Complete | `switch` | Switch |
| Complete | `wait` | Wait |

### microsoft

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `outlook` | Outlook |

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
| Complete | `chargebee` | Chargebee |

### productivity

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `calendly` | Calendly |
| Complete | `linear` | Linear |
| Complete | `notion` | Notion |
| Complete | `trello` | Trello |
| Complete | `typeform` | Typeform |

### queue

| Status | Node Type | Label |
| --- | --- | --- |
| Out of Scope (not UI-visible) | `queue_consume` | Queue Consume |
| Out of Scope (not UI-visible) | `queue_push` | Queue Push |

### social

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `facebook` | Facebook |
| Complete | `instagram` | Instagram |
| Complete | `linkedin` | LinkedIn |
| Complete | `twitter` | Twitter/X |
| Complete | `youtube` | YouTube |

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
| Complete | `instagram_trigger` | Instagram Trigger |
| Complete | `interval` | Interval Trigger |
| Complete | `jira_trigger` | Jira Trigger |
| Complete | `linear_trigger` | Linear Trigger |
| Complete | `manual_trigger` | Manual Trigger |
| Complete | `microsoft_teams_trigger` | Microsoft Teams Trigger |
| Complete | `outlook_trigger` | Outlook Trigger |
| Complete | `schedule` | Schedule Trigger |
| Complete | `shopify_trigger` | Shopify Trigger |
| Complete | `slack_trigger` | Slack Trigger |
| Complete | `stripe_trigger` | Stripe Trigger |
| Complete | `tally_trigger` | Tally Trigger |
| Complete | `telegram_trigger` | Telegram Trigger |
| Complete | `trello_trigger` | Trello Trigger |
| Complete | `typeform_trigger` | Typeform Trigger |
| Complete | `webhook` | Webhook Trigger |
| Complete | `whatsapp_trigger` | WhatsApp Trigger |
| Complete | `workflow_trigger` | Workflow Trigger |

### utility

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `delay` | Delay |

### workflow

| Status | Node Type | Label |
| --- | --- | --- |
| Complete | `execute_workflow` | Execute Workflow |

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

### ⚠ Reconciliation Needed (read this first)

Multiple tools/IDEs (not just this agent) have been working on this tracker across sessions. One of them completed `tally`, `zendesk`, `zoho_crm` (finishing the `crm` category) and `aggregate`, `csv`, `date_time`, `html`, `json_parser`, `limit`, `math` (in the `data` category) and marked all 10 `Complete` — but a live check found they do **not** actually meet this plan's own Definition of Done:

- **None of the 10 are registered in `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`** — no import, no `AUDITED_NODE_DOCS` entry, no `credentialKind` branch. Running the full focused suite (`npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx`) still shows **439 tests passing**, the exact same count as right after `sap` was finished — proof these 10 nodes contributed zero new test coverage despite being marked `Complete`.
- **The field `helpText` in at least `aggregate.doc.ts`, `csv.doc.ts`, and `tally.doc.ts` uses an older, thinner template** (`"What this field is: ... How to fill it: ... Example: ... Tip: ..."` or `"...When to leave blank: ... Mapping from previous step: ..."`) that does **not** contain the 10 literal required phrases this session's rich-helpText check enforces (`'Why it matters'`, `'When to fill it'`, `'What to enter'`, `'Where the value comes from'`, `'How to use it later'`, `'Accepted format'`, `'Real workplace example'`, `'If it is empty or wrong'`, `'Common mistake'` — see `assertRichHelpText` in the coverage test file). If these nodes were added to the test as-is, they would very likely fail immediately.
- **No `search/<node>.ts` file exists for `tally` or `zendesk`** (confirmed via `Glob`) — the search-index requirement from the "Files To Audit And Update" list was skipped.
- `tally`/`zendesk`'s own "completed files" write-ups in this doc (above, near the `sap` section) only list `doc.ts` and `node-content-overrides.ts` as touched — `manifest.ts`, `nodeUsageGuides.ts`, `nodeGuides.ts`, `nodeTypes.ts`, and the coverage test were not mentioned as reviewed or updated at all.
- `zoho_crm` and the 7 `data` nodes (`aggregate`/`csv`/`date_time`/`html`/`json_parser`/`limit`/`math`) have **no "completed files" write-up in this doc at all** — only the tracker table checkbox was flipped.

**These 10 nodes have been demoted back to `In Progress` in the tracker tables above** so the next session does not skip them. Before doing any new node, the next session must reconcile each of these 10 against the full per-node checklist (rich helpText with all 10 phrases, `search/<node>.ts`, `manifest.ts`, `nodeUsageGuides.ts`, `nodeGuides.ts` review, `nodeTypes.ts` field-alignment check, and — critically — actual registration in `manual-trigger-doc-coverage.test.ts` with the suite passing) before marking them `Complete` again and before moving on to `merge_data` or any other new node. Whatever real content already exists (the doc.ts files do contain genuine, non-fabricated per-node research — field names, operations, and error strings appear accurate on a skim) should be reused and upgraded, not thrown away — this is a content-quality/process gap, not a factual-accuracy problem.

### Current Verified Status

The following nodes are already audited and marked `Complete` in the tracker:

- Core triggers: ALL triggers now complete — `manual_trigger`, `schedule`, `webhook`, `form`, `workflow_trigger`, `chat_trigger`, `error_trigger`, `facebook_trigger`, `github_trigger`, `gitlab_trigger`, `instagram_trigger`, `interval`, `jira_trigger`, `linear_trigger`, `microsoft_teams_trigger`, `outlook_trigger`, `shopify_trigger`, `slack_trigger`, `stripe_trigger`, `tally_trigger`, `telegram_trigger`, `trello_trigger`, `typeform_trigger`, `whatsapp_trigger`. The entire `triggers` tracker section is `Complete`.
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

`instagram_trigger` is also now audited and marked `Complete`. Important finding: unlike `facebook_trigger`/`github_trigger`/`gitlab_trigger`, this node's `doc.ts` and `search/instagram_trigger.ts` files already existed from an earlier session and were reasonably structured, but `node-field-content.ts`, `node-content-overrides.ts`, `nodeGuides.ts`, and the coverage test had no entries at all for this node, and the existing doc content was materially thinner than the established trigger pattern (short one-line field helpText instead of the full 10-point template, a `connectionId` field missing entirely, an operation value of `default` instead of the `receive` convention used by the sibling Meta/webhook triggers, and an output example/description missing `pageId`, `messageType`, `mentionId`, `postbackPayload`, `isStoryReply`, `trigger`, `workflow_id`, `node_id`, `sessionId`, and `_instagram` compared to the real runtime output built by `buildInstagramExecutionInput` in `worker/src/services/instagram/instagram-trigger-service.ts`). The visual panel's `verifyToken` config field also used the unsupported `password` type, the same pre-existing bug pattern found and fixed in `facebook_trigger`/`github_trigger`/`gitlab_trigger`; it is now `text`. All gaps were closed to match the depth and conventions of the `facebook_trigger`/`github_trigger`/`gitlab_trigger` batch, including full field-level help text (all 10 required phrases per field), the `connectionId` field, the `receive` operation value, a complete output example matching the real registry/service output shape, and Instagram OAuth2 connection guidance (scopes `instagram_basic`, `instagram_content_publish`, `instagram_manage_messages`, `instagram_manage_comments`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `business_management`; test call `GET https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account`).

`instagram_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/instagram_trigger.doc.ts` (fully rewritten: added `connectionId` field, full 10-point helpText for all 6 fields, `receive` operation value, complete runtime-aligned output example/description, Instagram OAuth2 connection setup steps, and troubleshooting)
- `ctrl_checks/src/docs-content/search/instagram_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage matching the `facebook_trigger`/`github_trigger` pattern)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `connectionId`, `eventTypes`, `instagramBusinessAccountId`, `allowedSenderIds`, `verifyToken`, and `validateSignature` — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (rewrote Instagram Trigger panel help text, changed `verifyToken` config field type from unsupported `password` to supported `text`, and expanded `usageGuide.outputs` to the full runtime output list; no field keys or order changed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the Instagram Trigger usage guide with the full output list and an added routing tip)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `instagramTriggerDoc` import/coverage entry and an `instagram_trigger` credential branch)

`interval` is also now audited and marked `Complete`. Important finding, more significant than a typical doc gap: the pre-existing `doc.ts`, `node-content-overrides.ts`, and `nodeUsageGuides.ts` content for this node was entirely fabricated placeholder text — it claimed a `seconds`/`minutes`/`hours` unit option (the real frontend dropdown only has Minutes 1-59 and Hours 1-23, confirmed in `worker/src/services/nodes/node-library.ts`'s `createIntervalTriggerSchema` comment: "Seconds are not supported: the scheduler runs on minute-granularity cron expressions") and a fabricated output shape `{firedAt, intervalMs, iteration}` / `{trigger, interval, executed_at}` that neither the registry override (`worker/src/core/registry/overrides/interval.ts`) nor the legacy switch (`worker/src/api/execute-workflow.ts` `case 'interval'`) ever produce — the real output is simply `{executed_at, ...anyPassedThroughInput}`. Deeper investigation of how this trigger actually runs automatically (tracing `worker/src/services/scheduler/index.ts`, `worker/src/api/workflow-setup-lifecycle.ts`, and `worker/src/api/execute-workflow.ts`, none of which reference a `cron_expression` column anywhere) found that the recurring execution is driven entirely client-side: `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`'s `activateIntervalTrigger` converts Interval/Unit into a cron string, writes it directly to the `workflows.cron_expression` column via `awsClient`, and starts `ctrl_checks/src/lib/workflowScheduler.ts` — a browser `setInterval`/`setTimeout`-based scheduler (initialized app-wide by `SchedulerInitializer.tsx` for every workflow with a saved `cron_expression`) that calls `/api/execute-workflow` on a timer. The server-side `worker/src/services/scheduler/index.ts` node-cron job only reads a different column (`workflows.schedule`) and never touches `cron_expression`, so there is no persistent server-side driver for this trigger — it only keeps firing while a CtrlChecks browser tab is open somewhere. This is now documented transparently (following the same transparency precedent as `google_drive`'s non-functional Delete and `google_sheets`'s decorative `allowWrite`) rather than left implying a normal always-on cron. Also note the client scheduler always sends `_trigger: 'schedule'` on every automatic call, even for Interval Trigger runs — this is now called out explicitly so users do not map `{{$json._trigger}}` expecting `'interval'`.

`interval` completed files:

- `ctrl_checks/src/docs-content/nodes/interval.doc.ts` (fully rewritten: accurate Interval/Unit field guidance with full 10-point helpText, corrected minutes/hours-only unit support, real `{executed_at, _scheduled, _trigger}` output, browser-scheduler dependency documented in setup steps and troubleshooting)
- `ctrl_checks/src/docs-content/search/interval.ts` (rewritten with node, operation, field, output, and connection search coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (rewrote the `interval`/`unit` field entries under the `interval` node key from thin placeholders to full 10-point guidance; the unrelated `schedule` node's own `interval`/`unit` alternate-input fields at the top of that file were left untouched since `schedule` is already `Complete` and out of scope)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (replaced the fabricated `{firedAt, intervalMs, iteration}` output example/description with the real `{executed_at, _scheduled, _trigger}` shape)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (added a `usageGuide.outputs` list and clarified the `interval`/`unit` config field helpText about the missing seconds unit and the Schedule Trigger alternative; no field keys, types, or options changed — the existing Minutes/Hours-only dropdown was already correct)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fully rewritten to remove the fabricated seconds-unit/output claims and describe the real behavior and browser-scheduler dependency)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `intervalDoc` import/coverage entry with `credentialKind` left as the default `'none'`)

`jira_trigger` is also now audited and marked `Complete`. Like `instagram_trigger`, this node already had a `doc.ts` and `search/jira_trigger.ts` from an earlier session, but they were thinner than the established pattern and two real backend fields — `secretToken` and `jql` — were completely undocumented (confirmed present in both `worker/src/services/nodes/node-library.ts`'s `createJiraTriggerSchema` and the frontend `configFields` in `nodeTypes.ts`, but missing from the doc's `fields` array). The `secretToken` config field also used the unsupported `password` type, the same pre-existing bug pattern fixed in `facebook_trigger`/`github_trigger`/`gitlab_trigger`/`instagram_trigger`; it is now `text`. Two points worth flagging for future sessions: (1) `jql` is a **documentation-only** field — `worker/src/services/jira/jira-trigger-service.ts` never reads or sends it anywhere; the real JQL filter must be configured directly on the webhook inside Jira itself, and the doc now says this explicitly rather than implying CtrlChecks enforces it. (2) Jira Cloud webhook registration is **entirely manual** — `registerJiraWebhook` only generates a URL + secret and always returns `manualSetupRequired: true`, because Jira's dynamic-webhooks REST endpoint is restricted to Connect/OAuth apps and the `jira_api_key` Basic Auth credential used here cannot call it; a site admin must paste the URL into Jira's System > WebHooks page or an Automation for Jira rule. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node (same gap pattern as `instagram_trigger`).

`jira_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/jira_trigger.doc.ts` (fully rewritten: added `connectionId`, `secretToken`, and `jql` fields with full 10-point helpText, corrected/completed the output example against the real `NormalizedJiraEvent` shape plus `trigger`/`workflow_id`/`node_id`/`sessionId`/`_jira`, and expanded connection/setup/troubleshooting guidance)
- `ctrl_checks/src/docs-content/search/jira_trigger.ts` (rewritten with node, operation, field, output, and connection search coverage matching the established trigger pattern)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for `connectionId`, `siteUrl`, `projectKey`, `eventTypes`, `secretToken`, `jql`, and `query` — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (changed `secretToken` config field type from unsupported `password` to supported `text`, and completed the inline `usageGuide.outputs` list to include `cloudId`, `trigger`, `workflow_id`, `node_id`, `sessionId`, `_jira`; no field keys or order changed — note this node's inline `usageGuide` still uses an older `whenToUse/setup/outputs/examples` shape rather than the newer `outputs`-only convention used by `facebook_trigger`/`instagram_trigger`, left as-is since it was already functional and not part of this node's gap)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `jiraTriggerDoc` import/coverage entry and a `jira_trigger` credential branch)

`linear_trigger` is also now audited and marked `Complete`. This node's `doc.ts`/`search/linear_trigger.ts` existed but documented only 5 of the 8 real config fields (`connectionId`, `allPublicTeams`, and `actorId` were missing — confirmed against `worker/src/core/registry/overrides/linear-trigger.ts`'s `inputSchema` and the frontend `configFields` in `nodeTypes.ts`) and the output example covered only 6 of the ~30 fields the registry override's `outputSchema` and `worker/src/services/linear/linear-trigger-service.ts`'s `NormalizedLinearEvent` actually produce. Also found and fixed: the `allPublicTeams` config field used `type: 'checkbox'`, which is **not a valid `ConfigField` type** in `nodeTypes.ts` (the union only has `boolean`, not `checkbox`) — same class of bug as the `password`-type fixes in earlier trigger nodes, just a different invalid value; changed to `boolean`. Important behavioral finding worth contrasting with `jira_trigger`: Linear webhook registration is **fully automatic** — `registerLinearWebhook` calls Linear's GraphQL `webhookCreate` mutation directly and stores the returned secret, so (unlike Jira) no manual step in a third-party admin UI is required, though the saved Linear credential must come from a workspace admin account or Linear rejects the mutation. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node (same gap pattern as `instagram_trigger`/`jira_trigger`).

`linear_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/linear_trigger.doc.ts` (fully rewritten: added `connectionId`, `allPublicTeams`, and `actorId` fields with full 10-point helpText, corrected/completed the output example against the real `NormalizedLinearEvent` shape plus `trigger`/`workflow_id`/`node_id`/`sessionId`/`_linear`, and expanded connection/setup/troubleshooting guidance including the automatic-registration behavior)
- `ctrl_checks/src/docs-content/search/linear_trigger.ts` (rewritten from a bare `as const` array to the standard `DocsSearchIndexItem[]` shape used by every other trigger, with node/operation/field/output/connection coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 8 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override, keyed by the doc's `issue_comment_events` operation value — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (changed `allPublicTeams` config field type from invalid `checkbox` to valid `boolean`, and completed the inline `usageGuide.outputs` list from 19 to all ~30 real output fields; no field keys or order changed — this node's inline `usageGuide` also still uses the older `whenToUse/setup/outputs/examples` shape, left as-is like `jira_trigger`)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `linearTriggerDoc` import/coverage entry and a `linear_trigger` credential branch)

`microsoft_teams_trigger` is also now audited and marked `Complete`. This node's `doc.ts`/`search/microsoft_teams_trigger.ts` existed but documented only 3 of the 8 real config fields (`teamIds`, `allowedUserIds`, `tenantId`, `appId`, and `connectionId` were all missing — confirmed against `worker/src/core/registry/overrides/microsoft-teams-trigger.ts`'s `inputSchema` and the frontend `configFields` in `nodeTypes.ts`), and the output example covered only 11 of the 18 real output fields the registry override's `outputSchema` and `worker/src/services/microsoft-teams/microsoft-teams-trigger-service.ts`'s `NormalizedMicrosoftTeamsEvent` actually produce (missing `source`, `timestamp`, `chatId`, `locale`, `channelData`, plus the `trigger`/`workflow_id`/`node_id`/`sessionId`/`_microsoftTeams` metadata `buildMicrosoftTeamsExecutionInput` adds). Also found and fixed two invalid `ConfigField` types in `nodeTypes.ts`, the same bug class as earlier trigger nodes: `validationSecret` used unsupported `password` (now `text`) and `validateJwt` used unsupported `checkbox` (now `boolean`). Worth noting for future sessions: this trigger accepts **either** a real Bot Framework JWT (validated against Microsoft's OpenID/JWKS endpoint and the connection's App ID) **or** a much simpler `Validation Secret` shared-secret header/query-param match — the doc now explains the secret path exists mainly for manual testing, since production Teams traffic always presents a real signed JWT. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node (same gap pattern as the other newly-completed triggers this session).

`microsoft_teams_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/microsoft_teams_trigger.doc.ts` (fully rewritten: added `connectionId`, `teamIds`, `allowedUserIds`, `tenantId`, and `appId` fields with full 10-point helpText, corrected/completed the output example against the real `NormalizedMicrosoftTeamsEvent` shape plus trigger metadata, and expanded connection/setup/troubleshooting guidance)
- `ctrl_checks/src/docs-content/search/microsoft_teams_trigger.ts` (rewritten to the standard `DocsSearchIndexItem[]` shape with node/operation/field/output/connection coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 9 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (changed `validationSecret` config field type from invalid `password` to `text` and `validateJwt` from invalid `checkbox` to `boolean`, and completed the inline `usageGuide.outputs` list from 12 to all 18 real output fields; no field keys or order changed — this node's inline `usageGuide` also still uses the older `whenToUse/setup/outputs/examples` shape, left as-is like `jira_trigger`/`linear_trigger`)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `microsoftTeamsTriggerDoc` import/coverage entry and a new `teams_trigger` credential branch — named distinctly from the existing `teams` kind used by the `microsoft_teams` action node's webhook credential, since this is a different Bot credential)

`outlook_trigger` is also now audited and marked `Complete`. This node's `doc.ts`/`search/outlook_trigger.ts` existed but documented only 3 of the 5 real config fields (`connectionId` and `query`/Keyword Filter were missing — confirmed against `worker/src/core/registry/overrides/outlook-trigger.ts`'s `inputSchema` and the frontend `configFields` in `nodeTypes.ts`), and the output example covered only 6 of the 16 real output fields the registry override's `outputSchema` and `worker/src/services/outlook/outlook-trigger-service.ts`'s `NormalizedOutlookEvent` actually produce. No invalid `ConfigField` types this time — `resource`'s `select` and the other text fields were already valid. Two behavioral findings worth flagging: (1) unlike the browser-dependent `interval` trigger, this node has a genuine **server-side** auto-renewal job — `startOutlookSubscriptionRenewalScheduler` runs a `node-cron` sweep every 6 hours via `renewExpiringOutlookSubscriptions`, renewing any Graph subscription expiring within 24 hours, so the existing doc's "renewed automatically" claim was actually accurate and is now more precisely described. (2) `worker/src/api/outlook-trigger.ts`'s webhook handler acknowledges Microsoft Graph immediately (a bare `202` within seconds, required by Graph's ~10-second timeout) and then processes notifications **silently in the background** — an invalid `clientState`, a missing/expired Microsoft credential, a failed Graph re-fetch, or a Keyword Filter mismatch all fail with no visible error response anywhere, unlike every other trigger audited this session which returns an explicit "ignored" JSON message. This silent-failure behavior is now called out explicitly in troubleshooting since it is genuinely harder to debug than the other Meta/GitHub/GitLab/Jira/Linear/Teams triggers. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node (same gap pattern as the other newly-completed triggers this session).

`outlook_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/outlook_trigger.doc.ts` (fully rewritten: added `connectionId` and `query` fields with full 10-point helpText, corrected/completed the output example against the real `NormalizedOutlookEvent` shape plus trigger metadata, and expanded connection/setup/troubleshooting guidance including the silent-background-failure behavior and the real 6-hour renewal scheduler)
- `ctrl_checks/src/docs-content/search/outlook_trigger.ts` (rewritten to the standard `DocsSearchIndexItem[]` shape with node/operation/field/output/connection coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 5 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 11 to all 16 real output fields plus the 5 trigger-metadata fields; no field keys, types, or order changed — all existing `configFields` types were already valid for this node)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `outlookTriggerDoc` import/coverage entry and an `outlook_trigger` credential branch)

`shopify_trigger` is also now audited and marked `Complete`. This node's `doc.ts` was already fairly complete (9 of the 10 fields present, `connectionId` missing) but every field had only a one-line `description` with no `helpText` at all — the coverage test's 10-point helpText requirement was not previously enforced for this node since it wasn't yet registered in `manual-trigger-doc-coverage.test.ts`. Also found and fixed a genuine broken-link bug in `search/shopify_trigger.ts`: its operation anchor was hardcoded as `#store-events`, but the real anchor generator (`ctrl_checks/src/components/docs/OperationSection.tsx` and `docs-content/index.ts`) always builds `#operation-${operation.value}`, so the correct anchor is `#operation-store_events` — the old link would never have scrolled to the right section. The output example also only covered 8 of the 33 real fields the registry override's `outputSchema` and `worker/src/services/shopify/shopify-trigger-service.ts`'s `NormalizedShopifyEvent` produce. `commonErrors` previously used generic placeholder messages ("Connection required", "Webhook secret required") instead of the real runtime strings from `worker/src/api/shopify-trigger.ts` and `resolveShopifyCredential`; these are now exact. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node (same gap pattern as the other newly-completed triggers this session), and the inline `usageGuide.outputs` in `nodeTypes.ts` used an odd grouped-comma-string array instead of a flat field list.

`shopify_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/shopify_trigger.doc.ts` (fully rewritten: added `connectionId` field, full 10-point helpText for all 10 fields, corrected/completed the output example against the real `NormalizedShopifyEvent` shape plus trigger metadata, and replaced placeholder error messages with the real runtime strings)
- `ctrl_checks/src/docs-content/search/shopify_trigger.ts` (rewritten to the standard `DocsSearchIndexItem[]` shape and fixed the broken `#store-events` anchor to the correct `#operation-store_events`)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 10 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override, keyed by the doc's `store_events` operation value — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (replaced the inline `usageGuide.outputs` grouped-comma-string array with the full flat list of all 33 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed — all existing `configFields` types were already valid)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `shopifyTriggerDoc` import/coverage entry and a `shopify_trigger` credential branch)

`slack_trigger` is also now audited and marked `Complete`. This node's `doc.ts`/`search/slack_trigger.ts` existed (search anchors were already correct, unlike `shopify_trigger`) but only documented 4 of the 8 real config fields (`connectionId`, `allowedUserIds`, `teamId`, and `signingSecret` were missing — confirmed against `worker/src/core/registry/overrides/slack-trigger.ts`'s `inputSchema` and the frontend `configFields` in `nodeTypes.ts`), and every field had only a `description`/short `helpText`, not the full 10-point structure. The output example also covered only 8 of the 20 real output fields the registry override's `outputSchema` and `worker/src/services/slack/slack-trigger-service.ts`'s `NormalizedSlackEvent` actually produce. `commonErrors` used near-but-not-exact messages ("No events matched this trigger" vs. the real "Slack webhook received, no events matched this trigger."); these are now exact, matching `worker/src/api/slack-trigger.ts`. No invalid `ConfigField` types this time. `node-field-content.ts` and `node-content-overrides.ts` had no entries at all for this node; `nodeGuides.ts` also had none.

`slack_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/slack_trigger.doc.ts` (fully rewritten: added `connectionId`, `allowedUserIds`, `teamId`, and `signingSecret` fields with full 10-point helpText, corrected/completed the output example against the real `NormalizedSlackEvent` shape plus trigger metadata, and replaced near-miss error messages with the exact runtime strings)
- `ctrl_checks/src/docs-content/search/slack_trigger.ts` (added field/output/connection-setup search entries; the existing node/operation entries and anchors were already correct)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 8 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 9 abbreviated entries to all 20 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed — all existing `configFields` types were already valid)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `slackTriggerDoc` import/coverage entry and a new `slack_trigger` credential branch, named distinctly from the existing `slack` kind used by the `slack_message` action node's bot-token credential)

`stripe_trigger` is also now audited and marked `Complete`. This node's `doc.ts` was already fairly complete (6 of 7 fields present, `connectionId` missing) with correct search anchors, but every field had only a one-line `description`, no `helpText` at all. The output example covered only 6 of the 30 real output fields the registry override's `outputSchema` and `worker/src/services/stripe/stripe-trigger-service.ts`'s `NormalizedStripeEvent` actually produce, and `commonErrors` used generic placeholders instead of the real runtime strings from `worker/src/api/stripe-trigger.ts`. Like `linear_trigger`, Stripe webhook registration is **fully automatic** — `registerStripeWebhook` calls Stripe's `/v1/webhook_endpoints` API directly and stores the returned signing secret, so no manual dashboard step is required (contrast with `jira_trigger`'s manual-only registration). A genuinely subtle, non-obvious behavior worth flagging for future sessions: the `livemode` (Live Mode Only) boolean field has no true three-state UI — leaving it completely untouched means no filter is applied, but once a user checks it and then unchecks it again, the saved config can become an explicit `false`, which then actively filters to test-mode-only events rather than returning to "no filter." This is now documented as a common mistake in the field's helpText. No invalid `ConfigField` types this time. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`stripe_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/stripe_trigger.doc.ts` (fully rewritten: added `connectionId` field, full 10-point helpText for all 7 fields including the `livemode` three-state gotcha, corrected/completed the output example against the real `NormalizedStripeEvent` shape plus trigger metadata, and replaced placeholder error messages with the real runtime strings)
- `ctrl_checks/src/docs-content/search/stripe_trigger.ts` (added field/output/connection-setup search entries; the existing node/operation entries and anchors were already correct)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 7 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override, keyed by the doc's `payment_billing_events` operation value — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 21 to all 30 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed — all existing `configFields` types were already valid)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `stripeTriggerDoc` import/coverage entry and a `stripe_trigger` credential branch)

`tally_trigger` is also now audited and marked `Complete`. This node's `doc.ts` was small and mostly present (2 of 3 fields, `connectionId` missing) but had no `helpText` on either field, and the search file used a bare unstructured array (no `type`/`category`, not `satisfies DocsSearchIndexItem[]`) unlike every other trigger's search file — fixed to the standard shape. The output example was missing `source`, `userId`, `username`, `text`, `timestamp`, and the `trigger`/`workflow_id`/`node_id`/`sessionId`/`_tally` metadata fields. Important transparency finding worth carrying forward: `worker/src/services/tally/tally-trigger-service.ts` contains an explicit code comment stating Tally's exact webhook signature wire format was **never confirmed against a live Tally delivery** — the implementation defensively accepts both a raw base64 HMAC-SHA256 digest and a `sha256=`-prefixed form since Tally's public documentation was ambiguous at build time. This is now called out directly in the doc's setup steps as an "advanced users" note, rather than presenting Stripe/GitHub-level confidence about a mechanism that was explicitly flagged as best-effort in the source. Registration itself is automatic (Tally API's `POST /forms/{formId}/webhooks`), similar to Linear/Stripe/GitHub/GitLab rather than Jira's manual-only model. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`tally_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/tally_trigger.doc.ts` (fully rewritten: added `connectionId` field with full 10-point helpText for all 3 fields, corrected/completed the output example against the real `NormalizedTallyEvent` shape plus trigger metadata, added the unconfirmed-signature-format transparency note, and replaced/completed error messages with the real runtime strings)
- `ctrl_checks/src/docs-content/search/tally_trigger.ts` (rewritten from a bare untyped array to the standard `DocsSearchIndexItem[]` shape with node/operation/field/output/connection coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 3 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 7 to all 12 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `tallyTriggerDoc` import/coverage entry and a `tally_trigger` credential branch)

`telegram_trigger` is also now audited and marked `Complete`. This node's `doc.ts` documented all 4 frontend-exposed fields but was missing `connectionId`, had no full 10-point helpText, and the search file's operation anchor was `#operation-receive-update` when the real operation value is `default` (confirmed the correct anchor generator convention is `#operation-${operation.value}`, so it should be `#operation-default` — same broken-anchor bug class as `shopify_trigger`, now fixed). The most significant finding this node produced: `worker/src/api/db-proxy.ts` line 252 calls `autoRegisterTelegramWebhooksForWorkflow({ ..., force: true })` unconditionally on every save/activate of a workflow containing this trigger, while `worker/src/services/telegram/telegram-trigger-service.ts`'s `registerTelegramWebhook` only throws the "already has a webhook" 409 error when `force` is *not* true. This means the "Telegram allows one webhook per bot token" safety check that the pre-existing docs described as an error condition **never actually fires on the normal save/activate path** — it only fires on a manual, non-automatic API call to the registration endpoint (`worker/src/api/telegram-trigger.ts`, which defaults `force: req.body?.force === true`). In practice, saving or activating any workflow with a Telegram Trigger silently steals the webhook from any other active workflow sharing the same bot token, with no confirmation or warning. This is now documented prominently in the setup steps, the commonErrors entry for that message, and the `nodeTypes.ts` tip text (which already had a partial, softer warning — "Reusing one bot in another workflow replaces the previous webhook" — now sharpened to state this happens silently and automatically on every save). No invalid `ConfigField` types this time (the frontend already correctly uses `text` rather than `password` for `secretToken`). `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`telegram_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/telegram_trigger.doc.ts` (fully rewritten: added `connectionId` field with full 10-point helpText for all 5 fields, corrected/completed the output example against the real `NormalizedTelegramUpdate` shape plus trigger metadata, and added the force-registration/silent-webhook-takeover warning to setup steps and commonErrors)
- `ctrl_checks/src/docs-content/search/telegram_trigger.ts` (fixed the broken `#operation-receive-update` anchor to the correct `#operation-default`, and added field/output/connection-setup search entries)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 5 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from a single joined string to a proper 16-item array including all trigger-metadata fields, and sharpened the existing webhook-takeover tip to describe the actual silent/automatic behavior; no field keys or types changed)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `telegramTriggerDoc` import/coverage entry and a new `telegram_trigger` credential branch, named distinctly from the existing `telegram` kind used by the `telegram` action node's bot-token credential)

`trello_trigger` is also now audited and marked `Complete`. This node's `doc.ts` documented 5 of the 8 real config fields (`connectionId`, `memberId`, and `query` were missing) with only one-line descriptions and no `helpText`. The output example covered only 5 of the 29 real output fields the registry override's `outputSchema` and `worker/src/services/trello/trello-trigger-service.ts`'s `NormalizedTrelloEvent` actually produce. Worth noting: this trigger requires the Trello **App Secret** specifically for X-Trello-Webhook HMAC validation — a value ordinary Trello action-node credentials never need — and `resolveTrelloCredential` throws a dedicated error (`Trello Trigger requires the Trello app secret...`) when it's missing even though API Key + Token alone are enough for normal Trello actions; this distinction is now explicit in the docs. Registration also requires Trello to HEAD-validate the callback URL before creating the webhook (return 200 or creation fails), which is now documented as a setup prerequisite. No invalid `ConfigField` types this time. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`trello_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/trello_trigger.doc.ts` (fully rewritten: added `connectionId`, `memberId`, and `query` fields with full 10-point helpText for all 8 fields, corrected/completed the output example against the real `NormalizedTrelloEvent` shape plus trigger metadata, and documented the App Secret requirement and HEAD-validation prerequisite)
- `ctrl_checks/src/docs-content/search/trello_trigger.ts` (added field/output/connection-setup search entries; the existing node/operation entries and anchors were already correct)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 8 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override, keyed by the doc's `card_events` operation value — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 22 to all 29 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed — all existing `configFields` types were already valid)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `trelloTriggerDoc` import/coverage entry and a `trello_trigger` credential branch)

`typeform_trigger` is also now audited and marked `Complete`. Same shape and gaps as `tally_trigger`: 2 of 3 fields documented (`connectionId` missing), no `helpText` on any field, and the search file used a bare untyped array — fixed to the standard `DocsSearchIndexItem[]` shape. Important, previously-undocumented finding: `worker/src/services/typeform/typeform-trigger-service.ts`'s `normalizeTypeformResponse` hardcodes `userId: null` and `username: ''` unconditionally — Typeform's webhook payload structure never includes a respondent identity at all (unlike Tally, whose payload has a `respondentId`). This is now called out explicitly in the doc and troubleshooting so nobody wastes time trying to map `{{$json.userId}}` for a Typeform response; respondent contact info must come from an actual answer field (such as an email question) instead. Registration uses a stable PUT to `/forms/{formId}/webhooks/{tag}` (tag derived from node ID), which is idempotent — re-saving the workflow safely updates the same webhook rather than risking duplicates, unlike Trello's create-then-delete-old-one pattern. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`typeform_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/typeform_trigger.doc.ts` (fully rewritten: added `connectionId` field with full 10-point helpText for all 3 fields, corrected/completed the output example against the real `NormalizedTypeformEvent` shape plus trigger metadata, and added the always-null userId/username finding to setup steps and troubleshooting)
- `ctrl_checks/src/docs-content/search/typeform_trigger.ts` (rewritten from a bare untyped array to the standard `DocsSearchIndexItem[]` shape with node/operation/field/output/connection coverage)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 3 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 7 to all 12 real output fields plus 5 trigger-metadata fields; no field keys, types, or order changed)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `typeformTriggerDoc` import/coverage entry and a `typeform_trigger` credential branch)

`whatsapp_trigger` is also now audited and marked `Complete` — **this finishes the entire `triggers` category tracker section.** This node's `doc.ts` was already fairly well written (5 of 6 fields present with real helpText, `connectionId` missing) but the `eventTypes` dropdown field had no `options` array documenting its 7 real dropdown values (Incoming Messages/Text Messages/Media Messages/Delivery Statuses/Delivered/Read/Failed, confirmed against the `select` field in `nodeTypes.ts`), and the output example covered only 8 of the 20 real output fields the registry override's `outputSchema` and `worker/src/services/whatsapp/whatsapp-trigger-service.ts`'s `NormalizedWhatsAppEvent` actually produce (missing `contactName`, `profileName`, `recipientId`, `businessAccountId`, `displayPhoneNumber`, `messageType`, `mediaId`, `status`, plus trigger metadata). Worth noting: `username`, `contactName`, and `profileName` are always the same value (the sender's WhatsApp profile display name) and all three are empty for status events — this redundancy is now explained rather than left to guesswork. `node-field-content.ts`, `node-content-overrides.ts`, and `nodeGuides.ts` had no entries at all for this node.

`whatsapp_trigger` completed files:

- `ctrl_checks/src/docs-content/nodes/whatsapp_trigger.doc.ts` (fully rewritten: added `connectionId` field, added the `options` array and full dropdown documentation for `eventTypes`, full 10-point helpText for all 6 fields, corrected/completed the output example against the real `NormalizedWhatsAppEvent` shape plus trigger metadata)
- `ctrl_checks/src/docs-content/search/whatsapp_trigger.ts` (added field/output/connection-setup search entries; the existing node/operation entries and anchors were already correct)
- `ctrl_checks/src/docs-content/node-field-content.ts` (added field guidance for all 6 fields — no prior entry existed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned receive output and usage override, keyed by the doc's `receive_event` operation value — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (completed the inline `usageGuide.outputs` list from 7 to all 20 real output fields plus 5 trigger-metadata fields, and added a tip about status events never populating `text`; no field keys, types, or order changed — the existing `select` dropdown was already correct)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (added field-level setup guides — no prior entry existed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `whatsappTriggerDoc` import/coverage entry and a new `whatsapp_trigger` credential branch, named distinctly from the existing `whatsapp` kind used by the `whatsapp`/`whatsapp_cloud` action nodes)

**The entire `triggers` category tracker section is now fully `Complete`** (every trigger node from `chat_trigger` through `workflow_trigger` is marked `Complete`). Per the plan's "Suggested Execution Order," the next high-impact category is CRM nodes.

`activecampaign` is also now audited and marked `Complete`, the first CRM node. This node's `doc.ts` was **entirely fabricated auto-generated boilerplate**: fake "Add"/"Update"/"Delete" operations each showing only a generic "Contact Id" field and a made-up flat output shape `{success, operation, id, message, data, result, output, error}` that the runtime never returns. The real runtime (`worker/src/core/registry/overrides/activecampaign.ts`, `overrideActivecampaign`) has 8 real fields (`operation`, `apiUrl`, `apiKey`, `contactId`, `email`, `firstName`, `lastName`, `data`) and returns a much simpler `{operation, data}` shape on success — `data` is ActiveCampaign's raw API response for Add/Update (a `{contact: {...}}` object) but a synthetic `{deleted: true, contactId}` for Delete, since ActiveCampaign's own delete endpoint returns no body at all. Important credential-model finding: a `activecampaign_api` Connections credential type exists and can supply `apiKey` automatically at runtime (per `connector-registry.ts`'s `credentialFieldName: 'apiKey'`), but `apiUrl` can never come from a saved connection — it must always be typed on the node itself, since every ActiveCampaign account has a different subdomain; this asymmetry is now explained. `nodeUsageGuides.ts` and `nodeGuides.ts` already had accurate entries from a prior pass and needed only minor additions/corrections rather than a rewrite. `node-content-overrides.ts` had no entry (added). `node-field-content.ts` was deliberately **not** touched, per the new process note above.

`activecampaign` completed files:

- `ctrl_checks/src/docs-content/nodes/activecampaign.doc.ts` (fully rewritten: real `operation`/`apiUrl`/`apiKey`/`contactId`/`email`/`firstName`/`lastName`/`data` fields with full 10-point helpText, 3 real operations, correct `{operation, data}` output shape per operation including Delete's synthetic confirmation object, and real runtime error messages)
- `ctrl_checks/src/docs-content/search/activecampaign.ts` (rewritten with correct CRM category and accurate node/operation/field/output/connection entries; the field-level entries were already accurate and are preserved in spirit)
- `ctrl_checks/src/docs-content/manifest.ts` (fixed category from the placeholder `Data` to `CRM` and replaced the auto-generated description)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added runtime-aligned output/usage overrides for all 3 operations — no prior entry existed; added under a new `CRM` section header)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (tips list expanded with the Connections/apiUrl asymmetry and the Delete output shape; the overview/inputs/outputs/example were already accurate from a prior pass)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (left as-is — the existing `apiKey`/`apiUrl` step-by-step guides were already accurate, just in a different emoji-heavy style used throughout that file; not worth a stylistic rewrite)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `activecampaignDoc` import/coverage entry and an `activecampaign` credential branch)

`freshdesk` is also now audited and marked `Complete`, the second CRM node. Unlike `activecampaign`, this node has **no dedicated registry override file** — `worker/src/core/registry/overrides/freshdesk.ts` does not exist. Its entire real execution logic lives inline in a legacy `case 'freshdesk':` block in `worker/src/api/execute-workflow.ts` (lines 5757-5854). The pre-existing `freshdesk.doc.ts` was the same class of fully-fabricated auto-generated boilerplate found on `activecampaign`: 4 fake generic operations (get/create/update/delete) sharing one fabricated `{success, operation, id, message, data, result, output, error}` output shape that the runtime never returns, and the `operation` config field itself was never documented as a `FieldDoc`.

Key findings verified directly from the real runtime code (`execute-workflow.ts` lines 5757-5854):

- **Real supported operations are `get`/`read` (alias), `list`, `create`, `update`, `delete`** — 5 operations, not 4, and the frontend dropdown's real values are `list`/`get`/`create`/`update`/`delete`/`search`. **`search` is a real, selectable dropdown option that the backend does not implement at all** — selecting it always falls through to `Freshdesk: Unsupported operation "search". Supported: get/read, list, create, update, delete`. This is a genuine, previously-undocumented dead dropdown option, the same class of finding as `google_drive`'s non-functional Delete — documented plainly rather than silently repeated as if it worked.
- **Real output shapes are per-operation and differ from every prior CRM node**: `get` → `{success: true, item}`; `list` → `{success: true, items}` (no pagination — Freshdesk's default page/page-size only, despite the frontend having `page`/`perPage` fields); `create` → `{success: true, created}`; `update` → `{success: true, updated}`; `delete` → `{success: true, deleted: true, id}` (Freshdesk's DELETE endpoint returns no body, same class of synthetic-confirmation-object finding as `activecampaign`'s delete). Failures return `{_error, _errorDetails?}` with **no `success` key at all** (not even `false`) — a nuance worth remembering for the next CRM node too.
- **`resource` mapping bug found and documented (not fixed — out of scope for a docs pass)**: `ticket`→`tickets`, `contact`→`contacts`, `company`→`companies` all work; `agent`→`agents` and `group`→`groups` work by generic `${resource}s` pluralization fallback; but `time_entry`→`time_entrys` (wrong — Freshdesk's real endpoint is `/time_entries`), so the Time Entry dropdown option silently fails today. Documented as a common mistake on the `resource` field rather than silently repeated as working.
- **`query`/`page`/`perPage` are frontend-only decorative fields**: all three exist in `nodeTypes.ts`'s `configFields` (intended for the broken Search operation and List pagination) but are never read anywhere in the real execution code — filling them has zero effect. Documented plainly, same transparency approach as `google_sheets`'s `allowWrite`/`google_bigquery`'s `datasetId`.
- **Credential asymmetry matches `activecampaign`'s pattern**: only `apiKey` is vault-backed (`connector-registry.ts`'s `credentialFieldName: 'apiKey'`); `domain` must always be typed directly on the node even after connecting Freshdesk in Connections, since every account has a different subdomain. Freshdesk uses HTTP Basic Auth with the API key as username and the literal letter `X` as password — confirmed in both the runtime (`Buffer.from(\`${apiKey}:X\`)`) and the credential type registry's `injection`/`testRequest` (`GET https://{{domain}}/api/v2/agents/me`).
- **Ticket-creation convenience fields are ticket-only and create-only**: `subject`/`descriptionText`/`email`/`priority`/`status` only populate a payload when Resource is `ticket` AND all three of Subject/Description Text/Email are present together; they have zero effect on Update (Update always requires the `data` JSON field instead) and zero effect on non-ticket resources. This is a real, easy-to-miss gotcha (a user might expect changing Subject then running Update to rename the ticket) and is documented explicitly as a common mistake on every one of those 5 fields.

`freshdesk` completed files:

- `ctrl_checks/src/docs-content/nodes/freshdesk.doc.ts` (fully rewritten: 14 real fields — `operation`, `resource`, `domain`, `apiKey`, `id`, `data`, `subject`, `descriptionText`, `email`, `priority`, `status`, `query`, `page`, `perPage` — full 10-point helpText each, 5 real operations get/list/create/update/delete with runtime-accurate per-operation output shapes, the broken `search` operation and `time_entry` resource documented as known-broken dropdown options, and 8 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/freshdesk.ts` (rewritten from a 972-line duplicated-boilerplate array to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'` and correct `#operation-<value>` anchors for all 5 operations)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a `freshdesk` block under the existing `CRM` section header, with runtime-aligned output/usage overrides for all 5 operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated `{result, tickets, contacts, agents}` output claim to the real per-operation output keys, added the broken-Search/time_entry/ticket-convenience-fields-are-create-only findings to tips)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (left unchanged — the existing API Key step-by-step guide was already accurate)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all `configFields` types were already valid; the `search`/`time_entry`/`query`/`page`/`perPage` gaps are pre-existing backend/frontend mismatches, documented rather than fixed, consistent with the "docs pass, not a bug-fix pass" scope used for `google_drive`'s Delete)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `freshdeskDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['domain', 'apiKey']`, and a new `freshdesk` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `freshdesk`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **385 tests passing** (384 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 14.75s with no new warnings. No worker source files were touched in this batch (freshdesk's real logic lives in `execute-workflow.ts`, which was only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`hubspot` is also now audited and marked `Complete`, the third CRM node. Unlike `freshdesk`, this node DOES have a dedicated registry override file (`worker/src/core/registry/overrides/hubspot.ts`), but that file only defines input-schema metadata (dropdown options, visibleIf rules, operationContracts) and delegates real execution to `executeViaLegacyExecutor`, which routes into the same legacy `case 'hubspot':` switch block in `worker/src/api/execute-workflow.ts` (lines 15797-16266) — so, like `freshdesk`, the actual API-calling logic still lives in the legacy switch, just reached through an extra indirection layer. This is a third architectural pattern worth remembering for remaining CRM nodes: (1) no override file at all + legacy switch (`freshdesk`), (2) full override with its own `execute()` (`activecampaign`), (3) override file for schema/UI metadata only + legacy switch for execution (`hubspot`).

Key findings verified directly from the real runtime code:

- **Failure shape differs from every prior CRM node**: unlike `freshdesk`/`activecampaign` (which `return` an `_error` object inline), the `hubspot` case block `throw`s real JavaScript `Error`s on every failure path. These are caught by `executeViaLegacyExecutor`'s outer try/catch (`worker/src/core/registry/unified-node-registry-legacy-adapter.ts` line 226) and converted to `{success: false, error: {code: 'EXECUTION_ERROR', message, details: error}}`, which `dynamic-node-executor.ts` (line 1289-1296) then flattens to `{_error: message, _errorCode: 'EXECUTION_ERROR', _errorDetails: <the raw JS Error object>, _nodeType: 'hubspot'}`. The important nuance: **`_errorDetails` here is just the JS Error object, not a parsed HubSpot API error body** (unlike `freshdesk`'s `_errorDetails`, which holds the real API error text) — all of the useful HubSpot error message is already inside `_error` itself, since the thrown `Error.message` string is built from HubSpot's parsed `errorJson.message`/`errorJson.error` before being thrown. Documented explicitly in every operation's `outputDescription` so nobody goes looking for extra detail in `_errorDetails` that isn't there.
- **7 real operations, not the 6 the old doc had**: `get`, `getMany`, `create`, `update`, `delete`, `search`, and `batchCreate` (frontend dropdown label "Create Multiple") are all real and reachable from the visual panel. Two more, `batchUpdate`/`batchDelete`, are implemented in the same switch branch and marked `status: 'implemented'` in the override's own `operationContracts`... but are **not** in the frontend dropdown at all — reachable only by hand-editing workflow JSON. The pre-existing doc was missing `batchCreate` entirely and never documented the `operation` field itself as a `FieldDoc`.
- **`resource` dropdown exposes only 4 of ~14 backend-supported values**: the visual Resource dropdown only offers Contact/Company/Deal/Ticket, but the runtime's `normalizeHubSpotResource()` also recognizes and correctly pluralizes `product`, `line_item`, `quote`, `call`, `email`, `meeting`, `note`, `task`, `owner`, and `pipeline` — all real, working HubSpot object types, just not selectable in this dropdown today. Documented as reachable only via direct JSON/AI-generated workflows, same treatment as `google_calendar`'s 8 non-`event` resources and `whatsapp`'s extra resources.
- **`credentialId` is genuinely dead**: declared in the backend schema's `optionalConfig`, but grepped the entire `case 'hubspot'` block and confirmed it is never read anywhere — credential resolution always goes through the standard saved-connection/vault lookup keyed by workflow+node, never through this field. Documented plainly, same class of finding as `freshdesk`'s `query`/`page`/`perPage`.
- **Two real, distinct credential types exist for the same provider**: `hubspot_oauth2` (full OAuth2 with refresh, `defaultScopes` covering contacts/companies/deals/owners/tickets) and `hubspot_private_app` (a single Bearer token, the modern recommended path per HubSpot's own product direction). Both are stored under the same `hubspot` connector (`connector-registry.ts`'s `credentialFieldName: 'accessToken'`), and the runtime transparently accepts whichever is present (`accessToken` first, then a generic `token` field, then the deprecated `apiKey`). Documented both connection paths and their respective test-request URLs (`GET /oauth/v1/access-tokens/{token}` for OAuth2, `GET /crm/v3/objects/contacts?limit=1` for Private App).
- **Output field duplication pattern differs by operation**: `get`/`update` return `{id, record, properties}` (properties duplicated at top level); `create` additionally duplicates `createdAt`/`updatedAt` at the top level (a HubSpot-specific quirk not present on `update`); `delete` has no `record` at all (`{id, deleted: true}`, since HubSpot's DELETE returns HTTP 204 with no body — same synthetic-confirmation pattern as `freshdesk`/`activecampaign` delete); `batchCreate` merges HubSpot's raw batch response directly with no wrapper key at all (read `{{$json.results}}`/`{{$json.status}}` directly, not nested under `data` or `record`). All of this is exact per-operation `outputExample`/`outputDescription` content in the rewritten doc.
- **Search has no pagination cursor, unlike Get Many**: `search`'s real code only extracts `results`/`total` from HubSpot's search response and discards any `paging` HubSpot might include — so a workflow needing more than one page of search results has no cursor to follow, unlike `getMany` which fully exposes `paging.next.after`. Documented as a known limitation on the Search operation.

`hubspot` completed files:

- `ctrl_checks/src/docs-content/nodes/hubspot.doc.ts` (fully rewritten: 12 real fields — `operation`, `resource`, `id`, `objectId`, `properties`, `records`, `searchQuery`, `limit`, `after`, `accessToken`, `apiKey`, `credentialId` — full 10-point helpText each, 7 real operations get/getMany/create/update/delete/search/batchCreate with runtime-accurate per-operation output shapes, the hidden batchUpdate/batchDelete and extra resource aliases documented as runtime-supported-but-not-in-dropdown, `credentialId`'s dead-field status documented, and 8 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/hubspot.ts` (rewritten from a 1932-line duplicated-boilerplate array to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'` and correct `#operation-<value>` anchors for all 7 operations)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (rewrote the existing `hubspot` block: added `getMany`/`delete`/`search`/`batchCreate` entries that were missing entirely, and fixed the existing `get`/`create`/`update` entries' fabricated output shapes — the old versions were missing `success`/`record` and used a stale `objectType`/`hs_object_id` field vocabulary that doesn't match the real `resource` config key)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated `{result, records, paging}` output claim to the real per-operation output keys, added the `_errorDetails`-is-just-a-JS-Error nuance and the dead `credentialId` field to tips)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (targeted fix only: the `apiKey` guide previously showed a `pat-...` Private App token as its example, which is actually the Access Token format, not a legacy API key — corrected the guide to clearly mark Api Key as legacy/deprecated and point to Access Token/OAuth2 instead; the `authType`/`resource`/`operation`/`id`/`properties`/`searchQuery` guides were already accurate and left unchanged)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all `configFields` types were already valid, including the custom `hubspotProperties`/`hubspotRecords` field types; the hidden `batchUpdate`/`batchDelete` operations and extra resource aliases are pre-existing frontend/backend scope gaps, documented rather than fixed, consistent with the "docs pass, not a bug-fix pass" scope used for `freshdesk`'s `search`/`time_entry` gaps)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `hubspotDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['resource', 'operation']`, and a new `hubspot` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `hubspot`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **391 tests passing** (390 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 13.35s with no new warnings. No worker source files were touched in this batch (both `hubspot.ts` override and the `execute-workflow.ts` case block were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`intercom` is also now audited and marked `Complete`, the fourth CRM node. This is the most severe frontend/backend mismatch found in the entire audit so far — more severe than `freshdesk`'s broken `search` operation or `hubspot`'s dead `credentialId` field. The real execution engine (`worker/src/core/registry/overrides/intercom.ts`, a full override with its own `execute()`, same architectural pattern as `activecampaign` — no `execute-workflow.ts` case exists for this node at all) only implements **3 operations**: `list`, `get`, and `send`. The visual panel's Operation dropdown (`nodeTypes.ts`) instead offers **6 completely different values**: Get, List, Create, Update, Delete, Search.

Key findings verified directly from the real runtime code:

- **Only 2 of the 6 dropdown values work at all**: Get and List. Create, Update, Delete, and Search all immediately fail with `Unsupported Intercom operation: <operation>` — none of those four exist in the runtime whatsoever.
- **The node's actual write capability, `send` (reply to a conversation), is not in the dropdown at all.** It can currently only be reached by hand-editing workflow JSON or through an AI-generated workflow — there is no way to select it from the Properties Panel.
- **The "Resource" dropdown (Contact/Conversation/Message/Tag/Segment/Company/Event) is 100% decorative** — the real code never reads `inputs.resource` for any operation; every operation always acts on Intercom Conversations via `/conversations` endpoints regardless of what is selected.
- **The "Resource ID" field (config key `id`) is never read.** The real code reads a `conversationId` key instead, which has zero matching frontend field — meaning even "Get" (one of the two nominally-working dropdown values) cannot succeed through the visual panel alone; a user must currently supply `conversationId` via AI generation or direct JSON editing.
- **"Search Query" is also 100% decorative** — no search operation exists in the runtime, so this field is never read regardless of what Operation is selected.
- **`message` and `adminId` are real and required for `send`, but have zero frontend fields at all.** The only way to send a real reply through the visual panel today is via the "Data (JSON)" field, supplying Intercom's full raw reply payload (`{message_type, type, admin_id, body}`) as a manual override — the field's own label ("required for create/update") is itself wrong, since create/update don't exist.
- **Given the scope of what a real fix would require** (renaming a field, changing 4 of 6 dropdown values, and adding 2 entirely new fields), this was judged too large to safely "small-fix" within a documentation audit pass (unlike `google_contacts`'s single dropdown-value + single field-key rename, or `google_bigquery`'s single required-flag flip) — consistent with the plan's guidance to document clearly rather than silently drop or silently patch when the gap is this large. `nodeTypes.ts` was reviewed but intentionally **not modified**; this is flagged prominently below as a strong candidate for a dedicated future bug-fix task, separate from this documentation-only audit.
- **Error shape has no `_errorDetails` at all** (unlike `freshdesk`/`hubspot`): the override's failure path only ever sets `{code: 'INTERCOM_FAILED', message}` with no `details` key, so `dynamic-node-executor.ts` flattens it to `{_error, _errorCode: 'INTERCOM_FAILED', _nodeType}` — no `_errorDetails` key appears on failure for this node at all. Documented explicitly so nobody looks for extra detail there.
- **Successful output shape is `{operation, data}`**, identical in structure to `activecampaign` (both are full-override nodes with their own `execute()` returning `{success:true, output:{operation, data}}`, which the executor merges directly into `$json`).
- Credential type is `intercom_token` (simple Bearer token, not a full OAuth2 flow despite the connector-registry entry's `type: 'oauth'`/displayName `'Intercom OAuth'` — the actual usable credential type registered in `credential-type-registry.ts` is `authType: 'bearer_token'`, tested with `GET https://api.intercom.io/me`). Documented the accurate credential type name (`credentialType: 'Intercom Access Token'`) rather than the pre-existing doc's generic `"Intercom API Key"`.

`intercom` completed files:

- `ctrl_checks/src/docs-content/nodes/intercom.doc.ts` (fully rewritten: the pre-existing doc had accidentally-correct operation values — send/get/list — because it was generated from the *backend* schema rather than the frontend panel, but used fully fabricated generic boilerplate content with none of the real fields (`operation`, `accessToken`, `resource`, `id`, `data`, `query`, `perPage`, `startingAfter`, `message`, `adminId`) documented; rewritten with all 11 fields — including full documentation of which ones are decorative/broken — full 10-point helpText each, 3 real operations with runtime-accurate output shapes, and 7 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/intercom.ts` (rewritten from a 204-line duplicated-boilerplate array to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `intercom` block — no prior entry existed — with runtime-aligned output/usage overrides for all 3 real operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated `{result, contacts, conversations, messages}` output claim to the real `{operation, data}` shape, and led with the dropdown/runtime mismatch as the first tip since it is the single most important thing a user needs to know about this node)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — the existing Access Token acquisition guide was already accurate; there were no field-level guides for resource/operation/id/data to correct)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, intentionally **not changed** — see findings above; the operation-dropdown/field mismatch is real and severe but too large in scope to safely fix within this documentation-only audit pass)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `intercomDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'accessToken']`, and a new `intercom` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `intercom`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **397 tests passing** (396 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 12.38s with no new warnings. No worker source files were touched in this batch (the override file was only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`intuit_smes` is also now audited and marked `Complete`, the fifth CRM node. Unlike every other node audited so far, this one's real execution code (`worker/src/services/database/intuitSmesNode.ts`) is **an explicit, self-admitted mock/demo implementation** — its own source comments say "Mock implementation - replace with actual Intuit API call" on every operation, and this fact was already disclosed (from a prior session's Credential Connection UI Audit) in the backend schema's `description`, `worker/src/credentials-system/credential-type-registry.ts`'s `intuit_smes_connection` helpText, and `worker/src/services/connectors/connector-registry.ts`'s description — but the `.doc.ts`/`nodeUsageGuides.ts`/inline `nodeTypes.ts` usageGuide had never mentioned it at all, and in fact `nodeTypes.ts`'s usageGuide actively told users to "Ensure your Intuit API credentials are valid and have the required permissions," which is false — the node checks credential fields for non-empty presence only and never validates or sends them anywhere.

Architecture note for future CRM nodes: this is a fourth distinct pattern beyond the three already seen — the override file (`worker/src/core/registry/overrides/intuit-smes.ts`) just delegates to `executeViaLegacyExecutor`, which reaches a `case 'intuit_smes':`/`case 'intuit':` block in `execute-workflow.ts` that itself delegates again to `executeDatabaseNode('intuit_smes', ...)` in `worker/src/services/database/database-node-handler.ts`, which finally reaches the real (mock) logic in `intuitSmesNode.ts`. Worth checking whether any other CRM node routes through `executeDatabaseNode` too (it also handles `odoo`, `firebase`, `mongodb`, `mysql`, `postgres`, `redis`, `sql_server`, `timescaledb` — `odoo` is a remaining CRM node, worth checking whether it's real or another mock).

Key findings verified directly from the real runtime code:

- **All 5 operations are simulated**: `getCustomers`/`getInvoices` always return the exact same 2 hardcoded rows regardless of credentials, resource, or any input; `createCustomer`/`updateCustomer`/`createInvoice` only echo back whatever you typed into the node as a fabricated confirmation object (with a locally-generated `CUST-<timestamp>`/`INV-<timestamp>` placeholder ID) — nothing is ever sent to or saved in Intuit/QuickBooks.
- **Zero field validation beyond a credential-presence check**: unlike every real CRM node audited this session (which validate required IDs/properties per operation and return specific errors), this mock node never checks whether `customerId`/`name`/`email`/`amount` are present — missing values simply come back as `undefined` in the fabricated response rather than erroring. This is a genuinely unique behavior worth flagging since it breaks the pattern established by every other node in this category.
- **The `data` config field (declared in both backend schema and originally marked `required: true` in the old doc) is completely dead** — `intuitSmesNode.ts` never reads `inputs.data` anywhere. The old doc's `required: true` flag on this field was actively wrong; the field has zero effect regardless of what's in it.
- **The `resource` value is read but never used again** (`const resource = inputs.resource || 'customer';` with no further reference) — not declared in either the backend schema or frontend `configFields`, so it wasn't a required `FieldDoc` per the coverage test, but documented in prose as trivia rather than silently ignored.
- **Output shape confirmed via the full round trip**: `intuitSmesNode.ts` returns `{success, data, message, error: null}` on success or `{success: false, error: {message}}` on failure; the `case 'intuit_smes'` handler in `execute-workflow.ts` spreads the success result directly (`{...inputObj, ...intuitResult}`) but on failure only extracts `_error` from `intuitResult.error?.message` (dropping the `success: false` key entirely) — so failures return `{..., _error}` with no `success` key at all, while successes return `{..., success: true, data, message, error: null}`.

`intuit_smes` completed files:

- `ctrl_checks/src/docs-content/nodes/intuit_smes.doc.ts` (fully rewritten: 9 real fields — `operation`, `apiKey`, `accessToken`, `credentialId`, `customerId`, `name`, `email`, `amount`, `data` — full 10-point helpText each explicitly disclosing the mock/demo nature and zero-validation behavior on every field, 5 operations with runtime-accurate fixed/fabricated output shapes, and 4 `commonErrors` entries including one specifically warning that fabricated responses can be mistaken for real Intuit/QuickBooks records)
- `ctrl_checks/src/docs-content/search/intuit_smes.ts` (rewritten from a 372-line duplicated-boilerplate array to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate with an explicit mock/demo disclosure)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `intuit_smes` block — no prior entry existed — with runtime-aligned output/usage overrides for all 5 operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `intuit_smes` entry — it did not exist before — leading with the mock/demo disclosure as the first tip)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (corrected the inline `usageGuide` block: removed the false "Ensure your Intuit API credentials are valid" claim, added the mock/demo disclosure, and fixed mojibake-corrupted `—` em-dashes in the `inputs`/`outputs` arrays; no `configFields` changes needed — all 6 frontend fields are already correctly read by the mock implementation)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — this node has no entry there; the existing `quickbooks:` section in that file is for a different, unrelated OAuth flow, not this node's `apiKey`/`accessToken` fields)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `intuitSmesDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'apiKey']`, and a new `intuit_smes` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `intuit_smes`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **403 tests passing** (402 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 12.27s with no new warnings. No worker source files were touched in this batch (all runtime files were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`mailchimp` is also now audited and marked `Complete`, the sixth CRM node, and the **worst frontend/backend mismatch found in the entire audit — worse than `intercom`**. The real execution engine (`worker/src/core/registry/overrides/mailchimp.ts`, a full override with its own `execute()`, same architectural pattern as `activecampaign`/`intercom` — no `execute-workflow.ts` case exists) only implements 3 operations: `subscribe`, `unsubscribe`, `send`. The visual panel's Operation dropdown offers 8 completely different values (List, Get, Create, Update, Delete, Add Member, Update Member, Delete Member) — **none of which work, and none of the 3 real operations are selectable from the dropdown at all.** Unlike `intercom` (where 2 of 6 dropdown values at least worked), this node has **zero working dropdown values** — a fresh Mailchimp node run with any Properties Panel selection always fails with "Unsupported Mailchimp operation".

Key findings verified directly from the real runtime code:

- **0 of 8 dropdown Operation values work.** The real operations (subscribe/unsubscribe/send) must currently be set via workflow JSON or an AI-generated workflow — there is no way to reach a working state through the visual panel's Operation dropdown at all.
- **`dataCenter` (frontend field, required) vs `serverPrefix` (real field) are different, unrelated keys.** The frontend's "Data Center" field is 100% dead — the real code auto-detects the data-center prefix from the API Key's own suffix (Mailchimp keys are formatted like `abc123-us21`) and only falls back to a `serverPrefix` config value (which has no frontend field at all) if that inference fails.
- **`memberEmail` (frontend field) vs `email` (real field) are different, unrelated keys** — same class of gap as `intercom`'s `id`-vs-`conversationId` mismatch. Subscribe/Unsubscribe need a value under the exact key `email`; the visible "Member Email" field's value is never read.
- **`resource`, `memberData`, `count`, `offset` are all fully decorative** — none are read anywhere in the real execution code (there's no List operation at all, so pagination fields have nothing to paginate).
- **`campaignId` and `mergeFields` are real fields required/used by Send and Subscribe respectively, with zero frontend fields at all** — same class of gap as `intercom`'s `message`/`adminId`.
- **Send's output `data` is always `null` on success** — Mailchimp's send-campaign endpoint returns HTTP 204 with no body (confirmed by tracing `integrationJsonRequest` → `readAcknowledgedHttpResponse`, which returns `data: null` for any 204/205/zero-content-length response). A workflow checking `{{$json.data.something}}` after Send would always get `undefined`; the absence of `_error` is the only success signal.
- **Given the scope of a real fix** (replacing all 8 dropdown values with 3 different ones, renaming 2 fields, and adding 2 entirely new fields), this was judged the same way as `intercom` — too large for a documentation-only pass, documented transparently rather than patched. `nodeTypes.ts` was reviewed but intentionally **not modified**.
- Credential type is `mailchimp_api_key` (HTTP Basic Auth, any non-empty username + the API key as password) — confirmed via `worker/src/credentials-system/credential-type-registry.ts`; matches the runtime's `basicAuthHeader('ctrlchecks', apiKey)` call exactly.

`mailchimp` completed files:

- `ctrl_checks/src/docs-content/nodes/mailchimp.doc.ts` (fully rewritten: 14 fields — `operation`, `apiKey`, `dataCenter`, `resource`, `listId`, `memberEmail`, `email`, `data`, `memberData`, `count`, `offset`, `serverPrefix`, `mergeFields`, `campaignId` — full 10-point helpText each explicitly documenting which fields are decorative/broken, 3 real operations subscribe/unsubscribe/send with runtime-accurate output shapes including Send's always-null `data`, and 6 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/mailchimp.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `mailchimp` block — no prior entry existed — with runtime-aligned output/usage overrides for all 3 real operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated `{result, members, campaigns, audiences}` output claim to the real `{operation, data}` shape, and led with the fully-broken-dropdown finding as the first tip)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — the existing API Key acquisition guide already correctly explains the data-center suffix)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, intentionally **not changed** — see findings above; the operation-dropdown/field mismatch is real and severe but too large in scope to safely fix within this documentation-only audit pass)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `mailchimpDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'apiKey']`, and a new `mailchimp` credential branch; one fix needed after the first test run: the `count`/`offset` fields were originally defined but not attached to any operation's `fields` array, and the `operation` field's dropdown-option text used spaced-out labels like "Add Member" instead of the literal camelCase values `addMember`/`updateMember`/`deleteMember` the option-guide check requires — both fixed before the suite passed)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `mailchimp`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **409 tests passing** (408 doc-coverage + 1 FieldsTable) after one fix round (see above). `npm run build` (frontend) passed in about 1m39s with no new warnings. No worker source files were touched in this batch (the override file was only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`microsoft_dynamics` is also now audited and marked `Complete`, the seventh CRM node — and a welcome contrast to `intercom`/`mailchimp`: this node's frontend panel is **mostly accurate**. It uses the hubspot-style pattern (override delegates to `execute-workflow.ts`'s legacy switch via `executeViaLegacyExecutor`), and the real 6 operations (getRecords/getRecord/createRecord/updateRecord/deleteRecord/fetchXml) match 6 of the frontend's 8 dropdown values almost exactly — only `associate`/`disassociate` (2 of 8) are dropdown-only and unimplemented, a normal-sized gap like `freshdesk`'s broken `search`, not a severe mismatch.

Key findings verified directly from the real runtime code:

- **No Connections/credential-vault support exists for this node at all** — grepped `credential-type-registry.ts`, `connector-registry.ts`, and `connections-catalog.ts` and found zero references to Dynamics/microsoft_dynamics anywhere. Both `instanceUrl` and `accessToken` must be typed directly on every node, every time, with no saved-connection auto-fill — a first among all CRM nodes audited this session. The pre-existing doc's `credentialSetupSteps` falsely implied Connections support ("Store this secret in CtrlChecks Connections when possible"), which has been corrected.
- **Create Record and Update Record do not return the written field data** — only `{success, id}` (update) or `{success, id, entityId}` (create), since the code never sets Dynamics's `Prefer: return=representation` header. A user expecting `{{$json.data.firstname}}` after a create/update would get nothing; a follow-up Get Record is needed to see the saved values. This was a real gap in the fabricated pre-existing doc.
- **`count` on Get Records/FetchXML is based on `data.length`, not a real Dynamics total-count header** — if Dynamics ever returned a body without the expected `.value` array (unusual in practice for these endpoints), `count` would silently read 0 even if a fallback `data` object had content. Documented as a minor implementation quirk, not a functional problem in normal use.
- **Azure AD access tokens are short-lived (typically ~1 hour) with no refresh-token handling in this node** — this must be repeated manually, a real operational cost worth flagging prominently in the credential setup guidance.
- **`associate`/`disassociate` are listed in both the backend schema's own `operation` field description and the frontend dropdown, but have zero implementation** in the execution engine — always fail with "Unsupported operation". Same class of finding as `freshdesk`'s broken `search`.

`microsoft_dynamics` completed files:

- `ctrl_checks/src/docs-content/nodes/microsoft_dynamics.doc.ts` (fully rewritten: 11 real fields — `instanceUrl`, `accessToken`, `resource`, `customEntity`, `operation`, `id`, `fields`, `fetchXml`, `select`, `filter`, `top` — full 10-point helpText each, 6 real operations with runtime-accurate output shapes including the create/update no-data-returned quirk, the broken `associate`/`disassociate` dropdown values documented, and 6 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/microsoft_dynamics.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `microsoft_dynamics` block — no prior entry existed — with runtime-aligned output/usage overrides for all 6 real operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `microsoft_dynamics` entry — it did not exist before — leading with the no-Connections-support finding)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed mojibake-corrupted `—` em-dashes in the inline `usageGuide.inputs`/`outputs` arrays, and corrected the `outputs` list to include `count`/`id`/`entityId`/`_error` and clarify that create/update do not return `data`; no `configFields` changes needed — all 11 fields are already correctly read by the real runtime)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists for this node and none was needed, since there is no Connections flow to document; manual token-acquisition guidance already lives in the doc's `credentialSetupSteps`)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `microsoftDynamicsDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['instanceUrl', 'accessToken']`, and a new `microsoft_dynamics` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `microsoft_dynamics`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **415 tests passing** (414 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 14.11s with no new warnings. No worker source files were touched in this batch (both the override file and the `execute-workflow.ts` case were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`odoo` is also now audited and marked `Complete`, the eighth CRM node. Good news: `odoo`'s handler (`worker/src/services/database/odooNode.ts`) turned out to be a **real, fully-working integration** — genuine JSON-RPC calls to Odoo's `/web/session/authenticate` and `/web/dataset/call_kw` endpoints, not a mock like `intuit_smes`. This node also has a fifth distinct architectural pattern worth noting for remaining CRM nodes: the override (`worker/src/core/registry/overrides/odoo.ts`) calls `runOdooNode()` directly, bypassing both the legacy switch and `executeDatabaseNode()`'s dispatcher entirely (unlike `intuit_smes`, which is reached via `execute-workflow.ts`'s legacy switch → `executeDatabaseNode()` → its own file). This node's frontend panel is also the **best-aligned CRM node found in the whole audit** — all 15 fields and all 5 Operation dropdown values match the real runtime exactly, no dead fields, no broken dropdown options.

Key findings verified directly from the real runtime code:

- **A "Odoo Credentials" connection type exists in Connections, but has zero wiring to this node.** Grepped `connector-registry.ts` (no `nodeTypes: ['odoo']` entry anywhere) and the credential type's own `injection: []` array (empty) in `credential-type-registry.ts`. A user can create and even "Test" an Odoo connection in the UI, but it currently has no effect on running Odoo nodes — `url`/`db`/`username`/`password` must always be typed directly on every node. This is a more deceptive gap than `microsoft_dynamics`'s total absence of any credential type, since here a credential type visibly exists and invites the (false) assumption that it works.
- **This node re-authenticates as a real Odoo user on every single run** (not once per saved session) — `authenticate()` is called at the start of every execution, obtaining a fresh session ID and cookie each time. No token caching or reuse across runs.
- **Create Record and Update Record don't return field data** — Odoo's own `create` method returns just the new integer ID (not a GUID, unlike `microsoft_dynamics`), and `write` returns a plain boolean `true`. A follow-up Get Records step is needed to see saved values, the same pattern found on `microsoft_dynamics`.
- **A literal `error: null` key is always present in the output on success** (not just absent) — `runOdooNode`'s own return object includes `error: null` as a real key, distinct from the `_error` key used on actual failures. This is worth flagging since it's easy to confuse with `_error` at a glance.
- **`_errorDetails` on failure is a structured object, not a bare JS Error** (unlike `hubspot`/`intercom`) — the override's catch path sets `details: result` where `result` is the full `{success:false, operation, model, data:null, error:{message}}` object from `runOdooNode`, so `_errorDetails` actually contains useful nested `operation`/`model` context on failure, not just an opaque exception object.

`odoo` completed files:

- `ctrl_checks/src/docs-content/nodes/odoo.doc.ts` (fully rewritten: 15 real fields — `url`, `db`, `username`, `password`, `operation`, `model`, `domain`, `fields`, `limit`, `offset`, `values`, `recordId`, `method`, `methodArgs`, `methodKwargs` — full 10-point helpText each, 5 real operations with runtime-accurate output shapes including the create/update no-data-returned quirk, the disconnected-Connections-entry finding documented prominently, and 6 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/odoo.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `odoo` block — no prior entry existed — with runtime-aligned output/usage overrides for all 5 real operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `odoo` entry — it did not exist before — leading with the disconnected-Connections finding)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed mojibake-corrupted `—` em-dashes in the inline `usageGuide.inputs`/`outputs` arrays, and corrected the `outputs` list to distinguish the always-`null` `error` key from the real `_error` failure key and note create/update's ID-only/boolean-only returns; no `configFields` changes needed — all 15 fields were already correctly aligned with the real runtime)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists and none was needed, since there is no working Connections flow to document)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `odooDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'model']`, and a new `odoo` credential branch; one fix needed after the first test run: the Delete Record operation's `description` was originally 97 characters, under the required 100-character minimum, and was lengthened)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `odoo`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **421 tests passing** (420 doc-coverage + 1 FieldsTable) after one small fix (description length). `npm run build` (frontend) passed in about 13.85s with no new warnings. No worker source files were touched in this batch (`odooNode.ts` and the override were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`pipedrive` is also now audited and marked `Complete`, the ninth CRM node, and the **largest real backend of any node in the entire audit** — 11 real resources (deal, person, organization, activity, note, pipeline, stage, product, lead, file, webhook), each with its own individually-named ID field and create/update fields (no shared generic `id`/`data` pattern like HubSpot). This node uses the hubspot-style architectural pattern (override delegates to `execute-workflow.ts`'s legacy switch via `executeViaLegacyExecutor`); the real case block spans ~856 lines (8728-9584).

Key findings verified directly from the real runtime code:

- **This node's generic `id`/`data`/`term`/`fields` Properties Panel fields are never read for ANY of the 11 resources.** Every resource uses its own field names instead: `personId`/`personName`/`personEmail`/`personPhone` for Person, `dealId`/`dealTitle`/`dealValue`/`dealCurrency` for Deal, `orgId`/`orgName`/`orgAddress` for Organization, and so on for the other 8 resources. A generic `additionalFields` JSON key also exists in the runtime (merged into any create/update payload) but likewise has no Properties Panel field. This is breadth-wise the most extensive documentation-vs-reality gap of the whole audit, even beyond `mailchimp` — though unlike `mailchimp`, the Resource/Operation *concepts* themselves are mostly real, just the field names underneath them are completely disconnected.
- **The "Get Many" dropdown value never works for any resource** — the runtime always checks for the literal value `list`, never `getMany`, so every "Get Many" selection fails regardless of Resource. Same class of finding as `mailchimp`'s dropdown/runtime value mismatch, but narrower in scope (1 of 6 operation values, not all of them).
- **The dropdown's ninth Resource option, "User", is not a real resource at all** — the runtime's resource dispatch has no branch for it and always fails with `Unsupported resource "user"`. Meanwhile 3 real resources (`lead`, `file`, `webhook`) exist in the runtime but are missing from the dropdown entirely — reachable only via workflow JSON or AI generation.
- **`companyDomain` (labeled "Company Domain", marked required in the panel) is completely dead** — `PipedriveApiClient`'s base URL is hardcoded to `https://api.pipedrive.com/v1` and its constructor only accepts an API token; there is no per-company subdomain concept in this integration at all, unlike Freshdesk/ActiveCampaign where a domain/instance URL genuinely matters.
- **`limit`/`start` are the only generic fields that work correctly** across every listing-capable resource — a small but real bright spot amid the rest of the field-name mismatch.
- Not every resource supports every one of Get/Create/Update/Delete/Search — for example Pipeline has no create/update/delete/search at all (list/get/getStages only), and Stage has no create/delete/search. Several resources also have extra real operations with no dropdown representation at all: `getActivities`, `getProducts`, `addProduct`, `duplicate` (Deal), `getDeals` (Person/Organization), `getPersons`, `getStages` (Pipeline), `upload`/`download` (File).
- Credential wiring is genuinely correct here (unlike `odoo`) — `connector-registry.ts` has a real `credentialFieldName: 'apiToken'` mapping, so a saved Pipedrive connection does auto-fill the API Token field at run time.
- Given the sheer scope (11 resources × several operations each, dwarfing every other node's field surface), full exhaustive per-resource `OperationDoc` treatment was judged impractical within a single documentation pass. Following the `google_calendar` precedent, the 6 documented operations (`get`/`list`/`create`/`update`/`delete`/`search`) are built around **Person** (the frontend's own default Resource) as the fully worked concrete example, with the `resource` field's own `notes` cataloguing the real ID/field names for all 11 resources so nothing is silently unlisted — a documented, reasoned scope boundary rather than a silent drop, consistent with how `google_calendar`'s 8 non-`event` resources were handled.

`pipedrive` completed files:

- `ctrl_checks/src/docs-content/nodes/pipedrive.doc.ts` (fully rewritten: 11 fields — `operation`, `resource`, `apiToken`, `companyDomain`, `credentialId`, `id`, `data`, `term`, `fields`, `limit`, `start` — full 10-point helpText each, with the `resource` field's `notes` cataloguing all 11 real resources' field names; 6 operations built around Person as the worked example, with every operation's description explicitly stating that the generic ID/Data/Search fields are not read; 6 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/pipedrive.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `pipedrive` block — no prior entry existed — with runtime-aligned output/usage overrides for all 6 documented operations)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated `{result, data, additional_data}` output claim to the real `{success, data}` shape, and led with the field-name-mismatch finding as the first tip)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — the existing API Token acquisition guide was already accurate)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, intentionally **not changed** — see findings above; wiring 11 resources' worth of individually-named fields into the visual panel is far beyond the scope of a documentation-only audit pass)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `pipedriveDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['resource', 'operation']`, and a new `pipedrive` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `pipedrive`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **427 tests passing** (426 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 13.54s with no new warnings. No worker source files were touched in this batch (both the override and the large `execute-workflow.ts` case block were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`salesforce` is also now audited and marked `Complete`, the tenth CRM node — and, alongside `odoo`, one of the two best-aligned nodes in the entire audit: all 11 real operations (`query`, `search`, `get`, `create`, `update`, `delete`, `upsert`, `bulkCreate`, `bulkUpdate`, `bulkDelete`, `bulkUpsert`) exactly match the frontend dropdown, and all 12 real fields exactly match the frontend `configFields`. This node is a full override with its own `execute()` (the `activecampaign`/`intercom`/`mailchimp` pattern) calling Salesforce's real REST API directly — no `execute-workflow.ts` case exists.

Key findings verified directly from the real runtime code:

- **`instanceUrl` is not vault-backed, even though `accessToken` is** — a saved Salesforce OAuth2 connection auto-fills `accessToken` at run time, but the credential type's `injection` rule only ever sets the Authorization header/access_token, never the node's `instanceUrl` config field. Since access tokens are only valid for the specific org instance they were issued for, this must be typed on every node regardless. Same asymmetry pattern as `freshdesk`'s Domain and `activecampaign`'s API URL, just on an otherwise very clean node.
- **Update returns HTTP 204 with no body** — same `readAcknowledgedHttpResponse`-driven `data: null` pattern discovered on `freshdesk`/`mailchimp`. Create returns only `{id, success, errors}` (no saved field values) since Salesforce's create endpoint doesn't return the record either.
- **Upsert's output shape depends on whether Salesforce created a new record or matched an existing one** — a genuinely subtle, previously-undocumented runtime detail: `{id, success, errors}` on create-path, but `null` (204, no body) on the update-path, exactly like plain Update. A user checking `{{$json.data.id}}` after Upsert would get `undefined` half the time depending on which branch Salesforce took.
- **Bulk Delete is NOT a true bulk operation** — unlike Bulk Create/Update/Upsert (which genuinely use Salesforce's Composite sObject Collections API and report independent per-record success/failure), Bulk Delete loops one `DELETE` request per record ID sequentially, and if any single delete fails partway through, the whole operation throws and stops with no partial-success reporting. This is a real, non-obvious inconsistency among the four "Bulk" dropdown options that looks uniform in the UI but is not uniform underneath.
- **`_errorDetails` on failure is minimal** — only `{operation, resource}`, not the raw Salesforce error body (which is already folded into `_error`'s message text by `salesforceFetch`'s own error extraction). Closer to `hubspot`'s pattern than `freshdesk`'s.

`salesforce` completed files:

- `ctrl_checks/src/docs-content/nodes/salesforce.doc.ts` (fully rewritten: 12 real fields — `instanceUrl`, `accessToken`, `resource`, `customObject`, `operation`, `soql`, `sosl`, `id`, `externalIdField`, `externalIdValue`, `fields`, `records` — full 10-point helpText each, all 11 real operations documented with runtime-accurate output shapes including Update/Upsert's null-body quirk and Bulk Delete's non-bulk implementation, and 7 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/salesforce.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (found and fixed a genuine duplicate-key bug: a pre-existing `salesforce:` block already existed further down the file with fabricated field names like `sObject`/`recordId`/`query` that don't match any real config key, and a flat `{records, totalSize}` output shape missing the real `{operation, resource, data}` wrapper — replaced it in place with accurate `query`/`search`/`get`/`create`/`update`/`delete`/`upsert`/`bulkCreate` entries rather than leaving a duplicate object key)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fabricated flat `{records, totalSize}` output claim to the real `{operation, resource, data}` shape, added the missing `operation`/`records` input keys, and led with the Instance-URL-not-vault-backed finding)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed one mojibake-corrupted `→` arrow in the `customObject` field's helpText; no other changes needed — all 12 `configFields` were already correctly aligned with the real runtime)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — the existing Instance URL/Access Token/Resource acquisition guides were already accurate)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `salesforceDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['instanceUrl', 'accessToken']`, and a new `salesforce` credential branch; one fix needed after the first test run: the `customObject` field was defined but not attached to any operation's `fields` array — added it to the Get operation)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `salesforce`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **433 tests passing** (432 doc-coverage + 1 FieldsTable) after one small fix (missing field attachment). `npm run build` (frontend) passed in about 13.62s with no new warnings. No worker source files were touched in this batch (the override was only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`sap` is also now audited and marked `Complete`, the eleventh CRM node. This node is architecturally distinct from every other CRM node so far: `Operation` is a direct literal HTTP method (`get`/`post`/`put`/`patch`/`delete`), not a named CRM action, and the override (`worker/src/core/registry/overrides/sap.ts`) only sets `ownership`/`fillMode` metadata, delegating all real execution to `execute-workflow.ts`'s legacy switch via `executeViaLegacyExecutor` (the `hubspot`/`microsoft_dynamics` pattern). All 10 real fields and all 5 real operations exactly match the frontend `configFields` and dropdown — one of the best-aligned nodes in the audit alongside `odoo`/`salesforce`, with only cosmetic mojibake issues found on the frontend side.

Key findings verified directly from the real runtime code (`execute-workflow.ts` `case 'sap':`, lines 15512-15649):

- **This node cannot capture a CSRF token from a GET response's headers**, meaning the standard SAP OData v2 CSRF-token dance (GET with `X-CSRF-Token: Fetch` → read the token back from the response's own header → reuse it on the mutating call) cannot be fully automated through this node alone. The `csrfToken` field exists and is sent as a request header, but nothing in this node's Get operation exposes response headers in its output — the token must be obtained through a separate mechanism (e.g. an HTTP Request node with full header visibility) and pasted in manually. A previously undocumented, significant practical limitation, now stated prominently in the doc and the CSRF field's own `helpText`/`notes`.
- **`baseUrl` is required at runtime but not marked required in the backend schema** — only `operation` and `endpoint` are in `requiredConfig`, yet the runtime throws `"SAP node: baseUrl is required..."` immediately if it's empty. A genuine schema/runtime inconsistency, documented in the field's own helpText and in `commonErrors`.
- **Only `accessToken` is confirmed to auto-fill from a saved Connections entry** — `connector-registry.ts`'s `credentialFieldName: 'accessToken'` only maps that one field; Basic Auth `username`/`password` (also present in the SAP credential type's `inputFields`) are not confirmed to be auto-injected the same way and must be typed directly on the node even after saving a connection.
- **DELETE is a structural outlier among this node's own operations** — on success it returns `{success, statusCode, deleted: true}` with no `data` or `count` key at all, unlike every other operation. On failure it includes up to 500 characters of SAP's raw error text directly in `_error`.
- **No `_errorDetails` key exists on any failure path for this node** — confirmed by a full read of the entire case block; the complete error text is always folded directly into `_error` itself, more minimal than even `hubspot`'s pattern.
- **OData v2 envelope normalization is automatic and undocumented in the original doc** — `sapData.d.results` or `sapData.d` is unwrapped transparently, so `{{$json.data}}` is always a plain array or object, never the raw `{d: {...}}` envelope; `count` is only present when the unwrapped result is an array.
- Mojibake (`â€”`) was found and fixed in `nodeTypes.ts`'s top-level `description` string and the inline `usageGuide.inputs`/`tips` arrays; the `usageGuide.outputs` array was also missing the `deleted` key entirely (Get/Post/Put/Patch's `success`/`data`/`count`/`statusCode` were listed but Delete's distinct output shape was never mentioned) — both fixed.

`sap` completed files:

- `ctrl_checks/src/docs-content/nodes/sap.doc.ts` (fully rewritten: 10 real fields — `operation`, `baseUrl`, `endpoint`, `queryParams`, `payload`, `accessToken`, `username`, `password`, `csrfToken`, `format` — full 10-point helpText each, all 5 real HTTP-method operations documented with runtime-accurate output shapes including DELETE's no-`data`/no-`count` shape and the OData v2 envelope-unwrapping behavior, the CSRF-capture limitation and `baseUrl`-required-but-not-in-schema inconsistency called out explicitly, and 5 real runtime error strings in `commonErrors`)
- `ctrl_checks/src/docs-content/search/sap.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`, replacing the prior boilerplate `category: 'Data'` per-field entries)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `sap` block, keyed by the 5 HTTP-method operation values — no prior entry existed, confirmed via `grep` before adding, per the lesson learned from the `salesforce` duplicate-key bug)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `sap` entry — it did not exist before — leading with the `baseUrl`-required-at-runtime and CSRF-capture-limitation findings)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists for `sap`, consistent with `odoo`/`microsoft_dynamics` also having none; the per-field helpText in `nodeTypes.ts` and the new doc.ts were judged sufficient)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (fixed mojibake-corrupted `—` em-dashes in the top-level `description` and the inline `usageGuide.inputs`/`tips` arrays; added the missing `deleted` key to `usageGuide.outputs`; no `configFields` changes needed — all 10 fields were already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `sapDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'baseUrl', 'endpoint']`, and a new `sap` credential branch)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `sap`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **439 tests passing** (438 doc-coverage + 1 FieldsTable) on the first attempt — no fixes were needed for the new assertions. `npm run build` (frontend) passed in about 13.97s with no new warnings. No worker source files were touched in this batch (the override and `execute-workflow.ts`'s case block were only read, not edited), so `worker && npm run type-check && npm run build` was not re-run for this batch — it should be re-confirmed at the very start of the next session as a pure sanity check, same as the standing practice after every batch that only touches `ctrl_checks`.

`tally` is now **reconciled and genuinely `Complete`** (the twelfth CRM node) — a previous tool had marked it `Complete` with real, accurate research already in `doc.ts` and `node-content-overrides.ts`, but it was never registered in the coverage test and its field `helpText` used an older thin template missing 6 of the 10 required literal phrases (`Why it matters` and `Common mistake` were present; `When to fill it`, `What to enter`, `Where the value comes from`, `How to use it later`, `Accepted format`, `Real workplace example`, `If it is empty or wrong` were not). This node follows CRM architectural pattern (3): the override (`worker/src/core/registry/overrides/tally.ts`) only delegates to `executeViaLegacyExecutor`; the real logic is `execute-workflow.ts`'s `case 'tally':` (lines 15651-15795), fully re-read and confirmed accurate against the existing content — all 5 operations (`get_ledger`, `get_voucher`, `create_voucher`, `get_stock_items`, `get_company_info`) POST an XML body to one single `endpoint` URL and return `{success, data, statusCode}` (raw XML string) or `{_error}`, with `create_voucher` failing immediately with `"Tally node: payload (XML body) is required for create_voucher operation"` when payload is empty (there is no default template for it, unlike the four read operations). The prior doc was also missing an `operation` `FieldDoc` entirely (required in the backend schema but never documented as a field), which was added with dropdown-option explanations for all 5 values.

`tally` completed files:

- `ctrl_checks/src/docs-content/nodes/tally.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: 6 real fields — `operation` (newly added), `endpoint`, `companyName`, `ledgerName`, `voucherId`, `payload` (plus a required variant for Create Voucher) — full 10-point helpText each, all 5 real operations with runtime-accurate output shapes, and 6 real/accurate runtime error strings in `commonErrors` including the exact HTTP-failure and payload-required messages)
- `ctrl_checks/src/docs-content/search/tally.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`, replacing the prior boilerplate `category: 'Data'` per-field entries)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (reviewed the existing `tally` block — confirmed accurate against the real runtime, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `tally` entry — it did not exist before)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists, consistent with `odoo`/`microsoft_dynamics`/`sap` also having none since there is no credential/OAuth flow to document)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 6 `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `tallyDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'endpoint']` and `credentialKind` left as the default `'none'` — required one follow-up fix: the default `'none'` connection-guidance branch requires the literal phrase "No third-party account" or "does not use credentials", which the first draft of `credentialSetupSteps` didn't contain verbatim)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `tally`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **445 tests passing** (444 doc-coverage + 1 FieldsTable) after one small fix (the `credentialSetupSteps` wording above). `npm run build` (frontend) passed in about 1m34s with no new warnings. No worker source files were touched in this batch (the override and `execute-workflow.ts`'s case block were only read, not edited).

`zendesk` is now **reconciled and genuinely `Complete`** (the thirteenth CRM node). A previous tool's write-up claimed this node "follows CRM pattern (2) — a full override file with its own `run()` function in `worker/src/nodes/definitions/zendesk-node.ts`" — this was **checked and found to be false**: that file does not exist. The real logic is `execute-workflow.ts`'s `case 'zendesk':` (lines 17659-17708), architectural pattern (1), no override file at all (same as `freshdesk`). This is a good example of why the reconciliation pass re-verifies claims against the actual source rather than trusting a prior write-up.

Key findings verified directly from the real runtime code:

- **This node has its own distinct failure shape, different from the `_error`/`_errorDetails` convention almost every other CRM node in this audit uses.** Every response is `{success, data, error}` — `error` is an empty object `{}` on success or `{message, status}` on failure, and there is no `_error` key anywhere. A downstream node checking `{{$json._error}}` (the pattern taught for `freshdesk`/`hubspot`/`sap`/etc.) will never see it fire for this node; the correct check is `{{$json.success}}` / `{{$json.error.message}}`.
- **A genuine, previously-undocumented fabrication was found and fixed in `node-content-overrides.ts`**: every one of the 6 operation entries included a top-level `operation: '<value>'` key in its `outputExample` that the real runtime never returns — confirmed by a full read of the `case 'zendesk':` block, which only ever returns `{success, data, error}`. Removed from all 6 entries.
- **The backend schema is missing `assigneeId` from its own `optionalConfig` array**, even though the frontend `configFields` includes it and the runtime genuinely reads `config.assigneeId` for `update_ticket` — a real, minor schema/runtime under-specification (the field still works; it just isn't declared in `worker/public/node-library.json`).
- **Credential auto-fill was verified precisely**: no Zendesk entry exists in `connector-registry.ts`, but a `zendesk_api` credential type does exist in `credential-type-registry.ts` with fields `subdomain`, `username`, `apiToken`. Its `username` field auto-fills the node's `email` config key through the same generic `['username', 'email']` alias in `execute-workflow.ts`'s `mergeRuntimeCredentials` that was originally added for Jira — a non-obvious, cross-node reuse of one alias pair worth remembering when auditing other Basic-Auth-style nodes.
- The node's own catch-all for an unrecognized `operation` value returns the literal string `"Unsupported operation: <operation>"` — this exact runtime string was missing from the previous `commonErrors` list and has been added.

`zendesk` completed files:

- `ctrl_checks/src/docs-content/nodes/zendesk.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern with shared field objects — the prior version repeated `subdomain`/`email`/`apiToken` as separate inline objects in each of the 6 operations; now: 11 real fields — `operation`, `subdomain`, `email`, `apiToken`, `ticketId`, `subject`, `description`, `status`, `priority`, `assigneeId`, `limit` — full 10-point helpText each, all 6 real operations with runtime-accurate `{success, data, error}` output shapes emphasizing the no-`_error`-key finding, and 5 real/accurate runtime error strings in `commonErrors` including the exact `"Unsupported operation: <operation>"` string)
- `ctrl_checks/src/docs-content/search/zendesk.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`, replacing the prior boilerplate `category: 'Data'` per-field entries)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (fixed a genuine fabrication: removed a top-level `operation` key from all 6 operations' `outputExample`/`outputDescription` that the real runtime never returns, and added the missing `error: {}` key)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added the entire `zendesk` entry — it did not exist before — leading with the no-`_error`-key finding)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists, consistent with `odoo`/`microsoft_dynamics`/`sap`/`tally` also having none)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 11 `configFields` were already correctly aligned with the real runtime and already had strong helpText)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `zendeskDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'subdomain', 'email']`, and a new `zendesk` credential branch; two small fixes needed after the first test run: the `get_users` and `get_ticket` operation descriptions were under the 100-character minimum, and `update_ticket`'s `expectedOutput` was missing the required `{{$json.` substring)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `zendesk`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **451 tests passing** (450 doc-coverage + 1 FieldsTable) after three small fixes (description lengths and a missing template-variable reference). `npm run build` (frontend) passed in about 15.55s with no new warnings. No worker source files were touched in this batch (`execute-workflow.ts`'s case block was only read, not edited).

`zoho_crm` is now **reconciled and genuinely `Complete`** — this finishes the entire `crm` category tracker section for real. This reconciliation surfaced the single most severe, previously-undocumented set of runtime bugs found anywhere in this audit, more consequential than `mailchimp`'s fully-broken dropdown because these bugs affected **backend field-name mismatches on genuinely-implemented operations**, not just missing dropdown wiring:

- **A real, fixed bug**: the visual panel's "Record ID" field used config key `id`, but the Zoho API client's CRM record dispatcher (`worker/src/shared/zoho-api-client.ts`, `crmRecord()`) destructures `recordId` — `id` was never read at all. This silently broke **Get, Update, and Delete** through the visual panel entirely (all three require a record ID). **Fixed directly** by renaming the frontend field key from `id` to `recordId` in `nodeTypes.ts`, the same class of safe single-key fix used for `google_contacts` earlier in this audit.
- **A second real, fixed bug**: "Records Per Page" used config key `perPage` (camelCase), but the Zoho client reads `rest.per_page` (snake_case) — the field was silently ignored, always falling back to Zoho's default of 200. **Fixed directly** by renaming the frontend field key from `perPage` to `per_page`.
- **A confirmed, NOT fixed bug** (left as documented-only, since it requires a new field and UI redesign, not a safe rename): the "API Domain" dropdown (labeled US/EU/IN/CN/AU/JP, sending full Zoho URLs as values) has **zero effect on which regional data center is called** — the Zoho API client always initializes with the hardcoded default region `'US'`, because the runtime reads a differently-named `region` config key that the visual panel never sets at all. Accounts genuinely hosted outside the US region may see confusing authentication failures with no apparent connection to this field.
- **A confirmed, NOT fixed operation/runtime mismatch** (documented only, same class as `pipedrive`'s "Get Many"): the dropdown's "Get Many" sends the literal value `getMany`, but the client's CRM record dispatcher only recognizes the literal value `list` — Get Many always fails with `"Unknown CRM record operation: getMany"`. Bulk Create and Bulk Update are worse — they require the client to be called with an entirely different `resource` value (not `'record'`) that the visual panel has no field to set at all, so both are completely unreachable, always failing with `"Unknown CRM record operation: bulkCreate"`/`"bulkUpdate"`. Net result: only 6 of the 9 dropdown operations (get, create, update, delete, search, upsert) are functional even after the two fixes above.
- **A previously-undocumented architectural fact**: this node is a thin wrapper over a **generic multi-service Zoho API client** (`worker/src/shared/zoho-api-client.ts`) that also powers Zoho Books, Creator, Sheets, Tasks, Billing, Email, and Tables through the same `service`/`resource`/`operation` dispatch pattern — only the CRM slice is exposed through this node's visual panel today.
- The previous tool's doc.ts had the field names right (`accessToken`, `apiDomain`, `module`, `data`, `criteria` all matched), but every field's `helpText` used the old thin template, and the `id`/`perPage` field-name bugs above were never caught or documented.

`zoho_crm` completed files:

- `ctrl_checks/src/docs-content/nodes/zoho_crm.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern with shared field objects: 14 real fields — `operation`, `resource` (backend-only), `accessToken`, `refreshToken` (backend-only), `credentialId` (backend-only), `apiDomain`, `module`, `customModule`, `recordId`, `data`, `criteria`, `fields`, `page`, `per_page` — full 10-point helpText each, 6 working operations documented richly (get/create/update/delete/search/upsert), the 3 broken dropdown values (getMany/bulkCreate/bulkUpdate) and the API Domain/region bug explained prominently in the `operation`/`apiDomain` fields' own helpText rather than given fabricated working examples, and 6 real runtime error strings in `commonErrors` including the exact `"Unknown CRM record operation: getMany"` string)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (**two real bug fixes**: renamed config field key `id` → `recordId` and `perPage` → `per_page` to match what the runtime actually reads, fixing Get/Update/Delete and the per-page pagination limit; both keys were confirmed via grep to have no other dependents in the frontend codebase before renaming)
- `ctrl_checks/src/docs-content/search/zoho_crm.ts` (rewritten to the standard compact `DocsSearchIndexItem[]` shape with correct `category: 'CRM'`, replacing the prior boilerplate `category: 'Data'` per-field entries)
- `ctrl_checks/src/docs-content/manifest.ts` (category `Data` → `CRM`, description replaced from boilerplate)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (fixed the `id`→`recordId` key throughout all usage examples to match the frontend fix; removed the `getMany`/`bulkCreate`/`bulkUpdate` entries entirely rather than leaving fabricated-as-working examples for operations that do not function)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the existing entry: corrected the fully fabricated `{result: {id, status}, data: {...}}` output claim to the real `{success, data, service, resource, operation}` shape, and led with the Get Many/Bulk/API Domain findings as the first tips)
- `ctrl_checks/src/components/workflow/nodeGuides.ts` (reviewed, not changed — no entry exists, consistent with `odoo`/`microsoft_dynamics`/`sap`/`tally`/`zendesk` also having none)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `zohoCrmDoc` import, `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'accessToken', 'apiDomain', 'module']`, and a new `zoho_crm` credential branch; two fix rounds needed after the first test run: the backend-only `resource` field was initially undocumented, `refreshToken`/`credentialId` were also undocumented, the `get` and `delete` operation descriptions were under the 100-character minimum, and the `module` field's `options` array included `Accounts` which wasn't mentioned anywhere in its helpText until an explicit full-list sentence was added)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `zoho_crm`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **457 tests passing** (456 doc-coverage + 1 FieldsTable) after two small fix rounds. `npm run build` (frontend) passed in about 17.3s with no new warnings — this build is a real regression check since `nodeTypes.ts` changed. No worker source files were touched in this batch (`zoho-api-client.ts` and `execute-workflow.ts`'s case block were only read, not edited) — the two frontend field-key renames make the frontend match what the worker already expected, so no worker-side change was needed.

`aggregate` is now **reconciled and genuinely `Complete`**. Unlike the CRM reconciliations, this node's supporting content (`node-content-overrides.ts`, `nodeUsageGuides.ts`, `manifest.ts`) was already accurate — only `doc.ts` (thin helpText, missing `operation` FieldDoc) and coverage-test registration were gaps. One genuine, previously-undocumented behavioral finding: **if the input has no `items` array at all (or it isn't an array), this node does not error — it silently returns the input completely unchanged**, with no `aggregate` key and no `_warning`. The prior doc's `commonErrors` fabricated an error string "No items to aggregate" that the runtime never actually produces for this case; corrected to describe the real silent-passthrough behavior instead.

`aggregate` completed files:

- `ctrl_checks/src/docs-content/nodes/aggregate.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: added the previously-undocumented `operation` field, full 10-point helpText for all 3 fields, all 6 operations with accurate output shapes, and corrected `commonErrors` to describe the real silent-passthrough-on-missing-items behavior instead of a fabricated error message)
- `ctrl_checks/src/docs-content/search/aggregate.ts` (already accurate; added one missing `operation` field search entry)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate for all 6 operations — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (already accurate — added one tip about the silent-passthrough-on-missing-items behavior)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 3 `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `aggregateDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `aggregate`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **463 tests passing** (462 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 18.3s with no new warnings. No worker source files were touched in this batch.

`csv` is now **reconciled and genuinely `Complete`**. Same pattern as `aggregate`: supporting content (`node-content-overrides.ts`, `nodeUsageGuides.ts`, `manifest.ts`) was already accurate; `doc.ts` needed the missing `operation` field and full 10-point helpText. A more severe finding than `aggregate`'s here: **all 5 of the prior doc's `commonErrors` were fabricated** — a full read of `execute-workflow.ts`'s `case 'csv':` confirms the only `_error` this node can ever return is `"CSV: unsupported operation <value>"`; there is no validation at all for empty CSV, missing data, invalid delimiter, mismatched columns, or inconsistent object keys — every one of those silently produces an empty or best-effort result instead of an error. Rewrote `commonErrors` to describe the real silent-failure modes instead. Also newly documented: Generate's header row is built from only the **first** object's keys, so keys unique to later objects in the array are silently dropped from the output entirely — a real, easy-to-hit gotcha with bulk exports from inconsistent data sources.

`csv` completed files:

- `ctrl_checks/src/docs-content/nodes/csv.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: added the previously-undocumented `operation` field, full 10-point helpText for all 5 fields, both operations with accurate output shapes, and all 5 `commonErrors` replaced with the real silent-failure behaviors since none of the prior errors are ever actually raised by the runtime)
- `ctrl_checks/src/docs-content/search/csv.ts` (already accurate; added one missing `operation` field search entry)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate for both operations — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (already accurate — added one tip about the no-error-on-empty-input behavior)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 5 `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `csvDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'delimiter']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `csv`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **469 tests passing** (468 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 16.75s with no new warnings. No worker source files were touched in this batch.

`date_time` is now **reconciled and genuinely `Complete`**. This was the largest reconciliation so far (7 operations), and the doc.ts content was already mostly accurate at the operation level, but a full read of `execute-workflow.ts`'s `case 'date_time':` found several real inaccuracies: the prior `commonErrors` used generic messages ("Invalid date", "Timezone is required", "endDate is required", "Unsupported operation") that don't match the exact runtime strings (`"DateTime: invalid date — provide a valid ISO date string in the date field"`, `"DateTime convertTimezone: timezone is required"`, etc.), and a 5th fabricated error entry ("Invalid unit") that **does not exist at all** — unrecognized units silently fall back to minutes rather than erroring, confirmed by reading the `toMs()`/diff unit-matching logic directly. Also newly documented: Diff has no month/year unit support at all (unlike Add/Subtract, which do, via 30/365-day approximations); Add/Subtract also accept an undocumented `amount` alias for `value`, and Diff accepts an undocumented `date2` alias for `endDate`; Custom Format's token replacement only substitutes each token once (plain `.replace()`, not global), so a repeated token in one pattern is not fully replaced. Separately, `nodeUsageGuides.ts`'s existing entry was fully fabricated (wrong output key names `formatted_date`/`timestamp`/`timezone_info`, and a Format example showing a `-05:00` UTC-offset suffix the real `Intl.DateTimeFormat('sv-SE', ...)` implementation never produces) — corrected to the real `datetime`/`timestamp`/`diff`/`diffMs`/`unit`/`timezone`/`offset`/`longName`/`isoDate` output keys.

`date_time` completed files:

- `ctrl_checks/src/docs-content/nodes/date_time.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern with shared field objects — including two separate `Unit` fields since Add/Subtract and Diff accept different unit sets: 10 real fields — `operation`, `date`, `timezone`, `format`, `locale`, `customFormat`, `value`, `unit` (add/subtract variant), `unit` (diff variant), `endDate` — full 10-point helpText each, all 7 operations with runtime-accurate output shapes, and `commonErrors` rewritten to the 5 real exact runtime error strings plus the real silent-unit-fallback behavior replacing the fabricated "Invalid unit" entry)
- `ctrl_checks/src/docs-content/search/date_time.ts` (already accurate; added one missing `operation` field search entry)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate for all 7 operations — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fully rewritten: corrected the fabricated `formatted_date`/`timestamp`/`timezone_info` output-key claim and the fabricated UTC-offset example to the real output shape and behavior)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `dateTimeDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation']`, an empty `outputDescriptionTerms` array since the 7 operations' output shapes are too heterogeneous to share a meaningful common substring, and `credentialKind` left as the default `'none'`; two small fixes needed after the first test run: the `add`/`subtract`/`diff` operation descriptions were under the 100-character minimum)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `date_time`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **475 tests passing** (474 doc-coverage + 1 FieldsTable) after one small fix round (description lengths). `npm run build` (frontend) passed in about 1m7s with no new warnings. No worker source files were touched in this batch.

`html` is now **reconciled and genuinely `Complete`**. Same pattern as `aggregate`/`csv`: supporting content was already accurate; `doc.ts` needed the missing `operation` field and full 10-point helpText. One fabricated `commonErrors` entry found and fixed: the prior doc claimed a "No elements matched" error for Extract, but a full read of `execute-workflow.ts`'s `case 'html':` confirms Extract never errors on zero matches — it silently returns `{results: [], count: 0, success: true}`. Also corrected: the prior "HTML parse error" entry doesn't match the real generic catch-all string `"HTML error: <message>"`, and Cheerio (the underlying parser) is deliberately lenient with malformed HTML rather than throwing on it, so that catch-all is rarely hit in practice.

`html` completed files:

- `ctrl_checks/src/docs-content/nodes/html.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: added the previously-undocumented `operation` field, full 10-point helpText for all 3 fields, all 3 operations with accurate output shapes, and `commonErrors` corrected to remove the fabricated "No elements matched" error and use the real "HTML error: <message>" catch-all string)
- `ctrl_checks/src/docs-content/search/html.ts` (already accurate; added one missing `operation` field search entry)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate for all 3 operations — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (already accurate — added one tip about the no-error-on-zero-matches behavior)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 3 `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `htmlDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation', 'html']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `html`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **481 tests passing** (480 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 1m8s with no new warnings. No worker source files were touched in this batch.

`json_parser` is now **reconciled and genuinely `Complete`**. The simplest reconciliation so far — a single operation (internal value `default`, no operation dropdown at all) with only 2 fields (`json`, `extractFields`), both matching the backend schema exactly. Supporting content (`node-content-overrides.ts`, `nodeUsageGuides.ts`, `manifest.ts`, `search/json_parser.ts`) was already fully accurate; only `doc.ts`'s thin helpText and 2 fabricated `commonErrors` entries needed fixing. A full read of `execute-workflow.ts`'s `case 'json_parser':` confirms neither "Extract field not found" nor "extractFields must be an array" are real errors — a non-array/empty `extractFields` is silently skipped entirely, and a listed field name that doesn't exist in the parsed object is silently copied onto the output as `undefined` rather than flagged.

`json_parser` completed files:

- `ctrl_checks/src/docs-content/nodes/json_parser.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for both fields, the single Parse operation with an accurate output shape, and `commonErrors` corrected to remove the 2 fabricated validation errors and describe the real silent behaviors instead)
- `ctrl_checks/src/docs-content/search/json_parser.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — both `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `jsonParserDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['json']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `json_parser`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **487 tests passing** (486 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 1m10s with no new warnings. No worker source files were touched in this batch.

`limit` is now **reconciled and genuinely `Complete`**. This one had the most severe error-fabrication of any `data`-category node reconciled so far: a full read of `execute-workflow.ts`'s `case 'limit':` confirms this node **never raises an error under any circumstance** — a missing array, an invalid Limit value, and an unresolvable Array expression all silently `return inputObj` (the input completely unchanged) rather than erroring; all 3 of the prior doc's `commonErrors` claimed real thrown errors that do not exist. Also found and fixed in **three separate files** (`doc.ts`, `node-content-overrides.ts`, `nodeUsageGuides.ts`, all three repeating the same mistake): a fabricated `array` output key — the real return value is `{...originalInputObj, items: limitedItems}`, with no separate `array` key at all; the previous docs all claimed `array` was "an alias for items (same array)," which the runtime has never produced.

`limit` completed files:

- `ctrl_checks/src/docs-content/nodes/limit.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for both fields, the single Limit Items operation with the corrected `items`-only output shape, and `commonErrors` replaced entirely with the real always-silent-passthrough behaviors since this node has no real error path at all)
- `ctrl_checks/src/docs-content/search/limit.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (fixed the fabricated `array` output key in both the example and description)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fixed the same fabricated `array` output key, and added tips about the always-silent-passthrough behavior)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — both `configFields` already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `limitDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['limit']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `limit`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **493 tests passing** (492 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 1m10s with no new warnings. No worker source files were touched in this batch.

`math` is now **reconciled and genuinely `Complete`** — this was the last of the 10 flagged nodes. Supporting content (`node-content-overrides.ts`, `manifest.ts`, `search/math.ts`) was already accurate; `nodeUsageGuides.ts` needed two new tips added. `doc.ts` needed the missing `operation` field and full 10-point helpText. A full read of `execute-workflow.ts`'s `case 'math':` confirmed the backend genuinely requires `operation` (the prior doc had incorrectly marked it `required: false`), and surfaced two real, previously-undocumented silent-failure behaviors: non-numeric `Value 1`/`Value 2` are silently coerced to `0` (there is no numeric validation anywhere in this node), and `Minimum`/`Maximum` on an empty list silently return `Infinity`/`-Infinity` while `Average` on an empty list silently returns `NaN` — none of these raise an error. The prior `commonErrors` list had 3 fabricated entries ("Invalid numeric value", "Invalid precision", "Empty array for list operation") that do not correspond to any real thrown error; these were replaced with the real silent-coercion behaviors, while the 2 genuinely real errors (`Division by zero`, `Unknown math operation: <value>`) were corrected to their exact runtime strings.

`math` completed files:

- `ctrl_checks/src/docs-content/nodes/math.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: added the previously-undocumented `operation` field with the corrected `required: true` flag, full 10-point helpText for all 4 fields, the single Calculate operation covering all 15 sub-operations, and `commonErrors` corrected to the 2 real exact runtime error strings plus the 3 real silent-coercion/empty-list behaviors replacing the 3 fabricated validation errors)
- `ctrl_checks/src/docs-content/search/math.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added 2 tips about the silent numeric-coercion and empty-list behaviors)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 4 `configFields` already correctly aligned with the real runtime, including `operation` already correctly marked `required: true` on the frontend even though the old doc.ts had it wrong)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `mathDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['operation']` and `credentialKind` left as the default `'none'`)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `math`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **499 tests passing** (498 doc-coverage + 1 FieldsTable) on the first attempt. `npm run build` (frontend) passed in about 14.3s with no new warnings. No worker source files were touched in this batch.

**All 10 flagged nodes are now genuinely reconciled and `Complete`** — see the "⚠ Reconciliation Needed" note above for the full history of what was found and fixed.

`merge_data` is now audited and marked `Complete`. Investigation of this node's runtime (`worker/src/api/execute-workflow.ts`'s shared `case 'merge': case 'merge_data':` block, lines 13438-13492, whose own code comment states "merge_data is a canonical alias of merge — same runtime behavior") turned up a bonus finding: the already-`Complete` `merge` node (Logic category, not part of the 10 flagged nodes) also had a real, previously-undocumented fabrication — its `outputExample`/`outputDescription` in `merge.doc.ts`, `node-content-overrides.ts`, and `nodeUsageGuides.ts` all claimed the output included `mergeMode`/`sourceCount` metadata keys that the runtime never adds anywhere (confirmed by reading the full case block: overwrite mode returns `inputObj` completely unchanged, append mode returns only `{items: sourceOutputs}` with no other keys, and deep_merge mode returns a plain recursively-merged object — none of the three paths ever sets a `mergeMode` or `sourceCount` key). This was fixed in all three files plus the coverage test's own `mergeDoc` entry (its `outputDescriptionTerms` array literally required the fabricated `mergeMode`/`sourceCount` substrings to be present, so the test itself had encoded the fabrication and had to be corrected too). Also confirmed and newly documented: this node (and `merge`) **never returns `_error` under any circumstance** — a missing/failed edge lookup or zero connected branches in append/deep_merge mode silently falls back to unchanged passthrough (`result = inputObj`) rather than erroring, the same silent-behavior pattern found on `limit`/`csv`/`json_parser`/`html` earlier in this audit. A previously-undocumented false claim was also found and removed: neither `merge` nor `merge_data`'s doc/usage-guide content should have claimed "legacy concat/concatenate aliases" are accepted for append mode — the real code only ever matches the literal strings `'append'`/`'deep_merge'` (case-insensitive), with any other value (including a typo or the literal `'concat'`) silently falling through to overwrite/passthrough behavior. `nodeUsageGuides.ts`'s pre-existing `merge_data` example was also factually wrong for append mode: it showed two input arrays being concatenated element-by-element (`[1,2,3]` + `[4,5,6]` → `[1,2,3,4,5,6]`), but the real behavior wraps each branch's *entire output object* as one array element — arrays are never concatenated at all.

`merge_data` completed files:

- `ctrl_checks/src/docs-content/nodes/merge_data.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: fixed the mojibake Chinese-character corruption in the Mode field's helpText, added full 10-point helpText, the single Merge operation with a mode-accurate output description, and 4 `commonErrors` entries rewritten to describe the real silent-fallback/silent-replace behaviors since this node never raises a real error)
- `ctrl_checks/src/docs-content/nodes/merge.doc.ts` (bonus fix on an already-`Complete` sibling node: removed the fabricated `mergeMode`/`sourceCount` output keys and corrected the output description to state plainly that no such wrapper keys exist)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `merge_data` block — no prior entry existed — and fixed the same `mergeMode`/`sourceCount` fabrication in the existing `merge` block)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fixed the `merge` entry's fabricated `outputs` metadata claim, and fixed the `merge_data` entry's incorrect array-concatenation append-mode example plus the false "legacy concat aliases" tip)
- `ctrl_checks/src/docs-content/search/merge_data.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — category `Data`, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — the single `mode` config field was already correctly aligned with the real runtime; confirmed identical in shape to `merge`'s own `mode` field, just with different dropdown option labels)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `mergeDataDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['mode']` and `credentialKind` left as the default `'none'`; also corrected the pre-existing `mergeDoc` entry's `outputDescriptionTerms` array to remove the fabricated `mergeMode`/`sourceCount` requirement)
- `node-field-content.ts` was **not** touched, per the standing user decision recorded above (dead code, stop maintaining it for all remaining nodes).

Verification for `merge_data`: `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **505 tests passing** (504 doc-coverage + 1 FieldsTable) after one small fix (an exact-phrase mismatch between the doc's outputDescription and the test's required term, resolved by aligning the wording). `npm run build` (frontend) passed in about 16s with no new warnings. No worker source files were touched in this batch (`execute-workflow.ts`'s shared case block was only read, not edited).

**Process note**: verification (focused vitest + frontend build) is now run after every 5 nodes instead of after every single node, per an explicit user decision to reduce overhead — small per-node test fixes (a description under the character minimum, a missing required phrase, etc.) are still expected and will be fixed as part of each batch's verification pass, not skipped.

`rename_keys` is now audited and marked `Complete`. The runtime (`execute-workflow.ts`'s `case 'rename_keys':`, lines 14101-14115) is small and mostly matched the pre-existing doc, with two real corrections: the exact error string is `"Rename Keys: mappings must be an object"` (the prior doc was missing the word "an"), and a genuinely new, previously-undocumented finding — if two mapping entries resolve to the same new field name (or a new name collides with a field already on the item), the later rename silently overwrites the earlier value with no warning, since the code does `obj[to] = obj[from]; delete obj[from]` with no collision check. Also fixed a fabricated claim in `nodeUsageGuides.ts`: a tip claiming "Can rename nested keys with dot notation" was invented — the real code only ever checks `from in obj` on the top-level object, no nested/dot-path support exists at all.

`rename_keys` completed files:

- `ctrl_checks/src/docs-content/nodes/rename_keys.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for the single Mappings field, corrected the exact error string, and added the previously-undocumented same-target-name collision/overwrite behavior as a `commonErrors` entry)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added a new `rename_keys` block — no prior entry existed)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (removed the fabricated "dot notation" nested-rename claim and the vague "applied in order" tip, replaced with the real silent-skip and silent-overwrite behaviors)
- `ctrl_checks/src/docs-content/search/rename_keys.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/docs-content/manifest.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — the single `mappings` config field was already correctly aligned with the real runtime)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `renameKeysDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['mappings']` and `credentialKind` left as the default `'none'`)

`set_variable` is now audited and marked `Complete`, and this reconciliation surfaced the most severe frontend/backend/runtime mismatch found among the `data`-category nodes so far. The real runtime (`execute-workflow.ts`'s `case 'set_variable':`, lines 3090-3103) only reads `name` and `value`, then does `result = { [name]: resolvedValue }` — no spread of the incoming item at all. Two consequences, both previously undocumented: (1) **`values` (the legacy multi-assignment array) and `keepSource` (the "preserve incoming fields" toggle) are declared in the backend schema's `optionalConfig`, exposed in the visual panel with helpText describing working behavior, but are never read anywhere in the execution code** — filling either in has zero effect, confirmed by a full read of the case block. (2) **This node's output is always exactly one field, no matter what** — every field the incoming item had before this node runs (from a trigger, an earlier action, or another branch) is silently discarded on every single run, whether or not Keep Source is checked. The pre-existing doc's two `commonErrors` ("Set Variable requires either name or values", "Variable name must be a valid identifier") also don't correspond to any real validation in the code — an empty or malformed Variable Name is never rejected; it silently becomes a field literally named `''` or containing whatever text was typed, with no error path at all. Given the scope (wiring `values`/`keepSource` into the runtime is a worker code change, not a small frontend fix), this was documented transparently rather than fixed directly, consistent with the `mailchimp`/`intercom`/`freshdesk` precedent for confirmed-broken fields — every field, file, and tip involved now states plainly that Values and Keep Source have no effect, and that `set`/`edit_fields` is the correct node to reach for when multiple fields or field preservation are actually needed.

`set_variable` completed files:

- `ctrl_checks/src/docs-content/nodes/set_variable.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for all 4 fields explicitly disclosing that Values and Keep Source are non-functional, the single Set operation's output description stating plainly that only one field ever survives, and `commonErrors` rewritten to the 4 real behaviors — empty-name silent field creation, total loss of prior fields, and the two dead fields — replacing the 2 fabricated validation errors)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (corrected the fabricated "Create one or more named output values" / "With keepSource enabled, incoming fields are kept too" claims to state the real single-field, always-discards-the-rest behavior)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (rewrote the entry: removed the false "Use keepSource to preserve incoming fields" and "Legacy values array supports multiple assignments" tips, replaced with the real dead-field disclosure and a pointer to Set/Edit Fields)
- `ctrl_checks/src/docs-content/search/set_variable.ts` (corrected the node summary and the `values`/`keepSource` field entries to state they are not functional, rather than describing them as working features)
- `ctrl_checks/src/docs-content/manifest.ts` (corrected the description from "Create one or more named output values" to accurately state exactly one value is created and everything else is discarded)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, intentionally **not changed** — wiring `values`/`keepSource` into the runtime requires a worker-side code change, out of scope for a documentation-only audit pass; the panel's existing helpText for both fields is misleading but was left as a frontend-only concern to flag rather than silently patch)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `setVariableDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['name', 'value']` and `credentialKind` left as the default `'none'`; one small fix needed after the first test run — an outputDescription wording mismatch, resolved by aligning the exact word used)

Verification for this batch (`rename_keys` + `set_variable`): `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **517 tests passing** (516 doc-coverage + 1 FieldsTable) after one small fix. `npm run build` (frontend) passed in about 28.6s with no new warnings. No worker source files were touched in this batch (`execute-workflow.ts` was only read, not edited).

`sort` is now audited and marked `Complete`. The runtime (`execute-workflow.ts`'s `case 'sort':`, lines 3254-3327) is clean — all 3 config fields (`field`, `direction`, `type`) match the backend schema and frontend panel exactly, and `node-content-overrides.ts`/`manifest.ts`/`search/sort.ts` were already accurate. Only `sort.doc.ts` (thin helpText, missing `operation` structure) needed a full rewrite, and the pre-existing `commonErrors` ("No items to sort", "Unexpected order") were fabricated as thrown errors — this node never returns `_error` under any circumstance, matching the `limit`/`aggregate` silent-behavior pattern. Real, previously-undocumented findings: (1) if `{{$json.items}}` is missing or not an array, the input is returned completely unchanged with no error; (2) an item missing the sort `Field` is silently treated as the smallest possible value (0, empty string, or epoch-start date depending on `Type`) rather than flagged; (3) `direction` genuinely accepts `ascending`/`descending` as real aliases for `asc`/`desc` (confirmed in code, unlike `merge_data`'s rejected alias claim); (4) when `Type` is `auto` (the default), the comparison type is re-detected **per pair of items being compared**, not once for the whole array — a list with inconsistent value shapes for the same field can theoretically be compared under different rules for different pairs.

`sort` completed files:

- `ctrl_checks/src/docs-content/nodes/sort.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for all 3 fields, and `commonErrors` replaced with the 4 real silent-behavior findings above)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (already accurate — added 2 tips for the silent-passthrough and missing-field-value behaviors)
- `ctrl_checks/src/docs-content/node-content-overrides.ts`, `manifest.ts`, `search/sort.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — all 3 fields already correctly aligned)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `sortDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['field', 'direction', 'type']` and `credentialKind` left as the default `'none'`)

`text_formatter` is now audited and marked `Complete`, and this reconciliation found the most severe output-shape fabrication among the `data`-category nodes reconciled this session. The real runtime (`execute-workflow.ts`'s `case 'text_formatter':`, lines 5901-5930) does one of two things depending on whether `Template` is filled in: (1) when non-empty, it returns the resolved text as **a bare string, returned directly, not wrapped in any object** (the code comment literally says "Return string directly (not wrapped)") — every prior version of this doc, `node-content-overrides.ts`, and `nodeUsageGuides.ts` all claimed the output was `{formatted: '...'}`, which the runtime has never produced; (2) when `Template` is empty or blank, it returns a real object `{data: <JSON-stringified whole input>, formatted: <same string>}` — both keys hold the entire incoming item flattened into one JSON text blob, not the original input fields preserved individually as the prior doc implied ("returns the input data plus formatted"). A second, genuinely subtle finding traced through `worker/src/core/execution/typed-value-resolver.ts`: a `Template` that is a single bare `{{$json.field}}` expression with nothing else around it, when that field is missing, resolves to the literal 4-character text `"null"` (since `resolveTypedValue` returns real `null` for an unresolved single-expression template, and `String(null)` is `"null"`) — but a `Template` with any surrounding text around the same missing expression silently substitutes an empty string instead (via a different code path, `resolveStringTemplate`, which explicitly replaces `null`/`undefined` with `''`). Neither the prior doc nor any node in this audit had previously distinguished these two failure modes.

`text_formatter` completed files:

- `ctrl_checks/src/docs-content/nodes/text_formatter.doc.ts` (fully rewritten: corrected the output shape to a documentation-only `(entire output)` label for the bare-string case, following the same convention established for `log_output` earlier in this audit; fully explained the empty-Template `{data, formatted}` fallback shape and the single-bare-expression-produces-literal-"null" gotcha; `commonErrors` rewritten to the 4 real behaviors)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (fixed the fabricated `{formatted: '...'}` output shape to the real bare-string/direct-output behavior)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (fixed the fabricated `outputs: ['formatted_text']` claim — no such key exists — and added tips for the bare-string output and the literal-"null" gotcha)
- `ctrl_checks/src/docs-content/manifest.ts`, `search/text_formatter.ts` (already accurate/generic enough — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, not changed — the single `template` field was already correctly aligned)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `textFormatterDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['template']` and `credentialKind` left as the default `'none'`; one small fix needed after the first test run — the `usageExample.expectedOutput` string was missing the required `{{$json.` substring)

`xml` is now audited and marked `Complete` — this finishes the entire `data` category tracker section. The pre-existing doc was more accurate than most reconciled nodes in this batch (the XPath-required error string already matched exactly), but a full read of `execute-workflow.ts`'s `case 'xml':` (lines 14366-14413) found 3 real errors missing from the prior `commonErrors` entirely (`XML: input exceeds maxSize (<limit> bytes)`, the generic `XML: unsupported operation "<value>"` catch, and the generic parse-failure `XML error: <message>` catch), one error string that was subtly wrong (`'xml is required'` vs. the real `'XML: xml field is required'`), and two genuinely important silent-behavior findings that were not documented at all: (1) an Extract operation whose XPath Expression does not match anything in the parsed XML does **not** raise an error — it silently returns `result: null` and `success: false`; (2) invalid/malformed XML during the Validate operation specifically is **not** treated as an error at all — it is the normal, successful result of that check (`valid: false` with details in `errors`, no `_error` key). Also newly documented: this node's "XPath" field is a simplified slash-separated path walker (confirmed via the code: `xpath.replace(/^\//, '').split('/').filter(Boolean)` then chained property access), not real XPath — no wildcards, attribute selectors, or array-index syntax are supported, and attributes are only reachable via the parser's `@_` prefix convention. **A minor, unresolved discrepancy noted for a future session**: `ctrl_checks/src/components/workflow/nodeTypes.ts` categorizes this node's frontend palette entry as `category: 'utility'`, while the backend schema, `manifest.ts`, and this doc all agree on `category: 'Data'` — documented here rather than changed, since it's unclear which is intentional and changing it would affect UI palette grouping, out of scope for a documentation-only pass.

`xml` completed files:

- `ctrl_checks/src/docs-content/nodes/xml.doc.ts` (fully rewritten in the modular `FieldDoc`/`OperationDoc` pattern: full 10-point helpText for all 4 fields including the simplified-path-not-real-XPath clarification, and `commonErrors` expanded from 2 to 7 entries covering every real error string plus the two silent-behavior findings)
- `ctrl_checks/src/docs-content/node-content-overrides.ts` (added the non-matching-XPath and invalid-XML-during-Validate silent-behavior clarifications to the existing, already-accurate output example)
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts` (added tips for the simplified-path/not-real-XPath distinction and both silent-behavior findings)
- `ctrl_checks/src/docs-content/manifest.ts`, `search/xml.ts` (already accurate — reviewed, no changes needed)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (reviewed, **not changed** — all 4 fields were already correctly aligned; the `category: 'utility'` vs `'Data'` discrepancy noted above was documented, not fixed)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (added `xmlDoc` import and an `AUDITED_NODE_DOCS` entry with `usageInputKeys: ['xml']` and `credentialKind` left as the default `'none'`)

Verification for this batch (`sort` + `text_formatter` + `xml`): `cd ctrl_checks && npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx` passed with **535 tests passing** (534 doc-coverage + 1 FieldsTable) after one small fix. `npm run build` (frontend) passed in about 15.9s with no new warnings. No worker source files were touched in this batch (`execute-workflow.ts` and `typed-value-resolver.ts` were only read, not edited).

**The entire `data` category tracker section is now fully `Complete`** (every node from `aggregate` through `xml`, including the `merge_data` reconciliation with its bonus `merge` fabrication fix).

**The `ecommerce` category tracker section is now fully `Complete`, and the `payment` category's only node is also `Complete`** (`paypal`, `shopify`, `stripe`, `woocommerce`, and `chargebee`). This was the first user-approved 5-node verification batch: docs/search/manifest/usage-guide/overrides/coverage entries were updated for all five nodes, and `chargebee` also received a small frontend panel fix so `customerId` is visible for the runtime-supported `get_customer` operation.

`paypal`, `shopify`, `stripe`, `woocommerce`, and `chargebee` completed files:

- `ctrl_checks/src/docs-content/nodes/paypal.doc.ts`
- `ctrl_checks/src/docs-content/nodes/shopify.doc.ts`
- `ctrl_checks/src/docs-content/nodes/stripe.doc.ts`
- `ctrl_checks/src/docs-content/nodes/woocommerce.doc.ts`
- `ctrl_checks/src/docs-content/nodes/chargebee.doc.ts`
- `ctrl_checks/src/docs-content/search/paypal.ts`
- `ctrl_checks/src/docs-content/search/shopify.ts`
- `ctrl_checks/src/docs-content/search/stripe.ts`
- `ctrl_checks/src/docs-content/search/woocommerce.ts`
- `ctrl_checks/src/docs-content/search/chargebee.ts`
- `ctrl_checks/src/docs-content/manifest.ts`
- `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`
- `ctrl_checks/src/docs-content/node-content-overrides.ts`
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (`chargebee.customerId` visibility only)
- `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`

Key findings from this ecommerce/payment batch:

- `paypal` is a legacy-delegated node. The visual panel exposes `create_order`, `get_order`, `capture_order`, `create_refund`, and `get_access_token`, but the runtime only understands `charge`/`createorder`/`order` for creating an order plus `refund`. The runtime reads `accessToken`, `environment`, `currency`, `description`, `autoCapture`, `amount`, and `paymentId`; visual `clientId`, `clientSecret`, and `orderId` are not read by the executor. It creates an order only; it does not capture a PayPal order. Success returns the incoming input plus `success: true` and `order` or `refund`; most failures use `_error`/`_errorDetails`.
- `stripe` is also legacy-delegated. Runtime-supported operations are `create_customer`, `refund`, `charge`/`payment`/`paymentintent`, `get_payment_intent`, `list_payment_intents`, `create_subscription`, and `create_invoice`. Visual aliases such as `create_payment`, `create_payment_intent`, `get_payment`, `list_payments`, and `create_refund` are not accepted by the runtime. The `metadata` field is not sent as Stripe metadata; for subscriptions it is only a fallback source for `priceId`. Outputs are operation-specific (`customer`, `refund`, `paymentIntent`/`charge`, `items` + `stripe`, `subscription`, or `invoice`) with `_error`/`_errorDetails` on failure.
- `shopify` expects generic `resource` + `operation` values (`get`, `list`, `create`, `update`, `delete`) at runtime. The visual operation aliases (`get_product`, `list_products`, `create_product`, `update_product`, `get_order`, `list_orders`, `create_order`, `get_customer`, `list_customers`) are not mapped by the executor. Runtime reads `shopDomain`, `apiKey`/`accessToken` or vault credentials, `resource`, `operation`, ID aliases, data aliases, and `limit`. Output is `item`, `items`, or `deleted` + `id`, with `_error`/`_errorDetails` on failure.
- `woocommerce` likewise expects generic `resource` + `operation` and generic `id`/`data`/`perPage`. Runtime reads `storeUrl`, `apiKey`/`username`, and `apiSecret`/`password`; visual `consumerKey`, `consumerSecret`, `productId`, `orderId`, and `customerId` are not read directly by the runtime. Output is `item`, `items`, or `deleted` + `item`, with `_error`/`_errorDetails` on failure.
- `chargebee` supports `create_customer`, `create_subscription`, `get_customer`, and `cancel_subscription`. It reads `apiKey`, `site`, `customerId`, `email`, `planId`, and `subscriptionId`, sends Basic Auth form-encoded requests, and does not spread incoming fields into successful output. Success uses `{success: true, operation, ...}` with `customer`/`customerId` or `subscription`/`subscriptionId`; failures use plain `{success: false, error}` rather than `_error`.

Verification for this 5-node batch: focused docs tests passed with **565 tests passing** (564 doc-coverage + 1 FieldsTable). Node-specific frontend tests found for this batch were trigger-only (`stripe_trigger` and `shopify_trigger`) and passed with **4 tests passing**. Frontend `npm run build` passed with the same existing stale Browserslist/caniuse-lite warning and duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`. Worker `npm run type-check` and `npm run build` both passed; worker build emitted the same existing `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support warnings. `ctrl_checks/src/docs-content/node-field-content.ts` was not intentionally touched for this batch, per standing rule.

Per the "Suggested Execution Order," the next category is database/file, starting with `airtable`, then AI, then remaining provider/utility nodes.

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

`airtable`, `db` (the UI-visible Supabase node), `firebase`, `google_cloud_storage`, and `mongodb` are now audited and marked `Complete`. `database_read` and `database_write` were explicitly checked against `ctrl_checks/src/components/workflow/nodeTypes.ts` and are not UI-visible node types, so they are marked `Out of Scope (not UI-visible)` rather than completed or audited. Important findings:

- `db` is the canonical UI-visible Supabase node type. The old `supabase` slug still exists in older docs/guides, but `NODE_TYPES` and the backend library use `db`. Runtime supports `select`, `insert`, `update`, `delete`, and `rpc`; the visual panel's old Raw SQL `query` option is not executed by `runSupabaseNode`. This was documented rather than fixed because changing the Supabase visual panel is a UI behavior change, not a docs-only correction.
- `airtable` runtime supports `list`/`read`, `get`, `create`, `update`, `upsert`, and `delete`. It reads `table` first and `tableId` as an alias, accepts `apiKey`/`accessToken`/`token` or a saved Airtable credential, and returns `records`/`count`, top-level `id`/`fields` for get, `created`/`updated` for upsert, or `deletedRecords`/`count` for delete. The visual `resource: Table` option does not unlock table-management APIs.
- `firebase` and `google_cloud_storage` both run through `executeDatabaseNode(...)` and then the legacy database wrapper in `execute-workflow.ts`. Object-shaped `data` is flattened on success; array/null/string `data` remains under `data`. Firebase uses Admin service account fields (`projectId`, `clientEmail`, `privateKey`), not a Firebase web API key.
- `mongodb` runtime supports eight operations (`find`, `insertOne`, `insertMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `aggregate`), while the current visual panel exposes only four (`find`, `insertOne`, `updateOne`, `deleteOne`). Extra runtime operations are documented as runtime-supported/generated-config-supported. Runtime does not read a legacy `query` field; it reads `filter`, `projection`, `sort`, `document`, `documents`, `update`, `pipeline`, and `options`.
- `google_cloud_storage` successful upload returns `fileName`/`fileSize`; download returns `fileName`/`data` as UTF-8 string; delete returns `fileName`/`deleted`; list returns `data` array of `{name,size,updated}` plus `count`.

Files updated in this UI-visible database batch: `ctrl_checks/src/docs-content/nodes/airtable.doc.ts`, `db.doc.ts`, `firebase.doc.ts`, `google_cloud_storage.doc.ts`, `mongodb.doc.ts`; matching search files; `ctrl_checks/src/docs-content/index.ts`; `search-index.ts`; `manifest.ts`; `node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; and `manual-trigger-doc-coverage.test.ts`. `node-field-content.ts` was not touched for this batch and remains out of scope.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npm run test:vitest -- src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 595/595 tests (594 docs coverage + 1 FieldsTable). First docs-only run caught five new-batch documentation issues (short operation descriptions and missing Firebase display-label explanations); those were fixed before the final pass.

`npm run build` (frontend) passed. It emitted the same existing warnings as before: stale Browserslist/caniuse-lite data and duplicate `google_sheets` key in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) also passed, regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied data files. No worker runtime/source files were intentionally changed for this batch. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

`mysql`, `oracle_database`, `pinecone`, `postgresql`, and `qdrant` are now audited and marked `Complete`. This batch followed the user's explicit rule to audit only nodes that are present in `ctrl_checks/src/components/workflow/nodeTypes.ts`; `database_read` and `database_write` remain out of scope because they are not UI-visible. Important findings:

- MySQL and PostgreSQL documentation/visual fields were aligned to the real runtime operations: `executeQuery`, `insert`, `update`, and `delete`. The previous UI/docs select-style fields such as `filters`/`limit` were not read by these executors. PostgreSQL still has a backend schema/runtime mismatch around connection shape: the backend schema advertises `connectionString`, but the executor validates `host`, `username`, `password`, `database`, `port`, and `ssl`; this is documented.
- A small runtime fix was intentionally made in `worker/src/services/database/postgresNode.ts`: PostgreSQL now reads `inputs.params ?? inputs.parameters`, so the documented/backend `parameters` field works like MySQL's query parameters alias.
- Oracle's `schema` and `table` fields were visible only for `execute_sql`, which was backwards for the runtime. The UI now shows them for table operations (`select`, `insert`, `update`, `insert_or_update`, `delete`). Runtime requires schema/table for non-`execute_sql`, rejects trailing semicolons for `execute_sql`, rejects update without filters, and requires `selectRows` for upsert behavior.
- Pinecone's `vector` and `id` conditional visibility was inverted in the UI. The UI now shows `vector` for `query`/`upsert` and `id` for `upsert`/`delete`. Runtime returns `matches` for query and `upsertedCount` for upsert, not a fabricated `{data:{id,status}}` shape.
- Qdrant was UI-visible but had no node doc, search doc, docs index entry, search-index entry, manifest entry, usage guide entry, or coverage-test registration. Its UI operation value `search` was unsupported by runtime, which accepts `query`; the UI now uses `query` while keeping the label clear for search use cases. The unsupported `get_collection` option was removed, and missing `vector`, `limit`, `withPayload`, `id`, and `payload` fields were added.

Files updated in this UI-visible database batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/database/postgresNode.ts`; `ctrl_checks/src/docs-content/nodes/mysql.doc.ts`, `postgresql.doc.ts`, `oracle_database.doc.ts`, `pinecone.doc.ts`, and newly added `qdrant.doc.ts`; matching search files including newly added `search/qdrant.ts`; `ctrl_checks/src/docs-content/index.ts`; `search-index.ts`; `manifest.ts`; `node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `nodeGuides.ts`; and `manual-trigger-doc-coverage.test.ts`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npm run test:vitest -- src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 625/625 tests (624 docs coverage + 1 FieldsTable). The first run caught three new-batch issues; they were fixed before the final pass.

`npm run build` (frontend) passed. It emitted stale Browserslist/caniuse-lite data and the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`.

`npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied data files. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

`redis`, `sql_server`, `timescaledb`, `aws_s3`, and `dropbox` are now audited and marked `Complete`. This batch followed the user's explicit rule to audit only nodes that are present in `ctrl_checks/src/components/workflow/nodeTypes.ts`; `database_read` and `database_write` remain out of scope because they are not UI-visible. Important findings:

- `redis` previously exposed only `get`/`set`/`delete` in the visual panel and did not expose required connection fields, even though the real runtime requires `host` and supports `get`, `set`, `delete`, `incr`, `hget`, `hset`, `lpush`, `rpop`, and `command`. The UI schema, docs, search, usage guides, backend schema metadata, and coverage assertions now match the actual Redis executor. Runtime output is flattened and can include `value`, `result`, `deleted`, `count`, `length`, and `_error` depending on operation.
- `sql_server` runtime supports `executeQuery`, `insert`, `update`, `delete`, and `storedProcedure`, plus legacy aliases `query`, `rawSql`, `raw_sql`, and `select` for `executeQuery`. Its backend schema understated real fields such as `data`, `where`, `params`, `parameters`, `filters`, and `limit`; these are now documented in the schema/docs. Runtime can generate `SELECT TOP` from `table` + `limit` when `executeQuery` has no raw query.
- `timescaledb` visual operations were stale (`select`/`query`) compared with the real runtime operations `executeQuery`, `insert`, `update`, `delete`, `timeBucket`, `first`, and `last`. The UI now uses runtime-supported operation values and exposes the time-series helper fields the executor actually validates, including `bucketColumn` for `timeBucket` and `valueColumn` for `first`/`last`.
- `aws_s3` and `dropbox` both execute through legacy `execute-workflow.ts` cases reached by registry overrides. Their earlier docs/guides used generic/fabricated output shapes; the new docs describe the real flattened outputs and `_error` behavior. AWS S3 UI values `get`/`put` normalize to runtime `download`/`upload`; Dropbox UI value `read` normalizes to runtime `download`.
- `aws_s3` upload body can come from `dataBase64`, `data`, or `content`; download returns `dataBase64`/`sizeBytes`/`contentType`/`etag`; list returns `items`/`count`; delete returns `deleted`. `dropbox` upload also accepts `dataBase64`, `data`, or `content`; list returns `items`/`cursor`/`hasMore`; read returns `dataBase64`/`sizeBytes`/`metadata`; delete returns `deleted`, and failures include `_errorDetails` when Dropbox provides structured error details.

Files updated in this UI-visible database/file batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/redis.doc.ts`, `sql_server.doc.ts`, `timescaledb.doc.ts`, `aws_s3.doc.ts`, and `dropbox.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npm run test:vitest -- src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 655/655 tests (654 docs coverage + 1 FieldsTable) before worker schema export and again after `worker npm run build` regenerated `worker/public/node-library.json`.

`npm run build` (frontend) passed. It emitted stale Browserslist/caniuse-lite data and the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`; no duplicate warnings were introduced for the five audited nodes.

`npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied data files. The worker build emitted the same existing warnings about `whatsapp_cloud` missing `intentCategories` and AWS SDK v2 end-of-support.

`ftp`, `onedrive`, `read_binary_file`, `sftp`, and `write_binary_file` are now audited and marked `Complete`, finishing the UI-visible file category. This batch followed the user's updated cadence: verify after every 5 UI-visible nodes, while still confirming each node is present in `ctrl_checks/src/components/workflow/nodeTypes.ts` before touching it. Important findings:

- `ftp` and `sftp` had a real visual-panel/runtime mismatch in their registry overrides. The UI exposed `get`/`put`/`list`/`delete` with `remotePath`/`content`, while the registry override only handled `download`/`upload`/`list` with `path`/`fileData` and no delete support. This was a small, direct compatibility fix: the overrides now accept the UI operations and fields, still accept legacy `download`/`upload` aliases, support delete, read `remotePath || path`, and accept upload bodies from `dataBase64`, `content`, or `fileData`. The docs describe both registry output (`success` + `output.operation`/`output.data`) and the legacy flattened executor output.
- `onedrive` is a legacy-executor node reached through the registry adapter. The real runtime supports `read` (normalized to `download`), `upload`, `list`, and `delete`; token comes from a saved Microsoft credential/vault key or direct `accessToken`; paths are normalized to a leading slash. `fileName` is effectively legacy/dead for upload because the runtime uploads to `path` and does not read `fileName` directly. The UI/doc now make File ID delete-only and call the upload filename field legacy/reference-only.
- `read_binary_file` and `write_binary_file` are local managed binary-storage nodes, not cloud connectors. `read_binary_file` reads either a workflow file asset by `assetId` or a safe backend storage path/key and returns `dataBase64` plus metadata. `write_binary_file` writes base64/data URL/plain text under the backend binary storage root and returns `written:true`, `assetId`, normalized `dataBase64`, checksum/storage metadata, and `metadataPersisted` or `metadataError`. Both reject unsafe paths outside the configured binary storage root.
- This batch updated docs/search/manifest/usage guide/inline guides/content overrides/coverage registrations for all five nodes, plus targeted UI/schema alignment where the real behavior was clear and small enough to fix safely. `node-field-content.ts` was not touched and remains out of scope.

Files updated in this UI-visible file batch: `worker/src/core/registry/overrides/ftp.ts`; `worker/src/core/registry/overrides/sftp.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/components/workflow/nodeTypes.ts`; `ctrl_checks/src/docs-content/nodes/ftp.doc.ts`, `sftp.doc.ts`, `onedrive.doc.ts`, `read_binary_file.doc.ts`, and `write_binary_file.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npm run test:vitest -- src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 685/685 tests (684 docs coverage + 1 FieldsTable) before worker schema export and again after `worker npm run build` regenerated `worker/public/node-library.json`.

`npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated schema/OpenAPI/data exports. `npm run build` (frontend) passed. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`ai_agent`, `ai_chat_model`, `anthropic_claude`, `chat_model`, and `cohere` are now audited and marked `Complete`, starting the UI-visible AI category. `lightricks` and `tool` were checked against `ctrl_checks/src/components/workflow/nodeTypes.ts` and are marked out of scope because they are not UI-visible. Important findings:

- `ai_agent` extracts a single user message from `userInput` or upstream message-like fields, infers provider from `model`, then calls the LLM adapter. It parses `topP`, `frequencyPenalty`, and `presencePenalty` but does not pass them to the model call. Current output uses `response_text`, `response_json`, optional `response_markdown`, fixed `confidence_score: 0.8`, `used_tools: []`, `memory_written: false`, `error_flag`, and `error_message`; `reasoning` is provider/model metadata only when enabled.
- `ai_chat_model` always routes to Gemini and hardcodes `gemini-3.5-flash` regardless of the visible model dropdown. It preserves incoming fields, returns `response` and `model`, returns `_error` for missing prompt or Gemini credential problems, and best-effort parses JSON only when `responseFormat` is `json`.
- `anthropic_claude` can use a direct `apiKey`/`accessToken`/`token` or saved `anthropic` vault credential. `Prompt` wins over `Messages`; `temperature` and `memory` are visible but ignored by the current legacy executor. Successful output is only `response`, `model`, `usage`, and `finishReason`, so incoming fields are not preserved.
- `chat_model` is UI-visible but behaves like an internal support/config node. It does not call an AI provider. It reads only `temperature`, ignores `provider`, `apiKey`, `model`, and `prompt`, and returns incoming fields plus `provider: 'gemini'`, `model: 'gemini-3.5-flash'`, `temperature`, and `_chat_model_config: true`.
- `cohere` calls `https://api.cohere.com/v1/chat`, reads `apiKey` directly, supports `model`, `prompt`, optional `preamble`, `temperature`, and `maxTokens`, and reports failures with `success: false` plus plain `error` instead of `_error`. The visual panel now exposes runtime-supported `preamble` and `maxTokens`.

Files updated in this first UI-visible AI batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/ai_agent.doc.ts`, `ai_chat_model.doc.ts`, `anthropic_claude.doc.ts`, `chat_model.doc.ts`, and newly added `cohere.doc.ts`; matching search files including newly added `search/cohere.ts`; `ctrl_checks/src/docs-content/index.ts`; `search-index.ts`; `manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npm run test:vitest -- src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 715/715 tests (714 docs coverage + 1 FieldsTable) before worker schema export and again after `worker npm run build` regenerated `worker/public/node-library.json`.

`npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated schema/OpenAPI/data exports. `npm run build` (frontend) passed. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`google_gemini`, `huggingface`, `langchain`, `memory`, and `mistral` are now audited and marked `Complete`, continuing the UI-visible AI category. This batch followed the user's updated cadence to verify after every 5 UI-visible nodes, and each node was reconfirmed in `ctrl_checks/src/components/workflow/nodeTypes.ts` before completion. Important findings:

- `google_gemini` resolves Gemini credentials through the Gemini connection/wallet/key-pool/worker/direct-key path, then calls the Gemini adapter. `prompt` can become system context when static upstream text exists. `temperature` and `memory` are visible legacy fields but are not passed/read by the current executor. Successful output is only `response`, `model`, `usage`, and `finishReason`, so incoming fields are not preserved.
- `huggingface` calls `https://router.huggingface.co/hf-inference/models/<model>` with `inputs: prompt` and first tries `parameters.max_new_tokens`/`temperature`; if a 400 mentions `max_new_tokens`, it retries once with bare inputs. `task` and custom `parameters` JSON are visible/legacy hints and are not read by runtime. Successful and failure outputs both preserve incoming fields and add `success`, `model`, `response`/`output`, or `error`.
- `langchain` is a direct provider facade, not a full LangChain library executor. OpenAI is hardcoded to `gpt-4o-mini`; Anthropic is hardcoded to `claude-3-5-sonnet-20241022`. `tools` only affects OpenAI `run_agent` and returns tool calls in `steps`; `memory` is ignored. Successful output does not preserve incoming fields.
- `memory` is a passthrough context node today, despite the visual Store/Retrieve/Clear/Search controls. Runtime returns `sessionId`, `context`, and `messages`; it does not store, retrieve, clear, search, expire, or limit memory, and does not produce fabricated `memory` or `searchResults` fields.
- `mistral` calls Mistral chat completions with direct `apiKey`, selected `model`, optional `systemPrompt`, `prompt`, `temperature`, and `maxTokens`. Successful and failure outputs preserve incoming fields; success adds `success`, `model`, `response`, `inputTokens`, and `outputTokens`, while failures add plain `error`.

Files updated in this second UI-visible AI batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/google_gemini.doc.ts`, `memory.doc.ts`, `langchain.doc.ts`, and newly added `huggingface.doc.ts`/`mistral.doc.ts`; matching search files including newly added `search/huggingface.ts` and `search/mistral.ts`; `ctrl_checks/src/docs-content/index.ts`; `search-index.ts`; `manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node batch:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 745/745 tests (744 docs coverage + 1 FieldsTable) before the build gate and again after `worker npm run build` regenerated `worker/public/node-library.json`.

`npm run build` (frontend) passed. `npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated schema/OpenAPI/data exports. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`ollama`, `openai_gpt`, `sentiment_analyzer`, and `text_summarizer` are now audited and marked `Complete`, finishing the UI-visible AI category. This category-boundary batch followed the user's updated cadence: normally verify every 5 UI-visible nodes, but run the verification gate here because only 4 UI-visible AI nodes remained. Each node was reconfirmed in `ctrl_checks/src/components/workflow/nodeTypes.ts` before completion. Important findings:

- `openai_gpt` shares the legacy OpenAI/Anthropic switch path but uses the OpenAI credential resolver first. It reads `apiKey`/`accessToken`/`token`, `model`, `prompt`, and fallback `messages` when Prompt is blank. If Prompt is static and upstream text exists, runtime can send Prompt as system context and upstream text as the user message. Successful output is only `response`, `model`, `usage`, and `finishReason`, so incoming fields are not preserved. Visible `temperature` and `memory` are legacy fields and have no current runtime effect.
- `ollama` is not local Ollama at runtime. The executor rewrites the node to `ai_chat_model`, forces `provider: 'gemini'` and `model: 'gemini-3.5-flash'`, and delegates to the Gemini-backed AI Chat Model behavior. Output preserves incoming fields and adds `response`/`model`; prompt/credential/wallet failures use `_error` and wallet failures can include `code`.
- `text_summarizer` is also an `ai_chat_model` alias. It reads `text` and optional `maxLength`, builds a generated Gemini prompt (`Summarize the following text...`), and returns the delegated AI Chat Model shape. The real summary is in `response`, not `summary`; there is no `wordCount` or `originalLength`. Blank `text` is not locally rejected because the generated prompt itself is non-empty.
- `sentiment_analyzer` builds a Gemini prompt asking for JSON with `sentiment`, `score`, and `summary`, sets `responseFormat: 'json'`, then delegates to `ai_chat_model`. Valid JSON is parsed into `response`; invalid JSON falls back to raw text in `response`. There are no top-level `sentiment`, `score`, `label`, or `confidence` fields. Blank `text` is not locally rejected.

Files updated in this final UI-visible AI batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/openai_gpt.doc.ts`, `ollama.doc.ts`, `text_summarizer.doc.ts`, and `sentiment_analyzer.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 4-node AI category-boundary batch:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Passed with 769/769 tests (768 docs coverage + 1 FieldsTable) before the build gate and again after `worker npm run build` regenerated `worker/public/node-library.json`.

`npm run build` (frontend) passed. `npm run type-check` (worker) passed. `npm run build` (worker) passed and regenerated schema/OpenAPI/data exports. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`clickup`, `contentful`, `wordpress`, `bitbucket`, and `github` are now audited and marked `Complete`, covering the UI-visible actions category, CMS category, and first two DevOps nodes. Each node was reconfirmed in `ctrl_checks/src/components/workflow/nodeTypes.ts` before completion, and the batch followed the user's 5-node verification cadence. Important findings:

- `clickup` executes through the real ClickUp API and returns the raw ClickUp response object on success, not a normalized `{ success, data }` wrapper. Direct credential aliases now line up with runtime (`apiKey`, `apiToken`, `token`, plus saved ClickUp credentials), the stale backend operation value `get_tasks_list` was corrected to `list_tasks`, runtime-supported fields such as `folderId`, `assignees`, `dueDate`, and `includeClosed` are documented, and invalid status fallback behavior is documented with `_statusSkipped`/`_statusNote`.
- `contentful` is a legacy inline executor that returns `{ success, data, error }` and does not preserve incoming fields. Create/update parse `fields` JSON and wrap it in `{ fields }` unless it already has a `fields` envelope; update/delete must first fetch the entry version before writing. Space/environment/token requirements and JSON/version failure modes are now documented.
- `wordpress` is a legacy inline executor that returns `{ success, data, error }` and does not preserve incoming fields. `siteUrl` is concatenated directly with `/wp-json/wp/v2/posts`, so users should avoid a trailing slash. Create sends `status`; update sends only non-empty `title`/`content` and ignores `status`; delete uses `force=true`.
- `bitbucket` had a serious visual/schema mismatch. The UI and backend schema now match the override-supported repository operations only: `read`, `create`, `update`, and `delete`, with `workspace`, `repoSlug`, `username`, `appPassword`, `accessToken`, `description`, `isPrivate`, and `data`. Successful output is `{ success: true, output: { operation, data } }`; failures return `{ success: false, error: { code: 'BITBUCKET_FAILED', message } }`.
- `github` executes through the social dispatcher/connected-account path in normal workflow execution, not the direct GitHub service fields. Direct token/API-key fields in the schema are legacy/AI-generated-workflow metadata; the runtime result preserves incoming fields and spreads provider output top-level with `success`, `provider`, and `action`, while failures use `_error`. All 27 UI operations and their key fields are now documented.

Files updated in this actions/CMS/DevOps batch: `ctrl_checks/src/docs-content/nodes/_sharedFieldHelp.ts`; `ctrl_checks/src/docs-content/nodes/clickup.doc.ts`, `contentful.doc.ts`, `wordpress.doc.ts`, `bitbucket.doc.ts`, and `github.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node batch:

```powershell
cd worker
npm run type-check
npm run build

cd ../ctrl_checks
npm run build
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

Worker type-check passed. Worker build passed and regenerated `worker/public/node-library.json`/`worker/dist/public/node-library.json`, exported OpenAPI, and copied data files. Frontend build passed. The focused docs/FieldsTable command passed with 799/799 tests after a small operation-description length fix and again after the frontend build. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`gitlab`, `jenkins`, `jira`, `netlify`, and `vercel` are now audited and marked `Complete`, finishing the UI-visible DevOps category. Each node was reconfirmed in `ctrl_checks/src/components/workflow/nodeTypes.ts` before completion, and this batch followed the user's updated cadence to verify after every 5 UI-visible nodes. Important findings:

- `gitlab` is issue-only at runtime. It supports `read`/list issues and `create` issue only; old project, merge request, pipeline, branch, file, update, and delete operations were removed from the visible panel. Runtime reads `accessToken` or a saved `gitlab` credential, not the old `token` field; create reads `descriptionText`, not `description`. The backend still exposes `repo` as a legacy alias for `projectId`, so the doc now explains it as a fallback rather than a preferred UI field. Success preserves incoming fields and adds `items`, `issue`, or `created`; failures use `_error`/`_errorDetails`.
- `jenkins` executes through `worker/src/core/registry/overrides/jenkins.ts`, not the legacy switch. It supports only `build`, `status`, and `cancel`; the UI/schema now use `apiToken` and no longer advertise polling/log/list operations. Successful output is `{ success: true, output: { operation, jobName, data } }`; failures are `{ success:false, error:{ code:'JENKINS_FAILED', message } }`. Status uses `lastBuild` when `buildNumber` is blank, and cancel requires `buildNumber`.
- `jira` supports the real Jira Cloud issue/project operation set: `create_issue`, `get_issue`, `update_issue`, `delete_issue`, `search_issues`, `add_comment`, `transition_issue`, and `get_projects`. It normalizes some operation aliases, reads domain/email/apiToken from direct fields or saved Jira credentials, converts description/comment text to Atlassian Document Format, preserves incoming fields, and adds operation-specific top-level Jira fields. The manifest/UI doc category was corrected to DevOps.
- `netlify` is a legacy executor for sites/deploys only: `list_sites`, `get_site`, `create_deploy`, `list_deploys`, and `get_deploy`. The stale Forms resource was removed from the visual/schema options because the runtime has no forms endpoint today. Output uses `{ success, resource, operation, record/records, count, meta, error }`, with failures returning `records: []` and `count: 0`.
- `vercel` supports `deploy` and `list_deployments` through the Vercel v13 deployments API. It resolves `operation`, `projectName`, and `token`, can fall back to a saved `vercel` credential, validates token/project name/operation, and returns `{ success, data, error }` without preserving incoming fields. Validation/API failures use structured error codes such as `INVALID_OPERATION`, `MISSING_TOKEN`, `INVALID_TOKEN_FORMAT`, `INVALID_PROJECT_NAME`, and `TIMEOUT`.

Files updated in this DevOps batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/gitlab.doc.ts`, `jenkins.doc.ts`, `jira.doc.ts`, `netlify.doc.ts`, and `vercel.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`/`worker/dist/public/node-library.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node DevOps batch:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
npm run build

cd ../worker
npm run type-check
npm run build

cd ../ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

The focused docs/FieldsTable command passed with 829/829 tests before the build gate and again after `worker npm run build` regenerated `worker/public/node-library.json`. Frontend build passed. Worker type-check passed. Worker build passed and regenerated schema/OpenAPI/data exports. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

`graphql`, `http_post`, `respond_to_webhook`, `schedulewise`, and `webhook_response` are now audited and marked `Complete`, covering five of the remaining UI-visible `http_api` nodes. Each node was reconfirmed in `ctrl_checks/src/components/workflow/nodeTypes.ts` before completion, and this batch followed the user's 5-node verification cadence. Important findings:

- `graphql` is a wrapper around `http_request` with method forced to `POST`; it sends `{ query, variables, operationName? }` as the body and returns the normal HTTP Request shape (`status`, `statusText`, `headers`, `body`, `data`, `url`, `method`, `responseTime`, or `_error`). GraphQL server errors live inside `body.errors`; there is no top-level `errors` field. `variables` may be an object or template string, but invalid/unparseable values are silently replaced with `{}`.
- `http_post` is also an alias for `http_request` with method forced to `POST`. The frontend category was corrected from `output` to `http_api`, and output docs now show the real HTTP Request output shape instead of old generic `response` wording.
- `respond_to_webhook` and `webhook_response` share the same runtime case. Both return exactly `{ statusCode, headers, body }`; the older documented `sent: true`, top-level `response`, and top-level `responseCode` outputs were fabricated. Runtime accepts compatibility aliases (`responseCode`, `status`, and `responseBody`), but the visible `respond_to_webhook` panel uses `statusCode`/`responseBody`/`headers`, while `webhook_response` uses `statusCode`/`body`/`headers`.
- `schedulewise` is UI-visible and belongs to the `http_api` category in the backend/tracker, so the frontend panel category was aligned from `productivity` to `http_api`. It supports only `getSchedules`, `createAppointment`, `updateAppointment`, and `deleteAppointment`. Live runs require a saved `schedulewise` credential from the credential vault unless `mockMode` is on; visible `credentialId` is metadata/reference only and is not the secret lookup value.
- `schedulewise` live requests use `apiUrl/api_url`, `accessToken/access_token`, or `apiKey/api_key/value`; `getSchedules` sends GET `/appointments` with query filters, create sends POST `/appointments`, update sends PUT `/appointments/{appointmentId}`, and delete sends DELETE `/appointments/{appointmentId}` with optional `?hardDelete=true`. Output is `{ success, operation, data, executionTimeMs }` or `{ success:false, operation, executionTimeMs, error }`. Known error codes are `INVALID_OPERATION`, `NO_CREDENTIALS`, `PARSE_ERROR`, `TIMEOUT`, `NETWORK_ERROR`, and `HTTP_ERROR`; only 5xx HTTP responses are retried. `outputFormat: raw` is visible but not honored today because runtime always parses JSON and returns `PARSE_ERROR` for non-JSON responses.

Files updated in this HTTP/API batch: `ctrl_checks/src/components/workflow/nodeTypes.ts`; `worker/src/services/nodes/node-library.ts`; `ctrl_checks/src/docs-content/nodes/graphql.doc.ts`, `http_post.doc.ts`, `respond_to_webhook.doc.ts`, `schedulewise.doc.ts`, and `webhook_response.doc.ts`; matching search files; `ctrl_checks/src/docs-content/manifest.ts`; `ctrl_checks/src/docs-content/node-content-overrides.ts`; `ctrl_checks/src/components/workflow/nodeUsageGuides.ts`; `ctrl_checks/src/components/workflow/nodeGuides.ts`; `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts`; and generated `worker/public/node-library.json`, `worker/dist/public/node-library.json`, and `worker/public/openapi.json`. `node-field-content.ts` was not touched and remains out of scope.

Verification after this 5-node HTTP/API batch:

```powershell
cd ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
npm run build

cd ../worker
npm run type-check
npm run build

cd ../ctrl_checks
npx vitest run src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts src/components/docs/__tests__/FieldsTable.test.tsx
```

The focused docs/FieldsTable command passed with 889/889 tests before and after `worker npm run build` regenerated `worker/public/node-library.json`. Frontend build passed. Worker type-check passed. Worker build passed and regenerated schema/OpenAPI/data exports. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, the pre-existing duplicate `google_sheets` key warning in `src/components/workflow/nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

### Required Next Cloud Prompt

Paste this prompt into the cloud run:

```text
/goal Read docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md in full before doing anything else — especially the "⚠ Reconciliation Needed" section and everything under "## Cloud Continuation Handoff" down to this prompt.

Continue the persistent node documentation audit goal. This is a long-running, multi-session effort, and multiple different tools/IDEs (not only this agent) have worked on it across sessions — so do not assume the tracker's `Complete` markings are trustworthy without checking; verify a node's registration in `ctrl_checks/src/docs-content/__tests__/manual-trigger-doc-coverage.test.ts` (import + `AUDITED_NODE_DOCS` entry) before trusting a `Complete` marking, the same lesson learned the hard way earlier in this audit when 10 nodes were falsely marked `Complete` by a prior tool.

**Verified-complete categories, do not re-audit these unless you find a live contradiction**: `triggers` (all, including every Google trigger, chat_trigger, error_trigger, facebook_trigger, github_trigger, gitlab_trigger, discord_trigger), `output` (all, including zoom_video), `google` (all 8 core nodes + Google triggers), `crm` (all 14: activecampaign, freshdesk, hubspot, intercom, intuit_smes, mailchimp, microsoft_dynamics, odoo, pipedrive, salesforce, sap, tally, zendesk, zoho_crm), **`data` (all 16: aggregate, csv, date_time, edit_fields, html, javascript, json_parser, limit, math, merge_data, rename_keys, set, set_variable, sort, text_formatter, xml)**, **`ecommerce` (paypal, shopify, stripe, woocommerce)**, and **`payment` (chargebee)**. Every one of these has a detailed "completed files" + "key findings" note above — read the relevant ones before touching a node in a category you think is done, since several contain real, load-bearing findings (see below).

**Verified-complete database/file/AI/actions/CMS/DevOps/Flow/HTTP-API/latest logic/Microsoft/Productivity batches**: `airtable`, `db`, `firebase`, `google_cloud_storage`, `mongodb`, `mysql`, `oracle_database`, `pinecone`, `postgresql`, `qdrant`, `redis`, `sql_server`, `timescaledb`, `aws_s3`, `dropbox`, `ftp`, `onedrive`, `read_binary_file`, `sftp`, `write_binary_file`, `ai_agent`, `ai_chat_model`, `anthropic_claude`, `chat_model`, `cohere`, `google_gemini`, `huggingface`, `langchain`, `memory`, `mistral`, `ollama`, `openai_gpt`, `sentiment_analyzer`, `text_summarizer`, `clickup`, `contentful`, `wordpress`, `bitbucket`, `github`, `gitlab`, `jenkins`, `jira`, `netlify`, `vercel`, `parallel`, `retry`, `return`, `timeout`, `try_catch`, `graphql`, `http_post`, `respond_to_webhook`, `schedulewise`, `webhook_response`, `workday`, `xero`, `error_handler`, `function`, `function_item`, `noop`, `stop_and_error`, `wait`, `outlook`, and `calendly` are Complete and registered in the coverage test. The UI-visible `file`, `ai`, `actions`, `cms`, `devops`, `flow`, `http_api`, and `logic` categories are complete. `database_read`, `database_write`, `cache_get`, `cache_set`, `queue_consume`, `queue_push`, `lightricks`, and `tool` are not UI-visible in `NODE_TYPES`; leave them out of scope unless the user explicitly changes the rule.

**Load-bearing findings from the CRM and data batches, useful context for the rest of the audit**:
- CRM nodes use FIVE different architectural patterns for where real execution logic lives: (1) no override file, logic inline in `execute-workflow.ts`'s legacy switch (`freshdesk`, `zendesk`); (2) a full override file with its own `execute()` (`activecampaign`, `intercom`, `mailchimp`, `salesforce`); (3) override defines schema/UI metadata only, delegates via `executeViaLegacyExecutor` to the legacy switch (`hubspot`, `microsoft_dynamics`, `sap`, `tally`); (4) override → legacy switch → `executeDatabaseNode()` → a dedicated mock/demo file (`intuit_smes`); (5) override calls a `services/database/*.ts` file directly, bypassing both the legacy switch and `executeDatabaseNode()` (`odoo`). Check which pattern applies before assuming where a node's real behavior lives.
- `intercom` (2 of 6 dropdown Operations work) and `mailchimp` (0 of 8 work) have severe visual-panel/runtime mismatches, documented transparently rather than fixed (too large for a docs-only pass). `intuit_smes` is an explicit mock/demo node — never calls the real Intuit/QuickBooks API.
- A recurring pattern across nearly every `data`-category node: prior/fabricated documentation repeatedly invented `commonErrors` entries that don't correspond to any real thrown error — the actual behavior for most data-transform nodes is to silently pass data through, silently coerce bad input to a default, or silently produce a degenerate-but-valid result, rather than erroring. Confirmed on `aggregate`, `csv`, `date_time`, `html`, `json_parser`, `limit`, `math`, `merge`/`merge_data`, `rename_keys`, `set_variable`, `sort`, `text_formatter`, `xml` (partial). **When documenting a new node, always read its actual runtime `case` block in `worker/src/api/execute-workflow.ts` (or its override file) before writing `commonErrors` — never assume a plausible-sounding error message is real.** The established convention when a node has no real error path for some scenario: document the real silent behavior explicitly, phrased as "X is silently Y — no error is raised" (or similar), rather than inventing a validation error.
- Two real, previously-undocumented runtime bugs were found and fixed directly in `nodeTypes.ts` this audit (both small, safe, single-key/value renames with no other dependents, confirmed via grep before renaming): `google_contacts` (`operation` dropdown value `list`→`read`, field key `maxResults`→`pageSize`) and `zoho_crm` (field key `id`→`recordId`, `perPage`→`per_page`). `set_variable` has a similar-looking but NOT fixed case: its `values`/`keepSource` fields are fully dead (never read by the runtime), but fixing that requires a worker-side code change, not a frontend rename, so it was documented only — same treatment as `mailchimp`/`intercom`.
- A `merge`/`merge_data` bonus finding: even though `merge` (Logic category) was already marked `Complete` from before this session's CRM/data reconciliation, a routine cross-check while building `merge_data` found it also had a real fabrication (`mergeMode`/`sourceCount` output keys the runtime never produces) — baked into `merge.doc.ts`, `node-content-overrides.ts`, `nodeUsageGuides.ts`, AND the coverage test's own `outputDescriptionTerms` assertion. Lesson: even nodes from far earlier in the audit are worth a quick sanity check against the real runtime if you're already reading that exact code path for a sibling node — do not assume everything before the CRM reconciliation is automatically trustworthy, though do not go out of your way to re-audit unrelated already-Complete nodes either.
- A real, unresolved discrepancy noted (not fixed) on `xml`: `nodeTypes.ts` categorizes it as `category: 'utility'` in the frontend palette, while the backend schema, `manifest.ts`, and the doc all say `category: 'Data'`. Flagged for a future session with a clear reason to actually change something, not this docs-only pass.
- Ecommerce/payment nodes are mostly legacy-delegated and have serious visual-panel/runtime mismatches documented rather than fixed: `paypal` visual operations mostly are not runtime operations and it creates orders only (no capture); `stripe` visual aliases like `create_payment`/`create_refund` are not accepted and `metadata` is only a subscription `priceId` fallback; `shopify` and `woocommerce` runtime expect generic `resource` + `operation` values, not the visual operation aliases; `chargebee` failures use plain `{success:false,error}` and successful output does not spread incoming fields.
- First database batch findings: `db` is the canonical UI-visible Supabase node and does not execute the old Raw SQL `query` option; `mongodb` runtime supports eight operations but the panel exposes only four; `firebase`/`google_cloud_storage` go through `executeDatabaseNode` plus the legacy wrapper, so object-shaped `data` may be flattened into top-level output; `airtable` delete returns `deletedRecords`/`count`, not top-level `deleted:true`.
- Second database batch findings: MySQL/PostgreSQL visual fields were aligned to runtime operations (`executeQuery`, `insert`, `update`, `delete`); PostgreSQL now accepts `parameters` as an alias for `params`; Oracle's schema/table visibility was fixed for table operations; Pinecone's vector/id visibility was fixed and its output examples now match `matches`/`upsertedCount`; Qdrant was UI-visible but undocumented, so docs/search/manifest/coverage were added and the UI operation was changed from unsupported `search` to runtime-supported `query`.
- Third database/file batch findings: Redis UI/schema was missing required connection fields and most runtime-supported operations; it now exposes `host` plus `get`/`set`/`delete`/`incr`/`hget`/`hset`/`lpush`/`rpop`/`command`. SQL Server backend schema understated real aliases/fields (`data`, `where`, `params`, `parameters`, `filters`, `limit`) and can generate `SELECT TOP` from `table` + `limit`. TimescaleDB UI operation values were stale and now match `executeQuery`, writes, and time-series helpers. AWS S3 and Dropbox are legacy executor nodes with flattened outputs and `_error`; S3 `get`/`put` normalize to `download`/`upload`, Dropbox `read` normalizes to `download`.
- Fourth file batch findings: FTP/SFTP registry overrides were mismatched with the visual panel (`get`/`put`/`delete`, `remotePath`, and `content` were not fully supported there) and were fixed narrowly while preserving `download`/`upload` aliases. OneDrive upload uses `path` and does not read `fileName` directly; delete can use `fileId` or `path`. Read/Write Binary File are local managed-storage nodes, not cloud connectors; they enforce the backend binary storage root and return `dataBase64` plus asset/storage metadata.
- First AI batch findings: `ai_agent` does one provider call and has placeholder tool/memory outputs; `ai_chat_model` hardcodes Gemini 3.5 Flash despite the model dropdown; `anthropic_claude` ignores Temperature/Memory and does not preserve incoming fields on success; `chat_model` is a UI-visible config-only/internal node that does not call a model; `cohere` reads `apiKey` directly, now exposes `preamble`/`maxTokens`, and returns `success` plus plain `error` instead of `_error`.
- Second AI batch findings: `google_gemini` uses the Gemini credential resolver/adapter and ignores visible Temperature/Memory; successful Gemini output does not preserve incoming fields. `huggingface` reads `apiKey` directly, retries once without parameters when `max_new_tokens` is rejected, and ignores visible Task/custom Parameters. `langchain` directly calls OpenAI/Anthropic HTTP APIs with hardcoded models, only uses Tools for OpenAI `run_agent`, ignores Memory, and does not preserve incoming fields. `memory` is passthrough only (`sessionId`, `context`, `messages`), not persistent memory/search. `mistral` reads `apiKey` directly, calls Mistral chat completions, and preserves incoming fields while adding response/token fields.
- Final AI batch findings: `openai_gpt` uses the OpenAI credential resolver plus direct `apiKey`/`accessToken`/`token` fallbacks; `messages` is only used when Prompt is blank; visible Temperature/Memory are ignored; successful output is only `response`/`model`/`usage`/`finishReason` and does not preserve incoming fields. `ollama` is not local Ollama; it rewrites to `ai_chat_model`, forces Gemini 3.5 Flash, preserves incoming fields, and returns `response`/`model` or `_error`. `text_summarizer` is an `ai_chat_model` alias; the summary is in `response`, not `summary`, with no `wordCount`/`originalLength`, and blank text is not locally rejected. `sentiment_analyzer` is also an `ai_chat_model` alias; parsed sentiment JSON lives inside `response`, invalid JSON falls back to raw response text, and no top-level sentiment/score/confidence/label keys exist.
- Actions/CMS/first DevOps batch findings: `clickup` returns raw ClickUp API data and uses `list_tasks` (the stale schema value `get_tasks_list` was fixed); status fallback can add `_statusSkipped`/`_statusNote`. `contentful` and `wordpress` are legacy inline executors returning `{ success, data, error }` without preserving incoming fields; Contentful wraps parsed entry fields and fetches versions before update/delete, while WordPress appends `/wp-json/wp/v2/posts` directly to `siteUrl`, sends `status` only on create, and deletes with `force=true`. `bitbucket` was corrected to the override-supported repository operations only (`read`, `create`, `update`, `delete`) and returns `{ success, output: { operation, data } }` or `{ success:false,error:{ code:'BITBUCKET_FAILED', message } }`. `github` uses the social dispatcher/connected-account path in normal execution, preserves incoming fields, spreads provider data top-level with `success`/`provider`/`action`, and failures use `_error`; direct token/API-key fields are legacy/AI-generated-workflow metadata, not the normal UI connection path.
- Final DevOps batch findings: `gitlab` is issue-only (`read`/list issues and `create` issue), reads `accessToken` or saved `gitlab` credential, reads `descriptionText` not old `description`, and keeps `repo` documented only as a backend alias for `projectId`. `jenkins` uses the registry override and supports only `build`, `status`, and `cancel`; it reads `apiToken`, returns `{ success, output: { operation, jobName, data } }`, and failures use `JENKINS_FAILED`. `jira` supports eight Jira Cloud issue/project operations, converts description/comment text to ADF, preserves incoming fields, and adds operation-specific top-level fields. `netlify` supports only site/deploy operations; stale Forms was removed from UI/schema, and output is `{ success, resource, operation, record/records, count, meta, error }`. `vercel` supports `deploy`/`list_deployments`, can use saved `vercel` credentials, returns `{ success, data, error }`, does not preserve incoming fields, and failures use structured codes such as `INVALID_OPERATION`, `MISSING_TOKEN`, and `INVALID_PROJECT_NAME`.
- Flow batch findings: `parallel` and `retry` are passthrough/config-marker nodes in the legacy executor, not self-contained branch fan-out or retry-loop executors. `parallel` preserves object input, adds `mode`, returns `results: []`, and stores `metadata.parallelMode`; primitive input is not preserved as a named top-level field. `retry` preserves object input, adds `attempts: 0`, `maxAttempts`, `delayBetween`, and `backoff`, and stores `metadata.retryConfig`; the UI was fixed from dead `delay`/`backoffMultiplier` keys to runtime-read `delayBetween`/`backoff`. `return` emits `success`, `__return`, and `returnedValue` (not `returned`/`value`), and the UI now exposes backend-supported `includeInput`. `timeout` is a registry override that routes by elapsed workflow time and outputs `elapsedMs`, `limitMs`, `timedOut`, `originalInput`, and `__routing`; invalid limit returns structured `INVALID_CONFIG`. `try_catch` marks try routing and preserves input; connected try-branch service nodes do the protected work, and catch context only appears when the engine routes an error.
- HTTP/API batch findings: `graphql` and `http_post` are both wrappers around `http_request`, with method forced to `POST` and HTTP Request output shape (`status`, `statusText`, `headers`, `body`, `data`, `url`, `method`, `responseTime`, `_error`). GraphQL `variables` silently falls back to `{}` when unparseable, and GraphQL server errors live inside `body.errors`, not a top-level `errors`. `respond_to_webhook` and `webhook_response` return exactly `{ statusCode, headers, body }`; no `sent` flag is returned. `schedulewise` now has its UI category aligned to `http_api`, requires a saved `schedulewise` credential unless `mockMode` is true, treats visible `credentialId` as metadata/reference only, supports only `getSchedules`/`createAppointment`/`updateAppointment`/`deleteAppointment`, and has visible `outputFormat: raw` that runtime does not honor because it always JSON-parses responses.
- HTTP/API + logic batch findings: `workday`, `xero`, `error_handler`, `function`, and `function_item` are now Complete and registered in the focused coverage test. `xero` calls the Xero Accounting API directly with resolved `accessToken` and `tenantId`; Xero non-2xx responses return `{ success:false, error, record:null, records:[] }`, while missing config/unsupported values return `_error`. `workday` calls REST paths from `baseUrl` + `resource`/`rawPath`, returns `{ success, resource, operation, tenant, records, record, count, pagination, meta/error }`, and does not pre-validate blank auth fields before sending Bearer/Basic headers. `error_handler` does not retry; it only marks `_error` payloads handled when `fallbackValue` is configured and puts the fallback under `value`. `function` returns exactly the JavaScript return value or assigned `result`; no wrapper object is added. `function_item` maps `input.items` and preserves other top-level fields, but the runtime does **not** define an `index` variable even though the old UI/help text claimed it did; the UI guidance and docs were corrected.
- Logic/Microsoft/Productivity batch findings: `noop`, `stop_and_error`, `wait`, `outlook`, and `calendly` are now Complete and registered in the focused coverage test. `noop` is pure passthrough with no fields, no success flag, and no extra wrapper keys. `stop_and_error` throws exactly `ERROR_CODE: message` and does not return the previously documented fabricated `stopped`/`stoppedAt` object. `wait` sleeps for a fixed duration, caps visible Wait at 5 minutes, and returns input unchanged; it does not produce `resumed`, `reason`, or `waitedMs` (those were stale/fabricated for this node). `outlook` supports only `send_email`/legacy `send`, calls Microsoft Graph `/me/sendMail`, preserves incoming fields, adds `success: true`, and does not expose a message ID. `calendly` is read-only, can use a saved Calendly credential or fallback token, supports `get_user`, `get_events`, `get_event_types`, and `get_scheduled_events`, preserves incoming fields, and returns `success`, `operation`, `data`, optional `collection`, optional `user`, and optional `count`; `userUri` is required for `get_event_types` and `get_scheduled_events`.
- Productivity/Social batch findings: `linear`, `notion`, `trello`, `typeform`, and `facebook` are now Complete and registered in the focused coverage test. `linear` uses a saved Linear Personal API Key or apiKey/token/accessToken fallback, supports `get_teams`, `list_issues`, `get_issue`, `create_issue`, and `update_issue`, preserves incoming fields, and returns `success`, `operation`, `data`, optional `issue`/`issues`/`teams`, and optional `count`; create requires `teamId` + `title`, get/update require `issueId`. `notion` resolves OAuth from the workflow owner connection, ignores raw visible credential fields in normal execution, supports page/database/block/user/comment/search resource-operation pairs, returns raw Notion SDK data under `data`, and failures use `_error`/`_errorDetails`; `comment.get` is explicitly unsupported by Notion API, search reads `sort` (not stale `sorts`), and UI now exposes `returnAll`/`isInline`. `trello` uses saved Trello API Key & Token or node fallbacks, supports board/list/card/label/checklist operations, preserves incoming fields, and returns `data` plus normalized `card`/`cards`/`boards`/`lists`/`labels`/`count`. `typeform` supports only `get_responses`, `create_form`, and `get_form`; stale visible `get_forms` was removed from the UI because runtime rejects it, and output is `success`, `operation`, `data`, optional `items`, optional `totalItems`, and optional `formId`. `facebook` goes through the social dispatcher/connected-account path, preserves incoming fields, spreads provider data top-level with `success`/`provider`/`action`, and failures use `_error`; the current implemented handlers are only page/list (`pages`, `count`, `summary`), page_message/sendTextMessage (`messageId`, `raw`), and comment/createComment (`commentId`, `raw`), while the broader visible Graph API scaffold returns not-yet-implemented/unsupported errors. The Facebook default was changed from broken page/createPost to page/list.
- Final Social/Utility batch findings: `instagram`, `linkedin`, `twitter`, `youtube`, and `delay` are now Complete and registered in the focused coverage test. `instagram` uses Meta/Instagram Graph API OAuth from Connections, no longer exposes the stale `message`/`sendText` visual default, and now exposes the runtime resources `user`, `media`, `comment`, `hashtag`, `story`, and `insights`; successful service-node output spreads raw Graph API data top-level and failures use `_error`/`_errorDetails`. `linkedin` uses LinkedIn OAuth from Connections with legacy `accessToken` fallback, supports `get_profile`/`get_me`, `get_posts`, `create_post`, `create_post_media`, `create_article`, `create_company_post`, and `delete_post`, supports `dryRun`, and returns `success` plus operation-specific fields or `_error`. `twitter` uses Twitter/X OAuth2 from Connections, supports resource/operation pairs for tweet, user, timeline, search, list, media, directMessage, and space, preserves incoming object fields, and spreads raw X API response data with `_error` on failures; direct token/credentialId fields are legacy compatibility only. `youtube` delegates to the registry override for `list_my_channels`, `get_channel`, `search_videos`, `get_video_stats`, `upload_video`, `update_video_metadata`, and `delete_video`, resolves YouTube OAuth2 credentials with `youtube.force-ssl`/`youtube.upload`, and returns registry output spread by the legacy switch with `YOUTUBE_FAILED` on provider failures. `delay` is distinct from `wait`: it parses `duration` plus backend `unit`, caps runtime sleep at ten minutes, and returns `{ success, waitedMs, originalInput }` rather than passthrough input. Five-node gate passed: focused docs/FieldsTable tests 1009/1009, frontend production build, worker type-check, and worker build. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, pre-existing duplicate `google_sheets` key warning in `nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.
- Final Workflow batch findings: `execute_workflow` is now Complete and registered in the focused coverage test. It fetches the child workflow by `workflowId`, requires the child workflow to be confirmed or active, skips the child trigger, seeds `trigger`/`$json`/`json` with `input` or `inputData` or the current input, runs child nodes in topological order, stops on a Return node `__return`, and returns `{ success, result, workflowId }` or `{ success: false, error, workflowId? }`. Parent downstream fields must map child output from `{{$json.result.*}}`; child and downstream service nodes still need their own account connections. Final verification passed: focused docs/FieldsTable tests 1015/1015, frontend production build, worker type-check, and worker build. Known non-failing warnings remained: stale Browserslist/caniuse-lite data, pre-existing duplicate `google_sheets` key warning in `nodeGuides.ts`, `whatsapp_cloud` missing `intentCategories`, and AWS SDK v2 end-of-support.

**Next work**: all UI-visible nodes in the tracker are now Complete. Do not continue into non-UI-visible nodes unless the user explicitly changes scope. If another session continues this audit, first read this tracker in full, confirm there are no `Not Started` rows for nodes present in `ctrl_checks/src/components/workflow/nodeTypes.ts`, and use the completed coverage test registration plus the final verification counts as the source of truth. Current UI-visible remaining count is 0.

Do not commit.
Do not revert unrelated user changes.
Do not skip any node, field, operation, dropdown option, conditional field, input example, output example, or connection requirement.

Goal: audit and improve every node's "How to set" field guidance, node documentation, operation documentation, input/output examples, and connection UI guidance, one node at a time, until every node in the tracker is complete and coverage checks pass.

First action of any future session: run the focused frontend docs command once to confirm the final baseline is still 1015 passing before starting any new scope. Frontend build, worker type-check, and worker build passed after the final `execute_workflow` batch, so re-run them only if new work touches code or docs that can affect those checks.

There is no next UI-visible node to start. Re-verify `Complete` markings against the actual test file, not just the tracker table, if you have any doubt about a category this note claims is done.

**Process note on verification cadence** (explicit user decision partway through this audit, to reduce overhead): run the focused vitest + frontend build **after every 5 nodes** instead of after every single node. Small per-node test fixes (a description under the character minimum, a missing required phrase, a wording mismatch with a test's required substring) are still expected on nearly every node and must still be fixed as part of each batch's verification pass — batching the verification cadence does not mean skipping it or shipping unverified content. If a batch of edits touches a *shared* file (`node-content-overrides.ts`, `nodeUsageGuides.ts`, `nodeTypes.ts`, or the coverage test itself), be extra careful with syntax (a single unescaped apostrophe in a single-quoted string broke the whole file's compilation once earlier in this audit) since a mistake there breaks every node in the batch, not just one.

Standing process note: `ctrl_checks/src/docs-content/node-field-content.ts` (`NODE_FIELD_CONTENT`) was confirmed dead code earlier in this audit (zero imports anywhere in `ctrl_checks/src`; `FieldsTable.tsx` reads `field.helpText` from each node's `.doc.ts` directly). The user explicitly said to stop maintaining it for all remaining nodes — do NOT add, edit, or "complete" entries in that file for any node. All other files in the "Files To Audit And Update" list remain required.

Before editing each node:
1. Read `docs/NODE_FIELD_GUIDANCE_AND_DOCUMENTATION_AUDIT_PLAN.md`.
2. Check git status and do not revert unrelated user changes.
3. Build a field matrix from:
   - `worker/public/node-library.json`
   - `worker/src/services/nodes/node-library.ts`
   - runtime implementation/overrides for that node
   - `ctrl_checks/src/components/workflow/nodeTypes.ts`
   - `ctrl_checks/src/docs-content/nodes/<node>.doc.ts`
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
5. Update node docs, node usage guide, inline node guide, search docs, manifest, and node-content overrides where needed. Do not update `node-field-content.ts`; it is confirmed dead code and out of scope.
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
8. Run focused verification after each 5-node batch, or earlier if the batch touches especially risky shared code.
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
