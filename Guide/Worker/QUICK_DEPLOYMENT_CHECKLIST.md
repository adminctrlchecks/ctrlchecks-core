# 🚀 Complete Clean Deployment Guide - Worker Backend

**Perfect step-by-step commands to deploy worker backend on `worker.ctrlchecks.ai` (port 3001)**

---

## 📋 Pre-Deployment Checklist

- [ ] AWS Account with EC2 access
- [ ] Elastic IP: `3.7.115.58`
- [ ] Route 53 domain: `worker.ctrlchecks.ai`
- [ ] GitHub repo: `https://github.com/servicepathtotechnologies-ops/worker-002.git`
- [ ] Supabase credentials (URL + Service Role Key)
- [ ] SSH key file: `ctrlchecks-worker.pem`

---

## 🗑️ STEP 1: Complete Server Cleanup

**⚠️ WARNING: This deletes ALL existing worker files and configurations!**

**Connect to server:**
```bash
ssh -i ctrlchecks-worker.pem ubuntu@3.7.115.58
```

**Run these commands ONE BY ONE:**

```bash
# 1. Stop and remove systemd service
sudo systemctl stop ctrlchecks-worker 2>/dev/null || true
sudo systemctl disable ctrlchecks-worker 2>/dev/null || true
sudo rm -f /etc/systemd/system/ctrlchecks-worker.service
sudo systemctl daemon-reload

# 2. Remove all application files
sudo rm -rf /opt/ctrlchecks-worker
sudo rm -rf ~/ctrlchecks-worker

# 3. Remove ALL Nginx configurations
sudo rm -f /etc/nginx/sites-enabled/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-enabled/worker.ctrlchecks.ai
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-available/worker.ctrlchecks.ai

# 4. Remove SSL certificates (optional - for fresh start)
sudo rm -rf /etc/letsencrypt/live/worker.ctrlchecks.ai 2>/dev/null || true
sudo rm -rf /etc/letsencrypt/archive/worker.ctrlchecks.ai 2>/dev/null || true
sudo rm -rf /etc/letsencrypt/renewal/worker.ctrlchecks.ai.conf 2>/dev/null || true

# 5. Verify cleanup
echo "=== Cleanup Verification ==="
[ ! -f "/etc/systemd/system/ctrlchecks-worker.service" ] && echo "✅ Service removed" || echo "⚠️ Service still exists"
[ ! -d "/opt/ctrlchecks-worker" ] && echo "✅ App directory removed" || echo "⚠️ Directory still exists"
[ ! -f "/etc/nginx/sites-enabled/ctrlchecks-worker" ] && echo "✅ Nginx configs removed" || echo "⚠️ Configs still exist"
echo "✅ Cleanup complete!"
```

**✅ Check:** All services stopped, files removed, configs cleared

---

## 📦 STEP 2: Install Node.js

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**✅ Check:** Node.js v20.x.x installed

---

## 🗂️ STEP 3: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/ctrlchecks-worker
sudo chown ubuntu:ubuntu /opt/ctrlchecks-worker
cd /opt/ctrlchecks-worker

# Clone repository
git clone https://github.com/servicepathtotechnologies-ops/worker-002.git .

# Navigate to worker subdirectory (if it exists)
[ -d "worker" ] && cd worker || true

# Install dependencies
npm install

# Build with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Verify build
ls -la dist/index.js
```

**✅ Check:** `dist/index.js` exists

---

## ⚙️ STEP 4: Create Environment File

```bash
# Copy example env file
cp env.example .env

# Edit environment file
nano .env
```

**Paste this (UPDATE with your actual values):**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-key-here
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
PORT=3001
PUBLIC_BASE_URL=https://worker.ctrlchecks.ai
WORKER_ID=worker-aws-1
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
LOG_LEVEL=INFO
PROCESS_TIMEOUT_SECONDS=1800
MAX_RETRIES=3
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**✅ Check:** `.env` file created with your values

---

## 🔧 STEP 5: Create Systemd Service

```bash
# Find current directory
pwd
# Should show: /opt/ctrlchecks-worker or /opt/ctrlchecks-worker/worker

