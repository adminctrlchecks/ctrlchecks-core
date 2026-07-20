# 13 — Environment Variables

---

## Existing Variables (confirmed from worker/.env)

| Variable | Used By | Secret? | Current Value (from worker/.env) |
|---|---|---|---|
| `NODE_ENV` | worker | No | `production` |
| `PORT` | worker | No | `3001` |
| `DATABASE_URL` | worker | Yes | `postgresql://ctrlchecks_admin:...@localhost:5433/ctrlchecks` (via SSH tunnel) |
| `REDIS_URL` | worker | No | `redis://127.0.0.1:6379` |
| `AWS_REGION` | worker | No | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | worker | Yes | Set in worker/.env |
| `AWS_SECRET_ACCESS_KEY` | worker | Yes | Set in worker/.env |
| `COGNITO_USER_POOL_ID` | worker | No | `ap-south-1_aTYvSYflq` |
| `COGNITO_CLIENT_ID` | worker | No | `3ists5h8a1mmcs8are5n1pi5m8` |
| `COGNITO_DOMAIN` | worker | No | `ap-south-1atyvsyflq.auth.ap-south-1.amazoncognito.com` |
| `COGNITO_ISSUER` | worker | No | `https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_aTYvSYflq` |
| `COGNITO_ADMIN_CLIENT_ID` | worker | No | `5eecdi61rsdnmkdiburt7moobr` |
| `COGNITO_CLIENT_SECRET` | worker | Yes | Set in worker/.env |
| `GEMINI_API_KEY` | worker | Yes | **One key currently set** — rotation requires adding `GEMINI_API_KEYS` |
| `ENCRYPTION_KEY` | worker | Yes | Set in worker/.env |
| `RAZORPAY_KEY_ID` | worker | Yes | Set in worker/.env (live key) |
| `RAZORPAY_KEY_SECRET` | worker | Yes | Set in worker/.env |

**RDS details (from ssh-tunnel-loop.bat):**
- RDS endpoint: `ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com`
- DB name: `ctrlchecks`
- DB user: `ctrlchecks_admin`
- EC2 bastion: `ubuntu@3.7.115.58`
- SSH tunnel port: `localhost:5433` → RDS port 5432

**Kafka/Queue**: Kafka is in docker-compose (`kafka:9092`). Env vars `KAFKA_BROKERS`, `KAFKA_REQUEST_TOPIC`, `KAFKA_DEAD_LETTER_TOPIC` are set in docker-compose services but NOT in `worker/.env` — they are docker-compose environment overrides only.

---

## New Variables Required for This Launch

Add these to `worker/.env`:

| Variable | Secret? | Value to Set | Notes |
|---|---|---|---|
| `GEMINI_API_KEYS` | Yes | `AIzaSy...key1,AIzaSy...key2` | Comma-separated. **Currently only 1 key set** — add a second key to enable rotation. First key can be the existing `GEMINI_API_KEY` value |
| `GEMINI_KEY_COOLDOWN_SECONDS` | No | `60` | Seconds a rate-limited key is marked unavailable |
| `GEMINI_MAX_RETRIES` | No | `2` | Max retry attempts across keys |
| `ENABLE_EXECUTION_QUEUE` | No | `true` | Enables async 202 response path |
| `WORKFLOW_WORKER_CONCURRENCY` | No | `5` | Max parallel jobs in execution worker |
| `WEBSOCKET_REDIS_CHANNEL_PREFIX` | No | `ctrlchecks:ws` | Redis pub/sub channel prefix |
| `EXECUTION_TIMEOUT_MS` | No | `300000` | 5 minutes — max time per workflow run |

Add these for docker-compose PgBouncer (production only — not needed for local dev):

| Variable | Secret? | Value | Notes |
|---|---|---|---|
| `DIRECT_DATABASE_URL` | Yes | `postgresql://ctrlchecks_admin:...@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks` | Direct to RDS, bypasses PgBouncer — migrations only |
| `DB_PASSWORD` | Yes | Password from worker/.env | For docker-compose PgBouncer env block |
| `PGBOUNCER_MAX_CLIENT_CONN` | No | `500` | Max client connections PgBouncer accepts |
| `PGBOUNCER_DEFAULT_POOL_SIZE` | No | `20` | Server connections per pool |
| `PGBOUNCER_RESERVE_POOL_SIZE` | No | `10` | Reserved pool slots for busy periods |

---

## Frontend Variables (ctrl_checks/.env.local)

| Variable | Required? | Value (dev) |
|---|---|---|
| `VITE_AWS_REGION` | Yes | `ap-south-1` |
| `VITE_COGNITO_USER_POOL_ID` | Yes | Your Cognito pool ID |
| `VITE_COGNITO_CLIENT_ID` | Yes | Your Cognito client ID |
| `VITE_COGNITO_DOMAIN` | Yes | Your Cognito domain |
| `VITE_API_URL` | Yes | `http://localhost:3001` (dev) or production URL |
| `VITE_PUBLIC_BASE_URL` | Yes | `http://localhost:8080` (dev) |

