## System Overview (Short Summary)

This repository is a **two-part system**:

- **Frontend** (`ctrl_checks/`, Vite + React): collects a user prompt via `AutonomousAgentWizard.tsx`, streams workflow generation progress, then guides the user through a **unified configuration modal** (runtime inputs + missing credentials) and triggers execution. The frontend manages workflow state transitions (idle → analyzing → questioning → refining → building → confirmation → ready).

- **Backend worker** (`worker/`, Express + Supabase + "Ollama-first" AI services): exposes HTTP APIs to **generate** a workflow graph, **discover** required inputs/credentials, **attach** inputs/credentials to a stored workflow in Supabase, **save** workflows directly, and **execute** the workflow (synchronous with real-time WebSocket updates, or distributed via queue-based workers).

The backend's core orchestration for generation is `WorkflowLifecycleManager.generateWorkflowGraph()` (`worker/src/services/workflow-lifecycle-manager.ts`), which (by default) uses the **new deterministic pipeline** (`workflowPipelineOrchestrator.executePipeline()`), then performs **canonical node-type normalization**, **graph validation/auto-fix**, **credential discovery (post-graph)**, and **required-input discovery (post-graph)** before returning results to the frontend.

**Execution** is handled by `WorkflowOrchestrator.executeWorkflow()` which:
- Performs topological sort for correct node ordering
- Supports checkpoint resume (skips completed nodes on retry)
- Implements per-node retry logic (3 attempts, exponential backoff, 30s timeout)
- Broadcasts real-time updates via WebSocket (`/ws/executions`)
- Handles branching nodes (if_else, switch) with conditional execution paths
- Saves checkpoints after each successful node for failure recovery

**Distributed execution** uses a queue-based architecture with worker pools for scalable, asynchronous processing.

---

## Complete Unified Flowchart (End-to-End System Flow)

