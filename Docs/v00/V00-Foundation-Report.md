# V00 Foundation — implementation report

**CR:** CR-FM-V00 Foundation, plus the V00 addendum *No orphan FieldMate users*
**Branch:** `cr/fm-v00-foundation`
**Status:** implemented and verified locally; **not yet deployed to AWS** (see §17 and §20)

Code: [`backend/`](../../backend/README.md) · Infrastructure and runbook: [`infra/`](../../infra/README.md) ·
Pipelines: [`.github/workflows/backend-*.yml`](../../.github/workflows/), [`dev-shutdown.yml`](../../.github/workflows/dev-shutdown.yml)

---

## 1. Scope implemented

| Area | Delivered |
|---|---|
| API host | One ASP.NET Core minimal-API host: `fieldmate-api-{env}` on Lambda (`dotnet10`, arm64) behind an API Gateway HTTP API; the same binary runs on Kestrel locally |
| Identity | One Cognito user pool; a narrow `IIdentityProviderAdapter`; canonical user and `issuer + subject` mappings in PostgreSQL |
| Onboarding (addendum) | Users are created **only** by creating an organisation or accepting an invitation, atomically with their first membership |
| Organisation context | `X-Organisation-Id` is validated on every request against an active membership of an active organisation |
| Access Core | Authenticated → membership → role permission → tenant boundary → resource-policy hook |
| Data | RDS for PostgreSQL 17; 4 plain-SQL migrations with up/down scripts; checksummed, advisory-locked runner; least-privilege runtime role |
| Telemetry | One structured JSON line per request with `organisationId` and `correlationId`; no payloads or tokens; explicit retention |
| IaC | Terraform: bootstrap (state + OIDC deploy role) and a per-environment stack (network, identity, database, api) |
| CI/CD | GitHub Actions: CI (format, build, unit + PostgreSQL integration tests, Terraform validate/test, packaging), deploy (apply → migrate → smoke), nightly dev shutdown |

Not built, per CR §4: customers, jobs, tasks, scheduling, quotes, invoices, files, AI, voice, subscriptions,
domains and integrations. **No changes were made to `demo/`.**

## 2. Architecture X-Ray rows used

| X-Ray row | Route / handler | V00 implementation |
|---|---|---|
| Entry & Identity · Welcome / Landing | `GET /identity/welcome-landing` · GetWelcomeLanding | Public; returns provider-hosted auth entry points only (branding/content later) |
| Entry & Identity · Sign In, Register, Forgot / Reset Password | Managed by IdP | Cognito managed login v2; not reimplemented in Lambda |
| Entry & Identity · Passkey Setup (Later) | — | Passkeys enabled as a sign-in factor; enrolment through managed login |
| Entry & Identity · Choose Organisation | `GET /identity/choose-organisation` · GetChooseOrganisation | Built; replaces the CR's indicative `/me/organisations` |
| Entry & Identity · Accept Invitation | `POST /identity/accept-invitation` · ExecuteAcceptInvitation | Built (required by the addendum); `iam.invitation` added |
| Business Onboarding · Create Business | `POST /onboarding/create-business` · ExecuteCreateBusiness | Built for `core.organisation` + OWNER membership only; `config.*` tables belong to onboarding later |
| Team & Access · Team | `/team/*`, policy `team/role manage` | `GET /team/members` (read) as the real Access Core-protected endpoint |
| Subscription & Account · Security | `GET /me/sessions` | Not built; `GET /me` follows the same `/me` prefix |
| Platform Operations · Platform Health | `GET /admin/health` (platform.admin) | Not built; V00 provides public liveness `GET /health` (CR §9) |
| Legend · naming | `fieldmate-api/-users/-postgres/-rds-proxy-{env}` | Used as specified |

## 3. Deviations from the CR or X-Ray

