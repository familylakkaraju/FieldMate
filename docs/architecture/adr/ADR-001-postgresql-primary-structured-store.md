# ADR-001 — Amazon RDS for PostgreSQL as the primary structured store

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

FieldMate's data is relational and tenant-scoped: organisations, members, customers, jobs, tasks, quotes,
invoices. It needs transactions across those entities, referential integrity and flexible querying for
reporting and search. The X-Ray (data architecture) already selected PostgreSQL. V00 needs the store in place
before any vertical writes data.

## Decision

* Use **standard Amazon RDS for PostgreSQL** (17 at V00) as the system of record (`fieldmate-postgres-{env}`), private, with TLS required.
* Model relationally: PK/FK constraints, tenant-consistent composite keys, `organisation_id`-leading indexes, selective JSONB.
* Manage schema with versioned plain-SQL migrations (up and down scripts, checksummed, advisory-locked), applied by a pipeline-invoked migration function inside the VPC.
* The application connects as a least-privilege role using RDS IAM authentication tokens.
* **RDS Proxy is environment-aware**: off in dev/test, on in production when Lambda concurrency warrants it. Application code is identical either way.
* Search and retrieval: PostgreSQL full-text search first; pgvector in the same database when retrieval is justified.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| Aurora PostgreSQL (provisioned or Serverless v2) | Higher minimum cost; Serverless v2 has a non-zero floor. No requirement needs its features yet |
| DynamoDB | Access patterns are relational and still evolving; would push joins and integrity into code |
| Self-managed PostgreSQL on EC2 | Operational burden (patching, backups, failover) without saving meaningful cost |

## Consequences

* One well-understood datastore. Transactions, constraints and SQL are available to every vertical.
* Any new datastore needs an ADR with a measured requirement (FM-P34).
* RDS bills while an instance exists, so non-production instances must be stopped or parked (ADR-006).

## Cost implications

* Dev: `db.t4g.micro`, single-AZ, 20 GiB gp3, 1-day backups; stopped or parked when idle (ADR-006).
* Production (indicative): `db.t4g.small` plus RDS Proxy (2-vCPU minimum charge). Multi-AZ is a separate, justified decision.

## Portability implications

Standard PostgreSQL. No RDS-specific SQL. The only AWS coupling is IAM token generation, isolated behind
`IDbCredentialProvider` in `FieldMate.Aws`. Any PostgreSQL host works with password authentication.

## Related principles

FM-P14 PostgreSQL-first · FM-P15 Organisation is the tenant boundary · FM-P07 High performance through simplicity ·
FM-P02 Zero-cost-first · FM-P05 Environment-aware architecture

## Related verticals

V00 (schemas `core`, `iam`, `workforce`, `platform`). All later verticals add migrations.
