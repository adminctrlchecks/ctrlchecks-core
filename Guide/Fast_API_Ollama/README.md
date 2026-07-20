# FastAPI Ollama AWS Deployment - Complete Guide

**End-to-end guide for deploying FastAPI Ollama service on AWS with production models**

## 🚀 START HERE - Fresh Deployment

**Deploying on a fresh EC2 instance?** Start here: **[START_HERE_FRESH_DEPLOYMENT.md](./START_HERE_FRESH_DEPLOYMENT.md)** ⭐

**New to AWS deployment?** Start here: **[HOW_TO_START.md](./HOW_TO_START.md)** ⭐

### Step 0: Request Quota Increase (CRITICAL - Do This First!)

**⚠️ IMPORTANT:** GPU instances require quota approval. This takes 24-48 hours!

1. Go to: **[07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)**
2. Request GPU instance quota increase
3. Wait for approval email from AWS
4. **DO NOT proceed until quota is approved!**

### Step 1: Choose Your Deployment Method

**Option A: Automated Deployment (Recommended)**
- Uses user data script to auto-configure everything
- Faster setup (5-10 minutes after instance launch)
- Follow: **[02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)** (with user data)
- Repository: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`

**Option B: Manual Deployment**
- More control, step-by-step
- Better for learning
- Follow: **[06_Application_Deployment.md](./06_Application_Deployment.md)**

### Step 2: Follow These Guides in Order

1. **[07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)** ⚠️ **STEP 0 - CRITICAL!**
2. **[01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)** - **STEP 1**
3. **[02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)** - **STEP 2**
4. **[03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)** - **STEP 3**
5. **[04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)** - **STEP 4**
6. **[05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)** - **STEP 5**
7. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - **STEP 6**

### Alternative: Complete Manual Setup

**For beginners who prefer visual guides:**
- **[MANUAL_AWS_CONSOLE_SETUP.md](./MANUAL_AWS_CONSOLE_SETUP.md)** ⭐
- Complete AWS Console setup - No CLI required
- Step-by-step with screenshots

**For experienced users:**
- **[QUICK_START.md](./QUICK_START.md)**
- Fast track with command-line commands

## 📚 Step-by-Step Guides (In Order)

Follow these guides sequentially for complete deployment:

1. **[07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)** ⚠️ **STEP 0 - CRITICAL!**
   - Request GPU instance quota increase
   - Required before launching g4dn.xlarge
   - Usually takes 24-48 hours for approval

2. **[01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)** - **STEP 1**
   - Create AWS account
   - Set up billing alerts
   - Create IAM user
   - Install and configure AWS CLI

3. **[02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)** - **STEP 2**
   - Choose instance type (g4dn.xlarge - 16GB GPU)
   - Create key pair for SSH access
   - Launch EC2 instance
   - Connect via SSH

4. **[03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)** - **STEP 3**
   - Create security group
   - Configure firewall rules (SSH, HTTP, HTTPS, port 8000)
   - Attach to instance

5. **[04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)** - **STEP 4**
   - Allocate Elastic IP (static IP address)
   - Associate with instance
   - Required for stable DNS

6. **[05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)** - **STEP 5**
   - Create hosted zone for ctrlchecks.ai
   - Update nameservers
   - Create DNS records (A records)

7. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - **STEP 6** (Original guide)
   - Install system dependencies
   - Install Ollama
   - Deploy FastAPI application
   - Configure systemd services
   - Pull production models (qwen2.5:14b-instruct-q4_K_M, qwen2.5-coder:7b-instruct-q4_K_M)

8. **[COMPLETE_FRESH_DEPLOYMENT.md](./COMPLETE_FRESH_DEPLOYMENT.md)** - **⭐ NEW: Complete Fresh Deployment**
   - Step-by-step from Git push to full deployment
   - Includes Ollama installation
   - Includes LTX-2 setup
   - Perfect for fresh EC2 instances

9. **[QUICK_DEPLOYMENT_SCRIPT.sh](./QUICK_DEPLOYMENT_SCRIPT.sh)** - **⭐ Automated Deployment**
   - One-script deployment
   - Interactive prompts
   - Fastest deployment option

## 🎯 What You'll Build

- **EC2 Instance:** g4dn.xlarge (16GB GPU, 16GB RAM)
- **AI Models:** qwen2.5:14b-instruct-q4_K_M (general) + qwen2.5-coder:7b-instruct-q4_K_M (code)
- **Services:** Ollama (port 11434) + FastAPI (port 8000)
- **Domain:** api.ctrlchecks.ai → Your Elastic IP
- **Cost:** ~$365/month

## 📋 Prerequisites

Before starting:
- ✅ AWS account (create at aws.amazon.com)
- ✅ Domain name: `ctrlchecks.ai` (registered)
- ✅ **Quota increase approved** (see Step 0 - CRITICAL!)
- ✅ 2-3 hours for complete setup
- ✅ Basic command line knowledge

## 💰 Estimated Monthly Costs

- **EC2 (g4dn.xlarge):** ~$350/month
- **Elastic IP:** Free (when attached)
- **Route 53:** ~$1/month
- **Storage (50GB):** ~$5/month
- **Total:** ~$365/month

## ✅ Verification

After deployment, test your service:

```bash
# Health check
curl http://api.ctrlchecks.ai:8000/health

# List models
curl http://api.ctrlchecks.ai:8000/api/tags

# API Documentation
# Visit: http://api.ctrlchecks.ai:8000/docs
```

## 🆘 Troubleshooting

Each guide includes troubleshooting sections. Common issues:
- Port 8000 not accessible → Check security group and service status
- Models not loading → Pull models: `ollama pull qwen2.5:14b-instruct-q4_K_M`
- Service crashes → Check logs: `sudo journalctl -u fastapi-ollama -f`

See [06_Application_Deployment.md](./06_Application_Deployment.md) for detailed troubleshooting.

## 📝 Deployment Checklist

Use this checklist to track your progress:

- [ ] **Step 0:** Request GPU quota increase (24-48 hours)
- [ ] **Step 1:** AWS account setup
- [ ] **Step 2:** Create EC2 instance (g4dn.xlarge)
- [ ] **Step 3:** Configure security groups
- [ ] **Step 4:** Allocate Elastic IP
- [ ] **Step 5:** Configure Route 53 DNS
- [ ] **Step 6:** Deploy application
- [ ] **Step 7:** Pull production models
- [ ] **Step 8:** Verify service is accessible

## 🔄 Updating Your Deployment

To update the application after deployment:

```bash
# SSH into instance
ssh -i key.pem ubuntu@YOUR_ELASTIC_IP

# Update code
cd /opt/fastapi-ollama
git pull origin main

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Restart services
sudo systemctl restart ollama
sudo systemctl restart fastapi-ollama
```

---

**Ready to deploy? Start with [00_COMPLETE_DEPLOYMENT_GUIDE.md](./00_COMPLETE_DEPLOYMENT_GUIDE.md) or [MANUAL_AWS_CONSOLE_SETUP.md](./MANUAL_AWS_CONSOLE_SETUP.md)**
