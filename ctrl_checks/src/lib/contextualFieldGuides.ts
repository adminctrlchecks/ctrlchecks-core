import { getNodeOperationDocs, type OperationDocSummary } from './field-doc-resolver';
import {
  isGenericHelpText,
  normalizeHelpOptions,
  trimHelpText,
  type FieldHelpOption,
} from './field-help-utils';

export type FieldGuideInput = {
  nodeType: string;
  nodeLabel: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType?: string;
  fieldDescription?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  config?: Record<string, unknown>;
  fallbackHelpText?: string;
};

const RESOURCE_LABELS: Record<string, Record<string, string>> = {
  hubspot: {
    contact: 'contact',
    company: 'company',
    deal: 'deal',
    ticket: 'ticket',
    product: 'product',
    line_item: 'line item',
    quote: 'quote',
    owner: 'owner',
    pipeline: 'pipeline',
  },
  whatsapp: {
    message: 'message',
    contact: 'contact card',
    conversation: 'conversation',
    template: 'message template',
    campaign: 'campaign',
    aiAgent: 'AI agent',
  },
  whatsapp_cloud: {
    message: 'message',
    media: 'media file',
    template: 'message template',
  },
};

const HUBSPOT_PROPERTY_EXAMPLES: Record<string, string> = {
  contact: '{"email":"alice@example.com","firstname":"Alice","lastname":"Kumar","phone":"+919876543210"}',
  company: '{"name":"Acme Foods","domain":"acmefoods.com","city":"Bengaluru"}',
  deal: '{"dealname":"Website redesign","amount":"25000","pipeline":"default","dealstage":"appointmentscheduled"}',
  ticket: '{"subject":"Login not working","content":"Customer cannot sign in","hs_pipeline":"0","hs_pipeline_stage":"1"}',
  product: '{"name":"Premium Plan","price":"4999","description":"Annual subscription"}',
};

