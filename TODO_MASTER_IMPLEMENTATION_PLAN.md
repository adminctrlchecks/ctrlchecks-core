# MASTER IMPLEMENTATION PLAN — CtrlChecks AI Workflow Platform
# Complete End-to-End TODO: Node Verification + Trigger Nodes + Agent Implementation
# Total Tasks: 500+ | Backend + Frontend + Registry + Execution + Agent + Testing
# Purpose: Engineering Team Estimation & Sprint Planning
# NO CODE CHANGES — This is a planning document only
# Last Audit: April 2026 — Verified against actual codebase + n8n 2026 architecture

---

## LEGEND
- [ ] = Not started
- [x] = Done / already exists in codebase
- [!] = CORRECTION NEEDED — contradicts architecture or n8n model
- [h] = Estimated hours
- CRITICAL = Blocks other work
- AGENT = Agent-specific task
- TRIGGER = Trigger node task
- VERIFY = Verification/audit task
- ARCH-VIOLATION = Active code violation of workspace rules

---

## AUDIT SUMMARY (April 2026)
> This section captures findings from the cross-audit of the plan vs actual codebase
> and n8n 2026 architecture. Every discrepancy is flagged inline with [!] below.

### Critical Gaps Found
1. `TriggerPollingService`, `TriggerWebhookRegistry`, `TriggerExecutionBridge` — DO NOT EXIST anywhere in codebase. All Section 2.1 tasks are fully open.
2. `trigger_state` and `active_triggers` tables — NOT in any SQL migration. Must be created.
3. `agent_edges` column task in Section 14.2 — CONTRADICTS Section 3.2 and n8n model. REMOVED from plan.
4. `parentAgentNodeId` field in sub-node schemas — NOT in n8n model. Relationship must be derived from edges. REMOVED from plan.
5. `ai_languageModel`, `ai_memory`, `ai_tool` typed edge ports — NOT implemented anywhere. Only exist as intentCategory strings in node-library.ts metadata.
6. `agents` category — NOT in `UnifiedNodeDefinition` category union type. Must be added.
7. `isTrigger: boolean` field — NOT on `UnifiedNodeDefinition` interface (only a registry method). Must be added to the type contract.
8. `isAgentSubNode` flag — NOT in n8n model. Port type on the edge is sufficient. Kept as optional metadata only.

### Active Architecture Violations (ARCH-VIOLATION)
- `workflow-graph-sanitizer.ts` line ~819: `workflow.edges.push(...)` — bypasses unified orchestrator
- `workflow-policy-enforcer-v2.ts` lines ~134, ~253: `workflow.edges.push(...)` — bypasses unified orchestrator
- `workflow-policy-enforcer-v2.ts` line ~163: `workflow.edges = workflow.edges.filter(...)` — direct mutation
- `workflow-builder.ts`: `if (node.type === 'chat_model')`, `if (targetNode.type === 'ai_agent')` — hardcoded type checks violating registry-driven rule

### Already Implemented (no work needed)
- `agent_executions` table — EXISTS in `02_agent_memory_tables.sql` with RLS + indexes
- `agent_sessions` (as `memory_sessions`) — EXISTS in `02_agent_memory_tables.sql`
- `workflows` table with `nodes` + `edges` JSONB — EXISTS in `01_database_setup.sql`
- `unified-graph-orchestrator.ts` with `initializeWorkflow`, `injectNode`, `removeNode`, `reconcileWorkflow`, `validateWorkflow` — EXISTS and correct
- `edge-reconciliation-engine.ts` — EXISTS with full reconciliation logic
- `execution-order-manager.ts` — EXISTS
- `isTrigger()` method on registry — EXISTS (but not as a field on the type contract)
- `alwaysTerminal` via `workflowBehavior` — EXISTS on `UnifiedNodeDefinition`
- `isBranching` field — EXISTS on `UnifiedNodeDefinition`

---

## TOTAL ESTIMATED TIME SUMMARY

- **Core platform (Sections 0–14)** — registry fixes, arch violations, triggers, agent core, execution engine, node executors, frontend, credentials, API, DB, tests.
- **Extended platform (Sections 15–32)** — new integrations, performance, observability, chatbot/forms/webhooks/schedule, security, multi-tenant, templates, versioning, missing pages.

Authoritative estimates are in the **UPDATED GRAND TOTAL ESTIMATE** table at the end.

---

## SECTION 0 — n8n / Agentic Workflow Reference (READ-ONLY)

### 0.1 Core n8n concepts we mirror
- **Node categories**: Triggers (Chat/Webhook/Schedule/Interval), Actions (HTTP/DB/Integrations), Logic (If/Switch/Loop/Merge), AI stack nodes (Model, Memory, Tool, Vector Store).
- **AI Agent node**: A dedicated `AI Agent` node (AgentV3) built on LangChain. Part of the **same DAG**, exposes extra typed inputs: `ai_languageModel`, `ai_memory`, `ai_tool`, `ai_outputParser` in addition to the main data input.
- **Agent wiring**: LLM, memory, and tools are connected to the Agent node via **normal edges on special ports**. The orchestrator owns all edges and validates the full DAG.
- **Agent loop**: ReAct-style — observe input → think (LLM) → optionally call a tool → observe result → repeat until final answer / max iterations.
- **Memory types**: window/buffer, summary, Redis/Postgres/Mongo/Zep-backed — all plug into agent via `ai_memory` port using a session ID.
- **Tools**: Any node can act as a tool by exposing its input schema as a JSON-schema function to the Agent node.
- **AI Workflow Builder**: Separate generation pipeline (LangGraph-based) that always persists results as a normal validated DAG.

### 0.2 Where this plan intentionally goes beyond n8n
- **Single orchestrator & registry**: `unified-node-registry` + `unified-graph-orchestrator` are the single source of truth for node behavior, schemas, and edges.
- **Deterministic DAG compiler**: Strictly validated DAGs — no orphan nodes, no hidden edges, no cycles. Agent wiring must also respect this model.
- **Universal template + schema-based execution**: All nodes resolve templates via universal resolver and execute via dynamic executor that always consults the registry.
- **First-class observability & multi-tenant isolation**: Execution logging, health dashboards, RLS policies, per-tenant limits.

### 0.3 Key Architecture Rules (from workspace rules — enforced throughout this plan)
- ALL edge creation/removal MUST go through `unified-graph-orchestrator.ts` — never `workflow.edges.push()` directly.
- ALL node behavior MUST originate from `unified-node-registry.ts` — no hardcoded `if (node.type === ...)` in feature code.
- Agent sub-node connections are stored in the main `edges[]` array with typed `targetHandle` values (`ai_languageModel`, `ai_memory`, `ai_tool`) — NOT in a separate `agent_edges` column.
- The relationship between an agent node and its sub-nodes is derived from edges, not stored in node config.

---

## SECTION 1 — REGISTRY & NODE LIBRARY VERIFICATION [VERIFY]
### Estimated: 8-10 days | Owner: Backend Team
### Audit Status: Partially implemented — several gaps found

### 1.1 Core Registry Integrity Audit
- [ ] Audit unified-node-registry.ts: every node has inputSchema, outputSchema, credentialSchema, defaultConfig, execute() [2h]
- [ ] Audit node-library.ts: every createXxxSchema() has complete configSchema.required + configSchema.optional [4h]
- [ ] Cross-check ALIAS_MAP in unified-node-registry.ts — every alias must point to a registered canonical type [2h]
- [ ] Cross-check nodeTypes.ts (frontend) vs node-library.ts (backend) — every frontend node must exist in backend [3h]
- [ ] Verify CANONICAL_NODE_TYPES list matches all registered schemas exactly [1h]
- [ ] Verify no duplicate node type registrations in initializeFromNodeLibrary() [1h]
- [ ] Verify isBranching=true on if_else and switch nodes only [1h]
- [ ] Verify workflowBehavior.alwaysTerminal=true on log_output node only [1h]
- [ ] Verify workflowBehavior.alwaysRequired=true on log_output node [1h]
- [ ] Verify outgoingPorts: if_else=[true,false], switch=[case_1..N], all others=[output] [2h]
- [ ] Verify incomingPorts: triggers=[], merge=[input,input2], all others=[input] [2h]
- [ ] Verify all defaultConfig() factories return no undefined fields [2h]
- [ ] Verify all validateConfig() functions catch missing required fields [2h]
- [ ] Verify every execute() delegates to legacy executor or has direct implementation [3h]
- [ ] Verify validateIntegrity() passes at startup with zero missing types [1h]

### 1.2 Trigger Node Registry Entries (CRITICAL)
> NOTE: isTrigger() method exists on the registry class but isTrigger field does NOT exist on UnifiedNodeDefinition interface. Both are needed.
- [ ] Add `isTrigger: boolean` field to UnifiedNodeDefinition interface in unified-node-contract.ts [1h]
  - File: worker/src/core/types/unified-node-contract.ts
  - Add to the CORE IDENTITY section of the interface
  - The registry's existing isTrigger() method can then read this field directly
- [ ] Add `pollingInterval?: number` field to UnifiedNodeDefinition (seconds between polls, trigger nodes only) [1h]
  - File: worker/src/core/types/unified-node-contract.ts
- [ ] Add `webhookSupported?: boolean` field to UnifiedNodeDefinition (trigger nodes only) [1h]
  - File: worker/src/core/types/unified-node-contract.ts
- [ ] Set isTrigger=true on all trigger node definitions in unified-node-registry-overrides.ts [2h]
- [ ] Verify manual_trigger schema: category=trigger, incomingPorts=[], outgoingPorts=[output], isTrigger=true [1h]
- [ ] Verify webhook schema: category=trigger, has path + httpMethod fields, isTrigger=true, webhookSupported=true [1h]
- [ ] Verify schedule schema: category=trigger, has cron + timezone fields, isTrigger=true [1h]
- [ ] Verify interval schema: category=trigger, has interval + unit fields, isTrigger=true [1h]
- [ ] Verify form schema: category=trigger, has formTitle + fields array, isTrigger=true, webhookSupported=true [1h]
- [ ] Verify chat_trigger schema: category=trigger, has sessionId + message fields, isTrigger=true [1h]
- [ ] Verify error_trigger schema: category=trigger, has errorMessage + workflowId fields, isTrigger=true [1h]
- [ ] Verify workflow_trigger schema: category=trigger, has sourceWorkflowId field, isTrigger=true [1h]

### 1.3 AI/Agent Node Registry Entries (CRITICAL — AGENT)
> CORRECTIONS from audit:
> - parentAgentNodeId REMOVED — relationship must be derived from edges, not stored in node config (contradicts n8n model)
> - isAgentSubNode kept as optional metadata only — the edge's targetHandle is the authoritative signal
> - agents category must be added to the UnifiedNodeDefinition category union type first
- [ ] Add `'agents'` to the category union type in UnifiedNodeDefinition interface [1h]
  - File: worker/src/core/types/unified-node-contract.ts
  - Change: `category: 'trigger' | 'data' | 'ai' | 'communication' | 'logic' | 'transformation' | 'utility'`
  - To: `category: 'trigger' | 'data' | 'ai' | 'agents' | 'communication' | 'logic' | 'transformation' | 'utility'`
- [ ] Rewrite ai_agent schema in node-library.ts: add systemPrompt, maxIterations, agentType, returnIntermediateSteps, passthroughBinaryImages fields [3h]
- [ ] Add agentType field to ai_agent schema: options=[tools_agent, react_agent, plan_execute_agent] [1h]
- [ ] Add `isAgentSubNode?: boolean` as optional metadata field to UnifiedNodeDefinition (NOT used for execution routing — edge targetHandle is authoritative) [1h]
  - File: worker/src/core/types/unified-node-contract.ts
  - Add to METADATA section with clear comment that edge port type is the authoritative signal
- [ ] Rewrite chat_model schema: provider, model, apiKey, temperature, maxTokens, topP, frequencyPenalty, streaming [3h]
- [ ] Rewrite memory schema: memoryType=[window_buffer, summary, vector_store, redis], sessionId, windowSize, returnMessages [3h]
- [ ] Rewrite tool schema: toolType, toolNodeId, toolName, toolDescription, toolParameters as JSON schema [3h]
- [ ] Register ai_agent with category=agents in registry, set isAgentSubNode=false [1h]
- [ ] Register chat_model with category=agents, isAgentSubNode=true [1h]
- [ ] Register memory with category=agents, isAgentSubNode=true [1h]
- [ ] Register tool with category=agents, isAgentSubNode=true [1h]
- [ ] Add `getAgentSubNodes(agentNodeId, workflow)` helper to unified-graph-orchestrator.ts — derives sub-node connections from edges where targetHandle starts with 'ai_' [2h]
  - File: worker/src/core/orchestration/unified-graph-orchestrator.ts
  - Implementation: filter workflow.edges where target === agentNodeId AND targetHandle matches /^ai_/
  - Returns: array of { subNodeId, portType } — no parentAgentNodeId stored anywhere

