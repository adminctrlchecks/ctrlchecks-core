# Design Document: Execution Result Notifications

## Overview

This feature adds a structured notification layer to the workflow builder that surfaces clear, actionable messages after every execution completes. Currently, users must read raw node logs to understand what happened. The new system classifies each execution outcome into one of five categories and renders an appropriate toast or banner with plain-language messaging and direct action buttons.

The design is built around three pure-function utilities (`classifyExecutionResult`, `friendlyErrorMessage`, `extractServiceName`), a React hook (`useExecutionNotifications`) that composes them into a notification config, and a rendering component (`ExecutionResultNotification`) that maps the config to the existing toast/banner UI. Integration is a single call site in `WorkflowBuilder.tsx` after execution completes, and a small addition to the polling loop in `ExecutionConsole.tsx` for the auto-refresh path.

### Key Design Decisions

- **Pure utility functions** — `classifyExecutionResult` and `friendlyErrorMessage` are pure functions with no side effects. This makes them trivially testable and reusable.
- **Config-driven rendering** — the hook returns a `NotificationConfig` object; the component renders it. This separates classification logic from UI concerns.
- **Extend existing patterns** — the feature reuses the existing `toast()` hook, `GuidedStatusCard` banner component, and `GuidedStatusTone` system rather than introducing new UI primitives.
- **No new Zustand slice** — notification state is local to `WorkflowBuilder.tsx` via `useState`, consistent with how `executionGuidance` is already managed.
- **Service deduplication at config level** — when multiple nodes fail for the same service, the hook produces one config entry per unique service before any rendering occurs.

---

## Architecture

```mermaid
flowchart TD
    A[WorkflowBuilder.tsx\nhandleRun / polling] -->|execution result| B[useExecutionNotifications hook]
    B --> C[classifyExecutionResult\npure function]
    B --> D[friendlyErrorMessage\npure function]
    B --> E[extractServiceName\npure function]
    C --> F[ExecutionClassification\nenum]
    B --> G[NotificationConfig\narray]
    G --> H[ExecutionResultNotification\ncomponent]
    H -->|severity=success/warning| I[toast() — auto-dismiss or persistent]
    H -->|severity=error or banner=true| J[GuidedStatusCard banner\nin WorkflowBuilder overlay]

    K[ExecutionConsole.tsx\npolling loop] -->|terminal status detected| L[dispatchEvent\nworkflow-execution-terminal]
    L --> A
```

### Data Flow

1. `handleRun` in `WorkflowBuilder.tsx` receives the execution response from the backend.
2. It calls `useExecutionNotifications` with the execution result and a set of action callbacks.
3. The hook calls `classifyExecutionResult` to determine the outcome category.
4. Based on the category, the hook builds one or more `NotificationConfig` objects, calling `friendlyErrorMessage` and `extractServiceName` as needed.
5. `ExecutionResultNotification` receives the config array and renders each entry as either a toast (success/warning) or a `GuidedStatusCard` banner (error/persistent warning).
6. In parallel, `ExecutionConsole.tsx`'s polling loop detects terminal status and dispatches a `workflow-execution-terminal` custom event, which triggers a console refresh and stops polling.

---

## Components and Interfaces

### Types (`src/lib/executionNotifications.ts`)

```typescript
/** The five possible execution outcome categories. */
export type ExecutionClassification =
  | 'full_success'
  | 'partial_success'
  | 'auth_failure'
  | 'node_error'
  | 'stuck';

/** Severity maps to visual style and persistence behavior. */
export type NotificationSeverity = 'success' | 'warning' | 'error';

/** Render mode: toast floats in the corner; banner renders inline above the console. */
export type NotificationRenderMode = 'toast' | 'banner';

export interface NotificationActionButton {
  label: string;
  /** Called when the button is clicked. The notification is dismissed after this runs. */
  onClick: () => void;
}

export interface NotificationConfig {
  id: string;                          // stable key for React rendering
  classification: ExecutionClassification;
  severity: NotificationSeverity;
  renderMode: NotificationRenderMode;
  title: string;
  message: string;
  resolution?: string;                 // optional second-line instruction
  /** Duration in ms before auto-dismiss. Undefined = no auto-dismiss. */
  autoDismissMs?: number;
  actions: NotificationActionButton[];
}
```

