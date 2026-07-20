# Requirements Document

## Introduction

This document defines the requirements for a fully functional Salesforce node integration in the Control X AI workflow automation platform. The Salesforce node enables users to interact with all major Salesforce CRM objects and operations directly from their workflows — covering Accounts, Contacts, Leads, Opportunities, Cases, Tasks, Notes, Campaigns, and more. Authentication is handled via Salesforce OAuth 2.0 (Connected App flow). The node is registered as the single source of truth in the unified node registry (`unified-node-registry.ts`), follows the permanent core architecture rules (no hardcoded node logic outside the registry), and integrates into the connectors panel. The executor, credential schema, input/output schemas, default configs, and frontend UI field rendering are all driven by the registry definition.

---

## Glossary

- **Salesforce_Node**: The workflow node of type `salesforce` registered in the unified node registry that executes Salesforce CRM operations.
- **Salesforce_Executor**: The backend TypeScript module (`salesforce-executor.ts`) that implements all Salesforce API calls and is invoked by the registry's `execute()` function.
- **Salesforce_OAuth_Flow**: The Salesforce OAuth 2.0 Authorization Code flow used to obtain and refresh access tokens for a Connected App.
- **Connected_App**: A Salesforce configuration that grants a third-party application (Control X) OAuth access to a Salesforce org.
- **sObject**: A Salesforce standard or custom object (e.g., Account, Contact, Lead, Opportunity, Case, Task, Note, Campaign, CampaignMember, Contract, Product2, Pricebook2, PricebookEntry, Quote, Attachment, ContentVersion, User, Event).
- **SOQL**: Salesforce Object Query Language — a SQL-like query language for querying Salesforce data.
- **SOSL**: Salesforce Object Search Language — a full-text search language across multiple sObjects.
- **REST_API**: The Salesforce REST API (`/services/data/vXX.0/`) used for all CRUD and query operations.
- **Token_Store**: The Supabase table `salesforce_oauth_tokens` where per-user Salesforce OAuth tokens are persisted.
- **Token_Manager**: The backend service (`salesforce-token-manager.ts`) responsible for storing, retrieving, and refreshing Salesforce OAuth tokens.
- **Instance_URL**: The Salesforce org-specific base URL returned during OAuth (e.g., `https://myorg.salesforce.com`) used as the base for all REST API calls.
- **Unified_Node_Registry**: The singleton `UnifiedNodeRegistry` in `unified-node-registry.ts` — the single source of truth for all node definitions, schemas, and execution logic.
- **Connector_Registry**: The `ConnectorRegistry` in `connector-registry.ts` that powers the connectors panel in the UI.
- **Node_Definition**: The `NodeDefinition` object exported from `salesforce-node.ts` in `worker/src/nodes/definitions/` that declares the node's schema, operations, and validation.
- **Dynamic_Node_Executor**: The `dynamic-node-executor.ts` execution engine that fetches node definitions from the registry and delegates execution.
- **Operation**: A specific action performed on an sObject (e.g., `create`, `get`, `update`, `delete`, `search`, `query`).
- **Resource**: The Salesforce sObject type being operated on (e.g., `account`, `contact`, `lead`, `opportunity`, `case`, `task`, `note`, `campaign`).
- **API_Version**: The Salesforce REST API version used for all calls (default: `v59.0`, configurable).

---

## Requirements

### Requirement 1: Salesforce OAuth 2.0 Authentication

**User Story:** As a platform user, I want to connect my Salesforce org via OAuth 2.0, so that the platform can securely access my Salesforce data without storing my username and password.

#### Acceptance Criteria

