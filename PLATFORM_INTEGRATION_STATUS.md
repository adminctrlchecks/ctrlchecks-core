# CtrlChecks AI Workflow Platform — Integration Status Report

> **Prepared for:** Investor Technical Due Diligence  
> **Date:** May 2026  
> **Classification:** Internal — Confidential

---

## Executive Summary

CtrlChecks is a production-grade AI workflow automation platform with **130+ canonical node types** registered in its unified execution engine. Of these, **~110 nodes are fully integrated and production-ready**, while **11 third-party connection providers** are intentionally gated behind a "Coming Soon" flag on the frontend. This gating is a deliberate, staged rollout strategy — the backend infrastructure and node execution code for these providers is built; however, the respective platforms impose external barriers (paid developer accounts, app review processes, and business verification requirements) that must be resolved before they can be safely exposed to end users.

This document explains every node in the system, how it authenticates, and — for the Coming Soon category — why it is not yet publicly accessible and what the unlock path looks like.

---

## How the Platform Authenticates Nodes

All node credentials are managed through a centralized **Credential Vault** with field-level encryption. Nodes fall into one of three authentication categories:

| Auth Type | How It Works | Examples |
|---|---|---|
| **OAuth 2.0** | User clicks "Connect", completes provider's login flow, receives a scoped access token that CtrlChecks stores and auto-refreshes | Google, Slack, GitHub, Notion, Salesforce |
| **API Key / Token** | User pastes a key from the provider's developer dashboard; key is encrypted and stored in the vault | OpenAI, Anthropic, SendGrid, Twilio, Stripe |
| **Username / Password / Connection String** | User provides database credentials; encrypted and injected at runtime, never stored in workflow JSON | PostgreSQL, MySQL, MongoDB, Redis |

Credentials are **never stored inside workflow JSON**. They are injected by the execution engine's credential resolver at runtime, just before a node fires.

---

## Section 1 — Fully Integrated Nodes

The following nodes are live, credential-wired, and execution-tested.

---

### 1.1 Trigger Nodes

These start a workflow. All are fully implemented.

| Node | What It Does | Auth Required |
|---|---|---|
| `manual_trigger` | User clicks a button in the UI to fire the workflow | None |
| `schedule` | Cron-based schedule (e.g. every Monday at 9 AM) | None |
| `interval` | Fire every N seconds/minutes/hours | None |
| `webhook` | Listens on a generated HTTPS URL for inbound HTTP calls | None (URL-based) |
| `form` | Renders an embeddable form; fires on submission | None |
| `chat_trigger` | Fires when a user sends a chat message in the platform | None |
| `workflow_trigger` | Called by another workflow (child workflow pattern) | None |
| `error_trigger` | Catches errors from upstream nodes and begins a recovery path | None |

---

### 1.2 Core Logic & Control Flow Nodes

These orchestrate the shape of a workflow. All are fully implemented.

| Node | What It Does | Auth Required |
|---|---|---|
| `if_else` | Conditional branch — evaluates a boolean expression, routes to true or false path | None |
| `switch` | Multi-branch routing by value — like a switch/case statement | None |
| `loop` | Iterates over an array, running downstream nodes for each item | None |
| `filter` | Removes items from an array that do not match a condition | None |
| `merge` | Combines results from two parallel branches into one | None |
| `split_in_batches` | Splits a large array into smaller chunks for rate-limit-safe processing | None |
| `wait` / `delay` | Pauses execution for a configurable duration | None |
| `human_approval` | Pauses the workflow and sends an approval request; resumes on user decision | None |
| `stop_and_error` | Terminates the workflow and throws a structured error | None |
| `error_handler` | Catches execution errors with configurable retry count and backoff | None |
| `retry_with_backoff` | Exponential backoff retry wrapper | None |
| `timeout_guard` | Kills a node that exceeds a time limit | None |
| `circuit_breaker` | Prevents cascading failures by halting calls to a failing service | None |
| `escalation_router` | Routes a task to different paths based on severity level | None |
| `fallback_router` | Tries primary path, falls back to secondary on failure | None |
| `workflow_state_manager` | Persists key/value state that survives across workflow runs | None |
| `session_manager` | Tracks session-scoped state within a single workflow run | None |
| `noop` | Pass-through node (useful for visual branching anchors) | None |

---

### 1.3 Data Manipulation Nodes

