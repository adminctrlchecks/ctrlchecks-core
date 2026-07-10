#!/bin/bash
# Phase 4B — Transform & utility nodes (run ON SERVER ONLY)
# Nodes: filter, sort, aggregate, merge (fan-in), date_time, json_parser chain, rename_keys, edit_fields

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
RESULTS=()

pass() { echo "✅ $1"; PASS=$((PASS+1)); RESULTS+=("✅ $1"); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); RESULTS+=("❌ $1"); }

run_node_test() {
  local NODE="$1"
  local WF_FILE="$2"

  local SAVE_CODE WF_ID EXEC_CODE EXEC_ID TERMINAL ST DURATION
  SAVE_CODE=$(curl -s -o /tmp/4b-save.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$WF_FILE" "$BASE/api/save-workflow")
  WF_ID=$(python3 -c "import json; d=json.load(open('/tmp/4b-save.json')); print(d.get('workflow',{}).get('id') or d.get('id',''))" 2>/dev/null || echo "")

  if [ -z "$WF_ID" ]; then
    fail "$NODE save failed (HTTP $SAVE_CODE): $(python3 -c "import json; d=json.load(open('/tmp/4b-save.json')); print(str(d.get('error',d.get('message',d)))[:150])" 2>/dev/null)"
    return 0
  fi

  EXEC_CODE=$(curl -s -o /tmp/4b-exec.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$WF_ID\",\"input\":{}}" "$BASE/api/execute-workflow")
  EXEC_ID=$(python3 -c "import json; print(json.load(open('/tmp/4b-exec.json')).get('executionId',''))" 2>/dev/null || echo "")

  if [ -z "$EXEC_ID" ]; then
    fail "$NODE execute failed (HTTP $EXEC_CODE): $(cat /tmp/4b-exec.json | head -c 120)"
    curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" > /dev/null || true
    return 0
  fi

  TERMINAL="" DURATION=0
  local T0=$SECONDS
  for i in $(seq 1 20); do
    sleep 2
    ST=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" | \
         python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
    case "$ST" in success|failed|completed|error) TERMINAL="$ST"; DURATION=$((SECONDS-T0)); break;; esac
  done

  local OUTPUT
  OUTPUT=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d.get('steps',[]):
    if not isinstance(s,dict): continue
    nt=s.get('node_type','')
    if nt in ('manual_trigger','trigger','log_output'): continue
    st=s.get('status','')
    out=s.get('output_json') or s.get('output') or {}
    err=s.get('error','')
    if err or '_error' in str(out):
        print('  ERR %s: %s' % (nt, str(err or out)[:200]))
    else:
        if isinstance(out,dict):
            sample={k:str(v)[:60] for k,v in list(out.items())[:4]}
        else:
            sample=str(out)[:100]
        print('  OUT %s: %s' % (nt,sample))
" 2>/dev/null || echo "")

  curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" > /dev/null || true

  if [ "$TERMINAL" = "success" ]; then
    pass "$NODE: success in ${DURATION}s execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "$OUTPUT"
  else
    fail "$NODE: terminal=$TERMINAL execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "$OUTPUT"
  fi
  return 0
}

make_wf() { python3 -c "import json; print(json.dumps($1))" > /tmp/4b-wf.json; }

echo "══════════════════════════════════════════"
echo "  Phase 4B — Transform & Utility Nodes"
echo "  Base: $BASE"
echo "══════════════════════════════════════════"
echo ""

