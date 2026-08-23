# AI Agent Node — Phase 1 Discovery & Architecture Analysis

> **Status: DISCOVERY ONLY. No code written. Awaiting approval before Phase 2 (Design).**
> Produced per `.claude/logs/ANALASISI.txt`. Every claim below was verified against the
> repository (file + line references given). Nothing here is assumed.

---

## 0. Executive summary — the single most important finding

**A partial `ai_agent` node already exists, but it is NOT an agent.** It is a plain
single-shot LLM chat node, and the sub-node ports it was originally designed with
(**Chat Model / Memory / Tool**) have already been **removed** from the product.

Concretely, verified in code:

- `ai_agent` **is a registered node** — override at [`worker/src/core/registry/overrides/ai-agent.ts`](worker/src/core/registry/overrides/ai-agent.ts), schema in [`node-library.ts:5747`](worker/src/services/nodes/node-library.ts), frontend def at [`nodeTypes.ts:1887`](ctrl_checks/src/components/workflow/nodeTypes.ts).
- Its actual execution ([`execute-workflow.ts:6629`](worker/src/api/execute-workflow.ts)) does **one** LLM call and returns text. `used_tools: []` and `memory_written: false` are **hard-coded** ([execute-workflow.ts:6850-6851](worker/src/api/execute-workflow.ts)). There is **no tool loop, no tool discovery, no reasoning iteration.**
- The `chat_model`, `memory`, and `tool` node schemas are still present but explicitly marked `internalOnly: true` with the comment *"…stub for the **removed** ai_agent \<X\> port — legacy workflows only"* ([node-library.ts:8938, 8992, 9056](worker/src/services/nodes/node-library.ts)).
- The frontend still carries dormant scaffolding: `isAIAgentNode` with a `userInput` handle ([WorkflowNode.tsx:216-218](ctrl_checks/src/components/workflow/WorkflowNode.tsx)) and a `userInput` target-handle default in the canvas ([WorkflowCanvas.tsx:362](ctrl_checks/src/components/workflow/WorkflowCanvas.tsx)).
- **`AgentSettings.tsx` exists but is orphaned** — imported by nothing ([grep: only self-reference](ctrl_checks/src/components/workflow/AgentSettings.tsx)). It is a dead dialog (goal/maxIterations/reasoningModel/actionModel/memoryEnabled) writing to the DB via `awsClient`; not wired to canvas or execution.

**Therefore the task is effectively: revive the removed agent concept and build it properly as a production-grade tool-calling agent, reusing the existing execution/registry/credential/LLM/memory systems — not add a brand-new isolated subsystem.**

### The one hard blocker (needs your decision — see §11)

The LLM layer **has no native tool/function-calling for any provider.** [`llm-adapter.ts`](worker/src/shared/llm-adapter.ts) (558 lines) only does plain text chat + Gemini structured-JSON output (`responseSchema`). It never sends `tools`/`functionDeclarations` and never parses `functionCall` parts (verified: grep for `functionDeclarations|functionCall|tool_call` = 0 hits). Genuine tool-calling (mandated by ANALASISI.txt §33 "DO NOT FAKE TOOL CALLING") requires **extending the LLM adapter**. Two viable paths, both real (not faked) — detailed in §11.

---

## 1. Current architecture (verified map)

**Monorepo:** `ctrl_checks/` (React+Vite SPA) ⇄ `worker/` (Node+Express). Auth: AWS Cognito. DB: AWS RDS PostgreSQL via `pg.Pool`. Cache/memory: Redis (`REDIS_URL`).

**The Single-Source-of-Truth rule holds everywhere:** all node behavior lives in the unified registry; the executor is generic and does `unifiedNodeRegistry.get(nodeType).execute(context)` with zero `if (node.type===…)` branching. This is exactly the property that makes a generic agent possible.

---

## 2. Relevant files (the real ones, by subsystem)

