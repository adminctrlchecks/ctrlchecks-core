# GitHub Integration Quick Start

Quick setup guide for GitHub OAuth integration with Supabase.

## Prerequisites

- ✅ GitHub account
- ✅ Supabase project
- ✅ Your Supabase Project URL

---

## Step 1: Create GitHub OAuth App (5 minutes)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `CtrlChecks`
   - **Homepage URL:** `http://localhost:5173` (or your domain)
   - **Authorization callback URL:** `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     > Find YOUR_PROJECT_ID in Supabase Dashboard → Settings → API
4. Click **"Register application"**
5. Click **"Generate a new client secret"**
6. **Copy and save:**
   - Client ID
   - Client Secret (shown only once!)

---

## Step 2: Configure Supabase (2 minutes)

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **GitHub** and toggle **"Enabled"**
3. Enter:
   - **Client ID:** Your GitHub Client ID
   - **Client Secret:** Your GitHub Client Secret
   - **Scopes:** `repo,user,read:org`
4. Click **"Save"**

---

## Step 3: Configure Redirect URLs (1 minute)

1. Still in **Authentication**, click **"URL Configuration"**
2. Add redirect URL:
   ```
   http://localhost:5173/auth/github/callback
   ```
3. Set **Site URL:** `http://localhost:5173`
4. Click **"Save"**

---

## Step 4: Verify Route Configuration

The GitHub callback route should already be configured in `App.tsx`. If not, add:

```typescript
import GitHubAuthCallback from "./pages/auth/github/Callback";

// In Routes:
<Route path="/auth/github/callback" element={<GitHubAuthCallback />} />
```

---

## Step 5: Connect GitHub (1 minute)

Add a connection button in your app:

```typescript
import { supabase } from '@/integrations/supabase/client';

const handleConnectGitHub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/github/callback`,
      scopes: 'repo user read:org',
    },
  });
  
  if (error) {
    console.error('GitHub OAuth error:', error);
  }
};
```

---

## Step 6: Test It!

1. Click your "Connect GitHub" button
2. Authorize the app on GitHub
3. You should be redirected back with success message
4. Check Supabase → Table Editor → `social_tokens` table
5. Verify GitHub token is saved

---

## Using GitHub in Workflows

Once connected, use GitHub nodes in your workflows:

```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",
    "owner": "your-username",
    "repo": "your-repo",
    "title": "Bug Report",
    "body": "Issue created from workflow"
  }
}
```

**Available operations:**
- `post_issue` - Create GitHub issue
- `create_repo` - Create repository
- `get_user` - Get user info

---

## Troubleshooting

### "Redirect URI mismatch"
- Verify callback URL in GitHub matches exactly: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- No trailing slashes

### "Provider not enabled"
- Go to Supabase → Authentication → Providers → GitHub
- Toggle to **"Enabled"**

### "Token not saved"
- Check browser console for errors
- Verify backend API is running
- Check `/api/social-tokens` endpoint

---

## Next Steps

- 📖 [Full GitHub Integration Guide](./GITHUB_INTEGRATION_GUIDE.md) - Detailed step-by-step instructions
- 📖 [Supabase OAuth Setup Guide](./SUPABASE_OAUTH_SETUP_GUIDE.md) - Multi-provider setup
- 📖 [Social Media Integration](./SOCIAL_MEDIA_INTEGRATION.md) - Architecture overview

---

**That's it!** You're ready to use GitHub in your workflows! 🎉
