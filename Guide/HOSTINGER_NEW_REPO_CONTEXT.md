# CtrlChecks — Hostinger KVM4 Deployment Context

> **Purpose of this file:** This document is the starting context for the new repository.
> Read this fully before doing anything. It explains what this project is, what is already
> built and running on AWS, why this new repo exists, and exactly what needs to be done
> to deploy everything to Hostinger KVM4.

---

## What Is CtrlChecks

CtrlChecks is an AI-powered workflow automation platform (like n8n / Zapier but AI-driven).

- Users describe what they want in plain English
- The AI generates a workflow (nodes + edges as a DAG)
- The workflow executes automatically, connecting to third-party services (Google, Slack, Notion, etc.)
- 57 credential/integration types supported
- Real-time execution status via WebSocket

**Tech stack:**
- Frontend: React + Vite + Zustand + TanStack Query + ReactFlow
- Backend: Node.js + Express + TypeScript
- Database: AWS RDS PostgreSQL (pg.Pool)
- Auth: AWS Cognito (aws-amplify on frontend, aws-jwt-verify on backend)
- AI: Google Gemini API (primary), OpenAI + Anthropic as fallbacks
- Cache/Queue: Redis
- Email: AWS SES

---

## Current Production System (AWS — DO NOT TOUCH)

The existing production system runs on **AWS EC2 at `ubuntu@3.7.115.58`**.

It is fully live with **7 separate microservices**, each as a separate systemd process:

| Service | Port | Directory on AWS EC2 |
|---|---|---|
| worker | 3001 | `/opt/ctrlchecks-worker/` |
| ai-generator | 3002 | `/opt/ctrlchecks-ai-generator/` |
| execution-engine | 3003 | `/opt/ctrlchecks-execution-engine/` |
| credential-service | 3004 | `/opt/ctrlchecks-credential-service/` |
| notification-service | 3005 | `/opt/ctrlchecks-notification-service/` |
| trigger-service | 3006 | `/opt/ctrlchecks-trigger-service/` |
| workflow-crud-service | 3007 | `/opt/ctrlchecks-workflow-crud-service/` |

**Current production domains:**
- Frontend: `ctrlchecks.ai` → Vercel
- Backend: `worker.ctrlchecks.ai` → AWS EC2

**Do not modify, touch, or redeploy the AWS EC2 or ctrlchecks.ai domain.**
They remain the live production environment throughout this process.

---

## Why This New Repository Exists

The investor has provided a **Hostinger KVM4 VPS** to run a parallel test environment.

**Goal:** Deploy the exact same system on Hostinger KVM4 under a new domain (`ctrlchecks.com`).
Run both environments in parallel. Compare performance. If Hostinger performs well, switch off AWS.

**This repo = Hostinger deployment copy of the original codebase.**

Keeping it as a separate repo ensures:
- Changes here do not affect the live AWS production system
- Full independent context and deployment scripts for Hostinger
- Clear separation between AWS environment and Hostinger environment

---

## Hostinger KVM4 Server Details

| Field | Value |
|---|---|
| VPS Provider | Hostinger |
| Plan | KVM4 |
| IP Address | `187.127.185.105` |
| OS | Ubuntu (Linux) |
| vCPU | 4 cores |
| RAM | 16 GB |
| NVMe Disk | 160 GB |
| Bandwidth | 16 TB/month |
| Expiry | 2027-06-22 |
| SSH User | `root` (Hostinger default) |

---

## New Domain Architecture (ctrlchecks.com)

| Layer | Domain | Hosted On |
|---|---|---|
| Frontend | `ctrlchecks.com` | Vercel (new deployment) |
| Backend API | `worker.ctrlchecks.com` | Hostinger KVM4 (`187.127.185.105`) |

### DNS Records to Add (in ctrlchecks.com DNS panel)

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `worker` | `187.127.185.105` | Backend on Hostinger |
| CNAME | `@` or `www` | Vercel-provided URL | Frontend on Vercel |

---

## What Stays on AWS (Shared Between Both Environments)

These AWS services are shared. Nothing changes for them. Both AWS EC2 and Hostinger KVM4 connect to the same services:

| Service | Purpose | Notes |
|---|---|---|
| **AWS RDS PostgreSQL** | Main database | Same DB, same data, shared between both environments |
| **AWS Cognito** | User auth | Add `ctrlchecks.com` as allowed callback URL |
| **AWS SES** | Email delivery | No changes needed |
| **Google Gemini API** | AI inference | Same API keys, no changes |

