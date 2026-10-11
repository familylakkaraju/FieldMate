<#
.SYNOPSIS
  Dev database cost control from Windows (FM-P04, ADR-006): status, start, stop, park, unpark.

.DESCRIPTION
  Same behaviour as infra/scripts/dev-database.sh, which the pipelines use:
  status  Instance state and park snapshots.
  start   Start a stopped instance for a working session (the evening stop still applies).
  stop    Stop it (storage is still billed).
  park    Final snapshot, then delete (only snapshot storage is billed). A stopped instance is started first:
          RDS snapshots only available instances. Keeps the two newest park snapshots.
  unpark  Runs the deploy workflow, which restores the newest park snapshot and keeps the database running
          until the evening stop. Requires the GitHub CLI (gh).

  Cognito, API Gateway and Lambda are never parked: they cost nothing idle, and keeping Cognito keeps every
  authentication identity (issuer + subject) valid.

.EXAMPLE
  ./infra/scripts/dev-env.ps1 status
  ./infra/scripts/dev-env.ps1 park
#>
param(
    [Parameter(Mandatory = $true)][ValidateSet('status', 'start', 'stop', 'park', 'unpark')][string]$Action,
    [string]$Region = 'eu-west-2'
)

$ErrorActionPreference = 'Stop'
$instance = 'fieldmate-postgres-dev'
$parkPrefix = "$instance-park-"

function Get-Status {
    $status = aws rds describe-db-instances --region $Region --db-instance-identifier $instance --query 'DBInstances[0].DBInstanceStatus' --output text 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $status) { 'absent' } else { $status }
}

function Get-SettledStatus {
    $status = Get-Status
    while ($status -match '^(stopping|starting|backing-up|modifying|rebooting|configuring-.*|upgrading|storage-optimization)$') {
        Start-Sleep -Seconds 20
        $status = Get-Status
    }
    $status
}

function Get-ParkSnapshots {
    $ids = aws rds describe-db-snapshots --region $Region --snapshot-type manual `
        --query "sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier, '$parkPrefix')], &SnapshotCreateTime)[].DBSnapshotIdentifier" --output text
    @($ids -split '\s+' | Where-Object { $_ })
}

switch ($Action) {
    'status' {
        "${instance}: $(Get-Status)"
        "park snapshots: $((Get-ParkSnapshots) -join ', ')"
    }
    'start' {
        $status = Get-SettledStatus
        if ($status -eq 'absent') { throw "$instance is parked; run 'dev-env.ps1 unpark'." }
        if ($status -eq 'stopped') { aws rds start-db-instance --region $Region --db-instance-identifier $instance | Out-Null }
        aws rds wait db-instance-available --region $Region --db-instance-identifier $instance
        "$instance is available. The evening stop still applies."
    }
    'stop' {
        $status = Get-SettledStatus
        if ($status -eq 'available') { aws rds stop-db-instance --region $Region --db-instance-identifier $instance | Out-Null; "Stop requested." }
        else { "$instance is $status; nothing to stop." }
    }
    'park' {
        $status = Get-SettledStatus
        if ($status -eq 'absent') { "$instance is already parked." }
        else {
            if ($status -eq 'stopped') { aws rds start-db-instance --region $Region --db-instance-identifier $instance | Out-Null }
            if ($status -ne 'deleting') {
                aws rds wait db-instance-available --region $Region --db-instance-identifier $instance
                $snapshot = "$parkPrefix$((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss'))"
                aws rds delete-db-instance --region $Region --db-instance-identifier $instance --final-db-snapshot-identifier $snapshot --delete-automated-backups | Out-Null
                "Final snapshot: $snapshot"
            }
            aws rds wait db-instance-deleted --region $Region --db-instance-identifier $instance
            "$instance is parked."
        }
        $snapshots = Get-ParkSnapshots
        if ($snapshots.Count -gt 2) {
            foreach ($old in $snapshots[0..($snapshots.Count - 3)]) {
                aws rds delete-db-snapshot --region $Region --db-snapshot-identifier $old | Out-Null
                "Deleted old park snapshot $old"
            }
        }
    }
    'unpark' {
        gh workflow run backend-deploy.yml -f environment=dev -f keep_database_running=true
        'Deploy started: it restores the newest park snapshot and keeps the database running until the evening stop.'
    }
}