### `classifyExecutionResult` (`src/lib/executionNotifications.ts`)

Pure function. Takes an `ExecutionResult` and optional UI node statuses, returns an `ExecutionClassification`.

```typescript
export interface ExecutionNodeLog {
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  status: 'success' | 'failed' | 'skipped' | 'running' | 'pending';
  error?: string | null;
}

export interface ExecutionResult {
  id: string;
  status: string;           // backend terminal status: 'success' | 'failed' | 'running' | ...
  logs: ExecutionNodeLog[] | null;
  error?: string | null;
  /** Node statuses currently displayed in the UI (used to detect stale RUNNING state). */
  uiNodeStatuses?: Record<string, string>;
}

export function classifyExecutionResult(result: ExecutionResult): ExecutionClassification
```

Classification logic (in priority order):

1. **`stuck`** — backend status is terminal (`success` or `failed`) AND `uiNodeStatuses` contains any node with status `running`.
2. **`auth_failure`** — any log entry has `status === 'failed'` AND its `error` string matches any auth error pattern.
3. **`node_error`** — any log entry has `status === 'failed'` (and no auth error matched).
4. **`partial_success`** — at least one log entry has `status === 'skipped'` AND no entries have `status === 'failed'`.
5. **`full_success`** — all log entries have `status === 'success'` (or no logs and backend status is `success`).

### `friendlyErrorMessage` (`src/lib/executionNotifications.ts`)

Pure function. Converts a raw error string into a user-friendly message. Never exposes stack traces, error codes, or internal identifiers.

```typescript
export function friendlyErrorMessage(rawError: string | null | undefined): string
```

Mapping rules (applied in order, first match wins):

| Raw error pattern | Friendly message |
|---|---|
| Contains `Authentication failed`, `Token invalid`, `OAuth`, `credentials not configured`, `re-authenticate` | Handled by auth_failure path — not called for these |
| Contains `timeout` or `timed out` | "The step took too long to complete. Try again or check the service status." |
| Contains `rate limit` or `429` | "The service is temporarily rate-limited. Wait a moment and try again." |
| Contains `not found` or `404` | "A required resource was not found. Check the node configuration." |
| Contains `permission` or `403` or `forbidden` | "The connected account doesn't have permission for this action." |
| Contains `network` or `ECONNREFUSED` or `fetch failed` | "Could not reach the service. Check your internet connection and try again." |
| Contains `invalid` (generic) | "The node received unexpected data. Check the input configuration." |
| Fallback | "Something went wrong in this step. Check the node configuration and try again." |

### `extractServiceName` (`src/lib/executionNotifications.ts`)

Pure function. Derives a human-readable service name from a node type string.

```typescript
export function extractServiceName(nodeType: string | undefined): string
```

Mapping table (prefix-based, first match wins):

| Node type prefix | Service name |
|---|---|
| `google_gmail`, `google_sheets`, `google_drive`, `google_*` | `"Google"` |
| `slack_*` | `"Slack"` |
| `hubspot_*` | `"HubSpot"` |
| `salesforce_*` | `"Salesforce"` |
| `notion_*` | `"Notion"` |
| `github_*` | `"GitHub"` |
| `linkedin_*` | `"LinkedIn"` |
| `twitter_*` | `"Twitter"` |
| `facebook_*` | `"Facebook"` |
| `instagram_*` | `"Instagram"` |
| `whatsapp_*` | `"WhatsApp"` |
| `zoho_*` | `"Zoho"` |
| `stripe_*` | `"Stripe"` |
| `airtable_*` | `"Airtable"` |
| Fallback | Capitalize first segment: `"my_service"` → `"My Service"` |

### `useExecutionNotifications` hook (`src/hooks/useExecutionNotifications.ts`)

React hook. Takes an execution result and action callbacks, returns a `NotificationConfig[]`.

