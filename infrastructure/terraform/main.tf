terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Configure backend in terraform.tfvars or via environment variables
    # bucket = "ctrlchecks-terraform-state"
    # key    = "infrastructure/terraform.tfstate"
    # region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "CtrlChecks"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider for CloudFront certificates (must be in us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = {
      Project     = "CtrlChecks"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC
module "vpc" {
  source = "./modules/vpc"
  
  vpc_name            = "${var.project_name}-vpc"
  vpc_cidr            = var.vpc_cidr
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Security Groups
module "security_groups" {
  source = "./modules/security_groups"
  
  vpc_id = module.vpc.vpc_id
  project_name = var.project_name
  
  allowed_cidr_blocks = var.allowed_cidr_blocks
}

# RDS (PostgreSQL) - Optional if using Supabase
# module "rds" {
#   source = "./modules/rds"
#   
#   vpc_id = module.vpc.vpc_id
#   subnet_ids = module.vpc.private_subnet_ids
#   security_group_id = module.security_groups.rds_security_group_id
#   
#   db_name = var.db_name
#   db_username = var.db_username
#   db_password = var.db_password
#   instance_class = var.db_instance_class
# }

# S3 Bucket for file storage
module "s3" {
  source = "./modules/s3"
  
  bucket_name = "${var.project_name}-${var.environment}-storage"
  environment = var.environment
}

# EC2 Instances
module "ec2_worker" {
  source = "./modules/ec2"
  
  instance_name = "${var.project_name}-worker"
  instance_type = var.worker_instance_type
  ami_id        = var.worker_ami_id
  
  vpc_id = module.vpc.vpc_id
  subnet_id = module.vpc.public_subnet_ids[0]
  security_group_ids = [
    module.security_groups.worker_security_group_id
  ]
  
  key_name = var.key_pair_name
  user_data = file("${path.module}/scripts/worker-user-data.sh")
  
  environment = var.environment
}

module "ec2_ollama" {
  source = "./modules/ec2"
  
  instance_name = "${var.project_name}-ollama"
  instance_type = var.ollama_instance_type
  ami_id        = var.ollama_ami_id
  
  vpc_id = module.vpc.vpc_id
  subnet_id = module.vpc.public_subnet_ids[0]
  security_group_ids = [
    module.security_groups.ollama_security_group_id
  ]
  
  key_name = var.key_pair_name
  user_data = file("${path.module}/scripts/ollama-user-data.sh")
  
  environment = var.environment
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security_groups.alb_security_group_id
  
  project_name = var.project_name
  environment = var.environment
}

# CloudFront Distribution for Frontend
module "cloudfront" {
  source = "./modules/cloudfront"
  
  origin_domain = var.frontend_origin_domain
  aliases = var.cloudfront_aliases
  certificate_arn = var.cloudfront_certificate_arn
  
  environment = var.environment
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"
  
  domain_name = var.domain_name
  alb_dns_name = module.alb.dns_name
  alb_zone_id = module.alb.zone_id
  cloudfront_domain = module.cloudfront.domain_name
  worker_instance_ip = module.ec2_worker.public_ip
  ollama_instance_ip = module.ec2_ollama.public_ip
  
  create_records = var.create_dns_records
  environment = var.environment
}

# IAM Roles
module "iam" {
  source = "./modules/iam"
  
  project_name = var.project_name
  account_id = data.aws_caller_identity.current.account_id
}

# CloudWatch Logs
module "cloudwatch" {
  source = "./modules/cloudwatch"
  
  project_name = var.project_name
  environment = var.environment
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "worker_instance_ip" {
  value = module.ec2_worker.public_ip
}

output "ollama_instance_ip" {
  value = module.ec2_ollama.public_ip
}

output "alb_dns_name" {
  value = module.alb.dns_name
}

output "cloudfront_domain" {
  value = module.cloudfront.domain_name
}

output "s3_bucket_name" {
  value = module.s3.bucket_name
}

output "api_domain" {
  value = module.route53.api_domain
}

output "frontend_domain" {
  value = module.route53.frontend_domain
}

output "alb_certificate_arn" {
  value = module.route53.alb_certificate_arn
}

output "cloudfront_certificate_arn" {
  value = module.route53.cloudfront_certificate_arn
}
