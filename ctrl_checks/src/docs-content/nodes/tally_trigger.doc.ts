import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const tallyWebhookDocs = 'https://tally.so/help/webhooks';

const fields: FieldDoc[] = [
  {
    name: 'Connection',
    internalKey: 'connectionId',
    type: 'string',
    required: false,
    description: 'Optional saved Tally connection ID. If blank, the active Tally connection is used.',
    helpText: 'What this field means: Connection points to the saved Tally Personal Access Token CtrlChecks uses to register the webhook on your form. Why it matters: CtrlChecks needs a working Tally token to call the Tally API and create (or remove) the form webhook subscription. When to fill it: You do not fill this in the current visual panel — it is not one of the exposed config fields; CtrlChecks always resolves your active Tally connection automatically. What to enter: Nothing in the panel; manage the credential itself under Connections. Where the value comes from: CtrlChecks Connections stores it after you save a Tally Personal Access Token. How to use it later: This is a setup value only; it is not emitted as {{$json.connectionId}} to downstream nodes. Accepted format: Saved connection reference, not a raw token. Real workplace example: A marketing team saves one Tally connection for the account that owns all their intake forms, and every Tally Trigger node reuses it. If it is empty or wrong: Empty falls back to the active Tally connection; a missing or invalid connection causes No active Tally connection found. Common mistake: Pasting the raw Tally Personal Access Token into a normal workflow field instead of saving it under Connections.',
    placeholder: 'Uses your active Tally connection',
    example: 'tally_token_123',
    notes: 'Credential-owned backend field, not currently exposed as a visual config field. Manage it from Connections instead.',
  },
  {
    name: 'Form ID',
    internalKey: 'formId',
    type: 'string',
    required: true,
    description: 'Tally form ID to receive submissions from.',
    helpText: 'What this field means: Form ID identifies the exact Tally form this trigger listens to. Why it matters: CtrlChecks uses it both to register the webhook (POST to Tally\'s /forms/{formId}/webhooks) and to confirm every incoming submission actually belongs to this form. When to fill it: Always required — the trigger cannot register a webhook or accept submissions without it. What to enter: The short form ID shown in the form\'s share URL, such as wA1b2C in tally.so/forms/wA1b2C. Where the value comes from: Open the form in Tally, look at the address bar or the Share link, and copy the ID segment after /forms/. How to use it later: The trigger output includes {{$json.formId}} and {{$json.formName}} for confirmation or logging. Accepted format: Plain Tally form ID text, no slashes or the tally.so domain. Real workplace example: A support team\'s intake form at tally.so/forms/wA1b2C sets Form ID to wA1b2C so only that form\'s submissions start the workflow. If it is empty or wrong: Leaving it blank fails validation with A Tally form ID is required; a wrong ID causes Tally API errors during registration since that form may not exist or may not belong to your account. Common mistake: Pasting the full form URL (https://tally.so/forms/wA1b2C) instead of just the wA1b2C ID segment.',
    placeholder: 'wA1b2C',
    example: 'wA1b2C',
  },
  {
    name: 'Keyword Filter',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Optional keyword matched against the submission answers.',
    helpText: 'What this field means: Keyword Filter only lets submissions whose combined answer text contains a word or phrase start the workflow. Why it matters: A high-traffic form can produce a lot of submissions; this keeps the workflow focused on a specific term without needing a second form or webhook. When to fill it: Use it when the workflow should react only to a phrase such as urgent, a department name, or a specific answer value. Leave it blank to accept every submission to the form. What to enter: A simple keyword or short phrase, not a field name or Tally filter syntax. Where the value comes from: Pick the label, department, priority word, or answer value your team cares about. How to use it later: The accepted submission output still includes the full {{$json.answers}} object (keyed by field key/label) for downstream routing. Accepted format: Plain text, case-insensitive contains match against all answers combined as text. Real workplace example: urgent starts only the escalation workflow when a respondent\'s answer mentions urgent. If it is empty or wrong: Empty accepts every submission to the form; a too-specific or misspelled filter causes Ignored Tally response not matching this trigger. Common mistake: Typing a field name (such as priority) expecting it to match that specific field only — this filter checks the combined text of every answer, not one named field.',
    placeholder: 'urgent',
    example: 'urgent',
  },
];

const receiveOperation: OperationDoc = {
  name: 'Receive submission',
  value: 'receive',
  description: 'Starts the workflow when a new submission is made to the configured Tally form, after validating the Tally-Signature HMAC.',
  fields,
  outputExample: {
    eventId: '01HXYZABC123',
    eventType: 'form_response',
    source: 'tally',
    userId: 'resp_a1b2c3',
    username: '',
    text: '{"email":"user@example.com","message":"Hello!"}',
    timestamp: '2026-07-19T10:20:00.000Z',
    formId: 'wA1b2C',
    formName: 'Contact Us',
    responseId: 'a1b2c3',
    answers: { email: 'user@example.com', message: 'Hello!' },
    raw: {},
    trigger: 'tally',
    workflow_id: 'workflow_123',
    node_id: 'tally-trigger-1',
    sessionId: 'tally_workflow_123_a1b2c3',
    _tally: true,
  },
  outputDescription: 'eventId: the Tally event ID, or a generated fallback. eventType: always form_response. source: tally. userId: the Tally respondent ID when available. username: always empty; Tally does not include a respondent name. text: a JSON string of all answers, used internally for Keyword Filter matching. timestamp: Tally\'s submission created time. formId/formName: the form the submission belongs to. responseId: the unique submission ID. answers: an object keyed by each field\'s key or label; choice/select fields are resolved to their option text rather than raw option IDs. raw: the original Tally webhook payload. trigger/workflow_id/node_id/sessionId/_tally: CtrlChecks trigger metadata.',
  usageExample: {
    scenario: 'Process new lead-intake submissions with an AI Agent and create a CRM contact',
    inputValues: {
      formId: 'wA1b2C',
      query: '',
    },
    expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream CRM/email node.',
  },
  externalDocsUrl: tallyWebhookDocs,
};

