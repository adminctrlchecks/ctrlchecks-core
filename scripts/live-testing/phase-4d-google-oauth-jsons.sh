#!/bin/bash
# Phase 4D - Google OAuth workflow JSON batch (run ON SERVER ONLY)
# Scope: testing/google/*.json only. Do not run testing/social in this script.

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
GOOGLE_CONNECTION_ID="${GOOGLE_CONNECTION_ID:-ba2f63f0-d88a-483f-bc72-ec9c90fac4c1}"
WORKFLOW_DIR="${1:-/tmp/phase-4d-google-jsons}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="/tmp/phase-4d-google-run-$RUN_ID"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
RESULTS=()

mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR" 2>/dev/null || true
}
trap cleanup EXIT

pass() { echo "PASS $1"; PASS=$((PASS+1)); RESULTS+=("PASS|$1"); }
fail() { echo "FAIL $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL|$1"); }
warn() { echo "WARN $1"; }

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

preflight() {
  echo "Preflight: base=$BASE"
  echo "Preflight: token_len=${#TOKEN}"

  local code
  code=$(curl -s -o "$TMP_DIR/connections.json" -w "%{http_code}" \
    -H "$AUTH" "$BASE/api/credential-connections/connections")
  if [ "$code" != "200" ]; then
    echo "Connections preflight failed (HTTP $code): $(head -c 220 "$TMP_DIR/connections.json")"
    return 1
  fi
  echo "Preflight: connections API HTTP 200"

  code=$(curl -s -o "$TMP_DIR/google-connection-test.json" -w "%{http_code}" \
    -X POST -H "$AUTH" "$BASE/api/credential-connections/connections/$GOOGLE_CONNECTION_ID/test")
  if [ "$code" != "200" ]; then
    echo "Google connection test failed (HTTP $code): $(head -c 220 "$TMP_DIR/google-connection-test.json")"
    return 1
  fi
  echo "Preflight: Google connection test HTTP 200"

  python3 - "$TMP_DIR/google-connection-test.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)

success = data.get("success")
status = data.get("status")
expired = data.get("expired")
if status != "active":
    print(f"Google connection status is not active: {data}")
    sys.exit(1)
if success is False:
    print(f"Preflight warning: connection test success=false expired={expired}; continuing to workflow execution to verify unified credential refresh")
else:
    print(f"Preflight: Google connection body success={success} status={status}")
PY
}

verify_catalog_and_workflow() {
  local file="$1"
  local catalog=""
  for candidate in "public/node-library.json" "worker/public/node-library.json"; do
    if [ -f "$candidate" ]; then
      catalog="$candidate"
      break
    fi
  done

  if [ -z "$catalog" ]; then
    echo "node-library.json not found from $(pwd)"
    return 1
  fi

  python3 - "$catalog" "$file" <<'PY'
import json
import os
import sys

catalog_path, workflow_path = sys.argv[1:3]
allowed = {"manual_trigger", "log_output"}

with open(catalog_path, "r", encoding="utf-8") as fh:
    catalog = json.load(fh)
with open(workflow_path, "r", encoding="utf-8") as fh:
    workflow = json.load(fh)

catalog_types = {entry.get("type") for entry in catalog if isinstance(entry, dict)}
node_types = []
missing = []
for node in workflow.get("nodes", []):
    node_type = ((node.get("data") or {}).get("type") or node.get("type") or "").strip()
    node_types.append(node_type)
    if node_type not in allowed and node_type not in catalog_types:
        missing.append(node_type)

if missing:
    print(f"{os.path.basename(workflow_path)} has non-canonical/missing node type(s): {', '.join(sorted(set(missing)))}")
    sys.exit(1)

print(f"Canonical OK: {os.path.basename(workflow_path)} -> {', '.join(node_types)}")
PY
}

