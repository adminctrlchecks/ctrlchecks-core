#!/bin/bash
# Phase 4C - AI nodes (run ON SERVER ONLY)
# Pattern: manual_trigger -> <ai_node_under_test> -> log_output
# Nodes: ai_chat_model, google_gemini, text_summarizer, sentiment_analyzer

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
TMP_PREFIX="/tmp/4c-ai-nodes-$$"

PASS=0
FAIL=0
RESULTS=()

pass() { echo "PASS $1"; PASS=$((PASS+1)); RESULTS+=("PASS $1"); }
fail() { echo "FAIL $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL $1"); }
warn() { echo "WARN $1"; }

cleanup() {
  rm -f "${TMP_PREFIX}"-*.json 2>/dev/null || true
}
trap cleanup EXIT

verify_catalog() {
  local catalog=""
  for candidate in "public/node-library.json" "worker/public/node-library.json"; do
    if [ -f "$candidate" ]; then
      catalog="$candidate"
      break
    fi
  done

  if [ -z "$catalog" ]; then
    warn "node-library.json not found in current working tree; continuing with API execution checks"
    return 0
  fi

  python3 - "$catalog" <<'PY'
import json
import sys

catalog_path = sys.argv[1]
expected = ["ai_chat_model", "google_gemini", "text_summarizer", "sentiment_analyzer"]

with open(catalog_path, "r", encoding="utf-8") as fh:
    data = json.load(fh)

types = {entry.get("type"): entry for entry in data if isinstance(entry, dict)}
missing = [node_type for node_type in expected if node_type not in types]

if missing:
    print("Catalog missing canonical AI node types: " + ", ".join(missing))
    sys.exit(1)

for node_type in expected:
    entry = types[node_type]
    required = ",".join(entry.get("requiredConfig") or [])
    print(f"Catalog OK: {node_type} category={entry.get('category')} required=[{required}]")
PY
}

verify_token() {
  local code
  code=$(curl -s -o "${TMP_PREFIX}-connections.json" -w "%{http_code}" \
    -H "$AUTH" "$BASE/api/credential-connections/connections")

  if [ "$code" != "200" ]; then
    fail "token preflight failed against $BASE (HTTP $code)"
    return 1
  fi

  echo "Token preflight OK: /api/credential-connections/connections HTTP 200"
  return 0
}

make_workflow() {
  local name="$1"
  local node_type="$2"
  local label="$3"
  local config_json="$4"
  local file="$5"

  python3 - "$name" "$node_type" "$label" "$config_json" "$file" <<'PY'
import json
import sys

name, node_type, label, config_json, file_path = sys.argv[1:6]
config = json.loads(config_json)

workflow = {
    "name": name,
    "trigger": "manual",
    "nodes": [
        {
            "id": "n1",
            "type": "custom",
            "position": {"x": 0, "y": 0},
            "data": {
                "type": "manual_trigger",
                "label": "Start",
                "category": "triggers",
                "config": {},
            },
        },
        {
            "id": "n2",
            "type": "custom",
            "position": {"x": 300, "y": 0},
            "data": {
                "type": node_type,
                "label": label,
                "category": "ai",
                "config": config,
            },
        },
        {
            "id": "n3",
            "type": "custom",
            "position": {"x": 600, "y": 0},
            "data": {
                "type": "log_output",
                "label": "Log",
                "category": "output",
                "config": {"level": "info", "message": f"{node_type} done"},
            },
        },
    ],
    "edges": [
        {"id": "e1", "source": "n1", "target": "n2"},
        {"id": "e2", "source": "n2", "target": "n3"},
    ],
}

with open(file_path, "w", encoding="utf-8") as fh:
    json.dump(workflow, fh)
PY
}

json_value() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json
import sys

path, expr = sys.argv[1:3]
try:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
except Exception:
    print("")
    sys.exit(0)

if expr == "workflow_id":
    print((data.get("workflow") or {}).get("id") or data.get("id") or "")
elif expr == "execution_id":
    print(data.get("executionId") or data.get("execution_id") or data.get("id") or "")
elif expr == "status":
    print(data.get("status") or "")
else:
    print("")
PY
}

validate_ai_output() {
  local status_file="$1"
  local node_type="$2"

  python3 - "$status_file" "$node_type" <<'PY'
import json
import sys

status_path, expected_type = sys.argv[1:3]

try:
    with open(status_path, "r", encoding="utf-8") as fh:
        status_doc = json.load(fh)
except Exception as exc:
    print(f"Could not parse execution status JSON: {exc}")
    sys.exit(1)

steps = status_doc.get("steps") or []
candidate_steps = []

for step in steps:
    if not isinstance(step, dict):
        continue
    node_type = (
        step.get("node_type")
        or step.get("nodeType")
        or step.get("type")
        or (step.get("node") or {}).get("type")
        or ""
    )
    if node_type in {"manual_trigger", "trigger", "log_output"}:
        continue
    candidate_steps.append(step)

exact = [
    step for step in candidate_steps
    if (step.get("node_type") or step.get("nodeType") or step.get("type") or "") == expected_type
]
step = exact[0] if exact else (candidate_steps[0] if candidate_steps else None)

if not step:
    print("No AI node step found in execution status")
    sys.exit(1)

step_status = step.get("status") or ""
node_type = step.get("node_type") or step.get("nodeType") or step.get("type") or expected_type
if step_status in {"failed", "error"}:
    print(f"AI step failed: node={node_type} error={str(step.get('error') or '')[:200]}")
    sys.exit(1)

raw_output = step.get("output_json")
if raw_output is None:
    raw_output = step.get("output")
if raw_output is None:
    raw_output = step.get("result")

if isinstance(raw_output, str):
    try:
        output = json.loads(raw_output)
    except Exception:
        output = {"response": raw_output}
else:
    output = raw_output

if not isinstance(output, dict) or not output:
    print(f"AI output missing or empty for node={node_type}: {str(raw_output)[:200]}")
    sys.exit(1)

if output.get("_error"):
    print(f"AI output contains _error for node={node_type}: {str(output.get('_error'))[:200]}")
    sys.exit(1)

response = output.get("response")
if response is None:
    response = output.get("output") or output.get("result") or output.get("text") or output.get("summary")

if response is None or (isinstance(response, str) and not response.strip()):
    print(f"AI response field missing or empty for node={node_type}; keys={list(output.keys())[:8]}")
    sys.exit(1)

if expected_type == "sentiment_analyzer":
    if isinstance(response, dict):
        sentiment = str(response.get("sentiment") or "").lower()
        score_present = "score" in response
    else:
        response_text = str(response).lower()
        sentiment = next((label for label in ("positive", "neutral", "negative") if label in response_text), "")
        score_present = "score" in response_text or any(ch.isdigit() for ch in response_text)
    if not sentiment or not score_present:
        print(f"Sentiment output missing label/score: {str(response)[:200]}")
        sys.exit(1)

sample = {
    "node": node_type,
    "keys": list(output.keys())[:8],
    "response": str(response)[:160],
}
if "model" in output:
    sample["model"] = str(output.get("model"))[:80]
print(json.dumps(sample, ensure_ascii=True))
PY
}

