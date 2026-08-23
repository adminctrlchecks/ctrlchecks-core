# AI Agent Node — Concept, Use Cases & CtrlChecks Integration

> Context doc. Describes the n8n-style "Tools Agent" node, 15 real-time use cases
> (5 easy / 5 medium / 5 hard), and how it would map onto CtrlChecks' architecture.

---

## 1. What the AI Agent node is

A normal LLM node is **prompt in → text out**. The **AI Agent node** wraps an LLM in a
*reasoning loop* so the model itself decides **which tools to call, in what order**, reads
each result, and keeps going until the task is done.

It is a single node with **special sub-node ports** (not the usual left→right data flow):

| Port | Attach | Role |
|------|--------|------|
| **Chat Model** (required) | Gemini / GPT / Claude | The reasoning "brain" |
| **Memory** (optional) | Buffer / Redis / Postgres | Conversation history across turns |
| **Tool** (optional, many) | Any node used as a tool | Actions the agent can choose from |

Plus **Success** and **Error** output ports.

### How it runs (the loop)
1. Input arrives (chat message / trigger).
2. Model receives the prompt **+ descriptions of every attached tool**.
3. Model replies with either a **final answer** or a **tool call** (name + args it composes).
4. Node executes that tool, feeds the result back to the model.
5. Steps 3–4 repeat until a final answer (bounded by a max-iterations cap).
6. Result emitted on **Success** (or **Error** on failure).

**Key point:** tools are *available*, not *ordered*. The agent picks which and in what
sequence, driven by data dependencies. Independent steps can run in parallel if the model
supports parallel tool calls; dependent steps stay sequential.

---

## 2. 15 real-time use cases

### 🟢 Easy (single trigger, 1–2 tools, linear intent)
| # | Use case | Tools |
|---|----------|-------|
| E1 | **Save article to Notion** — chat a URL, agent scrapes + saves + pings Discord | web_scraper, notion, discord |
| E2 | **Smart FAQ reply** — chat question, agent looks up KB and answers | vector_search |
| E3 | **Lead-to-CRM** — paste an email signature, agent parses + creates HubSpot contact | hubspot |
| E4 | **Calendar quick-add** — "meeting w/ Sam Thu 3pm", agent creates the event | google_calendar |
| E5 | **Currency/units helper** — chat a request, agent calls calculator + FX API | http_request, calculator |

### 🟡 Medium (multi-tool routing, memory, some branching)
| # | Use case | Tools |
|---|----------|-------|
| M1 | **Support triage** — reads ticket, decides: answer / escalate to Slack / open Jira | slack, jira, vector_search |
| M2 | **Content repurposer** — one blog URL → LinkedIn post + tweet thread + email draft | scraper, gmail, buffer |
| M3 | **Meeting-notes agent** — transcript → summary + action items to Asana + recap email | asana, gmail, memory |
| M4 | **Invoice processor** — email/PDF in → extract fields → push to QuickBooks + notify | pdf_parser, quickbooks, slack |
| M5 | **Research assistant** — question → multi-source web search → cited summary to Notion | web_search, scraper, notion, memory |

### 🔴 Hard (long chains, conditional loops, human-in-loop, multi-agent)
| # | Use case | Tools |
|---|----------|-------|
| H1 | **Autonomous inbox manager** — classify, draft replies, schedule, flag for approval | gmail, calendar, crm, memory |
| H2 | **E-commerce ops agent** — monitor orders, detect issues, refund/reorder, notify | shopify, stripe, slack, db |
| H3 | **DevOps incident responder** — alert → query logs → diagnose → runbook → page on-call | http, db, pagerduty, slack |
| H4 | **Sales pipeline agent** — enrich lead → score → personalize outreach → book demo | crm, enrichment, gmail, calendar |
| H5 | **Multi-agent orchestrator** — a "manager" agent delegates to sub-agents (research, write, review) | sub-agent tools, memory |

> "Real-time" = triggered by chat / webhook / event, executing while the user waits.

---

## 3. How it integrates into CtrlChecks

CtrlChecks already has every primitive an agent node needs. **No new engine** — it's a new
node type plus a small tool-loop wrapper.

| n8n concept | CtrlChecks equivalent (existing) |
|-------------|----------------------------------|
| Chat Model sub-node | `gemini-orchestrator.ts` (already the LLM facade) |
| Tool sub-node | **Any registered node** in `unified-node-registry.ts` used as a callable tool |
| Tool execution | `dynamic-node-executor.ts` + `credential-resolver.ts` (runtime secret injection) |
| Tool arg filling | The existing **runtime-AI field** system (`$fromAI`-style) — already built |
| Memory | Redis (`REDIS_URL`) / conversation store |
| Trigger | `GET /ws/chat` (chat) or webhook trigger |

> **⚠️ Discovery update (2026-08-21) — see [`AI_AGENT_IMPLEMENTATION_ANALYSIS.md`](AI_AGENT_IMPLEMENTATION_ANALYSIS.md) for the verified, authoritative picture.** Key corrections found by inspecting the repo: (1) `ai_agent` **already exists** as a single-shot LLM node — this is a *revive*, not a from-scratch add; (2) the LLM layer has **no native function-calling** — it needs an additive extension; (3) the agent must work in **both** the manual canvas **and** the AI generation pipeline; (4) **multiple connections** attach at once (one Chat Model + N tools, each with its own credential), reusing the existing node-level connection binding; (5) UI, connection-readiness gate, and DAG/validation rules all need updating system-wide.

### Proposed shape (single source of truth respected)
1. **Upgrade the existing `ai_agent` node** (it is already registered as a single-shot LLM node — this is a *revive*, not a new registration) with:
   - `inputSchema`: `systemPrompt`, `maxIterations`, `tools[]` (list of nodeType refs), `chatModel`, `memoryScope`
   - `credentialSchema`: none itself (tools carry their own)
   - `execute(context)`: runs the **tool-calling loop** below
2. **The loop inside `execute()`** (no `if (node.type===...)` outside the registry):
   - Build a tool manifest = for each referenced tool nodeType, pull its `inputSchema` from
     `unifiedNodeRegistry.get(type)` and expose it as a function schema to Gemini.
   - Call Gemini → get tool call → resolve that node via the registry → run its `execute()`
     through the normal executor (credentials auto-injected) → feed result back → repeat.
3. **Frontend:** add `ai_agent` metadata to `nodeTypes.ts` + layman description; render the
   sub-node ports (Chat Model / Memory / Tool) on the canvas in `WorkflowCanvas.tsx`.
4. **DAG note:** the agent node is a *container* — its tools are attachments, not linear DAG
   edges, so the deterministic linear-DAG rule needs a documented exception for agent ports.

### Why this is low-risk
- Tools = existing nodes → **every current + future node is automatically an agent tool.**
- Runtime-AI-field system already fills tool args from the model → no new arg-filling layer.
- Credentials, execution, and validation all reuse the existing pipeline.

### Main things to design
- **Port/edge model** for sub-nodes (canvas + orchestrator) — biggest new UI piece.
- **Iteration/cost guardrails** (max steps, token budget, timeout).
- **Human-in-the-loop** gate for the Hard use cases (approve before side-effects).

---

*Generated as a context doc — expand any section into an implementation plan on request.*
