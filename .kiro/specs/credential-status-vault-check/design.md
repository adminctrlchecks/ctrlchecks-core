# Credential Status Vault Check — Bugfix Design

## Overview

The `generate-workflow` endpoint runs credential discovery (Stage 6 of the AI-first pipeline) and correctly marks each `CredentialRequirement` as `satisfied: true/false` by querying vault tables. However, it never converts that `satisfied` flag into a `credentialStatuses` array and never includes it in the API response. The wizard receives `credentialStatuses: undefined`, so `filterStillBlockingOAuth()` always sees an empty array and treats every OAuth credential as blocking.

The fix is entirely backend-side: after the pipeline runs, `generate-workflow.ts` maps `result.requiredCredentials` into a `credentialStatuses` array and returns it in the JSON response. The wizard already reads `update.credentialStatuses` and stores it in `pendingWorkflowData.credentialStatuses` — no frontend logic changes are needed.

## Glossary

- **Bug_Condition (C)**: The API response for `generate-workflow` (mode: create/refine) contains `requiredCredentials` for at least one OAuth provider but omits `credentialStatuses` (undefined or empty array)
- **Property (P)**: For every `CredentialRequirement` in `requiredCredentials`, a matching entry exists in `credentialStatuses` with `status: 'resolved_connected'` when `satisfied === true`, or `status: 'required_missing'` when `satisfied === false`
- **Preservation**: All non-OAuth credential handling, the `requiredCredentials` / `missingCredentials` arrays, the `discoveredCredentials` field, and the Google live-fallback check must remain unchanged
- **`credentialStatuses`**: Array of `{ nodeId: string, credentialId: string, status: 'resolved_connected' | 'required_missing' }` — the shape already consumed by `filterStillBlockingOAuth()` and `filterCredentialQuestionsForStep()`
- **`vaultKey`**: The normalized provider identifier stored on `CredentialRequirement` (e.g. `'google'`, `'linkedin'`, `'notion'`). Used as `credentialId` in `credentialStatuses` after normalization
- **`satisfied`**: Boolean on `CredentialRequirement` — set to `true` by `discoverNodeCredentials()` when `checkVaultForCredential()` finds a valid token in the provider's vault table
- **`filterStillBlockingOAuth()`**: Frontend function in `wizard-oauth-credentials.ts` that gates the "Continue To Inputs" button; calls `statusShowsConnected()` which checks `credentialStatuses` for `resolved_connected`

## Bug Details

### Bug Condition

The bug manifests when `generate-workflow.ts` builds its JSON response. The pipeline result (`AiPipelineOutput`) carries `requiredCredentials: CredentialRequirement[]` where each entry has `satisfied: boolean` already populated by vault queries inside `discoverNodeCredentials()`. The response handler maps these to string arrays for `requiredCredentials` and `missingCredentials` but never constructs `credentialStatuses`, so the field is absent from the response body.

**Formal Specification:**
```
FUNCTION isBugCondition(response)
  INPUT: response — JSON body returned by POST /api/generate-workflow
  OUTPUT: boolean

  RETURN response.requiredCredentials.length > 0
         AND (response.credentialStatuses IS undefined
              OR response.credentialStatuses.length === 0)
END FUNCTION
```

### Examples

- LinkedIn workflow: `requiredCredentials = ['linkedin']`, `credentialStatuses = undefined` → `filterStillBlockingOAuth()` returns `[linkedinRow]` → "Action required" shown even when `linkedin_oauth_tokens` has a valid token
- Notion workflow: `requiredCredentials = ['notion']`, `credentialStatuses = undefined` → same outcome for `notion_oauth_tokens`
- Google workflow: `requiredCredentials = ['google']`, `credentialStatuses = undefined` → partially masked by the `googleOAuthConnectedLive` live-check fallback, but the status-based path is still broken
- No-credential workflow: `requiredCredentials = []` → bug condition does not hold; Credentials step is skipped normally

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `requiredCredentials` string array in the response must remain (UI reads it to decide whether to show the Credentials step)
- `missingCredentials` string array in the response must remain
- `discoveredCredentials` full-object array in the response must remain (used by `oauthRequirementCandidates()`)
- Google `googleOAuthConnectedLive` live-check in the wizard must remain as a secondary fallback
- Credential discovery failure is non-blocking — pipeline still returns the workflow with empty arrays
- `AiPipelineOutput` type in `ai-first-pipeline.ts` does not need to change; the mapping happens in the API handler

**Scope:**
All inputs that do NOT involve OAuth credential discovery (workflows with no credential requirements, non-OAuth credentials, API key credentials) must be completely unaffected. This includes:
- Workflows with zero `requiredCredentials`
- Non-OAuth credential types (`api_key`, `webhook`, `basic_auth`)
- The `mode: analyze` path in `generate-workflow.ts` (returns early before pipeline runs)

## Hypothesized Root Cause

