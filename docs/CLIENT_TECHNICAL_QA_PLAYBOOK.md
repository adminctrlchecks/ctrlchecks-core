# CtrlChecks — Technical Q&A Playbook (Expanded — ~1,200 lines, 120 Q&A + appendices)

**Purpose:** Deep prep for CTO, staff engineers, principal engineers, and security reviewers. Answers map to `ARCHITECTURE.md`, `docs/CLIENT_ARCHITECTURE_AND_TECH_STACK.md`, and the `worker/` + `ctrl_checks/` codebase.

**How to use:** Read **A** for the elevator line; read **Detail** before a deep-dive call. **If they push** = objection handling. **Repo** = files to name in a meeting without opening the laptop.

**Rule:** Never dead-end on gaps—pair honest limits with **mitigation** or **roadmap**.

---

## Section 1 — Architecture & platform (Q1–Q15)

**Q1. What is the high-level topology of your system?**  
**A.** Browser SPA (`ctrl_checks`) uses Supabase for auth/data and a Node/Express **worker** for generation, validation, execution, and integrations; optional Redis/RabbitMQ/Temporal for scale-out execution.

**Detail:** The product is split so **credentials and LLM keys stay server-side** while the SPA can stay a static deploy. The worker owns the **node registry**, graph orchestration, and most integration calls. Supabase remains the natural place for user identity, workflow persistence, and RLS patterns enterprises expect. Optional infrastructure (queue, Temporal) is wired when you need **durable** or **horizontal** execution rather than a single long HTTP request.

**If they push:** “Is this serverless?” — Core path is **long-lived Node** (Express); you can containerize and autoscale behind a load balancer. Edge functions are not the center of gravity here.

**Repo:** `ARCHITECTURE.md`, `ctrl_checks/package.json`, `worker/package.json`, `worker/src/index.ts`.

---

**Q2. Why a monorepo instead of microservices?**  
**A.** One repo keeps the editor and engine aligned; the worker is already the service boundary you scale; shared TypeScript models reduce drift.

**Detail:** Microservices shine when teams and release cadences differ. Early-stage platforms benefit from **one graph of types** from API to UI. The **real** isolation boundary is: browser → worker API → integrations. You can later split the worker into domains without changing the mental model (registry + orchestrator stay core).

**If they push:** “Aren’t monorepos messy?” — Mess comes from **no** boundaries; here boundaries are explicit: `ctrl_checks` vs `worker`, and **no direct edge mutation** in feature code.

**Repo:** Root monorepo layout, `ARCHITECTURE.md` §3–4.

---

**Q3. What are the “nine stages” of your pipeline?**  
**A.** Client shell → API boundary → worker bootstrap → registry load → request handling → AI/planning → graph orchestration → execution → persistence/observability.

**Detail:** This framing helps auditors map **where** policy applies. Auth is not “sprinkled”; generation is not “one prompt”; **stage 7** (orchestration) is where DAG integrity is enforced. It also explains headcount: you need people who understand **graphs + APIs + AI guardrails**, not only React or only ML.

**If they push:** “Which stage is SOC2-relevant?” — Mostly **3–5** (boot, auth to routes), **8–9** (execution logging, data retention), plus **secrets** in config.

**Repo:** `ARCHITECTURE.md` lifecycle table (§2).

---

**Q4. What is the single source of truth for node behavior?**  
**A.** `unified-node-registry`: schemas, defaults, credential requirements, migrations, and `execute()` for each node type.

**Detail:** Enterprise buyers fear **shadow logic**—when Gmail behaves differently in the editor than at runtime. Centralizing behavior means a change to Gmail **propagates everywhere**: validation, credential preflight, execution, and AI hydration. The architectural rule is: **no scattered `if (node.type === 'gmail')` in executors**; the registry is the contract.

**If they push:** “How do you prevent AI from inventing fields?” — AI outputs **types**; **hydration** fills from `defaultConfig` and `inputSchema`; unknown types fail canonicalization.

**Repo:** `worker/src/core/registry/unified-node-registry.ts`, `worker/src/core/execution/dynamic-node-executor.ts`.

---

**Q5. Why forbid direct mutation of `workflow.edges`?**  
**A.** Edges must match **execution order** and **branching contracts**; ad-hoc edits cause orphans, double outputs on linear nodes, and editor/run mismatch.

**Detail:** Bugs from “just push an edge” compound at scale—especially with **switch** cases and **merge** in-degrees. Central reconciliation means every structural change is **replayable** and **testable**: same inputs → same graph shape. This is how you defend “500+ node types” without 500 special cases in the UI.

**If they push:** “Doesn’t that slow feature dev?” — It speeds **correctness**; features express **intent** (`injectNode`, `removeNode`) instead of low-level wiring.

**Repo:** `.cursor/rules/unified-graph-orchestrator-edge-ownership.mdc`, `worker/src/core/orchestration/edge-reconciliation-engine.ts`.

---

**Q6. What does the unified graph orchestrator do?**  
**A.** `initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`, `validateWorkflow`—the approved API for structural graph changes.

**Detail:** Think of it as a **compiler backend** for workflows. Initialization builds the first DAG from nodes. Injection supports **safety nodes**, **lifecycle resolve**, or **policy** inserts with context (`before`/`after`/`replace`). Reconcile repairs after imports or messy AI output. Validate is your **“won’t execute broken graphs”** gate.

**If they push:** “What if we import JSON from a competitor?” — Run `reconcileWorkflow` then `validateWorkflow`; normalize to your invariants before execution.

**Repo:** `worker/src/core/orchestration/unified-graph-orchestrator.ts`, `execution-order-manager.ts`, `edge-reconciliation-engine.ts`.

---

**Q7. How does execution order relate to edges?**  
**A.** Order drives edge reconciliation; validators ensure **order and edges agree** so runtime matches the canvas.

**Detail:** A classic failure mode is **visual edges** that don’t match **execution order** (or vice versa). Your stack deliberately ties them: the orchestrator reconciles edges from order + registry branching rules, and validation catches drift. Execution plan building (`unified-execution-engine`) then consumes **both** consistently.

**If they push:** “Can order differ from visual layout?” — Layout is presentation; **order** is semantics. React Flow positions don’t define execution—data does.

**Repo:** `worker/src/core/execution/unified-execution-engine.ts`, `execute-workflow.ts` (plan validation block).

---

**Q8. What written invariants back your DAG rules?**  
**A.** ADR `001-graph-invariants-and-requirements.md` (R1–R6 style traceable requirements).

