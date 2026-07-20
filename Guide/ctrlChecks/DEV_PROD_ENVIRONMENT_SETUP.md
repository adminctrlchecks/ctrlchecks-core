# Development vs Production Environment Setup

## Problem

When you click "Sign In" on production (`ctrlchecks.ai`), it redirects to `http://localhost:8080` instead of staying on the production domain.

**Root Cause:**
1. Supabase redirect URLs are configured only for localhost
2. Environment variables might not be set correctly in Vercel
3. Need separate configurations for dev vs production

---

## Solution: Proper Environment Configuration

### Step 1: Configure Supabase Redirect URLs

**Go to Supabase Dashboard:**
1. Visit: https://app.supabase.com
2. Select your project
3. Go to: **Authentication** → **URL Configuration**

**Add these Redirect URLs:**

```
# Production URLs
https://ctrlchecks.ai/**
https://www.ctrlchecks.ai/**
https://ctrlchecks-002.vercel.app/**

# Development URLs (for local testing)
http://localhost:5173/**
http://localhost:8080/**
http://127.0.0.1:5173/**
http://127.0.0.1:8080/**
```

**For each OAuth provider (Google, GitHub, LinkedIn, Facebook):**
1. Go to: **Authentication** → **Providers**
2. Click on each provider (Google, GitHub, etc.)
3. In **Redirect URLs** section, add all the URLs above
4. Save changes

---

### Step 2: Configure Vercel Environment Variables

**Go to Vercel Dashboard:**
1. Visit: https://vercel.com
2. Select your project: `ctrlchecks` (or your project name)
3. Go to: **Settings** → **Environment Variables**

**Add/Update these variables for Production:**

```env
# Backend API URL (Production)
VITE_API_URL=https://worker.ctrlchecks.ai

# Supabase URLs (Production - same for both)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Public Base URL (Production)
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

**Important:** Make sure these are set for **Production** environment (not Preview or Development).

**To set for Production only:**
- When adding variable, select **Production** from the environment dropdown
- Or use the environment selector: `Production`, `Preview`, `Development`

---

### Step 3: Local Development Environment

**Create/Update `.env.local` file in `ctrl_checks/` directory:**

```env
# Backend API URL (Local Development)
VITE_API_URL=http://localhost:3001

# Supabase URLs (Same for both dev and prod)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Public Base URL (Local Development)
VITE_PUBLIC_BASE_URL=http://localhost:8080
```

**Note:** `.env.local` is for local development only and should NOT be committed to git.

---

### Step 4: How It Works

**The code uses `window.location.origin` for redirects:**

```typescript
// This automatically uses the current domain
const redirectUrl = `${window.location.origin}/auth/google/callback`;
```

**So:**
- **Production:** `window.location.origin` = `https://www.ctrlchecks.ai`
- **Local Dev:** `window.location.origin` = `http://localhost:8080`

**This is correct!** The issue is Supabase needs to know both URLs are allowed.

---

## Complete Environment Setup

### Production (Vercel)

**Environment Variables in Vercel:**

| Variable | Value | Environment |
|----------|-------|------------|
| `VITE_API_URL` | `https://worker.ctrlchecks.ai` | Production |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Production |
| `VITE_PUBLIC_BASE_URL` | `https://ctrlchecks.ai` | Production |

### Local Development

**File: `ctrl_checks/.env.local`**

```env
# Backend API (Local)
VITE_API_URL=http://localhost:3001

# Supabase (Same as production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Public Base URL (Local)
VITE_PUBLIC_BASE_URL=http://localhost:8080
```

---

## Workflow: Development vs Production

### Working on Local Development

1. **Start local backend:**
   ```bash
   cd worker
   npm run dev
   # Backend runs on http://localhost:3001
   ```

2. **Start local frontend:**
   ```bash
   cd ctrl_checks
   npm run dev
   # Frontend runs on http://localhost:8080
   ```

3. **Use `.env.local`:**
   - Automatically uses `http://localhost:3001` for backend
   - Redirects use `http://localhost:8080`
   - Supabase allows both URLs

### Deploying to Production

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Vercel automatically deploys:**
   - Uses environment variables from Vercel dashboard
   - Uses `https://worker.ctrlchecks.ai` for backend
   - Redirects use `https://www.ctrlchecks.ai`
   - Supabase allows production URLs

3. **No code changes needed!**
   - Environment variables handle the difference
   - `window.location.origin` automatically uses correct domain

