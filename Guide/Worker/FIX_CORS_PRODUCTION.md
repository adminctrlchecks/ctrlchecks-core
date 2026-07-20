# Fix CORS Error for Production Domain

## Problem

**Error:**
```
Access to fetch at 'https://worker.ctrlchecks.ai/health' from origin 'https://www.ctrlchecks.ai' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:5173' that is not equal 
to the supplied origin.
```

**Root Cause:**
- Backend CORS configuration only allows `http://localhost:5173` (development)
- Frontend is running on `https://www.ctrlchecks.ai` (production)
- Backend needs to allow the production domain

---

## Quick Fix

### Step 1: SSH into Worker Backend Instance

```bash
ssh -i your-key.pem ubuntu@worker.ctrlchecks.ai
# OR
ssh -i your-key.pem ubuntu@YOUR_WORKER_IP
```

### Step 2: Navigate to Application Directory

```bash
cd /opt/ctrlchecks-worker
# If you have a 'worker' subdirectory:
[ -d "worker" ] && cd worker
```

### Step 3: Edit .env File

```bash
nano .env
```

### Step 4: Update CORS Configuration

**Find these lines:**
```env
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

**Replace with:**
```env
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080
```

**Complete CORS section should look like:**
```env
# ============================================
# CORS CONFIGURATION (Frontend Connection)
# ============================================
# Allow your frontend to connect (production + development)
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` (to confirm)
- Press `Enter` (to save)

### Step 5: Restart Worker Service

```bash
# Restart the service to apply changes
sudo systemctl restart ctrlchecks-worker

# Check status
sudo systemctl status ctrlchecks-worker

# Verify it's running
curl http://localhost:3001/health
```

### Step 6: Verify CORS is Fixed

**From your local machine (or browser console):**
```bash
# Test from command line
curl -H "Origin: https://www.ctrlchecks.ai" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://worker.ctrlchecks.ai/health \
     -v
```

**Expected response headers:**
```
Access-Control-Allow-Origin: https://www.ctrlchecks.ai
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Or test in browser:**
- Open `https://www.ctrlchecks.ai`
- Open browser console (F12)
- Check for CORS errors - should be gone!

---

## Complete .env CORS Configuration

**Recommended production configuration:**

```env
# ============================================
# CORS CONFIGURATION
# ============================================
# Production domains
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080
```

**Explanation:**
- `https://ctrlchecks.ai` - Root domain
- `https://www.ctrlchecks.ai` - WWW subdomain
- `https://*.vercel.app` - Vercel preview deployments
- `http://localhost:5173` - Local development (Vite)
- `http://localhost:8080` - Local development (alternative port)

---

## Alternative: One-Line Fix

If you prefer a quick command-line fix:

```bash
# SSH into worker instance first
ssh -i your-key.pem ubuntu@worker.ctrlchecks.ai

# Navigate to app directory
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# Update CORS in .env file
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai|' .env
sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080|' .env

# Verify changes
grep -E "CORS_ORIGIN|ALLOWED_ORIGINS" .env

# Restart service
sudo systemctl restart ctrlchecks-worker

# Check status
sudo systemctl status ctrlchecks-worker
```

---

## Verify Fix

### Method 1: Browser Console

1. Open `https://www.ctrlchecks.ai`
2. Open browser console (F12)
3. Check Network tab
4. Look for `/health` request
5. Should see `200 OK` (no CORS error)

### Method 2: Command Line

```bash
# Test CORS from command line
curl -H "Origin: https://www.ctrlchecks.ai" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://worker.ctrlchecks.ai/health \
     -v 2>&1 | grep -i "access-control"
```

**Expected output:**
```
< Access-Control-Allow-Origin: https://www.ctrlchecks.ai
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization
```

### Method 3: Check Service Logs

```bash
# On worker instance
sudo journalctl -u ctrlchecks-worker -n 50 | grep -i cors
```

---

## Troubleshooting

### Issue: CORS still not working after restart

**Check:**
1. Verify .env file was saved correctly:
   ```bash
   cat .env | grep CORS
   ```

2. Check service is using .env file:
   ```bash
   # Check service environment
   sudo systemctl show ctrlchecks-worker | grep EnvironmentFile
   ```

3. Verify service restarted:
   ```bash
   sudo systemctl status ctrlchecks-worker
   # Should show "active (running)" and recent restart time
   ```

4. Check logs for errors:
   ```bash
   sudo journalctl -u ctrlchecks-worker -n 100 --no-pager
   ```

### Issue: Service won't restart

**Check logs:**
```bash
sudo journalctl -u ctrlchecks-worker -n 50 --no-pager
```

**Common causes:**
- Syntax error in .env file
- Missing required environment variables
- Port already in use

**Fix:**
```bash
# Check if port is in use
sudo netstat -tlnp | grep 3001

# Check .env syntax
cat .env | grep -v "^#" | grep -v "^$"

# Restart service
sudo systemctl restart ctrlchecks-worker
```

### Issue: Multiple CORS values not working

**If your backend code expects single origin:**

Some CORS implementations only accept a single origin. If that's the case:

```env
# Use wildcard (less secure but works for all)
CORS_ORIGIN=*
ALLOWED_ORIGINS=*

# OR use the primary domain only
CORS_ORIGIN=https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://www.ctrlchecks.ai
```

**Note:** Check your backend code to see how it handles multiple origins.

---

## Security Best Practices

### Production CORS Configuration

**Recommended (Most Secure):**
```env
# Explicitly list allowed origins
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai
```

**Development + Production:**
```env
# Include development origins
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,http://localhost:5173
```

**With Vercel Previews:**
```env
# Include Vercel preview deployments
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app
```

**⚠️ Avoid in Production:**
```env
# DON'T use wildcard in production
ALLOWED_ORIGINS=*  # ❌ Too permissive
```

---

## Quick Reference

### Commands Summary

```bash
# 1. SSH into worker
ssh -i key.pem ubuntu@worker.ctrlchecks.ai

# 2. Navigate to app
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# 3. Edit .env
nano .env

# 4. Update CORS (see above)

# 5. Restart service
sudo systemctl restart ctrlchecks-worker

# 6. Verify
curl http://localhost:3001/health
```

---

## After Fix

✅ **CORS should be working!**

Your frontend at `https://www.ctrlchecks.ai` should now be able to:
- Make API calls to `https://worker.ctrlchecks.ai`
- Access all endpoints without CORS errors
- Work in production

**Test:**
- Refresh `https://www.ctrlchecks.ai`
- Check browser console - no CORS errors
- Verify API calls work

---

**Status:** ✅ **FIXED** - CORS configured for production domain