```mermaid
flowchart TD
  START([👤 User Enters Prompt])
  
  %% =========================
  %% FRONTEND: User Input
  %% =========================
  START --> WIZARD[Frontend: AutonomousAgentWizard.tsx]
  WIZARD --> MODE{Select Mode}
  
  %% =========================
  %% GENERATION PHASE
  %% =========================
  MODE -->|analyze| ANALYZE[POST /api/generate-workflow<br/>mode=analyze]
  MODE -->|refine| REFINE[POST /api/generate-workflow<br/>mode=refine]
  MODE -->|create| CREATE[POST /api/generate-workflow<br/>mode=create]
  
  ANALYZE --> ANALYZE_RESP[Return: questions, summary, nodeOptions]
  REFINE --> REFINE_RESP[Return: refinedPrompt, requirements, requiredCredentials]
  
  CREATE --> VALIDATE_PROMPT{Valid Prompt?}
  VALIDATE_PROMPT -->|No| ERR400[HTTP 400: Invalid Prompt]
  VALIDATE_PROMPT -->|Yes| MEMORY[Memory System: buildContext<br/>similarPatterns - best effort]
  
  MEMORY --> LIFECYCLE[WorkflowLifecycleManager.generateWorkflowGraph]
  
  LIFECYCLE --> PLANNER{Smart Planner<br/>Available?}
  PLANNER -->|Yes| PLAN[planWorkflowSpecFromPrompt<br/>non-fatal if fails]
  PLANNER -->|No| RESOLVE[NodeResolver.resolvePrompt]
  PLAN --> RESOLVE
  
  RESOLVE --> PIPELINE_SEL{useNewPipeline?<br/>default: true}
  PIPELINE_SEL -->|Yes| PIPELINE[workflowPipelineOrchestrator.executePipeline]
  PIPELINE_SEL -->|No| LEGACY[agenticWorkflowBuilder.generateFromPrompt]
  
  %% Deterministic Pipeline Steps
  PIPELINE --> P1[STEP 0.5: understandPrompt<br/>confidence check]
  P1 --> P2[STEP 1: structureIntent<br/>default: manual_trigger]
  P2 --> P3[STEP 1.8: normalizeIntent]
  P3 --> P4[STEP 2: buildProductionWorkflow<br/>strict mode, retries]
  P4 --> P5[STEP 2.1: validateAndNormalizeWorkflow]
  P5 --> P6{Mode = analyze?}
  P6 -->|Yes| RETURN_ANALYSIS[Return analysis only]
  P6 -->|No| P7[STEP 4: createConfirmationRequest<br/>waitingForConfirmation]
  P7 --> P8[STEP 5: repairWorkflow]
  P8 --> P9[STEP 5.5: pruneWorkflowGraph<br/>non-fatal]
  P9 --> P10[STEP 6: normalizeEdgeHandles]
  P10 --> P11[STEP 7: detectCredentials]
  P11 --> P12[STEP 8: injectCredentials if provided]
  P12 --> P13[STEP 9: enforcePolicies]
  P13 --> P14[STEP 10: aiValidateWorkflow]
  
  LEGACY --> POST_PROCESS
  P14 --> POST_PROCESS
  
  POST_PROCESS --> FILTER[Filter mentioned_only nodes<br/>unless connected/configured]
  FILTER --> ENSURE[Ensure nodeTypes exist<br/>add from nodeLibrary if missing]
  ENSURE --> CANON[Normalize to canonical types<br/>force node.type='custom']
  CANON --> VALIDATE[workflowValidator.validateAndFix<br/>auto-fix issues]
  VALIDATE --> CANON2[Re-normalize after fixes]
  
  CANON2 --> CRED_DISC[credentialDiscoveryPhase.discoverCredentials<br/>AFTER graph creation<br/>+ vault lookup]
  CRED_DISC --> INPUT_DISC[discoverNodeInputs<br/>scan schemas, skip credentials<br/>special: if_else, gmail]
  
  INPUT_DISC --> GEN_RESP[Return: workflow, nodes, edges<br/>discoveredInputs, discoveredCredentials<br/>phase='ready']
  
  GEN_RESP --> FRONTEND_CONFIG[Frontend: Show Configuration Modal<br/>discoveredInputs + discoveredCredentials]
  
  %% =========================
  %% CONFIGURATION PHASE
  %% =========================
  FRONTEND_CONFIG --> CONFIG_SEL{User Action}
  CONFIG_SEL -->|Save Directly| SAVE_API[POST /api/save-workflow]
  CONFIG_SEL -->|Provide Inputs| ATTACH_INPUTS[POST /api/workflows/:id/attach-inputs]
  CONFIG_SEL -->|Provide Credentials| ATTACH_CREDS[POST /api/workflows/:id/attach-credentials]
  
  %% Save Workflow Flow
  SAVE_API --> SAVE_VAL[Validate + normalize + validateWorkflowForSave]
  SAVE_VAL --> SAVE_DB[(Save to Supabase<br/>workflows table)]
  SAVE_DB --> SAVE_RESP[Return: success, workflow]
  
  %% Attach Inputs Flow
  ATTACH_INPUTS --> AI_VAL[Validate inputs<br/>sanitize credential keys]
  AI_VAL --> AI_AUTH{Authenticated?}
  AI_AUTH -->|No| AI_ERR[401 Unauthorized]
  AI_AUTH -->|Yes| AI_FETCH[(Fetch workflow from DB)]
  AI_FETCH --> AI_PHASE{Phase locked?<br/>block if executing}
  AI_PHASE -->|Yes| AI_ERR409[409 PHASE_LOCKED]
  AI_PHASE -->|No| AI_SET[Set: status='active'<br/>phase='configuring_inputs']
  AI_SET --> AI_NORM[normalizeWorkflowForSave<br/>+ normalizeWorkflowGraph]
  AI_NORM --> AI_INJECT[Inject inputs into node.config<br/>schema-aware, reject credentials]
  AI_INJECT --> AI_VALID[workflowValidator.validateAndFix]
  AI_VALID --> AI_CRED_DISC[credentialDiscoveryPhase.discoverCredentials<br/>auto-inject satisfied OAuth]
  AI_CRED_DISC --> AI_NEXT{Missing Creds?}
  AI_NEXT -->|No| AI_READY[Set: phase='ready_for_execution']
  AI_NEXT -->|Yes| AI_CRED_PHASE[Set: phase='configuring_credentials']
  AI_READY --> AI_DB_SAVE[(Update workflows table<br/>+ versioning + events)]
  AI_CRED_PHASE --> AI_DB_SAVE
  AI_DB_SAVE --> AI_RESP[Return: success, workflow, status, phase, ready]
  
  %% Attach Credentials Flow
  ATTACH_CREDS --> AC_VAL[Validate credentials<br/>allow empty {}]
  AC_VAL --> AC_AUTH{Authenticated?}
  AC_AUTH -->|No| AC_ERR[401 Unauthorized]
  AC_AUTH -->|Yes| AC_FETCH[(Fetch workflow from DB)]
  AC_FETCH --> AC_LOCK{Phase blocked?<br/>executing/running/archived}
  AC_LOCK -->|Yes| AC_ERR409[409 PHASE_LOCKED]
  AC_LOCK -->|No| AC_SET[Set: status='configuring_credentials']
  AC_SET --> AC_NORM[normalizeWorkflowForSave<br/>+ normalizeWorkflowGraph]
  AC_NORM --> AC_DISC[discoverCredentials<br/>filter satisfied vault keys<br/>skip satisfied OAuth]
  AC_DISC --> AC_INJ[workflowLifecycleManager.injectCredentials<br/>map via connectorRegistry]
  AC_INJ --> AC_VALID[validateWorkflowForSave<br/>+ validateExecutionReady]
  AC_VALID --> AC_READY{Ready?}
  AC_READY -->|Yes| AC_READY_PHASE[Set: phase='ready_for_execution'<br/>status='active']
  AC_READY -->|No| AC_CRED_PHASE[Set: phase='configuring_credentials']
  AC_READY_PHASE --> AC_DB_SAVE[(Update workflows table<br/>+ workflow_events: CREDS_ATTACHED, READY)]
  AC_CRED_PHASE --> AC_DB_SAVE
  AC_DB_SAVE --> AC_RESP[Return: success, workflow, validation, ready]
  
  AI_RESP --> EXEC_CHECK{Ready to Execute?}
  AC_RESP --> EXEC_CHECK
  SAVE_RESP --> EXEC_CHECK
  
  %% =========================
  %% EXECUTION PHASE
  %% =========================
  EXEC_CHECK -->|Not Ready| CONFIG_LOOP[Return to Configuration]
  EXEC_CHECK -->|Ready| EXEC_SEL{Execution Type}
  
  EXEC_SEL -->|Synchronous| SYNC_EXEC[POST /api/execute-workflow]
  EXEC_SEL -->|Distributed| DIST_EXEC[POST /api/distributed-execute-workflow]
  
  %% Synchronous Execution Flow
  SYNC_EXEC --> EX_VAL[Validate workflowId]
  EX_VAL --> EX_FETCH[(Fetch workflow from DB)]
  EX_FETCH --> EX_CONFIRM{confirmed=true<br/>OR status='active'?}
  EX_CONFIRM -->|No| EX_FORB[403 Not Confirmed]
  EX_CONFIRM -->|Yes| EX_NORM[normalizeWorkflowForSave<br/>+ normalizeWorkflowGraph<br/>+ cloneWorkflowDefinition]
  EX_NORM --> EX_READY[validateExecutionReady<br/>check inputs/credentials]
  EX_READY --> EX_DISC[discoverCredentials + discoverNodeInputs<br/>+ type mismatch checks]
  EX_DISC --> EX_AUTO{status draft/ready<br/>and no missing?}
  EX_AUTO -->|Yes| EX_AUTO_UPDATE[Auto-update: status='active'<br/>phase='ready_for_execution']
  EX_AUTO -->|No| EX_NOT_READY[400 WORKFLOW_NOT_READY<br/>missing inputs/creds]
  EX_AUTO_UPDATE --> EX_ORCH[WorkflowOrchestrator.executeWorkflow]
  
  EX_ORCH --> EX_INIT[Initialize Execution State<br/>topologicalSort nodes]
  EX_INIT --> EX_CHECKPOINT{Checkpoint<br/>Exists?}
  EX_CHECKPOINT -->|Yes| EX_RESUME[Resume from checkpoint<br/>skip completed nodes]
  EX_CHECKPOINT -->|No| EX_START[Start new execution]
  EX_RESUME --> EX_LOOP
  EX_START --> EX_LOOP
  
  EX_LOOP[For each node in executionOrder]
  EX_LOOP --> EX_NODE_SEL{Node<br/>Completed?}
  EX_NODE_SEL -->|Yes| EX_SKIP[Skip node<br/>use cached output]
  EX_NODE_SEL -->|No| EX_NODE_START[Set node: pending→running<br/>broadcast via WebSocket]
  
  EX_SKIP --> EX_NEXT_NODE{More Nodes?}
  EX_NODE_START --> EX_GET_INPUT[getNodeInput from edges/context<br/>resolve dependencies]
  EX_GET_INPUT --> EX_EXEC[executeWithReliability<br/>retry 3x, exponential backoff<br/>30s timeout]
  
  EX_EXEC --> EX_NODE_TYPE{Node Type}
  EX_NODE_TYPE -->|Trigger| EX_TRIG[manual_trigger, chat_trigger<br/>webhook, schedule, etc.]
  EX_NODE_TYPE -->|Logic| EX_LOGIC[set_variable, math, sort<br/>if_else, switch, filter]
  EX_NODE_TYPE -->|AI| EX_AI[ai_chat_model, ai_agent<br/>openai_gpt, anthropic_claude<br/>→ routes to Ollama]
  EX_NODE_TYPE -->|Integration| EX_INT[google_sheets, notion<br/>airtable, slack, linkedin<br/>twitter, etc.]
  EX_NODE_TYPE -->|HTTP| EX_HTTP[http_request<br/>with retry logic]
  EX_NODE_TYPE -->|JavaScript| EX_JS[javascript node<br/>vm2 sandbox]
  EX_NODE_TYPE -->|Function| EX_FUNC[function node<br/>custom code]
  
  EX_TRIG --> EX_NODE_RESULT
  EX_LOGIC --> EX_NODE_RESULT
  EX_AI --> EX_NODE_RESULT
  EX_INT --> EX_NODE_RESULT
  EX_HTTP --> EX_NODE_RESULT
  EX_JS --> EX_NODE_RESULT
  EX_FUNC --> EX_NODE_RESULT
  
  EX_NODE_RESULT{Execution<br/>Success?}
  EX_NODE_RESULT -->|Success| EX_STORE[Store output in nodeOutputs cache<br/>update finalOutput]
  EX_NODE_RESULT -->|Failed| EX_RETRY{Retries<br/>Exhausted?}
  EX_RETRY -->|No| EX_EXEC
  EX_RETRY -->|Yes| EX_FAIL[Mark node failed<br/>checkpoint.markNodeFailed<br/>shouldContinue?]
  EX_FAIL --> EX_CONT{Continue<br/>Execution?}
  EX_CONT -->|No| EX_STOP[Stop execution]
  EX_CONT -->|Yes| EX_NEXT_NODE
  
  EX_STORE --> EX_BRANCH{Node Type?}
  EX_BRANCH -->|if_else| EX_IF[Evaluate condition<br/>store in ifElseResults]
  EX_BRANCH -->|switch| EX_SWITCH[Evaluate switch<br/>store in switchResults]
  EX_BRANCH -->|Other| EX_CHECKPOINT_SAVE
  
  EX_IF --> EX_CHECKPOINT_SAVE
  EX_SWITCH --> EX_CHECKPOINT_SAVE
  
  EX_CHECKPOINT_SAVE[Save checkpoint after node<br/>workflowCheckpoint.saveCheckpoint<br/>state snapshot]
  EX_CHECKPOINT_SAVE --> EX_WS_UPDATE[Broadcast node update<br/>WebSocket: /ws/executions<br/>status: success]
  EX_WS_UPDATE --> EX_NEXT_NODE
  
  EX_NEXT_NODE -->|Yes| EX_LOOP
  EX_NEXT_NODE -->|No| EX_COMPLETE[Execution Complete]
  EX_STOP --> EX_COMPLETE
  
  EX_COMPLETE --> EX_DB_WRITE[(Write to executions table<br/>status, output, logs, duration<br/>finished_at)]
  EX_DB_WRITE --> EX_RESP[HTTP 200: Return execution result<br/>success/failure, output, logs]
  
  %% Distributed Execution Flow
  DIST_EXEC --> DEX_VAL[Validate workflowId]
  DEX_VAL --> DEX_FETCH[(Fetch workflow from DB)]
  DEX_FETCH --> DEX_CONFIRM{confirmed OR<br/>status='active'?}
  DEX_CONFIRM -->|No| DEX_FORB[403 Not Confirmed]
  DEX_CONFIRM -->|Yes| DEX_READY[validateExecutionReady<br/>+ input/cred checks]
  DEX_READY --> DEX_AUTO{status draft/ready<br/>and no missing?}
  DEX_AUTO -->|Yes| DEX_AUTO_UPDATE[Auto-update: status='active'<br/>phase='ready_for_execution']
  DEX_AUTO -->|No| DEX_NOT_READY[400 WORKFLOW_NOT_READY]
  DEX_AUTO_UPDATE --> DEX_LOCK[acquireExecutionLock<br/>prevent concurrent runs]
  DEX_LOCK --> DEX_QUEUE[DistributedOrchestrator.startExecution<br/>QueueClient.enqueue<br/>StorageManager.storeState]
  DEX_QUEUE --> DEX_WORKER[Worker Pool Processes Nodes<br/>stateless-worker, node-worker<br/>ollama-worker, lightricks-worker]
  DEX_WORKER --> DEX_STATUS[GET /api/execution-status/:id<br/>Query queue job status]
  DEX_STATUS --> DEX_RELEASE[releaseExecutionLock<br/>+ logExecutionEvent]
  DEX_RELEASE --> DEX_RESP[Return: executionId, status]
  
  %% =========================
  %% EXTERNAL SYSTEMS
  %% =========================
  EX_AI -.->|API Call| OLLAMA[(Ollama Service<br/>Local AI)]
  EX_INT -.->|API Calls| EXT_APIS[(Third-party APIs<br/>Notion, Google, Slack<br/>LinkedIn, Twitter, etc.)]
  EX_HTTP -.->|HTTP Request| EXT_APIS
  
  AI_FETCH -.->|Query| SUPABASE[(Supabase PostgreSQL<br/>workflows table)]
  AC_FETCH -.->|Query| SUPABASE
  EX_FETCH -.->|Query| SUPABASE
  DEX_FETCH -.->|Query| SUPABASE
  AI_DB_SAVE -.->|Update| SUPABASE
  AC_DB_SAVE -.->|Update| SUPABASE
  EX_DB_WRITE -.->|Insert/Update| SUPABASE
  SAVE_DB -.->|Update| SUPABASE
  
  SUPABASE -.->|Auth| AUTH[(Supabase Auth<br/>getUser token)]
  AI_AUTH -.->|Check| AUTH
  AC_AUTH -.->|Check| AUTH
  
  %% =========================
  %% REAL-TIME UPDATES
  %% =========================
  EX_WS_UPDATE -.->|Broadcast| WS[(WebSocket Server<br/>/ws/executions<br/>/ws/chat)]
  WS -.->|Real-time Updates| FRONTEND_WS[Frontend: Real-time Visualization<br/>Node status changes]
  
  %% =========================
  %% FINAL OUTPUTS
  %% =========================
  EX_RESP --> END_SUCCESS([✅ Execution Complete<br/>Success/Failure Result])
  DEX_RESP --> END_QUEUED([⏳ Execution Queued<br/>Check Status via /api/execution-status/:id])
  ANALYZE_RESP --> END_ANALYZE([📊 Analysis Complete<br/>Questions & Summary])
  REFINE_RESP --> END_REFINE([✏️ Refinement Complete<br/>Requirements & Credentials])
  
  style START fill:#e1f5ff
  style END_SUCCESS fill:#d4edda
  style END_QUEUED fill:#fff3cd
  style END_ANALYZE fill:#d1ecf1
  style END_REFINE fill:#d1ecf1
  style ERR400 fill:#f8d7da
  style EX_NOT_READY fill:#f8d7da
  style EX_FORB fill:#f8d7da
  style SUPABASE fill:#cfe2ff
  style OLLAMA fill:#fff3cd
  style EXT_APIS fill:#e7f3ff
  style WS fill:#d1f2eb
```

