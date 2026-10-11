#!/usr/bin/env bash
# Invokes fieldmate-db-ops-{env} (inside the VPC) with the database owner password from SSM Parameter Store.
#   infra/scripts/run-db-ops.sh <function-name> <owner-password-parameter> '<operation json>'
#   e.g. '{"operation":"migrate"}'  '{"operation":"status"}'
#        '{"operation":"create-invitation","organisationId":"...","role":"WORKER"}'   (non-production only)
# The password lives only in memory and in a 0600 temp file removed on exit; it is never printed.
set -euo pipefail

# Windows-native aws/jq (e.g. under Git Bash) end lines with CRLF: strip the CR so values compare exactly.
aws() { command aws "$@" | tr -d '\r'; }
jq() { command jq "$@" | tr -d '\r'; }

function_name="$1"
password_parameter="$2"
operation_json="$3"

umask 077
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# MSYS_NO_PATHCONV stops Git Bash rewriting the leading-slash parameter name into a Windows path for aws.exe.
password="$(MSYS_NO_PATHCONV=1 aws ssm get-parameter --name "$password_parameter" --with-decryption --query Parameter.Value --output text)"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then echo "::add-mask::$password"; fi

jq -n --argjson operation "$operation_json" --arg password "$password" '$operation + {password: $password}' > "$tmp/payload.json"
unset password

# Relative paths from inside the temp directory: a Windows-native aws.exe cannot open MSYS paths like fileb:///tmp/...
function_error="$(cd "$tmp" && aws lambda invoke --function-name "$function_name" --payload fileb://payload.json \
  --cli-read-timeout 330 response.json --query FunctionError --output text)"

if [[ "$function_error" != "None" ]]; then
  echo "db-ops failed:" >&2
  jq . "$tmp/response.json" >&2
  exit 1
fi

# An invitation token is a one-time secret: shown only when explicitly requested, never in CI logs.
# The Lambda serializer keeps the .NET property names (PlatformTests pins InvitationToken).
if [[ -z "${GITHUB_ACTIONS:-}" ]] && jq -e '.InvitationToken != null' "$tmp/response.json" > /dev/null; then
  jq . "$tmp/response.json"
else
  jq 'del(.InvitationToken)' "$tmp/response.json"
fi
