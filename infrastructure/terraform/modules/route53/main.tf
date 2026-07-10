# Route53 Hosted Zone
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# ACM Certificate for ALB (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "alb_cert" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.${var.domain_name}"  # Wildcard for subdomains
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.domain_name}-alb-cert"
    Environment = var.environment
  }
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront_cert" {
  provider = aws.us_east_1  # CloudFront requires us-east-1 (defined in parent)

  domain_name       = var.domain_name
  validation_method = "DNS"
  
  subject_alternative_names = [
    "www.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.domain_name}-cloudfront-cert"
    Environment = var.environment
  }
}

# Certificate Validation Records
resource "aws_route53_record" "alb_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.alb_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_route53_record" "cloudfront_cert_validation" {
  provider = aws.us_east_1  # CloudFront requires us-east-1

  for_each = {
    for dvo in aws_acm_certificate.cloudfront_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate Validation
resource "aws_acm_certificate_validation" "alb_cert" {
  certificate_arn         = aws_acm_certificate.alb_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.alb_cert_validation : record.fqdn]
}

resource "aws_acm_certificate_validation" "cloudfront_cert" {
  provider = aws.us_east_1  # CloudFront requires us-east-1

  certificate_arn         = aws_acm_certificate.cloudfront_cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]
}

# DNS Records (only create if create_records is true)
resource "aws_route53_record" "api" {
  count = var.create_records ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Optional: Direct EC2 instance records (if not using ALB)
resource "aws_route53_record" "worker" {
  count = var.create_records && var.worker_instance_ip != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "worker.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [var.worker_instance_ip]
}

resource "aws_route53_record" "ollama" {
  count = var.create_records && var.ollama_instance_ip != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "ollama.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [var.ollama_instance_ip]
}

# Frontend (CloudFront)
resource "aws_route53_record" "frontend" {
  count = var.create_records ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront hosted zone ID
    evaluate_target_health = false
  }
}

# WWW redirect (optional)
resource "aws_route53_record" "www" {
  count = var.create_records ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront hosted zone ID
    evaluate_target_health = false
  }
}

# Outputs
output "hosted_zone_id" {
  value = data.aws_route53_zone.main.zone_id
}

output "alb_certificate_arn" {
  value = aws_acm_certificate.alb_cert.arn
}

output "cloudfront_certificate_arn" {
  value = aws_acm_certificate.cloudfront_cert.arn
}

output "api_domain" {
  value = var.create_records ? "api.${var.domain_name}" : ""
}

output "frontend_domain" {
  value = var.create_records ? var.domain_name : ""
}
