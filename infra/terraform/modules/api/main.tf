# fieldmate-api-{env}: one synchronous API Lambda behind an API Gateway HTTP API (CR AP-20), plus
# fieldmate-db-ops-{env} for migrations inside the VPC. No per-endpoint Lambdas.

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

locals {
  region              = data.aws_region.current.region
  api_function_name   = "fieldmate-api-${var.environment}"
  dbops_function_name = "fieldmate-db-ops-${var.environment}"
  root_certificate    = "/var/task/rds-global-bundle.pem"
  database_configured = var.database != null

  identity_settings = merge(
    {
      "FieldMate__Environment"                       = var.environment
      "Identity__Mode"                               = "ApiGateway"
      "Identity__ProviderName"                       = "COGNITO"
      "Identity__Issuer"                             = var.identity.issuer
      "Identity__EntryPoints__AuthorizationEndpoint" = "${var.identity.domain_url}/oauth2/authorize"
      "Identity__EntryPoints__TokenEndpoint"         = "${var.identity.domain_url}/oauth2/token"
      "Identity__EntryPoints__ClientId"              = var.identity.web_client_id
      "Identity__EntryPoints__Scopes__0"             = "openid"
      "Identity__EntryPoints__Scopes__1"             = "email"
      "Identity__EntryPoints__Scopes__2"             = "profile"
      "Identity__EntryPoints__RegistrationUrl"       = "${var.identity.domain_url}/signup?client_id=${var.identity.web_client_id}&response_type=code&redirect_uri=${urlencode(var.identity.redirect_uri)}"
      "Identity__EntryPoints__PasswordResetUrl"      = "${var.identity.domain_url}/forgotPassword?client_id=${var.identity.web_client_id}&response_type=code&redirect_uri=${urlencode(var.identity.redirect_uri)}"
      "Identity__EntryPoints__LogoutUrl"             = "${var.identity.domain_url}/logout?client_id=${var.identity.web_client_id}&logout_uri=${urlencode(var.identity.logout_uri)}"
    },
    { for index, audience in var.identity.audiences : "Identity__Audiences__${index}" => audience },
  )

  database_settings = local.database_configured ? {
    "Database__Host"                = var.database.application_endpoint
    "Database__Port"                = tostring(var.database.port)
    "Database__Name"                = "fieldmate"
    "Database__Username"            = var.database.application_username
    "Database__Authentication"      = "Dynamic"
    "Database__SslMode"             = "VerifyFull"
    "Database__RootCertificatePath" = local.root_certificate
  } : {}
}

# ---------------------------------------------------------------------------------------------------------------
# Log groups with explicit retention (CR AP-17). Pre-created so Lambda never creates a never-expiring group.
# ---------------------------------------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.api_function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "dbops" {
  name              = "/aws/lambda/${local.dbops_function_name}"
  retention_in_days = var.dbops_log_retention_days
}

# ---------------------------------------------------------------------------------------------------------------
# IAM: least privilege per function.
# ---------------------------------------------------------------------------------------------------------------
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = local.api_function_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role" "dbops" {
  name               = local.dbops_function_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# ENI management for VPC-attached functions (resource-level scoping is not supported for these actions).
resource "aws_iam_role_policy_attachment" "api_vpc" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "dbops_vpc" {
  role       = aws_iam_role.dbops.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "api_xray" {
  count      = var.enable_xray_tracing ? 1 : 0
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# The API may connect to PostgreSQL only as fieldmate_app, only through IAM authentication.
resource "aws_iam_role_policy" "api_database_connect" {
  count = local.database_configured ? 1 : 0
  name  = "connect-as-fieldmate-app"
  role  = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "rds-db:connect"
      Resource = "arn:aws:rds-db:${local.region}:${data.aws_caller_identity.current.account_id}:dbuser:${var.database.connect_resource_id}/${var.database.application_username}"
    }]
  })
}

# ---------------------------------------------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------------------------------------------
resource "aws_lambda_function" "api" {
  function_name    = local.api_function_name
  role             = aws_iam_role.api.arn
  runtime          = "dotnet10"
  handler          = "FieldMate.Api" # executable assembly hosted by Amazon.Lambda.AspNetCoreServer.Hosting
  architectures    = ["arm64"]
  memory_size      = var.api_memory_mb
  timeout          = 15
  filename         = var.api_package_path
  source_code_hash = filebase64sha256(var.api_package_path)

  reserved_concurrent_executions = var.api_reserved_concurrency

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = merge(local.identity_settings, local.database_settings)
  }

  # Text format: the application already writes one JSON line per request; JSON format would double-encode it.
  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.api.name
  }

  tracing_config {
    mode = var.enable_xray_tracing ? "Active" : "PassThrough"
  }

  depends_on = [aws_iam_role_policy_attachment.api_vpc]
}

