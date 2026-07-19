import type { NodeDoc } from '../types';

export const tallyTriggerDoc: NodeDoc = {
  slug: 'tally_trigger',
  displayName: 'Tally Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Tally.svg',
  description: 'Start workflows from new Tally (tally.so) form submissions, delivered through a signed Tally webhook.',
  credentialType: 'Tally Personal Access Token',
  credentialSetupSteps: [
    'Create a Tally Personal Access Token in Tally Account -> Settings -> API.',
    'Connect Tally in Connections using that token.',
    'Add this trigger to a workflow, paste the Form ID, and save/activate the workflow.',
    'CtrlChecks automatically registers a webhook on the form using the Tally API, with a generated signing secret.',
  ],
  credentialDocsUrl: 'https://tally.so/help/tally-api',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Tally webhook payloads and emits a normalized event payload.',
      operations: [
        {
          name: 'Receive submission',
          value: 'receive',
          description: 'Starts the workflow when a new submission is made to the configured form.',
          fields: [
            {
              name: 'Form ID',
              internalKey: 'formId',
              type: 'string',
              required: true,
              description: 'Tally form ID to receive submissions from.',
              helpText: 'Find it in the form URL: tally.so/forms/{formId}.',
              placeholder: 'wA1b2C',
              example: 'wA1b2C',
            },
            {
              name: 'Keyword Filter',
              internalKey: 'query',
              type: 'string',
              required: false,
              description: 'Optional keyword matched against the submission answers.',
              placeholder: 'urgent',
              example: 'urgent',
            },
          ],
          outputExample: {
            eventId: '01HXYZ',
            eventType: 'form_response',
            source: 'tally',
            formId: 'wA1b2C',
            formName: 'Contact Us',
            responseId: 'a1b2c3',
            answers: { email: 'user@example.com', message: 'Hello!' },
            raw: {},
          },
          outputDescription: 'Outputs normalized top-level fields: eventId, eventType, source, timestamp, formId, formName, responseId, answers (keyed by field key/label, with choice fields resolved to their option text), and raw.',
          usageExample: {
            scenario: 'Process new lead-intake submissions with AI',
            inputValues: {
              formId: 'wA1b2C',
            },
            expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream node.',
          },
          externalDocsUrl: 'https://tally.so/help/webhooks',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'No active Tally connection found',
      cause: 'The workflow owner has not connected Tally, or the saved token is invalid.',
      fix: 'Save a valid Tally Personal Access Token in Connections and re-activate the workflow.',
    },
    {
      error: 'Invalid Tally webhook signature',
      cause: 'The request did not include a valid Tally-Signature header matching the secret CtrlChecks registered for this webhook.',
      fix: 'Re-register the webhook from the node so a fresh secret is issued and applied on both sides.',
    },
  ],
  relatedNodes: ['ai_agent'],
};
