# 01 — Launch Requirements

---

## Launch Goals

- Make CtrlChecks safe and stable for the first 500 real concurrent users
- Eliminate the primary crash vector: long workflow executions blocking HTTP threads
- Protect the database from connection exhaustion under load
- Ensure users see live progress of their workflows instead of a frozen screen
- Establish a rollback path so a bad deploy can be undone in under 5 minutes

---

## Non-Goals

- Microservices extraction (Phase 3 of the overall plan — not this launch)
- Multi-region deployment
- AWS ElastiCache or MSK migration
- Adding new AI node types
- Building a new UI design

---

## Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | When a user triggers a workflow, the API must return within 2 seconds with an execution ID and status "queued" |
| FR-02 | The backend must process the workflow asynchronously in a worker |
| FR-03 | Workflow status must be one of: queued, running, success, failed |
| FR-04 | Users must be able to see the current status of any past or live execution |
| FR-05 | Users must receive live updates during workflow execution without manual refresh |
| FR-06 | A user must only be able to see or cancel their own workflow executions |
| FR-07 | Multiple Gemini API keys must be supported for rotation |
| FR-08 | If one Gemini key is rate-limited, the system must retry with another key automatically |
| FR-09 | Heavy backend SDKs (Airtable, Pipedrive, Notion, Twitter, WhatsApp, etc.) must not load at startup |
| FR-10 | Frontend must fall back to polling if WebSocket is unavailable |
| FR-11 | Frontend reconnect after disconnect must not duplicate workflow executions |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | API p95 latency for `/api/execute-workflow` must be under 2 seconds (for the enqueue step, not full execution) |
| NFR-02 | App startup time must not increase after lazy loading changes |
| NFR-03 | WebSocket must work across all 3 backend replicas via Redis pub/sub |
| NFR-04 | PgBouncer must handle 500 concurrent app connections using maximum 50 server-side Postgres connections |
| NFR-05 | Gemini key rotation must never log the actual API key value |
| NFR-06 | Frontend bundle (initial load) must not include the AutonomousAgentWizard chunk |

---

## Performance Requirements

| Metric | Target |
|---|---|
| Concurrent users | 500 |
| API p50 latency (enqueue) | < 500ms |
| API p95 latency (enqueue) | < 2000ms |
| API error rate | < 1% |
| WebSocket reconnect time | < 3 seconds |
| DB connections (server-side, through PgBouncer) | < 50 concurrent |
| Frontend initial bundle size | < 500KB gzipped |
| Worker startup time | < 15 seconds |

---

## Reliability Requirements

| Item | Requirement |
|---|---|
| Execution retry | Failed jobs retry up to 3 times with exponential backoff |
| Execution timeout | Any single workflow execution must time out after 5 minutes |
| Stale lock cleanup | Execution locks older than 10 minutes must be auto-released |
| Queue durability | If worker crashes, Redis-backed queue must preserve pending jobs |
| WebSocket reconnect | Frontend must reconnect automatically after disconnect with exponential backoff |

---

## Security Requirements

| Item | Requirement |
|---|---|
| Auth | Every execution API endpoint must require a valid Cognito JWT |
| Ownership | Users can only read/cancel their own executions (checked server-side) |
| No credential leakage | Gemini keys, OAuth tokens must never appear in logs |
| WebSocket auth | WebSocket connections must validate the auth token before subscribing |
| No user spoofing | User ID must come from the verified JWT, never from the request body |

---

## Observability Requirements

| Item | Requirement |
|---|---|
| Structured logs | Execution lifecycle events (queued, started, completed, failed) must be logged with executionId and userId |
| Queue depth | Metric or log for current number of pending jobs |
| Gemini metrics | Log key index used per request, rate-limit hits, fallback count |
| WebSocket connections | Log count of active WebSocket connections per replica |
| PgBouncer health | PgBouncer must have a health check endpoint in docker-compose |

---

## Testing Requirements

| Item | Requirement |
|---|---|
| Unit tests | All new queue, key rotation, and lazy loading code must have unit tests |
| Integration tests | Execution flow (enqueue → run → status) must have an integration test |
| Load test | k6 load test at 500 VU with documented pass/fail thresholds |
| Smoke tests | Post-deploy smoke test script must verify 5 critical paths |
| No regression | Existing Jest and Vitest tests must pass before and after changes |

---

## Deployment Requirements

| Item | Requirement |
|---|---|
| Low-traffic window | Deploy during weekend night or early morning |
| Zero-downtime | nginx load balancer must remain alive during rolling deploy |
| Runbook | Deployment steps must be documented before deploy begins |
| Environment variable checklist | Every new env var must be verified present before deploy |
| Rollback | Rollback must be executable in under 5 minutes |

---

## Rollback Requirements

- Rollback must not require a database migration (down migrations must exist)
- Previous Docker image tag must be available to re-deploy
- Rollback decision criteria must be documented before deploy

---

## Acceptance Criteria

All items below must be true before launch is declared complete:

- [ ] POST `/api/execute-workflow` returns within 2 seconds with `executionId` and `status: "queued"`
- [ ] Users can see workflow status change from queued → running → success/failed
- [ ] Backend app starts without loading Airtable, Pipedrive, Notion, Twitter, WhatsApp, Instagram SDKs
- [ ] Gemini key rotation works: if key 1 is rate-limited, request succeeds with key 2
- [ ] Gemini API key values do not appear in any log output
- [ ] PgBouncer is running in docker-compose and app connects through port 6432
- [ ] 500 concurrent users: DB connection count stays below 50
- [ ] `AutonomousAgentWizard.tsx` is NOT included in the initial app bundle
- [ ] Frontend bundle size check is in package.json scripts
- [ ] WebSocket updates arrive on all 3 replicas when execution event fires
- [ ] Frontend reconnects cleanly after 10-second disconnect test
- [ ] k6 load test at 500 VU passes with p95 < 2s and error rate < 1%
- [ ] Launch runbook document exists and has been reviewed
- [ ] Post-deploy smoke tests all pass
- [ ] Rollback steps are documented and tested in staging
