# CtrlChecks — Teammate Onboarding Guide
**For:** New developer joining the project  
**Project:** CtrlChecks — AI-powered workflow automation platform  
**Repo:** https://github.com/adminctrlchecks/ctrlchecks-core  
**Live app:** https://www.ctrlchecks.ai  
**Live API:** https://worker.ctrlchecks.ai  

---

## 1. What This Project Is

CtrlChecks is an AI workflow builder. Users describe what they want in plain English ("send me a Gmail when a Google Sheet is updated"), and the AI generates and executes the workflow automatically.

**Tech stack:**
- **Frontend:** React + Vite (port 5173 / 8080)
- **Backend:** Node.js + Express — 7 microservices
- **Database:** AWS RDS PostgreSQL (publicly accessible)
- **Auth:** AWS Cognito (JWT)
- **AI:** Google Gemini API
- **Cache/Queue:** Redis
- **Hosting:** Hostinger VPS (worker), Vercel (frontend)

---

## 2. Project Structure

```
ctrlchecks-hostinger/
├── ctrl_checks/          ← React frontend (Vite)
├── worker/               ← Main API gateway (port 3001)
├── services/
│   ├── ai-generator/     ← AI workflow generation (port 3002)
│   ├── execution-engine/ ← Workflow execution (port 3003)
│   ├── credential-service/ ← OAuth credential vault (port 3004)
│   ├── notification-service/ ← Notifications (port 3005)
│   ├── trigger-service/  ← Scheduled triggers (port 3006)
│   └── workflow-crud-service/ ← Workflow DB ops (port 3007)
├── scripts/
│   ├── dev-start-all.bat ← Start all services locally (Windows)
│   └── deploy-worker.sh  ← Manual deploy script
├── Guide/                ← Developer migration guides
└── .github/workflows/    ← GitHub Actions CI/CD
```

---

## 3. Prerequisites

Install these before anything else:

| Tool | Download | Check |
|---|---|---|
| Node.js 20+ | https://nodejs.org | `node -v` |
| Git | https://git-scm.com | `git --version` |
| Docker Desktop | https://docker.com/products/docker-desktop | `docker -v` |
| VS Code (recommended) | https://code.visualstudio.com | — |

---

## 4. First-Time Local Setup

### Step 1 — Extract the project
Unzip the folder you received to a location like `C:\Users\<you>\Desktop\ctrlchecks-hostinger\`

### Step 2 — Install dependencies for all services
Open a terminal in the project root and run:

```bash
# Main worker
cd worker && npm install && cd ..

# Frontend
cd ctrl_checks && npm install && cd ..

# All microservices
cd services/ai-generator && npm install && cd ../..
cd services/execution-engine && npm install && cd ../..
cd services/credential-service && npm install && cd ../..
cd services/notification-service && npm install && cd ../..
cd services/trigger-service && npm install && cd ../..
cd services/workflow-crud-service && npm install && cd ../..
```

### Step 3 — Start Redis (one time, runs in background)
```bash
docker run -d --name redis-local -p 6379:6379 redis:alpine
```

> After restarting your machine, run `docker start redis-local` to bring Redis back up.

### Step 4 — Add SSH key for server access
Get the file `id_ed25519` from your teammate (Vusala) and place it at:
```
C:\Users\<your-username>\.ssh\id_ed25519
```
Then in Git Bash:
```bash
chmod 600 ~/.ssh/id_ed25519
```

### Step 5 — All .env files are already included
The zip contains all `.env` files pre-filled. The database, service keys, OAuth credentials, and API keys are all configured. **Do not commit .env files to git.**

---

## 5. Running Locally

### Start everything (one command):
```bash
# From project root in PowerShell or CMD:
.\scripts\dev-start-all.bat
```

This opens 7 windows:
- 6 microservice windows (ports 3002–3007)
- 1 main worker window in your current terminal (port 3001)

No DB tunnel needed — the database (AWS RDS) is directly reachable via the DATABASE_URL in each `.env` file.

### Start the frontend (separate terminal):
```bash
cd ctrl_checks
npm run dev
```

Open **http://localhost:5173** in your browser.

### Verify all services are healthy:
```bash
# In Git Bash:
for port in 3001 3002 3003 3004 3005 3006 3007; do
  echo "Port $port: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health)"
done
```
All should return `200`.

---

## 6. Key Architecture Rules

Read `CLAUDE.md` in the project root — it's the main developer guide. Critical rules:

1. **Single source of truth:** All node behavior is defined in `worker/src/core/registry/unified-node-registry.ts`. Never add `if (node.type === '...')` outside the registry.
2. **Graph mutations:** All workflow graph changes go through `UnifiedGraphOrchestrator` — never mutate `workflow.nodes` or `workflow.edges` directly.
3. **No local tests:** Never run `npm test` locally — it crashes the system. Tests run in CI (GitHub Actions) only.
4. **Frontend:** The wizard logic lives in `ctrl_checks/src/lib/wizard-*.ts` files, not inline in the component.

---

## 7. Live Server — Access & Management

### SSH into the server:
```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

### Service management on server:
```bash
# Check all services
systemctl list-units 'ctrlchecks-*'

# Restart a service
systemctl restart ctrlchecks-worker
systemctl restart ctrlchecks-execution-engine

# View live logs
journalctl -u ctrlchecks-worker -f
journalctl -u ctrlchecks-execution-engine -f --no-pager -n 50

# Check nginx
systemctl status nginx
nginx -t
```

