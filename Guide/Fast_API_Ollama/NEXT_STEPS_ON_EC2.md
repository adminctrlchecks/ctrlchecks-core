# Next Steps on EC2 - Continue Deployment

**You're on the EC2 instance and have completed:**
- ✅ System updated
- ✅ Python 3.11 installed
- ✅ Ollama installed
- ✅ Repository cloned
- ✅ Virtual environment created
- ✅ Dependencies installed

**Continue with these steps:**

---

## Step 1: Create .env File

```bash
# Make sure you're in /opt/fastapi-ollama
cd /opt/fastapi-ollama

# Copy example file
cp env.example .env

# Edit .env file
nano .env
```

### Configure .env File

Update these values (keep defaults if unsure):

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

# Lightricks LTX-2 Configuration (Optional - keep false for now)
LTX_ENABLED=false
LTX_MODEL_PATH=/opt/ltx-2
LTX_PYTHON_PATH=python3
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Set Permissions

```bash
chmod 600 .env
```

**✅ Checkpoint:** .env file configured

---

## Step 2: Create FastAPI Systemd Service

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

# Enable service (start on boot)
sudo systemctl enable fastapi-ollama

# Start service
sudo systemctl start fastapi-ollama

# Check status
sudo systemctl status fastapi-ollama
```

**✅ Checkpoint:** FastAPI service created and started

---

## Step 3: Verify Ollama is Running

```bash
# Check Ollama service
sudo systemctl status ollama

# Test Ollama
curl http://localhost:11434/api/tags
# Should return JSON (empty list if no models yet)
```

**✅ Checkpoint:** Ollama is running

---

## Step 4: Pull Ollama Models

```bash
# Pull qwen2.5:14b-instruct-q4_K_M (General purpose)
# This will take several minutes depending on internet speed
ollama pull qwen2.5:14b-instruct-q4_K_M

# Wait for completion, then pull qwen2.5-coder:7b-instruct-q4_K_M (Code generation)
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify models
ollama list
# Should show both models
```

**✅ Checkpoint:** Models installed

---

## Step 5: Test Deployment

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

## Step 6: Configure Firewall

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

## Step 7: Final Verification

```bash
# Check both services
sudo systemctl status ollama --no-pager -l
sudo systemctl status fastapi-ollama --no-pager -l

# Both should show: Active (running)

# Check ports
sudo netstat -tlnp | grep -E '11434|8000'
# Should show both ports listening
```

---

## Quick Commands Reference

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

### FastAPI Service Won't Start

```bash
# Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# Common issues:
# 1. Missing .env file - create it: cp env.example .env
# 2. Port already in use - check: sudo lsof -i :8000
# 3. Python dependencies not installed - run: pip install -r requirements.txt
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

## Deployment Complete Checklist

- [ ] .env file created and configured
- [ ] FastAPI systemd service created
- [ ] FastAPI service running
- [ ] Ollama service running
- [ ] Models pulled (qwen2.5:14b-instruct-q4_K_M, qwen2.5-coder:7b-instruct-q4_K_M)
- [ ] Health check passing
- [ ] API endpoints working
- [ ] Firewall configured

---

**Continue with Step 1 above!**
