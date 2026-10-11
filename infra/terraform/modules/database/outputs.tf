output "instance_identifier" {
  value = aws_db_instance.this.identifier
}

output "instance_address" {
  description = "Direct instance endpoint (used by migrations)."
  value       = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "owner_username" {
  value = aws_db_instance.this.username
}

output "owner_secret_arn" {
  description = "RDS-managed Secrets Manager secret for the owner password (read by the pipeline only)."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "application_endpoint" {
  description = "What the API connects to: RDS Proxy when enabled, otherwise the instance."
  value       = var.enable_proxy ? aws_db_proxy.this[0].endpoint : aws_db_instance.this.address
}

output "application_connect_resource_id" {
  description = "Resource ID used in the rds-db:connect ARN for the application user (proxy or instance)."
  value       = var.enable_proxy ? element(split(":", aws_db_proxy.this[0].arn), 6) : aws_db_instance.this.resource_id
}