| # | Deviation | Reason |
|---|---|---|
| D1 | **No first-login provisioning endpoint**; users are created only by `create-business` or `accept-invitation` | V00 addendum (supersedes CR §7.1 / §10 of the execution prompt). Unknown identities get `403 IDENTITY_NOT_PROVISIONED` and nothing is persisted |
| D2 | `iam.invitation` and `platform.idempotency_record` added to the V00 model | Required for atomic, idempotent onboarding under the addendum |
| D3 | `identity_type ∈ {NATIVE, FEDERATED}`; the identity diagram's `PASSKEY` type is not used | A passkey is an authenticator on the same Cognito identity (same `sub`); it cannot be a separate `issuer + subject` row |
| D4 | `upstream_subject` added to `iam.authentication_identity` | Enables deterministic re-linking of federated users if Cognito is replaced (CR §15), without matching on email |
| D5 | No `POST /me/organisation-context` | Stateless: the requested organisation travels in a header and is re-validated on every request; no session state to expire or leak |
| D6 | On AWS, the JWT signature is verified by the API Gateway JWT authorizer; the Lambda adapter re-checks issuer, client, `token_use`, expiry | The API Lambda has no internet egress (no NAT), so it cannot fetch JWKS. The in-process JWKS validator is used locally, in tests and for non-AWS hosting |
| D7 | A small Cognito pre-token-generation Lambda adds `email`, `email_verified`, `name`, `idp`, `idp_subject` to access tokens | Lets the API identify a person at onboarding without calling the IdP. Provider-neutral claim names only; no application data |
| D8 | A second Lambda, `fieldmate-db-ops-{env}`, runs migrations | The database is private; CI cannot reach it. Operational only, never behind API Gateway |
| D9 | `GET /team/members` is a new read route under X-Ray's `/team` prefix | The X-Ray's team routes are auto-generated commands (`POST /team/team`); a read is the smallest real permission-gated endpoint |
| D10 | Cognito **Essentials** tier | Required for passkeys, choice-based sign-in and access-token customisation; same 10,000-MAU free tier as Lite |
| D11 | The CR references `Docs/…`; the folder is `docs/` | Case matters on Linux CI; links in this report use `docs/` |

## 4. AWS resources (per environment, via Terraform)

VPC with two private subnets and three security groups (no IGW/NAT/endpoints) · Cognito user pool
`fieldmate-users-{env}` with managed-login domain, branding, web client, optional smoke client and optional
Google/Microsoft IdPs · Lambda `fieldmate-pre-token-{env}` · RDS PostgreSQL `fieldmate-postgres-{env}` with subnet
group and RDS-managed owner secret · optional `fieldmate-rds-proxy-{env}` (end-to-end IAM auth) · Lambdas
`fieldmate-api-{env}` and `fieldmate-db-ops-{env}` with per-function IAM roles · HTTP API with JWT authorizer, routes
and throttled `$default` stage · log groups with explicit retention · 3 saved Logs Insights queries · optional SNS
topic and 2 alarms.

Bootstrap, once per account: S3 state bucket (versioned, encrypted, TLS-only), GitHub OIDC provider,
`fieldmate-github-deploy` role.

## 5. Resources intentionally not created

| Not created | Why |
|---|---|
| NAT Gateway, VPC interface endpoints | about $33+/month and about $7/month per AZ idle; designed out (D6, IAM DB auth) |
| RDS Proxy in dev/test | about $22–26/month minimum (2 vCPU); flag on for prod only |
| Aurora, DynamoDB (including for Terraform locks), ElastiCache, OpenSearch | CR non-goals; Terraform uses S3-native locking |
| Lambda authorizer | The built-in JWT authorizer is free and adds no cold start |
| API Gateway access logs, CloudWatch dashboards | Duplicate telemetry (CR AP-18) / per-dashboard charge; saved queries instead |
| X-Ray active tracing, Enhanced Monitoring, Performance Insights, RDS log exports | Off by default; flags exist |
| KMS customer-managed keys | AWS-managed keys are free and sufficient for V00 |
| SES, SMS (SNS) | Cognito's default email is enough for dev; SMS MFA costs per message (TOTP used instead) |

## 6. PostgreSQL schemas, tables and migrations

| Migration | Contents |
|---|---|
| `0001_foundation_schema` | Schemas `core`, `iam`, `workforce`. Tables `core.organisation`, `iam.user_profile`, `iam.authentication_identity`, `iam.role`, `iam.permission`, `iam.role_permission`, `iam.organisation_member`, `workforce.worker`. `updated_at` triggers |
| `0002_system_roles_and_permissions` | System roles OWNER, ADMIN, MANAGER, WORKER; permissions `organisation.read/manage`, `team.read/manage` |
| `0003_application_role` | `fieldmate_app`: SELECT/INSERT/UPDATE only (no DELETE, no DDL, read-only reference data); `rds_iam` on RDS |
| `0004_onboarding_and_user_invariant` | `iam.invitation` (hashed tokens), `platform.idempotency_record`, deferred **no-orphan-user** constraint triggers |

