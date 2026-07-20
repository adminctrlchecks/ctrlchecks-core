# Form Node Intent-Driven Fields — Bugfix Design

## Overview

The form node always emits a single hardcoded placeholder field (`key="response"`, `type="textarea"`, `required=false`) regardless of the user's described intent. This causes a structural mismatch: downstream nodes that reference `{{$json.status}}`, `{{$json.email}}`, etc. can never match the form output, making the workflow logically broken at runtime.

The fix is **purely deterministic and registry-driven**. No hardcoding of field names, types, or counts. The extraction pipeline (`extractFieldNamesFromIntent` → `deriveOrderedFieldKeysForForm` → `buildFormFieldRecordsFromKeys`) already exists and is correct — the bug is that the pipeline falls back to `minimalPlaceholderFormFields()` too eagerly when intent text is not reaching it with sufficient signal. The fix targets three specific gaps:

1. `extractFieldNamesFromIntent` misses the "collects X as input" / "collects X, Y, Z" patterns for single-word field names without explicit list syntax.
2. `inferFieldTypeFromKey` is missing several semantic mappings (`status`, `category`, `type`, `date`, `url`, `password`, `quantity`, `amount`).
3. `buildFormFieldRecordsFromKeys` always sets `required: false` — it should set `required: true` for fields referenced by downstream switch/if_else expressions.

All three gaps are in `worker/src/services/ai/intent-extraction.ts`. No other file needs to change for the core fix.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when `deriveOrderedFieldKeysForForm` returns an empty array for a prompt that describes named form fields, causing `deriveFormFieldsFromIntent` to fall back to `minimalPlaceholderFormFields()`.
- **Property (P)**: The desired behavior — `fields` array contains one entry per described field, with `key` derived from the field name, `type` inferred from key semantics, and `required: true` for fields referenced downstream.
- **Preservation**: Existing behavior for non-placeholder fields, non-form workflows, if_else binding, and LLM hydration path must remain unchanged.
- **`extractFieldNamesFromIntent`**: Function in `worker/src/services/ai/intent-extraction.ts` that parses free-text intent to extract candidate field names. The primary extraction site.
- **`deriveOrderedFieldKeysForForm`**: Orchestrates extraction from intent text, `input.*` operand refs, and graph if_else refs. Returns the ordered unique key list.
- **`buildFormFieldRecordsFromKeys`**: Converts a key list into full field record objects with `id`, `key`, `name`, `label`, `type`, and `required`.
- **`inferFieldTypeFromKey`**: Maps a field key to an HTML input type (`text`, `email`, `number`, `tel`, `textarea`, `date`, `url`, `password`, `file`).
- **`minimalPlaceholderFormFields`**: Last-resort fallback that emits the single `key="response"` placeholder. The bug is triggered when this is called instead of the intent-derived path.
- **`materializeStructuralFields`**: Orchestrates structural field hydration for all nodes in a workflow. Calls `deriveFormFieldsFromIntent` for form/form_trigger nodes.
- **`isPlaceholderFormFields`**: Detects whether the current `fields` value is the placeholder identity.
- **`FORM_FIELDS_PLACEHOLDER_FIELD_ID`**: Constant `"field_response_placeholder"` used to identify the placeholder field.

---

## Bug Details

### Bug Condition

The bug manifests when a user describes a form that collects named inputs (e.g., "collects order status as input", "collects name, email, and message") and the `extractFieldNamesFromIntent` function fails to extract any field keys from the sanitized intent text. When `deriveOrderedFieldKeysForForm` returns `[]`, `deriveFormFieldsFromIntent` calls `minimalPlaceholderFormFields()` and the form node receives `[{ key: "response", type: "textarea", required: false }]` regardless of intent.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { intentText: string, workflow: Workflow }
  OUTPUT: boolean

  keys := deriveOrderedFieldKeysForForm(input.intentText, input.workflow)
  RETURN keys.length === 0
         AND intentDescribesNamedFields(input.intentText)
         -- i.e., the intent text contains field-describing language but extraction fails
END FUNCTION

FUNCTION intentDescribesNamedFields(text)
  RETURN text matches any of:
    /\bcollects?\s+\w+\s+as\s+input/i
    /\bcollects?\s+\w+(?:,\s*\w+)+/i
    /\bform\s+with\s+fields?\s+\w+/i
    /\bask(?:s|ing)?\s+for\s+\w+/i
    /\binput(?:s)?\s*:\s*\w+/i
