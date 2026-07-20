import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose the real GitLab issue action. Read/List Issues reads project issues, and Create Issue opens a new issue.',
  helpText: richFieldHelp({
    what: 'The action CtrlChecks asks GitLab to perform for this step.',
    why: 'The runtime only supports issue reading and issue creation for this GitLab action node today, so the selected value decides which GitLab endpoint is called.',
    when: 'Fill it for every GitLab node run before setting the issue-specific fields.',
    enter: 'Choose Read/List Issues to list issues or read one Issue IID, or choose Create Issue to open a new issue.',
    source: 'This value comes from the dropdown in the node panel, not from GitLab itself.',
    later: 'Downstream steps can branch on {{$json.success}} or on whether output contains {{$json.items}}, {{$json.issue}}, or {{$json.created}}.',
    format: 'Dropdown value read or create.',
    example: 'Choose Create Issue when a failed deployment should open a GitLab issue for the platform team.',
    empty: 'If it is empty, runtime falls back to read. Unsupported old values return _error with Supported: create, read.',
    mistake: 'Do not choose old merge request, pipeline, branch, or file operation values; this executor does not implement them.',
  }),
  options: ['Read/List Issues', 'Create Issue'],
  defaultValue: 'read',
};

const accessTokenField: FieldDoc = {
  name: 'GitLab Access Token',
  internalKey: 'accessToken',
  type: 'password',
  required: false,
  description: 'GitLab PAT or OAuth token. Runtime also checks the saved gitlab credential vault key when this field is blank.',
  helpText: richFieldHelp({
    what: 'The GitLab access token used to authorize the API call.',
    why: 'GitLab rejects issue reads and creates unless the token can access the project.',
    when: 'Use a saved GitLab connection when possible; fill this direct field only for a controlled manual workflow or migration.',
    enter: 'A GitLab PAT such as glpat-... or an OAuth access token with api access for private projects.',
    source: 'Create PATs in GitLab User Settings -> Access Tokens, or select a GitLab connection stored in CtrlChecks Connections.',
    later: 'The token is only used for this API request and is not returned to later nodes.',
    format: 'Secret string; do not include Bearer because runtime adds the Bearer header.',
    example: 'A release workflow uses a saved GitLab connection owned by the DevOps service account.',
    empty: 'If no direct token or saved gitlab credential is found, output includes _error: GitLab: access token not found.',
    mistake: 'Do not paste a pipeline trigger token here; this action node does not trigger pipelines.',
  }),
  placeholder: 'glpat-...',
  notes: 'Prefer Connections. Secrets should not be stored in ordinary workflow text fields.',
};

const baseUrlField: FieldDoc = {
  name: 'GitLab API URL',
  internalKey: 'baseUrl',
  type: 'url',
  required: false,
  description: 'GitLab API base URL. Defaults to https://gitlab.com/api/v4.',
  helpText: richFieldHelp({
    what: 'The root API URL for the GitLab instance.',
    why: 'Runtime appends /projects/{projectId}/issues to this value, so it must already include /api/v4.',
    when: 'Leave the default for GitLab.com; change it only for self-managed GitLab.',
    enter: 'Use https://gitlab.com/api/v4 or https://gitlab.company.com/api/v4.',
    source: 'Copy your GitLab instance URL from the browser and add /api/v4 if it is not already there.',
    later: 'It is not returned directly, but it determines which GitLab server creates or reads the issue.',
    format: 'HTTPS URL with no trailing slash. Include /api/v4.',
    example: 'https://gitlab.company.com/api/v4 for a company-hosted GitLab instance.',
    empty: 'If empty, runtime uses https://gitlab.com/api/v4.',
    mistake: 'Do not enter https://gitlab.com only; that points runtime at the wrong path.',
  }),
  placeholder: 'https://gitlab.com/api/v4',
  defaultValue: 'https://gitlab.com/api/v4',
};

const projectIdField: FieldDoc = {
  name: 'Project ID',
  internalKey: 'projectId',
  type: 'string',
  required: true,
  description: 'GitLab numeric project ID or project path. Runtime also accepts legacy repo as a fallback.',
  helpText: richFieldHelp({
    what: 'The GitLab project that contains the issues you want to read or create.',
    why: 'Every supported GitLab runtime call is scoped to one project.',
    when: 'Fill it for both Read/List Issues and Create Issue.',
    enter: 'A numeric project ID like 12345, or a path such as group%2Fproject. Plain group/project can also work because runtime URL-encodes the value.',
    source: 'Find the numeric ID in GitLab project Settings -> General, or copy the group/project path from the project URL.',
    later: 'Use the same value in later GitLab issue steps that should work in the same project.',
    format: 'Text or number. Do not paste the whole project URL.',
    example: 'acme-platform%2Fbilling-api for the billing API project.',
    empty: 'If empty, runtime returns _error: GitLab: projectId (or repo) is required.',
    mistake: 'Do not use a repository display name if the actual URL slug is different.',
  }),
  placeholder: '12345 or group%2Fproject',
};

