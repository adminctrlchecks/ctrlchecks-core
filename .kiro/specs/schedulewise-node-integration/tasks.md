# Implementation Plan: ScheduleWise Node Integration

## Overview

Integrate a ScheduleWise node into CtrlChecks following the single-source-of-truth architecture: schema in `node-library.ts`, executor in `execute-workflow.ts`, override in the registry overrides directory, and a React settings panel in the frontend. All 14 correctness properties are covered by property-based tests using fast-check.

## Tasks

- [x] 1. Define TypeScript interfaces for ScheduleWise node
  - [x] 1.1 Export `ScheduleWiseNodeParams` interface from `worker/src/api/execute-workflow.ts`
    - Define all fields: `operation`, `credentialId`, `dateFrom`, `dateTo`, `patientId`, `staffId`, `appointmentId`, `startDateTime`, `endDateTime`, `serviceType`, `notes`, `status`, `limit`, `hardDelete`, `timeoutSec`, `retries`, `outputFormat`, `mockMode`
    - `operation` must be typed as the union `'getSchedules' | 'createAppointment' | 'updateAppointment' | 'deleteAppointment'`
    - _Requirements: 2.13, 8.6_
  - [x] 1.2 Export `ScheduleWiseNodeOutput` interface from `worker/src/api/execute-workflow.ts`
    - Fields: `success` (boolean), `operation` (string), `data` (optional Record), `executionTimeMs` (number), `error` (optional object with `code`, `message`, `httpStatus`)
    - _Requirements: 2.6, 2.7, 7.1, 7.5_

- [x] 2. Add ScheduleWise schema to node-library.ts
  - [x] 2.1 Add `createScheduleWiseNodeSchema()` private method to `worker/src/services/nodes/node-library.ts`
    - Set `type: 'schedulewise'`, `category: 'integration'`, `providers: ['schedulewise']`
    - Declare `operation` in `configSchema.required`
    - Declare all 17 optional fields in `configSchema.optional`: `credentialId`, `dateFrom`, `dateTo`, `patientId`, `staffId`, `appointmentId`, `startDateTime`, `endDateTime`, `serviceType`, `notes`, `status`, `limit`, `hardDelete`, `timeoutSec`, `retries`, `outputFormat`, `mockMode`
    - Set `outputSchema` with `success`, `operation`, `data`, `executionTimeMs`, `error`
    - Populate `aiSelectionCriteria.keywords` with `['schedulewise', 'appointment', 'schedule', 'booking', 'patient', 'calendar']`
    - Add two `commonPatterns`: `getSchedules` and `createAppointment`
    - Add `validationRules` rejecting empty/missing `operation` with a descriptive error message
    - _Requirements: 1.1–1.10_
  - [x] 2.2 Register the schema by calling `this.registerSchema(this.createScheduleWiseNodeSchema())` inside `initializeSchemas()`
    - _Requirements: 1.2_
  - [ ]* 2.3 Write property test for schema optional fields (Property 1)
    - **Property 1: Optional config fields are all present in schema**
    - For each field name in `{credentialId, dateFrom, dateTo, patientId, staffId, appointmentId, startDateTime, endDateTime, serviceType, notes, status, limit, hardDelete, timeoutSec, retries, outputFormat, mockMode}`, assert it exists as a key in `schema.configSchema.optional`
    - **Validates: Requirements 1.4**
  - [ ]* 2.4 Write property test for AI selection keywords (Property 14)
    - **Property 14: AI selection keywords are all present in schema**
    - For each keyword in `{schedulewise, appointment, schedule, booking, patient, calendar}`, assert it appears in `schema.aiSelectionCriteria.keywords`
    - **Validates: Requirements 1.7**

