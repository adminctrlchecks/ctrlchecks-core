# Fix: 404 Error on LinkedIn OAuth

## The Problem

You're getting a **404 error** when trying to connect LinkedIn:

```
Failed to load resource: the server responded with a status of 404
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/authorize?provider=linkedin_oidc&...
```

A 404 means the endpoint doesn't exist, which suggests:
1. LinkedIn provider is not configured in Supabase
2. The Supabase project might not have OAuth providers enabled
3. There might be a configuration issue

## Step-by-Step Fix

### Step 1: Verify Supabase Project

1. **Check your Supabase project URL**
   - Your project URL: `https://nvrrqvlqnnvlihtlgmzn.supabase.co`
   - Make sure this is the correct project
   - Go to: https://supabase.com/dashboard
   - Verify you're in the right project

2. **Check project status**
   - Make sure the project is active (not paused)
   - Free tier projects can be paused after inactivity

### Step 2: Verify LinkedIn Provider Configuration

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select project: `nvrrqvlqnnvlihtlgmzn`

2. **Navigate to Authentication → Providers**
   - Click "Authentication" in left sidebar
   - Click "Providers" tab

3. **Check if LinkedIn appears in the list**
   - Scroll through all providers
   - Look for "LinkedIn" or "LinkedIn (OIDC)"
   - If it's NOT in the list, your project might not support it

### Step 3: Enable LinkedIn Provider

If LinkedIn is in the list but not enabled:

1. **Find LinkedIn in the providers list**
2. **Click on it** to open configuration
3. **Enable the toggle** (turn it ON)
4. **Enter Client ID**: `86ogz9n2u1wsgy` (or your actual Client ID)
5. **Enter Client Secret**: Your LinkedIn Client Secret
6. **Click "Save"** or "Update"
7. **Wait for confirmation message**

### Step 4: Check Supabase Plan/Features

Some Supabase plans have limitations:

1. **Go to Supabase Dashboard → Settings → Billing**
2. **Check your plan**
   - Free tier: Should support OAuth providers
   - If on a very limited plan, OAuth might not be available

3. **Check if OAuth is enabled for your project**
   - Go to Settings → API
   - Check if auth endpoints are available

### Step 5: Verify the Endpoint Exists

Test if the auth endpoint is accessible:

1. **Test base auth endpoint:**
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/health
   ```
   - **Expected:** `{"message": "No API key found in request"}` 
   - This is **GOOD** - it means the endpoint exists (not 404)
   - The "No API key" message is normal for health checks
   - If you get 404, the project might be paused

2. **Test settings endpoint (requires API key):**
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cnJxdmxxbm52bGlodGxnbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQ5MDMsImV4cCI6MjA4MTA0MDkwM30.3So6zpF15ORuOF-R6YY2ya1XE9bTCjnsvAxf1B7HZMo
   ```
   - Replace `YOUR_ANON_KEY` with your Supabase anon key
   - Get it from: Supabase Dashboard → Settings → API → anon/public key
   - Should return provider settings JSON
   - Look for `linkedin` in the `external` providers object
   - If `linkedin` is missing, provider isn't enabled
   
   **Note:** The "No API key found" message is normal without the key parameter

### Step 6: Check Your Frontend Configuration

Verify your Supabase client is configured correctly:

1. **Check `.env.local` or environment variables:**
   ```env
   VITE_SUPABASE_URL=https://nvrrqvlqnnvlihtlgmzn.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Verify the URL matches:**
   - Should be: `https://nvrrqvlqnnvlihtlgmzn.supabase.co`
   - No trailing slash
   - Using `https://` not `http://`

## Common Issues

### Issue 1: LinkedIn Provider Not in List

**Symptoms:**
- Can't find LinkedIn in providers list
- Only see Google, GitHub, etc.

**Possible Causes:**
- Project is on a very limited plan
- OAuth providers not enabled for project
- Using wrong Supabase project

**Solution:**
1. Check if you're on the correct Supabase project
2. Try creating a new Supabase project (free tier)
3. Contact Supabase support if OAuth should be available

### Issue 2: Wrong Supabase URL

**Symptoms:**
- 404 error
- URL doesn't match your project

**Solution:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the exact Project URL
3. Update your `.env.local` file
4. Restart your development server

### Issue 3: Project Paused

**Symptoms:**
- 404 or connection errors
- Project was inactive

**Solution:**
1. Go to Supabase Dashboard
2. Check if project shows as "Paused"
3. Click "Restore" or "Resume" if paused
4. Wait for project to restart

### Issue 4: CORS or Network Issues

**Symptoms:**
- 404 in browser console
- But endpoint works in different browser/network

**Solution:**
1. Check browser console for CORS errors
2. Try different browser
3. Check if corporate firewall is blocking
4. Try from different network

## Verification Steps

After configuring, verify:

1. **LinkedIn provider is enabled:**
   - [ ] Toggle is ON in Supabase Dashboard
   - [ ] Client ID is entered
   - [ ] Client Secret is entered
   - [ ] Configuration is saved

2. **Supabase project is active:**
   - [ ] Project shows as "Active" in dashboard
   - [ ] Not paused or suspended

3. **Frontend configuration:**
   - [ ] `VITE_SUPABASE_URL` is correct
   - [ ] `VITE_SUPABASE_ANON_KEY` is set
   - [ ] Development server restarted after env changes

4. **Test the endpoint:**
   - [ ] `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/health` works
   - [ ] `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings` shows providers

## Quick Test

Test if the endpoint is accessible:

```bash
# Test health endpoint
curl https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/health

# Test settings (should show providers)
curl https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings
```

If these return 404, the project might be paused or the URL is wrong.

## Still Getting 404?

### Check Supabase Status

1. Go to: https://status.supabase.com
2. Check if there are any outages
3. Check if your region is affected

### Verify Project URL

1. Go to Supabase Dashboard
2. Settings → API
3. Copy the exact "Project URL"
4. Compare with what you're using in code
5. They must match exactly

### Try Different Provider

Test if OAuth works at all:

1. Try enabling **Google** provider (usually works)
2. Test Google OAuth connection
3. If Google works but LinkedIn doesn't, it's a LinkedIn-specific issue
4. If Google also gives 404, it's a general OAuth issue

### Contact Supabase Support

If nothing works:

1. Go to Supabase Dashboard → Support
2. Provide:
   - Project reference: `nvrrqvlqnnvlihtlgmzn`
   - Error: 404 on `/auth/v1/authorize?provider=linkedin_oidc`
   - Screenshot of provider settings
   - Your Supabase plan/region

## Most Likely Fix

**90% of 404 errors are caused by:**

1. **LinkedIn (OIDC) provider not enabled** - Go enable it in Supabase Dashboard
2. **Wrong Supabase URL** - Check your `.env.local` file
3. **Project paused** - Resume it in Supabase Dashboard

**Try this first:**
1. Go to Supabase Dashboard
2. Authentication → Providers → LinkedIn
3. Make sure toggle is ON
4. Enter Client ID and Secret
5. Click Save
6. Wait 2 minutes
7. Clear browser cache
8. Test again

---

**Remember:** A 404 means the endpoint doesn't exist. This usually means the provider isn't configured or the project URL is wrong.
