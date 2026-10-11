# Architecture Decision Records

An ADR records one significant, approved decision: its context, the choice, the alternatives considered and the
consequences. ADRs sit between the [project principles](../FieldMate-Architecture-Principles.md) and the
vertical CRs (see [governance hierarchy](../FieldMate-Architecture-Principles.md#4-governance-hierarchy)):
* they **apply** principles to concrete choices;
* they are the **only** route for an approved exception to a principle.

| ADR | Title | Status | Introduced by |
|---|---|---|---|
| [ADR-001](ADR-001-postgresql-primary-structured-store.md) | Amazon RDS for PostgreSQL as the primary structured store | Accepted | V00 |
| [ADR-002](ADR-002-cognito-initial-identity-broker.md) | Amazon Cognito as the initial identity broker | Accepted | V00 |
| [ADR-003](ADR-003-shared-synchronous-api-lambda.md) | One shared synchronous API Lambda, private subnets, no egress | Accepted | V00 |
| [ADR-004](ADR-004-provider-neutral-fieldmate-identity.md) | Provider-neutral FieldMate identity | Accepted | V00 |
| [ADR-005](ADR-005-minimal-observability.md) | Minimal observability: one structured record per request | Accepted | V00 |
| [ADR-006](ADR-006-zero-idle-cost-non-production.md) | Zero-idle-cost non-production environments | Accepted | V00 |
| [ADR-007](ADR-007-terraform-iac.md) | Terraform as the project IaC tool | Accepted | V00 |
| [ADR-008](ADR-008-parameter-store-for-secrets.md) | SSM Parameter Store for secrets and configuration | Accepted | V00 |
| [ADR-009](ADR-009-relational-records-not-json-documents.md) | First-class data as typed relational records, not JSON documents | Accepted | V00 |

## Rules

* One decision per ADR. Numbers are sequential and never reused.
* Statuses: **Proposed → Accepted → Superseded by ADR-NNN** (or Deprecated). Accepted ADRs are not rewritten; a change of decision is a new ADR that supersedes the old one.
* Every ADR states cost and portability implications and the principles it applies or departs from.
* An ADR that departs from a principle says so explicitly in *Related principles* (see the [exception process](../FieldMate-Architecture-Principles.md#6-deviation-and-exception-process)).

## Template

```markdown
# ADR-NNN — <decision>

**Status:** Proposed | Accepted | Superseded by ADR-NNN · **Date:** YYYY-MM-DD · **Introduced by:** VNN

## Context
## Decision
## Alternatives considered
## Consequences
## Cost implications
## Portability implications
## Related principles
## Related verticals
```
