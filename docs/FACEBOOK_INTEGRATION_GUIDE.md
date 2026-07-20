# Facebook Integration Guide - Complete Step-by-Step

This guide will walk you through integrating Facebook OAuth into your CtrlChecks application. Follow each step carefully to ensure a successful integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Facebook App](#step-1-create-facebook-app)
3. [Step 2: Configure Facebook Login](#step-2-configure-facebook-login)
4. [Step 3: Get Facebook Credentials](#step-3-get-facebook-credentials)
5. [Step 4: Configure Supabase OAuth](#step-4-configure-supabase-oauth)
6. [Step 5: Set Environment Variables](#step-5-set-environment-variables)
7. [Step 6: Create Facebook Callback Handler](#step-6-create-facebook-callback-handler)
8. [Step 7: Add Route Configuration](#step-7-add-route-configuration)
9. [Step 8: Create Connection Component](#step-8-create-connection-component)
10. [Step 9: Test the Integration](#step-9-test-the-integration)
11. [Step 10: Using Facebook in Workflows](#step-10-using-facebook-in-workflows)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ A Facebook account
- ✅ Access to [Facebook Developers](https://developers.facebook.com/)
- ✅ A Supabase project with admin access
- ✅ Your application running locally or deployed
- ✅ Your Supabase Project URL (found in Supabase Dashboard → Settings → API)

---

## Step 1: Create Facebook App

### 1.1 Go to Facebook Developers

1. Navigate to [Facebook Developers](https://developers.facebook.com/)
2. Sign in with your Facebook account
3. If you don't have a developer account, you'll be prompted to create one

### 1.2 Create a New App

1. Click **"My Apps"** in the top right corner
2. Click **"Create App"** button
3. Select app type:
   - **For Business/Page Management:** Choose **"Business"**
   - **For Consumer Apps:** Choose **"Consumer"**
   - **For Testing:** Choose **"Consumer"** (easier for development)
4. Click **"Next"**

### 1.3 Fill in App Details

1. **App Name:** Enter your app name (e.g., `CtrlChecks`)
2. **App Contact Email:** Enter your email address
3. **Business Account:** (Optional) Select if you have a business account
4. Click **"Create App"**

### 1.4 Complete Security Check

- Facebook may ask you to verify your account
- Complete any security checks if prompted

### 1.5 Complete Required App Information (For Submission)

After creating your app, Facebook will show a red alert with missing required fields. You need to complete these:

**⚠️ Important:** These fields are required for app submission, but you can still use the app for development/testing without completing them. However, for production use, you must complete all fields.

#### 1.5.1 App Icon (1024 x 1024)

1. Go to **"Settings"** → **"Basic"** in the left sidebar
2. Scroll down to **"App Icon"** section
3. Click **"Upload"** or **"Change"**
4. Upload a square image that is **exactly 1024 x 1024 pixels**
5. **Quick Tip:** You can create a simple icon using:
   - Online tools: [Canva](https://www.canva.com/), [Figma](https://www.figma.com/)
   - Or use a simple logo/image and resize it to 1024x1024
   - Format: PNG or JPG
6. Click **"Save Changes"**

#### 1.5.2 Privacy Policy URL

1. Still in **"Settings"** → **"Basic"**
2. Scroll to **"Privacy Policy URL"** field
3. Enter your privacy policy URL:
   - **If you have a privacy policy page:** `https://yourdomain.com/privacy`
   - **If you don't have one yet:** You can use a temporary URL or create a simple privacy policy
4. **Quick Privacy Policy Options:**
   - Use your existing privacy policy page (if you have `/privacy` route)
   - Create a simple page: `https://yourdomain.com/privacy`
   - Use a privacy policy generator: [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
   - For development, you can use: `https://yourdomain.com/privacy` (create this page later)
5. Click **"Save Changes"**

#### 1.5.3 User Data Deletion

1. Still in **"Settings"** → **"Basic"**
2. Scroll to **"User Data Deletion"** section
3. Click **"Set Up"** or **"Add"**
4. Enter your data deletion callback URL:
   ```
   https://yourdomain.com/auth/facebook/data-deletion
   ```
   Or if you don't have this endpoint yet:
   ```
   https://yourdomain.com/privacy#data-deletion
   ```
5. **Alternative (Simpler):** You can also provide instructions URL:
   - Create a page explaining how users can delete their data
   - URL: `https://yourdomain.com/privacy#data-deletion`
6. Click **"Save Changes"**

**Note:** For development, you can use a placeholder URL and implement the actual endpoint later.

#### 1.5.4 Category

1. Still in **"Settings"** → **"Basic"**
2. Scroll to **"Category"** dropdown
3. Select the most appropriate category for your app:
   - **Business** - For business/workflow automation apps
   - **Productivity** - For productivity/workflow tools
   - **Developer Tools** - For developer-focused tools
   - **Other** - If none fit perfectly
4. Click **"Save Changes"**

#### 1.5.5 Verify All Fields Are Complete

1. Go back to your app dashboard
2. Check that the red alert is gone (or shows fewer items)
3. All required fields should now be filled

**For Development/Testing:**
- You can use placeholder URLs and update them later
- The app will work for testing even with placeholder values
- You'll need proper values when submitting for production review

**For Production:**
- Ensure all URLs are real and working
- Privacy policy must be accessible
- Data deletion endpoint must be functional

---

## Step 2: Configure Facebook Login

> **💡 Quick Note:** If you already see "Facebook Login for Business" in your left sidebar, skip to Step 2.3. The product is already added!

### 2.1 Add Facebook Login Product (If Not Already Added)

**If you DON'T see "Facebook Login" in your left sidebar:**

1. In your Facebook App dashboard, look for the **"Add a Product"** section (usually on the main dashboard page)
2. Find **"Facebook Login"** or **"Facebook Login for Business"** product
3. Click **"Set Up"** button

### 2.2 Select Platform (If Setting Up New)

1. You'll see platform options (iOS, Android, Web, etc.)
2. Click **"Web"** platform
3. Enter your site URL:
   - **Development:** `http://localhost:5173`
   - **Production:** `https://yourdomain.com`
4. Click **"Save"**

### 2.3 Configure Facebook Login Settings ⭐ **START HERE IF YOU ALREADY HAVE FACEBOOK LOGIN**

**This is the main step you need!**

1. **Look at your LEFT SIDEBAR** - you should see:
   ```
   Facebook Login for Business
     ├── Settings  ← Click this!
     ├── Quickstart
     ├── Configurations
     └── Templates
   ```

2. Click **"Settings"** (under Facebook Login for Business)

3. On the Settings page, scroll down to find **"Valid OAuth Redirect URIs"** section
   - It might also be called "OAuth Redirect URIs" or "Redirect URIs"
   - Look for a text input field or textarea

4. Add these redirect URIs (one per line or comma-separated):

   **For Supabase Callback:**
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   > Replace `YOUR_PROJECT_ID` with your actual Supabase project ID

   **For Your App Callback:**
   ```
   http://localhost:5173/auth/facebook/callback
   https://yourdomain.com/auth/facebook/callback
   ```

4. **Deauthorize Callback URL:** (Optional)
   ```
   https://yourdomain.com/auth/facebook/deauthorize
   ```

5. Click **"Save Changes"**

### 2.4 Configure App Domains

1. Go to **"Settings"** → **"Basic"** in the left sidebar
2. Scroll to **"App Domains"**
3. Add your domains:
   - `localhost` (for development)
   - `yourdomain.com` (for production)
4. Click **"Save Changes"**

---

## Step 3: Get Facebook Credentials

### 3.1 Get App ID and App Secret

1. Stay in **"Settings"** → **"Basic"**
2. Find **"App ID"** - Copy this value
   - Example: `1234567890123456`
3. Find **"App Secret"** - Click **"Show"** button
   - Copy the secret value
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4`
4. **⚠️ IMPORTANT:** Save these securely - you'll need them for Supabase

### 3.2 Note Required Permissions

For posting to Facebook, you'll need these permissions:
- `email` - Access user email
- `public_profile` - Access basic profile info
- `pages_manage_posts` - Post to pages (requires app review for production)
- `pages_read_engagement` - Read page engagement (requires app review for production)

**For Development:**
- You can use these permissions without review
- Add test users in **"Roles"** → **"Test Users"**

**For Production:**
- You must submit your app for review
- Go to **"App Review"** → **"Permissions and Features"**
- Request the permissions you need
- Review process can take 7-14 days

---

## Step 4: Configure Supabase OAuth

### 4.1 Open Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project

### 4.2 Navigate to Authentication Providers

1. Click **"Authentication"** in the left sidebar
2. Click **"Providers"** tab
3. Scroll down to find **"Facebook"**

### 4.3 Enable Facebook Provider

1. Find **"Facebook"** in the providers list
2. Toggle the switch to **"Enabled"** or click **"Enable Facebook"**

### 4.4 Enter Facebook Credentials

1. **App ID:** Paste your Facebook App ID
2. **App Secret:** Paste your Facebook App Secret
3. **Scopes:** Enter these scopes (comma-separated):
   ```
   email,public_profile,pages_manage_posts,pages_read_engagement
   ```

### 4.5 Save Configuration

1. Click **"Save"** button
2. Verify the status shows **"Enabled"**
3. Verify App ID is visible
4. Verify App Secret shows as masked (••••••••)

### 4.6 Configure Redirect URLs

1. Still in **"Authentication"**, click **"URL Configuration"**
2. Add **Redirect URLs**:

   **Development:**
   ```
   http://localhost:5173/auth/facebook/callback
   ```

   **Production:**
   ```
   https://yourdomain.com/auth/facebook/callback
   ```

3. Set **Site URL**:
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`

4. Click **"Save"**

---

## Step 5: Set Environment Variables

### 5.1 Backend Environment Variables

Add to your backend `.env` file (in `worker/` directory):

```bash
# Facebook OAuth Credentials
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Token Encryption (if not already set)
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.2 Frontend Environment Variables

Add to your frontend `.env` file (in `ctrl_checks/` directory):

```bash
# API URL (if not already set)
VITE_API_URL=http://localhost:3001
```

---

## Step 6: Create Facebook Callback Handler

### 6.1 Create Callback Directory

Create the directory if it doesn't exist:
```
ctrl_checks/src/pages/auth/facebook/
```

### 6.2 Create Callback Component

Create file: `ctrl_checks/src/pages/auth/facebook/Callback.tsx`

```typescript
/**
 * Facebook OAuth Callback Handler
 * 
 * Handles Facebook OAuth callback from Supabase Auth.
 * Extracts tokens from session and saves them securely via backend API.
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

export default function FacebookAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<string>('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Avoid double-execution in React Strict Mode
    if (processedRef.current) return;

    let authSubscription: { unsubscribe: () => void } | null = null;
    let timeoutId: NodeJS.Timeout;

    const processSession = async (session: Session | null) => {
      if (!session) return false;

      // Prevent multiple processings for the same session
      if (processedRef.current) return true;
      processedRef.current = true;

      try {
        setStatus('Facebook tokens found. Saving...');

        // Extract tokens from Supabase session
        const { provider_token, provider_refresh_token, expires_at } = session as Session & {
          provider_token?: string | null;
          provider_refresh_token?: string | null;
          expires_at?: number;
        };

        if (!provider_token) {
          console.warn('No provider_token in session. Is this a Facebook OAuth session?');
          throw new Error('Facebook access token not found in session.');
        }

        console.log('Got Facebook tokens. Saving to database via backend API...');

        // Get current session token for API authentication
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.access_token) {
          throw new Error('No active session found');
        }

        // Call backend API to save token (with encryption)
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/social-tokens`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'facebook',
            access_token: provider_token,
            refresh_token: provider_refresh_token || null,
            expires_at: expires_at ? new Date(expires_at * 1000).toISOString() : null,
            scope: 'email,public_profile,pages_manage_posts,pages_read_engagement',
            provider_user_id: null, // Can be fetched from Facebook API if needed
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Failed to save Facebook token: ${response.statusText}`);
        }

        toast({
          title: 'Success',
          description: 'Facebook connected successfully!',
        });

        // Check if we should return to a specific page
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('returnTo');
        
        if (returnTo) {
          navigate(returnTo);
        } else {
          navigate('/workflows');
        }
        return true;

      } catch (err) {
        console.error('Error in Facebook callback processing:', err);
        setError(err instanceof Error ? err.message : 'Failed to save Facebook connection');
        toast({
          title: 'Connection Failed',
          description: err instanceof Error ? err.message : 'Failed to save connection',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/workflows'), 3000);
        return true;
      }
    };

    const setupAuthListener = async () => {
      // 1. Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const success = await processSession(session);
        if (success) return;
      }

      // 2. Setup listener for the eventual sign in (PKCE flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log(`Auth Callback Event: ${event}`);

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await processSession(session);
          }
        }
      );
      authSubscription = subscription;

      // 3. Set a timeout just in case it hangs forever
      timeoutId = setTimeout(() => {
        if (!processedRef.current) {
          setError('Authentication timed out. Please try again.');
          processedRef.current = true;
        }
      }, 10000); // 10 seconds timeout
    };

    setupAuthListener();

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate, toast]);

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-destructive font-semibold">Connection Failed</div>
        <p className="text-muted-foreground">{error}</p>
        <div className="bg-muted p-4 rounded text-xs font-mono text-left max-w-lg overflow-auto">
          <p>Debug Info:</p>
          <p>URL: {window.location.href}</p>
          <p>Status: {status}</p>
        </div>
        <Button onClick={() => navigate('/workflows')} variant="outline">
          Return to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{status}</p>
      <p className="text-xs text-muted-foreground max-w-md text-center">
        Waiting for Facebook to complete the handshake...
      </p>
    </div>
  );
}
```

---

## Step 7: Add Route Configuration

### 7.1 Update App.tsx

Open `ctrl_checks/src/App.tsx` and add the Facebook callback route:

1. **Import the component** (add to imports):
```typescript
import FacebookAuthCallback from "./pages/auth/facebook/Callback";
```

2. **Add the route** (add inside `<Routes>`):
```typescript
<Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
```

**Complete route section should look like:**
```typescript
<Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
<Route path="/auth/linkedin/callback" element={<LinkedInAuthCallback />} />
<Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
```

---

## Step 8: Create Connection Component

### 8.1 Option A: Add to Existing Connections Panel

If you have a `ConnectionsPanel.tsx` component, add Facebook connection there.

### 8.2 Option B: Create Facebook Connection Button

Create a simple connection button component or add to your settings page:

**Example function to trigger Facebook OAuth:**

```typescript
import { supabase } from '@/integrations/supabase/client';

const handleConnectFacebook = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/facebook/callback`,
        scopes: 'email,public_profile,pages_manage_posts,pages_read_engagement',
      },
    });

    if (error) {
      console.error('Facebook OAuth error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  } catch (err) {
    console.error('Error connecting Facebook:', err);
    toast({
      title: 'Error',
      description: 'Failed to initiate Facebook connection',
      variant: 'destructive',
    });
  }
};
```

**Example button component:**

```typescript
<Button
  onClick={handleConnectFacebook}
  variant="outline"
  className="w-full"
>
  <svg className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
  Connect Facebook
</Button>
```

### 8.3 Check Connection Status

To check if Facebook is connected, query the `social_tokens` table:

```typescript
import { supabase } from '@/integrations/supabase/client';

const checkFacebookConnection = async () => {
  const { data, error } = await supabase
    .from('social_tokens')
    .select('*')
    .eq('provider', 'facebook')
    .single();

  return !error && data !== null;
};
```

---

## Step 9: Test the Integration

### 9.1 Test OAuth Flow

1. **Start your application:**
   ```bash
   # Frontend
   cd ctrl_checks
   npm run dev

   # Backend (if separate)
   cd worker
   npm run dev
   ```

2. **Click "Connect Facebook" button**

3. **You should be redirected to Facebook:**
   - Facebook login page appears
   - You'll see permission request screen
   - Click "Continue" or "Allow"

4. **You should be redirected back:**
   - URL: `http://localhost:5173/auth/facebook/callback`
   - Loading screen appears
   - Success message shows
   - Redirects to `/workflows`

### 9.2 Verify Token Storage

1. **Check Supabase Dashboard:**
   - Go to **"Table Editor"**
   - Open `social_tokens` table
   - Find row with `provider = 'facebook'`
   - Verify token is encrypted (should look like: `iv:tag:encrypted_data`)

2. **Check Browser Console:**
   - Open Developer Tools
   - Check for any errors
   - Verify success messages

### 9.3 Test Token Retrieval

You can test if the token is accessible:

```typescript
// In your browser console or component
const { data } = await supabase
  .from('social_tokens')
  .select('*')
  .eq('provider', 'facebook')
  .single();

console.log('Facebook token exists:', !!data);
```

---

## Step 10: Using Facebook in Workflows

### 10.1 Facebook Node Configuration

Once connected, you can use Facebook nodes in your workflows:

**Example Workflow Node:**
```json
{
  "type": "facebook",
  "config": {
    "operation": "post",
    "message": "Hello from CtrlChecks!",
    "pageId": "optional_page_id"
  }
}
```

### 10.2 Available Operations

1. **Post to Facebook:**
   - Operation: `post` or `create_post`
   - Required: `message`
   - Optional: `pageId`, `link`

2. **Get User Info:**
   - Operation: `get_user` or `get_profile`
   - Returns: user ID, name, email

### 10.3 Example Workflow JSON

```json
{
  "nodes": [
    {
      "id": "facebook-post",
      "type": "facebook",
      "config": {
        "operation": "post",
        "message": "{{input.message}}",
        "pageId": "{{input.pageId}}"
      }
    }
  ]
}
```

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Problem:** Facebook rejects the redirect URI

**Solutions:**
1. Check Facebook App → Facebook Login → Settings
2. Verify redirect URI matches exactly:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
3. No trailing slashes
4. Use `https://` not `http://` for Supabase callback
5. Check Supabase project URL in Settings → API

### Issue: "Invalid App ID or App Secret"

**Problem:** Credentials are incorrect

**Solutions:**
1. Double-check App ID and App Secret in Supabase Dashboard
2. Regenerate App Secret in Facebook if needed
3. Ensure no extra spaces when copying
4. Verify environment variables are set correctly

### Issue: "App not approved" (Production)

**Problem:** Facebook app needs review for production

**Solutions:**
1. **For Development:**
   - Add test users in Facebook App → Roles → Test Users
   - Test users can use app without review

2. **For Production:**
   - Submit app for review in App Review → Permissions and Features
   - Request required permissions
   - Wait for approval (7-14 days)

### Issue: "Token not saved"

**Problem:** Token not appearing in database

**Solutions:**
1. Check backend API endpoint: `/api/social-tokens`
2. Verify frontend callback handler calls the API
3. Check browser console for errors
4. Verify Supabase session token is valid
5. Check backend logs for errors

### Issue: "Permission denied"

**Problem:** Required permissions not granted

**Solutions:**
1. Check requested scopes in Supabase configuration
2. Verify scopes match what's requested in OAuth flow
3. For production, ensure permissions are approved in App Review
4. Re-authenticate to request new permissions

### Issue: "Cannot post to page"

**Problem:** Page access token not available

**Solutions:**
1. Ensure `pages_manage_posts` permission is granted
2. User must be admin of the page
3. Use Page Access Token, not User Access Token
4. Get Page Access Token via Graph API Explorer:
   - Select your Page in dropdown
   - Generate Page Access Token
   - Use that token instead

### Debug Checklist

- [ ] Facebook App created and configured
- [ ] Facebook Login product added
- [ ] Redirect URIs configured correctly
- [ ] App ID and App Secret copied correctly
- [ ] Supabase Facebook provider enabled
- [ ] Supabase redirect URLs configured
- [ ] Environment variables set
- [ ] Callback component created
- [ ] Route added to App.tsx
- [ ] Database migration run (`21_social_tokens_unified.sql`)
- [ ] Encryption key set
- [ ] Test user added (for development)
- [ ] App submitted for review (for production)

---

## Quick Reference

### Facebook App Settings

**Redirect URIs:**
```
https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
http://localhost:5173/auth/facebook/callback
https://yourdomain.com/auth/facebook/callback
```

**Required Scopes:**
```
email,public_profile,pages_manage_posts,pages_read_engagement
```

### Supabase Configuration

**Provider:** Facebook
**App ID:** Your Facebook App ID
**App Secret:** Your Facebook App Secret
**Scopes:** `email,public_profile,pages_manage_posts,pages_read_engagement`

### Frontend OAuth Initiation

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'facebook',
  options: {
    redirectTo: `${window.location.origin}/auth/facebook/callback`,
    scopes: 'email,public_profile,pages_manage_posts,pages_read_engagement',
  },
});
```

### Backend API Endpoint

```
POST /api/social-tokens
Authorization: Bearer <supabase_session_token>
Content-Type: application/json

{
  "provider": "facebook",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "...",
  "scope": "...",
  "provider_user_id": "..."
}
```

---

## Next Steps

After completing Facebook integration:

1. ✅ Test OAuth flow end-to-end
2. ✅ Verify tokens are saved and encrypted
3. ✅ Test posting to Facebook from workflow
4. ✅ Test getting user info
5. ✅ Add connection status indicator to UI
6. ✅ Add disconnect functionality
7. ✅ Monitor for errors in production
8. ✅ Submit app for review (if going to production)

---

## Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Facebook Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Social Media Integration Guide](./SOCIAL_MEDIA_INTEGRATION.md)
- [Supabase OAuth Setup Guide](./SUPABASE_OAUTH_SETUP_GUIDE.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check Supabase Auth Logs: Dashboard → Logs → Auth Logs
2. Check Facebook App Logs: App Dashboard → Logs
3. Check browser console for frontend errors
4. Check backend logs for API errors
5. Verify all configuration steps were completed correctly

---

**Congratulations!** You've successfully integrated Facebook OAuth into your CtrlChecks application! 🎉
