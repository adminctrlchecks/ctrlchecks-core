# 🔧 Supabase Connection Troubleshooting Guide

## Problem Summary

Your application is **loading environment variables correctly**, but **cannot connect to Supabase**:
- ❌ Connection timeout to `nvrrqvlqnnvlihtlgmzn.supabase.co`
- ❌ Gmail login failing (depends on Supabase authentication)
- ❌ Migration errors: `TypeError: fetch failed`
- ❌ TimeoutWatchdog errors: `ConnectTimeoutError`

---

## 🔍 Diagnostic Steps

### Step 1: Verify Supabase Project Status

1. **Check if your Supabase project is active:**
   - Go to: https://supabase.com/dashboard
   - Login and check if project `nvrrqvlqnnvlihtlgmzn` exists
   - **⚠️ IMPORTANT:** Free tier projects pause after 7 days of inactivity
   - If paused, click "Restore" to reactivate

2. **Verify the project URL:**
   - In Supabase Dashboard → Settings → API
   - Confirm the URL matches: `https://nvrrqvlqnnvlihtlgmzn.supabase.co`

### Step 2: Test Network Connectivity

**Option A: Test from PowerShell (Windows)**

```powershell
# Test basic connectivity
Test-NetConnection -ComputerName nvrrqvlqnnvlihtlgmzn.supabase.co -Port 443

# Test HTTPS connection
Invoke-WebRequest -Uri "https://nvrrqvlqnnvlihtlgmzn.supabase.co/rest/v1/" -Method Get -TimeoutSec 10
```

**Option B: Test from Browser**

