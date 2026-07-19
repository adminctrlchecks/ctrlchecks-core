import type { NodeDoc } from '../types';

const toHelpText = `What this field means: To is the recipient's phone number that will receive this SMS or MMS message.

Why it matters: Twilio only accepts numbers in strict E.164 international format — a locally formatted number (like a number typed with spaces or a leading 0) is rejected before this node even contacts Twilio.

When to fill it: Always required.

What to enter: The recipient's full phone number, including the + sign and country code, with no spaces, dashes, or brackets.

Where the value comes from: Map it from an earlier step, such as a signup form or a customer record, or type it fixed for a known recipient.

How to use it later: Not echoed back in this node's own output fields — only success/sid/status/twilio are returned.

Accepted format: E.164 format only: a + sign, then the country code, then the number, with no other characters — for example +14155552671 (USA), +919876543210 (India), or +447911123456 (UK).

Real workplace example: {{$json.phoneNumber}} mapped from a checkout or signup step that already collected a customer's phone number.

If it is empty or wrong: An empty value returns "Twilio: to and message are required". A value that is not valid E.164 (missing the +, containing spaces, or using a local format) returns "Twilio: \\"to\\" must be a valid E.164 phone number (e.g. +14155552671), got \\"...\\"" before Twilio is ever contacted.

Common mistake: Passing a number in local format (like "0455 123 456" or "(415) 555-2671") instead of converting it to full E.164 with a country code first.`;

const messageHelpText = `What this field means: Message is the SMS/MMS text content the recipient receives.

Why it matters: It is the one field that actually determines what the recipient reads; an empty value fails the send before Twilio is contacted.

When to fill it: Always required.

What to enter: The message text, written for a phone screen — short and to the point.

Where the value comes from: Type fixed wording, or map content from a previous step such as a generated one-time code or order status.

How to use it later: Not echoed back in this node's own output fields.

Accepted format: Plain text. {{$json.field}} expressions are resolved before sending. Standard SMS segments are limited to around 160 characters (fewer if using non-GSM characters like emoji or accented letters); Twilio automatically splits and bills longer messages as multiple segments rather than failing.

Real workplace example: "Hi {{$json.name}}, your verification code is {{$json.code}}. It expires in 10 minutes. Do not share this code."

If it is empty or wrong: An empty value returns "Twilio: to and message are required" before Twilio is contacted. There is no maximum-length validation in this node itself — an unusually long message is simply sent (and billed) as multiple segments by Twilio, not rejected.

Common mistake: Writing a long, multi-paragraph message expecting it to render as one message on the recipient's phone — SMS has no formatting and very long messages read as several separate texts.`;

const fromHelpText = `What this field means: From is your Twilio phone number that the SMS/MMS is sent from.

Why it matters: Twilio requires the From number to be a number you actually own in your Twilio account — a personal or non-Twilio number is rejected.

When to fill it: Required unless Messaging Service SID is filled instead. Fill exactly one of the two, not both.

What to enter: One of your active Twilio phone numbers, in E.164 format.

Where the value comes from: Twilio Console → Phone Numbers → Manage → Active Numbers, where your purchased/trial numbers are listed.

How to use it later: Not echoed back in this node's own output fields (though the raw twilio.from field in the output confirms which number Twilio actually used).

Accepted format: E.164 format, the same as To — for example +15005550006.

Real workplace example: +15005550006 (a number purchased in your Twilio account) used to send appointment reminders.

If it is empty or wrong: If both From and Messaging Service SID are empty, the node returns "Twilio: either \\"from\\" (a Twilio phone number) or \\"messagingServiceSid\\" is required." A value that is not valid E.164 returns "Twilio: \\"from\\" must be a valid E.164 phone number (e.g. +14155552671), got \\"...\\"".

Common mistake: Typing a personal cell number here instead of a number purchased or provisioned inside your own Twilio account — Twilio will reject any From number it does not recognize as belonging to your account.`;

const messagingServiceSidHelpText = `What this field means: Messaging Service SID sends this message through a Twilio Messaging Service — a pool of numbers and sending logic — instead of one fixed From number.

Why it matters: A Messaging Service can automatically pick the best number from a pool, handle number-pooling for scale, and apply features like sticky-sender behavior — useful for higher-volume or multi-region sending that a single From number cannot handle well.

When to fill it: Optional; fill it instead of From, not in addition to it, whenever your workflow should send through a configured Messaging Service rather than one specific number.

What to enter: The SID of an existing Twilio Messaging Service.

Where the value comes from: Twilio Console → Messaging → Services, where Messaging Services are created and configured.

How to use it later: Not echoed back in this node's own output fields.

Accepted format: A Messaging Service SID starting with MG, for example MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.

Real workplace example: MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx used for a high-volume marketing SMS campaign that should rotate across a pool of numbers.

If it is empty or wrong: If both From and Messaging Service SID are empty, the node returns "Twilio: either \\"from\\"... or \\"messagingServiceSid\\" is required." An SID that does not exist in your account causes Twilio itself to reject the send as an API-level failure.

Common mistake: Filling both From and Messaging Service SID at once, expecting some kind of fallback behavior — this node always sends Messaging Service SID to Twilio when it is present, ignoring From entirely in that case.`;

