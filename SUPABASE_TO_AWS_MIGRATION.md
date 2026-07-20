# CtrlChecks — Supabase → AWS Migration Guide

> **Status:** Research & Planning (no code changed yet)  
> **Goal:** Replace Supabase completely with AWS-native services so the platform never hits rate limits, never gets blocked in real-time, and scales without vendor constraints.

---

## 1. Why This Migration Makes Sense

| Problem Today (Supabase) | After Migration (AWS) |
|---|---|
| Rate limits on free/paid tier block real-time events | RDS has no artificial rate limits — only hardware limits you control |
| WebSocket connection drops → execution console breaks | WebSocket on your own Express server (already on EC2) — you control it |
| Supabase can throttle or slow your DB at peak hours | Your own RDS instance = dedicated resources |
| Auth tied to Supabase — if it goes down, login breaks | AWS Cognito is 99.9% SLA, enterprise-grade |
| You pay Supabase AND AWS | Pay only AWS — one bill |
| Can't tune PostgreSQL settings | Full PostgreSQL control on RDS |

**Bottom line:** You are already paying for an AWS EC2 server. Moving DB and Auth to AWS means everything lives under one roof you control 100%.

---

## 2. What Supabase Gives You Today (Complete Map)

```
Supabase
├── PostgreSQL Database          → Replace with: AWS RDS (PostgreSQL)
├── Auth (email + 9 OAuth)       → Replace with: AWS Cognito
├── Real-time (WebSocket)        → Replace with: WebSocket on your Express + Redis (already in stack)
├── Row Level Security (RLS)     → Keep: RLS is native PostgreSQL, works on RDS too
├── pgvector extension           → Keep: Available on RDS PostgreSQL 15+
└── Storage                     → Not used in project — nothing to migrate
```

---

## 3. The Full AWS Architecture (After Migration)

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                   │
│  React + TypeScript + Vite                              │
│  Auth: AWS Amplify (Cognito SDK)                        │
│  Realtime: WebSocket → your EC2 backend                 │
│  All DB calls: HTTP → your EC2 backend (no direct DB)   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────▼────────────────────────────────────┐
│              BACKEND — AWS EC2 (already yours)          │
│  Express.js + TypeScript, port 3001                     │
│  Auth middleware: verify Cognito JWT tokens             │
│  WebSocket server: broadcast execution updates          │
│  DB access: node-postgres (pg) → RDS                    │
│  Queue: Redis + RabbitMQ (unchanged)                    │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────┐   ┌───────────▼──────────────────┐
│  AWS RDS PostgreSQL  │   │       AWS Cognito             │
│  (your database)     │   │  User Pools + OAuth           │
│  All 32 migrations   │   │  Google, GitHub, Facebook...  │
│  RLS intact          │   │  Issues JWT tokens           │
│  pgvector intact     │   └──────────────────────────────┘
└─────────────────────┘
```

---

## 4. Every File That Needs to Change (by Category)

### 4A. Database — AWS RDS PostgreSQL

**What stays the same:**
- All 32 SQL migration files run unchanged on RDS PostgreSQL
- RLS policies are native PostgreSQL — no changes needed
- pgvector works on RDS PostgreSQL 15+ (just enable the extension once)

**Files to change:**

| File | What Changes |
|---|---|
| `worker/src/core/database/supabase-compat.ts` | Delete Supabase client factory. Replace with `pg.Pool` (node-postgres connection pool) |
| `worker/src/core/config.ts` | Remove `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Add `DATABASE_URL` (RDS connection string) |
| `worker/src/services/database/supabaseNode.ts` | Replace `.from().select/insert/update/delete/rpc()` with raw SQL via `pg.Pool` |
| `worker/src/services/social/facebook/shared/SupabaseLogger.helper.ts` | Replace Supabase insert with `pg.Pool` INSERT SQL |
| `worker/src/api/subscriptions.ts` | Replace `.from('users').upsert()` with SQL via `pg.Pool` |
| `worker/src/api/delete-account.ts` | Replace Supabase queries with SQL |

