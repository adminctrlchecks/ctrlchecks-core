# CtrlChecks AI Workflow OS — Client & Investor Technical Reference

**Purpose:** Single source document for demos, security reviews, and technical diligence. Aligned with `ARCHITECTURE.md` and the actual codebase (`ctrl_checks/`, `worker/`).

**Audience:** Your technical buyers (CTO, platform engineers, security). Speak to **architecture and outcomes**, not tooling you used to author code.

---

## Stage-to-stage platform pipeline (text graph)

The platform is described as **nine conceptual stages** (see `ARCHITECTURE.md` §2). Below is a **left-to-right / top-to-down** flow you can draw on a whiteboard or paste into slides.

### Master flow: Stage 1 → Stage 9

```
STAGE 1  Client routing & shell
         ctrl_checks · React Router · editor shell · auth context
              |
              v
STAGE 2  API boundary
         endpoints.ts · VITE_API_URL · lib/api/*  -->  worker HTTP (JSON)
              | \
              |  \-- parallel: Supabase (anon)  auth · rows · storage
              v
STAGE 3  Worker bootstrap
         env-loader FIRST · Express · CORS · large JSON body limit
              |
              v
STAGE 4  Registry & schema load (SSOT)
         unifiedNodeRegistry · nodeLibrary · NodeSchemaRegistry · nodeContextRegistry
              |
              v
STAGE 5  Request handling
         api/*.ts  -->  generate | execute | triggers | node-definitions | ...
              |
     +--------+--------+--------+
     v                 v                 v
STAGE 6            STAGE 7            STAGE 8
AI & planning      Graph orch.        Execution
summarize-layer    unified-graph-     execute-workflow
lifecycle          orchestrator       unified-execution-engine
gemini-orchestrator execution-order-  dynamic-node-executor
generate-workflow  manager
pipeline           edge-reconciliation
                   validate / reconcile
     +--------+--------+--------+
              |
              v
STAGE 9  Persistence & observability
         Supabase · Prisma (where used) · logs · queue · optional /ws/executions · GET /health
```

**Reading guide:** Stages **6–8** are the intelligence core (nodes/intent → valid DAG → runs). Stage **9** is durability + telemetry. Typical path: **6 → 7 → validate → persist → 8** on user run.

### Nine stages — quick reference (same order as `ARCHITECTURE.md` §2)

| # | Stage | Primary location / notes |
|---|--------|-------------------------|
| 1 | Client routing & shell | `ctrl_checks/` — Router, pages, editor shell |
| 2 | API boundary | `endpoints.ts`, `lib/api/*` — `VITE_API_URL` → worker |
| 3 | Worker bootstrap | `worker/src/index.ts` — `env-loader` first, Express, CORS |
| 4 | Registry & schema load | `unified-node-registry`, `node-library`, schema registries |
| 5 | Request handling | `worker/src/api/*.ts` — auth/validate, delegate to services |
| 6 | AI & planning | `generate-workflow`, `summarize-layer`, `gemini-orchestrator`, lifecycle |
| 7 | Graph orchestration | `unified-graph-orchestrator`, `execution-order-manager`, edge reconciliation |
| 8 | Execution | `execute-workflow`, `unified-execution-engine`, `dynamic-node-executor` |
| 9 | Persistence & observability | Supabase, Prisma, logs, queue, optional WS, `/health` |

### Alternate entry (triggers): Stages 5 → 8 → 9

Non-UI triggers **skip Stage 1–2 UI** but still land on **Stage 5** and reuse **8–9**:

```
 Webhook / Form / Chat HTTP
            │
            ▼
    ┌───────────────┐
    │ STAGE 5       │  resolve workflow + auth/policy
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ STAGE 8       │  same executor + registry stack
    └───────┬───────┘
            ▼
    ┌───────────────┐
    │ STAGE 9       │  logs + persistence + metrics
    └───────────────┘
```

---

## Stage-to-stage: prompt → runnable workflow (generation spine)

Within **Stage 6–7**, the **happy path** for `POST /api/generate-workflow` can be sketched as:

```
 User prompt (SPA)
        │
        ▼
 ┌──────────────────┐
 │ Enrich / analyze │  workflow-analyzer · requirements-extractor · structured prompts
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ Intent / plan    │  summarize-layer · AIIntentClarifier · plan consistency
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ Structure build  │  blueprint / materialize · lifecycle · plan-driven-builder
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ initializeWorkflow│  nodes → execution order → edge reconciliation
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ reconcile + hydrate │  registry defaults · structural field materialization
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ validateWorkflow │  contract errors = pipeline failures (no silent bad graphs)
 └────────┬─────────┘
          ▼
 ┌──────────────────┐
 │ credentials phase │  credentialSchema discovery · attach / wizard UX
 └────────┬─────────┘
          ▼
   Saved workflow + phased API response → UI
```

