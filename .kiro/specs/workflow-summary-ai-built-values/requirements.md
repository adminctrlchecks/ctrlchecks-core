# Requirements Document

## Introduction

This feature addresses two critical issues in the workflow generation pipeline: (1) workflow summary generation that correctly explains conditional workflows with branches, edges, and data flow, and (2) AI-built field values that must be properly populated, persisted, and displayed in the credential field ownership UI with toggle functionality.

The workflow generation pipeline creates workflows from user prompts through multiple stages. After capability selection, the system generates a workflow summary explaining how the workflow operates. Subsequently, AI populates field values based on user intent (AI-built values), which must be stored with `_fillMode` metadata and displayed in the credential panel UI with proper toggle functionality.

## Glossary

- **Workflow_Summary_Generator**: The AI-driven service that generates human-readable explanations of workflow structure and execution flow
- **AI_Built_Value**: A field value automatically populated by AI during workflow generation, marked with `_fillMode: 'buildtime_ai_once'`
- **Field_Ownership_UI**: The credential panel interface that displays field values with ownership toggles (AI-built, You, AI Runtime)
- **Fill_Mode**: Metadata indicating how a field value is populated (`manual_static`, `buildtime_ai_once`, `runtime_ai`)
- **Conditional_Workflow**: A workflow containing branching logic (if-else, switch) with multiple execution paths
- **Branch**: A divergent execution path in a conditional workflow, connected via edges with specific routing labels
- **Edge**: A connection between workflow nodes that defines data flow and execution routing
- **Topology_Fingerprint**: A cryptographic hash of workflow structure (nodes and edges) used to detect structural changes
- **Config_Frozen_State**: A workflow state where structural changes are blocked but field values remain writable
- **Unified_Node_Registry**: The single source of truth for all node definitions, schemas, and execution contracts
- **Attach_Inputs_Endpoint**: The API endpoint that injects user-provided and AI-built configuration values into workflow nodes

## Requirements

### Requirement 1: Workflow Summary Generation for Conditional Workflows

**User Story:** As a workflow creator, I want the workflow summary to correctly explain conditional workflows with branches and data flow, so that I understand how my workflow will execute before running it.

#### Acceptance Criteria

1. WHEN a workflow contains an if-else node, THE Workflow_Summary_Generator SHALL generate a summary explaining both the true branch and false branch execution paths
2. WHEN a workflow contains a switch node with N cases, THE Workflow_Summary_Generator SHALL generate a summary explaining all N case branches and their routing logic
3. WHEN branches reconverge at a merge node, THE Workflow_Summary_Generator SHALL explain how data from multiple paths combines at the merge point
4. WHEN a workflow contains nested conditional logic, THE Workflow_Summary_Generator SHALL explain each level of branching with proper hierarchy
5. THE Workflow_Summary_Generator SHALL include edge connection information showing how nodes route data between branches
6. THE Workflow_Summary_Generator SHALL generate distinct content for the OBJECTIVE section (high-level business purpose) and DETAILED_FLOW section (technical step-by-step execution)
7. WHEN generating the CONNECTIONS section, THE Workflow_Summary_Generator SHALL explain how edges connect nodes and transfer data between execution steps

### Requirement 2: AI-Built Value Population During Workflow Generation

**User Story:** As a workflow creator, I want AI to automatically populate field values based on my intent during workflow generation, so that I don't have to manually configure every field.

#### Acceptance Criteria

1. WHEN the workflow generation pipeline completes, THE system SHALL populate field values for all nodes based on user intent and workflow context
2. WHEN a field value is populated by AI, THE system SHALL store the value with `_fillMode: 'buildtime_ai_once'` metadata in the node configuration
3. WHEN a field has `fillMode.default: 'buildtime_ai_once'` in the Unified_Node_Registry schema, THE system SHALL populate that field with an AI-generated value
4. WHEN AI populates a field value, THE system SHALL ensure the value matches the field's type and validation constraints from the registry schema
5. THE system SHALL populate AI-built values for all relevant fields including templates, recipients, prompts, channels, and configuration parameters
6. WHEN a field is marked as credential-owned in the registry, THE system SHALL only populate AI-built values if the field is unlockable or the user has selected manual ownership

### Requirement 3: AI-Built Value Persistence Through Attach-Inputs Pipeline

**User Story:** As a workflow creator, I want my AI-built field values to persist when I configure credentials, so that I don't lose the AI-generated configuration.

#### Acceptance Criteria

