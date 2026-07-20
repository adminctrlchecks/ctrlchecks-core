import type { NodeDoc } from '../types';

const durationHelp = [
  'What this field is: The amount of time the workflow should pause before continuing.',
  'Why it matters: It can slow a workflow between API calls, give another system a short time to process, or make notifications arrive in a sensible order.',
  'When to fill it: Fill it whenever this step should wait for a fixed duration. The visible panel uses milliseconds.',
  'What to enter: Type a number such as 1000 for one second, 5000 for five seconds, or 60000 for one minute.',
  'Where the value comes from: Usually this is a fixed value chosen by the workflow builder; backend or AI-generated configs may map a value from an earlier step.',
  'How to use it later: Wait passes the incoming object through unchanged, so the next node reads the same fields such as {{$json.orderId}} and {{$json.customerEmail}}.',
  'Accepted format: A non-negative number. Runtime treats invalid or negative values as 0, and caps the Wait node at 300000 milliseconds, which is 5 minutes.',
  'Real workplace example: Wait 5000 milliseconds after creating a ticket before checking whether the helpdesk API indexed it.',
  'If it is empty or wrong: The workflow may continue immediately, or a very large value may be capped to 5 minutes.',
  'Common mistake: Do not type 5 when you mean five seconds; in the visible UI, 5 means five milliseconds, not five seconds.',
].join('\n');

const unitHelp = [
  'What this field is: A backend-supported time unit used by older or AI-generated configs when Duration is not already in milliseconds.',
  'Why it matters: It changes how the runtime converts Duration into milliseconds before pausing.',
  'When to fill it: The current visual panel does not show this field, but backend configs may include it as milliseconds, seconds, minutes, or hours.',
  'What to enter: Use milliseconds, seconds, minutes, or hours. Short forms such as s, m, and h are also accepted by runtime.',
  'Where the value comes from: Usually this comes from an imported or AI-generated workflow, not from a person using the current visible panel.',
  'How to use it later: The node still returns the original input unchanged, so downstream nodes continue to use {{$json.orderId}} or any other incoming field.',
  'Accepted format: One of milliseconds, seconds, minutes, hours, second, minute, hour, s, m, or h.',
  'Real workplace example: A backend config with duration 2 and unit minutes pauses for 120000 milliseconds before continuing.',
  'If it is empty or wrong: Runtime defaults to milliseconds, so duration 2 becomes two milliseconds instead of two minutes.',
  'Common mistake: Assuming the current UI exposes Unit. For UI users, put the full millisecond value in Duration instead.',
].join('\n');

export const waitDoc: NodeDoc = {
  slug: 'wait',
  displayName: 'Wait',
  category: 'Logic',
  logoUrl: '/icons/nodes/wait.svg',
  description: 'Pause the workflow for a fixed time, then pass the same input object forward unchanged.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account is required. Wait does not use credentials, API keys, tokens, or passwords.',
    'Use it for short fixed pauses between steps. It does not poll a condition, wait for approval, or listen for a webhook.',
    'The current visual panel asks for Duration in milliseconds. The worker also accepts a hidden Unit field in older or AI-generated configs.',
    'Connect the output or outgoing line to the next node that should run after the pause.',
    'Every downstream service node still needs its own account connection after the wait finishes.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Fixed delay',
      description: 'Wait pauses execution for a resolved duration and then returns the original input object.',
      operations: [
        {
          name: 'Wait',
          value: 'default',
          description: 'Use this operation when a workflow needs a short fixed delay before the next connected step runs. The runtime converts Duration and optional Unit into milliseconds, caps the Wait node at five minutes, sleeps for that time, and then passes the incoming object through unchanged.',
          fields: [
            {
              name: 'Duration',
              internalKey: 'duration',
              type: 'number',
              required: true,
              description: 'Fixed wait time, shown in the UI as milliseconds.',
              helpText: durationHelp,
              placeholder: '1000',
              example: '5000',
            },
            {
              name: 'Unit',
              internalKey: 'unit',
              type: 'select',
              required: false,
              description: 'Optional backend time unit for imported or AI-generated configs.',
              helpText: unitHelp,
              placeholder: 'milliseconds',
              defaultValue: 'milliseconds',
              options: ['milliseconds', 'seconds', 'minutes', 'hours'],
              example: 'seconds',
            },
          ],
          outputExample: {
            orderId: 'ORD-1042',
            customerEmail: 'buyer@example.com',
            status: 'created',
          },
          outputDescription: 'Wait returns the input unchanged after the pause. There is no resumed flag, no reason field, and no waitedMs field for the wait node. Very large durations are capped to 5 minutes before the same fields, such as {{$json.orderId}}, continue downstream.',
          usageExample: {
            scenario: 'Pause briefly after creating a support ticket before sending a follow-up message that references the same ticket.',
            inputValues: {
              duration: '5000',
              unit: 'milliseconds',
            },
            expectedOutput: 'After five seconds, the next node receives the unchanged ticket data and can still read {{$json.orderId}} and {{$json.customerEmail}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Delay is much shorter than expected',
      cause: 'The visible Duration field is in milliseconds, so entering 5 means five milliseconds.',
      fix: 'Use 5000 for five seconds, 60000 for one minute, or 300000 for five minutes.',
    },
    {
      error: 'Long wait ended after five minutes',
      cause: 'The Wait runtime caps this node at 300000 milliseconds to avoid tying up the worker for very long sleeps.',
      fix: 'Use a scheduler, trigger, approval node, or external callback pattern for longer waits.',
    },
    {
      error: 'Expected condition_met, timeout, or waitedMs output',
      cause: 'Those fields are not produced by the Wait node. It passes input through unchanged.',
      fix: 'Map the original incoming fields after Wait, such as {{$json.orderId}}, or use a node designed for condition checks.',
    },
    {
      error: 'Next node still cannot access a service',
      cause: 'Wait has no connection and does not authenticate downstream service nodes or satisfy their account connection requirements.',
      fix: 'Configure the required Connection on the service node that runs after Wait.',
    },
  ],
  relatedNodes: ['delay', 'schedule', 'interval', 'retry'],
};