**New env vars for worker:**
```
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/ctrlchecks
```

---

### 4B. Authentication — AWS Cognito

This is the biggest change. Cognito replaces `supabase.auth.*` everywhere.

**Concept mapping:**

| Supabase Auth | AWS Cognito Equivalent |
|---|---|
| `supabase.auth.signUp()` | `cognito.signUp()` via Amplify |
| `supabase.auth.signInWithPassword()` | `cognito.signIn()` via Amplify |
| `supabase.auth.signOut()` | `Auth.signOut()` via Amplify |
| `supabase.auth.getSession()` | `Auth.currentSession()` via Amplify |
| `supabase.auth.getUser(token)` | Verify JWT using Cognito JWKS endpoint |
| OAuth (Google, GitHub etc.) | Cognito Hosted UI + Social Identity Providers |
| JWT secret (`SUPABASE_JWT_SECRET`) | Cognito JWKS public keys (auto-rotated, no secret needed) |

**Frontend files to change:**

| File | What Changes |
|---|---|
| `ctrl_checks/src/integrations/supabase/client.ts` | Delete entirely. Replace with AWS Amplify config file |
| `ctrl_checks/src/integrations/supabase/types.ts` | Delete. TypeScript types come from your own DB schema instead |
| `ctrl_checks/src/components/AuthProvider.tsx` | Replace all `supabase.auth.*` calls with `Auth.*` from `aws-amplify` |
| `ctrl_checks/src/lib/auth-context.tsx` | Update types to Cognito user format |
| `ctrl_checks/src/lib/api/workflowAPI.ts` | Replace `supabase.auth.getSession()` with `Auth.currentSession()` |
| `ctrl_checks/src/components/ConnectionsPanel.tsx` | Same — swap getSession() |
| `ctrl_checks/src/pages/Dashboard.tsx` | Remove direct Supabase queries → use fetch() to your worker API |
| `ctrl_checks/src/pages/Workflows.tsx` | Same as Dashboard |
| `ctrl_checks/src/pages/Profile.tsx` | Same as Dashboard |
| `ctrl_checks/src/pages/Subscriptions.tsx` | Same as Dashboard |
| `ctrl_checks/src/pages/admin/AdminSubscriptions.tsx` | Same as Dashboard |
| `ctrl_checks/src/pages/ExecutionDetail.tsx` | Same as Dashboard |
| `ctrl_checks/src/pages/Executions.tsx` | Same as Dashboard |
| `ctrl_checks/src/components/workflow/ScheduleWiseSettings.tsx` | Same as Dashboard |
| `ctrl_checks/src/components/ProfileSettingsModal.tsx` | Same as Dashboard |
| `ctrl_checks/src/lib/credentials.ts` | Update auth token retrieval |
| All 6 OAuth callback files (google, github, facebook, linkedin, twitter, instagram) | Replace `supabase.auth.*` with Amplify hosted UI redirect handling |

**Backend files to change:**

| File | What Changes |
|---|---|
| `worker/src/core/middleware/subscription-auth.ts` | Replace `supabase.auth.getUser(token)` with Cognito JWT verification (using `aws-jwt-verify` library — no network call needed, fully offline) |
| `worker/src/core/config.ts` | Add `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION` |

**New env vars:**
```
# worker/.env
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1

# ctrl_checks/.env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
```

---

### 4C. Real-Time — WebSocket on Your Own Express Server

Today `ExecutionConsole.tsx` uses `supabase.on('*', ...)` to watch execution status changes in real-time.

**The good news:** You already have Redis in your stack. Redis has a built-in pub/sub system. Here is the plan:

```
Worker finishes/updates execution
    → publishes to Redis channel: "execution:{id}"
    → Express WebSocket server picks it up
    → pushes update to all subscribed browser clients
    → ExecutionConsole.tsx receives it and updates the UI
```

**Files to change:**

