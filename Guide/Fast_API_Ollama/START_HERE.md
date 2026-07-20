# 🚀 START HERE - FastAPI Ollama AWS Deployment

**Quick Start Guide for Fresh AWS Deployment**

---

## 📋 Overview

This guide will help you deploy the FastAPI Ollama service to AWS EC2 from scratch.

**What you'll do:**
1. Push code to GitHub
2. Clean the AWS server completely
3. Install fresh code
4. Configure and deploy the service

**Time Required:** 30-60 minutes  
**Prerequisites:** AWS EC2 g4dn.xlarge instance, Route53 DNS configured

---

## 🎯 Quick Navigation

### For Complete Step-by-Step Guide
👉 **[AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)**

### For Quick Command Reference
👉 **[QUICK_COMMANDS_REFERENCE.md](./QUICK_COMMANDS_REFERENCE.md)**

---

## ⚡ Quick Start (TL;DR)

### 1. Push to GitHub (Local)

```bash
cd Fast_API_Ollama
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git
git add .
git commit -m "Initial FastAPI Ollama service deployment"
git push -u origin main
```

### 2. Clean Server (AWS EC2)

```bash
# Connect to server
ssh -i your-key.pem ubuntu@ollama.ctrlchecks.ai

# Run cleanup script (or manual cleanup)
cd /opt/ollama-api
chmod +x CLEAN_OLLAMA_MODELS.sh
./CLEAN_OLLAMA_MODELS.sh

# Or use automated deployment script
chmod +x DEPLOY_TO_AWS.sh
./DEPLOY_TO_AWS.sh
```

### 3. Manual Deployment (if not using script)

Follow the complete guide: **[AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)**

---

## 📚 Documentation Structure

```
Guide/Fast_API_Ollama/
├── START_HERE.md                          ← You are here
├── AWS_FRESH_DEPLOYMENT_COMPLETE.md       ← Complete step-by-step guide
├── QUICK_COMMANDS_REFERENCE.md            ← Quick command reference
├── QUICK_START.md                         ← Quick setup guide
├── TROUBLESHOOT_SERVICE.md                ← Troubleshooting guide
└── [Other guides...]
```

---

## ✅ Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] AWS EC2 g4dn.xlarge instance running
- [ ] Route53 DNS: `ollama.ctrlchecks.ai` → EC2 Elastic IP
- [ ] Security groups: Ports 22, 80, 443, 8000 open
- [ ] SSH key for EC2 access
- [ ] GitHub repository created: `ctrlchecks-FAO-001`
- [ ] GitHub access credentials ready

---

## 🎯 Deployment Steps Summary

1. **Git Setup** (5 min)
   - Initialize repository
   - Push code to GitHub

2. **Server Cleanup** (10 min)
   - Stop old services
   - Remove old files
   - Clean Ollama models (free space)

3. **Fresh Installation** (15 min)
   - Install system packages
   - Clone repository
   - Setup Python environment

4. **Ollama Setup** (20-30 min)
   - Install Ollama
   - Download required models

5. **Service Configuration** (10 min)
   - Create .env file
   - Setup systemd service
   - Configure Nginx

6. **SSL Setup** (5 min)
   - Install SSL certificate
   - Configure HTTPS

7. **Verification** (5 min)
   - Test endpoints
   - Verify service status

**Total Time:** ~70-80 minutes

---

## 🚀 Automated Deployment

For fastest deployment, use the automated script:

```bash
# On AWS EC2 server
cd /opt
git clone https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git ollama-api
cd ollama-api
chmod +x DEPLOY_TO_AWS.sh
./DEPLOY_TO_AWS.sh
```

The script will:
- ✅ Clean old installation
- ✅ Install dependencies
- ✅ Setup Python environment
- ✅ Configure systemd service
- ✅ Setup Nginx
- ⚠️ You still need to: Download models, Setup SSL

---

## 📖 Next Steps

1. **Read the complete guide:**
   - [AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)

2. **Or use quick reference:**
   - [QUICK_COMMANDS_REFERENCE.md](./QUICK_COMMANDS_REFERENCE.md)

3. **If you encounter issues:**
   - [TROUBLESHOOT_SERVICE.md](./TROUBLESHOOT_SERVICE.md)

---

## 🆘 Need Help?

- Check troubleshooting guide: [TROUBLESHOOT_SERVICE.md](./TROUBLESHOOT_SERVICE.md)
- Review complete deployment guide: [AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)
- Check service logs: `sudo journalctl -u ollama-api -f`

---

**Ready to deploy?** Start with: [AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)