| Node | What It Does | Auth Required |
|---|---|---|
| `javascript` | Executes custom JavaScript with full access to node input/output data | None |
| `function` | Runs a multi-step transformation function against the data | None |
| `function_item` | Runs a per-item transformation on each element in an array | None |
| `set` / `edit_fields` | Sets, renames, or deletes fields on the data object | None |
| `set_variable` | Stores a value in a named workflow variable accessible downstream | None |
| `json_parser` | Extracts values using JSONPath expressions | None |
| `csv` | Parses CSV text into structured records, or serializes records to CSV | None |
| `text_formatter` | Applies template-based string formatting with field interpolation | None |
| `aggregate` | Computes sum, average, count, min, max, or string join over an array | None |
| `merge_data` | Merges two data sets by a shared key field | None |
| `rename_keys` | Batch-renames object keys | None |
| `sort` | Sorts an array by one or more field values | None |
| `limit` | Truncates an array to a maximum number of items | None |
| `item_lists` | Utilities for flattening, deduplicating, and transforming lists | None |
| `execute_command` | Runs a shell command on the server and captures stdout | None (server-side) |

---

### 1.4 Google Suite Nodes

All Google nodes authenticate via a single **Google OAuth 2.0** connection. Once a user connects their Google account, all Google nodes in any workflow share that credential.

| Node | What It Does |
|---|---|
| `google_gmail` | Send, read, search, label, and delete emails |
| `google_sheets` | Read rows, append rows, update cells, clear ranges |
| `google_drive` | Upload, download, list, move, share, and delete files |
| `google_calendar` | Create, update, delete, and list calendar events |
| `google_doc` | Create and read Google Docs documents |
| `google_forms` | Read form responses |
| `google_contacts` | Create, update, and search contacts |
| `google_tasks` | Create, complete, and list tasks |
| `google_bigquery` | Execute SQL queries against BigQuery datasets |
| `google_cloud_storage` | Upload and download files from GCS buckets |

**Auth:** Google OAuth 2.0 — scopes: `openid`, `email`, `profile`, `gmail`, `drive`, `calendar`, `contacts`, `tasks`

---

### 1.5 AI & Machine Learning Nodes

#### Core LLM Providers

| Node | Provider | Auth |
|---|---|---|
| `openai_gpt` | OpenAI GPT-4o, GPT-4, GPT-3.5 | API Key |
| `anthropic_claude` | Claude 3.5 Sonnet, Claude 3 Opus | API Key |
| `google_gemini` | Gemini 1.5 Pro, Gemini Flash | API Key |
| `azure_openai` | Azure-hosted OpenAI models | API Key + Endpoint |
| `ollama` | Self-hosted local LLM (Llama, Mistral, etc.) | URL (no key) |
| `hugging_face` | Hugging Face Inference API | API Key |
| `cohere` | Cohere Command, Embed | API Key |

#### AI Pipeline Nodes

| Node | What It Does |
|---|---|
| `ai_agent` | Autonomous agent — reasons, uses tools, and loops until task is complete |
| `ai_chat_model` | Single-turn chat completion |
| `llm_chain` | Chains multiple LLM calls with prompt templates |
| `langchain` | LangChain framework integration |
| `text_summarizer` | Summarizes long text using LLM |
| `sentiment_analyzer` | Classifies text sentiment (positive/negative/neutral) |
| `memory` | Stores and retrieves conversation history for stateful chat |
| `embeddings` | Generates vector embeddings from text |
| `vector_store` | Stores and queries embeddings (Pinecone, Qdrant, pgvector) |

#### Specialized Intelligent Agent Nodes

These nodes use an LLM internally to perform domain-specific reasoning tasks.

| Node | What It Does |
|---|---|
| `intent_classification_agent` | Classifies user intent from free-form text |
| `sentiment_analysis_agent` | Fine-grained sentiment with aspect scoring |
| `confidence_scoring_agent` | Assigns a confidence score to a prediction or decision |
| `lead_qualification_agent` | Evaluates and scores inbound leads |
| `lead_scoring_agent` | Numeric lead scoring based on configurable criteria |
| `skill_matching_agent` | Matches candidate skills to job requirements |
| `document_qa_agent` | Answers questions grounded in a provided document |
| `policy_reasoning_agent` | Interprets policy documents and answers compliance questions |
| `compliance_check_agent` | Validates a record against a configurable ruleset |
| `anomaly_detection_agent` | Identifies anomalies in structured data |
| `root_cause_analysis_agent` | Generates root cause hypotheses from logs or telemetry |
| `conversation_summarizer` | Summarizes a conversation transcript |
| `meeting_notes_agent` | Extracts structured notes from a meeting transcript |
| `action_items_extractor` | Pulls action items and owners from text |
| `workflow_planner_agent` | Generates a step-by-step workflow plan from a goal |
| `decision_recommendation_agent` | Recommends an action based on context |
| `multi_agent_coordinator` | Coordinates multiple specialized agents toward a shared goal |
| `agent_role_assigner` | Assigns roles and tasks to agents in a pipeline |
| `agent_voting_consensus` | Runs multiple agents and resolves disagreements by voting |
| `execution_explainer` | Generates a natural language explanation of a workflow run |
| `workflow_summary_generator` | Produces an executive summary of workflow output |

