#!/bin/bash
# CtrlChecks Worker Instance - User Data Script
# This script runs on first boot to set up the Worker service

set -e
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=========================================="
echo "CtrlChecks Worker Instance Setup"
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
    lsb-release

# Install Node.js 20.x
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install Docker (optional, for containerized deployment)
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
rm get-docker.sh

# Install PM2 for process management
npm install -g pm2

# Create application directory
APP_DIR="/opt/ctrlchecks-worker"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (replace with your repository URL)
# Option 1: From GitHub
# git clone https://github.com/your-org/ctrlchecks-ai-workflow-os.git .
# cd worker

# Option 2: Copy files from S3 (recommended for production)
# aws s3 sync s3://your-bucket/worker/ $APP_DIR/

# For now, we'll create a placeholder structure
# You should replace this with actual deployment method
mkdir -p $APP_DIR/src
mkdir -p $APP_DIR/dist

# Create environment file template
cat > $APP_DIR/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Ollama Configuration (point to FastAPI Ollama instance)
OLLAMA_HOST=http://CHANGE_ME:8000
OLLAMA_BASE_URL=http://CHANGE_ME:8000

# Worker Service Configuration
PORT=3001
PUBLIC_BASE_URL=http://CHANGE_ME
WORKER_ID=worker-aws-1

# FastAPI Ollama Service
FASTAPI_OLLAMA_URL=http://CHANGE_ME:8000
PYTHON_BACKEND_URL=http://CHANGE_ME:8000

# CORS Configuration
CORS_ORIGIN=*
ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=INFO
PROCESS_TIMEOUT_SECONDS=1800
MAX_RETRIES=3
EOF

# Create systemd service file
cat > /etc/systemd/system/ctrlchecks-worker.service << 'EOF'
[Unit]
Description=CtrlChecks Worker Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ctrlchecks-worker
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/node /opt/ctrlchecks-worker/dist/index.js
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

# Create deployment script
cat > $APP_DIR/deploy.sh << 'DEPLOY_EOF'
#!/bin/bash
set -e

cd /opt/ctrlchecks-worker

# Pull latest code (adjust based on your deployment method)
# git pull origin main

# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Restart service
sudo systemctl restart ctrlchecks-worker

echo "Deployment complete!"
DEPLOY_EOF

chmod +x $APP_DIR/deploy.sh

# Set permissions
chown -R ubuntu:ubuntu $APP_DIR

# Install CloudWatch agent (optional)
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
            "log_group_name": "/aws/ec2/ctrlchecks-worker/user-data",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/ctrlchecks-worker/syslog",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "CtrlChecks/Worker",
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
      "diskio": {
        "measurement": [
          "io_time"
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
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
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

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo "Next steps:"
echo "1. Update /opt/ctrlchecks-worker/.env with your configuration"
echo "2. Deploy your application code to /opt/ctrlchecks-worker"
echo "3. Run: sudo systemctl start ctrlchecks-worker"
echo "4. Check status: sudo systemctl status ctrlchecks-worker"
echo "=========================================="

# Create a marker file to indicate setup is complete
touch /opt/ctrlchecks-worker/.setup-complete
