import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const field = (name: string, internalKey: string, type: FieldDoc['type'], required: boolean, description: string, example: string, extra: Partial<FieldDoc> = {}): FieldDoc => ({
  name,
  internalKey,
  type,
  required,
  description,
  helpText: richFieldHelp({
    what: description,
    why: `Jira needs ${name} so the selected issue, project, search, transition, or comment request is sent to the right place.`,
    when: required ? `Fill ${name} for the operations that require it before running the node.` : `Fill ${name} only when the selected Jira operation uses it.`,
    enter: example,
    source: `Type a fixed value, copy it from Jira, or map it from an earlier step such as {{$json.${internalKey}}}.`,
    later: `Use the Jira output in later steps with expressions such as {{$json.issueKey}}, {{$json.issue}}, {{$json.issues}}, {{$json.projects}}, or {{$json.commentId}} depending on the operation.`,
    format: type === 'json' ? 'Valid JSON in the format shown by the placeholder.' : 'Plain text unless the field label says number or JSON.',
    example,
    empty: required ? `${name} being empty causes a Jira validation _error before or after the API request.` : `${name} can be empty when the selected operation does not use it; Jira may reject it if that operation expects the value.`,
    mistake: `Do not paste a full Jira page URL unless this field specifically asks for one; most fields need the key, ID, domain, or text only.`,
  }),
  placeholder: example,
  example,
  ...extra,
});

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose which Jira issue or project action to run.',
  helpText: richFieldHelp({
    what: 'The Jira action this node performs.',
    why: 'Runtime normalizes create_issue, get_issue, update_issue, delete_issue, search_issues, add_comment, transition_issue, and get_projects into the matching Jira REST API calls.',
    when: 'Fill it for every Jira node run.',
    enter: 'Choose Create Issue, Update Issue, Get Issue, Delete Issue, Search Issues, Transition Issue, Add Comment, or Get Projects.',
    source: 'This value comes from the dropdown in the node panel.',
    later: 'Later steps can branch on {{$json.success}} and use operation-specific fields like {{$json.issue}}, {{$json.issueKey}}, {{$json.issues}}, {{$json.comment}}, or {{$json.projects}}.',
    format: 'Dropdown value such as create_issue or search_issues.',
    example: 'Choose Add Comment when a support approval note should be written back to the Jira issue.',
    empty: 'If empty, runtime falls back toward create behavior and may require Project Key and Summary.',
    mistake: 'Do not use Get Transitions; this node can perform a transition but does not list valid transition IDs.',
  }),
  options: ['Create Issue', 'Update Issue', 'Get Issue', 'Delete Issue', 'Search Issues', 'Transition Issue', 'Add Comment', 'Get Projects'],
  defaultValue: 'create_issue',
};

const domainField = field('Jira Domain', 'domain', 'string', true, 'Atlassian site domain used to build the Jira REST API base URL.', 'yourcompany.atlassian.net');
const projectKeyField = field('Project Key', 'projectKey', 'string', false, 'Jira project key required when creating an issue.', 'PROJ');
const issueKeyField = field('Issue Key', 'issueKey', 'string', false, 'Human-readable Jira issue key required for get, update, delete, transition, and comment operations.', 'PROJ-123');
const summaryField = field('Issue Summary', 'summary', 'string', false, 'Short title for a new or updated Jira issue.', 'Payment webhook fails for annual renewals');
const descriptionField = field('Issue Description', 'description', 'textarea', false, 'Plain-text issue body; runtime converts it to Atlassian Document Format automatically.', 'Customer impact, steps to reproduce, and useful links.');
const issueTypeField = field('Issue Type', 'issueType', 'string', false, 'Jira issue type name used when creating an issue. Runtime defaults to Task.', 'Bug', { defaultValue: 'Task' });
const assigneeField = field('Assignee Account ID', 'assignee', 'string', false, 'Jira Cloud accountId to assign during Create Issue.', '557058:abcd-1234');
const priorityField: FieldDoc = {
  ...field('Priority', 'priority', 'select', false, 'Jira priority name sent on create or update.', 'High', { defaultValue: 'Medium' }),
  options: ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
  notes: 'Options: Highest for severe blockers, High for urgent work, Medium for normal priority, Low for minor work, and Lowest for backlog or low-risk updates.',
};
const labelsField = field('Labels', 'labels', 'json', false, 'JSON array of Jira label names attached during Create Issue.', '["bug","customer-impact"]');
const transitionIdField = field('Transition ID', 'transitionId', 'string', false, 'Jira workflow transition ID required for Transition Issue.', '31');
const commentBodyField = field('Comment Body', 'commentBody', 'textarea', false, 'Comment text required for Add Comment; runtime converts it to Atlassian Document Format.', 'Reviewed by support; customer confirmed the workaround.');
const jqlField = field('JQL Query', 'jql', 'string', false, 'Jira Query Language string required for Search Issues.', 'project = PROJ AND status = "In Progress"');
const maxResultsField = field('Max Results', 'maxResults', 'number', false, 'Maximum issues returned by Search Issues. Runtime defaults to 50.', '50', { defaultValue: '50' });

