import type { NodeDoc, FieldDoc } from '../types';

// ─── Shared field help text (reused across operations/resources that share a field) ───

const resourceHelpText = `What this field means: Resource tells the WhatsApp node which category of action to perform: Message, Contact, Conversation, Template, Campaign, or AI Agent.

Why it matters: WhatsApp's Business Platform groups its API into these six areas, and the Operation dropdown that appears next only makes sense once Resource is chosen.

When to fill it: Always set this first, before choosing Operation, because it determines which operations and which fields matter next.

What to enter: Choose message to send or manage individual WhatsApp messages such as text, media, location, contact cards, templates, interactive buttons/lists, or mark-as-read. Choose contact to create, update, delete, search, or label a saved WhatsApp contact record. Choose conversation to list, inspect, close, archive, or mark a conversation thread as read. Choose template to list, look up, create, or delete a Meta message template. Choose campaign to send a template to many recipients at once or list past campaigns. Choose aiAgent to enable, disable, or read AI Agent suggestions for a conversation.

Where the value comes from: The visual node panel currently only exposes message. The other five resources are runtime-supported and reachable through AI-generated workflows or a manually edited workflow JSON/saved configuration.

How to use it later: Later nodes do not read Resource directly. What matters is the data the matching operation returns, such as messages, data, or id fields.

Accepted format: One of message, contact, conversation, template, campaign, or aiAgent, spelled exactly as shown (case-sensitive).

Real workplace example: A support team builds a workflow with message to reply to customers, while an operations analyst's AI-generated workflow uses template to confirm which templates are approved before a campaign send.

If it is empty or wrong: The node throws an "Unknown resource" error and nothing is sent.

Common mistake: Typing a resource name with different capitalization, such as Message or MESSAGE, which does not match and causes an unknown-resource error.`;

const messageOperationHelpText = `What this field means: Operation chooses which WhatsApp message action to run once Resource is set to message.

Why it matters: The operation decides the WhatsApp Cloud API call that is made and which of the fields below are required.

When to fill it: Choose it before filling the rest of the form so the right fields appear.

What to enter: Choose sendText for a free-form reply inside the 24-hour customer service window. Choose sendMedia to send an image, video, audio, document, or sticker. Choose sendLocation to share a map pin. Choose sendContact to share one or more contact cards. Choose sendTemplate to send a pre-approved template, required to start a conversation or to message outside the 24-hour window. Choose sendInteractiveButtons for up to 3 tappable reply buttons. Choose sendInteractiveList for a scrollable list of grouped options. Choose sendInteractiveCTA for a single button that opens a URL. Choose markAsRead to show the blue double-check on an incoming customer message.

Where the value comes from: This is a fixed dropdown choice made while building the workflow, or a value an AI-generated workflow sets directly.

How to use it later: Successful sends return the Meta message id inside messages[0].id; later nodes can map {{$json.messages[0].id}}.

Accepted format: One of sendText, sendMedia, sendLocation, sendContact, sendTemplate, sendInteractiveButtons, sendInteractiveList, sendInteractiveCTA, or markAsRead.

Real workplace example: Use sendTemplate for the very first order confirmation to a new customer, then sendText for the free-form follow-up replies that happen within 24 hours of their response.

If it is empty or wrong: The node throws an "Unknown message operation" error and no request reaches Meta.

Common mistake: Choosing sendText for the first message to a brand-new contact. WhatsApp rejects free-form text outside the 24-hour window; use sendTemplate instead.`;

const contactOperationHelpText = `What this field means: Operation chooses which saved-contact action to run once Resource is set to contact.

Why it matters: The operation decides whether a new contact record is created, an existing one is changed or removed, contacts are searched, or labels are attached.

When to fill it: Choose it before filling Contact Name, Contact Phone, Contact Email, Contact ID, or Labels, since only some of those fields apply to each operation.

What to enter: Choose create to add a new saved contact using Contact Name, Contact Phone, and Contact Email. Choose update to change an existing contact identified by Contact ID. Choose delete to remove a contact identified by Contact ID. Choose search to look up contacts by Contact Phone or Contact Name. Choose addLabel to attach one or more Labels to a Contact ID. Choose removeLabel to remove Labels from a Contact ID.

Where the value comes from: This is set by an AI-generated workflow or a manually edited workflow configuration, since this resource is not yet in the visual Resource dropdown.

How to use it later: create/search return contact records your workflow can store; update/delete/addLabel/removeLabel return a success confirmation to branch on with {{$json.success}}.

Accepted format: One of create, update, delete, search, addLabel, or removeLabel.

Real workplace example: A lead-intake workflow uses create when a new WhatsApp inquiry has no matching saved contact, then addLabel to tag it "new-lead".

If it is empty or wrong: The node throws an "Unknown contact operation" error and no request reaches Meta.

Common mistake: Calling update or delete without a valid Contact ID from a previous create or search step.`;

const conversationOperationHelpText = `What this field means: Operation chooses which conversation action to run once Resource is set to conversation.

Why it matters: The operation decides whether the node lists open conversations, inspects one conversation, or changes its status.

When to fill it: Choose it before filling Conversation ID, Limit, or After, since only some of those fields apply to each operation.

What to enter: Choose list to page through conversations for the connected phone number using Limit and After. Choose get to fetch one conversation's messages and participants using Conversation ID. Choose close to mark a conversation resolved. Choose archive to move a conversation out of the active list. Choose markAsRead to clear the unread indicator on a conversation.

Where the value comes from: This is set by an AI-generated workflow or a manually edited workflow configuration, since this resource is not yet in the visual Resource dropdown.

How to use it later: list/get return conversation records and message history; close/archive/markAsRead return a success confirmation to branch on with {{$json.success}}.

Accepted format: One of list, get, close, archive, or markAsRead.

Real workplace example: A support-queue workflow runs list every morning, then archive on conversations that have had no reply in 30 days.

If it is empty or wrong: The node throws an "Unknown conversation operation" error and no request reaches Meta.

Common mistake: Calling get, close, archive, or markAsRead without a Conversation ID from a previous list step.`;

const templateOperationHelpText = `What this field means: Operation chooses which message-template action to run once Resource is set to template.

Why it matters: The operation decides whether the node lists your approved templates, looks up one by name, submits a new template for approval, or deletes one.

When to fill it: Choose it before filling Template Name, Language, Template Category, or Template Components, since only some of those fields apply to each operation.

What to enter: Choose list to page through all templates on the WhatsApp Business Account using Limit. Choose get to fetch one template by Template Name. Choose create to submit a new template using Template Name, Language, Template Category, and Template Components for Meta's review. Choose delete to remove a template by Template Name.

Where the value comes from: This is set by an AI-generated workflow or a manually edited workflow configuration, since this resource is not yet in the visual Resource dropdown.

How to use it later: list/get return template records with their approval status; create returns the new template's id and pending status; delete returns a success confirmation with {{$json.success}}.

Accepted format: One of list, get, create, or delete.

Real workplace example: A compliance check workflow runs get before a campaign to confirm the template's status is APPROVED before sending to customers.

If it is empty or wrong: The node throws an "Unknown template operation" error and no request reaches Meta.

Common mistake: Running create and immediately trying to send with it. New templates take 24-48 hours for Meta review before they can be used.`;

const campaignOperationHelpText = `What this field means: Operation chooses whether the node sends a bulk template campaign or lists past campaigns, once Resource is set to campaign.

Why it matters: The operation decides whether Recipients, Template Name, Language, and Template Components are used to send messages now, or whether the node only reads campaign history.

When to fill it: Choose it before filling Recipients, Template Name, or Language, since only create needs them.

What to enter: Choose create to send an approved template to every phone number listed in Recipients. Choose list to page through past campaigns for the Business Account using Limit.

Where the value comes from: This is set by an AI-generated workflow or a manually edited workflow configuration, since this resource is not yet in the visual Resource dropdown.

How to use it later: create returns counts your workflow can log with {{$json.sent}}, {{$json.failed}}, and {{$json.total}}; list returns past campaign records.

Accepted format: One of create or list.

Real workplace example: A marketing team runs create with Recipients from a CSV import to send a "flash sale" template to 500 opted-in customers, then checks {{$json.failed}} to see how many numbers bounced.

If it is empty or wrong: The node throws an "Unknown campaign operation" error and no request reaches Meta.

Common mistake: Running create with a template that is not yet APPROVED; every recipient in the batch fails and {{$json.failed}} equals {{$json.total}}.`;

const aiAgentOperationHelpText = `What this field means: Operation chooses whether the node turns Meta's AI Agent assistance on or off for a conversation, or reads its suggested replies, once Resource is set to aiAgent.

Why it matters: The operation decides whether the conversation gets automated AI assistance and whether your workflow pulls suggested replies for a human agent to review.

When to fill it: Choose it before filling Conversation ID, since every aiAgent operation needs it.

What to enter: Choose enable to turn on AI Agent assistance for a conversation. Choose disable to turn it off, for example when a human agent takes over. Choose getSuggestions to read AI-generated reply suggestions for a conversation without sending anything.

Where the value comes from: This is set by an AI-generated workflow or a manually edited workflow configuration, since this resource is not yet in the visual Resource dropdown.

How to use it later: enable/disable return a success confirmation with {{$json.success}}; getSuggestions returns suggestion records a human-in-the-loop step can display before sending a reply.

Accepted format: One of enable, disable, or getSuggestions.

Real workplace example: A helpdesk workflow calls disable the moment a senior agent joins a chat, so the AI Agent stops auto-suggesting replies for that thread.

If it is empty or wrong: The node throws an "Unknown aiAgent operation" error and no request reaches Meta.

Common mistake: Relying on aiAgent features when your Meta Business Account does not have AI Agent access enabled; Meta returns a permission or unsupported-feature error in that case.`;

const phoneNumberIdHelpText = `What this field means: Phone Number ID is the Meta-assigned identifier for the WhatsApp Business phone number that should send or manage this action.

Why it matters: A Meta Business Account can hold more than one WhatsApp number; this field tells the node exactly which one to use.

When to fill it: Leave it blank for a single-number account; the node automatically resolves the first phone number on your connected WhatsApp Business Account. Fill it in when your business has more than one WhatsApp number and this workflow must always use a specific one.

What to enter: The numeric Phone Number ID shown in Meta Business Suite -> WhatsApp -> API Setup, not the actual phone number itself.

Where the value comes from: developers.facebook.com or business.facebook.com -> your app -> WhatsApp -> API Setup -> Phone Number ID field, or map {{$json.phoneNumberId}} from a previous WhatsApp step.

How to use it later: This field is an input only; it is not echoed back in the output. Use the messages/data returned by the operation for downstream logic.

Accepted format: A numeric string such as 123456789012345.

Real workplace example: A company with a sales WhatsApp number and a support WhatsApp number sets Phone Number ID on the support workflow so replies always come from the support line.

If it is empty or wrong: Leaving it blank is safe for single-number accounts. An incorrect ID causes Meta to reject the request with an invalid parameter or permission error, because your access token is not authorized for that phone number.

Common mistake: Pasting the actual WhatsApp phone number, such as +14155552671, instead of the numeric Meta-assigned ID.`;

const businessAccountIdHelpText = `What this field means: Business Account ID is the Meta-assigned identifier for your WhatsApp Business Account (WABA), used by contact, template, and campaign actions.

Why it matters: Contacts, templates, and campaigns belong to the WABA, not to a single phone number, so the node needs this ID to find or create them in the right place.

When to fill it: Leave it blank to let the node auto-resolve it from your connected phone number. Fill it in only if you manage multiple WhatsApp Business Accounts and this workflow must always use a specific one.

What to enter: The numeric WABA ID shown in Meta Business Suite, not a phone number or app ID.

Where the value comes from: Meta Business Suite -> WhatsApp Manager -> Account overview, or map {{$json.businessAccountId}} from a previous WhatsApp step.

How to use it later: This field is an input only; it is not echoed back in the output. Use the records returned by the operation, such as template or contact data, for downstream logic.

Accepted format: A numeric string such as 123456789012345.

Real workplace example: An agency managing WhatsApp for three separate client businesses sets Business Account ID on each client's workflow so templates are created under the correct client WABA.

If it is empty or wrong: Leaving it blank is safe for a single WABA setup. An incorrect ID causes Meta to reject the request because your access token does not have access to that Business Account.

Common mistake: Confusing Business Account ID with Phone Number ID; they are different Meta objects and are not interchangeable.`;

