#!/bin/bash
# Quick Deployment Script for Fresh EC2 Instance
# This script automates the complete deployment process
# Run this on a fresh EC2 instance after connecting via SSH

set -e

echo "=========================================="
echo "FastAPI Ollama - Quick Deployment Script"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Update system packages"
echo "  2. Install Python 3.11"
echo "  3. Install Ollama"
echo "  4. Clone repository"
echo "  5. Set up FastAPI service"
echo "  6. Pull Ollama models"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Step 1: Update System
echo ""
echo "=========================================="
echo "Step 1: Updating System"
echo "=========================================="
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git vim build-essential software-properties-common

# Step 2: Install Python 3.11
echo ""
echo "=========================================="
echo "Step 2: Installing Python 3.11"
echo "=========================================="
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Step 3: Install Ollama
echo ""
echo "=========================================="
echo "Step 3: Installing Ollama"
echo "=========================================="
curl -fsSL https://ollama.com/install.sh | sh

# Create Ollama systemd service
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

sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama 2>/dev/null || true
sudo chown -R ollama:ollama /usr/share/ollama
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Step 4: Create Application Directory
echo ""
echo "=========================================="
echo "Step 4: Setting Up Application Directory"
echo "=========================================="
sudo mkdir -p /opt/fastapi-ollama
sudo chown ubuntu:ubuntu /opt/fastapi-ollama
cd /opt/fastapi-ollama

# Step 5: Clone Repository
echo ""
echo "=========================================="
echo "Step 5: Cloning Repository"
echo "=========================================="
echo "Using repository: https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git"
REPO_URL="https://github.com/servicepathtotechnologies-ops/Fast_API_OLLAMA.git"

git clone "$REPO_URL" .
    
    # If repository has Fast_API_Ollama subdirectory (from main repo)
    if [ -d "Fast_API_Ollama" ]; then
        echo "Repository has Fast_API_Ollama subdirectory. Copying files..."
        cp -r Fast_API_Ollama/* .
        cp -r Fast_API_Ollama/.* . 2>/dev/null || true
        rm -rf Fast_API_Ollama
    fi
    
    # Verify main.py exists
    if [ ! -f "main.py" ]; then
        echo "⚠️  Warning: main.py not found. Please verify repository structure."
    fi
fi

# Step 6: Create Virtual Environment
echo ""
echo "=========================================="
echo "Step 6: Creating Virtual Environment"
echo "=========================================="
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Step 7: Install Dependencies
echo ""
echo "=========================================="
echo "Step 7: Installing Dependencies"
echo "=========================================="
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "⚠️  requirements.txt not found!"
    exit 1
fi

# Step 8: Create .env File
echo ""
echo "=========================================="
echo "Step 8: Creating .env File"
echo "=========================================="
if [ -f "env.example" ]; then
    cp env.example .env
    echo "✅ .env file created from env.example"
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   nano /opt/fastapi-ollama/.env"
else
    echo "⚠️  env.example not found. Creating basic .env..."
    cat > .env << 'EOF'
OLLAMA_URL=http://localhost:11434
PORT=8000
WORKER_URL=http://localhost:3001
ALLOWED_ORIGINS=*
TIMEOUT_SECONDS=180.0
LTX_ENABLED=false
LTX_MODEL_PATH=/opt/ltx-2
LTX_PYTHON_PATH=python3
EOF
fi
chmod 600 .env

# Step 9: Create Systemd Service
echo ""
echo "=========================================="
echo "Step 9: Creating Systemd Service"
echo "=========================================="
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

sudo systemctl daemon-reload
sudo systemctl enable fastapi-ollama

# Step 10: Start Services
echo ""
echo "=========================================="
echo "Step 10: Starting Services"
echo "=========================================="
sudo systemctl restart ollama
sleep 5
sudo systemctl start fastapi-ollama

# Step 11: Pull Ollama Models
echo ""
echo "=========================================="
echo "Step 11: Pulling Ollama Models"
echo "=========================================="
echo "This will take several minutes..."
read -p "Pull models now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ollama pull qwen2.5:14b-instruct-q4_K_M
    ollama pull qwen2.5-coder:7b-instruct-q4_K_M
else
    echo "⚠️  Skipping model pull. You can pull later with:"
    echo "   ollama pull qwen2.5:14b-instruct-q4_K_M"
    echo "   ollama pull qwen2.5-coder:7b-instruct-q4_K_M"
fi

# Step 12: Configure Firewall
echo ""
echo "=========================================="
echo "Step 12: Configuring Firewall"
echo "=========================================="
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable || true

# Final Status
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
sudo systemctl status ollama --no-pager -l | head -5
echo ""
sudo systemctl status fastapi-ollama --no-pager -l | head -5
echo ""
echo "Test the service:"
echo "  curl http://localhost:8000/health"
echo "  curl http://localhost:8000/api/tags"
echo ""
echo "View logs:"
echo "  sudo journalctl -u fastapi-ollama -f"
echo ""
echo "Edit configuration:"
echo "  nano /opt/fastapi-ollama/.env"
echo ""
echo "=========================================="