### 1.4 Action Node Operations Verification
- [ ] google_gmail: verify operations=[send, reply, forward, read, search, delete, label, create_draft, get_attachment] [2h]
- [ ] google_sheets: verify operations=[read_rows, write_rows, append_row, update_row, delete_row, create_sheet, clear_range, get_sheet_info] [2h]
- [ ] google_drive: verify operations=[upload, download, list, create_folder, move, copy, delete, share, get_info] [2h]
- [ ] google_calendar: verify operations=[create_event, update_event, delete_event, get_event, list_events, check_availability] [2h]
- [ ] google_doc: verify operations=[create, read, append, replace_text, get_info] [1h]
- [ ] slack_message: verify operations=[send_message, update_message, delete_message, add_reaction, upload_file, list_channels, get_user, invite_user] [2h]
- [ ] notion: verify operations=[create_page, update_page, get_page, delete_page, query_database, create_database_item, update_database_item, get_database] [2h]
- [ ] airtable: verify operations=[list_records, get_record, create_record, update_record, delete_record, search_records] [2h]
- [ ] hubspot: verify operations=[create_contact, update_contact, get_contact, delete_contact, create_deal, update_deal, get_deal, create_company, add_note] [2h]
- [ ] salesforce: verify operations=[create_record, update_record, get_record, delete_record, query, upsert, describe_object] [2h]
- [ ] github: verify operations=[create_issue, update_issue, get_issue, list_issues, create_pr, merge_pr, get_repo, list_commits, create_release] [2h]
- [ ] jira: verify operations=[create_issue, update_issue, get_issue, transition_issue, add_comment, search_issues, get_project] [2h]
- [ ] mongodb: verify operations=[find, find_one, insert_one, insert_many, update_one, update_many, delete_one, delete_many, aggregate, count] [2h]
- [ ] postgresql: verify operations=[select, insert, update, delete, execute_query, create_table, describe_table] [2h]
- [ ] mysql: verify operations=[select, insert, update, delete, execute_query] [2h]
- [ ] redis: verify operations=[get, set, delete, exists, expire, lpush, rpush, lrange, hget, hset, publish, subscribe] [2h]
- [ ] http_request: verify methods=[GET,POST,PUT,PATCH,DELETE], auth=[none,basic,bearer,api_key,oauth2], response=[json,text,binary] [2h]
- [ ] stripe: verify operations=[create_payment_intent, confirm_payment, create_customer, list_payments, create_refund, create_subscription] [2h]
- [ ] shopify: verify operations=[get_order, list_orders, update_order, create_product, update_product, get_customer, create_customer] [2h]
- [ ] telegram: verify operations=[send_message, send_photo, send_document, send_location, edit_message, delete_message, get_chat] [2h]
- [ ] discord: verify operations=[send_message, edit_message, delete_message, create_channel, add_role, kick_member] [2h]
- [ ] twilio: verify operations=[send_sms, make_call, send_whatsapp, list_messages] [2h]
- [ ] microsoft_teams: verify operations=[send_message, create_channel, list_channels, add_member] [2h]
- [ ] linkedin: verify operations=[create_post, get_profile, send_message, get_connections] [2h]
- [ ] twitter: verify operations=[post_tweet, reply_tweet, retweet, like_tweet, get_user, search_tweets, delete_tweet] [2h]
- [ ] instagram: verify operations=[get_media, get_profile, create_media_container, publish_media, get_insights] [2h]
- [ ] facebook: verify operations=[create_post, get_page_info, get_insights, send_message, create_ad] [2h]
- [ ] pipedrive: verify operations=[create_deal, update_deal, get_deal, create_contact, update_contact, create_activity] [2h]
- [ ] zoho_crm: verify operations=[create_lead, update_lead, get_lead, create_contact, create_deal, search_records] [2h]
- [ ] clickup: verify operations=[create_task, update_task, get_task, list_tasks, create_list, add_comment, set_status] [2h]
- [ ] aws_s3: verify operations=[upload, download, list, delete, create_bucket, get_presigned_url, copy] [2h]
- [ ] dropbox: verify operations=[upload, download, list, delete, create_folder, move, copy, share] [2h]
- [ ] onedrive: verify operations=[upload, download, list, delete, create_folder, move, share] [2h]
- [ ] freshdesk: verify operations=[create_ticket, update_ticket, get_ticket, list_tickets, add_reply, close_ticket] [2h]
- [ ] intercom: verify operations=[create_conversation, reply_conversation, get_user, create_user, add_tag, send_message] [2h]
- [ ] mailchimp: verify operations=[add_subscriber, update_subscriber, remove_subscriber, create_campaign, send_campaign] [2h]
- [ ] activecampaign: verify operations=[create_contact, update_contact, add_tag, remove_tag, create_deal, send_email] [2h]
- [ ] javascript: verify has code field, $json access, $input access, async support, npm module access [2h]
- [ ] if_else: verify condition types=[equals, not_equals, contains, not_contains, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty, regex_match] [2h]
- [ ] switch: verify N cases, each case has value+label, default case support [1h]
- [ ] loop: verify inputArray field, batchSize, outputs each item individually [1h]
- [ ] merge: verify modes=[append, merge_by_key, keep_key_matches, multiplex] [1h]
- [ ] filter: verify condition builder same as if_else, keeps matching items [1h]
- [ ] aggregate: verify operations=[sum, count, average, min, max, group_by, collect_all] [1h]
- [ ] set_variable: verify supports multiple key-value pairs, expression syntax [1h]
- [ ] wait: verify duration + unit fields, supports seconds/minutes/hours [1h]
- [ ] sort: verify field + direction=[asc,desc], supports nested field paths [1h]
- [ ] limit: verify maxItems field [1h]
- [ ] split_in_batches: verify batchSize field, outputs batches [1h]
- [ ] json_parser: verify parses string to JSON object [1h]
- [ ] csv: verify parses CSV string to array of objects [1h]
- [ ] log_output: verify alwaysTerminal=true, alwaysRequired=true, logs to execution console [1h]
- [ ] respond_to_webhook: verify returns HTTP response to webhook caller [1h]
- [ ] graphql: verify has endpoint, query, variables, headers fields [1h]

---

## SECTION 1A — ARCHITECTURE VIOLATION FIXES [ARCH-VIOLATION] [CRITICAL]
### Estimated: 2-3 days | Owner: Backend Team
### Must be done BEFORE any new feature work — these are active bugs in the codebase

### 1A.1 Fix workflow-graph-sanitizer.ts (ARCH-VIOLATION)
> File: worker/src/services/ai/workflow-graph-sanitizer.ts
> Problem: Uses workflow.edges.push() directly, bypassing unified-graph-orchestrator
> Rule violated: "Never modify workflow.edges directly in feature code" (workspace rule)
- [ ] Remove all `workflow.edges.push(...)` calls from workflow-graph-sanitizer.ts [2h]
  - Line ~819: trigger-to-first-node edge creation
  - Replace with: call `unifiedGraphOrchestrator.reconcileWorkflow(workflow)` after node changes
  - The orchestrator's edge reconciliation engine will create the correct edges automatically
- [ ] Remove all `workflow.edges = workflow.edges.filter(...)` patterns from sanitizer [1h]
  - Replace with: call `unifiedGraphOrchestrator.removeEdges(workflow, edgeIds)` for targeted removal
- [ ] After refactor: verify sanitizer still produces correct topology by running existing tests [1h]

### 1A.2 Fix workflow-policy-enforcer-v2.ts (ARCH-VIOLATION)
> File: worker/src/services/ai/workflow-policy-enforcer-v2.ts
> Problem: Uses workflow.edges.push() and workflow.edges = [...].filter() directly
> Rule violated: "Never modify workflow.edges directly in feature code" (workspace rule)
- [ ] Remove `workflow.edges.push(newEdge)` in enforceTriggerPolicy() (~line 134) [1h]
  - Replace with: `unifiedGraphOrchestrator.reconcileWorkflow(workflow)` — orchestrator will wire trigger to first node
- [ ] Remove `workflow.edges.push(newEdge)` in enforceConnectionPolicy() (~line 253) [1h]
  - Replace with: `unifiedGraphOrchestrator.injectNode()` for orphaned node reconnection, then reconcile
- [ ] Remove `workflow.edges = workflow.edges.filter(...)` in enforceNoSelfLoops() (~line 163) [1h]
  - Replace with: collect self-loop edge IDs, call `unifiedGraphOrchestrator.removeEdges(workflow, ids)`
- [ ] Remove hardcoded trigger type string arrays in policy enforcer [1h]
  - Replace: `['manual_trigger', 'schedule', 'webhook', 'form', 'chat_trigger'].includes(type)`
  - With: `unifiedNodeRegistry.isTrigger(type)` — registry is the single source of truth
- [ ] After refactor: verify all 5 policies still enforce correctly [1h]

### 1A.3 Fix workflow-builder.ts hardcoded type checks (ARCH-VIOLATION)
> File: worker/src/services/ai/workflow-builder.ts
> Problem: Contains if (node.type === 'chat_model'), if (targetNode.type === 'ai_agent') etc.
> Rule violated: "Never add node-specific logic with if (node.type === ...)" (workspace rule)
- [ ] Find all `node.type === '...'` and `node.data?.type === '...'` string comparisons in workflow-builder.ts [2h]
  - Use: `grep -n "node\.type\s*===\s*['\"]" worker/src/services/ai/workflow-builder.ts`
- [ ] Replace chat_model/ai_agent hardcoded checks with registry category/tag lookups [3h]
  - Replace: `if (targetNode.type === 'ai_agent')` 
  - With: `if (unifiedNodeRegistry.getCategory(targetNodeType) === 'agents' && !unifiedNodeRegistry.get(targetNodeType)?.isAgentSubNode)`
  - Replace: `if (node.type === 'chat_model')`
  - With: `if (unifiedNodeRegistry.get(nodeType)?.isAgentSubNode === true)`
- [ ] Replace hardcoded `edgeType = 'ai-input'` with proper typed port names [2h]
  - Agent sub-node edges must use targetHandle values: `ai_languageModel`, `ai_memory`, `ai_tool`, `ai_outputParser`
  - These must go through `unifiedGraphOrchestrator.injectNode()` with correct port context

---

## SECTION 2 — TRIGGER NODES IMPLEMENTATION [TRIGGER]
### Estimated: 15-18 days | Owner: Backend + Frontend Team
### Audit Status: Section 2.1 infrastructure is ENTIRELY MISSING from codebase

### 2.1 Trigger Infrastructure (CRITICAL — do before any trigger node)
> AUDIT: TriggerPollingService, TriggerWebhookRegistry, TriggerExecutionBridge — NONE exist.
> trigger_state and active_triggers tables — NOT in any SQL migration.
> All tasks below are fully open.
- [ ] Create worker/src/services/triggers/trigger-polling-service.ts [4h]
  - Polls all active trigger nodes at their configured pollingInterval
  - On startup: loads all active_triggers from Supabase, starts polling loops
  - Uses trigger_state table to track last_checked_at and cursor per trigger
  - Integrates with existing worker/src/services/scheduler/index.ts
- [ ] Create worker/src/services/triggers/trigger-webhook-registry.ts [3h]
  - Maps incoming webhook URLs to workflow_id + trigger node_id
  - Registers/deregisters webhooks when triggers are activated/deactivated
  - Provides lookup: webhookId → { workflowId, nodeId, config }
- [ ] Create worker/src/services/triggers/trigger-execution-bridge.ts [3h]
  - When a trigger fires (polling or webhook), calls workflow execution
  - Passes trigger output as the initial input to the first downstream node
  - Uses existing execution pipeline (unified-execution-engine.ts)
- [ ] Create SQL migration: trigger_state table [2h]
  - File: ctrl_checks/sql_migrations/29_trigger_infrastructure.sql
  - Columns: id, workflow_id, node_id, trigger_type, last_checked_at, last_item_id, cursor, is_active, created_at, updated_at
  - Indexes: (workflow_id, node_id), (is_active)
  - RLS: users can only access their own trigger states
