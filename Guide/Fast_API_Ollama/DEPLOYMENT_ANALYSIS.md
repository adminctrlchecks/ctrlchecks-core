# FastAPI Ollama Deployment Analysis

**Analysis Date:** Current  
**Instance ID:** `i-09a86a74a6a612af4`  
**Public IP:** `13.232.155.30`  
**Region:** `ap-south-1` (Mumbai)  
**Instance Type:** `g4dn.xlarge` (GPU Instance)

---

## ✅ Current Deployment Status

### Infrastructure Analysis

| Component | Status | Details |
|-----------|--------|---------|
| **EC2 Instance** | ✅ Running | g4dn.xlarge with NVIDIA T4 GPU (16GB) |
| **Elastic IP** | ✅ Assigned | `13.232.155.30` (Static IP) |
| **Region** | ✅ Configured | ap-south-1 (Mumbai) |
| **Instance State** | ✅ Running | Active and accessible |
| **Public DNS** | ✅ Available | `ec2-13-232-155-30.ap-south-1.compute.amazonaws.com` |

### Instance Specifications

- **Instance Type:** `g4dn.xlarge`
  - **vCPU:** 4
  - **Memory:** 16 GB
  - **GPU:** 1x NVIDIA T4 (16 GB GPU memory)
  - **Network:** Up to 25 Gbps
  - **Storage:** EBS optimized

**✅ Perfect for AI workloads!** This instance type is ideal for running Ollama models.

---

## 🔍 Configuration Analysis

### Expected Service Configuration

Based on the deployment guides, your FastAPI Ollama service should be:

1. **FastAPI Service:**
   - **Port:** `8000`
   - **URL:** `http://ollama.ctrlchecks.ai:8000` (direct IP)
   - **Domain:** `http://ollama.ctrlchecks.ai:8000` (if DNS configured)
   - **Health Endpoint:** `/health`

2. **Ollama Service:**
   - **Port:** `11434` (internal, not exposed)
   - **Access:** Via FastAPI proxy only

3. **Models Expected:**
   - `qwen2.5:14b-instruct-q4_K_M` (~8GB) - General purpose
   - `qwen2.5-coder:7b-instruct-q4_K_M` (~4.5GB) - Code generation
   - **Total:** ~12.5GB (fits in 16GB GPU)

### Worker Backend Integration

Your **Worker backend** (deployed at `worker.ctrlchecks.ai`) is configured to connect to:

```env
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
```

**⚠️ Important:** The worker expects the domain `ollama.ctrlchecks.ai` to resolve to your FastAPI instance.

---

## 🔗 DNS Configuration Analysis

### Current DNS Status

**Required DNS Records:**

| Record Name | Type | Should Point To | Current Status |
|-------------|------|-----------------|----------------|
| `ollama.ctrlchecks.ai` | A | `13.232.155.30` | ⚠️ **Needs Verification** |
| `api.ctrlchecks.ai` | A | `13.232.155.30` | ⚠️ **Optional** |

### DNS Verification Steps

**1. Check if DNS is configured:**

```bash
# From your local machine
nslookup ollama.ctrlchecks.ai

# Should return: 13.232.155.30
```

**2. If DNS is not configured, create Route 53 record:**

```bash
# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name ctrlchecks.ai \
  --query "HostedZones[0].Id" \
  --output text | cut -d'/' -f3)

# Create A record for ollama.ctrlchecks.ai
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "ollama.ctrlchecks.ai",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "13.232.155.30"}]
      }
    }]
  }'
```

---

## 🧪 Service Health Check

### Quick Diagnostic Commands

**Run these from your local machine to verify service status:**

```bash
# 1. Test direct IP access (should work immediately)
curl http://ollama.ctrlchecks.ai:8000/health

# Expected response:
# {"status": "healthy", "ollama": "running", "timestamp": ...}

# 2. Test domain access (if DNS configured)
curl http://ollama.ctrlchecks.ai:8000/health

# 3. Test service info
curl http://ollama.ctrlchecks.ai:8000/

# 4. List available models
curl http://ollama.ctrlchecks.ai:8000/api/tags
```

### SSH into Instance for Detailed Check

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@13.232.155.30

# Once connected, run these checks:

