import type { NodeDoc } from '../types';

export const outlookDoc: NodeDoc = {
  slug: 'outlook',
  displayName: 'Outlook',
  category: 'Communication',
  logoUrl: '/integrations-logos/Outlook.svg',
  description: 'Send emails via Microsoft Outlook using Microsoft Graph OAuth.',
  credentialType: 'Microsoft Connection',
  credentialSetupSteps: [
    'What this is: The Outlook node uses a saved Microsoft OAuth connection so CtrlChecks can call Microsoft Graph without exposing tokens in workflow fields.',
    'Where to start: In CtrlChecks, open Connections -> Add Connection -> Microsoft.',
    'How to connect: Sign in with the Microsoft account that should send the email.',
    'Scopes used: User.Read lets CtrlChecks test the connection. Mail.Send lets Microsoft Graph send mail from the connected mailbox. offline_access lets CtrlChecks refresh the OAuth token.',
    'Important: OAuth tokens are connection-owned. Do not paste Microsoft access tokens, passwords, client secrets, or refresh tokens into node properties.',
    'Test it: Save the connection, run a simple Outlook Send Email step, and confirm the recipient receives the message.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/graph/api/user-sendmail',
  resources: [
    {
      name: 'Operations',
      description: 'Outlook currently supports sending email through Microsoft Graph sendMail.',
      operations: [
        {
          name: 'Send Email',
          value: 'send_email',
          description: 'Send a plain-text email from the connected Microsoft mailbox.',
          fields: [
            {
              name: 'To',
              internalKey: 'to',
              type: 'email',
              required: true,
              description: 'Recipient email address(es), comma-separated.',
              helpText: 'What this field is: Who receives the Outlook email.\nHow to fill it: Type one email address, or multiple addresses separated by commas.\nExample: alice@example.com, bob@example.com\nTip: Use {{$json.email}} when the recipient comes from an earlier step.',
              placeholder: 'recipient@example.com',
              example: 'recipient@example.com',
            },
            {
              name: 'Subject',
              internalKey: 'subject',
              type: 'string',
              required: true,
              description: 'Email subject line.',
              helpText: 'What this field is: The subject shown in the recipient inbox.\nHow to fill it: Type static text or use a template value from an earlier node.\nExample: Weekly report\nTip: Use {{$json.subject}} when another node prepared the subject.',
              placeholder: 'Email subject',
              example: 'Weekly report',
            },
            {
              name: 'Body',
              internalKey: 'body',
              type: 'textarea',
              required: true,
              description: 'Plain-text email body.',
              helpText: 'What this field is: The message content sent through Outlook.\nHow to fill it: Type the email text or use a template expression.\nExample: Your report is ready.\nTip: Use {{$json.body}} or {{$json.message}} when earlier workflow data contains the body.',
              placeholder: 'Email body content...',
              example: 'Your report is ready.',
            },
          ],
          outputExample: {
            success: true,
          },
          outputDescription: 'success: true when Microsoft Graph accepts the sendMail request. Microsoft Graph sendMail returns an empty 202 response, so no message ID is available from this operation.',
          usageExample: {
            scenario: 'Send a daily digest email through Outlook',
            inputValues: {
              to: 'team@example.com',
              subject: 'Daily Digest',
              body: '{{$json.digestContent}}',
            },
            expectedOutput: 'The email is submitted to Microsoft Graph and the node returns success: true.',
          },
          externalDocsUrl: 'https://learn.microsoft.com/graph/api/user-sendmail',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Outlook: access token not found',
      cause: 'No Microsoft connection was selected or the saved connection could not be resolved for the workflow owner.',
      fix: 'Reconnect Microsoft in CtrlChecks Connections and select the Microsoft Connection in the node credentials panel.',
    },
    {
      error: 'Outlook: to, subject, and body are required',
      cause: 'A required send field is empty or an upstream expression resolved to an empty value.',
      fix: 'Fill To, Subject, and Body, then verify any template expressions resolve to non-empty values.',
    },
    {
      error: 'Outlook sendMail failed (401 or 403)',
      cause: 'The Microsoft OAuth grant is expired, revoked, or missing the Mail.Send delegated permission.',
      fix: 'Reconnect Microsoft and approve User.Read and Mail.Send permissions, then run the node again.',
    },
  ],
  relatedNodes: ['google_gmail', 'email', 'amazon_ses', 'mailgun'],
};
