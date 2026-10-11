output "api_url" {
  value = module.api.api_url
}

output "api_function_name" {
  value = module.api.api_function_name
}

output "dbops_function_name" {
  value = module.api.dbops_function_name
}

output "user_pool_id" {
  value = module.identity.user_pool_id
}

output "issuer" {
  value = module.identity.issuer
}

output "hosted_login_url" {
  value = module.identity.domain_url
}

output "web_client_id" {
  value = module.identity.web_client_id
}

output "smoke_client_id" {
  value = module.identity.smoke_client_id
}

output "db_instance_identifier" {
  value = var.database_enabled ? module.database[0].instance_identifier : null
}

output "db_owner_password_parameter" {
  value = var.database_enabled ? module.database[0].owner_password_parameter : null
}
