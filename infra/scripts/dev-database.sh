#!/usr/bin/env bash
# Non-production database cost control (FM-P04, ADR-006).
#   infra/scripts/dev-database.sh <status|start|stop|park> <environment>
#
#   status  instance state and park snapshots
#   start   start a stopped instance and wait until available
#   stop    stop a running instance (storage is still billed)
#   park    final snapshot, then delete (only snapshot storage is billed); keeps the two newest park snapshots.
#           A stopped instance is started first: RDS takes a final snapshot only from an available instance.
# Restoring a parked database is done by the next deployment (newest park snapshot). Never used for production.
set -euo pipefail

action="${1:?usage: dev-database.sh <status|start|stop|park> <environment>}"
environment="${2:?usage: dev-database.sh <status|start|stop|park> <environment>}"
if [[ "$environment" == "prod" ]]; then
  echo "Refusing: production availability is decided separately (FM-P04)." >&2
  exit 1
fi

id="fieldmate-postgres-$environment"
park_prefix="$id-park-"

status() {
  aws rds describe-db-instances --db-instance-identifier "$id" \
    --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo absent
}

# Wait out transitional states that cannot be acted on.
settled_status() {
  local current
  current="$(status)"
  while [[ "$current" =~ ^(stopping|starting|backing-up|modifying|rebooting|configuring-.*|upgrading|storage-optimization)$ ]]; do
    sleep 20
    current="$(status)"
  done
  echo "$current"
}

park_snapshots() { # oldest first
  aws rds describe-db-snapshots --snapshot-type manual \
    --query "sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier, '$park_prefix')], &SnapshotCreateTime)[].DBSnapshotIdentifier" \
    --output text
}

case "$action" in
  status)
    echo "$id: $(status)"
    echo "park snapshots: $(park_snapshots)"
    ;;

  start)
    current="$(settled_status)"
    case "$current" in
      absent) echo "$id is parked; the next deployment restores it." >&2; exit 1 ;;
      stopped) aws rds start-db-instance --db-instance-identifier "$id" > /dev/null ;;
    esac
    aws rds wait db-instance-available --db-instance-identifier "$id"
    echo "$id is available."
    ;;

  stop)
    current="$(settled_status)"
    if [[ "$current" == "available" ]]; then
      aws rds stop-db-instance --db-instance-identifier "$id" > /dev/null
      echo "Stop requested for $id."
    else
      echo "$id is $current; nothing to stop."
    fi
    ;;

  park)
    current="$(settled_status)"
    case "$current" in
      absent)
        echo "$id is already parked."
        ;;
      deleting)
        aws rds wait db-instance-deleted --db-instance-identifier "$id"
        echo "$id is parked."
        ;;
      *)
        if [[ "$current" == "stopped" ]]; then
          aws rds start-db-instance --db-instance-identifier "$id" > /dev/null
        fi
        aws rds wait db-instance-available --db-instance-identifier "$id"
        snapshot="$park_prefix$(date -u +%Y%m%d-%H%M%S)"
        aws rds delete-db-instance --db-instance-identifier "$id" \
          --final-db-snapshot-identifier "$snapshot" --delete-automated-backups > /dev/null
        aws rds wait db-instance-deleted --db-instance-identifier "$id"
        echo "$id is parked. Final snapshot: $snapshot"
        ;;
    esac
    # Snapshot storage is the only remaining cost: keep just the two newest park snapshots.
    read -r -a snapshots <<< "$(park_snapshots)"
    for ((i = 0; i < ${#snapshots[@]} - 2; i++)); do
      aws rds delete-db-snapshot --db-snapshot-identifier "${snapshots[$i]}" > /dev/null
      echo "Deleted old park snapshot ${snapshots[$i]}"
    done
    ;;

  *)
    echo "Unknown action '$action'." >&2
    exit 1
    ;;
esac
