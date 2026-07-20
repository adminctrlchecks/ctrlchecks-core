# 🔬 CtrlChecks — Complete Project Dissection Guide

> **Audience:** A Python full-stack developer learning this JavaScript/TypeScript project from scratch.
> **Goal:** Understand every technology in this repo — what it is, how it works, why it was chosen, its limitations, and the fixes.
> **Method:** Every JS-world concept is translated into its Python-world equivalent.

---

## Table of Contents

1. [What Did You Actually Build?](#1-what-did-you-actually-build)
2. [The Big Picture — Two Apps in One Repo](#2-the-big-picture--two-apps-in-one-repo)
3. [The Language: TypeScript](#3-the-language-typescript)
4. [The Frontend (`ctrl_checks/`)](#4-the-frontend-ctrl_checks)
5. [The Backend (`worker/`)](#5-the-backend-worker)
6. [The Heart of the System — Unified Node Registry](#6-the-heart-of-the-system--unified-node-registry)
7. [End-to-End: The Life of One Workflow](#7-end-to-end-the-life-of-one-workflow)
8. [Honest Limitations & Solutions (Postmortem Findings)](#8-honest-limitations--solutions-postmortem-findings)
9. [Learning Curriculum (Lesson Plan)](#9-learning-curriculum-lesson-plan)

---

## 1. What Did You Actually Build?

**CtrlChecks** is an **AI workflow automation platform** — the same product category as **Zapier** or **n8n**.

In plain words:

> A user types *"Every morning, read my Gmail, summarize new emails with AI, and post the summary to Slack"* — and the app **generates** that automation as a visual flowchart, lets the user connect their accounts, and then **runs** it automatically.

Everything in this repository exists to serve **three jobs**:

| Job | Meaning |
|---|---|
| **Generate** | Use AI (Gemini) to turn a plain-English prompt into a workflow |
| **Display / Edit** | Show the workflow as a visual, draggable flowchart the user can modify |
| **Execute** | Run each step in order, passing data from one node to the next |

---

## 2. The Big Picture — Two Apps in One Repo

This is a **monorepo** — one git repository containing multiple separate programs. The two that matter:

```
ctrlchecks-ai-workflow-os/
├── ctrl_checks/   ← FRONTEND: what the user sees (runs in the browser, port 5173)
└── worker/        ← BACKEND: the brain (AI engine + execution, runs on a server, port 3001)
```

### 🍽️ Restaurant Analogy

- **`ctrl_checks/`** is the **dining room and menu** — pretty, interactive, where customers sit.
- **`worker/`** is the **kitchen** — where food (workflows) is actually cooked (generated and executed).
- They talk over **HTTP** (the waiter), at `http://localhost:3001` (configured via `VITE_API_URL`).

In Python terms, this is like having a **React app + a Flask/FastAPI app** — except the backend here is **Node.js**, which is simply *JavaScript running outside the browser*. Same language on both sides; that's the main reason teams choose Node for web backends.

### Other Root Folders

| Folder | Purpose |
|---|---|
| `docs/`, `Guide/` | Documentation |
| `infrastructure/`, `infra/` | Deployment / cloud configs |
| `scripts/` | Utility scripts |
| `services/`, `testing/`, `training/` | Experiments, test harnesses, LLM fine-tuning leftovers |
| `.github/workflows/` | CI/CD pipelines (GitHub Actions) |
| ~100 `.md` files at root | AI-generated work logs / reports — **clutter, not code** (see limitations) |

---

## 3. The Language: TypeScript

Both apps are written in **TypeScript (TS)**, not plain JavaScript.

- **JavaScript** = Python with **no type hints**: `def f(x):` — anything goes.
- **TypeScript** = Python where type hints (`def f(x: int) -> str:`) are **enforced before the program runs**. A compiler (`tsc`) checks every type and refuses to build if something's wrong.

**Why it was chosen:** This project has 5000+ files and was built with AI tools. Types are the safety net that catches AI mistakes (*"you passed a `string` where a `WorkflowNode` was expected"*) **before** runtime. This is why `CLAUDE.md` mandates running `npm run type-check` before committing.

### 🐍 Python ↔ JS Translation Table (memorize this)

| Python world | JS world in this project |
|---|---|
| `pip` / `requirements.txt` | `npm` / `package.json` |
| `venv` | `node_modules/` folder |
| `pytest` | **Jest** (backend), **Vitest** (frontend) |
| Flask / FastAPI | **Express** |
| SQLAlchemy / Alembic | **Prisma** + raw `pg` driver |
| `uvicorn --reload` | **nodemon** |
| Pydantic | **Zod** |
| Celery worker | `executionQueueWorker.js` |
| `logging` module | **winston** |
| `psycopg2` | **pg** (`pg.Pool`) |

---

## 4. The Frontend (`ctrl_checks/`)

Every major piece, why it exists, and what to watch out for.

### 4.1 React 18 — the UI framework

The browser builds the page from **components** (small reusable functions that return UI), instead of the server rendering HTML like Flask/Jinja.

- **Why chosen:** The de-facto industry standard; AI tools generate React code best.
- **Limitation:** Everything runs client-side, so SEO and first-load speed are weaker than server-rendered apps — irrelevant for an app behind a login.

### 4.2 Vite — dev server + bundler

Like `uvicorn --reload` **plus** a build step that squashes thousands of TS files into a few optimized JS files for production. Starts in milliseconds — this is why `npm run dev` feels instant.

### 4.3 Tailwind CSS + Radix UI (shadcn/ui) — styling

- **Tailwind:** write styles as class names (`className="p-4 text-red-500"`) instead of separate CSS files.
- **Radix UI** (`@radix-ui/react-*` packages): unstyled but **accessible** building blocks — dialogs, dropdowns, tooltips, tabs, etc.
- **shadcn/ui:** wraps Radix components with Tailwind styling.
- **Origin clue:** the package name `vite_react_shadcn_ts` and the `lovable-tagger` devDependency reveal this project started from a **Lovable** template.
- **Why:** fast, consistent, AI generates it well.

### 4.4 Zustand — global state (`src/stores/`)

Think: *"a global dict that the UI automatically re-renders from when it changes."*

- Main store: `workflowStore.ts` — holds the current workflow being edited.
- **Why over Redux:** ~10× less boilerplate.

### 4.5 TanStack Query — server data fetching

Fetching with caching, retries, and loading states handled for you. Like `requests.get()` but it remembers answers and refreshes them intelligently. API helpers live in `ctrl_checks/src/lib/api/`.

### 4.6 @xyflow/react — the visual workflow canvas ⭐

**The library drawing the draggable boxes (nodes) and arrows (edges)** in `WorkflowCanvas.tsx`. The same concept n8n's editor is built on. Without it you'd write thousands of lines of drag-and-drop math yourself.

### 4.7 react-router-dom — page navigation

Routes like `/connections`, `/auth/google` without page reloads. Like Flask's `@app.route`, but running in the browser.

### 4.8 react-hook-form + Zod — forms + validation

Zod is **Pydantic for TypeScript**: define a schema, validate data against it. react-hook-form manages form state efficiently.

### 4.9 aws-amplify — authentication client

Talks to **AWS Cognito** for login/signup. Cognito is AWS's hosted user database (like Auth0 / Firebase Auth). After login, the frontend holds a **JWT token** and sends it with every API call. The auth client lives at `ctrl_checks/src/integrations/aws/client.ts` (exports `awsClient`).

### 4.10 Supporting cast

| Package | Role |
|---|---|
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `recharts` | Charts |
| `sonner` / `sweetalert2` | Toasts / popups |
| `@sentry/react` | Error reporting to a dashboard |
| `pdfjs-dist` / `mammoth` | Reading PDFs / Word files in the browser |
| `three` | 3D graphics (likely a landing-page effect) |
| `@dnd-kit/*` | Drag-and-drop utilities |
| `embla-carousel-react` | Carousels |
| `date-fns` | Date utilities |

### 4.11 Frontend folder map (`ctrl_checks/src/`)

```
components/    ← UI components (workflow/, connections/, etc.)
pages/         ← One file per route (ConnectionsPage.tsx, auth/<provider>/ callbacks)
stores/        ← Zustand state (workflowStore.ts)
lib/           ← Business logic helpers (api/, wizard-*.ts)
hooks/         ← Reusable React hooks
integrations/  ← aws/client.ts (Cognito + DB proxy)
contexts/      ← React context providers
services/      ← Misc client services
types/         ← Shared TypeScript types
__tests__/     ← Vitest tests
```

### 4.12 ⚠️ Biggest frontend limitation

`AutonomousAgentWizard.tsx` is **8000+ lines** — one giant component running the entire generate → capability-selection → credentials → configure → build flow. Classic AI-built-codebase smell: hard to read, easy to break.

**Solution:** keep extracting logic into the `wizard-*.ts` helper files (`wizard-field-utils.ts`, `wizard-credential-view.ts`, `wizard-config-snapshot.ts` — already started), and eventually split into one component per wizard step.

---

## 5. The Backend (`worker/`)

### 5.1 Express — the web framework

Literally **Flask for Node**: `app.post('/api/generate-workflow', handler)`. Routes live in `worker/src/api/` and `worker/src/index.ts`.

### 5.2 pg + Prisma → AWS RDS PostgreSQL — the database

- `pg.Pool` = the raw driver (like `psycopg2`).
- **Prisma** = manages **migrations** (like Alembic). Migrations live in `worker/prisma/migrations/`.
- Data lives on **AWS RDS** (managed Postgres in the cloud).
- Canonical DB access: `getDbClient()` from `db-client.ts` → `worker/src/core/database/aws-db-client.ts`.
- **Local quirk:** the ISP blocks port 5432, so local dev connects through an **SSH tunnel via an EC2 machine** (`ssh-tunnel-loop.bat`, `.env` uses `localhost:5433`).

### 5.3 Redis (ioredis) — in-memory store

Used for **caching, rate-limiting, queues, and bridging WebSocket messages between processes** (ws-redis-bridge). Same Redis you'd pair with Celery.

### 5.4 AWS Cognito (aws-jwt-verify) — the bouncer

Every request's JWT token is **cryptographically verified** before any handler runs (middleware in `worker/src/middleware/`).

- **Why Cognito:** you never store passwords yourself.
- **Limitation:** AWS lock-in and a famously clunky API.

### 5.5 Google Gemini — the AI engine ⭐

All workflow-generation intelligence flows through **`gemini-orchestrator.ts`** — a single facade file so the rest of the code never talks to Gemini directly. A **`gemini-key-pool`** rotates multiple API keys to dodge rate limits.

- **Limitation:** single-LLM dependency — a Gemini outage or quota issue kills generation.
- **Solution:** the facade pattern makes adding a fallback provider (the `openai` package is already installed) a one-file change.

### 5.6 ws (WebSockets) — real-time pipes

- `GET /ws/chat` — chat-triggered workflows.
- `GET /ws/executions` — live execution status streaming, so users watch nodes light up as they run.

### 5.7 Background workers

| Worker | Role |
|---|---|
| `executionQueueWorker.js` | Runs workflows from a queue (the Celery equivalent) |
| `kafkaRequestConsumer.js` | Kafka consumer for high-volume request intake |
| `node-cron` | Scheduled (time-based) workflow triggers |

### 5.8 The Integration Zoo — why the dependency list is huge

**Each package = one or more workflow node types** users can drag into automations. **57 credential types** are supported across OAuth and API-key providers.

| Package | Service it powers |
|---|---|
| `googleapis` | Gmail / Sheets / Drive |
| `@octokit/rest` | GitHub |
| `@notionhq/client` | Notion |
| `twitter-api-v2` | Twitter/X |
| `airtable` | Airtable |
| `nodemailer` + `@aws-sdk/client-ses` | Email (SMTP + AWS SES) |
| `mongodb`, `mysql2`, `mssql`, `snowflake-sdk` | Other databases as workflow nodes |
| `ssh2-sftp-client`, `basic-ftp` | File transfer |
| `cheerio` | Web scraping |
| `sharp` | Image processing |
| `pdf-parse` | PDF reading |
| `razorpay` | Payments |
| `firebase-admin` | Push notifications |
| `amqplib` | RabbitMQ messaging |

### 5.9 Observability

- **winston** — structured logging (Python's `logging` equivalent).
- **@sentry/node** — backend error tracking.
- **prom-client** — exposes Prometheus metrics for monitoring.

### 5.10 Backend folder map (`worker/src/`)

```
api/            ← Express route handlers (execute-workflow.ts, etc.)
core/           ← The engine room:
  registry/       ← unified-node-registry.ts ⭐ (single source of truth)
  orchestration/  ← unified-graph-orchestrator.ts (all graph mutations)
  execution/      ← dynamic-node-executor.ts (runtime engine)
  credentials/    ← credential-vault.ts, credential-resolver.ts
  database/       ← aws-db-client.ts
services/       ← ai/ (generation pipeline, stages/, gemini-orchestrator.ts)
nodes/          ← Node executor implementations
middleware/     ← Auth (JWT verify), request IDs, rate limiting
workers/        ← Queue/Kafka background workers
credentials*/   ← Credential system
validation/, validator/ ← Workflow validation
types/, shared/, utils/ ← Support code
```

---

## 6. The Heart of the System — Unified Node Registry ❤️

> **If you remember ONE thing: `worker/src/core/registry/unified-node-registry.ts` is the single source of truth.**

Every node type (Gmail, Slack, If/Else, HTTP Request, …) is defined **once** there, with five things:

1. **`inputSchema`** — what data/config it accepts
2. **`outputSchema`** — what it produces
3. **`credentialSchema`** — which login/API key it needs
4. **`defaultConfig`** — starting values
5. **`execute()`** — the actual code that runs

Everything else — the AI generator, the validator, the execution engine, the credential scanner — **asks the registry** (`unifiedNodeRegistry.get(nodeType)`) instead of hard-coding node knowledge.

### The Cardinal Rules

**Never:**
- Write `if (node.type === '...')` or `switch (node.type)` anywhere outside the registry
- Define node output fields or credential requirements inside workflow JSON or `workflow-builder.ts`
- Add node-specific logic to the execution engine

**Always:**
- Fix node behavior at the registry level so it applies to all workflows automatically
- Look up node definitions via the registry at runtime
- Add new nodes by registering them in the registry

**Why this design:** with 100+ node types, scattering per-node logic across 20 files means every new node breaks something. Centralizing means adding a node = editing ~2 files.

### Known limitation

The frontend has its **own** catalog (`ctrl_checks/src/components/workflow/nodeTypes.ts` for labels/icons/config fields, plus `nodeUsageGuides.ts` and `nodeLaymanDescriptions.ts`) that must be manually kept in sync — contract tests found **23 gaps** between the two catalogs.

**Solution direction:** generate the frontend catalog from the backend's exported schemas (`npm run export:schemas` already exists for this).

### Adding a New Node (checklist)

1. Register in `unified-node-registry.ts` with full schemas + `execute()`
2. Add the executor in `worker/src/nodes/` (or inline for simple nodes)
3. Add frontend metadata to `nodeTypes.ts`
4. Add a plain-English description to `nodeLaymanDescriptions.ts`
5. If OAuth is needed: add provider routes in `worker/src/index.ts` + a callback page under `ctrl_checks/src/pages/auth/`

(Full checklists: `NODE_ADDITION_CHECKLIST.md`, `ADDING_NEW_NODES_GUIDE.md`)

---

## 7. End-to-End: The Life of One Workflow

### Phase A — Generation (`POST /api/generate-workflow`)

```
User prompt
  → 1. Intent analysis (Gemini figures out WHAT the user wants)
  → 2. Capability grouper → CapabilityContainer[] ("send email", "summarize text")
  → 3. User selects nodes in the wizard (Gmail vs Outlook, etc.)
  → 4. Structural prompt generation
  → 5. WorkflowLifecycleManager → WorkflowGenerationPipeline (stages in services/ai/stages/)
  → 6. UnifiedGraphOrchestrator validates the DAG
  → 7. Workflow JSON (nodes + edges) → drawn on the xyflow canvas
```

**DAG rules enforced at step 6:**
- Default topology is strictly **linear**: `Trigger → Action → … → Terminal`
- Branching only when the user explicitly asks for conditions/multi-path logic
- No orphan nodes, no cycles, no duplicate edges, no uncontrolled fan-out
- The orchestrator is the **only** code allowed to add/remove nodes and edges

### Phase B — Credentials

1. `comprehensive-credential-scanner.ts` reads the generated workflow and determines which services need connecting.
2. The wizard prompts the user to connect each one.
3. Secrets go into the **credential vault** (`credential-vault.ts`), keyed by `userId + provider` — **never** into the workflow JSON.
4. OAuth providers each have a route pair: `/api/oauth/<provider>/authorize` + `/callback`, with matching callback pages under `ctrl_checks/src/pages/auth/<provider>/`.
5. Users manage everything on the `/connections` page (`ConnectionsPage.tsx`, components in `ctrl_checks/src/components/connections/` — `ServicePickerGrid`, `NewConnectionModal`, `OAuthConnectButton`, `CredentialFormRenderer`).

### Phase C — Execution (`POST /api/execute-workflow` → `worker/src/api/execute-workflow.ts`)

1. **Topological sort** — order nodes so dependencies run first (classic DAG algorithm).
2. For each node in order:
   `unifiedNodeRegistry.get(node.type)` → validate inputs → **inject credentials** (`credential-resolver.ts`) → call `nodeDef.execute(context)`.
3. Outputs flow downstream via **template resolution** — `{{$json.field}}` lets node 2 reference node 1's output.
4. **Branching** (if_else, switch) evaluates the condition and activates only the matching downstream path.
5. Status streams live to the browser over `/ws/executions`.

---

## 8. Honest Limitations & Solutions (Postmortem Findings)

| # | Finding | Why It Matters | Fix |
|---|---|---|---|
| 1 | `AutonomousAgentWizard.tsx` is 8000+ lines | Unmaintainable, risky to edit | Keep splitting into `wizard-*.ts` helpers / per-step components |
| 2 | Worker needs **8GB heap** to compile (`--max-old-space-size=8192`) | The TS codebase is enormous (the registry file is massive) | Split registry into per-category modules that register themselves |
| 3 | Two node catalogs (frontend `nodeTypes.ts` vs backend registry) drift | UI can show nodes the engine can't run (23 documented gaps) | Generate frontend metadata from exported backend schemas |
| 4 | Single LLM (Gemini) dependency | Outage or quota issue = no generation | Add fallback provider behind the existing `gemini-orchestrator.ts` facade |
| 5 | ~100 AI-generated `.md` reports + `.log` files at repo root | Noise; hides real docs | Move to `docs/archive/`, gitignore `*.log` |
| 6 | Secrets in local `.env` files | Leak risk | Use AWS Secrets Manager in production |
| 7 | `aws-sdk` v2 **and** `@aws-sdk/*` v3 both installed | v2 is deprecated, doubles bundle size | Migrate remaining v2 usage to v3 |
| 8 | Full test suite exhausts laptop RAM | Dev machine constraint | Run one test file at a time (`npx jest path/to/file.test.ts`) |
| 9 | Frontend SPA = no SEO / slower first load | Inherent to client-side React | Acceptable — the app sits behind a login |
| 10 | AWS lock-in (Cognito, RDS, SES) | Migration cost if leaving AWS | Acceptable trade-off for managed auth/DB; abstractions (`db-client.ts`, `awsClient`) soften it |

---

## 9. Learning Curriculum (Lesson Plan)

Dissection schedule — one organ at a time:

| Lesson | Topic | Key Files |
|---|---|---|
| **1** ✅ | The Autopsy Overview (this document) | — |
| **2** | Node.js + TypeScript fundamentals for a Python dev; how `worker/` boots, `index.ts` line by line | `worker/src/index.ts` |
| **3** | The unified node registry — read one real node's full definition | `worker/src/core/registry/unified-node-registry.ts` |
| **4** | The AI generation pipeline, stage by stage, tracing a real prompt | `worker/src/services/ai/stages/`, `workflow-lifecycle-manager.ts` |
| **5** | The execution engine — topological sort, template resolution, branching | `worker/src/core/execution/dynamic-node-executor.ts`, `worker/src/api/execute-workflow.ts` |
| **6** | React + the wizard — how the frontend is wired | `AutonomousAgentWizard.tsx`, `workflowStore.ts`, `WorkflowCanvas.tsx` |
| **7** | Auth, credentials, and OAuth flows end-to-end | `credential-vault.ts`, `credential-resolver.ts`, OAuth routes |
| **8** | Database schema, Redis, queues, and AWS infrastructure | `worker/prisma/`, `aws-db-client.ts`, `workers/` |
| **9** | Testing + CI/CD | `.github/workflows/`, Jest/Vitest configs |

---

## Quick Reference — Daily Commands

### Frontend (`ctrl_checks/`)
```bash
npm run dev          # Vite dev server on :5173
npm run build        # Production build
npm run lint         # ESLint
npx vitest run src/path/to/file.test.ts  # ONE test file (RAM-safe)
```

### Worker (`worker/`)
```bash
npm run dev          # nodemon + ts-node (type-checks first; 8GB heap)
npm run type-check   # tsc --noEmit — RUN BEFORE COMMITTING
npx jest src/path/to/file.test.ts        # ONE test file (RAM-safe)
npm run prisma:migrate    # Run DB migrations (dev)
npm run export:schemas    # Regenerate node schema JSON files
```

> ⚠️ **Never run the full test suite at once** — it exhausts laptop RAM. Always run one test file at a time.
