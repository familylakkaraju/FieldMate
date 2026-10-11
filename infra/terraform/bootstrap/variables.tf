variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "github_repository" {
  description = "owner/name of the repository allowed to deploy."
  type        = string
  default     = "familylakkaraju/FieldMate"
}

variable "github_environments" {
  description = "GitHub environments whose jobs may assume the deploy role. Protect 'prod' with required reviewers."
  type        = list(string)
  default     = ["dev", "prod"]
}
