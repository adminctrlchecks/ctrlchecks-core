# Implementation Plan: Salesforce Node Integration

## Overview

Implement the Salesforce CRM node end-to-end following the permanent core architecture rules. All node behavior lives in the unified registry; execution flows through `dynamic-node-executor.ts`; credentials are resolved via the vault. Tasks are ordered by dependency: DB migration → token manager → executor → node definition → registry/connector registration → OAuth routes → tests.

## Tasks

- [x] 1. Create the Supabase DB migration for `salesforce_oauth_tokens`
  - Create `supabase/migrations/20240101000000_salesforce_oauth_tokens.sql`
  - Define the table with columns: `id`, `user_id` (FK → `auth.users`), `access_token`, `refresh_token`, `instance_url`, `issued_at`, `expires_at`, `scope`, `created_at`, `updated_at`
  - Add `UNIQUE (user_id)` constraint so upsert works correctly
  - Enable RLS and add policy: `auth.uid() = user_id` for ALL operations
  - Add index `idx_salesforce_oauth_tokens_user_id` on `user_id`
  - _Requirements: 1.3, 1.6, 2.2_

- [x] 2. Implement `salesforce-token-manager.ts`
  - [x] 2.1 Create `worker/src/services/salesforce/salesforce-token-manager.ts`
    - Define `SalesforceToken` interface with all fields from the design (`userId`, `accessToken`, `refreshToken`, `instanceUrl`, `issuedAt`, `expiresAt`, `scope`)
    - Implement `SalesforceTokenManager` class with `getToken`, `refreshToken`, and `upsertToken` methods
    - `getToken`: query `salesforce_oauth_tokens` by `user_id`; if `expires_at - NOW() < 5 min` call `refreshToken`; return `null` if no record or refresh fails
    - `refreshToken`: POST to `{instanceUrl}/services/oauth2/token` with `grant_type=refresh_token`; on success update DB record; on failure log at ERROR with `userId` and return `null`
    - `upsertToken`: INSERT … ON CONFLICT (user_id) DO UPDATE for all token fields
    - Export singleton `salesforceTokenManager`
    - _Requirements: 1.3, 1.6, 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property test — Property 1: Token upsert round-trip
    - File: `worker/src/services/salesforce/__tests__/salesforce-token-manager.property.test.ts`
    - Tag: `// Feature: salesforce-node-integration, Property 1: Token upsert persists all required fields`
    - Use `fast-check` to generate arbitrary valid token field values; call `upsertToken` then `getToken`; assert all fields match exactly
    - Mock Supabase client; run minimum 100 iterations
    - **Property 1: Token upsert persists all required fields**
    - **Validates: Requirements 1.3, 2.2**

  - [ ]* 2.3 Write property test — Property 2: Token isolation by user_id
    - Same file as 2.2
    - Tag: `// Feature: salesforce-node-integration, Property 2: Token isolation by user_id`
    - Generate pairs of distinct UUIDs A and B; upsert token for A; assert `getToken(B)` returns `null`
    - **Property 2: Token isolation by user_id**
    - **Validates: Requirements 1.6**

  - [ ]* 2.4 Write property test — Property 3: Auto-refresh triggers within 5-minute window
    - Same file as 2.2
    - Tag: `// Feature: salesforce-node-integration, Property 3: Token auto-refresh triggers within 5-minute window`
    - Generate tokens with `expires_at` offsets both inside and outside the 5-minute window; assert refresh endpoint is called only when within the window
    - Mock `fetch` to capture calls to the Salesforce token endpoint
    - **Property 3: Token auto-refresh triggers within 5-minute window**
    - **Validates: Requirements 2.1**

  - [ ]* 2.5 Write unit tests for `salesforce-token-manager.ts`
    - File: `worker/src/services/salesforce/__tests__/salesforce-token-manager.test.ts`
    - Test `getToken` returns `null` when no DB record exists
    - Test `refreshToken` returns `null` and logs at ERROR on HTTP failure
    - Test `upsertToken` performs ON CONFLICT UPDATE (call twice with same userId, assert second value wins)
    - Test `getToken` returns `null` and logs when refresh fails
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Implement `salesforce-executor.ts`
  - [x] 3.1 Create `worker/src/executors/salesforce-executor.ts`
    - Define `SalesforceExecutorConfig` and `SalesforceExecutorContext` interfaces per the design
    - Define `SalesforceApiError` class extending `Error` with `statusCode`, `errorCode`, `duplicateId?`
    - Implement `RESOURCE_TO_SOBJECT` map (account→Account, contact→Contact, lead→Lead, opportunity→Opportunity, case→Case, task→Task, note→Note, campaign→Campaign, event→Event, contract→Contract, product→Product2, user→User, custom→`{customObject}`)
    - Implement `OPERATION_TO_HTTP` map per the design's operation table
    - Implement `executeSalesforceNode(context)`:
      - Call `salesforceTokenManager.getToken(userId)`; throw reconnect error if `null`
      - Validate required fields per resource+operation (recordId, lastName, company, subject, name, stageName, closeDate, title, parentId, startDateTime, endDateTime, accountId, contractTerm, soqlQuery, soslQuery, customObject) — throw validation error before any fetch
      - Build base URL from `token.instanceUrl + '/services/data/' + apiVersion`
      - Assemble request body by merging explicit schema fields + `additionalFields`
      - Execute the correct HTTP method + URL; parse Salesforce error body on non-2xx and throw `SalesforceApiError`
      - For `DUPLICATE_VALUE` errorCode, extract duplicate record ID from error message
      - Log all errors at ERROR level with `{ userId, resource, operation, statusCode }`
      - Implement pagination loop for search/query/sosl: when `returnAll=true` follow `nextRecordsUrl` until `done=true`; when `returnAll=false` return first page up to `limit`
      - Return `{ id, success, record }` for single-record ops; `{ records, totalSize, done }` for multi-record ops
    - _Requirements: 5.1–5.7, 6.1–6.6, 7.1–7.7, 8.1–8.6, 9.1–9.6, 10.1–10.5, 11.1–11.6, 12.1–12.6, 13.1–13.7, 14.1–14.5, 15.1–15.4, 17.2–17.4, 18.1–18.5_

  - [ ]* 3.2 Write property test — Property 4: Resource+operation routes to correct endpoint
    - File: `worker/src/executors/__tests__/salesforce-executor.property.test.ts`
    - Tag: `// Feature: salesforce-node-integration, Property 4: Resource+operation routes to correct Salesforce REST endpoint`
    - Use `fast-check` to generate all valid resource+operation combinations with random field values; mock `fetch`; assert correct HTTP method and URL pattern for each combination
    - For `custom` resource, assert `customObject` value appears verbatim in the URL path
    - **Property 4: Resource+operation routes to correct Salesforce REST endpoint**
    - **Validates: Requirements 5.1–5.6, 6.1–6.5, 7.1–7.6, 8.1–8.5, 9.1–9.5, 10.1–10.5, 11.1–11.5, 12.1–12.5, 13.1–13.6, 15.1–15.4**

  - [ ]* 3.3 Write property test — Property 5: Missing required fields produce validation errors before any API call
    - Same file as 3.2
    - Tag: `// Feature: salesforce-node-integration, Property 5: Missing required fields produce validation errors before any API call`
    - Generate resource+operation combinations with randomly omitted required fields; assert a validation error is returned and `fetch` is never called
    - **Property 5: Missing required fields produce validation errors before any API call**
    - **Validates: Requirements 5.7, 6.6, 7.7, 8.6, 9.6, 11.6, 12.6, 13.7, 14.4, 14.5**

  - [ ]* 3.4 Write property test — Property 6: Pagination exhausts all pages when returnAll is true
    - Same file as 3.2
    - Tag: `// Feature: salesforce-node-integration, Property 6: Pagination exhausts all pages when returnAll is true`
    - Generate arbitrary multi-page response sequences (each page has `nextRecordsUrl` and `done: false`, final page has `done: true`); assert `returnAll=true` returns union of all records; assert `returnAll=false` returns only first page up to `limit`
    - **Property 6: Pagination exhausts all pages when returnAll is true**
    - **Validates: Requirements 14.1, 14.3**

  - [ ]* 3.5 Write property test — Property 7: Salesforce API errors are parsed into structured error objects
    - Same file as 3.2
    - Tag: `// Feature: salesforce-node-integration, Property 7: Salesforce API errors are parsed into structured error objects`
    - Generate arbitrary HTTP error status codes (400–599) and error body shapes; assert thrown error has non-empty `message`, numeric `statusCode` matching HTTP status, and non-empty `errorCode`
    - **Property 7: Salesforce API errors are parsed into structured error objects**
    - **Validates: Requirements 18.1**

  - [ ]* 3.6 Write unit tests for `salesforce-executor.ts`
    - File: `worker/src/executors/__tests__/salesforce-executor.test.ts`
    - Test each resource+operation combination with mocked `fetch` (one test per resource, covering create/get/update/delete/search)
    - Test `DUPLICATE_VALUE` error parsing includes duplicate record ID
    - Test validation errors for all missing-required-field scenarios
    - Test reconnect error thrown when `getToken` returns `null`
    - Test `returnAll=true` follows pagination; `returnAll=false` stops at first page
    - _Requirements: 5.1–5.7, 6.1–6.6, 7.1–7.7, 8.1–8.6, 9.1–9.6, 10.1–10.5, 11.1–11.6, 12.1–12.6, 13.1–13.7, 14.1–14.5, 18.1–18.5_

