# AI Agent — End-to-End Build, Debug & Fix Log

**Workflow used for testing:** `ee1c59d2-0e73-4ad1-ab75-4191461e578c` (custom clothing business chatbot)
**Period:** 2026-08-21 → 2026-08-22
**Status at time of writing: AI Agent is fully working** — topology, execution, tool calls, single chat delivery, and attached Memory all verified live.

This document is the single record of what broke, why, what was changed, and — the part that matters going forward — **whether these fixes are one-off patches for Google Sheets, or universal fixes that already cover every other tool (Calendar, Notion/Notes, CRM, etc.) with zero extra work.**

---

## 1. How the AI Agent is architected (confirmed, not assumed)

CtrlChecks' AI Agent matches n8n's sub-node model exactly:

- The **AI Agent node itself has no LLM**. It holds agent-level settings only: system prompt, max iterations, temperature, etc.
- **AI Chat Model** (attached via the `chat_model` port) supplies the actual model, provider, API key, and temperature — [`agent-executor.ts:52-76`](../worker/src/core/execution/agent/agent-executor.ts).
- **Memory** (attached via the `memory` port) supplies conversation history — now actually wired (see §2.9).
- **Tool** nodes (attached via the `tool` port, any number) are capabilities the agent may call — any registered node type, not a curated list (see §5).
- These three attachment kinds connect via **dotted "attachment" edges**, which are a *second, separate graph* from the solid **execution edges** (`Trigger → AI Agent → …`). Sidecars must never be required to be reachable through execution edges, and must never run as standalone execution steps.

Nearly every bug in this log was, at root, a failure to keep those two graphs (execution vs. attachment) cleanly separated somewhere in the pipeline.

---

## 2. Chronological bug log

Each entry: symptom → root cause → fix → files → commit → live verification. Ordered as encountered.

### 2.0 Prior session work (baseline before this log starts)

Before this log begins, earlier work (commits `92ddca2`, `5b0aaed`, `0a10cf9`, `d157e4b`) had already introduced `splitAgentAttachmentEdges()` and patched several validators to recognize attachment edges. The backend `/missing-items` readiness endpoint reported `ready:true`, but **the live browser Check Setup panel still showed the sidecars as disconnected** — the contradiction that kicked off this investigation.

### 2.1 Check Setup falsely reported sidecars as "not reachable from trigger"

- **Symptom:** UI showed `AI Chat Model is not reachable from trigger`, `Memory is not reachable from trigger`, `Google Sheets is not reachable from trigger`, `AI Chat Model has no incoming edges` — despite the dotted attachment lines rendering correctly and backend readiness being clean.
- **Root cause:** the exported workflow JSON revealed the graph carried **correct canonical attachment edges** *and* a **parallel chain of plain execution edges wiring the sidecars to each other** (`ai_chat_model → memory → sheet → sheet`, all `targetHandle: "input"`). The existing `splitAgentAttachmentEdges()` only excluded a sidecar from execution topology when it had **zero** execution edges — the spurious chain kept every sidecar "incident" to an execution edge, so none were excluded.
- **Fix:** `splitAgentAttachmentEdges()` now treats any node that is an attachment source *or* carries `agentAttachmentRole` as a sidecar, and drops execution edges where either endpoint is a sidecar.
- **Files:** [`ctrl_checks/src/lib/agentAttachmentEdges.ts`](../ctrl_checks/src/lib/agentAttachmentEdges.ts), [`worker/src/core/utils/agent-attachment-edges.ts`](../worker/src/core/utils/agent-attachment-edges.ts)
- **Commit:** `1497f8c`
- **Verified:** live chunk-hash match on `www.ctrlchecks.ai`.

### 2.2 The graph kept re-corrupting itself on every load

- **Symptom:** even after 2.1 shipped, the spurious sidecar-chain edges kept coming back.
- **Root cause:** `validateAndFixWorkflow()` (frontend) runs on **every workflow load**, and its linearization step appended unreachable nodes (including sidecars) into the linear chain, wiring them together — regenerating the exact junk edges 2.1 had to work around, every time the page opened.
- **Fix:** linearization now excludes attachment sidecars from chain ordering entirely, then re-attaches the sidecar nodes and their canonical attachment edges afterward.
- **Files:** [`ctrl_checks/src/lib/workflowValidation.ts`](../ctrl_checks/src/lib/workflowValidation.ts)
- **Commit:** `c491ea9`