const toHelpText = `What this field means: To is the WhatsApp phone number of the person who should receive this message.

Why it matters: WhatsApp cannot deliver anything until it knows the exact recipient number in international format.

When to fill it: Fill it for every message operation except Mark as Read, which targets an existing message instead of a recipient.

What to enter: The recipient's phone number in E.164 format: a plus sign, country code, then the number, with no spaces, dashes, or brackets.

Where the value comes from: A form submission, CRM contact record, e-commerce order, or WhatsApp Trigger output. For WhatsApp Trigger replies, map {{$json.chatId}} or {{$json.from}}.

How to use it later: To is not echoed back verbatim, but Meta's response includes a matching contacts[0].wa_id you can compare against it.

Accepted format: E.164 international format, such as +14155552671 (USA), +919876543210 (India), +447911123456 (UK), or +61412345678 (Australia).

Real workplace example: An order-confirmation workflow maps {{$json.customerPhone}} from a Shopify order into To.

If it is empty or wrong: The node returns a missing-recipient or invalid-parameter error from Meta and nothing is delivered.

Common mistake: Leaving out the plus sign and country code, or pasting a locally formatted number such as 0412 345 678 instead of +61412345678.`;

const textHelpText = `What this field means: Message is the free-form text the recipient reads on WhatsApp.

Why it matters: This is the actual content delivered for sendText, so it should be clear, complete, and personalized.

When to fill it: Fill it only when Operation is sendText. WhatsApp only allows free-form text within the 24-hour window that opens after a customer messages you; use sendTemplate outside that window.

What to enter: A clear message combining fixed wording with mapped fields, such as order status, delivery windows, or support answers.

Where the value comes from: AI Agent output, a form answer, a CRM field, or a WhatsApp Trigger reply flow. Map values with {{$json.fieldName}}, for example {{$json.aiResponse}} or {{$json.customerName}}.

How to use it later: Message is not echoed back in Meta's response; the response instead confirms delivery with a message id you can log alongside the text you sent.

Accepted format: Plain text up to WhatsApp's message length limit; emoji and basic Unicode are supported.

Real workplace example: "Hello {{$json.name}}, your delivery is arriving today between 2-4 PM. Track it here: {{$json.trackingUrl}}".

If it is empty or wrong: The node returns a required-field or invalid-parameter error and nothing sends. Sending it outside the 24-hour window causes Meta to reject the message.

Common mistake: Using sendText for the very first message to a brand-new contact; Meta will reject it because only approved templates can start a new conversation.`;

const previewUrlHelpText = `What this field means: Show Link Preview controls whether WhatsApp renders a preview card (title, image, description) for the first link inside Message.

Why it matters: A preview card can make a link feel more trustworthy and informative, but it also adds visual space to the message.

When to fill it: Fill it only when Operation is sendText and Message contains a URL.

What to enter: Turn it on to show the preview card, or leave it off for a compact message with plain link text.

Where the value comes from: This is a fixed workflow design choice based on how your team wants links to appear.

How to use it later: This only changes how WhatsApp renders the message; it does not appear in the response. Use the returned message id for delivery tracking.

Accepted format: Boolean true or false; the runtime default is false.

Real workplace example: Turn it on for a marketing link to a new product page so customers see a rich preview before tapping it.

If it is empty or wrong: Runtime treats a blank value as false, so no preview card is shown.

Common mistake: Turning it on for a link that returns no preview metadata (title/image/description); WhatsApp then shows only the plain link with no visible change.`;

const mediaTypeHelpText = `What this field means: Media Type tells WhatsApp what kind of file is being sent for sendMedia.

Why it matters: WhatsApp uses a different payload structure and delivery behavior for each media type, and some types support a Caption while others do not.

When to fill it: Fill it only when Operation is sendMedia.

What to enter: Choose image for a JPEG or PNG, video for an MP4 clip, audio for a voice note or audio file (no caption support), document for a PDF or file (caption supported, shows a file name), or sticker for a WhatsApp sticker in webp format (no caption support).

Where the value comes from: This is a fixed dropdown choice based on the file you are sending.

How to use it later: The chosen type shapes the request sent to Meta; Meta's response confirms delivery with a message id regardless of type.

Accepted format: One of image, video, audio, document, or sticker.

Real workplace example: Use document to send a PDF invoice with Caption "Invoice {{$json.invoiceNumber}}", or image to send a product photo.

If it is empty or wrong: Runtime defaults to image. Choosing the wrong type for the actual file causes WhatsApp to fail to render or reject the media.

Common mistake: Choosing audio or sticker and still filling Caption; WhatsApp ignores captions for those two types.`;

const mediaUrlHelpText = `What this field means: Media URL is the public web address of the file WhatsApp should download and deliver for sendMedia.

Why it matters: WhatsApp fetches the file directly from this address; it must be reachable without a login or private session.

When to fill it: Fill it for sendMedia unless you already have a Media ID from a prior upload; use one or the other, not both.

What to enter: A direct HTTPS link to the actual file, not a preview page, dashboard link, or shortened link that requires a redirect chain WhatsApp cannot follow.

Where the value comes from: Cloud storage such as AWS S3 or Google Cloud Storage (made public), a CDN, or a generated report/export step. Map it with {{$json.invoicePdfUrl}} or similar.

How to use it later: Media URL is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: A public HTTPS URL ending in a fetchable file, such as https://cdn.example.com/invoice.pdf.

Real workplace example: {{$json.chartImageUrl}} from a reporting step, sent as a daily KPI snapshot.

If it is empty or wrong: The node returns a missing-media or invalid-parameter error, or Meta fails to fetch the file and the send fails.

Common mistake: Using a Google Drive "preview" link or a signed URL that expires before WhatsApp fetches it.`;

const mediaIdHelpText = `What this field means: Media ID is the Meta-assigned identifier for a file you already uploaded to WhatsApp, used as an alternative to Media URL for sendMedia.

Why it matters: Reusing an uploaded Media ID avoids re-hosting the same file publicly and can be faster for files sent repeatedly.

When to fill it: Fill it only if you already uploaded the file to Meta ahead of time and have its ID. Leave it blank when using Media URL instead.

What to enter: The numeric Media ID returned by Meta when the file was uploaded.

Where the value comes from: A previous Meta media upload call, or a value stored from an earlier workflow run. Map it with {{$json.mediaId}} if a previous step captured it.

How to use it later: Media ID is not echoed back in the send response; Meta's response confirms delivery with a message id.

Accepted format: A numeric string Meta assigned during upload.

Real workplace example: A workflow that sends the same onboarding video to every new customer uploads it once and reuses the returned Media ID instead of re-hosting the video URL each time.

If it is empty or wrong: If both Media ID and Media URL are blank, the node returns a missing-media error. An expired or invalid Media ID causes Meta to reject the send.

Common mistake: Filling both Media ID and Media URL; the node uses Media ID first and ignores Media URL when both are present.`;

const captionHelpText = `What this field means: Caption is optional text shown under an image, video, or document sent by sendMedia.

Why it matters: It gives the recipient context for the file without requiring a separate text message.

When to fill it: Fill it for image or document media types when the file needs a short label. Leave it blank for audio or sticker, which do not display captions.

What to enter: A short line of context such as a report date, invoice number, or product name.

Where the value comes from: Report metadata, CRM fields, order details, or a previous step's output. Map it with {{$json.invoiceNumber}} or similar.

How to use it later: Caption is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Short plain text within WhatsApp's caption length limit.

Real workplace example: "Invoice {{$json.invoiceNumber}} for {{$json.customerName}}" under a PDF document.

If it is empty or wrong: Media still sends without it. Filling it for audio or sticker has no visible effect since WhatsApp does not render captions for those types.

Common mistake: Writing a long report inside Caption instead of sending the file and a short one-line summary.`;

const latitudeHelpText = `What this field means: Latitude is the decimal north-south coordinate of the map pin sent by sendLocation.

Why it matters: WhatsApp needs both Latitude and Longitude to place the pin on the map correctly.

When to fill it: Fill it whenever Operation is sendLocation.

What to enter: A decimal latitude value, such as 12.9716 for Bengaluru or 40.7128 for New York City.

Where the value comes from: A store, warehouse, or event location record, or a geocoding step earlier in the workflow. Map it with {{$json.latitude}}.

How to use it later: Latitude is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: A decimal number between -90 and 90.

Real workplace example: A logistics workflow sends the nearest warehouse's {{$json.latitude}} and {{$json.longitude}} to a customer asking about pickup.

If it is empty or wrong: The node returns a missing or invalid-parameter error and the location is not sent.

Common mistake: Swapping Latitude and Longitude values, which places the pin in the wrong part of the world.`;

const longitudeHelpText = `What this field means: Longitude is the decimal east-west coordinate of the map pin sent by sendLocation.

Why it matters: WhatsApp needs both Latitude and Longitude to place the pin on the map correctly.

When to fill it: Fill it whenever Operation is sendLocation.

What to enter: A decimal longitude value, such as 77.5946 for Bengaluru or -74.0060 for New York City.

Where the value comes from: A store, warehouse, or event location record, or a geocoding step earlier in the workflow. Map it with {{$json.longitude}}.

How to use it later: Longitude is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: A decimal number between -180 and 180.

Real workplace example: A logistics workflow sends the nearest warehouse's {{$json.latitude}} and {{$json.longitude}} to a customer asking about pickup.

If it is empty or wrong: The node returns a missing or invalid-parameter error and the location is not sent.

Common mistake: Swapping Latitude and Longitude values, which places the pin in the wrong part of the world.`;

const locationNameHelpText = `What this field means: Location Name is the short label shown above the map pin for sendLocation.

Why it matters: It tells the recipient what the pin represents without them needing to guess from coordinates alone.

When to fill it: Fill it whenever Operation is sendLocation and the pin should have a readable name; it is optional but recommended.

What to enter: A short label such as "Downtown Warehouse" or "Main Store - Sector 5".

Where the value comes from: Your store or warehouse directory, or a previous lookup step. Map it with {{$json.locationName}}.

How to use it later: Location Name is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Short plain text.

Real workplace example: "Main Store - Sector 5" shown above the pin for a click-and-collect order.

If it is empty or wrong: The location still sends without a label; the recipient only sees the coordinates and address.

Common mistake: Leaving it blank for locations customers are unfamiliar with, making the pin harder to recognize at a glance.`;

const addressHelpText = `What this field means: Address is the full street address shown under the location name for sendLocation.

Why it matters: It gives the recipient enough detail to get directions without opening a separate maps app.

When to fill it: Fill it whenever Operation is sendLocation and the recipient may need to travel there.

What to enter: A complete postal address, such as "221B Baker Street, London, NW1 6XE".

Where the value comes from: Your store or warehouse directory, or a previous lookup step. Map it with {{$json.address}}.

How to use it later: Address is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Plain text street address.

Real workplace example: "221B Baker Street, London, NW1 6XE" shown under "Main Store".

If it is empty or wrong: The location still sends without the address line; recipients only see the pin and location name.

Common mistake: Entering a P.O. box or internal warehouse code that means nothing to an external customer.`;

