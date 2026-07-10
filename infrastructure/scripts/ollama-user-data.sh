#!/bin/bash
# CtrlChecks FastAPI Ollama Instance - User Data Script
# This script runs on first boot to set up Ollama and FastAPI service

set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=========================================="
echo "CtrlChecks FastAPI Ollama Instance Setup"
echo "=========================================="

# Update system
echo "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install basic utilities
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    jq \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common

# Install NVIDIA drivers and CUDA (for GPU instances)
if [ -n "$(lspci | grep -i nvidia)" ]; then
    echo "NVIDIA GPU detected. Installing drivers..."
    
    # Get system architecture
    ARCH=$(dpkg --print-architecture)
    
    # Remove existing GPG key if present to avoid "File exists" prompt
    if [ -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg ]; then
        echo "Removing existing NVIDIA GPG key..."
        rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    fi
    
    # Remove any corrupted repository list file
    if [ -f /etc/apt/sources.list.d/nvidia-container-toolkit.list ]; then
        echo "Removing existing repository list file..."
        rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
    fi
    
    # Add NVIDIA GPG key
    echo "Adding NVIDIA GPG key..."
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    
    # Add NVIDIA repository using direct method (more reliable)
    # Use Ubuntu 22.04 repository directly
    echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/ubuntu22.04/${ARCH} /" | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
    
    apt-get update -y
    
    # Install NVIDIA drivers and container toolkit
    # Note: For EC2 GPU instances, drivers are often pre-installed
    # We'll install container toolkit which is needed for Ollama GPU support
    apt-get install -y nvidia-container-toolkit || echo "Container toolkit installation failed, continuing..."
    
    # Configure container runtime if docker is installed
    if command -v docker &> /dev/null; then
        nvidia-ctk runtime configure --runtime=docker || echo "Docker runtime configuration skipped"
        systemctl restart docker || true
    fi
    
    echo "NVIDIA drivers setup complete. Note: Full driver installation may require reboot."
fi

# Install Python 3.11
echo "Installing Python 3.11..."
add-apt-repository ppa:deadsnakes/ppa -y
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install Ollama
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Verify Ollama installation
ollama --version || echo "Ollama installation check..."

# Create application directory
APP_DIR="/opt/fastapi-ollama"
REPO_DIR="/tmp/ctrlchecks-repo"
mkdir -p $APP_DIR
mkdir -p $REPO_DIR

# Clone repository
# Default repository URL - can be overridden via environment variable
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "Cloning repository: $GIT_REPO_URL (branch: $GIT_BRANCH)"
cd $REPO_DIR

# Clone the repository
if [[ "$GIT_REPO_URL" == *"@"* ]]; then
    # SSH URL - ensure SSH keys are configured
    git clone -b $GIT_BRANCH $GIT_REPO_URL . || {
        echo "Failed to clone repository. Please ensure SSH keys are configured."
        echo "Falling back to manual setup..."
        # Continue with manual setup below
    }
else
    # HTTPS URL
    git clone -b $GIT_BRANCH $GIT_REPO_URL . || {
        echo "Failed to clone repository. Please check URL and access."
        echo "Falling back to manual setup..."
    }
fi

