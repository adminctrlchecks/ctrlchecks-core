# CtrlChecks Live Microservices: End-to-End Architecture

**Production baseline:** 2026-06-20, after T10 full-pass smoke testing and the T9 retirement-gate flip. This document describes the live single-EC2 deployment, not the removed monolith topology. The React 18/Vite frontend is served at `https://www.ctrlchecks.ai`; `https://worker.ctrlchecks.ai` is the sole public API boundary, with TLS terminated by Nginx before traffic reaches the worker on port 3001.

The normal production path delegates at 100% to the six internal services on ports 3002-3007. Those services are reachable only on EC2 loopback and are never called by browser code. AWS Cognito authenticates user-facing worker routes, while service-to-service requests use shared internal keys.

## Service inventory

| Service | Port | Public? | Live responsibility | Key environment flags and settings |
|---|---:|---|---|---|
| `worker` | 3001 | Yes, through Nginx as `worker.ctrlchecks.ai` | API gateway, Cognito enforcement, delegation clients, Unified Node Registry, Unified Graph Orchestrator, WebSocket server, scheduler/watchdog, and the current node execution runtime | `ENABLE_EXECUTION_QUEUE=true`; `DATABASE_URL`; `REDIS_URL`; `WORKER_INTERNAL_KEY`; all `*_SERVICE_ENABLED`, `*_CANARY_PERCENT`, URL, and service-key settings |
| `ai-generator` | 3002 | No; loopback only | Runs the remote LLM portions of intent, capability, structural-prompt, node-selection, edge-reasoning, validation, and property-population stages; normal production traffic is fully delegated | Worker: `AI_GENERATOR_URL=http://127.0.0.1:3002`, `AI_GENERATOR_SERVICE_KEY`; service: `AI_GENERATOR_SERVICE_KEY`, Gemini/model settings |
| `execution-engine` | 3003 | No; loopback only | Accepts execution requests, owns `workflow:execution:engine-queue`, and consumes queued jobs before calling the worker runtime | `EXECUTION_ENGINE_ENABLED=true`; `EXECUTION_ENGINE_CANARY_PERCENT=100`; `EXECUTION_ENGINE_CONSUMER_ENABLED=true`; `EXECUTION_ENGINE_SERVICE_KEY`; `WORKER_INTERNAL_KEY`; `WORKER_INTERNAL_URL` |
| `credential-service` | 3004 | No; loopback only | Connection CRUD, encrypted credential persistence, and proxied OAuth start/callback flows | `CREDENTIAL_SERVICE_ENABLED=true`; `CREDENTIAL_SERVICE_CANARY_PERCENT=100`; `CREDENTIAL_SERVICE_OAUTH_ENABLED`; `CREDENTIAL_SERVICE_OAUTH_PROVIDERS`; `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true`; `CREDENTIAL_ENCRYPTION_KEY` |
| `notification-service` | 3005 | No; loopback only | Email through AWS SES, in-app notification rows and Redis publish, and guarded outbound webhooks | `NOTIFICATION_SERVICE_ENABLED=true`; `NOTIFICATION_SERVICE_CANARY_PERCENT=100`; `NOTIFICATION_SERVICE_KEY`; `DATABASE_URL`; `REDIS_URL`; `SES_FROM_EMAIL`; `SES_REGION` |
| `trigger-service` | 3006 | No; loopback only | Validates and dispatches webhook, form, chat, and scheduled triggers, then starts the common execution path | `TRIGGER_SERVICE_ENABLED=true`; `TRIGGER_SERVICE_CANARY_PERCENT=100`; `TRIGGER_SERVICE_KEY`; `WORKER_INTERNAL_URL`; `DATABASE_URL` |
| `workflow-crud-service` | 3007 | No; loopback only | Workflow save/delete, dedicated load/list APIs, templates, version history, and rollback | `WORKFLOW_CRUD_SERVICE_ENABLED=true`; `WORKFLOW_CRUD_SERVICE_CANARY_PERCENT=100`; `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true`; `WORKFLOW_CRUD_SERVICE_KEY`; `DATABASE_URL` |

## Accepted gaps and boundaries

| Gap | Live behavior and impact |
|---|---|
| Workflow CRUD read passthrough | The frontend's `awsClient.from('workflows').select(...)` still uses the worker's authenticated `GET /api/db/workflows` proxy. The service has dedicated list/load endpoints, but these common frontend reads do not use them yet. |
| OAuth bypasses | Some provider-specific OAuth paths can still execute a worker-local handler instead of the credential-service proxy. The credential write retirement gate covers delegated connection CRUD, but the remaining OAuth migration is separate work. |
| Executor remains in worker | The execution-engine owns acceptance, queueing, and consumption, but calls `POST /api/internal/engine-execute`; topological traversal, credential injection, and `UnifiedNodeRegistry.get(type).execute()` still run in the worker. |
| Trigger notification identity | A trigger-created execution with no usable `userId` can complete successfully while terminal notification dispatch is skipped. This is a documented, rare form-trigger gap rather than an execution failure. |

