# How to Start AWS Deployment

**Quick reference guide to begin your AWS deployment**

## 🎯 Before You Start

### Prerequisites Checklist

- [ ] AWS account created (aws.amazon.com)
- [ ] Domain name registered (ctrlchecks.ai)
- [ ] GitHub repository access: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`
- [ ] 2-3 hours available for setup
- [ ] Basic command line knowledge

## 🚀 Step-by-Step: How to Start

### Step 0: Request Quota Increase (CRITICAL - Do This First!)

**⚠️ MUST DO FIRST:** GPU instances require quota approval (24-48 hours)

1. **Read:** [07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)
2. **Request:** GPU instance quota increase
3. **Wait:** For AWS approval email
4. **Verify:** Check quota status in AWS Console

**Why?** Without quota approval, you cannot launch g4dn.xlarge instances!

---

### Step 1: Set Up AWS Account

**Time:** 30 minutes

1. **Read:** [01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)
2. **Do:**
   - Create AWS account
   - Set up billing alerts
   - Create IAM user
   - Install AWS CLI
   - Configure AWS CLI

**Verify:**
```bash
aws sts get-caller-identity
# Should return your account info
```

---

### Step 2: Create EC2 Instance

**Time:** 20 minutes

1. **Read:** [02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)
2. **Choose deployment method:**

   **A. Automated (Recommended):**
   - Use user data script during instance creation
   - Script auto-deploys everything
   - Faster setup (5-10 min after launch)
   - **User data script location:** `infrastructure/scripts/ollama-user-data.sh`
   - **Repository:** `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`

   **B. Manual:**
   - Leave user data empty
   - Deploy manually after launch
   - More control, better for learning

3. **Launch instance:**
   - Instance type: `g4dn.xlarge`
   - OS: Ubuntu 22.04 LTS
   - Storage: 50 GB minimum
   - Key pair: Create or select existing

**Verify:**
```bash
# Check instance status
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].State.Name" \
  --output text
# Should return: running
```

---

### Step 3: Configure Security Groups

**Time:** 15 minutes

1. **Read:** [03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)
2. **Configure:**
   - SSH (22) from your IP
   - HTTP (80) from anywhere
   - HTTPS (443) from anywhere
   - FastAPI (8000) from anywhere
   - Ollama (11434) localhost only

**Verify:**
```bash
# List security group rules
aws ec2 describe-security-groups \
  --group-names ctrlchecks-ollama-sg \
  --query "SecurityGroups[0].IpPermissions"
```

---

### Step 4: Allocate Elastic IP

**Time:** 10 minutes

1. **Read:** [04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)
2. **Allocate and associate** Elastic IP with instance

**Verify:**
```bash
# Get Elastic IP
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
```

---

### Step 5: Configure DNS (Route 53)

**Time:** 30 minutes

1. **Read:** [05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)
2. **Create DNS records:**
   - `api.ctrlchecks.ai` → Your Elastic IP
   - `ctrlchecks.ai` → Your Elastic IP

**Note:** DNS propagation takes 24-48 hours (usually faster)

---

### Step 6: Deploy Application

**Time:** 5-10 minutes (automated) or 45 minutes (manual)

1. **Read:** [06_Application_Deployment.md](./06_Application_Deployment.md)

2. **If using automated deployment (user data script):**
   ```bash
   # SSH into instance
   ssh -i key.pem ubuntu@YOUR_ELASTIC_IP
   
   # Check if deployment completed
   sudo systemctl status ollama
   sudo systemctl status fastapi-ollama
   
   # If services are running, you're done!
   # Just verify:
   curl http://localhost:8000/health
   ```

3. **If using manual deployment:**
   - Follow all steps in [06_Application_Deployment.md](./06_Application_Deployment.md)
   - Clone repository: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`
   - Install dependencies
   - Configure environment
   - Set up services

---

## ✅ Verification Checklist

After deployment, verify everything works:

```bash
# 1. Health check
curl http://YOUR_ELASTIC_IP:8000/health
# Expected: {"status": "healthy", "ollama": "running"}

# 2. List models
curl http://YOUR_ELASTIC_IP:8000/api/tags
# Should show: qwen2.5:14b-instruct-q4_K_M and qwen2.5-coder:7b-instruct-q4_K_M

# 3. Check services
sudo systemctl status ollama
sudo systemctl status fastapi-ollama
# Both should be "active (running)"

# 4. Test API
curl -X POST http://YOUR_ELASTIC_IP:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:14b-instruct-q4_K_M", "messages": [{"role": "user", "content": "Hello!"}], "stream": false}'
```

---

## 🆘 Troubleshooting

### Issue: "Quota exceeded" when launching instance

**Solution:** Wait for quota approval (Step 0) or use smaller instance type

### Issue: "Connection refused" on port 8000

**Solution:**
- Check security group allows port 8000
- Check service is running: `sudo systemctl status fastapi-ollama`
- Check logs: `sudo journalctl -u fastapi-ollama -n 50`

### Issue: Models not found

**Solution:**
```bash
# Pull models manually
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

### Issue: Repository clone fails

**Solution:**
- Verify repository URL: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`
- Check internet connectivity: `ping google.com`
- For private repos, set up SSH keys (see deployment guide)

---

## 📚 Full Guides

For detailed instructions, see:

- **[00_COMPLETE_DEPLOYMENT_GUIDE.md](./00_COMPLETE_DEPLOYMENT_GUIDE.md)** - Master guide
- **[MANUAL_AWS_CONSOLE_SETUP.md](./MANUAL_AWS_CONSOLE_SETUP.md)** - Visual step-by-step
- **[QUICK_START.md](./QUICK_START.md)** - Fast track for experts

---

## 🎯 Quick Start Command Reference

**For experienced users - all in one:**

```bash
# 0. Request quota (do this first!)
# See: 07_AWS_Quota_Increase_Guide.md

# 1. Create security group
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
SG_ID=$(aws ec2 create-security-group --group-name ctrlchecks-ollama-sg --description "FastAPI Ollama" --vpc-id $VPC_ID --query "GroupId" --output text)
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $MY_IP/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0

# 2. Launch instance with user data
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type g4dn.xlarge \
  --key-name ctrlchecks-ollama-key \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50}}]' \
  --user-data file://infrastructure/scripts/ollama-user-data.sh

# 3. Allocate Elastic IP and associate
# 4. Configure Route 53 DNS
# 5. Wait 5-10 minutes, then verify deployment
```

---

**Ready to start? Begin with [07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)**
