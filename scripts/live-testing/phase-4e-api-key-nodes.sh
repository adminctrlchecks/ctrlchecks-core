#!/bin/bash
# Phase 4E — API-key / credential nodes (run ON SERVER ONLY)
# Tests: openai_gpt, mistral, cohere, huggingface, pipedrive, clickup, discord_webhook
# Skips: airtable (needs baseId), google_gemini (done in 4C), gitlab (no workflow node)

BASE="${LIVE_E2E_BASE_URL:-http://127.0.0.1:3001}"
TOKEN="${LIVE_TEST_BEARER_TOKEN:?LIVE_TEST_BEARER_TOKEN required}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

PASS=0
FAIL=0
SKIP=0
RESULTS=()

pass() { echo "✅ $1"; PASS=$((PASS+1)); RESULTS+=("✅ $1"); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); RESULTS+=("❌ $1"); }
skip() { echo "⏭  $1"; SKIP=$((SKIP+1)); RESULTS+=("⏭ $1"); }

run_test() {
  local NODE="$1"
  local WF_FILE="$2"

  local SAVE_CODE WF_ID
  SAVE_CODE=$(curl -s -o /tmp/4e-save.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" -d @"$WF_FILE" "$BASE/api/save-workflow")
  WF_ID=$(python3 -c "
import json
d=json.load(open('/tmp/4e-save.json'))
print((d.get('workflow') or {}).get('id') or d.get('id',''))
" 2>/dev/null || echo "")

  if [ -z "$WF_ID" ]; then
    fail "$NODE save HTTP=$SAVE_CODE: $(python3 -c "import json; d=json.load(open('/tmp/4e-save.json')); print(str(d.get('error',d.get('message',d)))[:160])" 2>/dev/null)"
    return 0
  fi

  local EXEC_CODE EXEC_ID
  EXEC_CODE=$(curl -s -o /tmp/4e-exec.json -w "%{http_code}" \
    -X POST -H "$AUTH" -H "$CT" \
    -d "{\"workflowId\":\"$WF_ID\",\"input\":{}}" "$BASE/api/execute-workflow")
  EXEC_ID=$(python3 -c "
import json
d=json.load(open('/tmp/4e-exec.json'))
print(d.get('executionId',d.get('execution_id','')))
" 2>/dev/null || echo "")

  if [ -z "$EXEC_ID" ]; then
    fail "$NODE execute HTTP=$EXEC_CODE: $(python3 -c "import json; print(str(json.load(open('/tmp/4e-exec.json')))[:160])" 2>/dev/null)"
    curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" >/dev/null || true
    return 0
  fi

  local TERMINAL="" ST DURATION=0
  local T0=$SECONDS
  for i in $(seq 1 30); do
    sleep 3
    ST=$(curl -sf "$BASE/api/execution-status/$EXEC_ID" -H "$AUTH" 2>/dev/null | \
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
    if nt in ('manual_trigger','log_output','trigger'): continue
    out=s.get('output_json') or s.get('output') or {}
    err=s.get('error','')
    if err or (isinstance(out,dict) and ('_error' in out or out.get('success')==False)):
        print('  ERR %s: %s' % (nt, str(err or out.get('_error') or out.get('error',''))[:200]))
    else:
        if isinstance(out,dict):
            safe={k:str(v)[:80] for k,v in list(out.items())[:5]
                  if 'key' not in k.lower() and 'token' not in k.lower() and 'secret' not in k.lower()}
        else:
            safe=str(out)[:120]
        print('  OUT %s: %s' % (nt, safe))
" 2>/dev/null || echo "")

  curl -s -X DELETE "$BASE/api/workflows/$WF_ID" -H "$AUTH" >/dev/null || true

  if [ "$TERMINAL" = "success" ]; then
    pass "$NODE: success ${DURATION}s execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "$OUTPUT"
  else
    fail "$NODE: terminal=$TERMINAL ${DURATION}s execId=$EXEC_ID"
    [ -n "$OUTPUT" ] && echo "$OUTPUT"
  fi
  return 0
}

# ─── Verified active connection IDs ──────────────────────────────────────────
OAI_CONN="a9178bcf-c172-48c6-adcd-9e3f296e09fc"
MST_CONN="b9478f5c-87ce-469e-8736-851fd239d90b"
COH_CONN="b6355f72-6296-4334-91eb-86298c107c95"
HF_CONN="5d28d51e-2e8f-461b-b3de-444a99381611"
PD_CONN="e31eb7da-b5f1-4495-acaf-9c2c2a35abff"
CU_CONN="3be049b1-1ae6-4fee-84a9-eb3fb3620d59"
DS_CONN="ce674da5-acf6-4ed4-858a-e72b067930c6"

echo "════════════════════════════════════════════"
echo "  Phase 4E — API-key & Credential Nodes"
echo "  Base: $BASE"
echo "════════════════════════════════════════════"
echo ""

# Preflight token check
PCODE=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$BASE/api/credential-connections/connections")
if [ "$PCODE" != "200" ]; then
  echo "❌ Token invalid (HTTP $PCODE) — refresh LIVE_TEST_BEARER_TOKEN first"
  exit 1
fi
echo "Token: valid (HTTP 200)"
echo ""

# ── 1. openai_gpt ─────────────────────────────────────────────────────────────
echo "--- 1/7: openai_gpt ---"
python3 - <<PY
import json
conn="$OAI_CONN"
wf={"name":"4e-openai-gpt","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"openai_gpt","label":"OpenAI GPT","category":"ai","config":{
    "model":"gpt-4o-mini","prompt":"Reply with exactly: tier-4e-openai-ok","connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"openai done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "openai_gpt" "/tmp/4e-wf.json"
echo "(sleeping 12s — AI rate limit)"
sleep 12

# ── 2. mistral ────────────────────────────────────────────────────────────────
echo "--- 2/7: mistral ---"
python3 - <<PY
import json
conn="$MST_CONN"
wf={"name":"4e-mistral","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"mistral","label":"Mistral","category":"ai","config":{
    "model":"mistral-small-latest","prompt":"Reply with exactly: tier-4e-mistral-ok","connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"mistral done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "mistral" "/tmp/4e-wf.json"
echo "(sleeping 12s — AI rate limit)"
sleep 12

# ── 3. cohere ─────────────────────────────────────────────────────────────────
echo "--- 3/7: cohere ---"
python3 - <<PY
import json
conn="$COH_CONN"
wf={"name":"4e-cohere","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"cohere","label":"Cohere","category":"ai","config":{
    "model":"command-r-08-2024","prompt":"Reply with exactly: tier-4e-cohere-ok","connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"cohere done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "cohere" "/tmp/4e-wf.json"
echo "(sleeping 12s — AI rate limit)"
sleep 12

# ── 4. huggingface ────────────────────────────────────────────────────────────
echo "--- 4/7: huggingface ---"
python3 - <<PY
import json
conn="$HF_CONN"
wf={"name":"4e-huggingface","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"huggingface","label":"HuggingFace","category":"ai","config":{
    "model":"facebook/bart-large-cnn",
    "prompt":"The ctrlchecks platform automates workflows between services using a visual node-based editor that connects APIs without any coding.",
    "connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"hf done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "huggingface" "/tmp/4e-wf.json"
echo "(sleeping 12s — AI rate limit)"
sleep 12

# ── 5. pipedrive ──────────────────────────────────────────────────────────────
echo "--- 5/7: pipedrive ---"
python3 - <<PY
import json
conn="$PD_CONN"
wf={"name":"4e-pipedrive","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"pipedrive","label":"Pipedrive","category":"crm","config":{
    "resource":"deal","operation":"list","limit":5,"connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"pipedrive done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "pipedrive" "/tmp/4e-wf.json"

# ── 6. clickup ────────────────────────────────────────────────────────────────
echo "--- 6/7: clickup ---"
python3 - <<PY
import json
conn="$CU_CONN"
wf={"name":"4e-clickup","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"clickup","label":"ClickUp","category":"productivity","config":{
    "operation":"get_teams","connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"clickup done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "clickup" "/tmp/4e-wf.json"

# ── 7. discord_webhook ────────────────────────────────────────────────────────
echo "--- 7/7: discord_webhook ---"
python3 - <<PY
import json
conn="$DS_CONN"
wf={"name":"4e-discord-webhook","nodes":[
  {"id":"n1","type":"custom","position":{"x":0,"y":0},"data":{"type":"manual_trigger","label":"Start","category":"triggers","config":{}}},
  {"id":"n2","type":"custom","position":{"x":300,"y":0},"data":{"type":"discord_webhook","label":"Discord","category":"communication","config":{
    "message":"ctrlchecks Tier-4E live test — discord_webhook OK","connectionId":conn
  }}},
  {"id":"n3","type":"custom","position":{"x":600,"y":0},"data":{"type":"log_output","label":"Log","category":"output","config":{"level":"info","message":"discord done"}}}
],"edges":[{"id":"e1","source":"n1","target":"n2"},{"id":"e2","source":"n2","target":"n3"}]}
with open("/tmp/4e-wf.json","w") as f: json.dump(wf,f)
PY
run_test "discord_webhook" "/tmp/4e-wf.json"

# ── Intentional skips ─────────────────────────────────────────────────────────
skip "airtable — active connection but requires baseId fixture (no base configured)"
skip "google_gemini — tested in Tier 4C (PASS, execId f71b7707)"
skip "gitlab — active OAuth connection; no canonical gitlab workflow node in registry"

echo ""
echo "════════════════════════════════════════════"
echo "  Tier 4E: ${PASS} PASS / ${FAIL} FAIL / ${SKIP} SKIPPED"
echo "════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ TIER 4E GATE: PASS — ${PASS} pass, ${SKIP} intentional skips"
else
  echo "❌ TIER 4E GATE: FAIL — ${FAIL} failure(s)"
fi
