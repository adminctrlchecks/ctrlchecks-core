#!/usr/bin/env bash
# Live test orchestrator — T1 (infra) + T2 (service baseline) + T3 (worker subsets) + T4 (E2E, opt-in)
# Usage:
#   bash scripts/run-live-tests.sh               # T1+T2+T3
#   RUN_T4=1 LIVE_TEST_BEARER_TOKEN=... bash scripts/run-live-tests.sh   # + T4
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

# On EC2 the worker IS the repo root; locally the worker lives under worker/
if [ -f "$REPO_ROOT/src/index.ts" ] || [ -f "$REPO_ROOT/dist/index.js" ]; then
  WORKER_DIR="$REPO_ROOT"
else
  WORKER_DIR="$REPO_ROOT/worker"
fi
LOG_DIR="$REPO_ROOT/.claude/logs/live-runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

PASS=0
FAIL=0
FAILURES_FILE="$LOG_DIR/FAILURES.txt"
touch "$FAILURES_FILE"

run_tier() {
  local name="$1"; shift
  local log="$LOG_DIR/${name}.log"
  echo ""
  echo "════════════════════════════════════════"
  echo "  $name"
  echo "════════════════════════════════════════"
  if "$@" 2>&1 | tee "$log"; then
    echo "✅ $name PASS"
    PASS=$((PASS + 1))
  else
    echo "❌ $name FAIL (see $log)"
    echo "$name" >> "$FAILURES_FILE"
    FAIL=$((FAIL + 1))
  fi
}

echo "╔══════════════════════════════════════════╗"
echo "║  CtrlChecks Live Test Run                ║"
echo "║  $(date -u '+%Y-%m-%d %H:%M:%S UTC')               ║"
echo "║  Logs: $LOG_DIR"
echo "╚══════════════════════════════════════════╝"

# ── T1: Infrastructure smoke ─────────────────────────────────────────────────
run_tier "T1-infrastructure" bash "$REPO_ROOT/scripts/verify-production.sh"

# ── T2: Service Jest baselines (skip gracefully if no dev deps in prod deploy) ──
for svc in ai-generator execution-engine credential-service notification-service trigger-service workflow-crud-service; do
  dir="/opt/ctrlchecks-$svc"
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    # Services deployed --production have no jest binary; skip gracefully
    if [ -f "$dir/node_modules/.bin/jest" ]; then
      run_tier "T2-$svc" bash -c "cd '$dir' && npm test -- --passWithNoTests --runInBand --no-coverage 2>&1"
    else
      echo "⚠️  T2-$svc: jest not in node_modules (prod deploy — no dev deps) — SKIP (accepted gap)"
      echo "T2-$svc: SKIP (no jest in prod node_modules)" >> "$LOG_DIR/T2-skip.log"
    fi
  else
    echo "⚠️  T2-$svc: directory $dir not found — skipping"
  fi
done

# ── T3a: Worker registry + schema contracts ───────────────────────────────────
run_tier "T3a-contracts" bash -c "cd '$WORKER_DIR' && npm run test:contracts -- --no-coverage 2>&1"

# ── T3b: Microservice delegation client tests ─────────────────────────────────
run_tier "T3b-delegation" bash -c "cd '$WORKER_DIR' && npm run test:microservices-delegation 2>&1"

# ── T3c: FIX-1/2/3 regression tests ──────────────────────────────────────────
run_tier "T3c-regressions" bash -c "cd '$WORKER_DIR' && npm run test:live-regression 2>&1"

# ── T4: Live E2E (opt-in — requires bearer token) ────────────────────────────
if [[ "${RUN_T4:-0}" == "1" ]]; then
  if [ -z "${LIVE_TEST_BEARER_TOKEN:-}" ]; then
    echo ""
    echo "⚠️  RUN_T4=1 set but LIVE_TEST_BEARER_TOKEN is empty — skipping T4"
    echo "   Set: RUN_T4=1 LIVE_TEST_BEARER_TOKEN='<cognito jwt>' bash scripts/run-live-tests.sh"
  else
    run_tier "T4-live-e2e" bash -c "cd '$WORKER_DIR' && npx ts-node scripts/live-e2e-harness.ts"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "  Logs: $LOG_DIR"
echo "════════════════════════════════════════"

if [ -s "$FAILURES_FILE" ]; then
  echo ""
  echo "Failed tiers:"
  cat "$FAILURES_FILE" | while read -r tier; do echo "  ❌ $tier"; done
  exit 1
fi

echo ""
echo "✅ All tiers PASS"
exit 0
