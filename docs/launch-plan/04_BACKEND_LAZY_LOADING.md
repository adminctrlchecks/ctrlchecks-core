# 04 — Backend Lazy Loading

---

## Current Problem: Heavy Imports Load at Startup

Evidence: `worker/src/api/execute-workflow.ts` lines 43–53

```typescript
// These ALL load when the file is imported (i.e., every app startup):
import { executeClickUpNode } from '../executors/clickup.executor';  // line 43
import Airtable from 'airtable';                                     // line 44
import FormData from 'form-data';                                    // line 45
import { PipedriveApiClient } from '../services/pipedrive/pipedrive-api-client'; // line 46
import { Client } from '@notionhq/client';                           // line 47
import { getNotionAccessToken } from '../shared/notion-token-manager'; // line 48
import { TwitterApi } from 'twitter-api-v2';                         // line 49
import { getTwitterAccessToken } from '../shared/twitter-token-manager'; // line 50
import { getInstagramAccessToken, getInstagramBusinessAccountId } from '../shared/instagram-token-manager'; // line 51
import { getWhatsAppAccessToken, getWhatsAppBusinessAccountId } from '../shared/whatsapp-token-manager'; // line 52
import { executeDatabaseNode } from '../services/database/database-node-handler'; // line 53
```

`executeDatabaseNode` at line 53 chains to `worker/src/services/database/database-node-handler.ts` which itself statically imports ALL 13 database drivers:
MongoDB, MySQL, SQL Server, Snowflake, SQLite, Supabase, TimescaleDB, Firebase, GCS, Intuit, Odoo, Postgres, Redis

**Result**: Every app startup loads 10+ heavy SDKs + 13 DB drivers, even if nobody uses those nodes. This slows startup and wastes memory.

---

## What Already Works Correctly (Do NOT Change)

Evidence: Other parts of `execute-workflow.ts` already use inline require:
```typescript
const { SendEmailCommand } = require('@aws-sdk/client-ses');   // AWS SES — already lazy
const Queue = require('bull');                                  // Bull queue — already lazy
const ioredis = require('ioredis');                            // Redis — already lazy
const { NodeVM } = require('vm2');                             // vm2 sandbox — already lazy
const nodemailer = require('nodemailer');                      // SMTP — already lazy
```

---

## Lazy Factory Pattern

Instead of top-level import, use a lazy factory inside the handler function:

```typescript
// BEFORE (loads at startup):
import Airtable from 'airtable';

async function handleAirtableNode(config, credentials) {
  const base = new Airtable({ apiKey: credentials.apiKey }).base(config.baseId);
  // ...
}

// AFTER (loads only when Airtable node actually runs):
async function handleAirtableNode(config, credentials) {
  const { default: Airtable } = await import('airtable');
  const base = new Airtable({ apiKey: credentials.apiKey }).base(config.baseId);
  // ...
}
```

For heavier clients that benefit from singleton caching:

```typescript
// Cache after first load — do not re-require on every execution
let _notionClient: Client | null = null;

async function getNotionClient(accessToken: string): Promise<Client> {
  if (!_notionClient) {
    const { Client } = await import('@notionhq/client');
    _notionClient = new Client({ auth: accessToken });
  }
  return _notionClient;
}
```

---

## Which Imports to Lazy-Load

| Import | Location | Method |
|---|---|---|
| `executeClickUpNode` from `clickup.executor` | line 43 | dynamic `import()` inside ClickUp handler |
| `Airtable` from `airtable` | line 44 | dynamic `import()` inside Airtable handler |
| `FormData` from `form-data` | line 45 | dynamic `import()` inside form-data handler |
| `PipedriveApiClient` from pipedrive | line 46 | dynamic `import()` inside Pipedrive handler |
| `Client` from `@notionhq/client` | line 47 | cached singleton factory |
| `getNotionAccessToken` from notion-token-manager | line 48 | dynamic `import()` inside Notion handler |
| `TwitterApi` from `twitter-api-v2` | line 49 | cached singleton factory |
| `getTwitterAccessToken` from twitter-token-manager | line 50 | dynamic `import()` inside Twitter handler |
| `getInstagramAccessToken`, `getInstagramBusinessAccountId` | line 51 | dynamic `import()` inside Instagram handler |
| `getWhatsAppAccessToken`, `getWhatsAppBusinessAccountId` | line 52 | dynamic `import()` inside WhatsApp handler |
| `executeDatabaseNode` from database-node-handler | line 53 | dynamic `import()` inside DB node handler |

---

## Database Node Handler Fix

`worker/src/services/database/database-node-handler.ts` currently imports all 13 DB drivers at the top. Change each driver import to lazy:

```typescript
// BEFORE:
import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
// ... 11 more

// AFTER: inside each handler function
async function executeMongoDBNode(config, credentials) {
  const { MongoClient } = await import('mongodb');
  // ...
}

async function executeMySQLNode(config, credentials) {
  const mysql = await import('mysql2/promise');
  // ...
}
```

---

## Error Handling for Lazy Import Failures

```typescript
async function getSDK(moduleName: string) {
  try {
    return await import(moduleName);
  } catch (error) {
    throw new Error(`SDK "${moduleName}" failed to load. Install it or check credentials: ${error.message}`);
  }
}
```

This produces a clear runtime error instead of a startup crash.

---

## Singleton Caching Strategy

For clients that can be reused across requests:

```typescript
// Pattern: module-level cache variable, lazy init on first call
const _clients: Map<string, any> = new Map();

async function getNotionClient(accessToken: string) {
  const key = `notion:${accessToken}`;
  if (!_clients.has(key)) {
    const { Client } = await import('@notionhq/client');
    _clients.set(key, new Client({ auth: accessToken }));
  }
  return _clients.get(key);
}
```

Note: For OAuth clients where credentials change per-user, do NOT cache globally by client — cache by `userId:provider` key.

---

## Backend Files to Modify

| File | Change |
|---|---|
| `worker/src/api/execute-workflow.ts` lines 43–53 | Remove 10 static imports; replace with lazy inline imports in each handler |
| `worker/src/services/database/database-node-handler.ts` | Remove 13 static DB driver imports; make each lazy |

---

## Startup Performance Verification

Run this check before and after:
```bash
cd worker
time npm run start &
# Wait for "Server listening on port 3001"
# Kill it
```

Target: startup time should not increase (should decrease slightly).

Also add to tests: import the `execute-workflow.ts` module in Jest and assert it does NOT throw when Airtable/Notion/etc credentials are absent.

---

## Tests to Add

File: `worker/src/api/__tests__/lazy-loading.test.ts`

```
✓ require('execute-workflow') succeeds without Airtable installed
✓ require('execute-workflow') succeeds without NOTION_CLIENT_ID env var
✓ require('execute-workflow') succeeds without Twitter credentials
✓ Airtable module is NOT in require.cache after app import (before any Airtable node runs)
✓ Airtable module IS in require.cache after an Airtable node executes
✓ Notion client is created only when Notion node executes (mock import tracker)
✓ Missing optional SDK produces controlled error message, not startup crash
✓ Database node handler does not load MongoDB on startup
✓ Database node handler loads MongoDB when a MongoDB node executes
```
