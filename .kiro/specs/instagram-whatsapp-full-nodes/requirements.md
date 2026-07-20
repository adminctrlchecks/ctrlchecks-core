# Requirements Document

## Introduction

This feature delivers fully functional Instagram and WhatsApp automation nodes for the AI workflow automation platform, on par with what top tools like n8n provide. Both nodes are registered as first-class citizens in `unified-node-registry.ts` (the single source of truth), executed through the unified graph orchestrator, and backed by complete executor services that call the respective Meta APIs.

**WhatsApp** uses the Meta WhatsApp Cloud API (Graph API v18+) authenticated via the existing `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` credentials. It covers messaging (all media types, interactive messages, templates), contact/conversation management, AI agent control, broadcast campaigns, and webhook triggers.

**Instagram** uses the Instagram Graph API (v18+) through the same Facebook App credentials. It covers DM messaging, content publishing (images, videos, Reels, carousels, Stories), comment moderation, media/insights retrieval, and webhook triggers.

Both nodes must integrate with the existing `social-dispatcher.ts` routing pattern, follow the `UnifiedNodeDefinition` contract, and never hardcode node-specific logic outside the registry.

---

## Glossary

- **WhatsApp_Node**: The unified node definition registered under type `whatsapp` in `unified-node-registry.ts`.
- **Instagram_Node**: The unified node definition registered under type `instagram` in `unified-node-registry.ts`.
- **Registry**: `unified-node-registry.ts` — the single source of truth for all node schemas, defaults, and execution logic.
- **Orchestrator**: `unified-graph-orchestrator.ts` — the only authority for edge creation and workflow graph mutations.
- **Social_Dispatcher**: `social-dispatcher.ts` — the centralized router that delegates node execution to provider-specific service classes.
- **WhatsApp_Executor**: The new service class `WhatsAppNode` (in `worker/src/services/social/whatsapp-node.ts`) that implements all WhatsApp operations.
- **Instagram_Executor**: The new service class `InstagramNode` (in `worker/src/services/social/instagram-node.ts`) that implements all Instagram operations.
- **Meta_Graph_API**: The Facebook/Meta Graph API (v18.0+) used by both WhatsApp Cloud API and Instagram Graph API.
- **BSP**: Business Solution Provider (e.g., Wasapi, 2Chat, Whaapy) — optional alternative API layer for WhatsApp; the primary path uses Meta's own Cloud API.
- **Facebook_OAuth_Token**: The access token stored in `facebook_oauth_tokens` (or `whatsapp_oauth_tokens` / `instagram_oauth_tokens`) tables, retrieved via the existing token managers.
- **Webhook_Trigger**: A workflow trigger node that fires when Meta sends an inbound webhook event (message received, comment posted, etc.).
- **WABA_ID**: WhatsApp Business Account ID — required for template and campaign operations.
- **IG_User_ID**: Instagram Business/Creator Account ID — required for most Instagram Graph API calls.
- **Credential_Vault**: The existing `credential-vault.ts` service used to look up stored OAuth tokens at execution time.
- **UnifiedNodeDefinition**: The TypeScript interface in `unified-node-contract.ts` that every node registered in the Registry must satisfy.

---

## Requirements

### Requirement 1: WhatsApp Node — Registry Registration

**User Story:** As a platform developer, I want the WhatsApp node fully defined in `unified-node-registry.ts`, so that all workflows (existing, future, and AI-generated) automatically get the correct schema, defaults, and execution logic without any hardcoded special-casing.

#### Acceptance Criteria

1. THE Registry SHALL contain a `UnifiedNodeDefinition` for node type `whatsapp` with a complete `inputSchema` covering all fields required by every supported resource and operation.
2. THE Registry SHALL provide a `defaultConfig()` function for the `whatsapp` node that returns valid defaults for all input fields.
3. THE Registry SHALL provide an `execute()` function for the `whatsapp` node that delegates to `WhatsApp_Executor` via `Social_Dispatcher` without any `if (node.type === 'whatsapp')` logic outside the Registry.
4. THE Registry SHALL define `outputSchema` for the `whatsapp` node describing the shape of the result returned by each resource/operation group.
5. THE Registry SHALL define `credentialSchema` for the `whatsapp` node referencing the `facebook` OAuth provider so the credential preflight system can automatically prompt for missing tokens.
6. WHEN the Registry is queried with `unifiedNodeRegistry.get('whatsapp')`, THE Registry SHALL return the complete definition without error.