The legacy `ctrlchecks-execution-worker` unit is stopped and disabled after cutover. It appears only in the deployment diagram so all eight installed application unit names are accounted for; it is not part of the live execution path.

## 1. System Context (C4 Level 1)

```mermaid
flowchart TB
  subgraph Frontend["Frontend and identity"]
    U["Engineers and business users"]
    FE["React 18 + Vite<br/>www.ctrlchecks.ai"]
    COG["AWS Cognito<br/>access JWT"]
    U -->|uses| FE
    FE <-->|sign-in and token refresh| COG
  end

  subgraph PublicEdge["Public API edge"]
    NG["Nginx<br/>TLS :443"]
    W["worker :3001<br/>API gateway + orchestration + runtime"]
    NG -->|HTTP proxy and WebSocket upgrade| W
  end

  subgraph Microservices["Internal microservices on 127.0.0.1"]
    AI["ai-generator :3002"]
    EE["execution-engine :3003"]
    CS["credential-service :3004"]
    NS["notification-service :3005"]
    TS["trigger-service :3006"]
    WC["workflow-crud-service :3007"]
  end

  subgraph DataStores["Managed and host data services"]
    RDS["AWS RDS PostgreSQL"]
    REDIS["Redis<br/>queues, locks, cache, pub/sub"]
    SES["AWS SES"]
  end

  subgraph External["External providers"]
    APIS["Gmail, Slack, GitHub, Salesforce,<br/>Gemini and other node APIs"]
    HOOKS["Customer webhook endpoints"]
  end

  FE -->|HTTPS + Cognito JWT| NG
  W -->|internal HTTP + x-service-key| AI
  W -->|internal HTTP + x-service-key| EE
  W -->|internal HTTP + x-service-key| CS
  W -->|internal HTTP + x-service-key| NS
  W -->|internal HTTP + x-service-key| TS
  W -->|internal HTTP + x-service-key| WC
  EE -.->|x-internal-engine-key callback| W

  W --> RDS
  W --> REDIS
  AI -->|LLM calls| APIS
  EE --> RDS
  EE --> REDIS
  CS --> RDS
  CS -->|OAuth token exchange| APIS
  NS --> RDS
  NS --> REDIS
  NS --> SES
  NS --> HOOKS
  TS --> RDS
  WC --> RDS
  W -->|node execution| APIS

  POLICY["Network invariant:<br/>the browser has no route to :3002-:3007"]
```

### Explanation

A user initiates every interactive flow in the Vite frontend, which obtains a Cognito access token and sends HTTPS requests only to Nginx and the worker. Nginx synchronously terminates TLS and forwards HTTP or upgraded WebSocket traffic to port 3001; the browser has no network path to ports 3002-3007. The worker synchronously validates, routes, or delegates requests, while execution and terminal notifications become asynchronous after the engine returns `202 Accepted`. Durable workflow, execution, credential, and notification state lives in RDS, while Redis carries queues, locks, caches, and cross-process events. The worker still owns graph authority and node execution, even though the six extracted services own their listed service domains. A failed mandatory engine, CRUD-write, or credential-write delegation returns a service error under the live cutover gates; optional notification delivery remains best-effort.

## 2. Deployment Topology (Single EC2 Host)

```mermaid
flowchart TB
  WEB["Vercel-hosted frontend<br/>www.ctrlchecks.ai"]
  RDS["AWS RDS PostgreSQL"]
  REDIS["Redis"]

  subgraph EC2["Single EC2 host: ubuntu@3.7.115.58"]
    NGINX["Nginx<br/>public :443"]

    subgraph ActiveUnits["Active CtrlChecks systemd application units"]
      W["ctrlchecks-worker<br/>:3001"]
      AI["ctrlchecks-ai-generator<br/>127.0.0.1:3002"]
      EE["ctrlchecks-execution-engine<br/>127.0.0.1:3003<br/>consumer enabled"]
      CS["ctrlchecks-credential-service<br/>127.0.0.1:3004"]
      NS["ctrlchecks-notification-service<br/>127.0.0.1:3005"]
      TS["ctrlchecks-trigger-service<br/>127.0.0.1:3006"]
      WC["ctrlchecks-workflow-crud-service<br/>127.0.0.1:3007"]
    end

    LEGACY["ctrlchecks-execution-worker<br/>legacy unit: stopped + disabled"]

    NGINX -->|proxy HTTP :3001| W
    NGINX -->|Upgrade /ws/| W
    W -->|loopback| AI
    W -->|loopback| EE
    W -->|loopback| CS
    W -->|loopback| NS
    W -->|loopback| TS
    W -->|loopback| WC
    EE -->|loopback callback :3001| W
  end

  WEB -->|HTTPS / WSS| NGINX
  W --> RDS
  W --> REDIS
  EE --> RDS
  EE --> REDIS
  CS --> RDS
  NS --> RDS
  NS --> REDIS
  TS --> RDS
  WC --> RDS
```

