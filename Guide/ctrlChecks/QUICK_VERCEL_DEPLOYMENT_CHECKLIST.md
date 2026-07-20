# 🚀 Quick Vercel Deployment Checklist - Frontend

**Simple step-by-step checklist for deploying CtrlChecks frontend to Vercel**

---

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub (repository: `ctrlchecks.ai`)
- [ ] Vercel account created (https://vercel.com)
- [ ] Worker backend deployed at `https://worker.ctrlchecks.ai` ✅ (Already done!)
- [ ] Domain `ctrlchecks.ai` available in Route 53

---

## 📦 STEP 1: Connect Repository to Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Click:** "Add New..." → "Project"
3. **Import:** Select your GitHub repository (`ctrlchecks.ai`)
4. **Authorize:** Allow Vercel to access your GitHub (if first time)

**✅ Check:** Repository connected

---

## ⚙️ STEP 2: Configure Project Settings

**In Vercel project configuration:**

1. **Project Name:** `ctrlchecks` (or your choice)
2. **Framework Preset:** `Vite` (or "Other")
3. **Root Directory:** `    ` ⚠️ **IMPORTANT: Set this!**
4. **Build Command:** `npm run build` (auto-detected)
5. **Output Directory:** `dist` (auto-detected)
6. **Install Command:** `npm install` (auto-detected)

**Click "Deploy"** (we'll add environment variables next)

**✅ Check:** First deployment starts (may fail without env vars, that's OK)

---

## 🔐 STEP 3: Add Environment Variables

**Go to:** Project Settings → Environment Variables

**Add these EXACT values (one by one):**

### Variable 1: Supabase URL
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://nvrrqvlqnnvlihtlgmzn.supabase.co`
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

### Variable 2: Supabase Key
- **Key:** `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cnJxdmxxbm52bGlodGxnbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQ5MDMsImV4cCI6MjA4MTA0MDkwM30.3So6zpF15ORuOF-R6YY2ya1XE9bTCjnsvAxf1B7HZMo`
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

### Variable 3: Worker API URL ⚠️ **CRITICAL**
- **Key:** `VITE_API_URL`
- **Value:** `https://worker.ctrlchecks.ai` ⚠️ **Use worker.ctrlchecks.ai (your backend)**
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

### Variable 4: Python Backend URL
- **Key:** `VITE_PYTHON_BACKEND_URL`
- **Value:** `http://ollama.ctrlchecks.ai:8000`
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

### Variable 5: Ollama Base URL
- **Key:** `VITE_OLLAMA_BASE_URL`
- **Value:** `http://ollama.ctrlchecks.ai:8000`
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

### Variable 6: Public Base URL
- **Key:** `VITE_PUBLIC_BASE_URL`
- **Value:** `https://ctrlchecks.ai`
- **Environment:** ✅ Production, ✅ Preview, ✅ Development

**✅ Check:** All 6 variables added

---

## 🚀 STEP 4: Redeploy with Environment Variables

1. **Go to:** Deployments tab
2. **Click:** "Redeploy" on latest deployment
3. **Or:** Push a new commit to trigger auto-deploy
4. **Wait:** 2-5 minutes for build

**✅ Check:** Deployment succeeds (green checkmark)

**Test:** Visit `https://ctrlchecks-xxxxx.vercel.app` (your Vercel URL)

---

## 🌐 STEP 5: Connect Domain (ctrlchecks.ai)

### 5.1: Add Domain in Vercel

1. **Go to:** Project Settings → **Domains**
2. **Click:** "Add Domain"
3. **Enter:** `ctrlchecks.ai`
4. **Click:** "Add"

**Vercel will show DNS configuration instructions.**

### 5.2: Configure DNS in Route 53

**Option A: Using A Record (Recommended)**

1. **Vercel shows an IP address** (e.g., `76.76.21.21`)
2. **Go to:** AWS Console → Route 53 → Hosted zones → **ctrlchecks.ai**
3. **Create A record:**
   - **Record name:** `@` (or leave blank)
   - **Record type:** `A`
   - **Value:** IP address from Vercel
   - **TTL:** `300`
   - **Click:** "Create records"

**Option B: Using CNAME (Alternative)**

1. **Vercel shows a CNAME** (e.g., `cname.vercel-dns.com`)
2. **Go to:** AWS Console → Route 53 → Hosted zones → **ctrlchecks.ai**
3. **Create CNAME record:**
   - **Record name:** `@` (or leave blank)
   - **Record type:** `CNAME`
   - **Value:** CNAME from Vercel
   - **TTL:** `300`
   - **Click:** "Create records"

**⚠️ Important:** If you already have an A record for `ctrlchecks.ai`, delete it first or use a subdomain.

### 5.3: Wait for DNS Propagation

**Wait 5-30 minutes**, then test:

```powershell
# From Windows PowerShell
nslookup ctrlchecks.ai
# Should show Vercel's IP or CNAME
```

### 5.4: Verify SSL Certificate

**Vercel automatically provisions SSL:**

1. **Wait 1-5 minutes** after DNS propagates
2. **Check Vercel Dashboard:** Domains section should show "Valid"
3. **Test:** Visit `https://ctrlchecks.ai` in browser
4. **Verify:** SSL certificate is valid (lock icon in browser)

**✅ Check:** Domain connected and HTTPS working

---

## ✅ STEP 6: Verify Everything Works

### Test Frontend

```powershell
# Test from Windows PowerShell
Invoke-RestMethod -Uri "https://ctrlchecks.ai" -Method Get

# Or open in browser
Start-Process "https://ctrlchecks.ai"
```

### Test API Connection

1. **Open browser:** `https://ctrlchecks.ai`
2. **Open Developer Console** (F12)
3. **Check for errors:**
   - Should NOT see CORS errors
   - Should NOT see "Failed to fetch" errors
   - Should see successful API calls to `worker.ctrlchecks.ai`

### Test Features

- [ ] Login/Signup works (Supabase connection)
- [ ] Workflow creation works (Worker API connection)
- [ ] AI features work (Ollama connection)

---

## 🔄 Update Deployment (When You Push New Code)

**Automatic (Recommended):**
- **Push to main branch** → Vercel auto-deploys
- No action needed!

**Manual:**
1. **Go to:** Vercel Dashboard → Deployments
2. **Click:** "Redeploy" on latest deployment

---

## 🐛 Quick Troubleshooting

### Build Fails?

**Check:**
- Root directory is set to `ctrl_checks`
- All environment variables are added
- Build command is `npm run build`

**Fix:**
```bash
# Test build locally first
cd ctrl_checks
npm install
npm run build
```

### API Connection Errors?

**Check:**
- `VITE_API_URL` is set to `https://worker.ctrlchecks.ai`
- Worker backend is running: `curl https://worker.ctrlchecks.ai/health`
- CORS is configured in Worker (should allow `https://ctrlchecks.ai`)

**Fix:**
1. Verify environment variables in Vercel
2. Redeploy after adding variables
3. Check Worker's `.env` has: `CORS_ORIGIN=https://ctrlchecks.ai`

### Domain Not Working?

**Check:**
- DNS records are correct in Route 53
- DNS has propagated (wait 30 minutes)
- SSL certificate is valid in Vercel

**Fix:**
```powershell
# Check DNS
nslookup ctrlchecks.ai

# Check SSL
Invoke-WebRequest -Uri "https://ctrlchecks.ai" -Method Get
```

---

## 📋 Environment Variables Summary

**Copy-paste ready list for Vercel:**

```
VITE_SUPABASE_URL=https://nvrrqvlqnnvlihtlgmzn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cnJxdmxxbm52bGlodGxnbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQ5MDMsImV4cCI6MjA4MTA0MDkwM30.3So6zpF15ORuOF-R6YY2ya1XE9bTCjnsvAxf1B7HZMo
VITE_API_URL=https://worker.ctrlchecks.ai
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

---

## 🎉 DONE! Your Frontend is Live!

**Your frontend URL:** `https://ctrlchecks.ai`

**Your backend URL:** `https://worker.ctrlchecks.ai` ✅ (Already deployed!)

**Test it:**
- Frontend: `https://ctrlchecks.ai`
- Backend Health: `https://worker.ctrlchecks.ai/health`

---

**📚 Full Guide:** See `01_VERCEL_DEPLOYMENT.md` for detailed instructions
