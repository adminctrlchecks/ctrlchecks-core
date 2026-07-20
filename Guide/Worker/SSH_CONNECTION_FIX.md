# 🔧 Fix SSH Connection Timeout - Step by Step

**Your SSH connection is timing out. Follow these steps to fix it.**

---

## 🎯 Quick Fix (Choose One Method)

### **Method 1: Using AWS Console (EASIEST - No CLI needed)**

#### Step 1: Check if Instance is Running

1. Go to: **AWS Console → EC2 → Instances**
2. Look for instance named: `ctrlchecks-worker`
3. Check the **State** column:
   - ✅ If it says **"Running"** → Go to Step 2
   - ❌ If it says **"Stopped"** → Click **"Start instance"** and wait 2-3 minutes
   - ❌ If it says **"Stopping"** → Wait until it says "Stopped", then start it

#### Step 2: Get Your Current IP Address

**From Windows PowerShell:**
```powershell
# Get your current public IP
Invoke-RestMethod -Uri "https://ifconfig.me"
```

**Or visit in browser:** https://ifconfig.me

**Write down your IP address** (e.g., `123.45.67.89`)

#### Step 3: Find Security Group

1. In AWS Console → EC2 → Instances
2. Click on your `ctrlchecks-worker` instance
3. Go to **Security** tab (at the bottom)
4. Click on the **Security group** link (e.g., `sg-xxxxxxxxx`)
5. You're now in the Security Group page

#### Step 4: Add SSH Rule to Security Group

1. In the Security Group page, click **"Edit inbound rules"**
2. Click **"Add rule"**
3. Fill in:
   - **Type:** SSH
   - **Protocol:** TCP
   - **Port:** 22
   - **Source:** My IP (or Custom, then paste your IP from Step 2)
   - **Description:** Allow SSH from my computer
4. Click **"Save rules"**

#### Step 5: Try SSH Again

**Wait 30 seconds**, then try:
```bash
ssh -i ctrlchecks-worker.pem ubuntu@3.7.115.58
```

**✅ If it works:** You'll see `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

---

### **Method 2: Using AWS CLI (If You Have It Installed)**

#### Step 1: Install AWS CLI (If Not Installed)

**Download and install from:**
https://aws.amazon.com/cli/

**Or use PowerShell:**
```powershell
# Download AWS CLI installer
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile "$env:TEMP\AWSCLIV2.msi"

# Install (run as Administrator)
Start-Process msiexec.exe -ArgumentList "/i $env:TEMP\AWSCLIV2.msi /quiet" -Wait

# Restart PowerShell after installation
```

#### Step 2: Configure AWS CLI

```powershell
aws configure
```

**Enter:**
- AWS Access Key ID: (your access key)
- AWS Secret Access Key: (your secret key)
- Default region: `us-east-1` (or your region)
- Default output format: `json`

#### Step 3: Check Instance Status

```powershell
# Check if instance is running
aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]" `
  --output table
```

**If instance is stopped:**
```powershell
# Get instance ID from above command, then:
aws ec2 start-instances --instance-ids i-xxxxxxxxxxxxx

# Wait for it to start (2-3 minutes)
aws ec2 wait instance-running --instance-ids i-xxxxxxxxxxxxx
```

#### Step 4: Get Your IP and Security Group

```powershell
# Get your current IP
$myIp = (Invoke-RestMethod -Uri "https://ifconfig.me" -UseBasicParsing).Content
Write-Host "Your IP: $myIp"

# Get security group ID
$sgId = aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=ctrlchecks-worker" `
  --query "Reservations[*].Instances[*].SecurityGroups[0].GroupId" `
  --output text

Write-Host "Security Group: $sgId"
```

#### Step 5: Add SSH Rule

```powershell
# Add your IP to security group
aws ec2 authorize-security-group-ingress `
  --group-id $sgId `
  --protocol tcp `
  --port 22 `
  --cidr "$myIp/32"

Write-Host "SSH access added for IP: $myIp"
```

#### Step 6: Try SSH Again

**Wait 30 seconds**, then:
```bash
ssh -i ctrlchecks-worker.pem ubuntu@3.7.115.58
```

---

## 🐛 Common Issues and Solutions

### Issue 1: "Permission denied (publickey)"

**Problem:** Wrong key file or key file permissions

**Solution:**
```bash
# Make sure you're using the correct key file
# On Linux/Mac, set correct permissions:
chmod 400 ctrlchecks-worker.pem

# Try SSH with verbose output to see what's wrong:
ssh -v -i ctrlchecks-worker.pem ubuntu@3.7.115.58
```

### Issue 2: Instance is Stopped

**Solution:**
1. Go to AWS Console → EC2 → Instances
2. Select your instance
3. Click **"Start instance"**
4. Wait 2-3 minutes
5. Try SSH again

### Issue 3: Wrong IP Address

**Solution:**
1. Check your Elastic IP in AWS Console
2. Or get current instance IP:
   ```powershell
   aws ec2 describe-instances `
     --filters "Name=tag:Name,Values=ctrlchecks-worker" `
     --query "Reservations[*].Instances[*].PublicIpAddress" `
     --output text
   ```
3. Use the IP address shown

### Issue 4: Security Group Already Has Rule But Still Not Working

**Solution:**
1. Remove old rule and add new one with your current IP
2. Your IP might have changed (especially if using home internet)
3. Get your current IP and add it again

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Instance is in "Running" state
- [ ] Security group has SSH rule (port 22) from your IP
- [ ] You have the correct `.pem` key file
- [ ] You're using the correct IP address (3.7.115.58 or Elastic IP)
- [ ] You're using the correct username (`ubuntu`)

---

## 🎯 Quick Test Commands

**Test if port 22 is open:**
```powershell
Test-NetConnection -ComputerName 3.7.115.58 -Port 22
```

**If this shows "TcpTestSucceeded: True"**, then security group is correct and the issue is with SSH key or username.

**If this shows "TcpTestSucceeded: False"**, then security group needs to be fixed.

---

## 📞 Still Not Working?

**Check these:**

1. **Instance Status:** Must be "Running" (not "Stopped" or "Stopping")
2. **Security Group:** Must allow port 22 from your IP
3. **Key File:** Must be the correct `.pem` file for this instance
4. **IP Address:** Verify you're using the correct IP (check in AWS Console)
5. **Username:** Must be `ubuntu` for Ubuntu instances

**If all above are correct but still not working:**
- Try restarting the instance
- Check AWS Console → EC2 → Instances → Your instance → Status checks
- Make sure all status checks are passing

---

**Once SSH works, continue with Step 3 in the deployment checklist!**