### Explanation

The browser loads the frontend from Vercel and initiates all backend traffic through Nginx on one EC2 host. Nginx forwards public HTTPS and `/ws/` upgrades only to the worker; the six extracted services listen on loopback ports and are reached synchronously by worker clients. Seven CtrlChecks application units are active, while the eighth installed application unit, `ctrlchecks-execution-worker`, is a stopped and disabled legacy consumer. RDS and Redis are shared infrastructure rather than per-service databases or queues. A service process failure is isolated at the systemd-unit level, but the single EC2 host remains an accepted single-host failure domain. Operational rollback changes the worker's delegation flag and restarts `ctrlchecks-worker`; it does not require rebuilding or redeploying the service units.

## 3. Request Routing and API Gateway Pattern

```mermaid
flowchart LR
  subgraph Frontend["Browser and external callers"]
    B["Frontend / trigger caller<br/>Cognito JWT where required"]
  end

  subgraph Worker["worker :3001 - only public API boundary"]
    GW["Express router + auth + rate limits"]
    AIC["AI stage clients"]
    CRDC["workflow-crud-service-client"]
    CREDC["credential-service-client<br/>+ OAuth proxy"]
    ENGC["execution-engine-client"]
    TRIGC["trigger-service-client"]
    TERM["dispatchExecutionNotifications"]
    FAIL["Fail closed when required<br/>503 service unavailable"]
  end

  subgraph Microservices["Loopback services"]
    AI["ai-generator :3002"]
    CRUD["workflow-crud-service :3007"]
    CRED["credential-service :3004"]
    ENG["execution-engine :3003"]
    TRIG["trigger-service :3006"]
    NOTIF["notification-service :3005"]
  end

  B -->|all HTTPS requests| GW
  GW -->|POST /api/generate-workflow| AIC
  AIC -->|POST /generate/* + x-service-key| AI

  GW -->|POST /api/save-workflow<br/>PUT, POST, or DELETE /api/workflows/*| CRDC
  CRDC -->|/workflows* + x-service-key| CRUD

  GW -->|/api/credential-connections/*<br/>and /api/oauth/*| CREDC
  CREDC -->|/connections or /oauth + x-service-key| CRED

  GW -->|POST /api/execute-workflow| ENGC
  ENGC -->|POST /execute + x-service-key| ENG
  ENG -.->|POST /api/internal/engine-execute<br/>x-internal-engine-key| GW

  GW -->|public webhook, form, chat;<br/>worker scheduler| TRIGC
  TRIGC -->|POST /triggers/* + x-service-key| TRIG
  TRIG -->|internal async execution request| GW

  GW -->|terminal success or failure| TERM
  TERM -->|POST /notifications/* + x-service-key| NOTIF

  ENG -->|unavailable| FAIL
  CRUD -->|write unavailable and gate=true| FAIL
  CRED -->|vault write unavailable and gate=true| FAIL
```

### Explanation

The browser or an external trigger initiates a request against a stable worker URL, and the worker applies public authentication and routing before any internal call. Generation, CRUD writes, connection CRUD, manual execution, trigger dispatch, and terminal notifications each use a dedicated worker client with an `x-service-key`; the engine-to-worker callback uses the narrower `x-internal-engine-key`. Most request/response delegations are synchronous, but `POST /execute` returns `202` after queueing and trigger notification to the execution path is fire-and-forget. The target service persists its domain state in the shared RDS database, while the engine persists queue payloads in Redis. With execution-engine enabled at the post-cutover route, an engine error produces `503 EXECUTION_ENGINE_UNAVAILABLE` rather than silently executing on the gateway. The workflow and credential retirement gates similarly prevent a failed delegated write from being duplicated through a worker-local write path. Trigger and notification fallback code remains in the worker for operational rollback, but the normal production routing percentage is 100%.

## 4. AI Workflow Generation Pipeline (End to End)

