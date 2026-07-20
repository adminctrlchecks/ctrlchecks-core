# 🚀 How to Run CtrlChecks Application

## 📋 Overview

This guide explains how to run the CtrlChecks application locally for testing. The setup consists of:

- **FastAPI Ollama Service**: Running on `ollama.ctrlchecks.ai:8000` (Remote - Already Running)
- **Worker Service**: Runs locally on `http://localhost:3001`
- **Frontend (ctrl_checks)**: Runs locally on `http://localhost:5173`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│              http://localhost:5173                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Frontend (ctrl_checks)                      │
│              - React + TypeScript                        │
│              - Vite Dev Server                           │
│              - Port: 5173                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ API Calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Worker Service (Local)                      │
│              - Node.js + Express                         │
│              - Port: 3001                                │
│              - Handles workflow execution                │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ AI Processing
                     ▼
┌─────────────────────────────────────────────────────────┐
│         FastAPI Ollama Service (Remote)                  │
│         http://ollama.ctrlchecks.ai:8000                  │
│         - Python FastAPI                                 │
│         - Ollama Integration                             │
│         - AI Model Processing                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### Required Software

1. **Node.js** (v20 or higher)
   ```powershell
   node --version  # Should show v20.x.x or higher
   ```

2. **npm** (comes with Node.js)
   ```powershell
   npm --version
   ```

3. **Git** (for cloning the repository)
   ```powershell
   git --version
   ```

### Required Services

1. **Supabase Project** - Database and authentication
   - Get credentials from: https://supabase.com/dashboard
   - You'll need:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `VITE_SUPABASE_ANON_KEY`

2. **FastAPI Ollama Service** - Already running on `ollama.ctrlchecks.ai:8000`
   - ✅ No setup needed - it's already deployed

---

## 🔧 Setup Instructions

### Step 1: Clone the Repository

```powershell
# Navigate to your desired directory
cd C:\Users\User\Desktop

# Clone the repository (if not already cloned)
git clone <your-repo-url> ctrlchecks-ai-workflow-os
cd ctrlchecks-ai-workflow-os
```

### Step 2: Setup Worker Service

```powershell
# Navigate to worker directory
cd worker

# Install dependencies
npm install

# Copy environment template
Copy-Item env.example .env

# Edit .env file with your Supabase credentials
notepad .env
```

**Required `.env` configuration for Worker:**

```env
# ============================================
# REQUIRED - Supabase Configuration
# ============================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# ============================================
# Ollama Configuration - REMOTE
# ============================================
# FastAPI Ollama is running on remote server
OLLAMA_HOST=http://ollama.ctrlchecks.ai:8000
OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# FastAPI Ollama Service - REMOTE
# ============================================
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# Worker Service Configuration - LOCAL
# ============================================
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001
WORKER_ID=worker-local

# ============================================
# CORS Configuration - LOCAL DEVELOPMENT
# ============================================
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173

# ============================================
# Optional - Database URL (if using Prisma)
# ============================================
# DATABASE_URL=postgresql://user:password@host:port/database
```

### Step 3: Setup Frontend (ctrl_checks)

```powershell
# Navigate to frontend directory
cd ..\ctrl_checks

# Install dependencies
npm install

# Copy environment template
Copy-Item env.example .env.local

# Edit .env.local file
notepad .env.local
```

**Required `.env.local` configuration for Frontend:**

```env
# ============================================
# REQUIRED - Supabase Configuration
# ============================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# ============================================
# Worker Service Configuration - LOCAL
# ============================================
VITE_API_URL=http://localhost:3001

# ============================================
# FastAPI Ollama Service - REMOTE
# ============================================
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# Optional - Public Base URL
# ============================================
VITE_PUBLIC_BASE_URL=http://localhost:5173
```

---

## 🚀 Running the Application

### Option 1: Run Both Services Manually (Recommended for Testing)

#### Terminal 1: Start Worker Service

```powershell
# Navigate to worker directory
cd worker

# Start worker service
npm run dev
```

**Expected Output:**
```
✅ Loaded .env from: C:\...\worker\.env
✅ Ollama client initialized
🚀 Starting CtrlChecks Worker Service...
✅ Server running on http://localhost:3001
```

#### Terminal 2: Start Frontend

```powershell
# Navigate to frontend directory
cd ctrl_checks

# Start frontend dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Option 2: Run with PowerShell Scripts

#### Start Worker Service

```powershell
cd worker
.\scripts\start-worker.ps1  # If exists, or use: npm run dev
```

#### Start Frontend

```powershell
cd ctrl_checks
npm run dev
```

---

## ✅ Verification Steps

### 1. Verify Worker Service

Open browser or use PowerShell:

```powershell
# Test worker health endpoint
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Verify Frontend

Open browser:
```
http://localhost:5173
```

You should see the CtrlChecks application interface.

### 3. Verify Ollama Connection

The worker service should automatically connect to `ollama.ctrlchecks.ai:8000` when processing AI requests.

Check worker logs for:
```
✅ Ollama client initialized
✅ Connected to Ollama at http://ollama.ctrlchecks.ai:8000
```

---

## 🔍 Troubleshooting

### Issue 1: Worker Service Won't Start