- [x] 3. Implement the ScheduleWise executor in execute-workflow.ts
  - [x] 3.1 Add helper function `buildScheduleWiseMockResponse(params, startTime)` in `worker/src/api/execute-workflow.ts`
    - `getSchedules` → return synthetic `data.schedules` array with at least one appointment object
    - `createAppointment` → return synthetic `data.appointment` with a generated `id`
    - `updateAppointment` → return synthetic `data.appointment` reflecting input fields
    - `deleteAppointment` → return `{ success: true, data: { deletedId: appointmentId } }`
    - All mock responses must include `success`, `operation`, `data`, `executionTimeMs`
    - _Requirements: 8.1–8.5_
  - [x] 3.2 Add helper function `executeScheduleWiseRequest(params, credential, nodeId, startTime)` in `worker/src/api/execute-workflow.ts`
    - Resolve `apiUrl` from `credential.api_url` or default to `https://api.schedulewise.com/v1`
    - Select auth header: prefer `Authorization: Bearer {access_token}` when present, else `X-Api-Key: {api_key}`
    - Build correct HTTP method and URL per operation:
      - `getSchedules` → `GET {apiUrl}/appointments` with query params `dateFrom`, `dateTo`, `patientId`, `staffId`, `limit`
      - `createAppointment` → `POST {apiUrl}/appointments` with JSON body
      - `updateAppointment` → `PUT {apiUrl}/appointments/{appointmentId}` with JSON body
      - `deleteAppointment` → `DELETE {apiUrl}/appointments/{appointmentId}` (append `?hardDelete=true` when `hardDelete` is true)
    - Implement timeout via `AbortController` using `timeoutSec` (default 30); return `TIMEOUT` error on abort
    - Implement retry loop: on 5xx or network error, retry up to `retries` times with `delay = 2^(attempt-1) * 1000ms`; log each retry via workflow-logger
    - Parse response JSON; return `PARSE_ERROR` if body is not valid JSON
    - Return `{ success: true, operation, data, executionTimeMs }` on 2xx
    - Return `{ success: false, operation, error: { code: 'HTTP_ERROR', message, httpStatus }, executionTimeMs }` on non-2xx
    - _Requirements: 2.1–2.9, 2.11, 4.2–4.5, 7.2–7.5_
  - [x] 3.3 Add `case 'schedulewise':` block inside `executeNodeLegacy()` in `worker/src/api/execute-workflow.ts`
    - Cast `config` to `ScheduleWiseNodeParams`
    - Validate `operation`; return `INVALID_OPERATION` error for invalid values
    - Short-circuit to `buildScheduleWiseMockResponse` when `mockMode === true`
    - Query Supabase credentials with `workflow_id`, `node_id`, `provider: 'schedulewise'`; return `NO_CREDENTIALS` error if not found
    - Delegate to `executeScheduleWiseRequest`
    - _Requirements: 2.1–2.13, 3.2, 4.1_
  - [ ]* 3.4 Write property test for operation validation (Property 2)
    - **Property 2: Operation validation rejects all non-valid operation strings**
    - Generate arbitrary strings (including empty, whitespace, random) using fast-check `fc.string()`; assert all non-valid values return `{ success: false, error: { code: 'INVALID_OPERATION' } }` with zero HTTP calls
    - **Validates: Requirements 2.13**
  - [ ]* 3.5 Write property test for HTTP method and URL correctness (Property 3)
    - **Property 3: HTTP method and URL correctness per operation**
    - Generate random valid configs per operation, mock `fetch`, assert correct HTTP method and URL path for each of the four operations
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  - [ ]* 3.6 Write property test for auth header selection (Property 4)
    - **Property 4: Auth header selection from credential**
    - Generate random credential objects with varying presence of `api_key` and `access_token`; assert `Authorization: Bearer` is used when `access_token` is present, else `X-Api-Key`
    - **Validates: Requirements 2.5, 4.2, 4.3**
  - [ ]* 3.7 Write property test for 2xx success output shape (Property 5)
    - **Property 5: 2xx responses produce success output with required fields**
    - Generate random 2xx status codes (200–299) and response bodies; assert output contains `{ success: true, operation, data, executionTimeMs }` where `executionTimeMs >= 0`
    - **Validates: Requirements 2.6, 2.11, 7.5**
  - [ ]* 3.8 Write property test for non-2xx error output shape (Property 6)
    - **Property 6: Non-2xx responses produce structured error output**
    - Generate random non-2xx status codes (400–599); assert output contains `{ success: false, operation, error: { code, message, httpStatus }, executionTimeMs }` where `error.httpStatus` matches the HTTP status and `executionTimeMs >= 0`
    - **Validates: Requirements 2.7, 2.11, 7.1, 7.5**
  - [ ]* 3.9 Write property test for retry count (Property 7)
    - **Property 7: Retry count matches configuration**
    - Generate random `retries` values (1–5) with an always-failing mock; assert total HTTP call count equals `retries + 1`
    - **Validates: Requirements 2.9**
  - [ ]* 3.10 Write property test for mock mode (Property 8)
    - **Property 8: Mock mode returns schema-conformant output without HTTP calls**
    - Generate random operation configs with `mockMode: true`; assert zero HTTP calls and output contains `success`, `operation`, `data`, `executionTimeMs`
    - **Validates: Requirements 2.10, 8.1, 8.2, 8.3, 8.4, 8.5**
  - [ ]* 3.11 Write property test for apiUrl from credential (Property 13)
    - **Property 13: apiUrl from credential is used as base URL**
    - Generate random `api_url` values in credential; assert all HTTP requests use that value as the base URL prefix; assert default `https://api.schedulewise.com/v1` is used when `api_url` is absent
    - **Validates: Requirements 4.4, 4.5**

