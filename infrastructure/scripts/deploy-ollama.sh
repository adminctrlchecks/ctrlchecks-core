#!/bin/bash
# Deployment script for FastAPI Ollama instance
# Run this script on the FastAPI Ollama EC2 instance to deploy/update the application

set -e

APP_DIR="/opt/fastapi-ollama"
cd $APP_DIR

echo "=========================================="
echo "Deploying CtrlChecks FastAPI Ollama"
echo "=========================================="

# Activate virtual environment
source $APP_DIR/venv/bin/activate

# Method 1: Git deployment
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest code from Git..."
    git pull origin main
fi

# Method 2: S3 deployment (uncomment and configure)
# echo "Downloading from S3..."
# aws s3 sync s3://your-bucket/fastapi-ollama/ $APP_DIR/ --exclude "venv/*" --exclude ".env"

# Method 3: Manual deployment (copy files manually)
# echo "Using existing files in $APP_DIR"

# Install/update dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check environment file
if [ ! -f "$APP_DIR/.env" ]; then
    echo "WARNING: .env file not found. Copy from .env.example and configure."
fi

# Ensure Ollama is running
echo "Checking Ollama service..."
if ! sudo systemctl is-active --quiet ollama; then
    echo "Starting Ollama service..."
    sudo systemctl start ollama
    sleep 10
fi

# Verify Ollama is accessible
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama may not be ready yet. Waiting..."
    sleep 10
fi

# Restart FastAPI service
echo "Restarting FastAPI service..."
sudo systemctl restart fastapi-ollama

# Wait for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet fastapi-ollama; then
    echo "✅ FastAPI service is running"
else
    echo "❌ Service failed to start. Check logs:"
    echo "   sudo journalctl -u fastapi-ollama -n 50"
    exit 1
fi

# Health check
echo "Performing health check..."
sleep 3
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed. Service may still be starting."
fi

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Ollama status: sudo systemctl status ollama"
echo "FastAPI status: sudo systemctl status fastapi-ollama"
echo "View logs: sudo journalctl -u fastapi-ollama -f"
echo "Health check: curl http://localhost:8000/health"
echo "List models: curl http://localhost:8000/api/tags"
