# FieldMate V00 Foundation: one environment (dev, test or prod) per state file.

data "aws_caller_identity" "current" {}

locals {
  application_username = "fieldmate_app"
  # Cognito domain prefixes are globally unique; derive a stable, non-identifying suffix from the account.
  cognito_domain_prefix = coalesce(
    var.cognito_domain_prefix,
    "fieldmate-${var.environment}-${substr(sha1(data.aws_caller_identity.current.account_id), 0, 8)}",
  )
}

module "network" {
  source      = "../modules/network"
  environment = var.environment
  cidr_block  = var.vpc_cidr
}

module "identity" {
  source                  = "../modules/identity"
  environment             = var.environment
  domain_prefix           = local.cognito_domain_prefix
  deletion_protection     = var.cognito_deletion_protection
  mfa_configuration       = var.mfa_configuration
  self_sign_up_enabled    = var.self_sign_up_enabled
  web_callback_urls       = var.web_callback_urls
  web_logout_urls         = var.web_logout_urls
  enable_smoke_client     = var.enable_smoke_client
  google_client_id        = var.google_client_id
  google_client_secret    = var.google_client_secret
  microsoft_client_id     = var.microsoft_client_id
  microsoft_client_secret = var.microsoft_client_secret
  microsoft_tenant_id     = var.microsoft_tenant_id
}

# Parking a dev environment (database_enabled = false) removes only the database. Cognito, API Gateway and Lambda
# have no idle cost and are kept, so authentication identities (issuer + subject) stay valid.
module "database" {
  source = "../modules/database"
  count  = var.database_enabled ? 1 : 0

  environment           = var.environment
  subnet_ids            = module.network.private_subnet_ids
  security_group_id     = module.network.database_security_group_id
  engine_version        = var.db_engine_version
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  multi_az              = var.db_multi_az
  backup_retention_days = var.db_backup_retention_days
  deletion_protection   = var.db_deletion_protection
  skip_final_snapshot   = var.db_skip_final_snapshot
  snapshot_identifier   = var.db_snapshot_identifier
  apply_immediately     = var.environment != "prod"
  enable_proxy          = var.enable_rds_proxy
  application_username  = local.application_username
}

module "api" {
  source                   = "../modules/api"
  environment              = var.environment
  api_package_path         = var.api_package_path
  dbops_package_path       = var.dbops_package_path
  subnet_ids               = module.network.private_subnet_ids
  lambda_security_group_id = module.network.lambda_security_group_id

  identity = {
    issuer        = module.identity.issuer
    audiences     = module.identity.audiences
    domain_url    = module.identity.domain_url
    web_client_id = module.identity.web_client_id
    redirect_uri  = var.web_callback_urls[0]
    logout_uri    = var.web_logout_urls[0]
  }

  database = var.database_enabled ? {
    application_endpoint = module.database[0].application_endpoint
    instance_address     = module.database[0].instance_address
    port                 = module.database[0].port
    owner_username       = module.database[0].owner_username
    application_username = local.application_username
    connect_resource_id  = module.database[0].application_connect_resource_id
  } : null

  api_memory_mb            = var.api_memory_mb
  api_reserved_concurrency = var.api_reserved_concurrency
  log_retention_days       = var.log_retention_days
  dbops_log_retention_days = var.dbops_log_retention_days
  enable_xray_tracing      = var.enable_xray_tracing
  cors_allowed_origins     = var.cors_allowed_origins
  throttling_rate_limit    = var.throttling_rate_limit
  throttling_burst_limit   = var.throttling_burst_limit
  alarm_email              = var.alarm_email
}
