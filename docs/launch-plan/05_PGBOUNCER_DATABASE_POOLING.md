# 05 — PgBouncer Database Pooling

---

## Current Database Connection Code

Evidence: `worker/src/core/database/aws-db-client.ts`, `worker/src/core/database/db-pool.ts`

- Uses `pg.Pool` connecting directly to AWS RDS PostgreSQL
- Each app replica (app1, app2, app3) creates its own pool
- `request-worker` (3 replicas) also creates pools
- Total potential direct connections: (3 app + 3 workers) × pool size = many direct Postgres connections

Under 500 concurrent users, without connection pooling, Postgres can receive 100–200+ simultaneous connections and hit its `max_connections` limit, causing `FATAL: too many connections` errors.

---

## Real Database Details (from worker/.env + ssh-tunnel-loop.bat)

```
RDS Host:     ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com
RDS Port:     5432
Database:     ctrlchecks
User:         ctrlchecks_admin
EC2 Bastion:  ubuntu@3.7.115.58  (PEM: Guide/Worker/ctrlchecks-backend.pem)
Tunnel:       localhost:5433 → RDS:5432  (ISP blocks direct port 5432)
```

## Current Environment Variables

From `worker/.env`:
```
DATABASE_URL=postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks
REDIS_URL=redis://127.0.0.1:6379
```

The `DATABASE_URL` currently points to `localhost:5433` — the SSH tunnel port. This is correct for local development.

---

## CRITICAL: SSH Tunnel Constraint

**The RDS instance is NOT publicly accessible on port 5432.** Your ISP blocks direct connections to port 5432. All database access goes through an SSH tunnel via the EC2 bastion (`ubuntu@3.7.115.58`).

This means:

| Environment | How to reach RDS |
|---|---|
| Local dev | SSH tunnel: `localhost:5433` → EC2 → RDS (run `ssh-tunnel-loop.bat`) |
| Docker Compose (local) | PgBouncer must connect through `host.docker.internal:5433` (tunnel must be running) |
| EC2 / Production server | Direct connection to RDS: `ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432` (same VPC, no tunnel needed) |

---

## Required PgBouncer Deployment Config

**For production (EC2 or ECS — same AWS VPC as RDS):**

Add PgBouncer as a service in `infra/docker-compose.yml`:

```yaml
pgbouncer:
  image: bitnami/pgbouncer:1.22.1
  environment:
    POSTGRESQL_HOST: ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com
    POSTGRESQL_PORT: 5432
    POSTGRESQL_DATABASE: ctrlchecks
    POSTGRESQL_USERNAME: ctrlchecks_admin
    POSTGRESQL_PASSWORD: ${DB_PASSWORD}
    PGBOUNCER_PORT: 6432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 500
    PGBOUNCER_DEFAULT_POOL_SIZE: 20
    PGBOUNCER_RESERVE_POOL_SIZE: 10
    PGBOUNCER_SERVER_IDLE_TIMEOUT: 600
    POSTGRESQL_PASSWORD: ${DB_PASSWORD}   # ctrlchecks_admin's password (from worker/.env)
    PGBOUNCER_AUTH_TYPE: md5
  ports:
    - "6432:6432"
  healthcheck:
    test: ["CMD-SHELL", "psql -h 127.0.0.1 -p 6432 -U ctrlchecks_admin -d ctrlchecks -c 'SELECT 1' || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**For local dev with Docker Compose (tunnel already running on host):**

PgBouncer in Docker cannot reach `localhost:5433` of the host directly. Use `host.docker.internal`:

```yaml
pgbouncer:
  image: bitnami/pgbouncer:1.22.1
  environment:
    POSTGRESQL_HOST: host.docker.internal   # Reaches localhost:5433 of the host machine
    POSTGRESQL_PORT: 5433                   # Tunnel port (not 5432)
    POSTGRESQL_DATABASE: ctrlchecks
    POSTGRESQL_USERNAME: ctrlchecks_admin
    POSTGRESQL_PASSWORD: ${DB_PASSWORD}
    PGBOUNCER_PORT: 6432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 500
    PGBOUNCER_DEFAULT_POOL_SIZE: 20
    PGBOUNCER_RESERVE_POOL_SIZE: 10
    PGBOUNCER_SERVER_IDLE_TIMEOUT: 600
    PGBOUNCER_AUTH_TYPE: md5
  extra_hosts:
    - "host.docker.internal:host-gateway"   # Required on Linux
```

---

## Required App Database URL Changes

App services (app1, app2, app3, request-worker, execution-worker) must use PgBouncer:

```yaml
# In docker-compose.yml for app1/app2/app3
environment:
  DATABASE_URL: postgresql://ctrlchecks_admin:${DB_PASSWORD}@pgbouncer:6432/ctrlchecks
  DIRECT_DATABASE_URL: postgresql://ctrlchecks_admin:${DB_PASSWORD}@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks
```

The `DIRECT_DATABASE_URL` is used exclusively for:
- Prisma migrations (`prisma migrate deploy`) — bypasses PgBouncer
- Health checks that need direct Postgres access

---

## ORM Settings for PgBouncer Compatibility

PgBouncer in `transaction` mode does NOT support prepared statements or session-level features. Verify:

In `worker/src/core/database/db-pool.ts` or `aws-db-client.ts`:
```typescript
// Disable prepared statements for PgBouncer transaction mode compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,               // PgBouncer handles the big pool; keep app pool small
  statement_timeout: 30000,
  // Do NOT use pgPool.query with named prepared statements
});
```

If the codebase uses `$1, $2` parameterized queries without `PREPARE`, it is already compatible.

---

## Migration / Admin Connection Strategy

```bash
# Migrations locally (tunnel must be running):
# worker/.env already has DATABASE_URL=postgresql://...@localhost:5433/ctrlchecks
# That is the tunnel — use it directly:
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" -f migration.sql

# Migrations from EC2 (production — direct to RDS, no tunnel):
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks" -f migration.sql
```

---

## Local Development Strategy

**Do NOT use PgBouncer in local dev** — the SSH tunnel is the bottleneck, not the connection count. PgBouncer is for production where 3+ replicas run simultaneously.

Local dev uses:
- `DATABASE_URL=postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks` (already in `worker/.env`)
- SSH tunnel: run `scripts\ssh-tunnel-loop.bat` (or `scripts\dev-start.bat` which starts it automatically)
- PgBouncer: only add to docker-compose for production deployment

---

## New Environment Variables

| Variable | Value | Used By |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@pgbouncer:6432/db` | All app services (runtime) |
| `DIRECT_DATABASE_URL` | `postgresql://user:pass@rds-host:5432/db` | Migrations, admin only |
| `PGBOUNCER_MAX_CLIENT_CONN` | `500` | PgBouncer config |
| `PGBOUNCER_DEFAULT_POOL_SIZE` | `20` | PgBouncer config |
| `PGBOUNCER_RESERVE_POOL_SIZE` | `10` | PgBouncer config |
| `RDS_HOST` | Your AWS RDS endpoint | docker-compose |
| `DB_NAME` | Database name | docker-compose |
| `DB_USER` | Database user | docker-compose |
| `DB_PASSWORD` | Database password | docker-compose |

---

## Docker / docker-compose Changes

File: `infra/docker-compose.yml`

1. Add `pgbouncer` service (see above)
2. Update `app1`, `app2`, `app3`, `request-worker`, and new `execution-worker` environment to use `DATABASE_URL: postgresql://...@pgbouncer:6432/...`
3. Add `depends_on: pgbouncer` for app services
4. Add `RDS_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` to a `.env.docker` file (gitignored)

---

## Tests / Verification Commands

```bash
# 1. Verify PgBouncer is running and accepting connections
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d $DB_NAME -c "SELECT 1"

# 2. Check PgBouncer pool stats
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d pgbouncer -c "SHOW POOLS"

# 3. Verify app connects through PgBouncer (check server connections stay low under load)
docker compose exec pgbouncer psql -h 127.0.0.1 -p 6432 -U $DB_USER -d pgbouncer -c "SHOW STATS"

# 4. Verify migrations still work via DIRECT_DATABASE_URL
cd worker && DIRECT_DATABASE_URL=postgresql://... npx prisma migrate status

# 5. Under 500-user load test, check server connections
SHOW SERVERS;  -- should stay < 50 server connections even with 500 clients
```

---

## Connection Count Verification

**Target**: 500 concurrent users → maximum 50 direct Postgres connections (through PgBouncer pool)

Math:
- `PGBOUNCER_DEFAULT_POOL_SIZE=20` per database/user pair
- 3 app instances × pool of 20 = 60 max server connections (acceptable)
- With PgBouncer: 500 client connections multiplexed into ≤20 server connections per pool

Without PgBouncer:
- 3 apps × 10 pg.Pool per instance = 30 direct connections (fine for low traffic)
- But each concurrent request waits for a free pool slot — under 500 VU, pool slots exhaust

---

## Health Check PgBouncer Separately

Add to `worker/src/index.ts` health check:
```typescript
// Separate PgBouncer health vs RDS health
app.get('/api/health/db', async (req, res) => {
  const db = getDbClient();
  const result = await db.raw('SELECT 1');
  res.json({ pgbouncer: 'ok', rds: 'reachable' });
});
```
