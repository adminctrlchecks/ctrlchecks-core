import type { FieldDoc, NodeDoc, OperationDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const operationHelp = richFieldHelp({
  what: 'The Typeform action this node will run.',
  why: 'Each operation calls a different Typeform REST endpoint and changes which fields are required.',
  when: 'Required for every Typeform node.',
  enter: 'Choose get_responses, create_form, or get_form. The runtime does not support get_forms.',
  source: 'Select one of the visible dropdown options in the node panel.',
  later: 'The output includes {{$json.operation}}, {{$json.data}}, and sometimes {{$json.items}}, {{$json.totalItems}}, or {{$json.formId}}.',
  format: 'One of get_responses, create_form, or get_form.',
  example: 'Use get_responses to pull submissions from the form ID stored in {{$json.formId}}.',
  empty: 'Runtime defaults to get_responses; unsupported values return success false with an unsupported operation error.',
  mistake: 'Using old imported configs with get_forms. That operation is not implemented by this runtime.',
});

const apiKeyHelp = richFieldHelp({
  what: 'An optional Typeform Personal Access Token fallback for this one node.',
  why: 'The node needs a Typeform token from Connections or this field before it can call api.typeform.com.',
  when: 'Leave blank when a Typeform connection is saved. Fill only for a legacy workflow or quick test.',
  enter: 'A Typeform Personal Access Token created in Typeform account settings.',
  source: 'Prefer CtrlChecks Connections, which stores the token in the credential vault; Typeform tokens are created under Account, Personal tokens at admin.typeform.com.',
  later: 'Do not map this secret as {{$json.apiKey}}. Store it once in Connections and let Typeform nodes reuse the service node account connection.',
  format: 'Secret token string issued by Typeform.',
  example: 'Save the operations Typeform token in Connections and leave this field empty.',
  empty: 'Runtime looks for saved typeform or typeform_token credentials; if none exists it returns success false with a connection required message.',
  mistake: 'Putting a Typeform token into a normal workflow field or example instead of the Connections credential vault.',
});

const formIdHelp = richFieldHelp({
  what: 'The Typeform form ID to read responses from or fetch as a form definition.',
  why: 'get_responses and get_form need this ID to know which form to call.',
  when: 'Required for get_responses and get_form. Not used by create_form.',
  enter: 'The short form ID from the Typeform URL, or a mapped form id from an earlier step.',
  source: 'Open the form in Typeform and copy the ID from a URL like typeform.com/to/abc123, or map {{$json.formId}}.',
  later: 'The successful response also sets {{$json.formId}} to the returned form id or the configured form id.',
  format: 'Typeform form id string such as abc123.',
  example: 'Pull survey submissions with formId {{$json.customerSurveyFormId}}.',
  empty: 'get_responses and get_form return success false saying formId is required.',
  mistake: 'Pasting the full public form URL when the field expects only the form ID.',
});

const titleHelp = richFieldHelp({
  what: 'The title for a new Typeform form.',
  why: 'create_form sends this as the form title in the Typeform create request.',
  when: 'Required for create_form. Not used by get_responses or get_form.',
  enter: 'Plain text title for the new form.',
  source: 'Type a fixed title or map a campaign, event, or intake name such as {{$json.formTitle}}.',
  later: 'Typeform returns the created form under {{$json.data}} and the returned id as {{$json.formId}}.',
  format: 'Plain text string.',
  example: 'Customer onboarding intake - {{$json.region}}.',
  empty: 'create_form returns success false saying title is required.',
  mistake: 'Expecting this node to build a full question set. The current runtime only sends the title when creating a form.',
});

const fields: FieldDoc[] = [
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Choose the Typeform action to run.', helpText: operationHelp, options: ['get_responses', 'create_form', 'get_form'], defaultValue: 'get_responses', example: 'get_responses' },
  { name: 'Personal Access Token', internalKey: 'apiKey', type: 'password', required: false, description: 'Optional Typeform token fallback; prefer a saved connection.', helpText: apiKeyHelp, placeholder: 'Optional if saved in Connections', example: 'Stored in Connections' },
  { name: 'Form ID', internalKey: 'formId', type: 'string', required: false, description: 'Typeform form ID used by get_responses and get_form.', helpText: formIdHelp, placeholder: 'abc123', example: '{{$json.formId}}' },
  { name: 'Form Title', internalKey: 'title', type: 'string', required: false, description: 'Title for create_form.', helpText: titleHelp, placeholder: 'Customer intake', example: '{{$json.formTitle}}' },
];

const outputDescription = 'On success, runtime preserves incoming fields and adds success, operation, data, items when Typeform returns a data.items array, totalItems when Typeform returns total_items, and formId from data.id or the configured formId. Failures preserve incoming fields and return success false with error.';

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
  externalDocsUrl: 'https://developer.typeform.com',
});