prepare_workflow() {
  local source_file="$1"
  local prepared_file="$2"

  python3 - "$source_file" "$prepared_file" "$RUN_ID" <<'PY'
import json
import os
import sys

source_path, prepared_path, run_id = sys.argv[1:4]
with open(source_path, "r", encoding="utf-8") as fh:
    workflow = json.load(fh)

workflow["name"] = f"{workflow.get('name', os.path.basename(source_path))} - live {run_id}"
workflow["trigger"] = workflow.get("trigger") or "manual"

file_name = os.path.basename(source_path)
for node in workflow.get("nodes", []):
    data = node.get("data") or {}
    config = data.get("config") or {}
    node_type = data.get("type")

    if node_type == "google_gmail" and config.get("operation") == "send":
        config["subject"] = f"{config.get('subject', 'ctrlchecks test')} - {run_id}"
    elif node_type == "google_sheets" and config.get("operation") == "append":
        config["data"] = [[f"Charlie {run_id}", "charlie@example.com", 91]]
    elif node_type == "google_drive" and config.get("operation") == "upload":
        config["fileName"] = f"ctrlchecks-test-upload-{run_id}.txt"
        config["fileData"] = f"This is a test file uploaded by ctrlchecks live testing at {run_id}."
    elif node_type == "google_doc" and config.get("operation") == "create":
        config["title"] = f"{config.get('title', 'ctrlchecks Test Document')} {run_id}"
        config["documentUrl"] = config.get("documentUrl") or "https://docs.google.com/document/d/placeholder/edit"
    elif node_type == "google_doc" and config.get("operation") == "get":
        config["operation"] = "read"
        if config.get("documentId") == "YOUR_DOC_ID":
            config["documentId"] = "{{$json.documentId}}"
        config["documentUrl"] = "https://docs.google.com/document/d/{{$json.documentId}}/edit"
        config["content"] = config.get("content") or "read-placeholder"
    elif node_type == "google_contacts" and config.get("operation") == "create":
        config["name"] = f"ctrlchecks Test User {run_id}"
        config["email"] = f"ctrltest_{run_id.lower()}@example.com"
    elif node_type == "google_contacts" and config.get("operation") == "update":
        config["name"] = f"ctrlchecks Test User UPDATED {run_id}"
        config["email"] = f"ctrltest_updated_{run_id.lower()}@example.com"
    elif node_type == "google_tasks" and config.get("operation") == "create":
        config["title"] = f"ctrlchecks Test Task {run_id} (safe to delete)"
    elif node_type == "google_tasks" and config.get("operation") == "update":
        config["title"] = f"ctrlchecks Test Task UPDATED {run_id}"

    data["config"] = config
    node["data"] = data

if file_name == "type2_04_docs.json":
    # The source JSON has a parallel get branch with YOUR_DOC_ID. For live API
    # testing, get the document created by node_2 instead of requiring a manual ID.
    for edge in workflow.get("edges", []):
        if edge.get("id") == "edge_3" and edge.get("target") == "node_4":
            edge["source"] = "node_2"

with open(prepared_path, "w", encoding="utf-8") as fh:
    json.dump(workflow, fh)
PY
}

cleanup_task_id() {
  local task_id="$1"
  local cleanup_file="$TMP_DIR/cleanup-task-$task_id.json"
  local save_file="$TMP_DIR/cleanup-task-$task_id.save.json"
  local exec_file="$TMP_DIR/cleanup-task-$task_id.exec.json"
  local status_file="$TMP_DIR/cleanup-task-$task_id.status.json"

  python3 - "$task_id" "$cleanup_file" <<'PY'
import json
import sys

task_id, file_path = sys.argv[1:3]
workflow = {
    "name": f"4d-google-tasks-cleanup-{task_id}",
    "trigger": "manual",
    "nodes": [
        {
            "id": "n1",
            "type": "custom",
            "position": {"x": 0, "y": 0},
            "data": {"type": "manual_trigger", "label": "Start", "category": "triggers", "config": {}},
        },
        {
            "id": "n2",
            "type": "custom",
            "position": {"x": 300, "y": 0},
            "data": {
                "type": "google_tasks",
                "label": "Delete leftover task",
                "category": "google",
                "config": {"operation": "delete", "taskListId": "@default", "taskId": task_id},
            },
        },
    ],
    "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
}
with open(file_path, "w", encoding="utf-8") as fh:
    json.dump(workflow, fh)
PY

  echo "Cleanup: deleting leftover Google Tasks taskId=$task_id"
  local save_code workflow_id exec_code execution_id terminal status duration started raw
  save_code=$(curl -s -o "$save_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$cleanup_file" "$BASE/api/save-workflow")
  workflow_id=$(json_value "$save_file" "workflow_id")
  if [ -z "$workflow_id" ]; then
    echo "Cleanup warning: save failed HTTP $save_code: $(head -c 180 "$save_file")"
    return 0
  fi

  exec_code=$(curl -s -o "$exec_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$workflow_id\",\"input\":{}}" "$BASE/api/execute-workflow")
  execution_id=$(json_value "$exec_file" "execution_id")
  if [ -z "$execution_id" ]; then
    echo "Cleanup warning: execute failed HTTP $exec_code: $(head -c 180 "$exec_file")"
    curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true
    return 0
  fi

  terminal=""
  started=$SECONDS
  for _ in $(seq 1 15); do
    sleep 2
    raw=$(curl -sf "$BASE/api/execution-status/$execution_id" -H "$AUTH" 2>/dev/null || echo "{}")
    printf "%s" "$raw" > "$status_file"
    status=$(json_value "$status_file" "status")
    case "$status" in
      success|failed|completed|error)
        terminal="$status"
        duration=$((SECONDS-started))
        break
        ;;
    esac
  done
  curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true
  echo "Cleanup: terminal=${terminal:-timeout} execId=$execution_id duration=${duration:-0}s"
}