---

### Requirement 2: WhatsApp Node — Messaging Operations

**User Story:** As a workflow builder, I want to send any type of WhatsApp message (text, image, video, audio, document, sticker, location, contact card, reaction, interactive buttons/list/CTA, and approved templates) from a single node, so that I can automate all outbound WhatsApp communication.

#### Acceptance Criteria

1. WHEN `resource` is `message` and `operation` is `sendText`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "text"` and return the WhatsApp message ID.
2. WHEN `resource` is `message` and `operation` is `sendMedia`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with the appropriate media type (`image`, `video`, `audio`, `document`, or `sticker`) using either a `mediaUrl` or a pre-uploaded `mediaId`.
3. WHEN `resource` is `message` and `operation` is `sendLocation`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "location"` including `latitude`, `longitude`, optional `name`, and optional `address`.
4. WHEN `resource` is `message` and `operation` is `sendContact`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "contacts"` using the provided contacts array.
5. WHEN `resource` is `message` and `operation` is `sendTemplate`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "template"` using `templateName`, `language`, and optional `templateComponents`.
6. WHEN `resource` is `message` and `operation` is `sendInteractiveButtons`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "interactive"` and `interactive.type: "button"` using up to 3 reply buttons.
7. WHEN `resource` is `message` and `operation` is `sendInteractiveList`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "interactive"` and `interactive.type: "list"` using the provided sections.
8. WHEN `resource` is `message` and `operation` is `sendInteractiveCTA`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `type: "interactive"` and `interactive.type: "cta_url"`.
9. WHEN `resource` is `message` and `operation` is `markAsRead`, THE WhatsApp_Executor SHALL call `POST /{phone_number_id}/messages` with `status: "read"` and the target `messageId`.
10. IF the Meta_Graph_API returns a non-2xx HTTP status for any messaging operation, THEN THE WhatsApp_Executor SHALL return a structured error object containing the Meta error code, message, and fbtrace_id.

---

### Requirement 3: WhatsApp Node — Contact Management

**User Story:** As a workflow builder, I want to create, update, delete, search, and tag WhatsApp contacts, so that I can maintain a clean CRM-style contact list within my automation.

#### Acceptance Criteria

1. WHEN `resource` is `contact` and `operation` is `create`, THE WhatsApp_Executor SHALL call the appropriate BSP or Meta Contacts API endpoint to create a new contact with the provided fields (name, phone, email, custom fields).
2. WHEN `resource` is `contact` and `operation` is `update`, THE WhatsApp_Executor SHALL update the specified contact's fields by contact ID.
3. WHEN `resource` is `contact` and `operation` is `delete`, THE WhatsApp_Executor SHALL delete the contact by contact ID.
4. WHEN `resource` is `contact` and `operation` is `search`, THE WhatsApp_Executor SHALL search contacts by phone number or name and return a paginated list.
5. WHEN `resource` is `contact` and `operation` is `addLabel`, THE WhatsApp_Executor SHALL assign one or more labels/tags to the specified contact.
6. WHEN `resource` is `contact` and `operation` is `removeLabel`, THE WhatsApp_Executor SHALL remove one or more labels/tags from the specified contact.

---

### Requirement 4: WhatsApp Node — Conversation Management

**User Story:** As a workflow builder, I want to list, retrieve, close, archive, and mark conversations as read, so that I can manage customer conversation state programmatically.

#### Acceptance Criteria

1. WHEN `resource` is `conversation` and `operation` is `list`, THE WhatsApp_Executor SHALL return a paginated list of conversations with status, last message timestamp, and contact info.
2. WHEN `resource` is `conversation` and `operation` is `get`, THE WhatsApp_Executor SHALL return the full conversation thread including message history for the given conversation ID.
3. WHEN `resource` is `conversation` and `operation` is `close`, THE WhatsApp_Executor SHALL mark the conversation as closed/resolved.
4. WHEN `resource` is `conversation` and `operation` is `archive`, THE WhatsApp_Executor SHALL archive the conversation.
5. WHEN `resource` is `conversation` and `operation` is `markAsRead`, THE WhatsApp_Executor SHALL mark all messages in the conversation as read.

