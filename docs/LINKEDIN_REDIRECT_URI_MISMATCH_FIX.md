# LinkedIn Redirect URI Mismatch Error - Complete Fix Guide

## Understanding the Error

**Error Message:** "The redirect_uri does not match the registered value"

**What this means:**
- LinkedIn is rejecting the OAuth request because the `redirect_uri` parameter doesn't match what's registered in your LinkedIn Developer Portal
- This is a **security feature** - LinkedIn only allows redirects to pre-registered URLs

## The Problem

Looking at your authorization URL:
```
https://api.linkedin.com/oauth/v2/authorization?
  client_id=86ogz9n2u1wsgy&
  redirect_to=http://localhost:8080/auth/linkedin/callback&
  redirect_uri=https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback&
  ...
```

**Two redirect parameters:**
1. `redirect_to` - Where Supabase will redirect AFTER processing (your app: `http://localhost:8080/auth/linkedin/callback`)
2. `redirect_uri` - Where LinkedIn will redirect AFTER authorization (Supabase: `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`)

**The issue:** LinkedIn checks if `redirect_uri` matches what's registered in your LinkedIn Developer Portal.

## The OAuth Flow (How It Should Work)

Your understanding is **100% correct**! Here's the exact flow:

```
1. User clicks "Connect LinkedIn" in your app
   ↓
2. Your app calls: supabase.auth.signInWithOAuth({ 
     provider: 'linkedin_oidc',
     options: { redirectTo: 'http://localhost:8080/auth/linkedin/callback' }
   })
   ↓
3. Supabase redirects to LinkedIn OAuth page:
   https://www.linkedin.com/oauth/v2/authorization?
     client_id=86ogz9n2u1wsgy&
     redirect_uri=https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   ↓
4. User sees LinkedIn login/authorization page
   ↓
5. User enters credentials and authorizes
   ↓
6. LinkedIn redirects to Supabase's callback:
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback?code=...&state=...
   ↓
7. Supabase processes the OAuth response and creates a session
   ↓
8. Supabase redirects to YOUR app's callback:
   http://localhost:8080/auth/linkedin/callback
   ↓
9. Your app's Callback.tsx processes the session:
   - Extracts tokens from session
   - Saves to linkedin_oauth_tokens table
   - Redirects to /workflows
   ↓
10. User can now use LinkedIn nodes in workflows!
```

## The Solution

**The issue:** LinkedIn is checking if the `redirect_uri` parameter matches registered URLs. Since Supabase sends `redirect_uri=https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`, this URL must be registered in LinkedIn.

### Option 1: Add Supabase Callback URL to LinkedIn (Recommended)

**This is the direct fix for your error:**

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Select your app (Client ID: `86ogz9n2u1wsgy`)
3. Go to **"Auth"** tab
4. Scroll to **"OAuth 2.0 settings"**
5. Under **"Authorized redirect URLs for your app"**, add:
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   ```
6. **Also ensure your app's callback URL is registered:**
   ```
   http://localhost:8080/auth/linkedin/callback
   ```
   (And `http://localhost:5173/auth/linkedin/callback` if you use that port)
7. Click **"Update"** or **"Save"**

**Why this works:** LinkedIn validates the `redirect_uri` parameter against registered URLs. Since Supabase uses its own callback URL in the OAuth request, it must be registered.

### Option 2: Check Supabase Configuration (Alternative)

Some Supabase configurations might allow you to customize the redirect URI. Check:

1. Go to Supabase Dashboard → Authentication → Providers → LinkedIn
2. Look for any "Redirect URL" or "Callback URL" configuration field
3. If available, you might be able to configure it there

**However, Option 1 is the most reliable solution.**

### Step 3: Verify All URLs Are Registered

Your LinkedIn Developer Portal should show:
```
Authorized redirect URLs for your app:
✅ https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback  (Required for Supabase OAuth)
✅ http://localhost:8080/auth/linkedin/callback              (Your app callback)
✅ http://localhost:5173/auth/linkedin/callback              (If you use this port)
```

## Why Both URLs Are Needed

- **Supabase callback** (`https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`):
  - LinkedIn redirects here FIRST after user authorizes
  - Supabase processes the OAuth code exchange
  - Supabase creates the session

- **Your app callback** (`http://localhost:8080/auth/linkedin/callback`):
  - Supabase redirects here AFTER processing
  - Your app extracts tokens from the session
  - Your app saves tokens to database
  - User continues to workflows

## About the 404 Errors

The 404 errors you're seeing are **harmless** and don't affect functionality:

```
GET https://static.licdn.com/sc/p/com.linkedin.oauth-fe.../icons.svg 404
POST https://api.linkedin.com/li/track 404
```

**Why they happen:**
- LinkedIn's OAuth page tries to load some static assets
- Some tracking endpoints may fail
- These are cosmetic issues - the OAuth flow still works