1. WHEN a user initiates Salesforce OAuth, THE Salesforce_OAuth_Flow SHALL redirect the user to the Salesforce authorization endpoint (`/services/oauth2/authorize`) with `response_type=code`, `client_id`, `redirect_uri`, and `scope=api refresh_token`.
2. WHEN the user grants authorization, THE Salesforce_OAuth_Flow SHALL exchange the authorization code for an access token and refresh token by calling the Salesforce token endpoint (`/services/oauth2/token`) with `grant_type=authorization_code`.
3. WHEN the token exchange succeeds, THE Token_Manager SHALL upsert a record in the `salesforce_oauth_tokens` table containing: `user_id`, `access_token`, `refresh_token`, `instance_url`, `issued_at`, `expires_at`, and `scope`.
4. IF the user denies authorization or closes the OAuth dialog, THEN THE Salesforce_OAuth_Flow SHALL return the user to the Account Settings page and display a cancellation message.
5. IF the token exchange returns an error, THEN THE Salesforce_OAuth_Flow SHALL display a descriptive error message and offer the user the option to retry.
6. THE Token_Manager SHALL store tokens scoped to the authenticated platform `user_id` so that each user's Salesforce credentials are isolated from other users.

---

### Requirement 2: Salesforce Token Auto-Refresh

**User Story:** As a platform user with a connected Salesforce org, I want my access token to be refreshed automatically before it expires, so that my workflows continue running without interruption.

#### Acceptance Criteria

1. WHILE a Salesforce token's `expires_at` is within 5 minutes of the current time, THE Token_Manager SHALL attempt to refresh the token using `grant_type=refresh_token` against the Salesforce token endpoint before returning it to a caller.
2. WHEN a token is successfully refreshed, THE Token_Manager SHALL update the `access_token`, `issued_at`, and `expires_at` fields in the `salesforce_oauth_tokens` table for the corresponding `user_id`.
3. IF a token refresh attempt fails, THEN THE Token_Manager SHALL return a null token and log the failure with the associated `user_id`.
4. IF a token refresh fails and a workflow node requires the token, THEN THE Salesforce_Node SHALL return an execution error with a message instructing the user to reconnect their Salesforce account.

---

### Requirement 3: Salesforce Node Registration in Unified Node Registry

**User Story:** As a platform developer, I want the Salesforce node to be registered as the single source of truth in the unified node registry, so that all workflows, AI generation, validation, and execution automatically use the correct schema and behavior.

#### Acceptance Criteria

1. THE Unified_Node_Registry SHALL contain a node definition with `type: 'salesforce'` that includes a complete `inputSchema`, `outputSchema`, `credentialSchema`, `defaultConfig`, `validateConfig`, and `execute` function.
2. THE Salesforce_Node definition SHALL be loaded from `worker/src/nodes/definitions/salesforce-node.ts` via the existing `from-node-library.ts` import mechanism, consistent with all other node definitions.
3. THE Unified_Node_Registry SHALL expose the Salesforce node under the type key `'salesforce'` so that `unifiedNodeRegistry.get('salesforce')` returns the full definition.
4. THE Salesforce_Node `execute` function in the registry SHALL delegate to the `Salesforce_Executor` without containing inline Salesforce API logic, consistent with the permanent core architecture rule.
5. WHEN the `Dynamic_Node_Executor` processes a node of type `salesforce`, THE Dynamic_Node_Executor SHALL fetch the definition from the registry and call `nodeDef.execute(context)` without any hardcoded `if (node.type === 'salesforce')` branches.

---

### Requirement 4: Salesforce Connector Registration

**User Story:** As a platform user, I want to see Salesforce in the connectors panel with its capabilities and credential requirements, so that I can discover and connect it from the UI.

#### Acceptance Criteria

1. THE Connector_Registry SHALL contain a connector entry with `id: 'salesforce'`, `provider: 'salesforce'`, `service: 'crm'`, and `nodeTypes: ['salesforce']`.
2. THE Salesforce connector entry SHALL declare capabilities including `'crm.read'`, `'crm.write'`, `'crm.search'`, `'salesforce.account'`, `'salesforce.contact'`, `'salesforce.lead'`, `'salesforce.opportunity'`, `'salesforce.case'`, and `'salesforce.soql'`.
3. THE Salesforce connector entry SHALL declare a `credentialContract` with `provider: 'salesforce'`, `type: 'oauth'`, `scopes: ['api', 'refresh_token']`, `vaultKey: 'salesforce'`, and `displayName: 'Salesforce OAuth'`.
4. THE Connector_Registry SHALL return the Salesforce connector when `getConnectorByNodeType('salesforce')` is called.

