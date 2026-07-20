# 🔍 Nginx/SSL Diagnostic Guide

## Quick Diagnosis Commands

Run these commands on your server to diagnose the issue:

```bash
# ============================================
# 1. Check if Nginx is installed and running
# ============================================
echo "=== Checking Nginx Status ==="
sudo systemctl status nginx

# ============================================
# 2. Check if Nginx is listening on ports 80 and 443
# ============================================
echo ""
echo "=== Checking Nginx Ports ==="
sudo netstat -tlnp | grep nginx
# OR use:
sudo ss -tlnp | grep nginx

# ============================================
# 3. Check if Nginx config exists and is enabled
# ============================================
echo ""
echo "=== Checking Nginx Configuration ==="
ls -la /etc/nginx/sites-available/ctrlchecks-worker
ls -la /etc/nginx/sites-enabled/ctrlchecks-worker

# ============================================
# 4. Check Nginx configuration syntax
# ============================================
echo ""
echo "=== Testing Nginx Configuration ==="
sudo nginx -t

# ============================================
# 5. Check if SSL certificates exist
# ============================================
echo ""
echo "=== Checking SSL Certificates ==="
sudo ls -la /etc/letsencrypt/live/worker.ctrlchecks.ai/ 2>/dev/null || echo "❌ SSL certificates not found"

# ============================================
# 6. Check Nginx error logs
# ============================================
echo ""
echo "=== Recent Nginx Errors ==="
sudo tail -n 20 /var/log/nginx/error.log

# ============================================
# 7. Check if ports are open (from server itself)
# ============================================
echo ""
echo "=== Testing Port 80 (HTTP) ==="
curl -I http://localhost:80/health 2>&1 | head -n 5

echo ""
echo "=== Testing Port 443 (HTTPS) ==="
curl -k -I https://localhost:443/health 2>&1 | head -n 5
```

---

## Common Issues and Fixes

### Issue 1: Nginx Not Installed

**Symptoms:** `systemctl status nginx` shows "could not be found"

**Fix:**
```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### Issue 2: Nginx Not Running

**Symptoms:** `systemctl status nginx` shows "inactive"

**Fix:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

---

### Issue 3: Nginx Config Not Created

**Symptoms:** `/etc/nginx/sites-available/ctrlchecks-worker` doesn't exist

**Fix:**
```bash
# Create basic HTTP config first
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Paste this (HTTP only for now):**
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

**Enable and test:**
```bash
sudo ln -s /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site if it conflicts
sudo nginx -t
sudo systemctl restart nginx
```

**Test HTTP:**
```bash
curl http://3.7.115.58/health
```

---

### Issue 4: SSL Certificates Not Found

**Symptoms:** `/etc/letsencrypt/live/worker.ctrlchecks.ai/` doesn't exist

**Fix:**

**Step 1: Make sure DNS is working**
```bash
# From your local machine (Windows PowerShell)
nslookup worker.ctrlchecks.ai
# Should return: 3.7.115.58
```

**Step 2: Make sure HTTP works first**
```bash
# On server
curl http://localhost:80/health
```

**Step 3: Install Certbot and get certificate**
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d worker.ctrlchecks.ai
```

**If certbot fails, try:**
```bash
# Standalone mode (stops Nginx temporarily)
sudo certbot certonly --standalone -d worker.ctrlchecks.ai
```

---

### Issue 5: Security Group Not Allowing Port 443

**Symptoms:** Nginx is running, but can't connect from outside

**Fix (from Windows PowerShell):**
```powershell
# Find security group ID
$sgId = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].SecurityGroups[0].GroupId" `
  --output text

Write-Host "Security Group ID: $sgId"

# Check current rules
aws ec2 describe-security-groups `
  --group-ids $sgId `
  --query "SecurityGroups[0].IpPermissions[?FromPort==`443`]" `
  --output table

# Add HTTPS (port 443) rule
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 443 `
  --cidr "0.0.0.0/0" `
  --description "HTTPS access"

# Also ensure HTTP (port 80) is open
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 80 `
  --cidr "0.0.0.0/0" `
  --description "HTTP access"
```

