# Facebook Login Setup - Simple Step-by-Step

Based on what you're seeing in your Facebook App dashboard, here's exactly what to do:

## ✅ What You've Already Done

Looking at your screen, you have:
- ✅ App created
- ✅ App icon uploaded
- ✅ Privacy policy URL set
- ✅ User data deletion configured
- ✅ Category selected ("Business and pages")
- ✅ Facebook Login for Business already added (visible in left sidebar)

## 🎯 What You Need to Do Next

### Step 1: Configure Facebook Login Settings

**You can see in your left sidebar:**
```
Facebook Login for Business
  ├── Settings  ← Click this!
  ├── Quickstart
  ├── Configurations
  └── Templates
```

**Do this:**
1. In the **left sidebar**, click **"Facebook Login for Business"** (it's already expanded)
2. Click **"Settings"** (under Facebook Login for Business)
3. You'll see a page with OAuth settings

### Step 2: Add Redirect URIs

On the Facebook Login Settings page, find the section called:
- **"Valid OAuth Redirect URIs"** or
- **"OAuth Redirect URIs"** or  
- **"Redirect URIs"**

**Add these URLs (one per line or comma-separated):**

```
https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback
http://localhost:5173/auth/facebook/callback
```

**Important:** 
- Replace `nvrrqvlqnnvlihtlgmzn` with your actual Supabase project ID if different
- The first URL is for Supabase (where Facebook sends users after login)
- The second URL is for your app (where users land after OAuth)

### Step 3: Save Changes

1. Scroll down on the Settings page
2. Click **"Save Changes"** button (usually at the bottom)
3. Wait for confirmation message

### Step 4: Configure App Domains (Optional but Recommended)

1. Go back to **"App settings"** → **"Basic"** (in left sidebar)
2. Scroll to **"App domains"** field
3. Add:
   ```
   localhost
   ```
   (Add your production domain later: `yourdomain.com`)
4. Click **"Save Changes"**

## 📋 Quick Checklist

- [ ] Clicked "Facebook Login for Business" → "Settings" in left sidebar
- [ ] Added Supabase callback URL: `https://nvrrqvlqnnvlihtlgmzn.supabase.co/auth/v1/callback`
- [ ] Added app callback URL: `http://localhost:5173/auth/facebook/callback`
- [ ] Clicked "Save Changes"
- [ ] (Optional) Added "localhost" to App domains

## 🎯 Next Steps After This

Once you've saved the redirect URIs:

1. **Copy your App ID and App Secret** (from Settings → Basic)
2. **Go to Supabase** and configure Facebook OAuth there
3. **Test the connection**

## ❓ Common Questions

**Q: I don't see "Add a Product" section?**
A: That's fine! You already have "Facebook Login for Business" in your sidebar, which means the product is already added. Just go to Settings.

**Q: Where exactly is "Valid OAuth Redirect URIs"?**
A: It's on the Facebook Login → Settings page. Scroll down to find the section with input fields for redirect URIs.

**Q: What if I can't find the Settings page?**
A: Look in the left sidebar under "Facebook Login for Business" - you should see "Settings" as a sub-item. Click it.

**Q: Do I need to add both URLs?**
A: Yes! The Supabase URL is required for OAuth to work. The localhost URL is for your app's callback page.

## 🆘 Still Confused?

If you're stuck, here's what to look for:

1. **Left Sidebar** → Find "Facebook Login for Business"
2. **Click "Settings"** under it
3. **On that page** → Look for a text input field labeled something like:
   - "Valid OAuth Redirect URIs"
   - "OAuth Redirect URIs"  
   - "Redirect URIs"
   - "Authorized Redirect URIs"
4. **Paste the URLs** there
5. **Save**

---

**Visual Guide:**
```
Left Sidebar:
  Facebook Login for Business
    └── Settings ← Click here!
         └── (Page opens)
              └── Valid OAuth Redirect URIs ← Add URLs here
```

Need more help? Check the full guide: [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md)
