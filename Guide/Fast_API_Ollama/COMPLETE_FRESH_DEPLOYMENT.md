# Complete Fresh Deployment Guide - FastAPI Ollama with LTX-2

**Step-by-step guide for deploying FastAPI Ollama service on a fresh AWS EC2 instance from scratch**

This guide covers:
1. ✅ Pushing code to Git
2. ✅ Setting up fresh EC2 instance
3. ✅ Installing Ollama
4. ✅ Deploying FastAPI service
5. ✅ Configuring LTX-2 (optional)

---

## Prerequisites

- AWS account with EC2 access
- EC2 instance running (g4dn.xlarge recommended for GPU)
- SSH access to instance
- Git repository access

---

## Part 1: Verify Git Repository

**Your Repository:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

### Step 1.1: Verify Repository

```bash
# Check repository on GitHub
# Go to: https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA

# Verify these files are present:
# - main.py
# - ltx_client.py
# - requirements.txt
# - env.example
# - README.md
```

**✅ Checkpoint:** Repository verified - ready to deploy

---

## Part 2: Connect to Fresh EC2 Instance

### Step 2.1: Get Instance Details

```bash
# If using AWS CLI
aws ec2 describe-instances \
  --instance-ids i-xxxxxxxxxxxxx \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text

# Or check AWS Console for Public IP
```

### Step 2.2: Connect via SSH

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# If first time, accept host key (type 'yes')
```

**✅ Checkpoint:** Connected to EC2 instance

---

## Part 3: Clean Instance and Prepare

### Step 3.1: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim build-essential software-properties-common
```

### Step 3.2: Clean Old Files (Complete Cleanup)

```bash
# Stop all services first
sudo systemctl stop fastapi-ollama 2>/dev/null || true
sudo systemctl stop ollama 2>/dev/null || true
sudo systemctl disable fastapi-ollama 2>/dev/null || true

# Remove old FastAPI installation
sudo rm -rf /opt/fastapi-ollama

# Remove old Ollama installation
sudo rm -rf /usr/local/bin/ollama
sudo rm -rf ~/.ollama
sudo rm -rf /usr/share/ollama

# Remove systemd service files
sudo rm -f /etc/systemd/system/fastapi-ollama.service
sudo rm -f /etc/systemd/system/ollama.service

# Remove ollama user (if exists)
sudo userdel ollama 2>/dev/null || true

# Clean up Python packages (optional - only if you want fresh Python)
# sudo apt remove --purge python3.11* 2>/dev/null || true

# Clean up package cache
sudo apt autoremove -y
sudo apt autoclean

# Reload systemd
sudo systemctl daemon-reload

echo "✅ Cleanup complete - instance is now fresh"
```

**✅ Checkpoint:** System updated and cleaned

---

## Part 4: Install Python 3.11

### Step 4.1: Add Python Repository

```bash
# Add deadsnakes PPA for Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y

# Update package list
sudo apt update
```

### Step 4.2: Install Python 3.11

```bash
# Install Python 3.11 and dependencies
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Verify installation
python3.11 --version
# Should show: Python 3.11.x

# Set Python 3.11 as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

**✅ Checkpoint:** Python 3.11 installed

---

## Part 5: Install Ollama

### Step 5.1: Download and Install Ollama

```bash
# Install Ollama using official script
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
# Should show: ollama version x.x.x
```

### Step 5.2: Create Ollama Systemd Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/ollama.service > /dev/null << 'EOF'
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=default.target
EOF

# Create ollama user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Set permissions
sudo chown -R ollama:ollama /usr/share/ollama

# Reload systemd
sudo systemctl daemon-reload

# Enable Ollama service
sudo systemctl enable ollama

# Start Ollama service
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

### Step 5.3: Verify Ollama is Running

```bash
# Wait a few seconds for Ollama to start
sleep 5

# Check if Ollama is responding
curl http://localhost:11434/api/tags

# Should return JSON with models (empty list if no models yet)
```

**✅ Checkpoint:** Ollama installed and running

---

## Part 6: Clone and Deploy FastAPI Application

### Step 6.1: Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/fastapi-ollama

# Set ownership
sudo chown ubuntu:ubuntu /opt/fastapi-ollama

# Navigate to directory
cd /opt/fastapi-ollama
```

### Step 6.2: Clone Repository

```bash
# Clone FastAPI repository
git clone https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git .

# Verify files
ls -la
# Should see: main.py, requirements.txt, ltx_client.py, etc.
```

**Repository URL:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

### Step 6.3: Create Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Verify Python version in venv
python --version
# Should show: Python 3.11.x

# Upgrade pip
pip install --upgrade pip
```

### Step 6.4: Install Python Dependencies

```bash
# Make sure you're in /opt/fastapi-ollama and venv is activated
cd /opt/fastapi-ollama
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
# Should see: fastapi, uvicorn, httpx, pydantic, etc.
```

**✅ Checkpoint:** FastAPI application cloned and dependencies installed

---

## Part 7: Configure Environment Variables

### Step 7.1: Create .env File

```bash
# Create .env file from example
cd /opt/fastapi-ollama

