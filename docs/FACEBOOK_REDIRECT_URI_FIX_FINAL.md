# Facebook OAuth Redirect URI - Final Fix

## Current Situation

You have the URLs in Facebook:
- ✅ `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- ✅ `http://localhost:8080/auth/facebook/callback`

But you're still getting "URL Blocked" error.

## The Real Issue

The problem is likely in **Supabase configuration**, not Facebook. Facebook is redirecting correctly, but Supabase isn't configured to accept the redirect.

## Fix: Configure Supabase Redirect URLs

### Step 1: Go to Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **"Authentication"** in the left sidebar
4. Click **"URL Configuration"** tab

### Step 2: Add Redirect URLs

In the **"Redirect URLs"** section, add:

```
http://localhost:8080/auth/facebook/callback
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
```

**Important:** Add BOTH URLs, one per line.

### Step 3: Set Site URL

In the **"Site URL"** field, set:

```
http://localhost:8080
```

### Step 4: Save

Click **"Save"** button at the bottom.

## Verify Facebook App Settings

Even though you can't edit the URLs, verify they're correct:

1. Go to **Facebook Login** → **Settings**
2. Check **"Valid OAuth Redirect URIs"** shows:
   - `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
   - `http://localhost:8080/auth/facebook/callback`
3. If they're there, that's good - you don't need to add more

## Verify Facebook Provider in Supabase

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Find **"Facebook"**
3. Make sure:
   - ✅ **Enabled:** ON
   - ✅ **App ID:** `3809504649359292` (your App ID)
   - ✅ **App Secret:** (should be set)
   - ✅ **Scopes:** `email,public_profile,pages_manage_posts,pages_read_engagement`

## Test Again

After configuring Supabase:

1. **Wait 30 seconds** for changes to propagate
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Try connecting again** from your app
4. If it still fails, try in **incognito/private window**

## If URLs Field is Read-Only in Facebook

If you can't edit the URLs in Facebook (they're grayed out):

1. **Check if app is in "Live" mode:**
   - Look for a banner at the top saying "Your app is in Live mode"
   - Or check **"Publish"** in left sidebar - does it say "Unpublished"?
   
2. **If app is Live:**
   - You might need to switch to Development mode
   - Or the URLs might be locked because the app is published
   - Try unpublishing the app temporarily

3. **Alternative:** The URLs might already be correct and the issue is elsewhere

## Debug: Check Exact Error

When you click "Connect Facebook", check:

1. **Browser Console** (F12 → Console tab)
   - Look for any error messages
   - Copy any Facebook-related errors

2. **Network Tab** (F12 → Network tab)
   - Look for the OAuth request
   - Check the `redirect_uri` parameter in the request
   - Does it match what's in Facebook settings?

3. **The Error URL:**
   - Copy the FULL URL from the address bar when you see the error
   - Check what `redirect_uri` parameter shows
   - Compare it character-by-character with Facebook settings

## Most Common Fix

**90% of the time, the issue is Supabase not having the redirect URL configured.**

Make sure Supabase → Authentication → URL Configuration has:
```
http://localhost:8080/auth/facebook/callback
```

This is the most common cause of this error!
