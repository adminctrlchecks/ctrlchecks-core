# Quick Start: OAuth Setup

Quick reference for setting up OAuth providers. For detailed instructions, see [SUPABASE_OAUTH_SETUP_GUIDE.md](./SUPABASE_OAUTH_SETUP_GUIDE.md).

## 🚀 Quick Setup Checklist

### 1. Get Your Supabase Project URL

1. Go to Supabase Dashboard → Settings → API
2. Copy your **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
3. Your callback URL will be: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

### 2. GitHub OAuth (5 minutes)

1. **Create GitHub OAuth App:**
   - Go to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Callback URL: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

2. **Enable in Supabase:**
   - Dashboard → Authentication → Providers → GitHub
   - Enable, paste Client ID and Secret
   - Scopes: `repo,user,read:org`
   - Save

### 3. Facebook OAuth (10 minutes)

1. **Create Facebook App:**
   - Go to: https://developers.facebook.com/
   - Create App → Add "Facebook Login" product
   - Settings → Valid OAuth Redirect URIs:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy App ID and App Secret

2. **Enable in Supabase:**
   - Dashboard → Authentication → Providers → Facebook
   - Enable, paste App ID and Secret
   - Scopes: `email,public_profile,pages_manage_posts`
   - Save

### 4. Twitter OAuth (10 minutes)

1. **Create Twitter App:**
   - Go to: https://developer.twitter.com/
   - Create App → Web App
   - Callback URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy API Key and API Secret

2. **Enable in Supabase:**
   - Dashboard → Authentication → Providers → Twitter
   - Enable, paste API Key and Secret
   - Scopes: `tweet.read,tweet.write,users.read`
   - Save

### 5. Configure Redirect URLs in Supabase

1. Dashboard → Authentication → URL Configuration
2. Add Redirect URLs:
   ```
   http://localhost:5173/auth/github/callback
   http://localhost:5173/auth/facebook/callback
   http://localhost:5173/auth/twitter/callback
   ```
3. Add Site URL: `http://localhost:5173` (or your production URL)
4. Save

## ✅ Verification

Test each provider:

```typescript
// GitHub
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/github/callback`,
  },
});

// Facebook
await supabase.auth.signInWithOAuth({
  provider: 'facebook',
  options: {
    redirectTo: `${window.location.origin}/auth/facebook/callback`,
  },
});

// Twitter
await supabase.auth.signInWithOAuth({
  provider: 'twitter',
  options: {
    redirectTo: `${window.location.origin}/auth/twitter/callback`,
  },
});
```

## 🔗 Important URLs

**Supabase Callback (use this in OAuth apps):**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

**Frontend Callbacks (add to Supabase URL Configuration):**
```
http://localhost:5173/auth/github/callback
http://localhost:5173/auth/facebook/callback
http://localhost:5173/auth/twitter/callback
```

## ⚠️ Common Mistakes

1. **Wrong callback URL format**
   - ❌ `http://localhost:5173/auth/v1/callback`
   - ✅ `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

2. **Missing redirect URLs in Supabase**
   - Must add frontend callback URLs to Supabase URL Configuration

3. **Scopes mismatch**
   - Check provider-specific scope requirements
   - Some scopes need app review (Facebook)

4. **Using HTTP instead of HTTPS**
   - Supabase callback must use HTTPS
   - Frontend callbacks can use HTTP for localhost

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configuration:
👉 **[SUPABASE_OAUTH_SETUP_GUIDE.md](./SUPABASE_OAUTH_SETUP_GUIDE.md)**
