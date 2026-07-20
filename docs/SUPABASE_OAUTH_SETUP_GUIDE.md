# Supabase OAuth Setup Guide

Complete step-by-step guide for configuring GitHub, Facebook, and Twitter OAuth in Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub OAuth Setup](#github-oauth-setup)
3. [Facebook OAuth Setup](#facebook-oauth-setup)
4. [Twitter OAuth Setup](#twitter-oauth-setup)
5. [Supabase Configuration](#supabase-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ Supabase project created
- ✅ Admin access to Supabase Dashboard
- ✅ GitHub account (for GitHub OAuth)
- ✅ Facebook Developer account (for Facebook OAuth)
- ✅ Twitter Developer account (for Twitter OAuth)
- ✅ Your application's base URL (e.g., `http://localhost:5173` for dev, `https://yourdomain.com` for production)

---

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"** (or **"New GitHub App"** → select OAuth App)
3. Fill in the form:

   **Application name:** `CtrlChecks` (or your app name)
   
   **Homepage URL:** 
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
   
   **Authorization callback URL:** 
   - Development: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Production: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   
   > **Note:** Use your Supabase project URL. Find it in Supabase Dashboard → Settings → API → Project URL

4. Click **"Register application"**
5. **IMPORTANT:** On the next page, click **"Generate a new client secret"**
6. Copy and save:
   - **Client ID** (e.g., `Iv1.8a61f9b3a7aba766`)
   - **Client Secret** (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 2: Configure GitHub OAuth in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **GitHub** in the list
5. Click **"Enable GitHub"** or toggle it ON
6. Enter your credentials:
   - **Client ID:** Paste your GitHub Client ID
   - **Client Secret:** Paste your GitHub Client Secret
7. **Scopes:** Add these scopes (comma-separated):
   ```
   repo,user,read:org
   ```
   - `repo` - Full control of private repositories
   - `user` - Read user profile data
   - `read:org` - Read org and team membership
8. Click **"Save"**

### Step 3: Verify GitHub Configuration

- ✅ Status should show "Enabled"
- ✅ Client ID should be visible
- ✅ Client Secret should show as "••••••••"

---

## Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Consumer"** or **"Business"** app type
4. Fill in:
   - **App Name:** `CtrlChecks` (or your app name)
   - **App Contact Email:** Your email
   - **Business Account:** (Optional) Select if you have one
5. Click **"Create App"**

### Step 2: Add Facebook Login Product

1. In your Facebook App dashboard, find **"Add a Product"**
2. Click **"Set Up"** on **"Facebook Login"**
3. Select **"Web"** platform
4. Enter your site URL:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
5. Click **"Save"**

### Step 3: Configure Facebook Login Settings

1. Go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs**:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   > Replace `YOUR_PROJECT_ID` with your Supabase project ID

3. Add **Valid OAuth Redirect URIs** for your app:
   ```
   http://localhost:5173/auth/facebook/callback
   https://yourdomain.com/auth/facebook/callback
   ```

4. **Deauthorize Callback URL:** (Optional)
   ```
   https://yourdomain.com/auth/facebook/deauthorize
   ```

5. Click **"Save Changes"**

### Step 4: Get Facebook App Credentials

1. Go to **Settings** → **Basic**
2. Copy:
   - **App ID** (e.g., `1234567890123456`)
   - **App Secret** → Click **"Show"** → Copy (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4`)
3. **IMPORTANT:** Save these securely

### Step 5: Configure Facebook OAuth in Supabase

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** in the list
3. Click **"Enable Facebook"** or toggle it ON
4. Enter your credentials:
   - **App ID:** Paste your Facebook App ID
   - **App Secret:** Paste your Facebook App Secret
5. **Scopes:** Add these scopes (comma-separated):
   ```
   email,public_profile,pages_manage_posts,pages_read_engagement
   ```
   - `email` - Access user email
   - `public_profile` - Access basic profile info
   - `pages_manage_posts` - Post to pages
   - `pages_read_engagement` - Read page engagement
6. Click **"Save"**

### Step 6: Facebook App Review (Production)

⚠️ **Important:** For production use, you need to submit your app for review:

1. Go to **App Review** → **Permissions and Features**
2. Request permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
3. Submit for review (can take 7-14 days)

**For Development/Testing:**
- Add test users in **Roles** → **Test Users**
- Test users can use the app without review

---

## Twitter OAuth Setup

### Step 1: Create Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. Click **"Sign up"** or **"Apply"** for developer access
4. Fill in the application form:
   - **What is your use case?** → Select appropriate option
   - **Will you make Twitter content available to a government entity?** → Answer appropriately
5. Accept terms and submit
6. Wait for approval (usually instant, but can take up to 24 hours)

### Step 2: Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **"Create Project"** or **"Create App"**
3. Fill in:
   - **App name:** `CtrlChecks` (or your app name)
   - **App environment:** Select appropriate (Development/Production)
4. Click **"Next"**
5. Select **"Web App, Automated App or Bot"**
6. Fill in:
   - **App description:** Brief description of your app
   - **Website URL:** 
     - Development: `http://localhost:5173`
     - Production: `https://yourdomain.com`
   - **Callback URI / Redirect URL:** 
     ```
     https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
     ```
     > Replace `YOUR_PROJECT_ID` with your Supabase project ID
7. Click **"Create"**

### Step 3: Configure Twitter App Settings

1. In your Twitter App dashboard, go to **"Settings"** tab
2. Under **"App permissions"**, select:
   - ✅ **Read and write** (for posting tweets)
   - Or **Read** (for read-only access)
3. Under **"Type of App"**, select:
   - ✅ **Web App, Automated App or Bot**
4. Add **Callback URI / Redirect URL**:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
5. Click **"Save"**

### Step 4: Get Twitter API Keys

1. Go to **"Keys and tokens"** tab
2. Under **"Consumer Keys"**, click **"Regenerate"** if needed
3. Copy:
   - **API Key** (Consumer Key) - e.g., `AbCdEfGhIjKlMnOpQrStUvWxYz`
   - **API Key Secret** (Consumer Secret) - Click **"Reveal"** → Copy
4. **IMPORTANT:** Save these securely

### Step 5: Configure Twitter OAuth in Supabase

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Twitter** in the list
3. Click **"Enable Twitter"** or toggle it ON
4. Enter your credentials:
   - **API Key:** Paste your Twitter API Key (Consumer Key)
   - **API Secret:** Paste your Twitter API Key Secret (Consumer Secret)
5. **Scopes:** Add these scopes (comma-separated):
   ```
   tweet.read,tweet.write,users.read,offline.access
   ```
   - `tweet.read` - Read tweets
   - `tweet.write` - Post tweets
   - `users.read` - Read user profile
   - `offline.access` - Refresh token support
6. Click **"Save"**

---

## Supabase Configuration

### Step 1: Configure Redirect URLs

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add **Redirect URLs**:

   **Development:**
   ```
   http://localhost:5173/auth/github/callback
   http://localhost:5173/auth/facebook/callback
   http://localhost:5173/auth/twitter/callback
   ```

   **Production:**
   ```
   https://yourdomain.com/auth/github/callback
   https://yourdomain.com/auth/facebook/callback
   https://yourdomain.com/auth/twitter/callback
   ```

3. Add **Site URL**:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`

4. Click **"Save"**

### Step 2: Verify Provider Status

Check that all providers show:
- ✅ **Enabled** status
- ✅ **Client ID / App ID** visible
- ✅ **Client Secret / App Secret** masked

### Step 3: Test Configuration

1. Go to **Authentication** → **Users**
2. Try signing in with each provider
3. Check that redirects work correctly

---

## Testing

### Test GitHub OAuth

1. In your app, trigger GitHub sign-in:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'github',
     options: {
       redirectTo: `${window.location.origin}/auth/github/callback`,
       scopes: 'repo user read:org',
     },
   });
   ```

2. You should be redirected to GitHub
3. Authorize the app
4. You should be redirected back to your callback URL
5. Check Supabase → **Authentication** → **Users** for new user

### Test Facebook OAuth

1. Trigger Facebook sign-in:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'facebook',
     options: {
       redirectTo: `${window.location.origin}/auth/facebook/callback`,
       scopes: 'email,public_profile,pages_manage_posts',
     },
   });
   ```

2. You should be redirected to Facebook
3. Authorize the app
4. You should be redirected back to your callback URL

### Test Twitter OAuth

1. Trigger Twitter sign-in:
   ```typescript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'twitter',
     options: {
       redirectTo: `${window.location.origin}/auth/twitter/callback`,
       scopes: 'tweet.read tweet.write users.read',
     },
   });
   ```

2. You should be redirected to Twitter
3. Authorize the app
4. You should be redirected back to your callback URL

---

## Troubleshooting

### Common Issues

#### 1. "Redirect URI mismatch"

**Problem:** OAuth provider rejects the redirect URI

**Solution:**
- Check that redirect URI in provider settings matches exactly:
  ```
  https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
  ```
- No trailing slashes
- Use `https://` not `http://` for Supabase callback
- Check Supabase project URL in Settings → API

#### 2. "Invalid client credentials"

**Problem:** Client ID or Secret is incorrect

**Solution:**
- Double-check credentials in Supabase Dashboard
- Regenerate secrets if needed
- Ensure no extra spaces when copying

#### 3. "App not approved" (Facebook)

**Problem:** Facebook app needs review for production

**Solution:**
- Use test users for development
- Submit app for review for production
- Add test users in Facebook App → Roles → Test Users

#### 4. "Twitter API v2 access required"

**Problem:** Twitter app needs elevated access

**Solution:**
- Apply for Elevated access in Twitter Developer Portal
- Go to **Developer Portal** → **Projects & Apps** → **Elevated**
- Fill out use case form
- Wait for approval (usually instant)

#### 5. "Scope not granted"

**Problem:** Requested scopes not available

**Solution:**
- Check provider-specific scope requirements
- GitHub: Some scopes require organization approval
- Facebook: Some scopes require app review
- Twitter: Some scopes require elevated access

#### 6. "Callback URL not whitelisted"

**Problem:** Frontend callback URL not in Supabase allowed list

**Solution:**
- Add callback URL in Supabase → Authentication → URL Configuration
- Format: `http://localhost:5173/auth/{provider}/callback`
- Add both development and production URLs

#### 7. "Token not saved"

**Problem:** Token not appearing in database

**Solution:**
- Check backend API endpoint is working: `/api/social-tokens`
- Verify frontend callback handler calls the API
- Check browser console for errors
- Verify Supabase session token is valid

### Debug Checklist

- [ ] Provider enabled in Supabase Dashboard
- [ ] Client ID/Secret correct
- [ ] Redirect URI matches exactly
- [ ] Scopes configured correctly
- [ ] Frontend callback URLs added to Supabase
- [ ] OAuth app created on provider platform
- [ ] Provider app approved (if required)
- [ ] Test user added (Facebook)
- [ ] Elevated access granted (Twitter)

### Getting Help

If issues persist:

1. **Check Supabase Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for error messages

2. **Check Provider Logs:**
   - GitHub: Settings → Developer settings → OAuth Apps → Your app
   - Facebook: App Dashboard → Logs
   - Twitter: Developer Portal → Activity

3. **Verify Environment:**
   - Development vs Production URLs
   - HTTPS vs HTTP
   - CORS settings

---

## Quick Reference

### Supabase Callback URL Format

```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

Find your Project ID:
- Supabase Dashboard → Settings → API → Project URL
- Extract the project ID from the URL

### Required Scopes

**GitHub:**
```
repo,user,read:org
```

**Facebook:**
```
email,public_profile,pages_manage_posts,pages_read_engagement
```

**Twitter:**
```
tweet.read,tweet.write,users.read,offline.access
```

### Frontend Callback URLs

**Development:**
```
http://localhost:5173/auth/github/callback
http://localhost:5173/auth/facebook/callback
http://localhost:5173/auth/twitter/callback
```

**Production:**
```
https://yourdomain.com/auth/github/callback
https://yourdomain.com/auth/facebook/callback
https://yourdomain.com/auth/twitter/callback
```

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use environment variables
   - Use `.env` files (add to `.gitignore`)

2. **Rotate secrets regularly**
   - Regenerate OAuth secrets every 90 days
   - Update in Supabase immediately

3. **Use different apps for dev/prod**
   - Separate OAuth apps for development and production
   - Different redirect URLs

4. **Monitor usage**
   - Check provider dashboards for unusual activity
   - Set up alerts for suspicious logins

5. **Limit scopes**
   - Only request scopes you actually need
   - Review scope requirements regularly

---

## Next Steps

After completing OAuth setup:

1. ✅ Test each provider end-to-end
2. ✅ Verify tokens are saved in `social_tokens` table
3. ✅ Test token refresh functionality
4. ✅ Test node operations (post tweet, create issue, etc.)
5. ✅ Monitor for errors in production

For more information, see:
- [Social Media Integration Documentation](./SOCIAL_MEDIA_INTEGRATION.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Twitter OAuth Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
