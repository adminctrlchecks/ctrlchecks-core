# Deployment — Local and Hostinger

Read from `scripts/`, `.github/workflows/`, and service config. Live server state is
**[UNVERIFIED]** from the repository; §4 lists the commands that would confirm it.

---

## 1. Local development

Entry point: `.\scripts\dev-start-all.bat` — opens six terminals and runs the worker in the
current one.

| # | Process | Port | Started from |
|---|---|---|---|
| 1 | ai-generator | 3002 | `services/ai-generator` |
| 2 | execution-engine | 3003 | `services/execution-engine` |
| 3 | credential-service | 3004 | `services/credential-service` |
| 4 | notification-service | 3005 | `services/notification-service` |
| 5 | trigger-service | 3006 | `services/trigger-service` |
| 6 | workflow-crud-service | 3007 | `services/workflow-crud-service` |
| 7 | **worker** | 3001 | `worker/` — logs in the launching window |

Frontend runs separately (`ctrl_checks/`, `npm run dev`).

Prerequisites per the script: Redis in Docker
(`docker run -d --name redis-local -p 6379:6379 redis:alpine`), `.env` in every package,
`npm install` in `worker/`, `ctrl_checks/`, and each `services/*`.

### The fallback makes partial stacks look healthy

Because the worker falls back in-process, **running only `worker/` produces a working
system.** Anything you test that way exercises different code than the full stack — most
notably a different LLM model (SYSTEM-ARCHITECTURE §7.1). When a bug reproduces one way and
not the other, check which processes are actually up before assuming the code changed.

---

## 2. Production — Hostinger

### Two ways to deploy — and one of them was broken

There are **two independent deploy paths**, and they had drifted apart:

| Path | Trigger | Status |
|---|---|---|
| `.github/workflows/deploy-*.yml` | push to `master`, path-filtered | targets Hostinger ✅ |
| `scripts/deploy-*.sh` | run by hand from a laptop | **7 of 8 targeted a dead AWS EC2 host** |

Only `scripts/deploy-worker.sh` had been migrated to Hostinger
(`root@187.127.185.105`, key `~/.ssh/id_ed25519`). The other seven still pointed at
`ubuntu@3.7.115.58` with a PEM key — an EC2 box that no longer answers, so every one of them
failed with `ssh: connect to host 3.7.115.58 port 22: Connection timed out`.

The six backend service scripts have been repointed to match the worker's working
configuration. **`scripts/deploy-frontend.sh` was deliberately left alone** — it also targets
EC2 *and* `/var/www/ctrlchecks-frontend`, but the frontend actually deploys to **Vercel** on
push to master. Repointing it would aim at a path that may not exist on Hostinger; the script
appears superseded and should probably be deleted rather than fixed.

**Lesson worth keeping:** when a host changes, both paths need updating. The CI path was
fixed and the manual path silently rotted, which is invisible until someone deploys by hand.

### Pipeline

Each service has its own workflow in `.github/workflows/`, all with the same shape:

```
push (path-filtered)
  → npm ci, type-check, lint, build
  → tar the build
  → scp to secrets.HOSTINGER_HOST using secrets.DEPLOY_SSH_KEY
  → on the box:
       back up dist/ → dist.bak
       extract, npm ci --omit=dev
       (worker only) npx prisma migrate deploy
       systemctl restart ctrlchecks-<service>
```

The worker's workflow includes a rollback path that restores `dist.bak` and restarts.

### Install locations

| Service | Path | systemd unit |
|---|---|---|
| worker | `/opt/ctrlchecks-worker` | `ctrlchecks-worker` |
| ai-generator | `/opt/ctrlchecks-ai-generator` | `ctrlchecks-ai-generator` |
| execution-engine | `/opt/ctrlchecks-execution-engine` | `ctrlchecks-execution-engine` |
| credential-service | `/opt/ctrlchecks-credential-service` | `ctrlchecks-credential-service` |
| notification-service | `/opt/ctrlchecks-notification-service` | `ctrlchecks-notification-service` |
| trigger-service | `/opt/ctrlchecks-trigger-service` | `ctrlchecks-trigger-service` |
| workflow-crud-service | `/opt/ctrlchecks-workflow-crud-service` | `ctrlchecks-workflow-crud-service` |

Unit files: `scripts/ctrlchecks-*.service`. Typical contents:

```ini
Type=simple
User=ubuntu
WorkingDirectory=/opt/ctrlchecks-ai-generator
ExecStart=/usr/bin/node dist/index.js
EnvironmentFile=/opt/ctrlchecks-ai-generator/.env
Restart=always
RestartSec=10
MemoryMax=1G
After=network.target ctrlchecks-worker.service
```

Logs go to journald: `journalctl -u ctrlchecks-<service>`.

⚠️ **`worker/ecosystem.config.js` (PM2) does not describe production.** Production is
systemd. The PM2 file is local/legacy — do not tune production memory or restart behaviour
there.

