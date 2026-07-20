# Node Operation Functionality Audit Report

Date: 2026-04-25

## Executive Answer

I verified the registered node surface at code level. After the fixes in this pass, the worker has:

- 139 registered nodes
- 57 nodes declaring operation values
- 239 declared operation values
- 0 critical execution-contract gaps
- 0 node-operation audit warnings
- 139/139 schemas with matching output contracts
- 0 registry gate violations

This means every registered node is now represented by a schema, an output contract, and an execution path. It does not mean every third-party API call has been live-tested against real customer credentials; that requires staging accounts, valid scopes, network access to each provider, and test fixtures.

## What Was Fixed

- Added a node-operation audit command: `worker/scripts/audit-node-operation-contracts.ts`.
- Added `npm run audit:node-operations` in `worker/package.json`.
- Added direct registry execution overrides for previously critical schema-only integrations:
  - `activecampaign`
  - `mailchimp`
  - `intercom`
  - `jenkins`
  - `ftp`
  - `sftp`
  - `html`
  - `xml`
  - plus existing critical hardening for `salesforce`, `bitbucket`, `odoo`, `google_drive`, `google_contacts`, `google_tasks`, and `google_bigquery`.
- Installed real FTP/SFTP and parser runtime dependencies:
  - `basic-ftp`
  - `ssh2-sftp-client`
  - `cheerio`
  - `fast-xml-parser`
- Added credential/provider inference coverage for CRM, DevOps, file-transfer, payment, commerce, ClickUp, Twitter, and webhook providers.
- Promoted default/example operation values into schema-driven select options where library fields did not already declare explicit UI options.
- Added explicit operation dropdown options for Instagram and WhatsApp registry overrides.
- Updated the operation audit to recognize schema-driven frontend node rendering and long shared legacy executor case groups.
- Fixed stale `ai_service` critical checks: `ai_service` is an alias/capability, and `ai_chat_model` is the canonical registered node.
- Added output contracts for every registered node in `worker/src/core/types/node-output-types.ts`.
- Aligned `text_summarizer`, `return`, `cache_get`, and `instagram` output metadata with runtime schema expectations.

## Direct Operation Coverage Added

### ActiveCampaign

Operations: `add`, `update`, `delete`

Credential fields: `apiUrl`, `apiKey`

Backend behavior: calls ActiveCampaign API v3 contact endpoints with structured success/error output.

### Mailchimp

Operations: `subscribe`, `unsubscribe`, `send`

Credential fields: `apiKey`, optional `serverPrefix`

Backend behavior:

- `subscribe`: add/update list member by subscriber hash.
- `unsubscribe`: patch list member to unsubscribed.
- `send`: trigger an existing campaign send.

### Intercom

Operations: `list`, `get`, `send`

Credential fields: `accessToken`

Backend behavior:

- Lists conversations.
- Gets a conversation by ID.
- Replies to a conversation as an admin.

### Jenkins

Operations: `build`, `status`, `cancel`

Credential fields: `baseUrl`, `username`, `apiToken`

Backend behavior:

- Triggers normal and parameterized builds.
- Reads latest or numbered build status.
- Cancels a numbered build.
- Attempts Jenkins crumb retrieval when required.

### FTP

Operations: `list`, `download`, `upload`

Credential fields: `host`, `username`, `password`

Backend behavior: uses `basic-ftp` for real FTP/FTPS list, download, and upload operations.

### SFTP

Operations: `list`, `download`, `upload`

Credential fields: `host`, `username`, plus `password` or `privateKey`

Backend behavior: uses `ssh2-sftp-client` for real SFTP list, download, and upload operations.

### HTML

Operations: `parse`, `extract`, `clean`

Backend behavior: uses `cheerio` to parse HTML, extract selector matches/attributes, and clean unsafe/non-content tags.

### XML

Operations: `parse`, `extract`

Backend behavior: uses `fast-xml-parser` to parse XML and extract values by dot-path.

## Audit Outputs

Generated files:

- `worker/tmp/node-operation-contract-audit-codex/node-operation-contract-audit.json`
- `worker/tmp/node-operation-contract-audit-codex/node-operation-contract-audit.csv`
- `worker/tmp/node-operation-contract-audit-codex/NODE_OPERATION_CONTRACT_AUDIT.md`
- `worker/SCHEMA_AUDIT_REPORT.md`

Latest node-operation summary:

```json
{
  "nodeCount": 139,
  "criticalNodeCount": 0,
  "warningNodeCount": 0,
  "executableNodeCount": 139,
  "legacyDelegateCount": 109,
  "registryDirectCount": 30,
  "nodesWithOperations": 57,
  "operationCount": 239,
  "frontendStaticFallbackCount": 117
}
```

Latest schema-completeness summary:

```text
Total nodes: 139
Complete schemas: 139
Incomplete schemas: 0
```

## Verification Commands

All of these passed:

```bash
cd worker
npm run type-check
npm run validate:registry-gates
npm run audit:node-operations -- --out-dir tmp/node-operation-contract-audit-codex
npx ts-node scripts/schema-completeness-audit.ts
npm run build
```

Frontend build also passed:

```bash
cd ctrl_checks
npm run build
```

## Remaining Production Work

The code-level contract is now aligned, but production certification still needs live staging tests. For each external provider, create sandbox credentials and run one positive and one negative test per operation. That is the only honest way to prove provider permissions, scopes, tenant settings, API quotas, and account-specific constraints.

The operation audit now reports 0 warnings. Some nodes still intentionally execute through the legacy delegate path, but they have a registered schema, operation contract, and matching executor path. The next production-hardening step is to migrate more legacy-delegate nodes into direct registry overrides over time for stronger per-provider unit tests and simpler ownership boundaries.

NPM also reports dependency vulnerabilities in the existing worker tree after install. That should be handled as a separate dependency-security pass so we do not mix functional node verification with breaking dependency upgrades.

## External API References Checked

- Mailchimp Marketing API, add/update list member: https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member/
- Intercom conversations API and reply endpoint: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations
- Jenkins Remote Access API: https://www.jenkins.io/doc/book/using/remote-access-api/
- ActiveCampaign API getting started/contact API guidance: https://help.activecampaign.com/hc/en-us/articles/207317590-Getting-started-with-the-API