---

### 1.6 Communication & Messaging Nodes

| Node | Provider | Auth |
|---|---|---|
| `slack_message` | Slack — send messages to channels or DMs | OAuth 2.0 |
| `slack_webhook` | Slack — post via incoming webhook URL | Webhook URL |
| `discord` | Discord — send messages to a channel | Bot Token (API Key) |
| `discord_webhook` | Discord — post via webhook URL | Webhook URL |
| `telegram` | Telegram — send messages via Bot API | Bot Token (API Key) |
| `microsoft_teams` | Microsoft Teams — post to a channel | OAuth 2.0 (see Coming Soon note) |
| `zoom_video` | Zoom — create and manage meetings | OAuth 2.0 |
| `mailgun` | Mailgun — transactional email | API Key |
| `sendgrid` | SendGrid — transactional email | API Key |
| `amazon_ses` | AWS Simple Email Service | AWS Access Key + Secret |
| `twilio` | Twilio — SMS and voice calls | API Key (Account SID + Auth Token) |
| `whatsapp_cloud` | WhatsApp Business Cloud API | OAuth 2.0 (Meta App) |
| `email` | Generic SMTP email | SMTP credentials |

---

### 1.7 Database Nodes

All database nodes use encrypted connection credentials; no OAuth.

| Node | Database | Auth |
|---|---|---|
| `postgresql` | PostgreSQL | Connection string or host/user/password |
| `mysql` | MySQL / MariaDB | Connection string or host/user/password |
| `mongodb` | MongoDB Atlas or self-hosted | Connection string |
| `mssql` | Microsoft SQL Server | Connection string |
| `sqlite` | SQLite (file-based) | File path |
| `firebase` | Firebase Firestore / Realtime DB | Service account JSON |
| `redis` | Redis — cache, pub/sub, queues | Host + Port + Password |
| `supabase` | Supabase (Postgres + Auth + Storage) | Project URL + Service Role Key |
| `snowflake` | Snowflake data warehouse | Account + User + Password |
| `timescaledb` | TimescaleDB (time-series Postgres) | Connection string |

---

### 1.8 File & Cloud Storage Nodes

| Node | Provider | Auth |
|---|---|---|
| `aws_s3` | Amazon S3 | AWS Access Key + Secret |
| `google_cloud_storage` | Google Cloud Storage | Google OAuth 2.0 |
| `onedrive` | Microsoft OneDrive / SharePoint | Microsoft OAuth 2.0 |
| `box` | Box cloud storage | OAuth 2.0 |
| `ftp` | FTP server | Username + Password + Host |
| `sftp` | SFTP server | Username + Password/SSH Key + Host |
| `minio` | MinIO (S3-compatible self-hosted) | Access Key + Secret |
| `read_binary_file` | Read a local file from the server filesystem | None |
| `write_binary_file` | Write a local file to the server filesystem | None |

---

### 1.9 Document Intelligence Nodes

| Node | What It Does | Auth |
|---|---|---|
| `document_ocr` | Extracts text from images and PDFs using OCR | API Key (provider varies) |
| `resume_parser` | Extracts structured data from resume/CV files | API Key |
| `invoice_parser` | Extracts line items, totals, and vendor info from invoices | API Key |
| `document_classifier` | Classifies a document into a predefined category | LLM API Key |
| `file_metadata_extractor` | Reads file metadata (size, MIME type, modified date, etc.) | None |
| `pdf` | Merge, split, or extract text from PDF files | None |

---

### 1.10 CRM & Marketing Nodes

