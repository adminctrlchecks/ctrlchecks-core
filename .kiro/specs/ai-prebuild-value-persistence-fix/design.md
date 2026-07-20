# AI Pre-Build Value Persistence Fix — Bugfix Design

## Overview

AI-generated values written by `property-population-stage` are silently overwritten on every
`attach-inputs` call because the `_fillMode` metadata that guards those values is never stamped
during generation. The fix has two stamping sites (generation + materializer), one guard
enhancement in `attach-inputs`, and a frontend contract that sends fill-mode keys alongside
field values so the backend can persist both atomically.

## Glossary

- **Bug_Condition (C)**: `_fillMode[fieldName]` is absent from `node.data.config` after AI
  generation, causing `resolveEffectiveFieldFillMode` to fall back to `manual_static` and
  `shouldPreserveExistingBuildtimeValue` to return `{ preserve: false }` for every field.
- **Property (P)**: After the fix, every field whose `fillMode.default === 'buildtime_ai_once'`
  that was written by the AI SHALL have `_fillMode[fieldName] = 'buildtime_ai_once'` in
  `node.data.config`, causing the guard to fire and the value to survive `attach-inputs`.
- **Preservation**: All existing behaviour for `manual_static` fields, credential-owned fields,
  `cases`/`rules` branch fields, and the post-freeze readonly path must remain unchanged.
- **`property-population-stage`**: `worker/src/services/ai/stages/property-population-stage.ts` —
  the LLM stage that writes AI values into `node.data.config` for every `buildtime_ai_once` field.
- **`structure-materializer`**: `worker/src/services/ai/structure-materializer.ts` —
  stamps `_fillMode` for structural fields; currently only covers `isStructuralOwnership` fields.
- **`attach-inputs`**: `worker/src/api/attach-inputs.ts` — the endpoint called after generation
  to inject user/wizard values; reads `_fillMode` to decide whether to preserve or overwrite.
- **`resolveEffectiveFieldFillMode`**: `worker/src/core/utils/fill-mode-resolver.ts` — resolves
  the effective fill mode for a field: explicit `_fillMode` entry wins over schema default.
- **`shouldPreserveExistingBuildtimeValue`**: `worker/src/core/utils/attach-inputs-merge-guard.ts`
  — returns `{ preserve: true }` only when effective mode is `buildtime_ai_once` AND the
  incoming value is weaker than the stored value.
- **`collectEffectiveFillModesForWizard`**: exported from `attach-inputs.ts` — serialises
  `_fillMode` maps into `mode_<nodeId>_<fieldName>` keys for the wizard round-trip.
- **`extractNodeConfigForAttachInputs`**: `ctrl_checks/src/lib/attach-inputs-payload.ts` —
  already includes `_fillMode` in the payload via `ATTACH_INPUTS_PERSISTABLE_META_KEYS`.
- **`snapshotConfigFieldToString`**: `ctrl_checks/src/lib/wizard-config-snapshot.ts` — converts
  a raw config value to a display string for wizard pre-fill.

---

## Bug Details

### Bug Condition

The bug manifests when `property-population-stage` writes AI values into `node.data.config`
without also writing `config._fillMode[fieldName] = 'buildtime_ai_once'`. Because
`resolveEffectiveFieldFillMode` checks `config._fillMode` first and only falls back to the
schema default when no explicit entry exists, the absence of the entry means the effective mode
resolves to `manual_static` (the ultimate fallback). `shouldPreserveExistingBuildtimeValue`
then returns `{ preserve: false }` unconditionally, and `attach-inputs` overwrites the AI value.

**Formal Specification:**

```
FUNCTION isBugCondition(node, fieldName)
  INPUT:  node       — a workflow node after property-population-stage has run
          fieldName  — a field whose fillMode.default === 'buildtime_ai_once'
  OUTPUT: boolean

  RETURN node.data.config[fieldName] IS NOT EMPTY
         AND node.data.config._fillMode[fieldName] IS UNDEFINED
END FUNCTION
```

### Examples

- **Slack `text`**: AI writes `"Please review the attached report"` into `config.text` but
  `config._fillMode.text` is absent → `attach-inputs` resolves mode as `manual_static` →
  `shouldPreserveExistingBuildtimeValue` returns `{ preserve: false }` → value overwritten
  with empty string from wizard → `appliedFields: []`.
- **`if_else` `conditions`**: AI writes a conditions array; no `_fillMode.conditions` entry →
  wizard sends `conditions: []` → array-shrink guard never fires (mode is `manual_static`) →
  conditions wiped.
