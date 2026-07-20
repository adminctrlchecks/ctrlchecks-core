# 🔧 Fix Domain Access for worker.ctrlchecks.ai

## Step 1: Check DNS Resolution

**On your server, test DNS:**
```bash
# Check if DNS is resolving
nslookup worker.ctrlchecks.ai
# OR
dig worker.ctrlchecks.ai
# OR
host worker.ctrlchecks.ai
```

**Expected output:** Should show `3.7.115.58`

**If DNS is NOT resolving:**
- DNS record doesn't exist in Route 53
- DNS hasn't propagated yet (wait 10-30 minutes)

---

## Step 2: Test HTTP on Domain

**On your server:**
```bash
# Test HTTP (port 80) using domain name
curl -v http://worker.ctrlchecks.ai/health

# Test HTTP using IP (should work)
curl http://3.7.115.58/health
```

**If domain HTTP doesn't work but IP does:**
- DNS is not configured or not propagated
- Nginx might not be accepting connections on the domain name

---

## Step 3: Check Nginx Config

**Verify your Nginx config includes the domain:**
```bash
sudo cat /etc/nginx/sites-available/ctrlchecks-worker
```

**Should see:**
```nginx
server_name worker.ctrlchecks.ai 3.7.115.58;
```

**If domain is missing, update config:**
```bash
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Make sure it has:**
```nginx
server {
    listen 80;
    server_name worker.ctrlchecks.ai 3.7.115.58;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4: Set Up DNS (If Not Done)

**From Windows PowerShell (NOT on server):**

```powershell
# Set your Elastic IP
$eip = "3.7.115.58"

# Get Hosted Zone ID
$hostedZoneId = aws route53 list-hosted-zones --query "HostedZones[?Name=='ctrlchecks.ai.'] | [0].Id" --output text
$hostedZoneId = $hostedZoneId -replace '/hostedzone/', ''

Write-Host "Hosted Zone ID: $hostedZoneId"
Write-Host "Setting DNS record for worker.ctrlchecks.ai to $eip"

# Create/Update DNS record
aws route53 change-resource-record-sets `
  --hosted-zone-id $hostedZoneId `
  --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"worker.ctrlchecks.ai\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$eip\"}]}}]}"

Write-Host "✅ DNS record created! Wait 5-30 minutes for propagation."
```

**OR use AWS Console:**
1. AWS Console → Route 53 → Hosted zones → `ctrlchecks.ai`
2. Create record:
   - **Name:** `worker`
   - **Type:** `A`
   - **Value:** `3.7.115.58`
   - **TTL:** `300`

---

## Step 5: Test from Outside

**From your local machine (Windows PowerShell):**
```powershell
# Test DNS resolution
nslookup worker.ctrlchecks.ai

# Test HTTP
curl http://worker.ctrlchecks.ai/health

# Test HTTPS (will fail until SSL is set up)
curl -k https://worker.ctrlchecks.ai/health
```

---

## Step 6: Set Up SSL/HTTPS (After DNS Works)

**Once HTTP works on the domain, set up SSL:**

**On your server:**
```bash
# Install Certbot if not already installed
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d worker.ctrlchecks.ai

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**After SSL is set up, test:**
```bash
curl https://worker.ctrlchecks.ai/health
```

---

## Quick Diagnostic Script

**Run this on your server to diagnose everything:**

```bash
#!/bin/bash

echo "=========================================="
echo "Domain Access Diagnostic"
echo "=========================================="
echo ""

# 1. Check DNS resolution
echo "1. Checking DNS resolution..."
if nslookup worker.ctrlchecks.ai > /dev/null 2>&1; then
    echo "✅ DNS resolves:"
    nslookup worker.ctrlchecks.ai | grep -A 1 "Name:"
else
    echo "❌ DNS does NOT resolve"
    echo "   → Set up DNS in Route 53"
fi

# 2. Check Nginx config
echo ""
echo "2. Checking Nginx configuration..."
if grep -q "worker.ctrlchecks.ai" /etc/nginx/sites-available/ctrlchecks-worker; then
    echo "✅ Domain name in Nginx config"
else
    echo "❌ Domain name NOT in Nginx config"
    echo "   → Update /etc/nginx/sites-available/ctrlchecks-worker"
fi

# 3. Test HTTP locally
echo ""
echo "3. Testing HTTP locally..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health | grep -q "200"; then
    echo "✅ HTTP works on localhost:80"
else
    echo "❌ HTTP does NOT work on localhost:80"
fi

# 4. Test HTTP with domain
echo ""
echo "4. Testing HTTP with domain name..."
if curl -s -o /dev/null -w "%{http_code}" http://worker.ctrlchecks.ai/health | grep -q "200"; then
    echo "✅ HTTP works with domain name"
else
    echo "❌ HTTP does NOT work with domain name"
    echo "   → Check DNS and Nginx config"
fi

# 5. Check SSL certificates
echo ""
echo "5. Checking SSL certificates..."
if [ -d "/etc/letsencrypt/live/worker.ctrlchecks.ai" ]; then
    echo "✅ SSL certificates exist"
    echo ""
    echo "6. Testing HTTPS..."
    if curl -k -s -o /dev/null -w "%{http_code}" https://worker.ctrlchecks.ai/health | grep -q "200"; then
        echo "✅ HTTPS works"
    else
        echo "❌ HTTPS does NOT work"
    fi
else
    echo "⚠️  SSL certificates NOT found"
    echo "   → Run: sudo certbot --nginx -d worker.ctrlchecks.ai"
fi

echo ""
echo "=========================================="
```

**Save and run:**
```bash
nano diagnose-domain.sh
# (paste script, save with Ctrl+X, Y, Enter)
chmod +x diagnose-domain.sh
./diagnose-domain.sh
```

---

## Common Issues

### Issue: "Could not resolve host worker.ctrlchecks.ai"

**Cause:** DNS not configured or not propagated

**Fix:**
1. Set up DNS in Route 53 (see Step 4)
2. Wait 10-30 minutes for propagation
3. Test with: `nslookup worker.ctrlchecks.ai`

---

### Issue: HTTP works on IP but not domain

**Cause:** Nginx config doesn't include domain name

**Fix:**
```bash
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
# Make sure server_name includes: worker.ctrlchecks.ai
sudo nginx -t
sudo systemctl reload nginx
```

---

### Issue: HTTPS gives "SSL certificate problem"

**Cause:** SSL not set up yet

**Fix:**
```bash
sudo certbot --nginx -d worker.ctrlchecks.ai
```

---

### Issue: "Connection refused" from outside

**Cause:** Security group blocking ports

**Fix (from Windows PowerShell):**
```powershell
$sgId = aws ec2 describe-instances --filters "Name=tag:Name,Values=ctrlchecks-worker" --query "Reservations[*].Instances[*].SecurityGroups[0].GroupId" --output text

# Add HTTP
aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr "0.0.0.0/0"

# Add HTTPS
aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr "0.0.0.0/0"
```
