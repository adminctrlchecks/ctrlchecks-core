# Codex Prompt: Autonomous Phase 4 AI Agent Node Implementation

You are taking over the CtrlChecks production-grade AI Agent node feature. Work in:

```text
C:\Users\user\Desktop\ctrlchecks-hostinger
```

## Mission

Implement, verify, deploy, and live-test the production-grade universal `ai_agent` node until it is properly working. Do not stop at planning, partial implementation, compile-only success, or local-only verification. Keep looping through plan -> implement -> focused test -> fix -> deploy -> live verify until the feature is working end to end.

Do not ask the user questions. Take all recommendations in the existing docs as approved. Make conservative engineering decisions that honor the codebase and the locked decisions.

## Required Reading First

Read these completely, in this order, before editing code:

1. `docs/AI_AGENT_HANDOVER_TO_CODEX.md`
2. `.claude/logs/ANALASISI.txt`
3. `docs/AI_AGENT_NODE_CONCEPT_AND_INTEGRATION.md`
4. `docs/AI_AGENT_IMPLEMENTATION_ANALYSIS.md`
5. `docs/AI_AGENT_IMPLEMENTATION_DESIGN.md`
6. `docs/AI_AGENT_IMPLEMENTATION_PLAN.md`

The latest Codex re-verification addenda in Analysis/Design/Plan are authoritative and must be treated as part of the implementation plan.

## Locked Decisions

- D1: Tool-calling uses `ChatModelAdapter`: native Gemini function-calling first, structured-JSON fallback for other providers.
- D2: Tool eligibility is generic metadata-driven: exclude normalized `category === 'trigger'` / raw `category === 'triggers'`, `internalOnly`, and `ai_agent` itself. Everything else auto-eligible. `firstRunClass` is guardrail metadata, not an eligibility filter.
- D3: Human-in-the-loop is a guardrail gate now: block and surface `write`/`destructive` as configured, structured for true async pause later.
- D4: Replace orphaned `AgentSettings.tsx` with standard config UX plus Tools panel.
- D5: Zero attached tools must remain byte-identical to today's single-shot `ai_agent` output and keep legacy `output` handle compatibility.

## Non-Negotiables

- Universal, dynamic, zero node hardcoding in the agent module.
- No node-type literal lists in `worker/src/core/execution/agent/**`.
- No `nodeType === 'some_node'` or `switch(nodeType)` in the agent module.
- Build tools from registry metadata only.
- Execute tools only through existing `executeNode()` / dynamic executor path.
- Model never sees secrets, credential fields, raw tokens, API keys, OAuth secrets, or sensitive logs.
- Reuse existing registry, executor, credential vault, `HybridMemoryService`, workflow persistence, connection bindings, and logging.
- Do not create a parallel executor, credential system, memory system, or mock tool-calling implementation.
- Do not run full test suites or `npm test`.

## Critical Re-Verification Corrections To Implement

- Canonical AI Agent attachment handles are `chat_model`, `memory`, `tool`, and input handle `userInput`. Accept `chatModel` only as an alias at boundaries.
- `execute-workflow.ts` legacy `case 'ai_agent'` is around `6629`.
- AI-agent port mapping spans around `execute-workflow.ts:20069-20256`; `targetHandle` is read around `20107`.
- `NodeExecutionContext` does not formally carry workflow edges. Add a deliberate typed attachment graph path or load `{nodes, edges}` from workflow persistence.
- Registry/backend ports currently expose only standard `input`/`output`; override `ai_agent` ports to include `userInput`, legacy `input`, `chat_model`, `memory`, `tool`, `success`, `error`, and legacy `output`.
- `node-handle-registry.ts` currently maps target `chat_model`/`memory`/`tool` to `input`; fix this so valid `ai_agent` attachment handles are preserved.
- Attachment edges must be persistable but must not behave as normal execution-order edges. Manual runtime execution must filter `chat_model`/`memory`/`tool` attachment edges out of topo/dependency execution while preserving them for the agent.
- Omitted `firstRunClass` means `write` per the shared contract and should be protected by guardrails.

## Implementation Loop

Use this loop until complete:

1. Re-read the relevant section of the plan for the current stage.
2. Inspect live files before editing.
3. Implement the smallest correct change using existing patterns.
4. Add or update focused tests for the changed behavior.
5. Run only targeted tests/builds/typechecks appropriate to touched files.
6. Fix failures.
7. Continue to the next stage only after the current stage has no known compile/runtime errors.
8. After all stages pass locally, deploy worker/backend changes to Hostinger and verify live health and a real AI-agent workflow path.
9. If deploy/live verification fails, fix, retest, redeploy, and repeat.
10. Stop only when the AI Agent node is working, tested, deployed if backend changed, and documented.

## Stage Order

