import type { NodeDoc } from '../types';

export const typeformTriggerDoc: NodeDoc = {
  slug: 'typeform_trigger',
  displayName: 'Typeform Trigger',
  category: 'Triggers',
  logoUrl: '/integrations-logos/Typeform.svg',
  description: 'Start workflows from new Typeform form responses, delivered through a signed Typeform webhook.',
  credentialType: 'Typeform Personal Access Token',
  credentialSetupSteps: [
    'Create a Typeform Personal Access Token in Typeform Account -> Personal tokens.',
    'Connect Typeform in Connections using that token.',
    'Add this trigger to a workflow, paste the Form ID, and save/activate the workflow.',
    'CtrlChecks automatically registers a webhook on the form using the Typeform API, with a generated signing secret.',
  ],
  credentialDocsUrl: 'https://www.typeform.com/developers/get-started/personal-access-token/',
  resources: [
    {
      name: 'Webhook',
      description: 'Receives Typeform webhook payloads and emits a normalized event payload.',
      operations: [
        {
          name: 'Receive response',
          value: 'receive',
          description: 'Starts the workflow when a new response is submitted to the configured form.',
          fields: [
            {
              name: 'Form ID',
              internalKey: 'formId',
              type: 'string',
              required: true,
              description: 'Typeform form ID to receive responses from.',
              helpText: 'Find it in the form URL: typeform.com/to/{formId}.',
              placeholder: 'abc123',
              example: 'abc123',
            },
            {
              name: 'Keyword Filter',
              internalKey: 'query',
              type: 'string',
              required: false,
              description: 'Optional keyword matched against the response answers.',
              placeholder: 'urgent',
              example: 'urgent',
            },
          ],
          outputExample: {
            eventId: '01HXYZ',
            eventType: 'form_response',
            source: 'typeform',
            formId: 'abc123',
            responseId: 'a1b2c3',
            answers: { email: 'user@example.com', message: 'Hello!' },
            hidden: {},
            raw: {},
          },
          outputDescription: 'Outputs normalized top-level fields: eventId, eventType, source, timestamp, formId, responseId, answers (keyed by field ref/id/title), hidden (hidden fields), and raw.',
          usageExample: {
            scenario: 'Process new lead-intake submissions with AI',
            inputValues: {
              formId: 'abc123',
            },
            expectedOutput: 'Use {{$json.answers.email}} and {{$json.answers.message}} in an AI Agent or downstream node.',
          },
          externalDocsUrl: 'https://www.typeform.com/developers/webhooks/',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'No active Typeform connection found',
      cause: 'The workflow owner has not connected Typeform, or the saved token is invalid.',
      fix: 'Save a valid Typeform Personal Access Token in Connections and re-activate the workflow.',
    },
    {
      error: 'Invalid Typeform webhook signature',
      cause: 'The request did not include a valid Typeform-Signature header matching the secret CtrlChecks registered for this webhook.',
      fix: 'Re-register the webhook from the node so a fresh secret is issued and applied on both sides.',
    },
  ],
  relatedNodes: ['typeform', 'ai_agent'],
};
