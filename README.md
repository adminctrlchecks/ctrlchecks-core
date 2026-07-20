# 🚀 CtrlChecks AI Workflow Platform

A distributed workflow automation platform with AI-powered workflow generation.

## 📋 Quick Links

- **[RUN_APPLICATION.md](./RUN_APPLICATION.md)** - Complete setup and run guide
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute quick setup
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Project structure overview

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + TypeScript (Port 5173)
│  (ctrl_checks)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Worker        │  Node.js + Express (Port 3001)
│   Service       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FastAPI Ollama  │  Python FastAPI (Remote)
│ ollama.ctrl...  │
└─────────────────┘
```

## 🚀 Quick Start

### 1. Setup Worker

```powershell
cd worker
npm install
Copy-Item env.example .env
# Edit .env with your Supabase credentials
```

### 2. Setup Frontend

```powershell
cd ..\ctrl_checks
npm install
Copy-Item env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Start Services

**Terminal 1:**
```powershell
cd worker
npm run dev
```

**Terminal 2:**
```powershell
cd ctrl_checks
npm run dev
```

### 4. Open Application

Open: **http://localhost:5173**

---

## 📦 Components

### Worker Service (`worker/`)

- Node.js/Express backend
- Workflow execution engine
- AI workflow generation
- Distributed workflow orchestration
- Database: Supabase (PostgreSQL)

### Frontend (`ctrl_checks/`)

- React 18 + TypeScript
- Vite build tool
- Workflow visual editor
- AI workflow wizard
- Real-time execution monitoring

### FastAPI Ollama Service (Remote)

- Python FastAPI
- Ollama integration
- AI model processing
- Running on: `ollama.ctrlchecks.ai:8000`

---

## 🔧 Environment Configuration

### Worker (`.env`)

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

### Frontend (`.env.local`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key-here
VITE_API_URL=http://localhost:3001
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
```

---

## 📚 Documentation

- **[RUN_APPLICATION.md](./RUN_APPLICATION.md)** - Complete setup guide with troubleshooting
- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Project structure
- **[worker/README.md](./worker/README.md)** - Worker service documentation
- **[ctrl_checks/README.md](./ctrl_checks/README.md)** - Frontend documentation

### 🔗 Integration Guides

- **[How to Integrate LinkedIn](./docs/HOW_TO_INTEGRATE_LINKEDIN.md)** - Step-by-step guide for integrating LinkedIn in frontend, workflows, and components
- **[LinkedIn with Supabase Integration Guide](./docs/LINKEDIN_SUPABASE_INTEGRATION_GUIDE.md)** - Complete guide for LinkedIn integration with Supabase OAuth
- **[LinkedIn Authentication Guide](./docs/LINKEDIN_AUTHENTICATION_GUIDE.md)** - Complete LinkedIn OAuth setup and user guide
- **[LinkedIn Quick Start](./docs/LINKEDIN_QUICK_START.md)** - 15-minute LinkedIn integration checklist
- **[LinkedIn Integration (Technical)](./docs/integrations/linkedin.md)** - Technical implementation details

### 🚀 Deployment Guides

- **[Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT_GUIDE.md)** - Deploy frontend to Vercel and connect custom domain
- **[Vercel Domain Setup (ctrlchecks.ai)](./docs/VERCEL_DOMAIN_SETUP.md)** - Connect ctrlchecks.ai domain to Vercel
- **[Vercel Pre-Deployment Checklist](./docs/VERCEL_PRE_DEPLOYMENT_CHECKLIST.md)** - Prevent conflicts and deployment failures

---

## ✅ Status

- ✅ Clean folder structure
- ✅ Production-ready code
- ✅ No linter errors
- ✅ Complete documentation
- ✅ Environment templates provided
- ✅ Ready for testing

---

## 🎯 Service URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | Local |
| Worker API | http://localhost:3001 | Local |
| Ollama (Remote) | http://ollama.ctrlchecks.ai:8000 | ✅ Running |

---

## 🔐 Security

- Never commit `.env` files
- Use environment templates (`env.example`)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Use `VITE_SUPABASE_ANON_KEY` in frontend (public)

---

## 📝 License

[Your License Here]

---

**Ready to test! See [RUN_APPLICATION.md](./RUN_APPLICATION.md) for complete instructions.** 🚀