- [ ] Create SQL migration: active_triggers table [2h]
  - Same file as above
  - Columns: id, workflow_id, node_id, trigger_type, config_json, is_active, created_at, updated_at
  - Indexes: (workflow_id), (is_active, trigger_type)
  - RLS: users can only access their own active triggers
- [ ] Add deduplication logic in trigger-polling-service.ts [2h]
  - Never fire same item twice: compare new items against last_item_id/cursor in trigger_state
  - Update trigger_state after each successful poll
- [ ] Add trigger activation API: POST /api/triggers/activate [2h]
  - File: worker/src/api/trigger-activate.ts
  - Inserts row into active_triggers, starts polling or registers webhook
- [ ] Add trigger deactivation API: POST /api/triggers/deactivate [2h]
  - File: worker/src/api/trigger-deactivate.ts
  - Sets is_active=false in active_triggers, stops polling or removes webhook
- [ ] Add trigger test API: POST /api/triggers/test [2h]
  - File: worker/src/api/trigger-test.ts
  - Fires trigger once manually, returns sample output without persisting state
- [ ] Add trigger status API: GET /api/triggers/status/:workflowId [1h]
  - Returns all trigger states for a workflow (last_checked_at, cursor, is_active, error)
- [ ] Add webhook route handler: POST /api/trigger-webhook/:triggerId [2h]
  - File: worker/src/api/trigger-webhook.ts
  - Looks up trigger in TriggerWebhookRegistry, calls TriggerExecutionBridge
- [ ] Add trigger node category enforcement in execution engine [2h]
  - Trigger nodes are entry points — they must have incomingPorts=[] and cannot appear mid-chain
  - unified-graph-orchestrator.ts validateWorkflow() must reject workflows with trigger nodes that have incoming edges

### 2.2 Gmail Trigger
- [ ] Create google_gmail_trigger schema in node-library.ts: events=[new_email, new_email_matching_filter, new_labeled_email, new_attachment] [2h]
- [ ] Add google_gmail_trigger to unified-node-registry.ts with full inputSchema + outputSchema, isTrigger=true, pollingInterval=60 [2h]
- [ ] Implement gmail trigger executor in trigger-polling-service.ts: poll Gmail API messages.list with q filter + after:timestamp [3h]
- [ ] Add Gmail trigger output schema: id, threadId, from, to, subject, body, snippet, date, labels, attachments [1h]
- [ ] Add google_gmail_trigger to nodeTypes.ts frontend with Mail icon, triggers category [1h]
- [ ] Add google_gmail_trigger to NodeLibrary.tsx category display [1h]

### 2.3 Google Sheets Trigger
- [ ] Create google_sheets_trigger schema: events=[new_row, row_updated, new_spreadsheet], isTrigger=true, pollingInterval=60 [2h]
- [ ] Add google_sheets_trigger to unified-node-registry.ts [2h]
- [ ] Implement Sheets trigger executor: poll spreadsheet, compare row count to last_item_id [3h]
- [ ] Add Sheets trigger output schema: row data as object with column headers as keys, rowNumber, spreadsheetId [1h]
- [ ] Add google_sheets_trigger to nodeTypes.ts frontend [1h]

### 2.4 Slack Trigger
- [ ] Create slack_trigger schema: events=[new_message, new_channel_message, new_mention, new_reaction, new_member_joined], isTrigger=true, webhookSupported=true [2h]
- [ ] Add slack_trigger to unified-node-registry.ts [2h]
- [ ] Implement Slack trigger via Slack Events API — register webhook URL with Slack app [3h]
- [ ] Handle Slack URL verification challenge in webhook handler [1h]
- [ ] Add Slack trigger output schema: channel, user, text, timestamp, thread_ts, event_type [1h]
- [ ] Add slack_trigger to nodeTypes.ts frontend [1h]

### 2.5 GitHub Trigger
- [ ] Create github_trigger schema: events=[push, pull_request_opened, pull_request_merged, issue_opened, issue_closed, star, fork, release_published], isTrigger=true, webhookSupported=true [2h]
- [ ] Add github_trigger to unified-node-registry.ts [2h]
- [ ] Implement GitHub trigger via GitHub Webhooks API — register webhook on repo/org [3h]
- [ ] Verify GitHub webhook signature (X-Hub-Signature-256) in trigger-webhook.ts handler [2h]
- [ ] Add GitHub trigger output schema: event_type + full GitHub event payload [1h]
- [ ] Add github_trigger to nodeTypes.ts frontend [1h]

### 2.6 Notion Trigger
- [ ] Create notion_trigger schema: events=[new_page, updated_page, new_database_item, updated_database_item], isTrigger=true, pollingInterval=60 [2h]
- [ ] Add notion_trigger to unified-node-registry.ts [2h]
- [ ] Implement Notion trigger via polling: query database sorted by last_edited_time, compare to cursor [3h]
- [ ] Add Notion trigger output schema: page_id, title, properties, last_edited_time, created_time [1h]
- [ ] Add notion_trigger to nodeTypes.ts frontend [1h]

### 2.7 Airtable Trigger
- [ ] Create airtable_trigger schema: events=[new_record, updated_record], isTrigger=true, pollingInterval=60 [2h]
- [ ] Add airtable_trigger to unified-node-registry.ts [2h]
- [ ] Implement Airtable trigger via polling: list records sorted by createdTime, compare to cursor [3h]
- [ ] Add Airtable trigger output schema: record_id, fields object, createdTime [1h]
- [ ] Add airtable_trigger to nodeTypes.ts frontend [1h]

### 2.8 HubSpot Trigger
- [ ] Create hubspot_trigger schema: events=[new_contact, new_deal, deal_stage_changed, new_company, contact_property_changed], isTrigger=true, webhookSupported=true [2h]
- [ ] Add hubspot_trigger to unified-node-registry.ts [2h]
- [ ] Implement HubSpot trigger via HubSpot Webhooks API subscription [3h]
- [ ] Add HubSpot trigger output schema: objectId, objectType, propertyName, propertyValue, changeSource [1h]
- [ ] Add hubspot_trigger to nodeTypes.ts frontend [1h]

### 2.9 Stripe Trigger
- [ ] Create stripe_trigger schema: events=[payment_intent.succeeded, payment_intent.failed, customer.created, subscription.created, charge.refunded, invoice.paid], isTrigger=true, webhookSupported=true [2h]
- [ ] Add stripe_trigger to unified-node-registry.ts [2h]
- [ ] Implement Stripe trigger via Stripe Webhooks — register endpoint in Stripe dashboard [3h]
- [ ] Verify Stripe webhook signature (Stripe-Signature header) in trigger-webhook.ts handler [2h]
- [ ] Add Stripe trigger output schema: event_type, object_type, object_id, full Stripe event data [1h]
- [ ] Add stripe_trigger to nodeTypes.ts frontend [1h]

### 2.10 Shopify Trigger
- [ ] Create shopify_trigger schema: events=[orders/create, orders/updated, orders/fulfilled, customers/create, products/create], isTrigger=true, webhookSupported=true [2h]
- [ ] Add shopify_trigger to unified-node-registry.ts [2h]
- [ ] Implement Shopify trigger via Shopify Webhooks API [3h]
- [ ] Verify Shopify webhook HMAC signature in trigger-webhook.ts handler [2h]
- [ ] Add Shopify trigger output schema: topic + full Shopify resource payload [1h]
- [ ] Add shopify_trigger to nodeTypes.ts frontend [1h]

### 2.11 Telegram Trigger
- [ ] Create telegram_trigger schema: events=[new_message, new_command, new_callback_query, new_inline_query, new_channel_post], isTrigger=true, webhookSupported=true [2h]
- [ ] Add telegram_trigger to unified-node-registry.ts [2h]
- [ ] Implement Telegram trigger via setWebhook API or long polling [3h]
- [ ] Add Telegram trigger output schema: message_id, chat_id, from, text, date, command [1h]
- [ ] Add telegram_trigger to nodeTypes.ts frontend [1h]

### 2.12 Discord Trigger
- [ ] Create discord_trigger schema: events=[new_message, new_guild_member, member_removed, reaction_added, channel_created], isTrigger=true, webhookSupported=true [2h]
- [ ] Add discord_trigger to unified-node-registry.ts [2h]
- [ ] Implement Discord trigger via Discord Gateway WebSocket or Interactions Endpoint [3h]
- [ ] Add Discord trigger output schema: guild_id, channel_id, author, content, timestamp [1h]
- [ ] Add discord_trigger to nodeTypes.ts frontend [1h]

### 2.13 Jira Trigger
- [ ] Create jira_trigger schema: events=[issue_created, issue_updated, issue_deleted, comment_created, sprint_started, sprint_completed], isTrigger=true, webhookSupported=true [2h]
- [ ] Add jira_trigger to unified-node-registry.ts [2h]
- [ ] Implement Jira trigger via Jira Webhooks (System Webhooks or App Webhooks) [3h]
- [ ] Add Jira trigger output schema: issue_key, issue_type, status, assignee, summary, project [1h]
- [ ] Add jira_trigger to nodeTypes.ts frontend [1h]

### 2.14 Salesforce Trigger
- [ ] Create salesforce_trigger schema: events=[new_lead, new_opportunity, record_updated, new_contact, opportunity_closed_won], isTrigger=true [2h]
- [ ] Add salesforce_trigger to unified-node-registry.ts [2h]
- [ ] Implement Salesforce trigger via Salesforce Streaming API (PushTopic) or polling [3h]
- [ ] Add Salesforce trigger output schema: object_type, record_id, fields changed, timestamp [1h]
- [ ] Add salesforce_trigger to nodeTypes.ts frontend [1h]

### 2.15 Pipedrive Trigger
- [ ] Create pipedrive_trigger schema: events=[deal_added, deal_updated, deal_won, deal_lost, contact_added, activity_added], isTrigger=true, webhookSupported=true [2h]
- [ ] Add pipedrive_trigger to unified-node-registry.ts [2h]
- [ ] Implement Pipedrive trigger via Pipedrive Webhooks [3h]
- [ ] Add Pipedrive trigger output schema: event_type, object_type, object_id, current + previous data [1h]
- [ ] Add pipedrive_trigger to nodeTypes.ts frontend [1h]

### 2.16 Typeform Trigger
- [ ] Create typeform_trigger schema: events=[new_response] with form_id field, isTrigger=true, webhookSupported=true [1h]
- [ ] Add typeform_trigger to unified-node-registry.ts [1h]
- [ ] Implement Typeform trigger via Typeform Webhooks [2h]
- [ ] Add Typeform trigger output schema: response_id, answers array, submitted_at, form_id [1h]
- [ ] Add typeform_trigger to nodeTypes.ts frontend [1h]

### 2.17 Calendly Trigger
- [ ] Create calendly_trigger schema: events=[invitee.created, invitee.canceled], isTrigger=true, webhookSupported=true [1h]
- [ ] Add calendly_trigger to unified-node-registry.ts [1h]
- [ ] Implement Calendly trigger via Calendly Webhooks v2 [2h]
- [ ] Add Calendly trigger output schema: event_type, invitee_name, invitee_email, event_start_time, event_end_time [1h]
- [ ] Add calendly_trigger to nodeTypes.ts frontend [1h]

### 2.18 ClickUp Trigger
- [ ] Create clickup_trigger schema: events=[taskCreated, taskUpdated, taskDeleted, taskStatusUpdated, commentPosted], isTrigger=true, webhookSupported=true [2h]
- [ ] Add clickup_trigger to unified-node-registry.ts [2h]
- [ ] Implement ClickUp trigger via ClickUp Webhooks [3h]
- [ ] Add ClickUp trigger output schema: event, task_id, task_name, status, assignees, list_id [1h]
- [ ] Add clickup_trigger to nodeTypes.ts frontend [1h]

### 2.19 Twitter/X Trigger
- [ ] Create twitter_trigger schema: events=[new_tweet, new_mention, new_follower, new_dm, new_like], isTrigger=true [2h]
- [ ] Add twitter_trigger to unified-node-registry.ts [2h]
- [ ] Implement Twitter trigger via Twitter Filtered Stream API v2 [3h]
- [ ] Add Twitter trigger output schema: tweet_id, text, author_id, created_at, entities [1h]
- [ ] Add twitter_trigger to nodeTypes.ts frontend [1h]

### 2.20 LinkedIn Trigger
- [ ] Create linkedin_trigger schema: events=[new_connection, new_message, new_comment_on_post], isTrigger=true, pollingInterval=300 [2h]
- [ ] Add linkedin_trigger to unified-node-registry.ts [2h]
- [ ] Implement LinkedIn trigger via polling (LinkedIn has no public webhooks for most events) [3h]
- [ ] Add LinkedIn trigger output schema: connection_id, name, headline, message_text [1h]
- [ ] Add linkedin_trigger to nodeTypes.ts frontend [1h]

