# Google Developer Accounts — Migration Guide
**From:** vusalashivakumar@gmail.com  
**To:** adminctrlchecks@gmail.com  

This covers two separate things you need to set up under the new Gmail:
1. **Google Cloud Project** — OAuth app for Google Sheets, Gmail, Drive, Calendar, Docs, Contacts, Tasks, BigQuery
2. **Google AI Studio** — Gemini API key (the AI brain of the whole platform)

Do them in order. Each section ends with "what to update in .env".

---

## PART 1 — Google Cloud Project + OAuth App

### Step 1 — Sign in to Google Cloud Console

1. Open a browser in **Incognito mode**
2. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
3. Sign in with **adminctrlchecks@gmail.com**

---

### Step 2 — Create a New Project

1. Click the **project selector dropdown** at the top left (it says "Select a project" or shows an existing project name)
2. Click **"New Project"**
3. Fill in:
   - **Project name:** `CtrlChecks`
   - **Organization:** No organization (leave as-is unless you have one)
4. Click **Create**
5. Wait ~30 seconds, then select the new project from the dropdown

---

### Step 3 — Enable All Required APIs

You need to enable 9 APIs. Do them one at a time:

Go to **APIs & Services → Library** (left sidebar).

Search for and enable each of these — click the API name, then click the blue **"Enable"** button:

| # | Search for this | API Name |
|---|----------------|---------|
| 1 | `Google Sheets API` | Google Sheets API |
| 2 | `Gmail API` | Gmail API |
| 3 | `Google Drive API` | Google Drive API |
| 4 | `Google Calendar API` | Google Calendar API |
| 5 | `Google Docs API` | Google Docs API |
| 6 | `People API` | Google People API (this is Contacts) |
| 7 | `Tasks API` | Google Tasks API |
| 8 | `BigQuery API` | BigQuery API |
| 9 | `Cloud Storage API` | Cloud Storage JSON API |

> After enabling all 9, go to **APIs & Services → Enabled APIs** to confirm they all appear.

---

### Step 4 — Configure the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen** (left sidebar)
2. Select **External** → click **Create**
3. Fill in **App information:**
   - **App name:** `CtrlChecks`
   - **User support email:** `adminctrlchecks@gmail.com`
   - **App logo:** upload your logo (optional, but helps during review)
   - **Developer contact information (email):** `adminctrlchecks@gmail.com`
4. Click **Save and Continue**

5. On the **Scopes** screen, click **"Add or Remove Scopes"**  
   Add all of these manually (paste one at a time into the filter box and tick each):
   ```
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/documents
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/contacts
   https://www.googleapis.com/auth/tasks
   https://www.googleapis.com/auth/bigquery
   ```
   Click **Update** → **Save and Continue**

6. On the **Test users** screen:
   - Click **"Add Users"**
   - Add `adminctrlchecks@gmail.com` and `vusalashivakumar@gmail.com` and any other test emails
   - Click **Save and Continue**

7. Click **Back to Dashboard**

> **Note:** The app will be in **Testing** mode. Users can still connect — up to 100 test users. When you are ready to go live with real users, you will need to submit for **Google verification** (a separate process). For now, Testing mode is fine.

---

### Step 5 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials** (left sidebar)
2. Click **"+ Create Credentials"** → **OAuth client ID**
3. Select **Application type:** `Web application`
4. **Name:** `CtrlChecks Web`
5. Under **Authorized redirect URIs**, click **"Add URI"** and add **all 12 URIs below — one per field**.  
   Click **"+ Add URI"** after each one:

   **— Production (live site) —**
   ```
   https://worker.ctrlchecks.ai/api/oauth/google/callback
   ```
   ```
   https://www.ctrlchecks.ai/api/oauth/google/callback
   ```
   ```
   https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
   ```
   ```
   https://www.ctrlchecks.ai/api/credential-connections/oauth/callback
   ```

   **— Vercel preview deployment —**
   ```
   https://ctrl-checks-002.vercel.app/api/oauth/google/callback
   ```

   **— AWS Cognito hosted UI (keep exactly as in old account) —**
   ```
   https://ap-south-1atyvsyflq.auth.ap-south-1.amazoncognito.com/oauth2/idpresponse
   ```
   > ⚠️ Open your **old** Google Cloud account, go to the same Credentials page, and copy this Cognito URL exactly — the full URL was cut off in the screenshot. The format ends in `/oauth2/idpresponse`.

   **— Local development —**
   ```
   http://localhost:3001/api/oauth/google/callback
   ```
   ```
   http://127.0.0.1:3001/api/oauth/google/callback
   ```
   ```
   http://localhost:5173/auth/google/callback
   ```
   ```
   http://localhost:8080/auth/google/callback
   ```
   ```
   http://localhost:3001/api/credential-connections/oauth/callback
   ```

   > **URIs NOT carried over (intentionally removed):**
   > - `https://nvrrqvlqnnvlihtlgmzn.supabase.co/...` — old Supabase (migrated away)
   > - `https://worker.ctrlchecks.com/...` — old `.com` domain (replaced by `.ai`)

