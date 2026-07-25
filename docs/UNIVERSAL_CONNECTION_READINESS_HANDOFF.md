# Universal Workflow Readiness Panel Handoff

Read this entire file before making any code changes.

## Product goal

Build a universal, dynamic, operation-aware workflow readiness system for all nodes.

The debug-node panel already proves the right product behavior: it can identify the selected node, selected operation, active connection state, and the exact missing setup fields in a specific, useful way. The full workflow Run panel must use the same quality of guidance across the entire workflow instead of showing vague fallback messages.

This must not be implemented as provider-specific or node-specific patchwork. The implementation must be registry-driven and must work for every node that supports connections, required inputs, operation-specific fields, runtime validation, or credential checks.

## Core problem

The product currently has two different readiness experiences:

1. Debug-node readiness:
   - Specific.
   - Operation-aware.
   - Field-aware.
   - Connection-aware.
   - Shows useful setup guidance for the selected node.

2. Full workflow Run readiness:
   - Often vague.
   - Sometimes connection-first even when the connection is active.
   - Sometimes says only "some required fields" instead of listing exact missing fields.
   - Sometimes misses fields across other nodes.
   - Sometimes uses legacy fallback copy instead of the canonical readiness issue details.

The correct fix is not to special-case a provider. The correct fix is to make workflow-level readiness collect and render the same canonical issue model that debug-node already uses, but for every node in the workflow.

## Required universal behavior

When a user opens, saves, returns to, debugs, or runs a workflow, the system must:

- Inspect every node in the workflow.
- Resolve each node's selected operation.
- Resolve every required connection for that node and operation.
- Resolve every required field for that node and operation.
- Verify explicit saved connection references when present.
- Verify active saved user connections when no explicit reference is selected and fallback is allowed.
- Verify runtime credential usability only when required by that connection type.
- Verify operation-specific validation rules.
- Group every issue into one canonical readiness result.
- Return machine-readable issue details to the frontend.
- Render one guided workflow panel listing all issues clearly.

The workflow panel must list:

- node label
- node type
- selected operation label
- issue type
- exact field or connection label
- current status
- action required

The workflow panel must not say vague things like:

- "some required fields"
- "click the node that needs attention"
- "connect your account" when an active connection exists but a field is missing
- "not connected" when the actual problem is a stale reference, missing runtime token, insufficient permission, or required input

## Canonical readiness contract

Create or enforce one canonical readiness envelope used by every backend execution/readiness path.

Minimum response shape:

```ts
type WorkflowReadiness = {
  ready: boolean;
  workflowId: string;
  summary: {
    totalNodes: number;
    checkedNodes: number;
    issueCount: number;
    missingInputCount: number;
    missingCredentialCount: number;
    invalidInputCount: number;
    runtimeValidationIssueCount: number;
  };
  readinessIssues: ReadinessIssue[];
  missingInputs: ReadinessIssue[];
  missingCredentials: ReadinessIssue[];
  invalidInputs: ReadinessIssue[];
  runtimeValidationIssues: ReadinessIssue[];
  groupedIssues: GroupedReadinessIssue[];
  technicalDetails?: unknown;
};

type ReadinessIssue = {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  operationId?: string;
  operationLabel?: string;
  category:
    | "missing_input"
    | "missing_credential"
    | "invalid_input"
    | "runtime_validation"
    | "invalid_connection_ref"
    | "runtime_credential_missing"
    | "permission_missing"
    | "connection_expired"
    | "connection_revoked"
    | "configuration";
  fieldKey?: string;
  fieldLabel?: string;
  connectionKey?: string;
  connectionLabel?: string;
  provider?: string;
  credentialTypeId?: string;
  connectionId?: string;
  severity: "blocking" | "warning" | "info";
  title: string;
  message: string;
  action: "fill_field" | "connect" | "select_connection" | "reconnect" | "repair" | "review" | "none";
  source: "node_readiness_resolver" | "connection_readiness" | "execution_preflight" | "runtime_validator";
  technicalCode?: string;
  technicalDetails?: unknown;
};
```

