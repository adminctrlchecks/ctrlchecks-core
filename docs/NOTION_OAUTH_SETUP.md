# Notion OAuth Setup Guide

This guide explains how to set up OAuth for Notion integration in CtrlChecks.

## Step 1: Create a Notion OAuth Integration

1. **Go to Notion's Integration Portal:**
   - Visit: https://www.notion.so/my-integrations
   - Or navigate: Notion → Settings & Members → Connections → "Develop or manage integrations" → "New integration"

2. **Create OAuth Integration (NOT Internal Integration):**
   - Click **"Create new integration"**
   - **IMPORTANT:** Select **"Public integration"** or **"OAuth integration"** (NOT "Internal integration")
   - Internal integrations use API tokens, not OAuth
   - OAuth integrations allow users to connect their own Notion accounts

3. **Fill in Integration Details:**
   - **Name:** e.g., "CtrlChecks Workflow Automation"
   - **Logo:** Upload your app logo (optional)
   - **Associated workspace:** Select your workspace
   - **Integration type:** Select "Public" or "OAuth"
   - **OAuth redirect URI:** 
     - For development: `http://localhost:3001/api/oauth/notion/callback`
     - For production: `https://yourdomain.com/api/oauth/notion/callback`
   - **Scopes/Permissions:** Select the permissions you need:
     - `read` - Read content
     - `update` - Update content
     - `insert` - Insert content
     - `delete` - Delete content

4. **Save and Get Credentials:**
   - After creating, you'll see:
     - **OAuth Client ID** (starts with something like `abc123...`)
     - **OAuth Client Secret** (starts with `secret_...`)
   - **Copy both of these values** - you'll need them for the next step

## Step 2: Configure Environment Variables

Add these to your backend `.env` file:

```bash
# Notion OAuth Credentials
NOTION_OAUTH_CLIENT_ID=your_oauth_client_id_here
NOTION_OAUTH_CLIENT_SECRET=your_oauth_client_secret_here
```

**Location of .env file:**
- Backend: `worker/.env`
- Make sure this file is in your `.gitignore` (never commit secrets!)

## Step 3: Update Redirect URI in Notion

After setting up your backend, make sure the redirect URI in Notion matches:

- **Development:** `http://localhost:3001/api/oauth/notion/callback`
- **Production:** `https://your-production-domain.com/api/oauth/notion/callback`

You can update this in your Notion integration settings at any time.

## Step 4: Test the Connection

1. Start your backend server:
   ```bash
   cd worker
   npm run dev
   ```

2. In the frontend, click the **"Connections"** button in the header
3. Click **"Connect"** next to Notion
4. You should be redirected to Notion's authorization page
5. Authorize the connection
6. You'll be redirected back and the connection should be saved

## Troubleshooting

### "OAuth Client ID not configured"
- Make sure `NOTION_OAUTH_CLIENT_ID` is set in your `.env` file
- Restart your backend server after adding environment variables

### "Invalid redirect_uri"
- Check that the redirect URI in Notion matches exactly what's in your code
- Make sure there are no trailing slashes or extra characters
- The redirect URI must be HTTPS in production

### "Failed to exchange code for token"
- Verify `NOTION_OAUTH_CLIENT_SECRET` is correct
- Make sure you're using OAuth credentials, not an internal integration token
- Check that the authorization code hasn't expired (codes expire quickly)

### Can't find "OAuth integration" option
- Not all Notion workspaces have OAuth integration available
- You may need to upgrade your Notion plan
- Alternatively, you can use "Internal Integration" and provide the API token manually in the node configuration

## Alternative: Using Internal Integration (Manual Token)

If OAuth is not available, you can use an Internal Integration:

1. Go to https://www.notion.so/my-integrations
2. Create an **"Internal integration"**
3. Copy the **API token** (starts with `secret_...`)
4. In your workflow, configure the Notion node and paste the token in the "API Token" field
5. This token will work for all operations, but users need to manually enter it

## Important Notes

- **OAuth vs Internal Integration:**
  - **OAuth:** Users connect their own Notion accounts (recommended)
  - **Internal Integration:** Single token for all users (simpler but less secure)

- **Token Storage:**
  - OAuth tokens are stored securely in Supabase with RLS policies
  - Each user has their own token
  - Tokens are automatically used when available

- **Permissions:**
  - Make sure your integration has the right permissions for the operations you need
  - You can update permissions in Notion's integration settings

## Need Help?

If you're still having trouble:
1. Check the browser console for errors
2. Check the backend logs for OAuth errors
3. Verify your environment variables are loaded correctly
4. Make sure your backend server is running and accessible
