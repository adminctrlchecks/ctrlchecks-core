# Zoho CRM OAuth App — Migration Guide
**From:** old Zoho app (old credentials in `.env`)
**To:** new Zoho app under `adminctrlchecks@gmail.com`

Zoho is used for the **Connect Zoho** flow — users link their Zoho CRM account so workflows can manage leads, contacts, and deals.

**Same pattern as Slack/HubSpot/Zoom:** Redirect URI goes to the **worker** credential-connections endpoint.

Env vars: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `GENERIC_ZOHO_OAUTH_REDIRECT_URI`

> **Region matters for Zoho.** Zoho accounts are tied to a specific data center — `.com` (US), `.eu`, `.in`, `.com.au`, `.jp`, etc. The app must be registered in the same region as the account signing in, or auth will fail with a domain mismatch. Use `accounts.zoho.com` unless you know `adminctrlchecks@gmail.com` is registered in a different region.

---

## Step 1 — Sign in to Zoho API Console

1. Go to [https://api-console.zoho.com/](https://api-console.zoho.com/)
2. Sign in with `adminctrlchecks@gmail.com`
3. If prompted, create a Zoho account (free) — this is separate from a Zoho CRM subscription

---

## Step 2 — Create a New Client

1. Click **"Add Client"** / **"Get Started"**
2. Choose client type: **"Server-based Applications"** (this is Zoho's term for a standard 3-legged OAuth app with a client secret and redirect URL — do not choose "Self Client" or "Mobile-based", those don't support redirect-URL OAuth for multiple users)
3. Fill in:
   - **Client Name:** `CtrlChecks`
   - **Homepage URL:** `https://www.ctrlchecks.ai`
   - **Authorized Redirect URIs:**
     ```
     https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
     ```
     Add a second line for local dev if the field allows multiple:
     ```
     http://localhost:3001/api/credential-connections/oauth/callback
     ```
4. Click **"Create"**

---

## Step 3 — Copy Client ID and Client Secret

On the client's detail page (**Client Secret** tab):

- **Client ID** → copy it → `ZOHO_CLIENT_ID`
- **Client Secret** → copy it → `ZOHO_CLIENT_SECRET`

---

## Step 4 — Scopes (requested at connect time, not configured on the app)

Zoho doesn't pre-register scopes on the client — they're passed in the authorization URL at connect time. Confirm the worker is requesting:

| Scope | What it allows |
|---|---|
| `ZohoCRM.modules.ALL` | Read/write access to all CRM modules (leads, contacts, deals) |
| `ZohoCRM.users.READ` | Read user/owner info |

These are already defined in `worker/src/services/credential-scope-registry.ts` — no code change needed, just confirming they match what's live.

---

## Step 5 — Update Local worker/.env

Open `worker/.env` and update:

```env
ZOHO_CLIENT_ID=<paste Client ID here>
ZOHO_CLIENT_SECRET=<paste Client Secret here>
GENERIC_ZOHO_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

> Leave `ZOHO_OAUTH_REDIRECT_URI` (the non-generic, legacy one pointing at `localhost:8080/auth/zoho/callback`) alone unless you confirm it's still referenced somewhere — the active flow uses the `GENERIC_` credential-connections one.

---

## Step 6 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual credentials):

```bash
sed -i 's|^ZOHO_CLIENT_ID=.*|ZOHO_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^ZOHO_CLIENT_SECRET=.*|ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^GENERIC_ZOHO_OAUTH_REDIRECT_URI=.*|GENERIC_ZOHO_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 7 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **Zoho** and click **Connect**
4. Sign in to Zoho, confirm the region/domain matches your account, and authorize
5. You'll be redirected back — Zoho should show as **Connected**

---

## Summary Checklist

- [ ] Zoho API Console client created under `adminctrlchecks@gmail.com`
- [ ] Client type: **Server-based Applications**
- [ ] Redirect URI added: `https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback`
- [ ] `ZOHO_CLIENT_ID` updated in local `worker/.env`
- [ ] `ZOHO_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `GENERIC_ZOHO_OAUTH_REDIRECT_URI` updated in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted
- [ ] Connect Zoho test passed (from Connections page)

---

**This is the last provider in the OAuth migration series.**