- **`form` `fields`**: AI writes form field definitions; `structure-materializer` stamps
  `_fillMode.fields = 'buildtime_ai_once'` only because `fields` is `isStructuralOwnership`.
  Non-structural `buildtime_ai_once` fields on the same node (e.g. a `title` field) are not
  stamped → same overwrite path.
- **Edge case — empty AI value**: If the LLM returns an empty value for a field, the stage
  falls back to `defaultConfig()`. No `_fillMode` entry is written. This is correct: an empty
  value should not be protected.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `manual_static` fields (no `fillMode.default` or `fillMode.default === 'manual_static'`) must
  continue to be freely overwritten by `attach-inputs` as before.
- Credential-owned fields (`isCredentialOwnership`) must continue to route through
  `shouldApplyCredentialOwnedFieldViaAttachInputs` unchanged.
- `cases` and `rules` (in `STRUCTURAL_BRANCH_FIELDS`) must remain exempt from array-shrink
  protection so users can freely reduce switch branch counts.
- The post-freeze readonly path in `structure-materializer` (`freezeBoundary.frozen === true`)
  must continue to return the workflow unchanged without stamping any `_fillMode` entries.
- When `attach-inputs` receives an explicit `mode_<nodeId>_<fieldName> = 'manual_static'` key,
  it must continue to accept and apply the user-supplied value, overriding any prior AI value.
- When `attach-inputs` receives a non-empty incoming value for a `buildtime_ai_once` field
  whose existing stored value is empty, it must continue to apply the incoming value (no false
  preservation of empty defaults).

**Scope:**
All inputs that do NOT involve fields whose `fillMode.default === 'buildtime_ai_once'` are
completely unaffected by this fix. This includes:
- All `manual_static` fields across every node type.
- All credential-owned fields.
- All `runtime_ai` fields (cleared at execution time, not touched here).
- All `cases`/`rules` branch fields.

---

## Hypothesized Root Cause

1. **Missing stamp in `property-population-stage`** (primary): The merge at line ~`node.data.config = { ...nodeDef.defaultConfig(), ...prior, ...filteredLlmValues }` writes field values but never initialises or writes to `config._fillMode`. The `_fillMode` object is not part of `defaultConfig()` and is not constructed by the stage.

2. **Incomplete stamp in `structure-materializer`** (secondary): `materializeStructuralFields` iterates `inputSchema` entries but only stamps `_fillMode` for fields where `isStructuralOwnership(fieldName, fieldDef)` is true. Non-structural `buildtime_ai_once` fields (e.g. Slack `text`, `channel`, `username`; `if_else` `conditions`) are skipped by the `if (!isStructuralOwnership(...)) continue` guard.

3. **`resolveEffectiveFieldFillMode` fallback chain**: The resolver correctly prefers `config._fillMode[fieldName]` over the schema default, but when neither is present it returns `manual_static`. This is correct behaviour — the bug is the missing stamp, not the resolver.

4. **Frontend round-trip gap**: `collectEffectiveFillModesForWizard` serialises `_fillMode` into `mode_<nodeId>_<fieldName>` keys for the wizard. If `_fillMode` was never stamped, the wizard never receives these keys, so the Configuration step cannot send them back, and `attach-inputs` has no explicit mode override to apply.

---

## Correctness Properties

Property 1: Bug Condition — AI-Written Fields Carry `_fillMode` Stamp

_For any_ node field where `fillMode.default === 'buildtime_ai_once'` and
`property-population-stage` writes a non-empty value into `node.data.config[fieldName]`,
the fixed stage SHALL also write `config._fillMode[fieldName] = 'buildtime_ai_once'` into
the same config object, so that `resolveEffectiveFieldFillMode` returns `'buildtime_ai_once'`
and `shouldPreserveExistingBuildtimeValue` can return `{ preserve: true }` on subsequent
`attach-inputs` calls.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Non-AI Fields Are Unaffected

_For any_ node field where `isBugCondition` does NOT hold (field is `manual_static`,
credential-owned, a branch field, or has an empty AI value), the fixed code SHALL produce
exactly the same `node.data.config` state as the original code, preserving all existing
`attach-inputs` overwrite behaviour for those fields.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

#### File 1: `worker/src/services/ai/stages/property-population-stage.ts`

**Function**: `runPropertyPopulationStage` — the merge block at the end of the per-node loop.

**Specific Changes**:

After `filteredLlmValues` is assembled and before the final config merge, stamp `_fillMode`
for every key that will be written:

```typescript
// ── 2.5 Stamp _fillMode for every AI-written field ───────────────────────
const priorFillMode =
  typeof (prior as any)._fillMode === 'object' && (prior as any)._fillMode !== null
    ? { ...(prior as any)._fillMode }
    : {};

for (const key of Object.keys(filteredLlmValues)) {
  // Only stamp if the value is non-empty (empty values fall back to defaultConfig,
  // which should not be protected as AI-built).
  const v = filteredLlmValues[key];
  const isEmpty =
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);
  if (!isEmpty) {
    priorFillMode[key] = 'buildtime_ai_once';
  }
}

// ── 2.5 Merge over defaults + existing config ────────────────────────────
const prior = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {};
node.data.config = {
  ...nodeDef.defaultConfig(),
  ...prior,
  ...filteredLlmValues,
  _fillMode: priorFillMode,   // ← NEW: always write the stamped map
};
```

**Key constraints**:
- Only stamp fields that are in `filteredLlmValues` (already gated to `buildtime_ai_once`,
  non-credential, non-empty after LLM parse).
- Preserve any existing `_fillMode` entries from `prior` (e.g. structural fields already
  stamped by an earlier materializer pass).
- Do NOT stamp fields whose value is empty/null/`[]`/`{}` — those are defaultConfig fallbacks
  and should not be protected.
- The soft-failure path (LLM error → `defaultConfig`) must NOT stamp `_fillMode` because no
  AI value was actually written.

---

#### File 2: `worker/src/services/ai/structure-materializer.ts`

**Function**: `materializeStructuralFields` — the `for (const [fieldName, fieldDef] of Object.entries(inputSchema))` loop.

**Specific Changes**:

The existing loop already stamps `_fillMode` for structural fields. Add a second pass
immediately after the structural loop to stamp all remaining `buildtime_ai_once` fields that
have a non-empty value in config but no explicit `_fillMode` entry:

```typescript
// ── NEW: Stamp _fillMode for non-structural buildtime_ai_once fields ─────
// property-population-stage may have written values without stamping _fillMode
// (pre-fix workflows). Ensure every field with fillMode.default === 'buildtime_ai_once'
// and a non-empty stored value carries the stamp so attach-inputs can guard it.
for (const [fieldName, fieldDef] of Object.entries(inputSchema)) {
  if (isStructuralOwnership(fieldName, fieldDef)) continue; // already handled above
  if (fieldDef.fillMode?.default !== 'buildtime_ai_once') continue;
  if (fieldDef.ownership === 'credential') continue;
  if (fillMode[fieldName] !== undefined) continue; // already stamped — don't overwrite

  const storedValue = config[fieldName];
  const isEmpty =
    storedValue === undefined ||
    storedValue === null ||
    storedValue === '' ||
    (Array.isArray(storedValue) && storedValue.length === 0) ||
    (typeof storedValue === 'object' &&
      !Array.isArray(storedValue) &&
      Object.keys(storedValue as object).length === 0);

  if (!isEmpty) {
    fillMode[fieldName] = 'buildtime_ai_once';
    changed = true;
  }
}
```

**Placement**: Insert this block after the existing structural-field loop (the one that
coerces `runtime_ai → buildtime_ai_once` for structural fields) and before the
`buildEffectiveFillModes` pass.

**Key constraints**:
- Skip fields already stamped (`fillMode[fieldName] !== undefined`) — never downgrade a
  `manual_static` stamp that the user set explicitly.
- Skip credential-owned fields.
- Skip empty stored values — no value to protect.
- The post-freeze readonly guard at the top of `materializeStructuralFields` already returns
  early, so this new loop is automatically skipped in readonly mode.

---

#### File 3: `worker/src/api/attach-inputs.ts`

**Function**: `attachInputsHandler` — the per-node field application loop.

**Specific Changes**:

The `shouldPreserveExistingBuildtimeValue` call already exists and is correct. The bug is
upstream (no stamp), so no logic change is needed in the guard itself. However, two small
additions improve correctness:

**3a — `runtime_ai` field value clearing**: When `attach-inputs` receives
`mode_<nodeId>_<fieldName> = 'runtime_ai'`, it already writes `_fillMode[fieldName] = 'runtime_ai'`
(requirement 4.4). Ensure the stored static value is also cleared in the same pass:

