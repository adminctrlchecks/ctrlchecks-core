# CtrlChecks vs. Competitors — Why We Win on Technical Ground

**Integrated master doc:** For positioning **plus** exact figures, n8n/Zapier comparisons, example workflows, and enterprise narrative in **one place**, see [`PLATFORM_COMPLETE_REFERENCE.md`](./PLATFORM_COMPLETE_REFERENCE.md). This file remains the focused technical pitch.

**Audience:** Investors, enterprise buyers, and technical evaluators.  
**Intent:** Clear, defensible differences—not hype. Aligns with `ARCHITECTURE.md` and how the product is actually built.

---

## One-sentence position

**CtrlChecks is a registry‑ and orchestrator‑centric workflow OS:** natural language and AI help *author* automations, but **deterministic graph validation, a unified node contract, and a single execution engine** ensure what ships is a **correct DAG**—not a fragile prompt or a hand‑wired canvas.

---

## The five major differences (our top tier story)

### 1. Single source of truth for behavior (not “snowflake workflows”)

| Us | Many competitors |
|----|-------------------|
| Node **input/output schemas**, **defaults**, **credential rules**, **migrations**, and **`execute()`** live in a **unified node registry**. One fix applies to **every** workflow. | Logic and validation scatter across **saved JSON**, **custom scripts**, **per‑workflow hacks**, or **UI-only** checks—drift between “editor” and “runtime” is common. |

**Buyer line:** “We don’t maintain 500 integrations as 500 special cases in the executor. The **registry is the contract**.”

---

### 2. Graph integrity by architecture (not hope)

| Us | Many competitors |
|----|-------------------|
| Structural changes go through a **unified graph orchestrator** (`initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`, `validateWorkflow`). **Edges are reconciled** from execution order and **branching rules** (IF/SWITCH/MERGE)—not patched ad hoc in feature code. | Users and generators often **draw or edit edges freely**; invalid graphs (orphans, double outputs on linear nodes, cycles) surface **at run time** or require manual cleanup. |

**Buyer line:** “We treat invalid graphs as **pipeline failures**, not ‘maybe it will run.’”

**Proof to cite:** `worker/docs/adr/001-graph-invariants-and-requirements.md`, orchestrator + edge reconciliation modules.

---

### 3. AI as *untrusted input* until the compiler accepts it

| Us | Typical “AI automation” products |
|----|----------------------------------|
| LLMs **propose** structure and copy; **plan-chain guards**, **validators**, and **auto‑repair** converge toward an executable DAG. **Deterministic fallbacks** exist when structural LLM paths fail—generation can still complete. | Model output is often **trusted** as JSON; validation is shallow or cosmetic; failures show up as **broken runs** or **silent wrong branches**. |

**Buyer line:** “Models **speed authoring**; **deterministic validation and orchestration** own **correctness**.”

---

### 4. Same engine for author-time and run-time (no split brain)

| Us | Some stacks |
|----|-------------|
| **`GET /api/node-definitions`** drives the editor; **`execute‑workflow`** uses the same **registry** and **execution plan** path. What you validate is what you run. | Editor uses **stale** or **forked** node packs; runtime uses a **different** code path or older API surface. |

**Buyer line:** “The server is the **authority** for what a node is and how it runs.”

---

### 5. Enterprise-shaped platform primitives (not only happy-path Zaps)

| Us | Consumer iPaaS bias |
|----|---------------------|
| Explicit **DAG rules** (single trigger, acyclicity, branching ports, merge semantics), **credential discovery** from schema, **phased** generation API, optional **distributed** execution, **RBAC/audit hooks** for AI editor paths—designed for **governance** and **scale**. | Optimized for **time to first Zap**; weaker on **structural guarantees**, **auditability**, and **long-term maintainability** at high node counts. |

**Buyer line:** “We’re built for **ops and compliance**, not only for quick personal automations.”

---

## Category-by-category comparison (how evaluators bucket vendors)

### vs. **Zapier / Make / IFTTT-class**

- **They win on:** Mass-market template breadth, lowest friction for simple personal flows.  
- **We win on:** **Schema-first nodes**, **orchestrated DAG integrity**, **AI + validation** pipeline, and a path to **self-hosted / private LLM** and **enterprise** controls—not just more zaps.

### vs. **n8n / self-hosted iPaaS**

- **They win on:** Mature open workflow community, large integration catalog, familiar node editor.  
- **We win on:** **Central registry SSOT**, **mandatory reconciliation/validation** as product architecture, and **AI compilation** with **guards and fallbacks**—so AI scale doesn’t mean graph chaos.

### vs. **RPA (UiPath, Automation Anywhere, …)**

- **They win on:** Legacy UI automation where no API exists.  
- **We win on:** **API-first**, **stable DAG execution**, and **maintainability** when apps change—less brittle than screen scraping as the default model.

### vs. **“Chat with your data” / generic LLM copilots**

- **They win on:** Broad Q&A and document tasks.  
- **We win on:** **Executable workflows**—triggers, branches, integrations, retries, logs—with **LLMs in a bounded role**, not as the runtime engine.

### vs. **Temporal / pure workflow engines**

- **They win on:** **Durable execution** infrastructure, language SDKs, massive scale.  
- **We win on:** **End-user product**: visual workflow, **100+ node types**, **AI-assisted authoring**, credential and integration **UX**—Temporal is **complementary infrastructure**, not the same product layer.

---

## Moat summary (what’s hard to copy quickly)

1. **Unified registry + dynamic execution** at scale (years of integration edge cases collapsed into one contract model).  
2. **Orchestrator + edge reconciliation**—correctness **by construction**, not post-hoc linting only.  
3. **Tight loop:** node-definitions ↔ execution ↔ validator ↔ AI hydration.  
4. **Written invariants (ADR)** and **test gates** (`test:contracts`, `test:compiler`, etc.) that encode product promises.

---

## Honest boundaries (build trust—don’t overclaim)

- **Integration count** alone is not the moat; **correctness and governance** are.  
- **Smart-planner** session state and other subsystems may need **hardening for multi-instance** deploys—position roadmap, not denial.  
- **JavaScript sandbox** (`vm2` class) requires a clear **security story** for regulated customers; offer isolation or disable policies.  
- Competitors with **larger brand or template marketplaces** still win **discovery**; we win **architecture** and **enterprise technical diligence**.

---

## How to use this doc

- **Technical buyer:** Lead with §1–3 (registry, orchestrator, AI guardrails).  
- **Investor:** Lead with moat summary + category table.  
- **Security:** Point to ADR, validation-before-run, secrets on worker, RBAC/audit on AI editor.

---

*Internal / external pitch aid. Refresh when major architecture milestones ship (e.g. OTel, multi-region, certification).*
