# Phase 3 — OAuth Connections Matrix

**Prerequisite:** Phase 2 PASS.

**Objective:** Connect, test, and reconnect every OAuth provider. One provider per session — do not batch all OAuth flows in one run (rate limits + human approval in provider consoles).

---

## OAuth providers (priority order)

Test in this order. Mark each in results log before moving on.

| Priority | Provider | Connect URL | Callback (production) | Test workflow JSON |
|----------|----------|-------------|----------------------|-------------------|
| P0 | Google | `/connections` → Google | `/api/oauth/google/callback` | `testing/google/type2_01_gmail.json` |
| P0 | GitHub | `/connections` → GitHub | `/api/oauth/github/callback` | (repo node workflow) |
| P1 | Slack | `/connections` → Slack | credential-connections OAuth | `testing/productivity/type2_13_slack.json` |
| P1 | Notion | `/connections` → Notion | `/api/oauth/notion/callback` | `testing/productivity/type2_12_notion.json` |
| P1 | LinkedIn | `/connections` → LinkedIn | `/api/oauth/linkedin/callback` | `testing/social/type2_10_linkedin.json` |
| P2 | Microsoft | `/connections` → Microsoft | credential-connections OAuth | `testing/productivity/type2_15_onedrive.json` |
| P2 | Salesforce | `/connections` → Salesforce | `/api/oauth/salesforce/callback` | `testing/crm/type2_18_salesforce.json` |
| P2 | HubSpot | `/connections` → HubSpot | OAuth or PAT | `testing/crm/type2_17_hubspot.json` |
| P2 | Twitter/X | `/connections` → Twitter | `/api/oauth/twitter/callback` | `testing/social/type2_07_twitter.json` |
| P3 | Facebook | `/connections` → Facebook | `/api/oauth/facebook/callback` | `testing/social/type2_09_facebook.json` |
| P3 | Instagram | `/connections` → Meta/IG | Meta OAuth | `testing/social/type2_08_instagram.json` |
| P3 | YouTube | Google (extended scopes) | Google OAuth | `testing/social/type2_11_youtube.json` |
| P3 | Zoom | `/connections` → Zoom | credential-connections OAuth | `testing/business/type2_20_zoom.json` |
| P3 | Dropbox | `/connections` → Dropbox | credential-connections OAuth | `testing/productivity/type2_14_dropbox.json` |
| P3 | Zoho | `/connections` → Zoho | `/api/oauth/zoho/callback` | (CRM workflow) |
| P4 | WhatsApp | Meta Business | Meta OAuth | (messaging workflow) |

---

## Per-provider test procedure

For **each** provider:

### Step A — OAuth start (API)

```bash
# Example: credential-connections generic start
curl -s -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  "https://worker.ctrlchecks.com/api/credential-connections/oauth/start?credentialTypeId=google_oauth2&redirectUri=https://ctrlchecks.ai/connections"
```

**Expected:** `authorizationUrl` in JSON (not 500).

### Step B — UI connect (human)

1. Open `https://ctrlchecks.ai/connections`
2. Click provider → complete OAuth in browser
3. Return to app → status **Connected**

### Step C — Test connection (API)

```bash
CONNECTION_ID="<uuid from list>"
curl -s -X POST -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  "https://worker.ctrlchecks.com/api/credential-connections/connections/$CONNECTION_ID/test"
```

**Expected:** `success: true` or valid test response.

### Step D — Import & run type-2 workflow

1. Import JSON from `testing/<category>/type2_XX_*.json`
2. Fill placeholders (see `testing/TESTING_GUIDE.md`)
3. Execute
4. All nodes green OR actionable error (not "OAuth token not found")

### Step E — Reconnect flow

1. Disconnect provider
2. Reconnect via `/connections`
3. Re-run same workflow → still works

### Step F — Redirect URI verification (.ai domain)

Confirm provider developer console has:

```
https://worker.ctrlchecks.com/api/oauth/<provider>/callback
https://ctrlchecks.ai/auth/<provider>/callback
```

---

## Results template (per provider)

```markdown
### Google OAuth
- [ ] OAuth start returns authorizationUrl
- [ ] UI connect completes
- [ ] connection test API passes
- [ ] type2_01_gmail.json executes (send or list)
- [ ] Reconnect works
- [ ] Redirect URIs on .ai domain
Notes: ____
```

---

## gstack usage

```
/browse navigate https://ctrlchecks.ai/connections
/qa Test OAuth connect flow for Google — verify Connected badge appears
```

For providers requiring human OAuth approval, use `/browse` with `setup-browser-cookies` if needed.

---

## Gate

All **P0** and **P1** providers PASS → proceed to Phase 4 Tier 1–2.

P2–P4 can run in parallel with Phase 4 node tiers (same provider family).

---

## Common failures

| Symptom | Fix |
|---------|-----|
| `redirect_uri_mismatch` | Update provider console + server `*_REDIRECT_URI` to `.ai` |
| `OAuth token not found` at execute | Connection not linked to workflow user |
| Token expired | Reconnect in `/connections` |
| Scope insufficient | Reconnect with expanded scopes in provider app |
