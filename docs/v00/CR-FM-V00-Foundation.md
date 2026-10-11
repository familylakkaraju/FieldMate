# CR-FM-V00 — FieldMate V00 Foundation

**Status:** Approved and implemented (amendments A1–A5 below); AWS environment acceptance pending\
**Vertical:** V00 Foundation\
**Workflow coverage:** Cross-cutting foundation\
**Primary purpose:** Establish the minimum production-grade platform foundation required by all later FieldMate vertical slices.

> **V00 must comply with [`docs/architecture/FieldMate-Architecture-Principles.md`](../architecture/FieldMate-Architecture-Principles.md).**
> This CR does not own project-wide principles. It cites them by ID ([§5](#5-applicable-project-principles)) and
> records only V00-specific scope, decisions and acceptance criteria. Approved project decisions are ADRs in
> [`docs/architecture/adr/`](../architecture/adr/README.md).
>
> Implementation report: [`V00-Foundation-Report.md`](V00-Foundation-Report.md)

---

## 1. Authoritative references

Before planning or implementation, the following project artifacts must be reviewed and this CR reconciled against them:

1. [FieldMate Architecture Principles](../architecture/FieldMate-Architecture-Principles.md) and [ADRs](../architecture/adr/README.md)
2. [`docs/FieldMate_Master_Screen_Architecture_XRay_FINAL.xlsx`](../FieldMate_Master_Screen_Architecture_XRay_FINAL.xlsx)
3. [`docs/FieldMate_Stage1_Prototype_Implementation_Plan.docx`](../FieldMate_Stage1_Prototype_Implementation_Plan.docx)
4. The current completed generic FieldMate prototype in the repository.
5. This V00 CR and the embedded reference diagrams below.

This CR is intentionally narrower than the full platform. It establishes the common runtime, identity, organisation context, authorisation, persistence, migrations, deployment, and minimal traceability needed before VS01.

### Reference architecture

![FieldMate V00 Foundation Reference Architecture](resources/FieldMate_V00_Foundation_Architecture.png)

### Supplementary identity/authentication reference

![FieldMate V00 Identity and Authentication Reference](resources/FieldMate_V00_Identity_Authentication_Reference.png)

> The diagrams are reference visuals. Where a visual conflicts with this CR or with a subsequently approved architectural decision, the written CR and approved ADRs take precedence.

---

## 2. V00 summary

| Item | Decision |
|---|---|
| Vertical | V00 Foundation |
| Workflow coverage | Cross-cutting |
| Main components | API host, identity provider abstraction, organisation context, Access Core, DB layer, migrations, minimal telemetry, IaC/CI-CD |
| Core tech/services | API Gateway, AWS Lambda, Amazon Cognito User Pools, Amazon RDS for PostgreSQL, optional/production RDS Proxy, CloudWatch/OpenTelemetry, IaC, GitHub Actions |
| External integrations | None required for V00 business functionality. Google/Microsoft may be configured only as authentication providers through Cognito. |
| Primary structured store | Standard Amazon RDS for PostgreSQL — **not Aurora** |
| Initial NoSQL decision | **Do not use DynamoDB initially** |
| Tenant boundary | `organisation_id` |
| Application identity source of truth | PostgreSQL |
| Authentication authority | Cognito User Pool initially, behind a provider-neutral identity abstraction |
| Application authorisation | Access Core |
| Logging posture | Minimal, structured, organisation-traceable, short retention |
| Cost posture | Zero-cost-first; no idle-cost resources without explicit justification |

---

## 3. Goals

V00 must provide a small, secure, portable, low-cost foundation that every later vertical can reuse.

The goals are to:

- provide a stable API entry point for web/mobile clients;
- authenticate users using one Cognito User Pool with multiple authentication methods;
- keep FieldMate application identity and all business mappings in PostgreSQL;
- make the authentication provider replaceable in the future;
- resolve and validate organisation context for every tenant-scoped operation;
- enforce Access Core before application actions execute;
- establish PostgreSQL, migrations, transaction boundaries, and tenant-safe data access;
- establish minimal, low-cost, organisation-level traceability;
- establish repeatable infrastructure and deployment automation;
- provide an implementation pattern that VS01 and later slices can copy.

---

## 4. Non-goals

V00 must **not** expand into application features.

Out of scope:

- customers;
- leads;
- work requests;
- jobs/projects;
- tasks/workflows;
- scheduling;
- quotes;
- invoices/payments;
- files/evidence;
- reporting;
- AI/Copilot;
- voice;
- subscriptions;
- real custom-domain provisioning;
- external accounting/calendar/CRM integrations;
- advanced analytics;
- OpenSearch;
- Redis/ElastiCache;
- DynamoDB;
- Aurora;
- microservice-per-capability decomposition.

Only the minimum identity, organisation, role/permission and worker scaffolding needed by later verticals is allowed.

---

# 5. Applicable project principles

V00 applies the following principles from the
[FieldMate Architecture Principles](../architecture/FieldMate-Architecture-Principles.md). Their text is not
repeated here.

| Principle | V00 application |
|---|---|
| FM-P01 Keep it simple | One API host, minimal endpoints, no speculative services |
| FM-P02 Zero-cost-first · FM-P03 Free alternative first | No NAT, no Lambda authorizer, Parameter Store instead of Secrets Manager (ADR-008) |
| FM-P04 No unnecessary idle non-production cost · FM-P05 Environment-aware architecture | Dev database stopped when idle and parked weekly; RDS Proxy production-only (ADR-006) |
| FM-P07 High performance through simplicity | One synchronous path; indexed lookups; bounded payloads |
| FM-P12 Generic platform | No trade-specific concepts; neutral demo organisations |
| FM-P14 PostgreSQL-first · FM-P15 Organisation is the tenant boundary | RDS PostgreSQL, relational schema, `organisation_id` everywhere tenant-owned (ADR-001) |
| FM-P17–FM-P20 Identity principles (incl. **FM-P18 No orphan FieldMate users**) | Provider-neutral identity, onboarding-only user creation (ADR-002, ADR-004) |
| FM-P21 Access Core is central | Every organisation-scoped endpoint passes Access Core |
| FM-P25 Provider portability | Cognito and AWS SDK code confined to `FieldMate.Aws` and Terraform |
| FM-P29 Modular monolith before microservices | One shared API Lambda (ADR-003) |
| FM-P33 Infrastructure as Code · FM-P34 New technology requires justification | Terraform (ADR-007); every V00 service justified in the report |
| FM-P35–FM-P39 Observability principles | One structured record per request, explicit retention (ADR-005) |
| FM-P40 Security is explicit and proportionate | Least privilege, IAM DB auth, parameterised SQL, documented weaknesses |

## 5.1 Former AP references

Earlier drafts of this CR defined principles AP-01…AP-20 inline. They are now project principles or ADRs; code
comments that cite `CR AP-nn` resolve through this table.

| Former | Now | Former | Now |
|---|---|---|---|
| AP-01 Zero-cost-first | FM-P02 | AP-11 FieldMate never stores passwords | FM-P20 |
| AP-02 Stop/remove paid non-production resources | FM-P04, ADR-006 | AP-12 Identity provider abstraction | FM-P19, ADR-004 |
| AP-03 High performance through simplicity | FM-P07 | AP-13 Access Core is central | FM-P21 |
| AP-04 Generic platform | FM-P12 | AP-14 AI never bypasses application services | FM-P23 |
| AP-05 Provider portability | FM-P25, FM-P26 | AP-15 Minimal observability | FM-P35, ADR-005 |
| AP-06 PostgreSQL is the system of record | FM-P14, ADR-001 | AP-16 Organisation-level traceability | FM-P36 |
| AP-07 `organisation_id` is the tenant boundary | FM-P15 | AP-17 Explicit log retention and cleanup | FM-P37 |
| AP-08 Authentication and application identity are separate | FM-P17 | AP-18 No duplicate telemetry | FM-P38 |
| AP-09 Provider-neutral canonical identity | FM-P19, ADR-004 | AP-19 Infrastructure as Code | FM-P33, ADR-007 |
| AP-10 One Cognito User Pool initially | ADR-002 (V00 decision) | AP-20 Capability-first modular monolith | FM-P29, ADR-003 |

---

# 6. V00 logical architecture

```text
Authentication Sources
----------------------
Cognito native username/password
Google
Microsoft / Entra
Passkey / WebAuthn
Future OIDC/SAML providers
           |
           v
Amazon Cognito User Pool
(authentication/federation only)
           |
      OIDC / JWT
           |
           v
Amazon API Gateway
           |
           v
fieldmate-api-{env}
AWS Lambda
--------------------------------
Token validation / adapter
Identity resolution
Organisation context resolver
Access Core
Handlers / validation / errors
           |
           v
RDS Proxy (production/preferred when justified)
           |
           v
Amazon RDS PostgreSQL
--------------------------------
iam.user_profile
iam.authentication_identity
core.organisation
iam.organisation_member
iam.role
iam.permission
iam.role_permission
workforce.worker (minimal)
```

Cross-cutting:

```text
IaC + CI/CD
Minimal CloudWatch / OpenTelemetry
Explicit retention
Secrets / parameters
Database migrations
Correlation context
```

---

# 7. Authentication and authorisation flow

## 7.1 Authentication

1. User selects an authentication method.
2. Cognito authenticates directly or federates to the selected external IdP.
3. Cognito issues OIDC/JWT tokens.
4. Client calls FieldMate API with the access token.
5. API validates issuer, signature, audience/client and expiry.
6. Identity adapter extracts `issuer + subject`.
7. FieldMate resolves `iam.authentication_identity`.
8. The mapping resolves to canonical `iam.user_profile`.

An unknown identity is **not** persisted: the user is created only by an organisation-attachment action (amendment A1).

A JWT does **not** recreate the user mapping on every request.

---

## 7.2 Organisation context

1. Resolve FieldMate user.
2. Load organisation memberships.
3. If one applicable organisation exists, use it where UX/policy allows.
4. If several exist, user selects an organisation.
5. Client may carry requested organisation context.
6. Backend validates that the authenticated user is an active member.
7. Only after validation does the backend create trusted request context.

Conceptual trusted context:

```text
FieldMateRequestContext
- userId
- organisationId
- membershipId
- workerId?
- correlationId
- authenticationProvider
```

Never trust a raw client `organisationId` without membership validation.

---

## 7.3 Authorisation

Access Core evaluates:

- active organisation membership;
- role;
- permission;
- relevant resource ownership/scope;
- later: commercial entitlement.

Only then is the application handler executed.

---

# 8. PostgreSQL V00 data model

Minimum model:

```text
iam.user_profile
----------------
id PK
display_name
primary_email
status
created_at
updated_at

iam.authentication_identity
---------------------------
id PK
user_id FK -> iam.user_profile.id
issuer
subject
provider
identity_type
email_at_link_time
created_at
last_seen_at

core.organisation
-----------------
id PK
name
status
created_at
updated_at

iam.organisation_member
-----------------------
id PK
organisation_id FK
user_id FK
role_id FK
status
joined_at

iam.role
--------
id PK
organisation_id nullable depending on platform/org role design
code
name
status

iam.permission
--------------
id PK
code
resource
action

iam.role_permission
-------------------
role_id FK
permission_id FK

workforce.worker
----------------
id PK
organisation_id FK
membership_id FK
status
```

Recommended uniqueness/index concepts:

- unique `(issuer, subject)` on authentication identity;
- index `authentication_identity.user_id`;
- unique/index `(organisation_id, user_id)` on active membership as appropriate;
- indexes beginning with `organisation_id` for tenant queries;
- worker lookup by `(organisation_id, membership_id)`;
- use UUID/ULID consistently according to the project convention frozen during LLD.

Do not use email as the canonical identity key.

---

# 9. API/runtime scope

V00 should provide only the minimum APIs needed to prove the foundation.

Indicative contracts; final names must be reconciled with the X-Ray before coding:

```text
GET /me
GET /me/organisations
POST /me/organisation-context       # only if server-side context endpoint is needed
GET /identity/choose-organisation
POST /identity/accept-invitation    # may be deferred if invitation flow is assigned to V02
GET /health                         # minimal operational health
```

Normal Cognito-managed login/registration/password-reset flows should not be reimplemented by the main Lambda.

---

# 10. RDS and RDS Proxy strategy

RDS PostgreSQL is the approved structured store.

RDS Proxy is the preferred production Lambda connection-pooling layer where Lambda concurrency warrants it.

However, because V00 follows zero-cost-first:

- do not pay for RDS Proxy in low-concurrency local/dev/test environments merely for architectural symmetry;
- allow environment-specific configuration;
- production use should be enabled where justified by expected concurrency/connection behaviour;
- application DB access code must not depend directly on RDS Proxy-specific behaviour.

The logical contract is PostgreSQL; RDS Proxy is an infrastructure optimisation.

---

# 11. Minimal telemetry design

For a successful authenticated request, do not emit a cascade of logs.

A minimal structured record, where needed, should resemble:

```json
{
  "level": "INFO",
  "operation": "GetCurrentUser",
  "organisationId": "org_123",
  "userId": "usr_456",
  "correlationId": "corr_789",
  "durationMs": 41
}
```

Errors:

```json
{
  "level": "ERROR",
  "operation": "ResolveOrganisationContext",
  "organisationId": "org_123",
  "userId": "usr_456",
  "correlationId": "corr_789",
  "errorCode": "ORG_MEMBERSHIP_DENIED",
  "durationMs": 18
}
```

Do not log:

- access tokens;
- refresh tokens;
- passwords;
- passkey material;
- full customer payloads;
- secrets;
- arbitrary headers containing sensitive values.

---

# 12. Audit versus operational logs

Keep three categories separate:

### Operational telemetry
Temporary. Used to diagnose availability/performance/errors.

### Security/business audit
Durable only for actions that genuinely require an audit trail, such as role/permission changes or privileged administration.

### Business history
Stored as application/domain data later, not reconstructed from CloudWatch.

Do not use CloudWatch logs as the business system of record.

---

# 13. Security requirements

- HTTPS only.
- Validate JWT issuer, signature, audience/client and expiry.
- Least-privilege IAM.
- Secrets must not be hard-coded.
- Do not store passwords or password hashes in FieldMate.
- Do not expose one organisation's data to another organisation.
- Parameterise all SQL.
- Use migrations rather than ad-hoc schema changes.
- Use DB credentials/secrets through the approved infrastructure mechanism.
- Prevent account/organisation enumeration where applicable.
- Persist users only through atomic, idempotent onboarding (create organisation or accept invitation; amendment A1).
- Design account linking explicitly; never silently merge users based only on matching email.

---

# 14. Identity linking

A user may eventually authenticate through more than one login method.

Desired conceptual model:

```text
usr_100
  |
  +-- authentication_identity: Cognito/native
  +-- authentication_identity: Cognito/Google
  +-- authentication_identity: later Entra mapping
```

Do not assume same email automatically means same person.

Any identity-link operation must require secure proof/control of both identities or an approved administrative process.

---

# 15. Future migration away from Cognito

The V00 design must permit:

```text
Today
Google / Microsoft / Native / Passkey
        -> Cognito
        -> Cognito JWT
        -> IdentityProviderAdapter
        -> FieldMate user

Future
Google / Microsoft / Native / Passkey
        -> Entra / Ping / Auth0 / other
        -> Provider JWT
        -> IdentityProviderAdapter
        -> SAME FieldMate user
```

Only authentication provider mappings should change.

Organisation membership, roles, worker mappings and all future business entities remain unchanged.

Native Cognito-password users may require:

- password reset, or
- controlled just-in-time credential migration.

This is accepted and preferable to FieldMate owning passwords.

---

# 16. CI/CD and IaC

Minimum delivery pipeline:

```text
Commit
  -> build
  -> unit tests
  -> static checks
  -> IaC plan/validation
  -> package Lambda
  -> deploy environment
  -> run DB migrations
  -> smoke test
```

Database migration safety must be considered before automatic production execution.

Do not mix unrelated prototype changes into this CR.

---

# 17. Cost controls

V00 must explicitly minimise:

- always-on compute;
- oversized RDS instances;
- unnecessary RDS Proxy environments;
- excessive CloudWatch ingestion;
- excessive trace sampling;
- NAT Gateway dependency where avoidable;
- duplicate environments;
- verbose retention;
- unused test infrastructure.

Track approximate V00 cost by environment.

For dev/test, document:

```text
Resource
Idle cost?
Can stop/delete?
Automatic cleanup strategy?
```

Cost is an architectural requirement, not an afterthought.

---

# 18. Implementation order

## Phase 0 — Reconcile architecture

Before coding:

1. Read the X-Ray.
2. Read the Stage-1 prototype plan.
3. Inspect current repository.
4. Identify existing identity/client abstractions.
5. Extract V00-relevant X-Ray rows.
6. Identify any conflicts with this CR.
7. Produce a compact execution plan.
8. Obtain approval before implementation if the controlling Claude workflow requires plan approval.

Do not silently rewrite architecture.

---

## Phase 1 — Engineering skeleton

- backend solution/module structure;
- configuration/environment model;
- basic API host;
- error/validation conventions;
- correlation middleware/context;
- unit/integration test setup.

---

## Phase 2 — PostgreSQL and migrations

- provision development PostgreSQL according to environment policy;
- migration framework;
- V00 schemas/tables;
- indexes/constraints;
- repository/data-access abstraction;
- transaction handling.

---

## Phase 3 — Cognito and provider-neutral identity

- Cognito User Pool;
- app clients as required for web/mobile;
- native login configuration;
- optional Google configuration if credentials/config are available;
- provider-neutral token/identity adapter;
- onboarding-only user creation (create organisation / accept invitation; amendment A1);
- user resolution.

Do not hard-code external provider secrets.

---

## Phase 4 — Organisation context

- organisation;
- membership;
- choose/switch organisation support;
- trusted request context;
- cross-org access denial.

---

## Phase 5 — Access Core

Minimum:

- authentication required;
- membership required;
- role/permission evaluation;
- resource-policy hook for future verticals.

Do not build the full future commercial entitlement engine unless needed by V00.

---

## Phase 6 — Minimal telemetry

- structured correlation;
- `organisationId`;
- error logging;
- basic latency/error metrics;
- log retention;
- no payload logging;
- no duplicate telemetry.

---

## Phase 7 — IaC and CI/CD

- reproducible infrastructure;
- repeatable deployment;
- migrations;
- dev resource shutdown/cleanup approach;
- smoke tests.

---

## Phase 8 — Foundation acceptance

Prove the following:

```text
User authenticates
 -> Cognito issues token
 -> FieldMate validates token
 -> resolves canonical user
 -> resolves/validates organisation
 -> Access Core authorises
 -> PostgreSQL query succeeds
 -> minimal organisation-scoped trace exists
```

---

# 19. Tests

Minimum test categories:

### Identity
- valid native authentication path;
- valid federated identity resolution where configured;
- invalid token;
- expired token;
- wrong issuer/audience;
- unknown authentication identity;
- unknown identity persists nothing; onboarding is atomic and idempotent (amendment A1).

### Organisation
- one user / one organisation;
- one user / multiple organisations;
- inactive membership;
- cross-organisation access denied;
- client-supplied invalid organisation rejected.

### Access
- permission allowed;
- permission denied;
- worker mapping optional;
- owner/admin role behaviour.

### Data
- FK constraints;
- unique identity mapping;
- migrations up;
- migration rollback strategy documented/tested where practical;
- tenant indexes.

### Telemetry
- correlation ID present;
- organisation ID present for tenant request;
- tokens/passwords absent from logs;
- retention configured;
- errors diagnosable without verbose logging.

### Cost
- dev/test environment can be shut down or removed cleanly;
- no unnecessary hourly resources introduced.

---

# 20. Definition of Done

V00 is complete only when:

- [ ] architecture references were reviewed before implementation;
- [ ] one FieldMate Cognito User Pool is configured;
- [ ] authentication-provider-specific code is isolated behind an adapter/boundary;
- [ ] FieldMate canonical user exists in PostgreSQL;
- [ ] provider mappings use provider-neutral identity data;
- [ ] organisations and memberships are in PostgreSQL;
- [ ] minimal roles/permissions work;
- [ ] Access Core protects a real test endpoint;
- [ ] `organisation_id` isolation is proven;
- [ ] RDS PostgreSQL migrations are repeatable;
- [ ] RDS Proxy policy is environment-aware and cost-conscious;
- [ ] no passwords are stored by FieldMate;
- [ ] no application business mappings are stored in Cognito;
- [ ] minimal logging uses `organisationId` and `correlationId`;
- [ ] retention/cleanup is explicit;
- [ ] no sensitive payload/token logging exists;
- [ ] IaC reproduces the environment;
- [ ] CI build/tests pass;
- [ ] dev/test paid resources have a stop/delete/cleanup strategy;
- [ ] approximate cost impact is documented;
- [ ] cross-org access tests pass;
- [ ] V00 does not implement unrelated business features.

---

# 21. Claude execution instructions

This markdown file is a CR input to Claude.

Claude must:

1. Read this CR completely.
2. Read `docs/FieldMate_Master_Screen_Architecture_XRay_FINAL.xlsx`.
3. Read `docs/FieldMate_Stage1_Prototype_Implementation_Plan.docx`.
4. Inspect the current repository and current generic prototype.
5. Extract the exact rows/components relevant to V00.
6. Validate this CR against the existing architecture.
7. Highlight genuine contradictions before coding.
8. Prepare a concise implementation plan in dependency order.
9. Keep the implementation minimal and cost-aware.
10. Do not introduce additional AWS services unless technically necessary and explicitly justified.
11. Prefer provider-neutral interfaces where reasonable.
12. Use one coherent CR/branch/session.
13. Use minimal subagents.
14. Build/test frequently.
15. Do not undertake unrelated refactoring.
16. Do not start VS01 business functionality inside V00.
17. Commit/push only after the agreed validation gates are met.

---

# 22. Expected final implementation report

Claude's final V00 report should include:

1. V00 scope implemented.
2. Architecture/X-Ray rows used.
3. Deviations from CR/X-Ray, if any.
4. AWS resources created.
5. Resources intentionally not created and why.
6. PostgreSQL schemas/tables/migrations.
7. Cognito configuration.
8. Authentication methods enabled.
9. Provider-neutral identity implementation.
10. Organisation-context implementation.
11. Access Core implementation.
12. Minimal telemetry implementation.
13. Log retention/cleanup.
14. Security decisions.
15. Cost estimate by environment.
16. Dev/test stop/delete procedure.
17. Tests executed/results.
18. CI/CD/IaC status.
19. Git commit/branch/push status.
20. Known limitations/deferred V00 items.
21. Readiness recommendation for VS01.

---

# 23. Approved amendments

These amendments were approved during V00 and supersede earlier text in this CR where they conflict.

| # | Amendment | Effect | Records |
|---|---|---|---|
| A1 | **No orphan FieldMate users** | Successful authentication never persists a user. A user (with authentication identity) is created only atomically with an organisation relationship: `POST /onboarding/create-business` (organisation + user + identity + OWNER membership, idempotent) or `POST /identity/accept-invitation` (user/identity if new + membership + invitation acceptance). Unknown identities receive `IDENTITY_NOT_PROVISIONED`; users without a valid membership receive `NO_ACTIVE_MEMBERSHIP`. Replaces the "first-login provisioning" wording in §7.1, §13, §18 Phase 3 and §19 | FM-P18, ADR-004 |
| A2 | **Parameter Store instead of Secrets Manager** | The database owner password is an SSM Parameter Store standard-tier `SecureString` (`/fieldmate/<env>/database/owner-password`), never in Terraform state or plans | FM-P03, ADR-008 |
| A3 | **Dev database stopped when idle, parked weekly** | Deployments restore/start, then stop the dev database; evenings stop it; Fridays park it (final snapshot + delete) | FM-P04, ADR-006 |
| A4 | **V00 endpoint set** | Implemented: `GET /health`, `GET /identity/welcome-landing`, `POST /onboarding/create-business`, `POST /identity/accept-invitation`, `GET /me`, `GET /identity/choose-organisation`, `GET /me/context`. Not built: `/me/organisations` (X-Ray `choose-organisation` used), `POST /me/organisation-context` (stateless `X-Organisation-Id` header validated per request). `GET /team/members` was removed as premature Team & Access functionality; role-permission enforcement is proven through a test-only probe | FM-P01, FM-P28 |
| A5 | **Governance** | Project-wide principles moved to the architecture principles document; this CR cites them (§5) | — |

---

## Final architecture principle

> **Cognito authenticates initially. PostgreSQL owns the canonical FieldMate identity and every organisation/business relationship. AWS services are implementation choices behind deliberate boundaries, not the FieldMate domain model. Build for zero idle cost where practical, high performance through simplicity, minimal telemetry, and provider portability.**
V00 ADDENDUM — NO ORPHAN FIELDMATE USERS

Please incorporate this correction into the current V00 implementation without restarting or broad refactoring.

New invariant:

A persistent FieldMate application user must never exist in PostgreSQL without an organisation relationship.

Therefore:

1. Do NOT create iam.user_profile merely because a previously unknown Cognito identity successfully authenticates.

2. For an unknown identity, persist the FieldMate user only when one of these occurs:
   - the authenticated person creates a new organisation; or
   - the authenticated person accepts a valid organisation invitation.

3. User creation and first organisation membership must be atomic.

For create-organisation flow, one transaction should conceptually create:
- core.organisation
- iam.user_profile
- iam.authentication_identity
- iam.organisation_member with OWNER role

For invitation acceptance, one transaction should conceptually create:
- iam.user_profile if not already present
- iam.authentication_identity
- iam.organisation_member
- mark invitation accepted

4. If authentication succeeds but there is no valid organisation creation or invitation flow:
   - do not persist user_profile;
   - do not persist authentication_identity;
   - keep the identity only in Cognito;
   - tenant functionality must remain unavailable.

5. Existing FieldMate users must always resolve through:
authentication_identity
→ user_profile
→ at least one organisation_member

6. Access Core must deny tenant-scoped access if an existing persisted user somehow has zero valid memberships.

7. Add tests for:
- unknown authenticated identity does not create DB user automatically;
- create organisation creates user + org + membership atomically;
- accept invitation creates user + membership atomically;
- transaction rollback leaves no orphan user;
- existing user with zero membership is denied;
- repeated create/join flow is idempotent and does not duplicate user/membership.

Treat this as a targeted V00 architecture correction, not as a reason to restart the implementation.