**Detail:** Serious buyers ask “where is this specified?” Pointing to an ADR turns opinion into **engineering record**: single trigger, acyclicity, reachability, port rules for IF/SWITCH/MERGE. It also helps **sales engineers** and **your own QA** align tests to requirements.

**If they push:** “Is this ISO traceable?” — ADR + Jest contract/compiler tests are your starting evidence chain.

**Repo:** `worker/docs/adr/001-graph-invariants-and-requirements.md`.

---

**Q9. Is the workflow model compatible with React Flow?**  
**A.** Yes for visualization: `@xyflow/react` in the SPA; worker remains authoritative for schemas and execution.

**Detail:** React Flow is an excellent **editor** substrate; it is not your **runtime truth**. Node-definitions and execution both come from server state. That separation prevents “works on my machine canvas” bugs when two developers have different palette versions.

**If they push:** “Do you export BPMN?” — Not implied by repo; **JSON graph + nodes** is your interchange; BPMN would be an adapter project.

**Repo:** `ctrl_checks/package.json` (`@xyflow/react`), `worker/src/api/node-definitions` routes.

---

**Q10. How do you handle large JSON payloads?**  
**A.** Express JSON limits are raised so large workflows and embedded assets don’t hit 413.

**Detail:** AI-generated graphs and base64 snippets get big fast. Operational teams notice 413s before users complain. Document your **max body size** and **reverse proxy** limits (nginx, API Gateway) so they match Express.

**If they push:** “Do you stream generation?” — AI gateway supports **SSE** progress for some paths; `generate-workflow` is often **phased JSON** for wizard UX.

**Repo:** `ARCHITECTURE.md` §14 (payload size), `worker/src/api/ai-gateway.ts`.

---

**Q11. What is the primary API for AI workflow generation in the product UI?**  
**A.** `POST /api/generate-workflow`—phased responses for analyze/summarize/credentials/etc.

**Detail:** The handler in `generate-workflow.ts` is intentionally large: it encodes **product reality**—prompt enrichment, analyzers, summarize-layer, plan-chain guards, credential phases, lifecycle, validation, fix passes. Buyers care that this is **one coherent pipeline** with observability hooks, not 40 undocumented scripts.

**If they push:** “Latency budget?” — Break down by phase; first byte can return early on phased paths; full completion depends on Gemini and graph complexity.

**Repo:** `worker/src/api/generate-workflow.ts`, `ARCHITECTURE.md` §6.1.

---

**Q12. What alternative generation paths exist?**  
**A.** Smart planner (`/api/generate`, `/api/answer`), AI gateway builder routes, lifecycle manager entry points.

**Detail:** Different UX surfaces: **chatty planner** vs **wizard** vs **editor**. Shared concepts: registry hydration, orchestrator validation. Tradeoff: smart planner uses **in-memory session**—fine for single-instance demo, needs Redis if you horizontally scale sessions.

**If they push:** “Which path do you recommend?” — Product default wizard = `generate-workflow`; enterprises standardize **one** path per deployment to simplify support.

**Repo:** `worker/src/api/smart-planner.ts`, `worker/src/api/ai-gateway.ts`, `workflow-lifecycle-manager.ts`.

---

**Q13. Where does `workflow-lifecycle-manager` sit?**  
**A.** Between high-level prompts/planners and a concrete validated `Workflow` object.

**Detail:** Lifecycle coordinates **AgenticWorkflowBuilder**, credential detection, pipeline orchestrator steps, and ensures graph ops go through **unifiedGraphOrchestrator** where required. Naming matters in diligence: “lifecycle” signals **state machine thinking**, not a one-shot prompt.

**If they push:** “Can we plug our own planner?” — Possible at the edges **if** output still becomes node lists + orchestrator init/reconcile—don’t bypass validation.

**Repo:** `worker/src/services/workflow-lifecycle-manager.ts`, `workflow-pipeline-orchestrator.ts`.

---

**Q14. Do you separate compilation from execution?**  
**A.** Yes: generation + reconciliation + validation produce an executable DAG; `execute-workflow` consumes it via an execution plan.

**Detail:** This is the same separation as compiled languages: **compile errors** shouldn’t become **runtime surprises**. Your execution handler explicitly builds a plan and **fails 400** on validation errors—good for ops and for preventing partial side effects on broken graphs.

**If they push:** “JIT compile per run?” — You can re-validate on each run; typically workflows are **stored** then executed—policy choice.

**Repo:** `execute-workflow.ts` (`buildExecutionPlan`, validation branch), `unified-execution-engine.ts`.

---

**Q15. What does `GET /api/node-definitions` buy the customer?**  
**A.** The editor palette and forms always match **server** schemas—no stale or forked node definitions in the browser.

**Detail:** For IT, this reduces **unsupported configurations**: what users can configure is what the server understands. For security, it means **field-level guidance** and credential hints come from the same place execution reads.

**If they push:** “Versioning node-definitions?” — Tie releases of worker + SPA; cache headers (304) appear in logs—ensure CDN/proxy behavior matches.

**Repo:** `worker/src/index.ts` (route registration), node definitions handler, `unified-node-registry.ts`.

---

## Section 2 — Graphs, linearity, branching (Q16–Q30)

**Q16. Is the default graph linear?**  
**A.** Yes when the user doesn’t ask for branching—compiler bias is trigger → chain → terminal.

**Detail:** This matches enterprise change control: **simple automations should be simple graphs**. Branching is explicit (IF/SWITCH) so reviewers see control flow. The deterministic DAG compiler rule in `.cursor/rules` encodes product expectations for AI outputs too.

**If they push:** “Users want parallel fan-out.” — Model explicit **parallel** constructs if in registry; don’t fake parallel with illegal multi-edges from linear nodes.

**Repo:** `.cursor/rules/deterministic-workflow-dag-compiler.mdc`, `plan-driven-workflow-builder.ts` (`initializeWorkflow`).

---

**Q17. How are IF nodes modeled?**  
**A.** In-degree 1; two outgoing branches labeled `true` and `false` per orchestrator/registry contracts.

**Detail:** Runtime must choose **one** branch; edges carry type labels (`main` vs branch types). Validators enforce that non-branching nodes don’t get two `main` children—exactly the error you see when reconciliation tries to wire a second edge incorrectly.

**If they push:** “Short-circuit semantics?” — Execution skips nodes not on taken branch; tracked via skip sets in `execute-workflow`.

**Repo:** `edge-reconciliation-engine.ts`, `execute-workflow.ts` (ifElseResults / skipped nodes).

---

**Q18. How are SWITCH nodes modeled?**  
**A.** One input; multiple `case_n` outputs; reconvergence uses **merge** when required.

