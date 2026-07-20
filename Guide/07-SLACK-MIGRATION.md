# Slack OAuth App — Migration Guide
**From:** old Slack app (old credentials in .env)  
**To:** new Slack app under `adminctrlchecks@gmail.com` workspace

Slack is used for the **Connect Slack** flow — users link their Slack workspace so workflows can send messages, read channels, and look up users.

**Redirect URI goes to the WORKER** (unlike Notion/Twitter) — specifically the credential-connections endpoint.

Env vars: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `GENERIC_SLACK_OAUTH_REDIRECT_URI`  
Scopes needed: `chat:write`, `channels:read`, `users:read`

---

## Step 1 — Sign in to Slack API Dashboard

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Sign in with the Slack account linked to `adminctrlchecks@gmail.com`

---

## Step 2 — Create a New App

1. Click **"Create New App"**
2. Choose **"From scratch"**
3. Fill in:
   - **App Name:** `CtrlChecks`
   - **Pick a workspace to develop your app in:** Select any workspace you have access to (this is just the dev workspace — users from any workspace can install the app)
4. Click **"Create App"**

---

## Step 3 — Add Bot Token Scopes

1. In the left sidebar, go to **"OAuth & Permissions"**
2. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add each of these:

| Scope | Purpose |
|---|---|
| `chat:write` | Send messages to channels |
| `channels:read` | List public channels |
| `users:read` | Look up user information |

> Do NOT add User Token Scopes — Bot Token Scopes are sufficient.

---

## Step 4 — Add Redirect URL

Still on the **"OAuth & Permissions"** page, scroll up to **"Redirect URLs"**.

1. Click **"Add New Redirect URL"**
2. Add:
```
https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```
3. Click **"Add"**
4. Click **"Save URLs"**

> ⚠️ Unlike Notion and Twitter, Slack's callback goes to the **worker** (not the frontend). Use `worker.ctrlchecks.ai`, not `www.ctrlchecks.ai`.

---

## Step 5 — Copy Client ID and Client Secret

1. In the left sidebar, go to **"Basic Information"**
2. Scroll down to **"App Credentials"**
3. Copy:
   - **Client ID** → `SLACK_CLIENT_ID`
   - **Client Secret** (click "Show") → `SLACK_CLIENT_SECRET`

---

## Step 6 — Update Local worker/.env

Open `worker/.env` and update:

```env
SLACK_CLIENT_ID=<paste Client ID here>
SLACK_CLIENT_SECRET=<paste Client Secret here>
GENERIC_SLACK_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

---

## Step 7 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual credentials):

```bash
sed -i 's|^SLACK_CLIENT_ID=.*|SLACK_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^SLACK_CLIENT_SECRET=.*|SLACK_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^GENERIC_SLACK_OAUTH_REDIRECT_URI=.*|GENERIC_SLACK_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 8 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **Slack** and click **Connect**
4. Slack will open an authorization screen — select your workspace and click **"Allow"**
5. You'll be redirected back and Slack should show as **Connected**

---

## Token Expiry Note

Slack bot tokens **do not expire** — they stay valid until the app is uninstalled from the workspace or the token is revoked. No refresh needed.

---

## Summary Checklist

- [ ] Slack app created at api.slack.com/apps
- [ ] Bot Token Scopes added: `chat:write`, `channels:read`, `users:read`
- [ ] Redirect URL added: `https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback`
- [ ] `SLACK_CLIENT_ID` updated in local `worker/.env`
- [ ] `SLACK_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `GENERIC_SLACK_OAUTH_REDIRECT_URI` updated in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted
- [ ] Connect Slack test passed (from Connections page)

---

**Next guide:** `08-HUBSPOT-MIGRATION.md`
