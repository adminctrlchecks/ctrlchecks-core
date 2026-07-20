import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const typeformWebhookDocs = 'https://www.typeform.com/developers/webhooks/';

const fields: FieldDoc[] = [
  {
    name: 'Connection',
    internalKey: 'connectionId',
    type: 'string',
    required: false,
    description: 'Optional saved Typeform connection ID. If blank, the active Typeform connection is used.',
    helpText: 'What this field means: Connection points to the saved Typeform Personal Access Token CtrlChecks uses to register the webhook on your form. Why it matters: CtrlChecks needs a working Typeform token to call the Typeform API and create (PUT) the form webhook subscription. When to fill it: You do not fill this in the current visual panel — it is not one of the exposed config fields; CtrlChecks always resolves your active Typeform connection automatically. What to enter: Nothing in the panel; manage the credential itself under Connections. Where the value comes from: CtrlChecks Connections stores it after you save a Typeform Personal Access Token (tested against GET api.typeform.com/me). How to use it later: This is a setup value only; it is not emitted as {{$json.connectionId}} to downstream nodes. Accepted format: Saved connection reference, not a raw token. Real workplace example: A marketing team saves one Typeform connection for the account that owns all their intake forms, and every Typeform Trigger node reuses it. If it is empty or wrong: Empty falls back to the active Typeform connection; a missing or invalid connection causes No active Typeform connection found. Common mistake: Pasting the raw Typeform Personal Access Token into a normal workflow field instead of saving it under Connections.',
    placeholder: 'Uses your active Typeform connection',
    example: 'typeform_token_123',
    notes: 'Credential-owned backend field, not currently exposed as a visual config field. Manage it from Connections instead.',
  },
  {
    name: 'Form ID',
    internalKey: 'formId',
    type: 'string',
    required: true,
    description: 'Typeform form ID to receive responses from.',
    helpText: 'What this field means: Form ID identifies the exact Typeform this trigger listens to. Why it matters: CtrlChecks uses it both to register the webhook (a PUT to Typeform\'s /forms/{formId}/webhooks/{tag} endpoint) and to confirm every incoming response actually belongs to this form. When to fill it: Always required — the trigger cannot register a webhook or accept responses without it. What to enter: The short form ID shown in the form\'s share URL, such as abc123 in typeform.com/to/abc123. Where the value comes from: Open the form in Typeform, look at the Share link or the address bar in the form editor, and copy the ID segment after /to/ or /form/. How to use it later: The trigger output includes {{$json.formId}} for confirmation or logging. Accepted format: Plain Typeform form ID text, no slashes or the typeform.com domain. Real workplace example: A support team\'s intake form at typeform.com/to/abc123 sets Form ID to abc123 so only that form\'s responses start the workflow. If it is empty or wrong: Leaving it blank fails validation with A Typeform form ID is required; a wrong ID causes Typeform API errors during registration since that form may not exist or may not belong to your account. Common mistake: Pasting the full form URL (https://form.typeform.com/to/abc123) instead of just the abc123 ID segment.',
    placeholder: 'abc123',
    example: 'abc123',
  },
  {
    name: 'Keyword Filter',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Optional keyword matched against the response answers.',
    helpText: 'What this field means: Keyword Filter only lets responses whose combined answer text contains a word or phrase start the workflow. Why it matters: A high-traffic form can produce a lot of responses; this keeps the workflow focused on a specific term without needing a second form or webhook. When to fill it: Use it when the workflow should react only to a phrase such as urgent, a department name, or a specific answer value. Leave it blank to accept every response to the form. What to enter: A simple keyword or short phrase, not a field name or Typeform filter syntax. Where the value comes from: Pick the label, department, priority word, or answer value your team cares about. How to use it later: The accepted response output still includes the full {{$json.answers}} object (keyed by field ref/id/title) and {{$json.hidden}} for downstream routing. Accepted format: Plain text, case-insensitive contains match against all answers combined as text. Real workplace example: urgent starts only the escalation workflow when a respondent\'s answer mentions urgent. If it is empty or wrong: Empty accepts every response to the form; a too-specific or misspelled filter causes Ignored Typeform response not matching this trigger. Common mistake: Typing a field name (such as priority) expecting it to match that specific field only — this filter checks the combined text of every answer, not one named field.',
    placeholder: 'urgent',
    example: 'urgent',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive response',
  value: 'receive',
  description: 'Starts the workflow when a new response is submitted to the configured Typeform form, after validating the Typeform-Signature HMAC.',
  fields,
  outputExample: {
    eventId: '01HXYZABC123',
    eventType: 'form_response',
    source: 'typeform',
    userId: null,
    username: '',
    text: '{"email":"user@example.com","message":"Hello!"}',
    timestamp: '2026-07-19T10:20:00.000Z',
    formId: 'abc123',
    responseId: 'a1b2c3',
    answers: { email: 'user@example.com', message: 'Hello!' },
    hidden: {},
    raw: {},
    trigger: 'typeform',
    workflow_id: 'workflow_123',
    node_id: 'typeform-trigger-1',
    sessionId: 'typeform_workflow_123_a1b2c3',
    _typeform: true,
  },
  outputDescription: 'eventId: the Typeform delivery\'s event_id. eventType: always form_response. source: typeform. userId: always null — Typeform webhook payloads do not include a respondent identity. username: always an empty string, for the same reason. text: a JSON string of all answers, used internally for Keyword Filter matching. timestamp: the response\'s submitted_at time. formId: the form the response belongs to. responseId: Typeform\'s response token, a unique ID for this submission. answers: an object keyed by each field\'s ref, id, or title (whichever is present), with the value already unwrapped from Typeform\'s per-type answer shape (text/email/url/number/boolean/choice/choices). hidden: any hidden fields configured on the form (such as tracking parameters passed in the form URL). raw: the original Typeform webhook payload. trigger/workflow_id/node_id/sessionId/_typeform: CtrlChecks trigger metadata.',
  usageExample: {
    scenario: 'Process new lead-intake submissions with an AI Agent and create a CRM contact',
    inputValues: {
      formId: 'abc123',
      query: '',
    },
    expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream CRM/email node.',
  },
  externalDocsUrl: typeformWebhookDocs,
};

export const typeformTriggerDoc: NodeDoc = {
  slug: 'typeform_trigger',
  displayName: 'Typeform Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Typeform.svg',
  description: 'Start workflows from new Typeform form responses, delivered through a signed Typeform webhook.',
  credentialType: 'Typeform Personal Access Token',
  credentialSetupSteps: [
    'Create a Typeform Personal Access Token at admin.typeform.com/account#/section/tokens.',
    'In CtrlChecks, open Connections -> Add Connection -> Typeform and save the token (tested against GET https://api.typeform.com/me).',
    'Add this trigger to a workflow, paste the Form ID, and save/activate the workflow.',
    'CtrlChecks automatically registers a webhook on the form using the Typeform API (PUT /forms/{formId}/webhooks/{tag}, with a stable tag derived from the node ID) with a generated signing secret — no manual webhook setup in Typeform is required. Because the registration is a PUT to a stable tag, re-saving the workflow safely updates the same webhook instead of creating duplicates.',
    'Note: Typeform webhook payloads never include a respondent identity — {{$json.userId}} is always null and {{$json.username}} is always empty. Use {{$json.answers}} for respondent-provided contact fields (such as an email question) instead.',
    'Connect the trigger output to the next step with the outgoing line. Each downstream service node still needs its own account connection; this Typeform connection only authorizes registering the webhook, not the CRM, email, database, or AI nodes that come after this trigger.',
  ],
  credentialDocsUrl: 'https://www.typeform.com/developers/get-started/personal-access-token/',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Typeform webhook payloads and emits a normalized event payload.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'No active Typeform connection found. Save a Typeform Personal Access Token in Connections first.',
      cause: 'The workflow owner has not connected Typeform, or the saved token is invalid.',
      fix: 'Save a valid Typeform Personal Access Token in Connections and re-activate the workflow.',
    },
    {
      error: 'A Typeform form ID is required.',
      cause: 'Form ID was left blank when saving or activating the workflow.',
      fix: 'Open the Typeform Trigger node and paste the Form ID from the form\'s share URL.',
    },
    {
      error: 'Invalid Typeform webhook signature.',
      cause: 'The Typeform-Signature header did not match the secret CtrlChecks registered for this webhook, or the request was not actually sent by Typeform.',
      fix: 'Re-register the webhook by saving the active workflow again so a fresh secret is issued and applied on both sides.',
    },
    {
      error: 'Workflow is not active.',
      cause: 'A valid, signed Typeform response arrived, but the workflow has not been activated.',
      fix: 'Activate the workflow in CtrlChecks, then resubmit or wait for the next real form response.',
    },
    {
      error: 'Ignored non-form-response Typeform payload.',
      cause: 'The delivery was not a recognizable form_response payload, such as a connectivity test.',
      fix: 'No action needed for test pings; confirm the Form ID if you expected a real workflow run.',
    },
    {
      error: 'Ignored Typeform response not matching this trigger.',
      cause: 'The response was for a different form than Form ID, or Keyword Filter did not match the answers.',
      fix: 'Confirm Form ID matches the form you submitted to, or clear Keyword Filter temporarily to confirm the output.',
    },
    {
      error: 'Typeform API error (401/403/404): ...',
      cause: 'The Personal Access Token is invalid or expired, or the Form ID does not exist or does not belong to your account.',
      fix: 'Confirm the token is still valid in Typeform and that Form ID is copied exactly from the form\'s share URL.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to register Typeform webhooks.',
      cause: 'CtrlChecks cannot build the public callback URL Typeform must call.',
      fix: 'Set PUBLIC_BASE_URL to the externally reachable CtrlChecks app URL, then open the webhook setup/registration flow again.',
    },
    {
      error: 'Next node cannot find Typeform trigger fields',
      cause: 'A downstream node is mapped to an answer key that does not exist on this form, or expects {{$json.userId}}/{{$json.username}}, which are always empty for Typeform.',
      fix: 'Check {{$json.answers}} in a test run to confirm the exact field keys this form actually sends; map respondent contact info from an answer field, not userId/username.',
    },
    {
      error: 'Permission denied after Typeform Trigger',
      cause: 'The trigger fired correctly, but the downstream CRM, email, or ticketing node lacks its own account connection or permission.',
      fix: 'Connect the downstream service node under Connections and confirm it has permission for the action it needs to take.',
    },
  ],
  relatedNodes: ['typeform', 'ai_agent'],
};