### Service → Port mapping on server:
| Service | Port | Path |
|---|---|---|
| ctrlchecks-worker | 3001 | /opt/ctrlchecks-worker |
| ctrlchecks-ai-generator | 3002 | /opt/ctrlchecks-ai-generator |
| ctrlchecks-execution-engine | 3003 | /opt/ctrlchecks-execution-engine |
| ctrlchecks-credential-service | 3004 | /opt/ctrlchecks-credential-service |
| ctrlchecks-notification-service | 3005 | /opt/ctrlchecks-notification-service |
| ctrlchecks-trigger-service | 3006 | /opt/ctrlchecks-trigger-service |
| ctrlchecks-workflow-crud-service | 3007 | /opt/ctrlchecks-workflow-crud-service |

### Update a live .env variable:
```bash
# Example — update a key in worker .env
sed -i 's|^SOME_KEY=.*|SOME_KEY=new_value|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
```

---

## 8. Deployment

### Automatic (recommended):
Push to the `master` branch. GitHub Actions detects which services changed and deploys them automatically:
- `worker/**` changed → deploys worker
- `services/execution-engine/**` changed → deploys execution-engine
- `ctrl_checks/**` changed → deploys frontend to Vercel

```bash
git add .
git commit -m "your message"
git push origin master
```

Monitor the deploy at: https://github.com/adminctrlchecks/ctrlchecks-core/actions

### Manual deploy (emergency):
```bash
# SSH into server then:
cd /opt/ctrlchecks-worker
# ... make changes ...
systemctl restart ctrlchecks-worker
sleep 5
curl https://worker.ctrlchecks.ai/health
```

---

## 9. Infrastructure Overview

| Service | Provider | Details |
|---|---|---|
| Database | AWS RDS PostgreSQL | ap-south-1, publicly accessible |
| Auth | AWS Cognito | User pool: ap-south-1_aTYvSYflq |
| AI | Google Gemini | Via adminctrlchecks@gmail.com |
| VPS | Hostinger KVM4 | 187.127.185.105 |
| Frontend CDN | Vercel | www.ctrlchecks.ai |
| DNS | Hostinger | ctrlchecks.ai |
| Redis | Server-side | 127.0.0.1:6379 (local Docker for dev) |
| Email | AWS SES | ap-south-1 |
| Payments | Razorpay | Test mode keys in .env |

---

## 10. Common Issues

| Problem | Fix |
|---|---|
| 503 on `/api/db/*` | DB not reachable — check DATABASE_URL in worker/.env points to RDS |
| Redis connection refused | Run `docker start redis-local` |
| Port already in use | Services already running — check Task Manager or run `netstat -ano \| findstr :3001` |
| Auth token rejected | Cognito JWT expired — log out and log back in |
| worker.ctrlchecks.ai unreachable | SSH to server: `systemctl status nginx && systemctl status ctrlchecks-worker` |
| GitHub Actions deploy failed | Check https://github.com/adminctrlchecks/ctrlchecks-core/actions — click the failed run for logs |

---

## 11. First Prompt for Your AI Assistant (Claude / Cursor / Codex)

Copy and paste this as your **very first message** to the AI before asking anything else:

---

```
You are working on CtrlChecks — an AI-powered workflow automation platform built with Node.js microservices and React.

REPO: https://github.com/adminctrlchecks/ctrlchecks-core
LIVE APP: https://www.ctrlchecks.ai
LIVE API: https://worker.ctrlchecks.ai (Hostinger VPS at 187.127.185.105)

ARCHITECTURE:
- Frontend: React + Vite in ctrl_checks/ (port 5173 dev)
- 7 backend microservices all in services/ plus the main worker/ (port 3001)
  - worker :3001 — API gateway, auth, orchestration
  - ai-generator :3002 — Gemini-powered workflow generation
  - execution-engine :3003 — runtime workflow execution
  - credential-service :3004 — OAuth credential vault
  - notification-service :3005 — email/in-app alerts
  - trigger-service :3006 — cron + webhook triggers
  - workflow-crud-service :3007 — workflow DB operations
- Database: AWS RDS PostgreSQL (ap-south-1), directly reachable via DATABASE_URL in worker/.env
- Auth: AWS Cognito (user pool ap-south-1_aTYvSYflq)
- AI: Google Gemini (GEMINI_API_KEY in worker/.env)
- Cache: Redis (Docker locally, 127.0.0.1:6379 on server)

CRITICAL RULES:
1. All node behavior defined ONCE in worker/src/core/registry/unified-node-registry.ts — never add node-specific if/switch outside the registry
2. All graph mutations go through UnifiedGraphOrchestrator — never mutate workflow.nodes/edges directly
3. Never run npm test locally — tests run in CI only
4. Business logic belongs in ctrl_checks/src/lib/wizard-*.ts, not inline in AutonomousAgentWizard.tsx
5. Deploy by pushing to master — GitHub Actions auto-deploys changed services

LOCAL DEV: Run .\scripts\dev-start-all.bat to start all 7 services + DB tunnel. Then cd ctrl_checks && npm run dev for frontend.

i
```

---

> After pasting this prompt, you can start asking questions or requesting changes normally. The AI will have full context of the project.
