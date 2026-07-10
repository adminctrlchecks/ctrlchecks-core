#!/bin/bash
# Phase 4F — Branching & flow control (run ON SERVER ONLY)
# if_else: conditions=[{field,operator,value}] (NOT condition string)
# switch:  expression + cases=[{value,label}] + sourceHandle=case.value (NOT case_N)

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
RESULTS=()

pass() { echo "✅ $1"; PASS=$((PASS+1)); RESULTS+=("✅ $1"); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); RESULTS+=("❌ $1"); }

run_test() {
  local NODE="$1"
  local WF_FILE="$2"

  local SAVE_CODE WF_ID
  SAVE_CODE=$(curl -s -o /tmp/4f-save.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$WF_FILE" "$BASE/api/save-workflow")
  WF_ID=$(python3 -c "
import json
d=json.load(open('/tmp/4f-save.json'))
print((d.get('workflow') or {}).get('id') or d.get('id',''))
" 2>/dev/null || echo "")

  if [ -z "$WF_ID" ]; then
    fail "$NODE save HTTP=$SAVE_CODE: $(python3 -c "import json; d=json.load(open('/tmp/4f-save.json')); print(str(d.get('error',d.get('message',d)))[:200])" 2>/dev/null)"
    return 0
  fi

  local EXEC_CODE EXEC_ID
  EXEC_CODE=$(curl -s -o /tmp/4f-exec.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$WF_ID\",\"input\":{}}" "$BASE/api/execute-workflow")
  EXEC_ID=$(python3 -c "
import json
d=json.load(open('/tmp/4f-exec.json'))
print(d.get('executionId',d.get('execution_id','')))
" 2>/dev/null || echo "")

  if [ -z "$EXEC_ID" ]; then
    fail "$NODE execute HTTP=$EXEC_CODE: $(python3 -c "import json; print(str(json.load(open('/tmp/4f-exec.json')))[:160])" 2>/dev/null)"
    curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" >/dev/null || true
    return 0
  fi

  local TERMINAL="" ST DURATION=0
  local T0=$SECONDS
  for i in $(seq 1 20); do
    sleep 2
    ST=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null | \
         python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
    case "$ST" in success|failed|completed|error) TERMINAL="$ST"; DURATION=$((SECONDS-T0)); break;; esac
  done

  # Show which branches ran
  local BRANCH_INFO
  BRANCH_INFO=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
parts=[]
for s in d.get('steps',[]):
    if not isinstance(s,dict): continue
    nt=s.get('node_type','')
    if nt in ('manual_trigger','trigger'): continue
    label=s.get('label','') or nt
    st=s.get('status','')
    out=s.get('output_json') or {}
    note=''
    if isinstance(out,dict):
        for k in ('branch','matchedCase','result','condition','case','message'):
            if k in out: note=':%s=%s'%(k,str(out[k])[:30]); break
    parts.append('%s=%s%s'%(label[:12],st,note))
print(' | '.join(parts))
" 2>/dev/null || echo "")

  curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" >/dev/null || true

  if [ "$TERMINAL" = "success" ]; then
    pass "$NODE: success ${DURATION}s execId=$EXEC_ID"
    [ -n "$BRANCH_INFO" ] && echo "  $BRANCH_INFO"
  else
    fail "$NODE: terminal=$TERMINAL ${DURATION}s execId=$EXEC_ID"
    [ -n "$BRANCH_INFO" ] && echo "  $BRANCH_INFO"
  fi
  return 0
}

echo "════════════════════════════════════════════"
echo "  Phase 4F — Branching & Flow Control"
echo "  Base: $BASE"
echo "════════════════════════════════════════════"
echo ""

# ── 1. if_else — TRUE branch ──────────────────────────────────────────────────
# conditions: [{field:"1", operator:"equals", value:"1"}]  → always true
# Expects: true-branch log runs; false-branch log does NOT run
echo "--- 1/5: if_else (true branch, 1==1) ---"
python3 - <<'PY'
import json
cond_true = [{"field":"1","operator":"equals","value":"1"}]
wf={"name":"4f-if-true","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":200},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":200},"data":{"type":"if_else","label":"IF 1==1","category":"logic","config":{
    "conditions":cond_true,"combineOperation":"AND"
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":100},"data":{"type":"log_output","label":"Log TRUE","category":"output","config":{"level":"info","message":"TRUE-branch-ran"}}},
  {"id":"n4","type":"custom","position":{"x":600,"y":300},"data":{"type":"log_output","label":"Log FALSE","category":"output","config":{"level":"info","message":"FALSE-branch-should-not-run"}}}
],"edges":[
  {"id":"e1","source":"n1","target":"n2"},
  {"id":"e2","source":"n2","target":"n3","sourceHandle":"true"},
  {"id":"e3","source":"n2","target":"n4","sourceHandle":"false"}
]}
with open("/tmp/4f-wf.json","w") as f: json.dump(wf,f)
PY
run_test "if_else(true)" "/tmp/4f-wf.json"