```typescript
export interface ExecutionNotificationCallbacks {
  onViewLogs: (nodeId?: string) => void;
  onReconnect: (service: string) => void;
  onRefresh: () => void;
  onDismiss: (notificationId: string) => void;
}

export function useExecutionNotifications(
  result: ExecutionResult | null,
  callbacks: ExecutionNotificationCallbacks
): NotificationConfig[]
```

The hook is a pure derivation — it calls `classifyExecutionResult`, then builds the config array based on the classification. It uses `useMemo` to avoid recomputing on unrelated renders.

**Config construction per classification:**

| Classification | Severity | Mode | autoDismissMs | Actions |
|---|---|---|---|---|
| `full_success` | `success` | `toast` | `5000` | View Logs |
| `partial_success` | `warning` | `toast` | `undefined` | View Logs |
| `auth_failure` | `error` | `banner` | `undefined` | Reconnect [Service] (one per unique service) |
| `node_error` | `error` | `banner` | `undefined` | View Logs |
| `stuck` | `warning` | `banner` | `undefined` | Refresh |

For `auth_failure`: the hook groups failed nodes by service name and produces one `NotificationConfig` per unique service. Each config's `actions` array contains a single "Reconnect [Service]" button.

For `node_error` with multiple failed nodes: the hook produces a single `NotificationConfig` whose `message` lists all failed node names.

### `ExecutionResultNotification` component (`src/components/workflow/ExecutionResultNotification.tsx`)

Renders a `NotificationConfig[]`. Toast-mode configs are fired via the existing `toast()` hook on mount. Banner-mode configs are rendered as `GuidedStatusCard` elements.

```typescript
interface ExecutionResultNotificationProps {
  configs: NotificationConfig[];
  onDismiss: (id: string) => void;
}

export function ExecutionResultNotification({
  configs,
  onDismiss,
}: ExecutionResultNotificationProps): JSX.Element | null
```

Rendering rules:
- Toast configs: call `toast({ title, description, duration, action })` in a `useEffect` on mount. The `action` prop is a `ToastAction` element wrapping the first action button.
- Banner configs: render as `GuidedStatusCard` components in the existing overlay `div` in `WorkflowBuilder.tsx` (the same `absolute right-4 top-4 z-[70]` container used by `executionGuidance`).
- Tone mapping: `success` → `'success'`, `warning` → `'attention'`, `error` → `'connection'` (for auth) or `'attention'` (for node error).

---

## Data Models

### Auth Error Detection Patterns

```typescript
const AUTH_ERROR_PATTERNS = [
  'authentication failed',
  'token invalid',
  'token expired',
  'oauth',
  'credentials not configured',
  're-authenticate',
] as const;

export function isAuthError(errorString: string | null | undefined): boolean {
  if (!errorString) return false;
  const lower = errorString.toLowerCase();
  return AUTH_ERROR_PATTERNS.some(pattern => lower.includes(pattern));
}
```

### Execution Result Shape (from Supabase)

The existing `Execution` interface in `ExecutionConsole.tsx` is the source of truth. The notification utilities consume a subset:

```typescript
// Subset consumed by notification utilities
{
  id: string;
  status: string;           // 'success' | 'failed' | 'running' | 'waiting' | 'pending'
  logs: Array<{
    nodeId: string;
    nodeName: string;
    nodeType?: string;
    status: 'success' | 'failed' | 'skipped' | 'running' | 'pending';
    error?: string | null;
  }> | null;
  error?: string | null;
}
```

### Integration Point in `WorkflowBuilder.tsx`

The notification system is triggered at two points:

**Point 1 — After `handleRun` receives a response:**

```typescript
// After the execute-workflow response is parsed:
const notificationResult = buildExecutionNotificationResult(data, nodes);
setExecutionNotificationResult(notificationResult);
setConsoleExpanded(true);
```

**Point 2 — After polling detects terminal state (in `ExecutionConsole.tsx`):**

```typescript
// When a realtime UPDATE arrives with terminal status:
if (isTerminalStatus(updatedExecution.status)) {
  window.dispatchEvent(new CustomEvent('workflow-execution-terminal', {
    detail: { execution: updatedExecution }
  }));
  clearInterval(pollInterval); // stop polling
}
```