Key constraints:
- `UNIQUE (issuer, subject)`; index on `user_id`; partial index on `(provider, upstream_subject)`.
- `UNIQUE (organisation_id, user_id)` on membership.
- **Composite FK** `worker (organisation_id, membership_id) → organisation_member (organisation_id, id)`.
- `UNIQUE NULLS NOT DISTINCT (organisation_id, code)` on roles.
- Triggers that forbid using another tenant's role in a membership or an invitation.
- Every tenant table leads its indexes with `organisation_id`.
- IDs are UUIDs: application-generated v7; DB-seeded reference rows use v4.

Rollback strategy: every migration has a down script, and up → down → up is tested. In dev/test, `rollback` is
available through db-ops. **In production rollback is refused**: forward-fix, or restore the pre-migration
snapshot the pipeline takes automatically.

## 7. Cognito configuration

`fieldmate-users-{env}` (Essentials):
- Email as username, case-insensitive; email auto-verified.
- Self sign-up enabled.
- 12+ character passwords with history of 5.
- Recovery by verified email.
- Pre-token trigger V2.
- **No custom attributes and no groups.**

Web client: public, authorization code + PKCE, scopes `openid email profile`, `ALLOW_USER_AUTH` / SRP / refresh,
user-existence errors suppressed, token revocation on. Access/ID tokens last 60 minutes and refresh tokens 30 days.

## 8. Authentication methods

| Method | Status |
|---|---|
| Native email + password | Enabled |
| Passkey / WebAuthn | Enabled as a first factor (relying party = managed-login domain) |
| TOTP MFA (native) | Optional. MFA cannot be *required* without disabling passwordless sign-in; validated in Terraform |
| Google | Configured when `GOOGLE_CLIENT_ID`/secret are provided; off by default |
| Microsoft / Entra (OIDC) | Configured when client ID/secret/tenant are provided; off by default |
| Federated MFA | Upstream IdP is authoritative; Cognito does not add a second MFA |

## 9. Provider-neutral identity

- **One abstraction, two implementations.** `IIdentityProviderAdapter` returns an `AuthenticatedPrincipal(ProviderSubject(issuer, subject), provider, identityType, email, emailVerified, displayName, upstreamSubject)`.
  - `OidcJwtIdentityProviderAdapter` (Core, standards-only, JWKS, RS256 only) is used locally, in tests and for any future broker.
  - `ApiGatewayVerifiedClaimsAdapter` (`FieldMate.Aws`) is used on AWS.
- **Shared claim rules.** Both apply the same issuer, `aud`/`client_id` (API Gateway precedence) and `token_use=access` checks, so ID tokens are rejected as API credentials.
- **No Cognito types in Core.** Cognito-specific types appear nowhere in `FieldMate.Core`. AWS SDK usage is confined to `FieldMate.Aws`.
- **Passwords.** No table stores passwords, hashes, salts or credentials; a test asserts it.

## 10. Organisation context

- **Validation.** `OrganisationContextService` parses the requested organisation (plain UUID only), then runs one indexed query: active membership in an active organisation, active role, its permissions, and the optional active worker.
- **Trusted context.** `FieldMateRequestContext` has an internal constructor: only that service can create one.
- **No enumeration.** "Not a member" and "organisation does not exist" return identical responses.
- **Choosing an organisation.** `choose-organisation` lists active memberships and returns `autoSelectOrganisationId` when there is exactly one.

## 11. Access Core

The `AccessFilter` endpoint filter runs the CR AP-13 path before any handler. Endpoints declare
`.RequirePermission("team.read")`. `AccessCore` denies, in order:
- no trusted context;
- no membership;
- a missing permission;
- a resource whose `organisationId` differs from the context (always, regardless of policies);
- any `IResourcePolicy` deny. Policies can narrow access but never widen it.