Rules:

- `readinessIssues` is the source of truth.
- The categorized arrays are filtered views of `readinessIssues`.
- `groupedIssues` is derived from the same issues, not a separate legacy model.
- Technical codes are never the primary user-facing UX.
- Technical details appear only behind disclosures.
- The contract must be stable for every node.

## Backend root causes to fix

### 1. Workflow Run does not consistently use debug-node readiness

The debug-node path uses a dynamic node readiness resolver that understands node operations and required fields. The workflow Run path still has places that can produce legacy/generic readiness payloads.

Fix:

- Workflow Run must call the same node readiness resolver for every node.
- It must aggregate the per-node results.
- It must return the canonical workflow readiness envelope.
- It must not downgrade specific issues into vague strings.

### 2. Multiple backend systems decide readiness independently

There are separate paths for:

- node readiness
- workflow missing-items
- distributed workflow execution
- direct workflow execution
- connection discovery
- credential resolution
- execution preflight
- workflow save/open setup state

Fix:

- Keep one canonical workflow readiness service.
- Every route that decides whether a workflow can run must call it.
- Other systems may contribute issues, but they cannot replace or hide canonical issues.

### 3. Connection identity is ambiguous

Some saved workflow configs can store a provider/credential alias in a field that another backend path treats as a saved connection id.

Fix:

- A saved connection id must always be a UUID or equivalent database id.
- A provider id must be stored separately.
- A credential type id must be stored separately.
- Connection reference validation must never query the database with a provider alias as a connection id.
- Legacy aliases must be normalized or reported as repairable configuration issues.
- The normalization must be generic and registry-driven.

### 4. Active saved connection and runtime credential state can drift

The user can have an active saved connection visible in the Connections page, while runtime credential material is missing, expired, revoked, or missing permissions.

Fix:

- Readiness must distinguish:
  - no saved connection
  - invalid selected connection reference
  - active connection exists but runtime credential is missing
  - active connection exists but permission/scope is missing
  - active connection exists but expired/revoked
  - active connection is ready
- The UI action must match the state:
  - connect
  - select connection
  - reconnect
  - repair
  - fill field

### 5. Operation-specific fields are getting collapsed

Workflow-level guidance can collapse exact required fields into generic phrases.

Fix:

- Required fields must be resolved from node metadata plus selected operation.
- The backend must return one issue per missing field.
- The frontend must render every missing field.
- The properties panel must highlight or annotate the same fields.

### 6. Execution preflight can overwrite better guidance

Preflight can add useful runtime blockers, but it must not replace operation-aware missing field and connection issues with generic credential guidance.

Fix:

- Preflight should consume canonical readiness first.
- If canonical readiness has blocking issues, return those issues unchanged.
- Preflight may append runtime-only issues.
- Preflight must never collapse canonical issues into one string.

### 7. Frontend fallback logic hides the real issue list

The frontend already has guidance formatting that can use detailed readiness issues, but workflow-level paths still sometimes feed it vague payloads or use fallback strings.

Fix:

- The workflow panel must prefer canonical `readinessIssues`.
- Fallback strings should be used only for unexpected errors.
- The workflow panel should never render vague setup text if structured issues exist.
- The Run panel, connection gate, debug output, execution console, and properties panel must consume the same issue model.

## Backend implementation plan

### Phase 1: Build the workflow readiness aggregator

Create or harden a service that:

1. Loads the workflow graph.
2. Iterates every node.
3. Resolves selected operation for each node.
4. Runs the canonical node readiness resolver for each node.
5. Resolves connection requirements through registries.
6. Validates saved connection refs safely.
7. Checks active saved user connections.
8. Checks runtime credential usability only when the connection type requires it.
9. Converts every blocker into a `ReadinessIssue`.
10. Returns the canonical `WorkflowReadiness` envelope.

The aggregator must not contain provider-specific branches. Provider behavior must come from registries, connector definitions, credential definitions, or shared resolver APIs.

