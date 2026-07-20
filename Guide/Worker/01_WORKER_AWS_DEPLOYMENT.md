# Worker Service - AWS EC2 Deployment Guide

**Complete step-by-step guide for deploying CtrlChecks Worker service on AWS EC2**

---

## 🎯 QUICK START FOR COMPLETE BEGINNERS

**If you have ZERO knowledge and want simple step-by-step instructions, follow this section first!**

### What You Need Before Starting:

1. ✅ AWS Account (with EC2 access)
2. ✅ Elastic IP already allocated (you mentioned you have this)
3. ✅ Route 53 domain: `worker.ctrlchecks.ai` (you mentioned you have this)
4. ✅ GitHub repository: `https://github.com/servicepathtotechnologies-ops/worker-002.git`
5. ✅ Supabase credentials (URL and Service Role Key)

### Simple 3-Step Process:

#### **STEP 1: Clean Old Server (If You Have One Running)**

**If you can still access your old server via SSH:**

```bash
# Connect to your old server
ssh -i your-key.pem ubuntu@your-old-ip-address

# Once connected, run these commands to delete everything:
sudo systemctl stop ctrlchecks-worker
sudo systemctl disable ctrlchecks-worker
sudo rm -f /etc/systemd/system/ctrlchecks-worker.service
sudo systemctl daemon-reload
sudo rm -rf /opt/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-enabled/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-available/ctrlchecks-worker
exit
```

**✅ Done! Old files deleted. Now proceed to Step 2.**

---

#### **STEP 2: Deploy New Code from Scratch**

**Follow these steps in order (copy and paste each command):**

**2.1: Connect to Your Server**
```bash
# Replace YOUR_ELASTIC_IP with your actual Elastic IP address
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

# Example: ssh -i ctrlchecks-worker-key.pem ubuntu@54.123.45.67
```

**2.2: Install Node.js (if not already installed)**
```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify it worked
node --version
npm --version
```

**2.3: Delete Old Files and Clone New Repository**
```bash
# Delete everything old
sudo rm -rf /opt/ctrlchecks-worker

# Create new directory
sudo mkdir -p /opt/ctrlchecks-worker
sudo chown ubuntu:ubuntu /opt/ctrlchecks-worker
cd /opt/ctrlchecks-worker

# Clone your NEW repository
git clone https://github.com/servicepathtotechnologies-ops/worker-002.git .

# Check if there's a 'worker' subdirectory
if [ -d "worker" ]; then
    cd worker
fi

# Install dependencies
npm install

# Build the application
npm run build

# Verify build worked
ls -la dist/
```

**2.4: Create Environment File**
```bash
# Copy template
cp env.example .env

# Edit the file
nano .env
```

**📝 In the nano editor, paste this and UPDATE with your actual values:**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
PORT=3001
PUBLIC_BASE_URL=https://worker.ctrlchecks.ai
WORKER_ID=worker-aws-1
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app
LOG_LEVEL=INFO
PROCESS_TIMEOUT_SECONDS=1800
MAX_RETRIES=3
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

**2.5: Create Service to Keep Backend Running**
```bash
# Find your exact path first
pwd
ls -la dist/index.js

# Create service file
sudo nano /etc/systemd/system/ctrlchecks-worker.service
```

**📝 Paste this (update the paths if needed):**

```ini
[Unit]
Description=CtrlChecks Worker Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ctrlchecks-worker
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/ctrlchecks-worker/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**📝 If you have a `worker` subdirectory, use:**
- `WorkingDirectory=/opt/ctrlchecks-worker/worker`
- `ExecStart=/usr/bin/node /opt/ctrlchecks-worker/worker/dist/index.js`

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

**2.6: Start the Service**
```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ctrlchecks-worker
sudo systemctl start ctrlchecks-worker

# Check if it's running
sudo systemctl status ctrlchecks-worker
```

**✅ If status shows "active (running)", you're done!**

---

#### **STEP 3: Configure Route 53 and SSL**

**3.1: Update Route 53 DNS (From Your Windows Computer)**

**Option A: Using AWS Console (Easiest):**
1. Go to: **AWS Console → Route 53 → Hosted zones**
2. Click: **ctrlchecks.ai**
3. Click: **Create record**
4. **Name:** `worker`
5. **Type:** `A`
6. **Value:** Your Elastic IP (e.g., `54.123.45.67`)
7. Click: **Create records**

**Option B: Using PowerShell:**
```powershell
# Get your Elastic IP
$eip = "YOUR_ELASTIC_IP"  # Replace with your actual IP

# Get Hosted Zone ID
$hostedZoneId = aws route53 list-hosted-zones --query "HostedZones[?Name=='ctrlchecks.ai.'] | [0].Id" --output text
$hostedZoneId = $hostedZoneId -replace '/hostedzone/', ''

# Create record
aws route53 change-resource-record-sets --hosted-zone-id $hostedZoneId --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"worker.ctrlchecks.ai\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$eip\"}]}}]}"
```

**3.2: Set Up SSL (On Your Server)**
```bash
# Install Nginx and Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name worker.ctrlchecks.ai;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save and enable:**
```bash
sudo ln -s /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate (wait 10-30 minutes after DNS update)
sudo certbot --nginx -d worker.ctrlchecks.ai
```

**✅ Done! Your backend is now running and accessible at `https://worker.ctrlchecks.ai`**

---

### How to Connect Frontend to Backend:

**In your frontend code, use this URL:**
```
https://worker.ctrlchecks.ai
```

**Example API call:**
```javascript
fetch('https://worker.ctrlchecks.ai/health')
  .then(response => response.json())
  .then(data => console.log(data));
```

---

### How to Keep Backend Running:

**The systemd service automatically:**
- ✅ Starts when server boots
- ✅ Restarts if it crashes
- ✅ Runs in the background

**To check if it's running:**
```bash
sudo systemctl status ctrlchecks-worker
```

**To restart it:**
```bash
sudo systemctl restart ctrlchecks-worker
```

**To view logs:**
```bash
sudo journalctl -u ctrlchecks-worker -f
```

---

## ⚠️ STARTING FRESH? READ THIS FIRST!

**If you want to delete everything and start completely fresh:**