---

## How Everything Will Connect on Hostinger

```
User visits ctrlchecks.com (browser)
      │
      ▼
Vercel → serves React frontend (built with VITE_API_URL=https://worker.ctrlchecks.com)
      │
      ▼
Nginx on Hostinger KVM4 (187.127.185.105, port 80/443)
      │
      ▼
worker :3001  (main API, reverse proxied from Nginx)
      │
      ├──→ ai-generator :3002
      ├──→ execution-engine :3003
      ├──→ credential-service :3004
      ├──→ notification-service :3005
      ├──→ trigger-service :3006
      └──→ workflow-crud-service :3007
      │
      └── All services connect to:
            ├──→ AWS RDS PostgreSQL  (shared database)
            ├──→ AWS Cognito          (auth)
            ├──→ AWS SES              (email)
            └──→ Google Gemini API    (AI)
```

---

## What Needs to Be Done — Full Task List

### MANUAL TASKS (Only the user can do these)

These require dashboard/panel access and cannot be done by AI:

- [ ] **DNS Panel** — Add `A record: worker → 187.127.185.105` in ctrlchecks.com DNS
- [ ] **DNS Panel** — Add CNAME for `ctrlchecks.com` pointing to Vercel URL
- [ ] **AWS Cognito Console** — Add `https://ctrlchecks.com` and `https://ctrlchecks.com/callback` to allowed callback URLs in the User Pool App Client settings
- [ ] **Hostinger Panel** — Get SSH root password from Hostinger dashboard (VPS → Manage → SSH Access)
- [ ] **Vercel** — Create new Vercel project connected to this repo (or deploy via CLI)
- [ ] **Vercel** — Set environment variable: `VITE_API_URL=https://worker.ctrlchecks.com`
- [ ] **Vercel** — Connect `ctrlchecks.com` domain to the new Vercel project

---

### AI-ASSISTED TASKS (Provide credentials and the AI will do these)

Once you give SSH access + .env contents, the AI can do all of this:

- [ ] SSH into `187.127.185.105`
- [ ] Install Node.js 20, Nginx, Redis, certbot on the VPS
- [ ] Create 7 service directories (`/opt/ctrlchecks-[service]/`)
- [ ] Build all services locally and deploy compiled `dist/` to server via SCP
- [ ] Create `.env` file for each service with correct values
- [ ] Create systemd unit file for each of the 7 services
- [ ] Enable and start all 7 services
- [ ] Configure Nginx: SSL reverse proxy for `worker.ctrlchecks.com` → port 3001
- [ ] Run certbot for free SSL on `worker.ctrlchecks.com`
- [ ] Verify all 7 services: `systemctl status ctrlchecks-*.service`
- [ ] Run health checks on all endpoints
- [ ] Test end-to-end: login → create workflow → execute → verify in DB

---

## Environment Variables Needed

When you are ready to start, provide these values. The AI will use them to configure each service:

```
# AWS Database
DATABASE_URL=

# AWS Cognito
AWS_REGION=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_CLIENT_SECRET=
COGNITO_DOMAIN=
COGNITO_ISSUER=
COGNITO_ADMIN_CLIENT_ID=

# AWS Credentials (for S3, SES)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# AI
GEMINI_API_KEY=
GEMINI_API_KEYS=          (comma-separated pool, if multiple)

# Redis (will run locally on Hostinger)
REDIS_URL=redis://localhost:6379

# Service URLs (internal, on same server)
AI_GENERATOR_URL=http://localhost:3002
EXECUTION_ENGINE_URL=http://localhost:3003
CREDENTIAL_SERVICE_URL=http://localhost:4004
NOTIFICATION_SERVICE_URL=http://localhost:3005
TRIGGER_SERVICE_URL=http://localhost:3006
WORKFLOW_CRUD_SERVICE_URL=http://localhost:3007

# Public URLs (for this new environment)
FRONTEND_URL=https://ctrlchecks.com
API_URL=https://worker.ctrlchecks.com

# Email
SES_FROM_EMAIL=

# OAuth redirect base (update to ctrlchecks.com)
OAUTH_REDIRECT_BASE=https://worker.ctrlchecks.com
```

---

## Differences Between This Repo and the AWS Repo

