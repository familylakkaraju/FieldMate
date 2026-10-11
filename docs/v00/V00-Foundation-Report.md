# V00 Foundation — implementation report

**CR:** [CR-FM-V00 Foundation](CR-FM-V00-Foundation.md), with approved amendments A1–A5 ([CR §23](CR-FM-V00-Foundation.md#23-approved-amendments))\
**Branch:** `cr/fm-v00-foundation`, pushed to origin; not merged to `main`\
**Governed by:** [FieldMate Architecture Principles](../architecture/FieldMate-Architecture-Principles.md) · [ADRs](../architecture/adr/README.md)

| Status | State |
|---|---|
| **Implementation** | **Complete** for V00 scope, including amendments A1–A5 |
| **Local validation** | **Passed**: Release build, 99/99 tests (32 unit, 67 integration on real PostgreSQL 17.11), format, Terraform validate and offline plan tests, actionlint, documentation link check (§11) |
| **Feature branch** | Pushed to `origin/cr/fm-v00-foundation`. **Main merge not yet approved** |
| **AWS deployment** | **Not started**: no AWS credentials were available. Nothing has run on AWS |
| **Environment acceptance** | **Not started**: the Phase 8 chain is automated in `infra/scripts/smoke-test.sh`, pending the first dev deployment (§12, §14) |
| **Production acceptance** | **Not started**: also requires the production hardening items in §9 |

V00 is **not** accepted or production-ready until the AWS deployment and smoke-test gates in §14 have passed.

Code: [`backend/`](../../backend/README.md) · Infrastructure and runbook: [`infra/`](../../infra/README.md) ·
Workflows: `.github/workflows/backend-ci.yml`, `backend-deploy.yml`, `dev-cost-control.yml`

---

## 1. Architecture governance

FieldMate now has an explicit document hierarchy, so each concern has exactly one source of truth:

```text
PROJECT ARCHITECTURE PRINCIPLES   docs/architecture/FieldMate-Architecture-Principles.md
        ↓
ADRs                              docs/architecture/adr/ADR-NNN-*.md
        ↓
VERTICAL CRs                      docs/vNN/CR-*.md          (cite principles by ID; never restate them)
        ↓
IMPLEMENTATION                    backend/, infra/, demo/
        ↓
VERTICAL REPORTS                  docs/vNN/*-Report.md      (evidence, deviations, status)
```

Changes made to establish it:

| Change | Detail |
|---|---|
| New `docs/architecture/` | Principles document (v1.1) and `adr/` with an index, a template and nine ADRs |
| `docs/v00/` | The V00 CR and its diagrams moved here (`git mv`) beside the report |
| **Folder case fixed** | The repository had tracked the folder as `Docs/` since the first prototype commit, while the disk and every link used `docs/`. Windows hid this; GitHub and Linux CI would have broken every `docs/…` link. Normalised to `docs/` with a case-only rename |
| README | §3 principle text replaced by a pointer and section-to-ID map; §26 and §28 point to the principles and checklist. Vision, domain and roadmap content unchanged |
| V00 CR | Cites principles instead of owning AP-01…AP-20 (§5 mapping table keeps `CR AP-nn` code comments resolvable); amendments recorded in §23 |
| Prototype docs | Untouched. `demo/README.md` and the uncommitted Stage-1 notes still mention `Docs/…` in plain text; update them when the prototype is committed |

## 2. Project principles document

[`FieldMate-Architecture-Principles.md`](../architecture/FieldMate-Architecture-Principles.md) (v1.0) is
project-wide, not V00-specific. It opens with purpose, scope, how to use it, the governance hierarchy, the
principle lifecycle, the exception process and an architecture review checklist.

It defines **40 principles** (FM-P01…FM-P40) in 11 groups, each with rule, rationale, required behaviour,
anti-patterns and, where useful, review questions:

| Group | Principles |
|---|---|
| Simplicity | **FM-P01 Keep it simple** (user experience and engineering, with the 7 pre-addition questions) |
| Cost | P02 Zero-cost-first · P03 Free alternative first · P04 No unnecessary idle non-production cost · P05 Environment-aware architecture · P06 Cost is part of capability routing |
| Performance and communication | P07 High performance through simplicity · P08 Fast path before agent path · P09 Latency by design · P10 Async only where it adds value · P11 Standards-first communication |
| Product and domain | P12 Generic platform · P13 Convention over configuration |
| Data | P14 PostgreSQL-first, relational for first-class data (no aggregate JSON documents) · P15 Organisation is the tenant boundary · P16 Files are object storage plus metadata |
| Identity and access | P17 Identity ≠ user ≠ membership ≠ worker · **P18 No orphan FieldMate users** · P19 Provider-neutral identity · P20 FieldMate does not own passwords · P21 Access Core is central · P22 Provider-independent commercial model |
| AI and voice | P23 Controlled services execute mutations · P24 Voice is distributed |
| Portability and clients | P25 Provider portability · P26 Clients don't couple to cloud providers · P27 Backend abstraction at the client · P28 Contract stability |
| Delivery and structure | P29 Modular monolith first · P30 Capability-first delivery · P31 Progressive backend activation · P32 Prototype-to-production continuity · P33 Infrastructure as Code · P34 New technology requires justification |
| Observability | P35 Minimal observability · P36 Organisation-level traceability · P37 Explicit retention · P38 No duplicate telemetry · P39 Business history ≠ operational logging |
| Security | P40 Security is explicit and proportionate |

It consolidates the README's original principles, the Stage-1 plan (P1–P12), the X-Ray legend, the CR's
AP-01…AP-20, the no-orphan-users addendum and the October 2026 cost directives. Provenance is in its §11.

## 3. ADRs

| ADR | Decision | Notes |
|---|---|---|
| [ADR-001](../architecture/adr/ADR-001-postgresql-primary-structured-store.md) | RDS for PostgreSQL, not Aurora or DynamoDB; RDS Proxy environment-aware | |
| [ADR-002](../architecture/adr/ADR-002-cognito-initial-identity-broker.md) | One Cognito pool (Essentials), passkeys, federation, no custom attributes or groups | |
| [ADR-003](../architecture/adr/ADR-003-shared-synchronous-api-lambda.md) | One shared API Lambda in private subnets without egress; gateway-verified JWT | Includes the db-ops function |
| [ADR-004](../architecture/adr/ADR-004-provider-neutral-fieldmate-identity.md) | issuer + subject mappings; no orphan users; no email merging | |
| [ADR-005](../architecture/adr/ADR-005-minimal-observability.md) | One structured record per request; explicit retention | |
| [ADR-006](../architecture/adr/ADR-006-zero-idle-cost-non-production.md) | Dev database stopped when idle, parked weekly | |
| [ADR-007](../architecture/adr/ADR-007-terraform-iac.md) | Terraform as project IaC tool | Records the V00 choice as the project standard |
| [ADR-008](../architecture/adr/ADR-008-parameter-store-for-secrets.md) | Parameter Store for secrets and configuration; Secrets Manager denied | |
| [ADR-009](../architecture/adr/ADR-009-relational-records-not-json-documents.md) | First-class business and configuration data as typed relational, directly queryable records; no aggregate JSON documents; JSONB only for justified opaque/leaf fragments | Project-owner decision; governs future verticals (onboarding, configuration). V00 already complies (no JSON/JSONB columns) |

No speculative ADRs were created: each records a decision already implemented and in use.

## 4. V00-specific architecture

| Area | Implementation |
|---|---|
| API host | One ASP.NET Core minimal-API application: `fieldmate-api-{env}` on Lambda (`dotnet10`, arm64) behind an API Gateway HTTP API; unchanged on Kestrel locally |
| Identity boundary | `IIdentityProviderAdapter` → provider-neutral `AuthenticatedPrincipal`. Standards OIDC/JWKS adapter (local, tests, non-AWS); API Gateway verified-claims adapter (AWS). Cognito and AWS SDK code only in `FieldMate.Aws` and Terraform (verified: Core has no AWS packages or Cognito code) |
| Organisation context | `X-Organisation-Id` parsed (plain UUID only) and validated per request against an active membership of an active organisation, with the role's permissions and optional worker. `FieldMateRequestContext` has an internal constructor, so only that service can create it |
| Access Core | Denies, in order: no trusted context, no membership, missing permission, any resource of another organisation (always), any resource-policy deny. Entitlement hook point marked, not built |
| Data | 4 migrations; schemas `core`, `iam`, `workforce`, `platform`; composite tenant FK (worker→membership); cross-tenant role triggers; least-privilege `fieldmate_app` (no DDL, no DELETE); IAM DB auth on AWS; RDS Proxy off in dev, on in prod |
| Endpoints | `GET /health`, `GET /identity/welcome-landing`, `POST /onboarding/create-business`, `POST /identity/accept-invitation`, `GET /me`, `GET /identity/choose-organisation`, `GET /me/context` (§13, D9) |
| Telemetry | ADR-005. Retention: API 7/14 days (dev/prod), db-ops 14/30, trigger 7 |
| IaC and CI/CD | Terraform bootstrap + stack. CI: format, build, unit and integration tests on PostgreSQL 17, Terraform fmt/validate/test, packaging. Deploy: plan, apply, migrate, smoke, stop. `dev-cost-control.yml`: evening stop, Friday park |

**X-Ray rows used:**
- Entry & Identity: Welcome/Landing, Sign In, Register, Forgot Password (Cognito-managed), Choose Organisation, Accept Invitation, Passkey Setup (as a sign-in factor).
- Business Onboarding: Create Business (organisation core only).
- Platform Operations: Platform Health (replaced by public liveness `/health`).
- Naming: `fieldmate-api/-users/-postgres/-rds-proxy-{env}`.

## 5. No-orphan-user implementation (FM-P18, ADR-004, amendment A1)

```text
Cognito authenticates → JWT verified → issuer + subject resolved
        ├─ identity known  → user → at least one valid membership? ─ yes → continue
        │                                                    └─ no  → 403 NO_ACTIVE_MEMBERSHIP
        └─ identity unknown → 403 IDENTITY_NOT_PROVISIONED, nothing written
                               ↓ the person must
                 POST /onboarding/create-business      or      POST /identity/accept-invitation
                 one transaction:                              one transaction:
                   organisation                                  user_profile (if new)
                   user_profile (if new)                         authentication_identity (if new)
                   authentication_identity (if new)              organisation_member (+ worker if requested)
                   OWNER membership                              invitation → ACCEPTED
                   idempotency record
```

Safeguards:
- **Concurrency:** a per-identity advisory lock serialises concurrent first requests.
- **Idempotency:** `Idempotency-Key` makes create-business replays return the original organisation.
- **Database invariant:** a **deferred constraint trigger rejects committing any `user_profile` without an `organisation_member`**, and deleting a user's last membership is rejected.
- **Invitations:**
  - tokens are 256-bit random and stored only as SHA-256 hashes;
  - an addressed invitation requires the IdP-verified matching email;
  - re-accepting by the same identity is idempotent; use by anyone else is rejected;
  - suspended members cannot rejoin through an invitation.

## 6. Parameter Store correction (FM-P03, ADR-008, amendment A2)

| Before | After |
|---|---|
| `manage_master_user_password = true` → RDS-managed Secrets Manager secret ($0.40/month/env) | `/fieldmate/<env>/database/owner-password`: Parameter Store standard-tier `SecureString`, AWS-managed `aws/ssm` key ($0) |

How the password is protected at each step:
- **Creation:** in bootstrap, from an ephemeral `random_password` through write-only `value_wo`. It is not in state, and it survives parking.
- **Database:** write-only `password_wo` from an **ephemeral input variable** (`TF_VAR_db_owner_password`). It is not in state or saved plans.
- **Pipeline:** reads it with `aws ssm get-parameter --with-decryption` and masks it (`::add-mask::`). It reaches the migration function in a 0600 temp-file payload and is never echoed or logged.
- **Deploy-role guardrails** (explicit denies over `PowerUserAccess`):
  - read only `parameter/fieldmate/*`;
  - no `PutParameter`, `DeleteParameter` or label changes;
  - no `secretsmanager:*`.
- **Secrets Manager:** no resources, scripts or permissions remain.
- **Offline test:** a Terraform test asserts the parameter path.

A deviation from your requested design: the database reads the password from an ephemeral *input variable*
(supplied by the pipeline from Parameter Store), not an in-Terraform `ephemeral "aws_ssm_parameter"`.
Terraform's mock provider does not yet support ephemeral resources, and the in-Terraform read would have made
the database module untestable offline. The bootstrap side uses `ephemeral random_password` with `value_wo` as
requested.

## 7. Dev parking policy (FM-P04, ADR-006, amendment A3)

| Situation | Behaviour |
|---|---|
| Deployment (dev) | Restore from the newest park snapshot if parked; start if stopped; migrate; smoke test; **stop** (always, even on failure) unless `keep_database_running` |
| Evening, Saturday–Thursday 19:00 UTC | **Stop** anything running |
| Friday 19:00 UTC, or on demand | **Park**: start if stopped (a final snapshot needs an available instance), final snapshot, delete; keep the two newest park snapshots |
| Working session | `dev-env.ps1 start` or `unpark`; the evening stop still applies |
| Production | Never stopped or parked by automation |

Weekly parking also prevents AWS's 7-day automatic restart of stopped instances. Cognito, Lambda, API Gateway and
Parameter Store are never parked: they have no idle cost, and keeping Cognito keeps token issuers, and therefore
identities, stable.

## 8. Cost estimate

**Assumptions:**
- eu-west-2 on-demand, **approximate rates not verified against the AWS price list in this session**: `db.t4g.micro` about $0.018/hour, `db.t4g.small` about $0.036/hour, gp3 storage about $0.13/GB-month, RDS Proxy about $0.018/vCPU-hour with a 2-vCPU minimum, snapshot storage about $0.095/GB-month.
- Lambda, HTTP API, Cognito (10,000 MAU) and CloudWatch Logs (5 GB) stay within free tiers at dev volumes; Parameter Store standard tier is free.
- An "active month" means about 20 deployments (about 30 minutes each) plus four 6-hour working sessions, about 35 instance-hours.

| Profile | What is billed | Approximate monthly cost |
|---|---|---|
| **Dev running 24×7** (what the policy prevents) | 730 instance-hours + 20 GiB storage | **about $16** |
| **Dev normally stopped, never parked** | storage all month (about $2.70) + about 35 instance-hours | **about $3–4** |
| **Dev with the V00 policy** (stop when idle, park weekly), active month | storage only while the instance exists (about 4.5 days/week) + about 35 instance-hours + two small snapshots | **about $2–3** |
| **Dev parked all month** (idle month) | two park snapshots | **a few cents** |
| **Production baseline** (indicative, not deployed) | `db.t4g.small` 24×7 (about $26) + RDS Proxy (about $26) + storage (about $3) | **about $55–65** before traffic; Multi-AZ adds about $26+ |

The Parameter Store change removes $0.40 per environment per month. No NAT Gateway (about $33+/month) or VPC
endpoints (about $7/month per AZ) exist in any environment.

## 9. Security review and limitations (FM-P40)

**Verified in code and tests:**

| Area | How it is enforced |
|---|---|
| Transport | HTTPS only (API Gateway); database TLS `VerifyFull` against the packaged RDS CA bundle |
| JWT validation | Signature (gateway or JWKS); issuer; audience or `client_id`; expiry and not-before; `token_use=access`, so ID tokens are rejected; RS256 only (HS256 and unsigned rejected in tests) |
| Least privilege | One IAM role per function. The API may `rds-db:connect` only as `fieldmate_app`; the database role has no DDL or DELETE (tested) |
| Tenant isolation | Server-side membership validation on every organisation-scoped request; Access Core tenant guard; composite tenant FK and cross-tenant role triggers (tested) |
| SQL and secrets | Parameterised SQL only (no interpolated SQL); no secrets in source |
| Logging | No token, header, body or password in telemetry (tested on rendered output) |
| Users and identities | First-user provisioning only through atomic onboarding; no email-based merging (tested); account linking not implemented, by design |
| Enumeration | Organisation denial, invitation failure and Cognito user-existence errors each give a uniform response |

**Production hardening items.** These **must be resolved before production acceptance**. By decision, they do
**not** block the V00 feature branch or dev environment validation, and they do not widen V00 now:

| # | Item | Mitigation now | Required before production |
|---|---|---|---|
| S1 | Migrations authenticate with the database **owner** password | Parameter Store, never in state/logs; read only by the deploy role; used only in the pipeline | Dedicated IAM-authenticated migration role (`fieldmate_migrator`); owner password becomes break-glass only |
| S2 | Deploy role has broad **`PowerUserAccess`** | IAM limited to `fieldmate-*` roles; secret guardrails (§6); OIDC trust limited to this repo's `dev`/`prod` environments; prod behind required reviewers | Narrow to a service-scoped deploy policy |
| S3 | Cognito's default email sender (low daily quota) | Adequate for dev | SES-backed Cognito email delivery (costed decision) |

**Other known limitations (not hidden):**

| # | Limitation | Mitigation now | Proposed fix |
|---|---|---|---|
| S4 | No per-identity cap on organisations created | API Gateway throttling | Rate limit in the onboarding vertical |
| S5 | `platform.idempotency_record` has no retention job | Small rows | Retention in a later operational change |
| S6 | Smoke-test user exists in the dev pool | Non-prod client only; password in a GitHub environment secret | — |

## 10. Test results

Local run on Windows, Release build, PostgreSQL 17.11: **99 passed, 0 failed, 0 skipped** (32 unit, 67 integration).

| Category | Coverage |
|---|---|
| **No orphan users** (addendum) | Unknown identity persists nothing (`/me`, `choose-organisation`, `/me/context`); create-business atomic; replay and concurrent same-key idempotent; concurrent new-identity requests create one user; **rollback after the user insert leaves no orphan**; DB rejects committing a user without membership; deleting the last membership rejected; accept-invitation atomic (with worker); re-accept idempotent; used, expired, revoked, unknown and malformed invitations rejected and persist nothing; addressed invitations need a verified matching email; existing users join without a new user; no duplicate membership; suspended member cannot rejoin; **zero valid memberships denied** (suspended membership or organisation); same email never merges |
| Identity | Valid native and federated tokens; expired, wrong issuer, wrong client, foreign signature, ID token, malformed, no subject rejected; HS256 and unsigned rejected; gateway claims missing or expired; unverified email never becomes primary |
| Organisation and access | Auto-select for one organisation; multi-organisation list with roles; missing, malformed, empty and unknown organisation header; foreign organisation indistinguishable from non-existent; inactive membership isolated per organisation; worker mapping optional; **role permissions via the test-only probe** (OWNER, ADMIN, MANAGER allowed, WORKER denied); permissions evaluated per organisation; a permission held elsewhere never grants another organisation; Access Core unit tests (tenant guard, policies narrow but never widen) |
| Data | Migrations up → down → up; re-run no-op; tampered checksum detected; unique (issuer, subject); FK and composite tenant FK; cross-tenant role trigger; system-role uniqueness; tenant indexes; runtime role cannot DDL, DELETE, write reference data or read migration history; no password, salt or credential columns |
| Telemetry | Exactly one record per request with organisation, user and correlation; denial records the requested organisation only; correlation echoed and unsafe IDs replaced; **tokens and `Bearer` never in rendered logs**; healthy `/health` not logged; onboarding attributed to the new organisation |

Change since the previous run: the `/team/members` tests became probe-host tests, plus one new cross-organisation
probe test. The team-listing isolation test was removed with the endpoint.

## 11. Local validation

| Check | Result |
|---|---|
| `dotnet build -c Release` | 0 warnings (warnings are errors), 0 errors |
| `dotnet test` (unit + PostgreSQL integration) | 99/99 passed |
| `dotnet format --verify-no-changes` | Clean |
| `terraform fmt -check -recursive` | Clean |
| `terraform validate` (bootstrap, stack) | Valid; provider lock files cover linux_amd64, windows_amd64, darwin_arm64 |
| `terraform test` (mocked provider) | 3/3 passed: dev, prod-like (proxy, alarms), parked; asserts the Parameter Store path |
| actionlint (all workflows) | Clean |
| Markdown link check (`docs/`, READMEs) | All relative links resolve (§1 case fix included) |
| Shell scripts (`infra/scripts/*.sh`) | **Not executed**: no bash on the development machine. They first run in CI and on AWS |

## 12. AWS deployment status

**Nothing has been deployed.** None of the following is proven yet:

- Cognito sign-in end to end (native password, passkey enrolment and sign-in, TOTP MFA)
- Google and Microsoft/Entra federated sign-in
- The API Gateway JWT authorizer with real Cognito access tokens, and the pre-token-generation trigger claims
- The Lambda in private subnets reaching RDS with IAM authentication
- RDS Proxy with end-to-end IAM authentication (production configuration)
- Migrations through `fieldmate-db-ops` with the Parameter Store password
- The deploy, smoke-test, stop and park/restore cycle, and the deploy-role guardrails
- Real `terraform plan` against an account (only offline mocked plans have run)

## 13. Deviations from the CR and X-Ray

| # | Deviation | Decision |
|---|---|---|
| D1 | No first-login provisioning; users only via create-business or accept-invitation | **Retained**: amendment A1, FM-P18, ADR-004 |
| D2 | `iam.invitation` and `platform.idempotency_record` added | **Retained**: required by A1 |
| D3 | `identity_type ∈ {NATIVE, FEDERATED}`; the identity diagram's `PASSKEY` type not used | **Retained**: a passkey is an authenticator on a native Cognito identity (same `sub`), not a separate canonical identity. **Diagram update proposed** |
| D4 | `upstream_subject` on `iam.authentication_identity` | **Retained**: deterministic federated re-linking if the broker changes (FM-P19) |
| D5 | No `POST /me/organisation-context` | **Retained**: stateless header validated per request; nothing to expire or leak |
| D6 | JWT signature verified by API Gateway on AWS; claims re-checked in the Lambda | **Retained**: ADR-003 (no egress, no NAT); the in-process JWKS validator covers non-AWS hosting |
| D7 | Cognito pre-token-generation Lambda | **Retained**: ADR-002; provider-neutral claim names only |
| D8 | Second function `fieldmate-db-ops` | **Retained**: ADR-003; operational, never behind API Gateway |
| D9 | Extra endpoints | `GET /team/members` **removed** (premature Team & Access functionality; its proof moved to a test-only probe). `GET /me/context` **retained** as a deliberate client contract (the UI needs role, permissions and worker for the selected organisation); **X-Ray row proposed** under Entry & Identity → Choose Organisation |
| D10 | Cognito Essentials tier | **Retained**: ADR-002 (passkeys, access-token customisation) |
| D11 | CR referenced `Docs/…`; repository tracked `Docs/` | **Resolved**: repository normalised to `docs/` (§1) |
| D12 | Identity diagram lists subscriptions among V00 tables | **Excluded**: CR non-goal; belongs to the commercial vertical (FM-P22). **Diagram update proposed** |
| D13 | X-Ray "Identity key managed by Cognito" | **Superseded** by issuer + subject (ADR-004). **X-Ray wording update proposed** |
| D14 | Secrets Manager replaced by Parameter Store | **Applied**: amendment A2, ADR-008 |
| D15 | `/identity/welcome-landing` returns only auth entry points; create-business creates only the organisation core (no `config.*`) | **Retained**: the remaining X-Ray scope belongs to later verticals |

Proposed reference updates (for the owner of the X-Ray and diagrams; the spreadsheet itself is not edited by V00):

1. **New X-Ray row: the `GET /me/context` contract.** A platform-level API, approved to stay in V00:

   | X-Ray column | Value |
   |---|---|
   | Capability Domain / Screen | Entry & Identity / Organisation Context (follows Choose Organisation; used by every organisation-scoped screen) |
   | What it does | Returns the trusted, server-resolved context for the selected organisation so the UI shows only what the user may do |
   | Persona | Any organisation member |
   | API Component | Identity & Access / Membership |
   | API Endpoint | `GET /me/context` with header `X-Organisation-Id` (validated server-side; never trusted as supplied) |
   | Operation Type / Handler | Query / `GetOrganisationContextHandler` (telemetry operation `GetOrganisationContext`) |
   | Lambda | `fieldmate-api-{env}` (shared) |
   | Access Core policy | Authenticated user with an active membership of the active organisation, plus `organisation.read` (all V00 roles) |
   | Response | `userId`, `organisationId`, `membershipId`, `workerId` (optional), `role`, `permissions[]`, `correlationId`, `authenticationProvider` |
   | Storage / tables | Amazon RDS for PostgreSQL: `iam.organisation_member`, `core.organisation`, `iam.role`, `iam.role_permission`, `iam.permission`, `workforce.worker` |
   | Keys / indexes | `uq_organisation_member_user (organisation_id, user_id)`; `uq_worker_membership (organisation_id, membership_id)` |
   | Errors | `ORG_CONTEXT_REQUIRED`, `ORG_CONTEXT_INVALID`, `ORG_MEMBERSHIP_DENIED` (identical for non-member and non-existent), `NO_ACTIVE_MEMBERSHIP` |
   | Events / Audit | None / read telemetry only |
   | Telemetry | One structured record: `organisationId`, `userId`, `correlationId`, scope `ORGANISATION` |
   | MVP / Later | MVP (V00) |

2. **Entry & Identity rows:** replace "Identity key managed by Cognito" with "issuer + subject in `iam.authentication_identity`; canonical user `iam.user_profile`".
3. **Team & Access:** no V00 endpoint. `GET /team/members` was removed; member listing belongs to the Team & Access vertical.
4. **Identity diagram:** identity types `NATIVE`/`FEDERATED` (a passkey is an authenticator); no subscriptions in V00.

## 14. Readiness for AWS environment validation

**Ready.** To run the first environment validation:

1. An administrator runs `infra/terraform/bootstrap` (state bucket, OIDC deploy role, owner-password parameters).
2. Set the GitHub variables and secrets listed in the [runbook §1](../../infra/README.md#1-bootstrap-once-per-aws-account-by-an-administrator).
3. Push the branch and merge to `main`, or dispatch *Backend deploy → dev*. The pipeline then:
   - applies Terraform;
   - migrates;
   - runs the smoke test: health; gateway rejects without a token; Cognito token; create-business (idempotent); `/me`; `/me/context` as OWNER; a foreign organisation denied;
   - stops the database.
4. Manually verify:
   - passkey enrolment and sign-in through managed login;
   - Google/Entra once credentials exist;
   - one park/restore cycle (`dev-cost-control.yml` → park, then deploy);
   - an organisation-scoped log line in CloudWatch carrying `organisationId` and `correlationId`.

Environment acceptance is declared only after steps 3–4 pass, and this report is updated with the evidence.

## 15. Readiness for VS01

- **VS01 planning can start now.** The governance model, principles and ADRs are in place for its CR to cite.
- **VS01 implementation should start after dev environment acceptance (§14)**, so it builds on a proven deployed foundation.
- **Before production acceptance:** resolve the production hardening items S1–S3 (§9).

Patterns VS01 reuses:
- `.RequirePermission(...)` endpoints whose organisation comes only from `FieldMateRequestContext`.
- `organisation_id`-leading tenant tables with composite tenant FKs.
- A numbered SQL migration with a down script; `fieldmate_app` receives grants through default privileges.
- The telemetry `operation` named after the X-Ray handler.
- New permissions seeded by migration.
- A cost review and a check against FM-P34 in the CR.
