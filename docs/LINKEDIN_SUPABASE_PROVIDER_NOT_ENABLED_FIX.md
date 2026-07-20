# Fix: "Unsupported provider: provider is not enabled" Error

## The Problem

You're getting this error even though:
- ✅ LinkedIn redirect URLs are configured correctly
- ✅ LinkedIn provider toggle appears ON in Supabase
- ✅ Client ID and Secret are entered

**The error is coming from Supabase**, which means the provider isn't actually enabled or saved properly.

## Step-by-Step Fix

### Step 1: Verify Supabase Configuration

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project: `nvrrqvlqnnvlihtlgmzn`

2. **Navigate to Authentication → Providers**
   - Click "Authentication" in left sidebar
   - Click "Providers" tab

3. **Find LinkedIn Provider**
   - Scroll to find "LinkedIn" or "LinkedIn (OIDC)"
   - Check if toggle is ON (green/blue)

### Step 2: Re-Enable LinkedIn Provider

Even if it appears ON, try this:

1. **Turn OFF the LinkedIn provider**
   - Click the toggle to turn it OFF
   - Wait 2-3 seconds
   - **Save/Update** if there's a save button

2. **Turn ON the LinkedIn provider**
   - Click the toggle to turn it ON again
   - Make sure it turns green/blue

3. **Verify Configuration**
   - **Client ID** should be filled: `86ogz9n2u1wsgy` (or your actual Client ID)
   - **Client Secret** should be filled (masked)
   - If either is empty, enter them

4. **Save Configuration**
   - Look for a **"Save"**, **"Update"**, or **checkmark (✓)** button
   - Click it and wait for confirmation
   - **This is critical - the configuration must be saved!**

### Step 3: Verify Client ID and Secret

1. **Get from LinkedIn Developer Portal**
   - Go to: https://www.linkedin.com/developers/apps
   - Select your app
   - Go to "Auth" tab
   - Find "Application credentials"
   - Copy **Client ID**: `86ogz9n2u1wsgy`
   - Click "Show" next to **Client Secret** and copy it

2. **Enter in Supabase**
   - Go back to Supabase Dashboard
   - Authentication → Providers → LinkedIn
   - **API Key** field: Paste Client ID
   - **API Secret Key** field: Paste Client Secret
   - **Save**

### Step 4: Clear Browser Cache

1. **Hard Refresh**
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Or `Cmd + Shift + R` (Mac)

2. **Or Clear Cache**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Clear data

3. **Try Incognito/Private Window**
   - Open a new incognito/private window
   - Test the connection there

### Step 5: Wait for Propagation

Supabase changes can take 1-2 minutes to propagate:

1. **Wait 2 minutes** after saving
2. **Try again** - the error might be from cached configuration

### Step 6: Verify Provider is Actually Enabled

Check if the provider is actually enabled by testing the Supabase API:

1. **Get your Supabase URL and anon key**
   - Go to Supabase Dashboard → Settings → API
   - Copy your project URL and anon key

2. **Test the provider status** (optional):
   ```bash
   curl https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings
   ```
   - Look for `linkedin` in the response
   - It should show as enabled

## Common Issues and Solutions

### Issue 1: Toggle is ON but Not Saved

**Symptoms:**
- Toggle appears ON
- But error still occurs

**Solution:**
1. Turn toggle OFF
2. Click Save/Update
3. Turn toggle ON
4. Click Save/Update again
5. Wait 2 minutes
6. Test again

### Issue 2: Client ID/Secret Not Entered

**Symptoms:**
- Toggle is ON
- But Client ID or Secret fields are empty

**Solution:**
1. Get Client ID and Secret from LinkedIn
2. Enter them in Supabase
3. **Save the configuration**
4. Test again

### Issue 3: Wrong Supabase Project

**Symptoms:**
- Everything looks correct
- But still getting error

**Solution:**
1. Verify you're in the correct Supabase project
2. Check the project URL matches: `nvrrqvlqnnvlihtlgmzn`
3. If you have multiple projects, make sure you're configuring the right one

### Issue 4: Browser Cache

**Symptoms:**
- Configuration is correct
- But old error persists

**Solution:**
1. Clear browser cache completely
2. Try incognito/private window
3. Try different browser
4. Restart browser

## Complete Checklist

Go through this checklist in order:

- [ ] Opened correct Supabase project (`nvrrqvlqnnvlihtlgmzn`)
- [ ] Went to Authentication → Providers
- [ ] Found LinkedIn provider
- [ ] Toggle is OFF, then turned ON
- [ ] Client ID is entered: `86ogz9n2u1wsgy` (or your actual ID)
- [ ] Client Secret is entered (not empty)
- [ ] Clicked "Save" or "Update" button
- [ ] Saw confirmation message
- [ ] Waited 2 minutes for propagation
- [ ] Cleared browser cache
- [ ] Tried in incognito/private window
- [ ] Tested connection again

## Still Not Working?

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Auth Logs**
3. Look for errors when you try to connect
4. Check for messages about LinkedIn provider

### Verify Provider Type

Make sure you're configuring the correct provider:
- **LinkedIn** (not LinkedIn OIDC if that's separate)
- Or **LinkedIn (OIDC)** if that's what your app uses

### Contact Supabase Support

If nothing works:
1. Take a screenshot of your LinkedIn provider settings (hide secrets)
2. Note the exact error message
3. Check Supabase status page
4. Contact Supabase support with:
   - Project reference: `nvrrqvlqnnvlihtlgmzn`
   - Error message
   - Screenshot of provider settings

## Quick Test

After following all steps, test with this URL directly:

```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/authorize?provider=linkedin_oidc&redirect_to=http://localhost:8080/auth/linkedin/callback
```

**Expected:** Should redirect to LinkedIn (not show JSON error)

**If still shows error:** Provider is definitely not enabled - go back to Step 2

## Most Common Fix

**90% of the time, this fixes it:**

1. Turn LinkedIn provider OFF
2. Click Save
3. Turn LinkedIn provider ON
4. **Make sure Client ID and Secret are filled**
5. Click Save
6. Wait 2 minutes
7. Clear browser cache
8. Try again

---

**Remember:** The toggle being ON doesn't mean it's saved. You MUST click Save/Update after making changes!
