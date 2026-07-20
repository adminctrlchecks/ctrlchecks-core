# Requirements Document

## Introduction

When a workflow execution completes — whether successfully, partially, or with errors — the user currently sees only raw node logs in the execution console. The UI can also display stale "RUNNING" states after the backend has already finished. This feature introduces a **notification system** that surfaces clear, friendly, actionable messages after every execution, guiding users toward the right next step without exposing raw technical errors.

The system handles six distinct execution outcomes: full success, partial success with skipped nodes, auth/credential failure, execution stuck or timed out, non-auth node error, and stale UI state. Notifications are shown as toasts or banners, use plain language, include action buttons where relevant, and auto-dismiss or persist based on severity.

---

## Glossary

- **Notification_System**: The frontend component responsible for displaying execution result toasts and banners.
- **Execution_Result**: The final status object returned by the backend after a workflow run completes, containing per-node statuses and error metadata.
- **Node_Status**: The execution state of a single workflow node — one of `SUCCESS`, `SKIPPED`, `FAILED`, or `RUNNING`.
- **Polling_Service**: The frontend service that periodically queries the backend for execution status updates.
- **Auth_Error**: A node failure caused by an expired OAuth token or invalid/missing credentials.
- **Stale_UI**: A condition where the frontend displays a `RUNNING` node status after the backend has already completed execution.
- **Toast**: A transient, non-blocking notification overlay displayed in the UI.
- **Banner**: A persistent, dismissible notification displayed at the top of the execution console.
- **Action_Button**: A clickable element within a notification that triggers a specific user action (e.g., reconnect, refresh, view logs).
- **Connections_Page**: The application page where users manage OAuth and credential connections.
- **Workflow_Trigger**: The mechanism that initiates a workflow run — either a form submission or a manual trigger.

---

## Requirements

### Requirement 1: Notify on Full Success

**User Story:** As a user, I want to see a friendly confirmation when my workflow runs without errors, so that I know everything worked as expected without having to read raw logs.

#### Acceptance Criteria

1. WHEN all nodes in an execution reach `Node_Status` `SUCCESS`, THE `Notification_System` SHALL display a Toast with the message "Your workflow ran successfully! All steps completed as expected."
2. WHEN the success Toast is displayed, THE `Notification_System` SHALL auto-dismiss it after 5 seconds without requiring user interaction.
3. WHEN the success Toast is displayed, THE `Notification_System` SHALL include a "View Logs" `Action_Button` that opens the execution console.
4. THE `Notification_System` SHALL display the success Toast for workflows initiated by both form-based and manual `Workflow_Trigger` types.

---

### Requirement 2: Notify on Partial Success with Skipped Nodes

**User Story:** As a user, I want to understand why some steps were skipped during my workflow run, so that I can confirm the conditional logic behaved as intended.

#### Acceptance Criteria

1. WHEN an execution completes and one or more nodes have `Node_Status` `SKIPPED` while all remaining nodes have `Node_Status` `SUCCESS`, THE `Notification_System` SHALL display a warning-level Toast.
2. WHEN the partial success Toast is displayed, THE `Notification_System` SHALL include the names of the successfully executed nodes and the names of the skipped nodes in the message body.
3. WHEN the partial success Toast is displayed, THE `Notification_System` SHALL include a human-readable explanation that the skipped nodes were bypassed due to conditional routing.
4. WHEN the partial success Toast is displayed, THE `Notification_System` SHALL keep the Toast visible until the user explicitly dismisses it.
5. WHEN the partial success Toast is displayed, THE `Notification_System` SHALL include a "View Logs" `Action_Button`.

---

### Requirement 3: Notify on Auth / Credential Failure

**User Story:** As a user, I want to be told exactly which connection needs to be fixed and how to fix it when a node fails due to an expired or invalid credential, so that I can resolve the issue without guessing.

#### Acceptance Criteria

1. WHEN a node reaches `Node_Status` `FAILED` and the `Execution_Result` contains an `Auth_Error` for that node, THE `Notification_System` SHALL display an error-level Banner.
2. WHEN the auth failure Banner is displayed, THE `Notification_System` SHALL include the name of the failed node and the name of the associated service (e.g., "Google") in the message body.
3. WHEN the auth failure Banner is displayed, THE `Notification_System` SHALL include a "Reconnect [Service]" `Action_Button` that navigates the user directly to the `Connections_Page` filtered to the relevant service.
4. WHEN the auth failure Banner is displayed, THE `Notification_System` SHALL keep the Banner visible until the user explicitly dismisses it or completes the reconnect action.
5. IF the `Execution_Result` contains `Auth_Error` metadata for multiple nodes, THEN THE `Notification_System` SHALL display one Banner per failed service, not one Banner per node.

---

### Requirement 4: Notify on Execution Stuck / Timeout

**User Story:** As a user, I want to know when my workflow has actually finished even if the UI still shows it as running, so that I am not left waiting indefinitely.

#### Acceptance Criteria