- [x] 4. Checkpoint — Ensure all token manager and executor tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `salesforce-node.ts` (UnifiedNodeDefinition)
  - [x] 5.1 Create `worker/src/nodes/definitions/salesforce-node.ts`
    - Import `NodeDefinition` from `../../core/types/node-definition`
    - Import `executeSalesforceNode` from `../../executors/salesforce-executor`
    - Define `salesforceNodeDefinition: NodeDefinition` with:
      - `type: 'salesforce'`, `label: 'Salesforce'`, `category: 'crm'`
      - Full `inputSchema` with `resource`, `operation`, `recordId`, `soqlQuery`, `soslQuery`, `customObject`, `lastName`, `company`, `subject`, `name`, `stageName`, `closeDate`, `title`, `parentId`, `startDateTime`, `endDateTime`, `accountId`, `contractTerm`, `returnAll`, `limit`, `apiVersion`, `additionalFields` — each with `ui.visibleIf` and `ui.requiredIf` metadata per the design
      - `credentialSchema` with `requirements: [{ provider: 'salesforce', type: 'oauth', category: 'salesforce', vaultKey: 'salesforce', required: true, displayName: 'Salesforce OAuth', scopes: ['api', 'refresh_token'] }]` and `credentialFields: []`
      - `defaultConfig` factory returning `{ resource: 'account', operation: 'get', recordId: '', soqlQuery: '', soslQuery: '', customObject: '', returnAll: false, limit: 50, apiVersion: 'v59.0', additionalFields: null }` plus all resource-specific fields defaulting to `''`
      - `validateConfig` function covering all resource+operation required-field rules from the design
      - `execute` function that resolves config templates via `universal-template-resolver.ts` then delegates to `executeSalesforceNode` — no inline Salesforce API logic
      - `outputSchema` with `default` port describing `{ id, success, record, records, totalSize, done, error }`
    - Export `salesforceNodeDefinition`
    - _Requirements: 3.1, 3.2, 3.4, 16.1–16.5, 17.1, 19.1, 19.5, 20.2_

