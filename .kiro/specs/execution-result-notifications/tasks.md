# Implementation Plan: Execution Result Notifications

## Overview

Implement a structured notification layer for the workflow builder that classifies every execution outcome and surfaces a clear, actionable toast or banner. The work is split into five incremental layers: pure utility functions → React hook → rendering component → WorkflowBuilder integration → ExecutionConsole polling fix. Each layer is independently testable before the next is wired in.

## Tasks

- [x] 1. Create core utility functions in `executionNotifications.ts`
  - Create `ctrl_checks/src/lib/executionNotifications.ts` with all exported types (`ExecutionClassification`, `NotificationSeverity`, `NotificationRenderMode`, `NotificationActionButton`, `NotificationConfig`, `ExecutionNodeLog`, `ExecutionResult`) and the `AUTH_ERROR_PATTERNS` constant
  - Implement `isAuthError(errorString)` — returns true when the lowercased string matches any auth error pattern
  - Implement `classifyExecutionResult(result)` — applies the five-step priority check (stuck → auth_failure → node_error → partial_success → full_success) and never throws; handles null/empty logs gracefully
  - Implement `friendlyErrorMessage(rawError)` — maps raw error strings to user-friendly messages using the ordered pattern table; never exposes stack traces, error codes, or UUIDs
  - Implement `extractServiceName(nodeType)` — maps node type prefixes to human-readable service names using the prefix table; falls back to capitalising the first segment
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 7.7_

  - [ ]* 1.1 Write property test: full-success classification (Property 1)
    - **Property 1: Full success classification** — for any array of logs where all entries have `status === 'success'`, `classifyExecutionResult` returns `'full_success'`
    - Use `fc.array(fc.record({ nodeId: fc.string(), nodeName: fc.string(), status: fc.constant('success') }), { minLength: 1 })` as the generator
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 1.2 Write property test: partial-success classification (Property 3)
    - **Property 3: Partial success classification** — for any logs with at least one `'skipped'` and no `'failed'`, `classifyExecutionResult` returns `'partial_success'`
    - **Validates: Requirements 2.1**

  - [ ]* 1.3 Write property test: auth-failure classification (Property 5)
    - **Property 5: Auth failure classification** — for any logs where at least one entry has `status === 'failed'` and its error matches an auth pattern, `classifyExecutionResult` returns `'auth_failure'`
    - **Validates: Requirements 3.1**

  - [ ]* 1.4 Write property test: node-error classification (Property 8)
    - **Property 8: Node error classification** — for any logs where at least one entry has `status === 'failed'` and no error matches an auth pattern, `classifyExecutionResult` returns `'node_error'`
    - **Validates: Requirements 5.1**

  - [ ]* 1.5 Write property test: stuck classification (Property 10)
    - **Property 10: Stuck classification** — for any result where backend status is terminal and `uiNodeStatuses` contains at least one `'running'` value, `classifyExecutionResult` returns `'stuck'`
    - **Validates: Requirements 4.1**

  - [ ]* 1.6 Write property test: friendlyErrorMessage never exposes technical details (Property 14)
    - **Property 14: friendlyErrorMessage never exposes technical details** — for any raw error string, the output must not contain stack trace line patterns (`"    at "`), `"Error:"` followed by a path, standalone HTTP status codes (` 500 `, ` 404 `), or UUIDs matching `/[0-9a-f]{8}-[0-9a-f]{4}-/`
    - **Validates: Requirements 5.2, 7.7**

- [x] 2. Checkpoint — run `vitest run src/lib/executionNotifications` and confirm all utility tests pass before proceeding

