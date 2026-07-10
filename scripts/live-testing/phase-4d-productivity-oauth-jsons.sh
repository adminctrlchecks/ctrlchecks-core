#!/bin/bash
# Phase 4D - Productivity OAuth workflow JSON batch (run ON SERVER ONLY)
# Scope: testing/productivity/*.json only. Do not run Tier 4E/4F from this script.

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
NOTION_CONNECTION_ID="${NOTION_CONNECTION_ID:-625529ef-2a3d-4f2f-9a77-bfcb9dc7621e}"
WORKFLOW_DIR="${1:-/tmp/phase-4d-productivity-jsons}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="/tmp/phase-4d-productivity-run-$RUN_ID"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
SKIP=0
RESULTS=()

mkdir -p "$TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR" 2>/dev/null || true
}
trap cleanup EXIT

pass() { echo "PASS $1"; PASS=$((PASS+1)); RESULTS+=("PASS|$1"); }
fail() { echo "FAIL $1"; FAIL=$((FAIL+1)); RESULTS+=("FAIL|$1"); }
skip() { echo "SKIP $1"; SKIP=$((SKIP+1)); RESULTS+=("SKIPPED|$1"); }
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

connection_id_for_provider() {
  local provider="$1"
  python3 - "$TMP_DIR/connections.json" "$provider" <<'PY'
import json
import sys

path, provider = sys.argv[1:3]
with open(path, "r", encoding="utf-8") as fh:
    data = json.load(fh)
items = data if isinstance(data, list) else data.get("connections") or data.get("data") or data.get("items") or []
for item in items:
    if not isinstance(item, dict):
        continue
    if str(item.get("provider") or "") == provider and str(item.get("status") or "") == "active":
        print(item.get("id") or "")
        sys.exit(0)
print("")
PY
}

has_provider() {
  local provider="$1"
  [ -n "$(connection_id_for_provider "$provider")" ]
}

test_connection() {
  local label="$1"
  local id="$2"
  local out="$TMP_DIR/test-$label.json"
  if [ -z "$id" ]; then
    warn "$label connection not present; test skipped"
    return 1
  fi

  local code
  code=$(curl -s -o "$out" -w "%{http_code}" \
    -X POST -H "$AUTH" "$BASE/api/credential-connections/connections/$id/test")
  if [ "$code" != "200" ]; then
    warn "$label connection test HTTP $code: $(head -c 180 "$out")"
    return 1
  fi

  python3 - "$out" "$label" <<'PY'
import json
import sys

path, label = sys.argv[1:3]
with open(path, "r", encoding="utf-8") as fh:
    data = json.load(fh)
print(f"Preflight: {label} connection test success={data.get('success')} status={data.get('status')} expired={data.get('expired')}")
sys.exit(0 if data.get("success") is not False else 1)
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

  python3 - "$TMP_DIR/connections.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
items = data if isinstance(data, list) else data.get("connections") or data.get("data") or data.get("items") or []
providers = []
rows = []
for item in items:
    if isinstance(item, dict):
        provider = str(item.get("provider") or "?")
        providers.append(provider)
        if provider in {"notion", "dropbox", "microsoft", "slack", "youtube", "twitter", "instagram"}:
            rows.append(f"{provider}:{item.get('credentialTypeId')}:{item.get('id')}:{item.get('status')}")
print("Preflight: connection providers=" + ",".join(sorted(set(providers))) + f" count={len(items)}")
if rows:
    print("Preflight: relevant connections=" + " ; ".join(rows))
PY

  local notion_id dropbox_id microsoft_id
  notion_id="$(connection_id_for_provider notion)"
  dropbox_id="$(connection_id_for_provider dropbox)"
  microsoft_id="$(connection_id_for_provider microsoft)"

  if [ -n "$notion_id" ]; then
    NOTION_CONNECTION_ID="$notion_id"
    test_connection notion "$NOTION_CONNECTION_ID" || warn "Notion test returned warning; workflow execution will be authoritative"
  fi
  if [ -n "$dropbox_id" ]; then
    test_connection dropbox "$dropbox_id" || warn "Dropbox test returned warning; workflow execution will be authoritative"
  fi
  if [ -n "$microsoft_id" ]; then
    test_connection microsoft "$microsoft_id" || warn "Microsoft test returned warning; workflow execution will be authoritative"
  fi
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

def prune_to_nodes(keep_ids):
    keep = set(keep_ids)
    workflow["nodes"] = [node for node in workflow.get("nodes", []) if node.get("id") in keep]
    workflow["edges"] = [
        edge for edge in workflow.get("edges", [])
        if edge.get("source") in keep and edge.get("target") in keep
    ]

if file_name == "type2_12_notion.json":
    # Skip create/query branches requiring YOUR_NOTION_DATABASE_ID. Read-only:
    # search, getMe, and list databases.
    prune_to_nodes(["node_1", "node_2", "node_3", "node_4", "node_5", "node_6", "node_7"])
elif file_name == "type2_13_slack.json":
    # Verify B3-2 fix with OAuth bot-token path only. The webhook branch needs a
    # direct Incoming Webhook URL and is a separate manual-secret path.
    prune_to_nodes(["node_1", "node_2", "node_3"])

for node in workflow.get("nodes", []):
    data = node.get("data") or {}
    config = data.get("config") or {}
    node_type = data.get("type")

    if node_type == "notion":
        if config.get("resource") == "search":
            config["searchQuery"] = config.get("searchQuery") or config.get("query") or "test"
            config["pageSize"] = config.get("pageSize") or 10
        if config.get("resource") == "database" and config.get("operation") == "list":
            config["pageSize"] = config.get("pageSize") or 10
    elif node_type == "dropbox":
        path = f"/ctrlchecks_test_upload_{run_id}.txt"
        if config.get("operation") in {"upload", "download"}:
            config["path"] = path
        if config.get("operation") == "upload":
            config["content"] = f"CtrlChecks Dropbox live test {run_id}. Safe to delete."
    elif node_type == "onedrive":
        path = f"/ctrlchecks_test_upload_{run_id}.txt"
        if config.get("operation") == "upload":
            config["path"] = path
            config["content"] = f"CtrlChecks OneDrive live test {run_id}. Safe to delete."
    elif node_type == "microsoft_teams":
        config["message"] = f"ctrlchecks workflow platform test message {run_id}. Automated integration test. Please ignore."
    elif node_type == "slack_message":
        if config.get("channel") == "YOUR_SLACK_CHANNEL":
            config["channel"] = os.environ.get("SLACK_TEST_CHANNEL", "#general")
        config["message"] = f"ctrlchecks Slack OAuth live test {run_id}. Automated integration test. Please ignore."
        config["text"] = config["message"]

    data["config"] = config
    node["data"] = data

with open(prepared_path, "w", encoding="utf-8") as fh:
    json.dump(workflow, fh)
PY
}

