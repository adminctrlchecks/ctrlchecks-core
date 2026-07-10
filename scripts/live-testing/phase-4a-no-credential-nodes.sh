#!/bin/bash
# Phase 4A — No-credential nodes (run ON SERVER ONLY)
# Pattern: manual_trigger → <node_under_test> → log_output
# Nodes: log_output, set_variable, math, http_request, json_parser, text_formatter, delay, noop

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
RESULTS=()

pass() { echo "✅ $1"; PASS=$((PASS+1)); RESULTS+=("✅ $1"); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); RESULTS+=("❌ $1"); }
warn() { echo "⚠️  $1"; }

run_node_test() {
  local NODE="$1"
  local WF_JSON="$2"
  local DESC="${3:-}"

  local SAVE_CODE
  SAVE_CODE=$(curl -s -o /tmp/4a-save.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d "$WF_JSON" "$BASE/api/save-workflow")
  local WF_ID
  WF_ID=$(python3 -c "import json; d=json.load(open('/tmp/4a-save.json')); print(d.get('workflow',{}).get('id') or d.get('id',''))" 2>/dev/null || echo "")

  if [ -z "$WF_ID" ]; then
    fail "$NODE save failed (HTTP $SAVE_CODE): $(python3 -c "import json; d=json.load(open('/tmp/4a-save.json')); print(d.get('error',d.get('message',''))[:120])" 2>/dev/null)"
    return
  fi

  local EXEC_CODE EXEC_ID
  EXEC_CODE=$(curl -s -o /tmp/4a-exec.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$WF_ID\",\"input\":{}}" "$BASE/api/execute-workflow")
  EXEC_ID=$(python3 -c "import json; print(json.load(open('/tmp/4a-exec.json')).get('executionId',''))" 2>/dev/null || echo "")

  if [ -z "$EXEC_ID" ]; then
    fail "$NODE execute failed (HTTP $EXEC_CODE): $(cat /tmp/4a-exec.json | head -c 120)"
    curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" > /dev/null
    return
  fi

  local TERMINAL="" ST="" DURATION=0
  local T0=$SECONDS
  for i in $(seq 1 20); do
    sleep 2
    local RAW
    RAW=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null || echo "{}")
    ST=$(echo "$RAW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
    case "$ST" in success|failed|completed|error) TERMINAL="$ST"; DURATION=$((SECONDS-T0)); break;; esac
  done

  local OUTPUT=""
  if [ -n "$EXEC_ID" ]; then
    OUTPUT=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
steps=d.get('steps',[])
for s in steps:
    if not isinstance(s,dict): continue
    st=s.get('status','')
    nt=s.get('node_type','')
    if st in ('failed','error'):
        print('FAIL node=%s err=%s' % (nt,str(s.get('error',s.get('output_json','')))[:150]))
    elif st=='success' and nt not in ('manual_trigger','trigger','log_output'):
        out=s.get('output_json') or s.get('output') or {}
        if isinstance(out,dict):
            keys=list(out.keys())[:4]
            vals={k:str(out[k])[:50] for k in keys}
            print('OUT node=%s keys=%s sample=%s' % (nt,keys,vals))
" 2>/dev/null || echo "")
  fi

  curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" > /dev/null || true

  if [ "$TERMINAL" = "success" ]; then
    pass "$NODE: terminal=success in ${DURATION}s execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "    $OUTPUT"
  else
    fail "$NODE: terminal=$TERMINAL execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "    $OUTPUT"
  fi
  return 0
}

echo "══════════════════════════════════════════"
echo "  Phase 4A — No-credential Nodes"
echo "  Base: $BASE"
echo "══════════════════════════════════════════"
echo ""

# ── 1. log_output ────────────────────────────────────────────────────────────
echo "--- 1/8: log_output ---"
run_node_test "log_output" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-log_output',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'tier-4a test passed'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'}]
}))")"

# ── 2. set_variable ──────────────────────────────────────────────────────────
echo "--- 2/8: set_variable ---"
run_node_test "set_variable" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-set_variable',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'set_variable','label':'Set Var','category':'data','config':{'name':'testVar','value':'hello-ctrlchecks'}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'var set'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 3. math ──────────────────────────────────────────────────────────────────
echo "--- 3/8: math ---"
run_node_test "math" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-math',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'math','label':'Math Add','category':'data','config':{'operation':'add','value1':'2','value2':'2'}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'math done'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 4. http_request ──────────────────────────────────────────────────────────
echo "--- 4/8: http_request ---"
run_node_test "http_request" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-http_request',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'http_request','label':'HTTP GET','category':'http_api','config':{'url':'http://127.0.0.1:3001/health/live','method':'GET'}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'http done'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 5. json_parser ───────────────────────────────────────────────────────────
echo "--- 5/8: json_parser ---"
run_node_test "json_parser" "$(python3 -c "
import json
sample_json = json.dumps({'hello':'world','count':42})
print(json.dumps({
  'name':'4a-json_parser',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'json_parser','label':'Parse JSON','category':'data','config':{'json':sample_json}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'json parsed'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 6. text_formatter ────────────────────────────────────────────────────────
echo "--- 6/8: text_formatter ---"
run_node_test "text_formatter" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-text_formatter',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'text_formatter','label':'Format Text','category':'data','config':{'template':'Hello from ctrlchecks platform!'}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'text formatted'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 7. delay ─────────────────────────────────────────────────────────────────
echo "--- 7/8: delay ---"
run_node_test "delay" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-delay',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'delay','label':'Delay 500ms','category':'utility','config':{'duration':500,'unit':'milliseconds'}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'delay done'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

# ── 8. noop ──────────────────────────────────────────────────────────────────
echo "--- 8/8: noop ---"
run_node_test "noop" "$(python3 -c "
import json
print(json.dumps({
  'name':'4a-noop',
  'nodes':[
    {'id':'n1','type':'custom','position':{'x':0,'y':0},'data':{'type':'manual_trigger','label':'Start','category':'triggers','config':{}}},
    {'id':'n2','type':'custom','position':{'x':300,'y':0},'data':{'type':'noop','label':'No-op','category':'logic','config':{}}},
    {'id':'n3','type':'custom','position':{'x':600,'y':0},'data':{'type':'log_output','label':'Log','category':'output','config':{'level':'info','message':'noop done'}}}
  ],
  'edges':[{'id':'e1','source':'n1','target':'n2'},{'id':'e2','source':'n2','target':'n3'}]
}))")"

echo ""
echo "══════════════════════════════════════════"
echo "  Tier 4A Results: ${PASS} PASS / ${FAIL} FAIL"
echo "══════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ TIER 4A GATE: PASS — all ${PASS} nodes executed successfully"
else
  echo "❌ TIER 4A GATE: FAIL — ${FAIL} node(s) failed"
fi
