# Node Registry Integration Segregation

This view separates integrations into:
- Integrated + tested
- Integrated but not yet tested
- Need integration

Test status is based on your latest confirmation.

## Integrated + Tested

| Category | Integration/App | Node Type IDs in Registry |
|---|---|---|
| Communication & Messaging | Gmail | `google_gmail` |
| Communication & Messaging | Outlook | `outlook` |
| Communication & Messaging | Slack | `slack_message`, `slack_webhook` |
| Communication & Messaging | Discord | `discord`, `discord_webhook` |
| Communication & Messaging | Telegram | `telegram` |
| CRM & Sales | HubSpot | `hubspot` |
| Project Management | ClickUp | `clickup` |
| Project Management | Notion | `notion` |
| Project Management | Airtable | `airtable` |
| Databases & Storage | AWS S3 | `aws_s3` |
| Databases & Storage | Dropbox | `dropbox` |
| Databases & Storage | OneDrive | `onedrive` |
| Developer & DevOps Tools | GitHub | `github` |
| Developer & DevOps Tools | GitLab | `gitlab` |
| AI & Automation | OpenAI | `openai_gpt` |
| AI & Automation | Google Gemini | `google_gemini` |
| Payments & Finance | Stripe | `stripe` |
| Payments & Finance | PayPal | `paypal` |
| E-commerce | Shopify | `shopify` |
| Social Media | LinkedIn | `linkedin` |
| Scheduling & Calendar | Google Calendar | `google_calendar` |
| Generic / Core | HTTP Request (connect ANY API) | `http_request`, `http_post` |
| Generic / Core | Webhook | `webhook`, `webhook_response` |
| Generic / Core | GraphQL | `graphql` |
| Google Workspace (Registry) | Google Sheets | `google_sheets` |
| Google Workspace (Registry) | Google Docs | `google_doc` |

## Integrated but Not Yet Tested

| Category | Integration/App | Node Type IDs in Registry |
|---|---|---|
| Communication & Messaging | WhatsApp (via Twilio/Cloud API) | `whatsapp`, `twilio` |
| Communication & Messaging | Microsoft Teams | `microsoft_teams` |
| Communication & Messaging | Twilio | `twilio` |
| CRM & Sales | Pipedrive | `pipedrive` |
| Project Management | Jira | `jira` |
| Databases & Storage | MongoDB | `mongodb` |
| Databases & Storage | Redis | `redis` |
| E-commerce | WooCommerce | `woocommerce` |
| Social Media | Facebook | `facebook` |
| Social Media | Instagram | `instagram` |
| Social Media | Twitter (X) | `twitter` |

## Need Integration (From Your Master List)

### Communication & Messaging
- Zoom
- Vonage
- SendGrid
- Mailgun
- AWS SES
- Intercom
- Drift

### CRM & Sales
- Salesforce
- Zoho CRM
- Freshsales
- Insightly
- Copper
- Close CRM
- Agile CRM
- Monday CRM

### Marketing Automation
- Mailchimp
- ActiveCampaign
- ConvertKit
- Klaviyo
- Brevo (Sendinblue)
- GetResponse
- Campaign Monitor
- Drip
- Keap (Infusionsoft)
- Customer.io

### Project Management
- Trello
- Asana
- Basecamp
- Wrike
- Smartsheet
- Teamwork

### Databases & Storage
- MySQL
- PostgreSQL
- Firebase
- Supabase
- Google Cloud Storage
- Box

### Developer & DevOps Tools
- Bitbucket
- Jenkins
- Docker
- Kubernetes
- Vercel
- Netlify
- CircleCI
- Travis CI

### AI & Automation
- Anthropic Claude
- Hugging Face
- LangChain
- Pinecone
- Weaviate
- Replicate
- Stability AI

### Payments & Finance
- Razorpay
- Square
- Wise
- QuickBooks
- Xero
- FreshBooks
- Chargebee

### E-commerce
- Magento
- BigCommerce
- OpenCart
- Gumroad

### Forms & Surveys
- Typeform
- Google Forms
- Jotform
- Tally
- Formstack

### Analytics & Tracking
- Google Analytics
- Mixpanel
- Amplitude
- Segment
- Hotjar

### Social Media
- YouTube
- TikTok
- Pinterest

### CMS & Content
- WordPress
- Webflow
- Contentful
- Strapi
- Ghost

### Support & Helpdesk
- Zendesk
- Help Scout
- Zoho Desk
- Kayako

### Scheduling & Calendar
- Calendly
- Microsoft Calendar

### Generic / Core
- FTP / SFTP
- RSS Feed