summarize_status() {
  local status_file="$1"
  local file_name="$2"

  python3 - "$status_file" "$file_name" <<'PY'
import json
import sys

status_path, file_name = sys.argv[1:3]

with open(status_path, "r", encoding="utf-8") as fh:
    doc = json.load(fh)

google_steps = []
failures = []

def parse_output(raw):
    if raw is None:
        return {}
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {"text": raw}
    return raw

def find_error(obj, path="$"):
    if isinstance(obj, dict):
        if obj.get("_error"):
            return f"{path}._error={obj.get('_error')}"
        if obj.get("success") is False:
            err = obj.get("error")
            return f"{path}.success=false {err}"
        if isinstance(obj.get("error"), dict) and obj["error"].get("message"):
            return f"{path}.error={obj['error'].get('message')}"
        for key, value in obj.items():
            found = find_error(value, f"{path}.{key}")
            if found:
                return found
    elif isinstance(obj, list):
        for idx, value in enumerate(obj[:20]):
            found = find_error(value, f"{path}[{idx}]")
            if found:
                return found
    return None

def compact(obj):
    if isinstance(obj, dict):
        keys = list(obj.keys())
        if "output" in obj and isinstance(obj["output"], dict):
            inner = obj["output"]
            data = inner.get("data")
            op = inner.get("operation")
            if isinstance(data, dict):
                data_keys = list(data.keys())[:6]
                return f"op={op} dataKeys={data_keys}"
            if isinstance(data, list):
                return f"op={op} dataCount={len(data)}"
            return f"op={op} data={str(data)[:80]}"
        if "data" in obj:
            data = obj.get("data")
            if isinstance(data, dict):
                return f"keys={keys[:6]} dataKeys={list(data.keys())[:6]}"
            if isinstance(data, list):
                return f"keys={keys[:6]} dataCount={len(data)}"
        if "messages" in obj:
            return f"keys={keys[:6]} messageCount={len(obj.get('messages') or [])}"
        if "rows" in obj:
            return f"keys={keys[:6]} rowCount={len(obj.get('rows') or [])}"
        if "documentId" in obj:
            return f"keys={keys[:6]} documentId={str(obj.get('documentId'))[:24]}"
        return f"keys={keys[:8]}"
    if isinstance(obj, list):
        return f"listCount={len(obj)}"
    return str(obj)[:120]

for step in doc.get("steps", []):
    if not isinstance(step, dict):
        continue
    node_type = step.get("node_type") or step.get("nodeType") or step.get("type") or ""
    if not str(node_type).startswith("google_"):
        continue
    output = parse_output(step.get("output_json") if "output_json" in step else step.get("output"))
    operation = ""
    if isinstance(output, dict):
        operation = str(output.get("operation") or (output.get("output") or {}).get("operation") or "")
    status = step.get("status") or ""
    summary = compact(output)
    google_steps.append({
        "node": node_type,
        "status": status,
        "operation": operation,
        "summary": summary,
    })
    if status in {"failed", "error"}:
        failures.append(f"{node_type} step status={status}")
    found = find_error(output)
    if found:
        failures.append(f"{node_type}: {found[:220]}")

if not google_steps:
    failures.append("No Google node steps found in execution status")

print("SNIPPET " + " ; ".join(
    f"{s['node']}[{s['operation'] or '?'}] {s['summary']}" for s in google_steps
)[:700])

if failures:
    print("FAILURES " + " | ".join(failures)[:900])
    sys.exit(1)

print("VALIDATION OK")
PY
}

