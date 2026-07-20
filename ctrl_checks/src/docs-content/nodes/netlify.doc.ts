import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const mk = (name: string, internalKey: string, type: FieldDoc['type'], required: boolean, description: string, example: string, extra: Partial<FieldDoc> = {}): FieldDoc => ({
  name,
  internalKey,
  type,
  required,
  description,
  helpText: richFieldHelp({
    what: description,
    why: `Netlify needs ${name} to authenticate, choose the endpoint, or identify the site/deploy record.`,
    when: required ? `Fill ${name} for every Netlify operation.` : `Fill ${name} only when the selected operation uses it.`,
    enter: example,
    source: `Copy it from Netlify, save it in Connections, or map it from an earlier step such as {{$json.${internalKey}}}.`,
    later: `Later nodes can use Netlify output such as {{$json.record}}, {{$json.records}}, {{$json.count}}, {{$json.resource}}, and {{$json.operation}}.`,
    format: type === 'json' ? 'Valid JSON object.' : type === 'number' ? 'Number without words.' : 'Plain text.',
    example,
    empty: required ? `${name} is required for reliable Netlify calls.` : `${name} can be empty for operations that do not use it; Netlify may return an API error if the endpoint needs it.`,
    mistake: `Do not paste a full dashboard URL when this field expects only an ID, token, JSON object, or number.`,
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
  description: 'Choose the Netlify REST operation to run.',
  helpText: richFieldHelp({
    what: 'The Netlify API action this node performs.',
    why: 'Runtime routes by operation, not by resource. The resource value is echoed in output but does not decide the endpoint.',
    when: 'Fill it for every Netlify node run.',
    enter: 'Choose List Sites, Get Site, Create Deploy, List Deploys, or Get Deploy.',
    source: 'This comes from the operation dropdown in the node panel.',
    later: 'The chosen value is returned as {{$json.operation}} for logging or branching.',
    format: 'Dropdown value list_sites, get_site, create_deploy, list_deploys, or get_deploy.',
    example: 'Choose Create Deploy after a GitHub release is approved.',
    empty: 'If empty, runtime defaults to list_sites.',
    mistake: 'Do not choose a Forms resource expecting form submissions; this executor currently has no form-submission operation.',
  }),
  options: ['List Sites', 'Get Site', 'Create Deploy', 'List Deploys', 'Get Deploy'],
  defaultValue: 'list_sites',
};

const resourceField: FieldDoc = {
  name: 'Resource',
  internalKey: 'resource',
  type: 'select',
  required: true,
  description: 'Label for the Netlify resource area. Runtime currently supports site/deploy endpoints and echoes this value in output.',
  helpText: richFieldHelp({
    what: 'The Netlify resource label shown in the node panel.',
    why: 'It helps users group site and deploy work, and runtime echoes it as {{$json.resource}}.',
    when: 'Fill it for every operation, keeping it aligned with the selected operation.',
    enter: 'Choose Sites for list/get site, or Deploys for create/list/get deploy.',
    source: 'This comes from the dropdown in the node panel.',
    later: 'Use {{$json.resource}} in logs to show whether the step was site or deploy related.',
    format: 'Dropdown value sites or deploys.',
    example: 'Choose Deploys when creating a deploy for a production site.',
    empty: 'If empty, runtime defaults to sites.',
    mistake: 'Do not rely on Resource alone; Operation is what actually chooses the Netlify endpoint.',
  }),
  options: ['Sites', 'Deploys'],
  defaultValue: 'sites',
};

const accessTokenField = mk('Access Token', 'accessToken', 'password', true, 'Netlify personal access token sent as Authorization: Bearer <token>.', '{{$credentials.netlify.accessToken}}', { notes: 'Prefer Connections so the token is stored in the credential vault.' });
const siteIdField = mk('Site ID', 'siteId', 'string', false, 'Netlify site ID required for get_site, create_deploy, and list_deploys.', 'a1b2c3d4-5678-90ab-cdef-111111111111');
const deployIdField = mk('Deploy ID', 'deployId', 'string', false, 'Netlify deploy ID required for get_deploy.', '65a1234567890abcdef12345');
const payloadField = mk('Payload', 'payload', 'json', false, 'JSON request body sent only for create_deploy.', '{"branch":"main"}');
const limitField = mk('Limit', 'limit', 'number', false, 'Maximum records returned by list operations. Runtime sends it as per_page.', '25', { defaultValue: '25' });

const commonFields = [operationField, resourceField, accessTokenField, siteIdField, deployIdField, payloadField, limitField];

const operation = (
  name: string,
  value: string,
  description: string,
  outputExample: Record<string, unknown>,
  outputDescription: string,
  inputValues: Record<string, string>,
) => ({
  name,
  value,
  description,
  fields: commonFields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} in Netlify for a deployment automation where site or deploy data is needed by a later workflow step.`,
    inputValues: { operation: value, accessToken: '{{$credentials.netlify.accessToken}}', ...inputValues },
    expectedOutput: 'Use {{$json.records}}, {{$json.record}}, or {{$json.count}} in the next workflow step.',
  },
  externalDocsUrl: 'https://docs.netlify.com/api/get-started/',
});

export const netlifyDoc: NodeDoc = {
  slug: 'netlify',
  displayName: 'Netlify',
  category: 'DevOps',
  logoUrl: '/icons/nodes/netlify.svg',
  description: 'List Netlify sites, inspect sites/deploys, and create deploys through the Netlify REST API.',
  credentialType: 'Netlify API Key',
  credentialSetupSteps: [
    'What this is: A Netlify personal access token lets CtrlChecks call the Netlify API for sites and deploys.',
    'Where to start: In Netlify, open User Settings -> Applications -> Personal access tokens.',
    'Permissions: Use a token from an account that can read the target sites and create deploys where needed.',
    'How to connect: In CtrlChecks, open Connections -> Add Connection -> Netlify and save the accessToken in the credential vault.',
    'Test it: Run List Sites with a low limit and confirm Netlify returns records from api.netlify.com/api/v1.',
    'Workflow wiring: Connect the output of this Netlify node to the next step through the outgoing line, then configure that next service node with its own account connection.',
    'Important: Service nodes after Netlify still need their own account connection; a Netlify token cannot send email, chat, or issue-tracker updates.',
  ],
  credentialDocsUrl: 'https://docs.netlify.com/api/get-started/#authentication',
  resources: [
    {
      name: 'Sites And Deploys',
      description: 'Legacy executor operations backed by https://api.netlify.com/api/v1.',
      operations: [
        operation(
          'List Sites',
          'list_sites',
          'List Sites calls GET /sites with per_page from Limit and returns an array in records plus count. Site ID and Deploy ID are ignored for this operation.',
          { success: true, resource: 'sites', operation: 'list_sites', records: [{ id: 'site_123', name: 'marketing-site' }], count: 1, meta: {} },
          'success: true when Netlify returns sites. resource and operation echo config. records contains the site array. count is the number returned. record is undefined for arrays. error appears as a plain string on failure.',
          { resource: 'sites', limit: '25' },
        ),
        operation(
          'Get Site',
          'get_site',
          'Get Site calls GET /sites/{siteId} and returns one site object in record. Runtime does not locally validate Site ID before calling Netlify.',
          { success: true, resource: 'sites', operation: 'get_site', record: { id: 'site_123', name: 'marketing-site', url: 'https://example.netlify.app' }, records: [], count: 1, meta: {} },
          'success: true when Netlify returns a site. resource and operation echo config. record contains the site object. records is empty and count is 1. error appears as a plain string on failure.',
          { resource: 'sites', siteId: 'site_123' },
        ),
        operation(
          'Create Deploy',
          'create_deploy',
          'Create Deploy calls POST /sites/{siteId}/deploys with Payload as the JSON body. Use it for branch deploy triggers or deploy objects supported by Netlify.',
          { success: true, resource: 'deploys', operation: 'create_deploy', record: { id: 'deploy_123', state: 'new', deploy_url: 'https://deploy-preview.netlify.app' }, records: [], count: 1, meta: {} },
          'success: true when Netlify creates the deploy. resource and operation echo config. record contains the deploy object. records is empty and count is 1. error appears as a plain string on failure.',
          { resource: 'deploys', siteId: 'site_123', payload: '{"branch":"main"}' },
        ),
        operation(
          'List Deploys',
          'list_deploys',
          'List Deploys calls GET /sites/{siteId}/deploys with Limit as per_page and returns deploy objects in records.',
          { success: true, resource: 'deploys', operation: 'list_deploys', records: [{ id: 'deploy_123', state: 'ready' }], count: 1, meta: {} },
          'success: true when Netlify returns deploys. resource and operation echo config. records contains deploys, count is returned length, and record is undefined for arrays. error appears as a plain string on failure.',
          { resource: 'deploys', siteId: 'site_123', limit: '10' },
        ),
        operation(
          'Get Deploy',
          'get_deploy',
          'Get Deploy calls GET /deploys/{deployId} and returns one deploy object in record. Site ID is not used by the actual endpoint.',
          { success: true, resource: 'deploys', operation: 'get_deploy', record: { id: 'deploy_123', state: 'ready', deploy_url: 'https://example.netlify.app' }, records: [], count: 1, meta: {} },
          'success: true when Netlify returns a deploy. resource and operation echo config. record contains the deploy object. records is empty and count is 1. error appears as a plain string on failure.',
          { resource: 'deploys', deployId: 'deploy_123' },
        ),
      ],
    },
  ],
  commonErrors: [
    { error: 'Unsupported operation: <operation>', cause: 'Operation is not one of list_sites, get_site, create_deploy, list_deploys, or get_deploy.', fix: 'Choose a supported operation from the dropdown.' },
    { error: 'Netlify API error <status>: <response text>', cause: 'Netlify rejected the request because the token, Site ID, Deploy ID, payload, or permissions were wrong.', fix: 'Check the token, ID fields, and Netlify account access, then retry.' },
    { error: 'Netlify error', cause: 'The request failed before Netlify returned a normal API response.', fix: 'Verify network access to api.netlify.com and confirm the token is available.' },
    { error: 'Missing Access Token', cause: 'The runtime sends Authorization: Bearer <accessToken>; an empty token causes authentication failure at Netlify.', fix: 'Save a Netlify connection in Connections or map the access token into accessToken.' },
    { error: 'Forms resource does not return forms today', cause: 'The legacy executor routes by operation only and has no form-submission endpoint.', fix: 'Use the supported site/deploy operations or add a new forms operation in worker code later.' },
  ],
  relatedNodes: ['vercel', 'github', 'gitlab', 'jenkins'],
};