| Node | Provider | Auth |
|---|---|---|
| `hubspot` | HubSpot — contacts, deals, companies, emails | OAuth 2.0 |
| `salesforce` | Salesforce — full CRM objects | OAuth 2.0 |
| `zoho_crm` | Zoho CRM — contacts, leads, tasks | API Key |
| `pipedrive` | Pipedrive — deals, persons, organizations | API Token |
| `microsoft_dynamics` | Microsoft Dynamics 365 | OAuth 2.0 |
| `odoo` | Odoo ERP — CRM, inventory, invoicing | API Endpoint + Token |
| `sap` | SAP ERP — business data | API Key |
| `freshdesk` | Freshdesk — support tickets | API Key |
| `intercom` | Intercom — customer messaging | OAuth 2.0 |
| `mailchimp` | Mailchimp — email campaigns, lists | OAuth 2.0 |
| `activecampaign` | ActiveCampaign — email marketing automation | API Key |
| `zendesk` | Zendesk — support tickets | OAuth 2.0 |
| `crm_lead_router` | Smart routing of leads by score, region, or team | LLM API Key |
| `crm_ticket_prioritizer` | AI-based ticket urgency classification | LLM API Key |
| `crm_sla_monitor` | SLA breach detection and alerting | None |
| `crm_duplicate_detector` | Identifies duplicate contact/company records | LLM API Key |

---

### 1.11 DevOps & Engineering Nodes

| Node | Provider | Auth |
|---|---|---|
| `github` | GitHub — repos, issues, PRs, workflows | OAuth 2.0 or Personal Access Token |
| `gitlab` | GitLab — repos, pipelines, MRs | OAuth 2.0 or Personal Access Token |
| `bitbucket` | Bitbucket — repos, pipelines | App Password |
| `jenkins` | Jenkins — trigger builds, get build status | Basic Auth (username + API token) |
| `docker` | Docker — build and manage containers | API Socket / TLS |
| `kubernetes` | Kubernetes — deploy, scale, get pod status | Kubeconfig |
| `vercel` | Vercel — trigger deployments, get status | API Token |
| `netlify` | Netlify — trigger builds, manage deploys | API Token |
| `pagerduty` | PagerDuty — create and resolve incidents | API Key |
| `datadog` | Datadog — metrics, events, monitors | API Key + App Key |
| `sentry` | Sentry — issues, releases, projects | API Token |
| `alert_correlation_engine` | Groups related alerts into a single incident | None |
| `incident_classifier` | Classifies incident severity using AI | LLM API Key |
| `auto_remediation_planner` | Generates a fix plan from an incident description | LLM API Key |
| `postmortem_generator` | Auto-drafts a postmortem from incident timeline | LLM API Key |

---

### 1.12 Social Media Nodes

> **Note:** Social media nodes are fully implemented in the backend. See Section 2 for why some are frontend-gated.

| Node | Provider | Auth |
|---|---|---|
| `twitter` | Twitter/X — post tweets, search timeline | OAuth 2.0 |
| `facebook` | Facebook Pages — post content | OAuth 2.0 (Meta App) |
| `instagram` | Instagram Business — post, stories | OAuth 2.0 (Meta App) |
| `linkedin` | LinkedIn — post articles, share content | OAuth 2.0 |
| `youtube` | YouTube Data API — upload, manage videos | Google OAuth 2.0 |
| `reddit` | Reddit — post and comment | OAuth 2.0 |

---

### 1.13 Productivity & Collaboration Nodes

| Node | Provider | Auth |
|---|---|---|
| `notion` | Notion — databases, pages, blocks | OAuth 2.0 |
| `airtable` | Airtable — bases, tables, records | Personal Access Token |
| `clickup` | ClickUp — tasks, spaces, lists | API Token |
| `asana` | Asana — projects, tasks, teams | OAuth 2.0 |
| `trello` | Trello — boards, cards, lists | API Key + Token |
| `jira` | Jira — issues, sprints, projects | API Token |
| `monday` | Monday.com — boards and items | API Token |
| `todoist` | Todoist — tasks and projects | API Token |
| `calendly` | Calendly — scheduled events | OAuth 2.0 |
| `wordpress` | WordPress — posts, pages, media | Application Password |
| `contentful` | Contentful CMS — content entries | API Key |

---

### 1.14 Payment Nodes

| Node | Provider | Auth |
|---|---|---|
| `razorpay` | Razorpay — payments, refunds, subscriptions | API Key + Secret |
| `chargebee` | Chargebee — subscription billing | API Key |
| `expense_categorizer` | AI-based expense classification | LLM API Key |
| `fraud_detection_node` | Real-time fraud risk scoring | LLM API Key |

---

### 1.15 Utility Nodes

