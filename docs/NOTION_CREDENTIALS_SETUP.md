# Notion OAuth Credentials Setup

## ✅ Your Notion OAuth Credentials

You have:
- **OAuth Client ID:** `307d872b-594c-80d2-b90d-003713fd0d7f`
- **OAuth Client Secret:** `paste_your_notion_client_secret_here`

## ⚠️ IMPORTANT: Fix Redirect URI

Your current authorization URL shows:
```
redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Foauth%2Fnotion%2Fcallback
```

**This is WRONG!** It should point to your **frontend**, not backend.

### Correct Redirect URI:

**In Notion Integration Settings, change the redirect URI to:**

```
http://localhost:5173/auth/notion/callback
```

**For production, also add:**
```
https://ctrlchecks.ai/auth/notion/callback
```

## 📝 Step-by-Step Fix

### Step 1: Update Notion Integration Settings

1. Go to: https://www.notion.so/my-integrations
2. Click on your OAuth integration
3. Find **"OAuth redirect URI"** or **"Redirect URI"** field
4. **Remove:** `http://localhost:3001/api/oauth/notion/callback`
5. **Add:** `http://localhost:5173/auth/notion/callback`
6. **Add (for production):** `https://ctrlchecks.ai/auth/notion/callback`
7. Click **"Save"** or **"Update"**

### Step 2: Add Credentials to Backend

Open `worker/.env` file and add:

```env
# Notion OAuth Credentials
NOTION_OAUTH_CLIENT_ID=307d872b-594c-80d2-b90d-003713fd0d7f
NOTION_OAUTH_CLIENT_SECRET=paste_your_notion_client_secret_here
```

### Step 3: Restart Backend

After adding credentials, restart your backend:

```bash
cd worker
npm run dev
```

## 🔄 How the OAuth Flow Works

```
1. User clicks "Connect Notion"
   ↓
2. Frontend → Backend: GET /api/oauth/notion/authorize?redirect_uri=http://localhost:5173/auth/notion/callback
   ↓
3. Backend → Notion: Redirects to Notion with redirect_uri parameter
   ↓
4. User authorizes on Notion
   ↓
5. Notion → Frontend: Redirects to http://localhost:5173/auth/notion/callback?code=...
   ↓
6. Frontend callback page → Backend: POST /api/oauth/notion/callback (exchanges code for token)
   ↓
7. Backend returns token → Frontend saves to Supabase
```

**Key Point:** Notion redirects to the **frontend URL**, not the backend URL!

## ✅ Verification Checklist

- [ ] Notion redirect URI updated to: `http://localhost:5173/auth/notion/callback`
- [ ] Production redirect URI added: `https://ctrlchecks.ai/auth/notion/callback`
- [ ] Credentials added to `worker/.env`
- [ ] Backend restarted
- [ ] Supabase redirect URLs configured (see NOTION_REDIRECT_URLS.md)

## 🧪 Test the Connection

1. Make sure backend is running: `cd worker && npm run dev`
2. Make sure frontend is running: `cd ctrl_checks && npm run dev`
3. Go to: `http://localhost:5173`
4. Click **"Connections"** → **"Connect Notion"**
5. Should redirect to Notion authorization page
6. After authorizing, should redirect back to: `http://localhost:5173/auth/notion/callback`
7. Connection should be saved!

## 🔐 Security Reminder

- ✅ Never commit `.env` file to git
- ✅ Keep your OAuth Client Secret secure
- ✅ Don't share these credentials publicly
- ✅ Use environment variables, not hardcoded values

## 📚 Related Documentation

- **Redirect URLs Guide:** `docs/NOTION_REDIRECT_URLS.md`
- **Supabase Setup:** `docs/NOTION_SUPABASE_SETUP.md`
- **OAuth Setup:** `docs/NOTION_OAUTH_SETUP.md`
