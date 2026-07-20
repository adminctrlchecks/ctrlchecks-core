# ⚡ Quick Commands Reference - AWS Deployment

Quick reference for all commands needed to deploy FastAPI Ollama to AWS.

---

## 📤 Step 1: Git Push (Local Machine)

```bash
# Navigate to FastAPI Ollama directory
cd "C:\Users\User\Desktop\ctrlchecks-ai-workflow-os1\ctrlchecks-ai-workflow-os-ifelse-left-with-inputjson\ctrlchecks-ai-workflow-os\Fast_API_Ollama"

# Initialize Git
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git

# Add all files and push
git add .
git commit -m "Initial FastAPI Ollama service deployment"
git push -u origin main
```

---

## 🧹 Step 2: Server Cleanup (AWS EC2)

### Connect to Server
```bash
ssh -i your-key.pem ubuntu@ollama.ctrlchecks.ai
```

### Clean All Old Files
```bash
# Stop services
sudo systemctl stop ollama-api 2>/dev/null || true
sudo systemctl stop fastapi-ollama 2>/dev/null || true
sudo systemctl disable ollama-api 2>/dev/null || true

# Kill port 8000
sudo lsof -ti:8000 | xargs sudo kill -9 2>/dev/null || true
sudo fuser -k 8000/tcp 2>/dev/null || true

# Remove old directories
sudo rm -rf /opt/ollama-api
sudo rm -rf /opt/Fast_API_Ollama
sudo rm -rf /home/ubuntu/ollama-api
sudo rm -rf /home/ubuntu/Fast_API_Ollama

# Remove old service files
sudo rm -f /etc/systemd/system/ollama-api.service
sudo systemctl daemon-reload
```

### Clean Ollama Models (Free Space)
```bash
# Stop Ollama
sudo systemctl stop ollama

# List models
ollama list

# Remove ALL models
ollama list | awk 'NR>1 {print $1}' | xargs -I {} ollama rm {}

# Clean cache
sudo rm -rf ~/.ollama/models/*
sudo rm -rf /usr/share/ollama/models/*

# Check disk space
df -h
```

---

## 🚀 Step 3: Fresh Installation (AWS EC2)

### Install System Packages
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip git curl nginx certbot python3-certbot-nginx build-essential
```

### Clone Repository
```bash
cd /opt
sudo git clone https://github.com/servicepathtotechnologies-ops/ctrlchecks-FAO-001.git ollama-api
sudo chown -R ubuntu:ubuntu /opt/ollama-api
cd /opt/ollama-api
```

### Setup Python Environment
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Install Ollama (if needed)
```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl start ollama
sudo systemctl enable ollama
```

### Download Models
```bash
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
```

---

## ⚙️ Step 4: Configuration (AWS EC2)

### Create Environment File
```bash
cd /opt/ollama-api
cp env.example .env
nano .env
```

**Required .env content:**
```env
OLLAMA_URL=http://localhost:11434
PORT=8000
WORKER_URL=http://localhost:3001
ALLOWED_ORIGINS=*
MODEL_PRIMARY=qwen2.5:14b-instruct-q4_K_M
MODEL_FALLBACK=qwen2.5:7b-instruct-q4_K_M
MODEL_CODER=qwen2.5-coder:7b-instruct-q4_K_M
MODEL_TIMEOUT=60
MODEL_MAX_RETRIES=3
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60.0
MAX_REQUEST_SIZE_MB=10
RATE_LIMIT_PER_MINUTE=100
TIMEOUT_SECONDS=60.0
```

---

## 🔧 Step 5: Systemd Service (AWS EC2)

### Create Service File
```bash
sudo nano /etc/systemd/system/ollama-api.service
```

**Paste this:**
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

[Install]
WantedBy=multi-user.target
```

### Enable and Start
```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama-api
sudo systemctl start ollama-api
sudo systemctl status ollama-api
```

---

## 🌐 Step 6: Nginx Configuration (AWS EC2)

### Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/ollama.ctrlchecks.ai
```

**Paste this (HTTP - before SSL):**
```nginx
server {
    listen 80;
    server_name ollama.ctrlchecks.ai;

    access_log /var/log/nginx/ollama-access.log;
    error_log /var/log/nginx/ollama-error.log;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/ollama.ctrlchecks.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 7: SSL Certificate (AWS EC2)

```bash
sudo certbot --nginx -d ollama.ctrlchecks.ai
```

Follow prompts:
- Enter email
- Agree to terms
- Redirect HTTP to HTTPS: **Yes**

---

## ✅ Step 8: Verification (AWS EC2)

### Test Endpoints
```bash
# Local
curl http://localhost:8000/health

# Via domain (HTTP)
curl http://ollama.ctrlchecks.ai/health

# Via domain (HTTPS - after SSL)
curl https://ollama.ctrlchecks.ai/health
```

### Check Services
```bash
# Service status
sudo systemctl status ollama-api

# View logs
sudo journalctl -u ollama-api -f

# Check port
sudo netstat -tlnp | grep 8000

# Check nginx
sudo systemctl status nginx
```

---

## 🔄 Common Operations

### Restart Service
```bash
sudo systemctl restart ollama-api
```

### Update Code
```bash
cd /opt/ollama-api
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ollama-api
```

### View Logs
```bash
# Service logs
sudo journalctl -u ollama-api -f

# Nginx logs
sudo tail -f /var/log/nginx/ollama-access.log
sudo tail -f /var/log/nginx/ollama-error.log
```

### Check Disk Space
```bash
df -h
```

### Check GPU (if applicable)
```bash
nvidia-smi
```

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
sudo journalctl -u ollama-api -n 100
```

### Port in Use
```bash
sudo lsof -i:8000
sudo kill -9 <PID>
```

### Ollama Issues
```bash
sudo systemctl status ollama
curl http://localhost:11434/api/tags
```

### Nginx Issues
```bash
sudo nginx -t
sudo systemctl status nginx
```

---

## 📋 Quick Checklist

- [ ] Git repository created and pushed
- [ ] Server cleaned (old files removed)
- [ ] Ollama models cleaned (space freed)
- [ ] Fresh code cloned
- [ ] Python environment setup
- [ ] Dependencies installed
- [ ] Ollama installed
- [ ] Models downloaded
- [ ] .env file configured
- [ ] Systemd service created
- [ ] Service running on port 8000
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Domain accessible
- [ ] Health endpoint working

---

**For detailed instructions, see:** [AWS_FRESH_DEPLOYMENT_COMPLETE.md](./AWS_FRESH_DEPLOYMENT_COMPLETE.md)
