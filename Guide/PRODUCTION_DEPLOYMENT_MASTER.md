# 🚀 Production Deployment Master Guide

**Complete step-by-step guide for deploying CtrlChecks to production**

This master guide covers deploying all three services:
1. ✅ **FastAPI Ollama** - Already deployed (reference: `Guide/Fast_API_Ollama/`)
2. 🔄 **Worker Service** - Deploy to AWS EC2
3. 🌐 **CtrlChecks Frontend** - Deploy to Vercel

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Checklist](#deployment-checklist)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Service Connection Configuration](#service-connection-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CtrlChecks Frontend                      │
│                    (Vercel - Static Site)                   │
│                                                              │
│  - React Application                                         │
│  - Connects to: Worker API & FastAPI Ollama                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Worker Service                            │
│                    (AWS EC2 - Node.js)                      │
│                                                              │
│  - Workflow Execution                                        │
│  - API Gateway                                               │
│  - Connects to: FastAPI Ollama & Supabase                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/HTTPS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 FastAPI Ollama Service                       │
│                 (AWS EC2 - Python)                          │
│                                                              │
│  - AI Model Processing                                       │
│  - Ollama Integration                                        │
│  - Already Deployed ✅                                       │
└─────────────────────────────────────────────────────────────┘
```

### Service URLs (Production)

- **Frontend**: `https://ctrlchecks.ai` (Vercel)
- **Worker API**: `https://api.ctrlchecks.ai` (AWS EC2)
- **FastAPI Ollama**: `http://ollama.ctrlchecks.ai:8000` (AWS EC2 - Already deployed)

### Data Flow

1. **User** → Frontend (Vercel)
2. **Frontend** → Worker API (`/api/generate-workflow`, `/api/execute-workflow`)
3. **Worker** → FastAPI Ollama (`/process`, `/api/chat`)
4. **Worker** → Supabase (Database operations)
5. **FastAPI** → Ollama (AI model inference)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **AWS Account** with EC2 access
- ✅ **Vercel Account** (free tier available)
- ✅ **Domain Name** (e.g., `ctrlchecks.ai`) - Optional but recommended
- ✅ **FastAPI Ollama** already deployed (see `Guide/Fast_API_Ollama/`)
- ✅ **Supabase Project** configured
- ✅ **GitHub Repository** access
- ✅ **AWS CLI** installed and configured
- ✅ **Node.js 20+** installed locally
- ✅ **Basic command line knowledge**

---

## Deployment Checklist

Use this checklist to track your progress:

### Phase 1: Worker Deployment (AWS)
- [ ] **Step 1:** Request EC2 Quota (if needed)
- [ ] **Step 2:** Create EC2 Instance for Worker
- [ ] **Step 3:** Configure Security Groups
- [ ] **Step 4:** Allocate Elastic IP
- [ ] **Step 5:** Configure DNS (api.ctrlchecks.ai)
- [ ] **Step 6:** Deploy Worker Application
- [ ] **Step 7:** Configure Environment Variables
- [ ] **Step 8:** Set up SSL/HTTPS (via ALB or CloudFront)
- [ ] **Step 9:** Verify Worker Health

### Phase 2: Frontend Deployment (Vercel)
- [ ] **Step 1:** Connect GitHub Repository to Vercel
- [ ] **Step 2:** Configure Build Settings
- [ ] **Step 3:** Set Environment Variables
- [ ] **Step 4:** Deploy to Vercel
- [ ] **Step 5:** Configure Custom Domain (optional)
- [ ] **Step 6:** Verify Frontend Deployment

### Phase 3: Service Connection
- [ ] **Step 1:** Update Worker Environment (connect to FastAPI)
- [ ] **Step 2:** Update Frontend Environment (connect to Worker & FastAPI)
- [ ] **Step 3:** Test End-to-End Flow
- [ ] **Step 4:** Verify All Services Connected

---

## Step-by-Step Deployment

### Phase 1: Worker Deployment to AWS

**Follow:** [Worker AWS Deployment Guide](./Worker/01_WORKER_AWS_DEPLOYMENT.md)

**Time Estimate:** 2-3 hours

**What you'll do:**
1. Create EC2 instance (t3.medium or larger)
2. Configure security groups
3. Allocate Elastic IP
4. Set up DNS records
5. Deploy Worker application
6. Configure systemd service
7. Set up SSL/HTTPS

**Key Outputs:**
- Worker EC2 Instance ID
- Worker Elastic IP
- Worker Domain: `api.ctrlchecks.ai`
- Worker Health Endpoint: `https://api.ctrlchecks.ai/health`

---

### Phase 2: Frontend Deployment to Vercel

**Follow:** [CtrlChecks Vercel Deployment Guide](./ctrlChecks/01_VERCEL_DEPLOYMENT.md)

**Time Estimate:** 30-45 minutes

**What you'll do:**
1. Connect GitHub repository to Vercel
2. Configure build settings
3. Set environment variables
4. Deploy application
5. Configure custom domain (optional)

**Key Outputs:**
- Vercel Deployment URL
- Frontend Domain: `ctrlchecks.ai` (or Vercel subdomain)
- Production Build

---

### Phase 3: Service Connection Configuration

**Follow:** [Service Connection Guide](./02_SERVICE_CONNECTION.md)

**Time Estimate:** 30 minutes

**What you'll do:**
1. Update Worker `.env` to connect to FastAPI Ollama
2. Update Frontend environment variables in Vercel
3. Test all service connections
4. Verify end-to-end workflow

---

## Service Connection Configuration

### Environment Variables Summary

#### Worker Service (AWS EC2)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# FastAPI Ollama (Already deployed)
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# Worker Service
PORT=3001
PUBLIC_BASE_URL=https://api.ctrlchecks.ai
WORKER_ID=worker-aws-1

# CORS (Allow Vercel frontend)
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
```

#### Frontend (Vercel)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Worker API
VITE_API_URL=https://api.ctrlchecks.ai

# FastAPI Ollama
VITE_PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
VITE_OLLAMA_BASE_URL=http://ollama.ctrlchecks.ai:8000

# Public Base URL
VITE_PUBLIC_BASE_URL=https://ctrlchecks.ai
```

---

## Verification

### 1. Worker Service Health

```bash
# Test Worker health endpoint
curl https://api.ctrlchecks.ai/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

### 2. FastAPI Ollama Health

```bash
# Test FastAPI health endpoint
curl http://ollama.ctrlchecks.ai:8000/health

# Expected response:
# {"status":"healthy","ollama":"running"}
```

### 3. Frontend Deployment

```bash
# Visit frontend URL
https://ctrlchecks.ai

# Should load the application
```

### 4. End-to-End Test

1. **Open Frontend**: `https://ctrlchecks.ai`
2. **Create Workflow**: Use the workflow builder
3. **Execute Workflow**: Run a test workflow
4. **Check Logs**: Verify data flows through all services

### 5. Service Connection Test

```bash
# Test Worker → FastAPI connection
curl -X POST https://api.ctrlchecks.ai/api/process \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:14b-instruct-q4_K_M","messages":[{"role":"user","content":"Hello"}]}'

# Should proxy to FastAPI and return AI response
```

---

## Troubleshooting

### Issue: Worker cannot connect to FastAPI

**Check:**
1. FastAPI is running: `curl http://ollama.ctrlchecks.ai:8000/health`
2. Worker environment variables are correct
3. Security groups allow outbound traffic
4. DNS resolution works: `nslookup ollama.ctrlchecks.ai`

**Solution:**
```bash
# On Worker EC2 instance
curl http://ollama.ctrlchecks.ai:8000/health

# If fails, check:
# 1. FastAPI service status
# 2. Security group rules
# 3. DNS configuration
```

### Issue: Frontend cannot connect to Worker

**Check:**
1. Worker is running: `curl https://api.ctrlchecks.ai/health`
2. CORS is configured correctly in Worker
3. Frontend environment variables are set in Vercel
4. SSL certificate is valid

**Solution:**
```bash
# Check Worker CORS configuration
# Should include: https://ctrlchecks.ai

# Check Vercel environment variables
# VITE_API_URL should be: https://api.ctrlchecks.ai
```

### Issue: SSL Certificate Errors

**Check:**
1. SSL certificate is valid
2. Certificate covers the domain
3. Certificate is not expired

**Solution:**
- Use AWS Certificate Manager (ACM) for ALB
- Or use Let's Encrypt for direct EC2
- Or use CloudFront for SSL termination

---

## Cost Summary

### Monthly Costs (Estimated)

| Service | Cost | Notes |
|---------|------|-------|
| **FastAPI Ollama EC2** | ~$350 | g4dn.xlarge (already deployed) |
| **Worker EC2** | ~$30-50 | t3.medium (2 vCPU, 4GB RAM) |
| **Vercel Frontend** | $0-20 | Free tier available, Pro for custom domain |
| **Route 53 DNS** | ~$0.50 | Per hosted zone |
| **Elastic IPs** | $0 | Free when attached to instances |
| **Data Transfer** | ~$10-20 | Varies by usage |
| **Total** | **~$390-440/month** | |

### Cost Optimization

1. **Use Reserved Instances** (save up to 72%)
2. **Stop instances when not in use** (saves compute)
3. **Use Vercel Free Tier** (if no custom domain needed)
4. **Monitor usage** with AWS Cost Explorer

---

## Next Steps

After successful deployment:

1. **Set up Monitoring**
   - CloudWatch for AWS services
   - Vercel Analytics for frontend
   - Error tracking (Sentry, etc.)

2. **Set up CI/CD**
   - GitHub Actions for automated deployment
   - Auto-deploy on push to main branch

3. **Set up Backups**
   - EBS snapshots for EC2 instances
   - Database backups (Supabase)

4. **Set up Alerts**
   - Health check failures
   - High CPU/Memory usage
   - Cost alerts

---

## Quick Reference

### Important URLs

- **Frontend**: `https://ctrlchecks.ai`
- **Worker API**: `https://api.ctrlchecks.ai`
- **FastAPI Ollama**: `http://ollama.ctrlchecks.ai:8000`
- **API Docs**: `http://ollama.ctrlchecks.ai:8000/docs`

### Important Commands

```bash
# Worker health check
curl https://api.ctrlchecks.ai/health

# FastAPI health check
curl http://ollama.ctrlchecks.ai:8000/health

# Test workflow generation
curl -X POST https://api.ctrlchecks.ai/api/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a workflow"}'
```

---

## Support Resources

- **Worker Deployment**: `Guide/Worker/01_WORKER_AWS_DEPLOYMENT.md`
- **Frontend Deployment**: `Guide/ctrlChecks/01_VERCEL_DEPLOYMENT.md`
- **Service Connection**: `Guide/02_SERVICE_CONNECTION.md`
- **FastAPI Deployment**: `Guide/Fast_API_Ollama/00_COMPLETE_DEPLOYMENT_GUIDE.md`

---

## Summary

You've successfully deployed:

✅ **Worker Service** on AWS EC2  
✅ **Frontend** on Vercel  
✅ **All services connected** and working together  
✅ **Production-ready** CtrlChecks application  

**🎉 Congratulations! Your application is now in production!**
