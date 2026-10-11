# Offline plan tests (no AWS credentials): `terraform test` in infra/terraform/stack.
# They evaluate every expression path - dev, prod-like with RDS Proxy, and a parked (database-less) environment.

mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = { names = ["eu-west-2a", "eu-west-2b", "eu-west-2c"] }
  }

  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }

  mock_data "aws_region" {
    defaults = { region = "eu-west-2" }
  }

  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }

  mock_resource "aws_db_instance" {
    defaults = {
      resource_id        = "db-ABCDEFGHIJKLMNOP"
      address            = "fieldmate-postgres.example.eu-west-2.rds.amazonaws.com"
      port               = 5432
      master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds!db-x", kms_key_id = "", secret_status = "active" }]
    }
  }

  mock_resource "aws_db_proxy" {
    defaults = {
      arn      = "arn:aws:rds:eu-west-2:123456789012:db-proxy:prx-0123456789abcdef0"
      endpoint = "fieldmate-rds-proxy.proxy-example.eu-west-2.rds.amazonaws.com"
    }
  }

  mock_resource "aws_cognito_user_pool" {
    defaults = {
      arn      = "arn:aws:cognito-idp:eu-west-2:123456789012:userpool/eu-west-2_TEST"
      endpoint = "cognito-idp.eu-west-2.amazonaws.com/eu-west-2_TEST"
    }
  }

  mock_resource "aws_apigatewayv2_api" {
    defaults = { execution_arn = "arn:aws:execute-api:eu-west-2:123456789012:abcdef1234" }
  }

  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/fieldmate-mock" }
  }

  mock_resource "aws_sns_topic" {
    defaults = { arn = "arn:aws:sns:eu-west-2:123456789012:fieldmate-alarms-mock" }
  }

  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:eu-west-2:123456789012:log-group:/aws/lambda/mock" }
  }

  mock_resource "aws_lambda_function" {
    defaults = {
      arn        = "arn:aws:lambda:eu-west-2:123456789012:function:mock"
      invoke_arn = "arn:aws:apigateway:eu-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-west-2:123456789012:function:mock/invocations"
    }
  }
}

variables {
  api_package_path   = "./tests/fixtures/package.zip"
  dbops_package_path = "./tests/fixtures/package.zip"
}

run "dev" {
  command = apply

  variables {
    environment         = "dev"
    enable_smoke_client = true
  }

  assert {
    condition     = output.db_instance_identifier == "fieldmate-postgres-dev"
    error_message = "dev should have a database named per the X-Ray convention."
  }

  assert {
    condition     = output.smoke_client_id != null
    error_message = "dev should have a smoke-test client."
  }
}

run "prod_like_with_proxy" {
  command = apply

  variables {
    environment            = "prod"
    enable_rds_proxy       = true
    db_deletion_protection = true
    db_skip_final_snapshot = false
    alarm_email            = "ops@example.invalid"
  }

  assert {
    condition     = output.smoke_client_id == null
    error_message = "prod must not have a smoke-test client."
  }
}

run "parked_dev_without_database" {
  command = apply

  variables {
    environment      = "dev"
    database_enabled = false
  }

  assert {
    condition     = output.db_instance_identifier == null && output.db_owner_secret_arn == null
    error_message = "a parked environment has no database."
  }
}
