# Security Groups Setup Guide

Security groups act as a virtual firewall for your EC2 instances. This guide will help you configure them properly for your FastAPI Ollama service.

## Table of Contents
1. [Understanding Security Groups](#understanding-security-groups)
2. [Security Group Rules for FastAPI Ollama](#security-group-rules-for-fastapi-ollama)
3. [Creating Security Group via Console](#creating-security-group-via-console)
4. [Creating Security Group via AWS CLI](#creating-security-group-via-aws-cli)
5. [Attaching Security Group to Instance](#attaching-security-group-to-instance)
6. [Testing Security Group Rules](#testing-security-group-rules)
7. [Security Best Practices](#security-best-practices)

---

## Understanding Security Groups

### What are Security Groups?

**Security Groups** are virtual firewalls that control inbound and outbound traffic for your EC2 instances.

### Key Concepts

- **Inbound Rules:** Traffic coming TO your instance
- **Outbound Rules:** Traffic going FROM your instance
- **Default Behavior:**
  - **Inbound:** Deny all (you must explicitly allow)
  - **Outbound:** Allow all (by default)
- **Stateful:** If you allow inbound traffic, the response is automatically allowed outbound

### Important Rules

1. ✅ **One instance can have multiple security groups**
2. ✅ **Security groups can be reused across instances**
3. ✅ **Rules are evaluated together (if ANY rule allows, traffic is allowed)**
4. ✅ **Changes take effect immediately**

---

## Security Group Rules for FastAPI Ollama

### Required Ports

| Port | Protocol | Source | Purpose | Required? |
|------|----------|--------|---------|-----------|
| 22 | TCP | Your IP | SSH access | ✅ Yes |
| 80 | TCP | 0.0.0.0/0 | HTTP (web) | ✅ Yes |
| 443 | TCP | 0.0.0.0/0 | HTTPS (secure web) | ✅ Yes |
| 8000 | TCP | 0.0.0.0/0 | FastAPI service | ✅ Yes |
| 11434 | TCP | 127.0.0.1/32 | Ollama (local only) | ✅ Yes |

### Recommended Configuration

**For Production:**
- **SSH (22):** Only from your IP or VPN
- **HTTP/HTTPS (80/443):** From anywhere (or from CloudFront/ALB)
- **FastAPI (8000):** From anywhere (or from specific sources)
- **Ollama (11434):** Localhost only (127.0.0.1)

**For Development:**
- All ports can be more open for testing

---

## Creating Security Group via Console

### Step 1: Access EC2 Console

1. **Go to EC2**
   - Search for "EC2" in AWS Console
   - Click on "EC2"

2. **Navigate to Security Groups**
   - In left menu, under "Network & Security"
   - Click "Security groups"

### Step 2: Create Security Group

1. **Click "Create security group"**

2. **Basic Details**
   - **Security group name:** `ctrlchecks-ollama-sg`
   - **Description:** `Security group for FastAPI Ollama service - allows HTTP, HTTPS, and FastAPI access`
   - **VPC:** Select your VPC (usually "default vpc")

3. **Inbound Rules**

   Click "Add rule" for each rule:

   **Rule 1: SSH**
   - **Type:** SSH
   - **Protocol:** TCP
   - **Port range:** 22
   - **Source:** My IP ✅ (or specific IP: `YOUR_IP/32`)
   - **Description:** `SSH access from my IP`

   **Rule 2: HTTP**
   - **Type:** HTTP
   - **Protocol:** TCP
   - **Port range:** 80
   - **Source:** Anywhere-IPv4 (`0.0.0.0/0`)
   - **Description:** `HTTP web access`

   **Rule 3: HTTPS**
   - **Type:** HTTPS
   - **Protocol:** TCP
   - **Port range:** 443
   - **Source:** Anywhere-IPv4 (`0.0.0.0/0`)
   - **Description:** `HTTPS secure web access`

   **Rule 4: FastAPI Port**
   - **Type:** Custom TCP
   - **Protocol:** TCP
   - **Port range:** 8000
   - **Source:** Anywhere-IPv4 (`0.0.0.0/0`)
   - **Description:** `FastAPI Ollama service`

   **Rule 5: Ollama (Local Only)**
   - **Type:** Custom TCP
   - **Protocol:** TCP
   - **Port range:** 11434
   - **Source:** Custom (`127.0.0.1/32`)
   - **Description:** `Ollama service - localhost only`

4. **Outbound Rules**
   - Leave default (Allow all traffic) ✅
   - Or restrict to specific ports if needed

5. **Create Security Group**
   - Click "Create security group"
   - Note the **Security Group ID** (e.g., `sg-xxxxxxxxx`)

### Step 3: Get Your IP Address

**To restrict SSH to your IP only:**

1. **Find Your Public IP**
   - Visit: https://whatismyipaddress.com/
   - Or run: `curl ifconfig.me`
   - Copy your IP address (e.g., `203.0.113.42`)

2. **Update SSH Rule**
   - Go back to Security Groups
   - Select your security group
   - Click "Edit inbound rules"
   - Find SSH rule
   - Change source to: `YOUR_IP/32` (e.g., `203.0.113.42/32`)
   - Click "Save rules"

---

## Creating Security Group via AWS CLI

### Step 1: Get VPC ID

```bash
# List VPCs
aws ec2 describe-vpcs --query "Vpcs[*].[VpcId,IsDefault]" --output table

# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "VPC ID: $VPC_ID"
```

### Step 2: Get Your IP Address

```bash
# Get your public IP
MY_IP=$(curl -s ifconfig.me)
echo "Your IP: $MY_IP"
```

### Step 3: Create Security Group

```bash
# Create security group
SG_RESPONSE=$(aws ec2 create-security-group \
  --group-name ctrlchecks-ollama-sg \
  --description "Security group for FastAPI Ollama service" \
  --vpc-id $VPC_ID)

# Extract Security Group ID
SG_ID=$(echo $SG_RESPONSE | jq -r '.GroupId')
echo "Security Group ID: $SG_ID"
```

### Step 4: Add Inbound Rules

```bash
# SSH from your IP
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32 \
  --description "SSH access from my IP"

# HTTP
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --description "HTTP web access"

# HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --description "HTTPS secure web access"

# FastAPI port
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0 \
  --description "FastAPI Ollama service"

# Ollama (localhost only)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 11434 \
  --cidr 127.0.0.1/32 \
  --description "Ollama service - localhost only"
```

### Step 5: Verify Security Group

```bash
# Describe security group
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query "SecurityGroups[0].IpPermissions" \
  --output table
```

---

## Attaching Security Group to Instance

### Via Console

1. **Go to Instances**
   - EC2 Console → Instances
   - Select your instance

2. **Modify Security Groups**
   - Click "Actions" → "Security" → "Change security groups"
   - Select your security group: `ctrlchecks-ollama-sg`
   - Click "Update security groups"

### Via AWS CLI

```bash
# Set variables
INSTANCE_ID="i-xxxxxxxxxxxxx"
SG_ID="sg-xxxxxxxxx"

# Modify instance security groups
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --groups $SG_ID
```

---

## Testing Security Group Rules

### Test SSH Access

```bash
# From your local machine
ssh -i ctrlchecks-ollama-key.pem ubuntu@YOUR_PUBLIC_IP

# Should connect successfully
```

### Test HTTP Access

```bash
# From your local machine
curl http://3.108.255.107:8000/health

# Should return JSON response
```

### Test Port Accessibility

```bash
# Test if port is open (from instance)
sudo netstat -tlnp | grep 8000

# Test from outside (use online tool)
# Visit: https://www.yougetsignal.com/tools/open-ports/
# Enter: YOUR_PUBLIC_IP and port 8000
```

### Test Ollama Port (Should be Blocked from Outside)

```bash
# From your local machine (should fail)
curl http://YOUR_PUBLIC_IP:11434/api/tags

# Should timeout or be refused (this is correct!)
```

---

## Security Best Practices

### 1. Principle of Least Privilege

✅ **Do:**
- Only open ports you need
- Restrict SSH to specific IPs
- Use specific IP ranges when possible

❌ **Don't:**
- Open all ports to 0.0.0.0/0
- Allow SSH from anywhere
- Leave default security groups unchanged

### 2. Regular Review

```bash
# List all security groups
aws ec2 describe-security-groups \
  --query "SecurityGroups[*].[GroupName,GroupId,Description]" \
  --output table

# Review rules
aws ec2 describe-security-groups \
  --group-names ctrlchecks-ollama-sg \
  --query "SecurityGroups[0].IpPermissions" \
  --output json
```

### 3. Use Security Group References

Instead of IP addresses, reference other security groups:

```bash
# Allow access from ALB security group
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --source-group sg-alb-xxxxxxxxx
```

### 4. Tag Your Security Groups

```bash
# Add tags
aws ec2 create-tags \
  --resources $SG_ID \
  --tags Key=Name,Value=ctrlchecks-ollama-sg \
         Key=Environment,Value=production \
         Key=Service,Value=fastapi-ollama
```

### 5. Document Rules

Always add descriptions to rules explaining why they exist.

### 6. Monitor Security Group Changes

Enable CloudTrail to log security group changes:

```bash
# Check CloudTrail events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --max-results 10
```

---

## Advanced Configuration

### Multiple Security Groups

You can attach multiple security groups to an instance:

```bash
# Attach multiple security groups
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --groups $SG_ID_1 $SG_ID_2
```

### Security Group for Load Balancer

If using Application Load Balancer:

```bash
# Create ALB security group
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name ctrlchecks-alb-sg \
  --description "Security group for Application Load Balancer" \
  --vpc-id $VPC_ID | jq -r '.GroupId')

# Allow HTTP/HTTPS from internet
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Update instance security group to allow from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --source-group $ALB_SG_ID
```

---

## Troubleshooting

### Issue: Cannot connect via SSH

**Check:**
1. Security group allows port 22 from your IP
2. Instance is running
3. Key pair is correct
4. Your IP hasn't changed (if using dynamic IP)

**Solution:**
```bash
# Update SSH rule with new IP
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $MY_IP/32
```

### Issue: Cannot access FastAPI service

**Check:**
1. Security group allows port 8000
2. Application is running on instance
3. Application is listening on 0.0.0.0 (not just localhost)

**Solution:**
```bash
# Verify application is running
ssh -i key.pem ubuntu@INSTANCE_IP
sudo systemctl status fastapi-ollama

# Check if listening on correct interface
sudo netstat -tlnp | grep 8000
# Should show: 0.0.0.0:8000 (not 127.0.0.1:8000)
```

### Issue: Too many security groups

**Solution:**
- Consolidate rules into fewer security groups
- Use security group references instead of IPs
- Review and remove unused rules

---

## Security Checklist

- ✅ SSH restricted to specific IP(s)
- ✅ Only necessary ports are open
- ✅ Ollama port (11434) restricted to localhost
- ✅ Security group has descriptive name and description
- ✅ Rules have descriptions explaining their purpose
- ✅ Regular review of security group rules
- ✅ CloudTrail logging enabled
- ✅ Security groups are tagged

---

**✅ Security Groups Configured!**

Proceed to: [Elastic IP Setup](./04_Elastic_IP_Setup.md)
