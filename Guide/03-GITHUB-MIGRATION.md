# GitHub OAuth App — Migration Guide
**From:** personal GitHub account (`VusalaShiva`)  
**To:** business/org GitHub account (linked to `adminctrlchecks@gmail.com`)

GitHub OAuth is used for two things:
1. **Sign in with GitHub** — users can create a CtrlChecks account or log in using their GitHub account
2. **Connect GitHub** — users link their GitHub repos so workflows can read/write issues, commits, files, etc.

Both flows use the same OAuth App and the same callback URL.

---

## Step 1 — Sign in to GitHub as the New Account

1. Open a browser in **Incognito mode**
2. Go to [https://github.com](https://github.com)
3. Sign in with the GitHub account you want to own the OAuth App going forward

> **Which account to use:** Use the GitHub account belonging to or controlled by `adminctrlchecks@gmail.com`. If you have a GitHub Organization for CtrlChecks, you can create the OAuth App under the org instead — skip to the tip below.

---

## Step 2 — Create a New OAuth App

1. Click your **profile picture** (top-right) → **Settings**
2. In the left sidebar, scroll down to **Developer settings** (very bottom)
3. Click **OAuth Apps**
4. Click **"New OAuth App"**

Fill in the form:

| Field | Value |
|---|---|
| **Application name** | `CtrlChecks` |
| **Homepage URL** | `https://www.ctrlchecks.ai` |
| **Application description** | (optional) `AI-powered workflow automation` |
| **Authorization callback URL** | `https://worker.ctrlchecks.ai/api/oauth/github/callback` |

> **Note on multiple callback URLs:** GitHub supports multiple callback URLs (one per line) as of 2022. After creating the app, you can add the local dev URLs too — see Step 3 below.

5. Click **"Register application"**

---

## Step 3 — Add All Callback URLs

After the app is created, you'll land on the app settings page.

Under **Authorization callback URL**, add all of these — one per line:

```
https://worker.ctrlchecks.ai/api/oauth/github/callback
http://localhost:3001/api/oauth/github/callback
http://127.0.0.1:3001/api/oauth/github/callback
```

> The production URL (`worker.ctrlchecks.ai`) must be first. Local URLs are for development only — they won't work in production but having them here doesn't hurt.

Click **"Update application"** to save.

---

## Step 4 — Copy Your Client ID and Generate a Client Secret

On the same app settings page:

1. **Client ID** is already visible near the top. Copy it now.

2. Under **Client secrets**, click **"Generate a new client secret"**
3. GitHub will show the secret **once only** — copy it immediately.
   > If you navigate away without copying, you must generate a new one.

You now have:
- `Client ID` → `GITHUB_CLIENT_ID`
- `Client Secret` → `GITHUB_CLIENT_SECRET`

---

## Step 5 — Update worker/.env on the Server

SSH into the Hostinger server and edit the worker `.env`:

```bash
ssh root@worker.ctrlchecks.ai
cd /var/www/ctrlchecks
nano worker/.env
```

Update these three lines:

```env
GITHUB_CLIENT_ID=<paste Client ID here>
GITHUB_CLIENT_SECRET=<paste Client Secret here>
GITHUB_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/oauth/github/callback
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## Step 6 — Restart the Worker

```bash
pm2 restart worker
```

Wait ~5 seconds, then check it came back up:

```bash
pm2 status
pm2 logs worker --lines 20
```

You should see no errors and the worker listening on port 3001.

---

## Step 7 — Verify Everything Works

Test both flows:

### 7a — Sign in with GitHub (login flow)

1. Open `https://www.ctrlchecks.ai` in a fresh Incognito window
2. Click **"Sign in with GitHub"** on the login page
3. GitHub should show an authorization prompt for **CtrlChecks**
4. Accept — you should be redirected back and logged in

### 7b — Connect GitHub (connect flow)

1. Log in to `https://www.ctrlchecks.ai` with an existing account
2. Go to **Connections** (`/connections`)
3. Find **GitHub** and click **Connect**
4. Authorize the app on GitHub
5. You should be redirected back to `/connections` with GitHub showing as connected

### 7c — GitHub node in a workflow (optional)

1. Create or run a workflow that includes a GitHub node (e.g., "Create GitHub Issue")
2. If it executes successfully, the credential lookup is working end-to-end

---

## Step 8 — Clean Up Old OAuth App (Do Last)

Only after verifying both flows above:

1. Log in to GitHub as the **old account** (`VusalaShiva`)
2. Go to **Settings → Developer settings → OAuth Apps**
3. Open the old **CtrlChecks** OAuth App
4. Click **"Delete application"** at the bottom
5. Confirm deletion

> Deleting it will immediately invalidate all tokens issued by the old app. Any users who connected GitHub under the old app will need to reconnect — they'll be prompted automatically when they next try to use a GitHub node.

---

## Summary Checklist

- [ ] New GitHub OAuth App created under business account
- [ ] Homepage URL set to `https://www.ctrlchecks.ai`
- [ ] Production callback URL set: `https://worker.ctrlchecks.ai/api/oauth/github/callback`
- [ ] Local dev callback URLs added
- [ ] `GITHUB_CLIENT_ID` updated in `worker/.env`
- [ ] `GITHUB_CLIENT_SECRET` updated in `worker/.env`
- [ ] `GITHUB_OAUTH_REDIRECT_URI` updated in `worker/.env`
- [ ] Worker restarted (`pm2 restart worker`)
- [ ] Sign-in with GitHub test passed
- [ ] Connect GitHub test passed (from Connections page)
- [ ] Old OAuth App deleted from personal account

---

**Next guide:** `04-LINKEDIN-MIGRATION.md`
