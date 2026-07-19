import type { DocsSearchIndexItem } from '../search-index';

export const amazonSesSearchIndex = [
  {
    "type": "node",
    "title": "Amazon SES",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses",
    "text": "Amazon SES Send transactional or templated emails through Amazon Simple Email Service (SES) using a saved AWS Access Key connection, with automatic retry on temporary AWS errors. Communication"
  },
  {
    "type": "operation",
    "title": "Amazon SES: Send Email",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Sends one email via Amazon Simple Email Service (SES), either as raw Subject/Body content or by populating an existing AWS SES template, with automatic retry on temporary AWS errors such as throttling. default"
  },
  {
    "type": "field",
    "title": "Amazon SES: Recipients",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Recipients recipients Email recipients (To, Cc, Bcc)"
  },
  {
    "type": "field",
    "title": "Amazon SES: Subject",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Subject subject Email subject line (required when not using an AWS SES template)"
  },
  {
    "type": "field",
    "title": "Amazon SES: Body",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Body body Email body content, sent as both the HTML and plain-text parts (required when not using an AWS SES template)"
  },
  {
    "type": "field",
    "title": "Amazon SES: Use AWS SES Template",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Use AWS SES Template useTemplate Use an existing AWS SES template instead of the Subject and Body fields"
  },
  {
    "type": "field",
    "title": "Amazon SES: Template Name",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Template Name templateName AWS SES template name (required if Use AWS SES Template is true)"
  },
  {
    "type": "field",
    "title": "Amazon SES: Template Data",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Template Data templateData Template variables as a JSON object, matched to the template's own placeholders"
  },
  {
    "type": "field",
    "title": "Amazon SES: From Address",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email From Address fromAddress Sender email address (must be verified in SES)"
  },
  {
    "type": "field",
    "title": "Amazon SES: Reply-To Addresses",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Reply-To Addresses replyToAddresses Reply-to email addresses"
  },
  {
    "type": "field",
    "title": "Amazon SES: Attachments",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Attachments attachments Email attachments (filename, base64 content, content type)"
  },
  {
    "type": "field",
    "title": "Amazon SES: AWS Region",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email AWS Region awsRegion AWS region for the SES service, where your verified identities, templates, and configuration sets exist"
  },
  {
    "type": "field",
    "title": "Amazon SES: Configuration Set Name",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Configuration Set Name configurationSetName SES configuration set for delivery event tracking"
  },
  {
    "type": "field",
    "title": "Amazon SES: Tags",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Tags tags SES message tags for CloudWatch filtering and reporting"
  },
  {
    "type": "field",
    "title": "Amazon SES: Return Path",
    "slug": "amazon_ses",
    "category": "Communication",
    "href": "/docs/nodes/amazon_ses#operation-default",
    "text": "Amazon SES Configuration Send Email Return Path returnPath Bounce-handling (envelope-from) email address"
  }
] satisfies DocsSearchIndexItem[];
