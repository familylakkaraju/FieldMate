# FieldMate backend (V00 Foundation)

.NET 10, one API host (`fieldmate-api-{env}` on AWS Lambda, or Kestrel locally), PostgreSQL via Npgsql.
Built to the [FieldMate Architecture Principles](../docs/architecture/FieldMate-Architecture-Principles.md) and
[ADRs](../docs/architecture/adr/README.md); scope in [CR-FM-V00](../docs/v00/CR-FM-V00-Foundation.md).

```text
src/FieldMate.Core       provider-neutral: identity boundary, organisation context, Access Core, onboarding,
                         data access, telemetry. No AWS references.
src/FieldMate.Aws        the only AWS-specific code: API Gateway verified-claims adapter, RDS IAM tokens
src/FieldMate.Api        thin HTTP host: request pipeline, access filter, V00 endpoints
src/FieldMate.Database   SQL migrations (up + down), runner, dev seeding; CLI and fieldmate-db-ops Lambda
tests/                   unit tests; integration tests against a real PostgreSQL
```

## Request path

```text
Bearer token → IIdentityProviderAdapter (issuer + subject) → FieldMate user (≥1 valid membership)
  → X-Organisation-Id validated against an active membership → trusted FieldMateRequestContext
  → Access Core (role permission, tenant boundary, resource policies) → handler → PostgreSQL
```

A FieldMate user exists only together with an organisation relationship. Users are created only by
`POST /onboarding/create-business` or `POST /identity/accept-invitation`, each in a single transaction, and a
deferred database constraint rejects any user committed without a membership.

| Endpoint | Access |
|---|---|
| `GET /health` | public liveness, no database |
| `GET /identity/welcome-landing` | public: provider-hosted sign-in/registration/reset/logout entry points |
| `POST /onboarding/create-business` | valid token; requires `Idempotency-Key`; creates org + user (if new) + OWNER membership |
| `POST /identity/accept-invitation` | valid token; creates user (if new) + membership; consumes the invitation |
| `GET /me` | FieldMate user |
| `GET /identity/choose-organisation` | FieldMate user |
| `GET /me/context` | organisation + `organisation.read`: role, permissions and worker for the selected organisation |

Role-differentiated permissions (e.g. `team.read`: OWNER, ADMIN, MANAGER, not WORKER) are proven by the
integration tests through a test-only probe host (`AccessProbeHost`), which uses the production composition plus
a probe route. The public API carries no scaffolding endpoints.

## Local development

Needs the .NET 10 SDK and PostgreSQL 15+.

```powershell
cd backend
dotnet build FieldMate.slnx
$env:FIELDMATE_TEST_DB = "Host=localhost;Port=5432;Username=postgres;Password=…;Database=postgres"
dotnet test --solution FieldMate.slnx        # integration tests skip locally without FIELDMATE_TEST_DB
dotnet format FieldMate.slnx --verify-no-changes
```

Run the API against a local database and a real Cognito pool (in-process JWKS validation):

```powershell
$env:FIELDMATE_DB_CONNECTION = "Host=localhost;Database=fieldmate;Username=postgres;Password=…"
dotnet run --project src/FieldMate.Database -- migrate
dotnet run --project src/FieldMate.Database -- seed-dev
$env:Database__ConnectionString = "Host=localhost;Database=fieldmate;Username=postgres;Password=…"
$env:Identity__Issuer = "https://cognito-idp.eu-west-2.amazonaws.com/<pool-id>"
$env:Identity__Audiences__0 = "<web-client-id>"
$env:Identity__Oidc__JwksUri = "$env:Identity__Issuer/.well-known/jwks.json"
dotnet run --project src/FieldMate.Api
```
