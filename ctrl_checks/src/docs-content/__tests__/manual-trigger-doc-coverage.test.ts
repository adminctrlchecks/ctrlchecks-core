import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '@/components/workflow/nodeTypes';
import { activecampaignDoc } from '../nodes/activecampaign.doc';
import { aggregateDoc } from '../nodes/aggregate.doc';
import { aiAgentDoc } from '../nodes/ai_agent.doc';
import { aiChatModelDoc } from '../nodes/ai_chat_model.doc';
import { amazonSesDoc } from '../nodes/amazon_ses.doc';
import { anthropicClaudeDoc } from '../nodes/anthropic_claude.doc';
import { chatTriggerDoc } from '../nodes/chat_trigger.doc';
import { chatModelDoc } from '../nodes/chat_model.doc';
import { clickupDoc } from '../nodes/clickup.doc';
import { cohereDoc } from '../nodes/cohere.doc';
import { contentfulDoc } from '../nodes/contentful.doc';
import { csvDoc } from '../nodes/csv.doc';
import { dateTimeDoc } from '../nodes/date_time.doc';
import { discordDoc } from '../nodes/discord.doc';
import { discordTriggerDoc } from '../nodes/discord_trigger.doc';
import { discordWebhookDoc } from '../nodes/discord_webhook.doc';
import { editFieldsDoc } from '../nodes/edit_fields.doc';
import { emailDoc } from '../nodes/email.doc';
import { errorHandlerDoc } from '../nodes/error_handler.doc';
import { errorTriggerDoc } from '../nodes/error_trigger.doc';
import { facebookTriggerDoc } from '../nodes/facebook_trigger.doc';
import { filterDoc } from '../nodes/filter.doc';
import { formDoc } from '../nodes/form.doc';
import { freshdeskDoc } from '../nodes/freshdesk.doc';
import { functionDoc } from '../nodes/function.doc';
import { functionItemDoc } from '../nodes/function_item.doc';
import { githubDoc } from '../nodes/github.doc';
import { githubTriggerDoc } from '../nodes/github_trigger.doc';
import { gitlabDoc } from '../nodes/gitlab.doc';
import { gitlabTriggerDoc } from '../nodes/gitlab_trigger.doc';
import { googleBigqueryDoc } from '../nodes/google_bigquery.doc';
import { googleCalendarDoc } from '../nodes/google_calendar.doc';
import { googleCalendarTriggerDoc } from '../nodes/google_calendar_trigger.doc';
import { googleContactsDoc } from '../nodes/google_contacts.doc';
import { googleDocDoc } from '../nodes/google_doc.doc';
import { googleDriveDoc } from '../nodes/google_drive.doc';
import { googleDriveTriggerDoc } from '../nodes/google_drive_trigger.doc';
import { googleGeminiDoc } from '../nodes/google_gemini.doc';
import { googleGmailDoc } from '../nodes/google_gmail.doc';
import { gmailTriggerDoc } from '../nodes/gmail_trigger.doc';
import { googleSheetsDoc } from '../nodes/google_sheets.doc';
import { googleSheetsTriggerDoc } from '../nodes/google_sheets_trigger.doc';
import { googleTasksDoc } from '../nodes/google_tasks.doc';
import { htmlDoc } from '../nodes/html.doc';
import { graphqlDoc } from '../nodes/graphql.doc';
import { httpPostDoc } from '../nodes/http_post.doc';
import { httpRequestDoc } from '../nodes/http_request.doc';
import { hubspotDoc } from '../nodes/hubspot.doc';
import { huggingfaceDoc } from '../nodes/huggingface.doc';
import { instagramTriggerDoc } from '../nodes/instagram_trigger.doc';
import { intercomDoc } from '../nodes/intercom.doc';
import { intuitSmesDoc } from '../nodes/intuit_smes.doc';
import { jenkinsDoc } from '../nodes/jenkins.doc';
import { jiraDoc } from '../nodes/jira.doc';
import { mailchimpDoc } from '../nodes/mailchimp.doc';
import { microsoftDynamicsDoc } from '../nodes/microsoft_dynamics.doc';
import { odooDoc } from '../nodes/odoo.doc';
import { ollamaDoc } from '../nodes/ollama.doc';
import { openaiGptDoc } from '../nodes/openai_gpt.doc';
import { paypalDoc } from '../nodes/paypal.doc';
import { pipedriveDoc } from '../nodes/pipedrive.doc';
import { salesforceDoc } from '../nodes/salesforce.doc';
import { sapDoc } from '../nodes/sap.doc';
import { schedulewiseDoc } from '../nodes/schedulewise.doc';
import { sentimentAnalyzerDoc } from '../nodes/sentiment_analyzer.doc';
import { shopifyDoc } from '../nodes/shopify.doc';
import { stripeDoc } from '../nodes/stripe.doc';
import { tallyDoc } from '../nodes/tally.doc';
import { woocommerceDoc } from '../nodes/woocommerce.doc';
import { zendeskDoc } from '../nodes/zendesk.doc';
import { zohoCrmDoc } from '../nodes/zoho_crm.doc';
import { bitbucketDoc } from '../nodes/bitbucket.doc';
import { airtableDoc } from '../nodes/airtable.doc';
import { supabaseDoc } from '../nodes/supabase.doc';
import { firebaseDoc } from '../nodes/firebase.doc';
import { googleCloudStorageDoc } from '../nodes/google_cloud_storage.doc';
import { mongodbDoc } from '../nodes/mongodb.doc';
import { netlifyDoc } from '../nodes/netlify.doc';
import { intervalDoc } from '../nodes/interval.doc';
import { jiraTriggerDoc } from '../nodes/jira_trigger.doc';
import { jsonParserDoc } from '../nodes/json_parser.doc';
import { limitDoc } from '../nodes/limit.doc';
import { linearTriggerDoc } from '../nodes/linear_trigger.doc';
import { microsoftTeamsTriggerDoc } from '../nodes/microsoft_teams_trigger.doc';
import { outlookTriggerDoc } from '../nodes/outlook_trigger.doc';
import { parallelDoc } from '../nodes/parallel.doc';
import { shopifyTriggerDoc } from '../nodes/shopify_trigger.doc';
import { slackTriggerDoc } from '../nodes/slack_trigger.doc';
import { stripeTriggerDoc } from '../nodes/stripe_trigger.doc';
import { tallyTriggerDoc } from '../nodes/tally_trigger.doc';
import { telegramTriggerDoc } from '../nodes/telegram_trigger.doc';
import { trelloTriggerDoc } from '../nodes/trello_trigger.doc';
import { typeformTriggerDoc } from '../nodes/typeform_trigger.doc';
import { whatsappTriggerDoc } from '../nodes/whatsapp_trigger.doc';
import { slackWebhookDoc } from '../nodes/slack_webhook.doc';
import { ifElseDoc } from '../nodes/if_else.doc';
import { javascriptDoc } from '../nodes/javascript.doc';
import { logOutputDoc } from '../nodes/log_output.doc';
import { loopDoc } from '../nodes/loop.doc';
import { langchainDoc } from '../nodes/langchain.doc';
import { mailgunDoc } from '../nodes/mailgun.doc';
import { mathDoc } from '../nodes/math.doc';
import { manualTriggerDoc } from '../nodes/manual_trigger.doc';
import { mergeDoc } from '../nodes/merge.doc';
import { mergeDataDoc } from '../nodes/merge_data.doc';
import { memoryDoc } from '../nodes/memory.doc';
import { noopDoc } from '../nodes/noop.doc';
import { stopAndErrorDoc } from '../nodes/stop_and_error.doc';
import { waitDoc } from '../nodes/wait.doc';
import { outlookDoc } from '../nodes/outlook.doc';
import { calendlyDoc } from '../nodes/calendly.doc';
import { linearDoc } from '../nodes/linear.doc';
import { notionDoc } from '../nodes/notion.doc';
import { trelloDoc } from '../nodes/trello.doc';
import { typeformDoc } from '../nodes/typeform.doc';
import { facebookDoc } from '../nodes/facebook.doc';
import { instagramDoc } from '../nodes/instagram.doc';
import { linkedinDoc } from '../nodes/linkedin.doc';
import { twitterDoc } from '../nodes/twitter.doc';
import { youtubeDoc } from '../nodes/youtube.doc';
import { delayDoc } from '../nodes/delay.doc';
import { executeWorkflowDoc } from '../nodes/execute_workflow.doc';
import { retryDoc } from '../nodes/retry.doc';
import { returnDoc } from '../nodes/return.doc';
import { timeoutDoc } from '../nodes/timeout.doc';
import { renameKeysDoc } from '../nodes/rename_keys.doc';
import { setVariableDoc } from '../nodes/set_variable.doc';
import { sortDoc } from '../nodes/sort.doc';
import { textFormatterDoc } from '../nodes/text_formatter.doc';
import { textSummarizerDoc } from '../nodes/text_summarizer.doc';
import { tryCatchDoc } from '../nodes/try_catch.doc';
import { xmlDoc } from '../nodes/xml.doc';
import { microsoftTeamsDoc } from '../nodes/microsoft_teams.doc';
import { scheduleDoc } from '../nodes/schedule.doc';
import { sendgridDoc } from '../nodes/sendgrid.doc';
import { setDoc } from '../nodes/set.doc';
import { slackMessageDoc } from '../nodes/slack_message.doc';
import { splitInBatchesDoc } from '../nodes/split_in_batches.doc';
import { switchDoc } from '../nodes/switch.doc';
import { telegramDoc } from '../nodes/telegram.doc';
import { twilioDoc } from '../nodes/twilio.doc';
import { webhookDoc } from '../nodes/webhook.doc';
import { respondToWebhookDoc } from '../nodes/respond_to_webhook.doc';
import { webhookResponseDoc } from '../nodes/webhook_response.doc';
import { whatsappDoc } from '../nodes/whatsapp.doc';
import { whatsappCloudDoc } from '../nodes/whatsapp_cloud.doc';
import { workflowTriggerDoc } from '../nodes/workflow_trigger.doc';
import { zoomVideoDoc } from '../nodes/zoom_video.doc';
import { chargebeeDoc } from '../nodes/chargebee.doc';
import { mysqlDoc } from '../nodes/mysql.doc';
import { mistralDoc } from '../nodes/mistral.doc';
import { oracleDatabaseDoc } from '../nodes/oracle_database.doc';
import { pineconeDoc } from '../nodes/pinecone.doc';
import { postgresqlDoc } from '../nodes/postgresql.doc';
import { qdrantDoc } from '../nodes/qdrant.doc';
import { redisDoc } from '../nodes/redis.doc';
import { sqlServerDoc } from '../nodes/sql_server.doc';
import { timescaledbDoc } from '../nodes/timescaledb.doc';
import { awsS3Doc } from '../nodes/aws_s3.doc';
import { dropboxDoc } from '../nodes/dropbox.doc';
import { readBinaryFileDoc } from '../nodes/read_binary_file.doc';
import { writeBinaryFileDoc } from '../nodes/write_binary_file.doc';
import { ftpDoc } from '../nodes/ftp.doc';
import { sftpDoc } from '../nodes/sftp.doc';
import { onedriveDoc } from '../nodes/onedrive.doc';
import { wordpressDoc } from '../nodes/wordpress.doc';
import { vercelDoc } from '../nodes/vercel.doc';
import { workdayDoc } from '../nodes/workday.doc';
import { xeroDoc } from '../nodes/xero.doc';
import type { FieldDoc, NodeDoc } from '../types';

type BackendNode = {
  type: string;
  requiredConfig?: string[];
  optionalConfig?: string[];
  credentialType?: string | null;
  outputs?: string[];
};

const backendLibraryPath = resolve(process.cwd(), '../worker/public/node-library.json');

const backendNodes = JSON.parse(readFileSync(backendLibraryPath, 'utf8')) as BackendNode[];

