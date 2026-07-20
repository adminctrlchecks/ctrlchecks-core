# Requirements Document

## Introduction

This document defines the requirements for integrating a ScheduleWise node into CtrlChecks. The ScheduleWise node acts as a connector to the ScheduleWise REST API, enabling workflows to retrieve, create, update, and delete appointments. The integration covers the full stack: a backend TypeScript executor registered in the unified node registry, and a React frontend settings panel with dynamic form fields, credential selection, and expression autocomplete. The node follows the existing CtrlChecks architecture — all behavior is defined in `node-library.ts` and registered through `unified-node-registry.ts` as the single source of truth, with no hardcoded node logic outside the registry.

---

## Glossary

- **ScheduleWise_Node**: The CtrlChecks workflow node of type `schedulewise` that connects to the ScheduleWise REST API.
- **ScheduleWise_API**: The external REST API at `https://api.schedulewise.com/v1/` that manages appointments and schedules.
- **Executor**: The async TypeScript function that constructs and sends HTTP requests to the ScheduleWise_API and returns a structured output.
- **Node_Registry**: The `unified-node-registry.ts` file — the single source of truth for all node definitions, schemas, and execution behavior.
- **Node_Library**: The `node-library.ts` file where node schemas are defined and registered into the Node_Registry.
- **Override**: A file in `worker/src/core/registry/overrides/` that customises a node's `UnifiedNodeDefinition` beyond what the schema auto-generates.
- **Credential_Set**: A saved record in the CtrlChecks credentials store containing `apiUrl` and `apiKey` (or `accessToken`) for authenticating with the ScheduleWise_API.
- **Settings_Panel**: The React component rendered in the workflow canvas properties panel when a ScheduleWise_Node is selected.
- **Operation**: One of four actions the ScheduleWise_Node can perform — `getSchedules`, `createAppointment`, `updateAppointment`, `deleteAppointment`.
- **Expression**: A template string using `{{ }}` syntax (e.g., `{{$json.patientId}}`) that is resolved at workflow runtime by the universal template resolver.
- **Mock_Mode**: A configuration flag (`mockMode: true`) that causes the Executor to return synthetic data without calling the ScheduleWise_API, used for testing.
- **Execution_Log**: A structured record of node execution metadata including operation, duration, HTTP status, and error details.

---

## Requirements

### Requirement 1: Node Schema Registration

**User Story:** As a workflow builder, I want the ScheduleWise node to appear in the node library with a complete schema, so that I can add it to workflows and the system can validate, auto-configure, and AI-generate it correctly.

#### Acceptance Criteria

1. THE Node_Library SHALL define a `createScheduleWiseNodeSchema()` method that returns a `NodeSchema` with `type: 'schedulewise'`.
2. THE Node_Library SHALL register the ScheduleWise_Node schema by calling `this.registerSchema()` inside `initializeSchemas()`.
3. THE Node_Library SHALL declare `operation` as a required field in `configSchema.required`.
4. THE Node_Library SHALL define the following optional config fields: `credentialId`, `dateFrom`, `dateTo`, `patientId`, `staffId`, `appointmentId`, `startDateTime`, `endDateTime`, `serviceType`, `notes`, `status`, `limit`, `hardDelete`, `timeoutSec`, `retries`, `outputFormat`, `mockMode`.
5. THE Node_Library SHALL set `category: 'integration'` on the ScheduleWise_Node schema.
6. THE Node_Library SHALL define `outputSchema` with fields: `success` (boolean), `operation` (string), `data` (object), `executionTimeMs` (number), `error` (object with `code`, `message`, `httpStatus`).
7. THE Node_Library SHALL populate `aiSelectionCriteria` with keywords including `schedulewise`, `appointment`, `schedule`, `booking`, `patient`, `calendar`.
8. THE Node_Library SHALL define at least two `commonPatterns`: one for `getSchedules` and one for `createAppointment`.
9. THE Node_Library SHALL define `validationRules` that reject an empty or missing `operation` field with a descriptive error message.
10. THE Node_Library SHALL set `providers: ['schedulewise']` so the credential auto-detection system can identify required credentials.

---

### Requirement 2: Backend Executor

**User Story:** As a workflow engine, I want the ScheduleWise node to execute HTTP requests against the ScheduleWise API and return structured output, so that downstream nodes receive consistent, typed data.

#### Acceptance Criteria

