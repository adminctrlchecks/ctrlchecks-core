## Project Architecture Documentation

## 1. Executive Summary
- **Overview**: CtrlChecks is an AI-first workflow automation platform that turns natural-language prompts into validated, executable workflow graphs over SaaS, data, and communication systems.
- **Core Purpose**: Enable non-technical and technical users to design, generate, and operate complex, multi-system workflows with AI-assisted planning, deterministic compilation, and robust runtime execution.
- **Problem Solved**: Eliminates brittle, hand-built automations by providing an intent-to-execution pipeline with strong validation, node registries, credential management, and distributed execution.
- **Architecture Style**: Modular monolith with distributed execution, registry-driven node system, and AI/agent-driven workflow planning and validation.

## 2. System Architecture Overview
- **Architecture Pattern**
  - Modular monolith (single codebase) with clearly separated frontend, worker backend, and external AI service.
  - Node- and registry-based workflow engine with DSL compiler and deterministic pipeline.
- **Design Principles**
  - Single sources of truth: unified node registry, node library, validation pipeline.
  - AI-assisted but compiler-enforced: AI proposes, deterministic systems validate and repair.
  - Backward compatibility and migrations for existing workflows.
  - Strong typing (TypeScript), schema-based validation, and capability-based routing.
- **Scalability Strategy**
  - Horizontally scalable worker service behind a load balancer.
  - Redis-backed distributed execution for long-running and parallel workflows.
  - Stateless API layer, with Supabase/PostgreSQL for durable state and Redis for transient state.
- **Reliability Strategy**
  - Multi-layer validation (DSL, compilation, workflow lifecycle, runtime) to prevent invalid graphs.
  - Retryable vs structural error classification with deterministic fail-fast rules.
  - Checkpointed execution and node-level error isolation.
- **Security Model**
  - Supabase Auth (JWT) for end-user identity and RLS-enforced data access.
  - OAuth token storage in dedicated tables with optional encryption.
  - Strict separation of secrets (.env, service role keys) from frontend; backend-only access.

## 3. High-Level Architecture Diagram (Text Representation)
- **Logical Flow**
  - User (Browser) → Frontend (React SPA) → Worker API (Express) → AI Workflow Engine → Node Execution Engine → Supabase (Postgres) / Redis
  - User (Browser) → Frontend → Worker API → FastAPI Ollama Service → LLM Providers
- **Text Diagram**
  - User → Frontend (ctrl_checks) → Worker API Layer (`/api/*`) → Workflow Orchestrator → Node Registry & Executors → Supabase DB
                                                           ↓
                                                       AI Pipeline
                                        (FastAPI Ollama + external LLMs)

## 4. Core Components Breakdown

### 4.1 Frontend Layer (`ctrl_checks/`)
- **Tech Stack**
  - React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Zustand + React Query.
- **Responsibilities**
  - Auth, session, and role-aware UI via Supabase.
  - Workflow browsing, visual graph editing, and AI workflow builder UX.
  - Configuration of nodes (credentials, inputs), execution triggering, and monitoring.
- **State Management**
  - Zustand stores for global workflow state and UI flags.
  - Finite-state machine for workflow generation lifecycle (prompt → questions → DSL → graph).
  - React Query for API data fetching and caching.
- **API Communication Flow**
  - Uses `config/endpoints.ts` for base URLs and versioning.
  - REST calls to worker (`/api/generate-workflow`, `/api/execute-workflow`, `/api/chat-api`, etc.).
  - Supabase JS client for auth and selected data operations (profiles, roles, real-time).

### 4.2 Backend Layer (`worker/`)
- **Framework**
  - Node.js + Express + TypeScript; entrypoint `src/index.ts`.
- **Routing Structure**
  - `src/api/*.ts` as discrete route handlers (generate-workflow, execute-workflow, chatbot, triggers, credentials, versioning).
  - Routes wired centrally in the Express server with shared middleware.
- **Middleware**
  - CORS and JSON parsing.
  - Supabase JWT verification for protected endpoints.
  - Central error handler wrapping async handlers and emitting structured errors.
- **Validation Layer**
  - Zod and custom validators for request bodies.
  - Schema-based workflow validation (`workflowValidator`, validation pipeline, DSL validators).
  - Unified node registry and node library enforcing input/output schemas at config and runtime.