- [x] 6. Register the Salesforce node in `index.ts` and the connector registry
  - [x] 6.1 Update `worker/src/nodes/definitions/index.ts`
    - Add `import { salesforceNodeDefinition } from './salesforce-node';`
    - Add `nodeDefinitionRegistry.register(salesforceNodeDefinition);` in the CRM nodes section of `registerAllNodeDefinitions()`
    - No other changes — do not modify any existing registrations
    - _Requirements: 3.2, 3.3, 20.3, 20.4_

  - [x] 6.2 Update `worker/src/services/connectors/connector-registry.ts`
    - Add the Salesforce connector entry inside `registerAllConnectors()` per the design's connector registry entry (id, provider, service, capabilities, keywords, credentialContract, nodeTypes, description)
    - No other changes to the file
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Implement `oauth-salesforce.ts` (OAuth authorize + callback handlers)
  - [x] 7.1 Create `worker/src/api/oauth-salesforce.ts`
    - Implement `salesforceAuthorizeHandler` (GET `/api/oauth/salesforce/authorize`):
      - Read `SALESFORCE_CLIENT_ID`, `SALESFORCE_REDIRECT_URI` from env; return 500 if missing
      - Generate CSRF state as `Buffer.from(\`\${Date.now()}-\${Math.random()}\`).toString('base64')`
      - Build Salesforce authorization URL with `response_type=code`, `client_id`, `redirect_uri`, `scope=api refresh_token`, `state`
      - Redirect to the authorization URL
    - Implement `salesforceCallbackHandler` (POST `/api/oauth/salesforce/callback`):
      - Authenticate user via Bearer token in Authorization header; return 401 if missing/invalid
      - Validate `code` and `redirect_uri` in request body; return 400 if missing
      - Read `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` from env; return 500 if missing
      - POST to `https://login.salesforce.com/services/oauth2/token` with `grant_type=authorization_code`
      - On success: call `salesforceTokenManager.upsertToken(userId, tokenData)` and return `{ success: true }`
      - On token exchange error: return descriptive error with status code
      - On user denial (error=access_denied in query): return cancellation message
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 7.2 Write unit tests for `oauth-salesforce.ts`
    - File: `worker/src/api/__tests__/oauth-salesforce.test.ts`
    - Test authorize handler builds correct redirect URL with all required params
    - Test callback handler exchanges code and calls `upsertToken`
    - Test callback handler returns 401 when no auth header
    - Test callback handler returns 400 when `code` is missing
    - Test callback handler returns cancellation message on `access_denied`
    - Test callback handler returns error when token exchange fails
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Smoke tests and architecture compliance verification
  - [x] 9.1 Write smoke tests
    - File: `worker/src/nodes/definitions/__tests__/salesforce-node.smoke.test.ts`
    - Assert `unifiedNodeRegistry.get('salesforce')` (or `nodeDefinitionRegistry`) returns a complete definition with `inputSchema`, `outputSchema`, `credentialSchema`, `defaultConfig`, `validateConfig`, `execute`
    - Assert `connectorRegistry.getConnectorByNodeType('salesforce')` returns the Salesforce connector with correct `id`, `provider`, `nodeTypes`
    - Assert `inputSchema` contains `resource` and `operation` with `ui.options` arrays
    - Assert `credentialSchema.requirements[0].vaultKey === 'salesforce'`
    - Assert `credentialSchema.credentialFields` is empty (no credential fields in inputSchema)
    - _Requirements: 3.1, 3.3, 4.4, 16.1, 19.1, 19.5_

  - [ ]* 9.2 Write architecture compliance test
    - Same file as 9.1
    - Use `grepSearch` equivalent (read source files) to assert no `if (node.type === 'salesforce')` or `switch (node.type)` exists outside `salesforce-executor.ts` and `salesforce-node.ts`
    - Assert `salesforce-node.ts` `execute` function does not contain inline `fetch` calls (all API logic is in the executor)
    - _Requirements: 20.1, 20.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` with minimum 100 iterations per property
- Unit tests validate specific examples and edge cases
- The executor (`salesforce-executor.ts`) is the only file that may contain Salesforce REST API `fetch` calls
- The node definition (`salesforce-node.ts`) `execute` function must only resolve templates and delegate — no inline API logic
- No `if (node.type === 'salesforce')` branches anywhere outside the registry and executor