| Concern | File (verified) |
|---|---|
| Node contract (types) | `worker/src/core/types/unified-node-contract.ts` |
| Registry (SoT) | `worker/src/core/registry/unified-node-registry.ts` (2493 ln) + `unified-node-registry-overrides.ts` + `overrides/*.ts` |
| Existing agent override | `worker/src/core/registry/overrides/ai-agent.ts` |
| Node schema library | `worker/src/services/nodes/node-library.ts` (`ai_agent` @5747; removed-port stubs @8930-9070) |
| Per-node executor (generic) | `worker/src/core/execution/dynamic-node-executor.ts` → `executeNodeDynamically()` @738 |
| Reusable per-node entry | `worker/src/api/execute-workflow.ts` → `executeNode()` @2659 |
| Legacy `ai_agent` LLM logic | `worker/src/api/execute-workflow.ts` @6629 (`case 'ai_agent'`) |
| DAG engine | `worker/src/core/execution/unified-execution-engine.ts` (topo sort, skip logic, input merge) |
| Graph mutation SoT | `worker/src/core/orchestration/unified-graph-orchestrator.ts` |
| LLM abstraction | `worker/src/shared/llm-adapter.ts`; facade `worker/src/services/ai/gemini-orchestrator.ts` |
| Model pool / wallet | `gemini-key-pool.ts`, `gemini-wallet-service.ts`, `gemini-models.ts` |
| Credentials | `worker/src/services/ai/credential-resolver.ts`, `worker/src/shared/credential-resolver.ts`, `worker/src/credentials-system/*` |
| Runtime credential inject | `dynamic-node-executor.ts` → `injectDynamicConnectionCredentials()` |
| Runtime-AI field system | `runtime-field-contract.ts`, `runtime-input-handoff.ts`; contract types in `unified-node-contract.ts` (`fillMode`, `RuntimeFieldContract`) |
| Memory (conversation) | `worker/src/shared/memory.ts` → `HybridMemoryService` (Redis + DB, session-scoped) |
| Memory (vector/workflow) | `worker/src/memory/MemoryManager.ts` (embeddings, similarity) |
| Redis | `worker/src/shared/redis-client.ts` |
| Chat trigger / WS | `worker/src/services/chat/chat-server.ts`, `worker/src/api/chat-trigger.ts`, `/ws/chat` in `index.ts` |
| Frontend canvas | `ctrl_checks/src/components/workflow/WorkflowCanvas.tsx` (`@xyflow/react`) |
| Frontend node renderer | `ctrl_checks/src/components/workflow/WorkflowNode.tsx` (Handles/ports) |
| Frontend node catalog | `ctrl_checks/src/components/workflow/nodeTypes.ts` (14438 ln) |
| Frontend state | `ctrl_checks/src/stores/workflowStore.ts` (Zustand: nodes/edges/undo) |
| Orphaned dead UI | `ctrl_checks/src/components/workflow/AgentSettings.tsx` (imported nowhere) |

---

## 3. Existing node lifecycle

Register in registry (or `overrides/*.ts`) → `UnifiedNodeDefinition` with `inputSchema`, `outputSchema`, `credentialSchema`, `operationContracts`, `defaultConfig()`, `validateConfig()`, `execute()`, port metadata (`incomingPorts`/`outgoingPorts`/`isBranching`/`isTerminal`). Frontend mirror in `nodeTypes.ts` (`NodeTypeDefinition` — label/icon/configFields/defaultConfig). **The two catalogs are separate and must be kept consistent** (per CLAUDE.md).

## 4. Existing execution lifecycle

`POST /api/execute-workflow` → build plan (`buildExecutionPlan`: single-trigger validation + topological sort) → for each node in order: `buildNodeInput()` (verbatim forward for single edge; merge for many) → `shouldSkipNode()` (branch routing) → **`executeNode()` @2659** → `executeNodeDynamically()` → registry `.execute(context)`. Outputs stored per-node in `LRUNodeOutputsCache` + persisted via `centralState.getNodeOutput`/DB. Template resolution `{{$json.field}}` between nodes.

