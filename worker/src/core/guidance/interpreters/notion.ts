import type { ProviderInterpreter } from '../types';

/**
 * Notion — third of the settled priority providers (§7 Q7).
 *
 * Notion's most common build-time failure is not a wrong ID but an un-shared page: the
 * integration must be explicitly added to each page or database. That distinction is worth
 * spelling out, because "not found" reads as a typo when it usually is not.
 */
export const notionInterpreter: ProviderInterpreter = {
  provider: 'notion',
  nodeTypes: ['notion'],
  mappings: [
    {
      codes: ['object_not_found'],
      statuses: [404],
      messageIncludes: ['could not find database', 'could not find page', 'object_not_found'],
      fieldName: 'databaseId',
      headline: "Notion couldn't find that page or database — usually a sharing problem.",
      why: 'Notion returns "not found" both when an ID is wrong and when the integration has not been shared with that page. The second is far more common.',
      nextSteps: [
        'Open the page or database in Notion, click ••• → Connections, and add your integration.',
        'Then check the ID: it is the 32-character string in the URL.',
      ],
    },
    {
      codes: ['unauthorized', 'restricted_resource'],
      statuses: [401],
      messageIncludes: ['api token is invalid', 'unauthorized', 'restricted_resource'],
      headline: 'Your Notion connection needs renewing.',
      why: 'The stored token is no longer valid or has been restricted.',
      nextSteps: ['Reconnect Notion.'],
      isConnectionProblem: true,
    },
    {
      codes: ['validation_error'],
      statuses: [400],
      messageIncludes: ['body failed validation', 'validation_error'],
      fieldName: 'properties',
      headline: "Those properties don't match the database.",
      why: 'Notion rejected the property payload — a name or type does not match the database schema.',
      nextSteps: [
        'Check each property name matches the database column exactly, including capitalisation.',
        'Check the types line up: a date column needs a date, a select needs an existing option.',
      ],
    },
    {
      codes: ['rate_limited'],
      statuses: [429],
      messageIncludes: ['rate limited', 'rate_limited'],
      headline: 'Notion is asking us to slow down.',
      why: 'The integration has hit its rate limit. Nothing is wrong with your setup.',
      nextSteps: ['Wait a moment and test this step again.'],
    },
    {
      codes: ['conflict_error'],
      statuses: [409],
      messageIncludes: ['conflict'],
      headline: 'Notion was busy with a conflicting edit.',
      why: 'Another change to the same page landed at the same moment.',
      nextSteps: ['Test this step again.'],
    },
  ],
};