```typescript
// After writing _fillMode[modeFieldName] = 'runtime_ai':
if (modePolicy.mode === 'runtime_ai') {
  // Clear any stored static value so AI fills it at runtime (req 4.3, 4.4)
  if ((config as any)[modeFieldName] !== undefined) {
    delete (config as any)[modeFieldName];
    updated = true;
  }
  modeDiagnostics.runtimeOwnedFields.push({ nodeId: node.id, nodeType, fieldName: modeFieldName });
}
```

**3b — `manual_static` override clears `buildtime_ai_once` stamp**: When
`mode_<nodeId>_<fieldName> = 'manual_static'` is received for a field that was
`buildtime_ai_once`, the mode is already written to `_fillMode`. No additional change needed —
the subsequent field-value application will overwrite the stored value because
`shouldPreserveExistingBuildtimeValue` checks the mode AFTER the `mode_` key is processed
(keys are sorted: `mode_` before field values).

**3c — Diagnostic logging**: Add `buildtime_ai_once` stamp presence to the per-node log so
missing stamps are visible in production logs:

```typescript
// After building `config` from existingConfig, before the key loop:
const stampedBuildtimeFields = Object.entries(
  (config._fillMode as Record<string, string> | undefined) ?? {}
)
  .filter(([, m]) => m === 'buildtime_ai_once')
  .map(([f]) => f);
if (stampedBuildtimeFields.length > 0) {
  console.log(
    `[AttachInputs] Node ${node.id} (${nodeType}) has ${stampedBuildtimeFields.length} buildtime_ai_once stamps:`,
    stampedBuildtimeFields
  );
}
```

---

#### File 4: `worker/src/core/registry/unified-node-registry.ts`

No changes required. The registry is already the source of truth for `fillMode.default` per
field. The fix reads `fillMode.default` from the registry (via `inputSchema`) in both
`property-population-stage` and `structure-materializer` — no registry modifications needed.

---

#### File 5: Frontend — `ctrl_checks/src/components/workflow/AutonomousAgentWizard.tsx`

**Specific Changes**:

The wizard already calls `collectEffectiveFillModesForWizard` on the backend response and
stores the resulting `mode_<nodeId>_<fieldName>` keys. It also already sends them back via
`combinedInputs` in the `attach-inputs` POST. Once the backend stamps `_fillMode` correctly,
the round-trip works automatically.

However, the Configuration step must pre-populate field values from `node.data.config` so
users see AI-built values before deciding to keep, edit, or replace them. The wizard already
reads `node?.data?.config?.[q.fieldName]` and passes it through `snapshotConfigFieldToString`
for the `valueSnapshot`. This path is correct and requires no change.

The one gap is the **"You" button interaction** (requirement 4.1): when the user clicks "You"
on a `buildtime_ai_once` field, the wizard must send both the user's value AND
`mode_<nodeId>_<fieldName> = 'manual_static'` in the same `attach-inputs` payload. The wizard
already constructs `combinedInputs` by merging field values with `fillModeValues` — this is
correct. No code change needed beyond ensuring the fill-mode toggle updates `fillModeValues`
before the payload is assembled.

**Verify**: `applyFillModesToNodes` (line ~586) correctly writes `fillModeMap` back into
`node.data.config._fillMode` so `PropertiesPanel` reads the correct mode after wizard
submission. No change needed.

---

#### File 6: Frontend — `ctrl_checks/src/lib/attach-inputs-payload.ts`

No changes required. `extractNodeConfigForAttachInputs` already includes `_fillMode` in the
payload via `ATTACH_INPUTS_PERSISTABLE_META_KEYS`. When the backend stamps `_fillMode`
correctly, the frontend will receive it in the `attach-inputs` response
(`collectEffectiveFillModesForWizard` serialises it), and subsequent saves will round-trip it
correctly.

---

### `_fillMode` Stamping Contract

The contract after this fix:

| Stamping site | When | What is stamped |
|---|---|---|
| `property-population-stage` | After LLM values are written into `node.data.config` | `_fillMode[fieldName] = 'buildtime_ai_once'` for every non-empty field in `filteredLlmValues` |
| `structure-materializer` | During `materializeStructuralFields` | `_fillMode[fieldName] = 'buildtime_ai_once'` for structural fields (existing) + non-structural `buildtime_ai_once` fields with non-empty stored values (new) |
| `attach-inputs` (mode_ key) | When `mode_<nodeId>_<fieldName>` key is present in request | `_fillMode[fieldName]` = whatever mode the user/wizard sent (`manual_static`, `runtime_ai`, `buildtime_ai_once`) |

