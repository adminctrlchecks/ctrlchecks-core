# Platform & API Cost Plan — Node Testing

**Purpose:** every third-party platform CtrlChecks integrates with, the nodes that depend on it,
and what it costs to obtain credentials so those nodes can be tested end-to-end.

**Generated:** 2026-08-02
**Source of platform/node data:** live production catalog, `GET https://worker.ctrlchecks.ai/api/connections/catalog`

---

## Read this before using the cost figures

Two different confidence levels are mixed in this document. Please treat them differently.

| Column | Confidence | Basis |
|---|---|---|
| Platform, Nodes, Auth type, Node count | **Verified** | Read directly from the running production system |
| Pricing URL | **High** | Official pricing pages; verify the link still resolves |
| Free tier / Cost to test | **INDICATIVE — must be verified** | Not machine-read. Vendor pricing changes frequently and varies by region and billing period |

**The cost column is an planning estimate, not a quote.** Do not commit a budget from this table
alone — open each pricing URL and confirm before purchase. Figures are USD, cheapest paid tier or
minimum credit purchase, monthly unless noted.

---

## Summary

- **68** connection entries in the catalog
- **96** distinct node types depend on them
- **~39** platforms are testable at **$0** on a free tier or self-hosted
- **~14** platforms need a real payment to test properly
- **~6** are enterprise products requiring a sales quote

**The headline for the investment plan:** the majority of the integration surface can be tested
without spending anything. The spend concentrates in AI providers, telecom, and enterprise SaaS.

---

## Group A — Free to test ($0 needed)

Free tier or free developer account is sufficient to obtain credentials and exercise the node.