---

## Backward Compatibility

**GEMINI_API_KEY vs GEMINI_API_KEYS:**
```typescript
// In worker/src/services/ai/gemini-key-pool.ts
const keysEnv = process.env.GEMINI_API_KEYS;
const singleKey = process.env.GEMINI_API_KEY;
const keys = keysEnv
  ? keysEnv.split(',').map(k => k.trim()).filter(Boolean)
  : singleKey ? [singleKey] : [];
```

This means:
- If you only have `GEMINI_API_KEY` set: works as before (single key, no rotation)
- If you add `GEMINI_API_KEYS=key1,key2`: rotation activates

**DATABASE_URL:**
- During migration period: add `DIRECT_DATABASE_URL` alongside existing `DATABASE_URL`
- After PgBouncer is deployed: change `DATABASE_URL` to point to PgBouncer
- Migrations always use `DIRECT_DATABASE_URL`

---

## Exact Lines to Add to worker/.env (for this launch)

These are the new lines to append to `worker/.env`. The existing file already has everything else.

```bash
# ─── Add these for launch (append to worker/.env) ──────────────────────────

# Gemini key rotation — add a SECOND Gemini key here to enable rotation
# Your current single key is already in GEMINI_API_KEY above
# GEMINI_API_KEYS=AIzaSyDrHWCvQCZWByQ8LbdlTqCiw2SJeT8xCpc,AIzaSy...second-key-here
GEMINI_KEY_COOLDOWN_SECONDS=60
GEMINI_MAX_RETRIES=2

# Async execution queue
ENABLE_EXECUTION_QUEUE=true
WORKFLOW_WORKER_CONCURRENCY=5

# WebSocket Redis bridge
WEBSOCKET_REDIS_CHANNEL_PREFIX=ctrlchecks:ws

# Execution timeout (5 minutes)
EXECUTION_TIMEOUT_MS=300000
```

**Note on Gemini keys**: Until you have a second Gemini API key, leave `GEMINI_API_KEYS` commented out. The system will fall back to the existing `GEMINI_API_KEY`. Rotation only activates when `GEMINI_API_KEYS` has 2+ keys.

## Connection Reference (for PgBouncer or direct queries)

```bash
# Local dev — via SSH tunnel (tunnel must be running via ssh-tunnel-loop.bat):
LOCAL_DB_URL=postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks

# Direct to RDS — from EC2/production (same VPC, no tunnel needed):
DIRECT_DATABASE_URL=postgresql://ctrlchecks_admin:CtrlChecks2026@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks

# Cognito (already set in worker/.env):
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=ap-south-1_aTYvSYflq
COGNITO_CLIENT_ID=3ists5h8a1mmcs8are5n1pi5m8
COGNITO_DOMAIN=ap-south-1atyvsyflq.auth.ap-south-1.amazoncognito.com
COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_aTYvSYflq
```

---

## Variables Checklist for Deploy

Before each deploy, verify every variable below is set and non-empty (PowerShell):

```powershell
# Run from project root:
$vars = @("DATABASE_URL", "REDIS_URL", "GEMINI_API_KEY",
          "ENABLE_EXECUTION_QUEUE", "WEBSOCKET_REDIS_CHANNEL_PREFIX",
          "AWS_REGION", "COGNITO_USER_POOL_ID", "COGNITO_CLIENT_ID",
          "ENCRYPTION_KEY", "RAZORPAY_KEY_ID")

$dotenv = Get-Content "worker\.env" | Where-Object { $_ -match "^[^#]" }
foreach ($var in $vars) {
  $found = $dotenv | Where-Object { $_ -match "^$var=" }
  if ($found) { Write-Host "OK: $var" } else { Write-Host "MISSING: $var" -ForegroundColor Red }
}
```

---

## Security Warning

The `worker/.env` file currently contains **live credentials** including AWS access keys and OAuth secrets. This file must:
- **Never be committed to git** (verify `.gitignore` includes `worker/.env`)
- **Never be shared** or uploaded anywhere
- Have its AWS credentials rotated if ever leaked

To check if it's in git: `git ls-files worker/.env` — if this returns a result, it's tracked and must be removed immediately.

## Secret Management

- Use AWS Secrets Manager or SSM Parameter Store for production
- For local dev: `worker/.env` file (never commit to git)
- Never log: `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `AWS_SECRET_ACCESS_KEY`, `DB_PASSWORD`, `COGNITO_CLIENT_SECRET`, `RAZORPAY_KEY_SECRET`
