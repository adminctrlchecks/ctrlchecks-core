# Fix CORS Error and 504 Gateway Timeout

## 🔍 Root Cause Analysis

### Issue 1: CORS Error
**Error Message:**
```
Access to fetch at 'http://3.7.115.58/api/generate-workflow' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause:**
- Your backend is running in **production mode** (`NODE_ENV=production`)
- In production mode, the backend **ONLY** uses environment variables for CORS origins
- Your `.env` file has `CORS_ORIGIN` and `ALLOWED_ORIGINS` set to production domains only
- `http://localhost:8080` is **NOT** in the allowed origins list
- The CORS middleware blocks the request because the origin doesn't match

### Issue 2: 504 Gateway Timeout
**Error Message:**
```
POST http://3.7.115.58/api/generate-workflow net::ERR_FAILED 504 (Gateway Time-out)
```

**Root Cause:**
- The `/api/generate-workflow` endpoint performs AI processing which can take 30-120+ seconds
- Nginx (if in front) or the backend has a timeout that's too short
- The request times out before the AI processing completes

---

## ✅ Solution

### Step 1: SSH into Your Backend Server

```bash
ssh -i your-key.pem ubuntu@3.7.115.58
# OR use your SSH method
```

### Step 2: Navigate to Worker Directory

```bash
cd /opt/ctrlchecks-worker
# OR wherever your worker code is located
[ -d "worker" ] && cd worker
```

### Step 3: Edit `.env` File

```bash
nano .env
# OR
vi .env
```

### Step 4: Update CORS Configuration

**Find these lines:**
```env
CORS_ORIGIN=https://ctrlchecks.ai,https://*.vercel.app
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
```

**Replace with:**
```env
CORS_ORIGIN=https://ctrlchecks.ai,https://*.vercel.app,http://localhost:8080,http://127.0.0.1:8080
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173
```

**Complete CORS section should look like:**
```env
# ============================================
# CORS CONFIGURATION (Frontend Connection)
# ============================================
# Production domains + localhost for development
CORS_ORIGIN=https://ctrlchecks.ai,https://*.vercel.app,http://localhost:8080,http://127.0.0.1:8080
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173
```

**Save and exit:**
- `nano`: Press `Ctrl + X`, then `Y`, then `Enter`
- `vi`: Press `Esc`, type `:wq`, press `Enter`

### Step 5: Check Nginx Configuration (If Using Nginx)

**Check if nginx is running:**
```bash
sudo systemctl status nginx
```

**If nginx is running, find the config file:**
```bash
# Find nginx config for your IP/domain
sudo ls -la /etc/nginx/sites-available/
sudo ls -la /etc/nginx/sites-enabled/
```

**Check the active nginx config:**
```bash
sudo cat /etc/nginx/sites-enabled/* | grep -A 20 "server_name\|location"
```

