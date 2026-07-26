# CtrlChecks Client Architecture

Prepared for client review  
Project: CtrlChecks AI Workflow Automation Platform  
Date: 2026-07-26

## 1. Executive Summary

CtrlChecks is an AI-assisted workflow automation platform. Users can create, configure, execute, and monitor workflows that connect business applications, databases, messaging tools, social platforms, and AI services.

The platform is built as a web application with a React frontend, a Node.js/TypeScript backend worker, supporting microservices, PostgreSQL database storage, Redis/Kafka queue infrastructure, and AI generation services.

## 2. High-Level Architecture

```text
User Browser
    |
    v
Frontend Web App
React + TypeScript + Vite
    |
    v
Backend API / Worker
Node.js + Express + TypeScript
    |
    +--> Workflow CRUD Service
    +--> Trigger Service
    +--> Credential Service
    +--> Execution Engine
    +--> Notification Service
    +--> AI Generator Service
    |
    +--> PostgreSQL / AWS RDS
    +--> Redis
    +--> Kafka
    +--> External Integrations
    +--> AI Providers / Ollama / OpenAI-compatible services
```

## 3. Main System Components

### Frontend Application

Location: `ctrl_checks/`

Purpose:
- Provides the web user interface.
- Supports workflow creation and editing.
- Displays visual workflow nodes and connections.
- Handles user interaction for credentials, workflow runs, execution status, and documentation/search content.

Technology:
- React 18
- TypeScript
- Vite
- Tailwind CSS / shadcn-style UI components
- React Router
- TanStack Query
- Zustand
- XYFlow / React Flow for workflow canvas
- Playwright and Vitest for frontend testing

### Backend Worker

Location: `worker/`

Purpose:
- Main backend API layer.
- Handles workflow generation, validation, execution orchestration, credentials, OAuth flows, billing hooks, node catalog APIs, and runtime status APIs.
- Coordinates with external systems and internal microservices.

Technology:
- Node.js
- Express
- TypeScript
- Prisma/PostgreSQL
- Redis
- Kafka
- WebSocket support
- Sentry and Prometheus metrics

### Microservices

Location: `services/`

Services:
- `workflow-crud-service`: Owns workflow save, load, template, and version operations.
- `trigger-service`: Handles webhook, form, chat, and scheduled triggers.
- `credential-service`: Handles credential vault, connection CRUD, and OAuth callback flows.
- `execution-engine`: Runs workflow execution pipeline responsibilities.
- `notification-service`: Handles email, in-app, and webhook notifications.
- `ai-generator`: Hosts extracted AI workflow generation responsibilities.

Purpose:
- Separates critical platform responsibilities.
- Allows future scaling and independent deployment.
- Reduces risk in the main worker service by moving bounded capabilities into services.

### Data Layer

Primary database:
- PostgreSQL, with AWS RDS referenced in production infrastructure.

Connection pooling:
- PgBouncer is used in production-style Docker infrastructure.

Caching and runtime state:
- Redis is used for queues, cache, and execution/event coordination.

Messaging:
- Kafka is used for request queueing and dead-letter handling.

### Infrastructure Layer

Infrastructure files:
- `infra/docker-compose.yml`
- `infra/nginx.conf`
- `infrastructure/terraform/`

Runtime infrastructure includes:
- Nginx load balancing
- Multiple backend app replicas
- Redis
- Kafka and Zookeeper
- PgBouncer
- AWS RDS PostgreSQL
- Terraform modules for VPC, EC2, ALB, CloudFront, S3, Route53, IAM, and CloudWatch

## 4. Core Functional Flow

### Workflow Creation Flow

```text
User enters workflow requirement
    |
Frontend sends request to backend
    |
AI generation pipeline interprets user intent
    |
Node selection and workflow structure are generated
    |
Validation checks workflow completeness and correctness
    |
Workflow is returned to frontend canvas
    |
User reviews, edits, and saves workflow
```

