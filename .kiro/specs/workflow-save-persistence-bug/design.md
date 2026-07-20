# Workflow Save Persistence Bugfix Design

## Overview

Four related bugs cause the workflow save/persistence system to fail silently. The manual save path (`handleSave` in `WorkflowBuilder.tsx`) strips credential config values, omits the `graph` field from the DB payload, and calls `setIsDirty(false)` before a post-save side-effect can re-dirty the state. A fifth structural issue is that `handleSave` and `/api/save-workflow` write divergent payloads, so downstream endpoints (especially `attach-inputs`) fall back to stale data.

The fix strategy is:
1. Remove the credential-stripping filter from `handleSave`'s `inputsToAttach` loop (credentials belong in `data.config`, not in the `inputs` payload — the security filter in `attach-inputs` already handles raw OAuth tokens at the API boundary).
2. Include `graph: { nodes, edges }` in the Supabase `update`/`insert` payload inside `handleSave`, matching what `/api/save-workflow` writes.
3. Move `setIsDirty(false)` to after the `attach-inputs` call completes (or guard it with a `isSaving` ref so post-save `onNodesChange` events are ignored).
4. Unify the two save paths so `handleSave` delegates to `/api/save-workflow` instead of writing directly to Supabase.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs that trigger one of the four defects described in the requirements.
- **Property (P)**: The desired correct behavior for inputs where C holds.
- **Preservation**: Existing correct behaviors that must remain unchanged after the fix.
- **handleSave**: The `useCallback` in `ctrl_checks/src/pages/WorkflowBuilder.tsx` (line ~246) that is invoked when the user clicks the manual Save button.
- **save-workflow**: The API handler at `worker/src/api/save-workflow.ts` (POST `/api/save-workflow`) used by the auto-save path inside `handleRun`.
- **attach-inputs**: The API handler at `worker/src/api/attach-inputs.ts` (POST `/api/workflows/:id/attach-inputs`) that injects node config values into the workflow and transitions the workflow phase.
- **graph field**: The `graph` column in the `workflows` Supabase table, expected to contain `{ nodes, edges }`. Used by `attach-inputs` as the authoritative graph source when present.
- **isDirty**: Boolean state in `workflowStore.ts` that drives the "unsaved workflow" UI indicator. Set to `true` by `onNodesChange` / `onEdgesChange`; set to `false` by explicit `setIsDirty(false)` calls.
- **inputsToAttach**: The per-node config map built inside `handleSave` and sent to `attach-inputs`. Currently excludes credential keys — this is the source of bug 1.1.
- **isSaving**: React state boolean in `WorkflowBuilder` that is `true` for the duration of the save operation.

---

## Bug Details

### Bug Condition

The four bugs share a common trigger: the user presses the manual Save button, which invokes `handleSave`. Each sub-condition is independent.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { nodes: Node[], edges: Edge[], workflowId: string | null }
  OUTPUT: boolean

  // Bug 1.1 — credential stripping
  credentialStripped :=
    EXISTS node IN input.nodes
      WHERE EXISTS key IN node.data.config
        WHERE (key CONTAINS "credential" OR key CONTAINS "oauth")
          AND node.data.config[key] IS NOT NULL

  // Bug 1.2 — position not persisted
  positionLost :=
    EXISTS node IN input.nodes
      WHERE node.position.x != DEFAULT_X OR node.position.y != DEFAULT_Y

  // Bug 1.3 — isDirty not cleared
  dirtyNotCleared :=
    handleSave() completes successfully
    AND isDirty = true AFTER completion

  // Bug 1.4 — graph field missing
  graphFieldMissing :=
    handleSave() writes to Supabase
    AND "graph" NOT IN writtenPayload

  RETURN credentialStripped OR positionLost OR dirtyNotCleared OR graphFieldMissing