```mermaid
flowchart TB
  subgraph Frontend["Frontend"]
    USER["User describes an automation"]
    WIZ["AutonomousAgentWizard"]
    USER --> WIZ
  end

  subgraph Worker["worker :3001 - pipeline authority"]
    API["POST /api/generate-workflow"]
    CATALOG["Build catalog from<br/>Unified Node Registry"]
    HYDRATE["Registry hydration<br/>types, defaults, ports, schemas"]
    GRAPH["Unified Graph Orchestrator<br/>initialize + reconcile"]
    CRED["Credential discovery<br/>owner scoped, non-blocking"]
    FINAL["validateWorkflow()<br/>one reconcile/repair attempt"]
    JSON["Sealed workflow JSON<br/>nodes, edges, metadata, manifest"]
  end

  subgraph AIGenerator["ai-generator :3002 - remote LLM stages"]
    INTENT["1. Intent"]
    CAP["2. Capability selection"]
    STRUCT["3. Structural prompt"]
    NODE["4. Node selection"]
    EDGE["5. Edge reasoning"]
    VALID["6. Semantic validation"]
    PROP["7. Property population"]
    INTENT --> CAP --> STRUCT --> NODE --> EDGE --> VALID --> PROP
  end

  GEMINI["Gemini model APIs"]

  WIZ -->|prompt + JWT| API
  API --> CATALOG
  CATALOG -->|catalog + constraints<br/>x-service-key| INTENT
  INTENT --> GEMINI
  CAP --> GEMINI
  STRUCT --> GEMINI
  NODE --> GEMINI
  EDGE --> GEMINI
  VALID --> GEMINI
  PROP --> GEMINI
  PROP -->|ordered nodes, edges,<br/>validation and values| HYDRATE
  HYDRATE --> GRAPH
  GRAPH --> CRED
  CRED --> FINAL
  FINAL --> JSON
  JSON -->|NDJSON progress or JSON response| WIZ

  POLICY["Registry hydration and all edge mutation<br/>happen in the worker, never in the frontend"]
  POLICY -.-> HYDRATE
  POLICY -.-> GRAPH
```

### Explanation

The user initiates generation in `AutonomousAgentWizard`, which submits the prompt to the worker and receives either streaming NDJSON progress or a final JSON response. The worker builds the authoritative node catalog and synchronously delegates the LLM portions of each stage to ai-generator at the live 100% normal-path setting. AI output is not trusted as executable structure: the worker rehydrates selected types from the Unified Node Registry and sends every edge mutation through the Unified Graph Orchestrator. Credential discovery checks what the workflow will require and which connections are present, but missing credentials are returned as setup work rather than blocking JSON construction. The worker persists nothing merely because generation succeeded; persistence occurs later through the workflow save path. Remote stage clients retain in-process fallbacks for service errors, while irreparable node, edge, or structural-validation failures return a generation error instead of a malformed workflow. Registry hydration, graph initialization, reconciliation, final validation, and manifest sealing all remain in the worker.

## 5. Workflow Save, Load, and CRUD Delegation

```mermaid
flowchart TB
  subgraph Frontend["Frontend workflow data access"]
    UI["Workflow builder / workflow list"]
    WRITE["Canonical mutations<br/>save, delete, rollback"]
    READ["awsClient.from('workflows').select(...)"]
    HISTORY["Dedicated version-history API"]
    UI --> WRITE
    UI --> READ
    UI --> HISTORY
  end

  subgraph Worker["worker :3001"]
    SAVE["POST /api/save-workflow<br/>normalize + validate"]
    MUTATE["DELETE /api/workflows/:id<br/>POST .../rollback"]
    VERSIONS["GET /api/workflows/:id/versions"]
    CLIENT["workflow-crud-service-client<br/>CANARY=100"]
    GATE["WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true"]
    DBPROXY["GET /api/db/workflows<br/>dbProxyGet passthrough"]
    UNAVAILABLE["503 WORKFLOW_CRUD_SERVICE_UNAVAILABLE"]
  end

  subgraph Service["workflow-crud-service :3007"]
    CRUD["POST/GET/DELETE /workflows"]
    VERSIONING["GET versions<br/>POST rollback"]
  end

  subgraph Data["AWS RDS PostgreSQL"]
    WF[("workflows")]
    WV[("workflow_versions")]
  end

  WRITE --> SAVE
  WRITE --> MUTATE
  HISTORY --> VERSIONS
  SAVE --> CLIENT
  MUTATE --> CLIENT
  VERSIONS --> CLIENT
  CLIENT -->|x-service-key + x-user-id| CRUD
  CLIENT -->|x-service-key + x-user-id| VERSIONING
  CRUD --> WF
  CRUD --> WV
  VERSIONING --> WF
  VERSIONING --> WV

  READ -->|Cognito JWT| DBPROXY
  DBPROXY -->|accepted gap: direct SELECT| WF

  CLIENT -->|remote write returns null| GATE
  GATE --> UNAVAILABLE
```

### Explanation

The workflow builder initiates canonical saves, deletes, and rollbacks through authenticated worker routes, where saves are normalized and validated before delegation. At `CANARY=100`, the worker synchronously calls workflow-crud-service, which writes `workflows` and maintains `workflow_versions`; dedicated history and rollback routes use the same service. `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true` is the retirement gate, so a failed remote mutation returns `503` instead of creating a second write through the worker. The common frontend list/load pattern is different: `awsClient.from('workflows').select(...)` still calls the worker's generic authenticated DB proxy and reads RDS directly. That read passthrough is an accepted gap even though the service also implements dedicated `GET /workflows` and `GET /workflows/:id` endpoints. The service stores workflow JSON but does not author or mutate graph edges; those changes must already have passed through the worker's graph orchestrator. Disabling workflow-crud-service delegation and restarting the worker is the no-redeploy rollback path to the retained local implementation.

## 6. Credential and OAuth Flow

