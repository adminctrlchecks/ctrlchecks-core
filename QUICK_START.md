# ⚡ Quick Start Guide

## 🚀 Fast Setup (5 Minutes)

### 1. Setup Worker Service

```powershell
cd worker
npm install
Copy-Item env.example .env
# Edit .env - Add your Supabase credentials
```

**Required in `.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
OLLAMA_HOST=http://ollama.ctrlchecks.ai:8000
OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 2. Setup Frontend

```powershell
cd ..\ctrl_checks
npm install
Copy-Item env.example .env.local
# Edit .env.local - Add your Supabase credentials
```

**Required in `.env.local`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
VITE_API_URL=http://localhost:3001
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
```

### 3. Start Services

**Terminal 1 - Worker:**
```powershell
cd worker
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd ctrl_checks
npm run dev
```

### 4. Open Application

Open browser: **http://localhost:5173**

---

## ✅ Verify Everything Works

1. **Worker Health Check:**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/health"
   ```

2. **Frontend:** Open http://localhost:5173

3. **Ollama:** Already running on `ollama.ctrlchecks.ai:8000` ✅

---

## 📚 Full Documentation

See **`RUN_APPLICATION.md`** for complete setup instructions and troubleshooting.

---

## 🎯 Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Worker | http://localhost:3001 |
| Ollama (Remote) | http://ollama.ctrlchecks.ai:8000 ✅ |

---

**That's it! You're ready to test! 🎉**