# 1. Check FastAPI service status
sudo systemctl status fastapi-ollama

# 2. Check Ollama service status
sudo systemctl status ollama

# 3. Check if port 8000 is listening
sudo netstat -tlnp | grep 8000
# Should show: 0.0.0.0:8000 (NOT 127.0.0.1:8000)

# 4. Check recent logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# 5. Test locally on instance
curl http://localhost:8000/health

# 6. Check GPU status (if NVIDIA drivers installed)
nvidia-smi

# 7. Check Ollama models
ollama list
```

---

## 🔌 Worker Backend Connection

### Current Configuration

Your **Worker backend** (at `worker.ctrlchecks.ai`) is configured to use:

```env
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
```

### Connection Flow

```
Frontend (Vercel)
  ↓
Worker Backend (worker.ctrlchecks.ai:3001)
  ↓ HTTP request to
FastAPI Ollama (ollama.ctrlchecks.ai:8000)
  ↓ Proxy to
Ollama Service (localhost:11434)
  ↓ GPU inference
NVIDIA T4 GPU
```

### Verification Steps

**1. Test from Worker backend instance:**

```bash
# SSH into worker backend
ssh -i worker-key.pem ubuntu@worker.ctrlchecks.ai

# Test connection to FastAPI Ollama
curl http://ollama.ctrlchecks.ai:8000/health

# If DNS not configured, test with IP:
curl http://ollama.ctrlchecks.ai:8000/health
```

**2. Check Worker backend logs:**

```bash
# On worker backend instance
sudo journalctl -u ctrlchecks-worker -n 100 | grep -i ollama
```

---

## 🔒 Security Group Analysis

### Required Ports

Your FastAPI Ollama instance security group should allow:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| **22** | TCP | Your IP | SSH access |
| **8000** | TCP | `0.0.0.0/0` | FastAPI service (public) |
| **11434** | TCP | `127.0.0.1` | Ollama (internal only) |

### Verify Security Group

```bash
# Get security group ID
INSTANCE_ID="i-09a86a74a6a612af4"
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" \
  --output text)

# List security group rules
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query "SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]" \
  --output table
```

**Expected output:**
- Port 22: Your IP/32
- Port 8000: 0.0.0.0/0
- Port 11434: Should NOT be exposed (internal only)

---

## 📊 Performance Analysis

### GPU Utilization

**Expected Performance:**
- **Model Loading:** ~2-5 seconds per model
- **Inference Speed:** 
  - qwen2.5:14b: ~20-50 tokens/second
  - qwen2.5-coder:7b: ~30-70 tokens/second
- **Concurrent Requests:** 1-2 (GPU memory limited)

### Resource Monitoring

**Check resource usage on instance:**

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@13.232.155.30

# Check CPU usage
top -bn1 | head -20

# Check memory usage
free -h

# Check GPU usage (if nvidia-smi installed)
nvidia-smi

# Check disk usage
df -h

# Check network connections
sudo netstat -tlnp | grep -E '8000|11434'
```

---

## ✅ Deployment Checklist

### Infrastructure
- [x] EC2 instance created (g4dn.xlarge)
- [x] Elastic IP allocated (`13.232.155.30`)
- [ ] Security group configured (verify ports 22, 8000)
- [ ] DNS record created (`ollama.ctrlchecks.ai` → `13.232.155.30`)

### Application
- [ ] FastAPI service deployed
- [ ] Ollama service installed and running
- [ ] Systemd services configured
- [ ] Models pulled (qwen2.5:14b, qwen2.5-coder:7b)
- [ ] Health endpoint responding

### Integration
- [ ] Worker backend can connect to FastAPI
- [ ] DNS resolves correctly
- [ ] CORS configured (if needed)
- [ ] Logs monitored

---

## 🚨 Common Issues & Solutions

### Issue 1: Cannot Access Service

**Symptoms:** `curl http://ollama.ctrlchecks.ai:8000/health` returns connection refused

**Solutions:**
1. Check security group allows port 8000
2. Verify service is running: `sudo systemctl status fastapi-ollama`
3. Check service listens on 0.0.0.0 (not 127.0.0.1)
4. Review logs: `sudo journalctl -u fastapi-ollama -n 50`