---

## Fixing the Current Issue

### Step 1: Update Supabase Redirect URLs

**In Supabase Dashboard:**

1. **Authentication** → **URL Configuration**
   - Add: `https://ctrlchecks.ai/**`
   - Add: `https://www.ctrlchecks.ai/**`
   - Add: `https://*.vercel.app/**` (for preview deployments)

2. **For each OAuth provider:**
   - **Authentication** → **Providers** → **Google**
   - **Redirect URLs:** Add production URLs
   - Repeat for GitHub, LinkedIn, Facebook

### Step 2: Verify Vercel Environment Variables

**In Vercel Dashboard:**

1. **Settings** → **Environment Variables**
2. Check `VITE_API_URL` is set to `https://worker.ctrlchecks.ai` for **Production**
3. If missing or wrong, add/update it

### Step 3: Redeploy on Vercel

**After updating environment variables:**

1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger deployment

---

## Best Practices

### 1. Never Hardcode URLs

**❌ Bad:**
```typescript
const backendUrl = 'http://localhost:3001'; // Hardcoded!
```

**✅ Good:**
```typescript
const backendUrl = getBackendUrl(); // Uses environment variable
const redirectUrl = `${window.location.origin}/auth/callback`; // Uses current domain
```

### 2. Use Environment Variables

**Always use:**
- `VITE_API_URL` for backend URL
- `window.location.origin` for redirect URLs
- Environment-specific configs

### 3. Separate Configs

**Development:**
- `.env.local` (not committed to git)
- Uses `localhost` URLs

**Production:**
- Vercel environment variables
- Uses production URLs

### 4. Test Both Environments

**Before deploying:**
- Test locally with `.env.local`
- Verify production URLs in Supabase
- Test production deployment

---

## Troubleshooting

### Issue: Still redirecting to localhost in production

**Check:**
1. Supabase redirect URLs include production domain
2. Vercel environment variables are set for Production
3. Vercel deployment used Production environment variables

**Fix:**
```bash
# Check Vercel environment variables
# Go to: Vercel Dashboard → Settings → Environment Variables
# Verify VITE_API_URL is set for Production

# Redeploy
# Vercel Dashboard → Deployments → Redeploy
```

### Issue: Can't sign in locally

**Check:**
1. `.env.local` file exists in `ctrl_checks/` directory
2. Backend is running on `http://localhost:3001`
3. Supabase redirect URLs include `http://localhost:8080/**`

**Fix:**
```bash
# Create .env.local if missing
cd ctrl_checks
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PUBLIC_BASE_URL=http://localhost:8080
EOF

# Restart dev server
npm run dev
```

### Issue: Environment variables not working

**Check build-time vs runtime:**

Vite environment variables are embedded at **build time**, not runtime.

**Solution:**
- Update environment variables in Vercel
- Redeploy (new build) to pick up changes
- Or use Vercel's environment variable preview

---

## Quick Reference

### Local Development Setup

```bash
# 1. Create .env.local
cd ctrl_checks
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PUBLIC_BASE_URL=http://localhost:8080
EOF

# 2. Start backend
cd ../worker
npm run dev

# 3. Start frontend (in new terminal)
cd ctrl_checks
npm run dev
```

### Production Setup

**Vercel Environment Variables:**
- `VITE_API_URL` = `https://worker.ctrlchecks.ai`
- `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
- `VITE_PUBLIC_BASE_URL` = `https://ctrlchecks.ai`

**Supabase Redirect URLs:**
- `https://ctrlchecks.ai/**`
- `https://www.ctrlchecks.ai/**`
- `http://localhost:8080/**` (for local testing)

---

## Summary

**The Solution:**
1. ✅ Configure Supabase to allow both production and development URLs
2. ✅ Use environment variables for backend URL (different for dev vs prod)
3. ✅ Use `window.location.origin` for redirects (automatically correct)
4. ✅ Separate configs: `.env.local` for dev, Vercel env vars for prod

**Result:**
- **Production:** Uses `https://www.ctrlchecks.ai` automatically
- **Local Dev:** Uses `http://localhost:8080` automatically
- **No code changes needed** when switching between environments!

---

**Your workflow:**
1. Work locally with `.env.local` → Uses localhost
2. Push to GitHub → Vercel deploys
3. Vercel uses production env vars → Uses production URLs
4. Both work without changing code! ✅