---

### Requirement 5: WhatsApp Node — Templates and Campaigns

**User Story:** As a workflow builder, I want to list, sync, and send approved WhatsApp message templates, and create broadcast campaigns, so that I can run compliant bulk messaging workflows.

#### Acceptance Criteria

1. WHEN `resource` is `template` and `operation` is `list`, THE WhatsApp_Executor SHALL call `GET /{waba_id}/message_templates` and return all templates with their status and components.
2. WHEN `resource` is `template` and `operation` is `get`, THE WhatsApp_Executor SHALL return the full definition of a single template by name.
3. WHEN `resource` is `template` and `operation` is `create`, THE WhatsApp_Executor SHALL call `POST /{waba_id}/message_templates` with the provided name, language, category, and components array.
4. WHEN `resource` is `template` and `operation` is `delete`, THE WhatsApp_Executor SHALL call `DELETE /{waba_id}/message_templates` for the specified template name.
5. WHEN `resource` is `campaign` and `operation` is `create`, THE WhatsApp_Executor SHALL create a broadcast campaign by iterating over a recipient list and sending the specified template to each recipient, returning a summary of sent/failed counts.
6. WHEN `resource` is `campaign` and `operation` is `list`, THE WhatsApp_Executor SHALL return a list of previously created campaigns with their delivery statistics.
7. IF a template has status other than `APPROVED` when used in `sendTemplate` or a campaign, THEN THE WhatsApp_Executor SHALL return an error indicating the template is not approved for sending.

---

### Requirement 6: WhatsApp Node — AI Agent Control

**User Story:** As a workflow builder, I want to enable or disable AI auto-reply agents for a conversation and retrieve AI-suggested replies, so that I can build human-in-the-loop handoff workflows.

#### Acceptance Criteria

1. WHEN `resource` is `aiAgent` and `operation` is `enable`, THE WhatsApp_Executor SHALL activate the AI agent for the specified conversation or phone number ID.
2. WHEN `resource` is `aiAgent` and `operation` is `disable`, THE WhatsApp_Executor SHALL deactivate the AI agent for the specified conversation or phone number ID.
3. WHEN `resource` is `aiAgent` and `operation` is `getSuggestions`, THE WhatsApp_Executor SHALL return one or more AI-generated reply suggestions for the latest message in the specified conversation.

---

### Requirement 7: WhatsApp Node — Webhook Triggers

**User Story:** As a workflow builder, I want to trigger workflows on WhatsApp events (message received, message delivered, message read, conversation created, human handoff), so that I can build real-time reactive automations.

#### Acceptance Criteria

1. THE Registry SHALL register a trigger node type `whatsapp_trigger` with an `event` field accepting values: `message.received`, `message.sent`, `message.delivered`, `message.read`, `conversation.created`, `conversation.handoff`.
2. WHEN a Meta webhook POST arrives at the platform's webhook endpoint with a WhatsApp payload, THE Webhook_Trigger SHALL parse the payload and fire the workflow whose trigger matches the event type and phone number ID.
3. WHEN `event` is `message.received`, THE Webhook_Trigger SHALL expose the full message object (id, from, timestamp, type, text/media/location/etc.) as the trigger output.
4. WHEN `event` is `conversation.handoff`, THE Webhook_Trigger SHALL expose the conversation ID, contact info, and handoff reason as the trigger output.
5. THE Webhook_Trigger SHALL verify the `X-Hub-Signature-256` header on every inbound Meta webhook request using the `FACEBOOK_APP_SECRET` environment variable, and SHALL reject requests with invalid signatures with HTTP 403.

---

### Requirement 8: Instagram Node — Registry Registration

**User Story:** As a platform developer, I want the Instagram node fully defined in `unified-node-registry.ts`, so that all workflows automatically get the correct schema, defaults, and execution logic.

#### Acceptance Criteria

