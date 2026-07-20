# LinkedIn Authentication - Quick Start Checklist

Use this checklist to quickly set up LinkedIn OAuth authentication.

---

## ✅ Pre-Setup Checklist

- [ ] LinkedIn account ready
- [ ] Access to LinkedIn Developer Portal
- [ ] Backend environment variables access
- [ ] Supabase project access

---

## 🔧 Setup Steps (15 minutes)

### 1. LinkedIn Developer App (5 min)

- [ ] Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
- [ ] Create new app
- [ ] Add redirect URLs:
  - [ ] `https://your-domain.com/auth/linkedin/callback` (production)
  - [ ] `http://localhost:5173/auth/linkedin/callback` (local)
- [ ] Verify products are available:
  - [ ] Sign In with LinkedIn using OpenID Connect (Default Tier - should already be added)
  - [ ] Share on LinkedIn (Default Tier - should already be added)
  
  **Note:** These products are typically available by default. The actual permissions (scopes) are requested during OAuth authorization.
- [ ] Copy **Client ID** and **Client Secret**

### 2. Backend Environment (2 min)

- [ ] Add to `worker/.env`:
  ```bash
  LINKEDIN_CLIENT_ID=your_client_id
  LINKEDIN_CLIENT_SECRET=your_client_secret
  ```
- [ ] Restart backend server

### 3. Supabase Configuration (3 min)

- [ ] Go to Supabase Dashboard → Authentication → Providers
- [ ] Enable **LinkedIn** provider
- [ ] Enter Client ID and Client Secret
- [ ] Add redirect URLs (same as above)
- [ ] Save

### 4. Test Connection (5 min)

- [ ] Start your frontend app
- [ ] Log in to CtrlChecks
- [ ] Open Connections panel
- [ ] Click **"Connect LinkedIn"**
- [ ] Authorize on LinkedIn
- [ ] Verify redirect back to CtrlChecks
- [ ] Check Connections panel shows **"LinkedIn Connected"** ✅

---

## 🧪 Verification

Test your setup:

```bash
# Test connection status
curl https://your-backend.com/api/connections/linkedin/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test LinkedIn API access
curl -X POST https://your-backend.com/api/connections/linkedin/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Both return `"success": true`

---

## 🚀 Next Steps

- [ ] Create a test workflow with LinkedIn node
- [ ] Test posting (use `dryRun: true` first)
- [ ] Verify token refresh works
- [ ] Monitor connection status

---

## 📚 Full Documentation

For detailed instructions, see: [LinkedIn Authentication Guide](./LINKEDIN_AUTHENTICATION_GUIDE.md)

---

## ⚠️ Common Issues

| Issue | Quick Fix |
|-------|-----------|
| 401/403 error | Check scopes in LinkedIn app |
| Redirect mismatch | Verify URLs match exactly |
| Token not found | User needs to reconnect |
| Refresh failing | Check `LINKEDIN_CLIENT_SECRET` env var |

---

**Time to complete:** ~15 minutes  
**Difficulty:** Easy