END FUNCTION
```

### Examples

- **Single field, "as input" pattern**: Prompt "collects order status as input" → current: `[{ key: "response", type: "textarea" }]` → expected: `[{ key: "status", type: "text", required: true }]`
- **Multiple fields, comma list**: Prompt "collects name, email, and message" → current: `[{ key: "response" }]` → expected: `[{ key: "name", type: "text" }, { key: "email", type: "email" }, { key: "message", type: "textarea" }]`
- **Semantic type mismatch**: Prompt "collects quantity" → current: `type: "textarea"` → expected: `type: "number"` (via `inferFieldTypeFromKey`)
- **Downstream reference**: Form collects `status`, downstream switch uses `{{$json.status}}` → current: `required: false` → expected: `required: true`

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When a form node already has non-placeholder fields (i.e., `isPlaceholderFormFields(fields) === false` and `fields.length > 0`), `materializeStructuralFields` SHALL leave those fields unchanged.
- When a workflow contains no `form` or `form_trigger` node, the fix SHALL have zero effect on the workflow.
- `bindIfElseConditionsToUpstreamForms` behavior — re-binding `input.*` conditions to `$json.<key>` using upstream form fields — SHALL continue to work exactly as before.
- When `STRUCTURAL_FORM_FIELDS_LLM=true` and the LLM hydration path is active, LLM-derived fields SHALL continue to be applied as a post-processing step after deterministic extraction.
- `buildFormFieldRecordsFromKeys` identity normalization via `normalizeFormFieldsIdentity` SHALL remain unchanged.

**Scope:**
All inputs that do NOT involve a form/form_trigger node with placeholder or missing fields are completely unaffected. This includes:
- Workflows with switch, if_else, gmail, slack, or any non-form node
- Workflows where form fields were already correctly set by a prior pipeline run
- All edge/execution-order logic (no changes to orchestrator or registry)

---

## Hypothesized Root Cause

Based on code analysis of `intent-extraction.ts` and `structure-materializer.ts`:

1. **Missing "as input" extraction pattern**: `extractFieldNamesFromIntent` has collection clauses that match `collect|capture|submit|asks? for|including|include` but the regex `[\s\S]{0,120}` after the keyword only captures the first sentence. For "collects order status as input", the word "status" is a single token after "collects" with no comma or list separator — it falls through all the list-splitting logic without being captured as a standalone field name.

2. **Missing semantic type mappings in `inferFieldTypeFromKey`**: The current implementation covers `email`, `age/count/qty/number`, `phone/mobile/contact`, `message/description/comment/notes`, `file/attachment`. Missing: `status/category/type` → `text` (already defaults to `text`, so this is correct), `date/deadline/time` → `date`, `url/link/website` → `url`, `password/secret` → `password`, `quantity/amount/price/cost` → `number`.

3. **`required` always false in `buildFormFieldRecordsFromKeys`**: The function hardcodes `required: true` (actually looking at the code it already sets `required: true` — but the placeholder sets `required: false`). The real issue is that when the placeholder is used, `required: false` propagates. Once extraction works, `required: true` is already set by `buildFormFieldRecordsFromKeys`. However, for fields NOT referenced downstream, `required: true` may be overly strict — the fix should set `required: true` only for fields referenced by downstream switch/if_else expressions, and `required: false` for others (or keep `required: true` as the safe default for all intent-derived fields).

4. **`getFormStructuralIntentText` may return merged planner text**: When `metadata.originalUserPrompt` is not set, `getFormStructuralIntentText` falls back to `metadata.generatedFrom` which may contain registry boilerplate. `sanitizeIntentTextForFormFieldExtraction` strips most of it, but the "collects X as input" phrase may be buried in a longer planner blob where the extraction regex doesn't reach it.

---

## Correctness Properties

Property 1: Bug Condition — Intent-Derived Fields Replace Placeholder

_For any_ workflow where a form/form_trigger node has placeholder fields (`isPlaceholderFormFields` returns true) and the intent text contains a named field description (matches `intentDescribesNamedFields`), the fixed `deriveFormFieldsFromIntent` SHALL return a non-placeholder fields array where every described field name appears as a normalized key, and no field has `key === "response"` unless the user explicitly described a field named "response".

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Non-Placeholder Fields Unchanged

_For any_ workflow where a form/form_trigger node already has non-placeholder fields (i.e., `isPlaceholderFormFields` returns false and `fields.length > 0`), the fixed `materializeStructuralFields` SHALL produce the same `fields` array as the original function, preserving all existing field keys, labels, types, and required flags.

**Validates: Requirements 3.1, 3.5**

Property 3: Field Count Matches Described Inputs

_For any_ intent text describing exactly N named fields (e.g., "collects name, email, and message" → N=3), `deriveOrderedFieldKeysForForm` SHALL return exactly N distinct keys.

**Validates: Requirements 2.3**

Property 4: Type Inference Is Semantically Correct

_For any_ field key in the known semantic type map (`email` → `email`, `quantity/count/amount/price` → `number`, `phone/mobile` → `tel`, `message/description/comment/notes` → `textarea`, `date/deadline` → `date`, `url/link` → `url`, `password` → `password`), `inferFieldTypeFromKey(key)` SHALL return the expected type.

**Validates: Requirements 2.4**

Property 5: No-Form Workflow Is Unchanged

_For any_ workflow containing no `form` or `form_trigger` node, `materializeStructuralFields(workflow)` SHALL return a workflow whose nodes array is structurally identical to the input (same node IDs, same configs).

**Validates: Requirements 3.2**

---

## Fix Implementation

### Changes Required

All changes are confined to `worker/src/services/ai/intent-extraction.ts`. No registry, orchestrator, or other file changes are needed.

**File**: `worker/src/services/ai/intent-extraction.ts`

**Change 1 — Extend `extractFieldNamesFromIntent` with single-token "as input" pattern**

Add a new extraction clause after the existing `collectionClauses` block that handles the pattern "collects/captures/asks for `<single_word>` as input":

```
// Pattern: "collects <word> as input" / "captures <word> as input"
const asInputClauses = sanitized.match(
  /\b(?:collect|capture|ask\s+for|submit)\s+([a-zA-Z_][a-zA-Z0-9_ ]{0,30}?)\s+as\s+(?:input|field|data)\b/gi
) || [];
for (const clause of asInputClauses) {
  const m = clause.match(/\b(?:collect|capture|ask\s+for|submit)\s+(.+?)\s+as\s+(?:input|field|data)\b/i);
  if (m?.[1]) push(m[1].trim());
}
```

**Change 2 — Extend `inferFieldTypeFromKey` with missing semantic mappings**

Add before the final `return 'text'`:

```typescript
if (k.includes('date') || k.includes('deadline') || k.includes('dob') || k === 'birthday') return 'date';
if (k.includes('url') || k.includes('link') || k.includes('website') || k.includes('href')) return 'url';
if (k.includes('password') || k.includes('secret') || k.includes('pin')) return 'password';
if (k.includes('quantity') || k.includes('amount') || k.includes('price') || k.includes('cost') || k.includes('total')) return 'number';
```

**Change 3 — `buildFormFieldRecordsFromKeys` marks downstream-referenced fields as `required: true`**

`buildFormFieldRecordsFromKeys` already sets `required: true` for all keys. The placeholder sets `required: false`. Once extraction works correctly (Change 1), the placeholder is no longer emitted for intent-described fields, so `required: true` propagates naturally. No code change needed here — this is a consequence of Change 1 working correctly.

**Change 4 — Extend `FIELD_HEAD_ALIASES` with common single-word field names**

Several common field names like `status`, `date`, `url`, `quantity`, `price`, `title`, `subject`, `category`, `type` are not in `FIELD_HEAD_ALIASES`. Add them so `extractSemanticFieldCandidate` resolves them correctly:

```typescript
const FIELD_HEAD_ALIASES: Record<string, string> = {
  // ... existing entries ...
  status: 'status',
  category: 'category',
  type: 'type',
  title: 'title',
  subject: 'subject',
  date: 'date',
  deadline: 'deadline',
  url: 'url',
  link: 'url',
  website: 'url',
  password: 'password',
  quantity: 'quantity',
  amount: 'amount',
  price: 'price',
  cost: 'cost',
  total: 'total',
  rating: 'rating',
  score: 'score',
  priority: 'priority',
  reason: 'reason',
  feedback: 'feedback',
};
```

---

## Testing Strategy

### Validation Approach

Two-phase: first surface counterexamples on unfixed code (exploratory), then verify the fix and preservation.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause — that `extractFieldNamesFromIntent` returns `[]` for "collects X as input" patterns.

**Test Plan**: Write tests that call `deriveOrderedFieldKeysForForm` with representative intent texts and assert the returned keys are non-empty. Run on unfixed code to observe failures.

**Test Cases**:
1. **Single field "as input"**: `deriveOrderedFieldKeysForForm("collects order status as input", emptyWorkflow)` → expect `["status"]` (will fail on unfixed code)
2. **Multiple fields comma list**: `deriveOrderedFieldKeysForForm("collects name, email, and message", emptyWorkflow)` → expect `["name", "email", "message"]` (may pass — comma list is already handled)
3. **Single field no list syntax**: `deriveOrderedFieldKeysForForm("a form that asks for the user's email address", emptyWorkflow)` → expect `["email"]`
4. **Downstream if_else reference**: workflow with if_else using `input.status` → `deriveOrderedFieldKeysForForm` should include `"status"` via `collectIfElseReferencedInputKeys`

**Expected Counterexamples**:
- `deriveOrderedFieldKeysForForm("collects order status as input", emptyWorkflow)` returns `[]` on unfixed code
- Possible causes: "status" is a single token after "collects" with no comma/list separator; `extractSemanticFieldCandidate("status")` may return `null` if not in `FIELD_HEAD_ALIASES`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := deriveFormFieldsFromIntent_fixed(input.intentText, input.workflow)
  ASSERT NOT isPlaceholderFormFields(result)
  ASSERT result.length >= 1
  ASSERT result.every(f => f.key !== 'response' || userDescribedResponseField(input.intentText))
  ASSERT result.every(f => f.type === inferFieldTypeFromKey(f.key))
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT materializeStructuralFields_original(input) ≡ materializeStructuralFields_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing with fast-check generates arbitrary workflows with pre-set non-placeholder form fields and verifies they are unchanged after the fix.

**Test Cases**:
1. **Non-placeholder fields preserved**: Workflow with `fields: [{ key: "name", type: "text" }]` → after fix, fields unchanged
2. **No-form workflow unchanged**: Workflow with only `manual_trigger → google_gmail` → after fix, nodes identical
3. **if_else binding preserved**: Workflow with form + if_else using `input.status` → after fix, `bindIfElseConditionsToUpstreamForms` still rebinds to `$json.status`

### Unit Tests

- `inferFieldTypeFromKey("email")` → `"email"`
- `inferFieldTypeFromKey("quantity")` → `"number"`
- `inferFieldTypeFromKey("date")` → `"date"`
- `inferFieldTypeFromKey("url")` → `"url"`
- `inferFieldTypeFromKey("password")` → `"password"`
- `inferFieldTypeFromKey("message")` → `"textarea"`
- `inferFieldTypeFromKey("status")` → `"text"`
- `extractFieldNamesFromIntent("collects order status as input")` → `["status"]`
- `extractFieldNamesFromIntent("collects name, email, and message")` → `["name", "email", "message"]`
- `buildFormFieldRecordsFromKeys(["status"])` → `[{ key: "status", type: "text", required: true }]`
- `isPlaceholderFormFields(buildFormFieldRecordsFromKeys(["status"]))` → `false`

### Property-Based Tests

Tests use **fast-check**. Each test must run a minimum of 100 iterations and be tagged:
```typescript
// Feature: form-node-intent-driven-fields, Property N: <property_text>
```

- **Property 1**: Generate arbitrary intent texts containing a named field description; assert `deriveFormFieldsFromIntent` never returns placeholder fields.
- **Property 2**: Generate arbitrary workflows with non-placeholder form fields; assert `materializeStructuralFields` leaves those fields unchanged.
- **Property 3**: Generate lists of 1–8 distinct field names; assert `deriveOrderedFieldKeysForForm` returns exactly that many keys when the intent text enumerates them.
- **Property 4**: Generate field keys from the semantic type map; assert `inferFieldTypeFromKey` returns the expected type for each.
- **Property 5**: Generate workflows with no form/form_trigger node; assert `materializeStructuralFields` output nodes are identical to input nodes.

### Integration Tests

- Build a workflow from prompt "A form that collects order status as input, then routes to different handlers based on status" → assert form node has `fields: [{ key: "status", type: "text" }]` and switch expression references `{{$json.status}}`.
- Build a workflow from prompt "A form that collects name, email, and message, then sends an email" → assert form node has exactly 3 fields with correct keys and types.
- Build a workflow from prompt "A form that collects quantity, then checks if quantity > 10" → assert form field `quantity` has `type: "number"` and if_else condition references `$json.quantity`.
