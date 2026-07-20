# Twitter OAuth 2.0 Credentials Setup Guide

Complete step-by-step guide to get your Twitter OAuth Client ID and Client Secret for CtrlChecks integration.

## ⚠️ Important: OAuth 2.0 vs API v1.1 Credentials

**You need OAuth 2.0 Client ID and Client Secret**, NOT Consumer Key/Secret!

- ❌ **Consumer Key / Secret Key** = API v1.1 credentials (not for OAuth 2.0)
- ✅ **OAuth 2.0 Client ID / Client Secret** = What you need for CtrlChecks

If you only see Consumer Key/Secret, you need to configure OAuth 2.0 settings first (see Step 3 below).

## Prerequisites

- A Twitter account
- Access to Twitter Developer Portal

## Step 1: Access Twitter Developer Portal

1. Go to [https://developer.twitter.com/](https://developer.twitter.com/)
2. Sign in with your Twitter account
3. If you don't have a developer account:
   - Click **Sign up** or **Apply for a developer account**
   - Complete the application process (usually approved quickly)
   - Accept the Developer Agreement

## Step 2: Create or Select a Project

1. Once logged in, you'll see the **Developer Portal** dashboard
2. Click on **Projects & Apps** in the left sidebar
3. You'll see your existing projects or an option to create a new one

### Option A: Create New Project (Recommended for first-time setup)

1. Click **+ Create Project** or **Create Project**
2. Fill in the project details:
   - **Project name**: e.g., "CtrlChecks Integration"
   - **Use case**: Select "Making a bot" or "Exploring the API"
   - **Project description**: Brief description of your use case
3. Click **Next**
4. Select **Create a new App** (or use existing if you have one)
5. Fill in app details:
   - **App name**: e.g., "CtrlChecks Workflow Automation"
   - **App description**: Describe what your app does
6. Click **Complete**

### Option B: Use Existing Project

1. Click on your existing project
2. If you don't have an app, click **+ Add App** or **Create App**
3. Fill in app details as above

## Step 3: Configure OAuth 2.0 Settings

1. In your project, click on your **App** (you'll see it listed under the project)
2. Navigate to **User authentication settings** or **Settings** → **User authentication settings**
3. Click **Set up** or **Edit** (if already configured)

### Configure OAuth 2.0:

1. **App permissions**: Select the following:
   - ✅ **Read tweets**
   - ✅ **Write tweets** 
   - ✅ **Read users**
   - ✅ **Offline access** (Important: This enables refresh tokens)

2. **Type of App**: Select one of:
   - **Web App, Automated App or Bot** (Recommended)
   - **Native App** (if building a mobile/desktop app)

3. **App info**:
   - **Callback URI / Redirect URL**: 
     ```
     http://localhost:8080/auth/twitter/callback
     ```
     ⚠️ **Important**: Replace `8080` with your actual frontend port if different
     - For production: `https://yourdomain.com/auth/twitter/callback`
   
   - **Website URL**: 
     ```
     http://localhost:8080
     ```
     - For production: `https://yourdomain.com`

4. **Additional settings**:
   - **Privacy Policy URL**: 
     ```
     http://localhost:8080/privacy
     ```
     - Or use your actual privacy policy page
   
   - **Terms of Service URL**: 
     ```
     http://localhost:8080/terms
     ```
     - Or use your actual terms of service page

5. Click **Save** to apply changes

## Step 4: Get OAuth 2.0 Credentials

1. Still in your app settings, go to **Keys and tokens** tab
2. Scroll down to **OAuth 2.0 Client ID and Client Secret** section
3. You'll see:
   - **Client ID** (OAuth 2.0 Client ID) - This is your `TWITTER_OAUTH_CLIENT_ID`
   - **Client Secret** (OAuth 2.0 Client Secret) - This is your `TWITTER_OAUTH_CLIENT_SECRET`

4. **Important Notes**:
   - The **Client Secret** is hidden by default - click **Show** or **Reveal** to see it
   - ⚠️ **Copy the Client Secret immediately** - you may not be able to see it again
   - If you lose the Client Secret, you'll need to regenerate it (which invalidates the old one)

5. **Copy both values**:
   - Client ID: `your_client_id_here` (usually a long alphanumeric string)
   - Client Secret: `your_client_secret_here` (usually starts with something like `secret_...`)

## Step 5: Add Credentials to Backend

1. Navigate to your backend directory:
   ```bash
   cd worker
   ```

2. Open or create the `.env` file in the `worker` directory

3. Add the following lines:
   ```env
   TWITTER_OAUTH_CLIENT_ID=your_client_id_here
   TWITTER_OAUTH_CLIENT_SECRET=your_client_secret_here
   ```

4. **Replace** `your_client_id_here` and `your_client_secret_here` with the actual values you copied

5. **Example**:
   ```env
   TWITTER_OAUTH_CLIENT_ID=307d872b-594c-80d2-b90d-003713fd0d7f
   TWITTER_OAUTH_CLIENT_SECRET=paste_your_twitter_client_secret_here
   ```

6. **Save** the `.env` file

7. **Restart your backend server** for changes to take effect:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

## Step 6: Verify Configuration

1. **Check redirect URL matches**:
   - In Twitter app settings: `http://localhost:8080/auth/twitter/callback`
   - In your frontend: Should match the port you're using

2. **Test the connection**:
   - Open your application
   - Go to Connections panel
   - Click "Connect" next to Twitter/X
   - You should be redirected to Twitter authorization page
   - After authorizing, you should be redirected back and see "Connected"

## Troubleshooting

### "Invalid client" Error

**Cause**: Incorrect Client ID or Client Secret

**Solution**:
1. Double-check you copied the values correctly (no extra spaces)
2. Verify the values are in the `.env` file
3. Make sure you restarted the backend server after adding them
4. Check that you're using OAuth 2.0 credentials, not API v1.1 keys

### "Invalid redirect_uri" Error

**Cause**: Redirect URI mismatch

**Solution**:
1. Check Twitter app settings - the callback URI must match exactly
2. Verify the port number (8080, 5173, 3000, etc.)
3. Make sure there are no trailing slashes
4. For localhost, use `http://` not `https://`

### "Client Secret not found" Error

**Cause**: Client Secret not set in environment variables

**Solution**:
1. Check `.env` file exists in `worker` directory
2. Verify the variable names are exactly:
   - `TWITTER_OAUTH_CLIENT_ID`
   - `TWITTER_OAUTH_CLIENT_SECRET`
3. Check for typos or extra spaces
4. Restart backend server

### Can't See Client Secret

**Solution**:
1. Click the **"Show"** or **"Reveal"** button next to Client Secret
2. If it's not visible, you may need to regenerate it:
   - Click **"Regenerate"** (this will invalidate the old secret)
   - Copy the new secret immediately
   - Update your `.env` file with the new secret

## Security Best Practices

1. **Never commit `.env` file to version control**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Keep credentials secure**:
   - Don't share Client Secret publicly
   - Don't include it in frontend code
   - Use secure secret management in production (e.g., AWS Secrets Manager, Azure Key Vault)

3. **Rotate credentials periodically**:
   - Regenerate Client Secret if compromised
   - Update all environments when rotating

4. **Use different apps for different environments**:
   - Separate apps for development and production
   - Different redirect URLs for each environment

## Production Setup

When deploying to production:

1. **Update Twitter App Settings**:
   - Change callback URI to: `https://yourdomain.com/auth/twitter/callback`
   - Update website URL to: `https://yourdomain.com`
   - Update privacy policy and terms URLs

2. **Set Environment Variables**:
   - Use your hosting platform's environment variable system
   - Never hardcode credentials in code

3. **Verify HTTPS**:
   - Twitter requires HTTPS for production callbacks
   - Ensure your domain has valid SSL certificate

## Quick Reference

**Where to find credentials**:
- Twitter Developer Portal → Projects & Apps → Your App → Keys and tokens → OAuth 2.0 Client ID and Client Secret

**Environment variables needed**:
```env
TWITTER_OAUTH_CLIENT_ID=your_client_id
TWITTER_OAUTH_CLIENT_SECRET=your_client_secret
```

**Required OAuth Scopes**:
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

**Redirect URI format**:
- Development: `http://localhost:PORT/auth/twitter/callback`
- Production: `https://yourdomain.com/auth/twitter/callback`

## Next Steps

After setting up credentials:

1. ✅ Apply database migration (if not done)
2. ✅ Restart backend server
3. ✅ Connect Twitter account in Connections panel
4. ✅ Test with a simple workflow (create a tweet)
5. ✅ Explore other Twitter operations (search, follow, etc.)

For more details, see `docs/TWITTER_OAUTH_SETUP.md`