The `generate-workflow.ts` response handler was written before `credentialStatuses` was introduced as a concept. The pipeline already does the vault work — `discoverNodeCredentials()` calls `checkVaultForCredential()` which queries `google_oauth_tokens`, `linkedin_oauth_tokens`, etc. and sets `satisfied`. The handler just never converts that into the `credentialStatuses` shape the frontend expects.

1. **Missing mapping step**: `result.requiredCredentials` (with `satisfied` flags) is mapped to a flat string array but never to `{ nodeId, credentialId, status }` objects
2. **No `credentialStatuses` key in response**: The field is simply absent from the `res.json({...})` call
3. **Frontend already handles it**: `applyUnifiedWizardFromGenerateUpdate()` already reads `update.credentialStatuses` and passes it to `setPendingWorkflowData` — it just receives `undefined`

## Correctness Properties

Property 1: Bug Condition — credentialStatuses Populated from Vault

_For any_ `generate-workflow` response where `requiredCredentials` is non-empty, the fixed endpoint SHALL return a `credentialStatuses` array where each entry corresponds to a node/credential pair from `requiredCredentials`, with `status: 'resolved_connected'` when the vault table contains a valid token for that provider and user, and `status: 'required_missing'` otherwise.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Non-Buggy Inputs Unchanged

_For any_ `generate-workflow` response where `requiredCredentials` is empty, or where the credential type is not `oauth`, the fixed endpoint SHALL produce the same response shape as the original endpoint, with `credentialStatuses` either absent or an empty array, and all other fields (`requiredCredentials`, `missingCredentials`, `discoveredCredentials`, `fieldOwnershipMap`, `stageTrace`) identical to what the original would return.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Vault Table Reference

| Provider `vaultKey` | Vault Table | Token Validity Check |
|---|---|---|
| `google` | `google_oauth_tokens` | `access_token` exists AND (`expires_at` > now+5min OR `refresh_token` exists) |
| `linkedin` | `linkedin_oauth_tokens` | same pattern |
| `notion` | `notion_oauth_tokens` | `access_token` exists |
| `twitter` | `twitter_oauth_tokens` | `access_token` exists AND (`expires_at` > now+5min OR `refresh_token` exists) |
| `zoho` | `zoho_oauth_tokens` | `access_token` exists AND (`expires_at` > now+5min OR `refresh_token` exists) |
| all others | `user_credentials` (via `CredentialResolver.checkVault`) | already handled by existing `satisfied` flag |

> The `satisfied` flag on each `CredentialRequirement` is already set correctly by `discoverNodeCredentials()` using `checkVaultForCredential()`. The fix does not re-query the vault — it simply reads `satisfied` and maps it to the status string.

### credentialId Normalization

`vaultKey` values from `CredentialRequirement` are already normalized by `CredentialResolver` (e.g. Gmail nodes produce `vaultKey: 'google'`, not `'gmail'`). The mapping function must apply the same normalization that `wizard-oauth-credentials.ts` uses:

```
FUNCTION normalizeCredentialId(vaultKey)
  IF vaultKey === 'gmail' THEN RETURN 'google'
  RETURN vaultKey.toLowerCase().trim()
END FUNCTION
```

This ensures `statusShowsConnected()` in the frontend can match entries by `credentialId`.

### credentialStatuses Array Shape

```typescript
type CredentialStatusEntry = {
  nodeId: string;       // from CredentialRequirement.nodeIds[i]
  credentialId: string; // normalizeCredentialId(req.vaultKey)
  status: 'resolved_connected' | 'required_missing';
};
```

One entry is emitted per `(nodeId, credentialId)` pair. A single `CredentialRequirement` with `nodeIds: ['node_1', 'node_2']` produces two entries.

### Changes Required

**File: `worker/src/api/generate-workflow.ts`**

**Function**: the `res.json({...})` call in the `mode: refine / no-mode` branch

**Specific Change**: Add a `credentialStatuses` field built from `result.requiredCredentials`:

```typescript
// After pipeline.run() succeeds, before res.json():
const credentialStatuses = result.requiredCredentials.flatMap((req) => {
  const credentialId = (req.vaultKey || req.provider || '').toLowerCase().trim()
    .replace(/^gmail$/, 'google'); // normalize gmail → google
  const status = req.satisfied ? 'resolved_connected' : 'required_missing';
  const nodeIds = Array.isArray(req.nodeIds) && req.nodeIds.length > 0
    ? req.nodeIds
    : ['unknown'];
  return nodeIds.map((nodeId) => ({ nodeId, credentialId, status }));
});
```

Then include it in the response:

```typescript
res.json({
  success: true,
  phase: 'ready',
  workflow: result.workflow,
  validationIssues: result.validationIssues,
  comprehensiveQuestions: (() => { ... })(),
  requiredCredentials: result.requiredCredentials.map((c) => c.vaultKey || c.displayName || c.provider),
  missingCredentials: result.missingCredentials.map((c) => c.vaultKey || c.displayName || c.provider),
  discoveredCredentials: result.missingCredentials,
  credentialStatuses,          // ← NEW
  fieldOwnershipMap: result.fieldOwnershipMap,
  stageTrace: result.stageTrace,
  correlationId,
});
```