- [x] 4. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create the ScheduleWise registry override
  - [x] 5.1 Create `worker/src/core/registry/overrides/schedulewise.ts`
    - Export function `overrideScheduleWise(def: UnifiedNodeDefinition, schema: NodeSchema): UnifiedNodeDefinition`
    - Spread `def`, add `tags: [...(def.tags || []), 'integration', 'scheduling', 'healthcare', 'api']`
    - Delegate execution via `executeViaLegacyExecutor({ context, schema })`
    - Do NOT set `isBranching` or `outgoingPorts` (node is standard linear)
    - _Requirements: 3.3, 3.7_
  - [x] 5.2 Register the override in `worker/src/core/registry/unified-node-registry-overrides.ts`
    - Import `overrideScheduleWise` from `'./overrides/schedulewise'`
    - Add `schedulewise: overrideScheduleWise` to the `overridesByType` map
    - _Requirements: 3.4_

- [x] 6. Implement the ScheduleWiseSettings React component
  - [x] 6.1 Create `ctrl_checks/src/components/workflow/ScheduleWiseSettings.tsx`
    - Accept props: `config: Partial<ScheduleWiseNodeParams>`, `onConfigChange: (config: Partial<ScheduleWiseNodeParams>) => void`, `nodeId: string`, `workflowId: string`
    - Render credential selector dropdown as the first field (lists saved credentials with `provider: 'schedulewise'`)
    - Render operation dropdown with four options: `Get Schedules`, `Create Appointment`, `Update Appointment`, `Delete Appointment`
    - Conditionally render fields per operation:
      - `getSchedules`: `dateFrom`, `dateTo`, `patientId`, `staffId`, `limit`
      - `createAppointment`: `startDateTime`, `endDateTime`, `patientId`, `staffId`, `serviceType`, `notes`
      - `updateAppointment`: `appointmentId`, `startDateTime`, `endDateTime`, `staffId`, `status`, `notes`
      - `deleteAppointment`: `appointmentId`, `hardDelete`
    - Activate expression autocomplete (show available workflow variables) when a field value begins with `{{`
    - Display inline validation error beneath any required field that is empty on save attempt
    - Render an "Advanced" collapsible section containing `timeoutSec`, `retries`, `outputFormat`, `mockMode`
    - _Requirements: 5.1–5.9, 5.11_
  - [ ]* 6.2 Write property test for operation-specific field visibility (Property 11)
    - **Property 11: Operation-specific fields are rendered exclusively per operation**
    - Generate random operation values, render `ScheduleWiseSettings`, assert only the fields defined for that operation are visible and fields for other operations are not rendered
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 7. Integrate ScheduleWiseSettings into PropertiesPanel
  - [x] 7.1 Modify `ctrl_checks/src/components/workflow/PropertiesPanel.tsx`
    - Import `ScheduleWiseSettings` from `'./ScheduleWiseSettings'`
    - Add a branch for `selectedNode.data.type === 'schedulewise'` in the settings rendering section that renders `<ScheduleWiseSettings />`
    - _Requirements: 5.11_
  - [ ]* 7.2 Write property test for template expression resolution (Property 9)
    - **Property 9: Template expressions are resolved before executor receives config**
    - Generate random template strings (e.g., `{{$json.patientId}}`) in config fields; assert the value received by the `case 'schedulewise':` block is the resolved value, not the template string
    - **Validates: Requirements 3.6**
  - [ ]* 7.3 Write property test for credential secrets not in node config (Property 10)
    - **Property 10: Credential secrets are never stored in node.data.config**
    - Generate random node configs; assert `data.config` does not contain keys `api_key`, `access_token`, or `apiKey` — only `credentialId` is permitted
    - **Validates: Requirements 6.3**