1. WHEN the Executor receives `operation: 'getSchedules'`, THE Executor SHALL send a `GET` request to `{apiUrl}/appointments` with query parameters derived from `dateFrom`, `dateTo`, `patientId`, `staffId`, and `limit`.
2. WHEN the Executor receives `operation: 'createAppointment'`, THE Executor SHALL send a `POST` request to `{apiUrl}/appointments` with a JSON body containing `startDateTime`, `endDateTime`, `patientId`, `staffId`, `serviceType`, and `notes`.
3. WHEN the Executor receives `operation: 'updateAppointment'`, THE Executor SHALL send a `PUT` request to `{apiUrl}/appointments/{appointmentId}` with a JSON body containing the fields provided among `startDateTime`, `endDateTime`, `staffId`, `status`, and `notes`.
4. WHEN the Executor receives `operation: 'deleteAppointment'`, THE Executor SHALL send a `DELETE` request to `{apiUrl}/appointments/{appointmentId}`, and WHEN `hardDelete` is `true`, THE Executor SHALL append the query parameter `hardDelete=true`.
5. THE Executor SHALL attach an `Authorization` header using the value `Bearer {accessToken}` or `X-Api-Key: {apiKey}` depending on which credential field is present in the Credential_Set.
6. WHEN the ScheduleWise_API returns a 2xx response, THE Executor SHALL return `{ success: true, operation, data, executionTimeMs }`.
7. WHEN the ScheduleWise_API returns a non-2xx response, THE Executor SHALL return `{ success: false, operation, error: { code, message, httpStatus }, executionTimeMs }`.
8. WHEN the HTTP request exceeds `timeoutSec` seconds (default 30), THE Executor SHALL abort the request and return `{ success: false, error: { code: 'TIMEOUT', message: 'Request timed out', httpStatus: 408 }, executionTimeMs }`.
9. WHEN `retries` is greater than 0 and the request fails with a 5xx status or network error, THE Executor SHALL retry the request up to `retries` times with exponential backoff before returning the final error.
10. WHEN `mockMode` is `true`, THE Executor SHALL return synthetic data matching the expected output schema without sending any HTTP request to the ScheduleWise_API.
11. THE Executor SHALL record `executionTimeMs` as the elapsed wall-clock time in milliseconds from request start to response receipt.
12. IF the Credential_Set for the node is not found, THEN THE Executor SHALL return `{ success: false, error: { code: 'NO_CREDENTIALS', message: 'ScheduleWise credentials not configured', httpStatus: 401 } }`.
13. IF `operation` is not one of the four valid values, THEN THE Executor SHALL return `{ success: false, error: { code: 'INVALID_OPERATION', message: 'Unknown operation', httpStatus: 400 } }`.

---

### Requirement 3: Node Registry Integration

**User Story:** As a platform architect, I want the ScheduleWise node to be registered in the unified node registry following the single-source-of-truth pattern, so that execution, validation, AI generation, and template resolution all work automatically without hardcoded logic.

#### Acceptance Criteria

1. THE Node_Registry SHALL auto-register the ScheduleWise_Node by converting the schema from Node_Library via `convertNodeLibrarySchemaToUnified()`.
2. THE Executor logic SHALL be added as a `case 'schedulewise':` block inside `executeNodeLegacy()` in `execute-workflow.ts`.
3. THE Override file `worker/src/core/registry/overrides/schedulewise.ts` SHALL export a function `overrideScheduleWise` that sets field ownership, fill modes, and tags on the `UnifiedNodeDefinition`.
4. THE Override SHALL be registered in `unified-node-registry-overrides.ts` under the key `'schedulewise'`.
5. THE Node_Registry SHALL NOT contain any `if (node.type === 'schedulewise')` or `switch` logic outside the registry and override files.
6. WHEN the universal template resolver processes a ScheduleWise_Node config, THE Node_Registry SHALL resolve all `{{ }}` expressions in fields such as `patientId`, `appointmentId`, `startDateTime`, and `endDateTime` before the Executor receives them.
7. THE Override SHALL tag the ScheduleWise_Node with `['integration', 'scheduling', 'healthcare', 'api']`.

---

### Requirement 4: Credential Management

**User Story:** As a workflow builder, I want to save and reference ScheduleWise API credentials securely, so that the node can authenticate without exposing secrets in the workflow JSON.

#### Acceptance Criteria

1. THE Executor SHALL retrieve the Credential_Set by querying the credentials store using `workflowId`, `nodeId`, and `provider: 'schedulewise'`.
2. THE Credential_Set SHALL support two authentication modes: `apiKey` (stored as `api_key`) and `accessToken` (stored as `access_token`).
3. WHEN both `apiKey` and `accessToken` are present in the Credential_Set, THE Executor SHALL prefer `accessToken` for the `Authorization: Bearer` header.
4. THE Credential_Set SHALL store `apiUrl` to allow pointing the node at different ScheduleWise environments (e.g., staging vs. production).
5. IF `apiUrl` is absent from the Credential_Set, THEN THE Executor SHALL default to `https://api.schedulewise.com/v1`.
6. THE Settings_Panel SHALL render a credential selector dropdown that lists all saved Credential_Sets with `provider: 'schedulewise'`.

---

### Requirement 5: Frontend Settings Panel

**User Story:** As a workflow builder, I want a settings panel for the ScheduleWise node that shows only the fields relevant to the selected operation, so that I can configure the node quickly without being overwhelmed by irrelevant inputs.

