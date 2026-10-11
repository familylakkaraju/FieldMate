# One-time, per-account bootstrap (local state, run by an administrator): Terraform state bucket, the GitHub
# Actions OIDC deploy role, and each environment's database owner password in SSM Parameter Store.
# No long-lived AWS access keys are created for CI.

terraform {
  # 1.11+ for ephemeral resources and write-only attributes: generated passwords never enter Terraform state.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = { Application = "FieldMate", ManagedBy = "Terraform", Stack = "bootstrap" }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# ---------------------------------------------------------------------------------------------------------------
# Terraform state: versioned, encrypted, private. Locking uses S3 lock files (no DynamoDB table).
# ---------------------------------------------------------------------------------------------------------------
resource "aws_s3_bucket" "state" {
  bucket = "fieldmate-tfstate-${local.account_id}-${var.region}"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_policy" "state_tls_only" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

# ---------------------------------------------------------------------------------------------------------------
# GitHub Actions OIDC → deploy role, restricted to this repository's protected GitHub environments.
# ---------------------------------------------------------------------------------------------------------------
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "deploy" {
  name                 = "fieldmate-github-deploy"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [for env in var.environments : "repo:${var.github_repository}:environment:${env}"]
        }
      }
    }]
  })
}

# V00 deploy permissions: broad service access, but IAM limited to fieldmate-* roles and policies.
# Follow-up: replace PowerUserAccess with a service-scoped policy once the resource set stabilises.
resource "aws_iam_role_policy_attachment" "deploy_power_user" {
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_role_policy" "deploy_iam" {
  name = "manage-fieldmate-iam"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "FieldMateRoles"
        Effect = "Allow"
        Action = [
          "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:UpdateRole", "iam:TagRole", "iam:UntagRole",
          "iam:UpdateAssumeRolePolicy", "iam:PassRole", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
          "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:AttachRolePolicy",
          "iam:DetachRolePolicy", "iam:ListInstanceProfilesForRole",
        ]
        Resource = "arn:aws:iam::${local.account_id}:role/fieldmate-*"
      },
      {
        Sid      = "RdsServiceLinkedRole"
        Effect   = "Allow"
        Action   = "iam:CreateServiceLinkedRole"
        Resource = "arn:aws:iam::${local.account_id}:role/aws-service-role/rds.amazonaws.com/*"
      },
    ]
  })
}

# Guardrails narrowing PowerUserAccess for secrets (ADR-008). Explicit denies always win:
# the deploy role reads only FieldMate parameters, never writes them (bootstrap does, run by an administrator),
# and cannot use Secrets Manager at all (FM-P03: lifting this requires an ADR).
resource "aws_iam_role_policy" "deploy_secret_guardrails" {
  name = "fieldmate-secret-guardrails"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid         = "ReadOnlyFieldMateParameters"
        Effect      = "Deny"
        Action      = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath", "ssm:GetParameterHistory"]
        NotResource = "arn:aws:ssm:*:${local.account_id}:parameter/fieldmate/*"
      },
      {
        Sid    = "NoParameterWrites"
        Effect = "Deny"
        Action = [
          "ssm:PutParameter", "ssm:DeleteParameter", "ssm:DeleteParameters",
          "ssm:LabelParameterVersion", "ssm:UnlabelParameterVersion",
        ]
        Resource = "*"
      },
      {
        Sid      = "NoSecretsManager"
        Effect   = "Deny"
        Action   = "secretsmanager:*"
        Resource = "*"
      },
    ]
  })
}

# ---------------------------------------------------------------------------------------------------------------
# Database owner password per environment: SSM Parameter Store SecureString (standard tier, AWS-managed aws/ssm
# key) instead of Secrets Manager - zero cost (principle 3.17). Generated ephemerally and written write-only, so it
# never appears in Terraform state. It lives here, outside the environment stack, so it survives parking and
# restoring the database. Only the deployment pipeline reads it (migrations); the API uses IAM tokens.
# Rotate: increment db_owner_password_version here, then the same variable in the environment's tfvars.
# ---------------------------------------------------------------------------------------------------------------
ephemeral "random_password" "db_owner" {
  for_each = toset(var.environments)
  length   = 40
  special  = false # RDS forbids / ' " @ and spaces; 40 alphanumerics is about 238 bits
}

resource "aws_ssm_parameter" "db_owner_password" {
  for_each         = toset(var.environments)
  name             = "/fieldmate/${each.key}/database/owner-password"
  description      = "Owner password for fieldmate-postgres-${each.key}. Read only by the deployment pipeline."
  type             = "SecureString"
  tier             = "Standard"
  value_wo         = ephemeral.random_password.db_owner[each.key].result
  value_wo_version = var.db_owner_password_version
}
