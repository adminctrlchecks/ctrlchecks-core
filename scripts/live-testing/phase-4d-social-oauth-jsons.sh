#!/bin/bash
# Phase 4D - Social OAuth workflow JSON batch (run ON SERVER ONLY)
# Scope: testing/social/*.json only. Do not run testing/productivity in this script.

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
LINKEDIN_CONNECTION_ID="${LINKEDIN_CONNECTION_ID:-4e72aabf-ee3c-4893-853c-d946c43624c5}"
GOOGLE_CONNECTION_ID="${GOOGLE_CONNECTION_ID:-ba2f63f0-d88a-483f-bc72-ec9c90fac4c1}"
WORKFLOW_DIR="${1:-/tmp/phase-4d-social-jsons}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="/tmp/phase-4d-social-run-$RUN_ID"
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
for item in items:
    if isinstance(item, dict):
        providers.append(str(item.get("provider") or item.get("service") or item.get("type") or "?"))
print("Preflight: connection providers=" + ",".join(sorted(set(providers))) + f" count={len(items)}")
PY

  code=$(curl -s -o "$TMP_DIR/linkedin-connection-test.json" -w "%{http_code}" \
    -X POST -H "$AUTH" "$BASE/api/credential-connections/connections/$LINKEDIN_CONNECTION_ID/test")
  if [ "$code" = "200" ]; then
    python3 - "$TMP_DIR/linkedin-connection-test.json" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
print(f"Preflight: LinkedIn connection test success={data.get('success')} status={data.get('status')} expired={data.get('expired')}")
PY
  else
    warn "LinkedIn connection test HTTP $code: $(head -c 180 "$TMP_DIR/linkedin-connection-test.json")"
  fi

  code=$(curl -s -o "$TMP_DIR/google-connection-test.json" -w "%{http_code}" \
    -X POST -H "$AUTH" "$BASE/api/credential-connections/connections/$GOOGLE_CONNECTION_ID/test")
  if [ "$code" = "200" ]; then
    python3 - "$TMP_DIR/google-connection-test.json" <<'PY'
import json
import sys
with open(sys.argv[1], "r", encoding="utf-8") as fh:
    data = json.load(fh)
print(f"Preflight: Google/YouTube connection test success={data.get('success')} status={data.get('status')} expired={data.get('expired')}")
PY
  else
    warn "Google/YouTube connection test HTTP $code: $(head -c 180 "$TMP_DIR/google-connection-test.json")"
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

  python3 - "$source_file" "$prepared_file" "$RUN_ID" "${PHASE_4D_SOCIAL_ALLOW_TWITTER_WRITE:-0}" <<'PY'
import json
import os
import sys

source_path, prepared_path, run_id, allow_twitter_write = sys.argv[1:5]
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

if file_name == "type2_07_twitter.json" and allow_twitter_write != "1":
    # Prefer read-only operations for production live testing. The source JSON's
    # create/get/delete chain is left untouched; this temp copy keeps profile+search.
    prune_to_nodes(["node_1", "node_2", "node_3", "node_4", "node_5"])

if file_name == "type2_10_linkedin.json":
    # LinkedIn is read-only for this batch. Keep profile branch only; skip real
    # create/delete nodes and dry-run create-style branches in the temp copy.
    prune_to_nodes(["node_1", "node_2", "node_3"])

for node in workflow.get("nodes", []):
    data = node.get("data") or {}
    config = data.get("config") or {}
    node_type = data.get("type")

    if node_type == "twitter":
        if config.get("resource") == "search" and config.get("operation") == "recent":
            config["query"] = config.get("query") or "workflow automation"
            config["maxResults"] = config.get("maxResults") or 10
        if config.get("resource") == "tweet" and config.get("operation") == "create":
            config["text"] = f"CtrlChecks live test {run_id}; delete step should remove this tweet."
    elif node_type == "linkedin":
        if config.get("operation") in {"create_post", "delete_post"}:
            config["dryRun"] = True
        if config.get("operation") == "create_post":
            config["text"] = f"CtrlChecks live test {run_id}; temp copy only."
    elif node_type == "youtube":
        if config.get("operation") == "search_videos":
            config["query"] = config.get("query") or "workflow automation"
            config["maxResults"] = config.get("maxResults") or 5
    elif node_type == "instagram":
        if config.get("resource") == "insights" and config.get("operation") == "get":
            # Deployed Instagram executor calls this getInsights.
            config["operation"] = "getInsights"
        if config.get("resource") == "media" and config.get("operation") == "list":
            config["limit"] = config.get("limit") or 10

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

