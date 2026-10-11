# fieldmate-users-{env}: the single FieldMate Cognito user pool (CR AP-10).
#
# Cognito authenticates and brokers federation only. No custom attributes and no groups: organisation, role,
# permission, worker, subscription and every other application mapping lives in PostgreSQL (CR AP-08).

data "aws_region" "current" {}

locals {
  domain_host = "${var.domain_prefix}.auth.${data.aws_region.current.region}.amazoncognito.com"
  federated_providers = concat(
    var.google_client_id != "" ? ["Google"] : [],
    var.microsoft_client_id != "" ? ["Microsoft"] : [],
  )
}

# ---------------------------------------------------------------------------------------------------------------
# Pre-token-generation trigger: standard profile claims into the access token (see pre_token_generation.py).
# ---------------------------------------------------------------------------------------------------------------
data "archive_file" "pre_token" {
  type        = "zip"
  source_file = "${path.module}/pre_token_generation.py"
  output_path = "${path.root}/.build/pre_token_generation.zip"
}

resource "aws_cloudwatch_log_group" "pre_token" {
  name              = "/aws/lambda/fieldmate-pre-token-${var.environment}"
  retention_in_days = 7
}

resource "aws_iam_role" "pre_token" {
  name = "fieldmate-pre-token-${var.environment}"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "pre_token_logs" {
  name = "write-own-logs"
  role = aws_iam_role.pre_token.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.pre_token.arn}:*"
    }]
  })
}

resource "aws_lambda_function" "pre_token" {
  function_name    = "fieldmate-pre-token-${var.environment}"
  role             = aws_iam_role.pre_token.arn
  runtime          = "python3.13"
  handler          = "pre_token_generation.handler"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 5
  filename         = data.archive_file.pre_token.output_path
  source_code_hash = data.archive_file.pre_token.output_base64sha256

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.pre_token.name
  }
}

resource "aws_lambda_permission" "cognito_invoke_pre_token" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_token.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}

# ---------------------------------------------------------------------------------------------------------------
# User pool
# ---------------------------------------------------------------------------------------------------------------
resource "aws_cognito_user_pool" "this" {
  name = "fieldmate-users-${var.environment}"

  # Essentials: required for passkeys, choice-based sign-in and access-token customisation.
  # Free tier: 10,000 MAU (direct/social) and 50 MAU (SAML/OIDC federation) per month, not time-limited.
  user_pool_tier      = "ESSENTIALS"
  deletion_protection = var.deletion_protection ? "ACTIVE" : "INACTIVE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  # Native sign-in: password or passkey as the first factor.
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "WEB_AUTHN"]
  }

  # The relying party ID is left unset: without a custom domain Cognito defaults it to the pool's prefix domain.
  # Setting that domain explicitly fails on a new pool, because the domain resource can only exist after the pool.
  web_authn_configuration {
    user_verification = "preferred"
  }

  # MFA is a policy of the native route, not another pool. It is OPTIONAL (TOTP, no SMS cost); Cognito does not
  # apply it to federated sign-ins, whose upstream IdP MFA is authoritative (CR AP-10).
  mfa_configuration = var.mfa_configuration

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 3
    password_history_size            = 5
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = !var.self_sign_up_enabled
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  # Cognito's built-in email sender (low daily quota, no cost). Move to SES before production volumes.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  lambda_config {
    pre_token_generation_config {
      lambda_arn     = aws_lambda_function.pre_token.arn
      lambda_version = "V2_0"
    }
  }
}

resource "aws_cognito_user_pool_domain" "this" {
  domain                = var.domain_prefix
  user_pool_id          = aws_cognito_user_pool.this.id
  managed_login_version = 2
}

# ---------------------------------------------------------------------------------------------------------------
# Federated providers: created only when credentials are supplied (never hard-coded; passed as sensitive vars).
# ---------------------------------------------------------------------------------------------------------------
resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    name           = "name"
    username       = "sub"
  }
}

resource "aws_cognito_identity_provider" "microsoft" {
  count         = var.microsoft_client_id != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Microsoft"
  provider_type = "OIDC"

  provider_details = {
    client_id                 = var.microsoft_client_id
    client_secret             = var.microsoft_client_secret
    oidc_issuer               = "https://login.microsoftonline.com/${var.microsoft_tenant_id}/v2.0"
    attributes_request_method = "GET"
    authorize_scopes          = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
  }
}

# ---------------------------------------------------------------------------------------------------------------
# App clients
# ---------------------------------------------------------------------------------------------------------------
resource "aws_cognito_user_pool_client" "web" {
  name            = "fieldmate-web-${var.environment}"
  user_pool_id    = aws_cognito_user_pool.this.id
  generate_secret = false # public client: authorization code + PKCE

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = var.web_callback_urls
  logout_urls                          = var.web_logout_urls
  supported_identity_providers         = concat(["COGNITO"], local.federated_providers)

  explicit_auth_flows           = ["ALLOW_USER_AUTH", "ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED" # no account enumeration
  enable_token_revocation       = true

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  auth_session_validity  = 3

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  read_attributes  = ["email", "email_verified", "name"]
  write_attributes = ["email", "name"]

  depends_on = [aws_cognito_identity_provider.google, aws_cognito_identity_provider.microsoft]
}

resource "aws_cognito_managed_login_branding" "web" {
  client_id                   = aws_cognito_user_pool_client.web.id
  user_pool_id                = aws_cognito_user_pool.this.id
  use_cognito_provided_values = true
}

# Non-production only: lets the pipeline obtain a token non-interactively for smoke tests.
resource "aws_cognito_user_pool_client" "smoke" {
  count           = var.enable_smoke_client ? 1 : 0
  name            = "fieldmate-smoke-${var.environment}"
  user_pool_id    = aws_cognito_user_pool.this.id
  generate_secret = false

  explicit_auth_flows           = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  supported_identity_providers  = ["COGNITO"]

  access_token_validity  = 15
  id_token_validity      = 15
  refresh_token_validity = 1

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