1. **Jump to:** [Complete Fresh Start Workflow](#-complete-fresh-start-workflow)
2. **Or use the automated cleanup script:** [Step 0.3 - Automated Cleanup Script](#step-03-automated-cleanup-script-recommended)

**The cleanup will delete:**
- All AWS resources (EC2 instance, Elastic IP, Security Group)
- All server files (application, configs, services)
- Everything related to the Worker deployment

**After cleanup, start deployment from:** [Step-by-Step Deployment](#step-by-step-deployment)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Cleanup Existing Deployment](#cleanup-existing-deployment) *(Optional - for fresh start)*
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Cost Summary](#cost-summary)

---

## Overview

### What We're Building

- **Service:** CtrlChecks Worker (Node.js/Express)
- **Infrastructure:** AWS EC2 Instance
- **Domain:** `api.ctrlchecks.ai` (optional)
- **Instance Type:** t3.medium (2 vCPU, 4GB RAM) - recommended
- **Cost:** ~$30-50/month

### Architecture

```
Internet
    ↓
Route 53 DNS (worker.ctrlchecks.ai) → Resolves domain to IP address
    ↓
Elastic IP (Static IP: 54.123.45.67)
    ↓
EC2 Instance (t3.medium)
    ├── Nginx (port 80/443) → SSL termination, reverse proxy
    ├── Node.js 20
    ├── Worker Service (port 3001) → Your application
    └── Systemd Service (auto-start)
```

### How Route 53 and Nginx Work Together

**Route 53 (DNS Service):**
- Resolves `worker.ctrlchecks.ai` → `54.123.45.67` (your EC2 IP)
- Handles DNS queries from clients
- Points domain to your server

**Nginx (Reverse Proxy on EC2):**
- Receives HTTPS requests on port 443 (or HTTP on port 80)
- Terminates SSL/TLS (handles certificates)
- Routes requests to your Worker app on port 3001
- Adds security headers, handles timeouts, etc.

**Flow:**
1. Client requests `https://worker.ctrlchecks.ai/health`
2. Route 53 resolves domain → EC2 IP address
3. Request arrives at EC2 instance on port 443
4. Nginx receives request, validates SSL certificate
5. Nginx forwards request to `http://localhost:3001/health`
6. Worker app responds
7. Nginx returns response to client

**Why Both Are Needed:**
- **Route 53**: Without it, you'd need to use IP addresses directly (not user-friendly)
- **Nginx**: Without it, your app would need to handle SSL, security headers, and expose port 3001 directly (less secure)

---

## Prerequisites

Before starting, ensure you have:

- ✅ AWS account with EC2 access
- ✅ Domain name configured in Route 53 (optional)
- ✅ AWS CLI installed and configured
- ✅ SSH key pair for EC2 access
- ✅ FastAPI Ollama already deployed (for connection)
- ✅ Supabase project configured

---

## 🗑️ COMPLETE FRESH START - Delete Everything and Restart

**⚠️ READ THIS FIRST if you want to delete ALL existing Worker deployment and start completely fresh.**

This section will help you:
1. **Delete AWS resources** (EC2, Elastic IP, Security Group)
2. **Clean up server files** (if you can still access the server)
3. **Start fresh deployment** from scratch

---

## Cleanup Existing Deployment

**⚠️ Use this section if you want to delete all existing Worker deployment resources and start fresh.**

This will delete:
- EC2 Instance (and all data on it)
- Elastic IP (if allocated)
- Security Group
- Route 53 DNS record (optional)
- All application files on the server

### Step 0.0: Clean Up Server Files (If You Can Still Access Server)

**📝 IMPORTANT: Run these commands ON THE SERVER (via SSH) to delete all old files.**

**If you're currently SSH'd into the server, run these commands to clean up:**

```bash
# ============================================
# STEP 1: STOP THE OLD SERVICE
# ============================================
# Stop and disable the service
sudo systemctl stop ctrlchecks-worker
sudo systemctl disable ctrlchecks-worker

# Remove systemd service file
sudo rm -f /etc/systemd/system/ctrlchecks-worker.service
sudo systemctl daemon-reload

# ============================================
# STEP 2: DELETE ALL APPLICATION FILES
# ============================================
# Remove application directory completely
sudo rm -rf /opt/ctrlchecks-worker

# ============================================
# STEP 3: REMOVE NGINX CONFIGURATION
# ============================================
# Remove Nginx configuration files
sudo rm -f /etc/nginx/sites-enabled/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-available/ctrlchecks-worker

# Test and restart Nginx
sudo nginx -t && sudo systemctl restart nginx

# ============================================
# STEP 4: OPTIONAL - REMOVE SSL CERTIFICATES
# ============================================
# Only run this if you want to completely remove SSL
# sudo certbot delete --cert-name worker.ctrlchecks.ai

# ============================================
# STEP 5: VERIFY CLEANUP
# ============================================
# Check that files are gone
ls -la /opt/ctrlchecks-worker
# Should show: "No such file or directory"

# Check service is gone
sudo systemctl status ctrlchecks-worker
# Should show: "Unit ctrlchecks-worker.service could not be found."

# Exit SSH session
exit
```

**✅ Checkpoint:** All old files deleted from server. Now proceed to delete AWS resources (Step 0.1) or start fresh deployment.

**✅ Checkpoint:** Server files cleaned up. Now proceed to delete AWS resources.

---

### Step 0.1: Find Existing Resources

**From Windows Terminal (PowerShell or CMD):**

```powershell
# Set your region (adjust if different)
$region = "us-east-1"

# Find instance by name tag
$instance = aws ec2 describe-instances `
  --region $region `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" "Name=instance-state-name,Values=running,stopped,stopping" `
  --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" `
  --output text

# If instance found, extract Instance ID
if ($instance) {
    $instanceId = ($instance -split "`t")[0]
    Write-Host "Found instance: $instanceId"
} else {
    Write-Host "No running/stopped instance found"
}

# Find security group
$sg = aws ec2 describe-security-groups `
  --region $region `
  --filters "Name=group-name,Values=ctrlchecks-worker-sg" `
  --query "SecurityGroups[0].GroupId" `
  --output text

# Find Elastic IP (if exists)
$eip = aws ec2 describe-addresses `
  --region $region `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Addresses[0].[AllocationId,PublicIp]" `
  --output text
```

### Step 0.2: Delete Resources

**⚠️ WARNING: This will permanently delete your instance and data!**

```powershell
# Replace these with your actual IDs from Step 0.1
$instanceId = "i-xxxxxxxxxxxxx"  # Replace with your instance ID
$sgId = "sg-xxxxxxxxx"            # Replace with your security group ID
$allocationId = "eipalloc-xxxxx"  # Replace with your Elastic IP allocation ID (if exists)

# 1. Disassociate Elastic IP (if exists)
if ($allocationId -and $allocationId -ne "None") {
    Write-Host "Disassociating Elastic IP..."
    aws ec2 disassociate-address --allocation-id $allocationId --region $region
}

# 2. Release Elastic IP (if exists)
if ($allocationId -and $allocationId -ne "None") {
    Write-Host "Releasing Elastic IP..."
    aws ec2 release-address --allocation-id $allocationId --region $region
}

# 3. Terminate EC2 Instance
if ($instanceId) {
    Write-Host "Terminating instance: $instanceId"
    aws ec2 terminate-instances --instance-ids $instanceId --region $region
    
    # Wait for termination
    Write-Host "Waiting for instance to terminate..."
    aws ec2 wait instance-terminated --instance-ids $instanceId --region $region
    Write-Host "Instance terminated"
}

# 4. Delete Security Group (wait a few seconds after instance termination)
if ($sgId -and $sgId -ne "None") {
    Start-Sleep -Seconds 10
    Write-Host "Deleting security group: $sgId"
    aws ec2 delete-security-group --group-id $sgId --region $region
    Write-Host "Security group deleted"
}

# 5. Delete Route 53 DNS Record (optional - only if you want to remove DNS)
# Uncomment and adjust if needed:
# $hostedZoneId = "Z1234567890ABC"  # Your hosted zone ID
# aws route53 change-resource-record-sets `
#   --hosted-zone-id $hostedZoneId `
#   --change-batch '{
#     "Changes": [{
#       "Action": "DELETE",
#       "ResourceRecordSet": {
#         "Name": "api.ctrlchecks.ai",
#         "Type": "A",
#         "TTL": 300,
#         "ResourceRecords": [{"Value": "OLD_IP_ADDRESS"}]
#       }
#     }]
#   }'
```

### Step 0.3: Automated Cleanup Script (RECOMMENDED)

**For easier cleanup, save this as `cleanup-worker.ps1` in your project root:**

```powershell
# cleanup-worker.ps1
# Script to clean up CtrlChecks Worker deployment completely

param(
    [string]$Region = "us-east-1",
    [switch]$Force = $false
)

Write-Host "==========================================" -ForegroundColor Red
Write-Host "COMPLETE CLEANUP - CtrlChecks Worker" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "This will DELETE ALL Worker resources. Type 'DELETE' to continue"
    if ($confirm -ne "DELETE") {
        Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        exit
    }
}

Write-Host "Starting cleanup process..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Find and terminate instance
Write-Host "[1/5] Finding EC2 instance..." -ForegroundColor Cyan
$instances = aws ec2 describe-instances `
    --region $Region `
    --filters "Name=tag:Name,Values=ctrlchecks-worker" `
    --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" `
    --output json | ConvertFrom-Json

$instanceId = $null
if ($instances.Count -gt 0 -and $instances[0].Count -gt 0) {
    $instanceId = $instances[0][0][0]
    $instanceState = $instances[0][0][2]
    $instanceIp = $instances[0][0][1]
    Write-Host "  Found instance: $instanceId" -ForegroundColor Green
    Write-Host "  State: $instanceState" -ForegroundColor Green
    Write-Host "  IP: $instanceIp" -ForegroundColor Green
} else {
    Write-Host "  No instance found with name 'ctrlchecks-worker'" -ForegroundColor Yellow
}

# Step 2: Find and release Elastic IP
Write-Host "`n[2/5] Finding Elastic IP..." -ForegroundColor Cyan
$allocationId = $null
if ($instanceId) {
    $eipInfo = aws ec2 describe-addresses `
        --region $Region `
        --filters "Name=instance-id,Values=$instanceId" `
        --query "Addresses[0].[AllocationId,AssociationId,PublicIp]" `
        --output json | ConvertFrom-Json
    
    if ($eipInfo -and $eipInfo[0] -ne $null) {
        $allocationId = $eipInfo[0]
        $associationId = $eipInfo[1]
        $eipAddress = $eipInfo[2]
        Write-Host "  Found Elastic IP: $eipAddress" -ForegroundColor Green
        
        # Disassociate
        Write-Host "  Disassociating Elastic IP..." -ForegroundColor Yellow
        aws ec2 disassociate-address --association-id $associationId --region $Region 2>&1 | Out-Null
        
        # Release
        Write-Host "  Releasing Elastic IP..." -ForegroundColor Yellow
        aws ec2 release-address --allocation-id $allocationId --region $Region 2>&1 | Out-Null
        Write-Host "  Elastic IP released" -ForegroundColor Green
    } else {
        Write-Host "  No Elastic IP associated with instance" -ForegroundColor Yellow
    }
} else {
    # Try to find unassociated Elastic IPs with the tag
    $eipInfo = aws ec2 describe-addresses `
        --region $Region `
        --filters "Name=tag:Name,Values=ctrlchecks-worker" `
        --query "Addresses[0].[AllocationId,PublicIp]" `
        --output json | ConvertFrom-Json
    
    if ($eipInfo -and $eipInfo[0] -ne $null) {
        $allocationId = $eipInfo[0]
        $eipAddress = $eipInfo[1]
        Write-Host "  Found unassociated Elastic IP: $eipAddress" -ForegroundColor Green
        Write-Host "  Releasing..." -ForegroundColor Yellow
        aws ec2 release-address --allocation-id $allocationId --region $Region 2>&1 | Out-Null
        Write-Host "  Elastic IP released" -ForegroundColor Green
    } else {
        Write-Host "  No Elastic IP found" -ForegroundColor Yellow
    }
}

# Step 3: Terminate instance
if ($instanceId) {
    Write-Host "`n[3/5] Terminating instance..." -ForegroundColor Cyan
    if ($instanceState -eq "running" -or $instanceState -eq "stopped") {
        Write-Host "  Terminating instance: $instanceId" -ForegroundColor Yellow
        aws ec2 terminate-instances --instance-ids $instanceId --region $Region 2>&1 | Out-Null
        Write-Host "  Waiting for termination (this may take 1-2 minutes)..." -ForegroundColor Yellow
        aws ec2 wait instance-terminated --instance-ids $instanceId --region $Region
        Write-Host "  Instance terminated" -ForegroundColor Green
    } else {
        Write-Host "  Instance is already in state: $instanceState" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/5] Skipping instance termination (no instance found)" -ForegroundColor Yellow
}

# Step 4: Delete security group
Write-Host "`n[4/5] Finding security group..." -ForegroundColor Cyan
Start-Sleep -Seconds 5  # Wait a bit for instance to fully terminate
$sg = aws ec2 describe-security-groups `
    --region $Region `
    --filters "Name=group-name,Values=ctrlchecks-worker-sg" `
    --query "SecurityGroups[0].GroupId" `
    --output text

if ($sg -and $sg -ne "None" -and $sg -ne "") {
    Write-Host "  Found security group: $sg" -ForegroundColor Green
    Write-Host "  Deleting security group..." -ForegroundColor Yellow
    aws ec2 delete-security-group --group-id $sg --region $Region 2>&1 | Out-Null
    Write-Host "  Security group deleted" -ForegroundColor Green
} else {
    Write-Host "  No security group found" -ForegroundColor Yellow
}

# Step 5: Delete key pair (optional - uncomment if you want to delete the key pair too)
# Write-Host "`n[5/5] Deleting key pair..." -ForegroundColor Cyan
# aws ec2 delete-key-pair --key-name ctrlchecks-worker-key --region $Region 2>&1 | Out-Null
# Write-Host "  Key pair deleted" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "All Worker resources have been deleted." -ForegroundColor Green
Write-Host "You can now proceed with a fresh deployment starting from Step 1." -ForegroundColor Green
Write-Host ""
```

**Run the cleanup script:**
```powershell
# Make sure AWS CLI is configured
# Navigate to your project directory first
cd C:\Users\User\Desktop\ctrlchecks-ai-workflow-os1\ctrlchecks-ai-workflow-os

# Run cleanup (will ask for confirmation)
.\cleanup-worker.ps1

# Or run with -Force flag to skip confirmation
.\cleanup-worker.ps1 -Force

# Or specify a different region:
.\cleanup-worker.ps1 -Region "us-west-2"
```

### Step 0.4: Verify Cleanup

```powershell
# Verify no instances exist
aws ec2 describe-instances `
  --region us-east-1 `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text

# Should return empty or "None"

# Verify security group deleted
aws ec2 describe-security-groups `
  --region us-east-1 `
  --filters "Name=group-name,Values=ctrlchecks-worker-sg" `
  --query "SecurityGroups[*].GroupId" `
  --output text

# Should return empty or "None"
```

**✅ Checkpoint:** All resources deleted. Ready for fresh deployment.

---

## 🚀 COMPLETE FRESH START WORKFLOW

**Follow these steps in order for a complete fresh start:**

### Quick Start Checklist

1. ✅ **Clean up server files** (if you can access the server) → [Step 0.0](#step-00-clean-up-server-files-if-you-can-still-access-server)
2. ✅ **Delete AWS resources** → [Step 0.3](#step-03-automated-cleanup-script-recommended) (Run cleanup script)
3. ✅ **Verify cleanup** → [Step 0.4](#step-04-verify-cleanup)
4. ✅ **Start fresh deployment** → [Step-by-Step Deployment](#step-by-step-deployment)

### Detailed Workflow

**From Windows PowerShell (your local machine):**

```powershell
# Step 1: Navigate to project directory
cd C:\Users\User\Desktop\ctrlchecks-ai-workflow-os1\ctrlchecks-ai-workflow-os

# Step 2: Run cleanup script (deletes all AWS resources)
.\cleanup-worker.ps1

# Step 3: Verify everything is deleted
aws ec2 describe-instances `
  --region us-east-1 `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text
# Should return empty or "None"

# Step 4: Now proceed to Step-by-Step Deployment section below
```

**If you're currently SSH'd into the server:**

```bash
# First, clean up server files (run these on the server)
sudo systemctl stop ctrlchecks-worker
sudo systemctl disable ctrlchecks-worker
sudo rm -f /etc/systemd/system/ctrlchecks-worker.service
sudo systemctl daemon-reload
sudo rm -rf /opt/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-enabled/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-available/ctrlchecks-worker
sudo nginx -t && sudo systemctl restart nginx
exit

# Then go back to Windows PowerShell and run cleanup script
```

**✅ After cleanup is complete, proceed to the deployment steps below.**

---

## Step-by-Step Deployment

**Start here after completing the cleanup steps above.**

### Step 1: Request EC2 Quota (if needed) ⏱️ 5 minutes

**Note:** If you already have EC2 instances running, you may skip this step.

**Check current quota:**
```bash
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-34B43A08 \
  --region us-east-1 \
  --query "Quota.Value" \
  --output text
```

**If quota is insufficient, request increase:**
```bash
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-34B43A08 \
  --desired-value 8 \
  --region us-east-1
```

**✅ Checkpoint:** Quota sufficient or increase requested

---

### Step 2: Create EC2 Instance ⏱️ 20 minutes

#### 2.1: Create Key Pair

```bash
# Create key pair for SSH access
aws ec2 create-key-pair \
  --key-name ctrlchecks-worker-key \
  --query 'KeyMaterial' \
  --output text > ctrlchecks-worker-key.pem

# Set correct permissions (Linux/Mac)
chmod 400 ctrlchecks-worker-key.pem

# Windows: Use PuTTYgen to convert .pem to .ppk if needed
```

**Save the key file securely!** You'll need it to SSH into the instance.

#### 2.2: Launch EC2 Instance

**Option A: Using AWS CLI**

```bash
# Get latest Ubuntu 22.04 AMI ID
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

# Create security group (we'll configure it in Step 3)
SG_ID=$(aws ec2 create-security-group \
  --group-name ctrlchecks-worker-sg \
  --description "Security group for CtrlChecks Worker" \
  --query 'GroupId' \
  --output text)

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.medium \
  --key-name ctrlchecks-worker-key \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ctrlchecks-worker}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instance ID: $INSTANCE_ID"
```

**Option B: Using AWS Console**

1. Go to **EC2 Dashboard** → **Launch Instance**
2. **Name**: `ctrlchecks-worker`
3. **AMI**: Ubuntu Server 22.04 LTS
4. **Instance Type**: t3.medium
5. **Key Pair**: Select `ctrlchecks-worker-key` (or create new)
6. **Network Settings**: Create new security group (we'll configure in Step 3)
7. **Storage**: 20 GB gp3
8. **Launch Instance**

**Wait for instance to be running:**
```bash
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
```

**✅ Checkpoint:** Instance running

---

### Step 3: Configure Security Groups ⏱️ 15 minutes

**Add inbound rules:**

```bash
# Get your current IP
MY_IP=$(curl -s ifconfig.me)

# Allow SSH from your IP
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32

# Allow HTTP (port 80) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow Worker API (port 3001) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0
```

**Verify security group:**
```bash
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query "SecurityGroups[0].IpPermissions" \
  --output table
```

**✅ Checkpoint:** Security group configured

---

### Step 4: Allocate Elastic IP ⏱️ 10 minutes

**Allocate Elastic IP:**
```bash
# Allocate Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --query 'AllocationId' \
  --output text)