const AUDITED_NODE_DOCS: Array<{
  doc: NodeDoc;
  usageInputKeys: string[];
  outputDescriptionTerms: string[];
  troubleshootingTerms: string[];
  credentialKind?: 'none' | 'ai_provider' | 'openai_provider' | 'gemini' | 'anthropic' | 'cohere' | 'huggingface' | 'mistral' | 'langchain_provider' | 'smtp' | 'slack' | 'slack_trigger' | 'slack_webhook' | 'teams' | 'teams_trigger' | 'telegram' | 'telegram_trigger' | 'whatsapp' | 'whatsapp_trigger' | 'discord' | 'discord_trigger' | 'discord_webhook' | 'facebook_trigger' | 'github_trigger' | 'gitlab_trigger' | 'instagram_trigger' | 'jira_trigger' | 'linear_trigger' | 'outlook_trigger' | 'shopify_trigger' | 'stripe_trigger' | 'tally_trigger' | 'trello_trigger' | 'typeform_trigger' | 'activecampaign' | 'freshdesk' | 'hubspot' | 'intercom' | 'intuit_smes' | 'mailchimp' | 'microsoft_dynamics' | 'odoo' | 'pipedrive' | 'salesforce' | 'stripe' | 'paypal' | 'shopify' | 'woocommerce' | 'chargebee' | 'airtable' | 'supabase' | 'firebase' | 'mongodb' | 'google_cloud_storage' | 'mysql' | 'postgresql' | 'oracle_database' | 'pinecone' | 'qdrant' | 'redis' | 'sql_server' | 'timescaledb' | 'aws_s3' | 'dropbox' | 'ftp' | 'sftp' | 'onedrive' | 'clickup' | 'contentful' | 'wordpress' | 'bitbucket' | 'github' | 'gitlab' | 'jenkins' | 'jira' | 'netlify' | 'vercel' | 'schedulewise' | 'xero' | 'workday' | 'gmail' | 'gmail_trigger' | 'google_sheets' | 'google_sheets_trigger' | 'google_calendar' | 'google_calendar_trigger' | 'google_drive' | 'google_drive_trigger' | 'google_doc' | 'google_contacts' | 'google_tasks' | 'google_bigquery' | 'amazon_ses' | 'mailgun' | 'sendgrid' | 'twilio' | 'zoom' | 'microsoft' | 'calendly' | 'linear' | 'notion' | 'trello' | 'typeform' | 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube';
}> = [
  {
    doc: activecampaignDoc,
    usageInputKeys: ['apiUrl', 'apiKey'],
    outputDescriptionTerms: ['operation', 'data'],
    troubleshootingTerms: [
      'apiUrl is required',
      'apiKey is required',
      'email is required for add',
      'contactId is required for update',
      'contactId is required for delete',
      'Unsupported ActiveCampaign operation: ...',
      'ActiveCampaign operation failed (ACTIVECAMPAIGN_FAILED)',
      'Next node cannot find expected fields',
    ],
    credentialKind: 'activecampaign',
  },
  {
    doc: freshdeskDoc,
    usageInputKeys: ['domain', 'apiKey'],
    outputDescriptionTerms: ['success', 'Freshdesk', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Freshdesk: domain is required (e.g., mycompany.freshdesk.com)',
      'Freshdesk: apiKey not found. Provide apiKey or vault credential "freshdesk".',
      'Freshdesk get: id is required',
      'Freshdesk create: data (object) is required (or provide subject+descriptionText+email for ticket)',
      'Freshdesk update: data (object) is required',
      'Freshdesk: Unsupported operation "search". Supported: get/read, list, create, update, delete',
      'Freshdesk get failed (404)',
      'Freshdesk error: <message>',
    ],
    credentialKind: 'freshdesk',
  },
  {
    doc: hubspotDoc,
    usageInputKeys: ['resource', 'operation'],
    outputDescriptionTerms: ['success', 'HubSpot', '_error', '_errorCode', '_errorDetails'],
    troubleshootingTerms: [
      'HubSpot node requires a connected HubSpot credential. Select or create a HubSpot connection for this node.',
      'HubSpot get operation requires id or objectId',
      'HubSpot create operation requires at least one property. Properties field is empty.',
      'HubSpot search operation requires searchQuery',
      'HubSpot batchCreate operation requires records array',
      'Unsupported HubSpot operation: <operation>. Supported: create, get, getMany, update, delete, search, batchCreate, batchUpdate, batchDelete',
      'HubSpot CREATE failed (<status>): <details>',
      'HubSpot GET failed (404)',
    ],
    credentialKind: 'hubspot',
  },
  {
    doc: intercomDoc,
    usageInputKeys: ['operation', 'accessToken'],
    outputDescriptionTerms: ['operation', 'data', '_error', '_errorCode'],
    troubleshootingTerms: [
      'accessToken is required',
      'conversationId is required for get',
      'conversationId is required for send',
      'message is required for send',
      'adminId is required for admin conversation replies',
      'Unsupported Intercom operation: <operation>',
      'Intercom operation failed',
    ],
    credentialKind: 'intercom',
  },
  {
    doc: intuitSmesDoc,
    usageInputKeys: ['operation', 'apiKey'],
    outputDescriptionTerms: ['success', 'data', 'message', 'error'],
    troubleshootingTerms: [
      'API Key or Access Token is required for Intuit SME operations',
      'Unknown operation: <operation>',
      'Intuit SME operation failed',
      'A fabricated response is mistaken for a real Intuit/QuickBooks record',
    ],
    credentialKind: 'intuit_smes',
  },
  {
    doc: mailchimpDoc,
    usageInputKeys: ['operation', 'apiKey'],
    outputDescriptionTerms: ['operation', 'data', '_error', '_errorCode'],
    troubleshootingTerms: [
      'apiKey is required',
      'serverPrefix is required when the Mailchimp API key does not include a data-center suffix',
      'listId is required for subscribe',
      'email is required for subscribe',
      'campaignId is required for send',
      'Unsupported Mailchimp operation: <operation>',
    ],
    credentialKind: 'mailchimp',
  },
  {
    doc: microsoftDynamicsDoc,
    usageInputKeys: ['instanceUrl', 'accessToken'],
    outputDescriptionTerms: ['success', '_error'],
    troubleshootingTerms: [
      'Microsoft Dynamics: instanceUrl is required (e.g. https://yourorg.crm.dynamics.com)',
      'Microsoft Dynamics: accessToken (Azure AD OAuth2 token) is required',
      'Microsoft Dynamics: id (record GUID) is required for getRecord',
      'Microsoft Dynamics: fetchXml query is required for fetchXml operation',
      'Microsoft Dynamics: Unsupported operation: associate',
    ],
    credentialKind: 'microsoft_dynamics',
  },
  {
    doc: odooDoc,
    usageInputKeys: ['operation', 'model'],
    outputDescriptionTerms: ['success', 'operation', 'model', 'error'],
    troubleshootingTerms: [
      'Odoo URL is required',
      'Odoo authentication failed: invalid credentials or database',
      'recordId is required for updateRecord',
      'method is required for executeMethod',
      'Unknown operation: <operation>',
      'Odoo API error: <message>',
    ],
    credentialKind: 'odoo',
  },
  {
    doc: pipedriveDoc,
    usageInputKeys: ['resource', 'operation'],
    outputDescriptionTerms: ['success', 'data', '_error'],
    troubleshootingTerms: [
      'Pipedrive node: API Token is required',
      'Pipedrive node: Unsupported resource "user"',
      'Pipedrive node: Unsupported operation "getMany" for resource "person"',
      'Pipedrive node: personId is required for get operation',
      'Pipedrive node: personName is required for create operation',
      'Pipedrive API error: <message>',
    ],
    credentialKind: 'pipedrive',
  },
  {
    doc: salesforceDoc,
    usageInputKeys: ['instanceUrl', 'accessToken'],
    outputDescriptionTerms: ['operation', 'resource', 'data', '_error'],
    troubleshootingTerms: [
      'accessToken is required',
      'instanceUrl is required',
      'soql is required for query',
      'id is required for get',
      'externalIdField and externalIdValue are required for upsert',
      'records array is required for bulk operations',
      'Unsupported Salesforce operation: <operation>',
    ],
    credentialKind: 'salesforce',
  },
  {
    doc: sapDoc,
    usageInputKeys: ['operation', 'baseUrl', 'endpoint'],
    outputDescriptionTerms: ['success', 'data', 'statusCode', '_error'],
    troubleshootingTerms: [
      'SAP node: endpoint is required (e.g. /sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder)',
      'SAP node: baseUrl is required (e.g. https://your-sap-host:44300)',
      'SAP node: authentication required — provide accessToken (OAuth2) or username + password (Basic Auth)',
      'SAP: DELETE failed (<status>): <details>',
      'SAP: <OPERATION> failed (<status>): <details>',
    ],
    credentialKind: 'sap',
  },
  {
    doc: tallyDoc,
    usageInputKeys: ['operation', 'endpoint'],
    outputDescriptionTerms: ['success', 'data', 'statusCode'],
    troubleshootingTerms: [
      'Tally node: endpoint is required',
      'Tally node: payload (XML body) is required for create_voucher operation',
      'fetch failed / connection refused when calling the Tally Server URL',
      'Tally node: HTTP <status> — <response text>',
      'Tally: <error message> (network/unexpected error)',
      'XML response contains <CREATED>0</CREATED> or an embedded error message after Create Voucher',
    ],
  },
  {
    doc: zendeskDoc,
    usageInputKeys: ['operation', 'subdomain', 'email'],
    outputDescriptionTerms: ['success', 'data', 'error', '_error'],
    troubleshootingTerms: [
      'Authentication failed (401 Unauthorized)',
      'Ticket not found (404 Not Found)',
      'Subject is required (400 Bad Request)',
      'Unsupported operation: <operation>',
      'Rate limit exceeded (429 Too Many Requests)',
    ],
    credentialKind: 'zendesk',
  },
  {
    doc: zohoCrmDoc,
    usageInputKeys: ['operation', 'accessToken', 'apiDomain', 'module'],
    outputDescriptionTerms: ['success', 'data', '_error'],
    troubleshootingTerms: [
      'Zoho: Credentials not found.',
      'recordId or externalId is required for get operation',
      'data is required for create operation',
      'searchCriteria or criteria is required for search operation',
      'Unknown CRM record operation: getMany',
      'Zoho API error: <message>',
    ],
    credentialKind: 'zoho_crm',
  },
  {
    doc: clickupDoc,
    usageInputKeys: ['operation', 'listId', 'name'],
    outputDescriptionTerms: ['raw data', '_statusSkipped', '_error'],
    troubleshootingTerms: [
      'Missing ClickUp API Key',
      'name is required for createTask',
      'listId is required for createTask',
      'Status field was ignored because it does not exist in this list',
      'No response from ClickUp API',
    ],
    credentialKind: 'clickup',
  },
  {
    doc: contentfulDoc,
    usageInputKeys: ['operation', 'spaceId', 'accessToken'],
    outputDescriptionTerms: ['success', 'data', 'error'],
    troubleshootingTerms: [
      'Invalid JSON in fields',
      'Unable to load current Contentful entry version before update',
      'Unable to load current Contentful entry version before delete',
      'Unsupported operation: <operation>',
      'OrganizationAccessGrantRequired',
    ],
    credentialKind: 'contentful',
  },
  {
    doc: wordpressDoc,
    usageInputKeys: ['operation', 'siteUrl', 'username', 'password'],
    outputDescriptionTerms: ['success', 'data', 'error'],
    troubleshootingTerms: [
      'Unsupported operation',
      'WordPress API error status',
      'Application Password is not your login password',
      'Site URL has a trailing slash',
      'Update Post does not send status',
    ],
    credentialKind: 'wordpress',
  },
  {
    doc: bitbucketDoc,
    usageInputKeys: ['operation', 'workspace', 'repoSlug'],
    outputDescriptionTerms: ['success', 'output', 'operation', 'data', 'error'],
    troubleshootingTerms: [
      'workspace is required',
      'repoSlug is required',
      'Unsupported Bitbucket operation',
      'BITBUCKET_FAILED',
      'Data JSON must be an object',
    ],
    credentialKind: 'bitbucket',
  },
  {
    doc: githubDoc,
    usageInputKeys: ['operation', 'owner', 'repo'],
    outputDescriptionTerms: ['success', 'provider', 'action', '_error'],
    troubleshootingTerms: [
      'No github token found',
      'Unsupported GitHub operation',
      'Missing required fields: owner, repo, and title are required',
      'Invalid or expired GitHub token',
      'Successful output spreads provider data at top level',
    ],
    credentialKind: 'github',
  },
  {
    doc: gitlabDoc,
    usageInputKeys: ['operation', 'projectId', 'accessToken'],
    outputDescriptionTerms: ['success'],
    troubleshootingTerms: [
      'GitLab: projectId (or repo) is required',
      'GitLab: access token not found. Connect GitLab or provide accessToken.',
      'GitLab create issue: title is required',
      'Supported: create, read',
      'GitLab list issues failed',
    ],
    credentialKind: 'gitlab',
  },
  {
    doc: jenkinsDoc,
    usageInputKeys: ['operation', 'baseUrl', 'jobName'],
    outputDescriptionTerms: ['success', 'output', 'operation', 'jobName', 'data', 'JENKINS_FAILED'],
    troubleshootingTerms: [
      'JENKINS_FAILED: baseUrl is required',
      'JENKINS_FAILED: username is required',
      'JENKINS_FAILED: apiToken is required',
      'JENKINS_FAILED: jobName is required',
      'JENKINS_FAILED: buildNumber is required for cancel',
    ],
    credentialKind: 'jenkins',
  },
  {
    doc: jiraDoc,
    usageInputKeys: ['operation', 'domain'],
    outputDescriptionTerms: ['success', '_error'],
    troubleshootingTerms: [
      'Jira: domain is required',
      'Jira: email is required',
      'Jira: API token not found',
      'Jira create_issue: projectKey and summary are required',
      'Jira search_issues: jql query is required',
      'Jira transition_issue: transitionId is required',
    ],
    credentialKind: 'jira',
  },
  {
    doc: netlifyDoc,
    usageInputKeys: ['operation', 'accessToken'],
    outputDescriptionTerms: ['success', 'resource', 'operation', 'error'],
    troubleshootingTerms: [
      'Unsupported operation: <operation>',
      'Netlify API error <status>',
      'Netlify error',
      'Missing Access Token',
      'Forms resource does not return forms today',
    ],
    credentialKind: 'netlify',
  },
  {
    doc: vercelDoc,
    usageInputKeys: ['operation', 'token'],
    outputDescriptionTerms: ['success', 'data', 'error'],
    troubleshootingTerms: [
      'INVALID_OPERATION',
      'MISSING_TOKEN',
      'INVALID_TOKEN_FORMAT',
      'INVALID_PROJECT_NAME',
      'TIMEOUT',
    ],
    credentialKind: 'vercel',
  },
  {
    doc: stripeDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['success', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Stripe: API key not found. Provide apiKey or attach vault credential "stripe".',
      'Stripe: operation is required',
      'Stripe charge: amount (in cents) is required',
      'Stripe get_payment: paymentIntentId is required',
      'Stripe create_subscription: customerId is required',
      'Stripe create_subscription: priceId is required',
      'Stripe: Unsupported operation',
    ],
    credentialKind: 'stripe',
  },
  {
    doc: paypalDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['success', '_error'],
    troubleshootingTerms: [
      'PayPal: access token not found. Connect PayPal or provide accessToken.',
      'PayPal charge: amount is required',
      'PayPal refund: paymentId (captureId) is required',
      'PayPal: Unsupported operation',
      'PayPal create order failed',
    ],
    credentialKind: 'paypal',
  },
  {
    doc: shopifyDoc,
    usageInputKeys: ['resource', 'operation', 'shopDomain'],
    outputDescriptionTerms: ['success', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Shopify: shopDomain is required',
      'Shopify: access token not found. Provide apiKey or vault credential "shopify".',
      'Shopify create: data is required (object)',
      'Shopify update: id is required',
      'Shopify delete: id is required',
      'Shopify: Unsupported operation',
    ],
    credentialKind: 'shopify',
  },
  {
    doc: woocommerceDoc,
    usageInputKeys: ['resource', 'operation', 'storeUrl'],
    outputDescriptionTerms: ['success', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'WooCommerce: storeUrl is required',
      'WooCommerce: missing apiKey/apiSecret. Provide in config or vault credential "woocommerce".',
      'WooCommerce <operation>: data is required (object)',
      'WooCommerce update: id is required',
      'WooCommerce delete: id is required',
      'WooCommerce: Unsupported operation',
    ],
    credentialKind: 'woocommerce',
  },
  {
    doc: chargebeeDoc,
    usageInputKeys: ['operation', 'apiKey', 'site'],
    outputDescriptionTerms: ['success', 'operation', 'error'],
    troubleshootingTerms: [
      'Chargebee node: unsupported operation',
      'Chargebee authentication failed',
      'Chargebee resource not found',
      'Chargebee rate limit exceeded',
      'Chargebee API error',
    ],
    credentialKind: 'chargebee',
  },
  {
    doc: airtableDoc,
    usageInputKeys: ['operation', 'baseId', 'table'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'Airtable node: Select an active Airtable connection or provide a Personal Access Token.',
      'Airtable node: Base ID is required',
      'Airtable node: Table ID or table name is required',
      'Airtable node: recordId is required for get operation',
      'Airtable node: Invalid records format: <message>',
      'Airtable node: Unsupported operation: <operation>',
    ],
    credentialKind: 'airtable',
  },
  {
    doc: supabaseDoc,
    usageInputKeys: ['operation', 'url'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'url is required',
      'Either anonKey or serviceRoleKey is required',
      'operation is required',
      'operation must be one of: select, insert, update, delete, rpc',
      'table/data/filter/functionName is required for <operation> operation',
    ],
    credentialKind: 'supabase',
  },
  {
    doc: firebaseDoc,
    usageInputKeys: ['operation', 'projectId', 'clientEmail', 'privateKey', 'collection'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'projectId is required',
      'clientEmail is required',
      'privateKey is required',
      'Invalid operation: <value>',
      'collection/documentId/data/databaseUrl is required',
      '<Firebase Admin SDK error> / _error',
    ],
    credentialKind: 'firebase',
  },
  {
    doc: mongodbDoc,
    usageInputKeys: ['operation', 'collection'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required when connectionString is not provided',
      'database is required',
      'operation is required',
      'collection is required',
      'operation must be one of: find, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate',
      'document/documents array/filter/update/pipeline is required for <operation> operation',
      '<MongoDB driver error> / _error',
    ],
    credentialKind: 'mongodb',
  },
  {
    doc: googleCloudStorageDoc,
    usageInputKeys: ['operation', 'projectId', 'clientEmail', 'privateKey', 'bucket'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'projectId is required',
      'clientEmail is required',
      'privateKey is required',
      'Invalid operation: <value>',
      'bucket is required',
      'fileName/fileContent is required for <operation>',
      '<GCS operation failed> / _error',
    ],
    credentialKind: 'google_cloud_storage',
  },
  {
    doc: mysqlDoc,
    usageInputKeys: ['operation', 'host', 'database', 'username', 'password'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required',
      'database is required',
      'query is required for executeQuery operation',
      'where clause is required for update operation',
      'operation must be one of: executeQuery, insert, update, delete',
    ],
    credentialKind: 'mysql',
  },
  {
    doc: oracleDatabaseDoc,
    usageInputKeys: ['operation', 'user', 'password', 'connectionString'],
    outputDescriptionTerms: ['success', 'operation', 'rows', 'rowsAffected', 'meta', 'error'],
    troubleshootingTerms: [
      'Oracle credential "user" is required',
      '"schema" is required for operation "select"',
      'SQL statement must not end with a semicolon (node-oracledb requirement)',
      'UPDATE without a WHERE clause would affect all rows. Provide selectRows to filter.',
      'insert_or_update requires at least one selectRows entry to identify the match key',
    ],
    credentialKind: 'oracle_database',
  },
  {
    doc: pineconeDoc,
    usageInputKeys: ['operation', 'index', 'apiKey'],
    outputDescriptionTerms: ['success', 'operation', 'matches', 'upsertedCount', 'error'],
    troubleshootingTerms: [
      'Unsupported operation: <operation>',
      'Pinecone API error 400: <details>',
      'Pinecone API error 401: <details>',
      'Pinecone API error 404: <details>',
      'Pinecone error',
    ],
    credentialKind: 'pinecone',
  },
  {
    doc: postgresqlDoc,
    usageInputKeys: ['operation', 'host', 'database', 'username', 'password'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required',
      'query is required for executeQuery operation',
      'where clause is required for update operation',
      'operation must be one of: executeQuery, insert, update, delete',
      'The server does not support SSL connections',
    ],
    credentialKind: 'postgresql',
  },
  {
    doc: qdrantDoc,
    usageInputKeys: ['operation', 'url', 'collection', 'apiKey'],
    outputDescriptionTerms: ['success', 'operation', 'matches', 'upsertedCount', 'error'],
    troubleshootingTerms: [
      'Qdrant url is required',
      'Qdrant collection is required',
      'Unsupported operation: <operation>',
      'Qdrant API error 400: <details>',
      'Qdrant error',
    ],
    credentialKind: 'qdrant',
  },
  {
    doc: redisDoc,
    usageInputKeys: ['operation', 'host', 'port', 'password'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required',
      'port must be a valid number between 1 and 65535',
      'operation must be one of: get, set, delete, incr, hget, hset, lpush, rpop, command',
      'key is required for get/set/delete/incr/lpush/rpop operation',
      'hash/field/value/command is required for <operation> operation',
      'Redis operation failed',
    ],
    credentialKind: 'redis',
  },
  {
    doc: sqlServerDoc,
    usageInputKeys: ['operation', 'host', 'database', 'username', 'password'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required',
      'username is required / password is required / database is required',
      'query is required for executeQuery operation',
      'where clause is required for update operation',
      'where clause is required for delete operation',
      'operation must be one of: executeQuery, insert, update, delete, storedProcedure',
      'SQL Server operation failed',
    ],
    credentialKind: 'sql_server',
  },
  {
    doc: timescaledbDoc,
    usageInputKeys: ['operation', 'host', 'database', 'username', 'password'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'host is required / username is required / password is required / database is required',
      'operation must be one of: executeQuery, insert, update, delete, timeBucket, first, last',
      'query is required for executeQuery operation',
      'where clause is required for update operation / where clause is required for delete operation',
      'timeColumn/interval/bucketColumn/valueColumn is required for <operation> operation',
      'TimescaleDB operation failed',
    ],
    credentialKind: 'timescaledb',
  },
  {
    doc: awsS3Doc,
    usageInputKeys: ['operation', 'region', 'bucket'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'aws_s3: operation is required (get/download, put/upload, list, delete)',
      'aws_s3: bucket is required',
      'aws_s3: key is required for download',
      'aws_s3: key is required for upload',
      'aws_s3: dataBase64, data, or content is required for upload',
      'aws_s3: unsupported operation "<operation>" (supported: get, put, list, delete)',
      'aws_s3: <AWS error message>',
    ],
    credentialKind: 'aws_s3',
  },
  {
    doc: dropboxDoc,
    usageInputKeys: ['operation', 'accessToken'],
    outputDescriptionTerms: ['_error'],
    troubleshootingTerms: [
      'Dropbox: access token not found. Connect Dropbox or provide accessToken.',
      'Dropbox: path is required for download',
      'Dropbox: path is required for upload',
      'Dropbox: dataBase64, data, or content is required for upload',
      'Dropbox: path is required for delete',
      'Dropbox: Unsupported operation "<operation>". Supported: read, upload, list, delete',
      'Dropbox list/download/upload/delete failed (<status>)',
    ],
    credentialKind: 'dropbox',
  },
  {
    doc: readBinaryFileDoc,
    usageInputKeys: ['sourceType', 'assetId'],
    outputDescriptionTerms: ['dataBase64', 'fileName', 'mimeType', 'sizeBytes', '_error'],
    troubleshootingTerms: [
      'assetId is required when sourceType is assetId',
      'file asset not found: <assetId>',
      'filePath or storageKey is required',
      'unsafe file path outside binary storage root',
      'read_binary_file: <message>',
    ],
  },
  {
    doc: writeBinaryFileDoc,
    usageInputKeys: ['fileName', 'dataBase64'],
    outputDescriptionTerms: ['assetId', 'dataBase64', 'fileName', 'mimeType', 'sizeBytes', 'metadataPersisted', '_error'],
    troubleshootingTerms: [
      'dataBase64, data, content, fileData, or fileContent is required',
      'File too large',
      'unsafe file path outside binary storage root',
      'metadataError',
      'write_binary_file: <message>',
    ],
  },
  {
    doc: ftpDoc,
    usageInputKeys: ['operation', 'host', 'remotePath'],
    outputDescriptionTerms: ['success', 'output', '_error'],
    troubleshootingTerms: [
      'ftp: host is required',
      'ftp: operation is required (get, put, list, delete)',
      'remotePath is required for get / remotePath is required for put / remotePath is required for delete',
      'dataBase64, content, or fileData is required for put',
      'Unsupported FTP operation: <operation>. Supported: get, put, list, delete',
      'FTP_FAILED / ftp error: <message>',
    ],
    credentialKind: 'ftp',
  },
  {
    doc: sftpDoc,
    usageInputKeys: ['operation', 'host', 'remotePath'],
    outputDescriptionTerms: ['success', 'output', '_error'],
    troubleshootingTerms: [
      'sftp: host is required',
      'username is required',
      'password or privateKey is required',
      'remotePath is required for get / remotePath is required for put / remotePath is required for delete',
      'dataBase64, content, or fileData is required for put',
      'Unsupported SFTP operation: <operation>. Supported: get, put, list, delete',
      'SFTP_FAILED / sftp error: <message>',
    ],
    credentialKind: 'sftp',
  },
  {
    doc: onedriveDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['success', '_error'],
    troubleshootingTerms: [
      'OneDrive: access token not found. Connect Microsoft or provide accessToken.',
      'OneDrive: path is required for download',
      'OneDrive: path is required for upload',
      'OneDrive: dataBase64, data, or content is required for upload',
      'OneDrive: fileId or path is required for delete',
      'OneDrive list/download/upload/delete failed (<status>)',
      'OneDrive: Unsupported operation "<operation>". Supported: read, upload, list, delete',
    ],
    credentialKind: 'onedrive',
  },
  {
    doc: aiAgentDoc,
    usageInputKeys: ['userInput', 'model', 'systemPrompt'],
    outputDescriptionTerms: ['response_text', 'response_json', '_error'],
    troubleshootingTerms: [
      'Gemini/provider credential error in _error',
      'Timeout',
      'JSON output is wrapped as response_json.content',
      'No message-like field found in upstream object',
    ],
    credentialKind: 'ai_provider',
  },
  {
    doc: aiChatModelDoc,
    usageInputKeys: ['prompt', 'model', 'responseFormat'],
    outputDescriptionTerms: ['response', 'model', '_error'],
    troubleshootingTerms: [
      'AI Chat Model node: prompt is required',
      'Gemini credential error in _error',
      'JSON response falls back to text',
      'Model dropdown value has no effect',
    ],
    credentialKind: 'gemini',
  },
  {
    doc: anthropicClaudeDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['response', 'model', 'usage', 'finishReason', 'error'],
    troubleshootingTerms: [
      'Missing or invalid Anthropic API key',
      'Prompt and Messages are both empty',
      'Temperature and Memory have no effect',
      'Next node cannot find upstream fields',
    ],
    credentialKind: 'anthropic',
  },
  {
    doc: openaiGptDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['response', 'model', 'usage', 'finishReason', 'error'],
    troubleshootingTerms: [
      'OpenAI credential error returns success false with error',
      'Prompt and Messages are both empty',
      'Temperature and Memory have no effect',
      'Next node cannot find upstream fields',
      'Provider/API failure bubbles from the LLM adapter',
    ],
    credentialKind: 'openai_provider',
  },
  {
    doc: chatModelDoc,
    usageInputKeys: ['temperature'],
    outputDescriptionTerms: ['provider', 'model', 'temperature', '_chat_model_config'],
    troubleshootingTerms: [
      'No AI response is generated',
      'Provider, API Key, Model, and Prompt are ignored',
      'Missing downstream account connection',
      'Configured temperature looks changed but only metadata changes',
    ],
  },
  {
    doc: cohereDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['success', 'response', 'model', 'finishReason', 'inputTokens', 'outputTokens', 'error'],
    troubleshootingTerms: [
      'Cohere apiKey is required',
      'prompt is required',
      'Cohere API error <status>: <message>',
      'model must be one of: command-r7b-12-2024, command-r-08-2024, command-r-plus-08-2024, command-nightly',
      'maxTokens must be at least 1',
    ],
    credentialKind: 'cohere',
  },
  {
    doc: googleGeminiDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['response', 'model', 'usage', 'finishReason', 'error'],
    troubleshootingTerms: [
      'Gemini credential error returns success false with error',
      'Gemini wallet failure can include code',
      'Prompt is blank or upstream text is missing',
      'Temperature and Memory have no effect',
      'Next node cannot find upstream fields',
    ],
    credentialKind: 'gemini',
  },
  {
    doc: ollamaDoc,
    usageInputKeys: ['prompt', 'temperature'],
    outputDescriptionTerms: ['response', 'model', '_error'],
    troubleshootingTerms: [
      'This is not local Ollama',
      'AI Chat Model node: prompt is required',
      'Gemini credential error in _error',
      'Gemini wallet failure can include code',
      'Output keeps incoming fields',
    ],
    credentialKind: 'gemini',
  },
  {
    doc: huggingfaceDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['success', 'model', 'response', 'output', 'error'],
    troubleshootingTerms: [
      'HuggingFace API token is required',
      'prompt is required',
      'HuggingFace API error <status>: <message>',
      'max_new_tokens rejected, retry used bare input',
      'Task and Parameters do not affect request',
    ],
    credentialKind: 'huggingface',
  },
  {
    doc: langchainDoc,
    usageInputKeys: ['operation', 'provider', 'apiKey', 'prompt'],
    outputDescriptionTerms: ['success', 'operation', 'response', 'steps', 'error'],
    troubleshootingTerms: [
      'OpenAI API error: <message>',
      'Anthropic API error: <message>',
      'LangChain execution error',
      'Tools only affect OpenAI run_agent',
      'Memory has no effect',
      'Next node cannot find upstream fields',
    ],
    credentialKind: 'langchain_provider',
  },
  {
    doc: memoryDoc,
    usageInputKeys: ['operation', 'sessionId', 'context'],
    outputDescriptionTerms: ['sessionId', 'context', 'messages'],
    troubleshootingTerms: [
      'Operation does not store anything',
      'TTL has no effect',
      'Messages are empty',
      'Context is null',
      'Next node cannot find memory/searchResults',
    ],
  },
  {
    doc: mistralDoc,
    usageInputKeys: ['apiKey', 'model', 'prompt'],
    outputDescriptionTerms: ['success', 'model', 'response', 'inputTokens', 'outputTokens', 'error'],
    troubleshootingTerms: [
      'Mistral API key is required',
      'prompt is required',
      'Mistral API error <status>: <message>',
      'No response text returned',
      'Next node sees preserved input fields',
    ],
    credentialKind: 'mistral',
  },
  {
    doc: textSummarizerDoc,
    usageInputKeys: ['text', 'maxLength'],
    outputDescriptionTerms: ['response', 'model', '_error'],
    troubleshootingTerms: [
      'Text is blank but no local validation error is raised',
      'Gemini credential error in _error',
      'Summary is in response, not summary',
      'Max Length only changes the generated prompt',
      'Output keeps incoming fields',
    ],
    credentialKind: 'gemini',
  },
  {
    doc: sentimentAnalyzerDoc,
    usageInputKeys: ['text'],
    outputDescriptionTerms: ['response', 'model', '_error'],
    troubleshootingTerms: [
      'Sentiment is inside response, not top-level sentiment',
      'Invalid JSON falls back to raw text response',
      'Text is blank but no local validation error is raised',
      'Gemini credential error in _error',
      'Output keeps incoming fields',
    ],
    credentialKind: 'gemini',
  },
  {
    doc: mathDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['result', 'operation'],
    troubleshootingTerms: [
      'Division by zero',
      'Unknown math operation:',
      'Non-numeric Value 1 or Value 2 is silently treated as 0',
      'Minimum/Maximum on an empty list silently returns Infinity/-Infinity',
      'An invalid Decimal Precision value is silently replaced with the default of 10',
    ],
  },
  {
    doc: limitDoc,
    usageInputKeys: ['limit'],
    outputDescriptionTerms: ['items'],
    troubleshootingTerms: [
      'This node never raises an error — a missing array silently returns the input completely unchanged',
      'An invalid Limit value',
      'There is no separate "array" output key',
      'Setting Array to an expression that resolves to something other than an array',
    ],
  },
  {
    doc: jsonParserDoc,
    usageInputKeys: ['json'],
    outputDescriptionTerms: ['parsed'],
    troubleshootingTerms: [
      'JSON Parser: json is required',
      'JSON Parser: invalid JSON',
      'becomes undefined on the output',
      'silently skipped entirely',
    ],
  },
  {
    doc: htmlDoc,
    usageInputKeys: ['operation', 'html'],
    outputDescriptionTerms: ['success', '_error'],
    troubleshootingTerms: [
      'HTML: html (or content) field is required',
      'HTML extract: selector field is required',
      'Extract silently returns {results: [], count: 0, success: true}',
      'HTML: unsupported operation',
      'HTML error: <message>',
    ],
  },
  {
    doc: dateTimeDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: [],
    troubleshootingTerms: [
      'DateTime: invalid date',
      'DateTime convertTimezone: timezone is required',
      'DateTime diff: endDate (or date2) is required',
      'DateTime diff: endDate is not a valid date',
      'DateTime: unsupported operation',
      'Unrecognized Unit value silently falls back to minutes',
    ],
  },
  {
    doc: csvDoc,
    usageInputKeys: ['operation', 'delimiter'],
    outputDescriptionTerms: ['no error at all'],
    troubleshootingTerms: [
      'CSV: unsupported operation',
      'Parse silently returns empty items/rows/headers arrays',
      'Generate silently returns an empty csv string',
      'The very first real data row disappears',
      'Generated CSV is missing columns present only on later objects',
    ],
  },
  {
    doc: aggregateDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['aggregate:', 'operation:'],
    troubleshootingTerms: [
      'Aggregate: Unknown operation',
      'no numeric values found',
      'No output changes at all when items is missing',
      'Field path resolves to nothing',
    ],
  },
  {
    doc: manualTriggerDoc,
    usageInputKeys: ['inputData'],
    outputDescriptionTerms: ['inputData'],
    troubleshootingTerms: ['blank values', 'Invalid JSON', 'Nothing happens', 'Permission denied'],
  },
  {
    doc: scheduleDoc,
    usageInputKeys: ['time', 'cron', 'timezone'],
    outputDescriptionTerms: ['scheduledTime', 'timezone', 'cronExpression', 'output'],
    troubleshootingTerms: ['missing a time', 'Invalid cron', 'expected local time', 'automation does not start', 'Permission denied'],
  },
  {
    doc: webhookDoc,
    usageInputKeys: ['path', 'httpMethod', 'responseMode', 'verifySignature', 'secretToken'],
    outputDescriptionTerms: ['body', 'headers', 'method', 'query', 'orderId'],
    troubleshootingTerms: ['Required path', 'workflow not active', 'HTTP method', 'Invalid signature', 'Next node cannot find', 'Caller times out', 'Permission denied'],
  },
  {
    doc: formDoc,
    usageInputKeys: [
      'formTitle',
      'formDescription',
      'fields',
      'fieldLabel',
      'internalName',
      'fieldType',
      'placeholder',
      'options',
      'required',
      'submitButtonText',
      'successMessage',
      'redirectUrl',
      'allowMultipleSubmissions',
      'requireAuthentication',
      'captcha',
    ],
    outputDescriptionTerms: ['data', 'submitted_at', 'form', 'files', 'meta'],
    troubleshootingTerms: ['Required form title', 'required answer', 'Invalid email', 'Dropdown or radio', 'Next node cannot find', 'Duplicate submissions', 'Public users cannot submit', 'Spam submissions', 'Permission denied'],
  },
  {
    doc: workflowTriggerDoc,
    usageInputKeys: ['source_workflow_id'],
    outputDescriptionTerms: ['payload', 'customerEmail', 'inputData', 'workflowId', 'timestamp'],
    troubleshootingTerms: ['Source Workflow ID', 'Wrong workflow ID', 'Parent workflow does not call', 'Next node cannot find inputData', 'Child workflow is not active', 'Loop or circular', 'Permission denied'],
  },
  {
    doc: chatTriggerDoc,
    usageInputKeys: ['message', 'channel', 'allowedSenders'],
    outputDescriptionTerms: ['message', 'channel', 'sessionId', 'trigger', 'node_id', 'workflow_id', 'timestamp', '_chat'],
    troubleshootingTerms: [
      'Invalid message',
      'Workflow not found',
      'Chat expired',
      'Workflow not active',
      'Chat trigger not found',
      'PUBLIC_BASE_URL environment variable is required in production.',
      'Failed to create workflow execution. Please try again.',
      'Failed to process chat message. Please try again.',
      'Next node cannot find Chat Trigger fields',
      'Permission denied after Chat Trigger',
    ],
  },
  {
    doc: errorTriggerDoc,
    usageInputKeys: [],
    outputDescriptionTerms: ['failed_node', 'error_message', 'error_type', 'error_stack', 'node_output'],
    troubleshootingTerms: [
      'Error Trigger does not fire during a successful run',
      'Next node cannot find Error Trigger fields',
      'Error message is blank',
      'Expected stack trace or failed-node output is missing',
      'Permission denied after Error Trigger',
    ],
  },
  {
    doc: intervalDoc,
    usageInputKeys: ['interval', 'unit'],
    outputDescriptionTerms: ['executed_at', '_scheduled', '_trigger'],
    troubleshootingTerms: [
      'Interval saved to node config but failed to save to workflow. Scheduler may not start.',
      'Workflow does not fire on schedule',
      'Invalid cron expression for workflow',
      'Duplicate or overlapping executions',
      'Next node cannot find expected trigger fields',
      'Permission denied after Interval Trigger',
    ],
  },
  {
    doc: facebookTriggerDoc,
    usageInputKeys: ['connectionId', 'eventTypes', 'pageId', 'allowedSenderIds', 'verifyToken', 'validateSignature'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'chatId',
      'senderId',
      'recipientId',
      'pageId',
      'messageId',
      'messageType',
      'commentId',
      'postId',
      'parentId',
      'leadgenId',
      'formId',
      'postbackPayload',
      'field',
      'verb',
      'item',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_facebook',
    ],
    troubleshootingTerms: [
      'Invalid verify token.',
      'Invalid Facebook webhook signature.',
      'Facebook webhook received, no events matched this trigger.',
      'No active Facebook connection found. Create one in Connections first.',
      'Selected connection is not a Facebook connection.',
      'PUBLIC_BASE_URL is required to register Facebook webhooks.',
      'PUBLIC_BASE_URL is required to execute Facebook-triggered workflows.',
      'Facebook Trigger node not found in this workflow.',
      'Next node cannot find Facebook trigger fields',
      'Permission denied after Facebook Trigger',
    ],
    credentialKind: 'facebook_trigger',
  },
  {
    doc: githubTriggerDoc,
    usageInputKeys: ['connectionId', 'owner', 'repo', 'eventTypes', 'webhookSecret', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'repository',
      'action',
      'ref',
      'commits',
      'issueNumber',
      'issueTitle',
      'issueUrl',
      'prNumber',
      'prTitle',
      'prUrl',
      'merged',
      'releaseTag',
      'releaseName',
      'commentBody',
      'commentUrl',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_github',
    ],
    troubleshootingTerms: [
      'A GitHub repository owner is required.',
      'A GitHub repository name is required.',
      'Repository owner and name are required (set them on the GitHub Trigger node).',
      'No active GitHub connection found. Save a GitHub Personal Access Token (or connect via OAuth) in Connections first.',
      'PUBLIC_BASE_URL is required to register GitHub webhooks.',
      'Invalid GitHub webhook signature.',
      'GitHub webhook ping received.',
      'Workflow is not active.',
      'Ignored GitHub event not matching this trigger.',
      'PUBLIC_BASE_URL is required to execute GitHub-triggered workflows.',
      'GitHub Trigger node not found in this workflow.',
      'Next node cannot find GitHub trigger fields',
      'Permission denied after GitHub Trigger',
    ],
    credentialKind: 'github_trigger',
  },
  {
    doc: gitlabTriggerDoc,
    usageInputKeys: ['connectionId', 'baseUrl', 'projectId', 'eventTypes', 'secretToken', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'projectId',
      'projectName',
      'action',
      'ref',
      'commits',
      'issueIid',
      'issueTitle',
      'issueUrl',
      'mrIid',
      'mrTitle',
      'mrUrl',
      'mrState',
      'noteBody',
      'noteUrl',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_gitlab',
    ],
    troubleshootingTerms: [
      'A GitLab project ID (or URL-encoded path) is required.',
      'A GitLab Project ID is required (set it on the GitLab Trigger node).',
      'No active GitLab connection found. Save a GitLab Personal Access Token (with "api" scope) in Connections first.',
      'PUBLIC_BASE_URL is required to register GitLab webhooks.',
      'Invalid or missing X-Gitlab-Token secret.',
      'Workflow is not active.',
      'Ignored non-actionable GitLab payload.',
      'Ignored GitLab event not matching this trigger.',
      'PUBLIC_BASE_URL is required to execute GitLab-triggered workflows.',
      'GitLab Trigger node not found in this workflow.',
      'Next node cannot find GitLab trigger fields',
      'Permission denied after GitLab Trigger',
    ],
    credentialKind: 'gitlab_trigger',
  },
  {
    doc: instagramTriggerDoc,
    usageInputKeys: ['connectionId', 'eventTypes', 'instagramBusinessAccountId', 'allowedSenderIds', 'verifyToken', 'validateSignature'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'chatId',
      'senderId',
      'recipientId',
      'instagramBusinessAccountId',
      'pageId',
      'messageId',
      'messageType',
      'commentId',
      'mediaId',
      'mentionId',
      'postbackPayload',
      'isStoryReply',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_instagram',
    ],
    troubleshootingTerms: [
      'Invalid verify token.',
      'Invalid Instagram webhook signature.',
      'Instagram webhook received, no events matched this trigger.',
      'No active Instagram connection found. Create one in Connections first.',
      'Selected connection is not an Instagram connection.',
      'PUBLIC_BASE_URL is required to register Instagram webhooks.',
      'PUBLIC_BASE_URL is required to execute Instagram-triggered workflows.',
      'Instagram Trigger node not found in this workflow.',
      'Next node cannot find Instagram trigger fields',
      'Permission denied after Instagram Trigger',
    ],
    credentialKind: 'instagram_trigger',
  },
  {
    doc: jiraTriggerDoc,
    usageInputKeys: ['siteUrl', 'projectKey', 'eventTypes', 'secretToken', 'jql', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'siteUrl',
      'cloudId',
      'issueKey',
      'issueId',
      'issueSummary',
      'issueUrl',
      'issueType',
      'issueStatus',
      'projectKey',
      'commentBody',
      'commentUrl',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_jira',
    ],
    troubleshootingTerms: [
      'No active Jira connection found. Save your Jira email + API token in Connections first.',
      'Invalid or missing Jira webhook secret.',
      'Ignored non-actionable Jira payload.',
      'Ignored Jira event not matching this trigger.',
      'Webhook not receiving events after saving the workflow',
      'PUBLIC_BASE_URL is required to register Jira webhooks.',
      'PUBLIC_BASE_URL is required to execute Jira-triggered workflows.',
      'Jira Trigger node not found in this workflow.',
      'Next node cannot find Jira trigger fields',
      'Permission denied after Jira Trigger',
    ],
    credentialKind: 'jira_trigger',
  },
  {
    doc: linearTriggerDoc,
    usageInputKeys: ['teamId', 'allPublicTeams', 'resourceTypes', 'eventTypes', 'issueId', 'projectId', 'actorId', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'deliveryId',
      'linearEvent',
      'action',
      'entityType',
      'entityId',
      'organizationId',
      'webhookId',
      'webhookTimestamp',
      'url',
      'teamId',
      'teamKey',
      'teamName',
      'issueId',
      'issueIdentifier',
      'issueTitle',
      'issueUrl',
      'stateId',
      'stateName',
      'assigneeId',
      'assigneeName',
      'commentId',
      'commentBody',
      'projectId',
      'projectName',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_linear',
    ],
    troubleshootingTerms: [
      'No active Linear connection found. Save a Linear Personal API Key connection first.',
      'Linear API error (403/401): ...',
      'Linear webhookCreate did not return a webhook id.',
      'Invalid Linear webhook signature or timestamp.',
      'Ignored non-actionable Linear payload.',
      'Ignored Linear event not matching this trigger.',
      'PUBLIC_BASE_URL is required to register Linear webhooks.',
      'PUBLIC_BASE_URL is required to execute Linear-triggered workflows.',
      'Linear Trigger node not found in this workflow.',
      'Next node cannot find Linear trigger fields',
      'Permission denied after Linear Trigger',
    ],
    credentialKind: 'linear_trigger',
  },
  {
    doc: microsoftTeamsTriggerDoc,
    usageInputKeys: ['eventTypes', 'teamIds', 'channelIds', 'allowedUserIds', 'tenantId', 'appId', 'validationSecret', 'validateJwt'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'tenantId',
      'teamId',
      'channelId',
      'chatId',
      'conversationId',
      'serviceUrl',
      'activityId',
      'replyToId',
      'locale',
      'channelData',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_microsoftTeams',
    ],
    troubleshootingTerms: [
      'Invalid Microsoft Teams/Bot Framework request.',
      'Workflow is not active.',
      'No matching CtrlChecks workflow trigger is active for this Microsoft Teams event.',
      'No active Microsoft Teams Bot connection found. Create one in Connections first.',
      'Selected connection is not a Microsoft Teams Bot connection.',
      'Teams bot reply failed',
      'PUBLIC_BASE_URL is required to register Microsoft Teams webhooks.',
      'Microsoft Teams Trigger node not found in this workflow.',
      'Next node cannot find Microsoft Teams trigger fields',
      'Permission denied after Microsoft Teams Trigger',
    ],
    credentialKind: 'teams_trigger',
  },
  {
    doc: outlookTriggerDoc,
    usageInputKeys: ['resource', 'changeTypes', 'folderName', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'resourceId',
      'subject',
      'from',
      'to',
      'conversationId',
      'start',
      'end',
      'attendees',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_outlook',
    ],
    troubleshootingTerms: [
      'No active Microsoft connection found',
      'Ignored notification with invalid clientState',
      'Workflow does not fire even though mail/calendar changed',
      'PUBLIC_BASE_URL is required to register Outlook subscriptions.',
      'Microsoft Graph API error (400/403/404): ...',
      'Outlook Trigger node not found in this workflow.',
      'Next node cannot find Outlook trigger fields',
      'Permission denied after Outlook Trigger',
    ],
    credentialKind: 'outlook_trigger',
  },
  {
    doc: shopifyTriggerDoc,
    usageInputKeys: ['topics', 'financialStatus'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'topic',
      'shopDomain',
      'webhookId',
      'apiVersion',
      'objectId',
      'adminGraphqlApiId',
      'orderId',
      'orderName',
      'orderNumber',
      'financialStatus',
      'fulfillmentStatus',
      'totalPrice',
      'subtotalPrice',
      'totalTax',
      'currency',
      'customerId',
      'customerEmail',
      'customerName',
      'productId',
      'productTitle',
      'variantId',
      'inventoryItemId',
      'checkoutId',
      'cartToken',
      'refundId',
      'lineItems',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_shopify',
    ],
    troubleshootingTerms: [
      'No Shopify shop domain found. Save a Shopify Admin API connection with Store URL first.',
      'No complete Shopify Trigger connection found. Save a Shopify Admin API connection with Admin API token and app client secret/webhook signing secret.',
      'Invalid Shopify webhook signature.',
      'Ignored non-actionable Shopify payload.',
      'Ignored Shopify event not matching this trigger.',
      'Shopify API error (401/403/422): ...',
      'Shopify webhook creation for topic "..." did not return a webhook id.',
      'PUBLIC_BASE_URL is required to register Shopify webhooks.',
      'Shopify Trigger node not found in this workflow.',
      'Next node cannot find Shopify trigger fields',
      'Permission denied after Shopify Trigger',
    ],
    credentialKind: 'shopify_trigger',
  },
  {
    doc: slackTriggerDoc,
    usageInputKeys: ['eventTypes', 'channelIds', 'allowedUserIds', 'commandFilter', 'teamId', 'signingSecret', 'validateSignature'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'teamId',
      'enterpriseId',
      'channelId',
      'channelName',
      'chatId',
      'threadTs',
      'messageTs',
      'command',
      'triggerId',
      'responseUrl',
      'callbackId',
      'actionId',
      'interactionType',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_slack',
    ],
    troubleshootingTerms: [
      'Invalid Slack webhook signature.',
      'Workflow is not active.',
      'Slack webhook received, no events matched this trigger.',
      'No active Slack connection found. Create one in Connections first.',
      'Selected connection is not a Slack connection.',
      'channel_not_found (from a downstream Slack Message reply)',
      'PUBLIC_BASE_URL is required to register Slack webhooks.',
      'Next node cannot find Slack trigger fields',
      'Permission denied after Slack Trigger',
    ],
    credentialKind: 'slack_trigger',
  },
  {
    doc: stripeTriggerDoc,
    usageInputKeys: ['eventTypes', 'connect', 'livemode', 'customerId', 'currency', 'minAmount', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'livemode',
      'apiVersion',
      'accountId',
      'objectId',
      'objectType',
      'customerId',
      'customerEmail',
      'amount',
      'amountReceived',
      'amountPaid',
      'amountTotal',
      'currency',
      'status',
      'paymentIntentId',
      'chargeId',
      'checkoutSessionId',
      'invoiceId',
      'subscriptionId',
      'paymentMethodId',
      'receiptUrl',
      'description',
      'metadata',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_stripe',
    ],
    troubleshootingTerms: [
      'No active Stripe connection found. Save a Stripe Secret Key connection first.',
      'Invalid Stripe webhook signature.',
      'Workflow is not active.',
      'Ignored non-actionable Stripe payload.',
      'Ignored Stripe event not matching this trigger.',
      'Stripe API error (401/403): ...',
      'Stripe webhook endpoint creation did not return an endpoint id and signing secret.',
      'PUBLIC_BASE_URL is required to register Stripe webhooks.',
      'Next node cannot find Stripe trigger fields',
      'Permission denied after Stripe Trigger',
    ],
    credentialKind: 'stripe_trigger',
  },
  {
    doc: tallyTriggerDoc,
    usageInputKeys: ['formId', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'formId',
      'formName',
      'responseId',
      'answers',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_tally',
    ],
    troubleshootingTerms: [
      'No active Tally connection found. Save a Tally Personal Access Token in Connections first.',
      'A Tally form ID is required.',
      'Invalid Tally webhook signature.',
      'Workflow is not active.',
      'Ignored non-form-response Tally payload.',
      'Ignored Tally response not matching this trigger.',
      'Tally API error (401/403/404): ...',
      'PUBLIC_BASE_URL is required to register Tally webhooks.',
      'Next node cannot find Tally trigger fields',
      'Permission denied after Tally Trigger',
    ],
    credentialKind: 'tally_trigger',
  },
  {
    doc: telegramTriggerDoc,
    usageInputKeys: ['updateTypes', 'allowedChatIds', 'commandFilter', 'secretToken'],
    outputDescriptionTerms: [
      'chatId',
      'messageId',
      'text',
      'username',
      'firstName',
      'lastName',
      'userId',
      'updateType',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'updateId',
      'sessionId',
      'timestamp',
      '_telegram',
    ],
    troubleshootingTerms: [
      'Invalid Telegram webhook secret token.',
      'This Telegram bot already has a webhook registered at',
      'Workflow is not active.',
      'No active Telegram Bot Token connection found. Create one in Connections first.',
      'Telegram Bot Token is missing from the selected connection.',
      'Telegram setWebhook failed (400/401): ...',
      'PUBLIC_BASE_URL is required to register Telegram webhooks.',
      'Next node cannot find Telegram trigger fields',
      'Permission denied after Telegram Trigger',
    ],
    credentialKind: 'telegram_trigger',
  },
  {
    doc: trelloTriggerDoc,
    usageInputKeys: ['modelId', 'eventTypes', 'boardId', 'listId', 'cardId', 'memberId', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'actionId',
      'actionType',
      'boardId',
      'boardName',
      'boardUrl',
      'listId',
      'listName',
      'listBeforeId',
      'listBeforeName',
      'listAfterId',
      'listAfterName',
      'cardId',
      'cardName',
      'cardUrl',
      'cardShortLink',
      'commentText',
      'checklistId',
      'checklistName',
      'checkItemId',
      'checkItemName',
      'memberId',
      'memberName',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_trello',
    ],
    troubleshootingTerms: [
      'Trello Trigger requires the Trello app secret for X-Trello-Webhook signature validation. Add App Secret to your Trello connection.',
      'A Trello model ID is required. Use a board ID for board/list/card activity, or a card/member ID for narrower events.',
      'No active Trello connection found. Save a Trello API Key & Token connection first.',
      'Invalid Trello webhook signature.',
      'Workflow is not active.',
      'Ignored non-actionable Trello payload.',
      'Ignored Trello event not matching this trigger.',
      'Trello API error (401/404): ...',
      'PUBLIC_BASE_URL is required to register Trello webhooks.',
      'Next node cannot find Trello trigger fields',
      'Permission denied after Trello Trigger',
    ],
    credentialKind: 'trello_trigger',
  },
  {
    doc: typeformTriggerDoc,
    usageInputKeys: ['formId', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'formId',
      'responseId',
      'answers',
      'hidden',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_typeform',
    ],
    troubleshootingTerms: [
      'No active Typeform connection found. Save a Typeform Personal Access Token in Connections first.',
      'A Typeform form ID is required.',
      'Invalid Typeform webhook signature.',
      'Workflow is not active.',
      'Ignored non-form-response Typeform payload.',
      'Ignored Typeform response not matching this trigger.',
      'Typeform API error (401/403/404): ...',
      'PUBLIC_BASE_URL is required to register Typeform webhooks.',
      'Next node cannot find Typeform trigger fields',
      'Permission denied after Typeform Trigger',
    ],
    credentialKind: 'typeform_trigger',
  },
  {
    doc: whatsappTriggerDoc,
    usageInputKeys: ['eventTypes', 'phoneNumberId', 'allowedWaIds', 'verifyToken', 'validateSignature'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'chatId',
      'from',
      'waId',
      'contactName',
      'profileName',
      'messageId',
      'messageType',
      'mediaId',
      'status',
      'recipientId',
      'phoneNumberId',
      'displayPhoneNumber',
      'businessAccountId',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_whatsapp',
    ],
    troubleshootingTerms: [
      'Invalid verify token.',
      'Invalid WhatsApp webhook signature.',
      'Workflow is not active.',
      'No active WhatsApp connection found. Create one in Connections first.',
      'Selected connection is not a WhatsApp connection.',
      'WhatsApp access token is missing from the selected connection.',
      'PUBLIC_BASE_URL is required to register WhatsApp webhooks.',
      'Next node cannot find WhatsApp trigger fields',
      'Permission denied after WhatsApp Trigger',
    ],
    credentialKind: 'whatsapp_trigger',
  },
  {
    doc: ifElseDoc,
    usageInputKeys: ['conditions', 'conditionField', 'conditionOperator', 'conditionValue', 'combineOperation'],
    outputDescriptionTerms: ['orderId', 'customerEmail', 'orderTotal', 'status', 'condition', 'condition_result', 'conditionResult', 'result', 'branch', 'output', 'data'],
    troubleshootingTerms: ['Missing TRUE output path', 'Missing FALSE output path', 'Condition never matches', 'Wrong field path', 'Wrong Combine Operation', 'Text compared as number', 'Permission denied'],
  },
  {
    doc: switchDoc,
    usageInputKeys: ['expression', 'cases', 'routingType', 'rules'],
    outputDescriptionTerms: ['ticketId', 'customerEmail', 'category', 'priority', '__routing', 'matchedCase', 'matchedLabel', 'expression', 'expressionValue', 'branch', 'caseMatched', 'output', 'data', 'result'],
    troubleshootingTerms: ['Missing expression', 'Missing cases', 'Duplicate case value', 'No matching case', 'Case branch is not connected', 'Wrong field path', 'Permission denied'],
  },
  {
    doc: filterDoc,
    usageInputKeys: ['array', 'condition'],
    outputDescriptionTerms: ['batchId', 'sourceCount', 'items', 'output', 'data', 'result', '_error'],
    troubleshootingTerms: ['Condition is required', 'Array expression is not a list', 'Filter node execution is disabled for security reasons', 'Condition removed every item', 'Wrong item field name', 'Next node cannot find filtered items', 'Permission denied'],
  },
  {
    doc: mergeDoc,
    usageInputKeys: ['mode'],
    outputDescriptionTerms: ['overwrite', 'append', 'deep_merge', 'items', 'no extra wrapper keys'],
    troubleshootingTerms: ['Unexpected overwritten field', 'Next node cannot find items', 'Next node cannot find top-level field', 'Missing incoming branch', 'Deep merge did not combine arrays', 'Permission denied'],
  },
  {
    doc: mergeDataDoc,
    usageInputKeys: ['mode'],
    outputDescriptionTerms: ['overwrite', 'append', 'deep_merge', 'no extra wrapper keys'],
    troubleshootingTerms: [
      'Append or Deep Merge Objects mode has no connected branches to combine',
      'saved connection data could not be looked up',
      'Deep Merge Objects does not combine arrays or mismatched types',
      'unrecognized or misspelled Mode value is silently treated as Overwrite Fields',
    ],
  },
  {
    doc: noopDoc,
    usageInputKeys: [],
    outputDescriptionTerms: ['same object', 'unchanged', 'no success flag'],
    troubleshootingTerms: [
      'Expected a field to change',
      'Downstream service still needs a connection',
      'Next node cannot find expected data',
    ],
  },
  {
    doc: stopAndErrorDoc,
    usageInputKeys: ['errorMessage', 'errorCode'],
    outputDescriptionTerms: ['throws', 'ERROR_CODE', 'no structured success output'],
    troubleshootingTerms: [
      'Workflow stopped earlier than expected',
      'Message is too vague',
      'Expected a structured output object',
      'Sensitive data appears in logs',
    ],
  },
  {
    doc: waitDoc,
    usageInputKeys: ['duration', 'unit'],
    outputDescriptionTerms: ['unchanged', 'no resumed flag', '5 minutes'],
    troubleshootingTerms: [
      'Delay is much shorter than expected',
      'Long wait ended after five minutes',
      'Expected condition_met, timeout, or waitedMs output',
      'Next node still cannot access a service',
    ],
  },
  {
    doc: parallelDoc,
    usageInputKeys: ['mode'],
    outputDescriptionTerms: ['mode', 'results', 'input', 'metadata'],
    troubleshootingTerms: [
      'No real branch outputs in results',
      'Race mode does not cancel downstream work',
      'Primitive input is not preserved as a top-level field',
      'Branch fan-out/fan-in is handled by the workflow engine',
    ],
  },
  {
    doc: retryDoc,
    usageInputKeys: ['maxAttempts', 'delayBetween', 'backoff'],
    outputDescriptionTerms: ['attempts', 'maxAttempts', 'delayBetween', 'backoff', 'input', 'metadata'],
    troubleshootingTerms: [
      'Retry node does not rerun the previous node by itself',
      'Delay field has no effect',
      'Backoff Multiplier has no effect',
      'maxAttempts must be at least 1',
    ],
  },
  {
    doc: returnDoc,
    usageInputKeys: ['value', 'includeInput'],
    outputDescriptionTerms: ['success', '__return', 'returnedValue'],
    troubleshootingTerms: [
      'returnedValue is the real output key',
      'value is stripped by config cleaning',
      'Include Input overrides Return Value',
      'Return node failed',
    ],
  },
  {
    doc: timeoutDoc,
    usageInputKeys: ['limit'],
    outputDescriptionTerms: ['elapsedMs', 'limitMs', 'timedOut', 'originalInput', '__routing'],
    troubleshootingTerms: [
      'INVALID_CONFIG',
      'Invalid timeout limit. Must be a positive number.',
      'timedOut true routes to timeout branch',
      'limitMs is used instead of limit',
    ],
  },
  {
    doc: tryCatchDoc,
    usageInputKeys: [],
    outputDescriptionTerms: ['__routing', 'try', 'catch', 'errorHandling'],
    troubleshootingTerms: [
      'Try/Catch node itself does not run the protected service call',
      'Catch branch only receives error context when the engine routes an error',
      'input fields are preserved',
      'TRY_CATCH_ERROR',
    ],
  },
  {
    doc: renameKeysDoc,
    usageInputKeys: ['mappings'],
    outputDescriptionTerms: ['renamed', 'unchanged'],
    troubleshootingTerms: [
      'Rename Keys: mappings must be an object',
      'silently skipped when it does not exist',
      'silently overwrites',
      'not automatically mapped in downstream nodes',
    ],
  },
  {
    doc: setVariableDoc,
    usageInputKeys: ['name', 'value'],
    outputDescriptionTerms: ['single field', 'discarded'],
    troubleshootingTerms: [
      'silently creates a field named with an empty string',
      'Every field from before this node is lost',
      'The Values field has no effect',
      'The Keep Source toggle has no effect',
    ],
  },
  {
    doc: sortDoc,
    usageInputKeys: ['field', 'direction', 'type'],
    outputDescriptionTerms: ['items', 'unchanged'],
    troubleshootingTerms: [
      'Missing or non-array items is silently returned unchanged',
      'silently sorts as if the value were 0',
      'Auto Type can compare different pairs of items using different rules',
      'looks sorted the wrong way',
    ],
  },
  {
    doc: textFormatterDoc,
    usageInputKeys: ['template'],
    outputDescriptionTerms: ['resolved text', 'not preserved separately'],
    troubleshootingTerms: [
      'silently converts the whole item to a JSON string',
      'silently resolves to an empty string',
      'outputs the literal text "null"',
      'Downstream node cannot find the expected field',
    ],
  },
  {
    doc: xmlDoc,
    usageInputKeys: ['xml'],
    outputDescriptionTerms: ['Parse', 'Extract', 'Validate'],
    troubleshootingTerms: [
      'XML: xml field is required',
      'XML: input exceeds maxSize',
      'XML extract: xpath field is required',
      'non-matching XPath Expression silently returns null',
      'XML: unsupported operation',
      'XML error:',
      'Invalid XML during Validate is a normal result',
    ],
  },
  {
    doc: setDoc,
    usageInputKeys: ['fields'],
    outputDescriptionTerms: ['incoming', 'overwrites', 'customerEmail', 'fullName', 'leadSource', 'lifecycleStage', 'readyForSales'],
    troubleshootingTerms: ['Fields is required', 'Set: fields must be valid JSON object', 'Missing upstream value', 'Unexpected overwritten field', 'Next node cannot find set field', 'Permission denied'],
  },
  {
    doc: editFieldsDoc,
    usageInputKeys: ['fields'],
    outputDescriptionTerms: ['incoming', 'overwrites', 'customerEmail', 'fullName', 'priorityLabel', 'needsManagerReview', '_error'],
    troubleshootingTerms: ['Fields must be an object', 'No fields changed', 'Missing upstream value', 'Unexpected overwritten field', 'Next node cannot find edited field', 'Permission denied'],
  },
  {
    doc: loopDoc,
    usageInputKeys: ['array', 'maxIterations'],
    outputDescriptionTerms: ['items', 'loop.maxIterations', 'loop.iterations', 'loop.truncated', '_warning', 'DAG runtime', 'reportDate'],
    troubleshootingTerms: ['Array is empty', 'Array expression is not a list', 'Loop truncated items', 'Branch did not run once per item', 'Next node cannot find loop items', 'Permission denied'],
  },
  {
    doc: splitInBatchesDoc,
    usageInputKeys: ['array', 'batchSize'],
    outputDescriptionTerms: ['batches', 'batchSize', 'totalBatches', 'items', '_warning', 'DAG runtime', 'syncDate'],
    troubleshootingTerms: ['Batch Size is required', 'Array expression is not a list', 'No batches created', 'Branch did not run once per batch', 'Next node cannot find batches', 'Permission denied'],
  },
  {
    doc: javascriptDoc,
    usageInputKeys: ['code', 'timeout', 'outputSchema'],
    outputDescriptionTerms: ['output', 'data', 'result', 'customerEmail', 'riskScore', 'eligibleForReview', 'processedAt', '_error'],
    troubleshootingTerms: ['JavaScript node: Code is required', 'JavaScript node execution is disabled for security reasons', 'Execution timeout', 'Script returned unexpected shape', 'Next node cannot find returned field', 'Permission denied'],
  },
  {
    doc: httpRequestDoc,
    usageInputKeys: ['url', 'method', 'headers', 'body', 'qs', 'timeout'],
    outputDescriptionTerms: ['status', 'statusText', 'headers', 'body', 'data', 'url', 'acknowledgementStatus', '_error'],
    troubleshootingTerms: ['HTTP Request node: URL is required', 'URL must be valid or an expression', 'fetch failed - Network error', 'Request timeout', '401 or 403 authorization error', '400 or validation error from API', 'Next node cannot find response field', 'Permission denied'],
  },
  {
    doc: emailDoc,
    usageInputKeys: ['to', 'subject', 'text', 'html', 'from'],
    outputDescriptionTerms: ['customerEmail', 'invoiceNumber', 'success', 'messageId', 'accepted', 'rejected', '_error'],
    troubleshootingTerms: ['Email (SMTP): to, subject, and text/html are required', 'Email (SMTP): missing SMTP credentials', 'Authentication failed', 'Sender address rejected', 'Recipient rejected or invalid email format', 'Next node cannot find send result', 'Permission denied'],
    credentialKind: 'smtp',
  },
  {
    doc: slackMessageDoc,
    usageInputKeys: ['channel', 'message', 'threadTs', 'blocks', 'username', 'iconEmoji'],
    outputDescriptionTerms: ['id', 'status', 'provider', 'ok', 'channel', 'ts', 'threadTs', 'message', 'error'],
    troubleshootingTerms: ['Slack Message node: Slack OAuth bot token is required', 'Slack Message node: channel is required when using Slack OAuth bot token', 'Slack Message node: Message or Blocks is required', 'channel_not_found or not_in_channel', 'invalid_auth, not_authed, or missing_scope', 'invalid_blocks', 'Next node cannot find Slack message ID', 'Permission denied'],
    credentialKind: 'slack',
  },
  {
    doc: microsoftTeamsDoc,
    usageInputKeys: ['webhookUrl', 'message', 'serviceUrl', 'conversationId', 'replyToId'],
    outputDescriptionTerms: ['success', 'teams.status', 'teams.response', 'teams.id', 'botReply', '_error', '_errorDetails'],
    troubleshootingTerms: ['Teams: message is required', 'Teams: provide webhookUrl, or use serviceUrl/conversationId plus a Microsoft Teams Bot connection for trigger replies.', 'Teams bot token failed', 'Teams: serviceUrl must be an HTTPS Bot Framework service URL.', 'Teams bot reply failed', 'Teams webhook failed', 'Teams error', 'Next node cannot find Teams send result', 'Permission denied'],
    credentialKind: 'teams',
  },
  {
    doc: telegramDoc,
    usageInputKeys: ['operation', 'chatId', 'messageType', 'message', 'text', 'parseMode', 'disableWebPagePreview', 'mediaUrl', 'caption', 'replyToMessageId', 'editMessageId', 'replyMarkup', 'disableNotification', 'protectContent', 'allowSendingWithoutReply'],
    outputDescriptionTerms: ['success', 'operation', 'chatId', 'messageId', 'data', 'raw', 'telegram', '_error', '_errorDetails'],
    troubleshootingTerms: ['Telegram: chatId is required', 'Telegram: bot token not found. Connect Telegram or provide botToken.', 'Telegram: message is required for text messages', 'Telegram: messageId is required for Edit Message', 'Telegram: text is required for Edit Message', 'Telegram: mediaUrl is required for operation', 'Telegram: Unsupported operation', 'Telegram sendMessage failed / Telegram sendPhoto failed', 'Telegram error', 'Next node cannot find Telegram message ID', 'Permission denied'],
    credentialKind: 'telegram',
  },
  {
    doc: whatsappDoc,
    usageInputKeys: ['resource', 'operation'],
    outputDescriptionTerms: ['success', 'data', '_error', '_errorCode', '_errorDetails'],
    troubleshootingTerms: [
      'No WhatsApp token found. Please connect your WhatsApp Business account in settings.',
      'Meta API error 190: Your Facebook/Meta access token has expired. Please reconnect your account.',
      'Missing permission: required permission. Please reconnect your account and grant the required permissions.',
      "Template 'name' is not approved for sending.",
      'Your WhatsApp account has been temporarily blocked. Please try again later.',
      'Could not resolve phoneNumberId: no phone numbers found on this account.',
      'Could not resolve businessAccountId: WABA not found for this phone number.',
      'Unknown resource / Unknown message operation / Unknown contact operation / Unknown conversation operation / Unknown template operation / Unknown campaign operation / Unknown aiAgent operation',
      'Next node cannot find WhatsApp message id',
      'Empty result from list/search operations',
      'Invalid JSON in Contacts, Template Components, Buttons, Sections, or CTA Button',
      'Permission denied after WhatsApp',
    ],
    credentialKind: 'whatsapp',
  },
  {
    doc: discordDoc,
    usageInputKeys: ['channelId', 'message', 'interactionToken', 'applicationId', 'replyToMessageId'],
    outputDescriptionTerms: ['success', 'discord', 'id', 'channel_id', 'content', 'author', 'timestamp', 'interactionReply', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Discord: message is required',
      'Discord: Connect a Discord Bot Token credential, then select it in the Properties Panel.',
      'Discord: channelId is required when using Bot API. Add your Discord channel ID in the Properties Panel.',
      'Discord send failed',
      'Discord interaction reply failed',
      'Discord error',
      'Next node cannot find Discord message',
      'Permission denied after Discord',
    ],
    credentialKind: 'discord',
  },
  {
    doc: discordWebhookDoc,
    usageInputKeys: ['message', 'username', 'avatarUrl'],
    outputDescriptionTerms: ['success', 'sent', 'message', 'discord_webhook', 'status', 'delivered', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Discord Webhook: webhookUrl and message are required',
      'Discord webhook failed',
      'Discord webhook error',
      'Next node cannot find webhook delivery status',
      'Permission denied after Discord Webhook',
    ],
    credentialKind: 'discord_webhook',
  },
  {
    doc: googleGmailDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['Gmail', '_error'],
    troubleshootingTerms: [
      'Gmail: OAuth token not found',
      'Gmail: missing recipient email(s)',
      'Gmail: "subject" field is required',
      'Gmail: "body" field is required',
      'Gmail: "messageId" field is required for get operation',
      'Gmail: could not read inline spreadsheet',
      'Gmail: Authentication failed',
      'Gmail: Permission denied',
      'Gmail: Unsupported operation',
      'Next node cannot find Gmail result',
      'Permission denied after Gmail',
    ],
    credentialKind: 'gmail',
  },
  {
    doc: gmailTriggerDoc,
    usageInputKeys: ['pubsubTopic', 'eventTypes', 'labelIds', 'query', 'validateAuth', 'audience', 'validationSecret'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'emailAddress',
      'historyId',
      'messageId',
      'threadId',
      'subject',
      'from',
      'to',
      'snippet',
      'labelIds',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_gmail',
    ],
    troubleshootingTerms: [
      'PUBLIC_BASE_URL is required to register Gmail push webhooks.',
      'A Google Cloud Pub/Sub topic name is required to watch a Gmail mailbox.',
      'Invalid Gmail Pub/Sub push request.',
      'No active Google connection found. Connect Google (Gmail) in Connections first.',
      'Gmail API error (403)',
      'PUBLIC_BASE_URL is required to execute Gmail-triggered workflows.',
      'No messages trigger after activation',
      'Next node cannot find Gmail trigger fields',
      'Permission denied after Gmail Trigger',
    ],
    credentialKind: 'gmail_trigger',
  },
  {
    doc: googleSheetsDoc,
    usageInputKeys: ['operation', 'spreadsheetId', 'sheetName'],
    outputDescriptionTerms: ['Google Sheets', 'values'],
    troubleshootingTerms: [
      'Google Sheets node: Spreadsheet ID is required',
      'Google Sheets: OAuth token not found',
      'Google Sheets: Sheet "..." not found in spreadsheet',
      'Google Sheets node: No values provided for write/append/update operation',
      'Google Sheets API error',
      'Google Sheets node: Unsupported operation',
      'Next node cannot find sheet rows',
      'Permission denied after Google Sheets',
    ],
    credentialKind: 'google_sheets',
  },
  {
    doc: googleSheetsTriggerDoc,
    usageInputKeys: ['spreadsheetId', 'sheetName', 'hasHeaderRow', 'eventTypes', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'spreadsheetId',
      'sheetName',
      'rowNumber',
      'values',
      'row',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_googleSheets',
    ],
    troubleshootingTerms: [
      'A Google Sheets spreadsheet ID is required.',
      'Spreadsheet ID is required (set it on the Google Sheets Trigger node).',
      'No active Google connection found. Connect Google (Sheets) in Connections first.',
      'Google Sheets API error (403)',
      'PUBLIC_BASE_URL is required to execute Google Sheets-triggered workflows.',
      'No rows trigger after activation',
      'Next node cannot find row fields',
      'Permission denied after Google Sheets Trigger',
    ],
    credentialKind: 'google_sheets_trigger',
  },
  {
    doc: googleCalendarDoc,
    usageInputKeys: ['operation', 'calendarId'],
    outputDescriptionTerms: ['_error', '_errorDetails'],
    troubleshootingTerms: [
      'Google Calendar node: OAuth connection required',
      'calendarId is required',
      'calendarId and eventId are required',
      'calendarId, start, and end are required',
      'calendarId and text are required',
      'calendarId, eventId, and destinationCalendarId are required',
      'Unknown resource "..." or operation "..."',
      'Google Calendar event.…: … (status: 404)',
      'Next node cannot find the event fields',
      'Permission denied after Google Calendar',
    ],
    credentialKind: 'google_calendar',
  },
  {
    doc: googleCalendarTriggerDoc,
    usageInputKeys: ['calendarId', 'eventTypes', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'calendarId',
      'eventIdRaw',
      'subject',
      'organizer',
      'start',
      'end',
      'attendees',
      'htmlLink',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_googleCalendar',
    ],
    troubleshootingTerms: [
      'PUBLIC_BASE_URL is required to register Google Calendar watch channels.',
      'No active Google connection found. Connect Google (Calendar) in Connections first.',
      'Google Calendar API error (403)',
      'Ignored notification with invalid channel/token',
      'PUBLIC_BASE_URL is required to execute Google Calendar-triggered workflows.',
      'No events trigger after activation',
      'Next node cannot find calendar fields',
      'Permission denied after Google Calendar Trigger',
    ],
    credentialKind: 'google_calendar_trigger',
  },
  {
    doc: googleDriveDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['_error', 'GOOGLE_DRIVE_FAILED'],
    troubleshootingTerms: [
      'Google OAuth token not found',
      'fileId is required for download',
      'fileName is required for upload',
      'fileData is required for upload',
      'Unsupported Google Drive operation: delete',
      'Google Drive API error (via GOOGLE_DRIVE_FAILED)',
      'Next node cannot find the uploaded/downloaded file fields',
      'Permission denied after Google Drive',
    ],
    credentialKind: 'google_drive',
  },
  {
    doc: googleDriveTriggerDoc,
    usageInputKeys: ['folderId', 'eventTypes', 'query'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'fileId',
      'name',
      'mimeType',
      'parents',
      'modifiedTime',
      'webViewLink',
      'raw',
      'trigger',
      'workflow_id',
      'node_id',
      'sessionId',
      '_googleDrive',
    ],
    troubleshootingTerms: [
      'PUBLIC_BASE_URL is required to register Google Drive watch channels.',
      'No active Google connection found. Connect Google (Drive) in Connections first.',
      'Google Drive API error (403)',
      'Ignored notification with invalid channel/token',
      'PUBLIC_BASE_URL is required to execute Google Drive-triggered workflows.',
      'No files trigger after activation',
      'Next node cannot find Drive file fields',
      'Permission denied after Google Drive Trigger',
    ],
    credentialKind: 'google_drive_trigger',
  },
  {
    doc: googleDocDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['_error', 'documentId'],
    troubleshootingTerms: [
      'Google Docs node: Document ID or Document URL is required for the',
      'Google Docs: OAuth token not found',
      'Google Docs node: Content is required for write operation',
      'Google Docs node: Content is required for append operation',
      'Google Docs API error',
      'Google Docs node: Unsupported operation',
      'Next node cannot find document content',
      'Permission denied after Google Docs',
    ],
    credentialKind: 'google_doc',
  },
  {
    doc: googleContactsDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['_error', 'GOOGLE_CONTACTS_FAILED'],
    troubleshootingTerms: [
      'Unsupported Google Contacts operation',
      'At least one of name, email, phone, or contactData is required to create a contact',
      'contactId is required for update',
      'contactId is required for delete',
      'At least one of name, email, phone, or contactData is required to update a contact',
      'Google OAuth token not found',
      'Next node cannot find contact fields',
      'Permission denied after Google Contacts',
    ],
    credentialKind: 'google_contacts',
  },
  {
    doc: googleTasksDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['_error', 'GOOGLE_TASKS_FAILED'],
    troubleshootingTerms: [
      'Google OAuth token not found',
      'title is required for create',
      'taskId is required for update',
      'taskId is required for delete',
      'Google Tasks due date must be a calendar date, for example 2026-12-31',
      'Unsupported Google Tasks operation',
      'Next node cannot find task fields',
      'Permission denied after Google Tasks',
    ],
    credentialKind: 'google_tasks',
  },
  {
    doc: googleBigqueryDoc,
    usageInputKeys: ['projectId', 'query'],
    outputDescriptionTerms: ['_error', 'GOOGLE_BIGQUERY_FAILED'],
    troubleshootingTerms: [
      'projectId is required',
      'query is required',
      'Google OAuth token not found',
      'BigQuery API error (permission denied)',
      'BigQuery API error (invalid query / not found)',
      'Next node cannot find row data as plain objects',
      'Permission denied after Google BigQuery',
    ],
    credentialKind: 'google_bigquery',
  },
  {
    doc: slackWebhookDoc,
    usageInputKeys: ['message'],
    outputDescriptionTerms: ['status', 'provider'],
    troubleshootingTerms: [
      'Slack Webhook node: Webhook URL is required',
      'Slack Webhook node: Message text is required',
      'Slack API error: <status> <statusText> - <body>',
      'Next node cannot find fields that existed before Slack Webhook',
      'Downstream node checks {{$json._error}} and finds nothing on failure',
      'Permission denied after Slack Webhook',
    ],
    credentialKind: 'slack_webhook',
  },
  {
    doc: amazonSesDoc,
    usageInputKeys: ['recipients', 'fromAddress', 'subject', 'body'],
    outputDescriptionTerms: ['success', 'messageId', 'recipientCount', 'failedRecipients', 'attempts', '_error', 'error', 'timestamp'],
    troubleshootingTerms: [
      'AWS credential retrieval failed: AWS credentials not found',
      'AWS credential validation failed: Access Key ID / Secret Access Key format invalid',
      'Email subject is required / Email body (HTML or text) is required',
      'At least one recipient (To, Cc, or Bcc) is required / Invalid email addresses',
      "AWS SES template '...' not found / Template data validation failed",
      'Attachment format/size validation failed',
      'Sender email is not verified in AWS SES / Email was rejected by AWS SES',
      'Temporary AWS SES error (rate limiting / throttling)',
      'Next node cannot find the send result',
      'Permission denied after Amazon SES',
    ],
    credentialKind: 'amazon_ses',
  },
  {
    doc: logOutputDoc,
    usageInputKeys: ['message', 'level'],
    outputDescriptionTerms: ['Message text', 'terminal', 'execution history', '_error'],
    troubleshootingTerms: [
      'Nothing appears in the execution log',
      'Expected value shows as {{$json.field}} literally instead of the real data',
      'Chose Level: Error but the workflow kept running past a real failure',
      'Cannot connect an outgoing line from Log Output',
      'One shared Log Output node is not receiving all the messages from several branches',
    ],
  },
  {
    doc: mailgunDoc,
    usageInputKeys: ['from', 'to', 'subject', 'html'],
    outputDescriptionTerms: ['success', 'messageId', 'message', 'mailgun', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Mailgun: domain is required / Mailgun: apiKey is required / Mailgun: from email is required',
      'Mailgun: to email is required',
      'Mailgun: text, html, or template is required',
      'Mailgun: templateVariables must be a JSON object',
      'Mailgun send failed (<status>): <message> / Forbidden or unauthorized recipient',
      'Mailgun send failed: no response from API / Mailgun error',
      'Next node cannot find the send result',
      'Permission denied after Mailgun',
    ],
    credentialKind: 'mailgun',
  },
  {
    doc: sendgridDoc,
    usageInputKeys: ['from', 'to', 'subject', 'html'],
    outputDescriptionTerms: ['success', 'status', 'messageId', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'SendGrid: apiKey is required',
      'SendGrid: from email is required / SendGrid: to email is required',
      'SendGrid send failed (403): Unauthorized / sender identity not verified',
      'This node does not support CC, BCC, Reply-To, attachments, categories, or SendGrid Dynamic Templates',
      'Next node cannot find the send result',
      'Permission denied after SendGrid',
    ],
    credentialKind: 'sendgrid',
  },
  {
    doc: twilioDoc,
    usageInputKeys: ['to', 'message', 'from'],
    outputDescriptionTerms: ['success', 'sid', 'status', 'twilio', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Twilio: to and message are required',
      'Twilio: "to"/"from" must be a valid E.164 phone number',
      'Twilio: missing Account SID/Auth Token',
      'Twilio: either "from" or "messagingServiceSid" is required',
      'Twilio send failed (<status>)',
      'Next node cannot find the send result',
      'Permission denied after Twilio',
    ],
    credentialKind: 'twilio',
  },
  {
    doc: whatsappCloudDoc,
    usageInputKeys: ['to', 'text'],
    outputDescriptionTerms: ['success', 'data', '_error', '_errorCode', '_errorDetails'],
    troubleshootingTerms: [
      'This deprecated node only sends plain text',
      'Message Type dropdown does nothing when changed',
      'Message sent with an empty body on an old saved workflow',
      'WhatsApp Business Cloud API rejected the request',
      'Next node cannot find the send result',
      'Permission denied after WhatsApp Cloud',
    ],
    credentialKind: 'whatsapp',
  },
  {
    doc: discordTriggerDoc,
    usageInputKeys: ['eventTypes', 'guildIds', 'channelIds', 'allowedUserIds', 'commandFilter', 'applicationId', 'publicKey', 'validateSignature'],
    outputDescriptionTerms: [
      'eventId',
      'eventType',
      'source',
      'userId',
      'username',
      'text',
      'timestamp',
      'applicationId',
      'guildId',
      'channelId',
      'threadId',
      'chatId',
      'messageId',
      'command',
      'customId',
      'interactionId',
      'interactionToken',
      'responseUrl',
      'rawEventType',
      'raw',
      'sessionId',
      '_discord',
    ],
    troubleshootingTerms: [
      'Invalid Discord request signature.',
      'No matching CtrlChecks workflow trigger is active for this Discord event.',
      'Workflow is not active.',
      'PUBLIC_BASE_URL is required to execute Discord-triggered workflows.',
      'No active Discord connection found. Create one in Connections first.',
      'Selected connection is not a Discord Bot Token connection.',
      'Next node cannot find Discord trigger fields',
      'Permission denied after Discord Trigger',
    ],
    credentialKind: 'discord_trigger',
  },
  {
    doc: zoomVideoDoc,
    usageInputKeys: ['operation'],
    outputDescriptionTerms: ['success', 'data', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Zoom: accessToken is required. Connect a Zoom account via /connections or provide an access token.',
      'Zoom getMeeting: meetingId is required.',
      'Zoom updateMeeting: meetingId is required.',
      'Zoom deleteMeeting: meetingId is required.',
      'Zoom createMeeting failed (401) / Zoom listMeetings failed (403)',
      'Zoom updateMeeting failed (404) / Zoom deleteMeeting failed (404)',
      'Next node cannot find Zoom meeting fields',
      'Permission denied after Zoom Video',
    ],
    credentialKind: 'zoom',
  },
  {
    doc: outlookDoc,
    usageInputKeys: ['operation', 'to', 'subject', 'body'],
    outputDescriptionTerms: ['success', 'incoming fields', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Outlook: access token not found',
      'Outlook: to, subject, and body are required',
      'Outlook: Unsupported operation',
      'Outlook sendMail failed (401 or 403)',
      'Next node cannot find a message ID',
    ],
    credentialKind: 'microsoft',
  },
  {
    doc: graphqlDoc,
    usageInputKeys: ['url', 'query', 'operationName', 'variables', 'headers', 'timeout'],
    outputDescriptionTerms: ['status', 'statusText', 'headers', 'body', 'data', 'url', 'method', 'responseTime', '_error'],
    troubleshootingTerms: [
      'GraphQL query is sent as an HTTP POST request',
      'Variables silently fall back to {}',
      'GraphQL errors are inside body.errors',
      'Request timeout or HTTP errors return _error',
    ],
  },
  {
    doc: httpPostDoc,
    usageInputKeys: ['url', 'headers', 'body'],
    outputDescriptionTerms: ['status', 'statusText', 'headers', 'body', 'data', 'url', 'method', 'responseTime', '_error'],
    troubleshootingTerms: [
      'HTTP POST rewrites to HTTP Request with method POST',
      'Body must be valid JSON or a valid mapped value',
      'Protected endpoint returns 401 or 403',
      'Network or timeout failures return _error',
    ],
  },
  {
    doc: respondToWebhookDoc,
    usageInputKeys: ['statusCode', 'responseBody', 'headers', 'body'],
    outputDescriptionTerms: ['statusCode', 'headers', 'body'],
    troubleshootingTerms: [
      'responseCode is only an alias',
      'responseBody and body both resolve to body',
      'No sent flag is returned',
      'Use with a webhook response-mode workflow',
    ],
  },
  {
    doc: schedulewiseDoc,
    usageInputKeys: ['operation', 'credentialId', 'dateFrom', 'dateTo', 'patientId', 'staffId', 'appointmentId', 'startDateTime', 'endDateTime', 'serviceType', 'notes', 'status', 'limit', 'hardDelete', 'timeoutSec', 'retries', 'outputFormat', 'mockMode'],
    outputDescriptionTerms: ['success', 'operation', 'data', 'executionTimeMs', 'error'],
    troubleshootingTerms: [
      'INVALID_OPERATION',
      'NO_CREDENTIALS',
      'PARSE_ERROR',
      'TIMEOUT',
      'NETWORK_ERROR',
      'HTTP_ERROR',
      'Credential ID is metadata only',
    ],
    credentialKind: 'schedulewise',
  },
  {
    doc: webhookResponseDoc,
    usageInputKeys: ['statusCode', 'body', 'headers'],
    outputDescriptionTerms: ['statusCode', 'headers', 'body'],
    troubleshootingTerms: [
      'No sent flag is returned',
      'responseCode is only an alias',
      'Body defaults to incoming input',
      'Use with a webhook response-mode workflow',
    ],
  },
  {
    doc: workdayDoc,
    usageInputKeys: ['baseUrl', 'tenant', 'authType', 'accessToken', 'resource', 'operation', 'limit', 'offset'],
    outputDescriptionTerms: ['success', 'resource', 'operation', 'tenant', 'records', 'record', 'count', 'pagination', 'meta', 'error'],
    troubleshootingTerms: [
      'Unsupported operation: <operation>',
      'Workday API error <status>: <response text>',
      'Blank auth fields are still sent to Workday',
      'Raw Path ignores the Resource path for URL construction',
      'Next node cannot find Workday records',
    ],
    credentialKind: 'workday',
  },
  {
    doc: calendlyDoc,
    usageInputKeys: ['operation', 'accessToken'],
    outputDescriptionTerms: ['success', 'operation', 'data', 'collection', 'user', 'count', 'error'],
    troubleshootingTerms: [
      'Calendly connection required',
      'userUri is required for get_event_types',
      'userUri is required for get_scheduled_events',
      'Unsupported Calendly operation',
      'Calendly API error 401, 403, or 404',
    ],
    credentialKind: 'calendly',
  },
  {
    doc: linearDoc,
    usageInputKeys: ['operation', 'apiKey', 'teamId', 'issueId', 'title', 'description', 'stateId', 'priority'],
    outputDescriptionTerms: ['success', 'operation', 'data', 'issue', 'issues', 'teams', 'count', 'error'],
    troubleshootingTerms: [
      'Linear connection required',
      'Linear create_issue requires teamId and title',
      'Linear get_issue requires issueId',
      'Linear update_issue requires issueId',
      'Unsupported Linear operation',
      'Linear API error or GraphQL errors',
    ],
    credentialKind: 'linear',
  },
  {
    doc: notionDoc,
    usageInputKeys: ['resource', 'operation'],
    outputDescriptionTerms: ['success true', 'data', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Notion node: OAuth connection required',
      'Notion node: pageId is required for get/update/archive/restore',
      'Notion node: Either databaseId or parentPageId is required for create operation',
      'Notion node: properties is required',
      'Notion node: databaseId is required for query/get/update',
      'Notion node: blockId is required for block operations',
      'Notion node: richText array is required for create comment operation',
      'Notion node: The Notion API does not support retrieving a single comment by ID',
      'Notion node: Unknown operation or resource',
    ],
    credentialKind: 'notion',
  },
  {
    doc: trelloDoc,
    usageInputKeys: ['apiKey', 'token', 'operation', 'boardId', 'listId', 'cardId', 'cardName', 'cardDesc', 'dueDate', 'idLabels', 'idMembers', 'newListId', 'checklistName'],
    outputDescriptionTerms: ['success', 'operation', 'data', 'cards', 'boards', 'lists', 'card', 'labels', 'count', 'error'],
    troubleshootingTerms: [
      'Trello connection required',
      'boardId is required for get_lists',
      'boardId or listId is required for list_cards',
      'listId and cardName are required for create_card',
      'cardId is required for get_card, update_card, delete_card, or add_checklist',
      'cardId and newListId are required for move_card',
      'cardId and idLabels are required for add_label',
      'Unsupported Trello operation',
      'Trello API error',
    ],
    credentialKind: 'trello',
  },
  {
    doc: typeformDoc,
    usageInputKeys: ['operation', 'apiKey', 'formId', 'title'],
    outputDescriptionTerms: ['success', 'operation', 'data', 'items', 'totalItems', 'formId', 'error'],
    troubleshootingTerms: [
      'Typeform connection required',
      'formId is required for get_responses',
      'title is required for create_form',
      'formId is required for get_form',
      'Unsupported Typeform operation',
      'Typeform API error',
    ],
    credentialKind: 'typeform',
  },
  {
    doc: facebookDoc,
    usageInputKeys: ['resource', 'operation', 'pageId', 'message', 'text', 'recipientId', 'postId', 'commentId', 'replyText', 'link', 'photoUrl', 'videoUrl', 'metric', 'limit'],
    outputDescriptionTerms: ['success', 'provider', 'action', 'pages', 'count', 'messageId', 'commentId', 'raw', '_error'],
    troubleshootingTerms: [
      'No facebook token found',
      'Operation createTextPost is not supported for resource page',
      'Not yet implemented: <resource>.<operation>',
      'pageId is required to send a Facebook Messenger message',
      'recipientId is required to send a Facebook Messenger message',
      'message or text is required to send a Facebook Messenger message',
      'commentId or postId is required to create a Facebook comment reply',
      'message, text, replyText, or commentText is required to create a Facebook comment reply',
      'Permission error or access token expired',
    ],
    credentialKind: 'facebook',
  },
  {
    doc: instagramDoc,
    usageInputKeys: ['accessToken', 'accountId', 'resource', 'operation', 'instagramBusinessAccountId', 'recipientId', 'text', 'media_type', 'media_url', 'videoUrl', 'video_url', 'caption', 'creation_id', 'mediaId', 'commentId', 'message', 'replyText', 'metric', 'period', 'since', 'until', 'hashtagName', 'hashtagId', 'storyId', 'fields', 'limit', 'after', 'before', 'returnAll', 'credentialId'],
    outputDescriptionTerms: ['id', 'data', 'paging', 'status_code', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'Instagram node: OAuth connection required',
      'Instagram node: Could not determine Instagram Business Account ID.',
      'Instagram node: media_url or video_url is required for createAndPublish operation',
      'Instagram node: creation_id is required for publish operation',
      'Instagram node: message is required for reply operation',
      'Instagram node: metric is required for insights operation',
      'Instagram node: Unknown operation "<operation>" for resource "<resource>"',
      'Permission error or access token expired',
    ],
    credentialKind: 'instagram',
  },
  {
    doc: linkedinDoc,
    usageInputKeys: ['operation', 'text', 'articleUrl', 'mediaUrl', 'visibility', 'personUrn', 'organizationId', 'postId', 'limit', 'accessToken', 'dryRun', 'richText', 'media'],
    outputDescriptionTerms: ['success', 'dryRun', 'simulatedRequest', 'profile', 'posts', 'postCount', 'postId', 'assetUrn', 'message', '_error', '_errorDetails'],
    troubleshootingTerms: [
      'LinkedIn: Access token not found',
      'LinkedIn node: personUrn is required for get_posts operation',
      'LinkedIn node: Text is required for post operation when no mediaUrl is provided.',
      'LinkedIn node: mediaUrl is required for media posts (Create Post - Media).',
      'LinkedIn node: articleUrl is required for create_article operation',
      'LinkedIn node: organizationId is required for create_company_post operation',
      'LinkedIn node: postUrn or postId is required for delete_post operation',
      'LinkedIn authorization error',
    ],
    credentialKind: 'linkedin',
  },
  {
    doc: twitterDoc,
    usageInputKeys: ['resource', 'operation', 'text', 'tweetId', 'tweetIds', 'mediaIds', 'quoteTweetId', 'userId', 'userIds', 'username', 'usernames', 'targetUserId', 'query', 'listId', 'name', 'mediaData', 'mediaId', 'altText', 'recipientId', 'dmEventId', 'spaceId', 'maxResults', 'returnAll', 'accessToken', 'credentialId'],
    outputDescriptionTerms: ['success', 'data', 'errors', 'meta', 'includes', 'media_id', 'id', 'event', 'deleted', '_error'],
    troubleshootingTerms: [
      'Twitter node: OAuth connection required',
      'Twitter node: text is required for create operation',
      'Twitter node: tweetId is required for get/delete/like/reply operations',
      'Twitter node: query is required for search operations',
      'Twitter node: Unknown operation "<operation>" for resource "<resource>"',
      'Twitter node: Full archive search requires Academic Research or Enterprise API access',
      'Permission error or access token expired',
    ],
    credentialKind: 'twitter',
  },
  {
    doc: youtubeDoc,
    usageInputKeys: ['operation', 'title', 'description', 'tags', 'videoUrl', 'videoDataBase64', 'mimeType', 'privacyStatus', 'madeForKids', 'categoryId', 'videoId', 'channelId', 'query', 'maxResults', 'accessToken'],
    outputDescriptionTerms: ['success', 'operation', 'items', 'pageInfo', 'channel', 'channelId', 'title', 'video', 'videoId', 'url', 'privacyStatus', 'statistics', 'deleted', '_error', '_errorDetails', 'YOUTUBE_FAILED'],
    troubleshootingTerms: [
      'YouTube OAuth token not found. Connect YouTube before running this node.',
      'query is required for search_videos',
      'videoId is required for get_video_stats',
      'videoId is required for update_video_metadata',
      'At least one of title, description, or tags is required for update_video_metadata',
      'videoId is required for delete_video',
      'YouTube operation "<operation>" is not supported yet. Select a supported YouTube v1 operation.',
      'YOUTUBE_FAILED',
    ],
    credentialKind: 'youtube',
  },
  {
    doc: delayDoc,
    usageInputKeys: ['duration', 'unit'],
    outputDescriptionTerms: ['success', 'waitedMs', 'originalInput', 'ten-minute cap'],
    troubleshootingTerms: [
      'Invalid duration',
      'Long delay was capped',
      'Expected delayed, delayMs, or resumedAt output',
      'Next node cannot find original fields at top level',
    ],
  },
  {
    doc: executeWorkflowDoc,
    usageInputKeys: ['workflowId', 'input', 'inputData'],
    outputDescriptionTerms: ['success', 'result', 'workflowId', 'error', 'topological order', 'Return node'],
    troubleshootingTerms: [
      'Workflow ID is required',
      'Sub-workflow not found: <workflowId>',
      'Sub-workflow <workflowId> is not confirmed/active',
      'Sub-workflow <workflowId> has no trigger node',
      'Failed to execute sub-workflow',
      'Next node cannot find expected child fields',
    ],
  },
  {
    doc: xeroDoc,
    usageInputKeys: ['accessToken', 'tenantId', 'resource', 'operation', 'where', 'order', 'page'],
    outputDescriptionTerms: ['success', 'resource', 'operation', 'tenantId', 'record', 'records', 'count', 'pagination', 'meta', 'error', '_error'],
    troubleshootingTerms: [
      'Xero node: accessToken is required',
      'Xero node: tenantId is required',
      'Xero node: recordId is required for get_by_id',
      'Xero node: payload is required for create',
      'Xero HTTP errors return success false instead of _error',
    ],
    credentialKind: 'xero',
  },
  {
    doc: errorHandlerDoc,
    usageInputKeys: ['fallbackValue'],
    outputDescriptionTerms: ['handled', 'value', 'input'],
    troubleshootingTerms: [
      'Fallback does not run when there is no _error',
      'handled is false even though fallbackValue is set',
      'No retry attempts happen in Error Handler',
      'Next node cannot find fallback fields',
    ],
  },
  {
    doc: functionDoc,
    usageInputKeys: ['code', 'timeout'],
    outputDescriptionTerms: ['return value', 'result', 'input', '_error'],
    troubleshootingTerms: [
      'Function node: Code is required',
      'Function node execution is disabled for security reasons',
      'Execution timeout: Code exceeded <timeout>ms execution limit',
      'Next node cannot find expected fields after Function',
    ],
  },
  {
    doc: functionItemDoc,
    usageInputKeys: ['code', 'timeout'],
    outputDescriptionTerms: ['items', 'input', 'result', '_error', 'No index'],
    troubleshootingTerms: [
      'Function item node: Code is required',
      'Function item node execution is disabled for security reasons',
      'Function item error: <message>',
      'input.items is missing, so mapping does not run',
    ],
  },
];