const mediaUrlHelpText = `What this field means: Media URL is a publicly accessible link to an image, GIF, or other media file that turns this message into an MMS instead of a plain SMS.

Why it matters: Including it changes how the message is billed and delivered (MMS pricing and carrier support differ from SMS) and lets you send visual content like receipts, photos, or graphics.

When to fill it: Optional. Fill it only when the message should include a media attachment.

What to enter: A direct public URL pointing to the media file itself, not a webpage that displays it.

Where the value comes from: A hosted image, a generated chart or receipt image, or any publicly reachable file URL from an earlier workflow step.

How to use it later: Not echoed back in this node's own output fields (though the raw twilio response inside the twilio field may reflect media info depending on Twilio's API response).

Accepted format: A public HTTPS URL pointing directly to an image or media file, for example https://example.com/image.jpg.

Real workplace example: A generated QR-code image URL sent alongside a booking confirmation text.

If it is empty or wrong: Left empty, the node sends a plain SMS with no attachment — there is no error either way, since this field is optional. An unreachable or non-public URL causes Twilio to fail delivering the media (and sometimes the whole message), surfaced through Twilio's own delivery status rather than this node's immediate response.

Common mistake: Using a page URL (like a Google Drive share link or a webpage that embeds the image) instead of a direct file URL — Twilio needs to fetch the raw media file, not render a page.`;