If **structural LLM** paths fail, **deterministic chain** and **fast-analysis** paths continue—logs may show explicit fallback (resilience, not ad-hoc failure).

---

## Stage-to-stage: saved workflow → run (execution spine)

Within **Stage 8**, a typical `POST /api/execute-workflow` path:

```
Workflow JSON
     |
     v
buildExecutionPlan (unified-execution-engine)  -->  invalid? HTTP 400 + validationErrors
     |
     v
Walk DAG (IF/SWITCH branches, skip ineligible nodes)
     |
     v
Per node: dynamic-node-executor -> registry execute(); templates via universal-template-resolver
     |
     v
STAGE 9: logs, run persistence, optional /ws/executions, metrics
```

---

## Part A — Executive summary (~3 pages when printed)

### A.1 What the product is

CtrlChecks is an **AI-assisted workflow operating system**: users describe automations in natural language; the system produces a **validated directed acyclic graph (DAG)** of nodes (integrations, logic, AI steps); the same **registry-backed engine** executes those workflows in development and production. The stack is a **monorepo**: a **React** SPA for the visual editor and a **Node.js (Express)** worker for generation, validation, execution, and integrations.

### A.2 Why buyers should care (differentiators)

1. **Single source of truth for node behavior** — Node schemas, defaults, credentials, execution, and migrations live in a **unified node registry**. That means a fix or policy change applies to **all** workflows, not one JSON file.
2. **Graph integrity is enforced, not hoped for** — Structural edits go through a **unified graph orchestrator** (`initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`, `validateWorkflow`). Edges are reconciled from execution order and registry rules; ad-hoc edge patching in feature code is an architectural violation by design.
3. **Deterministic guardrails around generative AI** — Large language models propose structure and text; **deterministic validators, plan-chain guards, and auto-repair** converge graphs toward executable DAGs. When LLM paths fail, **fallback planners and deterministic chains** still produce a workflow (as seen in logs: structural LLM path can fail; deterministic chain continues).
4. **Separation of concerns** — **Supabase** handles identity and persistence patterns familiar to enterprises; the **worker** is the authority for workflow intelligence, execution, and server-side secrets (e.g. `GEMINI_API_KEY`, service role).
5. **Observability surface** — Health endpoints, execution APIs, optional WebSockets for runs, logging and metrics hooks align with how technical teams operate platforms.

### A.3 Tech stack (honest one-liner)

**Frontend:** React 18, TypeScript, Vite, TanStack Query, Zustand, React Flow (`@xyflow/react`), Radix-style UI, Zod.  
**Backend:** Node.js, Express, TypeScript, Jest; Prisma where relational models apply; Winston-style logging patterns.  
**Data & auth:** Supabase (Postgres, auth, storage).  
**AI:** Google **Gemini** family via a centralized orchestrator (`gemini-orchestrator`, `LLMAdapter`); optional **Ollama** / Python backends via environment configuration for specialized or air-gapped scenarios.  
**Async / scale (optional):** Redis, RabbitMQ, **Temporal**-related distributed execution paths when enabled.  
**Integrations:** Broad third-party surface (Google Workspace, Slack, CRMs, databases, etc.) via executor layers—not hardcoded only in the UI.

### A.4 How a user prompt becomes a runnable workflow (happy path)

**See the “generation spine” and “execution spine” text graphs above.** In one sentence: the UI calls **`/api/generate-workflow`** (or alternates); **Stage 6** derives intent and structure, **Stage 7** builds a reconciled DAG and validates it, registry **hydration** + **credential discovery** follow, then **`/api/execute-workflow`** (**Stage 8**) runs the plan with **template resolution** and registry **`execute()`**.

### A.5 How “linear” vs “branching” works

- **Product rule:** Unless the user explicitly asks for conditions or multi-path logic, the compiler bias is **strictly linear** (trigger → actions → terminal).
- **Branching** is expressed with **`if_else`** (true/false ports) or **`switch`** (case ports). **Merge** reconverges branches when required.
- The **registry** describes branching (`isBranching`, ports); the **edge reconciliation engine** wires edges accordingly—avoiding orphan nodes and illegal fan-out for non-branching node types.

