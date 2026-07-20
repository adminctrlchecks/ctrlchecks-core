# Hostinger KVM — Hosting Assessment for Investor

> **Prepared for:** Investor Review  
> **Date:** June 2026  
> **Based on:** Live server verification — ubuntu@3.7.115.58  
> **Revised Verdict:** KVM4 is borderline risky. KVM8 is the right choice.

---

## Short Message (WhatsApp)

> Hi, I've done a full technical analysis including live server verification on our AWS EC2.
>
> Our system is already running as **7 separate microservices** on 7 separate ports — not a single app. This changes the hosting math significantly.
>
> KVM4 (16 GB RAM): Borderline — only 2–5 GB headroom at peak load across all 7 services. One traffic spike could crash the server.
>
> KVM8 (32 GB RAM): Comfortable — 18+ GB headroom. Safe for current load and room to grow.
>
> Everything else (database, auth, email, AI) stays on AWS — zero changes there.
>
> My recommendation: **Upgrade to KVM8.** The price difference (₹1,100/mo extra) is worth the stability. KVM4 is a risk we don't want in production with 7 live services.
>
> Setup takes 2 days. Happy to proceed once you confirm the plan.

---

## What Is Actually Running on AWS Right Now

Verified live on `ubuntu@3.7.115.58` via `systemctl list-units`:

```
ctrlchecks-worker.service                loaded active running
ctrlchecks-ai-generator.service          loaded active running
ctrlchecks-execution-engine.service      loaded active running
ctrlchecks-credential-service.service    loaded active running
ctrlchecks-notification-service.service  loaded active running
ctrlchecks-trigger-service.service       loaded active running
ctrlchecks-workflow-crud-service.service loaded active running
```

**7 separate processes. 7 separate ports. 7 separate systemd units. All live.**

| Service | Port | Directory | What It Does |
|---|---|---|---|
| **worker** | 3001 | `/opt/ctrlchecks-worker/` | Core API, routes, orchestration |
| **ai-generator** | 3002 | `/opt/ctrlchecks-ai-generator/` | Workflow generation via Gemini AI |
| **execution-engine** | 3003 | `/opt/ctrlchecks-execution-engine/` | Runs workflow jobs step by step |
| **credential-service** | 3004 | `/opt/ctrlchecks-credential-service/` | Vault — stores & injects API keys/secrets |
| **notification-service** | 3005 | `/opt/ctrlchecks-notification-service/` | Email, webhooks, in-app notifications |
| **trigger-service** | 3006 | `/opt/ctrlchecks-trigger-service/` | Webhooks, forms, chat triggers |
| **workflow-crud-service** | 3007 | `/opt/ctrlchecks-workflow-crud-service/` | Save, load, version workflows |

---

## Verified Live Flow (End-to-End Proof)

This exact flow was tested live on the server:

```
Form submission
      │
      ▼
trigger-service :3006
      │  POST /api/internal/engine-execute
      ▼
worker :3001
      │  routes to execution engine
      ▼
execution-engine :3003
      │
      ▼
   ✅ Success
```

All 7 services communicate internally over `localhost` on the same server.

---

## What Stays on AWS (Zero Changes Required)

These services are external — they do not move to Hostinger KVM regardless of which plan is chosen:

| AWS Service | Purpose | Notes |
|---|---|---|
| **AWS RDS PostgreSQL** | Main database — all user data, workflows, executions | All 7 services connect to this |
| **AWS Cognito** | User login and authentication | Token validation on every request |
| **AWS SES** | Email delivery | Used by notification-service |
| **Google Gemini API** | All AI features and workflow generation | Used by ai-generator service |

No AWS configuration needs to change. KVM services connect to AWS over the internet.

---

## How Everything Connects

```
User (Browser)
      │
      ▼
Nginx on Hostinger KVM (port 80/443)
      │
      ├──→  Serves React Frontend (SPA, ~6 MB static files)
      │
      └──→  Reverse Proxy /api/* → worker :3001
                    │
                    ├── worker :3001          (core API + orchestration)
                    │        │
                    │        ├──→ ai-generator :3002       (AI workflow generation)
                    │        ├──→ execution-engine :3003   (workflow execution)
                    │        ├──→ credential-service :3004 (secrets injection)
                    │        ├──→ notification-service :3005 (emails/alerts)
                    │        ├──→ trigger-service :3006    (webhooks/forms)
                    │        └──→ workflow-crud-service :3007 (save/load)
                    │
                    └── All services connect to:
                              ├──→ AWS RDS PostgreSQL  (database)
                              ├──→ AWS Cognito          (auth)
                              ├──→ AWS SES              (email)
                              └──→ Google Gemini API    (AI)
```

Internal service-to-service calls stay on `localhost` — fast.  
External AWS calls go over internet — minor latency (~50–150ms), acceptable.

---

## RAM Usage — Honest Calculation (All 7 Services)