summarize_status() {
  local status_file="$1"

  python3 - "$status_file" <<'PY'
import json
import sys

target_types = {"notion", "dropbox", "onedrive", "microsoft_teams", "slack_message"}

with open(sys.argv[1], "r", encoding="utf-8") as fh:
    doc = json.load(fh)

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
            if isinstance(err, dict):
                err = err.get("message") or err
            return f"{path}.success=false {err}"
        if isinstance(obj.get("error"), dict) and obj["error"].get("message"):
            return f"{path}.error={obj['error'].get('message')}"
        if isinstance(obj.get("error"), str) and obj.get("error"):
            return f"{path}.error={obj.get('error')}"
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
        if "output" in obj and isinstance(obj["output"], dict):
            obj = obj["output"]
        keys = list(obj.keys())
        if "_error" in obj:
            return f"_error={str(obj.get('_error'))[:160]}"
        if "results" in obj and isinstance(obj.get("results"), list):
            return f"keys={keys[:6]} results={len(obj.get('results') or [])}"
        if "items" in obj and isinstance(obj.get("items"), list):
            return f"keys={keys[:6]} items={len(obj.get('items') or [])}"
        if "metadata" in obj and isinstance(obj.get("metadata"), dict):
            return f"keys={keys[:6]} metadataKeys={list(obj['metadata'].keys())[:6]}"
        if "dataBase64" in obj:
            return f"keys={keys[:6]} sizeBytes={obj.get('sizeBytes')}"
        if "teams" in obj:
            return f"keys={keys[:6]} teams={obj.get('teams')}"
        if "id" in obj or "name" in obj:
            return f"keys={keys[:8]} id={str(obj.get('id') or '')[:24]} name={str(obj.get('name') or '')[:40]}"
        return f"keys={keys[:8]}"
    if isinstance(obj, list):
        return f"listCount={len(obj)}"
    return str(obj)[:160]

steps = []
failures = []
for step in doc.get("steps", []):
    if not isinstance(step, dict):
        continue
    node_type = step.get("node_type") or step.get("nodeType") or step.get("type") or ""
    if node_type not in target_types:
        continue
    output = parse_output(step.get("output_json") if "output_json" in step else step.get("output"))
    operation = ""
    if isinstance(output, dict):
        payload = output.get("output") if isinstance(output.get("output"), dict) else output
        operation = str(payload.get("operation") or payload.get("action") or "")
    status = step.get("status") or ""
    steps.append({"node": node_type, "status": status, "operation": operation, "summary": compact(output)})
    if status in {"failed", "error"}:
        failures.append(f"{node_type} step status={status}")
    found = find_error(output)
    if found:
        failures.append(f"{node_type}: {found[:280]}")

if not steps:
    failures.append("No productivity node steps found in execution status")

print("SNIPPET " + " ; ".join(
    f"{s['node']}[{s['operation'] or '?'}] {s['summary']}" for s in steps
)[:900])

if failures:
    print("FAILURES " + " | ".join(failures)[:1100])
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

  case "$file_name" in
    type2_13_slack.json)
      if ! has_provider slack; then
        verify_catalog_and_workflow "$source_file" || fail "$file_name|canonical check failed||0s|"
        skip "$file_name|skipped|||Slack connection not present in /connections"
        return 0
      fi
      ;;
    type2_14_dropbox.json)
      if ! has_provider dropbox; then
        verify_catalog_and_workflow "$source_file" || fail "$file_name|canonical check failed||0s|"
        skip "$file_name|skipped|||Dropbox connection not present in /connections"
        return 0
      fi
      ;;
    type2_15_onedrive.json)
      if ! has_provider microsoft; then
        verify_catalog_and_workflow "$source_file" || fail "$file_name|canonical check failed||0s|"
        skip "$file_name|skipped|||B0-2 Microsoft OAuth missing/not connected on server"
        return 0
      fi
      ;;
    type2_16_microsoft_teams.json)
      if ! has_provider microsoft; then
        verify_catalog_and_workflow "$source_file" || fail "$file_name|canonical check failed||0s|"
        skip "$file_name|skipped|||B0-2 Microsoft OAuth missing/not connected on server"
        return 0
      fi
      ;;
  esac

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
  local missing_summary
  missing_summary=$(python3 - "$missing_file" <<'PY'
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
providers = []
for cred in data.get("credentials") or []:
    if isinstance(cred, dict) and cred.get("satisfied") is False:
        providers.append(str(cred.get("provider") or cred.get("type") or "?"))
print(f"Missing-items: missingCredentialCount={missing} unsatisfied={','.join(providers)}")
PY
)
  echo "$missing_summary"

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
  validation=$(summarize_status "$status_file")
  local validation_code=$?
  echo "$validation"

  curl -s -X DELETE "$BASE/api/workflows/$workflow_id" -H "$AUTH" > /dev/null || true

  local snippet
  snippet=$(echo "$validation" | sed -n 's/^SNIPPET //p' | head -n 1)
  local failure_text
  failure_text=$(echo "$validation" | sed -n 's/^FAILURES //p' | head -n 1)
  if [ "${failure_text:-}" = "No productivity node steps found in execution status" ] && [ "$terminal" = "failed" ]; then
    failure_text="CredentialPreflightFailed; $missing_summary"
  fi

  if [ "$terminal" = "success" ] && [ "$validation_code" -eq 0 ]; then
    pass "$file_name|success|$execution_id|${duration}s|$snippet"
  else
    fail "$file_name|${terminal:-timeout}|$execution_id|${duration}s|${failure_text:-$snippet}"
  fi
}

