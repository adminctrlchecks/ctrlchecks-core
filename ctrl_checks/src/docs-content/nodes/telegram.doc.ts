import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses the Telegram action this node should run.

Why it matters: The operation decides which Telegram Bot API endpoint is used and which fields become important.

When to fill it: Choose it before filling the message fields so the rest of the form matches the job.

What to enter: Choose send_message for a text notification or chatbot reply. Choose send_photo when sending an image URL with an optional caption. Choose edit_message when updating a message that your bot already sent. Runtime also understands related media operations through Message Type for video, document, audio, and animation.

Where the value comes from: This is usually a fixed dropdown choice made while building the workflow.

How to use it later: Runtime returns the operation that actually ran as {{$json.operation}}, such as sendMessage, sendPhoto, or editMessage.

Accepted format: One of send_message, send_photo, or edit_message from the dropdown.

Real workplace example: Use send_message for a support bot answer, send_photo for a daily chart image, and edit_message to replace "Processing..." with "Complete".

If it is empty or wrong: Runtime defaults toward send_message or returns an unsupported operation error for unknown values.

Common mistake: Choosing send_photo but leaving Media URL empty, or choosing edit_message without a Message ID to edit.

Dropdown options: send_message sends text and requires Chat ID plus Message. send_photo sends an image URL and requires Chat ID plus Media URL, with Caption optional. edit_message updates an existing bot message and requires Chat ID, Edit Message ID, and Message.`;

const chatIdHelpText = `What this field means: Chat ID is the Telegram destination where the bot should send or edit a message.

Why it matters: Telegram bots cannot send anywhere until the API receives the correct chat, group, supergroup, or channel ID.

When to fill it: Fill it for every Telegram operation.

What to enter: Enter a personal chat ID such as 987654321, a group or channel ID such as -1001234567890, or map {{$json.chatId}} from Telegram Trigger.

Where the value comes from: Ask the user to start the bot, add the bot to the group or channel, then use Telegram Trigger output, @userinfobot, @getidsbot, or getUpdates to find chat.id.

How to use it later: Runtime returns the destination as {{$json.chatId}} so later logs, replies, or edit steps can reuse it.

Accepted format: Numeric Telegram chat ID as text or number. Group and channel IDs are often negative and channels commonly start with -100.

Real workplace example: A Telegram support bot receives a customer question and the reply node maps {{$json.chatId}} to answer in the same chat.

If it is empty or wrong: Runtime returns "Telegram: chatId is required", or Telegram rejects the call because the bot cannot access that chat.

Common mistake: Using a public @channelname or phone number instead of the numeric chat ID.`;

const messageTypeHelpText = `What this field means: Message Type describes the kind of Telegram content this node should send.

Why it matters: Telegram uses different payload fields for text, photos, videos, documents, audio files, and animations.

When to fill it: Fill it when sending content. For Edit Message, Message Type is less important because the runtime edits text.

What to enter: Choose text for ordinary messages, photo for image alerts, video for video clips, document for files, audio for audio, or animation for GIF-style animation.

Where the value comes from: This is usually a fixed dropdown choice based on the workflow purpose.

How to use it later: Runtime returns the final Telegram response in {{$json.data}} and {{$json.raw}}, including the Telegram message details for that content type.

Accepted format: One of text, photo, video, document, audio, or animation.

Real workplace example: Choose text for an outage alert, photo for a chart snapshot, document for a PDF invoice, audio for a voice report, and animation for a GIF-style status update.

If it is empty or wrong: Runtime defaults to text or can return the unsupported operation error when the effective media type is not recognized.

Common mistake: Selecting photo, video, document, audio, or animation without providing a public Media URL.

Dropdown options: text sends Message text with sendMessage. photo sends Media URL with sendPhoto. video sends Media URL with sendVideo. document sends Media URL with sendDocument. audio sends Media URL with sendAudio. animation sends Media URL with sendAnimation.`;

const messageHelpText = `What this field means: Message is the text sent to Telegram, or the new text used when editing an existing Telegram bot message.