### 4.3 AI/Processing Engine (`worker/src/services/ai` + `Fast_API_Ollama/`)
- **Model Interaction Flow**
  - Worker calls remote FastAPI Ollama service for primary LLM tasks (prompt understanding, planning, refinement), with optional fallbacks to OpenAI/Anthropic/Gemini.
  - Circuit-breakers and retry utilities on the Python side; timeouts and error classification on the Node side.
- **Prompt Handling**
  - Prompt understanding → intent structuring → capability and category mapping → DSL generation.
  - Phased refine/analyze/create modes for questions, requirements extraction, and final workflow build.
- **Tool Calling / Node Planning**
  - Capability and category mapping systems translate business concepts (e.g., "CRM", "Education") into candidate node types.
  - Smart Planner and node-type normalization resolve aliases and categories into canonical node IDs.
  - Planner outputs high-level node specs; pipeline/compiler resolve to concrete nodes via registry and node library.
- **Agent Loop**
  - Production workflow builder uses deterministic retries based on validation feedback (structural vs transient errors).
  - Optional FixAgent performs post-generation diagnostics and deterministic auto-fixes, with confidence scoring.

### 4.4 Database Layer (Supabase / PostgreSQL)
- **DB Type**
  - Managed Supabase PostgreSQL with pgvector for embedding-based memory.
- **Schema Philosophy**
  - JSONB-based workflow storage (`workflows`), normalized execution tables (`executions`, `execution_steps`).
  - Dedicated tables for OAuth tokens, user profiles, roles, and AI memory references.
  - Migrations managed via SQL files in `ctrl_checks/sql_migrations` and Supabase migration folders.
- **Indexing Strategy**
  - B-tree indexes on workflow IDs, user IDs, and timestamps for query paths.
  - Vector indexes for similarity search on memory/embedding tables.
- **Scaling Approach**
  - Supabase horizontal scaling and connection pooling.
  - Read/write separation via service role keys where appropriate (backend-only).

### 4.5 Workflow/Orchestration Engine (`worker/src/services/ai` + `worker/src/core` + `worker/src/services/workflow-executor`)
- **Execution Flow**
  - API → WorkflowLifecycleManager → WorkflowPipelineOrchestrator → DSL generator/compiler → ProductionWorkflowBuilder → validated workflow graph.
  - Runtime execution via dynamic-node executor (registry-based) with legacy executor fallback.
- **Node Processing Lifecycle**
  - Node schemas and capabilities loaded from NodeLibrary into unified registry.
  - Config migration, template resolution, and schema validation applied per node.
  - Node executed with resolved inputs and upstream outputs; cleaned outputs stored in execution context.
- **Error Handling**
  - Structural errors fail fast at DSL or validation stages; transient errors enable controlled retries.
  - Node execution returns structured `_error` payloads with optional validation details.
  - Planner and lifecycle manager gracefully degrade when smart features fail (fall back to legacy or conservative defaults).
- **Retry Mechanisms**
  - Pipeline-level retries based on validation pipeline classification (retryable vs non-retryable).
  - Distributed execution worker retries jobs based on queue configuration and node idempotency.

## 5. End-to-End Request Flow
1. User authenticates via Supabase and opens the workflow builder in the frontend.
2. Frontend sends a prompt and context to `POST /api/generate-workflow` on the worker.
3. Worker validates the request, enriches context (memory, prior workflows), and invokes the AI pipeline.
4. AI/logic stack (planner + DSL + compiler + validators) produces a validated workflow graph and required credentials/inputs.
5. Frontend renders the graph, user configures nodes, then triggers `POST /api/execute-workflow` to start execution.
6. Worker executes nodes (locally or distributed), updates execution records, and returns structured responses while emitting logs and metrics.

## 6. Data Flow Architecture
- **Input Validation Flow**
  - HTTP-level validation (Zod + route checks) → DSL and structured intent validators → workflow validation pipeline → registry-based node config validation.
- **Transformation Flow**
  - Prompt → StructuredIntent → DSL → Workflow Graph → Node configs resolved via templates and AI input resolver.
- **Storage Flow**
  - Workflows and versions stored as JSONB; executions and steps persisted with inputs/outputs metadata.
  - OAuth tokens and user metadata stored in dedicated tables with RLS and optional encryption.
