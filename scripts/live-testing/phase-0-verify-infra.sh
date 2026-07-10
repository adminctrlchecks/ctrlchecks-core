#!/bin/bash
# Phase 0 — Verify infrastructure + test token (run ON SERVER ONLY)
set -euo pipefail

BASE="${LIVE_E2E_BASE_URL:-https://worker.ctrlchecks.ai}"

echo "=== Phase 0: Infrastructure Smoke ==="
echo "Base URL: $BASE"

echo -n "health/live... "
LIVE=$(curl -sf "$BASE/health/live")
echo "$LIVE" | jq -e '.status == "live"' > /dev/null
echo "OK"

echo -n "health/ready... "
READY=$(curl -sf "$BASE/health/ready")
echo "$READY" | jq -e '.status == "ready" and .checks.db == "ok" and .checks.redis == "ok"' > /dev/null
echo "OK"

if [ -z "${LIVE_TEST_BEARER_TOKEN:-}" ]; then
  echo "WARN: LIVE_TEST_BEARER_TOKEN not set — skip auth check"
  echo "Set token: export LIVE_TEST_BEARER_TOKEN=<cognito-jwt>"
  exit 0
fi

echo -n "authenticated API... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $LIVE_TEST_BEARER_TOKEN" \
  "$BASE/api/templates")
if [ "$STATUS" != "200" ] && [ "$STATUS" != "401" ]; then
  echo "unexpected HTTP $STATUS"
  exit 1
fi
echo "HTTP $STATUS"

echo "✅ Phase 0 infrastructure checks complete"
