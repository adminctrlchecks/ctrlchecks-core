# SDK / API Handover Template

Prepared for client integration and technical handover.

## 1. Purpose

This document defines the information that should be provided when the client needs to integrate with CtrlChecks through API, SDK, webhook, or automation interfaces.

## 2. API Base URLs

Fill before delivery:

```text
Development API URL:
Staging API URL:
Production API URL:
Frontend URL:
Webhook Base URL:
```

## 3. Authentication

Expected authentication methods:
- User/session authentication for application users.
- Server-side service credentials for protected backend actions.
- OAuth-based authorization for third-party connected apps.
- Optional internal service authentication for microservice-to-microservice calls.

Fill before delivery:

```text
Auth provider:
Token type:
Token expiry:
Refresh method:
Required headers:
```

Common header format:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 4. API Groups

### Health and Monitoring

Purpose:
- Verify service availability.
- Support load balancer and monitoring checks.

Common endpoints:

```text
GET /health
GET /health/live
GET /health/ready
GET /metrics
```

### Workflow APIs

Purpose:
- Create, save, load, validate, execute, and transfer workflows.

Expected capabilities:
- Workflow CRUD
- Template usage
- Version history
- Execution status
- Execution logs
- Workflow ownership transfer

### AI Workflow Generation APIs

Purpose:
- Convert user intent into workflow structures.
- Validate generated workflow configuration.
- Support workflow improvement/editing flows.

Expected input:

```json
{
  "prompt": "Create a workflow that sends new Stripe payments to Google Sheets",
  "userId": "user_id",
  "context": {}
}
```

Expected output:

```json
{
  "workflow": {
    "nodes": [],
    "edges": []
  },
  "summary": "Generated workflow summary",
  "warnings": []
}
```

### Credential and Connection APIs

Purpose:
- List credential types.
- Start OAuth flows.
- Store or update connections.
- Test connections.
- Disconnect integrations.

Expected capabilities:
- Connection catalog
- Connection status
- OAuth start/callback
- Credential test
- Credential delete

### Trigger APIs

Purpose:
- Start workflows from external events.
- Support webhooks, schedules, forms, and chat-style triggers.

Example webhook payload:

```json
{
  "event": "new_record",
  "source": "external_system",
  "payload": {}
}
```

### Execution APIs

Purpose:
- Start workflow runs.
- Check execution status.
- Cancel queued/running jobs.
- Retrieve logs.

Expected execution states:

```text
queued
running
succeeded
failed
cancelled
```

### Notification APIs

Purpose:
- Send workflow notifications.
- Deliver email, in-app, and webhook notifications.

## 5. Error Response Format

Recommended standard:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "request_id"
  }
}
```

## 6. Rate Limits

Fill before delivery:

```text
Default per-user limit:
Default per-IP limit:
Burst limit:
Workflow execution limit:
AI generation limit:
```

## 7. Webhook Requirements

Client should provide:
- Webhook target URL
- Event list
- Retry policy
- Signing secret requirement
- IP allowlist requirement, if any
- Sample payloads

Platform should provide:
- Webhook endpoint URL
- Authentication/signature format
- Retry behavior
- Failure response handling
- Timeout limit

## 8. SDK Package Format

If a formal SDK is required, provide these sections:

```text
Package name:
Supported language:
Installation command:
Initialization example:
Authentication example:
Workflow create example:
Workflow execute example:
Webhook verification example:
Error handling example:
Version compatibility:
Release notes:
```

Example JavaScript/TypeScript SDK usage:

```ts
import { CtrlChecksClient } from "@ctrlchecks/sdk";

const client = new CtrlChecksClient({
  apiKey: process.env.CTRLCHECKS_API_KEY,
  baseUrl: process.env.CTRLCHECKS_API_URL,
});

const workflow = await client.workflows.create({
  name: "Stripe to Sheets",
  prompt: "Send new Stripe payments to Google Sheets",
});

const run = await client.workflows.execute(workflow.id);
```

## 9. Environment Variables

Document names only. Do not include secret values in this file.

Frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_API_URL
VITE_PYTHON_BACKEND_URL
```

Backend:

```text
DATABASE_URL
DIRECT_DATABASE_URL
REDIS_URL
KAFKA_BROKERS
KAFKA_REQUEST_TOPIC
KAFKA_DEAD_LETTER_TOPIC
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OLLAMA_HOST
OLLAMA_BASE_URL
FASTAPI_OLLAMA_URL
PYTHON_BACKEND_URL
PORT
CORS_ORIGIN
SENTRY_DSN
```

## 10. Final Client Handover Checklist

- Architecture document approved.
- Tech stack document approved.
- API base URLs confirmed.
- Authentication method confirmed.
- Environment variable names documented.
- Secrets transferred securely.
- OAuth app ownership confirmed.
- Production deployment URL confirmed.
- Health checks verified.
- Monitoring dashboard shared.
- Backup and restore process documented.
- Known limitations documented.
- Client acceptance checklist signed off.

