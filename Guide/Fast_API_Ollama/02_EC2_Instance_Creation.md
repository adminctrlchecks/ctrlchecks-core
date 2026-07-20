# EC2 Instance Creation Guide

This guide will walk you through creating an EC2 instance for your FastAPI Ollama service on AWS.

## Table of Contents
1. [Understanding EC2](#understanding-ec2)
2. [Choosing Instance Type](#choosing-instance-type)
3. [Creating EC2 Instance via Console](#creating-ec2-instance-via-console)
4. [Creating EC2 Instance via AWS CLI](#creating-ec2-instance-via-aws-cli)
5. [Connecting to Your Instance](#connecting-to-your-instance)
6. [Verifying Instance Setup](#verifying-instance-setup)
7. [Next Steps](#next-steps)

---

## Understanding EC2

### What is EC2?

**EC2 (Elastic Compute Cloud)** is AWS's virtual server service. Think of it as renting a computer in the cloud.

### Key Concepts

- **Instance:** A virtual server
- **AMI (Amazon Machine Image):** A template for your instance (like an OS image)
- **Instance Type:** The hardware configuration (CPU, RAM, GPU)
- **Security Group:** Firewall rules for your instance
- **Key Pair:** SSH credentials to access your instance
- **Elastic IP:** A static IP address that doesn't change

---

## Choosing Instance Type

### Recommended Instance for FastAPI Ollama

**Instance Type: `g4dn.xlarge`**

**Specifications:**
- **vCPUs:** 4
- **RAM:** 16 GB
- **GPU:** NVIDIA T4 (16 GB GPU memory)
- **Network:** Up to 25 Gbps
- **Storage:** 125 GB NVMe SSD
- **Cost:** ~$0.526/hour (~$350/month)

**Why this instance?**
- ✅ GPU support for Ollama models (16GB GPU memory)
- ✅ Sufficient RAM for model loading (16GB RAM)
- ✅ Enough VRAM for 2 production models (~12.5GB total)
- ✅ Good balance of cost and performance
- ✅ Optimized for: qwen2.5:14b-instruct-q4_K_M + qwen2.5-coder:7b-instruct-q4_K_M

### Alternative Instance Types

| Instance Type | vCPU | RAM | GPU | Cost/Month | Use Case |
|--------------|------|-----|-----|------------|----------|
| `g4dn.xlarge` | 4 | 16 GB | T4 | ~$350 | ✅ **Recommended** |
| `g4dn.2xlarge` | 8 | 32 GB | T4 | ~$700 | Higher performance |
| `g5.xlarge` | 4 | 16 GB | A10G | ~$1,000 | Latest GPU |
| `t3.medium` | 2 | 4 GB | None | ~$30 | CPU-only (not recommended) |

**⚠️ Note:** For Ollama with GPU acceleration, you need a GPU instance (g4dn or g5 series).

---

## Creating EC2 Instance via Console

### Step 1: Access EC2 Console

1. **Log in to AWS Console**
   - Go to: https://console.aws.amazon.com/
   - Sign in with your credentials

2. **Navigate to EC2**
   - Search for "EC2" in the top search bar
   - Click on "EC2" service

3. **Select Region**
   - Ensure you're in **US East (N. Virginia) - us-east-1**
   - Check top-right corner

### Step 2: Create Key Pair (First Time Only)

**⚠️ Important:** You need a key pair to SSH into your instance.

1. **Go to Key Pairs**
   - In the left menu, scroll down to "Network & Security"
   - Click "Key pairs"

2. **Create Key Pair**
   - Click "Create key pair" button
   - **Name:** `ctrlchecks-ollama-key.pem`
   - **Key pair type:** RSA
   - **Private key file format:** `.pem` (for Linux/Mac) or `.ppk` (for Windows PuTTY)
   - Click "Create key pair"

3. **Download Key**
   - The `.pem` file will download automatically
   - **⚠️ Save this file securely!** You cannot download it again.
   - Store it in a safe location (e.g., `C:\Users\User\.ssh\ctrlchecks-ollama-key.pem`)

### Step 3: Launch EC2 Instance

1. **Launch Instance**
   - Click "Launch instance" button (orange button, top right)
   - Or click "Instances" → "Launch instance"

2. **Name Your Instance**
   - **Name:** `ctrlchecks-fastapi-ollama`
   - **Description:** `FastAPI Ollama Service for CtrlChecks`

3. **Choose AMI (Amazon Machine Image)**
   - **Application and OS Images:** Ubuntu
   - **Version:** Ubuntu Server 22.04 LTS ✅
   - **Architecture:** 64-bit (x86)
   - **⚠️ Important:** Make sure it's a GPU-optimized AMI if available, or use Deep Learning AMI

   **Recommended AMI IDs (us-east-1):**
   - **Ubuntu 22.04 LTS:** `ami-0c55b159cbfafe1f0` (check current AMI ID)
   - **Deep Learning AMI (Ubuntu):** Search for "Deep Learning AMI GPU" in AMI catalog

4. **Choose Instance Type**
   - Click "Instance type" dropdown
   - Search for: `g4dn.xlarge`
   - Select it ✅
   - **Cost:** ~$0.526/hour displayed

5. **Create or Select Key Pair**
   - **Key pair name:** Select `ctrlchecks-ollama-key` (the one you created)
   - **⚠️ Important:** You must select a key pair to access your instance

6. **Network Settings**
   - **VPC:** Default VPC (or create new if needed)
   - **Subnet:** Default subnet
   - **Auto-assign Public IP:** Enable ✅
   - **Firewall (security group):** Create security group
     - **Security group name:** `ctrlchecks-ollama-sg`
     - **Description:** `Security group for FastAPI Ollama service`
     - **Inbound rules:**
       - **SSH (22):** My IP ✅ (for initial access)
       - **HTTP (80):** Anywhere-IPv4 ✅ (for web access)
       - **HTTPS (443):** Anywhere-IPv4 ✅ (for HTTPS)
       - **Custom TCP (8000):** Anywhere-IPv4 ✅ (FastAPI port)
       - **Custom TCP (11434):** 127.0.0.1/32 ✅ (Ollama - local only)

   **⚠️ Security Note:** For production, restrict SSH to your IP only!

7. **Configure Storage**
   - **Volume type:** gp3 (General Purpose SSD)
   - **Size:** 50 GB ✅ (minimum, increase if storing many models)
   - **Delete on termination:** Uncheck if you want to keep data ✅
   - Click "Add new volume" if you need more storage

8. **Advanced Details - User Data Script (Recommended for Automated Setup)**

   **Option A: Automated Setup (Recommended)**
   
   Scroll down to "Advanced details" section:
   - **IAM instance profile:** None (we'll create this later if needed)
   - **User data:** Select "As text" and paste the user data script
   
   **To get the user data script:**
   ```bash
   # On your local machine, read the script:
   cat infrastructure/scripts/ollama-user-data.sh
   ```
   
   **Or copy from file:** `infrastructure/scripts/ollama-user-data.sh`
   
   **What the script does:**
   - Installs Python 3.11, Ollama, and dependencies
   - Clones your repository: `https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git`
   - Sets up FastAPI service automatically
   - Pulls production models (qwen2.5:14b-instruct-q4_K_M, qwen2.5-coder:7b-instruct-q4_K_M)
   - Configures systemd services
   
   **⚠️ Important:** The script will automatically clone and deploy your application!
   
   **Option B: Manual Setup**
   
   Leave "User data" empty if you want to configure manually after instance launch.
   You'll follow the manual deployment steps in [06_Application_Deployment.md](./06_Application_Deployment.md).

9. **Review and Launch**
   - Click "Launch instance" button
   - Review the summary
   - Click "Launch instance"

10. **Instance Launching**
    - You'll see "Successfully initiated launch"
    - Click "View all instances"
    - Your instance will show "Pending" → "Initializing" → "Running"

### Step 4: Wait for Instance to Start

1. **Monitor Instance Status**
   - In EC2 Console → Instances
   - Wait for "Instance state" to show "Running" ✅
   - Wait for "Status checks" to show "2/2 checks passed" ✅
   - This takes 1-3 minutes

2. **Note Your Instance Details**
   - **Instance ID:** `i-xxxxxxxxxxxxx` (copy this)
   - **Public IPv4 address:** `x.x.x.x` (copy this - you'll need it)
   - **Private IPv4 address:** `10.x.x.x` (note this)

---

## Creating EC2 Instance via AWS CLI

**Alternative method:** If you prefer command line or want to automate.

### Step 1: Create Security Group First

```bash
# Get your VPC ID
aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text

# Save VPC ID (replace with your VPC ID)
VPC_ID="vpc-xxxxxxxxx"

# Create security group
aws ec2 create-security-group \
  --group-name ctrlchecks-ollama-sg \
  --description "Security group for FastAPI Ollama service" \
  --vpc-id $VPC_ID

# Save Security Group ID from output
SG_ID="sg-xxxxxxxxx"

# Add inbound rules
# SSH from your IP (replace with your IP)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# HTTP
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# FastAPI port
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0
```

### Step 2: Launch Instance

```bash
# Set variables
KEY_NAME="ctrlchecks-ollama-key"
SG_ID="sg-xxxxxxxxx"  # From previous step
AMI_ID="ami-0c55b159cbfafe1f0"  # Ubuntu 22.04 LTS (verify current AMI ID)

# Launch instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type g4dn.xlarge \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ctrlchecks-fastapi-ollama}]' \
  --user-data file://infrastructure/scripts/ollama-user-data.sh

# Note the InstanceId from output
INSTANCE_ID="i-xxxxxxxxxxxxx"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
```

---

## Connecting to Your Instance

### Windows (Using PowerShell)

1. **Open PowerShell**
   - Press `Win + X` → Select "Windows PowerShell" or "Terminal"

2. **Navigate to Key Location**
   ```powershell
   cd C:\Users\User\.ssh
   # Or wherever you saved your .pem file
   ```

3. **Set Permissions (One-time)**
   ```powershell
   icacls.exe ctrlchecks-ollama-key.pem /inheritance:r
   icacls.exe ctrlchecks-ollama-key.pem /grant:r "$($env:USERNAME):(R)"
   ```

4. **Connect via SSH**
   ```powershell
   ssh -i ctrlchecks-ollama-key.pem ubuntu@YOUR_PUBLIC_IP
   ```
   
   Replace `YOUR_PUBLIC_IP` with your instance's public IP address.

5. **Accept Host Key**
   - Type `yes` when prompted
   - You should see: `Welcome to Ubuntu 22.04 LTS...`

### Mac/Linux

```bash
# Navigate to key location
cd ~/.ssh

# Set permissions
chmod 400 ctrlchecks-ollama-key.pem

# Connect
ssh -i ctrlchecks-ollama-key.pem ubuntu@YOUR_PUBLIC_IP
```

### Using AWS Systems Manager Session Manager (No SSH Key Needed)

**Alternative method** - if you don't want to manage SSH keys:

1. **Install Session Manager Plugin**
   - Follow: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

2. **Connect**
   ```bash
   aws ssm start-session --target i-xxxxxxxxxxxxx
   ```

---

## Verifying Instance Setup

### Step 1: Check System Information

```bash
# Check Ubuntu version
lsb_release -a

# Check CPU
lscpu

# Check RAM
free -h

# Check disk space
df -h

# Check GPU (if available)
nvidia-smi
```

### Step 2: Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim
```

### Step 3: Verify Network Access

```bash
# Check public IP
curl ifconfig.me

# Check internet connectivity
ping -c 4 google.com
```

---

## Next Steps

Now that your EC2 instance is running:

1. **[03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)** - Configure security groups properly
2. **[04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)** - Assign a static IP address
3. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - Deploy your FastAPI Ollama application

---

## Common Issues & Solutions

### Issue: "Permission denied (publickey)"

**Solution:**
- Verify you're using the correct key file
- Check key file permissions: `chmod 400 key.pem` (Linux/Mac)
- Ensure you're connecting as `ubuntu` user (not `root` or `ec2-user`)
- Verify the key pair name matches in AWS Console

### Issue: "Connection timeout"

**Solution:**
- Check security group allows SSH (port 22) from your IP
- Verify instance is running and status checks passed
- Check your firewall/network isn't blocking port 22
- Try connecting from a different network

### Issue: "No GPU detected"

**Solution:**
- Verify instance type is `g4dn.xlarge` or similar GPU instance
- Check AMI supports GPU (use Deep Learning AMI if needed)
- Install NVIDIA drivers: `sudo apt install nvidia-driver-535`
- Reboot instance after driver installation

### Issue: Instance stops unexpectedly

**Solution:**
- Check CloudWatch logs for errors
- Verify instance has sufficient storage
- Check if you hit AWS service limits
- Review billing to ensure account is in good standing

---

## Cost Management

### Monitor Costs

```bash
# Get instance cost estimate
aws pricing get-products \
  --service-code AmazonEC2 \
  --filters "Type=TERM_MATCH,Field=instanceType,Value=g4dn.xlarge" \
            "Type=TERM_MATCH,Field=location,Value=US East (N. Virginia)" \
  --query "PriceList[0]" \
  --output json
```

### Stop Instance When Not in Use

```bash
# Stop instance (saves compute costs, but you pay for storage)
aws ec2 stop-instances --instance-ids i-xxxxxxxxxxxxx

# Start instance
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxx
```

**⚠️ Note:** Stopping instance releases the public IP unless you have an Elastic IP!

---

## Security Checklist

- ✅ Created key pair and saved securely
- ✅ Security group restricts SSH to your IP
- ✅ Instance is in a VPC
- ✅ Regular security updates applied
- ✅ No sensitive data in user data scripts
- ✅ IAM roles configured (if needed)

---

**✅ You've created your EC2 instance!**

Proceed to: [Security Groups Setup](./03_Security_Groups_Setup.md)
