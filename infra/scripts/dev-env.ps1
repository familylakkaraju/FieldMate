<#
.SYNOPSIS
  Cost control for a FieldMate non-production environment (CR AP-02): stop, start, status, park, unpark.

.DESCRIPTION
  stop    Stop the RDS instance (storage still billed; AWS restarts a stopped instance after 7 days, which the
          nightly dev-shutdown workflow stops again).
  start   Start the RDS instance and wait until it is available.
  status  Show the instance status.
  park    For long inactivity: take a manual snapshot, then remove the instance with Terraform
          (database_enabled=false). Cognito, API Gateway and Lambda stay: they have no idle cost and keeping
          Cognito keeps every authentication identity (issuer + subject) valid.
  unpark  Recreate the instance from the newest park snapshot.

.EXAMPLE
  ./infra/scripts/dev-env.ps1 stop
  ./infra/scripts/dev-env.ps1 park -TfVarArgs '-var=api_package_path=backend/artifacts/api.zip','-var=dbops_package_path=backend/artifacts/db-ops.zip'
#>
param(
    [Parameter(Mandatory = $true)][ValidateSet('stop', 'start', 'status', 'park', 'unpark')][string]$Action,
    [ValidateSet('dev', 'test')][string]$Environment = 'dev',
    [string]$Region = 'eu-west-2',
    [string[]]$TfVarArgs = @()
)

$ErrorActionPreference = 'Stop'
$instance = "fieldmate-postgres-$Environment"
$stack = Join-Path $PSScriptRoot '..\terraform\stack'

function Get-Status {
    try { aws rds describe-db-instances --region $Region --db-instance-identifier $instance --query 'DBInstances[0].DBInstanceStatus' --output text 2>$null }
    catch { 'absent' }
}

switch ($Action) {
    'status' { "${instance}: $(Get-Status)" }
    'stop' {
        if ((Get-Status) -eq 'available') { aws rds stop-db-instance --region $Region --db-instance-identifier $instance | Out-Null; "Stop requested for $instance." }
        else { "$instance is $(Get-Status); nothing to stop." }
    }
    'start' {
        if ((Get-Status) -eq 'stopped') { aws rds start-db-instance --region $Region --db-instance-identifier $instance | Out-Null }
        aws rds wait db-instance-available --region $Region --db-instance-identifier $instance
        "$instance is available."
    }
    'park' {
        if ((Get-Status) -eq 'stopped') { aws rds start-db-instance --region $Region --db-instance-identifier $instance | Out-Null }
        aws rds wait db-instance-available --region $Region --db-instance-identifier $instance
        $snapshot = "$instance-park-$(Get-Date -Format 'yyyyMMdd-HHmm')"
        aws rds create-db-snapshot --region $Region --db-instance-identifier $instance --db-snapshot-identifier $snapshot | Out-Null
        aws rds wait db-snapshot-available --region $Region --db-snapshot-identifier $snapshot
        terraform "-chdir=$stack" apply "-var-file=env/$Environment.tfvars" '-var=database_enabled=false' @TfVarArgs
        "Parked. Snapshot: $snapshot (storage-only cost). Unpark with: dev-env.ps1 unpark"
    }
    'unpark' {
        $snapshot = aws rds describe-db-snapshots --region $Region --snapshot-type manual `
            --query "reverse(sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier, '$instance-park-')], &SnapshotCreateTime))[0].DBSnapshotIdentifier" --output text
        if (-not $snapshot -or $snapshot -eq 'None') { throw "No park snapshot found for $instance." }
        terraform "-chdir=$stack" apply "-var-file=env/$Environment.tfvars" '-var=database_enabled=true' "-var=db_snapshot_identifier=$snapshot" @TfVarArgs
        "Restored $instance from $snapshot. Delete old park snapshots when no longer needed."
    }
}
