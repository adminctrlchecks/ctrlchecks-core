# LinkedIn Authentication Integration Guide

This guide walks you through setting up LinkedIn OAuth authentication in CtrlChecks so users can connect their LinkedIn accounts and use them in workflows.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [LinkedIn Developer App Setup](#linkedin-developer-app-setup)
3. [Environment Configuration](#environment-configuration)
4. [User Connection Flow](#user-connection-flow)
5. [Using LinkedIn in Workflows](#using-linkedin-in-workflows)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A LinkedIn account (personal or company)
- ✅ Access to the [LinkedIn Developer Portal](https://www.linkedin.com/developers)
- ✅ Admin access to your CtrlChecks backend environment variables
- ✅ Access to your Supabase project (for OAuth configuration)

---

## LinkedIn Developer App Setup

### Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in the required information:
   - **App name**: `CtrlChecks` (or your preferred name)
   - **LinkedIn Page**: Select or create a LinkedIn company page
   - **Privacy policy URL**: Your privacy policy URL (required)
   - **App logo**: Upload a logo (optional but recommended)
4. Click **"Create app"**

### Step 2: Configure OAuth 2.0 Redirect URLs

1. In your LinkedIn app, go to the **"Auth"** tab
2. Under **"OAuth 2.0 settings"**, add your redirect URLs:

   **For Production:**
   ```
   https://your-domain.com/auth/linkedin/callback
   ```

   **For Local Development:**
   ```
   http://localhost:5173/auth/linkedin/callback
   http://localhost:8080/auth/linkedin/callback
   ```

3. Click **"Update"** to save

### Step 3: Verify Required Products

1. In the **"Auth"** tab, scroll to **"Products"**
2. You should see these products (they're typically available by default):
   - ✅ **Sign In with LinkedIn using OpenID Connect** (Default Tier) - Used for authentication
   - ✅ **Share on LinkedIn** (Default Tier) - Used for posting content

3. **Note:** If you don't see "Share on LinkedIn", it should be available by default. The actual permissions (scopes) are requested during the OAuth authorization flow, not through product selection.

4. The required scopes that will be requested during OAuth:
   - `w_member_social` - Post on behalf of authenticated member (provided by "Share on LinkedIn")
   - `openid` - OIDC sign-in
   - `profile` - Read basic profile information
   - `email` - Read primary email address

### Step 4: Get Your Credentials

1. In the **"Auth"** tab, find **"Application credentials"**
2. Copy your:
   - **Client ID** (you'll need this)
   - **Client Secret** (keep this secure - backend only!)

⚠️ **Important**: Never expose your Client Secret in frontend code or public repositories.

---

## Environment Configuration

### Backend (Worker) Configuration

Add these environment variables to your worker backend (`.env` file or your deployment platform):

```bash
# LinkedIn OAuth Credentials (from LinkedIn Developer Portal)
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
```

**Where to add:**
- Local development: `worker/.env`
- Production: Your deployment platform's environment variables (Vercel, Railway, etc.)

### Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **LinkedIn** in the list
4. Enable LinkedIn provider
5. Enter your:
   - **Client ID**: From LinkedIn Developer Portal
   - **Client Secret**: From LinkedIn Developer Portal
6. Add authorized redirect URLs:
   ```
   https://your-domain.com/auth/linkedin/callback
   http://localhost:5173/auth/linkedin/callback
   ```
7. Click **"Save"**

---

## User Connection Flow

Once configured, users can connect their LinkedIn accounts in just a few clicks:

### Step 1: Access Connections UI

1. Log into CtrlChecks
2. Look for the **"Connections"** button in the header/navigation
3. Click to open the connections panel

### Step 2: Connect LinkedIn

1. In the connections panel, find the **LinkedIn** section
2. Click the **"Connect"** button
3. You'll be redirected to LinkedIn's authorization page
4. Review the permissions being requested:
   - Post on your behalf
   - Read your basic profile
   - Read your email address
5. Click **"Allow"** to grant permissions

### Step 3: Return to CtrlChecks

1. After authorizing, LinkedIn redirects you back to CtrlChecks
2. The callback page processes your authorization
3. You'll see a success message: **"LinkedIn connected successfully!"**
4. You're automatically redirected to the workflows page
5. The **Connections** panel now shows **"LinkedIn Connected"** ✅

### What Happens Behind the Scenes

- Your LinkedIn access token is securely stored in the database
- A refresh token is saved for automatic token renewal
- Your connection status is synced across the app
- You can now use LinkedIn nodes in workflows

---

## Using LinkedIn in Workflows

### Adding a LinkedIn Node

1. Create or edit a workflow
2. Add a **LinkedIn** node from the node library
3. Configure the node:

   **Required Fields:**
   - **Text**: The content you want to post
   - **Person URN**: Your LinkedIn member ID (see below)

   **Optional Fields:**
   - **Visibility**: `PUBLIC` (default) or `CONNECTIONS`
   - **Dry Run**: Enable to test without actually posting

### Finding Your Person URN

Your Person URN is your LinkedIn member ID. To find it:

1. Go to your LinkedIn profile
2. View the page source (right-click → "View Page Source" or `Ctrl+U`)
3. Search for `"urn:li:person:"`
4. Copy the ID that follows (e.g., if you see `urn:li:person:abc123`, your Person URN is `abc123`)

Alternatively, use the test endpoint (see below) which returns your profile ID.

### Example Workflow Configuration

```json
{
  "type": "linkedin",
  "config": {
    "text": "🚀 Excited to share our latest update! {{$json.message}}",
    "personUrn": "your_person_urn_here",
    "visibility": "PUBLIC",
    "dryRun": false
  }
}
```

### Using Template Variables

You can use dynamic content in your posts:

- `{{$json.fieldName}}` - Data from previous nodes
- `{{input.content}}` - Input data to the workflow
- `{{$now}}` - Current timestamp

Example:
```
Today's update: {{$json.title}}

Read more: {{$json.url}}
```

---

## Testing & Verification

### Test Your Connection

Use the built-in test endpoint to verify your LinkedIn connection:

**Via API:**
```bash
curl -X POST https://your-backend.com/api/connections/linkedin/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "profile": {
    "id": "your_linkedin_id",
    "localizedFirstName": "John",
    "localizedLastName": "Doe",
    "localizedHeadline": "Software Engineer"
  }
}
```

### Check Connection Status

**Via API:**
```bash
curl https://your-backend.com/api/connections/linkedin/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "metadata": {
    "scope": "openid profile email w_member_social",
    "expiresAt": "2024-03-15T10:30:00Z",
    "expiresSoon": false
  }
}
```

### Test a Post (Dry Run)

1. Add a LinkedIn node to a workflow
2. Set `dryRun: true` in the node configuration
3. Execute the workflow
4. Check the output - you'll see a `simulatedRequest` object instead of an actual post

---

## Troubleshooting

### ❌ "LinkedIn authorization failed" (401/403)

**Possible causes:**
- Missing or incorrect scopes
- User hasn't granted permissions
- Token expired

**Solutions:**
1. Verify scopes in LinkedIn Developer Portal match: `openid`, `profile`, `email`, `w_member_social`
2. Ask user to reconnect via Connections UI
3. Check token expiry: `GET /api/connections/linkedin/status`

### ❌ "Access token not found"

**Possible causes:**
- User hasn't connected LinkedIn account
- Token was deleted or expired

**Solutions:**
1. Guide user to connect LinkedIn in Connections UI
2. Verify `linkedin_oauth_tokens` table has entry for user
3. Check workflow owner vs current user permissions

### ❌ "Person URN is required"

**Possible causes:**
- `personUrn` not set in node configuration
- Invalid URN format

**Solutions:**
1. Add `personUrn` to LinkedIn node config
2. Use test endpoint to get user's LinkedIn ID
3. Ensure URN is just the ID (not `urn:li:person:...`)

### ❌ Token refresh failing

**Possible causes:**
- `LINKEDIN_CLIENT_ID` or `LINKEDIN_CLIENT_SECRET` not configured
- Refresh token expired (365 days)
- LinkedIn revoked access

**Solutions:**
1. Verify environment variables are set in backend
2. Check refresh token expiry in database
3. User may need to reconnect if refresh token expired

### ❌ Redirect URL mismatch

**Error:** "redirect_uri_mismatch" from LinkedIn

**Solutions:**
1. Verify redirect URL in LinkedIn Developer Portal matches exactly:
   - Production: `https://your-domain.com/auth/linkedin/callback`
   - Local: `http://localhost:5173/auth/linkedin/callback`
2. Check Supabase LinkedIn provider redirect URLs
3. Ensure no trailing slashes or protocol mismatches

### ❌ RLS 406 errors from Supabase

**Error:** PostgREST returns 406 when querying `linkedin_oauth_tokens`

**Solutions:**
- This is handled automatically by the RLS policy fix
- If you see this, ensure migration `19_fix_linkedin_oauth_tokens_rls_406.sql` has run
- The policy now allows empty result sets

---

## Security Best Practices

✅ **Do:**
- Store Client Secret only in backend environment variables
- Use HTTPS for all OAuth redirects
- Request minimal scopes (only what you need)
- Log connection events (without tokens)
- Implement token refresh before expiry

❌ **Don't:**
- Expose Client Secret in frontend code
- Store tokens in localStorage or cookies
- Log raw access/refresh tokens
- Request unnecessary scopes
- Skip token refresh logic

---

## Next Steps

Once LinkedIn authentication is set up:

1. ✅ Test the connection flow end-to-end
2. ✅ Create a test workflow with a LinkedIn node
3. ✅ Verify posts are working (start with dry-run)
4. ✅ Monitor token refresh behavior
5. ✅ Set up alerts for connection failures

---

## Additional Resources

- [LinkedIn Developer Documentation](https://learn.microsoft.com/en-us/linkedin/)
- [LinkedIn OAuth 2.0 Guide](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [CtrlChecks LinkedIn Integration Docs](./integrations/linkedin.md) (Technical details)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs for detailed error messages
3. Verify all environment variables are set correctly
4. Test with the `/api/connections/linkedin/test` endpoint
5. Check LinkedIn Developer Portal for app status/restrictions

---

**Last Updated:** 2024-01-31