**You can ignore these errors** - they don't break the authentication flow.

## Verification Checklist

Before testing, verify:

- [ ] LinkedIn Developer Portal has `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- [ ] LinkedIn Developer Portal has `http://localhost:8080/auth/linkedin/callback`
- [ ] LinkedIn Developer Portal has `http://localhost:5173/auth/linkedin/callback` (if needed)
- [ ] Supabase LinkedIn provider is enabled
- [ ] Supabase has correct Client ID: `86ogz9n2u1wsgy`
- [ ] Supabase has correct Client Secret
- [ ] All changes saved in LinkedIn Developer Portal
- [ ] Browser cache cleared (or use incognito)

## Testing the Flow

1. **Clear browser cache** or use incognito window
2. **Click "Connect LinkedIn"** in your app
3. **Expected:** Redirects to LinkedIn (not error page)
4. **Expected:** Shows LinkedIn login/authorization page
5. **Enter credentials** and authorize
6. **Expected:** Redirects back to `http://localhost:8080/auth/linkedin/callback`
7. **Expected:** Shows "Processing authentication..." briefly
8. **Expected:** Redirects to `/workflows`
9. **Expected:** LinkedIn connection shows as "Connected"

## Common Mistakes

### ❌ Mistake 1: Only Adding App Callback URL
**Wrong:**
- Only adding `http://localhost:8080/auth/linkedin/callback` to LinkedIn
- Not adding Supabase callback URL

**Result:**
- LinkedIn rejects the request: "redirect_uri does not match"
- OAuth flow fails at step 3

### ❌ Mistake 2: Only Adding Supabase Callback URL
**Wrong:**
- Only adding `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- Not adding your app's callback URL

**Result:**
- OAuth might work, but Supabase won't know where to redirect
- User gets stuck or redirected to wrong place

### ✅ Correct: Add Both URLs
- Add Supabase callback: `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- Add your app callback: `http://localhost:8080/auth/linkedin/callback`
- Both are needed for the complete flow

## Still Getting Errors?

### If redirect_uri error persists:

1. **Double-check the exact URL:**
   - Copy the exact URL from the error message
   - Make sure it matches EXACTLY in LinkedIn Developer Portal
   - Check for trailing slashes, http vs https, etc.

2. **Wait for propagation:**
   - LinkedIn changes can take 1-2 minutes
   - Don't test immediately after saving

3. **Check for typos:**
   - `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
   - Make sure it's exactly this (no extra characters)

4. **Verify Supabase project:**
   - Make sure you're using the correct Supabase project
   - The callback URL is unique to each project

### If OAuth works but tokens aren't saved:

1. **Check Callback.tsx:**
   - Make sure the route exists: `/auth/linkedin/callback`
   - Check browser console for errors

2. **Check database:**
   - Verify `linkedin_oauth_tokens` table exists
   - Check RLS policies allow inserts

3. **Check Supabase session:**
   - Verify session is created after OAuth
   - Check if `provider_token` exists in session

## Summary

### ✅ Your Analysis is 100% Correct!

**The flow you described is exactly right:**
1. User clicks "Connect LinkedIn" → 
2. Redirects to LinkedIn OIDC login page → 
3. User enters credentials and authorizes → 
4. Redirects back to your app (`/auth/linkedin/callback`) → 
5. Your app processes tokens and saves them → 
6. User can now perform operations with LinkedIn nodes

**This is the standard OAuth 2.0 flow, and your implementation is correct!**

### 🔧 The Fix

**The redirect_uri mismatch error occurs because:**
- Supabase sends `redirect_uri=https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback` to LinkedIn
- LinkedIn checks this against registered URLs
- If not registered, LinkedIn rejects the request

**Solution:**
1. Add Supabase callback URL to LinkedIn Developer Portal:
   - `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
2. Ensure your app callback URL is also registered:
   - `http://localhost:8080/auth/linkedin/callback`
3. Both URLs are needed for the complete OAuth flow

### 📝 About the 404 Errors

**The 404 errors are harmless:**
- `GET https://static.licdn.com/.../icons.svg 404` - LinkedIn's static assets
- `POST https://api.linkedin.com/li/track 404` - LinkedIn's tracking endpoints

**These don't affect the OAuth flow** - they're just cosmetic issues with LinkedIn's OAuth page trying to load resources. The authentication will still work correctly.

### 🎯 Next Steps

1. **Add the Supabase callback URL to LinkedIn Developer Portal** (this fixes the redirect_uri error)
2. **Wait 1-2 minutes** for changes to propagate
3. **Clear browser cache** or use incognito window
4. **Test the flow again** - it should work now!

Your implementation is solid - you just need to register the Supabase callback URL in LinkedIn to complete the setup.
