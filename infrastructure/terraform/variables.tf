variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ctrlchecks"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access services"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "worker_instance_type" {
  description = "EC2 instance type for worker"
  type        = string
  default     = "t3.medium"
}

variable "ollama_instance_type" {
  description = "EC2 instance type for Ollama service"
  type        = string
  default     = "g4dn.xlarge"  # GPU instance for AI workloads
}

variable "worker_ami_id" {
  description = "AMI ID for worker instance"
  type        = string
  default     = ""  # Use latest Ubuntu 22.04 LTS
}

variable "ollama_ami_id" {
  description = "AMI ID for Ollama instance"
  type        = string
  default     = ""  # Use latest Ubuntu 22.04 LTS
}

variable "key_pair_name" {
  description = "AWS Key Pair name for EC2 instances"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "ctrlchecks"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "ctrlchecks"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "ctrlchecks.ai"
}

variable "frontend_origin_domain" {
  description = "Frontend origin domain (S3 bucket or custom domain)"
  type        = string
}

variable "cloudfront_aliases" {
  description = "CloudFront aliases (custom domains)"
  type        = list(string)
  default     = []
}

variable "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "Whether to create Route53 DNS records"
  type        = bool
  default     = true
}
