# Type 2 Node Testing Guide — Manual OAuth Workflow Tests

## Overview

This folder contains **importable workflow JSON files** for testing every Type 2 (OAuth) node in the ctrlchecks platform. Each file is a complete workflow you import into the platform, connect your OAuth account, and run.

---

## Folder Structure

```
testing/
├── TESTING_GUIDE.md          ← This file
├── google/                   ← Google Workspace nodes
│   ├── type2_01_gmail.json
│   ├── type2_02_sheets.json
│   ├── type2_03_drive.json
│   ├── type2_04_docs.json
│   ├── type2_05_contacts.json   (full CRUD chain)
│   └── type2_06_tasks.json      (full CRUD chain)
├── social/                   ← Social media nodes
│   ├── type2_07_twitter.json
│   ├── type2_08_instagram.json
│   ├── type2_09_facebook.json
│   ├── type2_10_linkedin.json
│   └── type2_11_youtube.json
├── productivity/             ← Productivity & storage nodes
│   ├── type2_12_notion.json
│   ├── type2_13_slack.json
│   ├── type2_14_dropbox.json
│   ├── type2_15_onedrive.json
│   └── type2_16_microsoft_teams.json
├── crm/                      ← CRM nodes
│   ├── type2_17_hubspot.json    (full CRUD chain)
│   ├── type2_18_salesforce.json
│   └── type2_19_airtable.json   (full CRUD chain)
└── business/                 ← Business integrations
    ├── type2_20_zoom.json
    ├── type2_21_shopify.json
    ├── type2_22_paypal.json
    ├── type2_23_xero.json
    ├── type2_24_quickbooks.json
    └── type2_25_microsoft_dynamics.json
```

---

## Step-by-Step Testing Process

### Step 1 — Connect the service first

Before running any workflow, connect the service in the **Connections** page (`/connections`):

1. Go to `/connections` in the platform
2. Find the service (e.g., Google, Twitter, HubSpot)
3. Click **Connect** → complete the OAuth flow
4. Verify the service shows **Connected** status

The platform automatically retrieves the stored OAuth token at execution time — you do **not** need to paste tokens into the workflow JSON.

### Step 2 — Import the workflow

1. Go to **Workflows** in the platform
2. Click **Import** (or use the workflow JSON import feature)
3. Drag-and-drop or paste the JSON file content
4. The workflow appears in your workspace

### Step 3 — Fill in placeholders (if any)

Some workflows contain fields that require your real data. Look for these placeholder patterns in node configs:

| Placeholder | What to replace with |
|---|---|
| `YOUR_SPREADSHEET_ID` | Google Sheets spreadsheet ID from the URL |
| `YOUR_BASE_ID` | Airtable Base ID (starts with `app`) |
| `YOUR_TABLE_NAME` | Airtable table name (e.g., `Contacts`) |
| `YOUR_SALESFORCE_INSTANCE_URL` | e.g., `https://mycompany.my.salesforce.com` |
| `YOUR_NOTION_DATABASE_ID` | Notion database ID from URL |
| `YOUR_NOTION_PAGE_ID` | Notion page ID from URL |
| `YOUR_SHOPIFY_STORE` | Your Shopify store subdomain (e.g., `mystore`) |
| `YOUR_XERO_TENANT_ID` | Xero tenant/organization ID |
| `YOUR_QUICKBOOKS_REALM_ID` | QuickBooks company realm ID |
| `YOUR_DYNAMICS_ORG` | Dynamics organization URL prefix |
| `test@yourdomain.com` | Real email for Gmail send test |
| `YOUR_TEAM_ID` | Microsoft Teams team ID |
| `YOUR_SLACK_CHANNEL` | Slack channel name (e.g., `general`) |

### Step 4 — Run the workflow

Click **Run** (or Execute) on the workflow. Watch the execution:
- Green node = success
- Red node = failure → click the node to see the error message

### Step 5 — Read results

Click any executed node to see its **input** and **output**. Key things to check:
- `success: true` in the output
- Data fields populated with real values from the API
- No `_error` field in the output

---

## Node-by-Node Guide

---

### 01 — Google Gmail (`google/type2_01_gmail.json`)

**Connect:** Google account at `/connections` with Gmail scope

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Send Email | `send` | Sends a test email to the recipient you configure |
| 2 | List Emails | `list` | Lists inbox messages (requires Gmail read scope) |

