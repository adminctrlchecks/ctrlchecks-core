import type { NodeDoc } from '../types';

const toHelpText = `What this field means: To is the recipient's WhatsApp phone number.

Why it matters: WhatsApp only accepts numbers in E.164 international format — a locally formatted number is rejected before this node contacts Meta.

When to fill it: Always required.

What to enter: The recipient's full phone number, including the + sign and country code, with no spaces, dashes, or brackets.

Where the value comes from: Map it from a WhatsApp Trigger's {{$json.chatId}} or {{$json.from}} to reply in the same conversation, or from a customer record for an outbound message.

How to use it later: Not echoed back as a separate field in this node's own output — recipient confirmation lives inside the raw data object returned on success.

Accepted format: E.164 format: a + sign, then the country code, then the number, for example +14155552671.

Real workplace example: {{$json.chatId}} mapped from a WhatsApp Trigger to reply to the customer who just messaged in.

If it is empty or wrong: An empty or malformed value causes the underlying WhatsApp Business Cloud API to reject the send, surfaced as an error from Meta rather than a pre-flight check in this deprecated node.

Common mistake: Typing a locally formatted number (missing the + or country code) instead of full E.164 format.`;

const textHelpText = `What this field means: This is the free-form text message content the recipient reads on WhatsApp. In the visual panel it is labeled "Message" but is stored under the internal field key text.

Why it matters: This is the only field that actually determines what the recipient reads on a plain-text send through this deprecated node.

When to fill it: Always required.

What to enter: The message text, written for a chat conversation.

Where the value comes from: Map it from a WhatsApp Trigger's incoming message, an AI Agent's generated reply, or a fixed notification you write yourself.

How to use it later: Not echoed back as a separate field in this node's own output.

Accepted format: Plain text. {{$json.field}} expressions are resolved before sending. WhatsApp only allows a free-form text reply like this within the 24-hour customer service window that opens after a customer messages you first — outside that window, a message needs to be an approved template instead, which this deprecated panel does not support (see Common Errors).

Real workplace example: "Hi {{$json.customerName}}, your order #{{$json.orderId}} has been confirmed and will ship in 2 days."

If it is empty or wrong: An empty value causes the WhatsApp Business Cloud API to reject the send as invalid.

Common mistake: This field used to be stored under a key named message in this panel, which the underlying WhatsApp send logic never actually read — every send through the old panel went out with an empty body regardless of what was typed. The field key is now text, matching what the shared WhatsApp executor reads, so this no longer happens; if you are looking at an old saved workflow JSON and see a message key instead of text, re-save the node in the panel once to correct it.`;

const messageTypeHelpText = `What this field means: Message Type is a leftover dropdown (Text or Template) from an earlier version of this deprecated node's panel.

Why it matters: It has no effect on what actually gets sent — it exists only so old saved workflows still render this node without a missing-field error.

When to fill it: It always has a value (defaults to Text), but changing it does nothing.

What to enter: Leave it on its default value; there is nothing meaningful to configure here.

Where the value comes from: Not applicable — this is not read by the runtime.

How to use it later: Not echoed back in this node's own output, and does not change which WhatsApp API call is made.

Accepted format: Text or Template, though both behave identically (always a plain text send).

Real workplace example: Not applicable — every send through this deprecated node is always a plain text message regardless of this field's value.

If it is empty or wrong: There is no error either way, since nothing reads this field.

Common mistake: Setting this to Template expecting an approved WhatsApp template message to be sent — this deprecated node cannot send templates at all; switch to the WhatsApp node and its Send Template operation instead.`;

const phoneNumberIdHelpText = `What this field means: Phone Number ID is the Meta-assigned identifier for which of your WhatsApp Business phone numbers should send this message. It is a backend-level field that is not shown anywhere in this deprecated node's visual panel.

Why it matters: If your Meta Business Account has more than one WhatsApp phone number, this decides which one sends the message; if left unset, the first number on your connected account is used automatically.

When to fill it: This deprecated panel has no field for it at all — it can only be set by directly editing the workflow JSON, and is not something most users need to touch.

What to enter: Not applicable through this panel. If editing workflow JSON directly, use the Meta-assigned Phone Number ID (a long numeric string), not the human-readable phone number.

Where the value comes from: Meta Business Suite → WhatsApp → API Setup, where each connected phone number's ID is listed.

How to use it later: Not echoed back in this node's own output.

Accepted format: A numeric Meta Phone Number ID, for example 123456789012345.

Real workplace example: Left unset for the common case of a single connected WhatsApp Business phone number.

If it is empty or wrong: Left empty, the first phone number on the connected account is used automatically — there is no error for leaving it unset.

Common mistake: Confusing the Phone Number ID (a long internal Meta identifier) with the actual WhatsApp phone number itself (like +14155552671) — they are different values, and this field expects the ID, not the visible number.`;

