# LinkedIn Integration with Supabase - Complete Guide

This guide explains how to integrate LinkedIn with Supabase in your CtrlChecks application, allowing users to connect their LinkedIn accounts and perform operations through Node.js workflows.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [How It Works](#how-it-works)
5. [Available Operations](#available-operations)
6. [Using LinkedIn in Workflows](#using-linkedin-in-workflows)
7. [API Endpoints](#api-endpoints)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The LinkedIn integration uses **Supabase OAuth** to securely authenticate users and store their LinkedIn access tokens. This allows users to:

- ✅ Connect their LinkedIn account via OAuth
- ✅ Automatically refresh expired tokens
- ✅ Use LinkedIn operations in workflow nodes
- ✅ Perform multiple LinkedIn API operations (post, get profile, get posts, delete posts)

---

## Architecture

```
┌─────────────┐
│   Frontend  │  React + TypeScript
│ (ctrl_checks)│
└──────┬──────┘
       │
       │ 1. User clicks "Connect LinkedIn"
       │ 2. Supabase OAuth redirects to LinkedIn
       │
       ▼
┌─────────────┐
│  Supabase   │  OAuth Provider
│   Auth      │  - Handles OAuth flow
│             │  - Stores tokens securely
└──────┬──────┘
       │
       │ 3. LinkedIn redirects back with tokens
       │ 4. Tokens stored in linkedin_oauth_tokens table
       │
       ▼
┌─────────────┐
│   Supabase  │  PostgreSQL Database
│  Database   │  - linkedin_oauth_tokens table
│             │  - RLS policies for security
└──────┬──────┘
       │
       │ 5. Workflow execution requests token
       │
       ▼
┌─────────────┐
│   Worker    │  Node.js Backend
│  Service    │  - getLinkedInAccessToken()
│             │  - Token refresh logic
│             │  - LinkedIn API operations
└──────┬──────┘
       │
       │ 6. Makes API calls to LinkedIn
       │
       ▼
┌─────────────┐
│  LinkedIn   │  LinkedIn API
│    API      │  - Posts, Profiles, etc.
└─────────────┘
```

---

## Setup Instructions

### Step 1: LinkedIn Developer App Setup

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in required information:
   - **App name**: Your app name
   - **LinkedIn Page**: Select or create a LinkedIn company page
   - **Privacy policy URL**: Your privacy policy URL (required)
4. Click **"Create app"**

### Step 2: Configure OAuth Redirect URLs

1. In your LinkedIn app, go to the **"Auth"** tab
2. Under **"OAuth 2.0 settings"**, add redirect URLs:

   **For Production:**
   ```
   https://your-domain.com/auth/linkedin/callback
   ```

   **For Local Development:**
   ```
   http://localhost:5173/auth/linkedin/callback
   ```

3. Click **"Update"** to save

### Step 3: Verify Required Products

1. In the **"Auth"** tab, scroll to **"Products"**
2. You should see these products (they're available by default - no approval needed):
   - ✅ **Sign In with LinkedIn using OpenID Connect** (Default Tier) - Used for authentication
   - ✅ **Share on LinkedIn** (Default Tier) - Used for posting content

3. **Important:** These are default tier products, so they should already be available. You don't need to "request access" - they're enabled automatically.

4. The required scopes (requested during OAuth, not through products):
   - `openid` - OIDC sign-in (from "Sign In with LinkedIn using OpenID Connect")
   - `profile` - Basic profile information (from "Sign In with LinkedIn using OpenID Connect")
   - `email` - Email address (from "Sign In with LinkedIn using OpenID Connect")
   - `w_member_social` - Post on behalf of the member (from "Share on LinkedIn")

**Note:** The scopes are automatically requested when users connect via OAuth. The products just enable access to those APIs. See [LinkedIn Products Clarification](./LINKEDIN_PRODUCTS_CLARIFICATION.md) for more details.

### Step 4: Configure Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication → Providers**
4. Find **LinkedIn** in the providers list
5. **Enable the LinkedIn provider** (toggle switch - this is critical!)
6. Enter your **Client ID** (OAuth 2.0 Client ID) from LinkedIn
7. Enter your **Client Secret** (OAuth 2.0 Client Secret) from LinkedIn
8. Add redirect URLs (must match LinkedIn exactly):
   ```
   http://localhost:5173/auth/linkedin/callback
   http://localhost:8080/auth/linkedin/callback
   ```
9. **Save the configuration**

**⚠️ Important:** If you see the error "Unsupported provider: provider is not enabled", it means the LinkedIn provider toggle is OFF. Make sure to enable it!

See [Troubleshooting Guide](./LINKEDIN_SUPABASE_TROUBLESHOOTING.md) for detailed help.

### Step 5: Backend Environment Variables

Add to `worker/.env`:

```bash
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

**Important:** These are used exclusively on the backend for secure token refreshes.

### Step 6: Database Schema

The database table `linkedin_oauth_tokens` should already exist. If not, run the migration:

```sql
-- See: ctrl_checks/sql_migrations/04_linkedin_oauth_tokens.sql
```

The table structure:
- `user_id` (FK to auth.users)
- `access_token` (encrypted)
- `refresh_token` (encrypted)
- `expires_at` (timestamp)
- `scope` (text)
- `created_at`, `updated_at` (timestamps)

---

## How It Works

### 1. User Connection Flow

1. User clicks **"Connect LinkedIn"** in the Connections panel
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc' })`
3. User is redirected to LinkedIn authorization page
4. User authorizes the application
5. LinkedIn redirects back to `/auth/linkedin/callback`
6. The callback page:
   - Extracts `provider_token` and `provider_refresh_token` from session
   - Saves tokens to `linkedin_oauth_tokens` table
   - Mirrors credential to `user_credentials` vault
7. User is redirected back to workflows

### 2. Token Management

The system automatically handles token refresh:

- Tokens are checked before each API call
- If token expires within 5 minutes, it's automatically refreshed
- Refresh uses `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` from backend
- Refreshed tokens are persisted back to the database

### 3. Workflow Execution

When a LinkedIn node executes:

1. Tries to get access token from:
   - Node configuration (`config.accessToken`)
   - Database OAuth tokens (workflow owner or current user)
   - Environment variable (`LINKEDIN_ACCESS_TOKEN`)
2. If token is expired, automatically refreshes it
3. Executes the requested operation
4. Returns results to the workflow

---

## Available Operations

The LinkedIn node supports the following operations:

### 1. Get Profile (`get_profile` or `get_me`)

Retrieves the authenticated user's LinkedIn profile.

**Configuration:**
- `operation`: `"get_profile"` or `"get_me"`
- No additional fields required

**Output:**
```json
{
  "success": true,
  "profile": {
    "id": "urn:li:person:xxxxx",
    "firstName": "John",
    "lastName": "Doe",
    "headline": "Software Engineer",
    "personUrn": "xxxxx"
  }
}
```

### 2. Get Posts (`get_posts`)

Retrieves posts from a LinkedIn profile.

**Configuration:**
- `operation`: `"get_posts"`
- `personUrn`: LinkedIn person URN (optional, auto-fetched if not provided)
- `count`: Number of posts to retrieve (default: 10)

**Output:**
```json
{
  "success": true,
  "posts": [
    {
      "id": "urn:li:ugcPost:xxxxx",
      "text": "Post content...",
      "created": 1705314600000
    }
  ],
  "postCount": 10
}
```

### 3. Create Post (`post` or `create_post`)

Creates a new LinkedIn post.

**Configuration:**
- `operation`: `"post"` or `"create_post"`
- `text`: Post content (required)
- `personUrn`: LinkedIn person URN (optional, auto-fetched if not provided)
- `visibility`: `"PUBLIC"` or `"CONNECTIONS"` (default: `"PUBLIC"`)

**Output:**
```json
{
  "success": true,
  "postId": "urn:li:ugcPost:xxxxx"
}
```

### 4. Delete Post (`delete_post`)

Deletes a LinkedIn post.

**Configuration:**
- `operation`: `"delete_post"`
- `postUrn` or `postId`: URN or ID of the post to delete (required)

**Output:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

## Using LinkedIn in Workflows

### Example 1: Simple Post

```json
{
  "type": "linkedin",
  "config": {
    "operation": "post",
    "text": "Hello from CtrlChecks! 🚀",
    "visibility": "PUBLIC"
  }
}
```

### Example 2: Get Profile and Post

```json
{
  "nodes": [
    {
      "id": "node1",
      "type": "linkedin",
      "config": {
        "operation": "get_profile"
      }
    },
    {
      "id": "node2",
      "type": "linkedin",
      "config": {
        "operation": "post",
        "text": "My profile: {{node1.profile.firstName}} {{node1.profile.lastName}}",
        "visibility": "PUBLIC"
      }
    }
  ]
}
```

### Example 3: Get Recent Posts

```json
{
  "type": "linkedin",
  "config": {
    "operation": "get_posts",
    "count": 5
  }
}
```

### Example 4: Using Expressions

You can use expressions to dynamically set values:

```json
{
  "type": "linkedin",
  "config": {
    "operation": "post",
    "text": "{{input.message}} - Posted at {{$now}}",
    "visibility": "{{input.visibility || 'PUBLIC'}}"
  }
}
```

---

## API Endpoints

The backend provides several endpoints for managing LinkedIn connections:

### 1. Get Connection Status

```http
GET /api/connections/linkedin/status
Authorization: Bearer <supabase_token>
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "metadata": {
    "expiresAt": "2024-01-15T12:00:00Z",
    "expiresSoon": false,
    "scope": "openid profile email w_member_social"
  }
}
```

### 2. Test Connection

```http
POST /api/connections/linkedin/test
Authorization: Bearer <supabase_token>
```

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "profile": {
    "id": "xxxxx",
    "localizedFirstName": "John",
    "localizedLastName": "Doe"
  }
}
```

### 3. Refresh Token

```http
POST /api/connections/linkedin/refresh-now
Authorization: Bearer <supabase_token>
```

**Response:**
```json
{
  "success": true,
  "message": "LinkedIn token refreshed successfully"
}
```

### 4. Disconnect

```http
DELETE /api/connections/linkedin
Authorization: Bearer <supabase_token>
```

**Response:**
```json
{
  "success": true,
  "message": "LinkedIn account disconnected successfully"
}
```

---

## Troubleshooting

### Issue: "Access token not found"

**Solution:**
1. Ensure the user has connected their LinkedIn account in the Connections panel
2. Check that `linkedin_oauth_tokens` table has an entry for the user
3. Verify Supabase OAuth configuration is correct

### Issue: "401/403 Authorization Error"

**Solution:**
1. Check that required scopes are granted: `openid`, `profile`, `email`, `w_member_social`
2. Verify LinkedIn app has the correct permissions
3. User may need to reconnect their LinkedIn account

### Issue: "Token refresh failed"

**Solution:**
1. Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set in backend `.env`
2. Check that the refresh token is still valid
3. User may need to reconnect if refresh token is expired

### Issue: "personUrn is required"

**Solution:**
1. The system will try to auto-fetch `personUrn` from the token
2. If that fails, manually set `personUrn` in the node configuration
3. You can get `personUrn` by running a `get_profile` operation first

### Issue: "Rate limited (429)"

**Solution:**
1. The system automatically retries with backoff
2. Reduce the frequency of API calls
3. Check LinkedIn API rate limits for your app

---

## Security Best Practices

1. **Never log raw tokens** - Only log status and expiry information
2. **Use RLS policies** - Database tables have Row Level Security enabled
3. **Token encryption** - Tokens are stored securely in Supabase
4. **Automatic refresh** - Tokens are refreshed before expiry
5. **Scope minimization** - Only request necessary scopes

---

## Next Steps

- ✅ Test the connection using the status endpoint
- ✅ Create a test workflow with a LinkedIn node
- ✅ Try different operations (get profile, post, get posts)
- ✅ Monitor token refresh behavior
- ✅ Set up production redirect URLs

---

## Additional Resources

- [LinkedIn Quick Start Guide](./LINKEDIN_QUICK_START.md) - 15-minute setup checklist
- [LinkedIn Authentication Guide](./LINKEDIN_AUTHENTICATION_GUIDE.md) - Detailed authentication setup
- [LinkedIn Integration (Technical)](./integrations/linkedin.md) - Technical implementation details
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/) - Official LinkedIn API docs

---

**Ready to use LinkedIn in your workflows!** 🚀

For questions or issues, check the troubleshooting section or review the technical documentation.