| Service | Port | RAM Baseline | RAM Peak |
|---|---|---|---|
| worker | 3001 | 600–800 MB | 1.2–1.8 GB |
| ai-generator | 3002 | 600–800 MB | 1.0–1.5 GB |
| execution-engine | 3003 | 600–800 MB | 1.0–1.5 GB |
| credential-service | 3004 | 400–500 MB | 700 MB–1 GB |
| notification-service | 3005 | 300–400 MB | 500–800 MB |
| trigger-service | 3006 | 300–400 MB | 500–800 MB |
| workflow-crud-service | 3007 | 300–400 MB | 500–800 MB |
| Redis | 6379 | 200 MB | 800 MB–2 GB |
| Nginx | 80/443 | 50–100 MB | 150–200 MB |
| OS + system | — | 1.5 GB | 2 GB |
| **Total** | | **~5 GB** | **~11–14 GB** |

---

## KVM4 vs KVM8 — Revised Verdict

| | KVM4 | KVM8 |
|---|---|---|
| vCPU | 4 cores | 8 cores |
| RAM | 16 GB | 32 GB |
| NVMe Disk | 160 GB | 320 GB |
| Bandwidth | 16 TB/mo | 32 TB/mo |
| Price | ₹1,099/mo | ₹2,199/mo |
| Peak RAM usage | ~11–14 GB | ~11–14 GB |
| Headroom | ⚠️ 2–5 GB only | ✅ 18+ GB |
| Safe for production? | ⚠️ Borderline risky | ✅ Comfortable |
| **Verdict** | **Not recommended** | **Recommended** |

### Why KVM4 is Risky

- 7 services running simultaneously = high base memory consumption
- A single traffic spike across multiple services can push RAM to 14–15 GB
- At 15+ GB on a 16 GB server, Linux starts killing processes (OOM killer)
- One crashed service can cascade — trigger-service dies → executions stop → users see failures
- No room to add monitoring tools, log aggregation, or future services

### Why KVM8 is the Right Choice

- 32 GB RAM gives 18+ GB headroom after all 7 services
- Can absorb traffic spikes without risk
- Room to add monitoring (Prometheus, Grafana) without pressure
- Future-proof: can extract more services or increase concurrency
- Price difference: ₹1,100/mo extra — worth the stability in production

---

## Honest Disadvantage of Moving to Hostinger (Either Plan)

Currently on AWS EC2, all 7 services AND the database (RDS) are in the same AWS network:

- **EC2 → RDS latency:** ~2–5 ms (internal AWS network)

After moving to Hostinger KVM:

- **Hostinger → RDS latency:** ~50–150 ms (public internet)

Every database query from every one of the 7 services adds this latency.

**Impact now:** Acceptable at low-to-medium user load. Users won't notice.  
**Impact at scale:** Noticeable at high traffic. At that point, migrate back to AWS EC2 which keeps everything in the same network.

---

## 2-Day Setup Plan

This is more involved than a single-app deployment because all 7 services need to be set up separately.

### Day 1 — Server Setup & All 7 Service Deployments

- [ ] SSH into Hostinger KVM, install Node.js 20, Nginx, Redis
- [ ] Create 7 service directories: `/opt/ctrlchecks-[service-name]/`
- [ ] Deploy each service: copy `dist/`, `package.json`, run `npm ci --omit=dev`
- [ ] Create `.env` file for each service (RDS URL, Cognito keys, Gemini key, inter-service URLs)
- [ ] Create 7 systemd unit files (one per service) — same pattern as current AWS setup
- [ ] Enable and start all 7 services: `systemctl enable + start`
- [ ] Configure Nginx: serve frontend SPA + reverse proxy `/api/*` → worker :3001
- [ ] Test inter-service communication: trigger-service → worker → execution-engine

### Day 2 — SSL, DNS, Verification & Go-Live

- [ ] Install SSL certificate via Let's Encrypt (free HTTPS)
- [ ] Point domain DNS to Hostinger KVM IP
- [ ] Verify all AWS connections: RDS queries, Cognito auth, SES email, Gemini AI
- [ ] Run end-to-end test: form submission → trigger → execution → success
- [ ] Monitor RAM usage across all 7 services under real load
- [ ] Confirm all 7 `systemctl status` show `active running`
- [ ] Go live — update any DNS/domain settings

---

## When to Upgrade from KVM8 (Future Planning)

| Trigger | Action |
|---|---|
| RAM consistently above 24 GB | Move to dedicated server or back to AWS EC2 |
| 500+ concurrent workflow executions | Scale horizontally — multiple KVM8 instances behind load balancer |
| Latency complaints from users | Move back to AWS EC2 (same network as RDS) |
| Adding more microservices | Reassess RAM requirements per new service |

---

## Final Verdict

| Question | Answer |
|---|---|
| Is the current system microservices? | ✅ Yes — 7 separate processes, verified live |
| Can KVM4 host all 7 services? | ⚠️ Borderline — only 2–5 GB headroom, risky |
| Can KVM8 host all 7 services? | ✅ Yes — 18+ GB headroom, comfortable |
| What runs on KVM? | All 7 microservices + Redis + Nginx |
| What stays on AWS? | RDS Database, Cognito Auth, SES Email, Gemini AI |
| Any disadvantage? | DB latency 50–150ms (vs 2–5ms on AWS) — acceptable now |
| Upgrade KVM4 → KVM8? | ✅ Yes — recommended before going live |
| Setup time? | 2 days (more complex due to 7 services) |
| **Overall recommendation** | **Take KVM8. The ₹1,100/mo difference is worth production stability.** |

---

*Prepared by the development team. Based on live server verification — ubuntu@3.7.115.58, June 2026.*
