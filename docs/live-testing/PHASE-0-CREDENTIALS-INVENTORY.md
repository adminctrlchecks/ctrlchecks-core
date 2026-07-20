# Phase 0 — Credentials Inventory

**Objective:** Document every credential before any live test runs. Nothing starts until Tier-1 infra is verified on the server.

**Run location:** Server SSH + secure credential store (never commit secrets to git).

---

## Tier 1 — Infrastructure (server `.env` — must exist)

These are already on production. Verify with `systemctl cat ctrlchecks-worker` and `/opt/ctrlchecks-worker/.env`.

| Variable | Purpose | Verify command |
|----------|---------|----------------|
| `DATABASE_URL` | RDS PostgreSQL | `curl /health/ready` → `db: ok` |
| `REDIS_URL` | Rate limit, cache, queue | `curl /health/ready` → `redis: ok` |
| `COGNITO_USER_POOL_ID` | Auth | Sign-in on frontend works |
| `COGNITO_CLIENT_ID` | Auth | JWT issued on login |
| `COGNITO_ISSUER` | JWT verify | API calls with Bearer succeed |
| `GEMINI_API_KEY` | AI workflow generation | `POST /api/generate-workflow` returns 200 |
| `AWS_REGION` | S3, SES, etc. | Worker starts without AWS errors |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS services | No startup credential errors |
| `SENTRY_DSN` | Error tracking | Trigger test error → appears in Sentry |
| `PUBLIC_BASE_URL` | OAuth redirects | Must be `https://worker.ctrlchecks.com` or `.ai` domain |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | CORS | Frontend API calls succeed |

**Gate:** `/health/ready` returns `{"status":"ready","checks":{"db":"ok","redis":"ok"}}`

---

## Tier 2 — Live test runner (dedicated test user)

| Variable | Purpose | How to obtain |
|----------|---------|---------------|
| `LIVE_TEST_BEARER_TOKEN` | Cognito JWT for test user | Log in as `live-test@ctrlchecks.ai` (or dedicated account) → copy token from browser devtools |
| `LIVE_TEST_USER_ID` | Optional cleanup override | Cognito `sub` claim from JWT |
| `LIVE_E2E_BASE_URL` | API base | `https://worker.ctrlchecks.com` |

Store on server only:

```bash
# /opt/ctrlchecks-worker/.env.live-test (chmod 600, NOT in git)
LIVE_TEST_BEARER_TOKEN=eyJ...
LIVE_E2E_BASE_URL=https://worker.ctrlchecks.com
```

---

## Tier 3 — OAuth app credentials (server `.env`)

Each provider needs **client ID + secret** and **redirect URI** registered in the provider's developer console.

**Production redirect pattern (update all to `.ai` domain):**

```
https://worker.ctrlchecks.com/api/oauth/<provider>/callback
https://worker.ctrlchecks.com/api/credential-connections/oauth/callback
https://ctrlchecks.ai/auth/<provider>/callback   # frontend callback pages
```