1. Open browser and go to: `https://nvrrqvlqnnvlihtlgmzn.supabase.co/rest/v1/`
2. You should see a JSON response (even if it's an error, it means connection works)
3. If you see "This site can't be reached" → Network/firewall issue

**Option C: Test from Node.js**

```powershell
# In PowerShell, run:
node -e "fetch('https://nvrrqvlqnnvlihtlgmzn.supabase.co/rest/v1/').then(r => console.log('✅ Connected:', r.status)).catch(e => console.error('❌ Error:', e.message))"
```

### Step 3: Check Firewall/Network Settings

**Common Issues:**

1. **Corporate Firewall:**
   - Your network might be blocking Supabase domains
   - Try using a VPN or mobile hotspot to test

2. **Windows Firewall:**
   ```powershell
   # Check if firewall is blocking
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"}
   ```

3. **Antivirus Software:**
   - Temporarily disable antivirus to test
   - Add Node.js to antivirus exceptions

4. **Proxy Settings:**
   - Check if you're behind a corporate proxy
   - Configure proxy in `.env` if needed:
     ```env
     HTTP_PROXY=http://proxy.company.com:8080
     HTTPS_PROXY=http://proxy.company.com:8080
     ```

### Step 4: Verify Environment Variables

**Check your `.env` file location:**
```powershell
# Navigate to worker directory
cd worker

# Check if .env exists
Test-Path .env

# View Supabase URL (without exposing key)
Get-Content .env | Select-String "SUPABASE_URL"
```

**Expected format:**
```env
SUPABASE_URL=https://nvrrqvlqnnvlihtlgmzn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Common Mistakes:**
- ❌ Missing `https://` prefix
- ❌ Extra spaces: `SUPABASE_URL = https://...` (should be `SUPABASE_URL=https://...`)
- ❌ Using `anon` key instead of `service_role` key
- ❌ Project URL doesn't match your actual Supabase project

### Step 5: Check DNS Resolution

```powershell
# Test DNS resolution
Resolve-DnsName nvrrqvlqnnvlihtlgmzn.supabase.co

# Should return IP addresses
# If it fails, DNS issue
```

### Step 6: Test with curl (if available)

```powershell
# Test HTTPS connection
curl -v https://nvrrqvlqnnvlihtlgmzn.supabase.co/rest/v1/ -H "apikey: YOUR_ANON_KEY"
```

---

## 🛠️ Solutions

### Solution 1: Reactivate Supabase Project

If your project is paused:

1. Go to https://supabase.com/dashboard
2. Find project `nvrrqvlqnnvlihtlgmzn`
3. Click "Restore" or "Resume"
4. Wait 1-2 minutes for project to activate
5. Restart your application

### Solution 2: Update Supabase Credentials

If the project URL is wrong:

1. **Get correct credentials:**
   - Go to Supabase Dashboard → Your Project
   - Settings → API
   - Copy **Project URL** and **service_role key**

2. **Update `.env` file:**
   ```env
   SUPABASE_URL=https://YOUR-ACTUAL-PROJECT-ID.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-ACTUAL-KEY
   ```

3. **Restart the application:**
   ```powershell
   # Stop current process (Ctrl+C)
   # Then restart
   npm run dev
   ```

### Solution 3: Configure Proxy (if behind corporate firewall)

Add to `worker/.env`:
```env
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
NO_PROXY=localhost,127.0.0.1
```

### Solution 4: Use Local Supabase (Alternative)

If network issues persist, you can run Supabase locally:

```powershell
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Update .env to use local instance
SUPABASE_URL=http://localhost:54321
```

### Solution 5: Check Internet Connection

```powershell
# Test general internet connectivity
Test-NetConnection -ComputerName 8.8.8.8 -Port 53
Test-NetConnection -ComputerName google.com -Port 443
```

---

## 🔐 Gmail Login Issue

Gmail login depends on Supabase authentication. Once Supabase connection is fixed:

1. **Verify Supabase Auth is configured:**
   - Supabase Dashboard → Authentication → Providers
   - Ensure Google OAuth is enabled
   - Check redirect URLs are correct

2. **Check OAuth credentials:**
   ```env
   GOOGLE_OAUTH_CLIENT_ID=your-client-id
   GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
   ```

3. **Test authentication flow:**
   - Once Supabase is connected, Gmail login should work automatically

---

## 📊 Quick Diagnostic Checklist

Run these commands to diagnose:

```powershell
# 1. Check .env file exists
Test-Path worker\.env

# 2. Check Supabase URL format
Get-Content worker\.env | Select-String "SUPABASE_URL"

# 3. Test DNS resolution
Resolve-DnsName nvrrqvlqnnvlihtlgmzn.supabase.co

# 4. Test HTTPS connection
Invoke-WebRequest -Uri "https://nvrrqvlqnnvlihtlgmzn.supabase.co" -Method Get -TimeoutSec 10

# 5. Check if project is accessible
Start-Process "https://supabase.com/dashboard/project/nvrrqvlqnnvlihtlgmzn"
```

---

## 🚨 Most Common Issues

1. **Project Paused** (Free tier inactivity) → Reactivate in dashboard
2. **Wrong Project URL** → Update `.env` with correct URL
3. **Firewall Blocking** → Use VPN or configure proxy
4. **Wrong API Key** → Use `service_role` key, not `anon` key
5. **Network Connectivity** → Check internet connection

---

## 📞 Still Having Issues?

If none of the above solutions work:

1. **Check Supabase Status Page:** https://status.supabase.com/
2. **Check your Supabase project logs:** Dashboard → Logs
3. **Verify project is not deleted:** Check Supabase dashboard
4. **Try creating a new Supabase project** and update credentials

---

## ✅ Success Indicators

When fixed, you should see:

```
✅ Loaded .env from: worker\.env
📋 Environment Variables Status:
   Supabase URL: ✓ Set (https://nvrrqvlqnnvlihtlgmzn.supabase.co...) [from SUPABASE_URL]
   Supabase Key: ✓ Set (***hidden***) [from SUPABASE_SERVICE_ROLE_KEY]

✅ Server running on port 3001
✅ Ollama connected at http://ollama.ctrlchecks.ai:8000
```

**No more:**
- ❌ `TypeError: fetch failed`
- ❌ `ConnectTimeoutError`
- ❌ `ERR_CONNECTION_TIMED_OUT`
