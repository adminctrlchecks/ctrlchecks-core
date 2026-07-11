/**
 * Per-node, per-operation, per-field help text content bible.
 *
 * Structure: NODE_FIELD_CONTENT[nodeSlug][operationValue][fieldKey] = helpText
 * Use '*' as operationValue for fields common to ALL operations of that node.
 *
 * This is checked FIRST by deriveHelpText() in generate-node-docs.cjs before
 * any generic rules, so every entry here takes full priority.
 */
export const NODE_FIELD_CONTENT: Record<string, Record<string, Record<string, string>>> = {

  // ─────────────────────────────────────────────────────────────
  // TRIGGERS
  // ─────────────────────────────────────────────────────────────

  schedule: {
    default: {
      cronExpression: `What this field is: A schedule that tells CtrlChecks when to run this workflow automatically.
How to fill it: Use 5 numbers separated by spaces: minute  hour  day  month  weekday.
Examples:
  0 9 * * 1-5  →  every weekday (Mon–Fri) at 9:00 AM
  0 */4 * * *  →  every 4 hours
  30 18 * * 5  →  every Friday at 6:30 PM
  0 0 1 * *    →  first day of every month at midnight
Tip: Visit crontab.guru in your browser — describe when you want it to run and it builds the expression for you.`,
      interval: `What this field is: How often this workflow repeats automatically.
How to fill it: Type a number. Then set the "Unit" field below to seconds, minutes, or hours.
Example: 15 (with unit = minutes) runs every 15 minutes.`,
      unit: `What this field is: The time unit for how often the workflow runs.
Options: seconds, minutes, hours.
Example: minutes — so if interval is 15, it runs every 15 minutes.`,
    },
  },

  interval: {
    default: {
      interval: `What this field is: How often this workflow repeats.
How to fill it: Type a number. Combined with the "Unit" field, this sets the full frequency.
Example: 15 (then set unit to "minutes") runs every 15 minutes.`,
      unit: `What this field is: The time unit for the interval.
Options: seconds, minutes, hours.
Example: minutes`,
    },
  },

  webhook: {
    default: {
      path: `What this field is: The web address path where external services send data to start this workflow.
How to fill it: Type a short path starting with /. Keep it descriptive.
Example: /new-order or /form-submit or /stripe-payment
After saving, CtrlChecks shows you the full URL (e.g. https://yourapp.com/webhook/new-order). Copy that and paste it into the external service's webhook settings.`,
      method: `What this field is: The type of web request this webhook accepts.
How to choose: POST is the most common — use it when the external service sends data to you. GET is for simple trigger pings.
Example: POST`,
    },
  },

  form: {
    default: {
      fields: `What this field is: The list of questions and input fields shown on the form.
How to fill it: Write a JSON array where each item is one form field with a name, label, and type.
Example:
[
  {"name":"email","label":"Your Email","type":"email","required":true},
  {"name":"name","label":"Full Name","type":"string","required":true},
  {"name":"message","label":"Your Message","type":"textarea"}
]
Tip: After saving, CtrlChecks gives you a public form URL you can share with users or embed on your website.`,
      title: `What this field is: The heading shown at the top of the form.
Example: Contact Us or Request a Demo or Submit Your Feedback`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // COMMUNICATION
  // ─────────────────────────────────────────────────────────────

  google_gmail: {
    '*': {
      from: `What this field is: The email address that will appear as the sender.
How to fill it: Use your Gmail address or a Gmail alias you have set up.
Example: alice@gmail.com or orders@yourcompany.com
Leave blank to use your primary Gmail address automatically.`,
    },
    send: {
      recipientEmails: `What this field is: The email address(es) of who will receive this email.
How to fill it: Type one email address. For multiple recipients, separate with commas.
Example (one): alice@example.com
Example (multiple): alice@example.com, bob@example.com, carol@example.com
Tip: Use {{$json.email}} to pull the email address from a previous step (like a form or database node).`,
      subject: `What this field is: The subject line — the bold text the recipient sees in their inbox before opening the email.
How to fill it: Write a short, clear subject.
Example: Your order #12345 has shipped!
Tip: Use {{$json.orderNumber}} to include data from an earlier step. Example: Your order #{{$json.orderId}} has been confirmed.`,
      body: `What this field is: The full email content — everything the recipient reads after opening.
How to fill it: Type plain text. Line breaks are kept.
Example: Hi {{$json.name}}, thank you for your purchase! Your order will arrive in 3–5 business days.
Tip: Anything inside {{ }} is replaced with real data from an earlier step. Example: {{$json.name}} becomes "Alice".`,
      cc: `What this field is: Optional visible copied recipients.
How to fill it: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.
Example: manager@example.com, audit@example.com
Leave blank when no CC recipients are needed.`,
      bcc: `What this field is: Optional hidden copied recipients.
How to fill it: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.
Example: archive@example.com
Leave blank when no BCC recipients are needed.`,
    },
    get: {
      messageId: `What this field is: The unique ID of a specific Gmail email you want to fetch.
Where to find it: First run a Gmail List or Search operation — the output will include a messageId field for each email. Copy that value.
Example: 18abc123def456
Tip: Use {{$json.messageId}} to pass it automatically from the previous List or Search step.`,
    },
    list: {
      query: `What this field is: A search filter to find specific emails — works exactly like typing in the Gmail search bar.
How to fill it: Use Gmail search operators.
Examples:
  from:boss@company.com  →  emails from a specific person
  subject:invoice        →  emails with "invoice" in the subject
  is:unread              →  only unread emails
  after:2025/01/01       →  emails since January 1, 2025
  has:attachment         →  emails with attachments
Leave blank to return all recent emails.`,
      maxResults: `What this field is: The maximum number of emails to return.
Example: 10 returns the 10 most recent matching emails. 50 returns up to 50.
Leave blank for the default (up to 100 emails).`,
    },
    search: {
      query: `What this field is: A search filter to find specific emails.
How to fill it: Use Gmail search syntax.
Examples: from:billing@stripe.com or subject:"payment failed" or is:unread after:2025/01/01`,
      maxResults: `What this field is: The maximum number of emails to return.
Example: 10 for the first 10 results. Leave blank for up to 100.`,
    },
  },

  outlook: {
    send_email: {
      to: `What this field is: Who receives this Outlook email.
How to fill it: One email address, or multiple addresses separated by commas.
Example: client@company.com
Multiple: alice@example.com, bob@example.com
Tip: Use {{$json.email}} to pull a recipient from an earlier step.`,
      subject: `What this field is: The email subject line.
Example: Invoice #{{$json.invoiceNumber}} from Acme Corp`,
      body: `What this field is: The plain-text email body sent through Microsoft Graph.
Example: Dear {{$json.name}}, please find your invoice attached. Total due: \${{$json.amount}}.`,
    },
  },

  slack_message: {
    '*': {
      channel: `What this field is: The Slack channel where the message will be posted.
How to fill it: Use the channel name with # like #general, or the channel ID like C01234567.
Where to find the channel ID: Right-click the channel name in Slack → View channel details → scroll to the bottom — the ID is shown there. It is safer to use the ID in case the channel is renamed.
Example: #notifications or C01234567`,
      text: `What this field is: The message text that will appear in the Slack channel.
Example: New lead from {{$json.name}} ({{$json.email}}) — signed up at {{$json.createdAt}}.
Formatting tips: *bold text*, _italic text_, \`code\`, and line breaks work in Slack messages.`,
    },
  },

  telegram: {
    default: {
      chatId: `What this field is: The ID of the Telegram chat, group, or channel to send the message to.
Where to find it:
  Personal chat: Open Telegram Web (web.telegram.org), click the conversation — the number in the browser URL is the chat ID.
  Group or channel: Add your bot to the group, send a message, then open this URL in your browser: https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates — look for "chat":{"id": in the response.
  Quick way: Message @userinfobot in Telegram — it replies with your user ID.
Format: A plain number, positive for personal chats (e.g. 987654321), negative for groups (e.g. -100123456789).
Example: 987654321 (personal) or -100123456789 (group)`,
      text: `What this field is: The message your Telegram bot will send.
Example: Hello {{$json.name}}, your appointment is confirmed for {{$json.date}} at {{$json.time}}.
Tip: Use {{$json.field}} to include data from an earlier workflow step. Telegram supports basic Markdown formatting.`,
    },
    '*': {
      botToken: `What this field is: The secret token that identifies your Telegram bot.
Where to get it: Open Telegram, search for @BotFather, and start a chat. Type /newbot, follow the steps (give it a name and a username ending in "bot"). BotFather will send you the token — it looks like 123456789:ABCdef-GHIjkl.
Keep it private — anyone with this token can control your bot.`,
    },
  },

  linkedin: {
    create_post: {
      text: `What this field is: The text body of your LinkedIn post — what your connections will read in their feed.
How to fill it: Write your post content. Keep it under 3,000 characters for best results. Add line breaks for readability.
Example: Excited to share our latest product update! We've added 3 new automation features based on your feedback. Check it out at example.com #automation #productivity
Tip: Use {{$json.postContent}} to generate the text dynamically from an earlier step like an AI node.`,
      visibility: `What this field is: Who can see your post on LinkedIn.
Options:
  PUBLIC — visible to everyone on LinkedIn (recommended for announcements)
  CONNECTIONS — only your direct connections can see it
Example: PUBLIC`,
      personUrn: `What this field is: Your LinkedIn member ID — a code that identifies your personal LinkedIn account.
Where to find it: Go to your LinkedIn profile page in a browser. Look at the URL in the address bar — it ends with something like /in/alice-kumar-ab123456. The characters at the very end after the last dash (e.g. ab123456) are your member ID.
Format: Enter just the ID part — no URL, no full URN prefix.
Example: If your profile URL is linkedin.com/in/alice-kumar-ab123456, enter: ab123456`,
    },
    create_post_media: {
      text: `What this field is: The caption or text that appears with your media post.
Example: Check out our new product demo video! {{$json.postText}}`,
      mediaUrl: `What this field is: The public URL of the image or video to attach to the post.
Important: The file must be publicly accessible on the internet — not a local file.
How to get a public URL: Upload to AWS S3, Google Drive (set to public), Cloudinary, or any hosting service. Copy the direct file URL.
Example: https://storage.googleapis.com/mybucket/demo-video.mp4`,
    },
    '*': {
      personUrn: `What this field is: Your LinkedIn member ID.
Where to find it: Open your LinkedIn profile in a browser. The URL ends with /in/your-name-XXXXXX — the last part (e.g. ab123456) is your member ID.
Example: ab123456`,
    },
  },

  twitter: {
    create: {
      text: `What this field is: The tweet content — maximum 280 characters.
Example: Just shipped a new feature: automated workflow triggers! Try it at example.com #automation #nocode
Tip: Use {{$json.announcement}} to pull the text from an earlier step like an AI node.`,
    },
    '*': {
      apiKey: `What this field is: Your Twitter/X API Key — identifies your app.
Where to find it: developer.twitter.com → Projects & Apps → [Your App] → Keys and Tokens → API Key and Secret → copy the API Key.`,
      consumerKey: `What this field is: Your Twitter/X Consumer Key (same as API Key).
Where to find it: developer.twitter.com → your app → Keys and Tokens → API Key.`,
    },
  },

  instagram: {
    create: {
      imageUrl: `What this field is: The public web address (URL) of the image to post on Instagram.
Important: The image must be publicly accessible on the internet — not a file on your computer or a local path.
How to get a public URL:
  Option 1: Upload to AWS S3 → make the file public → copy the URL
  Option 2: Upload to Google Drive → right-click → Get link → Anyone with link → copy direct image URL
  Option 3: Upload to Cloudinary or Imgbb.com
Example: https://storage.googleapis.com/mybucket/product-photo.jpg`,
      caption: `What this field is: The text description that appears below the Instagram image.
Example: New product alert! 🎉 {{$json.productName}} is now available. Visit the link in our bio for details. #newproduct #launch`,
    },
    '*': {
      pageId: `What this field is: Your Facebook/Instagram Page ID (Instagram Business requires a connected Facebook Page).
Where to find it: Facebook Business Suite → Pages → select your page → About — the Page ID is shown at the bottom.
Example: 123456789012345`,
    },
  },

  whatsapp: {
    sendTemplate: {
      templateName: `What this field is: The name of a pre-written and pre-approved WhatsApp message template.
Important: You cannot send free-form messages to new contacts on WhatsApp — you must use an approved template.
Where to find your templates: Meta Business Suite (business.facebook.com) → WhatsApp → Message Templates. The "Template Name" column shows the exact name to enter here.
Example: order_confirmation or welcome_message or appointment_reminder`,
    },
    '*': {
      to: `What this field is: The WhatsApp phone number of the person you want to message.
Format: Must include country code with + sign. No spaces, no dashes, no brackets.
Examples:
  +14155552671   →  USA number
  +919876543210  →  India number
  +447911123456  →  UK number
  +61412345678   →  Australia number
How to format: + then country code then the number. For USA: +1 then the 10-digit number.
Tip: Use {{$json.phone}} if the number comes from an earlier step like a form or database.`,
      text: `What this field is: The message the recipient will receive on WhatsApp.
How to fill it: Type your message. Keep it clear and conversational.
Example: Hello {{$json.name}}, your delivery is arriving today between 2-4 PM. Track it here: {{$json.trackingUrl}}
Tip: Use {{$json.field}} to personalize the message with data from an earlier step.`,
      phoneNumberId: `What this field is: Your WhatsApp Business Phone Number ID — a long number Meta assigns to your business phone number.
Where to find it: Log in to Meta Business Suite (business.facebook.com) → WhatsApp → Settings → Phone Numbers. Copy the "Phone Number ID" shown there — it is a long number like 123456789012345. This is NOT your actual phone number — it is a Meta-assigned ID.
Example: 123456789012345`,
      resource: `What this field is: The type of WhatsApp action this node will perform.
How to choose: Pick the action that matches what you want to do — send a text message, send a template, or send media.
Example: Choose "send_text" to send a regular WhatsApp text message.`,
    },
  },

  whatsapp_cloud: {
    '*': {
      to: `What this field is: The recipient's WhatsApp phone number with country code.
Format: + country code + number, no spaces or dashes.
Examples: +14155552671 (USA), +919876543210 (India), +447911123456 (UK)
Tip: Use {{$json.phone}} from an earlier step.`,
      text: `What this field is: The message content the recipient will receive.
Example: Hi {{$json.name}}, your order #{{$json.orderId}} has been confirmed and will ship in 2 days.`,
      phoneNumberId: `What this field is: Your WhatsApp Business Phone Number ID from Meta.
Where to find it: Meta Business Suite → WhatsApp → Settings → Phone Numbers → copy the Phone Number ID (a long number, NOT the actual phone number itself).
Example: 123456789012345`,
      resource: `What this field is: The type of WhatsApp message to send.
Options: send_text (regular text message), send_template (pre-approved template), send_media (image or document).
Example: send_text for a regular message.`,
    },
  },

  twilio: {
    default: {
      to: `What this field is: The phone number of the person who will receive the SMS.
Format: E.164 international format — + sign, then country code, then the number. No spaces, dashes, or brackets.
Examples:
  +14155552671  →  USA
  +919876543210 →  India
  +447911123456 →  UK
Tip: Use {{$json.phone}} if the number comes from a form or database in an earlier step.`,
      from: `What this field is: Your Twilio phone number — the number the SMS will be sent FROM.
Where to find it: Log in to console.twilio.com → Phone Numbers → Manage → Active Numbers. Copy one of your Twilio numbers.
Example: +15005550006
Note: This must be a number you own in Twilio — you cannot use a personal number here.`,
      body: `What this field is: The text message the recipient will receive.
Important: Standard SMS is limited to 160 characters. Messages over 160 characters are split and billed per part.
Example: Hi {{$json.name}}, your verification code is {{$json.code}}. It expires in 10 minutes. Do not share this code.
Tip: Use {{$json.field}} to personalize with data from an earlier step.`,
    },
    '*': {
      accountSid: `What this field is: Your Twilio Account SID — a unique identifier for your Twilio account.
Where to find it: Log in to console.twilio.com → the Dashboard shows Account SID right at the top. It starts with AC.
Example: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Note: The Account SID is not secret — it is safe to store in config. But the Auth Token is secret.`,
      authToken: `What this field is: Your Twilio Auth Token — the password for your Twilio account.
Where to find it: console.twilio.com → Dashboard → click "Show" next to Auth Token.
Keep this private — do not share it or commit it to code.
Example: your32characterauthtokenhere1234`,
    },
  },

  mailgun: {
    send_email: {
      from: `What this field is: The email address that will appear as the sender.
Important: Must use your verified Mailgun domain.
Example: noreply@mg.yourcompany.com or support@mg.yourcompany.com`,
      to: `What this field is: The recipient's email address.
Example: customer@example.com
Tip: Use {{$json.email}} from a form or database step.`,
      subject: `What this field is: The email subject line.
Example: Your account has been activated - welcome to {{$json.companyName}}!`,
      text: `What this field is: The plain text email body.
Mailgun requires at least one of text, html, or template.
Tip: Use {{$json.message}} when the content comes from an earlier step.`,
      html: `What this field is: The HTML email body.
Mailgun requires at least one of text, html, or template.
Example: <p>Hello {{$json.name}}</p>`,
      cc: `What this field is: Optional CC recipient email addresses.
Use comma-separated values for multiple recipients.`,
      bcc: `What this field is: Optional BCC recipient email addresses.
Use comma-separated values for multiple recipients.`,
      replyTo: `What this field is: Optional Reply-To email address for replies.
Example: support@mg.yourcompany.com`,
      tags: `What this field is: Optional Mailgun tags for message tracking.
Use comma-separated values such as welcome,onboarding.`,
      template: `What this field is: Optional Mailgun stored template name.
If set, the template can provide the message content.`,
      templateVariables: `What this field is: JSON variables passed to a Mailgun stored template.
Example: {"name":"{{$json.name}}","resetUrl":"{{$json.resetUrl}}"}`,
    },
    '*': {
      apiKey: `What this field is: Your Mailgun API Key that gives CtrlChecks permission to send emails.
Where to find it: mailgun.com -> Settings -> API Keys -> Private API Key.
It starts with key- and is a long string of letters and numbers.
Keep it secret - do not share or publish it.`,
      domain: `What this field is: Your verified Mailgun sending domain saved in the Mailgun connection.
Where to find it: mailgun.com -> Sending -> Domains.
Example: mg.yourcompany.com`,
      region: `What this field is: The Mailgun API region saved in the Mailgun connection.
Use US for api.mailgun.net or EU for api.eu.mailgun.net.`,
    },
  },

  sendgrid: {
    send_email: {
      to: `What this field is: The recipient's email address.
Example: customer@example.com
Tip: Use {{$json.email}} from an earlier form or database step.`,
      from: `What this field is: The sender email address — must be verified in your SendGrid account.
Where to verify: SendGrid dashboard → Settings → Sender Authentication → verify a single sender or your domain.
Example: hello@yourcompany.com`,
      subject: `What this field is: The email subject line.
Example: Welcome to {{$json.productName}} — here's how to get started`,
      text: `What this field is: The plain text email body sent to recipients.
Example: Hi {{$json.name}}, thank you for signing up!`,
      html: `What this field is: Optional HTML email body. If provided, SendGrid receives both text/plain and text/html content when Text is also filled.
Example: <p>Hi {{$json.name}},</p><p>Thank you for signing up!</p>`,
    },
  },

  amazon_ses: {
    default: {
      to: `What this field is: The recipient's email address.
Example: customer@example.com
Note: In SES sandbox mode, you can only send to verified email addresses. Request production access to send to anyone.`,
      from: `What this field is: The sender address — must be verified in AWS SES.
Where to verify: AWS Console → SES → Verified identities → Verify a new email or domain.
Example: noreply@yourcompany.com`,
    },
  },

  discord: {
    default: {
      channelId: `What this field is: The unique ID of the Discord channel where the message will be posted.
Where to find it:
  Step 1: Open Discord → User Settings (gear icon at bottom left) → Advanced → turn on "Developer Mode".
  Step 2: Right-click the channel name → Copy ID.
The ID is a 17–19 digit number.
Example: 1234567890123456789`,
      message: `What this field is: The message text to post in the Discord channel.
Example: New order from {{$json.customerName}} - Total: \${{$json.amount}}. Order ID: {{$json.orderId}}.
Formatting: **bold**, *italic*, \`code\`, and standard Discord markdown all work.`,
    },
    '*': {
      botToken: `What this field is: Your Discord Bot Token — the secret that gives CtrlChecks permission to post as your bot.
Where to get it: discord.com/developers/applications → click your app → Bot → click "Reset Token" → copy the token.
Keep it absolutely secret — anyone with this token can control your bot.`,
    },
  },

  discord_webhook: {
    '*': {
      message: `What this field is: The message text to post in the Discord channel through the selected webhook connection.
Example: New order from {{$json.customerName}} - Total: \${{$json.amount}}. Order ID: {{$json.orderId}}.
Formatting: **bold**, *italic*, \`code\`, and standard Discord markdown all work.`,
    },
  },

  microsoft_teams: {
    '*': {
      webhookUrl: `What this field is: The Microsoft Teams incoming webhook URL for the channel that should receive the message.
Where to find it: In Teams, open the target channel integrations/connectors, create or select Incoming Webhook, then copy the URL.
Example: https://outlook.office.com/webhook/.../IncomingWebhook/...`,
      message: `What this field is: The text posted to the Teams channel through the webhook.
How to fill it: Type the message directly or map text from an earlier workflow step.
Example: Sprint {{$json.sprintName}} completed with {{$json.storiesCompleted}} stories delivered.`,
    },
  },

  zoom_video: {
    createMeeting: {
      topic: `What this field is: The meeting title — shown to all participants on the invite, in the Zoom app, and in calendar events.
Example: Weekly Team Sync — {{$json.teamName}} or Q1 Sales Review`,
      startTime: `What this field is: The date and time the meeting starts.
Format: ISO 8601 — YYYY-MM-DDTHH:MM:SSZ (the Z means UTC timezone).
Example: 2025-06-15T14:00:00Z means June 15, 2025 at 2:00 PM UTC (which is 10:00 AM Eastern US time).
Tip: Use {{$json.meetingTime}} from an earlier step if the time comes from a form or calendar.`,
      duration: `What this field is: How long the meeting runs, in minutes.
Example: 30 (30 minutes), 60 (1 hour), 90 (1.5 hours).`,
    },
  },

  email: {
    send: {
      host: `What this field is: The address of your email (SMTP) server.
Common values:
  Gmail:         smtp.gmail.com
  Outlook/M365:  smtp.office365.com
  Yahoo Mail:    smtp.mail.yahoo.com
  Mailgun:       smtp.mailgun.org
  SendGrid:      smtp.sendgrid.net
Ask your email provider or IT team if you are unsure.`,
      port: `What this field is: The port number your email server uses to accept connections.
Common values:
  587 — TLS encryption (recommended, most common)
  465 — SSL encryption
  25  — unencrypted (avoid if possible)
If unsure, try 587 first.`,
      user: `What this field is: Your email login username — usually your full email address.
Example: alice@company.com`,
      password: `What this field is: Your email account password or app-specific password.
Gmail note: If you use Gmail with 2-factor authentication, you need an App Password. Go to myaccount.google.com → Security → App passwords → generate one.
Keep this private — do not share or publish it.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // DATA & DATABASES
  // ─────────────────────────────────────────────────────────────

  google_sheets: {
    '*': {
      spreadsheetId: `What this field is: The unique file ID of your Google Sheet.
Where to find it: Open your Google Sheet in a browser. Look at the URL in the address bar:
  https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
Copy the long text between /d/ and /edit.
Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
Tip: The ID stays the same even if you rename the file.`,
      sheetName: `What this field is: The name of the tab (sheet) inside your spreadsheet.
Where to find it: Open the spreadsheet — look at the tabs at the bottom. Click the one you want and copy its name exactly.
Example: Sheet1 or Customers or January 2025
Note: The name is case-sensitive. "sheet1" and "Sheet1" are treated as different tabs.`,
      range: `What this field is: The exact cells to read or write — written in A1 notation.
Format: TabName!StartColumn+StartRow:EndColumn+EndRow
Examples:
  Sheet1!A1:D100  →  columns A to D, rows 1 to 100 on the Sheet1 tab
  Customers!B2:E  →  column B to E, all rows starting from row 2 in the Customers tab
  Sheet1!A:D      →  all rows in columns A through D
Tip: Use just A1:D1000 if you only have one sheet tab.`,
    },
    write: {
      data: `What this field is: The rows of data to write into the spreadsheet.
Format: An array of arrays — each inner array is one row, each item is one cell value.
Example (2 rows):
[
  ["Alice", "alice@example.com", "2025-01-15"],
  ["Bob", "bob@example.com", "2025-01-16"]
]
Tip: Use {{$json.rows}} to write data output from an earlier step like a database query.`,
    },
    append: {
      values: `What this field is: One or more rows to add at the bottom of the sheet.
Format: Array of arrays.
Example: [["Charlie","charlie@example.com","2025-01-17"]]`,
    },
  },

  postgresql: {
    query: {
      query: `What this field is: The SQL query to run against your database.
Example: SELECT * FROM customers WHERE status = 'active' AND created_at > '2025-01-01'
Use $1, $2 for variable values (safer): SELECT * FROM orders WHERE user_id = $1 AND status = $2
Then put the actual values in the "Parameters" field below.
Warning: Never put passwords or user-entered values directly in the query text — always use parameters.`,
      parameters: `What this field is: The values for $1, $2 etc. placeholders in your SQL query.
Format: JSON array — one value per placeholder in order.
Example: ["active","2025-01-01"] for a query with WHERE status = $1 AND date > $2
Why use it: Prevents SQL injection attacks — much safer than building the query string yourself.`,
    },
    insert: {
      table: `What this field is: The name of the database table to insert a new record into.
Example: customers or orders or public.user_events (use schema.table if not in the default schema)`,
      data: `What this field is: The new record as a JSON object. Keys must exactly match your database column names.
Example: {"name":"Alice Kumar","email":"alice@example.com","status":"active","plan":"pro"}
Tip: Use {{$json}} or {{$json.formData}} to pass data from an earlier node.`,
    },
    update: {
      table: `What this field is: The database table where you want to update records.
Example: customers`,
      data: `What this field is: The new values to set, as a JSON object.
Example: {"status":"premium","updated_at":"2025-01-15"}`,
      where: `What this field is: The condition that identifies which rows to update.
Example: {"id": 42} updates the single row where id = 42.
Example: {"email": "alice@example.com"} updates the row with that email.
Warning: Without a specific where condition, ALL rows in the table could be updated.`,
    },
    delete: {
      table: `What this field is: The database table to delete from.
Example: old_sessions`,
      where: `What this field is: The condition that identifies which rows to delete.
Example: {"id": 42} deletes only the row where id = 42.
Warning: Without a specific where condition, ALL rows in the table could be deleted.`,
    },
  },

  mysql: {
    query: {
      query: `What this field is: The SQL query to run.
Example: SELECT * FROM customers WHERE status = 'active'
Use ? for variable values: SELECT * FROM orders WHERE user_id = ? AND status = ?
Then put values in the Parameters field.`,
      parameters: `What this field is: Values for ? placeholders in your SQL query. Format: JSON array.
Example: [42,"active"]`,
    },
    insert: {
      table: `What this field is: The MySQL table name to insert into.
Example: users or orders`,
      data: `What this field is: The new record as a JSON object. Keys must match column names.
Example: {"name":"Alice","email":"alice@example.com","created_at":"2025-01-15"}`,
    },
  },

  mongodb: {
    '*': {
      collection: `What this field is: The MongoDB collection to work with — like a table in a regular database.
Example: users or orders or products or event_logs
Tip: Collection names are case-sensitive.`,
    },
    find: {
      filter: `What this field is: The search filter to find specific documents.
Format: MongoDB query JSON.
Examples:
  {} — return all documents (careful with large collections)
  {"status":"active"} — find all active records
  {"age":{"$gte":18}} — find records where age is 18 or older
  {"email":"alice@example.com"} — find a specific person
  {"country":"US","plan":"pro"} — find US pro users (AND condition)`,
    },
    insertOne: {
      document: `What this field is: The document (record) to add to the collection.
Format: JSON object — include any fields you want to store.
Example: {"name":"Alice Kumar","email":"alice@example.com","role":"customer","createdAt":"2025-01-15","plan":"free"}`,
    },
    updateOne: {
      filter: `What this field is: The condition to find the document to update.
Example: {"_id":"64abc123"} or {"email":"alice@example.com"}`,
      update: `What this field is: The changes to apply to the matched document.
Example: {"$set":{"plan":"pro","updatedAt":"2025-01-15"}} — updates the plan and updatedAt fields.`,
    },
  },

  redis: {
    set: {
      key: `What this field is: The name you are giving to this stored value — like a label on a jar.
Naming tip: Use colons to organize keys by category.
Examples:
  user:1234:session       →  session data for user 1234
  cart:abc123:items       →  shopping cart items
  rate_limit:192.168.1.1  →  rate limit counter for an IP
Example: user:{{$json.userId}}:lastLogin`,
      value: `What this field is: The data to store in Redis.
Can be: plain text (active), a number (42), or JSON ({"cartItems":3,"total":99.99}).
Example: {"theme":"dark","language":"en","notifications":true}
Tip: Use {{$json.userPreferences}} to store data from an earlier step.`,
      ttl: `What this field is: How many seconds until this value is automatically deleted.
Examples:
  300   →  5 minutes
  3600  →  1 hour
  86400 →  24 hours
Leave blank to keep the value forever (until manually deleted or the server restarts).`,
    },
    get: {
      key: `What this field is: The exact name of the stored value to retrieve.
Must match the key used when the value was stored — exactly, including capitalization.
Example: user:1234:session
Tip: Use user:{{$json.userId}}:session to look up the key for the current user.`,
    },
  },

  aws_s3: {
    upload: {
      bucket: `What this field is: The name of your AWS S3 storage bucket — like a top-level folder in the cloud.
Where to find it: Log in to AWS Console (aws.amazon.com) → S3 → Buckets. Copy the bucket name.
Example: my-company-uploads or acme-customer-files-prod
Note: Bucket names are globally unique and contain only lowercase letters, numbers, and hyphens.`,
      key: `What this field is: The file path and name within the bucket — like a folder path + filename.
Example: uploads/2025/01/profile-photo.jpg or reports/monthly/january-2025.pdf
Tip: Use {{$json.fileName}} or {{$json.userId}} to build the path dynamically.
Example: user-uploads/{{$json.userId}}/{{$json.fileName}}`,
      body: `What this field is: The file content to upload.
For text/JSON: just the text or JSON string.
For binary files (images, PDFs): connect a Read Binary File node before this one and use {{$json.data}}.`,
    },
    get: {
      bucket: `What this field is: The S3 bucket where the file is stored.
Example: my-company-uploads`,
      key: `What this field is: The exact path and filename of the file to download.
Must exactly match the key used when uploading.
Example: reports/2025-01/summary.pdf`,
    },
  },

  airtable: {
    '*': {
      baseId: `What this field is: The unique ID of your Airtable Base (your Airtable workspace/database).
Where to find it: Open your base in Airtable → click the Help (?) menu → API documentation. The Base ID is shown at the top of the page and in the URL. It always starts with "app".
Example: appXXXXXXXXXXXXXX`,
      tableId: `What this field is: The name or ID of the specific table within your Airtable base.
How to find it: Open your base — the tab names at the top are your table names.
Example: Contacts or Orders or Products
Note: You can use the display name (e.g. Contacts) or the table ID (tblXXXXXX).`,
    },
    list: {
      filterByFormula: `What this field is: An Airtable formula to filter which records are returned — like a search condition.
Examples:
  {Status}="Active"                        →  only active records
  AND({Country}="US",{Revenue}>1000)       →  US records with revenue over 1000
  NOT({Email}="")                          →  records that have an email address
Leave blank to return all records.`,
    },
    create: {
      fields: `What this field is: The data for the new record, as a JSON object.
Keys must exactly match your Airtable column names.
Example: {"Name":"Alice Kumar","Email":"alice@example.com","Status":"New Lead","Company":"Acme Corp","Phone":"+14155552671"}`,
    },
    update: {
      fields: `What this field is: The fields to update on the existing record.
Example: {"Status":"Qualified","Notes":"Followed up on 2025-01-15"}`,
      recordId: `What this field is: The unique ID of the Airtable record to update.
Format: Starts with "rec" followed by letters and numbers. Example: recABCDEFGHIJ1234
Where to find it: Run an Airtable List or Get operation first — each record in the output has an "id" field.
Tip: Use {{$json.id}} from the previous step.`,
    },
  },

  notion: {
    '*': {
      databaseId: `What this field is: The unique ID of your Notion database.
Where to find it: Open the database in Notion → click Share at the top → Copy link. The ID is the 32-character string in the URL before the ?.
Example URL: notion.so/myworkspace/1234abcd5678ef90abcd1234ef567890?v=...
The ID is: 1234abcd5678ef90abcd1234ef567890`,
    },
    create: {
      properties: `What this field is: The values for each property (column) in your Notion database.
Format: JSON object — Notion uses a specific format per property type.
Title property example: {"Name":{"title":[{"text":{"content":"Meeting Notes"}}]}}
Select property: {"Status":{"select":{"name":"In Progress"}}}
Date property: {"Due Date":{"date":{"start":"2025-01-15"}}}
Number property: {"Revenue":{"number":50000}}
Full example: {"Name":{"title":[{"text":{"content":"New Task"}}]},"Status":{"select":{"name":"Todo"}},"Due Date":{"date":{"start":"2025-06-01"}}}`,
    },
  },

  firebase: {
    '*': {
      collection: `What this field is: The Firestore collection name — like a folder of related documents.
Example: users or orders or messages or products`,
      documentId: `What this field is: The unique ID of a specific document in the collection.
Where to find it: Firebase Console → Firestore Database → click your collection → click a document — the ID is shown at the top.
Example: abc123xyz or user_12345 or order_2025_001`,
    },
    get: {
      documentId: `What this field is: The ID of the Firestore document to fetch.
Example: user_12345
Tip: Use {{$json.userId}} from an earlier step.`,
    },
    create: {
      data: `What this field is: The data to store in the new Firestore document.
Format: JSON object.
Example: {"name":"Alice Kumar","email":"alice@example.com","plan":"pro","createdAt":"2025-01-15"}`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // CRM & BUSINESS
  // ─────────────────────────────────────────────────────────────

  hubspot: {
    '*': {
      resource: `What this field is: The type of HubSpot record to work with.
Options:
  contact  →  for people (customers, leads, contacts)
  company  →  for businesses and organizations
  deal     →  for sales opportunities and pipeline stages
  ticket   →  for support cases
Example: Choose "contact" to create or update a person in HubSpot.`,
      objectId: `What this field is: The HubSpot record ID — a unique number for each record.
Where to find it: Open the record in HubSpot — the ID is in the browser URL after /contact/ or /deal/ or /company/.
Example: app.hubspot.com/contacts/[portalId]/contact/12345678 → ID is 12345678
Tip: Use {{$json.hs_object_id}} from a previous HubSpot search step.`,
    },
    create: {
      properties: `What this field is: The record data to create in HubSpot. Use HubSpot internal property names (NOT the display labels you see in the UI).
Where to find internal names: HubSpot → Settings (gear icon) → Properties → select the object type → click any property → see "Internal name".
Contact example: {"email":"alice@example.com","firstname":"Alice","lastname":"Kumar","phone":"+14155552671","company":"Acme Corp","jobtitle":"Marketing Manager","lifecyclestage":"lead"}
Deal example: {"dealname":"Enterprise License - Acme Corp","amount":"50000","pipeline":"default","dealstage":"appointmentscheduled","closedate":"2025-06-30"}
Company example: {"name":"Acme Corp","domain":"acmecorp.com","industry":"COMPUTER_SOFTWARE","city":"San Francisco","country":"United States"}
Common contact fields: email, firstname, lastname, phone, company, jobtitle, website, lifecyclestage
Common deal stages: appointmentscheduled, qualifiedtobuy, presentationscheduled, contractsent, closedwon, closedlost`,
    },
  },

  salesforce: {
    '*': {
      objectType: `What this field is: The type of Salesforce record to create or update.
Standard object types: Contact, Lead, Account, Opportunity, Case, Task, Event, Campaign.
Custom objects end with __c. Example: Support_Ticket__c or Product_Review__c.
Example: Contact`,
      recordId: `What this field is: The Salesforce record ID — a 15 or 18 character identifier.
Where to find it: Open the record in Salesforce — the ID is in the browser URL after the object type.
Example: 0035g00000ABCDEFAA
Tip: Use {{$json.Id}} from a previous Salesforce query step.`,
    },
    create: {
      data: `What this field is: The record data as a JSON object. Use Salesforce API field names (not the UI labels).
Contact example: {"FirstName":"Alice","LastName":"Kumar","Email":"alice@example.com","Phone":"+14155552671","Title":"Marketing Manager","AccountId":"0015g00000XXXXXX"}
Lead example: {"FirstName":"Bob","LastName":"Smith","Company":"Acme Corp","Email":"bob@acme.com","Status":"New","LeadSource":"Web"}
Opportunity example: {"Name":"Enterprise License","StageName":"Prospecting","CloseDate":"2025-06-30","Amount":50000,"AccountId":"0015g00000XXXXXX"}`,
    },
  },

  stripe: {
    charge: {
      amount: `What this field is: The payment amount in the SMALLEST unit of the currency.
For USD (cents): 2000 means $20.00 (multiply dollars by 100)
For EUR (cents): 1500 means €15.00
For JPY (no decimal): 2000 means ¥2000 (no multiplication needed)
For GBP (pence): 4999 means £49.99
Example: To charge $49.99 USD, enter 4999. To charge $100.00, enter 10000.`,
      currency: `What this field is: The 3-letter ISO currency code for the payment.
Must be lowercase.
Examples: usd (US Dollar), eur (Euro), gbp (British Pound), inr (Indian Rupee), cad (Canadian Dollar), aud (Australian Dollar), jpy (Japanese Yen), sgd (Singapore Dollar).
Must match a currency supported by your Stripe account.`,
    },
    createCustomer: {
      email: `What this field is: The customer's email address — Stripe uses this to identify customers and send receipts.
Example: alice@example.com
Tip: Use {{$json.email}} from a form submission or signup step.`,
      name: `What this field is: The customer's full name as it appears in your Stripe dashboard.
Example: Alice Kumar or Acme Corp (for business accounts)`,
    },
    '*': {
      customerId: `What this field is: The Stripe customer ID — starts with cus_.
Where to find it: Stripe Dashboard → Customers → click a customer — the ID is shown at the top.
Example: cus_XXXXXXXXXXXXXXXXXX
Tip: Use {{$json.customerId}} from a Create Customer step.`,
    },
  },

  shopify: {
    '*': {
      shopDomain: `What this field is: Your Shopify store's subdomain — just the part before .myshopify.com.
Example: If your store is at mystore.myshopify.com, enter: mystore
Do NOT include https:// or .myshopify.com — just the store name.`,
    },
    create: {
      lineItems: `What this field is: The list of products being ordered.
Format: JSON array. Each item needs a variant ID and a quantity.
Where to find variant IDs: Shopify Admin → Products → click a product → click a variant — the ID is in the URL (e.g. /variants/123456789).
Example: [{"variantId":"gid://shopify/ProductVariant/123456789","quantity":2},{"variantId":"gid://shopify/ProductVariant/987654321","quantity":1}]`,
    },
    get: {
      orderId: `What this field is: The Shopify order number.
Where to find it: Shopify Admin → Orders — the # column shows order IDs.
Example: 1234 or gid://shopify/Order/1234`,
    },
  },

  jira: {
    create_issue: {
      projectKey: `What this field is: Your Jira project's short code — 2 to 10 capital letters.
Where to find it: In Jira, go to your project — the key is shown in brackets next to the project name, or in the URL.
Example: If the project URL is jira.yourcompany.com/projects/PROJ/..., the key is PROJ.
Other examples: DEV, MOBILE, BACKEND, SUPPORT`,
      issueType: `What this field is: The type of Jira issue.
Common values: Bug, Story, Task, Epic, Sub-task.
Must exactly match the issue types configured in your Jira project (go to Project Settings → Issue Types to see the full list).
Example: Bug`,
      summary: `What this field is: The one-line title of the issue — shown in all Jira list views.
Keep it concise and descriptive.
Example: Login button not responding on Safari iOS 17 or Add CSV export to the Reports page`,
      description: `What this field is: Full details about the issue.
Example: Steps to reproduce: 1) Open Safari on iOS 17, 2) Go to login page, 3) Tap Login button — nothing happens. Expected: Should log in. Actual: No response.`,
      priority: `What this field is: The urgency level of the issue.
Common values: Highest, High, Medium, Low, Lowest.
Example: High`,
    },
    '*': {
      issueKey: `What this field is: The unique Jira issue identifier — project key + number.
Format: PROJECTKEY-NUMBER
Example: DEV-456 or PROJ-1234 or MOBILE-89
Where to find it: Open the issue in Jira — the key is shown at the top left of the issue page.`,
    },
  },

  zendesk: {
    create_ticket: {
      subject: `What this field is: The ticket title — one short sentence describing the problem.
Example: Login not working after password reset or Invoice #1234 shows wrong amount`,
      description: `What this field is: Full details of the support issue.
Example: User reports they cannot log in using the mobile app after resetting their password on 2025-01-10. Error shown: "Invalid credentials". Tested on iOS 17.2 with the latest app version (v4.2.1).`,
      priority: `What this field is: How urgent this ticket is.
Options: low (minor inconvenience), normal (standard issue, the default), high (significant customer impact), urgent (business-critical, possible outage).
Example: high`,
      requesterEmail: `What this field is: The email address of the person who submitted the support request.
Example: customer@company.com
Tip: Use {{$json.email}} from a form submission.`,
    },
  },

  freshdesk: {
    create: {
      email: `What this field is: The customer's email address — used to identify who submitted the ticket.
Example: customer@company.com
Tip: Use {{$json.email}} from a form submission node.`,
      subject: `What this field is: Short summary of the support issue.
Example: Cannot access dashboard after password reset`,
      description: `What this field is: Full description of the problem.
Example: I reset my password on Jan 15 and now I get "Invalid login" every time I try to sign in. I have tried 3 different browsers.`,
      priority: `What this field is: Issue urgency as a number.
Values: 1 = Low, 2 = Medium, 3 = High, 4 = Urgent.
Example: 3 for a high-priority issue.`,
      status: `What this field is: The starting status of the ticket.
Values: 2 = Open (most common for new tickets), 3 = Pending, 4 = Resolved, 5 = Closed.
Example: 2`,
    },
  },

  hubspot_crm: {
    '*': {
      properties: `What this field is: The record fields as a JSON object using HubSpot internal property names.
Example contact: {"email":"alice@example.com","firstname":"Alice","lastname":"Kumar"}
Example deal: {"dealname":"Q1 Renewal","amount":"10000","dealstage":"contractsent"}`,
    },
  },

  pipedrive: {
    '*': {
      dealId: `What this field is: The Pipedrive deal ID — a number shown in the deal URL.
Where to find it: Open the deal in Pipedrive — the number after /deal/ in the URL is the ID.
Example: If URL is app.pipedrive.com/deal/123, the ID is 123.`,
      personId: `What this field is: The Pipedrive contact/person ID.
Where to find it: Open the contact in Pipedrive — the ID is in the URL.`,
    },
    create_deal: {
      title: `What this field is: The deal name shown in your Pipedrive pipeline.
Example: Enterprise License - Acme Corp`,
      value: `What this field is: The deal monetary value.
Example: 25000 for $25,000.`,
      currency: `What this field is: 3-letter currency code.
Example: USD or EUR or GBP.`,
    },
  },

  zoho_crm: {
    create: {
      data: `What this field is: The record data as a JSON object using Zoho CRM field names.
Contact example: {"First_Name":"Alice","Last_Name":"Kumar","Email":"alice@example.com","Phone":"+14155552671","Lead_Source":"Web Site"}
Lead example: {"First_Name":"Bob","Last_Name":"Smith","Company":"Acme Corp","Email":"bob@acme.com","Lead_Status":"New"}`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // AI NODES
  // ─────────────────────────────────────────────────────────────

  openai_gpt: {
    '*': {
      model: `What this field is: Which OpenAI model version to use. Different models have different capabilities and costs.
Options:
  gpt-4o        →  best quality, understands text and images, recommended for complex tasks
  gpt-4o-mini   →  fast and affordable, good for most everyday tasks
  gpt-4-turbo   →  older powerful model
  gpt-3.5-turbo →  fastest and cheapest, less capable
Recommended: gpt-4o for complex tasks, gpt-4o-mini for simple or high-volume tasks.`,
      maxTokens: `What this field is: The maximum length of the AI's response.
1 token ≈ 4 characters ≈ 0.75 words.
Examples: 100 = very short answer, 500 = a paragraph, 1000 = about 750 words, 4000 = a long document.
Leave blank to let the model use its default maximum.`,
      temperature: `What this field is: How creative or varied the AI's responses are.
Scale: 0.0 to 2.0 (most models work best between 0 and 1).
  0.0 – 0.2: Very consistent and predictable — same question gives nearly the same answer every time. Use for data extraction, classification, factual Q&A.
  0.5 – 0.7: Balanced — good for summarization, rewriting, customer support.
  0.8 – 1.0: More creative and varied — use for brainstorming, creative writing, generating ideas.
Example: 0.3 for factual tasks, 0.8 for creative writing.`,
      prompt: `What this field is: The instruction or question you want the AI to respond to.
How to write a good prompt: Be specific. Describe the task, the format you want, and any constraints.
Example: Summarize the following customer feedback in exactly 3 bullet points, each under 20 words: {{$json.feedbackText}}
Tip: Use {{$json.text}} or {{$json.content}} to pass text from an earlier step to the AI.`,
    },
    chat: {
      systemPrompt: `What this field is: Background instructions that define how the AI should behave throughout the conversation — its "personality" and rules.
This is set once and applies to all messages in the conversation.
Example: You are a helpful customer support agent for Acme Corp. Always be polite and concise. If you cannot answer a question, say "Let me check and get back to you." Never share pricing unless the user asks directly.
Leave blank to use the default ChatGPT behavior.`,
    },
  },

  anthropic_claude: {
    '*': {
      prompt: `What this field is: The message or task you want Claude AI to work on.
How to write it: Be clear and specific. Tell Claude exactly what you need and in what format.
Example: Review this email draft and suggest 3 improvements for clarity and professional tone. Return your suggestions as a numbered list: {{$json.emailDraft}}
Tip: Use {{$json.content}} to send text from an earlier step (like a database record or form input) to Claude.`,
      model: `What this field is: Which Claude model to use.
Options:
  claude-opus-4-7    →  most powerful, best for complex analysis and reasoning
  claude-sonnet-4-6  →  balanced quality and speed — recommended for most tasks
  claude-haiku-4-5   →  fastest and most affordable — good for simple tasks or high volume
Recommended: claude-sonnet-4-6 for most use cases.`,
      maxTokens: `What this field is: Maximum length of Claude's response.
1000 tokens ≈ 750 words.
Examples: 500 = short summary, 1000 = medium analysis, 4000 = detailed document.`,
    },
  },

  google_gemini: {
    '*': {
      prompt: `What this field is: The instruction or question for Google Gemini AI.
Example: Extract all names, email addresses, and phone numbers from the following text and return them as a JSON array: {{$json.rawText}}`,
      model: `What this field is: Which Gemini model to use.
Options:
  gemini-3.5-flash  →  fast and affordable, good for most tasks
  gemini-1.5-pro    →  more capable, better at complex reasoning
Recommended: gemini-3.5-flash for most tasks.`,
    },
  },

  ollama: {
    '*': {
      model: `What this field is: The name of the AI model running locally on your Ollama server.
Important: The model must already be downloaded. To download: open a terminal and run: ollama pull modelname
To see models you have installed: run ollama list in your terminal.
Popular models: llama3 (general use), mistral (fast, efficient), phi3 (small and fast), gemma2 (Google's model), codellama (for code).
Example: llama3`,
      prompt: `What this field is: The instruction for your local AI model.
Example: Classify this customer review as positive, negative, or neutral. Reply with just one word: {{$json.review}}`,
      baseUrl: `What this field is: The address of your Ollama server.
Default: http://localhost:11434 (when Ollama runs on the same machine as CtrlChecks).
If Ollama runs on another server: http://[server-ip]:11434
Example: http://localhost:11434`,
    },
  },

  ai_agent: {
    '*': {
      systemPrompt: `What this field is: The agent's role, personality, and operating rules — its instructions for every task.
How to write it: Describe what the agent IS and what rules it follows.
Example: You are a data analyst. When given data, identify the top 3 trends, any outliers, and give 2 actionable recommendations. Always cite specific numbers from the data. Reply in bullet points. Keep your response under 300 words.`,
      userMessage: `What this field is: The specific task or question for the agent to work on in this workflow step.
Example: Analyze this week's sales data and identify the top 3 products by revenue: {{$json.salesData}}
Tip: Use {{$json.query}} or {{$json.userInput}} to pass dynamic tasks from earlier steps.`,
    },
  },

  text_summarizer: {
    '*': {
      text: `What this field is: The text you want to summarize.
Example: {{$json.articleContent}} or {{$json.emailBody}}
Tip: Connect this after a database read, HTTP request, or Gmail node — then use {{$json.body}} or the relevant field to pass the text.`,
      maxLength: `What this field is: The maximum length of the summary in words or characters.
Example: 100 (for a short 100-word summary) or 3 (for a 3-sentence summary).`,
    },
  },

  sentiment_analyzer: {
    '*': {
      text: `What this field is: The text to analyze for sentiment (positive, negative, or neutral feeling).
Example: {{$json.customerReview}} or {{$json.feedbackMessage}}
Use case: Analyze customer reviews, support tickets, or social media comments.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // LOGIC & FLOW CONTROL
  // ─────────────────────────────────────────────────────────────

  if_else: {
    default: {
      conditions: `What this field is: The rule that decides which path (TRUE or FALSE) the workflow takes after this step.
Format: JSON array of condition objects. Each condition has:
  field    →  the value to check (use {{$json.fieldName}} to check a value from the previous step)
  operator →  how to compare (equals, not_equals, greater_than, less_than, contains, not_contains, is_empty)
  value    →  what to compare against
Example (single condition): [{"field":"{{$json.orderTotal}}","operator":"greater_than","value":100}]
This means: if the order total is greater than 100, go down the TRUE path. Otherwise go down the FALSE path.
Example (multiple): [{"field":"{{$json.country}}","operator":"equals","value":"US"},{"field":"{{$json.plan}}","operator":"equals","value":"pro"}]
Use the "Combine Operation" field to set AND (all must match) or OR (any one match is enough).`,
      combineOperation: `What this field is: How to combine multiple conditions (when you have more than one condition in the list).
AND = ALL conditions must be true for the workflow to take the TRUE path.
OR  = ANY one condition being true sends the workflow down the TRUE path.
Example: AND — use when you need the order to be BOTH over $100 AND from a US customer.`,
    },
  },

  switch: {
    default: {
      value: `What this field is: The value the workflow checks for matching — used to decide which branch to take.
Example: {{$json.status}} — the workflow looks at the "status" value from the previous step and routes to the matching branch.
Other examples: {{$json.country}}, {{$json.plan}}, {{$json.category}}`,
      cases: `What this field is: The list of branches — each with a value to match and a label.
Format: JSON array of case objects with value and label.
Example: [{"value":"approved","label":"Approved"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending Review"}]
The workflow takes the branch whose value matches the input. If no branch matches, it takes the "default" path.`,
    },
  },

  delay: {
    default: {
      duration: `What this field is: How long to pause the workflow before the next step runs.
How to fill it: Type a number, then set the unit below.
Examples: 30 seconds → pauses briefly. 5 minutes → good for rate limiting. 24 hours → wait until next day.
Use case: Pause before sending a follow-up email, wait for a process to finish, or space out API calls.`,
      unit: `What this field is: The time unit for the delay.
Options: ms (milliseconds), s (seconds), m (minutes), h (hours).
Example: s for seconds. So duration=30, unit=s means pause for 30 seconds.`,
    },
  },

  wait: {
    default: {
      duration: `What this field is: How long to pause the workflow.
Example: 60 seconds = 1 minute pause before continuing.`,
    },
  },

  filter: {
    default: {
      conditions: `What this field is: Items that match these conditions continue in the workflow — items that do NOT match are dropped and do not proceed.
Format: Same JSON array format as If/Else conditions.
Example: [{"field":"{{$json.country}}","operator":"equals","value":"US"}]
This keeps only US customers — all others are filtered out.
Use case: Send emails only to active users. Process only orders above $50. Alert only on errors, not warnings.`,
    },
  },

  loop: {
    default: {
      items: `What this field is: The list of items to process one at a time.
How to fill it: Usually {{$json.customers}} or {{$json.rows}} — the array output from a previous node.
Example: If a Google Sheets Read returned 50 customer rows, use {{$json.rows}} to process each customer one at a time (e.g. send one email per customer).
Tip: The nodes inside the loop run once for each item. Use {{$json.item}} to access the current item's data.`,
    },
  },

  try_catch: {
    default: {
      maxRetries: `What this field is: How many additional times to retry the nodes inside the Try block if they fail.
Example: 3 means it tries up to 4 times total (1 original + 3 retries).
Set to 0 to not retry — just catch the error and continue to the Catch path.
Use case: Retry a flaky API call up to 3 times before giving up.`,
    },
  },

  retry: {
    default: {
      maxRetries: `What this field is: The maximum number of retry attempts.
Example: 3 means try up to 3 additional times after the first failure (4 total attempts).`,
      retryDelay: `What this field is: How long to wait between retry attempts (in milliseconds).
Example: 1000 = wait 1 second between retries. 5000 = wait 5 seconds.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // DATA TRANSFORMATION
  // ─────────────────────────────────────────────────────────────

  javascript: {
    default: {
      code: `What this field is: JavaScript code that runs on the workflow data.
The input data is available as the items array. Each item has a .json property with its data.
You must return an array of objects.
Simple example (add a field):
  return items.map(item => ({ ...item.json, fullName: item.json.firstName + ' ' + item.json.lastName }));
Filter example (keep only active users):
  return items.filter(item => item.json.status === 'active');
Transform example (format a date):
  return items.map(item => ({ ...item.json, formattedDate: new Date(item.json.createdAt).toLocaleDateString() }));`,
    },
  },

  function: {
    default: {
      code: `What this field is: JavaScript code to process each item.
The current item is available as item.json.
Example (combine fields):
  return [{ json: { ...item.json, fullName: item.json.firstName + ' ' + item.json.lastName } }];`,
    },
  },

  date_time: {
    format: {
      value: `What this field is: The date/time value you want to format or convert.
Example: {{$json.createdAt}} to format a date from the previous step.
Or a fixed date: 2025-01-15T14:30:00Z`,
      outputFormat: `What this field is: How you want the date to look after formatting.
Uses date-fns format tokens. Common examples:
  yyyy-MM-dd         →  2025-01-15 (for databases)
  dd/MM/yyyy         →  15/01/2025 (European format)
  MM/dd/yyyy         →  01/15/2025 (US format)
  MMMM d, yyyy       →  January 15, 2025 (written out)
  MMM d 'at' h:mm a  →  Jan 15 at 2:30 PM
  HH:mm              →  14:30 (24-hour time only)`,
    },
    add: {
      amount: `What this field is: How much time to add to the date.
Example: 7 (then set unit to "days" to add 7 days to a date).`,
      unit: `What this field is: The time unit to add.
Options: seconds, minutes, hours, days, weeks, months, years.
Example: days`,
    },
    subtract: {
      amount: `What this field is: How much time to subtract from the date.
Example: 30 (then set unit to "days" to go back 30 days).`,
    },
  },

  text_formatter: {
    '*': {
      text: `What this field is: The text you want to transform.
Example: {{$json.name}} to transform the name from the previous step, or Hello World as a static value.`,
      operation: `What this field is: The text transformation to apply.
Common options:
  uppercase   →  "hello world" becomes "HELLO WORLD"
  lowercase   →  "HELLO WORLD" becomes "hello world"
  capitalize  →  "hello world" becomes "Hello World"
  trim        →  removes spaces from start and end of text
  replace     →  find a word or phrase and replace it with something else
  slice       →  extract part of the text (e.g. first 100 characters)`,
    },
  },

  json_parser: {
    parse: {
      text: `What this field is: A JSON string (text) that you want to convert into a usable object so you can access individual fields.
Example: {{$json.rawApiResponse}} where rawApiResponse is a string like {"name":"Alice","email":"alice@example.com"}
After parsing, you can access individual fields in the next step: {{$json.name}} and {{$json.email}}.`,
    },
    stringify: {
      data: `What this field is: A JavaScript object/value to convert into a JSON string.
Example: {{$json}} to convert the whole input into a JSON string.`,
    },
  },

  set_variable: {
    default: {
      name: `What this field is: The name you are giving to this variable so you can refer to it later.
Rules: Use letters and numbers only, no spaces. Recommended style: camelCase.
Examples: customerEmail, totalRevenue, isApproved, orderCount`,
      value: `What this field is: The value to store in this variable.
Can be: static text (alice@example.com), a number (42), or a dynamic expression from an earlier step.
Example: alice@example.com (static) or {{$json.email}} (uses the email from the previous step)`,
    },
  },

  set: {
    default: {
      assignments: `What this field is: A list of field name + value pairs to set on the output data.
Format: JSON object where keys are the new field names and values are the values to assign.
Example: {"fullName":"{{$json.firstName}} {{$json.lastName}}","greeting":"Hello, {{$json.firstName}}!"}`,
    },
  },

  math: {
    '*': {
      value1: `What this field is: The first number in the calculation.
Example: {{$json.price}} to use a price from the previous step, or 100 as a fixed number.`,
      value2: `What this field is: The second number in the calculation.
Example: {{$json.taxRate}} or 0.08 for 8% tax.`,
      operation: `What this field is: The math operation to perform.
Options: add (+), subtract (-), multiply (*), divide (/), modulo (remainder), power (x^y), round, floor, ceil, abs.
Example: multiply — to calculate price * quantity.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // UTILITY & HTTP
  // ─────────────────────────────────────────────────────────────

  http_request: {
    '*': {
      headers: `What this field is: Extra information sent with the request — most commonly used for authentication.
Format: JSON object where keys are header names and values are header values.
Common examples:
  Authentication: {"Authorization":"Bearer YOUR_API_TOKEN"}
  API key header: {"X-API-Key":"your-api-key-here"}
  Content type:   {"Content-Type":"application/json"}
  Combined:       {"Authorization":"Bearer abc123","Content-Type":"application/json","Accept":"application/json"}`,
      queryParams: `What this field is: Filter or option parameters added to the end of the URL — like search filters in a web address.
Format: JSON object.
Example: {"page":"1","limit":"20","status":"active"} becomes ?page=1&limit=20&status=active added to the URL.
Use case: Paginated API calls, filtering results, passing API keys in the URL.`,
    },
    get: {
      url: `What this field is: The full web address (URL) to send the GET request to.
Must start with https:// (or http:// for non-secure).
Example: https://api.github.com/users/octocat
Example with path variable: https://api.example.com/customers/{{$json.customerId}}
Tip: Use {{$json.apiUrl}} to build the URL dynamically from an earlier step.`,
    },
    post: {
      url: `What this field is: The API endpoint URL to send data to.
Example: https://api.example.com/v1/contacts or https://hooks.zapier.com/hooks/catch/12345/`,
      body: `What this field is: The data to send with the POST request — the request body.
Format: JSON object (most common for modern APIs).
Example: {"name":"Alice Kumar","email":"alice@example.com","source":"website","plan":"pro"}
Tip: Use {{$json}} to forward all data from the previous step directly to the API.`,
    },
    put: {
      url: `What this field is: The API endpoint URL to update data at.
Example: https://api.example.com/v1/contacts/{{$json.contactId}}`,
      body: `What this field is: The updated data to send.
Example: {"status":"active","plan":"pro","updatedAt":"2025-01-15"}`,
    },
    delete: {
      url: `What this field is: The URL of the resource to delete.
Example: https://api.example.com/v1/contacts/{{$json.contactId}}`,
    },
  },

  http_post: {
    '*': {
      url: `What this field is: The API endpoint URL to POST data to.
Example: https://api.example.com/webhook or https://api.example.com/v1/events`,
      body: `What this field is: The data to send in the request body.
Format: JSON object.
Example: {"event":"user_signup","userId":"{{$json.userId}}","email":"{{$json.email}}","timestamp":"{{$json.createdAt}}"}`,
    },
  },

  graphql: {
    query: {
      query: `What this field is: The GraphQL query to fetch data from the API.
Format: GraphQL query syntax.
Example: query { user(id: "123") { id name email role createdAt } }
Example with argument: query GetUser($id: ID!) { user(id: $id) { name email } }
Tip: Test your query in the GraphQL playground (usually at /graphql on the API) before using it here.`,
      variables: `What this field is: Variable values for your query — keeps queries reusable and safe.
Format: JSON object. Variable names match the $name placeholders in your query.
Example: {"id":"123","limit":10}`,
    },
    mutation: {
      query: `What this field is: The GraphQL mutation to create, update, or delete data.
Format: GraphQL mutation syntax.
Example: mutation { createContact(input: {name: "Alice", email: "alice@example.com"}) { id name email } }`,
      variables: `What this field is: Variable values for your mutation.
Example: {"name":"Alice Kumar","email":"alice@example.com"}`,
    },
  },

  cache_get: {
    '*': {
      key: `What this field is: The exact name of the cached value to retrieve.
Must match the key used when the value was stored.
Example: user:{{$json.userId}}:preferences
Tip: Use the same key pattern you used in the Cache Set node.`,
    },
  },

  cache_set: {
    '*': {
      key: `What this field is: The name to give this cached value — like a label.
Use descriptive names with colons as separators.
Example: user:{{$json.userId}}:lastLogin or session:{{$json.sessionId}} or rate_limit:{{$json.ip}}`,
      value: `What this field is: The data to cache (store temporarily for quick access later).
Example: {"theme":"dark","language":"en","timezone":"America/New_York"} or {{$json.userPreferences}}`,
      ttl: `What this field is: How many seconds until this cached value expires automatically.
Examples: 300 = 5 minutes, 3600 = 1 hour, 86400 = 24 hours.
Leave blank to cache forever (until manually deleted).`,
    },
  },

  respond_to_webhook: {
    default: {
      body: `What this field is: The data to send back as the webhook response — what the calling service receives.
Format: JSON object or a simple value.
Example: {"success":true,"message":"Order received","orderId":"{{$json.orderId}}"}`,
      statusCode: `What this field is: The HTTP status code to return.
Common values: 200 = OK (success), 201 = Created, 400 = Bad Request, 404 = Not Found, 500 = Server Error.
Example: 200`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL NODES
  // ─────────────────────────────────────────────────────────────

  github: {
    '*': {
      owner: `What this field is: The GitHub username or organization that owns the repository.
Example: alice (personal) or mycompany (organization)
Where to find it: It is the first part of your repository URL: github.com/OWNER/repo-name.`,
      repo: `What this field is: The repository name (just the name, not the full URL).
Example: my-project or backend-api
Where to find it: It is the second part of your repository URL: github.com/owner/REPO-NAME.`,
    },
    create_issue: {
      title: `What this field is: The issue title — shown in the issues list.
Example: Bug: Login page crashes on Safari iOS 17 or Feature: Add CSV export to Reports`,
      body: `What this field is: Detailed description of the issue or feature.
Example: Steps to reproduce: 1) Open Safari on iOS 17, 2) Navigate to /login, 3) Click the Login button — the page crashes. Expected: Should log in. Browser console shows: TypeError at line 42.`,
      labels: `What this field is: Labels to tag the issue for easier filtering.
Format: JSON array of label names.
Example: ["bug","high-priority"] or ["enhancement","frontend"]
Labels must already exist in the repository.`,
    },
    create_pr: {
      title: `What this field is: The pull request title.
Example: Fix: Resolve login page crash on Safari iOS 17`,
      head: `What this field is: The branch containing your changes.
Example: fix/safari-login-crash`,
      base: `What this field is: The branch to merge INTO — usually main or develop.
Example: main`,
    },
  },


  paypal: {
    charge: {
      amount: `What this field is: The payment amount as a decimal number (NOT in cents like Stripe).
Example: 20.00 for $20.00 or 149.99 for $149.99.`,
      currency: `What this field is: 3-letter currency code.
Examples: USD, EUR, GBP, CAD, AUD, INR, JPY.`,
    },
  },


  woocommerce: {
    '*': {
      orderId: `What this field is: The WooCommerce order number.
Where to find it: WooCommerce Admin → Orders — the # column shows order IDs.
Example: 1234`,
    },
  },

  wordpress: {
    create_post: {
      title: `What this field is: The blog post or page title.
Example: 10 Tips for Better Email Marketing`,
      content: `What this field is: The full body content of the post. Supports HTML.
Example: <p>Welcome to our guide.</p><h2>Why this matters</h2><p>{{$json.introText}}</p>`,
      status: `What this field is: Whether to publish or save as draft.
Options: publish (immediately live), draft (saved but not visible), private (only visible to admins).
Example: publish`,
    },
  },

  dropbox: {
    upload: {
      path: `What this field is: The destination file path within your Dropbox.
Example: /Reports/2025/January/report.pdf or /Uploads/{{$json.fileName}}`,
    },
  },

  onedrive: {
    upload: {
      path: `What this field is: The destination folder path in OneDrive.
Example: /Documents/Reports/2025`,
    },
  },

  ftp: {
    '*': {
      host: `What this field is: The FTP server address.
Example: ftp.yourcompany.com or 192.168.1.100`,
      port: `What this field is: The FTP server port. Default is 21 for FTP, 22 for SFTP.`,
      path: `What this field is: The file path on the FTP server.
Example: /public_html/uploads/report.pdf`,
    },
  },

  sftp: {
    '*': {
      host: `What this field is: The SFTP server hostname or IP address.
Example: sftp.yourcompany.com or 192.168.1.100`,
      path: `What this field is: The file path on the SFTP server.
Example: /home/user/uploads/report.pdf`,
    },
  },

  xero: {
    '*': {
      tenantId: `What this field is: Your Xero organisation (tenant) ID.
Where to find it: After connecting to Xero, the tenant ID is returned in the OAuth response. It is a UUID like 550e8400-e29b-41d4-a716-446655440000.`,
    },
    create_invoice: {
      contact: `What this field is: The customer this invoice is for.
Format: JSON object with a ContactID or Name.
Example: {"ContactID":"ABC123"} or {"Name":"Acme Corp"}`,
      lineItems: `What this field is: The products or services on the invoice.
Format: JSON array. Each item needs description, quantity, and unit amount.
Example: [{"Description":"Consulting services","Quantity":10,"UnitAmount":150.00}]`,
    },
  },

  chargebee: {
    create_subscription: {
      planId: `What this field is: The Chargebee plan/item price ID that the customer is subscribing to.
Where to find it: Chargebee Dashboard → Product Catalog → Plans or Items → copy the plan ID.
Example: pro-monthly or startup-annual`,
      customerId: `What this field is: The Chargebee customer ID to create the subscription for.
Example: AzZlHpMXd8IpUQ or use {{$json.chargebeeCustomerId}} from a previous step.`,
    },
  },

  typeform: {
    '*': {
      formId: `What this field is: The unique ID of your Typeform.
Where to find it: Open the form in Typeform → the ID is in the URL after /forms/.
Example: If URL is typeform.com/to/FORM_ID, enter FORM_ID.`,
    },
  },

  calendly: {
    '*': {
      eventTypeUri: `What this field is: The unique URI of the Calendly event type.
Where to find it: Calendly API response or the event type URL in your Calendly dashboard.
Example: https://api.calendly.com/event_types/ABCDEFGH`,
    },
  },

  contentful: {
    '*': {
      spaceId: `What this field is: Your Contentful space ID — identifies your content workspace.
Where to find it: Contentful Dashboard → Settings → General Settings → Space ID.
Example: abcd1234efgh`,
      accessToken: `What this field is: A Contentful CMA personal access token used for Content Management API calls.
Where to find it: Contentful -> Settings -> CMA tokens -> Create personal access token.
Important: After creating the token, click Authorize on the token row and grant access to the target organization/space.
Troubleshooting: OrganizationAccessGrantRequired means the token is valid but not authorized for that organization/space.
Example: CFPAT-...`,
      contentTypeId: `What this field is: The content type to work with.
Example: blogPost or product or author`,
    },
  },

  zendesk: {
    '*': {
      subdomain: `What this field is: Your Zendesk subdomain — the part before .zendesk.com in your URL.
Example: If your Zendesk is at acme.zendesk.com, enter acme.`,
    },
  },

  netlify: {
    deploy: {
      siteId: `What this field is: Your Netlify site ID.
Where to find it: Netlify Dashboard → your site → Site Settings → General → Site details → Site ID.
Example: 12345678-abcd-efgh-ijkl-123456789012`,
    },
  },

  vercel: {
    deploy: {
      projectId: `What this field is: Your Vercel project ID.
Where to find it: Vercel Dashboard → your project → Settings → General → Project ID.
Example: prj_xxxxxxxxxxxxxxxxxxxxxxxx`,
    },
  },

  pinecone: {
    '*': {
      indexName: `What this field is: The name of your Pinecone vector index.
Where to find it: Pinecone Console (app.pinecone.io) → Indexes → copy the index name.
Example: my-embeddings or product-search`,
      namespace: `What this field is: An optional namespace to organize vectors within an index.
Leave blank to use the default namespace. Example: production or test`,
    },
    upsert: {
      vectors: `What this field is: The vectors to store in Pinecone.
Format: JSON array. Each vector needs an id, values (the embedding array), and optional metadata.
Example: [{"id":"doc-123","values":[0.1,0.2,0.3,...],"metadata":{"source":"website","category":"FAQ"}}]`,
    },
    query: {
      vector: `What this field is: The query vector — an array of numbers representing your search query.
Example: [0.1,0.2,0.3,...] — usually generated by an AI embedding model from your search text.`,
      topK: `What this field is: How many similar results to return.
Example: 5 returns the 5 most similar vectors.`,
    },
  },

  google_bigquery: {
    query: {
      query: `What this field is: The BigQuery SQL query to run.
Example: SELECT customer_id, SUM(amount) as total FROM my_dataset.orders WHERE DATE(created_at) = CURRENT_DATE() GROUP BY customer_id ORDER BY total DESC LIMIT 100`,
      projectId: `What this field is: Your Google Cloud project ID.
Where to find it: Google Cloud Console → top left dropdown — your project ID is shown there.
Example: my-company-analytics-prod`,
    },
  },

  oracle_database: {
    query: {
      query: `What this field is: The Oracle SQL query to run.
Example: SELECT * FROM customers WHERE status = :1 AND created_date > :2
Use :1, :2 for bind variables (parameters).`,
      parameters: `What this field is: Values for :1, :2 bind variables in your Oracle query.
Format: JSON array.
Example: ["ACTIVE","2025-01-01"]`,
    },
  },

  sql_server: {
    query: {
      query: `What this field is: The T-SQL query to run against SQL Server.
Example: SELECT TOP 100 * FROM customers WHERE status = @status AND created_at > @date
Use @paramName for parameters.`,
      parameters: `What this field is: Values for @paramName placeholders.
Format: JSON object.
Example: {"status":"active","date":"2025-01-01"}`,
    },
  },

  timescaledb: {
    query: {
      query: `What this field is: A PostgreSQL/TimescaleDB query.
Example: SELECT time_bucket('1 hour', time) AS hour, avg(temperature) FROM sensor_data WHERE time > NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour`,
    },
  },

  odoo: {
    '*': {
      model: `What this field is: The Odoo model (object type) to work with.
Examples: res.partner (contacts), sale.order (sales), account.move (invoices), product.product (products), stock.picking (inventory).`,
    },
  },

  intercom: {
    create_contact: {
      email: `What this field is: The contact's email address.
Example: customer@example.com`,
      name: `What this field is: The contact's full name.
Example: Alice Kumar`,
    },
    create_message: {
      body: `What this field is: The message content to send to the contact.
Example: Hi {{$json.name}}, welcome to our platform! Let us know if you need any help getting started.`,
    },
  },

  mailchimp: {
    add_subscriber: {
      listId: `What this field is: Your Mailchimp audience (list) ID.
Where to find it: Mailchimp → Audience → All contacts → Settings → Audience name and defaults → Audience ID.
Example: a1b2c3d4e5`,
      email: `What this field is: The subscriber's email address.
Example: subscriber@example.com`,
    },
  },

  activecampaign: {
    create_contact: {
      email: `What this field is: The contact's email address.
Example: contact@example.com`,
      firstName: `What this field is: The contact's first name.
Example: Alice`,
      lastName: `What this field is: The contact's last name.
Example: Kumar`,
    },
  },

  read_binary_file: {
    default: {
      filePath: `What this field is: The full file path of the file to read.
Example: /uploads/reports/january.pdf or C:\\Users\\user\\Documents\\report.pdf
Tip: Use this before an AWS S3 Upload node or email attachment to load the file content.`,
    },
  },

  write_binary_file: {
    default: {
      filePath: `What this field is: Where to save the file, including the full path and filename.
Example: /output/reports/summary.pdf or /tmp/export-{{$json.date}}.csv`,
    },
  },

};
