# Complete AWS Deployment Guide - FastAPI Ollama Service

**Complete step-by-step guide for deploying FastAPI Ollama service on AWS**

This is your master guide. Follow it from start to finish to deploy your FastAPI Ollama service on AWS with domain `ctrlchecks.ai`.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start Checklist](#quick-start-checklist)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Verification](#verification)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Cost Summary](#cost-summary)

---

## Overview

### What We're Building

- **Service:** FastAPI Ollama Proxy Service
- **Domain:** ctrlchecks.ai (and api.ctrlchecks.ai)
- **Infrastructure:**
  - EC2 Instance (g4dn.xlarge - GPU instance with 16GB GPU)
  - Elastic IP (static IP address)
  - Route 53 DNS (domain configuration)
  - Security Groups (firewall rules)
- **AI Models (Production):**
- `qwen2.5:14b-instruct-q4_K_M` (~8GB) - General purpose, reasoning, multilingual
- `qwen2.5-coder:7b-instruct-q4_K_M` (~4.5GB) - Code generation and analysis
- **Total:** ~12.5GB (fits in 16GB GPU)

### Architecture

```
Internet
    ↓
Route 53 DNS (ctrlchecks.ai)
    ↓
Elastic IP (54.123.45.67)
    ↓
EC2 Instance (g4dn.xlarge - 16GB GPU)
    ├── Ollama Service (port 11434)
    │   ├── qwen2.5:14b-instruct-q4_K_M (General purpose)
    │   └── qwen2.5-coder:7b-instruct-q4_K_M (Code generation)
    └── FastAPI Service (port 8000)
```

---

## Prerequisites

Before starting, ensure you have:

- ✅ AWS account created
- ✅ Domain name: `ctrlchecks.ai` (registered)
- ✅ GitHub repository access: https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git
- ✅ Basic command line knowledge
- ✅ 2-3 hours for complete setup

---

## Quick Start Checklist

Use this checklist to track your progress:

- [ ] **Step 0:** Request Quota Increase (CRITICAL for GPU instances!)
- [ ] **Step 1:** AWS Account Setup
- [ ] **Step 2:** Create EC2 Instance
- [ ] **Step 3:** Configure Security Groups
- [ ] **Step 4:** Allocate Elastic IP
- [ ] **Step 5:** Configure Route 53 DNS
- [ ] **Step 6:** Deploy Application
- [ ] **Step 7:** Verify Deployment
- [ ] **Step 8:** Test Endpoints

---

## Step-by-Step Deployment

### Step 0: Request Quota Increase ⏱️ 5 minutes (CRITICAL!)

**⚠️ IMPORTANT:** GPU instances (g4dn.xlarge) require quota increases! Do this FIRST!

**Follow:** [07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)

**What you'll do:**
1. Check current GPU instance quota (likely 0)
2. Request GPU instance vCPU quota increase (minimum 4, recommended 16)
3. Wait for approval (usually 24-48 hours, sometimes instant)

**Quick Request:**
```bash
# Request GPU instance quota increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --desired-value 16 \
  --region us-east-1
```

**Key outputs:**
- Request ID (e.g., `req-xxxxxxxxx`)
- Approval status (check in 24-48 hours)

**Verification:**
```bash
# Check request status
aws service-quotas get-requested-service-quota-change \
  --request-id req-xxxxxxxxx

# After approval, verify quota
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --query "Quota.Value" \
  --output text
# Should show 16 (or your requested value)
```

**✅ Checkpoint:** Quota increase requested (or approved)

**⚠️ Note:** You can proceed with other steps while waiting for approval, but you won't be able to launch the instance until approved.

---

### Step 1: AWS Account Setup ⏱️ 30 minutes

**Follow:** [01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)

**What you'll do:**
1. Create AWS account (if not done)
2. Set up billing alerts
3. Create IAM user
4. Install and configure AWS CLI

**Key outputs:**
- AWS Access Key ID
- AWS Secret Access Key
- AWS CLI configured

**Verification:**
```bash
aws sts get-caller-identity
# Should return your account info
```

**✅ Checkpoint:** AWS CLI working

---

### Step 2: Create EC2 Instance ⏱️ 20 minutes

**Follow:** [02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)

**⚠️ Prerequisite:** Ensure quota increase is approved (Step 0)!

**What you'll do:**
1. Create key pair for SSH access
2. Launch EC2 instance (g4dn.xlarge)
3. Configure instance settings
4. Wait for instance to start

**If quota not approved, you'll see error:**
```
You have requested more vCPU capacity than your current limit allows.
```

**Solution:** Wait for quota approval or request increase (Step 0)

**Key outputs:**
- Instance ID (e.g., `i-xxxxxxxxxxxxx`)
- Public IP address (temporary)
- SSH key pair file

**Instance specifications:**
- **Type:** g4dn.xlarge
- **OS:** Ubuntu 22.04 LTS
- **Storage:** 50 GB
- **Cost:** ~$350/month

**Verification:**
```bash
# Check instance status
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].State.Name" \
  --output text
# Should return: running
```

**✅ Checkpoint:** Instance running

---

### Step 3: Configure Security Groups ⏱️ 15 minutes

**Follow:** [03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)

**What you'll do:**
1. Create security group
2. Add inbound rules:
   - SSH (22) from your IP
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
   - FastAPI (8000) from anywhere
   - Ollama (11434) localhost only
3. Attach to instance

**Key outputs:**
- Security Group ID (e.g., `sg-xxxxxxxxx`)

**Verification:**
```bash
# List security group rules
aws ec2 describe-security-groups \
  --group-names ctrlchecks-ollama-sg \
  --query "SecurityGroups[0].IpPermissions" \
  --output table
```

**✅ Checkpoint:** Security group configured

---

### Step 4: Allocate Elastic IP ⏱️ 10 minutes

**Follow:** [04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)

**What you'll do:**
1. Allocate Elastic IP address
2. Associate with EC2 instance
3. Verify association

**Key outputs:**
- Elastic IP address (e.g., `54.123.45.67`)
- Allocation ID (e.g., `eipalloc-xxxxxxxxx`)

**Verification:**
```bash
# Get Elastic IP
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
# Should return your Elastic IP
```

**✅ Checkpoint:** Elastic IP assigned

---

### Step 5: Configure Route 53 DNS ⏱️ 30 minutes

**Follow:** [05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)

**What you'll do:**
1. Create hosted zone for ctrlchecks.ai
2. Update nameservers at domain registrar
3. Create DNS records:
   - A record: `ctrlchecks.ai` → Elastic IP
   - A record: `api.ctrlchecks.ai` → Elastic IP
4. Wait for DNS propagation (24-48 hours, usually faster)

**Key outputs:**
- Hosted Zone ID (e.g., `Z1234567890ABC`)
- Nameservers (4 addresses)

**DNS Records to create:**
```
ctrlchecks.ai        A    54.123.45.67
api.ctrlchecks.ai    A    54.123.45.67
www.ctrlchecks.ai    CNAME ctrlchecks.ai
```

**Verification:**
```bash
# Check DNS resolution
dig ctrlchecks.ai +short
# Should return your Elastic IP (after propagation)
```

**✅ Checkpoint:** DNS records created

---

### Step 6: Deploy Application ⏱️ 45 minutes (or 5-10 minutes if using user data)

**Follow:** [06_Application_Deployment.md](./06_Application_Deployment.md)

**Two Options:**

**Option A: Automated (If you used user data script)**
- Repository already cloned
- Dependencies already installed
- Just need to verify and start services
- Time: 5-10 minutes

**Option B: Manual Deployment**
- Full control over each step
- Better for learning
- Time: 45 minutes

**What you'll do (Manual):**
1. Connect to EC2 instance via SSH
2. Install dependencies (Python 3.11, Ollama, NVIDIA drivers)
3. Clone GitHub repository: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`
4. Set up Python virtual environment
5. Install Python dependencies
6. Configure environment variables
7. Create systemd services
8. Start services
9. Pull Ollama models

**Key commands:**
```bash
# Connect to instance
ssh -i ctrlchecks-ollama-key.pem ubuntu@YOUR_ELASTIC_IP

# On instance:
cd /opt/fastapi-ollama
git clone https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git .
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Create systemd services (see guide)
sudo systemctl start ollama
sudo systemctl start fastapi-ollama
```

**Verification:**
```bash
# On instance
curl http://localhost:8000/health
# Should return: {"status": "healthy", "ollama": "running"}
```

**✅ Checkpoint:** Application running

---

## Verification

### Complete System Check

Run these tests to verify everything works:

#### 1. Instance Status

```bash
# Check instance is running
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].[State.Name,PublicIpAddress]" \
  --output table
