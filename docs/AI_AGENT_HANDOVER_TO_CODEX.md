# AI Agent Node — Handover to Codex (START HERE)

> **You (Codex) are receiving a fully-planned, NOT-yet-implemented feature.**
> Read this file first, then the four docs below **in order**. Do **not** write code yet.
> Your job in this session: **absorb everything → re-verify the plan against the live repo → propose/apply doc improvements → then STOP and wait for the owner's explicit approval before any implementation.**

---

## 0. What we are building (one paragraph)

A **production-grade, universal AI Agent node** (`ai_agent`) for the CtrlChecks / Flow Genius AI workflow platform. It is an LLM wrapped in a bounded **tool-calling reasoning loop**: it discovers the tools attached to it, asks a chat model which tool to call, executes that tool through the **existing** node-execution pipeline, reads the result, and repeats until it produces a final answer — returning through a **Success** or **Error** port. It must be **fully dynamic and generic**: *any* registered node becomes a tool automatically via the registry, with **zero node-type hardcoding**, so current and future nodes work with no agent-code change. It must integrate with the existing systems (registry, executor, credential vault, LLM adapter, Redis memory, React Flow, persistence) — **never** a mock, duplicate executor, or isolated prototype.

---

## 1. Required reading — in this exact order

| # | File | What it is |
|---|------|-----------|
| 1 | [`.claude/logs/ANALASISI.txt`](../.claude/logs/ANALASISI.txt) | The **original owner requirements** (the master spec). Authoritative on intent. |
| 2 | [`docs/AI_AGENT_NODE_CONCEPT_AND_INTEGRATION.md`](AI_AGENT_NODE_CONCEPT_AND_INTEGRATION.md) | Concept primer + n8n-style mental model. (Has a discovery-correction callout.) |
| 3 | [`docs/AI_AGENT_IMPLEMENTATION_ANALYSIS.md`](AI_AGENT_IMPLEMENTATION_ANALYSIS.md) | **Phase 1 Discovery.** Verified architecture map, current state, integration points, risks, locked decisions (§11), scope (§11b), universal-dynamic mandate (§11c). |
| 4 | [`docs/AI_AGENT_IMPLEMENTATION_DESIGN.md`](AI_AGENT_IMPLEMENTATION_DESIGN.md) | **Phase 2 Design.** Node/tool schemas, agent loop, ChatModelAdapter, memory, error model, ports/edges, security, guardrails + Mermaid diagrams. |
| 5 | [`docs/AI_AGENT_IMPLEMENTATION_PLAN.md`](AI_AGENT_IMPLEMENTATION_PLAN.md) | **Phase 3 Plan.** Exact per-file change list (File/Current/Change/Why/Deps/Risk/Testing), staged A–N, risk register. |

You are picking up at the boundary between **Phase 3 (Plan, done)** and **Phase 4 (Implementation, not started)**.

---

## 2. Current verified state of the codebase (do not re-derive — but DO re-verify)

- `ai_agent` **already exists** as a **single-shot LLM node** (registry override `worker/src/core/registry/overrides/ai-agent.ts` → legacy `execute-workflow.ts:6629`). `used_tools:[]` is hard-coded. This task **revives** it into a real tool-calling agent.
- The Chat Model / Memory / Tool **sub-node ports were removed**; only `internalOnly` stubs remain (`node-library.ts:8930-9070`).
- **No native function-calling exists** in the LLM layer (`worker/src/shared/llm-adapter.ts`) — only text + Gemini structured-JSON. Adding it is required (see decision D1).
- The generic executor runs **all** nodes with **zero** `node.type ===` branches — the platform is already universal; the agent reuses it.
- Attachments are representable as **edges into named handles** (`execute-workflow.ts:20107` currently reads `ai_agent` port-specific `targetHandle`; the mapper spans roughly `20069-20256`). **No DB migration expected.**
- `AgentSettings.tsx` is **orphaned** dead code — to be replaced (D4).

## 3. Locked decisions (owner-approved — do NOT reopen without asking)

