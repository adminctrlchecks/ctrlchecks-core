import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const noCredentialSteps = [
  'No third-party account is required; Timeout only compares workflow elapsed time with its Limit setting.',
  'Connect this node output to the success or timeout outgoing line depending on which path should continue.',
  'Any service node before or after this node still needs its own service node account connection.',
];

const limitField: FieldDoc = {
  name: 'Limit',
  internalKey: 'limit',
  type: 'number',
  required: true,
  description: 'Maximum allowed elapsed workflow time in milliseconds before routing to the timeout branch.',
  helpText: richFieldHelp({
    what: 'Limit is the elapsed workflow time threshold, in milliseconds, used by the Timeout node.',
    why: 'It decides whether the node routes to success or timeout based on how long the workflow has been running since its recorded start time.',
    when: 'Fill it whenever a workflow path should branch if earlier work has already taken too long.',
    enter: 'Enter milliseconds such as 30000 for 30 seconds, 60000 for one minute, or map {{$json.timeoutLimitMs}} from an earlier policy step.',
    source: 'Choose the value from the SLA or business deadline for this workflow path, not from a credential or service account.',
    later: 'The runtime output includes {{$json.elapsedMs}}, {{$json.limitMs}}, {{$json.timedOut}}, {{$json.originalInput}}, and {{$json.__routing.branch}}.',
    format: 'Positive number of milliseconds.',
    example: 'An intake workflow uses 30000 so urgent support tickets route to a fallback branch if enrichment has already taken more than 30 seconds.',
    empty: 'The registry override returns INVALID_CONFIG with Invalid timeout limit. Must be a positive number. if Limit is missing, non-numeric, or not greater than zero.',
    mistake: 'Do not expect this node to pause or cancel a single API call. It checks elapsed workflow time at the point where the Timeout node runs.',
  }),
  placeholder: '30000',
  example: '30000',
  defaultValue: '30000',
};

export const timeoutDoc: NodeDoc = {
  slug: 'timeout',
  displayName: 'Timeout',
  category: 'Flow',
  logoUrl: '/icons/nodes/timeout.svg',
  description: 'Route a workflow path to success or timeout based on elapsed workflow time.',
  credentialType: 'None',
  credentialSetupSteps: noCredentialSteps,
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Timeout has one operation. The registry override validates Limit, compares it with elapsed workflow time, and emits routing data; it does not call another service.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Check whether the workflow has exceeded the configured elapsed-time limit and route to success or timeout. Use this near a deadline-sensitive point, such as before sending a fallback alert or after several enrichment steps.',
          fields: [limitField],
          outputExample: {
            elapsedMs: 42150,
            limitMs: 30000,
            timedOut: true,
            originalInput: {
              ticketId: 'SUP-2001',
              priority: 'urgent',
            },
            __routing: {
              branch: 'timeout',
            },
          },
          outputDescription: 'The output contains elapsedMs, limitMs, timedOut, originalInput, and __routing. timedOut true routes to the timeout branch; timedOut false routes to success. limitMs is used instead of limit because output cleaning can strip keys that shadow config keys.',
          usageExample: {
            scenario: 'After several enrichment steps, branch urgent tickets to a human fallback if the workflow has already exceeded a 30-second service target.',
            inputValues: {
              limit: '30000',
            },
            expectedOutput: 'The next step can read {{$json.timedOut}}, {{$json.elapsedMs}}, {{$json.limitMs}}, {{$json.originalInput.ticketId}}, and {{$json.__routing.branch}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'INVALID_CONFIG',
      cause: 'The registry override only accepts a positive numeric Limit.',
      fix: 'Enter a positive number of milliseconds such as 30000, or map an upstream field that resolves to a number.',
    },
    {
      error: 'Invalid timeout limit. Must be a positive number.',
      cause: 'Limit was missing, zero, negative, text, or another value that is not a valid number.',
      fix: 'Correct the Limit field and rerun. Use 30000 for 30 seconds rather than typing 30.',
    },
    {
      error: 'timedOut true routes to timeout branch',
      cause: 'The workflow elapsed time was greater than the configured limit when this node executed.',
      fix: 'Connect the timeout outgoing line to fallback handling, such as alerting a team or returning a graceful response.',
    },
    {
      error: 'limitMs is used instead of limit',
      cause: 'The runtime intentionally names the output limitMs because a top-level output key named limit can be removed when it matches the config key.',
      fix: 'Map {{$json.limitMs}} after this node, not {{$json.limit}}.',
    },
  ],
  relatedNodes: ['retry', 'try_catch', 'error_handler'],
};