Why it matters: For text messages and edits, this is the message people read and act on.

When to fill it: Fill it for send_message and edit_message. For media sends, use Caption when the text belongs under a photo, video, document, audio, or animation.

What to enter: Write a clear notification, chatbot reply, status update, approval prompt, or edit text. Include useful IDs and next actions.

Where the value comes from: Use Telegram Trigger text, AI Agent output, form answers, monitoring results, CRM records, database values, or previous workflow outputs.

How to use it later: Runtime can return the sent or edited message as {{$json.data}} and the normalized message ID as {{$json.messageId}}. Map {{$json.reply}}, {{$json.aiResponse}}, {{$json.response}}, {{$json.message}}, {{$json.text}}, or a custom field such as {{$json.ticketId}} into this field.

Accepted format: Text up to Telegram limits for sendMessage. Formatting depends on Parse Mode.

Real workplace example: "Ticket {{$json.ticketId}} is assigned to {{$json.owner}} and due by {{$json.dueDate}}."

If it is empty or wrong: Runtime returns "Telegram: message is required for text messages" or "Telegram: text is required for Edit Message".

Common mistake: Using formatted HTML or Markdown while Parse Mode is none, or forgetting to escape MarkdownV2 special characters.`;

const textHelpText = `What this field means: Text is a backend alias for Message that lets workflows and AI-generated configs pass text under a simpler key.

Why it matters: Runtime checks text before message, so this alias can supply the Telegram body even when the visible field is named Message.

When to fill it: Most users should fill Message in the UI. Use text only when an imported workflow, AI-generated node config, or backend integration uses that key.

What to enter: The same content you would put in Message, such as a chatbot reply or workplace alert.

Where the value comes from: Common mappings are {{$json.reply}}, {{$json.aiResponse}}, {{$json.response}}, {{$json.message}}, or {{$json.text}}.

How to use it later: Runtime treats this as the message body before checking Message, then later nodes can inspect {{$json.messageId}} and {{$json.data}}. Map the previous node value directly, for example {{$json.aiResponse}} after an AI Agent.

Accepted format: Plain text or formatted text compatible with the selected Parse Mode.

Real workplace example: An AI Agent returns {{$json.aiResponse}} and an imported Telegram node stores that value as text.

If it is empty or wrong: Runtime falls back to Message and then incoming fields. If all are blank, text sends and edits fail.

Common mistake: Filling both Text and Message with different content. Runtime prefers Text first, which can surprise the person reading the workflow.`;

const parseModeHelpText = `What this field means: Parse Mode tells Telegram how to interpret formatting inside Message or Caption.

Why it matters: The same characters can be sent as plain text or converted into bold text, links, code, or other formatting.

When to fill it: Choose it when your message or caption uses formatting. Use none for safest plain text.

What to enter: Choose none, HTML, Markdown, or MarkdownV2.

Where the value comes from: This is usually a fixed dropdown choice based on how your team writes messages.

How to use it later: Parse Mode is sent to Telegram but is not a main output field. If formatting fails, later nodes can inspect {{$json._error}} and {{$json._errorDetails}}.

Accepted format: One of none, HTML, Markdown, or MarkdownV2.

Real workplace example: Choose HTML for "New <b>urgent</b> ticket", none for customer-provided text, and MarkdownV2 only when your workflow escapes special characters correctly.

If it is empty or wrong: Runtime defaults to HTML unless none is selected. Telegram can reject malformed formatting.

Common mistake: Using MarkdownV2 without escaping special characters such as underscores, periods, or parentheses.

Dropdown options: none sends plain text with no formatting. HTML allows tags such as b, i, code, pre, and a links. Markdown uses Telegram's legacy Markdown style. MarkdownV2 supports richer Markdown but requires careful escaping.`;

