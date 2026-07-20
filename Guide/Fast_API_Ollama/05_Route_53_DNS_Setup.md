# Route 53 DNS Setup Guide

This guide will help you configure Route 53 to point your domain `ctrlchecks.ai` to your FastAPI Ollama service's Elastic IP address.

## Table of Contents
1. [Understanding Route 53](#understanding-route-53)
2. [Prerequisites](#prerequisites)
3. [Transferring Domain to Route 53](#transferring-domain-to-route-53)
4. [Creating Hosted Zone](#creating-hosted-zone)
5. [Creating DNS Records](#creating-dns-records)
6. [Configuring Domain for ctrlchecks.ai](#configuring-domain-for-ctrlchecksai)
7. [Verifying DNS Configuration](#verifying-dns-configuration)
8. [Setting Up SSL Certificate (Optional)](#setting-up-ssl-certificate-optional)
9. [Troubleshooting](#troubleshooting)

---

## Understanding Route 53

### What is Route 53?

**Amazon Route 53** is AWS's DNS (Domain Name System) web service. It translates domain names (like `ctrlchecks.ai`) into IP addresses (like `54.123.45.67`).

### Key Concepts

- **Hosted Zone:** A container for DNS records for a domain
- **DNS Record:** Maps a domain name to an IP address or other resource
- **Record Types:**
  - **A Record:** Maps domain to IPv4 address
  - **AAAA Record:** Maps domain to IPv6 address
  - **CNAME:** Maps domain to another domain name
  - **MX:** Mail exchange records
  - **TXT:** Text records (for verification, SPF, etc.)

### How It Works

```
User types: api.ctrlchecks.ai
    ↓
Route 53 DNS lookup
    ↓
Returns: 54.123.45.67 (your Elastic IP)
    ↓
User's browser connects to your EC2 instance
```

---

## Prerequisites

Before starting, ensure you have:

- ✅ AWS account set up
- ✅ Domain name: `ctrlchecks.ai` (registered somewhere)
- ✅ Elastic IP allocated and associated with your EC2 instance
- ✅ EC2 instance running with FastAPI Ollama service
- ✅ Access to domain registrar (where you bought the domain)

**Note:** If your domain is registered elsewhere (GoDaddy, Namecheap, etc.), you'll need to update nameservers.

---

## Transferring Domain to Route 53

### Option 1: Domain Already Registered Elsewhere

If `ctrlchecks.ai` is registered with another registrar:

1. **Keep domain at current registrar** (easier)
2. **Update nameservers** to Route 53 nameservers (see below)

### Option 2: Transfer Domain to Route 53

**⚠️ Note:** Transferring domain can take 5-7 days and may incur costs.

1. **Go to Route 53**
   - Search for "Route 53" in AWS Console
   - Click "Route 53"

2. **Register Domain**
   - Click "Registered domains"
   - Click "Register domain"
   - Enter: `ctrlchecks.ai`
   - Follow registration process

**For this guide, we'll assume domain is registered elsewhere and we'll just update nameservers.**

---

## Creating Hosted Zone

### Step 1: Access Route 53 Console

1. **Go to Route 53**
   - Search for "Route 53" in AWS Console
   - Click on "Route 53"

2. **Navigate to Hosted Zones**
   - In left menu, click "Hosted zones"

### Step 2: Create Hosted Zone

1. **Create Hosted Zone**
   - Click "Create hosted zone" button

2. **Configure Hosted Zone**
   - **Domain name:** `ctrlchecks.ai`
   - **Type:** Public hosted zone ✅
   - **Description:** `Hosted zone for ctrlchecks.ai domain`
   - Click "Create hosted zone"

3. **Note Nameservers**
   - After creation, you'll see 4 nameservers:
     - `ns-123.awsdns-12.com`
     - `ns-456.awsdns-45.net`
     - `ns-789.awsdns-78.org`
     - `ns-012.awsdns-01.co.uk`
   - **⚠️ Copy these nameservers!** You'll need them to update your domain registrar.

### Step 3: Update Nameservers at Domain Registrar

**This step depends on where you registered your domain:**

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

**⚠️ Important:** DNS propagation can take 24-48 hours, but usually works within a few hours.

---

## Creating DNS Records

### Step 1: Get Your Elastic IP

```bash
# Get Elastic IP associated with your instance
INSTANCE_ID="i-xxxxxxxxxxxxx"

EIP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Elastic IP: $EIP"
```

Or check in EC2 Console → Instances → Your instance → Public IPv4 address

### Step 2: Create A Record for Root Domain

**Option A: Via Console**

1. **Go to Hosted Zone**
   - Route 53 → Hosted zones
   - Click on `ctrlchecks.ai` hosted zone

2. **Create Record**
   - Click "Create record"

3. **Configure Record**
   - **Record name:** Leave empty (for root domain) or enter `@`
   - **Record type:** A - Routes traffic to an IPv4 address ✅
   - **Value:** Enter your Elastic IP (e.g., `54.123.45.67`)
   - **TTL:** 300 (5 minutes) or 3600 (1 hour)
   - **Routing policy:** Simple routing ✅
   - Click "Create records"

**Option B: Via AWS CLI**

```bash
# Set variables
HOSTED_ZONE_ID="Z1234567890ABC"  # Get from Route 53 Console
EIP="54.123.45.67"  # Your Elastic IP

# Create A record for root domain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ctrlchecks.ai",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$EIP'"}]
      }
    }]
  }'
```

### Step 3: Create A Record for API Subdomain

**For API access:** `api.ctrlchecks.ai`

**Via Console:**

1. **Create Record**
   - In hosted zone, click "Create record"

2. **Configure Record**
   - **Record name:** `api`
   - **Record type:** A
   - **Value:** Your Elastic IP (e.g., `54.123.45.67`)
   - **TTL:** 300
   - Click "Create records"

**Via AWS CLI:**

```bash
# Create A record for api subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.ctrlchecks.ai",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$EIP'"}]
      }
    }]
  }'
```

### Step 4: Create Additional Records (Optional)

**WWW Subdomain:**

```bash
# Create CNAME for www (points to root domain)
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.ctrlchecks.ai",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ctrlchecks.ai"}]
      }
    }]
  }'
```

---

## Configuring Domain for ctrlchecks.ai

### Recommended DNS Records

For your FastAPI Ollama deployment, create these records:

| Record Name | Type | Value | Purpose |
|------------|------|-------|---------|
| `ctrlchecks.ai` | A | `YOUR_ELASTIC_IP` | Root domain → FastAPI |
| `api.ctrlchecks.ai` | A | `YOUR_ELASTIC_IP` | API subdomain → FastAPI |
| `www.ctrlchecks.ai` | CNAME | `ctrlchecks.ai` | WWW redirect |

### Complete Setup Script

```bash
#!/bin/bash
# Complete Route 53 DNS setup for ctrlchecks.ai

# Set variables
HOSTED_ZONE_ID="Z1234567890ABC"  # Replace with your hosted zone ID
EIP="54.123.45.67"  # Replace with your Elastic IP
DOMAIN="ctrlchecks.ai"

# Get hosted zone ID automatically
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query "HostedZones[0].Id" \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"
echo "Elastic IP: $EIP"

# Create A record for root domain
echo "Creating A record for $DOMAIN..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'$DOMAIN'",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$EIP'"}]
      }
    }]
  }'

# Create A record for api subdomain
echo "Creating A record for api.$DOMAIN..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.'$DOMAIN'",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$EIP'"}]
      }
    }]
  }'

# Create CNAME for www
echo "Creating CNAME for www.$DOMAIN..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.'$DOMAIN'",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$DOMAIN'"}]
      }
    }]
  }'

echo "DNS records created successfully!"
```

---

## Verifying DNS Configuration

### Step 1: Check DNS Propagation

**Using dig (Linux/Mac):**

```bash
# Check root domain
dig ctrlchecks.ai +short

# Check API subdomain
dig api.ctrlchecks.ai +short

# Should return your Elastic IP
```

**Using nslookup (Windows):**

```powershell
# Check root domain
nslookup ctrlchecks.ai

# Check API subdomain
nslookup api.ctrlchecks.ai
```

**Using Online Tools:**

- Visit: https://www.whatsmydns.net/
- Enter: `ctrlchecks.ai`
- Check global DNS propagation

### Step 2: Test HTTP Access

```bash
# Test root domain
curl http://ctrlchecks.ai:8000/health

# Test API subdomain
curl http://api.ctrlchecks.ai:8000/health

# Should return JSON response
```

### Step 3: Verify in Route 53

```bash
# List all records in hosted zone
aws route53 list-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --query "ResourceRecordSets[*].[Name,Type,ResourceRecords[0].Value]" \
  --output table
```

---

## Setting Up SSL Certificate (Optional)

**For HTTPS access**, you'll need an SSL certificate. Use AWS Certificate Manager (ACM).

### Step 1: Request Certificate

1. **Go to Certificate Manager**
   - Search for "Certificate Manager" in AWS Console
   - Click "Certificate Manager"

2. **Request Certificate**
   - Click "Request certificate"
   - **Domain names:**
     - `ctrlchecks.ai`
     - `*.ctrlchecks.ai` (wildcard)
   - **Validation method:** DNS validation ✅
   - Click "Request"

3. **Validate Certificate**
   - Click on your certificate
   - Click "Create record in Route 53" for each domain
   - Wait for validation (5-30 minutes)

### Step 2: Configure HTTPS (Requires Load Balancer)

**Note:** EC2 instances don't directly support ACM certificates. You need:
- Application Load Balancer (ALB) with ACM certificate, OR
- CloudFront distribution with ACM certificate, OR
- Install certificate on instance (self-signed or Let's Encrypt)

**For now, HTTP is fine. We'll cover HTTPS in a future guide.**

---

## Troubleshooting

### Issue: DNS not resolving

**Check:**
1. Nameservers updated at registrar
2. DNS records created correctly
3. Wait 24-48 hours for propagation

**Solution:**
```bash
# Check current nameservers
dig NS ctrlchecks.ai +short

# Should show Route 53 nameservers
# If not, update at registrar
```

### Issue: Wrong IP address returned

**Check:**
1. DNS record points to correct Elastic IP
2. TTL has expired (wait or reduce TTL)
3. Clear DNS cache

**Solution:**
```bash
# Windows: Clear DNS cache
ipconfig /flushdns

# Mac/Linux: Clear DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Verify DNS record
aws route53 list-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --query "ResourceRecordSets[?Name=='ctrlchecks.ai']"
```

### Issue: Domain shows "pending" in Route 53

**Solution:**
- This is normal during DNS propagation
- Wait 24-48 hours
- Check nameservers are correct

### Updating DNS for New Region Instance

**Scenario:** You moved your EC2 instance to a new region and need to update DNS to point to the new Elastic IP.

**✅ Good News:** Route 53 DNS records are **global** and can point to resources in **any region**! You don't need to recreate the hosted zone or records - just update the IP address.

**Steps to Update DNS:**

1. **Get New Elastic IP:**
   - In new region → EC2 → Elastic IPs
   - Note the new Elastic IP address (e.g., `3.108.180.46`)

2. **Update DNS Records:**

   **Via AWS Console:**
   - Route 53 → Hosted zones → Select `ctrlchecks.ai`
   - Find your A records (e.g., `ctrlchecks.ai`, `api.ctrlchecks.ai`)
   - Click on each record → Edit
   - Update **Value** field to new Elastic IP
   - Click **Save changes**

   **Via AWS CLI:**
   ```bash
   # Set variables
   HOSTED_ZONE_ID="Z1234567890ABC"  # Your hosted zone ID
   NEW_EIP="3.108.180.46"  # New Elastic IP
   
   # Update root domain A record
   aws route53 change-resource-record-sets \
     --hosted-zone-id $HOSTED_ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "ctrlchecks.ai",
           "Type": "A",
           "TTL": 300,
           "ResourceRecords": [{"Value": "'$NEW_EIP'"}]
         }
       }]
     }'
   
   # Update api subdomain A record
   aws route53 change-resource-record-sets \
     --hosted-zone-id $HOSTED_ZONE_ID \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "api.ctrlchecks.ai",
           "Type": "A",
           "TTL": 300,
           "ResourceRecords": [{"Value": "'$NEW_EIP'"}]
         }
       }]
     }'
   ```

3. **Verify DNS Update:**
   ```bash
   # Check DNS resolution (may take a few minutes)
   dig api.ctrlchecks.ai +short
   # Should return your new Elastic IP
   
   # Or use nslookup
   nslookup api.ctrlchecks.ai
   ```

4. **DNS Propagation:**
   - Changes usually take effect within 5-10 minutes
   - Full propagation: 24-48 hours (depending on TTL)
   - You can reduce TTL to 60 seconds for faster updates during migration

**Important Notes:**
- ✅ Hosted zone stays the same (no need to recreate)
- ✅ Nameservers stay the same (no need to update at registrar)
- ✅ Only IP addresses in A records need updating
- ✅ Route 53 works globally - region doesn't matter for DNS

### Issue: Cannot access via domain name

**Check:**
1. DNS resolves to correct IP
2. Security group allows traffic
3. Application is running on instance
4. Using correct port (8000)

**Test:**
```bash
# Test DNS resolution
nslookup ctrlchecks.ai

# Test direct IP access
curl http://YOUR_ELASTIC_IP:8000/health

# Test domain access
curl http://ctrlchecks.ai:8000/health
```

---

## DNS Record Reference

### Common Record Types

| Type | Purpose | Example |
|------|---------|---------|
| **A** | IPv4 address | `ctrlchecks.ai` → `54.123.45.67` |
| **AAAA** | IPv6 address | `ctrlchecks.ai` → `2001:0db8::1` |
| **CNAME** | Alias to another domain | `www.ctrlchecks.ai` → `ctrlchecks.ai` |
| **MX** | Mail server | `ctrlchecks.ai` → `mail.ctrlchecks.ai` |
| **TXT** | Text record | SPF, DKIM, verification |

### TTL (Time To Live)

- **300 seconds (5 min):** Fast updates, more DNS queries
- **3600 seconds (1 hour):** Balanced (recommended)
- **86400 seconds (24 hours):** Slow updates, fewer queries

---

## Cost Considerations

### Route 53 Pricing

- **Hosted Zone:** $0.50/month per hosted zone
- **DNS Queries:** 
  - First 1 billion: $0.40 per million
  - Over 1 billion: $0.20 per million
- **Health Checks:** $0.50/month per check

### Estimated Monthly Cost

- **1 hosted zone:** $0.50
- **~1 million queries:** ~$0.40
- **Total:** ~$1/month

**Very affordable!** ✅

---

## Best Practices

### 1. Use Appropriate TTL

- **Development:** 300 seconds (5 min)
- **Production:** 3600 seconds (1 hour)
- **Stable services:** 86400 seconds (24 hours)

### 2. Monitor DNS Queries

```bash
# Get query statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Route53 \
  --metric-name DNSQueries \
  --dimensions Name=HostedZoneId,Value=$HOSTED_ZONE_ID \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### 3. Use Health Checks (Optional)

```bash
# Create health check
aws route53 create-health-check \
  --caller-reference $(date +%s) \
  --health-check-config '{
    "Type": "HTTP",
    "ResourcePath": "/health",
    "FullyQualifiedDomainName": "api.ctrlchecks.ai",
    "Port": 8000,
    "RequestInterval": 30
  }'
```

### 4. Document DNS Records

Keep a record of:
- Domain name
- Hosted zone ID
- DNS records created
- Purpose of each record

---

## Verification Checklist

- ✅ Hosted zone created
- ✅ Nameservers updated at registrar
- ✅ A record created for root domain
- ✅ A record created for api subdomain
- ✅ DNS resolves correctly
- ✅ Can access service via domain name
- ✅ DNS propagation complete

---

## Next Steps

Now that DNS is configured:

1. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - Deploy your FastAPI Ollama application
2. Test your domain: `http://api.ctrlchecks.ai:8000/health`

---

## Quick Reference Commands

```bash
# Get hosted zone ID
aws route53 list-hosted-zones-by-name --dns-name ctrlchecks.ai

# List all records
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC

# Create A record
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://dns-record.json

# Get nameservers
aws route53 get-hosted-zone --id Z1234567890ABC --query "DelegationSet.NameServers"
```

---

**✅ Route 53 DNS Configured!**

Proceed to: [Application Deployment](./06_Application_Deployment.md)