**Detail:** SWITCH complexity is where many tools fail silently. Your stack encodes **case ports** in the registry and requires **distinct targets** per case for valid graphs. Multi-case prompts sometimes stress plan consistency (logs: “branching chain incomplete”)—that’s **guards** catching under-specified plans, not random failure.

**If they push:** “Default/fallback case?” — Depends on `switch` node implementation in registry; verify in `unified-node-registry` for exact semantics.

**Repo:** `summarize-layer.ts` / plan assertions (branch coverage), `execute-workflow.ts` (switch results).

---

**Q19. What is a burst graph?**  
**A.** Uncontrolled fan-out from a normal node (multiple successors without branching semantics).

**Detail:** Burst graphs make runtime **non-deterministic** from a reviewer’s perspective—“which path is official?” The product rules push authors toward **IF/SWITCH** or merge-correct patterns instead.

**If they push:** “Map-reduce over a list?” — Use explicit **loop/batch** patterns from registry rather than implicit parallel burst.

**Repo:** Deterministic DAG rule doc, capability registry DSL (`NodeCapabilityRegistryDSL` in logs).

---

**Q20. How do you detect cycles?**  
**A.** Validation during execution plan construction and structural validation—DAG enforcement.

**Detail:** Cycles break topological execution and can cause infinite loops in naive engines. Failing at **plan build** saves money vs failing mid-run after partial API calls.

**If they push:** “Accidental cycle from user?” — Editor should block; if imported, validate before run.

**Repo:** `unified-execution-engine.ts`, `validateWorkflow` in orchestrator.

---

**Q21. Can two triggers exist?**  
**A.** No—contract error; exactly one reachable trigger is required.

**Detail:** Multiple entry points confuse **audit** and **scheduling**. Some systems allow multiple if exactly one is “active”; yours standardizes to **one** for clarity.

**If they push:** “Webhook + schedule?” — Model as **two workflows** or an explicit router pattern—don’t duplicate triggers in one graph.

**Repo:** `execute-workflow.ts` trigger checks, ADR invariants.

---

**Q22. What is an example terminal node?**  
**A.** `log_output`—often used as a sink; orchestrator wires last non-terminal steps toward logs when rules allow.

**Detail:** Terminals have **out-degree 0** in the DAG compiler mindset. Real integrations sometimes chain after “log”—then log isn’t terminal; your graph should reflect actual business end state.

**If they push:** “Is log a security leak?” — Logging **payloads** can leak PII—control log content and retention.

**Repo:** `UNIVERSAL_LOG_OUTPUT_ARCHITECTURE.md` (worker/docs), orchestrator logs (“Connected last non-terminal node → log_output”).

---

**Q23. What happens when edge creation fails with “Non-branching node already has outgoing edge”?**  
**A.** The universal edge service refuses a second **main** output from a linear node—it’s a structural guardrail.

**Detail:** This often appears when **two branches** should feed a **merge** or when the **plan order** implies two successors for one Gmail node. The fix is **graph semantics**, not forcing the edge: add merge, reorder, or mark branching correctly. Logs name source/target types and handles—use them in support playbooks.

**If they push:** “Why not auto-merge?” — Auto-merge can hide business logic bugs; some paths **self-heal** attach-inputs but enterprise may prefer explicit merges.

**Repo:** `universal-edge-creation-service.ts`, `attach-inputs.ts` (SELF-HEAL comments).

---

**Q24. What is `reconcileWorkflow` for?**  
**A.** Normalize edges after imports, injections, or AI edits so they match execution order and ports.

**Detail:** Reconciliation is your **“format graph”** step—like `gofmt` for connectivity. Run it after batch operations (policy removed nodes, lifecycle re-added nodes) to avoid stale edge lists.

**If they push:** “Idempotent?” — Should be safe to run multiple times; still follow with `validateWorkflow`.

**Repo:** `unified-graph-orchestrator.ts` (`reconcileWorkflow`).

---

**Q25. How are handles (ports) resolved?**  
**A.** Registry-driven resolution via universal handle resolver + `universal-edge-creation-service`—not hardcoded per integration in feature code.

**Detail:** Handles map to **output/input ports**—critical for branching (`case_2` vs `main`). This is how you scale to **many** node types without N×M connection matrices in code.

**If they push:** “Custom ports per tenant?” — Would extend registry metadata—avoid one-off string ports in the UI.

**Repo:** `worker/src/services/edges/universal-edge-creation-service.ts`, `universalHandleResolver` references in orchestration.

---

**Q26. What is `execution-order-manager`?**  
**A.** Computes and maintains node order consistent with DAG and branching semantics.

**Detail:** Order is the spine of both **reconciliation** and **runtime**. When order is wrong, everything downstream looks like “AI is random”—usually it’s ordering.

**If they push:** “Manual reorder in UI?” — Must translate to valid order updates + reconcile; don’t only move visuals.

**Repo:** `worker/src/core/orchestration/execution-order-manager.ts`.

---

**Q27. Do you support merge nodes?**  
**A.** Yes—multiple inputs, one output for reconvergence after branches.

**Detail:** Without merge, divergent branches **stay separate**—valid, but many business processes **rejoin**. MERGE in-degree ≥2 is a first-class contract in the DAG rules. Skipping merge when reconverging creates **illegal multi-input** to downstream nodes.

**If they push:** “Merge conflict semantics?” — Typically last-wins or array combine—**check registry** for `merge_data`/merge node behavior.

**Repo:** DAG compiler rule doc (merge section), registry merge tags.

---

**Q28. How does `unified-execution-engine` fit in?**  
**A.** It builds an execution plan from nodes + edges and returns validation errors/warnings before any node runs.

**Detail:** This is your **static analysis** pass for runtime. Buyers like seeing **validationErrors** separate from **warnings**—it shows maturity.

**If they push:** “Plan cached?” — Typically built per request; could memoize by workflow version hash internally.

**Repo:** `worker/src/core/execution/unified-execution-engine.ts`, `execute-workflow.ts` import of `buildExecutionPlan`.

---

**Q29. Is execution “just topological sort”?**  
**A.** Topological order matters, but **branch selection** and **skips** mean runtime is a **guided walk**, not naive parallel layer execution.

**Detail:** IF/SWITCH evaluation **prunes** successors; error triggers may exist as separate paths. Explain this to engineers who assume Make-like “run all ready tasks.”

**If they push:** “Parallelism?” — True parallel execution is **distributed/queue** path when enabled; default mental model is **sequential per branch**.

**Repo:** `execute-workflow.ts` (skippedNodeIds, execution walk).

---

**Q30. Where is branching evaluated at runtime?**  
**A.** Inside `execute-workflow.ts` with tracked IF/SWITCH results feeding which downstream nodes execute.