# Get Elastic IP address
EIP=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOCATION_ID \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "Elastic IP: $EIP"

# Associate with instance
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOCATION_ID
```

**Verify association:**
```bash
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
# Should return your Elastic IP
```

**✅ Checkpoint:** Elastic IP assigned

---

### Step 5: Configure Route 53 DNS for worker.ctrlchecks.ai ⏱️ 10 minutes

**📝 IMPORTANT: You need to point `worker.ctrlchecks.ai` to your Elastic IP.**

**From Windows PowerShell (your local computer, NOT the server):**

```powershell
# Step 1: Get your Elastic IP address
# If you already have it, use it. Otherwise, find it:
$instanceId = "i-xxxxxxxxxxxxx"  # Replace with your instance ID
$eip = aws ec2 describe-instances `
  --instance-ids $instanceId `
  --query "Reservations[0].Instances[0].PublicIpAddress" `
  --output text

Write-Host "Your Elastic IP: $eip"

# Step 2: Get your Route 53 Hosted Zone ID
# Replace 'ctrlchecks.ai' with your domain
$hostedZoneId = aws route53 list-hosted-zones `
  --query "HostedZones[?Name=='ctrlchecks.ai.'] | [0].Id" `
  --output text

# Remove the '/hostedzone/' prefix
$hostedZoneId = $hostedZoneId -replace '/hostedzone/', ''

Write-Host "Your Hosted Zone ID: $hostedZoneId"

# Step 3: Create/Update A record for worker.ctrlchecks.ai
aws route53 change-resource-record-sets `
  --hosted-zone-id $hostedZoneId `
  --change-batch @{
    Changes = @(
      @{
        Action = "UPSERT"
        ResourceRecordSet = @{
          Name = "worker.ctrlchecks.ai"
          Type = "A"
          TTL = 300
          ResourceRecords = @(
            @{
              Value = $eip
            }
          )
        }
      }
    )
  } | ConvertTo-Json -Depth 10

Write-Host "DNS record created/updated!"
Write-Host "Wait 5-30 minutes for DNS to propagate..."
```

