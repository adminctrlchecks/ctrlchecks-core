# Application Deployment Guide

This guide will walk you through deploying your FastAPI Ollama service on the EC2 instance you've set up.

## Production Models (AWS g4dn.xlarge)

This deployment uses 2 optimized models for production:

1. **qwen2.5:14b-instruct-q4_K_M** (~8GB)
   - General purpose AI tasks
   - Excellent reasoning and multilingual support
   - Best for: Chat, text generation, workflow generation, general AI operations

2. **qwen2.5-coder:7b-instruct-q4_K_M** (~4.5GB)
   - Code generation and analysis
   - Programming assistance and debugging
   - Best for: Code generation, analysis, debugging tasks

**Total Size:** ~12.5GB (fits in 16GB GPU with room for inference)

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Connecting to Your Instance](#connecting-to-your-instance)
3. [Installing Dependencies](#installing-dependencies)
4. [Installing Ollama](#installing-ollama)
5. [Deploying FastAPI Application](#deploying-fastapi-application)
6. [Configuring Environment Variables](#configuring-environment-variables)
7. [Setting Up Systemd Services](#setting-up-systemd-services)
8. [Testing the Deployment](#testing-the-deployment)
9. [Pulling Ollama Models](#pulling-ollama-models)
10. [Verifying Everything Works](#verifying-everything-works)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ EC2 instance running (g4dn.xlarge or similar)
- ✅ Elastic IP assigned
- ✅ Security groups configured
- ✅ SSH access to instance
- ✅ GitHub repository: https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git

---

## Connecting to Your Instance

### Step 1: Get Instance Details

```bash
# Get instance public IP (Elastic IP)
INSTANCE_ID="i-xxxxxxxxxxxxx"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

### Step 2: Connect via SSH

**Windows (PowerShell):**

```powershell
# Navigate to key location
cd C:\Users\User\.ssh

# Connect
ssh -i ctrlchecks-ollama-key.pem ubuntu@$PUBLIC_IP
```

**Mac/Linux:**

```bash
# Set permissions
chmod 400 ctrlchecks-ollama-key.pem

# Connect
ssh -i ctrlchecks-ollama-key.pem ubuntu@$PUBLIC_IP
```

**Replace `$PUBLIC_IP` with your actual Elastic IP address.**

---

## Installing Dependencies

### Step 1: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y
```

### Step 2: Install Basic Tools

```bash
# Install essential tools
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    build-essential \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release
```

### Step 3: Install Python 3.11

```bash
# Add deadsnakes PPA for Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Verify installation
python3.11 --version
# Should show: Python 3.11.x
```

### Step 4: Install NVIDIA Drivers (For GPU Instances)

**⚠️ Only needed for GPU instances (g4dn.xlarge, etc.)**

```bash
# Check if GPU is present
lspci | grep -i nvidia

# If GPU detected, install drivers
# Add NVIDIA package repositories
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
echo "Detected distribution: $distribution"

# Check if GPG key already exists, remove it if it does
# This prevents the "File exists. Overwrite? (y/N)" prompt
if [ -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg ]; then
    echo "NVIDIA GPG key already exists. Removing old key..."
    sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
fi

# Remove any corrupted repository list file
if [ -f /etc/apt/sources.list.d/nvidia-container-toolkit.list ]; then
    echo "Removing existing repository list file..."
    sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
fi

# Add NVIDIA GPG key (will create new file)
echo "Adding NVIDIA GPG key..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Add NVIDIA repository with error checking
echo "Adding NVIDIA repository..."
REPO_URL="https://nvidia.github.io/libnvidia-container/${distribution}/libnvidia-container.list"
echo "Repository URL: $REPO_URL"

# Download and verify the repository list is valid (not HTML)
REPO_CONTENT=$(curl -s -L "$REPO_URL")
if echo "$REPO_CONTENT" | grep -q "<!doctype\|<html"; then
    echo "⚠️  Error: Repository URL returned HTML instead of repository config"
    echo "Trying alternative method..."
    # Use Ubuntu 22.04 repository as fallback
    REPO_CONTENT="deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/ubuntu22.04/$(ARCH) /"
    echo "$REPO_CONTENT" | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
else
    # Repository content is valid, process it
    echo "$REPO_CONTENT" | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
fi

# Verify the repository file is valid
if grep -q "<!doctype\|<html" /etc/apt/sources.list.d/nvidia-container-toolkit.list 2>/dev/null; then
    echo "❌ Error: Repository file contains HTML. Removing and using alternative method..."
    sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
    # Use direct repository entry for Ubuntu 22.04
    ARCH=$(dpkg --print-architecture)
    echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/ubuntu22.04/${ARCH} /" | \
        sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
fi

# Update package list
echo "Updating package list..."
sudo apt update

# Install NVIDIA drivers and container toolkit
# Check if already installed to avoid unnecessary installation
if ! dpkg -l | grep -q nvidia-driver-535; then
    echo "Installing NVIDIA drivers..."
    sudo apt install -y nvidia-driver-535 nvidia-container-toolkit
    echo "NVIDIA drivers installed. Reboot required."
    echo "After reboot, verify with: nvidia-smi"
    # Note: Reboot is required, but we'll let user do it manually
    echo "⚠️  IMPORTANT: Reboot the instance to load NVIDIA drivers:"
    echo "   sudo reboot"
    echo "   After reboot, reconnect and verify: nvidia-smi"
else
    echo "NVIDIA drivers already installed. Skipping..."
    # Verify drivers are loaded
    if nvidia-smi &> /dev/null; then
        echo "✅ NVIDIA drivers are loaded and working!"
        nvidia-smi
    else
        echo "⚠️  NVIDIA drivers installed but not loaded. Reboot required:"
        echo "   sudo reboot"
    fi
fi

# If you see "File exists. Overwrite? (y/N)" prompt:
# - Type 'y' and press Enter to overwrite
# - Or use the updated script above which handles this automatically
```

**After reboot, verify GPU:**
```bash
nvidia-smi
# Should show GPU information
```

---

## Installing Ollama

### Step 1: Install Ollama

```bash
# Install Ollama
  curl -fsSL https://ollama.com/install.sh | sh

  # Verify installation
  ollama --version
```

### Step 2: Start Ollama Service

```bash
# Start Ollama
ollama serve

# In a new terminal, test Ollama
curl http://localhost:11434/api/tags
```

### Step 3: Create Systemd Service for Ollama

```bash
# Create systemd service file
sudo tee /etc/systemd/system/ollama.service > /dev/null << 'EOF'
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable Ollama service
sudo systemctl enable ollama

# Start Ollama service
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

---

## Deploying FastAPI Application

### Step 1: Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/fastapi-ollama
sudo chown ubuntu:ubuntu /opt/fastapi-ollama
cd /opt/fastapi-ollama
```

### Step 2: Clone Repository

**Repository URL:** `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`

**Option 1: Clone Directly (Recommended for Public Repo)**

```bash
# Clone the FastAPI Ollama repository
git clone https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git .

# Verify files are present
ls -la
# Should see: main.py, requirements.txt, env.example, etc.
```

**Option 2: If Repository is Private (Use SSH)**

```bash
# Generate SSH key (if needed)
ssh-keygen -t ed25519 -C "deploy@ctrlchecks"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one)

# Display public key
cat ~/.ssh/id_ed25519.pub

# Copy the output and add to GitHub:
# 1. Go to: https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI/settings/keys
# 2. Click "New SSH key"
# 3. Paste the public key
# 4. Save

# Clone using SSH
git clone git@github.com:SPT-CtrlChecks/CtrlChecks-FastAPI.git .
```

**Option 3: If User Data Script Already Deployed**

If you used the user data script during instance creation, the repository may already be cloned. Check:

```bash
# Check if repository is already cloned
ls -la /opt/fastapi-ollama/
# If files exist, skip cloning and proceed to Step 3
```

### Step 3: Create Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### Step 4: Install Python Dependencies

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

**Expected packages:**
- fastapi
- uvicorn
- pydantic
- httpx
- python-dotenv

---

## Configuring Environment Variables

### Step 1: Create .env File

**Option 1: Copy from env.example (Recommended)**

```bash
# Copy from env.example if it exists
if [ -f "env.example" ]; then
    cp env.example .env
    echo "Created .env from env.example"
else
    # Create manually if env.example doesn't exist
    cat > .env << 'EOF'
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (for chatbot proxy)
# Set this to your worker service URL if running separately
WORKER_URL=http://localhost:3001

# CORS Configuration
# For production, specify exact origins (comma-separated)
# Example: ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai
# For development, use * to allow all origins
ALLOWED_ORIGINS=*

# Request Timeout (seconds)
TIMEOUT_SECONDS=180.0
EOF
fi

# Set permissions (restrict access)
chmod 600 .env

# Edit for production settings
nano .env
```

**Production Configuration Notes:**

For production deployment, update `ALLOWED_ORIGINS` with your actual domains:

```bash
# Edit .env file
nano .env

# Update ALLOWED_ORIGINS to your production domains:
# ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai,https://api.ctrlchecks.ai
```

**Example Production .env:**
```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (if worker is on different instance, use that IP/domain)
WORKER_URL=http://localhost:3001

# CORS Configuration - Production domains only
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai,https://ollama.ctrlchecks.ai

# Request Timeout (seconds)
TIMEOUT_SECONDS=180.0
```

**Option 2: Create Manually**

```bash
# Create .env file manually
cat > .env << 'EOF'
# Ollama Configuration (local)
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (if using worker service)
WORKER_URL=http://localhost:3001

# CORS Configuration
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://ollama.ctrlchecks.ai,https://api.ctrlchecks.ai,http://localhost:8080,http://localhost:5173

# Timeout Configuration
TIMEOUT_SECONDS=180.0
EOF

# Set permissions
chmod 600 .env
```

### Step 2: Verify Configuration

```bash
# Check .env file
cat .env
```

---

## Setting Up Systemd Services

### Step 1: Create FastAPI Systemd Service

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
ExecStart=/opt/fastapi-ollama/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

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

### Step 2: View Logs

```bash
# View FastAPI logs
sudo journalctl -u fastapi-ollama -f

# View Ollama logs
sudo journalctl -u ollama -f

# View recent logs
sudo journalctl -u fastapi-ollama -n 50
```

---

## Testing the Deployment

### Step 1: Test Locally on Instance

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test FastAPI health endpoint
curl http://localhost:8000/health

# Test FastAPI root endpoint
curl http://localhost:8000/

# Test FastAPI models endpoint
curl http://localhost:8000/api/tags
```

### Step 2: Test from Outside

**From your local machine:**

```bash
# Replace with your Elastic IP or domain
PUBLIC_IP="54.123.45.67"  # Your Elastic IP
DOMAIN="api.ctrlchecks.ai"  # Your domain

# Test health endpoint
curl http://$PUBLIC_IP:8000/health
curl http://$DOMAIN:8000/health

# Test root endpoint
curl http://$PUBLIC_IP:8000/
curl http://$DOMAIN:8000/

# Test models endpoint
curl http://$PUBLIC_IP:8000/api/tags
curl http://$DOMAIN:8000/api/tags
```

### Step 3: Test Chat Endpoint

```bash
# Test chat endpoint
curl -X POST http://$PUBLIC_IP:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:3b",
    "messages": [
      {"role": "user", "content": "Hello! Say hi back."}
    ],
    "stream": false
  }'
```

---

## Pulling Ollama Models

### Step 1: Wait for Ollama to be Ready

```bash
# Wait for Ollama to start
sleep 10

# Check if Ollama is ready
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "Ollama is ready!"
        break
    fi
    echo "Waiting for Ollama... ($i/30)"
    sleep 2
done
```

### Step 2: Pull Required Models

```bash
# Pull models (this may take time depending on model size)
echo "Pulling Ollama models..."

# Pull production models (optimized for g4dn.xlarge - 16GB GPU)
echo "Pulling qwen2.5:14b-instruct-q4_K_M - General purpose model..."
ollama pull qwen2.5:14b-instruct-q4_K_M

echo "Pulling qwen2.5-coder:7b-instruct-q4_K_M - Code generation model..."
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# List pulled models
ollama list
```

### Step 3: Verify Models

```bash
# List models via API
curl http://localhost:11434/api/tags

# Should show your models
```

**Model Sizes (for g4dn.xlarge - 16GB GPU):**
- `qwen2.5:14b-instruct-q4_K_M`: ~(approx) 8 GB (General purpose, reasoning, multilingual)
- `qwen2.5-coder:7b-instruct-q4_K_M`: ~(approx) 4.5 GB (Code generation, analysis, debugging)
- **Total:** ~12.5 GB (fits in 16GB GPU with room for inference)

**⚠️ Note:** Model downloads can take 10-30 minutes depending on your internet speed.

---

## Verifying Everything Works

### Step 1: Check All Services

```bash
# Check Ollama service
sudo systemctl status ollama

# Check FastAPI service
sudo systemctl status fastapi-ollama

# Both should show "active (running)" ✅
```

### Step 2: Test Complete Workflow

```bash
# 1. Check health
curl http://localhost:8000/health

# 2. List models
curl http://localhost:8000/api/tags

# 3. Test chat (if models are pulled)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Step 3: Test from Browser

1. **Open browser**
2. **Visit:** `http://YOUR_ELASTIC_IP:8000/docs`
   - Or: `http://ollama.ctrlchecks.ai:8000/docs`
3. **You should see:** FastAPI Swagger documentation ✅

### Step 4: Monitor Logs

```bash
# Watch logs in real-time
sudo journalctl -u fastapi-ollama -f

# In another terminal, make a request
curl http://localhost:8000/health

# You should see log entries
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port 8000 Not Accessible

**Symptoms:** Connection refused when accessing `http://YOUR_IP:8000`

**Diagnostic Steps:**

```bash
# 1. Check if service is running
sudo systemctl status fastapi-ollama

# 2. Check if port is listening
sudo netstat -tlnp | grep 8000
# Should show: 0.0.0.0:8000 (NOT 127.0.0.1:8000)

# 3. Test locally
curl http://localhost:8000/health

# 4. Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager
```

**Solutions:**

1. **Service Not Running:**
   ```bash
   sudo systemctl start fastapi-ollama
   sudo systemctl enable fastapi-ollama
   ```

2. **Service Listening on Wrong Interface:**
   ```bash
   # Edit service file
   sudo nano /etc/systemd/system/fastapi-ollama.service
   # Ensure: --host 0.0.0.0 (not 127.0.0.1)
   sudo systemctl daemon-reload
   sudo systemctl restart fastapi-ollama
   ```

3. **Security Group Missing Port 8000:**
   ```bash
   # From your local machine
   INSTANCE_ID="i-xxxxxxxxxxxxx"
   SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" --output text)
   aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0
   ```

4. **Application Not Deployed:**
   - Follow deployment steps above
   - Ensure `/opt/fastapi-ollama/` directory exists

#### Issue 2: Ollama Models Not Loading

**Symptoms:** Models not found or slow responses

**Solutions:**

```bash
# Check Ollama status
sudo systemctl status ollama

# List available models
ollama list

# Pull missing models
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify models
curl http://localhost:11434/api/tags
```

#### Issue 3: Service Crashes on Startup

**Check logs:**
```bash
sudo journalctl -u fastapi-ollama -f
```

**Common causes:**
- Missing dependencies: `pip install -r requirements.txt`
- Wrong Python version: Ensure Python 3.11+
- Port already in use: `sudo lsof -i :8000`

#### Issue 4: Cannot Access from Outside

**Check:**
1. Security group allows port 8000 from 0.0.0.0/0
2. Service listening on 0.0.0.0 (not 127.0.0.1)
3. Firewall (UFW) allows port 8000: `sudo ufw allow 8000/tcp`

#### Quick Diagnostic Script

Run this on your EC2 instance:

```bash
#!/bin/bash
echo "=== FastAPI Diagnostic ==="
echo "1. Service Status:"
sudo systemctl status fastapi-ollama --no-pager | head -5
echo ""
echo "2. Port 8000:"
sudo netstat -tlnp | grep 8000 || echo "NOT listening!"
echo ""
echo "3. Local Test:"
curl -s http://localhost:8000/health || echo "FAILED!"
echo ""
echo "4. Application:"
ls -la /opt/fastapi-ollama/ 2>/dev/null || echo "NOT deployed!"
echo ""
echo "5. Recent Logs:"
sudo journalctl -u fastapi-ollama -n 5 --no-pager
```

## Troubleshooting (Legacy)

### Issue: FastAPI service won't start

**Check logs:**
```bash
sudo journalctl -u fastapi-ollama -n 50
```

**Common causes:**
1. Port 8000 already in use
2. Python dependencies not installed
3. .env file missing or incorrect
4. Ollama service not running

**Solution:**
```bash
# Check if port is in use
sudo netstat -tlnp | grep 8000

# Kill process if needed
sudo kill -9 $(sudo lsof -t -i:8000)

# Restart service
sudo systemctl restart fastapi-ollama
```

### Issue: Ollama not responding

**Check:**
```bash
# Check Ollama service
sudo systemctl status ollama

# Check Ollama logs
sudo journalctl -u ollama -n 50

# Test Ollama directly
curl http://localhost:11434/api/tags
```

**Solution:**
```bash
# Restart Ollama
sudo systemctl restart ollama

# Wait a few seconds
sleep 5

# Test again
curl http://localhost:11434/api/tags
```

### Issue: Models not found

**Solution:**
```bash
# List available models
ollama list

# Pull missing models (production models for g4dn.xlarge)
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# Verify
curl http://localhost:8000/api/tags
```

### Issue: Cannot access from outside

**Check:**
1. Security group allows port 8000
2. Application listens on 0.0.0.0 (not 127.0.0.1)
3. Firewall rules are correct

**Solution:**
```bash
# Check what interface app is listening on
sudo netstat -tlnp | grep 8000
# Should show: 0.0.0.0:8000

# If showing 127.0.0.1:8000, check uvicorn command
# Should be: --host 0.0.0.0
```

### Issue: Permission denied errors

**Solution:**
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /opt/fastapi-ollama

# Fix permissions
chmod 600 /opt/fastapi-ollama/.env
chmod +x /opt/fastapi-ollama/venv/bin/uvicorn
```

### Issue: "E: Type '<!doctype' is not known" or "The list of sources could not be read"

**Problem:** The NVIDIA repository URL returned HTML instead of a valid repository configuration file.

**Solution 1: Clean up and use alternative method (Recommended)**
```bash
# Remove corrupted repository file
sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Remove GPG key
sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Get system architecture
ARCH=$(dpkg --print-architecture)

# Add GPG key
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Add repository directly (Ubuntu 22.04)
echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/ubuntu22.04/${ARCH} /" | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Update package list
sudo apt update

# Install drivers
sudo apt install -y nvidia-driver-535 nvidia-container-toolkit
```

**Solution 2: Use Ubuntu's default NVIDIA drivers**
```bash
# Remove NVIDIA repository (if corrupted)
sudo rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Update package list
sudo apt update

# Install NVIDIA drivers from Ubuntu repositories
sudo apt install -y nvidia-driver-535 nvidia-container-toolkit

# Reboot
sudo reboot
```

**Solution 3: Skip container toolkit (if only need drivers)**
```bash
# Install only NVIDIA drivers (no container toolkit)
sudo apt update
sudo apt install -y nvidia-driver-535

# Reboot
sudo reboot
```

### Issue: "File exists. Overwrite? (y/N)" when installing NVIDIA drivers

**Problem:** GPG key file already exists from previous installation attempt.

**Solution 1: Use updated script (Recommended)**
The updated script above automatically handles this. Just run the full script again.

**Solution 2: Manual fix**
```bash
# Remove existing GPG key
sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Re-run the GPG key installation
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
```

**Solution 3: Answer the prompt**
If you see the prompt, simply type `y` and press Enter to overwrite the existing file.

### Issue: GPU not detected

**Check:**
```bash
# Check if GPU hardware is present
lspci | grep -i nvidia

# Check if drivers are loaded
nvidia-smi

# If not found, install drivers (see above)
# Reboot after installing drivers
sudo reboot

# After reboot, verify
nvidia-smi
# Should show GPU information
```

---

## Updating the Application

### Step 1: Pull Latest Code

```bash
cd /opt/fastapi-ollama

# Pull latest changes
git pull origin main

# Or if using specific branch
git pull origin production
```

### Step 2: Update Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt --upgrade
```

### Step 3: Restart Services

```bash
# Restart FastAPI service
sudo systemctl restart fastapi-ollama

# Check status
sudo systemctl status fastapi-ollama
```

### Step 4: Verify Update

```bash
# Check version/status
curl http://localhost:8000/
```

---

## Deployment Checklist

- ✅ System updated
- ✅ Python 3.11 installed
- ✅ NVIDIA drivers installed (if GPU instance)
- ✅ Ollama installed and running
- ✅ FastAPI application cloned
- ✅ Python dependencies installed
- ✅ .env file configured
- ✅ Systemd services created
- ✅ Services started and enabled
- ✅ Models pulled
- ✅ Health checks passing
- ✅ Accessible from internet
- ✅ Domain working (if configured)

---

## Next Steps

Now that your application is deployed:

1. **Monitor logs:** `sudo journalctl -u fastapi-ollama -f`
2. **Set up CloudWatch monitoring** (optional)
3. **Configure HTTPS/SSL** (optional, requires ALB or CloudFront)
4. **Set up backups** (EBS snapshots)
5. **Configure auto-scaling** (optional)

---

## Quick Reference Commands

```bash
# Service management
sudo systemctl status fastapi-ollama
sudo systemctl restart fastapi-ollama
sudo systemctl stop fastapi-ollama
sudo systemctl start fastapi-ollama

# View logs
sudo journalctl -u fastapi-ollama -f
sudo journalctl -u ollama -f

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/tags

# Pull models
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull qwen2.5-coder:7b-instruct-q4_K_M
ollama list
```

---

**✅ Application Deployed Successfully!**

Your FastAPI Ollama service should now be accessible at:
- `http://YOUR_ELASTIC_IP:8000`
- `http://api.ctrlchecks.ai:8000` (if DNS configured)
