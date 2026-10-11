variable "environment" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "engine_version" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "max_allocated_storage" {
  description = "Storage autoscaling ceiling in GiB; null disables autoscaling (cost cap)."
  type        = number
  default     = null
}

variable "multi_az" {
  type = bool
}

variable "backup_retention_days" {
  type = number
}

variable "deletion_protection" {
  type = bool
}

variable "skip_final_snapshot" {
  type = bool
}

variable "snapshot_identifier" {
  description = "Restore from this snapshot (used when un-parking a dev environment)."
  type        = string
  default     = null
}

variable "apply_immediately" {
  type = bool
}

variable "enable_proxy" {
  type = bool
}

variable "application_username" {
  type = string
}