# Create service file
sudo nano /etc/systemd/system/ctrlchecks-worker.service
```

**Paste this (UPDATE paths if you're in /opt/ctrlchecks-worker/worker):**

```ini
[Unit]
Description=CtrlChecks Worker Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ctrlchecks-worker/worker
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/ctrlchecks-worker/worker/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**If you're NOT in worker subdirectory, use:**
- `WorkingDirectory=/opt/ctrlchecks-worker`
- `ExecStart=/usr/bin/node /opt/ctrlchecks-worker/dist/index.js`

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable ctrlchecks-worker
sudo systemctl start ctrlchecks-worker
sudo systemctl status ctrlchecks-worker
```

**✅ Check:** Status shows "active (running)"

**Test locally:**
```bash
curl http://localhost:3001/health
```

---

## 🌐 STEP 6: Configure Route 53 DNS

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
2. Create record → Name: `worker` → Type: `A` → Value: `3.7.115.58` → TTL: `300`

**Wait 10-30 minutes, then verify:**
```bash
# On server, test DNS (use Google DNS to bypass cache)
nslookup worker.ctrlchecks.ai 8.8.8.8
```

**✅ Check:** DNS resolves to `3.7.115.58`

---

## 🔒 STEP 7: Set Up Nginx and SSL

**On your server:**

```bash
# Install Nginx and Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Paste this HTTP config (for getting SSL certificate):**

```nginx
upstream worker_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name worker.ctrlchecks.ai;

    location / {
        proxy_pass http://worker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Enable and test:**
```bash
sudo ln -s /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

**Test HTTP:**
```bash
# Add to hosts file temporarily (if DNS not propagated yet)
echo "3.7.115.58 worker.ctrlchecks.ai" | sudo tee -a /etc/hosts

# Test HTTP
curl http://worker.ctrlchecks.ai/health
```

**Get SSL certificate:**
```bash
# Get SSL certificate (wait 10-30 min after DNS update)
sudo certbot --nginx -d worker.ctrlchecks.ai
```

**When prompted:**
- Enter email address
- Type `A` to agree to terms
- Type `2` to redirect HTTP to HTTPS (recommended)

**After SSL is set up, update Nginx config with production settings:**
```bash
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Replace with complete production config:**

```nginx
upstream worker_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name worker.ctrlchecks.ai;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name worker.ctrlchecks.ai;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/worker.ctrlchecks.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/worker.ctrlchecks.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Request limits (increased for large AI responses)
    client_max_body_size 50M;
    client_body_timeout 1800s;     # 30 minutes
    proxy_read_timeout 1800s;      # 30 minutes (CRITICAL for AI requests)
    proxy_connect_timeout 300s;    # 5 minutes
    proxy_send_timeout 1800s;      # 30 minutes

    # Health check endpoint (fast, no timeout needed)
    location /health {
        access_log off;
        proxy_pass http://worker_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 10s;
    }

    # All API routes (with long timeouts for AI processing)
    location / {
        proxy_pass http://worker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # ⚠️ CRITICAL: Long timeouts for AI workflow generation and chatbot
        proxy_read_timeout 1800s;      # 30 minutes (for long AI requests)
        proxy_connect_timeout 300s;     # 5 minutes
        proxy_send_timeout 1800s;      # 30 minutes

        # Disable buffering for streaming responses
        proxy_buffering off;
        proxy_request_buffering off;

        # Keep connections alive
        proxy_set_header Connection "";
    }
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Test and reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Remove hosts entry (if you added it):**
```bash
sudo sed -i '/worker.ctrlchecks.ai/d' /etc/hosts
```

**Test HTTPS:**
```bash
curl https://worker.ctrlchecks.ai/health
```

**✅ Check:** HTTPS returns JSON response

---

## 🔐 STEP 8: Configure AWS Security Group

**From Windows PowerShell (NOT on server):**

```powershell
# Find security group ID
$sgId = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].SecurityGroups[0].GroupId" `
  --output text

Write-Host "Security Group ID: $sgId"

# Add HTTP (port 80)
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 80 `
  --cidr "0.0.0.0/0" `
  --description "HTTP access" 2>$null

# Add HTTPS (port 443)
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 443 `
  --cidr "0.0.0.0/0" `
  --description "HTTPS access" 2>$null

# Add SSH (port 22) - if not already added
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 22 `
  --cidr "0.0.0.0/0" `
  --description "SSH access" 2>$null

