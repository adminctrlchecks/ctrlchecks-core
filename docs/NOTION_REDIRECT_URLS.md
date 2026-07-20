# Notion OAuth Redirect URLs Configuration

Complete guide for configuring redirect URLs in Notion and Supabase for OAuth integration.

## 🔄 OAuth Flow Overview

```
1. User clicks "Connect Notion" in your app
   ↓
2. Frontend redirects to backend: /api/oauth/notion/authorize
   ↓
3. Backend redirects to Notion: https://api.notion.com/v1/oauth/authorize
   ↓
4. User authorizes on Notion
   ↓
5. Notion redirects to: YOUR_FRONTEND_URL/auth/notion/callback
   ↓
6. Frontend callback page processes the code
   ↓
7. Frontend calls backend: /api/oauth/notion/callback
   ↓
8. Backend exchanges code for token
   ↓
9. Token saved to Supabase database
```

## 📋 URLs to Configure

### 1. In Notion OAuth Integration Settings

**Where to configure:**
- Go to: https://www.notion.so/my-integrations
- Select your OAuth integration
- Find "OAuth redirect URI" or "Redirect URI" field

**Add these redirect URLs:**

#### Development:
```
http://localhost:5173/auth/notion/callback
```

#### Production:
```
https://ctrlchecks.ai/auth/notion/callback
```

**Important Notes:**
- ✅ Add BOTH URLs (development and production)
- ✅ Use exact URLs (no trailing slashes)
- ✅ Must match exactly what's in your frontend code
- ✅ Notion may require HTTPS for production URLs

### 2. In Supabase (URL Configuration)

**Where to configure:**
- Go to: Supabase Dashboard → Authentication → URL Configuration
- Find "Redirect URLs" section

**Add these redirect URLs:**

#### Development:
```
http://localhost:5173/auth/notion/callback
```

#### Production:
```
https://ctrlchecks.ai/auth/notion/callback
```

**Also set Site URL:**
- Development: `http://localhost:5173`
- Production: `https://ctrlchecks.ai`

**Why?**
- Supabase needs to know which URLs are allowed for redirects
- This prevents unauthorized redirects
- Even though Notion OAuth doesn't use Supabase Auth directly, Supabase still validates redirect URLs for security

## 🔍 How to Find Your URLs

### Development URLs:
- **Frontend URL:** Check your Vite dev server (usually `http://localhost:5173`)
- **Backend URL:** Check your backend server (usually `http://localhost:3001`)

### Production URLs:
- **Frontend URL:** Your deployed frontend domain (e.g., `https://ctrlchecks.ai`)
- **Backend URL:** Your deployed backend domain (e.g., `https://api.ctrlchecks.ai` or `https://worker.ctrlchecks.ai`)

## ✅ Complete Configuration Checklist

### Notion Integration Settings:
- [ ] OAuth Client ID configured
- [ ] OAuth Client Secret configured
- [ ] Redirect URI: `http://localhost:5173/auth/notion/callback` (development)
- [ ] Redirect URI: `https://ctrlchecks.ai/auth/notion/callback` (production)
- [ ] Privacy Policy URL: `https://ctrlchecks.ai/privacy`
- [ ] Terms of Use URL: `https://ctrlchecks.ai/privacy` (or `/terms` if you have one)

### Supabase Dashboard:
- [ ] Authentication → URL Configuration → Redirect URLs:
  - [ ] `http://localhost:5173/auth/notion/callback`
  - [ ] `https://ctrlchecks.ai/auth/notion/callback`
- [ ] Site URL set to: `http://localhost:5173` (dev) or `https://ctrlchecks.ai` (prod)

### Backend Environment Variables:
- [ ] `NOTION_OAUTH_CLIENT_ID` set in `worker/.env`
- [ ] `NOTION_OAUTH_CLIENT_SECRET` set in `worker/.env`

## 🧪 Testing the Configuration

### Step 1: Test Development
1. Start backend: `cd worker && npm run dev`
2. Start frontend: `cd ctrl_checks && npm run dev`
3. Go to: `http://localhost:5173`
4. Click "Connections" → "Connect Notion"
5. Should redirect to Notion authorization page
6. After authorizing, should redirect back to: `http://localhost:5173/auth/notion/callback`

### Step 2: Test Production
1. Deploy your frontend and backend
2. Go to: `https://ctrlchecks.ai`
3. Click "Connections" → "Connect Notion"
4. Should redirect to Notion authorization page
5. After authorizing, should redirect back to: `https://ctrlchecks.ai/auth/notion/callback`

## ⚠️ Common Issues

### "Invalid redirect_uri" Error

**Problem:** Notion says the redirect URI doesn't match

**Solution:**
1. Check that the URL in Notion settings matches EXACTLY (including http/https, port, path)
2. No trailing slashes: `http://localhost:5173/auth/notion/callback` ✅ (not `/callback/`)
3. Check case sensitivity
4. Make sure you added the URL in Notion's integration settings

### "Redirect URI mismatch" Error

**Problem:** Supabase blocks the redirect

**Solution:**
1. Go to Supabase → Authentication → URL Configuration
2. Add the exact callback URL to "Redirect URLs"
3. Make sure Site URL is set correctly
4. Wait 30 seconds for changes to propagate

### "Connection refused" or "Cannot reach callback"

**Problem:** Backend not running or wrong URL

**Solution:**
1. Make sure backend is running on the correct port
2. Check `VITE_API_URL` in frontend `.env.local`
3. Verify the backend URL in browser network tab

## 📝 Quick Reference

### Development URLs:
```
Frontend: http://localhost:5173
Backend:  http://localhost:3001
Callback: http://localhost:5173/auth/notion/callback
```

### Production URLs:
```
Frontend: https://ctrlchecks.ai
Backend:  https://worker.ctrlchecks.ai (or your backend URL)
Callback: https://ctrlchecks.ai/auth/notion/callback
```

## 🔐 Security Notes

1. **Never commit URLs with secrets** - Use environment variables
2. **Use HTTPS in production** - Notion requires HTTPS for production redirects
3. **Validate redirect URLs** - Both Notion and Supabase validate redirect URLs
4. **Keep secrets secure** - Store OAuth credentials in environment variables, not in code

## 🎯 Summary

**In Notion:**
- Add: `http://localhost:5173/auth/notion/callback` (dev)
- Add: `https://ctrlchecks.ai/auth/notion/callback` (prod)

**In Supabase:**
- Add: `http://localhost:5173/auth/notion/callback` (dev)
- Add: `https://ctrlchecks.ai/auth/notion/callback` (prod)
- Set Site URL: `http://localhost:5173` (dev) or `https://ctrlchecks.ai` (prod)

That's it! 🎉