| Platform | Nodes | Auth | Pricing URL |
|---|---|---|---|
| Airtable | `airtable` | API key | https://airtable.com/pricing |
| ActiveCampaign | `activecampaign` | API key | https://www.activecampaign.com/pricing |
| Bitbucket | `bitbucket` | Basic Auth (App Password / Atlassian API token) | https://bitbucket.org/product/pricing — **Verified working 2026-08-04.** Classic Bitbucket App Passwords are retired for most accounts; use an Atlassian API token scoped to Bitbucket instead (id.atlassian.com → Security → API tokens → select app "Bitbucket"), with your account **email** as username. Root-caused and fixed two real bugs along the way: (1) the readiness check's canonical-connection fallback used a hardcoded field-name guesslist that didn't include Bitbucket's `appPassword` field — fixed by reading the real field name from the credential-type registry instead; (2) the node's own credential requirement was missing a `credentialTypeId`, silently breaking auto-discovery of a saved connection — fixed and now covered by a permanent registry-wide test. Also fixed a broken (mistemplated) Basic Auth injection rule that made the "Test Connection" button always fail for Bitbucket and Zendesk. |
| Calendly | `calendly` | API key | https://calendly.com/pricing |
| ClickUp | `clickup` | API key | https://clickup.com/pricing |
| Discord | `discord`, `discord_trigger`, `discord_webhook` | Bot token + webhook | https://discord.com/nitro (bot API is free) |
| Dropbox | `dropbox` | OAuth token | https://www.dropbox.com/plans |
| Facebook | `facebook`, `facebook_trigger` | OAuth | https://developers.facebook.com (free) |
| GitHub | `github`, `github_trigger` | OAuth | https://github.com/pricing |
| GitLab | `gitlab`, `gitlab_trigger` | OAuth token | https://about.gitlab.com/pricing |
| Google | `google_gmail`, `gmail`, `gmail_trigger`, `google_sheets`, `google_sheets_trigger`, `google_doc`, `google_calendar`, `google_calendar_trigger`, `google_drive`, `google_drive_trigger`, `google_contacts`, `google_tasks`, `google_bigquery` | OAuth | https://cloud.google.com/pricing (BigQuery has free tier) |
| HubSpot | `hubspot` | API key | https://www.hubspot.com/pricing |
| Instagram | `instagram`, `instagram_trigger` | OAuth | https://developers.facebook.com (free) |
| Jira | `jira`, `jira_trigger` | API token | https://www.atlassian.com/software/jira/pricing |
| Linear | `linear`, `linear_trigger` | API key | https://linear.app/pricing |
| LinkedIn | `linkedin` | OAuth | https://developer.linkedin.com (free) |
| Mailchimp | `mailchimp` | API key | https://mailchimp.com/pricing |
| Netlify | `netlify` | Token | https://www.netlify.com/pricing |
| Notion | `notion` | OAuth | https://www.notion.so/pricing |
| Pipedrive | `pipedrive` | API token | https://www.pipedrive.com/pricing |
| Salesforce | `salesforce` | OAuth | https://developer.salesforce.com/signup — **Manually tested 2026-08-06: node confirmed working end-to-end** (Create, Get, Update, Delete, and Query all run for real against a live Developer Edition org; Delete verified correct via a follow-up Get 404). Free Developer Edition org, no card needed. Created an External Client App (Salesforce's current name for what used to be "Connected Apps") under the org's own admin account, with Authorization Code flow, both local and production callback URLs, `api` + `refresh_token`/`offline_access` scopes, and IP Relaxation set to "Relax IP restrictions" (required — Salesforce's default "Enforce IP restrictions" would otherwise reject the worker's server-side token refresh, which runs from a different IP than the browser that logged in). Root-caused and fixed three real, universal bugs found along the way, none Salesforce-specific in cause: (1) the OAuth token response's `instance_url` was being saved to the connection correctly but had no alias mapping it to the node's `instanceUrl` input field — fixed by adding `instance_url → instanceUrl` to the shared alias list in `dynamic-node-executor.ts` (same mechanism already used for Supabase/Mailchimp); (2) the node's base schema unconditionally required `resource`, blocking Query/Search even though execute() only needs it for other operations — fixed in both the registry override (`overrides/salesforce.ts`) and the actual hand-written schema source consulted by the static export and readiness gate (`services/nodes/node-library.ts`'s `createSalesforceSchema()`, a second, independent schema definition outside the registry override that the export/readiness-gate path reads from instead); (3) `instanceUrl` was marked `ownership: 'value'` (a manual field) instead of `ownership: 'credential'` like `accessToken`, so the readiness gate kept demanding it be typed in by hand even after bug (1) was fixed and the connection was correctly supplying it. See `docs/NODE_STATUS_INVESTOR_ANALYSIS.md` Part 2. |
| Shopify | `shopify`, `shopify_trigger` | API key | https://www.shopify.com/pricing (free dev store) |
| Slack | `slack_message`, `slack_trigger`, `slack_webhook` | OAuth + webhook | https://slack.com/pricing |
| Supabase | `supabase` | API key | https://supabase.com/pricing |
| Telegram | `telegram`, `telegram_trigger` | Bot token | Free — https://core.telegram.org/bots |
| Trello | `trello`, `trello_trigger` | API key + token | https://trello.com/pricing |
| Typeform | `typeform`, `typeform_trigger` | API key | https://www.typeform.com/pricing |
| WooCommerce | `woocommerce` | API key | https://woocommerce.com/pricing (plugin free) |
| YouTube | `youtube` | OAuth token | https://developers.google.com/youtube (free quota) |
| Zoho CRM | `zoho_crm` | OAuth | https://www.zoho.com/crm/pricing.html |
| Zoom | `zoom_video` | OAuth 2.0 | https://zoom.us/pricing — **Manually tested 2026-08-05: node confirmed working end-to-end.** Signup itself is free (Basic plan, no card). Initial connection attempt failed live with `errorCode 4700 "Invalid redirect url"` — the app registered in the worker's original env had a redirect URL that didn't match the worker's actual callback. Root cause: that app predated the shared-developer-account migration already done for other providers. Fixed by creating a new Zoom OAuth app under the shared `adminctrlchecks@gmail.com` developer account (same pattern as GitHub/LinkedIn/Notion/Slack/HubSpot/Zoho), registering both the local and production redirect URIs plus the four required scopes (`meeting:write:meeting`, `meeting:read:meeting`, `meeting:read:list_meetings`, `user:read:user`), and updating `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` in both local and production `worker/.env` (with the production update applied directly on the Hostinger server, `ctrlchecks-worker.service` restarted and verified). The connection went Active on the live `ctrlchecks.ai/connections` page and the node was run for real. The new OAuth app has also been submitted for Zoom Marketplace review (in progress, ~4+ week SLA per Zoom's own backlog) so it can eventually authorize Zoom accounts beyond the shared admin one — the already-Active admin connection is unaffected by that pending review. See `docs/NODE_STATUS_INVESTOR_ANALYSIS.md` Part 2. |