**📝 Alternative: Using AWS Console (Easier for beginners):**

1. Go to: **AWS Console → Route 53 → Hosted zones**
2. Click on: **ctrlchecks.ai**
3. Click: **Create record**
4. **Record name:** `worker`
5. **Record type:** `A`
6. **Value:** Paste your Elastic IP (e.g., `54.123.45.67`)
7. **TTL:** `300`
8. Click: **Create records**

**✅ Verify DNS is working:**

```powershell
# Wait 5-10 minutes, then test:
nslookup worker.ctrlchecks.ai

# Should show your Elastic IP address
```

**✅ Checkpoint:** DNS configured - `worker.ctrlchecks.ai` points to your Elastic IP

---

### Step 6: Deploy Worker Application ⏱️ 45 minutes

**📝 IMPORTANT: This is a FRESH INSTALL. If you have any existing files, they will be replaced.**

#### 6.1: Connect to Instance

```bash
# SSH into instance (use your Elastic IP or domain)
ssh -i ctrlchecks-worker-key.pem ubuntu@<YOUR_ELASTIC_IP>

# Example:
# ssh -i ctrlchecks-worker-key.pem ubuntu@54.123.45.67

# Or if using domain:
# ssh -i ctrlchecks-worker-key.pem ubuntu@worker.ctrlchecks.ai
```