echo "============================================================"
echo "  Phase 4D Batch 3 - Productivity OAuth Workflow JSONs"
echo "  Base: $BASE"
echo "  Workflow dir: $WORKFLOW_DIR"
echo "  Run ID: $RUN_ID"
echo "============================================================"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "Workflow dir not found: $WORKFLOW_DIR"
  exit 1
fi

if ! preflight; then
  echo "TIER 4D PRODUCTIVITY BATCH GATE: FAIL - preflight failed"
  exit 1
fi

if [ -n "${PHASE_4D_PRODUCTIVITY_FILES:-}" ]; then
  FILES=()
  for file_name in $PHASE_4D_PRODUCTIVITY_FILES; do
    FILES+=("$WORKFLOW_DIR/$file_name")
  done
else
  FILES=(
    "$WORKFLOW_DIR/type2_12_notion.json"
    "$WORKFLOW_DIR/type2_13_slack.json"
    "$WORKFLOW_DIR/type2_14_dropbox.json"
    "$WORKFLOW_DIR/type2_15_onedrive.json"
    "$WORKFLOW_DIR/type2_16_microsoft_teams.json"
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
echo "  Tier 4D Productivity Batch Results: ${PASS} PASS / ${FAIL} FAIL / ${SKIP} SKIPPED"
echo "============================================================"
echo "RESULT_TABLE_BEGIN"
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo "RESULT_TABLE_END"

if [ "$FAIL" -eq 0 ]; then
  echo "TIER 4D PRODUCTIVITY BATCH GATE: PASS - all runnable productivity workflow JSONs passed (${SKIP} skipped)"
  exit 0
fi

echo "TIER 4D PRODUCTIVITY BATCH GATE: PARTIAL - ${FAIL} productivity workflow JSON(s) failed, ${SKIP} skipped"
exit 1