END FUNCTION
```

### Examples

**Bug 1.1 — Credential stripping:**
- User sets `apiKey: "sk-abc123"` on an HTTP Request node. After save + reload, `data.config.apiKey` is `undefined`. Expected: `"sk-abc123"`.

**Bug 1.2 — Position not persisted:**
- User drags a node to `{ x: 450, y: 300 }`. After save + reload, node appears at `{ x: 0, y: 150 }` (AI-generated default). Expected: `{ x: 450, y: 300 }`.

**Bug 1.3 — isDirty not clearing:**
- User saves a workflow. The "unsaved workflow" badge remains visible after the toast confirms success. Expected: badge disappears immediately after save.

**Bug 1.4 — graph field missing:**
- User saves via the Save button. `attach-inputs` is called later; it reads `workflow.graph` from the DB, finds it empty, falls back to stale AI-generated graph, and overwrites user edits. Expected: `workflow.graph` equals `{ nodes, edges }` as saved.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Non-credential node config values (e.g. `recipientEmails`, `subject`, `prompt`) must continue to be saved correctly in `data.config` and in the `inputsToAttach` payload sent to `attach-inputs`.
- The `/api/save-workflow` endpoint behavior (validation, normalization, versioning, graph field, metadata merge) must be completely unaffected.
- `attach-inputs` must continue to strip raw OAuth tokens and client secrets from the `inputs` payload it receives (security boundary at the API layer, not the frontend).
- `onNodesChange` and `onEdgesChange` must continue to set `isDirty = true` for genuine user edits after a save.
- Workflows whose nodes have never been repositioned must continue to receive the default hierarchical layout on load.
- The `attach-inputs` endpoint's position snapshot/restore logic (`buildPositionSnapshotFromNodes` / `mergePreservedNodePositions`) must continue to work correctly.

**Scope:**
All inputs that do NOT involve the manual Save button path are completely unaffected. This includes:
- Auto-save triggered by `handleRun` (already uses `/api/save-workflow`).
- The `AutonomousAgentWizard` save path.
- The `TemplateEditor` save path.
- Direct Supabase reads/writes outside `handleSave`.

---

## Hypothesized Root Cause

### Root Cause 1 — Credential Stripping (Bug 1.1)

In `handleSave`, the `inputsToAttach` loop at line ~360 explicitly skips keys containing `"credential"` or `"oauth"`:

```typescript
if (key.includes('credential') || key.includes('oauth')) return;
```

This filter was intended to prevent raw OAuth tokens from being sent to `attach-inputs`. However, it is applied to `data.config` values that the user has entered in the UI (e.g. `apiKey`, `credentialId`, `oauthToken`). These values are legitimate node configuration that must be persisted in `data.config` in the DB.

The security concern is valid but misplaced: `attach-inputs` already strips raw OAuth tokens at the API boundary before writing to the DB. The frontend filter is therefore redundant for security and harmful for persistence.

**Fix**: Remove the credential/oauth key filter from the `inputsToAttach` loop in `handleSave`. The `attach-inputs` API already handles the security boundary.

### Root Cause 2 — Node Positions Not Persisted (Bug 1.2)

`handleSave` builds `workflowData` as:

```typescript
const workflowData = {
  name, nodes: normalized.nodes, edges: normalized.edges,
  user_id, updated_at, status
};
```

The `graph` field is absent. When `attach-inputs` later reads the workflow from the DB, it checks `workflow.graph` first (line ~376 in `attach-inputs.ts`):

```typescript
const graphToNormalize = (workflow.graph && typeof workflow.graph === 'object' && Object.keys(workflow.graph).length > 0)
  ? workflow.graph
  : { nodes: parsedNodes, edges: parsedEdges };