**Detail:** Keeping branching in one runtime module avoids **duplicating semantics** across integrations. Registry defines **what** nodes exist; executor defines **how** control flow walks the graph.

**If they push:** “Can we step-debug?” — Depends on UI; server logs per node are baseline—also WebSocket execution feeds when enabled.

**Repo:** `execute-workflow.ts` (ifElseResults, switchResults, switchExpressionValues).

---

## Section 3 — AI, models, prompting (Q31–Q45)

**Q31. Which LLM vendor is primary?**  
**A.** Google **Gemini** via `gemini-orchestrator` and `GEMINI_API_KEY`.

**Detail:** Single-vendor focus simplifies **data processing agreements** and key rotation. `LLMAdapter` abstracts provider details for maintainability.

**If they push:** “Azure OpenAI instead?” — Adapter pattern exists; Gemini is what the repo wires **by default**—scope migration work honestly.

**Repo:** `worker/src/services/ai/gemini-orchestrator.ts`, `worker/src/shared/llm-adapter.ts`.

---

**Q32. Which Gemini models appear in code?**  
**A.** `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-flash-preview` per `model-manager.ts`.

**Detail:** Flash vs Pro is **cost/latency vs reasoning depth**. Preview models need **explicit customer consent** for production in regulated settings.

**If they push:** “Token limits?” — Document per model from Google’s current docs; your prompts (summarize, structural) should stay within safe bounds with chunking where implemented.

**Repo:** `worker/src/services/ai/model-manager.ts`, `gemini-orchestrator.ts` (pricing constants comment).

---

**Q33. How do you choose flash vs pro?**  
**A.** Heuristics in `GeminiOrchestrator` (e.g. complexity) plus **fallback** if Pro fails.

**Detail:** Fallback maps preserve **uptime** at slightly lower quality—better than hard outage for demos. Operators should **monitor fallback rate** as a quality signal.

**If they push:** “Can tenant pin Pro-only?” — Config/feature flag discussion—env or per-org settings.

**Repo:** `gemini-orchestrator.ts` `selectModel` / fallback branches.

---

**Q34. Is OpenAI used?**  
**A.** Dependency exists; **primary** documented path is Gemini—confirm what your deployment enables.

**Detail:** Having the package doesn’t mean it’s on. Legal/privacy reviews need **actual** invocation paths, not `package.json` alone.

**Repo:** `worker/package.json` (`openai`), search for usage in `worker/src`.

---

**Q35. What is structural LLM single-plan?**  
**A.** Optional path: LLM proposes structure with **guards**; env controls enablement (differs in production by default).

**Detail:** This is **high leverage** but **higher risk** than pure deterministic builders. Guards + deterministic fallback are how you avoid “creative” invalid graphs. `ARCHITECTURE.md` names `ENABLE_STRUCTURAL_LLM_SINGLE_PLAN`.

**If they push:** “Prove it’s safe.” — Show **validateWorkflow** + test suite gates + logs where LLM path fails and deterministic path succeeds.

**Repo:** `ARCHITECTURE.md` §5, `generate-workflow.ts`, env flags.

---

**Q36. What if the structural LLM path fails?**  
**A.** Deterministic chain and **fast-analysis** fallback continue; user still gets a phased response where designed.

**Detail:** Logs like “Structural LLM path failed, using deterministic chain” are **good**—they prove defense in depth. Position as **SLO-friendly**: generation degrades gracefully.

**If they push:** “Quality drop?” — Measure downstream **validation failure rate** and **human edit time** per workflow.

**Repo:** Terminal logs / `summarize-layer.ts` error paths, `AIIntentClarifier` flows.

---

**Q37. How do you avoid hallucinated node types?**  
**A.** Canonicalization against registry; unknown types rejected; plan-chain repair may insert missing pieces.

**Detail:** The AI never “invents” a new executor silently—if the type string doesn’t resolve, the pipeline **stops or repairs**. That’s the difference between a demo toy and production tooling.

**If they push:** “Typos like `google_mail`?” — Library normalization / alias layers (`NodeLibrary` semantic match logs) help—document alias policy.

**Repo:** `node-library.ts`, `plan-chain-guards.ts`, `plan-driven-workflow-builder.ts`.

---

**Q38. Where does intent → node mapping happen?**  
**A.** `summarize-layer`, `AIIntentClarifier`, keyword/registries scans—often logged verbosely for support.

**Detail:** Universal detection scans **many** registry nodes and groups by semantic category; then intent-preserving picks **explicit** mentions. This explains why broad prompts detect many nodes but **selected** ones are fewer.

**If they push:** “Bias toward Gmail?” — Detection scores and category winners are in logs—tune keywords/registry metadata, not prompts only.

**Repo:** `summarize-layer.ts`, grep `AIIntentClarifier` in worker.

---

**Q39. Do you embed credentials in prompts?**  
**A.** Architectural ideal: **no**; registry drives credential needs; vault/OAuth attach later.

**Detail:** Prompt injection + accidental exfiltration are reduced when **secrets never touch** the LLM context. If legacy paths exist, **flag them for retirement** in security review.

**Repo:** `credential-preflight-check.ts`, credential routes, `ARCHITECTURE.md` §9–10.

---

**Q40. How are `{{$json.field}}` templates resolved?**  
**A.** `universal-template-resolver` at registry execution time before legacy executors.

**Detail:** Users expect n8n/Make-like templating. Central resolver avoids **per-node** regex bugs. Mention **nested paths** support per architecture rules.

**Repo:** `worker/src/core/utils/universal-template-resolver.ts`, `permanent-core-architecture.mdc`.

---

**Q41. Is RAG used for workflow generation?**  
**A.** Memory modules and training datasets exist; treat RAG as **context**, not the **validity oracle**.

**Detail:** Graph correctness still comes from **orchestrator + validator**. RAG can suggest **similar workflows**—great UX—but shouldn’t override invariants.

**Repo:** `worker/src/memory/`, `worker/data/`, training routes.

---

**Q42. Do you fine-tune models?**  
**A.** Scripts and `fine-tuning/` exist; whether you **run** fine-tunes in prod is an org decision.

**Detail:** Buyers may over-index on fine-tuning. Your moat is **deterministic compilation**, not secret weights. Still, domain-specific fine-tunes can improve **intent mapping**—with a retrain pipeline.

**Repo:** `worker/fine-tuning/`, `package.json` train scripts.

---

**Q43. How do you track AI cost?**  
**A.** `metrics-tracker`, orchestrator usage metadata—surface in `/api/ai/metrics` family when enabled.

