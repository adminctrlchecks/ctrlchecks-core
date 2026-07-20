# Design Document: Instagram & WhatsApp Full Nodes

## Overview

This design delivers fully functional WhatsApp and Instagram automation nodes for the platform, on par with n8n's coverage. Both nodes are first-class citizens in `unified-node-registry.ts` — the single source of truth — and are executed through the unified graph orchestrator. The implementation adds two new executor service classes (`WhatsAppNode`, `InstagramNode`), extends `social-dispatcher.ts` to route to them, and relies on the existing token managers for credential lifecycle.

Both nodes use the Meta Graph API v18+ and share the same Facebook App credentials (`FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`). No hardcoded `if (node.type === ...)` logic exists outside the registry.

---

## Architecture

```mermaid
flowchart TD
    subgraph Registry ["unified-node-registry.ts (Single Source of Truth)"]
        WA_DEF["whatsapp UnifiedNodeDefinition\n(inputSchema, outputSchema, credentialSchema,\ndefaultConfig, execute, workflowBehavior)"]
        IG_DEF["instagram UnifiedNodeDefinition\n(inputSchema, outputSchema, credentialSchema,\ndefaultConfig, execute, workflowBehavior)"]
        WA_TRIG["whatsapp_trigger UnifiedNodeDefinition"]
        IG_TRIG["instagram_trigger UnifiedNodeDefinition"]
    end

    subgraph Orchestrator ["unified-graph-orchestrator.ts"]
        VALIDATE["validateWorkflow()"]
        INJECT["injectNode()"]
        RECONCILE["reconcileWorkflow()"]
    end

    subgraph Dispatcher ["social-dispatcher.ts"]
        ROUTE["executeSocialNode()\nroutes by config.provider"]
    end

    subgraph Executors ["worker/src/services/social/"]
        WA_EXEC["WhatsAppNode\n(whatsapp-node.ts)"]
        IG_EXEC["InstagramNode\n(instagram-node.ts)"]
    end

    subgraph TokenManagers ["worker/src/shared/"]
        WA_TM["whatsapp-token-manager.ts\ngetWhatsAppAccessToken()"]
        IG_TM["instagram-token-manager.ts\ngetInstagramAccessToken()"]
    end

    subgraph MetaAPI ["Meta Graph API v18+"]
        WA_API["WhatsApp Cloud API\n/{phone_number_id}/messages"]
        IG_API["Instagram Graph API\n/{ig-user-id}/media\n/{ig-user-id}/messages"]
    end

    WA_DEF -->|execute()| ROUTE
    IG_DEF -->|execute()| ROUTE
    ROUTE -->|provider: 'whatsapp'| WA_EXEC
    ROUTE -->|provider: 'instagram'| IG_EXEC
    WA_EXEC --> WA_TM
    IG_EXEC --> IG_TM
    WA_EXEC --> WA_API
    IG_EXEC --> IG_API
    WA_DEF --> VALIDATE
    IG_DEF --> VALIDATE
```

### Key Architectural Decisions

**Registry-first**: All node behavior (schema, defaults, execution delegation) lives in `unified-node-registry.ts`. The executor classes contain only API call logic — no schema definitions, no credential wiring.

**Dispatcher extension**: `social-dispatcher.ts` is extended with `'whatsapp'` and `'instagram'` cases in its provider switch. The `SocialProvider` union type in `types.ts` is widened accordingly. No `if (node.type === ...)` logic is added anywhere.

**Executor pattern**: `WhatsAppNode` and `InstagramNode` follow the same pattern as `FacebookNode` — a class with an `execute(params)` method, an internal API client, and structured error handling. They do not extend each other; they share only the Meta API base URL and error parsing utilities.

**Token managers**: The existing `whatsapp-token-manager.ts` and `instagram-token-manager.ts` are used as-is. Auto-resolution of `phoneNumberId` and `instagramBusinessAccountId` is handled inside the executor classes before making API calls.

**Webhook verification**: Both trigger nodes share a single `verifyMetaWebhookSignature(secret, payload, signature)` utility function that performs HMAC-SHA256 verification using `FACEBOOK_APP_SECRET`.

---

## Components and Interfaces

### 1. Registry Definitions (`unified-node-registry.ts`)

Two action node definitions and two trigger node definitions are registered:

