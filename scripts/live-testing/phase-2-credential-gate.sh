#!/bin/bash
# Phase 2 — Credential gate: missing-items + execute block (run ON SERVER ONLY)
set -euo pipefail

BASE="${LIVE_E2E_BASE_URL:-https://worker.ctrlchecks.ai}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"

AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "=== Phase 2: Credential Gate ==="

# Create minimal workflow with google_sheets (requires Google OAuth)
WORKFLOW_JSON='{
  "name": "live-test-credential-gate",
  "trigger": "manual",
  "nodes": [
    {"id":"n1","type":"manual_trigger","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Trigger","config":{}}},
    {"id":"n2","type":"google_sheets","position":{"x":200,"y":0},"data":{"type":"google_sheets","label":"Sheets","config":{"operation":"read","spreadsheetId":"TEST_ID","range":"A1:B1"}}},
    {"id":"n3","type":"log_output","position":{"x":400,"y":0},"data":{"type":"log_output","label":"Log","config":{"message":"done"}}}
  ],
  "edges": [
    {"id":"e1","source":"n1","target":"n2"},
    {"id":"e2","source":"n2","target":"n3"}
  ]
}'

echo "Saving test workflow..."
SAVE=$(curl -sf -X POST -H "$AUTH" -H "$CT" -d "$WORKFLOW_JSON" "$BASE/api/save-workflow")
WF_ID=$(echo "$SAVE" | jq -r '.workflow.id // .id // empty')
[ -n "$WF_ID" ] || { echo "❌ save-workflow failed: $SAVE"; exit 1; }
echo "Workflow ID: $WF_ID"

echo "Checking missing-items..."
MISSING=$(curl -sf -H "$AUTH" "$BASE/api/workflows/$WF_ID/missing-items")
echo "$MISSING" | jq .

HAS_UNSATISFIED=$(echo "$MISSING" | jq '[.credentials[]? | select(.satisfied == false)] | length')
if [ "$HAS_UNSATISFIED" -gt 0 ]; then
  echo "✅ missing-items reports $HAS_UNSATISFIED unsatisfied credential(s) (expected if Google not connected)"
else
  echo "ℹ️  All credentials satisfied — Google may already be connected"
fi

echo "Attempting execute..."
EXEC_CODE=$(curl -s -o /tmp/exec-out.json -w "%{http_code}" \
  -X POST -H "$AUTH" -H "$CT" \
  -d "{\"workflowId\":\"$WF_ID\"}" \
  "$BASE/api/execute-workflow")
echo "Execute HTTP: $EXEC_CODE"
cat /tmp/exec-out.json | jq . 2>/dev/null || cat /tmp/exec-out.json

# Cleanup
curl -sf -X DELETE -H "$AUTH" "$BASE/api/workflows/$WF_ID" > /dev/null 2>&1 || true
echo "Cleaned up workflow $WF_ID"

echo ""
echo "✅ Phase 2 script complete — review output above"
echo "Manual: connect Google in /connections, re-run, verify missing-items satisfied"
