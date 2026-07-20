# 14 — Database Migrations

---

## Existing Migration System

| Item | Detail |
|---|---|
| Tool | Prisma (schema at `worker/prisma/schema.prisma`) + raw SQL files in `worker/prisma/migrations/` |
| Migration command | `cd worker && npm run prisma:migrate` |
| Migration files | 4 existing: 0001, 0002, 0003, 0004 |
| DB | AWS RDS PostgreSQL — `ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432` |
| DB name | `ctrlchecks` |
| DB user | `ctrlchecks_admin` |
| Local dev access | SSH tunnel via EC2 (`ubuntu@3.7.115.58`) → `localhost:5433` (ISP blocks direct port 5432) |
| PEM key | `Guide/Worker/ctrlchecks-backend.pem` |
| Local DATABASE_URL | `postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks` |
| Connection for migrations | Via SSH tunnel locally; direct RDS URL from EC2/production servers |

**How migrations work locally:**
1. Start the SSH tunnel first: run `scripts\ssh-tunnel-loop.bat`
2. Tunnel maps `localhost:5433` → RDS port 5432
3. Run migration using the tunnel URL (already set as `DATABASE_URL` in `worker/.env`)

---

## Existing Relevant Tables

### `executions` (from `0001_init_memory_system.sql`)

```sql
CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    result_data JSONB,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    execution_time INTEGER,   -- milliseconds
    error_message TEXT,
    context JSONB DEFAULT '{}'::jsonb
);
```

Indexes:
- `idx_executions_workflow_id ON executions(workflow_id)`
- `idx_executions_status ON executions(status)`
- `idx_executions_started_at ON executions(started_at)`

### `node_executions` (from `0001_init_memory_system.sql`)

```sql
CREATE TABLE IF NOT EXISTS node_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50),
    error TEXT,
    duration INTEGER,
    sequence INTEGER,
    metadata JSONB
);
```

### `workflows` (from `0001_init_memory_system.sql`)

Relevant column: `user_id` — already exists on workflows table.

---

## Required New Tables

None. All required data fits into the existing `executions` table via ALTER TABLE.

---

## Required New Columns (ALTER TABLE)

File: `worker/prisma/migrations/0005_execution_async_fields.sql`

```sql
-- ============================================================
-- Migration 0005: Add async execution tracking columns
-- Safe: all changes are additive (IF NOT EXISTS, default values)
-- ============================================================

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step VARCHAR(255),
  ADD COLUMN IF NOT EXISTS error_code VARCHAR(128);

-- Backfill user_id for all existing execution rows
-- (safe because we're joining on workflow_id which is always present)
UPDATE executions e
SET user_id = w.user_id
FROM workflows w
WHERE e.workflow_id = w.id
  AND e.user_id IS NULL;

-- Backfill queued_at for existing rows (use started_at as best estimate)
UPDATE executions
SET queued_at = started_at
WHERE queued_at IS NULL AND started_at IS NOT NULL;
```

---

## Required New Indexes

```sql
-- Needed for: GET /api/workflows/executions?userId=... (user's execution history)
CREATE INDEX IF NOT EXISTS idx_executions_user_id
  ON executions(user_id);

-- Needed for: monitoring stuck jobs (queued/running for too long)
CREATE INDEX IF NOT EXISTS idx_executions_queued_at
  ON executions(queued_at);

-- Composite: user + status (common query pattern for dashboards)
CREATE INDEX IF NOT EXISTS idx_executions_user_status
  ON executions(user_id, status);
```

---

## Required Constraints

No new constraints required. Keeping the migration simple and additive.

Note: `user_id` is nullable to safely handle existing rows without a user reference. Application code enforces user auth at the API layer.

---

## Rollback SQL

File: `worker/prisma/migrations/rollback_0005.sql`

```sql
-- ============================================================
-- Rollback for migration 0005
-- Removes columns added in 0005_execution_async_fields.sql
-- WARNING: This permanently removes queued_at, progress, etc. data
-- ============================================================

DROP INDEX IF EXISTS idx_executions_user_status;
DROP INDEX IF EXISTS idx_executions_queued_at;
DROP INDEX IF EXISTS idx_executions_user_id;

ALTER TABLE executions
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS queued_at,
  DROP COLUMN IF EXISTS progress,
  DROP COLUMN IF EXISTS current_step,
  DROP COLUMN IF EXISTS error_code;
```