---

## Detailed Component Flowcharts (Reference)

```mermaid
  %% =========================
  %% Frontend (ctrl_checks)
  %% =========================
  subgraph FE[Frontend: ctrl_checks (React)]
    U([User])
    WZ[AutonomousAgentWizard.tsx]
    CFG[Unified configuration modal\n(discoveredInputs + discoveredCredentials)]
    FE_SAVE[(Workflow stored in Supabase\n(workflows table))]

    U -->|enters prompt| WZ
  end

  %% =========================
  %% Backend server startup
  %% =========================
  subgraph BE[Backend: worker (Express)]
    START([Process start])
    ENV[core/env-loader.ts\n(load dotenv first)]
    REG[NodeSchemaRegistry init\n+ nodeLibrary early init]
    APP[Express app\n(worker/src/index.ts)]
    ERRMW[error-handler middleware]
    START --> ENV --> REG --> APP --> ERRMW
  end

  %% =========================
  %% APIs - entrypoints
  %% =========================
  subgraph API[HTTP APIs (worker/src/index.ts)]
    GW[POST /api/generate-workflow\n(api/generate-workflow.ts)]
    AI[POST /api/workflows/:id/attach-inputs\n(api/attach-inputs.ts)]
    AC[POST /api/workflows/:id/attach-credentials\n(api/attach-credentials.ts)]
    SW[POST /api/save-workflow\n(api/save-workflow.ts)]
    EX[POST /api/execute-workflow\n(api/execute-workflow.ts)]
    DEX[POST /api/distributed-execute-workflow\n(api/distributed-execute-workflow.ts)]
    ESTAT[GET /api/execution-status/:id\n(api/distributed-execute-workflow.ts)]
    HC[GET /health\n(Ollama health via Promise.race)]
    WS_HEALTH[GET /api/chat/health\n(WebSocket status)]
  end

  APP --> HC
  WZ -->|mode=analyze| GW
  WZ -->|mode=refine| GW
  WZ -->|mode=create\n(optional x-stream-progress)| GW

  %% =========================
  %% /api/generate-workflow modes
  %% =========================
  subgraph GWM[generate-workflow.ts: mode routing]
    GW_IN[Validate prompt string\n(400 if missing/blank)]
    GW_MODE{mode?}
    ANALYZE[analyze:\nfastAnalyzePromptWithNodeOptions()]
    REFINE[refine:\nrequirementsExtractor.extractRequirements()\n+ identifyRequiredCredentialsFromRequirements()\n(or handlePhasedRefine)]
    CREATE[create:\n(optional Memory context)\n+ workflowLifecycleManager.generateWorkflowGraph()]

    GW_IN --> GW_MODE
    GW_MODE -->|analyze| ANALYZE
    GW_MODE -->|refine| REFINE
    GW_MODE -->|create| CREATE
  end

  GW --> GW_IN

  %% =========================
  %% Memory integration (generation-time only)
  %% =========================
  subgraph MEM[Memory system (worker/memory)]
    RB[getReferenceBuilder().buildContext()\n(similarPatterns)]
    MM[getMemoryManager().storeWorkflow()\n(best-effort)]
  end

  CREATE --> RB

  %% =========================
  %% Generation orchestration
  %% =========================
  subgraph LCM[WorkflowLifecycleManager.generateWorkflowGraph()]
    SP[Optional: planWorkflowSpecFromPrompt()\n(Smart Planner spec; non-fatal)]
    NR[Resolve required nodes:\n- plannerSpec-derived nodeIds OR\n- NodeResolver.resolvePrompt()]
    PIPESEL{useNewPipeline?\n(default true)}
    NEWP[generateWorkflowWithNewPipeline()\n→ workflowPipelineOrchestrator.executePipeline()]
    LEGACY[agenticWorkflowBuilder.generateFromPrompt()]

    POSTF1[Planner-only filter:\nremove mentioned_only nodes\n*unless connected or configured*]
    POSTF2[Ensure resolved nodeTypes exist:\nadd missing nodes from nodeLibrary.getSchema()]
    CANON[Normalize all node types to canonical\n(resolveNodeType)\nforce node.type='custom']
    VALID[workflowValidator.validateAndFix()\n(returns fixedWorkflow)]
    CANON2[Re-normalize canonical types\n(after validator fixes)]
    GMAILCHK{plannerSpec present?}
    GINT[NodeResolver.assertGmailIntegrity()\n(non-fatal)]

    CREDDISC[credentialDiscoveryPhase.discoverCredentials()\nAFTER graph creation\n(+ vault lookup via userId)]
    INPUTDISC[discoverNodeInputs():\nscan nodeLibrary schema required/optional\nskip credential fields\nspecial cases (if_else conditions, gmail messageId op)]

    OUT[Return:\n{ workflow, requiredCredentials,\n  requiredInputs, validation, ... }]

    SP --> NR --> PIPESEL
    PIPESEL -->|true| NEWP
    PIPESEL -->|false| LEGACY
    NEWP --> POSTF1 --> POSTF2 --> CANON --> VALID --> CANON2 --> GMAILCHK
    LEGACY --> POSTF1
    GMAILCHK -->|no plannerSpec| GINT --> CREDDISC
    GMAILCHK -->|plannerSpec| CREDDISC
    CREDDISC --> INPUTDISC --> OUT
  end

  %% =========================
  %% Deterministic pipeline (new)
  %% =========================
  subgraph PIPE[workflowPipelineOrchestrator.executePipeline()]
    PU[STEP 0.5 understandPrompt()\nblock build if confidence < 0.5]
    INTENT[STEP 1 structure intent:\nplannerSpec→StructuredIntent OR\npromptUnderstanding.inferredIntent OR\nintentStructurer.structureIntent()\n(default trigger manual_trigger)]
    INTNORM[STEP 1.8 nodeTypeNormalizationService.validateAndNormalizeIntent()]
    BUILD[STEP 2 buildProductionWorkflow(strict; retries)\n(production-workflow-builder)]
    WFNORM[STEP 2.1 validateAndNormalizeWorkflow()]
    ANALYZEMODE{options.mode == analyze?}
    RETURNAN[Return analysis-only]
    CONFIRM[STEP 4: create confirmationRequest\nmarkWaitingForConfirmation\n(return waitingForConfirmation=true)]
    CONT[continuePipelineAfterConfirmation()\n(post-confirmation path)]
    REPAIR[STEP 5 repairEngine.repairWorkflow()]
    PRUNE[STEP 5.5 pruneWorkflowGraph() (non-fatal)]
    NORMEDGE[STEP 6 normalize edge handles\n(validateAndFixEdgeHandles)]
    DETCRED[STEP 7 credentialDetector.detectCredentials()]
    NEEDCRED{missing_credentials > 0?}
    INJCRED[STEP 8 credentialInjector.injectCredentials()\n(if provided)]
    POLICY[STEP 9 workflowPolicyEnforcerV2.enforcePolicies()]
    AIVAL[STEP 10 aiWorkflowValidator.validateWorkflowStructure()]

    PU --> INTENT --> INTNORM --> BUILD --> WFNORM --> ANALYZEMODE
    ANALYZEMODE -->|yes| RETURNAN
    ANALYZEMODE -->|no| CONFIRM
    CONFIRM --> CONT --> REPAIR --> PRUNE --> NORMEDGE --> DETCRED --> NEEDCRED
    NEEDCRED -->|yes| INJCRED
    NEEDCRED -->|no| POLICY
    INJCRED --> POLICY --> AIVAL
  end

  CREATE --> LCM
  OUT -->|format response\nphase='ready'\nfilter Google OAuth out| GW_RESP[HTTP 200 JSON\n{workflow,nodes,edges,\ndiscoveredInputs,\ndiscoveredCredentials}]
  GW_RESP --> WZ --> CFG

  %% =========================
  %% Attach Inputs (persist + phase transitions)
  %% =========================
  subgraph ATTIN[POST /api/workflows/:id/attach-inputs]
    AI_IN[Validate workflowId + inputs object\nsanitize credential-shaped keys]
    AI_AUTH[Optional auth: supabase.auth.getUser(token)]
    AI_DBGET[supabase.from('workflows').select('*')\n.eq('id', workflowId).single()]
    AI_PHASE{phase allowed?\n(block if executing)}
    AI_SET[Update workflows:\nstatus='active', phase='configuring_inputs']

    AI_NORM1[normalizeWorkflowForSave()\n(dedupe nodes + triggers,\nif_else migrations)]
    AI_NORM2[normalizeWorkflowGraph()\n(dedupe + handle fix +\nlinearize unless branching)]
    AI_VG[validateNormalizedGraph()\n(400 on invalid)]
    AI_INJECT[Inject inputs into node.data.config\n(schema-aware; reject credential fields)]
    AI_VALIDATE[workflowValidator.validateAndFix()\n(use fixedWorkflow even with non-critical errors)]
    AI_NORM3[Final normalizeWorkflowForSave + normalizeWorkflowGraph]
    AI_CRED[credentialDiscoveryPhase.discoverCredentials()\n(if satisfied OAuth creds → auto-inject credentialId)]
    AI_NEXT[Set next phase:\n- ready_for_execution if no/missing creds==0\n- else configuring_credentials]
    AI_DBUPD[Update workflows nodes/edges/status/phase\n+ versioning + workflow_events]
    AI_OUT[Return {success, workflow, status, phase, ready}]

    AI_IN --> AI_AUTH --> AI_DBGET --> AI_PHASE
    AI_PHASE -->|ok| AI_SET --> AI_NORM1 --> AI_NORM2 --> AI_VG --> AI_INJECT --> AI_VALIDATE --> AI_NORM3 --> AI_CRED --> AI_NEXT --> AI_DBUPD --> AI_OUT
    AI_PHASE -->|blocked| AI_ERR409[[409 PHASE_LOCKED]]
  end

  CFG -->|submit node inputs| AI --> ATTIN
  ATTIN --> AI_OUT --> WZ

  %% =========================
  %% Save Workflow (optional direct save)
  %% =========================
  subgraph SAVE[POST /api/save-workflow]
    SW_IN[Validate workflowId + nodes/edges]
    SW_AUTH[Optional auth + ownership check]
    SW_DBGET[supabase workflows fetch]
    SW_NORM[normalizeWorkflowForSave + normalizeWorkflowGraph]
    SW_VAL[validateWorkflowForSave\n(single trigger, no cycles, valid edges)]
    SW_DBUPD[Update workflows nodes/edges/status/phase\n+ versioning]
    SW_OUT[Return {success, workflow, validation}]

    SW_IN --> SW_AUTH --> SW_DBGET --> SW_NORM --> SW_VAL --> SW_DBUPD --> SW_OUT
  end

  WZ -->|save directly| SW --> SAVE
  SAVE --> FE_SAVE

  %% =========================
  %% Attach Credentials (persist + readiness validation)
  %% =========================
  subgraph ATTCRED[POST /api/workflows/:id/attach-credentials]
    AC_IN[Validate workflowId + credentials object\n(allow empty {})]
    AC_AUTH[Optional auth + ownership check]
    AC_DBGET[supabase workflows fetch]
    AC_LOCK{phase blocked?\n(block executing/running/archived)}
    AC_SET[Update workflows:\nstatus='configuring_credentials']
    AC_NORM1[normalizeWorkflowForSave + normalizeWorkflowGraph]
    AC_VG[validateNormalizedGraph]
    AC_DISC[discoverCredentials(userId)\nfilter out satisfied vault keys\n(skip injection for satisfied OAuth)]
    AC_INJ[workflowLifecycleManager.injectCredentials()]
    AC_LIN[normalizeWorkflowGraph(injectionResult.workflow)\n(linearization)]
    AC_SAVEVAL[validateWorkflowForSave (single trigger etc.)]
    AC_READY[workflowLifecycleManager.validateExecutionReady(userId)]
    AC_PHASE[Set phase:\nready_for_execution if ready\nelse configuring_credentials]
    AC_DBUPD[Update workflows nodes/edges/status='active'/phase\n+ workflow_events (CREDS_ATTACHED, READY)]
    AC_OUT[Return {success, workflow, validation, ready}]

    AC_IN --> AC_AUTH --> AC_DBGET --> AC_LOCK
    AC_LOCK -->|ok| AC_SET --> AC_NORM1 --> AC_VG --> AC_DISC --> AC_INJ --> AC_LIN --> AC_SAVEVAL --> AC_READY --> AC_PHASE --> AC_DBUPD --> AC_OUT
    AC_LOCK -->|blocked| AC_ERR409[[409 PHASE_LOCKED]]
  end

  CFG -->|submit missing creds| AC --> ATTCRED
  ATTCRED --> AC_OUT --> WZ
  AC_OUT --> FE_SAVE

  %% =========================
  %% Execute Workflow (synchronous) + orchestration loop
  %% =========================
  subgraph EXEC[POST /api/execute-workflow]
    EX_IN[Validate workflowId]
    EX_DBGET[Fetch workflow from workflows table]
    EX_CONFIRM{confirmed==true OR status=='active'?}
    EX_NORM[normalizeWorkflowForSave + normalizeWorkflowGraph\n(linearize unless branching)\ncloneWorkflowDefinition()]
    EX_READY[workflowLifecycleManager.validateExecutionReady(userId)]
    EX_DISC[credentialDiscoveryPhase.discoverCredentials(userId)\n+ discoverNodeInputs() + type mismatch checks]
    EX_AUTOPREP{status draft/ready\nand no missing inputs/creds?}
    EX_UPD[Auto-update workflows:\nstatus='active', phase='ready_for_execution']
    EX_BLOCK[[400 WORKFLOW_NOT_READY\n(missing inputs/creds)]]
    EX_ORCH[WorkflowOrchestrator.executeWorkflow()\n(topologicalSort + checkpoint resume check)]
    EX_LOOP[For each node in executionOrder:\n- Skip if completed (checkpoint)\n- Update state: pending→running\n- getNodeInput() from edges/context\n- executeWithReliability (retry 3x, exponential backoff)\n- Store output in nodeOutputs cache\n- Handle if_else/switch branching\n- Save checkpoint after each node]
    EX_DBEX[Write executions table\n(status/output/logs/duration)]
    EX_OUT[HTTP response\nsuccess/failure]

    EX_IN --> EX_DBGET --> EX_CONFIRM
    EX_CONFIRM -->|no| EX_FORB[[403 not confirmed]]
    EX_CONFIRM -->|yes| EX_NORM --> EX_READY --> EX_DISC --> EX_AUTOPREP
    EX_AUTOPREP -->|yes| EX_UPD --> EX_ORCH
    EX_AUTOPREP -->|no| EX_BLOCK
    EX_ORCH --> EX_LOOP --> EX_DBEX --> EX_OUT
  end

  %% =========================
  %% Node Execution Details (executeNode switch)
  %% =========================
  subgraph NODEEXEC[executeNode() - switch(type) handler]
    NE_IN[Extract node type/config\nnormalizeIfElseConditions()]
    NE_VAL[validationMiddleware.validateConfig()\n(strict mode blocks)]
    NE_SWITCH{Node Type}
    NE_TRIG[Triggers:\nmanual_trigger, chat_trigger,\nwebhook, schedule, interval,\nform, workflow_trigger]
    NE_LOGIC[Logic:\nset_variable, set, math,\nsort, limit, wait,\nif_else, switch, filter,\nloop, aggregate, merge]
    NE_AI[AI:\nai_chat_model, ai_agent,\nopenai_gpt, anthropic_claude,\ngoogle_gemini, google_veo]
    NE_INT[Integrations:\ngoogle_sheets, google_doc,\ngoogle_gmail, google_calendar,\nnotion, airtable, clickup,\npipedrive, hubspot, zoho,\nslack, discord, telegram,\nlinkedin, twitter, instagram,\nwhatsapp, github, facebook]
    NE_HTTP[http_request\n(with retry logic)]
    NE_JS[javascript\n(vm2 sandbox)]
    NE_FUNC[function\n(custom code)]
    NE_OUT[Return node output\n(typed, no wrapper)]

    NE_IN --> NE_VAL --> NE_SWITCH
    NE_SWITCH -->|trigger| NE_TRIG
    NE_SWITCH -->|logic| NE_LOGIC
    NE_SWITCH -->|ai| NE_AI
    NE_SWITCH -->|integration| NE_INT
    NE_SWITCH -->|http| NE_HTTP
    NE_SWITCH -->|javascript| NE_JS
    NE_SWITCH -->|function| NE_FUNC
    NE_TRIG --> NE_OUT
    NE_LOGIC --> NE_OUT
    NE_AI --> NE_OUT
    NE_INT --> NE_OUT
    NE_HTTP --> NE_OUT
    NE_JS --> NE_OUT
    NE_FUNC --> NE_OUT
  end

  EX_LOOP --> NODEEXEC

  %% =========================
  %% Real-time Updates (WebSocket)
  %% =========================
  subgraph WS[WebSocket Services]
    WS_INIT[VisualizationService.initialize(server)\nws://localhost:PORT/ws/executions]
    WS_CHAT[ChatServer.initialize(server)\nws://localhost:PORT/ws/chat]
    WS_BROAD[broadcastNodeUpdate(executionId, nodeId, status)\n(pending→running→success/error)]
    WS_STATE[ExecutionStateManager\n(tracks node states per execution)]
  end

  EX_ORCH --> WS_BROAD
  WS_BROAD --> WS_STATE
  APP --> WS_INIT
  APP --> WS_CHAT

  WZ -->|run| EX --> EXEC

  %% =========================
  %% Distributed Execute Workflow
  %% =========================
  subgraph DEXEC[POST /api/distributed-execute-workflow]
    DEX_DBGET[Fetch workflow]
    DEX_CONFIRM{confirmed or status active?}
    DEX_READY[validateExecutionReady + input/cred checks\n+ type mismatch validation]
    DEX_AUTOPREP{status draft/ready\nand no missing inputs/creds?}
    DEX_UPD[Auto-update workflows:\nstatus='active', phase='ready_for_execution']
    DEX_LOCK[acquireExecutionLock(supabase, workflowId, executionId)]
    DEX_QUEUE[DistributedOrchestrator.startExecution()\n+ QueueClient.enqueue()\n+ StorageManager.storeState()]
    DEX_WORKER[Worker pool processes nodes\n(stateless-worker, node-worker,\nollama-worker, lightricks-worker)]
    DEX_STATUS[GET /api/execution-status/:id\n(returns queue job status)]
    DEX_RELEASE[releaseExecutionLock()\n+ logExecutionEvent()]
    DEX_CONFIRM -->|no| DEX_FORB[[403 not confirmed]]
    DEX_DBGET --> DEX_CONFIRM -->|yes| DEX_READY --> DEX_AUTOPREP
    DEX_AUTOPREP -->|yes| DEX_UPD --> DEX_LOCK
    DEX_AUTOPREP -->|no| DEX_BLOCK[[400 WORKFLOW_NOT_READY]]
    DEX_LOCK --> DEX_QUEUE --> DEX_WORKER --> DEX_RELEASE
  end

  WZ -->|run distributed| DEX --> DEXEC

  %% =========================
  %% External systems & datastore
  %% =========================
  subgraph DS[Data stores / external systems]
    SB[(Supabase PostgreSQL)\n- auth.getUser(token)\n- workflows (nodes/edges/status/phase)\n- executions (status/output/logs)\n- workflow_events (audit trail)\n- workflow_versions (versioning)]
    OL[(Ollama)\nollamaManager.initialize()\nollamaManager.chat()\nollamaManager.generate()\nollamaManager.healthCheck()\n+ modelManager]
    EXT_APIS[(Third-party APIs)\n- Notion API (pages/databases)\n- Google APIs (Sheets/Gmail/Calendar)\n- Slack/Discord webhooks\n- LinkedIn/Twitter/Instagram\n- Airtable/Pipedrive/HubSpot\n- GitHub/Facebook/WhatsApp]
  end

  GW -->|auth optional| SB
  AI --> SB
  AC --> SB
  SW --> SB
  EX --> SB
  DEX --> SB
  APP --> OL
  NODEEXEC --> EXT_APIS
  DEX_WORKER --> EXT_APIS

```

