# Bugfix Requirements Document

## Introduction

Multiple related bugs cause the workflow save/persistence system to fail silently. After a user saves a workflow, the saved state does not match what was on the canvas: credentials entered in node fields are lost, node positions revert to the AI-generated layout, the UI continues showing "unsaved workflow" even after a successful save, and on refresh the entire workflow structure reverts to its original AI-generated form. The root causes span two distinct save paths (`handleSave` in `WorkflowBuilder.tsx` vs `/api/save-workflow`), a deliberate but overly broad credential-stripping filter, and inconsistent `isDirty` state management.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user fills in credential fields (e.g. API keys, tokens) inside node input panels and saves the workflow THEN the system strips those values before persisting, so credentials are absent from the saved workflow

1.2 WHEN a user drags nodes to custom positions on the canvas and saves the workflow THEN the system does not reliably persist the `position` (x, y) of each node, so on the next page load nodes revert to the AI-generated layout positions

1.3 WHEN a user saves a workflow successfully THEN the system leaves `isDirty` as `true` (or re-sets it to `true` during post-save side-effects), so the UI continues to display the "unsaved workflow" indicator after a confirmed save

1.4 WHEN a user saves a workflow via the manual Save button (`handleSave`) THEN the system writes only `nodes` and `edges` to the database without the `graph` field, causing `attach-inputs` to fall back to stale or empty graph data on subsequent calls and reverting the workflow structure to its AI-generated state

### Expected Behavior (Correct)

2.1 WHEN a user fills in credential fields inside node input panels and saves the workflow THEN the system SHALL persist those credential values inside each node's `data.config` in the database so they are present on the next load

2.2 WHEN a user drags nodes to custom positions and saves the workflow THEN the system SHALL persist the exact `position.x` and `position.y` of every node so that on the next page load each node appears at the user's chosen position

2.3 WHEN a workflow save operation completes successfully THEN the system SHALL set `isDirty` to `false` and SHALL NOT re-set it to `true` as a side-effect of any post-save operation (e.g. `attach-inputs` call), so the "unsaved workflow" indicator is cleared

2.4 WHEN a user saves a workflow via the manual Save button THEN the system SHALL write a consistent payload that includes `nodes`, `edges`, and `graph` fields to the database, matching the payload written by `/api/save-workflow`, so that all downstream endpoints read the same authoritative graph

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user saves a workflow that contains no credential fields THEN the system SHALL CONTINUE TO save all non-credential node config values correctly

3.2 WHEN a user saves a workflow whose nodes have never been repositioned (positions are AI-generated defaults) THEN the system SHALL CONTINUE TO apply the default hierarchical layout on load

3.3 WHEN a user makes changes to a workflow after loading it THEN the system SHALL CONTINUE TO set `isDirty` to `true` so the "unsaved workflow" indicator appears correctly

3.4 WHEN a workflow is saved via the `/api/save-workflow` endpoint (e.g. during auto-save before run) THEN the system SHALL CONTINUE TO validate, normalize, and persist the workflow graph correctly with no regression to existing behavior

3.5 WHEN the `attach-inputs` endpoint processes a workflow THEN the system SHALL CONTINUE TO strip raw OAuth tokens and client secrets from the `inputs` payload (security requirement), while allowing node-level credential config values that were already persisted in `data.config` to pass through untouched

3.6 WHEN a workflow is loaded from the database THEN the system SHALL CONTINUE TO normalize node types, coerce positions, and validate edges before rendering on the canvas
