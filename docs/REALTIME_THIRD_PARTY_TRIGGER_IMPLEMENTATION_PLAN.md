# Real-Time Third-Party Trigger Implementation Plan

Date: 2026-07-17
Repo: `C:\Users\user\Desktop\ctrlchecks-hostinger`

This document is the handoff for continuing the real-time trigger work after the Telegram implementation. It captures what was built for Telegram, the universal runtime fixes discovered from live testing, and the plan to add 20 production-ready third-party trigger nodes one by one.

## Goal

Build production-ready real-time trigger integrations so users can create workflows like:

```text
Third-party Trigger receives a real-time event
-> AI Agent or workflow nodes process the event
-> Action node replies, updates, creates, or sends data using the same context
```

Every trigger must work end to end on the live domain, not just in local debug mode.

## Telegram Work Completed

Telegram was implemented and live-tested as the first complete real-time trigger pattern.

Completed pieces:

- Added Telegram Trigger node in frontend node picker and backend registries.
- Added Telegram logo/icon mapping and node catalog presence.
- Added Telegram Bot Token connection support.
- Added UI guidance for BotFather setup.
- Added Telegram Trigger settings:
  - update types
  - allowed chat IDs
  - command filter
  - optional secret token
- Added Telegram webhook registration and unregister logic.
- Added live webhook endpoint:
  - `/api/telegram/webhook/:workflowId/:nodeId`
  - `/api/telegram/webhook/register`
  - `/api/telegram/webhook/unregister`
- Added Telegram webhook secret validation.
- Added Telegram update normalization:
  - `chatId`
  - `messageId`
  - `text`
  - `username`
  - `firstName`
  - `lastName`
  - `userId`
  - `updateType`
  - `raw`
- Added automatic webhook registration on active workflow save.
- Strengthened Telegram action node:
  - send message
  - send photo/media where supported
  - edit message where supported
  - uses saved Telegram connection by default
  - optional node-level bot token fallback
  - normalized output with `success`, `operation`, `chatId`, `messageId`, `data`, `raw`
- Verified manual Telegram Send Message works when `chatId` and message are provided.
- Verified real Telegram Trigger receives user message from live Telegram webhook.
- Verified final live issue was fixed: trigger-to-executor internal handoff now works.

Important live finding:

Telegram was receiving the update correctly, but the workflow did not run because `/api/execute-workflow` rejected the internal Telegram request with `401`. The trigger data was saved into execution input, but no node logs were written because the execution engine never started.

## Universal Runtime Fixes Already Added

These fixes are not Telegram-specific. They must be reused and rechecked while implementing every future trigger.

### 1. Execution DB Enum Normalization

File:

- `worker/src/core/execution/execution-db-enums.ts`

Problem found:

Production DB accepts only these values:

```text
execution.trigger: manual, webhook, schedule, form, chat
execution.status: pending, running, success, failed, cancelled, waiting
```

Provider-specific trigger names like `telegram` and runtime aliases like `queued` or `completed` can break DB writes.

Fix:

- Provider/event trigger names map to supported DB values.
- Examples:
  - `telegram` -> `webhook`
  - `whatsapp_trigger` -> `webhook`
  - `queued` -> `pending`
  - `completed` -> `success`
  - `approval` pause -> valid `waiting` status with valid trigger fallback

When adding any trigger, never write raw provider trigger names directly to `executions.trigger`.

### 2. Universal Internal Trigger Handoff

File:

- `worker/src/core/execution/internal-execution-auth.ts`

Problem found:

Internal trigger calls to `/api/execute-workflow` were hardcoded for only some trigger types. Telegram used `X-Internal-Telegram-Execution`, but the auth middleware did not know that header, so it returned `401`.

Fix:

The executor now recognizes:

```text
x-internal-<provider>-execution: true
```

Examples:

- `x-internal-telegram-execution`
- `x-internal-whatsapp-execution`
- `x-internal-instagram-execution`
- `x-internal-slack-execution`

The bypass requires a pre-created `executionId`, so external users cannot bypass auth by setting a header alone.

When adding any trigger:

- create execution first
- call `/api/execute-workflow` with `executionId`
- send `X-Internal-<Provider>-Execution: true`
- also send `X-Internal-Trigger-Execution: true` as a generic fallback
- if the handoff fails, update the execution to `failed` with the real error

### 3. Trigger Output Contract

Every trigger must output clean top-level fields, not only raw provider JSON.

Required baseline:

```json
{
  "eventId": "...",
  "eventType": "...",
  "source": "...",
  "userId": "...",
  "username": "...",
  "text": "...",
  "timestamp": "...",
  "raw": {}
}
```

Provider-specific additions are allowed, but common fields must stay predictable so AI Agent and downstream nodes can use `{{$json.fieldName}}`.

### 4. Trigger Execution Handoff Contract

Every real-time trigger should follow this backend shape:

1. Receive provider webhook.
2. Validate provider signature/secret if available.
3. Load workflow and trigger node.
4. Check workflow is active.
5. Check trigger node filters.
6. Normalize provider payload.
7. Create execution row with normalized DB enum values.
8. Call `/api/execute-workflow` internally using the new internal trigger auth pattern.
9. Return fast success response to provider.
10. If handoff fails, mark execution `failed`.

### 5. UI Contract

Every trigger must have:

- node picker entry
- correct logo
- docs link
- connection selector
- setup helper text
- provider-specific settings
- clear empty states
- AI builder hints for phrases like "when someone messages my bot" or "when a new issue is created"

### 6. Credential Contract

Every trigger must use the saved connection system.

Rules:

- no plaintext credentials outside the existing credential system
- add connector catalog entry when missing
- add credential type when missing
- add test connection endpoint/check
- document token/scopes/permissions clearly
- node-level token/API key may exist only as fallback where the product already supports it

### 7. Tests Required For Every Trigger

Minimum focused tests:

- node catalog presence
- logo/provider mapping
- frontend node fields
- connector credential registry
- backend registry/operation contract
- webhook payload normalization
- signature or secret validation
- execution creation enum normalization
- internal handoff header recognition
- action request formation where relevant

Minimum commands:

```bash
cd worker
npm run type-check
npx jest <focused trigger tests> --runInBand --no-coverage

cd ../ctrl_checks
npm test -- <focused frontend tests>
npm run build
```

Deploy verification:

```bash
bash scripts/deploy-worker.sh
curl -fsS https://worker.ctrlchecks.ai/health/live
```

## 20 Real-Time Triggers To Implement

Implement one trigger at a time. Do not mix many providers in one large change unless the shared infrastructure requires it.

| Order | Trigger | Main Event Examples | Auth Type | Webhook Caveat |
| --- | --- | --- | --- | --- |
| 1 | WhatsApp Cloud Trigger | incoming message, media message, status update | Meta access token + phone number ID | verify token and Meta signature |
| 2 | Instagram Trigger | DM, comment, mention | Meta OAuth/access token | Meta app review may be required |
| 3 | Facebook Page/Messenger Trigger | page message, comment, leadgen | Meta OAuth/page token | verify token and app secret proof |
| 4 | Slack Trigger | app mention, channel message, slash command | Slack OAuth/Bot token | signature validation required |
| 5 | Discord Trigger | message, slash command, interaction | Bot token/public key | interactions require fast response |
| 6 | Microsoft Teams Trigger | channel message, personal message | Microsoft OAuth/Bot Framework | bot registration required |
| 7 | Gmail Trigger | new email, label change | Google OAuth | Pub/Sub watch expiration must renew |
| 8 | Outlook Trigger | new email, calendar invite | Microsoft Graph OAuth | subscription expiration must renew |
| 9 | Google Calendar Trigger | event created/updated/cancelled | Google OAuth | channel expiration must renew |
| 10 | Google Sheets Trigger | row added/updated | Google OAuth | native push is limited; may need polling fallback |
| 11 | Google Drive Trigger | file created/updated | Google OAuth | channel expiration must renew |
| 12 | Typeform Trigger | new form response | Typeform token/OAuth | webhook per form |
| 13 | Tally Trigger | new form submission | Tally API key/webhook secret | webhook per form |
| 14 | GitHub Trigger | push, issue, PR, release | GitHub App/OAuth/PAT | HMAC signature required |
| 15 | GitLab Trigger | push, issue, merge request | GitLab token | secret token validation |
| 16 | Jira Trigger | issue created/updated/commented | Atlassian OAuth/API token | webhook URL per site/project |
| 17 | Trello Trigger | card created/updated/moved | Trello key/token | webhook callback validation |
| 18 | Linear Trigger | issue created/updated/commented | Linear API key/OAuth | signature validation if available |
| 19 | Stripe Trigger | payment succeeded, checkout completed, subscription updated | Stripe secret key + webhook secret | signature validation required |
| 20 | Shopify Trigger | order created, order paid, customer created | Shopify OAuth/admin token | HMAC validation required |

## Implementation Progress

Completed so far:

- 1. Telegram Trigger - complete and live-tested.
- 2. WhatsApp Cloud Trigger - complete.
- 3. Instagram Trigger - complete and deployed.
- 4. Facebook Page/Messenger Trigger - complete and deployed.
- 5. Slack Trigger - complete in this run.
- 6. Discord Trigger - complete in this run.
- 7. Microsoft Teams Trigger - already implemented in the working tree, audited and verified in this run, then deployed.
- 8. Gmail Trigger - implemented from scratch in this run and deployed.
- 9. Outlook Trigger - implemented from scratch in this run and deployed.
- 10. Google Calendar Trigger - implemented from scratch in this run and deployed.
- 11. Google Sheets Trigger - implemented from scratch in this run (polling-based) and deployed.
- 12. Google Drive Trigger - implemented from scratch in this run and deployed.
- 13. Typeform Trigger - implemented from scratch in this run and deployed.
- 14. Tally Trigger - implemented from scratch in this run and deployed.
- 15. GitHub Trigger - implemented from scratch in this run and deployed.
- 16. GitLab Trigger - implemented from scratch in this run and deployed.
- 17. Jira Trigger - implemented from scratch in this run and deployed.
- 18. Trello Trigger - implemented from scratch in this run and deployed.
- 19. Linear Trigger - implemented from scratch in this run and deployed.
- 20. Stripe Trigger - implemented from scratch in this run and deployed.
- 21. Shopify Trigger - implemented from scratch in this run and deployed.

### Slack Trigger Implementation Notes

Completed on 2026-07-17:

- Added production Slack webhook endpoints:
  - `GET /api/slack/webhook/:workflowId/:nodeId`
  - `POST /api/slack/webhook/:workflowId/:nodeId`
  - `POST /api/slack/webhook/register`
  - `POST /api/slack/webhook/unregister`
- Added Slack signature validation using `X-Slack-Signature`, `X-Slack-Request-Timestamp`, raw request bodies, HMAC SHA-256, and a 5-minute replay window.
- Added Slack URL verification challenge support for Events API setup.
- Added real-time event normalization for:
  - `app_mention`
  - `message`
  - `slash_command`
  - `interaction` / `block_actions` / shortcuts / view submissions
- Normalized Slack trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `teamId`, `enterpriseId`, `channelId`, `channelName`, `chatId`, `threadTs`, `messageTs`, `command`, `triggerId`, `responseUrl`, `callbackId`, `actionId`, `interactionType`, and `raw`.
- Execution creation uses `normalizeExecutionTrigger('slack', 'webhook')` and `normalizeExecutionStatus(...)`.
- Internal handoff uses both `X-Internal-Slack-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed` with the real error, avoiding stuck `running` executions.
- Added saved Slack OAuth connection support for trigger registration and signing secret storage, with `SLACK_SIGNING_SECRET` as worker fallback.
- Expanded Slack connector capabilities/scopes for receive events, slash commands, interactions, and reply actions.
- Added active-workflow auto-registration path. Slack still requires manual Slack app dashboard callback setup, so registration returns the exact webhook URL and `manualSetupRequired: true`.
- Added Slack Message `threadTs` support so workflows can reply to the same Slack channel/thread using `{{$json.channelId}}` and `{{$json.threadTs}}`.
- Added backend registry override, node library schema, output schema, frontend node picker/settings/logo mapping, docs/search entries, AI selection hints, and focused tests.

Verification completed:

- `cd worker && npm run type-check`
- `cd worker && npx jest src/services/slack/slack-trigger-service.test.ts src/core/registry/__tests__/slack-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles`
- `cd worker && npm run lint`
- `cd worker && npm run build`
- `cd ctrl_checks && npm test -- src/components/workflow/__tests__/slack-trigger-node-types.test.ts`
- `cd ctrl_checks && npm run build`

### Discord Trigger Implementation Notes

Completed on 2026-07-17:

- Added production Discord webhook endpoints:
  - `GET /api/discord/webhook/:workflowId/:nodeId`
  - `POST /api/discord/webhook/:workflowId/:nodeId`
  - `POST /api/discord/webhook/register`
  - `POST /api/discord/webhook/unregister`
- Added Discord Ed25519 request signature validation using `X-Signature-Ed25519`, `X-Signature-Timestamp`, raw request bodies, the Discord application public key, and a 5-minute replay window.
- Added Discord Interaction PING handling with `{ "type": 1 }` and Discord Webhook Events PING handling with `204`.
- Added real-time event normalization for:
  - slash commands / application commands
  - component interactions
  - modal submissions / autocomplete interactions
  - Discord Webhook Events
  - message-shaped `MESSAGE_CREATE` payloads for supported HTTP event delivery or future gateway adapters
- Normalized Discord trigger output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `applicationId`, `guildId`, `channelId`, `threadId`, `chatId`, `messageId`, `command`, `customId`, `interactionId`, `interactionToken`, `interactionType`, `responseUrl`, `rawEventType`, and `raw`.
- Execution creation uses `normalizeExecutionTrigger('discord', 'webhook')` and `normalizeExecutionStatus(...)`.
- Internal handoff uses both `X-Internal-Discord-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed` with the real error, avoiding stuck `running` executions.
- Added saved Discord Bot Token connection support for trigger registration, public key storage, and application ID storage, with `DISCORD_PUBLIC_KEY` as worker fallback.
- Expanded Discord connector capabilities for receive events, slash commands, interactions, trigger webhooks, and reply actions.
- Added active-workflow auto-registration path. Discord still requires manual Developer Portal endpoint configuration, so registration returns the exact webhook URL and `manualSetupRequired: true`.
- Added Discord action support for interaction follow-up replies using `{{$json.interactionToken}}` and `{{$json.applicationId}}`, plus same-channel bot replies using `{{$json.channelId}}` and optional `{{$json.messageId}}`.
- Added backend registry override, node library schema, output schema, frontend node picker/settings/logo mapping, docs/search entries, AI selection hints, and focused tests.

Verification completed:

- `cd worker && npm run type-check`
- `cd worker && npx jest src/services/discord/discord-trigger-service.test.ts src/core/registry/__tests__/discord-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles`
- `cd worker && npm run lint`
- `cd worker && npm run build`
- `cd ctrl_checks && npm test -- src/components/workflow/__tests__/discord-trigger-node-types.test.ts`
- `cd ctrl_checks && npm run build`

### Microsoft Teams Trigger Implementation Notes

Audited on 2026-07-17. All pieces already existed in the working tree (uncommitted, untracked); this run verified, tested, and deployed them rather than reimplementing:

- Backend webhook endpoints already present:
  - `GET/POST /api/microsoft-teams/webhook/:workflowId/:nodeId`
  - `POST /api/microsoft-teams/webhook/register`
  - `POST /api/microsoft-teams/webhook/unregister`
- Bot Framework request validation via RS256 JWT verification against the live Bot Framework OpenID/JWKS endpoint (issuer + audience + exp/nbf checks), with an optional shared-secret fallback (`x-ms-teams-secret` / `x-teams-secret` / `x-ctrlchecks-teams-secret` / `?secret=`) for simulation/testing. `validateJwt: false` allowed for explicit opt-out.
- Activity normalization covers `message`, `conversationUpdate`, `messageReaction`, `invoke`, `installationUpdate`, mapped to `message`, `conversation_update`, `message_reaction`, `invoke`, `installation_update`.
- Normalized output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `tenantId`, `teamId`, `channelId`, `chatId`, `conversationId`, `serviceUrl`, `activityId`, `replyToId`, `locale`, `channelData`, `raw`.
- Event filtering supports `eventTypes`, `tenantId`, `teamIds`, `channelIds`, `allowedUserIds`.
- Execution creation uses `normalizeExecutionTrigger('microsoft_teams', 'webhook')` and `normalizeExecutionStatus(...)`, with `metadata.originalTrigger = 'microsoft_teams'`.
- Internal handoff sends `X-Internal-Microsoft-Teams-Execution: true`, `X-Internal-Teams-Execution: true`, and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed` with the real error, avoiding stuck `running` executions.
- Saved Microsoft Teams Bot connection (`microsoft_teams_bot` credential type) stores `appId`/`clientId`, `appPassword`/`clientSecret`, and an optional `validationSecret`, resolved via `connectionService.findCanonicalConnection`.
- Auto-registration on active workflow save is wired through `worker/src/api/db-proxy.ts` calling `autoRegisterMicrosoftTeamsWebhooksForWorkflow`. Registration always returns `manualSetupRequired: true` since Teams/Bot Framework endpoints are configured manually in Azure, not via a provider API call.
- Microsoft Teams action node (`microsoft_teams`) supports both incoming-webhook channel posts and same-conversation Bot Framework replies using `{{$json.serviceUrl}}`, `{{$json.conversationId}}`, and `{{$json.replyToId}}` from the trigger output.
- Frontend node picker entry, settings fields, logo mapping (`Microsoft-Teams.svg`), docs page, search index entry, and AI usage guide were all already present and correct.
- Connector registry (`microsoft_teams_bot`) and credential type registry entries confirmed present with correct `nodeTypes` associations.

Verification completed in this run:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/microsoft-teams/microsoft-teams-trigger-service.test.ts src/core/registry/__tests__/microsoft-teams-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 17 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/microsoft-teams-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

No code changes were required for Microsoft Teams; this trigger only needed audit, verification, and a production deploy since the implementation was sitting uncommitted/untested in the working tree.

### Gmail Trigger Implementation Notes

Completed on 2026-07-17. Unlike Slack/Discord/Teams, Gmail had **no** existing trigger implementation â€” only the `google_gmail` send/list/get/search action node existed. Built from scratch, reusing the existing shared Google OAuth connection (`google_oauth2` credential type, already includes `gmail.readonly`/`gmail.send` scopes) rather than adding a new credential type:

- New files:
  - `worker/src/services/gmail/gmail-trigger-service.ts` â€” Gmail history normalization, Pub/Sub push envelope decoding, Google-signed OIDC push-token validation (RS256 against `https://www.googleapis.com/oauth2/v3/certs`), `users.watch`/`users.stop` registration, Redis-backed watch-state (historyId/expiration/topic) persistence, auto-registration, and a 6-hourly renewal sweep (Gmail watches expire after 7 days).
  - `worker/src/api/gmail-trigger.ts` â€” webhook info/receive/register/unregister handlers.
  - `worker/src/core/registry/overrides/gmail-trigger.ts` â€” registry override for the `gmail_trigger` node type.
  - Tests: `worker/src/services/gmail/gmail-trigger-service.test.ts` (19 assertions across normalization/filtering/validation/registration), `worker/src/core/registry/__tests__/gmail-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/gmail-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/gmail_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/gmail_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/gmail/webhook/:workflowId/:nodeId`
  - `POST /api/gmail/webhook/register` / `POST /api/gmail/webhook/unregister`