---

## Complete Workflow State Lifecycle

### Workflow Status Enum (Database)
- **`draft`**: Initial state after generation, not yet configured
- **`active`**: Workflow is configured and ready (inputs/credentials attached)
- **`archived`**: Workflow is disabled/deleted

### Workflow Phase (Database TEXT field)
- **`configuring_inputs`**: User is providing runtime configuration (non-credential fields)
- **`configuring_credentials`**: User is providing missing credentials
- **`ready_for_execution`**: All inputs/credentials satisfied, ready to run
- **`executing`**: Workflow is currently running (synchronous or distributed)
- **`running`**: Legacy phase (distributed execution in progress)
- **`waiting_for_confirmation`**: Pipeline-generated workflow awaiting user approval (internal state)

### State Transitions
1. **Generation** (`POST /api/generate-workflow`, mode=create):
   - Creates workflow in `draft` status, no phase set
   - Returns `discoveredInputs` and `discoveredCredentials`
2. **Input Attachment** (`POST /api/workflows/:id/attach-inputs`):
   - Sets `status='active'`, `phase='configuring_inputs'`
   - After injection: `phase='ready_for_execution'` (if no missing creds) OR `phase='configuring_credentials'` (if missing creds)
3. **Credential Attachment** (`POST /api/workflows/:id/attach-credentials`):
   - Sets `status='configuring_credentials'`
   - After injection + validation: `status='active'`, `phase='ready_for_execution'` (if ready) OR `phase='configuring_credentials'` (if still missing)