const weakHelpPatterns = [
  /^enter the value\.?$/i,
  /^type the id\.?$/i,
  /^select an option\.?$/i,
  /^configure this field\.?$/i,
  /^example:\s*(test|key|value)\.?$/i,
];

function allOperations(doc: NodeDoc) {
  return doc.resources.flatMap((resource) => resource.operations);
}

function allFields(doc: NodeDoc): FieldDoc[] {
  return allOperations(doc).flatMap((operation) => operation.fields);
}

function assertRichHelpText(field: FieldDoc, nodeSlug: string) {
  const help = field.helpText?.trim() || '';
  expect(help, `${nodeSlug}.${field.internalKey} is missing helpText`).not.toBe('');
  expect(help.length, `${nodeSlug}.${field.internalKey} helpText is too thin`).toBeGreaterThan(300);

  for (const pattern of weakHelpPatterns) {
    expect(
      pattern.test(help),
      `${nodeSlug}.${field.internalKey} uses placeholder-only help: ${help}`,
    ).toBe(false);
  }

  for (const phrase of [
    'What this field',
    'Why it matters',
    'When to fill it',
    'What to enter',
    'Where the value comes from',
    'How to use it later',
    'Accepted format',
    'Real workplace example',
    'If it is empty or wrong',
    'Common mistake',
  ]) {
    expect(help, `${nodeSlug}.${field.internalKey} helpText should explain: ${phrase}`).toContain(phrase);
  }
}

