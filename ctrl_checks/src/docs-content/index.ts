import type { NodeDoc } from './types';
import { scheduleDoc } from './nodes/schedule.doc';
import { webhookDoc } from './nodes/webhook.doc';
import { manualTriggerDoc } from './nodes/manual_trigger.doc';
import { intervalDoc } from './nodes/interval.doc';
import { chatTriggerDoc } from './nodes/chat_trigger.doc';
import { formDoc } from './nodes/form.doc';
import { httpRequestDoc } from './nodes/http_request.doc';
import { respondToWebhookDoc } from './nodes/respond_to_webhook.doc';
import { postgresqlDoc } from './nodes/postgresql.doc';
import { dbDoc } from './nodes/db.doc';
import { supabaseDoc } from './nodes/supabase.doc';
import { googleSheetsDoc } from './nodes/google_sheets.doc';
import { googleSheetsTriggerDoc } from './nodes/google_sheets_trigger.doc';
import { googleDocDoc } from './nodes/google_doc.doc';
import { googleGmailDoc } from './nodes/google_gmail.doc';
import { outlookDoc } from './nodes/outlook.doc';
import { outlookTriggerDoc } from './nodes/outlook_trigger.doc';
import { salesforceDoc } from './nodes/salesforce.doc';
import { microsoftDynamicsDoc } from './nodes/microsoft_dynamics.doc';
import { sapDoc } from './nodes/sap.doc';
import { clickupDoc } from './nodes/clickup.doc';
import { setVariableDoc } from './nodes/set_variable.doc';
import { javascriptDoc } from './nodes/javascript.doc';
import { functionDoc } from './nodes/function.doc';
import { functionItemDoc } from './nodes/function_item.doc';
import { dateTimeDoc } from './nodes/date_time.doc';
import { textFormatterDoc } from './nodes/text_formatter.doc';
import { ifElseDoc } from './nodes/if_else.doc';
import { switchDoc } from './nodes/switch.doc';
import { mergeDoc } from './nodes/merge.doc';
import { errorHandlerDoc } from './nodes/error_handler.doc';
import { waitDoc } from './nodes/wait.doc';
import { delayDoc } from './nodes/delay.doc';
import { timeoutDoc } from './nodes/timeout.doc';
import { returnDoc } from './nodes/return.doc';
import { executeWorkflowDoc } from './nodes/execute_workflow.doc';
import { tryCatchDoc } from './nodes/try_catch.doc';
import { retryDoc } from './nodes/retry.doc';
import { parallelDoc } from './nodes/parallel.doc';
import { queuePushDoc } from './nodes/queue_push.doc';
import { queueConsumeDoc } from './nodes/queue_consume.doc';
import { cacheGetDoc } from './nodes/cache_get.doc';
import { cacheSetDoc } from './nodes/cache_set.doc';
import { aiAgentDoc } from './nodes/ai_agent.doc';
import { aiChatModelDoc } from './nodes/ai_chat_model.doc';
import { slackMessageDoc } from './nodes/slack_message.doc';
import { slackTriggerDoc } from './nodes/slack_trigger.doc';
import { emailDoc } from './nodes/email.doc';
import { logOutputDoc } from './nodes/log_output.doc';
import { telegramDoc } from './nodes/telegram.doc';
import { telegramTriggerDoc } from './nodes/telegram_trigger.doc';
import { linkedinDoc } from './nodes/linkedin.doc';
import { twitterDoc } from './nodes/twitter.doc';
import { instagramDoc } from './nodes/instagram.doc';
import { youtubeDoc } from './nodes/youtube.doc';
import { hubspotDoc } from './nodes/hubspot.doc';
import { airtableDoc } from './nodes/airtable.doc';
import { notionDoc } from './nodes/notion.doc';
import { linearDoc } from './nodes/linear.doc';
import { linearTriggerDoc } from './nodes/linear_trigger.doc';
import { trelloDoc } from './nodes/trello.doc';
import { trelloTriggerDoc } from './nodes/trello_trigger.doc';
import { zohoCrmDoc } from './nodes/zoho_crm.doc';
import { pipedriveDoc } from './nodes/pipedrive.doc';
import { intuitSmesDoc } from './nodes/intuit_smes.doc';
import { tallyDoc } from './nodes/tally.doc';
import { discordDoc } from './nodes/discord.doc';
import { discordTriggerDoc } from './nodes/discord_trigger.doc';
import { zoomVideoDoc } from './nodes/zoom_video.doc';
import { jsonParserDoc } from './nodes/json_parser.doc';
import { mergeDataDoc } from './nodes/merge_data.doc';
import { editFieldsDoc } from './nodes/edit_fields.doc';
import { errorTriggerDoc } from './nodes/error_trigger.doc';
import { workflowTriggerDoc } from './nodes/workflow_trigger.doc';
import { filterDoc } from './nodes/filter.doc';
import { loopDoc } from './nodes/loop.doc';
import { noopDoc } from './nodes/noop.doc';
import { setDoc } from './nodes/set.doc';
import { splitInBatchesDoc } from './nodes/split_in_batches.doc';
import { stopAndErrorDoc } from './nodes/stop_and_error.doc';
import { mathDoc } from './nodes/math.doc';
import { htmlDoc } from './nodes/html.doc';
import { xmlDoc } from './nodes/xml.doc';
import { csvDoc } from './nodes/csv.doc';
import { renameKeysDoc } from './nodes/rename_keys.doc';
import { aggregateDoc } from './nodes/aggregate.doc';
import { sortDoc } from './nodes/sort.doc';
import { limitDoc } from './nodes/limit.doc';
import { openaiGptDoc } from './nodes/openai_gpt.doc';
import { anthropicClaudeDoc } from './nodes/anthropic_claude.doc';
import { googleGeminiDoc } from './nodes/google_gemini.doc';
import { ollamaDoc } from './nodes/ollama.doc';
import { textSummarizerDoc } from './nodes/text_summarizer.doc';
import { sentimentAnalyzerDoc } from './nodes/sentiment_analyzer.doc';
import { chatModelDoc } from './nodes/chat_model.doc';
import { cohereDoc } from './nodes/cohere.doc';
import { huggingfaceDoc } from './nodes/huggingface.doc';
import { memoryDoc } from './nodes/memory.doc';
import { mistralDoc } from './nodes/mistral.doc';
import { toolDoc } from './nodes/tool.doc';
import { httpPostDoc } from './nodes/http_post.doc';
import { webhookResponseDoc } from './nodes/webhook_response.doc';
import { graphqlDoc } from './nodes/graphql.doc';
import { googleDriveDoc } from './nodes/google_drive.doc';
import { googleDriveTriggerDoc } from './nodes/google_drive_trigger.doc';
import { googleCalendarDoc } from './nodes/google_calendar.doc';
import { googleCalendarTriggerDoc } from './nodes/google_calendar_trigger.doc';
import { googleContactsDoc } from './nodes/google_contacts.doc';
import { googleTasksDoc } from './nodes/google_tasks.doc';
import { googleBigqueryDoc } from './nodes/google_bigquery.doc';
import { slackWebhookDoc } from './nodes/slack_webhook.doc';
import { discordWebhookDoc } from './nodes/discord_webhook.doc';
import { microsoftTeamsDoc } from './nodes/microsoft_teams.doc';
import { microsoftTeamsTriggerDoc } from './nodes/microsoft_teams_trigger.doc';
import { gmailTriggerDoc } from './nodes/gmail_trigger.doc';
import { whatsappCloudDoc } from './nodes/whatsapp_cloud.doc';
import { twilioDoc } from './nodes/twilio.doc';
import { mailgunDoc } from './nodes/mailgun.doc';
import { sendgridDoc } from './nodes/sendgrid.doc';
import { amazonSesDoc } from './nodes/amazon_ses.doc';
import { facebookDoc } from './nodes/facebook.doc';
import { facebookTriggerDoc } from './nodes/facebook_trigger.doc';
import { whatsappDoc } from './nodes/whatsapp.doc';
import { whatsappTriggerDoc } from './nodes/whatsapp_trigger.doc';
import { instagramTriggerDoc } from './nodes/instagram_trigger.doc';
import { mysqlDoc } from './nodes/mysql.doc';
import { mongodbDoc } from './nodes/mongodb.doc';
import { firebaseDoc } from './nodes/firebase.doc';
import { googleCloudStorageDoc } from './nodes/google_cloud_storage.doc';
import { redisDoc } from './nodes/redis.doc';
import { odooDoc } from './nodes/odoo.doc';
import { freshdeskDoc } from './nodes/freshdesk.doc';
import { intercomDoc } from './nodes/intercom.doc';
import { mailchimpDoc } from './nodes/mailchimp.doc';
import { activecampaignDoc } from './nodes/activecampaign.doc';
import { readBinaryFileDoc } from './nodes/read_binary_file.doc';
import { writeBinaryFileDoc } from './nodes/write_binary_file.doc';
import { awsS3Doc } from './nodes/aws_s3.doc';
import { dropboxDoc } from './nodes/dropbox.doc';
import { onedriveDoc } from './nodes/onedrive.doc';
import { ftpDoc } from './nodes/ftp.doc';
import { sftpDoc } from './nodes/sftp.doc';
import { githubDoc } from './nodes/github.doc';
import { gitlabDoc } from './nodes/gitlab.doc';
import { bitbucketDoc } from './nodes/bitbucket.doc';
import { jiraDoc } from './nodes/jira.doc';
import { jenkinsDoc } from './nodes/jenkins.doc';
import { shopifyDoc } from './nodes/shopify.doc';
import { shopifyTriggerDoc } from './nodes/shopify_trigger.doc';
import { woocommerceDoc } from './nodes/woocommerce.doc';
import { stripeDoc } from './nodes/stripe.doc';
import { stripeTriggerDoc } from './nodes/stripe_trigger.doc';
import { paypalDoc } from './nodes/paypal.doc';
import { vercelDoc } from './nodes/vercel.doc';
import { schedulewiseDoc } from './nodes/schedulewise.doc';
import { calendlyDoc } from './nodes/calendly.doc';
import { chargebeeDoc } from './nodes/chargebee.doc';
import { typeformDoc } from './nodes/typeform.doc';
import { typeformTriggerDoc } from './nodes/typeform_trigger.doc';
import { tallyTriggerDoc } from './nodes/tally_trigger.doc';
import { githubTriggerDoc } from './nodes/github_trigger.doc';
import { gitlabTriggerDoc } from './nodes/gitlab_trigger.doc';
import { jiraTriggerDoc } from './nodes/jira_trigger.doc';
import { xeroDoc } from './nodes/xero.doc';
import { oracleDatabaseDoc } from './nodes/oracle_database.doc';
import { sqlServerDoc } from './nodes/sql_server.doc';
import { timescaledbDoc } from './nodes/timescaledb.doc';
import { contentfulDoc } from './nodes/contentful.doc';
import { wordpressDoc } from './nodes/wordpress.doc';
import { zendeskDoc } from './nodes/zendesk.doc';
import { netlifyDoc } from './nodes/netlify.doc';
import { workdayDoc } from './nodes/workday.doc';
import { pineconeDoc } from './nodes/pinecone.doc';
import { qdrantDoc } from './nodes/qdrant.doc';
import { langchainDoc } from './nodes/langchain.doc';
import { lightricksDoc } from './nodes/lightricks.doc';