### A.6 Error handling, analysis, and “self-healing” (terminology for clients)

Use precise language:

| Theme | What happens in this repo |
|--------|---------------------------|
| **Validation** | Graph and execution-plan validation fail fast with explicit errors (e.g. missing trigger, orphans, cycle risk, port mismatch). |
| **Auto-repair** | `WorkflowAutoRepair`, **plan-chain guards** (`autoRepairCanonicalChainForIntent`, semantic repair), **RobustEdgeGenerator**, and lifecycle repair steps attempt fixes within orchestrator rules. |
| **Reconciliation** | `reconcileWorkflow` normalizes edges after complex insert/remove operations. |
| **Attach / post fixes** | `attach-inputs` and related paths include **self-heal** comments/logic when reconciliation still leaves structural gaps (e.g. terminal nodes). |
| **Graceful AI degradation** | If structural LLM single-plan is unavailable or fails checks, **deterministic** builders and fast-analysis fallbacks still return a workflow; logs may show intentional fallback (normal operation, not panic). |

**Talking point:** “We treat LLM output as **untrusted input** until deterministic validation and orchestration accept it.”

### A.7 Models in production paths

Defined in `model-manager` / `gemini-orchestrator`:

- **gemini-2.5-flash** — default workhorse for speed/cost.
- **gemini-2.5-pro** — heavier reasoning when selected or routed.
- **gemini-3-flash-preview** — preview tier in the routing map.

Fallback order and cost hints are encoded in the orchestrator. **OpenAI** client exists in dependencies for flexibility; **primary documented path** is Gemini + optional Ollama for self-hosted models.

### A.8 Security & trust (high level)

- Browser uses **Supabase anon** key; worker uses **service role** only server-side.
- **CORS** and body limits are explicitly configured for SPA + large workflow payloads.
- **Credentials** are not embedded in prompts as the long-term pattern; registry drives required credential categories; attach/get flows live under `/api/credentials` family.
- For a full security questionnaire, map controls to: auth boundary (Supabase), secrets (env + worker only), network (CORS), execution sandboxing (`vm2` for JS node—review hardening for your deployment).

### A.9 Demo positioning (without discussing how you authored the repo)

Clients rarely ask “which IDE.” They ask **whether you own the architecture**. Your answers should cite:

- **Orchestrator + registry** pattern.
- **Nine-stage pipeline** (routing → execution) from `ARCHITECTURE.md`.
- **Tests:** contract tests, compiler tests, e2e hooks (`npm` scripts on worker).
- **ADR:** graph invariants (see `worker/docs/adr/001-graph-invariants-and-requirements.md`).

If asked about team size: “We operate a **focused platform team** on a **TypeScript monorepo** with clear separation between editor, worker, and data layers.” That is truthful and professional.

---

## Part B — Full module map (files and responsibilities)

### B.1 Repository layout

| Path | Role |
|------|------|
| `ctrl_checks/` | Vite + React SPA; workflow canvas; calls worker via `VITE_API_URL`. |
| `worker/` | Express API, registries, AI pipeline, execution, integrations. |
| `ARCHITECTURE.md` | Authoritative narrative architecture (keep in sync with this doc for demos). |
| `worker/docs/adr/` | Architecture decisions (graph requirements). |
| `infrastructure/terraform/` | Deployment-related IaC (as present). |

### B.2–B.3 Frontend & worker surface

**Frontend:** `config/endpoints.ts` (API base); wizard/editor components; **React Flow** canvas; **Zustand** + **TanStack Query**.  
**Worker boot:** `index.ts` loads `env-loader` first, then **nodeLibrary**, **NodeSchemaRegistry**, **nodeContextRegistry**, **unifiedNodeRegistry**, Express, CORS, routes. **Config/middleware:** `core/config.ts`, `middleware/cors.ts`, `middleware/error-handler.ts`.  
**Routes (non-exhaustive):** `generate-workflow`, `smart-planner`, `ai-gateway`, `execute-workflow`, `distributed-execute-workflow`, `execute-node`, webhook/form/chat triggers, **`node-definitions`**.

### B.4 Registry, execution & graph (core files)

