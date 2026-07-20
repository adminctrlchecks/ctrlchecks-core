# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - AI-Written Fields Missing `_fillMode` Stamp
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that `property-population-stage` writes field values without stamping `_fillMode`, causing `attach-inputs` to overwrite them
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — a Slack node with `text` and `channel` fields (`fillMode.default === 'buildtime_ai_once'`) where the LLM returns non-empty values
  - Test that after `runPropertyPopulationStage` writes a non-empty value for a `buildtime_ai_once` field, `node.data.config._fillMode[fieldName]` equals `'buildtime_ai_once'` (from Bug Condition in design: `isBugCondition` returns true when `config[fieldName]` is non-empty AND `config._fillMode[fieldName]` is undefined)
  - Also test that a subsequent `attachInputsHandler` call with an empty incoming value preserves the AI-written value (expected behavior from design Property 1)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS — `config._fillMode` is absent/empty after stage, and `attach-inputs` overwrites the AI value (counterexample: `config._fillMode?.text === undefined`, `config.text` becomes `''`)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-AI and Non-`buildtime_ai_once` Fields Are Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (fields where `isBugCondition` is false: `manual_static` fields, credential-owned fields, `cases`/`rules` branch fields, empty AI values, post-freeze readonly mode)
  - Observe: `manual_static` field with incoming non-empty value → value is applied (not preserved)
  - Observe: `cases` array shrink on a switch node → shorter array is accepted
  - Observe: credential-owned field without `manual_static` mode → field is rejected by credential guard
  - Observe: `materializeStructuralFields` with `freezeBoundary.frozen = true` → workflow returned unchanged, no `_fillMode` entries added
  - Observe: `buildtime_ai_once` field with empty AI value → no `_fillMode` stamp written
  - Write property-based tests: for all inputs where `isBugCondition` is false, `attachInputsHandler_fixed` produces the same result as `attachInputsHandler_original` (from Preservation Requirements in design)
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix: stamp `_fillMode` during AI generation and materializer, guard in `attach-inputs`

  - [x] 3.1 Stamp `_fillMode` in `property-population-stage` after writing LLM values
    - In `runPropertyPopulationStage`, after assembling `filteredLlmValues` and before the final config merge, build `priorFillMode` from any existing `config._fillMode` (preserve prior entries)
    - Iterate `Object.keys(filteredLlmValues)`: for each key whose value is non-empty (not `undefined`, `null`, `''`, `[]`, `{}`), write `priorFillMode[key] = 'buildtime_ai_once'`
    - Include `_fillMode: priorFillMode` in the final config merge: `node.data.config = { ...nodeDef.defaultConfig(), ...prior, ...filteredLlmValues, _fillMode: priorFillMode }`
    - Do NOT stamp fields whose value is empty — those fall back to `defaultConfig` and must not be protected
    - Do NOT stamp on the soft-failure path (LLM error → `defaultConfig`) — no AI value was written
    - _Bug_Condition: `isBugCondition(node, fieldName)` where `config[fieldName]` is non-empty AND `config._fillMode[fieldName]` is undefined_
    - _Expected_Behavior: after fix, `config._fillMode[fieldName] === 'buildtime_ai_once'` for every non-empty field in `filteredLlmValues`_
    - _Preservation: only fields in `filteredLlmValues` are stamped; existing `_fillMode` entries from `prior` are preserved; empty values are not stamped_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Add second pass in `structure-materializer` for non-structural `buildtime_ai_once` fields
    - In `materializeStructuralFields`, after the existing structural-field loop and before `buildEffectiveFillModes`, add a second loop over `Object.entries(inputSchema)`
    - Skip fields where `isStructuralOwnership(fieldName, fieldDef)` is true (already handled)
    - Skip fields where `fieldDef.fillMode?.default !== 'buildtime_ai_once'`
    - Skip credential-owned fields (`fieldDef.ownership === 'credential'`)
    - Skip fields where `fillMode[fieldName] !== undefined` (already stamped — never downgrade)
    - For remaining fields: if `config[fieldName]` is non-empty, write `fillMode[fieldName] = 'buildtime_ai_once'` and set `changed = true`
    - The post-freeze readonly guard at the top of `materializeStructuralFields` already returns early — this new loop is automatically skipped in readonly mode
    - _Bug_Condition: non-structural `buildtime_ai_once` fields (e.g. Slack `text`, `channel`) have non-empty stored values but no `_fillMode` entry after materializer_
    - _Expected_Behavior: after fix, every non-structural `buildtime_ai_once` field with a non-empty stored value carries `_fillMode[fieldName] = 'buildtime_ai_once'`_
    - _Preservation: already-stamped fields not overwritten; credential fields skipped; empty values not stamped; frozen workflows unchanged_
    - _Requirements: 1.5, 2.5_

  - [x] 3.3 Add `runtime_ai` value clearing and diagnostic logging in `attach-inputs`
    - When `attach-inputs` processes a `mode_<nodeId>_<fieldName> = 'runtime_ai'` key and writes `_fillMode[fieldName] = 'runtime_ai'`, also delete `config[fieldName]` if it is set, and set `updated = true`
    - After building `config` from `existingConfig` and before the key loop, collect all `_fillMode` entries with value `'buildtime_ai_once'` and log them: `[AttachInputs] Node ${node.id} (${nodeType}) has ${n} buildtime_ai_once stamps: [fieldNames]`
    - No changes to `shouldPreserveExistingBuildtimeValue` logic — the guard is correct; the bug is the missing upstream stamp
    - _Bug_Condition: `runtime_ai` mode key received but stored static value not cleared; missing stamps invisible in logs_
    - _Expected_Behavior: `config[fieldName]` is deleted when `runtime_ai` mode is set; stamp presence is visible in production logs_
    - _Preservation: `manual_static` override path unchanged; `buildtime_ai_once` guard unchanged; credential guard unchanged_
    - _Requirements: 4.3, 4.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI-Written Fields Carry `_fillMode` Stamp
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `config._fillMode[fieldName] === 'buildtime_ai_once'` after stage, and AI value survives `attach-inputs` with empty incoming value
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — stamp is present, value is preserved)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-AI and Non-`buildtime_ai_once` Fields Are Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — `manual_static`, credential, branch, frozen, and empty-value paths all behave identically to unfixed code)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Write unit tests for each changed function
  - `runPropertyPopulationStage`: assert `_fillMode` is stamped for every non-empty field in `filteredLlmValues`; assert `_fillMode` is NOT stamped for empty/null/`[]`/`{}` values; assert existing `_fillMode` entries from `prior` are preserved; assert soft-failure path (LLM error) does not stamp
  - `materializeStructuralFields`: assert non-structural `buildtime_ai_once` fields with non-empty stored values receive `_fillMode` stamp; assert already-stamped fields are not overwritten; assert empty stored values are not stamped; assert credential-owned fields are skipped; assert frozen workflow returns unchanged
  - `shouldPreserveExistingBuildtimeValue`: assert `{ preserve: true }` fires when `_fillMode[fieldName] = 'buildtime_ai_once'` is present and incoming value is empty; assert `{ preserve: false }` when mode is `manual_static`; assert `cases`/`rules` exemption still applies
  - `attachInputsHandler` `runtime_ai` path: assert `config[fieldName]` is deleted when `mode_<nodeId>_<fieldName> = 'runtime_ai'` is received
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.4_

