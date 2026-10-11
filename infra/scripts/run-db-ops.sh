#!/usr/bin/env bash
# Invokes fieldmate-db-ops-{env} (inside the VPC) with the RDS-managed owner password.
#   infra/scripts/run-db-ops.sh <function-name> <owner-secret-arn> '<operation json>'
#   e.g. '{"operation":"migrate"}'  '{"operation":"status"}'
#        '{"operation":"create-invitation","organisationId":"...","role":"WORKER"}'   (non-production only)
# The password lives only in memory and in a 0600 temp file removed on exit; it is never printed.
set -euo pipefail

function_name="$1"
secret_arn="$2"
operation_json="$3"

umask 077
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

password="$(aws secretsmanager get-secret-value --secret-id "$secret_arn" --query SecretString --output text | jq -r .password)"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then echo "::add-mask::$password"; fi

jq -n --argjson operation "$operation_json" --arg password "$password" '$operation + {password: $password}' > "$tmp/payload.json"
unset password

function_error="$(aws lambda invoke --function-name "$function_name" --payload "fileb://$tmp/payload.json" \
  --cli-read-timeout 330 "$tmp/response.json" --query FunctionError --output text)"

if [[ "$function_error" != "None" ]]; then
  echo "db-ops failed:" >&2
  jq . "$tmp/response.json" >&2
  exit 1
fi

# An invitation token is a one-time secret: shown only when explicitly requested, never in CI logs.
if [[ -z "${GITHUB_ACTIONS:-}" ]] && jq -e '.invitationToken != null' "$tmp/response.json" > /dev/null; then
  jq . "$tmp/response.json"
else
  jq 'del(.invitationToken)' "$tmp/response.json"
fi
