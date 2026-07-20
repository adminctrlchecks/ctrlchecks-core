// Comprehensive node-specific guides for getting API keys, URLs, and credentials

export interface NodeGuide {
  title: string;
  steps: string[];
  url?: string;
  example?: string;
}

export type NodeType = string;
export type FieldKey = string;

// Guide data structure: nodeType -> fieldKey -> guide
export const NODE_GUIDES: Record<NodeType, Record<FieldKey, NodeGuide>> = {
  chat_trigger: {
    message: {
      title: 'How to use Chat Message?',
      steps: [
        'You usually do not type this in the Chat Trigger panel because the chat page sends it when a visitor submits a message.',
        'Use {{$json.message}} in the next node when an AI Agent, lookup, ticket, or log needs the visitor question.',
        'For tests or generated workflow payloads, send a plain non-empty string such as I want to track order ORD-1048.',
        'Blank or whitespace-only messages are rejected by the chat message endpoint before the workflow starts.'
      ],
      example: '{{$json.message}}'
    },
    channel: {
      title: 'How to use Channel?',
      steps: [
        'Channel is a backend schema context field for generated or simulated chat payloads.',
        'The current visual Chat Trigger panel does not expose Channel and the chat API does not use it to filter messages before starting a workflow.',
        'When a channel value is present, downstream nodes can use {{$json.channel}} to route support, sales, or billing chat paths.',
        'In normal chat UI runs, the migrated registry output sets channel from sessionId first so replies stay tied to the same chat session.'
      ],
      example: 'support-chat'
    },
    allowedSenders: {
      title: 'How to use Allowed Senders?',
      steps: [
        'Allowed Senders is a backend schema allowlist field for controlled tests, generated workflows, or future chat contexts.',
        'The current visual panel does not expose or enforce it, so do not rely on it to protect a public chat link today.',
        'If your payload includes sender data, use a later If/Else, Switch, or JavaScript node to check the sender before taking sensitive action.',
        'Use a JSON list of sender names or IDs, such as ["ops-lead@example.com","finance-lead@example.com"].'
      ],
      example: '["ops-lead@example.com","finance-lead@example.com"]'
    }
  },
  facebook_trigger: {
    connectionId: {
      title: 'How to choose Facebook Connection?',
      steps: [
        'Use the saved Facebook OAuth2 connection for the account that manages the Page.',
        'Leave blank when CtrlChecks should use the active/default Facebook connection for this workspace.',
        'Do not paste a Graph API access token into a workflow field; connect Facebook under Connections.',
        'Use a specific connection only when the workspace has more than one Facebook account.'
      ],
      example: 'facebook_oauth_123'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated event families such as message, comment, mention, postback, leadgen, feed.',
        'Use message and postback for Messenger assistant workflows.',
        'Use comment or feed for Page moderation and public reply workflows.',
        'Use leadgen only when the Meta app/Page is subscribed to leadgen and the Facebook connection has leads_retrieval.'
      ],
      example: 'message, postback'
    },
    pageId: {
      title: 'How to set Facebook Page ID?',
      steps: [
        'Enter the numeric Facebook Page ID, not the Page URL, username, post ID, or comment ID.',
        'Leave blank when the workflow may accept events from any subscribed Page on the connected account.',
        'Use this filter when the same Facebook account manages multiple Pages.',
        'The trigger output includes pageId so reply nodes can act on the same Page.'
      ],
      example: '123456789012345'
    },
    allowedSenderIds: {
      title: 'How to set Allowed Sender IDs?',
      steps: [
        'Optional comma-separated sender IDs or Page-scoped IDs that are allowed to start the workflow.',
        'Use senderId or chatId from a previous Facebook Trigger test run.',
        'Leave blank for normal public Page automations.',
        'A wrong sender ID silently filters out that user, so test with a fresh webhook event.'
      ],
      example: '1234567890, 9876543210'
    },
    verifyToken: {
      title: 'How to set Verify Token?',
      steps: [
        'Create a random setup token and enter the exact same value in Meta for Developers -> Webhooks.',
        'Meta sends this during callback verification before it saves the webhook URL.',
        'This is not the Facebook OAuth access token, Page token, app secret, or account password.',
        'If the token differs between CtrlChecks and Meta, verification returns Invalid verify token.'
      ],
      example: 'fb-webhook-verify-2026-support'
    },
    validateSignature: {
      title: 'How to use Validate Meta Signature?',
      steps: [
        'Keep this enabled for production Facebook webhooks.',
        'The worker validates X-Hub-Signature-256 with META_APP_SECRET or FACEBOOK_APP_SECRET.',
        'Disable only for a temporary local test where Meta signatures are not available.',
        'If the worker secret is missing or wrong, incoming webhooks return Invalid Facebook webhook signature.'
      ],
      example: 'true'
    }
  },
  interval: {
    interval: {
      title: 'How to set Interval?',
      steps: [
        'Type a whole positive number for how often the workflow repeats.',
        'Combine it with the Unit field below — 5 + Minutes runs every 5 minutes.',
        'The panel clamps this to 1-59 for Minutes or 1-23 for Hours; there is no seconds option.',
        'Save the workflow first — the interval activates automatically right after saving.'
      ],
      example: '5'
    },
    unit: {
      title: 'How to set Unit?',
      steps: [
        'Choose Minutes for anything from every 1 to every 59 minutes.',
        'Choose Hours for anything from every 1 to every 23 hours.',
        'Use the Schedule Trigger node instead when you need an exact daily time or a weekly/monthly pattern.',
        'Changing Unit immediately regenerates and saves the workflow schedule.'
      ],
      example: 'minutes'
    }
  },
  instagram_trigger: {
    connectionId: {
      title: 'How to choose Instagram Connection?',
      steps: [
        'Use the saved Instagram OAuth2 connection for the Facebook account linked to the Instagram professional account.',
        'Leave blank when CtrlChecks should use the active/default Instagram connection for this workspace.',
        'Do not paste a Graph API access token into a workflow field; connect Instagram under Connections.',
        'Use a specific connection only when the workspace has more than one Instagram account.'
      ],
      example: 'instagram_oauth_123'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated event families such as message, comment, mention, message.story_reply, postback.',
        'Use message and message.story_reply for DM assistant workflows.',
        'Use comment or mention for moderation and public reply workflows.',
        'Leave the default set while testing, then narrow it before production.'
      ],
      example: 'message, message.story_reply'
    },
    instagramBusinessAccountId: {
      title: 'How to set Instagram Business Account ID?',
      steps: [
        'Enter the numeric Instagram Business Account ID, not the @username, display name, or Facebook Page ID.',
        'Leave blank when the workflow may accept events from any subscribed Instagram account on the connection.',
        'Use this filter when the same connection can access multiple Instagram accounts.',
        'The trigger output includes instagramBusinessAccountId so reply nodes can confirm the receiving account.'
      ],
      example: '17841400000000000'
    },
    allowedSenderIds: {
      title: 'How to set Allowed Sender IDs?',
      steps: [
        'Optional comma-separated Instagram sender IDs that are allowed to start the workflow.',
        'Use senderId or chatId from a previous Instagram Trigger test run.',
        'Leave blank for normal public automations.',
        'A wrong sender ID silently filters out that user, so test with a fresh webhook event.'
      ],
      example: '1234567890, 9876543210'
    },
    verifyToken: {
      title: 'How to set Verify Token?',
      steps: [
        'Create a random setup token and enter the exact same value in Meta for Developers -> Webhooks.',
        'Meta sends this during callback verification before it saves the webhook URL.',
        'This is not an Instagram/Facebook OAuth access token, app secret, or account password.',
        'If the token differs between CtrlChecks and Meta, verification returns Invalid verify token.'
      ],
      example: 'ig-webhook-verify-2026-support'
    },
    validateSignature: {
      title: 'How to use Validate Signature?',
      steps: [
        'Keep this enabled for production Instagram webhooks.',
        'The worker validates X-Hub-Signature-256 with META_APP_SECRET, INSTAGRAM_APP_SECRET, or FACEBOOK_APP_SECRET.',
        'Disable only for a temporary local test where Meta signatures are not available.',
        'If the worker secret is missing or wrong, incoming webhooks return Invalid Instagram webhook signature.'
      ],
      example: 'true'
    }
  },
  jira_trigger: {
    siteUrl: {
      title: 'How to set Jira Site URL?',
      steps: [
        'Enter the bare Atlassian domain, such as yourcompany.atlassian.net, not a full URL.',
        'Leave blank to use the domain already saved in your Jira connection.',
        'Only fill it when your workspace connects more than one Atlassian site.',
        'The trigger output includes siteUrl and uses it to build issueUrl links.'
      ],
      example: 'yourcompany.atlassian.net'
    },
    projectKey: {
      title: 'How to set Project Key?',
      steps: [
        'Enter the short project key shown before the dash in issue keys, such as PROJ.',
        'Leave blank to accept events from every project the Jira webhook is configured to send.',
        'Use this filter when one Jira webhook covers multiple projects but this workflow should only react to one.',
        'A key that never matches an incoming event silently ignores that event.'
      ],
      example: 'PROJ'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated Jira webhookEvent values such as jira:issue_created, jira:issue_updated, comment_created.',
        'Also accepted: jira:issue_deleted, comment_updated, comment_deleted, or any other event your Jira webhook sends.',
        'Leave the default while testing, then narrow it before production.',
        'Route with {{$json.eventType}}, which always equals the raw value Jira sent.'
      ],
      example: 'jira:issue_created, jira:issue_updated, comment_created'
    },
    secretToken: {
      title: 'How to use Webhook Secret Override?',
      steps: [
        'Leave this blank in almost every setup — CtrlChecks generates and stores a secret automatically.',
        'Fill it only when migrating an existing Automation for Jira rule that must reuse one known secret.',
        'This is not your Atlassian API token or account password.',
        'A mismatched value causes Invalid or missing Jira webhook secret.'
      ],
      example: 'a1b2c3d4e5f6'
    },
    jql: {
      title: 'How to use JQL Filter?',
      steps: [
        'This is a documentation-only reminder field — CtrlChecks never sends or enforces it.',
        'Copy the real JQL filter from the webhook entry in Jira Settings -> System -> WebHooks.',
        'For filtering CtrlChecks actually enforces, use Project Key and Keyword Filter instead.',
        'Leaving it blank has no effect on which events are delivered.'
      ],
      example: 'project = PROJ AND status = "In Progress"'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not JQL syntax.',
        'Only events whose issue summary or comment body contains this text will start the workflow.',
        'Leave blank to accept every event matching Event Types and Project Key.',
        'A too-specific or misspelled filter causes Ignored Jira event not matching this trigger.'
      ],
      example: 'urgent'
    }
  },
  linear_trigger: {
    teamId: {
      title: 'How to set Team ID?',
      steps: [
        'Enter the Linear team UUID, not its short key (such as ENG) or display name.',
        'Leave blank with All Public Teams enabled to watch every public team.',
        'Copy it from the team\'s Settings page in Linear, or from a previous test event\'s teamId output.',
        'A team ID that never matches an incoming event silently ignores that event.'
      ],
      example: 'team uuid'
    },
    allPublicTeams: {
      title: 'How to use All Public Teams?',
      steps: [
        'Keep this enabled (the default) whenever Team ID is blank.',
        'This controls how broadly the Linear webhook itself is registered, separate from per-workflow filtering.',
        'Disable it only when supplying a Team ID and you want the webhook itself scoped to just that team.',
        'Use Team ID for per-workflow filtering regardless of this setting.'
      ],
      example: 'true'
    },
    resourceTypes: {
      title: 'How to set Resource Types?',
      steps: [
        'Enter comma-separated Linear resource names such as Issue, Comment, Project, Cycle, IssueLabel, Reaction.',
        'Only resource types listed here are ever delivered by the underlying webhook — Event Types cannot filter in data that was never subscribed to.',
        'Keep the default (Issue, Comment) for most triage/notification workflows.',
        'Add Project, Document, Initiative, Customer, or User only when you need those change types.'
      ],
      example: 'Issue, Comment'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated normalized values such as issue_created, issue_updated, comment_created.',
        'This filters after Resource Types has already let the delivery through.',
        'Leave the default while testing, then narrow it before production.',
        'Route with {{$json.eventType}}, which always equals the normalized value this filter compares against.'
      ],
      example: 'issue_created, issue_updated, comment_created'
    },
    issueId: {
      title: 'How to set Issue ID?',
      steps: [
        'Enter the issue\'s UUID or human identifier such as ENG-123 — both are checked.',
        'Leave blank for normal team- or project-wide triage workflows.',
        'Use this only to watch one already-known issue.',
        'The trigger output still includes both issueId and issueIdentifier for confirmation.'
      ],
      example: 'ENG-123'
    },
    projectId: {
      title: 'How to set Project ID?',
      steps: [
        'Enter the project\'s UUID, not its display name.',
        'Leave blank to accept events from every project.',
        'Copy it from the project settings/API details in Linear, or a previous test event\'s projectId output.',
        'A project ID that never matches an incoming event silently ignores that event.'
      ],
      example: 'project uuid'
    },
    actorId: {
      title: 'How to set Actor ID?',
      steps: [
        'Enter the Linear user\'s UUID, not their display name or email.',
        'Leave blank for normal team-wide triggers so any teammate\'s activity can start the workflow.',
        'Use this only for person-specific automations.',
        'Read {{$json.userId}} from a previous test event triggered by that person to find the right value.'
      ],
      example: 'actor uuid'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not Linear search syntax.',
        'Only events whose issue title, comment body, or project name contains this text will start the workflow.',
        'Leave blank to accept every event matching the other filters.',
        'A too-specific or misspelled filter causes Ignored Linear event not matching this trigger.'
      ],
      example: 'urgent'
    }
  },
  microsoft_teams_trigger: {
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated Bot Framework activity types such as message, conversation_update, message_reaction, invoke.',
        'Use message for a chat/support bot; invoke for adaptive card button clicks.',
        'installation_update is not included by default — list it explicitly if you need it.',
        'Route with {{$json.eventType}} downstream.'
      ],
      example: 'message, conversation_update, invoke'
    },
    teamIds: {
      title: 'How to set Allowed Team IDs?',
      steps: [
        'Enter comma-separated Teams team IDs such as 19:team-id@thread.tacv2, not the display name.',
        'Leave blank to accept activity from any team and from personal chats.',
        'Read teamId from a previous test activity if you are not sure of the exact ID.',
        'A team ID that never matches an incoming activity silently ignores it.'
      ],
      example: '19:team-id@thread.tacv2'
    },
    channelIds: {
      title: 'How to set Allowed Channel IDs?',
      steps: [
        'Enter comma-separated Teams channel IDs such as 19:channel-id@thread.tacv2.',
        'Leave blank for personal chats or broad testing across every channel.',
        'This is different from Team ID — a channel ID scopes to one channel inside a team.',
        'Read channelId from a previous test activity if you are not sure of the exact ID.'
      ],
      example: '19:channel-id@thread.tacv2'
    },
    allowedUserIds: {
      title: 'How to set Allowed User IDs?',
      steps: [
        'Enter comma-separated Azure AD object IDs or Bot Framework user IDs, not display names or emails.',
        'Leave blank for a normal bot that should respond to any user.',
        'Use this for internal testing or a controlled rollout to approved reviewers.',
        'Read userId from a previous test activity sent by that person.'
      ],
      example: '00000000-0000-0000-0000-000000000000'
    },
    tenantId: {
      title: 'How to set Tenant ID?',
      steps: [
        'Enter the Microsoft 365 tenant GUID, not the organization\'s domain name or display name.',
        'Leave blank for a single-tenant bot or when any tenant should be accepted.',
        'Use this for a multi-tenant bot that should only react to one specific customer organization.',
        'Read tenantId from a previous test activity from that organization.'
      ],
      example: '00000000-0000-0000-0000-000000000000'
    },
    appId: {
      title: 'How to use Microsoft App ID?',
      steps: [
        'Leave this blank in almost every setup — CtrlChecks reads it from the saved Teams Bot connection.',
        'Fill it only to override the connection\'s App ID for this specific node, such as testing a second bot registration.',
        'This is the Azure Bot registration\'s Application (client) ID, not the App Password/client secret.',
        'A wrong value causes real Bot Framework requests to fail JWT audience validation.'
      ],
      example: '00000000-0000-0000-0000-000000000000'
    },
    validationSecret: {
      title: 'How to use Validation Secret?',
      steps: [
        'Leave this blank for production bots — rely on real Bot Framework JWT validation instead.',
        'Fill it only for controlled local testing or a simulation harness where generating a real JWT is impractical.',
        'This is not your Azure app client secret/App Password.',
        'Send it as an X-Ms-Teams-Secret header or a secret query parameter to skip JWT validation during tests.'
      ],
      example: 'a1b2c3d4e5f6'
    },
    validateJwt: {
      title: 'How to use Validate Bot Framework Auth?',
      steps: [
        'Keep this enabled for production Microsoft Teams bots.',
        'The worker validates the Bot Framework bearer JWT signature, audience, and expiry against your Microsoft App ID.',
        'Disable only for a temporary local test where you cannot generate a real Bot Framework token.',
        'Setting this to false skips all validation and accepts any request to the webhook URL — never leave it disabled in production.'
      ],
      example: 'true'
    }
  },
  outlook_trigger: {
    resource: {
      title: 'How to set Resource?',
      steps: [
        'Choose mail to watch a mailbox folder, or calendar to watch calendar events.',
        'These are separate Microsoft Graph subscriptions with different available output fields.',
        'Calendar mode populates start/end/attendees; Mail mode populates subject/from/snippet/conversationId.',
        'Check {{$json.eventType}} to confirm which resource actually fired.'
      ],
      example: 'mail'
    },
    changeTypes: {
      title: 'How to set Change Types?',
      steps: [
        'Enter comma-separated Graph change types: created, updated, deleted.',
        'Keep the default (created) for most mail and simple calendar-invite workflows.',
        'Add updated and/or deleted for a calendar workflow that reacts to reschedules or cancellations.',
        'Mail resources here only ever subscribe to created — there is no delete tracking for messages.'
      ],
      example: 'created'
    },
    folderName: {
      title: 'How to set Mail Folder?',
      steps: [
        'Enter the exact Outlook folder display name, such as Inbox or Support Queue, not a nested path.',
        'Leave as Inbox (the default) for normal incoming-mail workflows.',
        'Only used when Resource is set to mail.',
        'A folder name that does not exist in the mailbox causes subscription creation to fail.'
      ],
      example: 'Inbox'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not Outlook search syntax.',
        'Matched against the combined subject, sender address, and body preview.',
        'Leave blank to accept every event matching Resource and Change Types.',
        'A too-specific or misspelled filter silently drops matching notifications with no visible error.'
      ],
      example: 'invoice'
    }
  },
  shopify_trigger: {
    shopDomain: {
      title: 'How to set Shop Domain Filter?',
      steps: [
        'Enter the bare myshopify.com domain, such as your-shop.myshopify.com, not a custom storefront domain.',
        'Leave blank to use the Store URL saved in the Shopify connection.',
        'Only fill this when a connection could be reused across more than one store.',
        'A mismatched domain silently ignores incoming events.'
      ],
      example: 'my-store.myshopify.com'
    },
    topics: {
      title: 'How to set Webhook Topics?',
      steps: [
        'Enter comma-separated Shopify topic names such as orders/create, orders/paid, customers/create.',
        'This value both creates the real Shopify webhook subscriptions and filters what this trigger accepts.',
        'Use slashes (orders/create), not underscores.',
        'Route with {{$json.eventType}} or {{$json.topic}} downstream.'
      ],
      example: 'orders/create, orders/paid, customers/create'
    },
    financialStatus: {
      title: 'How to use Financial Status?',
      steps: [
        'Choose paid, pending, authorized, partially_paid, refunded, or voided.',
        'Leave on Any to accept orders regardless of payment status.',
        'Only affects order-shaped topics — has no effect on customers/create or products/update.',
        'Use this to only run fulfillment workflows once payment clears.'
      ],
      example: 'paid'
    },
    fulfillmentStatus: {
      title: 'How to use Fulfillment Status?',
      steps: [
        'Choose fulfilled, partial, unfulfilled, or restocked.',
        'Leave on Any to accept orders regardless of fulfillment status.',
        'Only affects order-shaped topics.',
        'Use this to only send shipping notifications once an order is fulfilled.'
      ],
      example: 'fulfilled'
    },
    customerId: {
      title: 'How to set Customer ID?',
      steps: [
        'Enter the numeric Shopify customer ID, not their name or email.',
        'Leave blank for normal store-wide workflows.',
        'Use this only to watch one already-known customer account.',
        'Read customerId from a previous test event if you are not sure of the exact ID.'
      ],
      example: '1234567890'
    },
    productId: {
      title: 'How to set Product ID?',
      steps: [
        'Enter the numeric Shopify product ID, not its title or handle.',
        'Leave blank for normal store-wide workflows.',
        'Use this only to watch one already-known product.',
        'Read productId from a previous test event if you are not sure of the exact ID.'
      ],
      example: '1234567890'
    },
    minTotalPrice: {
      title: 'How to set Minimum Total Price?',
      steps: [
        'Enter a plain number in the store\'s currency, no currency symbol or commas.',
        'Leave blank to accept orders of any size.',
        'Use this to focus a workflow on high-value orders only.',
        'Check {{$json.currency}} alongside {{$json.totalPrice}} to confirm the actual currency.'
      ],
      example: '100'
    },
    currency: {
      title: 'How to set Currency?',
      steps: [
        'Enter a lowercase 3-letter ISO currency code such as usd, eur, or inr.',
        'Leave blank to accept orders in any currency.',
        'Use this only for a multi-currency store where the workflow should react to one currency.',
        'Shopify sends currency in lowercase — do not use USD or a symbol.'
      ],
      example: 'usd'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not Shopify search syntax.',
        'Matched against the combined order name, customer email/name, product title, ID, and status fields.',
        'Leave blank to accept every event matching the other filters.',
        'A too-specific or misspelled filter causes Ignored Shopify event not matching this trigger.'
      ],
      example: 'wholesale'
    }
  },
  slack_trigger: {
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated Slack event types such as app_mention, message, slash_command, interaction.',
        'Use app_mention/message for an AI assistant, slash_command for a /command workflow, interaction for button/modal clicks.',
        'Leave the default while testing, then narrow it before production.',
        'Route with {{$json.eventType}} downstream.'
      ],
      example: 'app_mention, message, slash_command, interaction'
    },
    channelIds: {
      title: 'How to set Allowed Channel IDs?',
      steps: [
        'Enter comma-separated Slack channel IDs such as C0123456789, not the #channel-name.',
        'Leave blank to accept events from any channel the bot is in.',
        'Use this when one Slack app callback URL serves several channels but this workflow should only handle some.',
        'Copy the ID from channel details -> View channel details in Slack.'
      ],
      example: 'C0123456789, C9876543210'
    },
    allowedUserIds: {
      title: 'How to set Allowed User IDs?',
      steps: [
        'Enter comma-separated Slack user IDs such as U0123456789, not display names.',
        'Leave blank for a normal bot that should respond to any workspace member.',
        'Use this for internal testing or a controlled rollout.',
        'Copy the ID from a person\'s Slack profile -> Copy member ID.'
      ],
      example: 'U0123456789, U9876543210'
    },
    commandFilter: {
      title: 'How to set Slash Command Filter?',
      steps: [
        'Enter the exact command including the leading slash, such as /support.',
        'Use this when the same Slack app has more than one slash command pointed at this trigger.',
        'Leave blank if this trigger only ever receives one slash command.',
        'Match it exactly to the command configured in Slack app settings -> Slash Commands.'
      ],
      example: '/support'
    },
    teamId: {
      title: 'How to set Workspace Team ID?',
      steps: [
        'Enter the Slack workspace/team ID, such as T0123456789, not the workspace name.',
        'Leave blank for a single-workspace Slack app.',
        'Use this only if your app is installed into multiple workspaces and this workflow should react to just one.',
        'Read teamId from a previous test event if you are not sure of the exact ID.'
      ],
      example: 'T0123456789'
    },
    signingSecret: {
      title: 'How to use Signing Secret?',
      steps: [
        'Leave this blank — save the signing secret on the Slack connection under Connections instead.',
        'Fill it only as a last-resort override for a single node.',
        'Copy it from Slack app settings -> Basic Information -> App Credentials -> Signing Secret.',
        'This is not the bot token (which starts with xoxb-).'
      ],
      example: 'a1b2c3d4e5f6'
    },
    validateSignature: {
      title: 'How to use Validate Slack Signature?',
      steps: [
        'Keep this enabled for production Slack webhooks.',
        'The worker validates X-Slack-Signature and X-Slack-Request-Timestamp using the app signing secret.',
        'Disable only for a temporary local test where Slack signatures are not available.',
        'If the signing secret is missing or wrong, incoming requests return Invalid Slack webhook signature.'
      ],
      example: 'true'
    }
  },
  stripe_trigger: {
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated exact Stripe event names such as checkout.session.completed, payment_intent.succeeded.',
        'This value both creates the real Stripe webhook subscription and filters what this trigger accepts.',
        'Copy names exactly from Stripe\'s event type reference — they use dots, not underscores.',
        'Route with {{$json.eventType}} downstream.'
      ],
      example: 'checkout.session.completed, payment_intent.succeeded'
    },
    connect: {
      title: 'How to use Stripe Connect Events?',
      steps: [
        'Enable only if you operate a Stripe Connect platform with connected merchant/seller accounts.',
        'Leave disabled for a normal single-account Stripe integration.',
        'This controls whether Connect events are received at all — it does not filter to one connected account.',
        'Check {{$json.accountId}} to see which connected account an event came from.'
      ],
      example: 'false'
    },
    livemode: {
      title: 'How to use Live Mode Only?',
      steps: [
        'Leave completely unset while building and testing with Stripe test-mode data.',
        'Enable it once the workflow is ready so production only reacts to real payments.',
        'Unchecking it after checking may save an explicit false, which then only accepts test-mode events.',
        'Regenerate the field from defaults if you need a true no-filter state again.'
      ],
      example: 'true'
    },
    customerId: {
      title: 'How to set Customer ID?',
      steps: [
        'Enter the Stripe customer ID starting with cus_, not their name or email.',
        'Leave blank for normal account-wide workflows.',
        'Use this only to watch one already-known customer.',
        'Read customerId from a previous test event if you are not sure of the exact ID.'
      ],
      example: 'cus_ABC123'
    },
    currency: {
      title: 'How to set Currency?',
      steps: [
        'Enter a lowercase 3-letter ISO currency code such as usd, eur, or gbp.',
        'Leave blank to accept events in any currency.',
        'Use this only for a multi-currency account where the workflow should react to one currency.',
        'Stripe sends currency in lowercase — do not use USD or a symbol.'
      ],
      example: 'usd'
    },
    minAmount: {
      title: 'How to set Minimum Amount?',
      steps: [
        'Enter a plain whole number in the smallest currency unit — cents for usd/eur, so 1000 means $10.00.',
        'Leave blank to accept transactions of any size.',
        'Use this to focus a workflow on high-value transactions only.',
        'Remember Stripe amounts are never whole dollars — 500 means $5.00, not $500.'
      ],
      example: '1000'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not Stripe search syntax.',
        'Matched against the combined text, customer email/ID, object ID, status, and description.',
        'Leave blank to accept every event matching the other filters.',
        'A too-specific or misspelled filter causes Ignored Stripe event not matching this trigger.'
      ],
      example: 'enterprise'
    }
  },
  tally_trigger: {
    formId: {
      title: 'How to set Form ID?',
      steps: [
        'Enter the short form ID from the form\'s share URL, such as wA1b2C in tally.so/forms/wA1b2C.',
        'Do not paste the full URL — just the ID segment after /forms/.',
        'This is always required; the trigger cannot register a webhook without it.',
        'A wrong ID causes Tally API errors during registration since that form may not exist or belong to your account.'
      ],
      example: 'wA1b2C'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not a field name or Tally filter syntax.',
        'Matched against the combined text of every answer on the submission.',
        'Leave blank to accept every submission to the form.',
        'A too-specific or misspelled filter causes Ignored Tally response not matching this trigger.'
      ],
      example: 'urgent'
    }
  },
  telegram_trigger: {
    updateTypes: {
      title: 'How to set Update Types?',
      steps: [
        'Choose message for a normal chatbot.',
        'Add callback_query when your bot uses inline keyboard buttons.',
        'Use channel_post if the bot posts to or monitors a channel rather than a private chat.',
        'edited_message is separate from message — select it explicitly to react to edited messages.'
      ],
      example: 'message'
    },
    allowedChatIds: {
      title: 'How to set Allowed Chat IDs?',
      steps: [
        'Enter comma-separated numeric Telegram chat IDs, not display names or @usernames.',
        'Use a negative number for groups/supergroups.',
        'Leave blank to accept any chat that can message the bot.',
        'Look up a chat\'s ID with @userinfobot or @RawDataBot in Telegram.'
      ],
      example: '123456789, -1009876543210'
    },
    commandFilter: {
      title: 'How to set Command Filter?',
      steps: [
        'Enter just the command word, with or without the leading slash (CtrlChecks adds it if missing).',
        'Do not include arguments or trailing text — only the command itself.',
        'Leave blank to accept every message regardless of command.',
        'Match it exactly to a command you registered with BotFather.'
      ],
      example: '/support'
    },
    secretToken: {
      title: 'How to use Secret Token?',
      steps: [
        'Generate a random string yourself — it does not come from Telegram or BotFather.',
        'Set it before registering the webhook, and keep it the same for the life of the workflow.',
        'Leaving it blank skips request validation entirely — any caller who knows the URL can send fake updates.',
        'If you change it, re-register the webhook so both sides agree again.'
      ],
      example: 'a1b2c3d4e5f6'
    }
  },
  trello_trigger: {
    modelId: {
      title: 'How to set Model ID?',
      steps: [
        'Enter a Trello board ID for broad board/list/card activity, or a card/member ID for a narrower webhook.',
        'This is a 24-character hex string, not the board\'s display name or short URL slug.',
        'This is the most important field — it decides what Trello sends at all.',
        'Always required; the webhook cannot be registered without it.'
      ],
      example: 'board id'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter comma-separated normalized values such as card_created, card_moved, card_commented, list_activity.',
        'This filters after the webhook has already delivered events based on Model ID.',
        'Keep the default while testing, then narrow it before production.',
        'Route with {{$json.eventType}} downstream.'
      ],
      example: 'card_created, card_moved, card_commented'
    },
    boardId: {
      title: 'How to set Board ID?',
      steps: [
        'Enter the Trello board ID, not its name or short URL slug.',
        'Mainly useful when Model ID points to a member or organization spanning multiple boards.',
        'Leave blank when Model ID is already a specific board.',
        'A board ID that never matches silently ignores the event.'
      ],
      example: 'board id'
    },
    listId: {
      title: 'How to set List ID?',
      steps: [
        'Enter the Trello list ID, not its display name.',
        'Matches against either the before or after list for moved cards.',
        'Leave blank to accept activity from every list on the board.',
        'Use this for a "notify when a card reaches Done" style workflow.'
      ],
      example: 'list id'
    },
    cardId: {
      title: 'How to set Card ID?',
      steps: [
        'Enter the Trello card ID, not its name or short link.',
        'Leave blank for normal board-wide workflows.',
        'Use this only to watch one already-known card.',
        'Read cardId from a previous test event if you are not sure of the exact ID.'
      ],
      example: 'card id'
    },
    memberId: {
      title: 'How to set Member ID Filter?',
      steps: [
        'Enter the Trello member ID, not their @username or display name.',
        'Leave blank for normal team-wide triggers.',
        'Use this only for person-specific automations.',
        'Matches either the action performer or the affected member.'
      ],
      example: 'member id'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not Trello search syntax.',
        'Matched against card names and comment text.',
        'Leave blank to accept every event matching the other filters.',
        'A too-specific or misspelled filter causes Ignored Trello event not matching this trigger.'
      ],
      example: 'urgent'
    }
  },
  typeform_trigger: {
    formId: {
      title: 'How to set Form ID?',
      steps: [
        'Enter the short form ID from the form\'s share URL, such as abc123 in typeform.com/to/abc123.',
        'Do not paste the full URL — just the ID segment after /to/.',
        'This is always required; the trigger cannot register a webhook without it.',
        'A wrong ID causes Typeform API errors during registration since that form may not exist or belong to your account.'
      ],
      example: 'abc123'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Enter a simple keyword or phrase, not a field name or Typeform filter syntax.',
        'Matched against the combined text of every answer on the response.',
        'Leave blank to accept every response to the form.',
        'A too-specific or misspelled filter causes Ignored Typeform response not matching this trigger.'
      ],
      example: 'urgent'
    }
  },
  whatsapp_trigger: {
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Choose Incoming Messages for a normal chatbot workflow.',
        'Use Delivered/Read/Failed for a workflow tracking message delivery status instead of content.',
        'Status events never include message text — only chatbot/message events populate {{$json.text}}.',
        'Route with {{$json.eventType}} downstream.'
      ],
      example: 'message'
    },
    phoneNumberId: {
      title: 'How to set Phone Number ID?',
      steps: [
        'Enter the numeric Phone Number ID from Meta for Developers -> WhatsApp -> API Setup, not the actual phone number.',
        'Leave blank to accept events for the connected account\'s number.',
        'Use this only when your Meta app manages multiple WhatsApp numbers.',
        'A wrong ID silently ignores every event as belonging to a different number.'
      ],
      example: '123456789012345'
    },
    allowedWaIds: {
      title: 'How to set Allowed Senders?',
      steps: [
        'Enter comma-separated WhatsApp IDs (country code + number, no + or spaces), such as 15551234567.',
        'Leave blank for a normal public WhatsApp automation.',
        'Use this for internal testing or a controlled rollout.',
        'Read waId or chatId from a previous test message to find the exact value.'
      ],
      example: '15551234567, 15557654321'
    },
    verifyToken: {
      title: 'How to set Verify Token?',
      steps: [
        'Create a random setup token and enter the exact same value in Meta for Developers -> WhatsApp -> Configuration.',
        'Meta sends this during callback verification before it saves the webhook URL.',
        'This is not the WhatsApp access token, app secret, or account password.',
        'If the token differs between CtrlChecks and Meta, verification returns Invalid verify token.'
      ],
      example: 'wa_verify_abc123'
    },
    validateSignature: {
      title: 'How to use Validate Signature?',
      steps: [
        'Keep this enabled for production Meta webhooks.',
        'The worker validates X-Hub-Signature-256 with META_APP_SECRET, FACEBOOK_APP_SECRET, or WHATSAPP_APP_SECRET.',
        'Disable only for a temporary local test where Meta signatures are not available.',
        'If the worker secret is missing or wrong, incoming webhooks return Invalid WhatsApp webhook signature.'
      ],
      example: 'true'
    }
  },
  github_trigger: {
    connectionId: {
      title: 'How to choose GitHub Connection?',
      steps: [
        'Use the saved GitHub PAT or OAuth connection that can create repository webhooks.',
        'Leave blank in normal visual workflows so CtrlChecks uses the active GitHub connection.',
        'Do not paste ghp_ tokens into workflow fields; save them under Connections.',
        'Use a specific connection only when the workspace has more than one GitHub account.'
      ],
      example: 'github_pat_123'
    },
    owner: {
      title: 'How to set Owner/Organization?',
      steps: [
        'Open the repository in GitHub and copy the first path segment after github.com.',
        'For https://github.com/acme-platform/api-service, enter acme-platform.',
        'Do not include https://github.com/, the repository name, branch, issue number, or full URL.',
        'This value is required before CtrlChecks can register the repository webhook.'
      ],
      example: 'acme-platform'
    },
    repo: {
      title: 'How to set Repository?',
      steps: [
        'Open the repository in GitHub and copy the second path segment after the owner.',
        'For https://github.com/acme-platform/api-service, enter api-service.',
        'Do not enter owner/repo if Owner/Organization is already filled separately.',
        'A wrong repository name usually causes a 404 or permission error during webhook registration.'
      ],
      example: 'api-service'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter GitHub webhook event names separated by commas.',
        'Use issues and pull_request for triage workflows, push for commit workflows, release for release announcements, and issue_comment for comment workflows.',
        'Use raw event names like pull_request, not friendly labels like pull requests.',
        'Use {{$json.eventType}} later to branch detailed actions such as issues.opened or pull_request.closed.'
      ],
      example: 'issues, pull_request'
    },
    webhookSecret: {
      title: 'How to use Webhook Secret Override?',
      steps: [
        'Leave blank for normal workflows so CtrlChecks generates and stores the signing secret.',
        'Use this only when migrating or manually managing a webhook that must reuse an existing secret.',
        'Enter the same value in the GitHub repository webhook settings if you manage the webhook manually.',
        'This is not the GitHub PAT or OAuth token used to create the webhook.'
      ],
      example: 'Leave blank'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave blank to accept every configured GitHub event type.',
        'Enter a simple word or phrase such as urgent, security, billing, or release-candidate.',
        'The filter checks normalized event text such as commit message, issue title, PR title, release name, or comment body.',
        'Do not use GitHub search syntax here; it is only a case-insensitive text contains filter.'
      ],
      example: 'security'
    }
  },
  gitlab_trigger: {
    connectionId: {
      title: 'How to choose GitLab Connection?',
      steps: [
        'Use the saved GitLab PAT or OAuth connection that can create project webhooks.',
        'Leave blank in normal visual workflows so CtrlChecks uses the active GitLab connection.',
        'Do not paste glpat tokens into workflow fields; save them under Connections.',
        'Use a specific connection only when the workspace has more than one GitLab account or self-managed instance connection.'
      ],
      example: 'gitlab_pat_123'
    },
    baseUrl: {
      title: 'How to set GitLab URL?',
      steps: [
        'Leave https://gitlab.com for GitLab.com projects.',
        'For self-managed GitLab, enter only the instance root such as https://gitlab.company.com.',
        'Do not include /api/v4, the project path, an issue URL, or a merge request URL.',
        'The worker trims trailing slashes and uses this value when calling /api/v4/projects/:id/hooks.'
      ],
      example: 'https://gitlab.com'
    },
    projectId: {
      title: 'How to set Project ID?',
      steps: [
        'Open the GitLab project and copy the numeric Project ID from Settings -> General.',
        'You can also use a URL-encoded path such as acme-platform%2Fapi-service.',
        'This value is required before CtrlChecks can register the project webhook.',
        'A wrong ID usually causes a GitLab API 404 or permission error during activation.'
      ],
      example: '12345'
    },
    eventTypes: {
      title: 'How to set Event Types?',
      steps: [
        'Enter GitLab object_kind values separated by commas.',
        'Use issue and merge_request for triage workflows, note for comments, push or tag_push for code changes, and pipeline, job, or release for delivery workflows.',
        'Use exact values like merge_request and note, not friendly labels like merge requests or comments.',
        'Use {{$json.eventType}} later to branch before reading issueTitle, mrTitle, noteBody, ref, or commits.'
      ],
      example: 'issue, merge_request, note'
    },
    secretToken: {
      title: 'How to use Webhook Secret Override?',
      steps: [
        'Leave blank for normal workflows so CtrlChecks generates and stores the X-Gitlab-Token shared secret.',
        'Use this only when migrating or manually managing a GitLab project webhook that must reuse an existing Secret token.',
        'GitLab echoes this plain shared secret in X-Gitlab-Token; it is not an HMAC signature.',
        'This is not the GitLab PAT, OAuth token, account password, or CI/CD pipeline trigger token.'
      ],
      example: 'Leave blank'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave blank to accept every configured GitLab event type.',
        'Enter a simple word or phrase such as urgent, security, billing, or release-candidate.',
        'The filter checks normalized event text such as commit message, issue title, merge request title, note body, pipeline status, or release name.',
        'Do not use GitLab search syntax here; it is only a case-insensitive text contains filter.'
      ],
      example: 'security'
    }
  },
  zoom_video: {
    operation: {
      title: 'How to choose Zoom Operation?',
      steps: [
        'Choose Create Meeting to make a new Zoom room and get a join link.',
        'Choose List Meetings when the workflow needs scheduled meeting IDs before choosing one meeting.',
        'Choose Get Meeting to read one meeting by Meeting ID.',
        'Choose Update Meeting to change topic, duration, or start time for one Meeting ID.',
        'Choose Delete Meeting only for real cancellation workflows, and save any attendee details before deleting.'
      ],
      example: 'createMeeting'
    },
    topic: {
      title: 'How to set Meeting Topic?',
      steps: [
        'Use a short title attendees will recognize.',
        'Type fixed text or map a value such as Discovery call with {{$json.companyName}}.',
        'Create Meeting uses "Meeting" when this is blank.',
        'Update Meeting only changes the title when this field has a value.'
      ],
      example: 'Discovery call with {{$json.companyName}}'
    },
    meetingId: {
      title: 'How to set Meeting ID?',
      steps: [
        'Use the numeric Zoom meeting id, not the attendee join URL.',
        'Map {{$json.data.id}} from Create Meeting, or select an id from {{$json.data.meetings}} after List Meetings.',
        'Required for Get Meeting, Update Meeting, and Delete Meeting.',
        'Run List Meetings or Get Meeting with the same connected Zoom account if a stored ID fails.'
      ],
      example: '{{$json.data.id}}'
    },
    duration: {
      title: 'How to set Duration?',
      steps: [
        'Enter the meeting length in minutes.',
        'Use 15, 30, 45, 60, 90, or map {{$json.durationMinutes}} from a booking step.',
        'Create Meeting defaults to 60 minutes when this is blank.',
        'Use 90 for a 90-minute meeting, not 1.5 or "90 minutes".'
      ],
      example: '30'
    },
    startTime: {
      title: 'How to set Start Time?',
      steps: [
        'Use an ISO 8601 timestamp such as 2026-05-01T10:00:00Z.',
        'Map {{$json.startsAt}} when the time comes from Calendly, Google Calendar, a form, or a CRM appointment.',
        'Leave blank on Create Meeting only when the workflow should create an instant meeting.',
        'Avoid local phrases like Friday 3 PM unless an earlier step converts them to a timestamp.'
      ],
      example: '{{$json.startsAt}}'
    }
  },
  amazon_ses: {
    recipients: {
      title: 'How to set Recipients?',
      steps: [
        'Enter a JSON object with to, cc, and bcc arrays.',
        'At least one recipient is required across those arrays.',
        'Example: {"to":["customer@example.com"],"cc":["ops@example.com"]}',
        'Use workflow values such as {{input.email}} when the address comes from an earlier step.'
      ],
      example: '{"to":["customer@example.com"]}'
    },
    subject: {
      title: 'How to set Subject?',
      steps: [
        'Required only when Use AWS SES Template is off — hidden and ignored when it is on.',
        'Type the exact subject line recipients should see.',
        'Use workflow values such as {{$json.orderId}} to personalize it.',
        'An empty Subject with Use AWS SES Template off returns "Email subject is required".'
      ],
      example: 'Order {{$json.orderId}} Confirmation'
    },
    body: {
      title: 'How to set Body?',
      steps: [
        'Required only when Use AWS SES Template is off — hidden and ignored when it is on.',
        'CtrlChecks sends this exact text as both the HTML part and the plain-text part of the email.',
        'Add your own <br> or <p> tags if you need real HTML line breaks — plain newlines render as one run-on line in HTML clients.',
        'An empty Body with Use AWS SES Template off returns "Email body (HTML or text) is required".'
      ],
      example: 'Hi {{$json.name}}, your order {{$json.orderId}} is confirmed.'
    },
    useTemplate: {
      title: 'How to use "Use AWS SES Template"?',
      steps: [
        'Turn it on to send an existing AWS SES template instead of the Subject and Body fields.',
        'Leave it off to write the subject and body directly in this node.',
        'Turning it on hides Subject/Body and shows Template Name/Template Data instead.',
        'Create the named template in AWS SES for the same AWS Region set on this node before turning this on.'
      ],
      example: 'false'
    },
    fromAddress: {
      title: 'How to set From Address?',
      url: 'https://docs.aws.amazon.com/ses/latest/dg/verify-addresses-and-domains.html',
      steps: [
        'Use an email address or domain identity verified in Amazon SES.',
        'Open AWS Console -> Amazon SES -> Verified identities in the same region as this node.',
        'Copy the exact sender address, for example notifications@yourdomain.com.',
        'SES sandbox accounts can send only to verified recipients until production access is approved.'
      ],
      example: 'notifications@yourdomain.com'
    },
    replyToAddresses: {
      title: 'How to set Reply-To Addresses?',
      steps: [
        'Optional — enter a JSON array of one or more email addresses.',
        'Replies to this email go to these addresses instead of From Address.',
        'Leave empty to let replies go to From Address as normal.',
        'Example: ["support@example.com"]'
      ],
      example: '["support@example.com"]'
    },
    awsRegion: {
      title: 'How to choose AWS Region?',
      steps: [
        'Choose the region where your SES identities, templates, and configuration sets exist.',
        'The node defaults to us-east-1 when no region is set.',
        'This field overrides the saved Amazon SES connection\'s region whenever it is set.',
        'Options: us-east-1 (N. Virginia), us-west-2 (Oregon), eu-west-1 (Ireland), eu-central-1 (Frankfurt), ap-southeast-1 (Singapore), ap-northeast-1 (Tokyo), ap-southeast-2 (Sydney).'
      ],
      example: 'us-east-1'
    },
    templateName: {
      title: 'How to use Template Name?',
      url: 'https://docs.aws.amazon.com/ses/latest/dg/send-personalized-email-api.html',
      steps: [
        'Turn on Use AWS SES Template.',
        'Open AWS Console -> Amazon SES -> Email templates in the selected region.',
        'Copy the exact template name.',
        'Fill Template Data with the variables used by that template.'
      ],
      example: 'OrderConfirmation'
    },
    templateData: {
      title: 'How to set Template Data?',
      steps: [
        'Enter a JSON object whose keys match the variables in the SES template.',
        'Example: {"name":"Ada","orderId":"12345"}',
        'Use workflow values such as {{$json.name}} or {{input.orderId}} when values come from earlier steps.',
        'A variable used by the template but missing here fails the send with "Template data validation failed: missing: ...".'
      ],
      example: '{"name":"Ada","orderId":"12345"}'
    },
    attachments: {
      title: 'How to add Attachments?',
      steps: [
        'Enter a JSON array of attachment objects.',
        'Each item needs filename, base64 content, and contentType.',
        'SES sends attachments through a raw MIME email and enforces the total message size limit (40MB).',
        'Only these types are accepted, and the extension must match contentType: PDF, Word, Excel, JPG/PNG/GIF/WEBP, TXT/CSV, ZIP.'
      ],
      example: '[{"filename":"report.pdf","content":"{{input.pdfBase64}}","contentType":"application/pdf"}]'
    },
    configurationSetName: {
      title: 'How to set Configuration Set Name?',
      steps: [
        'Optional — enter the exact name of an existing AWS SES configuration set.',
        'Open AWS Console -> Amazon SES -> Configuration sets in the same region as this node.',
        'Used for CloudWatch/SNS delivery-event tracking, not for controlling send behavior.',
        'Leave empty to send normally with no configuration-set-based tracking.'
      ],
      example: 'transactional-emails-tracked'
    },
    tags: {
      title: 'How to set Tags?',
      steps: [
        'Optional — enter a JSON object of simple key/value pairs.',
        'Each pair becomes one SES message tag, used with a configuration set for CloudWatch filtering.',
        'Tags are never visible to the email recipient.',
        'Example: {"campaign":"newsletter","type":"promotional"}'
      ],
      example: '{"campaign":"newsletter","type":"promotional"}'
    },
    returnPath: {
      title: 'How to set Return Path?',
      steps: [
        'Optional — enter a verified email address for bounce handling (envelope-from).',
        'Bounce notifications go here instead of the default AWS SES bounce handling.',
        'This address generally needs its own SES verification, the same as From Address.',
        'Leave empty to use AWS SES\'s default bounce-handling behavior.'
      ],
      example: 'bounces@example.com'
    }
  },
  mailgun: {
    from: {
      title: 'How to set From Email?',
      steps: [
        'Use an email address on the sending domain saved in your Mailgun connection.',
        'Open Mailgun -> Sending -> Domains to confirm the domain is verified.',
        'For sandbox domains, Mailgun can send only to authorized recipients.',
        'Example: noreply@mg.yourdomain.com'
      ],
      example: 'noreply@mg.yourdomain.com'
    },
    to: {
      title: 'How to set To Email?',
      steps: [
        'Enter one recipient email address, or comma-separated addresses for multiple recipients.',
        'Use workflow values such as {{input.email}} when the recipient comes from an earlier step.',
        'For sandbox domains, add the recipient as an authorized recipient in Mailgun before testing.'
      ],
      example: 'customer@example.com'
    },
    text: {
      title: 'How to write Plain Text?',
      steps: [
        'Provide the plain text body of the email.',
        'Mailgun requires at least one of Text, HTML, or Template.',
        'Use workflow values such as {{input.name}} or {{input.resetUrl}} for personalization.'
      ],
      example: 'Hi {{input.name}}, your order {{input.orderId}} has shipped.'
    },
    html: {
      title: 'How to write HTML?',
      steps: [
        'Provide HTML content for email clients that support rich formatting.',
        'Mailgun requires at least one of Text, HTML, or Template.',
        'Keep dynamic values escaped or trusted before placing them in HTML.'
      ],
      example: '<p>Hi {{input.name}}, click <a href="{{input.resetUrl}}">here</a>.</p>'
    },
    template: {
      title: 'How to use a Mailgun Template?',
      steps: [
        'Create or find the stored template in Mailgun -> Sending -> Templates.',
        'Enter the exact template name in this field.',
        'Add Template Variables as a JSON object whose keys match the template variables.'
      ],
      example: 'welcome_email'
    },
    templateVariables: {
      title: 'How to set Template Variables?',
      steps: [
        'Enter a JSON object sent to Mailgun as t:variables.',
        'Use keys that match the variables used in the stored Mailgun template.',
        'Use workflow values when variables come from earlier steps.'
      ],
      example: '{"name":"Ada","resetUrl":"{{input.resetUrl}}"}'
    },
    operation: {
      title: 'How to set Operation?',
      steps: [
        'Leave it on Send Email — it is the only implemented action today.',
        'The dropdown exists for future Mailgun actions; nothing else is selectable yet.'
      ],
      example: 'send_email'
    },
    subject: {
      title: 'How to set Subject?',
      steps: [
        'Optional at the schema level, but fill it unless a Mailgun template already supplies its own subject.',
        'Use workflow values such as {{input.orderId}} to personalize it.'
      ],
      example: 'Your order {{input.orderId}} has shipped'
    },
    cc: {
      title: 'How to set CC?',
      steps: [
        'Optional — enter one address or comma-separated addresses.',
        'CC recipients are visible to every other recipient, unlike BCC.'
      ],
      example: 'manager@example.com'
    },
    bcc: {
      title: 'How to set BCC?',
      steps: [
        'Optional — enter one address or comma-separated addresses.',
        'BCC recipients are hidden from To and CC recipients.'
      ],
      example: 'audit@example.com'
    },
    replyTo: {
      title: 'How to set Reply-To?',
      steps: [
        'Optional — enter a single address that should receive replies instead of From.',
        'Leave empty to let replies go to From as normal.'
      ],
      example: 'support@mg.yourdomain.com'
    },
    tags: {
      title: 'How to set Tags?',
      steps: [
        'Optional — enter one tag or comma-separated tags.',
        'Each tag is sent to Mailgun as a separate o:tag value, used for Mailgun\'s own delivery analytics and filtering.',
        'Tags are never visible to the email recipient.'
      ],
      example: 'welcome,onboarding'
    },
    domain: {
      title: 'How to set Domain?',
      steps: [
        'Not typed directly in this node — select a Mailgun connection instead.',
        'Open Connections -> Mailgun API Key and set the Sending Domain there.',
        'Open Mailgun -> Sending -> Domains to copy the verified domain.'
      ],
      example: 'mg.yourcompany.com'
    },
    apiKey: {
      title: 'How to set Api Key?',
      url: 'https://documentation.mailgun.com/docs/mailgun/api-reference/authentication',
      steps: [
        'Not typed directly in this node — select a Mailgun connection instead.',
        'Open Connections -> Mailgun API Key and paste the Private API Key there.',
        'Open Mailgun -> Settings -> API Keys to copy the key. It starts with key-.'
      ],
      example: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sendgrid: {
    operation: {
      title: 'How to set Operation?',
      steps: [
        'Leave it on Send Email — it is the only implemented action today.',
        'This node does not support SendGrid Dynamic Templates, categories, or marketing campaigns.'
      ],
      example: 'send_email'
    },
    from: {
      title: 'How to set From?',
      url: 'https://docs.sendgrid.com/ui/sending-email/sender-verification',
      steps: [
        'Use an address verified in SendGrid -> Settings -> Sender Authentication.',
        'Verify either a single sender address or your whole domain before sending.',
        'An unverified From address is rejected by SendGrid at send time.'
      ],
      example: 'noreply@yourdomain.com'
    },
    to: {
      title: 'How to set To?',
      steps: [
        'Enter one recipient email address, or comma-separated addresses for multiple recipients.',
        'Do not use JSON brackets — this is a plain comma-separated string, not a {"to": [...]} object.',
        'Use workflow values such as {{input.email}} when the recipient comes from an earlier step.'
      ],
      example: 'customer@example.com'
    },
    apiKey: {
      title: 'How to set the SendGrid API Key?',
      url: 'https://docs.sendgrid.com/ui/account-and-settings/api-keys',
      steps: [
        'Not typed directly in this node — select a SendGrid connection instead.',
        'Open Connections -> SendGrid API Key and paste the key there.',
        'Open SendGrid -> Settings -> API Keys -> Create API Key, choose Restricted Access, and enable Mail Send.',
        'Copy the key immediately — it starts with SG. and is shown only once.'
      ],
      example: 'SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  google_gemini: {
    apiKey: {
      title: 'How to connect Gemini credentials?',
      url: 'https://ai.google.dev/gemini-api/docs/api-key',
      steps: [
        'Prefer a saved Gemini connection, credential vault value, wallet, key pool, or worker-level key.',
        'Use this apiKey field only as a direct fallback for legacy workflows that cannot use the shared credential resolver.',
        'If you need a direct key, create it in Google AI Studio and keep it secret; do not paste it into Prompt or upstream data.',
        'If no Gemini credential resolves, runtime returns success=false with error; wallet/key-pool failures may include code.'
      ],
      example: '{{$credentials.gemini.apiKey}}'
    },
    prompt: {
      title: 'How to set Gemini Prompt?',
      steps: [
        'Enter the instruction or message Gemini should answer.',
        'Map business text from earlier steps with expressions such as {{$json.emailBody}} or {{$json.chatMessage}}.',
        'When Prompt is static and upstream text exists, runtime can use Prompt as context and upstream text as the user message.',
        'Do not include API keys or unrelated full webhook payloads in Prompt.'
      ],
      example: 'Summarize {{$json.emailBody}} and list follow-up actions.'
    },
    model: {
      title: 'How to choose Gemini Model?',
      steps: [
        'Use gemini-3.5-flash for fast everyday summaries, extraction, and routing.',
        'Use gemini-3.1-pro-preview for more complex reasoning when your account/key supports it.',
        'Use gemini-3.1-flash-lite for lighter high-volume tasks.',
        'The selected model is returned as {{$json.model}}.'
      ],
      example: 'gemini-3.5-flash'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature is visible for compatibility, but the current google_gemini executor does not pass it to the Gemini adapter.',
        'Changing this value is not expected to affect output today.',
        'Control behavior through Prompt and Model until worker support is added.',
        'Leave the default unless you are preserving an older configuration.'
      ],
      example: '0.7'
    },
    memory: {
      title: 'How to set Memory?',
      steps: [
        'Memory is visible for compatibility, but the current google_gemini executor does not read it.',
        'This node does not remember previous runs or preserve conversation turns.',
        'Put the needed conversation history or context directly in Prompt or upstream text.',
        'Successful Gemini output contains response/model/usage/finishReason only and does not include a memory field.'
      ],
      example: '10'
    }
  },
  openai_gpt: {
    apiKey: {
      title: 'OpenAI API Key',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        'Prefer a saved OpenAI connection, credential vault value, wallet, or key pool.',
        'This field is a direct fallback; runtime also checks accessToken and token if apiKey is blank.',
        'Resolver errors return success=false with error before any model call.',
        'The key is never returned downstream; downstream nodes use response/model/usage/finishReason.'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    model: {
      title: 'How to choose Model?',
      steps: [
        'Choose the OpenAI model sent to the adapter.',
        'Runtime defaults to gpt-4o when the value is blank.',
        'Use gpt-4o-mini for high-volume simple work and gpt-4o for stronger reasoning.',
        'Do not enter Gemini, Claude, or Ollama model names here.'
      ],
      example: 'gpt-4o'
    },
    prompt: {
      title: 'How to write Prompt?',
      steps: [
        'Prompt is the primary OpenAI input.',
        'If Prompt is static and upstream text exists, runtime can use Prompt as system context and upstream text as the user message.',
        'If Prompt is blank, a messages array can be joined as fallback.',
        'Successful output does not preserve incoming fields, so keep needed IDs before this node.',
        'Use {{$json.response}} downstream; there is no content output key.'
      ],
      example: 'Summarize {{$json.emailBody}} in three bullets.'
    },
    temperature: {
      title: 'Temperature is ignored',
      steps: [
        'This is a visible legacy field.',
        'The current openai_gpt executor does not pass temperature to llmAdapter.chat.',
        'Change the prompt when you need stricter or more creative output.',
        'Leave this at the default until the worker code is updated to honor it.'
      ],
      example: '0.7'
    },
    memory: {
      title: 'Memory is ignored',
      steps: [
        'This is a visible legacy field.',
        'The current openai_gpt executor does not read memory or preserve conversation turns.',
        'Put needed history directly in Prompt or upstream text.',
        'Successful output contains response/model/usage/finishReason only.'
      ],
      example: '10'
    }
  },
  ollama: {
    prompt: {
      title: 'How to write Prompt?',
      steps: [
        'This legacy Ollama slug does not call a local Ollama server.',
        'Runtime rewrites the node to AI Chat Model and forces Gemini 3.5 Flash.',
        'Prompt is passed to that delegated Gemini call.',
        'Successful output preserves incoming fields and adds response/model.',
        'A blank effective prompt can return _error: AI Chat Model node: prompt is required.'
      ],
      example: 'Answer this customer question: {{$json.question}}'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature is passed through to the delegated Gemini-backed AI Chat Model call.',
        'Use a lower value for factual answers and a higher value for more varied wording.',
        'This field does not select an Ollama model.',
        'Use {{$json.response}} downstream for the generated text.'
      ],
      example: '0.7'
    }
  },
  anthropic_claude_legacy_unused: {
    apiKey: {
      title: 'Anthropic Claude API Key – Step-by-Step',
      url: 'https://console.anthropic.com/settings/keys',
      steps: [
        '1️⃣ Open Anthropic Console',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on "API Keys" in the left sidebar',
        '   Or go to Settings → API Keys',
        '',
        '3️⃣ Create New Key',
        '   Click "Create Key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select the organization if you have multiple',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again',
        '   The key starts with "sk-ant-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never share publicly or commit to git',
        '',
        'Example:',
        'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  azure_openai: {
    apiKey: {
      title: 'Azure OpenAI API Key – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in the top search bar',
        '   Click on your Azure OpenAI resource',
        '   (Create one if you don\'t have it)',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In the left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy API Key',
        '   You\'ll see KEY 1 and KEY 2',
        '   Copy either KEY 1 or KEY 2',
        '   Both keys work the same way',
        '',
        '5️⃣ Copy Endpoint URL',
        '   Also copy the "Endpoint" URL',
        '   Format: https://your-resource.openai.azure.com',
        '   You\'ll need this for the Endpoint field',
        '',
        '6️⃣ Store Securely',
        '   Paste the key into the API Key field above',
        '   Paste the endpoint into the Endpoint field',
        '   Never commit to version control',
        '',
        'Example Key:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    endpoint: {
      title: 'Azure OpenAI Endpoint – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in the top search bar',
        '   Click on your Azure OpenAI resource',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In the left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy Endpoint URL',
        '   Find the "Endpoint" field',
        '   Copy the full URL',
        '   Format: https://your-resource.openai.azure.com',
        '',
        '5️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Make sure it includes https://',
        '   Don\'t include any paths after .com',
        '',
        'Example:',
        'https://my-openai-resource.openai.azure.com'
      ],
      example: 'https://my-openai-resource.openai.azure.com'
    }
  },
  huggingface_inference: {
    apiKey: {
      title: 'Hugging Face Token – Step-by-Step',
      url: 'https://huggingface.co/settings/tokens',
      steps: [
        '1️⃣ Open Hugging Face',
        '   Go to 👉 https://huggingface.co/settings/tokens',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to Access Tokens',
        '   Click on "Access Tokens" in the left sidebar',
        '   Or go to Settings → Access Tokens',
        '',
        '3️⃣ Create New Token',
        '   Click "New token" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select token type:',
        '   • Read: For inference only',
        '   • Write: For uploading models',
        '',
        '4️⃣ Copy the Token',
        '   ⚠️ IMPORTANT: Copy the token immediately!',
        '   You won\'t be able to see it again',
        '   The token starts with "hf_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never share publicly',
        '',
        'Example:',
        'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  cohere_legacy_unused: {
    apiKey: {
      title: 'Cohere API Key – Step-by-Step',
      url: 'https://dashboard.cohere.com',
      steps: [
        '1️⃣ Open Cohere Dashboard',
        '   Go to 👉 https://dashboard.cohere.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on "API Keys" in the left sidebar',
        '   Or go to Settings → API Keys',
        '',
        '3️⃣ Create API Key',
        '   Click "Create API Key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select the environment (Trial or Production)',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   You won\'t be able to see it again',
        '   The key is a long alphanumeric string',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '   Never commit to version control',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // AI alias node guides
  text_summarizer: {
    text: {
      title: 'How to set Text?',
      steps: [
        'Text is inserted into a generated Gemini summarization prompt.',
        'Use an upstream field such as {{$json.articleText}}, {{$json.emailBody}}, or {{$json.ticketBody}}.',
        'Runtime does not locally reject blank text; it can send an empty-source summarization prompt.',
        'The summary returns in {{$json.response}}, not {{$json.summary}}.',
        'Incoming fields are preserved by the delegated AI Chat Model output.'
      ],
      example: '{{$json.articleText}}'
    },
    maxLength: {
      title: 'How to set Max Length?',
      steps: [
        'Max Length is a word-limit hint inserted into the generated prompt.',
        'It is not a hard truncation step and does not produce wordCount.',
        'Use values like 50, 100, or 200 for compact summaries.',
        'For strict limits, add a downstream validation or truncation step.'
      ],
      example: '100'
    },
    apiKey: {
      title: 'Gemini API Key',
      url: 'https://ai.google.dev/gemini-api/docs/api-key',
      steps: [
        'This node delegates to AI Chat Model and uses Gemini 3.5 Flash.',
        'Prefer a saved Gemini connection, credential vault value, wallet, or key pool.',
        'This field is only a direct fallback when your environment supports it.',
        'Gemini credential failures return _error from the delegated AI Chat Model.'
      ],
      example: '{{$credentials.gemini.apiKey}}'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature is passed through to the delegated Gemini-backed AI Chat Model call.',
        'Use lower values for steadier summaries.',
        'It does not create bullets or word counts by itself.',
        'Write required format rules into the text or preceding context.'
      ],
      example: '0.2'
    }
  },
  sentiment_analyzer: {
    text: {
      title: 'How to set Text?',
      steps: [
        'Text is inserted into a generated Gemini sentiment-analysis prompt.',
        'Use an upstream field such as {{$json.reviewText}}, {{$json.comment}}, or {{$json.ticketBody}}.',
        'Runtime asks Gemini for JSON with sentiment, score, and summary.',
        'Use {{$json.response.sentiment}} downstream, not {{$json.sentiment}}.',
        'Blank text is not locally rejected, so validate upstream when empty text should stop.'
      ],
      example: '{{$json.reviewText}}'
    },
    apiKey: {
      title: 'Gemini API Key',
      url: 'https://ai.google.dev/gemini-api/docs/api-key',
      steps: [
        'This node delegates to AI Chat Model and uses Gemini 3.5 Flash.',
        'Prefer a saved Gemini connection, credential vault value, wallet, or key pool.',
        'This field is only a direct fallback when your environment supports it.',
        'Gemini credential failures return _error from the delegated AI Chat Model.'
      ],
      example: '{{$credentials.gemini.apiKey}}'
    },
    temperature: {
      title: 'How to set Temperature?',
      steps: [
        'Temperature is passed through to the delegated Gemini-backed AI Chat Model call.',
        'Use a low value for stable labels and JSON shape.',
        'If Gemini returns invalid JSON, runtime falls back to raw text in response.',
        'There are no top-level sentiment, score, confidence, or label fields.'
      ],
      example: '0.2'
    }
  },
  llm_chain: {
    apiKey: {
      title: 'OpenAI API Key – Step-by-Step',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        '1️⃣ Open OpenAI Platform',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click on your profile icon (top right)',
        '   Select "API keys" from the dropdown',
        '',
        '3️⃣ Create New Secret Key',
        '   Click "Create new secret key" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '4️⃣ Copy the API Key',
        '   ⚠️ IMPORTANT: Copy the key immediately!',
        '   The key starts with "sk-"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  hugging_face: {
    apiKey: {
      title: 'Hugging Face Token – Step-by-Step',
      url: 'https://huggingface.co/settings/tokens',
      steps: [
        '1️⃣ Open Hugging Face',
        '   Go to 👉 https://huggingface.co/settings/tokens',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to Access Tokens',
        '   Click on "Access Tokens" in the left sidebar',
        '   Or go to Settings → Access Tokens',
        '',
        '3️⃣ Create New Token',
        '   Click "New token" button',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select token type:',
        '   • Read: For inference only',
        '   • Write: For uploading models',
        '',
        '4️⃣ Copy the Token',
        '   ⚠️ IMPORTANT: Copy the token immediately!',
        '   You won\'t be able to see it again',
        '   The token starts with "hf_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Store in secure vault or environment variables',
        '',
        'Example:',
        'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  huggingface: {
    apiKey: {
      title: 'How to connect Hugging Face?',
      url: 'https://huggingface.co/settings/tokens',
      steps: [
        'Create a Hugging Face Access Token with Read access for inference.',
        'Store the hf_ token in CtrlChecks Connections or the credential vault, then map it into apiKey.',
        'The current executor reads apiKey directly and returns success=false with error when it is blank.',
        'Do not put the token in Prompt, Parameters, or upstream workflow data.'
      ],
      example: '{{$credentials.huggingface.apiKey}}'
    },
    model: {
      title: 'How to set Hugging Face Model?',
      steps: [
        'Copy the exact model ID from huggingface.co/models or the model card URL.',
        'Use IDs such as facebook/bart-large-cnn, gpt2, google/flan-t5-large, or deepset/roberta-base-squad2.',
        'Make sure your token has access to gated/private models before using them.',
        'Wrong IDs or inaccessible models return a HuggingFace API error.'
      ],
      example: 'facebook/bart-large-cnn'
    },
    prompt: {
      title: 'How to set Hugging Face Prompt?',
      steps: [
        'Enter the text the model should process, or map it from a previous step with {{$json.reviewText}} or {{$json.article}}.',
        'Runtime sends this value as inputs in the request body.',
        'If Prompt is blank, runtime returns success=false with error: prompt is required.',
        'Task and Parameters do not change the prompt shape in the current executor.'
      ],
      example: 'Summarize {{$json.reviewText}} in one sentence.'
    },
    task: {
      title: 'How to set Task?',
      steps: [
        'Task is a visible hint for humans and generated configs.',
        'The current executor does not send task to Hugging Face.',
        'Use it to remind yourself which model family you selected, not to change runtime behavior.',
        'Choose a model whose card already supports the task you need.'
      ],
      example: 'summarization'
    },
    parameters: {
      title: 'How to set Parameters?',
      steps: [
        'Parameters is a legacy visible JSON field ignored by the current executor.',
        'Use Max Tokens and Temperature for the two parameter values that runtime actually sends.',
        'Leave this as {} unless a future worker change starts reading it.',
        'Do not store secrets or model input text in this JSON field.'
      ],
      example: '{}'
    }
  },
  memory: {
    sessionId: {
      title: 'How to set Memory Session ID?',
      steps: [
        'Use a stable customer, ticket, chat, or workflow ID that downstream AI/logging steps can recognize.',
        'Map values such as ticket-{{$json.ticketId}} or {{$json.sessionId}}.',
        'If blank, runtime returns a generated value like mem_<node id>.',
        'Do not use a random ID every run when later steps need stable grouping.'
      ],
      example: 'ticket-{{$json.ticketId}}'
    },
    context: {
      title: 'How to set Memory Context?',
      steps: [
        'Enter the context text you want downstream AI steps to see.',
        'Map prepared summaries such as {{$json.customerContext}} or {{$json.summary}}.',
        'If blank and incoming data has no context, runtime returns context as null.',
        'This node does not create or retrieve context by itself.'
      ],
      example: '{{$json.customerContext}}'
    },
    operation: {
      title: 'How to set Memory Operation?',
      steps: [
        'Store, Retrieve, Clear, and Search are visible legacy options.',
        'The current executor ignores the selected operation and always returns sessionId, context, and messages.',
        'No Redis/vector write, read, clear, or search is performed.',
        'Leave Store selected unless preserving an older visual config.'
      ],
      example: 'store'
    },
    ttl: {
      title: 'How to set Memory TTL?',
      steps: [
        'TTL is visible for legacy short-term memory designs.',
        'The current runtime does not persist memory, so TTL has no effect.',
        'Do not rely on this field for retention, expiry, or privacy controls.',
        'Handle retention in a real storage node or external service.'
      ],
      example: '3600'
    }
  },
  mistral: {
    apiKey: {
      title: 'How to connect Mistral?',
      url: 'https://docs.mistral.ai',
      steps: [
        'Create a Mistral API key in La Plateforme or the Mistral console.',
        'Store it in CtrlChecks Connections or credential vault, then map it into apiKey.',
        'The current executor reads apiKey directly and returns success=false with error when it is blank.',
        'Use a key that has access to the selected model.'
      ],
      example: '{{$credentials.mistral.apiKey}}'
    },
    prompt: {
      title: 'How to set Mistral Prompt?',
      steps: [
        'Enter the user message Mistral should answer.',
        'Map previous text with expressions such as {{$json.ticketBody}} or {{$json.customerQuestion}}.',
        'If Prompt is blank, runtime returns success=false with error: prompt is required.',
        'Successful output preserves upstream fields and adds response/token fields.'
      ],
      example: 'Summarize {{$json.ticketBody}} and identify the refund reason.'
    },
    systemPrompt: {
      title: 'How to set Mistral System Prompt?',
      steps: [
        'Use this for standing rules such as tone, role, or output format.',
        'Runtime sends it as a system message before Prompt when it is not blank.',
        'Keep it short and do not include API keys or unnecessary private data.',
        'Leave blank for a simple one-off request.'
      ],
      example: 'Return one concise sentence.'
    },
    model: {
      title: 'How to choose Mistral Model?',
      steps: [
        'Use mistral-small-latest for fast everyday work.',
        'Use mistral-medium-latest or mistral-large-latest for more complex reasoning when available.',
        'Use codestral-latest for code-focused tasks.',
        'Wrong or unavailable model names return a Mistral API error.'
      ],
      example: 'mistral-small-latest'
    }
  },
  langchain: {
    apiKey: {
      title: 'How to connect LangChain provider credentials?',
      steps: [
        'Use an OpenAI key when Provider is openai and an Anthropic key when Provider is anthropic.',
        'Store keys in Connections or the credential vault, then map the correct one into apiKey.',
        'The current executor reads apiKey directly and does not auto-select a saved LangChain connection.',
        'Do not put provider secrets in Prompt, Tools, Memory, or upstream data.'
      ],
      example: '{{$credentials.openai.apiKey}}'
    },
    prompt: {
      title: 'How to set LangChain Prompt?',
      steps: [
        'Enter the task or user message to send to OpenAI or Anthropic.',
        'Map business data from earlier steps with {{$json.ticketBody}}, {{$json.transcript}}, or {{$json.customerQuestion}}.',
        'The response is returned as {{$json.response}}.',
        'Successful output does not preserve incoming fields, so keep required IDs before this node.'
      ],
      example: 'Summarize {{$json.ticketBody}} and list the next best action.'
    },
    tools: {
      title: 'How to set LangChain Tools?',
      steps: [
        'Tools must be a JSON array of OpenAI function definitions.',
        'The current executor sends tools only when Operation is run_agent and Provider is openai.',
        'Anthropic does not receive tools through this node today.',
        'Tools define possible calls; this node returns tool-call steps but does not execute your API by itself.'
      ],
      example: '[{"name":"lookup_order","description":"Find order details","parameters":{"type":"object","properties":{"orderId":{"type":"string"}}}}]'
    },
    memory: {
      title: 'How to set LangChain Memory?',
      steps: [
        'Memory is a visible legacy toggle ignored by the current executor.',
        'Turning it on does not retrieve conversation history or preserve previous runs.',
        'Map needed context directly into Prompt, for example Context: {{$json.context}}.',
        'No downstream output confirms memory was used.'
      ],
      example: 'false'
    }
  },
  embeddings: {
    apiKey: {
      title: 'API Key for Embeddings – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI Embeddings',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Sign in or create an account',
        '   Click "Create new secret key"',
        '   Copy the key (starts with "sk-")',
        '',
        '2️⃣ For Google Gemini Embeddings',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Sign in with Google account',
        '   Click "Create API key"',
        '   Copy the key (starts with "AIza")',
        '',
        '3️⃣ Select Provider',
        '   Choose the provider in the dropdown above',
        '   Then use the corresponding API key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '',
        'Example (OpenAI):',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '',
        'Example (Gemini):',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  vector_store: {
    apiKey: {
      title: 'Vector Store API Key – Step-by-Step',
      steps: [
        '1️⃣ For Pinecone',
        '   Go to 👉 https://app.pinecone.io',
        '   Sign in or create an account',
        '   Navigate to "API Keys" section',
        '   Copy your API key',
        '   Also note your environment and index name',
        '',
        '2️⃣ For Supabase',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in to your project',
        '   Go to Settings → API',
        '   Copy the "anon" or "service_role" key',
        '   Use "service_role" for server-side operations',
        '',
        '3️⃣ Select Provider',
        '   Choose Pinecone or Supabase in dropdown',
        '   Use the corresponding API key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '   Never commit to version control',
        '',
        'Example (Pinecone):',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '',
        'Example (Supabase):',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      ],
      example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    }
  },
  chat_model_legacy_unused: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ For Azure OpenAI',
        '   Go to 👉 https://portal.azure.com',
        '   Navigate to Azure OpenAI resource',
        '   Go to "Keys and Endpoint"',
        '   Copy KEY 1 or KEY 2',
        '',
        '5️⃣ Select Provider',
        '   Choose provider in dropdown above',
        '   Use corresponding API key',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example (OpenAI):',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    endpoint: {
      title: 'Azure OpenAI Endpoint – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with your Azure account',
        '',
        '2️⃣ Navigate to Azure OpenAI Resource',
        '   Search for "Azure OpenAI" in top search bar',
        '   Click on your Azure OpenAI resource',
        '',
        '3️⃣ Go to Keys and Endpoint',
        '   In left sidebar, click "Keys and Endpoint"',
        '   Under "Resource Management" section',
        '',
        '4️⃣ Copy Endpoint URL',
        '   Find the "Endpoint" field',
        '   Copy the full URL',
        '   Format: https://your-resource.openai.azure.com',
        '',
        '5️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Make sure it includes https://',
        '   Don\'t include any paths after .com',
        '',
        'Example:',
        'https://my-openai-resource.openai.azure.com'
      ],
      example: 'https://my-openai-resource.openai.azure.com'
    }
  },
  // AI Agent nodes that use apiKey
  intent_classification_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Select Model',
        '   Choose model in dropdown above',
        '   Use corresponding API key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sentiment_analysis_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  confidence_scoring_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  lead_qualification_agent: {
    apiKey: {
      title: 'AI Provider API Key – Step-by-Step',
      steps: [
        '1️⃣ For OpenAI',
        '   Go to 👉 https://platform.openai.com/api-keys',
        '   Click "Create new secret key"',
        '   Copy key (starts with "sk-")',
        '',
        '2️⃣ For Anthropic Claude',
        '   Go to 👉 https://console.anthropic.com/settings/keys',
        '   Click "Create Key"',
        '   Copy key (starts with "sk-ant-")',
        '',
        '3️⃣ For Google Gemini',
        '   Go to 👉 https://aistudio.google.com/apikey',
        '   Click "Create API key"',
        '   Copy key (starts with "AIza")',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the input field above',
        '',
        'Example:',
        'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  http_request: {
    url: {
      title: 'How to set URL',
      steps: [
        'URL is the full API endpoint or webhook address this node should call.',
        '',
        'Use the complete address, including https:// or http:// and the resource path.',
        'Map IDs from previous steps when needed, such as https://api.example.com/customers/{{$json.customerId}}.',
        '',
        'Keep fixed record IDs in the URL path, and put filters such as status, page, or limit in Query String Params.',
        'Runtime returns the final called URL as {{$json.url}}, which is useful for troubleshooting.',
        '',
        'If URL is blank, the node returns _error: HTTP Request node: URL is required.'
      ],
      example: 'https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices'
    },
    method: {
      title: 'How to choose Method',
      steps: [
        'Choose the action shown in the API documentation for this endpoint.',
        '',
        'GET reads data and usually has no Body.',
        'POST creates or submits data and commonly uses Body.',
        'PUT replaces a whole resource and commonly uses Body.',
        'PATCH updates selected fields and commonly uses Body.',
        'DELETE removes or cancels a resource and usually has no Body.',
        '',
        'Runtime uppercases the method and sends Body only for POST, PUT, and PATCH.',
        'The wrong method can return 405, skip your Body, create duplicates, or delete data.'
      ],
      example: 'GET'
    },
    headers: {
      title: 'How to set Headers',
      steps: [
        'Headers are optional JSON key-value instructions sent with the request.',
        '',
        'Use Content-Type and Accept for JSON APIs.',
        'Use service-specific headers only when the API documentation asks for them, such as X-API-Key or X-Request-Source.',
        '',
        'For protected APIs, use a secure connection, environment value, or approved secret reference instead of pasting private tokens into the workflow.',
        'Response headers come back as {{$json.headers}}, including content type, request IDs, and rate-limit information.'
      ],
      example: '{"Content-Type":"application/json","Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}'
    },
    body: {
      title: 'How to set Body',
      steps: [
        'Body is the data sent to APIs that create or update something.',
        '',
        'Fill it for POST, PUT, or PATCH when the API documentation expects a request payload.',
        'Leave it empty for GET and DELETE because runtime does not send Body for those methods.',
        '',
        'Use a small JSON object that matches the API schema. Map values from previous nodes with {{$json.fieldName}}.',
        'The request Body is not returned unless the API echoes it; the response is available as {{$json.body}} and {{$json.data}}.'
      ],
      example: '{"requesterEmail":"{{$json.email}}","subject":"New billing question","message":"{{$json.message}}"}'
    },
    qs: {
      title: 'How to set Query String Params',
      steps: [
        'Query String Params are filters and options appended to the URL.',
        '',
        'Use them for page, limit, status, date ranges, search terms, sort order, or optional include flags.',
        'Enter a JSON object without the leading question mark.',
        '',
        'Runtime appends these values to the URL and returns the final URL as {{$json.url}}.',
        'Avoid adding the same parameter in both URL and Query String Params.'
      ],
      example: '{"status":"open","created_after":"{{$json.reportStartDate}}","limit":100}'
    },
    timeout: {
      title: 'How to set Timeout',
      steps: [
        'Timeout is how long the workflow waits for the remote server to respond.',
        '',
        'Use 30000 for ordinary APIs, lower values when the workflow should fail fast, and higher values only for slow reports or large responses.',
        'Blank or invalid values default to 30000.',
        '',
        'Timeout is not retry behavior. If the API takes too long, the node returns _error and errorDetails.timeout for downstream alerts.'
      ],
      example: '30000'
    }
  },  google_sheets: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what you want to do in Google Sheets.',
        '',
        'Options:',
        '• Read – retrieve data',
        '• Write – replace data in a range',
        '• Append – add new rows',
        '• Update – modify existing cells',
        '',
        'Choose based on whether you are reading or writing.'
      ],
      example: 'read'
    },
    spreadsheetId: {
      title: 'Google Sheets ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your Google Sheet',
        '   Go to 👉 https://sheets.google.com',
        '   Open the spreadsheet you want to use',
        '',
        '2️⃣ Get the Spreadsheet ID from URL',
        '   Look at the URL in your browser',
        '   Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
        '   The ID is the long string between /d/ and /edit',
        '',
        '3️⃣ Copy the ID',
        '   Select and copy the ID from the URL',
        '   It looks like: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        '   It\'s usually 44 characters long',
        '',
        '4️⃣ Paste the ID',
        '   Paste it into the Spreadsheet ID field above',
        '   Make sure there are no extra spaces',
        '',
        '5️⃣ Verify Access',
        '   Ensure the sheet is accessible',
        '   For private sheets, use OAuth authentication',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    sheetName: {
      title: 'How to set Sheet Name?',
      steps: [
        'Sheet Name is the tab name at the bottom of your spreadsheet.',
        '',
        'Example: Sheet1',
        'Leave empty to use the first sheet.'
      ],
      example: 'Sheet1'
    },
    range: {
      title: 'How to set Range?',
      steps: [
        'Range defines which cells to read or write.',
        '',
        'Examples:',
        '• A1:D10',
        '• A1:D (all rows in columns A–D)',
        '',
        'Leave empty to read all used cells.'
      ],
      example: 'A1:D10'
    },
    outputFormat: {
      title: 'How to choose Output Format?',
      steps: [
        'Output Format controls how data is returned when reading.',
        '',
        'Options:',
        '• JSON Array',
        '• Key‑Value Pairs',
        '• Plain Text Table'
      ],
      example: 'json'
    },
    readDirection: {
      title: 'How to set Read Direction?',
      steps: [
        'Read Direction chooses row‑wise or column‑wise output.',
        '',
        'Row‑wise is the default and most common.'
      ],
      example: 'rows'
    },
    allowWrite: {
      title: 'What is Allow Write Access?',
      steps: [
        'Enable this to allow Write/Append/Update operations.',
        '',
        'If disabled, the node will only read data.',
        'This may be restricted to admin users.'
      ],
      example: 'false'
    },
    data: {
      title: 'How to set Data to Write (JSON)?',
      steps: [
        'Data is required for Write, Append, or Update.',
        '',
        'Use a JSON array of rows:',
        '[["Name","Email"],["John","john@example.com"]]',
        '',
        'Tip: Ensure your data matches the sheet structure.'
      ],
      example: '[["Name","Email"],["John","john@example.com"]]'
    }
  },
  twitter: {
    apiKey: {
      title: 'Twitter API Key – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Open Twitter Developer Portal',
        '   Go to 👉 https://developer.twitter.com',
        '   Sign in with your Twitter/X account',
        '',
        '2️⃣ Create or Select App',
        '   Go to "Projects & Apps"',
        '   Create a new App or select existing one',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Go to Keys and Tokens',
        '   Click on your App',
        '   Navigate to "Keys and tokens" tab',
        '',
        '4️⃣ Copy API Key',
        '   Find "Consumer Keys" section',
        '   Copy the "API Key" (also called Consumer Key)',
        '   ⚠️ You can regenerate if needed',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need API Secret, Access Token, and Access Token Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    apiSecret: {
      title: 'Twitter API Secret – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Consumer Keys Section',
        '   Look for "Consumer Keys"',
        '   Find "API Secret" (Consumer Secret)',
        '',
        '3️⃣ Copy API Secret',
        '   Click "Reveal" if hidden',
        '   Copy the API Secret',
        '   ⚠️ You can regenerate if needed',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the API Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'Twitter Access Token – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Access Token Section',
        '   Scroll to "Access Token and Secret"',
        '   Click "Generate" if not created yet',
        '',
        '3️⃣ Copy Access Token',
        '   Copy the "Access Token"',
        '   ⚠️ You\'ll only see it once when generated',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   You\'ll also need Access Token Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessTokenSecret: {
      title: 'Twitter Access Token Secret – Step-by-Step',
      url: 'https://developer.twitter.com',
      steps: [
        '1️⃣ Go to Keys and Tokens',
        '   In your Twitter App settings',
        '   Navigate to "Keys and tokens" tab',
        '',
        '2️⃣ Find Access Token Section',
        '   In "Access Token and Secret" section',
        '   Find "Access Token Secret"',
        '',
        '3️⃣ Copy Access Token Secret',
        '   Click "Reveal" if hidden',
        '   Copy the Access Token Secret',
        '   ⚠️ You\'ll only see it once when generated',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Create Tweet – Post a text tweet (requires Tweet Text).',
        '',
        '• Create Tweet with Media – Post with an image/video (requires Tweet Text + Media URL).',
        '',
        '• Delete Tweet / Like / Unlike / Retweet / Get Tweet by ID – Requires Tweet ID.',
        '',
        '• Search Tweets – Requires Search Query (optional Max Results).',
        '',
        '• Get User Timeline / Follow / Unfollow – Requires Username.',
        '',
        '• Get Mentions – Uses Max Results to control how many items.',
      ],
      example: 'Create Tweet'
    },
    text: {
      title: 'How to get Tweet Text?',
      steps: [
        'You type the tweet content or map it from a previous step.',
        '',
        '• Static: "Hello World from automation!"',
        '',
        '• Dynamic: Use data like "{{input.text}}".',
        '',
        'Required for Create Tweet and Create Tweet with Media.',
      ],
      example: 'Hello World from automation!'
    },
    tweetId: {
      title: 'Twitter Tweet ID – Step-by-Step',
      steps: [
        '1️⃣ Open the tweet in a browser',
        '',
        '2️⃣ Copy the number after /status/ in the URL',
        '',
        '3️⃣ Or use the ID returned when you create or list tweets',
        '',
        'Example:',
        '1234567890123456789'
      ],
      example: '1234567890123456789'
    },
    mediaUrl: {
      title: 'How to get Media URL?',
      steps: [
        'Upload the image or video to a public host (CDN, Cloudinary, Imgur, etc.).',
        '',
        'Copy the direct HTTPS URL to the file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/image.jpg'
      ],
      example: 'https://example.com/image.jpg'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'Write a Twitter search query using operators.',
        '',
        'Common examples:',
        '• "keyword" (exact match)',
        '• from:username',
        '• has:media',
        '• automation OR workflow',
        '',
        'Example:',
        'automation OR workflow'
      ],
      example: 'automation OR workflow'
    },
    username: {
      title: 'How to get Username?',
      steps: [
        'Open the Twitter profile in a browser.',
        '',
        'Copy the username from the URL (without the @).',
        '',
        'Example:',
        'twitter_username'
      ],
      example: 'twitter_username'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Allowed range is 1–100.',
        '',
        'Used for Search Tweets, Get Mentions, and Get User Timeline.'
      ],
      example: '10'
    }
  },
  database_read: {
    table: {
      title: 'How to enter Table Name?',
      steps: [
        'Table Name is the database table you are reading from.',
        '',
        'Step 1: Check your database schema.',
        '• Use your DB tool (psql, MySQL client, pgAdmin, etc.) to list tables.',
        '• Copy the exact table name (respect case-sensitivity if your DB enforces it).',
        '',
        'Step 2: Enter the table name here.',
        '• Examples: users, orders, events, logs.',
        '• For schemas/namespaces, include schema prefix, e.g. public.users or analytics.daily_reports.',
        '',
        'Step 3: (Optional) Use template variables.',
        '• You can build dynamic table names like {{input.tableName}} if your workflow passes the name from a previous node.',
        '',
        'Tip: Avoid quoting the name here; the node will construct the SQL safely. Just provide the raw table name.'
      ],
      example: 'users'
    },
    columns: {
      title: 'How to set Columns?',
      steps: [
        'Columns controls which fields/columns are returned in the query.',
        '',
        'Option 1 – All columns:',
        '• Use * to select every column from the table.',
        '• Good for quick debugging or small tables.',
        '',
        'Option 2 – Specific columns (recommended):',
        '• Provide a comma-separated list of column names, e.g. id, email, created_at.',
        '• This reduces data size and improves performance.',
        '',
        'Examples:',
        '• *',
        '• id,name,email',
        '• id,order_id,amount,created_at',
        '',
        'Tip: Make sure column names exist on the table; invalid names will cause SQL errors.'
      ],
      example: 'id,name,email'
    },
    orderBy: {
      title: 'How to set Order By?',
      steps: [
        'Order By defines how the results should be sorted.',
        '',
        'Step 1: Choose a column to sort by.',
        '• Common choices: created_at, updated_at, id, name.',
        '• The column must exist in the selected table.',
        '',
        'Step 2: Enter the column name here (without ASC/DESC).',
        '• Example: created_at.',
        '',
        'Step 3: Control direction with the Ascending toggle (in the node properties).',
        '• Ascending = true → oldest to newest / A–Z / smallest to largest.',
        '• Ascending = false → newest to oldest / Z–A / largest to smallest.',
        '',
        'Tip: Leave Order By empty if you do not care about sort order or will sort later in another step.'
      ],
      example: 'created_at'
    }
  },
  database_write: {
    table: {
      title: 'How to enter Table Name?',
      steps: [
        'Table Name is the database table you are writing to.',
        '',
        'Step 1: Confirm the target table in your database.',
        '• Use your DB tool to list tables and verify the correct one (e.g. users, orders, events).',
        '',
        'Step 2: Enter the exact table name.',
        '• Examples: users, orders, audit_logs.',
        '• For schemas, include schema prefix (public.users, analytics.events).',
        '',
        'Step 3: Make sure the table has the columns referenced in your Data Template and Match Column.',
        '',
        'Tip: Use a staging/test table while building workflows, then switch to production table after validation.'
      ],
      example: 'orders'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines how this node modifies data in the table.',
        '',
        'Insert:',
        '• Adds new rows.',
        '• Requires Data Template with column/value pairs.',
        '',
        'Update:',
        '• Modifies existing rows.',
        '• Requires Match Column to identify which rows to update (e.g., id or email).',
        '• Data Template defines the columns to change.',
        '',
        'Upsert (insert or update):',
        '• If a row with the Match Column value exists → update it.',
        '• If not → insert a new row.',
        '• Useful for "sync" scenarios, deduplicating by unique key (email, external_id, etc.).',
        '',
        'Delete:',
        '• Deletes rows matching the Match Column (and value coming from input).',
        '• Use carefully—consider soft deletes or archiving first.',
        '',
        'Tip: Start with Insert while testing to avoid accidental data loss. Switch to Update/Upsert/Delete once your filters and keys are correct.'
      ],
      example: 'insert'
    },
    data: {
      title: 'How to design Data Template?',
      steps: [
        'Data Template describes the row values to write, using JSON with column names as keys.',
        '',
        'Step 1: List the columns you want to write.',
        '• Example columns: id, email, name, created_at, status.',
        '',
        'Step 2: Map values from input or constants.',
        '• Use static values: {"status": "active"}.',
        '• Use template variables: {"email": "{{input.email}}", "name": "{{input.name}}"}.',
        '',
        'Insert example:',
        '{"email": "{{input.email}}", "name": "{{input.name}}", "created_at": "{{now}}"}',
        '',
        'Update/Upsert example (excluding Match Column if DB fills it automatically):',
        '{"status": "active", "last_login_at": "{{input.login_time}}"}',
        '',
        'Tip:',
        '• Ensure JSON is valid (double quotes around keys and string values).',
        '• Only include columns you actually want to write or update.'
      ],
      example: '{"email": "{{input.email}}", "name": "{{input.name}}"}'
    },
    matchColumn: {
      title: 'How to set Match Column?',
      steps: [
        'Match Column is the column used to find which rows to Update, Upsert, or Delete.',
        '',
        'Common choices:',
        '• id – primary key for the table.',
        '• user_id – foreign key to a users table.',
        '• email or external_id – unique business identifier.',
        '',
        'How it works:',
        '• The value for this column usually comes from workflow input (e.g., {{input.id}} or {{input.email}}).',
        '• For Update/Upsert/Delete, the node builds a WHERE clause like "WHERE matchColumn = providedValue".',
        '',
        'Examples:',
        '• id',
        '• user_id',
        '• email',
        '',
        'Tip: Make sure the Match Column is indexed or unique for best performance and to avoid updating multiple rows unintentionally.'
      ],
      example: 'id'
    }
  },
  supabase: {
    apiKey: {
      title: 'Supabase API Key – Step-by-Step',
      url: 'https://app.supabase.com',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Select Your Project',
        '   Click on your project',
        '   Or create a new project if needed',
        '',
        '3️⃣ Go to API Settings',
        '   Click "Settings" in left sidebar',
        '   Click "API" under Project Settings',
        '',
        '4️⃣ Copy API Key',
        '   You\'ll see two keys:',
        '   • "anon" key: For client-side (public)',
        '   • "service_role" key: For server-side (private)',
        '   Use "service_role" for workflows',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never expose service_role key publicly',
        '',
        'Example:',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTc5ODAwMCwiZXhwIjoxOTYxMzc0MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    },
    projectUrl: {
      title: 'Supabase Project URL – Step-by-Step',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to 👉 https://app.supabase.com',
        '   Sign in and open your project',
        '',
        '2️⃣ Go to API Settings',
        '   Click "Settings" → "API"',
        '',
        '3️⃣ Copy Project URL',
        '   It looks like: https://YOUR-PROJECT.supabase.co',
        '',
        '4️⃣ Paste into the Project URL field above',
        '',
        'Example:',
        'https://xyzcompany.supabase.co'
      ],
      example: 'https://xyzcompany.supabase.co'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters, Limit, Order By, Ascending.',
        '',
        '• Raw SQL – You provide the full SQL Query (SELECT, INSERT, UPDATE, DELETE, or complex queries). Use for JOINs, subqueries, or write operations.',
        '',
        'Pick the one that matches what you need; the rest of the fields depend on this choice.'
      ],
      example: 'Select'
    },
    table: {
      title: 'Supabase Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open Supabase Dashboard',
        '   Go to Database → Tables',
        '',
        '2️⃣ Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'users'
      ],
      example: 'my_table'
    },
    query: {
      title: 'How to get SQL Query?',
      steps: [
        'You write it or get it from a developer.',
        '',
        '• Read: SELECT * FROM table_name WHERE column = \'value\' LIMIT 10;',
        '',
        '• Insert: INSERT INTO table_name (col1, col2) VALUES (\'a\', \'b\');',
        '',
        '• Update: UPDATE table_name SET col1 = \'value\' WHERE id = 1;',
        '',
        '• Delete: DELETE FROM table_name WHERE id = 1;',
        '',
        'For complex queries (JOINs, subqueries), write or paste the full SQL. Used only for Raw SQL.',
        'Be careful with INSERT/UPDATE/DELETE—they change data.'
      ],
      example: 'SELECT * FROM table WHERE id = 1'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use Raw SQL.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select (and sometimes for Raw SQL if the platform applies it). Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    },
    orderBy: {
      title: 'How to get Order By?',
      steps: [
        'You type a column name from your table (e.g. created_at, id, name).',
        '',
        '• Leave empty if you don’t care about order.',
        '',
        '• Used with Ascending to control sort direction.',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'created_at'
      ],
      example: 'created_at'
    },
    ascending: {
      title: 'How to get Ascending?',
      steps: [
        'You set the toggle in this node: true or false.',
        '',
        '• true – Ascending (A-Z, oldest first).',
        '• false – Descending (Z-A, newest first).',
        '',
        'Only applies when Order By is set. Used only for Select operation.'
      ],
      example: 'true'
    }
  },
  sql_server_legacy_unused: {
    host: {
      title: 'SQL Server Connection – Step-by-Step',
      steps: [
        '1️⃣ For Azure SQL Database',
        '   Format: server.database.windows.net',
        '   Find it in Azure Portal → SQL Database → Overview',
        '   Example: myserver.database.windows.net',
        '',
        '2️⃣ For On-Premise SQL Server',
        '   Use server name or IP address',
        '   Example: localhost, 192.168.1.100, myserver',
        '',
        '3️⃣ Get Server Name',
        '   Check with your database administrator',
        '   Or find in connection strings documentation',
        '',
        '4️⃣ Include Port (if custom)',
        '   Default: 1433',
        '   Custom: server,1433 or server:1433',
        '',
        '5️⃣ Use the Server',
        '   Paste it into the Server field above',
        '   You\'ll also need Database, Username, Password',
        '',
        'Example (Azure):',
        'myserver.database.windows.net',
        '',
        'Example (On-Premise):',
        'localhost'
      ],
      example: 'myserver.database.windows.net'
    },
    username: {
      title: 'SQL Server Username – Step-by-Step',
      steps: [
        '1️⃣ For Azure SQL Database',
        '   Format: username@servername',
        '   Example: admin@myserver',
        '   Use the admin account or created user',
        '',
        '2️⃣ For SQL Server Authentication',
        '   Use the SQL login username',
        '   Example: sa, myuser, admin',
        '',
        '3️⃣ Get Username',
        '   Check with your database administrator',
        '   Or use the account created for this workflow',
        '',
        '4️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example (Azure):',
        'admin@myserver',
        '',
        'Example (SQL Auth):',
        'myuser'
      ],
      example: 'admin@myserver'
    },
    password: {
      title: 'SQL Server Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your SQL Server account',
        '   Check with your database administrator',
        '   Or use the password you set when creating the account',
        '',
        '2️⃣ For Azure SQL Database',
        '   Use password for username@servername account',
        '   Can reset in Azure Portal if needed',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        '4️⃣ Test Connection',
        '   Verify the credentials work',
        '   Check firewall rules if connection fails',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  facebook: {
    accessToken: {
      title: 'Facebook Page Access Token – Step-by-Step',
      url: 'https://developers.facebook.com',
      steps: [
        '1️⃣ Open Facebook Developers',
        '   Go to 👉 https://developers.facebook.com',
        '   Sign in with your Facebook account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps" → "Create App"',
        '   Or select an existing app',
        '   Choose "Business" as app type',
        '',
        '3️⃣ Add Facebook Login Product',
        '   In App Dashboard, click "+ Add Product"',
        '   Find "Facebook Login" and click "Set Up"',
        '',
        '4️⃣ Go to Graph API Explorer',
        '   Click "Tools" → "Graph API Explorer"',
        '   Or go to: developers.facebook.com/tools/explorer',
        '',
        '5️⃣ Select Your Page',
        '   In "User or Page" dropdown, select your Page',
        '   Not your personal profile - must be a Page',
        '',
        '6️⃣ Select Permissions',
        '   Click "Get Token" → "Get Page Access Token"',
        '   Select permissions:',
        '   • pages_manage_posts',
        '   • pages_read_engagement',
        '   • pages_show_list',
        '',
        '7️⃣ Generate and Copy Token',
        '   Click "Generate Access Token"',
        '   Copy the token immediately',
        '   ⚠️ Token expires - you may need to extend it',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Page Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    pageId: {
      title: 'Facebook Page ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Your Facebook Page',
        '   Navigate to your Facebook Page',
        '   Make sure you\'re an admin',
        '',
        '2️⃣ Method 1: About Section',
        '   Click "About" in left sidebar',
        '   Scroll down to find "Page ID"',
        '   Copy the numeric ID',
        '',
        '3️⃣ Method 2: Page Source',
        '   Right-click on page → "View Page Source"',
        '   Press Ctrl+F (or Cmd+F)',
        '   Search for "page_id"',
        '   Copy the numeric value',
        '',
        '4️⃣ Method 3: Graph API',
        '   Go to Graph API Explorer',
        '   Query: GET /me/accounts',
        '   Find your page in the response',
        '   Copy the "id" field',
        '',
        '5️⃣ Use the Page ID',
        '   Paste it into the Page ID field above',
        '   It\'s a long numeric string',
        '',
        'Example:',
        '123456789012345'
      ],
      example: '123456789012345'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in this node.',
        '',
        'Implemented today:',
        '',
        '• Page + List - lists managed Pages and returns pages/count.',
        '',
        '• Messenger Message + Send Messenger Text - sends a text reply. Requires Page ID, Recipient PSID, and Message or Text.',
        '',
        '• Comment + Create Comment - replies to a post or comment. Requires Post ID or Comment ID plus reply text.',
        '',
        'Other visible options such as createPost, upload, getInsights, markSeen, typingOn, and delete are scaffolded and return _error until handlers are implemented.',
      ],
      example: 'page + list'
    },
    message: {
      title: 'How to get Message?',
      steps: [
        'Type the Messenger/comment reply text, or map it from an earlier workflow step.',
        '',
        'Static example: "Thanks for reaching out. We are checking this now."',
        '',
        'Dynamic example: "{{$json.aiResponse}}" from an AI Agent or support classifier.',
        '',
        'Required for sendTextMessage when Text is blank, and for createComment when Reply Text is blank.'
      ],
      example: '{{$json.aiResponse}}'
    },
    imageUrl: {
      title: 'How to get Image URL?',
      steps: [
        'Upload the image to a public host (e.g. Cloudinary, CDN, Imgur).',
        '',
        'Copy the direct HTTPS URL to the image file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/image.jpg'
      ],
      example: 'https://example.com/image.jpg'
    },
    linkUrl: {
      title: 'How to get Link URL?',
      steps: [
        'Use the URL you want to share in the post.',
        '',
        'Must be a valid HTTP/HTTPS link.',
        '',
        'Example:',
        'https://example.com/article'
      ],
      example: 'https://example.com/article'
    },
    videoUrl: {
      title: 'How to get Video URL?',
      steps: [
        'Upload the video to a public host.',
        '',
        'Copy the direct HTTPS URL to the video file.',
        '',
        'The URL must be publicly accessible.',
        '',
        'Example:',
        'https://example.com/video.mp4'
      ],
      example: 'https://example.com/video.mp4'
    },
    postId: {
      title: 'Facebook Post ID – Step-by-Step',
      steps: [
        '1️⃣ Open the post on your Facebook Page',
        '',
        '2️⃣ Click on the post → Copy link',
        '',
        '3️⃣ The Post ID is in the URL (often PAGE_ID_POST_ID)',
        '',
        '4️⃣ Or use the ID returned by the API when creating the post',
        '',
        'Example:',
        '123456789012345_987654321098765'
      ],
      example: '123456789012345_987654321098765'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'You type or provide the comment text.',
        '',
        '• Static: Type it directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.comment}}".',
        '',
        'Required for Create Comment and Reply to Comment.'
      ],
      example: 'Your comment'
    },
    commentId: {
      title: 'Facebook Comment ID – Step-by-Step',
      steps: [
        '1️⃣ Go to the post → View comments',
        '',
        '2️⃣ Click on a comment → Copy link',
        '',
        '3️⃣ The Comment ID appears in the URL',
        '',
        '4️⃣ Or use the ID returned by the API when listing comments',
        '',
        'Example:',
        '123456789012345'
      ],
      example: '123456789012345'
    },
    metric: {
      title: 'How to get Insight Metric?',
      steps: [
        'Choose a metric from the dropdown.',
        '',
        'Options include: page_impressions, page_reach, page_engaged_users, post_engagements.',
        '',
        'Used only for Get Page Insights.'
      ],
      example: 'page_reach'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many posts to return.',
        '',
        'Default is often 25 (max 100).',
        '',
        'Used for Get Page Posts.'
      ],
      example: '25'
    }
  },
  instagram: {
    accessToken: {
      title: 'Instagram Access Token – Step-by-Step',
      url: 'https://developers.facebook.com',
      steps: [
        '1️⃣ Open Facebook Developers',
        '   Go to 👉 https://developers.facebook.com',
        '   Sign in with your Facebook account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps" → "Create App"',
        '   Or select an existing app',
        '   Choose "Business" as app type',
        '',
        '3️⃣ Add Instagram Graph API',
        '   In App Dashboard, click "+ Add Product"',
        '   Find "Instagram Graph API" and click "Set Up"',
        '',
        '4️⃣ Connect Instagram Business Account',
        '   Go to "Basic" settings',
        '   Connect your Instagram Business Account',
        '   Must be a Business or Creator account',
        '',
        '5️⃣ Go to Graph API Explorer',
        '   Click "Tools" → "Graph API Explorer"',
        '   Or go to: developers.facebook.com/tools/explorer',
        '',
        '6️⃣ Select Instagram Business Account',
        '   In "User or Page" dropdown',
        '   Select your Instagram Business Account',
        '',
        '7️⃣ Select Permissions',
        '   Click "Get Token" → "Get User Access Token"',
        '   Select permissions:',
        '   • instagram_basic',
        '   • instagram_content_publish',
        '   • pages_show_list',
        '',
        '8️⃣ Generate and Copy Token',
        '   Click "Generate Access Token"',
        '   Copy the token immediately',
        '   ⚠️ Token expires - extend it in App settings',
        '',
        '9️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'IGQWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'IGQWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accountId: {
      title: 'Instagram Business Account ID – Step-by-Step',
      url: 'https://developers.facebook.com/tools/explorer',
      steps: [
        '1️⃣ Go to Graph API Explorer',
        '   Go to 👉 https://developers.facebook.com/tools/explorer',
        '   Make sure you have an access token',
        '',
        '2️⃣ Get Your Facebook Page ID',
        '   Query: GET /me/accounts',
        '   Find your connected Facebook Page',
        '   Copy the "id" (this is your Page ID)',
        '',
        '3️⃣ Get Instagram Business Account',
        '   Query: GET /{page-id}?fields=instagram_business_account',
        '   Replace {page-id} with your Page ID from step 2',
        '',
        '4️⃣ Copy Instagram Account ID',
        '   In the response, find:',
        '   "instagram_business_account": {',
        '     "id": "17841405309211844"',
        '   }',
        '   Copy the "id" value',
        '',
        '5️⃣ Use the Account ID',
        '   Paste it into the Account ID field above',
        '   It\'s a long numeric string',
        '',
        'Example:',
        '17841405309211844'
      ],
      example: '17841405309211844'
    }
  },
  linkedin: {
    accessToken: {
      title: 'LinkedIn Access Token – Step-by-Step',
      url: 'https://www.linkedin.com/developers',
      steps: [
        '1️⃣ Open LinkedIn Developers',
        '   Go to 👉 https://www.linkedin.com/developers',
        '   Sign in with your LinkedIn account',
        '',
        '2️⃣ Create or Select App',
        '   Click "Create app" or select existing',
        '   Fill in app details',
        '   Accept terms and create',
        '',
        '3️⃣ Get Client ID and Secret',
        '   Go to "Auth" tab',
        '   Copy "Client ID" and "Client Secret"',
        '   You\'ll need these for OAuth',
        '',
        '4️⃣ Set Redirect URL',
        '   In "Auth" tab, add redirect URL',
        '   Example: https://your-domain.com/callback',
        '   Or use: http://localhost:3000/callback for testing',
        '',
        '5️⃣ Request Permissions',
        '   Request these permissions:',
        '   • w_member_social (for posting)',
        '   • r_liteprofile (for profile access)',
        '   • r_basicprofile (for basic info)',
        '',
        '6️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use LinkedIn OAuth Playground:',
        '   developers.linkedin.com/oauthplayground',
        '',
        '7️⃣ Copy Access Token',
        '   After OAuth flow completes',
        '   Copy the access token',
        '   ⚠️ Token expires - refresh when needed',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    organizationId: {
      title: 'LinkedIn Organization ID (URN) – Step-by-Step',
      steps: [
        '1️⃣ Go to Your Company Page',
        '   Navigate to your LinkedIn Company Page',
        '   Make sure you\'re an admin',
        '',
        '2️⃣ Method 1: View Page Source',
        '   Right-click on page → "View Page Source"',
        '   Press Ctrl+F (or Cmd+F)',
        '   Search for "organization"',
        '   Find URN like "urn:li:organization:123456"',
        '   Copy the full URN',
        '',
        '3️⃣ Method 2: Use Graph API',
        '   Go to Graph API Explorer',
        '   Query: GET /organizationAcls',
        '   Response will show organization URNs',
        '   Format: urn:li:organization:123456',
        '',
        '4️⃣ Method 3: From Page URL',
        '   Some pages show ID in URL',
        '   Check the page URL structure',
        '',
        '5️⃣ Use the Organization ID',
        '   Paste the full URN into the field above',
        '   Format: urn:li:organization:123456',
        '   Include the "urn:li:organization:" prefix',
        '',
        'Example:',
        'urn:li:organization:123456'
      ],
      example: 'urn:li:organization:123456'
    }
  },
  twilio: {
    accountSid: {
      title: 'Twilio Account SID – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in or create an account',
        '',
        '2️⃣ View Dashboard',
        '   After signing in, you\'ll see the dashboard',
        '   Your Account SID is displayed prominently',
        '',
        '3️⃣ Copy Account SID',
        '   Find "Account SID" on the dashboard',
        '   It starts with "AC"',
        '   Click to copy or select and copy',
        '',
        '4️⃣ Use the Account SID',
        '   Paste it into the Account SID field above',
        '   You\'ll also need Auth Token',
        '',
        'Example:',
        'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    authToken: {
      title: 'Twilio Auth Token – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Dashboard',
        '   Your Auth Token is shown on dashboard',
        '   It may be hidden - click "show" to reveal',
        '',
        '3️⃣ Copy Auth Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '   If lost, you\'ll need to regenerate',
        '',
        '4️⃣ Regenerate if Needed',
        '   If you lost the token:',
        '   Go to Settings → Auth Tokens',
        '   Click "Create" to generate new token',
        '   Old token will be invalidated',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Auth Token field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    from: {
      title: 'Twilio Phone Number – Step-by-Step',
      url: 'https://console.twilio.com',
      steps: [
        '1️⃣ Open Twilio Console',
        '   Go to 👉 https://console.twilio.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Phone Numbers',
        '   Click "Phone Numbers" in left sidebar',
        '   Or go to: console.twilio.com/us1/develop/phone-numbers/manage/incoming',
        '',
        '3️⃣ View Your Numbers',
        '   You\'ll see your purchased phone numbers',
        '   If you don\'t have one, click "Buy a number"',
        '',
        '4️⃣ Copy Phone Number',
        '   Copy the phone number',
        '   Format: +1234567890 (with country code)',
        '   Include the + sign',
        '',
        '5️⃣ Use the Number',
        '   Paste it into the From Number field above',
        '   Must be in E.164 format',
        '   Example: +1234567890',
        '',
        'Example:',
        '+1234567890'
      ],
      example: '+1234567890'
    }
  },
  stripe: {
    apiKey: {
      title: 'Stripe API Key – Step-by-Step',
      url: 'https://dashboard.stripe.com',
      steps: [
        '1️⃣ Open Stripe Dashboard',
        '   Go to 👉 https://dashboard.stripe.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click "Developers" in top menu',
        '   Click "API keys" in left sidebar',
        '   Or go to: dashboard.stripe.com/apikeys',
        '',
        '3️⃣ Choose Test or Live Mode',
        '   Toggle "Test mode" or "Live mode"',
        '   Test keys start with "sk_test_"',
        '   Live keys start with "sk_live_"',
        '',
        '4️⃣ Copy Secret Key',
        '   Find "Secret key" section',
        '   Click "Reveal test key" or "Reveal live key"',
        '   Copy the secret key',
        '   ⚠️ Never share the secret key publicly',
        '',
        '5️⃣ For Publishable Key',
        '   "Publishable key" is for client-side',
        '   Starts with "pk_test_" or "pk_live_"',
        '   Use secret key for server-side workflows',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example (Test):',
        '[YOUR_STRIPE_TEST_KEY] - Format: sk_test_...',
        '',
        'Example (Live):',
        '[YOUR_STRIPE_LIVE_KEY] - Format: sk_live_...'
      ],
      example: '[YOUR_STRIPE_TEST_KEY]'
    }
  },
  postgresql_legacy_select_ui_unused: {
    host: {
      title: 'PostgreSQL Host – Step-by-Step',
      steps: [
        '1️⃣ For Local PostgreSQL',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 5432 (default)',
        '',
        '2️⃣ For Cloud PostgreSQL',
        '   For AWS RDS:',
        '   • Format: your-db.region.rds.amazonaws.com',
        '   • Find in RDS Console → Connectivity',
        '',
        '3️⃣ For Heroku Postgres',
        '   Go to Heroku Dashboard',
        '   Click on your Postgres add-on',
        '   Find "Host" in connection settings',
        '',
        '4️⃣ For Other Providers',
        '   Check your provider\'s documentation',
        '   Usually in connection string or settings',
        '   Format: hostname or IP address',
        '',
        '5️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include port number here',
        '',
        'Examples:',
        'localhost',
        'db.example.com',
        'my-db.region.rds.amazonaws.com'
      ],
      example: 'localhost'
    },
    database: {
      title: 'PostgreSQL Database Name – Step-by-Step',
      steps: [
        '1️⃣ For New Database',
        '   Connect to PostgreSQL',
        '   Run: CREATE DATABASE mydb;',
        '   Use the name you created',
        '',
        '2️⃣ For Existing Database',
        '   Check with your database administrator',
        '   Or list databases: \\l in psql',
        '',
        '3️⃣ Common Defaults',
        '   Default database: postgres',
        '   Or check your application config',
        '',
        '4️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '   Must be exact name (case-sensitive)',
        '',
        'Examples:',
        'mydb',
        'production',
        'app_database'
      ],
      example: 'mydb'
    },
    username: {
      title: 'PostgreSQL Username – Step-by-Step',
      steps: [
        '1️⃣ Default Superuser',
        '   Common default: postgres',
        '   Or the user you created',
        '',
        '2️⃣ Create New User',
        '   Connect as superuser',
        '   Run: CREATE USER myuser WITH PASSWORD \'mypassword\';',
        '',
        '3️⃣ Grant Permissions',
        '   Run: GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;',
        '',
        '4️⃣ Get Username',
        '   Check with your database administrator',
        '   Or check application configuration',
        '',
        '5️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Examples:',
        'postgres',
        'myuser',
        'app_user'
      ],
      example: 'postgres'
    },
    password: {
      title: 'PostgreSQL Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your PostgreSQL user',
        '   Check with your database administrator',
        '   Or use the password you set when creating user',
        '',
        '2️⃣ Reset Password',
        '   If you forgot:',
        '   Connect as superuser',
        '   Run: ALTER USER username WITH PASSWORD \'newpassword\';',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        '4️⃣ Test Connection',
        '   Verify credentials work',
        '   Check firewall rules if connection fails',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    port: {
      title: 'PostgreSQL Port – Step-by-Step',
      steps: [
        '• Default: Use 5432. It is correct in most cases.',
        '',
        '• If connection fails: Check your hosting dashboard or ask your provider for the correct port.',
        '',
        '• Enter only the number (e.g. 5432). Do not use MySQL port (3306) or other ports by mistake.',
        '',
        'Example:',
        '5432'
      ],
      example: '5432'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters, Limit, Order By, Ascending. Use when you only need to read rows from a single table with simple conditions.',
        '',
        '• Raw SQL – You provide the full SQL Query (SELECT, INSERT, UPDATE, DELETE, or complex queries). Use for JOINs, subqueries, or write operations.',
        '',
        'Pick the one that matches what you need; the rest of the fields depend on this choice.'
      ],
      example: 'Select'
    },
    table: {
      title: 'PostgreSQL Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database admin tool',
        '   (e.g. pgAdmin, DBeaver, or your hosting SQL editor)',
        '',
        '2️⃣ View the tables in your database',
        '   Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '   Names are case-sensitive in PostgreSQL',
        '',
        'Used only for Select operation. Ignored for Raw SQL.',
        '',
        'Example:',
        'users'
      ],
      example: 'my_table'
    },
    query: {
      title: 'How to get SQL Query?',
      steps: [
        'You write it or get it from a developer.',
        '',
        '• Read: SELECT * FROM table_name WHERE column = \'value\' LIMIT 10;',
        '',
        '• Insert: INSERT INTO table_name (col1, col2) VALUES (\'a\', \'b\');',
        '',
        '• Update: UPDATE table_name SET col1 = \'value\' WHERE id = 1;',
        '',
        '• Delete: DELETE FROM table_name WHERE id = 1;',
        '',
        'For complex queries (JOINs, subqueries), write or paste the full SQL. Used only for Raw SQL. Be careful with INSERT/UPDATE/DELETE—they change data.'
      ],
      example: 'SELECT * FROM table WHERE id = 1'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use Raw SQL.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select (and sometimes for Raw SQL if the platform applies it). Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    },
    orderBy: {
      title: 'How to get Order By?',
      steps: [
        'You type a column name from your table (e.g. created_at, id, name).',
        '',
        '• Leave empty if you don’t care about order.',
        '',
        '• Used with Ascending to control sort direction.',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'created_at'
      ],
      example: 'created_at'
    },
    ascending: {
      title: 'How to get Ascending?',
      steps: [
        'You set the toggle in this node: true or false.',
        '',
        '• true – Ascending (e.g. oldest first for dates, A–Z for text).',
        '',
        '• false – Descending (e.g. newest first, Z–A).',
        '',
        'Only applies when Order By is set. Used only for Select operation.'
      ],
      example: 'true'
    }
  },
  mysql_legacy_select_ui_unused: {
    host: {
      title: 'MySQL Host – Step-by-Step',
      steps: [
        '1️⃣ For Local MySQL',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 3306 (default)',
        '',
        '2️⃣ For Cloud MySQL',
        '   For AWS RDS:',
        '   • Format: your-db.region.rds.amazonaws.com',
        '   • Find in RDS Console → Connectivity',
        '',
        '3️⃣ For Other Providers',
        '   Check your provider\'s documentation',
        '   Usually in connection string or settings',
        '',
        '4️⃣ Use the Host',
        '   Paste it into the Host field above',
        '',
        'Examples:',
        'localhost',
        'db.example.com',
        'my-db.region.rds.amazonaws.com'
      ],
      example: 'localhost'
    },
    database: {
      title: 'MySQL Database Name – Step-by-Step',
      steps: [
        '1️⃣ For New Database',
        '   Connect to MySQL',
        '   Run: CREATE DATABASE mydb;',
        '',
        '2️⃣ For Existing Database',
        '   Check with your database administrator',
        '   Or list databases: SHOW DATABASES;',
        '',
        '3️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '',
        'Examples:',
        'mydb',
        'production',
        'app_database'
      ],
      example: 'mydb'
    },
    username: {
      title: 'MySQL Username – Step-by-Step',
      steps: [
        '1️⃣ Default Root User',
        '   Common default: root',
        '   Or the user you created',
        '',
        '2️⃣ Create New User',
        '   Connect as root',
        '   Run: CREATE USER \'myuser\'@\'%\' IDENTIFIED BY \'mypassword\';',
        '   Run: GRANT ALL ON mydb.* TO \'myuser\'@\'%\';',
        '',
        '3️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Examples:',
        'root',
        'myuser',
        'app_user'
      ],
      example: 'root'
    },
    password: {
      title: 'MySQL Password – Step-by-Step',
      steps: [
        '1️⃣ Get Password',
        '   Use the password for your MySQL user',
        '   Check with your database administrator',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    port: {
      title: 'MySQL Port – Step-by-Step',
      steps: [
        '• Default: Use 3306. It is correct in most cases.',
        '',
        '• If connection fails: Check your hosting dashboard or ask your provider for the correct port.',
        '',
        '• Enter only the number (e.g. 3306). Do not use PostgreSQL port (5432) or other ports by mistake.',
        '',
        'Example:',
        '3306'
      ],
      example: '3306'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Select – Simple read from one table. You fill Table Name and optionally Filters and Limit.',
        '',
        'This MySQL node currently supports Select only. For Insert/Update/Delete or custom SQL, use a Raw SQL-capable node.',
      ],
      example: 'Select'
    },
    table: {
      title: 'MySQL Table Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database admin tool',
        '   (e.g. phpMyAdmin, MySQL Workbench, or your hosting SQL editor)',
        '',
        '2️⃣ View the tables in your database',
        '   Copy the exact table name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Table Name field above',
        '',
        'Used only for Select operation.',
        '',
        'Example:',
        'customers'
      ],
      example: 'my_table'
    },
    filters: {
      title: 'How to get Filters (JSON)?',
      steps: [
        'You build the JSON from the columns and values you want to filter on.',
        '',
        '• Format: {"column_name": "value"}',
        '  Use exact column names from your table.',
        '',
        '• Multiple conditions: {"status": "active", "role": "user"}',
        '  Both must match (AND).',
        '',
        '• Numbers: {"id": 1} or {"count": 100}',
        '',
        'Used only for Select. For complex conditions (e.g. OR, greater than), use a Raw SQL-capable node.',
        '',
        'Example:',
        '{"status": "active"}'
      ],
      example: '{"column": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many rows you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or to avoid large result sets.',
        '',
        'Used for Select operation. Prevents accidentally returning too much data.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    }
  },
  mongodb: {
    connectionString: {
      title: 'MongoDB Connection String – Step-by-Step',
      steps: [
        '1️⃣ For MongoDB Atlas (Cloud)',
        '   Go to 👉 https://cloud.mongodb.com',
        '   Sign in to your account',
        '   Click "Connect" on your cluster',
        '   Choose "Connect your application"',
        '   Copy the connection string',
        '',
        '2️⃣ For Local MongoDB',
        '   Format: mongodb://localhost:27017/mydb',
        '   Or: mongodb://username:password@localhost:27017/mydb',
        '',
        '3️⃣ Connection String Format',
        '   mongodb://[username:password@]host[:port][/database]',
        '   Include username/password if authentication required',
        '',
        '4️⃣ Use the Connection String',
        '   Paste it into the Connection String field above',
        '   Replace <password> with actual password',
        '',
        '5️⃣ Test Connection',
        '   Verify the connection string works',
        '   Check firewall rules if connection fails',
        '',
        'Example (Atlas):',
        'mongodb+srv://username:password@cluster.mongodb.net/mydb',
        '',
        'Example (Local):',
        'mongodb://localhost:27017/mydb'
      ],
      example: 'mongodb+srv://username:password@cluster.mongodb.net/mydb'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Find Documents – Query documents from a collection using filters.',
        '',
        'This MongoDB node supports Find only. For insert/update/delete/aggregate, use a write-capable or raw-query MongoDB node if available.',
      ],
      example: 'Find'
    },
    collection: {
      title: 'MongoDB Collection Name – Step-by-Step',
      steps: [
        '1️⃣ Open your database dashboard or MongoDB Compass',
        '',
        '2️⃣ Browse the database and view Collections',
        '   Copy the exact collection name',
        '   e.g. users, orders, events',
        '',
        '3️⃣ Paste into the Collection Name field above',
        '',
        'Example:',
        'users'
      ],
      example: 'my_collection'
    },
    query: {
      title: 'How to get Query (JSON)?',
      steps: [
        'You build the JSON filter to match the documents you want.',
        '',
        '• Exact match: {"status": "Active"}',
        '',
        '• Greater than: {"age": {"$gt": 18}}',
        '',
        '• Regex: {"name": {"$regex": "^John"}}',
        '',
        'Paste the JSON into the Query field.',
        '',
        'Example:',
        '{"status": "Active"}'
      ],
      example: '{"field": "value"}'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'You enter a number—how many documents you want at most.',
        '',
        '• Default is often 100.',
        '',
        '• Use a smaller value (e.g. 10 or 20) for previews or large collections.',
        '',
        'Used for Find operation.',
        '',
        'Example:',
        '100'
      ],
      example: '100'
    }
  },
  redis_legacy_unused: {
    host: {
      title: 'Redis Host – Step-by-Step',
      steps: [
        '1️⃣ For Local Redis',
        '   If running locally:',
        '   • Host: localhost or 127.0.0.1',
        '   • Port: 6379 (default)',
        '',
        '2️⃣ For Redis Cloud',
        '   Go to Redis Cloud dashboard',
        '   Find your database endpoint',
        '   Format: hostname:port',
        '',
        '3️⃣ For AWS ElastiCache',
        '   Go to ElastiCache Console',
        '   Find your Redis cluster endpoint',
        '   Copy the hostname',
        '',
        '4️⃣ Use the Host',
        '   Paste it into the Host field above',
        '',
        'Examples:',
        'localhost',
        'redis.example.com',
        'my-redis.abc123.cache.amazonaws.com'
      ],
      example: 'localhost'
    },
    password: {
      title: 'Redis Password – Step-by-Step',
      steps: [
        '1️⃣ For Redis with Auth',
        '   If Redis requires authentication',
        '   Get password from Redis config',
        '   Or from your Redis provider',
        '',
        '2️⃣ For Redis Cloud',
        '   Password is shown in dashboard',
        '   Or set when creating database',
        '',
        '3️⃣ For Local Redis',
        '   Check redis.conf file',
        '   Look for: requirepass yourpassword',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Leave empty if no authentication',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourRedisPassword123!'
    }
  },
  telegram: {
    chatId: {
      title: 'Telegram Chat ID',
      steps: [
        'Use {{$json.chatId}} from Telegram Trigger when replying to the same chat.',
        'For a personal chat, the user must start the bot first; then use Telegram Trigger, @userinfobot, or getUpdates to see the numeric chat ID.',
        'For a group or channel, add the bot first. Channels and supergroups often use negative IDs that start with -100.',
        'Do not use a phone number, @username, invite link, or channel URL here.'
      ],
      example: '{{$json.chatId}}'
    },
    operation: {
      title: 'Telegram Operation',
      steps: [
        'Send Message posts text and needs Chat ID plus Message.',
        'Send Photo posts an image URL and needs Chat ID plus Media URL; Caption is optional.',
        'Edit Message updates a previous bot message and needs Chat ID, Message ID, and new Message text.',
        'Use {{$json.operation}} only when an earlier step intentionally chooses one of the supported values.'
      ],
      example: 'send_message'
    },
    messageType: {
      title: 'Telegram Message Type',
      steps: [
        'Text uses Message and sendMessage.',
        'Photo, Video, Document, Audio, and Animation use Media URL and can include Caption.',
        'Use Photo for charts or screenshots, Document for PDFs, Audio for sound files, and Animation for GIF-style updates.',
        'Media URL must be public and directly fetchable by Telegram.'
      ],
      example: 'text'
    },
    message: {
      title: 'Telegram Message Text',
      steps: [
        'Write the text people should read in Telegram.',
        'Required for Send Message and Edit Message.',
        'Map AI or trigger output with {{$json.aiResponse}}, {{$json.response}}, {{$json.message}}, or {{$json.text}}.',
        'Use Parse Mode only when the text is formatted correctly for that mode.'
      ],
      example: 'Answer for ticket {{$json.ticketId}}: {{$json.aiResponse}}'
    },
    parseMode: {
      title: 'Telegram Parse Mode',
      steps: [
        'None sends plain text and is safest for customer-provided text.',
        'HTML supports simple tags such as b, i, code, pre, and links.',
        'Markdown uses Telegram legacy markdown.',
        'MarkdownV2 supports richer formatting but requires escaping special characters.'
      ],
      example: 'HTML'
    },
    disableWebPagePreview: {
      title: 'Disable Web Page Preview',
      steps: [
        'Turn on to hide Telegram preview cards for links.',
        'Use it for compact report links, status feeds, or messages with several URLs.',
        'Leave off when the preview helps people understand the link before opening it.',
        'This does not hide the URL text itself.'
      ],
      example: 'true'
    },
    mediaUrl: {
      title: 'Telegram Media URL',
      steps: [
        'Required for photo, video, document, audio, and animation sends.',
        'Use a public HTTPS direct file URL from cloud storage, a CDN, or a previous export step.',
        'Map values such as {{$json.chartImageUrl}}, {{$json.reportUrl}}, or {{$json.file.downloadUrl}}.',
        'Avoid private dashboard pages, local paths, or URLs that expire before Telegram can fetch them.'
      ],
      example: '{{$json.chartImageUrl}}'
    },
    caption: {
      title: 'Telegram Caption',
      steps: [
        'Optional text shown under a media file.',
        'Use it for report date, owner, summary, customer, or next action.',
        'Caption formatting follows Parse Mode.',
        'Keep it short; send the full content as a document or link when needed.'
      ],
      example: 'Report for {{$json.reportDate}}: {{$json.summary}}'
    },
    replyToMessageId: {
      title: 'Reply To Message ID',
      steps: [
        'Use this when the new Telegram message should reply to an existing message.',
        'Map {{$json.messageId}}, {{$json.message_id}}, or {{$json.replyToMessageId}} from Telegram Trigger or an earlier Telegram output.',
        'Leave blank for a normal message.',
        'Do not use Chat ID here; this field identifies the specific message inside the chat.'
      ],
      example: '{{$json.messageId}}'
    },
    editMessageId: {
      title: 'Edit Message ID',
      steps: [
        'Required when Operation is Edit Message.',
        'Use {{$json.messageId}} from a previous Telegram Send Message output or a stored workflow record.',
        'Telegram usually lets a bot edit only its own messages.',
        'Pair it with Message text that should replace the old content.'
      ],
      example: '{{$json.messageId}}'
    },
    replyMarkup: {
      title: 'Telegram Reply Markup',
      steps: [
        'Optional JSON for inline buttons, reply keyboards, removing keyboards, or force reply.',
        'Use inline_keyboard for buttons under the message and keyboard for a custom reply keyboard.',
        'Keep valid JSON with double quotes and no trailing commas.',
        'Use callback_data or URLs that your downstream trigger or app can handle.'
      ],
      example: '{"inline_keyboard":[[{"text":"Approve","callback_data":"approve"}]]}'
    },
    disableNotification: {
      title: 'Disable Notification',
      steps: [
        'Turn on to send silently without a push sound.',
        'Use for routine digests, logs, or low-priority updates.',
        'Leave off for urgent alerts where someone must act quickly.'
      ],
      example: 'false'
    },
    protectContent: {
      title: 'Protect Content',
      steps: [
        'Turn on to ask Telegram to prevent forwarding or saving where supported.',
        'Use for confidential reports or internal-only media.',
        'This is not a substitute for sending only to the right chat.'
      ],
      example: 'false'
    },
    allowSendingWithoutReply: {
      title: 'Allow Sending Without Reply',
      steps: [
        'Turn on to send even if the replied-to message is missing or deleted.',
        'Use when the answer should still reach the chat without the reply link.',
        'Leave off when the workflow must fail unless it can attach to the original message.'
      ],
      example: 'true'
    }
  },
  notion: {
    apiKey: {
      title: 'Notion API Key (Internal Integration Token) – Step-by-Step',
      url: 'https://www.notion.so/my-integrations',
      steps: [
        '1️⃣ Open Notion Integrations',
        '   Go to 👉 https://www.notion.so/my-integrations',
        '   Sign in with your Notion account.',
        '',
        '2️⃣ Create a New Integration',
        '   Click "+ New integration".',
        '   Give it a clear name (e.g., "CtrlChecks Workflow Integration").',
        '   Select the correct workspace.',
        '',
        '3️⃣ Configure Capabilities',
        '   Enable the capabilities you need (typically "Read content" and "Update content").',
        '   Save the integration.',
        '',
        '4️⃣ Copy the Internal Integration Token',
        '   After creating the integration, Notion shows an "Internal Integration Token".',
        '   It starts with "secret_".',
        '   Click "Copy" and store it somewhere safe.',
        '   ⚠️ You can only see this token once—if you lose it, you must generate a new one.',
        '',
        '5️⃣ Share Pages/Databases With the Integration',
        '   For every page or database you want to access:',
        '   • Open the page or database in Notion.',
        '   • Click "Share" → "Add people, emails, or integrations".',
        '   • Search for your integration name and add it.',
        '   • Give it the correct permission (usually "Can edit").',
        '',
        '6️⃣ Use the Token as API Key',
        '   Paste the Internal Integration Token into the "Notion API Key" field in this node.',
        '   Never commit this key to git or share it publicly.',
        '',
        'Example:',
        'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    databaseId: {
      title: 'Notion Database ID – Step-by-Step',
      steps: [
        '1️⃣ Open the Database as a Full Page',
        '   In Notion, open the database (table, board, list, etc.) you want to use.',
        '   Click "Open as page" if it is inlined inside another page.',
        '',
        '2️⃣ Copy the Database Link',
        '   Click the "Share" button or the "•••" menu in the top‑right.',
        '   Click "Copy link".',
        '',
        '3️⃣ Identify the Database ID in the URL',
        '   Modern Notion URLs look like:',
        '   • https://workspace-name.notion.site/Database-Name-0123456789abcdef0123456789abcdef?pvs=4',
        '   • or https://www.notion.so/workspace/Database-Name-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • The Database ID is the last 32 characters of the URL (letters/numbers),',
        '     OR the 36‑character UUID with hyphens at the end before any ?query string.',
        '   • Example raw form: 0123456789abcdef0123456789abcdef',
        '   • Example UUID form: 01234567-89ab-cdef-0123-456789abcdef',
        '',
        '5️⃣ Paste Into Database ID Field',
        '   Paste either the 32‑character hex string (no hyphens) or the full UUID with hyphens into the "Database ID" input.',
        '   Make sure this database has been shared with your integration (see API Key steps).',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    pageId: {
      title: 'Notion Page ID – Step-by-Step',
      steps: [
        '1️⃣ Open the Target Page',
        '   In Notion, open the page you want this node to work with (for read/update/delete).',
        '',
        '2️⃣ Copy the Page Link',
        '   Click "Share" (top‑right) → "Copy link",',
        '   or copy the page URL directly from your browser.',
        '',
        '3️⃣ Identify the Page ID in the URL',
        '   Modern Notion page URLs look like:',
        '   • https://workspace-name.notion.site/Page-Title-0123456789abcdef0123456789abcdef?pvs=4',
        '   • or https://www.notion.so/workspace/Page-Title-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • The Page ID is the last 32 characters of the URL (letters/numbers),',
        '     OR the 36‑character UUID with hyphens at the end before any ?query string.',
        '   • Example raw form: 0123456789abcdef0123456789abcdef',
        '   • Example UUID form: 01234567-89ab-cdef-0123-456789abcdef',
        '',
        '5️⃣ Use the Page ID in the Node',
        '   Paste this value into the "Page ID" field.',
        '   This is required for operations like read_page, update_page, delete_page, and update_database_entry.',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    operation: {
      title: 'How to choose Notion Operation?',
      steps: [
        'You do not fetch this value from Notion; you select it from the Operation dropdown in this node.',
        '',
        'Use the operation value that matches the selected resource. The current visual values are get, list, create, update, archive, restore, query, appendChildren, listChildren, delete, getMe, and search.',
        '',
        'Common valid pairs:',
        '',
        '• page + get/create/update/archive/restore',
        '',
        '• database + get/list/query/create/update',
        '',
        '• block + get/listChildren/appendChildren/update/delete',
        '',
        '• user + get/list/getMe',
        '',
        '• comment + list/create. comment + get returns _error because this Notion API path cannot retrieve one comment by ID.',
        '',
        '• search + search',
        '',
        'Pick the pair first, then fill the IDs and JSON fields required for that pair.'
      ],
      example: 'database + query'
    },
    parentPageId: {
      title: 'Notion Parent Page ID – Step-by-Step',
      steps: [
        '1️⃣ Open the parent page where you want new pages or databases to be created.',
        '',
        '2️⃣ Click "Share" → "Copy link", or copy the URL from your browser.',
        '',
        '3️⃣ Find the Page ID in the URL',
        '   Example URLs:',
        '   • https://workspace-name.notion.site/Parent-Page-0123456789abcdef0123456789abcdef?pvs=4',
        '   • https://www.notion.so/workspace/Parent-Page-0123456789abcdef0123456789abcdef',
        '',
        '4️⃣ Extract the ID',
        '   • Copy the last 32 characters (letters/numbers) of the URL (ignoring hyphens),',
        '     OR copy the full 36‑character UUID with hyphens.',
        '',
        '5️⃣ Paste Into Parent Page ID Field',
        '   Use this value in the "Parent Page ID (for create)" field so new pages are created under this parent.',
        '',
        'Example:',
        '01234567-89ab-cdef-0123-456789abcdef'
      ],
      example: '01234567-89ab-cdef-0123-456789abcdef'
    },
    title: {
      title: 'How to get Page Title?',
      steps: [
        'You type the page title—the name of the page you want to create.',
        '',
        '• Static: Type it directly, e.g. "Weekly Report".',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.reportTitle}}".',
        '',
        'Required for Create Page.'
      ],
      example: 'Weekly Report'
    },
    content: {
      title: 'How to get Page Content (JSON)?',
      steps: [
        'For the visible Content field, type plain text. Runtime converts simple text into a paragraph block for page create or appendChildren when Children Blocks is blank.',
        '',
        'For the Children Blocks JSON field, use a Notion block array for page create/appendChildren.',
        '',
        '• You can build blocks from previous steps or templates.',
        '',
        'For block update, Children Blocks must be a block content object, not an array.'
      ],
      example: '[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]'
    },
    properties: {
      title: 'How to get Properties (JSON)?',
      steps: [
        'Properties are database fields and values for database entries.',
        '',
        '1️⃣ Open your database and note the property names',
        '',
        '2️⃣ Build a JSON object that matches those properties',
        '   Example:',
        '   {"Name":{"title":[{"text":{"content":"Task Name"}}]},"Status":{"select":{"name":"In Progress"}}}',
        '',
        'Required for page create inside a database and page update.'
      ],
      example: '{"Name":{"title":[{"text":{"content":"Task Name"}}]}}'
    },
    filter: {
      title: 'How to get Database Filter (JSON)?',
      steps: [
        'Filters limit results when querying a database.',
        '',
        'Example:',
        '{"property":"Status","select":{"equals":"Done"}}',
        '',
        'Use property names exactly as they appear in your database.',
        'Use Notion filter format from API docs.'
      ],
      example: '{"property":"Status","select":{"equals":"Done"}}'
    },
    sort: {
      title: 'How to get Sort (JSON)?',
      steps: [
        'Sort controls Notion search result ordering. Runtime reads the field key sort, not the old sorts key.',
        '',
        'Example:',
        '{"direction":"descending","timestamp":"last_edited_time"}',
        '',
        'Use Query Body JSON if you need database query sorts; this Sort field is for resource search.'
      ],
      example: '{"direction":"descending","timestamp":"last_edited_time"}'
    },
    pageSize: {
      title: 'How to get Page Size?',
      steps: [
        'Page Size is the maximum number of results for query_database.',
        '',
        'Enter a number between 1 and 100.',
        '',
        'Default is often 100.'
      ],
      example: '100'
    }
  },
  airtable: {
    apiKey: {
      title: 'Airtable API Key (Personal Access Token) – Step-by-Step',
      url: 'https://airtable.com/create/tokens',
      steps: [
        '1️⃣ Open Airtable Tokens',
        '   Go to 👉 https://airtable.com/create/tokens',
        '   Sign in with your Airtable account',
        '',
        '2️⃣ Create New Token',
        '   Click "Create new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Select Scopes',
        '   Choose required permissions:',
        '   • data.records:read (to read records)',
        '   • data.records:write (to create/update records)',
        '   • schema.bases:read (to read base structure)',
        '',
        '4️⃣ Select Bases',
        '   Choose which bases this token can access',
        '   Select specific bases or "All bases"',
        '',
        '5️⃣ Create Token',
        '   Click "Create token"',
        '   Copy the token immediately',
        '   Token starts with "pat"',
        '   ⚠️ You can only see it once!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Airtable API Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'patxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'patxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    baseId: {
      title: 'Airtable Base ID – Step-by-Step',
      url: 'https://airtable.com/api',
      steps: [
        '1️⃣ Open Airtable API Docs',
        '   Go to 👉 https://airtable.com/api',
        '   Sign in with your Airtable account',
        '',
        '2️⃣ Select Your Base',
        '   Choose the base you want to use',
        '   From the dropdown menu',
        '',
        '3️⃣ View API Documentation',
        '   You\'ll see the API documentation',
        '   The Base ID is shown at the top',
        '   Format: appxxxxxxxxxxxxxxxx',
        '',
        '4️⃣ Alternative: From Base URL',
        '   Open your base in Airtable',
        '   Look at the URL:',
        '   airtable.com/appBASE_ID/...',
        '   Copy the Base ID from URL',
        '',
        '5️⃣ Copy Base ID',
        '   Select and copy the Base ID',
        '   It starts with "app"',
        '   Usually 14-17 characters',
        '',
        '6️⃣ Use the Base ID',
        '   Paste it into the Base ID field above',
        '   Make sure your token has access',
        '',
        'Example:',
        'appxxxxxxxxxxxxxxxx'
      ],
      example: 'appxxxxxxxxxxxxxxxx'
    }
  },
  razorpay: {
    keyId: {
      title: 'Razorpay Key ID – Step-by-Step',
      url: 'https://dashboard.razorpay.com',
      steps: [
        '1️⃣ Open Razorpay Dashboard',
        '   Go to 👉 https://dashboard.razorpay.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Navigate to API Keys',
        '   Click "Settings" in left sidebar',
        '   Click "API Keys"',
        '   Or go to: dashboard.razorpay.com/app/keys',
        '',
        '3️⃣ View Your Keys',
        '   You\'ll see Key ID and Key Secret',
        '   Test keys start with "rzp_test_"',
        '   Live keys start with "rzp_live_"',
        '',
        '4️⃣ Copy Key ID',
        '   Find "Key ID"',
        '   Click to copy or select and copy',
        '   It\'s visible without revealing',
        '',
        '5️⃣ Toggle Test/Live Mode',
        '   Use test mode for development',
        '   Use live mode for production',
        '   Keys are different for each mode',
        '',
        '6️⃣ Use the Key ID',
        '   Paste it into the Key ID field above',
        '   You\'ll also need Key Secret',
        '',
        'Example (Test):',
        'rzp_test_xxxxxxxxxxxxxxxx',
        '',
        'Example (Live):',
        'rzp_live_xxxxxxxxxxxxxxxx'
      ],
      example: 'rzp_test_xxxxxxxxxxxxxxxx'
    },
    keySecret: {
      title: 'Razorpay Key Secret – Step-by-Step',
      url: 'https://dashboard.razorpay.com',
      steps: [
        '1️⃣ Open Razorpay Dashboard',
        '   Go to 👉 https://dashboard.razorpay.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Keys',
        '   Click "Settings" → "API Keys"',
        '   Or go to: dashboard.razorpay.com/app/keys',
        '',
        '3️⃣ Reveal Key Secret',
        '   Find "Key Secret"',
        '   Click "Reveal" button',
        '   The secret will be shown',
        '',
        '4️⃣ Copy Key Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Click "Copy" or select and copy',
        '   Keep it secure',
        '',
        '5️⃣ Regenerate if Needed',
        '   If you lost the secret:',
        '   Click "Regenerate"',
        '   Old secret will be invalidated',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Key Secret field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  paypal: {
    clientId: {
      title: 'PayPal Client ID – Step-by-Step',
      url: 'https://developer.paypal.com',
      steps: [
        '1️⃣ Open PayPal Developer Dashboard',
        '   Go to 👉 https://developer.paypal.com',
        '   Sign in or create an account',
        '',
        '2️⃣ Create or Select App',
        '   Click "My Apps & Credentials"',
        '   Click "Create App" or select existing',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '3️⃣ Choose Environment',
        '   Select "Sandbox" for testing',
        '   Or "Live" for production',
        '   You can create apps for both',
        '',
        '4️⃣ Copy Client ID',
        '   After creating app',
        '   You\'ll see "Client ID"',
        '   Click to copy or select and copy',
        '',
        '5️⃣ Use the Client ID',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'AeA1QIZXiflr1_-MoAz5x5vQM3bLxVx1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AeA1QIZXiflr1_-MoAz5x5vQM3bLxVx1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'PayPal Client Secret – Step-by-Step',
      url: 'https://developer.paypal.com',
      steps: [
        '1️⃣ Open PayPal Developer Dashboard',
        '   Go to 👉 https://developer.paypal.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to App Credentials',
        '   Click "My Apps & Credentials"',
        '   Select your app',
        '',
        '3️⃣ Reveal Client Secret',
        '   Find "Client Secret"',
        '   Click "Show" to reveal',
        '   The secret will be displayed',
        '',
        '4️⃣ Copy Client Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Click "Copy" or select and copy',
        '   Keep it secure',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never commit to version control',
        '   Use environment variables in production',
        '',
        'Example:',
        'ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  shopify: {
    shopDomain: {
      title: 'Shopify Shop Domain – Step-by-Step',
      url: 'https://admin.shopify.com',
      steps: [
        '1️⃣ Open Shopify Admin',
        '   Go to 👉 https://admin.shopify.com',
        '   Sign in to your Shopify store',
        '',
        '2️⃣ Method 1: From URL',
        '   Look at the URL in your browser',
        '   Format: admin.shopify.com/store/YOUR_SHOP',
        '   Or: YOUR_SHOP.myshopify.com/admin',
        '   Copy the shop name',
        '',
        '3️⃣ Method 2: From Settings',
        '   Click "Settings" in bottom left',
        '   Click "General"',
        '   Find "Store address"',
        '   Copy the domain (e.g., mystore.myshopify.com)',
        '',
        '4️⃣ Format the Domain',
        '   Use format: yourshop.myshopify.com',
        '   Do NOT include "https://"',
        '   Do NOT include "/admin"',
        '   Just the domain name',
        '',
        '5️⃣ Use the Shop Domain',
        '   Paste it into the Shop Domain field above',
        '   You\'ll also need Access Token',
        '',
        'Example:',
        'mystore.myshopify.com'
      ],
      example: 'mystore.myshopify.com'
    },
    accessToken: {
      title: 'Shopify Admin API Access Token – Step-by-Step',
      url: 'https://admin.shopify.com',
      steps: [
        '1️⃣ Open Shopify Admin',
        '   Go to 👉 https://admin.shopify.com',
        '   Sign in to your Shopify store',
        '',
        '2️⃣ Enable Developer Mode',
        '   Go to Settings → Apps and sales channels',
        '   Click "Develop apps" (enable if needed)',
        '',
        '3️⃣ Create New App',
        '   Click "Create an app"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create app"',
        '',
        '4️⃣ Configure Admin API Scopes',
        '   Click "Configure Admin API scopes"',
        '   Select required scopes:',
        '   • read_orders (to read orders)',
        '   • write_products (to create/update products)',
        '   • read_products (to read products)',
        '   • read_customers (to read customers)',
        '   • etc. (select as needed)',
        '   Click "Save"',
        '',
        '5️⃣ Install App',
        '   Go to "API credentials" tab',
        '   Click "Install app"',
        '   Confirm installation',
        '',
        '6️⃣ Reveal Admin API Access Token',
        '   In "API credentials" tab',
        '   Find "Admin API access token"',
        '   Click "Reveal token once" or "Reveal token"',
        '',
        '7️⃣ Copy Access Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Token starts with "shpat_"',
        '   Format: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        '   You may only see it once!',
        '',
        '8️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   Never share publicly',
        '   Use environment variables in production',
        '',
        'Example:',
        'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Product / Update Product – Requires Product ID.',
        '',
        '• List Products – Optional Limit.',
        '',
        '• Create Product – Use product data from your workflow.',
        '',
        '• Get Order – Requires Order ID.',
        '',
        '• List Orders – Optional Limit.',
        '',
        '• Create Order – Use order data from your workflow.',
        '',
        '• Get Customer – Requires Customer ID.',
        '',
        '• List Customers – Optional Limit.',
      ],
      example: 'Get Product'
    },
    productId: {
      title: 'Shopify Product ID – Step-by-Step',
      steps: [
        '1️⃣ Open the product in Shopify Admin',
        '',
        '2️⃣ Copy the numeric ID from the URL',
        '',
        '3️⃣ Paste it into the Product ID field',
        '',
        'Example:',
        '123456789'
      ],
      example: '123456789'
    },
    orderId: {
      title: 'Shopify Order ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Orders in Shopify Admin',
        '',
        '2️⃣ Open the order',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '987654321'
      ],
      example: '987654321'
    },
    customerId: {
      title: 'Shopify Customer ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Customers in Shopify Admin',
        '',
        '2️⃣ Open the customer record',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '555666777'
      ],
      example: '555666777'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Default is 250. Lower it for faster responses.',
        '',
        'Used for List Products, List Orders, and List Customers.'
      ],
      example: '250'
    }
  },
  // Google Services
  google_bigquery: {
    projectId: {
      title: 'Google Cloud Project ID – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Select or Create Project',
        '   Click project dropdown (top bar)',
        '   Select existing project or "New Project"',
        '',
        '3️⃣ Get Project ID',
        '   Project ID is shown in project dropdown',
        '   Or go to: IAM & Admin → Settings',
        '   Copy the "Project ID" (not Project Name)',
        '',
        '4️⃣ Use the Project ID',
        '   Paste it into the Project ID field above',
        '   Format: my-project-id-123456',
        '',
        'Example:',
        'my-project-id-123456'
      ],
      example: 'my-project-id-123456'
    },
    datasetId: {
      title: 'BigQuery Dataset ID – Step-by-Step',
      url: 'https://console.cloud.google.com/bigquery',
      steps: [
        'IMPORTANT: This field is reference-only. It is not sent to BigQuery and does not affect the query — the SQL Query field must fully qualify every table as `project.dataset.table` regardless of what you type here.',
        '',
        '1️⃣ Open BigQuery Console',
        '   Go to 👉 https://console.cloud.google.com/bigquery',
        '   Sign in with your Google account',
        '',
        '2️⃣ View Datasets',
        '   In left sidebar, expand your project',
        '   You\'ll see list of datasets',
        '',
        '3️⃣ Use it as your own note',
        '   Enter the dataset name here purely so you (or a teammate) can see at a glance which dataset this query targets',
        '',
        'Example:',
        'my_dataset'
      ],
      example: 'my_dataset'
    },
    query: {
      title: 'How to write SQL Query?',
      steps: [
        'The exact Standard SQL statement BigQuery will run — this is the only field that determines what data comes back.',
        '',
        'Always fully qualify tables as `project.dataset.table` with backticks; Dataset ID above is not applied automatically.',
        '',
        'Example: SELECT customer_id, SUM(order_total) AS lifetime_value FROM `my-project.sales_2026.orders` GROUP BY customer_id LIMIT 100',
        '',
        'Map dynamic values with expressions where your platform supports them, e.g. a WHERE clause built from {{input.startDate}}.'
      ],
      example: 'SELECT * FROM `project.dataset.table` LIMIT 10'
    },
    useLegacySql: {
      title: 'How to choose Use Legacy SQL?',
      steps: [
        'Leave off (false) for modern Standard SQL — this is correct for the vast majority of queries.',
        '',
        'Turn on only when reusing an older query written in BigQuery\'s legacy SQL dialect; Standard SQL syntax can fail to parse under legacy mode.'
      ],
      example: 'false'
    }
  },
  gmail_trigger: {
    pubsubTopic: {
      title: 'How to set Pub/Sub Topic?',
      steps: [
        'Open Google Cloud Console and go to Pub/Sub > Topics.',
        'Create or choose the topic that Gmail will publish mailbox notifications to.',
        'Copy the full topic path in the format projects/PROJECT_ID/topics/TOPIC_NAME.',
        'Grant Pub/Sub Publisher on the topic to gmail-api-push@system.gserviceaccount.com.',
        'Create a push subscription on this topic with the CtrlChecks webhook URL as the push endpoint.'
      ],
      example: 'projects/acme-support/topics/gmail-inbox-notifications'
    },
    eventTypes: {
      title: 'How to choose Event Types?',
      steps: [
        'message_added starts the workflow for new messages added to the watched mailbox.',
        'label_added starts it when Gmail adds a label to a message.',
        'label_removed starts it when Gmail removes a label from a message.',
        'message_deleted starts it for deleted messages, but deleted events may not include normal message metadata.',
        'Leave empty to use the runtime default: message_added.'
      ],
      example: 'message_added, label_added'
    },
    labelIds: {
      title: 'How to set Label IDs?',
      steps: [
        'Leave empty to accept messages from any label.',
        'Use built-in Gmail API label IDs such as INBOX, IMPORTANT, SENT, or TRASH.',
        'For custom labels, use the Gmail API label ID your admin or setup flow provides.',
        'Separate multiple labels with commas.',
        'Do not use a visible custom label name if Gmail returned a different API label ID.'
      ],
      example: 'INBOX, IMPORTANT'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave empty to accept every event matching Event Types and Label IDs.',
        'Enter a word or short phrase that must appear in the message subject, sender, or snippet.',
        'Matching is case-insensitive and happens after CtrlChecks fetches Gmail message metadata.',
        'This is not Gmail search syntax; operators like from:vendor or has:attachment are treated as plain text.'
      ],
      example: 'invoice'
    },
    validateAuth: {
      title: 'How to choose Validate Push Auth?',
      steps: [
        'Keep this enabled for production workflows.',
        'When enabled, CtrlChecks accepts a matching Validation Secret or a Google-signed OIDC bearer token.',
        'Disable only for temporary local testing where you control every request to the webhook.',
        'Do not turn this off to work around Pub/Sub setup issues; fix the push subscription authentication instead.'
      ],
      example: 'true'
    },
    audience: {
      title: 'How to set OIDC Audience?',
      steps: [
        'Leave empty if the Pub/Sub push subscription uses the webhook URL as its audience.',
        'Fill this only when your Google Cloud Pub/Sub subscription has a custom OIDC audience configured.',
        'Copy the exact audience value from the subscription push authentication settings.',
        'Do not enter the Pub/Sub topic name, subscription name, or Google Cloud project ID here.'
      ],
      example: 'https://app.ctrlchecks.com/api/gmail/webhook/workflow_123/gmail-trigger-1'
    },
    validationSecret: {
      title: 'How to set Validation Secret?',
      steps: [
        'Leave empty when using Google-signed OIDC authentication.',
        'Use this for controlled simulations or staging environments that cannot send OIDC tokens.',
        'Generate a long random value and pass it as token query parameter or x-goog-pubsub-token header in test pushes.',
        'Do not paste Google OAuth access tokens here; OAuth credentials belong in Connections.'
      ],
      example: 'staging-gmail-push-token-rotate-me'
    },
  },
  google_drive_trigger: {
    folderId: {
      title: 'How to find Folder ID?',
      steps: [
        'Open the target folder in Google Drive.',
        'Copy only the long ID after /folders/ in the browser URL.',
        'Leave this empty when the workflow should consider all Drive changes visible to the connected account.',
        'Do not paste the folder name, the full URL, or a file ID.'
      ],
      example: '1a2b3c4d5e6f7g8h9i0j'
    },
    eventTypes: {
      title: 'How to choose Event Types?',
      steps: [
        'file_changed starts the workflow for created, updated, or metadata-changed files.',
        'file_deleted starts the workflow for removed or trashed files.',
        'Use both for broad Drive monitoring, only file_changed for file-processing workflows, or only file_deleted for audit alerts.',
        'Existing changes before activation are skipped because CtrlChecks stores a fresh start page token.'
      ],
      example: 'file_changed, file_deleted'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave empty to accept every file that matches Event Types and Folder ID.',
        'Enter a word or short phrase that must appear in the Drive file name.',
        'Matching is case-insensitive and checks the file name only, not file contents.',
        'Use this for focused workflows such as invoice, contract, resume, or report.'
      ],
      example: 'invoice'
    },
  },
  google_calendar_trigger: {
    calendarId: {
      title: 'How to set Calendar ID?',
      steps: [
        'Use primary for the connected account main calendar.',
        'For a shared calendar, open Google Calendar settings, select the calendar, and copy Calendar ID from Integrate calendar.',
        'Calendar IDs often look like an email address or end in @group.calendar.google.com.',
        'Do not use the visible calendar name, event URL, or event ID.'
      ],
      example: 'primary'
    },
    eventTypes: {
      title: 'How to choose Event Types?',
      steps: [
        'event_changed starts the workflow when a Google event is created or updated.',
        'event_cancelled starts the workflow when Google marks an event as cancelled.',
        'Use both for all changes, only event_changed for meeting-prep flows, or only event_cancelled for cancellation follow-up.',
        'This trigger runs when the calendar record changes, not when the meeting start time arrives.'
      ],
      example: 'event_changed, event_cancelled'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave empty to accept every event that matches Event Types.',
        'Enter a word or short phrase that must appear in the event title or description.',
        'Matching is case-insensitive and happens after CtrlChecks fetches the changed event.',
        'Use this for focused workflows such as demo, interview, renewal, or incident.'
      ],
      example: 'renewal'
    },
  },
  google_calendar: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• List Events – Use when you want to retrieve events from a calendar. You need Calendar ID (default: primary).',
        '',
        '• Create Event – Use when you want to add a new event. You need Calendar ID, Event Title, Start Time, and End Time (and optionally Description).',
        '',
        '• Update Event – Use when you want to change an existing event. You need Calendar ID, Event ID, and the fields you want to change.',
        '',
        '• Delete Event – Use when you want to remove an event. You need Calendar ID and Event ID.'
      ]
    },
    calendarId: {
      title: 'Google Calendar ID – Step-by-Step',
      steps: [
        '1️⃣ For Primary Calendar',
        '   Use "primary" for your main calendar',
        '   This is the default calendar',
        '',
        '2️⃣ For Other Calendars',
        '   Go to Google Calendar (calendar.google.com)',
        '   On the left, under My calendars, find the calendar',
        '   Click the three dots (⋮) next to the calendar name',
        '   Click "Settings and sharing"',
        '   Scroll to "Integrate calendar"',
        '   Copy "Calendar ID"',
        '',
        '3️⃣ Calendar ID Format',
        '   Usually an email-like address (e.g. xxx@group.calendar.google.com)',
        '   Or a long alphanumeric string',
        '',
        '4️⃣ Use the Calendar ID',
        '   Paste it into the Calendar ID field above',
        '   Use "primary" for main calendar',
        '',
        'Example:',
        'primary'
      ],
      example: 'primary'
    },
    eventId: {
      title: 'Google Calendar Event ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Calendar',
        '   Go to 👉 https://calendar.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Open Event',
        '   Click on the event you want',
        '   Event details will open',
        '',
        '3️⃣ Get Event ID from URL',
        '   Look at the URL in your browser',
        '   Format: calendar.google.com/calendar/event?eid=EVENT_ID',
        '   The ID is after eid=',
        '',
        '4️⃣ Alternative: From a previous node',
        '   If you used List Events earlier, use the event id from the output, e.g. {{listNode.events[0].id}}',
        '',
        '5️⃣ Use the Event ID',
        '   Paste it into the Event ID field above',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    summary: {
      title: 'How to get Event Title?',
      steps: [
        'You type or set the title—it is not copied from an existing event unless you reference a previous step.',
        '',
        'Static title: Type it directly, e.g. "Team Standup".',
        '',
        'Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. "Call with {{input.clientName}}" or "Review: {{input.taskName}}".',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for List and Delete.'
      ],
      example: 'Meeting with Team'
    },
    startTime: {
      title: 'How to get Start Time (ISO 8601)?',
      steps: [
        'You provide the start time in the format the platform expects (usually ISO 8601).',
        '',
        'Format:',
        '   • UTC: YYYY-MM-DDTHH:mm:ssZ (e.g. 2024-01-15T14:00:00Z)',
        '   • With offset: YYYY-MM-DDTHH:mm:ss+00:00 or -05:00',
        '',
        'Dynamic time: If your platform supports expressions, use a value from a previous step (e.g. {{input.startTime}}) that resolves to a valid ISO 8601 string.',
        '',
        'Tip: Use UTC (Z) or explicit offsets to avoid time zone confusion. Required for Create and Update.'
      ],
      example: '2024-01-15T10:00:00Z'
    },
    endTime: {
      title: 'How to get End Time (ISO 8601)?',
      steps: [
        'You provide the end time in the same ISO 8601 format as Start Time.',
        '',
        'Format: YYYY-MM-DDTHH:mm:ssZ (UTC) or with offset (e.g. 2024-01-15T11:00:00-05:00).',
        '',
        'Rule: End time must be after start time. Use the same time zone (or UTC) as the start time.',
        '',
        'Dynamic time: If your platform supports expressions, use {{input.endTime}} or similar. Required for Create and Update.'
      ],
      example: '2024-01-15T11:00:00Z'
    },
    description: {
      title: 'How to get Description?',
      steps: [
        'You type or paste the description—it is not copied from an existing event unless you reference a previous step.',
        '',
        'Static: Type or paste into the Description field. Line breaks are usually kept.',
        '',
        'Dynamic: If your platform supports expressions, use content from earlier steps, e.g. "Agenda: {{input.agenda}}" or "Attendees: {{input.attendees}}".',
        '',
        'This field is only used when Operation = Create or Update. Leave empty if not needed.'
      ],
      example: 'Event description...'
    }
  },
  google_doc: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node—you do not get it from elsewhere.',
        '',
        '• Read – Use when you want to extract the plain text of an existing document. You must fill Document ID or Document Url.',
        '',
        '• Write (overwrite) – Use when you want to replace ALL existing content. You must fill Document Url and Content. This deletes what was there before.',
        '',
        '• Create – Use when you want to create a new document. You must fill Document Title (and usually Content). Document ID/Url are not used.',
        '',
        '• Append – Use when you want to add content after what is already there, without deleting anything. You must fill Document Url and Content.'
      ]
    },
    documentId: {
      title: 'Google Docs Document ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your Google Doc',
        '   Go to 👉 https://docs.google.com',
        '   Open the document you want to use',
        '',
        '2️⃣ Get Document ID from URL',
        '   Look at the URL in your browser',
        '   Format: docs.google.com/document/d/DOCUMENT_ID/edit',
        '   The ID is the long string between /d/ and /edit',
        '',
        '3️⃣ Copy the Document ID',
        '   Select and copy the ID from URL',
        '   It\'s usually 44 characters long',
        '',
        '4️⃣ Use the Document ID',
        '   Paste the full URL or just the ID into the Document ID or URL field',
        '   Make sure the document is shared with your Google account',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    title: {
      title: 'How to get Document Title?',
      steps: [
        'You choose or type the title—it is not copied from an existing document.',
        '',
        'Static title: Type it directly, e.g. "Meeting Notes – Jan 15".',
        '',
        'Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. "Report – {{input.date}}" or "Contract – {{input.clientName}}".',
        '',
        'This field is only used when Operation = Create. It is ignored for Read, Write, and Append.'
      ],
      example: 'My Document'
    },
    documentUrl: {
      title: 'How to get Document Url?',
      steps: [
        'Paste the full Google Docs URL from your browser — runtime extracts the document ID from it automatically.',
        '',
        'This is the only way to select a document for Write and Append in this panel — Document ID is only shown for Read.',
        '',
        'Not used for Create, which always makes a brand-new document.'
      ],
      example: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit'
    },
    format: {
      title: 'How to choose Output Format?',
      steps: [
        'Only used for Read. Choose text or markdown.',
        '',
        'Important: both options currently return the same plain text in {{$json.content}} — Markdown conversion is not implemented yet. This field only changes the {{$json.format}} label that is echoed back.'
      ],
      example: 'text'
    },
    content: {
      title: 'How to get Content?',
      steps: [
        'Option 1: Type or paste – Write or paste the text into the Content field. Use line breaks for new paragraphs.',
        '',
        'Option 2: From a previous node – If another step produced text (e.g. AI summary, report), reference it, e.g. {{aiNode.text}} or {{reportNode.content}}.',
        '',
        'Option 3: Template with placeholders – Mix fixed text and dynamic values, e.g. "Hello {{input.name}}, your request #{{input.id}} has been received."',
        '',
        'This field is used for Write and Append (required) and Create (optional). It is ignored for Read.'
      ],
      example: 'Document content...'
    }
  },
  google_drive: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• List Files – Use when you want to retrieve files, optionally scoped to a folder. Set Folder ID (or leave empty for the whole Drive). The node returns a files array.',
        '',
        '• Upload File – Use when you want to add a new file to Drive. You need File Name and File Data. Optionally Folder ID to choose the destination folder.',
        '',
        '• Download File – Use when you want to get the metadata and content of an existing file. You need File ID. The node returns dataBase64 for binary files or content for text/JSON files.',
        '',
        '• Delete File – This option appears in the dropdown but is NOT implemented by the runtime. Selecting it always fails with "Unsupported Google Drive operation: delete". Do not use it to remove files.'
      ],
      example: 'List Files'
    },
    folderId: {
      title: 'Google Drive Folder ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Drive',
        '   Go to 👉 https://drive.google.com',
        '   Open the folder you want to list files from (or where you want to upload)',
        '',
        '2️⃣ Get Folder ID from URL',
        '   Look at the URL in your browser',
        '   Format: drive.google.com/drive/folders/FOLDER_ID',
        '   The ID is the long string after /folders/',
        '',
        '3️⃣ Copy the Folder ID',
        '   Select and copy the entire ID—no slashes, no spaces',
        '',
        '4️⃣ Use the Folder ID',
        '   Paste it into the Folder ID field above',
        '   Leave empty to list files in the root of your Drive',
        '',
        'Example:',
        '1a2b3c4d5e6f7g8h9i0j'
      ],
      example: '1a2b3c4d5e6f7g8h9i0j'
    },
    fileId: {
      title: 'Google Drive File ID – Step-by-Step',
      steps: [
        '1️⃣ Open Your File in Google Drive',
        '   Go to 👉 https://drive.google.com',
        '   Open the file you want to use',
        '',
        '2️⃣ Get File ID from URL',
        '   Look at the URL in your browser',
        '   Format: drive.google.com/file/d/FILE_ID/view',
        '   The ID is between /d/ and /view',
        '',
        '3️⃣ Copy the File ID',
        '   Select and copy the ID from URL',
        '   It\'s a long alphanumeric string',
        '',
        '4️⃣ Use the File ID',
        '   Paste it into the File ID field above',
        '   Make sure the file is accessible',
        '',
        'Option: From a previous List Files node, use the id from the output, e.g. {{listNode.files[0].id}}',
        '',
        'Example:',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    fileName: {
      title: 'How to get File Name?',
      steps: [
        'You choose or type the file name—it is the name you want the file to have in Google Drive.',
        '',
        '• Static name: Type it directly, e.g. report.pdf, export.csv, backup.json',
        '',
        '• Dynamic name: If your platform supports expressions, use data from earlier steps, e.g. report_{{input.date}}.pdf or {{input.clientName}}_invoice.pdf',
        '',
        '• Always include the correct file extension (e.g. .pdf, .csv, .txt) so Drive and other apps recognize the file type.',
        '',
        'This field is only used when Operation = Upload. It is ignored for List, Download, and Delete.'
      ],
      example: 'report_2024-01-15.pdf'
    },
    fileData: {
      title: 'How to get File Data?',
      steps: [
        'File content must be Base64-encoded—you do not type it by hand.',
        '',
        '• From a previous node – Use output from a step that reads or generates a file (e.g. Read File, HTTP response). Reference it, e.g. {{readFileNode.content}} or {{httpNode.body}}.',
        '',
        '• From a workflow expression – If your platform can encode text or binary to Base64, use that function (see your platform’s docs).',
        '',
        '• For testing – Encode a small file with an online Base64 encoder or a script, then paste the result. Do not paste huge content by hand.',
        '',
        'Format: Base64 uses letters A–Z, a–z, digits 0–9, and +, /. It may end with = for padding. No spaces or line breaks inside the string unless your platform accepts wrapped Base64.',
        '',
        'This field is only used when Operation = Upload. It is ignored for List, Download, and Delete.'
      ],
      example: '{{$json.dataBase64}}'
    }
  },
  google_gmail: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Send Email – Use when this node should send an email. You will fill To, Subject, and Body.',
        '',
        '• List Messages – Use when this node should return a list of emails (e.g. from inbox). You can optionally set Search Query and Max Results.',
        '',
        '• Get Message – Use when this node should fetch one email by its ID. You must fill Message ID (from Gmail URL or from a previous List/Search node).',
        '',
        '• Search Messages – Use when this node should find emails matching a search. Fill Search Query (and optionally Max Results).'
      ]
    },
    recipientSource: {
      title: 'How to choose Recipient Source?',
      steps: [
        'Manual entry – type addresses directly into Recipient Emails below.',
        '',
        'Extract from sheet – use recipient rows already provided by an upstream node (typically a Google Sheets node before this Gmail node). If upstream has none, the optional Fallback Spreadsheet ID / Sheet Name / Range below are used as a backup.',
        '',
        'Upstream data always wins over the fallback fields when both could apply.'
      ],
      example: 'manual_entry'
    },
    recipientEmails: {
      title: 'How to set Recipient Emails?',
      steps: [
        'Recipient Emails is the To list for Send Email.',
        '',
        'Manual entry: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'From previous data: Use a value such as {{$json.email}} when an earlier step provides the recipient address.',
        '',
        'For sheet-driven sends, choose Extract from sheet in Recipient Source and leave this field empty.'
      ],
      example: 'alice@example.com, bob@example.com'
    },
    spreadsheetId: {
      title: 'How to set Fallback Spreadsheet ID?',
      steps: [
        'Only used when Recipient Source is Extract from sheet and no upstream node already supplied recipient rows.',
        '',
        'Copy the ID from the sheet\'s URL — the long string between /d/ and /edit.',
        '',
        'Leave empty when a Google Sheets node already runs right before this Gmail node.'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    sheetName: {
      title: 'How to set Fallback Sheet Name?',
      steps: [
        'The tab name inside the Fallback Spreadsheet ID above.',
        '',
        'Match it exactly to the tab label shown at the bottom of Google Sheets.',
        '',
        'Defaults to Sheet1 when left empty.'
      ],
      example: 'Sheet1'
    },
    range: {
      title: 'How to set Fallback Range?',
      steps: [
        'Optional A1-style range inside the fallback sheet tab, to skip header rows or unrelated columns.',
        '',
        'Example: A2:D500 skips row 1 and stops at row 500.',
        '',
        'Leave empty to read the entire tab.'
      ],
      example: 'A2:D500'
    },
    useAiRecipientMapping: {
      title: 'How to use Scan All Columns For Emails?',
      steps: [
        'Turn on when the fallback sheet\'s column headers are messy, inconsistent, or missing.',
        '',
        'When on, every cell in each row is scanned for anything that looks like an email address, not just columns literally named "email".'
      ],
      example: 'true'
    },
    to: {
      title: 'How to get To?',
      steps: [
        'To is the recipient’s email address—not something you copy from Gmail.',
        '',
        'Option 1: Type it – If the recipient is fixed (e.g. support@company.com), type that address in the To field.',
        '',
        'Option 2: From a form or trigger – If the workflow was started by a form or webhook, the submitter’s email is often in the trigger data. Use the expression your platform provides, e.g. {{trigger.email}} or {{input.email}}.',
        '',
        'Option 3: From a previous node – If an earlier step (e.g. CRM, database) returned a contact email, reference it, e.g. {{previousNode.email}}.',
        '',
        'Format: Must be a valid email (name@domain.com). No spaces.'
      ],
      example: 'recipient@example.com'
    },
    cc: {
      title: 'How to set CC?',
      steps: [
        'CC is optional and only used for Send Email.',
        '',
        'Use it for visible copied recipients. Enter one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'Leave it blank if no copied recipients are needed.'
      ],
      example: 'manager@example.com'
    },
    bcc: {
      title: 'How to set BCC?',
      steps: [
        'BCC is optional and only used for Send Email.',
        '',
        'Use it for hidden copied recipients. Enter one email address, or multiple addresses separated with commas, semicolons, or new lines.',
        '',
        'Leave it blank if no hidden recipients are needed.'
      ],
      example: 'archive@example.com'
    },
    from: {
      title: 'How to set From?',
      steps: [
        'From is optional and only used for Send Email.',
        '',
        'Leave it blank to send from the connected Google account.',
        '',
        'Only enter a sender address when it is a Gmail alias configured on that account. Gmail may reject unverified sender aliases.'
      ],
      example: 'orders@example.com'
    },
    subject: {
      title: 'How to get Subject?',
      steps: [
        'You write the subject—it is not copied from Gmail or another app.',
        '',
        'Static subject: Type it directly, e.g. "Daily report ready".',
        '',
        'Dynamic subject: If your platform supports expressions, you can insert data from earlier steps, e.g. "Order #{{input.orderId}} confirmed" or "Alert: {{input.alertType}}".',
        '',
        'Tip: Keep it short and clear so the email is less likely to be marked as spam.'
      ],
      example: 'Workflow Notification'
    },
    body: {
      title: 'How to get Body?',
      steps: [
        'Body is the main text (or HTML) of the email—the content inside the email, not the subject or recipient.',
        '',
        'Option 1: Type or paste – Write the message in the Body field, or paste from a document. Line breaks are kept in plain text.',
        '',
        'Option 2: From a previous node – If another step produced text (e.g. report, AI summary), reference it, e.g. {{reportNode.content}}.',
        '',
        'Option 3: Template with placeholders – Mix fixed text and dynamic values, e.g. "Hi {{input.name}}, your request #{{input.id}} has been received."',
        '',
        'This Gmail node currently sends text/plain messages. Do not rely on HTML rendering in this field.'
      ],
      example: 'Your workflow completed successfully.'
    },
    messageId: {
      title: 'Gmail Message ID – Step-by-Step',
      steps: [
        '1️⃣ Open Gmail',
        '   Go to 👉 https://mail.google.com',
        '   Open the email you want to use',
        '',
        '2️⃣ Get Message ID from URL',
        '   Look at the URL in your browser',
        '   Format: mail.google.com/mail/u/0/#inbox/MESSAGE_ID',
        '   The ID is after #inbox/',
        '',
        '3️⃣ Alternative: Use Gmail API',
        '   Query messages using Gmail API',
        '   Message ID is in the response',
        '',
        '4️⃣ Use the Message ID',
        '   Paste it into the Message ID field above',
        '',
        'Example:',
        '18c1234567890abcdef'
      ],
      example: '18c1234567890abcdef'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'This is not an email address or subject—it is a search string using Gmail’s search syntax.',
        '',
        'Where to learn: Open Gmail, use the search box at the top, and try queries there. The same text works in this Search Query field.',
        '',
        'Common operators (use exactly as shown):',
        '   • from:email@example.com – emails from this sender',
        '   • to:email@example.com – emails to this address',
        '   • subject:word – subject contains this word',
        '   • is:unread – only unread',
        '   • is:read – only read',
        '   • has:attachment – has an attachment',
        '   • label:LabelName – in this Gmail label',
        '   • newer_than:7d – from the last 7 days',
        '   • older_than:1m – older than 1 month',
        '',
        'Combining: Put a space between parts, e.g. from:support@company.com is:unread newer_than:3d',
        '',
        'Leave empty if you just want the latest messages with no filter.'
      ],
      example: 'from:example@gmail.com'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'You choose the number—it is not copied from Gmail or another field.',
        '',
        'What to use:',
        '   • 10–20 – Good for most cases (e.g. “last 10 emails”).',
        '   • 50–100 – Use only if you need more; may be slower or hit rate limits.',
        '',
        'This field only affects List and Search. It is ignored when Operation is Send Email or Get Message.'
      ],
      example: '10'
    }
  },
  google_sheets_trigger: {
    spreadsheetId: {
      title: 'How to find Spreadsheet ID?',
      steps: [
        'Open the Google Sheet in a browser.',
        'Copy only the long ID between /d/ and /edit in the URL.',
        'Do not use the full sharing URL, the tab gid, or the file name.',
        'The connected Google account needs access to this spreadsheet before activation can capture the baseline.'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    sheetName: {
      title: 'How to set Sheet Name?',
      steps: [
        'Use the exact tab name shown at the bottom of the spreadsheet.',
        'Leave empty only when the first/default sheet is the one you want to poll.',
        'Names are spelling-sensitive. Leads and leads may point to different tabs.',
        'Later nodes can read the tab with {{$json.sheetName}}.'
      ],
      example: 'Leads'
    },
    hasHeaderRow: {
      title: 'How does Has Header Row work?',
      steps: [
        'Keep it on when row 1 contains labels such as Name, Email, Status, or Priority.',
        'With headers on, downstream nodes can use {{$json.row.Email}}.',
        'Turn it off only when row 1 is real data.',
        'With headers off, use {{$json.values[0]}}, {{$json.values[1]}}, and similar array positions.'
      ],
      example: 'true'
    },
    eventTypes: {
      title: 'How to choose Event Types?',
      steps: [
        'row_added starts the workflow for rows added after activation.',
        'row_updated starts the workflow when a tracked row changes after the baseline exists.',
        'Use row_added for intake flows, and row_added, row_updated when edits should also start work.',
        'Rows that existed before activation are baseline rows; they do not fire as new rows.'
      ],
      example: 'row_added, row_updated'
    },
    query: {
      title: 'How to set Keyword Filter?',
      steps: [
        'Leave empty to accept every row that matches Event Types.',
        'Enter a word or short phrase that must appear somewhere in the row values.',
        'Matching is case-insensitive and checks the joined row text, not a formula.',
        'Use this to split one shared sheet into workflows such as urgent, refund, or enterprise.'
      ],
      example: 'urgent'
    },
  },
  google_sheets: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Read – pull existing rows out of the sheet. Only Spreadsheet ID is required.',
        '',
        'Write – replace cells in a range. Needs Sheet Name and Values or Data.',
        '',
        'Append – add new row(s) after the last row. Needs Sheet Name and Values or Data.',
        '',
        'Update – change specific existing cells. Needs Sheet Name, Range, and Values or Data.'
      ],
      example: 'read'
    },
    spreadsheetId: {
      title: 'How to find Spreadsheet ID?',
      steps: [
        'Open the target Google Sheet in a browser.',
        '',
        'Copy the long ID segment from the URL, between /d/ and /edit:',
        'https://docs.google.com/spreadsheets/d/THIS_PART/edit',
        '',
        'The ID stays the same even if the file is renamed.'
      ],
      example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
    },
    sheetName: {
      title: 'How to set Sheet Name?',
      steps: [
        'Match the tab label exactly as shown at the bottom of Google Sheets — it is case-sensitive.',
        '',
        'Optional for Read (leaves empty to use the first tab).',
        '',
        'Required for Write, Append, and Update.'
      ],
      example: 'Sheet1'
    },
    range: {
      title: 'How to set Range?',
      steps: [
        'Use A1 notation, optionally with the tab name: Sheet1!A1:D100.',
        '',
        'Optional for Read (empty reads all used cells) and Write/Append.',
        '',
        'Required for Update — it must point at the exact cells to change.'
      ],
      example: 'A1:D100'
    },
    outputFormat: {
      title: 'How to choose Output Format?',
      steps: [
        'json — returns rows/items as objects keyed by column header (default).',
        '',
        'keyvalue — same row objects, also exposed under keyValue.',
        '',
        'text — a plain tab-separated text block, useful for AI prompts.',
        '',
        'Only affects Read; ignored for Write/Append/Update.'
      ],
      example: 'json'
    },
    readDirection: {
      title: 'How to choose Read Direction?',
      steps: [
        'rows (default) — use for typical spreadsheets where each row is one record.',
        '',
        'columns — use only when the sheet stores each record as a column instead.',
        '',
        'Only affects Read.'
      ],
      example: 'rows'
    },
    values: {
      title: 'How to set Values?',
      steps: [
        'An array of arrays — each inner array is one row, each item is one cell.',
        '',
        'Also accepts an array of row objects or a single object; runtime converts them.',
        '',
        'Ignored if Data is also filled — Data is checked first.',
        '',
        'Required (together with, or instead of, Data) for Write, Append, and Update.'
      ],
      example: '[["Alice", "alice@example.com", "Active"]]'
    },
    data: {
      title: 'How to set Data?',
      steps: [
        'An alternative to Values — accepts an object, an array of objects, or an array of arrays.',
        '',
        'Checked before Values: if both are filled, Data wins.',
        '',
        'Object key order becomes column order, not the key names.'
      ],
      example: '{{$json}}'
    },
    allowWrite: {
      title: 'How does Allow Write Access work?',
      steps: [
        'This checkbox has no effect at runtime — Write, Append, and Update all run regardless of its value.',
        '',
        'It exists only as a visual team convention, not an enforced safety gate.',
        '',
        'Do not rely on it to block accidental writes.'
      ],
      example: 'false'
    },
  },
  // CRM Services
  hubspot: {
    authType: {
      title: 'How to choose Authentication Type?',
      steps: [
        'Choose how this node connects to HubSpot.',
        '',
        '• API Key: Older method. Only use if your account still allows it.',
        '• OAuth2 Access Token (Private App): Recommended and more secure.',
        '',
        'Tip: Use a Private App token for production workflows.'
      ],
      example: 'oauth'
    },
    apiKey: {
      title: 'HubSpot API Key (Legacy - Deprecated)',
      url: 'https://app.hubspot.com',
      steps: [
        'HubSpot has phased out legacy API keys - most accounts can no longer generate new ones.',
        'This field only exists as a fallback for older saved credentials created before the deprecation.',
        '',
        'For a new connection, use a Private App token (Access Token field) or OAuth2 instead - both are the modern, supported way to authenticate.',
        '',
        'If you already have a legacy API key from before the deprecation, paste it here only if Access Token is not available for your account.'
      ],
      example: '(legacy - not recommended for new connections)'
    },
    accessToken: {
      title: 'HubSpot OAuth2 Access Token – Step-by-Step',
      url: 'https://app.hubspot.com',
      steps: [
        '1️⃣ Open HubSpot Account',
        '   Go to 👉 https://app.hubspot.com',
        '   Sign in to your HubSpot account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" icon (gear)',
        '   Navigate to "Integrations"',
        '',
        '3️⃣ Create Private App',
        '   Click "Private Apps"',
        '   Click "Create a private app"',
        '   Give it a name and select scopes',
        '',
        '4️⃣ Generate Access Token',
        '   After creating app',
        '   Go to "Auth" tab',
        '   Copy the access token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      ],
      example: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    resource: {
      title: 'How to choose Resource (Object Type)?',
      steps: [
        'Resource tells HubSpot which CRM object you want to manage.',
        '',
        'Common choices:',
        '• Contact – People in your CRM',
        '• Company – Organizations',
        '• Deal – Sales opportunities',
        '• Ticket – Support tickets',
        '• Engagements – Calls, emails, meetings, notes, tasks',
        '',
        'Tip: Pick the object that matches the data you want to create or update.'
      ],
      example: 'contact'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines the action you want to perform on the selected object.',
        '',
        'Common operations:',
        '• Get – Fetch one record by ID',
        '• Get Many – Fetch multiple records',
        '• Create – Add a new record',
        '• Update – Modify an existing record',
        '• Delete – Remove a record',
        '• Search – Find records by query',
        '• Batch – Create/Update/Delete multiple records at once',
        '',
        'Tip: Use Search before Create to avoid duplicates.'
      ],
      example: 'create'
    },
    id: {
      title: 'How to get Resource ID?',
      steps: [
        'Resource ID is the unique ID of the HubSpot record.',
        '',
        'How to find it:',
        '• From a previous HubSpot node output (id field)',
        '• From a Search operation result',
        '• From the HubSpot record URL',
        '',
        'Tip: This field is required for Get, Update, and Delete.'
      ],
      example: '123456789'
    },
    properties: {
      title: 'How to set Properties (JSON)?',
      steps: [
        'Properties is a JSON object with HubSpot field names and values.',
        '',
        'Example (Contact):',
        '{ "email": "user@example.com", "firstname": "John", "lastname": "Doe" }',
        '',
        'Tips:',
        '• Use HubSpot internal field names (not labels)',
        '• Only include fields you want to create or update',
        '• For custom fields, use the custom property key',
        '',
        'This field is required for Create and Update.'
      ],
      example: '{"email":"user@example.com","firstname":"John","lastname":"Doe"}'
    },
    searchQuery: {
      title: 'How to write a Search Query?',
      steps: [
        'Search Query is used when Operation = Search.',
        '',
        'Format example:',
        '• email:test@example.com',
        '• firstname:John',
        '',
        'Tip: Start simple with one field and expand as needed.'
      ],
      example: 'email:test@example.com'
    },
    limit: {
      title: 'How to set Limit?',
      steps: [
        'Limit controls how many records are returned.',
        '',
        'Recommended values:',
        '• 10–50 for most workflows',
        '• 100+ only if you need large batches',
        '',
        'Tip: Use pagination with "After" when retrieving large datasets.'
      ],
      example: '10'
    },
    after: {
      title: 'What is After (Pagination)?',
      steps: [
        'After is a paging token used to fetch the next page of results.',
        '',
        'How to use it:',
        '• Run a Get Many or Search',
        '• Read the paging token from the output',
        '• Pass it into After to get the next page',
        '',
        'Leave empty for the first page.'
      ],
      example: 'paging_token'
    }
  },
  pipedrive: {
    apiToken: {
      title: 'Pipedrive API Token – Step-by-Step',
      url: 'https://app.pipedrive.com',
      steps: [
        '1️⃣ Open Pipedrive',
        '   Go to 👉 https://app.pipedrive.com',
        '   Sign in to your Pipedrive account',
        '',
        '2️⃣ Go to Personal Preferences',
        '   Click your profile icon (top right)',
        '   Click "Personal preferences"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" in left sidebar',
        '   Or go to: app.pipedrive.com/settings/api',
        '',
        '4️⃣ Generate API Token',
        '   Find "API Token" section',
        '   Click "Generate" if you don\'t have one',
        '   Copy the token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  freshdesk: {
    apiKey: {
      title: 'Freshdesk API Key – Step-by-Step',
      url: 'https://yourdomain.freshdesk.com',
      steps: [
        '1️⃣ Open Freshdesk',
        '   Go to your Freshdesk domain',
        '   Format: yourdomain.freshdesk.com',
        '   Sign in as admin',
        '',
        '2️⃣ Go to Profile Settings',
        '   Click your profile icon (top right)',
        '   Click "Profile settings"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" tab',
        '   Or go to: yourdomain.freshdesk.com/a/profile/api',
        '',
        '4️⃣ Generate API Key',
        '   Find "API Key" section',
        '   Click "Reset API key" if needed',
        '   Copy the API key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need your domain',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  intercom: {
    accessToken: {
      title: 'Intercom Access Token – Step-by-Step',
      url: 'https://app.intercom.com',
      steps: [
        '1️⃣ Open Intercom',
        '   Go to 👉 https://app.intercom.com',
        '   Sign in to your Intercom account',
        '',
        '2️⃣ Go to Developer Hub',
        '   Click "Settings" (gear icon)',
        '   Click "Developers" → "Developer hub"',
        '',
        '3️⃣ Create App',
        '   Click "New app"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select required scopes',
        '',
        '4️⃣ Generate Access Token',
        '   After creating app',
        '   Go to "Authentication" tab',
        '   Copy the Access Token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'dG9rOmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'dG9rOmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  mailchimp: {
    apiKey: {
      title: 'Mailchimp API Key – Step-by-Step',
      url: 'https://mailchimp.com/developer',
      steps: [
        '1️⃣ Open Mailchimp',
        '   Go to 👉 https://mailchimp.com',
        '   Sign in to your Mailchimp account',
        '',
        '2️⃣ Go to Account & Billing',
        '   Click your profile icon (top right)',
        '   Click "Account & Billing"',
        '',
        '3️⃣ Navigate to Extras',
        '   Click "Extras" → "API keys"',
        '   Or go to: mailchimp.com/developer/',
        '',
        '4️⃣ Create API Key',
        '   Click "Create A Key"',
        '   Give it a label (e.g., "Workflow Integration")',
        '   Copy the API key',
        '',
        '5️⃣ Get Server Prefix',
        '   API key format: xxxxx-us1',
        '   The part after dash (us1, us2, etc.) is server',
        '   You may need this for API calls',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1'
    }
  },
  activecampaign: {
    apiKey: {
      title: 'ActiveCampaign API Key – Step-by-Step',
      url: 'https://www.activecampaign.com',
      steps: [
        '1️⃣ Open ActiveCampaign',
        '   Go to 👉 https://www.activecampaign.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" in left sidebar',
        '   Click "Developer"',
        '',
        '3️⃣ View API Credentials',
        '   Find "API Access" section',
        '   Your API URL and API Key are shown',
        '',
        '4️⃣ Copy API Key',
        '   Click "Show" to reveal API Key',
        '   Copy the API key',
        '   Also note your API URL',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    apiUrl: {
      title: 'ActiveCampaign API URL – Step-by-Step',
      url: 'https://www.activecampaign.com',
      steps: [
        '1️⃣ Open ActiveCampaign',
        '   Go to 👉 https://www.activecampaign.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" → "Developer"',
        '',
        '3️⃣ Get API URL',
        '   In "API Access" section',
        '   Find "API URL"',
        '   Format: https://youraccount.api-us1.com',
        '',
        '4️⃣ Copy API URL',
        '   Copy the full URL',
        '   Include https://',
        '',
        '5️⃣ Use the API URL',
        '   Paste it into the API URL field above',
        '',
        'Example:',
        'https://youraccount.api-us1.com'
      ],
      example: 'https://youraccount.api-us1.com'
    }
  },
  // GitHub
  github: {
    _github_connection_info: {
      title: 'GitHub OAuth Connection – How It Works',
      url: '/settings/connections',
      steps: [
        '🔐 OAuth Authentication',
        '   GitHub nodes use OAuth authentication via Supabase.',
        '   No manual token entry required!',
        '',
        '1️⃣ Connect GitHub Account',
        '   Go to Settings → Connections',
        '   Click "Connect GitHub" button',
        '   Authorize CtrlChecks to access your GitHub account',
        '',
        '2️⃣ Automatic Token Management',
        '   Your GitHub OAuth token is securely stored',
        '   Token is automatically retrieved when workflows run',
        '   No need to copy/paste tokens manually',
        '',
        '3️⃣ Required Scopes',
        '   The OAuth connection requests these scopes:',
        '   • repo (repository access)',
        '   • user (user profile data)',
        '   • read:org (organization membership)',
        '',
        '4️⃣ Disconnect & Reconnect',
        '   To disconnect: Settings → Connections → Disconnect GitHub',
        '   To reconnect: Click "Connect GitHub" again',
        '',
        '✅ Once connected, you can use GitHub nodes in workflows!'
      ],
      example: 'Connected: @your-username'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Repository / List Repositories – Get repo details or list repos. Need Owner and Repository.',
        '',
        '• Create Issue / Update Issue / Close Issue / List Issues / Get Issue / Add Issue Comment – Manage issues. Need Owner, Repository; for update/close/get/comment, need Issue Number.',
        '',
        '• Create Pull Request / Update PR / Merge PR / List PRs / Get PR / Add PR Comment – Manage pull requests. Need Owner, Repository; for update/merge/get/comment, need Pull Request Number.',
        '',
        '• Create Branch / List Branches / Get Branch / Delete Branch – Manage branches. Need Owner, Repository; for create/get/delete, need Branch Name or SHA.',
        '',
        '• Create Commit / List Commits / Get Commit – Manage commits. Need Owner, Repository; for create, need Branch/Ref, File Path, File Content, Commit Message; for get, need Commit SHA.',
        '',
        '• Create Release / List Releases / Get Release – Manage releases. Need Owner, Repository; for create, need Tag Name; for get, need Release ID.',
        '',
        '• Get Workflow Runs / Trigger Workflow – Workflow runs. Need Owner, Repository, Workflow ID (filename in .github/workflows/), Branch/Ref.',
        '',
        '• List Contributors – List repo contributors. Need Owner and Repository.'
      ],
      example: 'Create Issue'
    },
    owner: {
      title: 'GitHub Owner/Organization – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository in the browser',
        '',
        '2️⃣ Look at the URL',
        '   Format: https://github.com/OWNER/repo-name',
        '   OWNER is the first part after github.com/',
        '',
        '3️⃣ Copy the owner name',
        '   It is the username or organization name (e.g. octocat, microsoft)',
        '   No slashes, no repository name',
        '',
        '4️⃣ Paste into the Owner/Organization field above',
        '',
        'Example: For github.com/octocat/Hello-World, Owner is octocat'
      ],
      example: 'octocat'
    },
    repo: {
      title: 'GitHub Repository Name – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository in the browser',
        '',
        '2️⃣ Look at the URL',
        '   Format: https://github.com/owner/REPO-NAME',
        '   REPO-NAME is the second part after the owner',
        '',
        '3️⃣ Copy the repository name',
        '   Do not include .git (use Hello-World, not Hello-World.git)',
        '',
        '4️⃣ Paste into the Repository field above',
        '',
        'Example: For github.com/octocat/Hello-World, Repository is Hello-World'
      ],
      example: 'Hello-World'
    },
    title: {
      title: 'How to get Title?',
      steps: [
        'You type or provide the title—it is the headline for the issue or pull request.',
        '',
        '• Static: Type it directly, e.g. "Bug in login page", "Add API documentation"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.subject}} or "Deploy: {{trigger.env}}"',
        '',
        'Required for Create Issue and Create Pull Request. Ignored for other operations.'
      ],
      example: 'Bug in login page'
    },
    body: {
      title: 'How to get Body?',
      steps: [
        'You type or provide the body—the description of the issue or pull request. Markdown supported.',
        '',
        '• Static: Type or paste directly. You can use Markdown (headers, lists, code blocks).',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Required for Create Issue and Create Pull Request. Ignored for other operations.'
      ],
      example: 'Issue/PR description'
    },
    workflowId: {
      title: 'GitHub Workflow ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Go to .github/workflows/ folder',
        '   Or click Actions → Workflows',
        '',
        '3️⃣ The Workflow ID is the filename',
        '   e.g. deploy.yml, ci.yml',
        '',
        '4️⃣ Copy the filename (including .yml or .yaml)',
        '',
        '5️⃣ Paste into the Workflow ID field above',
        '',
        'Example: deploy.yml'
      ],
      example: 'deploy.yml'
    },
    ref: {
      title: 'GitHub Branch/Ref – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the branch dropdown',
        '   It shows the current branch (e.g. main, master)',
        '',
        '3️⃣ Copy the branch name you want',
        '   e.g. main, develop, feature-branch',
        '',
        '4️⃣ Paste into the Branch/Ref field above',
        '',
        'Used for Trigger Workflow (which branch to run on), Create Commit (which branch to commit to), etc. Default is often main.',
        '',
        'Example: main'
      ],
      example: 'main'
    },
    issueNumber: {
      title: 'GitHub Issue Number – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the Issues tab',
        '',
        '3️⃣ Open the issue you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: github.com/owner/repo/issues/123',
        '   The number after /issues/ is the Issue Number',
        '',
        '5️⃣ Or look at the issue title',
        '   It shows #123 — the number is 123',
        '',
        '6️⃣ Enter only the number (e.g. 123), not #123',
        '',
        'Example: 123'
      ],
      example: '123'
    },
    prNumber: {
      title: 'GitHub Pull Request Number – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click the Pull requests tab',
        '',
        '3️⃣ Open the pull request you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: github.com/owner/repo/pull/456',
        '   The number after /pull/ is the PR Number',
        '',
        '5️⃣ Or look at the PR title',
        '   It shows #456 — the number is 456',
        '',
        '6️⃣ Enter only the number (e.g. 456), not #456',
        '',
        'Example: 456'
      ],
      example: '456'
    },
    state: {
      title: 'How to get State?',
      steps: [
        'You choose from the dropdown in this node: Open or Closed.',
        '',
        '• Open – Issue is open.',
        '• Closed – Issue is closed.',
        '',
        'Used for Update Issue (e.g. to close or reopen). Ignored for other operations.'
      ],
      example: 'open'
    },
    comment: {
      title: 'How to get Comment?',
      steps: [
        'You type or provide the comment—the text that will appear on the issue or pull request.',
        '',
        '• Static: Type or paste directly.',
        '',
        '• Dynamic: Use an expression, e.g. {{aiNode.summary}} or "Deployment completed at {{now}}"',
        '',
        'Required for Add Issue Comment and Add PR Comment. Ignored for other operations.'
      ],
      example: 'Your comment text'
    },
    mergeMethod: {
      title: 'How to get Merge Method?',
      steps: [
        'You choose from the dropdown in this node: Merge, Squash, or Rebase.',
        '',
        '• Merge – Creates a merge commit.',
        '• Squash – Combines all commits into one.',
        '• Rebase – Replays commits on top of the base branch.',
        '',
        'Used only for Merge Pull Request. Ignored for other operations.'
      ],
      example: 'merge'
    },
    branchName: {
      title: 'How to get Branch Name?',
      steps: [
        'You type the branch name—the name you want for the new branch, or the name of the branch to get/delete.',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression, e.g. {{input.branch}} or feature-{{trigger.id}}',
        '',
        'Used for Create Branch, Get Branch, Delete Branch. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    sha: {
      title: 'GitHub SHA/Commit Hash – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Commits (or the commit history)',
        '',
        '3️⃣ Click on a commit to open its details',
        '',
        '4️⃣ The SHA is the long hash at the top',
        '   40 characters (e.g. abc123def456789...)',
        '   You can also use the short SHA (first 7–12 characters)',
        '',
        '5️⃣ Copy and paste into the SHA/Commit Hash field above',
        '',
        'From command line: run "git log" and copy the commit hash.',
        '',
        'Example: abc123def456789...'
      ],
      example: 'abc123def456'
    },
    commitMessage: {
      title: 'How to get Commit Message?',
      steps: [
        'You type or provide the message—a short description of the change.',
        '',
        '• Static: Type it directly, e.g. "Updated documentation", "Fix login bug"',
        '',
        '• Dynamic: Use an expression, e.g. "Deploy {{trigger.env}}" or {{aiNode.summary}}',
        '',
        'Required for Create Commit. Ignored for other operations.'
      ],
      example: 'Updated documentation'
    },
    filePath: {
      title: 'GitHub File Path – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository and navigate to the file (or where you want to create it)',
        '',
        '2️⃣ Look at the URL or breadcrumb',
        '   The path after the branch name is the File Path',
        '   e.g. docs/readme.md, src/utils.js',
        '',
        '3️⃣ Or build it: folder(s) + filename',
        '   Use forward slashes (/). No leading slash.',
        '',
        '4️⃣ Paste into the File Path field above',
        '',
        'Example: docs/readme.md'
      ],
      example: 'docs/readme.md'
    },
    fileData: {
      title: 'How to get File Content?',
      steps: [
        'You provide the content—the exact text or bytes to write to the file.',
        '',
        '• From a previous step: Use output from another node (e.g. generated doc, report), e.g. {{aiNode.content}} or {{readFileNode.content}}.',
        '',
        '• Static: Type or paste text. For binary files, the platform may require base64; use a step that outputs base64 if needed.',
        '',
        'Required for Create Commit when creating/updating a file. Ignored for other operations.'
      ],
      example: 'File content (base64 or text)'
    },
    tagName: {
      title: 'How to get Tag Name?',
      steps: [
        'You type the tag name—the version or tag you want for the release.',
        '',
        '• Static: Type it directly, e.g. v1.0.0, v2.1.3',
        '',
        '• Dynamic: Use an expression, e.g. v{{input.version}} or release-{{trigger.env}}',
        '',
        'Required for Create Release. Ignored for other operations.'
      ],
      example: 'v1.0.0'
    },
    releaseName: {
      title: 'How to get Release Name?',
      steps: [
        'You type the release name—the human-readable title shown on the Releases page.',
        '',
        '• Static: Type it directly, e.g. "Release v1.0.0", "January 2024 Release"',
        '',
        '• Dynamic: Use an expression if your platform supports it.',
        '',
        'Used for Create Release. Ignored for other operations.'
      ],
      example: 'Release v1.0.0'
    },
    releaseBody: {
      title: 'How to get Release Body?',
      steps: [
        'You type or provide the release notes—the description shown on the release page. Markdown supported.',
        '',
        '• Static: Type or paste. You can use Markdown (headers, lists).',
        '',
        '• Dynamic: Use an expression, e.g. {{changelogNode.markdown}} or "Built from {{trigger.branch}}"',
        '',
        'Used for Create Release. Ignored for other operations.'
      ],
      example: 'Release notes and description'
    },
    releaseId: {
      title: 'GitHub Release ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Releases (right sidebar or repo → Releases)',
        '',
        '3️⃣ Click on a release to view details',
        '',
        '4️⃣ The Release ID is a numeric ID from the API',
        '   Use List Releases first; each release in the response has an "id" field',
        '   Or call GitHub API: GET /repos/owner/repo/releases and copy the "id" of the release you want',
        '',
        '5️⃣ Paste into the Release ID field above',
        '',
        'Example: 12345'
      ],
      example: '12345'
    },
    commitSha: {
      title: 'GitHub Commit SHA – Step-by-Step',
      steps: [
        '1️⃣ Open your GitHub repository',
        '',
        '2️⃣ Click Commits or go to a specific commit',
        '',
        '3️⃣ The commit SHA is the long hash shown',
        '   e.g. abc123def456789... (full 40 chars or short 7–12)',
        '',
        '4️⃣ Copy and paste into the Commit SHA field above',
        '',
        'You can also get it from a previous List Commits or Create Commit response (sha field).',
        '',
        'Example: abc123def456'
      ],
      example: 'abc123def456'
    }
  },
  // E-commerce
  woocommerce: {
    consumerKey: {
      title: 'WooCommerce Consumer Key – Step-by-Step',
      steps: [
        '1️⃣ Open WooCommerce Admin',
        '   Log in to your WordPress admin',
        '   Navigate to WooCommerce',
        '',
        '2️⃣ Go to REST API Settings',
        '   Click "WooCommerce" → "Settings"',
        '   Click "Advanced" tab',
        '   Click "REST API"',
        '',
        '3️⃣ Add API Key',
        '   Click "Add key" button',
        '   Give it a description (e.g., "Workflow Integration")',
        '   Select user (admin recommended)',
        '   Set permissions (Read/Write)',
        '',
        '4️⃣ Generate Key',
        '   Click "Generate API key"',
        '   Copy the "Consumer key"',
        '   It starts with "ck_"',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Consumer Key field above',
        '   You\'ll also need Consumer Secret',
        '',
        'Example:',
        'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    consumerSecret: {
      title: 'WooCommerce Consumer Secret – Step-by-Step',
      steps: [
        '1️⃣ In WooCommerce REST API Settings',
        '   After generating API key',
        '   Find "Consumer secret"',
        '',
        '2️⃣ Copy Consumer Secret',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   It starts with "cs_"',
        '   You may only see it once',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Consumer Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    storeUrl: {
      title: 'WooCommerce Store URL – Step-by-Step',
      steps: [
        '1️⃣ Open Your Store',
        '   Go to your WooCommerce store',
        '   Or WordPress admin panel',
        '',
        '2️⃣ Get Store URL',
        '   The URL is your website domain',
        '   Format: https://yourstore.com',
        '   Don\'t include /wp-admin or paths',
        '',
        '3️⃣ Use the Store URL',
        '   Paste it into the Store URL field above',
        '   Include https:// or http://',
        '   No trailing slash',
        '',
        'Example:',
        'https://yourstore.com'
      ],
      example: 'https://yourstore.com'
    }
  },
  bigcommerce: {
    storeHash: {
      title: 'BigCommerce Store Hash – Step-by-Step',
      url: 'https://login.bigcommerce.com',
      steps: [
        '1️⃣ Open BigCommerce',
        '   Go to 👉 https://login.bigcommerce.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Advanced Settings',
        '   Click "Advanced Settings" in left sidebar',
        '   Click "API Accounts"',
        '',
        '3️⃣ Create API Account',
        '   Click "Create API Account"',
        '   Give it a name',
        '   Select OAuth scopes',
        '',
        '4️⃣ Get Store Hash',
        '   After creating, you\'ll see credentials',
        '   Store Hash is in the API Path',
        '   Format: stores/STORE_HASH/v3/...',
        '   Copy the STORE_HASH part',
        '',
        '5️⃣ Use the Store Hash',
        '   Paste it into the Store Hash field above',
        '   You\'ll also need Access Token',
        '',
        'Example:',
        'abc123def4'
      ],
      example: 'abc123def4'
    },
    accessToken: {
      title: 'BigCommerce Access Token – Step-by-Step',
      url: 'https://login.bigcommerce.com',
      steps: [
        '1️⃣ Open BigCommerce',
        '   Go to 👉 https://login.bigcommerce.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Accounts',
        '   Advanced Settings → API Accounts',
        '   Create or select API account',
        '',
        '3️⃣ Get Access Token',
        '   After creating API account',
        '   Copy the "Access Token"',
        '   ⚠️ You may only see it once!',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get Product – Requires Product ID.',
        '',
        '• List Products – Optional Limit.',
        '',
        '• Create Product – Use product data from your workflow.',
        '',
        '• Update Product – Requires Product ID.',
        '',
        '• Get Order – Requires Order ID.',
        '',
        '• List Orders – Optional Limit.',
        '',
        '• Get Customer – Requires Customer ID.',
      ],
      example: 'Get Product'
    },
    productId: {
      title: 'BigCommerce Product ID – Step-by-Step',
      steps: [
        '1️⃣ Open the product in BigCommerce',
        '',
        '2️⃣ Copy the numeric ID from the URL',
        '',
        '3️⃣ Paste it into the Product ID field',
        '',
        'Example:',
        '123'
      ],
      example: '123'
    },
    orderId: {
      title: 'BigCommerce Order ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Orders in BigCommerce',
        '',
        '2️⃣ Open the order',
        '',
        '3️⃣ Copy the numeric ID from the URL or order details',
        '',
        'Example:',
        '456'
      ],
      example: '456'
    },
    customerId: {
      title: 'BigCommerce Customer ID – Step-by-Step',
      steps: [
        '1️⃣ Go to Customers in BigCommerce',
        '',
        '2️⃣ Open the customer record',
        '',
        '3️⃣ Copy the numeric ID from the URL',
        '',
        'Example:',
        '789'
      ],
      example: '789'
    },
    limit: {
      title: 'How to get Limit?',
      steps: [
        'Enter how many results you want returned.',
        '',
        'Default is 250. Lower it for faster responses.',
        '',
        'Used for List Products and List Orders.'
      ],
      example: '250'
    }
  },
  magento: {
    accessToken: {
      title: 'Magento Access Token – Step-by-Step',
      steps: [
        '1️⃣ Open Magento Admin',
        '   Log in to your Magento admin panel',
        '   Navigate to System',
        '',
        '2️⃣ Go to Integrations',
        '   System → Extensions → Integrations',
        '   Or: Stores → Configuration → Services → OAuth',
        '',
        '3️⃣ Create Integration',
        '   Click "Add New Integration"',
        '   Fill in name and email',
        '   Set API access permissions',
        '',
        '4️⃣ Activate and Get Token',
        '   After creating, activate integration',
        '   Copy the Access Token',
        '   Or use OAuth 2.0 flow',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Communication Services
  slack_message: {
    channel: {
      title: 'Slack Channel',
      url: 'https://api.slack.com/methods/chat.postMessage',
      steps: [
        'Choose where the saved Slack OAuth2 bot should post: a public channel like #alerts, a Slack channel ID like C01234ABCDE, or a user/direct-message ID.',
        'Use {{$json.channelId}} from Slack Trigger when replying to the same channel that started the workflow.',
        'For private channels, invite the connected bot before running the workflow; otherwise Slack can return not_in_channel or channel_not_found.',
        'Use Slack channel details to copy a stable channel ID when channel names may change.'
      ],
      example: '#alerts'
    },
    message: {
      title: 'Slack Message',
      steps: [
        'Write the readable text people should see in Slack notifications, search results, and the message body.',
        'Combine fixed wording with workflow data such as {{$json.ticketId}}, {{$json.customerEmail}}, or {{$json.orderTotal}}.',
        'Slack mrkdwn such as *bold*, _italic_, `code`, links, and line breaks is supported.',
        'Keep Message filled as fallback text even when Blocks contains the visual layout.'
      ],
      example: 'Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs review'
    },
    threadTs: {
      title: 'Slack Thread Timestamp',
      url: 'https://api.slack.com/methods/chat.postMessage',
      steps: [
        'Use this only when the Slack message should be a reply in an existing thread.',
        'Map {{$json.threadTs}}, {{$json.thread_ts}}, {{$json.messageTs}}, or {{$json.ts}} from Slack Trigger or a previous Slack Message output.',
        'Leave it empty for a new top-level channel message.',
        'Use the timestamp value itself, not a Slack permalink or human-readable date.'
      ],
      example: '{{$json.threadTs}}'
    },
    blocks: {
      title: 'Slack Blocks JSON',
      url: 'https://app.slack.com/block-kit-builder',
      steps: [
        'Use Slack Block Kit Builder to design rich message blocks for summaries, approvals, reports, or incident updates.',
        'Copy and paste only the JSON array, for example [{"type":"section",...}], not an object with a blocks property.',
        'Keep Message filled as fallback text for notifications and clients that do not show Blocks.',
        'If Slack returns invalid_blocks, validate the JSON array and remove unsupported fields.'
      ],
      example: '[{"type":"section","text":{"type":"mrkdwn","text":"Hello"}}]'
    },
    username: {
      title: 'Slack Bot Name',
      steps: [
        'Use this optional display name only when your Slack app and workspace allow bot message customization.',
        'Choose a clear team-approved name such as Ops Alert Bot, Billing Bot, or Support Workflow.',
        'This changes message appearance only; the saved Slack OAuth2 connection still controls the real sender and permissions.'
      ],
      example: 'Support Workflow'
    },
    iconEmoji: {
      title: 'Slack Icon Emoji',
      steps: [
        'Use this optional avatar only when your Slack app allows customized bot icons.',
        'Enter a Slack emoji shortcode with colons, such as :rotating_light:, :memo:, or :bar_chart:.',
        'Leave it blank to use the app default icon. This field does not affect routing or workflow output.'
      ],
      example: ':memo:'
    }
  },
  slack_webhook: {
    message: {
      title: 'Slack Webhook Message',
      steps: [
        'Write the simple text payload sent through the selected Slack Incoming Webhook connection.',
        'The webhook URL is stored in Connections, not in this node field.',
        'Slack markdown and template values like {{input.field}} are supported.',
        '',
        'Important: this node\'s output replaces the incoming data entirely (id/status/provider/message only) — capture any fields you need in a later step before this node, not after it.'
      ],
      example: 'New user registered: {{input.email}}'
    }
  },
  microsoft_teams: {
    webhookUrl: {
      title: 'Microsoft Teams Webhook URL',
      steps: [
        'Use this for simple Teams channel notifications.',
        'Create an Incoming Webhook in the exact Teams channel that should receive the message, then copy the full HTTPS URL.',
        'Prefer saving the URL in Connections under Microsoft Teams when possible; the URL can post to that channel, so keep it private.',
        'Leave this blank when replying to a Microsoft Teams Trigger with Service URL, Conversation ID, and a Microsoft Teams Bot connection.',
        'If Teams returns webhook failed, create a fresh webhook for the target channel and test a short message.'
      ],
      example: 'https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/IncomingWebhook/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    message: {
      title: 'Microsoft Teams Message',
      steps: [
        'Write the text people should read in the Teams channel or bot conversation.',
        'Include the useful workplace details: ticket ID, customer, owner, status, error summary, or next action.',
        'Map data from earlier steps with {{$json.ticketId}}, {{$json.customerEmail}}, {{$json.response}}, or {{$json.text}}.',
        'Blank messages return Teams: message is required.',
        'Keep messages short and specific so busy Teams channels can act on them quickly.'
      ],
      example: 'Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs manager review'
    },
    serviceUrl: {
      title: 'Microsoft Teams Service URL',
      steps: [
        'Use this only for Bot Framework replies after a Microsoft Teams Trigger.',
        'Map {{$json.serviceUrl}} directly from the trigger output.',
        'Do not paste a Teams browser link here; runtime expects an HTTPS Bot Framework service URL.',
        'Use it together with Conversation ID and a saved Microsoft Teams Bot connection.'
      ],
      example: '{{$json.serviceUrl}}'
    },
    conversationId: {
      title: 'Microsoft Teams Conversation ID',
      steps: [
        'Use this only for Bot Framework replies after a Microsoft Teams Trigger.',
        'Map {{$json.conversationId}} directly from the trigger output.',
        'This is the chat or channel conversation ID, not the Microsoft Team ID or Channel ID.',
        'Use it with Service URL so the reply goes back to the same Teams conversation.'
      ],
      example: '{{$json.conversationId}}'
    },
    replyToId: {
      title: 'Microsoft Teams Reply To Activity ID',
      steps: [
        'Use this optional field when the bot response should attach to the original Teams activity.',
        'Map {{$json.replyToId}} from Microsoft Teams Trigger, or {{$json.activityId}} if that is the field available.',
        'Leave it blank to send a new bot message in the conversation.',
        'Do not paste a Teams message permalink; use the activity ID from the trigger output.'
      ],
      example: '{{$json.replyToId}}'
    }
  },
  whatsapp: {
    resource: {
      title: 'WhatsApp Resource',
      steps: [
        'Message is the only resource selectable here; it sends and manages WhatsApp Cloud API messages.',
        'The WhatsApp runtime also supports Contact, Conversation, Template, Campaign, and AI Agent resources for AI-generated or manually edited workflow configs — see the WhatsApp documentation page for details.',
        'Set Resource before Operation, since Operation options depend on it.'
      ],
      example: 'message'
    },
    operation: {
      title: 'WhatsApp Operation',
      steps: [
        'Send Text replies with free-form text inside the 24-hour customer service window.',
        'Send Template is required to start a conversation or to message outside that window.',
        'Send Media, Send Location, and Send Contact Card share rich content; Send Interactive Buttons/List/CTA send tappable UI elements.',
        'Mark as Read shows the blue double-check on an incoming customer message.'
      ],
      example: 'sendText'
    },
    to: {
      title: 'WhatsApp To',
      steps: [
        'Enter the recipient WhatsApp phone number in E.164 format: + country code + number, no spaces or dashes.',
        'For WhatsApp Trigger replies, map {{$json.chatId}} or {{$json.from}}.',
        'Not used by Mark as Read, which targets an existing message instead of a recipient.',
        'Do not use a locally formatted number such as 0412 345 678; use +61412345678 instead.'
      ],
      example: '{{$json.chatId}}'
    },
    text: {
      title: 'WhatsApp Message',
      steps: [
        'Write the free-form text the recipient reads. Required for Send Text.',
        'Only allowed within the 24-hour customer service window; use Send Template outside that window or for a brand-new contact.',
        'Map AI Agent output or trigger fields with {{$json.aiResponse}}, {{$json.response}}, or {{$json.text}}.'
      ],
      example: 'Hello {{$json.name}}, your delivery is arriving today between 2-4 PM.'
    },
    mediaUrl: {
      title: 'WhatsApp Media URL',
      steps: [
        'Required for Send Media unless Media ID is set instead.',
        'Use a public HTTPS direct file URL — not a preview page, dashboard link, or signed URL that expires quickly.',
        'Map values such as {{$json.invoicePdfUrl}} or {{$json.chartImageUrl}}.'
      ],
      example: '{{$json.invoicePdfUrl}}'
    },
    templateName: {
      title: 'WhatsApp Template Name',
      steps: [
        'Enter the exact technical name of an approved template from Meta Business Suite -> WhatsApp -> Message Templates.',
        'Required for Send Template.',
        'Template approval typically takes 24-48 hours; sending before approval fails.'
      ],
      example: 'order_confirmation'
    },
    language: {
      title: 'WhatsApp Template Language',
      steps: [
        'Enter the exact language code the template was approved in, such as en_US, pt_BR, or ar.',
        'Required for Send Template.',
        'Sending with the wrong language code makes WhatsApp report the template as not found even if the name is correct.'
      ],
      example: 'en_US'
    },
    messageId: {
      title: 'WhatsApp Message ID',
      steps: [
        'Enter the WhatsApp message ID of the incoming customer message to mark as read.',
        'Required for Mark as Read.',
        'Map {{$json.messageId}} from WhatsApp Trigger output for the message you are responding to.'
      ],
      example: '{{$json.messageId}}'
    }
  },
  outlook: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose Send Email.',
        'Outlook currently sends email through Microsoft Graph sendMail.',
        'Only Send Email is available in the Outlook operation dropdown; use Outlook Trigger for incoming mail or calendar events.'
      ],
      example: 'send_email'
    },
    to: {
      title: 'How to set To?',
      steps: [
        'Enter one recipient email address, or comma-separated addresses for multiple recipients.',
        'Use workflow values such as {{$json.customerEmail}} when the recipient comes from an earlier step.',
        'Do not put Microsoft tokens or connection details here; the Microsoft connection is selected separately.'
      ],
      example: 'customer@example.com'
    },
    subject: {
      title: 'How to write Subject?',
      steps: [
        'Enter the email subject line.',
        'Use workflow values such as Order {{$json.orderId}} received when another node prepared the subject.',
        'Keep it clear and short so recipients can scan it in Outlook.'
      ],
      example: 'Weekly report'
    },
    body: {
      title: 'How to write Body?',
      steps: [
        'Enter the plain-text message body.',
        'Use workflow values such as {{$json.message}} or {{$json.digest}} for dynamic content.',
        'The current Outlook executor sends this value as Text content through Microsoft Graph and does not return a message ID.'
      ],
      example: 'Your report is ready.'
    }
  },
  stop_and_error: {
    errorMessage: {
      title: 'How to write Error Message?',
      steps: [
        'Write the clear business reason this workflow should stop.',
        'Include safe context such as an order ID or missing field name, for example Customer email is missing.',
        'The workflow throws this message and normal next nodes do not run, so do not expect {{$json.errorMessage}} downstream.'
      ],
      example: 'Customer email is missing. Cannot send confirmation.'
    },
    errorCode: {
      title: 'How to write Error Code?',
      steps: [
        'Use a short uppercase category such as VALIDATION_FAILED, PAYMENT_BLOCKED, or PERMISSION_DENIED.',
        'Leave it blank to use STOPPED.',
        'Do not paste secrets or stack traces because this value can appear in run logs.'
      ],
      example: 'VALIDATION_FAILED'
    }
  },
  wait: {
    duration: {
      title: 'How to set Duration?',
      steps: [
        'Enter the pause length in milliseconds.',
        'Use 1000 for 1 second, 5000 for 5 seconds, or 60000 for 1 minute.',
        'The Wait node passes input data through unchanged and is capped at 300000 ms, so it does not return waitedMs or wait for a condition.'
      ],
      example: '5000'
    }
  },
  calendly: {
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose Get User first when you need the Calendly User URI.',
        'Choose Get Event Types to list booking-page types for a User URI.',
        'Choose Get Scheduled Events to list booked meetings, optionally filtered by Event Type URI.'
      ],
      example: 'get_user'
    },
    accessToken: {
      title: 'How to set Personal Access Token?',
      steps: [
        'Prefer a saved Calendly connection in Connections and leave this field blank.',
        'Use this field only as a legacy fallback or controlled test token.',
        'Do not map or paste tokens into normal workflow data; store secrets in the credential vault.'
      ],
      example: 'Saved in Connections'
    },
    userUri: {
      title: 'How to set User URI?',
      steps: [
        'Run Get User first and map {{$json.user.uri}} into this field.',
        'Required for Get Event Types and Get Scheduled Events.',
        'Use the api.calendly.com/users URI, not the public scheduling page URL.'
      ],
      example: '{{$json.user.uri}}'
    },
    eventTypeUri: {
      title: 'How to set Event Type URI?',
      steps: [
        'Run Get Event Types and map a returned event type URI such as {{$json.collection[0].uri}}.',
        'Use it only when Get Scheduled Events should be filtered to one booking type.',
        'Leave it blank to list all scheduled events for the selected User URI.'
      ],
      example: '{{$json.collection[0].uri}}'
    }
  },
  salesforce: {
    instanceUrl: {
      title: 'Salesforce Instance URL – Step-by-Step',
      steps: [
        'Instance URL is your Salesforce org URL.',
        '',
        'Example: https://yourinstance.salesforce.com',
        'Copy it from your browser after logging in.'
      ],
      example: 'https://yourinstance.salesforce.com'
    },
    accessToken: {
      title: 'Salesforce Access Token – Step-by-Step',
      steps: [
        'Access Token is generated via OAuth.',
        '',
        'Use your Salesforce OAuth flow to get it,',
        'then paste it into this field.'
      ],
      example: '00Dxx0000000000!AQ0...'
    },
    resource: {
      title: 'How to choose Resource/Object?',
      steps: [
        'Select the Salesforce object you want to work with.',
        '',
        'Common objects: Account, Contact, Lead, Opportunity, Case.',
        'Use Custom Object if you need a custom object.'
      ],
      example: 'Contact'
    },
    customObject: {
      title: 'How to set Custom Object API Name?',
      steps: [
        'Required only if Resource is Custom Object.',
        '',
        'Find the API name in Salesforce Setup → Object Manager.',
        'Custom objects end with __c.'
      ],
      example: 'CustomObject__c'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose the action to perform.',
        '',
        'Examples:',
        '• query (SOQL)',
        '• search (SOSL)',
        '• get / create / update / delete',
        '• upsert / bulk operations'
      ],
      example: 'query'
    },
    soql: {
      title: 'How to write SOQL Query?',
      steps: [
        'SOQL is used for structured queries.',
        '',
        'Example:',
        'SELECT Id, Name, Email FROM Contact WHERE Email != null'
      ],
      example: 'SELECT Id, Name FROM Contact LIMIT 10'
    },
    sosl: {
      title: 'How to write SOSL Search Query?',
      steps: [
        'SOSL searches text across objects.',
        '',
        'Example:',
        'FIND {john} IN ALL FIELDS RETURNING Contact(Id, Name, Email)'
      ],
      example: 'FIND {john} IN ALL FIELDS RETURNING Contact(Id, Name, Email)'
    },
    id: {
      title: 'How to get Record ID?',
      steps: [
        'Record ID is the unique Salesforce identifier.',
        '',
        'Copy it from the record URL or from a query result.'
      ],
      example: '0035g00000ABCDe'
    },
    fields: {
      title: 'How to set Fields (JSON)?',
      steps: [
        'Fields is a JSON object with Salesforce field API names.',
        '',
        'Example:',
        '{ "FirstName": "John", "LastName": "Doe", "Email": "john@example.com" }'
      ],
      example: '{"FirstName":"John","LastName":"Doe","Email":"john@example.com"}'
    },
    externalIdField: {
      title: 'How to set External ID Field?',
      steps: [
        'Used for upsert operations.',
        '',
        'Example: Email or External_Id__c'
      ],
      example: 'Email'
    },
    externalIdValue: {
      title: 'How to set External ID Value?',
      steps: [
        'The value to match for upsert.',
        '',
        'Example: john@example.com'
      ],
      example: 'john@example.com'
    }
  },
  zoho_crm: {
    accessToken: {
      title: 'Zoho CRM Access Token – Step-by-Step',
      steps: [
        'Access Token authenticates this node with your Zoho CRM account. It is generated via OAuth.',
        '',
        'Step 1: Go to Zoho API Console.',
        '• Open 👉 https://api-console.zoho.com',
        '• Sign in with the same Zoho account you use for CRM.',
        '',
        'Step 2: Create or select a Server-based Client.',
        '• Click "Add Client".',
        '• Choose "Server-based" (or the client type you use for backend apps).',
        '• Set Redirect URI to your app’s OAuth callback URL.',
        '',
        'Step 3: Generate an authorization code in your app.',
        '• Use the Client ID + Client Secret from the Zoho client.',
        '• Direct the user to the Zoho authorization URL.',
        '• After consent, Zoho redirects back with code=? in the URL.',
        '',
        'Step 4: Exchange the authorization code for an access token.',
        '• Your backend calls Zoho OAuth token endpoint with code, client_id, client_secret, redirect_uri, and grant_type=authorization_code.',
        '• Zoho responds with access_token and refresh_token.',
        '',
        'Step 5: Paste the access_token here.',
        '• Use ONLY the access_token string (starts with 1000.).',
        '• Store refresh_token securely in your backend to rotate tokens when they expire.',
        '',
        'Security tips:',
        '• Do not hard-code tokens in source control.',
        '• Prefer environment variables or a secrets manager.'
      ],
      example: '1000.xxxxxxx'
    },
    apiDomain: {
      title: 'How to choose API Domain?',
      steps: [
        'API Domain is the base URL for Zoho CRM APIs and depends on your Zoho data center (region).',
        '',
        'If you sign in at:',
        '• crm.zoho.com → use https://www.zohoapis.com (US).',
        '• crm.zoho.eu → use https://www.zohoapis.eu (EU).',
        '• crm.zoho.in → use https://www.zohoapis.in (IN).',
        '• crm.zoho.com.cn → use https://www.zohoapis.com.cn (CN).',
        '• crm.zoho.com.au → use https://www.zohoapis.com.au (AU).',
        '• crm.zoho.jp → use https://www.zohoapis.jp (JP).',
        '',
        'Tip:',
        '• Match the region where your Zoho CRM account is hosted.',
        '• Using the wrong domain will cause "invalid domain" or auth errors.'
      ],
      example: 'https://www.zohoapis.com'
    },
    module: {
      title: 'How to choose Module?',
      steps: [
        'Module is the Zoho CRM object you want to work with.',
        '',
        'Common standard modules:',
        '• Leads – potential customers before qualification.',
        '• Contacts – people you have a relationship with.',
        '• Accounts – companies or organizations.',
        '• Deals – opportunities or sales pipelines.',
        '• Tasks / Events / Calls – activities linked to records.',
        '',
        'If you select "Custom Module":',
        '• You must also provide Custom Module API Name.',
        '• This is the API name configured in Zoho CRM (e.g., CustomModule1).',
        '',
        'Tip: Choose the module that actually stores the records you want to create, update, or read.'
      ],
      example: 'Contacts'
    },
    customModule: {
      title: 'How to set Custom Module API Name?',
      steps: [
        'This is required only if Module is set to "Custom Module".',
        '',
        'Step 1: Open Zoho CRM → Setup → Developer Space → APIs → API Names (or Modules & Fields).',
        'Step 2: Find your custom module in the list.',
        'Step 3: Copy the API Name (NOT the display label).',
        '• It often looks like CustomModule1, Deals_Extension, etc.',
        '',
        'Paste that exact API name here. The name must match Zoho CRM exactly or requests will fail with "invalid module" errors.'
      ],
      example: 'CustomModule1'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what action you want to perform in Zoho CRM.',
        '',
        'Core operations:',
        '• Get – Fetch a single record by Record ID.',
        '• Get Many – List records from a module (supports pagination and Fields).',
        '• Create – Insert a new record using Data (JSON).',
        '• Update – Modify an existing record by Record ID + Data (JSON).',
        '• Delete – Remove a record by Record ID.',
        '• Search – Find records matching Search Criteria.',
        '• Upsert – Create or update based on unique field (e.g., email).',
        '',
        'Bulk operations:',
        '• Bulk Create / Bulk Update – Send multiple records at once (Records Array).',
        '',
        'Tip:',
        '• After choosing an operation, check which fields are required (Record ID, Data, Criteria, etc.) and fill only those relevant to that operation.'
      ],
      example: 'get'
    },
    id: {
      title: 'How to get Record ID?',
      steps: [
        'Record ID is the unique Zoho CRM identifier for a single record. It is required for Get, Update, and Delete.',
        '',
        'Option 1 – From Zoho CRM UI:',
        '• Open the record in your browser.',
        '• Look at the URL: crm.zoho.com/crm/org123456789/tab/Accounts/4876876000000123456.',
        '• The long number at the end is the Record ID.',
        '',
        'Option 2 – From API response:',
        '• When you create or search for records via API, the response includes an "id" field.',
        '• Use that id value directly here.',
        '',
        'Tip: Store Record IDs from previous nodes (e.g., Create or Search) and reference them using expressions like {{previousNode.id}}.'
      ],
      example: '4876876000000123456'
    },
    data: {
      title: 'How to set Data (JSON)?',
      steps: [
        'Data is a JSON object that defines the fields and values to send to Zoho CRM. It is required for Create, Update, Upsert, and bulk write operations.',
        '',
        'Rules:',
        '• Keys must be Zoho field API names (not labels).',
        '• Values should match the field type (text, number, date, lookup, etc.).',
        '',
        'Examples (single record):',
        '{',
        '  "Last_Name": "Sharma",',
        '  "First_Name": "Amit",',
        '  "Email": "amit.sharma@example.com",',
        '  "Phone": "9876543210"',
        '}',
        '',
        'Examples (for Bulk Create/Update with Records Array):',
        '[',
        '  { "Last_Name": "Sharma", "Email": "amit@example.com" },',
        '  { "Last_Name": "Patel", "Email": "patel@example.com" }',
        ']',
        '',
        'Tip: Use Zoho CRM "Fields" / "API Names" screen to confirm exact field keys before sending data.'
      ],
      example: '{"Last_Name":"Sharma","First_Name":"Amit","Email":"amit.sharma@example.com"}'
    },
    criteria: {
      title: 'How to set Search Criteria?',
      steps: [
        'Search Criteria is used when Operation = Search. It tells Zoho which records to return.',
        '',
        'Basic pattern:',
        '(Field_API_Name:operator:value)',
        '',
        'Common operators:',
        '• equals – exact match',
        '• starts_with – prefix match',
        '• contains – substring match',
        '• greater_than, less_than – numeric/date comparisons',
        '',
        'Examples:',
        '(Email:equals:amit.sharma@example.com)',
        '(Last_Name:starts_with:Shar)',
        '',
        'You can also combine with AND/OR:',
        '((Last_Name:equals:Sharma)and(Email:contains:@example.com))',
        '',
        'Tip: Always use field API names in criteria, not display labels.'
      ],
      example: '(Email:equals:amit.sharma@example.com)'
    },
    fields: {
      title: 'How to set Fields?',
      steps: [
        'Fields controls which columns Zoho CRM returns in the response.',
        '',
        'Format: comma-separated list of field API names.',
        'Examples:',
        '• id,First_Name,Last_Name,Email',
        '• id,Account_Name,Deal_Name,Stage,Amount',
        '',
        'Tips:',
        '• Use this to reduce payload size and speed up responses.',
        '• If left empty, Zoho may return many default fields, which can be heavy for large datasets.'
      ],
      example: 'id,First_Name,Last_Name,Email'
    },
    page: {
      title: 'How to set Page Number?',
      steps: [
        'Page controls which "slice" of results you are viewing when listing records (Get Many or Search).',
        '',
        'Rules:',
        '• Starts at 1 (Page = 1 is the first page).',
        '• Use together with Records Per Page to navigate.',
        '',
        'Examples:',
        '• Page 1, Per Page 200 → first 200 records.',
        '• Page 2, Per Page 200 → next 200 records (201–400).',
        '',
        'Tip: For cursor-based pagination or very large datasets, consider storing last page processed and resuming from there.'
      ],
      example: '1'
    },
    perPage: {
      title: 'How to set Records Per Page?',
      steps: [
        'Records Per Page controls how many records Zoho returns per request.',
        '',
        'Rules:',
        '• Maximum allowed by Zoho CRM is typically 200.',
        '• Higher values reduce the number of API calls but increase response size.',
        '',
        'Recommendations:',
        '• 50–100 for most workflows.',
        '• 200 when you need to process many records and your system can handle larger responses.',
        '',
        'Tip: Combine this with Page Number to iterate through all results safely.'
      ],
      example: '200'
    }
  },
  // Cloud Storage
  aws_s3_legacy_unused: {
    accessKeyId: {
      title: 'AWS Access Key ID – Step-by-Step',
      url: 'https://console.aws.amazon.com',
      steps: [
        '1️⃣ Open AWS Console',
        '   Go to 👉 https://console.aws.amazon.com',
        '   Sign in to your AWS account',
        '',
        '2️⃣ Go to IAM',
        '   Search for "IAM" in top search bar',
        '   Click "IAM" service',
        '',
        '3️⃣ Navigate to Users',
        '   Click "Users" in left sidebar',
        '   Select your user or create new',
        '',
        '4️⃣ Go to Security Credentials',
        '   Click "Security credentials" tab',
        '   Scroll to "Access keys"',
        '',
        '5️⃣ Create Access Key',
        '   Click "Create access key"',
        '   Choose use case (Application running outside AWS)',
        '   Click "Next" → "Create access key"',
        '',
        '6️⃣ Copy Access Key ID',
        '   Copy the "Access key ID"',
        '   Also copy "Secret access key"',
        '   ⚠️ You won\'t see secret again!',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Key ID field above',
        '',
        'Example:',
        'AKIAIOSFODNN7EXAMPLE'
      ],
      example: 'AKIAIOSFODNN7EXAMPLE'
    },
    secretAccessKey: {
      title: 'AWS Secret Access Key – Step-by-Step',
      url: 'https://console.aws.amazon.com',
      steps: [
        '1️⃣ When Creating Access Key',
        '   After clicking "Create access key"',
        '   You\'ll see both keys',
        '',
        '2️⃣ Copy Secret Access Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '   Click "Show" if hidden',
        '',
        '3️⃣ Download CSV (Optional)',
        '   Click "Download .csv file"',
        '   Store it securely',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Secret Access Key field above',
        '   Never commit to version control',
        '   Use IAM roles when possible',
        '',
        'Example:',
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      ],
      example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    },
    bucket: {
      title: 'AWS S3 Bucket Name – Step-by-Step',
      url: 'https://console.aws.amazon.com/s3',
      steps: [
        '1️⃣ Open S3 Console',
        '   Go to 👉 https://console.aws.amazon.com/s3',
        '   Sign in to your AWS account',
        '',
        '2️⃣ View Buckets',
        '   You\'ll see list of S3 buckets',
        '   Or create new: Click "Create bucket"',
        '',
        '3️⃣ Get Bucket Name',
        '   Bucket name is shown in the list',
        '   Or from bucket URL',
        '',
        '4️⃣ Use the Bucket Name',
        '   Paste it into the Bucket field above',
        '   Must be globally unique',
        '',
        'Example:',
        'my-bucket-name'
      ],
      example: 'my-bucket-name'
    }
  },
  dropbox_legacy_unused: {
    accessToken: {
      title: 'Dropbox Access Token – Step-by-Step',
      url: 'https://www.dropbox.com/developers',
      steps: [
        '1️⃣ Open Dropbox Developers',
        '   Go to 👉 https://www.dropbox.com/developers',
        '   Sign in with your Dropbox account',
        '',
        '2️⃣ Go to App Console',
        '   Click "App Console"',
        '   Or go to: dropbox.com/developers/apps',
        '',
        '3️⃣ Create App',
        '   Click "Create app"',
        '   Choose "Scoped access"',
        '   Select "Full Dropbox" or "App folder"',
        '   Give it a name',
        '',
        '4️⃣ Generate Access Token',
        '   In app settings, go to "Permissions"',
        '   Select required scopes',
        '   Go to "OAuth 2" tab',
        '   Click "Generate" under "Generated access token"',
        '',
        '5️⃣ Copy Access Token',
        '   Copy the access token',
        '   ⚠️ Keep it secure!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'sl.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  onedrive_legacy_unused: {
    accessToken: {
      title: 'OneDrive Access Token – Step-by-Step',
      url: 'https://portal.azure.com',
      steps: [
        '1️⃣ Open Azure Portal',
        '   Go to 👉 https://portal.azure.com',
        '   Sign in with Microsoft account',
        '',
        '2️⃣ Register App',
        '   Go to Azure Active Directory',
        '   Click "App registrations"',
        '   Click "New registration"',
        '',
        '3️⃣ Configure App',
        '   Give it a name',
        '   Set redirect URI',
        '   Click "Register"',
        '',
        '4️⃣ Get Client ID and Secret',
        '   Copy "Application (client) ID"',
        '   Go to "Certificates & secrets"',
        '   Create new client secret',
        '',
        '5️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use Microsoft Graph Explorer',
        '   Complete authorization',
        '',
        '6️⃣ Copy Access Token',
        '   After OAuth completes',
        '   Copy the access_token',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'eyJ0eXAiOiJKV1QiLCJubGciOiJSUzI1NiIsIng1dCI6...'
      ],
      example: 'eyJ0eXAiOiJKV1QiLCJubGciOiJSUzI1NiIsIng1dCI6...'
    }
  },
  box: {
    accessToken: {
      title: 'Box Access Token – Step-by-Step',
      url: 'https://developer.box.com',
      steps: [
        '1️⃣ Open Box Developers',
        '   Go to 👉 https://developer.box.com',
        '   Sign in with your Box account',
        '',
        '2️⃣ Go to App Console',
        '   Click "My Apps"',
        '   Or go to: box.com/developers/console',
        '',
        '3️⃣ Create App',
        '   Click "Create New App"',
        '   Choose "Custom App"',
        '   Select "Server Authentication (with JWT)"',
        '',
        '4️⃣ Configure App',
        '   Fill in app details',
        '   Go to "Configuration" tab',
        '   Set redirect URLs if needed',
        '',
        '5️⃣ Generate Access Token',
        '   Use OAuth 2.0 flow',
        '   Or use JWT authentication',
        '   Complete authorization',
        '',
        '6️⃣ Copy Access Token',
        '   After OAuth/JWT completes',
        '   Copy the access_token',
        '',
        '7️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  ftp_legacy_unused: {
    host: {
      title: 'FTP Host – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Server Address',
        '   From your hosting provider',
        '   Or from your FTP client settings',
        '   Usually: ftp.yourdomain.com or IP address',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include ftp:// prefix',
        '   Just the hostname or IP',
        '',
        'Examples:',
        'ftp.yourdomain.com',
        '192.168.1.100',
        'your-server.com'
      ],
      example: 'ftp.yourdomain.com'
    },
    port: {
      title: 'FTP Port – Step-by-Step',
      steps: [
        'Use the port provided by your FTP server.',
        '',
        'Common ports:',
        '• 21 – Standard FTP',
        '• 990 – FTPS (FTP over TLS/SSL)',
        '• 2121 – Custom port (if configured)',
        '',
        'If unsure, use 21 or ask your hosting provider.'
      ],
      example: '21'
    },
    username: {
      title: 'FTP Username – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Username',
        '   From your hosting provider',
        '   Or from your FTP account settings',
        '   Usually provided when creating FTP account',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'ftpuser'
      ],
      example: 'ftpuser'
    },
    password: {
      title: 'FTP Password – Step-by-Step',
      steps: [
        '1️⃣ Get FTP Password',
        '   From your hosting provider',
        '   Or reset in hosting control panel',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get File – Download a file (requires Remote Path).',
        '',
        '• Put File – Upload a file (requires Remote Path + Content).',
        '',
        '• List Files – List files in a directory (requires Remote Path).',
        '',
        '• Delete File – Delete a file (requires Remote Path).'
      ],
      example: 'Get File'
    },
    remotePath: {
      title: 'How to get Remote Path?',
      steps: [
        'Remote Path is the file or folder location on the FTP server.',
        '',
        'For Get/Put/Delete: use the full file path.',
        'For List: use a folder path.',
        '',
        'Examples:',
        '/files/data.txt',
        '/var/www/uploads/',
        'files/backup.zip'
      ],
      example: '/files/data.txt'
    },
    content: {
      title: 'How to get Content (for Put)?',
      steps: [
        'Provide the file content you want to upload.',
        '',
        '• Text files: paste plain text.',
        '• Binary files: use base64 encoding.',
        '',
        'Examples:',
        'Hello World',
        'base64-encoded string for a PDF or image'
      ],
      example: 'Hello World'
    }
  },
  sftp_legacy_unused: {
    host: {
      title: 'SFTP Host – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Server Address',
        '   From your hosting provider',
        '   Usually same as SSH host',
        '   Format: sftp.yourdomain.com or IP',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Don\'t include sftp:// prefix',
        '',
        'Examples:',
        'sftp.yourdomain.com',
        '192.168.1.100',
        'your-server.com'
      ],
      example: 'sftp.yourdomain.com'
    },
    port: {
      title: 'SFTP Port – Step-by-Step',
      steps: [
        'Use the port provided by your SFTP server.',
        '',
        'Common ports:',
        '• 22 – Standard SFTP (SSH)',
        '• 2222 – Custom port (if configured)',
        '',
        'If unsure, use 22 or ask your server admin.'
      ],
      example: '22'
    },
    username: {
      title: 'SFTP Username – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Username',
        '   Usually same as SSH username',
        '   From your hosting provider',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Example:',
        'sftpuser'
      ],
      example: 'sftpuser'
    },
    password: {
      title: 'SFTP Password – Step-by-Step',
      steps: [
        '1️⃣ Get SFTP Password',
        '   From your hosting provider',
        '   Or use SSH key authentication',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Consider using SSH keys instead',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    },
    privateKey: {
      title: 'SFTP Private Key – Step-by-Step',
      steps: [
        'Use this only for key-based authentication.',
        '',
        '1️⃣ Locate your private key file',
        '   Common file names: id_rsa, id_ed25519, *.pem, *.ppk',
        '',
        '2️⃣ Open the private key file',
        '   Copy the full content including header/footer',
        '   Example header: -----BEGIN RSA PRIVATE KEY-----',
        '',
        '3️⃣ Paste it into the Private Key field above',
        '',
        'Make sure the matching public key is in the server\'s authorized_keys.'
      ],
      example: '-----BEGIN RSA PRIVATE KEY-----'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Get File – Download a file (requires Remote Path).',
        '',
        '• Put File – Upload a file (requires Remote Path + Content).',
        '',
        '• List Files – List files in a directory (requires Remote Path).',
        '',
        '• Delete File – Delete a file (requires Remote Path).'
      ],
      example: 'Get File'
    },
    remotePath: {
      title: 'How to get Remote Path?',
      steps: [
        'Remote Path is the file or folder location on the SFTP server.',
        '',
        'For Get/Put/Delete: use the full file path.',
        'For List: use a folder path.',
        '',
        'Examples:',
        '/files/data.txt',
        '/var/www/uploads/',
        '~/backup.zip'
      ],
      example: '/files/data.txt'
    },
    content: {
      title: 'How to get Content (for Put)?',
      steps: [
        'Provide the file content you want to upload.',
        '',
        '• Text files: paste plain text.',
        '• Binary files: use base64 encoding.',
        '',
        'Examples:',
        'Hello World',
        'base64-encoded string for a PDF or image'
      ],
      example: 'Hello World'
    }
  },
  minio: {
    accessKey: {
      title: 'MinIO Access Key – Step-by-Step',
      steps: [
        '1️⃣ For MinIO Server',
        '   Access your MinIO server',
        '   Go to MinIO Console',
        '   Usually: http://your-server:9001',
        '',
        '2️⃣ Go to Access Keys',
        '   Click "Access Keys" in left sidebar',
        '   Or go to Identity → Access Keys',
        '',
        '3️⃣ Create Access Key',
        '   Click "Create Access Key"',
        '   Give it a name',
        '   Set policy (read/write)',
        '',
        '4️⃣ Copy Access Key',
        '   Copy the "Access Key"',
        '   Also copy "Secret Key"',
        '   ⚠️ You won\'t see secret again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Key field above',
        '',
        'Example:',
        'minioadmin'
      ],
      example: 'minioadmin'
    },
    secretKey: {
      title: 'MinIO Secret Key – Step-by-Step',
      steps: [
        '1️⃣ When Creating Access Key',
        '   After clicking "Create Access Key"',
        '   You\'ll see both keys',
        '',
        '2️⃣ Copy Secret Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t be able to see it again',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Secret Key field above',
        '   Never share publicly',
        '',
        'Example:',
        'minioadmin'
      ],
      example: 'minioadmin'
    },
    endpoint: {
      title: 'MinIO Endpoint – Step-by-Step',
      steps: [
        '1️⃣ Get MinIO Server URL',
        '   From your MinIO server configuration',
        '   Usually: http://your-server:9000',
        '   Or: https://minio.yourdomain.com',
        '',
        '2️⃣ Use the Endpoint',
        '   Paste it into the Endpoint field above',
        '   Include protocol (http:// or https://)',
        '   Include port if not default',
        '',
        'Examples:',
        'http://localhost:9000',
        'https://minio.yourdomain.com'
      ],
      example: 'http://localhost:9000'
    }
  },
  // YouTube
  youtube: {
    apiKey: {
      title: 'YouTube Data API Key – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create or Select Project',
        '   Click project dropdown',
        '   Select project or create new',
        '',
        '3️⃣ Enable YouTube Data API',
        '   Search for "YouTube Data API v3"',
        '   Click on it',
        '   Click "Enable"',
        '',
        '4️⃣ Go to Credentials',
        '   Click "Credentials" in left sidebar',
        '   Click "Create Credentials"',
        '   Select "API key"',
        '',
        '5️⃣ Copy API Key',
        '   API key will be generated',
        '   Copy it immediately',
        '   Optionally restrict the key',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'YouTube OAuth Access Token – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create OAuth 2.0 Credentials',
        '   Go to "APIs & Services" → "Credentials"',
        '   Click "Create Credentials" → "OAuth client ID"',
        '   Choose "Web application"',
        '',
        '3️⃣ Configure OAuth',
        '   Set authorized redirect URIs',
        '   Copy Client ID and Client Secret',
        '',
        '4️⃣ Complete OAuth Flow',
        '   Redirect user to Google OAuth',
        '   Request scopes:',
        '   • https://www.googleapis.com/auth/youtube.upload',
        '   • https://www.googleapis.com/auth/youtube',
        '',
        '5️⃣ Get Access Token',
        '   After user authorizes',
        '   Exchange code for access token',
        '   Copy the access_token',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   ⚠️ Required for upload/update/delete operations',
        '',
        'Example:',
        'ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Upload Video – Requires Video URL, Title, and optional Description/Tags/Privacy.',
        '',
        '• Update Video Metadata – Requires Video ID and new Title/Description/Tags.',
        '',
        '• Delete Video – Requires Video ID.',
        '',
        '• Get Channel Details – Requires Channel ID (or "mine").',
        '',
        '• Get Video Statistics – Requires Video ID.',
        '',
        '• Search Videos – Requires Search Query (optional Max Results).',
        '',
        '• Get Comments – Requires Video ID (optional Max Results).',
        '',
        '• Reply to Comment – Requires Comment ID and Comment Text.'
      ],
      example: 'Upload Video'
    },
    videoUrl: {
      title: 'How to get Video URL?',
      steps: [
        'Upload the video file to a public host (CDN, cloud storage, file server).',
        '',
        'Copy the direct HTTPS URL to the video file.',
        '',
        'Supported formats: MP4, MOV, AVI.',
        '',
        'Example:',
        'https://example.com/video.mp4'
      ],
      example: 'https://example.com/video.mp4'
    },
    title: {
      title: 'How to get Video Title?',
      steps: [
        'This is the title shown on YouTube.',
        '',
        '• Type it directly.',
        '',
        '• Or map from earlier steps (e.g. "{{input.title}}").',
        '',
        'Max length is 100 characters.'
      ],
      example: 'My Video Title'
    },
    description: {
      title: 'How to get Video Description?',
      steps: [
        'This text appears below the video.',
        '',
        '• Type it directly.',
        '',
        '• Or map from earlier steps (e.g. "{{input.description}}").',
        '',
        'Optional for uploads and updates.'
      ],
      example: 'Video description with keywords'
    },
    tags: {
      title: 'How to get Tags (comma-separated)?',
      steps: [
        'Enter keywords separated by commas.',
        '',
        'Example: tutorial, automation, workflow',
        '',
        'Total length across all tags should be under 500 characters.'
      ],
      example: 'tutorial, automation, workflow'
    },
    videoId: {
      title: 'YouTube Video ID – Step-by-Step',
      steps: [
        '1️⃣ Open the video in a browser',
        '',
        '2️⃣ Copy the value after v= in the URL',
        '',
        '3️⃣ Or use the ID returned when you upload or search videos',
        '',
        'Example:',
        'dQw4w9WgXcQ'
      ],
      example: 'dQw4w9WgXcQ'
    },
    channelId: {
      title: 'YouTube Channel ID – Step-by-Step',
      steps: [
        '1️⃣ Open your channel page',
        '',
        '2️⃣ If the URL is youtube.com/channel/CHANNEL_ID, copy the ID',
        '',
        '3️⃣ If you are authenticated, you can use "mine" for your channel',
        '',
        'Example:',
        'UCxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'UCxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    query: {
      title: 'How to get Search Query?',
      steps: [
        'Type the keywords you want to search for.',
        '',
        'Example:',
        'workflow automation tutorial'
      ],
      example: 'workflow automation tutorial'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'Type the reply you want to post.',
        '',
        'You can also map text from earlier steps.',
        '',
        'Required for Reply to Comment.'
      ],
      example: 'Thanks for watching!'
    },
    commentId: {
      title: 'YouTube Comment ID – Step-by-Step',
      steps: [
        '1️⃣ Use "Get Comments" to list comments for a video',
        '',
        '2️⃣ Copy the "id" field from the comment you want to reply to',
        '',
        '3️⃣ Paste it here',
        '',
        'Example:',
        'Ugxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'Ugxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter how many results to return.',
        '',
        'Allowed range is 1–50.',
        '',
        'Used for Search Videos and Get Comments.'
      ],
      example: '10'
    },
    privacyStatus: {
      title: 'How to get Privacy Status?',
      steps: [
        'Choose the visibility for the uploaded video.',
        '',
        '• public – visible to everyone',
        '• unlisted – visible to anyone with the link',
        '• private – visible only to you',
        '',
        'Used for Upload Video.'
      ],
      example: 'public'
    }
  },
  // XML
  xml: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Parse – Convert XML into JSON-like output.',
        '',
        '• Extract – Use XPath to pull specific values (requires XPath Expression).',
        '',
        '• Validate – Check that the XML is well‑formed.'
      ],
      example: 'Parse'
    },
    xml: {
      title: 'How to get XML Content?',
      steps: [
        'Paste the XML text you want to process.',
        '',
        'You can also map from a previous step, e.g. "{{input.xml}}".',
        '',
        'Examples:',
        '<root><item>value</item></root>',
        '<order><id>123</id></order>'
      ],
      example: '<root><item>value</item></root>'
    },
    xpath: {
      title: 'How to get XPath Expression?',
      steps: [
        'Use XPath to select the data you need.',
        '',
        'Examples:',
        '• /root/item',
        '• /root/item[1]',
        '• /root/item[@id="1"]',
        '• //item',
        '• /root/item/text()'
      ],
      example: '/root/item'
    },
    safeMode: {
      title: 'How to get Safe Mode?',
      steps: [
        'Safe Mode protects against unsafe XML features (XXE, entity expansion).',
        '',
        'Keep this enabled unless you fully trust the XML source.'
      ],
      example: 'true'
    },
    maxSize: {
      title: 'How to get Max Size (bytes)?',
      steps: [
        'Set the maximum XML size you want to process.',
        '',
        'Default is 10 MB (10485760).',
        '',
        'Increase for larger files or decrease for stricter limits.',
        '',
        'Examples:',
        '1048576 (1 MB)',
        '10485760 (10 MB)',
        '52428800 (50 MB)'
      ],
      example: '10485760'
    }
  },
  // PDF
  pdf: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Extract Text – Read the text content from the PDF.',
        '',
        '• Read Metadata – Read PDF details like title, author, and created date.'
      ],
      example: 'Extract Text'
    },
    pdfUrl: {
      title: 'How to get PDF URL/Base64?',
      steps: [
        'Provide the PDF as a public URL or a Base64 data URI.',
        '',
        'URL option:',
        '• Upload the PDF to a public location (cloud storage or file server).',
        '• Copy the direct HTTPS link to the PDF file.',
        '',
        'Base64 option:',
        '• Convert the PDF to Base64.',
        '• Prefix with: data:application/pdf;base64,',
        '',
        'Examples:',
        'https://example.com/document.pdf',
        'data:application/pdf;base64,JVBERi0xLjQK...'
      ],
      example: 'https://example.com/document.pdf'
    },
    maxSize: {
      title: 'How to get Max Size (bytes)?',
      steps: [
        'Set the maximum size of PDF you want to process.',
        '',
        'Default is 10 MB (10485760).',
        '',
        'Increase for larger PDFs, or lower it to prevent heavy processing.',
        '',
        'Examples:',
        '1048576 (1 MB)',
        '10485760 (10 MB)',
        '52428800 (50 MB)'
      ],
      example: '10485760'
    }
  },
  // Date & Time
  date_time: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Format – Format a date into a specific output (ISO, Timestamp, Locale, or Custom).',
        '',
        '• Add – Add time to a base date (requires Value + Unit).',
        '',
        '• Subtract – Subtract time from a base date (requires Value + Unit).',
        '',
        '• Difference – Calculate the time difference between dates.',
        '',
        '• Now – Get the current date/time.',
        '',
        '• Convert Timezone – Convert a date into another time zone.',
        '',
        '• Get Timezone Info – Return details about a time zone.',
      ],
      example: 'Format'
    },
    date: {
      title: 'How to get Date (ISO)?',
      steps: [
        'Provide the base date in ISO 8601 format.',
        '',
        'You can type it directly or map it from a previous step (e.g. "{{input.date}}").',
        '',
        'Examples:',
        '• 2024-01-15',
        '• 2024-01-15T10:30:00Z',
        '• 2024-01-15T10:30:00+05:30',
        '',
        'Leave empty to use the current date/time.'
      ],
      example: '2024-01-15T10:30:00Z'
    },
    timezone: {
      title: 'How to get Timezone (IANA)?',
      steps: [
        'Use an IANA timezone identifier.',
        '',
        'Common examples:',
        '• UTC',
        '• America/New_York',
        '• Europe/London',
        '• Asia/Kolkata',
        '',
        'You can find your timezone in system settings or search "my time zone".'
      ],
      example: 'America/New_York'
    },
    format: {
      title: 'How to get Format?',
      steps: [
        'Choose how the output should look:',
        '',
        '• ISO – Standard ISO 8601 string.',
        '• Timestamp – Unix timestamp in milliseconds.',
        '• Locale Date – Uses Locale field for language/region.',
        '• Custom – Uses the Custom Format field.',
      ],
      example: 'ISO'
    },
    locale: {
      title: 'How to get Locale?',
      steps: [
        'Locale is used only when Format = Locale Date.',
        '',
        'Use language-REGION codes such as:',
        '• en-US',
        '• en-GB',
        '• fr-FR',
        '• de-DE',
        '• ja-JP',
      ],
      example: 'en-US'
    },
    value: {
      title: 'How to get Value?',
      steps: [
        'Enter the number of units to add or subtract.',
        '',
        'Examples:',
        '• 1 = one unit',
        '• 7 = seven units',
        '• -5 = subtract five units',
        '',
        'Used only for Add/Subtract operations.'
      ],
      example: '3'
    },
    unit: {
      title: 'How to get Unit?',
      steps: [
        'Choose the unit that matches your calculation:',
        '',
        'Seconds, Minutes, Hours, Days, Weeks, Months, Years.',
        '',
        'Used only for Add/Subtract operations.'
      ],
      example: 'days'
    },
    customFormat: {
      title: 'How to get Custom Format?',
      steps: [
        'Use format tokens for custom output:',
        '',
        '• YYYY = year',
        '• MM = month',
        '• DD = day',
        '• HH = hours (24h)',
        '• mm = minutes',
        '• ss = seconds',
        '',
        'Example:',
        'YYYY-MM-DD HH:mm:ss'
      ],
      example: 'YYYY-MM-DD HH:mm:ss'
    }
  },
  // Schedule Trigger
  schedule: {
    timezone: {
      title: 'How to create Timezone?',
      steps: [
        'Timezone tells the scheduler which local time zone to use when running this workflow.',
        '',
        'Step 1: Decide where this schedule should be based.',
        '• If the report is for your team, use your team’s primary location.',
        '• Example: India team → Asia/Kolkata, US East team → America/New_York.',
        '',
        'Step 2: Pick a timezone from the dropdown.',
        '• Common options include India (Asia/Kolkata), UTC, US (America/New_York), Europe (Europe/London).',
        '• All times you set in the Time field will be interpreted in this timezone.',
        '',
        'Step 3: Keep it stable for users.',
        '• Avoid changing timezone frequently—otherwise the run time will appear to jump.',
        '• For global teams, prefer UTC and adjust reports/notifications on the receiving side.'
      ],
      example: 'Asia/Kolkata'
    }
  },
  // Kubernetes
  kubernetes: {
    apiServer: {
      title: 'Kubernetes API Server URL – Step-by-Step',
      steps: [
        '1️⃣ Method 1: From kubeconfig',
        '   Open ~/.kube/config file',
        '   Find "server" field under "clusters"',
        '   Copy the URL',
        '   Format: https://kubernetes.example.com:6443',
        '',
        '2️⃣ Method 2: Using kubectl',
        '   Run: kubectl cluster-info',
        '   Shows the Kubernetes master URL',
        '   Copy the URL',
        '',
        '3️⃣ Method 3: Cloud Providers',
        '   GKE:',
        '   gcloud container clusters describe CLUSTER_NAME --zone ZONE --format="value(endpoint)"',
        '',
        '   EKS:',
        '   aws eks describe-cluster --name CLUSTER_NAME --query "cluster.endpoint"',
        '',
        '   AKS:',
        '   az aks show --resource-group RG --name CLUSTER --query "fqdn"',
        '',
        '4️⃣ Use the API Server URL',
        '   Paste it into the API Server URL field above',
        '   Include https:// and port',
        '',
        'Example:',
        'https://kubernetes.example.com:6443'
      ],
      example: 'https://kubernetes.example.com:6443'
    },
    token: {
      title: 'Kubernetes Bearer Token – Step-by-Step',
      steps: [
        '1️⃣ Method 1: From kubeconfig',
        '   Open ~/.kube/config file',
        '   Find "token" in user section',
        '   Copy the token',
        '',
        '2️⃣ Method 2: Service Account Token',
        '   Create service account:',
        '   kubectl create serviceaccount myuser',
        '',
        '   Get token:',
        '   kubectl get secret $(kubectl get sa myuser -o jsonpath=\'{.secrets[0].name}\') -o jsonpath=\'{.data.token}\' | base64 -d',
        '',
        '3️⃣ Method 3: From Running Pod',
        '   If in a pod, token is at:',
        '   /var/run/secrets/kubernetes.io/serviceaccount/token',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Bearer Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
      ],
      example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines the action you want to perform on the cluster.',
        '',
        'Examples:',
        '• List Pods / Get Pod',
        '• List Deployments / Get Deployment',
        '• Create or Update Deployment',
        '• Scale or Restart Deployment',
        '• List Services / Get Service',
        '• Get Pod Logs',
        '',
        'Choose the action that matches your workflow step.'
      ],
      example: 'list_pods'
    },
    namespace: {
      title: 'How to set Namespace?',
      steps: [
        'Namespace is where the resource lives.',
        '',
        'Common values:',
        '• default (most common)',
        '• kube-system (system resources)',
        '• production / staging / dev (custom)',
        '',
        'How to find it:',
        '• kubectl get namespaces',
        '• Kubernetes dashboard',
        '• Ask your cluster admin'
      ],
      example: 'default'
    },
    resourceName: {
      title: 'How to get Resource Name?',
      steps: [
        'Resource Name is the name of the pod, deployment, or service.',
        '',
        'How to find it:',
        '• kubectl get pods / deployments / services',
        '• Kubernetes dashboard resource list',
        '• From a previous list operation output'
      ],
      example: 'backend-api'
    },
    deploymentManifest: {
      title: 'How to provide Deployment Manifest (JSON)?',
      steps: [
        'Deployment Manifest defines the deployment you want to create or update.',
        '',
        'You can convert YAML to JSON or build JSON directly.',
        'Minimum fields: apiVersion, kind, metadata.name, spec',
        '',
        'Tip: Validate your manifest before submitting.'
      ],
      example: '{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"name":"backend-api"},"spec":{"replicas":2}}'
    },
    replicas: {
      title: 'How to set Replicas?',
      steps: [
        'Replicas is the number of pods you want running.',
        '',
        'Use it for scale operations.',
        'Example: 3 = run three pod replicas.'
      ],
      example: '3'
    }
  },
  // Snowflake
  snowflake: {
    account: {
      title: 'Snowflake Account Identifier – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your Snowflake account',
        '',
        '2️⃣ Get Account from URL',
        '   Look at the URL after logging in',
        '   Format: app.snowflake.com/ACCOUNT/...',
        '   The ACCOUNT part is your account identifier',
        '',
        '3️⃣ Alternative: From Account Settings',
        '   Click your username (top right)',
        '   Click "Account"',
        '   Find "Account Locator"',
        '',
        '4️⃣ Account Format',
        '   Can be: xy12345 (simple)',
        '   Or: organization-account (full)',
        '   Example: mycompany-abc123',
        '',
        '5️⃣ Use the Account',
        '   Paste it into the Account field above',
        '',
        'Examples:',
        'xy12345',
        'mycompany-abc123'
      ],
      example: 'xy12345'
    },
    username: {
      title: 'Snowflake Username – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Your Snowflake Login Username',
        '   This is the username you use to log in',
        '   Go to: app.snowflake.com',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'myuser'
      ],
      example: 'myuser'
    },
    password: {
      title: 'Snowflake Password – Step-by-Step',
      steps: [
        '1️⃣ Your Snowflake Login Password',
        '   This is the password for your username',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Consider using key pair authentication for enhanced security'
      ],
      example: 'YourSecurePassword123!'
    },
    warehouse: {
      title: 'Snowflake Warehouse Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Warehouses',
        '   Click "Warehouses" in left sidebar',
        '   You\'ll see list of warehouses',
        '',
        '3️⃣ Get Warehouse Name',
        '   Warehouse name is shown in the list',
        '   Common default: COMPUTE_WH',
        '   Or create new: Click "Create"',
        '',
        '4️⃣ Use the Warehouse Name',
        '   Paste it into the Warehouse field above',
        '',
        'Examples:',
        'COMPUTE_WH',
        'ANALYTICS_WH'
      ],
      example: 'COMPUTE_WH'
    },
    database: {
      title: 'Snowflake Database Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ Open Snowflake',
        '   Go to 👉 https://app.snowflake.com',
        '   Sign in to your account',
        '',
        '2️⃣ View Databases',
        '   Click "Databases" in left sidebar',
        '   You\'ll see list of databases',
        '',
        '3️⃣ Get Database Name',
        '   Database name is shown in the list',
        '   Or create new: Click "Create"',
        '',
        '4️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '   Case-sensitive in Snowflake',
        '',
        'Examples:',
        'SNOWFLAKE_SAMPLE_DATA',
        'MY_DATABASE'
      ],
      example: 'SNOWFLAKE_SAMPLE_DATA'
    },
    schema: {
      title: 'Snowflake Schema Name – Step-by-Step',
      url: 'https://app.snowflake.com',
      steps: [
        '1️⃣ In Snowflake Database',
        '   After selecting database',
        '   Expand the database in left sidebar',
        '',
        '2️⃣ View Schemas',
        '   You\'ll see list of schemas',
        '   Common default: PUBLIC',
        '',
        '3️⃣ Get Schema Name',
        '   Schema name is shown',
        '   Or create new: Right-click → "Create Schema"',
        '',
        '4️⃣ Use the Schema Name',
        '   Paste it into the Schema field above',
        '   Default: PUBLIC',
        '   Case-sensitive in Snowflake',
        '',
        'Examples:',
        'PUBLIC',
        'SCHEMA1'
      ],
      example: 'PUBLIC'
    }
  },
  // TimescaleDB (similar to PostgreSQL)
  timescaledb_legacy_unused: {
    host: {
      title: 'TimescaleDB Host – Step-by-Step',
      steps: [
        '1️⃣ Get TimescaleDB Server Address',
        '   From your hosting provider',
        '   Or from your database configuration',
        '   Format: hostname or IP address',
        '',
        '2️⃣ Use the Host',
        '   Paste it into the Host field above',
        '   Examples: localhost, timescale.example.com',
        '',
        'Examples:',
        'localhost',
        'timescale.example.com',
        '192.168.1.100'
      ],
      example: 'localhost'
    },
    database: {
      title: 'TimescaleDB Database Name – Step-by-Step',
      steps: [
        '1️⃣ Connect to TimescaleDB',
        '   Use psql or database client',
        '   Or check with your DBA',
        '',
        '2️⃣ List Databases',
        '   Run: \\l in psql',
        '   Or: SELECT datname FROM pg_database;',
        '',
        '3️⃣ Use the Database Name',
        '   Paste it into the Database field above',
        '',
        'Examples:',
        'mydb',
        'timeseries_db'
      ],
      example: 'mydb'
    },
    username: {
      title: 'TimescaleDB Username – Step-by-Step',
      steps: [
        '1️⃣ Get Database Username',
        '   From your database administrator',
        '   Or from your connection settings',
        '   Common default: postgres',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '',
        'Example:',
        'postgres'
      ],
      example: 'postgres'
    },
    password: {
      title: 'TimescaleDB Password – Step-by-Step',
      steps: [
        '1️⃣ Get Database Password',
        '   From your database administrator',
        '   Or reset in database settings',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  // GraphQL
  graphql: {
    url: {
      title: 'GraphQL Endpoint URL',
      steps: [
        'Use the full GraphQL endpoint URL, including https:// and the path.',
        'The runtime sends this node as an HTTP POST request to that URL.',
        'Common examples:',
        'https://api.github.com/graphql',
        'https://yourstore.myshopify.com/admin/api/2024-01/graphql.json',
        'https://api.example.com/graphql',
        '',
        'Use {{$json.graphqlUrl}} when a previous node provides the endpoint.',
        'Later nodes can inspect the final URL at {{$json.url}}.'
      ],
      example: 'https://api.example.com/graphql'
    },
    query: {
      title: 'GraphQL Query or Mutation',
      steps: [
        'Paste the GraphQL document that the API should run.',
        'Use query for reads and mutation for writes.',
        'Prefer variables such as $customerId instead of placing mapped values directly in the query text.',
        '',
        'Example:',
        'query GetCustomer($id: ID!) { customer(id: $id) { id email } }',
        '',
        'Results usually appear under {{$json.body.data}}.',
        'GraphQL validation errors usually appear under {{$json.body.errors}}.'
      ],
      example: 'query GetCustomer($id: ID!) { customer(id: $id) { id email } }'
    },
    operationName: {
      title: 'Operation Name',
      steps: [
        'Fill this only when the query text contains more than one named operation.',
        'Type the exact name from the query document, such as GetCustomer or CreateOrder.',
        'Do not include the word query, mutation, parentheses, or braces.',
        '',
        'Leave it blank when the Query field contains a single operation.'
      ],
      example: 'GetCustomer'
    },
    variables: {
      title: 'GraphQL Variables JSON',
      steps: [
        'Enter a JSON object whose keys match variables in the Query field.',
        'Example:',
        '{"id":"{{$json.customerId}}"}',
        '',
        'If Variables is blank, invalid JSON, or cannot be parsed after mapping, runtime silently sends {}.',
        'Use {{$json.variables}} only when the previous node already produced a valid object.'
      ],
      example: '{"id":"{{$json.customerId}}"}'
    },
    headers: {
      title: 'GraphQL Headers JSON',
      steps: [
        'Use a JSON object for request headers.',
        'Common headers are Content-Type, Authorization, Accept, and tenant IDs.',
        '',
        'Example:',
        '{"Authorization":"Bearer {{$json.accessToken}}","Content-Type":"application/json"}',
        '',
        'Prefer secure secret or credential references for long-lived tokens.'
      ],
      example: '{"Authorization":"Bearer {{$json.accessToken}}","Content-Type":"application/json"}'
    },
    timeout: {
      title: 'GraphQL Timeout',
      steps: [
        'Enter the maximum wait time in milliseconds.',
        'Default is 30000, which means 30 seconds.',
        'Increase it for slow report queries and lower it for webhook-style workflows that must answer quickly.',
        'Timeout failures come back through the wrapped HTTP Request error output as {{$json._error}}.'
      ],
      example: '30000'
    }
  },
  // QuickBooks
  quickbooks: {
    clientId: {
      title: 'QuickBooks Client ID – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ Open Intuit Developer',
        '   Go to 👉 https://developer.intuit.com',
        '   Sign in with your Intuit account',
        '',
        '2️⃣ Go to My Apps',
        '   Click "My Apps" in top menu',
        '   Or go to: developer.intuit.com/app/developer/myapps',
        '',
        '3️⃣ Create or Select App',
        '   Click "Create an app" or select existing',
        '   Choose "QuickBooks Online"',
        '',
        '4️⃣ Get Client ID',
        '   In app settings, find "Keys" section',
        '   Copy the "Client ID" (OAuth 2.0 Client ID)',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'Q0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'Q0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'QuickBooks Client Secret – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ In Intuit Developer App Settings',
        '   After getting Client ID',
        '   In "Keys" section',
        '',
        '2️⃣ Get Client Secret',
        '   Copy the "Client Secret"',
        '   ⚠️ Keep it secure!',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'QuickBooks OAuth Access Token – Step-by-Step',
      url: 'https://developer.intuit.com',
      steps: [
        '1️⃣ Complete OAuth 2.0 Flow',
        '   Use Client ID and Client Secret',
        '   Redirect to QuickBooks authorization',
        '   User grants permissions',
        '',
        '2️⃣ Get Authorization Code',
        '   After user authorizes',
        '   You\'ll receive authorization code',
        '',
        '3️⃣ Exchange for Access Token',
        '   POST to: https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        '   Include: client_id, client_secret, code, redirect_uri',
        '',
        '4️⃣ Copy Access Token',
        '   From OAuth response',
        '   Copy the access_token',
        '   ⚠️ Token expires - use refresh token',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...'
      ],
      example: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...'
    },
    refreshToken: {
      title: 'QuickBooks Refresh Token – Step-by-Step',
      steps: [
        '1️⃣ From OAuth Response',
        '   When exchanging authorization code',
        '   Response includes refresh_token',
        '',
        '2️⃣ Copy Refresh Token',
        '   Copy the refresh_token',
        '   Use to get new access tokens',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Refresh Token field above',
        '   Never share publicly',
        '',
        'Example:',
        'L011xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'L011xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    companyId: {
      title: 'QuickBooks Company ID (Realm ID) – Step-by-Step',
      steps: [
        '1️⃣ From OAuth Response',
        '   After OAuth flow completes',
        '   Response includes realmId',
        '',
        '2️⃣ Alternative: From API Call',
        '   Call: GET /v3/company/{companyId}/companyinfo/{companyId}',
        '   Company ID is in the URL',
        '',
        '3️⃣ Use the Company ID',
        '   Paste it into the Company ID field above',
        '   Format: numeric ID',
        '',
        'Example:',
        '123456789'
      ],
      example: '123456789'
    }
  },
  // YouTube (additional fields)
  // SQLite
  sqlite: {
    databasePath: {
      title: 'SQLite Database Path – Step-by-Step',
      steps: [
        '1️⃣ SQLite Database File',
        '   SQLite uses a single file for database',
        '   File extension: .db or .sqlite',
        '',
        '2️⃣ Get Database Path',
        '   Absolute path: /path/to/database.db',
        '   Relative path: ./database.db',
        '   Or from your application config',
        '',
        '3️⃣ Use the Database Path',
        '   Paste it into the Database Path field above',
        '   Include full path if not in same directory',
        '',
        'Examples:',
        '/var/db/myapp.db',
        './data/database.db',
        'C:\\data\\database.db'
      ],
      example: '/var/db/myapp.db'
    }
  },
  // DevOps Tools
  gitlab: {
    accessToken: {
      title: 'GitLab Personal Access Token – Step-by-Step',
      url: 'https://gitlab.com',
      steps: [
        '1️⃣ Open GitLab',
        '   Go to 👉 https://gitlab.com',
        '   Or your GitLab instance URL',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Access Tokens',
        '   Click your profile icon (top right)',
        '   Click "Preferences" or "User Settings"',
        '   Click "Access Tokens" in left sidebar',
        '',
        '3️⃣ Create New Token',
        '   Click "Add new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Set expiration date (optional)',
        '',
        '4️⃣ Select Scopes',
        '   Select required scopes:',
        '   • api (full API access)',
        '   • read_repository (read repos)',
        '   • write_repository (write repos)',
        '',
        '5️⃣ Create and Copy Token',
        '   Click "Create personal access token"',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   Token starts with "glpat-"',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Prefer saving it in Connections so the credential vault can supply it at runtime',
        '   If you paste it into this node, paste it into Access Token',
        '   Never commit it to version control',
        '',
        'Example:',
        'glpat-xxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'glpat-xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    baseUrl: {
      title: 'GitLab URL (Base URL) – Step-by-Step',
      steps: [
        '• GitLab.com: Leave as https://gitlab.com (or the default value).',
        '',
        '• Self-hosted: Open your GitLab in the browser and copy the domain from the address bar.',
        '  Example: https://gitlab.company.com',
        '  Do not include path or trailing slash.',
        '',
        'Paste it into the GitLab URL field above.'
      ],
      example: 'https://gitlab.com'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        'This GitLab action node supports only two issue operations today:',
        '',
        '• Read/List Issues - Choose this to list project issues or read one issue. Fill Project ID. Leave Issue IID blank to list issues, or enter an Issue IID to fetch one issue.',
        '',
        '• Create Issue - Choose this to open a new project issue. Fill Project ID, Title, and optional Description Text.',
        '',
        'Merge requests, pipelines, branches, files, and releases are not supported by this action executor today.'
      ],
      example: 'Create Issue'
    },
    projectId: {
      title: 'GitLab Project ID – Step-by-Step',
      steps: [
        'Method 1 – Numeric ID:',
        '1. Open your GitLab project in the browser',
        '2. Go to Settings → General',
        '3. Under "Project ID", copy the numeric ID (e.g. 12345)',
        '4. Paste into the Project ID field above',
        '',
        'Method 2 – Path:',
        '1. Look at the project URL: https://gitlab.com/group/project-name',
        '2. The path is group/project-name (or username/project-name)',
        '3. Use that as Project ID, e.g. mygroup/myproject',
        '4. Some setups require URL-encoding the slash (mygroup%2Fmyproject)',
        '',
        'Example: 12345 or mygroup/myproject'
      ],
      example: '12345 or group/project'
    },
    title: {
      title: 'How to get Title?',
      steps: [
        'You type or provide the title—the headline for the issue or merge request.',
        '',
        '• Static: Type it directly, e.g. "Login Bug", "Add API documentation"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.subject}} or "Deploy: {{trigger.env}}"',
        '',
        'Required for Create Issue and Create Merge Request. Ignored for other operations.'
      ],
      example: 'Login Bug'
    },
    descriptionText: {
      title: 'How to get Description?',
      steps: [
        'You type or provide the description—the detailed explanation of the GitLab issue. Markdown supported.',
        '',
        '• Static: Type or paste directly. You can use Markdown.',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Optional for Create Issue. The runtime reads Description Text / descriptionText, not the old description field.'
      ],
      example: 'Issue description'
    },
    sourceBranch: {
      title: 'How to get Source Branch?',
      steps: [
        'You type the branch name—the branch that contains your changes (the "source" of the merge request).',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression if your workflow created the branch earlier, e.g. {{createBranchNode.name}}',
        '',
        'In the project, open the branch dropdown and copy the branch name to confirm.',
        '',
        'Required for Create Merge Request. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    targetBranch: {
      title: 'How to get Target Branch?',
      steps: [
        'You type the branch name—the branch you want to merge into (usually main or master).',
        '',
        '• Static: Type it directly, e.g. main, master, develop',
        '',
        'In the project, open the branch dropdown; the default branch is often shown first. Copy that name.',
        '',
        'Required for Create Merge Request. Ignored for other operations.'
      ],
      example: 'main'
    },
    triggerToken: {
      title: 'GitLab Trigger Token – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to Settings → CI/CD',
        '',
        '3️⃣ Expand "Pipeline triggers" section',
        '',
        '4️⃣ Click "Add trigger" (or use an existing one)',
        '',
        '5️⃣ Give it a description and click "Create trigger"',
        '',
        '6️⃣ Copy the "Trigger token" value shown',
        '   This is different from your Personal Access Token—it is used only to trigger pipelines for this project',
        '',
        '7️⃣ Paste into the Trigger Token field above'
      ],
      example: 'Your pipeline trigger token'
    },
    ref: {
      title: 'GitLab Branch/Ref – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click the branch dropdown',
        '   Copy the branch name you want (e.g. main, develop)',
        '',
        '3️⃣ Paste into the Branch/Ref (or Ref/Branch) field above',
        '',
        'Used for Trigger Pipeline (which branch to run on), Create Branch (source ref), List Branches, and file operations. Default is often main.',
        '',
        'Example: main'
      ],
      example: 'main'
    },
    pipelineId: {
      title: 'GitLab Pipeline ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to CI/CD → Pipelines',
        '',
        '3️⃣ Click on a pipeline to open its details',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../pipelines/12345',
        '   The number after /pipelines/ is the Pipeline ID',
        '',
        '5️⃣ Or use List Pipelines first; each pipeline in the response has an "id" field',
        '',
        '6️⃣ Paste into the Pipeline ID field above',
        '',
        'Example: 12345'
      ],
      example: '12345'
    },
    issueIid: {
      title: 'GitLab Issue IID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click Issues',
        '',
        '3️⃣ Open the issue you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../issues/123',
        '   The number after /issues/ is the Issue IID',
        '',
        '5️⃣ Or look at the issue title',
        '   It shows #123 — the number is 123',
        '',
        '6️⃣ Enter only the number (e.g. 123), not #123',
        '',
        'Example: 123'
      ],
      example: '123'
    },
    mrIid: {
      title: 'GitLab Merge Request IID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Click Merge Requests',
        '',
        '3️⃣ Open the merge request you want',
        '',
        '4️⃣ Look at the URL',
        '   Format: .../merge_requests/456',
        '   The number after /merge_requests/ is the MR IID',
        '',
        '5️⃣ Or look at the MR title',
        '   It often shows !456 — the number is 456',
        '',
        '6️⃣ Enter only the number (e.g. 456)',
        '',
        'Example: 456'
      ],
      example: '456'
    },
    stateEvent: {
      title: 'How to get State Event?',
      steps: [
        'You choose from the dropdown in this node: Close or Reopen.',
        '',
        '• Close – Marks the issue or merge request as closed.',
        '• Reopen – Reopens a closed issue or MR.',
        '',
        'Used for Update Issue and Update Merge Request. Ignored for other operations.'
      ],
      example: 'close'
    },
    mergeCommitMessage: {
      title: 'How to get Merge Commit Message?',
      steps: [
        'You type or provide the message—optional. Used as the merge commit message when merging a merge request.',
        '',
        '• Leave empty to use GitLab’s default merge commit message.',
        '',
        'Used only for Merge Merge Request. Ignored for other operations.'
      ],
      example: 'Merge commit message'
    },
    jobId: {
      title: 'GitLab Job ID – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project',
        '',
        '2️⃣ Go to CI/CD → Pipelines',
        '',
        '3️⃣ Click on a pipeline to view its jobs',
        '',
        '4️⃣ Click on a specific job',
        '',
        '5️⃣ Look at the URL',
        '   Format: .../jobs/789',
        '   The number after /jobs/ is the Job ID',
        '',
        '6️⃣ Or use Get Pipeline Jobs first; each job in the response has an "id" field',
        '',
        '7️⃣ Paste into the Job ID field above',
        '',
        'Example: 789'
      ],
      example: '789'
    },
    branchName: {
      title: 'How to get Branch Name?',
      steps: [
        'You type the branch name—the name you want for a new branch, or the name of the branch to delete or use for file operations.',
        '',
        '• Static: Type it directly, e.g. feature-ai, fix/login-bug',
        '',
        '• Dynamic: Use an expression if your workflow created the branch earlier',
        '',
        'In the project, open the branch dropdown and copy the branch name to confirm.',
        '',
        'Used for Create Branch, Delete Branch, Get File, Create File, Update File, Delete File. Ignored for other operations.'
      ],
      example: 'feature-branch'
    },
    filePath: {
      title: 'GitLab File Path – Step-by-Step',
      steps: [
        '1️⃣ Open your GitLab project and navigate to the file (or folder where you want to create it)',
        '',
        '2️⃣ Look at the URL or breadcrumb',
        '   The path after the branch name is the File Path',
        '   e.g. docs/readme.md, src/utils.js',
        '',
        '3️⃣ Or build it: folder(s) + filename',
        '   Use forward slashes (/). No leading slash.',
        '',
        '4️⃣ Paste into the File Path field above',
        '',
        'Example: docs/readme.md'
      ],
      example: 'src/file.js'
    },
    fileData: {
      title: 'How to get File Content?',
      steps: [
        'You provide the content—the exact text (or encoded content) to write to the file.',
        '',
        '• From a previous step: Use output from another node (e.g. generated doc, report), e.g. {{aiNode.content}} or {{readFileNode.content}}.',
        '',
        '• Static: Type or paste text.',
        '',
        'Required for Create File and Update File. Ignored for other operations.'
      ],
      example: 'File content'
    },
    commitMessage: {
      title: 'How to get Commit Message?',
      steps: [
        'You type or provide the message—a short description of the file change.',
        '',
        '• Static: Type it directly, e.g. "Updated API documentation", "Add AI docs"',
        '',
        '• Dynamic: Use an expression, e.g. "Deploy {{trigger.env}}" or {{aiNode.summary}}',
        '',
        'Required for Create File, Update File, Delete File. Ignored for other operations.'
      ],
      example: 'Updated API documentation'
    }
  },
  jenkins: {
    baseUrl: {
      title: 'How to get Jenkins URL?',
      steps: [
        'Jenkins URL is the base address of your Jenkins server.',
        '',
        'Example: https://jenkins.example.com',
        '',
        'Tip: Include https:// or http:// and remove any extra paths.'
      ],
      example: 'https://jenkins.example.com'
    },
    username: {
      title: 'Jenkins Username – Step-by-Step',
      steps: [
        '1️⃣ Get Jenkins Username',
        '   From your Jenkins administrator',
        '   Or from Jenkins user management',
        '   Usually your login username',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need API Token',
        '',
        'Example:',
        'jenkins-user'
      ],
      example: 'jenkins-user'
    },
    apiToken: {
      title: 'Jenkins API Token – Step-by-Step',
      steps: [
        '1️⃣ Log in to Jenkins',
        '   Go to your Jenkins instance',
        '   Sign in with your account',
        '',
        '2️⃣ Go to User Profile',
        '   Click your username (top right)',
        '   Click "Configure"',
        '',
        '3️⃣ Generate API Token',
        '   Scroll to "API Token" section',
        '   Click "Add new Token"',
        '   Give it a name',
        '',
        '4️⃣ Copy API Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '',
        'Example:',
        '11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: '11xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation tells Jenkins what action to run.',
        '',
        'Supported options in this runtime:',
        '• Build Job - starts the Jenkins job. Fill Job Name and optional Parameters.',
        '• Get Build Status - reads lastBuild when Build Number is empty, or a specific build when you enter Build Number.',
        '• Cancel Build - stops a specific build. Fill Job Name and Build Number.',
        '',
        'The old polling/log/list operations are not executed by this node today.'
      ],
      example: 'build'
    },
    jobName: {
      title: 'How to get Job Name?',
      steps: [
        'Open the Jenkins dashboard.',
        'Click the job you want.',
        '',
        'The job name appears in the page title and URL:',
        'https://jenkins.example.com/job/JOB-NAME/',
        '',
        'Tip: For folder jobs, use format: folder/job-name'
      ],
      example: 'deploy-backend'
    },
    buildNumber: {
      title: 'How to get Build Number?',
      steps: [
        'Build number comes from the job’s build history.',
        '',
        'Open the job → Build History',
        'Copy the number (e.g., #25).'
      ],
      example: '25'
    },
    parameters: {
      title: 'How to set Build Parameters (JSON)?',
      steps: [
        'Build Parameters are used only for parameterized jobs.',
        '',
        'Enter a JSON object with parameter names and values.',
        'Example: {"ENV":"production","VERSION":"1.2.3"}',
        '',
        'Tip: If the job is not parameterized, leave this empty.'
      ],
      example: '{"ENV":"production","VERSION":"1.2.3"}'
    },
    pollInterval: {
      title: 'What is Poll Interval?',
      steps: [
        'Poll Interval is how often (in seconds) the workflow checks build status.',
        '',
        'Common values: 5–15 seconds.',
        'Use longer intervals for very long builds.'
      ],
      example: '10'
    },
    maxPollAttempts: {
      title: 'What is Max Poll Attempts?',
      steps: [
        'Max Poll Attempts limits how many times to check build status.',
        '',
        'Example: 60 attempts with 10s interval = 10 minutes total.',
        'Increase if your builds take longer.'
      ],
      example: '60'
    }
  },
  vercel: {
    token: {
      title: 'Vercel API Token - Step-by-Step',
      url: 'https://vercel.com/account/tokens',
      steps: [
        '1. Open Vercel Account Settings -> Tokens.',
        '2. Create a token for this workflow, or use an existing saved Vercel connection.',
        '3. Prefer storing the token in Connections so the credential vault can provide it.',
        '4. If you paste it into this node, paste it into Token only.',
        '5. Test the token against https://api.vercel.com/v13/deployments before using it in production.',
        '',
        'The token must stay secret. Do not map customer data or normal workflow text into this field.'
      ],
      example: 'vercel_xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose Deploy Project when you want Vercel to create a deployment for a project.',
        '',
        'Choose List Deployments when you want to read recent deployments from the account.',
        '',
        'Deploy Project requires Project Name. List Deployments only needs the token or saved Vercel connection.',
        '',
        'Unsupported values return INVALID_OPERATION.'
      ],
      example: 'deploy'
    },
    projectName: {
      title: 'How to get Project Name?',
      steps: [
        'Open the project in Vercel and copy the project slug/name from the project settings or URL.',
        '',
        'Example URL: https://vercel.com/acme/marketing-site',
        'Project Name: marketing-site',
        '',
        'Use a previous step only when it outputs the exact Vercel project name. Deploy fails with INVALID_PROJECT_NAME when this is empty or malformed.'
      ],
      example: 'marketing-site'
    }
  },
  netlify: {
    accessToken: {
      title: 'Netlify Personal Access Token - Step-by-Step',
      url: 'https://app.netlify.com/user/applications#personal-access-tokens',
      steps: [
        '1. Open Netlify User Settings -> Applications -> Personal access tokens.',
        '2. Create a token for CtrlChecks, or use a saved Netlify connection.',
        '3. Prefer saving it in Connections so the credential vault stores it securely.',
        '4. If you paste it into this node, paste it into Access Token only.',
        '5. Test it against https://api.netlify.com/api/v1/sites before using it in production.',
        '',
        'Missing or expired tokens return Missing Access Token or a Netlify API error.'
      ],
      example: 'nfp_xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Choose List Sites to read sites in the Netlify account.',
        'Choose Get Site when you already have a Site ID.',
        'Choose Create Deploy to create a deploy for a Site ID using a JSON Payload.',
        'Choose List Deploys to read deploys for a Site ID.',
        'Choose Get Deploy when you already have a Deploy ID.',
        '',
        'Forms are not returned by this node today.'
      ],
      example: 'list_sites'
    },
    resource: {
      title: 'How to choose Resource?',
      steps: [
        'Choose Sites for List Sites, Get Site, or Create Deploy.',
        'Choose Deploys for List Deploys or Get Deploy.',
        '',
        'The runtime echoes this value in the output as resource. It does not enable Netlify forms today.'
      ],
      example: 'sites'
    },
    siteId: {
      title: 'How to get Site ID?',
      steps: [
        'Open the Netlify site dashboard.',
        'Go to Site configuration -> General -> Site details.',
        'Copy the API ID / Site ID.',
        '',
        'Use Site ID for Get Site, Create Deploy, and List Deploys.'
      ],
      example: 'site_1234567890abcdef'
    },
    deployId: {
      title: 'How to get Deploy ID?',
      steps: [
        'Open the Netlify site dashboard and go to Deploys.',
        'Open the deploy you want to inspect.',
        'Copy the deploy ID from the deploy details or URL.',
        '',
        'Get Deploy requires Deploy ID.'
      ],
      example: 'deploy_1234567890abcdef'
    },
    payload: {
      title: 'How to set Deploy Payload?',
      steps: [
        'Enter a JSON object for Netlify create_deploy.',
        '',
        'Use this only when you know the Netlify deploy API body you need.',
        'Map files, draft flags, or deploy options from earlier workflow steps only if they are already valid JSON.',
        '',
        'Invalid JSON fails before Netlify can create the deploy.'
      ],
      example: '{"draft":true}'
    },
    limit: {
      title: 'How to set Limit?',
      steps: [
        'Enter the maximum number of records to return for list operations.',
        '',
        'Use a smaller number for quick checks and a larger number when the next step needs more history.',
        'If empty, the runtime uses its default list behavior.'
      ],
      example: '20'
    }
  },
  pagerduty: {
    apiKey: {
      title: 'PagerDuty API Key – Step-by-Step',
      url: 'https://app.pagerduty.com',
      steps: [
        '1️⃣ Open PagerDuty',
        '   Go to 👉 https://app.pagerduty.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to API Access Keys',
        '   Click "Configuration" → "API"',
        '   Click "API Access Keys"',
        '',
        '3️⃣ Create New API Key',
        '   Click "Create New API Key"',
        '   Give it a description (e.g., "Workflow Integration")',
        '   Select authorization level (Read-only or Full)',
        '',
        '4️⃣ Copy API Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation defines what action you want to perform.',
        '',
        'Common operations:',
        '• Create / Update / Get Incident',
        '• Acknowledge / Resolve Incident',
        '• List On-Calls or Schedules',
        '',
        'Pick the action that matches your workflow step.'
      ],
      example: 'create_incident'
    },
    incidentId: {
      title: 'How to get Incident ID?',
      steps: [
        'Open the incident in PagerDuty.',
        '',
        'The ID appears in the URL:',
        'app.pagerduty.com/incidents/INCIDENT_ID',
        '',
        'Copy the ID from the URL or incident header.'
      ],
      example: 'QWER456'
    },
    title: {
      title: 'How to write Incident Title?',
      steps: [
        'Title should be short and actionable.',
        '',
        'Example: "Database connection failure"',
        'Tip: Include the system and the problem.'
      ],
      example: 'Database connection failure'
    },
    serviceId: {
      title: 'How to get Service ID?',
      steps: [
        'Go to PagerDuty → Services.',
        'Click the service you want.',
        '',
        'The ID appears in the URL:',
        'app.pagerduty.com/services/SERVICE_ID',
        '',
        'Copy that ID into this field.'
      ],
      example: 'PABC123'
    },
    urgency: {
      title: 'How to set Urgency?',
      steps: [
        'Urgency defines how critical the incident is.',
        '',
        'Values:',
        '• high – immediate attention',
        '• low – less urgent',
        '',
        'Use high only for real critical issues.'
      ],
      example: 'high'
    },
    status: {
      title: 'How to set Status?',
      steps: [
        'Status is used when updating an incident.',
        '',
        'Values:',
        '• triggered',
        '• acknowledged',
        '• resolved'
      ],
      example: 'acknowledged'
    },
    escalationPolicyId: {
      title: 'How to get Escalation Policy ID?',
      steps: [
        'Go to PagerDuty → Escalation Policies.',
        'Open the policy you need.',
        '',
        'Copy the ID from the URL:',
        'app.pagerduty.com/escalation_policies/ESCALATION_ID'
      ],
      example: 'EP12345'
    },
    assigneeId: {
      title: 'How to get Assignee User ID?',
      steps: [
        'Open the user profile in PagerDuty.',
        '',
        'Copy the user ID from the URL:',
        'app.pagerduty.com/users/USER_ID'
      ],
      example: 'U123ABC'
    },
    note: {
      title: 'How to add a Note?',
      steps: [
        'Add a short note when acknowledging or resolving.',
        '',
        'Example: "Investigating database latency."',
        'Tip: Keep notes concise and actionable.'
      ],
      example: 'Investigating database latency.'
    },
    scheduleId: {
      title: 'How to get Schedule ID?',
      steps: [
        'Go to PagerDuty → Configuration → Schedules.',
        'Open the schedule.',
        '',
        'Copy the ID from the URL:',
        'app.pagerduty.com/schedules/SCHEDULE_ID'
      ],
      example: 'PSCHED123'
    }
  },
  http_post: {
    url: {
      title: 'HTTP POST URL',
      steps: [
        'URL is the full endpoint where the POST request is sent.',
        'Include https:// and the API path.',
        'Map dynamic pieces with {{$json.field}} if the endpoint depends on upstream data.',
        '',
        'Examples:',
        'https://api.example.com/create-user',
        'https://hooks.service.com/trigger?id={{$json.id}}',
        '',
        'The final URL is returned as {{$json.url}}.'
      ],
      example: 'https://api.example.com/create-user'
    },
    headers: {
      title: 'HTTP POST Headers JSON',
      steps: [
        'Headers are key-value pairs for authentication and content type.',
        'Enter them as JSON, not as raw Header: value lines.',
        '',
        'Common headers:',
        'Content-Type: application/json',
        'Authorization: Bearer {{$json.accessToken}}',
        '',
        'Example JSON:',
        '{ "Content-Type": "application/json", "Authorization": "Bearer {{$json.accessToken}}" }'
      ],
      example: '{"Content-Type":"application/json","Authorization":"Bearer {{$json.accessToken}}"}'
    },
    body: {
      title: 'HTTP POST Body JSON',
      steps: [
        'Body is the request payload sent to the API.',
        '',
        'Use JSON for most APIs.',
        'Insert dynamic values with {{$json.field}}.',
        '',
        'Example:',
        '{ "event": "created", "email": "{{$json.email}}", "orderId": "{{$json.orderId}}" }',
        '',
        'Runtime rewrites this node to HTTP Request with method POST, so the response is available as {{$json.body}} and {{$json.data}}.'
      ],
      example: '{"event":"created","email":"{{$json.email}}"}'
    }
  },
  respond_to_webhook: {
    statusCode: {
      title: 'Webhook Status Code',
      steps: [
        'Status Code is the HTTP code returned to the webhook caller.',
        '',
        'Common values:',
        '200 success',
        '201 created',
        '400 bad request',
        '401 unauthorized',
        '404 not found',
        '500 server error',
        '',
        'Runtime returns this as {{$json.statusCode}} and falls back to 200 if the value is not numeric.'
      ],
      example: '200'
    },
    responseBody: {
      title: 'Response Body JSON',
      steps: [
        'Response Body is the visible field for the JSON sent back to the caller.',
        'Runtime normalizes it to {{$json.body}}.',
        '',
        'Example:',
        '{ "received": true, "orderId": "{{$json.orderId}}" }',
        '',
        'If a backend body alias is also set, body wins over responseBody.'
      ],
      example: '{"received":true,"orderId":"{{$json.orderId}}"}'
    },
    headers: {
      title: 'Response Headers JSON',
      steps: [
        'Headers are optional response headers in JSON.',
        '',
        'Common header:',
        'Content-Type: application/json',
        '',
        'Example:',
        '{ "Content-Type": "application/json" }',
        '',
        'These are response headers, not request authentication headers.'
      ],
      example: '{"Content-Type":"application/json"}'
    },
    body: {
      title: 'Backend Body Alias',
      steps: [
        'body is accepted by runtime and generated workflow JSON.',
        'The visual panel normally uses responseBody.',
        'If both body and responseBody are set, body wins.',
        'The normalized output is still {{$json.body}}.'
      ],
      example: '{"success":true}'
    }
  },
  webhook_response: {
    statusCode: {
      title: 'Webhook Response Status Code',
      steps: [
        'Status Code is the HTTP number for the caller response.',
        'Use 200 for success, 201 for created, 400 for bad request, or 500 for server failure.',
        'Runtime returns {{$json.statusCode}} and does not return a top-level responseCode.',
        'responseCode is accepted only as a compatibility alias.'
      ],
      example: '200'
    },
    body: {
      title: 'Webhook Response Body',
      steps: [
        'Body is the response payload returned to the caller.',
        'Use JSON when the caller is another API or app.',
        'Map workflow values with {{$json.field}}.',
        'If body is empty, runtime falls back to the incoming body or full input object.'
      ],
      example: '{"success":true,"ticketId":"{{$json.ticketId}}"}'
    },
    headers: {
      title: 'Webhook Response Headers',
      steps: [
        'Headers are optional response headers such as Content-Type, CORS, or Cache-Control.',
        'Use key/value rows in the panel.',
        'Runtime returns them as {{$json.headers}}.',
        'Do not put request authentication headers here.'
      ],
      example: '{"Content-Type":"application/json"}'
    }
  },
  split_in_batches: {
    array: {
      title: 'How to set Array Expression',
      steps: [
        'Array Expression points Split In Batches to the list it should divide into groups.',
        '',
        'Leave it empty only when the previous node already outputs input.items.',
        'Fill it when the list is under another field, such as {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, {{$json.messages}}, or {{$json.data.records}}.',
        '',
        'Use the full list path, not one record. Use {{$json.contacts}}, not {{$json.contacts[0]}}.',
        'The node returns every group in {{$json.batches}} and exposes the first group as {{$json.items}}.',
        '',
        'Important: the current DAG runtime does not automatically run the next branch once per batch.'
      ],
      example: '{{$json.contacts}}'
    },
    batchSize: {
      title: 'How to set Batch Size',
      steps: [
        'Batch Size is the number of records to place in each batch.',
        '',
        'Use 10 for tests, 25 or 50 for review queues, and 100 for ordinary API or spreadsheet batches.',
        'Use smaller values for strict rate limits or large records.',
        '',
        'The output includes {{$json.batchSize}}, {{$json.totalBatches}}, {{$json.batches}}, and {{$json.items}}.',
        'Blank or invalid values default to 10, and runtime enforces at least 1.',
        '',
        'Batch Size controls group size only; downstream service nodes still need their own account connection and supported batch handling.'
      ],
      example: '100'
    }
  },
  javascript: {
    code: {
      title: 'How to set JavaScript Code',
      steps: [
        'Write the script that should run on the current workflow data.',
        '',
        'Read incoming data as input, $json, or json. Use exact field names from the previous node output.',
        'Return the value the next node should receive. Return an object when downstream nodes need named fields such as customerEmail, riskScore, or eligibleForReview.',
        '',
        'Workplace example:',
        'const total = Number($json.orderTotal || 0);',
        'return { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000 };',
        '',
        'If the field is blank, runtime returns _error: JavaScript node: Code is required.',
        'JavaScript has no credentials. Do not paste API keys or passwords into code; connect downstream service accounts separately.'
      ],
      example: 'return { ...$json, processed: true };'
    },
    timeout: {
      title: 'How to set Timeout',
      steps: [
        'Timeout is the maximum time the script may run, in milliseconds.',
        '',
        'Use 5000 for ordinary quick transformations.',
        'Use 10000 when processing a larger list or calculating several totals.',
        'Runtime caps the value at 30000 even if you enter a larger number.',
        '',
        'If the script exceeds the timeout, the output can include {{$json._error}} with an execution timeout message.',
        'Raise this value only after checking that your code is not looping forever or reading the wrong field.'
      ],
      example: '10000'
    },
    outputSchema: {
      title: 'How to set Output Schema',
      steps: [
        'Output Schema is an optional JSON hint for the top-level value your code should return.',
        '',
        'Use {"type":"object"} when downstream nodes map named fields.',
        'Use {"type":"array"} when your script returns a list.',
        'Other top-level hints include string, number, and boolean.',
        '',
        'This field does not transform the output. Your JavaScript Code must still return the actual object, list, text, number, or boolean.',
        'Runtime logs a warning on mismatch today, so test the downstream mapping after changing code.'
      ],
      example: '{"type":"object"}'
    }
  },
  loop: {
    array: {
      title: 'How to set Array Expression',
      steps: [
        'Array Expression points Loop to the list it should expose as {{$json.items}}.',
        '',
        'Leave it empty only when the previous node already outputs input.items.',
        'Fill it when the list is under another field, such as {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, {{$json.messages}}, or {{$json.data.records}}.',
        '',
        'Use the full list path, not one record. Use {{$json.rows}}, not {{$json.rows[0]}}.',
        'Loop keeps other incoming fields and adds metadata under {{$json.loop}}.',
        '',
        'Important: the current DAG runtime does not run the next branch once per item. Use Function Item or a supported batch path for true per-record work.'
      ],
      example: '{{$json.rows}}'
    },
    maxIterations: {
      title: 'How to set Max Iterations',
      steps: [
        'Max Iterations is the largest number of list records Loop exposes downstream.',
        '',
        'Use small numbers such as 10 or 25 for previews, approvals, or rate-limited services.',
        'Use 100 for ordinary batches when downstream nodes can handle the volume.',
        'Use higher values only after checking the next service limits and account permissions.',
        '',
        'If the incoming list is longer than this value, Loop truncates {{$json.items}} and sets {{$json.loop.truncated}} to true.',
        'Blank or invalid values default to 100, and runtime enforces at least 1.'
      ],
      example: '25'
    }
  },
  edit_fields: {
    fields: {
      title: 'How to set Fields',
      steps: [
        'Fields are the key-value rows Edit Fields adds to the current item.',
        '',
        'Left side: type the output field name the next node should use, such as customerEmail, fullName, priorityLabel, or needsManagerReview.',
        'Right side: type the value for that field. It can be fixed text, a number, true/false, or a previous-step value such as {{$json.email}}.',
        '',
        'Every field you add becomes available after this node as {{$json.fieldName}}.',
        'If you reuse an incoming field name, Edit Fields overwrites that value.',
        'If you leave fields empty, the node usually passes the incoming item through unchanged.',
        '',
        'Edit Fields has no credentials. Connect the output to the next action, then connect that service node account separately.'
      ],
      example: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.fname}} {{$json.lname}}","priorityLabel":"High"}'
    }
  },
  set: {
    fields: {
      title: 'How to set Fields (JSON)',
      steps: [
        'Fields is the JSON object of new or replacement values that Set adds to the current item.',
        '',
        'Use keys that later nodes should read, such as customerEmail, fullName, leadSource, status, or readyForSales.',
        '',
        'Use fixed values for labels and decisions: {"status":"new_lead","readyForSales":true}.',
        'Use previous-step values when the data came from a form, webhook, sheet, CRM, or API response: {"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}"}.',
        '',
        'Every key becomes available after this node as {{$json.keyName}}.',
        'If a key already exists on the incoming item, Set overwrites that value.',
        '',
        'Set has no credentials. Connect the Set output to the next service node, then connect that service node account separately.'
      ],
      example: '{"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","leadSource":"Website demo request"}'
    }
  },
  filter: {
    array: {
      title: 'How to set Array Expression',
      steps: [
        'Array Expression is the list you want to narrow down.',
        '',
        'Leave it empty when the previous step already outputs items.',
        'Fill it when the list is under another field, such as {{$json.contacts}}, {{$json.orders}}, {{$json.rows}}, or {{$json.data.records}}.',
        '',
        'The Filter node writes the smaller list back to {{$json.items}}, while keeping other incoming fields available.',
        '',
        'Common mistake: pointing to one record instead of the list. Use {{$json.contacts}}, not {{$json.contacts[0]}}.'
      ],
      example: '{{$json.contacts}}'
    },
    condition: {
      title: 'How to set Filter Condition',
      steps: [
        'Condition is the rule each item must pass to stay in the list.',
        '',
        'Use item for the current record.',
        'Examples:',
        '- item.status === "active"',
        '- item.total >= 500',
        '- item.email && !item.email.includes("test")',
        '- item.completed !== true',
        '',
        'Use {{$json.field}} for workflow-level values outside the list, but use item.field for values inside each record.',
        '',
        'Some secured deployments disable JavaScript-style filtering; if that happens, use a source-node filter or approved Function path.'
      ],
      example: 'item.status === "active"'
    }
  },
  switch: {
    expression: {
      title: 'How to set Expression',
      steps: [
        'Expression is the previous-step value Switch checks to choose a branch.',
        '',
        'Use a field from earlier data, such as {{$json.category}}, {{$json.status}}, {{$json.region}}, or {{$json.priority}}.',
        'The resolved value is compared to each case value.',
        '',
        'Example: if {{$json.category}} resolves to billing, the billing case output runs.',
        '',
        'Common mistake: using a visible form label instead of the internal field key. Use {{$json.category}}, not "Ticket Category".'
      ],
      example: '{{$json.category}}'
    },
    cases: {
      title: 'How to set Cases',
      steps: [
        'Cases is the JSON list of branch outputs.',
        '',
        'Format:',
        '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]',
        '',
        'Value must match the expression result exactly.',
        'Value also becomes the outgoing branch handle used by connections.',
        'Label is the friendly name people see in the UI.',
        '',
        'Keep values unique. After renaming a value, re-check the outgoing branch lines.'
      ],
      example: '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"}]'
    }
  },
  if_else: {
    condition: {
      title: 'How to set a condition',
      steps: [
        'Use this only if you see an older single-condition field. Most workflows now use the Conditions builder.',
        '',
        'Choose the value from the previous node, compare it to the value that should count as a match, then connect TRUE and FALSE outputs.',
        '',
        'Examples:',
        '- $json.orderTotal >= 500',
        '- $json.status == "paid"',
        '- $json.customerTier == "VIP"',
        '',
        'For several rules, use the Conditions builder and Combine Operation instead of packing everything into one expression.'
      ],
      example: '$json.orderTotal >= 500'
    },
    conditions: {
      title: 'How to set Conditions',
      steps: [
        'Conditions decide whether the run leaves through TRUE or FALSE. Each row is one plain workplace rule.',
        '',
        'Step 1: Choose the Field to check.',
        '- Use a value from the trigger or previous node, such as $json.orderTotal, $json.status, $json.customer.plan, input.email, or input.score.',
        '- If the dropdown does not show it, choose Custom and type the field path.',
        '',
        'Step 2: Select the Operator.',
        '- equals: exact matches like status equals paid.',
        '- not_equals: exclusions like status not_equals cancelled.',
        '- greater_than: numbers above a threshold, not including the threshold.',
        '- less_than: numbers below a threshold, not including the threshold.',
        '- greater_than_or_equal: numbers at least the threshold, such as orderTotal at least 500.',
        '- less_than_or_equal: numbers up to the threshold, such as riskScore 3 or lower.',
        '- contains: text or a list includes a word, tag, or item.',
        '- not_contains: text or a list must not include a word, tag, or item.',
        '',
        'Step 3: Enter the Value to compare against.',
        '- Numbers: 18, 500, 10000.',
        '- Text: paid, approved, enterprise, urgent.',
        '- Booleans: true or false.',
        '',
        'Step 4: Connect both outputs.',
        '- TRUE goes to the matching action, such as Finance Review.',
        '- FALSE goes to the fallback action, such as Standard Fulfillment.',
        '',
        'Use JSON mode only when pasting prepared condition objects.'
      ],
      example: 'Field: $json.orderTotal, Operator: greater_than_or_equal, Value: 500'
    },
    combineOperation: {
      title: 'How to set Combine Operation',
      steps: [
        'Combine Operation decides how multiple conditions work together.',
        '',
        'AND: every condition row must be true.',
        '- Choose AND for strict routing, such as status equals paid AND orderTotal is at least 500.',
        '',
        'OR: any one condition row can be true.',
        '- Choose OR for flexible routing, such as priority equals urgent OR customerTier equals VIP.',
        '',
        'If you are not sure, use AND for stricter checks, OR for more permissive routing.'
      ],
      example: 'AND'
    }
  },
  email: {
    to: {
      title: 'How to set To',
      steps: [
        'To is the recipient address or comma-separated recipient list.',
        '',
        'Use a fixed address for internal alerts, or map a previous field such as {{$json.customerEmail}} for customer messages.',
        'Check the previous node output and map the actual email address field, not a display name or customer ID.',
        '',
        'After sending, SMTP output includes {{$json.accepted}} and {{$json.rejected}} so you can log or route delivery acceptance.'
      ],
      example: '{{$json.customerEmail}}'
    },
    subject: {
      title: 'How to set Subject',
      steps: [
        'Subject is the short title shown in the recipient inbox.',
        '',
        'Keep it short, clear, and specific.',
        'Use values such as order ID, ticket ID, invoice number, or report date when they help the recipient recognize the message.',
        'Avoid putting private details or the full message body in the subject.'
      ],
      example: 'Invoice {{$json.invoiceNumber}} is ready'
    },
    text: {
      title: 'How to write Text',
      steps: [
        'Text is the plain-text email body.',
        '',
        'Use it for simple messages and as the reliable fallback when an inbox blocks HTML.',
        'Backend marks this field required, and runtime needs either Text or HTML before sending.',
        'Map safe values from previous steps, such as {{$json.firstName}}, {{$json.orderId}}, or {{$json.invoiceUrl}}.'
      ],
      example: 'Hi {{$json.firstName}}, your invoice {{$json.invoiceNumber}} is ready: {{$json.invoiceUrl}}'
    },
    html: {
      title: 'How to write HTML',
      steps: [
        'HTML is the rich formatted version of the email body.',
        '',
        'Use simple email-safe HTML for links, paragraphs, emphasis, and light formatting.',
        'Keep scripts, forms, secrets, and complex interactive content out of email bodies.',
        'Provide Text too when the message is important, so recipients have a fallback.'
      ],
      example: '<p>Hi {{$json.firstName}},</p><p><a href="{{$json.invoiceUrl}}">View invoice</a></p>'
    },
    from: {
      title: 'How to set From',
      steps: [
        'From is the sender address shown on the email.',
        '',
        'Leave it empty to use the SMTP username or the default From address saved in the SMTP Account connection.',
        'Fill it only when your SMTP provider or company mail relay allows that sender address.',
        'Unauthorized sender addresses can be rejected or flagged as spoofing.'
      ],
      example: 'billing@company.com'
    },
  },  email_sequence_sender: {
    recipient: {
      title: 'How to set Recipient (JSON)?',
      steps: [
        'Recipient is a JSON object with email and optional name.',
        '',
        'Example:',
        '{"email": "user@example.com", "name": "John Doe"}'
      ],
      example: '{"email":"user@example.com","name":"John Doe"}'
    },
    sequence: {
      title: 'How to set Sequence Steps (JSON Array)?',
      steps: [
        'Sequence is a JSON array of steps.',
        '',
        'Each step includes:',
        '• step (number)',
        '• subject (string)',
        '• body (string)',
        '• delayAfter (seconds)',
        '• sendCondition (optional)',
        '',
        'Example:',
        '[{"step":1,"subject":"Welcome","body":"Hello!","delayAfter":0}]'
      ],
      example: '[{"step":1,"subject":"Welcome","body":"Hello!","delayAfter":0}]'
    },
    stopOnReply: {
      title: 'What is Stop on Reply?',
      steps: [
        'When enabled, the sequence stops if the recipient replies.',
        '',
        'Use this to avoid sending follow‑ups after engagement.'
      ],
      example: 'true'
    },
    tracking: {
      title: 'How to set Tracking Settings (JSON)?',
      steps: [
        'Tracking controls open and click tracking.',
        '',
        'Example:',
        '{"openTracking": true, "clickTracking": true}'
      ],
      example: '{"openTracking":true,"clickTracking":true}'
    }
  },
  merge: {
    mode: {
      title: 'How to choose Mode',
      steps: [
        'Mode defines how incoming branch outputs are combined.',
        '',
        'Options:',
        '- overwrite: combine flat object fields. If two branches use the same key, the later branch wins. Choose this for simple payloads.',
        '- append: collect each branch output into {{$json.items}}. Choose this when the next step expects a list of branch results.',
        '- deep_merge: recursively combine nested object fields. Choose this when branches add different details under customer, approval, ticket, or similar objects.',
        '',
        'After changing modes, check the next node mappings. Append mode uses {{$json.items}}, while overwrite and deep_merge usually use top-level or nested fields.'
      ],
      example: 'deep_merge'
    }
  },
  parallel: {
    mode: {
      title: 'How to choose Mode',
      steps: [
        'Mode records the parallel orchestration style for this point in the workflow.',
        '',
        'Choose Wait for all when every connected branch should conceptually finish before a later merge.',
        'Choose Race (first completes) only when the first successful branch should decide the next path.',
        '',
        'Runtime output includes {{$json.mode}} and an empty {{$json.results}} placeholder. The Parallel node itself does not collect real branch output.',
        'Connect branch lines on the canvas and use Merge when you need to recombine data.'
      ],
      example: 'all'
    }
  },
  retry: {
    maxAttempts: {
      title: 'How to set Max Attempts',
      steps: [
        'Max Attempts is the retry count recorded for engine-level retry orchestration.',
        '',
        'Use 3 for most temporary API or network failures.',
        'Use 1 when you only want the retry policy recorded without additional attempts.',
        'Use higher values only when downstream work is safe to repeat.',
        '',
        'The runtime output includes {{$json.maxAttempts}} and {{$json.attempts}}. This node does not rerun the previous node by itself.'
      ],
      example: '3'
    },
    delayBetween: {
      title: 'How to set Delay Between',
      steps: [
        'Delay Between is the wait time recorded between retry attempts, in milliseconds.',
        '',
        'Use 1000 for one second or 5000 for five seconds.',
        'Map {{$json.retryDelayMs}} only when a previous node already provides a number.',
        '',
        'The executor reads delayBetween. Older configs named delay have no runtime effect.',
        'Do not type seconds as 5 if you mean five seconds; enter 5000.'
      ],
      example: '1000'
    },
    backoff: {
      title: 'How to choose Backoff',
      steps: [
        'Backoff records how retry delays should grow.',
        '',
        'None keeps the same delay each time.',
        'Linear grows steadily.',
        'Exponential grows faster and is best for rate limits or unstable third-party APIs.',
        '',
        'The executor reads backoff as none, linear, or exponential. Older backoffMultiplier values have no runtime effect.'
      ],
      example: 'exponential'
    }
  },
  return: {
    value: {
      title: 'How to set Return Value',
      steps: [
        'Return Value is the payload sent back under {{$json.returnedValue}} when Include Input is off.',
        '',
        'Enter JSON such as {"success":true,"ticketId":"{{$json.ticketId}}"} or map a previous value such as {{$json.approvalResult}}.',
        'If it is blank and Include Input is off, returnedValue is null.',
        '',
        'Do not map {{$json.value}} after this node. The real output key is {{$json.returnedValue}}.'
      ],
      example: '{"success":true,"ticketId":"{{$json.ticketId}}"}'
    },
    includeInput: {
      title: 'How to use Include Input',
      steps: [
        'Include Input returns the entire incoming object under {{$json.returnedValue}}.',
        '',
        'Turn it on when a sub-workflow should return everything gathered so far.',
        'Leave it off when Return Value should define the response.',
        '',
        'If Include Input is on, it takes precedence over Return Value. The two are not merged.'
      ],
      example: 'false'
    }
  },
  execute_workflow: {
    workflowId: {
      title: 'How to set Workflow ID',
      steps: [
        'Workflow ID is the internal ID of the child workflow to run.',
        '',
        'Open the reusable child workflow and copy its ID from the workflow URL or workflow list record.',
        'The child must be confirmed or active and must have a trigger node, even though Execute Workflow skips that trigger at runtime.',
        '',
        'Map a previous value such as {{$json.escalationWorkflowId}} only when that value is controlled by your workspace settings.',
        'If this is blank, the node returns Workflow ID is required. If the ID is wrong, it returns Sub-workflow not found.'
      ],
      example: '123e4567-e89b-12d3-a456-426614174000'
    },
    input: {
      title: 'How to set Input Data',
      steps: [
        'Input Data is the JSON payload the child workflow receives after its trigger is skipped.',
        '',
        'Use a small object with the fields the child expects, such as {"ticketId":"{{$json.ticketId}}","priority":"{{$json.priority}}"} .',
        'Leave it blank when the child should receive the whole current node input.',
        '',
        'After Execute Workflow completes, the parent workflow reads child output from {{$json.result}}.',
        'Do not expect input and legacy inputData to merge; input wins when both are present.'
      ],
      example: '{"ticketId":"{{$json.ticketId}}","customerEmail":"{{$json.customerEmail}}"}'
    },
    inputData: {
      title: 'How to use legacy Input Data',
      steps: [
        'inputData is a backend-supported fallback used by older or generated workflow JSON.',
        '',
        'Use the visible Input Data field for new visual workflows.',
        'If both input and inputData are present, the runtime uses input and ignores inputData.',
        '',
        'Keep the child workflow contract simple so the child can map fields like {{$json.ticketId}} without extra parsing.'
      ],
      example: '{"ticketId":"{{$json.ticketId}}"}'
    }
  },
  timeout: {
    limit: {
      title: 'How to set Limit',
      steps: [
        'Limit is the elapsed workflow time threshold in milliseconds.',
        '',
        'Use 30000 for 30 seconds or 60000 for one minute.',
        'The node compares workflow elapsed time at the moment it runs; it does not pause or cancel an API call already in progress.',
        '',
        'Output includes {{$json.elapsedMs}}, {{$json.limitMs}}, {{$json.timedOut}}, {{$json.originalInput}}, and {{$json.__routing.branch}}.',
        'Invalid or non-positive values return INVALID_CONFIG.'
      ],
      example: '30000'
    }
  },
  webhook: {
    method: {
      title: 'How to choose HTTP Method?',
      steps: [
        'Method is how the webhook accepts incoming requests.',
        '',
        'Supported values:',
        '• GET – send data in URL/query',
        '• POST – send data in the body (most common)',
        '• PUT – update/replace data',
        '',
        'Tip: Use POST for most webhook integrations.'
      ],
      example: 'POST'
    },
    path: {
      title: 'How to set Path?',
      steps: [
        'Path is the last part of your webhook URL.',
        '',
        'Example: In https://your-domain.com/webhooks/order-created, the path is /webhooks/order-created.',
        '',
        'If you leave this empty, a unique path is auto-generated for you.',
        '',
        'When setting it manually:',
        '• Use a short, descriptive value like /order-created or /lead/new.',
        '• Use only letters, numbers, dashes, and slashes.',
        '• Do not include the domain (https://...) or query parameters (?key=value).',
        '',
        'After saving the workflow, copy the full webhook URL (including this path) and paste it into the external service that should trigger this workflow.'
      ],
      example: '/webhooks/order-created'
    }
  },
  form: {
    redirectUrl: {
      title: 'How to set Redirect URL?',
      steps: [
        'Redirect URL is where users are sent after a successful form submission.',
        '',
        'Leave this empty to keep users on the same page and show the success message below the form.',
        '',
        'To redirect users to another page:',
        '• Enter a full, valid URL such as https://example.com/thank-you.',
        '• Make sure the URL is accessible to your users (no localhost in production).',
        '',
        'Common uses:',
        '• Send users to a custom “Thank you” or confirmation page.',
        '• Redirect to a signup, download, or next‑step page after form submission.'
      ],
      example: 'https://example.com/thank-you'
    }
  },
  discord_trigger: {
    eventTypes: {
      title: 'How to set Discord Event Types?',
      steps: [
        'Use slash_command for slash commands such as /support.',
        'Use interaction for buttons, select menus, modals, and autocomplete.',
        'Use webhook_event for Discord Webhook Events configured in the Developer Portal.',
        'Use message only when Discord is actually delivering message-like events to this endpoint.'
      ],
      example: 'slash_command, interaction'
    },
    guildIds: {
      title: 'How to set Allowed Guild IDs?',
      steps: [
        'Enable Developer Mode in Discord.',
        'Right-click the server name and copy Server ID.',
        'Enter one or more IDs separated by commas or new lines.',
        'Leave blank to accept any delivered server.'
      ],
      example: '222222222222222222'
    },
    channelIds: {
      title: 'How to set Allowed Channel IDs?',
      steps: [
        'Enable Developer Mode in Discord.',
        'Right-click the target channel and copy Channel ID.',
        'Enter numeric IDs, not channel names like #support.',
        'Use {{$json.channelId}} later when replying with the Discord action node.'
      ],
      example: '333333333333333333'
    },
    allowedUserIds: {
      title: 'How to set Allowed User IDs?',
      steps: [
        'Enable Developer Mode in Discord.',
        'Right-click an approved user and copy User ID.',
        'Enter one or more numeric IDs for admin-only or moderator-only workflows.',
        'Leave blank when any delivered user can trigger the workflow.'
      ],
      example: '111111111111111111'
    },
    commandFilter: {
      title: 'How to set Command Filter?',
      steps: [
        'Enter the slash command name only, such as /support.',
        'Do not include command options or user-entered text.',
        'Leave blank to accept all configured commands.',
        'Route by {{$json.command}} later with Switch when several commands share the workflow.'
      ],
      example: '/support'
    },
    applicationId: {
      title: 'How to set Application ID?',
      steps: [
        'Open discord.com/developers/applications.',
        'Choose your application and open General Information.',
        'Copy Application ID.',
        'Prefer saving this on the Discord Bot Token connection when possible.'
      ],
      example: '999999999999999999'
    },
    publicKey: {
      title: 'How to set Public Key Fallback?',
      steps: [
        'Open the Discord application General Information page.',
        'Copy Public Key, not Bot Token or Client Secret.',
        'Prefer saving it on the Discord Bot Token connection or DISCORD_PUBLIC_KEY.',
        'Use this fallback only when the connection or worker environment does not already provide it.'
      ],
      example: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    },
    validateSignature: {
      title: 'How to use Validate Signature?',
      steps: [
        'Keep it on for production Discord endpoints.',
        'It checks X-Signature-Ed25519 and X-Signature-Timestamp.',
        'Turn it off only for controlled local simulations.',
        'If validation fails, fix the saved Public Key instead of disabling this setting.'
      ],
      example: 'true'
    }
  },

  discord: {
    channelId: {
      title: 'Discord Channel ID',
      steps: [
        'Enable Developer Mode in Discord: User Settings → Advanced → Developer Mode.',
        'Right-click the target channel → Copy Channel ID.',
        'Use {{$json.channelId}} after Discord Trigger to reply in the same channel.',
        'Leave blank only when replying with Interaction Token + Application ID instead.'
      ],
      example: '{{$json.channelId}}'
    },
    message: {
      title: 'Discord Message',
      steps: [
        'Text the bot should post. Required for every send.',
        'Supports Discord markdown: **bold**, *italic*, `code`, ||spoiler||.',
        'Map AI Agent or trigger output, e.g. {{$json.response}} or {{$json.text}}.'
      ],
      example: 'New ticket {{$json.ticketId}} needs review'
    },
    interactionToken: {
      title: 'Discord Interaction Token',
      steps: [
        'Only fill this when replying to a Discord slash command or component interaction.',
        'Map {{$json.interactionToken}} from Discord Trigger — it expires 15 minutes after the interaction.',
        'Must be paired with Application ID; together they skip the bot-token channel path entirely.'
      ],
      example: '{{$json.interactionToken}}'
    },
    applicationId: {
      title: 'Discord Application ID',
      steps: [
        'Required together with Interaction Token for slash-command/component follow-up replies.',
        'Map {{$json.applicationId}} from Discord Trigger, or copy it from the Developer Portal → General Information.'
      ],
      example: '{{$json.applicationId}}'
    },
    replyToMessageId: {
      title: 'Discord Reply To Message ID',
      steps: [
        'Optional. Makes the new bot message visually reply to an earlier channel message.',
        'Only applies to the Channel ID + Bot Token path, not the interaction-reply path.',
        'Map {{$json.messageId}} from Discord Trigger or a previous Discord send.'
      ],
      example: '{{$json.messageId}}'
    },
  },
  discord_webhook: {
    message: {
      title: 'How to write Message?',
      steps: [
        'Message is the text posted to the channel.',
        '',
        'Supports Discord markdown:',
        '• **bold**, *italic*, `code`, and line breaks',
        '',
        'Tip: You can include dynamic data like {{input.field}}.'
      ],
      example: '✅ Workflow completed successfully!'
    },
    username: {
      title: 'How to set Username?',
      steps: [
        'Username is an optional override for the webhook sender name.',
        '',
        'Leave empty to use the webhook’s default name.'
      ],
      example: 'CtrlChecks Bot'
    },
    avatarUrl: {
      title: 'How to set Avatar URL?',
      steps: [
        'Avatar URL is an optional image for the webhook sender.',
        '',
        'Use a direct image link (PNG, JPG, GIF).',
        'Leave empty to use the webhook’s default avatar.'
      ],
      example: 'https://example.com/avatar.png'
    }
  },
  datadog: {
    apiKey: {
      title: 'Datadog API Key – Step-by-Step',
      url: 'https://app.datadoghq.com',
      steps: [
        '1️⃣ Open Datadog',
        '   Go to 👉 https://app.datadoghq.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Organization Settings',
        '   Click profile icon (top right)',
        '   Click "Organization Settings"',
        '',
        '3️⃣ Navigate to API Keys',
        '   Click "API Keys" in left sidebar',
        '',
        '4️⃣ Create New Key',
        '   Click "New Key"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create Key"',
        '',
        '5️⃣ Copy API Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '   You\'ll also need Application Key',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    appKey: {
      title: 'Datadog Application Key – Step-by-Step',
      url: 'https://app.datadoghq.com',
      steps: [
        '1️⃣ In Datadog Organization Settings',
        '   After getting API Key',
        '   Click "Application Keys" in left sidebar',
        '',
        '2️⃣ Create New Application Key',
        '   Click "New Key"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Create Key"',
        '',
        '3️⃣ Copy Application Key',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the App Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  sentry: {
    token: {
      title: 'Sentry Auth Token – Step-by-Step',
      url: 'https://sentry.io',
      steps: [
        '1️⃣ Open Sentry',
        '   Go to 👉 https://sentry.io',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Auth Tokens',
        '   Click "Settings" → "Account"',
        '   Click "Auth Tokens" in left sidebar',
        '',
        '3️⃣ Create New Token',
        '   Click "Create New Token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Select scopes:',
        '   • org:read',
        '   • project:read, project:write',
        '   • event:read, event:write',
        '',
        '4️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Auth Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Productivity Tools
  clickup: {
    apiKey: {
      title: 'ClickUp API Key – Step-by-Step',
      url: 'https://app.clickup.com',
      steps: [
        'Step 1: Open ClickUp in your browser and sign in.',
        'Step 2: Go to Settings -> Apps -> API, or open app.clickup.com/settings/apps.',
        'Step 3: Copy your personal API token from ClickUp.',
        'Step 4: Store it in CtrlChecks Connections or the credential vault as the ClickUp service node account connection.',
        'Step 5: Use direct apiKey/apiToken/token fields only as a legacy/debug fallback when the environment explicitly requires it.',
        'The token authorizes ClickUp read, write, comment, and delete operations; keep it out of Prompt fields and normal workflow data.'
      ],
      example: '{{$credentials.clickup.apiKey}}'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'You choose Operation from the dropdown to tell this node what to do in ClickUp.',
        '',
        'Task-level operations:',
        '• Create Task – Create a new task in a list. Requires List ID and Task Name; you can also set Description, Priority, Assignees, Due Date, Status.',
        '• Update Task – Modify an existing task. Requires Task ID; only the fields you provide (Name, Description, Status, Priority, Due Date, Assignees) will be changed.',
        '• Get Task – Retrieve a single task. Requires Task ID.',
        '• Delete Task – Permanently delete a task. Requires Task ID (use with care).',
        '• Add Comment – Add a comment to an existing task. Requires Task ID and Comment Text.',
        '• Update Task Status – Change a task’s status column. Requires Task ID and Status (must match a status in the list).',
        '',
        'List retrieval operations (for IDs / browsing):',
        '• Get Teams – Lists your workspaces (teams). Use this to find Workspace ID.',
        '• Get Spaces – Lists spaces in a workspace. Requires Workspace ID; use to find Space ID.',
        '• Get Folders – Lists folders in a space. Requires Workspace ID and Space ID; use to find Folder ID.',
        '• Get Lists – Lists lists in a folder or space. Requires at least Space ID (and optionally Folder ID); use to find List ID.',
        '• List Tasks – Lists tasks in a list. Requires List ID; you can toggle Include Closed Tasks.',
        '',
        'Guidance:',
        '• Use the Get* operations first to discover IDs (workspace/space/folder/list).',
        '• Then switch to Create/Update/Get/Delete/List Tasks once you know which list and tasks you want to automate.'
      ],
      example: 'Create Task'
    },
    workspaceId: {
      title: 'ClickUp Workspace ID – Step-by-Step',
      steps: [
        'Step 1: Use Get Teams operation (recommended).',
        '• In this ClickUp node, temporarily set Operation to "Get Teams".',
        '• Run the workflow once.',
        '• In the execution result, open the JSON and look for "teams": [{ "id": 90123456, "name": "Workspace Name", ... }].',
        '• The numeric "id" for the team you want to use is your Workspace ID.',
        '',
        'Step 2: Copy Workspace ID from the browser URL (alternative).',
        '• Log into ClickUp in your browser.',
        '• When you are on the workspace home screen, the URL often looks like: app.clickup.com/WORKSPACE_ID.',
        '• The segment after the domain (for example 90123456) is your Workspace ID.',
        '',
        'Step 3: Paste Workspace ID into this field.',
        '• Use the numeric ID only, no slashes or extra characters.',
        '• This ID will be used by other operations (Get Spaces, Create Space, etc.).',
        '',
        'Example:',
        '90123456'
      ],
      example: '90123456'
    },
    spaceId: {
      title: 'ClickUp Space ID – Step-by-Step',
      steps: [
        'Step 1: Discover spaces using Get Spaces.',
        '• Make sure Workspace ID is filled in.',
        '• Set Operation to "Get Spaces" and run the node.',
        '• In the response, look under "spaces": [{ "id": "space_id", "name": "My Space", ... }].',
        '• Copy the "id" value for the space you plan to use.',
        '',
        'Step 2: Or copy Space ID from the ClickUp URL.',
        '• Open the space in ClickUp (click its name in the left sidebar).',
        '• In some views or settings, the URL contains the space ID (e.g. .../space/SPACE_ID or in query parameters).',
        '• Copy just the ID portion.',
        '',
        'Step 3: Paste the ID into Space ID.',
        '• Paste the ID here exactly.',
        '• This ID is needed when creating folders/lists or listing folders/lists within this space.',
        '',
        'Example:',
        '12345678'
      ],
      example: '12345678'
    },
    folderId: {
      title: 'ClickUp Folder ID – Step-by-Step',
      steps: [
        'Step 1: List folders via Get Folders.',
        '• Ensure Workspace ID and Space ID are filled in.',
        '• Set Operation to "Get Folders" and run the node.',
        '• In the result, look for "folders": [{ "id": "folder_id", "name": "My Folder", ... }].',
        '• Copy the "id" of the folder you want to use.',
        '',
        'Step 2: Or copy from the Folder URL.',
        '• Open that folder in ClickUp in your browser.',
        '• Many URLs contain /folder/FOLDER_ID or similar.',
        '• Copy only the FOLDER_ID segment.',
        '',
        'Step 3: Paste into Folder ID.',
        '• Paste the folder ID into this field.',
        '• This value is required when creating lists under a folder or when listing lists for a folder.',
        '',
        'Example:',
        '12345678'
      ],
      example: '12345678'
    },
    listId: {
      title: 'ClickUp List ID – Step-by-Step',
      steps: [
        'Step 1: Use Get Lists to see all lists.',
        '• Fill Workspace ID, Space ID, and (optionally) Folder ID.',
        '• Set Operation to "Get Lists" and run the node.',
        '• In the response, inspect "lists": [{ "id": "list_id", "name": "My List", ... }].',
        '• Copy the "id" value for the list you plan to read from or write to.',
        '',
        'Step 2: Or copy List ID from the URL.',
        '• Open the list in ClickUp.',
        '• The URL often has a segment like .../v/li/LIST_ID.',
        '• Copy the string after "li/" (that is your List ID).',
        '',
        'Step 3: Paste the ID into List ID.',
        '• Paste the list ID here exactly.',
        '• This ID is required for Create Task, List Tasks, and other list‑scoped task operations.',
        '',
        'Example:',
        '98765432'
      ],
      example: '98765432'
    },
    taskId: {
      title: 'ClickUp Task ID – Step-by-Step',
      steps: [
        'Step 1: Capture Task ID from a previous node (recommended).',
        '• When you Create Task or List Tasks, the API response includes an "id" field for each task.',
        '• Store that value or reference it directly, e.g. {{createTask.id}} or {{listTasks[0].id}}.',
        '• Use that expression in this Task ID field.',
        '',
        'Step 2: Copy from the task URL.',
        '• Open the task in ClickUp.',
        '• The URL usually contains /t/TASK_ID or similar (for example .../t/abc123def456).',
        '• Copy just the TASK_ID portion.',
        '',
        'Step 3: Paste or reference the ID here.',
        '• Paste the literal ID or use a variable expression.',
        '• This ID is required for Get Task, Update Task, Delete Task, Add Comment, and Update Task Status.',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    name: {
      title: 'How to get Task Name?',
      steps: [
        'You type or provide the name—it is the title you want the task to have in ClickUp.',
        '',
        '• Static: Type it directly, e.g. "Complete project report", "Review proposal"',
        '',
        '• Dynamic: If your platform supports expressions, use data from earlier steps, e.g. {{input.title}} or "Follow up: {{trigger.subject}}"',
        '',
        'This field is required for Create Task and can be set in Update Task. It is ignored for other operations.'
      ],
      example: 'Complete project report'
    },
    description: {
      title: 'How to get Task Description?',
      steps: [
        'You type or provide the description—optional. ClickUp supports markdown.',
        '',
        '• Static: Type or paste directly',
        '',
        '• Dynamic: Use an expression from a previous step, e.g. {{aiNode.summary}} or {{trigger.body}}',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: 'Task description'
    },
    status: {
      title: 'How to get Status?',
      steps: [
        'Status must match exactly a status that exists in your List.',
        '',
        '• From ClickUp: Open your List and look at the status column or list settings. The labels (e.g. "to do", "in progress", "complete") are the exact names to use.',
        '',
        '• From API: When you Get Task or List Tasks, each task has a status object with a "status" field (the name). Use that exact string.',
        '',
        'Type the exact status name into the Status field. Case-sensitive. Used for Update Task Status and optionally for Create/Update Task.'
      ],
      example: 'in progress'
    },
    priority: {
      title: 'How to get Priority?',
      steps: [
        'You choose from the dropdown in this node: Urgent, High, Normal, or Low.',
        '',
        '• Urgent = 4, High = 3, Normal = 2, Low = 1',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: 'Normal (2)'
    },
    assignees: {
      title: 'How to get Assignees (JSON)?',
      steps: [
        'Assignees is a JSON array of user IDs (workspace member IDs).',
        '',
        '• Get user IDs from workspace members (API or ClickUp team settings). Each member has an "id".',
        '',
        '• From a previous node: If you listed tasks or got a task, assignees may be in the response as an array of IDs. Reuse that format.',
        '',
        '• Format: Enter a JSON array, e.g. ["12345678"] or ["id1","id2"]. No spaces inside brackets if your platform expects strict JSON.',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: '["user-id-1","user-id-2"]'
    },
    dueDate: {
      title: 'How to get Due Date (Unix timestamp)?',
      steps: [
        'Due date must be in Unix timestamp in milliseconds (ms since Jan 1, 1970 00:00:00 UTC).',
        '',
        '• Example: 1735689600000 = 2024-12-31 00:00:00 UTC',
        '',
        '• From a previous step: If your platform has a "date to Unix ms" or "timestamp" function, use it (e.g. timestamp(input.dueDate)).',
        '',
        '• Manual: Use an online "date to Unix timestamp milliseconds" tool, or in code: new Date("2024-12-31").getTime()',
        '',
        'Used for Create Task and Update Task. Ignored for other operations.'
      ],
      example: '1735689600000'
    },
    commentText: {
      title: 'How to get Comment Text?',
      steps: [
        'You type or provide the comment—the text that will appear as a comment on the task.',
        '',
        '• Static: Type or paste directly',
        '',
        '• Dynamic: Use an expression, e.g. {{aiNode.summary}} or "Workflow completed at {{now}}"',
        '',
        'Required for Add Comment. Ignored for other operations.'
      ],
      example: 'My comment'
    },
    includeClosed: {
      title: 'How to use Include Closed Tasks?',
      steps: [
        'This is a toggle (on/off) in the node—you don’t "get" it from elsewhere.',
        '',
        '• Off (false): List Tasks returns only open/incomplete tasks. Default.',
        '',
        '• On (true): List Tasks returns all tasks, including closed/completed.',
        '',
        'Used only for List Tasks. Ignored for other operations.'
      ],
      example: 'false'
    }
  },
  trello: {
    apiKey: {
      title: 'Trello API Key – Step-by-Step',
      url: 'https://trello.com/app-key',
      steps: [
        '1️⃣ Open Trello App Key Page',
        '   Go to 👉 https://trello.com/app-key',
        '   Sign in to your Trello account',
        '',
        '2️⃣ Copy API Key',
        '   Your API Key is displayed on the page',
        '   Copy it',
        '',
        '3️⃣ Get Token',
        '   You\'ll also need a Token',
        '   Generate it using the API Key',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the Trello API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    token: {
      title: 'Trello Token – Step-by-Step',
      url: 'https://trello.com/1/authorize',
      steps: [
        '1️⃣ Get API Key First',
        '   Go to trello.com/app-key',
        '   Copy your API Key',
        '',
        '2️⃣ Generate Token',
        '   Go to: trello.com/1/authorize',
        '   Add parameters:',
        '   ?expiration=never&scope=read,write&response_type=token&name=WorkflowIntegration&key=YOUR_API_KEY',
        '',
        '3️⃣ Authorize',
        '   Click "Allow"',
        '   You\'ll be redirected with token in URL',
        '',
        '4️⃣ Copy Token',
        '   Token is in the URL after #token=',
        '   Copy it',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  asana: {
    accessToken: {
      title: 'Asana Personal Access Token – Step-by-Step',
      url: 'https://app.asana.com',
      steps: [
        '1️⃣ Open Asana',
        '   Go to 👉 https://app.asana.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Developer Console',
        '   Click your profile icon (top right)',
        '   Click "My Profile Settings"',
        '   Click "Apps" → "Manage Developer Apps"',
        '',
        '3️⃣ Create Personal Access Token',
        '   Click "Create New Token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '',
        '4️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '',
        'Example:',
        '1/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: '1/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  jira: {
    apiToken: {
      title: 'Jira API Token – Step-by-Step',
      url: 'https://id.atlassian.com',
      steps: [
        '1️⃣ Open Atlassian Account',
        '   Go to 👉 https://id.atlassian.com',
        '   Sign in with your Atlassian account',
        '',
        '2️⃣ Go to Security',
        '   Click "Security" in left sidebar',
        '   Or go to: id.atlassian.com/manage-profile/security/api-tokens',
        '',
        '3️⃣ Create API Token',
        '   Click "Create API token"',
        '   Give it a label (e.g., "Workflow Integration")',
        '   Click "Create"',
        '',
        '4️⃣ Copy API Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '   Use with your email for authentication',
        '',
        'Example:',
        'ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    email: {
      title: 'How to get Jira Email?',
      steps: [
        'Use the same email address you use to sign in to Jira.',
        '',
        'Example:',
        'user@example.com'
      ],
      example: 'user@example.com'
    },
    domain: {
      title: 'Jira Domain (Site URL) – Step-by-Step',
      steps: [
        '1️⃣ Open Jira in your browser',
        '',
        '2️⃣ Copy the site URL domain',
        '   Example full URL: https://yourcompany.atlassian.net',
        '   Domain to enter: yourcompany.atlassian.net',
        '',
        '3️⃣ Paste it into the Jira Domain field above',
        '   Do not include https://',
        '',
        'Example:',
        'yourcompany.atlassian.net'
      ],
      example: 'yourcompany.atlassian.net'
    },
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You don’t get this from anywhere—you choose it from the dropdown in this node.',
        '',
        '• Create Issue – Create a new issue (requires Project Key, Summary).',
        '',
        '• Update Issue – Modify an issue (requires Issue Key).',
        '',
        '• Get Issue – Retrieve issue details (requires Issue Key).',
        '',
        '• Delete Issue – Remove an issue (requires Issue Key).',
        '',
        '• Search Issues – Find issues using JQL (requires JQL Query).',
        '',
        '• Transition Issue – Change issue status (requires Issue Key and Transition ID).',
        '',
        '• Add Comment – Add a comment (requires Issue Key and Comment Body).',
        '',
        '• Get Projects – List all projects.'
      ],
      example: 'Create Issue'
    },
    projectKey: {
      title: 'Jira Project Key – Step-by-Step',
      steps: [
        '1️⃣ Open your Jira project',
        '',
        '2️⃣ Look at the URL or project settings',
        '   The project key is shown in the URL or next to the project name',
        '   Example: PROJ',
        '',
        '3️⃣ Paste it into the Project Key field above',
        '',
        'Example:',
        'PROJ'
      ],
      example: 'PROJ'
    },
    issueKey: {
      title: 'Jira Issue Key – Step-by-Step',
      steps: [
        '1️⃣ Open the issue in Jira',
        '',
        '2️⃣ Copy the issue key from the header or URL',
        '   Example: PROJ-123',
        '',
        '3️⃣ Paste it into the Issue Key field above',
        '',
        'Example:',
        'PROJ-123'
      ],
      example: 'PROJ-123'
    },
    summary: {
      title: 'How to get Issue Summary?',
      steps: [
        'You type the summary—the short title of the issue.',
        '',
        '• Static: Type it directly, e.g. "Fix login bug".',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.subject}}".',
        '',
        'Required for Create Issue.'
      ],
      example: 'Fix login bug'
    },
    description: {
      title: 'How to get Issue Description?',
      steps: [
        'You type the detailed issue description.',
        '',
        '• Static: Type or paste directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{aiNode.summary}}".',
        '',
        'Markdown is supported.'
      ],
      example: 'Issue description'
    },
    issueType: {
      title: 'How to get Issue Type?',
      steps: [
        'Issue Type must match a type in your project.',
        '',
        'Examples: Task, Bug, Story, Epic.',
        '',
        'Check your project\'s issue type list and use the exact name.'
      ],
      example: 'Task'
    },
    assignee: {
      title: 'How to get Assignee Account ID?',
      steps: [
        'Assignee Account ID is a user identifier in Jira Cloud.',
        '',
        '• Use Jira user search API to find the accountId.',
        '• Or open the user profile (if visible) and copy account ID.',
        '',
        'Paste the account ID into the Assignee field.'
      ],
      example: 'account-id'
    },
    priority: {
      title: 'How to get Priority?',
      steps: [
        'Choose a priority from the dropdown.',
        '',
        'Common values: Highest, High, Medium, Low, Lowest.',
        '',
        'Use the priority names defined in your Jira instance.'
      ],
      example: 'Medium'
    },
    labels: {
      title: 'How to get Labels (JSON)?',
      steps: [
        'Labels are a JSON array of label names.',
        '',
        'Example: ["bug", "urgent"]',
        '',
        'Use labels that already exist or create new ones.'
      ],
      example: '["bug","urgent"]'
    },
    transitionId: {
      title: 'Jira Transition ID – Step-by-Step',
      steps: [
        '1️⃣ Use Jira transitions API for the issue',
        '',
        '2️⃣ Find the transition you want',
        '   Copy its "id" value',
        '',
        '3️⃣ Paste it into the Transition ID field above',
        '',
        'Example:',
        '31'
      ],
      example: '31'
    },
    commentBody: {
      title: 'How to get Comment Body?',
      steps: [
        'You type or provide the comment text.',
        '',
        '• Static: Type it directly.',
        '',
        '• Dynamic: Use data from earlier steps, e.g. "{{input.feedback}}".',
        '',
        'Required for Add Comment.'
      ],
      example: 'My comment'
    },
    jql: {
      title: 'How to get JQL Query?',
      steps: [
        'Use Jira Advanced Search to build a JQL query.',
        '',
        'Example: project = PROJ AND status = "In Progress"',
        '',
        'Copy the JQL string and paste it into the JQL Query field.'
      ],
      example: 'project = PROJ AND status = "In Progress"'
    },
    maxResults: {
      title: 'How to get Max Results?',
      steps: [
        'Enter the maximum number of issues to return.',
        '',
        'Default is often 50.',
        '',
        'Use smaller values for large projects to avoid large responses.'
      ],
      example: '50'
    }
  },
  monday: {
    apiToken: {
      title: 'Monday.com API Token – Step-by-Step',
      url: 'https://monday.com',
      steps: [
        '1️⃣ Open Monday.com',
        '   Go to 👉 https://monday.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Admin',
        '   Click your profile icon (bottom left)',
        '   Click "Admin"',
        '',
        '3️⃣ Navigate to API',
        '   Click "API" in left sidebar',
        '   Or go to: monday.com/marketplace/api',
        '',
        '4️⃣ Generate API Token',
        '   Click "Generate new token"',
        '   Give it a name (e.g., "Workflow Integration")',
        '   Click "Generate"',
        '',
        '5️⃣ Copy Token',
        '   ⚠️ IMPORTANT: Copy immediately!',
        '   You won\'t see it again!',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '',
        'Example:',
        'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  todoist: {
    apiToken: {
      title: 'Todoist API Token – Step-by-Step',
      url: 'https://todoist.com',
      steps: [
        '1️⃣ Open Todoist',
        '   Go to 👉 https://todoist.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Integrations"',
        '',
        '3️⃣ Get API Token',
        '   Scroll to "API token" section',
        '   Click "Copy" to copy your token',
        '   Or go to: todoist.com/app/settings/integrations',
        '',
        '4️⃣ Store Securely',
        '   Paste it into the API Token field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  // Analytics & Monitoring
  reddit: {
    clientId: {
      title: 'Reddit Client ID – Step-by-Step',
      url: 'https://www.reddit.com/prefs/apps',
      steps: [
        '1️⃣ Open Reddit Apps',
        '   Go to 👉 https://www.reddit.com/prefs/apps',
        '   Sign in to your Reddit account',
        '',
        '2️⃣ Create App',
        '   Scroll down and click "create another app..."',
        '   Or "create app" button',
        '',
        '3️⃣ Fill App Details',
        '   Name: Your app name (e.g., "Workflow Integration")',
        '   App type: Select "script"',
        '   Description: Brief description',
        '   Redirect URI: http://localhost:8080',
        '',
        '4️⃣ Create App',
        '   Click "create app"',
        '',
        '5️⃣ Get Client ID',
        '   Under your app, find the string',
        '   Under "personal use script" label',
        '   That\'s your Client ID',
        '',
        '6️⃣ Store Securely',
        '   Paste it into the Client ID field above',
        '   You\'ll also need Client Secret',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxx'
    },
    clientSecret: {
      title: 'Reddit Client Secret – Step-by-Step',
      url: 'https://www.reddit.com/prefs/apps',
      steps: [
        '1️⃣ In Reddit App Settings',
        '   After creating app',
        '   Find "secret" field',
        '',
        '2️⃣ Copy Client Secret',
        '   The secret is shown under your app',
        '   It\'s a long string',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Client Secret field above',
        '   Never share publicly',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    accessToken: {
      title: 'Reddit Access Token – Step-by-Step',
      steps: [
        '1️⃣ Use OAuth 2.0 Flow',
        '   POST to: https://www.reddit.com/api/v1/access_token',
        '   Include: grant_type, username, password',
        '   Use Basic Auth with clientId:clientSecret',
        '',
        '2️⃣ Get Access Token',
        '   Response includes access_token',
        '   Copy the access_token',
        '',
        '3️⃣ Store Securely',
        '   Paste it into the Access Token field above',
        '   ⚠️ Token expires - refresh when needed',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  google_analytics: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• Get Report – Use when you want metrics and dimensions for a date range. Set Access Token, Property ID, Date Ranges, and Metrics (and optionally Dimensions).',
        '',
        '• List Properties – Use when you want to list Analytics properties you can access (e.g. to find a Property ID). You need Access Token only.',
        '',
        '• Track Event – Use when you want to send an event to Google Analytics. Set Access Token, Property ID, Event Name, and optionally Event Parameters.'
      ]
    },
    accessToken: {
      title: 'How to get Access Token?',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ If your platform has "Connect Google" or "Sign in with Google":',
        '   Go to Settings → Integrations (or similar)',
        '   Click Connect Google',
        '   Sign in with the Google account that has access to your Analytics property',
        '   Approve the requested scopes (e.g. "View your Google Analytics data")',
        '   The platform stores the Access Token and may fill this field automatically',
        '',
        '2️⃣ If using a Service Account:',
        '   The platform uses the Service Account JSON to obtain the token',
        '   Ensure the service account email is added in Analytics Admin → Property Access Management',
        '',
        '3️⃣ If you must paste a token manually:',
        '   Use OAuth2 flow with your platform\'s Client ID and Client Secret to get an access token',
        '   The token is temporary (often 1 hour); the platform may use a refresh token to get new ones',
        '',
        '⚠️ For Analytics Data API, an access token is required—not a long-lived API key.'
      ]
    },
    apiKey: {
      title: 'Google Analytics Access Token – Step-by-Step',
      url: 'https://console.cloud.google.com',
      steps: [
        '1️⃣ Open Google Cloud Console',
        '   Go to 👉 https://console.cloud.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Create or Select Project',
        '   Click project dropdown',
        '   Select project or create new',
        '',
        '3️⃣ Enable Google Analytics Data API',
        '   Search for "Google Analytics Data API"',
        '   Click on it',
        '   Click "Enable"',
        '',
        '4️⃣ Create OAuth credentials or Service Account',
        '   Credentials → Create Credentials → OAuth client ID (or Service Account)',
        '   For OAuth: Use the platform\'s "Connect Google" to get an access token',
        '   For Service Account: Download JSON and add the service account email to Analytics Admin → Property Access Management',
        '',
        '5️⃣ Use the access token',
        '   The platform may fill the Access Token field after you connect Google',
        '   Or paste the token if your platform expects it',
        '',
        '⚠️ Use an access token (OAuth or Service Account), not a static API key.'
      ]
    },
    propertyId: {
      title: 'How to get Property ID?',
      url: 'https://analytics.google.com',
      steps: [
        '1️⃣ Open Google Analytics',
        '   Go to 👉 https://analytics.google.com',
        '   Sign in and select the account that contains your property',
        '',
        '2️⃣ Go to Admin',
        '   Click Admin (gear icon) in the bottom left',
        '',
        '3️⃣ Select your property',
        '   In the Property column, select the GA4 property you want',
        '',
        '4️⃣ Open Property Settings',
        '   Click Property Settings',
        '',
        '5️⃣ Copy Property ID',
        '   At the top you will see Property ID – a numeric value (e.g. 123456789)',
        '   For the node use: properties/123456789',
        '',
        'Example:',
        'properties/123456789'
      ],
      example: 'properties/123456789'
    },
    dateRanges: {
      title: 'How to get Date Ranges (JSON)?',
      steps: [
        'You type or build this—it is not copied from the Analytics dashboard.',
        '',
        'Format: Use YYYY-MM-DD for dates. JSON array of objects with startDate and endDate.',
        '',
        'Single range:',
        '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}]',
        '',
        'Multiple ranges (if supported):',
        '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}, {"startDate": "2024-02-01", "endDate": "2024-02-29"}]',
        '',
        'If your platform supports expressions, you can use dynamic dates (e.g. from a previous step) as long as they resolve to YYYY-MM-DD.'
      ],
      example: '[{"startDate": "2024-01-01", "endDate": "2024-01-31"}]'
    },
    dimensions: {
      title: 'How to get Dimensions (JSON)?',
      steps: [
        'You choose dimension names from the Google Analytics Data API (GA4). They are not copied from the dashboard.',
        '',
        'Common GA4 dimensions:',
        '   • date – Date in YYYYMMDD',
        '   • country, city – Geography',
        '   • deviceCategory – desktop, mobile, tablet',
        '   • sessionSource, sessionMedium, sessionCampaignName – Acquisition',
        '   • pagePath, pageTitle – Page',
        '',
        'Format: JSON array of strings: ["date", "country", "city"]',
        '',
        'Check Google\'s "Dimensions & metrics reference" for the Analytics Data API. Invalid names cause API errors. Leave empty for totals only.'
      ],
      example: '["date", "country", "city"]'
    },
    metrics: {
      title: 'How to get Metrics (JSON)?',
      steps: [
        'You choose metric names from the Google Analytics Data API (GA4). They are not copied from the dashboard.',
        '',
        'Common GA4 metrics:',
        '   • activeUsers – Users in the period',
        '   • sessions – Sessions',
        '   • screenPageViews – Page/screen views',
        '   • conversions – Conversions',
        '   • totalRevenue – Revenue (e-commerce)',
        '',
        'Format: JSON array of strings: ["activeUsers", "sessions", "screenPageViews"]',
        '',
        'Check Google\'s "Dimensions & metrics reference" for the Analytics Data API. At least one metric is required for Get Report.'
      ],
      example: '["activeUsers", "sessions", "screenPageViews"]'
    },
    eventName: {
      title: 'How to get Event Name?',
      steps: [
        'You choose or type the event name—the name you give to the action you are tracking.',
        '',
        'Standard events: Google recommends names like purchase, sign_up, page_view.',
        '',
        'Custom events: Use lowercase and underscores (e.g. form_submit, report_generated, workflow_completed).',
        '',
        'If your platform supports expressions, you can use a value from a previous step (e.g. {{input.eventName}}).',
        '',
        'This field is only used when Operation = Track Event.'
      ],
      example: 'purchase'
    },
    eventParams: {
      title: 'How to get Event Parameters (JSON)?',
      steps: [
        'You build this JSON object—it is not copied from Analytics.',
        '',
        'Common parameters:',
        '   • value – Numeric value (e.g. revenue)',
        '   • currency – Currency code (e.g. USD)',
        '   • Custom parameter names allowed by the Measurement Protocol or your platform',
        '',
        'Format: JSON object: {"value": 100, "currency": "USD"}',
        '',
        'This field is only used when Operation = Track Event. Leave empty or {} if you do not need parameters.'
      ],
      example: '{"value": 100, "currency": "USD"}'
    }
  },
  mixpanel: {
    apiSecret: {
      title: 'Mixpanel API Secret – Step-by-Step',
      url: 'https://mixpanel.com',
      steps: [
        '1️⃣ Open Mixpanel',
        '   Go to 👉 https://mixpanel.com',
        '   Sign in to your account',
        '',
        '2️⃣ Go to Project Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Project Settings"',
        '',
        '3️⃣ Navigate to Service Accounts',
        '   Click "Service Accounts" tab',
        '   Or go to: mixpanel.com/project/YOUR_PROJECT/settings',
        '',
        '4️⃣ Get API Secret',
        '   Find "API Secret" in settings',
        '   Click "Show" to reveal',
        '   Copy the secret',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Secret field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  segment: {
    writeKey: {
      title: 'Segment Write Key – Step-by-Step',
      url: 'https://app.segment.com',
      steps: [
        '1️⃣ Open Segment',
        '   Go to 👉 https://app.segment.com',
        '   Sign in to your account',
        '',
        '2️⃣ Select Workspace',
        '   Select your workspace',
        '   Or create new workspace',
        '',
        '3️⃣ Go to Sources',
        '   Click "Sources" in left sidebar',
        '   Select or create a source',
        '',
        '4️⃣ Get Write Key',
        '   In source settings, find "Write Key"',
        '   Copy the Write Key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the Write Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  amplitude: {
    apiKey: {
      title: 'Amplitude API Key – Step-by-Step',
      url: 'https://amplitude.com',
      steps: [
        '1️⃣ Open Amplitude',
        '   Go to 👉 https://amplitude.com',
        '   Sign in to your account',
        '',
        '2️⃣ Select Project',
        '   Select your project',
        '   Or create new project',
        '',
        '3️⃣ Go to Settings',
        '   Click "Settings" (gear icon)',
        '   Click "Projects" → Select your project',
        '',
        '4️⃣ Get API Key',
        '   Find "API Key" in project settings',
        '   Copy the API Key',
        '',
        '5️⃣ Store Securely',
        '   Paste it into the API Key field above',
        '',
        'Example:',
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
      ],
      example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  },
  elasticsearch: {
    username: {
      title: 'Elasticsearch Username – Step-by-Step',
      steps: [
        '1️⃣ Get Elasticsearch Username',
        '   From your Elasticsearch administrator',
        '   Or from Elasticsearch configuration',
        '   Common default: elastic',
        '',
        '2️⃣ Use the Username',
        '   Paste it into the Username field above',
        '   You\'ll also need Password',
        '',
        'Example:',
        'elastic'
      ],
      example: 'elastic'
    },
    password: {
      title: 'Elasticsearch Password – Step-by-Step',
      steps: [
        '1️⃣ Get Elasticsearch Password',
        '   From your Elasticsearch administrator',
        '   Or reset in Elasticsearch settings',
        '',
        '2️⃣ Store Securely',
        '   Paste it into the Password field above',
        '   Never commit to version control',
        '',
        '⚠️ Security Note:',
        'Passwords are sensitive - store securely!'
      ],
      example: 'YourSecurePassword123!'
    }
  },
  // Accounting
  xero: {
    accessToken: {
      title: 'How to get Xero Access Token?',
      url: 'https://developer.xero.com',
      steps: [
        'Complete the Xero OAuth 2.0 authorization flow for your Xero app or use a saved CtrlChecks Xero connection.',
        'Use the current access_token value only. Do not paste the client secret, refresh token, or the word Bearer here.',
        'Xero access tokens expire, so production workflows should refresh the token or rely on a connection that refreshes it.',
        'Runtime sends this value as Authorization: Bearer <accessToken>.',
        '',
        'Example:',
        'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
      ],
      example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
    },
    tenantId: {
      title: 'How to get Xero Tenant ID?',
      url: 'https://developer.xero.com/documentation/guides/oauth2/tenants',
      steps: [
        'After OAuth authorization, call GET https://api.xero.com/connections with the access token.',
        'Copy the tenantId for the organisation this workflow should access.',
        'Use that GUID in Tenant ID. Runtime sends it as the Xero-Tenant-Id header.',
        'Do not use an invoice ID, contact ID, or organisation display name here.'
      ],
      example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    },
    resource: {
      title: 'How to choose Xero Resource?',
      steps: [
        'Choose Contacts for customers and suppliers.',
        'Choose Invoices for bills and sales invoices.',
        'Choose Items for product or service catalog entries.',
        'Choose Payments for payment records.',
        'Choose Accounts for chart-of-account records.'
      ],
      example: 'invoices'
    },
    operation: {
      title: 'How to choose Xero Operation?',
      steps: [
        'Get Many lists records and can use Where, Order, Page, Modified After, Include Archived, and Unit Decimal Places.',
        'Get By ID fetches one record and requires Record ID.',
        'Create sends Payload to Xero. Runtime wraps one payload object under the plural Xero resource key.',
        'Update requires Record ID and Payload.'
      ],
      example: 'get_many'
    },
    recordId: {
      title: 'How to use Xero Record ID?',
      steps: [
        'Fill Record ID for Get By ID and Update only.',
        'Use the Xero GUID field returned by Xero, such as InvoiceID, ContactID, ItemID, PaymentID, or AccountID.',
        'Map it from a previous Xero step with an expression like {{$json.InvoiceID}}.',
        'A human invoice number is usually not the same as the Xero record GUID.'
      ],
      example: '{{$json.InvoiceID}}'
    },
    payload: {
      title: 'How to write Xero Payload?',
      steps: [
        'Use a JSON object for Create or Update.',
        'Enter one record object only. Runtime wraps it before sending it to Xero.',
        'Contacts commonly need Name. Invoices commonly need Type, Contact, and LineItems.',
        'Leave Payload empty for Get Many and Get By ID.'
      ],
      example: '{"Name":"Acme Supplies"}'
    },
    where: {
      title: 'How to use Xero Where Filter?',
      steps: [
        'Use Xero where syntax for Get Many list filtering.',
        'Examples include Status=="AUTHORISED", Name!=null, or AmountDue>0.',
        'This is not SQL. Use the field names and expression syntax accepted by Xero.',
        'Leave empty to list records without a where filter.'
      ],
      example: 'Status=="AUTHORISED"'
    },
    order: {
      title: 'How to use Xero Order?',
      steps: [
        'Use a Xero field name followed by ASC or DESC.',
        'Examples: Date DESC, Name ASC, UpdatedDateUTC DESC.',
        'Only use this with Get Many.',
        'Leave empty when the default Xero ordering is acceptable.'
      ],
      example: 'Date DESC'
    },
    page: {
      title: 'How to use Xero Page?',
      steps: [
        'Use 1 for the first page. Runtime sends the page query parameter only when Page is greater than 1.',
        'Xero returns up to 100 records per page.',
        'The node reports pagination.hasMore when the returned page has 100 records.',
        'Increment Page in a later run or loop when you need additional records.'
      ],
      example: '1'
    },
    modifiedAfter: {
      title: 'How to use Xero Modified After?',
      steps: [
        'Use an ISO timestamp when syncing only records changed after a checkpoint.',
        'Runtime sends this as the If-Modified-Since header.',
        'A good value looks like 2026-04-01T00:00:00Z.',
        'Leave empty for a normal list request.'
      ],
      example: '2026-04-01T00:00:00Z'
    },
    summarizeErrors: {
      title: 'How to use Xero Summarize Errors?',
      steps: [
        'Leave enabled for easier validation-error messages from Xero.',
        'Set false only when you need detailed Xero validation behavior.',
        'This does not retry failed requests or change network errors.',
        'Xero HTTP errors return success: false with error details.'
      ],
      example: 'true'
    },
    includeArchived: {
      title: 'How to use Xero Include Archived?',
      steps: [
        'Enable this only when audits or migrations need archived or inactive records.',
        'Runtime sends includeArchived=true for Get Many when enabled.',
        'Not every Xero resource supports this query option.',
        'Leave false for normal day-to-day accounting workflows.'
      ],
      example: 'false'
    },
    unitdp: {
      title: 'How to use Xero Unit Decimal Places?',
      steps: [
        'Use 2 for normal accounting precision.',
        'Use 4 when Xero should preserve high-precision unit pricing.',
        'Runtime sends unitdp only when the value is not 2.',
        'This is API precision, not display formatting.'
      ],
      example: '2'
    }
  },
  workday: {
    baseUrl: {
      title: 'How to use Workday Base URL?',
      steps: [
        'Use the Workday REST API base URL for your tenant and environment.',
        'A typical value includes the API path and tenant, such as https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant.',
        'If Base URL is empty, runtime builds a default URL from Tenant.',
        'Use implementation, preview, and production URLs carefully because each tenant can have different data.'
      ],
      example: 'https://wd2-impl-services1.workday.com/ccx/api/v1/mytenant'
    },
    tenant: {
      title: 'How to use Workday Tenant?',
      steps: [
        'Enter the Workday tenant identifier from your Workday administrator.',
        'Runtime uses it to build the default Base URL when Base URL is blank.',
        'The node also echoes tenant in output for troubleshooting.',
        'Do not use an employee ID, organization ID, or display name here.'
      ],
      example: 'mytenant'
    },
    authType: {
      title: 'How to choose Workday Auth Type?',
      steps: [
        'Choose OAuth 2.0 when using a Workday API client access token.',
        'Choose Basic Auth when your Workday admin provided integration-system username and password credentials.',
        'Runtime does not pre-validate blank auth fields before sending the request.',
        'Workday authorization failures return success: false with an error string.'
      ],
      example: 'oauth2'
    },
    accessToken: {
      title: 'How to use Workday Access Token?',
      steps: [
        'Fill this when Auth Type is OAuth 2.0.',
        'Use the current Workday access token only. Runtime adds the Bearer prefix.',
        'Prefer a saved connection or secure token source for production workflows.',
        'Blank tokens are still sent as an empty Bearer header and Workday usually rejects the call.'
      ],
      example: 'eyJhbGciOi...'
    },
    username: {
      title: 'How to use Workday Username?',
      steps: [
        'Fill this when Auth Type is Basic Auth.',
        'Use the integration system user provided by Workday administration.',
        'Pair it with Password. Runtime builds a Basic Authorization header from username:password.',
        'Blank usernames are not rejected before the request is sent.'
      ],
      example: 'svc_account@tenant'
    },
    password: {
      title: 'How to use Workday Password?',
      steps: [
        'Fill this when Auth Type is Basic Auth.',
        'Use the password for the Workday integration system user.',
        'Store it in a connection or credential-filled config where possible.',
        'Do not reuse a personal Workday login password in workflow fields.'
      ],
      example: 'stored in connection'
    },
    resource: {
      title: 'How to choose Workday Resource?',
      steps: [
        'Workers reads employee or contingent-worker records.',
        'Jobs reads job profiles and job-related data.',
        'Organizations and Supervisory Organizations read organisation structures.',
        'Positions reads open or filled positions. Use Raw Path for endpoints outside these options.'
      ],
      example: 'workers'
    },
    operation: {
      title: 'How to choose Workday Operation?',
      steps: [
        'Get Many sends GET with limit and offset query parameters.',
        'Get By ID sends GET to the selected resource plus Record ID.',
        'Create sends POST with Payload.',
        'Update sends PATCH to the selected resource plus Record ID and Payload.'
      ],
      example: 'get_many'
    },
    recordId: {
      title: 'How to use Workday Record ID?',
      steps: [
        'Fill Record ID for Get By ID and Update.',
        'Use the ID accepted by the target Workday REST path.',
        'Map it from a previous step such as {{$json.workerId}}.',
        'Runtime does not pre-validate it, so blank or wrong IDs become Workday API errors.'
      ],
      example: '{{$json.workerId}}'
    },
    payload: {
      title: 'How to write Workday Payload?',
      steps: [
        'Use JSON required by the target Workday endpoint.',
        'Create sends this object as a POST body.',
        'Update sends this object as a PATCH body.',
        'Workday validates endpoint-specific fields; this node does not validate the payload schema first.'
      ],
      example: '{"workerType":"Employee"}'
    },
    limit: {
      title: 'How to use Workday Limit?',
      steps: [
        'Use Limit with Get Many only.',
        'Runtime appends it as the limit query parameter.',
        'Choose a size supported by the Workday endpoint and small enough for downstream processing.',
        'The output echoes it under pagination.limit.'
      ],
      example: '50'
    },
    offset: {
      title: 'How to use Workday Offset?',
      steps: [
        'Use Offset with Get Many only.',
        'Runtime appends it as the offset query parameter.',
        'Use 0 for the first page, then increase by the page size for later pages.',
        'The output echoes it under pagination.offset.'
      ],
      example: '0'
    },
    rawPath: {
      title: 'How to use Workday Raw Path?',
      steps: [
        'Use Raw Path only for Workday REST paths not covered by the Resource dropdown.',
        'Enter a path such as /workers/{{$json.workerId}}/staffingInformation.',
        'Runtime appends Raw Path to Base URL and ignores Resource for URL construction.',
        'Do not enter a full URL here; put the host and API root in Base URL.'
      ],
      example: '/workers/{{$json.workerId}}/staffingInformation'
    }
  },
  // Google Contacts
  google_contacts: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose this from the dropdown in the node.',
        '',
        '• List Contacts – Use when you want to retrieve contacts. Leave Contact ID empty to get every contact (up to Max Results), or fill Contact ID to fetch just that one contact.',
        '',
        '• Create Contact – Use when you want to add a new contact. You need at least one of Name, Email, or Phone.',
        '',
        '• Update Contact – Use when you want to change an existing contact. You need Contact ID and at least one field to change (Name, Email, Phone).',
        '',
        '• Delete Contact – Use when you want to remove a contact. You need Contact ID only.'
      ]
    },
    contactId: {
      title: 'Google Contacts Contact ID – Step-by-Step',
      steps: [
        '1️⃣ Open Google Contacts',
        '   Go to 👉 https://contacts.google.com',
        '   Sign in with your Google account',
        '',
        '2️⃣ Find Contact',
        '   Search for or select the contact',
        '   Click on the contact to view details',
        '',
        '3️⃣ Get Contact ID',
        '   Contact ID is in the URL',
        '   Format: contacts.google.com/person/c1234567890',
        '   The ID is after /person/',
        '',
        '4️⃣ Alternative: From a previous node',
        '   If you used List Contacts earlier, use the contact id or resourceName from the output, e.g. {{listNode.contacts[0].resourceName}}',
        '',
        '5️⃣ Use the Contact ID',
        '   Paste it into the Contact ID field above (or use people/c1234567890 if your platform expects resource name)',
        '',
        'Example:',
        'c1234567890'
      ],
      example: 'c1234567890'
    },
    name: {
      title: 'How to get Name?',
      steps: [
        'You type or set the name—it is not copied from an existing contact unless you reference a previous step.',
        '',
        'Static name: Type it directly, e.g. "John Doe" or "Jane Smith".',
        '',
        'Dynamic name: If your platform supports expressions, use data from earlier steps, e.g. {{input.firstName}} {{input.lastName}} or {{form.name}}.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for List and Delete.'
      ],
      example: 'John Doe'
    },
    email: {
      title: 'How to get Email?',
      steps: [
        'Option 1: Type it – If the email is fixed (e.g. support@company.com), type it in the Email field.',
        '',
        'Option 2: From a form or trigger – If the workflow was started by a form or webhook, the submitter\'s email is often in the trigger data. Use {{trigger.email}} or {{input.email}}.',
        '',
        'Option 3: From a previous node – If an earlier step (e.g. CRM, spreadsheet, AI) returned an email, reference it, e.g. {{previousNode.email}}.',
        '',
        'Format: Must be a valid email (name@domain.com). No spaces. Required for Create and Update.'
      ],
      example: 'john@example.com'
    },
    phone: {
      title: 'How to get Phone?',
      steps: [
        'You type or set the phone number—it is not copied from an existing contact unless you reference a previous step.',
        '',
        'Format: Include country code with + prefix when possible (e.g. +1 for US, +44 for UK). Examples: +1234567890, +441234567890.',
        '',
        'Dynamic: If your platform supports expressions, use {{input.phone}} or {{form.phone}}. Optional for Create and Update.'
      ],
      example: '+1234567890'
    },
    pageSize: {
      title: 'How to get Max Results?',
      steps: [
        'You choose the number—it is not copied from Google Contacts.',
        '',
        'What to use: 10–100 for most cases (e.g. "last 50 contacts"); 500–1000 only if you need a larger list.',
        '',
        'This field only affects List Contacts when Contact ID is empty. It is ignored when Contact ID is filled, or when Operation = Create, Update, or Delete.'
      ],
      example: '100'
    }
  },
  // Google Tasks
  google_tasks: {
    operation: {
      title: 'How to get Operation?',
      steps: [
        'You choose the operation from the dropdown in this node.',
        '',
        'Read - Retrieve tasks from a task list, or one task when Task ID is provided. Set Task List ID or @default.',
        '',
        'Create - Add a new task. You need Task Title; Notes and Due Date are optional.',
        '',
        'Update - Change an existing task. Provide Task ID and any fields you want to update: title, notes, due date, or status.',
        '',
        'Delete - Remove a task. Provide Task ID and Task List ID.'
      ],
      example: 'Read'
    },
    taskListId: {
      title: 'Google Tasks Task List ID – Step-by-Step',
      steps: [
        '1️⃣ For Default List',
        '   Use "@default" for your main task list',
        '   This is the default value',
        '',
        '2️⃣ For Other Lists',
        '   Use a "List Task Lists" step in your workflow if available',
        '   The response includes an "id" for each list—copy that',
        '',
        '3️⃣ Alternative: Google Tasks API',
        '   Call: GET /tasks/v1/users/@me/lists',
        '   Find the "id" field in the response',
        '',
        '4️⃣ Use the Task List ID',
        '   Paste it into the Task List ID field above',
        '   Use "@default" for your main list',
        '',
        'Example:',
        '@default'
      ],
      example: '@default'
    },
    taskId: {
      title: 'Google Tasks Task ID – Step-by-Step',
      steps: [
        '1️⃣ From a previous node (recommended)',
        '   Use a List Tasks node earlier in the workflow',
        '   Each task in the output has an "id" field',
        '   Use that value here, e.g. {{listTasksNode.tasks[0].id}}',
        '',
        '2️⃣ From Create Task output',
        '   When you create a task, the node returns an "id"',
        '   Use that id for Update or Complete later',
        '',
        '3️⃣ Task IDs are not shown in Gmail/Calendar UI',
        '   They only come from the API or from a previous List Tasks or Create Task step',
        '',
        'Example:',
        'abc123def456'
      ],
      example: 'abc123def456'
    },
    title: {
      title: 'How to get Task Title?',
      steps: [
        'You type or provide the title—it is the text you want the task to show in Google Tasks.',
        '',
        '• Static title: Type it directly, e.g. "Review proposal", "Send weekly report"',
        '',
        '• Dynamic title: If your platform supports expressions, use data from earlier steps, e.g. {{input.actionItem}} or "Follow up: {{trigger.subject}}"',
        '',
        'Keep it short; use the Notes field for longer details.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: 'Complete project report'
    },
    notes: {
      title: 'How to get Notes?',
      steps: [
        'Notes are optional detailed text for the task (instructions, context, links).',
        '',
        '• Static notes: Type or paste directly, e.g. "Check budget and timeline."',
        '',
        '• Dynamic notes: If your platform supports expressions, use data from earlier steps, e.g. {{aiNode.summary}} or "Source: {{trigger.url}}"',
        '',
        'Leave empty if you don’t need notes.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: 'Task notes...'
    },
    due: {
      title: 'How to choose Due Date?',
      steps: [
        'Choose the calendar day when the task should be due.',
        '',
        'Use the date picker or type a date as YYYY-MM-DD, for example 2026-12-31.',
        '',
        'Google Tasks stores task due dates at day level. Time of day is not saved by the Google Tasks API.',
        '',
        'If an older workflow already has an RFC3339 value like 2026-12-31T23:59:59Z, CtrlChecks keeps the same calendar day and sends the Google-compatible value automatically.',
        '',
        'Dynamic value: use data from an earlier step only if it resolves to a date, for example {{input.dueDate}}.',
        '',
        'This field is only used when Operation = Create or Update. It is ignored for Read and Delete.'
      ],
      example: '2026-12-31'
    },
    dueDate: {
      title: 'How to choose Due Date?',
      steps: [
        'Use the Due Date field as a calendar date, for example 2026-12-31.',
        '',
        'Google Tasks stores task due dates at day level. Time of day is not saved by the Google Tasks API.'
      ],
      example: '2026-12-31'
    },
    status: {
      title: 'How to choose Status?',
      steps: [
        'Only used for Update. Choose Completed to check the task off, or Needs Action to reopen it.',
        '',
        'Google Tasks records the completion time automatically when you set Completed — there is no field to pick a custom completion time.',
        '',
        'Leave empty to update other fields (title/notes/due) without changing completion state.'
      ],
      example: 'completed'
    }
  },
  fraud_detection_node: {
    transaction: {
      title: 'How to build the Transaction (JSON)?',
      steps: [
        'The Transaction field is a single JSON object that describes the event you want to check for fraud.',
        '',
        'Include the core details so the model can evaluate risk:',
        '• id: Unique transaction ID from your payment/order system',
        '• amount: Numeric value (no currency symbols)',
        '• currency: 3-letter currency code (USD, INR, EUR)',
        '• merchant: Store, seller, or channel name',
        '• location: Country or region where the transaction happened',
        '• timestamp: ISO date-time (e.g., 2026-02-01T14:32:00Z)',
        '',
        'Where to get these values:',
        '• Payment gateway or order system for id, amount, currency',
        '• User profile or billing address for location',
        '• Your database or logs for timestamp',
        '',
        'Tip: If you do not have a field, leave it out rather than guessing.'
      ],
      example: '{"id":"txn_98456321","amount":4999.00,"currency":"INR","merchant":"Store A","location":"India","timestamp":"2026-02-01T14:32:00Z"}'
    },
    historicalPatterns: {
      title: 'How to set Historical Patterns (JSON)?',
      steps: [
        'Historical Patterns is optional context about typical behavior for this user or account.',
        '',
        'Use it to help the model compare the current transaction against normal activity.',
        '',
        'Common fields include:',
        '• averageAmount: Typical transaction size',
        '• commonMerchants: Usual merchants or channels',
        '• commonLocations: Usual countries or regions',
        '',
        'How to get these values:',
        '• Calculate averages from your last 30–90 days of transactions',
        '• Use your analytics or reporting dashboards',
        '• Store per-user stats in your database for easy reuse',
        '',
        'Tip: If you do not track history, use an empty object {}.'
      ],
      example: '{"averageAmount":800,"commonMerchants":["Store A","Store B"],"commonLocations":["India"]}'
    },
    riskThreshold: {
      title: 'How to set Risk Threshold?',
      steps: [
        'Risk Threshold is the score above which a transaction is flagged as risky.',
        '',
        'This node expects a value from 0 to 1.',
        '• 0.3 = Low threshold (more alerts)',
        '• 0.6 = Medium threshold (balanced)',
        '• 0.8 = High threshold (fewer alerts)',
        '',
        'How to choose a value:',
        '• Start with 0.7 (default)',
        '• Lower it if fraud is missed',
        '• Raise it if too many false positives appear',
        '',
        'Tip: Review outcomes weekly and adjust gradually.'
      ],
      example: '0.7'
    }
  },
  resume_parser: {
    file: {
      title: 'How to provide the Resume File (JSON)?',
      steps: [
        'This field expects a JSON file object with the resume content in Base64.',
        '',
        'Required keys:',
        '• name: File name (e.g., resume.pdf)',
        '• type: File type (pdf, doc, docx, txt, image)',
        '• binary: Base64-encoded file content',
        '',
        'How to get this value:',
        '• From a Form upload field (use its file output)',
        '• From email attachments or file storage nodes',
        '• By encoding a local file to Base64 in your system',
        '',
        'Tip: Use clean, text-based PDFs for best accuracy.'
      ],
      example: '{"name":"John_Doe_Resume.pdf","type":"pdf","binary":"base64..."}'
    },
    normalizeSkills: {
      title: 'What is Normalize Skills?',
      steps: [
        'Normalize Skills standardizes skill names so they match common formats.',
        '',
        'Examples:',
        '• JS → JavaScript',
        '• Py → Python',
        '',
        'Turn this on for better matching and cleaner skill lists.',
        'Turn it off only if you want the raw skill text as-is.'
      ],
      example: 'true'
    },
    experienceCalculation: {
      title: 'What is Calculate Experience?',
      steps: [
        'Calculate Experience estimates total years of experience from the resume timeline.',
        '',
        'Turn this on if you need a single number like "5.5 years".',
        'Turn it off if you only want raw job history details.'
      ],
      example: 'true'
    }
  },
  bitbucket: {
    username: {
      title: 'How to get Bitbucket Username?',
      steps: [
        'Use this only when authenticating with a Bitbucket App Password.',
        'Open Bitbucket -> Personal settings -> Account settings and copy the username/profile slug.',
        'Leave Username blank when Access Token is filled because runtime prefers Bearer accessToken.',
        'Do not use your email address unless it is truly your Bitbucket username.'
      ],
      example: 'your-username'
    },
    appPassword: {
      title: 'How to create a Bitbucket App Password?',
      steps: [
        'Use this only with Username for Basic Auth.',
        'Go to Bitbucket -> Personal settings -> App passwords.',
        'Create an app password with repository read/write permissions for the operations this workflow will run.',
        'Store it in Connections or the credential vault; do not use your Atlassian login password.',
        'Leave this blank when Access Token is filled.'
      ],
      example: '{{$credentials.bitbucket.appPassword}}'
    },
    accessToken: {
      title: 'How to set Bitbucket Access Token?',
      steps: [
        'Use this when your Bitbucket connection provides an OAuth access token.',
        'Runtime uses Authorization: Bearer accessToken when this field is present.',
        'If Access Token is blank, runtime falls back to Basic Auth with Username and App Password.',
        'Keep the token in Connections or the credential vault.'
      ],
      example: '{{$credentials.bitbucket.accessToken}}'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'The current Bitbucket node supports exactly four repository operations.',
        'read: with Repo Slug filled, reads one repository; with Repo Slug blank, lists repositories in the workspace.',
        'create: creates a repository and requires Workspace plus Repo Slug.',
        'update: updates repository metadata and requires Workspace plus Repo Slug.',
        'delete: deletes one repository and requires Workspace plus Repo Slug.',
        'Pull requests, branches, commits, and pipelines are not implemented by this Bitbucket override.'
      ],
      example: 'create'
    },
    workspace: {
      title: 'How to get Workspace?',
      steps: [
        'Workspace is the first path segment in bitbucket.org/WORKSPACE/repo-name.',
        'Enter only the slug, not the full URL.',
        'Runtime requires workspace for every operation unless Repo is filled as workspace/repoSlug.',
        'For personal repositories this may match your username.'
      ],
      example: 'acme-platform'
    },
    repoSlug: {
      title: 'How to get Repository Slug?',
      steps: [
        'Repo Slug is the repository path segment after the workspace.',
        'For bitbucket.org/acme-platform/api-service, enter api-service.',
        'Required for create, update, and delete.',
        'Optional for read; blank read lists repositories in the workspace.'
      ],
      example: 'api-service'
    },
    repo: {
      title: 'How to set Repo?',
      steps: [
        'Repo is a legacy combined value that runtime splits into workspace and repoSlug.',
        'Use workspace/repoSlug, for example acme-platform/api-service.',
        'Prefer separate Workspace and Repository Slug fields in new workflows.',
        'Do not put a GitHub owner/repo value here unless that same repo exists in Bitbucket.'
      ],
      example: 'acme-platform/api-service'
    },
    description: {
      title: 'How to set Description?',
      steps: [
        'Description is used only by create/update when Data JSON is blank.',
        'Runtime sends a default payload with scm git, is_private, and description.',
        'If Data JSON is filled, Data replaces the default payload instead of merging with Description.',
        'Use a short repository purpose such as "Backend API for customer portal".'
      ],
      example: 'Backend API for customer portal.'
    },
    isPrivate: {
      title: 'How to choose Private Repository?',
      steps: [
        'This boolean is used only by create/update when Data JSON is blank.',
        'true creates/updates a private repository in the default payload.',
        'false requests a public repository if your workspace allows it.',
        'Runtime defaults this value to true when it is not supplied.'
      ],
      example: 'true'
    },
    data: {
      title: 'How to set Data JSON?',
      steps: [
        'Data is an optional raw object payload for create/update.',
        'Leave it blank for the default payload: scm git, is_private, and description.',
        'Use a JSON object if you need advanced Bitbucket repository fields.',
        'Avoid quoted JSON strings; the runtime expects object-shaped data.'
      ],
      example: '{"scm":"git","is_private":true,"description":"Project repo"}'
    }
  },
  docker: {
    host: {
      title: 'How to set Docker Host?',
      steps: [
        'Docker Host is the address of the Docker daemon.',
        '',
        'Common values:',
        '• localhost (for local TCP access)',
        '• unix:///var/run/docker.sock (Linux/macOS socket)',
        '',
        'Tip: Use the socket for local machines when possible.'
      ],
      example: 'localhost'
    },
    port: {
      title: 'How to set Docker Port?',
      steps: [
        'Port is used only for TCP connections.',
        '',
        'Common values:',
        '• 2375 = TCP (no TLS)',
        '• 2376 = TLS',
        '',
        'Leave the default unless your Docker daemon uses a different port.'
      ],
      example: '2375'
    },
    operation: {
      title: 'How to choose Operation?',
      steps: [
        'Operation tells Docker what action to run.',
        '',
        'Examples:',
        '• List Containers / Images',
        '• Build / Tag / Push / Pull Image',
        '• Start / Stop / Inspect Container',
        '',
        'Pick the action that matches your workflow step.'
      ],
      example: 'list_containers'
    },
    containerId: {
      title: 'How to get Container ID or Name?',
      steps: [
        'You can use either the container name or ID.',
        '',
        'How to find it:',
        '• Run: docker ps (or docker ps -a)',
        '• Copy the CONTAINER ID or NAMES value',
        '',
        'Tip: Names are easier to remember.'
      ],
      example: 'web-server'
    },
    imageName: {
      title: 'How to set Image Name?',
      steps: [
        'Image Name follows the format: repository:tag',
        '',
        'Examples:',
        '• nginx:latest',
        '• node:18',
        '• registry.example.com/myapp:v1.0.0',
        '',
        'Tip: If no tag is provided, "latest" is used.'
      ],
      example: 'nginx:latest'
    },
    dockerfilePath: {
      title: 'How to set Dockerfile Path?',
      steps: [
        'This is the path to your Dockerfile for builds.',
        '',
        'Examples:',
        '• ./Dockerfile',
        '• ./docker/Dockerfile',
        '',
        'Tip: The path is relative to the build context.'
      ],
      example: './Dockerfile'
    },
    buildContext: {
      title: 'What is Build Context?',
      steps: [
        'Build Context is the folder Docker uses for build files.',
        '',
        'Common value: . (current directory)',
        'All files in this folder can be accessed by the Dockerfile.'
      ],
      example: '.'
    },
    tag: {
      title: 'How to set Tag?',
      steps: [
        'Tag is the image name used for tag/push/pull operations.',
        '',
        'Format: repository:tag',
        'Example: myapp:v1.0.0'
      ],
      example: 'myapp:v1.0.0'
    },
    sourceTag: {
      title: 'What is Source Tag?',
      steps: [
        'Source Tag is the existing image you want to tag.',
        '',
        'Example: myapp:latest',
        'Used only for tag_image operation.'
      ],
      example: 'myapp:latest'
    },
    registry: {
      title: 'How to set Registry?',
      steps: [
        'Registry is where images are stored.',
        '',
        'Examples:',
        '• docker.io (Docker Hub)',
        '• registry.example.com',
        '',
        'Use the registry required by your organization.'
      ],
      example: 'docker.io'
    },
    registryUsername: {
      title: 'How to set Registry Username?',
      steps: [
        'Enter the username for your container registry.',
        '',
        'Required only for private registries or private images.'
      ],
      example: 'registry-user'
    },
    registryPassword: {
      title: 'How to set Registry Password?',
      steps: [
        'Enter the password or access token for your registry account.',
        '',
        'Tip: Use tokens instead of real passwords when possible.'
      ],
      example: 'registry-token'
    }
  },

  postgresql: {
    operation: {
      title: 'How to choose PostgreSQL Operation?',
      steps: [
        'Choose Execute Query for raw SQL with $1, $2 placeholders and Parameters.',
        'Choose Insert to write Data into Table and return inserted rows.',
        'Choose Update to change rows in Table that match Where.',
        'Choose Delete to remove rows in Table that match Where.',
        'Older saved values such as select/query do not match the worker; use executeQuery, insert, update, or delete.'
      ],
      example: 'executeQuery'
    },
    query: {
      title: 'How to write PostgreSQL Query?',
      steps: [
        'Write PostgreSQL SQL exactly as it should run.',
        'Use $1, $2, and later placeholders for changing values.',
        'Put the matching values in Parameters as a JSON array.',
        'Use SELECT for reads and RETURNING * on writes when the next step needs changed rows.'
      ],
      example: 'SELECT id, email FROM customers WHERE status = $1 LIMIT 50'
    },
    parameters: {
      title: 'How to set PostgreSQL Parameters?',
      steps: [
        'Enter a JSON array in the same order as the SQL placeholders.',
        'The first value fills $1, the second value fills $2, and so on.',
        'Map values from earlier steps such as {{$json.customerId}}.',
        'The worker now accepts this documented field as the params array.'
      ],
      example: '["active", "{{$json.customerId}}"]'
    },
    where: {
      title: 'How to set PostgreSQL Where?',
      steps: [
        'Use a JSON object with exact-match column filters.',
        'Update and Delete require this filter so the worker does not change every row.',
        'Use stable IDs from earlier steps whenever possible.',
        'Multiple keys are combined with AND.'
      ],
      example: '{"id":"{{$json.customerId}}"}'
    }
  },

  mysql: {
    operation: {
      title: 'How to choose MySQL Operation?',
      steps: [
        'Choose Execute Query for raw SQL with ? placeholders and Parameters.',
        'Choose Insert to write Data into Table.',
        'Choose Update to change rows in Table that match Where.',
        'Choose Delete to remove rows in Table that match Where.',
        'The old select/filter/limit setup was not what the worker executed.'
      ],
      example: 'executeQuery'
    },
    query: {
      title: 'How to write MySQL Query?',
      steps: [
        'Write valid MySQL SQL.',
        'Use ? placeholders for changing values.',
        'Put the matching values in Parameters as a JSON array.',
        'Use a small LIMIT for preview/report queries.'
      ],
      example: 'SELECT id, email FROM customers WHERE status = ? LIMIT 50'
    },
    parameters: {
      title: 'How to set MySQL Parameters?',
      steps: [
        'Enter a JSON array in the same order as the ? placeholders.',
        'The first value fills the first ?, the second value fills the second ?.',
        'Map values from earlier steps such as {{$json.customerId}}.',
        'Use Parameters instead of pasting customer values directly into SQL.'
      ],
      example: '["active", "{{$json.customerId}}"]'
    },
    where: {
      title: 'How to set MySQL Where?',
      steps: [
        'Use a JSON object with exact-match column filters.',
        'Update and Delete require Where so the worker does not affect too many rows.',
        'Use stable IDs from earlier steps whenever possible.',
        'Multiple keys are combined with AND.'
      ],
      example: '{"id":"{{$json.customerId}}"}'
    }
  },

  oracle_database: {
    operation: {
      title: 'How to choose Oracle Operation?',
      steps: [
        'Choose Select to read table rows with filters, sort, and limit.',
        'Choose Insert, Update, or Insert or Update for mapped table writes.',
        'Choose Delete only with a reviewed Delete Command and Row Filters.',
        'Choose Execute SQL for custom SQL or PL/SQL with bind parameters.',
        'Execute SQL statements must not end with a semicolon.'
      ],
      example: 'select'
    },
    selectRows: {
      title: 'How to set Oracle Row Filters?',
      steps: [
        'Enter a JSON array of column/operator/value objects.',
        'Use it as WHERE conditions for Select, Update, Delete, and as match keys for Insert or Update.',
        'Update without Row Filters is blocked by the worker.',
        'Use bind-style mapped values such as {{$json.employeeId}}.'
      ],
      example: '[{"column":"EMPLOYEE_ID","operator":"=","value":"{{$json.employeeId}}"}]'
    },
    statement: {
      title: 'How to write Oracle SQL / PL/SQL Statement?',
      steps: [
        'Use this only with Execute SQL.',
        'Write SQL or PL/SQL without a trailing semicolon.',
        'Use bind variables such as :id or :1 for values.',
        'Put bind values in Bind Parameters.'
      ],
      example: 'SELECT * FROM HR.EMPLOYEES WHERE EMPLOYEE_ID = :id'
    }
  },

  pinecone: {
    index: {
      title: 'How to set Pinecone Index?',
      steps: [
        'For serverless indexes, paste the full index host URL from Pinecone index details.',
        'It usually starts with https:// and ends with pinecone.io.',
        'Do not use the dashboard/project URL.',
        'Use namespaces to separate tenants or environments inside one index.'
      ],
      example: 'https://support-kb-abcd123.svc.us-east-1-aws.pinecone.io'
    },
    vector: {
      title: 'How to set Pinecone Vector?',
      steps: [
        'Map the embedding array from an embedding model step, such as {{$json.embedding}}.',
        'The array length must match the Pinecone index dimension.',
        'Use Vector for Query and Upsert.',
        'Do not paste the original text; Pinecone expects numbers.'
      ],
      example: '{{$json.embedding}}'
    },
    id: {
      title: 'How to set Pinecone Vector ID?',
      steps: [
        'Use a stable ID for each document chunk or record.',
        'Upsert replaces the vector with the same ID, so stable IDs prevent duplicates.',
        'Delete removes the vector with this ID.',
        'Build it from document ID plus chunk number when indexing text.'
      ],
      example: 'kb-returns-policy-0003'
    }
  },

  qdrant: {
    operation: {
      title: 'How to choose Qdrant Operation?',
      steps: [
        'Choose Query/Search to search for similar vectors; the runtime value is query.',
        'Choose Upsert to store or replace one point.',
        'Choose Delete to remove one point by ID.',
        'The old search and get_collection values are not accepted by the worker.'
      ],
      example: 'query'
    },
    url: {
      title: 'How to set Qdrant URL?',
      steps: [
        'Paste the Qdrant API endpoint, not the dashboard page.',
        'For Qdrant Cloud, copy the cluster URL from the cluster overview.',
        'For local testing, use http://localhost:6333 if the worker can reach it.',
        'Leave off the trailing slash.'
      ],
      example: 'https://support-search.us-east.aws.cloud.qdrant.io'
    },
    vector: {
      title: 'How to set Qdrant Vector?',
      steps: [
        'Map an embedding array from an embedding model step.',
        'The array length must match the collection vector size.',
        'Use Vector for Query/Search and Upsert.',
        'Upsert can auto-create a missing collection using this vector length.'
      ],
      example: '{{$json.embedding}}'
    },
    id: {
      title: 'How to set Qdrant Point ID?',
      steps: [
        'Use a stable numeric or UUID-style ID for the point.',
        'Upsert stores or replaces this point.',
        'Delete removes this point.',
        'Do not leave it blank for Upsert because the current runtime can fall back to point 1.'
      ],
      example: 'kb-returns-policy-0003'
    }
  },
  redis: {
    operation: {
      title: 'How to choose Redis Operation?',
      steps: [
        'Use Get, Set, Delete, Incr, HGet, HSet, LPush, RPop, or Command exactly as shown in the dropdown.',
        'The runtime validates the operation before connecting and returns an _error when the value is not supported.',
        'Choose Command only for Redis commands that are not covered by the specific operations.',
        'Set, HSet, and LPush require Value; HGet and HSet require Hash and Field; Command requires Command.'
      ],
      example: 'get'
    },
    host: {
      title: 'How to set Redis Host?',
      steps: [
        'Use the Redis hostname without redis:// unless your provider specifically gives only a URL-style endpoint.',
        'Local Redis usually uses localhost with port 6379.',
        'Managed Redis providers usually show the host, port, password, database number, and TLS requirement in the connection details.',
        'The worker requires Host; missing Host fails before any Redis command runs.'
      ],
      example: 'redis-cache.example.com'
    },
    port: {
      title: 'How to set Redis Port?',
      steps: [
        'Use 6379 for a normal Redis endpoint unless your provider gives a different port.',
        'Use the TLS port when TLS is enabled by the provider.',
        'The runtime accepts only numbers from 1 through 65535.',
        'Keep Host and Port as separate fields.'
      ],
      example: '6379'
    },
    key: {
      title: 'How to set Redis Key?',
      steps: [
        'Provide the exact Redis key for Get, Set, Delete, Incr, LPush, or RPop.',
        'Use a stable prefix such as customer:{{$json.customerId}} so keys do not collide.',
        'The runtime requires Key for these operations and returns an _error when it is blank.',
        'Hash operations use Hash and Field instead of Key.'
      ],
      example: 'session:{{$json.sessionId}}'
    },
    command: {
      title: 'How to set Redis Command?',
      steps: [
        'Use Command only when a specific operation does not exist in the dropdown.',
        'Type the Redis command name such as EXPIRE, TTL, or ZADD.',
        'Put command arguments in Args as a JSON array.',
        'The runtime returns the raw command result in result.'
      ],
      example: 'TTL'
    }
  },
  sql_server: {
    operation: {
      title: 'How to choose SQL Server Operation?',
      steps: [
        'Use Execute Query for raw T-SQL or for a generated SELECT TOP query when Table is set and Query is blank.',
        'Use Insert, Update, Delete, or Stored Procedure for structured operations.',
        'The worker also accepts legacy aliases query, rawSql, raw_sql, and select as Execute Query.',
        'Unsupported values fail with an operation validation error before a query is sent.'
      ],
      example: 'executeQuery'
    },
    host: {
      title: 'How to set SQL Server Host?',
      steps: [
        'Use the server hostname or IP address, without the database name.',
        'Azure SQL usually looks like company.database.windows.net.',
        'Keep Port in the Port field; SQL Server defaults to 1433.',
        'Host, Database, Username, and Password are required by the runtime.'
      ],
      example: 'orders.database.windows.net'
    },
    query: {
      title: 'How to set SQL Server Query?',
      steps: [
        'Use Query for Execute Query and write valid T-SQL.',
        'Named parameters can be supplied with Params or Parameters JSON.',
        'For Execute Query, you may leave Query blank when Table is set; the runtime generates SELECT TOP from Table and Limit.',
        'Do not put Insert or Update row objects here; use Data JSON for those operations.'
      ],
      example: 'SELECT TOP 50 * FROM dbo.Orders WHERE status = @status'
    },
    data: {
      title: 'How to set SQL Server Data?',
      steps: [
        'Use Data JSON for Insert and Update row values.',
        'Each key must match a table column that the database user can write.',
        'The runtime accepts Data as an object or a JSON string.',
        'Update also needs Where JSON so the runtime can build a safe WHERE clause.'
      ],
      example: '{"status":"paid","updated_at":"{{$now}}"}'
    },
    where: {
      title: 'How to set SQL Server Where?',
      steps: [
        'Use Where JSON for Update and Delete filters.',
        'Each key becomes an equality condition joined with AND.',
        'The runtime refuses Update and Delete when Where is missing or empty.',
        'Filters is accepted as a backend alias, but the UI field is Where.'
      ],
      example: '{"id":"{{$json.orderId}}"}'
    }
  },
  timescaledb: {
    operation: {
      title: 'How to choose TimescaleDB Operation?',
      steps: [
        'Use Execute Query for raw PostgreSQL SQL against TimescaleDB.',
        'Use Insert, Update, and Delete for table writes.',
        'Use Time Bucket, First, or Last for the runtime time-series helpers.',
        'The old UI values select and query are not runtime operations for this node.'
      ],
      example: 'timeBucket'
    },
    query: {
      title: 'How to set TimescaleDB Query?',
      steps: [
        'Use Query only with Execute Query.',
        'Write PostgreSQL-compatible SQL that TimescaleDB can run.',
        'Use Params JSON for ordered PostgreSQL parameters when needed.',
        'For time-series helpers, use Table, Time Column, Interval, Bucket Column, and Value Column instead.'
      ],
      example: 'SELECT time, device_id, temperature FROM metrics WHERE time > now() - interval \'1 hour\''
    },
    table: {
      title: 'How to set TimescaleDB Table?',
      steps: [
        'Use the hypertable or table name for Insert, Update, Delete, Time Bucket, First, and Last.',
        'Include a schema prefix when the table is not on the default search path.',
        'The runtime does not quote or discover table names for you.',
        'Keep SQL expressions out of Table; use Query when you need custom SQL.'
      ],
      example: 'public.sensor_readings'
    },
    timeColumn: {
      title: 'How to set TimescaleDB Time Column?',
      steps: [
        'Use the timestamp column that TimescaleDB should bucket or order by.',
        'Time Bucket, First, and Last require Time Column.',
        'The column should be indexed or be the hypertable time column for good performance.',
        'Do not include SQL functions here; provide only the column name.'
      ],
      example: 'recorded_at'
    },
    bucketColumn: {
      title: 'How to set TimescaleDB Bucket Column?',
      steps: [
        'Use Bucket Column with Time Bucket to group counts by another dimension.',
        'Typical values are device_id, customer_id, region, or sensor_id.',
        'The current runtime requires Bucket Column for Time Bucket.',
        'Use Query instead if you need a pure time-only bucket query.'
      ],
      example: 'device_id'
    }
  },
  aws_s3: {
    operation: {
      title: 'How to choose AWS S3 Operation?',
      steps: [
        'Use Get, Put, List, or Delete in the UI.',
        'The runtime normalizes Get to download and Put to upload.',
        'Bucket is required for every operation; Key is required for Get, Put, and Delete.',
        'Upload data can come from Data Base64, Data, or Content.'
      ],
      example: 'put'
    },
    bucket: {
      title: 'How to set AWS S3 Bucket?',
      steps: [
        'Use the bucket name only, without s3:// and without a folder path.',
        'The AWS credentials must allow the selected operation on this bucket.',
        'For List, Prefix controls which folder-like path is returned.',
        'The runtime returns _error when Bucket is missing.'
      ],
      example: 'customer-exports-prod'
    },
    key: {
      title: 'How to set AWS S3 Key?',
      steps: [
        'Use the full object key inside the bucket, including any folder prefixes.',
        'Get, Put, and Delete require Key.',
        'Use workflow expressions for dynamic filenames.',
        'Do not start with s3://bucket/ because Bucket is already a separate field.'
      ],
      example: 'exports/{{$json.customerId}}/invoice.pdf'
    },
    dataBase64: {
      title: 'How to set AWS S3 Data Base64?',
      steps: [
        'Use Data Base64 when uploading binary content that has already been encoded.',
        'The runtime decodes this value before sending the object to S3.',
        'For plain text or JSON uploads, use Data or Content instead.',
        'Put fails when none of Data Base64, Data, or Content is provided.'
      ],
      example: '{{$json.fileBase64}}'
    },
    contentType: {
      title: 'How to set AWS S3 Content Type?',
      steps: [
        'Use a MIME type that matches the object you upload.',
        'Examples include application/json, text/csv, image/png, and application/pdf.',
        'The runtime stores this as object metadata on upload.',
        'Leave blank only when S3 can safely infer or the content type does not matter.'
      ],
      example: 'application/pdf'
    }
  },
  dropbox: {
    operation: {
      title: 'How to choose Dropbox Operation?',
      steps: [
        'Use Read, Upload, List, or Delete in the UI.',
        'The runtime normalizes Read to download.',
        'Read, Upload, and Delete require Path; List can use Path as the folder to list.',
        'Upload data can come from Data Base64, Data, or Content.'
      ],
      example: 'read'
    },
    accessToken: {
      title: 'How to set Dropbox Access Token?',
      steps: [
        'Prefer a saved Dropbox connection so the worker can load the token from the credential vault.',
        'Use Access Token only as a direct fallback for this node.',
        'The token must have the Dropbox scopes needed for the selected file operation.',
        'The runtime returns an access token not found error when neither source exists.'
      ],
      example: '{{$credentials.dropbox.accessToken}}'
    },
    path: {
      title: 'How to set Dropbox Path?',
      steps: [
        'Use an absolute Dropbox path that starts with a slash.',
        'Read, Upload, and Delete require Path.',
        'For List, leave Path blank or use a folder path such as /exports.',
        'Use expressions for dynamic filenames and keep folder names exactly as they appear in Dropbox.'
      ],
      example: '/exports/{{$json.fileName}}.csv'
    },
    dataBase64: {
      title: 'How to set Dropbox Data Base64?',
      steps: [
        'Use Data Base64 when uploading binary content encoded by an earlier node.',
        'The runtime decodes the value before sending it to Dropbox.',
        'For plain text, use Data or Content instead.',
        'Upload fails when none of Data Base64, Data, or Content is provided.'
      ],
      example: '{{$json.fileBase64}}'
    },
    recursive: {
      title: 'How to set Dropbox Recursive?',
      steps: [
        'Enable Recursive only for List when subfolders should be included.',
        'Large Dropbox folders can return many items, so use it intentionally.',
        'Recursive does not affect Read, Upload, or Delete.',
        'The runtime returns items, cursor, and hasMore for list responses.'
      ],
      example: 'false'
    }
  },
  read_binary_file: {
    sourceType: {
      title: 'How to choose Read Source?',
      steps: [
        'Choose Workflow File Asset for files created by Write Binary File.',
        'Choose Server Storage Path only for trusted files under the backend binary storage root.',
        'Cloud links are not valid here; use the matching cloud connector first.',
        'The output is always file metadata plus dataBase64 when the read succeeds.'
      ],
      example: 'assetId'
    },
    assetId: {
      title: 'How to set Asset ID?',
      steps: [
        'Map the Asset ID returned by Write Binary File.',
        'Use {{$json.assetId}} when the previous node wrote the file and Persist Metadata was enabled.',
        'The runtime looks this ID up in workflow_file_assets.',
        'If the ID is missing or stale, the read returns a file asset not found error.'
      ],
      example: '{{$json.assetId}}'
    },
    filePath: {
      title: 'How to set Storage Path?',
      steps: [
        'Use this only for files under the backend binary storage root.',
        'Enter a relative path such as reports/report.pdf.',
        'Do not paste Google Drive, Dropbox, S3, OneDrive, public, or local desktop URLs.',
        'Unsafe paths outside the storage root are rejected.'
      ],
      example: 'reports/report.pdf'
    }
  },
  write_binary_file: {
    dataBase64: {
      title: 'How to set Binary Data?',
      steps: [
        'Map the file body from a previous node, usually {{$json.dataBase64}}.',
        'Base64 and data URLs are best for PDFs, images, and Office files.',
        'Plain text is accepted when you want to create a text, CSV, JSON, or HTML file.',
        'The node returns assetId plus normalized dataBase64 for later nodes.'
      ],
      example: '{{$json.dataBase64}}'
    },
    fileName: {
      title: 'How to set File Name?',
      steps: [
        'Use a file name with the correct extension.',
        'The name helps infer MIME type and gives downstream uploads or attachments a readable name.',
        'You can build dynamic names from earlier data.',
        'Avoid absolute paths here; use Folder or Custom Storage Path for storage placement.'
      ],
      example: 'invoice-{{$json.invoiceId}}.pdf'
    },
    persist: {
      title: 'How to set Persist Metadata?',
      steps: [
        'Keep this enabled when a later Read Binary File node should use Asset ID.',
        'Disable only for temporary files that will be handled immediately by storageKey or filePath.',
        'When enabled, the runtime saves workflow_file_assets metadata.',
        'The output includes metadataPersisted and may include metadataError if the file wrote but metadata save failed.'
      ],
      example: 'true'
    }
  },
  ftp: {
    operation: {
      title: 'How to choose FTP Operation?',
      steps: [
        'Use Get File to download, Put File to upload, List Files to inspect a folder, or Delete File to remove one file.',
        'Generated configs may use download/upload aliases, but the visual panel uses get/put.',
        'Remote Path is required for every operation.',
        'Put File also needs Content, Data Base64, or File Data.'
      ],
      example: 'get'
    },
    host: {
      title: 'How to set FTP Host?',
      steps: [
        'Enter only the FTP server hostname or IP address.',
        'Do not include ftp:// or the remote folder path.',
        'Get it from your hosting panel, FTP account settings, or partner transfer instructions.',
        'Use SFTP instead when the server supports SSH-based transfer.'
      ],
      example: 'ftp.fulfillment-partner.com'
    },
    remotePath: {
      title: 'How to set FTP Remote Path?',
      steps: [
        'Use a file path for Get, Put, and Delete.',
        'Use a folder path for List.',
        'Paths may be absolute, starting with /, or relative if the FTP account allows it.',
        'Do not include the server host in this field.'
      ],
      example: '/incoming/orders.csv'
    },
    content: {
      title: 'How to set FTP Content?',
      steps: [
        'Fill this only for Put File.',
        'Use plain text for text/CSV/JSON files.',
        'Use {{$json.dataBase64}} for PDFs, images, spreadsheets, or files downloaded earlier.',
        'Leaving all upload body fields empty makes Put fail.'
      ],
      example: '{{$json.dataBase64}}'
    }
  },
  sftp: {
    operation: {
      title: 'How to choose SFTP Operation?',
      steps: [
        'Use Get File to download, Put File to upload, List Files to inspect a folder, or Delete File to remove one file.',
        'Generated configs may use download/upload aliases, but the visual panel uses get/put.',
        'Remote Path is required for every operation.',
        'Put File also needs Content, Data Base64, or File Data.'
      ],
      example: 'get'
    },
    host: {
      title: 'How to set SFTP Host?',
      steps: [
        'Enter only the SSH/SFTP server hostname or IP address.',
        'Do not include sftp:// or the remote folder path.',
        'Get it from the server admin, hosting panel, or partner transfer instructions.',
        'SFTP uses SSH, usually on port 22.'
      ],
      example: 'sftp.payroll-vendor.com'
    },
    privateKey: {
      title: 'How to set SFTP Private Key?',
      steps: [
        'Use Private Key only when the SFTP account authenticates with an SSH key.',
        'Paste the full private key including BEGIN and END lines, preferably in a saved connection.',
        'Leave Password blank when key-only authentication is required.',
        'Use Passphrase only when the private key itself is encrypted.'
      ],
      example: '-----BEGIN OPENSSH PRIVATE KEY-----'
    },
    remotePath: {
      title: 'How to set SFTP Remote Path?',
      steps: [
        'Use a file path for Get, Put, and Delete.',
        'Use a folder path for List.',
        'Absolute paths start with /; some servers also allow home-relative paths.',
        'Do not include the server host in this field.'
      ],
      example: '/daily/transactions.csv'
    }
  },
  onedrive: {
    operation: {
      title: 'How to choose OneDrive Operation?',
      steps: [
        'Use Read to download, Upload to write, List to inspect a folder, or Delete to remove one item.',
        'Read is normalized to download inside the runtime.',
        'Read and Upload require Path.',
        'Delete can use File ID or Path.'
      ],
      example: 'read'
    },
    path: {
      title: 'How to set OneDrive Path?',
      steps: [
        'Use a OneDrive path under the signed-in user drive.',
        'Include the final file name for Read and Upload.',
        'The runtime normalizes missing leading slashes.',
        'Do not paste a sharing URL; use a path such as /Reports/report.pdf.'
      ],
      example: '/Reports/month-end.xlsx'
    },
    fileId: {
      title: 'How to set OneDrive File ID?',
      steps: [
        'Use File ID for Delete when a previous OneDrive list or upload returned an item ID.',
        'Read and Upload use Path in the current runtime.',
        'File ID is useful when the item path may have changed.',
        'Leave it blank when deleting by exact Path.'
      ],
      example: '01ABC123DEF456'
    },
    content: {
      title: 'How to set OneDrive Upload Content?',
      steps: [
        'Fill this only for Upload.',
        'Use {{$json.dataBase64}} for PDFs, images, Office files, or downloaded files.',
        'Plain text is accepted for text, CSV, JSON, and HTML files.',
        'Upload fails when content, dataBase64, and data are all empty.'
      ],
      example: '{{$json.dataBase64}}'
    }
  },
  ai_agent: {
    userInput: {
      title: 'How to set AI Agent User Input?',
      steps: [
        'Map the exact message or task the agent should answer, such as {{$json.message}}.',
        'Leave it blank only when the previous node already sends message, text, input, content, query, prompt, or userInput.',
        'Objects can be stringified by the runtime, so map the precise customer question or document text when possible.',
        'The answer is returned as response_text, and JSON/key-value modes may also fill response_json.'
      ],
      example: '{{$json.message}}'
    },
    model: {
      title: 'How to choose AI Agent Model?',
      steps: [
        'Choose the model that matches the provider key available to the workflow.',
        'gemini models use Gemini wallet/key-pool access; claude models use Anthropic; gpt models use OpenAI.',
        'If the matching provider key is missing, Gemini paths return _error and other provider calls may fail the node.',
        'Changing the model does not change the System Prompt or output format.'
      ],
      example: 'gemini-3.5-flash'
    },
    systemPrompt: {
      title: 'How to set AI Agent System Prompt?',
      steps: [
        'Write the role, task, boundaries, and response format the model should follow.',
        'Include business rules such as tone, escalation policy, or required JSON keys.',
        'Use expressions like {{$json.policy}} only for business context, never API keys or secrets.',
        'A weak prompt can produce output that downstream nodes cannot map reliably.'
      ],
      example: 'Classify the support request and return JSON with category and priority.'
    },
    outputFormat: {
      title: 'How to choose AI Agent Output Format?',
      steps: [
        'Use text for normal replies, json for structured objects, keyvalue for colon-separated lines, and markdown for formatted human-readable output.',
        'Tell the model the same format in System Prompt; the dropdown only controls output packaging.',
        'If JSON parsing fails, the runtime wraps the raw answer as response_json.content.',
        'Downstream nodes usually map response_text or response_json fields.'
      ],
      example: 'json'
    },
    includeReasoning: {
      title: 'How to use Include Reasoning?',
      steps: [
        'Turn this on when you want provider/model metadata for debugging or audit logs.',
        'The runtime adds a reasoning object with steps, provider, and model.',
        'It does not expose private chain-of-thought.',
        'Leave it off for cleaner production output.'
      ],
      example: 'false'
    }
  },
  ai_chat_model: {
    prompt: {
      title: 'How to set AI Chat Model Prompt?',
      steps: [
        'Enter the question or instruction Gemini should answer, or map it from a previous node such as {{$json.emailBody}}.',
        'If the prompt is static and upstream text exists, the runtime may use the static prompt as system context and upstream text as the user message.',
        'A blank effective prompt returns _error: AI Chat Model node: prompt is required.',
        'Use Response Format json only when your prompt clearly asks for valid JSON.'
      ],
      example: 'Summarize {{$json.emailBody}} as JSON.'
    },
    model: {
      title: 'How to choose AI Chat Model Model?',
      steps: [
        'The dropdown is visible, but the current executor hardcodes gemini-3.5-flash.',
        'Leave it at gemini-3.5-flash for now.',
        'Use AI Agent or a provider-specific node if you need a different model today.',
        'The output model field reports the actual adapter model.'
      ],
      example: 'gemini-3.5-flash'
    },
    responseFormat: {
      title: 'How to choose AI Chat Model Response Format?',
      steps: [
        'Choose text for normal answers or json when the next node needs structured values.',
        'JSON mode attempts JSON.parse on the model text.',
        'If parsing fails, response falls back to raw text instead of throwing.',
        'Add JSON-only instructions to Prompt or System Prompt for reliable mapping.'
      ],
      example: 'json'
    }
  },
  anthropic_claude: {
    apiKey: {
      title: 'How to set Anthropic API Key?',
      steps: [
        'Prefer a saved Anthropic connection in CtrlChecks Connections so the key stays in the credential vault.',
        'The runtime can also use apiKey, accessToken, token, or a saved anthropic vault credential.',
        'Use a key that has access to the selected Claude model.',
        'Never paste the key into Prompt, Messages, or customer data.'
      ],
      url: 'https://console.anthropic.com/settings/keys',
      example: '{{$credentials.anthropic.apiKey}}'
    },
    prompt: {
      title: 'How to set Claude Prompt?',
      steps: [
        'Use Prompt for normal UI workflows and map source text with expressions such as {{$json.contractText}}.',
        'Prompt wins over Messages when both are present.',
        'If Prompt and Messages are both empty, the node has no useful content to send.',
        'Successful output contains response/model/usage/finishReason and does not preserve incoming fields.'
      ],
      example: 'List the top risks in {{$json.contractText}}.'
    },
    messages: {
      title: 'How to set Claude Messages?',
      steps: [
        'Use Messages only for generated or API-created configs that already have a chat-message array.',
        'The executor joins message content into a prompt only when Prompt is blank.',
        'Use JSON objects with content fields, or map a prepared array from upstream.',
        'Do not fill both Prompt and Messages expecting both to be sent.'
      ],
      example: '[{"role":"user","content":"{{$json.question}}"}]'
    },
    temperature: {
      title: 'How to use Claude Temperature?',
      steps: [
        'This field is visible but the current anthropic_claude executor does not pass it to the adapter.',
        'Leave it at the default for compatibility.',
        'Use Prompt and Model to control behavior today.',
        'Do not rely on Temperature or Memory for deterministic Claude output until the worker changes.'
      ],
      example: '0.7'
    }
  },
  chat_model: {
    temperature: {
      title: 'How to set Chat Model Temperature?',
      steps: [
        'Temperature is the only visible field the current chat_model executor reads.',
        'The node returns it inside a config object with provider gemini and model gemini-3.5-flash.',
        'It does not generate a response by itself.',
        'Use AI Chat Model, AI Agent, or a provider-specific node when temperature must affect generated text.'
      ],
      example: '0.7'
    },
    prompt: {
      title: 'How to use Chat Model Prompt?',
      steps: [
        'The Prompt field is visible but ignored by the current chat_model executor.',
        'Do not put production instructions here expecting a model response.',
        'Move real prompts to AI Chat Model, AI Agent, Anthropic Claude, Google Gemini, OpenAI GPT, or Cohere.',
        'Chat Model output is config only: provider, model, temperature, and _chat_model_config.'
      ],
      example: 'You are a helpful assistant.'
    }
  },
  cohere: {
    apiKey: {
      title: 'How to set Cohere API Key?',
      steps: [
        'Create a Cohere API key in the Cohere dashboard and store it through a secure credential mapping.',
        'The current executor reads the apiKey field directly and sends it as a Bearer token.',
        'If empty, output is success=false with error: Cohere apiKey is required.',
        'Never paste the key into Prompt, Preamble, or ordinary workflow data.'
      ],
      url: 'https://dashboard.cohere.com',
      example: '{{$credentials.cohere.apiKey}}'
    },
    prompt: {
      title: 'How to set Cohere Prompt?',
      steps: [
        'Enter the user message or task, or map text from upstream with {{$json.text}}.',
        'If Prompt is static and upstream text exists, the runtime may use upstream text as the message and Prompt as preamble.',
        'Blank prompt with no upstream message returns success=false with error: prompt is required.',
        'Use Preamble for standing instructions and Prompt for the actual task.'
      ],
      example: 'Summarize {{$json.ticketBody}}.'
    },
    preamble: {
      title: 'How to set Cohere Preamble?',
      steps: [
        'Use Preamble for system-style instructions such as tone, format, or role.',
        'It shapes the response but is not returned as a separate output field.',
        'Leave it blank for a simple one-off prompt.',
        'Do not put the API key or customer secrets in Preamble.'
      ],
      example: 'Be concise and factual.'
    },
    maxTokens: {
      title: 'How to set Cohere Max Tokens?',
      steps: [
        'Enter the maximum response length Cohere should generate.',
        'Use smaller values for labels, titles, or short summaries; larger values for longer reports.',
        'Validation requires at least 1.',
        'Large limits can increase cost and latency.'
      ],
      example: '512'
    }
  },
  schedulewise: {
    operation: {
      title: 'ScheduleWise Operation',
      steps: [
        'Choose getSchedules to list appointments, createAppointment to book a slot, updateAppointment to change a slot or status, or deleteAppointment to remove a slot.',
        'Runtime accepts only those four values.',
        'The selected value is returned as {{$json.operation}}.',
        'Invalid values return INVALID_OPERATION.'
      ],
      example: 'getSchedules'
    },
    credentialId: {
      title: 'ScheduleWise Credential Reference',
      steps: [
        'Use this as a reference label only.',
        'Runtime looks up the saved schedulewise credential from Connections and does not use this as the secret value.',
        'Store API Base URL plus accessToken or apiKey in the credential vault.',
        'Do not paste the API key or access token into this field.'
      ],
      example: 'prod-schedulewise'
    },
    dateFrom: {
      title: 'ScheduleWise Date From',
      steps: [
        'Used by Get Schedules as the earliest appointment date.',
        'Use ISO 8601 such as 2026-07-20 or map {{$json.startDate}}.',
        'Runtime sends this as the dateFrom query parameter.',
        'Leave blank to send no lower date filter.'
      ],
      example: '{{$json.startDate}}'
    },
    dateTo: {
      title: 'ScheduleWise Date To',
      steps: [
        'Used by Get Schedules as the latest appointment date.',
        'Use ISO 8601 such as 2026-07-21 or map {{$json.endDate}}.',
        'Runtime sends this as the dateTo query parameter.',
        'Make sure it is not earlier than Date From.'
      ],
      example: '{{$json.endDate}}'
    },
    patientId: {
      title: 'ScheduleWise Patient ID',
      steps: [
        'Use the exact ScheduleWise patient record ID.',
        'Get Schedules uses it as a filter; Create Appointment sends it in the body.',
        'Map it from intake data with {{$json.patientId}}.',
        'Use the ID, not the patient display name.'
      ],
      example: '{{$json.patientId}}'
    },
    staffId: {
      title: 'ScheduleWise Staff ID',
      steps: [
        'Use the ScheduleWise staff or provider ID.',
        'Get Schedules can filter by staff; Create and Update can assign staff.',
        'Map it from routing logic with {{$json.staffId}}.',
        'Use the provider ID, not the email or name unless ScheduleWise expects that.'
      ],
      example: '{{$json.staffId}}'
    },
    appointmentId: {
      title: 'ScheduleWise Appointment ID',
      steps: [
        'Required for Update Appointment and Delete Appointment.',
        'Runtime builds /appointments/{appointmentId} with this value.',
        'Map it from Get Schedules, Create Appointment, or an incoming webhook.',
        'Do not use patientId or staffId here.'
      ],
      example: '{{$json.appointmentId}}'
    },
    startDateTime: {
      title: 'ScheduleWise Start Date/Time',
      steps: [
        'Used when creating or rescheduling an appointment.',
        'Use an ISO timestamp with timezone.',
        'Example: 2026-07-20T09:00:00Z.',
        'Map it from a selected slot with {{$json.startDateTime}}.'
      ],
      example: '{{$json.startDateTime}}'
    },
    endDateTime: {
      title: 'ScheduleWise End Date/Time',
      steps: [
        'Used when creating or changing appointment duration.',
        'Use an ISO timestamp with timezone.',
        'Example: 2026-07-20T09:30:00Z.',
        'Keep it later than Start Date/Time.'
      ],
      example: '{{$json.endDateTime}}'
    },
    serviceType: {
      title: 'ScheduleWise Service Type',
      steps: [
        'Service type describes the appointment, such as consultation or follow-up.',
        'Create Appointment sends it in the request body.',
        'Use the exact value your ScheduleWise setup expects.',
        'Map it from a booking form with {{$json.serviceType}}.'
      ],
      example: 'consultation'
    },
    notes: {
      title: 'ScheduleWise Notes',
      steps: [
        'Notes are optional scheduling context sent on create or update.',
        'Map safe notes with {{$json.notes}} or type a concise message.',
        'Avoid secrets or unnecessary sensitive details.',
        'Blank notes are omitted or left unchanged on update.'
      ],
      example: 'Patient requested morning slot'
    },
    status: {
      title: 'ScheduleWise Status',
      steps: [
        'Used only by Update Appointment.',
        'Confirmed means booked, Pending means tentative, and Cancelled means the appointment should no longer proceed.',
        'Runtime sends status only when this field is set.',
        'Use Delete Appointment for removing a record instead of status-only cancellation when your process requires deletion.'
      ],
      example: 'confirmed'
    },
    limit: {
      title: 'ScheduleWise Limit',
      steps: [
        'Used by Get Schedules to cap returned appointments.',
        'Default is 50.',
        'Use smaller limits for fast webhook flows and larger limits for reports.',
        'Runtime sends it as the limit query parameter.'
      ],
      example: '50'
    },
    hardDelete: {
      title: 'ScheduleWise Hard Delete',
      steps: [
        'Used only by Delete Appointment.',
        'When true, runtime appends ?hardDelete=true.',
        'Leave false for normal deletion behavior.',
        'Use true only for admin-approved permanent removal.'
      ],
      example: 'false'
    },
    mockMode: {
      title: 'ScheduleWise Mock Mode',
      steps: [
        'When true, runtime returns synthetic ScheduleWise data and does not call the live API.',
        'Mock Mode does not require credentials.',
        'Use it for demos and mapping tests.',
        'Turn it off before production runs.'
      ],
      example: 'false'
    },
    timeoutSec: {
      title: 'ScheduleWise Timeout Seconds',
      steps: [
        'Maximum seconds to wait for the ScheduleWise API.',
        'Default is 30.',
        'Timeout failures return success=false with error code TIMEOUT.',
        'This field is seconds, not milliseconds.'
      ],
      example: '30'
    },
    retries: {
      title: 'ScheduleWise Retries',
      steps: [
        'Number of extra attempts for network errors and 5xx responses.',
        'Runtime uses exponential backoff.',
        'Use low values for workflows that must answer quickly.',
        'Non-5xx HTTP errors are not retried.'
      ],
      example: '1'
    },
    outputFormat: {
      title: 'ScheduleWise Output Format',
      steps: [
        'JSON is the actual current behavior.',
        'Raw is visible but runtime still parses the response as JSON.',
        'Non-JSON responses return PARSE_ERROR.',
        'Use {{$json.data}} for successful live responses.'
      ],
      example: 'json'
    }
  }
};

// Helper function to get guide for a specific node and field
export function getNodeGuide(nodeType: NodeType, fieldKey: FieldKey): NodeGuide | null {
  return NODE_GUIDES[nodeType]?.[fieldKey] || null;
}

// Helper function to check if a guide exists
export function hasNodeGuide(nodeType: NodeType, fieldKey: FieldKey): boolean {
  return !!getNodeGuide(nodeType, fieldKey);
}
