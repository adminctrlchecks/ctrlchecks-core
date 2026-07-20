# Bugfix Requirements Document

## Introduction

When a user describes a workflow with a form trigger that collects specific named inputs (e.g., "collects order status as input"), the form node always generates a single hardcoded placeholder field (`key="response"`, `type="textarea"`) instead of fields derived from the user's described intent. This causes a structural mismatch: downstream nodes (e.g., a switch node using `{{$json.status}}`) reference field keys that do not exist in the form output, making the workflow logically broken at runtime.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user describes a form that collects a named field (e.g., "collects order status as input"), THEN the system generates a single placeholder field with `key="response"`, `label="Response"`, and `type="textarea"` regardless of the described intent.

1.2 WHEN the form node's `fields` array is populated, THEN the field `key` values are always `["response"]` — never derived from the user's prompt — so downstream expressions like `{{$json.status}}` can never match the form output.

1.3 WHEN a user describes multiple form inputs (e.g., "collects name, email, and message"), THEN the system generates exactly 1 field instead of the described number of fields.

1.4 WHEN the form field `type` is generated, THEN it is always `textarea` regardless of the semantic meaning of the field name (e.g., `email` should be `email`, `quantity` should be `number`).

1.5 WHEN the form node generates a placeholder field, THEN the `required` flag is always `false`, even for fields that are clearly the primary input driving downstream workflow logic.

### Expected Behavior (Correct)

2.1 WHEN a user describes a form that collects a named field (e.g., "collects order status as input"), THEN the system SHALL generate a field with `key="status"`, `label="Order Status"`, and a type inferred from the field name semantics.

2.2 WHEN the form node's `fields` array is populated, THEN each field `key` SHALL be derived from the user's described intent so that downstream expressions (e.g., `{{$json.status}}`) match the generated field keys exactly.

2.3 WHEN a user describes multiple form inputs (e.g., "collects name, email, and message"), THEN the system SHALL generate one field per described input with correct keys, labels, and types.

2.4 WHEN a form field key is generated, THEN the field `type` SHALL be inferred from the field name semantics according to the registry-driven type inference rules (e.g., `email` → `email`, `quantity`/`count`/`amount` → `number`, `message`/`description`/`notes` → `textarea`, `date`/`deadline` → `date`, `url`/`link` → `url`, `password` → `password`, `status`/`type`/`category` → `text`).

2.5 WHEN a form field is the primary input driving downstream workflow logic (e.g., the field referenced by a downstream switch expression), THEN the system SHALL set `required: true` for that field.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a form node already has non-placeholder fields set (i.e., `fields` is a non-empty array not matching the placeholder identity), THEN the system SHALL CONTINUE TO preserve those fields unchanged.

3.2 WHEN a workflow contains no form or form_trigger node, THEN the system SHALL CONTINUE TO generate the workflow without any impact from this fix.

3.3 WHEN a form node's `fields` are derived from intent and a downstream `if_else` node references `input.<key>` conditions, THEN the system SHALL CONTINUE TO bind those conditions to `$json.<key>` using the upstream form fields (existing `bindIfElseConditionsToUpstreamForms` behavior).

3.4 WHEN the `STRUCTURAL_FORM_FIELDS_LLM=true` environment variable is set and the LLM hydration path is active, THEN the system SHALL CONTINUE TO apply LLM-derived fields as a post-processing step after deterministic extraction.

3.5 WHEN `deriveOrderedFieldKeysForForm` successfully extracts field keys from intent text, THEN the system SHALL CONTINUE TO build field records using `buildFormFieldRecordsFromKeys` with the same identity normalization behavior.
