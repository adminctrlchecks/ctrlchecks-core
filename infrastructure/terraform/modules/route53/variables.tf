variable "domain_name" {
  description = "Domain name (e.g., ctrlchecks.ai)"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = ""
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  type        = string
  default     = ""
}

variable "worker_instance_ip" {
  description = "Worker EC2 instance public IP (optional, for direct access)"
  type        = string
  default     = ""
}

variable "ollama_instance_ip" {
  description = "Ollama EC2 instance public IP (optional, for direct access)"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "create_records" {
  description = "Whether to create DNS records"
  type        = bool
  default     = true
}
