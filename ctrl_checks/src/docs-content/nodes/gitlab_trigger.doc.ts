import type { NodeDoc } from '../types';

export const gitlabTriggerDoc: NodeDoc = {
  slug: 'gitlab_trigger',
  displayName: 'GitLab Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Gitlab.svg',
  description: 'Start workflows from GitLab project webhooks for push, tag push, issue, merge request, note/comment, pipeline, job, and release events.',
  credentialType: 'GitLab Personal Access Token or GitLab OAuth',
  credentialSetupSteps: [
    'Create a GitLab Personal Access Token with the api scope at gitlab.com/-/user_settings/personal_access_tokens, or connect GitLab with OAuth scopes read_user and api.',
    'Save the token or OAuth connection in Connections so CtrlChecks can validate it with the GitLab user endpoint at https://gitlab.com/api/v4/user.',
    'Add GitLab Trigger to the workflow, set GitLab URL and Project ID, then save and activate the workflow.',
    'CtrlChecks registers a project webhook through the GitLab API endpoint /api/v4/projects/:id/hooks and stores the hook ID plus generated X-Gitlab-Token shared secret.',
    'GitLab does not send an HMAC signature for these webhook deliveries. It echoes the plain shared secret in X-Gitlab-Token, and CtrlChecks compares that header to the stored secret.',
    'Connect the trigger output to the next service node. GitLab action nodes, Slack alerts, email, CRM, database, or ticketing nodes still need their own account connection or credential.',
  ],
  credentialDocsUrl: 'https://docs.gitlab.com/user/profile/personal_access_tokens/',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives GitLab webhook deliveries, validates the X-Gitlab-Token shared secret, filters event type and keyword text, and emits a normalized event payload.',
      operations: [
        {
          name: 'Receive event',
          value: 'receive',
          description: 'Receive GitLab project webhook deliveries for the configured project, validate the shared X-Gitlab-Token secret, ignore inactive or non-matching deliveries, normalize GitLab payloads, and start one workflow execution for each accepted event.',
          fields: [
            {
              name: 'GitLab Connection',
              internalKey: 'connectionId',
              type: 'string',
              required: false,
              description: 'Optional saved GitLab credential reference used when the workspace has more than one GitLab connection.',
              helpText: `What this field means: GitLab Connection points to the saved GitLab Personal Access Token or GitLab OAuth account that can create project webhooks. The visual panel usually uses the active GitLab connection rather than asking you to type this ID.
Why it matters: CtrlChecks needs this connection when it calls the GitLab API to register or replace the project webhook and when it validates the account with /api/v4/user.
When to fill it: Leave it blank in normal visual workflows. Use a specific saved connection only when your workspace has more than one GitLab account or self-managed GitLab connection.
What to enter: Select or reference the saved GitLab connection. Do not paste a PAT, OAuth access token, account password, or pipeline trigger token as workflow input data.
Where the value comes from: Connections stores it after GitLab OAuth or GitLab Personal Access Token setup with the api scope.
How to use it later: This setup value is not emitted as {{$json.connectionId}}; downstream nodes use event fields such as {{$json.projectId}}, {{$json.issueTitle}}, {{$json.mrTitle}}, and {{$json.noteBody}}.
Accepted format: Saved connection reference such as gitlab_pat_123 or gitlab_oauth_123.
Real workplace example: A platform team uses the GitLab connection owned by the release manager so CtrlChecks can register a webhook on acme-platform/api-service.
If it is empty or wrong: Empty falls back to the active GitLab credential lookup; a wrong or inactive connection can cause No active GitLab connection found or GitLab API permission errors.
Common mistake to avoid: Pasting the raw glpat token into the trigger instead of saving it in Connections.`,
              example: 'gitlab_pat_123',
            },
            {
              name: 'GitLab URL',
              internalKey: 'baseUrl',
              type: 'url',
              required: false,
              description: 'GitLab instance base URL. Use https://gitlab.com for GitLab.com or your self-managed GitLab host.',
              helpText: `What this field means: GitLab URL is the base address of the GitLab instance that owns the project.
Why it matters: CtrlChecks builds API requests under this URL, such as /api/v4/projects/:id/hooks, and stores the same base URL with the registered webhook state.
When to fill it: Leave the default for GitLab.com. Change it only for a self-managed GitLab instance or dedicated GitLab domain.
What to enter: Enter the root URL, such as https://gitlab.com or https://gitlab.company.com, without /api/v4, project paths, issues, or merge request URLs.
Where the value comes from: Use the browser origin you use to open the GitLab project or the official self-managed GitLab domain from your administrator.
How to use it later: This setup value is not emitted as a separate output field; use {{$json.projectId}} and {{$json.projectName}} downstream to identify the project.
Accepted format: HTTPS URL root. The runtime trims trailing slashes and defaults to https://gitlab.com when empty.
Real workplace example: A company using self-managed GitLab enters https://gitlab.acme.internal so webhook registration calls https://gitlab.acme.internal/api/v4/projects/:id/hooks.
If it is empty or wrong: Empty uses GitLab.com. A wrong host can produce GitLab API error responses, failed registration, or webhooks registered on the wrong GitLab instance.
Common mistake to avoid: Pasting the full project URL or API URL instead of the GitLab instance root.`,
              placeholder: 'https://gitlab.com',
              example: 'https://gitlab.com',
              defaultValue: 'https://gitlab.com',
            },
            {
              name: 'Project ID',
              internalKey: 'projectId',
              type: 'string',
              required: true,
              description: 'GitLab project numeric ID or URL-encoded project path.',
              helpText: `What this field means: Project ID tells CtrlChecks which GitLab project should own the webhook.
Why it matters: GitLab project webhooks are created per project, so the trigger cannot register or filter deliveries without this exact project identifier.
When to fill it: Always fill it before saving or activating a GitLab Trigger.
What to enter: Use the numeric project ID from GitLab project settings, or a URL-encoded path such as acme-platform%2Fapi-service.
Where the value comes from: Open the project in GitLab, check Settings -> General for the Project ID, or URL-encode the group/project path from the project URL.
How to use it later: The trigger output includes {{$json.projectId}} and usually {{$json.projectName}} so downstream messages, tickets, logs, or GitLab action nodes can refer to the same project.
Accepted format: Numeric text such as 12345, or URL-encoded namespace path such as acme-platform%2Fapi-service.
Real workplace example: For https://gitlab.com/acme-platform/api-service, the team enters 456789 or acme-platform%2Fapi-service.
If it is empty or wrong: Validation returns A GitLab project ID (or URL-encoded path) is required, auto-registration may record A GitLab Project ID is required (set it on the GitLab Trigger node), or GitLab returns a 404/403.
Common mistake to avoid: Entering group/project with an unencoded slash when the GitLab API expects group%2Fproject.`,
              placeholder: '12345 or group%2Fproject',
              example: '12345',
            },
            {
              name: 'Event Types',
              internalKey: 'eventTypes',
              type: 'string',
              required: false,
              description: 'Comma-separated GitLab object_kind values that may start the workflow.',
              helpText: `What this field means: Event Types tells CtrlChecks which normalized GitLab events to subscribe to and accept.
Why it matters: Pushes, tag pushes, issues, merge requests, comments, pipelines, jobs, and releases usually need different workflow paths.
When to fill it: Keep the default while testing. Narrow it before production if the workflow should react only to issues, merge requests, comments, pipelines, releases, or pushes.
What to enter: Use GitLab object_kind values such as push, tag_push, issue, merge_request, note, pipeline, job, or release. Separate multiple values with commas.
Where the value comes from: Choose from GitLab project webhook event families and the business event your team wants to automate.
How to use it later: Use {{$json.eventType}} to branch. Push events expose ref and commits, issue events expose issueIid and issueTitle, merge_request events expose mrIid and mrTitle, and note events expose noteBody.
Accepted format: Comma-separated text or an array in generated config. Empty defaults to push, issue, merge_request, note.
Real workplace example: issue, merge_request starts an engineering triage workflow, while push, pipeline starts a CI follow-up workflow.
If it is empty or wrong: Empty defaults to push, issue, merge_request, note. Unsupported or misspelled values cause deliveries to be ignored with Ignored GitLab event not matching this trigger.
Common mistake to avoid: Typing friendly labels like comments or merge requests instead of GitLab object_kind values such as note and merge_request.`,
              placeholder: 'push, issue, merge_request, note',
              example: 'issue, merge_request',
              defaultValue: 'push, issue, merge_request, note',
            },
            {
              name: 'Webhook Secret Override',
              internalKey: 'secretToken',
              type: 'string',
              required: false,
              description: 'Optional shared secret override for the X-Gitlab-Token webhook header.',
              helpText: `What this field means: Webhook Secret Override is optional setup-only text for the X-Gitlab-Token shared secret.
Why it matters: GitLab does not sign these webhook requests with HMAC. It echoes this plain shared secret in the X-Gitlab-Token header, and CtrlChecks accepts the request only when the header matches.
When to fill it: Leave it blank for normal workflows because CtrlChecks generates and stores a random secret during registration. Fill it only for a controlled migration or manually managed webhook where your team must reuse a known GitLab secret token.
What to enter: A long random shared secret from your admin or password manager, not a GitLab PAT, OAuth token, account password, or CI/CD pipeline trigger token.
Where the value comes from: Usually CtrlChecks creates it. If you override it, enter the same value in the Secret token field of the GitLab project webhook.
How to use it later: It is setup-only and is never emitted as {{$json.secretToken}} for downstream nodes.
Accepted format: Plain secret text. The visual field uses a supported text control even though the value should be treated as secret setup material.
Real workplace example: A DevOps admin migrates an existing GitLab project webhook and temporarily reuses the approved X-Gitlab-Token shared secret while switching the URL to CtrlChecks.
If it is empty or wrong: Empty uses the generated stored secret; a wrong manual value returns Invalid or missing X-Gitlab-Token secret and no workflow execution.
Common mistake to avoid: Calling this an HMAC signing secret. GitLab sends a shared header token for project webhooks, not X-Hub-Signature-256.`,
              example: 'Leave blank',
            },
            {
              name: 'Keyword Filter',
              internalKey: 'query',
              type: 'string',
              required: false,
              description: 'Optional case-insensitive keyword filter against normalized GitLab event text.',
              helpText: `What this field means: Keyword Filter lets only GitLab events whose normalized text contains a word or phrase start the workflow.
Why it matters: Busy projects can produce many webhook deliveries; this filter keeps a workflow focused on urgent issues, security merge requests, release notes, pipeline statuses, or comment bodies.
When to fill it: Use it when the workflow should react only to a phrase such as urgent, sev1, billing, security, or release-candidate. Leave it blank to accept every configured event type.
What to enter: A simple keyword or short phrase, not GitLab search syntax.
Where the value comes from: Pick the label, customer name, module name, severity term, branch term, or release keyword your team uses in commit messages, issue titles, merge request titles, comments, pipeline text, or release names.
How to use it later: The accepted event output still includes {{$json.text}} plus event-specific fields such as {{$json.issueTitle}}, {{$json.mrTitle}}, {{$json.noteBody}}, {{$json.ref}}, or {{$json.commits}} for downstream routing.
Accepted format: Plain text case-insensitive contains match.
Real workplace example: security starts only security-related issue, merge request, comment, and push workflows.
If it is empty or wrong: Empty accepts all configured event types; a too-specific or misspelled filter returns Ignored GitLab event not matching this trigger.
Common mistake to avoid: Expecting label:bug, project:group/name, or GitLab advanced search syntax here; this is only a simple text contains filter.`,
              placeholder: 'urgent',
              example: 'security',
            },
          ],
          outputExample: {
            eventId: '987654321',
            eventType: 'issue',
            source: 'gitlab',
            userId: '42',
            username: 'asha',
            text: 'Bug: billing export fails for July invoices',
            timestamp: '2026-07-19T10:20:00.000Z',
            projectId: '12345',
            projectName: 'acme-platform/api-service',
            action: 'open',
            ref: null,
            commits: null,
            issueIid: 42,
            issueTitle: 'Bug: billing export fails for July invoices',
            issueUrl: 'https://gitlab.com/acme-platform/api-service/-/issues/42',
            mrIid: null,
            mrTitle: null,
            mrUrl: null,
            mrState: null,
            noteBody: null,
            noteUrl: null,
            raw: { object_kind: 'issue', project: { path_with_namespace: 'acme-platform/api-service' } },
            trigger: 'gitlab',
            workflow_id: 'workflow_123',
            node_id: 'gitlab-trigger-1',
            sessionId: 'gitlab_workflow_123_987654321',
            _gitlab: true,
          },
          outputDescription: 'eventId: normalized event identifier. eventType: GitLab object_kind such as push, tag_push, issue, merge_request, note, pipeline, job, or release. source: gitlab. userId/username: actor identity when available. text: normalized commit message, issue title, merge request title, note body, pipeline status, release name, or fallback text. timestamp: ISO event time when available. projectId/projectName: project identity. action: issue/MR/pipeline/release action or status when present. ref: branch or tag for push, tag_push, merge_request, and pipeline events. commits: push or tag push commit list. issueIid/issueTitle/issueUrl: issue fields. mrIid/mrTitle/mrUrl/mrState: merge request fields. noteBody/noteUrl: comment fields. raw: original GitLab payload. trigger/workflow_id/node_id/sessionId/_gitlab: CtrlChecks trigger metadata.',
          usageExample: {
            scenario: 'Triage new GitLab issues and merge requests with AI, then post a team alert with the project link',
            inputValues: {
              connectionId: '',
              baseUrl: 'https://gitlab.com',
              projectId: '12345',
              eventTypes: 'issue, merge_request, note',
              secretToken: '',
              query: 'billing',
            },
            expectedOutput: 'Use {{$json.eventType}} to branch issue, merge_request, and note events; use {{$json.issueTitle}}, {{$json.mrTitle}}, or {{$json.noteBody}} as AI input; and include {{$json.issueUrl}} or {{$json.mrUrl}} in the alert.',
          },
          externalDocsUrl: 'https://docs.gitlab.com/user/project/integrations/webhooks/',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'A GitLab project ID (or URL-encoded path) is required.',
      cause: 'The trigger configuration is missing the required Project ID before validation or activation.',
      fix: 'Open the GitLab Trigger node and enter the numeric Project ID or URL-encoded project path, such as group%2Fproject.',
    },
    {
      error: 'A GitLab Project ID is required (set it on the GitLab Trigger node).',
      cause: 'Auto-registration ran while the workflow was active but the trigger node did not have a usable Project ID.',
      fix: 'Set Project ID, save the workflow, and activate it again so CtrlChecks can register the project webhook.',
    },
    {
      error: 'No active GitLab connection found. Save a GitLab Personal Access Token (with "api" scope) in Connections first.',
      cause: 'The workflow owner has not connected GitLab, the saved credential is inactive, or the token cannot manage project webhooks.',
      fix: 'Save a valid GitLab Personal Access Token with api scope or reconnect GitLab OAuth in Connections, then re-activate the workflow.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to register GitLab webhooks.',
      cause: 'The worker cannot build the public callback URL used in GitLab project webhook settings.',
      fix: 'Set PUBLIC_BASE_URL to the reachable CtrlChecks worker URL before activating the workflow.',
    },
    {
      error: 'Invalid or missing X-Gitlab-Token secret.',
      cause: 'GitLab did not send the shared X-Gitlab-Token header or the value did not match the stored/generated secret. This is not an HMAC signature failure.',
      fix: 'Re-register the webhook or update GitLab project webhook settings so the Secret token exactly matches the CtrlChecks stored secret.',
    },
    {
      error: 'Workflow is not active.',
      cause: 'GitLab delivered a webhook to a workflow that is saved but currently inactive.',
      fix: 'Activate the workflow before testing project webhook deliveries.',
    },
    {
      error: 'Ignored non-actionable GitLab payload.',
      cause: 'The incoming JSON payload did not include a GitLab object_kind that CtrlChecks can normalize.',
      fix: 'Confirm the project webhook is sending GitLab events, then inspect the raw payload and enabled event families.',
    },
    {
      error: 'Ignored GitLab event not matching this trigger.',
      cause: 'The delivery was valid, but eventTypes or Keyword Filter excluded it.',
      fix: 'Check Event Types for exact values such as issue, merge_request, note, push, tag_push, pipeline, job, or release, and loosen the keyword filter while testing.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to execute GitLab-triggered workflows.',
      cause: 'The webhook was accepted but the worker could not create a public execution callback context.',
      fix: 'Set PUBLIC_BASE_URL on the worker and retry the GitLab webhook delivery.',
    },
    {
      error: 'GitLab Trigger node not found in this workflow.',
      cause: 'The webhook URL points to a node ID that is missing or is no longer a GitLab Trigger node.',
      fix: 'Regenerate/register the webhook after moving, replacing, or deleting trigger nodes.',
    },
    {
      error: 'Next node cannot find GitLab trigger fields',
      cause: 'The downstream node is reading a field that only exists on another event type, or it is using an outdated field name.',
      fix: 'Branch on {{$json.eventType}} first and map fields such as {{$json.issueTitle}}, {{$json.mrTitle}}, {{$json.noteBody}}, {{$json.ref}}, or {{$json.commits}} only where they exist.',
    },
    {
      error: 'Permission denied after GitLab Trigger',
      cause: 'The trigger started the workflow, but a downstream GitLab action, Slack, email, CRM, database, or ticketing node is missing its own credential or service permission.',
      fix: 'Connect the required service account for the downstream node. The GitLab Trigger connection only receives project webhook events.',
    },
  ],
  relatedNodes: ['gitlab', 'ai_agent', 'slack_message', 'email'],
};
