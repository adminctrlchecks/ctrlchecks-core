# Implementation Plan

- [x] 1. Fix `intelligent-config-filler.ts` — write `_fillMode` instead of `_fieldModes`
  - Replace the `_fieldModes` block at the bottom of `analyzeAndFillConfig()` with a `_fillMode` write that preserves any entries already stamped by prior stages (e.g. `property-population-stage.ts`)
  - Remove the `_fieldModes` key from the returned `filled` object so no code path writes to the legacy key
  - The replacement block must:
    - Read any existing `filled._fillMode` object (or start from `{}`)
    - Iterate `inputSchema` entries and stamp `existingFillMode[name] = field.fillMode?.default ?? 'manual_static'` only when `existingFillMode[name] === undefined`
    - Assign `filled._fillMode = existingFillMode`
    - Call `delete (filled as any)._fieldModes`
  - _Requirements: 1.2, 1.6_

  - [x] 1.1 Apply the code change in `worker/src/services/ai/intelligent-config-filler.ts`
    - Locate the `// ── Write _fieldModes metadata` block inside `analyzeAndFillConfig()`
    - Replace it with the `_fillMode`-based block described in the design document (Fix 1)
    - Ensure the `delete (filled as any)._fieldModes` line is present
    - _Requirements: 1.2, 1.6_

  - [x] 1.2 Write unit tests for the `_fillMode` / no-`_fieldModes` contract
    - Create `worker/src/services/ai/__tests__/intelligent-config-filler-fillmode.test.ts`
    - Test: after `fillConfigurationsFromPrompt()`, every node config has `_fillMode` defined and is a non-null object
    - Test: after `fillConfigurationsFromPrompt()`, no node config contains a `_fieldModes` key
    - Test: `_fillMode` entries match the registry `fillMode.default` for each field
    - Test: existing `_fillMode` entries written by a prior stage are preserved (not overwritten)
    - Use `vitest` (`vi`, `describe`, `it`, `expect`) matching the pattern in `fillmode-stamp-unit.test.ts`
    - _Requirements: 1.2, 1.6_

  - [x] 1.3 Write property-based test — no `_fieldModes` key in any generated workflow
    - Add a property to `worker/src/services/ai/__tests__/intelligent-config-filler.property.test.ts`
    - **Validates: Requirements 1.6**
    - Property: for any node type in the registry, after `fillConfigurationsFromPrompt()`, `node.data.config._fieldModes` is `undefined`
    - Use `fast-check` with `fc.constantFrom(...allTypes)` and `numRuns: 100`
    - _Requirements: 1.6_

- [x] 2. Fix `ai-input-resolver.ts` — remove the `ENABLE_RUNTIME_AI_RESOLUTION` kill switch
  - Delete the four-line kill-switch block from `resolveInput()`:
    ```
    if (process.env.ENABLE_RUNTIME_AI_RESOLUTION !== 'true') {
      return { mode: 'json', value: {} };
    }
    ```
  - The comment above the block must also be removed
  - No other logic in `resolveInput()` changes
  - _Requirements: 4.2_

  - [x] 2.1 Apply the code change in `worker/src/core/ai-input-resolver.ts`
    - Remove the kill-switch block (lines starting with `// Kill switch:` through the closing `}`)
    - Verify the method signature and the rest of `resolveInput()` are unchanged
    - _Requirements: 4.2_

  - [x] 2.2 Write unit tests asserting the kill switch is gone
    - Create `worker/src/core/__tests__/ai-input-resolver-killswitch.test.ts`
    - Test: calling `resolveInput()` with `ENABLE_RUNTIME_AI_RESOLUTION` unset (or set to `'false'`) does NOT return `{ mode: 'json', value: {} }` immediately — it proceeds to call the LLM adapter
    - Test: calling `resolveInput()` with `ENABLE_RUNTIME_AI_RESOLUTION='false'` still invokes `this.llmAdapter.chat()`
    - Mock `LLMAdapter.chat` to return a minimal valid response; assert it was called
    - Use `vitest` matching the project pattern
    - _Requirements: 4.2_