```

#### 2. Security Group

```bash
# Verify security group rules
aws ec2 describe-security-groups \
  --group-names ctrlchecks-ollama-sg \
  --query "SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort]" \
  --output table
```

#### 3. Elastic IP

```bash
# Verify Elastic IP association
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=i-xxxxxxxxxxxxx" \
  --query "Addresses[0].PublicIp" \
  --output text
```

#### 4. DNS Resolution

```bash
# Check DNS (may take time to propagate)
dig ctrlchecks.ai +short
dig api.ctrlchecks.ai +short
# Should return Elastic IP
```

#### 5. Application Health

```bash
# Test via Elastic IP
curl http://YOUR_ELASTIC_IP:8000/health

# Test via domain (after DNS propagation)
curl http://api.ctrlchecks.ai:8000/health

# Expected response:
# {"status": "healthy", "ollama": "running", "timestamp": ...}
```

#### 6. API Endpoints

```bash
# Test root endpoint
curl http://api.ctrlchecks.ai:8000/

# Test models endpoint
curl http://api.ctrlchecks.ai:8000/api/tags

# Test chat endpoint (if models pulled)
curl -X POST http://api.ctrlchecks.ai:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

#### 7. Browser Test

1. Open browser
2. Visit: `http://api.ctrlchecks.ai:8000/docs`
3. You should see FastAPI Swagger documentation ✅

