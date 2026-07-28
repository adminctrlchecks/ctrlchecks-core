import type { ProviderInterpreter } from '../types';

/**
 * Google (Sheets / Gmail / Drive / Calendar / Docs) — first of the settled priority
 * providers (§7 Q7).
 *
 * Note on scope errors: they are attributed to the **connection**, not to a field. A
 * user cannot fix "insufficient permission" by editing a spreadsheet ID, and sending
 * them to the wrong control is worse than sending them nowhere.
 */
export const googleInterpreter: ProviderInterpreter = {
  provider: 'google',
  nodeTypes: [
    'google_sheets',
    'google_gmail',
    'google_drive',
    'google_calendar',
    'google_doc',
    'google_contacts',
    'google_tasks',
  ],
  // Order matters: the more specific message rule must come before the broad 404, or the
  // 404 claims "unable to parse range" and sends the user to the wrong field.
  mappings: [
    {
      messageIncludes: ['unable to parse range', 'invalid range'],
      fieldName: 'range',
      headline: "Google couldn't read that range.",
      why: 'The range does not match a tab in this spreadsheet, or its notation is not valid A1 format.',
      nextSteps: [
        'Check the tab name matches exactly, including spaces and capitalisation.',
        'Use A1 notation, for example Sheet1!A1:D100.',
        'If the tab name contains spaces, wrap it in single quotes: \'My Tab\'!A1:D10.',
      ],
    },
    {
      statuses: [404],
      codes: ['404', 'NOT_FOUND', 'notFound'],
      messageIncludes: ['not found', 'requested entity was not found'],
      fieldName: 'spreadsheetId',
      headline: "That spreadsheet couldn't be found.",
      why: 'Google returned "not found" for the ID in this step, so either the ID is wrong or the connected account cannot see that file.',
      nextSteps: [
        'Open the sheet in your browser and copy the ID from the URL — it is the part between /d/ and /edit.',
        'Check the sheet is shared with the Google account you connected.',
        'If the sheet was recently moved to a shared drive, re-share it with that account.',
      ],
    },
    {
      statuses: [403],
      codes: ['403', 'PERMISSION_DENIED', 'forbidden', 'insufficientPermissions'],
      messageIncludes: [
        'insufficient permission',
        'insufficient authentication scopes',
        'request had insufficient authentication scopes',
        'permission denied',
        'forbidden',
      ],
      headline: 'Your Google connection is missing a permission this step needs.',
      why: 'The account is connected, but it was not granted the specific permission this action requires.',
      nextSteps: [
        'Reconnect Google and accept the additional permission when prompted.',
        'If you are using a work account, an administrator may need to approve it.',
      ],
      isConnectionProblem: true,
    },
    {
      statuses: [401],
      codes: ['401', 'UNAUTHENTICATED', 'invalid_grant'],
      messageIncludes: ['invalid credentials', 'invalid_grant', 'unauthorized', 'token has been expired'],
      headline: 'Your Google connection needs renewing.',
      why: 'The stored authorisation is no longer valid — usually because access was revoked or the password changed.',
      nextSteps: ['Reconnect your Google account.'],
      isConnectionProblem: true,
    },
    {
      statuses: [429],
      codes: ['429', 'RESOURCE_EXHAUSTED', 'rateLimitExceeded', 'userRateLimitExceeded'],
      messageIncludes: ['rate limit', 'quota exceeded', 'too many requests'],
      headline: 'Google is asking us to slow down.',
      why: "The account has hit Google's rate limit for this API. Nothing is wrong with your setup.",
      nextSteps: ['Wait a minute and test this step again.'],
    },
    {
      messageIncludes: ['invalid to header', 'invalid recipient', 'invalid email address'],
      fieldName: 'to',
      headline: "That recipient address isn't valid.",
      why: 'Gmail rejected the address in this field before sending.',
      nextSteps: [
        'Check the address for typos and stray spaces.',
        'If this value comes from an earlier step, confirm that step produces a real email address.',
      ],
    },
    {
      messageIncludes: ['recipient address required', 'no recipient'],
      fieldName: 'to',
      headline: 'This email has no recipient yet.',
      why: 'Gmail needs at least one address in the To field.',
      nextSteps: [
        'Enter an address, or map one from an earlier step.',
      ],
    },
    {
      messageIncludes: ['file not found', 'no such file'],
      fieldName: 'fileId',
      headline: "That Drive file couldn't be found.",
      why: 'Google returned "not found" for the file ID, so it is wrong or not visible to the connected account.',
      nextSteps: [
        'Copy the file ID from the Drive URL.',
        'Check the file is shared with the connected Google account.',
      ],
    },
  ],
};