**Key reuse point:** `executeNode(node, input, nodeOutputs, db, workflowId, userId, currentUserId)` is a clean, self-contained per-node call that already does credential injection, validation, runtime-AI field resolution, and observability. **This is exactly what the agent must call to run each tool** — no parallel executor needed. ✅ satisfies ANALASISI.txt §6, §12, §34.

## 5. Existing credential lifecycle

Credentials are **never** in workflow JSON. At execution, `injectDynamicConnectionCredentials()` (inside `executeNodeDynamically`) resolves secrets from the vault keyed by `userId+provider` and injects them into node inputs immediately before `.execute()`. Sensitive fields are masked for persistence (`sanitizeResolvedInputsForPersistence`, `isSensitiveInputField`). **Because the agent will run tools through `executeNode()`, credential isolation is automatic and free — the model never sees secrets** (satisfies §7, §37, §38). The agent must only be handed **tool schemas + sanitized results**.

## 6. Existing AI / model lifecycle

`geminiOrchestrator.processRequest(type, input, opts)` → `LLMAdapter.chat(provider, messages, opts)`. Providers: `gemini` (default, via key-pool/wallet), `openai`, `claude` (both require explicit node API key). Gemini supports **structured JSON output** (`structuredOutput.schema` → `responseSchema`). Usage/token accounting via `recordLlmUsage` + wallet. **No streaming used server-side; no function-calling anywhere.** (See §11 blocker.)

## 7. Existing workflow serialization / persistence

Zustand store holds `{nodes, edges}` (`@xyflow/react` shapes). Persisted as JSON on the **`workflows` table** (`db.from('workflows').select('nodes')` @execute-workflow.ts:6636; drafts sent inline as `{nodes, edges}` @`workflowBuildFieldPlan.ts:82`). Edges carry `source`, `target`, `sourceHandle`, `targetHandle`. **Sub-node relationships are already expressible as edges with special `targetHandle` values** — the codebase already reads `edge.targetHandle`/`edge.sourceHandle` for `ai_agent` port-specific inputs ([execute-workflow.ts:20068-20140](worker/src/api/execute-workflow.ts)). So **no schema change is required** to represent Chat Model/Memory/Tool attachments — they are edges into named handles.

## 8. Existing React Flow / node rendering

`WorkflowCanvas.tsx` wires `@xyflow/react`; handles normalized in `normalizeHandleId` (already special-cases `ai_agent`→`userInput`). `WorkflowNode.tsx` renders `<Handle>` ports per node; already has an `isAIAgentNode` branch. Ports today: top input, bottom output(s), branch handles for `if_else`/`switch`. **Adding bottom-anchored `chatModel`/`memory`/`tool` sub-node handles fits the existing Handle model** — this is the largest net-new UI piece but not a new architecture.

## 9. Existing memory / chat

- **Conversation memory already exists:** `HybridMemoryService` ([shared/memory.ts](worker/src/shared/memory.ts)) — `store(sessionId, message, ttl)` / recent-list retrieval, Redis-backed with DB fallback, session-scoped (`memory:${sessionId}:recent`). **This is the reuse target for agent memory** (satisfies §13, §34). `memoryScope` = the `sessionId` strategy (none / conversation-session / user).
- **Chat trigger** feeds `userInput` (`chat_trigger` → `{message,...}`), already special-cased into `ai_agent` input extraction. `/ws/chat` streams chat-triggered runs; `/ws/executions` streams live status.
- `MemoryManager` (vector/embeddings) is a *separate* system for workflow similarity — **not** for agent turn memory; do not conflate.

## 10. Exact AI Agent integration points

