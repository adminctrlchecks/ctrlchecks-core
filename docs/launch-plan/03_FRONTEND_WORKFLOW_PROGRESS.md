# 03 — Frontend Workflow Progress

---

## Current Frontend Workflow Trigger Flow

Evidence: `ctrl_checks/src/pages/Executions.tsx`, `ctrl_checks/src/components/workflow/ExecutionConsole.tsx`

1. User triggers workflow from `WorkflowBuilder` or `AIWorkflowBuilder` page
2. Frontend calls `POST /api/execute-workflow` (synchronous currently)
3. Response arrives after full execution (30–120s), UI freezes during wait
4. `Executions.tsx` page polls DB directly via `awsClient.from('executions').select(...)` on load
5. `ExecutionConsole.tsx` opens a WebSocket to `ws://localhost:3001/ws/executions?executionId=...`
6. `RealtimeExecutionVisualizer.tsx` also opens its own WebSocket

**Problem**: When the API call is synchronous, the UI has no executionId to track until the full response arrives.

---

## Pages and Components Involved

| File | Role |
|---|---|
| `ctrl_checks/src/pages/WorkflowBuilder.tsx` | Trigger button that calls execute-workflow API |
| `ctrl_checks/src/pages/AIWorkflowBuilder.tsx` | Also triggers execution |
| `ctrl_checks/src/pages/Executions.tsx` | Lists past executions with status |
| `ctrl_checks/src/pages/ExecutionDetail.tsx` | Shows single execution details |
| `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` | Live execution console with WS |
| `ctrl_checks/src/components/workflow/RealtimeExecutionVisualizer.tsx` | Node-by-node visual with WS |
| `ctrl_checks/src/stores/workflowStore.ts` | Zustand store (add execution state here) |

---

## Required State Model

Add to `ctrl_checks/src/stores/workflowStore.ts` or create `ctrl_checks/src/stores/executionStore.ts`:

```typescript
type ExecutionStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'reconnecting' | 'offline';

interface ActiveExecution {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  progress: number;          // 0–100
  currentStep: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  result: unknown | null;
}

interface ExecutionState {
  active: ActiveExecution | null;
  history: ActiveExecution[];
  wsConnected: boolean;
  wsReconnecting: boolean;
  setActive: (exec: ActiveExecution) => void;
  updateStatus: (patch: Partial<ActiveExecution>) => void;
  clearActive: () => void;
}
```

---

## Required UI States

| State | What user sees |
|---|---|
| `idle` | Run button enabled, no status banner |
| `queued` | "Workflow queued..." spinner, run button disabled |
| `running` | "Running: [currentStep]" with progress bar, cancel button |
| `success` | "Completed successfully" banner, results displayed |
| `failed` | "Failed: [errorMessage]" banner with retry button |
| `reconnecting` | "Reconnecting..." notice, polling fallback active |
| `offline` | "Connection lost — results may be delayed" notice |

---

## Progress Display Design

In `ExecutionConsole.tsx`:
```
[ Step 2 of 5 ] Sending Gmail... ████████░░░░ 40%
```

- Read `progress` (0–100) and `current_step` from execution row or WebSocket event
- Update in real time via WebSocket message or 3-second polling fallback

---

## Error Display Design

When `status === 'failed'`:
```
┌─ Execution Failed ─────────────────────────────────┐
│ Error: API rate limit exceeded (GEMINI_RATE_LIMIT) │
│ Occurred at step: Generate AI Response              │
│ [Retry] [View Logs]                                │
└────────────────────────────────────────────────────┘
```

- Show `error_message` from execution row
- Show `current_step` so user knows which node failed
- Retry button calls `POST /api/execute-workflow` again with same workflowId

---

## Retry Button Behavior

- Only shown when `status === 'failed'`
- Clicking calls `POST /api/execute-workflow` with same `workflowId`
- Sets state back to `queued` immediately
- Does NOT duplicate if already queued (disabled during queued/running)

---

## Cancel Button Behavior

- Shown when `status === 'queued'` or `status === 'running'`
- Calls `POST /api/workflows/executions/:executionId/cancel`
- On success: set state to `cancelled` (show neutral banner)
- On failure (already completed): show toast "Execution already completed"

---

## Polling Fallback

When WebSocket is unavailable or disconnected:

```typescript
// In a custom hook: useExecutionStatus(executionId)
useEffect(() => {
  if (!wsConnected && executionId) {
    const interval = setInterval(async () => {
      const result = await apiClient.get(`/api/workflows/executions/${executionId}`);
      updateStatus(result.data);
      if (['success', 'failed'].includes(result.data.status)) {
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }
}, [wsConnected, executionId]);
```

---

## WebSocket Subscription Behavior

In `ExecutionConsole.tsx` and `RealtimeExecutionVisualizer.tsx`:

1. After receiving 202 with `executionId`, open WebSocket:
   `ws://{API_HOST}/ws/executions?executionId={executionId}`
2. Listen for messages of type `workflow.execution.updated`
3. Update Zustand store on each message
4. If WebSocket closes unexpectedly, start polling fallback
5. If reconnect succeeds within 30 seconds, switch back to WebSocket

---

## Frontend Files to Modify

| File | Change |
|---|---|
| `ctrl_checks/src/stores/workflowStore.ts` | Add `activeExecution` state and actions |
| `ctrl_checks/src/pages/WorkflowBuilder.tsx` | Handle 202 response, show queued state |
| `ctrl_checks/src/pages/AIWorkflowBuilder.tsx` | Same as WorkflowBuilder |
| `ctrl_checks/src/pages/Executions.tsx` | Add live status badge with polling |
| `ctrl_checks/src/components/workflow/ExecutionConsole.tsx` | Progress bar, currentStep, reconnect notice |
| `ctrl_checks/src/components/workflow/RealtimeExecutionVisualizer.tsx` | Handle reconnect, polling fallback |

---

## Frontend Files to Create

| File | Purpose |
|---|---|
| `ctrl_checks/src/hooks/useExecutionStatus.ts` | Custom hook: WS + polling fallback for single execution |
| `ctrl_checks/src/hooks/useExecutionWebSocket.ts` | WebSocket connection lifecycle with reconnect |
| `ctrl_checks/src/components/workflow/ExecutionStatusBanner.tsx` | Reusable banner component for all states |
| `ctrl_checks/src/components/workflow/ExecutionProgressBar.tsx` | Progress bar with step label |

---

## Tests to Add

File: `ctrl_checks/src/__tests__/executionProgress.test.tsx`

```
✓ After API returns 202, UI shows "queued" state immediately
✓ When WS sends status=running, UI shows progress bar
✓ When WS sends status=success, UI shows success banner
✓ When WS sends status=failed, UI shows error message and retry button
✓ When WS disconnects, polling activates within 3 seconds
✓ When WS reconnects, polling stops
✓ Retry button is disabled when status is queued or running
✓ Cancel button calls cancel endpoint
✓ Duplicate submit is prevented (button disabled after first click)
✓ Polling does not call API when status is success or failed
```
