# ✅ Vercel Pre-Deployment Checklist

Use this checklist to ensure a smooth deployment without conflicts or rejects.

---

## 🔍 Pre-Deployment Checks

### 1. Code Quality
- [ ] **No TypeScript errors**: Run `npm run build` locally - should complete without errors
- [ ] **No linting errors**: Run `npm run lint` - should pass
- [ ] **All imports resolved**: No missing dependencies
- [ ] **No console errors**: Check browser console for runtime errors

### 2. Build Configuration
- [ ] **`vercel.json` exists** in `ctrl_checks/` directory
- [ ] **`package.json` has build script**: `"build": "vite build"`
- [ ] **Build output directory**: Should be `dist/` (Vite default)
- [ ] **Test build locally**: `cd ctrl_checks && npm run build` succeeds

### 3. Environment Variables
- [ ] **All required variables identified**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_API_URL` (production URL)
  - `VITE_PYTHON_BACKEND_URL`
  - `VITE_OLLAMA_BASE_URL`
  - `VITE_PUBLIC_BASE_URL`
- [ ] **Production URLs ready**: No `localhost` references in production vars
- [ ] **Values documented**: Keep a secure copy of all values

### 4. Git Repository
- [ ] **Code committed**: All changes committed to Git
- [ ] **Pushed to remote**: Code pushed to GitHub/GitLab/Bitbucket
- [ ] **`.env.local` NOT committed**: Check `.gitignore` includes `.env*`
- [ ] **Sensitive files excluded**: No API keys, secrets in code

### 5. Dependencies
- [ ] **`package.json` up to date**: All dependencies listed
- [ ] **`package-lock.json` committed**: Ensures consistent installs
- [ ] **No peer dependency warnings**: Check `npm install` output
- [ ] **Node version compatible**: Vercel uses Node 18+ by default

### 6. File Structure
- [ ] **Root directory correct**: Frontend code in `ctrl_checks/`
- [ ] **`index.html` exists**: Entry point for Vite
- [ ] **Public assets in place**: Images, fonts, etc. in `public/`
- [ ] **No conflicting configs**: Only one `vercel.json` in root

---

## 🚀 Deployment Steps

### Step 1: Local Build Test
```powershell
cd ctrl_checks
npm install
npm run build
```

**Expected Result**: 
- ✅ Build completes successfully
- ✅ `dist/` folder created
- ✅ No errors in console

**If build fails**: Fix errors before deploying

### Step 2: Verify Vercel Configuration
Check `ctrl_checks/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Step 3: Prepare Environment Variables
Create a list of all environment variables with production values:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_API_URL=https://api.yourdomain.com
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
VITE_PUBLIC_BASE_URL=https://your-app.vercel.app
VITE_USE_DIRECT_BACKEND=false
```

### Step 4: Deploy to Vercel

**Option A: Via Dashboard**
1. Go to https://vercel.com/new
2. Import your repository
3. **Set Root Directory**: `ctrl_checks` ⚠️ CRITICAL
4. **Add Environment Variables** before deploying
5. Click "Deploy"

**Option B: Via CLI**
```powershell
cd ctrl_checks
vercel login
vercel --prod
```

### Step 5: Monitor Deployment
- Watch build logs in Vercel Dashboard
- Check for any errors
- Verify build completes successfully

---

## ⚠️ Common Issues & Solutions

### Issue: Build Fails - "Module not found"
**Solution**:
- ✅ Check `Root Directory` is set to `ctrl_checks`
- ✅ Verify `package.json` exists in `ctrl_checks/`
- ✅ Run `npm install` locally to verify dependencies

### Issue: Build Fails - "Environment variable not found"
**Solution**:
- ✅ Add all `VITE_*` variables in Vercel Dashboard
- ✅ Set for Production, Preview, and Development
- ✅ Redeploy after adding variables

### Issue: 404 Errors on Routes
**Solution**:
- ✅ Verify `vercel.json` has SPA rewrite rules
- ✅ Check routes are configured in React Router
- ✅ Ensure `index.html` exists

### Issue: API Connection Errors
**Solution**:
- ✅ Verify `VITE_API_URL` points to production backend
- ✅ Check CORS settings on backend
- ✅ Ensure backend is accessible from Vercel

### Issue: Supabase Connection Fails
**Solution**:
- ✅ Verify `VITE_SUPABASE_URL` is correct
- ✅ Check `VITE_SUPABASE_PUBLISHABLE_KEY` is the anon key (not service role)
- ✅ Update Supabase redirect URLs

---

## 🔒 Security Checklist

- [ ] **No secrets in code**: All sensitive data in environment variables
- [ ] **`.env.local` in `.gitignore`**: Never commit environment files
- [ ] **Public keys only**: Frontend uses publishable/anon keys, not service role keys
- [ ] **CORS configured**: Backend allows only your Vercel domain
- [ ] **HTTPS enabled**: Vercel automatically provides SSL

---

## 📊 Post-Deployment Verification

After deployment, verify:

1. **Application loads**: Visit your Vercel URL
2. **No console errors**: Check browser DevTools
3. **Authentication works**: Test sign in/sign up
4. **API calls succeed**: Test workflow creation/execution
5. **Routes work**: Navigate between pages
6. **Assets load**: Images, fonts, etc. display correctly

---

## 🎯 Quick Deployment Command Reference

```powershell
# 1. Test build locally
cd ctrl_checks
npm run build

# 2. Deploy to Vercel (first time)
vercel login
vercel --prod

# 3. Set environment variables
vercel env add VITE_SUPABASE_URL production
# (Repeat for each variable)

# 4. Redeploy after env changes
vercel --prod

# 5. View deployment logs
vercel logs
```

---

## 📝 Notes

- **Root Directory**: Must be `ctrl_checks` in Vercel project settings
- **Build Command**: `npm run build` (default, but verify)
- **Output Directory**: `dist` (Vite default)
- **Node Version**: Vercel auto-detects from `package.json` or uses Node 18+
- **Environment Variables**: Must be prefixed with `VITE_` to be available in frontend

---

**✅ Complete this checklist before deploying to avoid conflicts and rejects!**
