# Quick Fix: DNS Configuration for ollama.ctrlchecks.ai

## Current Status

✅ **Service is Running:**
- Direct IP access works: `http://ollama.ctrlchecks.ai:8000/health`
- Health check returns: `{"status":"healthy","ollama":"running"}`
- Models installed: 3 models available

❌ **DNS Not Configured:**
- `ollama.ctrlchecks.ai` does not resolve
- Connection timeout when using domain name

## Quick Fix: Create DNS Record

### Option 1: Via AWS Console (Easiest)

1. **Go to Route 53:**
   - AWS Console → Route 53 → Hosted zones
   - Click on `ctrlchecks.ai` hosted zone

2. **Create Record:**
   - Click "Create record"
   - **Record name:** `ollama`
   - **Record type:** A - Routes traffic to an IPv4 address
   - **Value:** `13.232.155.30`
   - **TTL:** 300 (5 minutes)
   - Click "Create records"

3. **Wait 5-10 minutes** for DNS propagation

4. **Test:**
   ```bash
   nslookup ollama.ctrlchecks.ai
   # Should return: 13.232.155.30
   
   curl http://ollama.ctrlchecks.ai:8000/health
   # Should work now
   ```

### Option 2: Via AWS CLI

```bash
# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name ctrlchecks.ai \
  --query "HostedZones[0].Id" \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"

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

echo "DNS record created! Wait 5-10 minutes for propagation."
```

### Verify DNS Record

```bash
# Check DNS resolution
nslookup ollama.ctrlchecks.ai

# Or use dig (if available)
dig ollama.ctrlchecks.ai +short

# Should return: 13.232.155.30
```

### Test After DNS Propagation

```bash
# Test health endpoint
curl http://ollama.ctrlchecks.ai:8000/health

# Test models endpoint
curl http://ollama.ctrlchecks.ai:8000/api/tags
```

---

## Additional Notes

### GPU Detection Issue

Your health check shows `"gpu_available":false`. This might be:
1. **NVIDIA drivers not installed** - Check with `nvidia-smi` on the instance
2. **Detection issue** - GPU might be working but not detected by the health check
3. **Ollama not using GPU** - Check Ollama configuration

**To verify GPU on instance:**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@13.232.155.30

# Check GPU
nvidia-smi

# If not installed, see: Guide/Fast_API_Ollama/06_Application_Deployment.md
```

### Models Installed

✅ **3 models available:**
- `qwen2.5-coder:7b-instruct-q4_K_M` (~4.5GB)
- `qwen2.5:7b-instruct-q4_K_M` (~4.5GB)
- `qwen2.5:14b-instruct-q4_K_M` (~9GB)

**Total:** ~18GB (models fit in 16GB GPU with quantization)

---

## After DNS is Configured

Once DNS is working, your **Worker backend** will be able to connect:

```bash
# On worker backend instance
curl http://ollama.ctrlchecks.ai:8000/health
# Should work now
```

The worker backend is already configured with:
```env
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
```

So once DNS is configured, everything should work automatically!

---

## Quick Test Script

Save this as `test-ollama-dns.sh`:

```bash
#!/bin/bash

echo "Testing Ollama FastAPI Service..."
echo ""

echo "1. Testing direct IP..."
curl -s http://ollama.ctrlchecks.ai:8000/health | jq '.status, .ollama'
echo ""

echo "2. Testing DNS (ollama.ctrlchecks.ai)..."
if curl -s --max-time 5 http://ollama.ctrlchecks.ai:8000/health > /dev/null; then
    echo "✅ DNS is working!"
    curl -s http://ollama.ctrlchecks.ai:8000/health | jq '.status, .ollama'
else
    echo "❌ DNS not configured yet"
    echo "   Create Route 53 A record: ollama.ctrlchecks.ai → 13.232.155.30"
fi
echo ""

echo "3. Available models:"
curl -s http://ollama.ctrlchecks.ai:8000/api/tags | jq '.models[] | .name'
```

Run: `chmod +x test-ollama-dns.sh && ./test-ollama-dns.sh`

---

**Next Steps:**
1. ✅ Create DNS record (see above)
2. ⏳ Wait 5-10 minutes for propagation
3. ✅ Test: `curl http://ollama.ctrlchecks.ai:8000/health`
4. ✅ Verify worker backend can connect