- [x] 8. Add Mock badge to WorkflowNode
  - [x] 8.1 Modify `ctrl_checks/src/components/workflow/WorkflowNode.tsx`
    - Render a visible "Mock" badge when `data.config?.mockMode === true`
    - Badge must not render when `mockMode` is `false`, `undefined`, or absent
    - _Requirements: 5.10_
  - [ ]* 8.2 Write property test for mock badge visibility (Property 12)
    - **Property 12: Mock badge visibility matches mockMode config**
    - Generate random `mockMode` boolean values, render `WorkflowNode` with a ScheduleWise node, assert badge is visible if and only if `mockMode === true`
    - **Validates: Requirements 5.10**

- [ ] 9. Write unit tests for all components
  - [ ]* 9.1 Write unit tests for node-library schema
    - `getSchema('schedulewise')` returns correct `type`, `category`, `providers`, required fields
    - `unifiedNodeRegistry.has('schedulewise')` returns `true` after registration
    - Override tags include `['integration', 'scheduling', 'healthcare', 'api']`
    - _Requirements: 1.1–1.10, 3.1, 3.7_
  - [ ]* 9.2 Write unit tests for executor edge cases
    - Credential preference: when both `api_key` and `access_token` are present, `Authorization: Bearer` is used
    - Default API URL: when `api_url` is absent from credential, default URL is used
    - `NO_CREDENTIALS` error: executor returns correct error when credential lookup returns null
    - `PARSE_ERROR`: executor returns correct error when API returns non-JSON body
    - `TIMEOUT`: executor returns correct error when request exceeds `timeoutSec`
    - _Requirements: 2.8, 2.12, 4.3, 4.5, 7.4_
  - [ ]* 9.3 Write unit tests for ScheduleWiseSettings panel
    - Credential selector renders as the first field
    - Operation dropdown has exactly four options
    - Advanced section contains `timeoutSec`, `retries`, `outputFormat`, `mockMode`
    - _Requirements: 5.1, 5.6, 5.9_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations per property
- Each property test is tagged: `Feature: schedulewise-node-integration, Property {N}: {property_text}`
- The ScheduleWise node is a standard non-branching node — do NOT set `isBranching` or custom `outgoingPorts` in the override
- Credential secrets (`api_key`, `access_token`) must never appear in `node.data.config`; only `credentialId` is stored
- Template resolution (`{{ }}` expressions) is handled automatically by `universal-template-resolver` before the executor receives config — the executor always receives resolved values
- All edge wiring is handled automatically by `unified-graph-orchestrator`; no manual edge construction is needed
