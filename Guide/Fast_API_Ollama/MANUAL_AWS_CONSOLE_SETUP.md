# Manual AWS Console Setup Guide

**Complete step-by-step guide for setting up FastAPI Ollama using AWS Console (no CLI required)**

Perfect for users who prefer to work through the AWS web interface manually.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Request Quota Increase](#step-1-request-quota-increase)
3. [Step 2: Create Key Pair](#step-2-create-key-pair)
4. [Step 3: Create Security Group](#step-3-create-security-group)
5. [Step 4: Launch EC2 Instance](#step-4-launch-ec2-instance)
6. [Step 5: Allocate Elastic IP](#step-5-allocate-elastic-ip)
7. [Step 6: Configure Route 53 DNS](#step-6-configure-route-53-dns)
8. [Step 7: Connect to Instance](#step-7-connect-to-instance)
9. [Step 8: Deploy Application](#step-8-deploy-application)
10. [Step 9: Test Your Service](#step-9-test-your-service)

---

## Prerequisites

Before starting:

- ✅ AWS account created and logged in
- ✅ Domain name: `ctrlchecks.ai` (registered)
- ✅ GitHub repository: https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git
- ✅ Browser access to AWS Console
- ✅ PowerShell or terminal for SSH access

---

## Step 1: Request Quota Increase

**⚠️ CRITICAL:** GPU instances require quota increases! Do this FIRST!

### 1.1 Access Service Quotas

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/
   - Sign in

2. **Search for Service Quotas**
   - Click the search bar at the top
   - Type: `Service Quotas`
   - Click on "Service Quotas"

3. **Select Region**
   - Top-right corner, select your region
   - **Recommended:** US East (N. Virginia) - `us-east-1`
   - Or your preferred region

### 1.2 Find GPU Instance Quota

1. **Click "AWS services"** in left menu

2. **Search for EC2**
   - Type: `EC2` in search box
   - Click on "Amazon Elastic Compute Cloud (EC2)"

3. **Search for GPU Quota**
   - In the search box, type: `GPU`
   - Find: **"On-Demand EC2 instances - GPU instances"**
   - Click on it

4. **View Current Limit**
   - **Current quota value:** Should show `0` (or your current limit)
   - This is why you need to request an increase!

### 1.3 Request Quota Increase

1. **Click "Request quota increase"** button (top right)

2. **Fill Out Form:**
   - **Quota:** Already selected (GPU instances)
   - **Region:** Select your region (e.g., US East (N. Virginia))
   - **Change quota value to:** Enter `16` (allows 4x g4dn.xlarge instances)
   - **Use case description:** Enter:
     ```
     Deploying FastAPI Ollama service for AI/ML workloads.
     Need GPU instances (g4dn.xlarge) to run Ollama models with GPU acceleration.
     Service: CtrlChecks AI Backend
     Domain: ctrlchecks.ai
     Expected usage: Production workload with 24/7 availability
     ```

3. **Click "Request"**

4. **Note Your Request**
   - You'll see: "Your request has been submitted"
   - **Request ID:** Note this down (e.g., `req-xxxxxxxxx`)

5. **Check Status**
   - Go to "Request history" in left menu
   - Find your request
   - Status will show: **Pending** → **Approved** (usually 24-48 hours)

**✅ Checkpoint:** Quota increase requested

**⚠️ Note:** You can continue with other steps while waiting for approval, but you won't be able to launch the GPU instance until approved.

---

## Step 2: Create Key Pair

**For SSH access to your EC2 instance**

### 2.1 Access EC2 Console

1. **Search for EC2**
   - Type: `EC2` in search bar
   - Click on "EC2"

2. **Select Region**
   - Top-right, ensure correct region selected

### 2.2 Create Key Pair

1. **Navigate to Key Pairs**
   - Left menu, scroll to "Network & Security"
   - Click "Key pairs"

2. **Create Key Pair**
   - Click orange "Create key pair" button (top right)

3. **Configure Key Pair:**
   - **Name:** `ctrlchecks-ollama-key`
   - **Key pair type:** RSA ✅
   - **Private key file format:** 
     - **Windows:** `.pem` ✅
     - **Mac/Linux:** `.pem` ✅
   - Click "Create key pair"

4. **Download Key**
   - File will download automatically
   - **⚠️ SAVE THIS FILE SECURELY!**
   - Store in: `C:\Users\User\.ssh\ctrlchecks-ollama-key.pem`
   - You cannot download it again!

**✅ Checkpoint:** Key pair created and saved

---

## Step 3: Create Security Group

**Firewall rules for your instance**

### 3.1 Access Security Groups

1. **In EC2 Console**
   - Left menu, "Network & Security"
   - Click "Security groups"

### 3.2 Create Security Group

1. **Click "Create security group"** (orange button, top right)

2. **Basic Details:**
   - **Security group name:** `ctrlchecks-ollama-sg`
   - **Description:** `Security group for FastAPI Ollama service - allows HTTP, HTTPS, and FastAPI access`
   - **VPC:** Select your VPC (usually "default vpc" or only option)

### 3.3 Add Inbound Rules

Click "Add rule" for each rule below:

**Rule 1: SSH**
- **Type:** SSH
- **Protocol:** TCP
- **Port range:** 22
- **Source:** 
  - Click dropdown → Select "My IP" ✅
  - Or select "Custom" and enter your IP: `YOUR_IP/32`
- **Description:** `SSH access from my IP`

**Rule 2: HTTP**
- **Type:** HTTP
- **Protocol:** TCP
- **Port range:** 80
- **Source:** Anywhere-IPv4 (`0.0.0.0/0`) ✅
- **Description:** `HTTP web access`

**Rule 3: HTTPS**
- **Type:** HTTPS
- **Protocol:** TCP
- **Port range:** 443
- **Source:** Anywhere-IPv4 (`0.0.0.0/0`) ✅
- **Description:** `HTTPS secure web access`

**Rule 4: FastAPI Port**
- **Type:** Custom TCP
- **Protocol:** TCP
- **Port range:** 8000
- **Source:** Anywhere-IPv4 (`0.0.0.0/0`) ✅
- **Description:** `FastAPI Ollama service`

**Rule 5: Ollama (Local Only)**
- **Type:** Custom TCP
- **Protocol:** TCP
- **Port range:** 11434
- **Source:** Custom → Enter: `127.0.0.1/32` ✅
- **Description:** `Ollama service - localhost only`

### 3.4 Outbound Rules

- Leave default: **All traffic** ✅
- Or restrict if needed

### 3.5 Create Security Group

1. **Click "Create security group"** (bottom right)

2. **Note Security Group ID**
   - You'll see: `sg-xxxxxxxxx`
   - Copy this for later

**✅ Checkpoint:** Security group created

---

## Step 4: Launch EC2 Instance

**Create your EC2 instance**

### 4.1 Access Launch Instance

1. **In EC2 Console**
   - Click "Instances" in left menu
   - Click orange "Launch instance" button (top right)

### 4.2 Configure Instance

**Name and Tags:**
- **Name:** `ctrlchecks-fastapi-ollama`
- **Description:** `FastAPI Ollama Service for CtrlChecks`

**Application and OS Images (Amazon Machine Image):**
- Click "Browse more AMIs"
- **Search for:** `Ubuntu Server 22.04 LTS`
- Select: **Ubuntu Server 22.04 LTS** ✅
- **Architecture:** 64-bit (x86)
- **⚠️ Note:** For GPU instances, you might want "Deep Learning AMI" but Ubuntu works fine

**Instance Type:**
- Click "Instance type" dropdown
- **Search for:** `g4dn.xlarge`
- Select: **g4dn.xlarge** ✅
- **Specifications shown:**
  - 4 vCPU
  - 16 GB RAM
  - NVIDIA T4 GPU
  - ~$0.526/hour (~$350/month)

**⚠️ If g4dn.xlarge not available:**
- Your quota increase may not be approved yet
- Wait for approval (check Step 1)
- Or use `t3.medium` for testing (no GPU)

**Key Pair:**
- **Key pair name:** Select `ctrlchecks-ollama-key` (from Step 2) ✅
- **⚠️ Must select a key pair!**

**Network Settings:**
- **VPC:** Default VPC (or your VPC)
- **Subnet:** Default subnet
- **Auto-assign Public IP:** Enable ✅
- **Firewall (security groups):** Select existing security group
  - Select: `ctrlchecks-ollama-sg` ✅

**Configure Storage:**
- **Volume type:** gp3 (General Purpose SSD) ✅
- **Size:** `50` GB ✅
- **Delete on termination:** 
  - Uncheck if you want to keep data ✅
  - Check if you want to delete on termination

**Advanced Details (Optional):**
- Scroll down
- **User data:** Leave empty for now
- We'll configure manually later

### 4.3 Review and Launch

1. **Click "Launch instance"** (bottom right)

2. **Review Summary**
   - Check all settings
   - Click "Launch instance"

3. **Success**
   - You'll see: "Successfully initiated launch"
   - Click "View all instances"

### 4.4 Wait for Instance to Start

1. **In Instances List**
   - Find your instance: `ctrlchecks-fastapi-ollama`
   - **Instance state:** Will show "Pending" → "Initializing" → "Running" ✅
   - **Status checks:** Will show "Initializing" → "2/2 checks passed" ✅
   - **Wait 1-3 minutes**

2. **Note Instance Details**
   - **Instance ID:** `i-xxxxxxxxxxxxx` (copy this)
   - **Public IPv4 address:** `x.x.x.x` (temporary IP)
   - **Private IPv4 address:** `10.x.x.x` (note this)

**✅ Checkpoint:** Instance running

---

## Step 5: Allocate Elastic IP

**Get a static IP address**

### 5.1 Access Elastic IPs

1. **In EC2 Console**
   - Left menu, "Network & Security"
   - Click "Elastic IPs"

### 5.2 Allocate Elastic IP

1. **Click "Allocate Elastic IP address"** (orange button, top right)

2. **Configure:**
   - **Network border group:** Leave default ✅
   - **Public IPv4 address pool:** Amazon's pool of IPv4 addresses ✅
   - **Tags (Optional):**
     - **Key:** Name
     - **Value:** ctrlchecks-fastapi-ollama-eip
   - Click "Allocate"

3. **Note Elastic IP**
   - **Elastic IP address:** `x.x.x.x` (copy this!)
   - **Allocation ID:** `eipalloc-xxxxxxxxx` (note this)

### 5.3 Associate with Instance

1. **Select Elastic IP**
   - Click on the Elastic IP address you just created

2. **Associate Elastic IP**
   - Click "Actions" dropdown → "Associate Elastic IP address"

3. **Configure Association:**
   - **Resource type:** Instance ✅
   - **Instance:** Select `ctrlchecks-fastapi-ollama` ✅
   - **Private IP address:** Leave default (auto-select) ✅
   - Click "Associate"

4. **Verify**
   - Go to "Instances" in left menu
   - Select your instance
   - Check "Public IPv4 address" - should match your Elastic IP ✅

**✅ Checkpoint:** Elastic IP assigned

---

## Step 6: Configure Route 53 DNS

**Point your domain to the Elastic IP**

### 6.1 Access Route 53

1. **Search for Route 53**
   - Type: `Route 53` in search bar
   - Click on "Route 53"

2. **Select Region**
   - Route 53 is global, but ensure correct region

### 6.2 Create Hosted Zone

1. **Click "Hosted zones"** in left menu

2. **Create Hosted Zone**
   - Click "Create hosted zone" button

3. **Configure:**
   - **Domain name:** `ctrlchecks.ai`
   - **Type:** Public hosted zone ✅
   - **Description:** `Hosted zone for ctrlchecks.ai domain`
   - Click "Create hosted zone"

4. **Note Nameservers**
   - After creation, you'll see 4 nameservers:
     - `ns-123.awsdns-12.com`
     - `ns-456.awsdns-45.net`
     - `ns-789.awsdns-78.org`
     - `ns-012.awsdns-01.co.uk`
   - **⚠️ COPY THESE!** You'll need them for your domain registrar

### 6.3 Update Nameservers at Domain Registrar

**This depends on where you registered your domain:**

#### If Domain is at GoDaddy:
1. Log in to GoDaddy
2. Go to "My Products" → "Domains"
3. Click on `ctrlchecks.ai`
4. Scroll to "Nameservers"
5. Click "Change"
6. Select "Custom"
7. Enter the 4 Route 53 nameservers
8. Click "Save"

#### If Domain is at Namecheap:
1. Log in to Namecheap
2. Go to "Domain List"
3. Click "Manage" next to `ctrlchecks.ai`
4. Go to "Advanced DNS" tab
5. Scroll to "Nameservers"
6. Select "Custom DNS"
7. Enter the 4 Route 53 nameservers
8. Click "Save"

#### If Domain is at Another Registrar:
1. Find "DNS Settings" or "Nameservers" section
2. Replace existing nameservers with Route 53 nameservers
3. Save changes

**⚠️ DNS propagation takes 24-48 hours (usually faster)**

### 6.4 Create DNS Records

**Back in Route 53 Console:**

1. **Select Your Hosted Zone**
   - Click on `ctrlchecks.ai` hosted zone

2. **Create A Record for Root Domain**
   - Click "Create record"
   - **Record name:** Leave empty (for root domain) ✅
   - **Record type:** A - Routes traffic to an IPv4 address ✅
   - **Value:** Enter your Elastic IP (e.g., `54.123.45.67`)
   - **TTL:** 300 (5 minutes) or 3600 (1 hour)
   - **Routing policy:** Simple routing ✅
   - Click "Create records"

3. **Create A Record for API Subdomain**
   - Click "Create record"
   - **Record name:** `api` ✅
   - **Record type:** A ✅
   - **Value:** Enter your Elastic IP (same as above)
   - **TTL:** 300
   - Click "Create records"

4. **Create CNAME for WWW (Optional)**
   - Click "Create record"
   - **Record name:** `www`
   - **Record type:** CNAME ✅
   - **Value:** `ctrlchecks.ai`
   - **TTL:** 300
   - Click "Create records"

**✅ Checkpoint:** DNS records created

---

## Step 7: Connect to Instance

**SSH into your EC2 instance**

### 7.1 Get Your Public IP

1. **In EC2 Console → Instances**
   - Select your instance
   - Copy "Public IPv4 address" (your Elastic IP)

### 7.2 Connect via PowerShell (Windows)

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
   ssh -i ctrlchecks-ollama-key.pem ubuntu@YOUR_ELASTIC_IP
   ```
   
   Replace `YOUR_ELASTIC_IP` with your actual Elastic IP address.

5. **Accept Host Key**
   - Type `yes` when prompted
   - You should see: `Welcome to Ubuntu 22.04 LTS...`

**✅ Checkpoint:** Connected to instance

---

## Step 8: Deploy Application

**Install and configure FastAPI Ollama service**

### 8.1 Update System

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim build-essential
```

### 8.2 Install Python 3.11

```bash
# Add deadsnakes PPA
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Verify
python3.11 --version
```

### 8.3 Install Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Verify
ollama --version
```

### 8.4 Create Application Directory

```bash
# Create directory
sudo mkdir -p /opt/fastapi-ollama
sudo chown ubuntu:ubuntu /opt/fastapi-ollama
cd /opt/fastapi-ollama
```

### 8.5 Clone Repository

```bash
# Clone the repository
git clone https://github.com/SPT-CtrlChecks/CtrlChecks-FastAPI.git .

# Verify files
ls -la
```

### 8.6 Create Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### 8.7 Install Python Dependencies

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

### 8.8 Create Environment File

```bash
# Create .env file
cat > .env << 'EOF'
# Ollama Configuration (local)
OLLAMA_URL=http://localhost:11434
PORT=8000

# Worker Service URL (if using worker service)
WORKER_URL=http://localhost:3001

# CORS Configuration
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://ollama.ctrlchecks.ai,https://api.ctrlchecks.ai

# Timeout Configuration
TIMEOUT_SECONDS=180.0
EOF

# Set permissions
chmod 600 .env
```

### 8.9 Create Systemd Service for Ollama

```bash
# Create Ollama service
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

# Enable and start Ollama
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

### 8.10 Create Systemd Service for FastAPI

```bash
# Create FastAPI service
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

# Enable and start FastAPI
sudo systemctl daemon-reload
sudo systemctl enable fastapi-ollama
sudo systemctl start fastapi-ollama

# Check status
sudo systemctl status fastapi-ollama
```

### 8.11 Pull Ollama Models

```bash
# Wait for Ollama to be ready
sleep 10

# Pull production models (optimized for g4dn.xlarge - 16GB GPU)
echo "Pulling qwen2.5:14b-instruct-q4_K_M - General purpose model..."
ollama pull qwen2.5:14b-instruct-q4_K_M

echo "Pulling qwen2.5-coder:7b-instruct-q4_K_M - Code generation model..."
ollama pull qwen2.5-coder:7b-instruct-q4_K_M

# List models
ollama list
```

**✅ Checkpoint:** Application deployed and running

---

## Step 9: Test Your Service

**Verify everything works**

### 9.1 Test Locally (On Instance)

```bash
# Test health endpoint
curl http://localhost:8000/health

# Should return: {"status": "healthy", "ollama": "running", ...}

# Test root endpoint
curl http://localhost:8000/

# Test models endpoint
curl http://localhost:8000/api/tags
```

### 9.2 Test from Outside (From Your Local Machine)

**In PowerShell or browser:**

```powershell
# Test via Elastic IP
curl http://3.108.180.46:8000/health

# Test via domain (after DNS propagation)
curl http://api.ctrlchecks.ai:8000/health
```

**Or open in browser:**
- `http://YOUR_ELASTIC_IP:8000/docs` - FastAPI Swagger docs
- `http://api.ctrlchecks.ai:8000/docs` - After DNS propagation

### 9.3 Test Chat Endpoint

**PowerShell (Windows):**
```powershell
# Test chat (if models pulled)
curl -X POST http://3.108.180.46:8000/api/chat `
  -H "Content-Type: application/json" `
  -d '{\"model\": \"qwen2.5:3b\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello!\"}], \"stream\": false}'
```

**Bash/Linux (EC2 instance):**
```bash
# Test chat (if models pulled)
curl -X POST http://3.108.180.46:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:3b", "messages": [{"role": "user", "content": "Hello!"}], "stream": false}'
```

**Or as a single line:**
```bash
curl -X POST http://3.108.180.46:8000/api/chat -H "Content-Type: application/json" -d '{"model": "qwen2.5:3b", "messages": [{"role": "user", "content": "Hello!"}], "stream": false}'
```

**✅ Checkpoint:** Service accessible and working!

---

## Troubleshooting

### Service Not Running

```bash
# Check service status
sudo systemctl status fastapi-ollama

# View logs
sudo journalctl -u fastapi-ollama -n 50

# Restart service
sudo systemctl restart fastapi-ollama
```

### Port Not Accessible

1. **Check Security Group**
   - EC2 Console → Security Groups
   - Verify port 8000 rule exists
   - Source: `0.0.0.0/0`

2. **Check Port Listening**
   ```bash
   sudo netstat -tlnp | grep 8000
   # Should show: 0.0.0.0:8000
   ```

### Memory Insufficient Error

**Error:** `"model requires more system memory (1.9 GiB) than is available (400-500 MiB)"`

This means your instance doesn't have enough RAM. The `qwen2.5:3b` model needs ~1.9 GB RAM.

**1. Check Your Instance Type and Memory:**

```bash
# Check instance type
curl -s http://169.254.169.254/latest/meta-data/instance-type

# Check total memory
free -h

# Check available memory
free -m | grep Mem | awk '{print "Total: " $2 "MB, Available: " $7 "MB"}'
```

**2. Solutions:**

**Option A: Upgrade Instance Type (Recommended)**

Your instance is likely `t2.micro` or `t3.micro` (1 GB RAM). You need at least:
- **Minimum:** `t3.medium` (4 GB RAM) - ~$30/month - ✅ **NO GPU QUOTA NEEDED**
- **Better:** `t3.large` (8 GB RAM) - ~$60/month - ✅ **NO GPU QUOTA NEEDED**
- **Best:** `g4dn.xlarge` (16 GB RAM + GPU) - ~$350/month - ⚠️ Requires GPU quota approval

**⚠️ IMPORTANT:** CPU-only instances (`t3.medium`, `t3.large`) don't require GPU quota! They use standard EC2 vCPU quota which you likely already have.

**To upgrade:**
1. **Stop your instance** (EC2 Console → Instances → Select → Instance state → Stop)
2. **Change instance type** (Actions → Instance settings → Change instance type)
3. **Select:** 
   - `t3.medium` (4 GB RAM) - Works immediately, no quota needed ✅
   - `t3.large` (8 GB RAM) - Better performance, no quota needed ✅
   - `g4dn.xlarge` - Only if GPU quota is approved
4. **Start instance**

**Note:** CPU-only instances will run Ollama models slower than GPU instances, but they work fine for testing and light workloads.

**Option B: Use Smaller Model (Temporary Fix)**

If you can't upgrade right now, use a smaller model:

```bash
# Pull a smaller model (if available)
ollama pull tinyllama  # ~637 MB

# Test with smaller model
curl -X POST http://3.108.180.46:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model": "tinyllama", "messages": [{"role": "user", "content": "Hello!"}], "stream": false}'
```

**Option C: Free Up Memory**

```bash
# Check what's using memory
ps aux --sort=-%mem | head -10

# Stop unnecessary services
sudo systemctl stop snapd  # If not needed
sudo systemctl disable snapd

# Clear system cache (temporary)
sudo sync && sudo sysctl vm.drop_caches=3
```

**⚠️ Important:** For production use, upgrade to `g4dn.xlarge` (16 GB RAM + GPU) as recommended in Step 4.

### GPU Quota Not Approved Yet

**If you're waiting for GPU quota approval:**

**1. Check Quota Request Status:**

- AWS Console → Service Quotas → Request history
- Look for "On-Demand EC2 instances - GPU instances"
- Status: Pending → Usually approved within 24-48 hours

**2. Use CPU-Only Instance (No Quota Needed):**

While waiting, you can use CPU-only instances that don't require GPU quota:

| Instance Type | RAM | vCPU | Cost/Month | GPU Quota Needed? |
|--------------|-----|------|------------|-------------------|
| `t3.medium` | 4 GB | 2 | ~$30 | ❌ No |
| `t3.large` | 8 GB | 2 | ~$60 | ❌ No |
| `t3.xlarge` | 16 GB | 4 | ~$120 | ❌ No |
| `g4dn.xlarge` | 16 GB | 4 | ~$350 | ✅ Yes |

**3. Upgrade to CPU Instance Now:**

```bash
# On EC2 Console:
# 1. Stop instance
# 2. Actions → Instance settings → Change instance type
# 3. Select: t3.medium (4 GB) or t3.large (8 GB)
# 4. Start instance
```

**4. After GPU Quota Approved:**

Once approved, you can upgrade to `g4dn.xlarge` for GPU acceleration:
- Stop instance → Change type → Select `g4dn.xlarge` → Start

**Note:** CPU instances run models slower but work fine for testing and development.

### Quota Approved in Different Region

**Problem:** GPU quota approved in Region A, but you set up resources in Region B.

**⚠️ Important:** Quota increases are region-specific! You need quota in the same region as your resources.

**Solution Options:**

**Option 1: Move to Approved Region**

**⚠️ Important:** You CANNOT directly change an instance's region. EC2 instances are permanently tied to their region. You must recreate resources in the new region.

**Method A: Fresh Start (Easiest - Recommended)**

1. **Check which region has approval:**
   - AWS Console → Service Quotas → Request history
   - Find approved request → Note the region (e.g., `us-east-1`, `ap-south-1`)

2. **Switch to that region:**
   - Top-right corner → Click region dropdown
   - Select the region with approved quota

3. **Recreate resources in approved region:**
   - Create new security group (same rules)
   - Launch new EC2 instance (`g4dn.xlarge`)
   - Allocate new Elastic IP
   - Update Route 53 DNS (point to new Elastic IP)
   - Redeploy application (follow Step 8)

**Method B: Copy Instance Using AMI (If you want to preserve setup)**

1. **In current region - Create AMI:**
   - EC2 Console → Instances → Select your instance
   - Actions → Image and templates → Create image
   - Name: `ctrlchecks-ollama-backup`
   - Click "Create image"
   - Wait for AMI to be available (5-10 minutes)

2. **Copy AMI to new region:**
   - EC2 Console → AMIs (left menu)
   - Select your AMI → Actions → Copy AMI
   - Destination region: Select region with quota approval
   - Click "Copy AMI"
   - Wait for copy to complete

3. **In new region - Launch from AMI:**
   - Switch to approved region (top-right)
   - EC2 Console → AMIs → Select copied AMI
   - Click "Launch instance from AMI"
   - Select instance type: `g4dn.xlarge`
   - Configure security group, key pair, etc.
   - Launch instance

4. **Update DNS (Route 53 is Global - Easy!):**
   - ✅ **Good News:** Route 53 DNS records are global and can point to any region!
   - Allocate new Elastic IP in new region
   - Associate with new instance
   - **Update Route 53 DNS records:**
     - Route 53 → Hosted zones → Select `ctrlchecks.ai`
     - Edit A records (`ctrlchecks.ai`, `api.ctrlchecks.ai`)
     - Change IP address to new Elastic IP
     - Save changes
   - DNS will update within 5-10 minutes
   - **No need to recreate hosted zone or update nameservers!**

**Option 2: Request Quota in Current Region**

If you've already deployed and want to stay in current region:

1. **Check your current region:**
   - Top-right corner → Note current region (e.g., `ap-south-1`)

2. **Request quota in current region:**
   - AWS Console → Service Quotas
   - **Switch to your current region** (top-right)
   - AWS services → EC2 → Search "GPU instances"
   - Request quota increase (same as Step 1)
   - Wait 24-48 hours for approval

3. **Continue using current region** once approved

**Option 3: Check Current Region and Switch**

**Find out where your resources are:**

1. **Check EC2 instance region:**
   - EC2 Console → Instances
   - Look at top-right corner → That's your current region
   - Note the region name (e.g., "Asia Pacific (Mumbai) - ap-south-1")

2. **Check quota approval region:**
   - Service Quotas → Request history
   - Find approved GPU quota request
   - Note the region shown

3. **If regions match:** You're good! Proceed with instance type change.

4. **If regions don't match:** Choose Option 1 or 2 above.

**Quick Region Check Commands:**

```bash
# On your EC2 instance, check region
curl -s http://169.254.169.254/latest/meta-data/placement/region

# This shows the region your instance is in
```

**Which Region Should You Use?**

- **If quota approved in:** `us-east-1` (US East N. Virginia) → ✅ Best choice (cheapest, most services)
- **If quota approved in:** `ap-south-1` (Asia Pacific Mumbai) → Good for Asia users
- **If quota approved in:** `eu-west-1` (EU Ireland) → Good for EU users

**Recommendation:** Use the region where you have quota approval, unless you have specific latency requirements.

### DNS Not Resolving

1. **Check Nameservers**
   - Verify nameservers updated at registrar
   - Wait 24-48 hours for propagation

2. **Test DNS**
   ```powershell
   # In PowerShell
   nslookup api.ctrlchecks.ai
   # Should return your Elastic IP
   ```

---

## Summary Checklist

- [ ] Quota increase requested/approved
- [ ] Key pair created and saved
- [ ] Security group created with all rules
- [ ] EC2 instance launched (g4dn.xlarge)
- [ ] Elastic IP allocated and associated
- [ ] Route 53 hosted zone created
- [ ] Nameservers updated at registrar
- [ ] DNS records created
- [ ] Connected to instance via SSH
- [ ] Application deployed
- [ ] Services started (Ollama + FastAPI)
- [ ] Models pulled
- [ ] Service accessible from internet

---

## Your Service URLs

After setup complete:

- **Health Check:** `http://api.ctrlchecks.ai:8000/health`
- **API Docs:** `http://api.ctrlchecks.ai:8000/docs`
- **Root:** `http://api.ctrlchecks.ai:8000/`

**🎉 Congratulations! Your FastAPI Ollama service is deployed!**
