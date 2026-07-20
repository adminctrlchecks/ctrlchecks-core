# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Single-Token Intent Field Extraction Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate that "collects `<word>` as input" phrases produce no extracted fields
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — intent text of the form "collects order status as input" where the target field key is `status`
  - Use fast-check to generate arbitrary single-word field names drawn from `["status", "category", "date", "url", "quantity", "price", "amount", "cost", "subject", "title", "rating", "score", "priority", "type"]`
  - For each generated word `w`, construct intent text `"A form that collects order ${w} as input"`, call `extractFieldNamesFromIntent(intentText)`, assert `result[0] === w`
  - Also assert that `deriveOrderedFieldKeysForForm(intentText, emptyWorkflow)[0] === w` end-to-end
  - Also assert that `buildFormFieldRecordsFromKeys([w])[0].key === w` and `buildFormFieldRecordsFromKeys([w])[0].type` is not `"text"` for type-inferrable keys like `date`, `url`, `quantity`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Document counterexamples found (e.g., `extractFieldNamesFromIntent("collects order status as input")` returns `[]` instead of `["status"]`)
  - Tag each test: `// Feature: form-node-intent-driven-fields, Property 1: Bug Condition`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Non-Placeholder Fields and Linear Workflows Unaffected
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: a form node with `fields = [{ id: "field_name", key: "name", label: "Name", type: "text", required: true }]` (non-placeholder) is left unchanged by the hydration layer on unfixed code — record this
  - Observe: a workflow with no form or form_trigger node produces no field derivation side-effects on unfixed code — record this
  - Observe: `isPlaceholderFormFields([{ id: "field_response_placeholder", key: "response" }])` returns `true` on unfixed code — record this
  - Observe: `isPlaceholderFormFields([{ id: "field_name", key: "name" }])` returns `false` on unfixed code — record this
  - Use fast-check to generate arbitrary non-placeholder field arrays — assert `isPlaceholderFormFields` returns `false` and the fields array is structurally unchanged after any hydration pass
  - Use fast-check to generate linear workflow prompts with no form node — assert `deriveOrderedFieldKeysForForm` returns `[]` when intent text is empty or contains no collection phrases
  - Verify `buildFormFieldRecordsFromKeys` preserves `required: true` and correct `id` prefix `"field_"` for all keys
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Tag each test: `// Feature: form-node-intent-driven-fields, Property 2: Preservation`
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 3. Fix form node intent-driven field extraction

  - [x] 3.1 Add single-token "collects/captures `<word>` as input" extraction pattern to `extractFieldNamesFromIntent`
    - In `worker/src/services/ai/intent-extraction.ts`, inside `extractFieldNamesFromIntent`, add a new regex pass after the existing `collectionClauses` block
    - Match pattern: `/\b(?:collect|capture)s?\s+(?:\w+\s+){0,3}(\w+)\s+as\s+(?:an?\s+)?input/gi`
    - For each match, extract capture group 1 (the field name token immediately before "as input") and call `push(match[1])`
    - This handles "collects order status as input" → extracts `status`, "captures customer email as input" → extracts `email`
    - _Bug_Condition: `extractFieldNamesFromIntent("collects order status as input").length === 0`_
    - _Expected_Behavior: `extractFieldNamesFromIntent("collects order status as input")[0] === "status"`_
    - _Preservation: all existing parenthetical, fields-clause, and multi-token collection patterns continue to produce the same results_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Expand `FIELD_HEAD_ALIASES` with missing common field names
    - In `worker/src/services/ai/intent-extraction.ts`, add the following entries to the `FIELD_HEAD_ALIASES` record:
      - `category: 'category'`, `date: 'date'`, `url: 'url'`, `quantity: 'quantity'`, `price: 'price'`, `amount: 'amount'`, `cost: 'cost'`, `subject: 'subject'`, `title: 'title'`, `rating: 'rating'`, `score: 'score'`, `priority: 'priority'`, `type: 'type'`
    - Note: `status` is already present in the existing `FIELD_HEAD_ALIASES`
    - These aliases ensure `extractSemanticFieldCandidate` resolves these tokens to their canonical key form without noise-filtering them away
    - _Bug_Condition: `extractSemanticFieldCandidate("category")` returns `null` because `category` is absent from `FIELD_HEAD_ALIASES` and falls through to the noise-ratio check_
    - _Expected_Behavior: `extractSemanticFieldCandidate("category") === "category"` and similarly for all added aliases_
    - _Preservation: existing aliases (`email`, `phone`, `name`, `message`, etc.) are unchanged_
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 Expand `inferFieldTypeFromKey` with missing type mappings
    - In `worker/src/services/ai/intent-extraction.ts`, extend `inferFieldTypeFromKey` with the following mappings (insert before the final `return 'text'`):
      - `date` / `deadline` / `due` → `'date'`
      - `url` / `link` / `website` → `'url'`
      - `password` / `secret` → `'password'`
      - `quantity` / `amount` / `price` / `cost` / `total` / `score` / `rating` → `'number'`
      - `status` / `type` / `category` / `priority` / `subject` / `title` → `'text'`
    - Use `k.includes(token)` checks consistent with the existing style in the function
    - _Bug_Condition: `inferFieldTypeFromKey("status")` returns `"text"` via the fallback but `inferFieldTypeFromKey("date")` incorrectly returns `"text"` instead of `"date"`_
    - _Expected_Behavior: `inferFieldTypeFromKey("date") === "date"`, `inferFieldTypeFromKey("url") === "url"`, `inferFieldTypeFromKey("quantity") === "number"`, `inferFieldTypeFromKey("status") === "text"`_
    - _Preservation: existing mappings (`email`, `phone`, `message`, `file`, `age`, `count`) are unchanged_
    - _Requirements: 2.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Single-Token Intent Field Extraction
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms `extractFieldNamesFromIntent("collects order status as input")` returns `["status"]`, `inferFieldTypeFromKey("status")` returns `"text"`, and `buildFormFieldRecordsFromKeys(["status"])[0]` has `key: "status"`, `type: "text"`, `required: true`
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Non-Placeholder Fields and Linear Workflows Unaffected
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in non-placeholder field preservation and linear workflow paths)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite for `worker/src/services/ai/__tests__/`
  - Confirm Property 1 (bug condition) passes on fixed code — `extractFieldNamesFromIntent` extracts single-token "as input" fields
  - Confirm Property 2 (preservation) passes on fixed code — non-placeholder fields and linear workflows unaffected
  - Ensure all tests pass; ask the user if questions arise
