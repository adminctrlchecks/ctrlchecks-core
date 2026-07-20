# Requirements Document

## Introduction

CtrlChecks is an open-source AI workflow automation platform (n8n-style, 2026 architecture). This document covers the full platform implementation: architecture violation fixes, registry type contracts, trigger infrastructure (30+ trigger nodes), agent core (ReAct loop, memory, tools), execution engine, frontend UI, credentials/OAuth, API routes, database schema, and testing. The platform is built on two non-negotiable architectural pillars — UnifiedNodeRegistry as the single source of truth for all node behavior, and UnifiedGraphOrchestrator as the sole authority over all edge creation and removal.

## Glossary

- **Platform**: The CtrlChecks AI workflow automation system.
- **UnifiedNodeRegistry**: Single source of truth for all node schemas, inputs, outputs, credentials, and execution behavior (`worker/src/core/registry/unified-node-registry.ts`).
- **UnifiedGraphOrchestrator**: Sole authority for all workflow edge creation, removal, and validation (`worker/src/core/orchestration/unified-graph-orchestrator.ts`).
- **UnifiedNodeDefinition**: TypeScript interface defining the contract every node must satisfy (`worker/src/core/types/unified-node-contract.ts`).
- **DAG**: Directed Acyclic Graph — the structural model for all workflows. Must be acyclic, fully connected from trigger to terminal, with no orphan nodes.
- **TriggerNode**: A node with `isTrigger: true`, `incomingPorts: []`, and exactly one outgoing port. Entry point of a workflow.
- **AgentNode**: An `ai_agent` node in the `agents` category that executes a ReAct-style reasoning loop using a connected LLM, optional memory, and optional tools.
- **AgentSubNode**: A node with `isAgentSubNode: true` (e.g., `chat_model`, `memory`, `tool`) that connects to an AgentNode via a typed `ai_*` targetHandle edge.
- **TriggerPollingService**: Background service that polls active trigger nodes at their configured `pollingInterval`.
- **TriggerWebhookRegistry**: Service that maps incoming webhook URLs to workflow and trigger node IDs.
- **TriggerExecutionBridge**: Service that fires workflow execution when a trigger activates, passing trigger output as the initial node input.
- **EdgeReconciliationEngine**: Engine within UnifiedGraphOrchestrator that derives and normalizes edges from the node execution order.
- **ExecutionOrderManager**: Component that computes topological execution order for a workflow DAG.
- **DynamicNodeExecutor**: Execution engine component that always fetches node behavior from UnifiedNodeRegistry before executing.
- **ReAct Loop**: Reasoning + Acting loop used by AgentExecutor: observe input → think (LLM) → optionally call a tool → observe result → repeat until final answer or max iterations.
- **SSE**: Server-Sent Events — streaming protocol used to push agent thought steps and partial outputs to the frontend.
- **RLS**: Row-Level Security — Supabase/PostgreSQL policy ensuring users can only access their own data rows.
- **ARCH-VIOLATION**: An active code pattern that contradicts core architecture rules (e.g., `workflow.edges.push()` outside the orchestrator).
- **Canonical Node Type**: A node type string registered in UnifiedNodeRegistry as the authoritative identifier (e.g., `google_gmail`, `ai_agent`).
- **ai_languageModel**: Typed `targetHandle` value on edges connecting a `chat_model` sub-node to an `ai_agent` node.
- **ai_memory**: Typed `targetHandle` value on edges connecting a `memory` sub-node to an `ai_agent` node.
- **ai_tool**: Typed `targetHandle` value on edges connecting a `tool` sub-node to an `ai_agent` node.
- **Cursor**: Persistent pointer (timestamp or item ID) stored in `trigger_state` enabling deduplication — TriggerPollingService only fires items newer than the cursor.
- **OAuth2**: Authorization protocol used for credential flows with Google, Slack, GitHub, HubSpot, Salesforce, and other third-party services.
- **PropertiesPanel**: Frontend sidebar component that renders a node's configuration form based on its `inputSchema` from UnifiedNodeRegistry.
- **WorkflowCanvas**: Frontend React Flow canvas where users visually build and inspect workflows.
- **NodeLibrary**: Frontend sidebar panel listing all available node types grouped by category.
- **ExecutionConsole**: Frontend panel displaying real-time execution logs, node outputs, and agent thought streams.
- **AgentExecutor**: Backend service that runs the ReAct loop for `ai_agent` nodes.
- **MemoryManager**: Backend service that manages agent session memory across window_buffer, summary, vector_store, and redis backends.


## Requirements

---

### Requirement 1: Architecture Violation Fixes (P0 CRITICAL)

**User Story:** As a platform engineer, I want all direct `workflow.edges` mutations removed from feature code, so that the UnifiedGraphOrchestrator remains the sole authority over edge state and no workflow can be silently corrupted by bypassing it.

#### Acceptance Criteria

1. THE Platform SHALL contain zero occurrences of `workflow.edges.push(...)` outside of `unified-graph-orchestrator.ts`.
2. THE Platform SHALL contain zero occurrences of `workflow.edges = [...]` or `workflow.edges.filter(...)` mutations outside of `unified-graph-orchestrator.ts`.
3. WHEN `workflow-graph-sanitizer.ts` needs to add a trigger-to-first-node edge, THE Platform SHALL call `unifiedGraphOrchestrator.reconcileWorkflow(workflow)` instead of pushing directly.
4. WHEN `workflow-policy-enforcer-v2.ts` needs to enforce trigger policy, THE Platform SHALL call `unifiedGraphOrchestrator.reconcileWorkflow(workflow)` to wire the trigger rather than pushing an edge directly.
5. WHEN `workflow-policy-enforcer-v2.ts` needs to remove self-loop edges, THE Platform SHALL collect the self-loop edge IDs and call `unifiedGraphOrchestrator.removeEdges(workflow, ids)`.
6. WHEN `workflow-policy-enforcer-v2.ts` needs to reconnect an orphaned node, THE Platform SHALL call `unifiedGraphOrchestrator.injectNode()` followed by `reconcileWorkflow()`.
7. THE Platform SHALL contain zero occurrences of `if (node.type === '...')` or `switch (node.type)` string comparisons in `workflow-builder.ts` for routing agent sub-node wiring.
8. WHEN `workflow-builder.ts` needs to identify an agent sub-node, THE Platform SHALL call `unifiedNodeRegistry.get(nodeType)?.isAgentSubNode` instead of comparing type strings.
9. WHEN `workflow-builder.ts` needs to identify an agent node, THE Platform SHALL call `unifiedNodeRegistry.getCategory(nodeType) === 'agents'` instead of comparing type strings.
10. WHEN agent sub-node edges are created in `workflow-builder.ts`, THE Platform SHALL use typed targetHandle values (`ai_languageModel`, `ai_memory`, `ai_tool`) routed through `unifiedGraphOrchestrator.injectNode()`.
11. WHEN `workflow-policy-enforcer-v2.ts` needs to identify trigger node types, THE Platform SHALL call `unifiedNodeRegistry.isTrigger(type)` instead of comparing against a hardcoded string array.
12. FOR ALL refactored files, THE Platform SHALL pass all existing tests after the architecture violation fixes are applied.