```
AI Agent
 ├── Frontend
 │    ├── ctrl_checks/src/components/workflow/nodeTypes.ts        (ai_agent def — extend: tool/model/memory config)
 │    ├── ctrl_checks/src/components/workflow/WorkflowNode.tsx     (add chatModel/memory/tool sub-node Handles)
 │    ├── ctrl_checks/src/components/workflow/WorkflowCanvas.tsx   (handle normalization + connection rules)
 │    ├── ctrl_checks/src/stores/workflowStore.ts                 (onConnect: allow sub-node handles, no exec-order semantics)
 │    └── ctrl_checks/src/components/workflow/AgentSettings.tsx    (REVIVE or replace this orphan for config UI)
 │
 ├── Registry / Schema
 │    ├── worker/src/core/registry/overrides/ai-agent.ts          (replace single-LLM delegate with agent loop entry)
 │    └── worker/src/services/nodes/node-library.ts               (ai_agent schema: add tool/model/memory/limits fields)
 │
 ├── Execution (agent loop — NEW module, thin)
 │    ├── worker/src/core/execution/agent/agent-executor.ts       (NEW — the tool-calling loop)
 │    ├── worker/src/core/execution/agent/tool-manifest.ts        (NEW — registry → tool schema)
 │    └── reuse: worker/src/api/execute-workflow.ts executeNode() (tool execution — DO NOT duplicate)
 │
 ├── AI / model adapter
 │    ├── worker/src/shared/llm-adapter.ts                        (EXTEND — add tool/function-calling; §11 decision)
 │    └── worker/src/services/ai/gemini-orchestrator.ts           (optional passthrough for tools)
 │
 ├── Credentials  → reuse injectDynamicConnectionCredentials (NO change)
 ├── Memory       → reuse worker/src/shared/memory.ts HybridMemoryService (NO change)
 └── Database     → reuse workflows table (edges w/ targetHandle). Expected: NO migration.
```

## 11. Risks, conflicts & decisions — ✅ RESOLVED (2026-08-21)

> Decisions locked by the user:
> - **D1 → Adapter interface + both.** Build a `ChatModelAdapter`; native Gemini function-calling first, structured-JSON fallback for other providers.
> - **D2 → (default accepted)** tool eligibility = registered, non-trigger, non-`internalOnly` nodes; excludes the agent itself. `firstRunClass` is guardrail metadata, not an eligibility filter.
> - **D3 → Guardrail gate now, async later.** Block-and-surface for `destructive`/`write`; structure loop for future async pause/approve.
> - **D4 → Replace** the orphaned `AgentSettings.tsx` with standard `configFields` + Tools panel UX.
> - **D5 → Preserve exactly.** Zero attached tools ⇒ byte-for-byte today's single-shot node output (`{response_text, used_tools:[], …}`). Existing workflows unaffected.

### Original decision detail (for reference)

**D1 — Tool-calling mechanism (BLOCKER, must choose):**
- **Option A — Native Gemini function-calling (recommended).** Extend `llm-adapter.ts` to send `tools:[{functionDeclarations}]` and parse `functionCall` response parts. Most robust, genuinely "real" tool-calling per §33, provider-isolated. Cost: real change to the shared LLM adapter (medium risk; must stay backward-compatible — additive only).
- **Option B — Structured-JSON tool protocol.** Use the *existing* `structuredOutput.schema` to make the model emit `{action:"tool"|"final", tool, args}`. Works today with zero adapter change, provider-agnostic. Still genuine model-driven selection (not hard-coded), but not the provider's native function API.
- **Recommendation:** build the loop against a small internal `ChatModelAdapter` interface (§36) with **Option A for Gemini** and Option B as the fallback for providers lacking native support. This satisfies "implement Gemini correctly first, structure so others slot in."

**D2 — Which nodes are eligible as tools?** Proposal: any registered, non-trigger, non-internal node (exclude `trigger`/`triggers`, `internalOnly` stubs, and the agent itself). `operationContract.firstRunClass` is used later for guardrails/HITL; it must not shrink the eligible node universe.

**D3 — Human-in-the-loop for `destructive`/`write` tools.** Full pause/approve infra does not exist today. Proposal: Phase-4 ships a **guardrail gate** (block-and-surface for `firstRunClass:'destructive'`, configurable) and the loop is structured to add true async pause later. Confirm this scope.

**D4 — Revive vs. replace `AgentSettings.tsx`.** It's dead code with a different config shape (goal/reasoningModel/actionModel). Proposal: **replace** it with a config surface driven by the standard `configFields` + a Tools panel, matching the existing Properties/NodeLibrary UX. Confirm.