**Invariant**: After the fix, `config._fillMode[fieldName]` is always present for any field
that has a non-empty AI-built value. `resolveEffectiveFieldFillMode` will therefore always
return `'buildtime_ai_once'` for those fields, and `shouldPreserveExistingBuildtimeValue` will
correctly guard them.

---

### Data Flow: AI Generation → Storage → Configuration UI → `attach-inputs` → Persistence

```
1. AI Pipeline (property-population-stage)
   ├── LLM writes filteredLlmValues for buildtime_ai_once fields
   ├── [FIX] stamp _fillMode[fieldName] = 'buildtime_ai_once' for each non-empty value
   └── node.data.config = { ...defaults, ...prior, ...filteredLlmValues, _fillMode: stamped }

2. structure-materializer (called during workflow save / attach-inputs)
   ├── stamps _fillMode for structural fields (existing)
   ├── [FIX] stamps _fillMode for non-structural buildtime_ai_once fields with non-empty values
   └── returns updated workflow

3. Workflow saved to DB
   └── node.data.config._fillMode contains stamps for all AI-built fields

4. attach-inputs called (first time, from WorkflowBuilder.tsx auto-attach after save)
   ├── collectEffectiveFillModesForWizard reads _fillMode → produces mode_<nodeId>_<fieldName> keys
   ├── per-node loop: mode_ keys processed first (sorted), _fillMode written
   ├── per-field loop: shouldPreserveExistingBuildtimeValue checks _fillMode
   │   ├── mode === 'buildtime_ai_once' + incoming empty → { preserve: true } → field skipped
   │   └── mode === 'manual_static' → { preserve: false } → field applied normally
   └── response includes effectiveFillModes (mode_<nodeId>_<fieldName> keys)

5. Configuration UI (AutonomousAgentWizard / PropertiesPanel)
   ├── reads node.data.config[fieldName] for pre-population (snapshotConfigFieldToString)
   ├── reads _fillMode[fieldName] to show correct pill (You / AI build / AI runtime)
   ├── user keeps value → wizard sends field value + mode_<nodeId>_<fieldName> = 'buildtime_ai_once'
   ├── user edits value → wizard sends new value + mode_<nodeId>_<fieldName> = 'manual_static'
   ├── user clears value → wizard sends '' + mode_<nodeId>_<fieldName> = 'manual_static'
   └── user clicks AI (runtime) → wizard sends mode_<nodeId>_<fieldName> = 'runtime_ai' (no value)

6. attach-inputs called (second time, from wizard submit)
   ├── mode_ keys processed first: _fillMode updated per user intent
   ├── field values applied: shouldPreserveExistingBuildtimeValue fires correctly
   │   ├── buildtime_ai_once + empty incoming → preserved (user kept value)
   │   ├── manual_static (user edited/cleared) → applied
   │   └── runtime_ai → value cleared, _fillMode = 'runtime_ai'
   └── modeDiagnostics.buildtimeMergePreserved records preserved fields (no longer empty)

7. Workflow persisted to DB
   └── AI-built values survive; user overrides persist; runtime_ai fields are empty
```

---

## Testing Strategy

### Validation Approach

Two-phase: first surface counterexamples on unfixed code to confirm root cause, then verify
the fix and preservation on fixed code.

### Exploratory Bug Condition Checking

**Goal**: Confirm that `property-population-stage` does not stamp `_fillMode` and that
`attach-inputs` therefore overwrites AI values.

**Test Plan**: Call `runPropertyPopulationStage` with a mock workflow containing a Slack node
(fields: `text`, `channel` — both `buildtime_ai_once`). Assert that `node.data.config._fillMode`
is absent or empty after the stage. Then call `attachInputsHandler` with an empty `text` value
and assert that the AI-written value is overwritten (confirming the bug).

**Test Cases**:
1. **Slack `text` overwrite**: After `property-population-stage`, call `attach-inputs` with
   `text: ''` → assert `config.text` is now `''` (will fail on unfixed code, pass on fixed).
2. **`if_else` conditions wipe**: After stage, call `attach-inputs` with `conditions: []` →
   assert conditions array is wiped (will fail on unfixed code, pass on fixed).
3. **`_fillMode` absent after stage**: Assert `config._fillMode?.text === undefined` after
   stage runs on unfixed code (confirms root cause).
4. **`structure-materializer` misses non-structural fields**: Assert that after
   `materializeStructuralFields`, a Slack node's `_fillMode.text` is still absent (confirms
   secondary root cause).