### Workflow Execution Flow

```text
User or trigger starts workflow
    |
Backend validates workflow and credentials
    |
Execution job is queued or executed
    |
Execution engine processes each node
    |
External APIs/databases are called as required
    |
Logs and status are stored
    |
Frontend receives execution status and results
```

### Credential Flow

```text
User connects external application
    |
OAuth/API credential flow starts
    |
Credential service stores connection metadata securely
    |
Workflow runtime retrieves authorized connection
    |
Node execution uses credential to call external API
```

## 5. Deployment View

Development deployment:
- Frontend runs locally through Vite.
- Worker runs locally on Node.js/Express.
- Environment variables configure database, AI service, and API URLs.

Production-style deployment:
- Nginx load-balances multiple worker replicas.
- Redis provides cache and queue support.
- Kafka provides durable async queueing.
- PgBouncer pools PostgreSQL connections.
- PostgreSQL runs on AWS RDS.
- Terraform defines AWS network, compute, load balancer, CDN, storage, DNS, monitoring, and IAM resources.

## 6. Security Considerations

Expected security controls:
- Environment variables for secrets and credentials.
- No committed `.env` files.
- Service role keys kept server-side only.
- OAuth flows for connected third-party apps.
- Authentication middleware on protected APIs.
- Rate limiting in backend services.
- Helmet/CORS protections in Express.
- Audit/security event APIs in backend.
- Sentry/metrics hooks for production visibility.

Client-facing note:
- Production secrets, OAuth client IDs, API keys, database passwords, and service role keys should be shared only through a secure secret manager or approved encrypted channel.

## 7. Observability and Operations

Implemented or prepared capabilities:
- Health endpoints: `/health`, `/health/live`, `/health/ready`
- Metrics endpoints: `/metrics`
- Prometheus client support
- Grafana dashboard files under `infra/grafana/`
- Sentry packages in frontend and backend
- Execution logs and workflow status APIs
- Kafka dead-letter topic support

## 8. External Integrations

The platform contains support for many integration categories, including:
- Google services
- Slack and Microsoft Teams
- Notion
- GitHub
- LinkedIn, Facebook, Instagram, WhatsApp, X/Twitter, YouTube
- HubSpot, Salesforce, Zoho CRM, Pipedrive
- Shopify, Stripe, PayPal, QuickBooks, Xero
- MySQL, PostgreSQL, MongoDB, Firebase, Supabase, Oracle, SQL Server
- Email providers and webhook-based services
- AI providers and local/remote Ollama-style services

Actual production availability depends on configured credentials, OAuth apps, API access approval, and enabled node definitions.

## 9. Recommended Client Deliverables

For a complete client handover, provide:

1. Architecture document  
   Explains system components, deployment, security, data flow, and responsibilities.

2. Tech stack document  
   Lists frontend, backend, database, infrastructure, testing, monitoring, and third-party services.

3. API and SDK handover document  
   Lists API base URLs, authentication method, endpoint groups, request/response expectations, webhook format, error format, and integration examples.

4. Deployment and environment document  
   Explains how to configure `.env` files, start services, deploy frontend/backend, run migrations, and verify health.

5. User/admin guide  
   Explains how users create workflows, connect credentials, run workflows, view logs, and troubleshoot common issues.

6. Security and credential handover  
   Lists required secrets without exposing actual secret values in the document.

7. Testing and QA report  
   Shows what was tested, known limitations, and acceptance checklist.

8. Maintenance handover  
   Explains monitoring, backups, logs, rollback, support contacts, and future roadmap.

## 10. Current Project Notes

This repository already contains many internal engineering documents. For client sharing, use short curated documents instead of sharing all internal notes. Recommended client-ready files from this pack:
- `docs/CLIENT_ARCHITECTURE.md`
- `docs/CLIENT_TECH_STACK_AND_HANDOVER.txt`
- `docs/SDK_API_HANDOVER_TEMPLATE.md`

