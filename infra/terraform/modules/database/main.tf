# fieldmate-postgres-{env}: standard Amazon RDS for PostgreSQL (not Aurora), plus optional fieldmate-rds-proxy-{env}.

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

resource "aws_db_subnet_group" "this" {
  name       = "fieldmate-postgres-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "this" {
  identifier     = "fieldmate-postgres-${var.environment}"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true # AWS-managed key: no KMS key charge

  db_name  = "fieldmate"
  username = "fieldmate_owner"
  # RDS creates and rotates the owner password in Secrets Manager. Only the deployment pipeline reads it (for
  # migrations); the API authenticates as fieldmate_app with IAM tokens.
  manage_master_user_password         = true
  iam_database_authentication_enabled = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false
  multi_az               = var.multi_az
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  backup_retention_period   = var.backup_retention_days
  backup_window             = "02:00-03:00"
  maintenance_window        = "sun:03:30-sun:04:30"
  copy_tags_to_snapshot     = true
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "fieldmate-postgres-${var.environment}-final"
  snapshot_identifier       = var.snapshot_identifier

  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false
  apply_immediately           = var.apply_immediately

  # Paid observability add-ons stay off by default (CR AP-15, §17): no Enhanced Monitoring, no Performance
  # Insights, no log export to CloudWatch. PostgreSQL logs remain available in RDS at no extra cost.
  monitoring_interval             = 0
  performance_insights_enabled    = false
  enabled_cloudwatch_logs_exports = []

  lifecycle {
    # A restored instance keeps working after the snapshot variable is cleared.
    ignore_changes = [snapshot_identifier]
  }
}

# ---------------------------------------------------------------------------------------------------------------
# Optional RDS Proxy (CR §10): preferred in production when Lambda concurrency warrants it; off in dev/test.
# End-to-end IAM authentication, so no application password secret is needed.
# ---------------------------------------------------------------------------------------------------------------
resource "aws_iam_role" "proxy" {
  count = var.enable_proxy ? 1 : 0
  name  = "fieldmate-rds-proxy-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  })
}

resource "aws_iam_role_policy" "proxy_connect" {
  count = var.enable_proxy ? 1 : 0
  name  = "connect-as-application-user"
  role  = aws_iam_role.proxy[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "rds-db:connect"
      Resource = "arn:aws:rds-db:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.this.resource_id}/${var.application_username}"
    }]
  })
}

resource "aws_db_proxy" "this" {
  count                  = var.enable_proxy ? 1 : 0
  name                   = "fieldmate-rds-proxy-${var.environment}"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = var.subnet_ids
  vpc_security_group_ids = [var.security_group_id]
  require_tls            = true
  idle_client_timeout    = 900
  default_auth_scheme    = "IAM_AUTH"
}

resource "aws_db_proxy_default_target_group" "this" {
  count         = var.enable_proxy ? 1 : 0
  db_proxy_name = aws_db_proxy.this[0].name

  connection_pool_config {
    max_connections_percent      = 75
    max_idle_connections_percent = 25
    connection_borrow_timeout    = 30
  }
}

resource "aws_db_proxy_target" "this" {
  count                  = var.enable_proxy ? 1 : 0
  db_proxy_name          = aws_db_proxy.this[0].name
  target_group_name      = "default" # the proxy's default target group is always named "default"
  db_instance_identifier = aws_db_instance.this.identifier

  depends_on = [aws_db_proxy_default_target_group.this]
}