# Copy example file
cp env.example .env

# Edit .env file
nano .env
```

### Step 7.2: Configure .env File

Add/update these values:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (if using worker service)
WORKER_URL=http://localhost:3001

# CORS Configuration
# For production, use specific domains (not *)
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai
# For testing, you can use: ALLOWED_ORIGINS=*

TIMEOUT_SECONDS=180.0

# Lightricks LTX-2 Configuration (Optional)
# Set to true only after LTX-2 is set up
LTX_ENABLED=false
LTX_MODEL_PATH=/opt/ltx-2
LTX_PYTHON_PATH=python3
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 7.3: Set File Permissions

```bash
# Secure .env file
chmod 600 .env

# Verify
ls -la .env
# Should show: -rw------- (only owner can read/write)
```

**✅ Checkpoint:** Environment variables configured

---

## Part 8: Create Systemd Service for FastAPI

### Step 8.1: Create Service File

```bash
# Create systemd service file
sudo tee /etc/systemd/system/fastapi-ollama.service > /dev/null << 'EOF'
[Unit]
Description=CtrlChecks FastAPI Ollama Service
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/fastapi-ollama
Environment="PATH=/opt/fastapi-ollama/venv/bin:/usr/bin:/usr/local/bin"
EnvironmentFile=/opt/fastapi-ollama/.env
ExecStart=/opt/fastapi-ollama/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### Step 8.2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable fastapi-ollama

# Start service
sudo systemctl start fastapi-ollama

# Check status
sudo systemctl status fastapi-ollama
```

### Step 8.3: Verify Service is Running

```bash
# Wait a few seconds
sleep 5

# Check if service is active
sudo systemctl is-active fastapi-ollama
# Should return: active

# Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager
```

**✅ Checkpoint:** FastAPI service running

---

## Part 9: Pull Ollama Models

### Step 9.1: Pull Production Models

```bash
# Pull qwen2.5:14b-instruct-q4_K_M (General purpose)
ollama pull qwen2.5:14b-instruct-q4_K_M

# This will take several minutes depending on internet speed
# Wait for: "pulling manifest", "downloading", "verifying", "success"

# Pull qwen2.5-coder:7b-instruct-q4_K_M (Code generation)
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Wait for completion
```

### Step 9.2: Verify Models

```bash
# List installed models
ollama list

# Should show:
# qwen2.5:14b-instruct-q4_K_M
# qwen2.5-coder:7b-instruct-q4_K_M

# Test model
ollama run qwen2.5:14b-instruct-q4_K_M "Hello, how are you?"
# Type 'exit' or Ctrl+D to exit
```

**✅ Checkpoint:** Ollama models installed

---

## Part 10: Test Deployment

### Step 10.1: Test Health Endpoint

```bash
# Test health check
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "ollama": "running",
#   "ltx2": "unavailable",  // or "available" if LTX-2 is configured
#   "timestamp": 1234567890.123
# }
```

### Step 10.2: Test Service Info

```bash
# Get service information
curl http://localhost:8000/

# Should return service info and endpoint list
```

### Step 10.3: Test Ollama Models Endpoint

```bash
# List available models
curl http://localhost:8000/api/tags

# Should return JSON with qwen2.5:14b-instruct-q4_K_M and qwen2.5-coder:7b-instruct-q4_K_M
```

### Step 10.4: Test Chat Endpoint

```bash
# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [
      {"role": "user", "content": "Hello! Say hi back."}
    ],
    "stream": false
  }'

# Should return JSON with AI response
```

### Step 10.5: Test LTX-2 Info (Optional)

```bash
# Test LTX-2 info endpoint
curl http://localhost:8000/api/video/info

# Should return:
# {
#   "success": true,
#   "model": "Lightricks LTX-2",
#   "enabled": false,
#   "available": false,
#   ...
# }
```

**✅ Checkpoint:** All endpoints working

---

## Part 11: Configure Firewall

### Step 11.1: Allow Port 8000

```bash
# Check if ufw is active
sudo ufw status

# Allow port 8000 (FastAPI)
sudo ufw allow 8000/tcp

# Allow port 22 (SSH - should already be allowed)
sudo ufw allow 22/tcp

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status
```

### Step 11.2: Test from External IP

```bash
# Get your public IP
curl ifconfig.me

# Test from another machine (replace with your EC2 IP)
curl http://YOUR_EC2_IP:8000/health

# Should return health status
```

**✅ Checkpoint:** Firewall configured

---

## Part 12: Verify Complete Deployment

### Step 12.1: Service Status Check

```bash
# Check Ollama service
sudo systemctl status ollama --no-pager -l

# Check FastAPI service
sudo systemctl status fastapi-ollama --no-pager -l

# Both should show: Active (running)
```

### Step 12.2: Port Check

```bash
# Check if ports are listening
sudo netstat -tlnp | grep -E '11434|8000'