### Phase 2: Make all run/readiness endpoints use it

Wire the aggregator into:

- workflow missing-items route
- distributed workflow execution route
- direct workflow execution route
- debug-node route
- save/open workflow readiness checks
- attach-inputs or setup-finalization flow
- execution preflight

All of them must return or preserve:

- `readinessIssues`
- `missingInputs`
- `missingCredentials`
- `invalidInputs`
- `runtimeValidationIssues`
- `groupedIssues`

### Phase 3: Normalize connection references

Add a generic normalization layer:

- If a node has a valid saved connection id, honor it.
- If a node has a malformed connection ref, return `invalid_connection_ref`.
- If a node has an old provider/credential alias where a connection id is expected, do not crash.
- If exactly one matching active saved connection exists, resolve it and optionally normalize on save.
- If multiple matching active saved connections exist, ask the user to select one.
- If none exists, return missing connection guidance.

### Phase 4: Align saved connections and runtime credentials

Connection creation, OAuth callback, reconnect, update, and delete must keep saved connection records and runtime credential records in sync.

Readiness should use a single resolver that can answer:

- Does the user have an active saved connection for this requirement?
- Does the selected node reference a valid connection?
- Can runtime execution use that connection?
- Does it have the permissions required by this node operation?

### Phase 5: Prevent generic overwrite

Update execution preflight and error conversion:

- If canonical readiness exists, return it unchanged.
- If runtime validation finds additional blockers, append them as `runtimeValidationIssues`.
- Do not replace structured issues with `message`, `error`, `missingCredentials`, or legacy credential arrays.
- Do not convert expected readiness failures into thrown destructive errors.

## Frontend implementation plan

### Phase 1: Use the canonical issue model everywhere

The following UI surfaces must render from the same issue model:

- full workflow Run panel
- workflow connection gate
- execution console
- debug-node output panel
- properties panel field annotations
- reliability/status indicators

The full workflow Run panel must behave like debug-node, but across all nodes.

### Phase 2: Render a real issue list

The workflow panel must show one row per missing/invalid item:

- node label
- operation label
- field or connection label
- current status
- required action

Examples of desired row shapes:

```text
Input: [field label] for [node label] ([operation label])
Connection: [connection label] for [node label] ([operation label])
Permission: [permission label] for [node label] ([operation label])
Configuration: [specific issue] for [node label] ([operation label])
```

The UI must not compress this into "some required fields".

### Phase 3: Refetch readiness at the right moments

Refetch immediately:

- on workflow page load
- after workflow save
- after attach-inputs/setup update
- after return from Connections
- after OAuth callback/reconnect/update/delete
- before Run
- after debug-node changes a field or connection

The panel must close automatically when readiness becomes ready.

### Phase 4: Keep technical details out of primary UX

Expected setup issues should use calm guided UI.

Do not show:

- destructive red toasts
- generic red error panels
- raw error codes as main status
- JSON payloads as the main message

Do show:

- specific missing setup list
- direct action buttons
- highlighted fields in properties panel
- technical details behind a disclosure

## Test plan

Backend tests must cover the universal behavior, not individual provider patches:

- workflow with multiple nodes and multiple missing operation-specific fields returns every field as a separate issue
- workflow with active saved connections returns ready for connection requirements
- workflow with no saved connection returns missing credential issues
- workflow with malformed connection ref returns invalid connection ref, not a thrown database error
- workflow with stale/deleted connection ref returns invalid connection ref
- workflow with active saved connection but unusable runtime credential returns reconnect/repair guidance
- workflow with insufficient permission returns permission guidance
- workflow with multiple active matching connections asks for selection when required
- distributed workflow execution returns the canonical readiness envelope
- execution preflight preserves canonical issues and appends runtime issues only
- save/open/attach-inputs cannot mark a workflow ready while canonical blockers exist

Frontend tests must cover:

- debug-node and full workflow Run render equivalent guidance for the same node issue
- full workflow Run lists all missing fields across all nodes
- full workflow Run lists all missing/invalid connections across all nodes
- workflow panel does not show "some required fields" when issue details exist
- workflow panel does not show connection guidance when the blocker is a field
- workflow panel updates after returning from Connections
- workflow panel closes when backend readiness becomes ready
- no destructive toast appears for expected readiness/configuration blockers
- technical details remain behind disclosure
- properties panel highlights the relevant missing fields

## Definition of done

The fix is complete only when:

- Debug-node and full workflow Run use the same canonical readiness contract.
- The workflow panel is as specific and dynamic as debug-node, but aggregated across all nodes.
- All credential-capable nodes are resolved through registries/shared resolvers.
- No provider or node is hard-coded.
- Active saved connections are honored.
- Missing fields are not hidden behind connection guidance.
- Missing connections are not hidden behind field guidance.
- Runtime credential repair states are distinct from missing connection states.
- Preflight cannot overwrite specific blockers with generic messages.
- Frontend refetches after connection/save/return/run transitions.
- Relevant backend and frontend tests pass.
- Build passes.
- Changes are pushed to git.
- Backend and frontend are deployed to the correct production hosts.

## Next-chat prompt

Copy this prompt into the next chat:

```text
Read docs/UNIVERSAL_CONNECTION_READINESS_HANDOFF.md fully before making changes.

Implement the universal workflow readiness panel fix end-to-end.

Important context:
- The debug-node panel already works dynamically: it shows operation-aware, field-aware, connection-aware setup guidance for the selected node.
- The full workflow Run panel is still vague and inconsistent. It must be upgraded to use the same canonical readiness issue model as debug-node, aggregated across every node in the workflow.
- Do not patch one provider or one node. Do not hard-code any provider, credential type, operation, or node behavior. Use registries, connector definitions, credential definitions, and shared readiness resolvers.

Required backend work:
- Create or harden one canonical workflow readiness aggregator.
- For every node, resolve selected operation, required fields, required connections, valid connection refs, active saved user connections, runtime credential usability, permissions, invalid inputs, and runtime validation blockers.
- Return a stable canonical envelope with ready, readinessIssues, missingInputs, missingCredentials, invalidInputs, runtimeValidationIssues, groupedIssues, and technicalDetails.
- Make workflow missing-items, distributed workflow execution, direct workflow execution, debug-node, save/open readiness, attach-inputs/setup finalization, and execution preflight use this same contract.
- Ensure execution preflight cannot overwrite operation-specific blockers with generic credential or string fallback guidance.
- Handle malformed/stale/legacy connection refs generically without crashing.
- Distinguish missing connection, invalid selected connection, runtime credential missing, missing permission, expired/revoked connection, missing input, invalid input, and runtime validation.

Required frontend work:
- Make the full workflow Run panel render from canonical readinessIssues first.
- Render every issue with node label, operation label, field or connection label, current status, and action required.
- Never show vague copy like "some required fields" when structured issue details exist.
- Do not show connection guidance when the real blocker is a missing field.
- Do not show destructive red toasts or generic red panels for expected readiness/configuration blockers.
- Keep technical details only behind disclosures.
- Refetch readiness on workflow load, save, attach-inputs/setup update, return from Connections, OAuth/reconnect/update/delete, debug-node field/connection change, and immediately before Run.
- Close the panel automatically when readiness becomes ready.
- Keep properties panel field highlighting aligned with the same issues.

Testing and delivery:
- Add backend tests proving the aggregator works for multiple nodes, missing fields, missing connections, invalid refs, runtime credential repair states, permission blockers, execution preflight preservation, and distributed workflow run readiness.
- Add frontend tests proving debug-node and full workflow Run render equivalent guidance, full workflow Run lists every issue across nodes, no vague fallback appears when issue details exist, no destructive toast appears for expected blockers, refetch works after returning from Connections, and properties panel highlights relevant fields.
- Run relevant backend tests, frontend tests, type checks, lint, and build.
- Push to git.
- Deploy backend to Hostinger and frontend to the correct production Vercel/domain.
```