---

### Requirement 2: Registry Type Contract Completeness (P0 CRITICAL)

**User Story:** As a platform engineer, I want the `UnifiedNodeDefinition` interface to have complete, explicit type fields for triggers and agent nodes, so that all registry consumers can rely on the type contract rather than runtime method calls or string comparisons.

#### Acceptance Criteria

1. THE UnifiedNodeDefinition SHALL include an `isTrigger: boolean` field in its core identity section.
2. THE UnifiedNodeDefinition SHALL include a `pollingInterval?: number` field (seconds between polls, applicable to trigger nodes only).
3. THE UnifiedNodeDefinition SHALL include a `webhookSupported?: boolean` field (applicable to trigger nodes only).
4. THE UnifiedNodeDefinition SHALL include `'agents'` in its `category` union type alongside existing categories.
5. THE UnifiedNodeDefinition SHALL include an `isAgentSubNode?: boolean` optional metadata field with a code comment stating that the edge `targetHandle` is the authoritative signal for execution routing.
6. WHEN the registry's `isTrigger(type)` method is called, THE UnifiedNodeRegistry SHALL read the `isTrigger` field from the node definition rather than using a separate lookup.
7. THE Platform SHALL set `isTrigger: true` on all trigger node definitions: `manual_trigger`, `webhook`, `schedule`, `interval`, `form`, `chat_trigger`, `error_trigger`, `workflow_trigger`, and all 30 integration trigger nodes.
8. THE Platform SHALL register `ai_agent` with `category: 'agents'` and `isAgentSubNode: false`.
9. THE Platform SHALL register `chat_model`, `memory`, and `tool` with `category: 'agents'` and `isAgentSubNode: true`.
10. THE UnifiedNodeRegistry SHALL expose a `getAgentSubNodes(agentNodeId, workflow)` helper that derives sub-node connections by filtering `workflow.edges` where `target === agentNodeId` AND `targetHandle` matches `/^ai_/`, returning `{ subNodeId, portType }[]` with no `parentAgentNodeId` stored anywhere.
11. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL pass `validateIntegrity()` at startup with zero missing or malformed definitions.


---

### Requirement 3: Registry Integrity — All 60+ Nodes (P1 HIGH)

**User Story:** As a platform engineer, I want every node registered in UnifiedNodeRegistry to have a complete, verified contract, so that the dynamic executor can run any node without falling back to hardcoded logic.

#### Acceptance Criteria

1. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide a non-null `inputSchema` with all required fields declared.
2. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide a non-null `outputSchema` describing the shape of the node's output data.
3. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide a `credentialSchema` (may be empty for nodes requiring no credentials).
4. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide a `defaultConfig()` factory that returns an object with no `undefined` fields.
5. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide an `execute()` function that delegates to the legacy executor or has a direct implementation.
6. FOR ALL canonical node types, THE UnifiedNodeRegistry SHALL provide a `validateConfig()` function that returns errors for missing required fields.
7. THE UnifiedNodeRegistry SHALL set `isBranching: true` exclusively on `if_else` and `switch` node definitions.
8. THE UnifiedNodeRegistry SHALL set `workflowBehavior.alwaysTerminal: true` and `workflowBehavior.alwaysRequired: true` exclusively on the `log_output` node definition.
9. THE UnifiedNodeRegistry SHALL set `outgoingPorts: ['true', 'false']` on `if_else`, `outgoingPorts: ['case_1'...'case_N']` on `switch`, and `outgoingPorts: ['output']` on all other non-trigger nodes.
10. THE UnifiedNodeRegistry SHALL set `incomingPorts: []` on all trigger nodes, `incomingPorts: ['input', 'input2']` on `merge`, and `incomingPorts: ['input']` on all other non-trigger nodes.
11. WHEN the ALIAS_MAP in UnifiedNodeRegistry is evaluated, THE UnifiedNodeRegistry SHALL resolve every alias to a registered canonical type with no dangling references.
12. WHEN `nodeTypes.ts` (frontend) is cross-checked against `node-library.ts` (backend), THE Platform SHALL have zero frontend node types that lack a corresponding backend registration.


---

### Requirement 4: Trigger Infrastructure (P0 CRITICAL)

**User Story:** As a workflow author, I want to activate trigger nodes that automatically fire my workflow when external events occur, so that I can build event-driven automations without manual intervention.

#### Acceptance Criteria

