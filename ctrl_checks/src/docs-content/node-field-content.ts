/**
 * Per-node, per-operation, per-field help text content bible.
 *
 * Structure: NODE_FIELD_CONTENT[nodeSlug][operationValue][fieldKey] = helpText
 * Use '*' as operationValue for fields common to ALL operations of that node.
 *
 * This is checked FIRST by deriveHelpText() in generate-node-docs.cjs before
 * any generic rules, so every entry here takes full priority.
 */
export const NODE_FIELD_CONTENT: Record<string, Record<string, Record<string, string>>> = {

  // ─────────────────────────────────────────────────────────────
  // TRIGGERS
  // ─────────────────────────────────────────────────────────────

  manual_trigger: {
    default: {
      inputData: `What this field means: Input Data is the test or one-off information you want the workflow to start with.
Why it matters: The next node can read these values, so you can test mappings before connecting a real form, webhook, schedule, or app trigger.
When to fill it: Leave it empty when the workflow can start without sample data. Fill it when the next node expects fields such as a customer email, ticket ID, order number, or report date.
What to enter: Use a JSON object with clear field names, such as {"customerEmail":"maya@acme.com","ticketId":"SUP-1042","priority":"high"}.
Where the value comes from: For manual runs, you usually type this sample data yourself or paste a small example from a real workplace record.
How to use it later: In the next node, map a value with expressions such as {{$json.customerEmail}}, {{$json.ticketId}}, or {{$json.reportDate}}.
Accepted format: A valid JSON object such as {"reportDate":"2026-07-31"} or a JSON list such as [{"orderId":"ORD-1001"},{"orderId":"ORD-1002"}]. Use double quotes around field names and text values.
Real workplace example: A finance manager runs a month-end report with {"reportDate":"2026-07-31","department":"Sales","requestedBy":"nina@company.com"}.
If it is empty or wrong: Empty input is allowed, but later nodes that expect fields may show missing value errors. Invalid JSON can stop the run before the first action receives data.
Common mistake to avoid: Do not paste API keys, passwords, or account tokens here. Store secrets in Connections or credential settings for the service node that needs them.`,
    },
  },

  chat_trigger: {
    default: {
      message: `What this field means: Message is the text the chat visitor typed. The visual Chat Trigger panel does not expose this as a setup field; the chat page sends it when the workflow runs, and AI-generated workflows may also pass it as message, text, or input.
Why it matters: Downstream AI Agent, HTTP Request, routing, and logging nodes usually read this as the user question or command.
When to fill it: You normally do not fill it in the node panel. Provide it only in a test payload, API simulation, or generated workflow input.
What to enter: Use the exact chat text, such as I want to track order ORD-1048.
Where the value comes from: The CtrlChecks chat UI sends it from the visitor message box, or a manual/API test can provide it.
How to use it later: Map {{$json.message}} into an AI Agent user input, ticket note, search request, or Chat Send reply.
Accepted format: Plain text string after trimming; blank or whitespace-only HTTP messages are rejected as Invalid message.
Real workplace example: A customer asks What is the status of order ORD-1048? and the next AI Agent uses {{$json.message}} to look up the order.
If it is empty or wrong: The chat message endpoint returns Message is required and must be a non-empty string, or later nodes receive an empty message in manual tests.
Common mistake to avoid: Treating this as a saved prompt. Put reusable assistant instructions in the AI Agent or model node, not in Chat Trigger.`,
      channel: `What this field means: Channel is optional context for where the chat came from, such as a support chat, embedded page, or session. The current visual panel does not show this field, and the active chat API does not use it to filter messages before starting the workflow.
Why it matters: When present in a test or generated payload, the registry output can include it so later nodes know the chat context. In normal chat runs, the registry sets channel from sessionId first, then channel.
When to fill it: Leave it alone in normal visual workflows. Use it only when simulating chat input or building an AI-generated workflow payload that already carries a channel value.
What to enter: A short channel or context name such as support-chat, pricing-page, or {{$json.channel}}.
Where the value comes from: It can come from an embedding page, upstream API request, workflow simulation, or generated workflow input.
How to use it later: Map {{$json.channel}} in a Switch node to route support-chat differently from sales-chat, or log it with the user request.
Accepted format: Plain text string.
Real workplace example: A website sends channel support-chat so the workflow routes urgent support questions to the helpdesk queue.
If it is empty or wrong: Empty is allowed; the workflow still starts, and downstream channel-based routing may not match.
Common mistake to avoid: Expecting this field to limit who can start the chat in the current visual workflow. Use workflow branches or a future dedicated filter when sender/channel enforcement is required.`,
      allowedSenders: `What this field means: Allowed Senders is an optional list of sender names or IDs in the backend schema. The current CtrlChecks chat page does not pass a sender identity into this trigger and the visual panel does not enforce this allowlist.
Why it matters: It documents a schema-supported intent for generated workflows and future filtered chat contexts, but it is not an active access-control setting in the current panel.
When to fill it: Do not rely on it for normal visual workflows. Use it only in controlled tests or generated workflow payloads where sender IDs are already present and later nodes will check them.
What to enter: A JSON list such as ["agent_17","manager@example.com"] or map {{$json.allowedSenders}} from a prior setup payload.
Where the value comes from: A workplace directory, internal user list, chatbot embedding context, or upstream API that knows the sender identity.
How to use it later: A later If/Else, Switch, or JavaScript node can compare {{$json.senderId}} or a mapped user field against this list if your workflow supplies sender data.
Accepted format: JSON array of strings.
Real workplace example: An internal assistant prototype passes ["ops-lead@example.com","finance-lead@example.com"] and a later branch checks whether the current sender is allowed to create a finance ticket.
If it is empty or wrong: Empty is allowed and does not block chat messages; invalid JSON in generated config can fail validation or make custom sender checks unreliable.
Common mistake to avoid: Assuming this protects a public chat link today. Use workflow activation, sharing controls, and downstream checks until the panel exposes a real sender filter.`,
    },
  },

  facebook_trigger: {
    default: {
      connectionId: `What this field means: Connection points to the saved Facebook OAuth2 account that can see and manage the Facebook Page. The visual node usually uses the selected/default Facebook connection rather than asking you to type this ID.
Why it matters: CtrlChecks uses this connection when it registers or tests the Page webhook and when it needs a Page access token.
When to fill it: Leave it blank when the workflow should use your active Facebook connection. Use a specific connection only when your workspace has more than one Facebook account.
What to enter: Select the Facebook connection in the Connections UI, or use the saved connection ID in generated workflow config.
Where the value comes from: CtrlChecks Connections stores it after OAuth sign-in; do not copy a Meta access token into this field.
How to use it later: This setup value is not emitted as {{$json.connectionId}}; downstream Facebook reply nodes use {{$json.senderId}}, {{$json.pageId}}, or {{$json.commentId}} from the trigger output.
Accepted format: Saved connection reference such as facebook_oauth_123, not a raw OAuth token.
Real workplace example: A support workflow uses the Facebook connection owned by the social care team so it can receive Messenger events for the company Page.
If it is empty or wrong: Empty falls back to the active Facebook connection; a wrong ID can cause No active Facebook connection found or Selected connection is not a Facebook connection.
Common mistake to avoid: Pasting a Graph API access token here instead of connecting Facebook in Connections.`,
      eventTypes: `What this field means: Event Types decides which normalized Facebook events this trigger accepts.
Why it matters: Messenger messages, comments, mentions, postbacks, lead ads, and feed changes usually need different workflows.
When to fill it: Keep the default while testing; narrow it before production so unrelated Page activity does not start the workflow.
What to enter: Use comma-separated values such as message, comment, mention, postback, leadgen, feed. The runtime also accepts aliases such as messages, dm, comments, leads, and feed_event.
Where the value comes from: Choose the Meta webhook fields and business events your team wants to handle.
How to use it later: Route with {{$json.eventType}}; message covers message.text and message.media, while feed covers feed.post and feed.comment.
Accepted format: Comma-separated text or an array in generated config.
Real workplace example: message, postback for an AI Messenger assistant; comment, feed for public comment moderation; leadgen for lead ad routing.
If it is empty or wrong: Empty defaults to message, comment, mention, postback, leadgen, feed. Unsupported values cause matching events to be ignored with no workflow execution.
Common mistake to avoid: Choosing leadgen without subscribing the Meta app/Page to the leadgen webhook field and granting leads_retrieval.`,
      pageId: `What this field means: Facebook Page ID is the numeric ID of the Page this workflow should listen to.
Why it matters: One Meta app or OAuth account may manage several Pages, and this filter keeps the wrong Page from starting the workflow.
When to fill it: Fill it when your connection can access multiple Pages or when you want webhook registration to subscribe one exact Page.
What to enter: The Page ID, not the Page name, profile URL, username, or Business Manager ID.
Where the value comes from: Facebook OAuth test calls read /me/accounts, and Meta Business Suite/Page settings can show the Page ID.
How to use it later: The trigger output includes {{$json.pageId}} so reply nodes can send from or act on the same Page.
Accepted format: Numeric text such as 123456789012345.
Real workplace example: A retail brand has separate India and US Pages, so the India support workflow filters to the India Page ID only.
If it is empty or wrong: Empty accepts events for any connected/subscribed Page. A wrong ID causes valid events to be ignored as a different Page, or webhook registration may not find a Page access token.
Common mistake to avoid: Pasting a post ID, comment ID, or page URL instead of the Page ID.`,
      allowedSenderIds: `What this field means: Allowed Sender IDs limits the trigger to specific Facebook senders.
Why it matters: It can keep a testing or VIP workflow from reacting to every Page visitor or commenter.
When to fill it: Use it for internal testing, approved partner users, or a controlled rollout. Leave it blank for normal public Page automations.
What to enter: Comma-separated sender IDs or PSIDs such as 1234567890, 9876543210.
Where the value comes from: Use senderId/chatId from a previous Facebook Trigger test run, Messenger PSID records, or an internal allowlist.
How to use it later: The accepted event still outputs {{$json.senderId}} and {{$json.chatId}} for replies or audits.
Accepted format: Comma-separated text or an array in generated config.
Real workplace example: Before launching a Messenger assistant, the team allows only two employee PSIDs so they can test without responding to customers.
If it is empty or wrong: Empty allows every matching sender; a wrong ID silently ignores that person's events.
Common mistake to avoid: Using a person's visible Facebook profile URL instead of the Page-scoped sender ID from a webhook event.`,
      verifyToken: `What this field means: Verify Token is the shared text Meta sends during the webhook challenge to prove you configured the callback intentionally.
Why it matters: Meta will not activate the webhook callback unless CtrlChecks returns the challenge for the exact matching token.
When to fill it: Fill it before verifying the callback URL in Meta for Developers.
What to enter: A random phrase or generated secret that is unique to this workflow, such as fb-webhook-verify-2026-support.
Where the value comes from: Create it yourself in a password manager or admin setup note, then enter the exact same value in Meta Webhooks.
How to use it later: This token is only for webhook setup; it is never emitted as {{$json.verifyToken}} for downstream nodes.
Accepted format: Plain text shared token.
Real workplace example: The social operations admin sets fb-support-prod-verify-rotate-me while adding the CtrlChecks callback URL to the Meta app.
If it is empty or wrong: Callback verification returns Invalid verify token, and Meta will not save the webhook URL.
Common mistake to avoid: Confusing this with a Facebook OAuth access token, Page token, app secret, or account password.`,
      validateSignature: `What this field means: Validate Meta Signature checks that Meta signed the webhook request with your app secret.
Why it matters: A public webhook URL should reject requests that did not come through the expected Meta app.
When to fill it: Keep it enabled for production. Disable only for a controlled local test where you cannot generate Meta signatures.
What to enter: true/enabled for real workflows; false/disabled only for temporary debugging.
Where the value comes from: This is a security choice made by the workflow owner or admin. The app secret itself comes from worker environment variables META_APP_SECRET or FACEBOOK_APP_SECRET, not from a workflow field.
How to use it later: This setting protects whether a workflow starts; it is not output as {{$json.validateSignature}}.
Accepted format: Boolean checkbox.
Real workplace example: A live Messenger support workflow keeps validation enabled so only signed Meta webhook deliveries can create replies or tickets.
If it is empty or wrong: Default true requires the worker app secret; if the secret is missing or mismatched, requests fail with Invalid Facebook webhook signature.
Common mistake to avoid: Turning this off permanently instead of configuring META_APP_SECRET/FACEBOOK_APP_SECRET correctly.`,
    },
  },

  github_trigger: {
    default: {
      connectionId: `What this field means: GitHub Connection points to the saved GitHub account or token that can create and remove repository webhooks. The visual panel usually uses your active GitHub connection rather than asking you to type this ID.
Why it matters: CtrlChecks needs this connection when it calls the GitHub API to register the repository webhook and later remove it.
When to fill it: Leave it blank in normal visual workflows. Use a specific saved connection only when your workspace has more than one GitHub account.
What to enter: Select or reference the saved GitHub connection; do not paste a Personal Access Token here as workflow data.
Where the value comes from: Connections stores it after GitHub OAuth or GitHub Personal Access Token setup.
How to use it later: This setup value is not emitted as {{$json.connectionId}}; downstream nodes use fields such as {{$json.repository}}, {{$json.issueNumber}}, {{$json.prNumber}}, and {{$json.commentBody}}.
Accepted format: Saved connection reference such as github_pat_123 or github_oauth_123.
Real workplace example: A platform team uses the GitHub connection owned by the release manager so CtrlChecks can create a webhook on octo-org/api-service.
If it is empty or wrong: Empty falls back to the active GitHub credential lookup; a wrong or inactive connection can cause no active GitHub connection or GitHub API permission errors during registration.
Common mistake to avoid: Pasting the raw ghp_ token into a normal workflow field instead of saving it in Connections.`,
      owner: `What this field means: Owner/Organization is the account name before the repository name in a GitHub URL.
Why it matters: GitHub webhooks are created on one exact repository, so CtrlChecks needs the owner and repository name to call /repos/{owner}/{repo}/hooks.
When to fill it: Always fill it before saving or activating a GitHub Trigger.
What to enter: Enter only the owner part, such as octocat or acme-platform, not the full URL.
Where the value comes from: Open the repository in GitHub and copy the first path segment after github.com.
How to use it later: The trigger output includes {{$json.repository}} as owner/repo, which you can use in messages, logs, or GitHub action nodes.
Accepted format: GitHub login or organization name using normal GitHub URL characters, without https://github.com/.
Real workplace example: For https://github.com/acme-platform/api-service, enter acme-platform.
If it is empty or wrong: Validation fails with A GitHub repository owner is required, registration fails, or events from the intended repository never arrive.
Common mistake to avoid: Entering the repository name, branch name, display organization title, or full repository URL in this field.`,
      repo: `What this field means: Repository is the repo name after the owner in a GitHub URL.
Why it matters: CtrlChecks registers the webhook on this exact repository and only receives events from that repository.
When to fill it: Always fill it with Owner/Organization before activating the workflow.
What to enter: Enter only the repository name, such as api-service or Hello-World.
Where the value comes from: Open the repository in GitHub and copy the second path segment after github.com/{owner}/.
How to use it later: Use {{$json.repository}} to include the full owner/repo in alerts, tickets, dashboards, or GitHub action steps.
Accepted format: Repository slug text without the owner, branch, issue number, or URL.
Real workplace example: For https://github.com/acme-platform/api-service, enter api-service.
If it is empty or wrong: Validation fails with A GitHub repository name is required, auto-registration records Repository owner and name are required, or GitHub API returns a 404/403 permission error.
Common mistake to avoid: Pasting acme-platform/api-service into Repository after already entering acme-platform as Owner.`,
      eventTypes: `What this field means: Event Types tells CtrlChecks which GitHub webhook events to subscribe to and accept.
Why it matters: Pushes, issues, pull requests, releases, and comments usually need different workflow paths.
When to fill it: Keep the default while testing; narrow it before production if the workflow should react only to issues, pull requests, releases, comments, or pushes.
What to enter: Use GitHub event names such as push, issues, pull_request, release, issue_comment, star, fork, or pull_request_review. You may also use a specific normalized type such as issues.opened to filter an action after delivery.
Where the value comes from: Choose from GitHub's repository webhook event list and the business event your team wants to automate.
How to use it later: Use {{$json.eventType}} to branch; raw event families like issues may produce detailed values such as issues.opened or issues.closed.
Accepted format: Comma-separated text or an array in generated config.
Real workplace example: issues, pull_request for engineering triage, push for CI follow-up, release for customer release announcements.
If it is empty or wrong: Empty defaults to push, issues, pull_request, release, issue_comment; unsupported names may register with GitHub but never match the events you expect.
Common mistake to avoid: Typing friendly labels like pull requests or comments instead of GitHub event names such as pull_request and issue_comment.`,
      webhookSecret: `What this field means: Webhook Secret Override is an optional secret text used to sign GitHub webhook deliveries.
Why it matters: GitHub sends X-Hub-Signature-256, and CtrlChecks accepts the webhook only when the HMAC-SHA256 signature matches the secret stored for this node.
When to fill it: Leave it blank for normal workflows because CtrlChecks generates and stores a secret automatically during registration. Fill it only for a controlled migration or manually managed webhook where your team must reuse a known secret.
What to enter: A long random secret generated by your admin or password manager, not a GitHub Personal Access Token.
Where the value comes from: Usually CtrlChecks creates it; if you override it, use the same value in the GitHub repository webhook settings.
How to use it later: It is setup-only and is never emitted as {{$json.webhookSecret}} for downstream nodes.
Accepted format: Plain secret text; the visual field uses a supported text control even though the value should be treated as secret setup material.
Real workplace example: A DevOps admin migrates an existing repository webhook and temporarily reuses the approved signing secret while switching the URL to CtrlChecks.
If it is empty or wrong: Empty uses the generated stored secret; a wrong manual value causes Invalid GitHub webhook signature and no workflow execution.
Common mistake to avoid: Confusing this with the GitHub PAT/OAuth token used to create the webhook.`,
      query: `What this field means: Keyword Filter lets only GitHub events whose normalized text contains a word or phrase start the workflow.
Why it matters: Busy repositories can produce many events; this filter keeps a workflow focused on urgent issues, release names, commit messages, pull request titles, or comment bodies.
When to fill it: Use it when the workflow should react only to a phrase such as urgent, sev1, billing, security, or release-candidate. Leave it blank to accept every configured event type.
What to enter: A simple keyword or short phrase, not GitHub search syntax.
Where the value comes from: Pick the label, customer name, module name, severity term, or release keyword your team uses in commits, issue titles, PR titles, release names, or comments.
How to use it later: The accepted event output still includes {{$json.text}} and event-specific fields such as {{$json.issueTitle}}, {{$json.prTitle}}, or {{$json.commentBody}} for downstream routing.
Accepted format: Plain text case-insensitive contains match.
Real workplace example: security starts only security-related issue and pull request workflows.
If it is empty or wrong: Empty accepts all configured event types; a too-specific or misspelled filter returns Ignored GitHub event not matching this trigger.
Common mistake to avoid: Expecting repo:owner/name label:bug syntax here; this is not GitHub search, only a simple text contains filter.`,
    },
  },

  gitlab_trigger: {
    default: {
      connectionId: `What this field means: GitLab Connection points to the saved GitLab Personal Access Token or GitLab OAuth account that can create project webhooks.
Why it matters: CtrlChecks needs this connection when it calls the GitLab API to register or replace the project webhook and validate the account with /api/v4/user.
When to fill it: Leave it blank in normal visual workflows. Use a specific saved connection only when your workspace has more than one GitLab account or instance.
What to enter: Select or reference the saved GitLab connection. Do not paste a PAT, OAuth token, password, or pipeline trigger token as workflow input data.
Where the value comes from: Connections stores it after GitLab OAuth or GitLab Personal Access Token setup with the api scope.
How to use it later: This setup value is not emitted as {{$json.connectionId}}; downstream nodes use {{$json.projectId}}, {{$json.issueTitle}}, {{$json.mrTitle}}, and {{$json.noteBody}}.
Accepted format: Saved connection reference such as gitlab_pat_123 or gitlab_oauth_123.
Real workplace example: A platform team uses the GitLab connection owned by the release manager so CtrlChecks can register a webhook on acme-platform/api-service.
If it is empty or wrong: Empty falls back to active credential lookup; a wrong connection can cause No active GitLab connection found or GitLab API permission errors.
Common mistake to avoid: Pasting the raw glpat token into the trigger instead of saving it in Connections.`,
      baseUrl: `What this field means: GitLab URL is the base address of the GitLab instance that owns the project.
Why it matters: CtrlChecks builds API requests under this URL, including /api/v4/projects/:id/hooks, and stores the same base URL with webhook state.
When to fill it: Leave the default for GitLab.com. Change it only for a self-managed GitLab instance or dedicated GitLab domain.
What to enter: Enter the root URL, such as https://gitlab.com or https://gitlab.company.com, without /api/v4, project paths, issues, or merge request URLs.
Where the value comes from: Use the browser origin you use to open the GitLab project or the official self-managed GitLab domain from your administrator.
How to use it later: This setup value is not emitted separately; use {{$json.projectId}} and {{$json.projectName}} downstream to identify the project.
Accepted format: HTTPS URL root. The runtime trims trailing slashes and defaults to https://gitlab.com when empty.
Real workplace example: A self-managed GitLab project uses https://gitlab.acme.internal so registration calls https://gitlab.acme.internal/api/v4/projects/:id/hooks.
If it is empty or wrong: Empty uses GitLab.com. A wrong host can produce GitLab API errors or register the webhook on the wrong instance.
Common mistake to avoid: Pasting the full project URL or API URL instead of the GitLab instance root.`,
      projectId: `What this field means: Project ID tells CtrlChecks which GitLab project should own the webhook.
Why it matters: GitLab project webhooks are created per project, so the trigger cannot register or filter deliveries without this exact project identifier.
When to fill it: Always fill it before saving or activating a GitLab Trigger.
What to enter: Use the numeric project ID from GitLab project settings, or a URL-encoded path such as acme-platform%2Fapi-service.
Where the value comes from: Open the project in GitLab, check Settings -> General for the Project ID, or URL-encode the group/project path from the project URL.
How to use it later: The trigger output includes {{$json.projectId}} and usually {{$json.projectName}} so downstream messages, logs, or GitLab action nodes can refer to the same project.
Accepted format: Numeric text such as 12345, or URL-encoded namespace path such as acme-platform%2Fapi-service.
Real workplace example: For https://gitlab.com/acme-platform/api-service, the team enters 456789 or acme-platform%2Fapi-service.
If it is empty or wrong: Validation returns A GitLab project ID (or URL-encoded path) is required, or auto-registration reports A GitLab Project ID is required.
Common mistake to avoid: Entering group/project with an unencoded slash when the GitLab API expects group%2Fproject.`,
      eventTypes: `What this field means: Event Types tells CtrlChecks which normalized GitLab events to subscribe to and accept.
Why it matters: Pushes, tag pushes, issues, merge requests, comments, pipelines, jobs, and releases usually need different workflow paths.
When to fill it: Keep the default while testing. Narrow it before production if the workflow should react only to issues, merge requests, comments, pipelines, releases, or pushes.
What to enter: Use GitLab object_kind values such as push, tag_push, issue, merge_request, note, pipeline, job, or release. Separate multiple values with commas.
Where the value comes from: Choose from GitLab project webhook event families and the business event your team wants to automate.
How to use it later: Use {{$json.eventType}} to branch. Push events expose ref and commits, issue events expose issueIid and issueTitle, merge_request events expose mrIid and mrTitle, and note events expose noteBody.
Accepted format: Comma-separated text or an array in generated config. Empty defaults to push, issue, merge_request, note.
Real workplace example: issue, merge_request starts engineering triage, while push, pipeline starts a CI follow-up workflow.
If it is empty or wrong: Empty defaults to push, issue, merge_request, note. Unsupported values are ignored with Ignored GitLab event not matching this trigger.
Common mistake to avoid: Typing friendly labels like comments or merge requests instead of GitLab object_kind values such as note and merge_request.`,
      secretToken: `What this field means: Webhook Secret Override is optional setup-only text for the X-Gitlab-Token shared secret.
Why it matters: GitLab does not sign these webhook requests with HMAC. It echoes this plain shared secret in X-Gitlab-Token, and CtrlChecks accepts the request only when the header matches.
When to fill it: Leave it blank for normal workflows because CtrlChecks generates and stores a random secret during registration. Fill it only for a controlled migration or manually managed webhook.
What to enter: A long random shared secret from your admin or password manager, not a GitLab PAT, OAuth token, account password, or CI/CD pipeline trigger token.
Where the value comes from: Usually CtrlChecks creates it. If you override it, enter the same value in the Secret token field of the GitLab project webhook.
How to use it later: It is setup-only and is never emitted as {{$json.secretToken}} for downstream nodes.
Accepted format: Plain secret text. The visual field uses a supported text control even though the value should be treated as secret setup material.
Real workplace example: A DevOps admin migrates an existing project webhook and reuses the approved X-Gitlab-Token shared secret while switching the URL to CtrlChecks.
If it is empty or wrong: Empty uses the generated stored secret; a wrong value returns Invalid or missing X-Gitlab-Token secret and no workflow execution.
Common mistake to avoid: Calling this an HMAC signing secret. GitLab sends a shared header token, not X-Hub-Signature-256.`,
      query: `What this field means: Keyword Filter lets only GitLab events whose normalized text contains a word or phrase start the workflow.
Why it matters: Busy projects can produce many webhook deliveries; this filter keeps a workflow focused on urgent issues, security merge requests, release notes, pipeline statuses, or comment bodies.
When to fill it: Use it when the workflow should react only to a phrase such as urgent, sev1, billing, security, or release-candidate. Leave it blank to accept every configured event type.
What to enter: A simple keyword or short phrase, not GitLab search syntax.
Where the value comes from: Pick the label, customer name, module name, severity term, branch term, or release keyword your team uses in commit messages, issue titles, merge request titles, comments, pipeline text, or release names.
How to use it later: The accepted event output still includes {{$json.text}} plus fields such as {{$json.issueTitle}}, {{$json.mrTitle}}, {{$json.noteBody}}, {{$json.ref}}, or {{$json.commits}}.
Accepted format: Plain text case-insensitive contains match.
Real workplace example: security starts only security-related issue, merge request, comment, and push workflows.
If it is empty or wrong: Empty accepts all configured event types; a too-specific or misspelled filter returns Ignored GitLab event not matching this trigger.
Common mistake to avoid: Expecting label:bug or GitLab advanced search syntax here; this is only a simple text contains filter.`,
    },
  },

  schedule: {
    default: {
      cron: `What this field means: Cron is the compact schedule rule that tells CtrlChecks exactly when to start the workflow.
Why it matters: The scheduler uses this value after the workflow is saved. If it is wrong, the workflow may run at the wrong time or not run at all.
When to fill it: Use the daily time picker for simple once-a-day schedules. Edit Cron directly when you need weekly, monthly, hourly, or business-hour patterns.
What to enter: Use five space-separated parts: minute, hour, day of month, month, weekday.
Where the value comes from: CtrlChecks can create it from the time picker. Advanced users can type it manually after confirming the business schedule.
How to use it later: Later nodes can read the schedule metadata with expressions such as {{$json.cronExpression}}, {{$json.scheduledTime}}, or {{$json.timezone}}.
Accepted format: Examples include 0 9 * * * for every day at 9:00, 0 9 * * 1-5 for weekdays at 9:00, 30 18 * * 5 for Fridays at 18:30, and 0 */4 * * * for every 4 hours.
Real workplace example: An operations manager schedules a daily stock report with 0 8 * * * so it runs at 8:00 every morning in the selected timezone.
If it is empty or wrong: The scheduler cannot activate, or it may run at an unexpected time. Validation errors usually mention the cron part that is invalid.
Common mistake to avoid: Do not type regular words such as daily at 9. Use the time picker or a valid cron expression.`,
      time: `What this field means: Time is the local clock time when a daily schedule should run.
Why it matters: It is the easiest way to run a workflow once every day without learning cron.
When to fill it: Use this for daily reminders, reports, checks, exports, or cleanup jobs.
What to enter: Use 24-hour HH:MM time, such as 09:00 for 9 AM or 14:30 for 2:30 PM.
Where the value comes from: Choose the time your team expects the work to happen in the selected business timezone.
How to use it later: The schedule output can be used by the next node with {{$json.scheduledTime}} or {{$json.timezone}}.
Accepted format: Two-digit hour, colon, two-digit minute. Hours are 00 through 23 and minutes are 00 through 59.
Real workplace example: A sales manager sets 08:30 in America/New_York so the pipeline summary is ready every weekday morning.
If it is empty or wrong: CtrlChecks cannot create the daily schedule, and the panel may show that the time must be in HH:MM format.
Common mistake to avoid: Do not enter 9 AM, 9.00, or 25:00. Use 09:00.`,
      timezone: `What this field means: Timezone tells CtrlChecks which local clock to use for the schedule.
Why it matters: 09:00 in New York is not the same moment as 09:00 in India, London, or Sydney.
When to fill it: Always choose the timezone where the business process is supposed to happen.
What to enter: Pick a dropdown option. Use UTC for system-wide technical jobs, or a city/region option for local business hours.
Where the value comes from: Use the office, customer region, warehouse, support team, or reporting team that owns the scheduled work.
How to use it later: Later nodes can include the timezone in messages or logs with {{$json.timezone}}.
Accepted format: CtrlChecks stores IANA timezone values such as Asia/Kolkata, UTC, America/New_York, Europe/London, or Australia/Sydney.
Options and when to choose them: Indian Standard Time (IST) - choose for India-wide schedules. UTC (Coordinated Universal Time) - choose for global server jobs and neutral audit timestamps. Eastern Time (US) - choose for US East Coast teams. Central Time (US) - choose for US Central teams. Mountain Time (US) - choose for US Mountain teams. Pacific Time (US) - choose for US West Coast teams. London (GMT/BST) - choose for UK schedules. Paris (CET/CEST) - choose for France-based schedules. Berlin (CET/CEST) - choose for Germany-based schedules. Tokyo (JST) - choose for Japan schedules. Shanghai (CST) - choose for mainland China schedules. Singapore (SGT) - choose for Singapore and many Southeast Asia operations. Sydney (AEDT/AEST) - choose for New South Wales or Sydney-led schedules. Melbourne (AEDT/AEST) - choose for Victoria or Melbourne-led schedules. Dubai (GST) - choose for UAE schedules. Mumbai (IST), New Delhi (IST), and Bangalore (IST) are city-friendly India choices that all use Asia/Kolkata.
Real workplace example: A finance workflow for the India office runs at 18:00 Asia/Kolkata so invoices close after the local workday.
If it is empty or wrong: The workflow may run hours earlier or later than the team expects.
Common mistake to avoid: Do not choose your personal timezone when the schedule belongs to a customer region, warehouse, or office in another timezone.`,
      hour: `What this field means: Hour is the hour of the day for a simple daily schedule.
Why it matters: It helps CtrlChecks build the cron expression without making you type cron manually.
When to fill it: Use it when you want the workflow to run once per day.
What to enter: Choose a number from 00 to 23.
Where the value comes from: Use the hour your team expects the job to start in the selected timezone.
How to use it later: CtrlChecks converts the hour and minute into {{$json.cronExpression}} when the schedule fires.
Accepted format: 00 through 23, where 00 is midnight, 09 is 9 AM, and 14 is 2 PM.
Real workplace example: Set Hour to 18 for an end-of-day sales digest.
If it is empty or wrong: The time picker cannot create the expected daily schedule.
Common mistake to avoid: Do not use 12-hour values with AM or PM. Use 14 for 2 PM.`,
      minute: `What this field means: Minute is the minute within the selected hour for a simple daily schedule.
Why it matters: It lets you run at precise times such as 08:30, 09:15, or 18:45.
When to fill it: Use it together with Hour when creating a daily schedule from the time picker.
What to enter: Choose a number from 00 to 59.
Where the value comes from: Use the exact minute your team expects the workflow to start.
How to use it later: CtrlChecks combines minute and hour into {{$json.cronExpression}} when the schedule fires.
Accepted format: 00 through 59.
Real workplace example: Set Hour to 08 and Minute to 30 so a daily inventory report runs at 08:30.
If it is empty or wrong: The time picker cannot create the expected daily schedule.
Common mistake to avoid: Do not use 60 or text such as half past. Use 30.`,
      cronExpression: `What this field is: A schedule that tells CtrlChecks when to run this workflow automatically.
How to fill it: Use 5 numbers separated by spaces: minute  hour  day  month  weekday.
Examples:
  0 9 * * 1-5  →  every weekday (Mon–Fri) at 9:00 AM
  0 */4 * * *  →  every 4 hours
  30 18 * * 5  →  every Friday at 6:30 PM
  0 0 1 * *    →  first day of every month at midnight
Tip: Visit crontab.guru in your browser — describe when you want it to run and it builds the expression for you.`,
      interval: `What this field is: How often this workflow repeats automatically.
How to fill it: Type a number. Then set the "Unit" field below to seconds, minutes, or hours.
Example: 15 (with unit = minutes) runs every 15 minutes.`,
      unit: `What this field is: The time unit for how often the workflow runs.
Options: seconds, minutes, hours.
Example: minutes — so if interval is 15, it runs every 15 minutes.`,
    },
  },

  interval: {
    default: {
      interval: `What this field is: How often this workflow repeats.
How to fill it: Type a number. Combined with the "Unit" field, this sets the full frequency.
Example: 15 (then set unit to "minutes") runs every 15 minutes.`,
      unit: `What this field is: The time unit for the interval.
Options: seconds, minutes, hours.
Example: minutes`,
    },
  },

  webhook: {
    default: {
      path: `What this field is: The web address path where external services send data to start this workflow.
Why it matters: A clear path helps teammates recognize which outside event starts this workflow.
When to fill it: Set it before saving and enabling the workflow webhook.
What to enter: Type a short path starting with /, such as /new-order, /lead-created, or /support-ticket.
Where the value comes from: You choose it. After saving, CtrlChecks shows the full URL to paste into the outside app.
How to use it later: Later nodes usually use request data like {{$json.body.email}} or {{$json.orderId}}, not the path itself.
Accepted format: Start with /, avoid spaces, and keep it stable after the sending app has the URL.
Real workplace example: /new-lead for a website demo form that should create a CRM lead and alert Sales.
If it is empty or wrong: The sending app may call an old or invalid URL and the workflow will not start.
Common mistake: Changing the path in CtrlChecks without updating the saved webhook URL in the outside app.`,
      method: `What this field is: The type of web request this webhook accepts.
Why it matters: The sending app must use the same method that the webhook expects.
When to fill it: Use this legacy field only if an older workflow still shows Method instead of HTTP Method.
What to enter: Choose POST for most event payloads, GET for simple pings, PUT for replacement events, PATCH for partial updates, or DELETE for removal events.
Where the value comes from: The sending app's webhook setup screen or API documentation.
How to use it later: Check {{$json.method}} when one workflow accepts more than one request style.
Accepted format: GET, POST, PUT, PATCH, or DELETE.
Real workplace example: POST for a checkout app sending an order.created JSON payload.
If it is empty or wrong: The caller may receive an error or send data in a place the workflow does not expect.
Common mistake: Choosing GET just because the webhook is a URL. Most business webhooks that send data use POST.`,
      httpMethod: `What this field is: The type of web request this webhook accepts.
Why it matters: The sending app must use the same method that the webhook expects.
When to fill it: Set it while following the sending app's webhook instructions.
What to enter: Choose POST for most event payloads, GET for simple pings, PUT for replacement events, PATCH for partial updates, or DELETE for removal events.
Where the value comes from: The sending app's webhook setup screen or API documentation.
How to use it later: Check {{$json.method}} when one workflow accepts more than one request style.
Accepted format: GET, POST, PUT, PATCH, or DELETE.
Real workplace example: POST for a checkout app sending an order.created JSON payload.
If it is empty or wrong: The caller may receive an error or send data in a place the workflow does not expect.
Common mistake: Choosing GET just because the webhook is a URL. Most business webhooks that send data use POST.`,
      responseMode: `What this field is: The reply behavior for the app that called this webhook.
Why it matters: Some apps need a fast success response, while others expect a custom response body or status code.
When to fill it: Set it before testing the sender so the response behavior is predictable.
What to enter: responseNode means a Respond to Webhook node controls the reply, onReceived sends an immediate acknowledgement, and lastNode returns the final node output.
Where the value comes from: Choose it based on what the sending app expects.
How to use it later: With responseNode, map {{$json.body.orderId}} into the Respond to Webhook node response.
Accepted format: responseNode, onReceived, or lastNode.
Real workplace example: responseNode for an internal form that should return a ticket ID after the helpdesk node runs.
If it is empty or wrong: The sender may time out or receive a generic response.
Common mistake: Choosing lastNode when the final node sends a message instead of returning clean response data.`,
      verifySignature: `What this field is: A security check for signed webhook requests.
Why it matters: It helps reject calls that did not come from the trusted sending app.
When to fill it: Turn it on for production, payment, customer, or public webhook workflows; leave it off for quick tests or senders that cannot sign requests.
What to enter: true/on to require a valid signature, false/off to accept unsigned requests.
Where the value comes from: The sending app's webhook security settings.
How to use it later: When enabled, only verified request data reaches later nodes like {{$json.body.orderId}}.
Accepted format: true or false.
Real workplace example: Turn it on for a paid-order webhook before creating fulfillment tasks.
If it is empty or wrong: Requests may be rejected, or unwanted traffic may start the workflow.
Common mistake: Enabling it without configuring the same signing secret in the sender.`,
      secretToken: `What this field is: The shared signing secret for verifying webhook requests.
Why it matters: CtrlChecks uses it to confirm the request came from the expected sender.
When to fill it: Only when Verify Signature is on and the sending app requires a specific shared secret.
What to enter: The same webhook signing secret saved in the sending app. Do not enter API keys, login passwords, OAuth tokens, or customer data.
Where the value comes from: The sender's webhook security screen, or the generated CtrlChecks webhook secret if the sender lets you paste your own value.
How to use it later: Do not map this value into later nodes; use verified payload fields like {{$json.body.email}} instead.
Accepted format: A private secret text value.
Real workplace example: A shared secret used by an internal order system to prevent fake warehouse tasks.
If it is empty or wrong: Signed requests fail with an invalid signature error.
Common mistake: Treating this as ordinary workflow data instead of security setup.`,
    },
  },

  workflow_trigger: {
    default: {
      source_workflow_id: `What this field is: The ID of the parent workflow that is allowed to start this child workflow.
Why it matters: It prevents the child workflow from being treated like a public trigger and helps teammates understand which workflow owns the call.
When to fill it: Fill it when this workflow should be called by an Execute Workflow node in another workflow.
What to enter: Copy the parent workflow ID from the workflow URL, details panel, or workflow list. Use the exact ID, not the display name.
Where the value comes from: The workflow that will contain the Execute Workflow node.
How to use it later: The parent sends the payload. Later nodes in this child workflow can map fields such as {{$json.customerEmail}}, {{$json.ticketId}}, or {{$json.inputData.customerEmail}}, depending on what the parent passed.
Accepted format: A workflow ID such as workflow_123 or the UUID format used by your workspace.
Real workplace example: Let the Order Intake workflow call a reusable Send Finance Alert workflow after payment succeeds.
If it is empty or wrong: The wrong parent may be blocked, or teammates may connect the Execute Workflow node to the wrong child workflow.
Common mistake: Pasting the child workflow ID here. This field should name the source workflow that is allowed to call the child.`,
    },
  },

  form: {
    default: {
      fields: `What this field is: The list of questions and input fields shown on the form.
Why it matters: These fields define the submitted data later nodes can use.
When to fill it: Add at least one field before sharing the public form URL.
What to enter: Add one question per answer you need. Choose text, email, number, tel, url, date, textarea, select, checkbox, radio, or file based on the answer format.
Where the value comes from: Design fields from the workplace process, such as lead capture, support intake, event registration, or employee requests.
How to use it later: Map answers by internal name, such as {{$json.email}}, {{$json.data.email}}, {{$json.message}}, or {{$json.files}}.
Accepted format: Use the visual Add Field editor, or a JSON array with name, label, type, required, placeholder, and options.
Real workplace example: A support form collects customer_email, issue_category, order_number, and message before creating a helpdesk ticket.
If it is empty or wrong: The form may show no useful questions or later nodes may look for fields that do not exist.
Common mistake: Renaming an internal field after downstream nodes already map it.`,
      formTitle: `What this field is: The main heading shown at the top of the public form.
Why it matters: It tells submitters they opened the right form.
When to fill it: Set it before sharing the form URL.
What to enter: A short name such as Support Request, Request a Demo, Vendor Onboarding, or Employee Equipment Request.
Where the value comes from: You write it from the purpose of the form.
How to use it later: Later nodes usually use answers like {{$json.customer_email}}, while form metadata can identify which form was submitted.
Accepted format: Plain text.
Real workplace example: Support Request for a form that creates a ticket and emails the customer.
If it is empty or wrong: People may submit the wrong request or abandon the form.
Common mistake: Using internal automation wording instead of submitter-friendly wording.`,
      title: `What this field is: The main heading shown at the top of the public form.
Why it matters: It tells submitters they opened the right form.
When to fill it: Set it before sharing the form URL.
What to enter: A short name such as Support Request, Request a Demo, Vendor Onboarding, or Employee Equipment Request.
Where the value comes from: You write it from the purpose of the form.
How to use it later: Later nodes usually use answers like {{$json.customer_email}}, while form metadata can identify which form was submitted.
Accepted format: Plain text.
Real workplace example: Support Request for a form that creates a ticket and emails the customer.
If it is empty or wrong: People may submit the wrong request or abandon the form.
Common mistake: Using internal automation wording instead of submitter-friendly wording.`,
      formDescription: `What this field is: Optional helper text shown under the form title.
Why it matters: It tells submitters what to prepare and what happens next.
When to fill it: Use it when the form needs context, timing, or instructions.
What to enter: One to three short sentences written for the submitter.
Where the value comes from: Your team process or service promise.
How to use it later: This is display text only; later nodes use submitted answers like {{$json.data.message}}.
Accepted format: Plain text.
Real workplace example: Tell us what happened and attach a screenshot. Support will reply within one business day.
If it is empty or wrong: Submitters may leave out important details.
Common mistake: Putting private internal notes here, because submitters can see it.`,
      submitButtonText: `What this field is: The button text submitters click when they finish.
Why it matters: Clear action wording sets expectations.
When to fill it: Change it when Submit is too generic.
What to enter: Send Request, Submit Ticket, Register, Request Demo, or Send Feedback.
Where the value comes from: Match the submitter's goal.
How to use it later: This is display text only; later nodes use answers like {{$json.email}}.
Accepted format: Short plain text.
Real workplace example: Submit Ticket for a support form that creates a helpdesk ticket.
If it is empty or wrong: Users may not know what clicking the button will do.
Common mistake: Using vague wording like OK for a business request.`,
      successMessage: `What this field is: The confirmation shown after a successful submission.
Why it matters: It prevents duplicate submissions and explains the next step.
When to fill it: Set it before sharing customer-facing or employee-facing forms.
What to enter: Confirm receipt and mention the expected follow-up.
Where the value comes from: Your team response process.
How to use it later: Later nodes can send separate follow-ups using {{$json.customer_email}}.
Accepted format: Plain text.
Real workplace example: Thanks, we received your request. A specialist will email you within one business day.
If it is empty or wrong: Submitters may submit again or contact the team separately.
Common mistake: Promising a response time your team cannot meet.`,
      redirectUrl: `What this field is: Optional page users see after submitting.
Why it matters: It is useful for thank-you pages, onboarding pages, payment pages, or next-step instructions.
When to fill it: Use it only when submitters should leave the form page.
What to enter: A full HTTPS URL, or leave blank to show the success message.
Where the value comes from: A public page controlled by your company or team.
How to use it later: This changes the user experience only; later nodes still use answers like {{$json.data.email}}.
Accepted format: A full URL beginning with https://.
Real workplace example: https://example.com/event/next-steps after an event registration.
If it is empty or wrong: Users stay on the form page or land on a broken page.
Common mistake: Using an internal admin URL that submitters cannot access.`,
      allowMultipleSubmissions: `What this field is: Whether the same person can submit the form more than once.
Why it matters: Some processes are repeatable, while others should be one-time.
When to fill it: Review it before sharing the form URL.
What to enter: true for support requests, feedback, expenses, or maintenance requests; false for one-time applications, votes, RSVPs, or eligibility checks.
Where the value comes from: Your business rule for this form.
How to use it later: Later nodes can still check duplicates with {{$json.employee_id}} or {{$json.customer_email}}.
Accepted format: true or false.
Real workplace example: true for an IT help form because one employee may report multiple issues.
If it is empty or wrong: Valid repeat requests may be blocked or duplicates may be created.
Common mistake: Turning it off for customer support forms.`,
      requireAuthentication: `What this field is: Whether submitters must sign in before sending the form.
Why it matters: It ties submissions to known users for protected internal processes.
When to fill it: Turn it on for internal or sensitive forms; leave it off for public lead, contact, survey, and customer support forms.
What to enter: true to require sign-in, false for public access.
Where the value comes from: Your organization access policy.
How to use it later: Later nodes may use submitter identity along with {{$json.data}} when authentication is available.
Accepted format: true or false.
Real workplace example: true for employee equipment requests.
If it is empty or wrong: Outside users may be blocked, or sensitive internal forms may accept anonymous submissions.
Common mistake: Enabling it on a marketing lead form.`,
      captcha: `What this field is: A spam-prevention check before public submission.
Why it matters: It helps stop automated spam from creating workflow runs.
When to fill it: Turn it on for public forms that unknown users can reach.
What to enter: true to require CAPTCHA, false for trusted internal forms.
Where the value comes from: Your risk level for the form URL.
How to use it later: CAPTCHA only controls whether the workflow starts; later nodes receive successful answers like {{$json.message}}.
Accepted format: true or false.
Real workplace example: true for a public contact form that creates CRM leads.
If it is empty or wrong: Spam may start too many runs, or trusted users may face unnecessary friction.
Common mistake: Using CAPTCHA instead of validating required email and message fields.`,
      fieldLabel: `What this field is: The visible question or label for one form answer.
Why it matters: Clear labels create cleaner submissions.
When to fill it: Fill it for every field.
What to enter: Work Email, Order Number, Company Name, or How can we help?
Where the value comes from: Use words submitters understand.
How to use it later: Later nodes map the internal name, not the label, such as {{$json.work_email}}.
Accepted format: Plain text.
Real workplace example: Order Number tells customers to enter ORD-1048.
If it is empty or wrong: Users may answer the wrong thing.
Common mistake: Writing customer_email instead of Customer Email.`,
      internalName: `What this field is: The stable key used in workflow output for one answer.
Why it matters: Later nodes use this key in mappings.
When to fill it: Review it before connecting downstream nodes.
What to enter: Lowercase letters, numbers, and underscores such as customer_email or issue_category.
Where the value comes from: The editor can create it from the label, but you should make it clear and stable.
How to use it later: Use expressions like {{$json.customer_email}} or {{$json.data.customer_email}}.
Accepted format: lowercase_with_underscores.
Real workplace example: issue_category routes the request to Billing, Technical, or Sales.
If it is empty or wrong: Later mappings may fail.
Common mistake: Renaming it after downstream nodes already use it.`,
      fieldType: `What this field is: The kind of answer the form should collect.
Why it matters: It controls validation and the submitter input control.
When to fill it: Choose it for every field.
What to enter: text for short text, email for email addresses, number for numbers, tel for phone numbers, url for links, date for dates, textarea for long messages, select for a dropdown, checkbox for yes/no, radio for one visible choice, or file for uploads.
Where the value comes from: Pick it from the answer format your process needs.
How to use it later: Values appear under the internal name, such as {{$json.phone_number}}.
Accepted format: text, email, number, tel, url, date, textarea, select, checkbox, radio, or file.
Real workplace example: select for Department so routing receives predictable values.
If it is empty or wrong: Valid users may be rejected or messy data may reach later nodes.
Common mistake: Using text when email, number, url, or date validation would help.`,
      placeholder: `What this field is: Light example text shown before a user types.
Why it matters: It shows the expected format without adding another instruction.
When to fill it: Use it for text-like fields when an example would help.
What to enter: Safe fake examples like alex@example.com, ORD-1048, or https://example.com.
Where the value comes from: The answer format your team expects.
How to use it later: Placeholder text is not submitted; later nodes use the actual answer like {{$json.order_number}}.
Accepted format: Plain text, not real customer data.
Real workplace example: ORD-1048 for Order Number.
If it is empty or wrong: The form works, but answers may be inconsistent.
Common mistake: Treating placeholder as a default submitted value.`,
      options: `What this field is: The allowed choices for select and radio fields.
Why it matters: Fixed choices make routing and reporting reliable.
When to fill it: Use it when Field Type is select or radio.
What to enter: Comma-separated choices or label:value pairs.
Where the value comes from: Approved categories, departments, statuses, products, or request types.
How to use it later: Branch on values like {{$json.issue_category}} equals billing.
Accepted format: Billing, Technical, Sales or Billing Team:billing.
Real workplace example: Billing Team:billing, Technical Support:technical, Sales:sales.
If it is empty or wrong: Submitters may see no useful choices or branch rules may not match.
Common mistake: Changing option values without updating downstream conditions.`,
      required: `What this field is: Whether the submitter must answer this question.
Why it matters: Required fields prevent missing values that later nodes need.
When to fill it: Turn it on only for answers the workflow cannot continue without.
What to enter: true/on for mandatory answers, false/off for optional ones.
Where the value comes from: Your minimum intake requirement.
How to use it later: Required answers make mappings like {{$json.customer_email}} more reliable.
Accepted format: true or false.
Real workplace example: true for Work Email on a demo request form.
If it is empty or wrong: Too many required fields reduce completion; too few can break the workflow.
Common mistake: Marking every question required.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // COMMUNICATION
  // ─────────────────────────────────────────────────────────────

  google_gmail: {
    '*': {
      from: `What this field is: The email address that will appear as the sender.
How to fill it: Use your Gmail address or a Gmail alias you have set up.
Example: alice@gmail.com or orders@yourcompany.com
Leave blank to use your primary Gmail address automatically.`,
    },
    send: {
      operation: `What this field is: Which Gmail action this node performs.
How to fill it: Choose send, list, get, or search from the dropdown before filling any other field.
Example: send.`,
      credentialId: `What this field is: An internal reference to a specific saved Google connection, used only in advanced multi-account setups.
How to fill it: Leave this empty. Gmail automatically uses the Google account connected for this workflow.
This is not a login field — never type an email address or password here.`,
      recipientSource: `What this field is: How recipients are chosen for Send Email.
How to fill it: Choose manual_entry to type addresses in Recipient Emails, or extract_from_sheet to pull recipients from upstream Google Sheets row data (with this node's Fallback Spreadsheet ID as a backup).
Example: manual_entry.`,
      recipientEmails: `What this field is: The email address(es) of who will receive this email.
How to fill it: Type one email address. For multiple recipients, separate with commas.
Example (one): alice@example.com
Example (multiple): alice@example.com, bob@example.com, carol@example.com
Tip: Use {{$json.email}} to pull the email address from a previous step (like a form or database node).
Active when Recipient Source is Manual entry.`,
      spreadsheetId: `What this field is: A backup Google Sheet to read recipients from, used only when Recipient Source is Extract from sheet and no upstream node already supplied recipient rows.
How to fill it: Copy the ID from the sheet's URL, between /d/ and /edit.
Leave empty when a Google Sheets node already runs before this Gmail node.`,
      sheetName: `What this field is: The tab name inside the fallback spreadsheet above.
How to fill it: Match the tab label exactly as shown in Google Sheets.
Example: Sheet1 (default).`,
      range: `What this field is: An optional A1-style range inside the fallback sheet tab, to skip header rows or unrelated columns.
How to fill it: Use a range like A2:D500. Leave empty to read the whole tab.`,
      useAiRecipientMapping: `What this field is: A toggle that scans every cell in each fallback-sheet row for an email address, instead of only columns named like "email".
How to fill it: Turn on when the sheet's column headers are messy or inconsistent.`,
      to: `What this field is: A legacy single-recipient fallback used only when Recipient Emails is empty.
How to fill it: Prefer Recipient Emails for new workflows; use To only for a single fixed address or an older workflow.
Example: recipient@example.com`,
      subject: `What this field is: The subject line — the bold text the recipient sees in their inbox before opening the email.
How to fill it: Write a short, clear subject.
Example: Your order #12345 has shipped!
Tip: Use {{$json.orderNumber}} to include data from an earlier step. Example: Your order #{{$json.orderId}} has been confirmed.`,
      body: `What this field is: The full email content — everything the recipient reads after opening.
How to fill it: Type plain text. Line breaks are kept.
Example: Hi {{$json.name}}, thank you for your purchase! Your order will arrive in 3–5 business days.
Tip: Anything inside {{ }} is replaced with real data from an earlier step. Example: {{$json.name}} becomes "Alice".`,
      cc: `What this field is: Optional visible copied recipients.
How to fill it: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.
Example: manager@example.com, audit@example.com
Leave blank when no CC recipients are needed.`,
      bcc: `What this field is: Optional hidden copied recipients.
How to fill it: Type one email address, or multiple addresses separated with commas, semicolons, or new lines.
Example: archive@example.com
Leave blank when no BCC recipients are needed.`,
    },
    get: {
      messageId: `What this field is: The unique ID of a specific Gmail email you want to fetch.
Where to find it: First run a Gmail List or Search operation — each item in the returned messages array has an id field. Copy that value (not messageId — the array items only use id).
Example: 18abc123def456
Tip: Use {{$json.id}} from a looped List/Search item to pass it automatically into this Get step.`,
    },
    list: {
      query: `What this field is: A search filter to find specific emails — works exactly like typing in the Gmail search bar.
How to fill it: Use Gmail search operators.
Examples:
  from:boss@company.com  →  emails from a specific person
  subject:invoice        →  emails with "invoice" in the subject
  is:unread              →  only unread emails
  after:2025/01/01       →  emails since January 1, 2025
  has:attachment         →  emails with attachments
Leave blank to return all recent emails.`,
      maxResults: `What this field is: The maximum number of emails to return.
Example: 10 returns the 10 most recent matching emails. 50 returns up to 50.
Leave blank for the default of 10.`,
    },
    search: {
      query: `What this field is: A search filter to find specific emails.
How to fill it: Use Gmail search syntax.
Examples: from:billing@stripe.com or subject:"payment failed" or is:unread after:2025/01/01`,
      maxResults: `What this field is: The maximum number of emails to return.
Example: 10 for the first 10 results. Leave blank for the default of 10.`,
    },
  },

  outlook: {
    send_email: {
      to: `What this field is: Who receives this Outlook email.
How to fill it: One email address, or multiple addresses separated by commas.
Example: client@company.com
Multiple: alice@example.com, bob@example.com
Tip: Use {{$json.email}} to pull a recipient from an earlier step.`,
      subject: `What this field is: The email subject line.
Example: Invoice #{{$json.invoiceNumber}} from Acme Corp`,
      body: `What this field is: The plain-text email body sent through Microsoft Graph.
Example: Dear {{$json.name}}, please find your invoice attached. Total due: \${{$json.amount}}.`,
    },
  },

  slack_message: {
    default: {
      channel: `What this field is: The Slack destination where the bot should post.
Why it matters: Slack needs a real channel name, channel ID, or user/direct-message ID before the saved OAuth bot can send with chat.postMessage.
When to fill it: Fill it for Slack OAuth bot sends. If this is blank, runtime returns "Slack Message node: channel is required when using Slack OAuth bot token".
What to enter: Use a public channel such as #alerts, a stable channel ID such as C01234ABCDE, or a user/direct-message ID when your app can message that user.
Where the value comes from: Copy it from Slack channel details, choose a team channel, or map {{$json.channelId}} from a Slack Trigger so the workflow replies in the same channel.
How to use data from a previous step: Type {{$json.channelId}}, {{$json.slackChannel}}, or another expression that resolves to one Slack destination.
Accepted format: #channel-name, C/G/D-style Slack ID, or an expression resolving to one of those values.
Real workplace example: A customer support workflow maps {{$json.channelId}} from a Slack app mention and replies in the same incident channel.
What happens if it is empty or wrong: The node can fail with missing channel, channel_not_found, not_in_channel, or invalid_channel.
Common mistake to avoid: Posting to a private channel before inviting the connected bot. Invite it in Slack or use a destination where the bot is already a member.`,
      message: `What this field is: The readable text Slack sends as the message and fallback notification.
Why it matters: Teammates see this text in Slack, mobile previews, search, and notifications even when a Blocks layout is also provided.
When to fill it: Fill it for every Slack Message node. The backend schema marks Message as required, and Slack Block Kit messages should still include fallback text.
What to enter: Write the workplace alert, approval prompt, summary, or status update. Combine fixed text with mapped data such as {{$json.ticketId}}, {{$json.customerEmail}}, or {{$json.orderTotal}}.
Where the value comes from: Use trigger data, form answers, CRM records, API responses, database rows, AI summaries, or error-handler fields from earlier workflow steps.
How to use data from a previous step: Type a sentence like New ticket {{$json.ticketId}} from {{$json.customerEmail}} needs review.
Accepted format: Plain text, Slack mrkdwn such as *bold*, _italic_, \`code\`, links, line breaks, and workflow expressions.
Real workplace example: Send "Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} is waiting in Zendesk" to #support-triage.
What happens if it is empty or wrong: Runtime may return "Slack Message node: Message or Blocks is required" or send a vague fallback message, which makes alerts hard to act on.
Common mistake to avoid: Writing only "Done" or "Error" without the ID, owner, channel, or next action a teammate needs.`,
      threadTs: `What this field is: The Slack timestamp of an existing message thread where this node should post a reply.
Why it matters: It keeps workflow replies inside the original Slack discussion instead of creating a separate top-level message.
When to fill it: Fill it when responding to a Slack Trigger event, app mention, slash command, interaction, or previous Slack Message output.
What to enter: Map the Slack thread timestamp, commonly {{$json.threadTs}}, {{$json.thread_ts}}, {{$json.messageTs}}, or {{$json.ts}}.
Where the value comes from: Slack Trigger and Slack Message outputs provide timestamp fields. Leave this blank for new channel announcements.
How to use data from a previous step: Put {{$json.threadTs}} when a Slack Trigger includes it, or {{$json.ts}} when replying to a message sent by an earlier Slack Message node.
Accepted format: Slack timestamp string such as 1704067200.123456, or an expression resolving to that string.
Real workplace example: An AI Agent summarizes a Slack incident request, then Slack Message uses {{$json.threadTs}} to post the answer in the same thread.
What happens if it is empty or wrong: Empty creates a top-level message. A bad timestamp can fail, appear in the wrong context, or make later replies hard to follow.
Common mistake to avoid: Pasting a human date or Slack permalink instead of the timestamp field from the trigger or previous Slack output.`,
      blocks: `What this field is: Optional Slack Block Kit JSON for a richer message layout.
Why it matters: Blocks make structured alerts easier to scan with sections, fields, dividers, buttons, context rows, and clear labels.
When to fill it: Use it for dashboards, approval prompts, incident summaries, or reports that need more structure than plain text.
What to enter: Paste a valid JSON array from Slack Block Kit Builder or map a trusted expression that resolves to a Block Kit array.
Where the value comes from: Build it in Slack Block Kit Builder, generate it in a controlled JavaScript or AI step, or keep it as [] for a plain message.
How to use data from a previous step: Include expressions inside the JSON string, such as "text":"*Ticket:* {{$json.ticketId}}".
Accepted format: A JSON array like [{"type":"section","text":{"type":"mrkdwn","text":"New ticket"}}]. The top level must be the array itself.
Real workplace example: Send a daily sales summary with fields for pipeline value, closed deals, owner, and the report link.
What happens if it is empty or wrong: Empty is fine. Invalid JSON is ignored by runtime or Slack can reject it with invalid_blocks.
Common mistake to avoid: Pasting {"blocks":[...]} instead of only the array [...] expected by this field.`,
      username: `What this field is: Optional bot display name for the Slack message.
Why it matters: A clear display name helps people recognize whether the message is an operations alert, support update, finance reminder, or deployment note.
When to fill it: Fill it only when your Slack app and workspace allow customized bot message names.
What to enter: Use a short, approved name such as Ops Alert Bot, Billing Bot, or Support Workflow.
Where the value comes from: Use your team's Slack app naming convention or workspace admin guidance.
How to use data from a previous step: Usually keep this fixed. Only map it when your organization intentionally varies the sender label by team or workflow.
Accepted format: Plain display text. This is not a username, token, credential, or Slack account login.
Real workplace example: Use "Ops Alert Bot" for deployment notifications sent to #deployments.
What happens if it is empty or wrong: Slack uses the app's default bot name or ignores the override.
Common mistake to avoid: Expecting this field to change the connected Slack account. The saved Slack OAuth2 connection still controls the sender and permissions.`,
      iconEmoji: `What this field is: Optional Slack emoji avatar shown beside the bot message.
Why it matters: Consistent icons help busy channels distinguish incidents, approvals, reports, and successful automations at a glance.
When to fill it: Fill it when your Slack app allows icon customization and the emoji makes the message easier to scan.
What to enter: Use a Slack emoji shortcode such as :rotating_light:, :white_check_mark:, :bar_chart:, :memo:, or :rocket:.
Where the value comes from: Choose an emoji already available in your Slack workspace or approved for that automation type.
How to use data from a previous step: Usually keep this fixed. For routing workflows, map an expression only if it resolves to a valid Slack emoji shortcode.
Accepted format: Emoji shortcode with a colon at the start and end, for example :rocket:.
Real workplace example: Use :rotating_light: for incident alerts and :bar_chart: for daily metric summaries.
What happens if it is empty or wrong: Slack uses the default bot icon or ignores an invalid/custom emoji it cannot resolve.
Common mistake to avoid: Pasting an image URL or a plain word. This field expects a Slack emoji shortcode.`,
    },
    '*': {
      channel: `What this field is: The Slack channel where the message will be posted.
How to fill it: Use the channel name with # like #general, or the channel ID like C01234567.
Where to find the channel ID: Right-click the channel name in Slack → View channel details → scroll to the bottom — the ID is shown there. It is safer to use the ID in case the channel is renamed.
Example: #notifications or C01234567`,
      message: `What this field is: The message text that will appear in the Slack channel.
Example: New lead from {{$json.name}} ({{$json.email}}) — signed up at {{$json.createdAt}}.
Formatting tips: *bold text*, _italic text_, \`code\`, and line breaks work in Slack messages.`,
    },
  },

  telegram: {
    default: {
      operation: `What this field is: The Telegram action to run.
Why it matters: It decides which fields are required. Choose send_message for text, send_photo for an image URL, or edit_message to update an existing bot message.
How to fill it: Use send_message for chatbot replies and alerts, send_photo for chart or screenshot notifications, and edit_message when you have {{$json.messageId}} from an earlier Telegram send.
Common mistake: Choosing a media or edit operation without filling Media URL or Edit Message ID.`,
      chatId: `What this field is: The Telegram chat, group, or channel ID where the bot sends or edits the message.
Why it matters: Telegram needs the exact numeric chat ID before the bot can deliver anything.
How to fill it: Use {{$json.chatId}} from Telegram Trigger, or find the ID with @userinfobot, @getidsbot, or getUpdates after the bot is in the chat.
Format: Personal chats are positive numbers such as 987654321. Groups and channels are often negative, such as -1001234567890.
Common mistake: Using a phone number, @username, or channel link instead of the numeric chat ID.`,
      messageType: `What this field is: The type of Telegram content to send.
Why it matters: Text uses Message, while photo, video, document, audio, and animation use Media URL and optional Caption.
How to fill it: Choose text for normal replies, photo for chart images, video for clips, document for PDFs, audio for audio files, or animation for GIF-style updates.
Common mistake: Selecting a media type while leaving Media URL empty or pointing to a private file Telegram cannot fetch.`,
      message: `What this field is: The text people read in Telegram or the replacement text for an edited message.
Why it matters: It should include the status, record ID, owner, and next action.
How to fill it: Write fixed text and map workflow data such as {{$json.ticketId}}, {{$json.aiResponse}}, {{$json.response}}, {{$json.message}}, or {{$json.text}}.
Format: Text formatting depends on Parse Mode.
Common mistake: Using HTML or Markdown syntax while Parse Mode is set to none, or sending a vague message without the useful ID.`,
      text: `What this field is: Backend alias for Message text.
Why it matters: Runtime reads text before message, so imported or AI-generated configs may use this key.
How to fill it: Most UI users should fill Message. Use text only when an existing workflow already passes the body as text, such as {{$json.aiResponse}}.
Common mistake: Filling Text and Message with different content; runtime prefers Text first.`,
      parseMode: `What this field is: The formatting style for Message and Caption.
Why it matters: It tells Telegram whether formatting is plain text, HTML, Markdown, or MarkdownV2.
Options: none sends plain text. HTML supports simple tags such as b, i, code, and links. Markdown uses Telegram legacy markdown. MarkdownV2 supports richer formatting but needs careful escaping.
Common mistake: Choosing MarkdownV2 for user-generated text without escaping special characters.`,
      disableWebPagePreview: `What this field is: An on/off setting for Telegram link preview cards.
Why it matters: Turning it on keeps messages with links compact.
How to fill it: Use true for clean report links or noisy status feeds. Use false when the preview helps people inspect the page.
Common mistake: Expecting this to hide the URL; it hides only the preview card.`,
      mediaUrl: `What this field is: The public HTTPS file URL for photo, video, document, audio, or animation sends.
Why it matters: Telegram must fetch the file from this address.
How to fill it: Use a direct URL from cloud storage, a CDN, or a previous export step, such as {{$json.reportUrl}} or {{$json.chartImageUrl}}.
Common mistake: Using a private file, local path, preview page, or signed URL that expires before Telegram reads it.`,
      caption: `What this field is: Optional text shown under Telegram media.
Why it matters: It explains the file, image, video, audio, or animation.
How to fill it: Add short context such as Report for {{$json.reportDate}}: {{$json.summary}}.
Format: Caption formatting follows Parse Mode.
Common mistake: Putting a long report in the caption instead of sending the file and a short summary.`,
      replyToMessageId: `What this field is: The existing Telegram message ID this send should reply to.
Why it matters: It keeps a bot answer attached to the original question or alert.
How to fill it: Map {{$json.messageId}}, {{$json.message_id}}, or {{$json.replyToMessageId}} from Telegram Trigger or an earlier Telegram output.
Common mistake: Putting Chat ID here. Chat ID chooses the destination; Reply To Message ID chooses the specific message.`,
      editMessageId: `What this field is: The existing bot message ID to update when Operation is edit_message.
Why it matters: Telegram needs this ID before it can edit a sent message.
How to fill it: Use {{$json.messageId}} from a previous Telegram send output or a stored message record.
Common mistake: Trying to edit a user's message or a message sent by another bot.`,
      replyMarkup: `What this field is: Optional Telegram JSON for inline buttons, reply keyboards, keyboard removal, or force reply.
Why it matters: Buttons let people approve, reject, open a ticket, or choose a route without typing commands.
How to fill it: Use a valid JSON object such as {"inline_keyboard":[[{"text":"Approve","callback_data":"approve"}]]}.
Common mistake: Using single quotes, trailing commas, or malformed callback data.`,
      disableNotification: `What this field is: An on/off setting that sends the Telegram message silently.
Why it matters: It reduces interruption for routine updates.
How to fill it: Use true for low-priority digests or logs, and false for urgent alerts.
Common mistake: Silencing messages that people must act on quickly.`,
      protectContent: `What this field is: An on/off setting that asks Telegram to prevent forwarding or saving where supported.
Why it matters: It adds protection for sensitive reports or internal-only files.
How to fill it: Use true for confidential content and false for normal messages.
Common mistake: Treating this as full access control; still send sensitive content only to the right chat.`,
      allowSendingWithoutReply: `What this field is: An on/off setting that lets Telegram send even if Reply To Message ID is missing or deleted.
Why it matters: Automated replies can still reach the chat when the original message disappears.
How to fill it: Use true when the answer should still send without the reply link, and false when attaching to the original message is required.
Common mistake: Turning it on when compliance requires the reply to remain attached to the original message.`,
    },
  },
  linkedin: {
    create_post: {
      text: `What this field is: The text body of your LinkedIn post — what your connections will read in their feed.
How to fill it: Write your post content. Keep it under 3,000 characters for best results. Add line breaks for readability.
Example: Excited to share our latest product update! We've added 3 new automation features based on your feedback. Check it out at example.com #automation #productivity
Tip: Use {{$json.postContent}} to generate the text dynamically from an earlier step like an AI node.`,
      visibility: `What this field is: Who can see your post on LinkedIn.
Options:
  PUBLIC — visible to everyone on LinkedIn (recommended for announcements)
  CONNECTIONS — only your direct connections can see it
Example: PUBLIC`,
      personUrn: `What this field is: Your LinkedIn member ID — a code that identifies your personal LinkedIn account.
Where to find it: Go to your LinkedIn profile page in a browser. Look at the URL in the address bar — it ends with something like /in/alice-kumar-ab123456. The characters at the very end after the last dash (e.g. ab123456) are your member ID.
Format: Enter just the ID part — no URL, no full URN prefix.
Example: If your profile URL is linkedin.com/in/alice-kumar-ab123456, enter: ab123456`,
    },
    create_post_media: {
      text: `What this field is: The caption or text that appears with your media post.
Example: Check out our new product demo video! {{$json.postText}}`,
      mediaUrl: `What this field is: The public URL of the image or video to attach to the post.
Important: The file must be publicly accessible on the internet — not a local file.
How to get a public URL: Upload to AWS S3, Google Drive (set to public), Cloudinary, or any hosting service. Copy the direct file URL.
Example: https://storage.googleapis.com/mybucket/demo-video.mp4`,
    },
    '*': {
      personUrn: `What this field is: Your LinkedIn member ID.
Where to find it: Open your LinkedIn profile in a browser. The URL ends with /in/your-name-XXXXXX — the last part (e.g. ab123456) is your member ID.
Example: ab123456`,
    },
  },

  twitter: {
    create: {
      text: `What this field is: The tweet content — maximum 280 characters.
Example: Just shipped a new feature: automated workflow triggers! Try it at example.com #automation #nocode
Tip: Use {{$json.announcement}} to pull the text from an earlier step like an AI node.`,
    },
    '*': {
      apiKey: `What this field is: Your Twitter/X API Key — identifies your app.
Where to find it: developer.twitter.com → Projects & Apps → [Your App] → Keys and Tokens → API Key and Secret → copy the API Key.`,
      consumerKey: `What this field is: Your Twitter/X Consumer Key (same as API Key).
Where to find it: developer.twitter.com → your app → Keys and Tokens → API Key.`,
    },
  },

  instagram: {
    create: {
      imageUrl: `What this field is: The public web address (URL) of the image to post on Instagram.
Important: The image must be publicly accessible on the internet — not a file on your computer or a local path.
How to get a public URL:
  Option 1: Upload to AWS S3 → make the file public → copy the URL
  Option 2: Upload to Google Drive → right-click → Get link → Anyone with link → copy direct image URL
  Option 3: Upload to Cloudinary or Imgbb.com
Example: https://storage.googleapis.com/mybucket/product-photo.jpg`,
      caption: `What this field is: The text description that appears below the Instagram image.
Example: New product alert! 🎉 {{$json.productName}} is now available. Visit the link in our bio for details. #newproduct #launch`,
    },
    '*': {
      pageId: `What this field is: Your Facebook/Instagram Page ID (Instagram Business requires a connected Facebook Page).
Where to find it: Facebook Business Suite → Pages → select your page → About — the Page ID is shown at the bottom.
Example: 123456789012345`,
    },
  },

  whatsapp: {
    default: {
      resource: `What this field is: The category of WhatsApp action this node performs — Message, Contact, Conversation, Template, Campaign, or AI Agent.
Why it matters: Operation only makes sense once Resource is chosen; each resource has its own set of operations.
How to choose: This visual panel currently only exposes message (send text/media/location/contact/template/interactive, mark as read). The other resources are runtime-supported for AI-generated or manually edited workflow configs.
Common mistake: Typing a different case, such as Message instead of message; the value must match exactly.`,
      operation: `What this field is: The specific WhatsApp action to run within the chosen Resource.
Why it matters: It decides which WhatsApp Cloud API call is made and which fields below are required.
How to choose: Use sendText for free-form replies inside the 24-hour window, sendTemplate to start a conversation or message outside that window, sendMedia/sendLocation/sendContact for rich content, sendInteractiveButtons/List/CTA for tappable UI, and markAsRead for read receipts.
Common mistake: Choosing sendText for the very first message to a new contact — WhatsApp rejects free-form text outside the 24-hour window; use sendTemplate instead.`,
      phoneNumberId: `What this field is: Your WhatsApp Business Phone Number ID — a long number Meta assigns to your business phone number.
Where to find it: Log in to Meta Business Suite (business.facebook.com) → WhatsApp → API Setup. Copy the "Phone Number ID" shown there — it is a long number like 123456789012345. This is NOT your actual phone number — it is a Meta-assigned ID.
When to fill it: Leave blank for a single-number account; only set it if your business has more than one WhatsApp number.
Example: 123456789012345`,
      businessAccountId: `What this field is: Your WhatsApp Business Account (WABA) ID, used by contact, template, and campaign actions instead of a phone number.
Where to find it: Meta Business Suite → WhatsApp Manager → Account overview.
When to fill it: Leave blank to auto-resolve from your connected phone number; only set it if you manage more than one WABA.
Example: 123456789012345`,
    },
    sendText: {
      to: `What this field is: The WhatsApp phone number of the person you want to message.
Format: Must include country code with + sign. No spaces, no dashes, no brackets.
Examples: +14155552671 (USA), +919876543210 (India), +447911123456 (UK), +61412345678 (Australia).
Tip: Use {{$json.chatId}} or {{$json.customerPhone}} if the number comes from an earlier step like a form, database, or WhatsApp Trigger.`,
      text: `What this field is: The free-form message the recipient will receive on WhatsApp.
Why it matters: Only allowed within the 24-hour customer service window that opens after the customer messages you; use Send Template outside that window.
How to fill it: Type your message. Keep it clear and conversational.
Example: Hello {{$json.name}}, your delivery is arriving today between 2-4 PM. Track it here: {{$json.trackingUrl}}
Tip: Use {{$json.field}} to personalize the message with data from an earlier step.`,
      previewUrl: `What this field is: Whether WhatsApp shows a preview card (title, image, description) for the first link inside Message.
When to use it: Turn on for marketing links you want to look rich; leave off for a compact message with plain link text.
Common mistake: Turning it on for a link with no preview metadata — WhatsApp then shows only the plain link, no visible change.`,
    },
    sendMedia: {
      to: `What this field is: The WhatsApp phone number of the person who should receive the file.
Format: + country code + number, no spaces or dashes, such as +14155552671.
Tip: Use {{$json.customerPhone}} from an earlier step.`,
      mediaType: `What this field is: The kind of file being sent — image, video, audio, document, or sticker.
Why it matters: Audio and sticker do not support Caption; image and document do.
Example: Choose document for a PDF invoice with a Caption.`,
      mediaUrl: `What this field is: A public HTTPS link to the file WhatsApp should download and deliver.
Requirement: Must be reachable without a login — not a Google Drive preview page or a signed URL that expires quickly.
Example: {{$json.invoicePdfUrl}}`,
      mediaId: `What this field is: The Meta media ID from a file already uploaded to WhatsApp, used instead of Media URL.
When to use it: Only if you uploaded the file ahead of time and have its ID; otherwise use Media URL.`,
      caption: `What this field is: Optional text shown under image or document media (ignored for audio and sticker).
Example: Invoice {{$json.invoiceNumber}} for {{$json.customerName}}`,
    },
    sendLocation: {
      latitude: `What this field is: The decimal latitude of the map pin, such as 12.9716 for Bengaluru.
Common mistake: Swapping Latitude and Longitude, which places the pin in the wrong part of the world.`,
      longitude: `What this field is: The decimal longitude of the map pin, such as 77.5946 for Bengaluru.
Common mistake: Swapping Latitude and Longitude, which places the pin in the wrong part of the world.`,
      locationName: `What this field is: The short label shown above the map pin, such as "Main Store - Sector 5".
When to fill it: Optional but recommended so the recipient recognizes the pin.`,
      address: `What this field is: The full street address shown under the location name, such as "221B Baker Street, London".
When to fill it: Optional; add it when the recipient may need directions.`,
    },
    sendContact: {
      contacts: `What this field is: A JSON array of WhatsApp contact-card objects, following Meta's contacts message format (name, phones, emails, org).
Example: [{"name":{"formatted_name":"Alice Kumar","first_name":"Alice"},"phones":[{"phone":"+919876543210","type":"MOBILE"}]}]
Common mistake: Sending a flat {"name":"Alice","phone":"+91..."} object instead of Meta's required nested structure.`,
    },
    sendTemplate: {
      templateName: `What this field is: The name of a pre-written and pre-approved WhatsApp message template.
Important: You cannot send free-form messages to new contacts on WhatsApp — you must use an approved template.
Where to find your templates: Meta Business Suite (business.facebook.com) → WhatsApp → Message Templates. The "Template Name" column shows the exact name to enter here.
Example: order_confirmation or welcome_message or appointment_reminder`,
      language: `What this field is: The language code the template was approved in, such as en_US, pt_BR, or ar.
Why it matters: Sending with the wrong language code makes WhatsApp report the template as not found, even if the name is correct.
Where to find it: Meta Business Suite → WhatsApp → Message Templates → Language column.`,
      templateComponents: `What this field is: A JSON array filling the template's placeholder variables (header, body, button parameters).
Example: [{"type":"body","parameters":[{"type":"text","text":"{{$json.customerName}}"}]}]
Common mistake: Providing fewer or more parameters than the template actually has placeholders for.`,
      templateStatus: `What this field is: An optional local safety check confirming the template's current Meta approval status before sending.
When to use it: Fill it with the exact value APPROVED from a previous Template Get step to block the send locally if the template is not ready yet. Leave blank to skip this check.`,
    },
    sendInteractiveButtons: {
      bodyText: `What this field is: The main message shown above the buttons.
Example: "Your order {{$json.orderId}} is ready. What would you like to do next?"`,
      headerText: `What this field is: Optional bold text shown above Body Text.
Note: Only Send Interactive Buttons renders this; Send Interactive List and Send Interactive CTA Button ignore it.`,
      footerText: `What this field is: Optional small gray text shown below the buttons.
Note: Only Send Interactive Buttons renders this; Send Interactive List and Send Interactive CTA Button ignore it.`,
      buttons: `What this field is: A JSON array of up to 3 tappable reply buttons, each with a unique id and a title of 20 characters or fewer.
Example: [{"type":"reply","reply":{"id":"confirm","title":"Confirm"}},{"type":"reply","reply":{"id":"cancel","title":"Cancel"}}]
Common mistake: Giving two buttons the same id, making it impossible to tell which one was tapped.`,
    },
    sendInteractiveList: {
      bodyText: `What this field is: The main message shown above the list button.
Example: "Choose a plan that fits your team."`,
      buttonText: `What this field is: The label on the single button that opens the scrollable list, such as "View Options" or "Select a Plan".`,
      sections: `What this field is: A JSON array of section groups, each with a title and rows (id, title, description), shown when the list button is tapped.
Example: [{"title":"Plans","rows":[{"id":"basic","title":"Basic","description":"$10/month"}]}]
Common mistake: Reusing the same row id across two different sections.`,
    },
    sendInteractiveCTA: {
      bodyText: `What this field is: The main message shown above the CTA button.
Example: "Your order {{$json.orderId}} has shipped."`,
      ctaUrl: `What this field is: A JSON object with display_text (button label) and url (destination link) for the single CTA button.
Example: {"display_text":"Track Order","url":"https://example.com/track/{{$json.orderId}}"}
Note: Unlike Buttons, tapping this opens a URL instead of sending a reply back to your workflow.`,
    },
    markAsRead: {
      messageId: `What this field is: The WhatsApp message ID of the incoming customer message to mark as read.
Where to find it: Map {{$json.messageId}} from WhatsApp Trigger output for the message you are responding to.`,
    },
  },

  whatsapp_cloud: {
    '*': {
      to: `What this field is: The recipient's WhatsApp phone number with country code.
Format: + country code + number, no spaces or dashes.
Examples: +14155552671 (USA), +919876543210 (India), +447911123456 (UK)
Tip: Use {{$json.chatId}} from a WhatsApp Trigger, or {{$json.phone}} from an earlier step.`,
      text: `What this field is: The message content the recipient will receive (labeled "Message" in the panel, stored under the key text).
Example: Hi {{$json.name}}, your order #{{$json.orderId}} has been confirmed and will ship in 2 days.
Note: an older panel version stored this under a key named message, which the runtime never read — sends went out empty. The key is now text, matching what runtime actually reads.`,
      messageType: `What this field is: A leftover dropdown (Text/Template) with no effect on the actual send — this deprecated node always sends plain text regardless of this value.
Use the WhatsApp node's Operation field for real template sending.`,
      phoneNumberId: `What this field is: Your WhatsApp Business Phone Number ID from Meta. Not exposed in this deprecated node's panel — only reachable by editing workflow JSON directly.
Where to find it: Meta Business Suite → WhatsApp → Settings → Phone Numbers → copy the Phone Number ID (a long number, NOT the actual phone number itself).
Example: 123456789012345`,
      resource: `What this field is: Always fixed to "message" internally for this deprecated node. Not exposed in the panel.
The underlying WhatsApp executor also supports Contact, Conversation, Template, Campaign, and AI Agent resources, but only through the WhatsApp node — not this deprecated one.`,
      operation: `What this field is: Always fixed to "sendText" internally for this deprecated node. Not exposed in the panel.
The underlying WhatsApp executor also supports sendMedia, sendLocation, sendContact, sendTemplate, interactive messages, and markAsRead, but only through the WhatsApp node — not this deprecated one.`,
      mediaUrl: `What this field is: A backend-declared field for media attachments, not exposed in this deprecated node's panel.
Use the WhatsApp node's Send Media operation instead, which fully exposes Media URL, Media Type, Media ID, and Caption.`,
    },
  },

  twilio: {
    default: {
      to: `What this field is: The phone number of the person who will receive the SMS.
Format: E.164 international format — + sign, then country code, then the number. No spaces, dashes, or brackets.
Examples:
  +14155552671  →  USA
  +919876543210 →  India
  +447911123456 →  UK
Tip: Use {{$json.phone}} if the number comes from a form or database in an earlier step.`,
      from: `What this field is: Your Twilio phone number — the number the SMS will be sent FROM.
Where to find it: Log in to console.twilio.com → Phone Numbers → Manage → Active Numbers. Copy one of your Twilio numbers.
Example: +15005550006
Note: This must be a number you own in Twilio — you cannot use a personal number here. Required unless Messaging Service SID is set.`,
      message: `What this field is: The text message the recipient will receive.
Important: Standard SMS is limited to 160 characters. Messages over 160 characters are split and billed per part.
Example: Hi {{$json.name}}, your verification code is {{$json.code}}. It expires in 10 minutes. Do not share this code.
Tip: Use {{$json.field}} to personalize with data from an earlier step.`,
      messagingServiceSid: `What this field is: The SID of a Twilio Messaging Service, used to send from a pool of numbers instead of one fixed From number.
Where to find it: console.twilio.com → Messaging → Services.
Example: MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Use either From or Messaging Service SID, not both.`,
      mediaUrl: `What this field is: A public URL of an image, GIF, or other media file to attach to the message (sends as MMS instead of SMS).
Example: https://example.com/image.jpg`,
    },
  },

  mailgun: {
    send_email: {
      operation: `What this field is: The Mailgun action to perform.
Leave it on Send Email — it is the only implemented action today; the dropdown exists for future Mailgun actions.`,
      from: `What this field is: The email address that will appear as the sender.
Important: Must use your verified Mailgun domain.
Example: noreply@mg.yourcompany.com or support@mg.yourcompany.com`,
      to: `What this field is: The recipient's email address.
Example: customer@example.com
Tip: Use {{$json.email}} from a form or database step.`,
      subject: `What this field is: The email subject line.
Example: Your account has been activated - welcome to {{$json.companyName}}!`,
      text: `What this field is: The plain text email body.
Mailgun requires at least one of text, html, or template.
Tip: Use {{$json.message}} when the content comes from an earlier step.`,
      html: `What this field is: The HTML email body.
Mailgun requires at least one of text, html, or template.
Example: <p>Hello {{$json.name}}</p>`,
      cc: `What this field is: Optional CC recipient email addresses.
Use comma-separated values for multiple recipients.`,
      bcc: `What this field is: Optional BCC recipient email addresses.
Use comma-separated values for multiple recipients.`,
      replyTo: `What this field is: Optional Reply-To email address for replies.
Example: support@mg.yourcompany.com`,
      tags: `What this field is: Optional Mailgun tags for message tracking.
Use comma-separated values such as welcome,onboarding.`,
      template: `What this field is: Optional Mailgun stored template name.
If set, the template can provide the message content.`,
      templateVariables: `What this field is: JSON variables passed to a Mailgun stored template.
Example: {"name":"{{$json.name}}","resetUrl":"{{$json.resetUrl}}"}`,
    },
    '*': {
      apiKey: `What this field is: Your Mailgun API Key that gives CtrlChecks permission to send emails.
Where to find it: mailgun.com -> Settings -> API Keys -> Private API Key.
It starts with key- and is a long string of letters and numbers.
Keep it secret - do not share or publish it.`,
      domain: `What this field is: Your verified Mailgun sending domain saved in the Mailgun connection.
Where to find it: mailgun.com -> Sending -> Domains.
Example: mg.yourcompany.com`,
      region: `What this field is: The Mailgun API region saved in the Mailgun connection.
Use US for api.mailgun.net or EU for api.eu.mailgun.net.`,
    },
  },

  sendgrid: {
    send_email: {
      operation: `What this field is: The SendGrid action to perform.
Leave it on Send Email — it is the only implemented action today; this node does not support SendGrid templates, categories, or marketing campaigns.`,
      to: `What this field is: The recipient's email address.
Example: customer@example.com
Tip: Use {{$json.email}} from an earlier form or database step.`,
      from: `What this field is: The sender email address — must be verified in your SendGrid account.
Where to verify: SendGrid dashboard → Settings → Sender Authentication → verify a single sender or your domain.
Example: hello@yourcompany.com`,
      subject: `What this field is: The email subject line.
Example: Welcome to {{$json.productName}} — here's how to get started`,
      text: `What this field is: The plain text email body sent to recipients.
Example: Hi {{$json.name}}, thank you for signing up!`,
      html: `What this field is: Optional HTML email body. If provided, SendGrid receives both text/plain and text/html content when Text is also filled.
Example: <p>Hi {{$json.name}},</p><p>Thank you for signing up!</p>`,
    },
  },

  amazon_ses: {
    default: {
      recipients: `What this field means: Recipients is a JSON object with to, cc, and bcc arrays listing who receives the email.
Why it matters: At least one address across the three arrays is required — Amazon SES rejects a send with zero recipients.
What to enter: {"to": ["customer@example.com"], "cc": [], "bcc": []}. Map an address from an earlier step such as {{$json.email}}.
Note: In SES sandbox mode, you can only send to verified email addresses. Request production access to send to anyone.`,
      subject: `What this field means: Subject is the email subject line for a raw (non-template) send.
When to fill it: Required only when Use AWS SES Template is off; hidden and ignored when it is on.
Example: "Order {{$json.orderId}} Confirmation"`,
      body: `What this field means: Body is the message content for a raw (non-template) send, sent as both the HTML and plain-text parts.
When to fill it: Required only when Use AWS SES Template is off; hidden and ignored when it is on.
Example: "Hi {{$json.name}}, your order {{$json.orderId}} is confirmed."`,
      useTemplate: `What this field means: A switch that sends an existing AWS SES template instead of the Subject/Body fields.
What to enter: Turn on only when you already created the named template in AWS SES for this node's AWS Region.
Default: false (off) — Subject and Body are used.`,
      templateName: `What this field means: The exact name of an AWS SES template to send, used only when Use AWS SES Template is on.
Where to find it: AWS Console → SES → Email templates, in the same region as this node's AWS Region field.
Example: OrderConfirmation`,
      templateData: `What this field means: Template Data supplies the values for the template's own {{placeholders}}.
What to enter: A JSON object whose keys match the template's placeholder names exactly, such as {"name":"John","orderId":"12345"}.
Note: A placeholder used by the template but missing here fails the send with "Template data validation failed: missing: ...".`,
      fromAddress: `What this field is: The sender address — must be verified in AWS SES.
Where to verify: AWS Console → SES → Verified identities → Verify a new email or domain, in the same region as this node's AWS Region field.
Example: noreply@yourcompany.com`,
      replyToAddresses: `What this field means: A JSON array of address(es) that should receive replies instead of From Address.
Example: ["support@example.com"]
Leave empty to let replies go to From Address as normal.`,
      attachments: `What this field means: A JSON array of file attachments, each with filename, base64 content, and contentType.
Note: Only PDF, Word, Excel, common image, TXT/CSV, and ZIP types are accepted, and the extension must match contentType. Total email size (subject + body + attachments) must stay under 40MB.
Example: [{"filename":"report.pdf","content":"{{$json.pdfContent}}","contentType":"application/pdf"}]`,
      awsRegion: `What this field means: The AWS region where your SES verified identities, templates, and configuration sets exist.
Why it matters: SES identities and templates are per-region — using the wrong region causes unverified-sender or template-not-found failures.
Default: us-east-1. This field overrides the saved connection's region whenever it is set.`,
      configurationSetName: `What this field means: Links this send to an AWS SES configuration set for CloudWatch/SNS delivery-event tracking (opens, clicks, bounces, complaints).
Where to find it: AWS Console → SES → Configuration sets, in the same region as this node.
Leave empty to send normally with no configuration-set-based tracking.`,
      tags: `What this field means: Simple key/value labels attached to this send for CloudWatch filtering and reporting, used with a configuration set.
Example: {"campaign":"newsletter","type":"promotional"}
Note: Tags are never visible to the email recipient.`,
      returnPath: `What this field means: The bounce-handling (envelope-from) address; bounce notifications go here instead of the default AWS SES handling.
Note: This address generally needs its own SES verification, the same as From Address.
Example: bounces@example.com`,
    },
  },

  discord_trigger: {
    receive: {
      eventTypes: `What this field means: Event Types controls which Discord event categories can start the workflow.
Why it matters: It prevents unrelated Discord commands, interactions, or webhook events from starting the wrong automation.
When to fill it: Fill it when the trigger should listen to only slash commands, interactions, message-like events, or webhook events.
What to enter: Use comma-separated values such as slash_command, interaction, webhook_event, or message.
Where the value comes from: Match the Discord feature configured in the Developer Portal.
How to use it later: Later nodes can route with {{$json.eventType}} and {{$json.rawEventType}}.
Accepted format: Comma-separated text or an array in workflow JSON.
Real workplace example: slash_command, interaction for a /support bot.
If it is empty or wrong: Runtime uses defaults or ignores mismatched events.
Common mistake: Adding message when Discord is not actually delivering message events to this endpoint.`,
      guildIds: `What this field means: Allowed Guild IDs limits the trigger to specific Discord servers.
Why it matters: One app can be installed in many servers, but one workflow may belong to one customer or community.
When to fill it: Fill it when the endpoint receives events from several servers.
What to enter: Numeric server IDs separated by commas or new lines.
Where the value comes from: Enable Discord Developer Mode, right-click the server, and copy Server ID.
How to use it later: Accepted events include {{$json.guildId}} for logs and routing.
Accepted format: Discord snowflake IDs.
Real workplace example: 222222222222222222 for a customer community server.
If it is empty or wrong: Empty accepts any delivered guild; wrong IDs filter out events.
Common mistake: Copying a channel ID instead of the server ID.`,
      channelIds: `What this field means: Allowed Channel IDs limits the trigger to specific Discord channels.
Why it matters: It keeps commands from #general from starting workflows intended for #support or #incidents.
When to fill it: Fill it when this workflow belongs to only some channels.
What to enter: Numeric channel IDs separated by commas or new lines.
Where the value comes from: Enable Developer Mode, right-click the channel, and copy Channel ID.
How to use it later: Use {{$json.channelId}} or {{$json.chatId}} to reply in the same place.
Accepted format: Discord snowflake IDs.
Real workplace example: 333333333333333333 for #support-triage.
If it is empty or wrong: Empty accepts all delivered channels; wrong IDs filter out events.
Common mistake: Typing #support instead of the numeric channel ID.`,
      allowedUserIds: `What this field means: Allowed User IDs limits who can start the workflow.
Why it matters: Some Discord commands create tickets, escalate incidents, or change business records.
When to fill it: Use it for moderator-only, employee-only, or pilot workflows.
What to enter: Numeric user IDs separated by commas or new lines.
Where the value comes from: Enable Developer Mode, right-click the user, and copy User ID.
How to use it later: Accepted events include {{$json.userId}} and {{$json.username}} for audit logs.
Accepted format: Discord snowflake IDs.
Real workplace example: 111111111111111111 for a support lead.
If it is empty or wrong: Empty allows any delivered user; wrong IDs reject the user.
Common mistake: Using the visible username instead of the numeric user ID.`,
      commandFilter: `What this field means: Command Filter limits the trigger to one slash command.
Why it matters: Several commands can share one Discord endpoint.
When to fill it: Fill it when this workflow should handle only one command.
What to enter: A command name such as /support.
Where the value comes from: The slash command registered for your Discord application.
How to use it later: If this is blank, route by {{$json.command}} with Switch.
Accepted format: Plain text beginning with slash.
Real workplace example: /support.
If it is empty or wrong: Empty accepts all commands; wrong values produce no matching trigger.
Common mistake: Including command options instead of only the command name.`,
      applicationId: `What this field means: Application ID identifies the Discord app allowed to trigger this workflow.
Why it matters: It prevents another app or copied endpoint from starting the workflow.
When to fill it: Fill it when you run several Discord apps or need strict filtering.
What to enter: Numeric Application ID from Discord Developer Portal.
Where the value comes from: General Information for the Discord application.
How to use it later: Use {{$json.applicationId}} with {{$json.interactionToken}} for interaction follow-ups.
Accepted format: Discord application snowflake ID.
Real workplace example: 999999999999999999.
If it is empty or wrong: Empty does not filter by app; wrong values reject valid events.
Common mistake: Using the bot user ID or client secret instead.`,
      publicKey: `What this field means: Public Key Fallback verifies signed Discord requests when the key is not stored on the connection or worker.
Why it matters: Signature validation proves the request came from Discord and is recent.
When to fill it: Use only as a fallback; prefer the Discord Bot Token connection or DISCORD_PUBLIC_KEY.
What to enter: The 64-character hex Public Key from Discord General Information.
Where the value comes from: discord.com/developers/applications -> your app -> General Information.
How to use it later: It is used before execution; output uses {{$json.channelId}} and {{$json.interactionToken}} instead.
Accepted format: 64 hex characters.
Real workplace example: Save it on the Discord connection for all trigger nodes.
If it is empty or wrong: Requests fail with Invalid Discord request signature.
Common mistake: Putting the bot token or client secret here.`,
      validateSignature: `What this field means: Validate Signature checks Discord's request signature headers.
Why it matters: It blocks forged or replayed requests from starting workflows.
When to fill it: Keep enabled in production; disable only for controlled local simulations.
What to enter: true/on for production.
Where the value comes from: Workspace security policy.
How to use it later: When validation passes, later nodes use {{$json.eventType}}, {{$json.text}}, and {{$json.channelId}}.
Accepted format: Boolean checkbox.
Real workplace example: Enabled for a public /support command.
If it is empty or wrong: Default is enabled; disabling weakens endpoint security.
Common mistake: Turning it off instead of fixing the stored public key.`,
    },
  },

  discord: {
    default: {
      channelId: `What this field is: The unique ID of the Discord channel where the message will be posted.
Where to find it:
  Step 1: Open Discord → User Settings (gear icon at bottom left) → Advanced → turn on "Developer Mode".
  Step 2: Right-click the channel name → Copy ID.
The ID is a 17–19 digit number.
Example: 1234567890123456789
Leave this blank only when replying via Interaction Token + Application ID instead of the bot channel path.`,
      message: `What this field is: The message text to post in the Discord channel, on either the bot channel path or the interaction-reply path.
Example: New order from {{$json.customerName}} - Total: \${{$json.amount}}. Order ID: {{$json.orderId}}.
Formatting: **bold**, *italic*, \`code\`, and standard Discord markdown all work.
Required for every send.`,
      interactionToken: `What this field is: The short-lived token Discord issues for one slash command or component interaction, used to reply to that exact interaction.
Where to get it: Map {{$json.interactionToken}} from Discord Trigger output; it expires 15 minutes after the interaction.
Must be paired with Application ID — together they skip the bot token/channel ID path entirely.`,
      applicationId: `What this field is: The Discord application (bot) ID that owns the interaction being replied to.
Where to get it: Map {{$json.applicationId}} from Discord Trigger, or discord.com/developers/applications → your app → General Information.
Required together with Interaction Token for follow-up replies.`,
      replyToMessageId: `What this field is: The existing Discord message ID this new bot message should visually reply to.
Where to get it: Map {{$json.messageId}} from Discord Trigger or a previous Discord send's {{$json.discord.id}}.
Only applies to the Channel ID + Bot Token path, not the interaction-reply path.`,
    },
    '*': {
      botToken: `What this field is: Your Discord Bot Token — the secret that gives CtrlChecks permission to post as your bot.
Where to get it: discord.com/developers/applications → click your app → Bot → click "Reset Token" → copy the token.
Keep it absolutely secret — anyone with this token can control your bot.
This is stored in Connections, not typed into a normal workflow field.`,
    },
  },

  discord_webhook: {
    '*': {
      message: `What this field is: The message text to post in the Discord channel through the selected webhook connection.
Example: New order from {{$json.customerName}} - Total: \${{$json.amount}}. Order ID: {{$json.orderId}}.
Formatting: **bold**, *italic*, \`code\`, and standard Discord markdown all work.
Required — Discord rejects the webhook call without message content.`,
      username: `What this field is: Optional display name override for this one webhook message only.
Leave empty to use the webhook's saved default name.
Example: CtrlChecks Bot`,
      avatarUrl: `What this field is: Optional avatar image URL override for this one webhook message only.
Must be a direct public image URL (JPG, PNG, GIF), not a webpage link.
Leave empty to use the webhook's saved default avatar.
Example: https://example.com/avatar.png`,
    },
  },

  microsoft_teams: {
    default: {
      webhookUrl: `What this field is: The Incoming Webhook URL for the Microsoft Teams channel that should receive this notification.
Why it matters: Teams uses this URL as the delivery address for simple channel posts, and the URL belongs to one specific channel connector.
When to fill it: Fill it for fixed Teams channel alerts. Leave it blank only when replying to Microsoft Teams Trigger with Service URL, Conversation ID, and a Microsoft Teams Bot connection.
What to enter: Enter the complete HTTPS Incoming Webhook URL, or save it in Connections under Microsoft Teams so the runtime can retrieve it.
Where the value comes from: Create an Incoming Webhook in the target Teams channel integrations/connectors, then copy the full URL.
How to use data from a previous step: Usually keep this fixed or stored as a connection. Map {{$json.teamsWebhookUrl}} only when that value comes from a trusted internal step.
Accepted format: Full HTTPS Teams webhook URL, commonly starting with https://outlook.office.com/webhook/.
Real workplace example: Post deployment updates to the Engineering Updates channel using that channel's saved Microsoft Teams webhook connection.
What happens if it is empty or wrong: Runtime asks for webhookUrl or the Bot Framework reply fields, or Teams rejects the request as webhook failed.
Common mistake to avoid: Reusing one channel webhook for every team. Each webhook posts only to the channel where it was created.`,
      message: `What this field is: The text Microsoft Teams displays in the channel or bot conversation.
Why it matters: The message is the part teammates act on, so it should include status, IDs, owner, impact, and next action.
When to fill it: Fill it every time. Runtime returns "Teams: message is required" when it is blank after expressions resolve.
What to enter: Write a concise alert, reply, report summary, approval prompt, or handoff note.
Where the value comes from: Use trigger text, AI Agent output, form answers, CRM data, database rows, deployment metadata, or error-handler fields.
How to use data from a previous step: Combine fixed wording with values such as {{$json.ticketId}}, {{$json.customerEmail}}, {{$json.response}}, or {{$json.error}}.
Accepted format: Plain text with Teams-supported basic formatting and line breaks.
Real workplace example: "Priority ticket {{$json.ticketId}} from {{$json.customerEmail}} needs manager review before 4 PM."
What happens if it is empty or wrong: The node fails with message required, or the team receives an unclear notification.
Common mistake to avoid: Sending only "failed" or "done" without the record ID, owner, or action needed.`,
      serviceUrl: `What this field is: The Bot Framework service URL from Microsoft Teams Trigger.
Why it matters: Trigger replies must be sent back through the Teams service URL that delivered the original activity.
When to fill it: Fill it for same-conversation replies from Microsoft Teams Trigger. Leave it blank for Incoming Webhook channel notifications.
What to enter: Map {{$json.serviceUrl}} from the Teams Trigger output.
Where the value comes from: Microsoft Teams Trigger normalizes the incoming activity and exposes serviceUrl.
How to use data from a previous step: Use the expression {{$json.serviceUrl}} exactly when this Teams Message node follows a Teams Trigger.
Accepted format: HTTPS Bot Framework service URL, not a Microsoft Teams browser link.
Real workplace example: A Teams support bot receives a question, an AI Agent drafts an answer, and this field maps {{$json.serviceUrl}} to reply through the same service.
What happens if it is empty or wrong: The bot reply path cannot run, or runtime returns a serviceUrl HTTPS validation error.
Common mistake to avoid: Copying the Teams channel URL from the browser. Use the trigger field, not a human Teams link.`,
      conversationId: `What this field is: The Teams Bot Framework conversation ID that should receive the reply.
Why it matters: Service URL says where to call, while Conversation ID says which chat, channel conversation, or personal conversation gets the message.
When to fill it: Fill it with Service URL for Microsoft Teams Trigger replies. Leave it blank for webhook sends.
What to enter: Map {{$json.conversationId}} from Microsoft Teams Trigger.
Where the value comes from: The incoming Teams activity contains the conversation ID and the trigger exposes it in workflow data.
How to use data from a previous step: Use {{$json.conversationId}} from the trigger output without editing it.
Accepted format: Teams/Bot Framework conversation ID string, often beginning with 19: for channel and chat conversations.
Real workplace example: Reply to an employee's personal Teams support conversation by mapping the trigger conversationId.
What happens if it is empty or wrong: The node falls back to webhook if available, or Teams returns a bot reply failure for the wrong conversation.
Common mistake to avoid: Using Team ID or Channel ID. For replies, use conversationId exactly as provided by Microsoft Teams Trigger.`,
      replyToId: `What this field is: The Teams activity ID to reply beneath or attach the bot response to.
Why it matters: It helps keep the workflow response connected to the original user message instead of creating a separate bot post.
When to fill it: Fill it when Microsoft Teams Trigger gives replyToId or activityId and the response should attach to that activity.
What to enter: Map {{$json.replyToId}} or {{$json.activityId}} from the trigger output.
Where the value comes from: Microsoft Teams Trigger reads it from the Bot Framework activity sent by Teams.
How to use data from a previous step: Put {{$json.replyToId}} after a Teams Trigger, or leave blank to post a new message in the conversation.
Accepted format: Bot Framework activity ID string.
Real workplace example: A Teams question starts an AI support workflow and the final answer uses {{$json.replyToId}} to appear as a direct reply.
What happens if it is empty or wrong: Empty is allowed. A wrong activity ID can make Teams return bot reply failed.
Common mistake to avoid: Pasting a Teams message permalink. Use the activity ID field from the trigger output.`,
    },
    '*': {
      webhookUrl: `What this field is: The Microsoft Teams incoming webhook URL for the channel that should receive the message.
Where to find it: In Teams, open the target channel integrations/connectors, create or select Incoming Webhook, then copy the URL.
Example: https://outlook.office.com/webhook/.../IncomingWebhook/...`,
      message: `What this field is: The text posted to the Teams channel through the webhook.
How to fill it: Type the message directly or map text from an earlier workflow step.
Example: Sprint {{$json.sprintName}} completed with {{$json.storiesCompleted}} stories delivered.`,
    },
  },

  zoom_video_legacy: {
    legacyCreateMeeting: {
      topic: `What this field is: The meeting title — shown to all participants on the invite, in the Zoom app, and in calendar events.
Example: Weekly Team Sync — {{$json.teamName}} or Q1 Sales Review`,
      startTime: `What this field is: The date and time the meeting starts.
Format: ISO 8601 — YYYY-MM-DDTHH:MM:SSZ (the Z means UTC timezone).
Example: 2025-06-15T14:00:00Z means June 15, 2025 at 2:00 PM UTC (which is 10:00 AM Eastern US time).
Tip: Use {{$json.meetingTime}} from an earlier step if the time comes from a form or calendar.`,
      duration: `What this field is: How long the meeting runs, in minutes.
Example: 30 (30 minutes), 60 (1 hour), 90 (1.5 hours).`,
    },
  },

  zoom_video: {
    createMeeting: {
      operation: `What this field means: Operation chooses the Zoom meeting action this node runs.
Why it matters: Create Meeting makes a new meeting and returns a join link.
When to fill it: Set it every time; createMeeting is the default for new Zoom Video nodes.
What to enter: Choose Create Meeting when the workflow should create a Zoom room automatically.
Where the value comes from: This is usually a fixed design choice, not a value copied from Zoom.
How to use it later: Later nodes can use {{$json.data.join_url}} for attendees and {{$json.data.id}} for future updates.
Accepted format: createMeeting.
Real workplace example: Create a meeting after a sales demo request form is approved.
If it is empty or wrong: Runtime falls back to createMeeting when empty, or returns an unsupported operation error for unknown values.
Common mistake: Creating a meeting but not saving {{$json.data.id}} for later reschedule or cancellation steps.`,
      topic: `What this field means: Topic is the title shown for the Zoom meeting.
Why it matters: It helps hosts, guests, calendar users, and notification messages identify the meeting.
When to fill it: Fill it for createMeeting when you want a useful title.
What to enter: Type a short title or map one such as Discovery call with {{$json.companyName}}.
Where the value comes from: Booking forms, CRM deals, support tickets, event names, class rosters, or calendar requests.
How to use it later: Zoom returns the title as {{$json.data.topic}}.
Accepted format: Plain text.
Real workplace example: Onboarding kickoff - {{$json.accountName}}.
If it is empty or wrong: Runtime creates the meeting with the generic title Meeting.
Common mistake: Mapping a whole object instead of one text field.`,
      startTime: `What this field means: Start Time is when the Zoom meeting should begin.
Why it matters: A filled value creates a scheduled meeting; a blank value creates an instant meeting.
When to fill it: Fill it for scheduled interviews, classes, demos, customer calls, or internal handoffs.
What to enter: Use an ISO 8601 timestamp like 2026-05-01T10:00:00Z or map {{$json.startsAt}}.
Where the value comes from: Calendly, Google Calendar, a date/time form answer, a CRM appointment, or another scheduling tool.
How to use it later: Zoom returns {{$json.data.start_time}} so later nodes can include it in reminders.
Accepted format: ISO 8601 date and time, preferably with timezone or Z for UTC.
Real workplace example: 2026-05-01T15:30:00Z.
If it is empty or wrong: Empty creates an instant meeting; wrong formats can be rejected or scheduled at the wrong time.
Common mistake: Typing local words like Friday 3 PM instead of an exact timestamp.`,
      duration: `What this field means: Duration is the planned meeting length in minutes.
Why it matters: Zoom uses it for meeting metadata and calendar planning. Runtime defaults to 60 minutes if blank.
When to fill it: Fill it when the meeting is not one hour.
What to enter: A number such as 15, 30, 45, 60, or 90, or map {{$json.durationMinutes}}.
Where the value comes from: Meeting type, appointment length, event duration, support policy, or training setup.
How to use it later: Zoom returns duration under {{$json.data.duration}} for meeting details.
Accepted format: Number of minutes only.
Real workplace example: 30 for a customer onboarding call.
If it is empty or wrong: Create uses 60; non-numeric text can produce a bad Zoom request.
Common mistake: Entering 1.5 for 90 minutes instead of 90.`,
    },
    listMeetings: {
      operation: `What this field means: Operation chooses the Zoom meeting action this node runs.
Why it matters: List Meetings reads scheduled meetings for the connected Zoom user.
When to fill it: Choose it when the workflow needs meeting IDs or an upcoming meeting list.
What to enter: Select List Meetings.
Where the value comes from: This is a fixed workflow choice.
How to use it later: Later nodes can inspect {{$json.data.meetings}} and map a meeting id from the list.
Accepted format: listMeetings.
Real workplace example: Find upcoming onboarding calls before updating a CRM report.
If it is empty or wrong: Runtime may create a meeting instead of listing, or reject an unknown operation.
Common mistake: Expecting this operation to include past meetings; runtime requests scheduled meetings only.`,
    },
    getMeeting: {
      operation: `What this field means: Operation chooses the Zoom meeting action this node runs.
Why it matters: Get Meeting reads one existing meeting by ID.
When to fill it: Choose it before reminders, audits, or validations that need the latest Zoom details.
What to enter: Select Get Meeting.
Where the value comes from: This is a fixed workflow choice paired with Meeting ID.
How to use it later: Later nodes can use {{$json.data.topic}}, {{$json.data.join_url}}, and {{$json.data.start_time}}.
Accepted format: getMeeting.
Real workplace example: Read a stored support call before sending a reminder.
If it is empty or wrong: Runtime may use the wrong operation or return unsupported operation.
Common mistake: Choosing Get Meeting without filling Meeting ID.`,
      meetingId: `What this field means: Meeting ID identifies the exact Zoom meeting to read.
Why it matters: Many meetings can share similar names; the ID tells Zoom which single meeting to return.
When to fill it: Required for getMeeting.
What to enter: Map the numeric id from Create Meeting, List Meetings, a CRM record, or a saved workflow field.
Where the value comes from: Usually {{$json.data.id}} after Create Meeting or an item in {{$json.data.meetings}} after List Meetings.
How to use it later: Get Meeting returns fresh meeting details under {{$json.data}}.
Accepted format: Zoom meeting ID digits or text, not the whole join URL.
Real workplace example: {{$json.zoomMeetingId}} from a support case.
If it is empty or wrong: Runtime returns Zoom getMeeting: meetingId is required, or Zoom returns not found or permission denied.
Common mistake: Mapping join_url instead of id.`,
    },
    updateMeeting: {
      operation: `What this field means: Operation chooses the Zoom meeting action this node runs.
Why it matters: Update Meeting changes one existing meeting.
When to fill it: Choose it when a booking is rescheduled, renamed, or lengthened.
What to enter: Select Update Meeting.
Where the value comes from: This is a fixed workflow choice paired with Meeting ID and any fields that should change.
How to use it later: Runtime returns {{$json.data.updated}} and {{$json.data.meetingId}} after Zoom accepts the update.
Accepted format: updateMeeting.
Real workplace example: Move a customer onboarding call after a reschedule request.
If it is empty or wrong: Runtime may create or read instead of updating, or reject an unknown operation.
Common mistake: Filling Meeting ID but leaving all update fields blank, which sends an empty change request.`,
      meetingId: `What this field means: Meeting ID identifies the exact Zoom meeting to update.
Why it matters: Zoom needs the ID before it can change topic, duration, or start time.
When to fill it: Required for updateMeeting.
What to enter: Map the numeric id from Create Meeting, List Meetings, a CRM record, or {{$json.zoomMeetingId}}.
Where the value comes from: It should be saved from an earlier Zoom create/list/get step or stored in the system that requested the update.
How to use it later: Runtime echoes the changed meeting as {{$json.data.meetingId}}.
Accepted format: Zoom meeting ID digits or text.
Real workplace example: {{$json.zoomMeetingId}} from the booking being rescheduled.
If it is empty or wrong: Runtime returns Zoom updateMeeting: meetingId is required, or Zoom returns not found.
Common mistake: Using the attendee join_url instead of the meeting id.`,
      topic: `What this field means: Topic is the replacement title for the meeting.
Why it matters: Fill it only when the existing Zoom meeting title should change.
When to fill it: Optional for updateMeeting.
What to enter: A new title, or map a value such as Rescheduled call with {{$json.companyName}}.
Where the value comes from: Booking updates, CRM deal names, class titles, or support ticket subjects.
How to use it later: A follow-up Get Meeting can confirm the new {{$json.data.topic}}.
Accepted format: Plain text.
Real workplace example: Rescheduled onboarding - {{$json.accountName}}.
If it is empty or wrong: Runtime leaves the existing title unchanged.
Common mistake: Expecting a blank value to clear the title; blank values are not sent.`,
      startTime: `What this field means: Start Time is the replacement scheduled start time.
Why it matters: It changes when the Zoom meeting appears on the host schedule.
When to fill it: Optional for updateMeeting when the meeting has been rescheduled.
What to enter: ISO 8601 timestamp such as 2026-05-01T10:00:00Z or {{$json.newStartsAt}}.
Where the value comes from: Calendar reschedule data, booking forms, or appointment systems.
How to use it later: A follow-up Get Meeting can confirm {{$json.data.start_time}}.
Accepted format: ISO 8601 date and time.
Real workplace example: {{$json.rescheduledStartTime}}.
If it is empty or wrong: Empty leaves the existing start time unchanged; wrong formats may be rejected.
Common mistake: Typing a local phrase instead of a timestamp.`,
      duration: `What this field means: Duration is the replacement meeting length in minutes.
Why it matters: It changes the planned length of the scheduled Zoom meeting.
When to fill it: Optional for updateMeeting when the meeting length should change.
What to enter: A number such as 30, 45, 60, or {{$json.durationMinutes}}.
Where the value comes from: Booking type, event duration, training schedule, or customer request.
How to use it later: A follow-up Get Meeting can confirm {{$json.data.duration}}.
Accepted format: Number of minutes only.
Real workplace example: 45 for an extended implementation review.
If it is empty or wrong: Empty leaves the existing duration unchanged; text can cause a bad request.
Common mistake: Entering "45 minutes" instead of 45.`,
    },
    deleteMeeting: {
      operation: `What this field means: Operation chooses the Zoom meeting action this node runs.
Why it matters: Delete Meeting removes one existing meeting by ID.
When to fill it: Choose it only for real cancellation workflows.
What to enter: Select Delete Meeting.
Where the value comes from: This is a fixed workflow choice paired with Meeting ID.
How to use it later: Runtime returns {{$json.data.deleted}} and {{$json.data.meetingId}} for logs or cancellation notices.
Accepted format: deleteMeeting.
Real workplace example: Cancel a Zoom room when a customer cancels an onboarding session.
If it is empty or wrong: Runtime may run the wrong operation or reject an unknown value.
Common mistake: Deleting before notifying attendees or storing any details needed for the notice.`,
      meetingId: `What this field means: Meeting ID identifies the exact Zoom meeting to delete.
Why it matters: Delete is irreversible from this workflow, so the ID must point to the right meeting.
When to fill it: Required for deleteMeeting.
What to enter: Map the numeric id from Create Meeting, List Meetings, a CRM record, or {{$json.zoomMeetingId}}.
Where the value comes from: A previous Zoom step or the system that stored the scheduled meeting.
How to use it later: Runtime returns {{$json.data.deleted}} and {{$json.data.meetingId}} after Zoom confirms deletion.
Accepted format: Zoom meeting ID digits or text, not the join URL.
Real workplace example: {{$json.cancelledMeetingId}}.
If it is empty or wrong: Runtime returns Zoom deleteMeeting: meetingId is required, or Zoom returns not found.
Common mistake: Using Delete Meeting as a test action on a real production meeting.`,
    },
  },

  email: {
    default: {
      to: `What this field means: To is the recipient address or recipient list for the email.

Why it matters: The SMTP server sends the message to these addresses. Wrong recipients can receive private information, and invalid addresses may be rejected.

When to fill it: Fill it every time. Runtime requires To before it attempts to send.

What to enter: Use one email address, a comma-separated list, or a workflow expression such as {{$json.customerEmail}}.

Where the value comes from: Map it from a form answer, CRM contact, order, database row, sheet row, webhook payload, or support ticket.

How to use it later: Runtime returns {{$json.accepted}} and {{$json.rejected}} so later nodes can log or route the send result.

Accepted format: Valid email address text. Separate multiple addresses with commas when your SMTP provider allows it.

Real workplace example: Send an invoice notification to {{$json.customerEmail}} after an accounting step creates invoice {{$json.invoiceNumber}}.

If it is empty or wrong: Runtime returns _error before sending, or the SMTP server may place invalid addresses in rejected.

Common mistake: Mapping a display name or customer ID instead of the actual email address field.`,
      subject: `What this field means: Subject is the short title shown in the recipient's inbox.

Why it matters: A clear subject helps people recognize the email and helps teams search, filter, and match automated messages.

When to fill it: Fill it every time. Runtime requires Subject before sending.

What to enter: Use short, specific text with useful workflow values such as order ID, ticket ID, invoice number, or report date.

Where the value comes from: Combine fixed wording with values from triggers, forms, orders, tickets, databases, or reports.

How to use it later: Subject is sent to the recipient; the node output focuses on {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}}.

Accepted format: Plain text with optional workflow expressions.

Real workplace example: Invoice {{$json.invoiceNumber}} is ready.

If it is empty or wrong: Runtime returns _error before sending. Vague or sensitive subjects can create support and privacy problems.

Common mistake: Putting the full message body or secret data in Subject instead of Text or HTML.`,
      text: `What this field means: Text is the plain-text email body.

Why it matters: It is readable in every inbox and acts as a reliable fallback when HTML is blocked.

When to fill it: Backend marks Text as required, and runtime needs Text or HTML before sending. Fill Text for operational reliability.

What to enter: Write the message in plain language and map values such as {{$json.firstName}}, {{$json.orderId}}, or {{$json.invoiceUrl}}.

Where the value comes from: Use approved copy plus data from forms, webhooks, CRMs, databases, orders, or API responses.

How to use it later: The body is sent, but not echoed in output unless upstream data still contains it. Track delivery using {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}}.

Accepted format: Plain text with workflow expressions.

Real workplace example: Hi {{$json.firstName}}, your order {{$json.orderId}} has shipped. Track it here: {{$json.trackingUrl}}.

If it is empty or wrong: If both Text and HTML are empty, runtime returns _error. Missing mapped values can send blank content.

Common mistake: Relying only on HTML for important password reset, invoice, alert, or confirmation emails.`,
      html: `What this field means: HTML is the formatted email body.

Why it matters: It lets you add links, paragraphs, emphasis, and simple layout while Text remains the fallback.

When to fill it: Fill it when the email needs clickable links, formatting, or light branding. It is optional.

What to enter: Use simple, valid HTML and map safe workflow values such as {{$json.invoiceUrl}} or {{$json.firstName}}.

Where the value comes from: Use approved email copy or templates from operations, support, finance, or marketing.

How to use it later: HTML is sent to the recipient; output tracking still uses {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}}.

Accepted format: HTML string. Avoid scripts, forms, or complex CSS that email clients block.

Real workplace example: <p>Hi {{$json.firstName}},</p><p>Your invoice <strong>{{$json.invoiceNumber}}</strong> is ready.</p>.

If it is empty or wrong: Empty is fine when Text is filled. Broken HTML can render poorly or show incomplete mapped values.

Common mistake: Putting secrets, unsupported JavaScript, or overly complex layouts in the email body.`,
      from: `What this field means: From is the sender address shown on the email.

Why it matters: SMTP providers usually allow only approved sender addresses. The wrong From can be rejected or flagged as spoofing.

When to fill it: Leave it empty to use the SMTP username or connection default. Fill it only when the provider or company relay allows that address.

What to enter: An approved sender such as billing@company.com, support@company.com, alerts@company.com, or noreply@company.com.

Where the value comes from: Ask your email provider, domain administrator, or IT team which sender addresses are verified.

How to use it later: From is used for sending and is not returned separately. Track the send with {{$json.messageId}}, {{$json.accepted}}, and {{$json.rejected}}.

Accepted format: Valid email address.

Real workplace example: Use billing@company.com for invoices and support@company.com for ticket confirmations.

If it is empty or wrong: Empty defaults to the SMTP username or saved connection default. Unauthorized senders can produce relay or permission errors.

Common mistake: Entering a personal address when the SMTP relay only allows verified company-domain addresses.`,
    },
    send: {
      host: `What this field is: The address of your email (SMTP) server.
Common values:
  Gmail:         smtp.gmail.com
  Outlook/M365:  smtp.office365.com
  Yahoo Mail:    smtp.mail.yahoo.com
  Mailgun:       smtp.mailgun.org
  SendGrid:      smtp.sendgrid.net
Ask your email provider or IT team if you are unsure.`,
      port: `What this field is: The port number your email server uses to accept connections.
Common values:
  587 — TLS encryption (recommended, most common)
  465 — SSL encryption
  25  — unencrypted (avoid if possible)
If unsure, try 587 first.`,
      user: `What this field is: Your email login username — usually your full email address.
Example: alice@company.com`,
      password: `What this field is: Your email account password or app-specific password.
Gmail note: If you use Gmail with 2-factor authentication, you need an App Password. Go to myaccount.google.com → Security → App passwords → generate one.
Keep this private — do not share or publish it.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // DATA & DATABASES
  // ─────────────────────────────────────────────────────────────

  google_sheets_trigger: {
    default: {
      spreadsheetId: `What this field means: Spreadsheet ID is the unique Google Sheets file ID this trigger should poll.
Why it matters: The worker uses it with the saved Google OAuth2 connection to read exactly one spreadsheet. A wrong ID watches the wrong file or fails with a Sheets API error.
When to fill it: Fill it before saving or activating the workflow. Polling registration cannot capture a baseline without it.
What to enter: Copy only the long ID between /d/ and /edit from the Google Sheets URL.
Where the value comes from: Open the target spreadsheet in a browser and copy the ID from the address bar.
How to use it later: Later nodes can log or reuse {{$json.spreadsheetId}}.
Accepted format: A Google spreadsheet ID such as 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms.
Real workplace example: Watch a Support Intake sheet so new urgent rows create helpdesk tickets.
If it is empty or wrong: Activation can fail with A Google Sheets spreadsheet ID is required, or polling can fail with a Google Sheets API error.
Common mistake: Pasting the full share URL, a tab gid, or the file name instead of the ID.`,
      sheetName: `What this field means: Sheet Name is the tab inside the spreadsheet that should be polled.
Why it matters: A workbook can contain several tabs, and only one may represent the business intake table.
When to fill it: Fill it when the watched rows are not on the first/default tab. Leave empty only when the default sheet is correct.
What to enter: Type the tab label exactly as shown at the bottom of Google Sheets.
Where the value comes from: Open the spreadsheet and copy the tab name from the row of sheet tabs.
How to use it later: Later nodes can read {{$json.sheetName}} for logs, branches, and follow-up Google Sheets actions.
Accepted format: Plain tab text such as Sheet1, Leads, or Support Queue.
Real workplace example: Use New Requests when the workbook also has Archive and Metrics tabs.
If it is empty or wrong: Empty reads the default A:ZZ range; a wrong tab name can produce a Google Sheets API error.
Common mistake: Entering the spreadsheet file name instead of the tab name.`,
      hasHeaderRow: `What this field means: Has Header Row tells CtrlChecks whether row 1 contains column names.
Why it matters: When enabled, the trigger builds {{$json.row}} using those headers, so later nodes can read values by name.
When to fill it: Keep it enabled for normal tables with column headings. Turn it off only for lists or logs where row 1 is real data.
What to enter: Checked/true for a header row, unchecked/false for no header row.
Where the value comes from: Look at the first row of the watched tab.
How to use it later: Use {{$json.row.Email}} with headers on, or {{$json.values[0]}} when headers are off.
Accepted format: Boolean checkbox, true or false.
Real workplace example: Enable it for a Leads tab with Name, Email, Priority, and Notes in row 1.
If it is empty or wrong: The default is true; a no-header sheet can make the first record become field names.
Common mistake: Renaming a column after downstream nodes already map that header.`,
      eventTypes: `What this field means: Event Types tells the trigger which row changes may start the workflow.
Why it matters: The polling service can detect rows added after activation and updates to rows already tracked by the baseline.
When to fill it: Leave row_added for intake flows. Add row_updated when edits to existing rows should also start a run.
What to enter: row_added, row_updated, or both as comma-separated text.
Where the value comes from: Choose from the business event: a new record appended to the sheet, or a tracked row being edited.
How to use it later: Route downstream logic with {{$json.eventType}}.
Accepted format: Comma-separated text or an array in workflow JSON; spaces and hyphens are normalized to underscores.
Options and when to choose them: row_added is for rows appended after activation. row_updated is for changes to existing tracked rows.
Real workplace example: row_added, row_updated for a support queue where new requests create tickets and status edits update tickets.
If it is empty or wrong: Empty falls back to row_added; unsupported values are ignored because they never match a runtime event type.
Common mistake: Expecting rows that existed before activation to fire as row_added.`,
      query: `What this field means: Keyword Filter is optional text that must appear in the row before the trigger starts the workflow.
Why it matters: It lets one shared spreadsheet feed multiple workflows without every row triggering every automation.
When to fill it: Fill it when this workflow should only handle rows containing a word such as urgent, refund, enterprise, or escalated.
What to enter: A simple keyword or short phrase.
Where the value comes from: Choose a stable value from a Status, Priority, Region, Type, or Owner column.
How to use it later: Accepted rows still expose {{$json.text}}, {{$json.values}}, and {{$json.row.ColumnName}} for downstream nodes.
Accepted format: Plain text; matching is case-insensitive against all row values joined with spaces.
Real workplace example: urgent for a customer escalation workflow that should ignore routine rows.
If it is empty or wrong: Empty accepts all allowed event types; a typo filters out matching business rows.
Common mistake: Treating this as a formula or expression. It is only a simple row text keyword.`,
    },
  },

  google_sheets: {
    '*': {
      spreadsheetId: `What this field is: The unique file ID of your Google Sheet.
Where to find it: Open your Google Sheet in a browser. Look at the URL in the address bar:
  https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
Copy the long text between /d/ and /edit.
Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
Tip: The ID stays the same even if you rename the file.`,
      sheetName: `What this field is: The name of the tab (sheet) inside your spreadsheet.
Where to find it: Open the spreadsheet — look at the tabs at the bottom. Click the one you want and copy its name exactly.
Example: Sheet1 or Customers or January 2025
Note: The name is case-sensitive. "sheet1" and "Sheet1" are treated as different tabs.`,
      range: `What this field is: The exact cells to read or write — written in A1 notation.
Format: TabName!StartColumn+StartRow:EndColumn+EndRow
Examples:
  Sheet1!A1:D100  →  columns A to D, rows 1 to 100 on the Sheet1 tab
  Customers!B2:E  →  column B to E, all rows starting from row 2 in the Customers tab
  Sheet1!A:D      →  all rows in columns A through D
Tip: Use just A1:D1000 if you only have one sheet tab.`,
    },
    '*': {
      operation: `What this field is: Which Google Sheets action this node performs — read, write, append, or update.
How to fill it: Choose from the dropdown before filling any other field.
Example: read.`,
      outputFormat: `What this field is: How Read shapes the returned data — json, keyvalue, or text. Ignored for write/append/update.
Example: json.`,
      readDirection: `What this field is: Whether Read treats the sheet as row-based or column-based records. Only relevant for Read.
Example: rows (default).`,
      allowWrite: `What this field is: A reminder checkbox with no runtime effect — write/append/update run regardless of its value. It is never read by the execution engine.
Do not rely on it as a safety gate.`,
    },
    write: {
      data: `What this field is: The rows of data to write into the spreadsheet (checked before Values if both are filled).
Format: An array of arrays, an array of row objects, or a single object — all three are accepted.
Example (2 rows):
[
  ["Alice", "alice@example.com", "2025-01-15"],
  ["Bob", "bob@example.com", "2025-01-16"]
]
Tip: Use {{$json.rows}} to write data output from an earlier step like a database query.`,
      values: `What this field is: The rows of data to write, as an array of arrays, array of objects, or a single object. Ignored if Data is also filled.
Example: [["Alice", "alice@example.com", "2025-01-15"]]`,
    },
    append: {
      values: `What this field is: One or more rows to add at the bottom of the sheet. Ignored if Data is also filled.
Format: Array of arrays.
Example: [["Charlie","charlie@example.com","2025-01-17"]]`,
      data: `What this field is: Alternative to Values for the row(s) to append — checked first when both are filled.
Format: An object, an array of objects, or an array of arrays.
Example: {{$json}}`,
    },
    update: {
      values: `What this field is: The new cell value(s) for the Range above, as an array of arrays. Ignored if Data is also filled.
Example: [["Fulfilled"]]`,
      data: `What this field is: Alternative to Values for the new cell value(s) — checked first when both are filled.
Example: {"status": "Fulfilled"}`,
    },
  },

  gmail_trigger: {
    default: {
      pubsubTopic: `What this field means: Pub/Sub Topic is the full Google Cloud Pub/Sub topic path Gmail publishes watch notifications to.
Why it matters: Gmail sends mailbox change notifications to Pub/Sub first; the push subscription then calls the CtrlChecks webhook.
When to fill it: Always fill it before activating this trigger.
What to enter: The full topic name in the format projects/PROJECT_ID/topics/TOPIC_NAME.
Where the value comes from: Google Cloud Console > Pub/Sub > Topics.
Setup required: Grant Pub/Sub Publisher on the topic to gmail-api-push@system.gserviceaccount.com and create a push subscription pointing at the webhook URL shown for this node.
How to use it later: This topic is setup data, not output data. The workflow output contains message fields such as {{$json.subject}} and {{$json.threadId}}.
Accepted format: projects/acme-support/topics/gmail-inbox-notifications.
Real workplace example: Watch a shared support inbox topic so new invoice emails enter AI triage.
If it is empty or wrong: Watch registration fails or Gmail cannot publish notifications.
Common mistake: Pasting a subscription name, topic display name, or webhook URL instead of the full topic path.`,
      eventTypes: `What this field means: Event Types decides which Gmail history events may start this workflow.
Why it matters: New messages, deleted messages, and label changes often need different automations.
When to fill it: Use message_added for new-email workflows, label_added for label-driven triage, label_removed for cleanup, or message_deleted for audit alerts.
What to enter: message_added, label_added, label_removed, message_deleted, or several separated by commas.
Where the value comes from: Choose the Gmail mailbox event your workflow should react to after a Pub/Sub notification arrives.
How to use it later: Route downstream logic with {{$json.eventType}}.
Accepted format: Comma/newline-separated text or an array; spaces and hyphens normalize to underscores.
Options: message_added means a message was added. label_added means Gmail added a label. label_removed means Gmail removed a label. message_deleted means Gmail reported a deleted message.
Real workplace example: message_added, label_added for urgent support emails.
If it is empty or wrong: Empty defaults to message_added; unsupported values filter out all fetched events.
Common mistake: Expecting the Pub/Sub notification to contain full message details. CtrlChecks still reads Gmail history after the push.`,
      labelIds: `What this field means: Label IDs is an optional allowlist of Gmail labels the event must include.
Why it matters: It keeps one inbox watch focused on the labels that matter to this workflow.
When to fill it: Fill it for INBOX-only, IMPORTANT-only, finance, support, or escalation workflows.
What to enter: Built-in label IDs such as INBOX or IMPORTANT, or custom Gmail API label IDs.
Where the value comes from: Built-in Gmail labels use uppercase IDs; custom IDs come from the Gmail labels API or admin setup.
How to use it later: Later nodes can inspect {{$json.labelIds}}.
Accepted format: Comma-separated label IDs.
Real workplace example: INBOX, IMPORTANT for high-priority support triage.
If it is empty or wrong: Empty accepts all labels; a wrong ID filters out otherwise matching emails.
Common mistake: Using a visible custom label name when Gmail API uses a different custom label ID.`,
      query: `What this field means: Keyword Filter is optional text that must appear in the message subject, sender, or snippet.
Why it matters: It prevents unrelated inbox notifications from starting focused workflows.
When to fill it: Fill it for invoices, refunds, cancellations, quotes, resumes, incidents, or escalations.
What to enter: A simple word or short phrase.
Where the value comes from: Use wording your team sees in real email subjects, sender addresses, or snippets.
How to use it later: Matching events expose {{$json.subject}}, {{$json.from}}, and {{$json.snippet}}.
Accepted format: Plain text; matching is case-insensitive and is not Gmail search syntax.
Real workplace example: invoice for finance approval messages.
If it is empty or wrong: Empty accepts every event matching Event Types and Label IDs; a typo filters out matching messages.
Common mistake: Entering Gmail search operators such as from:vendor has:attachment. This field only does simple text matching.`,
      validateAuth: `What this field means: Validate Push Auth decides whether incoming Pub/Sub push requests must pass Google OIDC or shared-secret validation.
Why it matters: The webhook URL is public, so production workflows should reject unsigned requests.
When to fill it: Keep enabled for production. Disable only for temporary local testing.
What to enter: true/enabled for normal use; false/disabled only when you intentionally bypass validation in a controlled test.
Where the value comes from: Security policy for this workflow.
How to use it later: This field does not appear in {{$json}}. It controls whether a workflow run can start.
Accepted format: Boolean checkbox.
Real workplace example: Enabled for a support inbox flow that can create tickets or send replies.
If it is empty or wrong: The default is enabled; disabling it can let anyone with the URL simulate pushes.
Common mistake: Turning this off instead of fixing Pub/Sub OIDC audience or Validation Secret setup.`,
      audience: `What this field means: OIDC Audience is the expected aud value in the Google-signed Pub/Sub push bearer token.
Why it matters: It prevents valid Google tokens for other endpoints from being accepted here.
When to fill it: Leave empty when the Pub/Sub subscription audience is the webhook URL. Fill it only for a custom audience.
What to enter: The exact audience string configured on the Pub/Sub push subscription.
Where the value comes from: Google Cloud Console > Pub/Sub subscription > push authentication settings.
How to use it later: This is auth setup, not workflow data; do not expect {{$json.audience}}.
Accepted format: Usually the full webhook URL or another HTTPS audience string.
Real workplace example: https://app.ctrlchecks.com/api/gmail/webhook/workflow_123/gmail-trigger-1.
If it is empty or wrong: Empty defaults to the webhook URL; a wrong value causes Invalid Gmail Pub/Sub push request.
Common mistake: Setting this to the Pub/Sub topic name or project ID.`,
      validationSecret: `What this field means: Validation Secret is an optional shared token for simulations or non-OIDC push tests.
Why it matters: It is safer than disabling Validate Push Auth for staging/manual tests.
When to fill it: Use it only when Pub/Sub OIDC is unavailable or when QA posts sample Pub/Sub envelopes.
What to enter: A long random secret value.
Where the value comes from: Generate it in a password manager or deployment secret system; the runtime can also read GMAIL_PUBSUB_TOKEN.
How to use it later: This secret is never output to {{$json}} and should not be mapped into downstream nodes.
Accepted format: Secret text passed as token query parameter or x-goog-pubsub-token header.
Real workplace example: staging-gmail-push-token-rotate-me for QA simulations.
If it is empty or wrong: Empty relies on OIDC validation; a wrong token is rejected.
Common mistake: Pasting a Google OAuth access token here. OAuth tokens belong in Connections/credential vault.`,
    },
  },

  google_drive_trigger: {
    default: {
      folderId: `What this field means: Folder ID is an optional Google Drive folder filter for this trigger.
Why it matters: The Drive change feed can include files across the connected account's visible Drive; this filter keeps the workflow focused on one business folder.
When to fill it: Fill it for a shared upload, invoice, contract, customer, or team folder. Leave empty to consider broader Drive changes.
What to enter: Copy the folder ID from the Drive folder URL after /folders/.
Where the value comes from: Open the folder in Google Drive and copy the long ID from the browser address bar.
How to use it later: Later nodes can inspect {{$json.parents}} to see which parent folder IDs Drive returned.
Accepted format: A plain Google Drive folder ID such as 1a2b3c4d5e6f7g8h9i0j.
Real workplace example: Watch a Vendor Invoices folder so new PDFs enter finance approval.
If it is empty or wrong: Empty watches broad Drive changes; a wrong ID filters out files because their parents do not match.
Common mistake: Pasting the folder name, whole URL, or a file ID instead of the folder ID.`,
      eventTypes: `What this field means: Event Types decides which Drive file changes may start the workflow.
Why it matters: Uploads, edits, trashing, and removals can require different automation paths.
When to fill it: Use file_changed for document-processing workflows, file_deleted for audit alerts, or both for all meaningful Drive changes.
What to enter: file_changed, file_deleted, or both separated by commas.
Where the value comes from: Choose the Drive change your workflow should react to.
How to use it later: Route downstream logic with {{$json.eventType}}.
Accepted format: Comma-separated text or an array; spaces and hyphens normalize to underscores.
Options and when to choose them: file_changed covers created or updated files. file_deleted covers removed or trashed files.
Real workplace example: file_changed for contract review, file_deleted for a shared-folder removal alert.
If it is empty or wrong: Empty accepts both default event types; unsupported values filter out all changes.
Common mistake: Assuming file_changed means only brand-new uploads; Drive can report edits and metadata changes too.`,
      query: `What this field means: Keyword Filter is optional text that must appear in the Drive file name.
Why it matters: It lets a busy folder feed focused workflows without processing every changed file.
When to fill it: Fill it for file families such as invoice, contract, resume, statement, or QBR.
What to enter: A simple keyword or short phrase.
Where the value comes from: Choose naming text your team consistently uses in Drive files.
How to use it later: Matching events expose {{$json.name}}, {{$json.fileId}}, {{$json.mimeType}}, {{$json.webViewLink}}, and {{$json.parents}}.
Accepted format: Plain text; matching is case-insensitive against the file name only.
Real workplace example: invoice for files named Vendor Invoice - July.pdf in the finance folder.
If it is empty or wrong: Empty accepts all configured event types; a typo filters out the file change.
Common mistake: Expecting it to search inside document contents. It only checks the file name.`,
    },
  },

  google_calendar_trigger: {
    default: {
      calendarId: `What this field means: Calendar ID is the Google Calendar this trigger should watch.
Why it matters: The connected Google account may access many calendars, and the watch channel is registered for one calendar at a time.
When to fill it: Leave primary for the connected account's main calendar. Fill it for a shared team, room, project, or customer calendar.
What to enter: Use primary or the exact Calendar ID from Google Calendar settings.
Where the value comes from: Open Google Calendar settings, choose the calendar, and copy Calendar ID from Integrate calendar.
How to use it later: Later nodes can read {{$json.calendarId}} or pass it to a Google Calendar action node.
Accepted format: primary, an email-like calendar ID, or an ID ending in @group.calendar.google.com.
Real workplace example: support-oncall@group.calendar.google.com for an on-call handoff workflow.
If it is empty or wrong: Empty defaults to primary; a wrong value may watch the wrong calendar or fail with a Google Calendar API error.
Common mistake: Using the visible calendar name or event ID instead of the Calendar ID.`,
      eventTypes: `What this field means: Event Types decides which calendar changes may start the workflow.
Why it matters: Created/updated events and cancelled events often need different automations.
When to fill it: Keep both values for all changes, use event_changed for meeting-prep flows, or event_cancelled for cancellation follow-up.
What to enter: event_changed, event_cancelled, or both separated by commas.
Where the value comes from: Choose the business event that matters after Google notifies CtrlChecks.
How to use it later: Route logic with {{$json.eventType}}.
Accepted format: Comma-separated text or an array; spaces and hyphens are normalized to underscores.
Options and when to choose them: event_changed means a Google event was created or updated. event_cancelled means Google marked the event as cancelled.
Real workplace example: event_changed for meeting briefs and event_cancelled for rescheduling messages.
If it is empty or wrong: Empty accepts both runtime defaults; unsupported values filter out events.
Common mistake: Expecting this to run at meeting start time. It runs when the calendar record changes.`,
      query: `What this field means: Keyword Filter is optional text that must appear in the event title or description.
Why it matters: It lets one calendar drive focused workflows without every event starting every automation.
When to fill it: Fill it for workflows that only handle demos, interviews, renewals, incidents, or escalations.
What to enter: A simple word or phrase such as demo, interview, renewal, or incident.
Where the value comes from: Choose wording your team consistently puts in event titles or descriptions.
How to use it later: Matching events expose {{$json.subject}}, {{$json.text}}, {{$json.organizer}}, {{$json.start}}, and {{$json.attendees}}.
Accepted format: Plain text; matching is case-insensitive against subject plus description.
Real workplace example: renewal for a customer success workflow that prepares account notes before renewal meetings.
If it is empty or wrong: Empty accepts all configured event types; a typo filters out matching events.
Common mistake: Treating this as a Google Calendar search query. It is only a simple keyword filter after sync.`,
    },
  },

  google_calendar: {
    '*': {
      operation: `What this field is: Which Google Calendar action this node performs — list, create, update, or delete in this panel (runtime also supports get, quickAdd, and move via workflow JSON).
Example: list.`,
      calendarId: `What this field is: Which Google Calendar to use.
How to fill it: Type "primary" for the connected account's own calendar, or a specific calendar ID/email from Google Calendar → Settings → Integrate calendar.
Example: primary`,
      eventId: `What this field is: The specific event to update or delete.
Where to find it: Copy {{$json.id}} from a previous List, Create, or Update step's output.
Example: {{$json.id}}`,
      summary: `What this field is: The event title shown in Google Calendar.
Example: Interview: {{$json.candidateName}}`,
      startTime: `What this field is: The event's start time as a single ISO 8601 timestamp — runtime converts this into the API's start object automatically.
Example: 2025-01-15T14:00:00Z`,
      endTime: `What this field is: The event's end time as a single ISO 8601 timestamp — runtime converts this into the API's end object automatically.
Example: 2025-01-15T15:00:00Z`,
      description: `What this field is: Longer event details shown when the event is opened — runtime merges this into Event Data automatically.
Example: Quarterly planning review.`,
    },
  },

  postgresql: {
    query: {
      query: `What this field is: The SQL query to run against your database.
Example: SELECT * FROM customers WHERE status = 'active' AND created_at > '2025-01-01'
Use $1, $2 for variable values (safer): SELECT * FROM orders WHERE user_id = $1 AND status = $2
Then put the actual values in the "Parameters" field below.
Warning: Never put passwords or user-entered values directly in the query text — always use parameters.`,
      parameters: `What this field is: The values for $1, $2 etc. placeholders in your SQL query.
Format: JSON array — one value per placeholder in order.
Example: ["active","2025-01-01"] for a query with WHERE status = $1 AND date > $2
Why use it: Prevents SQL injection attacks — much safer than building the query string yourself.`,
    },
    insert: {
      table: `What this field is: The name of the database table to insert a new record into.
Example: customers or orders or public.user_events (use schema.table if not in the default schema)`,
      data: `What this field is: The new record as a JSON object. Keys must exactly match your database column names.
Example: {"name":"Alice Kumar","email":"alice@example.com","status":"active","plan":"pro"}
Tip: Use {{$json}} or {{$json.formData}} to pass data from an earlier node.`,
    },
    update: {
      table: `What this field is: The database table where you want to update records.
Example: customers`,
      data: `What this field is: The new values to set, as a JSON object.
Example: {"status":"premium","updated_at":"2025-01-15"}`,
      where: `What this field is: The condition that identifies which rows to update.
Example: {"id": 42} updates the single row where id = 42.
Example: {"email": "alice@example.com"} updates the row with that email.
Warning: Without a specific where condition, ALL rows in the table could be updated.`,
    },
    delete: {
      table: `What this field is: The database table to delete from.
Example: old_sessions`,
      where: `What this field is: The condition that identifies which rows to delete.
Example: {"id": 42} deletes only the row where id = 42.
Warning: Without a specific where condition, ALL rows in the table could be deleted.`,
    },
  },

  mysql: {
    query: {
      query: `What this field is: The SQL query to run.
Example: SELECT * FROM customers WHERE status = 'active'
Use ? for variable values: SELECT * FROM orders WHERE user_id = ? AND status = ?
Then put values in the Parameters field.`,
      parameters: `What this field is: Values for ? placeholders in your SQL query. Format: JSON array.
Example: [42,"active"]`,
    },
    insert: {
      table: `What this field is: The MySQL table name to insert into.
Example: users or orders`,
      data: `What this field is: The new record as a JSON object. Keys must match column names.
Example: {"name":"Alice","email":"alice@example.com","created_at":"2025-01-15"}`,
    },
  },

  mongodb: {
    '*': {
      collection: `What this field is: The MongoDB collection to work with — like a table in a regular database.
Example: users or orders or products or event_logs
Tip: Collection names are case-sensitive.`,
    },
    find: {
      filter: `What this field is: The search filter to find specific documents.
Format: MongoDB query JSON.
Examples:
  {} — return all documents (careful with large collections)
  {"status":"active"} — find all active records
  {"age":{"$gte":18}} — find records where age is 18 or older
  {"email":"alice@example.com"} — find a specific person
  {"country":"US","plan":"pro"} — find US pro users (AND condition)`,
    },
    insertOne: {
      document: `What this field is: The document (record) to add to the collection.
Format: JSON object — include any fields you want to store.
Example: {"name":"Alice Kumar","email":"alice@example.com","role":"customer","createdAt":"2025-01-15","plan":"free"}`,
    },
    updateOne: {
      filter: `What this field is: The condition to find the document to update.
Example: {"_id":"64abc123"} or {"email":"alice@example.com"}`,
      update: `What this field is: The changes to apply to the matched document.
Example: {"$set":{"plan":"pro","updatedAt":"2025-01-15"}} — updates the plan and updatedAt fields.`,
    },
  },

  redis: {
    set: {
      key: `What this field is: The name you are giving to this stored value — like a label on a jar.
Naming tip: Use colons to organize keys by category.
Examples:
  user:1234:session       →  session data for user 1234
  cart:abc123:items       →  shopping cart items
  rate_limit:192.168.1.1  →  rate limit counter for an IP
Example: user:{{$json.userId}}:lastLogin`,
      value: `What this field is: The data to store in Redis.
Can be: plain text (active), a number (42), or JSON ({"cartItems":3,"total":99.99}).
Example: {"theme":"dark","language":"en","notifications":true}
Tip: Use {{$json.userPreferences}} to store data from an earlier step.`,
      ttl: `What this field is: How many seconds until this value is automatically deleted.
Examples:
  300   →  5 minutes
  3600  →  1 hour
  86400 →  24 hours
Leave blank to keep the value forever (until manually deleted or the server restarts).`,
    },
    get: {
      key: `What this field is: The exact name of the stored value to retrieve.
Must match the key used when the value was stored — exactly, including capitalization.
Example: user:1234:session
Tip: Use user:{{$json.userId}}:session to look up the key for the current user.`,
    },
  },

  aws_s3: {
    upload: {
      bucket: `What this field is: The name of your AWS S3 storage bucket — like a top-level folder in the cloud.
Where to find it: Log in to AWS Console (aws.amazon.com) → S3 → Buckets. Copy the bucket name.
Example: my-company-uploads or acme-customer-files-prod
Note: Bucket names are globally unique and contain only lowercase letters, numbers, and hyphens.`,
      key: `What this field is: The file path and name within the bucket — like a folder path + filename.
Example: uploads/2025/01/profile-photo.jpg or reports/monthly/january-2025.pdf
Tip: Use {{$json.fileName}} or {{$json.userId}} to build the path dynamically.
Example: user-uploads/{{$json.userId}}/{{$json.fileName}}`,
      body: `What this field is: The file content to upload.
For text/JSON: just the text or JSON string.
For binary files (images, PDFs): connect a Read Binary File node before this one and use {{$json.data}}.`,
    },
    get: {
      bucket: `What this field is: The S3 bucket where the file is stored.
Example: my-company-uploads`,
      key: `What this field is: The exact path and filename of the file to download.
Must exactly match the key used when uploading.
Example: reports/2025-01/summary.pdf`,
    },
  },

  airtable: {
    '*': {
      baseId: `What this field is: The unique ID of your Airtable Base (your Airtable workspace/database).
Where to find it: Open your base in Airtable → click the Help (?) menu → API documentation. The Base ID is shown at the top of the page and in the URL. It always starts with "app".
Example: appXXXXXXXXXXXXXX`,
      tableId: `What this field is: The name or ID of the specific table within your Airtable base.
How to find it: Open your base — the tab names at the top are your table names.
Example: Contacts or Orders or Products
Note: You can use the display name (e.g. Contacts) or the table ID (tblXXXXXX).`,
    },
    list: {
      filterByFormula: `What this field is: An Airtable formula to filter which records are returned — like a search condition.
Examples:
  {Status}="Active"                        →  only active records
  AND({Country}="US",{Revenue}>1000)       →  US records with revenue over 1000
  NOT({Email}="")                          →  records that have an email address
Leave blank to return all records.`,
    },
    create: {
      fields: `What this field is: The data for the new record, as a JSON object.
Keys must exactly match your Airtable column names.
Example: {"Name":"Alice Kumar","Email":"alice@example.com","Status":"New Lead","Company":"Acme Corp","Phone":"+14155552671"}`,
    },
    update: {
      fields: `What this field is: The fields to update on the existing record.
Example: {"Status":"Qualified","Notes":"Followed up on 2025-01-15"}`,
      recordId: `What this field is: The unique ID of the Airtable record to update.
Format: Starts with "rec" followed by letters and numbers. Example: recABCDEFGHIJ1234
Where to find it: Run an Airtable List or Get operation first — each record in the output has an "id" field.
Tip: Use {{$json.id}} from the previous step.`,
    },
  },

  notion: {
    '*': {
      databaseId: `What this field is: The unique ID of your Notion database.
Where to find it: Open the database in Notion → click Share at the top → Copy link. The ID is the 32-character string in the URL before the ?.
Example URL: notion.so/myworkspace/1234abcd5678ef90abcd1234ef567890?v=...
The ID is: 1234abcd5678ef90abcd1234ef567890`,
    },
    create: {
      properties: `What this field is: The values for each property (column) in your Notion database.
Format: JSON object — Notion uses a specific format per property type.
Title property example: {"Name":{"title":[{"text":{"content":"Meeting Notes"}}]}}
Select property: {"Status":{"select":{"name":"In Progress"}}}
Date property: {"Due Date":{"date":{"start":"2025-01-15"}}}
Number property: {"Revenue":{"number":50000}}
Full example: {"Name":{"title":[{"text":{"content":"New Task"}}]},"Status":{"select":{"name":"Todo"}},"Due Date":{"date":{"start":"2025-06-01"}}}`,
    },
  },

  firebase: {
    '*': {
      collection: `What this field is: The Firestore collection name — like a folder of related documents.
Example: users or orders or messages or products`,
      documentId: `What this field is: The unique ID of a specific document in the collection.
Where to find it: Firebase Console → Firestore Database → click your collection → click a document — the ID is shown at the top.
Example: abc123xyz or user_12345 or order_2025_001`,
    },
    get: {
      documentId: `What this field is: The ID of the Firestore document to fetch.
Example: user_12345
Tip: Use {{$json.userId}} from an earlier step.`,
    },
    create: {
      data: `What this field is: The data to store in the new Firestore document.
Format: JSON object.
Example: {"name":"Alice Kumar","email":"alice@example.com","plan":"pro","createdAt":"2025-01-15"}`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // CRM & BUSINESS
  // ─────────────────────────────────────────────────────────────

  hubspot: {
    '*': {
      resource: `What this field is: The type of HubSpot record to work with.
Options:
  contact  →  for people (customers, leads, contacts)
  company  →  for businesses and organizations
  deal     →  for sales opportunities and pipeline stages
  ticket   →  for support cases
Example: Choose "contact" to create or update a person in HubSpot.`,
      objectId: `What this field is: The HubSpot record ID — a unique number for each record.
Where to find it: Open the record in HubSpot — the ID is in the browser URL after /contact/ or /deal/ or /company/.
Example: app.hubspot.com/contacts/[portalId]/contact/12345678 → ID is 12345678
Tip: Use {{$json.hs_object_id}} from a previous HubSpot search step.`,
    },
    create: {
      properties: `What this field is: The record data to create in HubSpot. Use HubSpot internal property names (NOT the display labels you see in the UI).
Where to find internal names: HubSpot → Settings (gear icon) → Properties → select the object type → click any property → see "Internal name".
Contact example: {"email":"alice@example.com","firstname":"Alice","lastname":"Kumar","phone":"+14155552671","company":"Acme Corp","jobtitle":"Marketing Manager","lifecyclestage":"lead"}
Deal example: {"dealname":"Enterprise License - Acme Corp","amount":"50000","pipeline":"default","dealstage":"appointmentscheduled","closedate":"2025-06-30"}
Company example: {"name":"Acme Corp","domain":"acmecorp.com","industry":"COMPUTER_SOFTWARE","city":"San Francisco","country":"United States"}
Common contact fields: email, firstname, lastname, phone, company, jobtitle, website, lifecyclestage
Common deal stages: appointmentscheduled, qualifiedtobuy, presentationscheduled, contractsent, closedwon, closedlost`,
    },
  },

  salesforce: {
    '*': {
      objectType: `What this field is: The type of Salesforce record to create or update.
Standard object types: Contact, Lead, Account, Opportunity, Case, Task, Event, Campaign.
Custom objects end with __c. Example: Support_Ticket__c or Product_Review__c.
Example: Contact`,
      recordId: `What this field is: The Salesforce record ID — a 15 or 18 character identifier.
Where to find it: Open the record in Salesforce — the ID is in the browser URL after the object type.
Example: 0035g00000ABCDEFAA
Tip: Use {{$json.Id}} from a previous Salesforce query step.`,
    },
    create: {
      data: `What this field is: The record data as a JSON object. Use Salesforce API field names (not the UI labels).
Contact example: {"FirstName":"Alice","LastName":"Kumar","Email":"alice@example.com","Phone":"+14155552671","Title":"Marketing Manager","AccountId":"0015g00000XXXXXX"}
Lead example: {"FirstName":"Bob","LastName":"Smith","Company":"Acme Corp","Email":"bob@acme.com","Status":"New","LeadSource":"Web"}
Opportunity example: {"Name":"Enterprise License","StageName":"Prospecting","CloseDate":"2025-06-30","Amount":50000,"AccountId":"0015g00000XXXXXX"}`,
    },
  },

  stripe: {
    charge: {
      amount: `What this field is: The payment amount in the SMALLEST unit of the currency.
For USD (cents): 2000 means $20.00 (multiply dollars by 100)
For EUR (cents): 1500 means €15.00
For JPY (no decimal): 2000 means ¥2000 (no multiplication needed)
For GBP (pence): 4999 means £49.99
Example: To charge $49.99 USD, enter 4999. To charge $100.00, enter 10000.`,
      currency: `What this field is: The 3-letter ISO currency code for the payment.
Must be lowercase.
Examples: usd (US Dollar), eur (Euro), gbp (British Pound), inr (Indian Rupee), cad (Canadian Dollar), aud (Australian Dollar), jpy (Japanese Yen), sgd (Singapore Dollar).
Must match a currency supported by your Stripe account.`,
    },
    createCustomer: {
      email: `What this field is: The customer's email address — Stripe uses this to identify customers and send receipts.
Example: alice@example.com
Tip: Use {{$json.email}} from a form submission or signup step.`,
      name: `What this field is: The customer's full name as it appears in your Stripe dashboard.
Example: Alice Kumar or Acme Corp (for business accounts)`,
    },
    '*': {
      customerId: `What this field is: The Stripe customer ID — starts with cus_.
Where to find it: Stripe Dashboard → Customers → click a customer — the ID is shown at the top.
Example: cus_XXXXXXXXXXXXXXXXXX
Tip: Use {{$json.customerId}} from a Create Customer step.`,
    },
  },

  shopify: {
    '*': {
      shopDomain: `What this field is: Your Shopify store's subdomain — just the part before .myshopify.com.
Example: If your store is at mystore.myshopify.com, enter: mystore
Do NOT include https:// or .myshopify.com — just the store name.`,
    },
    create: {
      lineItems: `What this field is: The list of products being ordered.
Format: JSON array. Each item needs a variant ID and a quantity.
Where to find variant IDs: Shopify Admin → Products → click a product → click a variant — the ID is in the URL (e.g. /variants/123456789).
Example: [{"variantId":"gid://shopify/ProductVariant/123456789","quantity":2},{"variantId":"gid://shopify/ProductVariant/987654321","quantity":1}]`,
    },
    get: {
      orderId: `What this field is: The Shopify order number.
Where to find it: Shopify Admin → Orders — the # column shows order IDs.
Example: 1234 or gid://shopify/Order/1234`,
    },
  },

  jira: {
    create_issue: {
      projectKey: `What this field is: Your Jira project's short code — 2 to 10 capital letters.
Where to find it: In Jira, go to your project — the key is shown in brackets next to the project name, or in the URL.
Example: If the project URL is jira.yourcompany.com/projects/PROJ/..., the key is PROJ.
Other examples: DEV, MOBILE, BACKEND, SUPPORT`,
      issueType: `What this field is: The type of Jira issue.
Common values: Bug, Story, Task, Epic, Sub-task.
Must exactly match the issue types configured in your Jira project (go to Project Settings → Issue Types to see the full list).
Example: Bug`,
      summary: `What this field is: The one-line title of the issue — shown in all Jira list views.
Keep it concise and descriptive.
Example: Login button not responding on Safari iOS 17 or Add CSV export to the Reports page`,
      description: `What this field is: Full details about the issue.
Example: Steps to reproduce: 1) Open Safari on iOS 17, 2) Go to login page, 3) Tap Login button — nothing happens. Expected: Should log in. Actual: No response.`,
      priority: `What this field is: The urgency level of the issue.
Common values: Highest, High, Medium, Low, Lowest.
Example: High`,
    },
    '*': {
      issueKey: `What this field is: The unique Jira issue identifier — project key + number.
Format: PROJECTKEY-NUMBER
Example: DEV-456 or PROJ-1234 or MOBILE-89
Where to find it: Open the issue in Jira — the key is shown at the top left of the issue page.`,
    },
  },

  zendesk: {
    create_ticket: {
      subject: `What this field is: The ticket title — one short sentence describing the problem.
Example: Login not working after password reset or Invoice #1234 shows wrong amount`,
      description: `What this field is: Full details of the support issue.
Example: User reports they cannot log in using the mobile app after resetting their password on 2025-01-10. Error shown: "Invalid credentials". Tested on iOS 17.2 with the latest app version (v4.2.1).`,
      priority: `What this field is: How urgent this ticket is.
Options: low (minor inconvenience), normal (standard issue, the default), high (significant customer impact), urgent (business-critical, possible outage).
Example: high`,
      requesterEmail: `What this field is: The email address of the person who submitted the support request.
Example: customer@company.com
Tip: Use {{$json.email}} from a form submission.`,
    },
  },

  freshdesk: {
    create: {
      email: `What this field is: The customer's email address — used to identify who submitted the ticket.
Example: customer@company.com
Tip: Use {{$json.email}} from a form submission node.`,
      subject: `What this field is: Short summary of the support issue.
Example: Cannot access dashboard after password reset`,
      description: `What this field is: Full description of the problem.
Example: I reset my password on Jan 15 and now I get "Invalid login" every time I try to sign in. I have tried 3 different browsers.`,
      priority: `What this field is: Issue urgency as a number.
Values: 1 = Low, 2 = Medium, 3 = High, 4 = Urgent.
Example: 3 for a high-priority issue.`,
      status: `What this field is: The starting status of the ticket.
Values: 2 = Open (most common for new tickets), 3 = Pending, 4 = Resolved, 5 = Closed.
Example: 2`,
    },
  },

  hubspot_crm: {
    '*': {
      properties: `What this field is: The record fields as a JSON object using HubSpot internal property names.
Example contact: {"email":"alice@example.com","firstname":"Alice","lastname":"Kumar"}
Example deal: {"dealname":"Q1 Renewal","amount":"10000","dealstage":"contractsent"}`,
    },
  },

  pipedrive: {
    '*': {
      dealId: `What this field is: The Pipedrive deal ID — a number shown in the deal URL.
Where to find it: Open the deal in Pipedrive — the number after /deal/ in the URL is the ID.
Example: If URL is app.pipedrive.com/deal/123, the ID is 123.`,
      personId: `What this field is: The Pipedrive contact/person ID.
Where to find it: Open the contact in Pipedrive — the ID is in the URL.`,
    },
    create_deal: {
      title: `What this field is: The deal name shown in your Pipedrive pipeline.
Example: Enterprise License - Acme Corp`,
      value: `What this field is: The deal monetary value.
Example: 25000 for $25,000.`,
      currency: `What this field is: 3-letter currency code.
Example: USD or EUR or GBP.`,
    },
  },

  zoho_crm: {
    create: {
      data: `What this field is: The record data as a JSON object using Zoho CRM field names.
Contact example: {"First_Name":"Alice","Last_Name":"Kumar","Email":"alice@example.com","Phone":"+14155552671","Lead_Source":"Web Site"}
Lead example: {"First_Name":"Bob","Last_Name":"Smith","Company":"Acme Corp","Email":"bob@acme.com","Lead_Status":"New"}`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // AI NODES
  // ─────────────────────────────────────────────────────────────

  openai_gpt: {
    '*': {
      model: `What this field is: Which OpenAI model version to use. Different models have different capabilities and costs.
Options:
  gpt-4o        →  best quality, understands text and images, recommended for complex tasks
  gpt-4o-mini   →  fast and affordable, good for most everyday tasks
  gpt-4-turbo   →  older powerful model
  gpt-3.5-turbo →  fastest and cheapest, less capable
Recommended: gpt-4o for complex tasks, gpt-4o-mini for simple or high-volume tasks.`,
      maxTokens: `What this field is: The maximum length of the AI's response.
1 token ≈ 4 characters ≈ 0.75 words.
Examples: 100 = very short answer, 500 = a paragraph, 1000 = about 750 words, 4000 = a long document.
Leave blank to let the model use its default maximum.`,
      temperature: `What this field is: How creative or varied the AI's responses are.
Scale: 0.0 to 2.0 (most models work best between 0 and 1).
  0.0 – 0.2: Very consistent and predictable — same question gives nearly the same answer every time. Use for data extraction, classification, factual Q&A.
  0.5 – 0.7: Balanced — good for summarization, rewriting, customer support.
  0.8 – 1.0: More creative and varied — use for brainstorming, creative writing, generating ideas.
Example: 0.3 for factual tasks, 0.8 for creative writing.`,
      prompt: `What this field is: The instruction or question you want the AI to respond to.
How to write a good prompt: Be specific. Describe the task, the format you want, and any constraints.
Example: Summarize the following customer feedback in exactly 3 bullet points, each under 20 words: {{$json.feedbackText}}
Tip: Use {{$json.text}} or {{$json.content}} to pass text from an earlier step to the AI.`,
    },
    chat: {
      systemPrompt: `What this field is: Background instructions that define how the AI should behave throughout the conversation — its "personality" and rules.
This is set once and applies to all messages in the conversation.
Example: You are a helpful customer support agent for Acme Corp. Always be polite and concise. If you cannot answer a question, say "Let me check and get back to you." Never share pricing unless the user asks directly.
Leave blank to use the default ChatGPT behavior.`,
    },
  },

  anthropic_claude: {
    '*': {
      prompt: `What this field is: The message or task you want Claude AI to work on.
How to write it: Be clear and specific. Tell Claude exactly what you need and in what format.
Example: Review this email draft and suggest 3 improvements for clarity and professional tone. Return your suggestions as a numbered list: {{$json.emailDraft}}
Tip: Use {{$json.content}} to send text from an earlier step (like a database record or form input) to Claude.`,
      model: `What this field is: Which Claude model to use.
Options:
  claude-opus-4-7    →  most powerful, best for complex analysis and reasoning
  claude-sonnet-4-6  →  balanced quality and speed — recommended for most tasks
  claude-haiku-4-5   →  fastest and most affordable — good for simple tasks or high volume
Recommended: claude-sonnet-4-6 for most use cases.`,
      maxTokens: `What this field is: Maximum length of Claude's response.
1000 tokens ≈ 750 words.
Examples: 500 = short summary, 1000 = medium analysis, 4000 = detailed document.`,
    },
  },

  google_gemini: {
    '*': {
      prompt: `What this field is: The instruction or question for Google Gemini AI.
Example: Extract all names, email addresses, and phone numbers from the following text and return them as a JSON array: {{$json.rawText}}`,
      model: `What this field is: Which Gemini model to use.
Options:
  gemini-3.5-flash  →  fast and affordable, good for most tasks
  gemini-1.5-pro    →  more capable, better at complex reasoning
Recommended: gemini-3.5-flash for most tasks.`,
    },
  },

  ollama: {
    '*': {
      model: `What this field is: The name of the AI model running locally on your Ollama server.
Important: The model must already be downloaded. To download: open a terminal and run: ollama pull modelname
To see models you have installed: run ollama list in your terminal.
Popular models: llama3 (general use), mistral (fast, efficient), phi3 (small and fast), gemma2 (Google's model), codellama (for code).
Example: llama3`,
      prompt: `What this field is: The instruction for your local AI model.
Example: Classify this customer review as positive, negative, or neutral. Reply with just one word: {{$json.review}}`,
      baseUrl: `What this field is: The address of your Ollama server.
Default: http://localhost:11434 (when Ollama runs on the same machine as CtrlChecks).
If Ollama runs on another server: http://[server-ip]:11434
Example: http://localhost:11434`,
    },
  },

  ai_agent: {
    '*': {
      systemPrompt: `What this field is: The agent's role, personality, and operating rules — its instructions for every task.
How to write it: Describe what the agent IS and what rules it follows.
Example: You are a data analyst. When given data, identify the top 3 trends, any outliers, and give 2 actionable recommendations. Always cite specific numbers from the data. Reply in bullet points. Keep your response under 300 words.`,
      userMessage: `What this field is: The specific task or question for the agent to work on in this workflow step.
Example: Analyze this week's sales data and identify the top 3 products by revenue: {{$json.salesData}}
Tip: Use {{$json.query}} or {{$json.userInput}} to pass dynamic tasks from earlier steps.`,
    },
  },

  text_summarizer: {
    '*': {
      text: `What this field is: The text you want to summarize.
Example: {{$json.articleContent}} or {{$json.emailBody}}
Tip: Connect this after a database read, HTTP request, or Gmail node — then use {{$json.body}} or the relevant field to pass the text.`,
      maxLength: `What this field is: The maximum length of the summary in words or characters.
Example: 100 (for a short 100-word summary) or 3 (for a 3-sentence summary).`,
    },
  },

  sentiment_analyzer: {
    '*': {
      text: `What this field is: The text to analyze for sentiment (positive, negative, or neutral feeling).
Example: {{$json.customerReview}} or {{$json.feedbackMessage}}
Use case: Analyze customer reviews, support tickets, or social media comments.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // LOGIC & FLOW CONTROL
  // ─────────────────────────────────────────────────────────────

  if_else: {
    default: {
      conditions: `What this field is: The list of yes/no rule rows that decides whether the workflow leaves through TRUE or FALSE.
Why it matters: This is the decision point for the workflow. A matching run takes TRUE; everything else takes FALSE.
When to fill it: Use it when a process has two paths, such as high-value order vs normal order, approved request vs rejected request, or urgent ticket vs regular ticket.
What to enter: In the builder, choose a Field from previous data, choose the Operator, and enter the Value to compare against. Example: Field $json.orderTotal, Operator greater_than_or_equal, Value 500.
Where the value comes from: Copy field paths from the previous node output, such as $json.status, $json.orderTotal, $json.customer.plan, input.email, or input.score.
How to use it later: Connect TRUE to the action for matching work and FALSE to the fallback action. Downstream nodes can still use original values like {{$json.customerEmail}}.
Accepted format: Builder rows are recommended. JSON mode accepts [{"field":"$json.orderTotal","operator":"greater_than_or_equal","value":500}]. Operators are equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, and not_contains.
Real workplace example: Route paid orders over $500 to finance review and all other orders to normal fulfillment.
If it is empty or wrong: The workflow cannot decide reliably, may fail validation, or may send work down FALSE because the field path is missing.
Common mistake: Typing the visible form label instead of the internal output key. Use $json.orderTotal, not "Order Total".`,
      conditionField: `What this field is: The previous-step value that one condition row checks.
Why it matters: The branch decision depends on this exact field. If the path points to the wrong data, the rule checks the wrong thing.
When to fill it: Fill it for every rule row. Pick from the dropdown when possible, or choose Custom and type the field path yourself.
What to enter: Use a plain path such as $json.status, $json.orderTotal, $json.customer.plan, input.email, or input.score.
Where the value comes from: Look at the trigger or previous node output and copy the exact key you want to check.
How to use it later: The field stays available on both branches, so emails, logs, and service nodes can still reference {{$json.customerEmail}} or {{$json.orderTotal}}.
Accepted format: Use $json.fieldName, $json.nested.fieldName, or input.fieldName. Template wrappers like {{$json.status}} may work, but plain paths are easier in the builder.
Real workplace example: In a lead workflow, use $json.leadScore so scores above 80 go to sales and the rest go to nurture.
If it is empty or wrong: The row is ignored or evaluates against an empty value, usually sending the run through FALSE.
Common mistake: Guessing a field path before running the previous node once. Preview the real output first.`,
      conditionOperator: `What this field is: The comparison used by one condition row.
Why it matters: The operator controls how the selected field and compare value are judged.
When to fill it: Fill it for every row. Use equals for exact statuses, not_equals for exclusions, greater_than or less_than for open thresholds, greater_than_or_equal or less_than_or_equal when the boundary value should count, contains for text/list membership, and not_contains for values that must be absent.
What to enter: Choose equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, or not_contains.
Where the value comes from: The business rule decides the operator. "VIP customer" usually means equals; "amount at least 500" means greater_than_or_equal; "email does not contain test" means not_contains.
How to use it later: The evaluated result becomes conditionResult and selects the TRUE or FALSE branch while original input data continues downstream.
Accepted format: Dropdown options are equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, and not_contains. JSON mode can also normalize aliases like ==, !=, >, <, >=, and <=.
Real workplace example: Use greater_than_or_equal with $json.invoiceAmount and 10000 to route large invoices to manager approval.
If it is empty or wrong: The comparison may fail validation or route work opposite of what the business rule intended.
Common mistake: Using contains when the whole status must match. For status paid, use equals.`,
      conditionValue: `What this field is: The target value the selected field is compared with.
Why it matters: This is the value that makes the rule pass or fail.
When to fill it: Fill it after the field and operator. Use the exact status, category, number, or true/false value that should send the run to TRUE.
What to enter: Use text such as approved or premium, a number such as 500, or boolean text such as true or false. Do not add quotes in the builder value box.
Where the value comes from: Use the real values produced by your business tools, such as paid from checkout, enterprise from CRM, or urgent from a support ticket.
How to use it later: When the incoming value matches this target, the TRUE path runs; otherwise the FALSE path runs. Both branches can still use {{$json.status}} or {{$json.orderTotal}}.
Accepted format: Text, numbers, true, false, or null in JSON mode. For contains and not_contains, enter the word, phrase, or list item to check.
Real workplace example: Compare $json.interviewScore greater_than_or_equal 8 to route strong candidates to scheduling.
If it is empty or wrong: The builder may drop the row, or the condition may compare against a value that never appears.
Common mistake: Typing "500 dollars" for a numeric threshold. Use 500, then add currency wording in a message node later.`,
      combineOperation: `What this field is: How multiple condition rows work together.
Why it matters: It decides whether TRUE requires every row to match or just one row to match.
When to fill it: Use it when there is more than one condition row. With one row, AND and OR behave the same.
What to enter: Choose AND or OR. AND means all rows must be true. OR means any one row can be true.
Where the value comes from: Read the business rule: "paid and over $500" uses AND; "urgent or VIP" uses OR.
How to use it later: The combined result chooses TRUE or FALSE. Connect each output to the correct branch action.
Accepted format: AND or OR, stored in uppercase. AND is the default.
Real workplace example: Use AND for orderTotal greater_than_or_equal 500 and status equals paid. Use OR for priority equals urgent or customerTier equals VIP.
If it is empty or wrong: The workflow defaults to AND, which can be stricter than expected and send items to FALSE.
Common mistake: Choosing AND when the policy says any row can qualify. If the sentence uses "or", choose OR.`,
    },
  },

  switch: {
    default: {
      expression: `What this field is: The incoming value Switch checks to choose a branch.
Why it matters: Every case is compared with this value. If it points at the wrong field, the workflow chooses the wrong branch or no branch.
When to fill it: Use it whenever one value can lead to several outcomes, such as ticket category, payment status, region, plan, or priority.
What to enter: Enter a previous-step field template such as {{$json.category}}, {{$json.status}}, {{$json.region}}, {{$json.plan}}, or {{$json.priority}}.
Where the value comes from: Inspect the previous node output and copy the exact field that contains the routing value.
How to use it later: The matched branch keeps the original data, so downstream nodes can still use {{$json.customerEmail}}, {{$json.ticketId}}, or {{$json.orderId}}.
Accepted format: A template or simple expression that resolves to text, a number, true, or false. The resolved result is compared as text to cases[].value.
Real workplace example: Route support tickets by setting Expression to {{$json.category}} and cases to billing, technical, and general.
If it is empty or wrong: Switch cannot match a case and may skip branch-specific actions.
Common mistake: Typing the display label instead of the internal key. Use {{$json.category}}, not "Ticket Category".`,
      cases: `What this field is: The list of named branch outputs for Switch.
Why it matters: Each case value becomes an outgoing branch handle. The expression result must match one value for that branch to run.
When to fill it: Fill it when you know the possible values, such as billing, technical, general, paid, failed, pending, US, EU, or APAC.
What to enter: Enter JSON objects with value and label. Value is the exact machine value and branch handle; label is the friendly name shown to people.
Where the value comes from: Case values should match real values from previous node output, not guessed names.
How to use it later: Connect each case output to its destination action, such as billing to Finance and technical to Engineering Support.
Accepted format: [{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]. Values must be unique and non-empty.
Real workplace example: Route help desk tickets with billing, technical, and general cases.
If it is empty or wrong: The node has no reliable branch outputs, duplicate values can fail validation, and unmatched values may go nowhere useful.
Common mistake: Renaming a case value after branch lines are connected. Re-check the outgoing lines after changing case values.`,
      routingType: `What this field is: An optional compatibility hint for older Switch configurations.
Why it matters: It may exist in backend contracts, but normal new workflows route by Expression and Cases.
When to fill it: Only use it when maintaining a legacy workflow that already has routingType.
What to enter: string, number, or expression when an older workflow explicitly expects that hint.
Where the value comes from: Legacy saved workflow config, not ordinary business data.
How to use it later: You usually do not. Downstream routing still depends on matched case outputs and original fields like {{$json.status}}.
Accepted format: Plain text such as string, number, or expression. Leave empty for normal new workflows.
Real workplace example: Keep routingType as string in an older payment-status switch while Expression remains {{$json.status}}.
If it is empty or wrong: New workflows are usually unaffected when it is empty. If used instead of Expression, routing will fail.
Common mistake: Entering string here and leaving Expression blank. Expression is still required.`,
      rules: `What this field is: A deprecated alias for Cases used by older saved workflows.
Why it matters: The runtime can migrate rules into cases, but Cases is the source of truth for new workflows.
When to fill it: Do not fill it for new workflows. Use only when a legacy workflow has rules and no cases.
What to enter: The same JSON shape as Cases: objects with value and label.
Where the value comes from: Old saved workflow configs or migration output.
How to use it later: Treat migrated rule values as case outputs and connect outgoing lines using those case values.
Accepted format: [{"value":"paid","label":"Paid"},{"value":"failed","label":"Failed"},{"value":"pending","label":"Pending"}].
Real workplace example: A legacy payment workflow may migrate rules for paid, failed, and pending into Cases.
If it is empty or wrong: New workflows with Cases are unaffected. Legacy workflows with only invalid rules may have no branch outputs.
Common mistake: Keeping rules and cases with different branch values. Update Cases and stop editing Rules.`,
    },
  },

  delay: {
    default: {
      duration: `What this field is: How long to pause the workflow before the next step runs.
How to fill it: Type a number, then set the unit below.
Examples: 30 seconds → pauses briefly. 5 minutes → good for rate limiting. 24 hours → wait until next day.
Use case: Pause before sending a follow-up email, wait for a process to finish, or space out API calls.`,
      unit: `What this field is: The time unit for the delay.
Options: ms (milliseconds), s (seconds), m (minutes), h (hours).
Example: s for seconds. So duration=30, unit=s means pause for 30 seconds.`,
    },
  },

  wait: {
    default: {
      duration: `What this field is: How long to pause the workflow.
Example: 60 seconds = 1 minute pause before continuing.`,
    },
  },

  filter: {
    default: {
      array: `What this field is: The list of records Filter should inspect.
Why it matters: Filter only removes records from the list you point it at. If this points to the wrong place, the next node may receive the wrong records or an unchanged input.
When to fill it: Leave it empty when the previous node already sends the list as items. Fill it when the list is stored under a different key, such as contacts, rows, orders, or data.records.
What to enter: Use an expression that returns an array, such as {{$json.items}}, {{$json.contacts}}, {{$json.orders}}, {{$json.rows}}, or {{$json.data.records}}.
Where the value comes from: Inspect the previous node output and find the field that contains the list you want to narrow down.
How to use it later: Filter replaces {{$json.items}} with the smaller list. Downstream nodes can map over {{$json.items}} or pass it to Loop, Function Item, email, spreadsheet, or database nodes.
Accepted format: Leave blank to use input.items or enter a template/expression that resolves to an array of objects.
Real workplace example: A CRM search returns {{$json.contacts}}. Set Array to {{$json.contacts}} and keep only active contacts with the Condition field.
If it is empty or wrong: If no array is found, the input passes through unchanged. If the expression points to a non-list value, no filtering happens.
Common mistake: Pointing to one record instead of the list. Use {{$json.contacts}}, not {{$json.contacts[0]}}.`,
      condition: `What this field is: The rule each item must pass to stay in the list.
Why it matters: Items where the rule is true stay in {{$json.items}}. Items where the rule is false are removed before the next node runs.
When to fill it: Fill it any time you need to narrow a list, such as active customers only, paid orders only, qualified leads, urgent tickets, or rows with valid emails.
What to enter: Write a simple expression using item for the current record. Examples: item.status === "active", item.total >= 500, item.priority === "urgent", item.email && !item.email.includes("test"), or item.completed !== true.
Where the value comes from: Use field names from each object inside the array. If an item looks like {"status":"active","total":725}, use item.status and item.total.
How to use it later: The next node receives the same incoming object with {{$json.items}} replaced by only the matching records, while other fields stay available.
Accepted format: A JavaScript-style expression that returns true or false for one item. Use ===, !==, >=, <=, &&, ||, and includes() for common checks.
Real workplace example: Use item.status === "paid" && item.total >= 500 to keep paid high-value orders before creating finance review tasks.
If it is empty or wrong: The node returns a condition-required error, a filter error, or an unchanged list. Some secured deployments can return "Filter node execution is disabled for security reasons."
Common mistake: Using {{$json.status}} inside the item rule. Use item.status because the condition runs once per item.`,
      conditions: `What this field is: A legacy structured condition list that some older Filter workflows may still contain.
Why it matters: Current frontend setup uses the Condition field, but the runtime may understand older condition arrays for compatibility.
When to fill it: Do not fill this for new workflows. Use Condition instead unless you are repairing an older saved workflow.
What to enter: Prefer a plain Condition such as item.status === "active". Legacy condition arrays resemble If/Else condition objects with field, operator, and value.
Where the value comes from: Old workflow configs or migration output, not normal user input.
How to use it later: Once migrated, use the Condition field and {{$json.items}} output like a normal Filter node.
Accepted format: Legacy JSON condition arrays only. New workflows should use the condition field.
Real workplace example: A legacy active-customer filter may be migrated from a structured condition into item.status === "active".
If it is empty or wrong: New workflows are unaffected when Condition is present. Legacy-only configs may not filter correctly.
Common mistake: Editing both conditions and condition with conflicting rules. Keep Condition as the source of truth.`,
    },
  },

  merge: {
    default: {
      mode: `What this field is: The strategy for combining data from multiple incoming branches.
Why it matters: Each mode creates a different output shape. The next node may need a flat object, a list of branch results, or nested objects preserved together.
When to fill it: Choose it whenever two or more paths flow into Merge, such as after If/Else, Switch, or Parallel.
What to enter: Choose overwrite, append, or deep_merge. Overwrite objects combines fields and later branch values win. Append items collects branch outputs into {{$json.items}}. Deep merge objects recursively combines nested object fields.
Where the value comes from: This is a workflow design choice based on how the next node needs to read the data.
How to use it later: In append mode, read {{$json.items}}. In overwrite or deep_merge mode, read merged top-level or nested fields such as {{$json.customer.email}} or {{$json.approval.status}}.
Accepted format: Dropdown options are overwrite, append, and deep_merge, shown as Overwrite objects, Append items, and Deep merge objects.
Real workplace example: Use deep_merge after one branch adds customer details and another branch adds approval details, so the summary email can use both {{$json.customer.email}} and {{$json.approval.status}}.
If it is empty or wrong: Empty defaults to overwrite. The wrong mode can overwrite fields, create an items list when top-level fields were expected, or fail to combine nested data the way the next node needs.
Common mistake: Using overwrite when both branches output the same key, such as status. Rename fields upstream or use nested objects with deep_merge.`,
    },
  },
  split_in_batches: {
    default: {
      array: `What this field is: The expression that points Split In Batches to the list it should divide into groups.
Why it matters: Lists from sheets, CRMs, APIs, forms, or databases can be too large to handle all at once. This field identifies the list to split.
When to fill it: Fill it when the list is under a key such as rows, contacts, orders, records, messages, or data.records. Leave it blank only when input.items already contains the right list.
What to enter: Enter an expression that resolves to an array, such as {{$json.items}}, {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, or {{$json.data.records}}.
Where the value comes from: Run the previous node and copy the path to the full list, not a single item.
How to use it later: The node returns all groups under {{$json.batches}} and exposes the first group as {{$json.items}} for the next node.
Accepted format: Workflow expression or path resolving to an array. Use {{$json.rows}}, not {{$json.rows[0]}}.
Real workplace example: Split 1,000 exported contacts from {{$json.contacts}} into batches of 100 before sending them through a controlled sync process.
If it is empty or wrong: Empty falls back to input.items. If no array is found, batches is empty, totalBatches is 0, and items is empty.
Common mistake: Expecting the current DAG runtime to run the next branch once per batch. This node exposes batch data; use a supported loop, agent, or batch path for separate batch execution.`,
      batchSize: `What this field is: The number of records to place in each batch.
Why it matters: The right size keeps API calls, review queues, emails, and database writes from becoming too large or rate-limited.
When to fill it: Always fill it intentionally. The backend requires batchSize even though runtime falls back to 10 if the value is blank or invalid.
What to enter: Enter a positive whole number such as 10, 25, 50, or 100.
Where the value comes from: Choose the value from the downstream service limit, the size of each record, and how much work the next step should handle at once.
How to use it later: Use {{$json.batchSize}}, {{$json.totalBatches}}, {{$json.batches}}, and {{$json.items}} in summaries, logs, or downstream batch-capable nodes.
Accepted format: Positive number only. Do not type words such as "100 records".
Real workplace example: Set Batch Size to 100 when syncing 750 spreadsheet contacts so the workflow creates smaller groups instead of one huge payload.
If it is empty or wrong: Blank or invalid values default to 10; zero and negative values are raised to at least 1.
Common mistake: Treating Batch Size as a per-item loop count. It controls group size only; downstream service nodes still need their own account connections and supported batch handling.`,
    },
  },
  log_output: {
    default: {
      message: `What this field is: The text written to the CtrlChecks execution log — and since this node has no other output fields, this resolved text is also this node's entire output value.
Why it matters: It is the only field that actually determines what gets recorded; Level only changes the label and console method used.
When to fill it: Optional, but an empty Message logs a blank line with nothing useful in it — always fill it in practice.
What to enter: A short checkpoint description combined with any {{$json.field}} values from the node connected directly into this one.
Where the value comes from: Data produced by whichever node feeds directly into this Log Output node.
How to use it later: Nothing can read it afterward — Log Output is always a terminal node with zero outgoing connections.
Accepted format: Plain text with optional {{$json.field}} expressions. An object or array value is automatically pretty-printed as indented JSON.
Real workplace example: "Processed {{$json.rowCount}} rows from {{$json.tableName}}" as a checkpoint in a data import pipeline.
If it is empty or wrong: An empty Message logs an empty string — there is no "required" error for this node.
Common mistake: Expecting a node placed after Log Output to receive the original data. The workflow builder does not allow an outgoing connection from Log Output at all.`,
      level: `What this field is: A label (info, warn, error, or debug) that only changes how this log line looks and which console method records it.
Why it matters: It never affects whether the workflow continues — even Level: error does not stop or fail the run.
When to fill it: Optional; defaults to info.
What to enter: info for routine checkpoints, warn for something worth a second look, error for a problem worth flagging visually (not functionally), debug for verbose detail while building the workflow.
Where the value comes from: A manual choice based on how the entry should read later, not something normally mapped from upstream data.
How to use it later: Level is not part of this node's own output value — only Message is.
Accepted format: One of info, warn, error, debug.
Real workplace example: Use warn when an order is missing an optional discount code, and info for the standard "order processed" checkpoint.
If it is empty or wrong: Falls back to info automatically.
Common mistake: Choosing error expecting it to halt the workflow like the Stop and Error node — it never does.`,
    },
  },

  loop: {
    default: {
      array: `What this field is: The expression that points Loop to the list it should expose as {{$json.items}}.
Why it matters: Previous nodes often put lists under keys such as rows, contacts, orders, records, messages, or data.records. This field tells Loop which list to use.
When to fill it: Fill it when the previous node does not already output input.items. Leave it blank only when input.items is already the right list.
What to enter: Enter a path that resolves to an array, such as {{$json.rows}}, {{$json.contacts}}, {{$json.orders}}, {{$json.messages}}, or {{$json.data.records}}.
Where the value comes from: Run the previous node and inspect its output. Copy the path to the whole list, not a single item.
How to use it later: Loop writes the selected and capped list to {{$json.items}}. The next node can read {{$json.items}} and the metadata under {{$json.loop}}.
Accepted format: A workflow expression that resolves to an array. Use {{$json.rows}}, not {{$json.rows[0]}}.
Real workplace example: A Sheets step returns 500 lead rows under {{$json.rows}}. Set Array Expression to {{$json.rows}} before capping the list for review.
If it is empty or wrong: Empty falls back to input.items. If no array is found, Loop exposes an empty items list and loop.iterations is 0.
Common mistake: Expecting the current DAG runtime to run the next branch once per item. Loop exposes items and metadata; use Function Item or an approved batch path for true per-item work.`,
      maxIterations: `What this field is: The maximum number of list records Loop should expose downstream.
Why it matters: It prevents accidental high-volume processing when a previous node returns hundreds or thousands of rows.
When to fill it: Fill it whenever the incoming list size can vary or when the next service has rate limits, approvals, or workload limits.
What to enter: Enter a positive whole number. Use 10 for quick previews, 25 for review queues, 100 for ordinary batches, and higher values only when downstream nodes can handle them.
Where the value comes from: Choose the number from the business process or the downstream service limits.
How to use it later: The output includes {{$json.loop.maxIterations}}, {{$json.loop.iterations}}, and {{$json.loop.truncated}} for logs, alerts, and conditions.
Accepted format: Positive number. Blank or invalid values default to 100; runtime enforces at least 1.
Real workplace example: Review only the first 25 overdue support tickets each morning and alert a manager if {{$json.loop.truncated}} is true.
If it is empty or wrong: Blank defaults to 100. If the array is longer, Loop truncates {{$json.items}} and sets loop.truncated to true.
Common mistake: Raising the limit without checking downstream accounts and rate limits. Loop has no credentials; the next service node still needs its own connection.`,
    },
  },
  try_catch: {
    default: {
      maxRetries: `What this field is: How many additional times to retry the nodes inside the Try block if they fail.
Example: 3 means it tries up to 4 times total (1 original + 3 retries).
Set to 0 to not retry — just catch the error and continue to the Catch path.
Use case: Retry a flaky API call up to 3 times before giving up.`,
    },
  },

  retry: {
    default: {
      maxRetries: `What this field is: The maximum number of retry attempts.
Example: 3 means try up to 3 additional times after the first failure (4 total attempts).`,
      retryDelay: `What this field is: How long to wait between retry attempts (in milliseconds).
Example: 1000 = wait 1 second between retries. 5000 = wait 5 seconds.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // DATA TRANSFORMATION
  // ─────────────────────────────────────────────────────────────

  javascript: {
    default: {
      code: `What this field means: JavaScript Code is the script that runs on the current workflow data.

Why it matters: Use it when built-in nodes cannot express the workplace rule, such as scoring a lead, reshaping a nested API response, validating a record, or calculating several values at once.

When to fill it: Fill it every time you use JavaScript. The backend requires code and returns _error when this field is empty.

What to enter: Write JavaScript that returns the final value for the next node. Read incoming data as input, $json, or json. Return an object for named fields, or an array only when the next node expects a list.

Where the value comes from: Run the previous node and copy exact field names from its output, such as $json.customer.email, $json.orders, or $json.orderTotal.

How to use it later: The return value becomes downstream {{$json}} data. If you return { customerEmail, riskScore }, later nodes can use {{$json.customerEmail}} and {{$json.riskScore}}.

Accepted format: JavaScript statements inside the script body. Use return, or assign result. Template expressions such as {{$json.email}} are resolved before execution when present.

Real workplace example: const total = Number($json.orderTotal || 0); return { ...$json, riskScore: total > 5000 ? 90 : 20, eligibleForReview: total > 5000 };

If it is empty or wrong: Blank code returns _error. Syntax errors, missing fields, disabled execution, or timeouts also return _error where possible.

Common mistake: Do not paste API keys, passwords, or private tokens into code. JavaScript has no credentials; downstream service nodes still need their own account connections.`,
      timeout: `What this field means: Timeout is the maximum number of milliseconds this node may spend running your JavaScript.

Why it matters: It prevents accidental long loops, slow calculations, or code that never finishes from holding up the workflow.

When to fill it: Keep the default for quick field cleanup. Increase it for real data work such as summarizing many orders, checking a long contact list, or building a report object.

What to enter: Enter a positive whole number in milliseconds. 5000 means five seconds, 10000 means ten seconds, and 30000 means thirty seconds.

Where the value comes from: Choose it from the size of the incoming data and the amount of work your script performs. Test with sample output from the previous node.

How to use it later: Timeout does not create an output field. If execution runs too long, the node returns _error, which later logging or alert nodes can inspect with {{$json._error}}.

Accepted format: Positive number only. Runtime defaults blank or invalid values to 5000 and caps all values at 30000.

Real workplace example: Set 10000 when calculating totals across a large daily order export before sending the summary to finance.

If it is empty or wrong: Empty or invalid values use 5000. Values above 30000 are reduced to 30000. If the script still runs too long, the node returns an execution timeout _error.

Common mistake: Raising Timeout to hide an endless loop or a wrong field path. First confirm the previous node sent the list you expect.`,
      outputSchema: `What this field means: Output Schema is an optional JSON hint for the top-level type your script should return.

Why it matters: JavaScript can return an object, array, text, number, boolean, or the original input. A schema hint helps catch cases where the next node expects named fields but the script returned the wrong shape.

When to fill it: Fill it when downstream mapping depends on a predictable result, such as before CRM writes, database inserts, Slack summaries, or If/Else routing.

What to enter: Enter a JSON object such as {"type":"object"} when your code returns named fields, or {"type":"array"} when it returns a list.

Where the value comes from: Match it to the return statement in JavaScript Code and to what the next node expects to read.

How to use it later: Output Schema itself is not passed downstream. The script return value remains the downstream {{$json}} data.

Accepted format: Valid JSON string with double quotes. Common top-level types are object, array, string, number, and boolean.

Real workplace example: Use {"type":"object"} when returning { customerEmail: $json.email, riskScore: 90 } before a CRM update.

If it is empty or wrong: Empty skips the shape check. Invalid JSON is ignored. A mismatch logs a runtime warning today and does not block execution, so test downstream fields.

Common mistake: Treating Output Schema as a converter. It only describes the expected result; your code must still return the actual object or list.`,
    },
  },

  function: {
    default: {
      code: `What this field is: JavaScript code to process each item.
The current item is available as item.json.
Example (combine fields):
  return [{ json: { ...item.json, fullName: item.json.firstName + ' ' + item.json.lastName } }];`,
    },
  },

  date_time: {
    format: {
      value: `What this field is: The date/time value you want to format or convert.
Example: {{$json.createdAt}} to format a date from the previous step.
Or a fixed date: 2025-01-15T14:30:00Z`,
      outputFormat: `What this field is: How you want the date to look after formatting.
Uses date-fns format tokens. Common examples:
  yyyy-MM-dd         →  2025-01-15 (for databases)
  dd/MM/yyyy         →  15/01/2025 (European format)
  MM/dd/yyyy         →  01/15/2025 (US format)
  MMMM d, yyyy       →  January 15, 2025 (written out)
  MMM d 'at' h:mm a  →  Jan 15 at 2:30 PM
  HH:mm              →  14:30 (24-hour time only)`,
    },
    add: {
      amount: `What this field is: How much time to add to the date.
Example: 7 (then set unit to "days" to add 7 days to a date).`,
      unit: `What this field is: The time unit to add.
Options: seconds, minutes, hours, days, weeks, months, years.
Example: days`,
    },
    subtract: {
      amount: `What this field is: How much time to subtract from the date.
Example: 30 (then set unit to "days" to go back 30 days).`,
    },
  },

  text_formatter: {
    '*': {
      template: `What this field is: The text template to resolve.
Example: Hello {{$json.name}} or Order #{{$json.orderId}}.
The runtime does not read separate text, operation, or values fields for this node.`,
      text: `What this field is: The text you want to transform.
Example: {{$json.name}} to transform the name from the previous step, or Hello World as a static value.`,
      operation: `What this field is: The text transformation to apply.
Common options:
  uppercase   →  "hello world" becomes "HELLO WORLD"
  lowercase   →  "HELLO WORLD" becomes "hello world"
  capitalize  →  "hello world" becomes "Hello World"
  trim        →  removes spaces from start and end of text
  replace     →  find a word or phrase and replace it with something else
  slice       →  extract part of the text (e.g. first 100 characters)`,
    },
  },

  json_parser: {
    default: {
      json: `What this field is: A JSON string (text) that you want to convert into a usable object so you can access individual fields.
Example: {{$json.rawApiResponse}} where rawApiResponse is a string like {"name":"Alice","email":"alice@example.com"}
After parsing, the full parsed object is available as {{$json.parsed}}.`,
      extractFields: `What this field is: Optional top-level field names to copy from the parsed object.
Example: ["name","email"] copies parsed.name and parsed.email onto the output.`,
    },
    parse: {
      text: `What this field is: A JSON string (text) that you want to convert into a usable object so you can access individual fields.
Example: {{$json.rawApiResponse}} where rawApiResponse is a string like {"name":"Alice","email":"alice@example.com"}
After parsing, you can access individual fields in the next step: {{$json.name}} and {{$json.email}}.`,
    },
    stringify: {
      data: `What this field is: A JavaScript object/value to convert into a JSON string.
Example: {{$json}} to convert the whole input into a JSON string.`,
    },
  },

  set_variable: {
    default: {
      name: `What this field is: The name you are giving to this variable so you can refer to it later.
Rules: Use letters and numbers only, no spaces. Recommended style: camelCase.
Examples: customerEmail, totalRevenue, isApproved, orderCount`,
      value: `What this field is: The value to store in this variable.
Can be: static text (alice@example.com), a number (42), or a dynamic expression from an earlier step.
Example: alice@example.com (static) or {{$json.email}} (uses the email from the previous step)`,
    },
  },

  edit_fields: {
    default: {
      fields: `What this field is: The key-value mappings Edit Fields adds to the current workflow item.
Why it matters: It gives later nodes clean field names such as customerEmail, fullName, priorityLabel, or needsManagerReview without writing code.
When to fill it: Fill it when a later action needs a new field or a renamed-looking copy of existing data. It is optional in the backend, so leaving it empty usually passes data through unchanged.
What to enter: Add one row per field. The key is the output field name. The value can be fixed text, a number, true/false, an object, or an expression from previous data.
Where the value comes from: Use data from forms, webhooks, sheets, CRM records, emails, databases, or API responses. Examples: {{$json.email}}, {{$json.fname}}, {{$json.lname}}, {{$json.order.total}}, {{$json.ticket.priority}}.
How to use it later: Each edited field becomes available to the next node as {{$json.fieldName}}. For example, a downstream ticket node can use {{$json.customerEmail}} and {{$json.priorityLabel}}.
Accepted format: Key-value rows in the UI or a saved JSON object such as {"customerEmail":"{{$json.email}}","fullName":"{{$json.fname}} {{$json.lname}}","priorityLabel":"High"}. Do not use an array or plain text.
Real workplace example: After a support webhook, map email to customerEmail, fname/lname to fullName, and severity to priorityLabel before creating a helpdesk ticket.
If it is empty or wrong: Empty fields means no new fields are added. If fields is not an object, runtime returns _error. If a key matches an incoming key, the edited value overwrites the original.
Common mistake: Do not paste API keys or passwords here. Edit Fields has no credentials; connect accounts on downstream service nodes.`,
    },
  },

  set: {
    default: {
      fields: `What this field is: The JSON object of fields the Set node adds to the current workflow item.
Why it matters: Later nodes work best when field names are predictable. Use Set to create clear names such as customerEmail, fullName, lifecycleStage, or readyForSales before sending data to email, CRM, sheets, or database steps.
When to fill it: Always fill this field for Set. The backend requires fields, and the node only changes output data when this object contains one or more keys.
What to enter: Enter a valid JSON object. Keys are the output field names. Values can be fixed text, numbers, booleans, nested objects, or expressions from previous data.
Where the value comes from: Copy field paths from the previous node output, such as {{$json.email}}, {{$json.firstName}}, {{$json.customer.total}}, or {{$json.form.leadSource}}.
How to use it later: Each key you set becomes available to the next node as {{$json.keyName}}. For example, set customerEmail and then use {{$json.customerEmail}} in a Gmail, Slack, HubSpot, or database node.
Accepted format: JSON object only, for example {"customerEmail":"{{$json.email}}","fullName":"{{$json.firstName}} {{$json.lastName}}","readyForSales":true}. Use double quotes around text and no trailing commas.
Real workplace example: After a demo-request form, set customerEmail from the submitted email, fullName from first and last name, lifecycleStage to new_lead, and readyForSales to true before creating a CRM contact.
If it is empty or wrong: Invalid JSON may stop the node from setting fields. A missing expression path can produce a blank or unresolved value. A key that matches an incoming field overwrites that incoming value.
Common mistake: Do not paste API keys, passwords, or tokens into this object. Set has no credentials; downstream service nodes need their own account connections.`,
    },
  },

  math: {
    '*': {
      value1: `What this field is: The first number in the calculation.
Example: {{$json.price}} to use a price from the previous step, or 100 as a fixed number.`,
      value2: `What this field is: The second number in the calculation.
Example: {{$json.taxRate}} or 0.08 for 8% tax.`,
      precision: `What this field is: Decimal places applied to the returned result.
Default: 10. Valid range: 0 through 20.`,
      operation: `What this field is: The math operation to perform.
Options: add (+), subtract (-), multiply (*), divide (/), modulo (remainder), power (x^y), round, floor, ceil, abs.
Example: multiply — to calculate price * quantity.`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // UTILITY & HTTP
  // ─────────────────────────────────────────────────────────────

  http_request: {
    default: {
      url: `What this field means: URL is the full web address the HTTP Request node should call.

Why it matters: It identifies the exact API endpoint, webhook, or internal service. A wrong host, path, or ID can fail the request or affect the wrong record.

When to fill it: Fill it every time. The backend requires url and returns _error when it is blank.

What to enter: Enter a complete http:// or https:// URL, including the resource path and any path IDs required by the API.

Where the value comes from: Copy the endpoint from API docs, a developer dashboard, a webhook setup page, or a previous workflow field.

How to use it later: Runtime returns the final URL as {{$json.url}}, including Query String Params, so logs and alerts can show what was called.

Accepted format: Full URL or expression resolving to one, such as https://api.example.com/customers/{{$json.customerId}}.

Real workplace example: https://api.billing.example.com/v1/customers/{{$json.customerId}}/invoices.

If it is empty or wrong: Empty returns _error. Wrong domains, paths, or IDs can cause DNS errors, 404s, or incorrect updates.

Common mistake: Duplicating the same filter in URL and Query String Params.`,
      method: `What this field means: Method is the action the API should perform.

Why it matters: APIs use Method to decide whether you are reading, creating, replacing, updating, or deleting data.

When to fill it: Change it when the API docs require POST, PUT, PATCH, or DELETE. Leave GET for normal reads.

What to enter: GET reads data. POST creates or submits data. PUT replaces a whole resource. PATCH updates selected fields. DELETE removes or cancels a resource.

Where the value comes from: Copy the exact method from the endpoint documentation.

How to use it later: Error output includes the attempted method, so an alert can include {{$json.method}}.

Accepted format: GET, POST, PUT, PATCH, or DELETE. Runtime uppercases the value before sending it.

Real workplace example: Use GET to fetch invoice status, POST to create a ticket, PATCH to update ticket priority, and DELETE to cancel a test record.

If it is empty or wrong: Empty behaves like GET. Wrong methods may return 405, skip Body, create duplicates, or delete data.

Common mistake: Adding Body for GET or DELETE; runtime sends Body only for POST, PUT, and PATCH.`,
      headers: `What this field means: Headers are extra instructions sent with the request, such as Content-Type, Accept, Authorization, or a service-specific request ID.

Why it matters: Many APIs require headers before they accept JSON, authenticate the call, or return the response format you expect.

When to fill it: Fill it when API docs list required headers, when sending JSON Body, or when a protected API requires authorization.

What to enter: Enter a JSON object such as {"Content-Type":"application/json","Accept":"application/json"}.

Where the value comes from: Header names come from API docs. Authorization values come from secure credentials, connections, environment values, or approved secret references.

How to use it later: Response headers are returned as {{$json.headers}} for rate-limit, request ID, content type, or troubleshooting checks.

Accepted format: JSON object with quoted header names and values. Do not use trailing commas.

Real workplace example: {"Content-Type":"application/json","Accept":"application/json","X-Request-Source":"ctrlchecks-workflow"}.

If it is empty or wrong: Public APIs may work, but protected APIs can return 401, 403, or 415.

Common mistake: Pasting API keys, bearer tokens, passwords, or private credentials directly into Headers instead of using a secure reference.`,
      body: `What this field means: Body is the data sent to the API for create or update requests.

Why it matters: POST, PUT, and PATCH endpoints use Body to know what customer, ticket, order, message, or record to create or change.

When to fill it: Fill it for POST, PUT, or PATCH when the API docs say a request body is expected. Leave it empty for GET and DELETE because runtime does not send Body for those methods.

What to enter: Enter a JSON object for most APIs, mapping only the fields the API expects.

Where the value comes from: Use data from forms, webhooks, CRM lookups, database rows, or previous transformation nodes.

How to use it later: The request Body is not returned unless the remote API echoes it. The response body is available as {{$json.body}} and {{$json.data}}.

Accepted format: JSON object, JSON text, or plain text when the API expects raw text. For JSON, also set Content-Type to application/json.

Real workplace example: {"requesterEmail":"{{$json.email}}","subject":"New billing question","message":"{{$json.message}}"}.

If it is empty or wrong: The API may return 400, validation errors, or create a record with missing fields.

Common mistake: Sending all of {{$json}} when the API expects only a small approved payload.`,
      qs: `What this field means: Query String Params are filters and options appended to the URL.

Why it matters: APIs use them for pagination, search, date ranges, status filters, sorting, and optional flags.

When to fill it: Fill it when the API docs list parameters such as page, limit, status, since, email, search, or include.

What to enter: Enter a JSON object such as {"status":"open","limit":100,"email":"{{$json.customerEmail}}"}.

Where the value comes from: Parameter names come from API docs. Values can come from fixed filters, Schedule dates, form answers, or previous lookup results.

How to use it later: Runtime returns the final URL with query parameters as {{$json.url}}.

Accepted format: JSON object only, without the leading question mark.

Real workplace example: {"status":"open","created_after":"{{$json.reportStartDate}}","limit":100}.

If it is empty or wrong: Empty adds no filters. Wrong names may be ignored, return too many records, or return none.

Common mistake: Adding the same key in both URL and Query String Params.`,
      timeout: `What this field means: Timeout is how long the workflow waits for the remote server to respond.

Why it matters: It prevents one slow or unreachable API from blocking the workflow indefinitely.

When to fill it: Use the default for normal APIs. Increase it for slow reports, large exports, or file-like responses. Decrease it when the workflow should fail fast.

What to enter: Milliseconds, such as 10000 for ten seconds or 30000 for thirty seconds.

Where the value comes from: Choose it from the API's normal response time and the business process tolerance.

How to use it later: Timeout failures return _error and errorDetails.timeout, which alerts can read as {{$json._error}}.

Accepted format: Positive whole number. Blank or invalid values default to 30000.

Real workplace example: Use 60000 for a monthly accounting export and 10000 for a customer lookup.

If it is empty or wrong: Too low fails slow but healthy APIs. Too high makes known failures take longer.

Common mistake: Treating Timeout as retry behavior; this field controls wait time for one request.`,
    },
    '*': {
      headers: `What this field is: Extra information sent with the request — most commonly used for authentication.
Format: JSON object where keys are header names and values are header values.
Common examples:
  Authentication: {"Authorization":"Bearer YOUR_API_TOKEN"}
  API key header: {"X-API-Key":"your-api-key-here"}
  Content type:   {"Content-Type":"application/json"}
  Combined:       {"Authorization":"Bearer abc123","Content-Type":"application/json","Accept":"application/json"}`,
      queryParams: `What this field is: Filter or option parameters added to the end of the URL — like search filters in a web address.
Format: JSON object.
Example: {"page":"1","limit":"20","status":"active"} becomes ?page=1&limit=20&status=active added to the URL.
Use case: Paginated API calls, filtering results, passing API keys in the URL.`,
    },
    get: {
      url: `What this field is: The full web address (URL) to send the GET request to.
Must start with https:// (or http:// for non-secure).
Example: https://api.github.com/users/octocat
Example with path variable: https://api.example.com/customers/{{$json.customerId}}
Tip: Use {{$json.apiUrl}} to build the URL dynamically from an earlier step.`,
    },
    post: {
      url: `What this field is: The API endpoint URL to send data to.
Example: https://api.example.com/v1/contacts or https://hooks.zapier.com/hooks/catch/12345/`,
      body: `What this field is: The data to send with the POST request — the request body.
Format: JSON object (most common for modern APIs).
Example: {"name":"Alice Kumar","email":"alice@example.com","source":"website","plan":"pro"}
Tip: Use {{$json}} to forward all data from the previous step directly to the API.`,
    },
    put: {
      url: `What this field is: The API endpoint URL to update data at.
Example: https://api.example.com/v1/contacts/{{$json.contactId}}`,
      body: `What this field is: The updated data to send.
Example: {"status":"active","plan":"pro","updatedAt":"2025-01-15"}`,
    },
    delete: {
      url: `What this field is: The URL of the resource to delete.
Example: https://api.example.com/v1/contacts/{{$json.contactId}}`,
    },
  },

  http_post: {
    '*': {
      url: `What this field is: The API endpoint URL to POST data to.
Example: https://api.example.com/webhook or https://api.example.com/v1/events`,
      body: `What this field is: The data to send in the request body.
Format: JSON object.
Example: {"event":"user_signup","userId":"{{$json.userId}}","email":"{{$json.email}}","timestamp":"{{$json.createdAt}}"}`,
    },
  },

  graphql: {
    query: {
      query: `What this field is: The GraphQL query to fetch data from the API.
Format: GraphQL query syntax.
Example: query { user(id: "123") { id name email role createdAt } }
Example with argument: query GetUser($id: ID!) { user(id: $id) { name email } }
Tip: Test your query in the GraphQL playground (usually at /graphql on the API) before using it here.`,
      variables: `What this field is: Variable values for your query — keeps queries reusable and safe.
Format: JSON object. Variable names match the $name placeholders in your query.
Example: {"id":"123","limit":10}`,
    },
    mutation: {
      query: `What this field is: The GraphQL mutation to create, update, or delete data.
Format: GraphQL mutation syntax.
Example: mutation { createContact(input: {name: "Alice", email: "alice@example.com"}) { id name email } }`,
      variables: `What this field is: Variable values for your mutation.
Example: {"name":"Alice Kumar","email":"alice@example.com"}`,
    },
  },

  cache_get: {
    '*': {
      key: `What this field is: The exact name of the cached value to retrieve.
Must match the key used when the value was stored.
Example: user:{{$json.userId}}:preferences
Tip: Use the same key pattern you used in the Cache Set node.`,
    },
  },

  cache_set: {
    '*': {
      key: `What this field is: The name to give this cached value — like a label.
Use descriptive names with colons as separators.
Example: user:{{$json.userId}}:lastLogin or session:{{$json.sessionId}} or rate_limit:{{$json.ip}}`,
      value: `What this field is: The data to cache (store temporarily for quick access later).
Example: {"theme":"dark","language":"en","timezone":"America/New_York"} or {{$json.userPreferences}}`,
      ttl: `What this field is: How many seconds until this cached value expires automatically.
Examples: 300 = 5 minutes, 3600 = 1 hour, 86400 = 24 hours.
Leave blank to cache forever (until manually deleted).`,
    },
  },

  respond_to_webhook: {
    default: {
      body: `What this field is: The data to send back as the webhook response — what the calling service receives.
Format: JSON object or a simple value.
Example: {"success":true,"message":"Order received","orderId":"{{$json.orderId}}"}`,
      statusCode: `What this field is: The HTTP status code to return.
Common values: 200 = OK (success), 201 = Created, 400 = Bad Request, 404 = Not Found, 500 = Server Error.
Example: 200`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // ADDITIONAL NODES
  // ─────────────────────────────────────────────────────────────

  github: {
    '*': {
      owner: `What this field is: The GitHub username or organization that owns the repository.
Example: alice (personal) or mycompany (organization)
Where to find it: It is the first part of your repository URL: github.com/OWNER/repo-name.`,
      repo: `What this field is: The repository name (just the name, not the full URL).
Example: my-project or backend-api
Where to find it: It is the second part of your repository URL: github.com/owner/REPO-NAME.`,
    },
    create_issue: {
      title: `What this field is: The issue title — shown in the issues list.
Example: Bug: Login page crashes on Safari iOS 17 or Feature: Add CSV export to Reports`,
      body: `What this field is: Detailed description of the issue or feature.
Example: Steps to reproduce: 1) Open Safari on iOS 17, 2) Navigate to /login, 3) Click the Login button — the page crashes. Expected: Should log in. Browser console shows: TypeError at line 42.`,
      labels: `What this field is: Labels to tag the issue for easier filtering.
Format: JSON array of label names.
Example: ["bug","high-priority"] or ["enhancement","frontend"]
Labels must already exist in the repository.`,
    },
    create_pr: {
      title: `What this field is: The pull request title.
Example: Fix: Resolve login page crash on Safari iOS 17`,
      head: `What this field is: The branch containing your changes.
Example: fix/safari-login-crash`,
      base: `What this field is: The branch to merge INTO — usually main or develop.
Example: main`,
    },
  },


  paypal: {
    charge: {
      amount: `What this field is: The payment amount as a decimal number (NOT in cents like Stripe).
Example: 20.00 for $20.00 or 149.99 for $149.99.`,
      currency: `What this field is: 3-letter currency code.
Examples: USD, EUR, GBP, CAD, AUD, INR, JPY.`,
    },
  },


  woocommerce: {
    '*': {
      orderId: `What this field is: The WooCommerce order number.
Where to find it: WooCommerce Admin → Orders — the # column shows order IDs.
Example: 1234`,
    },
  },

  wordpress: {
    create_post: {
      title: `What this field is: The blog post or page title.
Example: 10 Tips for Better Email Marketing`,
      content: `What this field is: The full body content of the post. Supports HTML.
Example: <p>Welcome to our guide.</p><h2>Why this matters</h2><p>{{$json.introText}}</p>`,
      status: `What this field is: Whether to publish or save as draft.
Options: publish (immediately live), draft (saved but not visible), private (only visible to admins).
Example: publish`,
    },
  },

  dropbox: {
    upload: {
      path: `What this field is: The destination file path within your Dropbox.
Example: /Reports/2025/January/report.pdf or /Uploads/{{$json.fileName}}`,
    },
  },

  onedrive: {
    upload: {
      path: `What this field is: The destination folder path in OneDrive.
Example: /Documents/Reports/2025`,
    },
  },

  ftp: {
    '*': {
      host: `What this field is: The FTP server address.
Example: ftp.yourcompany.com or 192.168.1.100`,
      port: `What this field is: The FTP server port. Default is 21 for FTP, 22 for SFTP.`,
      path: `What this field is: The file path on the FTP server.
Example: /public_html/uploads/report.pdf`,
    },
  },

  sftp: {
    '*': {
      host: `What this field is: The SFTP server hostname or IP address.
Example: sftp.yourcompany.com or 192.168.1.100`,
      path: `What this field is: The file path on the SFTP server.
Example: /home/user/uploads/report.pdf`,
    },
  },

  xero: {
    '*': {
      tenantId: `What this field is: Your Xero organisation (tenant) ID.
Where to find it: After connecting to Xero, the tenant ID is returned in the OAuth response. It is a UUID like 550e8400-e29b-41d4-a716-446655440000.`,
    },
    create_invoice: {
      contact: `What this field is: The customer this invoice is for.
Format: JSON object with a ContactID or Name.
Example: {"ContactID":"ABC123"} or {"Name":"Acme Corp"}`,
      lineItems: `What this field is: The products or services on the invoice.
Format: JSON array. Each item needs description, quantity, and unit amount.
Example: [{"Description":"Consulting services","Quantity":10,"UnitAmount":150.00}]`,
    },
  },

  chargebee: {
    create_subscription: {
      planId: `What this field is: The Chargebee plan/item price ID that the customer is subscribing to.
Where to find it: Chargebee Dashboard → Product Catalog → Plans or Items → copy the plan ID.
Example: pro-monthly or startup-annual`,
      customerId: `What this field is: The Chargebee customer ID to create the subscription for.
Example: AzZlHpMXd8IpUQ or use {{$json.chargebeeCustomerId}} from a previous step.`,
    },
  },

  typeform: {
    '*': {
      formId: `What this field is: The unique ID of your Typeform.
Where to find it: Open the form in Typeform → the ID is in the URL after /forms/.
Example: If URL is typeform.com/to/FORM_ID, enter FORM_ID.`,
    },
  },

  calendly: {
    '*': {
      eventTypeUri: `What this field is: The unique URI of the Calendly event type.
Where to find it: Calendly API response or the event type URL in your Calendly dashboard.
Example: https://api.calendly.com/event_types/ABCDEFGH`,
    },
  },

  contentful: {
    '*': {
      spaceId: `What this field is: Your Contentful space ID — identifies your content workspace.
Where to find it: Contentful Dashboard → Settings → General Settings → Space ID.
Example: abcd1234efgh`,
      accessToken: `What this field is: A Contentful CMA personal access token used for Content Management API calls.
Where to find it: Contentful -> Settings -> CMA tokens -> Create personal access token.
Important: After creating the token, click Authorize on the token row and grant access to the target organization/space.
Troubleshooting: OrganizationAccessGrantRequired means the token is valid but not authorized for that organization/space.
Example: CFPAT-...`,
      contentTypeId: `What this field is: The content type to work with.
Example: blogPost or product or author`,
    },
  },

  zendesk: {
    '*': {
      subdomain: `What this field is: Your Zendesk subdomain — the part before .zendesk.com in your URL.
Example: If your Zendesk is at acme.zendesk.com, enter acme.`,
    },
  },

  netlify: {
    deploy: {
      siteId: `What this field is: Your Netlify site ID.
Where to find it: Netlify Dashboard → your site → Site Settings → General → Site details → Site ID.
Example: 12345678-abcd-efgh-ijkl-123456789012`,
    },
  },

  vercel: {
    deploy: {
      projectId: `What this field is: Your Vercel project ID.
Where to find it: Vercel Dashboard → your project → Settings → General → Project ID.
Example: prj_xxxxxxxxxxxxxxxxxxxxxxxx`,
    },
  },

  pinecone: {
    '*': {
      indexName: `What this field is: The name of your Pinecone vector index.
Where to find it: Pinecone Console (app.pinecone.io) → Indexes → copy the index name.
Example: my-embeddings or product-search`,
      namespace: `What this field is: An optional namespace to organize vectors within an index.
Leave blank to use the default namespace. Example: production or test`,
    },
    upsert: {
      vectors: `What this field is: The vectors to store in Pinecone.
Format: JSON array. Each vector needs an id, values (the embedding array), and optional metadata.
Example: [{"id":"doc-123","values":[0.1,0.2,0.3,...],"metadata":{"source":"website","category":"FAQ"}}]`,
    },
    query: {
      vector: `What this field is: The query vector — an array of numbers representing your search query.
Example: [0.1,0.2,0.3,...] — usually generated by an AI embedding model from your search text.`,
      topK: `What this field is: How many similar results to return.
Example: 5 returns the 5 most similar vectors.`,
    },
  },

  google_bigquery: {
    query: {
      query: `What this field is: The BigQuery SQL query to run.
Example: SELECT customer_id, SUM(amount) as total FROM my_dataset.orders WHERE DATE(created_at) = CURRENT_DATE() GROUP BY customer_id ORDER BY total DESC LIMIT 100`,
      projectId: `What this field is: Your Google Cloud project ID.
Where to find it: Google Cloud Console → top left dropdown — your project ID is shown there.
Example: my-company-analytics-prod`,
    },
  },

  oracle_database: {
    query: {
      query: `What this field is: The Oracle SQL query to run.
Example: SELECT * FROM customers WHERE status = :1 AND created_date > :2
Use :1, :2 for bind variables (parameters).`,
      parameters: `What this field is: Values for :1, :2 bind variables in your Oracle query.
Format: JSON array.
Example: ["ACTIVE","2025-01-01"]`,
    },
  },

  sql_server: {
    query: {
      query: `What this field is: The T-SQL query to run against SQL Server.
Example: SELECT TOP 100 * FROM customers WHERE status = @status AND created_at > @date
Use @paramName for parameters.`,
      parameters: `What this field is: Values for @paramName placeholders.
Format: JSON object.
Example: {"status":"active","date":"2025-01-01"}`,
    },
  },

  timescaledb: {
    query: {
      query: `What this field is: A PostgreSQL/TimescaleDB query.
Example: SELECT time_bucket('1 hour', time) AS hour, avg(temperature) FROM sensor_data WHERE time > NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour`,
    },
  },

  odoo: {
    '*': {
      model: `What this field is: The Odoo model (object type) to work with.
Examples: res.partner (contacts), sale.order (sales), account.move (invoices), product.product (products), stock.picking (inventory).`,
    },
  },

  intercom: {
    create_contact: {
      email: `What this field is: The contact's email address.
Example: customer@example.com`,
      name: `What this field is: The contact's full name.
Example: Alice Kumar`,
    },
    create_message: {
      body: `What this field is: The message content to send to the contact.
Example: Hi {{$json.name}}, welcome to our platform! Let us know if you need any help getting started.`,
    },
  },

  mailchimp: {
    add_subscriber: {
      listId: `What this field is: Your Mailchimp audience (list) ID.
Where to find it: Mailchimp → Audience → All contacts → Settings → Audience name and defaults → Audience ID.
Example: a1b2c3d4e5`,
      email: `What this field is: The subscriber's email address.
Example: subscriber@example.com`,
    },
  },

  activecampaign: {
    create_contact: {
      email: `What this field is: The contact's email address.
Example: contact@example.com`,
      firstName: `What this field is: The contact's first name.
Example: Alice`,
      lastName: `What this field is: The contact's last name.
Example: Kumar`,
    },
  },

  read_binary_file: {
    default: {
      filePath: `What this field is: The full file path of the file to read.
Example: /uploads/reports/january.pdf or C:\\Users\\user\\Documents\\report.pdf
Tip: Use this before an AWS S3 Upload node or email attachment to load the file content.`,
    },
  },

  write_binary_file: {
    default: {
      filePath: `What this field is: Where to save the file, including the full path and filename.
Example: /output/reports/summary.pdf or /tmp/export-{{$json.date}}.csv`,
    },
  },

};
