# LinkedIn Supabase Troubleshooting Guide

## Error: "Unsupported provider: provider is not enabled"

This error means LinkedIn provider is not enabled in your Supabase project.

**⚠️ IMPORTANT:** Even if the toggle appears ON, you might need to:
1. Save the configuration again
2. Wait 1-2 minutes for changes to propagate
3. Clear your browser cache
4. Try in an incognito/private window

**🔧 Quick Fix:** See [Detailed Fix Guide](./LINKEDIN_SUPABASE_PROVIDER_NOT_ENABLED_FIX.md) for step-by-step instructions.

## Solution: Enable LinkedIn Provider in Supabase

### Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Providers"** tab

3. **Enable LinkedIn Provider**
   - Scroll down to find **"LinkedIn"** in the list of providers
   - Click the toggle to **enable** it (it should turn green/blue)

4. **Configure LinkedIn Provider**
   - **Client ID (OAuth 2.0 Client ID)**: Enter your LinkedIn Client ID
     - Get this from: LinkedIn Developer Portal → Your App → Auth tab → Application credentials
   - **Client Secret (OAuth 2.0 Client Secret)**: Enter your LinkedIn Client Secret
     - Get this from: LinkedIn Developer Portal → Your App → Auth tab → Application credentials
     - Click "Show" to reveal the secret

5. **Configure Redirect URLs**
   - **IMPORTANT:** The callback URL shown in Supabase (`https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`) is Supabase's internal URL
   - **DO NOT** add this to LinkedIn Developer Portal
   - **DO** add YOUR app's callback URLs to LinkedIn Developer Portal:
     ```
     http://localhost:8080/auth/linkedin/callback
     http://localhost:5173/auth/linkedin/callback
     ```
   - See [Redirect URLs Explained](./LINKEDIN_REDIRECT_URLS_EXPLAINED.md) for details

6. **Save Configuration**
   - Click **"Save"** or the checkmark icon
   - Wait for the confirmation message

7. **Verify Configuration**
   - The LinkedIn provider should now show as "Enabled" (green/blue toggle)
   - You should see your Client ID displayed (partially masked)

## Common Issues

### Issue 1: Redirect URL Mismatch

**Error:** OAuth works but redirect fails or shows error

**Solution:**
- Ensure redirect URLs in Supabase match EXACTLY with LinkedIn Developer Portal
- Check for:
  - `http://` vs `https://`
  - Port numbers (5173 vs 8080)
  - Trailing slashes
  - Case sensitivity

**LinkedIn Developer Portal should have:**
```
http://localhost:5173/auth/linkedin/callback
http://localhost:8080/auth/linkedin/callback
```

**Supabase should have the same URLs**

### Issue 2: Client ID/Secret Incorrect

**Error:** "Invalid client credentials"

**Solution:**
1. Double-check you copied the correct Client ID and Client Secret
2. Make sure there are no extra spaces
3. Verify in LinkedIn Developer Portal that the credentials are correct
4. Try regenerating the Client Secret if needed

### Issue 3: Provider Still Not Working After Enabling

**Solution:**
1. **Clear browser cache** and try again
2. **Wait a few minutes** - Supabase changes can take a moment to propagate
3. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs → Auth Logs
   - Look for any errors related to LinkedIn
4. **Verify the provider is actually enabled**:
   - Go back to Authentication → Providers
   - Confirm LinkedIn toggle is ON (green/blue)

### Issue 4: Port Number Mismatch

**Your code uses:** `window.location.origin` which will be:
- `http://localhost:5173` if running on port 5173
- `http://localhost:8080` if running on port 8080

**Solution:**
- Make sure both ports are configured in:
  1. LinkedIn Developer Portal (redirect URLs)
  2. Supabase (redirect URLs)
  3. Your app is running on the port you're testing

## Verification Checklist

After enabling LinkedIn provider, verify:

- [ ] LinkedIn provider is enabled in Supabase (toggle is ON)
- [ ] Client ID is entered correctly
- [ ] Client Secret is entered correctly
- [ ] Redirect URLs match between:
  - [ ] LinkedIn Developer Portal
  - [ ] Supabase provider settings
  - [ ] Your application code
- [ ] Your app is running on the correct port
- [ ] You've saved the Supabase configuration

## Testing the Connection

1. **Clear browser cache** (important!)
2. **Go to your app** and click "Connect LinkedIn"
3. **You should be redirected to LinkedIn** (not Supabase error page)
4. **Authorize the app** on LinkedIn
5. **You should be redirected back** to your callback URL
6. **Check the Connections panel** - it should show "LinkedIn Connected"

## Still Not Working?

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Auth Logs**
3. Look for errors when you try to connect
4. Common errors:
   - "Invalid redirect_uri" - URL mismatch
   - "Invalid client" - Wrong Client ID
   - "Invalid client_secret" - Wrong Client Secret

### Test with Supabase API Directly

You can test if the provider is enabled by checking the Supabase API:

```bash
curl https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings
```

Look for `linkedin` in the `external` providers list.

### Contact Support

If none of the above works:
1. Check Supabase status page
2. Verify your Supabase project is on a plan that supports OAuth providers
3. Contact Supabase support with:
   - Your project reference ID
   - The exact error message
   - Screenshot of your provider settings (hide secrets)

## Quick Fix Summary

1. ✅ Enable LinkedIn in Supabase Dashboard → Authentication → Providers
2. ✅ Enter Client ID and Client Secret from LinkedIn
3. ✅ Add redirect URLs (must match LinkedIn exactly)
4. ✅ Save configuration
5. ✅ Clear browser cache
6. ✅ Test connection

---

**Most Common Fix:** Simply enabling the LinkedIn provider toggle in Supabase Dashboard solves 90% of this error!