const repoField: FieldDoc = {
  name: 'Repository Alias',
  internalKey: 'repo',
  type: 'string',
  required: false,
  description: 'Legacy backend alias for Project ID. Runtime uses repo only when projectId is empty.',
  helpText: richFieldHelp({
    what: 'An older backend alias for the GitLab project identifier.',
    why: 'The generated backend schema still includes repo, and runtime falls back to it when Project ID is blank.',
    when: 'Leave it empty in the visual editor. Use Project ID instead unless an older AI-generated workflow already maps repo.',
    enter: 'The same value you would enter in Project ID: a numeric project ID or project path.',
    source: 'Find the value in GitLab project Settings -> General or from the project URL path.',
    later: 'Later steps should read GitLab output fields, not this alias.',
    format: 'Text or number. A path may be group%2Fproject.',
    example: 'acme-platform%2Fbilling-api as a fallback for Project ID.',
    empty: 'If Project ID is filled, this field is ignored. If both are empty, runtime returns _error: GitLab: projectId (or repo) is required.',
    mistake: 'Do not fill both Project ID and Repository Alias with different projects.',
  }),
  placeholder: 'Use Project ID instead',
  notes: 'Prefer projectId. This exists to document the backend alias and prevent older generated workflows from being mysterious.',
};

const issueIidField: FieldDoc = {
  name: 'Issue IID',
  internalKey: 'issueIid',
  type: 'string',
  required: false,
  description: 'Project-scoped GitLab issue number. Used only by Read/List Issues.',
  helpText: richFieldHelp({
    what: 'The issue number inside the selected GitLab project.',
    why: 'Read/List Issues changes behavior based on this field: filled means get one issue, blank means list recent issues.',
    when: 'Fill it when you need one known issue; leave it blank to list up to 50 issues.',
    enter: 'Only the number after /-/issues/ in the GitLab issue URL.',
    source: 'Open the GitLab issue and copy 42 from a URL like /-/issues/42, or map {{$json.issueIid}} from a trigger.',
    later: 'The returned issue can provide {{$json.issue.iid}}, {{$json.issue.title}}, and related fields to later steps.',
    format: 'Digits as text or number, without #.',
    example: '42 for https://gitlab.com/acme/app/-/issues/42.',
    empty: 'When empty on read, runtime calls the list issues endpoint and returns items instead of issue.',
    mistake: 'Do not use the global issue id; GitLab issue URLs usually show the IID this node needs.',
  }),
  placeholder: '42',
};

const titleField: FieldDoc = {
  name: 'Issue Title',
  internalKey: 'title',
  type: 'string',
  required: true,
  description: 'Issue title for Create Issue.',
  helpText: richFieldHelp({
    what: 'The short GitLab issue title.',
    why: 'GitLab requires a title before it can create an issue.',
    when: 'Fill it for Create Issue. It is ignored by Read/List Issues.',
    enter: 'A clear sentence describing the problem or task.',
    source: 'Type a fixed title, or map an alert, form, or test failure title such as {{$json.errorTitle}}.',
    later: 'The created issue title is returned in {{$json.created.title}} for notifications or records.',
    format: 'Plain text. Keep it short enough for a GitLab issue list.',
    example: 'Checkout API returns 500 for premium plan upgrades.',
    empty: 'For Create Issue, runtime returns _error: GitLab create issue: title is required.',
    mistake: 'Do not put the full issue description here; use Issue Description for details.',
  }),
  placeholder: 'Checkout API returns 500',
};

const descriptionTextField: FieldDoc = {
  name: 'Issue Description',
  internalKey: 'descriptionText',
  type: 'textarea',
  required: false,
  description: 'Issue description for Create Issue.',
  helpText: richFieldHelp({
    what: 'The longer body text for the new GitLab issue.',
    why: 'It gives engineers context such as steps to reproduce, customer impact, and links.',
    when: 'Fill it for Create Issue when a title alone is not enough. It is ignored by Read/List Issues.',
    enter: 'Plain text or Markdown with the useful details from the workflow.',
    source: 'Type it manually, or map values like {{$json.errorDetails}}, {{$json.customerEmail}}, or {{$json.deployUrl}} from earlier steps.',
    later: 'The created issue body is returned inside {{$json.created.description}} when GitLab includes it.',
    format: 'Text string. Runtime sends it as GitLab API field description.',
    example: 'Customer acme@example.com saw payment failure after checkout deploy 2026.7.18.',
    empty: 'If empty, the issue is still created with no description.',
    mistake: 'Do not use the old field key description; runtime reads descriptionText for this node.',
  }),
  placeholder: 'Steps, impact, and useful links.',
};

const commonFields = [operationField, accessTokenField, baseUrlField, projectIdField, repoField, issueIidField, titleField, descriptionTextField];

