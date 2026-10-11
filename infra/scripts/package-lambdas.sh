#!/usr/bin/env bash
# Builds the two V00 Lambda packages (linux-arm64, framework-dependent for the managed dotnet10 runtime), each
# with the Amazon RDS global CA bundle so PostgreSQL connections can verify the server (SslMode=VerifyFull).
#   infra/scripts/package-lambdas.sh [output-dir]   ->   api.zip, db-ops.zip
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
out="${1:-$root/backend/artifacts}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o "$work/rds-global-bundle.pem"
grep -q "BEGIN CERTIFICATE" "$work/rds-global-bundle.pem"

mkdir -p "$out"
for spec in FieldMate.Api:api FieldMate.Database:db-ops; do
  project="${spec%%:*}"
  artifact="${spec##*:}"
  dotnet publish "$root/backend/src/$project/$project.csproj" \
    -c Release -r linux-arm64 --self-contained false -o "$work/$artifact" -nologo
  cp "$work/rds-global-bundle.pem" "$work/$artifact/"
  rm -f "$out/$artifact.zip"
  (cd "$work/$artifact" && zip -qr -X "$out/$artifact.zip" .)
done

ls -l "$out"
