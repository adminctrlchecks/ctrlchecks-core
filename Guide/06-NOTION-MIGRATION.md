# Notion OAuth Integration — Migration Guide
**From:** personal Notion developer account  
**To:** business Notion integration under `adminctrlchecks@gmail.com`

Notion is used for the **Connect Notion** flow — users link their Notion workspace so workflows can read and write pages, databases, and blocks.

**Same pattern as Twitter:** Notion's OAuth callback redirects to the **frontend** (`www.ctrlchecks.ai`), not the worker.

Env vars: `NOTION_OAUTH_CLIENT_ID`, `NOTION_OAUTH_CLIENT_SECRET`, `NOTION_OAUTH_REDIRECT_URI`

---

## Step 1 — Sign in to Notion Integrations

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Sign in with the Notion account linked to `adminctrlchecks@gmail.com`

---

## Step 2 — Create a New Integration

1. Click **"+ New integration"**
2. Fill in the **Basic Information**:

| Field | Value |
|---|---|
| **Name** | `CtrlChecks` |
| **Associated workspace** | Select the workspace owned by the admin account |
| **Logo** | Upload your logo (optional) |

3. Under **"Integration type"**, select **"Public"**
   > Public is required for OAuth. "Internal" integrations cannot be authorized by other users.

4. Click **"Submit"** to create the integration

---

## Step 3 — Configure OAuth Settings

After creation you land on the integration settings page. Go to the **"Distribution"** tab (or "OAuth Domain & URIs" section depending on Notion's current UI).

### Redirect URIs

Add these one by one:

```
https://www.ctrlchecks.ai/auth/notion/callback
```
```
http://localhost:8080/auth/notion/callback
```
```
http://localhost:5173/auth/notion/callback
```

### Company information (required for public integrations)

| Field | Value |
|---|---|
| **Website** | `https://www.ctrlchecks.ai` |
| **Privacy policy URL** | `https://www.ctrlchecks.ai/privacy` |
| **Terms of use URL** | `https://www.ctrlchecks.ai/terms` |
| **Support email** | `adminctrlchecks@gmail.com` |

Click **"Save changes"**.

---

## Step 4 — Copy OAuth Credentials

On the same page (or the **"Secrets"** tab), find:

- **OAuth client ID** → this is your `NOTION_OAUTH_CLIENT_ID`
- **OAuth client secret** → click "Show" to reveal → this is your `NOTION_OAUTH_CLIENT_SECRET`

> Notion may also show an **"Internal Integration Token"** — ignore that. You only need the OAuth client ID and secret.

---

## Step 5 — Update Local worker/.env

Open `worker/.env` and update:

```env
NOTION_OAUTH_CLIENT_ID=<paste Client ID here>
NOTION_OAUTH_CLIENT_SECRET=<paste Client Secret here>
NOTION_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/notion/callback
```

> Again — the redirect URI points to the **frontend** (`www.ctrlchecks.ai`), not the worker. Notion redirects the user's browser to the frontend callback page, which then POSTs the code to the worker.

---

## Step 6 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual credentials):

```bash
sed -i 's|^NOTION_OAUTH_CLIENT_ID=.*|NOTION_OAUTH_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^NOTION_OAUTH_CLIENT_SECRET=.*|NOTION_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^NOTION_OAUTH_REDIRECT_URI=.*|NOTION_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/notion/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 7 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **Notion** and click **Connect**
4. Notion will open an authorization screen — select which pages/databases to share and click **"Allow access"**
5. You'll be redirected back to `www.ctrlchecks.ai/auth/notion/callback`
6. Notion should show as **Connected** on the Connections page

> **Note on Notion permissions:** Unlike Google/LinkedIn where you grant broad scopes upfront, Notion requires users to explicitly select which pages and databases to share. Users can always go back to Notion settings and share more pages if a workflow needs access to a new database.

---

## Token Expiry Note

Notion access tokens **do not expire** — once connected, users stay connected indefinitely unless they revoke access from their Notion account settings. No token refresh is needed.

---

## Summary Checklist

- [ ] Notion integration created under admin account
- [ ] Integration type set to **Public**
- [ ] Redirect URI added: `https://www.ctrlchecks.ai/auth/notion/callback`
- [ ] Company info filled in (website, privacy, terms, email)
- [ ] `NOTION_OAUTH_CLIENT_ID` updated in local `worker/.env`
- [ ] `NOTION_OAUTH_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `NOTION_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/notion/callback` set in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted
- [ ] Connect Notion test passed (from Connections page)

---

**Next guide:** `07-SLACK-MIGRATION.md`