- Because Gmail push delivery only tells you a mailbox changed (not what changed), the webhook handler diffs Gmail's `users.history.list` from the last stored `historyId` to build normalized events, then advances the stored `historyId` â€” it does not trust the notification payload's `historyId` as gospel to avoid replaying/missing messages across concurrent pushes.
- Normalized output includes `eventId`, `eventType` (`message_added`/`label_added`/`label_removed`/`message_deleted`), `source`, `userId`, `username`, `text`, `timestamp`, `emailAddress`, `historyId`, `messageId`, `threadId`, `subject`, `from`, `to`, `snippet`, `labelIds`, `raw`.
- Filtering supports `eventTypes`, `labelIds`, and a free-text `query` matched against subject/from/snippet.
- Execution creation uses `normalizeExecutionTrigger('gmail', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'gmail'`.
- Internal handoff sends `X-Internal-Gmail-Execution: true` and `X-Internal-Trigger-Execution: true` â€” no changes needed to `internal-execution-auth.ts`, it was already fully generic (`x-internal-<provider>-execution`).
- Handoff failures mark the pre-created execution `failed` with the real error.
- **Manual setup is heavier than other triggers**: the user must create a Google Cloud Pub/Sub topic, grant the `Pub/Sub Publisher` role on it to `gmail-api-push@system.gserviceaccount.com`, and create a push subscription pointing at the generated webhook URL â€” none of that is an API call CtrlChecks can make on the user's behalf, so `manualSetupRequired: true` is always returned (consistent with Slack/Discord/Teams "provider dashboard" patterns, just with GCP as the dashboard).
- Watch state (historyId, expiration, topic, labelIds) is stored in Redis (`gmail:watch:{workflowId}:{nodeId}`, 9-day TTL) rather than a new DB table/migration, per the "no migrations unless truly needed" rule. If Redis is unavailable, registration/renewal still succeed against the Gmail API but the historyId diffing baseline cannot persist, so the first push after a restart safely re-seeds instead of replaying history.
- Auto-registration on active workflow save is wired through `worker/src/api/db-proxy.ts` calling `autoRegisterGmailWatchesForWorkflow`, alongside the existing Telegram/WhatsApp/Instagram/Facebook/Slack/Discord/Teams hooks. Missing `pubsubTopic` on a node produces a clear per-node error instead of failing the whole save.
- Renewal: `startGmailWatchRenewalScheduler()` (node-cron, every 6 hours) re-registers any Gmail watch expiring within 2 days, started from `worker/src/index.ts` alongside the existing scheduler/timeout-watchdog startup block.
- Registry: `gmail_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`google_oauth2`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGmailTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `google_gmail` connector (no new credential type registry entry needed since Google OAuth is already shared/generic), and `NODE_PROVIDER`/`NODE_REQUIRED_SCOPES` entries added to `credential-scope-registry.ts`.
- Frontend: node picker entry (category `triggers`, icon `Mail`) with `pubsubTopic`/`eventTypes`/`labelIds`/`query`/`validateAuth`/`audience`/`validationSecret` fields and a usage guide, logo mapping reusing `Gmail.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.
- The pre-existing `'gmail_trigger'` literal already scattered across ~6 "known trigger type" validation allowlists (found during audit) required no changes â€” it was forward-scaffolding that this implementation now backs with a real node.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/gmail/gmail-trigger-service.test.ts src/core/registry/__tests__/gmail-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 19 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed (164 node schemas exported, up from 163).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/gmail-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real Gmail mailbox + GCP Pub/Sub topic (no live Google Cloud project credentials available in this session). Manual live test steps for a future pass:

1. Connect Google (Gmail) in Connections.
2. In Google Cloud Console, create a Pub/Sub topic and grant `roles/pubsub.publisher` on it to `gmail-api-push@system.gserviceaccount.com`.
3. Create a push subscription on that topic targeting `https://worker.ctrlchecks.ai/api/gmail/webhook/{workflowId}/{nodeId}` (OIDC auth recommended).
4. Add a Gmail Trigger node to a workflow, set the Pub/Sub topic, save/activate the workflow to trigger auto-registration (or call `/api/gmail/webhook/register` directly).
5. Send a test email to the watched mailbox and confirm an execution appears with normalized `$json` fields, and that a downstream Gmail action node can reply using `{{$json.threadId}}`.

### Outlook Trigger Implementation Notes

Completed on 2026-07-17. Like Gmail, Outlook had **no** existing trigger implementation â€” only the `outlook` send-email action node existed, using the shared `microsoft_oauth2` credential with only `Mail.Send`/`User.Read` scopes (no read scopes at all). Built from scratch:

