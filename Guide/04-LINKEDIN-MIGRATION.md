# LinkedIn OAuth App — Migration Guide
**From:** personal LinkedIn developer account  
**To:** business LinkedIn app under `adminctrlchecks@gmail.com`

LinkedIn is used for the **Connect LinkedIn** flow — users link their LinkedIn account so workflows can post on their behalf, read their profile, and send messages.

Scopes required: `openid profile email w_member_social`

---

## Prerequisites — LinkedIn Company Page

LinkedIn **requires a Company Page** to create a developer app. If you don't have one yet:

1. Go to [https://www.linkedin.com/company/setup/new/](https://www.linkedin.com/company/setup/new/)
2. Sign in as `adminctrlchecks@gmail.com` (or whichever LinkedIn account will own this)
3. Create a company page for **CtrlChecks**:
   - **Name:** CtrlChecks
   - **Industry:** Software Development
   - **Company size:** 1–10 employees
   - **Website:** `https://www.ctrlchecks.ai`
4. Click **Create page**

> If you already have a CtrlChecks company page, skip this — just make sure you're an admin on it.

---

## Step 1 — Sign in to LinkedIn Developer Portal

1. Open [https://www.linkedin.com/developers/](https://www.linkedin.com/developers/)
2. Sign in with the LinkedIn account that owns or manages the CtrlChecks company page
3. Click **"My Apps"** at the top

---

## Step 2 — Create a New App

1. Click **"Create app"**
2. Fill in the form:

| Field | Value |
|---|---|
| **App name** | `CtrlChecks` |
| **LinkedIn Page** | Select the CtrlChecks company page you created/have |
| **App logo** | Upload your logo (JPG/PNG, 100×100px minimum) |
| **Legal agreement** | Tick the checkbox |

3. Click **"Create app"**

---

## Step 3 — Add Required Products

After creation, you land on the app dashboard. Go to the **"Products"** tab.

You need to request access to **two products**:

### Product 1 — Sign In with LinkedIn using OpenID Connect
- Find **"Sign In with LinkedIn using OpenID Connect"** in the list
- Click **"Request access"**
- This gives: `openid`, `profile`, `email` scopes
- **Approval:** Instant (no review required)

### Product 2 — Share on LinkedIn
- Find **"Share on LinkedIn"** in the list
- Click **"Request access"**
- This gives: `w_member_social` scope (needed to post on behalf of users)
- **Approval:** Usually instant, but LinkedIn may ask a few questions about your use case

> After requesting both, refresh the page and confirm both show as **"Added"** (green checkmark) under Products.

---

## Step 4 — Configure Auth Settings (Redirect URIs)

Go to the **"Auth"** tab on your app.

Under **"OAuth 2.0 settings"** → **"Authorized redirect URLs for your app"**, click the pencil/edit icon and add:

```
https://worker.ctrlchecks.ai/api/oauth/linkedin/callback
```

Then click **"Add URL"** again and add the local dev URL:

```
http://localhost:3001/api/oauth/linkedin/callback
```

Click **"Update"** to save.

> LinkedIn only accepts HTTPS for production URLs. The `http://localhost` URL is allowed as a special case for development.

---

## Step 5 — Copy Your Client ID and Client Secret

Still on the **"Auth"** tab:

1. **Client ID** — visible near the top of the Auth tab. Copy it.
2. **Client Secret** — click the eye icon next to "Primary Client Secret" to reveal it. Copy it.

You now have:
- `Client ID` → `LINKEDIN_CLIENT_ID`
- `Client Secret` → `LINKEDIN_CLIENT_SECRET`

---

## Step 6 — Verify Scopes Are Active

On the **"Auth"** tab, scroll down to **"OAuth 2.0 scopes"**. Confirm all four are listed:

| Scope | From which product |
|---|---|
| `openid` | Sign In with LinkedIn using OpenID Connect |
| `profile` | Sign In with LinkedIn using OpenID Connect |
| `email` | Sign In with LinkedIn using OpenID Connect |
| `w_member_social` | Share on LinkedIn |

If any are missing, go back to the **Products** tab and confirm those products show as Added.

---

## Step 7 — Update Local worker/.env

Open `worker/.env` on your local machine and update:

```env
LINKEDIN_CLIENT_ID=<paste Client ID here>
LINKEDIN_CLIENT_SECRET=<paste Client Secret here>
LINKEDIN_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/oauth/linkedin/callback
```

---

## Step 8 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace the values with your actual credentials):

```bash
sed -i 's|^LINKEDIN_CLIENT_ID=.*|LINKEDIN_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^LINKEDIN_CLIENT_SECRET=.*|LINKEDIN_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^LINKEDIN_OAUTH_REDIRECT_URI=.*|LINKEDIN_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/oauth/linkedin/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

Confirm the health check returns `"status":"healthy"`.

---

## Step 9 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **LinkedIn** and click **Connect**
4. LinkedIn should show an authorization screen listing: profile, email, and post permissions
5. Click **Allow** — you should be redirected back to `/connections` with LinkedIn showing as connected

---

## Token Expiry Note

LinkedIn access tokens expire after **60 days**. The backend stores a refresh token when LinkedIn provides one (`w_member_social` apps get refresh tokens). Users may see a "reconnect LinkedIn" prompt after 60 days if refresh fails — this is expected LinkedIn behavior, not a bug.

---

## Summary Checklist

- [ ] LinkedIn Company Page exists (CtrlChecks)
- [ ] LinkedIn Developer App created
- [ ] Product added: "Sign In with LinkedIn using OpenID Connect"
- [ ] Product added: "Share on LinkedIn"
- [ ] Redirect URI added: `https://worker.ctrlchecks.ai/api/oauth/linkedin/callback`
- [ ] All 4 scopes visible on Auth tab (`openid`, `profile`, `email`, `w_member_social`)
- [ ] `LINKEDIN_CLIENT_ID` updated in local `worker/.env`
- [ ] `LINKEDIN_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `LINKEDIN_OAUTH_REDIRECT_URI` updated in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted (`systemctl restart ctrlchecks-worker`)
- [ ] Connect LinkedIn test passed (from Connections page)

---

**Next guide:** `05-TWITTER-MIGRATION.md`
