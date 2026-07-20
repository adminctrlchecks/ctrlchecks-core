# Quick Start - FastAPI Ollama AWS Deployment

**Get your FastAPI Ollama service running on AWS in under 3 hours!**

## 🎯 Goal

Deploy FastAPI Ollama service accessible at `api.ctrlchecks.ai:8000`

## ⚡ Fast Track (For Experienced Users)

```bash
# 0. Request quota increase FIRST (CRITICAL!)
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-DB2E81BA \
  --desired-value 16 \
  --region us-east-1
# Wait for approval (24-48 hours, sometimes instant)

# 1. Configure AWS CLI
aws configure

# 2. Create security group
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
SG_ID=$(aws ec2 create-security-group --group-name ctrlchecks-ollama-sg --description "FastAPI Ollama" --vpc-id $VPC_ID --query "GroupId" --output text)
MY_IP=$(curl -s ifconfig.me)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $MY_IP/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8000 --cidr 0.0.0.0/0

# 3. Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type g4dn.xlarge \
  --key-name ctrlchecks-ollama-key \
  --security-group-ids $SG_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ctrlchecks-fastapi-ollama}]'

# 4. Allocate Elastic IP
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query "AllocationId" --output text)
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=ctrlchecks-fastapi-ollama" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].InstanceId" --output text)
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $EIP_ALLOC
EIP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

# 5. Configure Route 53
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name ctrlchecks.ai --query "HostedZones[0].Id" --output text | cut -d'/' -f3)
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.ctrlchecks.ai","Type":"A","TTL":300,"ResourceRecords":[{"Value":"'$EIP'"}]}}]}'

# 6. Deploy application (SSH into instance)
ssh -i ctrlchecks-ollama-key.pem ubuntu@$EIP
# Then follow deployment steps in guide 06
```

## 📚 Step-by-Step (For Beginners)

**Follow these guides in order:**

1. **[00_COMPLETE_DEPLOYMENT_GUIDE.md](./00_COMPLETE_DEPLOYMENT_GUIDE.md)** - Read this first!
2. **[07_AWS_Quota_Increase_Guide.md](./07_AWS_Quota_Increase_Guide.md)** - ⚠️ **REQUEST QUOTA FIRST!**
3. **[01_AWS_Account_Setup.md](./01_AWS_Account_Setup.md)** - Set up AWS account
3. **[02_EC2_Instance_Creation.md](./02_EC2_Instance_Creation.md)** - Create EC2 instance
4. **[03_Security_Groups_Setup.md](./03_Security_Groups_Setup.md)** - Configure security
5. **[04_Elastic_IP_Setup.md](./04_Elastic_IP_Setup.md)** - Assign static IP
6. **[05_Route_53_DNS_Setup.md](./05_Route_53_DNS_Setup.md)** - Configure domain
7. **[06_Application_Deployment.md](./06_Application_Deployment.md)** - Deploy app

## ✅ Checklist

- [ ] **Quota increase requested/approved** (CRITICAL for GPU instances!)
- [ ] AWS account created
- [ ] AWS CLI configured
- [ ] EC2 instance running (g4dn.xlarge)
- [ ] Security group configured
- [ ] Elastic IP allocated and associated
- [ ] Route 53 DNS configured
- [ ] Application deployed
- [ ] Ollama models pulled
- [ ] Service accessible at `api.ctrlchecks.ai:8000`

## 🧪 Quick Test

```bash
# Test health endpoint
curl http://api.ctrlchecks.ai:8000/health

# Expected: {"status": "healthy", "ollama": "running"}
```

## 💰 Cost Estimate

- **EC2:** ~$350/month
- **Elastic IP:** Free
- **Route 53:** ~$1/month
- **Total:** ~$365/month

## 🆘 Need Help?

- Check troubleshooting sections in each guide
- Review [00_COMPLETE_DEPLOYMENT_GUIDE.md](./00_COMPLETE_DEPLOYMENT_GUIDE.md)
- Check application logs: `sudo journalctl -u fastapi-ollama -f`

---

**Start with:** [00_COMPLETE_DEPLOYMENT_GUIDE.md](./00_COMPLETE_DEPLOYMENT_GUIDE.md)