---

## Group B — Self-hosted / infrastructure (no vendor fee)

No platform to pay. Cost is only the server these already run on, which the project has.

| Platform | Nodes | Auth | Notes |
|---|---|---|---|
| PostgreSQL | `postgresql` | Connection string | Open source; already in the stack (AWS RDS) |
| MySQL | `mysql` | Connection string | Open source |
| MongoDB | `mongodb` | Connection string | Free Atlas tier — https://www.mongodb.com/pricing |
| Redis | `redis` | Connection string | Already in the stack |
| TimescaleDB | `timescaledb` | Basic auth | Open source — https://www.timescale.com/pricing |
| Ollama | `ollama` | Base URL | Local LLM runtime, free — https://ollama.com |
| SMTP | `email` | Credentials | Any mailbox |
| FTP | `ftp` | Basic auth | Own server |
| SFTP | `sftp` | Basic auth | Own server |
| Database (generic) | *(no node types bound)* | Connection string | Generic connector |

---

## Group C — Payment required to test properly

**This is where the investment is actually needed.**

| Platform | Nodes | Auth | Pricing URL | Indicative cost to test |
|---|---|---|---|---|
| OpenAI | `openai_gpt` | API key | https://openai.com/api/pricing | Prepaid credit, ~$5–10 minimum |
| Anthropic | `anthropic_claude` | API key | https://www.anthropic.com/pricing | Prepaid credit, ~$5–10 minimum |
| Twilio | `twilio` | API key | https://www.twilio.com/en-us/pricing | **Verified 2026-08-03: signup itself is free (30-day trial, no card) and Account SID/Auth Token are immediately available**, but buying ANY phone number (required to send SMS) now requires a "compliance profile" — identity verification against a government-issued ID, a relatively new industry-wide requirement (A2P 10DLC regulations). The automated identity check **failed on first attempt** for a legitimate personal account with accurate details; escalated to Twilio's ops team for manual review, quoted **up to 48 business hours** turnaround, outcome not guaranteed. Same failure pattern as the Microsoft Dev Program rejection — an opaque, non-appealable-in-real-time gate. Deferred pending manual review outcome; node not yet manually tested. |
| WhatsApp (Cloud API) | `whatsapp`, `whatsapp_cloud`, `whatsapp_trigger` | OAuth | https://developers.facebook.com/docs/whatsapp/pricing | Free tier of conversations, then per-conversation |
| SendGrid | `sendgrid` | API key | https://sendgrid.com/en-us/pricing | Free tier limited; ~$20 for a real send volume |
| Mailgun | `mailgun` | API key | https://www.mailgun.com/pricing | **Verified 2026-08-03: no free tier at signup** — checkout requires a card, cheapest plan (Basic 10k) is $15/month. **Approved 2026-08-04 investor meeting.** Account created free (`api.mailgun.net`, sandbox domain, no card needed for sandbox sending to authorized recipients) — full paid plan not required to verify the node. **Manually tested 2026-08-04: node confirmed working end-to-end** (real API key + sandbox domain + authorized recipient, `Run Node` → Mailgun `202 Queued`). First live run surfaced a real bug, since fixed: the persisted node config held a stray fill-mode label (`replyTo: "manual"`) that the runtime validator incorrectly treated as real content and rejected as an invalid email — root-caused and fixed at the registry level (see `worker/src/core/execution/runtime-field-contract.ts` + `worker/src/core/utils/field-ownership.ts`), not patched per-node. See `docs/NODE_STATUS_INVESTOR_ANALYSIS.md` Part 2. |
| Microsoft Teams | `microsoft_teams`, `microsoft_teams_trigger` | Bot + webhook | https://www.microsoft.com/microsoft-teams/compare-microsoft-teams-options | **Verified 2026-08-03: Teams Free ("Communities") has no Connectors/Workflows/Apps at all** — checked community settings, channel menu, and the "..." context menu; only Members/Settings/Share-link options exist. Requires a Microsoft 365 work/school tenant. Tried the free Microsoft 365 Developer Program sandbox as a no-cost path — **signup was rejected ("You don't currently qualify") for this account**, an opaque Microsoft-side eligibility check with no visible retry path. Deferred; node not yet manually tested. Needs either a paid Microsoft 365 tenant or a different account that qualifies for the Dev Program. |
| Stripe | `stripe`, `stripe_trigger` | API key | https://stripe.com/pricing | Test mode is free — only live txns cost |
| AWS (S3) | `aws_s3` | Access key | https://aws.amazon.com/s3/pricing | Free tier 12mo, then cents |
| Google Cloud Storage | `google_cloud_storage` | API key | https://cloud.google.com/storage/pricing | Free tier, then cents |
| Chargebee | `chargebee` | API key | https://www.chargebee.com/pricing | Free trial; paid after |
| PayPal | `paypal` | OAuth token | https://developer.paypal.com | Sandbox free |
| Jenkins | `jenkins` | API token | https://www.jenkins.io (free, self-host) | Server cost only |
| Intuit / QuickBooks | `intuit_smes` | API key | https://quickbooks.intuit.com/pricing | Sandbox free; live needs subscription |
| Twitter / X | `twitter` | OAuth | https://developer.x.com/en/portal/products | **Verified 2026-08-05 via X's own pricing calculator**: usage-based pay-per-resource, not a flat monthly fee — Posts: Read $0.005/resource, User: Read $0.010/resource, DM Event: Read $0.010/resource, Post: Create $0.015/request, Content: Create $0.010/request, DM Interaction: Create $0.015/request, User Interaction: Create $0.015/request (additional resource types exist under "See more resources", not itemized here). For an example workload (10k post reads, 5k user reads, 2k DM reads, 5k post creates, 1k DM interaction creates, 2k user interaction creates per month), X's calculator estimates **~$240/month**. Actual cost scales directly with real usage volume — a lower-traffic workflow could cost significantly less, a higher-traffic one more. No free tier remains for posting. Supersedes the earlier "$100/month" flat-tier estimate in `NODE_STATUS_INVESTOR_ANALYSIS.md`, which should be updated to reference this usage-based model instead. |

