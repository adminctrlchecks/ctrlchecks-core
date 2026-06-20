#!/usr/bin/env bash
# T1 — Infrastructure smoke: systemd units, health endpoints, retirement gates
set -euo pipefail

FAIL=0

echo "=== T1: Infrastructure Smoke ==="
echo ""

echo "--- systemd units ---"
for svc in ctrlchecks-worker ctrlchecks-ai-generator ctrlchecks-execution-engine \
           ctrlchecks-credential-service ctrlchecks-notification-service \
           ctrlchecks-trigger-service ctrlchecks-workflow-crud-service; do
  state=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
  if [ "$state" = "active" ]; then
    echo "  ✅ $svc: $state"
  else
    echo "  ❌ $svc: $state"
    FAIL=1
  fi
done

echo ""
echo "--- health endpoints ---"
declare -A HEALTH_PATHS
HEALTH_PATHS[3001]="/health/ready"
HEALTH_PATHS[3002]="/health"
HEALTH_PATHS[3003]="/health/ready"
HEALTH_PATHS[3004]="/health/ready"
HEALTH_PATHS[3005]="/health/ready"
HEALTH_PATHS[3006]="/health/ready"
HEALTH_PATHS[3007]="/health/ready"

for port in 3001 3002 3003 3004 3005 3006 3007; do
  path="${HEALTH_PATHS[$port]}"
  response=$(curl -sf --max-time 5 "http://127.0.0.1:$port$path" 2>/dev/null || echo "FAIL")
  if echo "$response" | grep -qE '"status"\s*:\s*"(ready|ok)"'; then
    echo "  ✅ :$port $path"
  else
    echo "  ❌ :$port $path → $response"
    FAIL=1
  fi
done

echo ""
echo "--- retirement gates ---"
ENV_FILE="/opt/ctrlchecks-worker/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "  ❌ .env not found at $ENV_FILE"
  FAIL=1
else
  for gate in WORKFLOW_CRUD_LOCAL_WRITES_DISABLED CREDENTIAL_SERVICE_VAULT_WRITES_DISABLED; do
    val=$(grep "^${gate}=" "$ENV_FILE" | cut -d= -f2 || echo "MISSING")
    if [ "$val" = "true" ]; then
      echo "  ✅ $gate=true"
    else
      echo "  ⚠️  $gate=$val (expected true)"
    fi
  done
fi

echo ""
echo "--- delegation metrics ---"
metrics=$(curl -sf --max-time 5 "http://127.0.0.1:3001/metrics" 2>/dev/null || echo "")
if [ -n "$metrics" ]; then
  echo "$metrics" | grep -E 'workflow_crud_delegation|credential_service_delegation|execution_engine_delegation' | head -10 || echo "  (no delegation metrics yet)"
else
  echo "  (metrics endpoint unavailable)"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ T1 PASS — all infrastructure checks green"
  exit 0
else
  echo "❌ T1 FAIL — see errors above"
  exit 1
fi