### 2.21 Supabase Trigger
- [ ] Create supabase_trigger schema: events=[INSERT, UPDATE, DELETE] with table + schema fields, isTrigger=true [2h]
- [ ] Add supabase_trigger to unified-node-registry.ts [2h]
- [ ] Implement Supabase trigger via Supabase Realtime channel subscriptions [3h]
- [ ] Add Supabase trigger output schema: eventType, table, schema, new record, old record [1h]
- [ ] Add supabase_trigger to nodeTypes.ts frontend [1h]

### 2.22 MongoDB Trigger
- [ ] Create mongodb_trigger schema: events=[insert, update, delete, replace] with collection field, isTrigger=true [2h]
- [ ] Add mongodb_trigger to unified-node-registry.ts [2h]
- [ ] Implement MongoDB trigger via Change Streams (requires replica set) [3h]
- [ ] Add MongoDB trigger output schema: operationType, documentKey, fullDocument, updateDescription [1h]
- [ ] Add mongodb_trigger to nodeTypes.ts frontend [1h]

### 2.23 Mailchimp Trigger
- [ ] Create mailchimp_trigger schema: events=[subscribe, unsubscribe, profile_updated, campaign_sent, cleaned], isTrigger=true, webhookSupported=true [2h]
- [ ] Add mailchimp_trigger to unified-node-registry.ts [2h]
- [ ] Implement Mailchimp trigger via Mailchimp Webhooks [2h]
- [ ] Add Mailchimp trigger output schema: type, email, list_id, timestamp, merge_fields [1h]
- [ ] Add mailchimp_trigger to nodeTypes.ts frontend [1h]

### 2.24 Twilio Trigger
- [ ] Create twilio_trigger schema: events=[new_sms, new_call, call_completed, new_whatsapp_message], isTrigger=true, webhookSupported=true [2h]
- [ ] Add twilio_trigger to unified-node-registry.ts [2h]
- [ ] Implement Twilio trigger via Twilio StatusCallback and Messaging webhooks [2h]
- [ ] Add Twilio trigger output schema: From, To, Body, MessageSid, CallStatus [1h]
- [ ] Add twilio_trigger to nodeTypes.ts frontend [1h]

### 2.25 Google Calendar Trigger
- [ ] Create google_calendar_trigger schema: events=[new_event, event_updated, event_starting_soon, event_cancelled], isTrigger=true, pollingInterval=60 [2h]
- [ ] Add google_calendar_trigger to unified-node-registry.ts [2h]
- [ ] Implement Google Calendar trigger via Calendar Push Notifications or polling events.list [3h]
- [ ] Add Google Calendar trigger output schema: event_id, summary, start, end, attendees, location [1h]
- [ ] Add google_calendar_trigger to nodeTypes.ts frontend [1h]

### 2.26 Microsoft Teams Trigger
- [ ] Create microsoft_teams_trigger schema: events=[new_message, new_channel_message, new_mention, new_member], isTrigger=true, webhookSupported=true [2h]
- [ ] Add microsoft_teams_trigger to unified-node-registry.ts [2h]
- [ ] Implement Teams trigger via Microsoft Graph Change Notifications (webhooks) [3h]
- [ ] Add Teams trigger output schema: message_id, channel_id, team_id, from, body, created_at [1h]
- [ ] Add microsoft_teams_trigger to nodeTypes.ts frontend [1h]

### 2.27 AWS S3 Trigger
- [ ] Create aws_s3_trigger schema: events=[ObjectCreated, ObjectRemoved, ObjectRestore] with bucket field, isTrigger=true [2h]
- [ ] Add aws_s3_trigger to unified-node-registry.ts [2h]
- [ ] Implement S3 trigger via S3 Event Notifications to SQS queue, poll SQS [3h]
- [ ] Add S3 trigger output schema: bucket, key, size, etag, event_type, timestamp [1h]
- [ ] Add aws_s3_trigger to nodeTypes.ts frontend [1h]

### 2.28 Dropbox Trigger
- [ ] Create dropbox_trigger schema: events=[new_file, file_updated, folder_updated] with path field, isTrigger=true, webhookSupported=true [2h]
- [ ] Add dropbox_trigger to unified-node-registry.ts [2h]
- [ ] Implement Dropbox trigger via Dropbox Webhooks (delta polling) [2h]
- [ ] Add Dropbox trigger output schema: path, name, size, modified, is_folder [1h]
- [ ] Add dropbox_trigger to nodeTypes.ts frontend [1h]

### 2.29 Freshdesk Trigger
- [ ] Create freshdesk_trigger schema: events=[ticket_created, ticket_updated, ticket_resolved, new_reply], isTrigger=true, webhookSupported=true [2h]
- [ ] Add freshdesk_trigger to unified-node-registry.ts [2h]
- [ ] Implement Freshdesk trigger via Freshdesk Webhooks (Automation rules) [2h]
- [ ] Add Freshdesk trigger output schema: ticket_id, subject, status, priority, requester, agent [1h]
- [ ] Add freshdesk_trigger to nodeTypes.ts frontend [1h]

### 2.30 Intercom Trigger
- [ ] Create intercom_trigger schema: events=[conversation.created, conversation.replied, user.created, user.tag.created], isTrigger=true, webhookSupported=true [2h]
- [ ] Add intercom_trigger to unified-node-registry.ts [2h]
- [ ] Implement Intercom trigger via Intercom Webhooks [2h]
- [ ] Add Intercom trigger output schema: topic, conversation_id, user_id, message_body, created_at [1h]
- [ ] Add intercom_trigger to nodeTypes.ts frontend [1h]

---

## SECTION 3 — AGENT NODE CORE ARCHITECTURE [AGENT] [CRITICAL]
### Estimated: 10-12 days | Owner: Backend Team (Senior)
### Audit Status: Types and DB tables partially exist; agent port wiring NOT implemented

### 3.1 Agent Data Model & Types
> agent_executions table EXISTS in 02_agent_memory_tables.sql — skip that task
> agent_sessions exists as memory_sessions in same migration — verify schema matches
- [ ] Define AgentNodeConfig type in worker/src/core/types/ai-types.ts: systemPrompt, maxIterations, agentType, returnIntermediateSteps, passthroughBinaryImages [2h]
- [ ] Define AgentSubNodeConnection type: subNodeId, portType ('ai_languageModel'|'ai_memory'|'ai_tool'|'ai_outputParser') [1h]
  - NOTE: No parentAgentNodeId — this is derived from edges at runtime via getAgentSubNodes()
- [ ] Define AgentToolCall type: toolName, toolNodeId, toolInput, toolOutput, callId, timestamp [2h]
- [ ] Define AgentIteration type: iterationNumber, thought, toolCalls[], observation, finalAnswer [2h]
- [ ] Define AgentExecutionResult type: iterations[], finalOutput, totalTokensUsed, executionTime, stoppedReason [2h]
- [x] agent_executions table EXISTS in Supabase (02_agent_memory_tables.sql) — verify columns match AgentExecutionResult [1h]
- [x] memory_sessions table EXISTS — verify it covers agent session needs or add agent_sessions separately [1h]

### 3.2 Agent Wiring in Main DAG (CRITICAL — aligned with n8n + unified orchestrator)
> AUDIT: ai_languageModel/ai_memory/ai_tool typed ports DO NOT EXIST in codebase.
> workflow-builder.ts uses ad-hoc 'ai-input' edge type and hardcoded type checks.
> All tasks below are fully open and must follow the unified orchestrator rule.
- [ ] Represent all agent sub-node connections as normal WorkflowEdge entries with typed targetHandle values [3h]
  - targetHandle='ai_languageModel' for chat_model → ai_agent connection
  - targetHandle='ai_memory' for memory → ai_agent connection
  - targetHandle='ai_tool' for tool → ai_agent connection
  - targetHandle='ai_outputParser' for output parser → ai_agent connection
  - These edges MUST be created via unifiedGraphOrchestrator.injectNode() — never workflow.edges.push()
- [ ] Extend UnifiedNodeDefinition for ai_agent to declare additional input ports [2h]
  - File: worker/src/core/types/unified-node-contract.ts
  - Add agentInputPorts?: string[] field listing ['ai_languageModel', 'ai_memory', 'ai_tool', 'ai_outputParser']
  - These are in addition to the standard 'input' port
- [ ] Update edge-reconciliation-engine.ts to recognize ai_* targetHandle edges [3h]
  - File: worker/src/core/orchestration/edge-reconciliation-engine.ts
  - Edges with targetHandle matching /^ai_/ are agent sub-node edges
  - These edges must be preserved during reconciliation (not treated as orphan connections)
  - These edges must NOT be included in the main topological execution order
- [ ] Update execution-order-manager.ts to exclude ai_* port edges from execution schedule [2h]
  - File: worker/src/core/orchestration/execution-order-manager.ts
  - Filter out edges where targetHandle matches /^ai_/ before computing topological order
  - These nodes are called by the AgentExecutor, not the main execution engine
- [ ] Update unified-graph-orchestrator.ts validateWorkflow() to validate agent port connections [2h]
  - Ensure only nodes with isAgentSubNode=true can connect to ai_* ports
  - Ensure ai_languageModel port has exactly one connection (one LLM per agent)
  - Ensure ai_memory port has at most one connection
  - Ensure ai_tool port can have multiple connections (multiple tools allowed)
- [ ] Remove ad-hoc 'ai-input' edge type from workflow-builder.ts [1h]
  - Replace with proper targetHandle='ai_languageModel' etc. via orchestrator

### 3.3 Agent Execution Loop (ReAct)
- [ ] Create worker/src/core/execution/agent-executor.ts [6h]
  - Implements ReAct loop: observe input → think (LLM call) → optionally call tool → observe result → repeat
  - Uses getAgentSubNodes() to find connected LLM, memory, tools from edges
  - Respects maxIterations from AgentNodeConfig
  - Stores each iteration in agent_executions.iterations_json
  - Returns AgentExecutionResult on completion
- [ ] Implement think step: call chat_model sub-node with system prompt + conversation history [3h]
- [ ] Implement tool selection: parse LLM response for tool_call intent [2h]
- [ ] Implement tool execution: call tool sub-node via dynamic-node-executor.ts [2h]
- [ ] Implement observation: append tool result to conversation history [1h]
- [ ] Implement stopping conditions: final answer detected OR maxIterations reached [2h]
- [ ] Handle tool execution errors gracefully — return error as observation, let LLM retry [2h]
- [ ] Add tool call timeout: if tool takes >30s, return timeout error as observation [2h]
- [ ] Add tool call logging: every tool call stored in agent_executions.iterations_json [1h]

### 3.4 Agent Node execute() Integration
- [ ] Wire ai_agent node's execute() in unified-node-registry-overrides.ts to call AgentExecutor [3h]
  - File: worker/src/core/registry/overrides/ (create agent-node-override.ts)
  - execute() must: get sub-nodes from edges via getAgentSubNodes(), instantiate AgentExecutor, run loop
  - Must use dynamic-node-executor.ts for all tool/memory/model sub-node calls
- [ ] Verify ai_agent execute() receives correct context including workflow edges [2h]
  - NodeExecutionContext must include workflow edges so getAgentSubNodes() can derive connections

### 3.5 Agent Tool Description Generation
- [ ] Create worker/src/core/execution/agent-tool-description-generator.ts [3h]
  - Auto-generates OpenAI function definition from node's inputSchema in unified-node-registry
  - Input: nodeType string → Output: { name, description, parameters: JSONSchema }
  - Uses registry inputSchema — no hardcoded tool definitions
- [ ] Verify generated tool descriptions are valid OpenAI function call format [2h]
- [ ] Add tool description caching (per node type, invalidate on registry update) [1h]

### 3.6 Agent Memory Integration
- [ ] Create worker/src/core/execution/agent-memory-manager.ts [4h]
  - Supports memoryType: window_buffer, summary, vector_store, redis
  - window_buffer: keeps last N messages in memory (windowSize from config)
  - summary: uses LLM to summarize old messages when context grows
  - vector_store: stores embeddings, retrieves semantically relevant history
  - redis: uses Redis for fast session-scoped memory
  - All types use sessionId to scope conversations
- [ ] Integrate memory manager with AgentExecutor: load history before think step [2h]
- [ ] Integrate memory manager with AgentExecutor: save new messages after each iteration [2h]
- [ ] Verify memory persists across multiple chat turns in same session [2h]