---

### Requirement 5: Account Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Account records from my workflows, so that I can automate account management tasks.

#### Acceptance Criteria

1. WHEN `resource` is `'account'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Account` with the provided field values and return the created record's `id` and `success` flag.
2. WHEN `resource` is `'account'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET `/services/data/vXX.0/sobjects/Account/{recordId}` and return the full Account record.
3. WHEN `resource` is `'account'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH `/services/data/vXX.0/sobjects/Account/{recordId}` with the provided field values and return a success confirmation.
4. WHEN `resource` is `'account'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE `/services/data/vXX.0/sobjects/Account/{recordId}` and return a success confirmation.
5. WHEN `resource` is `'account'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Account object using the provided `searchTerm` and `searchFields` and return a list of matching records.
6. WHEN `resource` is `'account'` and `operation` is `'query'`, THE Salesforce_Executor SHALL execute the provided raw SOQL string against the Salesforce REST API and return all matching records.
7. IF `operation` is `'get'`, `'update'`, or `'delete'` and `recordId` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `recordId` is required for this operation.

---

### Requirement 6: Contact Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Contact records, so that I can automate contact management and outreach workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'contact'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Contact` with at minimum `LastName` and return the created record's `id`.
2. WHEN `resource` is `'contact'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Contact record by `recordId` and return the full record.
3. WHEN `resource` is `'contact'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Contact record by `recordId` with the provided fields.
4. WHEN `resource` is `'contact'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Contact record by `recordId`.
5. WHEN `resource` is `'contact'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Contact object and return matching records.
6. IF `operation` is `'create'` and `lastName` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `lastName` is required for Contact creation.

---

### Requirement 7: Lead Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, search, and convert Salesforce Lead records, so that I can automate lead capture and qualification workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'lead'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Lead` with at minimum `LastName` and `Company` and return the created record's `id`.
2. WHEN `resource` is `'lead'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Lead record by `recordId` and return the full record.
3. WHEN `resource` is `'lead'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Lead record by `recordId` with the provided fields.
4. WHEN `resource` is `'lead'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Lead record by `recordId`.
5. WHEN `resource` is `'lead'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Lead object and return matching records.
6. WHEN `resource` is `'lead'` and `operation` is `'convert'`, THE Salesforce_Executor SHALL call the Salesforce Lead Convert REST endpoint and return the resulting Account, Contact, and Opportunity IDs.
7. IF `operation` is `'create'` and either `lastName` or `company` is not provided, THEN THE Salesforce_Executor SHALL return a validation error listing the missing required fields.

---

### Requirement 8: Opportunity Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Opportunity records, so that I can automate sales pipeline management workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'opportunity'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Opportunity` with at minimum `Name`, `StageName`, and `CloseDate` and return the created record's `id`.
2. WHEN `resource` is `'opportunity'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Opportunity record by `recordId` and return the full record.
3. WHEN `resource` is `'opportunity'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Opportunity record by `recordId` with the provided fields.
4. WHEN `resource` is `'opportunity'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Opportunity record by `recordId`.
5. WHEN `resource` is `'opportunity'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Opportunity object and return matching records.
6. IF `operation` is `'create'` and any of `name`, `stageName`, or `closeDate` is not provided, THEN THE Salesforce_Executor SHALL return a validation error listing the missing required fields.

---

### Requirement 9: Case Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Case records, so that I can automate customer support workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'case'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Case` with at minimum `Subject` and return the created record's `id`.
2. WHEN `resource` is `'case'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Case record by `recordId` and return the full record.
3. WHEN `resource` is `'case'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Case record by `recordId` with the provided fields.
4. WHEN `resource` is `'case'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Case record by `recordId`.
5. WHEN `resource` is `'case'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Case object and return matching records.
6. IF `operation` is `'create'` and `subject` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `subject` is required for Case creation.