| Area | Key files |
|------|-----------|
| **Registry / SSOT** | `unified-node-registry.ts`, `node-library.ts`, `node-context-registry.ts`, `node-schema-registry.ts` |
| **Execution** | `dynamic-node-executor.ts`, `unified-execution-engine.ts`, `universal-template-resolver.ts` |
| **Graph** | `unified-graph-orchestrator.ts`, `execution-order-manager.ts`, `edge-reconciliation-engine.ts`, `universal-edge-creation-service.ts` |

### B.5 AI & generation pipeline

| File | Role |
|------|------|
| `worker/src/services/ai/gemini-orchestrator.ts` | Gemini calls, model selection, cost tracking hooks. |
| `worker/src/services/ai/model-manager.ts` | Model catalog & fallbacks for Gemini. |
| `worker/src/shared/llm-adapter.ts` | Adapter layer for chat/completions-style use. |
| `worker/src/services/ai/summarize-layer.ts` | Intent summarization, planning, strict plan assertions (e.g. branch coverage). |
| `worker/src/services/ai/workflow-builder.ts` | Large autonomous builder; validation & auto-repair phases. |
| `worker/src/services/workflow-lifecycle-manager.ts` | End-to-end graph generation lifecycle; ties pipeline to orchestrator. |
| `worker/src/services/ai/workflow-pipeline-orchestrator.ts` | Staged AI/build glue. |
| `worker/src/services/ai/plan-driven-workflow-builder.ts` | Builds workflow from plan chain + `initializeWorkflow`. |
| `worker/src/api/plan-chain-guards.ts` | Canonical chain validation & **auto-repair** helpers. |
| `worker/src/services/fix-agent.ts` | Repair agent invoked from generation routes. |
| `worker/src/services/ai/robust-edge-generator.ts` | Edge generation / repair support. |
| `worker/src/core/contracts/workflow-auto-repair.ts` | `WorkflowAutoRepair` class used in builder paths. |

### B.6 Validation & policies

| File | Role |
|------|------|
| `worker/src/services/ai/workflow-validator.ts` | Workflow validation (avoid adding hardcoded per-node rules here—prefer registry). |
| `worker/src/core/validation/schema-based-validator.ts` | Schema-validates against registry definitions. |
| `worker/src/services/ai/credential-preflight-check.ts` | Credential requirements from registry. |

### B.7 Data & integrations

| Concern | Implementation |
|---------|----------------|
| Supabase | `@supabase/supabase-js`, server helpers (`getSupabaseClient` / compat layers). |
| Prisma | `worker/prisma/` — use migrations as source of deployed schema. |
| Google / Slack / CRM / DB | Various clients in `worker` dependencies (`googleapis`, SDKs); execution in registry delegates. |

---

## Part C — Quick FAQ for live Q&A (short answers)

**Q1. Is this “just wrapping ChatGPT”?**  
No. LLMs suggest structure; **DAG validation, orchestrator, and registry execution** enforce correctness. Execution does not rely on the model at runtime for control flow.

**Q2. How do you prevent broken graphs?**  
**Unified graph orchestrator** + **edge reconciliation** + **validateWorkflow** + execution-plan validation before run.

**Q3. How do you add a new integration?**  
Extend **unified-node-registry** with schemas, credentials, and `execute()`—the editor and executor pick it up via `GET /api/node-definitions`.

**Q4. How do you version workflows?**  
`workflow-versioning` service and related API routes (see `ARCHITECTURE.md` §10).

**Q5. Can we self-host or use private LLMs?**  
Optional **Ollama** / Python backend URLs in env; primary cloud path is **Gemini**.

**Q6. What happens when AI generation fails?**  
Deterministic and **fast-analysis** fallbacks, logged explicitly; user still gets a phased UX response when the API is designed for it.

**Q7. Is parallel execution supported?**  
Default product semantics favor **linear** graphs unless branching is explicit; distributed/queue executors exist for scale-out when configured.

---

## Part D — Study checklist before the meeting

- [ ] Read `ARCHITECTURE.md` sections 1–7 and 19–20 (mental model + diagram).
- [ ] Skim `worker/docs/adr/001-graph-invariants-and-requirements.md`.
- [ ] Run `GET /health` on worker; confirm `GEMINI_API_KEY` behavior in non-prod.
- [ ] Trace one prompt: `generate-workflow` → lifecycle → `initializeWorkflow` → `execute-workflow`.
- [ ] Prepare 2 **live** examples: one linear, one `switch` with three branches—know where **merge** would go if reconvergence is required.

---

*Internal preparation material. For client PDFs, trim Part B/C and keep the stage graphs + Part A + checklist (~300+ lines with diagrams).*
