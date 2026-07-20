import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Choose whether to create a Vercel deployment or list deployments.',
  helpText: richFieldHelp({
    what: 'The Vercel deployment action this node performs.',
    why: 'Runtime validates this field before making any Vercel API call.',
    when: 'Fill it for every Vercel node run.',
    enter: 'Choose Deploy Project to POST /v13/deployments, or List Deployments to GET /v13/deployments.',
    source: 'This comes from the operation dropdown in the node panel.',
    later: 'The output shape depends on the operation: Deploy Project returns {{$json.data.deploymentId}}, while List Deployments returns {{$json.data.deployments}}.',
    format: 'Dropdown value deploy or list_deployments.',
    example: 'Choose Deploy Project after a GitHub release workflow is approved.',
    empty: 'If empty or unsupported, runtime returns success false with error.code INVALID_OPERATION.',
    mistake: 'Do not enter status or cancel operation values; this node only deploys or lists deployments.',
  }),
  options: ['Deploy Project', 'List Deployments'],
  defaultValue: 'deploy',
};

const projectNameField: FieldDoc = {
  name: 'Project Name',
  internalKey: 'projectName',
  type: 'string',
  required: false,
  description: 'Vercel project name required for Deploy Project.',
  helpText: richFieldHelp({
    what: 'The Vercel project name to deploy.',
    why: 'Runtime sends it as the name in the /v13/deployments request.',
    when: 'Fill it for Deploy Project. Leave it blank for List Deployments.',
    enter: 'A project name using letters, numbers, hyphens, or underscores.',
    source: 'Copy the project name from Vercel, or map a value from a previous step such as {{$json.projectName}}.',
    later: 'Deploy output echoes it as {{$json.data.projectName}}.',
    format: '1 to 128 characters, alphanumeric plus hyphen and underscore.',
    example: 'customer-portal-web for a production frontend project.',
    empty: 'For deploy, runtime returns success false with error.code INVALID_PROJECT_NAME and message Project name is required for deploy operation.',
    mistake: 'Do not paste a Vercel deployment URL; this field wants the project name only.',
  }),
  placeholder: 'my-app',
};

const tokenField: FieldDoc = {
  name: 'Token',
  internalKey: 'token',
  type: 'password',
  required: true,
  description: 'Vercel API token. Runtime can also resolve it from a saved vercel credential.',
  helpText: richFieldHelp({
    what: 'The Vercel API token used to authenticate deployment API calls.',
    why: 'Vercel rejects deployment requests without a valid Bearer token.',
    when: 'Use a saved Vercel connection whenever possible; fill this direct field only for controlled manual workflows.',
    enter: 'A Vercel personal token, or leave blank when a saved Vercel connection should inject it.',
    source: 'Create it in Vercel Account Settings -> Tokens, or save it in CtrlChecks Connections.',
    later: 'The token is not returned in output. Later nodes use deployment IDs and URLs from {{$json.data}}.',
    format: 'Secret string. Runtime accepts vercel_... tokens or long alphanumeric token strings.',
    example: 'A Vercel token from a service account that can deploy the customer portal project.',
    empty: 'If no direct token or saved credential is found, runtime returns success false with error.code MISSING_TOKEN.',
    mistake: 'Do not include the word Bearer; runtime adds the Authorization header.',
  }),
  placeholder: 'vercel_***',
  notes: 'Prefer Connections so the token is stored in the credential vault.',
};

const fields = [operationField, projectNameField, tokenField];