| File | What Changes |
|---|---|
| `ctrl_checks/src/integrations/supabase/client.ts` | Remove realtime config entirely |
| `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` | Replace `.on('*', ...)` subscription with `new WebSocket('wss://your-ec2/ws')` |
| `worker/src/` (new file needed) | Add `websocket-server.ts` — WebSocket server that subscribes to Redis pub/sub and forwards to clients |

**No extra AWS service needed.** Redis is already there.

---

### 4D. SQL Migration Files

**All 32 SQL files in `ctrl_checks/sql_migrations/` are reusable as-is** with two small exceptions:

| File | Change Needed |
|---|---|
| Any file that calls `auth.uid()` in RLS policies | Change to application-level auth check OR keep using PostgreSQL session variables set by the backend |
| `02_agent_memory_tables.sql` | Ensure `CREATE EXTENSION IF NOT EXISTS vector;` is run — pgvector needs to be enabled on RDS once |
| All others | **No changes needed** — standard PostgreSQL SQL |

**The RLS approach on RDS:**
Since you won't have Supabase's auto-injection of `auth.uid()`, the cleanest approach is:
- Backend sets `SET app.current_user_id = 'uuid'` at the start of each DB session
- RLS policies use `current_setting('app.current_user_id')::uuid` instead of `auth.uid()`
- This is a standard PostgreSQL pattern and works perfectly on RDS

---

## 5. New Packages Needed

### Remove
```bash
# ctrl_checks
npm remove @supabase/supabase-js

# worker
npm remove @supabase/supabase-js
```

### Add
```bash
# ctrl_checks (frontend)
npm install aws-amplify @aws-amplify/ui-react

# worker (backend)
npm install pg @types/pg           # PostgreSQL client (node-postgres)
npm install aws-jwt-verify          # Offline Cognito JWT verification (no AWS SDK needed)
npm install ws @types/ws            # WebSocket server
```

---

## 6. OAuth Providers — Cognito Setup Checklist

All 9 OAuth providers need to be re-registered in AWS Cognito. Here is what you need for each:

| Provider | What You Need |
|---|---|
| Google | Same Google Client ID + Secret → add to Cognito Identity Provider |
| GitHub | GitHub OAuth App → Client ID + Secret → add to Cognito |
| Facebook | Facebook App ID + Secret → add to Cognito |
| LinkedIn | LinkedIn App → Client ID + Secret → Cognito custom OIDC |
| Twitter | Twitter App → API Key + Secret → Cognito custom OIDC |
| Instagram | Facebook/Meta App → add to Cognito |
| Salesforce | Salesforce Connected App → Cognito custom OIDC |
| Notion | Notion Integration → Cognito custom OIDC |
| WhatsApp | Keep as custom handler in backend (WhatsApp has no standard OAuth) |

> All existing OAuth credentials (client IDs and secrets) stay the same. You just register them in Cognito instead of Supabase.

---

## 7. Step-by-Step Migration Order

Do these steps **in order**. Each step is independent and testable before moving to the next.

### Phase 1 — AWS Infrastructure Setup (no code changes)
- [ ] Create AWS RDS PostgreSQL 15 instance (enable pgvector extension)
- [ ] Run all 32 SQL migration files on RDS (test that all tables are created)
- [ ] Create AWS Cognito User Pool
- [ ] Configure email/password in Cognito
- [ ] Add all OAuth providers to Cognito one by one
- [ ] Set up Cognito App Client (get User Pool ID + Client ID)

### Phase 2 — Backend Migration (worker/)
- [ ] Add `pg` library, create database connection pool pointing to RDS
- [ ] Replace `supabase-compat.ts` with a `pg.Pool` wrapper
- [ ] Update `subscription-auth.ts` to verify Cognito JWTs using `aws-jwt-verify`
- [ ] Update all `supabase.from().select/insert/update/delete()` calls to SQL queries
- [ ] Add WebSocket server to Express that subscribes to Redis pub/sub
- [ ] Test: login → API call → DB query → response (full round trip)