**If you see a config file for `3.7.115.58` or a default config, edit it:**
```bash
sudo nano /etc/nginx/sites-available/default
# OR
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Add/Update CORS headers and increase timeout:**

```nginx
server {
    listen 80;
    server_name 3.7.115.58;  # Your IP or domain
    
    # Increase timeouts for long-running AI requests
    client_max_body_size 50M;
    client_body_timeout 600s;      # 10 minutes
    proxy_read_timeout 600s;      # 10 minutes (was 300s)
    proxy_connect_timeout 300s;
    proxy_send_timeout 600s;      # 10 minutes (was 300s)
    
    # CORS headers (allow localhost:8080)
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With, x-stream-progress, x-idempotency-key' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With, x-stream-progress, x-idempotency-key' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    # Special timeout for generate-workflow endpoint
    location /api/generate-workflow {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for AI processing
        proxy_read_timeout 600s;      # 10 minutes
        proxy_connect_timeout 300s;
        proxy_send_timeout 600s;      # 10 minutes
        client_body_timeout 600s;
    }
    
    # All other API routes
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Test nginx config:**
```bash
sudo nginx -t
```

**If test passes, reload nginx:**
```bash
sudo systemctl reload nginx
```

### Step 6: Restart Worker Service

```bash
# Find your service name
sudo systemctl list-units | grep ctrlchecks

# Restart the service (replace with your actual service name)
sudo systemctl restart ctrlchecks-worker
# OR
sudo systemctl restart worker
# OR
pm2 restart all  # If using PM2
```

### Step 7: Verify Backend is Running

```bash
# Check if backend is listening on port 3001
sudo netstat -tlnp | grep 3001
# OR
sudo ss -tlnp | grep 3001

# Check service status
sudo systemctl status ctrlchecks-worker
```

### Step 8: Test CORS from Your Local Machine

**Test OPTIONS request (preflight):**
```powershell
# From Windows PowerShell
Invoke-WebRequest -Uri "http://3.7.115.58/api/generate-workflow" `
    -Method OPTIONS `
    -Headers @{
        "Origin" = "http://localhost:8080"
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    } `
    -UseBasicParsing | Select-Object -ExpandProperty Headers
```

**Should see:**
```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

**Test actual request:**
```powershell
# Test health endpoint first
Invoke-WebRequest -Uri "http://3.7.115.58/health" `
    -Headers @{ "Origin" = "http://localhost:8080" } `
    -UseBasicParsing
```

---

## 🔧 Alternative: If No Nginx (Direct Backend Access)

If you're accessing the backend **directly** (no nginx), you only need to:

1. **Update `.env` file** (Step 4 above)
2. **Restart worker service** (Step 6 above)

The backend CORS middleware will handle everything.

---

## 🐛 Debugging

### Check Backend Logs

```bash
# View service logs
sudo journalctl -u ctrlchecks-worker -n 100 -f

# Look for CORS warnings:
# ⚠️  CORS: Blocked origin http://localhost:8080. Allowed origins: ...
```

### Check Allowed Origins at Runtime

**Add temporary logging to see what origins are allowed:**

```bash
# SSH into server
cd /opt/ctrlchecks-worker/worker

# Check what the backend sees
grep -r "getAllowedOrigins\|allowedOrigins" src/core/middleware/cors.ts
```

### Test Backend Directly (Bypass Nginx)

```bash
# On server, test backend directly
curl -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3001/api/generate-workflow \
     -v 2>&1 | grep -i "access-control"
```

**Should see:**
```
< Access-Control-Allow-Origin: http://localhost:8080
```

---

## ✅ Verification Checklist

After making changes, verify:

- [ ] `.env` file has `http://localhost:8080` in `ALLOWED_ORIGINS`
- [ ] Worker service restarted successfully
- [ ] Nginx config (if used) has CORS headers and extended timeouts
- [ ] Nginx reloaded successfully
- [ ] Backend is running on port 3001
- [ ] OPTIONS request returns CORS headers
- [ ] Browser console shows no CORS errors
- [ ] `/api/generate-workflow` request completes without timeout

---

## 🚨 Common Issues

### Issue: Still Getting CORS Error After Changes

**Possible causes:**
1. Service didn't restart - check with `sudo systemctl status ctrlchecks-worker`
2. Wrong `.env` file - make sure you edited the one the service uses
3. Nginx is overriding CORS headers - check nginx config
4. Browser cache - try incognito mode or hard refresh (Ctrl+Shift+R)

### Issue: Still Getting 504 Timeout

**Possible causes:**
1. Nginx timeout still too short - increase to 600s (10 minutes)
2. Backend process is crashing - check logs: `sudo journalctl -u ctrlchecks-worker -n 100`
3. Ollama service is down - check: `curl http://ollama.ctrlchecks.ai:8000/health`
4. Database connection issues - check backend logs

### Issue: Backend Not Starting

**Check logs:**
```bash
sudo journalctl -u ctrlchecks-worker -n 50
```

**Common errors:**
- Missing environment variables
- Port 3001 already in use
- Database connection failed

---

## 📝 Summary

**The exact reason for your CORS error:**
1. Backend is in production mode (`NODE_ENV=production`)
2. Production mode only uses environment variables for CORS
3. `http://localhost:8080` is not in `ALLOWED_ORIGINS` environment variable
4. CORS middleware blocks the request

**The exact reason for 504 timeout:**
1. `/api/generate-workflow` performs AI processing (30-120+ seconds)
2. Nginx (or backend) timeout is set to 300s (5 minutes) or less
3. Request times out before AI processing completes

**The fix:**
1. Add `http://localhost:8080` to `ALLOWED_ORIGINS` in `.env`
2. Increase nginx timeout to 600s (10 minutes) for `/api/generate-workflow`
3. Restart worker service
4. Reload nginx (if using nginx)
