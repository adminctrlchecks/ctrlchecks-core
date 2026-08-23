# AI Agent — Complete Session Summary & Handover

**Purpose of this document:** a single, complete, verified record of every bug found and fixed in this session, current live status, and what (if anything) remains open — written so a fresh session (human or Codex) can pick this up with zero missing context.

**Workflow used throughout:** `ee1c59d2-0e73-4ad1-ab75-4191461e578c` (clothing-business chatbot), then `afa062ab-e73d-488a-b314-4f6f2a3a071f` (chat-to-calendar bot).
**Repo:** `ctrlchecks-hostinger` monorepo — `ctrl_checks/` (frontend, Vercel), `worker/` (backend, Hostinger KVM4 at `root@187.127.185.105`, deployed via `bash scripts/deploy-worker.sh` — GitHub Actions worker deploy was observed stalling mid-session; the shell script is the reliable path).

---

## Part 1 — What was broken, in the order it was found, all fixed and live

Every item below was root-caused from **live server logs and a direct query against the running registry**, not guessed — the methodology (documented in full in `docs/AI_AGENT_END_TO_END_DEBUG_AND_FIX_LOG.md`) was: reproduce → pull live logs/registry state → find the exact line → fix → test → deploy → re-verify against the live bundle's content hash.

| # | Bug | Root cause | Fix location | Commit |
|---|---|---|---|---|
| 1 | Check Setup falsely reported AI Agent sidecars as unreachable | Sidecar↔sidecar edges kept every sidecar "incident" to an execution edge | `agentAttachmentEdges.ts` (both fe/be) | `1497f8c` |
| 2 | Graph re-corrupted itself on every load | Frontend `validateAndFixWorkflow`'s linearizer re-wired sidecars together on every load | `ctrl_checks/src/lib/workflowValidation.ts` | `c491ea9` |
| 3 | Gemini 400'd on any tool with an array field | `fieldToJsonSchema` omitted `items` for array-typed fields | `worker/.../tool-manifest.ts` | `66fbf65` |
| 4 | Sidecar ran as a standalone execution step | Worker's own linearizer had the same bug as #2; split only excluded sidecars with zero execution edges | `workflow-graph-normalizer.ts` + split guard | `ed7f71d` |
| 5 | Model's `spreadsheetId` hallucination overwrote the real one | Tool-call args merged over config unconditionally | `tool-adapter.ts` | `0a53112`, `d169cdd` |
| 6 | Two identical "Google Sheets" tools — model picked the wrong one | No disambiguating info in tool descriptions | `tool-manifest.ts` `buildDescription` | `d1afe74` |
| 7 | `range="read"` — Sheets 404 | Fuzzy/embedding resolver leaked the *operation* value into the *range* field; only later found this could persist via TWO write-back layers | `runtime-input-handoff.ts`, `dynamic-node-executor.ts` | `43ec8b9`, `0efeae3` |
| 8 | Every chat reply sent twice | AI Agent's built-in auto-forward fired *and* Chat Send also delivered | `execute-workflow.ts`, `chat-send.ts` | `a348db0` |
| 9 | Attached Memory node did nothing (`memory_written: false` always) | Memory scope was gated by the agent's own config only, never checked for an attached Memory node | `agent-executor.ts`, `agent-memory.ts` | `a348db0` |
| 10 | Reply edge visually rendered as if connected to "Tools" after refresh | Persisted `sourceHandle: "output"` (hidden fallback handle, same position as Tools) never corrected on load | `node-type-normalizer.ts` | `a101f87` |
| 11 | AI Agent blocked with "needs bearer_token connection" | `maxTokens` (a number) misclassified as a `generic_token` **credential** purely because its name contains "token" — synthesized a fake credential requirement on a node that never needed one | `field-ownership.ts` — credentials must be string-typed, structurally, for every node | `72f92ac` |
| 12 | Google Calendar `list` always 400'd | Node hardcoded `orderBy:"startTime"` + `singleEvents:false` together — an API-forbidden combination, and neither field was even exposed to override | `google-calendar-executor.ts` | `fbbd672` |
| 13 | Google Calendar errors only ever said generic "Bad Request" | Google's actual error detail (`error.response.data.error`) was read and then discarded | `google-calendar-executor.ts` (diagnostic logging) | `df2f69b` |
| 14 | Disabled fields (`description`/`timeMin`/`timeMax`/`q` = `"event"`) still reached the API after being toggled off in the UI — **pipeline A** | Toggle only ever set a `_fieldEnabled` flag, never cleared the value; `resolveInputsFromConfig` (dynamic pipeline) read the raw config value with zero awareness of that flag | `PropertiesPanel.tsx`, `dynamic-node-executor.ts`, `runtime-input-handoff.ts` (generalized beyond identity fields) | `7d87e6c` |
| 15 | **Same bug, second pipeline** — #14's fix didn't actually resolve the live symptom | Google Calendar (and every other node without a registry override) runs through a **second, completely separate** merge in `unified-node-registry-legacy-adapter.ts`, which had the identical unguarded fallback and was never touched by #14 | `unified-node-registry-legacy-adapter.ts` — extracted to `mergeLegacyResolvedInputs()`, same guard applied to both branches | `613a159` |