No changes to `AiFirstPipeline`, `AiPipelineOutput`, or any frontend file.

## Testing Strategy

### Validation Approach

Two-phase: first run exploratory tests against the unfixed code to confirm the bug condition and observe the empty `credentialStatuses`, then run fix-checking and preservation tests against the fixed code.

### Exploratory Bug Condition Checking

**Goal**: Confirm that the unfixed endpoint returns `credentialStatuses: undefined` even when `requiredCredentials` is non-empty, and that `filterStillBlockingOAuth()` therefore blocks connected credentials.

**Test Plan**: Call `generate-workflow` with a prompt that produces a LinkedIn or Notion node. Assert that the response body lacks `credentialStatuses`. Then feed the response into `filterStillBlockingOAuth()` with a mock `credentialStatuses: undefined` and assert it returns the credential as blocking.

**Test Cases**:
1. **LinkedIn workflow — missing credentialStatuses**: POST generate-workflow with LinkedIn prompt, assert `response.credentialStatuses === undefined` (will pass on unfixed code, confirming the bug)
2. **filterStillBlockingOAuth with empty statuses**: Call `filterStillBlockingOAuth([linkedinRow], undefined, false)`, assert result length > 0 (will pass on unfixed code)
3. **Notion workflow — missing credentialStatuses**: Same as (1) for Notion
4. **Google workflow — partial masking**: Assert that Google is only unblocked via `googleOAuthConnectedLive`, not via `credentialStatuses`

**Expected Counterexamples**:
- `response.credentialStatuses` is `undefined` or absent for all OAuth-requiring workflows
- `filterStillBlockingOAuth` returns non-empty array for connected providers when `credentialStatuses` is empty

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed endpoint returns a correctly populated `credentialStatuses` array.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(originalResponse(request)) DO
  response := generateWorkflow_fixed(request)
  ASSERT response.credentialStatuses IS array
  ASSERT response.credentialStatuses.length > 0
  FOR EACH req IN result.requiredCredentials DO
    ASSERT EXISTS entry IN response.credentialStatuses
      WHERE entry.credentialId === normalizeCredentialId(req.vaultKey)
        AND entry.status === (req.satisfied ? 'resolved_connected' : 'required_missing')
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (no OAuth credentials, or empty `requiredCredentials`), the fixed endpoint produces the same response as the original.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(originalResponse(request)) DO
  original := generateWorkflow_original(request)
  fixed    := generateWorkflow_fixed(request)
  ASSERT original.requiredCredentials  = fixed.requiredCredentials
  ASSERT original.missingCredentials   = fixed.missingCredentials
  ASSERT original.discoveredCredentials = fixed.discoveredCredentials
  ASSERT original.workflow             = fixed.workflow
  ASSERT fixed.credentialStatuses IS ([] OR undefined)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because the input space (workflow prompts → node types → credential types) is large and varied.

**Test Cases**:
1. **No-credential workflow**: Workflow with only `manual_trigger` + `log_output` — assert `credentialStatuses` is empty array and all other fields unchanged
2. **API-key-only workflow**: Workflow requiring only `api_key` type credentials — assert `credentialStatuses` entries have correct status but no OAuth-specific behavior changes
3. **filterStillBlockingOAuth with resolved_connected**: After fix, call with `credentialStatuses: [{ nodeId, credentialId: 'linkedin', status: 'resolved_connected' }]` — assert result is empty (not blocking)
4. **filterStillBlockingOAuth with required_missing**: Call with `status: 'required_missing'` — assert result is non-empty (still blocking)

### Unit Tests

- `buildCredentialStatuses(requiredCredentials)` pure function: given array of `CredentialRequirement`, returns correct `{ nodeId, credentialId, status }[]`
- `normalizeCredentialId('gmail')` returns `'google'`
- Multi-node credential: single `CredentialRequirement` with `nodeIds: ['n1', 'n2']` produces two entries
- `satisfied: true` maps to `'resolved_connected'`; `satisfied: false` maps to `'required_missing'`

### Property-Based Tests

- For any `CredentialRequirement[]` with `satisfied` flags, `buildCredentialStatuses` produces exactly `sum(nodeIds.length)` entries
- For any entry in `credentialStatuses`, `credentialId` is always lowercase and never `'gmail'` (normalized to `'google'`)
- `filterStillBlockingOAuth(candidates, credentialStatuses, false)` returns empty array when every candidate has a matching `resolved_connected` entry

### Integration Tests

- Full wizard flow: generate LinkedIn workflow → assert Credentials step shows "Connected" (not "Action required") when `linkedin_oauth_tokens` has a valid row for the test user
- Full wizard flow: generate Notion workflow with no vault entry → assert Credentials step still shows "Action required"
- Regression: generate Google workflow → assert both `credentialStatuses` path and `googleOAuthConnectedLive` fallback independently resolve the credential
