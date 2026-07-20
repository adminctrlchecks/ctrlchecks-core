# Bugfix Requirements Document

## Introduction

When the AI builds a workflow and assigns values to node fields (including credential fields), those values are not being persisted in the workflow object. Instead, subsequent credential dispatch/replacement logic overwrites the AI-assigned values, and clicking "continue" regenerates the workflow from scratch — losing all AI-built field values. The fix must ensure AI-assigned field values are locked into workflow state and treated as the source of truth, with the UI credential fields acting only as a display layer.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the AI builds a workflow and assigns values to credential fields THEN the system does not persist those values in the workflow object

1.2 WHEN the credential dispatch/replacement logic runs after AI build THEN the system overwrites AI-assigned field values with values from the credentials store

1.3 WHEN the user clicks "continue" after an AI-built workflow is displayed THEN the system regenerates the workflow from scratch, discarding all AI-assigned field values

1.4 WHEN a new prompt cycle begins THEN the system has no memory of previously AI-assigned field values and generates fresh empty values

1.5 WHEN self-healing or code-healing logic runs THEN the system modifies input field values, overwriting AI-assigned values

### Expected Behavior (Correct)

2.1 WHEN the AI builds a workflow and assigns values to credential fields THEN the system SHALL persist those values in the workflow object as the authoritative state

2.2 WHEN the credential dispatch/replacement logic runs after AI build THEN the system SHALL NOT overwrite field values that were already set by the AI build step

2.3 WHEN the user clicks "continue" after an AI-built workflow is displayed THEN the system SHALL preserve all AI-assigned field values in the workflow state without regenerating from scratch

2.4 WHEN a new prompt cycle begins THEN the system SHALL retain previously AI-assigned field values from the existing workflow state

2.5 WHEN self-healing or code-healing logic runs THEN the system SHALL only address structural or graph-level issues and SHALL NOT modify input field values

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user manually changes a credential field value in the UI THEN the system SHALL CONTINUE TO update the corresponding workflow field with the new user-provided value

3.2 WHEN the AI builds a workflow with no pre-assigned credential values THEN the system SHALL CONTINUE TO populate credential fields from the credentials store as a fallback

3.3 WHEN the workflow has structural or graph-level issues THEN the system SHALL CONTINUE TO apply self-healing logic to fix those structural issues

3.4 WHEN the UI renders credential fields THEN the system SHALL CONTINUE TO display the current values from the workflow object

3.5 WHEN a workflow is executed THEN the system SHALL CONTINUE TO use the field values present in the workflow object at execution time