---

### Issue 6: Nginx Config Has Errors

**Symptoms:** `nginx -t` shows errors

**Fix:**
```bash
# Check what the error is
sudo nginx -t

# Common fixes:
# 1. If SSL cert path is wrong, update config
# 2. If syntax error, fix the config file
# 3. If port conflict, check what's using port 80/443
```

---

## Complete Fix Script (Run This First)

Run this complete diagnostic and fix script:

```bash
#!/bin/bash

echo "=========================================="
echo "Nginx/SSL Diagnostic and Fix Script"
echo "=========================================="
echo ""

# 1. Check Nginx status
echo "1. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is NOT running"
    echo "   Installing and starting Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# 2. Check if config exists
echo ""
echo "2. Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-available/ctrlchecks-worker" ]; then
    echo "✅ Config file exists"
else
    echo "❌ Config file missing - creating basic HTTP config..."
    sudo tee /etc/nginx/sites-available/ctrlchecks-worker > /dev/null <<EOF
server {
    listen 80;
    server_name worker.ctrlchecks.ai 3.7.115.58;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# 3. Test config
echo ""
echo "3. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx config is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx config has errors - check above"
    exit 1
fi

# 4. Check ports
echo ""
echo "4. Checking if Nginx is listening on ports..."
if sudo netstat -tlnp 2>/dev/null | grep -q ":80.*nginx" || sudo ss -tlnp 2>/dev/null | grep -q ":80.*nginx"; then
    echo "✅ Nginx listening on port 80"
else
    echo "❌ Nginx NOT listening on port 80"
fi

if sudo netstat -tlnp 2>/dev/null | grep -q ":443.*nginx" || sudo ss -tlnp 2>/dev/null | grep -q ":443.*nginx"; then
    echo "✅ Nginx listening on port 443"
else
    echo "⚠️  Nginx NOT listening on port 443 (SSL not configured yet)"
fi

# 5. Check SSL certificates
echo ""
echo "5. Checking SSL certificates..."
if [ -d "/etc/letsencrypt/live/worker.ctrlchecks.ai" ]; then
    echo "✅ SSL certificates exist"
    ls -la /etc/letsencrypt/live/worker.ctrlchecks.ai/
else
    echo "⚠️  SSL certificates NOT found"
    echo "   Run: sudo certbot --nginx -d worker.ctrlchecks.ai"
fi

# 6. Test local connections
echo ""
echo "6. Testing local connections..."
echo "   Testing HTTP (port 80):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:80/health || echo "   ❌ Failed"

if [ -d "/etc/letsencrypt/live/worker.ctrlchecks.ai" ]; then
    echo "   Testing HTTPS (port 443):"
    curl -k -s -o /dev/null -w "   Status: %{http_code}\n" https://localhost:443/health || echo "   ❌ Failed"
fi

echo ""
echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If HTTP works but HTTPS doesn't: Run 'sudo certbot --nginx -d worker.ctrlchecks.ai'"
echo "2. If can't connect from outside: Check AWS Security Group (ports 80 and 443)"
echo "3. Test from outside: curl http://3.7.115.58/health"
```

**Save and run:**
```bash
# Save the script
nano diagnose-nginx.sh
# (paste the script above, save with Ctrl+X, Y, Enter)

# Make executable and run
chmod +x diagnose-nginx.sh
./diagnose-nginx.sh
```

---

## Quick Fix: Start with HTTP Only

If you just need it working quickly, set up HTTP first (without SSL):

```bash
# 1. Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# 2. Create HTTP-only config
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Paste this:**
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

**Enable and restart:**
```bash
sudo ln -s /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**Test:**
```bash
curl http://3.7.115.58/health
```

**Then add SSL later:**
```bash
sudo certbot --nginx -d worker.ctrlchecks.ai
```
