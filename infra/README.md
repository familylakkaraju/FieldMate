# FieldMate V00 infrastructure runbook

Terraform for the V00 Foundation ([CR-FM-V00](../docs/v00/CR-FM-V00-Foundation.md)), following
[ADR-007](../docs/architecture/adr/ADR-007-terraform-iac.md). One state file per environment. Everything V00 needs
on AWS is here; nothing is created by hand in the console (FM-P33).

```text
infra/
  terraform/bootstrap/   once per account: state bucket, GitHub OIDC deploy role, owner-password parameters
  terraform/stack/       one environment: network, identity, database, api   (env/<env>.tfvars)
  terraform/modules/     network | identity | database | api
  scripts/               package-lambdas.sh, run-db-ops.sh, smoke-test.sh, dev-database.sh, dev-env.ps1
```

## What gets created (dev)

| Resource | Name | Idle cost |
|---|---|---|
| VPC, 2 private subnets, security groups | `fieldmate-dev` | none: no internet gateway, NAT Gateway or VPC endpoints |
| Cognito user pool (Essentials), managed-login domain, web client, smoke client | `fieldmate-users-dev` | none within the free tier (10,000 MAU) |
| Pre-token-generation Lambda | `fieldmate-pre-token-dev` | none (pay per sign-in) |
| RDS for PostgreSQL 17, `db.t4g.micro`, 20 GiB gp3, single-AZ | `fieldmate-postgres-dev` | **yes while it exists**: stopped when idle, parked weekly (§4) |
| Database owner password (bootstrap) | `/fieldmate/dev/database/owner-password` | none: Parameter Store standard-tier SecureString (ADR-008) |
| API Lambda (.NET 10, arm64, in VPC) | `fieldmate-api-dev` | none |
| DB-ops Lambda (migrations, in VPC) | `fieldmate-db-ops-dev` | none |
| HTTP API + JWT authorizer | `fieldmate-api-dev` | none |
| Log groups (7-day app, 14-day db-ops, 7-day trigger), saved Logs Insights queries | | none at rest beyond tiny storage |

Not created in dev: Secrets Manager (Parameter Store instead), RDS Proxy, Multi-AZ, X-Ray tracing, alarms,
Enhanced Monitoring, Performance Insights, RDS log exports, API Gateway access logs, KMS customer keys, SES, SMS.

