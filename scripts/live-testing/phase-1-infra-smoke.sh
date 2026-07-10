#!/bin/bash
# Phase 1 — Full infrastructure smoke (run ON SERVER ONLY)
set -euo pipefail

BASE="${LIVE_E2E_BASE_URL:-https://worker.ctrlchecks.ai}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:-}"

echo "=== Phase 1: Infrastructure Smoke ==="

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

# 1.1 live
curl -sf "$BASE/health/live" | jq -e '.status == "live"' > /dev/null || fail "health/live"
pass "health/live"

# 1.2 ready
curl -sf "$BASE/health/ready" | jq -e '.checks.db == "ok" and .checks.redis == "ok"' > /dev/null || fail "health/ready"
pass "health/ready"

# 1.3 headers
HEADERS=$(curl -sI "$BASE/health/live")
echo "$HEADERS" | grep -qi "x-content-type-options" || fail "missing X-Content-Type-Options"
echo "$HEADERS" | grep -qi "x-request-id" || fail "missing x-request-id"
pass "security headers"

# 1.4 metrics
curl -sf "$BASE/metrics" | jq -e '.uptime_seconds >= 0' > /dev/null 2>/dev/null || \
  curl -sf "$BASE/metrics" | grep -q "uptime" || fail "metrics endpoint"
pass "metrics"

# 1.5 docs without auth → 401
DOCS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/docs/openapi.json")
[ "$DOCS_CODE" = "401" ] || [ "$DOCS_CODE" = "403" ] || fail "docs should be 401/403 without JWT (got $DOCS_CODE)"
pass "docs gated ($DOCS_CODE)"

# 1.6 docs with auth (optional)
if [ -n "$TOKEN" ]; then
  DOCS_AUTH=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" "$BASE/api/docs/openapi.json")
  [ "$DOCS_AUTH" = "200" ] && pass "docs with JWT" || echo "WARN: docs with JWT returned $DOCS_AUTH"
fi

# 1.7 live e2e harness
if [ -n "$TOKEN" ] && [ -f "scripts/live-e2e-harness.ts" ]; then
  echo "Running live-e2e-harness..."
  LIVE_E2E_BASE_URL="$BASE" LIVE_TEST_BEARER_TOKEN="$TOKEN" \
    npx ts-node scripts/live-e2e-harness.ts || fail "live-e2e-harness"
  pass "live-e2e-harness"
elif [ -f "/opt/ctrlchecks-worker/scripts/live-e2e-harness.ts" ]; then
  echo "Run manually: npx ts-node scripts/live-e2e-harness.ts"
fi

echo ""
echo "✅ Phase 1 complete"
