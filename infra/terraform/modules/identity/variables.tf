variable "environment" {
  type = string
}

variable "domain_prefix" {
  description = "Globally unique Cognito managed-login domain prefix."
  type        = string
}

variable "deletion_protection" {
  type = bool
}

variable "mfa_configuration" {
  description = "OFF or OPTIONAL. ON (required) would disable passwordless passkey sign-in."
  type        = string

  validation {
    condition     = contains(["OFF", "OPTIONAL"], var.mfa_configuration)
    error_message = "mfa_configuration must be OFF or OPTIONAL."
  }
}

variable "self_sign_up_enabled" {
  type = bool
}

variable "web_callback_urls" {
  type = list(string)
}

variable "web_logout_urls" {
  type = list(string)
}

variable "enable_smoke_client" {
  type = bool
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
  description = "Entra tenant ID for the Microsoft OIDC provider."
  type        = string
  default     = ""
}