```mermaid
sequenceDiagram
  actor User
  participant Browser as Connections UI
  participant Worker as worker :3001
  participant Cred as credential-service :3004
  participant RDS as RDS connections and unified_credentials
  participant Provider as OAuth / external provider
  participant Runtime as worker credential resolver

  User->>Browser: Create, update, test, or remove a connection
  Browser->>Worker: /api/credential-connections/* + Cognito JWT
  Worker->>Cred: /connections* + x-service-key + x-user-id
  Cred->>RDS: Encrypt and persist credentials plus metadata
  RDS-->>Cred: Connection record without exposed secrets
  Cred-->>Worker: CRUD result
  Worker-->>Browser: Masked connection status

  rect rgb(244, 248, 255)
    Browser->>Worker: GET public worker OAuth start URL
    Worker->>Cred: GET /oauth/provider/start + internal identity
    Cred-->>Browser: 302 to provider authorization page
    Browser->>Provider: User grants scopes
    Provider-->>Browser: Redirect to worker.ctrlchecks.ai callback
    Browser->>Worker: GET/POST /api/oauth/provider/callback
    Worker->>Cred: Proxy callback
    Cred->>Provider: Synchronous code-for-token exchange
    Provider-->>Cred: Access/refresh tokens and expiry
    Cred->>RDS: Encrypted upsert
    Cred-->>Browser: Relay success page / returnTo
  end

  rect rgb(248, 255, 248)
    Runtime->>RDS: Resolve workflow-owner credential at execution time
    RDS-->>Runtime: Encrypted secret row
    Runtime->>Runtime: Decrypt and inject into in-memory node config
    Runtime->>Provider: Execute node with scoped secret
  end

  Note over Browser,Runtime: Secrets are never returned to frontend code.
  Note over Worker,Cred: Accepted gap: some OAuth handlers can remain worker-local.
```

### Explanation

The user initiates connection CRUD or OAuth from the Connections page, but every public URL remains on the worker so provider redirect URIs do not expose port 3004. Connection CRUD is a synchronous worker-to-service call, and credential-service encrypts the secret material before persisting connection and unified credential state in RDS. OAuth start and callback involve browser redirects, but the code-for-token exchange and encrypted upsert occur server-side. During workflow execution, the credential resolver remains in the worker: it resolves credentials for the workflow owner, decrypts them, and injects them only into the in-memory node execution config. No secret value is included in frontend connection responses, workflow JSON, or WebSocket events. With `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true`, a failed delegated CRUD write returns `503 CREDENTIAL_SERVICE_UNAVAILABLE` rather than falling back to a local vault write. Some OAuth provider paths can still bypass the service proxy; this accepted gap is controlled separately from the CRUD canary and retirement gate.

## 7. Execution Flow - Manual Trigger (Happy Path)

```mermaid
sequenceDiagram
  actor User
  participant Frontend as Frontend useExecutionStatus
  participant Nginx as Nginx :443
  participant Worker as worker :3001
  participant Engine as execution-engine :3003
  participant Redis as Redis
  participant RDS as RDS
  participant Notify as notification-service :3005
  participant SES as AWS SES

  User->>Frontend: Click Run
  Frontend->>Nginx: POST /api/execute-workflow + JWT
  Nginx->>Worker: Proxy request
  Worker->>Engine: POST /execute + x-service-key
  Engine->>RDS: Pre-create execution row (pending, non-fatal)
  Engine->>Redis: SETEX job + ZADD workflow:execution:engine-queue
  Engine-->>Worker: 202 queued + executionId + jobId
  Worker-->>Nginx: 202 queued
  Nginx-->>Frontend: 202, then subscribe to executionId

  Engine->>Redis: Consumer ZRANGE/ZREM and add engine-processing
  Engine->>Redis: PUBLISH running event
  Engine->>Worker: POST /api/internal/engine-execute + x-internal-engine-key
  Worker->>RDS: Load latest workflow and execution state
  Worker->>Worker: Topological sort + owner credential resolution

  loop Each runnable node in graph order
    Worker->>Worker: UnifiedNodeRegistry.get(type).execute(context)
    Worker->>RDS: Update executions and execution_steps/checkpoint
    Worker->>Redis: Publish node/progress WebSocket event
    Redis-->>Worker: ws:exec:events bridge delivery
    Worker-->>Nginx: /ws/executions event
    Nginx-->>Frontend: WSS EXECUTION_UPDATE
  end

  Worker->>RDS: Persist success/failed terminal state and release lock
  Worker-->>Notify: Fire-and-forget email + in-app dispatch
  Notify->>SES: Send email when enabled
  Notify->>RDS: Insert in-app notification
  Worker-->>Engine: Synchronous internal result
  Engine->>Redis: Remove engine-processing marker

  loop Worker watchdog every 5 minutes
    Worker->>RDS: Find stale running heartbeat or timeout
    Worker->>RDS: Mark failed and release lock when stuck
  end
```

### Explanation

