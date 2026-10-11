variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "github_repository" {
  description = "owner/name of the repository allowed to deploy."
  type        = string
  default     = "familylakkaraju/FieldMate"
}

variable "environments" {
  description = "Environments: GitHub environments allowed to assume the deploy role (protect 'prod' with required reviewers), each with its own database owner password parameter."
  type        = list(string)
  default     = ["dev", "prod"]
}

variable "db_owner_password_version" {
  description = "Increment to generate new database owner passwords (then increment the stack's variable to apply them)."
  type        = number
  default     = 1
}