const disableWebPagePreviewHelpText = `What this field means: Disable Web Page Preview controls whether Telegram shows preview cards for links in text messages.

Why it matters: Link previews can make alerts noisy or reveal content from linked pages in a busy chat.

When to fill it: Turn it on when the message includes URLs but should stay compact.

What to enter: Turn on for no preview, or leave off to allow Telegram's default preview card.

Where the value comes from: This is a fixed workflow design choice.

How to use it later: It changes message appearance only. Later nodes should use {{$json.messageId}}, {{$json.success}}, or {{$json._error}}.

Accepted format: Boolean true or false.

Real workplace example: Turn on for nightly report links so the operations channel gets one compact line per report.

If it is empty or wrong: Runtime treats it as false and Telegram may show link previews.

Common mistake: Expecting this to hide the URL. It only controls the preview card, not the link text itself.`;

const mediaUrlHelpText = `What this field means: Media URL is the publicly reachable file URL Telegram should send for photo, video, document, audio, or animation messages.

Why it matters: Telegram must fetch the file from this URL before it can deliver media.

When to fill it: Fill it for send_photo and for media Message Type choices such as photo, video, document, audio, or animation.

What to enter: Enter a direct HTTPS URL to the file, or map a file URL from a previous upload or report step.

Where the value comes from: Use your CDN, cloud storage, generated report URL, file export step, or a trusted API response.

How to use it later: Telegram returns the media message details in {{$json.data}} and the normalized ID in {{$json.messageId}}. Map {{$json.mediaUrl}}, {{$json.reportUrl}}, {{$json.imageUrl}}, or {{$json.file.downloadUrl}}.

Accepted format: Public HTTPS URL to the actual file, not a private dashboard page or local path.

Real workplace example: Send a daily KPI chart from {{$json.chartImageUrl}} to a manager Telegram group.

If it is empty or wrong: Runtime returns "Telegram: mediaUrl is required for operation" or Telegram rejects the file.

Common mistake: Using a Google Drive preview page, signed URL that expires too quickly, or private intranet URL Telegram cannot fetch.`;

const captionHelpText = `What this field means: Caption is optional text shown under media sent by Telegram.

Why it matters: It explains what the photo, document, video, audio, or animation is and gives teammates context.

When to fill it: Fill it for media sends when the file needs a label, summary, date, owner, or action.

What to enter: A short caption with mapped details such as {{$json.reportDate}}, {{$json.customerName}}, or {{$json.status}}.

Where the value comes from: Use report metadata, form data, monitoring summaries, CRM fields, or AI-generated summaries from earlier steps.

How to use it later: Caption is sent to Telegram and appears in {{$json.data}} when Telegram returns it. Write "Report for {{$json.reportDate}}: {{$json.summary}}" or map {{$json.caption}}.

Accepted format: Text within Telegram caption limits. Formatting follows Parse Mode.

Real workplace example: A finance workflow sends a PDF document with caption "Invoice {{$json.invoiceNumber}} for {{$json.customerName}}".

If it is empty or wrong: Media still sends without context, or Telegram rejects malformed formatted caption text.

Common mistake: Putting the whole long report in Caption. Put the file in Media URL and keep Caption short.`;

const replyToMessageIdHelpText = `What this field means: Reply To Message ID tells Telegram which existing message this send should reply to.

Why it matters: Replies keep bot answers and alerts connected to the original question or incident message.

When to fill it: Fill it when replying to a Telegram Trigger message or a previous Telegram message in the same chat.

What to enter: Map {{$json.messageId}}, {{$json.message_id}}, or {{$json.replyToMessageId}} from a trigger or previous Telegram output.

Where the value comes from: Telegram Trigger and Telegram send outputs include message IDs.

How to use it later: Reply context is sent to Telegram, while later nodes should use {{$json.messageId}} from the new output. Use {{$json.messageId}} after Telegram Trigger to reply in the same chat thread context.

Accepted format: Numeric Telegram message ID.

Real workplace example: A support bot receives a question and sends an AI answer as a reply to {{$json.messageId}}.

If it is empty or wrong: Empty sends a normal message. A wrong ID can make Telegram reject the reply or post without the expected context.

Common mistake: Using Chat ID here. Chat ID identifies the destination; Message ID identifies the specific message to reply to.`;