1. THE Platform SHALL implement a `TriggerPollingService` that loads all rows from `active_triggers` on startup and begins polling loops for each active trigger at its configured `pollingInterval`.
2. THE Platform SHALL implement a `TriggerWebhookRegistry` that maps incoming webhook URLs to `{ workflowId, nodeId, config }` and supports register/deregister operations when triggers are activated or deactivated.
3. THE Platform SHALL implement a `TriggerExecutionBridge` that, when a trigger fires, calls the existing unified execution engine with the trigger's output as the initial node input.
4. THE Platform SHALL create a `trigger_state` database table with columns: `id`, `workflow_id`, `node_id`, `trigger_type`, `last_checked_at`, `last_item_id`, `cursor`, `is_active`, `created_at`, `updated_at`; with indexes on `(workflow_id, node_id)` and `(is_active)`; and RLS policies restricting access to the owning user.
5. THE Platform SHALL create an `active_triggers` database table with columns: `id`, `workflow_id`, `node_id`, `trigger_type`, `config_json`, `is_active`, `created_at`, `updated_at`; with indexes on `(workflow_id)` and `(is_active, trigger_type)`; and RLS policies restricting access to the owning user.
6. WHEN TriggerPollingService polls a trigger, THE TriggerPollingService SHALL compare new items against the stored `cursor` in `trigger_state` and only fire items with IDs or timestamps newer than the cursor.
7. WHEN TriggerPollingService successfully processes a poll, THE TriggerPollingService SHALL update `last_checked_at` and `cursor` in `trigger_state`.
8. WHEN a trigger is activated via `POST /api/triggers/activate`, THE Platform SHALL insert a row into `active_triggers` and start polling or register the webhook.
9. WHEN a trigger is deactivated via `POST /api/triggers/deactivate`, THE Platform SHALL set `is_active: false` in `active_triggers` and stop polling or remove the webhook registration.
10. WHEN `POST /api/triggers/test` is called, THE Platform SHALL fire the trigger once and return sample output without persisting cursor state.
11. WHEN `GET /api/triggers/status/:workflowId` is called, THE Platform SHALL return all trigger states for the workflow including `last_checked_at`, `cursor`, `is_active`, and any error.
12. WHEN a webhook request arrives at `POST /api/trigger-webhook/:triggerId`, THE Platform SHALL look up the trigger in TriggerWebhookRegistry and call TriggerExecutionBridge.
13. WHEN UnifiedGraphOrchestrator validates a workflow, THE UnifiedGraphOrchestrator SHALL reject any workflow where a TriggerNode has one or more incoming edges.
14. IF the same external item is received in two consecutive polls, THEN THE TriggerPollingService SHALL fire the workflow exactly once for that item (deduplication guarantee).


---

### Requirement 5: Integration Trigger Nodes — 30 Nodes (P1 HIGH)

**User Story:** As a workflow author, I want trigger nodes for all major SaaS platforms, so that my workflows start automatically when events happen in Gmail, Slack, GitHub, Notion, Stripe, and other services I use.

#### Acceptance Criteria

1. THE Platform SHALL implement a `google_gmail_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_email, new_email_matching_filter, new_labeled_email, new_attachment]`, and output schema `{ id, threadId, from, to, subject, body, snippet, date, labels, attachments }`.
2. THE Platform SHALL implement a `google_sheets_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_row, row_updated, new_spreadsheet]`, and output schema `{ rowData, rowNumber, spreadsheetId }`.
3. THE Platform SHALL implement a `slack_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[new_message, new_channel_message, new_mention, new_reaction, new_member_joined]`, and output schema `{ channel, user, text, timestamp, thread_ts, event_type }`.
4. THE Platform SHALL implement a `github_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[push, pull_request_opened, pull_request_merged, issue_opened, issue_closed, star, fork, release_published]`.
5. THE Platform SHALL implement a `notion_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_page, updated_page, new_database_item, updated_database_item]`.
6. THE Platform SHALL implement an `airtable_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_record, updated_record]`.
7. THE Platform SHALL implement a `hubspot_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[new_contact, new_deal, deal_stage_changed, new_company, contact_property_changed]`.
8. THE Platform SHALL implement a `stripe_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[payment_intent.succeeded, payment_intent.failed, customer.created, subscription.created, charge.refunded, invoice.paid]`.
9. THE Platform SHALL implement a `shopify_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[orders/create, orders/updated, orders/fulfilled, customers/create, products/create]`.
10. THE Platform SHALL implement a `jira_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[issue_created, issue_updated, issue_transitioned, comment_added]`.
11. THE Platform SHALL implement a `salesforce_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_lead, lead_converted, new_opportunity, opportunity_stage_changed, new_case]`.
12. THE Platform SHALL implement a `pipedrive_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[deal_added, deal_updated, deal_won, deal_lost, person_added, activity_added]`.
13. THE Platform SHALL implement a `typeform_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[new_response]`.
14. THE Platform SHALL implement a `calendly_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[invitee.created, invitee.canceled]`.
15. THE Platform SHALL implement a `clickup_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[task_created, task_updated, task_status_changed, comment_posted]`.
16. THE Platform SHALL implement a `twitter_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_mention, new_follower, new_tweet_by_user]`.
17. THE Platform SHALL implement a `linkedin_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[new_connection, new_message, new_comment_on_post]`.
18. THE Platform SHALL implement a `supabase_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[row_inserted, row_updated, row_deleted]`.
19. THE Platform SHALL implement a `mongodb_trigger` node with `isTrigger: true`, `pollingInterval: 30`, events `[new_document, updated_document]` using change streams.
20. THE Platform SHALL implement a `mailchimp_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[subscribe, unsubscribe, campaign_sent, email_opened]`.
21. THE Platform SHALL implement a `twilio_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[incoming_sms, incoming_call, call_completed]`.
22. THE Platform SHALL implement a `google_calendar_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[event_created, event_updated, event_starting_soon]`.
23. THE Platform SHALL implement a `microsoft_teams_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[new_message, new_channel_message, new_mention]`.
24. THE Platform SHALL implement an `aws_s3_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[object_created, object_deleted]`.
25. THE Platform SHALL implement a `dropbox_trigger` node with `isTrigger: true`, `pollingInterval: 60`, events `[file_added, file_modified, folder_created]`.
26. THE Platform SHALL implement a `freshdesk_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[ticket_created, ticket_updated, ticket_resolved]`.
27. THE Platform SHALL implement an `intercom_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[conversation_created, conversation_replied, user_created]`.
28. THE Platform SHALL implement a `whatsapp_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[message_received, message_status_updated]`.
29. THE Platform SHALL implement an `instagram_trigger` node with `isTrigger: true`, `webhookSupported: true`, events `[new_comment, new_mention, new_follower]`.
30. WHEN a webhook-based trigger receives a request with a vendor-specific signature header (e.g., `X-Hub-Signature-256` for GitHub, `Stripe-Signature` for Stripe), THE TriggerWebhookRegistry SHALL verify the signature and reject requests with invalid signatures with HTTP 401.
31. FOR ALL 30 integration trigger nodes, THE Platform SHALL register each node in UnifiedNodeRegistry with complete `inputSchema`, `outputSchema`, `credentialSchema`, `defaultConfig()`, and `execute()`.
32. FOR ALL 30 integration trigger nodes, THE Platform SHALL add the node to `nodeTypes.ts` (frontend) and display it in the NodeLibrary under the `triggers` category.


---