**Detail:** Finance wants **per-tenant** attribution—ensure you pass org and workflow ids into metrics calls in your fork.

**Repo:** `metrics-tracker.ts`, `ai-gateway.ts` routes.

---

**Q44. Can we use private / air-gapped LLMs?**  
**A.** Ollama / Python backend URLs are optional in env; graph validation still local.

**Detail:** Air-gap means **no** Gemini egress—ops must host models and possibly strip cloud calls entirely. Expect **lower** structural creativity; deterministic paths matter more.

**Repo:** `ARCHITECTURE.md` §1, `Guide/Fast_API_Ollama/`, env examples.

---

**Q45. Prompt injection from triggers?**  
**A.** Treat trigger payloads as **untrusted**; authenticate triggers; avoid logging raw secrets; scope tokens.

**Detail:** Form/chat triggers are **public-ish** surfaces. Use **workflow scoped secrets**, rate limits, and validation of payload shape. Pen-test these endpoints specifically.

**Repo:** `form-trigger.ts`, `chat-trigger.ts`, webhook routes.

---

## Section 4 — Validation, repair, “self-healing” (Q46–Q58)

**Q46. What fails before execution?**  
**A.** Missing trigger, orphans, plan validation errors—HTTP 400 with structured `details`.

**Detail:** Good errors are a **feature**—they reduce support tickets. Your handler returns **validationErrors**, **hints**—keep that contract stable for the SPA.

**Repo:** `execute-workflow.ts` early returns after `buildExecutionPlan`.

---

**Q47. What is `WorkflowAutoRepair`?**  
**A.** Core contract class used in builder to validate/repair with bounded iterations.

**Detail:** Auto-repair is **not** magic—it's deterministic transforms with logs (“fixes applied”). Transparency builds trust with security teams.

**Repo:** `worker/src/core/contracts/workflow-auto-repair.ts`, `workflow-builder.ts` STEP-5.

---

**Q48. What are plan-chain guards?**  
**A.** `plan-chain-guards.ts`—validates canonical chains and **auto-repairs** intent misalignment (e.g. branching output count).

**Detail:** Tests in `generate-workflow-plan-chain.test.ts` document expected repairs—cite them as **living spec**.

**Repo:** `worker/src/api/plan-chain-guards.ts`, `__tests__/generate-workflow-plan-chain.test.ts`.

---

**Q49. What is `RobustEdgeGenerator`?**  
**A.** Generates/repairs edges during generation when graphs are incomplete.

**Detail:** Works **with** orchestrator—should not create illegal multi-edges; if it tries, universal service rejects and logs.

**Repo:** `worker/src/services/ai/robust-edge-generator.ts`, `generate-workflow.ts`.

---

**Q50. What is `fix-agent`?**  
**A.** Late pipeline agent from `fix-agent` service invoked by generation API for remediation.

**Detail:** Position as **second opinion** after validators—not the first line. Too much agent autonomy without guards scares buyers.

**Repo:** `worker/src/services/fix-agent.ts`, `generate-workflow.ts` import.

---

**Q51. Is self-healing unconditional?**  
**A.** No—bounded repairs; some errors require human intent or credential fixes.

**Detail:** Over-promising “auto-heal everything” will lose deals when an edge case breaks trust. Say: **“Healing within structural contracts; business logic is still yours.”**

**Repo:** Repair classes + orchestrator errors arrays.

---

**Q52. Are repair decisions logged?**  
**A.** Heavy console logging today—production should use structured JSON logs.

**Detail:** SREs need **correlation ids** across generate + execute. Add `workflowId`/`requestId` in your deployment if not uniform.

**Repo:** `generate-workflow.ts` PHASE logs, orchestrator logs.

---

**Q53. What does attach-inputs self-heal?**  
**A.** Structural gaps after reconcile—e.g. ensuring terminals like `log_output` aren’t orphaned when possible.

**Detail:** Read the SELF-HEAL comment block—this is **targeted** surgery, not full replanning.

**Repo:** `worker/src/api/attach-inputs.ts` (~line 1303 region).

---

**Q54. How do you test invariants?**  
**A.** Jest contracts, compiler tests, e2e, intent harness—scripts in worker `package.json`.

**Detail:** Quote **`npm run test:contracts`**, **`test:compiler`**, **`test:intent-e2e`**—buyers want CI gates.

**Repo:** `worker/package.json` scripts, `worker/test/`.

---

**Q55. Property-based testing?**  
**A.** `fast-check` available; confirm CI usage—if not wired, say “available, planned for critical invariants.”

**Detail:** Great for graph generators—**random DAG mutations** must keep validate green.

**Repo:** `worker/package.json` devDependencies.

---

**Q56. Partial wizard failure UX?**  
**A.** Phased `generate-workflow` returns intermediate phases rather than all-or-nothing.

**Detail:** Reduces **perceived** flakiness—users see progress. Product must still communicate **what** failed (credentials vs structure).

**Repo:** `generate-workflow.ts` phased responses.

---

**Q57. Retries on Gemini failures?**  
**A.** Model **fallback** exists; explicit exponential backoff may be partial—verify timeouts in adapter.

**Detail:** For enterprise SLAs, define **retry budget** and **circuit breaker** at API gateway.

**Repo:** `gemini-orchestrator.ts`, `LLMAdapter.ts`.

---

**Q58. Is execution idempotent?**  
**A.** Generally **no** for side effects (email, Slack)—users add dedupe keys or idempotency nodes.

**Detail:** Honesty wins deals: **workflow engine ≠ message queue**. If they need exactly-once, pair with dedupe store or transactional outbox pattern **inside** the workflow.

**Repo:** Integration executors (behavior per node).

---

## Section 5 — Security, privacy, compliance (Q59–Q70)

**Q59. How is authentication handled?**  
**A.** Supabase auth for users; worker endpoints vary—map per route for audit.

**Detail:** Diligence needs a **spreadsheet**: route → auth mechanism → data classification. Don’t hand-wave “Supabase handles it.”

**Repo:** `attach-credentials`, `auth/status`, middleware patterns in `api/*`.

---

**Q60. Where do secrets live?**  
**A.** Worker environment (`GEMINI_API_KEY`, Supabase service role)—never in Vite bundle.

**Detail:** Frontend `VITE_*` is public—**only** anon keys. Service role **only** on server. Rotate secrets with **deployment pipeline**, not git.

**Repo:** `worker/env.example`, `ctrl_checks/env.example`, `config.ts`.

---

**Q61. CORS configuration?**  
**A.** `corsMiddleware` + allowed origins from config—must match prod domains.