```

If `graph` is empty/null, it falls back to `parsedNodes`/`parsedEdges`. The position snapshot is then built from `graphToNormalize.nodes` — which may be stale if the DB `nodes` column was not updated correctly. The `mergePreservedNodePositions` call at line ~1523 then has no positions to restore.

**Fix**: Add `graph: { nodes: normalized.nodes, edges: normalized.edges }` to `workflowData` in `handleSave`, mirroring what `/api/save-workflow` writes.

### Root Cause 3 — isDirty Not Clearing (Bug 1.3)

`setIsDirty(false)` is called at line ~442, after the `attach-inputs` fetch. However, the `attach-inputs` response triggers a state update in `PropertiesPanel` (the auto-persist timer at line ~1021 fires on `selectedNode?.data?.config` changes). This calls `setNodes` indirectly via the store's `updateNodeConfig` action, which sets `isDirty: true`.

More precisely: `setNodes` in the store does NOT set `isDirty` (line 91: `setNodes: (nodes) => set({ nodes })`). But `onNodesChange` DOES (line 97: `isDirty: true`). React Flow calls `onNodesChange` internally when the node array reference changes after a re-render triggered by the `attach-inputs` response updating some upstream state.

The sequence is:
1. `handleSave` calls `setIsDirty(false)` ✓
2. `attach-inputs` response arrives, some state updates
3. React Flow reconciles, fires `onNodesChange` with position/selection changes
4. `onNodesChange` sets `isDirty: true` ✗

**Fix**: Set a `isSavingRef` (a `useRef<boolean>`) that is `true` for the entire duration of `handleSave` (including the `attach-inputs` call). Guard `onNodesChange` and `onEdgesChange` in the store so they do not set `isDirty` while `isSavingRef.current` is true. Clear the ref in the `finally` block. Alternatively, move `setIsDirty(false)` to the very end of the `finally` block so it always runs last.

The simpler fix: move `setIsDirty(false)` into the `finally` block (after `setIsSaving(false)`), so it always executes last regardless of the `attach-inputs` outcome. This ensures any intermediate `isDirty: true` set by React Flow reconciliation is overwritten.

### Root Cause 4 — Divergent Save Paths (Bug 1.4)

`handleSave` writes directly to Supabase with a partial payload `{ name, nodes, edges, user_id, updated_at, status }`. The `/api/save-workflow` endpoint writes `{ name, nodes, edges, graph, settings, metadata, schema_version }`. All downstream endpoints (`attach-inputs`, `execute-workflow`, version manager) expect the full payload.

The cleanest fix is to unify the paths: make `handleSave` call `/api/save-workflow` instead of writing to Supabase directly. This eliminates the divergence entirely and ensures validation, normalization, versioning, and the full payload are always applied.

If full unification is deferred, the minimum fix is to add `graph`, `settings`, and `schema_version` to `workflowData` in `handleSave`.

---

## Correctness Properties

Property 1: Bug Condition — Credential Config Values Survive Save Round-Trip

_For any_ node where `data.config` contains one or more keys whose name includes `"credential"` or `"oauth"` with a non-null value, the fixed `handleSave` function SHALL persist those key-value pairs in the `data.config` of the corresponding node in the Supabase `workflows` table, so that a subsequent read of the workflow returns the same credential config values.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Node Positions Survive Save Round-Trip

_For any_ node with a custom `position` (`x` and `y` are finite numbers), the fixed `handleSave` function SHALL write a `graph` field to the Supabase `workflows` table containing that node's exact `position.x` and `position.y`, so that `attach-inputs` can restore those positions via `mergePreservedNodePositions`.

**Validates: Requirements 2.2**

Property 3: Bug Condition — isDirty Is False After Successful Save

_For any_ successful invocation of `handleSave` (no thrown error, Supabase write succeeds, `attach-inputs` call completes), the fixed code SHALL leave `isDirty` as `false` in the workflow store after the entire save sequence (including post-save side-effects) completes, so the "unsaved workflow" indicator is not shown.

**Validates: Requirements 2.3**

Property 4: Bug Condition — handleSave Writes Full Payload Including graph

_For any_ workflow saved via the manual Save button, the fixed `handleSave` function SHALL write a payload to Supabase that includes `nodes`, `edges`, and `graph` fields, where `graph` equals `{ nodes: normalizedNodes, edges: normalizedEdges }`, matching the payload written by `/api/save-workflow`.

**Validates: Requirements 2.4**

Property 5: Preservation — Non-Credential Config Values Are Unaffected

_For any_ node config key that does NOT contain `"credential"` or `"oauth"`, the fixed `handleSave` function SHALL continue to include that key-value pair in the `inputsToAttach` payload sent to `attach-inputs`, preserving all non-credential configuration.

**Validates: Requirements 3.1**

Property 6: Preservation — attach-inputs Security Filter Is Unaffected

_For any_ inputs payload sent to the `attach-inputs` endpoint that contains raw OAuth tokens or client secrets, the fixed endpoint SHALL continue to strip those values before writing to the DB, preserving the existing security boundary.

**Validates: Requirements 3.5**

Property 7: Preservation — /api/save-workflow Behavior Is Unaffected

_For any_ workflow saved via `/api/save-workflow` (e.g. auto-save in `handleRun`), the fixed code SHALL produce the same DB row, response payload, and versioning behavior as before the fix, with no regression.

**Validates: Requirements 3.4**

---

## Fix Implementation

### Changes Required

#### File: `ctrl_checks/src/pages/WorkflowBuilder.tsx`

**Function**: `handleSave`

**Change 1 — Remove credential-stripping filter from inputsToAttach loop**

Current code (line ~360):
```typescript
if (key.includes('credential') || key.includes('oauth')) return;
```

Remove this line entirely. The `attach-inputs` API already strips raw OAuth tokens at the API boundary. Node-level credential config values (e.g. `credentialId`, `apiKey`) are legitimate `data.config` entries that must be persisted.

**Change 2 — Add graph field to workflowData**

Current code (line ~300):
```typescript
const workflowData = {
  name: useWorkflowStore.getState().workflowName,
  nodes: normalized.nodes as unknown as Json,
  edges: normalized.edges as unknown as Json,
  user_id: user.id,
  updated_at: new Date().toISOString(),
};
```

Add `graph` (and optionally `settings`, `schema_version`) to match `/api/save-workflow`:
```typescript
const workflowData = {
  name: useWorkflowStore.getState().workflowName,
  nodes: normalized.nodes as unknown as Json,
  edges: normalized.edges as unknown as Json,
  graph: { nodes: normalized.nodes, edges: normalized.edges } as unknown as Json,
  settings: {} as unknown as Json,
  schema_version: 2,
  user_id: user.id,
  updated_at: new Date().toISOString(),
};
```

**Change 3 — Move setIsDirty(false) to finally block**

Current code: `setIsDirty(false)` is called inside the `try` block after the `attach-inputs` call, before `setIsSaving(false)`.

Move it to the `finally` block, after `setIsSaving(false)`, so it always executes last and overwrites any intermediate `isDirty: true` set by React Flow reconciliation:

```typescript
} finally {
  setIsSaving(false);
  setIsDirty(false); // Always clear dirty state after save attempt completes
}
```

Note: Only call `setIsDirty(false)` in `finally` when the save actually succeeded. Use a local `saveSucceeded` boolean flag set in the `try` block:

```typescript
let saveSucceeded = false;
try {
  // ... save logic ...
  saveSucceeded = true;
} catch (error) {
  // ... error handling ...
} finally {
  setIsSaving(false);
  if (saveSucceeded) setIsDirty(false);
}
```

**Change 4 (Optional — Full Unification): Delegate to /api/save-workflow**

For full unification, replace the direct Supabase write in `handleSave` with a call to `/api/save-workflow`. This eliminates the divergence entirely:

```typescript
const response = await fetch(`${ENDPOINTS.itemBackend}/api/save-workflow`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({
    workflowId: savedWorkflowId,
    name: useWorkflowStore.getState().workflowName,
    nodes: normalized.nodes,
    edges: normalized.edges,
    user_id: user.id,
  }),
});
if (!response.ok) throw new Error('Save failed');
const { workflowId: returnedId } = await response.json();
savedWorkflowId = returnedId;
```

This approach requires handling the Google OAuth check that `/api/save-workflow` enforces (it calls `requireGoogleAuth`). If that check is not appropriate for all manual saves, keep the direct Supabase write but apply Changes 1–3 above.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that exercise `handleSave`'s internal logic (credential filter, payload construction, isDirty sequencing) against the unfixed code. Run on unfixed code to observe failures.

**Test Cases**:

1. **Credential Stripping Test**: Create a node with `data.config = { apiKey: "sk-test", subject: "hello" }`. Run the `inputsToAttach` construction loop. Assert that `apiKey` is present in the result. (Will fail on unfixed code — `apiKey` is stripped because it doesn't contain "credential"/"oauth", but a key named `credentialId` would be stripped.)

2. **Graph Field Missing Test**: Call `handleSave` with a mocked Supabase client. Capture the payload passed to `.update()` or `.insert()`. Assert that `payload.graph` is defined and equals `{ nodes: ..., edges: ... }`. (Will fail on unfixed code — `graph` is absent.)

3. **isDirty Re-Set Test**: Mock `handleSave` to complete successfully, then simulate a React Flow `onNodesChange` event firing after `setIsDirty(false)`. Assert that `isDirty` is `false` after the full sequence. (Will fail on unfixed code — `onNodesChange` re-sets `isDirty: true`.)

4. **Position Round-Trip Test**: Create nodes with custom positions `{ x: 450, y: 300 }`. Call `handleSave`. Read the captured Supabase payload. Assert `payload.graph.nodes[0].position` equals `{ x: 450, y: 300 }`. (Will fail on unfixed code — `graph` is absent.)

**Expected Counterexamples**:
- `inputsToAttach` for a node with `credentialId: "cred-123"` is empty (key stripped).
- Supabase update payload has no `graph` key.
- `isDirty` is `true` after a successful save when React Flow fires `onNodesChange`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL node WHERE node.data.config HAS credential/oauth key DO
  result := handleSave_fixed({ nodes: [node], edges: [] })
  capturedPayload := supabaseMock.lastUpdate()
  ASSERT capturedPayload.nodes[0].data.config CONTAINS credential key
END FOR

FOR ALL node WHERE node.position IS custom DO
  result := handleSave_fixed({ nodes: [node], edges: [] })
  capturedPayload := supabaseMock.lastUpdate()
  ASSERT capturedPayload.graph.nodes[0].position EQUALS node.position
END FOR

FOR ALL successfulSave DO
  result := handleSave_fixed(input)
  ASSERT workflowStore.isDirty = false
END FOR

FOR ALL save DO
  result := handleSave_fixed(input)
  capturedPayload := supabaseMock.lastUpdate()
  ASSERT "graph" IN capturedPayload
  ASSERT capturedPayload.graph.nodes = capturedPayload.nodes
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL node WHERE node.data.config HAS NO credential/oauth key DO
  original := inputsToAttach_original(node)
  fixed    := inputsToAttach_fixed(node)
  ASSERT original = fixed
END FOR

FOR ALL workflow SAVED via /api/save-workflow DO
  ASSERT saveWorkflowHandler_fixed(workflow) = saveWorkflowHandler_original(workflow)
END FOR

FOR ALL inputs WHERE inputs HAS raw OAuth token DO
  ASSERT attachInputs_fixed(inputs).persistedInputs HAS NO raw OAuth token
END FOR
```