4. **Execution** (`POST /api/execute-workflow` or `/api/distributed-execute-workflow`):
   - Guard: Requires `confirmed=true` OR `status='active'`
   - Auto-promotes `draft`/`ready` → `active` + `ready_for_execution` if readiness checks pass
   - Sets `phase='executing'` during execution
   - On completion: `phase` returns to `ready_for_execution` (for re-runs)

### Execution State (In-Memory, WebSocket)
- **Node Status**: `pending` → `running` → `success` / `error`
- **Execution Status**: `running` → `success` / `failed`
- Tracked by `ExecutionStateManager` and broadcast via `VisualizationService`

---

## Step-by-Step Explanation with Side Headings

### Entry Point

- **Backend process entry**: `worker/src/index.ts` loads environment variables first (`./core/env-loader`), initializes the node schema registry early, builds an Express app, registers routes, then starts listening.
- **Workflow generation API entry**: `POST /api/generate-workflow` (`worker/src/api/generate-workflow.ts`) is the primary entrypoint used by the frontend wizard (`ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`).
- **Configuration APIs**:
  - `POST /api/workflows/:workflowId/attach-inputs` (`worker/src/api/attach-inputs.ts`)
  - `POST /api/workflows/:workflowId/attach-credentials` (`worker/src/api/attach-credentials.ts`)
