export interface NodeDocManifestItem {
  slug: string;
  displayName: string;
  category: string;
  description: string;
  logoUrl: string;
}

export const nodeDocManifest = [
  {
    "slug": "schedule",
    "displayName": "Schedule Trigger",
    "category": "Triggers",
    "description": "Start a workflow automatically at a planned time. Use Schedule Trigger for daily reports, recurring reminders, weekly exports, and other work that should run without someone pressing Run.",
    "logoUrl": "/icons/nodes/schedule.svg"
  },
  {
    "slug": "webhook",
    "displayName": "Webhook Trigger",
    "category": "Triggers",
    "description": "Start a workflow when a form, app, website, payment system, or internal service sends data to a generated CtrlChecks webhook URL.",
    "logoUrl": "/icons/nodes/webhook.svg"
  },
  {
    "slug": "manual_trigger",
    "displayName": "Manual Trigger",
    "category": "Triggers",
    "description": "Start a workflow only when a person clicks Run. Use Manual Trigger for testing, approvals, one-off operations, and internal workflows that should not run automatically.",
    "logoUrl": "/icons/nodes/manual_trigger.svg"
  },
  {
    "slug": "interval",
    "displayName": "Interval Trigger",
    "category": "Triggers",
    "description": "Trigger workflow at fixed intervals Use this node when a workflow needs interval trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/interval.svg"
  },
  {
    "slug": "chat_trigger",
    "displayName": "Chat Trigger",
    "category": "Triggers",
    "description": "Start a workflow from the CtrlChecks chat interface. Use Chat Trigger for chatbots, AI assistants, support intake, and guided request flows that should run once for each accepted message.",
    "logoUrl": "/icons/nodes/chat_trigger.svg"
  },
  {
    "slug": "form",
    "displayName": "Form Trigger",
    "category": "Triggers",
    "description": "Build a public CtrlChecks form and start the workflow when someone submits structured answers, files, or intake details.",
    "logoUrl": "/icons/nodes/form.svg"
  },
  {
    "slug": "http_request",
    "displayName": "HTTP Request",
    "category": "HTTP & API",
    "description": "Call an external API or webhook with method, headers, query parameters, optional body data, and timeout control.",
    "logoUrl": "/icons/nodes/http_request.svg"
  },
  {
    "slug": "respond_to_webhook",
    "displayName": "Respond to Webhook",
    "category": "HTTP & API",
    "description": "Normalize the statusCode, headers, and body intended for a webhook caller; runtime returns no sent flag.",
    "logoUrl": "/icons/nodes/respond_to_webhook.svg"
  },
  {
    "slug": "postgresql",
    "displayName": "PostgreSQL",
    "category": "Data",
    "description": "Run PostgreSQL executeQuery, insert, update, and delete operations with real runtime fields for connection details, SQL parameters, table data, and row filters.",
    "logoUrl": "/icons/nodes/postgresql.svg"
  },
  {
    "slug": "supabase",
    "displayName": "Supabase",
    "category": "Data",
    "description": "Interact with Supabase (PostgreSQL + realtime + storage) Use this node when a workflow needs supabase behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/supabase.svg"
  },
  {
    "slug": "db",
    "displayName": "Supabase",
    "category": "Data",
    "description": "Canonical UI Supabase node. Supports select, insert, update, delete, and rpc through the Supabase SDK; raw SQL query is not executed by this node.",
    "logoUrl": "/icons/nodes/supabase.svg"
  },
  {
    "slug": "google_sheets",
    "displayName": "Google Sheets",
    "category": "Data",
    "description": "Read, write, append, or update data in Google Sheets Use this node when a workflow needs google sheets behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_sheets.svg"
  },
  {
    "slug": "google_sheets_trigger",
    "displayName": "Google Sheets Trigger",
    "category": "Triggers",
    "description": "Poll a Google Sheet about every two minutes, compare rows against the activation baseline, and start workflows from accepted row_added or row_updated events.",
    "logoUrl": "/integrations-logos/Google-Sheets.svg"
  },
  {
    "slug": "google_doc",
    "displayName": "Google Docs",
    "category": "Data",
    "description": "Read or write content in Google Docs documents Use this node when a workflow needs google docs behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_doc.svg"
  },
  {
    "slug": "google_gmail",
    "displayName": "Gmail",
    "category": "Communication",
    "description": "Send, list, get, and search Gmail messages via Google OAuth. Use this node when a workflow needs Gmail behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/integrations-logos/Gmail.svg"
  },
  {
    "slug": "outlook",
    "displayName": "Outlook",
    "category": "Communication",
    "description": "Send emails via Microsoft Outlook using Microsoft Graph OAuth. Use this node when a workflow needs Outlook email sending with a Microsoft Connection.",
    "logoUrl": "/integrations-logos/Outlook.svg"
  },
  {
    "slug": "outlook_trigger",
    "displayName": "Outlook Trigger",
    "category": "Triggers",
    "description": "Start workflows from new Outlook email or calendar events via Microsoft Graph change notifications.",
    "logoUrl": "/integrations-logos/Outlook.svg"
  },
  {
    "slug": "salesforce",
    "displayName": "Salesforce",
    "category": "CRM",
    "description": "Query (SOQL), search (SOSL), get, create, update, delete, upsert, or bulk-process Salesforce records across any standard or custom object.",
    "logoUrl": "/icons/nodes/salesforce.svg"
  },
  {
    "slug": "microsoft_dynamics",
    "displayName": "Microsoft Dynamics",
    "category": "CRM",
    "description": "Get, list, create, update, or delete Microsoft Dynamics 365 records, or run an advanced FetchXML query, from a workflow.",
    "logoUrl": "/icons/nodes/microsoft_dynamics.svg"
  },
  {
    "slug": "sap",
    "displayName": "SAP",
    "category": "CRM",
    "description": "Read and write SAP business objects (sales orders, business partners, materials, and more) via OData v2/v4 and REST APIs, using a direct HTTP-method-based Operation field.",
    "logoUrl": "/icons/nodes/sap.svg"
  },
  {
    "slug": "clickup",
    "displayName": "ClickUp",
    "category": "Productivity",
    "description": "Create, update, read, delete, comment on, and discover ClickUp tasks, lists, folders, spaces, and workspaces with raw ClickUp API output.",
    "logoUrl": "/icons/nodes/clickup.svg"
  },
  {
    "slug": "set_variable",
    "displayName": "Set Variable",
    "category": "Data",
    "description": "Create exactly one named output value; every other incoming field is discarded.",
    "logoUrl": "/icons/nodes/set_variable.svg"
  },
  {
    "slug": "javascript",
    "displayName": "JavaScript",
    "category": "Data",
    "description": "Run sandboxed JavaScript against incoming workflow data and return the transformed value for downstream steps.",
    "logoUrl": "/icons/nodes/javascript.svg"
  },
  {
    "slug": "function",
    "displayName": "Function",
    "category": "Logic",
    "description": "Execute custom JavaScript against the incoming item or object. Use this node when a workflow needs function behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/function.svg"
  },
  {
    "slug": "function_item",
    "displayName": "Function Item",
    "category": "Logic",
    "description": "Execute custom JavaScript once for each item in input.items. Use this node when a workflow needs function item behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/function_item.svg"
  },
  {
    "slug": "date_time",
    "displayName": "Date/Time",
    "category": "Data",
    "description": "Create, format, offset, compare, and inspect date/time values.",
    "logoUrl": "/icons/nodes/date_time.svg"
  },
  {
    "slug": "text_formatter",
    "displayName": "Text Formatter",
    "category": "Data",
    "description": "Render text from a template and current workflow data.",
    "logoUrl": "/icons/nodes/text_formatter.svg"
  },
  {
    "slug": "if_else",
    "displayName": "If/Else",
    "category": "Logic",
    "description": "Make a yes-or-no workflow decision from previous-step data and route matching work to TRUE or FALSE.",
    "logoUrl": "/icons/nodes/if_else.svg"
  },
  {
    "slug": "switch",
    "displayName": "Switch",
    "category": "Logic",
    "description": "Route workflow runs into several named paths by matching one incoming value against case values.",
    "logoUrl": "/icons/nodes/switch.svg"
  },
  {
    "slug": "merge",
    "displayName": "Merge",
    "category": "Logic",
    "description": "Rejoin multiple workflow paths and combine their data into one output for the next step.",
    "logoUrl": "/icons/nodes/merge.svg"
  },
  {
    "slug": "error_handler",
    "displayName": "Error Handler",
    "category": "Logic",
    "description": "Mark an upstream error as handled and optionally emit a fallback value. Use this node when a workflow needs error handler behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/error_handler.svg"
  },
  {
    "slug": "wait",
    "displayName": "Wait",
    "category": "Logic",
    "description": "Pause for a fixed duration, cap long waits at 5 minutes, and pass the incoming workflow data through unchanged.",
    "logoUrl": "/icons/nodes/wait.svg"
  },
  {
    "slug": "delay",
    "displayName": "Delay",
    "category": "Utility",
    "description": "Pause the workflow execution for a specified amount of time Use this node when a workflow needs delay behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/delay.svg"
  },
  {
    "slug": "timeout",
    "displayName": "Timeout",
    "category": "Flow",
    "description": "Route a workflow path to success or timeout based on elapsed workflow time.",
    "logoUrl": "/icons/nodes/timeout.svg"
  },
  {
    "slug": "return",
    "displayName": "Return",
    "category": "Flow",
    "description": "Stop the current workflow path and emit success, __return, and returnedValue.",
    "logoUrl": "/icons/nodes/return.svg"
  },
  {
    "slug": "execute_workflow",
    "displayName": "Execute Workflow",
    "category": "Workflow",
    "description": "Call a confirmed or active child workflow, pass input, and return success, result, workflowId, or error.",
    "logoUrl": "/icons/nodes/execute_workflow.svg"
  },
  {
    "slug": "try_catch",
    "displayName": "Try/Catch",
    "category": "Flow",
    "description": "Mark try/catch routing, preserve input, and provide catch metadata for routed errors.",
    "logoUrl": "/icons/nodes/try_catch.svg"
  },
  {
    "slug": "retry",
    "displayName": "Retry",
    "category": "Flow",
    "description": "Pass input through while attaching maxAttempts, delayBetween, and backoff retry settings.",
    "logoUrl": "/icons/nodes/retry.svg"
  },
  {
    "slug": "parallel",
    "displayName": "Parallel",
    "category": "Flow",
    "description": "Pass data through while recording the parallel orchestration mode.",
    "logoUrl": "/icons/nodes/parallel.svg"
  },
  {
    "slug": "queue_push",
    "displayName": "Queue Push",
    "category": "Utility",
    "description": "Push a message to a queue Use this node when a workflow needs queue push behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/queue_push.svg"
  },
  {
    "slug": "queue_consume",
    "displayName": "Queue Consume",
    "category": "Utility",
    "description": "Consume a message from a queue (waits for next message) Use this node when a workflow needs queue consume behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/queue_consume.svg"
  },
  {
    "slug": "cache_get",
    "displayName": "Cache Get",
    "category": "Utility",
    "description": "Retrieve a value from cache by key Use this node when a workflow needs cache get behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/cache_get.svg"
  },
  {
    "slug": "cache_set",
    "displayName": "Cache Set",
    "category": "Utility",
    "description": "Store a value in cache with optional TTL Use this node when a workflow needs cache set behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/cache_set.svg"
  },
  {
    "slug": "ai_agent",
    "displayName": "AI Agent",
    "category": "AI",
    "description": "Run a prompt-driven AI agent that extracts user input from workflow data, calls the selected LLM provider, and returns structured response fields.",
    "logoUrl": "/icons/nodes/ai_agent.svg"
  },
  {
    "slug": "ai_chat_model",
    "displayName": "AI Chat Model",
    "category": "AI",
    "description": "Call the platform Gemini chat path directly and return response plus model while preserving incoming fields.",
    "logoUrl": "/icons/nodes/ai_chat_model.svg"
  },
  {
    "slug": "slack_message",
    "displayName": "Slack Message",
    "category": "Communication",
    "description": "Send Slack bot messages to channels, direct messages, or threads through a saved Slack OAuth2 connection, with optional Block Kit layout and threaded replies.",
    "logoUrl": "/icons/nodes/slack_message.svg"
  },
  {
    "slug": "slack_trigger",
    "displayName": "Slack Trigger",
    "category": "Triggers",
    "description": "Start workflows from real-time Slack app mentions, messages, slash commands, and interaction callbacks.",
    "logoUrl": "/integrations-logos/Slack.svg"
  },
  {
    "slug": "email",
    "displayName": "Send Email (SMTP)",
    "category": "Communication",
    "description": "Send plain-text or HTML email through a saved SMTP Account connection.",
    "logoUrl": "/icons/nodes/email.svg"
  },
  {
    "slug": "log_output",
    "displayName": "Log Output",
    "category": "Utility",
    "description": "Write a labeled checkpoint message to the workflow execution log for debugging, monitoring, and audit trails. This is always a terminal node — it cannot have an outgoing connection to any other node.",
    "logoUrl": "/icons/nodes/log_output.svg"
  },
  {
    "slug": "telegram",
    "displayName": "Telegram",
    "category": "Communication",
    "description": "Send Telegram text messages, media URLs, and message edits through a saved Telegram Bot Token connection.",
    "logoUrl": "/icons/nodes/telegram.svg"
  },
  {
    "slug": "telegram_trigger",
    "displayName": "Telegram Trigger",
    "category": "Triggers",
    "description": "Start a workflow in real time when your Telegram bot receives a message or supported update.",
    "logoUrl": "/icons/nodes/telegram.svg"
  },
  {
    "slug": "linkedin",
    "displayName": "LinkedIn",
    "category": "Communication",
    "description": "Post content to LinkedIn, manage LinkedIn profile and company pages Use this node when a workflow needs linkedin behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/linkedin.svg"
  },
  {
    "slug": "twitter",
    "displayName": "Twitter/X",
    "category": "Communication",
    "description": "Post tweets, manage Twitter account Use this node when a workflow needs twitter/x behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/twitter.svg"
  },
  {
    "slug": "instagram",
    "displayName": "Instagram",
    "category": "Communication",
    "description": "Publish content, send DMs, moderate comments via Instagram Graph API Use this node when a workflow needs instagram behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/instagram.svg"
  },
  {
    "slug": "youtube",
    "displayName": "YouTube",
    "category": "Communication",
    "description": "Read, upload, update, and delete YouTube videos with the connected user's YouTube OAuth account.",
    "logoUrl": "/icons/nodes/youtube.svg"
  },
  {
    "slug": "hubspot",
    "displayName": "HubSpot",
    "category": "CRM",
    "description": "Get, list, create, update, delete, search, or bulk-create HubSpot CRM contacts, companies, deals, and tickets from a workflow.",
    "logoUrl": "/icons/nodes/hubspot.svg"
  },
  {
    "slug": "airtable",
    "displayName": "Airtable",
    "category": "Data",
    "description": "List, get, create, update, upsert, and delete Airtable records. Returns records/count, id/fields, deletedRecords/count, or created/updated counts depending on operation.",
    "logoUrl": "/icons/nodes/airtable.svg"
  },
  {
    "slug": "notion",
    "displayName": "Notion",
    "category": "Data",
    "description": "Read, write, update, or delete pages, databases, and blocks in Notion Use this node when a workflow needs notion behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/notion.svg"
  },
  {
    "slug": "linear",
    "displayName": "Linear",
    "category": "Productivity",
    "description": "Create, update, fetch, and list Linear issues and teams.",
    "logoUrl": "/icons/nodes/linear.svg"
  },
  {
    "slug": "linear_trigger",
    "displayName": "Linear Trigger",
    "category": "Triggers",
    "description": "Start a workflow from signed Linear webhook events for issues, comments, projects, cycles, labels, reactions, documents, initiatives, customers, and users.",
    "logoUrl": "/icons/nodes/linear.svg"
  },
  {
    "slug": "trello",
    "displayName": "Trello",
    "category": "Productivity",
    "description": "Manage Trello boards, lists, cards, labels, movement, and checklists.",
    "logoUrl": "/icons/nodes/trello.svg"
  },
  {
    "slug": "trello_trigger",
    "displayName": "Trello Trigger",
    "category": "Triggers",
    "description": "Start a workflow from signed Trello webhook events for cards, lists, comments, members, and checklists.",
    "logoUrl": "/icons/nodes/trello.svg"
  },
  {
    "slug": "zoho_crm",
    "displayName": "Zoho CRM",
    "category": "CRM",
    "description": "Get, create, update, delete, search, or upsert Zoho CRM records across standard and custom modules via OAuth2. Only 6 of the 9 dropdown operations are currently implemented.",
    "logoUrl": "/icons/nodes/zoho_crm.svg"
  },
  {
    "slug": "pipedrive",
    "displayName": "Pipedrive",
    "category": "CRM",
    "description": "Get, list, create, update, delete, or search Pipedrive deals, persons, organizations, and more.",
    "logoUrl": "/icons/nodes/pipedrive.svg"
  },
  {
    "slug": "intuit_smes",
    "displayName": "Intuit - SME'S",
    "category": "CRM",
    "description": "Mock/demo Intuit SME node for prototyping customer and invoice workflow shapes. Does not currently call the real Intuit/QuickBooks API.",
    "logoUrl": "/icons/nodes/intuit_smes.svg"
  },
  {
    "slug": "tally",
    "displayName": "Tally Solutions",
    "category": "CRM",
    "description": "Connect directly to Tally ERP / TallyPrime's local XML API gateway to read ledgers, vouchers, stock items, and company info, or create new accounting vouchers.",
    "logoUrl": "/icons/nodes/tally.svg"
  },
  {
    "slug": "discord",
    "displayName": "Discord",
    "category": "Communication",
    "description": "Send messages to Discord channels via a Discord bot token. Use this node when a workflow needs Discord Bot API access with a channel ID.",
    "logoUrl": "/integrations-logos/Discord.svg"
  },
  {
    "slug": "discord_trigger",
    "displayName": "Discord Trigger",
    "category": "Triggers",
    "description": "Start workflows from Discord slash commands, interactions, modal submissions, message-like events, and supported Discord Webhook Events with signature validation and filtering guidance.",
    "logoUrl": "/integrations-logos/Discord.svg"
  },
  {
    "slug": "zoom_video",
    "displayName": "Zoom Video",
    "category": "Communication",
    "description": "Create, list, read, update, and delete Zoom meetings with a saved Zoom OAuth2 connection, including meeting ID, schedule, output, and permission guidance.",
    "logoUrl": "/icons/nodes/zoom_video.svg"
  },
  {
    "slug": "json_parser",
    "displayName": "JSON Parser",
    "category": "Data",
    "description": "Parse a JSON string into workflow data.",
    "logoUrl": "/icons/nodes/json_parser.svg"
  },
  {
    "slug": "merge_data",
    "displayName": "Merge Data",
    "category": "Data",
    "description": "Combine data arriving from multiple workflow branches.",
    "logoUrl": "/icons/nodes/merge_data.svg"
  },
  {
    "slug": "edit_fields",
    "displayName": "Edit Fields",
    "category": "Data",
    "description": "Add, overwrite, or normalize fields on the current item using simple key-value mappings.",
    "logoUrl": "/icons/nodes/edit_fields.svg"
  },
  {
    "slug": "error_trigger",
    "displayName": "Error Trigger",
    "category": "Triggers",
    "description": "Start an error-handling path when another node in the same workflow fails. Use Error Trigger for failure logs, operations alerts, incident tickets, and recovery workflows.",
    "logoUrl": "/icons/nodes/error_trigger.svg"
  },
  {
    "slug": "workflow_trigger",
    "displayName": "Workflow Trigger",
    "category": "Triggers",
    "description": "Start this reusable child workflow when an allowed parent workflow calls it with an Execute Workflow node.",
    "logoUrl": "/icons/nodes/workflow_trigger.svg"
  },
  {
    "slug": "filter",
    "displayName": "Filter",
    "category": "Logic",
    "description": "Keep only records in a list that match a rule, then pass the smaller list to the next step.",
    "logoUrl": "/icons/nodes/filter.svg"
  },
  {
    "slug": "loop",
    "displayName": "Loop",
    "category": "Logic",
    "description": "Expose an array downstream with max-iteration metadata; current DAG runtime does not run the next branch once per item.",
    "logoUrl": "/icons/nodes/loop.svg"
  },
  {
    "slug": "noop",
    "displayName": "NoOp",
    "category": "Logic",
    "description": "Pass data through unchanged.",
    "logoUrl": "/icons/nodes/noop.svg"
  },
  {
    "slug": "set",
    "displayName": "Set",
    "category": "Data",
    "description": "Add or overwrite fields on the current workflow item so later steps can use predictable data names.",
    "logoUrl": "/icons/nodes/set.svg"
  },
  {
    "slug": "split_in_batches",
    "displayName": "Split In Batches",
    "category": "Logic",
    "description": "Divide an incoming array into smaller batch groups and expose batch metadata for downstream steps.",
    "logoUrl": "/icons/nodes/split_in_batches.svg"
  },
  {
    "slug": "stop_and_error",
    "displayName": "Stop And Error",
    "category": "Logic",
    "description": "Intentionally fail the workflow by throwing ERROR_CODE: message, with no structured success output.",
    "logoUrl": "/icons/nodes/stop_and_error.svg"
  },
  {
    "slug": "math",
    "displayName": "Math",
    "category": "Data",
    "description": "Run numeric operations on values from the current workflow item.",
    "logoUrl": "/icons/nodes/math.svg"
  },
  {
    "slug": "html",
    "displayName": "HTML",
    "category": "Data",
    "description": "Parse HTML, extract selector text, or convert body content to plain text.",
    "logoUrl": "/icons/nodes/html.svg"
  },
  {
    "slug": "xml",
    "displayName": "XML",
    "category": "Data",
    "description": "Parse, extract from, or validate XML content.",
    "logoUrl": "/icons/nodes/xml.svg"
  },
  {
    "slug": "csv",
    "displayName": "CSV",
    "category": "Data",
    "description": "Parse CSV text into rows/items or generate CSV text from object arrays.",
    "logoUrl": "/icons/nodes/csv.svg"
  },
  {
    "slug": "rename_keys",
    "displayName": "Rename Keys",
    "category": "Data",
    "description": "Rename fields on the current workflow item.",
    "logoUrl": "/icons/nodes/rename_keys.svg"
  },
  {
    "slug": "aggregate",
    "displayName": "Aggregate",
    "category": "Data",
    "description": "Aggregate input.items with sum, average, count, min, max, or join.",
    "logoUrl": "/icons/nodes/aggregate.svg"
  },
  {
    "slug": "sort",
    "displayName": "Sort",
    "category": "Data",
    "description": "Sort the input items array.",
    "logoUrl": "/icons/nodes/sort.svg"
  },
  {
    "slug": "limit",
    "displayName": "Limit",
    "category": "Data",
    "description": "Keep only the first N items from an array.",
    "logoUrl": "/icons/nodes/limit.svg"
  },
  {
    "slug": "openai_gpt",
    "displayName": "OpenAI GPT",
    "category": "AI",
    "description": "Calls OpenAI through the legacy LLM adapter and returns response, model, usage, and finishReason without preserving incoming fields.",
    "logoUrl": "/icons/nodes/openai_gpt.svg"
  },
  {
    "slug": "anthropic_claude",
    "displayName": "Anthropic Claude",
    "category": "AI",
    "description": "Call Anthropic Claude through the legacy LLM adapter and return response, model, usage, and finish reason.",
    "logoUrl": "/icons/nodes/anthropic_claude.svg"
  },
  {
    "slug": "google_gemini",
    "displayName": "Google Gemini",
    "category": "AI",
    "description": "Call Google Gemini through the LLM adapter and return response, model, usage, and finish reason.",
    "logoUrl": "/icons/nodes/google_gemini.svg"
  },
  {
    "slug": "ollama",
    "displayName": "AI Chat (Gemini)",
    "category": "AI",
    "description": "Legacy Ollama slug that delegates to Gemini 3.5 Flash through AI Chat Model; not a local Ollama call.",
    "logoUrl": "/icons/nodes/ollama.svg"
  },
  {
    "slug": "text_summarizer",
    "displayName": "Text Summarizer",
    "category": "AI",
    "description": "Summarizes text through Gemini and returns the summary in response while preserving incoming fields.",
    "logoUrl": "/icons/nodes/text_summarizer.svg"
  },
  {
    "slug": "sentiment_analyzer",
    "displayName": "Sentiment Analyzer",
    "category": "AI",
    "description": "Analyzes sentiment through Gemini and returns parsed sentiment data inside response, not as top-level fields.",
    "logoUrl": "/icons/nodes/sentiment_analyzer.svg"
  },
  {
    "slug": "chat_model",
    "displayName": "Chat Model",
    "category": "AI",
    "description": "UI-visible but backend-internal support node that returns static Gemini chat model configuration and does not call an AI provider.",
    "logoUrl": "/icons/nodes/chat_model.svg"
  },
  {
    "slug": "cohere",
    "displayName": "Cohere",
    "category": "AI",
    "description": "Send a prompt to Cohere Command chat models and return generated text plus finish reason and token counts.",
    "logoUrl": "/icons/nodes/cohere.svg"
  },
  {
    "slug": "huggingface",
    "displayName": "Hugging Face",
    "category": "AI",
    "description": "Call a Hugging Face inference model and return preserved input fields plus success, model, response, output, and error.",
    "logoUrl": "/icons/nodes/huggingface.svg"
  },
  {
    "slug": "memory",
    "displayName": "Memory",
    "category": "AI",
    "description": "Pass sessionId, context, and incoming messages forward for AI workflows; current runtime does not persist, retrieve, clear, or search memory.",
    "logoUrl": "/icons/nodes/memory.svg"
  },
  {
    "slug": "mistral",
    "displayName": "Mistral AI",
    "category": "AI",
    "description": "Call Mistral chat completions and return preserved input fields plus success, model, response, inputTokens, outputTokens, and error.",
    "logoUrl": "/icons/nodes/mistral.svg"
  },
  {
    "slug": "tool",
    "displayName": "Tool",
    "category": "AI",
    "description": "Tool connector for AI Agent to use external functions Use this node when a workflow needs tool behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/tool.svg"
  },
  {
    "slug": "http_post",
    "displayName": "HTTP POST",
    "category": "HTTP & API",
    "description": "Send workflow data to an external endpoint by rewriting to HTTP Request with method POST.",
    "logoUrl": "/icons/nodes/http_post.svg"
  },
  {
    "slug": "webhook_response",
    "displayName": "Webhook Response",
    "category": "HTTP & API",
    "description": "Return the statusCode, headers, and body intended for an incoming webhook caller.",
    "logoUrl": "/icons/nodes/webhook_response.svg"
  },
  {
    "slug": "graphql",
    "displayName": "GraphQL",
    "category": "HTTP & API",
    "description": "Send GraphQL queries and mutations as HTTP POST requests with variables, headers, operationName, and timeout control.",
    "logoUrl": "/icons/nodes/graphql.svg"
  },
  {
    "slug": "google_drive",
    "displayName": "Google Drive",
    "category": "Data",
    "description": "Google Drive file operations (upload, download, list) Use this node when a workflow needs google drive behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_drive.svg"
  },
  {
    "slug": "google_drive_trigger",
    "displayName": "Google Drive Trigger",
    "category": "Triggers",
    "description": "Register a Google Drive push notification channel, sync changed file metadata from the Drive changes feed, and start workflows from accepted file_changed or file_deleted updates.",
    "logoUrl": "/integrations-logos/Google-Drive.svg"
  },
  {
    "slug": "google_calendar",
    "displayName": "Google Calendar",
    "category": "Data",
    "description": "Create, read, update calendar events Use this node when a workflow needs google calendar behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_calendar.svg"
  },
  {
    "slug": "google_calendar_trigger",
    "displayName": "Google Calendar Trigger",
    "category": "Triggers",
    "description": "Register a Google Calendar push notification channel, incrementally sync changed events, and start workflows from accepted event_changed or event_cancelled updates.",
    "logoUrl": "/integrations-logos/Google-Calender.svg"
  },
  {
    "slug": "google_contacts",
    "displayName": "Google Contacts",
    "category": "Data",
    "description": "Manage Google Contacts Use this node when a workflow needs google contacts behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_contacts.svg"
  },
  {
    "slug": "google_tasks",
    "displayName": "Google Tasks",
    "category": "Data",
    "description": "Manage Google Tasks Use this node when a workflow needs google tasks behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_tasks.svg"
  },
  {
    "slug": "google_bigquery",
    "displayName": "Google BigQuery",
    "category": "Data",
    "description": "Query Google BigQuery data warehouse Use this node when a workflow needs google bigquery behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_bigquery.svg"
  },
  {
    "slug": "slack_webhook",
    "displayName": "Slack Webhook",
    "category": "Communication",
    "description": "Send messages via Slack webhook Use this node when a workflow needs slack webhook behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/slack_webhook.svg"
  },
  {
    "slug": "discord_webhook",
    "displayName": "Discord Webhook",
    "category": "Communication",
    "description": "Send messages to a Discord channel via a saved incoming webhook URL connection.",
    "logoUrl": "/integrations-logos/Discord.svg"
  },
  {
    "slug": "microsoft_teams",
    "displayName": "Microsoft Teams",
    "category": "Communication",
    "description": "Send Microsoft Teams channel notifications through an Incoming Webhook or reply to Microsoft Teams Trigger conversations through Bot Framework.",
    "logoUrl": "/integrations-logos/Microsoft-Teams.svg"
  },
  {
    "slug": "microsoft_teams_trigger",
    "displayName": "Microsoft Teams Trigger",
    "category": "Triggers",
    "description": "Start workflows from Microsoft Teams bot messages and activities.",
    "logoUrl": "/integrations-logos/Microsoft-Teams.svg"
  },
  {
    "slug": "gmail_trigger",
    "displayName": "Gmail Trigger",
    "category": "Triggers",
    "description": "Start workflows from watched Gmail mailbox changes delivered through Google Cloud Pub/Sub push notifications.",
    "logoUrl": "/integrations-logos/Gmail.svg"
  },
  {
    "slug": "whatsapp_cloud",
    "displayName": "WhatsApp Cloud (Deprecated)",
    "category": "Communication",
    "description": "Deprecated — sends a plain WhatsApp text message. Kept only so existing saved workflows that already reference this node type keep working; do not add this node to new workflows. Use the WhatsApp node instead.",
    "logoUrl": "/icons/nodes/whatsapp_cloud.svg"
  },
  {
    "slug": "twilio",
    "displayName": "Twilio",
    "category": "Communication",
    "description": "Send an SMS or MMS text message through Twilio using a saved Twilio Account Credentials connection (Account SID + Auth Token).",
    "logoUrl": "/icons/nodes/twilio.svg"
  },
  {
    "slug": "mailgun",
    "displayName": "Mailgun",
    "category": "Communication",
    "description": "Send transactional emails through Mailgun using a saved API key, sending domain, and region.",
    "logoUrl": "/integrations-logos/Mailgun.svg"
  },
  {
    "slug": "sendgrid",
    "displayName": "SendGrid",
    "category": "Communication",
    "description": "Send a one-off transactional email through SendGrid's Mail Send API using a saved API Key connection. This node supports only From/To/Subject/Text/HTML — SendGrid features like CC/BCC, Reply-To, attachments, categories, and Dynamic Templates are not implemented here.",
    "logoUrl": "/icons/nodes/sendgrid.svg"
  },
  {
    "slug": "amazon_ses",
    "displayName": "Amazon SES",
    "category": "Communication",
    "description": "Send transactional or templated emails through Amazon Simple Email Service (SES) using a saved AWS Access Key connection, with automatic retry on temporary AWS errors.",
    "logoUrl": "/integrations-logos/Amazon-SES.svg"
  },
  {
    "slug": "facebook",
    "displayName": "Facebook",
    "category": "Communication",
    "description": "Post content to Facebook pages Use this node when a workflow needs facebook behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/facebook.svg"
  },
  {
    "slug": "facebook_trigger",
    "displayName": "Facebook Page/Messenger Trigger",
    "category": "Triggers",
    "description": "Start workflows from real-time Facebook Page messages, comments, mentions, postbacks, lead ads, and feed updates through Meta webhooks.",
    "logoUrl": "/icons/nodes/facebook_trigger.svg"
  },
  {
    "slug": "whatsapp",
    "displayName": "WhatsApp",
    "category": "Communication",
    "description": "Send WhatsApp messages, media, locations, contact cards, templates, and interactive buttons/lists through the WhatsApp Business Cloud API, and manage contacts, conversations, templates, campaigns, and AI Agent assistance for advanced or AI-generated workflows.",
    "logoUrl": "/icons/nodes/whatsapp.svg"
  },
  {
    "slug": "whatsapp_trigger",
    "displayName": "WhatsApp Trigger",
    "category": "Triggers",
    "description": "Start a workflow in real time from Meta WhatsApp Cloud incoming messages and status webhooks.",
    "logoUrl": "/icons/nodes/whatsapp_trigger.svg"
  },
  {
    "slug": "instagram_trigger",
    "displayName": "Instagram Trigger",
    "category": "Triggers",
    "description": "Start workflows from real-time Instagram DMs, comments, mentions, story replies, and postbacks through Meta webhooks.",
    "logoUrl": "/icons/nodes/instagram_trigger.svg"
  },
  {
    "slug": "mysql",
    "displayName": "MySQL",
    "category": "Data",
    "description": "Run MySQL executeQuery, insert, update, and delete operations with connection fields, SQL parameters, table data, and safe row filters.",
    "logoUrl": "/icons/nodes/mysql.svg"
  },
  {
    "slug": "mongodb",
    "displayName": "MongoDB",
    "category": "Data",
    "description": "Run MongoDB driver operations against collections. Supports find, inserts, updates, deletes, and aggregate with runtime outputs such as documents, insertedId, modifiedCount, and deletedCount.",
    "logoUrl": "/icons/nodes/mongodb.svg"
  },
  {
    "slug": "firebase",
    "displayName": "Firebase",
    "category": "Data",
    "description": "Run Firebase Admin SDK operations for Firestore documents/queries and Realtime Database get/set paths with service account credentials.",
    "logoUrl": "/icons/nodes/firebase.svg"
  },
  {
    "slug": "google_cloud_storage",
    "displayName": "Google Cloud Storage",
    "category": "Data",
    "description": "Upload, download, delete, and list Google Cloud Storage bucket objects using service account projectId, clientEmail, and privateKey fields.",
    "logoUrl": "/icons/nodes/google_cloud_storage.svg"
  },
  {
    "slug": "redis",
    "displayName": "Redis",
    "category": "Data",
    "description": "Read, write, delete, increment, and manage Redis keys, hashes, lists, TTLs, and custom commands from a workflow.",
    "logoUrl": "/icons/nodes/redis.svg"
  },
  {
    "slug": "odoo",
    "displayName": "Odoo",
    "category": "CRM",
    "description": "Search, read, create, update, or delete records in any Odoo model, or call a custom Odoo method, via JSON-RPC.",
    "logoUrl": "/icons/nodes/odoo.svg"
  },
  {
    "slug": "freshdesk",
    "displayName": "Freshdesk",
    "category": "CRM",
    "description": "Get, list, create, update, or delete Freshdesk tickets, contacts, and companies from a workflow.",
    "logoUrl": "/icons/nodes/freshdesk.svg"
  },
  {
    "slug": "intercom",
    "displayName": "Intercom",
    "category": "CRM",
    "description": "List Intercom conversations, fetch one conversation, or reply to a conversation.",
    "logoUrl": "/icons/nodes/intercom.svg"
  },
  {
    "slug": "mailchimp",
    "displayName": "Mailchimp",
    "category": "CRM",
    "description": "Add or remove a Mailchimp list member, or trigger sending an existing campaign.",
    "logoUrl": "/icons/nodes/mailchimp.svg"
  },
  {
    "slug": "activecampaign",
    "displayName": "ActiveCampaign",
    "category": "CRM",
    "description": "Add, update, or delete contacts in ActiveCampaign using your account's API key.",
    "logoUrl": "/icons/nodes/activecampaign.svg"
  },
  {
    "slug": "read_binary_file",
    "displayName": "Read Binary File",
    "category": "File",
    "description": "Read a managed workflow file asset or safe backend binary-storage path and return dataBase64 plus file metadata.",
    "logoUrl": "/icons/nodes/read_binary_file.svg"
  },
  {
    "slug": "write_binary_file",
    "displayName": "Write Binary File",
    "category": "File",
    "description": "Create a managed workflow file asset from base64, a data URL, or plain text for later read, upload, email, or archive steps.",
    "logoUrl": "/icons/nodes/write_binary_file.svg"
  },
  {
    "slug": "aws_s3",
    "displayName": "AWS S3",
    "category": "File",
    "description": "List, download, upload, and delete Amazon S3 objects using bucket, key, prefix, content, and IAM credentials or role-based access.",
    "logoUrl": "/icons/nodes/aws_s3.svg"
  },
  {
    "slug": "dropbox",
    "displayName": "Dropbox",
    "category": "File",
    "description": "List, download, upload, and delete Dropbox files using a saved Dropbox OAuth2 connection or direct legacy access token.",
    "logoUrl": "/icons/nodes/dropbox.svg"
  },
  {
    "slug": "onedrive",
    "displayName": "OneDrive",
    "category": "File",
    "description": "List, download, upload, and delete Microsoft OneDrive files through Microsoft Graph using path, fileId, and upload content.",
    "logoUrl": "/icons/nodes/onedrive.svg"
  },
  {
    "slug": "ftp",
    "displayName": "FTP",
    "category": "File",
    "description": "Transfer files with FTP using get, put, list, and delete operations, host credentials, remote paths, and upload content.",
    "logoUrl": "/icons/nodes/ftp.svg"
  },
  {
    "slug": "sftp",
    "displayName": "SFTP",
    "category": "File",
    "description": "Transfer files securely over SSH/SFTP using get, put, list, and delete with password or private-key authentication.",
    "logoUrl": "/icons/nodes/sftp.svg"
  },
  {
    "slug": "github",
    "displayName": "GitHub",
    "category": "DevOps",
    "description": "Run GitHub repository, issue, pull request, branch, commit, release, workflow, and contributor operations through the connected GitHub account.",
    "logoUrl": "/icons/nodes/github.svg"
  },
  {
    "slug": "gitlab",
    "displayName": "GitLab",
    "category": "DevOps",
    "description": "Read GitLab issues or create new GitLab issues through the GitLab API. Runtime supports only read/list issues and create issue for this action node.",
    "logoUrl": "/icons/nodes/gitlab.svg"
  },
  {
    "slug": "bitbucket",
    "displayName": "Bitbucket",
    "category": "DevOps",
    "description": "Read, create, update, and delete Bitbucket repositories with app-password or OAuth authentication.",
    "logoUrl": "/icons/nodes/bitbucket.svg"
  },
  {
    "slug": "jira",
    "displayName": "Jira",
    "category": "DevOps",
    "description": "Create, read, update, delete, search, transition, and comment on Jira Cloud issues through a Jira API-token connection.",
    "logoUrl": "/icons/nodes/jira.svg"
  },
  {
    "slug": "jenkins",
    "displayName": "Jenkins",
    "category": "DevOps",
    "description": "Trigger Jenkins jobs, check build status, or stop running Jenkins builds using Jenkins API-token credentials.",
    "logoUrl": "/icons/nodes/jenkins.svg"
  },
  {
    "slug": "shopify",
    "displayName": "Shopify",
    "category": "Ecommerce",
    "description": "Read, list, create, update, and delete Shopify Admin API resources. Runtime expects generic resource plus operation values; current visual aliases are documented as unsupported.",
    "logoUrl": "/icons/nodes/shopify.svg"
  },
  {
    "slug": "shopify_trigger",
    "displayName": "Shopify Trigger",
    "category": "Triggers",
    "description": "Start workflows from signed Shopify order, customer, product, checkout, refund, and app uninstall webhooks.",
    "logoUrl": "/integrations-logos/Shopify.svg"
  },
  {
    "slug": "woocommerce",
    "displayName": "WooCommerce",
    "category": "Ecommerce",
    "description": "Read, list, create, update, and delete WooCommerce REST API resources. Runtime reads apiKey/apiSecret and generic id, not the current consumerKey/orderId panel fields.",
    "logoUrl": "/icons/nodes/woocommerce.svg"
  },
  {
    "slug": "stripe",
    "displayName": "Stripe",
    "category": "Ecommerce",
    "description": "Create Stripe PaymentIntents or charges, customers, refunds, subscriptions, invoices, and PaymentIntent lookups with runtime-accurate output shapes.",
    "logoUrl": "/icons/nodes/stripe.svg"
  },
  {
    "slug": "stripe_trigger",
    "displayName": "Stripe Trigger",
    "category": "Triggers",
    "description": "Start workflows from Stripe payment, checkout, invoice, subscription, customer, and refund events via a signed webhook.",
    "logoUrl": "/integrations-logos/Stripe.svg"
  },
  {
    "slug": "paypal",
    "displayName": "PayPal",
    "category": "Ecommerce",
    "description": "Create PayPal Checkout orders and refund PayPal captures. Visible panel operation aliases are currently misaligned with runtime-supported charge/refund values.",
    "logoUrl": "/icons/nodes/paypal.svg"
  },
  {
    "slug": "vercel",
    "displayName": "Vercel",
    "category": "DevOps",
    "description": "Deploy Vercel projects or list deployments through the Vercel v13 deployments API with structured validation errors.",
    "logoUrl": "/icons/nodes/vercel.svg"
  },
  {
    "slug": "schedulewise",
    "displayName": "ScheduleWise",
    "category": "HTTP & API",
    "description": "Read, create, update, and delete ScheduleWise appointments through the ScheduleWise REST API with saved schedulewise credentials or mock mode.",
    "logoUrl": "/icons/nodes/schedulewise.svg"
  },
  {
    "slug": "calendly",
    "displayName": "Calendly",
    "category": "Productivity",
    "description": "Read Calendly user, event type, and scheduled event data through a saved Calendly Personal Access Token connection.",
    "logoUrl": "/integrations-logos/Calendly.svg"
  },
  {
    "slug": "chargebee",
    "displayName": "Chargebee",
    "category": "Payment",
    "description": "Create Chargebee customers, create subscriptions, retrieve customers, and cancel subscriptions. Failures return success:false with a plain error field.",
    "logoUrl": "/icons/nodes/chargebee.svg"
  },
  {
    "slug": "typeform",
    "displayName": "Typeform",
    "category": "Data",
    "description": "Retrieve form responses, create forms, and fetch form definitions using Typeform. Use this node when a workflow needs typeform behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/typeform.svg"
  },
  {
    "slug": "typeform_trigger",
    "displayName": "Typeform Trigger",
    "category": "Triggers",
    "description": "Start workflows from new Typeform form responses via a signed webhook.",
    "logoUrl": "/integrations-logos/Typeform.svg"
  },
  {
    "slug": "tally_trigger",
    "displayName": "Tally Trigger",
    "category": "Triggers",
    "description": "Start workflows from new Tally (tally.so) form submissions via a signed webhook.",
    "logoUrl": "/integrations-logos/Tally.svg"
  },
  {
    "slug": "github_trigger",
    "displayName": "GitHub Trigger",
    "category": "Triggers",
    "description": "Start workflows from signed GitHub repository webhook events such as pushes, issues, pull requests, releases, and comments.",
    "logoUrl": "/integrations-logos/Github.svg"
  },
  {
    "slug": "gitlab_trigger",
    "displayName": "GitLab Trigger",
    "category": "Triggers",
    "description": "Start workflows from GitLab push, issue, merge request, comment, tag push, pipeline, or release events via a project webhook (X-Gitlab-Token shared secret, not HMAC).",
    "logoUrl": "/integrations-logos/Gitlab.svg"
  },
  {
    "slug": "jira_trigger",
    "displayName": "Jira Trigger",
    "category": "Triggers",
    "description": "Start workflows from Jira issue created/updated/deleted or comment created/updated/deleted events via a manually configured webhook (shared secret in the URL, not HMAC).",
    "logoUrl": "/integrations-logos/Jira.svg"
  },
  {
    "slug": "xero",
    "displayName": "Xero",
    "category": "Utility",
    "description": "Create, fetch, update, and search Xero accounting records (contacts, invoices, items, payments, accounts). Use this node when a workflow needs xero behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/xero.svg"
  },
  {
    "slug": "oracle_database",
    "displayName": "Oracle Database",
    "category": "Data",
    "description": "Run Oracle Database select, insert, update, MERGE upsert, delete/truncate/drop, and custom SQL or PL/SQL with bind parameters.",
    "logoUrl": "/icons/nodes/oracle_database.svg"
  },
  {
    "slug": "sql_server",
    "displayName": "SQL Server",
    "category": "Data",
    "description": "Run T-SQL, insert/update/delete rows, and execute stored procedures on Microsoft SQL Server or Azure SQL.",
    "logoUrl": "/icons/nodes/sql_server.svg"
  },
  {
    "slug": "timescaledb",
    "displayName": "TimescaleDB",
    "category": "Data",
    "description": "Run TimescaleDB/PostgreSQL SQL, table writes, deletes, and time-series helpers such as timeBucket, first, and last.",
    "logoUrl": "/icons/nodes/timescaledb.svg"
  },
  {
    "slug": "contentful",
    "displayName": "Contentful",
    "category": "CMS",
    "description": "Create, read, update, and delete Contentful entries through the Content Management API with success/data/error output.",
    "logoUrl": "/icons/nodes/contentful.svg"
  },
  {
    "slug": "wordpress",
    "displayName": "WordPress",
    "category": "CMS",
    "description": "Create, list, update, and permanently delete WordPress posts through the REST API using Application Password Basic Auth.",
    "logoUrl": "/icons/nodes/wordpress.svg"
  },
  {
    "slug": "zendesk",
    "displayName": "Zendesk",
    "category": "CRM",
    "description": "List, fetch, create, update, and delete Zendesk support tickets, or list users, using HTTP Basic Auth against the Zendesk REST API.",
    "logoUrl": "/icons/nodes/zendesk.svg"
  },
  {
    "slug": "netlify",
    "displayName": "Netlify",
    "category": "DevOps",
    "description": "List Netlify sites, inspect sites and deploys, and create deploys through the Netlify REST API.",
    "logoUrl": "/icons/nodes/netlify.svg"
  },
  {
    "slug": "workday",
    "displayName": "Workday",
    "category": "Utility",
    "description": "Read and manage Workday HR, staffing, and organizational data through the Workday REST APIs. Use this node when a workflow needs workday behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/workday.svg"
  },
  {
    "slug": "pinecone",
    "displayName": "Pinecone",
    "category": "Data",
    "description": "Query, upsert, and delete embedding vectors in a Pinecone index, returning real matches and upsert counts for semantic search workflows.",
    "logoUrl": "/icons/nodes/pinecone.svg"
  },
  {
    "slug": "qdrant",
    "displayName": "Qdrant",
    "category": "Data",
    "description": "Query, upsert, and delete vectors in Qdrant collections for semantic search, RAG, recommendations, and AI memory workflows.",
    "logoUrl": "/icons/nodes/qdrant.svg"
  },
  {
    "slug": "langchain",
    "displayName": "LangChain",
    "category": "AI",
    "description": "Call OpenAI or Anthropic through the LangChain node facade and return success, operation, response, steps, and error.",
    "logoUrl": "/icons/nodes/langchain.svg"
  },
  {
    "slug": "lightricks",
    "displayName": "Lightricks LTX-2",
    "category": "AI",
    "description": "Generate videos using Lightricks LTX-2 open-source AI model (text-to-video, image-to-video, and more). Use this node when a workflow needs lightricks ltx-2 behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/lightricks.svg"
  }
] satisfies NodeDocManifestItem[];

export const nodeManifestBySlug = Object.fromEntries(
  nodeDocManifest.map((node) => [node.slug, node])
) as Record<string, NodeDocManifestItem>;

export const nodeManifestByCategory = nodeDocManifest.reduce((acc, node) => {
  if (!acc[node.category]) acc[node.category] = [];
  acc[node.category].push(node);
  return acc;
}, {} as Record<string, NodeDocManifestItem[]>);
