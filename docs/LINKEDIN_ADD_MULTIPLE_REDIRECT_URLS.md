# How to Add Multiple Redirect URLs in LinkedIn Developer Portal

## Step-by-Step Instructions

### Method 1: Adding URLs One by One (Recommended)

1. **Go to LinkedIn Developer Portal**
   - Navigate to: https://www.linkedin.com/developers/apps
   - Select your app

2. **Navigate to Auth Settings**
   - Click on the **"Auth"** tab at the top

3. **Find OAuth 2.0 Settings**
   - Scroll down to **"OAuth 2.0 settings"** section
   - Look for **"Authorized redirect URLs for your app"**

4. **Add First URL** (if not already added)
   - You should see: `http://localhost:8080/auth/linkedin/callback`
   - If this is already there, you're good!

5. **Add Second URL**
   - Click the **pencil/edit icon** (✏️) next to the existing URL
   - OR look for an **"Add URL"** or **"+"** button
   - Enter the second URL: `http://localhost:5173/auth/linkedin/callback`
   - Click **"Add"** or **"Save"**

6. **Save Changes**
   - Click **"Update"** or **"Save"** button at the bottom of the section
   - Wait for confirmation message

### Method 2: Using the Edit Interface

1. **Click the Edit Icon**
   - Find the pencil icon (✏️) next to "Authorized redirect URLs"
   - This opens an edit dialog or inline editor

2. **Add Multiple URLs**
   - You'll see a list or text area
   - Add each URL on a **new line** or as a **separate entry**:
     ```
     http://localhost:8080/auth/linkedin/callback
     http://localhost:5173/auth/linkedin/callback
     ```

3. **Save**
   - Click **"Save"** or **"Update"**
   - Verify both URLs appear in the list

## Visual Guide

Your LinkedIn Developer Portal should show:

```
Authorized redirect URLs for your app:
┌─────────────────────────────────────────────────────────┐
│ http://localhost:8080/auth/linkedin/callback        [✏️] │
│ http://localhost:5173/auth/linkedin/callback        [✏️] │
└─────────────────────────────────────────────────────────┘
[+ Add URL]  [Update]
```

## Important Notes

### URL Format
- Each URL must be on a **separate line** or **separate entry**
- No commas between URLs
- Must include the full URL with `http://` or `https://`
- Must include the port number if using localhost

### Valid Examples
```
✅ http://localhost:8080/auth/linkedin/callback
✅ http://localhost:5173/auth/linkedin/callback
✅ https://yourdomain.com/auth/linkedin/callback
```

### Invalid Examples
```
❌ localhost:8080/auth/linkedin/callback (missing http://)
❌ http://localhost:8080/auth/linkedin/callback, http://localhost:5173/auth/linkedin/callback (comma-separated)
❌ http://localhost/auth/linkedin/callback (missing port)
```

## If You Don't See an "Add" Button

Some LinkedIn app interfaces show URLs differently:

### Option A: Text Area
- You might see a **text box** or **textarea**
- Enter URLs **one per line**:
  ```
  http://localhost:8080/auth/linkedin/callback
  http://localhost:5173/auth/linkedin/callback
  ```

### Option B: List with Plus Button
- Look for a **"+"** or **"Add URL"** button
- Click it to add a new URL field
- Enter the URL and click **"Add"**

### Option C: Edit Existing
- Click the **pencil icon** (✏️) next to existing URL
- This might open a dialog where you can add more URLs
- Add the new URL and save

## Verification

After adding URLs, verify:

1. **Both URLs are visible** in the list
2. **No error messages** appear
3. **"Update" or "Save" button** is clicked
4. **Confirmation message** appears (e.g., "Settings updated successfully")

## Testing Both URLs

You can test both redirect URLs:

### Test Port 8080
1. Make sure your app is running on port 8080
2. Click "Connect LinkedIn"
3. Should redirect to: `http://localhost:8080/auth/linkedin/callback`

### Test Port 5173
1. Make sure your app is running on port 5173
2. Click "Connect LinkedIn"
3. Should redirect to: `http://localhost:5173/auth/linkedin/callback`

## Troubleshooting

### Issue: "Invalid redirect URL"
**Solution:**
- Check URL format (must start with `http://` or `https://`)
- Ensure port number is included for localhost
- No trailing slashes (unless required)
- No spaces before/after URL

### Issue: Can't add second URL
**Solution:**
- Try refreshing the page
- Clear browser cache
- Try a different browser
- Check if there's a limit on number of URLs (usually 10+ allowed)

### Issue: URLs not saving
**Solution:**
- Make sure you click "Update" or "Save" button
- Wait for confirmation message
- Check browser console for errors
- Try saving one URL at a time

## Quick Checklist

- [ ] Opened LinkedIn Developer Portal
- [ ] Selected your app
- [ ] Went to "Auth" tab
- [ ] Found "OAuth 2.0 settings"
- [ ] Added `http://localhost:8080/auth/linkedin/callback`
- [ ] Added `http://localhost:5173/auth/linkedin/callback`
- [ ] Clicked "Update" or "Save"
- [ ] Saw confirmation message
- [ ] Both URLs are visible in the list

---

**Tip:** If you're unsure about the interface, LinkedIn's UI may vary. Look for:
- Pencil/edit icons (✏️)
- Plus/add buttons (+)
- Text areas or input fields
- "Update" or "Save" buttons
