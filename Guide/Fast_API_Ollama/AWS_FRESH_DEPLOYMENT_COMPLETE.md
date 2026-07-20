# 🚀 Complete AWS Fresh Deployment Guide - FastAPI Ollama

**Domain:** `ollama.ctrlchecks.ai`  
**Port:** `8000` (internal) + `80/443` (via Nginx)  
**Instance:** AWS EC2 g4dn.xlarge  
**Repository:** `https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git`

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Git Setup & Push](#step-1-git-setup--push)
3. [Step 2: Server Cleanup](#step-2-server-cleanup)
4. [Step 3: Fresh Installation](#step-3-fresh-installation)
5. [Step 4: Ollama Setup](#step-4-ollama-setup)
6. [Step 5: FastAPI Service Setup](#step-5-fastapi-service-setup)
7. [Step 6: Nginx Configuration](#step-6-nginx-configuration)
8. [Step 7: SSL Certificate Setup](#step-7-ssl-certificate-setup)
9. [Step 8: Verification & Testing](#step-8-verification--testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- ✅ AWS EC2 g4dn.xlarge instance running
- ✅ Route53 DNS configured: `ollama.ctrlchecks.ai` → EC2 Elastic IP
- ✅ SSH access to EC2 instance
- ✅ GitHub repository created: `ctrlchecks-FAO-001`
- ✅ Security groups configured (ports 22, 80, 443, 8000)

---

## Step 1: Git Setup & Push

### 1.1 Navigate to FastAPI Ollama Directory

```bash
cd "C:\Users\User\Desktop\ctrlchecks-ai-workflow-os1\ctrlchecks-ai-workflow-os-ifelse-left-with-inputjson\ctrlchecks-ai-workflow-os\Fast_API_Ollama"
```

### 1.2 Initialize Git Repository

```bash
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git
```

### 1.3 Add All Files and Push

```bash
# Add all files
git add .

# Commit
git commit -m "Initial FastAPI Ollama service deployment"

# Push to GitHub
git push -u origin main
```

### 1.4 Verify Push

Visit: `https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001` to verify all files are pushed.

---

## Step 2: Server Cleanup

### 2.1 Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@ollama.ctrlchecks.ai
# OR
ssh -i your-key.pem ubuntu@<EC2-IP-ADDRESS>
```

### 2.2 Stop All Running Services

```bash
# Stop FastAPI services
sudo systemctl stop ollama-api 2>/dev/null || true
sudo systemctl stop fastapi-ollama 2>/dev/null || true
sudo systemctl disable ollama-api 2>/dev/null || true
sudo systemctl disable fastapi-ollama 2>/dev/null || true

# Kill processes on port 8000
sudo lsof -ti:8000 | xargs sudo kill -9 2>/dev/null || true
sudo fuser -k 8000/tcp 2>/dev/null || true
sudo pkill -f "uvicorn main:app" 2>/dev/null || true
sudo pkill -f "fastapi" 2>/dev/null || true
```

### 2.3 Remove Old Project Directories

```bash
# Remove all old project directories
sudo rm -rf /opt/ollama-api
sudo rm -rf /opt/Fast_API_Ollama
sudo rm -rf /opt/ltx-2
sudo rm -rf /home/ubuntu/ollama-api
sudo rm -rf /home/ubuntu/Fast_API_Ollama
sudo rm -rf ~/ollama-api
sudo rm -rf ~/Fast_API_Ollama
sudo rm -rf /var/www/ollama-api
sudo rm -rf /var/www/Fast_API_Ollama
```

### 2.4 Clean Up Ollama Models (IMPORTANT - Free Space)

```bash
# Stop Ollama service
sudo systemctl stop ollama 2>/dev/null || true

# List all Ollama models
ollama list

# Remove ALL models (we'll download fresh ones)
ollama list | awk 'NR>1 {print $1}' | xargs -I {} ollama rm {}

# Alternative: Remove specific models if you want to keep some
# ollama rm qwen2.5:14b-instruct-q4_K_M
# ollama rm qwen2.5:7b-instruct-q4_K_M
# ollama rm qwen2.5-coder:7b-instruct-q4_K_M

# Clean Ollama cache
sudo rm -rf ~/.ollama/models/*
sudo rm -rf /usr/share/ollama/models/*

# Verify cleanup
ollama list
df -h  # Check disk space
```

### 2.5 Remove Python Environments and Cache

```bash
# Remove Python virtual environments
sudo find /opt -type d -name "venv" -exec rm -rf {} + 2>/dev/null || true
sudo find /home -type d -name "venv" -exec rm -rf {} + 2>/dev/null || true
sudo find ~ -type d -name "venv" -exec rm -rf {} + 2>/dev/null || true

# Remove Python cache
sudo find /opt -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
sudo find /home -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
sudo find ~ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
sudo find /opt -name "*.pyc" -delete 2>/dev/null || true
sudo find /home -name "*.pyc" -delete 2>/dev/null || true
```

### 2.6 Remove Systemd Service Files

```bash
# Remove old service files
sudo rm -f /etc/systemd/system/ollama-api.service
sudo rm -f /etc/systemd/system/fastapi-ollama.service
sudo systemctl daemon-reload
```

### 2.7 Clean Logs and Temporary Files

```bash
# Remove log files
sudo rm -f /opt/*.log
sudo rm -f /home/ubuntu/*.log
sudo rm -f ~/*.log
sudo rm -f /var/log/ollama-api.log
sudo rm -f /var/log/fastapi-ollama.log

# Remove temporary files
sudo rm -rf /tmp/videos
sudo rm -rf /tmp/ollama*
sudo rm -rf /tmp/fastapi*
sudo rm -rf /tmp/*.mp4
```

### 2.8 Analyze Disk Usage

**First, identify what's using disk space:**

```bash
# Find largest directories in root
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -20

# Check home directory
du -h --max-depth=1 ~ | sort -hr | head -20

# Check for Ollama models (common locations)
du -sh ~/.ollama 2>/dev/null || echo "No ~/.ollama directory"
du -sh /usr/share/ollama 2>/dev/null || echo "No /usr/share/ollama directory"
du -sh /var/lib/ollama 2>/dev/null || echo "No /var/lib/ollama directory"

# Check Docker (if installed)
sudo docker system df 2>/dev/null || echo "Docker not installed or not running"

# Check for large log files
sudo find /var/log -type f -size +100M 2>/dev/null

# Check for large files in common locations
sudo find /opt -type f -size +100M 2>/dev/null
sudo find /home -type f -size +100M 2>/dev/null
```

**Common culprits:**
- Ollama models: `~/.ollama/models/` or `/usr/share/ollama/models/`
- Docker images: `/var/lib/docker/`
- Log files: `/var/log/`
- Old snap packages: `/var/lib/snapd/`

### 2.9 Clean Ollama Models (If Found)

```bash
# Stop Ollama service
sudo systemctl stop ollama 2>/dev/null || true

# List all models
ollama list

# Remove ALL models
ollama list | awk 'NR>1 {print $1}' | xargs -I {} ollama rm {} 2>/dev/null || true

# Clean all Ollama model directories
sudo rm -rf ~/.ollama/models/*
sudo rm -rf /usr/share/ollama/models/*
sudo rm -rf /var/lib/ollama/models/*
sudo rm -rf ~/.ollama/blobs/*

# Verify cleanup
ollama list
du -sh ~/.ollama 2>/dev/null
```

### 2.10 Clean Docker (If Installed)

```bash
# Check Docker disk usage
sudo docker system df

# Remove all unused containers, networks, images
sudo docker system prune -a --volumes -f

# Check space freed
df -h
```

### 2.11 Clean System Packages and Cache

```bash
# Clean apt cache
sudo apt clean
sudo apt autoclean
sudo apt autoremove -y

# Clean snap packages (if installed)
sudo snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do sudo snap remove "$snapname" --revision="$revision"; done

# Clean journal logs (keep last 3 days)
sudo journalctl --vacuum-time=3d

# Clean old kernels (keep current)
sudo apt autoremove --purge -y
```

### 2.12 Verify Cleanup

```bash
# Check disk space
df -h

# Check port 8000 is free
sudo lsof -i:8000 || echo "✓ Port 8000 is free"

# Check for remaining processes
ps aux | grep uvicorn || echo "✓ No uvicorn processes"

# Check largest directories again
sudo du -h --max-depth=1 / 2>/dev/null | sort -hr | head -10
```

---

## Step 3: Fresh Installation

### 3.1 Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 3.2 Install Required System Packages

```bash
sudo apt install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    git \
    curl \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential
```

### 3.3 Clone Fresh Repository

```bash
# Navigate to /opt
cd /opt

# Clone the repository
sudo git clone https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git ollama-api

# Set ownership
sudo chown -R ubuntu:ubuntu /opt/ollama-api

# Navigate to project directory
cd /opt/ollama-api
```

### 3.4 Create Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

---

## Step 4: Ollama Setup

### 4.1 Install Ollama (if not installed)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama

# Verify Ollama is running
ollama list
```

### 4.2 Download Required Models

```bash
# Download primary model (Qwen2.5 14B - ~8GB)
ollama pull qwen2.5:14b-instruct-q4_K_M

# Download fallback model (Qwen2.5 7B - ~4.5GB)
ollama pull qwen2.5:7b-instruct-q4_K_M

# Download coder model (Qwen2.5 Coder 7B - ~4.5GB)
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify models
ollama list
```

**Note:** Model downloads may take 10-30 minutes depending on internet speed. Total size: ~17GB.

### 4.3 Verify Ollama is Accessible

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Should return JSON with model list
```

---

## Step 5: FastAPI Service Setup

### 5.1 Create Environment File

```bash
cd /opt/ollama-api

# Copy example environment file
cp env.example .env

# Edit environment file
nano .env
```

**Required `.env` configuration:**

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (for chatbot proxy)
WORKER_URL=http://localhost:3001

# CORS Configuration
ALLOWED_ORIGINS=*

# Model Configuration
MODEL_PRIMARY=qwen2.5:14b-instruct-q4_K_M
MODEL_FALLBACK=qwen2.5:7b-instruct-q4_K_M
MODEL_CODER=qwen2.5-coder:7b-instruct-q4_K_M
MODEL_TIMEOUT=60
MODEL_MAX_RETRIES=3

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60.0

# Request Limits
MAX_REQUEST_SIZE_MB=10
RATE_LIMIT_PER_MINUTE=100
TIMEOUT_SECONDS=60.0
```

Save and exit (Ctrl+X, Y, Enter).

### 5.2 Test FastAPI Application

```bash
# Activate virtual environment
source venv/bin/activate

# Test run (Ctrl+C to stop)
uvicorn main:app --host 0.0.0.0 --port 8000
```

In another terminal, test:

```bash
curl http://localhost:8000/health
```

If successful, stop the test run (Ctrl+C).

### 5.3 Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/ollama-api.service
```

**Paste this configuration:**

```ini
[Unit]
Description=CtrlChecks FastAPI Ollama Service
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/ollama-api
Environment="PATH=/opt/ollama-api/venv/bin"
EnvironmentFile=/opt/ollama-api/.env
ExecStart=/opt/ollama-api/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter).

### 5.4 Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable ollama-api

# Start service
sudo systemctl start ollama-api

# Check status
sudo systemctl status ollama-api

# View logs
sudo journalctl -u ollama-api -f
```

### 5.5 Verify Service is Running

```bash
# Check if port 8000 is listening
sudo netstat -tlnp | grep 8000
# OR
sudo ss -tlnp | grep 8000

# Test health endpoint
curl http://localhost:8000/health

# Test root endpoint
curl http://localhost:8000/
```

---

## Step 6: Nginx Configuration

### 6.1 Create Nginx Configuration

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/ollama.ctrlchecks.ai
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name ollama.ctrlchecks.ai;

    # Logging
    access_log /var/log/nginx/ollama-access.log;
    error_log /var/log/nginx/ollama-error.log;

    # Redirect HTTP to HTTPS (after SSL setup)
    # Uncomment after SSL certificate is installed:
    # return 301 https://$host$request_uri;

    # Temporary: Proxy to FastAPI (remove after SSL setup)
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
        
        # Increase body size limit
        client_max_body_size 100M;
        
        # Cache and buffering
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }
}
```

Save and exit (Ctrl+X, Y, Enter).

### 6.2 Enable Nginx Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ollama.ctrlchecks.ai /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

---

## Step 7: SSL Certificate Setup

### 7.1 Install SSL Certificate with Certbot

```bash
# Obtain SSL certificate
sudo certbot --nginx -d ollama.ctrlchecks.ai

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 7.2 Update Nginx Configuration for HTTPS

After SSL installation, Certbot will automatically update your nginx config. Verify:

```bash
# Check nginx configuration
sudo nginx -t

# View updated config
sudo cat /etc/nginx/sites-available/ollama.ctrlchecks.ai

# Reload nginx
sudo systemctl reload nginx
```

### 7.3 Auto-Renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up renewal via cron/systemd timer
# Verify:
sudo systemctl status certbot.timer
```

---

## Step 8: Verification & Testing

### 8.1 Local Testing

```bash
# Test localhost:8000
curl http://localhost:8000/health

# Test via domain (HTTP)
curl http://ollama.ctrlchecks.ai/health

# Test via domain (HTTPS - after SSL setup)
curl https://ollama.ctrlchecks.ai/health
```

### 8.2 Test API Endpoints

```bash
# Health check
curl https://ollama.ctrlchecks.ai/health

# List models
curl https://ollama.ctrlchecks.ai/api/models

# Test chat endpoint
curl -X POST https://ollama.ctrlchecks.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello, test message"}]
  }'
```

### 8.3 Monitor Service

```bash
# Check service status
sudo systemctl status ollama-api

# View logs
sudo journalctl -u ollama-api -n 50

# Follow logs
sudo journalctl -u ollama-api -f

# Check nginx logs
sudo tail -f /var/log/nginx/ollama-access.log
sudo tail -f /var/log/nginx/ollama-error.log
```

### 8.4 Check System Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check GPU (if applicable)
nvidia-smi

# Check running processes
ps aux | grep uvicorn
ps aux | grep ollama
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status ollama-api

# View detailed logs
sudo journalctl -u ollama-api -n 100

# Check if port is in use
sudo lsof -i:8000

# Test manual start
cd /opt/ollama-api
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Ollama Connection Issues

```bash
# Check Ollama service
sudo systemctl status ollama

# Test Ollama API
curl http://localhost:11434/api/tags

# Restart Ollama
sudo systemctl restart ollama
```

### Nginx Issues

```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i:8000

# Kill process
sudo kill -9 <PID>

# Or kill all uvicorn processes
sudo pkill -f uvicorn
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check nginx SSL configuration
sudo nginx -t
```

---

## Quick Reference Commands

### Service Management

```bash
# Start service
sudo systemctl start ollama-api

# Stop service
sudo systemctl stop ollama-api

# Restart service
sudo systemctl restart ollama-api

# Check status
sudo systemctl status ollama-api

# View logs
sudo journalctl -u ollama-api -f
```

### Update Code

```bash
cd /opt/ollama-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ollama-api
```

### Check Health

```bash
# Local
curl http://localhost:8000/health

# Via domain
curl https://ollama.ctrlchecks.ai/health
```

---

## ✅ Deployment Checklist

- [ ] Git repository created and code pushed
- [ ] Server cleaned (old files, models removed)
- [ ] Fresh code cloned from GitHub
- [ ] Python virtual environment created
- [ ] Dependencies installed
- [ ] Ollama installed and running
- [ ] Required models downloaded
- [ ] Environment file configured (.env)
- [ ] Systemd service created and enabled
- [ ] FastAPI service running on port 8000
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Domain accessible (ollama.ctrlchecks.ai)
- [ ] Health endpoint responding
- [ ] API endpoints tested

---

## 🎉 Deployment Complete!

Your FastAPI Ollama service is now deployed and accessible at:
- **With Port:** `http://ollama.ctrlchecks.ai:8000`
- **Without Port:** `https://ollama.ctrlchecks.ai` (via Nginx)

**Service URLs:**
- Health: `https://ollama.ctrlchecks.ai/health`
- API Docs: `https://ollama.ctrlchecks.ai/docs`
- Models: `https://ollama.ctrlchecks.ai/api/models`

---

**Last Updated:** 2024  
**Version:** 1.0.0
