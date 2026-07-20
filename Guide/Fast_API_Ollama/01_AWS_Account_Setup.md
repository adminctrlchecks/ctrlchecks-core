# AWS Account Setup Guide for Beginners

This guide will help you set up your AWS account and configure it for deploying the FastAPI Ollama service.

## Table of Contents
1. [Creating an AWS Account](#creating-an-aws-account)
2. [Understanding AWS Regions](#understanding-aws-regions)
3. [Setting Up Billing Alerts](#setting-up-billing-alerts)
4. [Creating an IAM User](#creating-an-iam-user)
5. [Installing AWS CLI](#installing-aws-cli)
6. [Configuring AWS CLI](#configuring-aws-cli)
7. [Next Steps](#next-steps)

---

## Creating an AWS Account

### Step 1: Sign Up for AWS

1. **Go to AWS Website**
   - Visit: https://aws.amazon.com/
   - Click **"Create an AWS Account"** (top right corner)

2. **Enter Account Information**
   - Email address (use a professional email)
   - Password (strong password required)
   - AWS account name (e.g., "CtrlChecks Production")

3. **Contact Information**
   - Full name
   - Company name (if applicable)
   - Phone number (for verification)
   - Country/Region
   - Address

4. **Payment Information**
   - Credit card details (required, but won't be charged unless you use paid services)
   - AWS will verify your card with a small temporary charge (usually $1-2, refunded)

5. **Identity Verification**
   - AWS will call your phone number
   - Enter the PIN code provided

6. **Select Support Plan**
   - Choose **"Basic Plan"** (Free) for now
   - You can upgrade later if needed

7. **Account Created!**
   - You'll receive a confirmation email
   - Log in to the AWS Management Console

### Step 2: Access AWS Management Console

1. **Go to Console**
   - Visit: https://console.aws.amazon.com/
   - Sign in with your email and password

2. **Familiarize Yourself**
   - The console is your main dashboard
   - Search bar at the top helps find services quickly
   - Services are organized by category

---

## Understanding AWS Regions

### What is a Region?

AWS has data centers worldwide called "Regions". Each region is independent and has multiple availability zones.

### Choosing a Region

**Recommended Regions for CtrlChecks:**
- **US East (N. Virginia)** - `us-east-1` ✅ Recommended (cheapest, most services)
- **US East (Ohio)** - `us-east-2` (good alternative)
- **EU (Ireland)** - `eu-west-1` (if serving EU users)
- **Asia Pacific (Singapore)** - `ap-southeast-1` (if serving Asia)

**For this deployment, we'll use: US East (N. Virginia) - us-east-1**

### How to Change Region

1. Look at the top-right corner of AWS Console
2. Click on the region dropdown (e.g., "N. Virginia")
3. Select your desired region

**⚠️ Important:** Always check which region you're in before creating resources!

---

## Setting Up Billing Alerts

**Critical:** Set up billing alerts to avoid unexpected charges!

### Step 1: Enable Billing Alerts

1. **Go to Billing Dashboard**
   - Search for "Billing" in the top search bar
   - Click on "Billing Dashboard"

2. **Enable Billing Alerts**
   - Click "Preferences" in the left menu
   - Check "Receive Billing Alerts"
   - Click "Save preferences"

### Step 2: Create Billing Alarm

1. **Go to CloudWatch**
   - Search for "CloudWatch" in the top search bar
   - Click on "CloudWatch"

2. **Create Alarm**
   - Click "Alarms" in the left menu
   - Click "Create alarm"
   - Click "Select metric"
   - Click "Billing" → "Total Estimated Charge"
   - Select "USD" currency
   - Click "Select metric"

3. **Configure Alarm**
   - **Alarm name:** `Monthly-Billing-Alert`
   - **Threshold type:** Static
   - **Whenever:** Greater than
   - **Amount:** `50` (or your budget limit)
   - Click "Next"

4. **Configure Actions**
   - **Notification:** Create new SNS topic
   - **Email:** Enter your email address
   - Click "Create topic"
   - Click "Next"

5. **Review and Create**
   - Review settings
   - Click "Create alarm"

**✅ Done!** You'll receive email alerts if your bill exceeds $50.

---

## Creating an IAM User

**Why?** Never use your root account for daily operations. Create a separate IAM user.

### Step 1: Access IAM Console

1. Search for "IAM" in the top search bar
2. Click on "IAM" (Identity and Access Management)

### Step 2: Create IAM User

1. **Click "Users"** in the left menu
2. **Click "Create user"**
3. **User Details:**
   - **User name:** `ctrlchecks-admin` (or your preferred name)
   - **Access type:** Select "Programmatic access" ✅
   - Click "Next"

4. **Set Permissions:**
   - Select "Attach policies directly"
   - Search for and select:
     - ✅ `AmazonEC2FullAccess` (for EC2 instances)
     - ✅ `AmazonRoute53FullAccess` (for DNS)
     - ✅ `AmazonElasticLoadBalancingFullAccess` (if using load balancer)
     - ✅ `CloudWatchFullAccess` (for monitoring)
   - Click "Next"

5. **Review and Create:**
   - Review settings
   - Click "Create user"

6. **⚠️ CRITICAL: Save Credentials**
   - **Access Key ID:** Copy this immediately!
   - **Secret Access Key:** Click "Show" and copy this immediately!
   - **Download CSV** (recommended)
   - Store these securely - you won't see the secret key again!

**🔒 Security Note:** Keep these credentials secret. Never commit them to Git!

---

## Installing AWS CLI

AWS CLI allows you to manage AWS from your command line.

### Windows Installation

**Option 1: Using MSI Installer (Recommended)**

1. **Download AWS CLI**
   - Visit: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Download the MSI installer

2. **Install**
   - Run the downloaded `.msi` file
   - Follow the installation wizard
   - Click "Next" through all steps

3. **Verify Installation**
   - Open PowerShell or Command Prompt
   - Run: `aws --version`
   - You should see: `aws-cli/2.x.x`

**Option 2: Using PowerShell**

```powershell
# Download installer
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile "$env:TEMP\AWSCLIV2.msi"

# Install
Start-Process msiexec.exe -ArgumentList "/i $env:TEMP\AWSCLIV2.msi /quiet" -Wait

# Verify
aws --version
```

### Mac Installation

```bash
# Using Homebrew
brew install awscli

# Verify
aws --version
```

### Linux Installation

```bash
# Download
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Unzip
unzip awscliv2.zip

# Install
sudo ./aws/install

# Verify
aws --version
```

---

## Configuring AWS CLI

### Step 1: Configure Credentials

1. **Open Terminal/PowerShell**
   - Windows: PowerShell or Command Prompt
   - Mac/Linux: Terminal

2. **Run Configuration Command**
   ```bash
   aws configure
   ```

3. **Enter Your Credentials**
   ```
   AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID_HERE
   AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY_HERE
   Default region name [None]: us-east-1
   Default output format [None]: json
   ```

   **Where to find these:**
   - Access Key ID: From the IAM user you created
   - Secret Access Key: From the IAM user you created (if you saved it)
   - Region: `us-east-1` (US East N. Virginia)
   - Output format: `json` (recommended)

### Step 2: Verify Configuration

```bash
# Test your configuration
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/ctrlchecks-admin"
}
```

If you see this, your AWS CLI is configured correctly! ✅

### Step 3: Test EC2 Access

```bash
# List EC2 instances (should be empty for new account)
aws ec2 describe-instances
```

If this runs without errors, you're ready to proceed! ✅

---

## Next Steps

Now that your AWS account is set up, proceed to:

1. **[02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)** - Create your EC2 instance
2. **[03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)** - Configure security groups

---

## Common Issues & Solutions

### Issue: "Access Denied" errors

**Solution:**
- Verify your IAM user has the correct permissions
- Check that you're using the right Access Key ID and Secret Key
- Ensure you're in the correct AWS region

### Issue: AWS CLI not found

**Solution:**
- Windows: Restart PowerShell/Command Prompt after installation
- Mac/Linux: Check if AWS CLI is in your PATH: `which aws`
- Reinstall AWS CLI if needed

### Issue: Billing concerns

**Solution:**
- Set up billing alerts (see above)
- Use AWS Free Tier eligible services when possible
- Monitor your usage in the Billing Dashboard
- Set up cost budgets in AWS Cost Management

---

## Cost Estimation

**Expected Monthly Costs for FastAPI Ollama Deployment:**

- **EC2 Instance (g4dn.xlarge):** ~$350/month
- **Elastic IP:** Free (if attached to running instance)
- **Route 53 Hosted Zone:** $0.50/month
- **Route 53 DNS Queries:** ~$0.40/month (first 1 billion queries)
- **Data Transfer:** ~$10-20/month (varies by usage)
- **Storage (50GB EBS):** ~$5/month

**Total: ~$365-375/month**

**💡 Cost Saving Tips:**
- Use Reserved Instances for 1-3 year commitments (save up to 72%)
- Stop instances when not in use (you'll still pay for storage)
- Monitor usage and right-size instances

---

## Security Best Practices

1. ✅ **Never share your AWS credentials**
2. ✅ **Use IAM users, not root account**
3. ✅ **Enable MFA (Multi-Factor Authentication)** for root account
4. ✅ **Regularly review IAM permissions**
5. ✅ **Use security groups to restrict access**
6. ✅ **Keep AWS CLI updated**

---

## Additional Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **AWS Free Tier:** https://aws.amazon.com/free/
- **AWS Pricing Calculator:** https://calculator.aws/
- **AWS Support:** https://aws.amazon.com/support/

---

**✅ You've completed AWS Account Setup!**

Proceed to the next guide: [EC2 Instance Creation](./02_EC2_Instance_Creation.md)
