# GitHub Integration Guide - Complete Step-by-Step

This comprehensive guide will walk you through integrating GitHub OAuth into your CtrlChecks application with Supabase. Follow each step carefully to ensure a successful integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create GitHub OAuth App](#step-1-create-github-oauth-app)
3. [Step 2: Configure GitHub OAuth in Supabase](#step-2-configure-github-oauth-in-supabase)
4. [Step 3: Set Environment Variables](#step-3-set-environment-variables)
5. [Step 4: Verify Database Schema](#step-4-verify-database-schema)
6. [Step 5: Add GitHub Route Configuration](#step-5-add-github-route-configuration)
7. [Step 6: Create Connection Component](#step-6-create-connection-component)
8. [Step 7: Test the Integration](#step-7-test-the-integration)
9. [Step 8: Using GitHub in Workflows](#step-8-using-github-in-workflows)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A GitHub account
- ✅ Access to [GitHub Developer Settings](https://github.com/settings/developers)
- ✅ A Supabase project with admin access
- ✅ Your application running locally or deployed
- ✅ Your Supabase Project URL (found in Supabase Dashboard → Settings → API)
- ✅ Node.js and npm installed (for backend)

---

## Step 1: Create GitHub OAuth App

### 1.1 Go to GitHub Developer Settings

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
2. Sign in with your GitHub account
3. If you don't have developer access, you'll be prompted to enable it

### 1.2 Create a New OAuth App

1. In the left sidebar, click **"OAuth Apps"** (or go directly to [OAuth Apps](https://github.com/settings/developers))
2. Click **"New OAuth App"** button (top right)
3. Fill in the application details:

   **Application name:** 
   - Enter your app name (e.g., `CtrlChecks` or `YourAppName`)
   
   **Homepage URL:** 
   - **Development:** `http://localhost:5173`
   - **Production:** `https://yourdomain.com`
   
   **Application description:** (Optional)
   - Brief description of your application
   
   **Authorization callback URL:** 
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   ```
   > **Important:** Replace `YOUR_PROJECT_ID` with your actual Supabase project ID
   > 
   > **How to find your Project ID:**
   > - Go to Supabase Dashboard → Settings → API
   > - Copy the Project URL (e.g., `https://abcdefghijklmnop.supabase.co`)
   > - Extract the project ID (e.g., `abcdefghijklmnop`)

4. Click **"Register application"**

### 1.3 Generate Client Secret

1. After creating the app, you'll see the app details page
2. **IMPORTANT:** Click **"Generate a new client secret"** button
3. Copy and save securely:
   - **Client ID** (e.g., `Iv1.8a61f9b3a7aba766`)
   - **Client Secret** (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
   
   ⚠️ **Warning:** The client secret will only be shown once. Save it immediately!

### 1.4 Note Required Scopes

For GitHub integration, you'll need these scopes:

- `repo` - Full control of private repositories (required for creating repos and issues)
- `user` - Read user profile data
- `read:org` - Read organization and team membership (optional, if you need org access)

**Scope Details:**
- `repo` - Grants read/write access to repositories, issues, pull requests, etc.
- `user` - Grants read access to user profile information
- `read:org` - Grants read access to organization membership (if needed)

---

## Step 2: Configure GitHub OAuth in Supabase

### 2.1 Open Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project

### 2.2 Navigate to Authentication Providers

1. Click **"Authentication"** in the left sidebar
2. Click **"Providers"** tab
3. Scroll down to find **"GitHub"** in the providers list

### 2.3 Enable GitHub Provider

1. Find **"GitHub"** in the providers list
2. Toggle the switch to **"Enabled"** or click **"Enable GitHub"**

### 2.4 Enter GitHub Credentials

1. **Client ID (GitHub):** Paste your GitHub Client ID
2. **Client Secret (GitHub):** Paste your GitHub Client Secret
3. **Scopes:** Enter these scopes (comma-separated):
   ```
   repo,user,read:org
   ```
   Or space-separated:
   ```
   repo user read:org
   ```

### 2.5 Save Configuration

1. Click **"Save"** button
2. Verify the status shows **"Enabled"**
3. Verify Client ID is visible
4. Verify Client Secret shows as masked (••••••••)

### 2.6 Configure Redirect URLs

1. Still in **"Authentication"**, click **"URL Configuration"** tab
2. Add **Redirect URLs**:

   **Development:**
   ```
   http://localhost:5173/auth/github/callback
   ```

   **Production:**
   ```
   https://yourdomain.com/auth/github/callback
   ```

3. Set **Site URL**:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`

4. Click **"Save"**

---

## Step 3: Set Environment Variables

### 3.1 Backend Environment Variables

Add to your backend `.env` file (in `worker/` directory):

```bash
# GitHub OAuth Credentials (Optional - used for token refresh if needed)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Token Encryption (REQUIRED in production)
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** The GitHub credentials in the backend are optional. Supabase handles the OAuth flow, but you may need them for advanced token refresh scenarios.

### 3.2 Frontend Environment Variables

Add to your frontend `.env` file (in `ctrl_checks/` directory):

```bash
# API URL (if not already set)
VITE_API_URL=http://localhost:3001

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Step 4: Verify Database Schema

### 4.1 Check Social Tokens Table

The unified `social_tokens` table should already exist. Verify it exists:

1. Go to Supabase Dashboard → **Table Editor**
2. Look for `social_tokens` table
3. Verify it has these columns:
   - `id` (UUID)
   - `user_id` (UUID, FK to auth.users)
   - `provider` (TEXT)
   - `access_token` (TEXT, encrypted)
   - `refresh_token` (TEXT, encrypted)
   - `token_type` (TEXT)
   - `expires_at` (TIMESTAMPTZ)
   - `scope` (TEXT)
   - `provider_user_id` (TEXT)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

### 4.2 Run Migration (If Needed)

If the table doesn't exist, run the migration:

```sql
-- File: ctrl_checks/sql_migrations/21_social_tokens_unified.sql
```

You can run this in Supabase Dashboard → **SQL Editor**.

---

## Step 5: Add GitHub Route Configuration

### 5.1 Update App.tsx

Open `ctrl_checks/src/App.tsx` and add the GitHub callback route:

1. **Import the component** (add to imports at the top):
```typescript
import GitHubAuthCallback from "./pages/auth/github/Callback";
```

2. **Add the route** (add inside `<Routes>`):
```typescript
<Route path="/auth/github/callback" element={<GitHubAuthCallback />} />
```

**Complete route section should look like:**
```typescript
<Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
<Route path="/auth/linkedin/callback" element={<LinkedInAuthCallback />} />
<Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
<Route path="/auth/github/callback" element={<GitHubAuthCallback />} />
```

### 5.2 Verify Callback Component Exists

The callback component should already exist at:
- `ctrl_checks/src/pages/auth/github/Callback.tsx`

If it doesn't exist, create it using the template from the Facebook callback handler.

---

## Step 6: Create Connection Component

### 6.1 Option A: Add to Existing Connections Panel

If you have a `ConnectionsPanel.tsx` or similar component, add GitHub connection there.

### 6.2 Option B: Create GitHub Connection Button

Create a simple connection button component or add to your settings page:

**Example function to trigger GitHub OAuth:**

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const handleConnectGitHub = async () => {
  const { toast } = useToast();
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/github/callback`,
        scopes: 'repo user read:org',
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  } catch (err) {
    console.error('Error connecting GitHub:', err);
    toast({
      title: 'Error',
      description: 'Failed to initiate GitHub connection',
      variant: 'destructive',
    });
  }
};
```

**Example button component:**

```typescript
import { Button } from '@/components/ui/button';

<Button
  onClick={handleConnectGitHub}
  variant="outline"
  className="w-full"
>
  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
  Connect GitHub
</Button>
```

### 6.3 Check Connection Status

To check if GitHub is connected, query the `social_tokens` table:

```typescript
import { supabase } from '@/integrations/supabase/client';

const checkGitHubConnection = async () => {
  const { data, error } = await supabase
    .from('social_tokens')
    .select('*')
    .eq('provider', 'github')
    .single();

  return !error && data !== null;
};
```

**Example: Display connection status:**

```typescript
const [isConnected, setIsConnected] = useState(false);

useEffect(() => {
  const checkConnection = async () => {
    const connected = await checkGitHubConnection();
    setIsConnected(connected);
  };
  checkConnection();
}, []);

// In your component:
{isConnected ? (
  <div className="text-green-600">✓ GitHub Connected</div>
) : (
  <Button onClick={handleConnectGitHub}>Connect GitHub</Button>
)}
```

---

## Step 7: Test the Integration

### 7.1 Test OAuth Flow

1. **Start your application:**
   ```bash
   # Frontend
   cd ctrl_checks
   npm run dev

   # Backend (if separate)
   cd worker
   npm run dev
   ```

2. **Click "Connect GitHub" button**

3. **You should be redirected to GitHub:**
   - GitHub authorization page appears
   - You'll see permission request screen
   - Shows requested scopes: `repo`, `user`, `read:org`
   - Click **"Authorize"** or **"Authorize CtrlChecks"**

4. **You should be redirected back:**
   - URL: `http://localhost:5173/auth/github/callback`
   - Loading screen appears
   - Success message shows: "GitHub connected successfully!"
   - Redirects to `/workflows`

### 7.2 Verify Token Storage

1. **Check Supabase Dashboard:**
   - Go to **"Table Editor"**
   - Open `social_tokens` table
   - Find row with `provider = 'github'`
   - Verify token is encrypted (should look like: `iv:tag:encrypted_data`)
   - Verify `user_id` matches your user ID
   - Verify `scope` contains `repo,user,read:org`

2. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Check for any errors
   - Verify success messages
   - Look for: "Got GitHub tokens. Saving to database via backend API..."

### 7.3 Test Token Retrieval

You can test if the token is accessible:

```typescript
// In your browser console or component
const { data } = await supabase
  .from('social_tokens')
  .select('*')
  .eq('provider', 'github')
  .single();

console.log('GitHub token exists:', !!data);
console.log('Token scope:', data?.scope);
```

### 7.4 Test GitHub API Access

Test that the token works with GitHub API:

```typescript
// Test GitHub API call
const testGitHubConnection = async () => {
  const { data: tokenData } = await supabase
    .from('social_tokens')
    .select('access_token')
    .eq('provider', 'github')
    .single();

  if (!tokenData) {
    console.error('No GitHub token found');
    return;
  }

  // Note: In production, tokens are encrypted and should be decrypted on backend
  // This is just for testing - use backend API in production
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (response.ok) {
    const userData = await response.json();
    console.log('GitHub user:', userData.login);
  } else {
    console.error('GitHub API error:', response.status);
  }
};
```

---

## Step 8: Using GitHub in Workflows

### 8.1 GitHub Node Configuration

Once connected, you can use GitHub nodes in your workflows:

**Example Workflow Node - Create Issue:**
```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",
    "owner": "your-username",
    "repo": "your-repo",
    "title": "Bug Report from Workflow",
    "body": "This issue was created automatically by CtrlChecks workflow",
    "labels": ["bug", "automated"]
  }
}
```

**Example Workflow Node - Create Repository:**
```json
{
  "type": "github",
  "config": {
    "operation": "create_repo",
    "name": "my-new-repo",
    "description": "Repository created by workflow",
    "private": false
  }
}
```

**Example Workflow Node - Get User Info:**
```json
{
  "type": "github",
  "config": {
    "operation": "get_user"
  }
}
```

### 8.2 Available Operations

1. **Post GitHub Issue:**
   - Operation: `post_issue` or `create_issue`
   - Required: `owner`, `repo`, `title`
   - Optional: `body`, `labels` (array)

2. **Create Repository:**
   - Operation: `create_repo` or `create_repository`
   - Required: `name`
   - Optional: `description`, `private` (boolean)

3. **Get User Info:**
   - Operation: `get_user` or `get_profile`
   - Returns: user ID, login, name, email, avatar, bio, etc.

### 8.3 Using Template Variables

You can use template variables in workflow nodes:

```json
{
  "type": "github",
  "config": {
    "operation": "post_issue",
    "owner": "{{input.repo_owner}}",
    "repo": "{{input.repo_name}}",
    "title": "{{input.issue_title}}",
    "body": "{{input.issue_body}}"
  }
}
```

### 8.4 Example Complete Workflow JSON

```json
{
  "name": "GitHub Issue Creator",
  "nodes": [
    {
      "id": "github-issue",
      "type": "github",
      "config": {
        "operation": "post_issue",
        "owner": "myusername",
        "repo": "myrepo",
        "title": "Workflow Generated Issue",
        "body": "This issue was created automatically",
        "labels": ["automated"]
      }
    }
  ],
  "edges": []
}
```

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Problem:** GitHub rejects the redirect URI

**Solutions:**
1. Check GitHub OAuth App → Settings
2. Verify redirect URI matches exactly:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
3. No trailing slashes
4. Use `https://` not `http://` for Supabase callback
5. Check Supabase project URL in Settings → API
6. Ensure the callback URL in GitHub matches exactly what's in Supabase

### Issue: "Invalid client credentials"

**Problem:** Client ID or Secret is incorrect

**Solutions:**
1. Double-check credentials in Supabase Dashboard
2. Regenerate Client Secret in GitHub if needed
3. Ensure no extra spaces when copying
4. Verify credentials are saved correctly in Supabase

### Issue: "Token not saved"

**Problem:** Token not appearing in database

**Solutions:**
1. Check backend API endpoint: `/api/social-tokens`
2. Verify frontend callback handler calls the API
3. Check browser console for errors
4. Verify Supabase session token is valid
5. Check backend logs for errors
6. Verify `ENCRYPTION_KEY` is set in backend environment

### Issue: "Insufficient scopes"

**Problem:** Required permissions not granted

**Solutions:**
1. Check requested scopes in Supabase configuration
2. Verify scopes match what's requested in OAuth flow
3. Re-authenticate to request new permissions
4. Ensure `repo` scope is requested (required for creating repos/issues)

### Issue: "Cannot create repository"

**Problem:** Repository creation fails

**Solutions:**
1. Ensure `repo` scope is granted
2. Check repository name is valid (no spaces, special chars)
3. Verify user has permission to create repos
4. Check GitHub API rate limits (5000 requests/hour for authenticated users)

### Issue: "Cannot create issue"

**Problem:** Issue creation fails

**Solutions:**
1. Ensure `repo` scope is granted
2. Verify `owner` and `repo` are correct
3. Check user has write access to the repository
4. Verify repository exists and is accessible

### Issue: "Provider not enabled"

**Problem:** GitHub provider not enabled in Supabase

**Solutions:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Find GitHub provider
3. Toggle it to **"Enabled"**
4. Save configuration
5. Try connecting again

### Debug Checklist

- [ ] GitHub OAuth App created and configured
- [ ] Client ID and Client Secret copied correctly
- [ ] Redirect URI configured correctly in GitHub
- [ ] Supabase GitHub provider enabled
- [ ] Supabase redirect URLs configured
- [ ] Environment variables set (if needed)
- [ ] Callback component exists (`github/Callback.tsx`)
- [ ] Route added to App.tsx
- [ ] Database migration run (`21_social_tokens_unified.sql`)
- [ ] Encryption key set (for production)
- [ ] Test OAuth flow end-to-end
- [ ] Verify token saved in database
- [ ] Test GitHub API operations

---

## Advanced Configuration

### Custom Scopes

You can request additional GitHub scopes if needed:

**Common Scopes:**
- `repo` - Full control of private repositories
- `repo:status` - Commit status access
- `repo_deployment` - Deployment status access
- `public_repo` - Access public repositories only
- `user` - Read user profile data
- `user:email` - Read user email addresses
- `user:follow` - Follow/unfollow users
- `read:org` - Read organization membership
- `write:org` - Write organization membership
- `admin:org` - Full control of organization

**Update Scopes:**
1. Update scopes in Supabase Dashboard → Authentication → Providers → GitHub
2. Update scopes in OAuth initiation:
   ```typescript
   await supabase.auth.signInWithOAuth({
     provider: 'github',
     options: {
       redirectTo: `${window.location.origin}/auth/github/callback`,
       scopes: 'repo user read:org write:org', // Add more scopes
     },
   });
   ```

### Organization Access

To access organization repositories:

1. Request `read:org` or `write:org` scopes
2. User must be a member of the organization
3. Organization may require approval for third-party access
4. Use organization name as `owner` in API calls:
   ```json
   {
     "operation": "post_issue",
     "owner": "my-organization",
     "repo": "org-repo"
   }
   ```

### Rate Limiting

GitHub API has rate limits:

- **Authenticated requests:** 5,000 requests/hour
- **Unauthenticated requests:** 60 requests/hour

The service layer includes automatic retry logic with exponential backoff for rate limit errors (429).

### Token Refresh

GitHub OAuth tokens don't expire, but they can be revoked:

1. User can revoke access in GitHub Settings → Applications
2. If token is revoked, user needs to reconnect
3. Check token validity before operations
4. Handle 401 errors gracefully

---

## Quick Reference

### GitHub OAuth App Settings

**Redirect URI:**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
```

**Required Scopes:**
```
repo,user,read:org
```

### Supabase Configuration

**Provider:** GitHub
**Client ID:** Your GitHub Client ID
**Client Secret:** Your GitHub Client Secret
**Scopes:** `repo,user,read:org`

### Frontend OAuth Initiation

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/github/callback`,
    scopes: 'repo user read:org',
  },
});
```

### Backend API Endpoint

```
POST /api/social-tokens
Authorization: Bearer <supabase_session_token>
Content-Type: application/json

{
  "provider": "github",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "...",
  "scope": "repo,user,read:org",
  "provider_user_id": "..."
}
```

### GitHub API Base URL

```
https://api.github.com
```

### Common GitHub API Endpoints

- **User Info:** `GET /user`
- **Create Issue:** `POST /repos/{owner}/{repo}/issues`
- **Create Repo:** `POST /user/repos`
- **List Repos:** `GET /user/repos`

---

## Next Steps

After completing GitHub integration:

1. ✅ Test OAuth flow end-to-end
2. ✅ Verify tokens are saved and encrypted
3. ✅ Test creating GitHub issues from workflow
4. ✅ Test creating repositories
5. ✅ Test getting user info
6. ✅ Add connection status indicator to UI
7. ✅ Add disconnect functionality
8. ✅ Monitor for errors in production
9. ✅ Set up error alerts
10. ✅ Document workflow node usage

---

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Social Media Integration Guide](./SOCIAL_MEDIA_INTEGRATION.md)
- [Supabase OAuth Setup Guide](./SUPABASE_OAUTH_SETUP_GUIDE.md)

---

## Support

If you encounter issues not covered in this guide:

1. **Check Supabase Auth Logs:** Dashboard → Logs → Auth Logs
2. **Check GitHub OAuth App Logs:** Settings → Developer settings → OAuth Apps → Your app
3. **Check browser console** for frontend errors
4. **Check backend logs** for API errors
5. **Verify all configuration steps** were completed correctly
6. **Review GitHub API documentation** for specific error codes

---

**Congratulations!** You've successfully integrated GitHub OAuth into your CtrlChecks application! 🎉