**Detail:** Misconfigured CORS looks like “buggy app” but is **security**. Staging vs prod origins must be explicit.

**Repo:** `worker/src/core/middleware/cors.ts`, `ARCHITECTURE.md` §14.

---

**Q62. RBAC on AI editor?**  
**A.** `ai-editor-rbac.ts` gates capabilities by phase and principal.

**Detail:** Enterprises ask “can any user rewrite prod with AI?” Your hooks allow **policy**—implement org roles in your identity layer.

**Repo:** `worker/src/services/ai/ai-editor-rbac.ts`, `ai-gateway.ts`.

---

**Q63. Audit log for AI edits?**  
**A.** `ai-editor-audit.ts` hashes diffs; supports reads for review.

**Detail:** Pair with **retention** and **immutability** (append-only store) for strong compliance story.

**Repo:** `worker/src/services/ai/ai-editor-audit.ts`.

---

**Q64. SSRF risks in HTTP nodes?**  
**A.** HTTP nodes can call arbitrary URLs—use allowlists, egress controls, or disable in sensitive envs.

**Detail:** Same issue as real ETL tools. Mitigations: **network policy**, **proxy**, **signed egress**. Don’t claim zero risk.

**Repo:** `http_request` node in registry, enterprise network review.

---

**Q65. Sandboxing for `javascript` node?**  
**A.** `vm2` historically—evaluate **deprecation/supply chain** risk; isolate worker processes.

**Detail:** Offer **disabled JS node** tier for regulated customers; provide static analysis or approved script library as middle ground.

**Repo:** `worker/package.json` (`vm2`), registry `javascript` execute path.

---

**Q66. Data residency?**  
**A.** Depends on Supabase region + Gemini processing region—document actual choices.

**Detail:** EU customers may need **EU DB + EU LLM endpoint** or **no cloud LLM**. Address in MSA/DPA.

**Repo:** Deployment docs, Supabase project settings (external).

---

**Q67. Encryption?**  
**A.** TLS in transit; Postgres encryption at rest per Supabase; consider customer-managed keys for attachments.

**Detail:** Match customer’s **minimum standards** document checklist.

**Repo:** Infra terraform if KMS wired.

---

**Q68. PII in logs?**  
**A.** Risk—redact emails, tokens, form payloads in production logging.

**Detail:** Provide **sample** log lines in security pack showing redaction.

**Repo:** Logging middleware, Winston config.

---

**Q69. OAuth token storage?**  
**A.** Connections/credential APIs + DB schema—review encryption and per-org isolation.

**Detail:** Answer **how refresh tokens** work and **revocation** story.

**Repo:** `api/credentials`, `api/oauth`, Prisma models if used.

---

**Q70. SOC2 / ISO?**  
**A.** State **actual** certification status; if none, show control matrix mapped to code (RLS, audit, pen tests).

**Detail:** Many Series A buyers accept **SOC2 in progress** with transparent timeline—don’t fake badges.

**Repo:** Policies (external), `OBSERVABILITY_CONTRACT.md`.

---

## Section 6 — Scalability, reliability, operations (Q71–Q82)

**Q71. How do you scale the worker?**  
**A.** Horizontal replicas behind LB if stateless; **smart planner** sessions need external store to scale out.

**Detail:** Stateless isn’t automatic—check global singletons and WS sticky sessions. Document **max concurrent executions** per instance.

**Repo:** `smart-planner.ts` Map session, `index.ts` WS setup.

---

**Q72. Long-running workflows?**  
**A.** Distributed executor / Temporal path when enabled; else HTTP timeout bounds synchronous runs.

**Detail:** For hour-long jobs, you **must** offload to queue/worker—show architecture diagram for proposed prod.

**Repo:** `distributed-execute-workflow`, `services/workflow-executor/distributed/`.

---

**Q73. Message queues?**  
**A.** `amqplib` present — whether **used** depends on deployment config.

**Detail:** Clarify **dead-letter** queues and **poison message** handling in runbooks.

**Repo:** `worker/package.json`, queue consumer imports in `index.ts`.

---

**Q74. Health checks?**  
**A.** `GET /health` reports process + Gemini config awareness.

**Detail:** K8s liveness vs readiness—health should distinguish **can serve** vs **dependencies OK**.

**Repo:** Health handler in `index.ts` or dedicated route.

---

**Q75. WebSockets?**  
**A.** Chat and execution visualization when compiled in—sticky sessions may be needed.

**Detail:** Load balancers must support WS upgrade—document timeouts.

**Repo:** `chat-server`, execution WS setup from `index.ts`.

---

**Q76. Rate limiting?**  
**A.** Often at **edge** (Cloudflare, API Gateway)—confirm if app-level exists.

**Detail:** Public triggers **need** rate limits to prevent abuse and cost bombs on Gemini.

**Repo:** Trigger routes—add middleware if missing.

---

**Q77. Disaster recovery?**  
**A.** Supabase backups + redeploy worker from IaC; RPO/RTO per business.

**Detail:** Run **restore drill** quarterly—customers ask “have you tested restore?”

**Repo:** `infrastructure/terraform/`.

---

**Q78. Multi-tenancy?**  
**A.** Typically row-level security by org/user in app tables—verify schema.

**Detail:** **Noisy neighbor** on worker CPU—use quotas and per-tenant concurrency caps in product roadmap.

**Repo:** Supabase migrations, Prisma schema.

---

**Q79. Deployment patterns?**  
**A.** Standard container/VM—blue/green is platform concern.

**Detail:** Mention **migrations** runbook (Prisma) during deploy windows.

**Repo:** CI/CD (external).

---

**Q80. Observability?**  
**A.** Request timing middleware, Winston; see `OBSERVABILITY_CONTRACT.md`.

**Detail:** Define **golden signals**: latency, traffic, errors, saturation **per route** especially `/api/generate-workflow`.

**Repo:** `worker/docs/OBSERVABILITY_CONTRACT.md`.

---

**Q81. Distributed tracing?**  
**A.** Add OpenTelemetry if not present—honest status + timeline.

**Detail:** Traces across **UI → worker → Supabase → Gemini** close support tickets faster.

**Repo:** Search `opentelemetry` in repo.

---

**Q82. Dependency policy?**  
**A.** Lockfiles; monitor CVEs; pin majors carefully for Express/Supabase.

**Detail:** Provide **SBOM** export for enterprise procurement.

**Repo:** `package-lock.json`, Dependabot config if any.

---

## Section 7 — Integrations & extensibility (Q83–Q92)

**Q83. How many node types?**  
**A.** On the order of **100+** in registry (context registry logs ~124 nodes scanned—quote current count live).