**✅ Checkpoint:** Connected to instance. You should see: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

#### 6.2: Install Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher

# Install build tools
sudo apt-get install -y build-essential git

# Verify git is installed
git --version
```

**✅ Checkpoint:** Node.js 20 and build tools installed.

#### 6.3: Clean Existing Files and Clone New Repository

**⚠️ IMPORTANT: This will DELETE all existing files and start completely fresh.**

```bash
# ============================================
# STEP 1: STOP AND REMOVE OLD SERVICE
# ============================================
# Stop the old service (if it exists)
sudo systemctl stop ctrlchecks-worker 2>/dev/null || true
sudo systemctl disable ctrlchecks-worker 2>/dev/null || true

# Remove old systemd service file
sudo rm -f /etc/systemd/system/ctrlchecks-worker.service
sudo systemctl daemon-reload

# ============================================
# STEP 2: DELETE ALL OLD FILES
# ============================================
# Remove old application directory completely
sudo rm -rf /opt/ctrlchecks-worker

# Remove old Nginx configuration (if exists)
sudo rm -f /etc/nginx/sites-enabled/ctrlchecks-worker
sudo rm -f /etc/nginx/sites-available/ctrlchecks-worker

# ============================================
# STEP 3: CREATE FRESH DIRECTORY
# ============================================
# Create fresh application directory
sudo mkdir -p /opt/ctrlchecks-worker
sudo chown ubuntu:ubuntu /opt/ctrlchecks-worker
cd /opt/ctrlchecks-worker

# ============================================
# STEP 4: CLONE NEW REPOSITORY
# ============================================
# Clone the NEW repository (worker-002)
git clone https://github.com/servicepathtotechnologies-ops/worker-002.git .

# Verify you're in the right place
pwd
# Should show: /opt/ctrlchecks-worker

ls -la
# Should show: package.json, src/, worker/, etc.

# ============================================
# STEP 5: NAVIGATE TO WORKER DIRECTORY
# ============================================
# The repository structure may have a 'worker' subdirectory
# Check if worker directory exists
if [ -d "worker" ]; then
    cd worker
    echo "Navigated to worker subdirectory"
else
    echo "Already in worker directory"
fi

# Verify you're in the correct location
pwd
# Should show: /opt/ctrlchecks-worker/worker (if subdirectory exists)
# OR: /opt/ctrlchecks-worker (if root is the worker)

# Check for package.json
ls -la package.json
# Should show package.json file

# ============================================
# STEP 6: INSTALL DEPENDENCIES
# ============================================
# Install ALL dependencies (including dev dependencies for building)
npm install

# ============================================
# STEP 7: BUILD THE APPLICATION
# ============================================
# Build TypeScript to JavaScript
npm run build

# ============================================
# STEP 8: VERIFY BUILD SUCCEEDED
# ============================================
# Check if dist directory was created
ls -la dist/
# Should show: dist/index.js and other compiled files

# If build fails, check for errors:
# npm run build
```

**✅ Checkpoint:** Repository cloned, dependencies installed, and build completed successfully.

#### 6.4: Configure Environment Variables

**📝 IMPORTANT: You need to create the `.env` file with your actual credentials.**

```bash
# Make sure you're in the worker directory
pwd
# Should show: /opt/ctrlchecks-worker/worker (or /opt/ctrlchecks-worker)

# Check if env.example exists
ls -la env.example

# Copy environment template
cp env.example .env

# Edit environment file
nano .env
```

**📝 Copy and paste this into your `.env` file, then UPDATE with your actual values:**

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
# Get these from: https://app.supabase.com → Your Project → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Also support VITE_ prefix for shared .env files
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# FASTAPI OLLAMA CONFIGURATION
# ============================================
# Your FastAPI Ollama backend URL (if you have one)
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# ============================================
# WORKER SERVICE CONFIGURATION
# ============================================
# Port the worker runs on (don't change this)
PORT=3001

# Your public URL (use your Route 53 domain)
PUBLIC_BASE_URL=https://worker.ctrlchecks.ai

# Worker ID (can be any unique name)
WORKER_ID=worker-aws-1

# ============================================
# CORS CONFIGURATION (Frontend Connection)
# ============================================
# Allow your frontend to connect (update with your frontend URL)
CORS_ORIGIN=https://ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://*.vercel.app

# ============================================
# LOGGING AND PERFORMANCE
# ============================================
LOG_LEVEL=INFO
PROCESS_TIMEOUT_SECONDS=1800
MAX_RETRIES=3
```

**📝 How to fill in the values:**

1. **SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:**
   - Go to: https://app.supabase.com
   - Select your project
   - Go to: Settings → API
   - Copy "Project URL" → This is your `SUPABASE_URL`
   - Copy "service_role" key → This is your `SUPABASE_SERVICE_ROLE_KEY`

