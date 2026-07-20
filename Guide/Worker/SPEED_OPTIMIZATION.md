# Backend Response Speed Optimization Guide

## Current Issues: Slow Response Times

### Problem Analysis
- AI requests taking 30+ seconds
- Timeout errors (504 Gateway Timeout)
- User experience: "Response is too delayed"

---

## Solution 1: Upgrade Ollama Server to GPU (RECOMMENDED)

**This is the BIGGEST performance improvement you can make.**

### Current Setup
- Ollama running on CPU → Slow inference (5-30+ seconds per request)
- Worker backend on t3.medium → Fine (just makes API calls)

### Recommended: Add GPU to Ollama Server

**Option A: AWS EC2 GPU Instance (Best Performance)**

```bash
# Stop current Ollama instance (if you have one)
# Launch new GPU instance for Ollama

# Recommended: g4dn.xlarge
# - 1x NVIDIA T4 GPU (16GB)
# - 4 vCPUs, 16 GB RAM
# - Cost: ~$0.50/hour (~$360/month)
# - Speed: 10-50x faster than CPU

# Or: g5.xlarge (better performance)
# - 1x NVIDIA A10G GPU (24GB)
# - 4 vCPUs, 16 GB RAM
# - Cost: ~$1.00/hour (~$720/month)
# - Speed: 20-100x faster than CPU
```

**Steps to Deploy Ollama on GPU:**

1. **Launch GPU Instance:**
```bash
# Get latest Ubuntu 22.04 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

# Launch g4dn.xlarge instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type g4dn.xlarge \
  --key-name ctrlchecks-worker-key \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ctrlchecks-ollama-gpu}]' \
  --query 'Instances[0].InstanceId' \
  --output text)
```

2. **Install NVIDIA Drivers and Ollama:**
```bash
# SSH into GPU instance
ssh -i ctrlchecks-worker-key.pem ubuntu@<GPU_INSTANCE_IP>

# Install NVIDIA drivers (Ubuntu 22.04)
sudo apt-get update
sudo apt-get install -y ubuntu-drivers-common
sudo ubuntu-drivers autoinstall

# Reboot to load drivers
sudo reboot

# After reboot, verify GPU
nvidia-smi
# Should show NVIDIA T4 or A10G GPU

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model (in another terminal)
ollama pull llama2
ollama pull mistral
```

3. **Update Worker Backend to Use GPU Ollama:**
```bash
# On worker backend server
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# Edit .env
nano .env

# Update Ollama URL to point to GPU instance
FASTAPI_OLLAMA_URL=http://<GPU_INSTANCE_IP>:11434
# OR if you set up domain:
FASTAPI_OLLAMA_URL=http://ollama-gpu.ctrlchecks.ai:11434

# Restart worker
sudo systemctl restart ctrlchecks-worker
```

**Expected Performance Improvement:**
- Before (CPU): 10-30+ seconds per AI request
- After (GPU): 1-5 seconds per AI request
- **Speed improvement: 5-10x faster**

---

## Solution 2: Upgrade Worker Backend Instance (If CPU is bottleneck)

**Only needed if backend is slow, not AI processing.**

### Current: t3.medium
- 2 vCPUs, 4 GB RAM
- Cost: ~$30/month

### Upgrade Options:

**Option A: t3.large**
- 2 vCPUs, 8 GB RAM
- Cost: ~$60/month
- Good for: More concurrent requests

**Option B: t3.xlarge**
- 4 vCPUs, 16 GB RAM
- Cost: ~$120/month
- Good for: High traffic

**Option C: c5.xlarge (Compute Optimized)**
- 4 vCPUs, 8 GB RAM
- Better CPU performance
- Cost: ~$150/month
- Good for: CPU-intensive operations

**How to Upgrade:**

```bash
# Stop current instance
aws ec2 stop-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for stopped
aws ec2 wait instance-stopped --instance-ids i-xxxxxxxxxxxxx

# Change instance type
aws ec2 modify-instance-attribute \
  --instance-id i-xxxxxxxxxxxxx \
  --instance-type Value=t3.large

# Start instance
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for running
aws ec2 wait instance-running --instance-ids i-xxxxxxxxxxxxx
```