function titleCase(value: unknown): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function sentenceCase(value: string): string {
  const text = value.trim();
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function optionKey(value: unknown): string {
  return String(value || '').replace(/[_()[\]-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function ensurePeriod(value: string): string {
  const text = value.trim();
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function stripFinalPunctuation(value: string): string {
  return value.trim().replace(/[.!?]+$/g, '');
}

function toExamplePhrase(value: string): string {
  return value
    .replace(/^reads\b/i, 'read')
    .replace(/^publishes\b/i, 'publish')
    .replace(/^shares\b/i, 'share')
    .replace(/^removes\b/i, 'remove')
    .replace(/^creates\b/i, 'create')
    .replace(/^changes\b/i, 'change')
    .replace(/^finds\b/i, 'find')
    .replace(/^sends\b/i, 'send')
    .replace(/^uploads\b/i, 'upload')
    .replace(/^downloads\b/i, 'download')
    .replace(/^archives\b/i, 'archive')
    .replace(/^restores\b/i, 'restore')
    .replace(/^starts\b/i, 'start')
    .replace(/^adds\b/i, 'add')
    .replace(/^posts\b/i, 'post')
    .replace(/^uses\b/i, 'use');
}

function hasResourceField(input: FieldGuideInput): boolean {
  return Boolean(input.config?.resource || input.config?.object || input.config?.entity);
}

function findOptionByValue(options: FieldHelpOption[], value: string): FieldHelpOption | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  return options.find((option) => option.value.toLowerCase() === normalized) || null;
}

function isUsefulOperationDescription(description: string, nodeName: string): boolean {
  const text = description.trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  const service = nodeName.toLowerCase();
  if (lower.includes(`using the ${service} node`)) return false;
  if (/^.+\s+using\s+the\s+.+\s+node\.?$/i.test(text)) return false;
  if (/^.+\s+with\s+the\s+.+\s+node\s+using\s+the\s+configured\s+input\s+fields\.?$/i.test(text)) return false;
  return text.length > 18;
}

function operationDocDescription(
  option: FieldHelpOption,
  nodeName: string,
  operationDocs: OperationDocSummary[],
): string | null {
  const match = operationDocs.find((operation) =>
    optionKey(operation.value) === optionKey(option.value) ||
    optionKey(operation.name) === optionKey(option.label)
  );
  if (!match || !isUsefulOperationDescription(match.description, nodeName)) return null;
  return stripFinalPunctuation(sentenceCase(match.description.replace(/\s+/g, ' ')));
}

function describeOperationOption(
  option: FieldHelpOption,
  nodeName: string,
  operationDocs: OperationDocSummary[],
): string {
  const fromDoc = operationDocDescription(option, nodeName, operationDocs);
  if (fromDoc) return fromDoc;

  const text = optionKey(`${option.label} ${option.value}`);

  if (text.includes('profile')) return `reads profile details from ${nodeName}`;
  if (text.includes('my posts') || text.includes('posts')) {
    if (text.includes('get') || text.includes('list') || text.includes('read')) return `reads recent posts from ${nodeName}`;
  }
  if (text.includes('comment') && text.includes('add')) return `adds a comment in ${nodeName}`;
  if (text.includes('comment') && text.includes('reply')) return `posts a reply in ${nodeName}`;
  if (text.includes('search') || text.includes('find') || text.includes('query')) return `finds matching items in ${nodeName}`;
  if (text.includes('list') || text.includes('get many')) return `reads a list of items from ${nodeName}`;
  if (text.includes('get') || text.includes('read') || text.includes('retrieve') || text.includes('fetch')) return `reads existing information from ${nodeName}`;
  if (text.includes('delete') || text.includes('remove')) return `removes an existing item from ${nodeName}`;
  if (text.includes('archive')) return `archives an existing item in ${nodeName}`;
  if (text.includes('restore')) return `restores a previously archived item in ${nodeName}`;
  if (text.includes('update') || text.includes('edit') || text.includes('modify')) return `changes an existing item in ${nodeName}`;
  if (text.includes('send')) return `sends the selected content through ${nodeName}`;
  if (text.includes('upload')) return `uploads a file to ${nodeName}`;
  if (text.includes('download')) return `downloads a file from ${nodeName}`;
  if (text.includes('company') && text.includes('post')) return `publishes a post from a company page in ${nodeName}`;
  if (text.includes('article') || text.includes('link')) return `shares an article link in ${nodeName}`;
  if (text.includes('media') || text.includes('image') || text.includes('video')) return `publishes a post with media in ${nodeName}`;
  if (text.includes('post') && (text.includes('text') || text.includes('create') || text.includes('publish'))) return `publishes a text update to ${nodeName}`;
  if (text.includes('create') || text.includes('add')) return `creates a new item in ${nodeName}`;
  if (text.includes('trigger') || text.includes('run') || text.includes('execute')) return `starts the chosen process in ${nodeName}`;

  return `uses the ${option.label} choice in ${nodeName}`;
}

function describeResourceOption(option: FieldHelpOption, nodeName: string): string {
  const text = optionKey(`${option.label} ${option.value}`);
  if (text.includes('contact')) return 'people or customers in your CRM';
  if (text.includes('company') || text.includes('organization')) return 'organizations or accounts';
  if (text.includes('deal') || text.includes('opportunity')) return 'sales opportunities';
  if (text.includes('ticket')) return 'support requests';
  if (text.includes('product')) return 'products or services';
  if (text.includes('line item')) return 'items inside a quote, order, or deal';
  if (text.includes('quote')) return 'price quotes';
  if (text.includes('owner') || text.includes('user')) return 'service users or record owners';
  if (text.includes('pipeline')) return 'sales or support stages';
  if (text.includes('message')) return 'messages';
  if (text.includes('template')) return 'approved message templates';
  if (text.includes('media') || text.includes('file')) return 'files or media';
  if (text.includes('page')) return 'pages';
  if (text.includes('database')) return 'databases';
  return `${option.label.toLowerCase()} items in ${nodeName}`;
}

export function buildOperationHelpFromOptions(input: FieldGuideInput): string | null {
  const options = normalizeHelpOptions(input.options);
  if (!options.length) return null;

  const nodeName = input.nodeLabel || titleCase(input.nodeType);
  const operationDocs = getNodeOperationDocs(input.nodeType);
  const currentValue = currentOperation(input);
  const currentOption = findOptionByValue(options, currentValue);
  const exampleOption =
    currentOption ||
    options.find((option) => /create|post|send|publish/i.test(`${option.label} ${option.value}`)) ||
    options[0];
  const exampleDescription = toExamplePhrase(describeOperationOption(exampleOption, nodeName, operationDocs));
  const optionDescriptions = options.map((option) =>
    `${option.label} = ${describeOperationOption(option, nodeName, operationDocs)}`
  );
  const resourceValue = currentResource(input);
  const resourceName = resourceValue ? titleCase(resourceValue) : '';

  return [
    `What this field is: The ${nodeName} action this step will run.`,
    hasResourceField(input)
      ? `How to choose it: Pick the action that matches what you want ${nodeName} to do with the ${resourceName || 'item type'} you chose.`
      : `How to choose it: Pick the action that matches what you want ${nodeName} to do.`,
    `Options: ${optionDescriptions.join('; ')}.`,
    currentOption ? `Current selection: ${currentOption.label}.` : null,
    `Example: Choose ${exampleOption.label} to ${ensurePeriod(exampleDescription)}`,
    currentOption ? `Tip: Keep this choice aligned with the fields shown below it.` : null,
  ].filter(Boolean).join('\n');
}

export function buildResourceHelpFromOptions(input: FieldGuideInput): string | null {
  const options = normalizeHelpOptions(input.options);
  if (!options.length) return null;

  const nodeName = input.nodeLabel || titleCase(input.nodeType);
  const currentValue = currentResource(input);
  const currentOption = findOptionByValue(options, currentValue);
  const optionDescriptions = options.map((option) =>
    `${option.label} = ${describeResourceOption(option, nodeName)}`
  );

  return [
    `What this field is: Resource chooses the item type this ${nodeName} step works with.`,
    `How to choose it: Pick the kind of data you want this step to read, create, change, or remove.`,
    `Options: ${optionDescriptions.join('; ')}.`,
    currentOption ? `Current selection: ${currentOption.label}.` : 'Tip: Pick a resource first so the Operation field can show the right actions.',
    `Example: Choose Contact when this step should work with a person, or Deal when it should work with a sales opportunity.`,
  ].filter(Boolean).join('\n');
}

function currentResource(input: FieldGuideInput): string {
  return String(input.config?.resource || input.config?.object || input.config?.entity || '').trim();
}

function currentOperation(input: FieldGuideInput): string {
  return String(input.config?.operation || input.config?.action || input.config?.method || '').trim();
}

function dynamicExample(fieldKey: string): string {
  return `Dynamic example: {{$json.${fieldKey}}} uses the ${fieldKey} value from an earlier node.`;
}

function optionList(options?: Array<{ label: string; value: string }>): string | null {
  if (!options || options.length === 0) return null;
  return `Available choices: ${options.map((option) => `${option.label} (${option.value})`).join(', ')}.`;
}

export function buildContextualFieldHelp(input: FieldGuideInput): string | null {
  const nodeType = input.nodeType;
  const nodeName = input.nodeLabel || titleCase(nodeType);
  const key = input.fieldKey;
  const lower = key.toLowerCase();
  const resourceValue = currentResource(input);
  const operationValue = currentOperation(input);
  const fallbackHelpText = trimHelpText(input.fallbackHelpText);
  if (fallbackHelpText && !isGenericHelpText(fallbackHelpText, {
    fieldKey: input.fieldKey,
    fieldLabel: input.fieldLabel,
    fieldType: input.fieldType,
    options: input.options,
  })) {
    return fallbackHelpText;
  }

  const resourceName =
    RESOURCE_LABELS[nodeType]?.[resourceValue] ||
    (resourceValue ? titleCase(resourceValue).toLowerCase() : 'item type you chose');
  const operationName = operationValue ? titleCase(operationValue) : 'chosen action';
  const description = input.fieldDescription || input.fieldLabel;
  const options = optionList(input.options);

  if (lower === 'resource') {
    return buildResourceHelpFromOptions(input);
    return [
      `What this field is: Resource chooses the kind of ${nodeName} item this node works with.`,
      `How to choose it: Pick the object you want this step to work on, such as Contact, Company, Deal, Message, Template, or another option shown in the dropdown.`,
      options,
      `Current selection: ${resourceValue ? titleCase(resourceValue) : 'none selected yet'}.`,
      `Example: In ${nodeName}, pick the type of record you want to work with — each choice gives you different fields and operations.`,
    ].filter(Boolean).join('\n');
  }

  if (lower === 'operation') {
    return buildOperationHelpFromOptions(input);
    return [
      `What this field is: Operation chooses the exact action ${nodeName} will perform on the ${resourceName}.`,
      `How to choose it: Pick the action shown in the dropdown that matches your goal for ${resourceName}.`,
      options,
      `Current setup: ${nodeName} -> ${resourceValue ? titleCase(resourceValue) : 'choose a resource first'} -> ${operationName}.`,
      `Example: For ${nodeName}${resourceValue ? ' ' + titleCase(resourceValue) : ''} ${operationName}, CtrlChecks will ${operationName.toLowerCase()}${resourceValue ? ' for the chosen ' + resourceName : ''} and show the response.`,
      `Output: The service response usually includes an ID that later nodes can use.`,
    ].filter(Boolean).join('\n');
  }

  if (nodeType === 'hubspot' && lower === 'properties') {
    const example = HUBSPOT_PROPERTY_EXAMPLES[resourceValue] || HUBSPOT_PROPERTY_EXAMPLES.contact;
    return [
      `What this field is: Properties are the HubSpot fields CtrlChecks will send when it ${operationName.toLowerCase()}s a ${resourceName}.`,
      `Where to get property names: In HubSpot, open Settings -> Properties, choose the ${titleCase(resourceValue || 'contact')} object, then copy the internal property name such as email, firstname, lastname, amount, dealstage, or phone.`,
      `How to fill it: Add one property per row in the editor, or provide a JSON object where each key is the HubSpot internal property name.`,
      `Example for ${titleCase(resourceValue || 'contact')}: ${example}`,
      `Dynamic example: Set email to {{$json.email}} and firstname to {{$json.firstName}} when those values come from a form, sheet, or webhook.`,
      `Common mistake: Do not type the visible label if HubSpot uses a different internal name. Use HubSpot's internal property name.`,
      `Output: HubSpot returns the created or updated object with its HubSpot record ID.`,
    ].join('\n');
  }

  if ((nodeType === 'whatsapp' || nodeType === 'whatsapp_cloud') && (lower === 'to' || lower.includes('phone'))) {
    return [
      `What this field is: This identifies the WhatsApp recipient or the WhatsApp Business phone number used to send the message.`,
      `Where to find it: Recipient numbers come from your customer data. Phone Number ID comes from Meta Business Manager -> WhatsApp -> API Setup.`,
      `Format: Use country code and digits only for recipients, for example 919876543210 or +919876543210 depending on the node field. Do not add spaces or brackets.`,
      `Example: 919876543210`,
      dynamicExample(key),
      `Output: WhatsApp returns a message ID when the message/contact/template is accepted by the Cloud API.`,
    ].join('\n');
  }

  if ((nodeType === 'whatsapp' || nodeType === 'whatsapp_cloud') && lower === 'contacts') {
    return [
      `What this field is: Contacts is the contact card that will be sent inside WhatsApp.`,
      `How to fill it: Provide a JSON array of contact objects with name and phone details.`,
      `Example format: [{"name":{"formatted_name":"Alice Kumar","first_name":"Alice","last_name":"Kumar"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]`,
      `What the user sees: The recipient receives a WhatsApp contact card they can save to their phone.`,
      `Common mistake: This does not create a contact inside Meta automatically; it sends contact information to a WhatsApp chat.`,
    ].join('\n');
  }

  if (nodeType === 'whatsapp' && lower === 'text') {
    return [
      `What this field is: The text message sent through WhatsApp Cloud API.`,
      `For AI replies: use {{$json.aiResponse}} if your AI Agent writes that field, or map the exact output field from the AI node.`,
      `Tip: Free-form replies are allowed inside WhatsApp's customer service window. Outside that window, use an approved template.`,
      dynamicExample(key),
    ].join('\n');
  }

  // ── Telegram ──────────────────────────────────────────────────────────────────
  if (nodeType === 'telegram') {
    if (lower === 'chatid') {
      return [
        `What this field is: The ID of the Telegram chat, group, or channel where the bot will send the message.`,
        `Where to find it for a personal chat: Open web.telegram.org, click the conversation — the number in the browser URL is the chat ID.`,
        `Where to find it for a group or channel: Add your bot to the group, send a message, then open https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates in your browser and look for "chat":{"id": in the JSON response.`,
        `Quick method: Message @userinfobot in Telegram — it replies with your numeric user ID.`,
        `Format: Positive number for personal chats (e.g. 987654321). Negative number for groups/channels (e.g. -100123456789).`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'message' || lower === 'text') {
      return [
        `What this field is: The message text that will appear in the Telegram chat.`,
        `Formatting (HTML mode, recommended): Use <b>bold</b>, <i>italic</i>, <code>code</code>, <a href="https://example.com">link text</a>.`,
        `Formatting (Markdown mode): Use *bold*, _italic_, \`code\`, [link](url).`,
        `Example: 🚨 Alert: {{$json.serverName}} CPU is {{$json.cpuPercent}}%`,
        `Tip: Anything inside {{ }} is replaced with real data from an earlier node. Use {{$json.name}} for a "name" field.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'messagetype') {
      return [
        `What this field is: The type of Telegram message this node will send.`,
        `Options:`,
        `  text — plain or formatted text message (most common)`,
        `  photo — an image fetched from a public URL (set Media Url below)`,
        `  video — a video from a public URL`,
        `  document — a file from a public URL (PDF, ZIP, etc.)`,
        `  audio — an audio file from a public URL`,
        `  animation — a GIF from a public URL`,
        `Example: Leave as "text" for standard alerts or notifications. Switch to "photo" when you also set a Media Url.`,
      ].join('\n');
    }
    if (lower === 'parsemode') {
      return [
        `What this field is: Controls how Telegram interprets formatting tags in the message text.`,
        `HTML (recommended): <b>bold</b>  <i>italic</i>  <code>code</code>  <a href="url">link</a>`,
        `Markdown: *bold*  _italic_  \`code\`  [link](url)`,
        `MarkdownV2: Same as Markdown but special characters must be escaped with \\.`,
        `(empty/none): Plain text — no formatting applied.`,
        `Recommendation: Use HTML for the most predictable formatting across all Telegram clients.`,
      ].join('\n');
    }
    if (lower === 'mediaurl') {
      return [
        `What this field is: The public HTTPS URL of the photo, video, document, audio, or animation to send.`,
        `Requirements: The URL must be publicly reachable — Telegram fetches it directly, so localhost or private URLs will not work.`,
        `Example: https://cdn.yourapp.com/reports/{{$json.reportId}}.pdf`,
        `Only fill this when Message Type is set to photo, video, document, audio, or animation. Leave blank for text messages.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'replytomessageid') {
      return [
        `What this field is: The Telegram message ID of an existing message you want this new message to reply to (creates a thread).`,
        `Where to find it: From a previous Telegram step's output — look for result.message_id. Use {{$json.result.message_id}}.`,
        `Leave blank to send a standalone message that is not a reply.`,
        `Example: 42`,
      ].join('\n');
    }
    if (lower === 'protectcontent') {
      return [
        `What this field is: When enabled, prevents recipients from forwarding or saving this message.`,
        `How to fill it: true to prevent forwarding, false (default) to allow forwarding.`,
        `Use case: Enable for sensitive one-time codes, private reports, or confidential documents.`,
      ].join('\n');
    }
    if (lower === 'caption') {
      return [
        `What this field is: Optional caption text displayed below the photo, video, or document.`,
        `Supports the same HTML or Markdown formatting as the message field.`,
        `Maximum 1,024 characters.`,
        `Example: 📊 Monthly report for {{$json.month}} — generated at {{$now}}`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  if (nodeType === 'telegram_trigger') {
    if (lower === 'updatetypes') {
      return [
        `What this field is: The Telegram update type that can start the workflow.`,
        `Use message for normal chatbot conversations.`,
        `Use callback_query if your bot sends inline buttons and should react when users tap them.`,
      ].join('\n');
    }
    if (lower === 'allowedchatids') {
      return [
        `What this field is: Optional list of Telegram chat IDs allowed to trigger this workflow.`,
        `Leave it blank while testing, then add production chat IDs separated by commas.`,
        `Tip: The trigger output includes chatId, so you can copy it from a test run.`,
      ].join('\n');
    }
    if (lower === 'commandfilter') {
      return [
        `What this field is: Optional slash command required at the start of the Telegram message.`,
        `Example: /support only triggers the workflow for messages that start with /support.`,
      ].join('\n');
    }
    if (lower === 'secrettoken') {
      return [
        `What this field is: Optional webhook secret Telegram sends back in the X-Telegram-Bot-Api-Secret-Token header.`,
        `Use a random value and re-register the webhook with the same value.`,
      ].join('\n');
    }
  }

  // ── Discord ────────────────────────────────────────────────────────────────────
  if (nodeType === 'whatsapp_trigger') {
    if (lower === 'eventtypes') {
      return [
        `What this field is: The WhatsApp Cloud webhook event type that can start the workflow.`,
        `Use message for normal chatbot conversations.`,
        `Use status.delivered or status.read when the workflow should react to delivery updates.`,
      ].join('\n');
    }
    if (lower === 'phonenumberid') {
      return [
        `What this field is: Optional Meta WhatsApp Phone Number ID filter.`,
        `Where to find it: Meta for Developers -> WhatsApp -> API Setup -> Phone Number ID.`,
        `Leave blank if the connected WhatsApp account has only one business number or you want to accept all numbers on that app.`,
      ].join('\n');
    }
    if (lower === 'allowedwaids') {
      return [
        `What this field is: Optional list of WhatsApp sender IDs allowed to trigger this workflow.`,
        `Leave blank while testing, then add production sender IDs separated by commas if you want an allowlist.`,
        `Tip: The trigger output includes waId and chatId, so copy them from a test execution.`,
      ].join('\n');
    }
    if (lower === 'verifytoken') {
      return [
        `What this field is: The secret Meta uses when verifying your webhook callback URL.`,
        `Use a random value, save it here, and enter the exact same value in Meta for Developers -> WhatsApp -> Configuration.`,
      ].join('\n');
    }
    if (lower === 'validatesignature') {
      return [
        `What this field is: Validates Meta's X-Hub-Signature-256 header before starting the workflow.`,
        `Keep enabled in production. The worker must have META_APP_SECRET, FACEBOOK_APP_SECRET, or WHATSAPP_APP_SECRET configured.`,
      ].join('\n');
    }
  }

  if (nodeType === 'instagram_trigger') {
    if (lower === 'eventtypes') {
      return [
        `What this field is: The Instagram webhook event types that can start this workflow.`,
        `Use message for DMs, message.story_reply for story replies, comment for comments, mention for mentions, and postback for button payloads.`,
        `Start broad while testing, then narrow this list for production workflows.`,
      ].join('\n');
    }
    if (lower === 'instagrambusinessaccountid' || lower === 'pageid') {
      return [
        `What this field is: Optional Instagram Business Account ID filter.`,
        `Where to find it: Meta Graph API Explorer -> /me/accounts -> page.instagram_business_account.id.`,
        `Leave blank if the selected Instagram connection has only one account or you want to accept every account subscribed to the app.`,
      ].join('\n');
    }
    if (lower === 'allowedsenderids') {
      return [
        `What this field is: Optional list of Instagram sender IDs allowed to trigger this workflow.`,
        `Leave blank while testing, then add production sender IDs separated by commas if you want an allowlist.`,
        `Tip: The trigger output includes senderId and chatId, so copy them from a test execution.`,
      ].join('\n');
    }
    if (lower === 'verifytoken') {
      return [
        `What this field is: The secret Meta uses when verifying your Instagram webhook callback URL.`,
        `Use a random value, save it here, and enter the exact same value in Meta for Developers -> Webhooks.`,
      ].join('\n');
    }
    if (lower === 'validatesignature') {
      return [
        `What this field is: Validates Meta's X-Hub-Signature-256 header before starting the workflow.`,
        `Keep enabled in production. The worker must have META_APP_SECRET, INSTAGRAM_APP_SECRET, or FACEBOOK_APP_SECRET configured.`,
      ].join('\n');
    }
  }

  if (nodeType === 'facebook_trigger') {
    if (lower === 'eventtypes') {
      return [
        `What this field is: The Facebook webhook event types that can start this workflow.`,
        `Use message for Messenger, comment for Page comments, mention for Page mentions, postback for button payloads, leadgen for lead ads, and feed for Page feed updates.`,
        `Start broad while testing, then narrow this list for production workflows.`,
      ].join('\n');
    }
    if (lower === 'pageid') {
      return [
        `What this field is: Optional Facebook Page ID filter.`,
        `Where to find it: Meta Graph API Explorer -> /me/accounts or your Facebook Page settings.`,
        `Leave blank if the selected Facebook connection has only one Page or you want to accept every Page subscribed to the app.`,
      ].join('\n');
    }
    if (lower === 'allowedsenderids') {
      return [
        `What this field is: Optional list of Facebook PSIDs or user IDs allowed to trigger this workflow.`,
        `Leave blank while testing, then add production sender IDs separated by commas if you want an allowlist.`,
        `Tip: The trigger output includes senderId and chatId, so copy them from a test execution.`,
      ].join('\n');
    }
    if (lower === 'verifytoken') {
      return [
        `What this field is: The secret Meta uses when verifying your Facebook webhook callback URL.`,
        `Use a random value, save it here, and enter the exact same value in Meta for Developers -> Webhooks.`,
      ].join('\n');
    }
    if (lower === 'validatesignature') {
      return [
        `What this field is: Validates Meta's X-Hub-Signature-256 header before starting the workflow.`,
        `Keep enabled in production. The worker must have META_APP_SECRET or FACEBOOK_APP_SECRET configured.`,
      ].join('\n');
    }
  }

  if (nodeType === 'discord' || nodeType === 'discord_webhook') {
    if (lower === 'channelid' || lower === 'channel_id') {
      return [
        `What this field is: The unique ID of the Discord channel where the message will be posted.`,
        `How to find it: Open Discord → User Settings (gear icon, bottom-left) → Advanced → turn on Developer Mode.`,
        `Then right-click the channel name in the server → Copy ID.`,
        `The ID is a 17–19 digit number like 1234567890123456789.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'message' || lower === 'content') {
      return [
        `What this field is: The text content of the Discord message.`,
        `Formatting (Discord Markdown): **bold**, *italic*, \`code\`, \`\`\`code block\`\`\`, > quote, ~~strikethrough~~.`,
        `Character limit: 2,000 characters per message. For longer content, use embeds.`,
        `Example: ✅ Build #{{$json.buildNumber}} passed on branch {{$json.branch}}.`,
        `Tip: Use {{$json.fieldName}} to insert data from a previous step.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'webhookurl' || lower === 'webhook_url') {
      return [
        `What this field is: A Discord webhook URL — lets you post messages to a channel without a bot token.`,
        `Where to get it: In Discord → right-click the channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL.`,
        `URL format: https://discord.com/api/webhooks/{webhook.id}/{webhook.token}`,
        `Note: Webhooks are simpler than bot tokens for one-way notifications. If you need to read messages or use slash commands, use a bot token + Channel Id instead.`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  // ── HTTP Request / HTTP Post ───────────────────────────────────────────────────
  if (nodeType === 'http_request' || nodeType === 'http_post') {
    if (lower === 'url') {
      return [
        `What this field is: The full URL of the API endpoint or web resource to call.`,
        `Format: Must start with https:// (or http:// for local testing). Include the full path.`,
        `Examples:`,
        `  REST API endpoint:      https://api.stripe.com/v1/customers`,
        `  With dynamic path:      https://api.example.com/users/{{$json.userId}}/orders`,
        `Tip: Do not append query parameters to this URL — use the Qs field instead. Use {{$json.fieldName}} for dynamic path segments.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'method') {
      return [
        `What this field is: The HTTP method tells the server what kind of action to perform.`,
        `GET    — Read/fetch data. No request body. Most common for retrieving records.`,
        `POST   — Create new data or submit a form. Requires a body in most cases.`,
        `PUT    — Replace an existing record completely.`,
        `PATCH  — Update part of an existing record (only the fields you send).`,
        `DELETE — Remove a record. Usually no body needed.`,
        `The API documentation always specifies which method to use — look for it next to the endpoint URL.`,
      ].join('\n');
    }
    if (lower === 'qs' || lower === 'query_params' || lower === 'queryparams') {
      return [
        `What this field is: Query string parameters — key-value pairs appended to the URL as ?key=value&key2=value2.`,
        `Format: A JSON object where keys become parameter names.`,
        `Example: {"limit":"10","offset":"0","status":"active"} becomes ?limit=10&offset=0&status=active`,
        `Tip: Use this field instead of manually building the query string inside the URL field.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'body' || lower === 'requestbody' || lower === 'request_body') {
      return [
        `What this field is: The JSON data sent as the request body with POST, PUT, or PATCH requests.`,
        `Format: Valid JSON. Most REST APIs expect a JSON object {"key":"value"}.`,
        `Example: {"name":"Alice","email":"alice@example.com","status":"active"}`,
        `To build from earlier node data: {"email":"{{$json.email}}","name":"{{$json.name}}","amount":{{$json.price}}}`,
        `Note: GET and DELETE requests usually do not use a body — leave this blank for those methods.`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  // ── Notion ─────────────────────────────────────────────────────────────────────
  if (nodeType === 'notion') {
    if (lower === 'title') {
      return [
        `What this field is: The title of the Notion page or database entry (the main heading/name field).`,
        `How to fill it: Type the title text directly, or use data from an earlier step.`,
        `Example: Monthly Report — {{$json.month}} {{$json.year}}`,
        `Note: Notion page titles are plain text — Markdown formatting does not apply here.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'content') {
      return [
        `What this field is: The body text of the Notion page, added as a Paragraph block.`,
        `How to fill it: Type the page content. Plain text only — this creates a Paragraph block in Notion.`,
        `Example: This report covers {{$json.startDate}} to {{$json.endDate}}. Total orders: {{$json.orderCount}}.`,
        `For richer formatting (headings, bullet lists, code blocks), you would need to use the Notion blocks API structure.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'properties') {
      return [
        `What this field is: The database column values for this Notion page row.`,
        `Format: JSON key-value pairs where each key is the exact Notion property name (case-sensitive).`,
        `How to find property names: Open your Notion database — column headers are the exact names to use.`,
        `Example: {"Status":"In Progress","Priority":"High","Due Date":"2025-03-01","Assignee":"Alice"}`,
        `Important: Property names are case-sensitive. "Status" ≠ "status". Copy names exactly from Notion.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'filter') {
      return [
        `What this field is: An optional filter to narrow which Notion database pages are returned.`,
        `Format: Notion filter JSON following the Notion API filter syntax.`,
        `Example — by property: {"property":"Status","select":{"equals":"In Progress"}}`,
        `Example — by date:     {"property":"Due Date","date":{"on_or_before":"2025-12-31"}}`,
        `Leave blank to return all records (subject to pagination limit).`,
        `Reference: developers.notion.com/reference/post-database-query-filter`,
      ].join('\n');
    }
    if (lower === 'pageid' || lower === 'page_id') {
      return [
        `What this field is: The unique ID of a specific Notion page.`,
        `Where to find it: Open the page in Notion → click Share (top right) → Copy link. The ID is the 32-character string at the end of the URL before any ?.`,
        `URL example: notion.so/myworkspace/Meeting-Notes-1234abcd5678ef90abcd1234ef567890`,
        `The page ID is: 1234abcd5678ef90abcd1234ef567890`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  // ── GitHub / GitLab / Bitbucket ───────────────────────────────────────────────
  if (nodeType === 'github' || nodeType === 'gitlab' || nodeType === 'bitbucket') {
    if (lower === 'owner') {
      return [
        `What this field is: The GitHub/GitLab username or organization slug that owns the repository.`,
        `Where to find it: It is the first path segment in the repository URL.`,
        `Example: For https://github.com/acmeinc/my-project the owner is "acmeinc".`,
        `For personal repos: your GitHub username. For org repos: the organization slug.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'repo' || lower === 'repository' || lower === 'reponame' || lower === 'repo_name') {
      return [
        `What this field is: The repository name only — do not include the owner prefix.`,
        `Example: For https://github.com/acmeinc/my-project the repo is "my-project".`,
        `Use only the repository name here. The owner goes in the Owner field above.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'branch') {
      return [
        `What this field is: The branch name to read from, write to, or create.`,
        `Examples: main, master, develop, feature/my-feature, release/v2.0.`,
        `Tip: Use "main" for the default branch on most modern repos. Use {{$json.branch}} to pass a branch name dynamically from a previous step (e.g. from a webhook trigger payload).`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'path' || lower === 'filepath' || lower === 'file_path') {
      return [
        `What this field is: The file path within the repository, relative to the root.`,
        `Examples: README.md, src/index.ts, docs/api-reference.md`,
        `Do not start with /. Use forward slashes for folder separators on all platforms.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'commitmessage' || lower === 'commit_message') {
      return [
        `What this field is: The message that describes what changed in this commit.`,
        `Best practice: Use present tense and be specific.`,
        `Examples: "Add user profile page", "Fix null pointer in payment handler", "Update README with API docs".`,
        `Tip: Include a dynamic value to make automated commits traceable: "Auto-update from workflow run {{$json.runId}}".`,
      ].join('\n');
    }
  }

  // ── Stripe ─────────────────────────────────────────────────────────────────────
  if (nodeType === 'stripe') {
    if (lower === 'amount') {
      return [
        `What this field is: The charge or payment amount.`,
        `IMPORTANT: Stripe uses the smallest currency unit — enter cents for USD, not dollars.`,
        `Examples: 1999 = $19.99 USD. 500 = $5.00 USD. 100000 = $1,000.00 USD.`,
        `For zero-decimal currencies like JPY, enter the full amount (e.g. 1500 = ¥1500).`,
        `Tip: Use {{$json.amountInCents}} or multiply {{$json.price}} by 100 to convert from dollars.`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'currency') {
      return [
        `What this field is: The three-letter ISO 4217 currency code for the payment.`,
        `Examples: usd (US Dollar), eur (Euro), gbp (British Pound), inr (Indian Rupee), sgd (Singapore Dollar), jpy (Japanese Yen).`,
        `Must be lowercase for Stripe. Full list: stripe.com/docs/currencies`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  // ── Airtable ───────────────────────────────────────────────────────────────────
  if (nodeType === 'airtable') {
    if (lower === 'baseid' || lower === 'base_id') {
      return [
        `What this field is: The unique identifier of your Airtable Base (your workspace/database).`,
        `Where to find it: Open your Airtable base → click Help (?) → API documentation. The Base ID is shown at the top and always starts with "app".`,
        `URL example: airtable.com/appXXXXXXXXXXXXXX/tblXXX — the "appXXX..." part is the Base ID.`,
        `Example: appXXXXXXXXXXXXXX`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'tableid' || lower === 'table_id' || lower === 'tablename' || lower === 'table_name') {
      return [
        `What this field is: The ID or name of the specific Airtable table (the tab within the base).`,
        `Where to find the Table ID: In the Airtable URL — airtable.com/appXXX/tblYYYYYYYYYYYYYY — the "tblYYY..." part is the Table ID.`,
        `You can also use the visible table name shown in the Airtable tab, but IDs are safer if the table might be renamed.`,
        `Example: tblYYYYYYYYYYYYYY or "Leads"`,
        dynamicExample(key),
      ].join('\n');
    }
    if (lower === 'fields' || lower === 'record' || lower === 'recorddata' || lower === 'record_data') {
      return [
        `What this field is: The Airtable field values for the record to create or update.`,
        `Format: JSON object where each key matches the exact Airtable column name (case-sensitive).`,
        `How to find field names: Open your Airtable table — the column headers are the exact names.`,
        `Example: {"Name":"Alice Kumar","Email":"alice@example.com","Status":"New","Score":95}`,
        `Tip: Field names are case-sensitive. "Name" ≠ "name". Copy exact spelling from Airtable.`,
        dynamicExample(key),
      ].join('\n');
    }
  }

  // ── Generic cross-node patterns ────────────────────────────────────────────────

  if (lower === 'subject') {
    return [
      `What this field is: The subject line — the text recipients see before opening the message or email.`,
      `How to fill it: Keep it short and specific (under 60 characters is ideal for email).`,
      `Example: New order #{{$json.orderId}} received — action needed`,
      `Tip: Use {{$json.fieldName}} to personalize the subject with data from an earlier step.`,
      dynamicExample(key),
    ].join('\n');
  }

  if (lower === 'amount' || lower === 'price' || lower === 'total') {
    return [
      `What this field is: ${description} for ${nodeName}${operationValue ? ` ${operationName}` : ''}.`,
      `Format: A number. Check the API documentation whether to use the smallest currency unit (e.g. cents: 1999 for $19.99) or a decimal value (e.g. 19.99).`,
      `Example: 1999 for Stripe (cents) or 19.99 for most other providers.`,
      dynamicExample(key),
    ].join('\n');
  }

  if (lower === 'currency') {
    return [
      `What this field is: The three-letter ISO 4217 currency code.`,
      `Examples: usd, eur, gbp, inr, sgd, aud, cad, jpy.`,
      `Always use lowercase letters. Full list at en.wikipedia.org/wiki/ISO_4217`,
      dynamicExample(key),
    ].join('\n');
  }

  if (lower === 'branch') {
    return [
      `What this field is: A version control branch name.`,
      `Examples: main, master, develop, feature/my-feature, fix/login-bug.`,
      `Use {{$json.branch}} to pass a branch name dynamically from a previous step.`,
      dynamicExample(key),
    ].join('\n');
  }

  if (lower === 'timeout') {
    return [
      `What this field is: How long to wait for a response before failing with a timeout error, in milliseconds.`,
      `1 second = 1000 ms. 10 seconds = 10000 ms. 30 seconds = 30000 ms.`,
      `Default: 10000 (10 seconds). Use 30000 for slow external APIs. Use 5000 for fast internal services.`,
      `If you see timeout errors, increase this value. For fast-fail behavior, decrease it.`,
    ].join('\n');
  }

  if (lower.includes('template')) {
    return [
      `What this field is: This is the approved template information ${nodeName} uses for template-based messages.`,
      `Where to find it: Open the provider dashboard, go to message templates, and copy the exact template name, language code, and component values.`,
      `Example: templateName = order_update, language = en_US.`,
      `Common mistake: Templates must be approved by the provider before they can be sent to users outside the 24-hour customer-service window.`,
      dynamicExample(key),
    ].filter(Boolean).join('\n');
  }

  if (lower.includes('id')) {
    return [
      `What this field is: ${description} for ${nodeName}${operationValue ? ` ${operationName}` : ''}.`,
      `Where to find it: Open the record in ${nodeName} and copy the ID from the URL, details page, API response, or a previous node output.`,
      `Example: ${input.placeholder || '123456789'}.`,
      dynamicExample(key),
    ].join('\n');
  }

  if (input.fieldType === 'select' || input.options?.length) {
    return [
      `What this field is: ${description} for ${nodeName}${operationValue ? ` ${operationName}` : ''}.`,
      `How to choose it: Pick the option that matches what you want this step to do. The choices shown are valid for this node.`,
      options,
      `Current setup: ${nodeName}${resourceValue ? ` -> ${titleCase(resourceValue)}` : ''}${operationValue ? ` -> ${operationName}` : ''}.`,
    ].filter(Boolean).join('\n');
  }

  if (input.fieldType === 'json' || input.fieldType === 'keyValue' || input.fieldType === 'hubspotProperties') {
    return [
      `What this field is: ${description} for ${nodeName}${operationValue ? ` ${operationName}` : ''}.`,
      `How to fill it: Enter key-value pairs or valid JSON in the exact format expected by ${nodeName}.`,
      `Example: ${input.placeholder || '{"name":"Alice","email":"alice@example.com"}'}.`,
      dynamicExample(key),
    ].join('\n');
  }

  return null;
}

export function shouldShowFieldForContext(
  nodeType: string,
  fieldKey: string,
  config: Record<string, unknown> = {},
): boolean {
  const key = fieldKey;
  const op = String(config.operation || '').trim();

  if (nodeType === 'hubspot') {
    const hubspotFields: Record<string, string[]> = {
      get: ['resource', 'operation', 'id', 'objectId'],
      getMany: ['resource', 'operation', 'limit', 'after'],
      create: ['resource', 'operation', 'properties'],
      update: ['resource', 'operation', 'id', 'objectId', 'properties'],
      delete: ['resource', 'operation', 'id', 'objectId'],
      search: ['resource', 'operation', 'searchQuery', 'limit', 'after'],
      batchCreate: ['resource', 'operation', 'properties'],
      batchUpdate: ['resource', 'operation', 'properties'],
      batchDelete: ['resource', 'operation', 'id', 'objectId'],
    };
    return (hubspotFields[op] || hubspotFields.create).includes(key);
  }

  if (nodeType === 'whatsapp' || nodeType === 'whatsapp_cloud') {
    const common = ['resource', 'operation', 'phoneNumberId', 'businessAccountId', 'to'];
    const whatsappFields: Record<string, string[]> = {
      sendText: [...common, 'text', 'message', 'previewUrl'],
      sendMedia: [...common, 'mediaType', 'mediaUrl', 'mediaId', 'caption'],
      sendLocation: [...common, 'latitude', 'longitude', 'locationName', 'address'],
      sendContact: [...common, 'contacts'],
      sendReaction: [...common, 'messageId', 'emoji'],
      sendTemplate: [...common, 'templateName', 'language', 'templateComponents'],
      sendInteractiveButtons: [...common, 'bodyText', 'headerText', 'footerText', 'buttons'],
      sendInteractiveList: [...common, 'bodyText', 'headerText', 'footerText', 'buttonText', 'sections'],
      sendInteractiveCTA: [...common, 'bodyText', 'headerText', 'footerText', 'ctaUrl'],
      markAsRead: ['resource', 'operation', 'phoneNumberId', 'messageId'],
    };
    return (whatsappFields[op] || whatsappFields.sendText).includes(key);
  }

  return true;
}
