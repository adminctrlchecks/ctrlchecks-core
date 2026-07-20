# CtrlChecks Frontend - Vercel Deployment Guide

**Complete step-by-step guide for deploying CtrlChecks frontend to Vercel**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Post-Deployment](#post-deployment)
5. [Troubleshooting](#troubleshooting)
6. [Cost Summary](#cost-summary)

---

## Overview

### What We're Building

- **Service:** CtrlChecks Frontend (React/Vite)
- **Platform:** Vercel (Static Site Hosting)
- **Domain:** `ctrlchecks.ai` (optional, can use Vercel subdomain)
- **Build:** Static React application
- **Cost:** Free tier available, Pro for custom domains

### Architecture

```
GitHub Repository
    ↓
Vercel (Auto-deploy on push)
    ↓
CDN Distribution
    ↓
Users (Browser)
```

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Vercel Account** (sign up at https://vercel.com)
- ✅ **GitHub Account** with repository access
- ✅ **CtrlChecks repository** pushed to GitHub
- ✅ **Worker API** deployed (for connection)
- ✅ **FastAPI Ollama** deployed (for connection)
- ✅ **Supabase project** configured

---

## Step-by-Step Deployment

### Step 1: Prepare Repository ⏱️ 10 minutes

#### 1.1: Verify Build Configuration

**Check `ctrl_checks/package.json`:**

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Check `ctrl_checks/vite.config.ts`:**

Ensure it's configured for production builds.

#### 1.2: Verify Vercel Configuration

**Check `ctrl_checks/vercel.json` exists:**

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures React Router works correctly with Vercel.

#### 1.3: Push to GitHub

```bash
# Navigate to project root
cd ctrl_checks

# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"

# Push to GitHub
git push origin main
```

**✅ Checkpoint:** Code pushed to GitHub

---

### Step 2: Connect Repository to Vercel ⏱️ 10 minutes

#### 2.1: Import Project

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New..."** → **"Project"**
3. **Import Git Repository**: Select your GitHub repository
4. **Authorize Vercel** (if first time) to access your GitHub account

#### 2.2: Configure Project Settings

**Project Name:** `ctrlchecks` (or your preferred name)

**Framework Preset:** 
- Select **"Vite"** (or "Other" if Vite not listed)

**Root Directory:**
- **Important:** Set to `ctrl_checks` (the frontend directory)
- Click **"Edit"** next to Root Directory
- Enter: `ctrl_checks`

**Build Command:**
- `npm run build` (default, should auto-detect)

**Output Directory:**
- `dist` (default for Vite)

**Install Command:**
- `npm install` (default)

**✅ Checkpoint:** Project configured

---

### Step 3: Configure Environment Variables ⏱️ 15 minutes

**Before deploying, set environment variables:**

#### 3.1: Add Environment Variables in Vercel

1. **In Vercel project settings**, go to **"Settings"** → **"Environment Variables"**
2. **Add each variable** (see list below)

#### 3.2: Required Environment Variables

**📝 IMPORTANT: Copy these EXACT values into Vercel Environment Variables**

**Supabase Configuration:**
```
VITE_SUPABASE_URL=https://nvrrqvlqnnvlihtlgmzn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cnJxdmxxbm52bGlodGxnbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQ5MDMsImV4cCI6MjA4MTA0MDkwM30.3So6zpF15ORuOF-R6YY2ya1XE9bTCjnsvAxf1B7HZMo
```

**Worker API Configuration (Your Backend):**
```
VITE_API_URL=https://worker.ctrlchecks.ai
```

**FastAPI Ollama Configuration:**
```
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
```

**Public Base URL:**
```
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

**Optional Configuration:**
```
VITE_USE_DIRECT_BACKEND=false
```

**📝 How to Add in Vercel:**
1. Go to: **Project Settings** → **Environment Variables**
2. Click **"Add New"**
3. For each variable:
   - **Key:** `VITE_SUPABASE_URL` (or other variable name)
   - **Value:** `https://nvrrqvlqnnvlihtlgmzn.supabase.co` (or other value)
   - **Environment:** Select **Production**, **Preview**, and **Development** (check all)
4. Click **"Save"**
5. Repeat for all variables above

#### 3.3: Set Environment for All Environments

- **Production:** ✅ Check
- **Preview:** ✅ Check (optional, for testing)
- **Development:** ✅ Check (optional)

**✅ Checkpoint:** Environment variables configured

---

### Step 4: Deploy to Vercel ⏱️ 5 minutes

#### 4.1: Deploy

1. **Click "Deploy"** button in Vercel
2. **Wait for build** (usually 2-5 minutes)
3. **Monitor build logs** for any errors

#### 4.2: Verify Deployment

**After deployment completes:**

1. **Click on deployment** to view details
2. **Visit deployment URL** (e.g., `ctrlchecks.vercel.app`)
3. **Verify application loads** correctly

**✅ Checkpoint:** Deployment successful

---

### Step 5: Configure Custom Domain (ctrlchecks.ai) ⏱️ 30 minutes

**📝 IMPORTANT: You need to connect your domain `ctrlchecks.ai` to Vercel**

#### 5.1: Add Domain in Vercel

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **"Domains"**
2. **Click "Add Domain"**
3. **Enter domain:** `ctrlchecks.ai`
4. **Click "Add"**

**Vercel will show you DNS configuration options.**

#### 5.2: Configure DNS in Route 53

**You have two options. Choose the one that works best for you:**

**Option A: Using A Record (Recommended if you want to keep Route 53)**

1. **Vercel will show you an IP address** (e.g., `76.76.21.21`)
2. **Go to AWS Console** → **Route 53** → **Hosted zones** → **ctrlchecks.ai**
3. **Create A record:**
   - **Record name:** `@` (or leave blank for root domain)
   - **Record type:** `A`
   - **Value:** The IP address Vercel provided
   - **TTL:** `300`
   - Click **"Create records"**

**Option B: Using CNAME Record (Alternative)**

1. **Vercel will show you a CNAME value** (e.g., `cname.vercel-dns.com`)
2. **Go to AWS Console** → **Route 53** → **Hosted zones** → **ctrlchecks.ai**
3. **Create CNAME record:**
   - **Record name:** `@` (or leave blank for root domain)
   - **Record type:** `CNAME`
   - **Value:** The CNAME value Vercel provided
   - **TTL:** `300`
   - Click **"Create records"**

**📝 Note:** If you already have an A record for `ctrlchecks.ai` pointing to something else, you may need to:
- Delete the old A record first, OR
- Use a subdomain like `www.ctrlchecks.ai` for Vercel

#### 5.3: Verify DNS Propagation

**Wait 5-30 minutes for DNS to propagate, then check:**

```powershell
# From Windows PowerShell
nslookup ctrlchecks.ai

# Should show Vercel's IP address or CNAME
```

**Or use online tool:** https://dnschecker.org

#### 5.4: Verify SSL Certificate

**Vercel automatically provisions SSL certificates:**

1. **Wait 1-5 minutes** after DNS propagates
2. **Vercel will show "Valid"** status in Domains section
3. **Test HTTPS:** Visit `https://ctrlchecks.ai` in browser
4. **Check certificate:** Should show valid SSL certificate

**✅ Checkpoint:** Custom domain configured and SSL active

#### 5.5: Test Your Deployment

```powershell
# Test from Windows PowerShell
Invoke-RestMethod -Uri "https://ctrlchecks.ai" -Method Get

# Or open in browser
Start-Process "https://ctrlchecks.ai"
```

---

## Post-Deployment

### Verify Deployment

#### 1. Test Frontend

```bash
# Visit your deployment URL
https://ctrlchecks.ai

# Or Vercel subdomain
https://ctrlchecks.vercel.app
```

#### 2. Test API Connections

1. **Open browser console** (F12)
2. **Check for errors** related to API connections
3. **Test workflow creation** to verify Worker API connection
4. **Test AI features** to verify FastAPI Ollama connection

#### 3. Test React Router

- Navigate to different routes
- Verify they load correctly
- Check that browser refresh works on sub-routes

### Monitor Deployments

**Vercel Dashboard:**
- View all deployments
- Check build logs
- Monitor performance metrics
- View analytics

### Update Deployment

**Automatic (Recommended):**
- **Push to main branch** → Auto-deploys
- Vercel watches for changes and auto-deploys

**Manual:**
1. **Go to Vercel Dashboard**
2. **Click "Redeploy"** on latest deployment
3. **Or trigger new deployment** from GitHub

---

## Troubleshooting

### Issue: Build Fails

**Check build logs:**
1. **Go to deployment** in Vercel
2. **Click "View Build Logs"**
3. **Look for errors**

**Common issues:**
- Missing environment variables
- Build command incorrect
- Root directory incorrect
- TypeScript errors

**Solution:**
```bash
# Test build locally first
cd ctrl_checks
npm run build

# Fix any errors locally
# Then push to GitHub
```

### Issue: Environment Variables Not Working

**Check:**
1. Variables are set in Vercel dashboard
2. Variables are prefixed with `VITE_` (required for Vite)
3. Variables are set for correct environment (Production/Preview)

**Solution:**
1. **Re-deploy** after adding variables
2. **Check variable names** match exactly (case-sensitive)
3. **Verify no typos** in variable values

### Issue: API Connection Errors

**Check:**
1. Worker API is accessible: `curl https://worker.ctrlchecks.ai/health`
2. FastAPI Ollama is accessible: `curl http://ollama.ctrlchecks.ai:8000/health`
3. Environment variables are correct in Vercel (especially `VITE_API_URL`)
4. CORS is configured correctly in Worker

**Solution:**
```bash
# Test API endpoints
curl https://worker.ctrlchecks.ai/health
curl http://ollama.ctrlchecks.ai:8000/health

# Check CORS in Worker
# Should allow: https://ctrlchecks.ai
# Check worker .env file has: CORS_ORIGIN=https://ctrlchecks.ai
```

**Common Issues:**
- **Wrong API URL:** Make sure `VITE_API_URL=https://worker.ctrlchecks.ai` (not `api.ctrlchecks.ai`)
- **CORS Error:** Check Worker's `.env` has `CORS_ORIGIN=https://ctrlchecks.ai`
- **Environment variables not loaded:** Redeploy after adding variables in Vercel

### Issue: React Router Not Working

**Check:**
1. `vercel.json` exists with rewrites configuration
2. Rewrites are correct

**Solution:**
```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Issue: Custom Domain Not Working

**Check:**
1. DNS records are correct
2. DNS has propagated (can take up to 48 hours)
3. SSL certificate is provisioned

**Solution:**
```bash
# Check DNS resolution
dig ctrlchecks.ai +short

# Check SSL certificate
curl -I https://ctrlchecks.ai
```

---

## Cost Summary

### Vercel Pricing

| Plan | Cost | Features |
|------|------|----------|
| **Hobby (Free)** | $0 | Unlimited deployments, Vercel subdomain |
| **Pro** | $20/month | Custom domains, team collaboration |
| **Enterprise** | Custom | Advanced features, support |

### Free Tier Includes

- ✅ Unlimited deployments
- ✅ Automatic SSL
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Analytics (limited)

### Pro Tier Adds

- ✅ Custom domains
- ✅ Team collaboration
- ✅ Advanced analytics
- ✅ Password protection
- ✅ Priority support

**For production, Pro tier is recommended** for custom domain support.

---

## Quick Reference

### Important URLs

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Settings:** https://vercel.com/[username]/[project]/settings
- **Deployment URL:** `https://ctrlchecks.vercel.app` (or custom domain)

### Important Commands

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# View deployments
vercel ls
```

### Environment Variables Checklist

**Copy these EXACT values into Vercel:**

- [ ] `VITE_SUPABASE_URL` = `https://nvrrqvlqnnvlihtlgmzn.supabase.co`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cnJxdmxxbm52bGlodGxnbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQ5MDMsImV4cCI6MjA4MTA0MDkwM30.3So6zpF15ORuOF-R6YY2ya1XE9bTCjnsvAxf1B7HZMo`
- [ ] `VITE_API_URL` = `https://worker.ctrlchecks.ai` ⚠️ **IMPORTANT: Use worker.ctrlchecks.ai**
- [ ] `VITE_PYTHON_BACKEND_URL` = `http://ollama.ctrlchecks.ai:8000`
- [ ] `VITE_OLLAMA_BASE_URL` = `http://ollama.ctrlchecks.ai:8000`
- [ ] `VITE_PUBLIC_BASE_URL` = `https://ctrlchecks.ai`

---

## Next Steps

After successful deployment:

1. **Test all features** end-to-end
2. **Configure monitoring** (Vercel Analytics)
3. **Set up error tracking** (Sentry, etc.)
4. **Connect services** (see Service Connection Guide)
5. **Set up CI/CD** (automatic deployments)

---

## Best Practices

### 1. Environment Variables

- **Never commit** `.env` files to Git
- **Use Vercel dashboard** for environment variables
- **Prefix with `VITE_`** for Vite to expose them

### 2. Build Optimization

- **Enable build caching** in Vercel
- **Optimize images** before uploading
- **Use code splitting** for large apps

### 3. Performance

- **Enable Vercel Analytics** to monitor performance
- **Use Vercel Speed Insights** for real user metrics
- **Optimize bundle size** with tree-shaking

### 4. Security

- **Use HTTPS** (automatic with Vercel)
- **Keep dependencies updated**
- **Use environment variables** for secrets

---

**🎉 Congratulations! Your frontend is deployed on Vercel!**

**Next:** Configure service connections (see `Guide/02_SERVICE_CONNECTION.md`)