const editMessageIdHelpText = `What this field means: Edit Message ID identifies the existing bot message that should be updated.

Why it matters: Telegram can only edit a message when it knows the original message ID in the target chat.

When to fill it: Fill it when Operation is edit_message.

What to enter: Use {{$json.messageId}} from a previous Telegram Send Message output, or the message ID stored by your workflow.

Where the value comes from: Telegram send output returns messageId, and Telegram Trigger returns the incoming messageId.

How to use it later: The edited message still returns {{$json.messageId}} and {{$json.data}} for follow-up logs or checks. Save the first Telegram output, then use {{$json.messageId}} in a later edit step.

Accepted format: Numeric Telegram message ID for a message the bot can edit.

Real workplace example: Send "Approval pending" first, then edit that message to "Approved by {{$json.approverName}}" after a decision.

If it is empty or wrong: Runtime returns "Telegram: messageId is required for Edit Message" or Telegram rejects the edit.

Common mistake: Trying to edit a user's message or a message from another bot. Telegram usually allows bots to edit their own messages.`;

const replyMarkupHelpText = `What this field means: Reply Markup is optional Telegram JSON for inline buttons, custom keyboards, or keyboard removal.

Why it matters: Buttons let people respond quickly without typing exact commands.

When to fill it: Use it for approvals, routing choices, callback actions, or guided bot conversations.

What to enter: A Telegram reply markup JSON object such as {"inline_keyboard":[[{"text":"Approve","callback_data":"approve"}]]}.

Where the value comes from: Build it manually from Telegram Bot API examples, or map {{$json.replyMarkup}} from a trusted previous step.

How to use it later: Reply Markup is sent with the message, and follow-up trigger workflows can react to callback data. Insert mapped values into callback_data carefully, such as approve:{{$json.ticketId}}, while keeping valid JSON.

Accepted format: Valid JSON object for inline_keyboard, keyboard, remove_keyboard, or force_reply.

Real workplace example: Send an approval message with Approve and Reject buttons tied to a request ID.

If it is empty or wrong: Empty is fine. Invalid JSON may be sent as raw text or rejected by Telegram.

Common mistake: Using single quotes or trailing commas. Telegram expects valid JSON with double quotes.`;

const disableNotificationHelpText = `What this field means: Disable Notification sends the Telegram message silently.

Why it matters: Silent messages reduce interruption for routine updates while still appearing in the chat.

When to fill it: Turn it on for low-priority digests, logs, non-urgent status changes, or bulk messages.

What to enter: true for silent delivery, false for normal notification behavior.

Where the value comes from: This is a fixed workflow design choice, or a mapped priority flag such as {{$json.isLowPriority}}.

How to use it later: This changes notification behavior only; use {{$json.success}}, {{$json.messageId}}, or {{$json._error}} for workflow logic. Map a boolean from routing logic when high-priority messages should notify and low-priority messages should stay silent.

Accepted format: Boolean true or false.

Real workplace example: Send daily report summaries silently, but leave urgent outage alerts noisy.

If it is empty or wrong: Runtime treats it as false and Telegram sends a normal notification.

Common mistake: Using this for urgent alerts. Silent messages may be missed until someone opens Telegram.`;

const protectContentHelpText = `What this field means: Protect Content asks Telegram to prevent forwarding or saving the message content where supported.

Why it matters: It adds friction against casually forwarding sensitive internal updates, files, or media.

When to fill it: Turn it on for confidential reports, internal-only files, sensitive operational alerts, or private customer context.

What to enter: true to request protected content, false for normal sharing behavior.

Where the value comes from: Use a fixed choice or map a sensitivity flag such as {{$json.confidential}}.

How to use it later: This changes Telegram content protection only; later nodes should use {{$json.success}}, {{$json.messageId}}, and {{$json._error}}. Set it to {{$json.containsSensitiveData}} after a classifier or If/Else step.

Accepted format: Boolean true or false.

Real workplace example: Protect an internal finance PDF sent to a private manager group.

If it is empty or wrong: Runtime treats it as false and recipients may be able to forward or save normally.

Common mistake: Treating this as encryption or access control. Still send sensitive data only to the right chat.`;