const contactsHelpText = `What this field means: Contacts is the WhatsApp contact-card payload sent by sendContact, following Meta's contacts message format.

Why it matters: WhatsApp requires a specific nested JSON shape (name, phones, emails, org) to render a shareable contact card; it is not just a name and number.

When to fill it: Fill it whenever Operation is sendContact.

What to enter: A JSON array of contact objects, each with at least a name.formatted_name and a phones array.

Where the value comes from: Build it from a CRM record or a JavaScript/Set node earlier in the workflow that assembles the correct shape, or map {{$json.contacts}} if a previous step already produced it.

How to use it later: Contacts is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Valid JSON array, for example [{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}].

Real workplace example: Sharing a sales rep's contact card automatically after a customer asks "who do I contact for support?".

If it is empty or wrong: The node returns a missing or invalid-parameter error, or Meta rejects malformed JSON and the card is not sent.

Common mistake: Sending a flat object such as {"name":"Alice","phone":"+91..."} instead of Meta's required nested name/phones structure.`;

const templateNameHelpText = `What this field means: Template Name is the exact name of a Meta message template.

Why it matters: WhatsApp Template actions and sendTemplate all identify the template by this exact name, not by a display title.

When to fill it: Fill it for sendTemplate, template get/create/delete, and campaign create.

What to enter: The template's technical name exactly as shown in Meta Business Suite, such as order_confirmation, welcome_message, or appointment_reminder.

Where the value comes from: Meta Business Suite -> WhatsApp -> Message Templates -> the Name column, or map {{$json.templateName}} from a previous template list/get step.

How to use it later: On create, Meta returns the new template's id and pending status; on sendTemplate/campaign, Meta returns a message id or send counts.

Accepted format: Lowercase letters, numbers, and underscores, matching Meta's template naming rules.

Real workplace example: order_confirmation used right after a checkout to message a first-time customer.

If it is empty or wrong: The node returns a missing-field error, or Meta responds that the template was not found for that name and language.

Common mistake: Typing the template's friendly display title instead of its technical name, or getting the case or spelling slightly wrong.`;

const languageHelpText = `What this field means: Language is the language code a Meta message template was approved in.

Why it matters: Templates are approved per language; sending with the wrong language code causes WhatsApp to say the template cannot be found, even if the name is correct.

When to fill it: Fill it for sendTemplate, template create, and campaign create.

What to enter: The exact language code shown next to the template in Meta Business Suite, such as en_US for US English, pt_BR for Brazilian Portuguese, or ar for Arabic.

Where the value comes from: Meta Business Suite -> WhatsApp -> Message Templates -> the Language column, or map {{$json.language}} from a previous template list/get step.

How to use it later: This field only affects which approved template variant is used; it is not echoed back in the response.

Accepted format: A Meta-supported language/locale code such as en_US, en_GB, es_MX, pt_BR, hi, or ar.

Real workplace example: Sending order_confirmation in en_US to US customers and in hi to customers who opted into Hindi communications.

If it is empty or wrong: The node returns a missing-field error, or Meta responds that the template was not found for that name and language combination.

Common mistake: Using the recipient's browser or app language instead of the exact language the template itself was approved in.`;

const templateComponentsHelpText = `What this field means: Template Components is the JSON array that fills in a message template's placeholder variables (header, body, and button parameters).

Why it matters: Approved templates often contain variables such as {{1}} for a customer name or order number; Meta needs this array to know what real values to substitute.

When to fill it: Fill it for sendTemplate, template create, and campaign create whenever the template has variables. Leave it as an empty array only if the template truly has none.

What to enter: A JSON array of component objects following Meta's template components format, for example a body component with a list of text parameters.

Where the value comes from: Build it from the exact variable order shown for your template in Meta Business Suite, mapping in real values such as {{$json.customerName}} or {{$json.orderId}}.

How to use it later: This field only shapes the outgoing message; Meta's response confirms delivery with a message id, not the substituted text.

Accepted format: Valid JSON array, for example [{"type":"body","parameters":[{"type":"text","text":"{{$json.customerName}}"}]}].

Real workplace example: Filling an order_confirmation template's {{1}} and {{2}} placeholders with {{$json.orderId}} and {{$json.deliveryDate}}.

If it is empty or wrong: Meta rejects the send with a parameter-count or parameter-format error when the array does not match what the template expects.

Common mistake: Providing fewer or more parameters than the template actually has placeholders for.`;

const templateCategoryHelpText = `What this field means: Template Category tells Meta what kind of message a new template is, used when submitting one with template create.

Why it matters: Meta reviews and rate-limits templates differently depending on category, and picking the wrong one can cause rejection during review.

When to fill it: Fill it only for template create.

What to enter: Choose MARKETING for promotions and announcements, UTILITY for transactional updates such as order or appointment status, or AUTHENTICATION for one-time passcodes and login codes.

Where the value comes from: Decide based on the template's actual purpose; Meta's review team checks that the content matches the declared category.

How to use it later: Meta's create response includes the submitted category alongside the new template id and pending status.

Accepted format: One of MARKETING, UTILITY, or AUTHENTICATION.

Real workplace example: An order-status template uses UTILITY, while a seasonal-sale template uses MARKETING.

If it is empty or wrong: Meta may reject the submission or re-categorize it during review, delaying approval.

Common mistake: Marking a promotional template as UTILITY to avoid marketing message limits; Meta's review can reject or recategorize it, and misuse can affect your account's messaging quality rating.`;

const templateStatusHelpText = `What this field means: Known Template Status is an optional local safety check confirming a template's current Meta approval status before sendTemplate or campaign create tries to use it.

Why it matters: Only APPROVED templates can be sent to customers; this field lets the workflow refuse to send before even contacting Meta if the template is not ready.

When to fill it: Fill it only if you already know the template's current status, typically from a previous template get or list step. Leave it blank to skip this local check and let Meta be the only validator.

What to enter: The exact status text, which must be APPROVED for the send to proceed; any other value blocks the send locally.

Where the value comes from: Map {{$json.status}} or {{$json.templateStatus}} from a previous WhatsApp template get/list step's output.

How to use it later: This field only gates whether the send proceeds; it is not part of Meta's own response.

Accepted format: Free text, but only the literal value APPROVED allows the send to continue.

Real workplace example: A campaign workflow first runs template get, then feeds its status into Known Template Status on the campaign create step so a still-pending template blocks the batch instead of failing customer-by-customer.

If it is empty or wrong: Leaving it blank skips this check. Setting it to anything other than APPROVED (such as PENDING or REJECTED) stops the send locally with a template-not-approved error.

Common mistake: Assuming a template is approved right after creating it; Meta review takes 24-48 hours, and sending before approval always fails.`;

const bodyTextHelpText = `What this field means: Body Text is the main message shown above the buttons or list for interactive messages.

Why it matters: It is the only required content area for sendInteractiveButtons, sendInteractiveList, and sendInteractiveCTA, so it must clearly explain the choice being offered.

When to fill it: Fill it whenever Operation is sendInteractiveButtons, sendInteractiveList, or sendInteractiveCTA.

What to enter: A short, clear question or instruction, such as "Choose an option to continue your order" or "How would you rate our service?".

Where the value comes from: Write it directly, optionally combined with mapped fields such as {{$json.orderId}}.

How to use it later: Body Text is not echoed back; Meta's response confirms delivery with a message id, and the customer's tap comes back through WhatsApp Trigger as a button/list reply id.

Accepted format: Plain text within WhatsApp's interactive body length limit.

Real workplace example: "Your order {{$json.orderId}} is ready. What would you like to do next?" above Confirm/Reschedule/Cancel buttons.

If it is empty or wrong: The node returns a missing-field error and the interactive message is not sent.

Common mistake: Writing body text so long that the buttons or list options lose context; keep it short and specific to the choice offered.`;

const headerTextHelpText = `What this field means: Header Text is optional bold text shown above Body Text on an interactive-buttons message.

Why it matters: It gives the message a short title, such as a topic or status, before the main body text.

When to fill it: Fill it only for sendInteractiveButtons. sendInteractiveList and sendInteractiveCTA ignore this field even if it is filled in.

What to enter: A short title such as "Order Update" or "Appointment Reminder".

Where the value comes from: Write it directly, optionally combined with mapped fields such as {{$json.orderId}}.

How to use it later: Header Text is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Short plain text.

Real workplace example: "Order {{$json.orderId}}" as the header above "Choose an option below" body text and Confirm/Cancel buttons.

If it is empty or wrong: The message still sends without a header. Filling it in for sendInteractiveList or sendInteractiveCTA has no visible effect since those message types do not render a header.

Common mistake: Expecting Header Text to appear on a list or CTA-button message; only Send Interactive Buttons displays it.`;

const footerTextHelpText = `What this field means: Footer Text is optional small gray text shown below the buttons on an interactive-buttons message.

Why it matters: It is a good place for a short disclaimer, reference number, or secondary note that should not compete with the main body text.

When to fill it: Fill it only for sendInteractiveButtons. sendInteractiveList and sendInteractiveCTA ignore this field even if it is filled in.

What to enter: A short note such as "Reply within 24 hours" or "Ref: {{$json.ticketId}}".

Where the value comes from: Write it directly, optionally combined with mapped fields such as {{$json.ticketId}}.

How to use it later: Footer Text is not echoed back; Meta's response confirms delivery with a message id.

Accepted format: Short plain text.

Real workplace example: "Ref: {{$json.ticketId}}" shown below Approve/Reject buttons.

If it is empty or wrong: The message still sends without a footer. Filling it in for sendInteractiveList or sendInteractiveCTA has no visible effect since those message types do not render a footer.

Common mistake: Putting important instructions only in Footer Text; some customers overlook small footer text, so keep key actions in Body Text.`;

const buttonsHelpText = `What this field means: Buttons is the JSON array of up to 3 tappable reply buttons for sendInteractiveButtons.

Why it matters: Each button needs a unique id your workflow can recognize and a short visible title, so WhatsApp Trigger can route the reply correctly.

When to fill it: Fill it whenever Operation is sendInteractiveButtons.

What to enter: A JSON array of reply button objects, each with a unique id (used internally, not shown to the customer) and a title of 20 characters or fewer (what the customer sees).

Where the value comes from: Design the choices based on the workflow branch each button should trigger, for example confirm/cancel or yes/no/later.

How to use it later: When the customer taps a button, WhatsApp Trigger receives the matching id so your workflow can branch with If/Else or Switch on it.

Accepted format: Valid JSON array with 1 to 3 entries, for example [{"type":"reply","reply":{"id":"confirm","title":"Confirm"}},{"type":"reply","reply":{"id":"cancel","title":"Cancel"}}].

Real workplace example: Confirm/Reschedule/Cancel buttons on an appointment reminder, routed by id in the next workflow step.

If it is empty or wrong: The node returns a missing-field error, or Meta rejects the request if there are more than 3 buttons or a title exceeds 20 characters.

Common mistake: Giving two buttons the same id, which makes it impossible for WhatsApp Trigger to tell which one the customer tapped.`;

const buttonTextHelpText = `What this field means: List Button Text is the label on the single button that opens the scrollable options list for sendInteractiveList.

Why it matters: WhatsApp interactive lists always show one button that expands into the sections/rows; this is that button's visible label.

When to fill it: Fill it whenever Operation is sendInteractiveList.

What to enter: A short label describing what the list contains, such as "View Options" or "Select a Plan".

Where the value comes from: Write it directly based on what List Sections offers.

How to use it later: List Button Text is not echoed back; when the customer taps a row inside the opened list, WhatsApp Trigger receives that row's id.

Accepted format: Short plain text, typically under 20 characters.

Real workplace example: "Select a Plan" opening a list of subscription tiers.

If it is empty or wrong: The node returns a missing-field error and the interactive list is not sent.

Common mistake: Leaving the label too vague, such as "Options", when a more specific label like "Select a Plan" helps the customer understand what happens before they tap.`;

