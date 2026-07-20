# Real-Time Trigger Connection and Credential Audit Prompt

Use this prompt when continuing the real-time third-party trigger work in another agent session.

## Copy-Paste Prompt For Claude

```text
We are in repo: C:\Users\user\Desktop\ctrlchecks-hostinger

Read these files first:
1. docs/REALTIME_THIRD_PARTY_TRIGGER_IMPLEMENTATION_PLAN.md
2. docs/REALTIME_TRIGGER_CONNECTION_CREDENTIAL_AUDIT_PROMPT.md
3. docs/CREDENTIALS_CONNECTIONS_ARCHITECTURE.md

Persistent Goal:
Complete all remaining real-time third-party triggers from the 20-trigger plan, one by one, end to end, and do a deep connection/credential audit for every trigger and matching action node.

Important correction:
Do not create fake OAuth, fake Bearer-token-only credentials, generic token placeholders, or one shared connection shape for unrelated providers.
Every provider must use the correct authentication model for that provider:
- OAuth2 where the provider requires OAuth2.
- Bot token where the provider uses bot tokens.
- API key or personal access token where the provider officially supports that model.
- Signing secret, verify token, webhook secret, app secret, public key, client state, or channel token for webhook validation where the provider supports it.
- Provider-specific scopes/permissions must be documented and reflected in the Connections UI.

Do not mark a trigger complete until the connection panel, saved credential registry, credential test flow, trigger settings UI, backend runtime, action/reply node, docs, AI hints, and focused tests all agree on the same provider-specific credential model.

Core rule:
The Connections panel must show the exact credential fields the node needs. A user should not see a vague "Bearer token" field when the provider requires OAuth, app ID/client secret, bot token, signing secret, public key, webhook verify token, or provider-specific scopes.

For every trigger, repeat this full credential audit before implementation or completion:

1. Provider Auth Audit
- Read the official provider docs or existing repo implementation.
- Identify the exact auth model for trigger registration.
- Identify the exact auth model for webhook validation.
- Identify the exact auth model for reply/action nodes.
- Identify required scopes, permissions, app settings, webhook URLs, and provider callback URLs.
- Write down whether registration can be automatic by API or must be manual in the provider dashboard.

2. Saved Credential Registry Audit
- Check worker/src/credentials-system/credential-type-registry.ts.
- Check worker/src/api/connections-catalog.ts.
- Check worker/src/services/connectors/connector-registry.ts.
- Check worker/src/services/credential-scope-registry.ts.
- Check any OAuth proxy/provider registry if OAuth is required.
- Verify provider, credentialTypeId, authType, fields, requiredFields, maskFields, scopes, and test endpoint are provider-specific.
- Verify no credentials are stored in workflow JSON except safe connection references and non-secret config.

3. Connection Panel UI Audit
- Confirm the Connections UI can create the required connection type.
- Confirm fields have clear labels and help text.
- Confirm secrets are masked.
- Confirm OAuth providers use OAuth start/callback and do not ask users to paste fake access tokens unless the product intentionally supports manual token fallback.
- Confirm token/key providers explain exactly where to find the token/key.
- Confirm webhook-only providers explain what value CtrlChecks generates and what value the user must paste back.

4. Trigger Node Settings Audit
- Check ctrl_checks/src/components/workflow/nodeTypes.ts and related frontend node registries.
- Trigger node should use connection selector first.
- Node-level token/key fields are allowed only as existing backward-compatible fallback, not the primary path.
- Webhook URL, verify token, signing secret, public key, channel token, client state, event filters, account/page/team/channel/form/repo selectors, and setup helper text must match that provider.
- Node picker, logo, docs link, layman description, and AI builder hints must all exist.

5. Backend Runtime Audit
- Check backend service and route files.
- Verify webhook verification endpoint/challenge behavior where provider requires it.
- Verify signature/secret/JWT/HMAC/public-key validation.
- Verify active workflow and trigger node lookup.
- Verify event filters.
- Verify normalized $json output.
- Verify execution row creation uses universal execution enum normalizer.
- Verify internal handoff to /api/execute-workflow uses universal internal execution auth helper/header pattern.
- Verify handoff failure marks the execution failed and never leaves it stuck running.

6. Action/Reply Node Credential Audit
- Verify the matching action node uses the same saved credential system.
- Verify replies can target the same conversation/resource from trigger $json fields.
- Verify OAuth token refresh or provider token retrieval exists if needed.
- Verify outbound request formation uses the correct provider endpoint and auth header.
- Verify action docs and examples use trigger output fields like {{$json.channelId}}, {{$json.threadId}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.email}}, or provider-specific IDs.

7. Tests Required
- Credential registry test for provider-specific credential fields.
- Connector catalog test for provider scopes/capabilities.
- Frontend node fields test.
- Logo/provider mapping test.
- Backend registry/output schema test.
- Webhook validation test.
- Payload normalization test.
- Execution enum normalization test.
- Internal handoff auth test.
- Handoff failure marks execution failed test.
- Action/reply request formation test where relevant.

8. Verification Required
- Run worker type-check.
- Run focused backend tests.
- Run worker lint/build if backend runtime changed.
- Run frontend focused tests if frontend changed.
- Run frontend build if frontend changed.
- Deploy worker if backend runtime changed.
- Verify live health.
- Update docs/REALTIME_THIRD_PARTY_TRIGGER_IMPLEMENTATION_PLAN.md with status and implementation notes.

Do not remove unrelated user changes.
Prefer existing repo patterns.
No migrations unless truly needed.
Continue automatically to the next incomplete trigger after finishing one trigger.
Only mark the persistent goal complete when all 20 planned triggers are implemented, verified, deployed if needed, and documented.
```