export const tallyTriggerDoc: NodeDoc = {
  slug: 'tally_trigger',
  displayName: 'Tally Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Tally.svg',
  description: 'Start workflows from new Tally (tally.so) form submissions, delivered through a signed Tally webhook.',
  credentialType: 'Tally Personal Access Token',
  credentialSetupSteps: [
    'Create a Tally Personal Access Token at tally.so/settings/api under Personal Access Tokens.',
    'In CtrlChecks, open Connections -> Add Connection -> Tally and save the token (tested against GET https://api.tally.so/me).',
    'Add this trigger to a workflow, paste the Form ID, and save/activate the workflow.',
    'CtrlChecks automatically registers a webhook on the form using the Tally API (POST /forms/{formId}/webhooks) with a generated signing secret — no manual webhook setup in Tally is required.',
    'Note for advanced users: Tally\'s exact webhook signature wire format (the Tally-Signature header) was not confirmed against a live Tally delivery when this trigger was built; CtrlChecks accepts both a raw base64 HMAC-SHA256 digest and a sha256=-prefixed form defensively. If signature validation ever behaves unexpectedly, this is the area to investigate first.',
    'Connect the trigger output to the next step with the outgoing line. Each downstream service node still needs its own account connection; this Tally connection only authorizes registering the webhook, not the CRM, email, database, or AI nodes that come after this trigger.',
  ],
  credentialDocsUrl: 'https://tally.so/help/tally-api',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Tally webhook payloads and emits a normalized event payload.',
      operations: [receiveOperation],
    },
  ],
  commonErrors: [
    {
      error: 'No active Tally connection found. Save a Tally Personal Access Token in Connections first.',
      cause: 'The workflow owner has not connected Tally, or the saved token is invalid.',
      fix: 'Save a valid Tally Personal Access Token in Connections and re-activate the workflow.',
    },
    {
      error: 'A Tally form ID is required.',
      cause: 'Form ID was left blank when saving or activating the workflow.',
      fix: 'Open the Tally Trigger node and paste the Form ID from the form\'s share URL.',
    },
    {
      error: 'Invalid Tally webhook signature.',
      cause: 'The Tally-Signature header did not match the secret CtrlChecks registered for this webhook, or the request was not actually sent by Tally.',
      fix: 'Re-register the webhook by saving the active workflow again so a fresh secret is issued and applied on both sides.',
    },
    {
      error: 'Workflow is not active.',
      cause: 'A valid, signed Tally submission arrived, but the workflow has not been activated.',
      fix: 'Activate the workflow in CtrlChecks, then resubmit or wait for the next real form submission.',
    },
    {
      error: 'Ignored non-form-response Tally payload.',
      cause: 'The delivery was not a recognizable form_response payload, such as a connectivity test.',
      fix: 'No action needed for test pings; confirm the Form ID if you expected a real workflow run.',
    },
    {
      error: 'Ignored Tally response not matching this trigger.',
      cause: 'The submission was for a different form than Form ID, or Keyword Filter did not match the answers.',
      fix: 'Confirm Form ID matches the form you submitted to, or clear Keyword Filter temporarily to confirm the output.',
    },
    {
      error: 'Tally API error (401/403/404): ...',
      cause: 'The Personal Access Token is invalid or expired, or the Form ID does not exist or does not belong to your account.',
      fix: 'Confirm the token is still valid in Tally and that Form ID is copied exactly from the form\'s share URL.',
    },
    {
      error: 'PUBLIC_BASE_URL is required to register Tally webhooks.',
      cause: 'CtrlChecks cannot build the public callback URL Tally must call.',
      fix: 'Set PUBLIC_BASE_URL to the externally reachable CtrlChecks app URL, then open the webhook setup/registration flow again.',
    },
    {
      error: 'Next node cannot find Tally trigger fields',
      cause: 'A downstream node is mapped to an answer key that does not exist on this form, such as {{$json.answers.phone}} when the form has no phone field.',
      fix: 'Check {{$json.answers}} in a test run to confirm the exact field keys/labels this form actually sends before mapping them downstream.',
    },
    {
      error: 'Permission denied after Tally Trigger',
      cause: 'The trigger fired correctly, but the downstream CRM, email, or ticketing node lacks its own account connection or permission.',
      fix: 'Connect the downstream service node under Connections and confirm it has permission for the action it needs to take.',
    },
  ],
  relatedNodes: ['ai_agent'],
};