1. THE Registry SHALL contain a `UnifiedNodeDefinition` for node type `instagram` with a complete `inputSchema` covering all fields required by every supported resource and operation.
2. THE Registry SHALL provide a `defaultConfig()` function for the `instagram` node that returns valid defaults for all input fields.
3. THE Registry SHALL provide an `execute()` function for the `instagram` node that delegates to `Instagram_Executor` via `Social_Dispatcher` without any `if (node.type === 'instagram')` logic outside the Registry.
4. THE Registry SHALL define `outputSchema` for the `instagram` node describing the shape of the result returned by each resource/operation group.
5. THE Registry SHALL define `credentialSchema` for the `instagram` node referencing the `facebook` OAuth provider (scopes: `instagram_basic`, `instagram_content_publish`, `instagram_manage_messages`, `pages_show_list`).
6. WHEN the Registry is queried with `unifiedNodeRegistry.get('instagram')`, THE Registry SHALL return the complete definition without error.

---

### Requirement 9: Instagram Node — DM Messaging

**User Story:** As a workflow builder, I want to send direct messages (text, image, audio, video, interactive templates with buttons and quick replies) to Instagram users, so that I can automate DM-based customer interactions.

#### Acceptance Criteria

1. WHEN `resource` is `message` and `operation` is `sendText`, THE Instagram_Executor SHALL call `POST /{ig-user-id}/messages` with `recipient.id` and `message.text`.
2. WHEN `resource` is `message` and `operation` is `sendMedia`, THE Instagram_Executor SHALL call `POST /{ig-user-id}/messages` with `message.attachment` containing the media type (`image`, `audio`, `video`) and URL.
3. WHEN `resource` is `message` and `operation` is `sendTemplate`, THE Instagram_Executor SHALL call `POST /{ig-user-id}/messages` with a generic template payload including buttons or quick replies.
4. IF the Instagram Messaging API returns a non-2xx status, THEN THE Instagram_Executor SHALL return a structured error with the Meta error code and user-facing message.
5. THE Instagram_Executor SHALL only send DMs to users who have previously messaged the Instagram account within the 7-day messaging window, and SHALL return a descriptive error if the window has expired.

---

### Requirement 10: Instagram Node — Content Publishing

**User Story:** As a workflow builder, I want to publish single images, videos, Reels, carousels, and Stories to Instagram, with support for captions, user tags, product tags, and location tags, so that I can automate content scheduling and publishing.

#### Acceptance Criteria

1. WHEN `resource` is `media` and `operation` is `createAndPublish` with `media_type` of `IMAGE`, THE Instagram_Executor SHALL create a media container via `POST /{ig-user-id}/media` and then publish it via `POST /{ig-user-id}/media_publish`.
2. WHEN `resource` is `media` and `operation` is `createAndPublish` with `media_type` of `VIDEO` or `REELS`, THE Instagram_Executor SHALL create the container, poll `GET /{container-id}?fields=status_code` until status is `FINISHED`, then publish.
3. WHEN `resource` is `media` and `operation` is `createAndPublish` with `media_type` of `CAROUSEL_ALBUM`, THE Instagram_Executor SHALL create individual item containers for each media URL, then create a carousel container referencing all item IDs, then publish.
4. WHEN `user_tags` is provided, THE Instagram_Executor SHALL include the user tags array in the media container creation request.
5. WHEN `product_tags` is provided, THE Instagram_Executor SHALL include the product tags array in the media container creation request.
6. WHEN `location_id` is provided, THE Instagram_Executor SHALL include the location ID in the media container creation request.
7. IF the media container status is `ERROR` or `EXPIRED` during polling, THEN THE Instagram_Executor SHALL return a descriptive error and SHALL NOT attempt to publish.
8. THE Instagram_Executor SHALL poll container status at most 10 times with a 5-second interval before returning a timeout error.

---

### Requirement 11: Instagram Node — Comment Moderation

**User Story:** As a workflow builder, I want to list, hide, unhide, delete, and reply to comments on my Instagram posts (including sending a private DM reply to a commenter), so that I can automate community moderation.

#### Acceptance Criteria