- **Execution APIs**:
  - `POST /api/execute-workflow` (`worker/src/api/execute-workflow.ts`)
  - `POST /api/distributed-execute-workflow` (`worker/src/api/distributed-execute-workflow.ts`)

### Input Handling

- **Frontend inputs**:
  - User prompt (string) is posted to `/api/generate-workflow` in 3 modes:
    - **`analyze`**: fast question generation
    - **`refine`**: requirements extraction
    - **`create`**: full graph generation (optionally streamed via `x-stream-progress: true`)
- **Backend request validation** (`generate-workflow.ts`):
  - Rejects missing/blank prompt with **HTTP 400**.
  - Routes by `mode`.
- **Memory augmentation (best-effort)** in `create` mode:
  - Uses `getReferenceBuilder().buildContext(...)`; if it fails, generation continues without memory.

### Core Processing

#### 1) Analyze mode (`mode === 'analyze'`)

- Uses `enhancedWorkflowAnalyzer.fastAnalyzePromptWithNodeOptions(finalPrompt, { existingWorkflow })` to return:
  - `summary`
  - `questions`
  - `nodeOptionsDetected` / `hasNodeChoices`
  - `autoContinue` if there are no questions

#### 2) Refine mode (`mode === 'refine'`)

- Extracts requirements via `requirementsExtractor.extractRequirements(...)`.
- Generates a short “systemPrompt” summary from the refined prompt.
- Computes `requiredCredentials` via `identifyRequiredCredentialsFromRequirements(...)` (explicitly avoids external AI API keys; “Ollama-first”).
- Returns `{ refinedPrompt, systemPrompt, requirements, requiredCredentials }`.