```typescript
// Action nodes
unifiedNodeRegistry.register(whatsappNodeDefinition);   // type: 'whatsapp'
unifiedNodeRegistry.register(instagramNodeDefinition);  // type: 'instagram'

// Trigger nodes
unifiedNodeRegistry.register(whatsappTriggerDefinition);  // type: 'whatsapp_trigger'
unifiedNodeRegistry.register(instagramTriggerDefinition); // type: 'instagram_trigger'
```

Each definition satisfies `UnifiedNodeDefinition`:

| Field | WhatsApp | Instagram |
|---|---|---|
| `type` | `'whatsapp'` | `'instagram'` |
| `category` | `'communication'` | `'communication'` |
| `isBranching` | `false` | `false` |
| `incomingPorts` | `['default']` | `['default']` |
| `outgoingPorts` | `['default']` | `['default']` |
| `credentialSchema.provider` | `'facebook'` | `'facebook'` |
| `credentialSchema.scopes` | `whatsapp_business_messaging, whatsapp_business_management` | `instagram_basic, instagram_content_publish, instagram_manage_messages, pages_show_list` |

Trigger definitions:

| Field | whatsapp_trigger | instagram_trigger |
|---|---|---|
| `category` | `'trigger'` | `'trigger'` |
| `isBranching` | `false` | `false` |
| `incomingPorts` | `[]` | `[]` |
| `outgoingPorts` | `['default']` | `['default']` |

### 2. Social Dispatcher Extension (`social-dispatcher.ts`)

```typescript
// types.ts — widen SocialProvider
export type SocialProvider = 'github' | 'facebook' | 'twitter' | 'linkedin' | 'google' | 'whatsapp' | 'instagram';

// social-dispatcher.ts — extend SocialNodeConfig and switch
export interface SocialNodeConfig {
  provider: SocialProvider;
  operation: string;
  resource?: string;
  [key: string]: any;
}

// In executeSocialNode() switch:
case 'whatsapp': {
  const token = await getWhatsAppAccessToken(supabase, userIdsToTry);
  if (!token) return tokenMissingError('whatsapp');
  return await executeWhatsAppNode(token, supabase, config);
}
case 'instagram': {
  const token = await getInstagramAccessToken(supabase, userIdsToTry);
  if (!token) return tokenMissingError('instagram');
  return await executeInstagramNode(token, supabase, config);
}
```

The dispatcher never inspects `node.type` — it only reads `config.provider`.

### 3. WhatsApp Executor (`worker/src/services/social/whatsapp-node.ts`)

```typescript
export interface WhatsAppNodeParams {
  resource: 'message' | 'contact' | 'conversation' | 'template' | 'campaign' | 'aiAgent';
  operation: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  // ... all fields from inputSchema
}

export interface WhatsAppNodeResult {
  success: boolean;
  resource: string;
  operation: string;
  data: Record<string, any>;
  error: MetaApiError | null;
  meta: { executionTimeMs: number; apiCallCount: number };
}

export class WhatsAppNode {
  constructor(private readonly accessToken: string, private readonly supabase: any) {}
  async execute(params: WhatsAppNodeParams): Promise<WhatsAppNodeResult>;
  private async resolvePhoneNumberId(params: WhatsAppNodeParams): Promise<string>;
  private async resolveBusinessAccountId(params: WhatsAppNodeParams): Promise<string>;
  private callMetaApi(path: string, method: string, body?: object): Promise<any>;
  private parseMetaError(error: any): MetaApiError;
}
```

**Resource/operation routing** inside `WhatsAppNode.execute()` uses a nested switch on `params.resource` then `params.operation`. No `if (node.type === ...)` logic.

### 4. Instagram Executor (`worker/src/services/social/instagram-node.ts`)

```typescript
export interface InstagramNodeParams {
  resource: 'message' | 'media' | 'comment' | 'user' | 'insights' | 'hashtag';
  operation: string;
  instagramBusinessAccountId?: string;
  // ... all fields from inputSchema
}

export interface InstagramNodeResult {
  success: boolean;
  resource: string;
  operation: string;
  data: Record<string, any>;
  error: MetaApiError | null;
  meta: { executionTimeMs: number; apiCallCount: number };
}

export class InstagramNode {
  constructor(private readonly accessToken: string, private readonly supabase: any) {}
  async execute(params: InstagramNodeParams): Promise<InstagramNodeResult>;
  private async resolveIgUserId(params: InstagramNodeParams): Promise<string>;
  private async pollContainerStatus(containerId: string, maxPolls?: number): Promise<string>;
  private callMetaApi(path: string, method: string, body?: object): Promise<any>;
  private parseMetaError(error: any): MetaApiError;
}
```

### 5. Shared Meta Error Type

