# HubSpot OAuth App — Migration Guide
**From:** old HubSpot app (old credentials in .env)  
**To:** new HubSpot app under `adminctrlchecks@gmail.com`

HubSpot is used for the **Connect HubSpot** flow — users link their HubSpot portal so workflows can read/write contacts, companies, deals, and tickets.

**Same pattern as Slack:** Redirect URI goes to the **worker** credential-connections endpoint.

Env vars: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `GENERIC_HUBSPOT_OAUTH_REDIRECT_URI`

---

## Step 1 — Sign in to HubSpot Developer Portal

1. Go to [https://developers.hubspot.com/](https://developers.hubspot.com/)
2. Click **"Log in"** and sign in with `adminctrlchecks@gmail.com`
3. If prompted, create a **developer account** (free) — this is separate from a HubSpot CRM account

---

## Step 2 — Create a New App

1. Click **"Apps"** in the top navigation (or go to **"Manage apps"**)
2. Click **"Create app"**
3. Fill in the **App info** tab:
   - **App name:** `CtrlChecks`
   - **Description:** `AI-powered workflow automation`
   - **App logo:** Upload your logo (optional)
4. Click **"Auth"** tab to configure OAuth

---

## Step 3 — Configure OAuth (Auth Tab)

### Redirect URL

Under **"Redirect URLs"**, add:

```
https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

Click **"+ Add redirect URL"** to add a second one for local dev:

```
http://localhost:3001/api/credential-connections/oauth/callback
```

### Scopes

Under **"Scopes"**, search for and add each of these:

| Scope | What it allows |
|---|---|
| `crm.objects.contacts.read` | Read contacts |
| `crm.objects.contacts.write` | Create/update contacts |
| `crm.objects.companies.read` | Read companies |
| `crm.objects.companies.write` | Create/update companies |
| `crm.objects.deals.read` | Read deals |
| `crm.objects.deals.write` | Create/update deals |
| `crm.objects.owners.read` | Read owner/user info |
| `tickets` | Read/write support tickets |

> Search by name in the scopes field — they appear as autocomplete suggestions.

---

## Step 4 — Copy Client ID and Client Secret

Still on the **"Auth"** tab, at the top you'll see:

- **Client ID** → copy it → `HUBSPOT_CLIENT_ID`
- **Client secret** → click "Show" → copy it → `HUBSPOT_CLIENT_SECRET`

Click **"Save changes"** before leaving this page.

---

## Step 5 — Update Local worker/.env

Open `worker/.env` and update:

```env
HUBSPOT_CLIENT_ID=<paste Client ID here>
HUBSPOT_CLIENT_SECRET=<paste Client Secret here>
GENERIC_HUBSPOT_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

---

## Step 6 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual credentials):

```bash
sed -i 's|^HUBSPOT_CLIENT_ID=.*|HUBSPOT_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^HUBSPOT_CLIENT_SECRET=.*|HUBSPOT_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^GENERIC_HUBSPOT_OAUTH_REDIRECT_URI=.*|GENERIC_HUBSPOT_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 7 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **HubSpot** and click **Connect**
4. HubSpot will ask you to select a portal to connect — select your HubSpot account
5. Review the permissions and click **"Grant access"**
6. You'll be redirected back — HubSpot should show as **Connected**

---

## Summary Checklist

- [x] HubSpot developer account created (`adminctrlchecks@gmail.com`)
- [x] App created with name `CtrlChecks` (App ID `44516824`, via HubSpot CLI Developer Projects — legacy Public app creation is disabled, see note below)
- [x] Redirect URL added: `https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback`
- [x] All 8 scopes added (+ `oauth`)
- [x] `HUBSPOT_CLIENT_ID` updated in local `worker/.env`
- [x] `HUBSPOT_CLIENT_SECRET` updated in local `worker/.env`
- [x] `GENERIC_HUBSPOT_OAUTH_REDIRECT_URI` updated in local `worker/.env`
- [x] Server `.env` updated with same values
- [x] Worker restarted
- [x] Connect HubSpot test passed (from Connections page)

> **Note:** HubSpot disabled creating new "legacy" Public apps via the web UI. This app was created with the HubSpot CLI (`@hubspot/cli`) instead — project scaffolded in `hubspot-app/` at the repo root via `hs project create` (distribution: `marketplace`, auth: `oauth`), scopes/redirect URLs set in `hubspot-app/src/app/app-hsmeta.json`, deployed with `hs project upload`. Client ID/Secret are only visible in the HubSpot UI under the app's **Auth** tab, not via CLI.
>
> The app also required agreeing to HubSpot's **Acceptable Use Policy** (Distribution tab → "Begin publishing your app" → step 1) before OAuth installs would work at all — this is a one-time step, separate from full Marketplace listing/review. Connections currently show an "unverified app" warning to users; removing that requires completing full Marketplace review (3+ installs, listing content, HubSpot review) — deferred until there's real usage.

---

**Next guide:** `09-ZOOM-MIGRATION.md`