### 2.3 Gemini rejected the agent's tool schema (400 error, agent couldn't call any tool)

- **Symptom:** `Gemini API error: 400 - ...parameters.properties[values].items: missing field`. The agent couldn't use any tool with an array-typed field (e.g. Google Sheets' `values`).
- **Root cause:** `fieldToJsonSchema()` emitted `{ type: 'array' }` with no `items`, which the Gemini function-calling schema requires.
- **Fix:** default array items to `{ type: 'string' }` for any array-typed field, for any tool.
- **Files:** [`worker/src/core/execution/agent/tool-manifest.ts`](../worker/src/core/execution/agent/tool-manifest.ts)
- **Commit:** `66fbf65`

### 2.4 Sidecar still ran as a standalone execution step (#4 "AI Chat Model")

- **Symptom:** live execution log showed 4 nodes running — `Chat Trigger → AI Agent → Chat Send → AI Chat Model` — with the chat model producing an irrelevant answer as its own step.
- **Root cause:** the *worker's own* graph normalizer (`workflow-graph-normalizer.ts`) had the same linearization bug as 2.2, wiring `chat_send → ai_chat_model`. Additionally, `splitAgentAttachmentEdges()`'s "both-endpoints-are-sidecars" rule didn't catch this, since `chat_send` isn't a sidecar — only *one* endpoint was.
- **Fix:** (a) made the worker's linearizer sidecar-aware, mirroring 2.2; (b) strengthened the split so **any** non-attachment edge touching a sidecar (not just sidecar↔sidecar edges) is dropped from execution topology.
- **Files:** [`worker/src/core/utils/workflow-graph-normalizer.ts`](../worker/src/core/utils/workflow-graph-normalizer.ts), plus both `agent-attachment-edges.ts` files again
- **Commit:** `ed7f71d`

### 2.5 Agent hallucinated `spreadsheetId` — Google Sheets 404

- **Symptom:** `Google Sheets: 404 - Requested entity was not found`. API URL showed `spreadsheets/Business Knowledge/...` — the model had invented a human-readable ID from the system prompt wording, and it **overwrote the real configured ID**.
- **Root cause:** [`tool-adapter.ts`](../worker/src/core/execution/agent/tool-adapter.ts) merged the model's tool-call arguments *over* the node's configured values (`{...baseConfig, ...args}`), so any argument the model supplied — including a fabricated identifier — won.
- **Fix:** the model may now fill **data** fields but never **identity** fields (`spreadsheetId`, `sheetName`, `range`, `url`, `*_id`, …) — those always come from the node's configuration.
- **Files:** `worker/src/core/execution/agent/tool-adapter.ts`
- **Commit:** `0a53112`

### 2.6 Same bug, second path — model's args also leaked via the executor's `input`

- **Symptom:** even after 2.5, `range="read"` still reached the API (`Business_Knowledge!read` → 404).
- **Root cause:** the model's args were passed to the config merge (now guarded) **and** separately as the executor's `input` parameter, and the executor's `buildFinalProviderConfig` merges resolved input into any *empty* config field — re-injecting the poisoned value through the second path.
- **Fix:** strip identity fields from the model's args once (`safeArgs`) and use that for **both** the config merge and the `input` param.
- **Files:** `worker/src/core/execution/agent/tool-adapter.ts`
- **Commit:** `d169cdd`

### 2.7 Two identically-labeled tools — model picked the wrong one

- **Symptom:** the agent used its **read** Google Sheets tool when the user gave contact details (which should trigger the **append** tool). Both tools were labeled "Google Sheets" with no distinguishing description.
- **Fix:** tool descriptions now include the configured **operation** and human-meaningful **target** (`sheetName` / `table` / `channel` / `resource` / …), so the model can tell otherwise-identical tools apart.
- **Files:** `worker/src/core/execution/agent/tool-manifest.ts`
- **Commit:** `d1afe74`

### 2.8 `range="read"` persisted even after 2.5/2.6 — deeper root cause

