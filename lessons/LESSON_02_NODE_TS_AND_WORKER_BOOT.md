# 📖 Lesson 2 — Node.js + TypeScript Fundamentals & How `worker/` Boots

> Companion to `PROJECT_DISSECTION_GUIDE.md`. Everything below was verified against the real files on 2026-06-12:
> `worker/src/index.ts` (2033 lines), `worker/package.json`, `worker/nodemon.json`, `worker/tsconfig.json`, `worker/scripts/startup-validation.js`.

---

## Part 1 — Node.js for a Python Developer

### 1.1 What Node.js actually is

Node.js = **Chrome's V8 JavaScript engine + a standard library** (file system, networking, processes) so JavaScript can run on a server instead of a browser. That's it. `node file.js` is the same idea as `python file.py`.

### 1.2 The event loop — Node is "asyncio by default"

This is the single biggest mental shift from Python:

- In Python, code is **synchronous by default**; you opt into async with `asyncio`.
- In Node, the runtime **is** the event loop. There is no `asyncio.run()` — the loop is always on. Every I/O operation (DB query, HTTP call, file read) is non-blocking by default.

| Python asyncio | Node.js |
|---|---|
| `async def f():` | `async function f() {}` |
| `await something` | `await something` |
| coroutine / `Future` | `Promise` |
| `asyncio.gather(a, b)` | `Promise.all([a, b])` |
| `asyncio.wait_for(x, timeout=4)` | `Promise.race([x, timeoutPromise])` ← used in `/health/ready`! |
| `loop.run_in_executor` (CPU work) | `worker_threads` |

