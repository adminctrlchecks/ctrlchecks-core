# Route53 Module

Terraform module for managing Route 53 DNS records and ACM certificates for the CtrlChecks platform.

## Features

- ✅ Creates ACM certificates for ALB and CloudFront
- ✅ Sets up DNS validation records
- ✅ Creates DNS A records for all services
- ✅ Configures CloudFront aliases
- ✅ Supports both ALB and direct EC2 access

## Usage

```hcl
module "route53" {
  source = "./modules/route53"
  
  domain_name = "ctrlchecks.ai"
  alb_dns_name = "ctrlchecks-alb-123456789.us-east-1.elb.amazonaws.com"
  alb_zone_id = "Z35SXDOTRQ7X7K"
  cloudfront_domain = "d1234567890.cloudfront.net"
  worker_instance_ip = "54.123.45.67"
  ollama_instance_ip = "54.123.45.68"
  
  create_records = true
  environment = "prod"
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| `domain_name` | Domain name (e.g., ctrlchecks.ai) | `string` | - | yes |
| `alb_dns_name` | ALB DNS name | `string` | `""` | no |
| `alb_zone_id` | ALB hosted zone ID | `string` | `""` | no |
| `cloudfront_domain` | CloudFront distribution domain | `string` | `""` | no |
| `worker_instance_ip` | Worker EC2 instance IP | `string` | `""` | no |
| `ollama_instance_ip` | Ollama EC2 instance IP | `string` | `""` | no |
| `environment` | Environment name | `string` | `"dev"` | no |
| `create_records` | Whether to create DNS records | `bool` | `true` | no |

## Outputs

| Name | Description |
|------|-------------|
| `hosted_zone_id` | Route 53 hosted zone ID |
| `alb_certificate_arn` | ACM certificate ARN for ALB |
| `cloudfront_certificate_arn` | ACM certificate ARN for CloudFront |
| `api_domain` | API subdomain (api.domain.com) |
| `frontend_domain` | Frontend domain |

## DNS Records Created

- `api.domain.com` → ALB (A record with alias)
- `worker.domain.com` → EC2 Worker (A record, optional)
- `ollama.domain.com` → EC2 Ollama (A record, optional)
- `domain.com` → CloudFront (A record with alias)
- `www.domain.com` → CloudFront (A record with alias)

## Certificates Created

1. **ALB Certificate**: `api.domain.com` + `*.domain.com` (wildcard)
2. **CloudFront Certificate**: `domain.com` + `www.domain.com`

**Note**: CloudFront certificate is created in `us-east-1` region (required by AWS).

## Requirements

- Domain must have a Route 53 hosted zone
- If domain is registered elsewhere, update nameservers to Route 53
- Terraform AWS provider >= 5.0

## Notes

- Certificate validation can take 5-30 minutes
- DNS propagation can take up to 48 hours (usually much faster)
- CloudFront certificate must be in us-east-1 region