### Issue 2: DNS Not Resolving

**Symptoms:** `nslookup ollama.ctrlchecks.ai` returns no answer

**Solutions:**
1. Create Route 53 A record (see DNS Configuration section)
2. Wait 5-10 minutes for DNS propagation
3. Verify nameservers are correct at domain registrar

### Issue 3: Worker Cannot Connect

**Symptoms:** Worker backend logs show connection errors

**Solutions:**
1. Test from worker instance: `curl http://ollama.ctrlchecks.ai:8000/health`
2. If DNS fails, use IP temporarily: `curl http://ollama.ctrlchecks.ai:8000/health`
3. Check security group allows traffic from worker instance
4. Verify FastAPI service is running

### Issue 4: Models Not Found

**Symptoms:** API returns "model not found" errors

**Solutions:**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@13.232.155.30

# List models
ollama list

# Pull missing models
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify via API
curl http://localhost:8000/api/tags
```

### Issue 5: GPU Not Detected

**Symptoms:** Slow inference, no GPU utilization

**Solutions:**
```bash
# Check GPU
nvidia-smi

# If not found, install NVIDIA drivers
# (See 06_Application_Deployment.md for driver installation)
```

---

## 📈 Optimization Recommendations

### 1. DNS Configuration
- ✅ Create Route 53 A record for `ollama.ctrlchecks.ai`
- ✅ Use TTL of 300 seconds for faster updates

### 2. Security
- ✅ Restrict port 8000 to specific IPs (worker backend IP) if possible
- ✅ Use HTTPS with SSL certificate (requires ALB or CloudFront)
- ✅ Enable CloudWatch monitoring

### 3. Performance
- ✅ Monitor GPU utilization with `nvidia-smi`
- ✅ Set up CloudWatch alarms for high CPU/memory
- ✅ Consider auto-scaling if traffic increases

### 4. Cost Optimization
- ✅ Use Reserved Instances (save up to 72%)
- ✅ Stop instance when not in use (saves compute costs)
- ✅ Monitor data transfer costs

---

## 🔗 Quick Reference

### Important URLs

- **Direct IP:** `http://ollama.ctrlchecks.ai:8000`
- **Domain (if configured):** `http://ollama.ctrlchecks.ai:8000`
- **Health Check:** `http://ollama.ctrlchecks.ai:8000/health`
- **API Docs:** `http://ollama.ctrlchecks.ai:8000/docs`

### Important Commands

```bash
# Service management
sudo systemctl status fastapi-ollama
sudo systemctl restart fastapi-ollama
sudo journalctl -u fastapi-ollama -f

# Model management
ollama list
ollama pull qwen2.5:14b-instruct-q4_K_M

# Testing
curl http://ollama.ctrlchecks.ai:8000/health
curl http://ollama.ctrlchecks.ai:8000/api/tags
```

---

## 📝 Next Steps

1. **Verify Service Status:**
   ```bash
   curl http://ollama.ctrlchecks.ai:8000/health
   ```

2. **Configure DNS (if not done):**
   - Create Route 53 A record for `ollama.ctrlchecks.ai`
   - Point to `13.232.155.30`

3. **Test Worker Connection:**
   - Verify worker backend can reach FastAPI
   - Check worker logs for connection errors

4. **Monitor Performance:**
   - Set up CloudWatch dashboards
   - Monitor GPU utilization
   - Track API response times

5. **Optimize (Optional):**
   - Set up HTTPS/SSL
   - Configure auto-scaling
   - Set up backups

---

## 🎯 Summary

**Current Status:**
- ✅ Instance running and accessible
- ✅ Elastic IP assigned
- ⚠️ DNS configuration needs verification
- ⚠️ Service deployment status needs verification

**Action Items:**
1. Verify FastAPI service is running on port 8000
2. Create/verify DNS record for `ollama.ctrlchecks.ai`
3. Test connection from worker backend
4. Verify models are installed
5. Monitor service health

**Your instance is ready!** Just verify the service is deployed and DNS is configured correctly.

---

**For detailed deployment steps, see:**
- [06_Application_Deployment.md](./06_Application_Deployment.md)
- [05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)
- [TEST_API.md](./TEST_API.md)