---

## Group E — Blocked: platform-side setup, not a cost issue

Not blocked by price — blocked because CtrlChecks itself hasn't registered the required app/developer
credentials with the vendor yet. No amount of a user creating their own account fixes this; it needs
engineering/ops work on the CtrlChecks side first (register an app, get a client ID/secret, wire it
into the worker's env, then unlock the frontend if it's flagged "Coming Soon").

| Platform | Nodes | Auth | Verified finding |
|---|---|---|---|
| Microsoft — Outlook / OneDrive | `outlook`, `outlook_trigger`, `onedrive` | OAuth 2.0 | **Verified 2026-08-03**: no Azure AD app has been registered for CtrlChecks (`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET` are unset/placeholder; local dev redirect URI is already configured: `http://localhost:3001/api/credential-connections/oauth/callback`). Frontend hard-locks `microsoft` behind `isComingSoonProvider()` (`ctrl_checks/src/components/connections/connectionAvailability.ts`) — same mechanism as Xero/Stripe/PayPal, but here it reflects a genuinely incomplete integration, not a deliberate gate. Matches `NODE_TESTING_STATUS.md`: "Backend ready, Azure app registration pending." **Usage cost to run it: $0**, confirmed via Microsoft's own Graph documentation — App Registration and delegated Mail.Send/Mail.Read/Calendars.Read/User.Read permissions carry no per-use charge for any tenant type, including personal Microsoft/Outlook.com accounts. **However, actually creating the app registration hit an unexpected gate**: attempted live 2026-08-03 with a personal Microsoft account — Azure Portal reported "The ability to create applications outside of a directory has been deprecated," meaning a personal account with no existing Azure/M365 directory cannot self-serve register an app anymore. Only two ways to get a directory: (a) the Microsoft 365 Developer Program's free sandbox — already tried and rejected for this account ("you don't currently qualify"), or (b) sign up for a real Azure subscription, which asks for a credit card for identity verification even though basic Entra ID / App Registration usage itself remains free. **Net: $0 ongoing cost, but likely needs a credit card on file just to stand up the directory**, unless a Microsoft/Google Workspace-linked account that already has an Azure or M365 tenant is used instead (e.g. a company-owned Microsoft 365 account, if one exists) — that would skip this gate entirely. Work needed once a directory exists: register the app (free), set redirect URI + 4 Graph scopes, put client ID/secret in the worker's `.env`, remove `'microsoft'` from `COMING_SOON_PROVIDERS`. |
| Microsoft — Teams (Connectors/Workflows) | `microsoft_teams`, `microsoft_teams_trigger` | OAuth 2.0 / Incoming Webhook | Same Azure-app blocker as Outlook above, **plus** a second, independent blocker even once that's fixed: Teams' incoming-webhook feature (Connectors/Workflows) only exists on Microsoft 365 *work/school* tenants — verified 2026-08-03 that Teams Free ("Communities", a personal-account product) has no Connectors/Workflows/Apps UI at all. The no-cost path (Microsoft 365 Developer Program free sandbox tenant) was tried and rejected ("you don't currently qualify") for the test account used — an opaque, account-specific Microsoft eligibility check with no visible appeal/retry path. **Verified paid path: Microsoft 365 Business Basic, $7/user/month billed yearly** (confirmed on Microsoft's current pricing page 2026-08-03, and again 2026-08-05 via the plan comparison page) is the cheapest tier that includes both Teams and Connectors/Workflows access. **Compared against the two other tiers on the same comparison page 2026-08-05**: Microsoft Teams Essentials ($4/user/month) is cheaper but its plan highlights list only chat/call/video/meeting-recording features — no mention of the "10+ additional apps"/Connectors-Workflows surface Business Basic explicitly lists, so it's very likely the same capability gap as the free tier, just paid; not recommended without separate confirmation. Microsoft 365 Business Standard with Copilot ($23.50/user/month) includes everything Business Basic does (plus desktop apps and Copilot AI) but nothing additional relevant to Teams/Connectors — pure overspend for this use case. **Recommendation: Business Basic, $7/user/month.** |

---

## Group F — Blocked: vendor requires a business identity we don't have

Distinct from Group E — no CtrlChecks-side app registration is involved here (these are all plain
API key nodes). The vendor's own signup flow rejects the identity/eligibility of the account being
used for testing. Same family of problem as the Twilio and Microsoft Dev Program entries above
(opaque, vendor-side, not fixable by trying harder), just triggered at signup instead of mid-flow.

| Platform | Nodes | Auth | Verified finding |
|---|---|---|---|
| Freshdesk | `freshdesk` | API key | **Verified 2026-08-03**: signup itself is free (14-day trial, no card required per Freshdesk's own signup page), but the form rejects personal webmail addresses (Gmail, likely Yahoo/Hotmail/etc. too) with "Please enter your business email" — a hard client-side validation, not a soft warning. No workaround attempted (declined to fabricate a fake business identity to bypass it). Needs an email on a non-consumer domain to sign up at all. Deferred; node not yet manually tested. |

---

## Group G — Blocked: known bug on the vendor's side, not ours

Distinct from Group F — signup succeeds and the credential connects fine (in this case we also
confirmed the CtrlChecks side was fully correct, including fixing a real credential-readiness bug
along the way), but the vendor's own platform has a documented, pre-existing bug unrelated to
anything CtrlChecks did. Confirmed via the vendor's own public support community, not guessed.

| Platform | Nodes | Auth | Verified finding |
|---|---|---|---|
| Intercom | `intercom` | Bearer token | **Verified 2026-08-03**: signup is free, and the connection itself worked correctly end-to-end after a real CtrlChecks-side fix (see `feedback_testing_strategy`-adjacent note: the readiness/"Check Setup" check used a different, narrower credential lookup than the actual execution path, so a genuinely valid saved Intercom connection was permanently misreported as "runtime token is missing" — fixed in `credential-resolver.ts` by falling back to the same canonical connections lookup execution already uses, verified against `credential-resolver-parity.test.ts`, and confirmed live: the false "missing" error disappeared and the workflow reached Intercom's real API). The node then failed with Intercom's own `"Unauthorized token, suspended application"` error, reproduced across multiple different Intercom trial accounts. Confirmed via Intercom's public community forum (search: "403 Forbidden: Workspace Suspended") that new trial workspaces getting auto-suspended immediately after signup, for no policy/billing reason, is a known, previously-reported issue on Intercom's side — their own support's stated fix is to contact them directly to reactivate, no self-service option exists. Deferred pending a non-suspended Intercom workspace; node's credential/connection layer is fully verified working, only the live send/list call is untested. |

---

## Group D — Enterprise: sales quote required

No self-serve pricing. Testing needs a vendor relationship, partner/dev programme, or sandbox
request. **Recommend deprioritising these until a customer actually needs them** — the cost is
disproportionate to the testing value.

| Platform | Nodes | Auth | Pricing URL |
|---|---|---|---|
| SAP | `sap` | Token | https://www.sap.com/products/pricing.html — **Verified 2026-08-04**: tried the free SAP Business Accelerator Hub sandbox as a no-cost path. Along the way found and fixed a real gap: the node only supported Bearer/Basic Auth, but the sandbox authenticates via a custom `APIKey` header — added a third auth mode (`apiKey` field, credential-owned, sends `APIKey: <key>` header) to `execute-workflow.ts`'s SAP case, `overrides/sap.ts`, `node-library.ts`, and the `sap_connection` credential type, verified live via `/api/node-definitions`. However, SAP's own login portal (accounts.sap.com SAML/OIDC flow) errored with "SAP Cloud Identity Services can't process this OpenID Connect request" — a vendor-side SSO misconfiguration, not fixable from here. Deferred; node's APIKey auth path is implemented and ready, but untested end-to-end pending a working SAP login. |
| Workday | `workday` | Token | https://www.workday.com (contact sales) |
| Oracle Database | `oracle_database` | Basic auth | https://www.oracle.com/database/pricing |
| SQL Server | `sql_server` | Basic auth | https://www.microsoft.com/sql-server/sql-server-2022-pricing (free Developer edition exists) |
| ScheduleWise | `schedulewise` | API key | Vendor-specific |
| Tally | `tally_trigger` | Access token | https://tallysolutions.com/pricing |

---

## Suggested phasing for the investment plan

**Phase 1 — $0.** Everything in Group A and Group B. This is roughly two-thirds of the integration
surface and needs only time to register accounts, not money.

**Phase 2 — small, high-value spend.** The AI providers (OpenAI, Anthropic) and one messaging
provider. These sit on the critical path of the product's core AI workflows, so they are the
highest return per dollar. Indicative: **$50–100 total** in prepaid credit.

**Phase 3 — as needed.** Remaining Group C platforms, purchased when a specific customer or demo
requires that integration proven.

**Phase 4 — defer.** Group D enterprise platforms. Pursue via partner/sandbox programmes rather
than paid licences.

---

## Caveats

1. **Cost figures are indicative and unverified.** They were not machine-read from vendor sites.
   Confirm each against its pricing URL before committing budget.
2. **Free tiers frequently have rate limits** that are fine for a functional test but not for load
   or reliability testing.
3. **A free tier is not the same as a free integration.** Several platforms (Salesforce, Shopify,
   Facebook/Instagram, WhatsApp) require an app-review or verification process that costs time even
   when it costs no money — that lead time should be in the plan.
4. **The node-to-platform mapping is accurate as of the generation date.** Regenerate from
   `/api/connections/catalog` if nodes are added or removed.