### Requirement 6: Built-in Trigger Nodes (P2 MEDIUM)

**User Story:** As a workflow author, I want built-in trigger nodes (webhook, schedule, form, chat) that work without external service credentials, so that I can build workflows triggered by HTTP calls, time schedules, form submissions, and chat messages.

#### Acceptance Criteria

1. THE Platform SHALL implement a `webhook` trigger node with `isTrigger: true`, `webhookSupported: true`, configurable `path` and `httpMethod`, and output schema `{ headers, body, query, params }`.
2. THE Platform SHALL implement a `schedule` trigger node with `isTrigger: true`, configurable `cron` expression and `timezone`, firing at each scheduled time.
3. THE Platform SHALL implement an `interval` trigger node with `isTrigger: true`, configurable `interval` and `unit` (seconds/minutes/hours), firing repeatedly at the specified interval.
4. THE Platform SHALL implement a `form` trigger node with `isTrigger: true`, `webhookSupported: true`, configurable `formTitle` and `fields` array, rendering a hosted form and outputting submitted field values.
5. THE Platform SHALL implement a `chat_trigger` node with `isTrigger: true`, configurable `sessionId` and `message` fields, acting as the entry point for chatbot workflows.
6. THE Platform SHALL implement an `error_trigger` node with `isTrigger: true`, configurable `errorMessage` and `workflowId` fields, firing when a specified workflow encounters an error.
7. THE Platform SHALL implement a `workflow_trigger` node with `isTrigger: true`, configurable `sourceWorkflowId` field, firing when another workflow completes.
8. WHEN a `respond_to_webhook` node is present in a workflow started by a `webhook` trigger, THE Platform SHALL return the node's configured HTTP response to the original webhook caller.


---

### Requirement 7: Agent Core — AgentNode Schema and Wiring (P0 CRITICAL)

**User Story:** As a workflow author, I want to place an AI Agent node on the canvas and connect a language model, optional memory, and optional tools to it via typed ports, so that the agent can reason and act autonomously within my workflow.

#### Acceptance Criteria

1. THE Platform SHALL define an `ai_agent` node schema with fields: `systemPrompt`, `maxIterations`, `agentType` (options: `tools_agent`, `react_agent`, `plan_execute_agent`), `returnIntermediateSteps`, and `passthroughBinaryImages`.
2. THE Platform SHALL define a `chat_model` node schema with fields: `provider` (OpenAI/Anthropic/Google/Ollama), `model`, `apiKey`, `temperature`, `maxTokens`, `topP`, `frequencyPenalty`, `streaming`.
3. THE Platform SHALL define a `memory` node schema with fields: `memoryType` (options: `window_buffer`, `summary`, `vector_store`, `redis`), `sessionId`, `windowSize`, `returnMessages`.
4. THE Platform SHALL define a `tool` node schema with fields: `toolType`, `toolNodeId`, `toolName`, `toolDescription`, `toolParameters` (JSON schema string).
5. WHEN a `chat_model` node is connected to an `ai_agent` node, THE UnifiedGraphOrchestrator SHALL store the edge with `targetHandle: 'ai_languageModel'` in the main `workflow.edges` array.
6. WHEN a `memory` node is connected to an `ai_agent` node, THE UnifiedGraphOrchestrator SHALL store the edge with `targetHandle: 'ai_memory'` in the main `workflow.edges` array.
7. WHEN a `tool` node is connected to an `ai_agent` node, THE UnifiedGraphOrchestrator SHALL store the edge with `targetHandle: 'ai_tool'` in the main `workflow.edges` array.
8. THE Platform SHALL NOT store agent sub-node relationships in a separate `agent_edges` column or in any node's `config` object — the relationship MUST be derived exclusively from `workflow.edges`.
9. WHEN `getAgentSubNodes(agentNodeId, workflow)` is called, THE UnifiedGraphOrchestrator SHALL return all edges where `target === agentNodeId` AND `targetHandle` matches `/^ai_/`, with no `parentAgentNodeId` field anywhere.
10. WHEN UnifiedGraphOrchestrator validates a workflow containing an `ai_agent` node, THE UnifiedGraphOrchestrator SHALL verify that exactly one `ai_languageModel` edge connects to the agent node.
11. WHEN UnifiedGraphOrchestrator computes execution order, THE ExecutionOrderManager SHALL exclude edges with `ai_*` targetHandle values from the main topological sort, treating them as sub-graph wiring only.


---

### Requirement 8: Agent Execution Engine (P0 CRITICAL / P1 HIGH)

**User Story:** As a workflow author, I want the AI Agent node to execute a ReAct reasoning loop and stream its thought process to the frontend, so that I can observe the agent's reasoning and get results from complex multi-step tasks.

#### Acceptance Criteria

1. THE Platform SHALL implement an `AgentExecutor` service that, when an `ai_agent` node is reached during workflow execution, runs a ReAct loop: observe input → call LLM → parse tool call or final answer → if tool call, execute tool node → feed result back → repeat until final answer or `maxIterations` is reached.
2. WHEN the `AgentExecutor` runs, THE AgentExecutor SHALL retrieve the connected `chat_model` sub-node via `getAgentSubNodes()` and use its configuration to instantiate the LLM client.
3. WHEN the `AgentExecutor` runs and a `memory` sub-node is connected, THE AgentExecutor SHALL use the MemoryManager to load and persist session memory keyed by `sessionId`.
4. WHEN the `AgentExecutor` runs and `tool` sub-nodes are connected, THE AgentExecutor SHALL generate a JSON-schema function description for each tool and pass them to the LLM.
5. WHEN the `AgentExecutor` reaches `maxIterations` without a final answer, THE AgentExecutor SHALL return the last intermediate result with a `max_iterations_reached` flag.
6. WHEN an `ai_agent` node executes with `streaming: true` on the connected `chat_model`, THE Platform SHALL emit agent thought steps and partial LLM tokens via SSE to the connected frontend client.
7. THE Platform SHALL implement session management APIs: `POST /api/agent/sessions` (create), `GET /api/agent/sessions/:id` (get), `DELETE /api/agent/sessions/:id` (clear memory).
8. WHEN the DynamicNodeExecutor encounters a node with `category: 'agents'` and `isAgentSubNode: false`, THE DynamicNodeExecutor SHALL route execution to AgentExecutor rather than the standard node executor.
9. THE MemoryManager SHALL support four memory backends: `window_buffer` (last N messages), `summary` (LLM-summarized history), `vector_store` (embedding-based retrieval), and `redis` (external Redis-backed session).
10. WHEN `returnIntermediateSteps: true` is set on an `ai_agent` node, THE AgentExecutor SHALL include all intermediate tool calls and observations in the node's output alongside the final answer.