---

## Solution 3: Optimize Current Setup (No Cost)

### A. Enable Response Caching

**Check if caching is enabled in backend:**
```bash
# On worker server
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# Check for caching configuration
grep -i cache .env
```

### B. Use Smaller/Faster AI Models

**If using large models, switch to smaller ones:**
- Instead of: `llama2:70b` (slow, large)
- Use: `llama2:7b` or `mistral:7b` (faster, smaller)
- Or: `phi` or `tinyllama` (very fast, small)

**Update model in Ollama:**
```bash
# On Ollama server
ollama pull mistral:7b
# Then update backend to use mistral:7b instead of larger models
```

### C. Reduce AI Request Complexity

**Optimize prompts to be shorter:**
- Shorter prompts = faster responses
- Use templates instead of generating from scratch
- Cache common responses

---

## Solution 4: Use Cloud GPU Services (Alternative)

**Instead of managing GPU yourself:**

### Option A: RunPod / Vast.ai
- Rent GPU by the hour
- Cost: $0.20-0.50/hour for T4 GPU
- Good for: Testing or variable workloads

### Option B: AWS SageMaker / Bedrock
- Managed AI service
- Pay per request
- No server management

---

## Quick Performance Test

**Test current Ollama speed:**
```bash
# From worker server, test Ollama response time
time curl -X POST http://ollama.ctrlchecks.ai:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama2","prompt":"Hello","stream":false}'
```

**If response time > 10 seconds:**
- ✅ Add GPU to Ollama (Solution 1) - **BEST OPTION**

**If response time < 5 seconds:**
- ✅ Current setup is fine, optimize Nginx timeouts

---

## Recommended Action Plan

### Priority 1: Add GPU to Ollama (Biggest Impact)
1. Launch `g4dn.xlarge` instance for Ollama
2. Install NVIDIA drivers
3. Install Ollama with GPU support
4. Update worker backend to use GPU Ollama
5. **Expected: 5-10x faster responses**

### Priority 2: Fix Nginx Timeouts (Already provided)
- Update Nginx config with 1800s timeouts
- Prevents timeout errors

### Priority 3: Optimize Models
- Use smaller, faster models
- Enable caching

---

## Cost Comparison

| Setup | Monthly Cost | Response Time | Best For |
|-------|-------------|---------------|----------|
| **Current (CPU)** | ~$40 | 10-30+ seconds | Development |
| **GPU Ollama (g4dn.xlarge)** | ~$400 | 1-5 seconds | Production |
| **GPU Ollama (g5.xlarge)** | ~$760 | 0.5-3 seconds | High traffic |

---

## Quick Start: Add GPU to Ollama

**Complete script to set up GPU Ollama:**

```bash
#!/bin/bash
# Deploy Ollama on GPU instance

# 1. Launch GPU instance (run from your local machine)
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type g4dn.xlarge \
  --key-name ctrlchecks-worker-key \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ctrlchecks-ollama-gpu}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "GPU Instance ID: $INSTANCE_ID"
echo "Wait 2-3 minutes for instance to start, then SSH and run setup script below"
```

**On GPU instance (after it starts):**
```bash
# Install NVIDIA drivers
sudo apt-get update
sudo ubuntu-drivers autoinstall
sudo reboot

# After reboot, verify GPU
nvidia-smi

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Pull fast model
ollama pull mistral:7b
```

**Update worker backend:**
```bash
# On worker server
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker
nano .env

# Update to GPU Ollama
FASTAPI_OLLAMA_URL=http://<GPU_INSTANCE_IP>:11434

# Restart
sudo systemctl restart ctrlchecks-worker
```

---

## Summary

**For fastest responses:**
1. ✅ Add GPU to Ollama server (g4dn.xlarge or g5.xlarge)
2. ✅ Use smaller, faster models (mistral:7b instead of llama2:70b)
3. ✅ Fix Nginx timeouts (already provided)
4. ✅ Enable response caching

**Expected result:** Responses go from 10-30+ seconds → 1-5 seconds
