# CtrlChecks Platform — Complete Reference (Positioning, Facts, Competitors, Examples)

**Single integrated document** for demos, investors, and enterprise buyers. It merges: enterprise positioning, **exact figures**, competitor comparisons (including **n8n** and **Zapier** baselines), **example workflows**, and the full **technical differentiation** narrative.

**Related files:** `COMPETITIVE_DIFFERENTIATION.md` (technical pitch excerpt), `ENTERPRISE_DEMO_POSITIONING_AND_MATURITY.md` (legacy sections absorbed here; prefer **this** file as source of truth going forward).

---

## Table of contents

1. [One-sentence positions](#1-one-sentence-positions)
2. [Exact figures & percentages](#2-exact-figures--percentages)
3. [How n8n “completeness” vs our platform “completeness”](#3-how-n8n-completeness-vs-our-platform-completeness)
4. [Example workflows you can build](#4-example-workflows-you-can-build)
5. [Enterprise context & “what % of Salesforce?”](#5-enterprise-context--what-of-salesforce)
6. [Current product stage](#6-current-product-stage)
7. [Competitive categories (summary)](#7-competitive-categories-summary)
8. [Technical differentiation (full)](#8-technical-differentiation-full)
9. [Gaps toward world-class](#9-gaps-toward-world-class)
10. [Closing narrative & document control](#10-closing-narrative--document-control)

---

## 1. One-sentence positions

| Audience | Line |
|----------|------|
| **Executive** | We deliver a **strong automation and AI compilation layer** with **registry-driven execution**; we do not claim to replace Salesforce-the-CRM unless product strategy changes. |
| **Technical** | **CtrlChecks is a registry- and orchestrator-centric workflow OS:** AI helps *author* automations; **deterministic graph validation, a unified node contract, and a single execution engine** ensure what ships is a **correct DAG**. |

---

## 2. Exact figures & percentages

### 2.1 CtrlChecks (from unified registry / NodeLibrary at runtime)

| Metric | Exact value |
|--------|-------------|
| **Canonical node types** | **124** |
| Trigger nodes | 8 |
| HTTP / API | 5 |
| Database-related | 8 |
| Google workspace | 8 |
| CRM / sales / support (crm category) | 8 |
| AI nodes | 12 |
| Logic / control | 12 |
| Data transformation | 16 |
| Output / comms | 10 |
| Flow (timeout, retry, parallel, try/catch, return) | 5 |
| Queue | 2 |
| Cache | 2 |
| Auth helpers | 2 |
| Social | 5 |
| File / storage | 7 |
| DevOps | 5 |
| E-commerce / payments | 4 |
| *(Other categories: Microsoft, workflow, utility, productivity, actions—see runtime logs.)* | — |

### 2.2 vs n8n (catalog breadth — use **one** baseline in a deck)

| Baseline | n8n figure (source) | Formula | **Result** |
|----------|---------------------|---------|------------|
| **Official first-party nodes** | **195** ([n8n Pulse](https://n8n-pulse.gui.do/nodes), third-party analytics) | 124 ÷ 195 | **63.59%** (~**64%** rounded) |
| **“400+” narrative** | **400** (common blogs; not identical to Pulse’s 195) | 124 ÷ 400 | **31.00%** |
| **Full ecosystem** | **~5,400** (official + community packages, Pulse) | 124 ÷ 5,400 | **~2.30%** |

**How to say it:**  
- **First-party parity:** “Our **124** canonical node types are **~64%** of n8n’s **~195** official node count *by that Pulse definition*.”  
- **Ecosystem:** “Including n8n’s **thousands** of community packages, raw **node-package** counts are not apples-to-apples with our **first-party** registry.”

### 2.3 vs Zapier (directory scale — illustrative)

| Baseline | Figure | 124 ÷ baseline |
|----------|--------|----------------|
| Zapier marketing “8,000+ apps” | 8,000 | **~1.55%** |
| App directory ~9,445 (snapshot varies) | 9,445 | **~1.31%** |

Zapier counts **apps**; we count **node types** (often many operations per integration). Use only with that disclaimer.

### 2.4 Salesforce

There is **no honest single %** without defining numerator/denominator (objects, clouds, CPQ, etc.). Fair line: we **orchestrate and integrate**; Salesforce remains **system of record** unless you sell a CRM.

---

## 3. How n8n “completeness” vs our platform “completeness”

| Dimension | n8n | CtrlChecks |
|-----------|-----|------------|
| **Who builds** | Human canvas + templates; huge **community** extensions. | **AI-assisted** pipeline: planner → **canonical registry types** → hydration; orchestrator validates structure. |
| **“Complete” workflow** | Runnable graph in *your* install; gaps filled via **HTTP**, **Code**, community nodes. | Runnable **validated DAG**; “complete” includes **graph invariants** (single trigger, acyclicity, reconciled edges). |
| **Integration count** | Usually **wins** (195+ official; **5K+** community packages on npm). | **~124** first-party types; **~64%** of n8n **official** count (Pulse **195**). |
| **Escape hatch** | HTTP Request, Code, webhooks. | `http_request`, `javascript`, `oauth2_auth`, `api_key_auth`, webhooks. |
| **Structural guarantees** | Flexible; user can build fragile graphs. | **Orchestrator + validation**: invalid graphs are **pipeline failures**, not silent luck. |
| **AI in the loop** | AI assists; ecosystem is **canvas-first**. | **AI-native authoring** with deterministic validation/repair as **core** story. |

**One line:** n8n optimizes for **maximum connector choice** and hands-on control; we optimize for **AI-generated, registry-validated** workflows with **end-to-end graph guarantees**—n8n often wins **breadth**; we win **compilation + invariants** when demonstrated in product.

---

## 4. Example workflows you can build

Node names follow the registry (e.g. `google_gmail`, `hubspot`, `slack_message`). Adjust to your connected credentials.

### Sales & CRM

1. **New lead → CRM + alert** — `webhook` → `json_parser` / `set` → `hubspot` or `salesforce` → `slack_message` or `microsoft_teams` → `log_output`.

2. **Daily pipeline review** — `schedule` → `google_sheets` → `aggregate` / `filter` → `if_else` → `slack_message` + `email` → `log_output`.

3. **Meeting follow-up** — `google_calendar` → `javascript` or `ai_chat_model` → `google_gmail` or `outlook` → `pipedrive` / `zoho_crm`.

### Support & ticketing

4. **Ticket triage** — `webhook` → `freshdesk` or `intercom` → `if_else` → `slack_message` → `database_write` / `supabase`.

5. **SLA reminder** — `schedule` → `http_request` or connector → `filter` → `slack_message` / `email`.

### Data & analytics

6. **Report to sheet + mail** — `schedule` → `postgresql` or `google_bigquery` → `sort` / `aggregate` → `google_sheets` → `email`.

7. **Sync DB → app** — `schedule` → `mysql` / `mongodb` → `merge_data` → `http_request` → `log_output`.

### Marketing & comms

8. **Campaign event** — `webhook` → `mailchimp` or `activecampaign` → `if_else` → `slack_message`.

9. **Scheduled social** — `schedule` → `linkedin` / `twitter` / `facebook` → `log_output` (respect API limits and credentials).

### E-commerce & payments

10. **Payment / order signal** — `webhook` → `stripe` or `shopify` → `if_else` → `slack_message` → `supabase` / `database_write`.

### AI-assisted

11. **Summarize + route** — `google_gmail` or `webhook` → `ai_agent` / `chat_model` / `text_summarizer` → `switch` / `if_else` → `slack_message` / `hubspot` / `email`.

12. **Ticket → draft reply** — `webhook` → `json_parser` → `anthropic_claude` or `openai_gpt` → `freshdesk` / `email` → `log_output`.

### Dev & internal

13. **Release notify** — `schedule` or `webhook` → `github` / `jira` → `microsoft_teams` or `slack_message` → `log_output`.

14. **Sub-workflow** — `manual_trigger` → `execute_workflow` → `return` / `log_output`.

### Generic API

15. **Custom SaaS** — `schedule` or `webhook` → `http_request` + `oauth2_auth` or `api_key_auth` → `javascript` → `redis` / `postgres` → `slack_message`.

---

## 5. Enterprise context & “what % of Salesforce?”

Stakeholders judge whether **AI-driven automation** can sit next to **Salesforce-class CRM**, **analytics stacks**, and **high-volume iPaaS**, with acceptable risk.

**Dimensions (no single fake %):**

| Dimension | How to discuss |
|-----------|----------------|
| **Integration breadth** | Catalog **categories** and **depth** per vendor—not one number. |
| **CRM parity** | We **connect** to CRMs; we do not replace **Salesforce the product suite** unless strategy changes. |
| **End-to-end process** | DAG correctness, credentials, retries, observability. |
| **AI & agents** | Workflow AI nodes vs **governed** agents (tools, memory, audit)—different maturity bars. |

---

## 6. Current product stage

### Strengths

- **124** registry-defined node types across triggers, CRM, data, AI, messaging, DevOps, e-commerce, etc.
- **Unified node registry** (SSOT); **unified graph orchestrator**; deterministic **DAG validation**; AI proposes, validators own correctness.
- **Distributed execution** path (Redis queue, workers) — see `worker/src/services/workflow-executor/distributed/`.
- **Security:** Supabase JWT, credential vault, AES token encryption, sandboxed JS, CORS/webhooks — see `ARCHITECTURE_DOCUMENT.md`.

### Stage label

**Advanced AI-native workflow automation OS** with **broad catalog** and **strong foundations**—moving toward **enterprise-grade** compliance packaging and **deepest-per-integration** maturity. Not the same as decade-mature **template marketplaces** or **SOC 2** until shipped and attested.

---

## 7. Competitive categories (summary)

| Category | They often win on | We emphasize |
|----------|-------------------|--------------|
| **Zapier / Make** | Template breadth, casual adoption | Schema-first nodes, orchestrated DAG integrity, AI + validation |
| **n8n** | Community, catalog size, canvas familiarity | Registry SSOT, mandatory reconciliation/validation, AI compilation with guards |
| **RPA** | UI automation | API-first DAGs, maintainability |
| **Chat / LLM copilots** | Q&A | Executable workflows with triggers, branches, integrations, logs |
| **Temporal / raw engines** | Durable infra at huge scale | End-user product: visual workflows, integrations, AI authoring |

---

## 8. Technical differentiation (full)

*Aligned with `docs/COMPETITIVE_DIFFERENTIATION.md`.*

### One-sentence position

**CtrlChecks is a registry- and orchestrator-centric workflow OS:** natural language and AI help *author* automations, but **deterministic graph validation, a unified node contract, and a single execution engine** ensure what ships is a **correct DAG**—not a fragile prompt or a hand-wired canvas.

### The five major differences

#### 1. Single source of truth for behavior (not “snowflake workflows”)

| Us | Many competitors |
|----|-------------------|
| Node **input/output schemas**, **defaults**, **credential rules**, **migrations**, and **`execute()`** live in a **unified node registry**. One fix applies to **every** workflow. | Logic and validation scatter across **saved JSON**, **custom scripts**, **per-workflow hacks**, or **UI-only** checks—drift between “editor” and “runtime” is common. |

**Buyer line:** “We don’t maintain 500 integrations as 500 special cases in the executor. The **registry is the contract**.”

#### 2. Graph integrity by architecture (not hope)

| Us | Many competitors |
|----|-------------------|
| Structural changes go through a **unified graph orchestrator** (`initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`, `validateWorkflow`). **Edges are reconciled** from execution order and **branching rules** (IF/SWITCH/MERGE)—not patched ad hoc in feature code. | Users and generators often **draw or edit edges freely**; invalid graphs surface **at run time** or require manual cleanup. |

**Buyer line:** “We treat invalid graphs as **pipeline failures**, not ‘maybe it will run.’”

**Proof to cite:** `worker/docs/adr/001-graph-invariants-and-requirements.md`, orchestrator + edge reconciliation modules.

#### 3. AI as *untrusted input* until the compiler accepts it

| Us | Typical “AI automation” products |
|----|----------------------------------|
| LLMs **propose** structure; **plan-chain guards**, **validators**, and **auto-repair** converge toward an executable DAG. **Deterministic fallbacks** when structural LLM paths fail. | Model output is often **trusted** as JSON; validation is shallow; failures show up as **broken runs** or **silent wrong branches**. |

**Buyer line:** “Models **speed authoring**; **deterministic validation and orchestration** own **correctness**.”

#### 4. Same engine for author-time and run-time (no split brain)

| Us | Some stacks |
|----|-------------|
| **`GET /api/node-definitions`** drives the editor; **`execute-workflow`** uses the same **registry** and **execution plan** path. | Editor uses **stale** or **forked** node packs; runtime uses a **different** code path. |

**Buyer line:** “The server is the **authority** for what a node is and how it runs.”

#### 5. Enterprise-shaped platform primitives (not only happy-path Zaps)

| Us | Consumer iPaaS bias |
|----|---------------------|
| Explicit **DAG rules**, **credential discovery** from schema, **phased** generation API, optional **distributed** execution, **RBAC/audit hooks** for AI editor paths. | Optimized for **time to first Zap**; weaker on **structural guarantees** and **auditability** at high node counts. |

**Buyer line:** “We’re built for **ops and compliance**, not only for quick personal automations.”

### Moat summary (what’s hard to copy quickly)

1. **Unified registry + dynamic execution** at scale.  
2. **Orchestrator + edge reconciliation**—correctness **by construction**.  
3. **Tight loop:** node-definitions ↔ execution ↔ validator ↔ AI hydration.  
4. **Written invariants (ADR)** and **test gates** that encode product promises.

### Honest boundaries (build trust)

- **Integration count** alone is not the moat; **correctness and governance** are.  
- Some subsystems may need **hardening for multi-instance** deploys—position as roadmap.  
- **JavaScript sandbox** needs a clear **security story** for regulated customers.  
- Competitors with **larger template marketplaces** still win **discovery**; we win **architecture** in technical diligence.

### How to use sections

- **Technical buyer:** Lead with registry, orchestrator, AI guardrails.  
- **Investor:** Moat + category table + exact figures (§2).  
- **Security:** ADR, validation-before-run, secrets, RBAC/audit on AI editor.

---

## 9. Gaps toward world-class

### Integrations & depth

- Prioritize **revenue-critical** systems per account (e.g. Salesforce bulk, Microsoft 365, warehouses).  
- Document per-connector **limits** (quotas, batch sizes).  
- Do not claim **AppExchange-wide** parity.

### AI & agents

- **Governance:** model allowlists, env separation, redaction in logs.  
- **Agents:** tool use, memory, human-in-the-loop, idempotent side effects.  
- **Evaluation:** regression sets when models change.

### Enterprise readiness

- **Identity:** SAML/OIDC (see `docs/auth0-multi-login-guide/`).  
- **Compliance:** SOC 2, GDPR/DPA, subprocessors—**programs**, not only code.  
- **SLAs & support** for large ACV deals.

### Operations

- SRE monitoring, fair queuing, rate limits, optional **data residency**.

### Demos

One **vertical** story end-to-end (e.g. lead → CRM → Slack → weekly email) with **no manual graph surgery** on stage.

---

## 10. Closing narrative & document control

**What we are:** An **AI-native workflow operating system** that turns intent into **validated, executable automation** with **registry + orchestrator + distributed execution** aimed at **enterprise durability**.

**What we are not (unless strategy changes):** A full **Salesforce CRM** or **warehouse** replacement—we **connect and orchestrate**.

**What world-class still needs:** Deeper **connector maturity**, **packaged enterprise trust** (identity, compliance, SLAs), and **governed AI agents** for regulated buyers.

| Field | Value |
|-------|--------|
| **Product** | CtrlChecks AI Workflow Platform |
| **Canonical node count** | **124** (verify on release via unified registry) |
| **n8n official % (Pulse 195)** | **63.59%** (round **64%**) |
| **References** | `README.md`, `ARCHITECTURE_DOCUMENT.md`, `worker/NODE_TYPES_LIST.md`, `docs/COMPETITIVE_DIFFERENTIATION.md` |

---

*Update this file when node counts, compliance milestones, or competitor baselines change. External competitor numbers (n8n Pulse, Zapier) are third-party or marketing figures—cite the source in slides.*