## Credential Model Checklist By Trigger

Use this table as a starting point. Still verify the exact provider docs and the existing repo before coding.

| Trigger | Primary Connection Type | Webhook Validation | Registration Model | Action/Reply Credential |
| --- | --- | --- | --- | --- |
| Telegram | Bot token | Optional Telegram secret token header | Bot API setWebhook | Same bot token |
| WhatsApp Cloud | Meta app/page/system token with phone number ID | Meta app secret HMAC and verify token challenge | Graph API subscribed app/webhook setup | WhatsApp Cloud access token + phone number ID |
| Instagram | Meta/Instagram professional account via Graph OAuth/page token | Meta app secret HMAC and verify token challenge | Meta app webhook subscriptions | Instagram/Messenger Graph token with required messaging/comment scopes |
| Facebook Page/Messenger | Meta page access token or Graph OAuth connection | Meta app secret HMAC and verify token challenge | Meta page/app webhook subscriptions | Page access token / Messenger Send API |
| Slack | Slack OAuth bot token or installed app bot token plus signing secret | Slack signing secret HMAC timestamp validation | Events API/slash command/interactivity URL, often manual app setup | Bot token, response_url where applicable |
| Discord | Discord bot token plus application public key | Ed25519 signature with public key | Interactions endpoint/manual app setup | Bot token or interaction follow-up token |
| Microsoft Teams | Azure Bot app ID/app password, OAuth/Bot Framework credentials | Bot Framework JWT validation; optional dev secret only for tests/manual fallback | Bot messaging endpoint configured in Azure/Bot Framework | Bot Framework token from app ID/app password |
| Gmail | Google OAuth2 user connection with refresh token and Gmail scopes | Pub/Sub push JWT/token validation where configured | Gmail watch API to Google Pub/Sub topic | Gmail API OAuth token |
| Outlook | Microsoft Graph OAuth2 connection with offline access and mail scopes | Graph validationToken challenge plus clientState secret | Microsoft Graph subscriptions | Microsoft Graph OAuth token |
| Google Calendar | Google OAuth2 connection with calendar scopes | Google channel token/resource headers or Pub/Sub validation | Calendar events watch channel | Google Calendar API OAuth token |
| Google Sheets | Google OAuth2 Sheets/Drive connection | Usually Drive push notification channel token/resource headers or Apps Script webhook secret | Drive changes/watch or documented provider-supported path | Google Sheets/Drive OAuth token |
| Google Drive | Google OAuth2 Drive connection | Google channel token/resource headers | Drive changes/watch channel | Google Drive OAuth token |
| Typeform | Typeform OAuth or personal access token | Typeform webhook HMAC signature/secret | Typeform webhook API | Typeform API token/OAuth token |
| Tally | Tally API key/token or provider-supported webhook setup | Provider webhook signing secret if available; otherwise generated endpoint secret | Tally webhook dashboard/API if available | Tally API token if actions are supported |
| GitHub | GitHub App installation token or fine-grained PAT/OAuth | X-Hub-Signature-256 HMAC secret | GitHub webhook API or app webhooks | GitHub App token/PAT/OAuth token |
| GitLab | GitLab OAuth/PAT/project access token | X-Gitlab-Token secret | Project/group webhook API | GitLab OAuth/PAT |
| Jira | Atlassian OAuth2 or API token with site/cloud ID | Webhook secret/JWT where supported; validate source/account | Jira webhook API | Atlassian OAuth/API token |
| Trello | Trello API key/token | Trello webhook signature/callback validation | Trello webhook API | Trello API key/token |
| Linear | Linear OAuth or API key | Linear webhook signature secret | Linear webhook API | Linear OAuth/API key |
| Stripe | Stripe restricted key or OAuth where applicable | Stripe-Signature endpoint secret | Stripe webhook endpoint/dashboard/API | Stripe API key/OAuth |
| Shopify | Shopify OAuth app access token | Shopify HMAC signature | Shopify webhook subscriptions | Shopify Admin API access token |

## Completion Gate For Each Trigger

Before marking a trigger complete, answer these in the implementation notes:

- What is the exact credential type ID?
- Is the connection OAuth, bot token, API key, app credential, or provider-specific token?
- Which file defines the credential fields?
- Which file defines the connector catalog entry?
- Which UI fields does the user see in the Connections panel?
- Which trigger node settings are safe non-secret config?
- Which fields are masked secrets?
- What webhook validation is used?
- What scopes/permissions are required?
- How is the action/reply node authenticated?
- Which tests prove that the real credential model is wired end to end?

If any answer is missing, the trigger is not complete.