---

### Requirement 9: Agent Sub-Nodes — Chat Model, Memory, Tool Executors (P2 MEDIUM)

**User Story:** As a workflow author, I want the chat model, memory, and tool sub-nodes to support multiple providers and backends, so that I can choose the best LLM, memory strategy, and tools for my agent's task.

#### Acceptance Criteria

1. THE Platform SHALL implement a `chat_model` executor supporting providers: OpenAI (gpt-4o, gpt-4-turbo, gpt-3.5-turbo), Anthropic (claude-3-opus, claude-3-sonnet, claude-3-haiku), Google (gemini-1.5-pro, gemini-1.5-flash), and Ollama (any locally hosted model).
2. WHEN a `chat_model` node has `streaming: true`, THE Platform SHALL stream tokens via SSE rather than waiting for the full completion.
3. THE Platform SHALL implement a `memory` executor that, for `window_buffer` type, retains the last `windowSize` message pairs in the session.
4. THE Platform SHALL implement a `memory` executor that, for `summary` type, uses the connected LLM to summarize conversation history when it exceeds the context window.
5. THE Platform SHALL implement a `memory` executor that, for `vector_store` type, stores and retrieves messages using embedding similarity search.
6. THE Platform SHALL implement a `memory` executor that, for `redis` type, persists session messages in an external Redis instance keyed by `sessionId`.
7. THE Platform SHALL implement a `tool` executor that exposes any connected action node's `inputSchema` as a JSON-schema function definition to the AgentExecutor.
8. WHEN the AgentExecutor calls a tool, THE Platform SHALL execute the corresponding action node via DynamicNodeExecutor and return its output to the agent's observation step.


---

### Requirement 10: Workflow DAG Invariants (Non-Negotiable)

**User Story:** As a platform engineer, I want the UnifiedGraphOrchestrator to enforce strict DAG invariants on every workflow, so that no invalid graph can be persisted or executed.

#### Acceptance Criteria

1. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if the workflow contains zero trigger nodes.
2. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if the workflow contains more than one trigger node.
3. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if any non-trigger node is unreachable from the trigger node.
4. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if the workflow graph contains a cycle.
5. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if any node has duplicate incoming edges from the same source.
6. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if an `if_else` node does not have exactly two outgoing edges labeled `true` and `false`.
7. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if a `switch` node has fewer than two outgoing edges.
8. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if a `merge` node has fewer than two incoming edges.
9. WHEN `validateWorkflow()` is called, THE UnifiedGraphOrchestrator SHALL return an error if a trigger node has any incoming edges.
10. WHEN `validateWorkflow()` is called after DSL compilation, THE Platform SHALL treat any validation error as a pipeline contract error and halt execution rather than passing a broken graph downstream.
11. FOR ALL valid workflow DAGs, THE ExecutionOrderManager SHALL produce a topological ordering where every node appears after all its predecessors.
12. FOR ALL valid workflow DAGs, THE EdgeReconciliationEngine SHALL produce an edge set that is consistent with the topological execution order with no missing or extra edges.


---

### Requirement 11: Node Executor Verification — All 60+ Action Nodes (P1 HIGH)

**User Story:** As a workflow author, I want every action node to execute correctly against its target service, so that I can build reliable automations across Google Suite, Slack, CRMs, databases, DevOps tools, and e-commerce platforms.

#### Acceptance Criteria

1. THE Platform SHALL verify and implement all operations for `google_gmail`: `send`, `reply`, `forward`, `read`, `search`, `delete`, `label`, `create_draft`, `get_attachment`.
2. THE Platform SHALL verify and implement all operations for `google_sheets`: `read_rows`, `write_rows`, `append_row`, `update_row`, `delete_row`, `create_sheet`, `clear_range`, `get_sheet_info`.
3. THE Platform SHALL verify and implement all operations for `google_drive`: `upload`, `download`, `list`, `create_folder`, `move`, `copy`, `delete`, `share`, `get_info`.
4. THE Platform SHALL verify and implement all operations for `google_calendar`: `create_event`, `update_event`, `delete_event`, `get_event`, `list_events`, `check_availability`.
5. THE Platform SHALL verify and implement all operations for `slack_message`: `send_message`, `update_message`, `delete_message`, `add_reaction`, `upload_file`, `list_channels`, `get_user`, `invite_user`.
6. THE Platform SHALL verify and implement all operations for `notion`: `create_page`, `update_page`, `get_page`, `delete_page`, `query_database`, `create_database_item`, `update_database_item`, `get_database`.
7. THE Platform SHALL verify and implement all operations for `hubspot`: `create_contact`, `update_contact`, `get_contact`, `delete_contact`, `create_deal`, `update_deal`, `get_deal`, `create_company`, `add_note`.
8. THE Platform SHALL verify and implement all operations for `salesforce`: `create_record`, `update_record`, `get_record`, `delete_record`, `query`, `upsert`, `describe_object`.
9. THE Platform SHALL verify and implement all operations for `github`: `create_issue`, `update_issue`, `get_issue`, `list_issues`, `create_pr`, `merge_pr`, `get_repo`, `list_commits`, `create_release`.
10. THE Platform SHALL verify and implement all operations for `jira`: `create_issue`, `update_issue`, `get_issue`, `transition_issue`, `add_comment`, `search_issues`, `get_project`.
11. THE Platform SHALL verify and implement all operations for `mongodb`: `find`, `find_one`, `insert_one`, `insert_many`, `update_one`, `update_many`, `delete_one`, `delete_many`, `aggregate`, `count`.
12. THE Platform SHALL verify and implement all operations for `postgresql`: `select`, `insert`, `update`, `delete`, `execute_query`, `create_table`, `describe_table`.
13. THE Platform SHALL verify and implement all operations for `redis`: `get`, `set`, `delete`, `exists`, `expire`, `lpush`, `rpush`, `lrange`, `hget`, `hset`, `publish`, `subscribe`.
14. THE Platform SHALL verify and implement all operations for `http_request`: methods `GET`, `POST`, `PUT`, `PATCH`, `DELETE`; auth modes `none`, `basic`, `bearer`, `api_key`, `oauth2`; response types `json`, `text`, `binary`.
15. THE Platform SHALL verify and implement all operations for `stripe`: `create_payment_intent`, `confirm_payment`, `create_customer`, `list_payments`, `create_refund`, `create_subscription`.
16. THE Platform SHALL verify and implement all operations for `shopify`: `get_order`, `list_orders`, `update_order`, `create_product`, `update_product`, `get_customer`, `create_customer`.
17. THE Platform SHALL verify and implement all operations for `if_else` with condition types: `equals`, `not_equals`, `contains`, `not_contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`, `regex_match`.
18. THE Platform SHALL verify and implement `javascript` node with `code` field, `$json` access, `$input` access, async support, and npm module access.
19. THE Platform SHALL verify and implement `whatsapp` action node with operations: `send_message`, `send_template`, `send_media`, `get_message_status`.
20. THE Platform SHALL verify and implement `instagram` action node with operations: `get_media`, `get_profile`, `create_media_container`, `publish_media`, `get_insights`.
21. FOR ALL 60+ action nodes, THE DynamicNodeExecutor SHALL execute the node by fetching its definition from UnifiedNodeRegistry and calling `nodeDef.execute()` with no hardcoded type checks.