```typescript
// worker/src/services/social/types.ts (extended)
export interface MetaApiError {
  code: number;
  message: string;
  fbtrace_id?: string;
  userMessage: string; // Human-readable, safe to display
}
```

### 6. Webhook Signature Utility

```typescript
// worker/src/services/social/meta-webhook-verifier.ts
export function verifyMetaWebhookSignature(
  appSecret: string,
  rawBody: Buffer,
  signatureHeader: string // 'sha256=...'
): boolean;
```

Used by both `whatsapp_trigger` and `instagram_trigger` webhook handlers.

---

## Data Models

### WhatsApp Node Input Schema (key fields)

```typescript
{
  resource: 'message' | 'contact' | 'conversation' | 'template' | 'campaign' | 'aiAgent';
  operation: string; // resource-specific
  phoneNumberId?: string;       // auto-resolved if absent
  businessAccountId?: string;   // auto-resolved if absent (WABA ID)
  
  // message.sendText
  to?: string;
  text?: string;
  previewUrl?: boolean;
  
  // message.sendMedia
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  
  // message.sendLocation
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
  
  // message.sendContact
  contacts?: ContactObject[];
  
  // message.sendTemplate / template.*
  templateName?: string;
  language?: string;
  templateComponents?: TemplateComponent[];
  templateCategory?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  
  // message.sendInteractiveButtons
  bodyText?: string;
  headerText?: string;
  footerText?: string;
  buttons?: InteractiveButton[];
  
  // message.sendInteractiveList
  buttonText?: string;
  sections?: ListSection[];
  
  // message.sendInteractiveCTA
  ctaUrl?: { display_text: string; url: string };
  
  // message.markAsRead
  messageId?: string;
  
  // contact.*
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  labels?: string[];
  
  // conversation.*
  conversationId?: string;
  
  // campaign.create
  recipients?: string[];
  
  // aiAgent.*
  // (uses conversationId or phoneNumberId)
  
  // pagination
  limit?: number;
  after?: string;
  returnAll?: boolean;
}
```

### WhatsApp Node Output Schema

```typescript
{
  default: {
    // message send operations
    messageId?: string;
    status?: string;
    
    // template list
    templates?: TemplateObject[];
    
    // conversation list
    conversations?: ConversationObject[];
    
    // campaign summary
    sent?: number;
    failed?: number;
    total?: number;
    
    // raw API response passthrough
    data?: any;
    
    // error (when success: false)
    error?: MetaApiError;
  }
}
```

### Instagram Node Input Schema (key fields)

```typescript
{
  resource: 'message' | 'media' | 'comment' | 'user' | 'insights' | 'hashtag';
  operation: string;
  instagramBusinessAccountId?: string; // auto-resolved if absent
  
  // message.*
  recipientId?: string;
  text?: string;
  attachmentType?: 'image' | 'audio' | 'video';
  attachmentUrl?: string;
  
  // media.createAndPublish
  media_type?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL_ALBUM';
  media_url?: string;
  caption?: string;
  location_id?: string;
  user_tags?: UserTag[];
  product_tags?: ProductTag[];
  carouselItems?: string[]; // array of media URLs for carousel
  
  // comment.*
  mediaId?: string;
  commentId?: string;
  replyText?: string;
  
  // insights.*
  metric?: string;
  period?: 'day' | 'week' | 'days_28' | 'lifetime';
  since?: string;
  until?: string;
  
  // hashtag.*
  hashtagName?: string;
  hashtagId?: string;
  
  // pagination
  limit?: number;
  after?: string;
  returnAll?: boolean;
}
```

### Instagram Node Output Schema

```typescript
{
  default: {
    // user.get
    id?: string;
    username?: string;
    biography?: string;
    followers_count?: number;
    media_count?: number;
    
    // media.createAndPublish
    mediaId?: string;
    permalink?: string;
    
    // comment list
    comments?: CommentObject[];
    
    // insights
    metrics?: InsightMetric[];
    
    // raw API response passthrough
    data?: any;
    
    // error
    error?: MetaApiError;
  }
}
```

### Webhook Trigger Output Schemas

**whatsapp_trigger output** (event: `message.received`):
```typescript
{
  messageId: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'interactive';
  text?: string;
  media?: { id: string; url?: string; mimeType?: string };
  location?: { latitude: number; longitude: number };
  phoneNumberId: string;
  wabaId: string;
}
```

