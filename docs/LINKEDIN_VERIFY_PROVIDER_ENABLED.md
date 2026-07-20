# How to Verify LinkedIn Provider is Enabled in Supabase

## Quick Verification Methods

### Method 1: Check Supabase Dashboard (Easiest)

1. Go to Supabase Dashboard
2. Authentication → Providers → LinkedIn
3. Check:
   - [ ] Toggle is ON (green/blue)
   - [ ] Client ID is filled
   - [ ] Client Secret is filled (masked)
   - [ ] No error messages

### Method 2: Test Settings Endpoint with API Key

**Step 1: Get Your Anon Key**

1. Go to Supabase Dashboard
2. Settings → API
3. Find "Project API keys"
4. Copy the **"anon"** or **"public"** key
   - This is safe to use in frontend code
   - It's different from the service role key

**Step 2: Test the Endpoint**

**In Browser:**
```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings?apikey=YOUR_ANON_KEY
```

Replace `YOUR_ANON_KEY` with your actual anon key.

**Or with curl:**
```bash
curl "https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings?apikey=YOUR_ANON_KEY"
```

**Expected Response (if LinkedIn is enabled):**
```json
{
  "external": {
    "linkedin": {
      "enabled": true,
      "client_id": "86ogz9n2u1wsgy",
      ...
    },
    ...
  }
}
```

**If LinkedIn is NOT enabled:**
- `linkedin` will be missing from the `external` object
- Or `linkedin.enabled` will be `false`

### Method 3: Test OAuth Flow Directly

**Test URL:**
```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/authorize?provider=linkedin_oidc&redirect_to=http://localhost:8080/auth/linkedin/callback
```

**Expected Results:**

✅ **If enabled:**
- Redirects to LinkedIn authorization page
- Shows LinkedIn login/consent screen

❌ **If not enabled:**
- Returns 404 error
- Or JSON error: `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`

## Understanding the "No API key" Message

When you test endpoints without an API key, you'll see:
```json
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

**This is normal!** It means:
- ✅ The endpoint exists (not 404)
- ✅ Your Supabase project is active
- ⚠️ You just need to add the API key to see the actual data

## Quick Test Script

You can create a simple test in your browser console:

```javascript
// Get your anon key from Supabase Dashboard → Settings → API
const anonKey = 'YOUR_ANON_KEY_HERE';

fetch(`https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/settings?apikey=${anonKey}`)
  .then(res => res.json())
  .then(data => {
    console.log('Providers:', data.external);
    if (data.external?.linkedin?.enabled) {
      console.log('✅ LinkedIn is enabled!');
    } else {
      console.log('❌ LinkedIn is NOT enabled');
    }
  });
```

## Troubleshooting

### Issue: Still Getting 404 on Settings Endpoint

**Possible causes:**
1. Wrong Supabase URL
2. Project is paused
3. API key is incorrect

**Solution:**
- Verify project URL in Supabase Dashboard → Settings → API
- Check project status (not paused)
- Verify anon key is correct

### Issue: Settings Endpoint Works but LinkedIn Not in Response

**This means:**
- Supabase is working
- But LinkedIn provider is not enabled

**Solution:**
- Go to Supabase Dashboard
- Authentication → Providers → LinkedIn
- Enable it and save

### Issue: Can't Find Anon Key

**Where to find it:**
1. Supabase Dashboard
2. Settings (gear icon) → API
3. Look for "Project API keys" section
4. Find "anon" or "public" key
5. Click "Reveal" or copy icon

**Note:** 
- "anon" key = public key (safe for frontend)
- "service_role" key = secret key (backend only, never expose)

## Verification Checklist

After enabling LinkedIn provider:

- [ ] Supabase Dashboard shows LinkedIn toggle ON
- [ ] Client ID and Secret are entered
- [ ] Configuration is saved
- [ ] Settings endpoint shows `linkedin.enabled: true`
- [ ] OAuth authorize endpoint redirects to LinkedIn (not 404)
- [ ] Test connection works in your app

---

**Remember:** The "No API key" message is normal. Add your anon key as a query parameter to see the actual provider settings.