**Placeholders to fill:**
- `recipientEmails`: Replace `test@yourdomain.com` with a real email you can receive

**Expected output (send):**
```json
{ "success": true, "subject": "ctrlchecks Test Email", "to": "test@yourdomain.com", "sentCount": 1 }
```

**Expected output (list):**
```json
{ "messages": [...], "resultSizeEstimate": 100 }
```

**Troubleshooting:**
- `Gmail: OAuth token not found` → Connect Google account in /connections
- `Gmail: "subject" is required` → Subject field is empty in config
- `Gmail: missing recipient email(s)` → recipientEmails field is empty

---

### 02 — Google Sheets (`google/type2_02_sheets.json`)

**Connect:** Google account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Read Sheet | `read` | Reads data from a range in your spreadsheet |
| 2 | Append Row | `append` | Appends a new row with test data |

**Placeholders to fill:**
- `spreadsheetId`: From the Google Sheets URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`
- `sheetName`: Tab name inside the spreadsheet (default: `Sheet1`)
- `range`: Cell range to read (e.g., `A1:D10`)

**Expected output (read):**
```json
{ "rows": [["Name", "Email"], ["Alice", "alice@example.com"]], "headers": ["Name", "Email"] }
```

**Troubleshooting:**
- `Google Sheets: OAuth token not found` → Connect Google account
- `Google Sheets node: Spreadsheet ID is required` → Fill in spreadsheetId

---

### 03 — Google Drive (`google/type2_03_drive.json`)

**Connect:** Google account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Files | `list` | Lists files in your Google Drive root |
| 2 | Upload File | `upload` | Uploads a small test text file |

**Placeholders to fill:** None required (list uses root folder; upload uses a generated test file)

**Expected output (list):**
```json
{ "operation": "list", "data": { "files": [{ "id": "...", "name": "...", "mimeType": "..." }] } }
```

---

### 04 — Google Docs (`google/type2_04_docs.json`)

**Connect:** Google account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Doc | `get` | Retrieves document content |
| 2 | Create Doc | `create` | Creates a new test document |

**Placeholders to fill:**
- `documentId` in "Get Doc" node: Google Doc ID from URL

**Expected output (create):** Document object with `documentId`, `title`, `body`

---

### 05 — Google Contacts (`google/type2_05_contacts.json`)

**Connect:** Google account at `/connections` with Contacts scope

**Operations tested (CRUD chain):**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Create Contact | `create` | Creates test contact "ctrlchecks Test User" |
| 2 | Read Contact | `read` | Reads the contact just created using its resourceName |
| 3 | Update Contact | `update` | Updates the contact's name and email |
| 4 | Delete Contact | `delete` | Deletes the test contact |

**Placeholders to fill:** None — the chain uses dynamic IDs from create output

**Chain flow:** Create output → `data.resourceName` → used as `contactId` in subsequent operations

**Expected final output:**
```json
{ "operation": "delete", "data": { "deleted": true, "contactId": "people/cXXXXXX" } }
```

**Note:** If any step fails, the chain stops. Check each node's output individually in the execution view.

---

### 06 — Google Tasks (`google/type2_06_tasks.json`)

**Connect:** Google account at `/connections` with Tasks scope

**Operations tested (CRUD chain):**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Create Task | `create` | Creates test task in primary task list |
| 2 | Read Task | `read` | Reads the specific task by ID |
| 3 | Update Task | `update` | Marks task as completed |
| 4 | Delete Task | `delete` | Deletes the test task |

**Chain flow:** Create output → `data.id` → used as `taskId` in subsequent operations

---

### 07 — Twitter / X (`social/type2_07_twitter.json`)

**Connect:** Twitter account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get My Profile | `user.getUser` | Returns authenticated user's profile |
| 2 | Search Tweets | `search.search` | Searches public tweets by keyword |
| 3 | Create Tweet | `tweet.create` | Posts a test tweet |

**Placeholders to fill:**
- `query` in "Search Tweets": change `ctrlchecks test` to any search term
- `text` in "Create Tweet": the tweet text (280 chars max)

**⚠️ Warning:** "Create Tweet" actually posts to Twitter. Change the text or remove that node if testing in production.

---

### 08 — Instagram (`social/type2_08_instagram.json`)

**Connect:** Facebook account with Instagram permissions at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Account | `user.get` | Returns Instagram business account info |
| 2 | List Media | `media.list` | Lists recent posts/media |
| 3 | Get Insights | `insights.get` | Gets account-level insights |

**Note:** Requires a Facebook Business account linked to an Instagram Business/Creator account.

---

### 09 — Facebook (`social/type2_09_facebook.json`)

**Connect:** Facebook account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Profile | `profile.get` | Returns authenticated user's profile |
| 2 | Get Pages | `page.list` | Lists Facebook Pages you manage |

**Note:** Creating posts requires page manager permissions.

---

### 10 — LinkedIn (`social/type2_10_linkedin.json`)

**Connect:** LinkedIn account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Profile | `get_profile` | Returns authenticated user's LinkedIn profile |
| 2 | Create Post | `create_post` | Posts a test message to LinkedIn |

**⚠️ Warning:** "Create Post" publishes to LinkedIn. Remove if not wanted.

**Placeholders:**
- `text` in "Create Post": the post content

---

### 11 — YouTube (`social/type2_11_youtube.json`)

**Connect:** YouTube OAuth account at `/connections` with YouTube read/manage/upload scopes. Reconnect if the connection was created before `youtube.upload` was added.

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | YouTube - List My Channels | `list_my_channels` | Lists YouTube channels linked to your account |
| 2 | YouTube - Search Videos | `search_videos` | Searches YouTube videos |
| 3 | YouTube - Get Video Statistics | `get_video_stats` | Reads stats for a known video |

**Upload:** Use `upload_video` with `title` plus either `videoUrl` or `videoDataBase64`. Test uploads should use `privacyStatus=private` or `unlisted`.

---

### 12 — Notion (`productivity/type2_12_notion.json`)

**Connect:** Notion account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Search | `search.search` | Searches all accessible pages and databases |
| 2 | Get User (Me) | `user.getMe` | Returns the authenticated integration user |
| 3 | Create Page | `page.create` | Creates a new page in a parent database |
| 4 | List Databases | `database.list` | Lists all accessible databases |

**Placeholders to fill:**
- `parentId` in "Create Page": Your Notion database ID or page ID (from URL)

**Note:** Notion integration must have access to the parent page/database in Notion's connection settings.

---

### 13 — Slack (`productivity/type2_13_slack.json`)

**Connect:** Slack at `/connections` OR use incoming webhook URL directly in config

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Send Message | `send` | Sends a test message to a Slack channel |

**Placeholders to fill:**
- `channel`: Replace `YOUR_SLACK_CHANNEL` with your channel name (e.g., `general`)
- OR `webhookUrl`: Replace with your Slack Incoming Webhook URL

**Two ways to use Slack:**
1. **OAuth Bot Token** (via /connections) + `channel` field
2. **Incoming Webhook URL** (no OAuth needed) — paste the URL in `webhookUrl` field

---

### 14 — Dropbox (`productivity/type2_14_dropbox.json`)

**Connect:** Dropbox at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Files | `list` | Lists files/folders in root or specified path |
| 2 | Upload File | `upload` | Uploads a small test text file |
| 3 | Download File | `download` | Downloads a file by path |

**Placeholders to fill:**
- `path` in "Download File": path of an existing file (e.g., `/README.md`)

---

### 15 — OneDrive (`productivity/type2_15_onedrive.json`)

**Connect:** Microsoft account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Files | `list` | Lists files in OneDrive root |
| 2 | Upload File | `upload` | Uploads a small test file |

---

### 16 — Microsoft Teams (`productivity/type2_16_microsoft_teams.json`)

**Connect:** Microsoft account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Send Message | `sendMessage` | Sends a test message to a Teams channel |

**Placeholders to fill:**
- `teamId`: Microsoft Teams team ID (from Teams admin or API)
- `channelId`: Channel ID within the team

**Finding IDs:** In Teams, click the three dots on a channel → Get link to channel → ID is in the URL

---

### 17 — HubSpot (`crm/type2_17_hubspot.json`)

**Connect:** HubSpot at `/connections` with a Private App access token (starts with `pat-`)

**Operations tested (CRUD chain on Contacts):**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Contacts | `contact.getAll` | Lists first 5 contacts |
| 2 | Create Contact | `contact.create` | Creates test contact |
| 3 | Update Contact | `contact.update` | Updates the contact's phone |
| 4 | Delete Contact | `contact.delete` | Deletes the test contact |

**Also tests (deals):**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 5 | List Deals | `deal.getAll` | Lists first 5 deals |

**Credential note:** HubSpot uses Private App tokens. In /connections, paste your token starting with `pat-`. The node will retrieve it from the vault automatically.

---

### 18 — Salesforce (`crm/type2_18_salesforce.json`)

**Connect:** Salesforce at `/connections` via OAuth (complete OAuth flow)

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Query Contacts | `query` | SOQL query to list contacts |
| 2 | Query Accounts | `query` | SOQL query to list accounts |
| 3 | Create Contact | `create` | Creates a test contact record |
| 4 | Update Contact | `update` | Updates the created contact |

**Placeholders to fill:**
- `instanceUrl`: Your Salesforce instance URL (e.g., `https://myorg.my.salesforce.com`)