- **Output Serialization Flow**
  - Node outputs normalized via schema-aware cleaners, aggregated into execution responses, then serialized as compact JSON to the frontend.

## 7. State Management Strategy
- **Stateless vs Stateful**
  - API layer and workers are stateless; all durable state lives in Supabase and Redis.
- **Session Handling**
  - Supabase JWT in frontend; backend validates per request without server-side sessions.
  - Frontend stores minimal session state (tokens, user profile) and refreshes via Supabase client.
- **Caching Layer**
  - Redis used for job queues, execution checkpoints, and hot-path data where enabled.
  - In-process LRU caches for node outputs and certain AI intermediate results.

## 8. Error Handling & Observability
- **Logging System**
  - Structured logs in worker for each pipeline stage, node execution, planner decision, and credential discovery.
  - Debug logs for node-type resolution, DSL failures, and AI fallbacks.
- **Monitoring**
  - Health endpoints on worker and FastAPI Ollama for liveness checks.
  - Metrics collection in Python service (latency, error rates, GPU usage).
- **Retry Logic**
  - Explicit retry policies in production workflow builder and distributed executor.
  - Clear separation between structural errors (no retry) and transient errors (bounded retries).
- **Circuit Breaker**
  - FastAPI Ollama service includes circuit breaker utilities to avoid cascading LLM failures.
- **Metrics Collection**
  - Python metrics module for AI service; worker-side metrics hooks for pipeline results and validation outcomes.

## 9. Performance Optimization Strategy
- **Async Handling**
  - Async/await throughout API and services; non-blocking I/O for DB and HTTP calls.
- **Parallelism**
  - Parallel node execution when graph topology allows; distributed workers consuming from Redis queues.
- **DB Optimization**
  - Targeted indexes, JSONB for flexible workflow storage, and minimized round-trips via batched queries.
- **Caching**
  - Node output caches and AI response reuse where safe; frontend caching via React Query.
- **Rate Limiting**
  - Designed to sit behind API gateways or reverse proxies with rate limits; internal safeguards against runaway AI calls.

## 10. Security Architecture
- **Authentication Method**
  - Supabase Auth with JWT access tokens validated on each backend request.
- **Authorization Model**
  - Role-based access control (`admin`, `moderator`, `user`) enforced via database roles and RLS.
- **API Protection**
  - CORS restrictions, JWT checks, and conservative error surfaces (no sensitive details in responses).
- **Data Encryption**
  - TLS in transit (via deployment platform) and optional encryption-at-rest for OAuth tokens and secrets.
- **Secrets Management**
  - `.env`-based configuration for local/dev; external secret stores recommended for production (e.g., AWS SSM/Secrets Manager).

## 11. Deployment Architecture
- **Containerization**
  - Dockerfiles for worker, frontend, and FastAPI Ollama service, enabling reproducible builds.
- **CI/CD Flow**
  - Intended Git-based pipelines (e.g., GitHub Actions) building and deploying containers, plus Vercel for frontend.
- **Environment Separation**
  - Distinct env configs for local, staging, and production; Supabase projects per environment.
- **Infrastructure**
  - Frontend on Vercel or static hosting; worker on AWS/self-hosted Node runtime; FastAPI Ollama on GPU-enabled VM behind Nginx; Supabase as managed Postgres+Auth.

## 12. Scalability Model
- **Horizontal Scaling**
  - Multiple worker instances behind a load balancer; multiple stateless FastAPI instances behind Nginx.
- **Vertical Scaling**
  - Larger VM instances for AI workloads (GPU, RAM) and database instances sized based on throughput.
- **Load Balancing**
  - HTTP load balancers in front of worker and AI services; Supabase-native scaling for DB and auth.
- **Queue Systems**
  - Redis-backed job queues for workflow execution, enabling independent scaling of producers and consumers.

## 13. Future Extensibility
- **Plugin Architecture**
  - NodeLibrary and unified node registry allow adding new node types, capabilities, and categories without touching core engine logic.
- **Modular Growth Points**
  - Additional planners, validators, and execution strategies plug into existing pipeline orchestration.
  - New AI providers and tools integrated via the AI gateway and node definitions.
- **Planned Improvements**
  - Deeper observability (tracing), richer FixAgent memory store, dynamic category discovery, and more granular multi-tenant controls.