- [x] 5. Write integration test for full pipeline round-trip
  - Full pipeline (fix checking): `runPropertyPopulationStage` → `materializeStructuralFields` → `attachInputsHandler` with empty inputs → assert all AI-built values survive and `modeDiagnostics.buildtimeMergePreserved` is non-empty
  - User override flow: same pipeline → `attachInputsHandler` with `mode_<nodeId>_text = 'manual_static'` + `text: 'override'` → assert override persists and `_fillMode.text = 'manual_static'`
  - Runtime AI flow: same pipeline → `attachInputsHandler` with `mode_<nodeId>_text = 'runtime_ai'` → assert `config.text` is cleared and `_fillMode.text = 'runtime_ai'`
  - Multi-call idempotency: call `attachInputsHandler` twice with empty inputs → assert AI-built values survive both calls (requirement 2.4)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Checkpoint — Ensure all tests pass
  - Run the full test suite covering `property-population-stage`, `structure-materializer`, `attach-inputs`, and integration tests
  - Ensure all tests pass; ask the user if questions arise

- [x] 7. Fix: parse JSON strings for array/object fields in `attach-inputs`
  - In `attach-inputs.ts`, before applying a field value, check if the field's `inputSchema` type is `array` or `object` AND the incoming `value` is a string
  - If so, attempt `JSON.parse(value)` and use the parsed result as the value to apply
  - If `JSON.parse` fails, log a warning and skip applying the value (leave existing intact)
  - After parsing, re-run `shouldPreserveExistingBuildtimeValue` with the parsed value so the guard can correctly compare array-to-array (not string-to-array)
  - This fixes the `fields` array being stored as a JSON string after the wizard round-trip, causing `Array.isArray(config.fields)` to return `false` in PropertiesPanel and the form builder to show no fields
  - _Requirements: 5.5, 5.6, 5.7_

- [ ] 8. Investigate: when does `studentName` field get lost from the `fields` array?
  - Add diagnostic logging to trace the `fields` array through the full pipeline:
    1. After `property-population-stage` writes the fields → log `config.fields.length` and field IDs
    2. After `materializeStructuralFields` → log `config.fields.length`
    3. In the wizard's `setInputValues` initialization → log what `node.data.config.fields` contains when read
    4. When the wizard sends the attach-inputs request → log what `inputValues[config_node_<id>_fields]` contains
    5. In `attach-inputs` after JSON parse → log the parsed array length and field IDs
    6. After `attach-inputs` applies the value → log `config.fields.length`
  - Run a test workflow generation and trace where the `studentName` field disappears
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