#### 3) Create mode (`mode === 'create'`)

This path is implemented as:

- `generate-workflow.ts` → `workflowLifecycleManager.generateWorkflowGraph(enhancedPrompt, constraints)`
- `WorkflowLifecycleManager.generateWorkflowGraph()`:
  - Optional **Smart Planner**: `planWorkflowSpecFromPrompt(userPrompt)` (non-fatal if it errors).
  - Node resolution:
    - planner-driven node list derivation **or** `NodeResolver.resolvePrompt(userPrompt)`.
  - Graph generation (default):
    - `useNewPipeline` defaults to **true** → `generateWorkflowWithNewPipeline()` → `workflowPipelineOrchestrator.executePipeline(...)`.
  - Post-processing:
    - Planner mentioned-only filtering (remove only if **unconnected** and **no config**).
    - Ensure all “resolved” node types exist (may add nodes from `nodeLibrary.getSchema()`).
  - Canonicalization:
    - Normalize node types to canonical form via `resolveNodeType(...)`; forces frontend-compatible `node.type='custom'`.
  - Validation/repair:
    - `workflowValidator.validateAndFix(workflow)`; uses `fixedWorkflow` if present.
  - Credential discovery (strictly **after** graph exists):
    - `credentialDiscoveryPhase.discoverCredentials(finalWorkflow, userId)`
  - Required input discovery (strictly **after** graph exists):
    - `discoverNodeInputs(finalWorkflow)` scans schemas, skips credential fields, and applies special-case rules (notably `if_else.conditions` and Gmail `messageId` conditional requirement).

Finally `generate-workflow.ts` formats the response for the frontend:

- **Always returns** `phase: 'ready'` for create-mode completion.
- Returns:
  - `workflow`, `nodes`, `edges`
  - `discoveredInputs` (required user configuration fields)
  - `discoveredCredentials` **only for missing credentials** and with an explicit filter that removes **Google OAuth** from the configuration modal.

### Decision Logic

Key decision points (actual code branches):

- **Mode routing**: `if (mode === 'analyze') ... else if (mode === 'refine') ... else create`.
- **Streaming vs non-streaming**: `x-stream-progress === 'true'` changes response format (newline-delimited JSON updates) and uses `sendProgress(...)`.
- **Smart Planner optionality**:
  - Planner failure is non-fatal; the system falls back to legacy node resolution.
  - Planner “mentioned_only” services are removed **only** if the generated nodes are not connected and have no config.
- **New pipeline selection**:
  - `useNewPipeline = constraints?.useNewPipeline !== false` (default true).
- **Validation strictness at execution-time**:
  - Execution blocks if the workflow is not ready (missing inputs/credentials), returning structured errors.
  - Execution can auto-promote `draft`/`ready` → `active` + `ready_for_execution` if readiness checks pass.
- **Graph normalization linearization**:
  - `normalizeWorkflowGraph()` includes a linearization pass but explicitly **skips linearization if branching nodes are present** (`if_else`/`switch`), preserving edges.

### Data Layer Interaction

Supabase PostgreSQL is used for both **auth** and **persistence**:

- **Auth**: `supabase.auth.getUser(token)` (used in generate, attach-inputs, attach-credentials, execution readiness checks, save-workflow).
- **Workflows table** (`supabase.from('workflows')...`):
  - **Read**: attach/execute/save endpoints fetch workflow by `id` with `.select('*').eq('id', workflowId).single()`
  - **Write**: Updates `nodes` (JSONB), `edges` (JSONB), `status` (enum: draft/active/archived), `phase` (TEXT: configuring_inputs/configuring_credentials/ready_for_execution/executing), `updated_at` (timestamp) atomically
  - **Versioning**: `workflow_versions` table stores historical definitions via `getWorkflowVersionManager().createVersion()`
- **Workflow events** (`supabase.from('workflow_events').insert(...)`):
  - `INPUTS_ATTACHED` (event_data: inputsCount, nodeIds, requiredCredentialsCount)
  - `CREDS_ATTACHED` (event_data: credentialsCount, satisfiedCount, ready)
  - `READY` (event_data: ready, autoRun, inputsAttached, credentialsAttached)
  - Used for audit trail and debugging
- **Executions table** (`supabase.from('executions')...`):
  - **Create**: New execution record with `workflow_id`, `user_id`, `status='running'`, `trigger`, `input`, `logs=[]`, `started_at`
  - **Update**: On completion, sets `status` (success/failed), `output`, `logs`, `finished_at`, `duration_ms`, `error` (if failed)
  - **Query**: Execution status/history via `GET /api/execution-status/:id`
- **Execution locks** (distributed execution):
  - Prevents concurrent execution of same workflow via `acquireExecutionLock()` / `releaseExecutionLock()`
  - Stored in workflow record as `active_execution_id`

### External Service Calls

Based on concrete code paths:

- **Ollama** (local AI service):
  - `worker/src/index.ts` uses `ollamaManager.initialize()` on startup
  - Exposes `/api/ai/generate`, `/api/ai/chat`, `/api/ai/models`, `/api/ai/metrics`
  - `/health` endpoint checks Ollama via `ollamaManager.healthCheck()` with 1s timeout (Promise.race)
  - The deterministic generation pipeline and builder modules are designed around an "Ollama-first" architecture (the refine credential detection explicitly removes external AI provider API-key requirements)
  - Used by `ai_chat_model`, `ai_agent`, `openai_gpt`, `anthropic_claude`, `google_gemini` nodes (all route to Ollama)
- **Third-party integrations during execution**:
  - Node execution is centralized in `executeNode(...)` (`worker/src/api/execute-workflow.ts`) via a large `switch (type)` with 50+ node type handlers
  - **Notion**: Direct API calls via `@notionhq/client` (pages.update, databases.update, blocks.update)
  - **Google services**: `googleapis` SDK (Sheets, Gmail, Calendar, Docs)
  - **Slack/Discord**: Webhook URLs or Bot tokens
  - **LinkedIn/Twitter/Instagram**: OAuth-based APIs with token refresh
  - **Airtable/Pipedrive/HubSpot/Zoho**: REST APIs with API keys
  - **GitHub/Facebook/WhatsApp**: Platform-specific SDKs
  - Credentials are mapped/injected via `connectorRegistry` and node schemas; OAuth credentials may be satisfied from vault and referenced via `credentialId`/`credentialRef` rather than raw tokens