resource "aws_lambda_function" "dbops" {
  function_name    = local.dbops_function_name
  role             = aws_iam_role.dbops.arn
  runtime          = "dotnet10"
  handler          = "FieldMate.Database::FieldMate.Database.DbOpsFunction::HandleAsync"
  architectures    = ["arm64"]
  memory_size      = 512
  timeout          = 300
  filename         = var.dbops_package_path
  source_code_hash = filebase64sha256(var.dbops_package_path)

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      FIELDMATE_ENVIRONMENT         = var.environment
      FIELDMATE_DB_HOST             = local.database_configured ? var.database.instance_address : ""
      FIELDMATE_DB_PORT             = local.database_configured ? tostring(var.database.port) : "5432"
      FIELDMATE_DB_NAME             = "fieldmate"
      FIELDMATE_DB_USERNAME         = local.database_configured ? var.database.owner_username : ""
      FIELDMATE_DB_ROOT_CERTIFICATE = local.root_certificate
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.dbops.name
  }

  depends_on = [aws_iam_role_policy_attachment.dbops_vpc]
}

# ---------------------------------------------------------------------------------------------------------------
# HTTP API. Every route requires a valid Cognito access token unless explicitly listed as public.
# ---------------------------------------------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "this" {
  name          = local.api_function_name
  protocol_type = "HTTP"

  # Preflight is answered by API Gateway itself (no Lambda invocation, no authorizer).
  cors_configuration {
    allow_origins  = var.cors_allowed_origins
    allow_methods  = ["GET", "POST", "PUT", "PATCH", "DELETE"]
    allow_headers  = ["authorization", "content-type", "idempotency-key", "x-correlation-id", "x-organisation-id"]
    expose_headers = ["x-correlation-id"]
    max_age        = 3600
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.this.id
  name             = "cognito-${var.environment}"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = var.identity.issuer
    audience = var.identity.audiences
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 15000
}

# Authenticated by default: explicit methods (not ANY) so CORS preflight never hits the authorizer.
resource "aws_apigatewayv2_route" "authenticated" {
  for_each           = toset(["GET", "POST", "PUT", "PATCH", "DELETE"])
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "${each.key} /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "public" {
  for_each  = toset(["GET /health", "GET /identity/welcome-landing"])
  api_id    = aws_apigatewayv2_api.this.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  # Throttling caps cost and protects the database. No access logging: the Lambda already writes the one
  # request record (CR AP-18).
  default_route_settings {
    throttling_burst_limit   = var.throttling_burst_limit
    throttling_rate_limit    = var.throttling_rate_limit
    detailed_metrics_enabled = false
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}

# ---------------------------------------------------------------------------------------------------------------
# Minimal observability: saved Logs Insights queries (free) and optional alarms.
# ---------------------------------------------------------------------------------------------------------------
resource "aws_cloudwatch_query_definition" "errors_by_organisation" {
  name            = "fieldmate/${var.environment}/errors-by-organisation"
  log_group_names = [aws_cloudwatch_log_group.api.name]
  query_string    = <<-EOT
    fields @timestamp, operation, errorCode, reason, organisationId, requestedOrganisationId, userId, correlationId
    | filter level in ["WARN", "ERROR"]
    | stats count(*) as failures by organisationId, operation, errorCode
    | sort failures desc
  EOT
}

resource "aws_cloudwatch_query_definition" "latency_by_operation" {
  name            = "fieldmate/${var.environment}/latency-by-operation"
  log_group_names = [aws_cloudwatch_log_group.api.name]
  query_string    = <<-EOT
    filter ispresent(operation)
    | stats count(*) as requests, avg(durationMs) as avgMs, pct(durationMs, 95) as p95Ms by operation
    | sort p95Ms desc
  EOT
}

resource "aws_cloudwatch_query_definition" "trace_correlation" {
  name            = "fieldmate/${var.environment}/trace-correlation-id"
  log_group_names = [aws_cloudwatch_log_group.api.name]
  query_string    = <<-EOT
    fields @timestamp, level, operation, status, errorCode, reason, organisationId, userId, durationMs, exceptionType, exceptionMessage
    | filter correlationId = "REPLACE_WITH_CORRELATION_ID"
    | sort @timestamp asc
  EOT
}

resource "aws_sns_topic" "alarms" {
  count = var.alarm_email != "" ? 1 : 0
  name  = "fieldmate-alarms-${var.environment}"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  count               = var.alarm_email != "" ? 1 : 0
  alarm_name          = "${local.api_function_name}-errors"
  alarm_description   = "Unhandled errors in fieldmate-api (500 responses are emitted as ERROR telemetry; this catches crashes and timeouts)."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.api.function_name }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  count               = var.alarm_email != "" ? 1 : 0
  alarm_name          = "${local.api_function_name}-5xx"
  alarm_description   = "Server errors returned by the HTTP API."
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  dimensions          = { ApiId = aws_apigatewayv2_api.this.id, Stage = "$default" }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
}
