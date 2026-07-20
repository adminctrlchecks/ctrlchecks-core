# 🌐 Vercel Domain Setup for ctrlchecks.ai

Quick guide to connect your `ctrlchecks.ai` domain to Vercel.

---

## 📋 Prerequisites

- ✅ Vercel project deployed and running
- ✅ Domain `ctrlchecks.ai` registered
- ✅ Access to domain registrar DNS settings

---

## 🎯 Domain Options

You can use either:

1. **Apex Domain**: `ctrlchecks.ai` (root domain)
2. **Subdomain**: `app.ctrlchecks.ai` (recommended for frontend)

**Recommendation**: Use `app.ctrlchecks.ai` for the frontend to keep the apex domain free for other services.

---

## 🚀 Step-by-Step Setup

### Step 1: Add Domain in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your domain:
   - For subdomain: `app.ctrlchecks.ai`
   - For apex: `ctrlchecks.ai`
5. Click **"Add"**

### Step 2: Configure DNS Records

Vercel will show you the DNS records to add. Configure them in your domain registrar:

#### Option A: Subdomain (`app.ctrlchecks.ai`) - Recommended

**CNAME Record:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

#### Option B: Apex Domain (`ctrlchecks.ai`)

**A Records:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: A
Name: @
Value: 76.223.126.88
TTL: 3600
```

**OR CNAME (if your registrar supports it):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 3: Wait for DNS Propagation

- DNS changes can take 5-60 minutes to propagate
- Check status in Vercel Dashboard → Domains
- Status will change from "Pending" to "Valid"

### Step 4: SSL Certificate

- Vercel automatically provisions SSL certificates
- Usually takes < 5 minutes after DNS is verified
- Certificate is automatically renewed

### Step 5: Update Environment Variables

After domain is verified, update in Vercel Dashboard:

**For Subdomain (`app.ctrlchecks.ai`):**
```
VITE_PUBLIC_BASE_URL=https://app.ctrlchecks.ai
```

**For Apex Domain (`ctrlchecks.ai`):**
```
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

Then **redeploy** your project.

---

## 🔧 Post-Domain Configuration

### 1. Update Worker API CORS

Update your Worker service `.env`:

```env
CORS_ORIGIN=https://app.ctrlchecks.ai,https://ctrlchecks.ai,https://your-project.vercel.app
```

### 2. Update Supabase Redirect URLs

In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

Add these redirect URLs:
- `https://app.ctrlchecks.ai/auth/callback`
- `https://app.ctrlchecks.ai/auth/google/callback`
- `https://app.ctrlchecks.ai/auth/linkedin/callback`
- `https://your-project.vercel.app/auth/callback` (for preview deployments)

### 3. Test Your Domain

1. Visit `https://app.ctrlchecks.ai` (or `https://ctrlchecks.ai`)
2. Check browser console for errors
3. Test authentication flows
4. Verify API connections

---

## 🔍 DNS Verification

Check if DNS is configured correctly:

```powershell
# Check CNAME record (for subdomain)
nslookup app.ctrlchecks.ai

# Check A records (for apex)
nslookup ctrlchecks.ai
```

Expected results:
- **CNAME**: Should point to `cname.vercel-dns.com`
- **A Records**: Should point to Vercel IPs (76.76.21.21, etc.)

---

## ⚠️ Troubleshooting

### Domain Not Resolving

- ✅ Wait 5-60 minutes for DNS propagation
- ✅ Verify DNS records are correct in your registrar
- ✅ Check TTL settings (lower TTL = faster updates)
- ✅ Clear DNS cache: `ipconfig /flushdns` (Windows)

### SSL Certificate Pending

- ✅ Wait for automatic provisioning (< 5 minutes)
- ✅ Check domain status in Vercel Dashboard
- ✅ Ensure DNS records are correct

### 404 Errors

- ✅ Verify `vercel.json` has SPA rewrite rules
- ✅ Check routes are configured in React Router
- ✅ Ensure `index.html` exists

### CORS Errors

- ✅ Update Worker API `CORS_ORIGIN` to include your domain
- ✅ Check `VITE_API_URL` is correct
- ✅ Verify backend is accessible

---

## 📝 Quick Reference

### DNS Records Summary

**For `app.ctrlchecks.ai`:**
```
CNAME  app  →  cname.vercel-dns.com
```

**For `ctrlchecks.ai`:**
```
A  @  →  76.76.21.21
A  @  →  76.223.126.88
```

### Environment Variables

```env
VITE_PUBLIC_BASE_URL=https://app.ctrlchecks.ai
VITE_API_URL=https://api.ctrlchecks.ai
```

### Worker CORS

```env
CORS_ORIGIN=https://app.ctrlchecks.ai,https://ctrlchecks.ai
```

---

## ✅ Checklist

- [ ] Domain added in Vercel Dashboard
- [ ] DNS records configured in registrar
- [ ] DNS propagation complete (status: Valid)
- [ ] SSL certificate provisioned
- [ ] `VITE_PUBLIC_BASE_URL` updated
- [ ] Project redeployed
- [ ] Worker API CORS updated
- [ ] Supabase redirect URLs updated
- [ ] Domain tested and working

---

**🎉 Your domain `ctrlchecks.ai` is now connected to Vercel!**
