# Quick Fix: Sign-In Redirect URLs

## Problem

When clicking "Sign In" on `https://www.ctrlchecks.ai`, it redirects to `http://localhost:8080` instead of staying on production.

---

## Root Cause

**Supabase redirect URLs are only configured for localhost.** Supabase needs to know that both production and development URLs are allowed.

---

## Quick Fix (5 minutes)

### Step 1: Update Supabase Redirect URLs

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com
   - Select your project
   - Go to: **Authentication** → **URL Configuration**

2. **Add Production URLs:**
   
   In the **Redirect URLs** field, add:
   ```
   https://ctrlchecks.ai/**
   https://www.ctrlchecks.ai/**
   https://*.vercel.app/**
   http://localhost:8080/**
   http://localhost:5173/**
   ```

3. **Save changes**

### Step 2: Update OAuth Provider Redirect URLs

**For each OAuth provider (Google, GitHub, LinkedIn, Facebook):**

1. Go to: **Authentication** → **Providers**
2. Click on **Google** (or other provider)
3. Scroll to **Redirect URLs** section
4. Add the same URLs:
   ```
   https://ctrlchecks.ai/**
   https://www.ctrlchecks.ai/**
   https://*.vercel.app/**
   http://localhost:8080/**
   http://localhost:5173/**
   ```
5. **Save**
6. Repeat for **GitHub**, **LinkedIn**, **Facebook**

### Step 3: Verify Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Select your project
   - Go to: **Settings** → **Environment Variables**

2. **Check/Add these variables for Production:**
   ```
   VITE_API_URL=https://worker.ctrlchecks.ai
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Make sure they're set for "Production" environment** (not Preview)

### Step 4: Test

1. **Visit:** `https://www.ctrlchecks.ai`
2. **Click "Sign In"**
3. **Should redirect to:** `https://www.ctrlchecks.ai/auth/google/callback` (or similar)
4. **Should NOT redirect to:** `http://localhost:8080`

---

## Why This Works

**Your code already uses `window.location.origin`:**

```typescript
const redirectUrl = `${window.location.origin}/auth/google/callback`;
```

**This automatically uses:**
- **Production:** `https://www.ctrlchecks.ai` ✅
- **Local Dev:** `http://localhost:8080` ✅

**The problem was:** Supabase didn't know production URLs were allowed, so it rejected them and fell back to localhost.

**The fix:** Tell Supabase both URLs are allowed, and it will accept whichever one is used.

---

## Development Workflow

### Working Locally

**File: `ctrl_checks/.env.local`** (create if doesn't exist)
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Start development:**
```bash
# Terminal 1: Backend
cd worker
npm run dev

# Terminal 2: Frontend
cd ctrl_checks
npm run dev
```

**Result:**
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3001`
- Sign-in redirects: `http://localhost:8080/auth/callback` ✅

### Deploying to Production

**No code changes needed!**

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Vercel automatically:**
   - Uses production environment variables
   - Deploys with `VITE_API_URL=https://worker.ctrlchecks.ai`
   - Sign-in redirects: `https://www.ctrlchecks.ai/auth/callback` ✅

---

## Complete Checklist

- [ ] Supabase URL Configuration includes production URLs
- [ ] Each OAuth provider (Google, GitHub, etc.) has production URLs in redirect list
- [ ] Vercel environment variables set for Production
- [ ] `.env.local` exists for local development
- [ ] Tested sign-in on production (should use production URL)
- [ ] Tested sign-in locally (should use localhost)

---

## Troubleshooting

### Still redirecting to localhost?

**Check:**
1. Supabase redirect URLs saved correctly
2. Vercel environment variables are for "Production" (not Preview)
3. Vercel deployment used Production environment

**Fix:**
- Redeploy on Vercel after updating environment variables
- Clear browser cache
- Try incognito/private window

### Can't sign in locally?

**Check:**
1. `.env.local` file exists
2. Backend is running on `localhost:3001`
3. Supabase redirect URLs include `http://localhost:8080/**`

---

**After these steps, sign-in should work correctly in both development and production!** ✅