**Error:** `❌ Supabase configuration error`

**Solution:**
1. Check that `.env` file exists in `worker/` directory
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
3. Make sure there are no extra spaces or quotes around values

**Error:** `Port 3001 already in use`

**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change PORT in .env file
PORT=3002
```

### Issue 2: Frontend Won't Connect to Worker

**Error:** `Failed to fetch` or CORS errors

**Solution:**
1. Verify worker is running on `http://localhost:3001`
2. Check `VITE_API_URL` in `ctrl_checks/.env.local` is set to `http://localhost:3001`
3. Verify CORS settings in `worker/.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173
   ```

### Issue 3: Ollama Connection Failed

**Error:** `Failed to connect to Ollama`

**Solution:**
1. Verify Ollama service is accessible:
   ```powershell
   Invoke-RestMethod -Uri "http://ollama.ctrlchecks.ai:8000/health" -Method Get
   ```

2. Check `OLLAMA_HOST` in `worker/.env`:
   ```env
   OLLAMA_HOST=http://ollama.ctrlchecks.ai:8000
   OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
   ```

3. Verify network connectivity (firewall, VPN, etc.)

### Issue 4: Supabase Connection Failed

**Error:** `Invalid API key` or `Connection refused`

**Solution:**
1. Verify Supabase credentials in `.env` files
2. Check Supabase project is active: https://supabase.com/dashboard
3. Ensure `SUPABASE_URL` format is correct: `https://xxxxx.supabase.co`
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key (not anon key)

---

## 📝 Environment Variables Reference

### Worker Service (`.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key | `eyJhbGc...` |
| `OLLAMA_HOST` | ✅ Yes | Ollama service URL | `http://ollama.ctrlchecks.ai:8000` |
| `OLLAMA_BASE_URL` | ✅ Yes | Ollama base URL | `http://ollama.ctrlchecks.ai:8000` |
| `FASTAPI_OLLAMA_URL` | ✅ Yes | FastAPI Ollama URL | `http://ollama.ctrlchecks.ai:8000` |
| `PYTHON_BACKEND_URL` | ✅ Yes | Python backend URL | `http://ollama.ctrlchecks.ai:8000` |
| `PORT` | No | Worker port (default: 3001) | `3001` |
| `CORS_ORIGIN` | No | Allowed CORS origin | `http://localhost:5173` |

### Frontend (`.env.local`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon key | `eyJhbGc...` |
| `VITE_API_URL` | ✅ Yes | Worker service URL | `http://localhost:3001` |
| `VITE_PYTHON_BACKEND_URL` | ✅ Yes | FastAPI Ollama URL | `http://ollama.ctrlchecks.ai:8000` |
| `VITE_OLLAMA_BASE_URL` | No | Ollama base URL | `http://ollama.ctrlchecks.ai:8000` |

---

## 🎯 Quick Start Commands

### Complete Setup (First Time)

```powershell
# 1. Setup Worker
cd worker
npm install
Copy-Item env.example .env
# Edit .env with your credentials

# 2. Setup Frontend
cd ..\ctrl_checks
npm install
Copy-Item env.example .env.local
# Edit .env.local with your credentials

# 3. Start Worker (Terminal 1)
cd ..\worker
npm run dev

# 4. Start Frontend (Terminal 2)
cd ..\ctrl_checks
npm run dev
```

### Daily Development

```powershell
# Terminal 1: Worker
cd worker
npm run dev

# Terminal 2: Frontend
cd ctrl_checks
npm run dev
```

---

## 📊 Service URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | Local |
| Worker API | http://localhost:3001 | Local |
| Worker Health | http://localhost:3001/health | Local |
| FastAPI Ollama | http://ollama.ctrlchecks.ai:8000 | Remote ✅ |
| Supabase | https://your-project.supabase.co | Remote ✅ |

---

## 🔐 Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use `.env.example`** as a template for required variables
3. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - It has admin access
4. **Use `VITE_SUPABASE_ANON_KEY`** in frontend (public, safe)

---

## 📚 Additional Resources

- **Worker Documentation**: `worker/README.md`
- **Frontend Documentation**: `ctrl_checks/README.md`
- **Setup Guide**: `worker/STEP_BY_STEP_SETUP_GUIDE.md`
- **Environment Setup**: `worker/SETUP_ENV.md`

---

## ✅ Checklist

Before running, ensure:

- [ ] Node.js v20+ installed
- [ ] Dependencies installed (`npm install` in both directories)
- [ ] `.env` file created in `worker/` directory
- [ ] `.env.local` file created in `ctrl_checks/` directory
- [ ] Supabase credentials configured
- [ ] Ollama service accessible at `ollama.ctrlchecks.ai:8000`
- [ ] Port 3001 available (for worker)
- [ ] Port 5173 available (for frontend)

---

## 🎉 Success!

Once both services are running:

1. ✅ Worker service: `http://localhost:3001`
2. ✅ Frontend: `http://localhost:5173`
3. ✅ Ollama: `http://ollama.ctrlchecks.ai:8000` (remote)

Open `http://localhost:5173` in your browser and start testing! 🚀

---

**Need Help?** Check the troubleshooting section or review the logs in each terminal window.