const allowSendingWithoutReplyHelpText = `What this field means: Allow Sending Without Reply lets Telegram send the message even if Reply To Message ID no longer exists.

Why it matters: Automated replies can otherwise fail when the original message was deleted before the workflow responds.

When to fill it: Turn it on when replying is helpful but the message should still send if the original reply target is gone.

What to enter: true to send anyway, false to fail when the replied-to message is missing.

Where the value comes from: Use a fixed workflow choice based on how strict the reply relationship should be.

How to use it later: This controls fallback send behavior only; later nodes still read {{$json.success}}, {{$json.messageId}}, or {{$json._error}}. Pair it with {{$json.replyToMessageId}} when your trigger might reference older or deleted messages.

Accepted format: Boolean true or false.

Real workplace example: A support bot should still answer a question even if the user deleted the original message.

If it is empty or wrong: Runtime treats it as false, so missing replied-to messages can fail the Telegram request.

Common mistake: Turning it on when compliance requires the response to attach only to the original message.`;

export const telegramDoc: NodeDoc = {
  slug: 'telegram',
  displayName: 'Telegram',
  category: 'Communication',
  logoUrl: '/icons/nodes/telegram.svg',
  description: 'Send Telegram text messages, media, and message edits through a saved Telegram Bot Token connection.',
  credentialType: 'Telegram Bot Token - saved in Connections and used for Telegram Bot API calls',
  credentialSetupSteps: [
    'Create a Telegram bot in @BotFather, copy the bot token, and save it in Connections as a Telegram Bot Token.',
    'The bot token is stored in the credential system. Do not paste botToken, apiKey, or token into normal Telegram workflow fields.',
    'Start a chat with the bot, or add the bot to the target group or channel before sending. For channels, make the bot an admin if the channel requires it.',
    'Find Chat ID from Telegram Trigger output, @userinfobot, @getidsbot, or getUpdates after the bot has received a message in the destination chat.',
    'Use Send Message for text, Send Photo plus Media URL for images, and Edit Message when you already have a messageId from a previous Telegram output.',
    'Connect the Telegram output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.success}}, {{$json.operation}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.data}}, {{$json.raw}}, {{$json.telegram}}, {{$json._error}}, or {{$json._errorDetails}}.',
    'Downstream service node account connection setup is still required for nodes after Telegram; the Telegram Bot Token only authorizes Telegram sends.',
  ],
  credentialDocsUrl: 'https://core.telegram.org/bots/tutorial',
  resources: [
    {
      name: 'Configuration',
      description: 'Choose the Telegram operation, destination chat, text or media content, formatting, reply behavior, and optional protection settings.',
      operations: [
        {
          name: 'Send Message / Send Media / Edit Message',
          value: 'send_message',
          description: 'Sends or edits Telegram content through the Telegram Bot API. Use send_message for chatbot replies and alerts, send_photo for image notifications with optional captions, and edit_message to update an earlier bot message after a workflow status changes.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Telegram action to run.', helpText: operationHelpText, placeholder: 'send_message', example: 'send_message', defaultValue: 'send_message', options: ['send_message', 'send_photo', 'edit_message'] },
            { name: 'Chat ID', internalKey: 'chatId', type: 'string', required: true, description: 'Telegram chat, group, supergroup, or channel destination ID.', helpText: chatIdHelpText, placeholder: '{{$json.chatId}}', example: '{{$json.chatId}}' },
            { name: 'Message Type', internalKey: 'messageType', type: 'select', required: false, description: 'Telegram content type for sends.', helpText: messageTypeHelpText, placeholder: 'text', example: 'text', defaultValue: 'text', options: ['text', 'photo', 'video', 'document', 'audio', 'animation'] },
            { name: 'Message', internalKey: 'message', type: 'textarea', required: false, description: 'Text for send_message or edit_message.', helpText: messageHelpText, placeholder: '{{$json.reply || $json.aiResponse || $json.message || "Hello"}}', example: 'Ticket {{$json.ticketId}} is assigned to {{$json.owner}}.' },
            { name: 'Text', internalKey: 'text', type: 'textarea', required: false, description: 'Backend alias for Message text.', helpText: textHelpText, placeholder: '{{$json.aiResponse}}', example: '{{$json.aiResponse}}', notes: 'Most UI users should use Message. This alias is documented because runtime supports it.' },
            { name: 'Parse Mode', internalKey: 'parseMode', type: 'select', required: false, description: 'Formatting mode for text and captions.', helpText: parseModeHelpText, placeholder: 'HTML', example: 'HTML', defaultValue: 'HTML', options: ['none', 'HTML', 'Markdown', 'MarkdownV2'] },
            { name: 'Disable Web Page Preview', internalKey: 'disableWebPagePreview', type: 'boolean', required: false, description: 'Whether Telegram should hide link preview cards.', helpText: disableWebPagePreviewHelpText, placeholder: 'false', example: false, defaultValue: false },
            { name: 'Media URL', internalKey: 'mediaUrl', type: 'url', required: false, description: 'Public file URL for photo, video, document, audio, or animation sends.', helpText: mediaUrlHelpText, placeholder: 'https://cdn.example.com/report.png', example: '{{$json.chartImageUrl}}' },
            { name: 'Caption', internalKey: 'caption', type: 'textarea', required: false, description: 'Optional text shown under media.', helpText: captionHelpText, placeholder: 'Report for {{$json.reportDate}}', example: 'Report for {{$json.reportDate}}: {{$json.summary}}' },
            { name: 'Reply To Message ID', internalKey: 'replyToMessageId', type: 'number', required: false, description: 'Message ID this send should reply to.', helpText: replyToMessageIdHelpText, placeholder: '{{$json.messageId}}', example: '{{$json.messageId}}' },
            { name: 'Edit Message ID', internalKey: 'editMessageId', type: 'number', required: false, description: 'Existing bot message ID to edit.', helpText: editMessageIdHelpText, placeholder: '{{$json.messageId}}', example: '{{$json.messageId}}', notes: 'Required when Operation is edit_message.' },
            { name: 'Reply Markup', internalKey: 'replyMarkup', type: 'json', required: false, description: 'Telegram keyboard or button JSON.', helpText: replyMarkupHelpText, placeholder: '{"inline_keyboard":[[{"text":"Approve","callback_data":"approve"}]]}', example: '{"inline_keyboard":[[{"text":"Approve","callback_data":"approve:{{$json.ticketId}}"}]]}' },
            { name: 'Disable Notification', internalKey: 'disableNotification', type: 'boolean', required: false, description: 'Send silently without push notification sound.', helpText: disableNotificationHelpText, placeholder: 'false', example: false, defaultValue: false },
            { name: 'Protect Content', internalKey: 'protectContent', type: 'boolean', required: false, description: 'Ask Telegram to prevent forwarding or saving where supported.', helpText: protectContentHelpText, placeholder: 'false', example: false, defaultValue: false },
            { name: 'Allow Sending Without Reply', internalKey: 'allowSendingWithoutReply', type: 'boolean', required: false, description: 'Send even when the replied-to message is missing.', helpText: allowSendingWithoutReplyHelpText, placeholder: 'false', example: false, defaultValue: false },
          ],
          outputExample: {
            ticketId: 'TCK-1042',
            success: true,
            operation: 'sendMessage',
            chatId: '-1001234567890',
            messageId: 245,
            data: {
              message_id: 245,
              chat: { id: -1001234567890, title: 'Support Alerts' },
              text: 'Ticket TCK-1042 is assigned to Maya.',
            },
            raw: { ok: true },
            telegram: { ok: true },
          },
          outputDescription: 'Successful sends and edits keep incoming data and add success, operation, chatId, messageId, data, raw, and telegram. data contains the Telegram result object and raw/telegram contain the provider response. Failures keep incoming data and add _error, and API failures can add _errorDetails. Later nodes can use {{$json.success}}, {{$json.operation}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.data}}, {{$json.raw}}, {{$json.telegram}}, {{$json._error}}, or {{$json._errorDetails}}.',
          usageExample: {
            scenario: 'Reply to a Telegram support question after an AI Agent drafts a concise answer',
            inputValues: {
              operation: 'send_message',
              chatId: '{{$json.chatId}}',
              messageType: 'text',
              message: 'Answer for ticket {{$json.ticketId}}: {{$json.aiResponse}}',
              text: '',
              parseMode: 'HTML',
              disableWebPagePreview: true,
              mediaUrl: '',
              caption: '',
              replyToMessageId: '{{$json.messageId}}',
              editMessageId: '',
              replyMarkup: '{"inline_keyboard":[[{"text":"Open ticket","url":"{{$json.ticketUrl}}"}]]}',
              disableNotification: false,
              protectContent: false,
              allowSendingWithoutReply: true,
            },
            expectedOutput: 'The reply appears in Telegram. A later log, edit step, or If/Else node can use {{$json.success}}, {{$json.operation}}, {{$json.chatId}}, {{$json.messageId}}, {{$json.data}}, {{$json._error}}, and {{$json._errorDetails}}.',
          },
          externalDocsUrl: 'https://core.telegram.org/bots/api',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Telegram: chatId is required', cause: 'Chat ID is blank after expressions resolve.', fix: 'Map {{$json.chatId}} from Telegram Trigger or enter the numeric chat, group, or channel ID.' },
    { error: 'Telegram: bot token not found. Connect Telegram or provide botToken.', cause: 'No Telegram Bot Token connection was selected or resolved.', fix: 'Create or reconnect Telegram in Connections, save the BotFather token, and select that connection on the Telegram node.' },
    { error: 'Telegram: message is required for text messages', cause: 'Operation is send_message or Message Type is text, but Message/Text resolved to blank.', fix: 'Fill Message or map {{$json.aiResponse}}, {{$json.response}}, {{$json.message}}, or {{$json.text}}.' },
    { error: 'Telegram: messageId is required for Edit Message', cause: 'Operation is edit_message and Edit Message ID is blank.', fix: 'Use {{$json.messageId}} from a previous Telegram output or stored message record.' },
    { error: 'Telegram: text is required for Edit Message', cause: 'The edit operation has a message ID but no replacement text.', fix: 'Fill Message with the new text to show in Telegram.' },
    { error: 'Telegram: mediaUrl is required for operation', cause: 'A media send was selected without a public media URL.', fix: 'Provide a public HTTPS file URL such as {{$json.chartImageUrl}} or switch Message Type back to text.' },
    { error: 'Telegram: Unsupported operation', cause: 'The operation or effective media type is not one runtime supports.', fix: 'Choose send_message, send_photo, or edit_message, and use messageType text, photo, video, document, audio, or animation.' },
    { error: 'Telegram sendMessage failed / Telegram sendPhoto failed', cause: 'Telegram rejected the Bot API request because of permissions, bad chat ID, invalid formatting, inaccessible media, or a blocked bot.', fix: 'Check _errorDetails, confirm the bot is in the chat, verify Chat ID, and test the formatting or media URL.' },
    { error: 'Telegram error', cause: 'The request could not be sent because of network, DNS, TLS, or Telegram API availability issues.', fix: 'Retry later, verify network access, and check whether Telegram Bot API is reachable from the worker.' },
    { error: 'Next node cannot find Telegram message ID', cause: 'The downstream node is reading provider-specific raw fields instead of the normalized output.', fix: 'Use {{$json.messageId}} for the sent or edited message and {{$json.chatId}} for the destination chat.' },
    { error: 'Permission denied after Telegram', cause: 'Telegram Bot Token only authorizes Telegram sends; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Telegram.' },
  ],
  relatedNodes: ['telegram_trigger', 'ai_agent', 'slack_message', 'email', 'http_request'],
};
