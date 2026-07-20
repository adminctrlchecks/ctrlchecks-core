# Service Connection Configuration Guide

**Complete guide for connecting FastAPI Ollama, Worker, and Frontend services**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Connection Configuration](#connection-configuration)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Services to Connect

1. **FastAPI Ollama** - Already deployed ✅
   - URL: `http://ollama.ctrlchecks.ai:8000`
   - Purpose: AI model processing

2. **Worker Service** - Deployed on AWS EC2
   - URL: `https://api.ctrlchecks.ai`
   - Purpose: Workflow execution, API gateway

3. **Frontend** - Deployed on Vercel
   - URL: `https://ctrlchecks.ai`
   - Purpose: User interface

### Connection Flow

```
User (Browser)
    ↓
Frontend (Vercel)
    ├──→ Worker API (AWS EC2)
    │       ├──→ FastAPI Ollama (AWS EC2)
    │       └──→ Supabase (Database)
    └──→ FastAPI Ollama (Direct - optional)
```

---

## Service Architecture

### Data Flow

1. **User Action** → Frontend
2. **Frontend** → Worker API (`/api/generate-workflow`, `/api/execute-workflow`)
3. **Worker** → FastAPI Ollama (`/process`, `/api/chat`)
4. **Worker** → Supabase (Database operations)
5. **Response** → Frontend → User

### API Endpoints

#### Frontend → Worker
- `POST /api/generate-workflow` - Generate workflow from prompt
- `POST /api/execute-workflow` - Execute workflow
- `GET /api/workflows` - List workflows
- `GET /health` - Health check

#### Worker → FastAPI Ollama
- `POST /process` - Process AI requests
- `POST /api/chat` - Chat with AI models
- `GET /health` - Health check
- `GET /api/tags` - List available models

---

## Connection Configuration

### Environment Variables Summary

#### Worker Service (AWS EC2)

**File:** `/opt/ctrlchecks-worker/worker/.env`

```env
# ============================================
# Supabase Configuration
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# FastAPI Ollama Connection
# ============================================
# Point to your deployed FastAPI Ollama service
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# Worker Service Configuration
# ============================================
PORT=3001
PUBLIC_BASE_URL=https://api.ctrlchecks.ai
WORKER_ID=worker-aws-1

# ============================================
# CORS Configuration
# ============================================
# Allow requests from Vercel frontend
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app

# ============================================
# Logging
# ============================================
LOG_LEVEL=INFO
PROCESS_TIMEOUT_SECONDS=1800
MAX_RETRIES=3
```

#### Frontend (Vercel)

**Set in Vercel Dashboard → Settings → Environment Variables**

```env
# ============================================
# Supabase Configuration
# ============================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# ============================================
# Worker API Configuration
# ============================================
# Point to your deployed Worker service
VITE_API_URL=https://api.ctrlchecks.ai

# ============================================
# FastAPI Ollama Configuration
# ============================================
# Point to your deployed FastAPI Ollama service
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# Public Base URL
# ============================================
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai

# ============================================
# Optional Configuration
# ============================================
VITE_USE_DIRECT_BACKEND=false
```

---

## Step-by-Step Setup

### Step 1: Configure Worker Service ⏱️ 15 minutes

#### 1.1: SSH into Worker EC2 Instance

```bash
ssh -i ctrlchecks-worker-key.pem ubuntu@api.ctrlchecks.ai
```

#### 1.2: Update Environment Variables

```bash
# Navigate to worker directory
cd /opt/ctrlchecks-worker/worker

# Edit environment file
nano .env
```

#### 1.3: Update Configuration

**Update these values:**

1. **FastAPI Ollama URL:**
   ```env
   FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
   PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
   ```

2. **CORS Origin:**
   ```env
   CORS_ORIGIN=https://ctrlchecks.ai
   ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
   ```

3. **Public Base URL:**
   ```env
   PUBLIC_BASE_URL=https://api.ctrlchecks.ai
   ```

**Save and exit** (Ctrl+X, Y, Enter)

#### 1.4: Restart Worker Service

```bash
# Restart service to apply changes
sudo systemctl restart ctrlchecks-worker

# Check status
sudo systemctl status ctrlchecks-worker

# View logs
sudo journalctl -u ctrlchecks-worker -f
```

**✅ Checkpoint:** Worker configured

---

### Step 2: Configure Frontend (Vercel) ⏱️ 10 minutes

#### 2.1: Access Vercel Dashboard

1. **Go to:** https://vercel.com/dashboard
2. **Select your project:** `ctrlchecks`
3. **Go to:** Settings → Environment Variables

#### 2.2: Add/Update Environment Variables

**Add or update these variables:**

1. **Worker API URL:**
   ```
   VITE_API_URL=https://api.ctrlchecks.ai
   ```

2. **FastAPI Ollama URL:**
   ```
   VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
   VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
   ```

3. **Public Base URL:**
   ```
   VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
   ```

**Important:** 
- Ensure variables are set for **Production** environment
- Variables must be prefixed with `VITE_` for Vite to expose them

#### 2.3: Redeploy Frontend

1. **Go to:** Deployments tab
2. **Click:** "Redeploy" on latest deployment
3. **Or:** Push a new commit to trigger auto-deploy

**✅ Checkpoint:** Frontend configured

---

### Step 3: Verify FastAPI Ollama Connection ⏱️ 5 minutes

#### 3.1: Test FastAPI Health

```bash
# Test from your local machine
curl http://ollama.ctrlchecks.ai:8000/health

# Expected response:
# {"status":"healthy","ollama":"running","timestamp":"..."}
```

#### 3.2: Test from Worker Instance

```bash
# SSH into Worker
ssh -i ctrlchecks-worker-key.pem ubuntu@api.ctrlchecks.ai

# Test connection
curl http://ollama.ctrlchecks.ai:8000/health

# Should return health status
```

**✅ Checkpoint:** FastAPI accessible

---

## Verification

### 1. Test Worker Health

```bash
# Test Worker health endpoint
curl https://api.ctrlchecks.ai/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

### 2. Test Worker → FastAPI Connection

```bash
# Test Worker can reach FastAPI
curl -X POST https://api.ctrlchecks.ai/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'

# Should proxy to FastAPI and return AI response
```

### 3. Test Frontend → Worker Connection

**In browser console (F12):**

```javascript
// Test API connection
fetch('https://api.ctrlchecks.ai/health')
  .then(r => r.json())
  .then(console.log);

// Should return: {"status":"healthy",...}
```

### 4. Test End-to-End Flow

1. **Open Frontend:** `https://ctrlchecks.ai`
2. **Open Browser Console:** F12
3. **Create a workflow** using the UI
4. **Check console** for any errors
5. **Verify workflow** is created in database
6. **Execute workflow** and verify it runs

### 5. Test CORS Configuration

**In browser console:**

```javascript
// Test CORS
fetch('https://api.ctrlchecks.ai/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Should succeed without CORS errors
```

---

## Troubleshooting

### Issue: Worker cannot connect to FastAPI

**Symptoms:**
- Worker logs show connection errors
- `/api/process` endpoint fails

**Check:**
```bash
# On Worker instance
curl http://ollama.ctrlchecks.ai:8000/health

# Check DNS resolution
nslookup ollama.ctrlchecks.ai

# Check environment variables
cat /opt/ctrlchecks-worker/worker/.env | grep FASTAPI
```

**Solution:**
1. Verify FastAPI is running
2. Check DNS resolution
3. Verify environment variables are correct
4. Check security groups allow outbound traffic

---

### Issue: Frontend cannot connect to Worker

**Symptoms:**
- Browser console shows CORS errors
- API requests fail

**Check:**
```bash
# Test Worker health
curl https://api.ctrlchecks.ai/health

# Check CORS headers
curl -I -X OPTIONS https://api.ctrlchecks.ai/health \
  -H "Origin: https://ctrlchecks.ai" \
  -H "Access-Control-Request-Method: GET"
```

**Solution:**
1. **Verify CORS configuration** in Worker:
   ```env
   CORS_ORIGIN=https://ctrlchecks.ai
   ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
   ```

2. **Restart Worker service:**
   ```bash
   sudo systemctl restart ctrlchecks-worker
   ```

3. **Check Vercel environment variables:**
   - `VITE_API_URL` should be `https://api.ctrlchecks.ai`

---

### Issue: Environment Variables Not Working

**Symptoms:**
- Frontend uses wrong URLs
- API calls go to localhost

**Check:**
1. **Vercel environment variables:**
   - Must be prefixed with `VITE_`
   - Must be set for Production environment
   - Must be redeployed after changes

2. **Worker environment variables:**
   - Must be in `.env` file
   - Service must be restarted after changes

**Solution:**
```bash
# Worker: Restart service
sudo systemctl restart ctrlchecks-worker

# Frontend: Redeploy in Vercel
# Or push new commit to trigger auto-deploy
```

---

### Issue: SSL Certificate Errors

**Symptoms:**
- Mixed content warnings
- HTTPS errors

**Check:**
1. All URLs use HTTPS (except FastAPI if HTTP)
2. SSL certificates are valid
3. No mixed HTTP/HTTPS content

**Solution:**
- Use HTTPS for all services (recommended)
- Or configure FastAPI with SSL
- Or use CloudFront/ALB for SSL termination

---

### Issue: DNS Not Resolving

**Symptoms:**
- Cannot reach services
- Connection timeouts

**Check:**
```bash
# Test DNS resolution
dig api.ctrlchecks.ai +short
dig ollama.ctrlchecks.ai +short
dig ctrlchecks.ai +short
```

**Solution:**
1. Wait for DNS propagation (can take up to 48 hours)
2. Verify DNS records are correct
3. Check nameservers are configured correctly

---

## Connection Checklist

Use this checklist to verify all connections:

### Worker Service
- [ ] Worker health endpoint accessible: `https://api.ctrlchecks.ai/health`
- [ ] Worker can reach FastAPI: `curl http://ollama.ctrlchecks.ai:8000/health` (from Worker)
- [ ] CORS configured correctly
- [ ] Environment variables set correctly

### Frontend
- [ ] Frontend loads: `https://ctrlchecks.ai`
- [ ] Frontend can reach Worker: Test in browser console
- [ ] Environment variables set in Vercel
- [ ] Frontend redeployed after variable changes

### FastAPI Ollama
- [ ] FastAPI health endpoint accessible: `http://ollama.ctrlchecks.ai:8000/health`
- [ ] FastAPI models available: `curl http://ollama.ctrlchecks.ai:8000/api/tags`

### End-to-End
- [ ] Create workflow works
- [ ] Execute workflow works
- [ ] AI features work
- [ ] No console errors
- [ ] No CORS errors

---

## Quick Reference

### Service URLs

- **Frontend:** `https://ctrlchecks.ai`
- **Worker API:** `https://api.ctrlchecks.ai`
- **FastAPI Ollama:** `http://ollama.ctrlchecks.ai:8000`

### Test Commands

```bash
# Worker health
curl https://api.ctrlchecks.ai/health

# FastAPI health
curl http://ollama.ctrlchecks.ai:8000/health

# Worker → FastAPI connection
curl -X POST https://api.ctrlchecks.ai/api/process \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:14b-instruct-q4_K_M","messages":[{"role":"user","content":"Hello"}]}'
```

### Important Files

- **Worker .env:** `/opt/ctrlchecks-worker/worker/.env`
- **Vercel Variables:** Dashboard → Settings → Environment Variables

---

## Next Steps

After successful connection:

1. **Monitor logs** for any errors
2. **Test all features** end-to-end
3. **Set up monitoring** (CloudWatch, Vercel Analytics)
4. **Configure alerts** for service failures
5. **Set up backups** for critical data

---

**🎉 Congratulations! All services are connected and working together!**

**Your production deployment is complete!**