The user initiates a run, and the worker immediately delegates to execution-engine, which writes the Redis job and returns `202` without waiting for node execution. The engine consumer asynchronously removes the job from `workflow:execution:engine-queue`, publishes a running event, and then makes one synchronous internal call back to the worker. Inside that call the worker loads the latest workflow, resolves owner credentials, performs a topological traversal, and executes every node through the Unified Node Registry. Execution state and resumable step checkpoints are persisted in RDS, while progress events move through Redis and the worker's `/ws/executions` server to `useExecutionStatus`. Terminal email and in-app notifications are dispatched after the execution state is durable and do not block the run result. There is no monolith fallback when the live engine delegation itself fails: the public request receives `503`, and a consumer/runtime failure emits a failed event. Independently, `TimeoutWatchdog` scans stale `running` rows every five minutes, marks them failed, and releases their execution locks.

## 8. Trigger Flows - Form, Webhook, Schedule, and Chat

```mermaid
flowchart TB
  subgraph Initiators["Trigger initiators"]
    WEBHOOK["External webhook sender"]
    FORM["Public form submitter"]
    CHAT["Chat participant"]
    CLOCK["Worker node-cron scheduler"]
  end

  subgraph WorkerBoundary["worker :3001 public boundary"]
    WWEB["POST /api/webhook-trigger/:workflowId"]
    WFORM["POST /api/form-trigger/:workflowId/:nodeId/submit"]
    WCHAT["POST /api/chat-trigger/:workflowId/:nodeId/message"]
    WSCHED["SchedulerService dispatch"]
    WEXEC["POST /api/execute-workflow<br/>internal trigger header"]
    WINTERNAL["POST /api/internal/engine-execute"]
  end

  subgraph TriggerService["trigger-service :3006 - CANARY=100"]
    TWEB["POST /triggers/webhook/:workflowId"]
    TFORM["POST /triggers/form/:workflowId/:nodeId/submit"]
    TCHAT["POST /triggers/chat/:workflowId/:nodeId/message"]
    TSCHED["POST /triggers/schedule/:workflowId"]
    VALIDATE["Validate active workflow,<br/>signature, payload, and trigger config"]
  end

  subgraph ExecutionPath["Shared asynchronous execution path"]
    RDS[("RDS executions row")]
    ENGINE["execution-engine :3003<br/>POST /execute"]
    QUEUE["Redis<br/>workflow:execution:engine-queue"]
    CONSUMER["Engine consumer"]
  end

  WEBHOOK --> WWEB -->|x-service-key| TWEB
  FORM --> WFORM -->|x-service-key| TFORM
  CHAT --> WCHAT -->|x-service-key| TCHAT
  CLOCK --> WSCHED -->|x-service-key| TSCHED
  TWEB --> VALIDATE
  TFORM --> VALIDATE
  TCHAT --> VALIDATE
  TSCHED --> VALIDATE
  VALIDATE -->|insert trigger input and execution identity| RDS
  VALIDATE -->|fire-and-forget internal execution request| WEXEC
  WEXEC -->|100% delegation, POST /execute| ENGINE
  ENGINE --> QUEUE
  QUEUE --> CONSUMER
  CONSUMER -->|x-internal-engine-key| WINTERNAL

  FIX2["FIX-2: form payload is recognized and normalized;<br/>the trigger node does not re-enter waiting state"]
  FIX2 -.-> TFORM
  FIX2 -.-> WINTERNAL
```

### Explanation

Webhook senders, form users, and chat users initiate public requests on worker URLs, while scheduled work is initiated by the scheduler that still runs in the worker. At `TRIGGER_SERVICE_CANARY_PERCENT=100`, the corresponding worker client synchronously asks trigger-service to validate the active workflow and channel-specific payload. Trigger-service persists an execution row and returns a queued identity, while its notification into the worker execution route is fire-and-forget. The worker then delegates that request to execution-engine, which places the job on the same engine queue used by manual runs; the consumer ultimately uses the same internal worker runtime described in section 7. FIX-2 ensures form submission data is recognized, normalized, and not re-paused as though the trigger were still waiting. Invalid signatures, inactive workflows, malformed messages, or a failed trigger-service database lookup return a channel-appropriate `4xx` or `503` before enqueue. If an asynchronous handoff stalls after the execution row exists, WebSocket/polling exposes the lack of progress and the worker watchdog eventually fails a stale `running` row.

## 9. Real-Time Observability and Notifications

