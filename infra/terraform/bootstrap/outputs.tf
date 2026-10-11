output "state_bucket" {
  description = "Set as the GitHub variable TF_STATE_BUCKET."
  value       = aws_s3_bucket.state.bucket
}

output "deploy_role_arn" {
  description = "Set as the GitHub variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deploy.arn
}

output "db_owner_password_parameters" {
  description = "SSM SecureString parameter per environment (names only; values are never output)."
  value       = { for env, parameter in aws_ssm_parameter.db_owner_password : env => parameter.name }
}
