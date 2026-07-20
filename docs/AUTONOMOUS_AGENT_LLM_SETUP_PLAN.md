# Autonomous Agent LLM Setup Plan (Local + Cloud + Cluster)

## Who This Is For
- You want a **24/7 autonomous coding + PC-control agent**.
- You need a clear implementation plan to share with your mentor.
- You want to understand **which model should do which task**.

---

## 1) Target Outcome

Build an agent system that can:
- Read and edit repositories
- Run terminal commands, tests, and retries
- Control browser workflows
- Keep working continuously with low manual input
- Escalate hard reasoning tasks to stronger models

**Recommended architecture:** Hybrid (Local execution + Cloud reasoning, with optional cluster growth).

---

## 2) Simple Decision: Local vs Cloud vs Cluster

### Local LLM (on your machine)
- **Best for:** fast repetitive execution, privacy, low cost
- **Weakness:** weaker deep reasoning
- **Use for:** file edits, lint fixes, tests, scripting, browser actions

### Cloud LLM (API)
- **Best for:** hard debugging, architecture, planning, code review
- **Weakness:** cost + latency + privacy trade-off
- **Use for:** complex decisions and final quality gate

### Cluster LLM (your own GPU server)
- **Best for:** scaling many agents with better privacy
- **Weakness:** setup and maintenance complexity
- **Use for:** team-scale automation or enterprise volume

---

## 3) Final Architecture (Recommended)

### Core Pattern
1. **Execution Layer (Local model):** performs most actions.
2. **Reasoning Layer (Cloud model):** handles difficult tasks.
3. **Policy Router:** decides which model gets each task.
4. **Tool Layer:** terminal, git, docker, browser, filesystem.
5. **Supervisor Loop:** retries, health checks, fallback logic.
6. **Memory/Logs:** store tasks, errors, outcomes, and traces.

### Why this works
- Keeps cost lower than full cloud
- Keeps speed higher than full cloud
- Keeps quality higher than full local
- Maintains privacy for most actions

---

## 4) Task Differentiation (Most Important Part)

Use this table as your routing policy.

| Task Type | Example | Default Model | Escalate When |
|---|---|---|---|
| Repo scanning | find files, summarize modules | Local | > 50 files or unclear architecture |
| Mechanical edits | rename, formatting, small patches | Local | patch fails 2+ times |
| Lint/test fix | fix compile/test failures | Local | stuck after 3 retries |
| Browser automation | login flow, UI clicks, scraping | Local | dynamic flow breaks repeatedly |
| Shell automation | docker, npm, git chores | Local | command side effects are risky |
| Bug root cause | non-obvious multi-file bug | Cloud | immediately if impact is high |
| Architecture design | refactor strategy, system changes | Cloud | always |
| Final PR review | risk scan, regression check | Cloud | always before merge |
| Security-sensitive review | auth/data/permissions changes | Cloud | always + manual approval |

### Rule of thumb
- If task is **repeatable + tool-heavy** -> Local
- If task is **ambiguous + high-impact reasoning** -> Cloud
- If local failed repeatedly -> Cloud fallback

---

## 5) Model Recommendations by Stage

## Stage A (MVP, cheapest)
- **Local:** Qwen2.5-Coder 14B/32B or DeepSeek Coder class model (via Ollama/vLLM)
- **Cloud (small usage):** one strong model for escalation only
- **Use case:** single developer, continuous coding assistant

## Stage B (Best practical hybrid)
- **Local:** coding model for execution loops
- **Cloud:** top reasoning model for planning/review/debug
- **Use case:** daily autonomous coding with controlled cost

## Stage C (Enterprise scale)
- **Cluster:** 32B/70B class local serving (vLLM + GPU server)
- **Cloud:** fallback + specialty reasoning
- **Use case:** multi-agent, multiple repos, internal platform

---

## 6) Reference Tech Stack

### Orchestration
- LangGraph (stateful workflows, retry graph)
- or AutoGen/CrewAI (multi-agent style)

### Model Serving
- Ollama (fast local start)
- vLLM (better throughput/scaling)
- Optional: dedicated GPU host for cluster path

### Tooling
- Playwright (browser control)
- Docker (isolated execution)
- Git + CI hooks
- Optional: task queue (Redis + worker)

### Observability
- Structured logs (JSON)
- Traces per task run
- Metrics: success rate, retry rate, cost per completed task

---

## 7) Implementation Plan (10-Day Intensive Delivery)

**Goal:** ship a real hybrid autonomous agent in 10 days (single repo, production-style discipline, no enterprise extras).

### Scope Lock (Must Keep to Finish in 10 Days)
- In scope: local model execution, cloud escalation, terminal/git/browser tools, retries, logging, safety controls
- Out of scope: cluster deployment, multi-repo scheduler, multi-agent role splitting, advanced dashboards
- Rule: if a task is not required for first working version, move it to backlog

### Day-by-Day Plan

#### Day 1 - Foundation Setup
- Install local runtime (`Ollama` or `vLLM`) and pull selected local coding model
- Configure one cloud model API for escalation
- Create project skeleton: router, tool adapters, supervisor loop, logging module
- Define environment variables and secrets handling

