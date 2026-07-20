import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const noCredentialSteps = [
  'No third-party account is required; Retry only reads retry settings and incoming workflow data.',
  'Connect this node output to the next step with the outgoing line that should continue after the retry marker.',
  'Any service node being protected by retry behavior still needs its own service node account connection.',
];

const maxAttemptsField: FieldDoc = {
  name: 'Max Attempts',
  internalKey: 'maxAttempts',
  type: 'number',
  required: true,
  description: 'Maximum retry attempt count recorded for engine-level retry orchestration.',
  helpText: richFieldHelp({
    what: 'Max Attempts is the number of tries the workflow should allow when retry orchestration is applied around a failing branch.',
    why: 'It prevents an unstable API, database, or service call from retrying forever and gives later routing metadata a clear retry limit.',
    when: 'Fill it whenever you use Retry. Use small numbers for customer-facing work and larger numbers only for background jobs that can safely wait.',
    enter: 'Enter a whole number such as 3 or map {{$json.retryLimit}} when a previous configuration step decides the retry count.',
    source: 'Usually this is a business rule chosen by the workflow owner. If it comes from data, it should already be a positive number in the previous node output.',
    later: 'The runtime output includes {{$json.maxAttempts}} and metadata.retryConfig.maxAttempts so downstream logs or branches can see the configured limit.',
    format: 'Positive number, normally 1 to 5.',
    example: 'A billing workflow uses 3 attempts for a payment status lookup because transient network failures usually clear on the next try.',
    empty: 'The executor defaults to 3 when no usable number is supplied; schema validation can still report maxAttempts must be at least 1 in validation paths.',
    mistake: 'Do not set a very high value for operations that send emails, charge cards, or create tickets unless those downstream steps are idempotent.',
  }),
  placeholder: '3',
  example: '3',
  defaultValue: '3',
};

const delayBetweenField: FieldDoc = {
  name: 'Delay Between',
  internalKey: 'delayBetween',
  type: 'number',
  required: false,
  description: 'Milliseconds recorded as the wait time between retry attempts.',
  helpText: richFieldHelp({
    what: 'Delay Between is the base wait time, in milliseconds, that retry orchestration should use between attempts.',
    why: 'A pause gives rate-limited or temporarily unavailable services time to recover instead of immediately repeating the same failure.',
    when: 'Set it when the next branch contacts an external API, database, email provider, or other service that can fail temporarily.',
    enter: 'Enter milliseconds such as 1000 for one second, 5000 for five seconds, or map {{$json.retryDelayMs}} from an earlier policy step.',
    source: 'Choose the value from your service tolerance or SLA. Some API providers recommend minimum retry delays in their rate-limit guidance.',
    later: 'The runtime output includes {{$json.delayBetween}} and metadata.retryConfig.delayBetween for logging or later decisions.',
    format: 'Whole number of milliseconds.',
    example: 'A support sync waits 5000 ms between attempts so a CRM rate-limit window can clear before trying again.',
    empty: 'The executor defaults to 1000. The old visible field named delay has no runtime effect after this audit because the executor reads delayBetween.',
    mistake: 'Do not type seconds as 5 if you mean five seconds; use 5000 because the field is milliseconds.',
  }),
  placeholder: '1000',
  example: '1000',
  defaultValue: '1000',
};

