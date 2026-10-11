# ADR-008 — SSM Parameter Store for secrets and configuration

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00 (replaces the earlier RDS-managed Secrets Manager secret)

## Context

V00 needs one secret: the database owner password. Only the deployment pipeline uses it, to run migrations. The
API authenticates with IAM tokens and never needs it. The first V00 draft used RDS-managed Secrets Manager
(`manage_master_user_password`), at $0.40 per secret per month, chosen for convenience rather than need (FM-P03).

## Decision

* Store secrets and configuration in **AWS Systems Manager Parameter Store**, standard tier, as `SecureString` encrypted with the AWS-managed `aws/ssm` key.
* Database owner password:
  - Parameter `/fieldmate/<env>/database/owner-password`, created by the bootstrap stack from an **ephemeral** `random_password` through the write-only `value_wo`. It never enters Terraform state.
  - The deploy pipeline reads it and masks it in logs. It passes it to Terraform as an **ephemeral input variable**, applied to the instance through the write-only `password_wo`, so it is never in state or plan files. It is also passed to the migration function in the invocation payload, never logged.
  - It lives outside the environment stack, so it survives parking. A restore re-applies the same value.
* Deploy-role IAM:
  - may read parameters only under `parameter/fieldmate/*`;
  - may not create, change or delete parameters (bootstrap does that, run by an administrator);
  - is denied Secrets Manager entirely. Lifting that requires a new ADR.
* Rotation is a deliberate, two-step version bump: `db_owner_password_version` in bootstrap, then in the environment.

## Alternatives considered

| Option | Why not |
|---|---|
| Secrets Manager (RDS-managed secret) | $0.40/secret/month and convenience-only; managed rotation is not required for a pipeline-only password |
| Terraform `random_password` in state | Password readable by anyone with state access |
| Lambda reading the secret at runtime | Needs egress (NAT or VPC endpoint) from private subnets (ADR-003) |

## Consequences

* No automatic rotation. Rotation is manual and documented.
* Secrets Manager remains available only through a future ADR, e.g. for compliance-mandated managed rotation or cross-account sharing.
* Follow-up: an IAM-authenticated migration role would reduce the owner password to break-glass use only.

## Cost implications

Standard-tier parameters and standard throughput are free; `aws/ssm` key usage is free. This saves $0.40 per
environment per month versus Secrets Manager.

## Portability implications

The application never reads Parameter Store. Only the pipeline does, through the AWS CLI. Moving providers means
changing a pipeline step.

## Related principles

FM-P03 Free alternative first · FM-P02 Zero-cost-first · FM-P40 Security is explicit and proportionate

## Related verticals

V00. Any later vertical needing secrets or configuration uses Parameter Store unless an ADR says otherwise.