1. WHEN the Attach_Inputs_Endpoint receives a request with empty or default values for a field marked `buildtime_ai_once`, THE system SHALL preserve the existing AI-built value
2. WHEN an AI-built array field contains N items and the incoming request contains fewer than N items, THE system SHALL preserve the existing AI-built array
3. WHEN an AI-built object field contains rich configuration and the incoming request contains a sparse object, THE system SHALL preserve the existing AI-built object
4. WHEN a user explicitly changes a field value in the UI, THE system SHALL update the `_fillMode` to `manual_static` before accepting the new value
5. WHEN the workflow is in Config_Frozen_State, THE Attach_Inputs_Endpoint SHALL preserve all AI-built values and user-entered values without normalization
6. THE system SHALL apply the merge guard rules from `attach-inputs-merge-guard.ts` to prevent accidental overwrites of AI-built values

### Requirement 4: Field Ownership UI Display and Toggle Functionality

**User Story:** As a workflow creator, I want to see AI-built values in the credential panel with proper toggle functionality, so that I can review and modify AI-generated configuration.

#### Acceptance Criteria

1. WHEN the credential field ownership UI opens, THE system SHALL display all field values including AI-built values in the form fields
2. WHEN a field has `_fillMode: 'buildtime_ai_once'`, THE Field_Ownership_UI SHALL display the toggle in the ON state showing "AI-built" button
3. WHEN a user clicks the ownership toggle, THE Field_Ownership_UI SHALL allow switching between "AI-built", "You" (manual_static), and "AI Runtime" (runtime_ai) modes
4. WHEN a user switches from "AI-built" to "You", THE system SHALL update `_fillMode` to `manual_static` and allow the user to edit the field value
5. WHEN a user switches from "You" to "AI-built", THE system SHALL restore the original AI-built value if available
6. THE Field_Ownership_UI SHALL display the current field value regardless of ownership mode
7. WHEN a field is credential-owned with `credentialTogglePolicy: 'locked'`, THE Field_Ownership_UI SHALL disable the ownership toggle unless the field is unlocked

### Requirement 5: Fill Mode Metadata Synchronization

**User Story:** As a system administrator, I want fill mode metadata to be consistently synchronized across all workflow stages, so that field ownership is tracked correctly throughout the workflow lifecycle.

#### Acceptance Criteria

1. WHEN the field-ownership-stage runs, THE system SHALL read `fillMode.default` from the Unified_Node_Registry for each field
2. WHEN the field-ownership-stage completes, THE system SHALL write `_fillMode` metadata into each node's `config._fillMode` object
3. WHEN a field already has `_fillMode` set by a prior stage, THE field-ownership-stage SHALL preserve the existing value
4. WHEN the Attach_Inputs_Endpoint processes mode override keys (`mode_<nodeId>_<fieldName>`), THE system SHALL update the corresponding `_fillMode` entry
5. WHEN the Attach_Inputs_Endpoint processes unlock keys (`unlock_<nodeId>_<fieldName>`), THE system SHALL update the corresponding `_ownershipUnlock` entry
6. THE system SHALL export fill mode metadata via `collectEffectiveFillModesForWizard()` for round-trip to the UI
7. THE system SHALL export ownership unlock flags via `collectOwnershipUnlockFlagsForWizard()` for round-trip to the UI

### Requirement 6: Workflow Summary V2 Compilation

**User Story:** As a workflow creator, I want the workflow summary to be compiled from the validated workflow graph, so that the summary accurately reflects the actual workflow structure.

#### Acceptance Criteria

1. WHEN the workflow graph is validated, THE system SHALL compile a WorkflowSummaryV2 object from the graph structure
2. THE WorkflowSummaryV2 SHALL include `graphOverview` with trigger node IDs, terminal node IDs, total node count, total edge count, and branching indicator
3. THE WorkflowSummaryV2 SHALL include `executionBackbone` listing all nodes in execution order with their responsibilities
4. WHEN the workflow contains branching nodes, THE WorkflowSummaryV2 SHALL include a `branches` array with all branch cases and their target nodes
5. THE WorkflowSummaryV2 SHALL include `pathOutcomes` describing all possible execution paths from trigger to terminal nodes
6. THE WorkflowSummaryV2 SHALL include node details with purpose, input effect, and output effect for each node
7. THE system SHALL use the Unified_Node_Registry to retrieve node descriptions, labels, and branching metadata for summary compilation