# ── 1. filter ────────────────────────────────────────────────────────────────
echo "--- 1/8: filter ---"
python3 - <<'PY'
import json
wf = {"name":"4b-filter","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"filter","label":"Filter","category":"logic","config":{"condition":"true"}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"filter done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "filter" "/tmp/4b-wf.json"

# ── 2. sort ──────────────────────────────────────────────────────────────────
echo "--- 2/8: sort ---"
python3 - <<'PY'
import json
wf = {"name":"4b-sort","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"sort","label":"Sort","category":"data","config":{"field":"name","direction":"asc","type":"auto"}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"sort done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "sort" "/tmp/4b-wf.json"

# ── 3. aggregate ─────────────────────────────────────────────────────────────
echo "--- 3/8: aggregate ---"
python3 - <<'PY'
import json
wf = {"name":"4b-aggregate","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"aggregate","label":"Aggregate","category":"data","config":{"operation":"count","field":"id"}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"aggregate done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "aggregate" "/tmp/4b-wf.json"

# ── 4. merge (fan-in topology) ───────────────────────────────────────────────
echo "--- 4/8: merge (fan-in: trigger→A→merge, trigger→B→merge) ---"
python3 - <<'PY'
import json
wf = {"name":"4b-merge","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":200},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":100},"data":{"type":"set_variable","label":"Branch A","category":"data","config":{"name":"branchA","value":"from_A"}}},
  {"id":"n3","type":"custom","position":{"x":300,"y":300},"data":{"type":"set_variable","label":"Branch B","category":"data","config":{"name":"branchB","value":"from_B"}}},
  {"id":"n4","type":"custom","position":{"x":600,"y":200},"data":{"type":"merge","label":"Merge","category":"logic","config":{"mode":"append"}}},
  {"id":"n5","type":"custom","position":{"x":900,"y":200},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"merge done"}}}
],"edges":[
  {"id":"e1","source":"n1","target":"n2"},
  {"id":"e2","source":"n1","target":"n3"},
  {"id":"e3","source":"n2","target":"n4"},
  {"id":"e4","source":"n3","target":"n4"},
  {"id":"e5","source":"n4","target":"n5"}
]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "merge" "/tmp/4b-wf.json"

# ── 5. date_time ─────────────────────────────────────────────────────────────
echo "--- 5/8: date_time ---"
python3 - <<'PY'
import json
wf = {"name":"4b-date_time","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"date_time","label":"Date Now","category":"data","config":{"operation":"now","format":"ISO"}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"date done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "date_time" "/tmp/4b-wf.json"

# ── 6. json_parser → rename_keys chain ───────────────────────────────────────
echo "--- 6/8: json_parser→rename_keys chain ---"
python3 - <<'PY'
import json
sample = json.dumps({"hello":"world","count":42})
wf = {"name":"4b-json-chain","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"json_parser","label":"Parse JSON","category":"data","config":{"json":sample}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"rename_keys","label":"Rename","category":"data","config":{"mappings":{"parsed":"data"}}}},
  {"id":"n4","type":"custom","position":{"x":900,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"chain done"}}}
],"edges":[
  {"id":"e1","source":"n1","target":"n2"},
  {"id":"e2","source":"n2","target":"n3"},
  {"id":"e3","source":"n3","target":"n4"}
]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "json_parser→rename_keys" "/tmp/4b-wf.json"

# ── 7. rename_keys (standalone) ──────────────────────────────────────────────
echo "--- 7/8: rename_keys (standalone) ---"
python3 - <<'PY'
import json
wf = {"name":"4b-rename_keys","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"rename_keys","label":"Rename Keys","category":"data","config":{"mappings":{"inputField":"outputField"}}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"rename done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "rename_keys" "/tmp/4b-wf.json"

# ── 8. edit_fields ───────────────────────────────────────────────────────────
echo "--- 8/8: edit_fields ---"
python3 - <<'PY'
import json
wf = {"name":"4b-edit_fields","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"edit_fields","label":"Edit Fields","category":"data","config":{"fields":{"platform":"ctrlchecks","version":"1.0"}}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"edit done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4b-wf.json","w") as f: json.dump(wf,f)
PY
run_node_test "edit_fields" "/tmp/4b-wf.json"

echo ""
echo "══════════════════════════════════════════"
echo "  Tier 4B Results: ${PASS} PASS / ${FAIL} FAIL"
echo "══════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ TIER 4B GATE: PASS — all ${PASS} nodes/chains executed successfully"
else
  echo "❌ TIER 4B GATE: FAIL — ${FAIL} node(s)/chain(s) failed"
fi