Write-Host "✅ Security group configured!"
```

**✅ Check:** Ports 80, 443, and 22 are open

---

## 🔓 STEP 9: Enable Direct Access on Port 3001

**Enable direct access at `worker.ctrlchecks.ai:3001` (in addition to Nginx proxy):**

**This gives you BOTH access methods:**
- `https://worker.ctrlchecks.ai` → Through Nginx (HTTPS, recommended)
- `http://worker.ctrlchecks.ai:3001` → Direct access (HTTP, for testing/debugging)

**From Windows PowerShell:**

```powershell
# Find security group ID
$sgId = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].SecurityGroups[0].GroupId" `
  --output text

# Add port 3001 to security group
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 3001 `
  --cidr "0.0.0.0/0" `
  --description "Direct backend access on port 3001" 2>$null

Write-Host "✅ Port 3001 exposed! You can now access: http://worker.ctrlchecks.ai:3001"
```

**After this step, you have BOTH access methods:**
- ✅ `https://worker.ctrlchecks.ai` → Through Nginx (port 443) → Backend (port 3001) **HTTPS, Recommended for production**
- ✅ `http://worker.ctrlchecks.ai:3001` → Direct access to backend (port 3001) **HTTP, Useful for testing/debugging**

**Note:** 
- Port 3001 access is HTTP only (no SSL). 
- For HTTPS, use `https://worker.ctrlchecks.ai` (port 443).
- Both methods connect to the same backend on port 3001.

---

## 🎉 STEP 10: Verify Deployment

**Test from your local machine:**

```bash
# Test DNS
nslookup worker.ctrlchecks.ai

# Test HTTPS through Nginx (port 443)
curl https://worker.ctrlchecks.ai/health

# Test HTTP (should redirect to HTTPS)
curl -I http://worker.ctrlchecks.ai/health

# Test direct access on port 3001 (HTTP only)
curl http://worker.ctrlchecks.ai:3001/health
```

**✅ Check:** All tests return successful responses

**Your backend is now live at BOTH:**
- ✅ `https://worker.ctrlchecks.ai` → Through Nginx (port 443) → Backend (port 3001) **HTTPS, Recommended**
- ✅ `http://worker.ctrlchecks.ai:3001` → Direct access to backend (port 3001) **HTTP, For testing**

**Backend runs on:** `localhost:3001` (internally)

---

## 🔄 Update Backend (When You Push New Code)

```bash
# Connect to server
ssh -i ctrlchecks-worker.pem ubuntu@3.7.115.58

# Navigate to application directory
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Build with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Restart service
sudo systemctl restart ctrlchecks-worker

# Verify service is running
sudo systemctl status ctrlchecks-worker

# Check logs if needed
sudo journalctl -u ctrlchecks-worker -n 50
```

---

## 🐛 Quick Troubleshooting

**Backend not running?**
```bash
sudo systemctl status ctrlchecks-worker
sudo journalctl -u ctrlchecks-worker -n 50
```

**Can't connect locally?**
```bash
curl http://localhost:3001/health
```

**Nginx not working?**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -n 50 /var/log/nginx/error.log
```

**DNS not resolving?**
```bash
# Test with Google DNS (bypasses cache)
nslookup worker.ctrlchecks.ai 8.8.8.8
```

**SSL certificate issues?**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## 📝 Summary

**Your deployment:**
- ✅ Backend runs on: `localhost:3001` (internally)
- ✅ Accessible at: `https://worker.ctrlchecks.ai` (through Nginx on port 443) - **HTTPS, Recommended**
- ✅ Accessible at: `http://worker.ctrlchecks.ai:3001` (direct access on port 3001) - **HTTP, For testing**
- ✅ HTTP redirects to HTTPS (on port 443)
- ✅ SSL certificate auto-renewal enabled
- ✅ Systemd service auto-starts on boot

**Access Methods:**
- **Production:** Use `https://worker.ctrlchecks.ai` (secure, through Nginx)
- **Testing/Debug:** Use `http://worker.ctrlchecks.ai:3001` (direct, bypasses Nginx)

**Files location:**
- Application: `/opt/ctrlchecks-worker/worker` (or `/opt/ctrlchecks-worker`)
- Service: `/etc/systemd/system/ctrlchecks-worker.service`
- Nginx config: `/etc/nginx/sites-available/ctrlchecks-worker`
- Environment: `/opt/ctrlchecks-worker/worker/.env` (or `/opt/ctrlchecks-worker/.env`)

---

**🎉 Deployment Complete!**