- **Scope expansion required**: added `https://graph.microsoft.com/Mail.Read` and `https://graph.microsoft.com/Calendars.Read` to the `microsoft_oauth2` credential type (`worker/src/credentials-system/credential-type-registry.ts`), the `microsoft` provider scope list (`worker/src/services/credential-scope-registry.ts`), and the `outlook_oauth` connector's `credentialContract.scopes` (`worker/src/services/connectors/connector-registry.ts`). Existing users who connected Microsoft before this change will need to reconnect to grant the new scopes before the trigger can read their mailbox/calendar â€” this is called out in the trigger's docs common-errors section.
- New files:
  - `worker/src/services/outlook/outlook-trigger-service.ts` â€” Microsoft Graph subscription create/renew/delete, change-notification normalization, `clientState` validation (a per-node secret, not a signature scheme â€” simpler than Gmail/Teams since Graph's own subscription model already scopes notifications to a specific subscription), resource fetch (mail message or calendar event) via Graph, and a 6-hourly renewal sweep (Graph subscriptions expire after ~2.9 days, the max for these resource types).
  - `worker/src/api/outlook-trigger.ts` â€” webhook handler (including the Graph validation handshake, answered before any DB access), info/register/unregister handlers.
  - `worker/src/core/registry/overrides/outlook-trigger.ts` â€” registry override for the `outlook_trigger` node type.
  - Tests: `worker/src/services/outlook/outlook-trigger-service.test.ts` (18 assertions), `worker/src/core/registry/__tests__/outlook-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/outlook-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/outlook_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/outlook_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/outlook/webhook/:workflowId/:nodeId`
  - `POST /api/outlook/webhook/register` / `POST /api/outlook/webhook/unregister`
- **Unlike Gmail, no manual cloud-console setup is needed.** Microsoft Graph subscriptions are created directly via a Graph API call (`POST /subscriptions`) using the same Microsoft app the user already OAuth-connects through â€” there is no GCP-Pub/Sub-style external topic/subscription the user has to wire up by hand. `registerOutlookSubscription` both creates new subscriptions and (if one already exists for that node) renews the existing one via `PATCH`, falling back to creating a fresh one if the stored subscription no longer exists on Graph.
- The Graph validation handshake (`?validationToken=...` on the same webhook URL) is answered as the very first line of the handler, before touching the database, since Graph requires a fast plain-text echo to accept a new/renewed subscription.
- Change notifications only carry a `resourceId` pointer, not the changed content, so the handler fetches the full message (`/me/messages/{id}`) or event (`/me/events/{id}`) via Graph after validating `clientState`, then normalizes it.
- Normalized output includes `eventId`, `eventType` (`message_created`/`event_created`/`event_updated`/`event_deleted`), `source`, `userId`, `username`, `text`, `timestamp`, `resourceId`, `subject`, `from`, `to`, `snippet`, `conversationId`, `start`, `end`, `attendees`, `raw`.
- Execution creation uses `normalizeExecutionTrigger('outlook', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'outlook'`.
- Internal handoff sends `X-Internal-Outlook-Execution: true` and `X-Internal-Trigger-Execution: true` â€” again no changes needed to the already-generic `internal-execution-auth.ts`.
- Handoff failures mark the pre-created execution `failed` with the real error. The webhook itself acks Graph with `202` immediately (before processing) since Graph enforces a ~10-second response window and will back off / eventually delete the subscription on repeated timeouts; execution creation and the internal handoff happen after that ack.
- Subscription state (subscriptionId, clientState, resource, expiration) is stored in Redis (`outlook:sub:{workflowId}:{nodeId}`), not a new DB table, consistent with the Gmail pattern and the "no migrations unless truly needed" rule.
- Auto-registration on active workflow save is wired through `worker/src/api/db-proxy.ts` calling `autoRegisterOutlookSubscriptionsForWorkflow`, alongside all the existing trigger hooks.
- Renewal: `startOutlookSubscriptionRenewalScheduler()` (node-cron, every 6 hours) re-registers any subscription expiring within 24 hours, started from `worker/src/index.ts`.
- Registry: `outlook_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`microsoft_oauth2`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createOutlookTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `outlook_oauth` connector.
- Unlike Gmail (where `gmail_trigger` was already pre-scaffolded in every "known trigger types" allowlist), `outlook_trigger` was **not** present in any of them â€” added it to `worker/src/core/execution/unified-execution-engine.ts`, `worker/src/core/utils/workflow-graph-normalizer.ts`, `worker/src/core/validation/workflow-save-validator.ts`, `ctrl_checks/src/lib/comprehensiveWorkflowValidation.ts`, `ctrl_checks/src/lib/workflowGraphValidator.ts` (both occurrences), and `services/workflow-crud-service/src/lib/workflow-validator-lite.ts` (which was also still missing `microsoft_teams_trigger` from an earlier trigger â€” added both while there).
- Frontend: node picker entry (category `triggers`, icon `Mail`) with `resource`/`changeTypes`/`folderName`/`query` fields and a usage guide, logo mapping reusing `Outlook.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/outlook/outlook-trigger-service.test.ts src/core/registry/__tests__/outlook-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 18 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/outlook-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` â€” 62 tests passed (sanity check that editing the shared "known trigger types" allowlists didn't break existing validator tests).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real Outlook mailbox (no live Microsoft 365 test tenant available in this session). Manual live test steps for a future pass:

1. Reconnect Microsoft (Outlook) in Connections (existing connections need the new Mail.Read/Calendars.Read scopes).
2. Add an Outlook Trigger node to a workflow, choose Mail or Calendar, and save/activate the workflow â€” this auto-creates the Graph subscription and answers the validation handshake.
3. Send a test email to the watched mailbox (or create/update a calendar event) and confirm an execution appears with normalized `$json` fields.
4. Confirm a downstream Outlook action node can reply using `{{$json.from}}` / `{{$json.conversationId}}`.
5. Wait past the subscription's `expirationDateTime` (or force a run of `renewExpiringOutlookSubscriptions`) and confirm the subscription renews without dropping events.

### Google Calendar Trigger Implementation Notes

Completed on 2026-07-17. Had no existing trigger implementation â€” only the `google_calendar` CRUD action node existed. Built from scratch, closely mirroring the Gmail pattern (both are Google push-notification "channels" that only signal *something changed*, requiring an incremental sync call to fetch what actually changed) rather than the simpler Outlook model (where the notification already carries a resource pointer):

- New files:
  - `worker/src/services/google-calendar/google-calendar-trigger-service.ts` â€” channel create/renew/stop via `events.watch`/`channels.stop`, `X-Goog-*` header validation (channelId + a generated channelToken, analogous to Outlook's clientState), incremental sync via `events.list?syncToken=...` with automatic reseed on `410 Gone` (expired sync token), and a 6-hourly renewal sweep (channels requested with a 7-day expiration).
  - `worker/src/api/google-calendar-trigger.ts` â€” webhook handler (acks fast, ignores the initial `sync` handshake state, then processes `exists`/`not_exists` notifications), info/register/unregister handlers.
  - `worker/src/core/registry/overrides/google-calendar-trigger.ts` â€” registry override for `google_calendar_trigger`.
  - Tests: `worker/src/services/google-calendar/google-calendar-trigger-service.test.ts` (17 assertions), `worker/src/core/registry/__tests__/google-calendar-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/google-calendar-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/google_calendar_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/google_calendar_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/google-calendar/webhook/:workflowId/:nodeId`
  - `POST /api/google-calendar/webhook/register` / `POST /api/google-calendar/webhook/unregister`
- **No manual cloud-console setup needed** â€” like Outlook (and unlike Gmail's GCP Pub/Sub requirement), `events.watch` is a direct Calendar API call using the same Google app the user already OAuth-connects through.
- Registration flow: create the channel via `events.watch`, then immediately call `events.list` (no syncToken) purely to obtain a baseline `nextSyncToken` â€” Calendar's watch response does not itself return a sync token, so this seed call is required before any incremental diffing can happen.
- Change-type classification is necessarily coarse: Calendar's incremental sync does not distinguish "created" from "updated" the way some APIs do, so events are normalized as `event_changed` (status `confirmed`/`tentative`) or `event_cancelled` (status `cancelled`) â€” documented as a limitation in the trigger's config description rather than papered over.
- Normalized output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `calendarId`, `eventIdRaw`, `subject`, `organizer`, `start`, `end`, `attendees`, `htmlLink`, `raw`.
- Execution creation uses `normalizeExecutionTrigger('google_calendar', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'google_calendar'`.
- Internal handoff sends `X-Internal-Google-Calendar-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed`. The webhook itself acks Google with `200` immediately (mirroring the Outlook approach) before doing the sync-token fetch and execution creation, since Google also expects a fast response and will retry/back off otherwise.
- Watch state (channelId, resourceId, channelToken, calendarId, syncToken, expiration) is stored in Redis (`gcal:channel:{workflowId}:{nodeId}`), consistent with Gmail/Outlook and the "no migrations unless truly needed" rule.
- Auto-registration on active workflow save is wired through `worker/src/api/db-proxy.ts` calling `autoRegisterGoogleCalendarWatchesForWorkflow`.
- Renewal: `startGoogleCalendarWatchRenewalScheduler()` (node-cron, every 6 hours) re-registers any channel expiring within 2 days, started from `worker/src/index.ts`.
- Registry: `google_calendar_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`google_oauth2`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGoogleCalendarTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `google_calendar` connector (scopes were already broad enough â€” no scope changes needed, unlike Outlook).
- Like Outlook, `google_calendar_trigger` was **not** pre-scaffolded in any "known trigger types" allowlist â€” added it to all 6 files: `unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` (both occurrences), and `workflow-validator-lite.ts`.
- Frontend: node picker entry (category `triggers`, icon `Calendar`) with `calendarId`/`eventTypes`/`query` fields and a usage guide, logo mapping reusing `Google-Calender.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/google-calendar/google-calendar-trigger-service.test.ts src/core/registry/__tests__/google-calendar-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 17 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/google-calendar-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real Google Calendar (no live Google test account available in this session). Manual live test steps for a future pass:

1. Connect Google (Calendar) in Connections.
2. Add a Google Calendar Trigger node to a workflow, pick the calendar (default `primary`), and save/activate the workflow â€” this auto-creates the watch channel and seeds a sync token.
3. Create, update, and cancel a test event on the watched calendar and confirm an execution appears for each with normalized `$json` fields.
4. Confirm a downstream node can use `{{$json.subject}}` / `{{$json.attendees}}`.
5. Wait past the channel's `expiration` (or force a run of `renewExpiringGoogleCalendarWatches`) and confirm the channel renews without dropping events.

### Google Sheets Trigger Implementation Notes

Completed on 2026-07-18. This trigger intentionally deviates from the webhook pattern used by every other trigger so far, because **Google Sheets has no push-notification API for cell-level changes** (unlike Gmail/Calendar/Drive, which support watch channels on the file/mailbox as a whole, or Outlook's Graph subscriptions). The plan doc's own caveat for this row ("native push is limited; may need polling fallback") is exactly what was built:

- New files:
  - `worker/src/services/google-sheets/google-sheets-trigger-service.ts` â€” polling core: fetches sheet values via the Sheets API, hashes each row (`sha1` of the row's JSON) to detect edits, compares row count to detect appended rows, and directly creates executions + does the internal handoff itself (there is no inbound request to handle, so the execution-creation logic that lives in an `api/*-trigger.ts` webhook handler for every other trigger lives in the service file here instead).
  - `worker/src/api/google-sheets-trigger.ts` â€” authenticated info/register/unregister endpoints only. **No public webhook route** â€” there is nothing for a provider to call.
  - `worker/src/core/registry/overrides/google-sheets-trigger.ts` â€” registry override for `google_sheets_trigger`.
  - Tests: `worker/src/services/google-sheets/google-sheets-trigger-service.test.ts` (18 assertions), `worker/src/core/registry/__tests__/google-sheets-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/google-sheets-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/google_sheets_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/google_sheets_trigger.ts`.
- Endpoints (all authenticated, none public):
  - `GET /api/google-sheets/polling/:workflowId/:nodeId` â€” baseline/status info.
  - `POST /api/google-sheets/polling/register` / `POST /api/google-sheets/polling/unregister`.
- **Registration is idempotent by design**: unlike Gmail/Outlook/Calendar (where re-registering renews a channel), calling register again for an already-baselined node is a no-op that returns the existing row count. This matters because `autoRegisterGoogleSheetsPollingForWorkflow` runs on every active-workflow save (same hook point as the other triggers) â€” if it reset the baseline each time, every save would silently swallow rows that arrived between saves.
- Row-change detection: on each poll, rows at an index `>= storedRowCount` are `row_added`; rows below that whose content hash differs from the previously stored hash are `row_updated`. Row hashes are capped at 5,000 tracked rows to bound memory for very large sheets â€” rows beyond that cap are only checked for the row-count-based `row_added` case, not update-diffing.
- Normalized output includes `eventId`, `eventType` (`row_added`/`row_updated`), `source`, `timestamp`, `spreadsheetId`, `sheetName`, `rowNumber`, `values` (raw array), `row` (keyed by header-row column names when `hasHeaderRow` is true), `raw`.
- Execution creation uses `normalizeExecutionTrigger('google_sheets', 'webhook')` and `normalizeExecutionStatus(...)` â€” reusing the `webhook` DB enum bucket even though delivery is poll-driven, consistent with how the enum normalizer already treats all trigger-originated executions.
- Internal handoff sends `X-Internal-Google-Sheets-Execution: true` and `X-Internal-Trigger-Execution: true` from inside the poll sweep (there's no Express `req`/`res` at that point, so the fetch-to-execute-workflow call happens directly in `pollAllGoogleSheetsTriggers`).
- Handoff failures mark the execution `failed` with the real error, same as every push-based trigger.
- Poll state (row count + per-row hashes, spreadsheet ID, sheet name) is stored in Redis (`gsheet:poll:{workflowId}:{nodeId}`), not a new DB table.
- Scheduling: `startGoogleSheetsPollingScheduler()` (node-cron, every 2 minutes) runs `pollAllGoogleSheetsTriggers()`, which scans all active workflows with a `google_sheets_trigger` node, diffs each watched sheet, and fires executions for accepted changes â€” started from `worker/src/index.ts` alongside the other trigger schedulers.
- Registry: `google_sheets_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`google_oauth2`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGoogleSheetsTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `google_sheets` connector (scopes already sufficient â€” `spreadsheets.readonly` was already granted).
- `google_sheets_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists (`unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` both occurrences, `workflow-validator-lite.ts`).
- Frontend: node picker entry (category `triggers`, icon `Table`) with `spreadsheetId`/`sheetName`/`hasHeaderRow`/`eventTypes`/`query` fields and a usage guide that explicitly tells the user this is poll-based (~2 minutes), logo mapping reusing `Google-Sheets.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/google-sheets/google-sheets-trigger-service.test.ts src/core/registry/__tests__/google-sheets-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 18 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/google-sheets-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real spreadsheet. Manual live test steps for a future pass:

1. Connect Google (Sheets) in Connections.
2. Add a Google Sheets Trigger node to a workflow, paste a real spreadsheet ID, and save/activate the workflow â€” this captures the baseline row count.
3. Add a new row to the sheet, wait up to ~2 minutes, and confirm an execution appears with normalized `$json.row` fields.
4. Edit an existing row's cell value with `eventTypes` including `row_updated` and confirm a second execution fires for that row only.
5. Confirm large sheets (thousands of rows) don't cause excessive latency or memory growth in the poll sweep.

### Google Drive Trigger Implementation Notes

Completed on 2026-07-18. Built from scratch, using the exact same push-notification-channel mechanism as Google Calendar (`X-Goog-Channel-Id`/`X-Goog-Resource-State`/`X-Goog-Channel-Token` headers, `channels.stop` teardown), but Drive's incremental sync uses `startPageToken` + `changes.list` instead of Calendar's `syncToken` + `events.list` â€” architecturally almost identical, just different Google API resource:

- New files:
  - `worker/src/services/google-drive/google-drive-trigger-service.ts` â€” channel create/renew/stop via `changes.watch`/`channels.stop`, header validation, incremental sync via `changes.list?pageToken=...` with automatic reseed on `404` (expired page token), optional client-side folder filtering (Drive's `changes.watch` watches the whole Drive â€” there's no API-level way to scope a push channel to one folder, so `folderId` is applied as a filter against each changed file's `parents` array after fetching), and a 6-hourly renewal sweep (7-day channel expiration).
  - `worker/src/api/google-drive-trigger.ts` â€” webhook handler (acks fast, ignores the initial `sync` state), info/register/unregister handlers.
  - `worker/src/core/registry/overrides/google-drive-trigger.ts` â€” registry override for `google_drive_trigger`.
  - Tests: `worker/src/services/google-drive/google-drive-trigger-service.test.ts` (17 assertions), `worker/src/core/registry/__tests__/google-drive-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/google-drive-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/google_drive_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/google_drive_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/google-drive/webhook/:workflowId/:nodeId`
  - `POST /api/google-drive/webhook/register` / `POST /api/google-drive/webhook/unregister`
- No manual cloud-console setup needed â€” same as Calendar, `changes.watch` is a direct Drive API call using the existing Google app.
- Registration flow: call `changes/startPageToken` to get a baseline page token, then `changes.watch?pageToken=...` to create the channel â€” the watch call itself doesn't return a usable starting point for diffing, so the explicit `startPageToken` call happens first (mirrors Calendar's need for a separate `events.list` seed call, just using Drive's dedicated endpoint for it instead).
- Normalized output includes `eventId`, `eventType` (`file_changed`/`file_deleted` â€” Drive's changes feed doesn't distinguish created vs. updated any more granularly than Calendar does), `source`, `userId`, `username`, `text`, `timestamp`, `fileId`, `name`, `mimeType`, `parents`, `modifiedTime`, `webViewLink`, `raw`.
- Execution creation uses `normalizeExecutionTrigger('google_drive', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'google_drive'`.
- Internal handoff sends `X-Internal-Google-Drive-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed`. The webhook acks Google with `200` immediately before the `changes.list` fetch and execution creation, same as Calendar.
- Watch state (channelId, resourceId, channelToken, folderId, pageToken, expiration) is stored in Redis (`gdrive:channel:{workflowId}:{nodeId}`).
- Auto-registration on active workflow save is wired through `worker/src/api/db-proxy.ts` calling `autoRegisterGoogleDriveWatchesForWorkflow`.
- Renewal: `startGoogleDriveWatchRenewalScheduler()` (node-cron, every 6 hours) re-registers any channel expiring within 2 days, started from `worker/src/index.ts`.
- Registry: `google_drive_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`google_oauth2`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGoogleDriveTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `google_drive` connector (scopes already sufficient).
- `google_drive_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists, same set of files as every trigger since Teams.
- Frontend: node picker entry (category `triggers`, icon `FolderOpen`) with `folderId`/`eventTypes`/`query` fields and a usage guide, logo mapping reusing `Google-Drive.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.
- Caught and fixed a copy-paste duplication bug during implementation: the first draft of the `createGoogleDriveTriggerSchema` insertion accidentally left a duplicate `return {` line at the start of the adjacent `createGoogleCalendarSchema` method (from an imprecise edit boundary) â€” caught by grepping the method signature immediately after editing and before running type-check, and fixed before it could cause a syntax error.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/google-drive/google-drive-trigger-service.test.ts src/core/registry/__tests__/google-drive-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 17 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/google-drive-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real Google Drive account. Manual live test steps for a future pass:

1. Connect Google (Drive) in Connections.
2. Add a Google Drive Trigger node to a workflow, optionally set a Folder ID, and save/activate the workflow â€” this auto-creates the watch channel and seeds a page token.
3. Upload, edit, and delete a test file in the watched Drive/folder and confirm an execution appears for each with normalized `$json` fields.
4. Confirm the `folderId` filter correctly ignores changes to files outside the configured folder.
5. Wait past the channel's `expiration` (or force a run of `renewExpiringGoogleDriveWatches`) and confirm the channel renews without dropping events.

### Typeform Trigger Implementation Notes

Completed on 2026-07-18. A welcome change of pace from the six Google/Microsoft OAuth-heavy triggers before it: Typeform uses a simple bearer-token (Personal Access Token) credential already in place for the existing `typeform` action node, and its webhook payload directly contains the full form response â€” no incremental history-diffing, no watch-channel renewal, no OAuth token refresh. Architecturally this is closest to the Slack/Discord/Teams pattern from earlier in the session.

- New files:
  - `worker/src/services/typeform/typeform-trigger-service.ts` â€” webhook registration via `PUT /forms/{form_id}/webhooks/{tag}` (tag derived from the node ID so multiple workflows can each have their own webhook on the same form), HMAC-SHA256 signature validation (`Typeform-Signature: sha256=<base64>`), response normalization, and unregistration via `DELETE /forms/{form_id}/webhooks/{tag}`.
  - `worker/src/api/typeform-trigger.ts` â€” webhook/info/register/unregister handlers.
  - `worker/src/core/registry/overrides/typeform-trigger.ts` â€” registry override for `typeform_trigger`.
  - Tests: `worker/src/services/typeform/typeform-trigger-service.test.ts` (19 assertions), `worker/src/core/registry/__tests__/typeform-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/typeform-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/typeform_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/typeform_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/typeform/webhook/:workflowId/:nodeId`
  - `POST /api/typeform/webhook/register` / `POST /api/typeform/webhook/unregister`
- Token resolution reuses the existing generic `retrieveCredential({userId}, key)` helper (trying `typeform_token` then `typeform` as credential keys) â€” the same mechanism the pre-existing `typeform` action node already uses in `execute-workflow.ts`, so no new credential-retrieval plumbing was needed.
- Typeform webhooks don't expire, so **no renewal scheduler was needed** â€” registration is a one-time `PUT` that stays active until explicitly deleted or overwritten.
- A per-webhook secret is generated at registration time (or reused if the webhook already exists for that node, so re-saving a workflow doesn't rotate the secret unnecessarily) and stored in Redis alongside the form ID and tag; incoming requests are validated by recomputing the HMAC over the raw request body and comparing in constant time.
- Normalized output includes `eventId`, `eventType` (`form_response`), `source`, `timestamp`, `formId`, `responseId`, `answers` (keyed by field `ref`/`id`/`title`, flattened across Typeform's per-type answer shape â€” text/email/number/boolean/choice/choices), `hidden` (Typeform's hidden-field passthrough, useful for tracking UTM params or internal IDs), `raw`.
- Execution creation uses `normalizeExecutionTrigger('typeform', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'typeform'`.
- Internal handoff sends `X-Internal-Typeform-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed`. Unlike the Google triggers, the webhook handler responds synchronously with the execution result (`202` with `executionId`) since there's no expensive diffing step before it â€” the payload already is the event.
- Registry: `typeform_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`typeform_token`) in `unified-node-registry.ts` (note: the plain `typeform` type had no alias-map self-entry either â€” only the credential-map entry existed â€” so this trigger's aliases are net-new, not a gap being filled), schema in `node-library.ts` (`createTypeformTriggerSchema`), connector `nodeTypes`/`capabilities` extended on the existing `typeform` connector (no scope/credential changes needed â€” Typeform's API key auth has no scope concept).
- `typeform_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists.
- Frontend: **this also required adding the Typeform action node's frontend catalog metadata was already present** (found during audit, contrary to an initial pass that mis-reported it missing) â€” only the new trigger entry needed adding: node picker entry (category `triggers`, icon `FileText`) with `formId`/`query` fields and a usage guide, logo mapping reusing `Typeform.svg`, `backendSupportedNodeTypes.ts` entry, `nodeLaymanDescriptions.ts` entry, docs/search-index/manifest entries.
- Ran the pre-existing `ctrl_checks/src/__tests__/typeform-node-types.test.ts` (action-node catalog test) as a regression check after the frontend edits â€” still 13/13 passing, confirming the new trigger entry didn't disturb the existing Typeform action node.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/typeform/typeform-trigger-service.test.ts src/core/registry/__tests__/typeform-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 19 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/typeform-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/__tests__/typeform-node-types.test.ts` â€” 13 tests passed (regression check on the existing action-node catalog test).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both healthy on the live domain.

Not yet live-tested with a real Typeform account. Manual live test steps for a future pass:

1. Create a Typeform Personal Access Token and connect Typeform in Connections.
2. Add a Typeform Trigger node to a workflow, paste a real Form ID, and save/activate the workflow â€” this registers the webhook via the Typeform API.
3. Submit a test response on the live form and confirm an execution appears with normalized `$json.answers` fields.
4. Confirm hidden fields (if the form uses them) show up under `$json.hidden`.
5. Deactivate/reactivate the workflow and confirm the webhook secret is reused rather than rotated on every save (checked in the unit test, worth confirming against the live API too).

### Tally Trigger Implementation Notes

Completed on 2026-07-18. **Audit finding: a node type literally called `tally` already existed in the working tree** (`worker/src/nodes/definitions/tally-node.ts`, `worker/src/core/registry/overrides/tally.ts`, `ctrl_checks/src/docs-content/nodes/tally.doc.ts`), but it is a completely unrelated product â€” **Tally ERP / TallyPrime** (Indian accounting software, local XML API on port 9000, category `crm`, no credential type, no connector entry). This is not Tally the form builder (tally.so) that this task targets. Both now coexist under distinct node types (`tally` = ERP action node, `tally_trigger` = tally.so form trigger) with no collisions in the registry, connector catalog, or frontend catalog â€” verified with a dedicated regression test in both the backend and frontend test suites. Architecturally this trigger is closest to Typeform (simple bearer-token auth, direct webhook payload delivery, no incremental sync), exactly as flagged in the task brief.

- New files:
  - `worker/src/services/tally/tally-trigger-service.ts` â€” webhook registration via `POST /forms/{formId}/webhooks` (Tally API, `https://api.tally.so`), HMAC-SHA256 signature validation (`Tally-Signature` header), payload normalization (`fields[]` flattened into `answers` keyed by field `key`/`label`, with `MULTIPLE_CHOICE`/checkbox-style fields resolved from option IDs to option text using the field's `options` array), and unregistration via `DELETE /webhooks/{webhookId}`.
  - `worker/src/api/tally-trigger.ts` â€” webhook/info/register/unregister handlers.
  - `worker/src/core/registry/overrides/tally-trigger.ts` â€” registry override for `tally_trigger` (distinct file/function name â€” `overrideTallyTrigger` â€” from the pre-existing `overrideTally` for the ERP node).
  - Tests: `worker/src/services/tally/tally-trigger-service.test.ts` (11 assertions, including choice-field resolution and both raw/`sha256=`-prefixed signature forms), `worker/src/core/registry/__tests__/tally-trigger-integration-contract.test.ts` (includes an explicit non-collision check against the ERP `tally` node), `ctrl_checks/src/components/workflow/__tests__/tally-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/tally_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/tally_trigger.ts`.
  - New logo asset: `ctrl_checks/public/integrations-logos/Tally.svg` â€” no Tally.so brand asset existed in the repo (only the ERP node, which itself had no logo mapping at all), so a new placeholder SVG was created (three-circle mark, approximating Tally's public brand mark) rather than reusing a generic forms icon, since the task asked to check for an existing asset first and add one if missing.
- Backend webhook endpoints:
  - `GET/POST /api/tally/webhook/:workflowId/:nodeId`
  - `POST /api/tally/webhook/register` / `POST /api/tally/webhook/unregister`
- **New credential type**: `tally_token` (Tally Personal Access Token, bearer auth) added to `worker/src/credentials-system/credential-type-registry.ts`, plus a `tally` entry in that file's provider-docs-URL map. The pre-existing ERP `tally` node has no credential type at all (it authenticates by hitting a local XML gateway URL directly), so there was nothing to reuse or conflict with â€” this is a wholly new credential, mirroring Typeform's `typeform_token` pattern (single `token` field, `Authorization: Bearer {{token}}` injection, `testRequest` against `GET https://api.tally.so/me`).
- **Signature scheme â€” explicit assumption, called out per the task brief**: Tally's public docs describe signing webhook payloads with a `Tally-Signature` header containing an HMAC-SHA256 digest of the raw body using the webhook's signing secret. What could not be confirmed with certainty in this session (no live Tally webhook available) is whether the header value is base64 with or without a `sha256=` prefix (Typeform uses the prefix; Tally's documented examples suggest a bare base64 digest with no prefix). `validateTallySignature` handles both forms defensively â€” it strips a `sha256=` prefix if present, otherwise compares the raw value â€” so the implementation works either way. This is documented in a code comment at the top of `tally-trigger-service.ts`.
- **Webhook registration API â€” explicit assumption**: Tally's API may either accept a client-supplied `signingSecret` on `POST /forms/{formId}/webhooks` or always generate its own and return it in the response. `registerTallyWebhook` sends a client-generated secret (mirroring Typeform) but always prefers whatever `signingSecret` the API response contains, so it self-corrects regardless of which behavior the live API actually has. Also unlike Typeform (which uses a deterministic per-node `tag` in the webhook path for idempotent `PUT` upserts), Tally's webhook API is assumed to be a flat `POST`/`DELETE /webhooks/{id}` resource model, so re-registration explicitly deletes the previously stored `webhookId` first (best-effort, failure is logged and swallowed) before creating a new one, to avoid leaving duplicate webhooks on the same form across repeated workflow saves.
- Tally webhooks are assumed not to expire on a schedule (same reasoning as Typeform) â€” **no renewal scheduler was added**. If this assumption turns out to be wrong once tested against a live account, the fix is additive (a `node-cron` sweep matching the Gmail/Outlook/Calendar/Drive pattern), not a rewrite.
- Normalized output includes `eventId`, `eventType` (`form_response`), `source`, `timestamp`, `formId`, `formName`, `responseId` (falls back to `submissionId` if `responseId` is absent), `answers` (flattened, choice-resolved), `raw`. `userId` is populated from Tally's `respondentId` when present (Typeform has no equivalent field, so this is a Tally-specific addition beyond the shared baseline).
- Execution creation uses `normalizeExecutionTrigger('tally', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'tally'`. Added `'tally'` to the keyword-matching fallback list in `execution-db-enums.ts` (alongside `typeform`, `slack`, etc.) for defense-in-depth, even though the explicit `'webhook'` fallback argument already makes this unnecessary at the current call site.
- Internal handoff sends `X-Internal-Tally-Execution: true` and `X-Internal-Trigger-Execution: true` â€” confirmed `internal-execution-auth.ts` needed no changes, it is already fully generic (`x-internal-<provider>-execution`).
- Handoff failures mark the pre-created execution `failed` with the real error. The webhook handler responds synchronously with the execution result (`202` with `executionId`), same as Typeform, since there's no expensive diffing step before it.
- Registry: `tally_trigger` added to `unified-node-registry-overrides.ts`, alias map + credential map (`tally_token`) in `unified-node-registry.ts`, schema in `node-library.ts` (`createTallyTriggerSchema`, inserted immediately after `createTypeformTriggerSchema` â€” verified with a grep of the method boundaries immediately after editing, per the explicit warning in the task about the Google Drive copy-paste incident; no duplication found), a new `tally` connector entry (`capabilities: ['form.read', 'tally.receive', 'trigger.webhook']`, `nodeTypes: ['tally_trigger']`) added to `connector-registry.ts` since no connector existed for either Tally product before this.
- `tally_trigger` was not pre-scaffolded anywhere except a single forward-reference string inside the Typeform trigger's own `whenNotToUse` AI-selection hint (`"Other form providers (use tally_trigger for Tally)"`) â€” added to all 6 "known trigger types" allowlists: `unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` (both occurrences), `workflow-validator-lite.ts`.
- Frontend: node picker entry (category `triggers`, icon `FileText`) with `formId`/`query` fields and a usage guide, placed immediately after the existing Tally ERP action node entry in `nodeTypes.ts` with a comment clarifying the two are different products; new logo mapping (`Tally.svg`); `backendSupportedNodeTypes.ts` entry inserted right after the existing `tally` entry; `nodeLaymanDescriptions.ts` entry; docs/search-index/manifest entries. `backendSupportedNodeOperations.ts`, `nodeGuides.ts`, and `nodeUsageGuides.ts` were checked and confirmed (as with Typeform) not to need entries â€” trigger nodes don't carry an "operations" list the way action nodes do, and the usage guide lives inline on the `nodeTypes.ts` entry itself.
- `credential-scope-registry.ts` was checked and intentionally left untouched â€” like Typeform, Tally's Personal Access Token auth has no OAuth-scope concept, so there is nothing to add to `NODE_PROVIDER`/`NODE_REQUIRED_SCOPES`.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/tally/tally-trigger-service.test.ts src/core/registry/__tests__/tally-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 22 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed (170 node schemas exported, up from 169).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/tally-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` â€” 62 tests passed (regression check on the shared "known trigger types" allowlist edits).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both reported healthy by the deploy script's own live checks against `https://worker.ctrlchecks.ai`.

Not yet live-tested with a real Tally account (no live Tally.so account/API key available in this session), and the signature-header/prefix and webhook-registration-response assumptions above are specifically unverified against production. Manual live test steps for a future pass:

1. Create a Tally Personal Access Token (tally.so -> Settings -> API) and connect Tally in Connections.
2. Add a Tally Trigger node to a workflow, paste a real Form ID, and save/activate the workflow â€” this registers the webhook via the Tally API.
3. Submit a test response on the live form and confirm an execution appears with normalized `$json.answers` fields.
4. **Specifically verify the signature header format** â€” inspect the actual `Tally-Signature` header value Tally sends (with or without `sha256=`) and confirm `validateTallySignature` accepts it; tighten the implementation to the confirmed format once known.
5. **Specifically verify the webhook registration response shape** â€” confirm whether Tally returns its own `signingSecret` on `POST /forms/{formId}/webhooks` or honors the client-supplied one, and confirm the `DELETE /webhooks/{webhookId}` endpoint path is correct (vs. a form-scoped delete path).
6. Confirm choice/multi-select fields resolve to human-readable option text in `$json.answers`, not raw option IDs.
7. Deactivate/reactivate the workflow and confirm the webhook is not duplicated on the form (the pre-delete-then-recreate logic in `registerTallyWebhook` is meant to prevent this).

**Credential/Connection Completion Gate (retroactive check, 2026-07-18):**
- Credential type ID: `tally_token`. Auth model: API key/PAT (bearer), matching the checklist table's "Tally API key/token" â€” not OAuth (Tally has no public OAuth app model), not a generic placeholder.
- Defined in `worker/src/credentials-system/credential-type-registry.ts`; connector catalog entry in `worker/src/services/connectors/connector-registry.ts` (`tally`, `nodeTypes: ['tally_trigger']`).
- Connections panel field: single "Personal Access Token" password input with help text pointing to `tally.so/settings/api`, masked, tested against `GET https://api.tally.so/me`. No vague "Bearer token" label â€” labeled per-provider.
- Trigger node non-secret config: `formId`, `query`. Masked secret: the webhook signing secret is server-generated/stored in Redis, not a user-entered node field.
- Webhook validation: `Tally-Signature` HMAC-SHA256 (see signature-format caveat above â€” still needs live confirmation).
- Scopes/permissions: none (PAT has no scope concept for Tally).
- Action/reply node: none exists yet for Tally (no `tally_trigger`-paired action node in this provider today â€” form-response-only integration).
- Tests proving the model: `tally-trigger-integration-contract.test.ts` asserts the credential map points at `tally_token` and that the connector/`nodeTypes` entry exists; `tally-trigger-service.test.ts` covers signature validation and registration.

### GitHub Trigger Implementation Notes

Completed on 2026-07-18. **Audit finding: substantial GitHub support already existed, but only for the action node.** `github_pat` (bearer-token PAT) and `github_oauth2` (OAuth2, `defaultScopes: ['read:user', 'user:email', 'repo']`) credential types, a `github_oauth` connector (`nodeTypes: ['github']`), and the `github` action node (`worker/src/core/registry/overrides/github.ts`, `worker/src/services/social/github-node.ts`/`githubService.ts`, OAuth routes in `worker/src/api/oauth-github.ts`/`connections-github.ts`) were all pre-existing. No trigger implementation, webhook endpoints, or `github_trigger` node type existed anywhere. Architecturally closest to Slack/Discord (HMAC signature validation) crossed with Typeform/Tally (direct payload delivery, no incremental sync, no expiring subscription):

- New files:
  - `worker/src/services/github/github-trigger-service.ts` â€” HMAC-SHA256 signature validation over the raw body using `X-Hub-Signature-256: sha256=<hex>` (hex, not base64 â€” unlike Tally's ambiguous assumption, GitHub's signature format is a stable, well-documented contract, so the `sha256=` prefix is required, not optional), payload normalization per event type (`push`, `issues`, `pull_request`, `release`, `issue_comment`, plus a generic fallback for any other GitHub event so nothing is silently dropped), webhook registration via `POST /repos/{owner}/{repo}/hooks` and unregistration via `DELETE /repos/{owner}/{repo}/hooks/{hook_id}` using the resolved PAT, event filtering (`eventTypes` config matched against both the raw `X-GitHub-Event` name and the action-qualified `eventType`), and Redis-backed state (`github:webhook:{workflowId}:{nodeId}`: owner, repo, hookId, secret).
  - `worker/src/api/github-trigger.ts` â€” webhook info/receive/register/unregister handlers. The receive handler validates the signature first, then special-cases `ping` (GitHub's webhook-creation test event) with a 200 and no execution, then normalizes/filters/creates the execution and does the internal handoff.
  - `worker/src/core/registry/overrides/github-trigger.ts` â€” registry override for `github_trigger`, `category: 'triggers'`, no-op `execute` (all real work happens in the webhook handler).
  - Tests: `worker/src/services/github/github-trigger-service.test.ts` (per-event-type normalization for push/issues/pull_request/release/issue_comment, ping returns null, hex signature validation with required `sha256=` prefix, event-type/query filtering, register/unregister/auto-register), `worker/src/core/registry/__tests__/github-trigger-integration-contract.test.ts` (registry/schema contract, credential/connector reuse, non-collision with the `github` action node), `ctrl_checks/src/components/workflow/__tests__/github-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/github_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/github_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/github/webhook/:workflowId/:nodeId`
  - `POST /api/github/webhook/register` / `POST /api/github/webhook/unregister`
- **Credential decision: reused `github_pat` with no scope changes.** GitHub's classic PAT `repo` scope already covers full control of private repositories including webhook/hook management (there is no need for the separate `admin:repo_hook` scope when `repo` is already granted), and `github_pat` was already the credential type mapped to the `github` action node's `credentialTypeId`. `PROVIDER_REQUIRED_SCOPES.github` in `ctrl_checks/src/lib/comprehensiveWorkflowValidation.ts`-adjacent `credential-scope-registry.ts` was already `['repo']` â€” sufficient as-is, no scope expansion needed (unlike Outlook, which needed new Graph scopes). Token resolution tries `github_pat` then `github` as credential keys, mirroring the Typeform/Tally `retrieveCredential` fallback pattern.
- GitHub webhooks do not expire on a schedule, so **no renewal scheduler was added** â€” consistent with Typeform/Tally and explicitly confirmed against GitHub's webhook docs (unlike Gmail/Outlook/Calendar/Drive's expiring watch channels/subscriptions).
- Re-registering a webhook for a node that already has one first deletes the old hook via the GitHub API (best-effort, failure logged and swallowed) before creating a new one, preventing duplicate webhooks on repeated workflow saves â€” same pattern as Tally's pre-delete-then-recreate.
- Normalized output includes `eventId` (from `X-GitHub-Delivery`, falling back to a generated UUID), `eventType` (action-qualified where applicable, e.g. `issues.opened`, `pull_request.closed`, or bare `push`), `source`, `timestamp`, `repository`, `action`, `userId`/`username` (from the webhook `sender`), plus the event-specific fields called for in the task: `ref`/`commits` (push), `issueNumber`/`issueTitle`/`issueUrl` (issues, issue_comment), `prNumber`/`prTitle`/`prUrl`/`merged` (pull_request), `releaseTag`/`releaseName` (release), `commentBody`/`commentUrl` (issue_comment), and `raw` always present. Other GitHub event types (star, fork, pull_request_review, ...) still normalize into the shared base fields via a generic fallback branch rather than being rejected.
- Execution creation uses `normalizeExecutionTrigger('github', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'github'`. `execution-db-enums.ts`'s webhook-fallback keyword list already included `'github'` from earlier forward-scaffolding â€” confirmed still correct, no change needed.
- Internal handoff sends `X-Internal-Github-Execution: true` and `X-Internal-Trigger-Execution: true` â€” confirmed `internal-execution-auth.ts` needed no changes, it is already fully generic (`x-internal-<provider>-execution`).
- Handoff failures mark the pre-created execution `failed` with the real error. The webhook handler responds synchronously with the execution result (`202` with `executionId`), same as Typeform/Tally, since there's no expensive diffing step before it.
- Registry: `github_trigger` added to `unified-node-registry-overrides.ts`, alias-map entries (placed directly after the existing `github`/`git_hub`/`gh` aliases, matching the facebook_trigger/whatsapp_trigger placement convention) + credential map entry (`github_pat`, reusing the action node's exact credential mapping) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGithubTriggerSchema`, inserted immediately after `createGithubSchema` â€” verified with a grep of the method boundaries immediately after editing, per the standing Google Drive copy-paste warning; clean, no duplication), the existing `github_oauth` connector extended with `trigger.webhook`/`github.receive` capabilities and `github_trigger` added to its `nodeTypes` (no new connector created), `github_trigger: 'github'` added to `NODE_PROVIDER` in `credential-scope-registry.ts` (no `NODE_REQUIRED_SCOPES` override needed â€” it falls back to `PROVIDER_REQUIRED_SCOPES.github`).
- `github_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists: `unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` (both occurrences), `workflow-validator-lite.ts`.
- Frontend: node picker entry (category `triggers`, icon `GitBranch`, matching the action node's icon) with `owner`/`repo`/`eventTypes`/`webhookSecret`/`query` fields placed immediately after the existing GitHub action node entry in `nodeTypes.ts`; logo mapping reuses the existing `Github.svg` asset (no new asset needed â€” the action node already had one, unlike Tally which needed a new SVG); `backendSupportedNodeTypes.ts` entry inserted alphabetically between `github` and `gitlab`; `nodeLaymanDescriptions.ts` entry; docs/search-index/manifest entries. `backendSupportedNodeOperations.ts`, `nodeGuides.ts`, and `nodeUsageGuides.ts` were checked and confirmed (as with Typeform/Tally) not to need entries â€” trigger nodes don't carry an "operations" list, and the usage guide lives inline on the `nodeTypes.ts` entry.
- One test-writing correction caught during verification: `connectorRegistry.getConnector(id)` looks up by connector **id** (`github_oauth`), not by provider name (`github`) â€” the integration-contract test initially called `getConnector('github')` (copying the Tally test, where the connector's id happens to equal its provider name) and failed with `connector: undefined`; fixed to `getConnector('github_oauth')` and reran green.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/github/github-trigger-service.test.ts src/core/registry/__tests__/github-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 26 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed (171 node schemas exported, up from 170).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/github-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` â€” 62 tests passed (regression check on the shared "known trigger types" allowlist edits).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both reported healthy by the deploy script's own live checks against `https://worker.ctrlchecks.ai`.

Not yet live-tested with a real GitHub repository/webhook (no live GitHub PAT/repo available in this session). Manual live test steps for a future pass:

1. Create a GitHub Personal Access Token with `repo` scope (classic PAT) and connect GitHub in Connections.
2. Add a GitHub Trigger node to a workflow, fill in Owner and Repository, and save/activate the workflow â€” this registers the webhook via the GitHub API and should trigger a `ping` event from GitHub that the handler acknowledges without starting an execution.
3. Push a commit, open an issue, open a pull request, publish a release, and comment on an issue on the watched repository; confirm an execution appears for each with normalized `$json` fields (`eventType`, `issueTitle`/`prTitle`/`releaseTag`/`commentBody` as applicable).
4. **Specifically verify the signature header format** â€” confirm GitHub sends `X-Hub-Signature-256: sha256=<hex>` exactly as documented (this is GitHub's stable, well-documented contract, so low risk, but should be confirmed against a live delivery).
5. Confirm a downstream GitHub action node can reply using `{{$json.repository}}` and `{{$json.issueNumber}}`/`{{$json.prNumber}}`.
6. Deactivate/reactivate the workflow and confirm the webhook is not duplicated on the repository (the pre-delete-then-recreate logic in `registerGithubWebhook` is meant to prevent this).
7. Confirm the `eventTypes` filter correctly ignores event types not selected on the node (e.g. a `push` when only `issues` is configured).

**Credential/Connection Completion Gate (retroactive check, 2026-07-18):**
- Credential type ID: `github_pat` (reused from the existing `github` action node). Auth model: fine-grained/classic Personal Access Token (bearer) â€” `github_oauth2` (real OAuth2, authorize/token URLs, `GITHUB_CLIENT_ID`/`SECRET`) also exists as an alternative for the action node, but PAT is what webhook-registration credential resolution uses since it's simpler for repo-admin (hook create/delete) access without a broader OAuth app install flow.
- Defined in `worker/src/credentials-system/credential-type-registry.ts` (`github_pat` bearer, `github_oauth2` oauth2); connector catalog entry in `worker/src/services/connectors/connector-registry.ts` (`github_oauth`, extended with `trigger.webhook`/`github.receive`, `nodeTypes` now includes both `github` and `github_trigger`).
- Connections panel field: "Personal Access Token" password input with help text pointing to `github.com/settings/tokens`, masked, tested against `GET https://api.github.com/user`; separately, a real "Connect GitHub" OAuth button for `github_oauth2`. Neither is a vague generic Bearer field.
- Trigger node non-secret config: `owner`, `repo`, `eventTypes`. Masked/generated secret: webhook HMAC secret is server-generated per node, stored in Redis, not user-entered.
- Webhook validation: `X-Hub-Signature-256: sha256=<hex-hmac-sha256>` over the raw body, constant-time compare.
- Scopes/permissions: `repo` (classic PAT scope) â€” already sufficient for hook admin, documented in `PROVIDER_REQUIRED_SCOPES.github` in `credential-scope-registry.ts`, no change needed.
- Action/reply node: existing `github` action node (`worker/src/core/registry/overrides/github.ts`) uses the same `github_pat`/`github_oauth2` credentials; can reply/create issues/comments using `{{$json.repository}}`, `{{$json.issueNumber}}`, `{{$json.prNumber}}` from the trigger output.
- Tests proving the model: `github-trigger-integration-contract.test.ts` asserts the credential map points at `github_pat`, the connector id (`github_oauth`, not `github` â€” a real lookup-key bug was caught and fixed here) is correct, and `nodeTypes` includes `github_trigger`; `github-trigger-service.test.ts` covers hex signature validation with required `sha256=` prefix.

### GitLab Trigger Implementation Notes

Completed on 2026-07-18. **Audit finding: substantial GitLab support already existed, but only for the action node.** `gitlab_pat` (bearer-token PAT) and `gitlab_oauth2` (OAuth2, `defaultScopes: ['read_user', 'api']`) credential types, a `gitlab` connector (`nodeTypes: ['gitlab']`, `credentialContract.type: 'oauth'`), and the `gitlab` action node (`worker/src/core/registry/overrides/gitlab.ts` delegating to a legacy handler in `worker/src/api/execute-workflow.ts`'s `case 'gitlab':` block, which lists/creates/reads GitLab issues) were all pre-existing. No trigger implementation, webhook endpoints, or `gitlab_trigger` node type existed anywhere. Architecturally closest to GitHub (the most recently completed trigger), but with two deliberate differences called out below (webhook validation is a plain shared secret, not HMAC; and there is no automatic "ping" test event to special-case):

- New files:
  - `worker/src/services/gitlab/gitlab-trigger-service.ts` â€” plain shared-secret `X-Gitlab-Token` validation (constant-time string compare, explicitly NOT an HMAC digest â€” see the credential completion gate below), payload normalization keyed off the payload's `object_kind` field (`push`, `tag_push`, `issue`, `merge_request`, `note`, `pipeline`, `release`, plus a generic fallback for any other kind such as `build`/job or `wiki_page`), webhook registration via `POST /api/v4/projects/{id}/hooks` and unregistration via `DELETE /api/v4/projects/{id}/hooks/{hook_id}` using the resolved PAT, a configurable GitLab instance base URL (`baseUrl`, default `https://gitlab.com`, so self-hosted GitLab is supported â€” API calls are built as `{baseUrl}/api/v4{path}`), event filtering, and Redis-backed state (`gitlab:webhook:{workflowId}:{nodeId}`: projectId, baseUrl, hookId, secret).
  - `worker/src/api/gitlab-trigger.ts` â€” webhook info/receive/register/unregister handlers. The receive handler validates `X-Gitlab-Token` first, then normalizes/filters/creates the execution and does the internal handoff. No `ping`-style special case is needed: unlike GitHub, GitLab does not send an automatic test event when a webhook is created â€” the user-triggered "Test" button in the GitLab UI sends a real sample event with the real `object_kind`.
  - `worker/src/core/registry/overrides/gitlab-trigger.ts` â€” registry override for `gitlab_trigger`, `category: 'triggers'`, no-op `execute` (all real work happens in the webhook handler).
  - Tests: `worker/src/services/gitlab/gitlab-trigger-service.test.ts` (per-object_kind normalization for push/tag_push/issue/merge_request/note/pipeline/release plus a generic-fallback case, plain constant-time `X-Gitlab-Token` validation explicitly asserting it is NOT HMAC, event-type/query filtering, register/unregister/auto-register including a custom self-hosted `baseUrl`), `worker/src/core/registry/__tests__/gitlab-trigger-integration-contract.test.ts` (registry/schema contract, credential/connector reuse, non-collision with the `gitlab` action node), `ctrl_checks/src/components/workflow/__tests__/gitlab-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/gitlab_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/gitlab_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/gitlab/webhook/:workflowId/:nodeId`
  - `POST /api/gitlab/webhook/register` / `POST /api/gitlab/webhook/unregister`
- **Credential decision: reused `gitlab_pat` with no credential-shape changes, only a clarified helpText.** `gitlab_pat` (bearer, `Authorization: Bearer {{token}}` injection) was already the credential type mapped to the `gitlab` action node's `credentialTypeId` in `unified-node-registry.ts`, and the pre-existing `gitlab_oauth2` credential type's `defaultScopes` already include `api` (sufficient for hook management). No scope expansion or new credential type was needed â€” unlike Outlook, this did not require an "existing users may need to reconnect" caveat, since the PAT's scope is chosen by the user at token-creation time on GitLab's own settings page, not enforced by CtrlChecks' credential shape. The `gitlab_pat` field's `helpText` was updated (additive, non-breaking) to explicitly tell users to select the `api` scope so registered tokens also support Trigger webhook management, not only the action node's read/write project calls.
- **PAT header convention â€” explicit decision, not left ambiguous.** GitLab supports two ways to authenticate a Personal Access Token against the REST API: the `PRIVATE-TOKEN` header (GitLab's own long-standing convention) and `Authorization: Bearer <token>` (supported since GitLab 13.x for compatibility with OAuth-style clients). This implementation uses `Authorization: Bearer`, matching (a) the `gitlab_pat` credential type's existing `injection` template, and (b) the pre-existing `gitlab` action node's proven-working implementation in `execute-workflow.ts`'s `case 'gitlab':` block, which already sends `Authorization: Bearer` in production. Introducing `PRIVATE-TOKEN` only for the new trigger's registration calls would have created two authentication conventions for the same credential type with no functional benefit, since GitLab's REST API v4 accepts a PAT via either header.
- **Webhook validation â€” explicitly NOT HMAC.** GitLab does not sign webhook payloads with a computed digest the way GitHub/Slack/Discord/Typeform/Tally do. Instead, GitLab echoes back a plain "Secret Token" (configured at hook-creation time) verbatim in the `X-Gitlab-Token` header on every delivery. `validateGitlabToken` is a `crypto.timingSafeEqual` constant-time string compare against the stored secret â€” there is no signature to recompute, no raw-body HMAC, and no `sha256=`-style prefix to parse. This is called out in a doc comment at the top of `gitlab-trigger-service.ts` and asserted directly in the test suite.
- **Registration is automatic by API, not manual-dashboard-only** â€” a PAT/OAuth token with `api` scope can call `POST /api/v4/projects/:id/hooks` directly, so `manualSetupRequired` is not needed for GitLab.com. **Caveat for self-hosted GitLab**: some self-managed instances restrict webhook creation to project maintainers/owners or disable it entirely via instance-level admin settings; if the resolved PAT's account lacks sufficient project role, the GitLab API returns a 403/404 and `registerGitlabWebhook` surfaces that error directly rather than silently failing â€” this is a per-instance admin policy, not something CtrlChecks can detect in advance, so it is documented as a possibility rather than special-cased.
- GitLab project webhooks do not expire on a schedule, so **no renewal scheduler was added** â€” consistent with GitHub/Typeform/Tally and confirmed against GitLab's webhook docs (unlike Gmail/Outlook/Calendar/Drive's expiring watch channels/subscriptions).
- Re-registering a webhook for a node that already has one first deletes the old hook via the GitLab API (best-effort, failure logged and swallowed) before creating a new one, preventing duplicate webhooks on repeated workflow saves â€” same pattern as GitHub/Tally's pre-delete-then-recreate.
- Normalized output includes `eventId` (derived from a stable per-event-kind field where GitLab provides one â€” `after` for push/tag_push, `object_attributes.id` for issue/merge_request/note/pipeline, top-level `id` for release â€” falling back to a generated UUID), `eventType` (the raw `object_kind`: `push`, `tag_push`, `issue`, `merge_request`, `note`, `pipeline`, `release`, or any other kind via the generic fallback), `source`, `timestamp`, `projectId`, `projectName`, `action` (issue/merge_request open/close/reopen/update action, or pipeline/release status), plus the event-specific fields called for in the task: `ref`/`commits` (push, tag_push), `issueIid`/`issueTitle`/`issueUrl` (issue, and note-on-issue), `mrIid`/`mrTitle`/`mrUrl`/`mrState` (merge_request, and note-on-MR), `noteBody`/`noteUrl` (note/comment), and `raw` always present. GitLab's `release` event payload is a documented exception to the "fields live under `object_attributes`" pattern used by issue/merge_request/note/pipeline â€” release fields are top-level on the payload â€” handled explicitly rather than assumed to follow the same shape.
- Execution creation uses `normalizeExecutionTrigger('gitlab', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'gitlab'`. `execution-db-enums.ts` already handles unrecognized provider names via its `'webhook'` fallback argument at the call site, so no change was needed there.
- Internal handoff sends `X-Internal-Gitlab-Execution: true` and `X-Internal-Trigger-Execution: true` â€” confirmed `internal-execution-auth.ts` needed no changes, it is already fully generic (`x-internal-<provider>-execution`).
- Handoff failures mark the pre-created execution `failed` with the real error. The webhook handler responds synchronously with the execution result (`202` with `executionId`), same as GitHub/Typeform/Tally, since there's no expensive diffing step before it.
- Registry: `gitlab_trigger` added to `unified-node-registry-overrides.ts`, alias-map entries (placed directly after the existing `gitlab`/`git_lab` aliases) + credential map entry (`gitlab_pat`, reusing the action node's exact credential mapping) in `unified-node-registry.ts`, schema in `node-library.ts` (`createGitlabTriggerSchema`, inserted immediately after `createGitlabSchema` â€” verified with a grep of the method boundaries immediately after editing, per the standing Google Drive copy-paste warning; clean, no duplication), the existing `gitlab` connector extended with `trigger.webhook`/`gitlab.receive` capabilities and `gitlab_trigger` added to its `nodeTypes` (no new connector created; the connector's `id` is `gitlab`, not `gitlab_oauth`, which the integration-contract test looks up directly to avoid repeating the id-vs-provider lookup bug caught during the GitHub trigger's own test-writing).
- `credential-scope-registry.ts`: `gitlab: ['api']` added to `PROVIDER_REQUIRED_SCOPES` (previously absent â€” the `gitlab` action node was not covered by this scope-preflight system at all before this change) and `gitlab_trigger: 'gitlab'` added to `NODE_PROVIDER`. Deliberately did **not** add a `gitlab: 'gitlab'` entry to `NODE_PROVIDER` for the pre-existing action node, to avoid changing that node's untouched, already-shipped preflight behavior as a side effect of this trigger's work â€” only the new `gitlab_trigger` node type gains scope-registry coverage.
- `gitlab_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists: `unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` (both occurrences â€” confirmed they use different indentation from each other, so each was matched and edited individually rather than with a single `replace_all`), `workflow-validator-lite.ts`.
- Frontend: node picker entry (category `triggers`, icon `GitBranch`, matching the action node's icon) with `baseUrl`/`projectId`/`eventTypes`/`secretToken`/`query` fields placed immediately after the existing GitLab action node entry in `nodeTypes.ts` (and before Bitbucket, mirroring where `github_trigger` sits relative to `github`/`gitlab`); logo mapping reuses the existing `Gitlab.svg` asset (no new asset needed); `backendSupportedNodeTypes.ts` entry inserted alphabetically right after `gitlab`; `nodeLaymanDescriptions.ts` entry; docs/search-index/manifest entries. `backendSupportedNodeOperations.ts`, `nodeGuides.ts`, and `nodeUsageGuides.ts` were checked and confirmed (as with Typeform/Tally/GitHub) not to need entries.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/gitlab/gitlab-trigger-service.test.ts src/core/registry/__tests__/gitlab-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 27 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed (172 node schemas exported, up from 171).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/gitlab-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` â€” 62 tests passed (regression check on the shared "known trigger types" allowlist edits).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both reported healthy by the deploy script's own live checks against `https://worker.ctrlchecks.ai`; independently re-confirmed with a direct `curl -fsS https://worker.ctrlchecks.ai/health/live` afterward.

Not yet live-tested with a real GitLab project/webhook (no live GitLab PAT/project available in this session). Manual live test steps for a future pass:

1. Create a GitLab Personal Access Token with `api` scope (gitlab.com -> User Settings -> Access Tokens) and connect GitLab in Connections.
2. Add a GitLab Trigger node to a workflow, fill in the Project ID (numeric ID from project Settings -> General, or a URL-encoded path), and save/activate the workflow â€” this registers the webhook via the GitLab API.
3. Push a commit, open an issue, open a merge request, comment on an issue, publish a release, and create/update a pipeline on the watched project; confirm an execution appears for each with normalized `$json` fields (`eventType`, `issueTitle`/`mrTitle`/`noteBody` as applicable).
4. **Specifically verify the `X-Gitlab-Token` header behavior against a live delivery** â€” confirm GitLab echoes back exactly the secret configured at hook-creation time with no transformation (this is documented GitLab behavior, low risk, but should be confirmed against a live delivery since it is the one signature-adjacent assumption in this trigger).
5. Confirm a downstream GitLab action node can reply using `{{$json.projectId}}` and `{{$json.issueIid}}`/`{{$json.mrIid}}`.
6. Deactivate/reactivate the workflow and confirm the webhook is not duplicated on the project (the pre-delete-then-recreate logic in `registerGitlabWebhook` is meant to prevent this).
7. Confirm the `eventTypes` filter correctly ignores event types not selected on the node (e.g. a `push` when only `issue` is configured).
8. Test against a self-hosted GitLab instance with a non-default `baseUrl` to confirm the configurable-instance-URL path works end to end, and separately confirm behavior when the PAT's project role lacks webhook-admin permission (expect a clear 403/404 surfaced from `registerGitlabWebhook`, not a silent failure).

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `gitlab_pat` (reused from the existing `gitlab` action node). Auth model: Personal/Project Access Token (bearer) â€” `gitlab_oauth2` (real OAuth2, `authorizationUrl`/`tokenUrl`, `GITLAB_CLIENT_ID`/`SECRET`, `defaultScopes: ['read_user', 'api']`) also exists as an alternative for the action node and is equally valid for the trigger since its scopes already cover `api`, but PAT remains what webhook-registration credential resolution tries first, mirroring GitHub's PAT-first resolution.
- Is it OAuth, bot token, API key, app credential, or provider-specific token: it is a provider-specific Personal Access Token (bearer), with a full OAuth2 flow available as a secondary option â€” not a generic Bearer-token placeholder or an invented credential shape.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`gitlab_pat` bearer with a single masked `token` password field and GitLab-specific helpText pointing to `gitlab.com/-/user_settings/personal_access_tokens` and calling out the `api` scope requirement; `gitlab_oauth2` oauth2).
- Which file defines the connector catalog entry: `worker/src/services/connectors/connector-registry.ts` (`gitlab` connector, extended with `trigger.webhook`/`gitlab.receive` capabilities, `nodeTypes` now includes both `gitlab` and `gitlab_trigger`).
- Which UI fields the user sees in the Connections panel: a "Personal Access Token" password input labeled specifically for GitLab (not "API Key" or "Bearer Token" generically) with help text pointing to GitLab's token settings page and the required `api` scope, masked, tested against `GET https://gitlab.com/api/v4/user`; separately, a real "Connect GitLab" OAuth button for `gitlab_oauth2`.
- Which trigger node settings are safe non-secret config: `baseUrl`, `projectId`, `eventTypes`, `query`.
- Which fields are masked secrets: the optional `secretToken` node-level override (masked password field, rarely used since CtrlChecks generates one automatically) and the webhook's `X-Gitlab-Token` secret itself (server-generated per node, stored in Redis, never rendered back to the user).
- What webhook validation is used: `X-Gitlab-Token` plain shared-secret header, validated with a `crypto.timingSafeEqual` constant-time string compare â€” explicitly confirmed NOT to be an HMAC signature (no digest is computed over the request body; GitLab simply echoes back the configured token verbatim).
- What scopes/permissions are required: `api` (needed for project webhook create/delete via `POST/DELETE /api/v4/projects/:id/hooks*`) â€” documented in `PROVIDER_REQUIRED_SCOPES.gitlab` in `credential-scope-registry.ts` (newly added) and in the `gitlab_pat` credential's helpText.
- How the action/reply node is authenticated: the existing `gitlab` action node (`worker/src/core/registry/overrides/gitlab.ts` -> `execute-workflow.ts`'s `case 'gitlab':` block) uses the same `gitlab_pat`/`gitlab_oauth2` credentials (resolved via the legacy `gitlab` vault key, which `resolveGitlabToken` also tries as a fallback); can reply/create issues using `{{$json.projectId}}`, `{{$json.issueIid}}` from the trigger output.
- Which tests prove the model: `gitlab-trigger-integration-contract.test.ts` asserts the credential map points at `gitlab_pat` with `authType: 'bearer_token'`, the connector id (`gitlab`) and `nodeTypes`/`capabilities` are correct, and the trigger does not collide with the action node's category; `gitlab-trigger-service.test.ts` asserts `validateGitlabToken` is a plain compare (matching secrets pass, mismatched secrets fail, empty inputs fail) with no HMAC/digest computation anywhere in the implementation.

### Jira Trigger Implementation Notes

Completed on 2026-07-18. **Audit finding: substantial Jira support already existed, but only for the action node.** The `jira_api_key` credential type (Basic Auth â€” email + API token + domain, `authType: 'basic_auth'`, already labeled with real field names "Email Address"/"API Token"/"Domain", not a generic Bearer token), a `jira` connector (`nodeTypes: ['jira']`, `credentialContract.type: 'api_key'`), and the `jira` action node (`worker/src/api/execute-workflow.ts`'s `case 'jira':` block, which lists/creates/reads/updates/deletes/transitions/comments on Jira issues via Basic Auth against `/rest/api/3/...`) were all pre-existing. No trigger implementation, webhook endpoints, or `jira_trigger` node type existed anywhere.

- New files:
  - `worker/src/services/jira/jira-trigger-service.ts` â€” per-node shared-secret validation (constant-time compare against a secret embedded as a `?secret=` query parameter or an `X-Jira-Webhook-Secret` header â€” explicitly NOT HMAC/JWT, see the credential completion gate below), payload normalization keyed off the payload's `webhookEvent` field (`jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted`, `comment_created`, `comment_updated`, `comment_deleted`, plus a generic fallback for any other webhookEvent such as `worklog_created`/`sprint_started`), a manual-setup-only "registration" helper that generates the webhook URL + secret without calling any Jira API, and Redis-backed state (`jira:webhook:{workflowId}:{nodeId}`: siteUrl, projectKey, secret).
  - `worker/src/api/jira-trigger.ts` â€” webhook info/receive/register/unregister handlers. The receive handler validates the secret first (query param or header), then normalizes/filters/creates the execution and does the internal handoff.
  - `worker/src/core/registry/overrides/jira-trigger.ts` â€” registry override for `jira_trigger`, `category: 'triggers'`, no-op `execute` (all real work happens in the webhook handler). Unlike GitLab, no field is `required` â€” `siteUrl`/`projectKey` are optional scoping filters, not identifiers CtrlChecks needs to call any Jira API with.
  - Tests: `worker/src/services/jira/jira-trigger-service.test.ts` (28 assertions across per-webhookEvent normalization for issue created/updated/deleted and comment created/updated/deleted plus a generic-fallback case, plain constant-time secret validation explicitly asserting it is NOT HMAC/JWT, event-type/project-key/query filtering, credential resolution from the Basic Auth `jira_api_key` shape, register/unregister/auto-register asserting **no Jira API call is made except the optional credential-verification `GET /rest/api/3/myself` call**), `worker/src/core/registry/__tests__/jira-trigger-integration-contract.test.ts` (registry/schema contract, credential/connector reuse, non-collision with the `jira` action node), `ctrl_checks/src/components/workflow/__tests__/jira-trigger-node-types.test.ts`.
  - Docs: `ctrl_checks/src/docs-content/nodes/jira_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/jira_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/jira/webhook/:workflowId/:nodeId`
  - `POST /api/jira/webhook/register` / `POST /api/jira/webhook/unregister`
- **Credential decision: reused `jira_api_key` with zero shape changes.** `jira_api_key` (Basic Auth: Email Address + API Token + Domain, `Authorization: Basic base64(email:apiToken)` injection) was already the credential type mapped to the `jira` action node's `credentialTypeId` in `unified-node-registry.ts`, and its fields were already well-labeled (not a generic "Bearer Token" or "API Key" placeholder) with help text pointing at `id.atlassian.com/manage-profile/security/api-tokens`. This is the simplest, most common self-service Jira Cloud auth model â€” not OAuth2 (3LO). No new credential type, no scope expansion, no "existing users may need to reconnect" caveat was needed.
- **Webhook registration model â€” explicitly MANUAL, not automatic-by-API, and this is the single most important accuracy decision for this trigger.** Jira Cloud's REST webhook registration endpoint (`POST /rest/api/3/webhook`, the "dynamic webhooks" API) is documented by Atlassian as an operation for apps â€” it is scoped to Connect apps and OAuth 2.0 (3LO) apps, not to a plain Basic-Auth API-token user credential. Since this trigger deliberately reuses the existing `jira_api_key` Basic Auth credential (rather than introducing a new OAuth2 app-registration flow that the action node doesn't have and that would be a large scope increase for one trigger), it cannot call that endpoint on the user's own behalf. `registerJiraWebhook` therefore follows the exact same manual-setup pattern as Slack/Discord/Microsoft Teams: it verifies the saved credential works (`GET /rest/api/3/myself`), generates the exact webhook URL with a per-node secret embedded as a query parameter, stores that state in Redis, and returns `manualSetupRequired: true` â€” it never calls any Jira webhook-registration endpoint. The user (a Jira site admin) must paste the generated URL into Jira Settings -> System -> WebHooks, or a project admin without site-admin rights can use an "Automation for Jira" rule with a "Send web request" action targeting the same URL instead. This is documented in the webhook-info response message, the node's `usageGuide.setup` steps, and the doc's `commonErrors` entry â€” nowhere does the implementation claim or silently imply full self-service automatic registration works for this credential model.
- **Webhook validation â€” explicitly NOT HMAC/JWT.** Jira Cloud does not sign webhook payloads with any digest or token. The practical validation mechanism implemented here is a per-node secret CtrlChecks generates and embeds directly in the webhook URL as a `?secret=` query parameter (required because Jira's built-in System WebHooks admin page only accepts a plain URL with no custom-header configuration) with an `X-Jira-Webhook-Secret` header also accepted as an alternative for setups that do support custom headers (e.g. an Automation for Jira "Send web request" action). `validateJiraSecret` is a `crypto.timingSafeEqual` constant-time string compare â€” there is no signature to recompute. This is called out in a doc comment at the top of `jira-trigger-service.ts` and asserted directly in the test suite.
- No renewal scheduler was added â€” a manually-configured Jira webhook or Automation for Jira rule does not expire on a schedule the way Gmail/Outlook/Calendar/Drive's watch channels do.
- Normalized output includes `eventId` (derived from a stable per-event field where available â€” `issue.id` for issue events, `comment.id` for comment events â€” falling back to a generated UUID), `eventType` (the raw `webhookEvent` value: `jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted`, `comment_created`, `comment_updated`, `comment_deleted`, or any other value via the generic fallback), `source`, `timestamp`, `siteUrl` (parsed from `issue.self`/`comment.self`'s origin, since Jira Cloud webhook payloads carry no explicit site-URL field), `cloudId` (reserved, `null` for now â€” Jira Cloud webhook payloads do not include a cloudId), `issueKey`/`issueId`/`issueSummary`/`issueUrl` (constructed as `{siteUrl}/browse/{issueKey}`)/`issueType`/`issueStatus`/`projectKey`, `commentBody`/`commentUrl` (comment events only), `userId`/`username` (from the payload's `user` or `comment.author`), and `raw` always present.
- Execution creation uses `normalizeExecutionTrigger('jira', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'jira'`.
- Internal handoff sends `X-Internal-Jira-Execution: true` and `X-Internal-Trigger-Execution: true` â€” confirmed `internal-execution-auth.ts` needed no changes, it is already fully generic (`x-internal-<provider>-execution`).
- Handoff failures mark the pre-created execution `failed` with the real error. The webhook handler responds with `202` and the execution ID once the (fast, synchronous) filtering step passes, same as GitHub/GitLab/Typeform/Tally.
- Registry: `jira_trigger` added to `unified-node-registry-overrides.ts` (no prior `jira` override existed to place it next to â€” the action node runs through the legacy `execute-workflow.ts` case block directly â€” so it was added under the "Version Control" batch alongside GitHub/GitLab/Bitbucket, the closest existing devops-tooling grouping), alias-map entries (placed directly after the existing `jira` alias) + credential map entry (`jira_api_key`, reusing the action node's exact credential mapping) in `unified-node-registry.ts`, schema in `node-library.ts` (`createJiraTriggerSchema`, inserted immediately after `createJiraSchema` â€” verified with a grep of the method boundaries immediately after editing, per the standing Google Drive copy-paste warning; clean, no duplication), the existing `jira` connector extended with `trigger.webhook`/`jira.receive` capabilities and `jira_trigger` added to its `nodeTypes` (no new connector created).
- `credential-scope-registry.ts`: `jira: []` added to `PROVIDER_REQUIRED_SCOPES` (empty â€” the API-token Basic Auth model has no OAuth-scope concept, matching the existing `typeform: []` pattern) and `jira_trigger: 'jira'` added to `NODE_PROVIDER`. Deliberately did **not** add a `jira: 'jira'` entry to `NODE_PROVIDER` for the pre-existing action node, mirroring GitLab's decision to avoid changing that node's untouched, already-shipped preflight behavior as a side effect of this trigger's work.
- `jira_trigger` was not pre-scaffolded anywhere â€” added to all 6 "known trigger types" allowlists: `unified-execution-engine.ts`, `workflow-graph-normalizer.ts`, `workflow-save-validator.ts`, `comprehensiveWorkflowValidation.ts`, `workflowGraphValidator.ts` (both occurrences), `workflow-validator-lite.ts`.
- Frontend: node picker entry (category `triggers`, icon `AlertCircle`, matching the action node's icon) with `siteUrl`/`projectKey`/`eventTypes`/`secretToken`/`jql`/`query` fields placed immediately after the existing Jira action node entry in `nodeTypes.ts`; logo mapping reuses the existing `Jira.svg` asset (no new asset needed); `backendSupportedNodeTypes.ts` entry inserted alphabetically right after `jira`; `nodeLaymanDescriptions.ts` entry; docs/search-index/manifest entries. `backendSupportedNodeOperations.ts`, `nodeGuides.ts`, and `nodeUsageGuides.ts` were checked and confirmed (as with Typeform/Tally/GitHub/GitLab) not to need entries â€” their existing `jira` entries are either action-operation-specific (`backendSupportedNodeOperations.ts`) or keyed to field names (`domain`) that the trigger deliberately renamed to `siteUrl` to make the "this is a filter, not the credential" distinction clear in the UI.

Verification completed:

- `cd worker && npm run type-check` â€” passed.
- `cd worker && npx jest src/services/jira/jira-trigger-service.test.ts src/core/registry/__tests__/jira-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` â€” 4 suites, 28 tests passed.
- `cd worker && npm run lint` â€” passed.
- `cd worker && npm run build` â€” passed (173 node schemas exported, up from 172).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/jira-trigger-node-types.test.ts` â€” 2 tests passed.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` â€” 62 tests passed (regression check on the shared "known trigger types" allowlist edits).
- `cd ctrl_checks && npm run build` â€” passed.
- `bash scripts/deploy-worker.sh` â€” deployed, `/health` and `/health/live` both reported healthy by the deploy script's own live checks against `https://worker.ctrlchecks.ai`; independently re-confirmed with a direct `curl -fsS https://worker.ctrlchecks.ai/health/live` afterward.

Not yet live-tested with a real Jira Cloud site (no live Jira credentials available in this session). Manual live test steps for a future pass:

1. Create a Jira API token at id.atlassian.com/manage-profile/security/api-tokens and connect Jira in Connections (email + token + site domain).
2. Add a Jira Trigger node to a workflow, optionally set a Project Key, and save/activate the workflow â€” this generates the webhook URL + secret (no Jira API call is made).
3. As a Jira site admin, go to Jira Settings -> System -> WebHooks, click "Create a WebHook", and paste in the generated URL exactly as returned (it already includes `?secret=...`). Select the events to send (issue created/updated/deleted, comment created/updated/deleted).
4. Create an issue, update an issue, delete an issue, and comment on an issue in the watched project; confirm an execution appears for each with normalized `$json` fields (`issueKey`, `issueSummary`, `commentBody` as applicable).
5. **Specifically verify the secret query-parameter survives Jira's own webhook UI unmodified** â€” confirm Jira does not strip, re-encode, or truncate the `?secret=` query string when it fires the webhook (this is the one delivery-mechanics assumption in this trigger that has not been confirmed against a live Jira site).
6. Confirm a downstream Jira action node can reply using `{{$json.projectKey}}` and `{{$json.issueKey}}`.
7. Test the "Send test webhook" feature in Jira's WebHooks admin UI (if available on the account) or trigger a real event and confirm the `eventTypes`/`projectKey`/`query` filters correctly ignore events that don't match the trigger's configuration.
8. Confirm behavior when a Jira site requires SSO/2FA for the API-token-owning account â€” API tokens are meant to bypass this for API calls, but should be spot-checked once against a real site with SSO enforced.

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `jira_api_key` (reused from the existing `jira` action node).
- Is it OAuth, bot token, API key, app credential, or provider-specific token: it is a provider-specific API token used over Basic Auth (email + API token, base64-encoded into an `Authorization: Basic` header) â€” explicitly NOT full Atlassian OAuth2 (3LO). This is Jira Cloud's simplest, most common self-service auth model. No OAuth2 app registration, client ID/secret, or authorization-code flow exists for this credential.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`jira_api_key`, `authType: 'basic_auth'`, fields: `username` labeled "Email Address", `password` labeled "API Token" (masked, `secret: true`, help text pointing at `id.atlassian.com/manage-profile/security/api-tokens`), `domain` labeled "Domain").
- Which file defines the connector catalog entry: `worker/src/services/connectors/connector-registry.ts` (`jira` connector, extended with `trigger.webhook`/`jira.receive` capabilities, `nodeTypes` now includes both `jira` and `jira_trigger`).
- Which UI fields the user sees in the Connections panel: "Email Address" (text), "API Token" (password, masked, with help text pointing at the exact Atlassian token-creation URL), "Domain" (url-typed field, placeholder `yourcompany.atlassian.net`) â€” not a generic "API Key" or "Bearer Token" field.
- Which trigger node settings are safe non-secret config: `siteUrl`, `projectKey`, `eventTypes`, `jql` (a reminder field only â€” the actual JQL filter, if used, is configured directly in Jira's own WebHooks admin UI, not sent to or enforced by CtrlChecks), `query`.
- Which fields are masked secrets: the optional `secretToken` node-level override (masked password field, rarely used since CtrlChecks generates one automatically) and the webhook secret itself (server-generated per node, stored in Redis, embedded in the webhook URL returned to the user â€” since the user must paste the full URL including the secret into Jira's UI, unlike GitLab/GitHub's header-only secrets, this one is necessarily shown to the user once at registration time rather than never rendered back).
- What webhook validation is used: a per-node shared secret sent as a `?secret=` query parameter (or optionally an `X-Jira-Webhook-Secret` header), validated with a `crypto.timingSafeEqual` constant-time string compare â€” explicitly confirmed NOT to be HMAC or JWT. Jira Cloud webhook payloads carry no signature of any kind.
- What scopes/permissions are required: none in the OAuth-scope sense (`PROVIDER_REQUIRED_SCOPES.jira = []` in `credential-scope-registry.ts`) â€” the API token's effective permissions are whatever the underlying Atlassian account has in Jira itself (read/write issues, and, separately and outside CtrlChecks' control, whether that account has "Administer Jira" global permission needed to create entries on the System WebHooks admin page, or is a project admin who can use Automation for Jira instead).
- How the action/reply node is authenticated: the existing `jira` action node (`worker/src/api/execute-workflow.ts`'s `case 'jira':` block) uses the same `jira_api_key` credential (email + API token + domain, resolved via the credential injection engine's alias map: `username`â†’`email`, `password`â†’`apiToken`, `domain`â†’`baseUrl`); can reply/create issues/comments using `{{$json.projectKey}}`, `{{$json.issueKey}}` from the trigger output.
- Which tests prove the model: `jira-trigger-integration-contract.test.ts` asserts the credential map points at `jira_api_key` with `authType: 'basic_auth'` and the expected `username`/`password`/`domain` fields, the connector id (`jira`) and `nodeTypes`/`capabilities` are correct, and the trigger does not collide with the action node's category; `jira-trigger-service.test.ts` asserts `validateJiraSecret` is a plain compare (matching secrets pass, mismatched secrets fail, empty inputs fail) with no HMAC/JWT computation anywhere in the implementation, `resolveJiraCredential` parses the Basic Auth shape (not a bearer token), and `registerJiraWebhook` makes at most one HTTP call (the optional `GET /rest/api/3/myself` verification) and never calls any Jira webhook-registration endpoint.

### Trello Trigger Implementation Notes

Completed on 2026-07-18. Audit finding: the existing Trello support was action-only. The `trello_api_key` credential type (Trello API key + user token), `trello` connector, frontend Trello action node, and backend Trello action execution path already existed. No `trello_trigger` node type, webhook endpoints, auto-registration, docs, or tests existed.

Official docs verified during implementation: Trello webhooks are created under the user's token at `POST /1/tokens/{APIToken}/webhooks/?key={APIKey}`, Trello validates the callback URL with an HTTP `HEAD` request that must return 200, and delivery signatures use `X-Trello-Webhook` as a base64 HMAC-SHA1 over `rawBody + exactCallbackURL`, signed with the Trello app secret from the API key page. Source: https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/

- New files:
  - `worker/src/services/trello/trello-trigger-service.ts` - Trello credential resolution, callback URL generation, Redis-backed webhook state (`trello:webhook:{workflowId}:{nodeId}`), Trello token-scoped webhook create/delete calls, `X-Trello-Webhook` HMAC validation, payload normalization, filters, and active-workflow auto-registration.
  - `worker/src/api/trello-trigger.ts` - webhook info/receive/register/unregister handlers, plus the required `HEAD /api/trello/webhook/:workflowId/:nodeId` callback validation response for Trello registration.
  - `worker/src/core/registry/overrides/trello-trigger.ts` - registry override for `trello_trigger`, `category: 'triggers'`, no-op `execute`, output schema, defaults, and config validation.
  - Tests: `worker/src/services/trello/trello-trigger-service.test.ts`, `worker/src/core/registry/__tests__/trello-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/trello-trigger-node-types.test.ts`.
  - Docs/search: `ctrl_checks/src/docs-content/nodes/trello_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/trello_trigger.ts`.
- Backend webhook endpoints:
  - `HEAD/GET/POST /api/trello/webhook/:workflowId/:nodeId`
  - `POST /api/trello/webhook/register` / `POST /api/trello/webhook/unregister`
- Credential decision: reused `trello_api_key`, but expanded it with an optional masked `appSecret` field. The field is optional in the shared credential registry so existing Trello action-node connections are not broken, but Trello Trigger registration requires it because webhook delivery signatures cannot be validated without the app secret. No new credential type was created.
- Registration model: automatic when the workflow is saved/activated, provided the user has a saved Trello connection with `apiKey`, `token`, and `appSecret`, and the trigger has a `modelId` (or `boardId` fallback). Registration calls the official token-scoped Trello webhook endpoint with `{ callbackURL, idModel, description }`. Trello's own `HEAD` validation is supported by the worker before the webhook is accepted.
- No renewal scheduler was added. Trello webhooks do not use the short-lived watch-channel expiration pattern used by Google/Microsoft watch APIs.
- Normalized output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `actionId`, `actionType`, `boardId`, `boardName`, `boardUrl`, `listId`, `listName`, `listBeforeId`, `listBeforeName`, `listAfterId`, `listAfterName`, `cardId`, `cardName`, `cardUrl`, `cardShortLink`, `commentText`, `checklistId`, `checklistName`, `checkItemId`, `checkItemName`, `memberId`, `memberName`, and `raw`.
- Event mapping covers `createCard` -> `card_created`, `updateCard` -> `card_updated` or `card_moved` when Trello sends list-before/list-after data, `commentCard` -> `card_commented`, plus checklist, list, member, and label activity.
- Filtering supports `eventTypes`, `boardId`, `listId`, `cardId`, `memberId`, and `query`.
- Execution creation uses `normalizeExecutionTrigger('trello', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'trello'`.
- Internal handoff sends `X-Internal-Trello-Execution: true` and `X-Internal-Trigger-Execution: true`. Handoff failures mark the pre-created execution `failed` with the real error.
- Registry/allowlists: `trello_trigger` added to `unified-node-registry-overrides.ts`, alias-map entries + credential map entry in `unified-node-registry.ts`, schema in `node-library.ts`, connector capabilities (`trigger.webhook`, `trello.receive`) and `nodeTypes`, credential scope provider mapping, all 6 known-trigger allowlists (`workflowGraphValidator.ts` has both occurrences), and active-workflow auto-registration in `db-proxy.ts`.
- Frontend: node picker entry placed directly after Trello action with safe non-secret settings only (`modelId`, `eventTypes`, `boardId`, `listId`, `cardId`, `memberId`, `query`), logo mapping reusing `Trello.svg`, backend-supported type, layman description, docs manifest/index/search entries.

Verification completed:

- `cd worker && npm run type-check` - passed.
- `cd worker && npx jest src/services/trello/trello-trigger-service.test.ts src/core/registry/__tests__/trello-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` - 4 suites, 26 tests passed. Existing warning/open handle noted from Snowflake SDK `CustomGC` via `test/jest.setup.ts`, unrelated to Trello.
- `cd worker && npm run lint` - passed.
- `cd worker && npm run build` - passed (174 node schemas exported, up from 173).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/trello-trigger-node-types.test.ts` - 2 tests passed.
- `cd ctrl_checks && npm run build` - passed.
- `bash scripts/deploy-worker.sh` could not run in this Windows environment because `/bin/bash` is unavailable (`execvpe(/bin/bash) failed: No such file or directory`). The same deploy flow was then run successfully via PowerShell/OpenSSH: worker type-check, lint, build substeps, tar package, scp upload, remote extract/install, `systemctl restart ctrlchecks-worker`, and health checks.
- Production health after deploy:
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health/live` - returned `{"status":"live",...}`.
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health` - returned `{"status":"healthy",...}`.
  - Remote `curl -fsS http://localhost:3001/health/live` over SSH also returned `{"status":"live",...}`.

Not yet live-tested with a real Trello account/webhook (no live Trello credentials available in this session). Manual live test steps for a future pass:

1. Create or open a Trello API key at `https://trello.com/app-key`, generate a user token, and copy the app secret from the same API key page.
2. Connect Trello in Connections with API Key, Token, and App Secret.
3. Add a Trello Trigger node, set `modelId` to a board/card/list ID to watch (or use `boardId` as the board-specific fallback), activate and save the workflow, and confirm auto-registration returns a Trello webhook id and callback URL.
4. In Trello, create a card, move it between lists, update it, and add a comment; confirm executions appear with normalized `$json.cardId`, `$json.cardName`, `$json.listBeforeId`, `$json.listAfterId`, and `$json.commentText` fields as applicable.
5. Confirm filters (`eventTypes`, `boardId`, `listId`, `cardId`, `memberId`, `query`) suppress non-matching Trello actions without creating executions.
6. Confirm a downstream Trello action node can use the same saved connection and trigger output, for example `{{$json.cardId}}` for card updates or `{{$json.listAfterId}}` for follow-up list operations.
7. Rotate the Trello app secret or remove the local Redis state and confirm invalid `X-Trello-Webhook` signatures are rejected with 401 and do not create executions.

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `trello_api_key` (reused from the existing `trello` action node).
- Is it OAuth, bot token, API key, app credential, or provider-specific token: provider-specific Trello REST auth using API key + user token, plus app secret for webhook signature validation. This is not OAuth2 in this codebase.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`trello_api_key`, fields: `apiKey`, `token`, optional masked `appSecret`; `maskFields` includes all three).
- Which file defines the connector catalog entry: `worker/src/services/connectors/connector-registry.ts` (`trello` connector, extended with `trigger.webhook`/`trello.receive`, `nodeTypes` now includes both `trello` and `trello_trigger`).
- Which UI fields the user sees in the Connections panel: "API Key", "Token", and optional "App Secret" from `worker/src/api/connections-catalog.ts`; all secret fields are password/masked-style inputs.
- Which trigger node settings are safe non-secret config: `modelId`, `eventTypes`, `boardId`, `listId`, `cardId`, `memberId`, `query`.
- Which fields are masked secrets: Trello API key, user token, app secret in the saved credential. The generated Trello callback URL contains workflow/node IDs only, not a secret; request authenticity comes from `X-Trello-Webhook`.
- What webhook validation is used: `X-Trello-Webhook` base64 HMAC-SHA1 over `rawRequestBody + exactCallbackURL`, signed with the Trello app secret, compared using `crypto.timingSafeEqual`. The callback URL must match exactly the URL Trello registered.
- What scopes/permissions are required: Trello token permissions sufficient to create/delete webhooks on the watched model and to read the board/card/list activity the webhook reports. The credential-scope registry maps `trello_trigger` to provider `trello`; Trello's key/token model has no OAuth scope array in this app.
- How the action/reply node is authenticated: the existing `trello` action node uses the same `trello_api_key` saved connection and can consume trigger output such as `{{$json.cardId}}`, `{{$json.listAfterId}}`, `{{$json.boardId}}`, or `{{$json.commentText}}`.
- Which tests prove the model: `trello-trigger-integration-contract.test.ts` asserts the trigger schema, output contract, credential map, connector id/nodeTypes/capabilities, and non-collision with the action node; `trello-trigger-service.test.ts` asserts payload normalization, event/filter behavior, HMAC signature validation, credential resolution including `appSecret`, webhook registration/unregistration, and active-workflow auto-registration.

### Linear Trigger Implementation Notes

Completed on 2026-07-18. Audit finding: Linear already had OAuth2 and Personal API Key credential definitions plus a `linear` action node for issue/team operations. No `linear_trigger` node type, webhook service, webhook endpoints, auto-registration, docs, or trigger tests existed.

Official docs verified during implementation: Linear data-change webhooks can be configured for all public teams or a single team; only workspace admins or OAuth apps with `admin` scope can create/read webhooks; API registration uses the GraphQL `webhookCreate` mutation with `url`, `teamId` or `allPublicTeams`, and `resourceTypes`; deletion uses `webhookDelete`; delivery headers include `Linear-Delivery`, `Linear-Event`, `Linear-Signature`, and `Linear-Timestamp`; signature validation is HMAC-SHA256 over the raw request body with the webhook signing secret; Linear recommends rejecting requests outside a one-minute timestamp window. Source: https://linear.app/developers/webhooks

- New files:
  - `worker/src/services/linear/linear-trigger-service.ts` - Linear credential resolution, GraphQL webhook create/delete, CtrlChecks-generated per-node webhook secret storage in Redis (`linear:webhook:{workflowId}:{nodeId}`), `Linear-Signature` HMAC validation, one-minute replay window, normalization, filters, and active-workflow auto-registration.
  - `worker/src/api/linear-trigger.ts` - webhook info/receive/register/unregister handlers. The receive handler validates signature + timestamp before normalizing/filtering/creating the execution and handing off internally.
  - `worker/src/core/registry/overrides/linear-trigger.ts` - registry override for `linear_trigger`, `category: 'triggers'`, no-op `execute`, output schema, defaults, and config validation.
  - Tests: `worker/src/services/linear/linear-trigger-service.test.ts`, `worker/src/core/registry/__tests__/linear-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/linear-trigger-node-types.test.ts`.
  - Docs/search: `ctrl_checks/src/docs-content/nodes/linear_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/linear_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/linear/webhook/:workflowId/:nodeId`
  - `POST /api/linear/webhook/register` / `POST /api/linear/webhook/unregister`
- Credential decision: reused `linear_api_key` from the existing Linear action node. `linear_oauth2` is also accepted as a runtime fallback by credential resolution, matching the codebase's existing Linear OAuth2 credential definition. No new credential type or plaintext node-level secret field was added.
- Registration model: automatic when the workflow is saved/activated. The trigger registers a Linear webhook with a CtrlChecks-generated signing secret passed in `WebhookCreateInput.secret`, stores the same secret in Redis, and never exposes it back in the register API response. The user can set `teamId` for one team or leave it blank for `allPublicTeams: true`; `resourceTypes` defaults to `Issue, Comment`.
- No renewal scheduler was added. Linear webhooks do not use the short-lived watch-channel expiration model used by Google/Microsoft watch APIs.
- Normalized output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `deliveryId`, `linearEvent`, `action`, `entityType`, `entityId`, `organizationId`, `webhookId`, `webhookTimestamp`, `url`, `teamId`, `teamKey`, `teamName`, `issueId`, `issueIdentifier`, `issueTitle`, `issueUrl`, `stateId`, `stateName`, `assigneeId`, `assigneeName`, `commentId`, `commentBody`, `projectId`, `projectName`, and `raw`.
- Event mapping turns Linear `{ type: 'Issue', action: 'create' }` into `issue_created`, `update` into `issue_updated`, `remove` into `issue_removed`, and applies the same normalized pattern to comments, projects, cycles, labels, reactions, documents, initiatives, customers, and users.
- Filtering supports `eventTypes`, `teamId`, `issueId` (UUID or identifier), `projectId`, `actorId`, and `query`.
- Execution creation uses `normalizeExecutionTrigger('linear', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'linear'`.
- Internal handoff sends `X-Internal-Linear-Execution: true` and `X-Internal-Trigger-Execution: true`. Handoff failures mark the pre-created execution `failed` with the real error.
- Registry/allowlists: `linear_trigger` added to `unified-node-registry-overrides.ts`, alias-map entries + credential map entry in `unified-node-registry.ts`, schema in `node-library.ts`, connector capabilities (`trigger.webhook`, `linear.receive`) and `nodeTypes`, credential scope provider mapping, all 6 known-trigger allowlists (`workflowGraphValidator.ts` has both occurrences), and active-workflow auto-registration in `db-proxy.ts`.
- Frontend: node picker entry placed directly after Linear action with safe non-secret settings only (`teamId`, `allPublicTeams`, `resourceTypes`, `eventTypes`, `issueId`, `projectId`, `actorId`, `query`), usage guide/output hints, logo mapping reusing `Linear.svg`, backend-supported type, layman description, docs manifest/index/search entries.

Verification completed:

- `cd worker && npm run type-check` - passed.
- `cd worker && npx jest src/services/linear/linear-trigger-service.test.ts src/core/registry/__tests__/linear-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` - 4 suites, 25 tests passed. Existing warning/open handle noted from Snowflake SDK `CustomGC` via `test/jest.setup.ts`, unrelated to Linear.
- `cd worker && npm run lint` - passed.
- `cd worker && npm run build` - passed (175 node schemas exported, up from 174).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/linear-trigger-node-types.test.ts` - 2 tests passed.
- `cd ctrl_checks && npm run build` - passed, including generated `linear_trigger-F13jm92u.js`.
- `bash scripts/deploy-worker.sh` remains unavailable in this Windows environment because `/bin/bash` is missing. The same deploy flow was run via PowerShell/OpenSSH: package, scp upload, remote extract/install, Prisma migrate deploy (no pending migrations), and `systemctl restart ctrlchecks-worker`. One piped remote script hit a CRLF issue where systemd saw `ctrlchecks-worker\r`; the service was immediately restarted successfully with a one-line SSH command.
- Production health after deploy:
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health/live` - returned `{"status":"live",...}`.
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health` - returned `{"status":"healthy",...}`.
  - Remote `curl -fsS http://localhost:3001/health/live` over SSH also returned `{"status":"live",...}`.

Not yet live-tested with a real Linear workspace (no live Linear credentials available in this session). Manual live test steps for a future pass:

1. Create a Linear Personal API Key from a workspace admin account, or connect Linear OAuth with an app that has admin access for webhook creation.
2. Add a Linear Trigger node to an active workflow. Leave Team ID blank for all public teams or set a specific Linear team UUID; choose resource types such as `Issue, Comment`.
3. Save/activate the workflow and confirm `linearWebhookRegistrations` returns a webhook id and callback URL.
4. In Linear, create an issue, update its title/state/assignee, remove or archive it if appropriate, and add a comment; confirm executions appear with normalized `$json.issueId`, `$json.issueIdentifier`, `$json.issueTitle`, `$json.teamId`, and `$json.commentBody` fields.
5. Confirm filters (`eventTypes`, `teamId`, `issueId`, `projectId`, `actorId`, `query`) suppress non-matching events without creating executions.
6. Confirm a downstream Linear action node can use the same saved connection and trigger output, for example `{{$json.issueId}}` for `update_issue`.
7. Replay an old payload or sign a payload with the wrong secret and confirm the worker rejects it with 401 and creates no execution.

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `linear_api_key` (reused from the existing `linear` action node); `linear_oauth2` is accepted as a fallback by the trigger service.
- Is it OAuth, bot token, API key, app credential, or provider-specific token: primarily a Linear Personal API Key (`lin_api_...`) sent in the authorization header using the existing app pattern; OAuth2 access tokens are supported as Bearer tokens if present.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`linear_api_key`, `authType: 'bearer_token'`, field `token` labeled "Personal API Key", masked; `linear_oauth2` also exists with Linear OAuth URLs and `read,write` default scopes).
- Which file defines the connector catalog entry: `worker/src/services/connectors/connector-registry.ts` (`linear` connector, extended with `trigger.webhook`/`linear.receive`, `nodeTypes` now includes both `linear` and `linear_trigger`).
- Which UI fields the user sees in the Connections panel: "Personal API Key" password input from `worker/src/api/connections-catalog.ts`, with docs URL pointing to Linear API docs. No webhook secret field is shown because CtrlChecks generates and stores the webhook signing secret per node.
- Which trigger node settings are safe non-secret config: `teamId`, `allPublicTeams`, `resourceTypes`, `eventTypes`, `issueId`, `projectId`, `actorId`, `query`.
- Which fields are masked secrets: Linear Personal API Key / OAuth tokens in the saved credential; per-node Linear webhook signing secret generated by CtrlChecks and stored in Redis, never rendered back to users.
- What webhook validation is used: `Linear-Signature` hex HMAC-SHA256 over the raw request body using the stored per-node secret, compared with `crypto.timingSafeEqual`; request timestamp must be within one minute using `webhookTimestamp` or `Linear-Timestamp`.
- What scopes/permissions are required: for the API-key path, the key must belong to a Linear workspace admin to create/read webhooks. For OAuth apps, Linear documents that the app needs `admin` scope for webhook creation/reading; existing OAuth defaults are `read,write`, so OAuth users may need reconnecting with broader scopes if webhook registration is attempted through OAuth.
- How the action/reply node is authenticated: the existing `linear` action node uses the same saved Linear credential and can consume trigger output such as `{{$json.issueId}}`, `{{$json.issueIdentifier}}`, `{{$json.teamId}}`, `{{$json.issueTitle}}`, and `{{$json.commentBody}}`.
- Which tests prove the model: `linear-trigger-integration-contract.test.ts` asserts the trigger schema, output contract, credential map, connector id/nodeTypes/capabilities, and non-collision with the action node; `linear-trigger-service.test.ts` asserts normalization for issue/comment/project events, HMAC signature validation over raw body, timestamp replay guard, credential resolution for API key and OAuth, webhook create/delete registration, Redis-backed signature validation, filters, and active-workflow auto-registration.

### Stripe Trigger Implementation Notes

Completed on 2026-07-18. Audit finding: Stripe already had `stripe_api_key`, a connector entry, an action node, action docs, and action search docs. No `stripe_trigger` node type, webhook service, webhook endpoints, auto-registration, docs, or trigger tests existed.

Official docs verified during implementation: Stripe webhook endpoints are created with `url` and `enabled_events`; delivery requests include `Stripe-Signature`; signature validation uses the endpoint signing secret, timestamp, raw request body, and one or more `v1` HMAC-SHA256 signatures; webhook endpoint `secret` is only returned at creation time. Sources: https://docs.stripe.com/webhooks and https://docs.stripe.com/api/webhook_endpoints/create

- New files:
  - `worker/src/services/stripe/stripe-trigger-service.ts` - Stripe credential resolution, webhook endpoint create/delete, Redis-backed endpoint state (`stripe:webhook:{workflowId}:{nodeId}`), `Stripe-Signature` HMAC validation, 5-minute replay window, event normalization, filters, and active-workflow auto-registration.
  - `worker/src/api/stripe-trigger.ts` - webhook info/receive/register/unregister handlers. The receive handler validates the Stripe signature before normalizing/filtering/creating the execution and handing off internally.
  - `worker/src/core/registry/overrides/stripe-trigger.ts` - registry override for `stripe_trigger`, `category: 'triggers'`, no-op `execute`, output schema, defaults, and config validation.
  - Tests: `worker/src/services/stripe/stripe-trigger-service.test.ts`, `worker/src/core/registry/__tests__/stripe-trigger-integration-contract.test.ts`, `ctrl_checks/src/components/workflow/__tests__/stripe-trigger-node-types.test.ts`.
  - Docs/search: `ctrl_checks/src/docs-content/nodes/stripe_trigger.doc.ts`, `ctrl_checks/src/docs-content/search/stripe_trigger.ts`.
- Backend webhook endpoints:
  - `GET/POST /api/stripe/webhook/:workflowId/:nodeId`
  - `POST /api/stripe/webhook/register` / `POST /api/stripe/webhook/unregister`
- Credential decision: reused `stripe_api_key` from the existing Stripe action node. Legacy `stripe` vault entries are accepted as fallback. No new credential type and no plaintext node-level API key/signing-secret field were added.
- Registration model: automatic when the workflow is saved/activated. The trigger creates a Stripe webhook endpoint with the selected `enabled_events[]`, stores the returned endpoint id and `whsec_...` signing secret in Redis, and suppresses the signing secret in register API responses.
- No renewal scheduler was added. Stripe webhook endpoints do not use the short-lived watch-channel expiration model used by Google/Microsoft watch APIs.
- Normalized output includes `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `livemode`, `apiVersion`, `accountId`, `objectId`, `objectType`, `customerId`, `customerEmail`, `amount`, `amountReceived`, `amountPaid`, `amountTotal`, `currency`, `status`, `paymentIntentId`, `chargeId`, `checkoutSessionId`, `invoiceId`, `subscriptionId`, `paymentMethodId`, `receiptUrl`, `description`, `metadata`, and `raw`.
- Filtering supports `eventTypes`, `livemode`, `customerId`, `currency`, `minAmount`, and `query`.
- Execution creation uses `normalizeExecutionTrigger('stripe', 'webhook')` and `normalizeExecutionStatus(...)`, metadata `originalTrigger: 'stripe'`.
- Internal handoff sends `X-Internal-Stripe-Execution: true` and `X-Internal-Trigger-Execution: true`. Handoff failures mark the pre-created execution `failed` with the real error.
- Registry/allowlists: `stripe_trigger` added to `unified-node-registry-overrides.ts`, alias-map entries + credential map entry in `unified-node-registry.ts`, schema in `node-library.ts`, connector capabilities (`trigger.webhook`, `stripe.receive`) and `nodeTypes`, credential scope provider mapping, all 6 known-trigger allowlists (`workflowGraphValidator.ts` has both occurrences), and active-workflow auto-registration in `db-proxy.ts`.
- Frontend: node picker entry placed directly after Stripe action with safe non-secret settings only (`eventTypes`, `connect`, `livemode`, `customerId`, `currency`, `minAmount`, `query`), usage guide/output hints, logo mapping reusing `Stripe.svg`, backend-supported type, layman description, docs manifest/index/search entries.

Verification completed:

- `cd worker && npm run type-check` - passed.
- `cd worker && npx jest src/services/stripe/stripe-trigger-service.test.ts src/core/registry/__tests__/stripe-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` - 4 suites, 24 tests passed. Existing warning/open handle noted from Snowflake SDK `CustomGC` via `test/jest.setup.ts`, unrelated to Stripe.
- `cd worker && npm run lint` - passed.
- `cd worker && npm run build` - passed (176 node schemas exported, up from 175).
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/stripe-trigger-node-types.test.ts` - 2 tests passed.
- `cd ctrl_checks && npm run build` - passed, including generated `stripe_trigger-BD6OPVH7.js`.
- `bash scripts/deploy-worker.sh` remains unavailable in this Windows environment because `/bin/bash` is missing. The same deploy flow was run via PowerShell/OpenSSH: package, scp upload, remote extract/install, Prisma migrate deploy (no migrations found), and `systemctl restart ctrlchecks-worker`.
- Production health after deploy:
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health/live` - returned `{"status":"live",...}`.
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health` - returned `{"status":"healthy",...}`.
  - Remote `curl -fsS http://localhost:3001/health/live` over SSH also returned `{"status":"live",...}`.

Not yet live-tested with a real Stripe account (no live Stripe credentials available in this session). Manual live test steps for a future pass:

1. Create or choose a Stripe test-mode Secret key from Stripe Dashboard -> Developers -> API keys.
2. Add a Stripe Trigger node to an active workflow and choose event types such as `checkout.session.completed`, `payment_intent.succeeded`, and `invoice.payment_succeeded`.
3. Save/activate the workflow and confirm `stripeWebhookRegistrations` returns an endpoint id and callback URL with `signingSecretStored: true`.
4. In Stripe Dashboard -> Developers -> Webhooks, confirm the endpoint exists and points to `/api/stripe/webhook/:workflowId/:nodeId`.
5. Send test events from Stripe, or complete a test Checkout/PaymentIntent, and confirm executions appear with normalized `$json.paymentIntentId`, `$json.customerId`, `$json.amount`, `$json.currency`, and `$json.status` fields.
6. Confirm filters (`eventTypes`, `livemode`, `customerId`, `currency`, `minAmount`, `query`) suppress non-matching events without creating executions.
7. Confirm a downstream Stripe action node can use the same saved connection and trigger output, for example `{{$json.paymentIntentId}}` for a follow-up lookup/refund workflow.
8. Replay an old payload or sign a payload with the wrong endpoint secret and confirm the worker rejects it with 401 and creates no execution.

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `stripe_api_key` (reused from the existing `stripe` action node); legacy vault key `stripe` is accepted as fallback.
- Is it OAuth, bot token, API key, app credential, or provider-specific token: Stripe Secret Key (`sk_test_...` or `sk_live_...`) sent as a Bearer token to Stripe API.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`stripe_api_key`, `authType: 'bearer_token'`, field `token` labeled "Secret Key", masked, test request `GET https://api.stripe.com/v1/account`).
- Which file defines the connector catalog entry: `worker/src/services/connectors/connector-registry.ts` (`stripe` connector, extended with `trigger.webhook`/`stripe.receive`, `nodeTypes` now includes both `stripe` and `stripe_trigger`).
- Which UI fields the user sees in the Connections panel: "Secret Key" password input from the Stripe credential type. No webhook signing secret field is shown because Stripe returns it only at endpoint creation and CtrlChecks stores it per node.
- Which trigger node settings are safe non-secret config: `eventTypes`, `connect`, `livemode`, `customerId`, `currency`, `minAmount`, `query`.
- Which fields are masked secrets: Stripe Secret Key in the saved credential; per-node Stripe webhook signing secret stored in Redis, never rendered back to users.
- What webhook validation is used: `Stripe-Signature` with timestamp `t=` and `v1=` HMAC-SHA256 over `${timestamp}.${rawBody}`, compared with `crypto.timingSafeEqual`; deliveries outside the 5-minute tolerance window are rejected.
- What scopes/permissions are required: the Stripe key must be allowed to create/delete webhook endpoints and receive the selected event types. Restricted keys may need explicit webhook endpoint permissions.
- How the action/reply node is authenticated: the existing `stripe` action node uses the same saved Stripe credential and can consume trigger output such as `{{$json.paymentIntentId}}`, `{{$json.customerId}}`, `{{$json.chargeId}}`, `{{$json.amount}}`, and `{{$json.currency}}`.
- Which tests prove the model: `stripe-trigger-integration-contract.test.ts` asserts the trigger schema, output contract, credential map, connector id/nodeTypes/capabilities, and non-collision with the action node; `stripe-trigger-service.test.ts` asserts normalization for PaymentIntent/Checkout/invoice/subscription/charge events, HMAC signature validation over raw body with timestamp tolerance, credential resolution for current and legacy vault keys, webhook create/delete registration, Redis-backed signature validation, filters, and active-workflow auto-registration.

### Shopify Trigger Implementation Notes

Completed on 2026-07-18:

- Added production Shopify webhook endpoints:
  - `GET /api/shopify/webhook/:workflowId/:nodeId`
  - `POST /api/shopify/webhook/:workflowId/:nodeId`
  - `POST /api/shopify/webhook/register`
  - `POST /api/shopify/webhook/unregister`
- Added Shopify webhook registration using the Admin REST API:
  - `POST https://{shopDomain}/admin/api/{apiVersion}/webhooks.json`
  - one webhook subscription per configured topic
  - default API version `2025-10`, overridable with `SHOPIFY_API_VERSION`
  - default topics: `orders/create`, `orders/paid`, `orders/updated`, `orders/cancelled`, `orders/fulfilled`, `customers/create`, `customers/update`, `products/create`, `products/update`, `products/delete`, `refunds/create`, `checkouts/create`, `checkouts/update`, `app/uninstalled`
  - unregister deletes each stored webhook ID with `DELETE /webhooks/{id}.json`
- Added Redis-backed Shopify trigger state:
  - key: `shopify:webhook:{workflowId}:{nodeId}`
  - stores `webhookIds`, `topics`, `webhookSecret`, `webhookUrl`, `shopDomain`, `apiVersion`, `userId`, `workflowId`, and `nodeId`
- Added Shopify HMAC validation:
  - reads `X-Shopify-Hmac-Sha256`
  - computes HMAC-SHA256 over the raw request body using the saved app client secret/webhook signing secret
  - compares base64 decoded buffers with `crypto.timingSafeEqual`
  - rejects topic or shop-domain mismatches against the Redis state
- Added normalized Shopify trigger output:
  - `eventId`, `eventType`, `source`, `userId`, `username`, `text`, `timestamp`, `raw`
  - `topic`, `shopDomain`, `webhookId`, `apiVersion`, `objectId`, `adminGraphqlApiId`
  - `orderId`, `orderName`, `orderNumber`, `financialStatus`, `fulfillmentStatus`
  - `totalPrice`, `subtotalPrice`, `totalTax`, `currency`
  - `customerId`, `customerEmail`, `customerName`
  - `productId`, `productTitle`, `variantId`, `inventoryItemId`
  - `checkoutId`, `cartToken`, `refundId`, `lineItems`
- Added event filtering by `topics`/`eventTypes`, `shopDomain`, `financialStatus`, `fulfillmentStatus`, `customerId`, `productId`, `minTotalPrice`, `currency`, and `query`.
- Execution creation uses `normalizeExecutionTrigger('shopify', 'webhook')` and `normalizeExecutionStatus(...)`, with metadata `originalTrigger: 'shopify'` and `triggerNodeId`.
- Internal handoff sends `X-Internal-Shopify-Execution: true` and `X-Internal-Trigger-Execution: true`.
- Handoff failures mark the pre-created execution `failed` with the real error.
- Added active-workflow auto-registration through `worker/src/api/db-proxy.ts`, returning `shopifyWebhookRegistrations` on active workflow save.
- Reused and expanded the existing Shopify credential model:
  - `shopify_api_key` remains the exact credential type ID.
  - Added optional masked `clientSecret` field for trigger HMAC validation.
  - Existing action-node auth was tightened to read `shopify_api_key` first and parse `storeUrl`/`shopDomain` plus `token`/`apiKey`/`accessToken`, while retaining legacy `shopify` vault fallback.
  - Frontend Shopify action node no longer shows a visible access-token field for new node config; legacy config still executes if already present.
- Added/updated backend registry/schema/credential wiring:
  - `worker/src/services/shopify/shopify-trigger-service.ts`
  - `worker/src/api/shopify-trigger.ts`
  - `worker/src/core/registry/overrides/shopify-trigger.ts`
  - `worker/src/core/registry/unified-node-registry-overrides.ts`
  - `worker/src/core/registry/unified-node-registry.ts`
  - `worker/src/services/nodes/node-library.ts`
  - `worker/src/services/connectors/connector-registry.ts`
  - `worker/src/services/credential-scope-registry.ts`
  - `worker/src/credentials-system/credential-type-registry.ts`
  - `worker/src/api/connections-catalog.ts`
  - `worker/src/api/execute-workflow.ts`
  - `worker/src/index.ts`
  - `worker/public/node-library.json` regenerated with 177 schemas
- Added `shopify_trigger` to all six known-trigger allowlists:
  - `worker/src/core/execution/unified-execution-engine.ts`
  - `worker/src/core/utils/workflow-graph-normalizer.ts`
  - `worker/src/core/validation/workflow-save-validator.ts`
  - `ctrl_checks/src/lib/comprehensiveWorkflowValidation.ts`
  - `ctrl_checks/src/lib/workflowGraphValidator.ts` (both occurrences)
  - `services/workflow-crud-service/src/lib/workflow-validator-lite.ts`
- Added frontend node picker/catalog/docs/search support:
  - `ctrl_checks/src/components/workflow/nodeTypes.ts`
  - `ctrl_checks/src/components/workflow/backendSupportedNodeTypes.ts`
  - `ctrl_checks/src/lib/integrationLogos.ts`
  - `ctrl_checks/src/components/workflow/nodeLaymanDescriptions.ts`
  - `ctrl_checks/src/docs-content/nodes/shopify_trigger.doc.ts`
  - `ctrl_checks/src/docs-content/search/shopify_trigger.ts`
  - `ctrl_checks/src/docs-content/index.ts`
  - `ctrl_checks/src/docs-content/manifest.ts`
  - `ctrl_checks/src/docs-content/search-index.ts`
- Added focused tests:
  - `worker/src/services/shopify/shopify-trigger-service.test.ts`
  - `worker/src/core/registry/__tests__/shopify-trigger-integration-contract.test.ts`
  - `ctrl_checks/src/components/workflow/__tests__/shopify-trigger-node-types.test.ts`

Verification completed:

- `cd worker && npm run type-check` - passed.
- `cd worker && npx jest src/services/shopify/shopify-trigger-service.test.ts src/core/registry/__tests__/shopify-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles` - passed: 4 suites, 25 tests. Existing unrelated Snowflake SDK `CustomGC` open-handle warning remains.
- `cd worker && npm run lint` - passed.
- `cd worker && npm run build` - passed; 177 node schemas exported.
- `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/shopify-trigger-node-types.test.ts` - passed: 2 tests.
- `cd ctrl_checks && npx vitest run src/lib/__tests__/workflow-guidance.test.ts` - passed: 62 tests.
- `cd ctrl_checks && npm run build` - passed; generated `shopify_trigger-XKWL7ylD.js`.
- Deployed worker via PowerShell/OpenSSH because local `/bin/bash` is unavailable.
  - package uploaded to `/tmp/worker-deploy.tar.gz`
  - `npm ci --omit=dev` completed on the server
  - no DB migrations were required; `prisma migrate deploy` reported the known existing-production-baseline `P3005`, so migration was skipped for this no-migration deploy
  - `systemctl restart ctrlchecks-worker` completed and service is active
- Health checks after deploy:
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health/live` -> live
  - `curl.exe -fsS https://worker.ctrlchecks.ai/health` -> healthy
  - remote `curl -fsS http://localhost:3001/health/live` -> live

Manual live-test steps for later:

1. Create or choose a Shopify custom app with Admin API access.
2. Confirm the app has permissions for the topics the workflow subscribes to, such as orders, customers, products, refunds, and checkouts. Webhook management/topic permissions may need to be enabled in the custom app.
3. Save a Shopify connection in CtrlChecks with:
   - Store URL / shop domain, e.g. `my-store.myshopify.com`
   - Admin API access token, e.g. `shpat_...`
   - App client secret / webhook signing secret for `X-Shopify-Hmac-Sha256` validation
4. Add Shopify Trigger to an active workflow and configure topics such as `orders/create, orders/paid`.
5. Save/activate the workflow and confirm `shopifyWebhookRegistrations` returns webhook IDs and callback URL `/api/shopify/webhook/:workflowId/:nodeId`.
6. In Shopify Admin/API, confirm webhook subscriptions exist and point to the CtrlChecks worker URL.
7. Create a test order/customer/product update and confirm the worker creates an execution with normalized `$json.orderId`, `$json.customerEmail`, `$json.totalPrice`, `$json.currency`, and `$json.lineItems`.
8. Confirm filters (`topics`, `shopDomain`, `financialStatus`, `fulfillmentStatus`, `customerId`, `productId`, `minTotalPrice`, `currency`, `query`) suppress non-matching events.
9. Confirm a downstream Shopify action node can use the same saved connection and trigger output, for example `{{$json.orderId}}` or `{{$json.customerId}}`.
10. Replay a payload signed with the wrong app secret and confirm the worker returns 401 and creates no execution.

Known risks or provider limitations:

- Shopify HMAC validation requires the app client secret/webhook signing secret. Existing Shopify Admin API connections created before this field was added must be updated before Shopify Trigger registration can pass.
- Shopify REST Admin API versions age out. The worker defaults to `2025-10`; set `SHOPIFY_API_VERSION` if the deployment needs to move to a newer supported version.
- No live Shopify account credentials were available in-session, so provider-live delivery was verified by tests/simulated payloads plus production deployment and health checks.

**Credential/Connection Completion Gate (2026-07-18):**
- Exact credential type ID: `shopify_api_key` (reused from the existing `shopify` action node); legacy vault keys `shopify` and `shopify_oauth2` are accepted where present.
- Is it OAuth, bot token, API key, app credential, or provider-specific token: Shopify Admin API access token plus app client secret/webhook signing secret.
- Which file defines the credential fields: `worker/src/credentials-system/credential-type-registry.ts` (`shopify_api_key`, fields `storeUrl`, `token`, optional `clientSecret`; `token` and `clientSecret` masked).
- Which file defines the connector catalog entry: `worker/src/api/connections-catalog.ts` defines the Connections panel fields; `worker/src/services/connectors/connector-registry.ts` defines the provider connector and now includes `shopify.receive`, `trigger.webhook`, and `nodeTypes: ['shopify', 'shopify_trigger']`.
- Which UI fields the user sees in the Connections panel: "Shop Domain", "Admin API Access Token", and optional "App Client Secret / Webhook Signing Secret".
- Which trigger node settings are safe non-secret config: `shopDomain`, `topics`, `financialStatus`, `fulfillmentStatus`, `customerId`, `productId`, `minTotalPrice`, `currency`, `query`.
- Which fields are masked secrets: saved Admin API access token and saved app client secret/webhook signing secret; Redis stores per-node trigger state and never returns the secret in registration responses.
- What webhook validation is used: `X-Shopify-Hmac-Sha256` HMAC-SHA256 over the raw request body, decoded from base64 and compared with `crypto.timingSafeEqual`; state-level topic and shop-domain mismatches are rejected.
- What scopes/permissions are required: the Admin API token must be able to create/delete webhook subscriptions and read the subscribed resources/topics. Topic-specific app permissions may be required by Shopify for orders, customers, products, refunds, and checkouts.
- How the action/reply node is authenticated: the existing `shopify` action node now reads the same saved `shopify_api_key` connection by default and can consume trigger output such as `{{$json.orderId}}`, `{{$json.customerId}}`, `{{$json.productId}}`, and `{{$json.lineItems}}`.
- Which tests prove the model: `shopify-trigger-integration-contract.test.ts` asserts trigger schema/output contract/credential map/connector capabilities/action-node non-collision; `shopify-trigger-service.test.ts` asserts domain normalization, payload normalization, HMAC validation over raw body, credential resolution for current/legacy/env-backed secrets, webhook create/delete registration, Redis-backed validation, filters, execution input shape, and active-workflow auto-registration; `shopify-trigger-node-types.test.ts` asserts frontend fields, no secret fields, logo mapping, backend support, and action-node distinction.

All planned trigger rows are complete.

Optional next batch after these 20:

- Notion Trigger
- Airtable Trigger
- HubSpot Trigger
- Salesforce Trigger
- Zoom Trigger
- Calendly Trigger
- Mailchimp Trigger
- SendGrid Inbound Trigger
- Twilio SMS Trigger
- Dropbox Trigger
- OneDrive Trigger
- AWS S3 Trigger
- RSS Trigger
- Database Change Trigger
- Queue Message Trigger

## Per-Trigger Implementation Checklist

Use this checklist for each of the 20 triggers.

### Audit

- Search existing frontend node definitions.
- Search backend registry and executor support.
- Search connector catalog and credential types.
- Search docs and AI builder hints.
- Search assets/logo mapping.
- Search tests.
- Confirm any existing partial implementation is not duplicated.

### Frontend

- Add trigger node type to node library/catalog.
- Add node picker entry in correct category.
- Add provider logo mapping.
- Add settings fields:
  - event/update types
  - account/resource selector where possible
  - filters
  - optional secret/verification token
  - advanced options
- Add helpful placeholders.
- Add AI builder hints.
- Add node docs and usage guide.

### Assets

- Add SVG logo under public assets if missing.
- Register logo in provider mapping.
- Verify logo renders in picker, node card, and connection selector.

### Credentials

- Add connector catalog entry.
- Add credential schema.
- Add scopes/permissions docs.
- Add test connection logic.
- Ensure values are stored only in secure credential system.

### Backend Webhook

- Add webhook endpoint.
- Add register/unregister functions if provider supports API registration.
- Add webhook verification challenge handler if provider requires it.
- Add signature/secret validation.
- Add payload normalization.
- Add event filtering.
- Add clear errors.
- Add handoff to `/api/execute-workflow` using internal execution auth helper.
- Mark execution failed if handoff fails.

### Backend Execution

- Ensure trigger node returns normalized payload unchanged.
- Ensure downstream nodes receive trigger output via `$json`.
- Ensure execution logs are created.
- Ensure terminal status updates to `success` or `failed`.
- Ensure stale heartbeat cannot hide handoff failures.

### DB/Migrations

- Prefer existing generic tables where possible.
- Add migrations only if a provider needs durable registration state not already covered.
- Never add provider-specific enum values to `executions.trigger`.
- Store provider-specific source in `metadata.originalTrigger`.

### Tests

- Add normalization tests.
- Add signature validation tests.
- Add registry/catalog tests.
- Add UI field tests.
- Add credential registry tests.
- Add internal handoff tests if provider introduces new shape.

### Live Verification

- Deploy worker.
- Register webhook.
- Use provider's live test event.
- Confirm execution row input has normalized fields.
- Confirm node-by-node logs exist.
- Confirm downstream action receives `$json`.
- Confirm final output is non-null.
- Confirm errors are actionable.

## Shared Files To Recheck Every Time

Always recheck these files while implementing each trigger:

```text
worker/src/core/execution/execution-db-enums.ts
worker/src/core/execution/internal-execution-auth.ts
worker/src/api/execute-workflow.ts
worker/src/index.ts
worker/src/api/db-proxy.ts
worker/src/services/credential-scope-registry.ts
worker/src/services/connectors/connector-registry.ts
worker/src/core/registry/unified-node-registry.ts
worker/src/core/registry/unified-node-registry-overrides.ts
worker/src/services/nodes/node-library.ts
worker/public/node-library.json
ctrl_checks/src/components/workflow/nodeTypes.ts
ctrl_checks/src/lib/integrationLogos.ts
ctrl_checks/src/docs-content/index.ts
ctrl_checks/src/docs-content/manifest.ts
```

## Definition Of Done For Each Trigger

A trigger is done only when:

- it appears in the UI with the right logo
- a user can connect credentials
- setup instructions are clear
- webhook can be registered or manually configured
- provider can call the live domain
- payload is normalized
- workflow execution starts
- downstream nodes receive `$json`
- errors become failed executions, not stuck running executions
- docs exist
- focused tests pass
- worker deploy is healthy

## Session State As Of 2026-07-18 (read this before doing anything else)

**All planned real-time triggers are complete: Telegram, WhatsApp, Instagram, Facebook, Slack, Discord, Microsoft Teams, Gmail, Outlook, Google Calendar, Google Sheets, Google Drive, Typeform, Tally, GitHub, GitLab, Jira, Trello, Linear, Stripe, and Shopify.** (Telegram was built before the 20-row table above existed and is not one of its rows, so this is all 20 of the 20 table items plus Telegram as an extra.)

**0 remain from the 20-row table.**

Every completed trigger has a dedicated `### <Trigger> Implementation Notes` section above (search for the trigger name) with the exact files created, the exact registry/allowlist edits made, the exact verification commands run, and manual live-test steps for later. GitHub was the first trigger in this project to use HMAC signature validation over a well-documented, stable public API (`X-Hub-Signature-256`) - closer in spirit to Slack/Discord than to the form-webhook triggers (Typeform/Tally) that preceded it. GitLab confirmed the plan's assumption that it is architecturally simpler: a plain shared-secret header (`X-Gitlab-Token`, validated with a constant-time string compare) rather than HMAC. Jira turned out to be architecturally closer to Slack/Discord/Teams than to GitHub/GitLab: its webhook payloads carry no signature at all, and - critically - its dynamic-webhooks REST API is restricted to Connect/OAuth apps, so a Basic-Auth API-token credential cannot self-register a webhook the way a GitHub/GitLab PAT can. Registration is manual (System WebHooks admin page or Automation for Jira), and validation is a shared secret embedded in the webhook URL itself (query parameter, since Jira's built-in webhook UI has no custom-header field) rather than a signed header. Trello was audited against current Atlassian/Trello docs: it supports real webhook registration via the token-scoped API, requires a successful callback `HEAD` validation response, and signs deliveries with `X-Trello-Webhook` HMAC-SHA1 over the raw body plus exact callback URL. Linear was audited against current Linear docs: it supports GraphQL webhook create/delete, signs raw request bodies with `Linear-Signature` HMAC-SHA256, and recommends a one-minute timestamp replay check. Stripe was audited against current Stripe docs: it supports REST webhook endpoint create/delete, returns the endpoint signing secret only at creation time, and signs raw request bodies with timestamped `Stripe-Signature` HMAC-SHA256. Shopify was audited against current Shopify docs: it supports shop-scoped webhook subscriptions via the Admin API and signs raw request bodies with `X-Shopify-Hmac-Sha256` HMAC-SHA256 using the app client secret.

**Nothing in this entire effort has been committed to git.** All completed triggers (plus a large amount of pre-existing unrelated uncommitted work already in the tree before this effort started) are sitting as uncommitted changes in the working directory. Do not run `git reset`, `git checkout --`, `git clean`, or any other destructive git command against this tree. Do not commit unless the user explicitly asks. Assume the working tree state IS the source of truth for "what's done."

Every completed trigger passed, at the time it was built: `worker` type-check, its own focused Jest suite, `worker` lint, `worker` build, its own focused Vitest suite, `ctrl_checks` build, and a live deploy with `/health` + `/health/live` healthy. Most deployments used `bash scripts/deploy-worker.sh`; Trello, Stripe, and Shopify used an equivalent PowerShell/OpenSSH deploy because this Windows environment had no local `/bin/bash`. None have been live-tested against a real provider account/webhook yet (no live credentials were available in-session) - that is explicitly called out as remaining work in each trigger's notes.

### The pattern every trigger follows â€” do not deviate without a reason

For a **push-webhook trigger** (most providers â€” Slack/Discord/Teams/Gmail/Outlook/Calendar/Drive/Typeform are all this shape), create exactly these files, named after the provider:

1. `worker/src/services/<provider>/<provider>-trigger-service.ts` â€” normalization, signature/secret validation, register/unregister against the provider's API, Redis-backed state (watch channel / webhook secret / sync token â€” whatever the provider needs), `autoRegister<Provider>...ForWorkflow`, and (only if the provider's subscription/channel actually expires) a renewal sweep + `start<Provider>...RenewalScheduler`.
2. `worker/src/api/<provider>-trigger.ts` â€” Express handlers: webhook info (GET), webhook receive (POST â€” validate signature, normalize, filter, create execution, internal handoff), register (POST, authenticated), unregister (POST, authenticated). Ack fast (200/202) before expensive follow-up API calls if the provider enforces a response-time SLA (Graph, Google Calendar/Drive do; Typeform/Slack/Discord don't need it as urgently but it's harmless to keep the pattern).
3. `worker/src/core/registry/overrides/<provider>-trigger.ts` â€” `override<Provider>Trigger(def, schema)` returning the `UnifiedNodeDefinition` with `type: '<provider>_trigger'`, `category: 'triggers'`, `inputSchema`, `outputSchema`, `defaultConfig`, `validateConfig`, and a no-op `execute` (the real work happens in the webhook handler, not in graph execution).

For **Google Sheets** (the one exception so far â€” no push API for cell changes), the pattern is a Redis-backed poll sweep instead of a webhook; see its Implementation Notes section for the deviation. Check whether any remaining provider actually needs push-webhook before assuming the standard shape. Shopify supports real webhooks, but audit it against current provider docs before implementing.

Then wire the new type into ALL of the following existing files (every single trigger so far has needed every one of these edits â€” do not skip any):

- `worker/src/core/registry/unified-node-registry-overrides.ts` â€” import + map `<provider>_trigger: override<Provider>Trigger`.
- `worker/src/core/registry/unified-node-registry.ts` â€” alias-map entries (natural-language phrases â†’ canonical type) AND the credential map entry (`<provider>_trigger: { credentialTypeId: ..., label: ..., authType: ... }`) â€” reuse the existing action node's credential type, don't invent a new one unless the trigger genuinely needs different scopes (Outlook was the one case that needed new scopes added to an existing credential type â€” see its notes).
- `worker/src/services/nodes/node-library.ts` â€” add `create<Provider>TriggerSchema()` method + one `this.addSchema(this.create<Provider>TriggerSchema());` line near the existing action node's registration. **Insert it as a new method, do not paste content in the middle of an existing method** â€” a copy-paste boundary mistake here caused a duplicate `return {` bug during the Google Drive trigger (caught before it shipped by grepping the adjacent method right after editing â€” do the same sanity grep this time).
- `worker/src/index.ts` â€” import the new handlers, register the 4 routes (`GET webhook/info`, `POST webhook`, `POST webhook/register`, `POST webhook/unregister` â€” all under `/api/<provider>/webhook/...` or `/api/<provider>/polling/...` if poll-based), and if there's a renewal scheduler, start it in the same startup block as the other schedulers.
- `worker/src/api/db-proxy.ts` â€” import `autoRegister<Provider>...ForWorkflow`, add a `has<Provider>Trigger` node-scan check, add it to the big `if (!has... && !has...)` guard, call the auto-register function, spread its result into the returned row under a `<provider>WebhookRegistrations` (or `...PollingRegistrations`) key.
- `worker/src/services/connectors/connector-registry.ts` â€” add `trigger.webhook` (or `trigger.poll`) + `<provider>.receive` to the existing connector's `capabilities`, and add `<provider>_trigger` to its `nodeTypes` array. Do not create a new connector entry if one already exists for the action node â€” extend it.
- `worker/src/services/credential-scope-registry.ts` â€” add `<provider>_trigger` to `NODE_PROVIDER` and `NODE_REQUIRED_SCOPES` (mirror the action node's entry; skip if the provider is API-key-based with no scope concept, like Typeform).
- These **6 "known trigger types" allowlist files** â€” every completed trigger since Teams needed the literal string added to all six (Gmail/Slack/Discord/Teams were already pre-scaffolded in some of them from earlier work; assume the 8 remaining are NOT pre-scaffolded and check each explicitly):
  - `worker/src/core/execution/unified-execution-engine.ts`
  - `worker/src/core/utils/workflow-graph-normalizer.ts`
  - `worker/src/core/validation/workflow-save-validator.ts`
  - `ctrl_checks/src/lib/comprehensiveWorkflowValidation.ts`
  - `ctrl_checks/src/lib/workflowGraphValidator.ts` â€” **has two separate occurrences of the list in this one file**, both need the addition
  - `services/workflow-crud-service/src/lib/workflow-validator-lite.ts`

Frontend, every time:
- `ctrl_checks/src/components/workflow/nodeTypes.ts` â€” new `NodeTypeDefinition` entry, `category: 'triggers'`, placed right after the existing action node's entry for that provider.
- `ctrl_checks/src/lib/integrationLogos.ts` â€” `<provider>_trigger: <same logo path as the action node>`.
- `ctrl_checks/src/components/workflow/backendSupportedNodeTypes.ts` â€” add the type string (this file is alphabetically sorted â€” insert in the correct position).
- `ctrl_checks/src/components/workflow/nodeLaymanDescriptions.ts` â€” one plain-English sentence.
- `ctrl_checks/src/docs-content/nodes/<provider>_trigger.doc.ts` (new) + `ctrl_checks/src/docs-content/search/<provider>_trigger.ts` (new) + register both in `ctrl_checks/src/docs-content/index.ts` (import + array entry) and `ctrl_checks/src/docs-content/manifest.ts` (JSON entry) and `ctrl_checks/src/docs-content/search-index.ts` (dynamic import line).

Tests, every time (3 new files, following the exact naming convention already used by all 13 completed triggers):
- `worker/src/services/<provider>/<provider>-trigger-service.test.ts`
- `worker/src/core/registry/__tests__/<provider>-trigger-integration-contract.test.ts`
- `ctrl_checks/src/components/workflow/__tests__/<provider>-trigger-node-types.test.ts`

### Universal rules that must not be violated (from earlier fixes, still load-bearing)

- Never write a raw provider trigger name to `executions.trigger` â€” always call `normalizeExecutionTrigger('<provider>', 'webhook')` from `worker/src/core/execution/execution-db-enums.ts`. The DB enum only accepts `manual, webhook, schedule, form, chat` for `trigger` and `pending, running, success, failed, cancelled, waiting` for `status`.
- Internal handoff to `/api/execute-workflow` must send `X-Internal-<Provider>-Execution: true` AND `X-Internal-Trigger-Execution: true` as a fallback â€” `worker/src/core/execution/internal-execution-auth.ts` already generically recognizes any `x-internal-<provider>-execution` header, so no changes to that file should be needed (verify this is still true, don't assume forever).
- If the handoff `fetch()` to `/api/execute-workflow` fails or returns non-2xx, the pre-created execution row must be updated to `status: 'failed'` with the real error â€” never leave it stuck in `running`.
- Store all trigger runtime state (webhook secrets, watch-channel IDs, sync/page tokens, poll baselines) in Redis via `getRedisClient()` from `worker/src/shared/redis-client.ts`, keyed `<provider>:<kind>:{workflowId}:{nodeId}`. Do not add new DB tables/migrations for this unless a provider truly cannot be modeled any other way â€” none of the 13 completed triggers needed one.
- Reuse the existing OAuth/API-key credential type for a provider if the action node already has one; only add new scopes to it if the trigger genuinely needs a broader scope (document why, like Outlook's Mail.Read/Calendars.Read addition), and call out that existing connections may need reconnecting.
- Every trigger's normalized output must include at minimum: `eventId`, `eventType`, `source`, `timestamp`, `raw`, plus provider-specific fields â€” keep field names predictable so `{{$json.fieldName}}` works downstream.

### Per-trigger loop (historical implementation process)

1. Audit first (dedicated Explore-agent audit of what already exists for that provider â€” action node, credential, webhook route, docs, tests, allowlist presence). Do not assume it's missing; Microsoft Teams turned out to be fully pre-built.
2. Implement following the file list above.
3. Run: `cd worker && npm run type-check`
4. Run: `cd worker && npx jest src/services/<provider>/<provider>-trigger-service.test.ts src/core/registry/__tests__/<provider>-trigger-integration-contract.test.ts src/core/execution/__tests__/execution-db-enums.test.ts src/core/execution/__tests__/internal-execution-auth.test.ts --runInBand --no-coverage --detectOpenHandles`
5. Run: `cd worker && npm run lint`
6. Run: `cd worker && npm run build`
7. Run: `cd ctrl_checks && npx vitest run src/components/workflow/__tests__/<provider>-trigger-node-types.test.ts`
8. Run: `cd ctrl_checks && npm run build`
9. Deploy: `bash scripts/deploy-worker.sh` (this type-checks, lints, builds, packages, uploads, and restarts the live worker, then checks `/health` and `/health/live` itself â€” treat a non-zero exit or unhealthy check as a stop-and-fix signal, not something to retry blindly).
10. Update this doc: add a `### <Provider> Trigger Implementation Notes` section (copy the structure of the Typeform/Google Drive sections above), update the "Completed so far" list, update this "Session State" section's counts, and move the "Next incomplete trigger" pointer forward.
11. Give the user a short chat summary (what was completed, files changed, tests run, deploy status, manual live-test steps) â€” do not just rely on the doc update.
12. Continue automatically to the next trigger. Do not stop and ask for permission between triggers â€” only stop if genuinely blocked (e.g. a required credential/API detail cannot be determined from the codebase or public provider docs).

### Known provider-specific gotchas for the 8 remaining triggers (from the original planning table â€” verify, don't blindly trust)

- **Tally**: webhook per form, API key/webhook secret â€” should be close to the Typeform pattern (direct payload delivery + signature header), check Tally's actual webhook payload shape and signature scheme before assuming it matches Typeform's.
- **GitHub**: HMAC signature required (`X-Hub-Signature-256`), auth via GitHub App/OAuth/PAT â€” check what credential type already exists for the `github` action node before adding a new one.
- **GitLab**: secret token validation (`X-Gitlab-Token`, a plain shared secret, not HMAC) â€” simpler than GitHub's signature scheme.
- **Jira**: webhook URL per site/project, Atlassian OAuth/API token â€” webhook registration may require Atlassian Connect app setup or a manual per-project webhook URL depending on Jira Cloud vs. Server; audit before assuming full self-service automation is possible.
- **Trello**: webhook callback validation â€” Trello webhooks require the callback URL to respond to a HEAD request for validation before accepting the actual webhook registration POST.
- **Linear**: signature validation if available â€” check Linear's current webhook signing docs, this may have changed since the original plan was written.
- **Shopify**: HMAC validation required (`X-Shopify-Hmac-Sha256`), OAuth/admin token â€” Shopify webhooks are typically registered per-shop via the Admin API or declared in a Shopify app's config; audit which model this codebase already assumes for the existing Shopify action node.

## Next Chat Prompt

Copy this prompt verbatim into the next chat if follow-up audit or live provider testing is needed:

```text
We are in repo: C:\Users\user\Desktop\ctrlchecks-hostinger

Read docs/REALTIME_THIRD_PARTY_TRIGGER_IMPLEMENTATION_PLAN.md first, especially the "Session State As Of 2026-07-18" section near the bottom.

Persistent Goal:
All real-time third-party triggers from the 20-trigger plan have been implemented, verified, documented, and deployed. Continue only with follow-up audit, live provider testing, or hardening requested by the user.

Status: 20 of the 20 table triggers are complete, plus Telegram as an extra completed trigger (Telegram, WhatsApp, Instagram, Facebook, Slack, Discord, Microsoft Teams, Gmail, Outlook, Google Calendar, Google Sheets, Google Drive, Typeform, Tally, GitHub, GitLab, Jira, Trello, Linear, Stripe, Shopify). Nothing has been committed to git yet - all work is uncommitted in the working tree; do not run any destructive git command.

No table triggers remain.

If asked to live-test providers, use each trigger's Implementation Notes manual live-test steps. If asked to harden or review, preserve unrelated uncommitted work and do not run destructive git commands.

Strict requirements:
- Do not remove unrelated user changes; the working tree has substantial unrelated uncommitted work already in it.
- Reuse normalizeExecutionTrigger() and normalizeExecutionStatus(); never write raw provider names to executions.trigger.
- Reuse the universal internal execution auth helper with X-Internal-<Provider>-Execution and X-Internal-Trigger-Execution headers.
- Use the saved credential/connection system; do not place provider secrets in workflow JSON.
- Store trigger runtime state in Redis, keyed <provider>:<kind>:{workflowId}:{nodeId}, unless a future provider genuinely requires durable DB state.
- If making follow-up changes, rerun the focused tests/builds relevant to the touched provider and deploy worker changes before calling work complete.
```