2. **PUBLIC_BASE_URL:**
   - Use: `https://worker.ctrlchecks.ai` (your Route 53 domain)

3. **CORS_ORIGIN:**
   - Use your frontend URL (e.g., `https://ctrlchecks.ai`)

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` (to confirm)
- Press `Enter` (to save)

**✅ Verify the file was created:**
```bash
cat .env
# Should show your environment variables
```

#### 6.5: Create Systemd Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/ctrlchecks-worker.service
```

**📝 IMPORTANT: First, check where your application is located:**

```bash
# Check current directory
pwd

# Check if dist/index.js exists
ls -la dist/index.js

# Note the FULL path to dist/index.js
# Example: /opt/ctrlchecks-worker/worker/dist/index.js
# OR: /opt/ctrlchecks-worker/dist/index.js
```

**Now create the systemd service file:**

```bash
sudo nano /etc/systemd/system/ctrlchecks-worker.service
```

**📝 Copy and paste this, then UPDATE the paths based on your actual location:**

**If your app is at `/opt/ctrlchecks-worker/worker/` (has worker subdirectory):**
```ini
[Unit]
Description=CtrlChecks Worker Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ctrlchecks-worker/worker
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/node /opt/ctrlchecks-worker/worker/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**OR if your app is directly at `/opt/ctrlchecks-worker/` (no subdirectory):**
```ini
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
```

**📝 How to know which one to use:**
- Run: `ls -la /opt/ctrlchecks-worker/`
- If you see a `worker` folder → Use the FIRST version (with `/worker` in path)
- If you see `package.json` directly → Use the SECOND version (no `/worker` in path)

**Save and exit**, then:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable ctrlchecks-worker

# Start service
sudo systemctl start ctrlchecks-worker

# Check status
sudo systemctl status ctrlchecks-worker
```

**✅ Checkpoint:** Worker service running

---

### Step 7: Set up SSL/HTTPS (Optional but Recommended) ⏱️ 30 minutes

**Option A: Using Nginx with Let's Encrypt**

> **📝 Note:** Even if you're using Route 53 for DNS, you still need Nginx on your EC2 instance. Route 53 only handles DNS resolution (domain → IP). Nginx handles SSL termination, reverse proxying, and security on the server itself.