const sectionsHelpText = `What this field means: List Sections is the JSON array of grouped rows shown when the customer taps the List Button Text button, for sendInteractiveList.

Why it matters: WhatsApp lists are organized into titled sections, each containing selectable rows with their own id, title, and optional description.

When to fill it: Fill it whenever Operation is sendInteractiveList.

What to enter: A JSON array of section objects, each with a title and a rows array; each row needs a unique id, a title, and an optional description.

Where the value comes from: Build it from your catalog, plan list, or FAQ topics, mapping in dynamic values such as prices or availability from a previous step.

How to use it later: When the customer taps a row, WhatsApp Trigger receives that row's id so your workflow can branch on it with If/Else or Switch.

Accepted format: Valid JSON array, for example [{"title":"Plans","rows":[{"id":"basic","title":"Basic","description":"$10/month"},{"id":"pro","title":"Pro","description":"$25/month"}]}].

Real workplace example: A pricing list with a "Plans" section containing Basic and Pro rows, each routed by id in a follow-up step.

If it is empty or wrong: The node returns a missing-field error, or Meta rejects the request if row ids are duplicated or limits are exceeded (WhatsApp allows up to 10 rows total).

Common mistake: Reusing the same row id across two different sections, which makes it impossible to tell which row the customer actually tapped.`;

const ctaUrlHelpText = `What this field means: CTA Button is the JSON object describing the single link-opening button for sendInteractiveCTA, with a display_text label and a url.

Why it matters: Unlike Buttons, a CTA button opens a web page directly instead of sending a reply id back to your workflow.

When to fill it: Fill it whenever Operation is sendInteractiveCTA.

What to enter: A JSON object with display_text (the button label, such as "Track Order") and url (the full HTTPS link it opens).

Where the value comes from: Build the url from your tracking page, payment page, or booking page, mapping in an identifier such as {{$json.orderId}}.

How to use it later: CTA Button is not echoed back; Meta's response confirms delivery with a message id. There is no reply id since tapping opens a URL instead of messaging back.

Accepted format: Valid JSON object, for example {"display_text":"Track Order","url":"https://example.com/track/{{$json.orderId}}"}.

Real workplace example: A "Track Order" button linking to {{$json.trackingUrl}} sent right after Send Template confirms the order.

If it is empty or wrong: The node returns a missing-field error, or Meta rejects a non-HTTPS or malformed url.

Common mistake: Pointing the url at a page that requires the customer to already be logged in to your internal system; CTA links should work for the recipient directly.`;

const messageIdHelpText = `What this field means: Message ID is the WhatsApp message identifier of the incoming customer message to mark as read for the message-resource markAsRead operation.

Why it matters: Marking a message as read shows the customer the blue double-check, which is a common courtesy signal in support conversations.

When to fill it: Fill it whenever Operation is markAsRead (message resource).

What to enter: The exact message id from the incoming WhatsApp message you are responding to.

Where the value comes from: Map {{$json.messageId}} from WhatsApp Trigger output for the message you want to acknowledge.

How to use it later: A successful call returns { success: true }; there is no further id to chain into another step.

Accepted format: A WhatsApp message id string, typically starting with wamid.

Real workplace example: Marking the customer's question as read immediately when a support workflow starts processing it, before the AI Agent drafts a reply.

If it is empty or wrong: The node returns a missing-field error, or Meta returns an error if the id does not belong to a message sent to your number.

Common mistake: Using the id of a message your own business sent (an outgoing message id) instead of the incoming customer message id.`;

const contactIdHelpText = `What this field means: Contact ID identifies an existing saved WhatsApp contact record for the contact-resource update, delete, addLabel, and removeLabel operations.

Why it matters: These operations change or remove a specific contact, so the node needs to know exactly which record to act on.

When to fill it: Fill it whenever Operation is update, delete, addLabel, or removeLabel.

What to enter: The id returned when the contact was created, or the id of a matching result from a previous contact search step.

Where the value comes from: Map {{$json.id}} or {{$json.contactId}} from a previous contact create or search step's output.

How to use it later: A successful call returns a success confirmation with {{$json.success}}; use the same Contact ID again for any follow-up contact action.

Accepted format: The id string exactly as returned by a previous create or search call.

Real workplace example: Tagging a contact with a "vip" label using addLabel and the Contact ID returned when that contact was first created.

If it is empty or wrong: The node returns a missing-field error, or Meta responds that the contact was not found for that id.

Common mistake: Using the contact's phone number instead of the Meta-assigned Contact ID.`;

const contactNameHelpText = `What this field means: Contact Name is the display name saved on a WhatsApp contact record for the contact-resource create and update operations.

Why it matters: It lets your team recognize the contact by name instead of only a phone number when reviewing saved contacts.

When to fill it: Fill it for create, and optionally for update when the name is changing.

What to enter: The contact's full name, such as "Alice Kumar".

Where the value comes from: A form submission, CRM record, or the display name from a WhatsApp Trigger event. Map it with {{$json.customerName}}.

How to use it later: create/update return a success confirmation; use Contact ID from the create response for later contact actions.

Accepted format: Plain text name.

Real workplace example: Saving "Alice Kumar" as the Contact Name when a new WhatsApp inquiry has no existing CRM match.

If it is empty or wrong: create can still succeed with a blank name in some cases, but the saved contact becomes harder for your team to identify later.

Common mistake: Saving a generic placeholder like "WhatsApp User" instead of the real name from the conversation or CRM.`;

const contactPhoneHelpText = `What this field means: Contact Phone is the phone number saved on a WhatsApp contact record, and is also used to search for a contact.

Why it matters: It is usually the main way your team and the search operation identify a specific contact.

When to fill it: Fill it for create, optionally for update, and for search when looking up by number.

What to enter: The phone number in E.164 format: a plus sign, country code, then the number, with no spaces or dashes.

Where the value comes from: A form submission, CRM record, or WhatsApp Trigger's from/chatId field. Map it with {{$json.customerPhone}}.

How to use it later: create/update return a success confirmation; search returns matching contact records with this phone number.

Accepted format: E.164 international format, such as +14155552671.

Real workplace example: Searching for an existing contact by {{$json.customerPhone}} before deciding whether to create a new one.

If it is empty or wrong: create/update can still process a blank or malformed value, but search will not find the intended contact if the format does not match how it was saved.

Common mistake: Saving or searching with a locally formatted number instead of the E.164 format used elsewhere in the workflow.`;

const contactEmailHelpText = `What this field means: Contact Email is the email address saved on a WhatsApp contact record for the contact-resource create and update operations.

Why it matters: It gives your team a second way to reach or identify the contact outside WhatsApp.

When to fill it: Fill it for create or update only when you have the contact's email address; it is optional.

What to enter: A standard email address, such as alice@example.com.

Where the value comes from: A form submission or CRM record. Map it with {{$json.customerEmail}}.

How to use it later: create/update return a success confirmation; this field is not used by search.

Accepted format: A valid email address.

Real workplace example: Saving {{$json.customerEmail}} alongside the phone number when a lead form captures both.

If it is empty or wrong: create/update still succeed without it; the saved contact simply has no email on file.

Common mistake: Assuming Contact Email can be used to search for the contact; only Contact Phone and Contact Name are used for search.`;

const labelsHelpText = `What this field means: Labels is the list of tags to add or remove on a saved contact for the contact-resource addLabel and removeLabel operations.

Why it matters: Labels let your team segment and filter contacts, such as "vip", "new-lead", or "unsubscribed".

When to fill it: Fill it whenever Operation is addLabel or removeLabel.

What to enter: A JSON array of short label strings.

Where the value comes from: Decide labels based on your team's segmentation needs, or map a computed label such as {{$json.segment}} from a scoring step.

How to use it later: A successful call returns a success confirmation with {{$json.success}}.

Accepted format: Valid JSON array of strings, for example ["vip","new-lead"].

Real workplace example: Adding "new-lead" right after contact create, then later replacing it with "customer" using removeLabel and addLabel once they make a purchase.

If it is empty or wrong: The node returns a missing-field error and no labels change.

Common mistake: Passing a single string such as "vip" instead of a JSON array such as ["vip"].`;

const conversationIdHelpText = `What this field means: Conversation ID identifies one WhatsApp conversation thread, used by conversation get/close/archive/markAsRead and all aiAgent operations.

Why it matters: These operations act on one specific conversation, so the node needs the exact thread id.

When to fill it: Fill it whenever Operation is get, close, archive, or markAsRead (conversation resource), or enable, disable, or getSuggestions (aiAgent resource).

What to enter: The id of a conversation returned by a previous conversation list step.

Where the value comes from: Map {{$json.id}} or {{$json.conversationId}} from a previous conversation list step's output.

How to use it later: get returns the conversation's messages and participants; close/archive/markAsRead/enable/disable return a success confirmation; getSuggestions returns AI Agent reply suggestions.

Accepted format: The id string exactly as returned by a previous list call.

Real workplace example: Running conversation list each morning, then archive on every Conversation ID with no reply in 30 days.

If it is empty or wrong: The node returns a missing-field error, or Meta responds that the conversation was not found for that id.

Common mistake: Using a message id instead of a conversation id; they are different identifiers even though both come from the same WhatsApp thread.`;

const recipientsHelpText = `What this field means: Recipients is the JSON array of phone numbers a campaign-resource create operation should send the chosen template to.

Why it matters: This is the audience for a bulk template send; the node loops through this list and sends one message per entry.

When to fill it: Fill it whenever Operation is create (campaign resource).

What to enter: A JSON array of phone numbers in E.164 format.

Where the value comes from: A CSV import, CRM segment export, or database query of opted-in customers. Map it with {{$json.recipientPhones}} if a previous step already built the list.

How to use it later: The response reports counts you can log or branch on with {{$json.sent}}, {{$json.failed}}, and {{$json.total}}.

Accepted format: Valid JSON array of E.164 phone number strings, for example ["+14155552671","+919876543210"].

Real workplace example: Sending a "flash sale" template to 500 opted-in customer numbers pulled from a marketing segment export.

If it is empty or wrong: The node returns a missing-field error, or an empty array results in {{$json.total}} equal to 0 with nothing sent.

Common mistake: Including numbers that have not opted in to marketing messages, which risks WhatsApp quality-rating penalties for your business number.`;

const limitHelpText = `What this field means: Limit is the maximum number of records returned by a single page of a list or search call, used across contact search, conversation list, template list, and campaign list.

Why it matters: WhatsApp and Meta Graph API results are paginated; Limit controls how many records come back in one call.

When to fill it: Fill it whenever you want a specific page size; leave it blank to use the runtime default of 20.

What to enter: A whole number, typically between 1 and 100 depending on the endpoint.

Where the value comes from: Decide based on how many records your workflow needs at once, balancing completeness against response size.

How to use it later: The returned data array will contain at most this many records; use After with the next page cursor to continue.

Accepted format: A positive whole number.

Real workplace example: Setting Limit to 50 when pulling recent conversations for a daily support digest.

If it is empty or wrong: A blank value falls back to the default of 20. A very large value may be capped by Meta regardless of what you enter.

Common mistake: Assuming Limit returns "all matching records"; it only controls one page. Returns All is not actually implemented in this runtime version, so use After to page through more results instead.`;

const afterHelpText = `What this field means: After is the pagination cursor used to fetch the next page of results for conversation list, following Meta's standard Graph API paging.

Why it matters: List calls do not return every record at once; After tells Meta where the previous page left off.

When to fill it: Fill it only when paging through results beyond the first page; leave it blank for the first call.

What to enter: The cursor string returned in a previous response's paging.cursors.after field.

Where the value comes from: Map {{$json.paging.cursors.after}} from the previous list call's output.

How to use it later: The next response's data array continues from where this cursor left off, and includes its own new paging.cursors.after for further pages.

Accepted format: An opaque cursor string exactly as returned by Meta; do not modify it.

Real workplace example: A nightly job pages through all conversations by repeatedly feeding the previous response's cursor back into After until no further cursor is returned.

If it is empty or wrong: Leaving it blank returns the first page. An invalid or expired cursor causes Meta to return an error or an empty page.

Common mistake: Reusing an old cursor from a much earlier run instead of the one from the immediately preceding call in the same paging loop.`;