---

## SECTION 4 — AGENT SUB-NODES IMPLEMENTATION [AGENT]
### Estimated: 8-10 days | Owner: Backend Team

### 4.1 Chat Model Node (ai_languageModel port)
- [ ] Create worker/src/core/execution/nodes/chat-model-executor.ts [4h]
  - Supports provider field: openai, anthropic, google, ollama, azure_openai
  - Routes to correct provider SDK based on provider field — no hardcoded if/else
  - Supports streaming: true/false
  - Returns: { content, role, usage: { promptTokens, completionTokens, totalTokens } }
- [ ] Implement OpenAI provider: gpt-4o, gpt-4-turbo, gpt-3.5-turbo [2h]
- [ ] Implement Anthropic provider: claude-3-5-sonnet, claude-3-haiku [2h]
- [ ] Implement Google provider: gemini-1.5-pro, gemini-1.5-flash [2h]
- [ ] Implement Ollama provider: any model from local Ollama server [2h]
- [ ] Wire chat_model execute() in registry overrides to chat-model-executor.ts [1h]

### 4.2 Memory Node (ai_memory port)
- [ ] Wire memory execute() in registry overrides to agent-memory-manager.ts [2h]
- [ ] Verify window_buffer memory: stores messages, respects windowSize [2h]
- [ ] Verify summary memory: summarizes old messages via LLM [2h]
- [ ] Verify vector_store memory: stores + retrieves embeddings [3h]
- [ ] Verify redis memory: fast session-scoped storage [2h]

### 4.3 Tool Node (ai_tool port)
- [ ] Create worker/src/core/execution/nodes/tool-node-executor.ts [3h]
  - Wraps any existing node as a tool
  - toolNodeId field references the wrapped node's ID in the workflow
  - Calls the wrapped node via dynamic-node-executor.ts
  - Returns result in tool_call response format
- [ ] Wire tool execute() in registry overrides to tool-node-executor.ts [1h]
- [ ] Verify tool can wrap: google_gmail, google_sheets, http_request, postgresql [2h]
- [ ] Add built-in tools: Calculator (javascript node), Web Search (http_request to search API) [3h]

### 4.4 Agent Sub-Node Frontend Wiring
- [ ] Add agent sub-node connection UI: dashed lines from sub-nodes to agent node [3h]
  - File: ctrl_checks/src/components/workflow/WorkflowEdge.tsx or similar
  - Edges with targetHandle matching /^ai_/ render as dashed lines
- [ ] Add sub-node cards attached to agent node in canvas [3h]
  - Agent node shows compact cards for connected LLM, memory, tools
- [ ] Add drag-and-drop: dragging chat_model/memory/tool onto agent auto-creates correct port edge [3h]
  - On drop: detect isAgentSubNode=true, determine correct port (ai_languageModel/ai_memory/ai_tool)
  - Call unifiedGraphOrchestrator.injectNode() with correct port context

---

## SECTION 5 — AGENT FRONTEND UI [AGENT]
### Estimated: 6-8 days | Owner: Frontend Team

### 5.1 Agent Node Canvas Rendering
- [ ] Agent node shows sub-node connections as dashed lines (distinct from regular edges) [2h]
- [ ] Agent node shows compact sub-node cards: LLM card, Memory card, Tool cards [3h]
- [ ] Sub-node cards show provider/type name and connection status [1h]
- [ ] Agent node shows iteration count and status during execution [2h]

### 5.2 Agent PropertiesPanel
- [ ] Add agent PropertiesPanel fields: systemPrompt (textarea), maxIterations (number), agentType (dropdown), returnIntermediateSteps (toggle) [3h]
- [ ] Add chat_model PropertiesPanel: provider dropdown, model dropdown (fetched from provider), temperature, maxTokens, streaming toggle [3h]
- [ ] Add memory PropertiesPanel: memoryType dropdown, sessionId, windowSize (for window_buffer), returnMessages toggle [2h]
- [ ] Add tool PropertiesPanel: toolNodeId picker (select from workflow nodes), toolName, toolDescription [2h]

### 5.3 Agent Execution UI
- [ ] Add agent thought stream panel: shows ReAct iterations in real-time [4h]
  - Each iteration shows: thought, tool called, tool result, observation
- [ ] Add agent chat interface: send messages to running agent session [3h]
- [ ] Add agent memory viewer: shows current memory contents for session [2h]
- [ ] Add agent stop button: stops running agent execution [1h]
- [ ] Add agent execution history: shows past agent runs with iteration details [2h]

---

## SECTION 6 — AGENT EXECUTION ENGINE INTEGRATION [AGENT]
### Estimated: 8-10 days | Owner: Backend Team

### 6.1 Execution Engine Agent Support
- [ ] Update unified-execution-engine.ts to detect agent nodes and route to AgentExecutor [3h]
  - When node category === 'agents' and isAgentSubNode === false: use AgentExecutor
  - When node category === 'agents' and isAgentSubNode === true: skip (called by AgentExecutor)
- [ ] Verify agent sub-nodes are excluded from main topological execution order [2h]
- [ ] Add agent execution state tracking: save iterations to agent_executions table [2h]
- [ ] Add agent streaming: SSE endpoint for real-time thought streaming [3h]
  - File: worker/src/api/agent-stream.ts
  - Streams each ReAct iteration as SSE event to frontend

### 6.2 Agent Session Management
- [ ] Create POST /api/agent/chat: sends message to agent session, returns response [2h]
- [ ] Create GET /api/agent/chat/:sessionId: returns full chat history [1h]
- [ ] Create DELETE /api/agent/memory/:sessionId: clears agent memory [1h]
- [ ] Create POST /api/agent/stop/:executionId: stops running agent [2h]
- [ ] Create GET /api/agent/tools: returns all available agent tools from registry [1h]

---

## SECTION 7 — NODE EXECUTORS VERIFICATION [VERIFY]
### Estimated: 12-15 days | Owner: Backend Team

### 7.1 Google Suite Executors
- [ ] Verify google_gmail executor: all operations work with OAuth token [3h]
- [ ] Verify google_sheets executor: read/write/append/update/delete all work [3h]
- [ ] Verify google_drive executor: upload/download/list/share all work [3h]
- [ ] Verify google_calendar executor: create/update/delete/list events work [2h]
- [ ] Verify google_doc executor: create/read/append/replace_text work [2h]

### 7.2 Communication Executors
- [ ] Verify slack_message executor: send_message, upload_file, list_channels work [2h]
- [ ] Verify telegram executor: send_message, send_photo, send_document work [2h]
- [ ] Verify discord executor: send_message, create_channel, add_role work [2h]
- [ ] Verify microsoft_teams executor: send_message, create_channel work [2h]
- [ ] Verify twilio executor: send_sms, make_call, send_whatsapp work [2h]

### 7.3 CRM Executors
- [ ] Verify hubspot executor: create/update/get contact and deal work [2h]
- [ ] Verify salesforce executor: create/update/get/query work [2h]
- [ ] Verify notion executor: create/update/get page and database item work [2h]
- [ ] Verify airtable executor: list/create/update/delete records work [2h]
- [ ] Verify pipedrive executor: create/update/get deal and contact work [2h]
- [ ] Verify zoho_crm executor: create/update/get lead and contact work [2h]

### 7.4 Database Executors
- [ ] Verify postgresql executor: select/insert/update/delete/execute_query work [3h]
- [ ] Verify mysql executor: select/insert/update/delete work [2h]
- [ ] Verify mongodb executor: find/insert/update/delete/aggregate work [3h]
- [ ] Verify redis executor: get/set/delete/lpush/hget/publish work [2h]
- [ ] Verify supabase executor: select/insert/update/delete work [2h]

### 7.5 DevOps Executors
- [ ] Verify github executor: create/update/get issue, create PR, list commits work [2h]
- [ ] Verify jira executor: create/update/get/transition issue work [2h]
- [ ] Verify clickup executor: create/update/get task, set status work [2h]

### 7.6 E-commerce Executors
- [ ] Verify stripe executor: create_payment_intent, create_customer, create_refund work [2h]
- [ ] Verify shopify executor: get/list/update order, create product work [2h]

### 7.7 Storage Executors
- [ ] Verify aws_s3 executor: upload/download/list/delete/get_presigned_url work [2h]
- [ ] Verify dropbox executor: upload/download/list/delete/move work [2h]
- [ ] Verify onedrive executor: upload/download/list/delete work [2h]

### 7.8 Support Executors
- [ ] Verify freshdesk executor: create/update/get/list tickets work [2h]
- [ ] Verify intercom executor: create conversation, get user, send message work [2h]

### 7.9 Marketing Executors
- [ ] Verify mailchimp executor: add/update/remove subscriber, create campaign work [2h]
- [ ] Verify activecampaign executor: create/update contact, add tag, create deal work [2h]

### 7.10 Social Media Executors
- [ ] Verify twitter executor: post_tweet, reply, retweet, search_tweets work [2h]
- [ ] Verify linkedin executor: create_post, get_profile work [2h]
- [ ] Verify instagram executor: get_media, create_media_container, publish_media work [2h]
- [ ] Verify facebook executor: create_post, get_page_info, get_insights work [2h]

### 7.11 Logic & Utility Executors
- [ ] Verify if_else executor: condition evaluation routes to correct branch [2h]
- [ ] Verify switch executor: routes to correct case branch [2h]
- [ ] Verify loop executor: iterates over each item in array [2h]
- [ ] Verify merge executor: all merge modes work correctly [2h]
- [ ] Verify filter executor: keeps only matching items [1h]
- [ ] Verify aggregate executor: sum/count/average/group_by work [2h]
- [ ] Verify javascript executor: code runs in sandbox, $json access works [3h]
- [ ] Verify http_request executor: all methods, all auth types, JSON/text/binary response [3h]
- [ ] Verify graphql executor: query, mutation, subscription [2h]
- [ ] Verify respond_to_webhook executor: returns correct HTTP response to caller [2h]

---

## SECTION 8 — NODE FRONTEND UI VERIFICATION [VERIFY]
### Estimated: 8-10 days | Owner: Frontend Team

### 8.1 NodeLibrary Panel Verification
- [ ] Verify all backend nodes appear in nodeTypes.ts frontend definition [2h]
- [ ] Verify all nodes have correct category assignment in nodeTypes.ts [2h]
- [ ] Verify all nodes have correct icon in nodeTypes.ts [2h]
- [ ] Add missing nodes to nodeTypes.ts: all trigger nodes, all new integration nodes [3h]
- [ ] Add 'Agents' category to NODE_CATEGORIES in nodeTypes.ts [1h]
- [ ] Add 'Triggers' category to NODE_CATEGORIES if not present [1h]
- [ ] Verify NodeLibrary.tsx search works for all node types [1h]
- [ ] Verify drag-and-drop from NodeLibrary to canvas works for all nodes [2h]

### 8.2 PropertiesPanel Verification
- [ ] Verify PropertiesPanel.tsx renders correct fields for every node type [3h]
- [ ] Verify all required fields show as required in PropertiesPanel [1h]
- [ ] Verify dropdown fields (operation, method, etc.) show correct options [2h]
- [ ] Verify conditional fields show/hide based on other field values (visibleIf) [2h]
- [ ] Verify credential fields show OAuth connect button or API key input [2h]
- [ ] Verify expression fields support {{$json.field}} syntax with autocomplete [3h]
- [ ] Verify JSON fields have JSON editor widget [2h]
- [ ] Add missing field widgets: code editor for javascript node, cron builder for schedule node [3h]
- [ ] Add field validation feedback: show error message under invalid fields [2h]

### 8.3 WorkflowNode Component Verification
- [ ] Verify WorkflowNode.tsx renders correctly for all node categories [2h]
- [ ] Verify trigger nodes show lightning bolt icon indicator [1h]
- [ ] Verify branching nodes (if_else, switch) show correct number of output handles [2h]
- [ ] Verify merge node shows multiple input handles [1h]
- [ ] Verify log_output node shows terminal indicator [1h]
- [ ] Verify node status indicators: idle, running, success, error [2h]
- [ ] Verify node execution output preview on hover [2h]

### 8.4 WorkflowCanvas Verification
- [ ] Verify edges render correctly for all edge types: main, true, false, case_N [2h]
- [ ] Verify edge labels show on branching edges (true/false, case_1/case_2) [1h]
- [ ] Verify agent sub-node edges render as dashed lines [1h]
- [ ] Verify canvas zoom and pan work correctly [1h]
- [ ] Verify undo/redo works for node add/remove/move [2h]
- [ ] Verify workflow save persists all node positions [1h]