**Key consequence:** one Node process handles thousands of simultaneous requests on a single thread, because it never sits idle waiting for I/O. The trap: CPU-heavy code blocks *everyone* (that's why this project moved sandboxed code execution to `worker_threads`).

### 1.3 Modules and the singleton trick (critical for this project!)

In Python, importing a module **runs it once** and caches it — `import config` twice gives you the same object. **Node works exactly the same way.** This project leans on that heavily:

```ts
import { unifiedNodeRegistry } from './core/registry/unified-node-registry';
```

That import **runs the registry file once**, which builds the registry as a side effect, and every other file that imports it gets the same instance. This is how all the "singleton" registries initialize without anyone calling `init()`.

### 1.4 CommonJS vs ESM (the two import systems)

- **CommonJS (old):** `const x = require('./x')` — what Node used for 15 years.
- **ESM (new):** `import x from './x'` — the modern standard.

This project writes modern `import` syntax in TypeScript, but `tsconfig.json` says `"module": "commonjs"` — so the compiler **translates** every `import` into `require()` when building. Best of both worlds.

**Subtle but important:** `import` statements are **hoisted** — no matter where they appear in a file, they all execute when the module first loads, in declaration order, *before* any other code. You'll see `import` statements in the *middle* of `index.ts` (lines 750, 1031, 1231, 1447, 1452...). They look like they run at that point — **they don't**. They all ran at the top. Their position is purely cosmetic.

### 1.5 The `process` object = Python's `os` + `sys` + `signal`

| Python | Node |
|---|---|
| `os.environ['X']` | `process.env.X` |
| `sys.exit(1)` | `process.exit(1)` |
| `signal.signal(...)` / `sys.excepthook` | `process.on('uncaughtException', ...)` |

---

## Part 2 — The Boot Chain: what happens when you type `npm run dev`

From `worker/package.json`:

```json
"dev": "node --max-old-space-size=8192 scripts/startup-validation.js && nodemon --watch src --exec \"node --max-old-space-size=8192 -r ts-node/register src/index.ts\"",
"predev": "npm run type-check"
```

The full chain, in order:

```
npm run dev
 │
 ├─ STEP 0  "predev" hook (npm runs pre<name> scripts automatically — like a Makefile dependency)
 │           → tsc --noEmit  = type-check ALL files, emit nothing. Fails fast on type errors.
 │           → --max-old-space-size=8192 = give Node an 8GB heap (the codebase is huge)
 │
 ├─ STEP 1  scripts/startup-validation.js  (plain JS preflight check)
 │           → loads the NodeSchemaRegistry (from source via ts-node in dev)
 │           → verifies critical nodes exist: manual_trigger, schedule, slack_message, email
 │           → verifies the schedule node has a required "cron" field
 │           → exports public/node-library.json for the frontend
 │           → DEV: warns and continues on failure. PROD: process.exit(1).
 │
 └─ STEP 2  nodemon  (the auto-restarter — Node's `--reload`)
             config in nodemon.json: watch src/, extensions ts+json, ignore *.test.ts
             → executes: ts-node src/index.ts
                          └─ ts-node = compile TypeScript IN MEMORY and run it
                             (no dist/ folder needed during dev; production
                              runs `npm run build` → tsc → node dist/index.js)
```

### tsconfig.json highlights worth knowing

| Setting | Meaning |
|---|---|
| `"target": "ES2022"` | Emit modern JS (Node 18+ understands it natively) |
| `"module": "commonjs"` | Translate `import` → `require()` |
| `"strict": true` | Maximum type safety (the whole point of TS here) |
| `"paths": { "@supabase/supabase-js": ["./src/core/database/db-shim"] }` | **A migration trick!** Any leftover file still importing the old Supabase client silently gets the AWS shim instead. This is how the Supabase→AWS migration avoided touching hundreds of files. |
| `"sourceMap": true` | Stack traces point at your `.ts` lines, not compiled `.js` |

---

## Part 3 — `index.ts` Dissected, Region by Region (2033 lines)

### Region 1: Lines 1–24 — The sacred import order 🚨

```ts
import './core/env-loader';        // line 14 — MUST BE FIRST
import { assertEnv } from './core/config/env-validator';
assertEnv();                       // fail-fast: missing env vars → exit(1) with a list
import { initSentry } from './core/sentry';
initSentry();                      // error tracking; no-op without SENTRY_DSN
```

Why does order matter? **Imports execute top-to-bottom, and modules read `process.env` at import time.** If `config.ts` loads before dotenv populates `process.env`, every config value is `undefined`. Line 14 is a **side-effect import** — it imports nothing, it just *runs* the env-loader. Python equivalent: calling `load_dotenv()` as the first line of `__main__`.

This is the #1 thing you must never "clean up" in this file.

### Region 2: Lines 26–128 — Registry warm-up and self-verification

The three registries initialize **just by being imported** (the singleton trick from Part 1.3):

- `nodeLibrary` + `NodeSchemaRegistry` — node schemas
- `nodeContextRegistry` — AI context per node
- `unifiedNodeRegistry` — ⭐ the single source of truth

Then the file **verifies its own health**: counts registered nodes, checks critical ones exist (`google_gmail`, `ai_agent`, `ai_chat_model`, `manual_trigger`, `chat_trigger`), and tests alias resolution (`gmail` → `google_gmail`, `email` → `google_gmail`). A failed context-registry check **throws and stops boot** — everything downstream depends on it.

### Region 3: Lines 130–264 — The import wall

~80 imports: every API route handler from `worker/src/api/`, plus middleware (auth, rate limits, logging, tracing, metrics, caching, Kafka queueing). In Flask terms: importing every blueprint and every `before_request` hook in one place.

### Region 4: Lines 268–335 — App creation + the middleware pipeline

```ts
const app: Express = express();
app.set('trust proxy', true);     // we're behind a load balancer; trust X-Forwarded-For
```

Then middleware registers **in order** — and order is the whole game. Every request flows through this pipeline top-to-bottom (like WSGI middleware / Flask `before_request` chains):

```
request
  → requestIdMiddleware        (tag every request with an ID for log correlation)
  → response-time logger       (logs method, URL, status, duration, request ID)
  → express.json (50mb limit)  (parse JSON body; ALSO keeps req.rawBody —
                                needed to verify webhook signatures, which are
                                computed over the exact raw bytes)
  → corsMiddleware             (who may call us from a browser)
  → requestMetricsMiddleware   (Prometheus counters)
  → tokenBucketRateLimiter     (Redis-backed, default 100 req/min, skips /health & /metrics)
  → redisGetCache              (cache GET responses 60s — but SKIPS user-facing DB
                                reads like /api/db/workflows, so a DB blip can't
                                serve users a stale empty dashboard)
  → securityHeaders → requestLogger → tracingMiddleware → validateSubscriptionInput
  → ...then the matching route handler
```

### Region 5: Lines 337–552 — Health endpoints (production-ops vocabulary)

| Endpoint | Purpose |
|---|---|
| `/health` | Rich diagnostics: Gemini configured? AI success rate, DB pool utilization, circuit breakers, feature flags |
| `/health/live` | **Liveness probe** — "is the process alive?" Always 200. A restart policy watches this. |
| `/health/ready` | **Readiness probe** — "can I serve traffic?" Checks DB (`SELECT 1`, 4s timeout) and Redis (2s timeout) using `Promise.race` as a timeout. Returns 503 until ready, so load balancers don't route traffic to a half-booted instance. |
| `/api/health/gemini` | Key-pool health (per-key cooldown/health, never the key values) |
| `/api/admin/clear-cache` | Clears the Gemini in-memory cache |

The liveness/readiness split is the Kubernetes-standard pattern — worth memorizing.

### Region 6: Lines 554–1714 — The route map (~150 endpoints)

Grouped by job:

| Group | Routes | Notes |
|---|---|---|
| **Execution** | `/api/execute-workflow`, `/api/distributed-execute-workflow`, `/api/execution-status/:id`, queue stats/cancel | Rate-limited: 40/min per user, 1200/min global |
| **Generation (AI)** | `/api/generate-workflow`, `/api/capability-selection/{analyze,generate,confirm}`, smart-planner `/api/generate` | Heaviest middleware stack (see below) |
| **Credential vault** | `/api/credentials/store|retrieve|list|delete` | Retrieve returns `[REDACTED]` — secrets never leave via API |
| **Connections & OAuth** | per-provider `/api/oauth/<provider>/...` + `/api/connections/<provider>/...` | See the migration pattern below |
| **DB proxy** | `/api/db/:table` (GET/POST/PUT/DELETE) | **This is the frontend's entire "database access"** — authenticated, user-scoped, whitelisted tables. The frontend never touches Postgres directly. Writes can route through Kafka. |
| **Subscriptions/payments** | `/api/subscriptions/*`, `/api/payments/razorpay/*` | Razorpay + plan limits |
| **Admin** | `/api/admin/dlq/*` (dead-letter queue inspect/replay), audit trail, security events | All behind `requireAdmin` |
| **Triggers** | `/api/webhook-trigger/:workflowId`, form-trigger, chat-trigger | Public entry points for running workflows |
| **AI gateway** | `/api/ai/*` (generate, chat, models, metrics, chatbot) | Unified LLM access |
| **Versioning, templates, training, memory, node-contract** | various | Support systems |

**The middleware-stacking pattern** (Express's version of stacking decorators in Flask):

```ts
app.post('/api/generate-workflow',
  distributedRateLimit({ perUserLimit: 20, globalLimit: 300, windowMs: 60_000 }),
  tierRateLimit('generate'),                 // free vs paid plan limits
  asyncHandler(authenticateUser),            // verify Cognito JWT
  asyncHandler(geminiWalletContextMiddleware), // BYOK Gemini key, if user has one
  asyncHandler(requireWorkflowCapacityForAi),  // plan quota check
  asyncHandler(generateWorkflowRoute)        // ...finally, the real handler
);
```

Request passes through each function left-to-right; any of them can reject (429/401/403) before the handler runs.

**What is `asyncHandler`?** Express 4 does **not** catch errors thrown inside `async` handlers — an unhandled rejection would crash or hang the request. `asyncHandler` wraps the handler, catches the rejected Promise, and forwards the error to the central `errorHandler`. Python analogy: a decorator that wraps your view in `try/except` and routes exceptions to one error view. Mechanical rule in this codebase: **every async handler gets wrapped.**

**The OAuth migration pattern** (repeated for github/google/facebook/linkedin/notion/twitter/zoho/...):

```ts
if (isOAuthProviderMigrated('google')) {
  app.get('/api/oauth/google/start',    proxyToCredentialService);  // new microservice
  app.get('/api/oauth/google/callback', proxyToCredentialService);
}
app.get('/api/oauth/google/start',    googleOAuthStart);            // local fallback
app.get('/api/oauth/google/callback', asyncHandler(googleOAuthCallback));
```

Express matches routes **first-registered-first-served**, so when a provider is flagged as migrated, the proxy route wins; otherwise the request falls through to the local handler. This is a **strangler-fig migration**: OAuth is being moved provider-by-provider to a separate credential microservice (see `.github/workflows/deploy-credential-service.yml`), with the worker as a safety net.

### Region 7: Line 1716 — `app.use(errorHandler)` — must be LAST

Express identifies an error handler by its 4-argument signature and only routes errors to middleware registered *after* the route that threw. Last position = catches everything.

### Region 8: Lines 1735–1742 — Global crash guards

```ts
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  // Don't exit, try to keep server running
});
process.on('unhandledRejection', ...);
```

⚠️ This logs fatal errors and **keeps running**. It prevents random crashes, but Node's own docs warn the process may be in a corrupted state after an uncaught exception. The production-grade pattern: log → flush Sentry → graceful shutdown → let the process manager (PM2 / ECS) restart you. Noted in limitations.

### Region 9: Lines 1745–2030 — `startServer()`

In order:

1. **Migration check** — `checkAllMigrations()` applies/verifies DB migrations at boot (non-fatal on failure).
2. **`modelManager.initialize()`** — warm up Gemini model selection.
3. **`app.listen(PORT, '0.0.0.0')`** — bind to all network interfaces. Like `flask run --host=0.0.0.0`.
4. **Inside the listen callback** (only after the port is bound):
   - **Two WebSocket servers attach to the SAME http server** — `/ws/executions` (live execution visualization) and `/ws/chat` (chat triggers). WebSockets start life as a normal HTTP request that "upgrades", so Express routes and WS share port 3001.
   - **ws-redis-bridge** — when you run multiple worker replicas, execution events publish through Redis pub/sub so a browser connected to replica A still sees events from a workflow running on replica B.
   - A huge startup banner (manually-maintained endpoint list).
   - **Background services**, gated by `ENABLE_SCHEDULER` and a DB reachability preflight:
     - `timeout-watchdog` — every 5 min, kills stuck executions
     - `schedulerService` — fires cron-scheduled workflows
     - `session-cleanup` (only if Redis is configured)
     - `aiSreOrchestrator` — autonomous ops monitoring
5. **`EADDRINUSE` handler** — port already taken → prints the exact `netstat`/`taskkill` commands to fix it, then exits.
6. **`export default app`** — lets tests import the app and fire fake requests at it without binding a port (like importing a Flask `app` into pytest).

### The complete boot timeline

```
type-check (8GB heap) → startup-validation.js → nodemon → ts-node compiles in memory
→ env-loader → assertEnv → Sentry → registries self-build via imports → registry self-checks
→ import wall (80 handlers) → Express app → middleware pipeline → ~150 routes → errorHandler
→ startServer(): migrations → Gemini init → listen :3001
→ WebSockets attach → Redis bridge → scheduler/watchdog/cleanup/SRE
→ "✅ Backend ready to accept connections!"
```

---

## Part 4 — Postmortem Findings for This File

| # | Finding | Why it matters | Fix |
|---|---|---|---|
| 1 | `index.ts` is a 2033-line "God file" — routing + inline business logic | Some handlers (credential vault CRUD, versioning, `last-resolved-inputs` ~150 lines) are written inline instead of living in `api/` files | Move inline handlers to `api/` modules; group routes with `express.Router()` per domain (`authRouter`, `oauthRouter`, ...) |
| 2 | `uncaughtException` swallows fatal errors and keeps running | Process can continue in a corrupted state | Log → flush Sentry → graceful shutdown; let the process manager restart |
| 3 | Duplicate route registrations (`/api/admin-templates` AND `/admin-templates`, `/chatbot` alias) | Compatibility shims for older frontend builds; easy to forget one when changing behavior | Standardize the frontend on `/api/*`, then delete the prefix-less twins |
| 4 | Endpoint lists in `/health` and the startup banner are maintained by hand | They drift from reality | Generate from `app._router.stack` or drop them |
| 5 | Mid-file `import` statements look load-bearing but are hoisted | Misleading to readers ("Register all node definitions" comment at line 750 implies position matters — it doesn't) | Move all imports to the top during the Router refactor |
| 6 | OAuth route pairs depend on registration ORDER (proxy before fallback) | Reordering silently breaks the strangler-fig migration | Encode the choice inside one handler (`if migrated → proxy else local`) instead of relying on route order |

---

## Key Takeaways (the 5 things to remember)

1. **Node = always-on event loop.** `async/await` works like Python's, but it's the default mode, not an opt-in.
2. **Importing a module runs it once** — that's how every registry in this project initializes itself. Import order is therefore *behavior*, which is why `env-loader` must stay first.
3. **`npm run dev` = type-check → preflight validation → nodemon → ts-node.** TypeScript is compiled in memory during dev; `npm run build` + `node dist/index.js` in production.
4. **Express middleware is a pipeline; order is everything.** requestId first, body parsing before anything reads the body, `errorHandler` dead last, and `asyncHandler` wraps every async handler because Express 4 won't catch async errors itself.
5. **One port (3001) serves three protocols' worth of traffic:** REST routes, `/ws/executions`, and `/ws/chat` — WebSockets piggyback on the HTTP server via the upgrade mechanism, and Redis pub/sub bridges events across replicas.

---

**Next:** Lesson 3 — the `unified-node-registry.ts`: we open the single source of truth and read one real node's complete definition (schemas, credentials, `execute()`) end to end.