---

### Requirement 10: Task Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Task records, so that I can automate activity and follow-up workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'task'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Task` with at minimum `Subject` and return the created record's `id`.
2. WHEN `resource` is `'task'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Task record by `recordId` and return the full record.
3. WHEN `resource` is `'task'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Task record by `recordId` with the provided fields.
4. WHEN `resource` is `'task'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Task record by `recordId`.
5. WHEN `resource` is `'task'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Task object and return matching records.

---

### Requirement 11: Note Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Note records, so that I can attach contextual notes to CRM records in my workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'note'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Note` with at minimum `Title` and `ParentId` and return the created record's `id`.
2. WHEN `resource` is `'note'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Note record by `recordId` and return the full record.
3. WHEN `resource` is `'note'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Note record by `recordId` with the provided fields.
4. WHEN `resource` is `'note'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Note record by `recordId`.
5. WHEN `resource` is `'note'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Note object and return matching records.
6. IF `operation` is `'create'` and either `title` or `parentId` is not provided, THEN THE Salesforce_Executor SHALL return a validation error listing the missing required fields.

---

### Requirement 12: Campaign Object Operations

**User Story:** As a workflow builder, I want to create, read, update, delete, and search Salesforce Campaign records, so that I can automate marketing campaign management workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'campaign'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to `/services/data/vXX.0/sobjects/Campaign` with at minimum `Name` and return the created record's `id`.
2. WHEN `resource` is `'campaign'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the Campaign record by `recordId` and return the full record.
3. WHEN `resource` is `'campaign'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the Campaign record by `recordId` with the provided fields.
4. WHEN `resource` is `'campaign'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the Campaign record by `recordId`.
5. WHEN `resource` is `'campaign'` and `operation` is `'search'`, THE Salesforce_Executor SHALL execute a SOQL query against the Campaign object and return matching records.
6. IF `operation` is `'create'` and `name` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `name` is required for Campaign creation.

---

### Requirement 13: Generic sObject and Custom Object Operations

**User Story:** As a workflow builder, I want to perform CRUD operations on any Salesforce standard or custom sObject by specifying the object API name, so that I can work with objects beyond the pre-defined list without needing a new node type.

#### Acceptance Criteria

1. WHEN `resource` is `'custom'` and `customObject` is provided, THE Salesforce_Executor SHALL use the value of `customObject` as the sObject API name in all REST API calls (e.g., `/services/data/vXX.0/sobjects/{customObject}`).
2. WHEN `resource` is `'custom'` and `operation` is `'create'`, THE Salesforce_Executor SHALL POST to the custom sObject endpoint with the provided `additionalFields` JSON and return the created record's `id`.
3. WHEN `resource` is `'custom'` and `operation` is `'get'`, THE Salesforce_Executor SHALL GET the custom sObject record by `recordId`.
4. WHEN `resource` is `'custom'` and `operation` is `'update'`, THE Salesforce_Executor SHALL PATCH the custom sObject record by `recordId` with the provided `additionalFields`.
5. WHEN `resource` is `'custom'` and `operation` is `'delete'`, THE Salesforce_Executor SHALL DELETE the custom sObject record by `recordId`.
6. WHEN `resource` is `'custom'` and `operation` is `'query'`, THE Salesforce_Executor SHALL execute the provided raw SOQL string and return all matching records.
7. IF `resource` is `'custom'` and `customObject` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `customObject` is required when using the custom resource type.

---

### Requirement 14: SOQL Query and SOSL Search Operations

**User Story:** As a workflow builder, I want to execute raw SOQL queries and SOSL searches against my Salesforce org, so that I can retrieve complex, cross-object data sets in my workflows.

#### Acceptance Criteria

1. WHEN `operation` is `'query'` and a `soqlQuery` string is provided, THE Salesforce_Executor SHALL GET `/services/data/vXX.0/query?q={encodedSOQL}` and return all records, automatically following `nextRecordsUrl` pagination until all results are retrieved.
2. WHEN `operation` is `'sosl'` and a `soslQuery` string is provided, THE Salesforce_Executor SHALL GET `/services/data/vXX.0/search?q={encodedSOSL}` and return all matching records across all sObjects.
3. THE Salesforce_Executor SHALL support a `returnAll` boolean field: WHEN `returnAll` is `true`, THE Salesforce_Executor SHALL follow all pagination links; WHEN `returnAll` is `false`, THE Salesforce_Executor SHALL return only the first page of results up to the `limit` value.
4. IF `operation` is `'query'` and `soqlQuery` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `soqlQuery` is required.
5. IF `operation` is `'sosl'` and `soslQuery` is not provided, THEN THE Salesforce_Executor SHALL return a validation error stating that `soslQuery` is required.

---

### Requirement 15: Additional sObject Support (Event, Contract, Product2, User)

**User Story:** As a workflow builder, I want to perform CRUD operations on Salesforce Event, Contract, Product2, and User objects, so that I can automate a broader range of CRM workflows.

#### Acceptance Criteria

1. WHEN `resource` is `'event'`, THE Salesforce_Executor SHALL support `create`, `get`, `update`, `delete`, and `search` operations against the Salesforce Event sObject, requiring at minimum `Subject`, `StartDateTime`, and `EndDateTime` for create.
2. WHEN `resource` is `'contract'`, THE Salesforce_Executor SHALL support `create`, `get`, `update`, `delete`, and `search` operations against the Salesforce Contract sObject, requiring at minimum `AccountId` and `ContractTerm` for create.
3. WHEN `resource` is `'product'`, THE Salesforce_Executor SHALL support `create`, `get`, `update`, `delete`, and `search` operations against the Salesforce Product2 sObject, requiring at minimum `Name` for create.
4. WHEN `resource` is `'user'`, THE Salesforce_Executor SHALL support `get`, `update`, and `search` operations against the Salesforce User sObject (create and delete are restricted by Salesforce permissions and SHALL return a descriptive error if the org does not permit them).

---

### Requirement 16: Input Schema and Dynamic Field Rendering

**User Story:** As a workflow builder using the node UI, I want the Salesforce node's input fields to render dynamically based on the selected resource and operation, so that I only see the fields relevant to what I am trying to do.

#### Acceptance Criteria

1. THE Salesforce_Node `inputSchema` SHALL declare `resource` and `operation` as required fields with `ui.options` arrays listing all valid values, enabling the frontend to render them as dropdowns.
2. THE Salesforce_Node `inputSchema` SHALL use `ui.visibleIf` metadata on each field to declare the `resource` and `operation` combinations under which that field is visible in the UI.
3. THE Salesforce_Node `inputSchema` SHALL use `ui.requiredIf` metadata on each field to declare the `resource` and `operation` combinations under which that field is required.
4. THE Salesforce_Node `defaultConfig` factory SHALL return sensible defaults: `resource: 'account'`, `operation: 'get'`, `returnAll: false`, `limit: 50`, `apiVersion: 'v59.0'`.
5. THE Salesforce_Node `inputSchema` SHALL include an `additionalFields` field of type `json` that accepts a free-form JSON object for passing any Salesforce field not explicitly declared in the schema, applicable to all create and update operations.

---

### Requirement 17: Output Schema

**User Story:** As a workflow builder, I want the Salesforce node to produce a consistent, documented output structure, so that downstream nodes can reliably reference Salesforce data using template expressions.

#### Acceptance Criteria

1. THE Salesforce_Node `outputSchema` SHALL declare a `default` output port with a schema describing the response structure: `{ id, success, records, totalSize, done }`.
2. WHEN an operation returns a single record (get, create, update, delete), THE Salesforce_Executor SHALL return `{ id, success, record }` where `record` is the full sObject JSON.
3. WHEN an operation returns multiple records (search, query, sosl), THE Salesforce_Executor SHALL return `{ records, totalSize, done }` where `records` is an array of sObject JSON objects.
4. WHEN an operation fails, THE Salesforce_Executor SHALL return `{ success: false, error: { message, statusCode, errorCode } }` with the Salesforce API error details.
5. THE Salesforce_Node output SHALL be accessible to downstream nodes via standard template expressions (e.g., `{{$json.records}}`, `{{$json.id}}`).

---

### Requirement 18: Error Handling and API Error Propagation

**User Story:** As a workflow builder, I want Salesforce API errors to be surfaced clearly in the workflow execution log, so that I can diagnose and fix issues without inspecting raw HTTP responses.

#### Acceptance Criteria

1. IF the Salesforce REST API returns a 4xx or 5xx HTTP status, THEN THE Salesforce_Executor SHALL parse the Salesforce error response body and throw a structured error containing `message`, `statusCode`, and `errorCode`.
2. IF the Salesforce access token is expired and the refresh attempt fails, THEN THE Salesforce_Executor SHALL throw an error with the message `'Salesforce token expired. Please reconnect your Salesforce account.'`.
3. IF a required field is missing at execution time (after schema validation), THEN THE Salesforce_Executor SHALL throw a validation error listing all missing fields before making any API call.
4. IF the Salesforce REST API returns a `DUPLICATE_VALUE` error, THEN THE Salesforce_Executor SHALL include the duplicate record ID in the error message when available.
5. THE Salesforce_Executor SHALL log all API errors at the `ERROR` level using the platform logger, including the `user_id`, `resource`, `operation`, and HTTP status code.

---

### Requirement 19: Credential Schema and Vault Integration

**User Story:** As a platform developer, I want the Salesforce node's credential requirements to be declared in the registry so that the credential preflight check and vault lookup work automatically for all Salesforce workflows.

#### Acceptance Criteria

1. THE Salesforce_Node `credentialSchema` SHALL declare a single requirement with `provider: 'salesforce'`, `type: 'oauth'`, `vaultKey: 'salesforce'`, and `required: true`.
2. WHEN the `Dynamic_Node_Executor` processes a Salesforce node, THE Dynamic_Node_Executor SHALL call `unifiedNodeRegistry.getRequiredCredentials('salesforce')` to discover the credential requirement without any hardcoded credential logic.
3. WHEN the credential preflight check runs for a workflow containing a Salesforce node, THE credential preflight check SHALL look up the `salesforce` vault key in the Token_Store for the executing `user_id`.
4. IF no valid Salesforce token is found in the Token_Store for the `user_id`, THEN THE credential preflight check SHALL halt workflow execution and return a credential-missing error prompting the user to connect their Salesforce account.
5. THE Salesforce_Node `inputSchema` SHALL NOT contain fields for `accessToken`, `clientId`, or `clientSecret` — all credential fields SHALL be resolved exclusively from the Token_Store via the `credentialSchema`.

---

### Requirement 20: Architecture Compliance — No Hardcoded Node Logic

**User Story:** As a platform architect, I want the Salesforce node to comply with the permanent core architecture rules, so that the codebase remains maintainable and all node behavior is driven by the registry.

#### Acceptance Criteria

1. THE Salesforce_Node SHALL NOT introduce any `if (node.type === 'salesforce')` or `switch (node.type)` branches in `workflow-builder.ts`, `execute-workflow.ts`, `dynamic-node-executor.ts`, or any file outside `unified-node-registry.ts` and `salesforce-executor.ts`.
2. THE Salesforce_Node `execute` function in the registry SHALL resolve all configuration templates using the platform's `universal-template-resolver.ts` before passing config to the `Salesforce_Executor`, consistent with all other registry-registered nodes.
3. THE Salesforce_Node SHALL be added to `worker/src/nodes/definitions/index.ts` so it is automatically imported and registered when the registry initializes, without requiring any manual registry call.
4. THE Unified_Node_Registry `initializeFromNodeLibrary` method SHALL pick up the Salesforce node definition automatically via the existing node library import chain, with no special-case initialization code.
5. WHEN `unifiedNodeRegistry.getAllTypes()` is called, the result SHALL include `'salesforce'`.