#### Acceptance Criteria

1. THE Settings_Panel SHALL render an operation dropdown with four options: `Get Schedules`, `Create Appointment`, `Update Appointment`, `Delete Appointment`.
2. WHEN `operation` is `getSchedules`, THE Settings_Panel SHALL display fields: `dateFrom`, `dateTo`, `patientId`, `staffId`, `limit`.
3. WHEN `operation` is `createAppointment`, THE Settings_Panel SHALL display fields: `startDateTime`, `endDateTime`, `patientId`, `staffId`, `serviceType`, `notes`.
4. WHEN `operation` is `updateAppointment`, THE Settings_Panel SHALL display fields: `appointmentId`, `startDateTime`, `endDateTime`, `staffId`, `status`, `notes`.
5. WHEN `operation` is `deleteAppointment`, THE Settings_Panel SHALL display fields: `appointmentId`, `hardDelete`.
6. THE Settings_Panel SHALL display a credential selector as the first field, above the operation dropdown.
7. WHEN a field value begins with `{{`, THE Settings_Panel SHALL activate expression autocomplete showing available workflow variables.
8. THE Settings_Panel SHALL display a validation error message inline beneath any required field that is empty when the user attempts to save.
9. THE Settings_Panel SHALL render an "Advanced" collapsible section containing `timeoutSec`, `retries`, `outputFormat`, and `mockMode`.
10. WHEN `mockMode` is toggled on, THE Settings_Panel SHALL display a visible indicator (e.g., a badge labeled "Mock") on the node in the workflow canvas.
11. THE Settings_Panel SHALL be registered in the frontend node type map under the key `'schedulewise'` so the workflow canvas renders it automatically when the node is selected.

---

### Requirement 6: Workflow JSON Representation

**User Story:** As a workflow engine, I want the ScheduleWise node to be stored in workflow JSON with a canonical structure, so that the graph orchestrator, executor, and validator can process it without special-casing.

#### Acceptance Criteria

1. THE ScheduleWise_Node SHALL be stored in workflow JSON with `type: 'schedulewise'` at the node level.
2. THE ScheduleWise_Node SHALL store all user-configured values inside `data.config` following the same structure as all other nodes.
3. THE ScheduleWise_Node SHALL NOT store credential secrets inside `data.config`; only a `credentialId` reference SHALL be stored.
4. WHEN the workflow graph orchestrator processes a workflow containing a ScheduleWise_Node, THE Node_Registry SHALL provide all structural metadata (input schema, output schema, tags) without any hardcoded lookup by node type.
5. THE ScheduleWise_Node output SHALL be accessible to downstream nodes via the standard `{{$json.*}}` expression syntax.

---

### Requirement 7: Error Handling and Execution Logs

**User Story:** As a workflow operator, I want ScheduleWise node failures to produce structured error output and execution logs, so that I can diagnose problems without inspecting raw HTTP responses.

#### Acceptance Criteria

1. WHEN the Executor encounters any error, THE Executor SHALL return a structured error object containing `code`, `message`, and `httpStatus` rather than throwing an unhandled exception.
2. THE Executor SHALL log an Execution_Log entry containing `nodeId`, `operation`, `httpStatus`, `executionTimeMs`, and `error` (if present) to the workflow logger.
3. WHEN `retries` is greater than 0 and a retry attempt is made, THE Executor SHALL log each retry attempt with its attempt number and the error that triggered the retry.
4. IF the ScheduleWise_API returns a response body that is not valid JSON, THEN THE Executor SHALL return `{ success: false, error: { code: 'PARSE_ERROR', message: 'Response body is not valid JSON', httpStatus } }`.
5. THE Executor SHALL include `executionTimeMs` in every response, including error responses, so that performance can be monitored regardless of outcome.

---

### Requirement 8: Testing and Mock Mode

**User Story:** As a developer, I want to test ScheduleWise node workflows without a live ScheduleWise API connection, so that I can validate workflow logic in development and CI environments.

#### Acceptance Criteria

1. WHEN `mockMode` is `true` and `operation` is `getSchedules`, THE Executor SHALL return a synthetic `data.schedules` array containing at least one representative appointment object.
2. WHEN `mockMode` is `true` and `operation` is `createAppointment`, THE Executor SHALL return a synthetic `data.appointment` object with a generated `id` field.
3. WHEN `mockMode` is `true` and `operation` is `updateAppointment`, THE Executor SHALL return a synthetic `data.appointment` object reflecting the input fields.
4. WHEN `mockMode` is `true` and `operation` is `deleteAppointment`, THE Executor SHALL return `{ success: true, data: { deletedId: appointmentId } }`.
5. THE mock responses SHALL conform to the same output schema as live responses so that downstream nodes behave identically in mock and live modes.
6. THE Executor SHALL expose a TypeScript interface `ScheduleWiseNodeParams` that documents all accepted input fields and their types, enabling compile-time safety for callers.