### 8.5 Execution Console Verification
- [ ] Verify ExecutionConsole.tsx shows all node execution results [2h]
- [ ] Verify execution log shows input and output for each node [2h]
- [ ] Verify error messages display correctly [1h]
- [ ] Verify real-time execution updates via WebSocket or polling [3h]

### 8.6 Trigger Node UI
- [ ] Add trigger activation toggle in WorkflowHeader: "Activate Trigger" button [2h]
- [ ] Add trigger status indicator: active/inactive/error [1h]
- [ ] Add trigger test button: "Test Trigger" fires trigger once [2h]
- [ ] Add trigger history panel: shows last N trigger fires with timestamps [3h]

### 8.7 Node Configuration Specific UIs
- [ ] Gmail node: recipient email tag input, CC/BCC fields, HTML body editor [3h]
- [ ] Google Sheets node: spreadsheet picker, sheet picker, range selector [3h]
- [ ] Slack node: channel picker (fetches from Slack API), user picker [3h]
- [ ] Schedule node: visual cron builder [3h]
- [ ] If/Else node: visual condition builder with field picker + operator + value [3h]
- [ ] Switch node: dynamic case builder — add/remove cases with labels [2h]
- [ ] HTTP Request node: headers editor, query params editor, body editor [3h]
- [ ] JavaScript node: Monaco code editor with syntax highlighting [3h]
- [ ] Form node: drag-and-drop form field builder [4h]

---

## SECTION 9 — CREDENTIALS & OAUTH VERIFICATION [VERIFY]
### Estimated: 6-8 days | Owner: Backend + Frontend Team

### 9.1 OAuth Flows Verification
- [ ] Verify Google OAuth: scopes include Gmail, Sheets, Drive, Calendar, Docs [2h]
- [ ] Verify Slack OAuth: scopes include channels:read, chat:write, files:write [2h]
- [ ] Verify GitHub OAuth: scopes include repo, issues, pull_requests [2h]
- [ ] Verify Notion OAuth: scopes include read_content, update_content, insert_content [2h]
- [ ] Verify LinkedIn OAuth: scopes include r_liteprofile, r_emailaddress, w_member_social [2h]
- [ ] Verify Twitter OAuth 2.0: scopes include tweet.read, tweet.write, users.read [2h]
- [ ] Verify Salesforce OAuth: scopes include api, refresh_token, offline_access [2h]
- [ ] Verify HubSpot OAuth: scopes include contacts, crm.objects.deals.read/write [2h]
- [ ] Verify all OAuth token refresh flows work automatically [3h]

### 9.2 API Key Credentials
- [ ] Verify OpenAI, Anthropic, Gemini API key storage and retrieval from credential vault [2h]
- [ ] Verify Stripe, Shopify, Twilio, Airtable, Mailchimp API key storage [2h]
- [ ] Verify all API keys are encrypted at rest in credential vault [2h]

### 9.3 Credential UI Verification
- [ ] Verify ConnectionsPanel.tsx shows all integration connection statuses [2h]
- [ ] Verify OAuth connect buttons work for all OAuth integrations [2h]
- [ ] Verify API key input forms exist for all API key integrations [2h]
- [ ] Verify credential test button: tests connection with stored credentials [2h]

### 9.4 Credential Preflight Check
- [ ] Verify credential-preflight-check.ts checks all required credentials before execution [2h]
- [ ] Verify missing credentials are reported to user before execution starts [1h]
- [ ] Verify credential-preflight-check works for agent sub-node credentials (chat_model apiKey) [2h]
- [ ] Add credential check for all new trigger nodes [2h]

---

## SECTION 10 — API ROUTES VERIFICATION & NEW ROUTES [VERIFY]
### Estimated: 4-5 days | Owner: Backend Team

### 10.1 Existing Routes Verification
- [ ] Verify POST /api/generate-workflow: returns valid workflow JSON for any prompt [2h]
- [ ] Verify POST /api/execute-workflow: executes all node types correctly [2h]
- [ ] Verify POST /api/save-workflow: saves workflow with all nodes and edges [1h]
- [ ] Verify GET /api/workflows: returns all user workflows [1h]
- [ ] Verify POST /api/attach-credentials: attaches credentials to workflow nodes [2h]
- [ ] Verify GET /api/node-definitions: returns all node schemas for frontend [2h]

### 10.2 New Routes Needed
- [ ] Add GET /api/models: returns available LLM models per provider [2h]
- [ ] Add POST /api/triggers/activate: activates trigger for a workflow [2h]
- [ ] Add POST /api/triggers/deactivate: deactivates trigger [1h]
- [ ] Add POST /api/triggers/test: fires trigger once for testing [2h]
- [ ] Add GET /api/triggers/status/:workflowId: returns trigger states [1h]
- [ ] Add POST /api/agent/chat: sends message to agent session [2h]
- [ ] Add GET /api/agent/chat/:sessionId: gets chat history [1h]
- [ ] Add DELETE /api/agent/memory/:sessionId: clears agent memory [1h]
- [ ] Add POST /api/agent/stream: SSE streaming for agent thoughts [3h]
- [ ] Add POST /api/agent/stop/:executionId: stops running agent [2h]
- [ ] Add POST /api/trigger-webhook/:triggerId: receives webhook for trigger nodes [2h]

### 10.3 Route Security & Validation
- [ ] Verify all routes have authentication middleware [2h]
- [ ] Verify all routes validate request body with Zod or similar [2h]
- [ ] Verify all routes have rate limiting [2h]
- [ ] Verify all routes return consistent error format [1h]

---

## SECTION 11 — WORKFLOW EXECUTION PIPELINE VERIFICATION [VERIFY]
### Estimated: 5-6 days | Owner: Backend Team

### 11.1 Execution Engine Core
- [ ] Verify unified-execution-engine.ts executes nodes in correct topological order [2h]
- [ ] Verify dynamic-node-executor.ts fetches node definition from registry before every execution [2h]
- [ ] Verify template resolution ({{$json.field}}) works for all node config fields [2h]
- [ ] Verify upstream output is correctly passed to downstream node as input [2h]
- [ ] Verify branching execution: if_else routes to correct branch [2h]
- [ ] Verify switch execution: routes to correct case branch [2h]
- [ ] Verify loop execution: iterates over each item in array [2h]
- [ ] Verify merge execution: combines outputs from multiple branches [2h]
- [ ] Verify error handling: node failure stops workflow and reports error [2h]
- [ ] Verify execution state is saved to Supabase after each node [2h]

### 11.2 Execution Order Manager
- [ ] Verify execution-order-manager.ts produces correct topological order for linear workflows [1h]
- [ ] Verify correct order for branching workflows (if_else, switch) [2h]
- [ ] Verify correct order for workflows with merge nodes [2h]
- [ ] Verify edges on agent-only ports (ai_languageModel, ai_memory, ai_tool, ai_outputParser) are excluded from main execution schedule but still present in the validated DAG [2h]

### 11.3 Edge Reconciliation
- [ ] Verify edge-reconciliation-engine.ts creates correct edges for all workflow patterns [2h]
- [ ] Verify orphaned nodes are removed during reconciliation [1h]
- [ ] Verify switch case edges are correctly wired [2h]
- [ ] Verify agent-related edges (targetHandle matching /^ai_/) are preserved during reconciliation and excluded from execution order [2h]
- [ ] Verify no workflow.edges.push() calls exist outside of unified-graph-orchestrator.ts [1h]
  - Run: grep -rn "workflow\.edges\.push" worker/src — should return zero results after Section 1A fixes

### 11.4 Distributed Execution
- [ ] Verify distributed-execute-workflow.ts works for large workflows [2h]
- [ ] Verify worker-pool.ts manages workers correctly [2h]
- [ ] Add execution queue for high-volume workflows [3h]

### 11.5 Execution Monitoring
- [ ] Verify execution logs are saved to Supabase [1h]
- [ ] Verify ExecutionDetail.tsx shows correct execution data [2h]
- [ ] Verify RealtimeExecutionVisualizer.tsx shows live execution progress [3h]
- [ ] Add execution metrics: average duration, success rate, error rate [2h]

---

## SECTION 12 — AI WORKFLOW GENERATION ALIGNMENT [VERIFY]
### Estimated: 5-6 days | Owner: Backend Team

### 12.1 Workflow Generation Pipeline
- [ ] Verify workflow-builder.ts generates valid workflows for all common prompts [3h]
- [ ] Verify workflow-dsl-compiler.ts calls unifiedGraphOrchestrator.initializeWorkflow() after building node list [2h]
  - Must NOT build edges directly from DSL steps — orchestrator owns all edges
- [ ] Verify workflow-planner.ts produces correct node selection for all integration types [3h]
- [ ] Verify intent-engine.ts correctly classifies user intent [2h]
- [ ] Verify node-resolver.ts resolves node types from natural language [2h]

### 12.2 AI Generation for Agent Workflows
- [ ] Add agent workflow generation to workflow-builder.ts: detect "agent" intent in prompt [3h]
- [ ] Add agent DSL type to workflow-dsl.ts: includes sub-nodes for model/memory/tools [3h]
- [ ] Add agent workflow compilation to workflow-dsl-compiler.ts [3h]
  - Must create agent sub-node edges via orchestrator with correct ai_* targetHandle values
- [ ] Add agent workflow validation to workflow-validator.ts [2h]
- [ ] Verify AI can generate agent workflows from prompts like "create an AI agent that..." [3h]

### 12.3 AI Generation for Trigger Workflows
- [ ] Add trigger node selection to workflow-builder.ts: detect "when X happens" intent [2h]
- [ ] Verify AI generates correct trigger node for "when new email arrives" prompts [2h]
- [ ] Verify AI generates correct trigger node for "when new Slack message" prompts [2h]
- [ ] Verify AI generates correct trigger node for "every day at 9am" prompts [1h]

### 12.4 Node Operation Selection
- [ ] Verify AI selects correct operation for multi-operation nodes (e.g. Gmail send vs read) [2h]
- [ ] Verify AI fills correct config fields for each operation [2h]
- [ ] Verify AI does not hallucinate non-existent operations [2h]

---

## SECTION 13 — TESTING [VERIFY]
### Estimated: 10-12 days | Owner: Full Team

### 13.1 Unit Tests — Registry
- [ ] Test: every canonical node type has a UnifiedNodeDefinition [2h]
- [ ] Test: every node definition has required fields (inputSchema, outputSchema, execute) [2h]
- [ ] Test: alias resolution returns correct canonical type for all aliases [2h]
- [ ] Test: validateConfig catches missing required fields for every node [3h]
- [ ] Test: defaultConfig returns valid config for every node [2h]
- [ ] Test: isBranching is true only for if_else and switch [1h]
- [ ] Test: alwaysTerminal is true only for log_output [1h]
- [ ] Test: isTrigger() returns true only for trigger category nodes [1h]

### 13.2 Unit Tests — Agent
- [ ] Test: AgentExecutor runs ReAct loop correctly with mock LLM [3h]
- [ ] Test: AgentExecutor calls correct tool when LLM returns tool_call [2h]
- [ ] Test: AgentExecutor stops at maxIterations [1h]
- [ ] Test: AgentExecutor handles tool execution error gracefully [2h]
- [ ] Test: WindowBufferMemory stores and retrieves messages correctly [2h]
- [ ] Test: generateToolDescription produces valid OpenAI function definition [2h]
- [ ] Test: agent wiring uses main edges[] with ai_* targetHandle values [2h]
- [ ] Test: agent sub-node edges are excluded from main execution order [2h]
- [ ] Test: getAgentSubNodes() correctly derives sub-nodes from edges [1h]
- [ ] Test: validateWorkflow() rejects agent edges that connect wrong node types to ai_* ports [2h]

### 13.3 Unit Tests — Trigger Nodes
- [ ] Test: TriggerPollingService polls at correct interval [2h]
- [ ] Test: deduplication prevents same item from firing twice [2h]
- [ ] Test: TriggerExecutionBridge fires workflow with correct input [2h]
- [ ] Test: webhook trigger handler verifies signatures correctly (GitHub, Stripe, Slack, Shopify) [2h]
- [ ] Test: trigger activation/deactivation updates trigger_state table [1h]

