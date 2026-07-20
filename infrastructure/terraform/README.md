# AWS Infrastructure as Code (Terraform)

This directory contains Terraform configuration for deploying the CtrlChecks platform on AWS.

## Architecture

- **VPC**: Public and private subnets across 2 availability zones
- **EC2**: Worker and Ollama service instances
- **ALB**: Application Load Balancer for backend services
- **CloudFront**: CDN for frontend
- **S3**: File storage
- **Route53**: DNS management
- **CloudWatch**: Logging and monitoring
- **IAM**: Roles and policies

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0 installed
3. AWS account with appropriate permissions
4. Domain name (optional, for Route53)

## Setup

### 1. Configure Variables

Copy `terraform.tfvars.example` to `terraform.tfvars`:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
aws_region = "us-east-1"
environment = "dev"
key_pair_name = "your-keypair-name"
domain_name = "ctrlchecks.ai"
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 3. Plan Deployment

```bash
terraform plan
```

Review the plan to ensure it matches your expectations.

### 4. Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted.

### 5. Get Outputs

```bash
terraform output
```

This will show:
- Worker instance IP
- Ollama instance IP
- ALB DNS name
- CloudFront domain
- S3 bucket name

## Module Structure

```
modules/
├── vpc/              # VPC and networking
├── security_groups/  # Security group rules
├── ec2/              # EC2 instance configuration
├── alb/              # Application Load Balancer
├── cloudfront/       # CloudFront distribution
├── s3/               # S3 bucket configuration
├── route53/          # DNS records
├── iam/              # IAM roles and policies
└── cloudwatch/       # CloudWatch log groups
```

## Environment Variables

Set these before running Terraform:

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

## Destroying Infrastructure

To tear down all resources:

```bash
terraform destroy
```

**Warning**: This will delete all resources created by Terraform!

## State Management

For production, configure remote state in `main.tf`:

```hcl
backend "s3" {
  bucket = "ctrlchecks-terraform-state"
  key    = "infrastructure/terraform.tfstate"
  region = "us-east-1"
}
```

## Cost Estimation

Run cost estimation:

```bash
terraform plan -out=tfplan
terraform show -json tfplan | jq -r '.planned_values.root_module.resources[] | select(.type | startswith("aws_")) | "\(.type): \(.address)"'
```

Or use [Infracost](https://www.infracost.io/):

```bash
infracost breakdown --path .
```

## Security Best Practices

1. **Never commit `terraform.tfvars`** - Contains sensitive data
2. **Use IAM roles** - Don't hardcode credentials
3. **Enable encryption** - S3, RDS, EBS volumes
4. **Restrict security groups** - Only allow necessary ports
5. **Use private subnets** - For database and internal services
6. **Enable CloudTrail** - For audit logging
7. **Rotate credentials** - Regularly update keys and passwords

## Troubleshooting

### "Access Denied" errors

- Verify IAM permissions
- Check security group rules
- Verify key pair exists

### "Instance launch failed"

- Check AMI ID is valid for region
- Verify instance type is available in region
- Check quotas and limits

### "DNS not resolving"

- Verify Route53 hosted zone exists
- Check NS records are correct
- Wait for DNS propagation (up to 48 hours)

## Next Steps

After infrastructure is deployed:

1. Configure EC2 instances with application code
2. Set up CI/CD pipelines
3. Configure monitoring and alerts
4. Set up backups
5. Configure auto-scaling (if needed)

## Support

For issues or questions, refer to:
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Architecture Best Practices](https://aws.amazon.com/architecture/)
