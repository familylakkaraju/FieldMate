variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment must be dev, test or prod."
  }
}

variable "region" {
  type    = string
  default = "eu-west-2"
}

# --- Packages (built by CI: dotnet publish linux-arm64 + RDS CA bundle, zipped) -------------------------------

variable "api_package_path" {
  type = string
}

variable "dbops_package_path" {
  type = string
}

# --- Network -----------------------------------------------------------------------------------------------------

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

# --- Database ----------------------------------------------------------------------------------------------------

variable "database_enabled" {
  description = "false parks the environment: the RDS instance is removed (snapshot it first). See infra/README.md."
  type        = bool
  default     = true
}

variable "db_engine_version" {
  type    = string
  default = "17"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage" {
  type    = number
  default = null
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_backup_retention_days" {
  type    = number
  default = 1
}

variable "db_deletion_protection" {
  type    = bool
  default = false
}

variable "db_skip_final_snapshot" {
  type    = bool
  default = true
}

variable "db_snapshot_identifier" {
  description = "Restore from this snapshot. The deploy pipeline sets it to the newest park snapshot when the database is parked."
  type        = string
  default     = null
}

variable "db_owner_password" {
  description = <<-EOT
    Value of the SSM parameter /fieldmate/<env>/database/owner-password (created by bootstrap). Ephemeral: never
    stored in state or plan files. CI reads the parameter and sets TF_VAR_db_owner_password.
  EOT
  type        = string
  sensitive   = true
  ephemeral   = true
  default     = null
}

variable "db_owner_password_version" {
  description = "Increment after rotating /fieldmate/<env>/database/owner-password (bootstrap) to apply the new value."
  type        = number
  default     = 1
}

variable "enable_rds_proxy" {
  description = "RDS Proxy has an hourly cost (minimum 2 vCPU). Enable in production when concurrency warrants it."
  type        = bool
  default     = false
}

# --- Identity ----------------------------------------------------------------------------------------------------

variable "cognito_domain_prefix" {
  type    = string
  default = null
}

variable "cognito_deletion_protection" {
  type    = bool
  default = false
}

variable "mfa_configuration" {
  type    = string
  default = "OPTIONAL"
}

variable "self_sign_up_enabled" {
  type    = bool
  default = true
}

variable "web_callback_urls" {
  type    = list(string)
  default = ["http://localhost:5173/auth/callback"]
}

variable "web_logout_urls" {
  type    = list(string)
  default = ["http://localhost:5173/"]
}

variable "enable_smoke_client" {
  type    = bool
  default = false
}

variable "google_client_id" {
  type    = string
  default = ""
}

variable "google_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "microsoft_client_id" {
  type    = string
  default = ""
}

variable "microsoft_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "microsoft_tenant_id" {
  type    = string
  default = ""
}

# --- API ---------------------------------------------------------------------------------------------------------

variable "api_memory_mb" {
  type    = number
  default = 1024
}

variable "api_reserved_concurrency" {
  type    = number
  default = -1
}

variable "cors_allowed_origins" {
  type    = list(string)
  default = ["http://localhost:5173"]
}

variable "throttling_rate_limit" {
  type    = number
  default = 50
}

variable "throttling_burst_limit" {
  type    = number
  default = 100
}

# --- Observability -------------------------------------------------------------------------------------------------

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "dbops_log_retention_days" {
  type    = number
  default = 30
}

variable "enable_xray_tracing" {
  type    = bool
  default = false
}

variable "alarm_email" {
  type    = string
  default = ""
}