export const gitlabDoc: NodeDoc = {
  slug: 'gitlab',
  displayName: 'GitLab',
  category: 'DevOps',
  logoUrl: '/icons/nodes/gitlab.svg',
  description: 'Read GitLab project issues or create new GitLab issues from workflow data. This action node is issue-only today; GitLab triggers handle incoming webhook events separately.',
  credentialType: 'GitLab Personal Access Token or GitLab OAuth',
  credentialSetupSteps: [
    'What this is: A GitLab Personal Access Token or GitLab OAuth connection lets CtrlChecks call the GitLab API without storing the token as a normal workflow value.',
    'Where to start: In GitLab, open User Settings -> Access Tokens, or connect GitLab OAuth in CtrlChecks Connections.',
    'Permissions: Use api scope for private project issue creation and reading; read_api may be enough for read-only issue listing in some setups.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> GitLab and save the token or OAuth grant in the credential vault.',
    'Test it: The connection test should be able to call the GitLab user endpoint such as gitlab.com/api/v4/user.',
    'Workflow wiring: Connect the output of this GitLab node to the next step through the outgoing line, then configure that next service node with its own account connection.',
    'Important: Service nodes after this GitLab step still need their own account connection; a GitLab token cannot send Slack messages or create Jira issues.',
  ],
  credentialDocsUrl: 'https://docs.gitlab.com/user/profile/personal_access_tokens/',
  resources: [
    {
      name: 'Issues',
      description: 'Runtime-supported GitLab issue operations. Other GitLab project, pipeline, merge request, branch, and file actions are not implemented by this action node today.',
      operations: [
        {
          name: 'Read/List Issues',
          value: 'read',
          description: 'Read/List Issues calls GitLab project issues. Leave Issue IID blank to list up to 50 recent project issues, or fill Issue IID to retrieve exactly one project issue.',
          fields: commonFields,
          outputExample: {
            success: true,
            items: [{ iid: 42, title: 'Checkout API returns 500', state: 'opened', web_url: 'https://gitlab.com/acme/app/-/issues/42' }],
          },
          outputDescription: 'success: true when GitLab accepted the request. items: array returned when Issue IID is blank. issue: single issue object returned when Issue IID is filled. _error and _errorDetails appear on validation or GitLab API failure.',
          usageExample: {
            scenario: 'List open GitLab issues each morning before sending an engineering status summary.',
            inputValues: { operation: 'read', projectId: 'acme%2Fbilling-api', accessToken: '{{$credentials.gitlab.accessToken}}' },
            expectedOutput: 'Use {{$json.items[0].title}} or {{$json.issue.title}} in the next reporting step.',
          },
          externalDocsUrl: 'https://docs.gitlab.com/api/issues/',
        },
        {
          name: 'Create Issue',
          value: 'create',
          description: 'Create Issue opens a new issue in one GitLab project using Title and optional Issue Description. The runtime sends only title and descriptionText to the GitLab issues endpoint.',
          fields: commonFields,
          outputExample: {
            success: true,
            created: { iid: 43, title: 'Checkout API returns 500', state: 'opened', web_url: 'https://gitlab.com/acme/app/-/issues/43' },
          },
          outputDescription: 'success: true when GitLab created the issue. created: raw GitLab issue object. _error and _errorDetails appear when title, projectId, token, or GitLab permissions are wrong.',
          usageExample: {
            scenario: 'Create a GitLab issue automatically when a production health check reports a critical API failure.',
            inputValues: { operation: 'create', projectId: '12345', title: '{{$json.errorTitle}}', descriptionText: '{{$json.errorDetails}}', accessToken: '{{$credentials.gitlab.accessToken}}' },
            expectedOutput: 'Send {{$json.created.web_url}} to the incident Slack channel after the issue is created.',
          },
          externalDocsUrl: 'https://docs.gitlab.com/api/issues/#new-issue',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'GitLab: projectId (or repo) is required',
      cause: 'Project ID is empty, or the mapped value from a previous step resolved to nothing.',
      fix: 'Enter a numeric GitLab project ID or project path such as group%2Fproject.',
    },
    {
      error: 'GitLab: access token not found. Connect GitLab or provide accessToken.',
      cause: 'No direct accessToken was provided and no saved gitlab credential was found in the credential vault.',
      fix: 'Save a GitLab connection in CtrlChecks Connections, or provide an accessToken for this controlled workflow.',
    },
    {
      error: 'GitLab create issue: title is required',
      cause: 'Create Issue was selected but Issue Title is blank.',
      fix: 'Map a title from the upstream alert or type a fixed issue title.',
    },
    {
      error: 'GitLab: Unsupported operation "<operation>". Supported: create, read',
      cause: 'An old UI or generated workflow used a merge request, pipeline, branch, file, update, or delete operation value.',
      fix: 'Change Operation to Read/List Issues or Create Issue. Use another integration path for unsupported GitLab actions.',
    },
    {
      error: 'GitLab list issues failed (<status>) or GitLab get issue failed (<status>)',
      cause: 'The token lacks project access, the Project ID is wrong, or the GitLab API URL is missing /api/v4.',
      fix: 'Verify the token scope, project access, Project ID, and GitLab API URL, then retry.',
    },
  ],
  relatedNodes: ['gitlab_trigger', 'github', 'bitbucket', 'jira', 'jenkins'],
};
