# 🚀 START HERE - Clean and Deploy FastAPI Ollama

**Your Repository:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

---

## Quick Start

You've already pushed your code to Git. Now follow these steps to clean your EC2 instance and deploy fresh:

### Option 1: Step-by-Step Guide (Recommended)

**Follow:** [CLEAN_AND_REDEPLOY.md](./CLEAN_AND_REDEPLOY.md)

This guide will:
1. ✅ Clean all old files from EC2
2. ✅ Install Python 3.11
3. ✅ Install Ollama
4. ✅ Clone your repository
5. ✅ Set up FastAPI service
6. ✅ Pull models
7. ✅ Test everything

**Time:** 30-45 minutes

---

### Option 2: Automated Script (Faster)

**Use:** [QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)

```bash
# On EC2 instance
curl -fsSL https://raw.githubusercontent.com/servicepathtotechnologies-ops/Fast_API_OLLAMA/main/Guide/Fast_API_Ollama/QUICK_DEPLOYMENT_SCRIPT.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

**Time:** 15-20 minutes

---

## What You'll Deploy

- ✅ FastAPI service with LTX-2 integration (7 video modes)
- ✅ Ollama service with production models
- ✅ Systemd services (auto-start on boot)
- ✅ Complete configuration

---

## Prerequisites

- [x] Code pushed to Git ✅
- [ ] EC2 instance running
- [ ] SSH access to instance
- [ ] Instance IP address

---

## Deployment Steps Summary

1. **Connect to EC2**
   ```bash
   ssh -i your-key.pem ubuntu@YOUR_EC2_IP
   ```

2. **Clean Old Files**
   - Stop services
   - Remove old installations
   - Clean system

3. **Install Dependencies**
   - Python 3.11
   - Ollama
   - System tools

4. **Clone Repository**
   ```bash
   git clone https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git /opt/fastapi-ollama
   ```

5. **Set Up FastAPI**
   - Create virtual environment
   - Install dependencies
   - Configure .env file

6. **Create Services**
   - Ollama systemd service
   - FastAPI systemd service
   - Start services

7. **Pull Models**
   - qwen2.5:14b-instruct-q4_K_M
   - qwen2.5-coder:7b-instruct-q4_K_M

8. **Test**
   - Health check
   - API endpoints
   - Service status

---

## Recommended Path

**For First-Time Deployment:**
1. Read: [CLEAN_AND_REDEPLOY.md](./CLEAN_AND_REDEPLOY.md)
2. Follow each step carefully
3. Verify at each checkpoint

**For Quick Deployment:**
1. Use: [QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)
2. Answer prompts
3. Verify at end

---

## Your Repository

**GitHub:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

All deployment guides have been updated with this URL.

---

## Quick Commands Reference

### On EC2 Instance

```bash
# Clean old files
sudo systemctl stop fastapi-ollama ollama
sudo rm -rf /opt/fastapi-ollama /usr/local/bin/ollama

# Clone repository
cd /opt
sudo mkdir -p fastapi-ollama
sudo chown ubuntu:ubuntu fastapi-ollama
cd fastapi-ollama
git clone https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git .

# Set up
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Edit .env file

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Create services (see CLEAN_AND_REDEPLOY.md for full commands)
# ...

# Test
curl http://localhost:8000/health
```

---

## Need Help?

- **Step-by-Step Guide:** [CLEAN_AND_REDEPLOY.md](./CLEAN_AND_REDEPLOY.md)
- **Complete Guide:** [COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)
- **Troubleshooting:** Check logs with `sudo journalctl -u fastapi-ollama -n 50`

---

**Ready to deploy?** → Go to [CLEAN_AND_REDEPLOY.md](./CLEAN_AND_REDEPLOYMENT.md)
