# Workflow Connection Gate: Diagnostic Roadmap

Status: analysis and implementation roadmap only. No application source code changed.

Observed symptom:

- Workflow page shows **Account connections required** for Google OAuth / Gmail.
- Connections page shows **Google OAuth2 Connection - Active**.
- The header still shows the missing-connection indicator after returning from `/connections`.
- The issue can repeat after navigating away/back or after restoring/opening the workflow again.

This is a connection-readiness mismatch. One UI is displaying saved connection rows, while the workflow gate is asking a stricter runtime-readiness question.

---

## 1. Parameter Contract First

Every workflow connection check should produce and consume one shared readiness envelope. Do not let each page infer connection status differently.

```ts
type ConnectionReadinessStatus =
  | 'ready'
  | 'missing'
  | 'expired'
  | 'missing_scope'
  | 'error';

type WorkflowConnectionRequirement = {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  provider: string;          // canonical: google, linkedin, notion
  credentialTypeId: string;  // canonical: google_oauth2
  authType: 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'custom_header' | 'query_auth';
  requiredScopes: string[];
};

type ConnectionReadinessRow = WorkflowConnectionRequirement & {
  status: ConnectionReadinessStatus;
  connectionId?: string;
  credentialId?: string;
  source: 'connections' | 'unified_credentials' | 'legacy_token_table' | 'credential_service';
  availableScopes?: string[];
  reason?: string;
  checkedAt: string;
};

type WorkflowConnectionReadinessResponse = {
  workflowId: string;
  ready: boolean;
  rows: ConnectionReadinessRow[];
  missing: ConnectionReadinessRow[];
  summary: {
    requiredCount: number;
    readyCount: number;
    missingCount: number;
    missingScopeCount: number;
    expiredCount: number;
  };
};
```

Java-style universal shape:

```java
public record WorkflowConnectionRequirement(
    String workflowId,
    String nodeId,
    String nodeType,
    String nodeLabel,
    String provider,
    String credentialTypeId,
    String authType,
    List<String> requiredScopes
) {}

public record ConnectionReadinessRow(
    WorkflowConnectionRequirement requirement,
    String status,
    Optional<String> connectionId,
    Optional<String> credentialId,
    String source,
    List<String> availableScopes,
    Optional<String> reason,
    Instant checkedAt
) {}
```

Rule: **Connections page, workflow modal, run button, and execution preflight must all use this same readiness result.**

---

## 2. Current Flow In This Repo

### Workflow gate

Frontend:

- `ctrl_checks/src/hooks/useWorkflowConnectionStatus.ts`
- calls `GET /api/workflows/:workflowId/missing-items`
- returns only credentials where `satisfied === false`
- query key: `['workflow-connection-status', workflowId]`
- first check waits 7 seconds
- stale time is 30 seconds

UI:

- `ctrl_checks/src/components/workflow/WorkflowConnectionGate.tsx`
- `ctrl_checks/src/components/workflow/WorkflowHeader.tsx`
- `ctrl_checks/src/pages/WorkflowBuilder.tsx`

Backend:

- `worker/src/api/workflows-missing-items.ts`
- combines:
  - `getUnifiedMissingItems(workflowId, userId)`
  - `executionPreflight({ workflowId, ownerId, nodes })`

Important detail:

- `executionPreflight` checks runtime readiness through `resolveCredentialDryRun`.
- `resolveCredentialDryRun` uses `unified_credentials`.
- For Gmail, the required node scope is `https://www.googleapis.com/auth/gmail.send`.

### Connections page

Frontend:

- `ctrl_checks/src/pages/Connections.tsx`
- `ctrl_checks/src/hooks/useConnections.ts`
- `ctrl_checks/src/lib/api/connections.ts`

Backend:

- `GET /api/credential-connections/connections`
- `worker/src/api/credential-connections.ts`
- `worker/src/credentials-system/connection-service.ts`

Important detail:

- This lists rows from `connections`.
- The page displays `connection.status === 'active'`.
- That does not necessarily prove `unified_credentials` has a valid, active, scope-covering token.

---

## 3. Most Likely Root Causes

### Cause A: Active connection row but runtime credential missing

`connections` can show:

- `provider = google`
- `credential_type_id = google_oauth2`
- `status = active`

But workflow preflight can still fail if `unified_credentials` has no matching active row:

- `user_id` mismatch
- `provider` mismatch, such as `gmail` vs `google`
- `scope_set` does not cover `gmail.send`
- token expired or refresh failed
- row was deleted/inactivated while `connections` row remained

This exactly matches the screenshot pattern: connection list says Active, workflow gate says Not connected.

### Cause B: Scope-level mismatch

The gate is not only asking “is Google connected?” It is asking “can this Gmail node run?”

For `google_gmail`, the runtime gate requires:

```txt
https://www.googleapis.com/auth/gmail.send
```

If the OAuth connection was created with generic Google profile scopes, or with Sheets/Drive-only scopes, the Connections page can still look active while Gmail remains blocked.

### Cause C: Frontend invalidation does not include workflow gate query

`ctrl_checks/src/lib/queryInvalidation.ts` invalidates:

- `QUERY_KEYS.connections`
- `QUERY_KEYS.credentialTypes`

It does not invalidate:

- `['workflow-connection-status', workflowId]`

`useWorkflowConnectionStatus` tries to recheck when navigating back from `/connections`, but this hook only lives on the workflow page. During a real route change to the Connections page, the workflow component may be unmounted, so `wasOnConnections.current` can be reset and the recheck can be missed.

### Cause D: Redis/API cache can preserve stale missing-items

`credential-connections.ts` does invalidate missing-items cache on create/update/OAuth callback, but only for the generic OAuth callback path and only by workflow ID when it can parse `returnTo`.

If another OAuth route writes credentials, or if `returnTo` is `/connections` instead of `/workflow/:id`, stale `/missing-items` cache can survive.

### Cause E: There are multiple OAuth storage paths

The repo has several status stores:

- `connections`
- `unified_credentials`
- provider token tables such as `google_oauth_tokens`
- `social_tokens`
- credential-service remote routes
- legacy `user_credentials`

Any page that reads one of these directly can disagree with another page.

---

## 4. Target Architecture

### 4.1 Single readiness service

Create one backend service:

```ts
getWorkflowConnectionReadiness({
  workflowId,
  userId,
  nodes,
  includeSatisfied: true,
})
```

Responsibilities:

1. Load workflow nodes.
2. Convert every node to a canonical `WorkflowConnectionRequirement`.
3. Resolve each requirement against the authoritative credential store.
4. Return satisfied and missing rows with reason codes.
5. Never hide satisfied rows; the UI needs both sides for debugging.

### 4.2 Canonical provider/type mapping

Normalize aliases before lookup:

```txt
gmail         -> google
google_gmail  -> google
google_oauth  -> google_oauth2
Google OAuth  -> google_oauth2
```

Do this once in a shared resolver, not separately in UI, wizard, preflight, and execution.

### 4.3 Scope-aware readiness

Connection status should be computed like this:

1. No credential row: `missing`
2. Credential exists but expired and cannot refresh: `expired`
3. Credential exists but required scopes are not covered: `missing_scope`
4. Credential exists and scopes are covered: `ready`
5. DB/service error: `error`

### 4.4 Connections page should show runtime-readiness details

For OAuth rows, display more than `Active`:

- Active / Ready for Gmail
- Active / Missing Gmail permission
- Active / Needs reconnect
- Active / Credential store mismatch

That prevents the confusing “Active but Not connected” contradiction.

### 4.5 Frontend cache invalidation should include workflow readiness

Expand query keys:

```ts
export const QUERY_KEYS = {
  connections: ['connections'] as const,
  credentialTypes: ['credential-types'] as const,
  workflowConnectionStatus: (workflowId: string) => ['workflow-connection-status', workflowId] as const,
};
```

Then invalidate workflow readiness after:

- OAuth success relay
- connection create/update/delete
- reconnect
- returning to workflow from `/connections`
- refresh button on Connections page when `returnTo` is present

---

## 5. Implementation Roadmap

### Phase 1: Instrument the mismatch

Add debug logging to `GET /api/workflows/:workflowId/missing-items`:

- workflowId
- userId
- nodeId/nodeType
- provider
- requiredScopes
- connection row found or not
- unified credential row found or not
- available scopes
- final status/reason

Do not log access tokens, refresh tokens, raw encrypted credentials, or full OAuth payloads.

Acceptance:

- The log can explain why the workflow says Google is missing while Connections says Active.

### Phase 2: Build the shared readiness service

