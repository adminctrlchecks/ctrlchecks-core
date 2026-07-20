# 🚀 Production Deployment Quick Start

**Quick reference for deploying CtrlChecks to production**

---

## 📋 Deployment Order

1. ✅ **FastAPI Ollama** - Already deployed (see `Guide/Fast_API_Ollama/`)
2. 🔄 **Worker Service** - Deploy to AWS EC2
3. 🌐 **Frontend** - Deploy to Vercel
4. 🔗 **Connect Services** - Configure environment variables

---

## ⚡ Quick Commands

### Worker Deployment (AWS)

```bash
# 1. Create EC2 instance
aws ec2 run-instances --image-id ami-xxx --instance-type t3.medium ...

# 2. SSH into instance
ssh -i key.pem ubuntu@api.ctrlchecks.ai

# 3. Deploy application
cd /opt/ctrlchecks-worker/worker
git clone <repo> .
npm ci --only=production
npm run build

# 4. Configure environment
nano .env
# Set: FASTAPI_OLLAMA_URL, CORS_ORIGIN, etc.

# 5. Start service
sudo systemctl start ctrlchecks-worker
```

### Frontend Deployment (Vercel)

1. **Connect GitHub repo** to Vercel
2. **Set Root Directory:** `ctrl_checks`
3. **Add Environment Variables:**
   - `VITE_API_URL=https://api.ctrlchecks.ai`
   - `VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000`
4. **Deploy**

---

## 🔧 Environment Variables

### Worker (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
PORT=3001
PUBLIC_BASE_URL=https://api.ctrlchecks.ai
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
```

### Frontend (Vercel)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
VITE_API_URL=https://api.ctrlchecks.ai
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

---

## ✅ Verification

```bash
# Worker health
curl https://api.ctrlchecks.ai/health

# FastAPI health
curl http://ollama.ctrlchecks.ai:8000/health

# Frontend
# Visit: https://ctrlchecks.ai
```

---

## 📚 Full Guides

- **Master Guide:** `Guide/PRODUCTION_DEPLOYMENT_MASTER.md`
- **Worker AWS:** `Guide/Worker/01_WORKER_AWS_DEPLOYMENT.md`
- **Frontend Vercel:** `Guide/ctrlChecks/01_VERCEL_DEPLOYMENT.md`
- **Service Connection:** `Guide/02_SERVICE_CONNECTION.md`
- **FastAPI Ollama:** `Guide/Fast_API_Ollama/00_COMPLETE_DEPLOYMENT_GUIDE.md`

---

## 🆘 Troubleshooting

### Worker not connecting to FastAPI

```bash
# Test from Worker instance
curl http://ollama.ctrlchecks.ai:8000/health
```

### Frontend CORS errors

```bash
# Check Worker CORS config
cat /opt/ctrlchecks-worker/worker/.env | grep CORS
```

### Environment variables not working

- **Worker:** Restart service after changes
- **Frontend:** Redeploy in Vercel after changes

---

## 💰 Cost Estimate

- **FastAPI Ollama EC2:** ~$350/month (already deployed)
- **Worker EC2:** ~$30-50/month
- **Vercel Frontend:** $0-20/month (free tier available)
- **Total:** ~$380-420/month

---

**For detailed instructions, see the full guides above!**
