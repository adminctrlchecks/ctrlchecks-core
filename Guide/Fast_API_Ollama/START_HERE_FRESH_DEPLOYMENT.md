# 🚀 START HERE - Fresh Deployment Guide

**Complete step-by-step guide for deploying FastAPI Ollama on a fresh EC2 instance**

**Your Repository:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

**Quick Start:** If you want to clean and redeploy, see [CLEAN_AND_REDEPLOY.md](./CLEAN_AND_REDEPLOY.md)

---

## 📋 Overview

This guide covers **everything** from pushing code to Git to having a fully working FastAPI Ollama service on AWS EC2.

### What You'll Deploy

- ✅ FastAPI service with LTX-2 integration (7 video generation modes)
- ✅ Ollama service with production models
- ✅ Systemd services for auto-start
- ✅ Complete configuration

---

## 🎯 Quick Start Options

### Option 1: Automated Script (Fastest - 15 minutes)

**Best for:** Quick deployment, experienced users

```bash
# 1. Code is already pushed to Git ✅
# Repository: https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git

# 2. Connect to EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 3. Download and run automated script
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/Guide/Fast_API_Ollama/QUICK_DEPLOYMENT_SCRIPT.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

**Follow:** [QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)

---

### Option 2: Step-by-Step Manual Guide (Recommended - 30-45 minutes)

**Best for:** Learning, first-time deployment, troubleshooting

**Follow:** [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)

This guide includes:
- ✅ Git push instructions
- ✅ EC2 connection
- ✅ System cleanup
- ✅ Python 3.11 installation
- ✅ Ollama installation (with systemd)
- ✅ FastAPI deployment
- ✅ Environment configuration
- ✅ Service setup
- ✅ Model installation
- ✅ Testing and verification

---

## 📚 Complete Guide Structure

### Part 1: Git Setup
1. Push code to repository
2. Verify push

### Part 2: EC2 Connection
1. Get instance IP
2. Connect via SSH

### Part 3: System Preparation
1. Update system
2. Clean old files
3. Install tools

### Part 4: Python Installation
1. Add Python 3.11 repository
2. Install Python 3.11
3. Verify installation

### Part 5: Ollama Installation
1. Download and install Ollama
2. Create systemd service
3. Start and verify Ollama

### Part 6: FastAPI Deployment
1. Clone repository
2. Create virtual environment
3. Install dependencies
4. Configure environment

### Part 7: Service Configuration
1. Create systemd service
2. Enable auto-start
3. Start services

### Part 8: Model Installation
1. Pull qwen2.5:14b-instruct-q4_K_M
2. Pull qwen2.5-coder:7b-instruct-q4_K_M
3. Verify models

### Part 9: Testing
1. Health checks
2. API endpoint tests
3. Service verification

### Part 10: Optional LTX-2 Setup
1. Download LTX-2 model
2. Configure generation script
3. Enable LTX-2

---

## 🔧 Prerequisites

Before starting, ensure you have:

- [ ] AWS EC2 instance running (g4dn.xlarge recommended)
- [ ] SSH key pair (.pem file)
- [ ] Git repository access
- [ ] EC2 instance IP address
- [ ] Basic Linux command knowledge

---

## 📖 Detailed Guides

### Main Deployment Guide
**[COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)**
- Complete step-by-step instructions
- Every command explained
- Troubleshooting included
- **Use this for first-time deployment**

### Quick Deployment Script
**[QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)**
- Automated deployment script
- Runs all steps automatically
- Interactive prompts
- **Use this for faster deployment**

### Existing Guides (Reference)
- **[06_Application_Deployment.md](./06_Application_Deployment.md)** - Original deployment guide
- **[AWS_DEPLOYMENT_CHECKLIST.md](../../Fast_API_Ollama/AWS_DEPLOYMENT_CHECKLIST.md)** - Deployment checklist
- **[LTX2_SETUP.md](../../Fast_API_Ollama/LTX2_SETUP.md)** - LTX-2 setup guide

---

## 🎬 Deployment Flow

```
1. Push Code to Git
   ↓
2. Connect to EC2
   ↓
3. Clean & Prepare System
   ↓
4. Install Python 3.11
   ↓
5. Install Ollama
   ↓
6. Clone Repository
   ↓
7. Set Up FastAPI
   ↓
8. Configure Services
   ↓
9. Pull Models
   ↓
10. Test & Verify
```

---

## ⚡ Quick Commands Reference

### On Your Local Machine

```bash
# Push code to Git
git add .
git commit -m "Deploy FastAPI Ollama"
git push origin main

# Connect to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### On EC2 Instance

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Clone repository
cd /opt
sudo mkdir -p fastapi-ollama
sudo chown ubuntu:ubuntu fastapi-ollama
cd fastapi-ollama
git clone YOUR_REPO_URL .

# Set up FastAPI
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Edit .env file

# Create systemd service (see guide)
sudo systemctl enable fastapi-ollama
sudo systemctl start fastapi-ollama

# Pull models
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Ollama service running: `sudo systemctl status ollama`
- [ ] FastAPI service running: `sudo systemctl status fastapi-ollama`
- [ ] Health check: `curl http://localhost:8000/health`
- [ ] Models listed: `curl http://localhost:8000/api/tags`
- [ ] Chat working: Test `/api/chat` endpoint
- [ ] LTX-2 info: `curl http://localhost:8000/api/video/info` (optional)

---

## 🆘 Need Help?

### Common Issues

1. **Service won't start**
   - Check logs: `sudo journalctl -u fastapi-ollama -n 50`
   - Verify .env file exists
   - Check Python version

2. **Ollama not responding**
   - Check service: `sudo systemctl status ollama`
   - Verify port: `curl http://localhost:11434/api/tags`

3. **Import errors**
   - Activate venv: `source venv/bin/activate`
   - Reinstall: `pip install -r requirements.txt`

### Get Support

- Check logs: `sudo journalctl -u fastapi-ollama -f`
- Review guide: [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)
- Check troubleshooting section in guide

---

## 📝 Next Steps After Deployment

1. **Configure Domain** (if using Route 53)
2. **Set up HTTPS** (nginx reverse proxy)
3. **Configure Monitoring** (CloudWatch, alerts)
4. **Set up Backups** (automated snapshots)
5. **Enable LTX-2** (when ready, see LTX2_SETUP.md)

---

## 🎯 Recommended Path

**For First-Time Deployment:**
1. Read: [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)
2. Follow each step carefully
3. Verify at each checkpoint

**For Quick Deployment:**
1. Use: [QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)
2. Answer prompts
3. Verify at end

---

**Ready to start?** → Go to [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)

---

**Last Updated**: After LTX-2 integration  
**Version**: 1.0.0
