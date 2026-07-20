# Elastic IP Setup Guide

Elastic IP addresses are static IPv4 addresses that don't change when you stop/start your instance. This guide will help you allocate and associate an Elastic IP with your FastAPI Ollama instance.

## Table of Contents
1. [Understanding Elastic IP](#understanding-elastic-ip)
2. [Why Use Elastic IP?](#why-use-elastic-ip)
3. [Allocating Elastic IP via Console](#allocating-elastic-ip-via-console)
4. [Allocating Elastic IP via AWS CLI](#allocating-elastic-ip-via-aws-cli)
5. [Associating Elastic IP with Instance](#associating-elastic-ip-with-instance)
6. [Updating DNS Records](#updating-dns-records)
7. [Releasing Elastic IP](#releasing-elastic-ip)
8. [Cost Considerations](#cost-considerations)

---

## Understanding Elastic IP

### What is an Elastic IP?

**Elastic IP** is a static, public IPv4 address that you can allocate to your AWS account and associate with your EC2 instances.

### Key Concepts

- **Static IP:** Doesn't change when you stop/start instance
- **Public IP:** Accessible from the internet
- **Region-Specific:** Elastic IPs are tied to a specific AWS region
- **Free:** Free when attached to a running instance
- **Charged:** Small charge if allocated but not attached

### Elastic IP vs Regular Public IP

| Feature | Regular Public IP | Elastic IP |
|---------|------------------|------------|
| **Persistence** | Changes on stop/start | Stays the same |
| **Cost** | Free | Free when attached |
| **Use Case** | Temporary instances | Production services |
| **DNS** | Need to update DNS | Stable DNS records |

---

## Why Use Elastic IP?

### Benefits

✅ **Stable DNS:** Your domain can point to a fixed IP  
✅ **No Downtime:** IP doesn't change on instance restart  
✅ **Easy Updates:** Update DNS once, works forever  
✅ **Production Ready:** Essential for production deployments  

### When to Use

- ✅ **Production services** (like FastAPI Ollama)
- ✅ **Domain name pointing** (ctrlchecks.ai)
- ✅ **Long-running instances**
- ✅ **Services requiring stable IP**

### When NOT to Use

- ❌ **Development/testing** (unless needed)
- ❌ **Auto-scaling groups** (use ALB instead)
- ❌ **Temporary instances**

---

## Allocating Elastic IP via Console

### Step 1: Access EC2 Console

1. **Go to EC2**
   - Search for "EC2" in AWS Console
   - Click on "EC2"

2. **Select Region**
   - Ensure you're in **US East (N. Virginia) - us-east-1**
   - Check top-right corner

### Step 2: Allocate Elastic IP

1. **Navigate to Elastic IPs**
   - In left menu, under "Network & Security"
   - Click "Elastic IPs"

2. **Allocate Elastic IP Address**
   - Click "Allocate Elastic IP address" button (orange, top right)

3. **Configure Elastic IP**
   - **Network border group:** Leave default ✅
   - **Public IPv4 address pool:** Amazon's pool of IPv4 addresses ✅
   - **Tags (Optional):**
     - **Key:** Name
     - **Value:** ctrlchecks-fastapi-ollama-eip
   - Click "Allocate"

4. **Allocation Complete**
   - You'll see: "Successfully allocated Elastic IP address"
   - **Note the Elastic IP address** (e.g., `54.123.45.67`)
   - **Note the Allocation ID** (e.g., `eipalloc-xxxxxxxxx`)

### Step 3: Tag Elastic IP (Recommended)

1. **Select Elastic IP**
   - Click on the Elastic IP address you just created

2. **Add Tags**
   - Click "Tags" tab
   - Click "Manage tags"
   - Click "Add tag"
   - **Key:** Name
   - **Value:** ctrlchecks-fastapi-ollama-eip
   - **Key:** Service
   - **Value:** fastapi-ollama
   - **Key:** Environment
   - **Value:** production
   - Click "Save changes"

---

## Allocating Elastic IP via AWS CLI

### Step 1: Allocate Elastic IP

```bash
# Allocate Elastic IP
EIP_RESPONSE=$(aws ec2 allocate-address \
  --domain vpc \
  --region us-east-1 \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=ctrlchecks-fastapi-ollama-eip}]')

# Extract Elastic IP and Allocation ID
EIP=$(echo $EIP_RESPONSE | jq -r '.PublicIp')
ALLOCATION_ID=$(echo $EIP_RESPONSE | jq -r '.AllocationId')

echo "Elastic IP: $EIP"
echo "Allocation ID: $ALLOCATION_ID"
```

### Step 2: Verify Allocation

```bash
# Describe Elastic IPs
aws ec2 describe-addresses \
  --allocation-ids $ALLOCATION_ID \
  --query "Addresses[0]" \
  --output json
```

---

## Associating Elastic IP with Instance

### Via Console

1. **Select Elastic IP**
   - Go to EC2 → Elastic IPs
   - Select your Elastic IP address

2. **Associate Elastic IP**
   - Click "Actions" → "Associate Elastic IP address"
   - **Resource type:** Instance ✅
   - **Instance:** Select `ctrlchecks-fastapi-ollama`
   - **Private IP address:** Leave default (auto-select)
   - Click "Associate"

3. **Verification**
   - Go to EC2 → Instances
   - Select your instance
   - Check "Public IPv4 address" - should match your Elastic IP ✅

### Via AWS CLI

```bash
# Set variables
INSTANCE_ID="i-xxxxxxxxxxxxx"
ALLOCATION_ID="eipalloc-xxxxxxxxx"

# Associate Elastic IP
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOCATION_ID

# Verify
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text
```

### Get Association ID (for later disassociation)

```bash
# Get association ID
ASSOCIATION_ID=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOCATION_ID \
  --query "Addresses[0].AssociationId" \
  --output text)

echo "Association ID: $ASSOCIATION_ID"
```

---

## Updating DNS Records

Once you have an Elastic IP, you can point your domain to it.

### Step 1: Note Your Elastic IP

```bash
# Get Elastic IP
EIP=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOCATION_ID \
  --query "Addresses[0].PublicIp" \
  --output text)

echo "Elastic IP: $EIP"
```

### Step 2: Update Route 53 (See Next Guide)

You'll configure Route 53 DNS records in the next guide. For now, note your Elastic IP address.

**Example:**
- **Domain:** ctrlchecks.ai
- **Subdomain:** api.ctrlchecks.ai (or just ctrlchecks.ai)
- **Type:** A record
- **Value:** Your Elastic IP (e.g., `54.123.45.67`)

---

## Releasing Elastic IP

**⚠️ Warning:** Only release if you're sure you don't need it anymore!

### Via Console

1. **Disassociate First**
   - Go to Elastic IPs
   - Select your Elastic IP
   - Click "Actions" → "Disassociate Elastic IP address"
   - Confirm disassociation

2. **Release Elastic IP**
   - Select Elastic IP
   - Click "Actions" → "Release Elastic IP addresses"
   - Type "release" to confirm
   - Click "Release"

### Via AWS CLI

```bash
# Disassociate first
aws ec2 disassociate-address \
  --association-id $ASSOCIATION_ID

# Release Elastic IP
aws ec2 release-address \
  --allocation-id $ALLOCATION_ID
```

---

## Cost Considerations

### Elastic IP Pricing

- **Free:** When attached to a running instance
- **Charged:** $0.005/hour (~$3.60/month) if allocated but NOT attached
- **No Charge:** For first Elastic IP per instance

### Cost Optimization

✅ **Best Practice:**
- Always attach Elastic IP to a running instance
- Release unused Elastic IPs immediately
- Use one Elastic IP per instance (first one is free)

❌ **Avoid:**
- Allocating multiple Elastic IPs without attaching
- Keeping Elastic IPs allocated but unattached

### Check Costs

```bash
# List all Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[*].[PublicIp,InstanceId,NetworkInterfaceId]" \
  --output table

# Find unattached Elastic IPs (will show null for InstanceId)
aws ec2 describe-addresses \
  --query "Addresses[?InstanceId==null].[PublicIp,AllocationId]" \
  --output table
```

---

## Troubleshooting

### Issue: Cannot associate Elastic IP

**Possible Causes:**
1. Instance already has an Elastic IP
2. Instance is in a different region
3. Instance is stopped

**Solution:**
```bash
# Check instance status
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].[State.Name,PublicIpAddress]" \
  --output table

# Disassociate existing Elastic IP first
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=$INSTANCE_ID" \
  --query "Addresses[0].AssociationId" \
  --output text
```

### Issue: Elastic IP shows as "available" but not attached

**Solution:**
- Verify you associated it with the correct instance
- Check instance is running
- Verify you're in the correct region

### Issue: Public IP changed after restart

**Solution:**
- Ensure Elastic IP is associated (not just allocated)
- Verify association in EC2 Console
- Check instance details show Elastic IP as Public IP

---

## Best Practices

### 1. Tag Your Elastic IPs

```bash
# Add tags
aws ec2 create-tags \
  --resources $ALLOCATION_ID \
  --tags Key=Name,Value=ctrlchecks-fastapi-ollama-eip \
         Key=Service,Value=fastapi-ollama \
         Key=Environment,Value=production
```

### 2. Document Elastic IP Usage

Keep a record of:
- Elastic IP address
- Allocation ID
- Associated instance
- Purpose (which service)

### 3. Monitor Unattached Elastic IPs

```bash
# Script to find unattached Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[?InstanceId==null].[PublicIp,AllocationId,Tags[?Key=='Name'].Value|[0]]" \
  --output table
```

### 4. Use Elastic IP for Production Only

- Development: Use regular public IPs
- Production: Use Elastic IPs for stability

---

## Verification Checklist

- ✅ Elastic IP allocated
- ✅ Elastic IP associated with instance
- ✅ Instance shows Elastic IP as public IP
- ✅ Can access instance via Elastic IP
- ✅ Elastic IP is tagged
- ✅ DNS records updated (in next step)

---

## Next Steps

Now that you have an Elastic IP:

1. **[05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)** - Configure DNS to point your domain to this IP
2. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - Deploy your FastAPI Ollama application

---

## Quick Reference Commands

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address --instance-id i-xxx --allocation-id eipalloc-xxx

# Describe Elastic IPs
aws ec2 describe-addresses

# Disassociate
aws ec2 disassociate-address --association-id eipassoc-xxx

# Release
aws ec2 release-address --allocation-id eipalloc-xxx
```

---

**✅ Elastic IP Configured!**

Proceed to: [Route 53 DNS Setup](./05_Route_53_DNS_Setup.md)