const mediaUrlHelpText = `What this field means: Media URL is a backend-declared field for attaching an image, video, or document to a WhatsApp message, used for the sendMedia operation. It is not shown anywhere in this deprecated node's visual panel.

Why it matters: This deprecated node's panel can only ever send plain text (see Message Type above) — Media URL exists in the backend schema for legacy workflow JSON that already used it, but there is no way to set it through the current panel.

When to fill it: Not applicable through this panel. If a legacy workflow's JSON already has this field set from before, it may still work since the underlying execution is shared with the WhatsApp node's sendMedia handling.

What to enter: Not applicable through this panel.

Where the value comes from: Not applicable through this panel.

How to use it later: Not echoed back in this node's own output.

Accepted format: A public HTTPS URL pointing directly to a media file.

Real workplace example: Not applicable — use the WhatsApp node's Send Media operation instead, which fully exposes Media URL, Media Type, Media ID, and Caption fields.

If it is empty or wrong: Left empty, this deprecated node only ever sends plain text (see Message Type above) — there is no error either way.

Common mistake: Expecting to attach media through this deprecated node's panel — switch to the WhatsApp node and its Send Media operation instead, which is the fully documented, supported path.`;

const operationHelpText = `What this field means: Operation identifies which WhatsApp action to perform within the Message resource. It is a backend-declared, required field that is not shown anywhere in this deprecated node's visual panel — it is always fixed to sendText internally.

Why it matters: The underlying WhatsApp executor (shared with the WhatsApp node) supports sendText, sendMedia, sendLocation, sendContact, sendTemplate, sendInteractiveButtons, sendInteractiveList, sendInteractiveCTA, and markAsRead, but this deprecated panel only ever runs sendText — there is no way to reach the others through this panel.

When to fill it: Not applicable through this panel — it is always sendText.

What to enter: Not applicable through this panel.

Where the value comes from: Not applicable through this panel; it is hardcoded to sendText for every send made through this deprecated node.

How to use it later: Not echoed back in this node's own output.

Accepted format: Always the fixed value sendText when sent through this deprecated panel.

Real workplace example: Not applicable — use the WhatsApp node's Operation dropdown for Send Media, Send Location, Send Contact Card, Send Template, interactive messages, or Mark as Read.

If it is empty or wrong: Not applicable through this panel; the value is always supplied internally.

Common mistake: Assuming this deprecated node can send anything other than plain text — it cannot; switch to the WhatsApp node, whose Operation dropdown covers all nine real message operations.`;

const resourceHelpText = `What this field means: Resource identifies which category of WhatsApp Business Cloud API object this node acts on. It is a backend-declared, required field that is not shown anywhere in this deprecated node's visual panel — it is always fixed to message internally.

Why it matters: The underlying WhatsApp executor (shared with the WhatsApp node) supports Message, Contact, Conversation, Template, Campaign, and AI Agent resources, but this deprecated panel only ever operates on Message — there is no way to reach the others through this panel.

When to fill it: Not applicable through this panel — it is always message.

What to enter: Not applicable through this panel.

Where the value comes from: Not applicable through this panel; it is hardcoded to message for every send made through this deprecated node.

How to use it later: Not echoed back in this node's own output.

Accepted format: Always the fixed value message when sent through this deprecated panel.

Real workplace example: Not applicable — use the WhatsApp node for Contact, Conversation, Template, Campaign, or AI Agent resource access.

If it is empty or wrong: Not applicable through this panel; the value is always supplied internally.

Common mistake: Assuming this deprecated node can reach WhatsApp's Contact, Conversation, Template, Campaign, or AI Agent resources — it cannot; switch to the WhatsApp node, whose documentation covers all six resources.`;