---

### 19 — Airtable (`crm/type2_19_airtable.json`)

**Connect:** Airtable at `/connections` with personal access token

**Operations tested (CRUD chain):**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Records | `list` | Lists records from the table |
| 2 | Create Record | `create` | Creates a test record |
| 3 | Update Record | `update` | Updates the created record |
| 4 | Delete Record | `delete` | Deletes the test record |

**Placeholders to fill (REQUIRED):**
- `baseId`: Airtable Base ID from URL (e.g., `appXXXXXXXXXXXXXX`)
- `table`: Exact table name (e.g., `Contacts`, `Tasks`)

---

### 20 — Zoom (`business/type2_20_zoom.json`)

**Connect:** Zoom at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Meetings | `list_meetings` | Lists your scheduled meetings |
| 2 | Create Meeting | `create_meeting` | Creates a test meeting (set 1 min in future) |

**Placeholders:**
- `startTime` in "Create Meeting": ISO timestamp (e.g., `2026-12-01T09:00:00Z`)

---

### 21 — Shopify (`business/type2_21_shopify.json`)

**Connect:** Shopify at `/connections` with Admin API access token

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Products | `product.list` | Lists products in the store |
| 2 | List Orders | `order.list` | Lists recent orders |
| 3 | Get Shop Info | `shop.get` | Returns store metadata |

