import type { DocsSearchIndexItem } from '../search-index';

export const twilioSearchIndex = [
  {
    "type": "node",
    "title": "Twilio",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio",
    "text": "Twilio Send an SMS or MMS text message through Twilio using a saved Twilio Account Credentials connection (Account SID + Auth Token). Communication"
  },
  {
    "type": "operation",
    "title": "Twilio: Send SMS/MMS",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS Sends one SMS (or MMS, when Media URL is set) text message through Twilio's Messages API, from either a specific phone number or a Messaging Service. default"
  },
  {
    "type": "field",
    "title": "Twilio: To Number",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS To Number to Recipient phone number, E.164 format (e.g. +14155552671)"
  },
  {
    "type": "field",
    "title": "Twilio: Message",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS Message message SMS message text"
  },
  {
    "type": "field",
    "title": "Twilio: From Number",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS From Number from Sender phone number, E.164 format. Required unless Messaging Service SID is set."
  },
  {
    "type": "field",
    "title": "Twilio: Messaging Service SID",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS Messaging Service SID messagingServiceSid Twilio Messaging Service SID to send from instead of a single From number"
  },
  {
    "type": "field",
    "title": "Twilio: Media URL (MMS)",
    "slug": "twilio",
    "category": "Communication",
    "href": "/docs/nodes/twilio#operation-default",
    "text": "Twilio Configuration Send SMS/MMS Media URL (MMS) mediaUrl Publicly accessible media URL to send as an MMS attachment"
  }
] satisfies DocsSearchIndexItem[];