const returnAllHelpText = `What this field means: Return All is a schema flag intended to fetch every page of results, ignoring Limit.

Why it matters: As implemented in this runtime version, Return All is accepted as a field but is not yet wired into the pagination logic, so it currently has no effect.

When to fill it: There is no working reason to fill it today. Use Limit and After to page through results manually instead.

What to enter: If set, use true or false, but expect no behavior change either way.

Where the value comes from: Not applicable; this is a placeholder field reserved for a future runtime update.

How to use it later: The response is not affected by this field. Continue reading Limit and After's cursor behavior for pagination.

Accepted format: Boolean true or false.

Real workplace example: None currently; teams needing every record should loop the workflow using After until no further cursor is returned.

If it is empty or wrong: There is no observable difference; list/search operations still respect Limit and return one page per call regardless of this value.

Common mistake: Assuming setting Return All to true will fetch every record in one call; it will not, and your workflow will still only receive one page sized by Limit.`;

// ─── Small helper to keep the 29 operations below readable ───

function fld(
  name: string,
  internalKey: string,
  type: FieldDoc['type'],
  required: boolean,
  description: string,
  helpText: string,
  extra?: Partial<FieldDoc>,
): FieldDoc {
  return { name, internalKey, type, required, description, helpText, ...extra };
}

const resourceField = (defaultValue: string) =>
  fld('Resource', 'resource', 'select', true, 'WhatsApp resource to act on.', resourceHelpText, {
    options: ['message', 'contact', 'conversation', 'template', 'campaign', 'aiAgent'],
    defaultValue,
    placeholder: defaultValue,
    example: defaultValue,
  });

const messageOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'Message action to run.', messageOperationHelpText, {
    options: ['sendText', 'sendMedia', 'sendLocation', 'sendContact', 'sendTemplate', 'sendInteractiveButtons', 'sendInteractiveList', 'sendInteractiveCTA', 'markAsRead'],
    defaultValue: value,
    example: value,
  });

const contactOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'Contact action to run.', contactOperationHelpText, {
    options: ['create', 'update', 'delete', 'search', 'addLabel', 'removeLabel'],
    defaultValue: value,
    example: value,
  });

const conversationOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'Conversation action to run.', conversationOperationHelpText, {
    options: ['list', 'get', 'close', 'archive', 'markAsRead'],
    defaultValue: value,
    example: value,
  });

const templateOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'Template action to run.', templateOperationHelpText, {
    options: ['list', 'get', 'create', 'delete'],
    defaultValue: value,
    example: value,
  });

const campaignOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'Campaign action to run.', campaignOperationHelpText, {
    options: ['create', 'list'],
    defaultValue: value,
    example: value,
  });

const aiAgentOperationField = (value: string) =>
  fld('Operation', 'operation', 'select', true, 'AI Agent action to run.', aiAgentOperationHelpText, {
    options: ['enable', 'disable', 'getSuggestions'],
    defaultValue: value,
    example: value,
  });

const phoneNumberIdField = fld('Phone Number ID', 'phoneNumberId', 'string', false, 'WhatsApp Business Phone Number ID (auto-resolved if omitted).', phoneNumberIdHelpText, { placeholder: '123456789012345', example: '123456789012345' });
const businessAccountIdField = fld('Business Account ID', 'businessAccountId', 'string', false, 'WhatsApp Business Account (WABA) ID (auto-resolved if omitted).', businessAccountIdHelpText, { placeholder: '123456789012345', example: '123456789012345' });
const toField = (required: boolean) => fld('To', 'to', 'string', required, 'Recipient phone number in E.164 format.', toHelpText, { placeholder: '{{$json.chatId}}', example: '{{$json.customerPhone}}' });
const messageIdField = fld('Message ID', 'messageId', 'string', true, 'Incoming WhatsApp message ID to mark as read.', messageIdHelpText, { placeholder: '{{$json.messageId}}', example: '{{$json.messageId}}' });

// ─── Node documentation ───

