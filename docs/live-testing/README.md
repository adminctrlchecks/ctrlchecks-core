# CtrlChecks Live Testing Program

**Policy:** All heavy testing runs on the **live server** (`worker.ctrlchecks.com` / `187.127.185.105`), never on a local laptop.

**Goal:** End-to-end validation of platform flows, OAuth connections, credential readiness gates, and nodes — phased, not all at once.

**Framework:** Use [gstack](https://github.com/garrytan/gstack) skills from `.claude/gstack/`:
- `/qa` — systematic web app QA
- `/browse` — headless browser for UI flows
- `/canary` — post-deploy monitoring
- `/investigate` — root-cause on failures

---

## Phase Index

| Phase | Doc | What it validates | Gate to proceed |
|-------|-----|-------------------|-----------------|
| **0** | [PHASE-0-CREDENTIALS-INVENTORY.md](./PHASE-0-CREDENTIALS-INVENTORY.md) | Collect & verify all credentials needed | Checklist 100% for Tier-1 infra |
| **1** | [PHASE-1-INFRASTRUCTURE-SMOKE.md](./PHASE-1-INFRASTRUCTURE-SMOKE.md) | Health, auth, deploy, metrics, Sentry | All smoke scripts PASS |
| **2** | [PHASE-2-PLATFORM-STAGE-FLOW.md](./PHASE-2-PLATFORM-STAGE-FLOW.md) | Wizard stages, missing-items API, run blocked without connection | Stage flow PASS |
| **3** | [PHASE-3-OAUTH-CONNECTIONS.md](./PHASE-3-OAUTH-CONNECTIONS.md) | Every OAuth provider connect + test + reconnect | Provider matrix PASS |
| **4** | [PHASE-4-NODES-BY-TIER.md](./PHASE-4-NODES-BY-TIER.md) | Nodes in tiers (not all 500 at once) | Tier N PASS before Tier N+1 |
| **5** | [PHASE-5-COMPLEX-WORKFLOWS.md](./PHASE-5-COMPLEX-WORKFLOWS.md) | Multi-node, branching, AI-generated workflows | Complex suite PASS |

---

## Server-Only Rule

| Allowed locally | Forbidden locally |
|-----------------|-------------------|
| `npm run type-check` | `npm test` (full Jest suite) |
| `npm run lint` | `npm run test:contracts` (3,400+ assertions) |
| Edit test scripts | Playwright against staging |
| Git commit / push | Load tests |

**Run on server:**

```bash
ssh root@187.127.185.105
cd /opt/ctrlchecks-worker   # or your deploy path
# see per-phase scripts in scripts/live-testing/
```

---

## Existing Repo Assets

| Asset | Location | Use |
|-------|----------|-----|
| Type-2 OAuth workflow JSONs | `testing/google/`, `testing/social/`, etc. | Import & run per provider |
| Type-2 guide | `testing/TESTING_GUIDE.md` | Manual OAuth node steps |
| Live E2E harness | `worker/scripts/live-e2e-harness.ts` | Save → execute → cleanup |
| Webhook payloads | `worker/testing/payloads/` | Trigger-based workflows |
| Missing-items API | `GET /api/workflows/:id/missing-items` | Credential gate before run |
| Execution preflight | `executionPreflight()` in execute path | Blocks run if OAuth missing |
| Deploy script | `scripts/deploy-worker.py` | Windows deploy to Hostinger |

---

## Results Log

Create one row per phase in `.claude/logs/LIVE-TEST-RESULTS.md` as you complete each phase.

---

## Start Here

1. Read **Phase 0** — fill credential checklist on server.
2. Give Claude the prompt in [PROMPT-START-LIVE-TESTING.md](./PROMPT-START-LIVE-TESTING.md).
3. Complete phases in order; do not skip gates.
