# How to Get Twitter OAuth 2.0 Client ID and Client Secret

## ⚠️ Important: You Need OAuth 2.0 Credentials

The credentials you received (Consumer Key, Secret Key, Bearer Token) are **API v1.1 credentials**. 

For CtrlChecks Twitter integration, you need **OAuth 2.0 Client ID and Client Secret** instead.

## 🔄 Step-by-Step: Get OAuth 2.0 Credentials

### Step 1: Save Your Current Credentials (Optional)

You can save these for reference, but they won't work for OAuth 2.0:
- Consumer Key: `z3Zux5AUkZe5DfTOSsY7wjW8m`
- Secret Key: `QcGAz37xnHiZicj9fWBNSxluXv11jRRo3cTmSTNLYKJhMJNEWX`
- Bearer Token: `AAAAAAAAAAAAAAAAAAAAADtu7gEAAAAA7h2gt8WMTmZg87WsACJmJ2mlIjM%3D2s9SgVZwl45dnyKl3qREIw9uhPDq0uQhCEwkIlSApXhvCwhi0A`

### Step 2: Configure OAuth 2.0 Settings

1. In your Twitter Developer Portal, go to your **CtrlChecks** app
2. Navigate to **User authentication settings** (or **Settings** → **User authentication settings**)
3. Click **Set up** or **Edit**

### Step 3: Configure OAuth 2.0

Fill in the following:

**App permissions:**
- ✅ **Read tweets**
- ✅ **Write tweets**
- ✅ **Read users**
- ✅ **Offline access** (Important for refresh tokens!)

**Type of App:**
- Select: **Web App, Automated App or Bot**

**App info:**
- **Callback URI / Redirect URL**: 
  ```
  http://localhost:8080/auth/twitter/callback
  ```
  (Replace `8080` with your actual frontend port)

- **Website URL**: 
  ```
  http://localhost:8080
  ```

- **Privacy Policy URL**: 
  ```
  http://localhost:8080/privacy
  ```
  (Or your actual privacy policy URL)

- **Terms of Service URL**: 
  ```
  http://localhost:8080/terms
  ```
  (Or your actual terms URL)

4. Click **Save**

### Step 4: Get OAuth 2.0 Credentials

1. Go to **Keys and tokens** tab
2. Scroll down to **OAuth 2.0 Client ID and Client Secret** section
3. You'll see:
   - **Client ID** (OAuth 2.0 Client ID) ← This is what you need!
   - **Client Secret** (OAuth 2.0 Client Secret) ← This is what you need!

4. **Click "Show" or "Reveal"** next to Client Secret to see it
5. **Copy both values immediately** - the Client Secret won't be shown again!

### Step 5: Add to Backend

1. Open `worker/.env` file
2. Add these lines:

```env
TWITTER_OAUTH_CLIENT_ID=your_oauth2_client_id_here
TWITTER_OAUTH_CLIENT_SECRET=your_oauth2_client_secret_here
```

3. Replace with your actual OAuth 2.0 Client ID and Client Secret
4. **Save** the file
5. **Restart** your backend server

## 🔍 Difference Between Credentials

| Type | What You Have | What You Need |
|------|---------------|---------------|
| **API v1.1** | Consumer Key, Secret Key, Bearer Token | ❌ Not for OAuth 2.0 |
| **OAuth 2.0** | ❌ Not yet | ✅ Client ID, Client Secret |

**Why OAuth 2.0?**
- OAuth 2.0 allows users to connect their own Twitter accounts
- Users authorize your app to act on their behalf
- No need to share API keys with users
- Supports refresh tokens for long-term access

## ✅ Verification Checklist

After configuring OAuth 2.0:

- [ ] OAuth 2.0 settings configured
- [ ] Callback URI set: `http://localhost:8080/auth/twitter/callback`
- [ ] All required permissions enabled (Read tweets, Write tweets, Read users, Offline access)
- [ ] OAuth 2.0 Client ID copied
- [ ] OAuth 2.0 Client Secret copied (clicked "Show")
- [ ] Both added to `worker/.env`
- [ ] Backend server restarted
- [ ] Tested connection in Connections panel

## 🚨 Common Issues

### "OAuth 2.0 Client ID and Client Secret" Section Not Visible

**Cause**: OAuth 2.0 not configured yet

**Solution**: 
1. Go to **User authentication settings**
2. Complete the OAuth 2.0 setup (Step 3 above)
3. Save the settings
4. Return to **Keys and tokens** tab
5. OAuth 2.0 credentials should now appear

### Only See "Consumer Key" and "Secret Key"

**Cause**: You're looking at API v1.1 credentials, not OAuth 2.0

**Solution**:
1. Make sure you've completed OAuth 2.0 setup in **User authentication settings**
2. Scroll down in **Keys and tokens** tab
3. Look for **"OAuth 2.0 Client ID and Client Secret"** section (separate from Consumer Key/Secret)

### Can't See Client Secret

**Solution**:
1. Click the **"Show"** or **"Reveal"** button next to Client Secret
2. Copy it immediately - it won't be shown again!
3. If you lose it, you'll need to regenerate it (which invalidates the old one)

## 📝 Example

After completing OAuth 2.0 setup, your `worker/.env` should look like:

```env
# Twitter OAuth 2.0 Credentials (NOT Consumer Key/Secret)
TWITTER_OAUTH_CLIENT_ID=abc123xyz789  # OAuth 2.0 Client ID
TWITTER_OAUTH_CLIENT_SECRET=secret_xyz789abc123  # OAuth 2.0 Client Secret
```

**Note**: These are different from the Consumer Key and Secret Key you received earlier.

## 🎯 Next Steps

Once you have OAuth 2.0 credentials:

1. ✅ Add them to `worker/.env`
2. ✅ Restart backend server
3. ✅ Connect Twitter account in Connections panel
4. ✅ Test with a simple workflow

---

**Remember**: The Consumer Key/Secret you received are for API v1.1. You need OAuth 2.0 Client ID and Client Secret for the CtrlChecks integration to work!