```mermaid
flowchart TB
  subgraph Producers["Execution event producers"]
    RUNTIME["Worker execution runtime<br/>state manager + VisualizationService"]
    ENGINE["execution-engine consumer"]
  end

  subgraph RedisLayer["Redis event layer"]
    EXECCH["ws:exec:events<br/>publish / subscribe"]
    NTFCH["ntf:userId<br/>in-app publish"]
  end

  subgraph Worker["worker :3001"]
    BRIDGE["WsRedisBridge<br/>dedicated subscriber connection"]
    WSS["WebSocket server<br/>/ws/executions"]
    STATUS["GET /api/execution-status/:id"]
    METRICS["GET /metrics<br/>delegation counters"]
  end

  subgraph Frontend["Frontend"]
    NGINX["Nginx /ws/<br/>Upgrade + Connection headers"]
    HOOK["useExecutionStatus<br/>WSS first"]
    POLL["3-second polling fallback"]
  end

  subgraph Notifications["notification-service :3005"]
    DISPATCH["Email / in-app / webhook dispatch"]
    SES["AWS SES"]
    NRDS[("RDS notifications")]
    OUT["Customer HTTPS webhook<br/>3 attempts + SSRF guard"]
  end

  OPS["Operator on EC2"]
  SVCMETRICS["Per-service /metrics and journald"]

  RUNTIME -->|local broadcast| WSS
  RUNTIME -->|publish| EXECCH
  ENGINE -->|publish running/failed| EXECCH
  EXECCH --> BRIDGE
  BRIDGE --> WSS
  WSS --> NGINX -->|WSS| HOOK
  HOOK -->|disconnected| POLL
  POLL --> STATUS

  RUNTIME -->|terminal, best effort| DISPATCH
  DISPATCH --> SES
  DISPATCH --> NRDS
  DISPATCH --> NTFCH
  DISPATCH --> OUT

  OPS -->|curl localhost:3001/metrics| METRICS
  OPS --> SVCMETRICS
```

### Explanation

The worker runtime and execution-engine initiate lifecycle events, with local worker events broadcast directly and cross-process events published on Redis `ws:exec:events`. `WsRedisBridge` uses a duplicated subscriber connection so Redis pub/sub cannot put the shared command connection into subscriber-only mode. Nginx forwards `/ws/` upgrade headers, and the frontend's `useExecutionStatus` subscribes to `/ws/executions` with the execution ID and Cognito token. If the socket is disconnected, the hook polls `GET /api/execution-status/:id` every three seconds and stops polling when WebSocket connectivity returns. Terminal notification delivery is asynchronous: notification-service sends email through SES, inserts in-app rows in RDS and publishes their Redis event, and can deliver a configured HTTPS webhook with SSRF checks and retry. Notification failures do not roll back a completed workflow execution, and a trigger execution without a usable user ID can skip terminal dispatch. Operators inspect worker delegation counters with `curl localhost:3001/metrics`, service-local metrics, and each unit's journald logs.

## 10. Data and Control Planes

```mermaid
flowchart TB
  subgraph ControlPlane["Control plane - owned primarily by worker"]
    ROUTER["Public routes, Cognito auth,<br/>delegation clients"]
    FLAGS["worker .env<br/>ENABLED, CANARY=100, service URLs/keys"]
    GATES["Retirement gates<br/>CRUD local writes disabled<br/>vault writes disabled"]
    REGISTRY["Unified Node Registry<br/>node contracts and executors"]
    GRAPH["Unified Graph Orchestrator<br/>all edge mutation and validation"]
    FLAGS --> ROUTER
    GATES --> ROUTER
    REGISTRY --> GRAPH
  end

  subgraph InternalServices["Delegated internal services"]
    AI["ai-generator :3002"]
    ENG["execution-engine :3003"]
    CRED["credential-service :3004"]
    NOTIF["notification-service :3005"]
    TRIG["trigger-service :3006"]
    CRUD["workflow-crud-service :3007"]
  end

  subgraph DataPlane["Data plane"]
    RUNTIME["Worker node runtime<br/>topological traversal + credential injection"]
    RDS["RDS tables<br/>workflows, workflow_versions, executions,<br/>execution_steps, connections, unified_credentials, notifications"]
    REDIS["Redis<br/>engine queue, processing set, locks,<br/>cache and WS pub/sub"]
    EXT["External provider API calls<br/>Gmail, Slack, Gemini, CRM, webhooks"]
  end

  subgraph Rollback["No-redeploy rollback"]
    OFF["Set affected *_ENABLED=false"]
    RESTART["systemctl restart ctrlchecks-worker"]
    LOCAL["Worker retained implementation<br/>takes the route"]
    OFF --> RESTART --> LOCAL
  end

  ROUTER --> AI
  ROUTER --> ENG
  ROUTER --> CRED
  ROUTER --> NOTIF
  ROUTER --> TRIG
  ROUTER --> CRUD
  GRAPH --> RDS
  REGISTRY --> RUNTIME
  ENG --> REDIS
  ENG --> RDS
  CRED --> RDS
  NOTIF --> RDS
  NOTIF --> REDIS
  TRIG --> RDS
  CRUD --> RDS
  RUNTIME --> RDS
  RUNTIME --> REDIS
  RUNTIME --> EXT
  AI --> EXT
  CRED --> EXT
  NOTIF --> EXT
  LOCAL -.-> RUNTIME
```

### Explanation

