# Claude — Next Session Prompt

Saved 2026-07-12. Paste the block below as the first message in the next Claude Code chat to continue this work.

---

```text
Continue the CtrlChecks node/connection audit from the last session (commit 3df67a6 on master).

Read these two memory files first (they have full details — don't ask me to re-explain):
- project_credential_connection_ui_audit.md — the task for today
- project_node_testing_audit.md — broader node-audit history/method, for context only

## What happened last session (summary)

1. Audited and fixed graphql, http_post, http_request, respond_to_webhook, webhook_response,
   schedulewise, workday, xero end-to-end (runtime vs schema vs frontend vs credentials vs docs).
   Committed as 3df67a6, pushed, live-verified. Biggest bug: respond_to_webhook/webhook_response
   read `statusCode` at runtime but the AI-generation pipeline wrote `responseCode` — every
   AI-built webhook-response node silently always returned HTTP 200.

2. Built real credential wiring for `schedulewise` (new credential type + connector-registry
   entry + PROVIDER_CREDENTIAL_MAP entry + wired the orphaned ScheduleWiseSettings.tsx into
   PropertiesPanel.tsx). This became the template fix pattern for today's task.

3. Did a category-alignment triage across AI & ML / Core Logic / Data Manipulation /
   Communication (two passes — first one was wrong, corrected after user caught it; see
   project_node_testing_audit.md for the "Lesson" callouts on what went wrong and why, worth
   reading so you don't repeat the same two mistakes: (a) always filter against
   backendSupportedNodeTypes.ts before claiming a node is "broken" — a type existing in
   nodeTypes.ts's source doesn't mean it's reachable in the UI; (b) some nodes have a registry
   override in worker/src/core/registry/overrides/*.ts that returns its own full inputSchema,
   replacing node-library.ts's schema entirely — diff against the override's schema when one
   exists, not node-library.ts alone. Found this the hard way on `whatsapp`.)

4. Audited every credentialed node (95 of them) for whether it has a DEDICATED branded
   connection (proper credential-type-registry.ts entry + connector-registry.ts entry +
   PROVIDER_CREDENTIAL_MAP entry + logo + setup guide) or falls back to a generic, unbranded
   "Bearer Token" / "Basic Auth" / "API Key" picker — this is today's task, detailed below.

## Today's task: fix the 9 nodes with no dedicated connection UI

Read project_credential_connection_ui_audit.md for the full per-node breakdown. In priority
order:

**Priority 1 — no dedicated credential type at all (build one, same pattern as ScheduleWise):**
workday, sap, intuit_smes, chargebee, google_cloud_storage, netlify, oracle_database,
sql_server, timescaledb.

Start with `workday` and `sap` — worst current UX (both show two generic pickers at once),
both already have a credential-steps.ts guide ready to re-point at a real type once built.
`intuit_smes` is messiest — resolves to 3 duplicate/overlapping requirement rows; clean up the
underlying requirement declaration, not just add a type on top of it. `timescaledb` has zero
setup guide at all (only one in this list missing one entirely) — write one from scratch.

For EACH node, before writing any code: verify my findings are still current (re-run the
registry check — load unifiedNodeRegistry, check credentialSchema.requirements for the type —
rather than trusting last session's snapshot blindly), then follow this fix pattern:
1. Dedicated entry in worker/src/credentials-system/credential-type-registry.ts
2. Matching entry in worker/src/services/connectors/connector-registry.ts
3. Entry in PROVIDER_CREDENTIAL_MAP (worker/src/core/registry/unified-node-registry.ts)
4. Real logo — local SVG in ctrl_checks/src/lib/integrationLogos.ts if brand assets exist,
   else a Simple Icons CDN slug in ctrl_checks/src/components/connections/ProviderLogo.tsx's
   SIMPLE_ICON_SLUGS
5. Setup guide in ctrl_checks/src/docs-content/credential-steps.ts
6. Live-verify: debug panel shows one clean branded picker, not generic boxes

**Priority 2 — has a dedicated type, just missing a logo:** email/SMTP (decide if a generic
mail icon is "proper enough" or if this needs a decision from me first), schedulewise (I built
this one last session and forgot the logo), slack_webhook (Slack already has a real logo —
probably just needs a PROVIDER_LOGO_ALIASES entry pointing at it), zendesk (likely just needs a
Simple Icons slug).

**Priority 3 — cleanup:** contentful has a proper dedicated connection already, but a stale
fallbackCredentialTypeIds branch also surfaces a redundant second generic picker next to it —
remove the stale branch.

**Do NOT build anything for `webhook`** — flagged last session as architecturally different
(it's the incoming-trigger's own auth-header validation, not a 3rd-party outbound connection
like the others). Ask me first if you think it belongs in this initiative.

## Rules (same as last session)

- If any node turns out to need a bigger design decision than "add a credential type" (e.g.
  workday needs a real OAuth2 flow built, not just config-field-paste — that was explicitly
  deferred last session, confirm with me before building it now), stop and ask, don't silently
  expand scope.
- Do not run npm test.
- Verification: worker `npm run type-check`, ctrl_checks `npx tsc --noEmit`, worker
  `npm run export:schemas`. Report CI failures separately from these.
- Commit, push to origin master, verify live (worker.ctrlchecks.ai debug panels / connections
  page) after each logical batch — don't wait until all 9 nodes are done to check in.
- Give me a real summary of what changed per node when done, same format as last session.
```