```bash
# Install Nginx
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Add Nginx config (use `worker.ctrlchecks.ai` as your domain):**

```nginx
server {
    listen 80;
    server_name worker.ctrlchecks.ai;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Get SSL certificate:**
```bash
# Make sure DNS is working first (wait 10-30 minutes after Step 5)
# Test DNS:
nslookup worker.ctrlchecks.ai
# Should show your Elastic IP

# Get SSL certificate
sudo certbot --nginx -d worker.ctrlchecks.ai

# Follow the prompts:
# - Enter your email address
# - Agree to terms (type 'A' for Agree)
# - Choose whether to share email (type 'Y' or 'N')
# - Certbot will automatically configure SSL
```

**⚠️ Important:** If certbot modifies `/etc/nginx/sites-enabled/default` instead of your worker config, follow these steps to fix it:

```bash
# 1. Copy the SSL configuration from default to your worker config
# First, check what certbot added to default:
sudo grep -A 20 "server_name worker.ctrlchecks.ai" /etc/nginx/sites-enabled/default

# 2. Create/update the proper worker config file with SSL
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
```

**Add this complete SSL-enabled config:**

```nginx
upstream worker_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name worker.ctrlchecks.ai;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name worker.ctrlchecks.ai;

    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/worker.ctrlchecks.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/worker.ctrlchecks.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Request limits
    client_max_body_size 50M;
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://worker_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All API routes
    location / {
        proxy_pass http://worker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
# 3. Remove SSL config from default file (restore it to original state)
# IMPORTANT: Backup to sites-available (NOT sites-enabled) because nginx reads ALL files in sites-enabled
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.backup

# Remove the certbot-added server blocks for worker.ctrlchecks.ai from default
sudo nano /etc/nginx/sites-enabled/default
# Delete the two server blocks that contain "worker.ctrlchecks.ai"
# Keep only the original default_server block (the first one)

# 4. Ensure worker config is enabled
sudo ln -sf /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/ctrlchecks-worker

# 5. IMPORTANT: Remove any backup files from sites-enabled (nginx reads ALL files there)
sudo rm -f /etc/nginx/sites-enabled/*.backup

# 6. Test configuration
sudo nginx -t

# 7. If test passes, restart nginx
sudo systemctl restart nginx

# 8. Verify it works
curl https://worker.ctrlchecks.ai/health
```

**Option B: Using AWS Application Load Balancer (ALB)**

See AWS documentation for ALB setup with ACM certificate.

**✅ Checkpoint:** SSL configured (or skip if not needed)

---

## Post-Deployment

### Verify Deployment

```bash
# Test health endpoint
curl http://worker.ctrlchecks.ai:3001/health
# Or if using SSL:
curl https://worker.ctrlchecks.ai/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

### View Logs

```bash
# View service logs
sudo journalctl -u ctrlchecks-worker -f

# View last 100 lines
sudo journalctl -u ctrlchecks-worker -n 100
```

### Update Application (When You Have New Code)

**📝 How to update your backend when you push new code to GitHub:**

```bash
# ============================================
# STEP 1: CONNECT TO YOUR SERVER
# ============================================
# SSH into your server
ssh -i ctrlchecks-worker-key.pem ubuntu@worker.ctrlchecks.ai
# OR: ssh -i ctrlchecks-worker-key.pem ubuntu@YOUR_ELASTIC_IP

# ============================================
# STEP 2: NAVIGATE TO APPLICATION DIRECTORY
# ============================================
# Go to your application folder
cd /opt/ctrlchecks-worker

# If you have a 'worker' subdirectory, go into it:
if [ -d "worker" ]; then
    cd worker
fi

# Verify you're in the right place
pwd
ls -la package.json

# ============================================
# STEP 3: PULL LATEST CODE FROM GITHUB
# ============================================
# Get the latest code from your repository
git pull origin main

# ============================================
# STEP 4: UPDATE DEPENDENCIES (IF NEEDED)
# ============================================
# Install any new dependencies
npm install

# ============================================
# STEP 5: REBUILD THE APPLICATION
# ============================================
# Build the new code
npm run build

# Verify build succeeded
ls -la dist/index.js

# ============================================
# STEP 6: RESTART THE SERVICE
# ============================================
# Restart the backend service
sudo systemctl restart ctrlchecks-worker

# ============================================
# STEP 7: VERIFY IT'S RUNNING
# ============================================
# Check service status
sudo systemctl status ctrlchecks-worker

# View recent logs to make sure there are no errors
sudo journalctl -u ctrlchecks-worker -n 50 --no-pager

# Test the health endpoint
curl http://localhost:3001/health
```

**✅ Done! Your backend is now updated with the latest code.**

**📝 Quick Update Script (Optional):**

You can save this as `update-worker.sh` on your server for faster updates:

```bash
#!/bin/bash
# Save this as: /opt/ctrlchecks-worker/update-worker.sh

cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Restarting service..."
sudo systemctl restart ctrlchecks-worker

echo "Checking status..."
sudo systemctl status ctrlchecks-worker --no-pager -l

echo "✅ Update complete!"
```

**Make it executable and use it:**
```bash
# Create the script
nano /opt/ctrlchecks-worker/update-worker.sh
# Paste the script above, save it

# Make it executable
chmod +x /opt/ctrlchecks-worker/update-worker.sh

# Use it next time:
sudo /opt/ctrlchecks-worker/update-worker.sh
```

---

## Troubleshooting

### Issue: Cannot connect via SSH

**Check:**
1. Security group allows SSH from your IP
2. Instance is running
3. Using correct key file
4. Correct username (ubuntu)

**Solution:**
```bash
# Update security group with your current IP
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32
```

### Issue: Service not starting

**Check logs:**
```bash
sudo journalctl -u ctrlchecks-worker -n 50
```

**Common issues:**
- Missing environment variables
- Port already in use
- Build errors

**Solution:**
```bash
# Check if port is in use
sudo netstat -tlnp | grep 3001

# Check environment file (adjust path based on your setup)
cat /opt/ctrlchecks-worker/worker/.env

# Check service logs for errors
sudo journalctl -u ctrlchecks-worker -n 50 --no-pager

# Restart service
sudo systemctl restart ctrlchecks-worker

# Check service status
sudo systemctl status ctrlchecks-worker
```

### Issue: Nginx Configuration Conflicts (conflicting server name warnings)

**Symptoms:**
- `nginx -t` shows warnings like: `conflicting server name "worker.ctrlchecks.ai" on 0.0.0.0:80, ignored`
- Certbot modified `/etc/nginx/sites-enabled/default` instead of your worker config
- HTTPS works but returns 404 for API endpoints

**Cause:**
Certbot detected the domain in the default nginx config and added SSL configuration there, creating duplicate server blocks.

**Solution:**
```bash
# 1. IMPORTANT: Remove any backup files from sites-enabled (nginx reads ALL files there!)
sudo rm -f /etc/nginx/sites-enabled/*.backup

# 2. Check what configs are enabled
ls -la /etc/nginx/sites-enabled/

# 3. Create proper worker config with SSL (see SSL setup section above)
sudo nano /etc/nginx/sites-available/ctrlchecks-worker
# Add the complete SSL-enabled configuration from worker/nginx/ctrlchecks-worker-ssl.conf

# 4. Remove worker.ctrlchecks.ai server blocks from default file
sudo nano /etc/nginx/sites-enabled/default
# Remove all server blocks containing "worker.ctrlchecks.ai"
# Keep only the original default_server block (the first one)

# 5. Ensure worker config is enabled
sudo ln -sf /etc/nginx/sites-available/ctrlchecks-worker /etc/nginx/sites-enabled/ctrlchecks-worker

# 6. Test configuration
sudo nginx -t

# 7. If test passes (no errors), restart nginx
sudo systemctl restart nginx

# 8. Verify endpoints work
curl https://worker.ctrlchecks.ai/health
```

**Quick fix script:**
```bash
# IMPORTANT: Remove backup files from sites-enabled first!
sudo rm -f /etc/nginx/sites-enabled/*.backup

# Backup default config to sites-available (NOT sites-enabled)
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.backup

# Remove worker.ctrlchecks.ai blocks from default (keep only the original default server)
sudo sed -i '/server_name worker.ctrlchecks.ai/,/^}$/d' /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t && sudo systemctl restart nginx
```

### Issue: "duplicate default server" Error

**Symptoms:**
- `nginx -t` shows: `a duplicate default server for 0.0.0.0:80 in /etc/nginx/sites-enabled/default.backup:22`
- Nginx fails to start
- Error mentions a `.backup` file

**Cause:**
Nginx reads **ALL files** in `/etc/nginx/sites-enabled/`, including backup files. If you created a backup file there, nginx tries to load it and finds duplicate server configurations.

**Solution:**
```bash
# 1. Remove ALL backup files from sites-enabled
sudo rm -f /etc/nginx/sites-enabled/*.backup

# 2. If you need a backup, move it to sites-available or /tmp
sudo mv /etc/nginx/sites-enabled/*.backup /tmp/ 2>/dev/null || true

# 3. Verify only config files remain in sites-enabled
ls -la /etc/nginx/sites-enabled/
# Should only see: default and ctrlchecks-worker (symlink)

# 4. Test configuration
sudo nginx -t

# 5. If test passes, restart nginx
sudo systemctl restart nginx
```

**Prevention:**
Always backup to `/etc/nginx/sites-available/` or `/tmp/`, never to `sites-enabled/`:
```bash
# ✅ Correct
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default.backup

# ❌ Wrong (nginx will read this!)
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
```

### Issue: EC2 Instance Status Check Failed (2/3 checks passed)

**This indicates the instance status check is failing, which means there's an issue at the OS/application level.**

**Common Causes:**
- System overloaded (high CPU/memory usage)
- Out of disk space
- Network connectivity issues
- Kernel or system service problems
- Application crashes causing system instability

**Diagnostic Steps:**

**1. Check Instance Status Details:**
```bash
# From Windows Terminal (PowerShell)
aws ec2 describe-instance-status `
  --instance-ids i-xxxxxxxxxxxxx `
  --query "InstanceStatuses[0].[InstanceStatus.Status,SystemStatus.Status]" `
  --output table

# Get detailed status
aws ec2 describe-instance-status `
  --instance-ids i-xxxxxxxxxxxxx `
  --include-all-instances
```

**2. Access Instance System Log:**
```bash
# Get system log (last 64KB)
aws ec2 get-console-output `
  --instance-id i-xxxxxxxxxxxxx `
  --latest `
  --output text > instance-log.txt

# View the log file
cat instance-log.txt
```

**3. SSH into Instance and Check System Health:**
```bash
# SSH into the instance
ssh -i ctrlchecks-worker-key.pem ubuntu@<INSTANCE_IP>

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20

# Check system load
uptime

# Check for errors in system logs
sudo journalctl -p err -n 50

# Check if service is running
sudo systemctl status ctrlchecks-worker
```

**4. Common Fixes:**

**If disk space is full:**
```bash
# Check what's using space
sudo du -sh /* 2>/dev/null | sort -h

# Clean up old logs
sudo journalctl --vacuum-time=7d

# Remove old packages
sudo apt-get autoremove -y
sudo apt-get autoclean

# Check for large files
sudo find / -type f -size +100M 2>/dev/null
```

**If memory is exhausted:**
```bash
# Check what's using memory
ps aux --sort=-%mem | head -10

# Restart the worker service
sudo systemctl restart ctrlchecks-worker

# If needed, restart the instance
sudo reboot
```

**If service is crashing:**
```bash
# Check service logs
sudo journalctl -u ctrlchecks-worker -n 100 --no-pager

# Check for port conflicts
sudo netstat -tlnp | grep 3001

# Restart service
sudo systemctl restart ctrlchecks-worker
```

**5. Reboot Instance (if other fixes don't work):**
```bash
# From Windows Terminal
aws ec2 reboot-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for reboot (2-3 minutes)
aws ec2 wait instance-status-ok --instance-ids i-xxxxxxxxxxxxx
```

**6. If Status Check Still Fails After Reboot:**

The issue might be more serious. Consider:
- **Stop and Start** the instance (not reboot) - this moves it to new hardware
- **Check CloudWatch metrics** for CPU, memory, network issues
- **Review instance screenshot** in AWS Console (EC2 → Instances → Your instance → Monitoring → Get instance screenshot)
- **Consider recreating** the instance if the problem persists

**To Stop and Start (moves to new hardware):**
```powershell
# Stop instance
aws ec2 stop-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for stopped
aws ec2 wait instance-stopped --instance-ids i-xxxxxxxxxxxxx

# Start instance
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for running
aws ec2 wait instance-running --instance-ids i-xxxxxxxxxxxxx

# Wait for status checks
aws ec2 wait instance-status-ok --instance-ids i-xxxxxxxxxxxxx
```

### Issue: Cannot connect to FastAPI Ollama

**Check:**
```bash
# Test connection from Worker instance
curl http://ollama.ctrlchecks.ai:8000/health
```

**If fails:**
1. Verify FastAPI is running
2. Check DNS resolution: `nslookup ollama.ctrlchecks.ai`
3. Check security groups allow outbound traffic

---

## Cost Summary

### Monthly Costs (US East - N. Virginia)

| Service | Cost | Notes |
|---------|------|-------|
| **EC2 (t3.medium)** | ~$30 | 24/7 running |
| **Elastic IP** | $0 | Free when attached |
| **EBS Storage (20GB)** | ~$2 | GP3 storage |
| **Data Transfer** | ~$5-10 | Varies by usage |
| **Total** | **~$37-42/month** | |

### Cost Optimization

1. **Use Reserved Instances** (save up to 72%)
2. **Stop instance when not in use** (saves compute)
3. **Use smaller instance** (t3.small) if traffic is low

---

## Quick Reference

### Important Commands

```bash
# Service management
sudo systemctl status ctrlchecks-worker
sudo systemctl restart ctrlchecks-worker
sudo systemctl stop ctrlchecks-worker
sudo systemctl start ctrlchecks-worker

# View logs
sudo journalctl -u ctrlchecks-worker -f

# Health check
curl https://api.ctrlchecks.ai/health
```

### Important IDs

```bash
# Save these for reference
INSTANCE_ID="i-xxxxxxxxxxxxx"
SG_ID="sg-xxxxxxxxx"
EIP="54.123.45.67"
ALLOCATION_ID="eipalloc-xxxxxxxxx"
```

---

## 📋 COMPLETE DEPLOYMENT SUMMARY

### ✅ What You've Accomplished:

1. **✅ Cleaned old server files** (if you had a previous deployment)
2. **✅ Deployed new code** from `https://github.com/servicepathtotechnologies-ops/worker-002.git`
3. **✅ Configured environment variables** (Supabase, CORS, etc.)
4. **✅ Set up systemd service** (keeps backend running automatically)
5. **✅ Configured Route 53 DNS** (`worker.ctrlchecks.ai` → Your Elastic IP)
6. **✅ Set up SSL/HTTPS** (secure connection)

### 🔗 Your Backend URLs:

- **HTTP:** `http://worker.ctrlchecks.ai:3001`
- **HTTPS:** `https://worker.ctrlchecks.ai`
- **Health Check:** `https://worker.ctrlchecks.ai/health`

### 🔌 How to Connect Frontend to Backend:

**In your frontend code (React/Vue/etc.), use this base URL:**

```javascript
// Base URL for all API calls
const API_BASE_URL = 'https://worker.ctrlchecks.ai';

// Example API call
fetch(`${API_BASE_URL}/health`)
  .then(response => response.json())
  .then(data => console.log(data));

// Example: Generate workflow
fetch(`${API_BASE_URL}/api/generate-workflow`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Your workflow prompt here'
  })
});
```

### 🛠️ How to Keep Backend Running:

**The backend runs automatically via systemd service:**
- ✅ Starts when server boots
- ✅ Restarts if it crashes
- ✅ Runs 24/7 in the background

**Useful commands:**
```bash
# Check if backend is running
sudo systemctl status ctrlchecks-worker

# Restart backend
sudo systemctl restart ctrlchecks-worker

# View logs
sudo journalctl -u ctrlchecks-worker -f

# Stop backend (if needed)
sudo systemctl stop ctrlchecks-worker

# Start backend
sudo systemctl start ctrlchecks-worker
```

### 🔄 How to Update Backend (When You Push New Code):

**Simple 3-step process:**

```bash
# 1. Connect to server
ssh -i your-key.pem ubuntu@worker.ctrlchecks.ai

# 2. Update code
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker
git pull origin main
npm install
npm run build

# 3. Restart service
sudo systemctl restart ctrlchecks-worker
```

### 🐛 Troubleshooting Quick Reference:

**Backend not responding?**
```bash
# Check service status
sudo systemctl status ctrlchecks-worker

# Check logs for errors
sudo journalctl -u ctrlchecks-worker -n 50

# Test locally
curl http://localhost:3001/health
```

**DNS not working?**
```bash
# Test DNS resolution
nslookup worker.ctrlchecks.ai

# Should show your Elastic IP
```

**SSL certificate issues?**
```bash
# Renew certificate
sudo certbot renew

# Test Nginx config
sudo nginx -t
```

---

## Next Steps

After successful deployment:

1. **✅ Test your backend** - Visit `https://worker.ctrlchecks.ai/health`
2. **✅ Connect frontend** - Update frontend to use `https://worker.ctrlchecks.ai`
3. **✅ Configure monitoring** (CloudWatch) - Optional
4. **✅ Set up backups** (EBS snapshots) - Optional
5. **✅ Set up auto-scaling** (if needed) - Optional

---

**🎉 Congratulations! Your Worker service is deployed on AWS!**

**Your backend is now:**
- ✅ Running 24/7
- ✅ Accessible at `https://worker.ctrlchecks.ai`
- ✅ Automatically restarts if it crashes
- ✅ Ready to connect to your frontend

**Next:** Update your frontend to use `https://worker.ctrlchecks.ai` as the API base URL.
