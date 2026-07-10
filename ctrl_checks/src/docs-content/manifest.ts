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
    "description": "Executes workflow on a time-based schedule using cron expressions Use this node when a workflow needs schedule trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/schedule.svg"
  },
  {
    "slug": "webhook",
    "displayName": "Webhook Trigger",
    "category": "Triggers",
    "description": "Executes workflow when HTTP request is received Use this node when a workflow needs webhook trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/webhook.svg"
  },
  {
    "slug": "manual_trigger",
    "displayName": "Manual Trigger",
    "category": "Triggers",
    "description": "Workflow executes when user manually triggers it Use this node when a workflow needs manual trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "description": "Trigger workflow from chat/AI interactions Use this node when a workflow needs chat trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/chat_trigger.svg"
  },
  {
    "slug": "form",
    "displayName": "Form Trigger",
    "category": "Triggers",
    "description": "Trigger workflow when user submits a form Use this node when a workflow needs form trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/form.svg"
  },
  {
    "slug": "http_request",
    "displayName": "HTTP Request",
    "category": "Utility",
    "description": "Makes HTTP requests to external APIs or services Use this node when a workflow needs http request behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/http_request.svg"
  },
  {
    "slug": "respond_to_webhook",
    "displayName": "Respond to Webhook",
    "category": "Utility",
    "description": "Sends HTTP response back to webhook caller Use this node when a workflow needs respond to webhook behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/respond_to_webhook.svg"
  },
  {
    "slug": "postgresql",
    "displayName": "PostgreSQL",
    "category": "Data",
    "description": "Execute SQL queries on PostgreSQL database Use this node when a workflow needs postgresql behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "slug": "database_read",
    "displayName": "Database Read",
    "category": "Data",
    "description": "Read data from database using SQL queries Use this node when a workflow needs database read behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/database_read.svg"
  },
  {
    "slug": "database_write",
    "displayName": "Database Write",
    "category": "Data",
    "description": "Execute SQL queries on database (INSERT, UPDATE, DELETE) Use this node when a workflow needs database write behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/database_write.svg"
  },
  {
    "slug": "google_sheets",
    "displayName": "Google Sheets",
    "category": "Data",
    "description": "Read, write, append, or update data in Google Sheets Use this node when a workflow needs google sheets behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_sheets.svg"
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
    "description": "Send/receive emails via Microsoft Outlook API (OAuth) Use this node when a workflow needs outlook behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/outlook.svg"
  },
  {
    "slug": "salesforce",
    "displayName": "Salesforce",
    "category": "Data",
    "description": "Work with Salesforce objects (Account, Contact, Lead, Opportunity, etc.) using REST/SOQL/SOSL Use this node when a workflow needs salesforce behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/salesforce.svg"
  },
  {
    "slug": "microsoft_dynamics",
    "displayName": "Microsoft Dynamics",
    "category": "Data",
    "description": "Manage CRM data in Microsoft Dynamics 365 (contacts, leads, accounts, opportunities, and more) via the Web API Use this node when a workflow needs microsoft dynamics behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/microsoft_dynamics.svg"
  },
  {
    "slug": "sap",
    "displayName": "SAP",
    "category": "Data",
    "description": "Interact with SAP systems via OData/REST APIs — read and write business objects such as sales orders, purchase orders, materials, customers, and more. Use this node when a workflow needs sap behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sap.svg"
  },
  {
    "slug": "clickup",
    "displayName": "ClickUp",
    "category": "Utility",
    "description": "Create, read, and manage ClickUp tasks, lists, spaces, and workspaces. Use this node when a workflow needs clickup behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/clickup.svg"
  },
  {
    "slug": "set_variable",
    "displayName": "Set Variable",
    "category": "Data",
    "description": "Set a variable with a name and value Use this node when a workflow needs set variable behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/set_variable.svg"
  },
  {
    "slug": "javascript",
    "displayName": "JavaScript",
    "category": "Data",
    "description": "Execute custom JavaScript code Use this node when a workflow needs javascript behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/javascript.svg"
  },
  {
    "slug": "function",
    "displayName": "Function",
    "category": "Logic",
    "description": "Execute a custom function with input parameters Use this node when a workflow needs function behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/function.svg"
  },
  {
    "slug": "function_item",
    "displayName": "Function Item",
    "category": "Logic",
    "description": "Execute a function for each item in an array Use this node when a workflow needs function item behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/function_item.svg"
  },
  {
    "slug": "date_time",
    "displayName": "Date/Time",
    "category": "Data",
    "description": "Parse, format, and manipulate dates and times Use this node when a workflow needs date/time behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/date_time.svg"
  },
  {
    "slug": "text_formatter",
    "displayName": "Text Formatter",
    "category": "Data",
    "description": "Format text strings with templates and placeholders Use this node when a workflow needs text formatter behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/text_formatter.svg"
  },
  {
    "slug": "if_else",
    "displayName": "If/Else",
    "category": "Logic",
    "description": "Conditional branching based on true/false condition Use this node when a workflow needs if/else behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/if_else.svg"
  },
  {
    "slug": "switch",
    "displayName": "Switch",
    "category": "Logic",
    "description": "Multi-path conditional logic based on value matching Use this node when a workflow needs switch behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/switch.svg"
  },
  {
    "slug": "merge",
    "displayName": "Merge",
    "category": "Logic",
    "description": "Merge multiple branches of data Use this node when a workflow needs merge behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/merge.svg"
  },
  {
    "slug": "error_handler",
    "displayName": "Error Handler",
    "category": "Logic",
    "description": "Handle errors with retry logic and fallback values Use this node when a workflow needs error handler behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/error_handler.svg"
  },
  {
    "slug": "wait",
    "displayName": "Wait",
    "category": "Logic",
    "description": "Pause workflow execution Use this node when a workflow needs wait behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "category": "Logic",
    "description": "Fails the workflow if execution takes longer than specified time Use this node when a workflow needs timeout behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/timeout.svg"
  },
  {
    "slug": "return",
    "displayName": "Return",
    "category": "Logic",
    "description": "Stops workflow execution and returns the specified data Use this node when a workflow needs return behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/return.svg"
  },
  {
    "slug": "execute_workflow",
    "displayName": "Execute Workflow",
    "category": "Logic",
    "description": "Executes another workflow and returns its result Use this node when a workflow needs execute workflow behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/execute_workflow.svg"
  },
  {
    "slug": "try_catch",
    "displayName": "Try/Catch",
    "category": "Logic",
    "description": "Executes a branch and catches errors, routing to error handler Use this node when a workflow needs try/catch behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/try_catch.svg"
  },
  {
    "slug": "retry",
    "displayName": "Retry",
    "category": "Logic",
    "description": "Retries a branch on failure up to a maximum number of attempts Use this node when a workflow needs retry behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/retry.svg"
  },
  {
    "slug": "parallel",
    "displayName": "Parallel",
    "category": "Logic",
    "description": "Runs multiple branches concurrently and waits for all to complete Use this node when a workflow needs parallel behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "description": "AI service node for prompt-based text generation and reasoning Use this node when a workflow needs ai agent behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/ai_agent.svg"
  },
  {
    "slug": "ai_chat_model",
    "displayName": "AI Chat Model",
    "category": "AI",
    "description": "Call Gemini 3.5 Flash directly to generate a response (uses GEMINI_API_KEY) Use this node when a workflow needs ai chat model behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/ai_chat_model.svg"
  },
  {
    "slug": "slack_message",
    "displayName": "Slack",
    "category": "Communication",
    "description": "Send messages to Slack channels or users Use this node when a workflow needs slack behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/slack_message.svg"
  },
  {
    "slug": "email",
    "displayName": "Email",
    "category": "Communication",
    "description": "Send emails via SMTP Use this node when a workflow needs email behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/email.svg"
  },
  {
    "slug": "log_output",
    "displayName": "Log Output",
    "category": "Communication",
    "description": "Log data to console or file Use this node when a workflow needs log output behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/log_output.svg"
  },
  {
    "slug": "telegram",
    "displayName": "Telegram",
    "category": "Communication",
    "description": "Send messages to Telegram chats using Telegram Bot API Use this node when a workflow needs telegram behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "category": "Data",
    "description": "HubSpot CRM operations - create, update, retrieve, or search contacts, companies, deals, tickets, and other objects Use this node when a workflow needs hubspot behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/hubspot.svg"
  },
  {
    "slug": "airtable",
    "displayName": "Airtable",
    "category": "Data",
    "description": "Read, write, update, or delete records in Airtable bases and tables Use this node when a workflow needs airtable behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "slug": "zoho_crm",
    "displayName": "Zoho CRM",
    "category": "Data",
    "description": "Zoho CRM operations - work with modules, records, and related lists Use this node when a workflow needs zoho crm behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/zoho_crm.svg"
  },
  {
    "slug": "pipedrive",
    "displayName": "Pipedrive",
    "category": "Data",
    "description": "Pipedrive CRM operations - manage deals, persons, organizations, and activities Use this node when a workflow needs pipedrive behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/pipedrive.svg"
  },
  {
    "slug": "intuit_smes",
    "displayName": "Intuit - SME'S",
    "category": "Data",
    "description": "Intuit SME integration for managing customer data and financial operations via Intuit APIs Use this node when a workflow needs intuit - sme's behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/intuit_smes.svg"
  },
  {
    "slug": "tally",
    "displayName": "Tally Solutions",
    "category": "Data",
    "description": "Interact with Tally ERP / TallyPrime via XML API to fetch or push accounting data Use this node when a workflow needs tally solutions behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "slug": "zoom_video",
    "displayName": "Zoom Video",
    "category": "Communication",
    "description": "Create and manage Zoom meetings via the Zoom API Use this node when a workflow needs zoom video behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/zoom_video.svg"
  },
  {
    "slug": "json_parser",
    "displayName": "JSON Parser",
    "category": "Data",
    "description": "Parse JSON strings into objects and extract specific fields Use this node when a workflow needs json parser behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/json_parser.svg"
  },
  {
    "slug": "merge_data",
    "displayName": "Merge Data",
    "category": "Data",
    "description": "Merge data structures from multiple sources Use this node when a workflow needs merge data behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/merge_data.svg"
  },
  {
    "slug": "edit_fields",
    "displayName": "Edit Fields",
    "category": "Data",
    "description": "Edit, rename, or transform field values in data objects Use this node when a workflow needs edit fields behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/edit_fields.svg"
  },
  {
    "slug": "error_trigger",
    "displayName": "Error Trigger",
    "category": "Triggers",
    "description": "Trigger workflow when errors occur Use this node when a workflow needs error trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/error_trigger.svg"
  },
  {
    "slug": "workflow_trigger",
    "displayName": "Workflow Trigger",
    "category": "Triggers",
    "description": "Trigger workflow from another workflow Use this node when a workflow needs workflow trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/workflow_trigger.svg"
  },
  {
    "slug": "filter",
    "displayName": "Filter",
    "category": "Logic",
    "description": "Filter array items by condition Use this node when a workflow needs filter behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/filter.svg"
  },
  {
    "slug": "loop",
    "displayName": "Loop",
    "category": "Logic",
    "description": "Iterate over array items with max iterations limit Use this node when a workflow needs loop behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/loop.svg"
  },
  {
    "slug": "noop",
    "displayName": "NoOp",
    "category": "Logic",
    "description": "Pass through node - no operation Use this node when a workflow needs noop behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/noop.svg"
  },
  {
    "slug": "set",
    "displayName": "Set",
    "category": "Data",
    "description": "Set/override multiple fields on the current item Use this node when a workflow needs set behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/set.svg"
  },
  {
    "slug": "split_in_batches",
    "displayName": "Split In Batches",
    "category": "Logic",
    "description": "Split array into batches for processing Use this node when a workflow needs split in batches behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/split_in_batches.svg"
  },
  {
    "slug": "stop_and_error",
    "displayName": "Stop And Error",
    "category": "Logic",
    "description": "Stop workflow execution with error message Use this node when a workflow needs stop and error behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/stop_and_error.svg"
  },
  {
    "slug": "math",
    "displayName": "Math",
    "category": "Data",
    "description": "Mathematical operations and calculations Use this node when a workflow needs math behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/math.svg"
  },
  {
    "slug": "html",
    "displayName": "HTML",
    "category": "Data",
    "description": "Parse and manipulate HTML content Use this node when a workflow needs html behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/html.svg"
  },
  {
    "slug": "xml",
    "displayName": "XML",
    "category": "Data",
    "description": "Parse and manipulate XML content Use this node when a workflow needs xml behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/xml.svg"
  },
  {
    "slug": "csv",
    "displayName": "CSV",
    "category": "Data",
    "description": "Parse and generate CSV data Use this node when a workflow needs csv behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/csv.svg"
  },
  {
    "slug": "rename_keys",
    "displayName": "Rename Keys",
    "category": "Data",
    "description": "Rename object keys Use this node when a workflow needs rename keys behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/rename_keys.svg"
  },
  {
    "slug": "aggregate",
    "displayName": "Aggregate",
    "category": "Data",
    "description": "Aggregate data Use this node when a workflow needs aggregate behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/aggregate.svg"
  },
  {
    "slug": "sort",
    "displayName": "Sort",
    "category": "Data",
    "description": "Sort arrays Use this node when a workflow needs sort behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sort.svg"
  },
  {
    "slug": "limit",
    "displayName": "Limit",
    "category": "Data",
    "description": "Limit array size Use this node when a workflow needs limit behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/limit.svg"
  },
  {
    "slug": "openai_gpt",
    "displayName": "OpenAI GPT",
    "category": "AI",
    "description": "OpenAI GPT chat completion (GPT-4, GPT-3.5) Use this node when a workflow needs openai gpt behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/openai_gpt.svg"
  },
  {
    "slug": "anthropic_claude",
    "displayName": "Claude",
    "category": "AI",
    "description": "Anthropic Claude chat completion Use this node when a workflow needs claude behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/anthropic_claude.svg"
  },
  {
    "slug": "google_gemini",
    "displayName": "Gemini",
    "category": "AI",
    "description": "Google Gemini chat completion Use this node when a workflow needs gemini behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_gemini.svg"
  },
  {
    "slug": "ollama",
    "displayName": "AI Chat (Gemini)",
    "category": "AI",
    "description": "AI chat completion using Gemini 3.5 Flash (default LLM) Use this node when a workflow needs ai chat (gemini) behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/ollama.svg"
  },
  {
    "slug": "text_summarizer",
    "displayName": "Text Summarizer",
    "category": "AI",
    "description": "Summarize long text into shorter versions Use this node when a workflow needs text summarizer behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/text_summarizer.svg"
  },
  {
    "slug": "sentiment_analyzer",
    "displayName": "Sentiment Analyzer",
    "category": "AI",
    "description": "Analyze sentiment and emotions in text Use this node when a workflow needs sentiment analyzer behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sentiment_analyzer.svg"
  },
  {
    "slug": "chat_model",
    "displayName": "Chat Model",
    "category": "AI",
    "description": "Chat model connector for AI Agent node (uses Gemini 3.5 Flash by default) Use this node when a workflow needs chat model behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/chat_model.svg"
  },
  {
    "slug": "memory",
    "displayName": "Memory",
    "category": "AI",
    "description": "Memory storage for AI Agent context Use this node when a workflow needs memory behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/memory.svg"
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
    "category": "Utility",
    "description": "Send POST requests with JSON data Use this node when a workflow needs http post behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/http_post.svg"
  },
  {
    "slug": "webhook_response",
    "displayName": "Webhook Response",
    "category": "Utility",
    "description": "Send response to webhook request Use this node when a workflow needs webhook response behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/webhook_response.svg"
  },
  {
    "slug": "graphql",
    "displayName": "GraphQL",
    "category": "Utility",
    "description": "Make GraphQL requests Use this node when a workflow needs graphql behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "slug": "google_calendar",
    "displayName": "Google Calendar",
    "category": "Data",
    "description": "Create, read, update calendar events Use this node when a workflow needs google calendar behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_calendar.svg"
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
    "description": "Send messages to Microsoft Teams Use this node when a workflow needs microsoft teams behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/microsoft_teams.svg"
  },
  {
    "slug": "whatsapp_cloud",
    "displayName": "WhatsApp Cloud",
    "category": "Communication",
    "description": "Send messages via WhatsApp Cloud API Use this node when a workflow needs whatsapp cloud behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/whatsapp_cloud.svg"
  },
  {
    "slug": "twilio",
    "displayName": "Twilio",
    "category": "Communication",
    "description": "Send SMS/Voice via Twilio Use this node when a workflow needs twilio behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/twilio.svg"
  },
  {
    "slug": "mailgun",
    "displayName": "Mailgun",
    "category": "Communication",
    "description": "Send transactional emails using the Mailgun API. Use this node when a workflow needs mailgun behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/mailgun.svg"
  },
  {
    "slug": "sendgrid",
    "displayName": "SendGrid",
    "category": "Communication",
    "description": "Send transactional emails using the SendGrid API. Use this node when a workflow needs sendgrid behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sendgrid.svg"
  },
  {
    "slug": "amazon_ses",
    "displayName": "Amazon SES",
    "category": "Communication",
    "description": "Send emails through Amazon Simple Email Service (SES) Use this node when a workflow needs amazon ses behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "slug": "whatsapp",
    "displayName": "WhatsApp",
    "category": "Communication",
    "description": "Send messages, manage contacts and conversations via WhatsApp Business API Use this node when a workflow needs whatsapp behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/whatsapp.svg"
  },
  {
    "slug": "whatsapp_trigger",
    "displayName": "WhatsApp Trigger",
    "category": "Triggers",
    "description": "Trigger workflows on WhatsApp events: message received, delivered, read, conversation created Use this node when a workflow needs whatsapp trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/whatsapp_trigger.svg"
  },
  {
    "slug": "instagram_trigger",
    "displayName": "Instagram Trigger",
    "category": "Triggers",
    "description": "Trigger workflows on Instagram events: new DM, comment, mention, postback Use this node when a workflow needs instagram trigger behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/instagram_trigger.svg"
  },
  {
    "slug": "mysql",
    "displayName": "MySQL",
    "category": "Data",
    "description": "MySQL database operations Use this node when a workflow needs mysql behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/mysql.svg"
  },
  {
    "slug": "mongodb",
    "displayName": "MongoDB",
    "category": "Data",
    "description": "MongoDB database operations Use this node when a workflow needs mongodb behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/mongodb.svg"
  },
  {
    "slug": "firebase",
    "displayName": "Firebase",
    "category": "Data",
    "description": "Interact with Firebase Firestore and Realtime Database Use this node when a workflow needs firebase behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/firebase.svg"
  },
  {
    "slug": "google_cloud_storage",
    "displayName": "Google Cloud Storage",
    "category": "Data",
    "description": "Interact with Google Cloud Storage buckets (upload, download, delete, list) Use this node when a workflow needs google cloud storage behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/google_cloud_storage.svg"
  },
  {
    "slug": "redis",
    "displayName": "Redis",
    "category": "Data",
    "description": "Redis cache operations Use this node when a workflow needs redis behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/redis.svg"
  },
  {
    "slug": "odoo",
    "displayName": "Odoo",
    "category": "Data",
    "description": "Interact with Odoo ERP system (customers, invoices, products, and more) Use this node when a workflow needs odoo behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/odoo.svg"
  },
  {
    "slug": "freshdesk",
    "displayName": "Freshdesk",
    "category": "Data",
    "description": "Freshdesk support operations Use this node when a workflow needs freshdesk behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/freshdesk.svg"
  },
  {
    "slug": "intercom",
    "displayName": "Intercom",
    "category": "Data",
    "description": "Intercom messaging operations Use this node when a workflow needs intercom behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/intercom.svg"
  },
  {
    "slug": "mailchimp",
    "displayName": "Mailchimp",
    "category": "Data",
    "description": "Mailchimp email marketing operations Use this node when a workflow needs mailchimp behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/mailchimp.svg"
  },
  {
    "slug": "activecampaign",
    "displayName": "ActiveCampaign",
    "category": "Data",
    "description": "ActiveCampaign marketing automation Use this node when a workflow needs activecampaign behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/activecampaign.svg"
  },
  {
    "slug": "read_binary_file",
    "displayName": "Read Binary File",
    "category": "Data",
    "description": "Read binary files Use this node when a workflow needs read binary file behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/read_binary_file.svg"
  },
  {
    "slug": "write_binary_file",
    "displayName": "Write Binary File",
    "category": "Data",
    "description": "Write binary files Use this node when a workflow needs write binary file behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/write_binary_file.svg"
  },
  {
    "slug": "aws_s3",
    "displayName": "AWS S3",
    "category": "Data",
    "description": "AWS S3 storage operations Use this node when a workflow needs aws s3 behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/aws_s3.svg"
  },
  {
    "slug": "dropbox",
    "displayName": "Dropbox",
    "category": "Data",
    "description": "Dropbox file operations Use this node when a workflow needs dropbox behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/dropbox.svg"
  },
  {
    "slug": "onedrive",
    "displayName": "OneDrive",
    "category": "Data",
    "description": "OneDrive file operations Use this node when a workflow needs onedrive behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/onedrive.svg"
  },
  {
    "slug": "ftp",
    "displayName": "FTP",
    "category": "Data",
    "description": "FTP file operations Use this node when a workflow needs ftp behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/ftp.svg"
  },
  {
    "slug": "sftp",
    "displayName": "SFTP",
    "category": "Data",
    "description": "SFTP file operations Use this node when a workflow needs sftp behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sftp.svg"
  },
  {
    "slug": "github",
    "displayName": "GitHub",
    "category": "Data",
    "description": "GitHub repository operations Use this node when a workflow needs github behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/github.svg"
  },
  {
    "slug": "gitlab",
    "displayName": "GitLab",
    "category": "Data",
    "description": "GitLab repository operations Use this node when a workflow needs gitlab behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/gitlab.svg"
  },
  {
    "slug": "bitbucket",
    "displayName": "Bitbucket",
    "category": "Data",
    "description": "Bitbucket repository operations Use this node when a workflow needs bitbucket behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/bitbucket.svg"
  },
  {
    "slug": "jira",
    "displayName": "Jira",
    "category": "Data",
    "description": "Jira issue tracking operations Use this node when a workflow needs jira behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/jira.svg"
  },
  {
    "slug": "jenkins",
    "displayName": "Jenkins",
    "category": "Data",
    "description": "Jenkins CI/CD operations Use this node when a workflow needs jenkins behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/jenkins.svg"
  },
  {
    "slug": "shopify",
    "displayName": "Shopify",
    "category": "Data",
    "description": "Shopify store operations Use this node when a workflow needs shopify behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/shopify.svg"
  },
  {
    "slug": "woocommerce",
    "displayName": "WooCommerce",
    "category": "Data",
    "description": "WooCommerce store operations Use this node when a workflow needs woocommerce behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/woocommerce.svg"
  },
  {
    "slug": "stripe",
    "displayName": "Stripe",
    "category": "Data",
    "description": "Stripe payment processing Use this node when a workflow needs stripe behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/stripe.svg"
  },
  {
    "slug": "paypal",
    "displayName": "PayPal",
    "category": "Data",
    "description": "PayPal payment processing Use this node when a workflow needs paypal behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/paypal.svg"
  },
  {
    "slug": "vercel",
    "displayName": "Vercel",
    "category": "Data",
    "description": "Deploy projects and manage deployments on Vercel Use this node when a workflow needs vercel behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/vercel.svg"
  },
  {
    "slug": "schedulewise",
    "displayName": "ScheduleWise",
    "category": "Triggers",
    "description": "ScheduleWise appointment scheduling — retrieve, create, update, and delete appointments via the ScheduleWise REST API Use this node when a workflow needs schedulewise behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/schedulewise.svg"
  },
  {
    "slug": "calendly",
    "displayName": "Calendly",
    "category": "Data",
    "description": "Fetch events, event types, scheduled meetings, and user info from Calendly. Use this node when a workflow needs calendly behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/calendly.svg"
  },
  {
    "slug": "chargebee",
    "displayName": "Chargebee",
    "category": "Communication",
    "description": "Create customers, manage subscriptions, and automate billing with Chargebee. Use this node when a workflow needs chargebee behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "description": "Execute SQL and perform select, insert, update, upsert, and delete operations on Oracle Database. Use this node when a workflow needs oracle database behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/oracle_database.svg"
  },
  {
    "slug": "sql_server",
    "displayName": "SQL Server",
    "category": "Data",
    "description": "Connect to and query Microsoft SQL Server databases. Use this node when a workflow needs sql server behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/sql_server.svg"
  },
  {
    "slug": "timescaledb",
    "displayName": "TimescaleDB",
    "category": "Data",
    "description": "Connect to and query TimescaleDB time-series databases (PostgreSQL extension). Use this node when a workflow needs timescaledb behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/timescaledb.svg"
  },
  {
    "slug": "contentful",
    "displayName": "Contentful",
    "category": "Data",
    "description": "Create, read, update, and delete content entries on any Contentful space. Use this node when a workflow needs contentful behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/contentful.svg"
  },
  {
    "slug": "wordpress",
    "displayName": "WordPress",
    "category": "Transformation",
    "description": "Create, read, update, and delete posts on a WordPress site via the WordPress REST API. Use this node when a workflow needs wordpress behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/wordpress.svg"
  },
  {
    "slug": "zendesk",
    "displayName": "Zendesk",
    "category": "Data",
    "description": "Create, read, update, and delete Zendesk support tickets and manage users. Use this node when a workflow needs zendesk behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/zendesk.svg"
  },
  {
    "slug": "netlify",
    "displayName": "Netlify",
    "category": "Data",
    "description": "Deploy sites, manage builds, and query site/deploy data through the Netlify REST API. Use this node when a workflow needs netlify behavior with schema-driven inputs from the CtrlChecks node registry.",
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
    "description": "Upsert, query, and delete vectors in a Pinecone vector database index. Use this node when a workflow needs pinecone behavior with schema-driven inputs from the CtrlChecks node registry.",
    "logoUrl": "/icons/nodes/pinecone.svg"
  },
  {
    "slug": "langchain",
    "displayName": "LangChain",
    "category": "AI",
    "description": "Orchestrate AI chains and agents using LangChain with configurable LLM providers and tools. Use this node when a workflow needs langchain behavior with schema-driven inputs from the CtrlChecks node registry.",
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