**D5 — Backward compatibility of existing `ai_agent` workflows.** Live workflows use `ai_agent` as a single-LLM node with output `{response_text, used_tools:[], …}`. Changing its behavior could alter their output. Proposal: **keep zero-tools behavior identical to today** (agent with no attached tools == current single-shot node, same output shape), so existing workflows are unaffected. Confirm this invariant.

**Other risks (no decision needed, just tracked):**
- `execute-workflow.ts` is 21.6k lines; the `case 'ai_agent'` legacy path and the `ai_agent` port-input block (@20068) must be reconciled with the new loop without breaking other nodes.
- Frontend has two catalogs (`nodeTypes.ts` vs registry) — both must be updated in lock-step.
- Result-size/token guardrails: must cap tool outputs before feeding back to the model (§21).
- Loop/iteration guardrails and cancellation must hook the existing execution cancellation path.

## 11b. Scope confirmation — dual build paths, multi-connection, and system-wide updates

> Added 2026-08-21 after review questions. These broaden Phase 1 scope; verified against code.

### (a) Does the agent work only for manual building, or AI generation too? → **BOTH**
The agent must be a first-class node in **two** creation paths:

1. **Manual (canvas)** — user drags `ai_agent`, attaches Chat Model / Memory / Tool nodes by edges. (Covered in §8, §10.)
2. **AI generation pipeline** — `POST /api/generate-workflow` must be able to **plan an agent with attached tools** from a natural-language prompt.