`WorkflowBuilder.tsx` listens for `workflow-execution-terminal` and calls `setExecutionNotificationResult` with the terminal execution data.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Full success classification

*For any* execution result where all node log entries have `status === 'success'` (and no entries have `status === 'failed'` or `status === 'skipped'`), `classifyExecutionResult` SHALL return `'full_success'`.

**Validates: Requirements 1.1, 1.4**

---

### Property 2: Full success notification config

*For any* full-success execution result, `useExecutionNotifications` SHALL return a config with `severity === 'success'`, `autoDismissMs === 5000`, and at least one action button with label `"View Logs"`.

**Validates: Requirements 1.1, 1.2, 1.3, 7.1, 7.4**

---

### Property 3: Partial success classification

*For any* execution result where at least one node log entry has `status === 'skipped'` and no entries have `status === 'failed'`, `classifyExecutionResult` SHALL return `'partial_success'`.

**Validates: Requirements 2.1**

---

### Property 4: Partial success notification content

*For any* partial-success execution result with known node names, `useExecutionNotifications` SHALL return a config whose `message` contains every successful node name and every skipped node name, and whose `autoDismissMs` is `undefined`.

**Validates: Requirements 2.2, 2.3, 2.4, 7.2**

---

### Property 5: Auth failure classification

*For any* execution result where at least one node log entry has `status === 'failed'` and its `error` string matches any auth error pattern, `classifyExecutionResult` SHALL return `'auth_failure'`.

**Validates: Requirements 3.1**

---

### Property 6: Auth failure service deduplication

*For any* auth-failure execution result with N failed nodes across M unique services (where M ≤ N), `useExecutionNotifications` SHALL return exactly M `NotificationConfig` entries, one per unique service.

**Validates: Requirements 3.5**

---

### Property 7: Auth failure notification content

*For any* auth-failure execution result, each returned `NotificationConfig` SHALL have `severity === 'error'`, `autoDismissMs === undefined`, and at least one action button whose label contains `"Reconnect"` and the service name.

**Validates: Requirements 3.2, 3.3, 3.4, 7.3, 7.6**

---

### Property 8: Node error classification

*For any* execution result where at least one node log entry has `status === 'failed'` and no entry's error matches any auth error pattern, `classifyExecutionResult` SHALL return `'node_error'`.

**Validates: Requirements 5.1**

---

### Property 9: Node error consolidation and content

*For any* node-error execution result with N failed nodes (N ≥ 1), `useExecutionNotifications` SHALL return exactly one `NotificationConfig` whose `message` contains all N failed node names, whose `resolution` contains "Check the node configuration and try again", and whose `autoDismissMs` is `undefined`.

**Validates: Requirements 5.2, 5.3, 5.5, 5.6**

---

### Property 10: Stuck classification

*For any* execution result where the backend `status` is terminal (`'success'` or `'failed'`) and `uiNodeStatuses` contains at least one entry with value `'running'`, `classifyExecutionResult` SHALL return `'stuck'`.

**Validates: Requirements 4.1**

---

### Property 11: Stuck notification config

*For any* stuck execution result, `useExecutionNotifications` SHALL return a config with `severity === 'warning'`, `autoDismissMs === undefined`, and at least one action button with label `"Refresh"`.

**Validates: Requirements 4.2, 4.4, 7.2, 7.5**

---

### Property 12: Severity-to-persistence invariant

*For any* execution result, if `classifyExecutionResult` returns `'full_success'` then the notification config SHALL have `autoDismissMs === 5000`; for all other classifications the config SHALL have `autoDismissMs === undefined`.

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 13: Action button dismiss invariant

*For any* `NotificationConfig` with one or more action buttons, clicking any action button SHALL invoke the `onDismiss` callback with the config's `id` after the action's primary handler runs.

**Validates: Requirements 8.4**

---

### Property 14: friendlyErrorMessage never exposes technical details

