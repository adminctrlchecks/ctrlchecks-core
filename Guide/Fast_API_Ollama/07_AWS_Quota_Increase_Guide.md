# AWS Quota Increase Guide

Complete guide for requesting quota increases to use high-performance EC2 instance types like `g4dn.xlarge` for your FastAPI Ollama service.

## Table of Contents
1. [Understanding AWS Quotas](#understanding-aws-quotas)
2. [Why You Need Quota Increases](#why-you-need-quota-increases)
3. [Checking Current Quotas](#checking-current-quotas)
4. [Requesting Quota Increase via Console](#requesting-quota-increase-via-console)
5. [Requesting Quota Increase via AWS CLI](#requesting-quota-increase-via-aws-cli)
6. [Quota Increase for GPU Instances](#quota-increase-for-gpu-instances)
7. [Tracking Request Status](#tracking-request-status)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Understanding AWS Quotas

### What are AWS Quotas?

**AWS Service Quotas** (formerly Service Limits) are the maximum number of resources you can create in your AWS account. These limits help AWS manage capacity and prevent abuse.

### Key Concepts

- **Default Limits:** Every account starts with default limits
- **Quota Increases:** You can request increases for most services
- **Approval Time:** Usually 24-48 hours, sometimes instant
- **Region-Specific:** Quotas are per region
- **Account-Specific:** Quotas are per AWS account

### Common EC2 Quotas

| Resource | Default Limit | For g4dn.xlarge |
|----------|---------------|-----------------|
| **Running On-Demand Instances** | 20 | May need increase |
| **vCPU (General Purpose)** | 32 | May need increase |
| **vCPU (GPU Instances)** | 0 | **Must request** ✅ |
| **Elastic IPs** | 5 | Usually sufficient |
| **EBS Volumes** | 5,000 | Usually sufficient |

**⚠️ Important:** GPU instances (g4dn, g5, p3, p4) typically start with **0 vCPU quota** and require a quota increase!

---

## Why You Need Quota Increases

### For g4dn.xlarge Instance

**g4dn.xlarge specifications:**
- **vCPUs:** 4
- **Instance Family:** GPU instances (g4dn)
- **Default Quota:** 0 vCPU for GPU instances

**You need to request:**
- ✅ **GPU Instance vCPU quota:** At least 4 vCPUs (for 1 instance)
- ✅ **Running On-Demand Instances:** At least 1 (if at limit)

### Common Scenarios Requiring Increases

1. **GPU Instances:** Always need quota increase (default is 0)
2. **High vCPU Instances:** May need increase if you hit vCPU limits
3. **Multiple Instances:** Need increase if you want to run multiple instances
4. **Different Instance Families:** Each family has separate quotas

---

## Checking Current Quotas

### Via AWS Console

1. **Go to Service Quotas**
   - Search for "Service Quotas" in AWS Console
   - Click on "Service Quotas"

2. **View EC2 Quotas**
   - Click "AWS services" in left menu
   - Search for "EC2"
   - Click on "Amazon Elastic Compute Cloud (EC2)"

3. **Find Relevant Quotas**
   - Search for: "Running On-Demand EC2 instances"
   - Search for: "On-Demand EC2 instances - GPU instances"
   - Note current limit and usage

### Via AWS CLI

```bash
# List all EC2 quotas
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query "Quotas[*].[QuotaName,Value,Unit]" \
  --output table

# Get specific quota
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA  # GPU instances quota code
```

### Important Quota Codes for EC2

| Quota Name | Quota Code | Default |
|------------|------------|---------|
| Running On-Demand EC2 instances | L-0263D0A3 | 20 |
| On-Demand EC2 instances - GPU instances | L-DB2E81BA | **0** ✅ |
| On-Demand EC2 instances - General purpose | L-34B43A08 | 32 vCPU |
| On-Demand EC2 instances - Compute optimized | L-2757A3B0 | 32 vCPU |

### Check Current Usage

```bash
# Get current usage for GPU instances
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --query "Quota.[QuotaName,Value,UsageMetric]" \
  --output json

# List running instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].[InstanceType,InstanceId]" \
  --output table
```

---

## Requesting Quota Increase via Console

### Step 1: Access Service Quotas

1. **Go to Service Quotas**
   - Search for "Service Quotas" in AWS Console
   - Click on "Service Quotas"

2. **Select EC2 Service**
   - Click "AWS services" in left menu
   - Search for "EC2"
   - Click on "Amazon Elastic Compute Cloud (EC2)"

### Step 2: Find GPU Instance Quota

1. **Search for GPU Quota**
   - In search box, type: "GPU"
   - Look for: **"On-Demand EC2 instances - GPU instances"**
   - Click on it

2. **View Current Limit**
   - **Current quota value:** Should show `0` (or your current limit)
   - **Applied quota value:** Same as current quota
   - **Usage:** Shows how many you're using

### Step 3: Request Increase

1. **Click "Request quota increase"**

2. **Fill Out Request Form**
   - **Quota:** Already selected (GPU instances)
   - **Region:** Select your region (e.g., US East (N. Virginia))
   - **Change quota value to:** Enter desired value
     - **For 1 g4dn.xlarge:** Enter `4` (4 vCPUs)
     - **For 2 g4dn.xlarge:** Enter `8` (8 vCPUs)
     - **For future scaling:** Enter `16` or `32` (recommended)
   - **Use case description:** Enter:
     ```
     Deploying FastAPI Ollama service for AI/ML workloads.
     Need GPU instances (g4dn.xlarge) to run Ollama models with GPU acceleration.
     Service: CtrlChecks AI Backend
     Domain: ctrlchecks.ai
     ```

3. **Submit Request**
   - Click "Request"
   - You'll see: "Your request has been submitted"

### Step 4: Request Running Instances Increase (If Needed)

**If you're at the limit for running instances:**

1. **Find "Running On-Demand EC2 instances"**
   - Search for: "Running On-Demand"
   - Click on it

2. **Request Increase**
   - Click "Request quota increase"
   - **Change quota value to:** Enter desired number (e.g., `10` or `20`)
   - **Use case:** "Need to run multiple EC2 instances for production deployment"

3. **Submit Request**

---

## Requesting Quota Increase via AWS CLI

### Step 1: Request GPU Instance Quota

```bash
# Set variables
SERVICE_CODE="ec2"
QUOTA_CODE="L-DB2E81BA"  # GPU instances quota code
DESIRED_VALUE=16  # Request 16 vCPUs (allows 4x g4dn.xlarge instances)
REGION="us-east-1"

# Request quota increase
aws service-quotas request-service-quota-increase \
  --service-code $SERVICE_CODE \
  --quota-code $QUOTA_CODE \
  --desired-value $DESIRED_VALUE \
  --region $REGION
```

**Expected Output:**
```json
{
    "RequestedQuota": {
        "Id": "req-xxxxxxxxx",
        "ServiceCode": "ec2",
        "QuotaCode": "L-DB2E81BA",
        "DesiredValue": 16.0,
        "Status": "PENDING",
        "Created": "2024-01-15T10:30:00Z"
    }
}
```

**Save the Request ID** (e.g., `req-xxxxxxxxx`) for tracking!

### Step 2: Request Running Instances Quota (If Needed)

```bash
# Request running instances quota increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-0263D0A3 \
  --desired-value 20 \
  --region us-east-1
```

### Step 3: Request Other Quotas (If Needed)

```bash
# Request General Purpose vCPU quota (if needed)
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-34B43A08 \
  --desired-value 64 \
  --region us-east-1
```

### Complete Script

```bash
#!/bin/bash
# Request all necessary quota increases for FastAPI Ollama deployment

REGION="us-east-1"

echo "Requesting EC2 quota increases for FastAPI Ollama deployment..."

# GPU Instance vCPU quota (MOST IMPORTANT)
echo "1. Requesting GPU instance vCPU quota..."
GPU_REQUEST=$(aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --desired-value 16 \
  --region $REGION \
  --query "RequestedQuota.Id" \
  --output text)

echo "GPU quota request ID: $GPU_REQUEST"

# Running instances quota
echo "2. Requesting running instances quota..."
INSTANCES_REQUEST=$(aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-0263D0A3 \
  --desired-value 20 \
  --region $REGION \
  --query "RequestedQuota.Id" \
  --output text)

echo "Running instances quota request ID: $INSTANCES_REQUEST"

echo ""
echo "Quota increase requests submitted!"
echo "Request IDs:"
echo "  GPU Instances: $GPU_REQUEST"
echo "  Running Instances: $INSTANCES_REQUEST"
echo ""
echo "Check status with:"
echo "  aws service-quotas get-requested-service-quota-change --request-id $GPU_REQUEST"
```

---

## Quota Increase for GPU Instances

### Specific Requirements for g4dn.xlarge

**g4dn.xlarge needs:**
- **Quota:** GPU Instance vCPU quota
- **Minimum:** 4 vCPUs (for 1 instance)
- **Recommended:** 16-32 vCPUs (for scaling)

### Request Details

**Quota Code:** `L-DB2E81BA`

**Request Value:**
- **Minimum:** 4 (1 instance)
- **Recommended:** 16 (4 instances)
- **Production:** 32+ (for auto-scaling)

**Use Case Description:**
```
Deploying FastAPI Ollama service for AI/ML inference workloads.
Service requires GPU acceleration for running large language models (LLMs).
Using Ollama framework with NVIDIA GPU support.
Instance type: g4dn.xlarge (4 vCPU, NVIDIA T4 GPU)
Service: CtrlChecks AI Backend
Domain: ctrlchecks.ai
Expected usage: Production workload with 24/7 availability
```

### Region-Specific Requests

**⚠️ Important:** Quota increases are per region!

```bash
# Request for multiple regions if needed
REGIONS=("us-east-1" "us-west-2" "eu-west-1")

for REGION in "${REGIONS[@]}"; do
  echo "Requesting quota increase for $REGION..."
  aws service-quotas request-service-quota-increase \
    --service-code ec2 \
    --quota-code L-DB2E81BA \
    --desired-value 16 \
    --region $REGION
done
```

---

## Tracking Request Status

### Via Console

1. **Go to Service Quotas**
   - Click "Service Quotas" in AWS Console

2. **View Requests**
   - Click "Request history" in left menu
   - Find your request
   - Check status: **Pending**, **Approved**, or **Denied**

### Via AWS CLI

```bash
# Get request status
REQUEST_ID="req-xxxxxxxxx"

aws service-quotas get-requested-service-quota-change \
  --request-id $REQUEST_ID \
  --query "RequestedQuota.[Status,DesiredValue,CaseId]" \
  --output table
```

### List All Pending Requests

```bash
# List all pending requests
aws service-quotas list-requested-service-quota-change-history \
  --service-code ec2 \
  --status PENDING \
  --query "RequestedQuotas[*].[Id,QuotaCode,DesiredValue,Status]" \
  --output table
```

### Check Quota After Approval

```bash
# Check current quota value
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --query "Quota.Value" \
  --output text

# Should show your new limit after approval
```

---

## Best Practices

### 1. Request More Than You Need

**Recommended:**
- Request **2-4x** your immediate need
- Allows for scaling without additional requests
- Example: Need 1 instance → Request 16 vCPUs (4 instances)

### 2. Provide Detailed Use Case

**Good Description:**
```
Deploying production FastAPI Ollama service for AI/ML inference.
Service requires GPU acceleration for running large language models.
Using g4dn.xlarge instances (4 vCPU, NVIDIA T4 GPU).
Expected usage: 24/7 production workload.
Domain: ctrlchecks.ai
```

**Bad Description:**
```
Need GPU instances
```

### 3. Request Early

- **Request before you need it**
- Approval can take 24-48 hours
- Sometimes instant, sometimes longer

### 4. Monitor Quota Usage

```bash
# Set up CloudWatch alarm for quota usage
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-GPU-Quota-Usage" \
  --alarm-description "Alert when GPU quota usage exceeds 80%" \
  --metric-name "UsageMetric" \
  --namespace "AWS/ServiceQuota" \
  --statistic "Average" \
  --period 3600 \
  --threshold 80 \
  --comparison-operator "GreaterThanThreshold"
```

### 5. Request for Multiple Regions

If deploying in multiple regions, request quotas for each:
- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- eu-west-1 (Ireland)

---

## Troubleshooting

### Issue: Request Denied

**Possible Reasons:**
1. Insufficient justification
2. Requested too high a value
3. Account is new (limited history)

**Solution:**
1. **Resubmit with better justification**
   - Provide detailed use case
   - Explain business need
   - Include expected usage

2. **Request Lower Value**
   - Start with minimum needed
   - Request increases later if needed

3. **Contact AWS Support**
   - Open a support case
   - Explain your use case
   - Request manual review

### Issue: Request Pending Too Long

**Normal Timeline:**
- **Instant:** Sometimes approved immediately
- **24 hours:** Most common
- **48 hours:** Still normal
- **72+ hours:** May need follow-up

**Solution:**
```bash
# Check request status
aws service-quotas get-requested-service-quota-change \
  --request-id req-xxxxxxxxx

# If pending > 48 hours, contact AWS Support
```

### Issue: Cannot Launch Instance After Approval

**Check:**
1. Verify quota increase was approved
2. Check you're in the correct region
3. Verify instance type matches quota

**Solution:**
```bash
# Verify quota
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --query "Quota.Value" \
  --output text

# Check current usage
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].[InstanceType]" \
  --output text | sort | uniq -c
```

### Issue: Quota Increase Not Showing

**Check:**
1. Correct region
2. Request was approved (not just submitted)
3. Refresh AWS Console

**Solution:**
```bash
# List all EC2 quotas
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query "Quotas[?contains(QuotaName, 'GPU')].[QuotaName,Value]" \
  --output table
```

---

## Quick Reference

### Important Quota Codes

| Quota | Code | Default |
|-------|------|---------|
| GPU Instance vCPU | L-DB2E81BA | 0 |
| Running Instances | L-0263D0A3 | 20 |
| General Purpose vCPU | L-34B43A08 | 32 |
| Compute Optimized vCPU | L-2757A3B0 | 32 |

### Quick Commands

```bash
# Request GPU quota increase
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --desired-value 16 \
  --region us-east-1

# Check request status
aws service-quotas get-requested-service-quota-change \
  --request-id req-xxxxxxxxx

# Check current quota
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --query "Quota.Value" \
  --output text

# List all pending requests
aws service-quotas list-requested-service-quota-change-history \
  --service-code ec2 \
  --status PENDING
```

---

## Checklist

Before launching your g4dn.xlarge instance:

- [ ] Checked current GPU instance quota (likely 0)
- [ ] Requested GPU instance vCPU quota increase (minimum 4, recommended 16)
- [ ] Provided detailed use case description
- [ ] Requested for correct region (us-east-1)
- [ ] Received approval email or verified status
- [ ] Verified quota increase is active
- [ ] Ready to launch instance

---

## Expected Timeline

1. **Submit Request:** Immediate
2. **Review:** 1-24 hours
3. **Approval:** Usually 24-48 hours
4. **Activation:** Immediate after approval

**Total:** 1-2 business days (sometimes instant!)

---

## Cost Considerations

**Quota increases are FREE!** ✅

- No charge for quota increases
- No charge for requesting increases
- Only pay for resources you actually use

---

## Next Steps

After quota increase is approved:

1. **Verify Quota**
   ```bash
   aws service-quotas get-service-quota \
     --service-code ec2 \
     --quota-code L-DB2E81BA \
     --query "Quota.Value" \
     --output text
   ```

2. **Launch Instance**
   - Follow [02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)
   - Instance type: g4dn.xlarge
   - Should work now! ✅

3. **Monitor Usage**
   - Track quota usage
   - Request additional increases if needed

---

**✅ Quota Increase Requested!**

Once approved, proceed with EC2 instance creation: [02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)
