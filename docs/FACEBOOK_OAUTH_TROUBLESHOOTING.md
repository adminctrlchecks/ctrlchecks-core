# Facebook OAuth Redirect URI - Troubleshooting Guide

## Current Status

You have these URLs in your Facebook app:
- ✅ `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- ✅ `http://localhost:8080/auth/facebook/callback`

But you're still getting the "URL Blocked" error.

## Possible Issues & Solutions

### Issue 1: App Mode is "Live" Instead of "Development"

**Problem:** Facebook apps in Live mode have stricter requirements and may block localhost URLs.

**Solution:**
1. Go to **Settings** → **Basic** (in left sidebar)
2. Look at the top of the page for **"App Mode"**
3. If it says **"Live"**, click the toggle to switch to **"Development"**
4. Go back to **Facebook Login** → **Settings**
5. Try adding URLs again

### Issue 2: Supabase Redirect URL Not Configured

**Problem:** The Supabase callback URL might not be in Supabase's allowed list.

**Solution:**
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Check **"Redirect URLs"** section
3. Make sure this is listed:
   ```
   http://localhost:8080/auth/facebook/callback
   ```
4. Also check **"Site URL"** is set to:
   ```
   http://localhost:8080
   ```
5. Click **"Save"**

### Issue 3: URL Format Mismatch

**Problem:** The URL in the error doesn't match exactly what's in the whitelist.

**Check the exact URL from the error:**
- Look at the full error URL
- Compare it character-by-character with what's in Facebook
- Make sure there are no extra parameters or differences

### Issue 4: App Not Approved for Production

**Problem:** If your app is in Live mode, localhost URLs might not work.

**Solution:**
- Switch to **Development** mode (see Issue 1)
- Or add your production domain instead

### Issue 5: Cache/Propagation Delay

**Problem:** Changes might not have propagated yet.

**Solution:**
1. Wait 5-10 minutes after saving
2. Clear browser cache
3. Try in incognito/private window
4. Try again

## Step-by-Step Fix

### Step 1: Verify App Mode

1. Go to **Settings** → **Basic**
2. Check **"App Mode"** at the top
3. Should be **"Development"** (not "Live")
4. If it's "Live", switch to "Development"

### Step 2: Verify Facebook Settings

1. Go to **Facebook Login** → **Settings**
2. Check **"Valid OAuth Redirect URIs"** has:
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   http://localhost:8080/auth/facebook/callback
   ```
3. Verify these are ON:
   - ✅ **Client OAuth login:** ON
   - ✅ **Web OAuth login:** ON
4. Click **"Save Changes"** (even if you didn't change anything)

### Step 3: Verify Supabase Settings

1. Go to **Supabase Dashboard**
2. **Authentication** → **URL Configuration**
3. **Redirect URLs** should include:
   ```
   http://localhost:8080/auth/facebook/callback
   ```
4. **Site URL** should be:
   ```
   http://localhost:8080
   ```
5. Click **"Save"**

### Step 4: Check Facebook Provider in Supabase

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **Facebook**
3. Make sure it's **Enabled**
4. Check **App ID** and **App Secret** are correct
5. **Scopes** should be: `email,public_profile,pages_manage_posts,pages_read_engagement`

### Step 5: Test Again

1. Clear browser cache
2. Try connecting in incognito mode
3. Check browser console for errors (F12 → Console tab)

## Alternative: Use Port 5173 Instead

If port 8080 is causing issues, try switching to port 5173:

1. **Stop your dev server**
2. **Check your `package.json`** or `vite.config.ts` for port settings
3. **Change port to 5173** (or use default Vite port)
4. **Update Facebook redirect URIs:**
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   http://localhost:5173/auth/facebook/callback
   ```
5. **Update Supabase redirect URLs** to match
6. **Restart dev server**
7. **Try connecting again**

## Debug: Check Exact Error URL

When you get the error, copy the FULL URL from the address bar. It should look like:

```
https://www.facebook.com/dialog/oauth?client_id=...&redirect_uri=...
```

Check:
- What's the exact `redirect_uri` parameter?
- Does it match what's in your Facebook app settings?
- Are there any extra parameters?

## Still Not Working?

Try this diagnostic:

1. **Test in Facebook Graph API Explorer:**
   - Go to https://developers.facebook.com/tools/explorer
   - Select your app
   - Try generating a token manually
   - See if you get the same error

2. **Check Facebook App Logs:**
   - Facebook App Dashboard → **Tools** → **Logs**
   - Look for recent OAuth errors
   - Check the exact error message

3. **Verify App ID:**
   - Make sure the App ID in the error URL matches your app
   - Check in **Settings** → **Basic** → **App ID**

4. **Contact Support:**
   - If nothing works, the issue might be with Facebook's app review status
   - Check if your app needs to be submitted for review
