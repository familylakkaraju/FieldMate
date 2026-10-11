#!/usr/bin/env bash
# V00 foundation acceptance (CR §18 Phase 8), against a deployed non-production environment:
#   user authenticates -> Cognito issues token -> API Gateway verifies it -> fieldmate-api resolves the identity
#   -> the user creates (idempotently) an organisation -> organisation context is validated -> Access Core
#   authorises -> PostgreSQL answers -> an organisation-scoped telemetry record exists.
# Required env: API_URL SMOKE_CLIENT_ID SMOKE_USERNAME SMOKE_PASSWORD SMOKE_IDEMPOTENCY_KEY
set -euo pipefail
: "${API_URL:?}" "${SMOKE_CLIENT_ID:?}" "${SMOKE_USERNAME:?}" "${SMOKE_PASSWORD:?}" "${SMOKE_IDEMPOTENCY_KEY:?}"

api="${API_URL%/}"
correlation="smoke-$(date +%s)-$RANDOM"

expect() { # expected actual description
  if [[ "$1" != "$2" ]]; then echo "FAIL: $3 (expected $1, got $2)" >&2; exit 1; fi
  echo "ok: $3"
}

request() { # method path [organisation] [body]  -> sets $status and $json
  local args=(-s -o "$tmp/body" -w '%{http_code}' -X "$1" "$api$2"
    -H "Authorization: Bearer $token" -H "X-Correlation-Id: $correlation" -H 'Content-Type: application/json')
  [[ -n "${3:-}" ]] && args+=(-H "X-Organisation-Id: $3")
  [[ -n "${4:-}" ]] && args+=(-H "Idempotency-Key: $SMOKE_IDEMPOTENCY_KEY" -d "$4")
  status="$(curl "${args[@]}")"
  json="$(cat "$tmp/body")"
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

expect 200 "$(curl -s -o /dev/null -w '%{http_code}' "$api/health")" "GET /health is public"
expect 401 "$(curl -s -o /dev/null -w '%{http_code}' "$api/me")" "GET /me without a token is rejected at the gateway"

token="$(aws cognito-idp initiate-auth --client-id "$SMOKE_CLIENT_ID" --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=$SMOKE_USERNAME,PASSWORD=$SMOKE_PASSWORD" \
  --query 'AuthenticationResult.AccessToken' --output text)"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then echo "::add-mask::$token"; fi
echo "ok: Cognito issued an access token"

request POST /onboarding/create-business "" '{"name":"Smoke Test Organisation"}'
[[ "$status" == 200 || "$status" == 201 ]] || { echo "FAIL: create-business ($status) $json" >&2; exit 1; }
organisation="$(jq -r .organisationId <<< "$json")"
echo "ok: organisation $organisation (created or idempotently replayed)"

request GET /me
expect 200 "$status" "GET /me resolves the canonical user"

request GET /me/context "$organisation"
expect 200 "$status" "GET /me/context with a validated organisation"
expect OWNER "$(jq -r .role <<< "$json")" "trusted context role"

request GET /me/context "$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen)"
expect 403 "$status" "an unrelated organisation is denied"
expect ORG_MEMBERSHIP_DENIED "$(jq -r .errorCode <<< "$json")" "denial error code"

echo "Smoke test passed. Telemetry correlation ID: $correlation"
