# Zoom OAuth App — Migration Guide
**From:** old Zoom app (old credentials in `.env`)
**To:** new Zoom app under `adminctrlchecks@gmail.com`

Zoom is used for the **Connect Zoom** flow — users link their Zoom account so workflows can create meetings, list recordings, and read user/meeting info.

**Same pattern as Slack/HubSpot:** Redirect URI goes to the **worker** credential-connections endpoint.

Env vars: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `GENERIC_ZOOM_OAUTH_REDIRECT_URI`

> **Heads up:** HubSpot recently disabled creating new OAuth apps through their classic web form and pushed everyone to a CLI-based flow instead (see `08-HUBSPOT-MIGRATION.md`). Zoom's marketplace UI has historically been a plain web form — start with Step 1 below, but if app creation is blocked or redirected to a CLI/SDK-only flow, stop and flag it rather than guessing.

---

## Step 1 — Sign in to Zoom App Marketplace

1. Go to [https://marketplace.zoom.us/](https://marketplace.zoom.us/)
2. Click **"Sign In"** (top right) and sign in with `adminctrlchecks@gmail.com`
3. If prompted, verify/create the account — a free Zoom account works for app creation

---

## Step 2 — Create a New App

1. Click **"Develop"** (top right) → **"Build App"**
2. Choose app type: **"General App"** (this is the OAuth type for user-installable apps — do not choose "Server-to-Server OAuth", which is single-account only and won't let customers connect their own accounts)
3. Fill in the **basic info**:
   - **App name:** `CtrlChecks`
   - **Short description:** `AI-powered workflow automation`

---

## Step 3 — Configure OAuth

### Redirect URL for OAuth

Under **"OAuth Information"** / **"Redirect URL for OAuth"**, set:

```
https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

### Add allow list URL (if prompted)

Same URL as above. Also add for local dev if the field allows multiple entries:

```
http://localhost:3001/api/credential-connections/oauth/callback
```

### Scopes

Under **"Scopes"**, add each of these (search by name):

| Scope | What it allows |
|---|---|
| `meeting:write:meeting` | Create/update meetings |
| `meeting:read:meeting` | Read meeting details |
| `meeting:read:list_meetings` | List a user's meetings |
| `user:read:user` | Read basic user profile info |

---

## Step 4 — Copy Client ID and Client Secret

On the **"App Credentials"** page, you'll see:

- **Client ID** → copy it → `ZOOM_CLIENT_ID`
- **Client secret** → click "Show" → copy it → `ZOOM_CLIENT_SECRET`

---

## Step 5 — Update Local worker/.env

Open `worker/.env` and update the existing Zoom block:

```env
ZOOM_CLIENT_ID=<paste Client ID here>
ZOOM_CLIENT_SECRET=<paste Client Secret here>
GENERIC_ZOOM_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

---

## Step 6 — Update Server .env and Restart

SSH into the server:

```bash
ssh -i ~/.ssh/id_ed25519 root@187.127.185.105
```

Then run (replace with your actual credentials):

```bash
sed -i 's|^ZOOM_CLIENT_ID=.*|ZOOM_CLIENT_ID=YOUR_CLIENT_ID|' /opt/ctrlchecks-worker/.env
sed -i 's|^ZOOM_CLIENT_SECRET=.*|ZOOM_CLIENT_SECRET=YOUR_CLIENT_SECRET|' /opt/ctrlchecks-worker/.env
sed -i 's|^GENERIC_ZOOM_OAUTH_REDIRECT_URI=.*|GENERIC_ZOOM_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback|' /opt/ctrlchecks-worker/.env
systemctl restart ctrlchecks-worker
sleep 5
curl -s https://worker.ctrlchecks.ai/health
```

---

## Step 7 — Verify It Works

1. Log in to `https://www.ctrlchecks.ai`
2. Go to **Connections** (`/connections`)
3. Find **Zoom** and click **Connect**
4. Sign in to Zoom and approve the requested permissions
5. You'll be redirected back — Zoom should show as **Connected**

> If you see an "unverified app" warning during consent (same as HubSpot), that's expected — Zoom apps need to go through their own marketplace review to remove it. It doesn't block the connection itself; click through to continue.

---

## Summary Checklist

- [ ] Zoom Marketplace developer account signed in as `adminctrlchecks@gmail.com`
- [ ] App created with name `CtrlChecks`, type **General App** (OAuth)
- [ ] Redirect URL added: `https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback`
- [ ] All 4 scopes added
- [ ] `ZOOM_CLIENT_ID` updated in local `worker/.env`
- [ ] `ZOOM_CLIENT_SECRET` updated in local `worker/.env`
- [ ] `GENERIC_ZOOM_OAUTH_REDIRECT_URI` updated in local `worker/.env`
- [ ] Server `.env` updated with same values
- [ ] Worker restarted
- [ ] Connect Zoom test passed (from Connections page)

---

**Next guide:** `10-ZOHO-MIGRATION.md`