export const vercelDoc: NodeDoc = {
  slug: 'vercel',
  displayName: 'Vercel',
  category: 'DevOps',
  logoUrl: '/icons/nodes/vercel.svg',
  description: 'Deploy a Vercel project or list deployments through the Vercel v13 deployments API.',
  credentialType: 'Vercel API Key',
  credentialSetupSteps: [
    'What this is: A Vercel API token lets CtrlChecks create deployments and list deployment history without storing the token as a normal workflow value.',
    'Where to start: In Vercel, open Account Settings -> Tokens and create a token for the account or team that owns the project.',
    'Permissions: Use a token that can read deployments and create deployments for the target project.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Vercel and save the token in the credential vault.',
    'Test it: Run List Deployments and confirm Vercel returns deployments from api.vercel.com/v13/deployments.',
    'Workflow wiring: Connect the output of this Vercel node to the next step through the outgoing line, then configure that next service node with its own account connection.',
    'Important: Service nodes after Vercel still need their own account connection; a Vercel token cannot send Slack, email, GitHub, or Jira updates.',
  ],
  credentialDocsUrl: 'https://vercel.com/docs/rest-api',
  resources: [
    {
      name: 'Deployments',
      description: 'Runtime-supported Vercel deployment operations.',
      operations: [
        {
          name: 'Deploy Project',
          value: 'deploy',
          description: 'Deploy Project validates Operation, Token, and Project Name, then posts to /v13/deployments with { name: projectName }. Output is normalized into success, data, and error.',
          fields,
          outputExample: { success: true, data: { deploymentId: 'dpl_abc123', projectName: 'customer-portal', url: 'customer-portal-abc.vercel.app', status: 'QUEUED', createdAt: '2026-07-20T09:00:00.000Z' }, error: null },
          outputDescription: 'success: true when Vercel accepts the deploy. data.deploymentId, data.projectName, data.url, data.status, and data.createdAt summarize the deployment. error is null on success; error.code/message/retriable/details appear on failure.',
          usageExample: {
            scenario: 'Deploy the customer portal to Vercel after a release approval workflow passes all checks.',
            inputValues: { operation: 'deploy', projectName: '{{$json.projectName}}', token: '{{$credentials.vercel.token}}' },
            expectedOutput: 'Share {{$json.data.url}} and track {{$json.data.deploymentId}} in the release notification.',
          },
          externalDocsUrl: 'https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment',
        },
        {
          name: 'List Deployments',
          value: 'list_deployments',
          description: 'List Deployments validates the token and calls /v13/deployments. Runtime maps the Vercel response into an array of deployment summaries and a total count.',
          fields,
          outputExample: { success: true, data: { deployments: [{ id: 'dpl_abc123', projectName: 'customer-portal', url: 'customer-portal.vercel.app', status: 'READY', createdAt: '2026-07-20T09:00:00.000Z' }], total: 1 }, error: null },
          outputDescription: 'success: true when Vercel returns deployments. data.deployments contains id, projectName, url, status, createdAt, and optional creator. data.total is the number mapped. error is null on success; error.code/message/retriable/details appear on failure.',
          usageExample: {
            scenario: 'List recent deployments before sending a deployment health summary to the engineering team.',
            inputValues: { operation: 'list_deployments', projectName: '', token: '{{$credentials.vercel.token}}' },
            expectedOutput: 'Use {{$json.data.deployments[0].status}} and {{$json.data.total}} in the summary message.',
          },
          externalDocsUrl: 'https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'INVALID_OPERATION', cause: 'Operation is blank or not deploy/list_deployments.', fix: 'Choose Deploy Project or List Deployments from the dropdown.' },
    { error: 'MISSING_TOKEN', cause: 'No token field value and no saved vercel credential were available.', fix: 'Save a Vercel connection in Connections or provide a token for this workflow.' },
    { error: 'INVALID_TOKEN_FORMAT', cause: 'The provided token does not match the runtime format check.', fix: 'Use the exact token from Vercel Account Settings -> Tokens without extra spaces or Bearer prefix.' },
    { error: 'INVALID_PROJECT_NAME', cause: 'Deploy Project is missing Project Name or the name contains unsupported characters.', fix: 'Use only letters, numbers, hyphens, or underscores, with 1 to 128 characters.' },
    { error: 'TIMEOUT, NETWORK_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, RATE_LIMITED, SERVICE_UNAVAILABLE, or UNKNOWN_ERROR', cause: 'Vercel returned an API/network failure classified by runtime.', fix: 'Check token permissions, Vercel status, project access, and retry policy before rerunning.' },
  ],
  relatedNodes: ['netlify', 'github', 'gitlab', 'jenkins'],
};