export const allNodes: NodeDoc[] = [
  scheduleDoc,
  webhookDoc,
  manualTriggerDoc,
  intervalDoc,
  chatTriggerDoc,
  formDoc,
  httpRequestDoc,
  respondToWebhookDoc,
  postgresqlDoc,
  dbDoc,
  supabaseDoc,
  googleSheetsDoc,
  googleSheetsTriggerDoc,
  googleDocDoc,
  googleGmailDoc,
  outlookDoc,
  outlookTriggerDoc,
  salesforceDoc,
  microsoftDynamicsDoc,
  sapDoc,
  clickupDoc,
  setVariableDoc,
  javascriptDoc,
  functionDoc,
  functionItemDoc,
  dateTimeDoc,
  textFormatterDoc,
  ifElseDoc,
  switchDoc,
  mergeDoc,
  errorHandlerDoc,
  waitDoc,
  delayDoc,
  timeoutDoc,
  returnDoc,
  executeWorkflowDoc,
  tryCatchDoc,
  retryDoc,
  parallelDoc,
  queuePushDoc,
  queueConsumeDoc,
  cacheGetDoc,
  cacheSetDoc,
  aiAgentDoc,
  aiChatModelDoc,
  slackMessageDoc,
  slackTriggerDoc,
  emailDoc,
  logOutputDoc,
  telegramDoc,
  telegramTriggerDoc,
  linkedinDoc,
  twitterDoc,
  instagramDoc,
  youtubeDoc,
  hubspotDoc,
  airtableDoc,
  notionDoc,
  linearDoc,
  linearTriggerDoc,
  trelloDoc,
  trelloTriggerDoc,
  zohoCrmDoc,
  pipedriveDoc,
  intuitSmesDoc,
  tallyDoc,
  discordDoc,
  discordTriggerDoc,
  zoomVideoDoc,
  jsonParserDoc,
  mergeDataDoc,
  editFieldsDoc,
  errorTriggerDoc,
  workflowTriggerDoc,
  filterDoc,
  loopDoc,
  noopDoc,
  setDoc,
  splitInBatchesDoc,
  stopAndErrorDoc,
  mathDoc,
  htmlDoc,
  xmlDoc,
  csvDoc,
  renameKeysDoc,
  aggregateDoc,
  sortDoc,
  limitDoc,
  openaiGptDoc,
  anthropicClaudeDoc,
  googleGeminiDoc,
  ollamaDoc,
  textSummarizerDoc,
  sentimentAnalyzerDoc,
  chatModelDoc,
  cohereDoc,
  huggingfaceDoc,
  memoryDoc,
  mistralDoc,
  toolDoc,
  httpPostDoc,
  webhookResponseDoc,
  graphqlDoc,
  googleDriveDoc,
  googleDriveTriggerDoc,
  googleCalendarDoc,
  googleCalendarTriggerDoc,
  googleContactsDoc,
  googleTasksDoc,
  googleBigqueryDoc,
  slackWebhookDoc,
  discordWebhookDoc,
  microsoftTeamsDoc,
  microsoftTeamsTriggerDoc,
  gmailTriggerDoc,
  whatsappCloudDoc,
  twilioDoc,
  mailgunDoc,
  sendgridDoc,
  amazonSesDoc,
  facebookDoc,
  facebookTriggerDoc,
  whatsappDoc,
  whatsappTriggerDoc,
  instagramTriggerDoc,
  mysqlDoc,
  mongodbDoc,
  firebaseDoc,
  googleCloudStorageDoc,
  redisDoc,
  odooDoc,
  freshdeskDoc,
  intercomDoc,
  mailchimpDoc,
  activecampaignDoc,
  readBinaryFileDoc,
  writeBinaryFileDoc,
  awsS3Doc,
  dropboxDoc,
  onedriveDoc,
  ftpDoc,
  sftpDoc,
  githubDoc,
  gitlabDoc,
  bitbucketDoc,
  jiraDoc,
  jenkinsDoc,
  shopifyDoc,
  shopifyTriggerDoc,
  woocommerceDoc,
  stripeDoc,
  stripeTriggerDoc,
  paypalDoc,
  vercelDoc,
  schedulewiseDoc,
  calendlyDoc,
  chargebeeDoc,
  typeformDoc,
  typeformTriggerDoc,
  tallyTriggerDoc,
  githubTriggerDoc,
  gitlabTriggerDoc,
  jiraTriggerDoc,
  xeroDoc,
  oracleDatabaseDoc,
  sqlServerDoc,
  timescaledbDoc,
  contentfulDoc,
  wordpressDoc,
  zendeskDoc,
  netlifyDoc,
  workdayDoc,
  pineconeDoc,
  qdrantDoc,
  langchainDoc,
  lightricksDoc,
];