**Expected Counterexamples**:
- `config._fillMode` is `undefined` or `{}` after `property-population-stage`.
- `attach-inputs` with empty incoming value overwrites AI-built `text`/`conditions`/`channel`.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce
the expected behaviour.

**Pseudocode:**
```
FOR ALL node WHERE isBugCondition(node, fieldName) DO
  result := runPropertyPopulationStage_fixed(node)
  ASSERT result.node.data.config._fillMode[fieldName] === 'buildtime_ai_once'

  attachResult := attachInputsHandler_fixed({ [fieldName]: '' })
  ASSERT attachResult.node.data.config[fieldName] === originalAiValue
  ASSERT attachResult.modeDiagnostics.buildtimeMergePreserved includes fieldName
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code
produces the same result as the original code.

**Pseudocode:**
```
FOR ALL node WHERE NOT isBugCondition(node, fieldName) DO
  ASSERT attachInputsHandler_original(node, inputs) === attachInputsHandler_fixed(node, inputs)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random field values and fill-mode combinations automatically.
- It catches edge cases (e.g. `cases`/`rules` with varying lengths, credential fields with
  `unlockable` policy) that manual tests miss.
- It provides strong guarantees that `manual_static` fields, credential fields, and branch
  fields are unaffected across the full input domain.

**Test Cases**:
1. **`manual_static` field unchanged**: Send a non-empty value for a `manual_static` field →
   assert it is applied (no false preservation).
2. **`cases`/`rules` shrink allowed**: Send a shorter `cases` array for a switch node →
   assert it is applied (STRUCTURAL_BRANCH_FIELDS exemption preserved).
3. **Credential field guard unchanged**: Send a value for a credential-owned field without
   `manual_static` mode → assert it is rejected.
4. **Post-freeze readonly unchanged**: Call `materializeStructuralFields` with
   `freezeBoundary.frozen = true` → assert no `_fillMode` entries are added.
5. **`runtime_ai` switch**: Send `mode_<nodeId>_text = 'runtime_ai'` → assert
   `_fillMode.text = 'runtime_ai'` and `config.text` is cleared.
6. **`manual_static` override of AI field**: Send `mode_<nodeId>_text = 'manual_static'` +
   `text: 'user value'` → assert `config.text = 'user value'` and `_fillMode.text = 'manual_static'`.

### Unit Tests

- `runPropertyPopulationStage`: assert `_fillMode` is stamped for every non-empty field in
  `filteredLlmValues`; assert `_fillMode` is NOT stamped for empty/null values; assert
  existing `_fillMode` entries from `prior` are preserved.
- `materializeStructuralFields`: assert non-structural `buildtime_ai_once` fields with
  non-empty stored values receive `_fillMode` stamp; assert already-stamped fields are not
  overwritten; assert empty stored values are not stamped.
- `shouldPreserveExistingBuildtimeValue`: existing tests cover the guard logic; add a test
  that confirms `{ preserve: true }` fires when `_fillMode[fieldName] = 'buildtime_ai_once'`
  is present and incoming value is empty.

### Property-Based Tests

- Generate random `filteredLlmValues` maps and assert that every non-empty entry produces a
  corresponding `_fillMode` stamp after `runPropertyPopulationStage`.
- Generate random node configs with mixed fill modes and assert that `attach-inputs` preserves
  `buildtime_ai_once` fields and overwrites `manual_static` fields across all combinations.
- Generate random `inputSchema` definitions and assert that `materializeStructuralFields`
  stamps exactly the fields with `fillMode.default === 'buildtime_ai_once'` and non-empty
  stored values.

### Integration Tests

- Full pipeline: `runPropertyPopulationStage` → `materializeStructuralFields` →
  `attachInputsHandler` (empty inputs) → assert all AI-built values survive.
- User override flow: same pipeline → `attachInputsHandler` with
  `mode_<nodeId>_text = 'manual_static'` + `text: 'override'` → assert override persists and
  `_fillMode.text = 'manual_static'`.
- Runtime AI flow: same pipeline → `attachInputsHandler` with
  `mode_<nodeId>_text = 'runtime_ai'` → assert `config.text` is cleared and
  `_fillMode.text = 'runtime_ai'`.
- Configuration UI round-trip: wizard reads `node.data.config.text` (non-empty AI value) →
  user submits without changing → `attach-inputs` preserves value →
  `modeDiagnostics.buildtimeMergePreserved` is non-empty.