**Detail:** Node **count ≠ integration depth** per node—some are thin wrappers, some deep (Google).

**Repo:** `unified-node-registry.ts`, startup logs.

---

**Q84. Time to add an enterprise integration?**  
**A.** Registry entry + executor + tests; timeline scales with vendor API complexity, not core engine.

**Detail:** Offer **phased delivery**: read-only, then write, then webhook triggers.

**Repo:** Pattern in registry `convertNodeLibrarySchemaToUnified`.

---

**Q85. Private/custom nodes?**  
**A.** Yes—extend registry; optionally ship private npm package to worker build.

**Detail:** Governance: **approve** custom nodes like any dependency—security review required.

**Repo:** Registry extension points.

---

**Q86. Webhook triggers?**  
**A.** `webhook-trigger` API—sign payloads in enterprise deployments.

**Detail:** Document **replay protection** and **idempotency keys** for inbound events.

**Repo:** `worker/src/api/webhook-trigger.ts`.

---

**Q87. Human-in-the-loop?**  
**A.** `workflow-confirm` when enabled—good for approvals.

**Detail:** Map to **SOX** or **change management**: who approved automated money movement?

**Repo:** `workflow-confirm` routes.

---

**Q88. Import from other automation tools?**  
**A.** JSON import + `reconcileWorkflow` normalize; professional services for mapping.

**Detail:** 100% automatic port is rare—sell **migration program**.

**Repo:** Orchestrator reconcile.

---

**Q89. Workflow versioning?**  
**A.** `WorkflowVersioning` service + API routes.

**Detail:** Enterprises need **rollback** and **diff**—show UI capability or roadmap.

**Repo:** `workflow-versioning.ts`, versioning routes.

---

**Q90. Feature flags?**  
**A.** Env flags for structural LLM, intent authority—see `ARCHITECTURE.md` §14.

**Detail:** Move critical flags to **per-tenant** config service as you mature.

**Repo:** `config.ts`, env loader.

---

**Q91. Internationalization?**  
**A.** Confirm UI language scope—many buyers start English-only.

**Detail:** Node **labels** may hardcode English—i18n is product work.

**Repo:** `ctrl_checks` components.

---

**Q92. White-label?**  
**A.** SPA theming + headless worker—logo, colors, domain.

**Detail:** Legal: **white-label ≠ white-label liability**—contracts still with you.

**Repo:** Frontend theme config.

---

## Section 8 — Competitive & narrative (Q93–Q100)

**Q93. vs traditional RPA?**  
**A.** API-first DAG + registry execution + AI authoring with validation—not brittle UI automation as core.

**Detail:** RPA struggles with **SaaS API drift**; your model prefers **integrations**—honestly note where UI automation might still be needed edge case.

**Repo:** Integration breadth in registry.

---

**Q94. vs n8n / Make / Zapier?**  
**A.** Deeper on-prem + **AI compilation pipeline** + strict orchestrator invariants for large catalogs.

**Detail:** Consumer tools optimize **time-to-first-Zap**; you optimize **governed** automation with **schema discipline**.

**Repo:** ADR, `.cursor/rules` enterprise narrative.

---

**Q95. vs Temporal alone?**  
**A.** Temporal is durable workflow **infrastructure**; you provide **product** (editor, nodes, AI). Composable.

**Detail:** Some teams use **both**: CtrlChecks generates, Temporal executes—integration pattern discussion.

**Repo:** Distributed executor references.

---

**Q96. Vendor lock-in?**  
**A.** JSON workflows + standard APIs—exportability; legal/export terms depend on product packaging.

**Detail:** Offer **portable subset** guarantee if it helps procurement.

**Repo:** Workflow type definitions `ai-types`.

---

**Q97. Who maintains the engine?**  
**A.** Platform team owning TypeScript core—emphasize **architecture ownership** over raw headcount.

**Detail:** Buyers invest in **bus factor**—show succession plan and docs.

**Repo:** `ARCHITECTURE.md`, internal runbooks.

---

**Q98. Why TypeScript?**  
**A.** Ecosystem, hiring, strict typing for graph-heavy code, shared FE/BE language.

**Detail:** Performance hotspots can still be **Rust/Go** sidecars later—honest evolution path.

**Repo:** Monorepo TS config.

---

**Q99. What is the moat?**  
**A.** Registry + orchestrator + deterministic validation + execution + AI guardrails as **one system**.

**Detail:** Thin wrappers get copied; **invariants + operational maturity** compound.

**Repo:** This playbook + ADR + tests.

---

**Q100. Pilot recommendation?**  
**A.** One linear automation + one branching case; measure time-to-first-successful-run and validation failures.

**Detail:** Success criteria written **before** pilot prevents debate afterward.

**Repo:** Demo prompts in `worker/docs/DEMO_PROMPTS.md`.

---

## Section 9 — Extended deep cuts (Q101–Q120)

**Q101. What is the “intent authority” concept?**  
**A.** Environment-driven guards align **user prompt intent** with canonical node chains to prevent “almost right” graphs.

**Detail:** Flags like `ENABLE_INTENT_AUTHORITY_GUARDS` and enforcement modes tighten planner output vs clarified user requirements—useful when AI **overfits** to generic templates.

**Repo:** `ARCHITECTURE.md` §14, `generate-workflow.ts`, lifecycle integration.

---

**Q102. How does credential discovery work after generation?**  
**A.** Registry `credentialSchema` defines requirements; wizard surfaces missing items; attach flows bind OAuth/tokens.

**Detail:** This order—**graph first, creds second**—lets users **see** automation before grinding through OAuth. Security review should ensure **no execution** without required creds.

**Repo:** `credential-discovery-phase`, `credential-resolver`, preflight checks.

---

**Q103. What is `NodeCapabilityRegistryDSL`?**  
**A.** Capability tagging (output, transform, merge, etc.) feeds orchestration and logging.

**Detail:** Capabilities explain **why** the engine classifies `log_output` as terminal-like output—reduces “magic behavior” complaints in support.

**Repo:** Grep `NodeCapabilityRegistryDSL` in worker.

---

**Q104. What is `materializeStructuralFields`?**  
**A.** Pipeline step that fills structural config after init—bridging planner tokens to concrete fields.

**Detail:** Mention when buyers ask how **`switch` cases** become real edges—materialization + reconcile.

**Repo:** `plan-driven-workflow-builder.ts`, structural builders.

---

**Q105. What is `hydrateRequiredConfigFromRegistryDefaults`?**  
**A.** Ensures every node instance has registry-backed defaults merged in—AI doesn’t need to guess every field.

**Detail:** Central to “AI outputs type-only” architecture—hydration is deterministic and testable.