export const whatsappDoc: NodeDoc = {
  slug: 'whatsapp',
  displayName: 'WhatsApp',
  category: 'Communication',
  logoUrl: '/icons/nodes/whatsapp.svg',
  description: 'Send WhatsApp messages, media, locations, contact cards, templates, and interactive buttons/lists through the WhatsApp Business Cloud API, and manage contacts, conversations, templates, campaigns, and AI Agent assistance for advanced or AI-generated workflows.',
  credentialType: 'WhatsApp Business API - a Facebook/Meta OAuth connection with WhatsApp Business permissions, saved in Connections and used for every WhatsApp Cloud API call',
  credentialSetupSteps: [
    'Create or open a Meta Business Account at business.facebook.com and a verified business phone number for WhatsApp.',
    'Go to developers.facebook.com, create or select an app, then add the WhatsApp product and open API Setup to find your Phone Number ID (a long numeric string such as 123456789012345 - not your actual phone number).',
    'In CtrlChecks, open Connections -> Add Connection -> WhatsApp and connect through the Facebook/Meta OAuth flow so a token with whatsapp_business_messaging and whatsapp_business_management scopes is saved for you, or paste a permanent System User access token and Phone Number ID if your workspace uses the manual credential form.',
    'The access token, refresh token, and phone number metadata are stored in the credential vault. Do not paste an access token, apiKey, or client secret into normal WhatsApp node fields such as To, Message, or Template Name.',
    'Get at least one message template approved in Meta Business Suite -> WhatsApp -> Message Templates before sending to new contacts; template approval typically takes 24-48 hours.',
    'Use Send Text for replies inside the 24-hour customer service window that opens after a customer messages you, and Send Template to start a conversation or to message outside that window.',
    'Connect the WhatsApp node output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.messages}}, {{$json.contacts}}, {{$json.success}}, {{$json._error}}, or {{$json._errorDetails}}.',
    'Downstream service node account connection setup is still required for nodes after WhatsApp; the WhatsApp connection only authorizes WhatsApp Cloud API calls.',
  ],
  credentialDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  resources: [
    {
      name: 'Message',
      description: 'Send and manage individual WhatsApp messages: text, media, location, contact cards, approved templates, interactive buttons/lists/CTA, and mark-as-read receipts. This is the only resource currently selectable in the visual node panel; Operation below controls which message action runs.',
      operations: [
        {
          name: 'Send Text',
          value: 'sendText',
          description: 'Sends a free-form text message to a WhatsApp number. Only allowed within the 24-hour customer service window that opens after the customer messages your business; use Send Template to start a conversation or to message outside that window.',
          fields: [
            resourceField('message'),
            messageOperationField('sendText'),
            phoneNumberIdField,
            toField(true),
            fld('Message', 'text', 'textarea', true, 'The free-form text the recipient reads.', textHelpText, { placeholder: 'Hello {{$json.name}}, your delivery is arriving today between 2-4 PM.', example: 'Hello {{$json.name}}, your delivery is arriving today between 2-4 PM. Track it here: {{$json.trackingUrl}}' }),
            fld('Show Link Preview', 'previewUrl', 'boolean', false, 'Whether WhatsApp renders a preview card for the first link in Message.', previewUrlHelpText, { defaultValue: 'false', example: 'false' }),
          ],
          outputExample: {
            customerPhone: '+14155552671',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI5QTQ0RUY4RkVBM0NBOEQ3NzQA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts (the resolved recipient wa_id), and messages[0].id (the WhatsApp message id). On failure, the node instead returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. Later nodes can map {{$json.messages[0].id}} to log or track this specific message. resource and operation describe what ran; error carries failure details when success is false.',
          usageExample: {
            scenario: 'Reply to a customer inside the 24-hour window after their WhatsApp Trigger message with an AI Agent-drafted answer',
            inputValues: { resource: 'message', operation: 'sendText', to: '{{$json.chatId}}', text: '{{$json.aiResponse}}', previewUrl: 'false' },
            expectedOutput: 'WhatsApp delivers the reply. A later logging or CRM node can use {{$json.messages[0].id}}, {{$json.success}}, and {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages',
        },
        {
          name: 'Send Media',
          value: 'sendMedia',
          description: 'Sends an image, video, audio file, document, or sticker to a WhatsApp number, either from a public URL or a previously uploaded Meta Media ID, with an optional caption for image and document types.',
          fields: [
            resourceField('message'),
            messageOperationField('sendMedia'),
            phoneNumberIdField,
            toField(true),
            fld('Media Type', 'mediaType', 'select', false, 'Kind of file being sent.', mediaTypeHelpText, { options: ['image', 'video', 'audio', 'document', 'sticker'], defaultValue: 'image', example: 'document' }),
            fld('Media URL', 'mediaUrl', 'url', false, 'Public HTTPS link to the file.', mediaUrlHelpText, { placeholder: 'https://cdn.example.com/invoice.pdf', example: '{{$json.invoicePdfUrl}}' }),
            fld('Media ID', 'mediaId', 'string', false, 'Meta media id from a previous upload, as an alternative to Media URL.', mediaIdHelpText, { example: '{{$json.mediaId}}' }),
            fld('Caption', 'caption', 'string', false, 'Optional text shown under image/document media.', captionHelpText, { example: 'Invoice {{$json.invoiceNumber}} for {{$json.customerName}}' }),
          ],
          outputExample: {
            customerPhone: '+14155552671',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBJDMkYzNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. Later nodes can map {{$json.messages[0].id}} for delivery tracking. resource and operation describe what ran; data/output/result correspond to the same Meta response object depending on which alias the next node reads.',
          usageExample: {
            scenario: 'Send a PDF invoice generated after checkout to the customer on WhatsApp',
            inputValues: { resource: 'message', operation: 'sendMedia', to: '{{$json.customerPhone}}', mediaType: 'document', mediaUrl: '{{$json.invoicePdfUrl}}', caption: 'Invoice {{$json.invoiceNumber}}' },
            expectedOutput: 'The customer receives the PDF. A later node can use {{$json.messages[0].id}} and {{$json._error}} to confirm delivery.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#media-messages',
        },
        {
          name: 'Send Location',
          value: 'sendLocation',
          description: 'Shares a map pin with the recipient, including coordinates and an optional name and address, useful for store pickup, delivery, or event locations.',
          fields: [
            resourceField('message'),
            messageOperationField('sendLocation'),
            phoneNumberIdField,
            toField(true),
            fld('Latitude', 'latitude', 'number', true, 'Decimal latitude of the pin.', latitudeHelpText, { example: '12.9716' }),
            fld('Longitude', 'longitude', 'number', true, 'Decimal longitude of the pin.', longitudeHelpText, { example: '77.5946' }),
            fld('Location Name', 'locationName', 'string', false, 'Short label shown above the pin.', locationNameHelpText, { example: 'Main Store - Sector 5' }),
            fld('Address', 'address', 'string', false, 'Full street address shown under the location name.', addressHelpText, { example: '221B Baker Street, London, NW1 6XE' }),
          ],
          outputExample: {
            customerPhone: '+919876543210',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+919876543210', wa_id: '919876543210' }],
            messages: [{ id: 'wamid.HBgLOTE5ODc2NTQzMjEVAgARGBJDMkYzNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. Later nodes can map {{$json.messages[0].id}} for delivery tracking.',
          usageExample: {
            scenario: 'Answer a customer asking where the nearest pickup point is by sending the warehouse location',
            inputValues: { resource: 'message', operation: 'sendLocation', to: '{{$json.chatId}}', latitude: '12.9716', longitude: '77.5946', locationName: 'Main Warehouse' },
            expectedOutput: 'The customer sees a tappable map pin. A later node can use {{$json.messages[0].id}} and {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#location-messages',
        },
        {
          name: 'Send Contact Card',
          value: 'sendContact',
          description: 'Shares one or more WhatsApp contact cards with the recipient, such as a sales rep or support agent, using Meta\'s structured contacts message format.',
          fields: [
            resourceField('message'),
            messageOperationField('sendContact'),
            phoneNumberIdField,
            toField(true),
            fld('Contacts (JSON)', 'contacts', 'json', true, 'Meta contact-card objects to send.', contactsHelpText, { placeholder: '[{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]', example: '[{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]' }),
          ],
          outputExample: {
            customerPhone: '+14155552671',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI0QjRDNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts (the resolved recipient), and messages[0].id (the sent contact card message). On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Share a sales representative\'s contact card when a customer asks who to contact about a bulk order',
            inputValues: { resource: 'message', operation: 'sendContact', to: '{{$json.chatId}}', contacts: '[{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]' },
            expectedOutput: 'The customer receives a tappable contact card. A later node can use {{$json.messages[0].id}} and {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#contacts-messages',
        },
        {
          name: 'Send Template',
          value: 'sendTemplate',
          description: 'Sends a pre-approved Meta message template, filling in any placeholder variables. Required to start a new conversation with a customer or to message outside the 24-hour customer service window.',
          fields: [
            resourceField('message'),
            messageOperationField('sendTemplate'),
            phoneNumberIdField,
            toField(true),
            fld('Template Name', 'templateName', 'string', true, 'Exact name of the approved template.', templateNameHelpText, { placeholder: 'order_confirmation', example: 'order_confirmation' }),
            fld('Language', 'language', 'string', true, 'Language code the template was approved in.', languageHelpText, { placeholder: 'en_US', example: 'en_US' }),
            fld('Template Components (JSON)', 'templateComponents', 'json', false, 'Values filling the template\'s placeholder variables.', templateComponentsHelpText, { placeholder: '[{"type":"body","parameters":[{"type":"text","text":"{{$json.customerName}}"}]}]', example: '[{"type":"body","parameters":[{"type":"text","text":"{{$json.orderId}}"},{"type":"text","text":"{{$json.deliveryDate}}"}]}]' }),
            fld('Known Template Status (optional)', 'templateStatus', 'string', false, 'Local pre-flight check that the template is APPROVED.', templateStatusHelpText, { placeholder: 'APPROVED', example: 'APPROVED' }),
          ],
          outputExample: {
            customerPhone: '+14155552671',
            orderId: 'ORD-1048',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI5RjhFNzY3RUY4RkVBM0NBOEQA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure (for example an unapproved template), the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails describing the template problem.',
          usageExample: {
            scenario: 'Send an order confirmation template immediately after a Shopify purchase, before any free-form reply is allowed',
            inputValues: { resource: 'message', operation: 'sendTemplate', to: '{{$json.customerPhone}}', templateName: 'order_confirmation', language: 'en_US', templateComponents: '[{"type":"body","parameters":[{"type":"text","text":"{{$json.orderId}}"}]}]', templateStatus: 'APPROVED' },
            expectedOutput: 'The customer receives the templated confirmation. A later node can use {{$json.messages[0].id}} and {{$json._error}} to confirm delivery.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#template-messages',
        },
        {
          name: 'Send Interactive Buttons',
          value: 'sendInteractiveButtons',
          description: 'Sends a message with up to 3 tappable reply buttons, optionally with a header and footer, so the customer can respond with a single tap instead of typing.',
          fields: [
            resourceField('message'),
            messageOperationField('sendInteractiveButtons'),
            phoneNumberIdField,
            toField(true),
            fld('Body Text', 'bodyText', 'textarea', true, 'Main message shown above the buttons.', bodyTextHelpText, { example: 'Your order {{$json.orderId}} is ready. What would you like to do next?' }),
            fld('Header Text', 'headerText', 'string', false, 'Optional bold title above Body Text.', headerTextHelpText, { example: 'Order {{$json.orderId}}' }),
            fld('Footer Text', 'footerText', 'string', false, 'Optional small note below the buttons.', footerTextHelpText, { example: 'Reply within 24 hours' }),
            fld('Buttons (JSON)', 'buttons', 'json', true, 'Up to 3 reply buttons.', buttonsHelpText, { placeholder: '[{"type":"reply","reply":{"id":"confirm","title":"Confirm"}},{"type":"reply","reply":{"id":"cancel","title":"Cancel"}}]', example: '[{"type":"reply","reply":{"id":"confirm","title":"Confirm"}},{"type":"reply","reply":{"id":"reschedule","title":"Reschedule"}}]' }),
          ],
          outputExample: {
            customerPhone: '+14155552671',
            orderId: 'ORD-1048',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI3QjJDNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. The customer\'s tap later arrives through WhatsApp Trigger with the matching button id.',
          usageExample: {
            scenario: 'Ask a customer to confirm or reschedule an appointment with one tap',
            inputValues: { resource: 'message', operation: 'sendInteractiveButtons', to: '{{$json.chatId}}', bodyText: 'Your appointment is tomorrow at 3 PM. Confirm or reschedule?', headerText: 'Appointment Reminder', footerText: '', buttons: '[{"type":"reply","reply":{"id":"confirm","title":"Confirm"}},{"type":"reply","reply":{"id":"reschedule","title":"Reschedule"}}]' },
            expectedOutput: 'The customer sees tappable buttons. A later WhatsApp Trigger and Switch node can branch on the returned button id, and this node\'s {{$json.messages[0].id}} confirms delivery.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object',
        },
        {
          name: 'Send Interactive List',
          value: 'sendInteractiveList',
          description: 'Sends a message with a single button that opens a scrollable list of grouped options, useful for menus, plan choices, or catalogs with more than 3 options.',
          fields: [
            resourceField('message'),
            messageOperationField('sendInteractiveList'),
            phoneNumberIdField,
            toField(true),
            fld('Body Text', 'bodyText', 'textarea', true, 'Main message shown above the list button.', bodyTextHelpText, { example: 'Choose a plan that fits your team.' }),
            fld('List Button Text', 'buttonText', 'string', true, 'Label on the button that opens the list.', buttonTextHelpText, { example: 'Select a Plan' }),
            fld('List Sections (JSON)', 'sections', 'json', true, 'Grouped, selectable rows shown in the list.', sectionsHelpText, { placeholder: '[{"title":"Plans","rows":[{"id":"basic","title":"Basic","description":"$10/month"},{"id":"pro","title":"Pro","description":"$25/month"}]}]', example: '[{"title":"Plans","rows":[{"id":"basic","title":"Basic","description":"$10/month"},{"id":"pro","title":"Pro","description":"$25/month"}]}]' }),
          ],
          outputExample: {
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI5QjJDNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. The customer\'s tap later arrives through WhatsApp Trigger with the matching row id.',
          usageExample: {
            scenario: 'Let a customer pick a subscription plan from a WhatsApp list instead of visiting the pricing page',
            inputValues: { resource: 'message', operation: 'sendInteractiveList', to: '{{$json.chatId}}', bodyText: 'Choose a plan that fits your team.', buttonText: 'Select a Plan', sections: '[{"title":"Plans","rows":[{"id":"basic","title":"Basic","description":"$10/month"},{"id":"pro","title":"Pro","description":"$25/month"}]}]' },
            expectedOutput: 'The customer opens the list and taps a plan. A later Switch node can branch on the returned row id, and {{$json.messages[0].id}} confirms delivery.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object',
        },
        {
          name: 'Send Interactive CTA Button',
          value: 'sendInteractiveCTA',
          description: 'Sends a message with a single button that opens a web page, useful for order tracking, payment links, or booking pages, instead of a reply id.',
          fields: [
            resourceField('message'),
            messageOperationField('sendInteractiveCTA'),
            phoneNumberIdField,
            toField(true),
            fld('Body Text', 'bodyText', 'textarea', true, 'Main message shown above the CTA button.', bodyTextHelpText, { example: 'Your order {{$json.orderId}} has shipped.' }),
            fld('CTA Button (JSON)', 'ctaUrl', 'json', true, 'Button label and destination URL.', ctaUrlHelpText, { placeholder: '{"display_text":"Track Order","url":"https://example.com/track/{{$json.orderId}}"}', example: '{"display_text":"Track Order","url":"https://example.com/track/{{$json.orderId}}"}' }),
          ],
          outputExample: {
            orderId: 'ORD-1048',
            messaging_product: 'whatsapp',
            contacts: [{ input: '+14155552671', wa_id: '14155552671' }],
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzEVAgARGBI3QzJDNzZFNzY3RUY4RkEA' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds the raw Meta send-message response: messaging_product, contacts, and messages[0].id. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. There is no reply id since the button opens a URL instead of sending a message back.',
          usageExample: {
            scenario: 'Send a tracking link the moment an order ships',
            inputValues: { resource: 'message', operation: 'sendInteractiveCTA', to: '{{$json.customerPhone}}', bodyText: 'Your order {{$json.orderId}} has shipped.', ctaUrl: '{"display_text":"Track Order","url":"{{$json.trackingUrl}}"}' },
            expectedOutput: 'The customer taps the button and opens the tracking page. A later node can use {{$json.messages[0].id}} and {{$json._error}} to confirm delivery.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#interactive-object',
        },
        {
          name: 'Mark as Read',
          value: 'markAsRead',
          description: 'Marks a single incoming customer message as read, showing the blue double-check in the customer\'s WhatsApp chat.',
          fields: [
            resourceField('message'),
            messageOperationField('markAsRead'),
            phoneNumberIdField,
            messageIdField,
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true, matching Meta\'s mark-as-read acknowledgement. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. There is no message id or data payload beyond the success flag.',
          usageExample: {
            scenario: 'Mark an incoming customer question as read as soon as a support workflow starts processing it, before an AI Agent drafts a reply',
            inputValues: { resource: 'message', operation: 'markAsRead', messageId: '{{$json.messageId}}' },
            expectedOutput: 'The customer sees their message marked read. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/mark-message-as-read',
        },
      ],
    },
    {
      name: 'Contact',
      description: 'Create, update, delete, search, and label saved WhatsApp contact records on your Business Account. Not yet selectable in the visual Resource dropdown; reachable through AI-generated workflows or a manually edited workflow configuration. Contact management depends on your Meta Business Account having this capability enabled, and response shapes may vary if it is not.',
      operations: [
        {
          name: 'Create Contact',
          value: 'create',
          description: 'Adds a new saved contact record to your WhatsApp Business Account with a name, phone number, and optional email, so your team can recognize and label the person in later conversations.',
          fields: [
            resourceField('contact'),
            contactOperationField('create'),
            businessAccountIdField,
            fld('Contact Name', 'contactName', 'string', true, 'Display name for the new contact.', contactNameHelpText, { example: 'Alice Kumar' }),
            fld('Contact Phone', 'contactPhone', 'string', true, 'Phone number in E.164 format.', contactPhoneHelpText, { example: '+919876543210' }),
            fld('Contact Email', 'contactEmail', 'email', false, 'Optional email address for the contact.', contactEmailHelpText, { example: 'alice@example.com' }),
          ],
          outputExample: { id: '120211000000000' },
          outputDescription: 'On success, the node keeps incoming data and adds id, the new Meta-assigned Contact ID your workflow should save for later update, delete, addLabel, or removeLabel calls. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Save a new WhatsApp inquiry as a contact record when no matching CRM record exists',
            inputValues: { resource: 'contact', operation: 'create', contactName: '{{$json.customerName}}', contactPhone: '{{$json.customerPhone}}', contactEmail: '{{$json.customerEmail}}' },
            expectedOutput: 'A new contact is saved. A later addLabel step can use {{$json.id}} to tag it, and {{$json._error}} reports failures.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Update Contact',
          value: 'update',
          description: 'Changes the name, phone number, or email on an existing saved contact record identified by Contact ID.',
          fields: [
            resourceField('contact'),
            contactOperationField('update'),
            fld('Contact ID', 'contactId', 'string', true, 'Existing contact to update.', contactIdHelpText, { example: '{{$json.id}}' }),
            fld('Contact Name', 'contactName', 'string', false, 'New display name, if changing.', contactNameHelpText, { example: 'Alice Kumar-Singh' }),
            fld('Contact Phone', 'contactPhone', 'string', false, 'New phone number, if changing.', contactPhoneHelpText, { example: '+919876543210' }),
            fld('Contact Email', 'contactEmail', 'email', false, 'New email address, if changing.', contactEmailHelpText, { example: 'alice.singh@example.com' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when Contact ID does not exist.',
          usageExample: {
            scenario: 'Update a contact\'s saved email address after they provide it during a support conversation',
            inputValues: { resource: 'contact', operation: 'update', contactId: '{{$json.id}}', contactEmail: '{{$json.newEmail}}' },
            expectedOutput: 'The contact record is updated. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Delete Contact',
          value: 'delete',
          description: 'Removes a saved contact record identified by Contact ID from your WhatsApp Business Account, permanently deleting its name, phone, email, and labels.',
          fields: [
            resourceField('contact'),
            contactOperationField('delete'),
            fld('Contact ID', 'contactId', 'string', true, 'Existing contact to remove.', contactIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when Contact ID does not exist or was already removed.',
          usageExample: {
            scenario: 'Remove a saved contact record after a customer asks to be forgotten',
            inputValues: { resource: 'contact', operation: 'delete', contactId: '{{$json.id}}' },
            expectedOutput: 'The contact record is removed. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Search Contacts',
          value: 'search',
          description: 'Looks up saved contact records by phone number or name, useful before deciding whether to create a new contact or reuse an existing one.',
          fields: [
            resourceField('contact'),
            contactOperationField('search'),
            businessAccountIdField,
            fld('Contact Phone', 'contactPhone', 'string', false, 'Phone number to search for.', contactPhoneHelpText, { example: '{{$json.customerPhone}}' }),
            fld('Contact Name', 'contactName', 'string', false, 'Name to search for if Contact Phone is not known.', contactNameHelpText, { example: '{{$json.customerName}}' }),
            fld('Limit', 'limit', 'number', false, 'Maximum number of matching contacts to return.', limitHelpText, { defaultValue: '20', example: '20' }),
          ],
          outputExample: {
            data: [{ id: '120211000000000', name: 'Alice Kumar', phone: '+919876543210' }],
            paging: { cursors: { before: 'QVFI...', after: 'QVFI...' } },
          },
          outputDescription: 'On success, the node keeps incoming data and adds data (an array of matching contact records) and paging.cursors for further pages. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails. An empty data array means no match was found; the workflow should then run Create Contact.',
          usageExample: {
            scenario: 'Check whether a customer already has a saved contact record before creating a duplicate',
            inputValues: { resource: 'contact', operation: 'search', contactPhone: '{{$json.customerPhone}}', limit: '20' },
            expectedOutput: 'If {{$json.data}} has a match, reuse its id; if empty, branch to Create Contact instead.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Add Label',
          value: 'addLabel',
          description: 'Attaches one or more labels to a saved contact, such as "vip" or "new-lead", so your team can segment and filter contacts.',
          fields: [
            resourceField('contact'),
            contactOperationField('addLabel'),
            fld('Contact ID', 'contactId', 'string', true, 'Existing contact to label.', contactIdHelpText, { example: '{{$json.id}}' }),
            fld('Labels (JSON)', 'labels', 'json', true, 'Labels to attach.', labelsHelpText, { placeholder: '["vip","new-lead"]', example: '["new-lead"]' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Tag a freshly created contact as "new-lead" for the sales team\'s WhatsApp segment',
            inputValues: { resource: 'contact', operation: 'addLabel', contactId: '{{$json.id}}', labels: '["new-lead"]' },
            expectedOutput: 'The label is attached. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Remove Label',
          value: 'removeLabel',
          description: 'Removes one or more labels from a saved contact, such as clearing "new-lead" once they become a paying customer.',
          fields: [
            resourceField('contact'),
            contactOperationField('removeLabel'),
            fld('Contact ID', 'contactId', 'string', true, 'Existing contact to unlabel.', contactIdHelpText, { example: '{{$json.id}}' }),
            fld('Labels (JSON)', 'labels', 'json', true, 'Labels to remove.', labelsHelpText, { placeholder: '["new-lead"]', example: '["new-lead"]' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Remove the "new-lead" label once a contact completes their first purchase',
            inputValues: { resource: 'contact', operation: 'removeLabel', contactId: '{{$json.id}}', labels: '["new-lead"]' },
            expectedOutput: 'The label is removed. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
      ],
    },
    {
      name: 'Conversation',
      description: 'List, inspect, close, archive, and mark WhatsApp conversation threads as read. Not yet selectable in the visual Resource dropdown; reachable through AI-generated workflows or a manually edited workflow configuration. Conversation management depends on your Meta Business Account having this capability enabled, and response shapes may vary if it is not.',
      operations: [
        {
          name: 'List Conversations',
          value: 'list',
          description: 'Returns a page of WhatsApp conversation threads for the connected phone number, useful for building a daily support queue digest or auditing open conversations.',
          fields: [
            resourceField('conversation'),
            conversationOperationField('list'),
            phoneNumberIdField,
            fld('Limit', 'limit', 'number', false, 'Maximum number of conversations to return.', limitHelpText, { defaultValue: '20', example: '50' }),
            fld('After', 'after', 'string', false, 'Pagination cursor from a previous list call.', afterHelpText, { example: '{{$json.paging.cursors.after}}' }),
            fld('Return All', 'returnAll', 'boolean', false, 'Schema flag reserved for auto-pagination; not yet implemented.', returnAllHelpText, { defaultValue: 'false', example: 'false' }),
          ],
          outputExample: {
            data: [{ id: '3400000000000000', status: 'open', updated_time: '2026-07-18T09:00:00+0000' }],
            paging: { cursors: { before: 'QVFI...', after: 'QVFI...' }, next: 'https://graph.facebook.com/v18.0/...' },
          },
          outputDescription: 'On success, the node keeps incoming data and adds data (an array of conversation summaries) and paging.cursors/next for further pages. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Build a daily digest of conversations with no reply in the last 30 days',
            inputValues: { resource: 'conversation', operation: 'list', limit: '50', after: '' },
            expectedOutput: 'A later Loop node can iterate {{$json.data}} and archive stale conversations by id.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Get Conversation',
          value: 'get',
          description: 'Fetches one conversation\'s messages and participants by Conversation ID, useful for showing a full thread history to a human agent.',
          fields: [
            resourceField('conversation'),
            conversationOperationField('get'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to fetch.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: {
            id: '3400000000000000',
            status: 'open',
            messages: [{ id: 'wamid.HBgLMTQxNTU1NTI2NzE', from: '14155552671', text: 'Can you help me?' }],
            participants: [{ wa_id: '14155552671' }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds id, status, messages (the thread history), and participants. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Show the full conversation history to a support agent before they take over from an AI Agent',
            inputValues: { resource: 'conversation', operation: 'get', conversationId: '{{$json.id}}' },
            expectedOutput: 'The agent panel renders {{$json.messages}}. A later node can branch on {{$json.status}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Close Conversation',
          value: 'close',
          description: 'Marks a conversation as resolved, useful when a support issue has been fully answered and no further follow-up is expected from either side.',
          fields: [
            resourceField('conversation'),
            conversationOperationField('close'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to close.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Automatically close a conversation once a linked support ticket is marked resolved',
            inputValues: { resource: 'conversation', operation: 'close', conversationId: '{{$json.id}}' },
            expectedOutput: 'The conversation is marked resolved. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Archive Conversation',
          value: 'archive',
          description: 'Moves a conversation out of the active list without deleting its history, useful for cleaning up an inbox of stale threads.',
          fields: [
            resourceField('conversation'),
            conversationOperationField('archive'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to archive.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Archive every conversation with no reply in 30 days after a nightly List Conversations scan',
            inputValues: { resource: 'conversation', operation: 'archive', conversationId: '{{$json.id}}' },
            expectedOutput: 'The conversation is archived. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Mark Conversation as Read',
          value: 'markAsRead',
          description: 'Clears the unread indicator on an entire conversation thread, useful when an agent opens a thread that had several unread customer messages.',
          fields: [
            resourceField('conversation'),
            conversationOperationField('markAsRead'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to mark as read.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Mark a whole thread as read the moment a support agent opens it in an internal dashboard',
            inputValues: { resource: 'conversation', operation: 'markAsRead', conversationId: '{{$json.id}}' },
            expectedOutput: 'The thread is marked read. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
      ],
    },
    {
      name: 'Template',
      description: 'List, look up, submit, and delete Meta message templates. Not yet selectable in the visual Resource dropdown; reachable through AI-generated workflows or a manually edited workflow configuration.',
      operations: [
        {
          name: 'List Templates',
          value: 'list',
          description: 'Returns a page of message templates on your WhatsApp Business Account along with their approval status, useful for auditing which templates are ready to use.',
          fields: [
            resourceField('template'),
            templateOperationField('list'),
            businessAccountIdField,
            fld('Limit', 'limit', 'number', false, 'Maximum number of templates to return.', limitHelpText, { defaultValue: '20', example: '20' }),
          ],
          outputExample: {
            data: [{ id: '9000000000000', name: 'order_confirmation', language: 'en_US', category: 'UTILITY', status: 'APPROVED' }],
            paging: { cursors: { before: 'QVFI...', after: 'QVFI...' } },
          },
          outputDescription: 'On success, the node keeps incoming data and adds data (an array of template records with name, language, category, and status) and paging.cursors for further pages. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Audit which templates are currently APPROVED before planning a campaign',
            inputValues: { resource: 'template', operation: 'list', limit: '20' },
            expectedOutput: 'A later Filter node can keep only entries in {{$json.data}} where status equals APPROVED.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
        },
        {
          name: 'Get Template',
          value: 'get',
          description: 'Looks up one message template by name, including its current approval status and component structure, useful for confirming a template is ready before sending it.',
          fields: [
            resourceField('template'),
            templateOperationField('get'),
            businessAccountIdField,
            fld('Template Name', 'templateName', 'string', true, 'Exact template name to look up.', templateNameHelpText, { example: 'order_confirmation' }),
          ],
          outputExample: {
            data: [{ id: '9000000000000', name: 'order_confirmation', language: 'en_US', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text: 'Your order {{1}} is confirmed.' }] }],
          },
          outputDescription: 'On success, the node keeps incoming data and adds data (matching template records with status and components). On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when no template matches that name.',
          usageExample: {
            scenario: 'Confirm order_confirmation is APPROVED before a checkout workflow tries to send it',
            inputValues: { resource: 'template', operation: 'get', templateName: 'order_confirmation' },
            expectedOutput: 'A later If/Else node can branch on whether {{$json.data[0].status}} equals APPROVED before running Send Template.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
        },
        {
          name: 'Create Template',
          value: 'create',
          description: 'Submits a new message template to Meta for review. Approval typically takes 24-48 hours; the template cannot be used to send messages until its status becomes APPROVED.',
          fields: [
            resourceField('template'),
            templateOperationField('create'),
            businessAccountIdField,
            fld('Template Name', 'templateName', 'string', true, 'Unique technical name for the new template.', templateNameHelpText, { example: 'shipping_delay_notice' }),
            fld('Language', 'language', 'string', true, 'Language code the template is written in.', languageHelpText, { example: 'en_US' }),
            fld('Template Category', 'templateCategory', 'select', true, 'How Meta classifies this template.', templateCategoryHelpText, { options: ['MARKETING', 'UTILITY', 'AUTHENTICATION'], example: 'UTILITY' }),
            fld('Template Components (JSON)', 'templateComponents', 'json', true, 'Header/body/button structure and placeholder variables.', templateComponentsHelpText, { placeholder: '[{"type":"BODY","text":"Your order {{1}} is delayed until {{2}}."}]', example: '[{"type":"BODY","text":"Your order {{1}} is delayed until {{2}}."}]' }),
          ],
          outputExample: { id: '9000000000001', status: 'PENDING', category: 'UTILITY' },
          outputDescription: 'On success, the node keeps incoming data and adds id (the new template id), status (typically PENDING while Meta reviews it), and category. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when the name is already used or the content does not match the declared category.',
          usageExample: {
            scenario: 'Submit a new shipping-delay notice template for review before the holiday season',
            inputValues: { resource: 'template', operation: 'create', templateName: 'shipping_delay_notice', language: 'en_US', templateCategory: 'UTILITY', templateComponents: '[{"type":"BODY","text":"Your order {{1}} is delayed until {{2}}."}]' },
            expectedOutput: 'Meta accepts the submission for review. A later Template Get step can poll {{$json.status}} until it becomes APPROVED.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
        },
        {
          name: 'Delete Template',
          value: 'delete',
          description: 'Removes a message template by name from your WhatsApp Business Account so it can no longer be used to send messages.',
          fields: [
            resourceField('template'),
            templateOperationField('delete'),
            businessAccountIdField,
            fld('Template Name', 'templateName', 'string', true, 'Exact template name to remove.', templateNameHelpText, { example: 'old_promo_2024' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when no template matches that name.',
          usageExample: {
            scenario: 'Remove an outdated seasonal promotion template that should no longer be sendable',
            inputValues: { resource: 'template', operation: 'delete', templateName: 'old_promo_2024' },
            expectedOutput: 'The template is deleted. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
        },
      ],
    },
    {
      name: 'Campaign',
      description: 'Send an approved template to many recipients at once, or list past campaigns. Not yet selectable in the visual Resource dropdown; reachable through AI-generated workflows or a manually edited workflow configuration.',
      operations: [
        {
          name: 'Create Campaign',
          value: 'create',
          description: 'Sends an approved message template to every phone number in Recipients, one WhatsApp message per number, and reports how many succeeded and failed.',
          fields: [
            resourceField('campaign'),
            campaignOperationField('create'),
            phoneNumberIdField,
            fld('Template Name', 'templateName', 'string', true, 'Exact name of the approved template to send.', templateNameHelpText, { example: 'flash_sale' }),
            fld('Language', 'language', 'string', true, 'Language code the template was approved in.', languageHelpText, { example: 'en_US' }),
            fld('Template Components (JSON)', 'templateComponents', 'json', false, 'Values filling the template\'s placeholder variables, applied the same way to every recipient.', templateComponentsHelpText, { placeholder: '[{"type":"body","parameters":[{"type":"text","text":"20% OFF"}]}]', example: '[{"type":"body","parameters":[{"type":"text","text":"20% OFF"}]}]' }),
            fld('Recipients (JSON)', 'recipients', 'json', true, 'Phone numbers to send the template to.', recipientsHelpText, { placeholder: '["+14155552671","+919876543210"]', example: '{{$json.recipientPhones}}' }),
            fld('Known Template Status (optional)', 'templateStatus', 'string', false, 'Local pre-flight check that the template is APPROVED.', templateStatusHelpText, { placeholder: 'APPROVED', example: 'APPROVED' }),
          ],
          outputExample: { sent: 486, failed: 14, total: 500 },
          outputDescription: 'On success, the node keeps incoming data and adds sent (successful deliveries), failed (numbers that could not be reached or rejected the template), and total (the size of Recipients). This is a computed summary, not a raw Meta pass-through. On failure of the whole batch (for example an unapproved template), the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Send a flash-sale template to 500 opted-in customer numbers pulled from a marketing segment export',
            inputValues: { resource: 'campaign', operation: 'create', templateName: 'flash_sale', language: 'en_US', recipients: '{{$json.recipientPhones}}', templateStatus: 'APPROVED' },
            expectedOutput: 'The template is sent to each recipient. A later logging node reads {{$json.sent}}, {{$json.failed}}, and {{$json.total}} to report campaign results.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#template-messages',
        },
        {
          name: 'List Campaigns',
          value: 'list',
          description: 'Returns a page of past campaign records for the Business Account, useful for reviewing send history and performance over time.',
          fields: [
            resourceField('campaign'),
            campaignOperationField('list'),
            businessAccountIdField,
            fld('Limit', 'limit', 'number', false, 'Maximum number of campaigns to return.', limitHelpText, { defaultValue: '20', example: '20' }),
          ],
          outputExample: {
            data: [{ id: '5000000000000', name: 'flash_sale', status: 'completed', sent: 486, failed: 14 }],
            paging: { cursors: { before: 'QVFI...', after: 'QVFI...' } },
          },
          outputDescription: 'On success, the node keeps incoming data and adds data (an array of past campaign records) and paging.cursors for further pages. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Review the last 20 campaigns for a marketing performance report',
            inputValues: { resource: 'campaign', operation: 'list', limit: '20' },
            expectedOutput: 'A later reporting node reads {{$json.data}} to summarize past campaign sent/failed counts.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#template-messages',
        },
      ],
    },
    {
      name: 'AI Agent',
      description: 'Enable, disable, or read Meta AI Agent suggestions for a conversation. Not yet selectable in the visual Resource dropdown; reachable through AI-generated workflows or a manually edited workflow configuration. Depends on your Meta Business Account having AI Agent access enabled.',
      operations: [
        {
          name: 'Enable AI Agent',
          value: 'enable',
          description: 'Turns on Meta AI Agent assistance for one conversation, so incoming customer messages in that thread receive AI-generated suggestions or automated handling depending on your Meta configuration.',
          fields: [
            resourceField('aiAgent'),
            aiAgentOperationField('enable'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to enable AI Agent for.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails, for example when AI Agent is not enabled for your Business Account.',
          usageExample: {
            scenario: 'Turn on AI Agent assistance automatically for every new conversation opened outside business hours',
            inputValues: { resource: 'aiAgent', operation: 'enable', conversationId: '{{$json.id}}' },
            expectedOutput: 'AI Agent assistance is turned on for the thread. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Disable AI Agent',
          value: 'disable',
          description: 'Turns off Meta AI Agent assistance for one conversation, for example when a human agent takes over a thread and automated suggestions are no longer needed.',
          fields: [
            resourceField('aiAgent'),
            aiAgentOperationField('disable'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to disable AI Agent for.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { success: true },
          outputDescription: 'On success, the node keeps incoming data and adds success:true. On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Turn off AI Agent the moment a senior support agent joins a conversation',
            inputValues: { resource: 'aiAgent', operation: 'disable', conversationId: '{{$json.id}}' },
            expectedOutput: 'AI Agent assistance is turned off for the thread. A later node can branch on {{$json.success}} or {{$json._error}}.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
        {
          name: 'Get AI Suggestions',
          value: 'getSuggestions',
          description: 'Reads AI-generated reply suggestions for a conversation without sending anything, so a human agent can review and choose one before replying.',
          fields: [
            resourceField('aiAgent'),
            aiAgentOperationField('getSuggestions'),
            fld('Conversation ID', 'conversationId', 'string', true, 'Conversation to fetch AI suggestions for.', conversationIdHelpText, { example: '{{$json.id}}' }),
          ],
          outputExample: { data: [{ suggestion: 'Your order ships within 2 business days.', confidence: 0.92 }] },
          outputDescription: 'On success, the node keeps incoming data and adds data (an array of suggested reply objects with confidence scores). On failure, the node returns success:false with _error, _errorCode (WHATSAPP_ERROR), and optionally _errorDetails.',
          usageExample: {
            scenario: 'Show an agent dashboard a suggested reply before the agent sends the final answer with Send Text',
            inputValues: { resource: 'aiAgent', operation: 'getSuggestions', conversationId: '{{$json.id}}' },
            expectedOutput: 'The agent reviews {{$json.data[0].suggestion}} before a Send Text step sends the approved reply.',
          },
          externalDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'No WhatsApp token found. Please connect your WhatsApp Business account in settings.', cause: 'No WhatsApp/Facebook OAuth connection is saved for this user, or the saved token could not be resolved.', fix: 'Open Connections -> WhatsApp and connect through the Facebook/Meta OAuth flow, or save a permanent access token and Phone Number ID if your workspace uses the manual credential form.' },
    { error: 'Meta API error 190: Your Facebook/Meta access token has expired. Please reconnect your account.', cause: 'The saved access token expired or was revoked in Meta Business Suite.', fix: 'Reconnect WhatsApp in Connections. For production, use a permanent System User token instead of the 24-hour temporary token from API Setup.' },
    { error: 'Missing permission: required permission. Please reconnect your account and grant the required permissions.', cause: 'The connected token lacks whatsapp_business_messaging or whatsapp_business_management scope.', fix: 'Reconnect WhatsApp in Connections and approve all requested WhatsApp permissions during the Meta OAuth screen.' },
    { error: "Template 'name' is not approved for sending.", cause: 'Send Template, Create Campaign, or Known Template Status flagged that the template is not currently APPROVED.', fix: 'Check the template\'s status in Meta Business Suite -> WhatsApp -> Message Templates, or run a Template Get step and wait for APPROVED before sending.' },
    { error: 'Your WhatsApp account has been temporarily blocked. Please try again later.', cause: 'Meta detected policy violations, spam-like sending patterns, or low message quality rating on the connected number.', fix: 'Review Meta Business Suite -> WhatsApp -> Overview for account health notices, slow down send volume, and confirm recipients opted in.' },
    { error: 'Could not resolve phoneNumberId: no phone numbers found on this account.', cause: 'Phone Number ID was left blank and no WhatsApp phone number exists on the connected account.', fix: 'Add a verified phone number in Meta Business Suite -> WhatsApp -> API Setup, or set Phone Number ID explicitly.' },
    { error: 'Could not resolve businessAccountId: WABA not found for this phone number.', cause: 'Business Account ID was left blank and the resolved phone number has no linked WhatsApp Business Account.', fix: 'Confirm the phone number is correctly linked to a WABA in Meta Business Suite, or set Business Account ID explicitly.' },
    { error: 'Unknown resource / Unknown message operation / Unknown contact operation / Unknown conversation operation / Unknown template operation / Unknown campaign operation / Unknown aiAgent operation', cause: 'Resource or Operation was set to a value the runtime does not recognize, often from a typo in an AI-generated or manually edited workflow config.', fix: 'Use one of the exact documented values for Resource (message, contact, conversation, template, campaign, aiAgent) and the matching Operation values shown for that resource.' },
    { error: 'Next node cannot find WhatsApp message id', cause: 'A downstream node is reading a made-up field instead of the real Meta response shape.', fix: 'Use {{$json.messages[0].id}} for sent messages, {{$json.success}} for management operations, and {{$json.data}} for list/search/get operations.' },
    { error: 'Empty result from list/search operations', cause: 'Limit returned a smaller page than expected, or Return All was set expecting it to fetch every record automatically.', fix: 'Page through results using the returned paging.cursors.after value in the After field; Return All is accepted but not yet implemented in this runtime version.' },
    { error: 'Invalid JSON in Contacts, Template Components, Buttons, Sections, or CTA Button', cause: 'A JSON field contains malformed syntax, single quotes, or a shape that does not match Meta\'s expected structure.', fix: 'Validate the JSON is well-formed and matches Meta\'s documented format for that message type before saving the workflow.' },
    { error: 'Permission denied after WhatsApp', cause: 'The WhatsApp connection only authorizes WhatsApp Cloud API calls; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider\'s permissions separately from WhatsApp.' },
  ],
  relatedNodes: ['whatsapp_trigger', 'ai_agent', 'slack_message', 'telegram', 'http_request'],
};