export const typeformDoc: NodeDoc = {
  slug: 'typeform',
  displayName: 'Typeform',
  category: 'Productivity',
  logoUrl: '/integrations-logos/Typeform.svg',
  description: 'Retrieve Typeform responses, create a basic form, and fetch form definitions through the Typeform REST API.',
  credentialType: 'Typeform Personal Access Token Connection',
  credentialSetupSteps: [
    'What this is: The Typeform node uses a saved Typeform Personal Access Token connection so CtrlChecks can call api.typeform.com without exposing the token in workflow fields.',
    'Where to start: In Typeform, open Account, Personal tokens at admin.typeform.com, then create a token for the workspace whose forms you need to read or create.',
    'How to connect: In CtrlChecks, open Connections, choose Add Connection, select Typeform, and save the Personal Access Token in the credential vault.',
    'What is stored: CtrlChecks stores the Typeform token in Connections. The visible Personal Access Token field is only an optional fallback.',
    'What not to store: Do not paste Typeform tokens into normal workflow fields, examples, screenshots, comments, or downstream nodes.',
    'Test it: Run Get Form or Get Responses with a known form ID. You can also verify the token directly against api.typeform.com/me outside the workflow.',
    'Connect the output or outgoing line to the next node that should use returned Typeform data such as data, items, totalItems, or formId.',
    'Every downstream service node still needs its own account connection; the Typeform service node account connection does not authenticate CRM, email, Trello, or Notion nodes.',
  ],
  credentialDocsUrl: 'https://developer.typeform.com/get-started/personal-access-token/',
  resources: [
    {
      name: 'Forms and responses',
      description: 'Use Typeform operations to pull submitted responses, create a simple titled form, or fetch a form definition by ID.',
      operations: [
        makeOperation({
          name: 'Get Responses',
          value: 'get_responses',
          description: 'Retrieve submissions for one Typeform form by calling /forms/{formId}/responses. Use this when a scheduled workflow or manual run needs existing responses rather than a real-time trigger.',
          inputValues: { operation: 'get_responses', apiKey: 'Use saved Typeform connection', formId: '{{$json.formId}}', title: '' },
          outputExample: { success: true, operation: 'get_responses', data: { total_items: 2, items: [{ response_id: 'rsp_123', answers: [] }] }, items: [{ response_id: 'rsp_123', answers: [] }], totalItems: 2, formId: 'abc123' },
          scenario: 'Pull recent survey submissions before summarizing them for the customer success team.',
          expectedOutput: 'Downstream nodes can read {{$json.items}}, {{$json.totalItems}}, and {{$json.formId}}.',
        }),
        makeOperation({
          name: 'Create Form',
          value: 'create_form',
          description: 'Create a new Typeform form with a title by calling /forms. The current runtime sends only the title, so use this for basic form creation or as a starting point for later manual editing.',
          inputValues: { operation: 'create_form', apiKey: 'Use saved Typeform connection', formId: '', title: '{{$json.formTitle}}' },
          outputExample: { success: true, operation: 'create_form', data: { id: 'newForm123', title: 'Customer onboarding intake', type: 'form' }, formId: 'newForm123' },
          scenario: 'Create a placeholder intake form for a new regional onboarding campaign.',
          expectedOutput: 'The new form id is available as {{$json.formId}} and the raw Typeform response is in {{$json.data}}.',
        }),
        makeOperation({
          name: 'Get Form',
          value: 'get_form',
          description: 'Fetch the form definition for one Typeform form by calling /forms/{formId}. Use this before checking fields, title, settings, or links for a known form.',
          inputValues: { operation: 'get_form', apiKey: 'Use saved Typeform connection', formId: '{{$json.formId}}', title: '' },
          outputExample: { success: true, operation: 'get_form', data: { id: 'abc123', title: 'Customer intake', fields: [{ id: 'field_name', title: 'Name' }] }, formId: 'abc123' },
          scenario: 'Fetch a form definition before validating that an intake form still has the expected questions.',
          expectedOutput: 'The workflow can inspect {{$json.data.fields}} and reuse {{$json.formId}} in later steps.',
        }),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Typeform connection required',
      cause: 'No saved Typeform credential was found and apiKey, token, and accessToken were empty.',
      fix: 'Save a Typeform Personal Access Token in Connections, then rerun Get Form or Get Responses.',
    },
    {
      error: 'formId is required for get_responses',
      cause: 'Get Responses was selected without a form ID.',
      fix: 'Copy the form ID from the Typeform URL or map {{$json.formId}} from a previous step.',
    },
    {
      error: 'title is required for create_form',
      cause: 'Create Form was selected but Form Title was blank.',
      fix: 'Type a title or map a non-empty title such as {{$json.formTitle}}.',
    },
    {
      error: 'formId is required for get_form',
      cause: 'Get Form was selected without the Typeform form ID.',
      fix: 'Use the ID from typeform.com/to/{formId} or a previous Typeform response.',
    },
    {
      error: 'Unsupported Typeform operation',
      cause: 'The operation value is not get_responses, create_form, or get_form. Old get_forms configs are not implemented.',
      fix: 'Choose one of the visible dropdown options and update imported workflow JSON that still uses get_forms.',
    },
    {
      error: 'Typeform API error',
      cause: 'Typeform rejected the token, form id, request body, or account permissions.',
      fix: 'Reconnect Typeform, confirm the token can call api.typeform.com/me, and verify the form belongs to that workspace.',
    },
  ],
  relatedNodes: ['typeform_trigger', 'trello', 'linear', 'notion', 'google_sheets'],
};
