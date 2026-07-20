import type { FieldDoc, NodeDoc } from '../types';

const durationHelp = `What this field means: Duration is the number of milliseconds the Delay node should pause before the next connected step runs.
Why it matters: It controls pacing for follow-ups, polling, rate-limit spacing, or a short pause after an external system receives data.
When to fill it: Fill it every time you use this node; the visual panel exposes milliseconds only, while older generated workflows may also include a unit field.
What to enter: Enter a positive whole number such as 1000 for one second, 30000 for thirty seconds, or 300000 for five minutes.
Where the value comes from: Choose it from your business timing rule, a provider's rate-limit guidance, or a previous workflow value such as {{$json.delayMs}}.
How to use it later: After the wait finishes, downstream nodes can read {{$json.waitedMs}} to log how long the node actually paused and {{$json.originalInput}} for the incoming payload.
Accepted format: Digits only in milliseconds; do not type "seconds", "minutes", or "ms" into this field.
Real workplace example: A support workflow waits 30000 milliseconds after creating an export job before checking whether the file is ready.
If it is empty or wrong: Blank, negative, or invalid values become zero or return an invalid-duration error; very long values are capped to ten minutes by the worker.
Common mistake to avoid: Do not expect the Delay node to return delayed, delayMs, or resumedAt; those keys are not produced by the current runtime.`;

const durationField: FieldDoc = {
  name: 'Duration (ms)',
  internalKey: 'duration',
  type: 'number',
  required: true,
  description: 'Milliseconds to pause before the workflow continues.',
  helpText: durationHelp,
  placeholder: '1000',
  example: '1000',
  defaultValue: '1000',
};

const unitHelp = `What this field means: Unit is an older backend-supported companion to Duration that can tell the runtime whether the number is milliseconds, seconds, minutes, or hours.
Why it matters: The visual panel exposes Duration in milliseconds, but generated workflows may still include unit and the worker will multiply the duration before applying the ten-minute cap.
When to fill it: Leave it blank in the visual editor when you are entering milliseconds; fill it only when a generated workflow or imported config uses a non-millisecond unit.
What to enter: Use milliseconds, seconds, minutes, or hours; ms, s, m, and h are also accepted aliases by the runtime.
Where the value comes from: Choose it from the timing rule used by the workflow builder, or map a controlled value such as {{$json.delayUnit}} from a settings record.
How to use it later: Downstream nodes still read {{$json.waitedMs}} for the actual parsed wait and {{$json.originalInput}} for the payload that arrived before the pause.
Accepted format: One of milliseconds, seconds, minutes, hours, ms, s, m, or h; blank behaves like milliseconds.
Real workplace example: A generated polling workflow sets duration=30 and unit=seconds, which becomes about 30000 milliseconds before the next API check.
If it is empty or wrong: Blank uses milliseconds; an unsupported unit can make the wait shorter or longer than intended before the cap is applied.
Common mistake to avoid: Do not set duration=30000 and unit=seconds unless you really mean 30,000 seconds, because the worker will cap that very long request.`;

const unitField: FieldDoc = {
  name: 'Unit',
  internalKey: 'unit',
  type: 'select',
  required: false,
  description: 'Optional runtime unit for generated workflows; the visual panel usually uses milliseconds directly.',
  options: ['milliseconds', 'seconds', 'minutes', 'hours'],
  helpText: unitHelp,
  defaultValue: 'milliseconds',
};

export const delayDoc: NodeDoc = {
  slug: 'delay',
  displayName: 'Delay',
  category: 'Utility',
  logoUrl: '/icons/nodes/delay.svg',
  description: 'Pause workflow execution for a fixed duration, then continue with a structured delay result.',
  credentialType: 'No third-party account or credentials',
  credentialSetupSteps: [
    'Delay does not use credentials, API keys, OAuth, or a saved account connection.',
    'Configure Duration in milliseconds, then connect the output with an outgoing line to the next node that should run after the pause.',
    'A downstream service node still needs its own account connection; Delay only controls timing and never authenticates another service.',
    'The worker caps Delay at ten minutes to keep executions bounded.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Delay',
      description: 'The Delay node has one visual setting and pauses the worker before producing its result.',
      operations: [
        {
          name: 'Pause',
          value: 'default',
          description: 'Waits for the configured number of milliseconds and then returns success, waitedMs, and originalInput. This node is not the same output contract as Wait: Wait passes input through unchanged, while Delay wraps the incoming payload under originalInput.',
          fields: [durationField, unitField],
          outputExample: {
            success: true,
            waitedMs: 5000,
            originalInput: { ticketId: 'SUP-1042', status: 'export_started' },
          },
          outputDescription: 'success: true when the pause completed. waitedMs: the actual delay in milliseconds after parsing and the ten-minute cap. originalInput: the exact object that entered the Delay node so later steps can still inspect the prior payload through {{$json.originalInput}}.',
          usageExample: {
            scenario: 'Wait five seconds after starting a report export before polling the reporting API for the generated file',
            inputValues: { duration: '5000', unit: 'milliseconds' },
            expectedOutput: 'The node returns {{$json.success}}, {{$json.waitedMs}}, and {{$json.originalInput}} for downstream logging or polling steps.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Invalid duration',
      cause: 'The duration could not be parsed as a non-negative number.',
      fix: 'Enter a whole number of milliseconds, such as 1000 or 30000.',
    },
    {
      error: 'Long delay was capped',
      cause: 'The requested delay was longer than the runtime safety limit.',
      fix: 'Use Delay for short waits only; use Schedule, Interval, or a trigger-based workflow for longer waits.',
    },
    {
      error: 'Expected delayed, delayMs, or resumedAt output',
      cause: 'Those keys were from stale documentation and are not returned by the current Delay runtime.',
      fix: 'Use {{$json.success}}, {{$json.waitedMs}}, and {{$json.originalInput}} instead.',
    },
    {
      error: 'Next node cannot find original fields at top level',
      cause: 'Delay returns the incoming payload under originalInput instead of spreading it at the top level.',
      fix: 'Map values from {{$json.originalInput.fieldName}} or use Wait when you need unchanged passthrough behavior.',
    },
  ],
  relatedNodes: ['wait', 'retry', 'schedule', 'interval'],
};