**#14 → #15 is the one worth flagging explicitly:** the first fix was verified correct in isolation (tests passed, deployed, confirmed live in the bundle) but did not fix the user-visible symptom, because the codebase has **two parallel node-execution/config-resolution pipelines** and the fix only covered one. This was caught by re-testing against live logs after claiming the fix was complete — not by assumption. See Part 2.

---

## Part 2 — The architectural fact that must not be forgotten: TWO resolution pipelines

Every node in this registry executes through **exactly one** of two independent code paths, and any future "universal" fix to input/config resolution must be applied to **both**, or it isn't universal:

1. **Dynamic pipeline** — `worker/src/core/execution/dynamic-node-executor.ts`. Used by nodes that have an explicit override registered in `worker/src/core/registry/unified-node-registry-overrides.ts` (e.g. `ai_agent`, `chat_send`, `google_calendar_trigger`). Config resolution: `resolveNodeInputsUniversalContract` → `resolveInputsFromConfig` → (for tool calls) `runtime-input-handoff.ts`'s `buildFinalProviderConfig`.
2. **Legacy pipeline** — `worker/src/core/registry/unified-node-registry-legacy-adapter.ts` (`executeViaLegacyExecutor`) → `worker/src/api/execute-workflow.ts`'s giant per-type `executeNodeLegacy` switch. Used by every node **without** an override — this is most of the 178 registered nodes, including `google_calendar`, `google_sheets`, and the majority of provider integrations. Config resolution: its own inline merge, now extracted to `mergeLegacyResolvedInputs()`.