Commercial entitlement checks have a marked insertion point but are not built (CR Phase 5).

## 12. Minimal telemetry

One record per request, from one place (`RequestPipelineMiddleware`). Fields: `level`, `operation`
(= X-Ray handler name), `scope` (PLATFORM/ORGANISATION), `organisationId` (trusted only),
`requestedOrganisationId` (denials only), `userId`, `correlationId`, `route` template, `status`, `errorCode`,
`reason`, `durationMs`, `environment`, plus exception type/message/stack for 500s.

Correlation IDs come from `X-Correlation-Id` (if log-safe), else the W3C `traceparent` trace ID, else are generated.
They are echoed in the response header and in every problem body.

Never logged: tokens, headers, bodies, raw paths, successful health checks. Framework logging is at Warning.

## 13. Log retention and cleanup

API 7 days (dev) / 14 days (prod) · db-ops 14 / 30 days · pre-token trigger 7 days · CI artifacts 7 days. Every
log group is created by Terraform with retention, so none can default to never-expire. Business and audit history
is not reconstructed from logs.

## 14. Security decisions

- **Network.** HTTPS only. The database is private, with `VerifyFull` TLS against the RDS CA bundle packaged with each Lambda.
- **Database credentials.** The API connects as `fieldmate_app` with 15-minute IAM tokens, refreshed every 10 minutes. There is no stored application password and no runtime secrets call.
- **Least privilege.** One IAM role per function: the API may `rds-db:connect` only as `fieldmate_app`. The database role has no DDL and no DELETE.
- **Parameterised SQL.** All SQL uses positional parameters.
- **Anti-enumeration.** Organisation denial, invitation failure and Cognito user-existence errors each give a single uniform response.
- **Invitations.** Tokens are 256-bit random and stored only as SHA-256 hashes. An addressed invitation requires the matching IdP-verified email, which authorises acceptance and never merges accounts.
- **No email merging.** Users are never merged on email; a test proves two identities with the same email become two users.
- **Atomic onboarding.** Each onboarding transaction serialises per identity with an advisory lock, and create-business requires an `Idempotency-Key`.
- **CI access to AWS.** CI uses GitHub OIDC; no long-lived AWS keys exist.

## 15. Cost estimate (approximate, eu-west-2 on-demand; confirm with the AWS Pricing Calculator)

| Environment | Running profile | Approximate monthly cost |
|---|---|---|
| dev, stopped nightly (about 50 h/week up) | `db.t4g.micro` about 220 h + 20 GiB gp3 + secret | **about $7** |
| dev, left running 24×7 | | about $16 |
| dev, parked (snapshot only) | Lambda/API/Cognito idle | **under $1** (snapshot storage) |
| prod (indicative, not deployed) | `db.t4g.small` + RDS Proxy (2 vCPU) + 7-day backups | about $55–65 before traffic; Multi-AZ adds about $26 |

Usage-based items are within free tiers at dev volumes:
- Lambda (1M requests and 400k GB-s/month, permanent).
- API Gateway HTTP API ($1.00 per million requests).
- Cognito (10,000 MAU).
- CloudWatch Logs (5 GB ingestion).

Accounts created after July 2025 use credit-based free plans rather than 12-month RDS hours.

## 16. Dev/test stop and delete procedure