6. Click **Create**

7. A popup appears with your credentials. **Copy both values immediately:**
   - **Client ID** → this is your `GOOGLE_OAUTH_CLIENT_ID`
   - **Client Secret** → this is your `GOOGLE_OAUTH_CLIENT_SECRET`
   
   > Click **Download JSON** to save a backup copy.

---

### Step 6 — Update worker/.env with Google OAuth credentials

Open `worker/.env` on the Hostinger server and update these lines:

```env
GOOGLE_OAUTH_CLIENT_ID=<paste Client ID here>
GOOGLE_OAUTH_CLIENT_SECRET=<paste Client Secret here>
GOOGLE_OAUTH_REDIRECT_URI=https://worker.ctrlchecks.ai/api/oauth/google/callback
```

---

## PART 2 — Gemini API Key (Google AI Studio)

This is completely separate from Google Cloud. It's a simpler process.

### Step 1 — Open Google AI Studio

1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Sign in with **adminctrlchecks@gmail.com**
3. If prompted, accept the terms of service

---

### Step 2 — Create an API Key

1. Click **"Get API key"** in the left sidebar
2. Click **"Create API key"**
3. Select **"Create API key in new project"** — this creates a separate lightweight project just for the Gemini key (you do NOT need to link it to the Google Cloud project above)
4. Your API key appears. **Copy it immediately.**

> The key looks like: `AIzaSy...` (39 characters)

---

### Step 3 — (Optional) Set Usage Limits

1. After creating the key, click the **key name** to open settings
2. Set a **daily quota limit** to avoid surprise charges if traffic spikes
3. Recommended: set it to match your current usage (check old account's billing for reference)

---

### Step 4 — Update worker/.env with Gemini key

```env
GEMINI_API_KEY=<paste your new Gemini API key here>
GOOGLE_GEMINI_API_KEY=<paste same key here>
```

> If you use multiple keys for rotation (GEMINI_API_KEYS), add the new key to the comma-separated list.

---

## PART 3 — Deploy the Updated .env

After updating both sets of credentials, redeploy the worker:

```bash
bash scripts/deploy-worker.sh
```

Or if you SSH directly into the server:
```bash
cd /var/www/ctrlchecks
pm2 restart worker
```

---

## PART 4 — Verify Everything Works

Test in this order:

1. **Gemini** — Go to `www.ctrlchecks.ai`, create a new workflow, type a prompt. If the AI responds, Gemini is working.

2. **Google OAuth** — Go to Connections page (`www.ctrlchecks.ai/connections`), click **"Connect Google"**. It should open the Google sign-in popup without errors. Connect with any Google account (not just adminctrlchecks).

3. **Google Sheets node** — Run a workflow that reads/writes a Google Sheet. If the execution succeeds, everything is working end-to-end.

---

## PART 5 — Clean Up Old Account (Do Last)

Only after verifying everything works on the new credentials:

1. Go back into the **old Google Cloud Console** (signed in as vusalashivakumar@gmail.com)
2. Delete or disable the old OAuth credentials (to prevent confusion)
3. Revoke the old Gemini API key from AI Studio

---

## Summary Checklist

- [ ] Google Cloud project created under adminctrlchecks@gmail.com
- [ ] All 9 APIs enabled
- [ ] OAuth consent screen configured (External, Testing mode)
- [ ] Test users added to consent screen
- [ ] OAuth 2.0 credentials created with production redirect URI
- [ ] `GOOGLE_OAUTH_CLIENT_ID` updated in worker/.env
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET` updated in worker/.env
- [ ] Gemini API key created in AI Studio
- [ ] `GEMINI_API_KEY` updated in worker/.env
- [ ] Worker redeployed
- [ ] Gemini test passed (AI generates workflow)
- [ ] Google OAuth test passed (Connect Google button works)
- [ ] Old credentials revoked

---

**Next guide:** `02-META-MIGRATION.md` (Facebook + Instagram + WhatsApp — one Meta app for all three)