The worker's environment and code initiate control-plane decisions: public routing, service enablement, 100% canary settings, retirement gates, registry contracts, and graph validation. The six internal services apply those decisions to production data, but they do not replace the worker's node registry or graph orchestrator. The data plane consists of RDS rows, Redis queue and coordination keys, the worker runtime's in-memory node context, and outbound calls made by nodes or service integrations. The engine queue and processing set are control signals carried in Redis, while execution results and resumable state are durable in RDS. A rollback sets the affected service's `*_ENABLED=false` and restarts only the worker, causing the retained implementation to take the route without a redeploy. Retirement gates remain important on the live delegated path because they convert a failed credential or workflow write into `503` rather than an implicit double-write. This deployment has no live Kubernetes, Kafka, or multi-region control plane; the operational unit is the single EC2 host plus its managed AWS dependencies.

## Glossary

| Term | Meaning in the live CtrlChecks system |
|---|---|
| **Canary** | Deterministic delegation controlled by a worker environment percentage. Credential, notification, trigger, and workflow CRUD routing hashes a stable user or workflow ID; production is at 100%, so every eligible request uses the service normal path. Execution-engine is also configured with `CANARY=100`, although the Phase 5 worker route delegates unconditionally whenever the engine is enabled. |
| **Retirement gate** | A fail-closed switch used after a successful service soak. `WORKFLOW_CRUD_LOCAL_WRITES_DISABLED=true` and `CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED=true` prevent a remote write failure from silently falling through to a second worker-local write. |
| **engine-queue** | The Redis sorted set `workflow:execution:engine-queue`, owned and consumed by execution-engine when `EXECUTION_ENGINE_CONSUMER_ENABLED=true`. A separate job key stores the serialized payload, and an engine-processing sorted set tracks dequeued work. |
| **db-proxy passthrough** | The worker's authenticated `/api/db/:table` layer, which turns the frontend's database-like `awsClient.from(...)` calls into user-scoped SQL against RDS. For workflows, common reads still use this path instead of workflow-crud-service; that is the documented CRUD read gap. |
| **Delegation client** | A worker-side `*-service-client.ts` adapter that applies flags/canary policy, adds internal auth headers, enforces a timeout, records delegation metrics, and translates a service response back to the public worker route. |

## Traceability map

| Topic | Primary repository evidence |
|---|---|
| Production cutover, ports, flags, gates, and accepted gaps | [MICROSERVICES_CUTOVER_COMPLETE.md](../../.claude/logs/MICROSERVICES_CUTOVER_COMPLETE.md), [MICROSERVICES_OPS_PLAYBOOK.md](../../.claude/logs/MICROSERVICES_OPS_PLAYBOOK.md), [PRODUCTION_GROUND_TRUTH_AUDIT.md](../../.claude/logs/PRODUCTION_GROUND_TRUTH_AUDIT.md) |
| Service APIs and ownership | [execution-engine-contract.md](../engineering/execution-engine-contract.md), [credential-service-contract.md](../engineering/credential-service-contract.md), [notification-service-contract.md](../engineering/notification-service-contract.md), [trigger-service-contract.md](../engineering/trigger-service-contract.md), [workflow-crud-service-contract.md](../engineering/workflow-crud-service-contract.md) |
| Worker-to-service routing and internal auth | `worker/src/services/*-service-client.ts`, `worker/src/middleware/credential-oauth-proxy.ts`, `worker/src/api/internal-engine-execute.ts` |
| Generation pipeline and worker graph authority | `worker/src/api/generate-workflow.ts`, `worker/src/services/ai/pipeline/workflow-generation-pipeline.ts`, `worker/src/services/ai/pipeline/backend-finalizer.ts`, `worker/src/core/registry/unified-node-registry.ts`, `worker/src/core/orchestration/unified-graph-orchestrator.ts` |
| Execution queue, consumer, runtime, and watchdog | `services/execution-engine/src/routes/execute.ts`, `services/execution-engine/src/runner/engine-consumer.ts`, `services/execution-engine/src/runner/engine-runner.ts`, `worker/src/api/execute-workflow.ts`, `worker/src/core/execution/dynamic-node-executor.ts`, `worker/src/services/execution/timeout-watchdog.ts` |
| Trigger routing and FIX-2 | `worker/src/api/webhook-trigger.ts`, `worker/src/api/form-trigger.ts`, `worker/src/api/chat-trigger.ts`, `worker/src/services/scheduler/`, `services/trigger-service/src/`, [MICROSERVICES_CUTOVER_COMPLETE.md](../../.claude/logs/MICROSERVICES_CUTOVER_COMPLETE.md) |
| Frontend DB and realtime touchpoints | `ctrl_checks/src/integrations/aws/client.ts`, `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`, `ctrl_checks/src/hooks/useExecutionStatus.ts`, `ctrl_checks/src/hooks/useExecutionWebSocket.ts` |
| WebSocket bridge and notification terminal path | `worker/src/services/ws-redis-bridge.ts`, `worker/src/services/notifications/dispatch-execution-notifications.ts`, `worker/src/services/notification-service-client.ts`, `services/notification-service/src/` |