## 1. Bootstrap (once per AWS account, by an administrator)

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var 'github_repository=familylakkaraju/FieldMate'
```

This creates the state bucket, the `fieldmate-github-deploy` role (assumable only from this repository's `dev` and
`prod` GitHub environments), and each environment's database owner password as a free SSM `SecureString` at
`/fieldmate/<env>/database/owner-password`. The password is generated ephemerally and written write-only, so it
never appears in Terraform state. It lives outside the environment stack, so it survives parking.

Deploy-role guardrails (explicit denies narrowing `PowerUserAccess`):
- it can read only `/fieldmate/*` parameters;
- it can never create, change or delete parameters;
- it cannot use Secrets Manager at all.

To rotate the owner password:
1. Increment `db_owner_password_version` in bootstrap and apply.
2. Increment the same variable in `env/<env>.tfvars` and deploy.

Then, in GitHub:

* **Repository variables:** `AWS_DEPLOY_ROLE_ARN` and `TF_STATE_BUCKET` (bootstrap outputs); optionally `AWS_REGION` (default `eu-west-2`).
* **Environments:** `dev` (no protection) and `prod` (**required reviewers**: this gates production deploys and migrations).
* **`dev` environment secrets:** `SMOKE_USERNAME` (an email address you control) and `SMOKE_PASSWORD` (12+ characters, upper/lower/digit).
* **Optional federation:** variables `GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID` with secrets `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_SECRET`. Without these, only native sign-in (password or passkey) is enabled. Redirect URI to register with Google/Entra: `<hosted_login_url>/oauth2/idpresponse`.

The deploy workflows stay inert (CI still runs) until `AWS_DEPLOY_ROLE_ARN` and `TF_STATE_BUCKET` are set.

## 2. Deploy

Pushing to `main` deploys **dev** (`backend-deploy.yml`):

1. CI → package.
2. Read the owner password from Parameter Store (masked; passed to Terraform as an ephemeral variable).
3. If the database is parked, restore it from the newest park snapshot. If it is stopped, start it.
4. `terraform apply` → migrate → smoke test.
5. **Stop the database again**, even if a step failed.

Run the workflow manually with `keep_database_running` to leave the database up for a working session; the
evening stop still applies.

**prod** is manual only (*Actions → Backend deploy → Run workflow → prod*). It waits for reviewer approval, takes
a database snapshot before migrating, and is never stopped or parked by automation.

Manual equivalent:

```bash
bash infra/scripts/package-lambdas.sh            # -> backend/artifacts/api.zip, db-ops.zip
cd infra/terraform/stack
cp env/dev.s3.tfbackend.example env/dev.s3.tfbackend   # fill in the bucket
terraform init -backend-config=env/dev.s3.tfbackend
export TF_VAR_db_owner_password="$(aws ssm get-parameter --name /fieldmate/dev/database/owner-password \
  --with-decryption --query Parameter.Value --output text)"   # ephemeral: never stored in state or plans
# If parked: export TF_VAR_db_snapshot_identifier=<newest fieldmate-postgres-dev-park-… snapshot>
terraform apply -var-file=env/dev.tfvars \
  -var api_package_path=$PWD/../../../backend/artifacts/api.zip \
  -var dbops_package_path=$PWD/../../../backend/artifacts/db-ops.zip
bash ../../scripts/run-db-ops.sh "$(terraform output -raw dbops_function_name)" \
  "$(terraform output -raw db_owner_password_parameter)" '{"operation":"migrate"}'
bash ../../scripts/dev-database.sh stop dev         # when finished
```

## 3. Database operations

Migrations are plain SQL (`backend/src/FieldMate.Database/Migrations`), applied by `fieldmate-db-ops-{env}` from
inside the VPC. The pipeline reads the owner password from Parameter Store and passes it in the invocation
payload. It is never logged, and the API never holds it: the API connects as `fieldmate_app` with IAM tokens.

| Operation | Payload | Allowed in prod |
|---|---|---|
| Apply pending migrations | `{"operation":"migrate"}` | yes (after snapshot) |
| Applied versions | `{"operation":"status"}` | yes |
| Roll back to version N | `{"operation":"rollback","targetVersion":N}` | **no**: forward-fix or snapshot restore |
| Demo organisations | `{"operation":"seed-dev"}` | no |
| Invitation (dev stand-in for Team & Access) | `{"operation":"create-invitation","organisationId":"…","role":"WORKER","invitedEmail":"…","createWorker":true}` | no |

`create-invitation` prints the one-time token only when run locally, never in CI logs.

## 4. Cost control: stop when idle, park weekly (FM-P04, ADR-006)

Non-production resources do not run when nobody is using them. The database is the only V00 resource that
charges while idle.

| Action | What happens | Billed afterwards | When |
|---|---|---|---|
| **Stop** | Instance stopped | Storage only (about $0.09/day for 20 GiB) | After every dev deployment; every evening 19:00 UTC (Saturday–Thursday) |
| **Park** | Final snapshot, then delete; only the two newest park snapshots are kept | Snapshot storage only (cents) | Every Friday 19:00 UTC; on demand |
| **Start** | Stopped instance started | Instance-hours | Deployments; `dev-env.ps1 start` |
| **Restore** | Recreated from the newest park snapshot (about 10–15 minutes) | Instance-hours | The next deployment after parking (`dev-env.ps1 unpark` runs one) |

`dev-cost-control.yml` runs the evening stop and the Friday park; its manual run offers `stop`, `park` or
`status`. Weekly parking also means a stopped instance never reaches AWS's 7-day automatic restart.

```powershell
./infra/scripts/dev-env.ps1 status    # instance state and park snapshots
./infra/scripts/dev-env.ps1 start     # working session (the evening stop still applies)
./infra/scripts/dev-env.ps1 stop
./infra/scripts/dev-env.ps1 park      # final snapshot, delete, prune old snapshots
./infra/scripts/dev-env.ps1 unpark    # gh workflow run: restore + deploy, keep running until the evening stop
```

Notes:
- **Parking deletes only the database.** Cognito, API Gateway and Lambda cost nothing idle and stay. Recreating the Cognito pool would change the token issuer and orphan every `iam.authentication_identity` row.
- **Parking briefly starts a stopped instance.** RDS takes a final snapshot only from an available instance.
- **Restores have a minimum charge.** They are billed for at least 10 minutes.
- **Full teardown** of a non-production environment: `terraform destroy -var-file=env/dev.tfvars …`. This deletes the user pool and therefore all test identities.

## 5. Offline checks (no AWS credentials needed)

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform -chdir=bootstrap init -backend=false && terraform -chdir=bootstrap validate
terraform -chdir=stack init -backend=false && terraform -chdir=stack validate && terraform -chdir=stack test
```

`stack/tests/plan.tftest.hcl` plans and applies dev, prod-like (RDS Proxy, alarms) and parked configurations
against a mocked AWS provider. It catches expression and wiring errors, not AWS-side validation.
