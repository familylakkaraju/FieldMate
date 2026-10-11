# ADR-006 — Zero-idle-cost non-production environments

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

Non-production environments are idle most of the time. In V00, the only resource that charges while idle is the
RDS instance, plus its storage. Everything else is pay-per-use: Lambda, API Gateway, Cognito within its free
tier, and Parameter Store. AWS restarts a stopped RDS instance automatically after 7 days. RDS can take a final
snapshot only of an *available* instance.

## Decision

* **Nothing with an idle charge runs unless it is being used** (FM-P04). For the dev database:

| Situation | Behaviour |
|---|---|
| Deployment | Restore from the newest park snapshot if parked; start if stopped; migrate; smoke test; then **stop** (unless `keep_database_running` is chosen) |
| Every evening (19:00 UTC, Saturday–Thursday) | **Stop** anything left running (`dev-cost-control.yml`) |
| Every Friday (19:00 UTC) and on demand | **Park**: start if stopped, take a final snapshot, delete; keep only the two newest park snapshots |
| Working session | `dev-env.ps1 start` / `stop`, or deploy with `keep_database_running` |

* Weekly parking means a stopped instance never reaches AWS's 7-day automatic restart.
* Pay-per-use resources stay deployed. In particular **Cognito is never parked**: recreating the pool would change the token issuer and orphan identity mappings.
* Cost-bearing features are per-environment switches (FM-P05). RDS Proxy, Multi-AZ, X-Ray tracing and alarms are off in dev.
* **Production is never stopped or parked by automation.** Its availability and sizing are separate, justified decisions.

## Alternatives considered

| Option | Why not |
|---|---|
| Always-on dev database | About $16/month for an idle instance (FM-P04) |
| Park after every deployment | Zero idle cost, but every deployment pays a 10–15 minute restore. Stopping gives a fast restart during an active week, and weekly parking removes storage cost for longer idleness |
| Stop only, never park | Storage is still charged, and AWS's 7-day auto-restart needs constant re-stopping |
| Aurora Serverless v2 with scale-to-zero | Higher minimum cost per ACU while active, a different engine, and slower resume; standard RDS is the approved store (ADR-001) |
| Local PostgreSQL only, no cloud dev database | Cannot validate IAM authentication, networking or the deployed path |

## Consequences

* First deployment after parking takes about 10–15 minutes longer (snapshot restore). Restores are billed for at least 10 minutes.
* Parking briefly starts a stopped instance, because a final snapshot requires an available instance.
* Dev data persists across parking through snapshots. Snapshots older than the newest two are deleted.
* Restoring re-applies the owner password from Parameter Store (ADR-008), so credentials stay consistent.

## Cost implications

| Dev profile | Approximate monthly cost |
|---|---|
| Left running 24×7 (what this ADR prevents) | about $16 |
| Typical active month: stopped between uses, parked weekly | about $2–3 |
| Idle month (parked throughout) | a few cents (snapshot storage) |

These are estimates at eu-west-2 on-demand rates; confirm with the AWS Pricing Calculator.

## Portability implications

Uses standard RDS start, stop, snapshot and restore through the AWS CLI in scripts. The pattern (stop, snapshot,
delete, restore on deploy) applies to any provider.

## Related principles

FM-P04 No unnecessary idle non-production cost · FM-P05 Environment-aware architecture · FM-P02 Zero-cost-first ·
FM-P03 Free alternative first

## Related verticals

V00 (dev database). Every vertical that introduces an idle-cost resource extends this automation.