1. WHEN the `Polling_Service` detects that the backend `Execution_Result` has a terminal status (success or failure) but one or more nodes still display `Node_Status` `RUNNING` in the UI, THE `Notification_System` SHALL display a warning-level Banner with the message "Your workflow finished running. Refresh the page to see the full results."
2. WHEN the stuck-execution Banner is displayed, THE `Notification_System` SHALL include a "Refresh" `Action_Button` that triggers a full page reload.
3. WHEN the user activates the "Refresh" `Action_Button`, THE `Notification_System` SHALL dismiss the Banner before the reload begins.
4. WHEN the stuck-execution Banner is displayed, THE `Notification_System` SHALL keep the Banner visible until the user explicitly dismisses it or activates the Refresh button.

---

### Requirement 5: Notify on Non-Auth Node Error

**User Story:** As a user, I want a plain-language description of what went wrong in a failed step and what I should do next, so that I can fix the issue without reading raw error logs.

#### Acceptance Criteria

1. WHEN a node reaches `Node_Status` `FAILED` and the `Execution_Result` does not contain an `Auth_Error` for that node, THE `Notification_System` SHALL display an error-level Banner.
2. WHEN the node error Banner is displayed, THE `Notification_System` SHALL include the name of the failed node and a friendly, non-technical description of the failure reason derived from the `Execution_Result` error metadata.
3. WHEN the node error Banner is displayed, THE `Notification_System` SHALL include the actionable instruction "Check the node configuration and try again."
4. WHEN the node error Banner is displayed, THE `Notification_System` SHALL include a "View Logs" `Action_Button` that opens the execution console scrolled to the failed node's log entry.
5. WHEN the node error Banner is displayed, THE `Notification_System` SHALL keep the Banner visible until the user explicitly dismisses it.
6. IF multiple nodes reach `Node_Status` `FAILED` with non-auth errors in the same execution, THEN THE `Notification_System` SHALL display one consolidated Banner listing all failed node names rather than one Banner per node.

---

### Requirement 6: Auto-Refresh Stale Execution Console

**User Story:** As a user, I want the execution console to automatically reflect the final state of my workflow after it completes, so that I do not see misleading "RUNNING" statuses.

#### Acceptance Criteria

1. WHEN the `Polling_Service` receives a terminal `Execution_Result` from the backend, THE `Polling_Service` SHALL trigger a refresh of the execution console log view within 2 seconds of receiving the terminal status.
2. WHEN the execution console is refreshed, THE `Notification_System` SHALL update all displayed `Node_Status` values to match the terminal `Execution_Result`.
3. WHEN the execution console refresh completes, THE `Polling_Service` SHALL stop polling for that execution.
4. IF the execution console refresh fails to load updated data within 5 seconds, THEN THE `Notification_System` SHALL display the stuck-execution Banner described in Requirement 4.

---

### Requirement 7: Notification Severity and Persistence Rules

**User Story:** As a user, I want success messages to disappear on their own while error and warning messages stay visible until I address them, so that I am not overwhelmed by transient alerts but also do not miss important issues.

#### Acceptance Criteria

1. THE `Notification_System` SHALL auto-dismiss Toast notifications with severity level `SUCCESS` after exactly 5 seconds.
2. THE `Notification_System` SHALL keep Toast and Banner notifications with severity level `WARNING` visible until the user explicitly dismisses them.
3. THE `Notification_System` SHALL keep Banner notifications with severity level `ERROR` visible until the user explicitly dismisses them or completes the associated remediation action.
4. THE `Notification_System` SHALL render `SUCCESS` notifications using a visually distinct success style (e.g., green accent).
5. THE `Notification_System` SHALL render `WARNING` notifications using a visually distinct warning style (e.g., amber/yellow accent).
6. THE `Notification_System` SHALL render `ERROR` notifications using a visually distinct error style (e.g., red accent).
7. THE `Notification_System` SHALL use plain, non-technical language in all notification messages and SHALL NOT expose raw stack traces, error codes, or internal node identifiers to the user.

---

### Requirement 8: Action Button Behavior

**User Story:** As a user, I want the action buttons in notifications to take me directly to the right place, so that I can resolve issues with the fewest possible steps.

#### Acceptance Criteria

1. WHEN the user activates a "View Logs" `Action_Button`, THE `Notification_System` SHALL open the execution console and scroll to the relevant node's log entry.
2. WHEN the user activates a "Reconnect [Service]" `Action_Button`, THE `Notification_System` SHALL navigate the user to the `Connections_Page` with the relevant service pre-selected.
3. WHEN the user activates a "Refresh" `Action_Button`, THE `Notification_System` SHALL reload the execution console data without requiring a full application restart.
4. WHEN any `Action_Button` is activated, THE `Notification_System` SHALL dismiss the associated notification after the action is initiated.
5. THE `Notification_System` SHALL render `Action_Button` elements with sufficient contrast and size to meet minimum interactive target requirements.
