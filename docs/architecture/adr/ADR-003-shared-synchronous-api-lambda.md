# ADR-003 — One shared synchronous API Lambda, private subnets, no egress

**Status:** Accepted · **Date:** 2026-10-11 · **Introduced by:** V00

## Context

FieldMate needs one HTTPS API for web and mobile clients. Traffic is low and bursty, especially early on, so idle
cost matters more than peak throughput. Logical capabilities (identity, organisations, Access Core, later jobs,
quotes, …) are many, but none yet justifies separate deployment (FM-P29). The database is private, and a NAT
Gateway would cost more than the rest of the dev environment.

## Decision

* One **API Gateway HTTP API** in front of **one .NET 10 Lambda**, `fieldmate-api-{env}` (managed `dotnet10` runtime, arm64), hosting an ASP.NET Core minimal-API application organised by capability modules.
* The same application runs unchanged on Kestrel locally. Lambda hosting is a single registration.
* The Lambda runs in **private subnets with no internet egress**: no NAT Gateway and no VPC endpoints. This works because:
  - the **API Gateway JWT authorizer** verifies token signatures, and the Lambda re-checks the claims (issuer, client, `token_use`, expiry);
  - the database uses **RDS IAM tokens**, generated locally;
  - logs leave via the Lambda service.
* Routes are authenticated by default (explicit methods on `/{proxy+}`). Public routes are listed explicitly. Preflight is answered by API Gateway's CORS configuration.
* A second function, `fieldmate-db-ops-{env}`, runs migrations inside the VPC. It is operational only and never exposed through API Gateway.

## Alternatives considered

| Option | Why not (now) |
|---|---|
| One Lambda per endpoint or capability | Deployment fragmentation, more cold starts, duplicated configuration (FM-P29) |
| Containers (ECS/Fargate, App Runner) | Always-on minimum cost (FM-P04) |
| Lambda outside the VPC with a public database | Weaker security posture |
| Lambda in VPC with a NAT Gateway | About $33+/month idle per environment (FM-P02) |
| Lambda authorizer | Extra invocation, latency and cost; the built-in JWT authorizer is free |

## Consequences

* Zero idle compute cost. Cold starts (.NET, about 1–2 s) are accepted for now. SnapStart or Native AOT are later options if measurements require them.
* Code that needs internet egress from the Lambda (e.g. calling an external API) will need an ADR: NAT, VPC endpoint, or a function outside the VPC.
* Splitting a capability into its own deployment requires an ADR (FM-P29).

## Cost implications

Lambda and HTTP API are pay-per-use, with free tiers covering dev volumes. There are no network idle charges.

## Portability implications

The application is plain ASP.NET Core. The Lambda host and the gateway-claims adapter are confined to
`FieldMate.Aws` and the host composition. The same code runs on any container or VM host.

## Related principles

FM-P29 Modular monolith before microservices · FM-P02 Zero-cost-first · FM-P07 High performance through
simplicity · FM-P11 Standards-first communication · FM-P25 Provider portability

## Related verticals

V00. Later verticals add modules to the same host.