export const nodesBySlug = Object.fromEntries(
  allNodes.map((node) => [node.slug, node])
) as Record<string, NodeDoc>;

export const nodesByCategory = allNodes.reduce((acc, node) => {
  if (!acc[node.category]) acc[node.category] = [];
  acc[node.category].push(node);
  return acc;
}, {} as Record<string, NodeDoc[]>);

export const searchIndex = allNodes.flatMap((node) => {
  const nodeEntry = {
    type: 'node' as const,
    title: node.displayName,
    slug: node.slug,
    category: node.category,
    href: `/docs/nodes/${node.slug}`,
    text: [node.displayName, node.description, node.category].join(' '),
  };

  const operationEntries = node.resources.flatMap((resource) =>
    resource.operations.map((operation) => ({
      type: 'operation' as const,
      title: `${node.displayName}: ${operation.name}`,
      slug: node.slug,
      category: node.category,
      href: `/docs/nodes/${node.slug}#operation-${operation.value}`,
      text: [node.displayName, resource.name, operation.name, operation.description].join(' '),
    }))
  );

  const fieldEntries = node.resources.flatMap((resource) =>
    resource.operations.flatMap((operation) =>
      operation.fields.map((field) => ({
        type: 'field' as const,
        title: `${node.displayName}: ${field.name}`,
        slug: node.slug,
        category: node.category,
        href: `/docs/nodes/${node.slug}#operation-${operation.value}`,
        text: [node.displayName, resource.name, operation.name, field.name, field.description].join(' '),
      }))
    )
  );

  return [nodeEntry, ...operationEntries, ...fieldEntries];
});