- [x] 3. Implement `useExecutionNotifications` hook
  - Create `ctrl_checks/src/hooks/useExecutionNotifications.ts`
  - Export `ExecutionNotificationCallbacks` interface (`onViewLogs`, `onReconnect`, `onRefresh`, `onDismiss`)
  - Implement `useExecutionNotifications(result, callbacks)` using `useMemo` — calls `classifyExecutionResult`, then builds the `NotificationConfig[]` according to the classification table in the design
  - For `full_success`: single config, severity `'success'`, mode `'toast'`, `autoDismissMs: 5000`, one "View Logs" action
  - For `partial_success`: single config, severity `'warning'`, mode `'toast'`, no auto-dismiss, message lists successful and skipped node names, one "View Logs" action
  - For `auth_failure`: group failed nodes by service name via `extractServiceName`; produce one config per unique service, severity `'error'`, mode `'banner'`, no auto-dismiss, action label "Reconnect [Service]"
  - For `node_error`: single config, severity `'error'`, mode `'banner'`, no auto-dismiss, message lists all failed node names, `resolution` = "Check the node configuration and try again.", one "View Logs" action
  - For `stuck`: single config, severity `'warning'`, mode `'banner'`, no auto-dismiss, one "Refresh" action
  - Each action's `onClick` must call the corresponding callback AND then call `onDismiss(config.id)`
  - Return `[]` when `result` is null
  - _Requirements: 1.1–1.3, 2.1–2.5, 3.1–3.5, 4.1–4.4, 5.1–5.6, 7.1–7.3_

  - [ ]* 3.1 Write property test: full-success notification config (Property 2)
    - **Property 2: Full success notification config** — for any full-success result, the returned config has `severity === 'success'`, `autoDismissMs === 5000`, and at least one action with label `"View Logs"`
    - **Validates: Requirements 1.1, 1.2, 1.3, 7.1, 7.4**

  - [ ]* 3.2 Write property test: partial-success notification content (Property 4)
    - **Property 4: Partial success notification content** — for any partial-success result with known node names, the config `message` contains every successful and every skipped node name, and `autoDismissMs` is `undefined`
    - **Validates: Requirements 2.2, 2.3, 2.4, 7.2**

  - [ ]* 3.3 Write property test: auth-failure service deduplication (Property 6)
    - **Property 6: Auth failure service deduplication** — for any auth-failure result with N failed nodes across M unique services (M ≤ N), `useExecutionNotifications` returns exactly M configs
    - **Validates: Requirements 3.5**

  - [ ]* 3.4 Write property test: auth-failure notification content (Property 7)
    - **Property 7: Auth failure notification content** — each returned config has `severity === 'error'`, `autoDismissMs === undefined`, and at least one action whose label contains `"Reconnect"` and the service name
    - **Validates: Requirements 3.2, 3.3, 3.4, 7.3, 7.6**

  - [ ]* 3.5 Write property test: node-error consolidation and content (Property 9)
    - **Property 9: Node error consolidation and content** — for any node-error result with N failed nodes (N ≥ 1), exactly one config is returned, its `message` contains all N failed node names, `resolution` contains "Check the node configuration and try again", and `autoDismissMs` is `undefined`
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.6**

  - [ ]* 3.6 Write property test: stuck notification config (Property 11)
    - **Property 11: Stuck notification config** — for any stuck result, the config has `severity === 'warning'`, `autoDismissMs === undefined`, and at least one action with label `"Refresh"`
    - **Validates: Requirements 4.2, 4.4, 7.2, 7.5**

  - [ ]* 3.7 Write property test: severity-to-persistence invariant (Property 12)
    - **Property 12: Severity-to-persistence invariant** — for any result, if classification is `'full_success'` then `autoDismissMs === 5000`; for all other classifications `autoDismissMs === undefined`
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [ ]* 3.8 Write property test: action button dismiss invariant (Property 13)
    - **Property 13: Action button dismiss invariant** — for any config with one or more action buttons, clicking any action button invokes `onDismiss` with the config's `id` after the primary handler runs
    - **Validates: Requirements 8.4**

- [x] 4. Checkpoint — run `vitest run src/hooks/useExecutionNotifications` and confirm all hook tests pass

