# CtrlChecks Credentials and Connections Architecture

CtrlChecks has an n8n-style credential plane for reusable user connections.

## Runtime Surface

- Node Registry: `GET /api/credential-connections/registry/nodes`
- Credential Type Registry: `GET /api/credential-connections/credential-types`
- User Connections: `GET/POST/PUT/DELETE /api/credential-connections/connections`
- Test Connection: `POST /api/credential-connections/connections/:id/test`
- Reconnect OAuth: `POST /api/credential-connections/connections/:id/reconnect`
- OAuth Start: `GET|POST /api/credential-connections/oauth/start`
- OAuth Callback: `GET|POST /api/credential-connections/oauth/callback`
- Runtime Request Execution: `POST /api/credential-connections/execute-request`

## Storage

Secrets are stored in `connections.encrypted_credentials` using AES-256-GCM. UI and API responses return metadata only; runtime code decrypts just in time, injects auth, refreshes OAuth tokens when possible, and writes audit events to `workflow_execution_logs`.

Schema files:

- `worker/migrations/019_credentials_connections_system.sql`
- `worker/prisma/migrations/0002_credentials_connections_system.sql`

Tables:

- `credential_types`
- `node_definitions`
- `node_operations`
- `connections`
- `oauth_states`
- `workflow_execution_logs`

## Registries

Credential types live in `worker/src/credentials-system/credential-type-registry.ts`.

Supported auth types:

- OAuth2
- API Key
- Bearer Token
- Basic Auth
- Custom Header Auth
- Query Auth

Node definitions are projected from the existing unified node registry by `NodeRegistryService`.

Run registry sync after migrations or deploys:

```bash
cd worker
npm run sync:credential-registry
```

## OAuth Providers

Generic OAuth providers currently modeled:

- Google: `google_oauth2`
- Slack: `slack_oauth2`
- GitHub: `github_oauth2`
- Notion: `notion_oauth2`

Configure provider apps with:

```text
http://localhost:3001/api/credential-connections/oauth/callback
```

Production should use the deployed worker domain:

```text
https://worker.ctrlchecks.ai/api/credential-connections/oauth/callback
```

Relevant environment variables:

- `CREDENTIAL_ENCRYPTION_KEY` or `ENCRYPTION_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GENERIC_GOOGLE_OAUTH_REDIRECT_URI`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `GENERIC_SLACK_OAUTH_REDIRECT_URI`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GENERIC_GITHUB_OAUTH_REDIRECT_URI`
- `NOTION_OAUTH_CLIENT_ID`
- `NOTION_OAUTH_CLIENT_SECRET`
- `GENERIC_NOTION_OAUTH_REDIRECT_URI`

## Execution

Use `AuthInjectionEngine` for direct runtime auth injection:

```ts
const request = await authInjectionEngine.injectIntoRequest(context, {
  method: 'GET',
  url: 'https://api.example.com/items',
});
```

Use `credentialExecutionAuthMiddleware()` for Express routes that execute authenticated requests. It validates authenticated user context, requires a `connectionId`, verifies connection ownership, and attaches:

- `req.credentialAuth.inject(request)`
- `req.credentialAuth.execute(request)`

## Frontend

Components:

- `CredentialsConnectionsPanel`
- `CredentialFormRenderer`
- `NodeCredentialSelector`

The existing `ConnectionsPanel` mounts the generic credentials panel, and `PropertiesPanel` mounts the node credential selector for nodes with credential requirements.

## Verification

Recommended checks:

```bash
cd worker
npm run type-check
npx jest src/credentials-system/__tests__ --runInBand
npm run sync:credential-registry

cd ../ctrl_checks
npx tsc --noEmit
```