Both pipelines now enforce the same invariant (a `_fieldEnabled: false` field's value never reaches the API, in either pipeline, regardless of source). **Before this session, neither did.**

**Action item for whoever picks this up next:** if you find or are asked to fix *any* other "the config resolver did something wrong" class of bug, check whether it needs to be fixed in **both** `dynamic-node-executor.ts`/`runtime-input-handoff.ts` **and** `unified-node-registry-legacy-adapter.ts`. Given most nodes go through the legacy pipeline, a fix that only touches the dynamic pipeline will look complete (tests pass, deploys clean) while doing nothing for the majority of real nodes.

---

## Part 3 — Current live status (verified at time of writing)

- Worker: healthy, restarted `2026-08-22 22:34:17 UTC`, all fixes 1–15 plus the follow-up Google Calendar provider-boundary blank-filter normalization confirmed present in the deployed bundle via direct grep on `/opt/ctrlchecks-worker/dist/` (`getLegacyInputSchema` and `compactCalendarParams` markers).
- Frontend: fixes 1, 2, 10, 14(A) confirmed live via content-hash verification against `www.ctrlchecks.ai`.
- All automated tests added this session (≈45 across ~12 files) pass; the final focused re-run also passed `worker/src/core/registry/__tests__/legacy-adapter-field-ownership.test.ts` and `worker/src/shared/__tests__/google-calendar-executor.test.ts`. No full test suites were run.
- Required gates passed before the final worker deploy: `npm run type-check` and `npm run build` in `worker/`; `npx tsc --noEmit` and `npm run build` in `ctrl_checks/`.
- Workflow `afa062ab-e73d-488a-b314-4f6f2a3a071f` was re-tested live after deploy by sending `list 1 upcoming event` to chat trigger `chat_trigger_4235309e-e95e-4bc5-b9b8-b2058e3b7f59`. Execution `9ffed2c2-a011-4215-987e-ce895cc794a2` succeeded: worker logs show `Executed Google Calendar`, no `[GoogleCalendar] API error detail`, Chat Send sent `Here is your next upcoming event:`, and the execution was marked `success` at `2026-08-22T22:35:47Z`.
- Important nuance from the re-test: `613a159` fixed the second-pipeline stale `"event"` contamination, but the first post-fix live run still 400'd because the legacy Calendar params carried blank optional filters (`timeMin`, `timeMax`, `q`) as empty strings. The deployed shared `google-calendar-executor.ts` follow-up now omits blank optional `events.list` filters at the provider boundary, while preserving the `orderBy:"startTime"` -> `singleEvents:true` rule.

---

## Part 4 — Known open items (not fixed, intentionally out of scope, or genuinely unfixable universally)

1. **Tool-description disambiguation gap** (from the earlier end-to-end log): if two tools of the *same* type are attached (e.g. two Calendars), the auto-generated disambiguating description doesn't include `calendarId`/`databaseId`-style keys. Mitigated today by giving attached nodes distinct labels. One-line fix if it's ever hit in practice — extend the `targetKeys` list in `tool-manifest.ts`'s `buildDescription`.
2. **Provider API interdependency rules are not universally discoverable.** Bug #12 (Calendar `orderBy`/`singleEvents`) is an instance of a class that has no single permanent fix — every provider has its own undocumented parameter constraints. The realistic process, not a patch: when a live 400/422 surfaces, check that operation's code for two-or-more independently-defaulted parameters (now a fast, known diagnostic, not a mystery).
3. **GitHub Actions worker deploy instability** — observed stalling mid-session with no error, no completion. Never blocked shipping (the shell script `scripts/deploy-worker.sh` was used instead throughout), but worth a separate look at why the Actions runner hangs.

---

## Part 5 — Prompt for a fresh Codex/Claude session (verbatim, ready to paste)

```
You're picking up work on CtrlChecks (worker/ + ctrl_checks/ monorepo). Read
docs/AI_AGENT_COMPLETE_SESSION_SUMMARY_AND_HANDOVER.md and
docs/AI_AGENT_END_TO_END_DEBUG_AND_FIX_LOG.md and
docs/BLANK_FIELD_INTEGRITY_ROOT_CAUSE_RESEARCH.md in full before doing
anything else — they contain the complete verified history of 15 bugs found
and fixed in the AI Agent + attached-tool execution path this session, plus
one critical architectural fact you must not violate:

THE CODEBASE HAS TWO PARALLEL NODE-EXECUTION / CONFIG-RESOLUTION PIPELINES:
1. dynamic-node-executor.ts (nodes WITH a registry override in
   unified-node-registry-overrides.ts)
2. unified-node-registry-legacy-adapter.ts -> execute-workflow.ts's
   executeNodeLegacy switch (nodes WITHOUT an override — this is MOST nodes)

Any fix to input/config resolution, field-ownership handling, identity-field
protection, or similar cross-cutting execution concerns MUST be verified
against BOTH pipelines, or it is not actually universal — this exact mistake
happened once already this session (fix 7d87e6c only covered pipeline #1;
the live symptom it was meant to fix, Google Calendar fields retaining a
stale "event" value after being disabled in the UI, was NOT actually
resolved until commit 613a159 fixed the identical gap in pipeline #2).

YOUR IMMEDIATE TASK:
1. Verify fix 613a159 (mergeLegacyResolvedInputs in
   unified-node-registry-legacy-adapter.ts) actually resolves the live issue.
   Test via the chat URL for workflow
   afa062ab-e73d-488a-b314-4f6f2a3a071f — send "list 1 upcoming event" — and
   confirm it succeeds (no more 400). If it still fails, pull live worker
   logs (journalctl -u ctrlchecks-worker, SSH root@187.127.185.105, key
   ~/.ssh/id_ed25519) around the exact timestamp and look specifically for
   the "[GoogleCalendar] API error detail" log line (added this session,
   commit df2f69b) — it contains the exact params sent to Google and will
   tell you immediately whether description/timeMin/timeMax/q are still
   "event" or genuinely absent now.

2. If it's still broken, do NOT guess. Use the same methodology as this
   whole session: pull the exact live log for the exact failing request,
   trace which of the two pipelines built that request's config, and check
   whether isFieldDisabledByOwner (worker/src/core/execution/
   runtime-field-contract.ts, exported this session) is actually being
   consulted on that path. There may be a THIRD code path neither pipeline
   covers (e.g. attach-inputs.ts's own save-time logic, or a caching layer
   that captured a pre-fix config snapshot) — don't assume the two pipelines
   documented here are exhaustive; verify.

3. Rules for this whole codebase, already established and must be followed:
   - Never run `npm test` or full test suites (crashes the local machine).
     Single-file `npx jest <path>` / `npx vitest run <path>` is fine.
   - Always type-check (`npm run type-check` in worker/, `npx tsc --noEmit`
     in ctrl_checks/) and build both before deploying.
   - Deploy worker via `bash scripts/deploy-worker.sh` from repo root — do
     not rely on GitHub Actions for the worker deploy, it has been observed
     hanging with no error this session. Frontend deploys via git push
     (Vercel/GitHub Actions) and has been reliable.
   - After deploying, verify the fix is ACTUALLY live by SSHing in and
     grepping the deployed dist/ file for a marker unique to your change —
     every fix this session was verified this way, not assumed from a
     successful deploy script exit code alone.
   - No direct writes to the production RDS database — SSH read access
     (journalctl, grepping dist/ files) is fine and was used extensively.
   - Never hardcode a fix to a specific node type (google_calendar,
     google_sheets, etc.) when the underlying gap is general — every fix
     this session that mattered was a small change to a shared,
     registry-level function, not a per-node patch. If you find yourself
     writing `if (nodeType === 'x')`, stop and find the shared code path
     instead.

4. Once confirmed working, update
   docs/AI_AGENT_COMPLETE_SESSION_SUMMARY_AND_HANDOVER.md Part 3 and Part 4
   with the new verified status, and remove item 4 from Part 4's open-items
   list.
```

---

## Part 6 — Files touched this session (complete list, for reference)

**Frontend (`ctrl_checks/`):**
`src/lib/agentAttachmentEdges.ts`, `src/lib/workflowValidation.ts`, `src/lib/node-type-normalizer.ts`, `src/components/workflow/PropertiesPanel.tsx`, plus test files under matching `__tests__/` directories and `src/stores/__tests__/workflowStore.updateNodeConfig.test.ts`.

**Worker (`worker/`):**
`src/core/utils/agent-attachment-edges.ts`, `src/core/utils/workflow-graph-normalizer.ts`, `src/core/execution/agent/tool-manifest.ts`, `src/core/execution/agent/tool-adapter.ts`, `src/core/execution/agent/agent-executor.ts`, `src/core/execution/agent/agent-memory.ts`, `src/core/registry/overrides/chat-send.ts`, `src/api/execute-workflow.ts`, `src/core/execution/runtime-input-handoff.ts`, `src/core/execution/dynamic-node-executor.ts`, `src/core/utils/field-ownership.ts`, `src/shared/google-calendar-executor.ts`, `src/core/execution/runtime-field-contract.ts`, `src/core/registry/unified-node-registry-legacy-adapter.ts`, plus matching test files under `__tests__/` directories.

**Docs added this session:**
`docs/AI_AGENT_END_TO_END_DEBUG_AND_FIX_LOG.md`, `docs/BLANK_FIELD_INTEGRITY_ROOT_CAUSE_RESEARCH.md`, `docs/AI_AGENT_COMPLETE_SESSION_SUMMARY_AND_HANDOVER.md` (this file).