export const twilioDoc: NodeDoc = {
  slug: 'twilio',
  displayName: 'Twilio',
  category: 'Communication',
  logoUrl: '/icons/nodes/twilio.svg',
  description: 'Send an SMS or MMS text message through Twilio using a saved Twilio Account Credentials connection (Account SID + Auth Token).',
  credentialType: 'Twilio Account Credentials',
  credentialSetupSteps: [
    'What this is: The Twilio Account Credentials connection stores your Account SID and Auth Token outside regular workflow fields — neither is typed directly into this node.',
    'Prerequisites: a Twilio account at console.twilio.com (a free trial includes credits), and a Twilio phone number to send from (Phone Numbers → Manage → Active Numbers), unless you plan to use a Messaging Service SID instead.',
    'How to connect: on the Twilio Console main dashboard, find the "Account Info" section. Copy the Account SID (it starts with AC), then click "Show" next to Auth Token to reveal and copy it.',
    'In CtrlChecks: open Connections → Add Connection → Twilio Account Credentials, then paste the Account SID and Auth Token.',
    'Important: treat the Auth Token like a bank password — it gives full control of your Twilio account. Store it only in Connections, never in the To, Message, or any other normal workflow field. If it is ever pasted somewhere outside Connections, regenerate it in the Twilio Console.',
    'Trial accounts can only send to Verified Caller IDs (Twilio Console → Phone Numbers → Verified Caller IDs) until the account is upgraded — test with a verified number first, or every send will fail even with correct credentials.',
    'Test it: save the connection, select it on a Twilio node with a valid From number (or Messaging Service SID), run a simple send to a number you can check, and confirm the node returns success: true with a sid.',
    'Downstream service node account connections are separate: connecting Twilio only authorizes this node\'s own SMS/MMS send — any node after it in the workflow still needs its own account connection and permissions for its own outgoing line of work.',
  ],
  credentialDocsUrl: 'https://www.twilio.com/docs/iam/keys/api-key',
  resources: [
    {
      name: 'Configuration',
      description: 'Twilio has a single send action, configured directly with input fields — there is no separate resource/operation dropdown, and this node sends only SMS/MMS text messages (no voice calls).',
      operations: [
        {
          name: 'Send SMS/MMS',
          value: 'default',
          description: 'Sends one SMS (or MMS, when Media URL is set) text message through Twilio\'s Messages API, from either a specific phone number or a Messaging Service.',
          fields: [
            {
              name: 'To Number',
              internalKey: 'to',
              type: 'string',
              required: true,
              description: 'Recipient phone number, E.164 format (e.g. +14155552671)',
              helpText: toHelpText,
              placeholder: '+1234567890',
              example: '+1234567890',
            },
            {
              name: 'Message',
              internalKey: 'message',
              type: 'textarea',
              required: true,
              description: 'SMS message text',
              helpText: messageHelpText,
              placeholder: 'Hello from CtrlChecks!',
              example: 'Hello from CtrlChecks!',
            },
            {
              name: 'From Number',
              internalKey: 'from',
              type: 'string',
              required: false,
              description: 'Sender phone number, E.164 format. Required unless Messaging Service SID is set.',
              helpText: fromHelpText,
              placeholder: '+1234567890',
              example: '+1234567890',
            },
            {
              name: 'Messaging Service SID',
              internalKey: 'messagingServiceSid',
              type: 'string',
              required: false,
              description: 'Twilio Messaging Service SID to send from instead of a single From number',
              helpText: messagingServiceSidHelpText,
              placeholder: 'MG...',
              example: 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            {
              name: 'Media URL (MMS)',
              internalKey: 'mediaUrl',
              type: 'url',
              required: false,
              description: 'Publicly accessible media URL to send as an MMS attachment',
              helpText: mediaUrlHelpText,
              placeholder: 'https://example.com/image.jpg',
              example: 'https://example.com/image.jpg',
            },
          ],
          outputExample: {
            success: true,
            sid: 'SM1234abcd5678efgh1234abcd5678ef',
            status: 'queued',
            twilio: { sid: 'SM1234abcd5678efgh1234abcd5678ef', status: 'queued', to: '+15551234567', from: '+15559876543', body: 'Your verification code is 4821.' },
          },
          outputDescription: 'On success: success is true, sid is Twilio\'s Message SID (also duplicated inside twilio.sid) for tracking in the Twilio console, status is Twilio\'s initial queue status (typically "queued" or "sent" — this is NOT final delivery confirmation; Twilio updates status asynchronously and this node does not poll for the final "delivered"/"failed" state), and twilio is the full raw Twilio API response. Original upstream $json fields are preserved alongside these. On failure, the node returns _error (only a bare "Twilio send failed (<status>)" string with no reason) and _errorDetails (Twilio\'s actual raw error body, containing the real message/code/more_info) — check _errorDetails, not just _error, to find out why a send failed. There is no success: false at all on failure, not even set to false.',
          usageExample: {
            scenario: 'Send a 2FA SMS verification code to a user who is logging in',
            inputValues: {
              to: '{{$json.phoneNumber}}',
              message: 'Your CtrlChecks verification code is {{$json.otpCode}}. Expires in 10 minutes.',
              from: '+15005550006',
            },
            expectedOutput: 'The SMS is queued with Twilio. Use {{$json.sid}} to look up final delivery status in the Twilio console, and check {{$json._errorDetails}} in a following node if {{$json._error}} is present.',
          },
          externalDocsUrl: 'https://www.twilio.com/docs/sms/send-messages',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Twilio: to and message are required',
      cause: 'To or Message resolved to an empty string after expressions were evaluated.',
      fix: 'Fill To and Message with fixed values or valid {{$json.field}} expressions, and confirm the upstream node actually produced that field.',
    },
    {
      error: 'Twilio: "to"/"from" must be a valid E.164 phone number',
      cause: 'The phone number is missing the + sign, contains spaces or punctuation, or is in a local (non-international) format.',
      fix: 'Convert the number to full E.164 format: a + sign, the country code, then the number with no other characters, for example +14155552671.',
    },
    {
      error: 'Twilio: missing Account SID/Auth Token',
      cause: 'No Twilio Account Credentials connection is selected on this node, and no fallback credential was found either.',
      fix: 'Open Connections, add a Twilio Account Credentials connection with the Account SID and Auth Token from console.twilio.com, then select it on this node.',
    },
    {
      error: 'Twilio: either "from" or "messagingServiceSid" is required',
      cause: 'Both From Number and Messaging Service SID were left empty.',
      fix: 'Fill exactly one of From Number (a Twilio phone number you own) or Messaging Service SID.',
    },
    {
      error: 'Twilio send failed (<status>)',
      cause: 'Twilio itself rejected the request — commonly an unverified recipient on a trial account, an invalid or non-owned From number, or insufficient account balance.',
      fix: 'Check {{$json._errorDetails}} for Twilio\'s actual error message and code (the _error string alone does not include the reason). For trial accounts, verify the recipient number under Twilio Console → Phone Numbers → Verified Caller IDs, or upgrade the account.',
    },
    {
      error: 'Next node cannot find the send result',
      cause: 'A downstream node is reading a field this node never produces, such as a nested response.sid path instead of the flattened output.',
      fix: 'Use the real output fields: {{$json.success}}, {{$json.sid}}, {{$json.status}}, {{$json.twilio}}, and check {{$json._error}}/{{$json._errorDetails}} for failures (this node never sets a plain success: false — check _error instead).',
    },
    {
      error: 'Permission denied after Twilio',
      cause: 'The Twilio connection only authorizes sending SMS/MMS through your Twilio account — it does not grant any access to whatever service a later node in the workflow talks to.',
      fix: 'Connect the required account separately on each downstream service node and confirm that node\'s own permissions.',
    },
  ],
  relatedNodes: ['whatsapp_cloud', 'email', 'http_request'],
};