**Placeholders to fill:**
- `shop` or `shopDomain`: Your Shopify store subdomain (e.g., `mystore.myshopify.com`)

---

### 22 — PayPal (`business/type2_22_paypal.json`)

**Connect:** PayPal at `/connections` with client ID + secret (creates OAuth token)

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Profile | `get_profile` | Returns authenticated PayPal account info |
| 2 | List Transactions | `list_transactions` | Lists recent transaction history |

---

### 23 — Xero (`business/type2_23_xero.json`)

**Connect:** Xero at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Organisation | `getOrganisation` | Returns your Xero organization details |
| 2 | List Invoices | `listInvoices` | Lists recent invoices |
| 3 | Get Accounts | `getAccounts` | Lists chart of accounts |

**Placeholders:**
- `tenantId`: Your Xero tenant ID (from Xero API connections page)

---

### 24 — QuickBooks (`business/type2_24_quickbooks.json`)

**Connect:** QuickBooks (Intuit) at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | Get Company Info | `getCompanyInfo` | Returns your QuickBooks company info |
| 2 | List Customers | `listCustomers` | Lists customers in QuickBooks |
| 3 | List Invoices | `listInvoices` | Lists invoices |

**Placeholders to fill:**
- `realmId`: Your QuickBooks company realm ID (from QuickBooks URL or developer dashboard)

---

### 25 — Microsoft Dynamics (`business/type2_25_microsoft_dynamics.json`)

**Connect:** Microsoft account at `/connections`

**Operations tested:**
| # | Node Label | Operation | What it does |
|---|---|---|---|
| 1 | List Accounts | `list.accounts` | Lists CRM accounts |
| 2 | List Contacts | `list.contacts` | Lists CRM contacts |
| 3 | List Leads | `list.leads` | Lists CRM leads |

**Placeholders to fill:**
- `organizationUrl`: Your Dynamics instance URL (e.g., `https://myorg.api.crm.dynamics.com`)

---

## Understanding Workflow Output

When you click a node after execution, you'll see:

### Success
```json
{
  "success": true,
  "output": {
    "operation": "create",
    "data": { ... actual API response ... }
  }
}
```