*For any* raw error string input, `friendlyErrorMessage` SHALL return a string that does not contain stack trace line patterns (e.g., `"    at "`, `"Error:"` followed by a path), raw HTTP status codes as standalone tokens (e.g., `" 500 "`, `" 404 "`), or internal node identifiers (UUIDs matching `/[0-9a-f]{8}-[0-9a-f]{4}-/`).

**Validates: Requirements 5.2, 7.7**

---

### Property 15: Console refresh stops polling

*For any* execution where the polling service receives a terminal status, after the `workflow-execution-terminal` event is dispatched, no further polling calls SHALL be made for that execution ID.

**Validates: Requirements 6.3**

---

## Error Handling

### Classification Failures

`classifyExecutionResult` must never throw. If `logs` is null or empty and backend status is `'success'`, it returns `'full_success'`. If `logs` is null and backend status is `'failed'`, it returns `'node_error'` with a generic message. Unexpected status values fall through to `'node_error'`.

### Notification Rendering Failures

`ExecutionResultNotification` wraps toast calls in try/catch. If the toast system is unavailable, it falls back to rendering a banner. Banner rendering failures are caught by the existing `ErrorBoundary` in `WorkflowBuilder.tsx`.

### Polling / Refresh Failures

If the console refresh triggered by `workflow-execution-terminal` fails to load updated data within 5 seconds, the `stuck` notification is shown (Requirement 6.4). This is implemented with a `setTimeout` in the event handler that fires the stuck notification if the refresh promise has not resolved.

### Missing Node Names

If a log entry has no `nodeName`, fall back to `nodeId` (truncated to 8 chars). If `nodeId` is also missing, use `"Unknown node"`.

---

## Testing Strategy

### Unit Tests (example-based)

Located in `ctrl_checks/src/__tests__/executionNotifications.test.ts`.

- `classifyExecutionResult` with each of the five outcome scenarios using concrete fixtures.
- `friendlyErrorMessage` with representative raw error strings from each mapping category.
- `extractServiceName` with each known node type prefix and an unknown type.
- `useExecutionNotifications` with concrete execution results for each classification, verifying the full config shape.
- Action button onClick behavior: verify `onDismiss` is called, verify `onViewLogs` / `onReconnect` / `onRefresh` are called with correct arguments.
- Refresh timeout fallback: mock `setTimeout` and verify stuck notification appears when refresh does not resolve within 5 seconds.
- Polling stop: verify no further fetch calls after terminal status is received.

### Property-Based Tests

Located in `ctrl_checks/src/__tests__/executionNotifications.property.test.ts`.

Uses [fast-check](https://github.com/dubzzz/fast-check) (already a common choice in TypeScript projects; add as a dev dependency if not present).

Each property test runs a minimum of 100 iterations.

Tag format: `// Feature: execution-result-notifications, Property N: <property text>`

**Property test implementations:**

- **Property 1 & 3**: Generate arbitrary arrays of node logs with controlled status distributions. Verify classification.
- **Property 2**: Generate full-success results, verify config shape.
- **Property 4**: Generate partial-success results with random node names, verify message contains all names.
- **Property 5 & 8**: Generate failed-node results with random error strings (auth vs non-auth), verify classification.
- **Property 6**: Generate auth-failure results with random node/service combinations, verify deduplication count.
- **Property 7**: Generate auth-failure results, verify config severity, persistence, and action button labels.
- **Property 9**: Generate node-error results with N failed nodes, verify single config with all names.
- **Property 10 & 11**: Generate stuck scenarios (terminal backend + running UI), verify classification and config.
- **Property 12**: Generate results of all classifications, verify autoDismissMs invariant.
- **Property 13**: Generate configs with random action buttons, verify dismiss is always called.
- **Property 14**: Generate arbitrary error strings (including strings with stack trace patterns), verify friendlyErrorMessage output is clean.
- **Property 15**: Simulate polling with terminal status, verify no further calls.

### Integration Tests

- End-to-end: trigger a mock execution in `WorkflowBuilder`, verify the correct notification appears in the DOM.
- Console refresh timing: verify the `workflow-execution-terminal` event triggers a console reload within 2 seconds (Requirement 6.1).
