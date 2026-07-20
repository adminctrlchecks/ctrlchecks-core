# LinkedIn Redirect URLs - Complete Explanation

## Understanding the Two Different Callback URLs

There are **TWO different callback URLs** you need to understand:

### 1. Supabase Internal Callback URL (DO NOT USE THIS)
```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
```
- This is Supabase's **internal** callback URL
- Used by Supabase to receive OAuth responses from LinkedIn
- **DO NOT** add this to LinkedIn Developer Portal
- This is shown in Supabase dashboard for reference only

### 2. Your Application Callback URL (USE THIS)
```
http://localhost:8080/auth/linkedin/callback
```
- This is **YOUR app's** callback URL
- Where users are redirected after LinkedIn authorization
- **MUST** be added to LinkedIn Developer Portal
- This is what you configure in your code

## The OAuth Flow Explained

```
1. User clicks "Connect LinkedIn" in your app
   ↓
2. Your app redirects to Supabase:
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/authorize?
   provider=linkedin_oidc&
   redirect_to=http://localhost:8080/auth/linkedin/callback
   ↓
3. Supabase redirects to LinkedIn:
   https://www.linkedin.com/oauth/v2/authorization?
   client_id=...&
   redirect_uri=https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   ↓
4. User authorizes on LinkedIn
   ↓
5. LinkedIn redirects to Supabase's callback:
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   ↓
6. Supabase processes OAuth and redirects to YOUR app:
   http://localhost:8080/auth/linkedin/callback
   ↓
7. Your app's callback page processes the session
```

## What to Configure Where

### In LinkedIn Developer Portal

Go to: LinkedIn Developer Portal → Your App → Auth → OAuth 2.0 settings

**Add these redirect URLs:**
```
http://localhost:8080/auth/linkedin/callback
http://localhost:5173/auth/linkedin/callback
https://your-production-domain.com/auth/linkedin/callback
```

**DO NOT add:**
- ❌ `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback` (Supabase's internal URL)

### In Supabase Dashboard

Go to: Supabase Dashboard → Authentication → Providers → LinkedIn

**The Callback URL shown here:**
```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
```
- This is **automatically set** by Supabase
- You **don't need to change it**
- It's shown for reference only
- Supabase uses this internally to receive OAuth responses

**What you DO configure:**
- ✅ Enable LinkedIn (toggle ON)
- ✅ Enter Client ID
- ✅ Enter Client Secret
- ✅ (Optional) Configure additional settings

### In Your Application Code

Your code should use:
```typescript
const redirectUrl = `${window.location.origin}/auth/linkedin/callback`;
// This becomes: http://localhost:8080/auth/linkedin/callback
```

## Common Mistakes

### ❌ Mistake 1: Adding Supabase Callback to LinkedIn
**Wrong:**
- Adding `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback` to LinkedIn Developer Portal

**Why it's wrong:**
- LinkedIn will try to redirect directly to Supabase
- Supabase won't know which app to redirect to
- The flow breaks

### ❌ Mistake 2: Using Wrong Port
**Wrong:**
- App runs on port 8080
- But LinkedIn has `http://localhost:5173/auth/linkedin/callback`

**Why it's wrong:**
- Redirect URL mismatch
- LinkedIn redirects to wrong port
- Your app doesn't receive the callback

### ✅ Correct Setup

1. **LinkedIn Developer Portal:**
   - Add: `http://localhost:8080/auth/linkedin/callback`
   - Add: `http://localhost:5173/auth/linkedin/callback` (if you use both ports)
   - **How to add multiple URLs:** See [How to Add Multiple Redirect URLs](./LINKEDIN_ADD_MULTIPLE_REDIRECT_URLS.md)

2. **Supabase Dashboard:**
   - Enable LinkedIn provider
   - Enter Client ID and Secret
   - Leave callback URL as-is (Supabase manages it)

3. **Your Code:**
   - Uses: `${window.location.origin}/auth/linkedin/callback`
   - This automatically uses the correct port

## Verification Checklist

- [ ] LinkedIn Developer Portal has `http://localhost:8080/auth/linkedin/callback`
- [ ] LinkedIn Developer Portal has `http://localhost:5173/auth/linkedin/callback` (if needed)
- [ ] Supabase LinkedIn provider is enabled
- [ ] Supabase has correct Client ID and Secret
- [ ] Your app is running on the port you configured
- [ ] Your callback route exists: `/auth/linkedin/callback`

## Testing

1. Make sure your app is running on `localhost:8080`
2. Click "Connect LinkedIn"
3. You should be redirected to LinkedIn (not Supabase error)
4. Authorize the app
5. You should be redirected back to `http://localhost:8080/auth/linkedin/callback`
6. Your app should process the connection

## Still Getting "Provider Not Enabled" Error?

Even if LinkedIn is enabled in Supabase, you might still see this error if:

1. **Browser cache** - Clear cache and try again
2. **Supabase propagation delay** - Wait 1-2 minutes after enabling
3. **Wrong Supabase project** - Make sure you're using the correct project
4. **Provider not actually saved** - Go back and verify it's still enabled

## Quick Fix

1. ✅ **LinkedIn Developer Portal:**
   - Add: `http://localhost:8080/auth/linkedin/callback`
   - Save

2. ✅ **Supabase Dashboard:**
   - Authentication → Providers → LinkedIn
   - Toggle: ON (if not already)
   - Client ID: Your LinkedIn Client ID
   - Client Secret: Your LinkedIn Client Secret
   - Save

3. ✅ **Clear browser cache**

4. ✅ **Test again**

---

**Remember:** The Supabase callback URL (`https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`) is for Supabase's internal use. You configure YOUR app's callback URL (`http://localhost:8080/auth/linkedin/callback`) in LinkedIn Developer Portal.