- **D1** Tool-calling = a `ChatModelAdapter` interface: **native Gemini function-calling first**, structured-JSON fallback for other providers. (Extend `llm-adapter.ts` additively.)
- **D2** Tool eligibility = **generic metadata predicate**, not a node list: exclude normalized `category==='trigger'` (and raw NodeLibrary `category==='triggers'`), `schema.internalOnly`, and the agent's own type; everything else auto-eligible. `firstRunClass` is guardrail metadata, not an eligibility filter.
- **D3** Human-in-the-loop = **guardrail gate now** (block-and-surface for `destructive`/write), structured for true async pause later.
- **D4** **Replace** the orphaned `AgentSettings.tsx` with standard config UX + Tools panel.
- **D5** **Zero attached tools ⇒ byte-identical to today's single-shot node output.** Existing live workflows must be unaffected.

## 4. Non-negotiable mandate

**Universal, dynamic, ZERO node hardcoding.** No node-type literal, `nodeType === '…'`, or `switch(nodeType)` anywhere in the agent module. Tools are built from registry metadata only; a new node must become a tool with **no agent code change**. Enforced by Phase-4 tests (grep-guard, coverage test, future-node test). See Analysis §11c.

## 5. Hard constraints (environment & house rules)

- **Single source of truth:** all node behavior in `unified-node-registry.ts`; never add node-specific logic to the executor or workflow JSON.
- **Reuse, don't duplicate:** credentials → existing vault/`executeNode()`; memory → `HybridMemoryService`; execution → existing engine. No parallel systems (ANALASISI.txt §34).
- **Model never sees secrets.** Only tool schemas (credential fields stripped) + sanitized results.
- **Testing:** **NEVER run full suites / `npm test`** (crashes the machine). Only single-file: `npx jest <file>` (worker) / `npx vitest run <file>` (frontend). Also `npm run type-check`, `npm run lint`, `npm run build`.
- **DB writes to prod RDS are permission-blocked** — if a migration is ever needed, hand a scoped prompt to the owner; do not attempt direct writes.
- **Do NOT change:** registry core loop, `dynamic-node-executor.ts` generic path, credential vault, `unified-execution-engine.ts` topo/skip, other node overrides, `workflows` table schema.
- Follow existing TypeScript/naming/logging conventions; avoid new dependencies; avoid `any`.

## 6. Sequencing (from the Plan)

Stages **A–M** deliver a working **manual** agent first. Stage **N** (AI-generation pipeline + core-validation exemptions + connection-readiness) is highest-risk and layered last; it may be flag-gated. Do not advance a stage while the previous has compile/runtime errors.

---

## 7. YOUR TASK IN THIS SESSION (Codex) — do this, then stop

1. **Read** ANALASISI.txt + the 4 docs (order in §1). Confirm you understand intent, decisions, and mandate.
2. **Re-verify the plan against the live repository** — open the referenced files, confirm the line references and the current-state claims still hold (the repo may have moved). Specifically re-check: `overrides/ai-agent.ts`, `execute-workflow.ts:2659/6629/20107`, `llm-adapter.ts`, `unified-node-registry.ts` accessors, `node-library.ts` stubs, `shared/memory.ts`, frontend `WorkflowNode.tsx`/`WorkflowCanvas.tsx`/`nodeTypes.ts`/`workflowStore.ts`, and the Stage-N pipeline files.
3. **If you find anything inaccurate, riskier than stated, or improvable**, update the relevant MD doc(s) in place (Analysis/Design/Plan) with clearly marked edits, and list your recommendations.
4. **Produce an acknowledgement** stating: (a) you have read and hold all four plans + this handover; (b) the results of your re-verification (confirmed vs. corrected); (c) any recommended changes you applied; (d) any open questions needing the owner.
5. **STOP.** Do **not** begin Phase 4 implementation. **Wait for the owner's explicit approval** before writing any feature code.

## 8. Definition of a good acknowledgement

- Confirms the 5 locked decisions and the zero-hardcoding mandate are understood.
- Confirms (or corrects, with file:line) the current-state facts in §2.
- Confirms Stage A entry point and the D5 parity requirement.
- Lists recommendations (if any) + open questions.
- Ends by explicitly requesting approval to start Stage A.

---

*Prepared by the prior planning session. Everything above is document-only; no feature code has been written.*