describe('audited node documentation coverage', () => {
  for (const { doc, usageInputKeys, outputDescriptionTerms, troubleshootingTerms, credentialKind = 'none' } of AUDITED_NODE_DOCS) {
    describe(doc.slug, () => {
      const backendNode = backendNodes.find((node) => node.type === doc.slug);
      const frontendNode = NODE_TYPES.find((node) => node.type === doc.slug);

      it('exists in backend and frontend node inventories', () => {
        expect(backendNode, `${doc.slug} is missing from worker/public/node-library.json`).toBeTruthy();
        expect(frontendNode, `${doc.slug} is missing from NODE_TYPES`).toBeTruthy();
      });

      it('documents every backend and frontend config field', () => {
        const documentedFieldKeys = new Set(allFields(doc).map((field) => field.internalKey));
        const backendConfigFields = [
          ...(backendNode?.requiredConfig || []),
          ...(backendNode?.optionalConfig || []),
        ];
        const frontendConfigFields = frontendNode?.configFields.map((field) => field.key) || [];

        for (const fieldKey of [...backendConfigFields, ...frontendConfigFields]) {
          expect(
            documentedFieldKeys.has(fieldKey),
            `${doc.slug} is missing docs for config field "${fieldKey}"`,
          ).toBe(true);
        }
      });

      it('has complete operation, input example, and output example coverage', () => {
        const operations = allOperations(doc);
        expect(operations.length, `${doc.slug} should document at least one operation`).toBeGreaterThan(0);

        for (const operation of operations) {
          expect(operation.name.trim()).not.toBe('');
          expect(operation.value.trim()).not.toBe('');
          expect(operation.description.length).toBeGreaterThan(100);
          for (const inputKey of usageInputKeys) {
            expect(Object.keys(operation.usageExample.inputValues)).toContain(inputKey);
          }
          expect(operation.usageExample.scenario.length).toBeGreaterThan(40);
          expect(operation.usageExample.expectedOutput).toContain('{{$json.');
          expect(Object.keys(operation.outputExample).length).toBeGreaterThan(0);
          for (const term of outputDescriptionTerms) {
            expect(operation.outputDescription).toContain(term);
          }
        }
      });

      it('has rich field guidance and dropdown option explanations', () => {
        for (const field of allFields(doc)) {
          assertRichHelpText(field, doc.slug);

          if (field.options?.length) {
            const optionGuide = [field.description, field.helpText, field.notes].join('\n');
            for (const option of field.options) {
              expect(
                optionGuide.toLowerCase(),
                `${doc.slug}.${field.internalKey} does not explain dropdown option "${option}"`,
              ).toContain(option.toLowerCase());
            }
          }
        }
      });

      it('documents connection requirements without treating credentials as workflow input', () => {
        const connectionGuide = [
          doc.credentialType,
          ...doc.credentialSetupSteps,
          ...doc.commonErrors.map((error) => `${error.error} ${error.cause} ${error.fix}`),
        ].join('\n');

        if (credentialKind === 'ai_provider') {
          expect(connectionGuide).toMatch(/AI provider credentials/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault|wallet|key pool/i);
          expect(connectionGuide).toMatch(/Gemini|Claude|OpenAI/i);
          expect(connectionGuide).toMatch(/provider secrets|API keys/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'openai_provider') {
          expect(connectionGuide).toMatch(/OpenAI API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault|wallet|key pool/i);
          expect(connectionGuide).toMatch(/sk-|OpenAI/i);
          expect(connectionGuide).toMatch(/API key/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'gemini') {
          expect(connectionGuide).toMatch(/Gemini credential|Gemini/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault|wallet|key pool/i);
          expect(connectionGuide).toMatch(/Gemini 3\.5 Flash|gemini-3\.5-flash/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'anthropic') {
          expect(connectionGuide).toMatch(/Anthropic API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/sk-ant|Anthropic/i);
          expect(connectionGuide).toMatch(/API key/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'cohere') {
          expect(connectionGuide).toMatch(/Cohere API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/apiKey field directly/i);
          expect(connectionGuide).toMatch(/dashboard|Cohere/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'huggingface') {
          expect(connectionGuide).toMatch(/Hugging Face API Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/hf_/i);
          expect(connectionGuide).toMatch(/huggingface\.co\/settings\/tokens|Hugging Face/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'mistral') {
          expect(connectionGuide).toMatch(/Mistral API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Mistral/i);
          expect(connectionGuide).toMatch(/api\.mistral\.ai|La Plateforme|console/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'langchain_provider') {
          expect(connectionGuide).toMatch(/OpenAI or Anthropic API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/OpenAI|Anthropic/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'smtp') {
          expect(connectionGuide).toMatch(/SMTP Account/i);
          expect(connectionGuide).toMatch(/Connections|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password|app password/i);
        } else if (credentialKind === 'slack') {
          expect(connectionGuide).toMatch(/Slack OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/chat:write/i);
          expect(connectionGuide).toMatch(/bot token|OAuth access token/i);
          expect(connectionGuide).toMatch(/invite.*bot|private channel/i);
        } else if (credentialKind === 'slack_webhook') {
          expect(connectionGuide).toMatch(/Slack Incoming Webhook/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/hooks\.slack\.com/i);
        } else if (credentialKind === 'teams') {
          expect(connectionGuide).toMatch(/Incoming Webhook URL|Microsoft Teams Bot/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Microsoft App ID/i);
          expect(connectionGuide).toMatch(/App Password|client secret/i);
          expect(connectionGuide).toMatch(/serviceUrl.*conversationId|Service URL.*Conversation ID/i);
        } else if (credentialKind === 'telegram') {
          expect(connectionGuide).toMatch(/Telegram Bot Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/BotFather/i);
          expect(connectionGuide).toMatch(/chat ID|Chat ID/i);
          expect(connectionGuide).toMatch(/bot.*(start|added|add)/i);
        } else if (credentialKind === 'whatsapp') {
          expect(connectionGuide).toMatch(/WhatsApp Business API/i);
          expect(connectionGuide).toMatch(/Connections|credential vault/i);
          expect(connectionGuide).toMatch(/Facebook\/Meta OAuth|whatsapp_business_messaging|whatsapp_business_management/i);
          expect(connectionGuide).toMatch(/Phone Number ID/i);
          expect(connectionGuide).toMatch(/Meta Business Suite|Meta for Developers|developers\.facebook\.com/i);
        } else if (credentialKind === 'discord') {
          expect(connectionGuide).toMatch(/Discord Bot Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/discord\.com\/developers/i);
          expect(connectionGuide).toMatch(/channel ID|Channel Id/i);
          expect(connectionGuide).toMatch(/invite.*bot|OAuth2.*URL Generator/i);
        } else if (credentialKind === 'discord_trigger') {
          expect(connectionGuide).toMatch(/Discord Bot Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/discord\.com\/developers/i);
          expect(connectionGuide).toMatch(/Application ID/i);
          expect(connectionGuide).toMatch(/Public Key/i);
          expect(connectionGuide).toMatch(/Interactions Endpoint URL/i);
          expect(connectionGuide).toMatch(/Webhook Events/i);
          expect(connectionGuide).toMatch(/Bot authorization|api\/v10\/users\/@me/i);
        } else if (credentialKind === 'discord_webhook') {
          expect(connectionGuide).toMatch(/Discord Webhook URL|Webhook URL/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Integrations.*Webhooks|New Webhook/i);
          expect(connectionGuide).toMatch(/Manage Webhooks/i);
        } else if (credentialKind === 'facebook_trigger') {
          expect(connectionGuide).toMatch(/Facebook OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/pages_show_list/i);
          expect(connectionGuide).toMatch(/pages_read_engagement/i);
          expect(connectionGuide).toMatch(/pages_manage_metadata/i);
          expect(connectionGuide).toMatch(/pages_messaging/i);
          expect(connectionGuide).toMatch(/leads_retrieval/i);
          expect(connectionGuide).toMatch(/OAuth access token|Page access token/i);
          expect(connectionGuide).toMatch(/me\/accounts|\/me\/accounts/i);
          expect(connectionGuide).toMatch(/Meta for Developers|Webhooks/i);
          expect(connectionGuide).toMatch(/X-Hub-Signature-256|META_APP_SECRET|FACEBOOK_APP_SECRET/i);
        } else if (credentialKind === 'github_trigger') {
          expect(connectionGuide).toMatch(/GitHub Personal Access Token|GitHub OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/repo|admin:repo_hook|public_repo/i);
          expect(connectionGuide).toMatch(/OAuth access token|Personal Access Token|PAT/i);
          expect(connectionGuide).toMatch(/api\.github\.com\/user/i);
          expect(connectionGuide).toMatch(/\/repos\/\{owner\}\/\{repo\}\/hooks|repository webhook/i);
          expect(connectionGuide).toMatch(/X-Hub-Signature-256|HMAC-SHA256/i);
          expect(connectionGuide).toMatch(/generated signing secret|Webhook Secret Override|signing secret/i);
        } else if (credentialKind === 'gitlab_trigger') {
          expect(connectionGuide).toMatch(/GitLab Personal Access Token|GitLab OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/\bapi\b/i);
          expect(connectionGuide).toMatch(/OAuth access token|Personal Access Token|PAT/i);
          expect(connectionGuide).toMatch(/api\/v4\/user|GitLab user endpoint|gitlab\.com\/api\/v4\/user/i);
          expect(connectionGuide).toMatch(/\/api\/v4\/projects\/:id\/hooks|project webhook|projects\/\{projectId\}\/hooks/i);
          expect(connectionGuide).toMatch(/X-Gitlab-Token|shared secret/i);
          expect(connectionGuide).toMatch(/not an HMAC|not HMAC|not send an HMAC/i);
        } else if (credentialKind === 'instagram_trigger') {
          expect(connectionGuide).toMatch(/Instagram OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/instagram_basic/i);
          expect(connectionGuide).toMatch(/instagram_manage_messages/i);
          expect(connectionGuide).toMatch(/instagram_manage_comments/i);
          expect(connectionGuide).toMatch(/pages_show_list/i);
          expect(connectionGuide).toMatch(/OAuth access token|Instagram access token/i);
          expect(connectionGuide).toMatch(/me\/accounts|\/me\/accounts/i);
          expect(connectionGuide).toMatch(/Meta for Developers|Webhooks/i);
          expect(connectionGuide).toMatch(/X-Hub-Signature-256|META_APP_SECRET|INSTAGRAM_APP_SECRET|FACEBOOK_APP_SECRET/i);
        } else if (credentialKind === 'jira_trigger') {
          expect(connectionGuide).toMatch(/Jira API Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/id\.atlassian\.com\/manage-profile\/security\/api-tokens/i);
          expect(connectionGuide).toMatch(/email/i);
          expect(connectionGuide).toMatch(/rest\/api\/3\/myself/i);
          expect(connectionGuide).toMatch(/System.*WebHooks|Automation for Jira/i);
          expect(connectionGuide).toMatch(/does not sign|no signature|no HMAC/i);
        } else if (credentialKind === 'linear_trigger') {
          expect(connectionGuide).toMatch(/Linear Personal API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/workspace admin/i);
          expect(connectionGuide).toMatch(/linear\.app\/settings\/api|Settings.*API.*Personal API Keys/i);
          expect(connectionGuide).toMatch(/webhookCreate/i);
          expect(connectionGuide).toMatch(/Linear-Signature/i);
        } else if (credentialKind === 'teams_trigger') {
          expect(connectionGuide).toMatch(/Microsoft Teams Bot/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Microsoft App ID/i);
          expect(connectionGuide).toMatch(/App Password|client secret/i);
          expect(connectionGuide).toMatch(/messaging endpoint/i);
          expect(connectionGuide).toMatch(/Bot Framework JWT|JWT/i);
        } else if (credentialKind === 'outlook_trigger') {
          expect(connectionGuide).toMatch(/Microsoft OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Mail\.Read/i);
          expect(connectionGuide).toMatch(/Calendars\.Read/i);
          expect(connectionGuide).toMatch(/graph\.microsoft\.com\/v1\.0\/me/i);
          expect(connectionGuide).toMatch(/automatically creates|automatically renews/i);
        } else if (credentialKind === 'microsoft') {
          expect(connectionGuide).toMatch(/Microsoft OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Mail\.Send/i);
          expect(connectionGuide).toMatch(/User\.Read/i);
          expect(connectionGuide).toMatch(/sendMail|Microsoft Graph/i);
          expect(connectionGuide).toMatch(/Do not paste Microsoft access tokens|What not to store/i);
        } else if (credentialKind === 'shopify_trigger') {
          expect(connectionGuide).toMatch(/Shopify Admin API/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Admin API access token|Admin API Access Token/i);
          expect(connectionGuide).toMatch(/Client Secret|Webhook Signing Secret/i);
          expect(connectionGuide).toMatch(/X-Shopify-Hmac-Sha256/i);
          expect(connectionGuide).toMatch(/automatically creates|creates the Shopify webhook/i);
        } else if (credentialKind === 'slack_trigger') {
          expect(connectionGuide).toMatch(/Slack OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/chat:write/i);
          expect(connectionGuide).toMatch(/app_mentions:read/i);
          expect(connectionGuide).toMatch(/Signing Secret/i);
          expect(connectionGuide).toMatch(/X-Slack-Signature/i);
          expect(connectionGuide).toMatch(/Event Subscriptions|Slash Commands|Interactivity/i);
        } else if (credentialKind === 'stripe_trigger') {
          expect(connectionGuide).toMatch(/Stripe Secret Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/api\.stripe\.com\/v1\/account/i);
          expect(connectionGuide).toMatch(/Stripe-Signature/i);
          expect(connectionGuide).toMatch(/webhook_endpoints|automatically creates/i);
        } else if (credentialKind === 'tally_trigger') {
          expect(connectionGuide).toMatch(/Tally Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/tally\.so\/settings\/api/i);
          expect(connectionGuide).toMatch(/api\.tally\.so\/me/i);
          expect(connectionGuide).toMatch(/Tally-Signature/i);
          expect(connectionGuide).toMatch(/automatically registers/i);
        } else if (credentialKind === 'telegram_trigger') {
          expect(connectionGuide).toMatch(/Telegram Bot Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/BotFather/i);
          expect(connectionGuide).toMatch(/getMe/i);
          expect(connectionGuide).toMatch(/X-Telegram-Bot-Api-Secret-Token|Secret Token/i);
          expect(connectionGuide).toMatch(/force|silently/i);
        } else if (credentialKind === 'trello_trigger') {
          expect(connectionGuide).toMatch(/Trello API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/App Secret/i);
          expect(connectionGuide).toMatch(/power-ups\/admin|app-key/i);
          expect(connectionGuide).toMatch(/HEAD/i);
          expect(connectionGuide).toMatch(/X-Trello-Webhook/i);
        } else if (credentialKind === 'typeform_trigger') {
          expect(connectionGuide).toMatch(/Typeform Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/admin\.typeform\.com/i);
          expect(connectionGuide).toMatch(/api\.typeform\.com\/me/i);
          expect(connectionGuide).toMatch(/Typeform-Signature/i);
          expect(connectionGuide).toMatch(/automatically registers/i);
        } else if (credentialKind === 'whatsapp_trigger') {
          expect(connectionGuide).toMatch(/WhatsApp Business API/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Phone Number ID/i);
          expect(connectionGuide).toMatch(/Meta for Developers/i);
          expect(connectionGuide).toMatch(/X-Hub-Signature-256|META_APP_SECRET/i);
        } else if (credentialKind === 'stripe') {
          expect(connectionGuide).toMatch(/Stripe API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/sk_test_|sk_live_|restricted/i);
        } else if (credentialKind === 'paypal') {
          expect(connectionGuide).toMatch(/PayPal OAuth2|PayPal OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Sandbox|Live/i);
        } else if (credentialKind === 'shopify') {
          expect(connectionGuide).toMatch(/Shopify API Key|Shopify Admin API/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Admin API|products|orders|customers/i);
        } else if (credentialKind === 'woocommerce') {
          expect(connectionGuide).toMatch(/WooCommerce API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/REST API|consumer key|consumer secret/i);
        } else if (credentialKind === 'chargebee') {
          expect(connectionGuide).toMatch(/Chargebee API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/site|subdomain|Basic Auth/i);
        } else if (credentialKind === 'airtable') {
          expect(connectionGuide).toMatch(/Airtable API Key|Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/data\.records:read|data\.records:write/i);
          expect(connectionGuide).toMatch(/Base ID/i);
        } else if (credentialKind === 'supabase') {
          expect(connectionGuide).toMatch(/Supabase Credential|Supabase/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/anonKey|anon\/public/i);
          expect(connectionGuide).toMatch(/serviceRoleKey|service_role/i);
          expect(connectionGuide).toMatch(/Row Level Security|RLS/i);
        } else if (credentialKind === 'firebase') {
          expect(connectionGuide).toMatch(/Firebase Credential|service account/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/projectId|Project ID/i);
          expect(connectionGuide).toMatch(/clientEmail|Client Email/i);
          expect(connectionGuide).toMatch(/privateKey|Private Key/i);
        } else if (credentialKind === 'mongodb') {
          expect(connectionGuide).toMatch(/MongoDB Connection String/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/mongodb_connection/i);
          expect(connectionGuide).toMatch(/database/i);
          expect(connectionGuide).toMatch(/allowlist/i);
        } else if (credentialKind === 'google_cloud_storage') {
          expect(connectionGuide).toMatch(/Google Cloud Storage|Service Account/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/projectId|Project ID/i);
          expect(connectionGuide).toMatch(/clientEmail|Client Email/i);
          expect(connectionGuide).toMatch(/privateKey|Private Key/i);
          expect(connectionGuide).toMatch(/bucket/i);
        } else if (credentialKind === 'mysql') {
          expect(connectionGuide).toMatch(/MySQL Database Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/database/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
        } else if (credentialKind === 'postgresql') {
          expect(connectionGuide).toMatch(/PostgreSQL Database Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/database/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/SSL/i);
        } else if (credentialKind === 'oracle_database') {
          expect(connectionGuide).toMatch(/Oracle Database Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/user/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/connection string/i);
        } else if (credentialKind === 'pinecone') {
          expect(connectionGuide).toMatch(/Pinecone API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/API key/i);
          expect(connectionGuide).toMatch(/index/i);
        } else if (credentialKind === 'qdrant') {
          expect(connectionGuide).toMatch(/Qdrant API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/API key/i);
          expect(connectionGuide).toMatch(/cluster URL|URL/i);
        } else if (credentialKind === 'redis') {
          expect(connectionGuide).toMatch(/Redis Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/TLS/i);
        } else if (credentialKind === 'sql_server') {
          expect(connectionGuide).toMatch(/SQL Server Database Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/database/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/Encrypt/i);
        } else if (credentialKind === 'timescaledb') {
          expect(connectionGuide).toMatch(/TimescaleDB Database Connection/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/database/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/SSL/i);
        } else if (credentialKind === 'aws_s3') {
          expect(connectionGuide).toMatch(/AWS S3 API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Access Key ID/i);
          expect(connectionGuide).toMatch(/Secret Access Key/i);
          expect(connectionGuide).toMatch(/IAM/i);
          expect(connectionGuide).toMatch(/s3:GetObject|s3:PutObject|s3:ListBucket/i);
        } else if (credentialKind === 'dropbox') {
          expect(connectionGuide).toMatch(/Dropbox OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/files\.metadata\.read/i);
          expect(connectionGuide).toMatch(/files\.content\.read/i);
          expect(connectionGuide).toMatch(/files\.content\.write/i);
          expect(connectionGuide).toMatch(/OAuth/i);
        } else if (credentialKind === 'ftp') {
          expect(connectionGuide).toMatch(/FTP Credentials/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/FTPS|TLS|plain FTP/i);
        } else if (credentialKind === 'sftp') {
          expect(connectionGuide).toMatch(/SFTP Credentials/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/host/i);
          expect(connectionGuide).toMatch(/port/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/private key|Private Key/i);
          expect(connectionGuide).toMatch(/passphrase/i);
        } else if (credentialKind === 'onedrive') {
          expect(connectionGuide).toMatch(/Microsoft OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Microsoft Graph/i);
          expect(connectionGuide).toMatch(/Files\.ReadWrite|Files\.Read/i);
          expect(connectionGuide).toMatch(/OAuth/i);
        } else if (credentialKind === 'clickup') {
          expect(connectionGuide).toMatch(/ClickUp API Key|ClickUp API token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault|wallet|key pool/i);
          expect(connectionGuide).toMatch(/apiKey|apiToken|token/i);
          expect(connectionGuide).toMatch(/workspaceId|teamId/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'contentful') {
          expect(connectionGuide).toMatch(/Contentful CMA Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/CFPAT|CMA token/i);
          expect(connectionGuide).toMatch(/Authorize|OrganizationAccessGrantRequired/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'wordpress') {
          expect(connectionGuide).toMatch(/WordPress Application Password/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Basic Auth|Application Password/i);
          expect(connectionGuide).toMatch(/HTTPS|wp-json/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'bitbucket') {
          expect(connectionGuide).toMatch(/Bitbucket app password|OAuth access token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/App passwords|accessToken|Basic Auth/i);
          expect(connectionGuide).toMatch(/repository read\/write|repository read.*write/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'github') {
          expect(connectionGuide).toMatch(/GitHub Personal Access Token|GitHub OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/repo|public_repo/i);
          expect(connectionGuide).toMatch(/api\.github\.com\/user/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'gitlab') {
          expect(connectionGuide).toMatch(/GitLab Personal Access Token|GitLab OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/\bapi\b|read_api/i);
          expect(connectionGuide).toMatch(/gitlab\.com\/api\/v4\/user|GitLab user endpoint/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'jenkins') {
          expect(connectionGuide).toMatch(/Jenkins API Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Username/i);
          expect(connectionGuide).toMatch(/API Token/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'jira') {
          expect(connectionGuide).toMatch(/Jira API Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/id\.atlassian\.com\/manage-profile\/security\/api-tokens/i);
          expect(connectionGuide).toMatch(/rest\/api\/3\/myself/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'netlify') {
          expect(connectionGuide).toMatch(/Netlify API Key|Netlify personal access token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Personal access tokens/i);
          expect(connectionGuide).toMatch(/api\.netlify\.com\/api\/v1/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'vercel') {
          expect(connectionGuide).toMatch(/Vercel API Key|Vercel API token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Account Settings.*Tokens|vercel\.com\/account\/tokens/i);
          expect(connectionGuide).toMatch(/api\.vercel\.com\/v13\/deployments/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'schedulewise') {
          expect(connectionGuide).toMatch(/ScheduleWise API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/apiUrl|API Base URL/i);
          expect(connectionGuide).toMatch(/accessToken|Access Token|apiKey|API Key|X-Api-Key|Bearer/i);
          expect(connectionGuide).toMatch(/Mock Mode/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'xero') {
          expect(connectionGuide).toMatch(/Xero OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|connection/i);
          expect(connectionGuide).toMatch(/accessToken/i);
          expect(connectionGuide).toMatch(/tenantId/i);
          expect(connectionGuide).toMatch(/api\.xero\.com\/connections/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'workday') {
          expect(connectionGuide).toMatch(/Workday Connection/i);
          expect(connectionGuide).toMatch(/Connections|connection/i);
          expect(connectionGuide).toMatch(/accessToken/i);
          expect(connectionGuide).toMatch(/username/i);
          expect(connectionGuide).toMatch(/password/i);
          expect(connectionGuide).toMatch(/tenant/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'activecampaign') {
          expect(connectionGuide).toMatch(/ActiveCampaign API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Settings.*Developer|Developer/i);
          expect(connectionGuide).toMatch(/api\/3\/users\/me/i);
          expect(connectionGuide).toMatch(/API URL/i);
        } else if (credentialKind === 'freshdesk') {
          expect(connectionGuide).toMatch(/Freshdesk API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/agents\/me/i);
          expect(connectionGuide).toMatch(/domain/i);
          expect(connectionGuide).toMatch(/basic auth|API Key.*username/i);
        } else if (credentialKind === 'hubspot') {
          expect(connectionGuide).toMatch(/HubSpot API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Private App/i);
          expect(connectionGuide).toMatch(/OAuth2/i);
          expect(connectionGuide).toMatch(/api\.hubapi\.com/i);
        } else if (credentialKind === 'intercom') {
          expect(connectionGuide).toMatch(/Intercom Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/developers\.intercom\.com/i);
          expect(connectionGuide).toMatch(/api\.intercom\.io\/me/i);
        } else if (credentialKind === 'intuit_smes') {
          expect(connectionGuide).toMatch(/Intuit.*QuickBooks|mock\/demo/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/mock\/demo|does not call the real Intuit/i);
        } else if (credentialKind === 'mailchimp') {
          expect(connectionGuide).toMatch(/Mailchimp API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Extras.*API Keys|API Keys/i);
          expect(connectionGuide).toMatch(/data-center/i);
        } else if (credentialKind === 'microsoft_dynamics') {
          expect(connectionGuide).toMatch(/Azure AD OAuth2 Access Token/i);
          expect(connectionGuide).toMatch(/no Connections support|no saved-connection/i);
          expect(connectionGuide).toMatch(/user_impersonation/i);
          expect(connectionGuide).toMatch(/expires/i);
        } else if (credentialKind === 'odoo') {
          expect(connectionGuide).toMatch(/Odoo Credentials/i);
          expect(connectionGuide).toMatch(/does not currently auto-fill|not currently wired/i);
          expect(connectionGuide).toMatch(/API [Kk]ey/i);
          expect(connectionGuide).toMatch(/Database/i);
        } else if (credentialKind === 'pipedrive') {
          expect(connectionGuide).toMatch(/Pipedrive API Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Personal Preferences/i);
          expect(connectionGuide).toMatch(/api\.pipedrive\.com\/v1\/users\/me/i);
        } else if (credentialKind === 'salesforce') {
          expect(connectionGuide).toMatch(/Salesforce OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/login\.salesforce\.com\/services\/oauth2\/userinfo/i);
          expect(connectionGuide).toMatch(/Instance URL/i);
        } else if (credentialKind === 'zoho_crm') {
          expect(connectionGuide).toMatch(/Zoho CRM OAuth2/i);
          expect(connectionGuide).toMatch(/Connections/i);
          expect(connectionGuide).toMatch(/Connect Zoho/i);
          expect(connectionGuide).toMatch(/token refresh|auto-fill/i);
          expect(connectionGuide).toMatch(/US Zoho data center|region/i);
        } else if (credentialKind === 'zendesk') {
          expect(connectionGuide).toMatch(/Zendesk API Token/i);
          expect(connectionGuide).toMatch(/Connections/i);
          expect(connectionGuide).toMatch(/Basic Auth/i);
          expect(connectionGuide).toMatch(/Admin Center/i);
          expect(connectionGuide).toMatch(/auto-fill/i);
        } else if (credentialKind === 'sap') {
          expect(connectionGuide).toMatch(/SAP Connection/i);
          expect(connectionGuide).toMatch(/Connections/i);
          expect(connectionGuide).toMatch(/Access Token/i);
          expect(connectionGuide).toMatch(/only.*Access Token.*confirmed to auto-fill|Access Token field is confirmed to auto-fill/i);
          expect(connectionGuide).toMatch(/Basic Auth/i);
        } else if (credentialKind === 'gmail') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/gmail\.send/i);
          expect(connectionGuide).toMatch(/gmail\.readonly/i);
          expect(connectionGuide).toMatch(/internal reference/i);
        } else if (credentialKind === 'gmail_trigger') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Gmail/i);
          expect(connectionGuide).toMatch(/gmail\.readonly|Gmail read access/i);
          expect(connectionGuide).toMatch(/OAuth access token|refresh token/i);
          expect(connectionGuide).toMatch(/oauth2\/v2\/userinfo|Google account identity/i);
          expect(connectionGuide).toMatch(/Pub\/Sub|gmail-api-push@system\.gserviceaccount\.com/i);
          expect(connectionGuide).toMatch(/OIDC|Validation Secret|push subscription/i);
          expect(connectionGuide).toMatch(/historyId|history/i);
        } else if (credentialKind === 'google_sheets') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Sheets/i);
          expect(connectionGuide).toMatch(/Viewer access|Editor access/i);
        } else if (credentialKind === 'google_sheets_trigger') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Sheets/i);
          expect(connectionGuide).toMatch(/Viewer access|Editor access/i);
          expect(connectionGuide).toMatch(/read access|Sheets scope|spreadsheets/i);
          expect(connectionGuide).toMatch(/OAuth access token|refresh token/i);
          expect(connectionGuide).toMatch(/oauth2\/v2\/userinfo|Google account identity/i);
          expect(connectionGuide).toMatch(/baseline|poll/i);
        } else if (credentialKind === 'google_doc') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Docs/i);
          expect(connectionGuide).toMatch(/Viewer access|Editor access/i);
        } else if (credentialKind === 'google_contacts') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Contacts/i);
          expect(connectionGuide).toMatch(/write access/i);
        } else if (credentialKind === 'google_tasks') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Tasks/i);
        } else if (credentialKind === 'google_bigquery') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/BigQuery/i);
          expect(connectionGuide).toMatch(/Data Viewer|Job User/i);
        } else if (credentialKind === 'google_calendar') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Calendar/i);
          expect(connectionGuide).toMatch(/See all event details|Make changes to events/i);
        } else if (credentialKind === 'google_calendar_trigger') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Calendar/i);
          expect(connectionGuide).toMatch(/calendar\.events/i);
          expect(connectionGuide).toMatch(/OAuth access token|refresh token/i);
          expect(connectionGuide).toMatch(/oauth2\/v2\/userinfo|Google account identity/i);
          expect(connectionGuide).toMatch(/watch channel|web_hook|push notification/i);
          expect(connectionGuide).toMatch(/sync token|renewal/i);
        } else if (credentialKind === 'google_drive') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Drive/i);
          expect(connectionGuide).toMatch(/Viewer access|Editor access/i);
        } else if (credentialKind === 'google_drive_trigger') {
          expect(connectionGuide).toMatch(/Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Drive/i);
          expect(connectionGuide).toMatch(/Viewer access|Editor access/i);
          expect(connectionGuide).toMatch(/drive\.readonly|Drive read access/i);
          expect(connectionGuide).toMatch(/OAuth access token|refresh token/i);
          expect(connectionGuide).toMatch(/oauth2\/v2\/userinfo|Google account identity/i);
          expect(connectionGuide).toMatch(/watch channel|web_hook|push notification/i);
          expect(connectionGuide).toMatch(/start page token|page token|renewal/i);
        } else if (credentialKind === 'amazon_ses') {
          expect(connectionGuide).toMatch(/Amazon SES Access Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Access Key ID/i);
          expect(connectionGuide).toMatch(/Secret Access Key/i);
          expect(connectionGuide).toMatch(/region/i);
        } else if (credentialKind === 'mailgun') {
          expect(connectionGuide).toMatch(/Mailgun API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Private API Key/i);
          expect(connectionGuide).toMatch(/Sending Domain|sending domain/i);
          expect(connectionGuide).toMatch(/region/i);
        } else if (credentialKind === 'sendgrid') {
          expect(connectionGuide).toMatch(/SendGrid API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Mail Send/i);
          expect(connectionGuide).toMatch(/Sender Authentication|verified sender/i);
        } else if (credentialKind === 'twilio') {
          expect(connectionGuide).toMatch(/Twilio Account Credentials/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Account SID/i);
          expect(connectionGuide).toMatch(/Auth Token/i);
          expect(connectionGuide).toMatch(/Verified Caller ID/i);
        } else if (credentialKind === 'zoom') {
          expect(connectionGuide).toMatch(/Zoom OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/meeting:write:meeting/i);
          expect(connectionGuide).toMatch(/meeting:read:meeting/i);
          expect(connectionGuide).toMatch(/meeting:read:list_meetings/i);
          expect(connectionGuide).toMatch(/user:read:user/i);
          expect(connectionGuide).toMatch(/OAuth access token|refresh token/i);
          expect(connectionGuide).toMatch(/api\.zoom\.us\/v2\/users\/me/i);
        } else if (credentialKind === 'calendly') {
          expect(connectionGuide).toMatch(/Calendly Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/API and Webhooks/i);
          expect(connectionGuide).toMatch(/\/users\/me|Get User/i);
          expect(connectionGuide).toMatch(/Do not paste Calendly tokens|What not to store/i);
        } else if (credentialKind === 'linear') {
          expect(connectionGuide).toMatch(/Linear Personal API Key/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/linear\.app\/settings\/api|Settings.*API.*Personal API Keys/i);
          expect(connectionGuide).toMatch(/Get Teams|teams/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'notion') {
          expect(connectionGuide).toMatch(/Notion OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/notion\.so\/my-integrations|share.*page|share.*database/i);
          expect(connectionGuide).toMatch(/getMe|database list|user/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'trello') {
          expect(connectionGuide).toMatch(/Trello API Key and Token|Trello API Key.*Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/trello\.com\/app-key/i);
          expect(connectionGuide).toMatch(/Get Boards|boards/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'typeform') {
          expect(connectionGuide).toMatch(/Typeform Personal Access Token/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/admin\.typeform\.com/i);
          expect(connectionGuide).toMatch(/api\.typeform\.com\/me/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'facebook') {
          expect(connectionGuide).toMatch(/Facebook OAuth2|Meta Graph API/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/Meta for Developers|Meta Business Suite|developers\.facebook\.com/i);
          expect(connectionGuide).toMatch(/pages_show_list|pages_messaging|pages_manage_posts|pages_read_engagement/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'instagram') {
          expect(connectionGuide).toMatch(/Instagram OAuth2|Meta Graph API/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/instagram_basic/i);
          expect(connectionGuide).toMatch(/instagram_content_publish/i);
          expect(connectionGuide).toMatch(/instagram_manage_comments/i);
          expect(connectionGuide).toMatch(/pages_show_list|pages_read_engagement/i);
          expect(connectionGuide).toMatch(/instagram_business_account/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'linkedin') {
          expect(connectionGuide).toMatch(/LinkedIn OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/w_member_social/i);
          expect(connectionGuide).toMatch(/openid|profile|email/i);
          expect(connectionGuide).toMatch(/Get My Profile|personUrn/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'twitter') {
          expect(connectionGuide).toMatch(/Twitter\/X OAuth2|X OAuth2/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/developer\.x\.com|X permissions/i);
          expect(connectionGuide).toMatch(/OAuth access token/i);
          expect(connectionGuide).toMatch(/Get Me/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else if (credentialKind === 'youtube') {
          expect(connectionGuide).toMatch(/YouTube OAuth2|Google OAuth/i);
          expect(connectionGuide).toMatch(/Connections|credential system|credential vault/i);
          expect(connectionGuide).toMatch(/youtube\.force-ssl/i);
          expect(connectionGuide).toMatch(/youtube\.upload/i);
          expect(connectionGuide).toMatch(/List My Channels/i);
          expect(connectionGuide).toMatch(/service node.*account connection/i);
        } else {
          expect(connectionGuide).toMatch(/No third-party account|does not use credentials/i);
        }
        expect(connectionGuide).toMatch(/connect.*output|outgoing line/i);
        expect(connectionGuide).toMatch(/service node.*account connection/i);
        expect(connectionGuide).not.toMatch(/paste.*(api key|token|password).*input data/i);
      });

      it('documents common mistakes and troubleshooting', () => {
        const troubleshooting = doc.commonErrors.map((error) => error.error).join('\n');
        expect(doc.commonErrors.length).toBeGreaterThanOrEqual(4);
        for (const term of troubleshootingTerms) {
          expect(troubleshooting).toContain(term);
        }
      });
    });
  }
});
