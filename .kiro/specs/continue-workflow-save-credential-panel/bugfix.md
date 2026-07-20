# Bugfix Requirements Document

## Introduction

When the user clicks "Continue Building Workflow" on the "Configuration Required" / "Ready to save workflow" panel, the system currently runs a credential check against unsaved workflow state. This causes the credential check to operate on stale data, resulting in a 409 error when attempting to attach credentials because the workflow has not yet been persisted to the backend. The fix requires saving the workflow first, then checking credentials, and presenting any missing credentials as a friendly informational panel (not an error) with direct links to the relevant node property panels.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user clicks "Continue Building Workflow" THEN the system runs the credential check before saving the workflow to the backend

1.2 WHEN the credential check runs against unsaved workflow state THEN the system operates on stale data and cannot accurately determine which credentials are present or missing

1.3 WHEN the system attempts to attach credentials to an unsaved workflow THEN the system returns a 409 conflict error because the workflow record does not yet exist in the backend

1.4 WHEN credentials are found to be missing THEN the system displays an error message instead of a friendly informational panel

### Expected Behavior (Correct)

2.1 WHEN the user clicks "Continue Building Workflow" THEN the system SHALL save (persist) the workflow to the backend before performing any credential check

2.2 WHEN the workflow has been successfully saved THEN the system SHALL check which credentials are missing based on the now-persisted workflow state

2.3 WHEN one or more credentials are missing after saving THEN the system SHALL display a friendly informational panel inside the workflow editor listing all missing credentials, where each missing credential entry is clickable so the user can directly open that node's property panel to fill it in

2.4 WHEN the informational panel is shown THEN the system SHALL display both satisfied credentials and missing credentials so the user has a complete picture of credential status

2.5 WHEN all credentials are present after saving THEN the system SHALL proceed normally with the workflow continuation flow

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the workflow is saved successfully and all credentials are already satisfied THEN the system SHALL CONTINUE TO proceed with the normal "Continue Building Workflow" flow without interruption

3.2 WHEN the user opens a node's property panel via the credential panel link THEN the system SHALL CONTINUE TO display that node's full configuration interface as it does today

3.3 WHEN the workflow save fails for reasons unrelated to credentials THEN the system SHALL CONTINUE TO surface the save error appropriately without proceeding to the credential check

3.4 WHEN the user is in the `configuring_credentials` phase THEN the system SHALL CONTINUE TO require credential resolution before allowing workflow execution