**Repo:** Referenced from `plan-driven-workflow-builder.ts`, registry.

---

**Q106. How does the execution API return errors to clients?**  
**A.** Structured JSON with codes (`ErrorCode.EXECUTION_NOT_READY`), messages, hints, validation arrays.

**Detail:** Good for **programmatic** remediation in the UI—show validation list inline.

**Repo:** `execute-workflow.ts` JSON error responses.

---

**Q107. Are error_trigger nodes special?**  
**A.** Yes—filtered from main execution order in places; separate error path handling in executor.

**Detail:** Explain **dead-letter / alerting** patterns for ops maturity.

**Repo:** `execute-workflow.ts` errorTriggerNodes filter.

---

**Q108. How do you reason about switch case coverage in plans?**  
**A.** Assertions in summarize layer (`assertPlanConsistency`) enforce minimum downstream targets for branching chains.

**Detail:** Logs like “requires at least 3 downstream output targets, found 2” mean the **planner under-modeled** branches—not arbitrary strictness.

**Repo:** `summarize-layer.ts` stack traces in user logs.

---

**Q109. What is `applyStructuralIntentAlignment`?**  
**A.** Post-init alignment pass tying structure to extracted intent—reduces drift between **keywords** and **graph**.

**Detail:** Useful phrase for data scientists on buyer side reviewing pipeline fairness.

**Repo:** `plan-driven-workflow-builder.ts`.

---

**Q110. How does `structure-materializer` / blueprint builder fit?**  
**A.** Parts of staged pipeline from `generate-workflow` assembling **blueprints** before materializing nodes.

**Detail:** Name-drop when asked “how do you avoid monolithic prompts?”—**stages** with contracts between them.

**Repo:** `ARCHITECTURE.md` §6.1 listing (`structural-blueprint-builder`, etc.).

---

**Q111. What is `validateStructuralReadiness`?**  
**A.** Pipeline gate ensuring structure is ready before credentials/exec advertising.

**Detail:** Reduces WIP in wizard—users aren’t asked for Slack tokens on a broken graph.

**Repo:** `generate-workflow.ts` phase references.

---

**Q112. Distributed execution vs synchronous—when to use which?**  
**A.** Sync for quick runs and demos; distributed for durability, retries, and long tasks across workers.

**Detail:** Cost model differs—distributed has **infra overhead** but **better SLO** for heavy workloads.

**Repo:** `distributed-execute-workflow` API, executor services.

---

**Q113. How does the training API surface relate to prod?**  
**A.** `/api/training/*` supports stats/categories—may be internal; lock down in prod.

**Detail:** Buyers ask about **data leakage** from training endpoints—RBAC/mTLS.

**Repo:** `training-stats.ts`, `index.ts` routes.

---

**Q114. Prisma vs Supabase client—why both?**  
**A.** Historical/relational models vs Supabase JS—under current migrations for truth.

**Detail:** Don’t confuse auditors—document **which tables** are Prisma-managed vs raw Supabase.

**Repo:** `worker/prisma/`.

---

**Q115. How do you describe the fix-agent vs auto-repair hierarchy?**  
**A.** Auto-repair = deterministic rules; fix-agent = broader corrective pass—still bounded by validation.

**Detail:** Typical order is **validate → repair → validate again** so no “fixed” graph ships without a second structural pass.

**Repo:** `fix-agent.ts`, `WorkflowAutoRepair`.

---

**Q116. What is `AgenticWorkflowBuilder`?**  
**A.** Higher-level builder invoked from lifecycle for agentic generation flows.

**Detail:** “Agentic” signals **multi-step tool use** internally—clarify **human oversight** expectations.

**Repo:** `workflow-lifecycle-manager.ts` references.

---

**Q117. How should we explain logs like “Semantic match: google_gmail#shipped”?**  
**A.** Planner used **scoped tokens** (branch-specific labels) that normalize to base `google_gmail` in library—**not** separate node types.

**Detail:** Prevents registry explosion while preserving **intent** in planning.

**Repo:** `node-library.ts` semantic match logs.

---

**Q118. How do `requirements-extractor` and analyzers help enterprise?**  
**A.** They structure prompts into **checklists** (trigger, integrations, schedules) before building graphs.

**Detail:** Auditable artifact: “what the system thought the user needed.”

**Repo:** `requirements-extractor`, `workflow-analyzer` paths in `ARCHITECTURE.md`.

---

**Q119. What’s the story on `vm2` long-term?**  
**A.** Plan migration to **isolated worker**, **WASM**, or **disabled** JS nodes for high security tiers.

**Detail:** Buyers respect **honest deprecation plans** more than silence.

**Repo:** Security section above, Node security working group (external process).

---

**Q120. How to close a technical meeting confidently?**  
**A.** Summarize **three pillars**: registry SSOT, orchestrator DAG integrity, validated execution plans—confirm pilot success metrics.

**Detail:** Leave artifacts: architecture one-pager, this playbook excerpt, ADR link, health check output.

**Repo:** `docs/CLIENT_ARCHITECTURE_AND_TECH_STACK.md`.

---

## Appendix A — Glossary (quick)

| Term | Meaning |
|------|---------|
| DAG | Directed acyclic graph—workflow structure without cycles. |
| Registry | `unified-node-registry` definitions for all node types. |
| Orchestrator | `unified-graph-orchestrator` structural graph API. |
| Reconcile | Rebuild/normalize edges to match order and ports. |
| Hydration | Merge AI/plan output with `defaultConfig`/schema. |
| Phased API | Multi-step JSON responses for long-running generation. |
| Execution plan | Object from `buildExecutionPlan` before runtime walk. |
| Terminal | Node with no outgoing `main` successor (often log/output). |
| Branch port | Edge type `true`/`false`/`case_n` for control flow. |

---

## Appendix B — Commands to quote in meetings

```bash
cd worker && npm run test:contracts
cd worker && npm run test:compiler
cd worker && npm run validate:registry-gates
curl -s http://localhost:3001/health
```

---

## Appendix C — Closing checklist (unchanged essentials)

1. Live demo: health → generate linear workflow → `node-definitions` → execute once.  
2. Honest limits: smart-planner in-memory sessions; `vm2` threat model; structural LLM flags.  
3. Security one-pager: CORS, secrets, Supabase roles, AI editor audit.  
4. Cold recall: orchestrator, registry, validation, execution plan—in one minute each.

---

*Expanded playbook: 100 core Qs + 20 deep cuts + appendices. Adapt every answer to your **real** deployment region, compliance status, and which optional subsystems (Temporal, Redis, Ollama) are **on**.*
