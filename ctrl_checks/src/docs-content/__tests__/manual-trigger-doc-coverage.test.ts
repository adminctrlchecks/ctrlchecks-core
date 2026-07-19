import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '@/components/workflow/nodeTypes';
import { amazonSesDoc } from '../nodes/amazon_ses.doc';
import { chatTriggerDoc } from '../nodes/chat_trigger.doc';
import { discordDoc } from '../nodes/discord.doc';
import { discordTriggerDoc } from '../nodes/discord_trigger.doc';
import { discordWebhookDoc } from '../nodes/discord_webhook.doc';
import { editFieldsDoc } from '../nodes/edit_fields.doc';
import { emailDoc } from '../nodes/email.doc';
import { errorTriggerDoc } from '../nodes/error_trigger.doc';
import { facebookTriggerDoc } from '../nodes/facebook_trigger.doc';
import { filterDoc } from '../nodes/filter.doc';
import { formDoc } from '../nodes/form.doc';
import { githubTriggerDoc } from '../nodes/github_trigger.doc';
import { gitlabTriggerDoc } from '../nodes/gitlab_trigger.doc';
import { googleBigqueryDoc } from '../nodes/google_bigquery.doc';
import { googleCalendarDoc } from '../nodes/google_calendar.doc';
import { googleCalendarTriggerDoc } from '../nodes/google_calendar_trigger.doc';
import { googleContactsDoc } from '../nodes/google_contacts.doc';
import { googleDocDoc } from '../nodes/google_doc.doc';
import { googleDriveDoc } from '../nodes/google_drive.doc';
import { googleDriveTriggerDoc } from '../nodes/google_drive_trigger.doc';
import { googleGmailDoc } from '../nodes/google_gmail.doc';
import { gmailTriggerDoc } from '../nodes/gmail_trigger.doc';
import { googleSheetsDoc } from '../nodes/google_sheets.doc';
import { googleSheetsTriggerDoc } from '../nodes/google_sheets_trigger.doc';
import { googleTasksDoc } from '../nodes/google_tasks.doc';
import { httpRequestDoc } from '../nodes/http_request.doc';
import { slackWebhookDoc } from '../nodes/slack_webhook.doc';
import { ifElseDoc } from '../nodes/if_else.doc';
import { javascriptDoc } from '../nodes/javascript.doc';
import { logOutputDoc } from '../nodes/log_output.doc';
import { loopDoc } from '../nodes/loop.doc';
import { mailgunDoc } from '../nodes/mailgun.doc';
import { manualTriggerDoc } from '../nodes/manual_trigger.doc';
import { mergeDoc } from '../nodes/merge.doc';
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
import { whatsappDoc } from '../nodes/whatsapp.doc';
import { whatsappCloudDoc } from '../nodes/whatsapp_cloud.doc';
import { workflowTriggerDoc } from '../nodes/workflow_trigger.doc';
import { zoomVideoDoc } from '../nodes/zoom_video.doc';
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
  credentialKind?: 'none' | 'smtp' | 'slack' | 'slack_webhook' | 'teams' | 'telegram' | 'whatsapp' | 'discord' | 'discord_trigger' | 'discord_webhook' | 'facebook_trigger' | 'github_trigger' | 'gitlab_trigger' | 'gmail' | 'gmail_trigger' | 'google_sheets' | 'google_sheets_trigger' | 'google_calendar' | 'google_calendar_trigger' | 'google_drive' | 'google_drive_trigger' | 'google_doc' | 'google_contacts' | 'google_tasks' | 'google_bigquery' | 'amazon_ses' | 'mailgun' | 'sendgrid' | 'twilio' | 'zoom';
}> = [
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
    outputDescriptionTerms: ['overwrite', 'append', 'deep_merge', 'items', 'mergeMode', 'sourceCount', 'output', 'data', 'result'],
    troubleshootingTerms: ['Unexpected overwritten field', 'Next node cannot find items', 'Next node cannot find top-level field', 'Missing incoming branch', 'Deep merge did not combine arrays', 'Permission denied'],
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

        if (credentialKind === 'smtp') {
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