1. WHEN `resource` is `comment` and `operation` is `list`, THE Instagram_Executor SHALL call `GET /{media-id}/comments` and return a paginated list of comments with author, text, and timestamp.
2. WHEN `resource` is `comment` and `operation` is `hide`, THE Instagram_Executor SHALL call `POST /{comment-id}` with `hide: true`.
3. WHEN `resource` is `comment` and `operation` is `unhide`, THE Instagram_Executor SHALL call `POST /{comment-id}` with `hide: false`.
4. WHEN `resource` is `comment` and `operation` is `delete`, THE Instagram_Executor SHALL call `DELETE /{comment-id}`.
5. WHEN `resource` is `comment` and `operation` is `reply`, THE Instagram_Executor SHALL call `POST /{comment-id}/replies` with the reply text to post a public reply.
6. WHEN `resource` is `comment` and `operation` is `replyDM`, THE Instagram_Executor SHALL send a private DM to the commenter's Instagram user ID using the Messaging API.

---

### Requirement 12: Instagram Node — Media and Insights

**User Story:** As a workflow builder, I want to fetch user profile data, list media, get post details, retrieve insights metrics, and search hashtags, so that I can build analytics and reporting workflows.

#### Acceptance Criteria

1. WHEN `resource` is `user` and `operation` is `get`, THE Instagram_Executor SHALL call `GET /{ig-user-id}?fields=id,username,biography,followers_count,media_count,profile_picture_url,website` and return the profile data.
2. WHEN `resource` is `user` and `operation` is `getMedia`, THE Instagram_Executor SHALL call `GET /{ig-user-id}/media` and return a paginated list of media objects.
3. WHEN `resource` is `media` and `operation` is `get`, THE Instagram_Executor SHALL call `GET /{media-id}?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count` and return the post details.
4. WHEN `resource` is `insights` and `operation` is `get`, THE Instagram_Executor SHALL call `GET /{ig-user-id}/insights` with the specified `metric` and `period` parameters and return the metrics data.
5. WHEN `resource` is `hashtag` and `operation` is `search`, THE Instagram_Executor SHALL call `GET /ig_hashtag_search?user_id={ig-user-id}&q={hashtag}` and return the hashtag ID.
6. WHEN `resource` is `hashtag` and `operation` is `getRecentMedia`, THE Instagram_Executor SHALL call `GET /{hashtag-id}/recent_media?user_id={ig-user-id}` and return recent public posts.

---

### Requirement 13: Instagram Node — Webhook Triggers

**User Story:** As a workflow builder, I want to trigger workflows on Instagram events (new DM, new comment, mention, button click/postback), so that I can build real-time reactive Instagram automations.

#### Acceptance Criteria

1. THE Registry SHALL register a trigger node type `instagram_trigger` with an `event` field accepting values: `message.received`, `comment.created`, `mention.created`, `postback`.
2. WHEN a Meta webhook POST arrives with an Instagram messaging payload, THE Webhook_Trigger SHALL parse the entry and fire the matching workflow.
3. WHEN `event` is `message.received`, THE Webhook_Trigger SHALL expose the sender PSID, message text, and any attachments as the trigger output.
4. WHEN `event` is `comment.created`, THE Webhook_Trigger SHALL expose the comment ID, media ID, commenter username, and comment text as the trigger output.
5. WHEN `event` is `postback`, THE Webhook_Trigger SHALL expose the sender PSID, postback payload string, and title as the trigger output.
6. THE Webhook_Trigger SHALL verify the `X-Hub-Signature-256` header on every inbound Meta webhook request using `FACEBOOK_APP_SECRET`, and SHALL reject invalid signatures with HTTP 403.

---

### Requirement 14: Social Dispatcher Integration

**User Story:** As a platform developer, I want the Social_Dispatcher to route `whatsapp` and `instagram` node executions to their respective executor classes, so that the dispatch layer remains the single routing authority for all social nodes.

#### Acceptance Criteria

1. THE Social_Dispatcher SHALL handle `provider: 'whatsapp'` by instantiating `WhatsApp_Executor` and calling `execute(params)`.
2. THE Social_Dispatcher SHALL handle `provider: 'instagram'` by instantiating `Instagram_Executor` and calling `execute(params)`.
3. WHEN the token lookup for `whatsapp` or `instagram` returns null, THE Social_Dispatcher SHALL return a structured error with a user-facing message instructing the user to connect their account.
4. THE Social_Dispatcher SHALL NOT contain any `if (node.type === 'whatsapp')` or `if (node.type === 'instagram')` logic; routing SHALL be driven by the `provider` field in the config.
5. WHEN `WhatsApp_Executor` or `Instagram_Executor` throws an unhandled exception, THE Social_Dispatcher SHALL catch it and return a `SocialServiceResponse` with `success: false` and the error message.

