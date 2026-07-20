# Codex Handover — Form-Triggered (and all resumed) Workflow Executions Silently Stall

> **Read this entire document before changing any code.**
> This is a continuation handover from Claude Code. Claude did **investigation only** (explicitly instructed
> not to change code) and got most of the way to a root cause with two confirmed structural bugs and one
> still-open question that needs either live terminal logs or a live repro to fully close. You (Codex) should
> **re-verify everything below against the current code first** (line numbers may have drifted), then
> **design and implement a fix**, then verify live per this repo's testing conventions (see §7).

---

## 0. The bug, in one sentence

A user submits a public form (`form`/`form_trigger` node). The submission itself succeeds and the browser
shows "Success!" — but the workflow execution that's supposed to run as a result gets **stuck forever at
`status: "running"` with zero node logs and zero output**, until an unrelated 5-minute watchdog eventually
kills it with a **generic, misleading** error (`"Execution timed out (stale_heartbeat) - no activity for
300s"`) that is **not** the real cause.

This is **not** a node-to-node data-forwarding bug. The workflow never gets far enough to execute the
Form Trigger node itself, let alone forward data downstream to Switch → Gmail → Slack → Log Output. The
failure is entirely inside the pre-execution phase of `/api/execute-workflow`, before any node runs.

**Scope note — this must be fixed universally, not just for forms.** The code path involved
(`worker/src/api/execute-workflow.ts`'s handling of a *resumed* execution via `providedExecutionId`) is
the **single shared entry point** used by every trigger type that pre-creates an execution row and then
asks the worker to resume it: form-trigger, webhook, chat-trigger, trigger-service, and approval-execution
(see the `isInternal*Execution` flags at execute-workflow.ts:18160-18165 — they all funnel into the exact
same code). **Fix it at that shared choke point, not by patching `form-trigger.ts`.** Doing so automatically
fixes it for all five trigger types at once, consistent with this repo's single-source-of-truth architecture
(see `CLAUDE.md` — no per-trigger-type special-casing).

---

## 1. Reproduction (exact case that surfaced this)

Workflow topology: `Form Trigger` (fields: `status`, `amount`) → `Switch`/`If-Else` (branch) → `Gmail` ×2
(one per branch) → `Slack` ×2 → `Log Output`. Workflow ID `9c7face0-4cac-4c03-88c3-f4fe0a04ea89`, form node
`node_9a5e9a54-af38-4119-a670-6cbd381eaf8b`. Local dev: worker on `http://localhost:3001`, frontend on
`http://localhost:8080`/`:5173`.

Steps:
1. Open the public form URL, fill it in, submit.
2. Browser shows "Success! Thank you. The payment status has been recorded and the workflow has been
   initiated." (This is misleading — see §4.1, the response is sent before the resume outcome is known.)
3. Open the workflow builder's Execution Console. The new execution row shows `status: running`,
   `duration: -`, "No valid execution logs found", "Final Output: null (no output generated)".
4. Wait ~5 minutes. The row flips to `status: failed`, `error: "Execution timed out (stale_heartbeat) - no
   activity for 300s"`. Logs are *still* empty.

### Exact execution-console state captured (first observation, ~immediately after submit)

```
running
7/13/2026, 6:01:07 PM
Duration: -

Form URL (Readonly)
http://localhost:8080/form/9c7face0-4cac-4c03-88c3-f4fe0a04ea89/node_9a5e9a54-af38-4119-a670-6cbd381eaf8b

Input
{
  "data": {
    "email": "vusalashivakumar@gmail.com",
    "amount": 11112,
    "payment_status": "success"
  },
  "form": {
    "id": "node_9a5e9a54-af38-4119-a670-6cbd381eaf8b",
    "title": "Payment Status Submission Form"
  },
  "meta": {
    "ip": "127.0.0.xxx",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    "submittedAt": "2026-07-13T12:31:07.734Z"
  },
  "email": "vusalashivakumar@gmail.com",
  "files": [],
  "amount": 11112,
  "submitted_at": "2026-07-13T12:31:07.734Z",
  "payment_status": "success"
}

Execution Logs (Node-by-Node)
No valid execution logs found

Final Output
null (no output generated)
```

**Note:** the submitted data is present and correct in the `Input` field — capture works fine. The problem
is purely downstream of this.

### Browser console output captured at/around the same time

```
🔍 Environment Debug: Object
App Configuration: Object
🌐 API Client initialized with base URL: http://localhost:3001
[Scheduler] Stopping all schedulers (0 active)
[Scheduler] ✅ All schedulers stopped
✅ Backend connection established
[LaunchDarkly] LaunchDarkly client initialized
[Scheduler] Stopping all schedulers (0 active)
[Scheduler] ✅ All schedulers stopped
[WorkflowBuilder][DEV] Raw DB row — position field types (first nodes, before normalize): Array(5)
[WorkflowBuilder] Loading workflow with 8 nodes
[WorkflowBuilder] Node node_9a5e9a54-af38-4119-a670-6cbd381eaf8b (form) has config: fields, captcha, _fillMode, formTitle, successMessage, formDescription, submitButtonText, requireAuthentication, allowMultipleSubmissions
[WorkflowBuilder] Node node_0da48603-ee11-492a-83e1-d96196266f71 (switch) has config: cases, rules, _fillMode, expression
[WorkflowBuilder] Node node_da7dd286-218e-45f2-9404-972434dfa868 (if_else) has config: _fillMode, conditions, combineOperation
[WorkflowBuilder] Node node_e49371d2-f750-4a0d-b229-a9661b91ca10 (google_gmail) has config: body, subject, _fillMode, operation, sheetName, maxResults, recipientEmails, recipientSource, _ownershipUnlock, useAiRecipientMapping
[WorkflowBuilder] Node node_4d77ebfa-90be-4cbd-8038-7e6179f9081c (google_gmail) has config: body, subject, _fillMode, operation, sheetName, maxResults, recipientEmails, recipientSource, _ownershipUnlock, useAiRecipientMapping
[WorkflowBuilder] Node node_098c3735-f091-4f2a-a554-69488ade3cdb (slack_message) has config: channel, message, username, _fillMode, iconEmoji, credentialId
[WorkflowBuilder] Node node_72219b15-4d40-42d9-a53f-d6021d6a401b (slack_message) has config: channel, message, username, _fillMode, credentialId
[WorkflowBuilder] Node node_0bbba51a-c1e6-4f93-ad86-600afa30ba9c (log_output) has config: level, _fillMode
[WorkflowValidation] 🔀 Preserving branching structure - keeping 7 edge(s) (skipping linearization)
[EdgeDebug] Loaded 10 valid edges from 10 total edges
[EdgeDebug] Loaded 8 nodes
[Scheduler] No scheduled workflows found
[EdgeDebug] Saving 10 valid edges (from 10 total)
[handleSave] Auto-attaching inputs after save: Object

:3001/api/workflows/9c7face0-4cac-4c03-88c3-f4fe0a04ea89/attach-inputs:1  Failed to load resource: the server responded with a status of 409 (Conflict)
[handleSave] Failed to auto-attach inputs: Object

[PropertiesPanel] ✅ Fetched backend schema for form: Object
[PropertiesPanel] ⚠️ Validation errors for form: Object
[PropertiesPanel] 🎯 Rendering form from backend schema (8 fields)

:3001/api/db/executions?select=id...&filter_workflow_id=9c7face0-4cac-4c03-88c3-f4fe0a04ea89:1  Failed to load resource: the server responded with a status of 503 (Service Unavailable)
Error loading executions: {message: "HTTP 503"}
:3001/api/db/executions?...:1  Failed to load resource: the server responded with a status of 503 (Service Unavailable)
Error loading executions: {message: "HTTP 503"}
```

Two errors worth noting, investigated below:
- `POST /api/workflows/:id/attach-inputs` → **409 Conflict** (happened at manual Save time, before this
  submission — see §4.4, most likely unrelated but flagged as a second possible symptom of the same *class*
  of "orphaned execution lock" problem, worth a quick check).
- `GET /api/db/executions` → **503 Service Unavailable**, repeated. This is a real circuit-breaker trip
  (see §4.3) and is a key piece of corroborating evidence for the timing hypothesis below.

---

## 2. Data flow map — how a form submission is *supposed to* reach node-by-node execution

Read these in order; this is the whole path from browser to executed nodes.

1. **Frontend route** `ctrl_checks/src/App.tsx:223` — `<Route path="/form/:workflowId/:nodeId"
   element={<FormTrigger />} />`. Renders the public form page, calls two backend endpoints.
2. **`GET /api/form-trigger/:workflowId/:nodeId`** → `getFormConfig`, `worker/src/api/form-trigger.ts:130`
   — returns the form schema + a `submitUrl`.
3. **`POST /api/form-trigger/:workflowId/:nodeId/submit`** → `submitForm`,
   `worker/src/api/form-trigger.ts:219`. Both routes are dispatched via `formTriggerHandler`
   (`form-trigger.ts:556`), registered in `worker/src/index.ts:1205-1206`.
4. Inside `submitForm` (`form-trigger.ts`):
   - Validates the workflow/form node (~240-278).
   - Finds a `waiting` execution for this node, or auto-creates one with `status: "waiting"` if none exists
     (~391-422).
   - Inserts an audit row into `form_submissions` (~452-461).
   - **Synchronously UPDATEs the `executions` row to `status: "running"`** (~478-485) — *before* anything
     has actually executed.
   - Fires an **unawaited, fire-and-forget** `fetch()` to `${config.publicBaseUrl}/api/execute-workflow`
     (~513-536) to resume the workflow. Its outcome is only `logger.info`/`logger.error`'d server-side —
     **never surfaced to the browser or to the execution row** on failure.
   - Immediately returns `{ success: true, message: successMessage }` to the browser (~538-543). **This is
     why the browser shows "Success!" regardless of what happens next.**
   - `config.publicBaseUrl` comes from `worker/src/core/config.ts:75` —
     `requireEnv('PUBLIC_BASE_URL', isProduction ? '' : 'http://localhost:3001')`. Confirmed correctly set
     to `http://localhost:3001` in local `.env` (i.e. this resume call *does* target the real worker
     process — ruled out as a misdirected-URL bug).
5. **`POST /api/execute-workflow`** → `executeWorkflowHandler`, `worker/src/api/execute-workflow.ts:17985`
   (⚠️ huge file, ~24k lines — line numbers below are as of this handover; re-grep before trusting them).
   Body includes `{ workflowId, executionId: <the row from step 4>, input }`.
6. Handler branches on `shouldUseQueue` (execute-workflow.ts:18005): `useQueue === true ||
   (useQueue === undefined && process.env.ENABLE_EXECUTION_QUEUE === 'true')`. **Confirmed `false` in this
   environment** — `ENABLE_EXECUTION_QUEUE` is not set in `worker/.env` (only appears in `.env.example`).
   So this always falls through to **direct execution**, not the Redis job queue. (A Redis-queue-without-a-
   consumer theory was considered and ruled out for this environment — re-check if `ENABLE_EXECUTION_QUEUE`
   is ever `true` in production/deployed environments, since that changes which branch applies there.)
7. **Direct execution branch** (execute-workflow.ts:~18154 onward) is where node-by-node logs actually get
   written (`logs.push(...)`, e.g. ~19504, 19777, 19799, 19871, 20071, 20335, 20503, 20673) and periodically
   persisted (`db.from('executions').update({ logs })`, e.g. ~19877, 19963, 20518, 20680).

**This is the entire path.** Steps 1-4 are confirmed working (the Input JSON proves it). The failure is
somewhere inside step 5-7, before the first node log is ever written.

---

## 3. The two confirmed/suspected root causes

### 3.1 CONFIRMED structural bug — the error safety-net can't fire for resumed executions

`execute-workflow.ts` declares its execution-id tracker early:

```
worker/src/api/execute-workflow.ts:18186   let executionId: string | undefined;
```

For a **resumed** execution (form/webhook/chat/trigger-service/approval — anything with `providedExecutionId`
set), this variable is **not assigned** until deep inside the lock-acquisition block:

```
worker/src/api/execute-workflow.ts:18844   executionId = existingExecution.id;
```

Everything between the top of the outer `try` (line 18241, right after the branch-selection logic) and that
assignment (18844) — **~600 lines**, covering credential discovery (`credentialDiscoveryPhase
.discoverCredentials`, called at line 18506), node-input discovery, type-mismatch validation, etc. — runs
with `executionId` still `undefined`. This is true **even though the real execution ID was already available
in the request body the entire time** (`providedExecutionId`, i.e. `req.body.executionId`).

The handler's own catch-all safety net exists specifically to prevent "stuck at running forever":

```
worker/src/api/execute-workflow.ts:21002-21008
// ✅ FIX: Mark execution as failed so the UI doesn't stay stuck at "running" forever.
if (executionId) {
  await db.from('executions').update({ status: 'failed', ... }).eq('id', executionId)...
}
```

But it keys off the **local** `executionId`, not `providedExecutionId`. So **any exception thrown in that
~600-line window during a resume** silently vanishes: not logged to the DB, not surfaced to the caller (the
resume `fetch()` in `form-trigger.ts` is fire-and-forget), and the execution row is permanently orphaned at
whatever status the caller last set (`"running"`), with a frozen `last_heartbeat`.

Confirm this yourself by re-reading `worker/src/api/execute-workflow.ts` from line 18186 down through the
catch block starting ~20971 (search for `} catch (error) {` at the matching indentation level — I found the
match via `awk 'NR>18241 && /^  \} catch/'`). **Also check**: is there *any other* early-return path in that
600-line window (e.g. a `return res.status(...)` for a validation failure) that similarly forgets to update
the execution row? Those would have the exact same symptom without even needing a thrown exception.

**This bug affects every trigger type equally** — it's in the shared `providedExecutionId` branch, not
form-specific code.

### 3.2 SUSPECTED triggering cause — unbounded, circuit-breaker-bypassing DB calls during credential discovery

This workflow has 4 credential-requiring nodes (2× Gmail OAuth, 2× Slack OAuth/token). Credential discovery
(`credentialDiscoveryPhase.discoverCredentials`, `worker/src/services/ai/credential-discovery-phase.ts:76`,
called from execute-workflow.ts:18506) loops every node and calls `discoverNodeCredentials`
(`credential-discovery-phase.ts:313`), which for each credential contract calls
`credentialResolver.checkVaultForCredential` **up to twice** (once for the real vaultKey, once more for a
`'google'` fallback if the first check fails and it's a Google OAuth contract) —
`credential-discovery-phase.ts:328-342`.

`checkVaultForCredential` → `checkVault` (`worker/src/services/ai/credential-resolver.ts:318-383+`) does:
- An early return `false` with **no DB call** if `!userId` (worth checking: is `userId` — i.e.
  `workflowOwnerId = workflow.user_id || currentUserId`, execute-workflow.ts:18427 — actually populated for
  an internal/unauthenticated form-triggered resume? If `workflow.user_id` is reliably set on saved
  workflows, this is populated and real DB calls proceed, as below. If it can be null, that changes the
  analysis — check both cases.)
- If `userId` is present: `resolveCredentialDryRun(...)`, then (for Google specifically) a direct query
  against `google_oauth_tokens` via `this.db.from(...)` — i.e. `getDbClient()`-style connections, **not**
  the circuit-breaker-guarded `queryAsService` used by `worker/src/core/database/db-pool.ts`.

So for 4 nodes × up to 2 checks each, this is up to **~8 sequential, awaited DB round-trips with no
apparent bounded timeout**, all happening *before* `executionId` gets assigned (§3.1) and before the first
`last_heartbeat` refresh in the resume path (`execute-workflow.ts:18889`, which only happens *after* the
lock-acquisition block that credential discovery precedes).

**Independent corroborating evidence:** the browser console (§1) shows `GET /api/db/executions` returning
**503** at essentially the same time. That 503 is a real circuit-breaker trip:
`worker/src/core/database/db-pool.ts` implements `withCircuit` (~107-119) — the first connection-class error
(`ECONNREFUSED`/`ETIMEDOUT`/`ENOTFOUND`/"connection terminated") opens the circuit for 30s, and every call
during that window fast-fails with `DbUnavailableError` → HTTP 503 (`db-pool.ts:~101-105`), pool config
`max: 10, min: 0, connectionTimeoutMillis: 5000` (`db-pool.ts:~27-37`).

**The asymmetry that matters:** `/api/db/executions` uses the circuit-breaker-protected path and *fast-fails*
(503, milliseconds). The credential-discovery DB calls in §3.2 use a *different, unprotected* client that
shares the same underlying `pg.Pool` but has no circuit-breaker fast-fail — so during the same period of DB
stress, instead of failing fast, they could genuinely **hang** (or take a very long time) waiting on a
strained pool. Stack ~8 of these sequentially and you can plausibly reach the 300-second heartbeat threshold
that the watchdog (§3.3) later reports.

**This is not fully confirmed.** It's the best-supported hypothesis given the evidence, but the *exact*
single call that stalled (vs. all 8 being cumulatively slow) is not pinned down. **This is the one thing
that needs either live worker terminal logs from the incident window, or a fresh live repro with logging
added, to close for certain.** See §5 for what to look for.

### 3.3 Confirmed: the "stale_heartbeat" error you eventually see is a red herring, not the real cause

`worker/src/services/execution/timeout-watchdog.ts` runs `checkStuckExecutions` on a periodic interval
(`startTimeoutWatchdog`, default every 30 min per the function signature, though check what interval it's
actually started with in `worker/src/index.ts`). It finds any `status: 'running'` row whose `last_heartbeat`
is >300s stale (`timeout-watchdog.ts:66-83`) and force-overwrites it:

```
error: `Execution timed out (${reason}) - no activity for ${Math.round(timeoutMs / 1000)}s`
```

This is a generic cleanup label, **not** the real underlying error — which, per §3.1, was never recorded
anywhere because the safety-net couldn't fire. Do not treat "stale_heartbeat" as informative beyond "this
row was orphaned and something upstream never updated it."

### 3.4 Probably unrelated, but worth a 2-minute check: the `attach-inputs` 409

`worker/src/api/attach-inputs.ts:~438-439, ~469-470` returns 409 when `workflow.active_execution_id` is set
or `workflow.phase`/`status` is `'executing'`/`'running'`. `active_execution_id` is only set by
`acquireExecutionLock()` (`worker/src/services/execution/execution-lock.ts:~186`), called from the direct-
execution branch (~execute-workflow.ts:18856, 18970) — i.e. only *after* the point where a stuck-in-§3.1/3.2
execution never reaches. So the 409 you saw at Save time was likely caused by a **different**, possibly also
orphaned, execution holding a stale lock. Worth one query: is `workflows.active_execution_id` for this
workflow non-null and pointing at a long-dead execution ID? If so, that's a second manifestation of the same
underlying "orphaned execution never releases its lock" problem class, and the fix in §6 should make sure
locks get released (or never acquired) when a resume fails early too.

---

## 4. What Claude could NOT do (and you may be able to)

- **Could not read the live worker terminal.** The worker runs via `npm run dev` → `nodemon --exec node
  ... -r ts-node/register src/index.ts` in a separate interactive terminal window; it logs to stdout via
  `pino` (`worker/src/core/logger.ts`) with **no file transport configured**. All the stale `.log` files
  found in `worker/logs/`, `worker/tmp/`, etc. predate this incident by weeks/months — not useful. If you
  have access to that terminal (or can restart the worker with output redirected to a file, or add a pino
  file transport temporarily), the single highest-value thing to capture is any line logged around
  `2026-07-13T18:01:07` through `18:06:07` (local) / `12:31:07Z` onward referencing workflow
  `9c7face0-4cac-4c03-88c3-f4fe0a04ea89` — specifically:
  - `[Form Submit] Resuming workflow execution ...` / `[Form Submit] Workflow resumed successfully` /
    `[Form Submit] Workflow resume failed (...)` (`form-trigger.ts:~525-536`) — tells you if the resume
    `fetch()` even completed and what it returned.
  - `[ExecuteWorkflow] 🔵 ENDPOINT_START` (execute-workflow.ts:~17990) — confirms the handler was entered.
  - `[CredentialDiscovery] ...` lines (`credential-discovery-phase.ts`) — shows how far discovery got and
    whether it logged any per-node errors (it catches and logs per-node, per §3.2's outer try/catch).
  - `[Workflow ...] Execute workflow error:` (execute-workflow.ts:~20972) — **if this line exists at all**,
    it means something threw and was caught by the outer catch (§3.1), and its message/stack is the real
    answer. If it's **absent**, that points toward a genuine hang (nothing ever threw) rather than a
    swallowed exception — still explained by §3.1/§3.2 either way (both produce the same DB-visible symptom),
    but useful to know which.

- **Was explicitly blocked from querying the live database directly.** Claude wrote a read-only diagnostic
  script (`SELECT` against `executions`/`workflows`) and the harness's auto-mode classifier denied it as a
  "production reads" action requiring explicit user authorization, since `worker/.env`'s `DATABASE_URL`
  points at a live AWS RDS instance with real user data. **If you have separate, explicit authorization from
  the user to query this database, that would be the fastest way to close §3.2**: check the `executions` row
  for this ID (or the most recent few) for exact `started_at`/`last_heartbeat` deltas, and check
  `workflows.active_execution_id` for §3.4. Otherwise, ask the user directly before doing this yourself too.

---

## 5. What to verify before touching code

1. Re-grep `worker/src/api/execute-workflow.ts` for `let executionId`, `executionId =`, `credentialDiscoveryPhase`,
   and the outer `try`/`catch` bounds — confirm line numbers above still hold (this file may have changed
   since this handover was written).
2. Confirm `ENABLE_EXECUTION_QUEUE` / `EXECUTION_ENGINE_ENABLED` are unset in `worker/.env` in this
   environment (already confirmed once — re-check if anything changed), and separately check whether they're
   set `true` anywhere in production/deploy config — if so, the queue/engine-delegation branches
   (execute-workflow.ts:18010-18152) need the same "resumed execution can silently vanish" audit applied to
   them too, since the fix must be universal.
3. Try to get real terminal logs or DB access per §4 before assuming §3.2 is the exact trigger — it's the
   best-supported hypothesis, not a certainty. Don't build an elaborate fix around it without checking.
4. Check whether other trigger types' submit handlers (webhook, chat-trigger, trigger-service, approval) have
   the same "synchronously mark running, then fire-and-forget resume, swallow the outcome" pattern as
   `form-trigger.ts:478-536` — if so, they all inherit both the visible symptom (misleading immediate
   success) and the invisible-failure problem, and the fix should cover them uniformly.

---

## 6. Fix directions (starting points — use judgment, this is not a mandate)

These are structural, not form-specific, and should be applied at the shared choke point in
`execute-workflow.ts` per the scope note in §0.

1. **Close the §3.1 gap.** Initialize `executionId` from `providedExecutionId` immediately after it's
   destructured from `req.body` (near line 18186/18209), rather than waiting until deep inside the
   lock-acquisition block. This alone makes the existing safety-net catch (line ~21002) actually work for
   every early failure, for every resumed-trigger type, with a minimal, low-risk change. Double-check nothing
   downstream relies on `executionId` being `undefined` as a "have we reached the resume block yet" signal
   (grep all uses of `executionId` in this function first).
2. **Bound the credential-discovery / pre-lock validation phase with a timeout.** Wrap the block from
   ~18244–18844 (or at minimum the `credentialDiscoveryPhase.discoverCredentials` call and the
   `checkVaultForCredential` DB calls inside it) in a `Promise.race` / `AbortController`-based timeout (e.g.
   10-15s) so a stalled DB call surfaces as a fast, real error instead of silently consuming the full
   5-minute watchdog window. Combined with fix #1, this ensures a stall gets recorded as
   `status: 'failed', error: '<real reason>'` within seconds, not discovered 5 minutes later under a fake
   label.
3. **Consider (lower priority, more invasive — flag for the user rather than assuming):** route
   `credential-resolver.ts`'s vault-check queries through the same circuit-breaker-protected path
   (`queryAsService` / `db-pool.ts`) that `/api/db/*` already uses, so a genuinely degraded DB fails fast
   (503) for credential discovery too, instead of hanging on an unprotected pool connection. This is a
   bigger change with more blast radius (touches a shared credential-resolution path used elsewhere) — don't
   do this without confirming it doesn't change behavior for other callers of `checkVaultForCredential`.
4. **Make the resume response honest, or at least not misleading.** Right now `form-trigger.ts` (and
   presumably its siblings) returns `{ success: true }` to the browser before knowing whether the resume
   actually worked. Consider whether the UI should reflect "submitted, workflow starting" rather than a bare
   "Success!" that implies the workflow ran — this is a product/UX call, flag it to the user rather than
   deciding unilaterally.
5. **After fixing #1 and #2**, re-run the original repro (§1) and confirm: (a) if credential discovery is
   genuinely slow/failing, the execution now fails fast with a real, useful error message within seconds,
   not 5 minutes; (b) if it isn't slow (i.e. §3.2 wasn't actually the trigger this time), the workflow
   completes normally end-to-end with node-by-node logs and the emails/Slack messages the earlier session's
   AI-Build-value fix (see git history around `unified-node-registry.ts` `getBuildValueContext` /
   `property-population-stage.ts`, same session, unrelated bug) correctly grounded.

---

## 7. Repo conventions to follow (from `CLAUDE.md` and this session's established norms)

- **Never run `npm test` locally** — it crashes the user's machine (established project convention). `npm
  run type-check` / `npx tsc --noEmit` inside `worker/` are fine and expected after any change.
- **No `if (node.type === '...')` / `switch (node.type)` branching outside the node registry** — not
  directly relevant to this execution-engine bug (it's not node-type-specific logic), but keep the fix at
  the shared `execute-workflow.ts` choke point rather than duplicating per-trigger-type patches, per the
  same single-source-of-truth spirit.
- **Don't touch unrelated code** while in `execute-workflow.ts` — it's a huge, sensitive file; scope edits
  tightly to the credential-discovery/resume-handling block.
- Verify via **live testing post-deploy** with test data/keys, not local `npm test` — per this repo's
  established testing strategy.
- If the concrete fix design has more than one reasonable shape (especially fix direction #3 in §6), confirm
  with the user before implementing, per this repo's normal working style.

---

## 8. Summary for a time-pressed reader

- Form data capture works. The workflow never executes past its own pre-flight checks, so nothing is
  "not forwarding between nodes" — nothing ever *starts*.
- Bug A (confirmed): `execute-workflow.ts`'s error safety-net can't record failures during the first ~600
  lines of a resumed execution because its `executionId` variable isn't populated until after that point,
  even though the ID was available in the request the whole time. This affects every trigger type that
  resumes an execution, not just forms.
- Bug B (strongly suspected, not 100% confirmed): credential discovery for workflows with several
  OAuth-requiring nodes does multiple sequential, unbounded-timeout DB calls via a client that bypasses this
  repo's DB circuit breaker — during a period of independently-observed DB stress (`/api/db/executions` 503),
  this plausibly stalled long enough to blow the 5-minute watchdog threshold.
- The "stale_heartbeat" error the user actually sees is a red herring — it's a generic cleanup label from an
  unrelated periodic watchdog, not the real cause.
- Fix both at the shared `execute-workflow.ts` resume-handling code, not in `form-trigger.ts`, so the fix
  covers form/webhook/chat/trigger-service/approval execution uniformly.