### Phase 3 — Frontend Migration (ctrl_checks/)
- [ ] Add `aws-amplify`, configure it with Cognito User Pool ID + Client ID
- [ ] Replace `AuthProvider.tsx` — swap all `supabase.auth.*` with Amplify `Auth.*`
- [ ] Replace OAuth callback pages — use Amplify hosted UI redirect
- [ ] Remove direct Supabase DB queries from all pages (Dashboard, Workflows, Executions etc.) — replace with `fetch()` to your worker API endpoints
- [ ] Replace `ExecutionConsole.tsx` realtime subscription with WebSocket client
- [ ] Delete `ctrl_checks/src/integrations/supabase/` folder entirely

### Phase 4 — Testing & Cutover
- [ ] Run both old (Supabase) and new (AWS) in parallel with a feature flag
- [ ] Test all auth flows: sign up, sign in, all OAuth providers
- [ ] Test execution real-time updates in ExecutionConsole
- [ ] Test all pages that query data
- [ ] Switch DNS/env vars to point to new AWS stack
- [ ] Monitor for 48 hours, then decommission Supabase

---

## 8. Environment Variables — Complete Before/After

### ctrl_checks/.env

| Remove | Add |
|---|---|
| `VITE_SUPABASE_URL` | `VITE_COGNITO_USER_POOL_ID` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `VITE_COGNITO_CLIENT_ID` |
| `VITE_SUPABASE_PROJECT_ID` | `VITE_AWS_REGION` |
| `VITE_SUPABASE_ANON_KEY` | `VITE_API_BASE_URL` (your EC2 URL) |

### worker/.env

| Remove | Add |
|---|---|
| `SUPABASE_URL` | `DATABASE_URL` (RDS connection string) |
| `SUPABASE_SERVICE_ROLE_KEY` | `COGNITO_USER_POOL_ID` |
| `SUPABASE_JWT_SECRET` | `COGNITO_CLIENT_ID` |
| | `AWS_REGION` |

---

## 9. Cost Estimate

| Service | Supabase Today | AWS After Migration |
|---|---|---|
| Database | Supabase Pro plan | RDS db.t3.medium ~$30/month (or Aurora Serverless, pay per use) |
| Auth | Included in Supabase | Cognito: free up to 50,000 MAU, then $0.0055/MAU |
| Real-time | Included (with rate limits) | $0 — uses your existing EC2 + Redis |
| **Total estimate** | **$25–$100/month** | **$30–$60/month** (and no rate limits) |

---

## 10. Risks and How to Handle Them

| Risk | How to Handle |
|---|---|
| User sessions break during cutover | Run migration at low-traffic time; users simply log in again |
| OAuth redirect URIs change | Update all 9 OAuth app settings to point to Cognito callback URL before cutover |
| RLS `auth.uid()` stops working | Update RLS policies to use `current_setting('app.current_user_id')` pattern (backend sets this) |
| Cognito JWT format differs from Supabase JWT | Update `subscription-auth.ts` to read `sub` claim instead of Supabase-specific claims |
| pgvector not available on old RDS version | Use RDS PostgreSQL 15+ (pgvector is built-in) |

---

## 11. Summary in Simple Words

**What we are doing:**
1. Move the database from Supabase to AWS RDS — same PostgreSQL, same tables, same data, but on a server you control with no rate limits.
2. Move login/auth from Supabase Auth to AWS Cognito — same login experience for users, but backed by enterprise AWS infrastructure with 99.9% uptime guarantee.
3. Move real-time execution updates from Supabase WebSocket to a WebSocket server built into your own Express backend — using Redis pub/sub which you already have.

**What stays exactly the same:**
- All your SQL table structures and data
- All your business logic in the worker
- Your frontend UI
- All OAuth providers (Google, GitHub, etc.) — same credentials, just re-registered in Cognito
- Your Vercel + EC2 deployment setup

**What users will notice:**
- Nothing. The app will look and work exactly the same.

**What you will notice:**
- No more rate limit errors
- Real-time execution console never blocks
- One AWS bill instead of Supabase + AWS
- Full control over database performance tuning

---

*Guide prepared: 2026-04-24. No code was changed. All implementation happens after this plan is reviewed and approved.*