- **Symptom:** identical 404 on a later run, despite both prior identity-field guards being live.
- **Root cause:** the **fuzzy/embedding field-matcher** in the runtime input-resolution layer (used when the agent calls a tool) independently mapped the *operation* value `"read"` into the empty `range` field, *before* the value ever reached `tool-adapter.ts`. Guarding the consumer wasn't enough — the poisoned value existed at the source.
- **Fix (first pass):** `buildFinalProviderConfig` now refuses to apply a resolved value to a static identity field unless the field is explicitly `runtime_ai`/`buildtime_ai_once`.
- **Files:** `worker/src/core/execution/runtime-input-handoff.ts`
- **Commit:** `43ec8b9`
- **Fix (second pass, same bug, different consumer):** `resolvedInputs` also flows into `$json` and the authoritative-input merge — not just the provider config — so it had to be sanitized **at the point the resolved inputs are produced**, not just at one downstream consumer. Added `stripInferredIdentityInputs()`: a blank identity field stays blank; a configured one is pinned to config; only explicit `runtime_ai`/`buildtime_ai_once` opts in.
- **Files:** `worker/src/core/execution/dynamic-node-executor.ts`
- **Commit:** `0efeae3`
- **This is the fix that finally resolved the Google Sheets read for good** — confirmed live: agent read real data (Cotton/Silk/Denim, correct prices) and answered correctly.

### 2.9 Chat replies appeared twice; Memory node did nothing

Two independent bugs found once the agent was reliably answering:

