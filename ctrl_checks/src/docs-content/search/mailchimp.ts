import type { DocsSearchIndexItem } from '../search-index';

export const mailchimpSearchIndex = [
  {
    "type": "node",
    "title": "Mailchimp",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp",
    "text": "Mailchimp Add or remove a Mailchimp list member, or trigger sending an existing campaign. CRM"
  },
  {
    "type": "operation",
    "title": "Mailchimp: Subscribe",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp#operation-subscribe",
    "text": "Mailchimp Subscribe Adds or updates a Mailchimp list member by email."
  },
  {
    "type": "operation",
    "title": "Mailchimp: Unsubscribe",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp#operation-unsubscribe",
    "text": "Mailchimp Unsubscribe Marks an existing list member as unsubscribed."
  },
  {
    "type": "operation",
    "title": "Mailchimp: Send",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp#operation-send",
    "text": "Mailchimp Send Triggers sending an already-created Mailchimp campaign."
  },
  {
    "type": "field",
    "title": "Mailchimp: Fields (Operation, API Key, Data Center, Resource, List/Audience ID, Member Email, Email, Data, Member Data, Count, Offset, Server Prefix, Merge Fields, Campaign Id)",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp#operation-subscribe",
    "text": "Mailchimp Operation API Key Data Center Resource List Audience ID Member Email Email Data Member Data Count Offset Server Prefix Merge Fields Campaign Id"
  },
  {
    "type": "guide",
    "title": "Mailchimp: Connection setup",
    "slug": "mailchimp",
    "category": "CRM",
    "href": "/docs/nodes/mailchimp#connection",
    "text": "Mailchimp API Key Connections credential vault Extras API Keys data-center"
  }
] satisfies DocsSearchIndexItem[];
