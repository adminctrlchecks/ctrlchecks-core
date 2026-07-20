# CtrlChecks AI Workflow Platform — Technical FAQ (Report & Website)

Professional questions with **engineering-oriented answers** for the homepage FAQ block and for project documentation (Introduction, Architecture, Results, Conclusion). Vendor-neutral on LLM providers; inference remains server-side configuration.

---

## Section intro (website)

**Headline:** Technical FAQ

**Body:** Precise questions and concise engineering-oriented answers—aligned with the canvas, execution model, and security boundaries you see in the product.

**UI terms (match the app):** Workflow canvas, Node Library, Properties panel, Executions (history and run detail).

---

## Report placement (project documentation)

Use this table when dropping content into a formal report. Appendix rows are for **Architecture / Implementation / Conclusion** sections, not the marketing homepage.

| Item | Suggested report section | Category |
|------|--------------------------|----------|
| FAQ 1 — Structural model (DAG) | Introduction or Architecture | System |
| FAQ 2 — Composing workflows (Properties panel) | Introduction or Implementation | User / Developer |
| FAQ 3 — Runtime execution | Results or Architecture | System |
| FAQ 4 — AI-assisted authoring vs saved workflow | Introduction or Implementation | Developer |
| FAQ 5 — External integrations (Node Library) | Implementation | Developer |
| FAQ 6 — Failure behavior | Results | User |
| FAQ 7 — Credentials | Conclusion or Implementation | User / System |
| FAQ 8 — Target teams | Introduction | User |
| FAQ 9 — vs scripts / chat | Results | User |
| FAQ 10 — LLM not headline | Conclusion | System |
| Appendix A–D | Architecture / Implementation | Developer |
| Appendix E–G | Implementation | Developer |
| Appendix H–J | Implementation / Conclusion | Developer / System |

---

## Public messaging (AI and secrets)

- **Product story:** Workflow structure, validation, and execution—not a named LLM vendor.
- **Secrets:** API keys and inference endpoints on the worker tier via environment and secure configuration; never marketed as the headline feature.

---

## Architecture and authoring

**1. What structural model do CtrlChecks workflows use?**  
Each workflow is a directed acyclic graph (DAG): exactly one trigger node starts execution; downstream nodes run in topological order along defined edges. The graph must be fully connected from trigger to outputs—cycles and orphaned nodes are rejected as structural contract errors before a run. What you author on the canvas is the canonical definition of that DAG.

**2. How should I compose workflows in the visual editor?**  
Default to a linear chain: trigger first, then steps in execution order, with one main input per non-merge node unless you introduce explicit branching. Each node is configured against its schema in the Properties panel. Structural validation applies to the whole graph—field-level validation alone is not sufficient for a correct automation.

**3. How does the runtime execute a single workflow run?**  
The engine traverses the DAG from the trigger, executing one active path at a time. Node outputs are passed to successors according to edge semantics; IF/SWITCH-style nodes select a single branch per evaluation. Per-node status, logs, and failures are surfaced under Executions and in run detail so operators can attribute errors to a specific step.

**4. What is the relationship between AI-assisted authoring and the saved workflow?**  
Assistive generation proposes node types and ordering; those proposals are hydrated from the unified node registry and compiled into the same validated DAG you would build manually. The persisted source of truth is the graph after compilation and validation—not raw model output. Inference endpoints and API keys are server-side configuration only; they are not treated as a customer-facing product differentiator.

**5. How are external systems and APIs integrated?**  
Third-party capabilities appear as typed nodes with declared credential requirements, inputs, and outputs. The worker resolves configuration (including cross-node template references), validates against the registry, and dispatches execution through shared orchestration paths rather than ad-hoc per-vendor branches in the client. Use the Node Library in the editor for the current integration surface area.

---

## Execution, reliability, and security

**6. What is the failure and error-handling behavior during a run?**  
When a node errors—validation, connector failure, or upstream API fault—the run stops at that node with an attributable error context suitable for remediation. Retry, compensation, or alerting are modeled explicitly in the workflow (for example via additional nodes or policies) where your deployment supports them, rather than as hidden client-side behavior.

**7. Where do credentials and sensitive configuration reside?**  
Secrets and service credentials are bound to the worker and backing services; the browser does not retain provider API keys for automation connectors. Node definitions declare required credential categories so preflight checks can block runs that lack least-privilege access. AI-generated graphs undergo the same structural and permission constraints as manually authored workflows.

---

## Platform positioning

**8. Which teams and use cases is the platform aimed at?**  
Organizations that need governed, reviewable automation: platform engineering, operations, and business technologists who require execution history, explicit graphs, and schema-driven validation suitable for production change control—not one-off scripts without lineage or shared contracts.

**9. How does this compare to imperative scripts or general-purpose chat assistants?**  
Imperative scripts are difficult to audit and standardize at scale. Chat-centric tools rarely persist a validated DAG with deterministic execution semantics. CtrlChecks combines a visual graph, registry-backed node contracts, worker-side execution, and separation between the SPA and data tier—aligned with how enterprise automation is operated and observed.

**10. Is selection of a language-model provider the primary value proposition?**  
No. Primary value is dependable workflow orchestration: validated structure, integration contracts, and observable runs. Language models may accelerate authoring; which model or endpoint is deployed is an operational decision configured on the server and is not positioned as the headline capability.

---

## Technical appendix (report — deeper implementation topics)

| ID | Topic | Summary |
|----|--------|---------|
| A | Graph validation | Structural contract errors before run; DAG invariants. |
| B | Unified graph orchestrator | Central edge and execution-order reconciliation. |
| C | Unified node registry | Schema, credentials, execution, migrations per node type. |
| D | AI to executable graph | Planner intent → hydration → compiler → orchestrator. |
| E | Template resolution | Cross-node references resolved on the worker before execution. |
| F | Scale | Horizontal workers, DB-backed definitions and execution records. |
| G | Extensibility | New node types via registry; avoid ad-hoc type switches in routes. |
| H | Legacy workflows | Registry migrations for older persisted JSON. |
| I | Local dev / inference cost | Env-based endpoints; keys not committed; cost-conscious local usage. |
| J | Roadmap | Nodes, observability, policy, execution backends. |

---

## Content–UI alignment

| Concern | Product surface |
|---------|-----------------|
| Graph structure | Canvas, nodes, edges |
| Authoring | Trigger, inspector / node config |
| Execution | Run view, per-node status, logs |
| Integrations | Node catalog, credentials |
| Failures | Error on failing node |

---

## Source files

- [`ctrl_checks/src/components/landing/landing-faq-content.ts`](../ctrl_checks/src/components/landing/landing-faq-content.ts)
- [`ctrl_checks/src/components/landing/FaqSection.tsx`](../ctrl_checks/src/components/landing/FaqSection.tsx)
- [`ctrl_checks/src/pages/Index.tsx`](../ctrl_checks/src/pages/Index.tsx)