# Copy files to application directory
# If repository contains Fast_API_Ollama subdirectory, copy from there
# Otherwise, assume repository root contains the FastAPI files
if [ -d "$REPO_DIR/Fast_API_Ollama" ]; then
    echo "Copying Fast_API_Ollama files to $APP_DIR..."
    cp -r $REPO_DIR/Fast_API_Ollama/* $APP_DIR/
    # Copy hidden files too
    cp -r $REPO_DIR/Fast_API_Ollama/.[^.]* $APP_DIR/ 2>/dev/null || true
    echo "Files copied successfully"
elif [ -f "$REPO_DIR/main.py" ]; then
    echo "Repository root contains FastAPI files, copying to $APP_DIR..."
    cp -r $REPO_DIR/* $APP_DIR/
    # Copy hidden files too
    cp -r $REPO_DIR/.[^.]* $APP_DIR/ 2>/dev/null || true
    echo "Files copied successfully"
else
    echo "Warning: FastAPI files not found in expected locations"
    echo "Continuing with manual setup..."
fi

cd $APP_DIR

# Create Python virtual environment
python3.11 -m venv $APP_DIR/venv
source $APP_DIR/venv/bin/activate

# Install Python dependencies
# Use requirements.txt from repository if it exists, otherwise create default
if [ ! -f "$APP_DIR/requirements.txt" ]; then
    echo "Creating default requirements.txt..."
cat > $APP_DIR/requirements.txt << 'REQ_EOF'
fastapi>=0.115.6
uvicorn[standard]>=0.32.1
pydantic>=2.10.0
pydantic-settings>=2.7.1
python-multipart>=0.0.9
httpx>=0.27.2
python-dotenv>=1.0.1
pytest>=8.3.3
pytest-cov>=5.0.0
pytest-asyncio>=0.24.0
REQ_EOF
fi

pip install --upgrade pip
pip install -r $APP_DIR/requirements.txt

# Create environment file from .env.example or env.example if it exists, otherwise create default
if [ -f "$APP_DIR/.env.example" ]; then
    echo "Copying .env.example to .env..."
    cp $APP_DIR/.env.example $APP_DIR/.env
    # Update WORKER_URL if needed (can be set via environment variable)
    if [ -n "$WORKER_URL" ]; then
        sed -i "s|WORKER_URL=.*|WORKER_URL=$WORKER_URL|" $APP_DIR/.env
    fi
elif [ -f "$APP_DIR/env.example" ]; then
    echo "Copying env.example to .env..."
    cp $APP_DIR/env.example $APP_DIR/.env
    # Update WORKER_URL if needed (can be set via environment variable)
    if [ -n "$WORKER_URL" ]; then
        sed -i "s|WORKER_URL=.*|WORKER_URL=$WORKER_URL|" $APP_DIR/.env
    fi
else
    echo "Creating default .env file..."
cat > $APP_DIR/.env << 'EOF'
# Ollama Configuration (local)
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (for chatbot proxy)
# Update this to your worker service URL if running separately
WORKER_URL=http://localhost:3001

# CORS Configuration
# For production, specify exact origins (comma-separated)
# Example: ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai
ALLOWED_ORIGINS=*

# Request Timeout (seconds)
TIMEOUT_SECONDS=180.0
EOF
fi

# Verify main.py exists
if [ ! -f "$APP_DIR/main.py" ]; then
    echo "ERROR: main.py not found! Please ensure Fast_API_Ollama directory is properly cloned."
    exit 1
fi

# Create systemd service for Ollama
cat > /etc/systemd/system/ollama.service << 'OLLAMA_EOF'
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

[Install]
WantedBy=multi-user.target
OLLAMA_EOF

# Create systemd service for FastAPI
cat > /etc/systemd/system/fastapi-ollama.service << 'FASTAPI_EOF'
[Unit]
Description=CtrlChecks FastAPI Ollama Service
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/fastapi-ollama
Environment="PATH=/opt/fastapi-ollama/venv/bin:/usr/bin:/usr/local/bin"
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
FASTAPI_EOF

# Create deployment script
cat > $APP_DIR/deploy.sh << 'DEPLOY_EOF'
#!/bin/bash
set -e

cd /opt/fastapi-ollama
source venv/bin/activate

# Pull latest code (adjust based on your deployment method)
# git pull origin main

# Install/update dependencies
pip install -r requirements.txt

# Restart services
sudo systemctl restart ollama
sleep 5  # Wait for Ollama to start
sudo systemctl restart fastapi-ollama

echo "Deployment complete!"
DEPLOY_EOF

chmod +x $APP_DIR/deploy.sh

# Create script to pull Ollama models
cat > $APP_DIR/pull-models.sh << 'MODELS_EOF'
#!/bin/bash
# Pull required Ollama models

echo "Pulling Ollama models..."

# Wait for Ollama to be ready
sleep 10
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        echo "Ollama is ready!"
        break
    fi
    echo "Waiting for Ollama... ($i/30)"
    sleep 2
done

# Pull production models (optimized for g4dn.xlarge - 16GB GPU)
echo "Pulling qwen2.5:14b-instruct-q4_K_M - General purpose model..."
ollama pull qwen2.5:14b-instruct-q4_K_M || echo "Failed to pull qwen2.5:14b-instruct-q4_K_M"

echo "Pulling qwen2.5-coder:7b-instruct-q4_K_M - Code generation model..."
ollama pull qwen2.5-coder:7b-instruct-q4_K_M || echo "Failed to pull qwen2.5-coder:7b-instruct-q4_K_M"

echo "Model pull complete!"
MODELS_EOF

chmod +x $APP_DIR/pull-models.sh

# Set permissions
chown -R ubuntu:ubuntu $APP_DIR

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E amazon-cloudwatch-agent.deb || true

# Create CloudWatch config
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/ctrlchecks-ollama/user-data",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/ctrlchecks-ollama/syslog",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "CtrlChecks/Ollama",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ]
      },
      "nvidia_gpu": {
        "measurement": [
          "utilization_gpu",
          "memory_used_gpu",
          "memory_total_gpu"
        ]
      }
    }
  }
}
CW_EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s || true

# Enable and start services
systemctl daemon-reload
systemctl enable ollama
systemctl enable fastapi-ollama

# Start Ollama service
systemctl start ollama

# Wait for Ollama to be ready, then pull models
echo "Waiting for Ollama to start..."
sleep 15
sudo -u ubuntu bash $APP_DIR/pull-models.sh &

# Start FastAPI service after a delay
sleep 20
systemctl start fastapi-ollama

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo "Next steps:"
echo "1. Update /opt/fastapi-ollama/.env with your configuration"
echo "2. Deploy your application code to /opt/fastapi-ollama"
echo "3. Check Ollama: sudo systemctl status ollama"
echo "4. Check FastAPI: sudo systemctl status fastapi-ollama"
echo "5. Test: curl http://localhost:8000/health"
echo "=========================================="

# Create a marker file to indicate setup is complete
touch /opt/fastapi-ollama/.setup-complete