**Current state (verified):** the generation pipeline already emits `ai_agent` and auto-adds a chat_model connection ([`workflow-builder.ts:4701`](worker/src/services/ai/workflow-builder.ts)), but only as a **single linear AI node** — it does **not** plan multiple tool attachments. So AI-generation of a *tool-calling* agent is **net-new scope**. Files in the generation path that must learn the agent-with-tools shape:
- `worker/src/services/ai/stages/capability-grouper-stage.ts` (group "agent + its tools" as one capability)
- `worker/src/services/ai/workflow-builder.ts` (emit agent node + tool sub-node edges, not a linear chain)
- `worker/src/core/orchestration/unified-graph-orchestrator.ts` (wire tool/model/memory handles, not exec-order edges)
- `worker/src/services/ai/deterministic-workflow-compiler.ts`, `execution-order-enforcer.ts`, `linear-workflow-connector.ts` (must **exempt** agent sub-node edges from linear-DAG enforcement)
- `worker/src/services/ai/comprehensive-credential-scanner.ts` (scan each attached tool's credentials, not just the agent)

### (b) Can multiple connections be attached to the agent? → **YES**
Three distinct attachment classes, all as edges into named handles, each with its **own** connection where relevant:
- **1 Chat Model** → resolves the selected provider's key from the user's connection (Gemini falls back to platform) — see the key-resolution contract above.
- **0..1 Memory** → session store (`HybridMemoryService`), no external credential.
- **0..N Tools** → **each tool is an existing node carrying its own connection/credential.** A single agent can therefore reference **many connections at once** (e.g. Slack + Notion + HTTP + Postgres).

**Reuse (verified):** the node-level multi-connection binding system already exists — `/api/workflows/{id}/nodes/{nodeId}/connections` ([`workflowNodeConnections.ts`](ctrl_checks/src/lib/api/workflowNodeConnections.ts)) and `connectionRefs` resolution in the executor. Tool credentials must be resolved **per-tool at tool-execution time** (through `executeNode()`), never surfaced to the agent/model. No new connection subsystem.

### (c) Must the UI, connection process, and rules all be updated? → **YES, system-wide**
| Layer | What must change |
|-------|------------------|
| **Canvas UI** | Sub-node handles (chatModel/memory/tool) on the agent node; a Tools panel in config; distinct visual for attachments vs exec-order edges (`WorkflowNode.tsx`, `WorkflowCanvas.tsx`, `nodeTypes.ts`, replace `AgentSettings.tsx`) |
| **Connection process** | Per-tool connection selection + the **connection-readiness gate** must aggregate readiness across the agent's Chat Model **and every attached tool** (`api/capability-selection/connection-readiness.ts`, `WorkflowConnectionGate.tsx`, `CredentialStatusPanel.tsx`) |
| **Rules / validation** | DAG + edge rules must treat sub-node edges as attachments, not execution order; `connection-validator.ts`, `final-workflow-validator.ts`, `execution-order-enforcer.ts`, the DAG compiler rule must all exempt agent handles |
| **Wizard / generation** | Capability selection must present "Agent + tools" as a unit; credential discovery scans all tools (`AutonomousAgentWizard.tsx`, `CapabilityStage.tsx`, `comprehensive-credential-scanner.ts`) |

### (d) Does the current plan account for all this the same way? → **Now it does (this section).**
Phase 1 originally under-scoped (a) and (c). With this addendum, the plan covers manual + AI-generation, multi-connection/multi-tool, and the UI/connection/rules updates. The Phase 2 Design and Phase 3 Plan docs will carry these as first-class sections. **No code has been changed — documentation only, per request.**

## 11c. Universal dynamic tool model — ZERO hardcoding (core mandate)

> Added 2026-08-21 per explicit direction. This is the load-bearing principle of the whole feature.

**Requirement:** The agent works dynamically with **every node**, discovered entirely from the registry. **No node type is ever named in agent code.** Adding a new node later makes it an agent tool automatically — **no agent code change, ever.**

**This is already feasible today (verified):** the registry exposes `getAllTypes()`, `get()`, `getInputSchema()`, `getOutputSchema()`, `getRequiredCredentials()`, `operationContracts`, `aiSelectionCriteria` ([`unified-node-registry.ts`](worker/src/core/registry/unified-node-registry.ts)), and the executor already runs **all** nodes with **0** `node.type ===` branches (verified count = 0 in `dynamic-node-executor.ts`). The system is already universal; the agent simply reuses it.

**Generic tool-manifest mechanism (no per-node code):**
```
registry.getAllTypes()
   → filter by GENERIC METADATA (not a hardcoded list):
        exclude if category ∈ {trigger,triggers}  // triggers start flows, they aren't callable tools
        exclude if schema.internalOnly === true    // the removed chat_model/memory/tool stubs
        exclude if type === this agent's own type  // no self-recursion
        (attached-tools set further narrows to what the user wired)
   → for each remaining type, build a tool schema PURELY from:
        label + description + aiSelectionCriteria   (name/purpose)
        getInputSchema() + operationContracts       (parameters, enums, required)
        getRequiredCredentials()                     (satisfied at run time, NOT shown to model)
   → hand manifest to the ChatModelAdapter
```
Every rule above is **metadata-driven**, not a node list. "Works with ALL nodes" precisely means: **all tool-capable nodes** (every non-trigger, non-internal registered node) are eligible automatically; triggers/internal-stubs are excluded *by their nature*, expressed as a generic property test — never by naming a node.

**Anti-hardcoding guardrails (to be enforced by tests in Phase 4):**
1. **No literal node types in agent source** — a lint/test greps the `agent/` module and fails if any known node-type string or `nodeType === '...'` / `switch (nodeType)` appears.
2. **Coverage test** — assert the generated manifest contains **every** registry node that passes the generic eligibility predicate (so a newly-registered node is provably included with no code edit).
3. **Future-node test** — register a throwaway fake node in a test and assert it appears as a tool with a correctly-derived schema, without touching agent code.
4. **Executor reuse only** — tools run *exclusively* through the shared `executeNode()` path; the agent must never contain node-specific execution logic (keeps credential/validation/observability universal).

**Consequence:** current nodes, future nodes, and third-party/new nodes all become agent tools through the registry alone — satisfying ANALASISI.txt §33 and §42 by construction.

## 12. Proposed architecture (one-paragraph, for approval)

`ai_agent` becomes a **first-class container node** whose `execute()` runs a bounded reasoning loop. Attachments are ordinary edges into named handles (`chatModel`, `memory`, `tool` — many). At runtime the agent: resolves attached tool node types → builds a **tool manifest** from the registry (`inputSchema`/description/enums only) → asks the model (via `ChatModelAdapter`) to pick a tool + args → validates the call is attached+registered+schema-valid → **executes the tool through the existing `executeNode()`** (credentials injected automatically, model never sees secrets) → sanitizes+size-caps the result → feeds it back → repeats until final answer or a guardrail (maxIterations/timeout/loop-detect) fires → returns `{success, output, iterations, toolCalls, metadata}` on Success or a structured object on Error. Memory (optional) reuses `HybridMemoryService` keyed by session. **No new executor, no new credential path, no new memory system, no DB migration.**

## 13. Files I expect to MODIFY

- `worker/src/core/registry/overrides/ai-agent.ts` (swap delegate → agent loop)
- `worker/src/services/nodes/node-library.ts` (`ai_agent` schema: tool/model/memory/limit fields)
- `worker/src/shared/llm-adapter.ts` (additive tool/function-calling — D1)
- `worker/src/api/execute-workflow.ts` (reconcile legacy `case 'ai_agent'` + port-input block)
- `ctrl_checks/src/components/workflow/nodeTypes.ts` (extend `ai_agent` def + Tools config)
- `ctrl_checks/src/components/workflow/WorkflowNode.tsx` (sub-node Handles)
- `ctrl_checks/src/components/workflow/WorkflowCanvas.tsx` (handle normalize + connection validity)
- `ctrl_checks/src/stores/workflowStore.ts` (onConnect rules for sub-node handles)
- `ctrl_checks/src/components/workflow/AgentSettings.tsx` (replace/rewire — D4)
- Node docs mirrors (`nodeLaymanDescriptions.ts`, `nodeUsageGuides.ts`, `docs-content/nodes/ai_agent.doc.ts`)

**AI-generation pipeline (scope §11b-a):**
- `worker/src/services/ai/workflow-builder.ts` (emit agent + tool attachments, not linear chain)
- `worker/src/services/ai/stages/capability-grouper-stage.ts` (agent+tools as one capability)
- `worker/src/services/ai/comprehensive-credential-scanner.ts` (scan every attached tool's creds)
- `worker/src/services/ai/deterministic-workflow-compiler.ts`, `execution-order-enforcer.ts`, `linear-workflow-connector.ts`, `connection-validator.ts`, `final-workflow-validator.ts` (exempt agent sub-node handles from linear-DAG rules)

**Connection process & rules (scope §11b-b/c):**
- `worker/src/api/capability-selection/connection-readiness.ts` (aggregate readiness across chat model + all tools)
- reuse node-level multi-connection binding (`ctrl_checks/src/lib/api/workflowNodeConnections.ts`, `/api/workflows/{id}/nodes/{nodeId}/connections`)
- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx`, `CredentialStatusPanel.tsx`, `CapabilityStage.tsx`, `AutonomousAgentWizard.tsx`

## 14. Files I expect to CREATE

- `worker/src/core/execution/agent/agent-executor.ts` (loop)
- `worker/src/core/execution/agent/tool-manifest.ts` (registry→schema)
- `worker/src/core/execution/agent/chat-model-adapter.ts` (provider interface + Gemini impl)
- `worker/src/core/execution/agent/agent-guardrails.ts` (iteration/timeout/loop/size)
- `worker/src/core/execution/agent/result-sanitizer.ts` (untrusted tool output handling)
- Tests under `worker/src/core/execution/agent/__tests__/` (unit + the 10 integration scenarios in §31)
- `docs/AI_AGENT_IMPLEMENTATION_DESIGN.md`, `docs/AI_AGENT_IMPLEMENTATION_PLAN.md` (Phase 2/3)

## 15. Files that must NOT change

`unified-node-registry.ts` core loop, `dynamic-node-executor.ts` generic path, `credential-resolver.ts`/vault, `unified-execution-engine.ts` topo/skip logic, all other node overrides, the `workflows` table schema. (Agent must fit *around* these, not modify them.)

## 16. Database impact

**Expected: none.** Attachments = edges with `targetHandle`; agent config = node `config`; memory = existing Redis/DB session store. If run-history enrichment (iteration count/tools used) needs a column, it will be raised as a separate, backward-compatible migration decision before any DB change (per §25, and note: prod DB writes are permission-blocked and must be handed off).

## 17. Testing strategy

Reuse **Jest** (worker) + **Vitest** (frontend), single-file runs only (full suites crash this machine — established constraint). Unit: tool-manifest generation, schema→tool conversion, arg validation, guardrails, result sanitization, memory. Integration (the 10 scenarios in ANALASISI.txt §31): single tool, two sequential tools, unavailable-tool rejection, invalid args, credential failure, iteration limit, memory recall, save→reload→execute, correct-tool selection among many, and existing-workflow regression. Then `type-check`, `lint`, `build`.

---

## 18. Codex re-verification addendum (2026-08-21)

No implementation code was changed. Live-repo re-check confirmed the main plan, with these corrections/risks to carry into Phase 4:

1. **Line drift:** the AI-agent port-input mapper is now around `execute-workflow.ts:20069-20256`; the specific `targetHandle` read is at `execute-workflow.ts:20107`, not `20068`.
2. **Canonical handle IDs:** the live backend/frontend use `chat_model`, `memory`, `tool`, and `userInput`. The implementation should treat `chat_model` as canonical and only accept `chatModel` as a compatibility alias at boundaries.
3. **Registry ports are not ready yet:** `unified-node-registry.ts` currently gives all non-trigger nodes `incomingPorts: ['input']` and `outgoingPorts: ['output']`; `overrideAiAgent` does not override ports. Therefore Phase 4 must update `ai_agent` registry metadata to include attachment handles and Success/Error handles, otherwise backend validators using `isValidHandle()` will reject saved edges.
4. **Legacy output handle must remain valid:** because existing `ai_agent` workflows likely have downstream edges from `output`, adding Success/Error ports must preserve `output` as a success alias (or equivalent compatibility handle), in addition to D5 byte-identical payloads.
5. **Trigger category normalization:** NodeLibrary schemas use `category: 'triggers'`, but the unified registry normalizes to `category: 'trigger'`. Tool eligibility must check both or use the normalized registry category.
6. **`firstRunClass` default is conservative:** `NodeOperationContract.firstRunClass` exists, but many current contracts omit it; the shared contract states absence means `write`. HITL tests should cover omitted classification so unclassified operations are protected, not silently allowed.
7. **Attachment edges need runtime treatment before Stage N:** attachment edges are persistable as edges today, but current execution planning/toposort treats all edges as dependencies. Manual agent execution therefore also needs a runtime graph view that filters `ai_agent` attachment edges out of normal execution order while passing their metadata to the agent. This is not only an AI-generation/Stage-N concern.
8. **Context does not type workflow edges:** `NodeExecutionContext` has `inputs`, `rawInput`, and `upstreamOutputs`, but no typed `edges` property. Phase 4 should either pass a typed attachment graph into the agent context from `execute-workflow.ts` or deliberately load `{nodes, edges}` from workflow persistence.
9. **Handle normalizer will otherwise erase attachment handles:** `node-handle-registry.ts` currently maps target `chat_model`/`memory`/`tool` to `input` before checking whether they are valid target handles. Once `ai_agent` declares those ports, Phase 4 must preserve them before generic alias normalization.

---

## STOP — awaiting approval

This is Phase 1 (Discovery) only. **No code has been written.** Before I proceed to Phase 2 (Design doc) and Phase 3 (Plan), I need your decisions on **D1–D5 in §11**, especially:

1. **D1**: native Gemini function-calling (recommended) vs. structured-JSON protocol.
2. **D5**: confirm the "zero tools ⇒ behaves exactly like today's single-shot node" backward-compat invariant.
3. **D2/D3/D4**: tool eligibility rule, human-in-the-loop scope, and replacing the orphaned `AgentSettings.tsx`.
