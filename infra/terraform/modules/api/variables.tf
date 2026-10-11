variable "environment" {
  type = string
}

variable "api_package_path" {
  description = "Zip of the published FieldMate.Api (linux-arm64) including rds-global-bundle.pem."
  type        = string
}

variable "dbops_package_path" {
  description = "Zip of the published FieldMate.Database (linux-arm64) including rds-global-bundle.pem."
  type        = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "lambda_security_group_id" {
  type = string
}

variable "identity" {
  type = object({
    issuer        = string
    audiences     = list(string)
    domain_url    = string
    web_client_id = string
    redirect_uri  = string
    logout_uri    = string
  })
}

variable "database" {
  description = "Null while the database is parked (snapshot taken and instance removed)."
  type = object({
    application_endpoint = string
    instance_address     = string
    port                 = number
    owner_username       = string
    application_username = string
    connect_resource_id  = string
  })
  default = null
}

variable "api_memory_mb" {
  type = number
}

variable "api_reserved_concurrency" {
  description = "-1 = unreserved. A positive value caps concurrency (and therefore database connections)."
  type        = number
}

variable "log_retention_days" {
  type = number
}

variable "dbops_log_retention_days" {
  type = number
}

variable "enable_xray_tracing" {
  type = bool
}

variable "cors_allowed_origins" {
  type = list(string)
}

variable "throttling_rate_limit" {
  type = number
}

variable "throttling_burst_limit" {
  type = number
}

variable "alarm_email" {
  description = "Alarms (and their SNS topic) are created only when an address is given."
  type        = string
}