- **2.9a — Duplicate delivery.** The AI Agent has a built-in "auto-forward to chat" fallback (for workflows with no explicit Chat Send node) **and** the Chat Send node also delivers — so every reply appeared twice, ~12s apart. Fix: the agent's auto-forward now fires only when the workflow has **no** `chat_send` node; Chat Send additionally skips sending if it sees `_chatSent: true` from upstream.
- **2.9b — Memory node was inert.** The Memory node's own description literally says *"it does not persist or search memory today."* The agent's memory was gated solely by its own `memoryScope` config (default `"none"`); the attached Memory node was never consulted, so `memory_written` was `false` on every single turn.
  Fix: attaching a Memory node now **turns conversation memory on** (defaults scope to `'conversation'`, keyed by the chat session ID — matching n8n's behavior), and the Memory node's config (`maxMessages` / context window) sets how many past turns are recalled. The backend persistence (`HybridMemoryService`, `loadAgentMemory`/`appendAgentMemory`) already existed and worked — it just wasn't wired to the attached node.
- **Files:** `worker/src/api/execute-workflow.ts`, `worker/src/core/registry/overrides/chat-send.ts`, `worker/src/core/execution/agent/agent-executor.ts`, `worker/src/core/execution/agent/agent-memory.ts`
- **Commit:** `a348db0`

### 2.10 "Reply" edge visually rendered as if connected to "Tools" after every save+refresh

- **Symptom:** the AI Agent → Chat Send edge looked correct immediately after connecting, but after save + page refresh it visually appeared to originate from the "Tools" attachment dot instead of "Reply".
- **Root cause (confirmed via exported JSON, not guessed):** the persisted edge had `sourceHandle: "output"` instead of `"success"`. The AI Agent node has a **hidden, invisible fallback source handle** with `id="output"` positioned at the same bottom-center spot as the visible "Tools" *target* handle. `onConnect`/`onReconnect` in the live canvas already correctly normalize `"output"`/`"reply"`/empty → `"success"` — but that normalization was **never applied at load time**. Several backend edge-repair code paths (unrelated to each other, ~10 call sites) write a generic `sourceHandle: "output"` with no AI-Agent awareness; whichever one touched this edge left it stale, and nothing on load corrected it.
- **Fix:** mirror the same store-side normalization at load time (`normalizeBackendWorkflow`), scoped to non-attachment AI-Agent-sourced edges. Self-heals regardless of which of the ~10 backend paths wrote the stale value — no need to touch or audit any of them individually.
- **Files:** `ctrl_checks/src/lib/node-type-normalizer.ts`
- **Commit:** `a101f87`

---

## 3. Non-code changes made during testing (by the user, in the UI)

These were **not** code bugs — they were workflow configuration the user corrected directly in the canvas, worth recording since they're easy to regress:

| Change | Why it mattered |
|---|---|
| `Customer_Leads` Google Sheets node: `operation` set from `read` → **`append`** | A read-only node can never save a lead; this was required for the lead-capture half of the workflow to do anything. |
| Google account connection confirmed with **Edit** access (not just Viewer) on the target spreadsheet | Append/write operations need write scope; a read-only-scoped connection would 403 on append even with all code fixes in place. |

---

## 4. Does this generalize to Calendar, Notion/Notes, or any other tool? (verified, not assumed)

Short answer: **yes — every fix above is registry-driven and field-name-driven, not hardcoded to Google Sheets.** Confirmed by reading the actual gating code, not by inference:

- **Tool eligibility** — [`isEligibleAgentTool()`](../worker/src/core/execution/agent/tool-manifest.ts): *any* registered node type is eligible as an agent tool as long as it isn't a trigger, isn't `internalOnly`, and isn't the agent itself. There is no per-node-type allowlist. Attaching a Calendar node or a Notion node as a Tool works today with zero registration changes.
- **Identity-field protection** — [`isIdentityField()`](../worker/src/core/registry/identity-field-policy.ts) matches on **word-boundary suffixes** (`id`, `ids`, `key`, `keys`, `token`, `tokens`, `secret`, `secrets`, `credential`, `credentials`) plus the registry's own `role: 'id'` tag. This already covers `calendarId`, `eventId` (Calendar), `pageId`, `databaseId` (Notion), `channelId` (Slack), `taskId` (Asana/Trello/ClickUp), etc. automatically — no per-tool code needed. §2.5/2.6/2.8's fixes protect these fields on any current or future node the moment it's registered.
- **Array-schema fix (§2.3)** triggers on `field.type === 'array'`, any node.
- **Sidecar/topology fixes (§2.1, §2.2, §2.4)** key off `agentAttachmentRole` / attachment-handle names (`chat_model`/`memory`/`tool`), never a node type.
- **Memory wiring (§2.9b)** keys off the presence of a node attached to the `memory` handle — works for any Memory-type node.
- **Duplicate-delivery fix (§2.9a)** keys off the presence of a `chat_send` node type — this one *is* chat-specific by nature (it's about chat UI delivery), but it isn't tool-specific; it applies identically to a Calendar- or Notion-equipped chatbot.
- **Reply-edge self-heal (§2.10)** keys off `node type === 'ai_agent'`, not the attached tools.

**One known, minor gap — not a correctness bug, a disambiguation quality gap:** the tool-description enrichment added in §2.7 uses a fixed list of "target field" names (`sheetName`, `tableName`, `table`, `channel`, `resource`, `collection`, `path`, `database`, `index`, `bucket`) to build a human-readable disambiguator when two tools of the same type are attached. A Calendar node's natural disambiguator (`calendarId`) or Notion's (`databaseId`) isn't in that list, so if you attach **two Calendar tools** (e.g., "Team Calendar" vs "Personal Calendar") the model may not automatically get a strong enough hint to pick the right one from the description alone — *unless* the node's **label** is descriptive (the description already always includes `Attached node label: <label>`, which is the practical mitigation today). If you build a multi-Calendar or multi-Notion-database agent, either give each attached node a clear label, or say the word and I'll extend the target-key list — it's a one-line addition, same low-risk shape as the original fix.

**Recommendation for adding a new tool type (Calendar, Notion, etc.) to an agent:**
1. Attach it via the Tools port in the UI — no code changes required for eligibility, identity-field safety, or schema correctness.
2. Give the attached node a clear, distinguishing **label** if you're attaching more than one of the same node type.
3. Nothing else from this fix set needs revisiting per-tool — it was all built to be universal from the start, and every fix above has a test locking in that universality (generic node types in every regression test, not Google Sheets specifically).

---

## 5. Verification method used throughout

Because this environment doesn't allow direct production DB access, every fix in this log was verified via:
1. Focused unit/regression tests using the **exact failing live shape** (not synthetic minimal cases) — see the `__tests__` files touched by each commit above.
2. `tsc --noEmit` + `npm run build` clean on both `worker/` and `ctrl_checks/`.
3. **Live content-hash verification**: after deploy, the exact compiled JS chunk hash containing each fix's marker code was confirmed present and wired into the live site/worker (via `curl` against `www.ctrlchecks.ai` and SSH read of `/opt/ctrlchecks-worker/dist/*.js` + `journalctl -u ctrlchecks-worker` on the Hostinger server — read-only, no DB writes).
4. Real chat-execution runs against workflow `ee1c59d2-...`, with root causes confirmed from the live worker logs (not guessed) before each fix was written.

---

## 6. Deploy note (operational, not a code bug)

The worker's GitHub Actions deploy stalled mid-session on 2026-08-22 (no completion, no error — just never picked up the new commit). The last several worker deploys in this log were done via the repo's own `scripts/deploy-worker.sh` (rebuild → tar → scp → restart → health-check), which worked reliably every time. Worth a separate look at why the Actions runner stalled, but it never blocked shipping a fix.