---

### Requirement 12: Credentials and OAuth (P2 MEDIUM)

**User Story:** As a workflow author, I want to securely store and manage credentials for all integrated services, so that my nodes can authenticate with external APIs without exposing secrets in workflow configs.

#### Acceptance Criteria

1. THE Platform SHALL implement OAuth2 flows for: Google (Gmail, Sheets, Drive, Calendar, Docs), Slack, GitHub, HubSpot, Salesforce, Pipedrive, Notion, Airtable, Shopify, Microsoft Teams, LinkedIn, Twitter, Instagram, Facebook, Dropbox, OneDrive, Mailchimp, Intercom, Freshdesk, ClickUp, Typeform, Calendly, Stripe, Twilio, WhatsApp.
2. THE Platform SHALL implement API key storage for services that use API keys rather than OAuth2: Airtable (also supports OAuth), OpenAI, Anthropic, Google AI, Jira, MongoDB, PostgreSQL, MySQL, Redis, AWS S3, ActiveCampaign, Zoho CRM, Pipedrive (also supports OAuth), Telegram, Discord.
3. WHEN a node requires credentials, THE Platform SHALL read the required credential categories from `nodeDef.credentialSchema.requirements` in UnifiedNodeRegistry rather than hardcoding credential requirements.
4. THE Platform SHALL implement a credential preflight check that, before workflow execution begins, verifies all required credentials are present and valid for every node in the workflow.
5. IF a required credential is missing before execution, THEN THE Platform SHALL return a descriptive error identifying the node type and missing credential category rather than failing mid-execution.
6. THE Platform SHALL store all credential secrets encrypted at rest using Supabase Vault or equivalent, never in plaintext in the `workflows` table.
7. WHEN an OAuth2 access token expires during execution, THE Platform SHALL automatically refresh the token using the stored refresh token before retrying the failed API call.
8. THE Platform SHALL implement a `GET /api/credentials` endpoint returning all stored credential names and types (never secrets) for the authenticated user.
9. THE Platform SHALL implement `POST /api/credentials`, `PUT /api/credentials/:id`, and `DELETE /api/credentials/:id` endpoints for credential CRUD operations.


---

### Requirement 13: Frontend UI — WorkflowCanvas and Node Rendering (P2 MEDIUM)

**User Story:** As a workflow author, I want a visual canvas where I can drag, drop, connect, and configure nodes, so that I can build complex workflows without writing code.

#### Acceptance Criteria

1. THE WorkflowCanvas SHALL render all workflow nodes and edges using React Flow with positions stored in the workflow's node data.
2. THE WorkflowCanvas SHALL render `ai_agent` nodes with a distinct visual style and display dashed-line edges for `ai_*` targetHandle connections to sub-nodes.
3. THE WorkflowCanvas SHALL render AgentSubNode cards (chat_model, memory, tool) as visually distinct from regular action nodes, positioned below or beside their parent agent node.
4. WHEN a user drags a node from the NodeLibrary onto the canvas, THE WorkflowCanvas SHALL call `unifiedGraphOrchestrator.injectNode()` to add the node and reconcile edges.
5. WHEN a user deletes a node from the canvas, THE WorkflowCanvas SHALL call `unifiedGraphOrchestrator.removeNode()` to remove the node and reconcile edges.
6. WHEN a user connects two nodes on the canvas, THE WorkflowCanvas SHALL call the appropriate UnifiedGraphOrchestrator method to create the edge rather than directly mutating the edge array.
7. THE NodeLibrary SHALL display all registered node types grouped by category (triggers, data, ai, agents, communication, logic, transformation, utility), reading categories from UnifiedNodeRegistry.
8. THE PropertiesPanel SHALL render a configuration form for the selected node based exclusively on the node's `inputSchema` from UnifiedNodeRegistry, with no hardcoded field definitions.
9. THE ExecutionConsole SHALL display real-time execution logs, per-node output data, execution status, and agent thought stream events received via SSE.
10. WHEN an `ai_agent` node is executing with streaming enabled, THE ExecutionConsole SHALL display each thought step and partial token as it arrives via SSE.
11. THE Platform SHALL implement a thought stream panel that shows the agent's ReAct loop steps (Thought, Action, Observation) in a readable timeline format.
12. THE Platform SHALL implement a chat interface for workflows that use a `chat_trigger` node, allowing users to send messages and receive agent responses in a conversational UI.


---

### Requirement 14: Database Schema (P0 CRITICAL / P3 NORMAL)

**User Story:** As a platform engineer, I want all required database tables to exist with correct schemas, indexes, and RLS policies, so that the platform can persist workflow state, trigger state, agent executions, and tool calls securely.

#### Acceptance Criteria