- [x] 3. Fix `field-ownership-stage.ts` — sync `_fillMode` into node configs after building the map
  - After the existing `fieldOwnershipMap` building loop, add a second pass that writes `_fillMode` into each node's `data.config`
  - The sync pass must:
    - Iterate `workflow.nodes`
    - Look up `fieldOwnershipMap[node.id]`; skip nodes with no entry
    - Read `config._fillMode` (or start from `{}`)
    - For each `[fieldName, fillMode]` in the node's map entry, stamp only when `existing[fieldName] === undefined`
    - Write back `node.data.config = { ...config, _fillMode: existing }`
  - _Requirements: 1.3, 1.4_

  - [x] 3.1 Apply the code change in `worker/src/services/ai/stages/field-ownership-stage.ts`
    - Add the sync loop after the `fieldOwnershipMap` building loop, before the `durationMs` calculation
    - Follow the exact snippet from the design document (Fix 3)
    - _Requirements: 1.3, 1.4_

  - [x] 3.2 Write unit tests for `_fillMode` population in `runFieldOwnershipStage()`
    - Create `worker/src/services/ai/stages/__tests__/field-ownership-stage-fillmode.test.ts`
    - Test: after `runFieldOwnershipStage()`, every node that has a registry entry has `_fillMode` defined in its config
    - Test: `_fillMode` values match the registry `fillMode.default` for each field
    - Test: existing `_fillMode` entries in node config are preserved (not overwritten by the sync pass)
    - Test: nodes with no registry entry are left unchanged (no `_fillMode` added)
    - Use `vitest` and mock `unifiedNodeRegistry` following the pattern in `fillmode-stamp-unit.test.ts`
    - _Requirements: 1.3, 1.4_

  - [x] 3.3 Write property-based test — toggle consistency across all node types
    - Add a property to `worker/src/services/ai/stages/__tests__/preservation-fillmode-property.test.ts` (or create a new file if the existing one is unrelated)
    - **Validates: Requirements 1.3, 1.4**
    - Property: for any workflow whose nodes are drawn from the registry, after `runFieldOwnershipStage()`, every field in every node that has a non-`manual_static` registry `fillMode.default` has a matching `_fillMode` entry in `node.data.config._fillMode`
    - Use `fast-check` with `numRuns: 50`
    - _Requirements: 1.3, 1.4_

- [x] 4. Verify all three fixes together — integration checkpoint
  - Re-run the unit tests from tasks 1–3 to confirm all pass
  - Run the existing property tests that reference `_fieldModes` or `_fillMode` to confirm no regressions:
    - `worker/src/services/ai/__tests__/intelligent-config-filler.property.test.ts` (Property 12 will now fail — update it to assert `_fillMode` instead of `_fieldModes`)
    - `worker/src/services/ai/stages/__tests__/fillmode-stamp-unit.test.ts`
    - `worker/src/services/ai/stages/__tests__/fillmode-pipeline-integration.test.ts`
  - Confirm no TypeScript diagnostics in the three modified files:
    - `worker/src/services/ai/intelligent-config-filler.ts`
    - `worker/src/core/ai-input-resolver.ts`
    - `worker/src/services/ai/stages/field-ownership-stage.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 4.2_

  - [x] 4.1 Update Property 12 in `intelligent-config-filler.property.test.ts` to assert `_fillMode` not `_fieldModes`
    - The existing Property 12 test asserts `_fieldModes` is present and correct — after Fix 1 this key is deleted
    - Update the test to assert `_fillMode` is present, is an object, and every field has a valid mode matching the registry default
    - The test name should be updated to reflect the new key: `Property 12: Pre-filled fields are marked with _fillMode`
    - _Requirements: 1.2, 1.6_

  - [x] 4.2 Run the full test suite for the three changed files and confirm all tests pass
    - Run: `npx vitest run worker/src/services/ai/__tests__/intelligent-config-filler-fillmode.test.ts worker/src/core/__tests__/ai-input-resolver-killswitch.test.ts worker/src/services/ai/stages/__tests__/field-ownership-stage-fillmode.test.ts`
    - Run: `npx vitest run worker/src/services/ai/__tests__/intelligent-config-filler.property.test.ts`
    - All tests must pass before this task is marked complete
    - _Requirements: 1.1–1.6, 4.2_
