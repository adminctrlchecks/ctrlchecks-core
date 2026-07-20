# Notion OAuth Redirect URI Error Fix

## ❌ Error You're Seeing

```
Missing or invalid redirect_uri
```

The URL shows: `redirect_uri=http://localhost:8080/auth/notion/callback`

## 🔍 Problem

The redirect URI in your **Notion integration settings** doesn't match what your frontend is sending.

Your frontend is running on **port 8080**, but the redirect URI in Notion might be set to a different port (like 5173).

## ✅ Solution

### Step 1: Check Your Frontend Port

Look at your frontend URL in the browser. It's probably:
- `http://localhost:8080` (your current setup)
- OR `http://localhost:5173` (Vite default)

### Step 2: Update Notion Integration Settings

1. Go to: https://www.notion.so/my-integrations
2. Click on your OAuth integration
3. Find **"OAuth redirect URI"** or **"Redirect URI"** field
4. **Add/Update to match your frontend port:**

   **If your frontend is on port 8080:**
   ```
   http://localhost:8080/auth/notion/callback
   ```

   **If your frontend is on port 5173:**
   ```
   http://localhost:5173/auth/notion/callback
   ```

5. **Also add production URL:**
   ```
   https://ctrlchecks.ai/auth/notion/callback
   ```

6. Click **"Save"** or **"Update"**

### Step 3: Update Supabase Redirect URLs

1. Go to: Supabase Dashboard → Authentication → URL Configuration
2. Add the same redirect URL:
   - `http://localhost:8080/auth/notion/callback` (or 5173, depending on your port)
   - `https://ctrlchecks.ai/auth/notion/callback` (production)

### Step 4: Wait and Test

1. **Wait 30 seconds** for Notion to update their settings
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Try connecting again**

## 🎯 Quick Fix Checklist

- [ ] Check what port your frontend is running on (look at browser URL)
- [ ] Update Notion redirect URI to match: `http://localhost:YOUR_PORT/auth/notion/callback`
- [ ] Update Supabase redirect URLs to match
- [ ] Wait 30 seconds
- [ ] Clear browser cache
- [ ] Try connecting again

## 📝 Common Ports

- **Vite default:** `5173`
- **Create React App:** `3000`
- **Your setup:** `8080` (based on the error URL)

**Important:** The redirect URI must match **exactly** (including the port number)!

## 🔧 If Still Not Working

1. **Check browser console** for any errors
2. **Check backend logs** for OAuth errors
3. **Verify the redirect URI** in Notion matches exactly what's in the URL
4. **Make sure** you're using the correct port (8080 vs 5173)

## 💡 Pro Tip

You can check what redirect URI your frontend is sending by:
1. Opening browser DevTools (F12)
2. Going to Network tab
3. Clicking "Connect Notion"
4. Looking at the redirect request - it will show the redirect_uri parameter