### Error (credentials missing)
```json
{
  "success": true,
  "output": {
    "_error": "Node: OAuth token not found. Please connect..."
  }
}
```
→ Go to /connections and connect the service, then re-run.

### Error (bad config)
```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR",
    "message": "Description of what went wrong"
  }
}
```
→ Check the config fields; correct the placeholder value.

---

## Troubleshooting Checklist

| Symptom | Cause | Fix |
|---|---|---|
| `OAuth token not found` | Service not connected | Go to /connections, connect the service |
| `Token expired` | OAuth token expired | Reconnect the service in /connections |
| `... is required` | Missing config field | Open node config, fill in the required field |
| `Invalid credentials` | Wrong API key or token | Check the credential in /connections |
| `Spreadsheet ID is required` | Google Sheets placeholder not replaced | Edit workflow, replace `YOUR_SPREADSHEET_ID` |
| `Base ID is required` | Airtable placeholder not replaced | Edit workflow, replace `YOUR_BASE_ID` |
| Workflow stops mid-CRUD chain | An intermediate step failed | Check each node's individual output |
| `rate limit` or `429` error | Too many API calls | Wait a few minutes, then re-run |

---

## Operation Reference Table

| Node | Resource | Operations Available |
|---|---|---|
| `google_gmail` | — | `send`, `list`, `get`, `reply`, `forward`, `delete` |
| `google_sheets` | — | `read`, `write`, `append`, `update`, `clear` |
| `google_drive` | — | `list`, `download`, `upload` |
| `google_doc` | — | `get`, `create`, `append`, `update` |
| `google_contacts` | — | `read`, `create`, `update`, `delete` |
| `google_tasks` | — | `read`, `create`, `update`, `delete` |
| `twitter` | `tweet` | `create`, `get`, `delete`, `like`, `unlike`, `retweet`, `quoteTweet` |
| `twitter` | `user` | `getUser`, `getSelf`, `lookup` |
| `twitter` | `search` | `search` |
| `twitter` | `timeline` | `homeTimeline`, `userTimeline`, `mentionTimeline` |
| `instagram` | `user` | `get` |
| `instagram` | `media` | `list`, `get`, `create` |
| `instagram` | `insights` | `get` |
| `facebook` | `profile` | `get` |
| `facebook` | `page` | `list`, `get`, `post` |
| `linkedin` | — | `get_profile`, `create_post`, `get_posts` |
| `youtube` | — | `list_my_channels`, `get_channel`, `search_videos`, `get_video_stats`, `upload_video`, `update_video_metadata`, `delete_video` |
| `notion` | `page` | `get`, `create`, `update`, `archive`, `restore` |
| `notion` | `database` | `get`, `list`, `query`, `create`, `update` |
| `notion` | `block` | `get`, `listChildren`, `appendChildren`, `update`, `delete` |
| `notion` | `user` | `get`, `list`, `getMe` |
| `notion` | `search` | `search` |
| `slack_message` | — | `send` (channel or webhook) |
| `dropbox` | — | `list`, `download`, `upload` |
| `onedrive` | — | `list`, `download`, `upload` |
| `microsoft_teams` | — | `sendMessage` |
| `hubspot` | `contact` | `get`, `getAll`, `create`, `update`, `delete` |
| `hubspot` | `deal` | `get`, `getAll`, `create`, `update`, `delete` |
| `hubspot` | `company` | `get`, `getAll`, `create`, `update`, `delete` |
| `salesforce` | Any sObject | `query`, `create`, `update`, `delete`, `get` |
| `airtable` | — | `list`, `get`, `create`, `update`, `upsert`, `delete` |
| `zoom_video` | — | `list_meetings`, `create_meeting`, `get_meeting`, `delete_meeting` |
| `shopify` | `product` | `list`, `get`, `create`, `update` |
| `shopify` | `order` | `list`, `get` |
| `shopify` | `shop` | `get` |
| `paypal` | — | `get_profile`, `list_transactions`, `get_order` |
| `xero` | — | `getOrganisation`, `listInvoices`, `getAccounts`, `listContacts` |
| `intuit_smes` | — | `getCompanyInfo`, `listCustomers`, `listInvoices`, `createInvoice` |
| `microsoft_dynamics` | — | `list`, `get`, `create`, `update`, `delete` (any entity) |
