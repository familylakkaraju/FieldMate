terraform {
  # 1.10+ for S3-native state locking (use_lockfile): no DynamoDB lock table (CR: no DynamoDB initially).
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # Partial configuration, completed per environment by env/<env>.s3.tfbackend (see infra/README.md).
  backend "s3" {}
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Application = "FieldMate"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCentre  = "fieldmate-${var.environment}"
      Vertical    = "V00"
    }
  }
}