See [`infra/README.md` §4](../../infra/README.md#4-cost-control-and-cleanup-cr-ap-02). In short:
- **Nightly stop:** automatic via `dev-shutdown.yml`; manual with `dev-env.ps1 stop|start`.
- **Long inactivity:** `dev-env.ps1 park` snapshots and removes only the database, keeping Cognito so identities stay valid; `unpark` restores it.
- **Full teardown:** `terraform destroy` (this deletes the user pool).

## 17. Tests executed

Run locally on Windows against PostgreSQL 17.11 (Release build): **99 passed, 0 failed.**

| Category (CR §19) | Coverage |
|---|---|
| Identity | Valid native token; federated mapping (GOOGLE, FEDERATED, upstream subject); invalid, expired, wrong issuer, wrong client, foreign signature, ID token, malformed, no subject; HS256/unsigned rejected; gateway claims missing/expired; unverified email never becomes primary |
| Addendum | Unknown identity persists nothing; create-business atomic; replay and concurrent same-key idempotent; concurrent new-identity requests create one user; existing user adds org without a new user; validation failures persist nothing; **rollback after the user insert leaves no orphan**; DB rejects committing a user without membership; deleting the last membership rejected; accept-invitation atomic with worker; re-accept idempotent; used/expired/revoked/unknown/malformed invitations rejected; addressed invitations need a verified matching email; existing user joins without duplicate; active member gets no duplicate membership; suspended member cannot rejoin; **zero valid memberships denied** (suspended membership or organisation); same email never merges |
| Organisation | One org auto-selects; multiple orgs listed with roles; missing/malformed/empty/unknown org header; foreign org indistinguishable from non-existent; inactive membership in one org doesn't affect another; worker mapping optional |
| Access | OWNER/ADMIN/MANAGER allowed, WORKER denied on `team.read`; permissions evaluated per organisation; team list contains only the trusted organisation's members; unit tests for tenant-boundary and policy-narrowing rules |
| Data | Migrations up → down → up; re-run is a no-op; tampered checksum detected; unique (issuer, subject); FK violations; composite tenant FK; cross-tenant role trigger; system-role uniqueness; tenant indexes present; runtime role cannot DDL, DELETE, write reference data or read migration history; no password columns |
| Telemetry | Exactly one record per request with organisation, user and correlation; denial records the requested organisation only; correlation echoed and unsafe IDs replaced; **tokens and `Bearer` never in rendered logs**; healthy `/health` not logged; onboarding attributed to the new organisation |
| Cost / IaC | `terraform validate` (stack and bootstrap); `terraform test`: dev, prod-like with proxy and alarms, and a **parked** environment plan and apply with a mocked provider; actionlint clean |

## 18. CI/CD and IaC status

| Item | Status |
|---|---|
| `backend-ci.yml` | Written and linted. Not yet run on GitHub (the branch is not pushed) |
| `backend-deploy.yml`, `dev-shutdown.yml` | Written and linted. Inert until `AWS_DEPLOY_ROLE_ARN` and `TF_STATE_BUCKET` are set |
| Terraform | Validated and tested offline. **Never planned against a real account**: no AWS credentials were available in this session |

## 19. Git status

Committed locally on `cr/fm-v00-foundation`. **Not pushed.** The uncommitted Stage-1 prototype work in `demo/`
was left untouched and is not part of this branch's commit.

## 20. Known limitations and deferred V00 items

1. **First real deployment pending.** The Phase 8 chain is automated in `smoke-test.sh` but has not run against real Cognito/RDS. Federated sign-in (Google/Microsoft) has never run end to end.
2. **Migrations use the owner password.** The pipeline passes it to db-ops. Follow-up: an IAM-authenticated `fieldmate_migrator` role.
3. **Deploy role is broad.** It has `PowerUserAccess` plus scoped IAM. Follow-up: a service-scoped policy.
4. **No API for issuing invitations yet.** Only db-ops can create them. `POST /team/invite-member` belongs to the Team & Access vertical.
5. **Missing housekeeping and abuse controls.**
   - `platform.idempotency_record` has no retention job yet.
   - There is no per-identity cap on organisations created; API Gateway throttling is the only limit.
6. **Email sending is not production-ready.** Cognito's default sender has a low daily quota; use SES before production.
7. **Customer-portal identities are not modelled.** Customers are not organisation members; this belongs to a later vertical.
8. **No tracing or cold-start tuning yet.** The OpenTelemetry SDK and X-Ray are not wired (correlation is W3C-compatible). .NET cold start (about 1–2 s) could later use SnapStart or Native AOT.
9. **`prod.tfvars` has placeholder** origins and redirect URIs.

## 21. Readiness for VS01

**Ready to start VS01** on this foundation once the first dev deployment has passed its smoke test.

VS01 can copy these patterns:
- Endpoint plus `.RequirePermission(...)`.
- Organisation-scoped repository queries that take `OrganisationId` from `FieldMateRequestContext` only.
- Tenant tables with `organisation_id` and composite FKs.
- A new numbered SQL migration with a down script, and default grants for `fieldmate_app`.
- The `operation` name equal to the X-Ray handler.

Before any VS01 data is real, resolve limitations 2, 3 and 6.