No authentication required for any of these.

| Node | What It Does |
|---|---|
| `date_time` | Parse, format, add/subtract, and compare date/time values |
| `math` | Arithmetic, rounding, random number generation |
| `crypto` | MD5, SHA-256, bcrypt hashing; AES encryption/decryption |
| `html_extract` | CSS-selector-based HTML scraping |
| `xml` | Parse XML to JSON and back |
| `rss_feed_read` | Fetch and parse an RSS/Atom feed |
| `image_manipulation` | Resize, crop, convert format, generate thumbnails |
| `http_request` | Generic HTTP GET/POST/PUT/PATCH/DELETE with full header control |
| `graphql` | Execute GraphQL queries against any endpoint |
| `respond_to_webhook` | Send a structured HTTP response to an inbound webhook |
| `log_output` | Write a structured log entry visible in the execution timeline |

---

### 1.16 Authentication & Identity Nodes

| Node | What It Does | Auth |
|---|---|---|
| `jwt` | Create and validate JSON Web Tokens | Signing secret |
| `oauth2` | Handle OAuth 2.0 client credential or authorization code flows | Client ID + Secret |
| `ldap` | Query and authenticate against LDAP / Active Directory | LDAP credentials |
| `okta` | Okta SSO — user lookup, group management | API Token |
| `auth0` | Auth0 — user management, token validation | API Key |
| `keycloak` | Keycloak — realm management, token introspection | Admin credentials |

---

### 1.17 E-Commerce Nodes

| Node | Provider | Auth |
|---|---|---|
| `woocommerce` | WooCommerce — orders, products, customers | Consumer Key + Secret |
| `magento` | Adobe Magento — catalog, orders | Integration Token |
| `bigcommerce` | BigCommerce — products, orders, customers | API Credentials |

---

## Section 2 — Coming Soon Providers

The following **11 provider connections** are intentionally gated in the frontend UI with a "Coming Soon" badge. This is **not** because the code does not exist — in most cases the backend node implementation, execution logic, and credential handling are built. The gating reflects real external blockers imposed by each platform's developer program, which require either payment, formal business verification, or a multi-week app review process before a live OAuth application can be granted production access.

---

### 2.1 Microsoft (Teams, Outlook, OneDrive, Dynamics)

**Blocker Type: Azure App Registration + Microsoft 365 Developer Verification**

Microsoft requires that any application requesting OAuth 2.0 access to organizational Microsoft 365 data (Teams messages, Outlook email, SharePoint, OneDrive) go through a formal **Microsoft Publisher Verification** process. This involves:

1. Registering the application in the **Azure Active Directory** portal.
2. Verifying the publisher organization via **Microsoft Partner Network (MPN)** — a process that requires a business entity, tax documentation, and typically takes 2–4 weeks.
3. For permissions classified as "admin-restricted" (reading all users' mailboxes, accessing Teams message history), the application must additionally pass **Microsoft's app review**, which is gated on demonstrating a production user base.

Until publisher verification is complete, any user who tries to connect their Microsoft account will see a warning from Microsoft that the app is "unverified," which would damage user trust. The node infrastructure (execution logic, credential vault, OAuth handler) is fully built and tested in staging against our own Microsoft tenant. Unlocking this requires completing the MPN verification and, in parallel, applying for the elevated permission scopes.

**Estimated Unlock Timeline:** 3–6 weeks after initiating MPN verification.

---

### 2.2 Twitter / X

**Blocker Type: Paid Developer Account Required**

Twitter's API access tiers changed dramatically in 2023. Free-tier developer access is now limited to write-only actions (posting tweets) with severe rate limits (1,500 tweets/month). The features our users need — reading timelines, searching tweets, accessing DMs, monitoring mentions — require:

- **Basic tier:** $100/month, gives read access but still limited to 10,000 tweets/month (read)
- **Pro tier:** $5,000/month, gives full read/write with 1,000,000 tweets/month

Additionally, any application handling user OAuth connections (so users can post to their own accounts) requires an approved **Twitter Developer App** with specific callback URLs and intended use case approval. The approval review can take 1–3 weeks.

Our Twitter node (`twitter` in the registry) is fully implemented with OAuth 2.0 PKCE flow and covers tweet creation, timeline reading, and search. The backend route is live. The connection is blocked at the frontend level until we activate the appropriate API tier, at which point the flag is a one-line removal.

**Estimated Unlock Timeline:** 1 week after subscribing to the Basic or Pro plan.

---

### 2.3 Instagram

**Blocker Type: Meta App Review + Business Verification**

Instagram's Graph API (the only API that allows reading and writing Instagram content programmatically) is part of Meta's platform and requires:

1. A **Meta Developer App** approved for the `instagram_basic` and `instagram_content_publish` permissions.
2. **Meta Business Verification** — Meta requires the business to submit legal documents (business registration, address, phone) and typically takes 2–5 business days to verify. However, for sensitive permissions (reading all users' media, accessing Instagram Insights), a full **App Review** is needed, which averages 4–6 weeks.
3. For the Instagram OAuth flow to work for end users (not just the developer's own account), the app must be in **Live Mode**, which is only granted after App Review approval.

The Instagram node is fully implemented. The OAuth route is wired at `/api/oauth/instagram/authorize` and the callback is live. Users can see it works in our own staging environment because our developer account is pre-approved. Enabling it publicly means completing the Meta App Review for each required permission scope.

**Estimated Unlock Timeline:** 4–8 weeks from App Review submission.

---

### 2.4 Dropbox

**Blocker Type: Dropbox Developer App Production Access**

Dropbox apps start in **Development status**, which limits connections to 500 users and requires each user to be explicitly added as a tester. To move to **Production status** (unlimited users), Dropbox requires:

1. Submission of the app for production review.
2. Demonstration of a working OAuth flow with proper handling of token refresh, scopes, and error states.
3. Review of the app's privacy policy, terms of service, and data handling documentation.

The review is not paid but typically takes 1–2 weeks. The Dropbox node is fully implemented (file upload, download, folder listing, sharing) and tested against development-mode Dropbox apps. Unlocking this is a straightforward app submission — no ongoing cost.

**Estimated Unlock Timeline:** 1–2 weeks after submitting the production access request.

---

### 2.5 Stripe

**Blocker Type: Stripe Connect Platform Account + Business Verification**

Stripe offers two integration modes: direct API (users paste their own Stripe API keys) and **Stripe Connect** (CtrlChecks acts as a platform, and users authorize via OAuth). The direct API key mode is already available for users who have their own Stripe account — the `stripe` node in the registry accepts API keys and is execution-ready.

The "Coming Soon" flag applies to the **Stripe OAuth Connect** flow, which requires:

1. Applying for and being approved as a **Stripe Connect platform** — this requires a verified Stripe business account with a real business entity and banking information on file.
2. Completing Stripe's **platform review** process, which assesses the platform's compliance posture, terms of service, and data handling.
3. Stripe imposes a fee structure for Connect platforms that touches payments (not relevant for read-only integrations, but relevant for workflow nodes that create charges or payouts).

**Estimated Unlock Timeline:** 2–4 weeks after completing Stripe's Connect onboarding.

---

### 2.6 PayPal

**Blocker Type: PayPal Partner Program + Sandbox-to-Live Promotion**

PayPal's REST API is available for direct API key usage (Client ID + Secret from the PayPal Developer Dashboard). However, enabling the PayPal OAuth flow so that users can authorize CtrlChecks to act on their PayPal account requires:

1. Enrolling in the **PayPal Partner Program** or **PayPal Commerce Platform** as a third-party platform.
2. Passing PayPal's compliance review, which assesses business registration, use case description, and data security practices.
3. Moving from the PayPal Sandbox environment (where testing works freely) to the **Live environment**, which requires the above.

The PayPal node supports payment creation, refund initiation, and payout management. It is tested in sandbox and execution-ready. The frontend gate is removed once the Partner Program enrollment is approved.

**Estimated Unlock Timeline:** 3–5 weeks for PayPal Partner Program approval.

---

### 2.7 QuickBooks (Intuit)

**Blocker Type: Intuit Developer Program Production Approval**

QuickBooks Online integration via OAuth 2.0 requires an **Intuit Developer** account with a registered app. The catch:

1. Intuit apps start in **Sandbox mode** — free, but limited to Intuit's test QuickBooks companies.
2. Moving to **Production** requires submitting the app for Intuit's review, where they evaluate:
   - The completeness of the OAuth implementation (correct scope handling, token refresh, error pages)
   - A working live demo of the integration
   - Compliance with Intuit's data use policy
3. The review process takes 2–4 weeks and requires back-and-forth with Intuit's developer relations team.

Our QuickBooks node (`intuit_smes` in the registry, 800+ lines) handles invoices, customers, accounts, reports, and payments. It is fully tested in Intuit Sandbox. The blocker is solely the production approval process.

**Estimated Unlock Timeline:** 2–4 weeks after submitting for Intuit production review.

---

### 2.8 Xero

**Blocker Type: Xero App Partner Program**

Xero's OAuth 2.0 API for accounting automation requires app registration through the Xero Developer portal. Standard apps allow unlimited connections, but accessing certain data sets (Payroll, Practice Manager for accounting firms) requires joining the **Xero App Partner program**, which involves:

1. Completing a partner application with business and technical details.
2. Passing Xero's technical review (correct OAuth scopes, token handling, webhook support).
3. Signing the Xero App Partner Agreement.

The standard Xero API (invoices, contacts, bank transactions) does not require the partner program and could be enabled quickly. The partner program is needed for the full feature set we intend to offer. A Xero node is scoped in the registry under the accounting category.

**Estimated Unlock Timeline:** 2–3 weeks for the standard API; 4–8 weeks for full partner access.

---

### 2.9 Shopify

**Blocker Type: Shopify Partner Program + App Store Listing (for OAuth)**

Shopify integrations work in one of two ways: private apps (store-specific, API key) or public apps (OAuth-based, listed on the App Store). For CtrlChecks workflows to connect to any user's Shopify store, a public app with OAuth is required:

1. Creating the app in the **Shopify Partner Dashboard** (free).
2. Configuring the required API access scopes and redirect URIs.
3. For apps accessing sensitive scopes (customer data, order management, metafields), Shopify requires a **security review** before the app can request those scopes from real merchants.
4. Full App Store listing (optional for CtrlChecks, which can distribute the app via direct install link) still benefits from Shopify's verification process for credibility.

The `shopify` node is implemented covering products, orders, customers, inventory, and webhooks. It works in development mode against Shopify Partner test stores today. The frontend is gated until we complete the scopes review for customer-data-touching permissions.

**Estimated Unlock Timeline:** 1–2 weeks for the basic permission set; 4–6 weeks if the security review for sensitive scopes is required.

---

### 2.10 WooCommerce

**Blocker Type: Self-Hosting Dependency + API Key Complexity**

WooCommerce does not have a centralized OAuth server (it is a WordPress plugin, so every store is self-hosted). There is no single "authorize your WooCommerce store" OAuth flow that works universally. Instead, each user must:

1. Install WooCommerce REST API on their WordPress site.
2. Generate a **Consumer Key + Consumer Secret** from their WooCommerce dashboard.
3. Provide these credentials to CtrlChecks.

This model works and the `woocommerce` node in the registry is fully implemented (orders, products, customers, coupons). The "Coming Soon" label reflects a UX decision: the credential flow for WooCommerce is substantially more complex (users need to navigate their own WordPress admin) and we are building a dedicated guided onboarding flow for it before exposing it broadly to ensure low setup failure rates.

**Estimated Unlock Timeline:** 2–3 weeks — no external blocker, internal UX work only.

---

### 2.11 Typeform

**Blocker Type: Typeform OAuth Application Approval**

Typeform's API provides access to form responses, submissions, and workspace management. OAuth access requires:

1. Registering a **Typeform Developer Application** via the Typeform Admin console.
2. Applications for public distribution (not just personal use) go through a short review confirming intended use case and redirect URL legitimacy.
3. Workspace-level access (reading forms across an organization, not just the authorizing user) requires additional scope approval.

The `typeform` node is fully implemented (fetch responses, list forms, delete entries). Our internal Typeform Developer App is registered and working in development. The frontend gate is pending final Typeform review approval.

**Estimated Unlock Timeline:** 1–2 weeks.

---

## Section 3 — Integration Summary Table

| Provider / Category | Node Count | Auth Method | Status |
|---|---|---|---|
| **Trigger Nodes** | 8 | None | ✅ Live |
| **Core Logic / Control Flow** | 18 | None | ✅ Live |
| **Data Manipulation** | 15 | None | ✅ Live |
| **Utility Nodes** | 10 | None | ✅ Live |
| **Google Suite** | 10 | OAuth 2.0 | ✅ Live |
| **AI / LLM Providers** | 8 core + 21 agent | API Key | ✅ Live |
| **Slack** | 2 | OAuth 2.0 | ✅ Live |
| **Discord** | 2 | Bot Token | ✅ Live |
| **Telegram** | 1 | Bot Token | ✅ Live |
| **WhatsApp Cloud** | 1 | OAuth 2.0 (Meta) | ✅ Live |
| **Email (Mailgun, SendGrid, SES)** | 3 | API Key | ✅ Live |
| **Twilio** | 1 | API Key | ✅ Live |
| **Databases (9 engines)** | 10 | Credentials | ✅ Live |
| **AWS S3 / Cloud Storage** | 2 | API Key | ✅ Live |
| **GitHub / GitLab / Bitbucket** | 3 | OAuth 2.0 / Token | ✅ Live |
| **Notion** | 1 | OAuth 2.0 | ✅ Live |
| **Airtable** | 1 | API Token | ✅ Live |
| **HubSpot** | 1 | OAuth 2.0 | ✅ Live |
| **Salesforce** | 1 | OAuth 2.0 | ✅ Live |
| **Zoho / Pipedrive / Odoo** | 3 | API Key | ✅ Live |
| **Mailchimp / ActiveCampaign** | 2 | OAuth 2.0 / API Key | ✅ Live |
| **LinkedIn** | 1 | OAuth 2.0 | ✅ Live |
| **YouTube** | 1 | Google OAuth 2.0 | ✅ Live |
| **Razorpay / Chargebee** | 2 | API Key | ✅ Live |
| **Jenkins / Vercel / Netlify** | 3 | API Token | ✅ Live |
| **PagerDuty / Datadog / Sentry** | 3 | API Key | ✅ Live |
| **ClickUp / Asana / Trello / Jira** | 4 | API Key / OAuth 2.0 | ✅ Live |
| **Zendesk / Freshdesk / Intercom** | 3 | OAuth 2.0 / API Key | ✅ Live |
| **WooCommerce / Magento / BigCommerce** | 3 | API Key | ✅ Live |
| **Auth (JWT, OAuth2, LDAP, Okta)** | 6 | Varies | ✅ Live |
| **Document Intelligence** | 5 | API Key / None | ✅ Live |
| **FTP / SFTP** | 2 | Credentials | ✅ Live |
| **SMTP Email** | 1 | SMTP Credentials | ✅ Live |
| **Microsoft (Teams, Outlook, Dynamics)** | 3 | OAuth 2.0 | ⏳ Coming Soon |
| **Twitter / X** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **Instagram** | 1 | OAuth 2.0 (Meta) | ⏳ Coming Soon |
| **Facebook** | 1 | OAuth 2.0 (Meta) | ⏳ Coming Soon |
| **Dropbox** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **Stripe** | 1 | OAuth 2.0 / API Key | ⏳ Coming Soon |
| **PayPal** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **QuickBooks** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **Xero** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **Shopify** | 1 | OAuth 2.0 | ⏳ Coming Soon |
| **Typeform** | 1 | OAuth 2.0 | ⏳ Coming Soon |

**Total Fully Live Nodes:** ~110+  
**Coming Soon (External Blocker):** 11 providers, ~12 nodes  
**Coming Soon (Internal UX Work Only):** WooCommerce OAuth flow

---

## Section 4 — Architecture Notes for Technical Investors

### Single Source of Truth
All node behavior — input schema, output schema, credential requirements, and execution logic — is defined exactly once in `worker/src/core/registry/unified-node-registry.ts`. There are no `if (node.type === '...')` conditionals scattered across the codebase. Every node added automatically gains execution validation, credential injection, and DAG orchestration support.

### Credential Security Model
- Credentials are encrypted at the field level before storage in the database.
- Credentials are **never stored inside workflow JSON** — they are injected at runtime by the credential resolver milliseconds before a node fires.
- OAuth access tokens are automatically refreshed on expiry using the stored refresh token.
- Sensitive fields are masked in all API responses visible to the frontend.

### DAG Execution Engine
The workflow execution engine performs a topological sort of the node graph before each run, validates that no cycles exist, and executes nodes in dependency order. Outputs from each node are passed to downstream nodes via a `{{$json.field}}` template resolution system. Branching nodes (`if_else`, `switch`) evaluate their condition and activate only the matching downstream path, deactivating the other, so no unintended nodes run.

### Scalability Path
The current architecture executes workflows synchronously within a single worker process (suitable for the current user scale). The node execution interface is already abstracted (`nodeDef.execute(context)`) in a way that is compatible with a queue-based, horizontally-scaled execution model. Migrating to a BullMQ or Temporal-backed execution layer would require no changes to any node implementation — only the execution runner.

---

*This document reflects the platform state as of May 2026. Node counts and integration statuses will be updated with each release.*