---

## Post-Deployment

### Monitoring

**View logs:**
```bash
# SSH into instance
ssh -i key.pem ubuntu@YOUR_ELASTIC_IP

# View FastAPI logs
sudo journalctl -u fastapi-ollama -f

# View Ollama logs
sudo journalctl -u ollama -f
```

**Check service status:**
```bash
sudo systemctl status fastapi-ollama
sudo systemctl status ollama
```

### Updates

**Update application:**
```bash
cd /opt/fastapi-ollama
git pull origin main
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart fastapi-ollama
```

### Backups

**Create EBS snapshot:**
```bash
# Get volume ID
VOLUME_ID=$(aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId" \
  --output text)

# Create snapshot
aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "FastAPI Ollama backup $(date +%Y-%m-%d)"
```

---

## Troubleshooting

### Common Issues

#### Issue: Cannot connect via SSH

**Check:**
1. Security group allows SSH from your IP
2. Instance is running
3. Using correct key file
4. Correct username (ubuntu)

**Solution:**
```bash
# Update security group with your current IP
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32
```

#### Issue: Application not accessible

**Check:**
1. Security group allows port 8000
2. Application is running
3. Application listens on 0.0.0.0 (not 127.0.0.1)

**Solution:**
```bash
# On instance, check what's listening
sudo netstat -tlnp | grep 8000
# Should show: 0.0.0.0:8000

# Check service status
sudo systemctl status fastapi-ollama

# Restart if needed
sudo systemctl restart fastapi-ollama
```

#### Issue: DNS not resolving

**Check:**
1. Nameservers updated at registrar
2. DNS records created correctly
3. Wait 24-48 hours for propagation

**Solution:**
```bash
# Check DNS records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --query "ResourceRecordSets[?Name=='api.ctrlchecks.ai']"

# Verify nameservers
dig NS ctrlchecks.ai +short
```