Add a service near the existing credential/preflight code:

```txt
worker/src/services/workflow-connection-readiness.ts
```

Inputs:

- workflowId
- userId
- optional nodes

Outputs:

- `WorkflowConnectionReadinessResponse`

Internal dependencies:

- `credentialRequirementForNode`
- `resolveCredentialDryRun`
- `connectionService.findCanonicalConnectionByProvider`
- scope helpers from `credential-scope-registry`

Acceptance:

- It returns `ready`, `missing`, `missing_scope`, `expired`, or `error` for every credential-bearing node.

### Phase 3: Replace missing-items credential logic

Update `worker/src/api/workflows-missing-items.ts`:

- Keep input discovery as-is.
- Replace duplicated credential discovery/preflight merge with the shared readiness service.
- Return both:
  - legacy `credentials` for existing UI compatibility
  - new `connectionReadiness` envelope for the future UI

Acceptance:

- Existing UI still works.
- New payload explains the reason code.

### Phase 4: Align the Connections page with readiness

When `returnTo=/workflow/:id` is present:

- call workflow readiness for that workflow
- annotate each connection card with whether it satisfies the workflow
- show provider-specific issue text if not ready

Acceptance:

- Google OAuth row cannot simply say “Active” if Gmail scope is missing.

### Phase 5: Fix frontend invalidation

Update `queryInvalidation.ts`:

- allow optional workflowId
- invalidate `workflowConnectionStatus(workflowId)`
- invalidate all workflow-connection-status queries when workflowId is unknown

Update OAuth success handling:

- include `returnTo` from the workflow route when opening OAuth from a workflow context
- after OAuth success, invalidate workflow readiness before navigating back

Acceptance:

- After successful OAuth, the modal clears without manual refresh.
- Returning from `/connections` triggers a fresh `/missing-items` call.

### Phase 6: Add repair/backfill path

Add a reconciliation job or admin endpoint:

- find active `connections` rows without matching `unified_credentials`
- find `unified_credentials` rows without matching active `connections`
- report scope mismatches
- optionally repair only when token material is safely available

Acceptance:

- Existing users with old OAuth rows can be repaired without reconnecting when possible.
- If repair is impossible, UI says “Reconnect to grant Gmail permission.”

---

## 6. Verification Checklist

### Database checks

For the affected user and Google provider, verify:

```sql
SELECT id, user_id, provider, credential_type_id, status, expires_at, metadata
FROM connections
WHERE user_id = :user_id AND provider = 'google';
```

```sql
SELECT id, user_id, provider, scope_set, expires_at, is_active, source, updated_at
FROM unified_credentials
WHERE user_id = :user_id AND provider = 'google';
```

Expected for Gmail:

- `connections.status = active`
- `unified_credentials.is_active = true`
- `scope_set` includes `https://www.googleapis.com/auth/gmail.send`
- `expires_at` is null/future or refresh succeeds

### API checks

```http
GET /api/credential-connections/connections
```

Should show saved connection rows.

```http
GET /api/workflows/:workflowId/missing-items
```

Should show no missing Google credential when the Gmail-ready credential exists.

Future:

```http
GET /api/workflows/:workflowId/connection-readiness
```

Should show all rows with reason codes.

### UI checks

1. Open workflow with Gmail node and no Google credential.
2. Confirm modal shows Google missing.
3. Click **Set Up Connections**.
4. Complete Google OAuth with Gmail scope.
5. Return to workflow.
6. Confirm modal disappears and Run unlocks.
7. Refresh page.
8. Confirm modal does not reappear.
9. Remove Gmail scope or use a scope-limited credential.
10. Confirm UI says “Missing Gmail permission,” not generic “Not connected.”

---

## 7. Concrete Bug Hypothesis For The Screenshot

The most probable issue is not that the app has no Google connection. The app likely has an active `connections` row.

The workflow gate still blocks because at least one of these is true:

1. `unified_credentials` does not have a matching active Google row for the same user.
2. The Google unified credential exists but lacks `gmail.send`.
3. The missing-items response is stale because the workflow gate query/cache was not invalidated after OAuth.
4. The OAuth success path returned to `/connections`, so backend cache invalidation could not parse the workflow ID from `returnTo`.

Fixing only the modal UI will hide the symptom. The durable fix is to make one readiness service the source of truth and make both pages read it.