### Requirement 7: Topology Fingerprint Validation for AI-Built Values

**User Story:** As a system administrator, I want topology fingerprint validation to ensure AI-built values are not lost during structural changes, so that workflow integrity is maintained.

#### Acceptance Criteria

1. WHEN the Attach_Inputs_Endpoint processes a request, THE system SHALL compute a Topology_Fingerprint of the current workflow graph
2. WHEN the workflow has a `freezeBoundary.frozen` flag, THE system SHALL enforce topology-only validation allowing config changes but blocking structural mutations
3. WHEN the Attach_Inputs_Endpoint saves the workflow, THE system SHALL verify the final Topology_Fingerprint matches the baseline fingerprint
4. IF the Topology_Fingerprint changes unexpectedly, THE system SHALL return a 409 error with topology diff details
5. THE system SHALL compute a protected config fingerprint for credential-owned fields to detect unauthorized credential modifications
6. WHEN a workflow has a `buildManifest`, THE system SHALL treat the workflow as Config_Frozen_State and skip config normalization
7. THE system SHALL preserve node positions from the database snapshot when saving workflows to maintain manual layout

### Requirement 8: Idempotent Attach-Inputs Operations

**User Story:** As a workflow creator, I want duplicate attach-inputs requests to be handled idempotently, so that I don't accidentally corrupt my workflow by submitting the same configuration twice.

#### Acceptance Criteria

1. WHEN the Attach_Inputs_Endpoint receives a request, THE system SHALL compute a payload hash from workflowId, inputs, originalUserPrompt, and fieldOwnershipOverrides
2. WHEN the payload hash matches the previous attach-inputs operation AND the Topology_Fingerprint is unchanged, THE system SHALL return a cached success response without processing
3. THE system SHALL store the payload hash and Topology_Fingerprint in `metadata.lastAttachInputs` after successful processing
4. WHEN an idempotent request is detected, THE system SHALL return `{ success: true, idempotent: true }` with the existing workflow state
5. THE system SHALL use module-level in-flight deduplication to prevent concurrent attach-inputs requests for the same workflow
6. WHEN a workflow is executing, THE system SHALL return a 409 error preventing attach-inputs operations
7. WHEN a workflow phase is not in the allowed list, THE system SHALL return a 400 error with phase validation details

### Requirement 9: Comprehensive Question ID Support

**User Story:** As a frontend developer, I want the attach-inputs endpoint to support comprehensive question IDs with prefixes, so that the UI can use structured field identifiers.

#### Acceptance Criteria

1. WHEN the Attach_Inputs_Endpoint receives input keys with `input_` prefix, THE system SHALL parse them as `input_<nodeId>_<fieldName>` format
2. WHEN the Attach_Inputs_Endpoint receives input keys with `cred_` prefix, THE system SHALL parse them as credential-related configuration
3. WHEN the Attach_Inputs_Endpoint receives input keys with `config_` prefix, THE system SHALL parse them as configuration field inputs
4. WHEN the Attach_Inputs_Endpoint receives input keys with `resource_` prefix, THE system SHALL parse them as resource configuration inputs
5. WHEN the Attach_Inputs_Endpoint receives input keys with `op_` prefix, THE system SHALL parse them as operation configuration inputs
6. WHEN the Attach_Inputs_Endpoint receives input keys with `ownership_` prefix, THE system SHALL parse them as field ownership configuration
7. THE system SHALL sanitize inputs to reject bare credential keys while allowing comprehensive question IDs that wrap nodeId and fieldName

### Requirement 10: Switch Cases Normalization

**User Story:** As a workflow creator, I want switch node cases to be properly normalized from various input formats, so that my switch logic is correctly configured regardless of how I provide the cases.

#### Acceptance Criteria

1. WHEN the Attach_Inputs_Endpoint receives switch cases as a JSON string, THE system SHALL parse the string into an array of case objects
2. WHEN the Attach_Inputs_Endpoint receives switch cases as an array of strings, THE system SHALL normalize each string into a case object with `value` property
3. WHEN the Attach_Inputs_Endpoint receives switch cases as an array of objects with `value` and optional `label`, THE system SHALL preserve both properties
4. THE system SHALL deduplicate switch cases by `value` property, keeping only the first occurrence
5. THE system SHALL trim whitespace from case values and labels
6. WHEN switch cases contain empty or invalid values, THE system SHALL filter them out
7. THE system SHALL return `{ value: [], valid: false }` when switch cases cannot be normalized to a valid array