1. THE Platform SHALL have a `workflows` table with `nodes` and `edges` JSONB columns (already exists — must be verified complete).
2. THE Platform SHALL have an `agent_executions` table with RLS and indexes (already exists — must be verified complete).
3. THE Platform SHALL have a `memory_sessions` table (already exists — must be verified complete).
4. THE Platform SHALL create a `trigger_state` table as specified in Requirement 4, Criterion 4.
5. THE Platform SHALL create an `active_triggers` table as specified in Requirement 4, Criterion 5.
6. THE Platform SHALL create an `agent_tool_calls` table with columns: `id`, `agent_execution_id`, `tool_name`, `tool_input` (JSONB), `tool_output` (JSONB), `started_at`, `completed_at`, `error`; with an index on `agent_execution_id`; and RLS policies restricting access to the owning user.
7. FOR ALL new tables, THE Platform SHALL apply RLS policies ensuring users can only read and write rows belonging to their own `user_id` or `tenant_id`.
8. FOR ALL new tables, THE Platform SHALL create indexes on all foreign key columns and all columns used in WHERE clauses in the application code.
9. THE Platform SHALL create all new tables via numbered SQL migration files in `ctrl_checks/sql_migrations/` following the existing naming convention.


---

### Requirement 15: API Routes (P3 NORMAL)

**User Story:** As a frontend developer, I want complete REST API coverage for all platform features, so that the UI can manage workflows, executions, triggers, credentials, agents, and templates without gaps.

#### Acceptance Criteria

1. THE Platform SHALL implement `GET /api/workflows`, `POST /api/workflows`, `GET /api/workflows/:id`, `PUT /api/workflows/:id`, `DELETE /api/workflows/:id` for workflow CRUD.
2. THE Platform SHALL implement `POST /api/workflows/:id/execute` to trigger manual workflow execution.
3. THE Platform SHALL implement `GET /api/executions/:id` and `GET /api/workflows/:id/executions` for execution history.
4. THE Platform SHALL implement trigger management endpoints as specified in Requirement 4, Criteria 8–12.
5. THE Platform SHALL implement credential endpoints as specified in Requirement 12, Criteria 8–9.
6. THE Platform SHALL implement agent session endpoints as specified in Requirement 8, Criterion 7.
7. THE Platform SHALL implement `GET /api/nodes` returning all registered node types with their schemas from UnifiedNodeRegistry.
8. THE Platform SHALL implement `GET /api/templates` and `POST /api/templates` for workflow template management.
9. FOR ALL API endpoints, THE Platform SHALL enforce authentication and return HTTP 401 for unauthenticated requests.
10. FOR ALL API endpoints, THE Platform SHALL enforce tenant isolation so users can only access their own resources.


---

### Requirement 16: Execution Pipeline (P3 NORMAL)

**User Story:** As a platform engineer, I want a unified, registry-driven execution engine that handles all node types consistently, so that adding new nodes never requires changes to the execution engine itself.

#### Acceptance Criteria

1. THE DynamicNodeExecutor SHALL execute every node by calling `unifiedNodeRegistry.get(node.type)` and invoking `nodeDef.execute(context)` with no `if (node.type === ...)` checks.
2. WHEN `nodeDef.execute(context)` is called, THE UnifiedNodeRegistry SHALL resolve all template expressions in the node's config (e.g., `{{$json.field}}`) via the UniversalTemplateResolver before passing config to the legacy executor.
3. THE Platform SHALL implement error handling in the execution pipeline: WHEN a node throws an error, THE Platform SHALL log the error with node ID and type, mark the execution as failed, and surface the error in the ExecutionConsole.
4. THE Platform SHALL implement retry logic: WHERE a node's definition specifies `retryOnFail: true`, THE Platform SHALL retry the node up to `maxRetries` times with exponential backoff before marking it as failed.
5. THE Platform SHALL implement workflow versioning: WHEN a workflow is saved, THE Platform SHALL store the previous version so users can view and restore prior versions.
6. THE Platform SHALL implement workflow templates: WHEN a user saves a workflow as a template, THE Platform SHALL store it in the `templates` table and make it available via `GET /api/templates`.
7. WHEN the AI workflow generator produces a workflow, THE Platform SHALL pass the result through `unifiedGraphOrchestrator.validateWorkflow()` and reject any workflow that fails validation before persisting it.
8. THE Platform SHALL implement the DSL compiler such that after building the node list from DSL, it calls `unifiedGraphOrchestrator.initializeWorkflow(nodes)` once and uses the orchestrator's `workflow.edges` as the single source of truth — never building edges directly from DSL steps.


---

### Requirement 17: AI Workflow Generation Alignment (P3 NORMAL)

**User Story:** As a workflow author, I want the AI workflow generator to produce structurally valid, registry-compliant workflows, so that AI-generated workflows execute correctly without manual fixes.

#### Acceptance Criteria

1. WHEN the AI planner generates a workflow, THE AI Planner SHALL output only `{ type: "nodeName" }` per node and SHALL NOT generate output fields, custom parameters outside the schema, or credential structures.
2. WHEN the WorkflowBuilder hydrates an AI-generated node, THE WorkflowBuilder SHALL call `unifiedNodeRegistry.get(node.type)` and merge `nodeDef.defaultConfig()` with the node's config.
3. THE WorkflowBuilder SHALL NOT contain any `if (node.type === '...')` or `switch (node.type)` logic — all node-specific behavior must come from the registry.
4. WHEN the DSL compiler processes an AI-generated workflow, THE DSL Compiler SHALL call `unifiedGraphOrchestrator.initializeWorkflow(nodes)` to create edges rather than constructing edges from DSL steps.
5. WHEN the AI generator produces a workflow with an `ai_agent` node, THE WorkflowBuilder SHALL wire agent sub-nodes by calling `unifiedGraphOrchestrator.injectNode()` with the correct `ai_*` targetHandle context.
6. FOR ALL AI-generated workflows, THE Platform SHALL call `unifiedGraphOrchestrator.validateWorkflow()` before persisting and return a descriptive error to the user if validation fails.


---

### Requirement 18: Security Hardening (P4 FUTURE)

**User Story:** As a platform operator, I want the platform to be hardened against common attack vectors, so that user workflows and credentials cannot be compromised by malicious inputs or SSRF attacks.

#### Acceptance Criteria

