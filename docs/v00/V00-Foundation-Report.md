# V00 Foundation — implementation report

**CR:** [CR-FM-V00 Foundation](CR-FM-V00-Foundation.md), with approved amendments A1–A5 ([CR §23](CR-FM-V00-Foundation.md#23-approved-amendments))\
**Branch:** `cr/fm-v00-foundation`, pushed to origin; not merged to `main`\
**Governed by:** [FieldMate Architecture Principles](../architecture/FieldMate-Architecture-Principles.md) · [ADRs](../architecture/adr/README.md)

| Status | State |
|---|---|
| **Implementation** | **Complete** for V00 scope, including amendments A1–A5 |
| **Local validation** | **Passed**: Release build, 100/100 tests (33 unit, 67 integration on real PostgreSQL 17), format, Terraform validate and offline plan tests, actionlint, documentation link check (§11) |
| **Feature branch** | Pushed to `origin/cr/fm-v00-foundation`. **Merge to `main` approved** by the owner (2026-10-11) |
| **AWS deployment** | **Dev validated, then torn down** (2026-10-11, eu-west-2, manual runbook): deploy, migrate, smoke test, acceptance checks, stop/start/park/restore. Five defects found and fixed (§16) |
| **Environment acceptance** | **Dev accepted** by the owner (2026-10-11); teardown verified (§16.12). Deferred: passkey through managed login in a real browser (to a future natural deployment), Google and Entra (no credentials). The deploy workflow first runs on merge (§12) |
| **Production acceptance** | **Not started**: also requires the production hardening items in §9 |

V00 is **not** production-ready. It is the accepted foundation baseline: dev validation on AWS passed (§16) and was
accepted by the owner. Production acceptance also requires the hardening items in §9 and a production deployment.

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

CI (`ubuntu-24.04`, PostgreSQL 17) on the validated branch: **100 passed, 0 failed, 0 skipped** (33 unit, 67 integration).
The 100th test was added during AWS validation: it pins the db-ops response field that `run-db-ops.sh` redacts (§16.11).

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
| `dotnet test` (unit + PostgreSQL integration) | 100/100 passed (CI) |
| `dotnet format --verify-no-changes` | Clean |
| `terraform fmt -check -recursive` | Clean |
| `terraform validate` (bootstrap, stack) | Valid; provider lock files cover linux_amd64, windows_amd64, darwin_arm64 |
| `terraform test` (mocked provider) | 3/3 passed: dev, prod-like (proxy, alarms), parked; asserts the Parameter Store path |
| actionlint (all workflows) | Clean |
| Markdown link check (`docs/`, READMEs) | All relative links resolve (§1 case fix included) |
| Shell scripts (`infra/scripts/*.sh`) | `run-db-ops.sh`, `smoke-test.sh` and `dev-database.sh` **ran against AWS dev** under Git Bash on Windows (§16.10). On Linux they run only in the deploy and cost-control workflows, which have not run yet |

## 12. AWS deployment status

**Dev was deployed, validated and torn down on 2026-10-11** (§16). Proven on AWS:
- Cognito native password sign-in, TOTP MFA and passkey (WebAuthn) sign-in through Cognito's APIs.
- The API Gateway JWT authorizer with real Cognito tokens, and the pre-token-generation trigger claims.
- The Lambda in private subnets reaching RDS with IAM authentication.
- Migrations through `fieldmate-db-ops` with the Parameter Store password.
- Stop, start, park and restore.
- The deploy-role guardrails, using the IAM policy simulator.
- Real `terraform plan`, `apply` and `destroy`.

**Not yet proven:**
- Google and Microsoft/Entra federated sign-in (no credentials provisioned).
- Passkey enrolment and sign-in through managed login in a real browser with a platform authenticator (deferred to a future natural deployment).
- The `backend-deploy.yml` and `dev-cost-control.yml` workflows themselves: they run from `main`, so dev was deployed with the manual runbook. This also means the scripts have not yet run on Linux.
- RDS Proxy with end-to-end IAM authentication (production configuration), and any production deployment.

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

**Done for dev with the manual runbook (§16).** Still outstanding: step 3 through the workflow once it is on `main`;
from step 4, browser passkey enrolment and Google/Entra. The original procedure:

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
- **VS01 implementation can start**: dev environment acceptance is done (§16), so it builds on a proven deployed foundation.
- **Before production acceptance:** resolve the production hardening items S1–S3 (§9).

Patterns VS01 reuses:
- `.RequirePermission(...)` endpoints whose organisation comes only from `FieldMateRequestContext`.
- `organisation_id`-leading tenant tables with composite tenant FKs.
- A numbered SQL migration with a down script; `fieldmate_app` receives grants through default privileges.
- The telemetry `operation` named after the X-Ray handler.
- New permissions seeded by migration.
- A cost review and a check against FM-P34 in the CR.

## 16. AWS dev validation (2026-10-11)

An ephemeral dev cycle: bootstrap, configure, deploy, migrate, smoke test, acceptance checks, evidence, destroy.
No secrets, tokens or invitation tokens are reproduced here; identifiers belong to resources that no longer exist.

| Item | Value |
|---|---|
| Account / region | `pptk-dev` (327260351722) / eu-west-2 London |
| Method | Manual runbook from a Windows workstation (Terraform 1.16.5, AWS CLI v2, Git Bash). The deploy workflow runs from `main`, so it was not used; no temporary deployment mechanism was added |
| Code | `cr/fm-v00-foundation`; Lambda packages from the branch's CI artifacts (backend code unchanged during the cycle) |
| Timeline (UTC) | Bootstrap and GitHub configuration before 19:53; deploy 19:54; validation until 21:04; teardown from 21:05 |

### 16.1 Bootstrap and GitHub configuration

| Created | Resources |
|---|---|
| Terraform state | S3 bucket `fieldmate-tfstate-327260351722-eu-west-2` with versioning, SSE, public-access block, TLS-only policy and lifecycle (6 resources) |
| Deploy identity | GitHub OIDC provider; role `fieldmate-github-deploy` (trust: this repository's `dev` and `prod` environments); `PowerUserAccess`; inline `manage-fieldmate-iam` and `fieldmate-secret-guardrails` (5 resources) |
| Owner passwords | `/fieldmate/dev/database/owner-password`, `/fieldmate/prod/database/owner-password`: standard-tier `SecureString`, `alias/aws/ssm`, written write-only (2 resources) |
| GitHub | Variables `AWS_DEPLOY_ROLE_ARN`, `TF_STATE_BUCKET`, `AWS_REGION`; environments `dev` and `prod` (required reviewers); `dev` secrets `SMOKE_USERNAME`, `SMOKE_PASSWORD` |

Neither owner password appears in the local bootstrap state, which is git-ignored.

### 16.2 Deployment and cost principles

| Check | Result |
|---|---|
| Plan | 46 resources. **No** NAT Gateway, Elastic IP, internet gateway, VPC endpoint, RDS Proxy, Aurora, OpenSearch, ElastiCache, DynamoDB, ECS, Step Functions, Secrets Manager, EC2 or load balancer |
| Database | RDS PostgreSQL 17.9, `db.t4g.micro`, single-AZ, 20 GiB gp3, encrypted, not public, IAM auth on, Performance Insights off, enhanced monitoring off, 1-day backups |
| Pay-per-use | Lambda ×3 (`dotnet10`/`python3.13`, arm64), HTTP API, Cognito Essentials |
| Log retention | API 7, db-ops 14, pre-token trigger 7 days |
| First apply | **Failed** after 541 s, with RDS created in 6 min 29 s: Cognito rejected the passkey relying-party ID (defect 1, §16.11). Fixed; the re-apply replaced the tainted user pool in 22 s |
| Owner password | Absent from the saved plan files and the remote state (46 resources) |
| Account sweep | No NAT, VPC endpoint, Elastic IP, RDS Proxy, Aurora, Secrets Manager, ElastiCache, OpenSearch, ECS or Step Functions in the region. One unrelated, pre-existing DynamoDB table (`AccessCore-dev-…`, created 2026-09-26) was left untouched |

### 16.3 Migrations (`run-db-ops.sh` → `fieldmate-db-ops-dev`)

| Run | Result |
|---|---|
| `migrate` | Applied 0001–0004 (95, 16, 7, 52 ms); 5 s end to end |
| `migrate` again | No migrations applied (idempotent); 3 s |
| `status` | 1–4 applied |
| After the park/restore | `status` 1–4 (schema restored with the data) |

The owner password came from Parameter Store and did not appear in shell output, Lambda logs, the plan or the
state (§16.7). The two `create-invitation` runs also went through this script, with the tokens written only to a
local file.

### 16.4 End-to-end smoke test (Cognito → API Gateway → Lambda → identity → organisation context → Access Core → PostgreSQL)

| # | Required check | Result |
|---|---|---|
| 1 | Health endpoint | **Pass**: `GET /health` 200, including while the database was stopped |
| 2 | Protected API rejects a missing or invalid token | **Pass**: rejected with 401 for no token, a garbage token, a tampered signature and `Basic` auth (all at the gateway), and for an ID token (by the Lambda: `AUTH_INVALID_TOKEN`) |
| 3 | Cognito native user authenticates | **Pass**: `USER_PASSWORD_AUTH` (smoke client) and `USER_AUTH` password (web client) |
| 4 | Valid token reaches the API | **Pass**: identity resolved (`provider=COGNITO`) |
| 5 | Unknown identity alone creates no user | **Pass**: §16.5 |
| 6 | create-business creates organisation, user, identity and OWNER membership atomically | **Pass**: 201, `created=true`, `userCreated=true`, OWNER; afterwards `/me` shows one linked identity and choose-organisation one membership |
| 7 | Repeat create-business is idempotent | **Pass**: same key returns 200, `created=false`, same organisation and membership, even with a different name; still exactly one organisation |
| 8 | `GET /me` | **Pass**: 200, `ACTIVE`, one linked Cognito identity |
| 9 | `GET /me/context` | **Pass**: organisation; OWNER with `organisation.manage, organisation.read, team.manage, team.read`; `workerId` null for owners; the worker's context returns its `workerId` |
| 10 | Foreign organisation denied | **Pass**: 403 `ORG_MEMBERSHIP_DENIED` both ways between two real organisations, for an owner, a worker and a never-assigned ID |
| 11 | Zero-active-membership denied | **Not reproducible on AWS** without editing the database: V00 has no endpoint that suspends a membership. Covered by integration tests (suspended membership; suspended organisation) |
| 12 | Access Core enforces policy | **Pass**: the WORKER has only `organisation.read`, while OWNER also has `organisation.manage`, `team.manage` and `team.read`, both from PostgreSQL. Also verified: missing header gives `ORG_CONTEXT_REQUIRED`, a malformed one `ORG_CONTEXT_INVALID`, a non-member `ORG_MEMBERSHIP_DENIED`, an unknown identity `IDENTITY_NOT_PROVISIONED`. A role-permission *denial* needs an endpoint V00 does not have; it is covered by the probe-host integration tests |

`smoke-test.sh` passed four times: after deploy, as a replay, after a reboot (with the readiness wait), and after
the restore. Its first run created the smoke organisation (telemetry: 201); later runs replayed it (200).

### 16.5 No-orphan users (FM-P18), on real AWS

1. A Cognito user (with TOTP MFA) authenticated and called the API before any onboarding:
   - `/me`, `/identity/choose-organisation` and `/me/context` returned 403 `IDENTITY_NOT_PROVISIONED`.
   - create-business without an `Idempotency-Key`, and with a blank name, returned 400 `VALIDATION_FAILED`.
   - Accepting an unknown invitation returned 403 `INVITATION_INVALID` (reason `not_found`, inside the onboarding transaction).
   - Afterwards `/me` and choose-organisation still returned `IDENTITY_NOT_PROVISIONED`: nothing was persisted.
2. That user's first create-business returned 201 with `userCreated=true`, an OWNER membership and a user ID; `/me` then returned that same user.
3. A second new user was invited to organisation A as a worker:
   - an invitation addressed to another email was rejected (`recipient_mismatch`), and the user was still not provisioned afterwards;
   - the matching invitation created the user, identity, WORKER membership and worker record in one call (`userCreated=true`);
   - re-accepting returned the same membership, and another identity reusing the accepted invitation was rejected (`already_used`).

Partial-write rollback (a failure after the user insert) needs fault injection, which deployed code does not have;
it is covered by the integration test "rollback after the user insert leaves no orphan". Test users and
organisations were removed with the user pool and the database at teardown.

### 16.6 Authentication

| Method | Result |
|---|---|
| Native (password) | **Pass**: smoke client and web client (`USER_AUTH`) |
| TOTP MFA | **Pass**: authenticator associated and verified; sign-in then required `SOFTWARE_TOKEN_MFA`; a wrong code was rejected (`CodeMismatchException`); the correct code issued a token that the API accepted |
| Passkey | **Pass at the API level**: registration (`StartWebAuthnRegistration`/`CompleteWebAuthnRegistration`) and passwordless `USER_AUTH` sign-in with `WEB_AUTHN`, using a software authenticator (a local P-256 key with `none` attestation). The relying party was the pool's prefix domain (Cognito's default, confirming the defect 1 fix); an assertion signed by another key was rejected; the passkey-issued token resolved the same worker. **Deferred** to a future natural deployment: enrolment through managed login with a browser or platform authenticator |
| Google | **Deferred**: no credentials provisioned (not blocking dev) |
| Microsoft/Entra | **Deferred**: no credentials provisioned (not blocking dev) |

### 16.7 Observability and log hygiene

| Check | Result |
|---|---|
| Structure | 78 API telemetry records, one JSON line per request. Tenant-scoped records carry `organisationId`, `userId`, `correlationId` and `operation`, plus `scope`, `route` (template), `status`, `durationMs` and `authenticationProvider` |
| Denials | Carry `errorCode` and `requestedOrganisationId`, never `organisationId` (9 denials) |
| Reasons | Clients get one generic `INVITATION_INVALID`; logs keep `not_found`, `recipient_mismatch` and `already_used` |
| Errors | The stopped-database request logged `Npgsql.NpgsqlException: Failed to connect to <private IP>:5432` with a stack trace; no credentials |
| Secrets scan | 468 log events across the three groups: **no** JWTs, `Bearer` values, test-user passwords, the SSM owner password, TOTP secrets, invitation tokens, email addresses, RDS IAM auth-token signatures, refresh tokens, request bodies or headers |
| Retention | 7 / 14 / 7 days, as configured |

Logging was not made more verbose for validation.

### 16.8 IAM and security

IAM policy simulator results against the deployed roles (identity policies):

| Role | Allowed | Denied |
|---|---|---|
| `fieldmate-github-deploy` | `ssm:GetParameter` on `/fieldmate/dev/…`; `GetParametersByPath` under `/fieldmate/dev`; `iam:CreateRole` on `fieldmate-*` | **Explicit** deny: `GetParameter`/`GetParametersByPath` outside `/fieldmate/*`; `PutParameter`, `DeleteParameter`; `secretsmanager:GetSecretValue`, `CreateSecret`. Implicit: IAM roles not named `fieldmate-*`, `iam:CreateUser` |
| `fieldmate-api-dev` | `rds-db:connect` as `fieldmate_app` only | `rds-db:connect` as `fieldmate_owner`; SSM; Secrets Manager; invoking db-ops; Cognito admin |
| `fieldmate-db-ops-dev` | (password from the payload) | SSM; `rds-db:connect`; Secrets Manager |
| `fieldmate-pre-token-dev` | Its own log group | SSM; `rds-db:connect` |

Gateway and token rejections, cross-organisation denial and database roles behaved as designed (§16.4).

**Broader than necessary (recorded, not changed):**
- The deploy role's `PowerUserAccess` (S2).
- The AWS-managed `AWSLambdaVPCAccessExecutionRole` on the API and db-ops roles, which allows `logs:*` writes on any log group and ENI management on `*`; a scoped policy could replace it.
- Outside FieldMate's code, the `pptk-dev` operator IAM user has `AdministratorAccess` with long-lived access keys, and the account's Lambda concurrency limit is 10 (relevant before production).

### 16.9 Dev database lifecycle (`dev-database.sh`, ADR-006)

| Operation | Time | Result |
|---|---|---|
| stop | request 5 s; `stopped` after **6 min 31 s** | `/health` stayed 200; database-backed calls returned a generic 500 after about 10 s (fail closed, no data) |
| start | **6 min 39 s** | Application working; data intact |
| park | **4 min 40 s** | Final snapshot `fieldmate-postgres-dev-park-20261011-204229`, instance deleted, two-newest retention applied |
| restore | **8 min 37 s** (`terraform apply` with the newest park snapshot, as the deploy workflow does; includes Terraform resetting the owner password) | Migrations 1–4 present; all three users' contexts intact; isolation enforced; smoke test passed |

**Cold-connection finding (defect 5).** The first IAM-authenticated connections to a database that has just been
created, started or restored took **7–10 s**:

| Situation | First request |
|---|---|
| After the initial create | 7.3 s |
| After start | first timed out at the 10 s connect timeout (500); the next took 9.9 s |
| After restore | 9.2 s |
| Instance already warm, new Lambda environment | 1.9 s |
| db-ops password login right after the restore | well under 5 s |

Once warm, requests take milliseconds. The smoke test now waits for the database path (§16.11). A developer's first
request after a dev start can still fail once; production is never stopped.

### 16.10 Scripts

| Script | Result on AWS (Git Bash, Windows) |
|---|---|
| `run-db-ops.sh` | migrate, status and create-invitation; exit 0; no secrets in output. Needed defects 2–4 fixed |
| `smoke-test.sh` | Four passes; exit 0; failure messages name the failing check. Needed defects 2 and 5 fixed |
| `dev-database.sh` | status, stop, start and park; exit 0. Needed defect 2 fixed |

The fixes are no-ops on Linux: stripping CR from output, disabling MSYS path conversion for one call, using
relative temp-file paths, and a fixed foreign-organisation UUID instead of `/proc` or `uuidgen`. The scripts have
not yet run on Linux against AWS (§12).

### 16.11 Defects found and fixed

| # | Defect | Fix | Commit |
|---|---|---|---|
| 1 | **A new environment could never be created**: the user pool set its passkey relying-party ID to its own prefix domain, which Cognito rejects until the domain exists, and the domain needs the pool | Leave the relying-party ID unset; Cognito defaults it to the prefix domain (verified in §16.6). The mock-provider plan tests cannot reproduce this API check | `18f1852` |
| 2 | Scripts under Git Bash: `aws`/`jq` output ended in CR; `fileb://` could not read MSYS temp paths; no `/proc` UUID or `uuidgen` | CR-stripping wrappers; relative paths from the temp directory; fixed never-assigned UUID | `e7cced9` |
| 3 | Git Bash rewrote the `/fieldmate/...` parameter name into a Windows path (`ParameterNotFound`) | `MSYS_NO_PATHCONV=1` for that call only | `68f852d` |
| 4 | **Invitation-token redaction did not work**: db-ops returns `InvitationToken` (PascalCase) but the script deleted `.invitationToken`, so CI output would have kept a one-time token | Use the real property name; a unit test pins it | `68f852d` |
| 5 | The first IAM-authenticated database connections after a start or restore exceed the API's 10 s connect timeout, so the deploy pipeline's smoke test could fail on a healthy environment | `smoke-test.sh` retries a database-backed call on 5xx (6 × 5 s) before asserting. Reproduced after a reboot: attempt 1 returned 500, then passed | `9666232` |

CI passed after every fix. Application code is unchanged by the cycle.

**Observations not changed:**
- `infra/terraform/stack/env/dev.tfvars` still describes an older policy ("parked by default", `dev-park.yml`). The approved policy is the one in §7, implemented in `dev-cost-control.yml`.
- §16.8 lists IAM grants broader than necessary.

### 16.12 Teardown

| Item | Result |
|---|---|
| `terraform destroy` (dev stack) | **46 destroyed** in 23 min 51 s; 0 resources left in state. RDS deletion took 1 min 51 s (no final snapshot in dev). The rest was AWS releasing the db-ops Lambda's VPC network interfaces (about 20 minutes, free) before the subnets and security groups could go |
| Park snapshot | Deleted. No FieldMate snapshots or retained automated backups remain |
| Post-teardown sweep | 0 RDS instances, Lambda functions, HTTP APIs, Cognito pools, FieldMate log groups, VPC or ENIs |
| Test data | Cognito users and the validation organisations were removed with the pool and the database. Local test credentials and invitation tokens were deleted |
| Teardown verification | **Passed**: a separate read-only audit, directly against AWS rather than Terraform state, of all 20 resource categories in eu-west-2, plus a FieldMate tag sweep of all 17 regions. Zero unexpected FieldMate resources; tag-index entries for deleted resources were confirmed gone. Unrelated `AccessCore-dev` resources from another project were left untouched |

**Retained** (near-zero, intentionally persistent):
- The state bucket: one 718-byte dev state object plus versions.
- The OIDC provider and the `fieldmate-github-deploy` role with its policies.
- The two owner-password parameters.
- The GitHub variables, environments and `dev` smoke secrets.
- The git-ignored local bootstrap state.

The next deployment recreates dev, with an empty database because no park snapshot is kept.

### 16.13 Cost

Rates are approximate eu-west-2 on-demand rates, not taken from billing data, which lags by about a day.

| Resource | Existed | Approximate cost |
|---|---|---|
| RDS `db.t4g.micro` | about 49 min (first instance, excluding the stopped interval) + 17 min (restored instance) | about $0.02 |
| RDS storage, 20 GiB gp3 | about 70 min in total, including the stopped interval | under $0.01 |
| Park snapshot | about 21 min | under $0.01 |
| Lambda, API Gateway, Cognito (3 users), CloudWatch Logs, Parameter Store, KMS (`aws/ssm`) | the cycle | $0 (free tiers) |
| **Validation cycle total** | 19:54–21:30 UTC | **about $0.03 (well under $0.10)** |

**Ongoing idle cost after teardown: about $0/month.** The state bucket holds kilobytes; Parameter Store standard,
IAM and OIDC are free.
