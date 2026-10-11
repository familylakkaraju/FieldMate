# FieldMate V00 infrastructure runbook

Terraform for the V00 Foundation (CR-FM-V00). One state file per environment. Everything V00 needs on AWS is
here; nothing is created by hand in the console.

```text
infra/
  terraform/bootstrap/   one-time per account: state bucket + GitHub OIDC deploy role (local state)
  terraform/stack/       one environment: network, identity, database, api   (env/<env>.tfvars)
  terraform/modules/     network | identity | database | api
  scripts/               package-lambdas.sh, run-db-ops.sh, smoke-test.sh, dev-env.ps1
```

## What gets created (dev)

| Resource | Name | Idle cost |
|---|---|---|
| VPC, 2 private subnets, security groups | `fieldmate-dev` | none: no internet gateway, NAT Gateway or VPC endpoints |
| Cognito user pool (Essentials), managed-login domain, web client, smoke client | `fieldmate-users-dev` | none within the free tier (10,000 MAU) |
| Pre-token-generation Lambda | `fieldmate-pre-token-dev` | none (pay per sign-in) |
| RDS for PostgreSQL 17, `db.t4g.micro`, 20 GiB gp3, single-AZ | `fieldmate-postgres-dev` | **yes**: instance-hours while running, storage always |
| RDS-managed owner secret | `rds!db-…` | **yes**: about $0.40/month |
| API Lambda (.NET 10, arm64, in VPC) | `fieldmate-api-dev` | none |
| DB-ops Lambda (migrations, in VPC) | `fieldmate-db-ops-dev` | none |
| HTTP API + JWT authorizer | `fieldmate-api-dev` | none |
| Log groups (7-day app, 14-day db-ops, 7-day trigger), saved Logs Insights queries | | none at rest beyond tiny storage |

Not created in dev: RDS Proxy, Multi-AZ, X-Ray tracing, alarms, Enhanced Monitoring, Performance Insights,
RDS log exports, API Gateway access logs, KMS customer keys, SES, SMS.

## 1. Bootstrap (once per AWS account, by an administrator)

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var 'github_repository=familylakkaraju/FieldMate'
```

Then, in GitHub:

* **Repository variables:** `AWS_DEPLOY_ROLE_ARN` and `TF_STATE_BUCKET` (bootstrap outputs); optionally `AWS_REGION` (default `eu-west-2`).
* **Environments:** `dev` (no protection) and `prod` (**required reviewers**: this gates production deploys and migrations).
* **`dev` environment secrets:** `SMOKE_USERNAME` (an email address you control) and `SMOKE_PASSWORD` (12+ characters, upper/lower/digit).
* **Optional federation:** variables `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID` with secrets `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`. Without these, only native sign-in (password or passkey) is enabled. Redirect URI to register with Google/Entra: `<hosted_login_url>/oauth2/idpresponse`.

The deploy workflows stay inert (CI still runs) until `AWS_DEPLOY_ROLE_ARN` and `TF_STATE_BUCKET` are set.

## 2. Deploy

Pushing to `main` deploys **dev**: CI → package → `terraform apply` → start the database if stopped → migrate →
smoke test. **prod** is manual only (*Actions → Backend deploy → Run workflow → prod*). It waits for reviewer
approval and takes a database snapshot before migrating.

Manual equivalent:

```bash
bash infra/scripts/package-lambdas.sh            # -> backend/artifacts/api.zip, db-ops.zip
cd infra/terraform/stack
cp env/dev.s3.tfbackend.example env/dev.s3.tfbackend   # fill in the bucket
terraform init -backend-config=env/dev.s3.tfbackend
terraform apply -var-file=env/dev.tfvars \
  -var api_package_path=$PWD/../../../backend/artifacts/api.zip \
  -var dbops_package_path=$PWD/../../../backend/artifacts/db-ops.zip
bash ../../scripts/run-db-ops.sh "$(terraform output -raw dbops_function_name)" \
  "$(terraform output -raw db_owner_secret_arn)" '{"operation":"migrate"}'
```

## 3. Database operations

Migrations are plain SQL (`backend/src/FieldMate.Database/Migrations`), applied by `fieldmate-db-ops-{env}` from
inside the VPC. The pipeline reads the RDS-managed owner password and passes it in the invocation payload. It is
never logged, and the API never holds it: the API connects as `fieldmate_app` with IAM tokens.

| Operation | Payload | Allowed in prod |
|---|---|---|
| Apply pending migrations | `{"operation":"migrate"}` | yes (after snapshot) |
| Applied versions | `{"operation":"status"}` | yes |
| Roll back to version N | `{"operation":"rollback","targetVersion":N}` | **no**: forward-fix or snapshot restore |
| Demo organisations | `{"operation":"seed-dev"}` | no |
| Invitation (dev stand-in for Team & Access) | `{"operation":"create-invitation","organisationId":"…","role":"WORKER","invitedEmail":"…","createWorker":true}` | no |

`create-invitation` prints the one-time token only when run locally, never in CI logs.

## 4. Cost control and cleanup (CR AP-02)

| Resource | Idle cost? | Stop/delete? | Automatic cleanup |
|---|---|---|---|
| RDS instance | yes (about $13/month if left running) | stop, or park | nightly stop (`dev-shutdown.yml`, 19:00 UTC); AWS's 7-day auto-restart is re-stopped the same evening |
| RDS storage + automated backups | yes (about $2.5–3/month for 20 GiB) | park (snapshot + delete) | 1-day backup retention in dev |
| Owner secret | yes ($0.40/month) | deleted with the instance | — |
| Lambda, API Gateway, Cognito | no | keep | — |
| CloudWatch logs | ingestion only | — | 7/14/30-day retention, set on every log group |
| Lambda packages (CI artifacts) | no | — | 7-day artifact retention |

```powershell
./infra/scripts/dev-env.ps1 status
./infra/scripts/dev-env.ps1 stop      # evening / weekend
./infra/scripts/dev-env.ps1 start
./infra/scripts/dev-env.ps1 park   -TfVarArgs '-var=api_package_path=…','-var=dbops_package_path=…'   # weeks idle
./infra/scripts/dev-env.ps1 unpark -TfVarArgs '-var=api_package_path=…','-var=dbops_package_path=…'
```

Parking removes only the database (`database_enabled=false`). The Cognito pool deliberately survives: recreating
it would change the token issuer and orphan every `iam.authentication_identity` row.

Full teardown of a non-production environment: `terraform destroy -var-file=env/dev.tfvars …`. This deletes the
user pool and therefore all test identities.

## 5. Offline checks (no AWS credentials needed)

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform -chdir=stack init -backend=false && terraform -chdir=stack validate && terraform -chdir=stack test
```

`stack/tests/plan.tftest.hcl` plans and applies dev, prod-like (RDS Proxy, alarms) and parked configurations
against a mocked AWS provider. It catches expression and wiring errors, not AWS-side validation.