1. THE Platform SHALL sanitize all user-provided input in node configs before execution to prevent injection attacks.
2. WHEN the `javascript` node executes user-provided code, THE Platform SHALL run the code inside a sandboxed environment (e.g., vm2 or isolated-vm) with no access to the host filesystem or process environment.
3. THE Platform SHALL implement SSRF prevention: WHEN an `http_request` node targets a URL, THE Platform SHALL reject requests to private IP ranges (10.x.x.x, 172.16.x.x–172.31.x.x, 192.168.x.x, 127.x.x.x) unless explicitly allowlisted by the operator.
4. THE Platform SHALL implement an audit log table recording all workflow executions, credential accesses, and admin actions with `user_id`, `action`, `resource_id`, `timestamp`, and `ip_address`.
5. WHEN a webhook trigger receives a request, THE TriggerWebhookRegistry SHALL verify the vendor-specific signature header before processing the payload, as specified in Requirement 5, Criterion 30.


---

### Requirement 19: Performance and Scalability (P4 FUTURE)

**User Story:** As a platform operator, I want the execution engine to handle high workflow volumes efficiently, so that the platform can scale to many concurrent users and executions without degradation.

#### Acceptance Criteria

1. THE Platform SHALL implement an LRU cache for UnifiedNodeRegistry lookups so that `unifiedNodeRegistry.get(type)` does not re-parse node definitions on every execution.
2. THE Platform SHALL implement connection pooling for all database connections (PostgreSQL, MySQL, MongoDB, Redis) to avoid connection exhaustion under load.
3. THE Platform SHALL implement an execution queue so that workflow executions are processed asynchronously and do not block the API response.
4. THE Platform SHALL implement horizontal scaling support: WHEN multiple worker instances are running, THE Platform SHALL use the execution queue to distribute work across instances without duplicate execution.
5. THE TriggerPollingService SHALL implement jitter on polling intervals to prevent thundering herd when many triggers have the same `pollingInterval`.


---

### Requirement 20: Observability and Multi-Tenancy (P3 NORMAL)

**User Story:** As a platform operator, I want execution health dashboards and per-tenant isolation, so that I can monitor platform health and ensure one tenant's workflows cannot affect another's.

#### Acceptance Criteria

1. THE Platform SHALL implement execution logging that records, for each node execution: `node_id`, `node_type`, `started_at`, `completed_at`, `status` (success/failed/skipped), `input_data` (JSONB), `output_data` (JSONB), and `error_message`.
2. THE Platform SHALL implement a health dashboard API endpoint `GET /api/health/executions` returning aggregate metrics: total executions, success rate, average duration, and error counts by node type.
3. THE Platform SHALL enforce per-tenant resource limits: maximum concurrent executions, maximum workflow count, and maximum node count per workflow, configurable per tenant.
4. FOR ALL database tables, THE Platform SHALL apply RLS policies ensuring complete tenant isolation — no query can return rows belonging to a different tenant.
5. THE Platform SHALL implement a `GET /api/health` endpoint returning platform status, worker health, and database connectivity.


---

### Requirement 21: Testing — Unit, Integration, and E2E (P3 NORMAL)

**User Story:** As a platform engineer, I want comprehensive test coverage for all platform components, so that regressions are caught automatically and the platform can be refactored with confidence.

#### Acceptance Criteria

1. THE Platform SHALL have unit tests for UnifiedNodeRegistry verifying that every canonical node type has non-null `inputSchema`, `outputSchema`, `credentialSchema`, `defaultConfig()`, and `execute()`.
2. THE Platform SHALL have unit tests for UnifiedGraphOrchestrator verifying all DAG invariants: acyclicity, single trigger, full reachability, correct port degrees for if_else/switch/merge nodes.
3. THE Platform SHALL have unit tests for TriggerPollingService verifying deduplication: given the same item ID in two consecutive polls, the workflow fires exactly once.
4. THE Platform SHALL have unit tests for AgentExecutor verifying the ReAct loop terminates on final answer, terminates on `maxIterations`, and correctly calls tool nodes.
5. THE Platform SHALL have integration tests for all OAuth2 credential flows verifying that tokens are obtained, stored, and refreshed correctly.
6. THE Platform SHALL have integration tests for all 30 trigger nodes verifying that each trigger correctly polls or receives webhooks and passes output to TriggerExecutionBridge.
7. THE Platform SHALL have E2E tests for the complete workflow execution pipeline: trigger fires → nodes execute in order → output logged → execution record persisted.
8. THE Platform SHALL have E2E tests for the agent pipeline: `chat_trigger` → `ai_agent` (with `chat_model` + `memory` + `tool`) → `log_output`.
9. FOR ALL architecture violation fix tests, THE Platform SHALL assert that zero `workflow.edges.push()` calls exist outside `unified-graph-orchestrator.ts` using static analysis.
10. THE Platform SHALL have property-based tests for the DAG invariants: for any randomly generated set of nodes and edges, `validateWorkflow()` correctly identifies all structural violations.
11. THE Platform SHALL have property-based tests for trigger deduplication: for any sequence of poll results containing repeated item IDs, the TriggerPollingService fires each unique item exactly once.
12. THE Platform SHALL have property-based tests for the registry: for any canonical node type, `defaultConfig()` returns an object with no `undefined` values and all required fields present.


---

### Requirement 22: New Integrations — P4 Future Nodes (P4 FUTURE)

**User Story:** As a workflow author, I want additional integration nodes for popular services, so that I can automate workflows across a wider range of tools.

#### Acceptance Criteria

1. THE Platform SHALL implement a `zoom` node with operations: `create_meeting`, `update_meeting`, `delete_meeting`, `list_meetings`, `get_recording`.
2. THE Platform SHALL implement an `asana` node with operations: `create_task`, `update_task`, `get_task`, `list_tasks`, `create_project`, `add_comment`.
3. THE Platform SHALL implement a `monday_com` node with operations: `create_item`, `update_item`, `get_item`, `list_items`, `create_board`.
4. THE Platform SHALL implement a `trello` node with operations: `create_card`, `update_card`, `move_card`, `list_cards`, `create_board`, `add_comment`.
5. THE Platform SHALL implement a `zendesk` node with operations: `create_ticket`, `update_ticket`, `get_ticket`, `list_tickets`, `add_comment`, `close_ticket`.
6. THE Platform SHALL implement a `sendgrid` node with operations: `send_email`, `send_template_email`, `add_contact`, `remove_contact`, `create_list`.
7. FOR ALL new integration nodes, THE Platform SHALL register each node in UnifiedNodeRegistry with complete `inputSchema`, `outputSchema`, `credentialSchema`, `defaultConfig()`, and `execute()` before the node is available in the UI.