- [x] 5. Build `ExecutionResultNotification` rendering component
  - Create `ctrl_checks/src/components/workflow/ExecutionResultNotification.tsx`
  - Accept `{ configs: NotificationConfig[], onDismiss: (id: string) => void }` props
  - For toast-mode configs: fire `toast({ title, description, duration, action })` inside a `useEffect` on mount; wrap the first action button in a `ToastAction` element; use `sonner` or the existing toast hook consistent with the rest of the codebase
  - For banner-mode configs: render a `GuidedStatusCard` per config using the existing `GuidedStatusTone` system; tone mapping: `success` → `'success'`, `warning` → `'attention'`, `error` (auth) → `'connection'`, `error` (node) → `'attention'`
  - Render a dismiss button on each banner that calls `onDismiss(config.id)`
  - Render action buttons with sufficient contrast and interactive target size (min 44×44 px touch target) to satisfy Requirements 8.5
  - Return `null` when `configs` is empty
  - Wrap toast calls in try/catch; fall back to rendering a banner if the toast system is unavailable
  - _Requirements: 1.1–1.3, 2.1–2.5, 3.1–3.4, 4.1–4.4, 5.1–5.5, 7.4–7.6, 8.1–8.5_

  - [ ]* 5.1 Write unit tests for `ExecutionResultNotification`
    - Test that toast-mode configs trigger `toast()` on mount
    - Test that banner-mode configs render `GuidedStatusCard` elements in the DOM
    - Test that clicking a dismiss button calls `onDismiss` with the correct id
    - Test that clicking an action button calls `onDismiss` after the primary handler
    - Test that the component returns null when `configs` is empty
    - _Requirements: 7.4–7.6, 8.4_

- [x] 6. Integrate notification system into `WorkflowBuilder.tsx`
  - Add `executionNotificationResult` state (`ExecutionResult | null`) via `useState`, initialised to `null`
  - Add a `buildExecutionNotificationResult` helper that maps the raw API response and current node statuses into the `ExecutionResult` shape expected by the hook
  - After the `execute-workflow` API response is parsed in `handleRun`, call `buildExecutionNotificationResult(data, nodes)` and call `setExecutionNotificationResult`
  - Add a `useEffect` that listens for the `workflow-execution-terminal` custom event; on receipt, call `setExecutionNotificationResult` with the terminal execution data from `event.detail.execution`; clean up the listener on unmount
  - Add a `handleRefresh` callback that reloads the execution console data; if the refresh promise does not resolve within 5 seconds, set the stuck notification via `setExecutionNotificationResult`
  - Wire `useExecutionNotifications(executionNotificationResult, callbacks)` with callbacks: `onViewLogs` opens/scrolls the console, `onReconnect` navigates to the Connections page with the service pre-selected, `onRefresh` calls `handleRefresh`, `onDismiss` clears the matching config
  - Render `<ExecutionResultNotification configs={notificationConfigs} onDismiss={handleDismiss} />` inside the existing `absolute right-4 top-4 z-[70]` overlay container alongside `executionGuidance`
  - _Requirements: 1.1, 1.4, 2.1, 3.1–3.3, 4.1–4.4, 5.1, 6.1–6.4, 8.1–8.3_

  - [ ]* 6.1 Write unit tests for WorkflowBuilder notification integration
    - Test that a successful execution result triggers a success notification config
    - Test that the `workflow-execution-terminal` event listener is registered on mount and removed on unmount
    - Test that `handleRefresh` fires the stuck notification after 5 seconds if refresh does not resolve
    - _Requirements: 1.1, 4.1, 6.4_

- [x] 7. Fix `ExecutionConsole.tsx` — dispatch terminal event and stop polling
  - In the polling/realtime subscription handler in `ExecutionConsole.tsx`, add a terminal-status check using a local `isTerminalStatus(status)` helper (`'success' | 'failed' | 'completed' | 'error'` are terminal)
  - When a terminal status is detected, dispatch `new CustomEvent('workflow-execution-terminal', { detail: { execution: updatedExecution } })` on `window`
  - After dispatching the event, call `clearInterval` (or cancel the subscription) to stop further polling for that execution ID
  - Ensure the polling stop happens even if the event dispatch throws
  - _Requirements: 6.1, 6.3_

  - [ ]* 7.1 Write property test: console refresh stops polling (Property 15)
    - **Property 15: Console refresh stops polling** — for any execution where the polling service receives a terminal status, after the `workflow-execution-terminal` event is dispatched, no further polling calls are made for that execution ID
    - Simulate with a mock fetch counter; assert the counter does not increment after the terminal event
    - **Validates: Requirements 6.3**

- [x] 8. Final checkpoint — run `vitest run` and confirm all tests pass; verify no TypeScript errors with `tsc --noEmit`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests live in `ctrl_checks/src/__tests__/executionNotifications.property.test.ts`; unit tests live in `ctrl_checks/src/__tests__/executionNotifications.test.ts`
- fast-check is already installed as a dev dependency — no additional setup needed
- The workspace rules require all edge/node mutations to go through the unified graph orchestrator; this feature is purely frontend notification logic and does not touch workflow edges or node registry