### 13.4 Unit Tests — Architecture Violations (regression prevention)
- [ ] Test: no workflow.edges.push() calls exist in workflow-graph-sanitizer.ts [1h]
- [ ] Test: no workflow.edges.push() calls exist in workflow-policy-enforcer-v2.ts [1h]
- [ ] Test: no hardcoded node.type === string comparisons in workflow-builder.ts [1h]
- [ ] Test: all edge creation goes through unified-graph-orchestrator [2h]

### 13.5 Integration Tests — Node Executors
- [ ] Integration test: Gmail send email end-to-end (requires test credentials) [2h]
- [ ] Integration test: Google Sheets read/write end-to-end [2h]
- [ ] Integration test: Slack send message end-to-end [2h]
- [ ] Integration test: HTTP request GET/POST end-to-end [2h]
- [ ] Integration test: PostgreSQL select/insert end-to-end [2h]
- [ ] Integration test: if_else branching routes correctly [2h]
- [ ] Integration test: loop iterates over all items [2h]

### 13.6 Integration Tests — Agent
- [ ] Integration test: agent with Gmail tool sends email when asked [3h]
- [ ] Integration test: agent with Sheets tool reads data when asked [3h]
- [ ] Integration test: agent with memory remembers previous conversation [3h]
- [ ] Integration test: agent stops when goal is achieved [2h]
- [ ] Integration test: agent handles tool error and retries [2h]

### 13.7 E2E Tests — Workflow Generation
- [ ] E2E test: generate workflow from "send email when form submitted" prompt [2h]
- [ ] E2E test: generate workflow from "when new Slack message, save to Sheets" prompt [2h]
- [ ] E2E test: generate agent workflow from "create AI assistant that can search web" prompt [3h]
- [ ] E2E test: generated workflow executes successfully end-to-end [3h]

---

## SECTION 14 — DATABASE SCHEMA & MIGRATIONS
### Estimated: 3-4 days | Owner: Backend Team
### Audit Status: agent_executions EXISTS. trigger_state and active_triggers DO NOT EXIST.

### 14.1 New Tables Required
- [ ] Create trigger_state table (in migration 29_trigger_infrastructure.sql) [2h]
  - Columns: id, workflow_id, node_id, trigger_type, last_checked_at, last_item_id, cursor, is_active, created_at, updated_at
  - Indexes: (workflow_id, node_id), (is_active)
  - RLS: users can only access their own trigger states
- [ ] Create active_triggers table (same migration file) [2h]
  - Columns: id, workflow_id, node_id, trigger_type, config_json, is_active, created_at, updated_at
  - Indexes: (workflow_id), (is_active, trigger_type)
  - RLS: users can only access their own active triggers
- [x] agent_executions table EXISTS in 02_agent_memory_tables.sql — verify schema is complete [1h]
- [x] memory_sessions table EXISTS — verify it covers agent session needs [1h]
- [ ] Create agent_tool_calls table: id, execution_id, tool_name, tool_input, tool_output, duration_ms, created_at [2h]

### 14.2 Existing Table Updates
- [ ] Add workflow_type column to workflows table: automation | chatbot | agent [1h]
  - File: new migration ctrl_checks/sql_migrations/30_workflow_columns.sql
- [ ] Add agent_config column to workflows table: JSON with goal, maxIterations, agentType [1h]
- [ ] ~~Add agent_edges column to workflows table~~ — REMOVED: agent sub-node edges are stored in the main edges JSONB column, not a separate column. This contradicts Section 3.2 and n8n architecture.
- [ ] Add trigger_config column to workflows table: JSON with trigger settings [1h]
- [ ] Add last_execution_at column to workflows table [1h]
- [ ] Add execution_count column to workflows table [1h]

### 14.3 Migrations
- [ ] Write migration 29_trigger_infrastructure.sql for trigger_state + active_triggers tables [2h]
- [ ] Write migration 30_workflow_columns.sql for workflow_type, agent_config, trigger_config columns [2h]
- [ ] Add indexes: trigger_state(workflow_id, node_id), agent_executions(workflow_id, session_id) [1h]
- [ ] Add RLS policies for all new tables [2h]
- [ ] Test migrations on staging database [2h]

---

## SECTION 15 — MISSING INTEGRATIONS
### Estimated: 8-10 days | Owner: Backend Team

### 15.1 New Action Nodes to Add
- [ ] Add Zoom node: create_meeting, get_meeting, list_meetings, delete_meeting [3h]
- [ ] Add Asana node: create_task, update_task, get_task, list_tasks, create_project [3h]
- [ ] Add Monday.com node: create_item, update_item, get_item, list_boards [3h]
- [ ] Add Trello node: create_card, update_card, move_card, list_boards, list_cards [3h]
- [ ] Add Zendesk node: create_ticket, update_ticket, get_ticket, add_comment [3h]
- [ ] Add Sendgrid node: send_email, create_contact, add_to_list [2h]
- [ ] Add Resend node: send_email, get_email_status [2h]
- [ ] Add Klaviyo node: create_profile, add_to_list, track_event [2h]
- [ ] Add Segment node: track_event, identify_user, group [2h]
- [ ] Add Linear node: create_issue, update_issue, get_issue, list_issues [2h]
- [ ] Add Pagerduty node: create_incident, resolve_incident, list_incidents [2h]
- [ ] Add Datadog node: create_event, get_metrics, create_monitor [2h]

### 15.2 New Trigger Nodes to Add (beyond Section 2)
- [ ] Add Zoom trigger: meeting_started, meeting_ended, recording_completed [2h]
- [ ] Add Asana trigger: task_created, task_completed, task_updated [2h]
- [ ] Add Trello trigger: card_created, card_moved, card_updated [2h]
- [ ] Add Zendesk trigger: ticket_created, ticket_updated, ticket_solved [2h]
- [ ] Add Linear trigger: issue_created, issue_updated, issue_completed [2h]

---

## SECTION 16 — PERFORMANCE & SCALABILITY
### Estimated: 4-5 days | Owner: Backend Team

- [ ] Add LRU cache for node registry lookups [2h]
- [ ] Add connection pooling for all database executors [3h]
- [ ] Add rate limiting per user for workflow executions [2h]
- [ ] Add rate limiting per user for AI generation [2h]
- [ ] Add execution queue for high-volume trigger workflows [3h]
- [ ] Add horizontal scaling support for trigger polling service [3h]
- [ ] Add Redis-based distributed locking for trigger deduplication [2h]
- [ ] Profile and optimize workflow generation pipeline [3h]
- [ ] Add pagination to all list APIs [2h]

---

## SECTION 17 — DOCUMENTATION
### Estimated: 3-4 days | Owner: Full Team

- [ ] Document agent node architecture: sub-node connection model via typed edge ports [2h]
  - Key point: parentAgentNodeId does NOT exist — relationship derived from edges
  - Key point: agent_edges column does NOT exist — agent edges are in main edges[] array
- [ ] Document trigger node implementation pattern [2h]
- [ ] Document how to add a new integration node (action + trigger) [2h]
- [ ] Document node registry contract and required fields [2h]
- [ ] Document agent ReAct loop execution flow [2h]
- [ ] Document credential setup for each integration [3h]
- [ ] Update ADDING_NEW_NODES_GUIDE.md with trigger node pattern [1h]
- [ ] Create AGENT_ARCHITECTURE.md explaining sub-node model and port wiring [2h]
- [ ] Create TRIGGER_IMPLEMENTATION_GUIDE.md [2h]
- [ ] Create ARCHITECTURE_VIOLATIONS.md listing forbidden patterns with examples [1h]

---

## SECTION 18 — WHATSAPP & INSTAGRAM FULL IMPLEMENTATION
### Estimated: 5-6 days | Owner: Backend + Frontend Team

### 18.1 WhatsApp Cloud Action Node
- [ ] Verify whatsapp_cloud executor: send_text, send_template, send_image, send_document, send_audio, send_video, send_location, send_interactive [3h]
- [ ] Verify WhatsApp Business API authentication: permanent token + phone_number_id [2h]
- [ ] Verify template message sending: template_name, language_code, components [2h]
- [ ] Add whatsapp_cloud to nodeTypes.ts frontend [1h]

### 18.2 WhatsApp Trigger Node
- [ ] Create whatsapp_trigger schema: events=[new_message, new_media_message, message_status_update, new_button_reply], isTrigger=true, webhookSupported=true [2h]
- [ ] Add whatsapp_trigger to unified-node-registry.ts [2h]
- [ ] Implement WhatsApp trigger via Meta Webhooks: verify_token challenge + message events [3h]
- [ ] Handle WhatsApp webhook signature verification (X-Hub-Signature-256) [2h]
- [ ] Add whatsapp_trigger to nodeTypes.ts frontend [1h]

### 18.3 Instagram Action Node
- [ ] Verify instagram executor: get_media, get_profile, create_media_container, publish_media, get_insights, reply_comment [3h]
- [ ] Verify media publishing flow: create container → wait for status=FINISHED → publish [3h]
- [ ] Add instagram to nodeTypes.ts frontend [1h]

### 18.4 Instagram Trigger Node
- [ ] Create instagram_trigger schema: events=[new_comment, new_mention, new_story_mention, new_dm, media_published], isTrigger=true, webhookSupported=true [2h]
- [ ] Add instagram_trigger to unified-node-registry.ts [2h]
- [ ] Implement Instagram trigger via Meta Webhooks [3h]
- [ ] Add instagram_trigger to nodeTypes.ts frontend [1h]

---

## SECTION 19 — OLLAMA & LOCAL AI NODES
### Estimated: 4-5 days | Owner: Backend Team

### 19.1 Ollama Action Node
- [ ] Verify ollama executor: generate, chat, embeddings operations [2h]
- [ ] Verify Ollama API connection: baseUrl field, model field, prompt field [2h]
- [ ] Verify Ollama streaming response support [2h]
- [ ] Add Ollama model list fetcher: GET /api/tags from Ollama server [2h]

### 19.2 OpenAI GPT Node
- [ ] Verify openai_gpt executor: chat_completion, embeddings, image_generation, speech_to_text [3h]
- [ ] Verify streaming support for chat_completion [2h]

### 19.3 Anthropic Claude Node
- [ ] Verify anthropic_claude executor: messages API with tool_use support [3h]
- [ ] Verify streaming support [2h]

### 19.4 Google Gemini Node
- [ ] Verify google_gemini executor: generateContent, chat, embedContent [3h]
- [ ] Verify multimodal input support (text + image) [2h]

### 19.5 Text Summarizer & Sentiment Analyzer Nodes
- [ ] Verify text_summarizer executor: uses configured LLM to summarize text [2h]
- [ ] Verify sentiment_analyzer executor: returns sentiment score + label [2h]

---

## SECTION 20 — WORKFLOW VERSIONING & HISTORY
### Estimated: 3-4 days | Owner: Backend + Frontend Team

- [ ] Verify workflow-versioning.ts saves a new version on every workflow save [2h]
- [ ] Verify GET /api/workflow-versioning returns version history list [1h]
- [ ] Verify version restore: POST /api/workflow-versioning/restore/:versionId [2h]
- [ ] Add version diff: compare two versions and show what changed [3h]
- [ ] Add version history panel in WorkflowHeader.tsx [2h]
- [ ] Add restore button per version [1h]

---

## SECTION 21 — WORKFLOW TEMPLATES SYSTEM
### Estimated: 3-4 days | Owner: Backend + Frontend Team

- [ ] Verify admin-templates.ts: create, update, delete, list templates [2h]
- [ ] Verify copy-template.ts: copies template to user's workflow [2h]
- [ ] Add agent workflow templates: pre-built agent workflows [2h]
- [ ] Add trigger workflow templates: pre-built trigger-based workflows [2h]
- [ ] Verify Templates.tsx page shows all templates with categories [1h]
- [ ] Add template preview modal showing workflow graph [2h]

---

## SECTION 22 — CHATBOT / CHAT TRIGGER WORKFLOWS
### Estimated: 4-5 days | Owner: Backend + Frontend Team

- [ ] Verify chat_trigger node schema: has sessionId, message, userId fields [1h]
- [ ] Verify chatbot-chat.ts API: POST /api/chatbot/chat handles incoming messages [2h]
- [ ] Verify chat session persistence: messages stored in Supabase [2h]
- [ ] Add chat history retrieval: GET /api/chatbot/history/:sessionId [1h]
- [ ] Verify ChatWidget.tsx renders correctly [1h]
- [ ] Add chat widget customization: colors, title, welcome message [2h]
- [ ] Add chat embed code generator: copy-paste script tag [2h]
- [ ] Connect chat_trigger to ai_agent node: chat messages become agent input [3h]
- [ ] Maintain conversation history across chat sessions via memory node [2h]