# Should show:
# tcp  0.0.0.0:11434  (Ollama)
# tcp  0.0.0.0:8000  (FastAPI)
```

### Step 12.3: Final Test Suite

```bash
# Run complete test suite
echo "=== Testing Health ==="
curl -s http://localhost:8000/health | jq .

echo ""
echo "=== Testing Models ==="
curl -s http://localhost:8000/api/tags | jq '.models[].name'

echo ""
echo "=== Testing Chat ==="
curl -s -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:14b-instruct-q4_K_M", "messages": [{"role": "user", "content": "Say hello"}], "stream": false}' | jq '.message.content'

echo ""
echo "=== Testing Video Info ==="
curl -s http://localhost:8000/api/video/info | jq .
```

**✅ Checkpoint:** Complete deployment verified

---

## Part 13: Optional - Set Up LTX-2

### Step 13.1: Download LTX-2 Model

```bash
# Create directory
sudo mkdir -p /opt/ltx-2
sudo chown ubuntu:ubuntu /opt/ltx-2
cd /opt/ltx-2

# Clone LTX-2 repository
git clone https://github.com/Lightricks/LTX-2.git .

# Or download from Hugging Face
# pip install huggingface-hub
# huggingface-cli download Lightricks/LTX-2 --local-dir /opt/ltx-2
```

### Step 13.2: Install LTX-2 Dependencies

```bash
# Install PyTorch and dependencies
# (Adjust based on your CUDA version)
pip install torch torchvision transformers accelerate

# Install LTX-2 specific dependencies
cd /opt/ltx-2
pip install -r requirements.txt
```

### Step 13.3: Create Generation Script

```bash
# Create generate_video.py script
# See Fast_API_Ollama/LTX2_SETUP.md for full script
nano /opt/ltx-2/generate_video.py

# Make executable
chmod +x /opt/ltx-2/generate_video.py
```

### Step 13.4: Enable LTX-2

```bash
# Edit .env file
nano /opt/fastapi-ollama/.env

# Change:
LTX_ENABLED=true

# Save and restart service
sudo systemctl restart fastapi-ollama

# Verify
curl http://localhost:8000/api/video/info
# Should show: "available": true
```

**✅ Checkpoint:** LTX-2 configured (optional)

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# Common issues:
# 1. Missing .env file
# 2. Port already in use
# 3. Python dependencies not installed
# 4. Wrong Python version
```

### Ollama Not Responding

```bash
# Check Ollama service
sudo systemctl status ollama

# Check logs
sudo journalctl -u ollama -n 50 --no-pager

# Restart Ollama
sudo systemctl restart ollama
```

### Import Errors

```bash
# Verify virtual environment
which python
# Should show: /opt/fastapi-ollama/venv/bin/python

# Reinstall dependencies
cd /opt/fastapi-ollama
source venv/bin/activate
pip install -r requirements.txt
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill process (if needed)
sudo kill -9 <PID>

# Or change port in .env
```

---

## Quick Reference Commands

### Service Management

```bash
# Start services
sudo systemctl start ollama
sudo systemctl start fastapi-ollama

# Stop services
sudo systemctl stop ollama
sudo systemctl stop fastapi-ollama

# Restart services
sudo systemctl restart ollama
sudo systemctl restart fastapi-ollama

# Check status
sudo systemctl status ollama
sudo systemctl status fastapi-ollama

# View logs
sudo journalctl -u ollama -f
sudo journalctl -u fastapi-ollama -f
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:8000/health

# List models
curl http://localhost:8000/api/tags

# Chat
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:14b-instruct-q4_K_M", "messages": [{"role": "user", "content": "Hello"}], "stream": false}'

# Video info
curl http://localhost:8000/api/video/info
```

### Updating Code

```bash
# Pull latest code
cd /opt/fastapi-ollama
git pull origin main

# Restart service
sudo systemctl restart fastapi-ollama
```

---

## Deployment Checklist

- [ ] Code pushed to Git
- [ ] Connected to EC2 instance
- [ ] System updated
- [ ] Python 3.11 installed
- [ ] Ollama installed and running
- [ ] Repository cloned
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] Systemd service created
- [ ] FastAPI service running
- [ ] Ollama models pulled
- [ ] Health endpoint working
- [ ] Firewall configured
- [ ] All tests passing
- [ ] LTX-2 configured (optional)

---

## Next Steps

1. **Set up reverse proxy (nginx)** for HTTPS
2. **Configure domain** (if using Route 53)
3. **Set up monitoring** and alerts
4. **Configure backups**
5. **Set up log rotation**

---

## Support

- **Deployment Issues**: Check logs with `sudo journalctl -u fastapi-ollama -n 50`
- **Ollama Issues**: Check `sudo journalctl -u ollama -n 50`
- **Documentation**: See `Fast_API_Ollama/README.md` and `LTX2_SETUP.md`

---

**Last Updated**: After LTX-2 integration
**Version**: 1.0.0 with LTX-2 support
