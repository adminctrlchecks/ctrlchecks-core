import type { FieldDoc, NodeDoc, OperationDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationHelp = richFieldHelp({
  what: 'The Linear action this node will run.',
  why: 'Each option calls a different Linear GraphQL query or mutation and changes which ID fields are required.',
  when: 'Required for every Linear node.',
  enter: 'Choose create_issue, update_issue, get_issue, list_issues, or get_teams from the dropdown.',
  source: 'Select the action in the node panel. Runtime also accepts older camelCase aliases such as createIssue and getTeams.',
  later: 'The output includes {{$json.operation}} plus issue, issues, teams, data, and count when that operation returns them.',
  format: 'One of create_issue, update_issue, get_issue, list_issues, or get_teams.',
  example: 'Run get_teams first, then use {{$json.teams[0].id}} in a later create_issue step.',
  empty: 'Runtime defaults to list_issues or returns success false for unsupported values.',
  mistake: 'Using a display label like "Create Issue" in imported JSON instead of the stored value create_issue.',
});

const apiKeyHelp = richFieldHelp({
  what: 'An optional Linear Personal API Key fallback for this one node.',
  why: 'The runtime needs a Linear token from Connections or this field before it can call Linear GraphQL.',
  when: 'Leave blank when Linear is saved in Connections. Fill only for a legacy workflow or quick test.',
  enter: 'A Linear Personal API Key from Linear Settings, API, Personal API Keys.',
  source: 'Prefer CtrlChecks Connections, which stores the key in the credential vault; Linear shows personal API keys at linear.app/settings/api.',
  later: 'Do not map this secret as {{$json.apiKey}} into downstream nodes. Reuse the saved Linear connection instead.',
  format: 'Secret token string. Treat it like a password.',
  example: 'Save the engineering workspace key in Connections and keep this field empty.',
  empty: 'Runtime looks for saved credentials named linear, linear_api_key, or linear_oauth2. If none exists it returns success false with a connection required message.',
  mistake: 'Pasting a Linear token into a normal workflow field, screenshot, or example instead of the Connections credential vault.',
});

const teamIdHelp = richFieldHelp({
  what: 'The Linear team UUID that owns or filters issues.',
  why: 'create_issue must know which Linear team should receive the new issue; list_issues can use it to filter to one team.',
  when: 'Required for create_issue. Optional for list_issues. Not needed for get_teams.',
  enter: 'A team UUID returned by Linear, not the team key shown in issue identifiers.',
  source: 'Run get_teams first and map {{$json.teams[0].id}}, or copy the team UUID from Linear API data.',
  later: 'Use the returned team id in later create_issue steps as {{$json.teams[0].id}}.',
  format: 'Linear UUID string such as 2a0a8b31-1111-4222-9333-111111111111.',
  example: 'Create support handoff issues in the Support team with teamId {{$json.supportTeamId}}.',
  empty: 'create_issue returns success false saying teamId and title are required. list_issues falls back to the connected user assigned issues.',
  mistake: 'Using the team key like ENG instead of the UUID id returned by get_teams.',
});

const issueIdHelp = richFieldHelp({
  what: 'The Linear issue UUID to read or update.',
  why: 'get_issue and update_issue need the exact issue record id so Linear knows which issue to target.',
  when: 'Required for get_issue and update_issue.',
  enter: 'Use the id field returned by list_issues, get_issue, or create_issue.',
  source: 'Map {{$json.issue.id}} after create_issue, or {{$json.issues[0].id}} after list_issues.',
  later: 'Downstream nodes can keep using {{$json.issue.id}} or {{$json.issue.identifier}} after Linear returns the issue.',
  format: 'Linear UUID id. The runtime query accepts a String id.',
  example: 'Update the issue created earlier with issueId {{$json.issue.id}}.',
  empty: 'Runtime returns success false with Linear get_issue requires issueId or Linear update_issue requires issueId.',
  mistake: 'Using the visible issue key like ENG-123 when the workflow has the UUID available.',
});

const titleHelp = richFieldHelp({
  what: 'The issue title shown in Linear.',
  why: 'create_issue cannot create a useful issue without a title; update_issue can use it to rename an issue.',
  when: 'Required for create_issue. Optional for update_issue.',
  enter: 'Short plain text, usually mapped from a form, alert, ticket, or bug report.',
  source: 'Type a fixed title or map data such as {{$json.title}}, {{$json.subject}}, or {{$json.alertName}}.',
  later: 'Linear returns the created or updated issue under {{$json.issue.title}}.',
  format: 'Plain text string. Keep it concise.',
  example: 'Bug: checkout fails for {{$json.customerSegment}} customers.',
  empty: 'create_issue returns success false because teamId and title are required. update_issue simply leaves the title unchanged when blank.',
  mistake: 'Putting the full bug report in Title instead of using Description for longer context.',
});

const descriptionHelp = richFieldHelp({
  what: 'The Markdown body of the Linear issue.',
  why: 'It gives engineers the context, reproduction steps, customer details, or acceptance criteria.',
  when: 'Optional for create_issue and update_issue.',
  enter: 'Markdown text typed manually or mapped from an upstream summary.',
  source: 'Map values from previous nodes, such as {{$json.description}}, {{$json.aiSummary}}, or {{$json.customerImpact}}.',
  later: 'Linear returns the issue object under {{$json.issue}}; downstream messages can link to {{$json.issue.url}}.',
  format: 'Markdown/plain text string.',
  example: 'Steps to reproduce: {{$json.steps}}. Customer impact: {{$json.impact}}.',
  empty: 'The issue is created or updated without body details, which may leave the team without context.',
  mistake: 'Sending raw JSON into Description when the team expects readable Markdown.',
});

const stateIdHelp = richFieldHelp({
  what: 'The Linear workflow state UUID to set on an issue.',
  why: 'It lets the workflow create or update an issue directly into a specific state such as Triage or In Progress.',
  when: 'Optional for create_issue and update_issue.',
  enter: 'A Linear workflow state id from your workspace.',
  source: 'Copy from Linear API data or a prior lookup; this node does not list states itself.',
  later: 'The returned issue includes state data under {{$json.issue.state}} when Linear returns it.',
  format: 'Linear UUID string.',
  example: 'Move a reopened customer issue to the triage state with stateId {{$json.triageStateId}}.',
  empty: 'Linear applies its default state on create or leaves the state unchanged on update.',
  mistake: 'Typing the state name "In Progress" instead of the state UUID.',
});

const priorityHelp = richFieldHelp({
  what: 'The numeric Linear priority for the issue.',
  why: 'It controls how urgent the issue appears in Linear.',
  when: 'Optional for create_issue and update_issue.',
  enter: '0 for none, 1 urgent, 2 high, 3 medium, or 4 low.',
  source: 'Choose a fixed number or map a normalized priority from an earlier step such as {{$json.priorityNumber}}.',
  later: 'Linear returns the priority under {{$json.issue.priority}} when issue data is returned.',
  format: 'Number: 0, 1, 2, 3, or 4.',
  example: 'Map severity P1 alerts to priority 1 and normal requests to priority 3.',
  empty: 'Runtime sends 0 by default, or leaves priority at no priority.',
  mistake: 'Using labels like high or urgent instead of Linear numeric priority values.',
});

const fields: FieldDoc[] = [
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Choose the Linear action to run.', helpText: operationHelp, options: ['create_issue', 'update_issue', 'get_issue', 'list_issues', 'get_teams'], defaultValue: 'create_issue', example: 'create_issue' },
  { name: 'API Key', internalKey: 'apiKey', type: 'password', required: false, description: 'Optional Linear token fallback; prefer a saved Linear connection.', helpText: apiKeyHelp, placeholder: 'Optional if saved in Connections', example: 'Stored in Connections' },
  { name: 'Team ID', internalKey: 'teamId', type: 'string', required: false, description: 'Linear team UUID for creating or filtering issues.', helpText: teamIdHelp, placeholder: '2a0a8b31-1111-4222-9333-111111111111', example: '{{$json.teams[0].id}}' },
  { name: 'Issue ID', internalKey: 'issueId', type: 'string', required: false, description: 'Linear issue UUID used by get and update operations.', helpText: issueIdHelp, placeholder: 'issue uuid', example: '{{$json.issue.id}}' },
  { name: 'Issue Title', internalKey: 'title', type: 'string', required: false, description: 'Issue title for create or update.', helpText: titleHelp, placeholder: 'Bug: checkout fails', example: '{{$json.title}}' },
  { name: 'Issue Description', internalKey: 'description', type: 'textarea', required: false, description: 'Markdown issue description.', helpText: descriptionHelp, placeholder: 'Steps to reproduce...', example: '{{$json.description}}' },
  { name: 'Workflow State ID', internalKey: 'stateId', type: 'string', required: false, description: 'Optional Linear state UUID for create or update.', helpText: stateIdHelp, placeholder: 'state uuid', example: '{{$json.stateId}}' },
  { name: 'Priority', internalKey: 'priority', type: 'number', required: false, description: 'Linear priority number.', helpText: priorityHelp, defaultValue: '0', example: '2' },
];

const outputDescription = 'On success, runtime preserves incoming fields and adds success, operation, data, and depending on the operation issue, issues, teams, and count. Failures preserve incoming fields and return success false with error. GraphQL errors are joined into the error string.';

const makeOperation = (operation: {
  name: string;
  value: string;
  description: string;
  inputValues: Record<string, string>;
  outputExample: Record<string, unknown>;
  scenario: string;
  expectedOutput: string;
}): OperationDoc => ({
  name: operation.name,
  value: operation.value,
  description: operation.description,
  fields,
  outputExample: operation.outputExample,
  outputDescription,
  usageExample: {
    scenario: operation.scenario,
    inputValues: operation.inputValues,
    expectedOutput: operation.expectedOutput,
  },
  externalDocsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
});

export const linearDoc: NodeDoc = {
  slug: 'linear',
  displayName: 'Linear',
  category: 'Productivity',
  logoUrl: '/integrations-logos/Linear.svg',
  description: 'Create, update, fetch, and list Linear issues and teams through the Linear GraphQL API.',
  credentialType: 'Linear Personal API Key Connection',
  credentialSetupSteps: [
    'What this is: The Linear node uses a saved Linear Personal API Key connection so CtrlChecks can call Linear without exposing the key in workflow fields.',
    'Where to start: In Linear, open linear.app/settings/api, then create a Personal API Key for the workspace that owns the teams and issues.',
    'How to connect: In CtrlChecks, open Connections, choose Add Connection, select Linear, and save the Personal API Key in the credential vault.',
    'What is stored: CtrlChecks stores the Linear token in Connections. The visible API Key field is only an optional fallback for old workflows.',
    'What not to store: Do not paste Linear API keys into normal workflow fields, examples, screenshots, comments, or downstream nodes.',
    'Test it: Run Get Teams. A healthy connection returns teams and count, and later nodes can map {{$json.teams[0].id}}.',
    'Connect the output or outgoing line to the next node that should use returned Linear data such as issue, issues, teams, or count.',
    'Every downstream service node still needs its own account connection; the Linear service node account connection does not authenticate Trello, Slack, Notion, or email nodes.',
  ],
  credentialDocsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
  resources: [
    {
      name: 'Issues and teams',
      description: 'Use Linear operations to discover teams, create issues, update issues, fetch one issue, or list issues assigned to the connected user or one team.',
      operations: [
        makeOperation({
          name: 'Get Teams',
          value: 'get_teams',
          description: 'List Linear teams visible to the connected account. Use this as a discovery step before creating issues, because create_issue needs a team UUID rather than the short team key.',
          inputValues: { operation: 'get_teams', apiKey: 'Use saved Linear connection', teamId: '', issueId: '', title: '', description: '', stateId: '', priority: '0' },
          outputExample: { success: true, operation: 'get_teams', data: { teams: { nodes: [{ id: 'team-uuid', name: 'Engineering', key: 'ENG' }] } }, teams: [{ id: 'team-uuid', name: 'Engineering', key: 'ENG' }], count: 1 },
          scenario: 'Find the Engineering team UUID before creating issues from customer bug reports.',
          expectedOutput: 'The next Linear step can use {{$json.teams[0].id}} as Team ID.',
        }),
        makeOperation({
          name: 'List Issues',
          value: 'list_issues',
          description: 'List up to 50 issues. When Team ID is filled, it lists issues for that team; when Team ID is blank, runtime lists issues assigned to the connected Linear user.',
          inputValues: { operation: 'list_issues', apiKey: 'Use saved Linear connection', teamId: '{{$json.teams[0].id}}', issueId: '', title: '', description: '', stateId: '', priority: '0' },
          outputExample: { success: true, operation: 'list_issues', issues: [{ id: 'issue-uuid', identifier: 'ENG-123', title: 'Checkout bug', url: 'https://linear.app/acme/issue/ENG-123' }], count: 1 },
          scenario: 'Pull open team issues before sending a daily engineering digest.',
          expectedOutput: 'Downstream nodes can loop over {{$json.issues}} and link to {{$json.issues[0].url}}.',
        }),
        makeOperation({
          name: 'Get Issue',
          value: 'get_issue',
          description: 'Fetch one Linear issue by issue UUID. Use this after a trigger, list, or create step when the workflow needs the current title, state, assignee, team, priority, and URL.',
          inputValues: { operation: 'get_issue', apiKey: 'Use saved Linear connection', teamId: '', issueId: '{{$json.issue.id}}', title: '', description: '', stateId: '', priority: '0' },
          outputExample: { success: true, operation: 'get_issue', issue: { id: 'issue-uuid', identifier: 'ENG-123', title: 'Checkout bug', state: { id: 'state-uuid', name: 'Triage' } } },
          scenario: 'Read an issue before deciding whether a support escalation should update it.',
          expectedOutput: 'A later condition can check {{$json.issue.state.name}} or send {{$json.issue.url}} to a notification node.',
        }),
        makeOperation({
          name: 'Create Issue',
          value: 'create_issue',
          description: 'Create a Linear issue in a specific team. Runtime requires Team ID and Issue Title, and optionally sends Markdown description, workflow state id, and numeric priority.',
          inputValues: { operation: 'create_issue', apiKey: 'Use saved Linear connection', teamId: '{{$json.teamId}}', issueId: '', title: '{{$json.title}}', description: '{{$json.description}}', stateId: '{{$json.stateId}}', priority: '2' },
          outputExample: { success: true, operation: 'create_issue', issue: { id: 'issue-uuid', identifier: 'ENG-124', title: 'Bug: checkout fails', url: 'https://linear.app/acme/issue/ENG-124' } },
          scenario: 'Create an engineering task from a high-priority customer support ticket.',
          expectedOutput: 'The created issue is available as {{$json.issue}}, including {{$json.issue.id}}, {{$json.issue.identifier}}, and {{$json.issue.url}}.',
        }),
        makeOperation({
          name: 'Update Issue',
          value: 'update_issue',
          description: 'Update an existing Linear issue by UUID. Use it to change the title, description, state, or priority after another workflow step decides the issue needs to move.',
          inputValues: { operation: 'update_issue', apiKey: 'Use saved Linear connection', teamId: '', issueId: '{{$json.issue.id}}', title: '{{$json.newTitle}}', description: '{{$json.updatedDescription}}', stateId: '{{$json.doneStateId}}', priority: '3' },
          outputExample: { success: true, operation: 'update_issue', issue: { id: 'issue-uuid', identifier: 'ENG-123', title: 'Checkout bug - reproduced', priority: 3 } },
          scenario: 'Move a reproduced bug into the correct workflow state after QA confirms the issue.',
          expectedOutput: 'The updated issue is returned as {{$json.issue}}, and downstream nodes can reference {{$json.issue.identifier}} in a message.',
        }),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Linear connection required',
      cause: 'No saved Linear credential was found and apiKey, token, and accessToken were empty.',
      fix: 'Save a Linear Personal API Key in Connections, then run Get Teams to test the account connection.',
    },
    {
      error: 'Linear create_issue requires teamId and title',
      cause: 'The Create Issue operation was selected without a Linear team UUID or issue title.',
      fix: 'Run Get Teams and map {{$json.teams[0].id}} into Team ID, then map or type a non-empty title.',
    },
    {
      error: 'Linear get_issue requires issueId',
      cause: 'Get Issue was selected but Issue ID was empty or mapped from a missing upstream field.',
      fix: 'Use the UUID from {{$json.issue.id}} or {{$json.issues[0].id}}, not only the display identifier.',
    },
    {
      error: 'Linear update_issue requires issueId',
      cause: 'Update Issue needs the exact issue UUID before it can send changes to Linear.',
      fix: 'Fetch or create the issue first, then map {{$json.issue.id}} into Issue ID.',
    },
    {
      error: 'Unsupported Linear operation',
      cause: 'The operation value is not create_issue, update_issue, get_issue, list_issues, get_teams, or a supported legacy alias.',
      fix: 'Choose one of the visible dropdown options and keep imported workflow JSON aligned to the stored values.',
    },
    {
      error: 'Linear API error or GraphQL errors',
      cause: 'Linear rejected the token, permissions, field value, team id, state id, or GraphQL request.',
      fix: 'Reconnect Linear, verify the workspace access, and confirm IDs came from Linear API output.',
    },
  ],
  relatedNodes: ['linear_trigger', 'trello', 'jira', 'clickup', 'notion'],
};
