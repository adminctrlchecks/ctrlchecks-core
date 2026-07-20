# Facebook OAuth Redirect URI Error - Quick Fix

## Error Message

**"URL Blocked - This redirect failed because the redirect URI is not whitelisted in the app's Client OAuth Settings."**

## Problem

Facebook is blocking the redirect because the redirect URI is not in your app's whitelist.

## Solution

### Step 1: Check Your App Port

First, check what port your app is actually running on:
- Look at your terminal/console where you run `npm run dev`
- Check the URL in your browser (e.g., `http://localhost:5173` or `http://localhost:8080`)

### Step 2: Add Redirect URIs to Facebook

Go to Facebook App → **Facebook Login** → **Settings**:

1. Find **"Valid OAuth Redirect URIs"** section
2. Add **ALL** of these URLs (one per line):

```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
http://localhost:5173/auth/facebook/callback
http://localhost:8080/auth/facebook/callback
```

**Important:** Add BOTH port 5173 AND 8080 if you're not sure which one you're using.

### Step 3: Verify Settings

Make sure these are enabled:
- ✅ **Client OAuth login:** ON
- ✅ **Web OAuth login:** ON
- ✅ **Use Strict Mode for redirect URIs:** ON (recommended)

### Step 4: Save and Test

1. Click **"Save Changes"**
2. Wait a few seconds for changes to propagate
3. Try connecting again

## Common Issues

### Issue 1: Wrong Port

**Problem:** Your app runs on port 5173 but you added 8080 (or vice versa)

**Solution:**
- Check your actual port in the browser
- Add the correct redirect URI
- Or add both ports to be safe

### Issue 2: HTTP vs HTTPS

**Problem:** Using `http://` for Supabase callback

**Solution:**
- Supabase callback MUST be `https://`
- Your localhost callback can be `http://`
- Make sure you have:
  ```
  https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
  http://localhost:5173/auth/facebook/callback
  ```

### Issue 3: Trailing Slash

**Problem:** Redirect URI has trailing slash but whitelist doesn't (or vice versa)

**Solution:**
- Make sure they match EXACTLY
- No trailing slashes: `http://localhost:5173/auth/facebook/callback` ✅
- NOT: `http://localhost:5173/auth/facebook/callback/` ❌

### Issue 4: Duplicate Scopes

**Problem:** URL shows `email+email` (duplicate)

**Solution:**
- This is usually handled by Supabase automatically
- But you can verify in Supabase Dashboard → Authentication → Providers → Facebook
- Scopes should be: `email,public_profile,pages_manage_posts,pages_read_engagement`

## Quick Checklist

- [ ] Added Supabase callback: `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- [ ] Added localhost callback: `http://localhost:5173/auth/facebook/callback`
- [ ] Added alternative port if needed: `http://localhost:8080/auth/facebook/callback`
- [ ] Client OAuth login is ON
- [ ] Web OAuth login is ON
- [ ] Saved changes
- [ ] Waited a few seconds
- [ ] Tried connecting again

## Still Not Working?

1. **Clear browser cache** and try again
2. **Check Facebook App Logs:**
   - Go to Facebook App Dashboard → **Tools** → **Logs**
   - Look for recent OAuth errors
3. **Verify Supabase Configuration:**
   - Supabase Dashboard → **Authentication** → **URL Configuration**
   - Make sure `http://localhost:5173/auth/facebook/callback` is in Redirect URLs
4. **Test in Incognito Mode:**
   - Sometimes browser extensions interfere
   - Try in incognito/private window

## Need Help?

If it still doesn't work:
1. Check the exact error message
2. Verify your app port (5173 or 8080?)
3. Double-check all redirect URIs are added exactly as shown
4. Make sure no extra spaces or characters