---

## Data Migration Concerns

1. **Existing execution rows**: Will have `user_id = NULL` until the backfill UPDATE runs. The backfill is safe because it uses `workflow_id` as the join key, which is always present.

2. **Existing execution rows with no workflow**: The migration uses a LEFT JOIN-style UPDATE — rows where workflow is deleted are left with `user_id = NULL`. This is acceptable for historical data.

3. **`progress` default = 0**: Existing completed executions will show `progress = 0`. This is acceptable because old executions predate the progress tracking feature. The UI should treat progress = 0 on a `success` status as "completed" not "0% done".

4. **`started_at` timestamp**: Existing rows may use `TIMESTAMP` without timezone. The new `queued_at` uses `TIMESTAMPTZ`. This is fine — they are separate columns.

---

## Safe Deployment Notes

- All column additions use `IF NOT EXISTS` — safe to run multiple times
- The backfill UPDATE uses indexed columns (`workflow_id`, `id`) — fast even on large tables
- No existing columns are modified — zero risk of breaking existing queries
- Run during low-traffic window to minimize lock contention
- On AWS RDS: this migration acquires `ACCESS EXCLUSIVE` lock only momentarily for each `ADD COLUMN` (PostgreSQL 11+ handles this efficiently)

---

## Running the Migration

### Locally (via SSH tunnel)

```bash
# Step 1: Start SSH tunnel first (if not already running)
# Double-click scripts\ssh-tunnel-loop.bat  OR  run in a separate terminal:
# ssh -i Guide/Worker/ctrlchecks-backend.pem -N -L 5433:ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432 ubuntu@3.7.115.58

# Step 2: Take RDS snapshot (requires AWS CLI with your credentials)
aws rds create-db-snapshot \
  --region ap-south-1 \
  --db-instance-identifier ctrlchecks-db \
  --db-snapshot-identifier pre-migration-0005-$(date +%Y%m%d)

# Step 3: Run migration via the SSH tunnel
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" \
  -f worker/prisma/migrations/0005_execution_async_fields.sql

# Step 4: Verify columns were added
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" \
  -c "\d executions"

# Step 5: Verify backfill ran
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" \
  -c "SELECT count(*) FROM executions WHERE user_id IS NOT NULL"

# Step 6: Verify indexes
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@localhost:5433/ctrlchecks" \
  -c "\di idx_executions_*"
```

### From EC2 (production — direct connection, no tunnel needed)

```bash
# From the EC2 bastion server (ubuntu@3.7.115.58):
psql "postgresql://ctrlchecks_admin:CtrlChecks2026@ctrlchecks-db.cxm8gymyysvy.ap-south-1.rds.amazonaws.com:5432/ctrlchecks" \
  -f 0005_execution_async_fields.sql
```

### Using worker/.env (already configured)

```bash
# worker/.env already has DATABASE_URL pointing to localhost:5433 (tunnel)
# Just ensure the tunnel is running, then:
cd worker
node -e "
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  const sql = fs.readFileSync('prisma/migrations/0005_execution_async_fields.sql', 'utf8');
  return client.query(sql);
}).then(() => { console.log('Migration 0005 complete'); client.end(); })
  .catch(e => { console.error('Migration failed:', e.message); client.end(); process.exit(1); });
"
```

---

## Updated Schema Summary (After Migration 0005)

```sql
-- executions table full schema after 0005:
id              UUID PRIMARY KEY
workflow_id     UUID NOT NULL → workflows(id) ON DELETE CASCADE
user_id         UUID                           -- NEW (nullable for backward compat)
status          VARCHAR(50) NOT NULL           -- queued, running, success, failed
progress        INTEGER NOT NULL DEFAULT 0     -- NEW: 0–100
current_step    VARCHAR(255)                   -- NEW: currently running node label
error_code      VARCHAR(128)                   -- NEW: machine-readable error class
error_message   TEXT                           -- existing
input_data      JSONB
result_data     JSONB
queued_at       TIMESTAMPTZ                    -- NEW: when job was placed in queue
started_at      TIMESTAMP NOT NULL
finished_at     TIMESTAMP
execution_time  INTEGER                        -- milliseconds
context         JSONB DEFAULT '{}'
```
