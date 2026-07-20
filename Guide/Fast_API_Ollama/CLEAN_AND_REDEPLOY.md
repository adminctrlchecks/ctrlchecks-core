# Clean EC2 Instance and Fresh Deployment

**Complete guide to clean your EC2 instance and deploy FastAPI Ollama from scratch**

**Your Repository:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

---

## Step 1: Connect to EC2 Instance

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Replace YOUR_EC2_IP with your actual EC2 instance IP address
```

**✅ Checkpoint:** Connected to EC2 instance

---

## Step 2: Stop and Remove All Services

```bash
# Stop all services
sudo systemctl stop fastapi-ollama 2>/dev/null || true
sudo systemctl stop ollama 2>/dev/null || true

# Disable services
sudo systemctl disable fastapi-ollama 2>/dev/null || true
sudo systemctl disable ollama 2>/dev/null || true

# Remove systemd service files
sudo rm -f /etc/systemd/system/fastapi-ollama.service
sudo rm -f /etc/systemd/system/ollama.service

# Reload systemd
sudo systemctl daemon-reload
```

**✅ Checkpoint:** All services stopped and removed

---

## Step 3: Remove Old Installations

```bash
# Remove FastAPI application directory
sudo rm -rf /opt/fastapi-ollama

# Remove Ollama installation
sudo rm -rf /usr/local/bin/ollama
sudo rm -rf ~/.ollama
sudo rm -rf /usr/share/ollama

# Remove ollama user (if exists)
sudo userdel ollama 2>/dev/null || true

# Clean up
sudo apt autoremove -y
sudo apt autoclean
```

**✅ Checkpoint:** Old installations removed

---

## Step 4: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim build-essential software-properties-common
```

**✅ Checkpoint:** System updated

---

## Step 5: Install Python 3.11

```bash
# Add Python 3.11 repository
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Verify installation
python3.11 --version
# Should show: Python 3.11.x
```

**✅ Checkpoint:** Python 3.11 installed

---

## Step 6: Install Ollama

```bash
# Install Ollama using official script
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
# Should show: ollama version x.x.x
```

### Step 6.1: Create Ollama Systemd Service

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

# Enable and start Ollama
sudo systemctl enable ollama
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

### Step 6.2: Verify Ollama is Running

```bash
# Wait a few seconds
sleep 5

# Test Ollama
curl http://localhost:11434/api/tags
# Should return JSON (empty list if no models yet)
```

**✅ Checkpoint:** Ollama installed and running

---

## Step 7: Clone FastAPI Repository

```bash
# Create application directory
sudo mkdir -p /opt/fastapi-ollama
sudo chown ubuntu:ubuntu /opt/fastapi-ollama
cd /opt/fastapi-ollama

# Clone your repository
git clone https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git .

# Verify files
ls -la
# Should see: main.py, requirements.txt, ltx_client.py, etc.
```

**✅ Checkpoint:** Repository cloned

---

## Step 8: Set Up Python Virtual Environment

```bash
# Make sure you're in /opt/fastapi-ollama
cd /opt/fastapi-ollama

# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Verify Python version
python --version
# Should show: Python 3.11.x

# Upgrade pip
pip install --upgrade pip
```

**✅ Checkpoint:** Virtual environment created

---

## Step 9: Install Python Dependencies

```bash
# Make sure venv is activated (you should see (venv) in prompt)
cd /opt/fastapi-ollama
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep -E "fastapi|uvicorn|httpx"
# Should show installed packages
```

**✅ Checkpoint:** Dependencies installed

---

## Step 10: Configure Environment Variables

```bash
# Create .env file
cd /opt/fastapi-ollama

# Copy from example
cp env.example .env

# Edit .env file
nano .env
```

### Configure .env File

Update these values:

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL
WORKER_URL=http://localhost:3001

# CORS Configuration
# For production, use specific domains:
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai
# For testing, you can use: ALLOWED_ORIGINS=*

TIMEOUT_SECONDS=180.0

# Lightricks LTX-2 Configuration (Optional - set to true when ready)
LTX_ENABLED=false
LTX_MODEL_PATH=/opt/ltx-2
LTX_PYTHON_PATH=python3
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

### Set Permissions

```bash
# Secure .env file
chmod 600 .env
```

**✅ Checkpoint:** Environment configured

---

## Step 11: Create FastAPI Systemd Service

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

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable fastapi-ollama

# Start service
sudo systemctl start fastapi-ollama

# Check status
sudo systemctl status fastapi-ollama
```

**✅ Checkpoint:** FastAPI service created and started

---

## Step 12: Pull Ollama Models

```bash
# Pull qwen2.5:14b-instruct-q4_K_M (General purpose)
# This will take several minutes
ollama pull qwen2.5:14b-instruct-q4_K_M

# Wait for completion, then pull qwen2.5-coder:7b-instruct-q4_K_M (Code generation)
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify models
ollama list
# Should show both models
```

**✅ Checkpoint:** Models installed

---

## Step 13: Configure Firewall

```bash
# Allow port 8000 (FastAPI)
sudo ufw allow 8000/tcp

# Allow port 22 (SSH - should already be allowed)
sudo ufw allow 22/tcp

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status
```

**✅ Checkpoint:** Firewall configured

---

## Step 14: Test Deployment

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "ollama": "running",
  "ltx2": "unavailable",
  "timestamp": 1234567890.123
}
```

### Test 2: Service Info

```bash
curl http://localhost:8000/
```

### Test 3: List Models

```bash
curl http://localhost:8000/api/tags
```

Should return JSON with qwen2.5:14b-instruct-q4_K_M and qwen2.5-coder:7b-instruct-q4_K_M

### Test 4: Chat Endpoint

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [
      {"role": "user", "content": "Hello! Say hi back."}
    ],
    "stream": false
  }'
```

### Test 5: Video Info (LTX-2)

```bash
curl http://localhost:8000/api/video/info
```

**✅ Checkpoint:** All tests passing

---

## Step 15: Verify Services

```bash
# Check Ollama service
sudo systemctl status ollama --no-pager -l

# Check FastAPI service
sudo systemctl status fastapi-ollama --no-pager -l

# Both should show: Active (running)
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

# View logs
sudo journalctl -u ollama -f
sudo journalctl -u fastapi-ollama -f
```

### Update Code

```bash
cd /opt/fastapi-ollama
git pull origin main
sudo systemctl restart fastapi-ollama
```

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
```

### Ollama Not Responding

```bash
# Check service
sudo systemctl status ollama

# Restart
sudo systemctl restart ollama

# Test
curl http://localhost:11434/api/tags
```

### Import Errors

```bash
# Activate venv
cd /opt/fastapi-ollama
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

---

## Deployment Checklist

- [ ] Connected to EC2 instance
- [ ] Stopped and removed old services
- [ ] Removed old installations
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
- [ ] Firewall configured
- [ ] All tests passing

---

## Next Steps

1. **Test from external IP** (if firewall allows)
2. **Set up domain** (if using Route 53)
3. **Configure HTTPS** (nginx reverse proxy)
4. **Set up monitoring**
5. **Enable LTX-2** (when ready - see LTX2_SETUP.md)

---

**Repository:** `https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git`

**Ready to deploy?** Follow the steps above in order!