| Thing | AWS Repo (ctrlchecks.ai) | This Repo (ctrlchecks.com) |
|---|---|---|
| Frontend domain | ctrlchecks.ai | ctrlchecks.com |
| Backend domain | worker.ctrlchecks.ai | worker.ctrlchecks.com |
| Backend server | AWS EC2 (3.7.115.58) | Hostinger KVM4 (187.127.185.105) |
| Database | AWS RDS | Same AWS RDS (shared) |
| Auth | AWS Cognito | Same AWS Cognito (add new domain) |
| Deploy scripts | scripts/deploy-*.sh → AWS IP | Update scripts → Hostinger IP |
| VITE_API_URL | https://worker.ctrlchecks.ai | https://worker.ctrlchecks.com |

**The codebase is identical. Only IPs, domains, and deploy targets change.**

---

## Monorepo Layout (Same as Original)

```
/
├── ctrl_checks/        → React + Vite frontend (deploy to Vercel)
├── worker/             → Node.js backend monorepo (deploy to Hostinger KVM4)
│   ├── src/
│   │   ├── index.ts            (worker :3001 entry)
│   │   ├── services/
│   │   │   ├── ai-generator/   (ai-generator :3002)
│   │   │   ├── execution/      (execution-engine :3003)
│   │   │   ├── credentials/    (credential-service :3004)
│   │   │   ├── notifications/  (notification-service :3005)
│   │   │   ├── triggers/       (trigger-service :3006)
│   │   │   └── workflow-crud/  (workflow-crud-service :3007)
│   ├── prisma/         (DB migrations — run against shared AWS RDS)
│   └── package.json
├── scripts/
│   ├── deploy-worker.sh        (UPDATE: SSH_HOST → 187.127.185.105)
│   └── deploy-frontend.sh      (UPDATE: Vercel CLI or manual Vercel deploy)
└── Guide/
    └── HOSTINGER_NEW_REPO_CONTEXT.md   ← YOU ARE HERE
```

---

## Build Commands

```bash
# Frontend (run locally, then deploy to Vercel)
cd ctrl_checks
npm install
npm run build          # outputs to ctrl_checks/dist/

# Backend (run locally, then SCP to Hostinger)
cd worker
npm install
npm run build          # outputs to worker/dist/
                       # uses --max-old-space-size=4096 (build locally, NOT on server)
```

**Important:** Never run `npm run build` on the Hostinger server. The TypeScript compile needs 4–6 GB RAM. Always build locally and push compiled `dist/` to the server.

---

## How to Start Working With This Repo

When you open this repo in a new Claude/AI session, do this in order:

1. Read this file fully
2. Ask the user: "Do you have the SSH password for 187.127.185.105 ready?"
3. Ask the user: "Do you have the .env values ready to paste?"
4. Once confirmed — start with SSH server setup (install Node, Nginx, Redis)
5. Then deploy all 7 services one by one
6. Then configure Nginx + SSL
7. Then guide the user through the 3 manual DNS/Vercel/Cognito steps
8. Then run end-to-end verification

**Do not wait for the user to tell you what to do at each step.** Read this file, understand the plan, and drive the deployment forward. Ask only when you genuinely need input (credentials, confirmations before destructive actions).

---

## Verification Checklist (End of Deployment)

Run these to confirm everything is working:

```bash
# All 7 services running
systemctl list-units ctrlchecks-*.service

# Health checks
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health

# Public endpoint (after SSL + DNS)
curl https://worker.ctrlchecks.com/health

# RAM check (should be under 12 GB)
free -h
```

**Live flow to test:**
```
1. Visit https://ctrlchecks.com → login with existing account
2. Create a new workflow
3. Execute it
4. Verify execution completes in DB
5. Check notification received (email/in-app)
```

---

## Current Status When You Start

- [x] Hostinger KVM4 provisioned (187.127.185.105, Ubuntu, Running)
- [x] ctrlchecks.com domain available, DNS panel accessible
- [x] Codebase copied from AWS production repo
- [x] AWS RDS, Cognito, SES, Gemini API all working (shared from production)
- [ ] SSH server setup not started yet
- [ ] Services not deployed to Hostinger yet
- [ ] DNS records not added yet
- [ ] Vercel project not created yet
- [ ] Cognito callback URL for ctrlchecks.com not added yet

---

*This document was prepared by the development team to hand off Hostinger deployment context to a fresh AI session. Last updated: June 2026.*
