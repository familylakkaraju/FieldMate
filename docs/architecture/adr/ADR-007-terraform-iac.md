# ADR-007 — Terraform as the project IaC tool

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

All infrastructure must be reproducible from code (FM-P33). The original README left the tool open. V00 needed a
choice to provision Cognito, API Gateway, Lambda, RDS, networking, IAM and log groups. The tool should not deepen
provider lock-in unnecessarily (FM-P25), and its state management should add no idle cost (FM-P02).

## Decision

* **Terraform** (≥ 1.11; 1.16 in CI) with the HashiCorp AWS provider (`~> 6.0`). Provider lock files are committed.
* Layout:
  - `infra/terraform/bootstrap`: once per account; state bucket, GitHub OIDC deploy role, owner-password parameters;
  - `infra/terraform/stack`: one state per environment; modules `network`, `identity`, `database`, `api`; per-environment `env/<env>.tfvars`.
* State: S3 backend with **S3-native locking** (`use_lockfile`): no DynamoDB lock table.
* Secrets never enter state. Use ephemeral values and write-only attributes (ADR-008).
* CI runs `fmt -check`, `validate`, and **offline `terraform test`** plans against a mocked provider. Deployment runs plan then apply, through GitHub OIDC (no stored AWS keys).

## Alternatives considered

| Option | Why not |
|---|---|
| AWS CDK (C#) | Same language as the backend, but AWS-only and CloudFormation-bound (FM-P25) |
| AWS SAM / raw CloudFormation | AWS-only; verbose for networking, IAM and identity |
| OpenTofu | Compatible and viable; Terraform chosen for ecosystem and tooling. The HCL stays portable to OpenTofu if licensing ever requires it |
| Pulumi | Additional runtime and service dependency |

## Consequences

* One IaC framework for the whole project. Introducing another requires an ADR.
* Contributors need Terraform ≥ 1.11 locally to plan.
* The mocked-provider tests catch expression and wiring errors, not AWS-side validation; real plans need credentials.

## Cost implications

State storage in S3 costs cents. No lock table, no Terraform Cloud subscription.

## Portability implications

HCL skills and module patterns transfer to other providers. Provider-specific resources are confined to modules.

## Related principles

FM-P33 Infrastructure as Code · FM-P25 Provider portability · FM-P02 Zero-cost-first · FM-P03 Free alternative first

## Related verticals

V00. All later infrastructure.