social_types = {"twitter", "instagram", "linkedin", "youtube", "facebook"}

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
            return f"_error={str(obj.get('_error'))[:140]}"
        if "profile" in obj and isinstance(obj["profile"], dict):
            profile = obj["profile"]
            return f"profileKeys={list(profile.keys())[:6]} name={str(profile.get('name') or '')[:40]}"
        if "data" in obj:
            data = obj.get("data")
            if isinstance(data, dict):
                return f"keys={keys[:6]} dataKeys={list(data.keys())[:6]}"
            if isinstance(data, list):
                return f"keys={keys[:6]} dataCount={len(data)}"
        if "items" in obj:
            items = obj.get("items") or []
            return f"keys={keys[:6]} itemCount={len(items)} title={str((items[0].get('snippet') or {}).get('title') if items and isinstance(items[0], dict) else '')[:50]}"
        if "statistics" in obj:
            return f"keys={keys[:6]} title={str(obj.get('title') or '')[:50]}"
        if "postCount" in obj:
            return f"keys={keys[:6]} postCount={obj.get('postCount')}"
        return f"keys={keys[:8]}"
    if isinstance(obj, list):
        return f"listCount={len(obj)}"
    return str(obj)[:140]

steps = []
failures = []
for step in doc.get("steps", []):
    if not isinstance(step, dict):
        continue
    node_type = step.get("node_type") or step.get("nodeType") or step.get("type") or ""
    if node_type not in social_types:
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
        failures.append(f"{node_type}: {found[:260]}")

if not steps:
    failures.append("No social node steps found in execution status")

print("SNIPPET " + " ; ".join(
    f"{s['node']}[{s['operation'] or '?'}] {s['summary']}" for s in steps
)[:900])

if failures:
    print("FAILURES " + " | ".join(failures)[:1000])
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

  if [ "$file_name" = "type2_09_facebook.json" ]; then
    if verify_catalog_and_workflow "$source_file"; then
      skip "$file_name|skipped|||B0-2 Facebook OAuth app credentials missing on server"
    else
      fail "$file_name|canonical check failed||0s|"
    fi
    return 0
  fi

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
  if [ "${failure_text:-}" = "No social node steps found in execution status" ] && [ "$terminal" = "failed" ]; then
    failure_text="CredentialPreflightFailed; $missing_summary"
  fi

  if [ "$terminal" = "success" ] && [ "$validation_code" -eq 0 ]; then
    pass "$file_name|success|$execution_id|${duration}s|$snippet"
  else
    fail "$file_name|${terminal:-timeout}|$execution_id|${duration}s|${failure_text:-$snippet}"
  fi
}

echo "============================================================"
echo "  Phase 4D Batch 2 - Social OAuth Workflow JSONs"
echo "  Base: $BASE"
echo "  Workflow dir: $WORKFLOW_DIR"
echo "  Run ID: $RUN_ID"
echo "============================================================"

if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "Workflow dir not found: $WORKFLOW_DIR"
  exit 1
fi

if ! preflight; then
  echo "TIER 4D SOCIAL BATCH GATE: FAIL - preflight failed"
  exit 1
fi

if [ -n "${PHASE_4D_SOCIAL_FILES:-}" ]; then
  FILES=()
  for file_name in $PHASE_4D_SOCIAL_FILES; do
    FILES+=("$WORKFLOW_DIR/$file_name")
  done
else
  FILES=(
    "$WORKFLOW_DIR/type2_07_twitter.json"
    "$WORKFLOW_DIR/type2_08_instagram.json"
    "$WORKFLOW_DIR/type2_09_facebook.json"
    "$WORKFLOW_DIR/type2_10_linkedin.json"
    "$WORKFLOW_DIR/type2_11_youtube.json"
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
echo "  Tier 4D Social Batch Results: ${PASS} PASS / ${FAIL} FAIL / ${SKIP} SKIPPED"
echo "============================================================"
echo "RESULT_TABLE_BEGIN"
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo "RESULT_TABLE_END"

if [ "$FAIL" -eq 0 ]; then
  echo "TIER 4D SOCIAL BATCH GATE: PASS - all runnable social workflow JSONs passed (${SKIP} skipped)"
  exit 0
fi

echo "TIER 4D SOCIAL BATCH GATE: PARTIAL - ${FAIL} social workflow JSON(s) failed, ${SKIP} skipped"
exit 1
