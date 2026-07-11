import type { DocsSearchIndexItem } from '../search-index';

export const twilioSearchIndex = [
  {
    "type": "node",
    "title": "Twilio",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio",
    "text": "Twilio Send SMS messages via a Twilio account connection. Use this node when a workflow needs twilio behavior with schema-driven inputs from the CtrlChecks node registry. Communication"
  },
  {
    "type": "operation",
    "title": "Twilio: Configure",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure Configure with the Twilio node using the configured input fields. configure"
  },
  {
    "type": "field",
    "title": "Twilio: To",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure To to Recipient phone number"
  },
  {
    "type": "field",
    "title": "Twilio: Message",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure Message message SMS message text"
  },
  {
    "type": "field",
    "title": "Twilio: From",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure From from Sender phone number"
  },
  {
    "type": "field",
    "title": "Twilio: Messaging Service SID",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure Messaging Service SID messagingServiceSid Send via a Twilio Messaging Service instead of a single From number"
  },
  {
    "type": "field",
    "title": "Twilio: Media URL",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-configure",
    "text": "Twilio Configuration Configure Media URL mediaUrl Publicly accessible media URL to send as an MMS attachment"
  }
] satisfies DocsSearchIndexItem[];