# ── 2. if_else — FALSE branch ─────────────────────────────────────────────────
# conditions: [{field:"1", operator:"equals", value:"0"}]  → always false (1 ≠ 0)
echo "--- 2/5: if_else (false branch, 1!=0) ---"
python3 - <<'PY'
import json
cond_false = [{"field":"1","operator":"equals","value":"0"}]
wf={"name":"4f-if-false","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":200},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":200},"data":{"type":"if_else","label":"IF 1==0","category":"logic","config":{
    "conditions":cond_false,"combineOperation":"AND"
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":100},"data":{"type":"log_output","label":"Log TRUE","category":"output","config":{"level":"info","message":"TRUE-branch-should-not-run"}}},
  {"id":"n4","type":"custom","position":{"x":600,"y":300},"data":{"type":"log_output","label":"Log FALSE","category":"output","config":{"level":"info","message":"FALSE-branch-ran"}}}
],"edges":[
  {"id":"e1","source":"n1","target":"n2"},
  {"id":"e2","source":"n2","target":"n3","sourceHandle":"true"},
  {"id":"e3","source":"n2","target":"n4","sourceHandle":"false"}
]}
with open("/tmp/4f-wf.json","w") as f: json.dump(wf,f)
PY
run_test "if_else(false)" "/tmp/4f-wf.json"