**instagram_trigger output** (event: `message.received`):
```typescript
{
  senderId: string;
  messageId: string;
  text?: string;
  attachments?: Array<{ type: string; payload: any }>;
  timestamp: string;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registry defaultConfig completeness

*For any* call to `unifiedNodeRegistry.getDefaultConfig('whatsapp')` or `unifiedNodeRegistry.getDefaultConfig('instagram')`, the returned object SHALL contain every key declared in the node's `inputSchema`, and each value SHALL be of the correct type.

**Validates: Requirements 1.2, 8.2**

---

### Property 2: WhatsApp message payload shape

*For any* valid combination of `(resource='message', operation, to, phoneNumberId, ...operationFields)`, the API payload constructed by `WhatsAppNode` SHALL contain a `type` field matching the operation's expected message type, and SHALL include all required fields for that type.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

---

### Property 3: Meta API error structure preservation

*For any* Meta Graph API error response containing `error.code`, `error.message`, and `error.fbtrace_id`, the executor SHALL return an error object that includes all three fields without modification, and SHALL NOT include the raw OAuth access token in any field.

**Validates: Requirements 2.10, 9.4, 16.1, 16.2**

---

### Property 4: Campaign recipient coverage

*For any* recipient list of size N passed to `campaign.create`, the returned summary SHALL satisfy `sent_count + failed_count === N`.

**Validates: Requirements 5.5**

---

### Property 5: Non-APPROVED template rejection

*For any* template with a status value that is not `'APPROVED'`, invoking `sendTemplate` or `campaign.create` with that template SHALL return an error and SHALL NOT call the messages API.

**Validates: Requirements 5.7**

---

### Property 6: Webhook HMAC-SHA256 verification

*For any* raw request body and any `FACEBOOK_APP_SECRET`, `verifyMetaWebhookSignature` SHALL return `true` if and only if the `X-Hub-Signature-256` header equals `sha256=HMAC-SHA256(secret, body)`. For any mismatched signature, the function SHALL return `false`.

**Validates: Requirements 7.5, 13.6**

---

### Property 7: Webhook payload field extraction

*For any* valid Meta webhook POST body for WhatsApp or Instagram, the trigger parser SHALL extract and expose all fields specified in the trigger's output schema for the matching event type, with no fields missing or set to `undefined`.

**Validates: Requirements 7.3, 7.4, 13.3, 13.4, 13.5**

---

### Property 8: Instagram video container polling termination

*For any* video/Reels container that never reaches `FINISHED` status, `pollContainerStatus` SHALL stop after exactly 10 polls and return a timeout error. *For any* container that reaches `FINISHED` on poll k ≤ 10, it SHALL return `'FINISHED'` after exactly k polls.

**Validates: Requirements 10.2, 10.8**

---

### Property 9: Instagram carousel item count

*For any* carousel media request with N item URLs, the executor SHALL make exactly N item container creation calls, followed by exactly 1 carousel container creation call, followed by exactly 1 publish call — a total of N+2 API calls.

**Validates: Requirements 10.3**

---

### Property 10: ERROR/EXPIRED container blocks publish

*For any* media container that returns status `'ERROR'` or `'EXPIRED'` during polling, the executor SHALL return a descriptive error and SHALL make zero calls to the `media_publish` endpoint.

**Validates: Requirements 10.7**

---

### Property 11: Dispatcher token-missing error

*For any* `whatsapp` or `instagram` config where the token lookup returns `null`, `executeSocialNode` SHALL return a `SocialServiceResponse` with `success: false` and a `error` string containing a user-facing reconnect instruction.

**Validates: Requirements 14.3**

---

### Property 12: Dispatcher exception containment

*For any* exception thrown by `WhatsAppNode.execute()` or `InstagramNode.execute()`, `executeSocialNode` SHALL catch it and return a `SocialServiceResponse` with `success: false` and the error message — it SHALL NOT propagate the exception to the caller.

**Validates: Requirements 14.5**

---

### Property 13: Validation error completeness

*For any* config object missing k required fields (k ≥ 1), `validateConfig` SHALL return `valid: false` and an `errors` array of length ≥ k, with each missing field named in at least one error string.

**Validates: Requirements 16.3**

---

### Property 14: Workflow structural validity

*For any* valid workflow graph containing one or more `whatsapp` or `instagram` action nodes (or their trigger variants), `unifiedGraphOrchestrator.validateWorkflow(workflow)` SHALL return `{ valid: true, errors: [] }`.

**Validates: Requirements 17.3**

---

## Error Handling

### Meta API Error Codes

| Code | Meaning | User-facing message |
|---|---|---|
| `190` | Invalid/expired token | "Your Facebook/Meta access token has expired. Please reconnect your account." |
| `10` | Permission denied | "Missing permission: {scope}. Please reconnect your account and grant the required permissions." |
| `200`–`299` | Permission error range | "Missing permission: {scope}. Please reconnect your account and grant the required permissions." |
| `131030` | Template not approved | "Template '{name}' is not approved for sending. Current status: {status}." |
| `368` | Temporarily blocked | "Your WhatsApp account has been temporarily blocked. Please try again later." |
| Any other | Generic | "Meta API error {code}: {message}" |

### Token Errors

When `getWhatsAppAccessToken()` or `getInstagramAccessToken()` returns `null`:
- The dispatcher returns immediately with `success: false` and a reconnect message.
- No API calls are made.
- The error is not logged at ERROR level (it is an expected user state).

### Validation Errors

Input validation runs before any API call. All missing/invalid fields are collected and returned in a single error response. The executor never makes partial API calls when validation fails.

### Container Polling Errors (Instagram)

- `ERROR` status: return immediately with `{ success: false, error: { code: -1, message: "Media container failed: {error_message}", userMessage: "..." } }`
- `EXPIRED` status: return immediately with `{ success: false, error: { code: -2, message: "Media container expired before publishing", userMessage: "..." } }`
- Timeout (10 polls): return `{ success: false, error: { code: -3, message: "Media container did not finish processing within 50 seconds", userMessage: "..." } }`

### Security

- Access tokens are never included in error messages, log lines, or returned data objects.
- `FACEBOOK_APP_SECRET` is only used inside `verifyMetaWebhookSignature()` and `refreshWhatsAppToken()` / `refreshInstagramToken()` — never logged or returned.
- The `sanitizeForLogging()` utility from `credential-vault.ts` is used before any structured log entry that might contain config objects.

---

## Testing Strategy

### Unit Tests (example-based)

Located in `worker/src/services/social/__tests__/`:

- `whatsapp-node.test.ts` — one test per operation verifying correct API endpoint, HTTP method, and payload shape. Uses `jest.spyOn(global, 'fetch')` to mock HTTP.
- `instagram-node.test.ts` — same pattern for Instagram operations.
- `social-dispatcher-whatsapp-instagram.test.ts` — verifies routing, token-missing error, and exception containment.
- `meta-webhook-verifier.test.ts` — verifies HMAC-SHA256 accept/reject behavior.
- Registry structural tests in `worker/src/core/registry/__tests__/whatsapp-instagram-registry.test.ts` — verifies `inputSchema`, `outputSchema`, `credentialSchema`, `isBranching`, `incomingPorts`, `outgoingPorts`, `category`.

### Property-Based Tests

Using **fast-check** (already used in the codebase per `worker/src/services/__tests__/credential-gate.property.test.ts`). Minimum 100 iterations per property.

Located in `worker/src/services/social/__tests__/whatsapp-instagram.property.test.ts`:

```typescript
// Feature: instagram-whatsapp-full-nodes, Property 1: Registry defaultConfig completeness
it.prop([fc.constant('whatsapp'), fc.constant('instagram')])(
  'defaultConfig contains all inputSchema keys',
  (nodeType) => { ... }
);

// Feature: instagram-whatsapp-full-nodes, Property 2: WhatsApp message payload shape
it.prop([fc.record({ to: fc.string(), text: fc.string(), phoneNumberId: fc.string() })])(
  'sendText payload contains type: text',
  (params) => { ... }
);

// Feature: instagram-whatsapp-full-nodes, Property 3: Meta API error structure preservation
it.prop([fc.integer(), fc.string(), fc.string()])(
  'Meta error fields are preserved without token leakage',
  (code, message, fbtrace_id) => { ... }
);

// ... (one test per property)
```

### Integration Tests

- `whatsapp-instagram-workflow-validation.test.ts` — builds a minimal workflow with a `whatsapp` action node and a `whatsapp_trigger`, passes it through `validateWorkflow()`, asserts zero errors. Validates Property 14.
- Token refresh integration: mocks Supabase and the Facebook token endpoint to verify the 5-minute expiry window behavior.

### Smoke Tests

- Registry integrity: `unifiedNodeRegistry.get('whatsapp')` and `unifiedNodeRegistry.get('instagram')` return non-undefined at startup.
- No `if (node.type === 'whatsapp')` or `if (node.type === 'instagram')` patterns outside the registry (enforced via a grep-based CI check).
