# ADR-005 — Minimal observability: one structured record per request

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

FieldMate must be able to diagnose failures and attribute activity to an organisation (FM-P36) without paying to
ingest and store logs nobody reads, and without leaking tokens or personal data (FM-P35).

## Decision

* The API's outermost middleware emits **exactly one structured JSON line per request**. The fields are:
  - `level`, `operation` (the X-Ray handler name), `scope` (`PLATFORM` or `ORGANISATION`);
  - `organisationId` (trusted only), `requestedOrganisationId` (on denial), `userId`, `correlationId`;
  - the route template (never the raw path), `status`, `errorCode`, `reason`, `durationMs`, `environment`;
  - exception type, message and stack, for 5xx only.
* No other layer logs successful requests. Framework logging is at Warning. Successful health checks are not logged.
* Never logged: tokens, headers, bodies, passwords, secrets.
* The correlation ID comes from `X-Correlation-Id` (if log-safe), else the W3C `traceparent` trace ID, else is generated. It is echoed in responses and error bodies.
* Metrics come from built-in Lambda and API Gateway metrics (free). Saved Logs Insights queries replace dashboards.
* Explicit retention on every log group, created by Terraform:
  - API: 7 days (dev) / 14 days (prod);
  - migrations: 14 / 30 days;
  - Cognito trigger: 7 days.
* X-Ray tracing and alarms exist as per-environment switches, off by default.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| Full request/response logging | Cost, PII and token leakage (FM-P35) |
| API Gateway access logs as well | Duplicates the application record (FM-P38) |
| OpenTelemetry SDK with always-on tracing | Cold-start and ingestion cost before a measured need. The correlation ID is W3C-compatible, so adding OTel later stays additive |
| CloudWatch dashboards | Charged per dashboard; saved queries are free |

## Consequences

* Diagnosis means querying by `correlationId`, `organisationId`, `operation` or `errorCode` in Logs Insights.
* Business and audit history must be modelled as data, never reconstructed from logs (FM-P39).

## Cost implications

About one short JSON line per request; ingestion is within the free tier at dev volumes. No dashboards, no
tracing charges by default.

## Portability implications

The JSON-line sink writes to stdout behind `ITelemetrySink`. Any log backend that reads stdout works.

## Related principles

FM-P35 Minimal observability · FM-P36 Organisation-level traceability · FM-P37 Explicit retention and cleanup ·
FM-P38 No duplicate telemetry · FM-P39 Business history is not operational logging

## Related verticals

V00. Every later vertical inherits the pipeline. AI verticals add usage and cost records as data (FM-P35, FM-P06).
