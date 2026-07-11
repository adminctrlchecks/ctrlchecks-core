/**
 * Service-specific credential setup steps for every credential type.
 * The docs generator merges these into each node's credentialSetupSteps array.
 */
export interface CredentialGuide {
  steps: string[];
  docsUrl: string;
}

export const credentialSteps: Record<string, CredentialGuide> = {
  // ─── Google / Gmail ────────────────────────────────────────────
  'Google Credential': {
    steps: [
      'Go to console.cloud.google.com and sign in with your Google account.',
      'Click "Select a project" at the top → New Project → give it any name (e.g. CtrlChecks) → Create.',
      'In the left menu, click APIs & Services → Library → search for the API you need (e.g. Gmail API or Google Sheets API) → click it → Enable.',
      'Go to APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: Web application.',
      'Under "Authorised redirect URIs", click Add URI and enter: http://localhost:3001/api/oauth/google/callback → Create. Copy the Client ID and Client Secret shown.',
      'In CtrlChecks → left menu → Connections → Add Connection → select the Google service → Connect with Google → sign in → Allow access.',
      'The connection saves automatically. Select it in the node dropdown and run a test step to confirm.',
    ],
    docsUrl: 'https://developers.google.com/identity/protocols/oauth2',
  },

  // ─── Slack ─────────────────────────────────────────────────────
  'Slack Credential': {
    steps: [
      'Go to api.slack.com/apps and sign in with your Slack account.',
      'Click "Create New App" → "From scratch" → give it a name (e.g. CtrlChecks Bot) → pick your workspace → Create App.',
      'In the left menu, click "OAuth & Permissions" → scroll to "Scopes" → "Bot Token Scopes" → Add: chat:write (to post messages), channels:read (to list channels).',
      'Scroll up and click "Install to Workspace" → Allow.',
      'Copy the "Bot User OAuth Token" — it starts with xoxb-. This is your Slack credential.',
      'In CtrlChecks → left menu → Connections → Add Connection → Slack → paste the xoxb- token → Save.',
      'In your Slack workspace, open the channel you want to post to → type /invite @YourBotName → Enter. Then run a test step in CtrlChecks to confirm.',
    ],
    docsUrl: 'https://api.slack.com/authentication/basics',
  },

  // ─── Slack Webhook ─────────────────────────────────────────────
  'Slack Webhook URL': {
    steps: [
      'Go to api.slack.com/apps and sign in. Select your existing app, or click "Create New App" → "From scratch".',
      'In the left menu, click "Incoming Webhooks" → toggle "Activate Incoming Webhooks" to ON.',
      'Click "Add New Webhook to Workspace" → select the channel you want messages posted to → Allow.',
      'Copy the Webhook URL shown — it starts with https://hooks.slack.com/services/. This URL is your credential.',
      'In CtrlChecks → left menu → Connections → Add Connection → Slack Webhook → paste the webhook URL → Save.',
      'Run a test step in CtrlChecks to confirm a message appears in the selected channel.',
    ],
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },
  'Slack Incoming Webhook': {
    steps: [
      'Go to api.slack.com/apps and sign in. Select your existing app, or create a new Slack app.',
      'Open Incoming Webhooks and turn Activate Incoming Webhooks on.',
      'Click Add New Webhook to Workspace, select the target channel, and click Allow.',
      'Copy the webhook URL that starts with https://hooks.slack.com/services/.',
      'In CtrlChecks, open Connections -> Add Connection -> Slack Incoming Webhook, paste the URL, and save.',
    ],
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },

  // ─── OpenAI ────────────────────────────────────────────────────
  'OpenAI API Key': {
    steps: [
      'Go to platform.openai.com and sign in (or create a free account).',
      'Click your profile icon in the top right → API keys → Create new secret key.',
      'Give it a name (e.g. CtrlChecks) and click "Create secret key".',
      'Copy the key immediately — it starts with sk- and will only be shown ONCE. If you close without copying, you will need to create a new one.',
      'In CtrlChecks → left menu → Connections → Add Connection → OpenAI → paste the sk- key → Save.',
      'Make sure your OpenAI account has credits: check platform.openai.com/account/billing.',
      'Run a test step — ask the OpenAI node a simple question to confirm the connection works.',
    ],
    docsUrl: 'https://platform.openai.com/docs/api-reference/authentication',
  },

  // ─── Anthropic ─────────────────────────────────────────────────
  'Anthropic API Key': {
    steps: [
      'Go to console.anthropic.com and sign in (or create an account).',
      'Click "API Keys" in the left menu → Create Key.',
      'Give it a name (e.g. CtrlChecks) and click Create.',
      'Copy the key immediately — it starts with sk-ant-. Save it somewhere safe — it is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Anthropic Claude → paste the sk-ant- key → Save.',
      'Check that your Anthropic account has API credits: console.anthropic.com/settings/billing.',
      'Run a test step with a simple prompt (e.g. "Say hello") to confirm Claude responds correctly.',
    ],
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
  },

  // ─── Google Gemini ─────────────────────────────────────────────
  'Google Gemini API Key': {
    steps: [
      'Go to aistudio.google.com/app/apikey and sign in with your Google account.',
      'Click "Create API Key" → select or create a Google Cloud project → Create API key in existing project.',
      'Copy the generated API key — it is a long string of letters and numbers.',
      'In CtrlChecks → left menu → Connections → Add Connection → Google Gemini → paste the API key → Save.',
      'Run a test step with a simple prompt to confirm Gemini responds correctly.',
    ],
    docsUrl: 'https://ai.google.dev/tutorials/setup',
  },

  // ─── Ollama (local) ────────────────────────────────────────────
  'Ollama (Local)': {
    steps: [
      'Install Ollama on your computer: go to ollama.com, download the installer for your OS, and run it.',
      'Open a terminal (Command Prompt or PowerShell on Windows) and run: ollama pull llama3 (or any other model you want to use).',
      'Start the Ollama server by running: ollama serve — keep this terminal window open while using CtrlChecks.',
      'The Ollama node connects to http://localhost:11434 by default. No API key is needed.',
      'In CtrlChecks, add the Ollama node to your workflow and set the Base URL to http://localhost:11434.',
      'Run a test step with a simple prompt to confirm your local model responds.',
      'Tip: Run "ollama list" in terminal to see which models you have downloaded. Pull more with "ollama pull modelname".',
    ],
    docsUrl: 'https://ollama.com/docs',
  },

  // ─── PostgreSQL ────────────────────────────────────────────────
  'PostgreSQL Connection': {
    steps: [
      'Make sure your PostgreSQL database is running and can be reached from the internet (or your local network).',
      'You need: the server address (hostname or IP), port (default is 5432), database name, username, and password.',
      'For AWS RDS: go to AWS Console → RDS → your database → Connectivity & security. The "Endpoint" field is your hostname.',
      'Make sure the database firewall allows connections from CtrlChecks. For AWS RDS: add the server IP to the security group inbound rules on port 5432.',
      'In CtrlChecks → left menu → Connections → Add Connection → PostgreSQL → enter Host, Port, Database name, Username, Password → Test Connection → Save.',
      'Run a simple SELECT query in the PostgreSQL node to confirm CtrlChecks can read from your database.',
    ],
    docsUrl: 'https://www.postgresql.org/docs/current/tutorial-accessdb.html',
  },

  // ─── Supabase ──────────────────────────────────────────────────
  'Supabase Credential': {
    steps: [
      'Go to supabase.com and sign in to your Supabase account.',
      'Open your project → click "Settings" (gear icon) in the left sidebar → API.',
      'Under "Project URL", copy the URL (looks like https://xxxx.supabase.co). Under "Project API keys", copy the "anon/public" key or "service_role" key depending on your needs.',
      'Note: "anon" key has limited access (respects row-level security); "service_role" key has full access — keep it secret.',
      'In CtrlChecks → left menu → Connections → Add Connection → Supabase → paste the Project URL and API key → Save.',
      'Run a test step to query a table and confirm the connection works.',
    ],
    docsUrl: 'https://supabase.com/docs/guides/getting-started/quickstarts',
  },

  // ─── Telegram ──────────────────────────────────────────────────
  'Telegram Bot Token': {
    steps: [
      'Open the Telegram app on your phone or at web.telegram.org.',
      'Search for @BotFather in the search bar and start a chat with it.',
      'Type /newbot and press Send. BotFather will ask for a display name (e.g. My Company Bot) and then a username ending in "bot" (e.g. mycompany_bot).',
      'BotFather will send you a token — it looks like 123456789:ABCdef_GHIjkl-MNOpqr. Copy the entire token.',
      'In CtrlChecks → left menu → Connections → Add Connection → Telegram → paste the bot token → Save.',
      'To find a chat ID to send messages to: start a chat with your bot on Telegram, then search for @userinfobot and forward it a message from your chat — it will show you the chat ID.',
      'Run a test step to send a message and confirm it arrives in Telegram.',
    ],
    docsUrl: 'https://core.telegram.org/bots/tutorial',
  },

  // ─── Discord ───────────────────────────────────────────────────
  'Discord Bot Token': {
    steps: [
      'Go to discord.com/developers/applications and sign in with your Discord account.',
      'Click "New Application" → give it a name (e.g. CtrlChecks Bot) → Create.',
      'Click "Bot" in the left menu → "Add Bot" → Yes, do it! Then click "Reset Token" and copy the token — keep it secret.',
      'Enable Developer Mode in Discord: Settings → Advanced → Developer Mode ON. Then right-click any channel → Copy ID to get the channel ID for use in the node.',
      'In the OAuth2 → URL Generator panel: select "bot" scope + "Send Messages" permission. Copy the URL, open it in a browser, and add the bot to your Discord server.',
      'In CtrlChecks → left menu → Connections → Add Connection → Discord → paste the bot token → Save.',
      'Run a test step to confirm the bot posts to the chosen channel.',
    ],
    docsUrl: 'https://discord.com/developers/docs/getting-started',
  },

  // ─── Discord Webhook ───────────────────────────────────────────
  'Discord Webhook URL': {
    steps: [
      'In Discord, right-click on the channel you want to receive messages in → Edit Channel.',
      'Click "Integrations" in the left sidebar → Webhooks → New Webhook.',
      'Give it a name, optionally upload an avatar, then click "Copy Webhook URL". This URL is your credential.',
      'In CtrlChecks → left menu → Connections → Add Connection → Discord Webhook → paste the webhook URL → Save.',
      'Run a test step to confirm a message appears in the Discord channel.',
    ],
    docsUrl: 'https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks',
  },

  // ─── Twitter / X ───────────────────────────────────────────────
  'Twitter API Key': {
    steps: [
      'Go to developer.twitter.com/en/portal/dashboard and sign in with your Twitter/X account.',
      'Click "+ Add App" → Create a new app. Give it a name and click Get keys.',
      'Under "Keys and Tokens", click "Generate" for Access Token and Secret. Copy all four values: API Key, API Key Secret, Access Token, Access Token Secret.',
      'Make sure your app has "Read and Write" permissions (needed to post tweets). Check Settings → User authentication settings.',
      'In CtrlChecks → left menu → Connections → Add Connection → Twitter/X → enter all four keys → Save.',
      'Run a test step to post a tweet and confirm it appears on your Twitter account.',
    ],
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api',
  },

  // ─── LinkedIn ──────────────────────────────────────────────────
  'LinkedIn Credential': {
    steps: [
      'Go to linkedin.com/developers and sign in with your LinkedIn account.',
      'Click "Create App" → fill in app name (e.g. CtrlChecks), your LinkedIn Company Page (required — create one at linkedin.com/company/setup/new if needed), and upload a logo image.',
      'Under "Auth" settings, copy the Client ID and Client Secret.',
      'In "Auth" settings, click "Add redirect URL" and enter: http://localhost:3001/api/oauth/linkedin/callback',
      'Under "Products" tab, request access to "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect". These are approved instantly.',
      'In CtrlChecks → left menu → Connections → Add Connection → LinkedIn → Connect with LinkedIn → sign in and authorize.',
      'Run a test step (e.g. create a post as draft) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow',
  },

  // ─── Instagram ─────────────────────────────────────────────────
  'Instagram Credential': {
    steps: [
      'You need a Facebook Developer account and an Instagram Business or Creator account. Go to developers.facebook.com and sign in.',
      'Click "My Apps" → Create App → select "Business" type → Next. Give it a name.',
      'Under "Add Products to Your App", find "Instagram Graph API" and click Set Up.',
      'Connect your Instagram Business account: your Instagram must be connected to a Facebook Page. Go to Instagram → Settings → Account → Switch to Professional Account, then link it to a Facebook Page.',
      'In the app dashboard, go to Instagram → Basic Display → Create New App. Generate a long-lived user access token using the Graph API Explorer.',
      'In CtrlChecks → left menu → Connections → Add Connection → Instagram → paste the access token → Save.',
      'Run a test step to confirm CtrlChecks can access your Instagram account.',
    ],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/getting-started',
  },

  // ─── Facebook ──────────────────────────────────────────────────
  'Facebook Credential': {
    steps: [
      'Go to developers.facebook.com/apps and sign in with your Facebook account.',
      'Click "Create App" → select "Business" type → Next → give it a name → Create App.',
      'Under "Add Products to Your App", click "Set Up" on Facebook Login.',
      'Go to Facebook Login → Settings → add this URL to "Valid OAuth Redirect URIs": http://localhost:3001/api/oauth/facebook/callback → Save Changes.',
      'Copy the App ID and App Secret from Settings → Basic.',
      'In CtrlChecks → left menu → Connections → Add Connection → Facebook → click "Connect with Facebook" → sign in and authorize.',
      'Run a test step to confirm the connection works.',
    ],
    docsUrl: 'https://developers.facebook.com/docs/facebook-login/web',
  },

  // ─── HubSpot ───────────────────────────────────────────────────
  'HubSpot API Key': {
    steps: [
      'Log in to your HubSpot account at app.hubspot.com.',
      'Click the Settings gear icon (top right) → Integrations → Private Apps.',
      'Click "Create a private app". Give it a name like CtrlChecks Integration.',
      'Go to the "Scopes" tab. Add the scopes you need: crm.objects.contacts.read and crm.objects.contacts.write for contacts; crm.objects.deals.read and crm.objects.deals.write for deals. Add more as needed.',
      'Click "Create app" → confirm. Copy the Access Token shown — it starts with pat-na1- (or similar region prefix).',
      'In CtrlChecks → left menu → Connections → Add Connection → HubSpot → paste the access token → Save.',
      'Run a test step (e.g. search for a contact by email) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.hubspot.com/docs/api/private-apps',
  },

  // ─── Salesforce ────────────────────────────────────────────────
  'Salesforce Credential': {
    steps: [
      'Log in to Salesforce → click the gear icon (Setup) → search for "App Manager" → click it.',
      'Click "New Connected App" (top right) → give it a name (e.g. CtrlChecks) and enter your email.',
      'Under "API (Enable OAuth Settings)", tick "Enable OAuth Settings". Set Callback URL to: http://localhost:3001/api/oauth/salesforce/callback',
      'Under "Selected OAuth Scopes", add: Access and manage your data (api), Perform requests on your behalf at any time (refresh_token). Click Save.',
      'After saving, note the Consumer Key (Client ID) and Consumer Secret — it may take a few minutes to become available.',
      'In CtrlChecks → left menu → Connections → Add Connection → Salesforce → click "Connect with Salesforce" → sign in → Allow.',
      'Run a test step (e.g. search for a Contact) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm',
  },

  // ─── Notion ────────────────────────────────────────────────────
  'Notion API Key': {
    steps: [
      'Go to notion.so/my-integrations and sign in with your Notion account.',
      'Click "+ New integration" → give it a name (e.g. CtrlChecks) → select your workspace.',
      'Under "Capabilities", enable: Read content, Update content, Insert content.',
      'Click Submit. Copy the "Internal Integration Token" — it starts with secret_.',
      'Share your Notion database with the integration: open the database in Notion → click Share (top right) → Invite → search for your integration name → Invite.',
      'In CtrlChecks → left menu → Connections → Add Connection → Notion → paste the secret_ token → Save.',
      'Run a test step (e.g. create a page in the database) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.notion.com/docs/getting-started',
  },

  // ─── Airtable ──────────────────────────────────────────────────
  'Airtable API Key': {
    steps: [
      'Go to airtable.com and sign in to your account.',
      'Click your profile photo (top right) → Developer hub (or go to airtable.com/account → API section).',
      'Click "Personal access tokens" → Create new token. Give it a name (e.g. CtrlChecks).',
      'Add scopes: data.records:read and data.records:write. Under "Access", add the specific Base(s) you want CtrlChecks to access.',
      'Click "Create token". Copy the token — it starts with pat. and is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Airtable → paste the pat. token → Save.',
      'To find your Base ID: open the base in Airtable → Help menu → API documentation — the ID starting with "app" is shown at the top.',
    ],
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
  },

  // ─── Stripe ────────────────────────────────────────────────────
  'Stripe API Key': {
    steps: [
      'Go to dashboard.stripe.com and sign in to your Stripe account.',
      'Click "Developers" in the top right corner → API keys.',
      'Copy the "Secret key" — use sk_test_ (starts with sk_test_) while building and testing, sk_live_ for real payments.',
      'Keep this key secret — anyone with it can charge your customers or process refunds.',
      'In CtrlChecks → left menu → Connections → Add Connection → Stripe → paste the sk_ key → Save.',
      'Run a test step using sk_test_ (e.g. create a test customer) to confirm it works before switching to the live key.',
      'Important: amounts in Stripe are in the smallest currency unit. $20.00 = 2000 (cents). Enter 2000, not 20.',
    ],
    docsUrl: 'https://stripe.com/docs/keys',
  },

  // ─── PayPal ────────────────────────────────────────────────────
  'PayPal Credential': {
    steps: [
      'Go to developer.paypal.com/dashboard and sign in with your PayPal business account.',
      'Under "My Apps & Credentials", make sure you are on "Sandbox" tab for testing or "Live" tab for real payments.',
      'Click "Create App" → give it a name → Create App.',
      'Copy the Client ID and Secret shown on the app page.',
      'Note: Sandbox credentials only work in test mode. Switch to Live credentials and go through PayPal business verification for real payments.',
      'In CtrlChecks → left menu → Connections → Add Connection → PayPal → paste Client ID and Secret → Save.',
      'Run a test step using Sandbox credentials first to confirm the connection works.',
    ],
    docsUrl: 'https://developer.paypal.com/api/rest/',
  },

  // ─── Shopify ───────────────────────────────────────────────────
  'Shopify API Key': {
    steps: [
      'In your Shopify admin (yourstore.myshopify.com/admin), go to Settings → Apps and sales channels.',
      'Click "Develop apps" → Allow custom app development (if prompted) → Create an app. Give it a name like CtrlChecks.',
      'Click the app name → go to "Configuration" tab → Admin API integration → click Edit → select the access scopes you need (e.g. read_orders, write_orders, read_products, write_products).',
      'Go to "API credentials" tab → click "Install app" → Install. Copy the "Admin API access token" shown — it starts with shpat_ and is only shown once.',
      'Note your shop domain — it is the part before .myshopify.com (e.g. if URL is mystore.myshopify.com, domain is mystore).',
      'In CtrlChecks → left menu → Connections → Add Connection → Shopify → enter shop domain and access token → Save.',
      'Run a test step (e.g. list products) to confirm the connection works.',
    ],
    docsUrl: 'https://shopify.dev/docs/apps/auth/admin-app-access-tokens',
  },

  // ─── WooCommerce ───────────────────────────────────────────────
  'WooCommerce API Key': {
    steps: [
      'In your WordPress admin dashboard, go to WooCommerce → Settings.',
      'Click the "Advanced" tab → REST API → Add key.',
      'Give it a description (e.g. CtrlChecks), set User to your admin account, and set Permissions to "Read/Write".',
      'Click "Generate API key". Copy both the Consumer Key (starts with ck_) and Consumer Secret (starts with cs_) — they are only shown once.',
      'Note your WooCommerce store URL (e.g. https://yourstore.com).',
      'In CtrlChecks → left menu → Connections → Add Connection → WooCommerce → enter store URL, Consumer Key, and Consumer Secret → Save.',
      'Run a test step (e.g. list orders) to confirm the connection works.',
    ],
    docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication',
  },

  // ─── GitHub ────────────────────────────────────────────────────
  'GitHub Access Token': {
    steps: [
      'Go to github.com and sign in → click your profile photo (top right) → Settings.',
      'Scroll down to "Developer settings" (bottom of left sidebar) → Personal access tokens → Tokens (classic).',
      'Click "Generate new token (classic)" → give it a name (e.g. CtrlChecks) → set an expiry date.',
      'Select scopes: "repo" (full control of repositories) for most use cases, or just "issues" if you only need to create issues. Click "Generate token".',
      'Copy the token immediately — it starts with ghp_ and is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → GitHub → paste the ghp_ token → Save.',
      'Run a test step (e.g. list your repositories) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
  },

  // ─── GitLab ────────────────────────────────────────────────────
  'GitLab Access Token': {
    steps: [
      'Go to gitlab.com and sign in → click your profile photo (top right) → Edit profile → Access Tokens.',
      'Click "Add new token" → give it a name (e.g. CtrlChecks) → set an expiry date.',
      'Select scopes: "api" for full access, or "read_repository" and "write_repository" for repo-only access.',
      'Click "Create personal access token". Copy the token — it starts with glpat- and is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → GitLab → paste the glpat- token → Save.',
      'Run a test step (e.g. list your projects) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
  },

  // ─── Jira ──────────────────────────────────────────────────────
  'Jira API Token': {
    steps: [
      'Go to id.atlassian.com and sign in with your Atlassian account.',
      'Click "Security" tab → scroll to "API tokens" → Create API token.',
      'Give it a label (e.g. CtrlChecks) and click Create. Copy the token shown.',
      'Your Jira base URL is: https://yourcompany.atlassian.net (replace "yourcompany" with your organization name shown in your Jira URL).',
      'In CtrlChecks → left menu → Connections → Add Connection → Jira → enter your Jira URL (https://yourcompany.atlassian.net), your email address, and the API token → Save.',
      'To find your project key: open any Jira project — the key is shown in brackets next to the project name (e.g. PROJ).',
      'Run a test step (e.g. create a test issue) to confirm the connection works.',
    ],
    docsUrl: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  },

  // ─── Jenkins ───────────────────────────────────────────────────
  'Jenkins API Token': {
    steps: [
      'Log in to your Jenkins server (usually at http://yourserver:8080).',
      'Click your username in the top right → Configure (or go to /user/your-username/configure).',
      'Scroll down to "API Token" section → click "Add new Token" → give it a name → Generate.',
      'Copy the token — it is a long string of letters and numbers, shown only once.',
      'Note your Jenkins URL (e.g. http://yourserver:8080) and username.',
      'In CtrlChecks → left menu → Connections → Add Connection → Jenkins → enter Jenkins URL, username, and API token → Save.',
      'Run a test step (e.g. trigger a build) to confirm the connection works.',
    ],
    docsUrl: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
  },

  // ─── Twilio ────────────────────────────────────────────────────
  'Twilio Credential': {
    steps: [
      'Go to console.twilio.com and sign in (or create a free trial account — you get free credits to start).',
      'On the main dashboard, you will see "Account Info". Copy the Account SID (starts with AC) and Auth Token. Click "Show" next to the Auth Token to reveal it.',
      'For your "From" phone number (the number SMS will be sent from): go to Phone Numbers → Manage → Active Numbers. Copy one of your Twilio numbers.',
      'In CtrlChecks → left menu → Connections → Add Connection → Twilio → enter Account SID and Auth Token → Save.',
      'Run a test step to send an SMS to your own phone number to confirm it works.',
      'Note: Twilio free trial accounts can only send to verified numbers. To send to any number, upgrade your Twilio account.',
    ],
    docsUrl: 'https://www.twilio.com/docs/usage/api',
  },

  // ─── Mailgun ───────────────────────────────────────────────────
  'Mailgun API Key': {
    steps: [
      'Go to mailgun.com and sign in to your account.',
      'Go to Sending → Domains. If you do not have a domain yet, click "Add New Domain" and follow the DNS setup instructions (takes a few minutes to verify).',
      'Go to Settings → API Keys → click "Create API Key" (or "Add new key"). Give it a name and copy the Private API Key — it starts with key-.',
      'Note your verified sending domain (e.g. mg.yourcompany.com) — you will need this in the node.',
      'In CtrlChecks → left menu → Connections → Add Connection → Mailgun → paste the key- API key → Save.',
      'When using the node, set the Domain field to your verified domain and the From field to an address on that domain (e.g. hello@mg.yourcompany.com).',
      'Run a test to send an email to yourself to confirm it works.',
    ],
    docsUrl: 'https://documentation.mailgun.com/en/latest/api_reference.html',
  },

  // ─── SendGrid ──────────────────────────────────────────────────
  'SendGrid API Key': {
    steps: [
      'Go to app.sendgrid.com and sign in to your SendGrid account.',
      'Click Settings in the left sidebar → API Keys → Create API Key.',
      'Give it a name (e.g. CtrlChecks) → choose "Full Access" or "Restricted Access" with "Mail Send" enabled → Create & View.',
      'Copy the API key — it starts with SG. and is shown only once.',
      'Verify your sender identity: Settings → Sender Authentication → verify a single sender email or your entire domain.',
      'In CtrlChecks → left menu → Connections → Add Connection → SendGrid → paste the SG. key → Save.',
      'Run a test to send an email to yourself to confirm it works.',
    ],
    docsUrl: 'https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/authentication',
  },

  // ─── Amazon SES ────────────────────────────────────────────────
  'Amazon SES Access Key': {
    steps: [
      'Go to aws.amazon.com and sign in → open the IAM (Identity and Access Management) service.',
      'Click Users → Create user. Give it a name (e.g. ctrlchecks-ses) and click Next.',
      'Under "Permissions options", click "Attach policies directly" → search for "AmazonSESFullAccess" → select it → Next → Create user.',
      'Click the new user → Security credentials tab → Access keys → Create access key → Application running outside AWS.',
      'Copy the Access Key ID and Secret Access Key. Download the CSV to save them securely.',
      'In CtrlChecks → left menu → Connections → Add Connection → Amazon SES Access Key → enter Access Key ID, Secret Access Key, and your AWS Region (e.g. us-east-1) → Save.',
      'First verify your email or domain in Amazon SES before sending (SES → Verified identities → Create identity).',
    ],
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/security-iam.html',
  },

  // ─── AWS S3 ────────────────────────────────────────────────────
  'AWS S3 Credential': {
    steps: [
      'Go to aws.amazon.com and sign in → open IAM (Identity and Access Management).',
      'Click Users → Create user. Give it a name (e.g. ctrlchecks-s3) and click Next.',
      'Under "Permissions options", click "Attach policies directly" → search for "AmazonS3FullAccess" → select it → Next → Create user.',
      'Click the new user → Security credentials tab → Access keys → Create access key → Application running outside AWS.',
      'Copy the Access Key ID and Secret Access Key. Also note your AWS region (e.g. us-east-1) and your S3 bucket name.',
      'In CtrlChecks → left menu → Connections → Add Connection → AWS S3 → enter Access Key ID, Secret Access Key, and Region → Save.',
      'Run a test step (e.g. upload a small test file) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-up-s3.html',
  },

  // ─── Zoom ──────────────────────────────────────────────────────
  'Zoom Credential': {
    steps: [
      'In CtrlChecks, open the Zoom node credential picker and click + Add, or go to Connections -> Add Connection -> Zoom OAuth2.',
      'A Zoom authorization window opens through the generic CtrlChecks OAuth callback.',
      'Sign in to Zoom and approve the requested scopes: meeting:write:meeting, meeting:read:meeting, meeting:read:list_meetings, and user:read:user.',
      'After Zoom redirects back, choose the saved Zoom OAuth2 connection in the node.',
      'Run List Meetings or Create Meeting to confirm the connection works.',
    ],
    docsUrl: 'https://developers.zoom.us/docs/integrations/oauth/',
  },

  // ─── Microsoft Teams ───────────────────────────────────────────
  'Microsoft Teams Credential': {
    steps: [
      'Go to portal.azure.com and sign in with your Microsoft/Office 365 account.',
      'Go to Azure Active Directory → App registrations → New registration.',
      'Give it a name (e.g. CtrlChecks) → under "Redirect URI", select "Web" and enter: http://localhost:3001/api/oauth/microsoft/callback → Register.',
      'On the app overview page, copy the Application (client) ID and the Directory (tenant) ID.',
      'Go to Certificates & Secrets → New client secret → give it a name → Add. Copy the secret VALUE immediately (not the Secret ID).',
      'Go to API permissions → Add a permission → Microsoft Graph → Delegated → add ChannelMessage.Send and Team.ReadBasic.All.',
      'In CtrlChecks → left menu → Connections → Add Connection → Microsoft Teams → enter Client ID, Secret, and Tenant ID → Connect with Microsoft → authorize.',
    ],
    docsUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-flow-bot',
  },

  // ─── WhatsApp Cloud ────────────────────────────────────────────
  'WhatsApp Cloud API': {
    steps: [
      'You need a Meta Business Account. Go to business.facebook.com and sign in (or create a free business account).',
      'Set up a WhatsApp Business Account: Meta Business Suite → left menu → WhatsApp → Get Started. Follow the steps to verify your business phone number.',
      'Go to Meta Business Suite → Settings → Business Assets → WhatsApp Accounts → select your account → Settings. Copy the Phone Number ID (a long number like 123456789012345).',
      'For your access token: go to developers.facebook.com → your app → WhatsApp → API Setup → generate a permanent System User access token.',
      'In CtrlChecks → left menu → Connections → Add Connection → WhatsApp → paste the access token and Phone Number ID → Save.',
      'For new conversations, you must use an approved message template (not free-form text). Go to Meta Business Suite → WhatsApp → Message Templates to create and submit one for approval (takes 24-48 hours).',
      'Run a test step to send a template message to a verified test number to confirm it works.',
    ],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  },

  // ─── Pipedrive ─────────────────────────────────────────────────
  'Pipedrive API Key': {
    steps: [
      'Log in to your Pipedrive account at app.pipedrive.com.',
      'Click your profile photo or initials (top right) → Personal Preferences.',
      'Click the "API" tab. Your API token is shown — copy it.',
      'In CtrlChecks → left menu → Connections → Add Connection → Pipedrive → paste the API token → Save.',
      'To find a deal ID for use in the node: open any deal in Pipedrive — the number in the browser URL (e.g. /deal/123) is the deal ID.',
      'Run a test step (e.g. search for a deal) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.pipedrive.com/docs/api/v1',
  },

  // ─── Zoho CRM ──────────────────────────────────────────────────
  'Zoho CRM Credential': {
    steps: [
      'Go to api-console.zoho.com and sign in with your Zoho account.',
      'Click "+ Add Client" → select "Server-based Applications".',
      'Fill in client name (e.g. CtrlChecks), homepage URL, and set Authorized Redirect URI to: http://localhost:3001/api/oauth/zoho/callback → Create.',
      'Copy the Client ID and Client Secret shown.',
      'In CtrlChecks → left menu → Connections → Add Connection → Zoho CRM → click "Connect with Zoho" → sign in → allow access.',
      'Run a test step (e.g. list contacts) to confirm the connection works.',
    ],
    docsUrl: 'https://www.zoho.com/crm/developer/docs/api/v3/oauth-overview.html',
  },

  // ─── Microsoft Dynamics ─────────────────────────────────────────
  'Microsoft Dynamics Credential': {
    steps: [
      'Go to portal.azure.com and sign in → Azure Active Directory → App registrations → New registration.',
      'Give it a name (e.g. CtrlChecks Dynamics) and set Redirect URI to: http://localhost:3001/api/oauth/dynamics/callback → Register.',
      'Copy the Application (client) ID and Directory (tenant) ID from the app overview page.',
      'Go to Certificates & Secrets → New client secret → Add. Copy the secret VALUE.',
      'Go to API permissions → Add a permission → Dynamics CRM → Delegated → user_impersonation → Add.',
      'Note your Dynamics organization URL (e.g. https://yourorg.crm.dynamics.com).',
      'In CtrlChecks → left menu → Connections → Add Connection → Microsoft Dynamics → enter Client ID, Secret, Tenant, and Organization URL → authorize.',
    ],
    docsUrl: 'https://docs.microsoft.com/en-us/power-apps/developer/data-platform/authenticate-oauth',
  },

  'SAP Credential': {
    steps: [
      'In your SAP system, ask your SAP administrator to create a Communication User with the required roles for the APIs you need.',
      'In SAP Communication Management, set up a Communication Arrangement for the API (OData or REST endpoint) with Basic Authentication.',
      'Note the base URL for your SAP system (e.g. https://yoursystem.sap.com), the username, and password.',
      'In CtrlChecks → left menu → Connections → Add Connection → SAP → enter Base URL, Username, and Password → Test Connection → Save.',
      'Run a test step to confirm the connection works.',
    ],
    docsUrl: 'https://help.sap.com/docs/',
  },

  // ─── Xero ──────────────────────────────────────────────────────
  'Xero Credential': {
    steps: [
      'Go to developer.xero.com/app/manage and sign in with your Xero account.',
      'Click "New app" → give it a name (e.g. CtrlChecks) → select "Web app" → fill in company and website URL.',
      'In the "Redirect URIs" field, enter: http://localhost:3001/api/oauth/xero/callback → Create app.',
      'Copy the Client ID and Client Secret from the app configuration page.',
      'In CtrlChecks → left menu → Connections → Add Connection → Xero → click "Connect with Xero" → sign in → allow access.',
      'Run a test step (e.g. list invoices) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.xero.com/documentation/getting-started-guide',
  },

  // ─── Zendesk ───────────────────────────────────────────────────
  'Zendesk Credential': {
    steps: [
      'Log in to your Zendesk admin panel at yoursubdomain.zendesk.com.',
      'Click Admin Center (gear icon, bottom left) → Apps and Integrations → APIs → Zendesk API.',
      'Make sure "Token Access" is enabled (toggle it on if not). Click "+ Add API token" → give it a description.',
      'Copy the API token shown. Note your Zendesk subdomain — it is the part before .zendesk.com (e.g. if URL is acme.zendesk.com, subdomain is acme).',
      'In CtrlChecks → left menu → Connections → Add Connection → Zendesk → enter subdomain, your admin email address, and the API token → Save.',
      'Run a test step (e.g. create a test ticket) to confirm it appears in Zendesk.',
    ],
    docsUrl: 'https://developer.zendesk.com/documentation/ticketing/getting-started/hands-on-with-the-zendesk-api/',
  },

  // ─── Mailchimp ─────────────────────────────────────────────────
  'Mailchimp API Key': {
    steps: [
      'Log in to your Mailchimp account at mailchimp.com.',
      'Click your profile name (bottom left) → Account & billing → Extras → API keys.',
      'Click "Create A Key" → give it a name (e.g. CtrlChecks) → Generate Key.',
      'Copy the API key shown — it ends with a datacenter code like -us21.',
      'In CtrlChecks → left menu → Connections → Add Connection → Mailchimp → paste the API key → Save.',
      'Run a test step (e.g. list your audiences) to confirm the connection works.',
    ],
    docsUrl: 'https://mailchimp.com/developer/marketing/guides/quick-start/',
  },

  // ─── ActiveCampaign ────────────────────────────────────────────
  'ActiveCampaign API Key': {
    steps: [
      'Log in to your ActiveCampaign account.',
      'Click Settings (gear icon, bottom left) → Developer.',
      'You will see your API URL (e.g. https://youracccount.api-us1.com) and API Key. Copy both.',
      'In CtrlChecks → left menu → Connections → Add Connection → ActiveCampaign → enter the API URL and API Key → Save.',
      'Run a test step (e.g. list contacts) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.activecampaign.com/reference/url',
  },

  // ─── Freshdesk ─────────────────────────────────────────────────
  'Freshdesk API Key': {
    steps: [
      'Log in to your Freshdesk account at yourcompany.freshdesk.com.',
      'Click your profile photo (top right) → Profile Settings.',
      'On the right side of the page, you will see "Your API Key". Copy it.',
      'Note your Freshdesk subdomain — it is the part before .freshdesk.com (e.g. if URL is mycompany.freshdesk.com, subdomain is mycompany).',
      'In CtrlChecks → left menu → Connections → Add Connection → Freshdesk → enter your domain (mycompany.freshdesk.com) and API key → Save.',
      'Run a test step (e.g. create a test ticket) to confirm it appears in Freshdesk.',
    ],
    docsUrl: 'https://developers.freshdesk.com/api/',
  },

  // ─── Intercom ──────────────────────────────────────────────────
  'Intercom API Key': {
    steps: [
      'Log in to your Intercom account at app.intercom.com.',
      'Click Settings (gear icon) → Integrations → Developer Hub.',
      'Click "Your Apps" → select your app (or create one) → click "Authentication".',
      'Copy the Access Token shown.',
      'In CtrlChecks → left menu → Connections → Add Connection → Intercom → paste the access token → Save.',
      'Run a test step (e.g. list users/contacts) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.intercom.com/building-apps/docs/authorization',
  },

  // ─── ClickUp ───────────────────────────────────────────────────
  'ClickUp API Key': {
    steps: [
      'Log in to your ClickUp account at app.clickup.com.',
      'Click your profile avatar (bottom left) → Settings → Apps.',
      'Under "API Token", click "Generate" if no token exists, or copy the existing token.',
      'In CtrlChecks → left menu → Connections → Add Connection → ClickUp → paste the API token → Save.',
      'Run a test step (e.g. list spaces or tasks) to confirm the connection works.',
    ],
    docsUrl: 'https://clickup.com/api',
  },

  // ─── Vercel ────────────────────────────────────────────────────
  'Vercel API Token': {
    steps: [
      'Go to vercel.com and sign in to your account.',
      'Click your profile photo (top right) → Account Settings → Tokens.',
      'Click "Create" → give it a name (e.g. CtrlChecks) → set scope to "Full Account" or a specific team → set an expiry → Create Token.',
      'Copy the token immediately — it is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Vercel → paste the token → Save.',
      'Run a test step (e.g. list your deployments) to confirm the connection works.',
    ],
    docsUrl: 'https://vercel.com/docs/rest-api',
  },

  // ─── Netlify ───────────────────────────────────────────────────
  'Netlify API Token': {
    steps: [
      'Go to app.netlify.com and sign in to your account.',
      'Click your profile photo (top right) → User settings → Applications.',
      'Under "Personal access tokens", click "New access token" → give it a description → Generate token.',
      'Copy the token shown — it is only displayed once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Netlify → paste the token → Save.',
      'Run a test step (e.g. list your sites) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.netlify.com/api/get-started/',
  },

  // ─── WordPress ─────────────────────────────────────────────────
  'WordPress Credential': {
    steps: [
      'Log in to your WordPress admin dashboard (yoursite.com/wp-admin).',
      'Go to Users → select your admin user profile.',
      'Scroll down to "Application Passwords" (near the bottom).',
      'Enter a name (e.g. CtrlChecks) and click "Add New Application Password".',
      'Copy the generated password shown — spaces are included, copy everything exactly as shown.',
      'Note your WordPress site URL (e.g. https://yoursite.com) and username.',
      'In CtrlChecks → left menu → Connections → Add Connection → WordPress → enter site URL, username, and application password → Save.',
    ],
    docsUrl: 'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/',
  },

  // ─── Contentful ────────────────────────────────────────────────
  'Contentful API Key': {
    steps: [
      'Log in to your Contentful account at app.contentful.com.',
      'Go to your Space → Settings → API keys → Add API key.',
      'Give it a name (e.g. CtrlChecks) → Save.',
      'Copy two values: the Space ID (shown at the top) and the Content Delivery API access token (for reading) or Content Management API token (for writing).',
      'In CtrlChecks → left menu → Connections → Add Connection → Contentful → paste the Space ID and relevant API token → Save.',
      'Run a test step (e.g. list entries) to confirm the connection works.',
    ],
    docsUrl: 'https://www.contentful.com/developers/docs/references/authentication/',
  },

  // ─── Pinecone ──────────────────────────────────────────────────
  'Pinecone API Key': {
    steps: [
      'Go to app.pinecone.io and sign in (or create a free account).',
      'Click "API Keys" in the left sidebar → "Create API Key".',
      'Give it a name (e.g. CtrlChecks) and copy the key.',
      'Also note your Pinecone environment (e.g. us-east-1-aws or gcp-starter) — shown on your index page.',
      'In CtrlChecks → left menu → Connections → Add Connection → Pinecone → paste the API key and enter your environment → Save.',
      'Run a test step (e.g. list indexes) to confirm the connection works.',
    ],
    docsUrl: 'https://docs.pinecone.io/guides/getting-started/quickstart',
  },

  // ─── Typeform ──────────────────────────────────────────────────
  'Typeform API Key': {
    steps: [
      'Log in to your Typeform account at typeform.com.',
      'Click your profile photo (top right) → Settings → Personal tokens.',
      'Click "Generate a new token" → give it a name (e.g. CtrlChecks) → Generate token.',
      'Copy the token shown — it is only displayed once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Typeform → paste the token → Save.',
      'Run a test step (e.g. list your forms) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.typeform.com/get-started/personal-access-token/',
  },

  // ─── Calendly ──────────────────────────────────────────────────
  'Calendly API Key': {
    steps: [
      'Log in to your Calendly account at calendly.com.',
      'Click your profile photo (top right) → Integrations → API & Webhooks.',
      'Under "Personal Access Tokens", click "Generate new token" → give it a name → Create Token.',
      'Copy the token shown.',
      'In CtrlChecks → left menu → Connections → Add Connection → Calendly → paste the token → Save.',
      'Run a test step (e.g. list your event types) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.calendly.com/api-docs/ZG9jOjExMjM0NzU2-calendly-developer-portal',
  },

  // ─── Intuit / QuickBooks ───────────────────────────────────────
  'Intuit Credential': {
    steps: [
      'Go to developer.intuit.com and sign in with your Intuit/QuickBooks account.',
      'Click Dashboard → Create an app → select "QuickBooks Online and Payments".',
      'Give it a name (e.g. CtrlChecks) → Create app.',
      'Under "Keys & OAuth", note the Client ID and Client Secret.',
      'Click "Add URI" under Redirect URIs and enter: http://localhost:3001/api/oauth/intuit/callback → Save.',
      'In CtrlChecks → left menu → Connections → Add Connection → QuickBooks → click "Connect with Intuit" → sign in → authorize.',
      'Run a test step (e.g. list customers) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
  },

  // ─── MongoDB ───────────────────────────────────────────────────
  'MongoDB Connection': {
    steps: [
      'For MongoDB Atlas (cloud): go to cloud.mongodb.com and sign in → open your cluster → click "Connect" → "Connect your application".',
      'Copy the connection string — it looks like: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/databasename',
      'Replace "password" in the string with your actual database user password.',
      'For local MongoDB: use the connection string: mongodb://localhost:27017/yourdatabasename',
      'In CtrlChecks → left menu → Connections → Add Connection → MongoDB → paste the connection string → Save.',
      'Run a test step (e.g. find documents in a collection) to confirm the connection works.',
    ],
    docsUrl: 'https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/',
  },

  // ─── MySQL ─────────────────────────────────────────────────────
  'MySQL Connection': {
    steps: [
      'Make sure your MySQL server is running and accessible from the internet (or your local network).',
      'You need: server hostname (or IP address), port (default is 3306), database name, username, and password.',
      'For AWS RDS MySQL: go to AWS Console → RDS → your database → Connectivity & security. The "Endpoint" is your hostname.',
      'Make sure the MySQL server allows remote connections and the firewall allows port 3306 from CtrlChecks.',
      'In CtrlChecks → left menu → Connections → Add Connection → MySQL → enter Host, Port, Database, Username, Password → Test Connection → Save.',
      'Run a simple SELECT query to confirm CtrlChecks can read from your database.',
    ],
    docsUrl: 'https://dev.mysql.com/doc/refman/8.0/en/',
  },

  // ─── Redis ─────────────────────────────────────────────────────
  'Redis Connection': {
    steps: [
      'Make sure your Redis server is running (default port is 6379).',
      'Your Redis connection URL format: redis://localhost:6379 (local, no password) or redis://:yourpassword@yourhost:6379 (with password).',
      'For Redis Cloud (Upstash, Redis Cloud): log in and copy the connection URL from your database settings.',
      'In CtrlChecks → left menu → Connections → Add Connection → Redis → paste the Redis URL → Save.',
      'Run a test step (e.g. set a key with a short TTL) to confirm the connection works.',
    ],
    docsUrl: 'https://redis.io/docs/connect/clients/nodejs/',
  },

  // ─── Firebase ──────────────────────────────────────────────────
  'Firebase Credential': {
    steps: [
      'Go to console.firebase.google.com and sign in → open your project.',
      'Click the gear icon (top left) → Project Settings → Service Accounts tab.',
      'Click "Generate new private key" → Generate key → confirm. A JSON file downloads to your computer.',
      'Open the JSON file and copy its entire contents (the whole JSON object from { to }).',
      'In CtrlChecks → left menu → Connections → Add Connection → Firebase → paste the service account JSON → Save.',
      'Run a test step (e.g. read a document from Firestore) to confirm the connection works.',
    ],
    docsUrl: 'https://firebase.google.com/docs/admin/setup',
  },

  // ─── Dropbox ───────────────────────────────────────────────────
  'Dropbox Credential': {
    steps: [
      'Go to dropbox.com/developers/apps and sign in with your Dropbox account.',
      'Click "Create app" → choose "Scoped access" → "Full Dropbox" → give it a name (e.g. CtrlChecks) → Create app.',
      'Under the "Permissions" tab, enable: files.metadata.read, files.content.read, files.content.write.',
      'Under the "Settings" tab, add this Redirect URI: http://localhost:3001/api/oauth/dropbox/callback → Add.',
      'In CtrlChecks → left menu → Connections → Add Connection → Dropbox → click "Connect with Dropbox" → sign in → Allow.',
      'Run a test step (e.g. list files in a folder) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.dropbox.com/oauth-guide',
  },

  // ─── OneDrive ──────────────────────────────────────────────────
  'OneDrive Credential': {
    steps: [
      'Go to portal.azure.com and sign in with your Microsoft account.',
      'Go to Azure Active Directory → App registrations → New registration.',
      'Give it a name (e.g. CtrlChecks OneDrive) → set Redirect URI to: http://localhost:3001/api/oauth/onedrive/callback → Register.',
      'Copy the Application (client) ID and Directory (tenant) ID.',
      'Go to Certificates & Secrets → New client secret → Add. Copy the secret VALUE immediately.',
      'Go to API permissions → Add a permission → Microsoft Graph → Delegated → Files.ReadWrite.',
      'In CtrlChecks → left menu → Connections → Add Connection → OneDrive → enter Client ID, Secret, and Tenant ID → Connect with Microsoft → authorize.',
    ],
    docsUrl: 'https://docs.microsoft.com/en-us/onedrive/developer/rest-api/getting-started/msa-oauth',
  },

  // ─── Workday ───────────────────────────────────────────────────
  'Workday Credential': {
    steps: [
      'Log in to your Workday tenant as an administrator.',
      'Search for "Register API Client" in the Workday search bar → open it.',
      'Fill in the Client Name (e.g. CtrlChecks), set the Redirect URI to: http://localhost:3001/api/oauth/workday/callback',
      'Select the required functional areas (scopes) such as Staffing or Human Resources.',
      'Save the configuration — Workday will show you a Client ID and Client Secret. Copy both.',
      'Note your Workday tenant URL (e.g. https://wd2.myworkday.com/yourcompany).',
      'In CtrlChecks → left menu → Connections → Add Connection → Workday → enter Client ID, Secret, Tenant, and Instance URL → authorize.',
    ],
    docsUrl: 'https://community.workday.com/articles/1084547',
  },

  // ─── Chargebee ─────────────────────────────────────────────────
  'Chargebee API Key': {
    steps: [
      'Log in to your Chargebee account.',
      'Go to Settings (gear icon) → Configure Chargebee → API Keys.',
      'Click "Create a Key" → give it a name (e.g. CtrlChecks) → select "Full Access" or specific permissions → Create.',
      'Copy the API key shown.',
      'Note your Chargebee site name — it is the part before .chargebee.com in your URL (e.g. if URL is mysite.chargebee.com, site name is mysite).',
      'In CtrlChecks → left menu → Connections → Add Connection → Chargebee → paste the API key and enter your site name → Save.',
      'Run a test step (e.g. list customers) to confirm the connection works.',
    ],
    docsUrl: 'https://apidocs.chargebee.com/docs/api',
  },

  // ─── Tally ─────────────────────────────────────────────────────
  'Tally API Key': {
    steps: [
      'Log in to your Tally account at tally.so.',
      'Go to Settings → API → Generate new access token.',
      'Give it a name and copy the token.',
      'In CtrlChecks → left menu → Connections → Add Connection → Tally → paste the token → Save.',
      'Run a test step (e.g. list your forms) to confirm the connection works.',
    ],
    docsUrl: 'https://tallyforms.notion.site/Tally-API-Documentation',
  },

  // ─── Google Cloud Storage ──────────────────────────────────────
  'Google Cloud Storage Credential': {
    steps: [
      'Go to console.cloud.google.com and sign in → open your project (or create one).',
      'Go to IAM & Admin → Service Accounts → Create Service Account.',
      'Give it a name (e.g. ctrlchecks-storage) → click Create and Continue.',
      'Under "Grant this service account access to project", select role: Storage Object Admin → Continue → Done.',
      'Click the service account you just created → Keys tab → Add Key → Create new key → JSON → Create. A JSON file downloads.',
      'Open the JSON file and copy its entire contents.',
      'In CtrlChecks → left menu → Connections → Add Connection → Google Cloud Storage → paste the JSON key content → Save.',
    ],
    docsUrl: 'https://cloud.google.com/storage/docs/authentication',
  },

  // ─── Cohere ────────────────────────────────────────────────────
  'Cohere API Key': {
    steps: [
      'Go to dashboard.cohere.com and sign in (or create a free account).',
      'Click "API Keys" in the left sidebar → "New Trial key" (free) or "New Production key".',
      'Give it a name and copy the key.',
      'In CtrlChecks → left menu → Connections → Add Connection → Cohere → paste the API key → Save.',
      'Run a test step with a simple prompt to confirm Cohere responds correctly.',
    ],
    docsUrl: 'https://docs.cohere.com/docs/rate-limits',
  },

  // ─── HuggingFace ───────────────────────────────────────────────
  'HuggingFace API Key': {
    steps: [
      'Go to huggingface.co and sign in (or create a free account).',
      'Click your profile photo (top right) → Settings → Access Tokens.',
      'Click "New token" → give it a name → select "Read" for inference, or "Write" if needed → Generate a token.',
      'Copy the token — it starts with hf_.',
      'In CtrlChecks → left menu → Connections → Add Connection → HuggingFace → paste the hf_ token → Save.',
      'Run a test step to call a model and confirm the connection works.',
    ],
    docsUrl: 'https://huggingface.co/docs/hub/security-tokens',
  },

  // ─── Mistral ───────────────────────────────────────────────────
  'Mistral API Key': {
    steps: [
      'Go to console.mistral.ai and sign in (or create an account).',
      'Click "API Keys" in the left menu → "Create new key".',
      'Give it a name (e.g. CtrlChecks) and copy the key.',
      'In CtrlChecks → left menu → Connections → Add Connection → Mistral → paste the API key → Save.',
      'Run a test step with a simple prompt to confirm the Mistral model responds correctly.',
    ],
    docsUrl: 'https://docs.mistral.ai/getting-started/quickstart/',
  },

  // ─── Linear ────────────────────────────────────────────────────
  'Linear API Key': {
    steps: [
      'Go to linear.app and sign in to your workspace.',
      'Click Settings (bottom left gear icon) → API → Personal API keys → "Create key".',
      'Give it a label (e.g. CtrlChecks) and copy the key.',
      'In CtrlChecks → left menu → Connections → Add Connection → Linear → paste the API key → Save.',
      'Run a test step (e.g. list issues) to confirm the connection works.',
    ],
    docsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
  },

  // ─── Trello ────────────────────────────────────────────────────
  'Trello API Key': {
    steps: [
      'Go to trello.com/app-key while logged into your Trello account.',
      'Your API Key is shown on the page — copy it.',
      'Click "Token" on the same page → Allow → copy the user token shown.',
      'You now have two values: the API Key and the Token. Both are needed.',
      'In CtrlChecks → left menu → Connections → Add Connection → Trello → paste the API Key and Token → Save.',
      'Run a test step (e.g. list your boards) to confirm the connection works.',
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
  },

  // ─── Odoo ──────────────────────────────────────────────────────
  'Odoo Credential': {
    steps: [
      'Log in to your Odoo instance (e.g. https://yourcompany.odoo.com).',
      'Click your profile name (top right) → My Profile → Preferences tab.',
      'At the top of the Preferences page, you should see "API Keys". Click "New API Key" → give it a name → generate and copy the key.',
      'Note your Odoo URL, database name, and login username.',
      'In CtrlChecks → left menu → Connections → Add Connection → Odoo → enter your Odoo URL, database name, username, and API key → Save.',
      'Run a test step (e.g. list customers) to confirm the connection works.',
    ],
    docsUrl: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html',
  },

  // ─── No auth (internal / trigger / logic nodes) ───────────────
  'None': {
    steps: [
      'This node does not require any credentials or saved connection.',
      'Simply drag it onto the workflow canvas and configure the input fields shown.',
      'No setup in the Connections page is needed for this node.',
    ],
    docsUrl: '',
  },

  // ─── SMTP (email node) ─────────────────────────────────────────
  'SMTP Credential': {
    steps: [
      'You need your email provider\'s SMTP server details: Host, Port, Username, and Password.',
      'Common SMTP hosts: Gmail = smtp.gmail.com (port 587), Outlook/Office 365 = smtp.office365.com (port 587), Yahoo = smtp.mail.yahoo.com (port 587).',
      'For Gmail: do NOT use your normal Google password. Instead, create an App Password at myaccount.google.com/apppasswords → select "Mail" and your device → Generate. Copy the 16-character code.',
      'In CtrlChecks → left menu → Connections → Add Connection → Email (SMTP) → enter Host (smtp.gmail.com), Port (587), Username (your full email), and Password (the App Password) → Save.',
      'Run a test step to send an email to yourself to confirm it works.',
    ],
    docsUrl: 'https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol',
  },

  // ─── Outlook / Microsoft ──────────────────────────────────────
  'Microsoft Credential': {
    steps: [
      'Go to portal.azure.com and sign in with your Microsoft account.',
      'Go to Azure Active Directory → App registrations → New registration.',
      'Give it a name (e.g. CtrlChecks Email) → set Redirect URI to: http://localhost:3001/api/oauth/microsoft/callback → Register.',
      'Copy the Application (client) ID and Directory (tenant) ID.',
      'Go to Certificates & Secrets → New client secret → Add. Copy the secret VALUE immediately.',
      'Go to API permissions → Add a permission → Microsoft Graph → Delegated → add User.Read and Mail.Send. CtrlChecks also requests offline_access during OAuth so it can refresh the connection.',
      'In CtrlChecks → left menu → Connections → Add Connection → Microsoft Connection → enter Client ID, Secret, and Tenant ID → Connect with Microsoft → authorize.',
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/graph/permissions-reference',
  },

  // ─── Oracle Database ──────────────────────────────────────────
  'Oracle Credential': {
    steps: [
      'Ask your Oracle database administrator for the connection details: Host (server address), Port (default 1521), Service Name or SID, Username, and Password.',
      'Make sure the Oracle server firewall allows connections from CtrlChecks on port 1521.',
      'In CtrlChecks → left menu → Connections → Add Connection → Oracle Database → enter Host, Port, Service Name, Username, Password → Test Connection → Save.',
      'Run a simple SELECT query to confirm CtrlChecks can read from your Oracle database.',
    ],
    docsUrl: 'https://docs.oracle.com/en/database/oracle/oracle-database/19/netag/index.html',
  },

  // ─── SQL Server ───────────────────────────────────────────────
  'SQL Server Credential': {
    steps: [
      'Ask your database administrator for: Server hostname (or IP), Port (default 1433), Database name, Username, and Password.',
      'Make sure SQL Server allows remote connections: SQL Server Configuration Manager → Protocols → TCP/IP → Enabled.',
      'Make sure the Windows firewall or cloud security group allows inbound port 1433 from CtrlChecks.',
      'In CtrlChecks → left menu → Connections → Add Connection → SQL Server → enter Host, Port, Database, Username, Password → Test Connection → Save.',
      'Run a simple SELECT query to confirm CtrlChecks can read from your SQL Server database.',
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/sql/connect/node-js/node-js-driver-for-sql-server',
  },

  // ─── Bitbucket ────────────────────────────────────────────────
  'Bitbucket Credential': {
    steps: [
      'Log in to bitbucket.org with your account.',
      'Click your profile photo (bottom left) → Personal settings → App passwords.',
      'Click "Create app password" → give it a label (e.g. CtrlChecks).',
      'Select permissions: Repositories: Read and Write; Pipelines: Read and Write. Click Create.',
      'Copy the app password — it is shown only once.',
      'In CtrlChecks → left menu → Connections → Add Connection → Bitbucket → enter your Bitbucket username and the app password → Save.',
      'Run a test step (e.g. list your repositories) to confirm the connection works.',
    ],
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/create-an-app-password/',
  },
};

function oauthSteps(provider: string, consoleUrl: string, scope: string, callbackProvider: string, nodeName: string): CredentialGuide {
  return {
    steps: [
      `Open the ${provider} developer page at: ${consoleUrl}`,
      `Create a new app or project and give it a clear name such as "CtrlChecks".`,
      `Enable the required API or permission scope: ${scope}.`,
      `Create OAuth credentials. The provider will show a Client ID and Client Secret — copy both.`,
      `Add this redirect URI exactly: http://localhost:3001/api/oauth/${callbackProvider}/callback`,
      `In CtrlChecks → left menu → Connections → Add Connection → ${nodeName} → connect and approve access.`,
      `Run a test step to confirm the connection works.`,
    ],
    docsUrl: consoleUrl,
  };
}

function apiKeySteps(provider: string, dashboardUrl: string, nodeName: string): CredentialGuide {
  return {
    steps: [
      `Go to the ${provider} dashboard: ${dashboardUrl}`,
      `Find API Keys, Developers, or Settings → API section.`,
      `Click "Create new secret key", "Generate key", or the closest matching button.`,
      `Copy the secret key immediately — many services show it only once.`,
      `In CtrlChecks → left menu → Connections → Add Connection → ${nodeName} → paste the key → Save.`,
      `Run a test step to confirm the connection works.`,
    ],
    docsUrl: dashboardUrl,
  };
}

Object.assign(credentialSteps, {
  'Gmail OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Gmail API: gmail.send, gmail.readonly, gmail.modify', 'google', 'Gmail'),
  'Google Sheets OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Google Sheets API: spreadsheets.readonly and spreadsheets', 'google', 'Google Sheets'),
  'Google Drive OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Google Drive API: drive.file', 'google', 'Google Drive'),
  'Google Calendar OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Google Calendar API: calendar.events', 'google', 'Google Calendar'),
  'Google Docs OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Google Docs API: documents', 'google', 'Google Docs'),
  'Google OAuth': oauthSteps('Google Cloud', 'https://console.cloud.google.com/apis/credentials', 'Required Google Workspace API scopes', 'google', 'Google'),
  'LinkedIn OAuth': credentialSteps['LinkedIn Credential'],
  'Slack OAuth': credentialSteps['Slack Credential'],
  'GitHub API Key': credentialSteps['GitHub Access Token'],
  'GitLab API Key': credentialSteps['GitLab Access Token'],
  'Atlassian API Key': credentialSteps['Jira API Token'],
  'Jira API Key': credentialSteps['Jira API Token'],
  'Discord OAuth': credentialSteps['Discord Bot Token'],
  'Facebook OAuth': credentialSteps['Facebook Credential'],
  'Twitter OAuth': credentialSteps['Twitter API Key'],
  'Notion OAuth': credentialSteps['Notion API Key'],
  'Zoom OAuth': credentialSteps['Zoom Credential'],
  'Zoom OAuth2': credentialSteps['Zoom Credential'],
  'HubSpot OAuth': credentialSteps['HubSpot API Key'],
  'Shopify OAuth': credentialSteps['Shopify API Key'],
  'Calendly OAuth': credentialSteps['Calendly API Key'],
  'Xero OAuth': credentialSteps['Xero Credential'],
  'QuickBooks OAuth': credentialSteps['Intuit Credential'],
  'Workday OAuth': credentialSteps['Workday Credential'],
  'Oracle API Key': credentialSteps['Oracle Credential'],
  'SAP API Key': credentialSteps['SAP Credential'],

  google_oauth: credentialSteps['Google Credential'],
  linkedin_oauth: credentialSteps['LinkedIn Credential'],
  slack_oauth: credentialSteps['Slack Credential'],
  github_oauth: oauthSteps('GitHub', 'https://github.com/settings/developers', 'repo, workflow, user:email', 'github', 'GitHub'),
  twitter_oauth: credentialSteps['Twitter API Key'],
  discord_oauth: credentialSteps['Discord Bot Token'],
  facebook_oauth: credentialSteps['Facebook Credential'],
  notion_oauth: credentialSteps['Notion API Key'],
  zoom_oauth: credentialSteps['Zoom Credential'],
  zoom_oauth2: credentialSteps['Zoom Credential'],
  salesforce_oauth: credentialSteps['Salesforce Credential'],
  microsoft_oauth: credentialSteps['Microsoft Credential'],
  hubspot_oauth: credentialSteps['HubSpot API Key'],
  shopify_oauth: credentialSteps['Shopify API Key'],
  calendly_oauth: credentialSteps['Calendly API Key'],
  stripe_api_key: credentialSteps['Stripe API Key'],
  openai_api_key: credentialSteps['OpenAI API Key'],
  anthropic_api_key: credentialSteps['Anthropic API Key'],
  sendgrid_api_key: credentialSteps['SendGrid API Key'],
  mailgun_api_key: credentialSteps['Mailgun API Key'],
  twilio_api_key: credentialSteps['Twilio Credential'],
  airtable_api_key: credentialSteps['Airtable API Key'],
  typeform_api_key: credentialSteps['Typeform API Key'],
  pinecone_api_key: credentialSteps['Pinecone API Key'],
  cohere_api_key: credentialSteps['Cohere API Key'],
  jira_api_key: credentialSteps['Jira API Token'],
  zendesk_api_key: credentialSteps['Zendesk Credential'],
  intercom_api_key: credentialSteps['Intercom API Key'],
  freshdesk_api_key: credentialSteps['Freshdesk API Key'],
  mailchimp_api_key: credentialSteps['Mailchimp API Key'],
  xero_oauth: credentialSteps['Xero Credential'],
  quickbooks_oauth: credentialSteps['Intuit Credential'],
  workday_oauth: credentialSteps['Workday Credential'],
  sap_api_key: credentialSteps['SAP Credential'],
  oracle_api_key: credentialSteps['Oracle Credential'],
  sendgrid: credentialSteps['SendGrid API Key'],
  mailgun: credentialSteps['Mailgun API Key'],
});

Object.assign(credentialSteps, {
  'AWS Credential': credentialSteps['AWS S3 Credential'],
  'AWS SES Credential': credentialSteps['Amazon SES Access Key'],
  'PostgreSQL Credential': credentialSteps['PostgreSQL Connection'],
  'MongoDB Credential': credentialSteps['MongoDB Connection'],
  'MySQL Credential': credentialSteps['MySQL Connection'],
  'Redis Credential': credentialSteps['Redis Connection'],
  'FTP Credential': {
    steps: [
      'Get FTP connection details from your hosting provider: Host (server address), Port (usually 21), Username, Password, and the remote directory path.',
      'Confirm the FTP server allows connections from CtrlChecks on port 21.',
      'In CtrlChecks → left menu → Connections → Add Connection → FTP → enter Host, Port, Username, and Password → Test Connection → Save.',
      'Tip: Use SFTP instead of FTP whenever your provider supports it — SFTP is encrypted and much more secure.',
    ],
    docsUrl: 'https://en.wikipedia.org/wiki/File_Transfer_Protocol',
  },
  'SFTP Credential': {
    steps: [
      'Get SFTP connection details from your server administrator: Host (server address or IP), Port (usually 22), Username, and either Password or SSH private key.',
      'Make sure the server firewall allows SSH/SFTP connections (port 22) from CtrlChecks.',
      'In CtrlChecks → left menu → Connections → Add Connection → SFTP → enter Host, Port, Username, and your authentication (password or private key).',
      'If using a private key: paste the full key content including the -----BEGIN and -----END lines.',
      'Click Test Connection → Save. Run a test step to confirm file transfer works.',
    ],
    docsUrl: 'https://en.wikipedia.org/wiki/SSH_File_Transfer_Protocol',
  },
  'Meta App Credentials': credentialSteps['Facebook Credential'],
  'Jenkins API Key': credentialSteps['Jenkins API Token'],
  'Netlify API Key': credentialSteps['Netlify API Token'],
  'Vercel API Key': credentialSteps['Vercel API Token'],
  'Zendesk API Key': credentialSteps['Zendesk Credential'],
  'Zoho Credential': credentialSteps['Zoho CRM Credential'],

  google_oauth: credentialSteps['Google Credential'],
  linkedin_oauth: credentialSteps['LinkedIn Credential'],
  slack_oauth: credentialSteps['Slack Credential'],
  github_oauth: oauthSteps('GitHub', 'https://github.com/settings/developers', 'repo, workflow, user:email', 'github', 'GitHub'),
  twitter_oauth: credentialSteps['Twitter API Key'],
  discord_oauth: credentialSteps['Discord Bot Token'],
  facebook_oauth: credentialSteps['Facebook Credential'],
  notion_oauth: credentialSteps['Notion API Key'],
  zoom_oauth: credentialSteps['Zoom Credential'],
  zoom_oauth2: credentialSteps['Zoom Credential'],
  salesforce_oauth: credentialSteps['Salesforce Credential'],
  microsoft_oauth: credentialSteps['Microsoft Credential'],
  hubspot_oauth: credentialSteps['HubSpot API Key'],
  shopify_oauth: credentialSteps['Shopify API Key'],
  calendly_oauth: credentialSteps['Calendly API Key'],
  xero_oauth: credentialSteps['Xero Credential'],
  quickbooks_oauth: credentialSteps['Intuit Credential'],
  workday_oauth: credentialSteps['Workday Credential'],
  sap_api_key: credentialSteps['SAP Credential'],
  oracle_api_key: credentialSteps['Oracle Credential'],
});

function cleanStepText(step: string): string {
  return step
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/…/g, '...')
    .replace(/â†'/g, '->')
    .replace(/â€"/g, '-')
    .replace(/â€¦/g, '...')
    .replace(/â‹¯/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOAuthCredential(type: string): boolean {
  const lower = type.toLowerCase();
  return lower.includes('oauth') ||
    lower.includes('credential') && !lower.includes('api key') && !lower.includes('connection') ||
    ['Microsoft Credential', 'Salesforce Credential', 'Xero Credential', 'PayPal Credential', 'Dropbox Credential'].includes(type);
}

function normalizeCredentialGuide(type: string, guide: CredentialGuide): CredentialGuide {
  if (type === 'None') {
    return {
      ...guide,
      steps: [
        'This node does not need a saved account connection.',
        'Open the node settings and fill the visible input fields.',
        'Run the workflow when the required fields are complete.',
      ],
    };
  }

  const serviceName = type
    .replace(/ OAuth| API Key| Credential| Connection| Token| URL/g, '')
    .trim() || type;
  const kind = isOAuthCredential(type) ? 'OAuth connection' : 'API key or account connection';
  const article = /^[AEIOU]/.test(kind) ? 'an' : 'a';
  const intro = `What this is: ${serviceName} uses ${article} ${kind} so CtrlChecks can safely access your ${serviceName} account.`;
  const safety = 'Safety note: Treat secrets, tokens, passwords, and client secrets like passwords. Only paste them into CtrlChecks Connections, not into regular workflow text fields.';
  const test = `After saving, click Test Connection if it is available, then return to the ${serviceName} node and select the saved connection.`;

  const cleanedSteps = guide.steps
    .map(cleanStepText)
    .filter(Boolean)
    .filter((step, index, all) => all.indexOf(step) === index);

  const steps = [intro, ...cleanedSteps];
  if (!steps.some((step) => step.toLowerCase().includes('ctrlchecks'))) {
    steps.push(`In CtrlChecks, open Connections -> Add Connection -> ${serviceName}, enter the values, and click Save.`);
  }
  if (!steps.some((step) => step.toLowerCase().includes('safety note'))) steps.push(safety);
  if (!steps.some((step) => step.toLowerCase().includes('test connection'))) steps.push(test);

  return {
    ...guide,
    steps,
  };
}

for (const [credentialType, guide] of Object.entries(credentialSteps)) {
  if (!guide?.steps) {
    delete credentialSteps[credentialType];
    continue;
  }
  credentialSteps[credentialType] = normalizeCredentialGuide(credentialType, guide);
}

/**
 * Get credential setup steps for a node type.
 * Falls back to a generic guide if the credential type is not found.
 */
export function getCredentialSteps(credentialType: string): CredentialGuide {
  return credentialSteps[credentialType] ?? normalizeCredentialGuide(credentialType, {
    steps: [
      `Open the official account dashboard for ${credentialType}.`,
      'Look for a section named API Keys, Developers, Apps, Integrations, or Security.',
      'Create or copy the required API key, token, OAuth Client ID, OAuth Client Secret, username, password, host, or account ID.',
      'In CtrlChecks, open Connections -> Add Connection -> select this service.',
      'Paste the values into the matching fields and click Save.',
      'Test the connection before running the workflow.',
    ],
    docsUrl: '',
  });
}