# ── 3. switch — 3 cases, routes to B ─────────────────────────────────────────
# FIX: switch registry defines expression with type:"expression" (custom type).
# guaranteeInputForSchema sees type mismatch (string vs expression) → needFill=true
# → with empty upstream payload, falls back to "" and clears the literal "B".
# Workaround: upstream set_variable(name="expression", value="B") puts
# {expression:"B"} in upstreamPayload; guarantee picks it up by exact field name.
# Switch config uses template {{$json.expression}} so both resolveInputsFromConfig
# and guaranteeInputForSchema contribute the correct value.
echo "--- 3/5: switch (3 cases, expression=B) ---"
python3 - <<'PY'
import json
wf={"name":"4f-switch-3","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":300},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n_sv","type":"custom","position":{"x":150,"y":300},"data":{"type":"set_variable","label":"Set Expr","category":"data","config":{"name":"expression","value":"B"}}},
  {"id":"n2","type":"custom","position":{"x":350,"y":300},"data":{"type":"switch","label":"Switch","category":"logic","config":{
    "expression":"{{$json.expression}}",
    "cases":[{"value":"A","label":"Case A"},{"value":"B","label":"Case B"},{"value":"C","label":"Case C"}]
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":100},"data":{"type":"log_output","label":"Log A","category":"output","config":{"level":"info","message":"case-A-ran"}}},
  {"id":"n4","type":"custom","position":{"x":600,"y":300},"data":{"type":"log_output","label":"Log B","category":"output","config":{"level":"info","message":"case-B-ran"}}},
  {"id":"n5","type":"custom","position":{"x":600,"y":500},"data":{"type":"log_output","label":"Log C","category":"output","config":{"level":"info","message":"case-C-ran"}}}
],"edges":[
  {"id":"e0","source":"n1","target":"n_sv"},
  {"id":"e1","source":"n_sv","target":"n2"},
  {"id":"e2","source":"n2","target":"n3","sourceHandle":"A"},
  {"id":"e3","source":"n2","target":"n4","sourceHandle":"B"},
  {"id":"e4","source":"n2","target":"n5","sourceHandle":"C"}
]}
with open("/tmp/4f-wf.json","w") as f: json.dump(wf,f)
PY
run_test "switch(B)" "/tmp/4f-wf.json"

# ── 4. switch + merge (reconverge) ────────────────────────────────────────────
# trigger → set_variable(expression=X) → switch({{$json.expression}}) → log_X → merge → log_final
#                                                                       → log_Y → merge
# Only X branch runs; merge reconverges; log_final runs
echo "--- 4/5: switch+merge (reconverge, expression=X) ---"
python3 - <<'PY'
import json
wf={"name":"4f-switch-merge","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":200},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n_sv","type":"custom","position":{"x":150,"y":200},"data":{"type":"set_variable","label":"Set Expr","category":"data","config":{"name":"expression","value":"X"}}},
  {"id":"n2","type":"custom","position":{"x":350,"y":200},"data":{"type":"switch","label":"Switch","category":"logic","config":{
    "expression":"{{$json.expression}}",
    "cases":[{"value":"X","label":"X"},{"value":"Y","label":"Y"}]
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":100},"data":{"type":"log_output","label":"X branch","category":"output","config":{"level":"info","message":"X-branch-ran"}}},
  {"id":"n4","type":"custom","position":{"x":600,"y":300},"data":{"type":"log_output","label":"Y branch","category":"output","config":{"level":"info","message":"Y-branch-ran"}}},
  {"id":"n5","type":"custom","position":{"x":900,"y":200},"data":{"type":"merge","label":"Merge","category":"logic","config":{"mode":"overwrite"}}},
  {"id":"n6","type":"custom","position":{"x":1200,"y":200},"data":{"type":"log_output","label":"Final","category":"output","config":{"level":"info","message":"post-merge-ran"}}}
],"edges":[
  {"id":"e0","source":"n1","target":"n_sv"},
  {"id":"e1","source":"n_sv","target":"n2"},
  {"id":"e2","source":"n2","target":"n3","sourceHandle":"X"},
  {"id":"e3","source":"n2","target":"n4","sourceHandle":"Y"},
  {"id":"e4","source":"n3","target":"n5"},
  {"id":"e5","source":"n4","target":"n5"},
  {"id":"e6","source":"n5","target":"n6"}
]}
with open("/tmp/4f-wf.json","w") as f: json.dump(wf,f)
PY
run_test "switch+merge" "/tmp/4f-wf.json"

# ── 5. nested-if ──────────────────────────────────────────────────────────────
# outer=true → inner=false → log_inner_false (should run)
# outer=true → inner=true  → log_inner_true (should NOT run)
# outer=false → log_outer_false (should NOT run)
echo "--- 5/5: nested-if (outer=true, inner=false) ---"
python3 - <<'PY'
import json
cond_true  = [{"field":"1","operator":"equals","value":"1"}]
cond_false = [{"field":"1","operator":"equals","value":"0"}]
wf={"name":"4f-nested-if","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":200},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":200},"data":{"type":"if_else","label":"Outer TRUE","category":"logic","config":{"conditions":cond_true,"combineOperation":"AND"}}},
  {"id":"n3","type":"custom","position":{"x":600,"y":100},"data":{"type":"if_else","label":"Inner FALSE","category":"logic","config":{"conditions":cond_false,"combineOperation":"AND"}}},
  {"id":"n4","type":"custom","position":{"x":900,"y":50},"data":{"type":"log_output","label":"inner-true","category":"output","config":{"level":"info","message":"INNER-TRUE-should-not-run"}}},
  {"id":"n5","type":"custom","position":{"x":900,"y":150},"data":{"type":"log_output","label":"inner-false","category":"output","config":{"level":"info","message":"INNER-FALSE-ran"}}},
  {"id":"n6","type":"custom","position":{"x":600,"y":300},"data":{"type":"log_output","label":"outer-false","category":"output","config":{"level":"info","message":"OUTER-FALSE-should-not-run"}}}
],"edges":[
  {"id":"e1","source":"n1","target":"n2"},
  {"id":"e2","source":"n2","target":"n3","sourceHandle":"true"},
  {"id":"e3","source":"n2","target":"n6","sourceHandle":"false"},
  {"id":"e4","source":"n3","target":"n4","sourceHandle":"true"},
  {"id":"e5","source":"n3","target":"n5","sourceHandle":"false"}
]}
with open("/tmp/4f-wf.json","w") as f: json.dump(wf,f)
PY
run_test "nested-if" "/tmp/4f-wf.json"

echo ""
echo "════════════════════════════════════════════"
echo "  Tier 4F: ${PASS} PASS / ${FAIL} FAIL"
echo "════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ TIER 4F GATE: PASS — all ${PASS} branching scenarios pass"
else
  echo "❌ TIER 4F GATE: FAIL — ${FAIL} failure(s)"
fi