- **HTTP requests**:
  - `http_request` node supports GET/POST/PUT/DELETE with headers, body, query params, retry logic
- **JavaScript execution**:
  - `javascript` node uses `vm2` sandbox for safe code execution
  - `function` node supports custom code execution

### Error Handling

Concrete error behaviors:

- **Input validation errors**: return **400** (missing prompt, invalid inputs object, invalid credentials object).
- **Workflow not found**: attach endpoints return **404** via `createError(ErrorCode.WORKFLOW_NOT_FOUND, ...)`.
- **Phase locking**:
  - attach-inputs blocks `executing` with **409** (`ErrorCode.PHASE_LOCKED`).
  - attach-credentials blocks `executing/running/archived` with **409**.
- **Graph normalization/structure validation failures**:
  - `validateNormalizedGraph()` failures return **400** (`ErrorCode.GRAPH_INVALID_STRUCTURE` / `GRAPH_PARSE_ERROR`).
- **Credential injection failures**:
  - attach-credentials returns **400** (`ErrorCode.CREDENTIAL_INJECTION_FAILED`) and includes the workflow for debugging.
- **Execution readiness failures**:
  - execute endpoints return **400** (`WORKFLOW_NOT_READY`) with counts and actionable hints.
- **Process-level guards**:
  - `worker/src/index.ts` installs `uncaughtException` and `unhandledRejection` handlers to log and avoid immediate exit (server error event still exits on critical bind failures).

### Final Output

- **Generate workflow** (`/api/generate-workflow`, create mode):
  - Returns the workflow graph plus:
    - `discoveredInputs` (fields to collect)
    - `discoveredCredentials` (missing credentials only, Google OAuth filtered out)
    - `validation` (errors/warnings summarized)
  - In streaming mode, sends newline-delimited JSON progress updates and ends with a completion payload.
- **Attach inputs / credentials**:
  - Persists updated graph to Supabase and returns `status`, `phase`, and a `ready` boolean.
- **Save workflow** (`/api/save-workflow`):
  - Direct save endpoint that normalizes, validates, and persists workflow graph with versioning.
- **Execute workflow**:
  - **Synchronous** (`/api/execute-workflow`):
    - Runs the graph with readiness guards, normalization, retries/checkpoints
    - Uses `WorkflowOrchestrator.executeWorkflow()` with:
      - Topological sort for execution order
      - Checkpoint resume (skips completed nodes)
      - Per-node retry (3 attempts, exponential backoff, 30s timeout)
      - Real-time WebSocket updates (`/ws/executions`)
      - State manager tracks node status (pending→running→success/error)
    - Returns execution results and updates `executions` table
  - **Distributed** (`/api/distributed-execute-workflow`):
    - Queues execution via `DistributedOrchestrator.startExecution()`
    - Uses execution locks to prevent concurrent runs
    - Worker pool processes nodes asynchronously
    - Status queryable via `GET /api/execution-status/:id`

---

## Present Status Analysis

### Strengths

- **Clear lifecycle separation**: graph generation → credential discovery → input discovery → attachment endpoints → execution readiness guard.
- **Single-source normalization utility**: `normalizeWorkflowGraph()` is explicitly designed to eliminate graph format drift across generate/attach/execute.
- **Schema-driven behavior**:
  - Node schemas (`nodeLibrary`, `NodeSchemaRegistry`) drive required input discovery and validation.
  - `connectorRegistry` drives credential handling (OAuth vs webhook vs api_key) and helps keep credential fields out of “inputs”.
- **Resilience patterns in execution**:
  - Topological execution ordering (ensures dependencies are met)
  - Retries (`executionReliability.executeWithReliability`): 3 attempts, exponential backoff, 30s timeout per node
  - Checkpointing (`workflowCheckpoint.saveCheckpoint`): saves state after each successful node, supports resume from failure
  - Execution locks (distributed): prevent concurrent runs of same workflow
  - Graceful degradation: memory system failures don't block generation, Ollama health check timeout doesn't block server startup
- **Operational visibility**:
  - Streaming generation progress (newline-delimited JSON via `x-stream-progress: true`)
  - Real-time WebSocket updates (`/ws/executions`) for node status changes
  - Structured readiness logging (readiness checks log counts and actionable hints)
  - Workflow_events audit trail (INPUTS_ATTACHED, CREDS_ATTACHED, READY events)
  - Execution logs (per-node start/finish times, retry attempts, errors)
  - Versioning system (workflow_versions table tracks changes)

### Bottlenecks

- **Very large monolithic modules**:
  - `worker/src/api/execute-workflow.ts` and `worker/src/services/nodes/node-library.ts` are extremely large, which increases cognitive load and slows safe changes.
- **Repeated normalization logic across layers**:
  - `if_else` condition normalization appears in multiple places (save-normalizer, executor, distributed executor), increasing drift risk.
- **Multiple “pipelines” co-exist**:
  - Legacy builder paths (`agenticWorkflowBuilder`) and new deterministic pipeline paths increase surface area for inconsistent behavior.

### Risks

- **Pipeline confirmation vs API surface mismatch**:
  - The deterministic pipeline (`workflowPipelineOrchestrator.executePipeline`) always creates a mandatory confirmation stage (`waitingForConfirmation`), but `/api/generate-workflow` currently returns a ready workflow graph without surfacing a confirmation pause; this can lead to diverging expectations between UI and backend state models.
- **Supabase configuration hard-fail**:
  - `getSupabaseClient()` throws if Supabase env vars are placeholders/missing; many endpoints depend on Supabase (workflows, auth, events, executions).
- **Phase/status duality complexity**:
  - The system uses `status` (enum-like lifecycle) and `phase` (text execution readiness) across endpoints; inconsistent updates can cause “ready-but-not-ready” bugs.

### Improvement Opportunities

- **Extract execution node handlers**:
  - Refactor `executeNode`'s `switch(type)` (50+ cases, 10,000+ lines) into per-node modules (registry pattern) to reduce file size and improve testability.
  - Consider node plugin architecture where each node type is a separate module with a standard interface.
- **Centralize if_else normalization**:
  - Make `if_else` config normalization a single shared utility used by save/attach/execute paths (currently duplicated in 3+ places).
  - Create `normalizeIfElseConditions()` utility in `core/utils/` and import everywhere.
- **Unify confirmation model**:
  - Either surface `waitingForConfirmation` from `/api/generate-workflow` (and require `/api/workflow/confirm`) or remove/disable the pipeline's confirmation stage when using lifecycle-manager-driven generation.
  - Currently, pipeline creates confirmation requests but API doesn't expose them, leading to state mismatch.
- **Reduce duplication between synchronous and distributed execution readiness checks**:
  - The same readiness logic exists in both execute endpoints; consolidating into a shared service would reduce drift.
  - Create `ExecutionReadinessService` that both endpoints use.
- **Enhance checkpoint granularity**:
  - Currently checkpoints after each node; consider configurable checkpoint intervals for long workflows.
  - Add checkpoint compression for large state snapshots.
- **Improve WebSocket reliability**:
  - Add reconnection logic and message queuing for disconnected clients.
  - Implement WebSocket heartbeat to detect stale connections.
- **Consolidate graph normalization**:
  - `normalizeWorkflowForSave()` and `normalizeWorkflowGraph()` have overlapping responsibilities; consider merging or clearly documenting separation.
- **Add execution metrics**:
  - Track average execution time per node type, failure rates, retry success rates.
  - Expose via `/api/execution-metrics` endpoint.

