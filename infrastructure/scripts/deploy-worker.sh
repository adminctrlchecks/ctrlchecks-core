#!/bin/bash
# Deployment script for Worker instance
# Run this script on the Worker EC2 instance to deploy/update the application

set -e

APP_DIR="/opt/ctrlchecks-worker"
cd $APP_DIR

echo "=========================================="
echo "Deploying CtrlChecks Worker"
echo "=========================================="

# Method 1: Git deployment
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest code from Git..."
    git pull origin main
fi

# Method 2: S3 deployment (uncomment and configure)
# echo "Downloading from S3..."
# aws s3 sync s3://your-bucket/worker/ $APP_DIR/ --exclude "node_modules/*" --exclude ".env"

# Method 3: Manual deployment (copy files manually)
# echo "Using existing files in $APP_DIR"

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Verify build
if [ ! -f "$APP_DIR/dist/index.js" ]; then
    echo "ERROR: Build failed - dist/index.js not found"
    exit 1
fi

# Check environment file
if [ ! -f "$APP_DIR/.env" ]; then
    echo "WARNING: .env file not found. Copy from env.example and configure."
fi

# Restart service
echo "Restarting service..."
sudo systemctl restart ctrlchecks-worker

# Wait for service to start
sleep 5

# Check service status
if sudo systemctl is-active --quiet ctrlchecks-worker; then
    echo "✅ Service is running"
else
    echo "❌ Service failed to start. Check logs:"
    echo "   sudo journalctl -u ctrlchecks-worker -n 50"
    exit 1
fi

# Health check
echo "Performing health check..."
sleep 3
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed. Service may still be starting."
fi

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Service status: sudo systemctl status ctrlchecks-worker"
echo "View logs: sudo journalctl -u ctrlchecks-worker -f"
echo "Health check: curl http://localhost:3001/health"