---

## SECTION 23 — FORM TRIGGER FULL IMPLEMENTATION
### Estimated: 3-4 days | Owner: Backend + Frontend Team

- [ ] Verify form-trigger.ts API: POST /api/form-trigger/:formId handles submissions [2h]
- [ ] Verify form field types: text, email, number, textarea, select, checkbox, radio, date, file [2h]
- [ ] Verify form submission storage in Supabase [1h]
- [ ] Add form public URL generation: unique URL per form node [1h]
- [ ] Verify FormTrigger.tsx page renders form correctly [1h]
- [ ] Verify FormNodeSettings.tsx: drag-and-drop field builder [2h]
- [ ] Add form conditional logic: show/hide fields based on other field values [3h]

---

## SECTION 24 — WEBHOOK TRIGGER FULL IMPLEMENTATION
### Estimated: 2-3 days | Owner: Backend + Frontend Team

- [ ] Verify webhook-trigger.ts: POST /api/webhook/:webhookId handles incoming requests [2h]
- [ ] Verify webhook URL generation: unique URL per webhook node [1h]
- [ ] Verify webhook authentication: none, basic auth, bearer token, HMAC signature [3h]
- [ ] Add webhook request logging: store all incoming requests [2h]
- [ ] Verify WebhookSettings.tsx shows webhook URL [1h]
- [ ] Add webhook test panel: send test request from UI [2h]

---

## SECTION 25 — SCHEDULE TRIGGER FULL IMPLEMENTATION
### Estimated: 2-3 days | Owner: Backend + Frontend Team

- [ ] Verify scheduler/index.ts: loads all active schedule triggers on startup [2h]
- [ ] Verify cron expression parsing and validation [1h]
- [ ] Verify timezone support for all schedule triggers [2h]
- [ ] Verify schedule trigger fires workflow at correct time [2h]
- [ ] Add visual cron builder: select minute/hour/day/month/weekday visually [3h]
- [ ] Add human-readable cron description: "Every day at 9:00 AM UTC" [1h]

---

## SECTION 26 — ERROR HANDLING & RETRY SYSTEM
### Estimated: 3-4 days | Owner: Backend Team

- [ ] Verify error_trigger schema: has errorMessage, errorCode, workflowId, nodeId fields [1h]
- [ ] Verify error_trigger fires when any node in workflow fails [2h]
- [ ] Add retryOnFail, maxRetries, retryInterval fields to all node schemas [3h]
- [ ] Implement retry logic in dynamic-node-executor.ts [3h]
- [ ] Add continueOnFail option to workflow settings [2h]
- [ ] Add dead letter queue: failed executions stored for manual retry [2h]

---

## SECTION 27 — MULTI-TENANT & USER MANAGEMENT
### Estimated: 3-4 days | Owner: Backend Team

- [ ] Verify all workflow queries filter by user_id [2h]
- [ ] Verify all credential queries filter by user_id [2h]
- [ ] Verify RLS policies on all Supabase tables [3h]
- [ ] Add workspace/team support: multiple users share workflows [4h]
- [ ] Verify ai-editor-rbac.ts: roles=[admin, editor, viewer] [2h]
- [ ] Add workflow sharing: share workflow with specific users [3h]
- [ ] Add execution count limit per plan [2h]
- [ ] Add active trigger limit per plan [1h]

---

## SECTION 28 — OBSERVABILITY & MONITORING
### Estimated: 3-4 days | Owner: Backend Team

- [ ] Verify execution-event-logger.ts logs all node executions [2h]
- [ ] Add structured logging: JSON format with nodeId, nodeType, duration, status [2h]
- [ ] Add execution metrics: p50/p95/p99 latency per node type [2h]
- [ ] Add workflow health page: shows all workflows with status [2h]
- [ ] Add failed execution alerts: notify user when workflow fails repeatedly [2h]
- [ ] Add workflow debug mode: step-by-step execution with pause [4h]
- [ ] Add expression tester: test {{$json.field}} expressions against sample data [2h]

---

## SECTION 29 — AI WORKFLOW GENERATION — ADVANCED
### Estimated: 4-5 days | Owner: Backend Team

- [ ] Verify AI can generate workflows with 10+ nodes correctly [2h]
- [ ] Verify AI generates correct branching workflows (if/else, switch) [2h]
- [ ] Add workflow edit via chat: "add a filter before the Gmail node" [4h]
- [ ] Add node addition via chat: "add a Slack notification after the Sheets node" [3h]
- [ ] Verify workflow-explanation-service.ts generates human-readable explanation [2h]
- [ ] Add "You might also want to add..." suggestions after workflow generation [3h]

---

## SECTION 30 — NODE-SPECIFIC MISSING IMPLEMENTATIONS
### Estimated: 6-8 days | Owner: Backend Team

- [ ] Verify execute-workflow-vm2-replacement.ts: JavaScript node sandbox is secure and functional [3h]
- [ ] Implement real Snowflake executor: connect to Snowflake, run queries [3h]
- [ ] Implement real SQL Server executor: connect via mssql, run queries [3h]
- [ ] Implement real FTP/SFTP executor [3h]
- [ ] Audit nodeTypes.ts for nodes that have no backend executor — list all gaps [2h]
- [ ] Implement google_contacts executor: list, get, create, update, delete [3h]
- [ ] Implement google_bigquery executor: query, insert, create_table [3h]
- [ ] Implement activecampaign executor: full API implementation [3h]
- [ ] Verify every node has a complete outputSchema in unified-node-registry.ts [3h]

---

## SECTION 31 — FRONTEND MISSING PAGES & COMPONENTS
### Estimated: 4-5 days | Owner: Frontend Team

- [ ] Add Workflow Analytics page: execution stats, success rate, most used nodes [3h]
- [ ] Add Agent Playground page: test agent without full workflow [4h]
- [ ] Add API Keys page: manage programmatic access keys [2h]
- [ ] Add Webhook Logs page: view all incoming webhook requests [2h]
- [ ] Add Trigger History page: view all trigger fires across all workflows [2h]
- [ ] Add ExpressionBuilder component: visual builder for {{$json.field}} expressions [4h]
- [ ] Add NodeDocumentation component: shows node docs inline in PropertiesPanel [2h]
- [ ] Add WorkflowMiniMap component: mini overview of large workflows [2h]

---

## SECTION 32 — SECURITY HARDENING
### Estimated: 3-4 days | Owner: Backend Team

- [ ] Add input sanitization to all API routes: prevent XSS, SQL injection [3h]
- [ ] Validate all node config fields before execution [2h]
- [ ] Sanitize JavaScript node code: prevent access to process, require, fs [3h]
- [ ] Verify all credentials are encrypted at rest using AES-256 [2h]
- [ ] Verify credentials are never logged or exposed in error messages [2h]
- [ ] Sandbox JavaScript node execution: use vm2 or isolated-vm [3h]
- [ ] Add execution timeout: kill workflows running longer than 5 minutes [2h]
- [ ] Prevent SSRF in HTTP request node: block internal IP ranges [2h]
- [ ] Add audit log for all workflow executions [2h]

---

## UPDATED GRAND TOTAL ESTIMATE

| Priority | Section | Description | Days |
|----------|---------|-------------|------|
| P0 CRITICAL | Sec 1A | Architecture Violation Fixes (edges.push, hardcoded types) | 2-3d |
| P0 CRITICAL | Sec 1.2-1.3 | Registry type contract fixes (isTrigger field, agents category, agent ports) | 2-3d |
| P0 CRITICAL | Sec 3 | Agent Core Architecture (types, wiring, ReAct loop) | 10-12d |
| P0 CRITICAL | Sec 2.1 | Trigger Infrastructure (polling service, webhook registry, DB tables) | 3-4d |
| P1 HIGH | Sec 1.1, 1.4 | Registry Integrity Audit | 6-8d |
| P1 HIGH | Sec 6 | Agent Execution Engine Integration | 8-10d |
| P1 HIGH | Sec 7 | Node Executors Verification | 12-15d |
| P1 HIGH | Sec 2.2-2.30 | Trigger Nodes (30 integrations) | 12-14d |
| P2 MEDIUM | Sec 4 | Agent Sub-Nodes Implementation | 8-10d |
| P2 MEDIUM | Sec 5 | Agent Frontend UI | 6-8d |
| P2 MEDIUM | Sec 8 | Node Frontend UI | 8-10d |
| P2 MEDIUM | Sec 9 | Credentials & OAuth | 6-8d |
| P2 MEDIUM | Sec 18 | WhatsApp & Instagram | 5-6d |
| P2 MEDIUM | Sec 19 | Ollama & AI Model Nodes | 4-5d |
| P2 MEDIUM | Sec 22 | Chatbot Workflows | 4-5d |
| P2 MEDIUM | Sec 23 | Form Trigger | 3-4d |
| P2 MEDIUM | Sec 24 | Webhook Trigger | 2-3d |
| P2 MEDIUM | Sec 25 | Schedule Trigger | 2-3d |
| P3 NORMAL | Sec 10 | API Routes | 4-5d |
| P3 NORMAL | Sec 11 | Execution Pipeline | 5-6d |
| P3 NORMAL | Sec 12 | AI Generation Alignment | 5-6d |
| P3 NORMAL | Sec 13 | Testing | 10-12d |
| P3 NORMAL | Sec 14 | Database Schema | 3-4d |
| P3 NORMAL | Sec 20 | Workflow Versioning | 3-4d |
| P3 NORMAL | Sec 21 | Templates System | 3-4d |
| P3 NORMAL | Sec 26 | Error Handling & Retry | 3-4d |
| P3 NORMAL | Sec 27 | Multi-Tenant & Users | 3-4d |
| P3 NORMAL | Sec 28 | Observability | 3-4d |
| P3 NORMAL | Sec 29 | AI Generation Advanced | 4-5d |
| P3 NORMAL | Sec 30 | Missing Node Implementations | 6-8d |
| P3 NORMAL | Sec 31 | Frontend Missing Pages | 4-5d |
| P4 FUTURE | Sec 15 | New Integrations (20 nodes) | 8-10d |
| P4 FUTURE | Sec 16 | Performance | 4-5d |
| P4 FUTURE | Sec 17 | Documentation | 3-4d |
| P4 FUTURE | Sec 32 | Security Hardening | 3-4d |
| **TOTAL** | **All Sections** | | **~190-240 working days** |

---

## RECOMMENDED SPRINT PLAN (2-week sprints, 8-person team)

- **Sprint 1** — Architecture violations (Sec 1A) + Registry type contract fixes (Sec 1.2-1.3) + Registry audit (Sec 1.1)
- **Sprint 2** — Trigger Infrastructure (Sec 2.1) + Agent data model & types (Sec 3.1)
- **Sprint 3-4** — Agent wiring + ReAct loop + tool description generator (Sec 3.2-3.5)
- **Sprint 5-6** — Agent execution engine (Sec 6) + Agent sub-nodes (Sec 4) + Node executors batch 1 (Sec 7.1-7.5)
- **Sprint 7-8** — Agent Frontend UI (Sec 5) + Trigger Nodes batch 1 (Sec 2.2-2.15) + Node executors batch 2 (Sec 7.6-7.11)
- **Sprint 9-10** — Trigger Nodes batch 2 (Sec 2.16-2.30) + WhatsApp/Instagram (Sec 18) + AI Model Nodes (Sec 19)
- **Sprint 11-12** — Node Frontend UI (Sec 8) + Credentials (Sec 9) + Chatbot (Sec 22) + Form/Webhook/Schedule (Sec 23-25)
- **Sprint 13-14** — API Routes (Sec 10) + Execution Pipeline (Sec 11) + AI Generation (Sec 12) + Database (Sec 14)
- **Sprint 15-16** — Testing (Sec 13) + Error Handling (Sec 26) + Versioning (Sec 20) + Templates (Sec 21)
- **Sprint 17-18** — Missing Nodes (Sec 30) + Frontend Pages (Sec 31) + Observability (Sec 28) + Multi-Tenant (Sec 27)
- **Sprint 19-20** — New Integrations (Sec 15) + Performance (Sec 16) + Security (Sec 32) + Documentation (Sec 17)

---

## RECOMMENDED TEAM STRUCTURE
- 2 Senior Backend Engineers: Agent core, execution engine, trigger infrastructure, architecture violations
- 2 Backend Engineers: Node executors, API routes, database, credentials
- 2 Frontend Engineers: Agent UI, node UI, canvas, properties panel
- 1 QA Engineer: Testing all sections
- 1 DevOps Engineer: Performance, security, observability