#### Day 2 - Local Executor + Terminal/Git Tools
- Implement local-first execution path
- Add terminal tool wrapper with command allowlist
- Add git workflow wrapper (branch-per-task, status checks)
- Run first end-to-end task: read file -> patch -> run test

#### Day 3 - Browser + Filesystem Tools
- Integrate `Playwright` for deterministic browser actions
- Add filesystem read/write adapters with path restrictions
- Add tool timeouts and per-tool error normalization
- Validate browser automation on one real flow (login/search/form)

#### Day 4 - Router and Task Classification
- Implement task classifier using your matrix (local vs cloud)
- Add escalation triggers (retry count, impact level, change size)
- Add confidence scoring for local outputs
- Verify routing decisions with 20 sample tasks

#### Day 5 - Retry, Recovery, and Fallback
- Build retry controller with exponential backoff
- Add automatic cloud fallback after threshold failures
- Add circuit breaker for repeated tool/model failures
- Add resume/restart state for interrupted runs

#### Day 6 - Safety and Governance
- Enforce destructive command blocking
- Add protected file rules (`.env`, secrets, credentials)
- Add manual approval gates for high-risk actions
- Add audit log entries for every sensitive operation

#### Day 7 - Quality Gate and Review Layer
- Add cloud review step for architecture/high-risk fixes
- Add diff-risk scoring (files touched, critical directories)
- Add test-before-complete requirement
- Add final "task completed" contract checks

#### Day 8 - Observability and Metrics
- Add structured run logs (task_id, model, tools, retries, duration, outcome)
- Track KPIs: completion rate, retries, avg duration, cloud-call count
- Generate daily report output for mentor review
- Identify top 5 failure patterns from logs

#### Day 9 - Hardening Day (Bug Bash)
- Run 30-50 realistic tasks back-to-back
- Fix crash loops, timeout edge cases, and router misclassification
- Tune escalation thresholds for cost vs quality balance
- Freeze MVP feature set

#### Day 10 - Demo and Hand-off
- Run unattended soak test (8-12 hours)
- Prepare demo script: repo scan -> code edit -> test -> browser flow -> retry/fallback
- Present results, metrics, known limitations, and backlog
- Finalize mentor-ready documentation and next-step roadmap

### 10-Day Success Criteria
- 75%+ successful completion on target repetitive tasks
- Unattended runtime >= 8 hours
- Zero destructive command incidents
- Cloud escalation works reliably on hard tasks
- Demonstrable end-to-end autonomous execution flow

---

## 8) Control Policies (Required for Safety)

### Command Safety
- Block destructive commands by default (`rm -rf`, force reset, etc.)
- Require approval for production credentials or deploy actions

### File Safety
- Restrict writable directories
- Protect secrets and `.env` files from accidental logging

### Git Safety
- Branch-per-task
- Mandatory tests before merge
- Cloud review for high-risk changes

### Runtime Safety
- Timeout each tool action
- Circuit breaker after repeated failures
- Store full run trace for auditability

---

## 9) Cost and Performance Policy

### Token Budget Rules
- Local-first for all routine operations
- Cloud only for difficult reasoning or final review
- Cache repeated context summaries

### Example Escalation Thresholds
- Local attempts >= 3 and still failing
- Estimated impact high (auth/payments/data layer)
- Cross-cutting change touches many modules

---

## 10) Example Task Routing Policy (Pseudo-Config)

```yaml
router:
  default_model: local_coder
  escalation:
    - condition: "task.type in ['architecture','root_cause','security_review']"
      use: cloud_reasoner
    - condition: "local.retry_count >= 3"
      use: cloud_reasoner
    - condition: "changed_files > 25"
      use: cloud_reasoner
  review:
    - condition: "risk_level in ['high','critical']"
      reviewer: cloud_reasoner
```

---

## 11) Suggested Starter Model Setup

### If you have a single strong consumer GPU
- Primary local executor: coding model in 14B-32B class
- Cloud model: one premium model for escalation/review
- Concurrency: start with 1-2 parallel tasks max

### If you have CPU-only or weak GPU
- Smaller local model for tool routing + simple edits
- Use cloud more frequently for code generation/debugging

### If you have multi-GPU server
- Serve larger local model with vLLM
- Add separate local reviewer model
- Keep cloud only as backup

---

## 12) What To Show Your Mentor (Checklist)

- [ ] Hybrid architecture diagram accepted
- [ ] Task routing matrix approved
- [ ] Safety policy documented
- [ ] 10-day intensive plan approved
- [ ] MVP metrics defined (success rate, retries, cost, uptime)
- [ ] Escalation rules implemented and tested

---

## 13) Execution Priorities for 10 Days

1. **Must-have (ship this):** local executor, cloud fallback, task router, terminal/git/browser tools, retries, safety guards, logs.
2. **Should-have (if time permits):** confidence scoring, richer review heuristics, better failure memory.
3. **Backlog (after day 10):** cluster hosting, multi-repo queueing, multi-agent specialization, enterprise dashboards.

---

## 14) Final Recommendation

For your exact requirement, implement this order:
- **Now (Day 1-10):** deliver hybrid on single machine with strict scope lock.
- **Next (Post day 10):** improve quality with stronger review + better memory.
- **Later:** move to GPU server/cluster only when task volume justifies it.

This gives you a realistic way to finish a working autonomous system in 10 days without overbuilding.
