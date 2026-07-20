# 🚀 Vercel Deployment Guide for Frontend

Complete guide to deploy the CtrlChecks frontend to Vercel and connect a custom domain.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Methods](#deployment-methods)
3. [Method 1: GitHub/GitLab Integration (Recommended)](#method-1-githubgitlab-integration-recommended)
4. [Method 2: Vercel CLI](#method-2-vercel-cli)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Custom Domain Configuration](#custom-domain-configuration)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- ✅ Vercel account ([Sign up here](https://vercel.com/signup))
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Frontend code in `ctrl_checks/` directory
- ✅ Production backend URLs (Worker API and FastAPI Ollama)

> ⚠️ **Before deploying**: Complete the [Pre-Deployment Checklist](./VERCEL_PRE_DEPLOYMENT_CHECKLIST.md) to avoid conflicts and deployment failures.

---

## Deployment Methods

You can deploy to Vercel using:
1. **GitHub/GitLab Integration** (Recommended) - Automatic deployments on push
2. **Vercel CLI** - Manual deployment from command line

---

## Method 1: GitHub/GitLab Integration (Recommended)

### Step 1: Push Code to Git Repository

Ensure your code is pushed to GitHub, GitLab, or Bitbucket:

```powershell
# If not already initialized
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 2: Import Project to Vercel

1. **Go to Vercel Dashboard**
   - Visit [https://vercel.com/new](https://vercel.com/new)
   - Sign in with your GitHub/GitLab/Bitbucket account

2. **Import Your Repository**
   - Click "Import" next to your repository
   - Or click "Add New..." → "Project" → Select your repository

3. **Configure Project Settings**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `ctrl_checks` ⚠️ **IMPORTANT**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default for Vite)
   - **Install Command**: `npm install` (default)

   **Project Settings:**
   ```
   Framework Preset: Vite
   Root Directory: ctrl_checks
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Click "Deploy"**

### Step 3: Configure Environment Variables

**Before the first deployment completes**, configure environment variables:

1. In the project import screen, click **"Environment Variables"**
2. Add the following variables (one by one):

   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
   VITE_API_URL=https://your-worker-api-domain.com
   VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
   VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
   VITE_PUBLIC_BASE_URL=https://your-vercel-domain.vercel.app
   VITE_USE_DIRECT_BACKEND=false
   ```

3. **Important**: Set each variable for **Production**, **Preview**, and **Development** environments
4. Click **"Deploy"** after adding variables

### Step 4: Wait for Deployment

- Vercel will automatically:
  - Install dependencies
  - Build your project
  - Deploy to a `.vercel.app` domain
- You'll see the deployment URL once complete

---

## Method 2: Vercel CLI

### Step 1: Install Vercel CLI

```powershell
npm install -g vercel
```

### Step 2: Login to Vercel

```powershell
vercel login
```

### Step 3: Navigate to Frontend Directory

```powershell
cd ctrl_checks
```

### Step 4: Deploy

**First Deployment (Production):**
```powershell
vercel --prod
```

**Preview Deployment:**
```powershell
vercel
```

### Step 5: Follow CLI Prompts

The CLI will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account/team
- **Link to existing project?** → No (first time)
- **Project name?** → `ctrlchecks-frontend` (or your choice)
- **Directory?** → `./` (current directory)
- **Override settings?** → No (uses `vercel.json`)

### Step 6: Set Environment Variables via CLI

```powershell
# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_API_URL production
vercel env add VITE_PYTHON_BACKEND_URL production
vercel env add VITE_OLLAMA_BASE_URL production
vercel env add VITE_PUBLIC_BASE_URL production
vercel env add VITE_USE_DIRECT_BACKEND production
```

**Or set via Dashboard:**
- Go to your project → Settings → Environment Variables
- Add each variable manually

---

## Environment Variables Setup

### Required Environment Variables

Configure these in **Vercel Dashboard** → **Project Settings** → **Environment Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_API_URL` | Worker API URL (production) | `https://api.ctrlchecks.ai` |
| `VITE_PYTHON_BACKEND_URL` | FastAPI Ollama URL | `http://ollama.ctrlchecks.ai:8000` |
| `VITE_OLLAMA_BASE_URL` | Ollama base URL | `http://ollama.ctrlchecks.ai:8000` |
| `VITE_PUBLIC_BASE_URL` | Your Vercel deployment URL | `https://ctrlchecks.ai` (or `https://app.ctrlchecks.ai`) |
| `VITE_USE_DIRECT_BACKEND` | Use direct backend (optional) | `false` |

### Setting Environment Variables

1. **Via Dashboard:**
   - Go to: **Project** → **Settings** → **Environment Variables**
   - Click **"Add New"**
   - Enter variable name and value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **"Save"**

2. **Via CLI:**
   ```powershell
   vercel env add VITE_SUPABASE_URL
   # Enter value when prompted
   # Select environments: Production, Preview, Development
   ```

### Important Notes

- ⚠️ **After adding/changing environment variables**, redeploy:
  - **Via Dashboard**: Go to **Deployments** → Click **"..."** → **"Redeploy"**
  - **Via CLI**: `vercel --prod`

- 🔒 **Never commit** `.env.local` files to Git
- ✅ Vercel automatically injects environment variables during build

---

## Custom Domain Configuration

### Step 1: Add Domain in Vercel

1. **Go to Project Settings**
   - Open your project in Vercel Dashboard
   - Navigate to **Settings** → **Domains**

2. **Add Your Domain**
   - Enter your domain: `ctrlchecks.ai` or `app.ctrlchecks.ai`
   - Click **"Add"**

3. **Choose Domain Type**
   - **Apex Domain** (e.g., `ctrlchecks.ai`)
   - **Subdomain** (e.g., `app.ctrlchecks.ai`)

### Step 2: Configure DNS Records

Vercel will show you the DNS records to add. Configure them in your domain registrar:

#### For Apex Domain (`ctrlchecks.ai`)

**Option A: A Records (Recommended)**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Option B: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### For Subdomain (`app.ctrlchecks.ai`)

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Step 3: Verify Domain

1. **Wait for DNS Propagation** (5-60 minutes)
2. **Check Status** in Vercel Dashboard
   - Status will change from "Pending" to "Valid"
3. **SSL Certificate** is automatically provisioned by Vercel

### Step 4: Update Environment Variables

After domain is connected, update:

```
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

Or if using a subdomain:

```
VITE_PUBLIC_BASE_URL=https://app.ctrlchecks.ai
```

Then **redeploy** the project.

---

## Post-Deployment Configuration

### 1. Update CORS Settings

Update your **Worker API** CORS settings to allow your Vercel domain:

**Worker `.env`:**
```env
CORS_ORIGIN=https://ctrlchecks.ai,https://app.ctrlchecks.ai,https://your-project.vercel.app
```

### 2. Update OAuth Redirect URLs

If using OAuth (e.g., LinkedIn), update redirect URLs:

**Supabase Dashboard** → **Authentication** → **URL Configuration**:
- Add: `https://ctrlchecks.ai/auth/callback`
- Add: `https://app.ctrlchecks.ai/auth/callback` (if using subdomain)
- Add: `https://your-project.vercel.app/auth/callback` (for preview deployments)

### 3. Test Deployment

1. Visit your Vercel deployment URL
2. Test authentication
3. Test API connections
4. Check browser console for errors

### 4. Enable Automatic Deployments

Vercel automatically deploys on:
- ✅ Push to `main` branch → Production
- ✅ Push to other branches → Preview
- ✅ Pull Requests → Preview

---

## Preventing Deployment Conflicts

### ✅ Pre-Deployment Checklist

**Before deploying, ensure:**

1. **Local Build Success**
   ```powershell
   cd ctrl_checks
   npm install
   npm run build
   ```
   - ✅ Build completes without errors
   - ✅ `dist/` folder is created
   - ✅ No TypeScript or linting errors

2. **Configuration Files**
   - ✅ `vercel.json` exists in `ctrl_checks/` directory
   - ✅ `.vercelignore` excludes unnecessary files
   - ✅ `.gitignore` excludes `.env.local` files

3. **Environment Variables Ready**
   - ✅ All `VITE_*` variables have production values
   - ✅ No `localhost` URLs in production variables
   - ✅ Values documented securely

4. **Git Repository**
   - ✅ All code committed and pushed
   - ✅ No sensitive files in repository
   - ✅ `.env.local` NOT committed

### 🚫 Common Causes of Deployment Rejects

**Build Failures:**
- ❌ Wrong root directory (must be `ctrl_checks`)
- ❌ Missing dependencies in `package.json`
- ❌ TypeScript errors not fixed
- ❌ Missing environment variables

**Runtime Errors:**
- ❌ Environment variables not set in Vercel
- ❌ Wrong API URLs (still pointing to localhost)
- ❌ CORS issues (backend not allowing Vercel domain)
- ❌ Missing Supabase configuration

**Configuration Conflicts:**
- ❌ Multiple `vercel.json` files
- ❌ Conflicting build commands
- ❌ Wrong output directory

### ✅ Quick Conflict Prevention

1. **Test Build Locally First**
   ```powershell
   cd ctrl_checks
   npm run build
   ```
   If this fails, fix errors before deploying.

2. **Verify Root Directory**
   In Vercel Dashboard → Project Settings → General:
   - Root Directory: `ctrl_checks` ⚠️ CRITICAL

3. **Set Environment Variables Before First Deploy**
   Add all variables in Vercel Dashboard before clicking "Deploy"

4. **Check `.gitignore`**
   Ensure `.env.local` and `.env.*.local` are ignored

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- ✅ Ensure `Root Directory` is set to `ctrl_checks`
- ✅ Check `package.json` exists in `ctrl_checks/`

**Error: "Environment variable not found"**
- ✅ Add all required `VITE_*` variables in Vercel Dashboard
- ✅ Redeploy after adding variables

**Error: "Build command failed"**
- ✅ Check build logs in Vercel Dashboard
- ✅ Test build locally: `cd ctrl_checks && npm run build`

### Domain Not Working

**DNS not resolving:**
- ✅ Wait 5-60 minutes for DNS propagation
- ✅ Verify DNS records are correct
- ✅ Use `nslookup ctrlchecks.ai` to check

**SSL Certificate pending:**
- ✅ Wait for automatic SSL provisioning (usually < 5 minutes)
- ✅ Check domain status in Vercel Dashboard

### API Connection Issues

**CORS errors:**
- ✅ Update Worker API `CORS_ORIGIN` to include Vercel domain
- ✅ Check `VITE_API_URL` is correct

**404 errors:**
- ✅ Verify `vercel.json` has SPA rewrite rules
- ✅ Check routes are configured correctly

### Environment Variables Not Working

**Variables not available:**
- ✅ Ensure variables are prefixed with `VITE_`
- ✅ Redeploy after adding/changing variables
- ✅ Check variable is set for correct environment (Production/Preview)

---

## Quick Reference

### Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Project imported to Vercel
- [ ] Root directory set to `ctrl_checks`
- [ ] All environment variables configured
- [ ] First deployment successful
- [ ] Custom domain added (if applicable)
- [ ] DNS records configured
- [ ] Domain verified in Vercel
- [ ] `VITE_PUBLIC_BASE_URL` updated
- [ ] Worker API CORS updated
- [ ] OAuth redirect URLs updated
- [ ] Application tested

### Useful Commands

```powershell
# Deploy to production
vercel --prod

# Deploy preview
vercel

# View deployments
vercel ls

# View logs
vercel logs

# Remove deployment
vercel remove
```

### Vercel Dashboard Links

- **Projects**: https://vercel.com/dashboard
- **Documentation**: https://vercel.com/docs
- **Support**: https://vercel.com/support

---

## Next Steps

After successful deployment:

1. ✅ Set up **custom domain** (if needed)
2. ✅ Configure **monitoring** and **analytics**
3. ✅ Set up **preview deployments** for branches
4. ✅ Configure **environment-specific** variables
5. ✅ Set up **automatic deployments** from Git

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Project Issues**: Check your project's issue tracker

---

## 📚 Related Documentation

- **[Pre-Deployment Checklist](./VERCEL_PRE_DEPLOYMENT_CHECKLIST.md)** - Complete checklist to prevent conflicts
- **[RUN_APPLICATION.md](../RUN_APPLICATION.md)** - Local development setup
- **[QUICK_START.md](../QUICK_START.md)** - Quick setup guide

---

**🎉 Your frontend is now deployed on Vercel!**