**Testing Approach**: Property-based testing is recommended for the credential filter and position preservation checks because:
- It generates many random node configs automatically, covering edge cases like keys that partially match "credential" (e.g. `credentialId`, `oauthScope`, `apiCredential`).
- It provides strong guarantees that non-credential keys are never accidentally stripped.
- It catches regressions in the `attach-inputs` security filter across many input shapes.

**Test Cases**:
1. **Non-Credential Config Preservation**: Generate random node configs with no credential/oauth keys. Assert `inputsToAttach` output is identical before and after the fix.
2. **attach-inputs Security Filter Preservation**: Send a payload with `oauthToken: "raw-token"` to `attach-inputs`. Assert the persisted `inputs` column does not contain `oauthToken`.
3. **save-workflow Endpoint Preservation**: Call `/api/save-workflow` with a valid workflow. Assert response shape and DB row are unchanged.
4. **isDirty on User Edit Preservation**: After a successful save, simulate a user dragging a node. Assert `isDirty` becomes `true`.

### Unit Tests

- Test the `inputsToAttach` construction loop: credential keys are included, `_`-prefixed keys are excluded, null/undefined values are excluded.
- Test `workflowData` payload shape: `graph` field is present and equals `{ nodes, edges }`.
- Test `isDirty` sequencing: `setIsDirty(false)` is called after `attach-inputs` completes, not before.
- Test that `saveSucceeded = false` on Supabase error prevents `setIsDirty(false)` from being called.

### Property-Based Tests

- Generate random arrays of node configs (mix of credential and non-credential keys). For each, assert that after the fix, all non-null, non-`_`-prefixed keys appear in `inputsToAttach` regardless of whether they contain "credential" or "oauth".
- Generate random node position arrays. For each, assert that `workflowData.graph.nodes` preserves all positions exactly.
- Generate random inputs payloads for `attach-inputs` containing OAuth token keys. Assert none appear in the persisted `inputs` column.

### Integration Tests

- Full save round-trip: create a workflow with credential config values, save via the Save button, reload from DB, assert credential values are present.
- Full position round-trip: drag nodes to custom positions, save, reload, assert positions match.
- isDirty indicator: save a workflow, assert the "unsaved workflow" badge disappears and does not reappear without a user edit.
- Divergent path parity: save the same workflow via both `handleSave` and `/api/save-workflow`, assert the DB rows have the same `graph`, `nodes`, and `edges` fields.