| Provider | Server env vars | Developer console |
|----------|-----------------|-------------------|
| Google | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Google Cloud Console → OAuth 2.0 |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer Portal |
| Facebook / Meta | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `META_*` | Meta for Developers |
| Notion | `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET` | Notion → Integrations |
| Twitter / X | `TWITTER_OAUTH_CLIENT_ID`, `TWITTER_OAUTH_CLIENT_SECRET` | X Developer Portal |
| Salesforce | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` | Salesforce Connected App |
| Slack | via credential-connections registry | Slack API → OAuth |
| Microsoft | via credential-connections registry | Azure AD App Registration |
| Zoom | via credential-connections registry | Zoom Marketplace |
| HubSpot | OAuth or `hubspot_private_app` PAT | HubSpot Developer |
| Zoho | `ZOHO_OAUTH_*` | Zoho API Console |

**Gate:** For each provider in Phase 3, mark ✅ only after OAuth start URL returns redirect (not 500).

---

## Tier 4 — API-key providers (user connects in `/connections`)

User pastes keys in UI; stored encrypted in `connections` table. For live testing, prepare test keys in a password manager (not in repo).

| Category | Credential type IDs | Test key needed |
|----------|---------------------|-----------------|
| AI | `openai_api_key`, `anthropic_api_key`, `gemini_api_key` | Optional — worker has GEMINI |
| CRM | `hubspot_private_app`, `pipedrive_api_key`, `airtable_api_key` | Yes for CRM tier tests |
| Comms | `sendgrid_api_key`, `twilio_api_key`, `discord_webhook` | Yes for notification tests |
| Payments | `stripe_api_key` | Sandbox keys only |
| DevOps | `vercel_api_key`, `cloudflare_api_key` | Optional |
| Database | `postgresql_connection`, `mongodb_connection` | Test DB instance |

Full list: `worker/src/credentials-system/credential-type-registry.ts` (~57 types).

---

## Tier 5 — Per-workflow placeholders (not env vars)

Some `testing/*.json` workflows need real IDs filled in after import:

| Placeholder | Used by |
|-------------|---------|
| `YOUR_SPREADSHEET_ID` | Google Sheets |
| `YOUR_BASE_ID` / `YOUR_TABLE_NAME` | Airtable |
| `YOUR_NOTION_DATABASE_ID` | Notion |
| `YOUR_SHOPIFY_STORE` | Shopify |
| `test@yourdomain.com` | Gmail send |
| `YOUR_SLACK_CHANNEL` | Slack |

See `testing/TESTING_GUIDE.md` for full list.

---

## Phase 0 Checklist

Copy to `.claude/logs/LIVE-TEST-RESULTS.md`:

```markdown
## Phase 0 — Credentials Inventory
Date: ____
Tester: ____

### Tier 1 Infrastructure
- [ ] DATABASE_URL verified (health/ready db ok)
- [ ] REDIS_URL verified (health/ready redis ok)
- [ ] Cognito auth works (frontend login)
- [ ] GEMINI_API_KEY works (generate-workflow)
- [ ] SENTRY_DSN receiving events
- [ ] Domain migration .com → .ai redirect URIs updated

### Tier 2 Test Runner
- [ ] LIVE_TEST_BEARER_TOKEN obtained
- [ ] LIVE_E2E_BASE_URL=https://worker.ctrlchecks.com
- [ ] Token stored in server .env.live-test (chmod 600)

### Tier 3 OAuth Apps (server env present)
- [ ] Google
- [ ] GitHub
- [ ] LinkedIn
- [ ] Facebook/Meta
- [ ] Notion
- [ ] Twitter/X
- [ ] Salesforce
- [ ] Slack
- [ ] Microsoft
- [ ] Zoom
- [ ] HubSpot
- [ ] Zoho

### Tier 4 API Keys (test account in /connections)
- [ ] HubSpot PAT
- [ ] Airtable PAT
- [ ] SendGrid
- [ ] Stripe sandbox
- [ ] (add others as needed per tier)

**Phase 0 Gate:** Tier 1 + Tier 2 complete → proceed to Phase 1
```

---

## Phase 0 Script (server)

```bash
#!/bin/bash
# scripts/live-testing/phase-0-verify-infra.sh
set -euo pipefail
BASE="${LIVE_E2E_BASE_URL:-https://worker.ctrlchecks.com}"

echo "=== Phase 0: Infrastructure ==="
curl -sf "$BASE/health/live" | jq -e '.status == "live"'
curl -sf "$BASE/health/ready" | jq -e '.status == "ready" and .checks.db == "ok" and .checks.redis == "ok"'
echo "✅ Tier 1 infra OK"

if [ -z "${LIVE_TEST_BEARER_TOKEN:-}" ]; then
  echo "❌ LIVE_TEST_BEARER_TOKEN not set — obtain from test user login"
  exit 1
fi
curl -sf -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" "$BASE/api/templates" -o /dev/null
echo "✅ Tier 2 test token OK"
```