run_node_test() {
  local index="$1"
  local total="$2"
  local node_type="$3"
  local label="$4"
  local config_json="$5"
  local wf_file="${TMP_PREFIX}-${node_type}-wf.json"
  local save_file="${TMP_PREFIX}-${node_type}-save.json"
  local exec_file="${TMP_PREFIX}-${node_type}-exec.json"
  local status_file="${TMP_PREFIX}-${node_type}-status.json"

  make_workflow "4c-${node_type}-$$" "$node_type" "$label" "$config_json" "$wf_file"

  local save_code
  save_code=$(curl -s -o "$save_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$wf_file" "$BASE/api/save-workflow")

  local workflow_id
  workflow_id=$(json_value "$save_file" "workflow_id")

  if [ -z "$workflow_id" ]; then
    fail "$node_type save failed (HTTP $save_code): $(head -c 180 "$save_file")"
    return 0
  fi

  local exec_code
  exec_code=$(curl -s -o "$exec_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$workflow_id\",\"input\":{}}" "$BASE/api/execute-workflow")

  local execution_id
  execution_id=$(json_value "$exec_file" "execution_id")

  if [ -z "$execution_id" ]; then
    fail "$node_type execute failed (HTTP $exec_code): $(head -c 180 "$exec_file")"
    curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true
    return 0
  fi

  local terminal=""
  local duration=0
  local started=$SECONDS
  local status_doc

  for _ in $(seq 1 15); do
    sleep 2
    status_doc=$(curl -sf "$BASE/api/execution-status/$execution_id" -H "$AUTH" 2>/dev/null || echo "{}")
    printf "%s" "$status_doc" > "$status_file"
    local status
    status=$(json_value "$status_file" "status")
    case "$status" in
      success|failed|completed|error)
        terminal="$status"
        duration=$((SECONDS-started))
        break
        ;;
    esac
  done

  if [ -z "$terminal" ]; then
    duration=$((SECONDS-started))
  fi

  local validation
  validation=$(validate_ai_output "$status_file" "$node_type")
  local validation_code=$?

  curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true

  if [ "$terminal" = "success" ] && [ "$validation_code" -eq 0 ]; then
    pass "$node_type: terminal=success in ${duration}s execId=$execution_id"
    echo "  OUT $validation"
  else
    fail "$node_type: terminal=${terminal:-timeout} in ${duration}s execId=$execution_id"
    echo "  OUT $validation"
  fi

  if [ "$index" -lt "$total" ]; then
    echo "Rate-limit pause: sleeping 15s before next AI call"
    sleep 15
  fi
}

echo "============================================================"
echo "  Phase 4C - AI Nodes"
echo "  Base: $BASE"
echo "============================================================"
echo ""

if ! verify_catalog; then
  fail "catalog verification failed"
  echo ""
  echo "TIER 4C GATE: FAIL - canonical AI node catalog mismatch"
  exit 1
fi

if ! verify_token; then
  echo ""
  echo "TIER 4C GATE: FAIL - live test token invalid"
  exit 1
fi

echo ""
echo "--- 1/4: ai_chat_model ---"
run_node_test 1 4 "ai_chat_model" "AI Chat" '{"model":"gemini","prompt":"Say hello in one sentence","temperature":0.1}'

echo ""
echo "--- 2/4: google_gemini ---"
run_node_test 2 4 "google_gemini" "Gemini" '{"prompt":"Reply with: tier-4c test OK","temperature":0.1}'

echo ""
echo "--- 3/4: text_summarizer ---"
run_node_test 3 4 "text_summarizer" "Summarize" '{"text":"CtrlChecks automates workflows between services.","maxLength":50}'

echo ""
echo "--- 4/4: sentiment_analyzer ---"
run_node_test 4 4 "sentiment_analyzer" "Sentiment" '{"text":"This platform works great and tests are passing!"}'

echo ""
echo "============================================================"
echo "  Tier 4C Results: ${PASS} PASS / ${FAIL} FAIL"
echo "============================================================"
for result in "${RESULTS[@]}"; do
  echo "  $result"
done
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "TIER 4C GATE: PASS - all ${PASS} AI nodes returned valid output"
  exit 0
fi

echo "TIER 4C GATE: FAIL - ${FAIL} AI node(s) failed"
exit 1