const commonFields = [
  operationField,
  domainField,
  projectKeyField,
  issueKeyField,
  summaryField,
  descriptionField,
  issueTypeField,
  assigneeField,
  priorityField,
  labelsField,
  transitionIdField,
  commentBodyField,
  jqlField,
  maxResultsField,
];

const op = (
  name: string,
  value: string,
  description: string,
  outputExample: Record<string, unknown>,
  outputDescription: string,
  inputValues: Record<string, string>,
): NodeDoc['resources'][number]['operations'][number] => ({
  name,
  value,
  description,
  fields: commonFields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} in Jira as part of a workplace automation where issue data must move cleanly into later workflow steps.`,
    inputValues: { operation: value, domain: 'acme.atlassian.net', ...inputValues },
    expectedOutput: `Use {{$json.success}} and operation-specific Jira fields from this output in the next workflow step.`,
  },
  externalDocsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
});

export const jiraDoc: NodeDoc = {
  slug: 'jira',
  displayName: 'Jira',
  category: 'DevOps',
  logoUrl: '/icons/nodes/jira.svg',
  description: 'Create, read, update, delete, search, transition, and comment on Jira Cloud issues using a Jira API-token connection.',
  credentialType: 'Jira API Token',
  credentialSetupSteps: [
    'What this is: The Jira connection stores your Atlassian email, Jira API Token, and domain in the CtrlChecks credential vault.',
    'Where to start: Create an API token at id.atlassian.com/manage-profile/security/api-tokens.',
    'Permissions: The Atlassian account must be able to browse projects, create issues, edit issues, transition issues, and add comments for the projects this workflow touches.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Jira and save Email Address, API Token, and Domain.',
    'Test it: The connection should be able to call rest/api/3/myself on your Jira site.',
    'Important: The action node uses Basic Auth from the saved connection. Service node outputs can feed downstream nodes, but those downstream nodes still need their own service node account connection.',
  ],
  credentialDocsUrl: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  resources: [
    {
      name: 'Issues And Projects',
      description: 'Jira Cloud issue and project operations implemented in the legacy executor.',
      operations: [
        op(
          'Create Issue',
          'create_issue',
          'Create Issue posts a new issue to one Jira project. Runtime requires Project Key and Summary, defaults Issue Type to Task, converts Description to ADF, and can include Priority, Assignee, and Labels.',
          { success: true, issueKey: 'PROJ-42', issueId: '10001', created: { id: '10001', key: 'PROJ-42' } },
          'success: true when Jira created the issue. issueKey and issueId identify the new issue. created contains the raw Jira create response. _error and _errorDetails appear on validation or API failure.',
          { projectKey: 'PROJ', summary: '{{$json.errorTitle}}', description: '{{$json.errorDetails}}', issueType: 'Bug', priority: 'High' },
        ),
        op(
          'Get Issue',
          'get_issue',
          'Get Issue retrieves one Jira issue by Issue Key and returns the raw issue object under issue while preserving the incoming workflow fields.',
          { success: true, issue: { key: 'PROJ-42', fields: { summary: 'Login fails', status: { name: 'In Progress' } } } },
          'success: true when Jira returned the issue. issue contains the raw Jira issue object. _error and _errorDetails appear if issueKey is missing or Jira rejects the request.',
          { issueKey: '{{$json.issueKey}}' },
        ),
        op(
          'Update Issue',
          'update_issue',
          'Update Issue changes summary, description, or priority on an existing Jira issue. Runtime requires Issue Key and at least one of Summary, Description, or Priority.',
          { success: true, updated: true, issueKey: 'PROJ-42' },
          'success: true when Jira accepted the update. updated confirms the write and issueKey echoes the target issue. _error and _errorDetails appear on validation or API failure.',
          { issueKey: 'PROJ-42', summary: 'Updated customer impact summary', priority: 'Highest' },
        ),
        op(
          'Delete Issue',
          'delete_issue',
          'Delete Issue removes one Jira issue by Issue Key. Use it only for workflows where deletion is approved and reversible records are not required.',
          { success: true, deleted: true, issueKey: 'PROJ-42' },
          'success: true when Jira deleted the issue. deleted is true and issueKey echoes the deleted issue. _error and _errorDetails appear on permission or not-found failures.',
          { issueKey: 'PROJ-42' },
        ),
        op(
          'Search Issues',
          'search_issues',
          'Search Issues posts a JQL query to /rest/api/3/search/jql and returns matching issues plus the reported total. Runtime requests common fields such as summary and status.',
          { success: true, total: 2, issues: [{ key: 'PROJ-42', fields: { summary: 'Login fails' } }] },
          'success: true when Jira returned search results. total is the Jira total and issues is the issue array. _error and _errorDetails appear when jql is missing or invalid.',
          { jql: 'project = PROJ AND status = "In Progress"', maxResults: '25' },
        ),
        op(
          'Transition Issue',
          'transition_issue',
          'Transition Issue moves an existing issue through a Jira workflow transition. Runtime requires Issue Key and Transition ID; it does not discover transition IDs for you.',
          { success: true, transitioned: true, issueKey: 'PROJ-42', transitionId: '31' },
          'success: true when Jira accepted the transition. transitioned is true and issueKey/transitionId identify what changed. _error and _errorDetails appear on invalid transition or permissions.',
          { issueKey: 'PROJ-42', transitionId: '31' },
        ),
        op(
          'Add Comment',
          'add_comment',
          'Add Comment writes a comment to one Jira issue. Runtime requires Issue Key and Comment Body and converts the plain text body to Atlassian Document Format.',
          { success: true, commentId: '10002', comment: { id: '10002', body: { type: 'doc' } } },
          'success: true when Jira created the comment. commentId identifies the comment and comment contains the raw Jira comment response. _error and _errorDetails appear on validation or API failure.',
          { issueKey: 'PROJ-42', commentBody: '{{$json.approvalNote}}' },
        ),
        op(
          'Get Projects',
          'get_projects',
          'Get Projects lists Jira projects visible to the connected account and maps each project to key, id, name, and type.',
          { success: true, projects: [{ key: 'PROJ', id: '10000', name: 'Product Engineering', type: 'software' }] },
          'success: true when Jira returned projects. projects is an array of project summaries. _error and _errorDetails appear when the credential cannot list projects.',
          { maxResults: '50' },
        ),
      ],
    },
  ],
  commonErrors: [
    { error: 'Jira: domain is required (e.g., yourcompany.atlassian.net)', cause: 'Domain is blank or not injected from the Jira credential.', fix: 'Enter your Atlassian domain without https:// or reconnect Jira in Connections.' },
    { error: 'Jira: email is required - connect your Jira account in the credential selector.', cause: 'The saved Jira credential did not provide an email or username.', fix: 'Reconnect Jira with the email used to sign in to Atlassian.' },
    { error: 'Jira: API token not found - connect your Jira account in the credential selector.', cause: 'The saved Jira credential did not provide apiToken or password.', fix: 'Create an Atlassian API token and save it in Connections.' },
    { error: 'Jira create_issue: projectKey and summary are required', cause: 'Create Issue is missing Project Key or Issue Summary.', fix: 'Fill both fields, or map them from the trigger/input step.' },
    { error: 'Jira update_issue: provide at least one of summary, description, or priority', cause: 'Update Issue was selected but no change fields were filled.', fix: 'Set Summary, Description, or Priority before running the node.' },
    { error: 'Jira search_issues: jql query is required (e.g., project = PROJ AND status = "In Progress")', cause: 'Search Issues was selected without JQL.', fix: 'Build a JQL query in Jira Advanced Search and paste it into JQL Query.' },
    { error: 'Jira transition_issue: transitionId is required. Use Get Transitions to find valid IDs.', cause: 'Transition Issue was selected without a Transition ID.', fix: 'Look up the transition ID from Jira or a prior API step and map it here.' },
  ],
  relatedNodes: ['jira_trigger', 'gitlab', 'github', 'jenkins', 'slack_message'],
};