---

### Requirement 15: Credential and Token Management

**User Story:** As a workflow builder, I want the nodes to automatically retrieve and refresh my Facebook/Meta OAuth tokens, so that I never have to manually re-authenticate mid-workflow.

#### Acceptance Criteria

1. THE WhatsApp_Node SHALL use `getWhatsAppAccessToken()` from `whatsapp-token-manager.ts` to retrieve the access token at execution time.
2. THE Instagram_Node SHALL use `getInstagramAccessToken()` from `instagram-token-manager.ts` to retrieve the access token at execution time.
3. WHEN a token is expired or expiring within 5 minutes, THE token manager SHALL attempt to refresh it using the Facebook `fb_exchange_token` grant before returning.
4. IF token refresh fails, THEN THE token manager SHALL return `null` and THE node executor SHALL return a structured error prompting the user to re-authenticate.
5. THE Registry `credentialSchema` for both nodes SHALL reference `provider: 'facebook'` so the credential preflight system automatically checks for a valid token before workflow execution begins.
6. THE WhatsApp_Node SHALL support an optional `phoneNumberId` credential field that, when absent, is auto-resolved by calling `GET /me/phone_numbers` with the access token.
7. THE Instagram_Node SHALL support an optional `instagramBusinessAccountId` field that, when absent, is auto-resolved by calling `getInstagramBusinessAccountId()` from `instagram-token-manager.ts`.

---

### Requirement 16: Error Handling and Observability

**User Story:** As a workflow builder, I want all WhatsApp and Instagram node errors to be structured, descriptive, and logged, so that I can debug failed workflow runs quickly.

#### Acceptance Criteria

1. WHEN any Meta_Graph_API call returns an error response, THE executor SHALL parse the `error.code`, `error.message`, and `error.fbtrace_id` fields and include them in the returned error object.
2. THE executor SHALL NOT expose raw OAuth tokens or `FACEBOOK_APP_SECRET` values in error messages or logs.
3. WHEN a required input field is missing or invalid, THE executor SHALL return a validation error listing all missing/invalid fields before making any API call.
4. THE executor SHALL log the operation name, resource, operation, execution time in milliseconds, and API call count using the platform's existing logger (`core/logger.ts`).
5. IF the Meta_Graph_API returns error code `190` (invalid/expired token), THEN THE executor SHALL return a user-facing error message: "Your Facebook/Meta access token has expired. Please reconnect your account."
6. IF the Meta_Graph_API returns error code `10` or `200`-`299` (permission error), THEN THE executor SHALL return a user-facing error message identifying the missing permission scope.

---

### Requirement 17: Graph Orchestrator Compliance

**User Story:** As a platform architect, I want WhatsApp and Instagram nodes to be fully compliant with the unified graph orchestrator rules, so that workflows containing these nodes are structurally valid DAGs.

#### Acceptance Criteria

1. THE WhatsApp_Node and Instagram_Node SHALL declare `isBranching: false`, `outgoingPorts: ['default']`, and `incomingPorts: ['default']` in their Registry definitions (action nodes).
2. THE WhatsApp_Trigger and Instagram_Trigger nodes SHALL declare `category: 'trigger'`, `isBranching: false`, `outgoingPorts: ['default']`, and `incomingPorts: []` in their Registry definitions.
3. WHEN a workflow containing a WhatsApp or Instagram node is passed to `validateWorkflow()`, THE Orchestrator SHALL report zero structural errors.
4. THE WhatsApp_Node and Instagram_Node SHALL NOT directly mutate `workflow.edges`; all edge operations SHALL go through the Orchestrator.
5. WHEN the AI planner generates a workflow step with type `whatsapp` or `instagram`, THE Registry `defaultConfig()` SHALL be used to hydrate the node config, and the AI planner SHALL NOT generate output schemas or credential structures.
