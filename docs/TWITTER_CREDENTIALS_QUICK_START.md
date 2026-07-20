# Twitter OAuth Credentials - Quick Start Guide

## 🎯 What You Need

You need **two values** from Twitter:
1. **OAuth 2.0 Client ID** → `TWITTER_OAUTH_CLIENT_ID`
2. **OAuth 2.0 Client Secret** → `TWITTER_OAUTH_CLIENT_SECRET`

## 📍 Where to Find Them

### Step 1: Go to Twitter Developer Portal
👉 [https://developer.twitter.com/](https://developer.twitter.com/)

### Step 2: Navigate to Your App
1. Click **Projects & Apps** (left sidebar)
2. Select your **Project**
3. Click on your **App** (or create one if you don't have it)

### Step 3: Configure OAuth 2.0 (First Time Only)

1. Go to **User authentication settings**
2. Click **Set up** or **Edit**
3. Configure:
   - **App permissions**: ✅ Read tweets, ✅ Write tweets, ✅ Read users, ✅ Offline access
   - **Type of App**: Web App, Automated App or Bot
   - **Callback URI**: `http://localhost:8080/auth/twitter/callback`
   - **Website URL**: `http://localhost:8080`
4. Click **Save**

### Step 4: Get Your Credentials

1. Go to **Keys and tokens** tab
2. Scroll to **OAuth 2.0 Client ID and Client Secret**
3. **Copy both values**:
   - **Client ID** (visible immediately)
   - **Client Secret** (click "Show" to reveal - copy immediately!)

## ⚙️ Add to Backend

1. Open `worker/.env` file
2. Add these lines:

```env
TWITTER_OAUTH_CLIENT_ID=paste_your_client_id_here
TWITTER_OAUTH_CLIENT_SECRET=paste_your_client_secret_here
```

3. **Save** the file
4. **Restart** your backend server

## ✅ Verify

1. Open Connections panel in your app
2. Click "Connect" next to Twitter/X
3. You should be redirected to Twitter authorization
4. After authorizing, you'll be redirected back and see "Connected"

## 🔧 Common Issues

| Error | Solution |
|-------|----------|
| "Invalid client" | Check credentials are correct in `.env`, restart backend |
| "Invalid redirect_uri" | Update callback URI in Twitter app settings to match your frontend port |
| Can't see Client Secret | Click "Show" button, or regenerate if needed |

## 📝 Example `.env` File

```env
# Twitter OAuth 2.0 Credentials
TWITTER_OAUTH_CLIENT_ID=307d872b-594c-80d2-b90d-003713fd0d7f
TWITTER_OAUTH_CLIENT_SECRET=paste_your_twitter_client_secret_here
```

**⚠️ Important**: Replace with your actual credentials!

## 🎯 Quick Checklist

- [ ] Created Twitter Developer account
- [ ] Created/selected Project and App
- [ ] Configured OAuth 2.0 settings
- [ ] Set callback URI: `http://localhost:8080/auth/twitter/callback`
- [ ] Copied Client ID
- [ ] Copied Client Secret (clicked "Show")
- [ ] Added both to `worker/.env`
- [ ] Restarted backend server
- [ ] Tested connection in Connections panel

---

**Need more details?** See `docs/TWITTER_OAUTH_CREDENTIALS_GUIDE.md` for complete step-by-step instructions.