export const whatsappCloudDoc: NodeDoc = {
  slug: 'whatsapp_cloud',
  displayName: 'WhatsApp Cloud (Deprecated)',
  category: 'Communication',
  logoUrl: '/icons/nodes/whatsapp_cloud.svg',
  description: 'Deprecated — sends a plain WhatsApp text message. Kept only so existing saved workflows that already reference this node type keep working; do not add this node to new workflows. Use the WhatsApp node instead, which supports media, locations, contacts, templates, interactive messages, and more through the identical underlying WhatsApp Business Cloud API connection.',
  credentialType: 'WhatsApp Business API (shared with the WhatsApp node)',
  credentialSetupSteps: [
    'What this is: this node uses the exact same WhatsApp Business API connection and Facebook/Meta OAuth flow as the WhatsApp node — there is no separate credential type for WhatsApp Cloud. Nothing is typed directly into this node\'s panel for authentication.',
    'This node never reads an access token or Phone Number ID from its own config fields — both come from the connected WhatsApp Business account, resolved the same way as the WhatsApp node.',
    'In CtrlChecks: open Connections and confirm a WhatsApp Business API connection is already saved (Facebook/Meta OAuth with whatsapp_business_messaging and whatsapp_business_management scopes, created via Meta for Developers), then select it on this node just like on the WhatsApp node.',
    'Because this node is deprecated, the recommended path is to replace it with a WhatsApp node using the same saved connection, rather than configuring a new WhatsApp Cloud node from scratch.',
    'Important: never paste an access token, app secret, or Phone Number ID into the To or Message fields — those are the only two fields this deprecated panel exposes, and neither is a credential field.',
    'Test it: open the node, confirm a WhatsApp Business connection is selected, run a simple send to a number you can check, and confirm the workflow completes without an _error field.',
    'Downstream service node account connections are separate: connecting WhatsApp here only authorizes this node\'s own message send — any node after it in the workflow still needs its own account connection and permissions for its own outgoing line of work.',
  ],
  credentialDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  resources: [
    {
      name: 'Message',
      description: 'This deprecated node\'s visual panel can only send a plain WhatsApp text message. The underlying WhatsApp Business Cloud API supports far more (media, locations, contacts, templates, interactive buttons/lists, marking messages as read), but none of that is reachable through this panel — only the WhatsApp node exposes those.',
      operations: [
        {
          name: 'Send Text',
          value: 'sendText',
          description: 'Sends one free-form WhatsApp text message to a recipient, using the identical execution path and credential resolution as the WhatsApp node\'s Send Text operation.',
          fields: [
            {
              name: 'To (phone number)',
              internalKey: 'to',
              type: 'string',
              required: true,
              description: 'Recipient phone number, E.164 format',
              helpText: toHelpText,
              placeholder: '+1234567890',
              example: '+1234567890',
            },
            {
              name: 'Message',
              internalKey: 'text',
              type: 'textarea',
              required: true,
              description: 'The free-form text message to send',
              helpText: textHelpText,
              placeholder: 'Hello from CtrlChecks!',
              example: 'Hello from CtrlChecks!',
            },
            {
              name: 'Message Type',
              internalKey: 'messageType',
              type: 'select',
              required: false,
              description: 'Inert leftover field with no effect on the actual send',
              helpText: messageTypeHelpText,
              placeholder: 'text',
              example: 'text',
              defaultValue: 'text',
              options: ['text', 'template'],
            },
            {
              name: 'Resource',
              internalKey: 'resource',
              type: 'string',
              required: true,
              description: 'Fixed to "message" internally; not exposed in this deprecated panel',
              helpText: resourceHelpText,
              placeholder: 'message',
              example: 'message',
              defaultValue: 'message',
            },
            {
              name: 'Operation',
              internalKey: 'operation',
              type: 'string',
              required: true,
              description: 'Fixed to "sendText" internally; not exposed in this deprecated panel',
              helpText: operationHelpText,
              placeholder: 'sendText',
              example: 'sendText',
              defaultValue: 'sendText',
            },
            {
              name: 'Phone Number Id',
              internalKey: 'phoneNumberId',
              type: 'string',
              required: false,
              description: 'Backend-declared field, not exposed in this deprecated panel',
              helpText: phoneNumberIdHelpText,
              placeholder: '123456789012345',
              example: '123456789012345',
            },
            {
              name: 'Media Url',
              internalKey: 'mediaUrl',
              type: 'url',
              required: false,
              description: 'Backend-declared field for sendMedia, not exposed in this deprecated panel',
              helpText: mediaUrlHelpText,
              placeholder: 'https://example.com/file.jpg',
              example: 'https://example.com/file.jpg',
            },
          ],
          outputExample: {
            success: true,
            data: { messaging_product: 'whatsapp', contacts: [{ input: '+1234567890', wa_id: '1234567890' }], messages: [{ id: 'wamid.HBgLMTIzNDU2Nzg5MA==' }] },
          },
          outputDescription: 'This node delegates its entire execution to the WhatsApp node\'s runtime, so the output shape is identical: success is true when the WhatsApp Business Cloud API accepted the message, and data is Meta\'s raw API response (contacts confirms the resolved recipient, messages[0].id is the new WhatsApp message ID). On failure, the node returns success: false plus _error (a plain-language message), _errorCode (usually WHATSAPP_ERROR), and _errorDetails — not the fabricated flat {messaging_product, contacts, messages} shape a much older version of this documentation page incorrectly showed as the entire output.',
          usageExample: {
            scenario: 'Reply to a customer who just messaged your WhatsApp Business number, using an existing legacy workflow that has not yet been migrated to the WhatsApp node',
            inputValues: {
              to: '{{$json.chatId}}',
              text: 'Hi {{$json.customerName}}, your order #{{$json.orderId}} has been confirmed and will ship in 2 days.',
            },
            expectedOutput: 'The WhatsApp message is delivered. Check {{$json.success}} and {{$json._error}} in the next node, and consider replacing this node with a WhatsApp node using the same connection.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'This deprecated node only sends plain text',
      cause: 'The visual panel exposes only To and Message — Media URL, Phone Number ID, template fields, location fields, contact fields, and interactive-message fields all exist on the shared WhatsApp Business Cloud API but are not reachable through this panel.',
      fix: 'Replace this node with a WhatsApp node using the same saved connection — it exposes all of Message, Contact, Conversation, Template, Campaign, and AI Agent resource operations that this deprecated node cannot reach.',
    },
    {
      error: 'Message Type dropdown does nothing when changed',
      cause: 'This field is a leftover from an earlier panel version and is never read by the shared WhatsApp executor — every send through this node is always a plain text send regardless of its value.',
      fix: 'Ignore this field. Use the WhatsApp node\'s Operation dropdown (Send Template, Send Media, etc.) for anything other than plain text.',
    },
    {
      error: 'Message sent with an empty body on an old saved workflow',
      cause: 'A previous version of this panel stored the message text under a field key named message, which the shared WhatsApp executor never actually reads (it only reads text) — sends went out with an empty body regardless of what was typed.',
      fix: 'Open the node in the panel and re-type or re-save the Message field once — the panel now stores it under the correct text key that the runtime actually reads.',
    },
    {
      error: 'WhatsApp Business Cloud API rejected the request',
      cause: 'The connected WhatsApp Business account\'s access token expired, the recipient number is invalid, or the message was sent outside the 24-hour customer service window without using an approved template (which this deprecated node cannot send).',
      fix: 'Reconnect the WhatsApp Business connection in CtrlChecks → Connections if the token expired, confirm the To number is a valid E.164 WhatsApp number, and switch to the WhatsApp node\'s Send Template operation for messages outside the 24-hour window.',
    },
    {
      error: 'Next node cannot find the send result',
      cause: 'A downstream node is reading a field this node never produces, such as a top-level messages array instead of the actual data.messages array.',
      fix: 'Use the real output fields: {{$json.success}}, {{$json.data}}, and check {{$json._error}}/{{$json._errorCode}}/{{$json._errorDetails}} for failures.',
    },
    {
      error: 'Permission denied after WhatsApp Cloud',
      cause: 'The connected WhatsApp Business account only authorizes sending WhatsApp messages — it does not grant any access to whatever service a later node in the workflow talks to.',
      fix: 'Connect the required account separately on each downstream service node and confirm that node\'s own permissions.',
    },
  ],
  relatedNodes: ['whatsapp', 'whatsapp_trigger', 'twilio'],
};
