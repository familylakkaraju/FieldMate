output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "issuer" {
  description = "OIDC issuer; also the iss claim of every token and the API Gateway authorizer issuer."
  value       = "https://${aws_cognito_user_pool.this.endpoint}"
}

output "domain_url" {
  value = "https://${local.domain_host}"
}

output "web_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "smoke_client_id" {
  value = var.enable_smoke_client ? aws_cognito_user_pool_client.smoke[0].id : null
}

output "audiences" {
  description = "Client IDs accepted by the API."
  value       = concat([aws_cognito_user_pool_client.web.id], aws_cognito_user_pool_client.smoke[*].id)
}

output "federated_providers" {
  value = local.federated_providers
}