const backoffField: FieldDoc = {
  name: 'Backoff',
  internalKey: 'backoff',
  type: 'select',
  required: false,
  description: 'Choose None for the same delay every time, Linear for gradually increasing waits, or Exponential for waits that grow quickly.',
  helpText: richFieldHelp({
    what: 'Backoff is the retry delay strategy stored with the retry configuration. None means no growth, Linear grows steadily, and Exponential grows faster after each attempt.',
    why: 'Backoff helps protect external services from repeated pressure when an outage or rate limit is already happening.',
    when: 'Use None for quick local or idempotent checks, Linear for moderate service recovery, and Exponential for rate limits or unstable third-party APIs.',
    enter: 'Pick None, Linear, or Exponential. Map {{$json.backoff}} only when the previous step provides one of the exact values none, linear, or exponential.',
    source: 'This is usually chosen from the reliability policy for the downstream service. It is not copied from credentials or account settings.',
    later: 'The runtime output includes {{$json.backoff}} and metadata.retryConfig.backoff so later logs can show which retry policy was selected.',
    format: 'Dropdown value none, linear, or exponential.',
    example: 'A webhook delivery workflow chooses Exponential before retrying a partner API that sometimes returns rate-limit responses.',
    empty: 'The executor defaults to none. The old visible Backoff Multiplier field had no runtime effect because the executor reads backoff.',
    mistake: 'Do not enter numeric multipliers here; use the dropdown strategy name the runtime actually reads.',
  }),
  placeholder: 'none',
  example: 'exponential',
  defaultValue: 'none',
  options: ['None', 'Linear', 'Exponential'],
  notes: 'None records a fixed delay. Linear records steadily increasing delay intent. Exponential records faster growth intent for rate limits. This node still passes input through; actual branch retry loops are an orchestration concern.',
};

export const retryDoc: NodeDoc = {
  slug: 'retry',
  displayName: 'Retry',
  category: 'Flow',
  logoUrl: '/icons/nodes/retry.svg',
  description: 'Pass data through while attaching retry settings for engine-level retry orchestration.',
  credentialType: 'None',
  credentialSetupSteps: noCredentialSteps,
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Retry records maxAttempts, delayBetween, and backoff for the workflow engine. The legacy node body itself does not re-run the previous node or child branch; it forwards object input with retry policy fields attached.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Attach retry policy settings to the workflow data and registry metadata. Use it near a branch that may be retried by orchestration, while remembering that this execution case is a passthrough marker rather than the actual loop that replays a failing service call.',
          fields: [maxAttemptsField, delayBetweenField, backoffField],
          outputExample: {
            ticketId: 'SUP-1008',
            maxAttempts: 3,
            delayBetween: 1000,
            backoff: 'exponential',
            attempts: 0,
          },
          outputDescription: 'The output preserves object input fields such as ticketId, adds attempts with the current legacy value 0, and echoes maxAttempts, delayBetween, and backoff. Registry metadata also includes branch success and retryConfig with the same values. No lastError or wrapped output field is created by this runtime path.',
          usageExample: {
            scenario: 'Before calling a partner enrichment API, attach a retry policy so workflow logs and engine-level retry handling know the intended attempt limit and backoff strategy.',
            inputValues: {
              maxAttempts: '3',
              delayBetween: '1000',
              backoff: 'exponential',
            },
            expectedOutput: 'The next step can read {{$json.ticketId}}, {{$json.attempts}}, {{$json.maxAttempts}}, {{$json.delayBetween}}, and {{$json.backoff}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Retry node does not rerun the previous node by itself',
      cause: 'The actual retry loop is an orchestration concern. This node case passes input through and attaches retry settings.',
      fix: 'Wire the workflow branch according to the engine pattern for retryable work, and use logs to confirm retry handling around the protected service node.',
    },
    {
      error: 'Delay field has no effect',
      cause: 'The executor reads delayBetween. Older configs or UI fields named delay are ignored by the runtime.',
      fix: 'Use delayBetween in node config and update older workflows that still contain delay.',
    },
    {
      error: 'Backoff Multiplier has no effect',
      cause: 'The executor reads backoff as none, linear, or exponential. It does not read a numeric backoffMultiplier field.',
      fix: 'Choose the Backoff dropdown value that matches the strategy instead of entering a multiplier.',
    },
    {
      error: 'maxAttempts must be at least 1',
      cause: 'Schema validation requires a positive retry count, even though the legacy fallback defaults missing values to 3.',
      fix: 'Enter a positive whole number such as 1, 3, or 5, and avoid blank or zero values in generated configs.',
    },
  ],
  relatedNodes: ['try_catch', 'error_handler', 'timeout'],
};