⚠️ `User=ubuntu` in the units may not match the actual deploy user. **[UNVERIFIED]**

### Frontend

Deployed separately via Vercel (`.github/workflows/deploy-frontend.yml`,
`DEPLOY_URL=$(vercel ...)`), serving `https://www.ctrlchecks.ai`. It is a static SPA and is
**not** on the Hostinger box.

---

## 3. What `infra/` is — and is not

`infra/` holds `docker-compose.yml`, `nginx.conf`, `k8s-hpa.yaml`, `prometheus/`, `grafana/`.

`infra/nginx.conf` load-balances **three replicas of the worker**:

```nginx
upstream ctrlchecks_app { least_conn; server app1:3001; server app2:3001; server app3:3001; }
upstream ctrlchecks_ws  { ip_hash;   server app1:3001; server app2:3001; server app3:3001; }
```

It routes to **no service**. This is a containerised, horizontally-scaled design for the
monolith — a different topology from the systemd-on-Hostinger one above. Treat `infra/` as
aspirational until someone confirms otherwise. **[UNVERIFIED]**

---

## 4. Live state — VERIFIED on the box

Confirmed by SSH to `root@187.127.185.105`. Commands used:

```bash
systemctl list-units 'ctrlchecks-*' --no-pager
ss -ltnp | grep -E '300[1-7]'
grep -E 'AI_GENERATOR_URL|CREDENTIAL_SERVICE_URL|WORKFLOW_CRUD_SERVICE_URL' \
  /opt/ctrlchecks-worker/.env
```

### All seven services are running

`ctrlchecks-worker`, `ai-generator`, `credential-service`, `execution-engine`,
`notification-service`, `trigger-service`, `workflow-crud-service` — all
`loaded active running` under systemd.

### Delegation IS enabled in production

```
AI_GENERATOR_URL=http://localhost:3002
AI_GENERATOR_URL=http://localhost:3002     ← duplicated line in .env
CREDENTIAL_SERVICE_URL=http://localhost:3004
WORKFLOW_CRUD_SERVICE_URL=http://localhost:3007
```

So production genuinely distributes work across processes — the earlier concern that the six
services might be idle is **disproven**. Note the duplicated `AI_GENERATOR_URL`: harmless
today because both values match, but it means something appended to `.env` without checking,
and a future edit to only one line would produce a silent, hard-to-spot divergence.

### Port bindings — one is inconsistent and worth attention

| Port | Service | Bound to | |
|---|---|---|---|
| 3001 | worker | `0.0.0.0` | public — correct, this is the API |
| 3003 | execution-engine | `127.0.0.1` | localhost only ✅ |
| 3004 | credential-service | `127.0.0.1` | localhost only ✅ |
| 3005 | notification-service | `127.0.0.1` | localhost only ✅ |
| 3006 | trigger-service | `127.0.0.1` | localhost only ✅ |
| 3007 | workflow-crud-service | `127.0.0.1` | localhost only ✅ |
| **3002** | **ai-generator** | **`*` (all interfaces)** | ⚠️ **see below** |

**`ai-generator` is the only internal service bound to all interfaces.** Every other one is
correctly restricted to loopback. The worker reaches it at `http://localhost:3002`, so the
external binding serves no purpose.

Why it matters: ai-generator executes arbitrary prompts against Gemini and, from its route
list, carries no authentication middleware. If port 3002 is reachable from the internet,
anyone who finds it can spend your LLM budget. Confirm from *outside* the box:

```bash
curl -m 5 http://187.127.185.105:3002/health    # from your laptop, NOT the server
```

**Tested — the port is NOT reachable from the internet.** `curl` returned
`(28) Connection timed out after 5003 milliseconds`. A timeout (rather than "connection
refused") means packets are being dropped by a firewall, not that nothing is listening. So a
firewall is covering for the binding and there is no live exposure.

Severity is therefore **low, not urgent** — but the fix is still worth shipping, because the
firewall is currently the *only* control. A rule change or host migration would re-expose an
unauthenticated, billable endpoint with nothing behind it. Defence in depth is also simply
what the other five services already do.

The fix is to bind to loopback like its siblings — a `HOST`/`BIND_ADDRESS` of `127.0.0.1`
in `/opt/ctrlchecks-ai-generator/.env`, or the equivalent in its `app.listen()` call.

---

## 5. Database and migrations

One PostgreSQL (AWS RDS, `ap-south-1`), shared by the worker and five services
(SYSTEM-ARCHITECTURE §4). Migrations live in `worker/prisma/migrations/` and are applied
**only** by the worker's deploy.

Deploy-order consequence: a migration ships with the worker, but five other services read the
same tables. **Deploying the worker alone can break them**, and there is no ordering
constraint between the workflows to prevent it. Until each service owns its schema, treat any
migration as a coordinated release of all seven.