Follow `docs/AI_AGENT_IMPLEMENTATION_PLAN.md`, with the re-verification corrections included:

- Stage A: Core backend `ai_agent`, shared agent types, backend registry ports, node schema, runtime attachment graph path, `execute-workflow.ts`, `node-handle-registry.ts`.
- Stage B: Generic tool manifest with zero node hardcoding.
- Stage C: Tool-calling loop.
- Stage D: Tool execution bridge through existing `executeNode()`, preserving attached tool node config and `connectionRefs`.
- Stage E: Credential integration by reuse only.
- Stage F: Memory wrapper over `HybridMemoryService`.
- Stage G: Frontend node metadata.
- Stage H: Frontend ports and attachment rules.
- Stage I: Configuration UX and Tools panel.
- Stage J: Persistence round-trip.
- Stage K: Observability/history/logging.
- Stage L: Guardrails, sanitizer, HITL gate.
- Stage M: Focused unit/integration tests and anti-hardcoding tests.
- Stage N: AI-generation pipeline and connection-readiness integration.
- Final documentation: create/update `docs/AI_AGENT_NODE_DOCUMENTATION.md` and update existing docs instead of duplicating where appropriate.

## Testing Rules

Never run:

```text
npm test
```

Never run full test suites. This machine can hang.

Allowed:

```text
cd worker
npx jest <single-test-file>
npm run type-check
npm run lint
npm run build

cd ctrl_checks
npx vitest run <single-test-file>
npm run type-check
npm run lint
npm run build
```

Create focused tests for:

- D5 zero-tools legacy output parity.
- Handle registry preserving `chat_model`/`memory`/`tool`.
- Manifest includes every registry node passing the generic predicate.
- Future fake node becomes a tool without agent-code changes.
- Agent module grep-guard for node-type hardcoding.
- Tool call attached/unattached validation.
- Invalid args rejection.
- Tool execution through `executeNode()`.
- Credential failure produces structured error without secret leakage.
- Iteration limit, timeout, loop detection.
- Result sanitizer.
- Memory recall.
- Saved workflow reload with attachment edges.
- Existing workflows still execute.
- AI-generation produces agent plus tool attachments when needed.
- Connection-readiness aggregates chat model plus all attached tool nodes.

## Deployment And Live Verification

After local focused tests/builds pass and backend runtime changed, deploy to Hostinger and verify live. Prefer existing scripts.

On Windows, prefer:

```text
python scripts/deploy-worker.py
```

If Bash is available:

```text
bash scripts/deploy-worker.sh
```

If local deploy scripts cannot run, use Git:

```text
git status --short
git add <only your intended files>
git commit -m "Implement production AI agent node"
git push
```

Then monitor the GitHub deploy workflow for Hostinger worker deployment, or SSH to Hostinger and pull/restart using the repo's documented runbook:

```text
docs/runbooks/deploy.md
```

After deploy, verify:

```text
curl -fsS https://worker.ctrlchecks.ai/health
curl -fsS https://worker.ctrlchecks.ai/health/live
```

Also use focused smoke/live scripts when safe and scoped:

```text
scripts/smoke-test.sh
scripts/run-live-tests.sh
```

If Bash is unavailable locally, perform equivalent PowerShell/OpenSSH steps using the deploy script/runbook as the source of truth.

Do not attempt direct production RDS writes. If no migration is needed, state none. If a migration becomes genuinely required, create the migration and document exactly what the owner must run; do not directly mutate production RDS.

## Completion Criteria

Do not stop until all are true:

- Manual canvas AI Agent works with attached tools.
- Zero-tools `ai_agent` behavior is byte-identical to legacy output.
- Tool manifest is registry-derived and future-node tested.
- Native Gemini function-calling works; fallback protocol works where applicable.
- Tools execute through existing executor with credentials isolated.
- Memory works through `HybridMemoryService` or gracefully no-ops when disabled.
- Frontend ports/config/Tools panel work and persist across save/reload.
- Attachment edges do not break execution order.
- AI-generation pipeline can create agent-with-tools workflows.
- Connection readiness accounts for chat model and all tool credentials.
- Guardrails, sanitizer, and HITL gate are implemented.
- Focused tests, type-check, lint, and builds pass or any unrelated existing failure is clearly separated.
- Worker is deployed to Hostinger if backend runtime changed.
- Live health checks pass.
- A real/smoke AI-agent workflow path is verified on the server as far as available credentials allow.
- Final docs are updated.

## Final Response Required

When complete, report concisely:

- Files modified/created.
- Tests run and results.
- Build/lint/type-check results.
- Deployment method and live health result.
- What was verified in production.
- Any remaining limitation that is truly external, such as missing provider credentials.

Do not ask questions. Make the recommendations yourself, implement them, verify them, deploy, and loop until done.
