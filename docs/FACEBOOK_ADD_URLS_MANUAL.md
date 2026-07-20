# How to Add Redirect URLs to Facebook - Manual Method

## Problem

You can't add URLs to the "Valid OAuth Redirect URIs" field in Facebook.

## Solution: Try These Methods

### Method 1: Click in Empty Space

1. Go to **Facebook Login** → **Settings**
2. Look at the **"Valid OAuth Redirect URIs"** field
3. **Click BELOW the existing URLs** (in empty space)
4. Type the URL: `http://localhost:8080/auth/facebook/callback`
5. Press **Enter** or **Tab**
6. The URL should appear as a new chip/tag
7. Click **"Save Changes"** at the bottom

### Method 2: Use the "+" Button (if available)

1. Look for a **"+"** or **"Add"** button near the URLs field
2. Click it
3. A new input field should appear
4. Type: `http://localhost:8080/auth/facebook/callback`
5. Press Enter
6. Save changes

### Method 3: Remove and Re-add All URLs

1. Click the **"X"** next to each existing URL to remove them
2. Click in the now-empty field
3. Type all URLs, one per line:
   ```
   https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
   http://localhost:8080/auth/facebook/callback
   ```
4. Press Enter after each URL
5. Save changes

### Method 4: Check if Field is Disabled

If the field is grayed out or read-only:

1. **Check App Status:**
   - Look at the top of the page for any warnings
   - Check if app needs verification
   - Look for "App Review" status

2. **Check Permissions:**
   - Make sure you're an **Admin** or **Developer** of the app
   - Go to **Settings** → **Roles** → Check your role

3. **Try Different Browser:**
   - Sometimes browser extensions block editing
   - Try Chrome, Firefox, or Edge
   - Try incognito/private mode

### Method 5: Use Facebook Graph API (Advanced)

If the UI doesn't work, you can add URLs via API:

1. Get your **App Access Token** from Facebook
2. Use this API call:

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/3809504649359292" \
  -d "redirect_uris=http://localhost:8080/auth/facebook/callback" \
  -d "access_token=YOUR_APP_ACCESS_TOKEN"
```

But this is complex - try the UI methods first.

## Alternative: Use Only Supabase Callback

If you absolutely can't add the localhost URL, try this workaround:

### Workaround: Remove redirectTo Parameter

The issue might be that we're passing `redirectTo` to Supabase, which Facebook sees. Let's modify the code to NOT specify a redirectTo, and let Supabase handle it:

**This requires a code change** - I can help you with this if needed.

## Most Likely Issue: Supabase Configuration

Actually, **the real issue is probably Supabase**, not Facebook. Here's what to check:

### Step 1: Supabase URL Configuration

1. Go to **Supabase Dashboard**
2. **Authentication** → **URL Configuration**
3. In **"Redirect URLs"**, you should see a text area or list
4. **Click in the field** (or click "Add URL" if there's a button)
5. Type: `http://localhost:8080/auth/facebook/callback`
6. Press Enter or click Add
7. Click **"Save"**

### Step 2: Check Site URL

Make sure **"Site URL"** is set to:
```
http://localhost:8080
```

### Step 3: Verify Facebook Provider

1. **Authentication** → **Providers** → **Facebook**
2. Make sure:
   - ✅ Enabled: **ON**
   - ✅ App ID: `3809504649359292`
   - ✅ App Secret: (set)
   - ✅ Scopes: `email,public_profile,pages_manage_posts,pages_read_engagement`

## Debug: What's Actually Happening?

When you click "Connect Facebook", check the browser console (F12):

1. **Console Tab:** Look for any errors
2. **Network Tab:** 
   - Find the request to `facebook.com/dialog/oauth`
   - Check the `redirect_uri` parameter
   - What exact URL does it show?

3. **The Error Page:**
   - Copy the FULL URL from the address bar
   - What does the `redirect_uri` parameter show?
   - Does it match what's in Facebook settings?

## Quick Test

Try this to see what URL Facebook is actually checking:

1. Open browser console (F12)
2. Click "Connect Facebook"
3. Look at the OAuth URL that opens
4. Check the `redirect_uri` parameter
5. Compare it to what's in Facebook settings

The URL should be:
```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
```

If it's something else, that's the problem!

## Still Stuck?

If nothing works, the issue might be:

1. **App is in Live Mode** - Development mode is required for localhost
2. **App needs Review** - Some apps require Facebook review before OAuth works
3. **Wrong App** - Make sure you're editing the correct app (App ID: 3809504649359292)

Let me know what you see when you try to add the URL - what happens? Does nothing happen, or do you get an error?
