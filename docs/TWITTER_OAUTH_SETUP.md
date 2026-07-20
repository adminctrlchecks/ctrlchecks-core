# Twitter/X OAuth Setup Guide

This guide explains how to set up Twitter OAuth 2.0 integration for the CtrlChecks platform.

## Overview

The Twitter node uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication. Users connect their Twitter accounts through the Connections panel, and the node automatically uses their OAuth tokens.

## Prerequisites

1. A Twitter Developer Account
2. A Twitter App created in the Developer Portal
3. OAuth 2.0 enabled for your app

## Step 1: Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. Navigate to **Projects & Apps** → **Your App**
4. If you don't have an app, click **Create App** or **+ Create Project**

## Step 2: Configure OAuth 2.0 Settings

1. In your app settings, go to **User authentication settings**
2. Click **Set up** or **Edit** for OAuth 2.0
3. Configure the following:

   - **App permissions**: 
     - ✅ Read tweets
     - ✅ Write tweets
     - ✅ Read users
     - ✅ Offline access (for refresh tokens)
   
   - **Type of App**: Web App, Automated App or Bot
   
   - **Callback URI / Redirect URL**: 
     ```
     http://localhost:8080/auth/twitter/callback
     ```
     (Replace `8080` with your frontend port if different)
   
   - **Website URL**: Your application URL
     ```
     http://localhost:8080
     ```
   
   - **Privacy Policy URL**: 
     ```
     http://localhost:8080/privacy
     ```
   
   - **Terms of Service URL**: 
     ```
     http://localhost:8080/terms
     ```

4. Click **Save**

## Step 3: Get OAuth Credentials

1. In your app settings, go to **Keys and tokens**
2. Under **OAuth 2.0 Client ID and Client Secret**, you'll find:
   - **Client ID** (OAuth 2.0 Client ID)
   - **Client Secret** (OAuth 2.0 Client Secret)

3. Copy both values - you'll need them for the backend configuration

## Step 4: Configure Backend Environment Variables

Add the following to your backend `.env` file (in the `worker` directory):

```env
TWITTER_OAUTH_CLIENT_ID=your_client_id_here
TWITTER_OAUTH_CLIENT_SECRET=your_client_secret_here
```

**Important**: 
- Never commit these credentials to version control
- Use environment variables or a secure secrets manager in production
- The Client Secret should be kept confidential

## Step 5: Apply Database Migration

Run the Twitter OAuth tokens migration in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `ctrl_checks/supabase/migrations/20250202000000_add_twitter_oauth_tokens.sql`
4. Paste and execute the migration
5. Verify the `twitter_oauth_tokens` table was created

## Step 6: Update Redirect URLs for Production

When deploying to production, update the redirect URLs in:

1. **Twitter App Settings**:
   - Change callback URI to: `https://yourdomain.com/auth/twitter/callback`
   - Update website URL to: `https://yourdomain.com`

2. **Backend Environment Variables** (if needed):
   - Ensure `VITE_API_URL` or backend URL is correctly configured

## Step 7: Test the Integration

1. **Start your development servers**:
   ```bash
   # Backend
   cd worker
   npm run dev
   
   # Frontend
   cd ctrl_checks
   npm run dev
   ```

2. **Connect Twitter Account**:
   - Open your application
   - Click the **Connections** button in the header
   - Click **Connect** next to Twitter/X
   - Authorize the application on Twitter
   - You should be redirected back and see "Connected"

3. **Test the Twitter Node**:
   - Create a new workflow
   - Add a Twitter node
   - Select resource: `tweet`, operation: `create`
   - Enter tweet text
   - Execute the workflow
   - Verify the tweet was posted

## Troubleshooting

### "OAuth connection required" Error

- **Cause**: No Twitter account connected
- **Solution**: Connect your Twitter account in the Connections panel

### "Invalid redirect_uri" Error

- **Cause**: Redirect URI mismatch between Twitter app settings and your application
- **Solution**: 
  1. Check Twitter app settings match your callback URL exactly
  2. Ensure the URL is added to allowed redirect URIs
  3. Verify the port number matches (e.g., 8080, 5173, 3000)

### "Invalid client" Error

- **Cause**: Incorrect Client ID or Client Secret
- **Solution**: 
  1. Verify environment variables are set correctly
  2. Restart the backend server after changing `.env`
  3. Check for typos or extra spaces in credentials

### Token Expired

- **Cause**: Access token expired and refresh failed
- **Solution**: 
  1. Disconnect and reconnect Twitter account
  2. Ensure "Offline access" permission is enabled in Twitter app settings

## Security Notes

- OAuth tokens are stored securely in Supabase with Row Level Security (RLS)
- Each user can only access their own tokens
- Tokens are automatically refreshed when possible
- Never expose Client Secret in frontend code or logs

## API Scopes Required

The Twitter node requires the following OAuth scopes:
- `tweet.read` - Read tweets and timelines
- `tweet.write` - Create, delete, like, retweet tweets
- `users.read` - Read user profiles and information
- `offline.access` - Refresh tokens for long-term access

These scopes are automatically requested during the OAuth flow.

## Next Steps

- Test various Twitter operations (create tweet, search, follow users, etc.)
- Create workflows that automate Twitter interactions
- Use template variables to dynamically populate tweet content
- Explore the comprehensive Twitter API v2 features available in the node