#### Issue: Ollama models not found

**Solution:**
```bash
# On instance
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
ollama list

# Verify via API
curl http://localhost:8000/api/tags
```

### Getting Help

1. **Check logs:** `sudo journalctl -u fastapi-ollama -n 100`
2. **Check AWS Console:** EC2 → Instances → Your instance
3. **Review guides:** Each step has detailed troubleshooting
4. **AWS Support:** If account issues, contact AWS Support

---

## Cost Summary

### Monthly Costs (US East - N. Virginia)

| Service | Cost | Notes |
|---------|------|-------|
| **EC2 (g4dn.xlarge)** | ~$350 | 24/7 running |
| **Elastic IP** | $0 | Free when attached |
| **Route 53 Hosted Zone** | $0.50 | Per hosted zone |
| **Route 53 Queries** | ~$0.40 | First 1B queries |
| **EBS Storage (50GB)** | ~$5 | GP3 storage |
| **Data Transfer** | ~$10-20 | Varies by usage |
| **Total** | **~$365-375/month** | |

### Cost Optimization Tips

1. **Stop instance when not in use** (saves compute, pay for storage)
2. **Use Reserved Instances** (save up to 72% with 1-3 year commitment)
3. **Monitor usage** with AWS Cost Explorer
4. **Set up billing alerts** (already done in Step 1)

### Free Tier

- **EC2:** 750 hours/month of t2.micro (not applicable for g4dn.xlarge)
- **Route 53:** First hosted zone free for 12 months
- **EBS:** 30 GB free for 12 months

**Note:** g4dn.xlarge is not eligible for free tier.

---

## Quick Reference

### Important IDs to Save

```bash
# Save these for future reference
INSTANCE_ID="i-xxxxxxxxxxxxx"
SG_ID="sg-xxxxxxxxx"
EIP="54.123.45.67"
ALLOCATION_ID="eipalloc-xxxxxxxxx"
HOSTED_ZONE_ID="Z1234567890ABC"
DOMAIN="ctrlchecks.ai"
```

### Useful Commands

```bash
# Instance management
aws ec2 describe-instances --instance-ids $INSTANCE_ID
aws ec2 start-instances --instance-ids $INSTANCE_ID
aws ec2 stop-instances --instance-ids $INSTANCE_ID

# Service management (on instance)
sudo systemctl status fastapi-ollama
sudo systemctl restart fastapi-ollama
sudo journalctl -u fastapi-ollama -f

# DNS management
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID
dig api.ctrlchecks.ai +short

# Testing
curl http://api.ctrlchecks.ai:8000/health
curl http://api.ctrlchecks.ai:8000/api/tags
```

---

## Next Steps

After successful deployment:

1. **Set up HTTPS/SSL** (requires ALB or CloudFront)
2. **Configure CloudWatch monitoring**
3. **Set up automated backups**
4. **Configure auto-scaling** (if needed)
5. **Set up CI/CD pipeline**
6. **Configure log aggregation**

---

## Support Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **Ollama Documentation:** https://ollama.ai/docs
- **GitHub Repository:** https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git

---

## Summary

You've successfully deployed:

✅ FastAPI Ollama service on AWS EC2  
✅ Elastic IP for stable access  
✅ Route 53 DNS for domain `ctrlchecks.ai`  
✅ Security groups for access control  
✅ Systemd services for automatic startup  
✅ Ollama models for AI functionality  

**Your service is now accessible at:**
- `http://api.ctrlchecks.ai:8000`
- `http://YOUR_ELASTIC_IP:8000`

**API Documentation:**
- `http://api.ctrlchecks.ai:8000/docs`

---

**🎉 Congratulations! Your FastAPI Ollama service is deployed on AWS!**

For detailed information on each step, refer to the individual guides:
- [01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)
- [02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)
- [03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)
- [04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)
- [05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)
- [06_Application_Deployment.md](./06_Application_Deployment.md)
