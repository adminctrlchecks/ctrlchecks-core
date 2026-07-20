import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const fields: FieldDoc[] = [
  {
    name: 'Interval',
    internalKey: 'interval',
    type: 'number',
    required: true,
    description: 'How many units of time to wait between automatic runs.',
    helpText: 'What this field means: Interval is the number part of how often this workflow repeats, paired with the Unit dropdown below (for example, 15 + Minutes runs every 15 minutes). Why it matters: This is the only control over how often the workflow fires automatically; too small a number on a busy workflow can waste API calls and quota, and too large a number can delay time-sensitive work. When to fill it: Always required — the trigger needs a positive number before it can activate. What to enter: A whole number, clamped in the panel to 1-59 when Unit is Minutes or 1-23 when Unit is Hours. Where the value comes from: Decide it based on how urgent the recurring task is, such as polling an inbox every 5 minutes or refreshing a report every 6 hours. How to use it later: This is a setup value only; it is not emitted as {{$json.interval}} to downstream nodes. Accepted format: Positive whole number, no units or text. Real workplace example: A support team polls a ticket queue every 5 minutes (Interval = 5, Unit = Minutes) so new tickets are triaged quickly without overloading the ticketing API. If it is empty or wrong: A blank or zero value is rejected by the panel input (minimum 1); values above the clamp are rounded down to 59 minutes or 23 hours. Common mistake: Typing a number expecting seconds-level precision — this node has no seconds unit, so use Minutes with a small number instead.',
    placeholder: '5',
    example: '5',
    defaultValue: '5',
  },
  {
    name: 'Unit',
    internalKey: 'unit',
    type: 'string',
    required: true,
    description: 'The time unit the Interval number is measured in.',
    helpText: 'What this field means: Unit tells CtrlChecks whether the Interval number above means minutes or hours. Why it matters: The same number means a very different frequency depending on the unit — 5 minutes is frequent polling, 5 hours is a few times a day. When to fill it: Always required alongside Interval. What to enter: Choose Minutes for anything from every 1 to every 59 minutes, or Hours for every 1 to every 23 hours. Where the value comes from: Match it to how time-sensitive the recurring task is — inbox/API polling usually uses Minutes, digest or cleanup jobs usually use Hours. How to use it later: This is a setup value only; it is not emitted as {{$json.unit}} to downstream nodes. Accepted format: One of minutes or hours — there is no seconds option in this node. Real workplace example: A daily inventory sync uses Unit = Hours with Interval = 6 so it runs four times a day. If it is empty or wrong: The dropdown always has a value selected (defaults to Minutes), so this cannot be left blank in the panel. Common mistake: Assuming a once-a-day or specific-time schedule is possible here — for an exact daily time or weekly/monthly pattern, use the Schedule Trigger node instead of Interval.',
    placeholder: 'minutes',
    example: 'minutes',
    defaultValue: 'minutes',
    options: ['minutes', 'hours'],
    notes: 'Visual dropdown options: Minutes (1-59) and Hours (1-23). Seconds are not supported by this node.',
  },
];

const executeOperation: OperationDoc = {
  name: 'Run on interval',
  value: 'default',
  description: 'Starts the workflow automatically and repeatedly, waiting the configured Interval/Unit between each run once the workflow is saved and active. Every run passes through unchanged with only an execution timestamp added.',
  fields,
  outputExample: {
    executed_at: '2026-07-19T10:05:00.000Z',
    _scheduled: 'true',
    _trigger: 'schedule',
  },
  outputDescription: 'executed_at: ISO timestamp of this run, generated fresh every time the trigger fires. _scheduled/_trigger: internal marker fields the browser-based scheduler sends with every automatic call so downstream logic can tell an automatic run apart from a manual one; do not rely on _trigger equaling "interval" — the scheduler always sends "schedule" here even for Interval Trigger runs. Any other object passed in as test/manual input is also copied through unchanged alongside these fields.',
  usageExample: {
    scenario: 'Poll a support inbox every 5 minutes and create a ticket for each new message',
    inputValues: { interval: '5', unit: 'minutes' },
    expectedOutput: 'The workflow fires every 5 minutes once activated and a browser tab has initialized the schedule. Use {{$json.executed_at}} in a log or ticket record, then connect an HTTP Request or Gmail node to fetch new messages on each run.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const intervalDoc: NodeDoc = {
  slug: 'interval',
  displayName: 'Interval Trigger',
  category: 'Triggers',
  logoUrl: '/icons/nodes/interval.svg',
  description: 'Start the workflow automatically on a repeating timer, such as every 5 minutes or every 6 hours.',
  credentialType: 'None',
  credentialSetupSteps: [
    'No third-party account, API key, token, or saved connection is needed for this trigger.',
    'Save the workflow first. The panel note "Save the workflow first — the interval will activate automatically after saving" means the recurring timer cannot start until the workflow has a real ID.',
    'Set Interval and Unit, then leave the field — every change is saved immediately and a fresh cron-style schedule is written to the workflow as soon as you do.',
    'Activate the workflow (status must be active) so scheduled runs are accepted.',
    'Important: the recurring timer that actually calls this workflow runs in your browser, not as a separate always-on server job. Keep a CtrlChecks tab open (any page — the scheduler initializes for every workflow with a saved interval when the app loads) so the workflow keeps firing. If every browser tab is closed, the workflow stops firing until a tab is opened again, at which point it resumes on the saved schedule.',
    'Connect the trigger output to the next step with the outgoing line. Any node after Interval Trigger still needs its own account connection for the service it calls.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Recurring execution',
      description: 'Interval Trigger is configured directly with Interval and Unit and needs no saved account connection.',
      operations: [executeOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Interval saved to node config but failed to save to workflow. Scheduler may not start.',
      cause: 'The workflow-level cron schedule failed to save (network error, missing workflow, or the workflow has not been saved for the first time yet).',
      fix: 'Save the workflow so it has a real ID, then re-enter Interval or Unit to retry saving the schedule.',
    },
    {
      error: 'Workflow does not fire on schedule',
      cause: 'No CtrlChecks browser tab has been open to initialize the scheduler since the last time all tabs were closed, or the workflow is not active.',
      fix: 'Open CtrlChecks in a browser tab (the scheduler restarts automatically for every saved interval workflow) and confirm the workflow status is Active.',
    },
    {
      error: 'Invalid cron expression for workflow',
      cause: 'The saved schedule value on the workflow is not one of the simple every-N-minutes or every-N-hours patterns the scheduler understands.',
      fix: 'Re-enter Interval and Unit in the node panel so CtrlChecks regenerates a supported schedule automatically; do not hand-edit the underlying schedule value.',
    },
    {
      error: 'Duplicate or overlapping executions',
      cause: 'A previous run has not finished before the next interval elapses.',
      fix: 'Increase Interval so runs have time to complete, or add a Wait/short-circuit step in the workflow to skip overlapping work.',
    },
    {
      error: 'Next node cannot find expected trigger fields',
      cause: 'A downstream node is mapped to a field this trigger never produces, such as {{$json.interval}}, {{$json.firedAt}}, or {{$json.iteration}}.',
      fix: 'Map only {{$json.executed_at}} from this trigger; any other data must come from a node placed after it, such as an HTTP Request or database read.',
    },
    {
      error: 'Permission denied after Interval Trigger',
      cause: 'The trigger fired correctly, but the downstream service node lacks its own account connection or permission.',
      fix: 'Connect the downstream service node under Connections and confirm it has the permission needed for that action.',
    },
  ],
  relatedNodes: ['schedule', 'http_request', 'if_else'],
};
