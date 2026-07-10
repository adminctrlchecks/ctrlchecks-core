"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyNodeDefinitionOverrides = applyNodeDefinitionOverrides;
exports.getNodeTypesWithExecuteOverrides = getNodeTypesWithExecuteOverrides;
exports.hasRegistryExecuteOverride = hasRegistryExecuteOverride;
const generated_node_operation_contracts_1 = require("./generated-node-operation-contracts");
const google_gmail_1 = require("./overrides/google-gmail");
const if_else_1 = require("./overrides/if-else");
const log_output_1 = require("./overrides/log-output");
const chat_model_1 = require("./overrides/chat-model");
const database_read_1 = require("./overrides/database-read");
const database_write_1 = require("./overrides/database-write");
const ai_agent_1 = require("./overrides/ai-agent");
const ai_chat_model_1 = require("./overrides/ai-chat-model");
const ollama_1 = require("./overrides/ollama");
const openai_gpt_1 = require("./overrides/openai-gpt");
const anthropic_claude_1 = require("./overrides/anthropic-claude");
const google_gemini_1 = require("./overrides/google-gemini");
const timeout_1 = require("./overrides/timeout");
const try_catch_1 = require("./overrides/try-catch");
const retry_1 = require("./overrides/retry");
const parallel_1 = require("./overrides/parallel");
const manual_trigger_1 = require("./overrides/manual-trigger");
const chat_trigger_1 = require("./overrides/chat-trigger");
const webhook_1 = require("./overrides/webhook");
const schedule_1 = require("./overrides/schedule");
const interval_1 = require("./overrides/interval");
const form_trigger_1 = require("./overrides/form-trigger");
const workflow_trigger_1 = require("./overrides/workflow-trigger");
const error_trigger_1 = require("./overrides/error-trigger");
const switch_1 = require("./overrides/switch");
const set_variable_1 = require("./overrides/set-variable");
const set_1 = require("./overrides/set");
const edit_fields_1 = require("./overrides/edit-fields");
const rename_keys_1 = require("./overrides/rename-keys");
const math_1 = require("./overrides/math");
const wait_1 = require("./overrides/wait");
const delay_1 = require("./overrides/delay");
const return_1 = require("./overrides/return");
const sort_1 = require("./overrides/sort");
const limit_1 = require("./overrides/limit");
const aggregate_1 = require("./overrides/aggregate");
const http_request_1 = require("./overrides/http-request");
const slack_message_1 = require("./overrides/slack-message");
const google_sheets_1 = require("./overrides/google-sheets");
const airtable_1 = require("./overrides/airtable");
const notion_1 = require("./overrides/notion");
const hubspot_1 = require("./overrides/hubspot");
const salesforce_1 = require("./overrides/salesforce");
const pipedrive_1 = require("./overrides/pipedrive");
const activecampaign_1 = require("./overrides/activecampaign");
const mailchimp_1 = require("./overrides/mailchimp");
const intercom_1 = require("./overrides/intercom");
const email_1 = require("./overrides/email");
const telegram_1 = require("./overrides/telegram");
const discord_1 = require("./overrides/discord");
const execute_workflow_1 = require("./overrides/execute-workflow");
const javascript_1 = require("./overrides/javascript");
const text_summarizer_1 = require("./overrides/text-summarizer");
const sentiment_analyzer_1 = require("./overrides/sentiment-analyzer");
const microsoft_teams_1 = require("./overrides/microsoft-teams");
const whatsapp_cloud_1 = require("./overrides/whatsapp-cloud");
const twilio_1 = require("./overrides/twilio");
const mailgun_1 = require("./overrides/mailgun");
const sendgrid_1 = require("./overrides/sendgrid");
const google_doc_1 = require("./overrides/google-doc");
const google_drive_1 = require("./overrides/google-drive");
const google_contacts_1 = require("./overrides/google-contacts");
const google_tasks_1 = require("./overrides/google-tasks");
const google_bigquery_1 = require("./overrides/google-bigquery");
const zoho_1 = require("./overrides/zoho");
const filter_1 = require("./overrides/filter");
const loop_1 = require("./overrides/loop");
const split_in_batches_1 = require("./overrides/split-in-batches");
const http_response_1 = require("./overrides/http-response");
const graphql_1 = require("./overrides/graphql");
const function_1 = require("./overrides/function");
const function_item_1 = require("./overrides/function-item");
const ai_service_1 = require("./overrides/ai-service");
const aws_s3_1 = require("./overrides/aws-s3");
const dropbox_1 = require("./overrides/dropbox");
const onedrive_1 = require("./overrides/onedrive");
const ftp_1 = require("./overrides/ftp");
const sftp_1 = require("./overrides/sftp");
const queue_push_1 = require("./overrides/queue-push");
const queue_consume_1 = require("./overrides/queue-consume");
const cache_get_1 = require("./overrides/cache-get");
const cache_set_1 = require("./overrides/cache-set");
const oauth2_auth_1 = require("./overrides/oauth2-auth");
const api_key_auth_1 = require("./overrides/api-key-auth");
const read_binary_file_1 = require("./overrides/read-binary-file");
const write_binary_file_1 = require("./overrides/write-binary-file");
const postgresql_1 = require("./overrides/postgresql");
const supabase_1 = require("./overrides/supabase");
const mysql_1 = require("./overrides/mysql");
const mongodb_1 = require("./overrides/mongodb");
const firebase_1 = require("./overrides/firebase");
const gcs_1 = require("./overrides/gcs");
const twitter_1 = require("./overrides/twitter");
const instagram_1 = require("./overrides/instagram");
const date_time_1 = require("./overrides/date-time");
const text_formatter_1 = require("./overrides/text-formatter");
const html_1 = require("./overrides/html");
const xml_1 = require("./overrides/xml");
const merge_1 = require("./overrides/merge");
const youtube_1 = require("./overrides/youtube");
const facebook_1 = require("./overrides/facebook");
const linkedin_1 = require("./overrides/linkedin");
const shopify_1 = require("./overrides/shopify");
const woocommerce_1 = require("./overrides/woocommerce");
const stripe_1 = require("./overrides/stripe");
const paypal_1 = require("./overrides/paypal");
const github_1 = require("./overrides/github");
const gitlab_1 = require("./overrides/gitlab");
const bitbucket_1 = require("./overrides/bitbucket");
const clickup_1 = require("./overrides/clickup");
const outlook_1 = require("./overrides/outlook");
const memory_1 = require("./overrides/memory");
const tool_1 = require("./overrides/tool");
const whatsapp_1 = require("./overrides/whatsapp");
const whatsapp_trigger_1 = require("./overrides/whatsapp-trigger");
const instagram_trigger_1 = require("./overrides/instagram-trigger");
const intuit_smes_1 = require("./overrides/intuit-smes");
const tally_1 = require("./overrides/tally");
const odoo_1 = require("./overrides/odoo");
const zoom_video_1 = require("./overrides/zoom-video");
const microsoft_dynamics_1 = require("./overrides/microsoft-dynamics");
const sap_1 = require("./overrides/sap");
const vercel_1 = require("./overrides/vercel");
const jenkins_1 = require("./overrides/jenkins");
const schedulewise_1 = require("./overrides/schedulewise");
// ── Previously-unregistered node overrides ──────────────────────────────────
const calendly_1 = require("./overrides/calendly");
const chargebee_1 = require("./overrides/chargebee");
const typeform_1 = require("./overrides/typeform");
const xero_1 = require("./overrides/xero");
const oracle_database_1 = require("./overrides/oracle-database");
const contentful_node_1 = require("./overrides/contentful-node");
const wordpress_1 = require("./overrides/wordpress");
const zendesk_node_1 = require("./overrides/zendesk-node");
const netlify_1 = require("./overrides/netlify");
const workday_1 = require("./overrides/workday");
const pinecone_1 = require("./overrides/pinecone");
const qdrant_1 = require("./overrides/qdrant");
const cohere_1 = require("./overrides/cohere");
const langchain_1 = require("./overrides/langchain");
const lightricks_1 = require("./overrides/lightricks");
const overridesByType = {
    google_gmail: google_gmail_1.overrideGoogleGmail,
    if_else: if_else_1.overrideIfElse,
    log_output: log_output_1.overrideLogOutput,
    chat_model: chat_model_1.overrideChatModel,
    database_read: database_read_1.overrideDatabaseRead,
    database_write: database_write_1.overrideDatabaseWrite,
    ai_agent: ai_agent_1.overrideAiAgent,
    ai_chat_model: ai_chat_model_1.overrideAiChatModel,
    ollama: ollama_1.overrideOllama,
    openai_gpt: openai_gpt_1.overrideOpenAiGpt,
    anthropic_claude: anthropic_claude_1.overrideAnthropicClaude,
    google_gemini: google_gemini_1.overrideGoogleGemini,
    timeout: timeout_1.overrideTimeout,
    try_catch: try_catch_1.overrideTryCatch,
    retry: retry_1.overrideRetry,
    parallel: parallel_1.overrideParallel,
    // ✅ NEWLY MIGRATED NODES
    manual_trigger: manual_trigger_1.overrideManualTrigger,
    chat_trigger: chat_trigger_1.overrideChatTrigger,
    webhook: webhook_1.overrideWebhook,
    schedule: schedule_1.overrideSchedule,
    interval: interval_1.overrideInterval,
    // Form Trigger schema uses library type `form` (see createFormTriggerSchema); `form_trigger` is the workflow node alias.
    form: form_trigger_1.overrideFormTrigger,
    form_trigger: form_trigger_1.overrideFormTrigger,
    workflow_trigger: workflow_trigger_1.overrideWorkflowTrigger,
    error_trigger: error_trigger_1.overrideErrorTrigger,
    switch: switch_1.overrideSwitch,
    set_variable: set_variable_1.overrideSetVariable,
    set: set_1.overrideSet,
    edit_fields: edit_fields_1.overrideEditFields,
    rename_keys: rename_keys_1.overrideRenameKeys,
    math: math_1.overrideMath,
    wait: wait_1.overrideWait,
    delay: delay_1.overrideDelay,
    return: return_1.overrideReturn,
    sort: sort_1.overrideSort,
    limit: limit_1.overrideLimit,
    aggregate: aggregate_1.overrideAggregate,
    http_request: http_request_1.overrideHttpRequest,
    slack_message: slack_message_1.overrideSlackMessage,
    google_sheets: google_sheets_1.overrideGoogleSheets,
    airtable: airtable_1.overrideAirtable,
    notion: notion_1.overrideNotion,
    hubspot: hubspot_1.overrideHubspot,
    salesforce: salesforce_1.overrideSalesforce,
    pipedrive: pipedrive_1.overridePipedrive,
    activecampaign: activecampaign_1.overrideActivecampaign,
    mailchimp: mailchimp_1.overrideMailchimp,
    intercom: intercom_1.overrideIntercom,
    microsoft_dynamics: microsoft_dynamics_1.overrideMicrosoftDynamics,
    sap: sap_1.overrideSap,
    intuit_smes: intuit_smes_1.overrideIntuitSmes,
    tally: tally_1.overrideTally,
    email: email_1.overrideEmail,
    telegram: telegram_1.overrideTelegram,
    discord: discord_1.overrideDiscord,
    execute_workflow: execute_workflow_1.overrideExecuteWorkflow,
    javascript: javascript_1.overrideJavascript,
    text_summarizer: text_summarizer_1.overrideTextSummarizer,
    sentiment_analyzer: sentiment_analyzer_1.overrideSentimentAnalyzer,
    // ✅ BATCH 3: Remaining Communication & Storage
    microsoft_teams: microsoft_teams_1.overrideMicrosoftTeams,
    whatsapp_cloud: whatsapp_cloud_1.overrideWhatsappCloud,
    twilio: twilio_1.overrideTwilio,
    mailgun: mailgun_1.overrideMailgun,
    sendgrid: sendgrid_1.overrideSendgrid,
    google_doc: google_doc_1.overrideGoogleDoc,
    google_drive: google_drive_1.overrideGoogleDrive,
    google_contacts: google_contacts_1.overrideGoogleContacts,
    google_tasks: google_tasks_1.overrideGoogleTasks,
    google_bigquery: google_bigquery_1.overrideGoogleBigQuery,
    zoho: zoho_1.overrideZoho,
    // ✅ BATCH 4: Data Transformation & HTTP
    filter: filter_1.overrideFilter,
    loop: loop_1.overrideLoop,
    split_in_batches: split_in_batches_1.overrideSplitInBatches,
    http_response: http_response_1.overrideHttpResponse,
    graphql: graphql_1.overrideGraphql,
    // ✅ BATCH 5: Utility & AI
    function: function_1.overrideFunction,
    function_item: function_item_1.overrideFunctionItem,
    ai_service: ai_service_1.overrideAiService,
    // ✅ BATCH 6: Storage
    aws_s3: aws_s3_1.overrideAwsS3,
    dropbox: dropbox_1.overrideDropbox,
    onedrive: onedrive_1.overrideOnedrive,
    ftp: ftp_1.overrideFtp,
    sftp: sftp_1.overrideSftp,
    // ✅ BATCH 7: Queue & Cache
    queue_push: queue_push_1.overrideQueuePush,
    queue_consume: queue_consume_1.overrideQueueConsume,
    cache_get: cache_get_1.overrideCacheGet,
    cache_set: cache_set_1.overrideCacheSet,
    // ✅ BATCH 8: Auth & File
    oauth2_auth: oauth2_auth_1.overrideOauth2Auth,
    api_key_auth: api_key_auth_1.overrideApiKeyAuth,
    read_binary_file: read_binary_file_1.overrideReadBinaryFile,
    write_binary_file: write_binary_file_1.overrideWriteBinaryFile,
    // ✅ BATCH 9: Database
    postgresql: postgresql_1.overridePostgresql,
    db: supabase_1.overrideSupabase,
    mysql: mysql_1.overrideMysql,
    mongodb: mongodb_1.overrideMongodb,
    firebase: firebase_1.overrideFirebase,
    google_cloud_storage: gcs_1.overrideGCS,
    // ✅ CRM: Odoo ERP
    odoo: odoo_1.overrideOdoo,
    // ✅ BATCH 10: Social Media
    twitter: twitter_1.overrideTwitter,
    instagram: instagram_1.overrideInstagram,
    youtube: youtube_1.overrideYoutube,
    facebook: facebook_1.overrideFacebook,
    linkedin: linkedin_1.overrideLinkedin,
    // ✅ WhatsApp & Instagram full nodes
    whatsapp: whatsapp_1.overrideWhatsapp,
    whatsapp_trigger: whatsapp_trigger_1.overrideWhatsappTrigger,
    instagram_trigger: instagram_trigger_1.overrideInstagramTrigger,
    // ✅ BATCH 11: E-commerce & Payments
    shopify: shopify_1.overrideShopify,
    woocommerce: woocommerce_1.overrideWoocommerce,
    stripe: stripe_1.overrideStripe,
    paypal: paypal_1.overridePaypal,
    // ✅ BATCH 12: Version Control
    github: github_1.overrideGithub,
    gitlab: gitlab_1.overrideGitlab,
    bitbucket: bitbucket_1.overrideBitbucket,
    // ✅ BATCH 13: Other Integrations
    clickup: clickup_1.overrideClickup,
    outlook: outlook_1.overrideOutlook,
    // ✅ BATCH 14: Utilities
    date_time: date_time_1.overrideDateTime,
    text_formatter: text_formatter_1.overrideTextFormatter,
    html: html_1.overrideHtml,
    xml: xml_1.overrideXml,
    merge: merge_1.overrideMerge,
    // ✅ BATCH 15: AI Infrastructure
    memory: memory_1.overrideMemory,
    tool: tool_1.overrideTool,
    // ✅ BATCH 16: Video Conferencing
    zoom_video: zoom_video_1.overrideZoomVideo,
    // ✅ BATCH 17: DevOps & Deployment
    vercel: vercel_1.overrideVercel,
    jenkins: jenkins_1.overrideJenkins,
    // ✅ ScheduleWise healthcare scheduling integration
    schedulewise: schedulewise_1.overrideScheduleWise,
    // ── Tier-2: API nodes with switch cases, now properly registered ──────────
    calendly: calendly_1.overrideCalendly,
    chargebee: chargebee_1.overrideChargebee,
    typeform: typeform_1.overrideTypeform,
    xero: xero_1.overrideXero,
    oracle_database: oracle_database_1.overrideOracleDatabase,
    // ── Tier-3: nodes needing both schema registration and execution wiring ───
    contentful: contentful_node_1.overrideContentful,
    wordpress: wordpress_1.overrideWordPress,
    zendesk: zendesk_node_1.overrideZendesk,
    netlify: netlify_1.overrideNetlify,
    workday: workday_1.overrideWorkday,
    pinecone: pinecone_1.overridePinecone,
    qdrant: qdrant_1.overrideQdrant,
    cohere: cohere_1.overrideCohere,
    langchain: langchain_1.overrideLangchain,
    lightricks: lightricks_1.overrideLightricks,
};
/**
 * Apply per-node overrides to a base unified definition.
 * This keeps UnifiedNodeRegistry generic and pushes node-specific behavior into one file per node.
 */
function applyNodeDefinitionOverrides(def, schema) {
    const fn = overridesByType[schema.type];
    const next = (0, generated_node_operation_contracts_1.applyGeneratedOperationContracts)(fn ? fn(def, schema) : def);
    const credentialFields = next.credentialSchema?.credentialFields ?? [];
    const requirements = next.credentialSchema?.requirements ?? [];
    if (credentialFields.length === 0 || requirements.length > 0) {
        return next;
    }
    return {
        ...next,
        credentialSchema: {
            ...next.credentialSchema,
            requirements: [
                {
                    provider: next.type,
                    category: 'api_key',
                    required: true,
                    description: `${next.label} credentials`,
                    scopes: [],
                },
            ],
        },
    };
}
/** Node types that replace `execute` (or related) via registry overrides — used for compliance matrix / audits. */
function getNodeTypesWithExecuteOverrides() {
    return Object.keys(overridesByType).sort();
}
function hasRegistryExecuteOverride(nodeType) {
    return Object.prototype.hasOwnProperty.call(overridesByType, nodeType);
}