run_workflow_file() {
  local index="$1"
  local total="$2"
  local source_file="$3"
  local file_name
  file_name="$(basename "$source_file")"
  local prepared_file="$TMP_DIR/$file_name"
  local save_file="$TMP_DIR/$file_name.save.json"
  local exec_file="$TMP_DIR/$file_name.exec.json"
  local status_file="$TMP_DIR/$file_name.status.json"
  local missing_file="$TMP_DIR/$file_name.missing.json"

  echo ""
  echo "--- $index/$total: $file_name ---"

  prepare_workflow "$source_file" "$prepared_file"

  if ! verify_catalog_and_workflow "$prepared_file"; then
    fail "$file_name|canonical check failed||0s|"
    return 0
  fi

  local save_code
  save_code=$(curl -s -o "$save_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$prepared_file" "$BASE/api/save-workflow")
  local workflow_id
  workflow_id=$(json_value "$save_file" "workflow_id")

  if [ -z "$workflow_id" ]; then
    fail "$file_name|save failed HTTP $save_code||0s|$(head -c 220 "$save_file")"
    return 0
  fi

  curl -s -H "$AUTH" "$BASE/api/workflows/$workflow_id/missing-items" > "$missing_file" || true
  python3 - "$missing_file" <<'PY'
import json
import sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as fh:
        data = json.load(fh)
except Exception:
    print("Missing-items: unavailable")
    sys.exit(0)
summary = ((data.get("display") or {}).get("summary") or {})
missing = summary.get("missingCredentialCount")
print(f"Missing-items: missingCredentialCount={missing}")
PY

  local exec_code
  exec_code=$(curl -s -o "$exec_file" -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$workflow_id\",\"input\":{}}" "$BASE/api/execute-workflow")
  local execution_id
  execution_id=$(json_value "$exec_file" "execution_id")

  if [ -z "$execution_id" ]; then
    fail "$file_name|execute failed HTTP $exec_code||0s|$(head -c 220 "$exec_file")"
    curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true
    return 0
  fi

  local terminal=""
  local duration=0
  local started=$SECONDS
  local raw
  for _ in $(seq 1 30); do
    sleep 2
    raw=$(curl -sf "$BASE/api/execution-status/$execution_id" -H "$AUTH" 2>/dev/null || echo "{}")
    printf "%s" "$raw" > "$status_file"
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
  validation=$(summarize_status "$status_file" "$file_name")
  local validation_code=$?
  echo "$validation"

  curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true

  local snippet
  snippet=$(echo "$validation" | sed -n 's/^SNIPPET //p' | head -n 1)
  local failure_text
  failure_text=$(echo "$validation" | sed -n 's/^FAILURES //p' | head -n 1)

  if [ "$terminal" = "success" ] && [ "$validation_code" -eq 0 ]; then
    pass "$file_name|success|$execution_id|${duration}s|$snippet"
  else
    fail "$file_name|${terminal:-timeout}|$execution_id|${duration}s|${failure_text:-$snippet}"
  fi
}

echo "============================================================"
echo "  Phase 4D Batch 1 - Google OAuth Workflow JSONs"
echo "  Base: $BASE"
echo "  Workflow dir: $WORKFLOW_DIR"
echo "  Run ID: $RUN_ID"
echo "============================================================"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "Workflow dir not found: $WORKFLOW_DIR"
  exit 1
fi

if ! preflight; then
  echo "TIER 4D GOOGLE BATCH GATE: FAIL - preflight failed"
  exit 1
fi

if [ -n "${PHASE_4D_GOOGLE_CLEANUP_TASK_IDS:-}" ]; then
  for task_id in $PHASE_4D_GOOGLE_CLEANUP_TASK_IDS; do
    cleanup_task_id "$task_id"
  done
fi

if [ -n "${PHASE_4D_GOOGLE_FILES:-}" ]; then
  FILES=()
  for file_name in $PHASE_4D_GOOGLE_FILES; do
    FILES+=("$WORKFLOW_DIR/$file_name")
  done
else
  FILES=(
    "$WORKFLOW_DIR/type2_01_gmail.json"
    "$WORKFLOW_DIR/type2_02_sheets.json"
    "$WORKFLOW_DIR/type2_03_drive.json"
    "$WORKFLOW_DIR/type2_04_docs.json"
    "$WORKFLOW_DIR/type2_05_contacts.json"
    "$WORKFLOW_DIR/type2_06_tasks.json"
  )
fi

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Missing workflow file: $file"
    exit 1
  fi
done

total="${#FILES[@]}"
index=1
for file in "${FILES[@]}"; do
  run_workflow_file "$index" "$total" "$file"
  index=$((index+1))
done

echo ""
echo "============================================================"
echo "  Tier 4D Google Batch Results: ${PASS} PASS / ${FAIL} FAIL"
echo "============================================================"
echo "RESULT_TABLE_BEGIN"
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo "RESULT_TABLE_END"

if [ "$FAIL" -eq 0 ]; then
  echo "TIER 4D GOOGLE BATCH GATE: PASS - all ${PASS} Google workflow JSONs passed"
  exit 0
fi

echo "TIER 4D GOOGLE BATCH GATE: FAIL - ${FAIL} Google workflow JSON(s) failed"
exit 1
