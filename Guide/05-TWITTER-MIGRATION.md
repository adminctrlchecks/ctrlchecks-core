# Twitter / X OAuth App — Migration Guide
**From:** personal Twitter developer account  
**To:** business Twitter developer account under `adminctrlchecks@gmail.com`

Twitter is used for the **Connect X (Twitter)** flow — users link their X account so workflows can read their profile and post tweets on their behalf.

**Key difference from other guides:** Twitter's OAuth callback redirects to the **frontend** (`www.ctrlchecks.ai`), not the worker. Register the frontend URL in the developer portal, not the worker URL.

Env vars: `TWITTER_OAUTH_CLIENT_ID`, `TWITTER_OAUTH_CLIENT_SECRET`, `TWITTER_OAUTH_REDIRECT_URI`  
Default scopes: `users.read offline.access`

---

## Step 1 — Sign in to the X Developer Portal

1. Go to [https://developer.x.com](https://developer.x.com)
2. Click **"Sign in"** and log in with the X/Twitter account that will own this app (the `adminctrlchecks` account)
3. If this is the first time signing in, you'll be asked to agree to the developer terms — accept them

---

## Step 2 — Create a New Project and App

Twitter requires a **Project** to contain your app.

1. Click **"+ Create Project"** (or go to Dashboard → Projects & Apps → Overview)
2. Fill in the project details:
   - **Project name:** `CtrlChecks`
   - **Use case:** Select **"Making a bot"** or **"Building tools for Twitter users"** — either works
   - **Project description:** `AI-powered workflow automation platform`
3. Click **Next**
4. Create an app inside the project:
   - **App name:** `CtrlChecks`
5. Click **Complete**

> After creation, you'll see your **API Key and Secret** (OAuth 1.0a) — **ignore these for now**. We use OAuth 2.0, not 1.0a. Scroll to get the OAuth 2.0 credentials.

---

## Step 3 — Set Up OAuth 2.0 User Authentication

On the app page, find the **"User authentication settings"** section and click **"Set up"**.

Fill in the form:

### App permissions
Select **"Read and write"**
> This allows posting tweets. "Read" alone is not enough for `w_member_social`-equivalent posting.

### Type of App
Select **"Web App, Automated App or Bot"**

### App info

| Field | Value |
|---|---|
| **Callback URI / Redirect URL** | `https://www.ctrlchecks.ai/auth/twitter/callback` |
| | Click **"Add another"** → `http://localhost:8080/auth/twitter/callback` |
| | Click **"Add another"** → `http://localhost:5173/auth/twitter/callback` |
| **Website URL** | `https://www.ctrlchecks.ai` |
| **Terms of service** | `https://www.ctrlchecks.ai/terms` *(optional)* |
| **Privacy policy** | `https://www.ctrlchecks.ai/privacy` *(optional)* |

> ⚠️ The callback URLs here must point to the **frontend** (`www.ctrlchecks.ai`), NOT the worker. Twitter redirects the user browser directly to this URL.

Click **"Save"**.

---

## Step 4 — Copy OAuth 2.0 Credentials

After saving, Twitter shows a confirmation screen with:
- **Client ID** — copy it now → `TWITTER_OAUTH_CLIENT_ID`
- **Client Secret** — copy it now (shown only once) → `TWITTER_OAUTH_CLIENT_SECRET`

> If you navigate away without copying the secret, go to **App settings → Keys and tokens → OAuth 2.0 Client ID and Client Secret → Regenerate**.

---

## Step 5 — Update Local worker/.env

Open `worker/.env` and update:

```env
TWITTER_OAUTH_CLIENT_ID=<paste Client ID here>
TWITTER_OAUTH_CLIENT_SECRET=<paste Client Secret here>
TWITTER_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/twitter/callback
```

> Note: `TWITTER_OAUTH_REDIRECT_URI` points to `www.ctrlchecks.ai` (the frontend), not `worker.ctrlchecks.ai`. This is intentional — Twitter redirects the user's browser to the frontend callback page, which then calls the worker API to exchange the code.

---

## Step 6 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual values):

```bash
sed -i 's|^TWITTER_OAUTH_CLIENT_ID=.*|TWITTER_OAUTH_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^TWITTER_OAUTH_CLIENT_SECRET=.*|TWITTER_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^TWITTER_OAUTH_REDIRECT_URI=.*|TWITTER_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/twitter/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 7 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **X (Twitter)** and click **Connect**
4. You should be redirected to Twitter's authorization page
5. Authorize the app — you'll be redirected back to `www.ctrlchecks.ai/auth/twitter/callback`
6. The page processes the token and redirects you to `/connections` (or `/workflows`)
7. Twitter should show as **Connected**

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `"Something went wrong"` on Twitter auth screen | App permissions too broad for your access tier | Remove `tweet.write` from scopes — the default `users.read offline.access` works on free tier |
| `Callback URI mismatch` | Registered URL doesn't exactly match | Check there are no trailing slashes — URL must be exactly `https://www.ctrlchecks.ai/auth/twitter/callback` |
| `TWITTER_OAUTH_CLIENT_ID is still a placeholder` | Env var not updated | Restart the worker after updating `.env` |
| `401 Unauthorized` on callback | Session expired during OAuth flow | User needs to log in to CtrlChecks first, then connect Twitter |

---

## Summary Checklist

- [ ] Twitter Developer Project created under `adminctrlchecks` account
- [ ] App created inside the project
- [ ] User authentication settings configured:
  - [ ] Permission: Read and write
  - [ ] Type: Web App
  - [ ] Callback URL: `https://www.ctrlchecks.ai/auth/twitter/callback`
- [ ] `TWITTER_OAUTH_CLIENT_ID` updated in local `worker/.env`
- [ ] `TWITTER_OAUTH_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `TWITTER_OAUTH_REDIRECT_URI=https://www.ctrlchecks.ai/auth/twitter/callback` set in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted
- [ ] Connect X (Twitter) test passed from Connections page

---

**Next guide:** `06-NOTION-MIGRATION.md`
