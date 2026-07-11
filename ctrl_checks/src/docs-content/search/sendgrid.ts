import type { DocsSearchIndexItem } from '../search-index';

export const sendgridSearchIndex = [
  {
    "type": "node",
    "title": "SendGrid",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid",
    "text": "SendGrid Send transactional emails using the SendGrid API. Use this node when a workflow needs sendgrid behavior with schema-driven inputs from the CtrlChecks node registry. Communication"
  },
  {
    "type": "operation",
    "title": "SendGrid: Send Email",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email Send Email with the SendGrid node using the configured input fields. send_email"
  },
  {
    "type": "field",
    "title": "SendGrid: From",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email From from Sender email address (must be a verified sender in SendGrid)"
  },
  {
    "type": "field",
    "title": "SendGrid: To",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email To to Recipient email address(es), comma-separated"
  },
  {
    "type": "field",
    "title": "SendGrid: Subject",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email Subject subject Email subject line"
  },
  {
    "type": "field",
    "title": "SendGrid: Text",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email Text text Plain text body of the email"
  },
  {
    "type": "field",
    "title": "SendGrid: Html",
    "slug": "sendgrid",
    "category": "Communication",
    "href": "/docs/nodes/sendgrid#operation-send_email",
    "text": "SendGrid Operations Send Email Html html HTML body of the email. If both text and HTML are provided, SendGrid receives both content versions."
  }
] satisfies DocsSearchIndexItem[];
