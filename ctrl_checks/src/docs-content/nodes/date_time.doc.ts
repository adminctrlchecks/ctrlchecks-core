import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const dateField: FieldDoc = {
  name: 'Date',
  internalKey: 'date',
  type: 'string',
  required: false,
  description: 'Base date. Leave empty to use the current date/time.',
  helpText: 'Use an ISO date/time or an expression such as {{$json.createdAt}}.',
  placeholder: '2026-07-12T09:00:00Z',
  example: '{{$json.createdAt}}',
};

const timezoneField: FieldDoc = {
  name: 'Timezone',
  internalKey: 'timezone',
  type: 'string',
  required: false,
  description: 'IANA timezone name.',
  helpText: 'Examples: UTC, Asia/Kolkata, America/New_York.',
  placeholder: 'UTC',
  example: 'Asia/Kolkata',
};

function operation(op: OperationDoc): OperationDoc {
  return { ...op, externalDocsUrl: 'https://docs.ctrlchecks.com' };
}

export const dateTimeDoc: NodeDoc = {
  slug: 'date_time',
  displayName: 'Date/Time',
  category: 'Data',
  logoUrl: '/icons/nodes/date_time.svg',
  description: 'Create, format, offset, compare, and inspect date/time values.',
  credentialType: 'None',
  credentialSetupSteps: ['This node does not need a saved account connection.'],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Date/Time exposes operation choices directly.',
      operations: [
        operation({
          name: 'Now',
          value: 'now',
          description: 'Return the current date/time, optionally formatted in a timezone.',
          fields: [timezoneField],
          outputExample: { datetime: '2026-07-12T09:00:00.000Z', timestamp: 1783855800000 },
          outputDescription: 'datetime: Current date/time as ISO or timezone-formatted text. timestamp: Unix time in milliseconds.',
          usageExample: { scenario: 'Stamp a record with the workflow run time', inputValues: { timezone: 'UTC' }, expectedOutput: '`{{$json.datetime}}` contains the generated time.' },
        }),
        operation({
          name: 'Format',
          value: 'format',
          description: 'Format a date/time as ISO, timestamp, locale text, or a custom token pattern.',
          fields: [
            dateField,
            {
              name: 'Format',
              internalKey: 'format',
              type: 'string',
              required: false,
              description: 'ISO, TIMESTAMP, LOCALE, or CUSTOM.',
              helpText: 'CUSTOM supports YYYY, MM, DD, HH, mm, and ss tokens.',
              placeholder: 'ISO',
              example: 'ISO',
              defaultValue: 'ISO',
            },
            timezoneField,
            {
              name: 'Locale',
              internalKey: 'locale',
              type: 'string',
              required: false,
              description: 'Locale used when format is LOCALE.',
              helpText: 'Example: en-US or en-GB.',
              placeholder: 'en-US',
              example: 'en-US',
            },
            {
              name: 'Custom Format',
              internalKey: 'customFormat',
              type: 'string',
              required: false,
              description: 'Custom token pattern used when format is CUSTOM.',
              helpText: 'Supported tokens: YYYY, MM, DD, HH, mm, ss.',
              placeholder: 'YYYY-MM-DD HH:mm:ss',
              example: 'YYYY-MM-DD',
            },
          ],
          outputExample: { datetime: '2026-07-12T09:00:00.000Z' },
          outputDescription: 'datetime: The formatted date/time string.',
          usageExample: { scenario: 'Format an ISO date for an email', inputValues: { date: '{{$json.createdAt}}', format: 'LOCALE', locale: 'en-US' }, expectedOutput: '`{{$json.datetime}}` contains the formatted date.' },
        }),
        operation({
          name: 'Add',
          value: 'add',
          description: 'Add a duration to a date.',
          fields: [
            dateField,
            { name: 'Value', internalKey: 'value', type: 'number', required: false, description: 'Amount to add.', helpText: 'Runtime defaults to 0 if empty.', placeholder: '7', example: '7' },
            { name: 'Unit', internalKey: 'unit', type: 'string', required: false, description: 'seconds, minutes, hours, days, weeks, months, or years.', helpText: 'Runtime defaults to minutes if empty.', placeholder: 'days', example: 'days' },
          ],
          outputExample: { datetime: '2026-07-19T09:00:00.000Z' },
          outputDescription: 'datetime: The date after adding the configured value and unit.',
          usageExample: { scenario: 'Calculate a renewal date', inputValues: { date: '{{$json.startDate}}', value: '30', unit: 'days' }, expectedOutput: '`{{$json.datetime}}` contains the future date.' },
        }),
        operation({
          name: 'Subtract',
          value: 'subtract',
          description: 'Subtract a duration from a date.',
          fields: [
            dateField,
            { name: 'Value', internalKey: 'value', type: 'number', required: false, description: 'Amount to subtract.', helpText: 'Runtime defaults to 0 if empty.', placeholder: '7', example: '7' },
            { name: 'Unit', internalKey: 'unit', type: 'string', required: false, description: 'seconds, minutes, hours, days, weeks, months, or years.', helpText: 'Runtime defaults to minutes if empty.', placeholder: 'days', example: 'days' },
          ],
          outputExample: { datetime: '2026-07-05T09:00:00.000Z' },
          outputDescription: 'datetime: The date after subtracting the configured value and unit.',
          usageExample: { scenario: 'Find the start of a lookback window', inputValues: { date: '{{$now}}', value: '7', unit: 'days' }, expectedOutput: '`{{$json.datetime}}` contains the earlier date.' },
        }),
        operation({
          name: 'Diff',
          value: 'diff',
          description: 'Calculate the difference between Date and End Date.',
          fields: [
            dateField,
            { name: 'End Date', internalKey: 'endDate', type: 'string', required: true, description: 'Date to compare against Date.', helpText: 'Required for diff.', placeholder: '2026-07-13T09:00:00Z', example: '{{$json.finishedAt}}' },
            { name: 'Unit', internalKey: 'unit', type: 'string', required: false, description: 'seconds, minutes, hours, days, or weeks.', helpText: 'Runtime defaults to minutes if empty.', placeholder: 'minutes', example: 'minutes' },
          ],
          outputExample: { diff: 1440, diffMs: 86400000, unit: 'minutes' },
          outputDescription: 'diff: Difference in the selected unit. diffMs: Difference in milliseconds. unit: Unit used.',
          usageExample: { scenario: 'Measure fulfillment time', inputValues: { date: '{{$json.createdAt}}', endDate: '{{$json.fulfilledAt}}', unit: 'minutes' }, expectedOutput: '`{{$json.diff}}` contains the rounded difference.' },
        }),
        operation({
          name: 'Convert Timezone',
          value: 'convertTimezone',
          description: 'Render a date/time in a target timezone.',
          fields: [{ ...dateField }, { ...timezoneField, required: true }],
          outputExample: { datetime: '2026-07-12T14:30:00', timezone: 'Asia/Kolkata' },
          outputDescription: 'datetime: Date/time rendered in the target timezone. timezone: Target timezone used.',
          usageExample: { scenario: 'Convert an event time to customer local time', inputValues: { date: '{{$json.eventTime}}', timezone: 'Asia/Kolkata' }, expectedOutput: '`{{$json.datetime}}` contains local time.' },
        }),
        operation({
          name: 'Get Timezone Info',
          value: 'getTimezoneInfo',
          description: 'Return timezone offset and display name for a date.',
          fields: [dateField, timezoneField],
          outputExample: { timezone: 'Asia/Kolkata', offset: '+05:30', longName: 'India Standard Time', isoDate: '2026-07-12T09:00:00.000Z' },
          outputDescription: 'timezone: IANA timezone. offset: GMT offset. longName: Timezone name. isoDate: Base date as ISO.',
          usageExample: { scenario: 'Add timezone details to a scheduling confirmation', inputValues: { date: '{{$json.meetingTime}}', timezone: 'Asia/Kolkata' }, expectedOutput: 'Timezone details are available downstream.' },
        }),
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Invalid date',
      cause: 'The Date or End Date field did not resolve to a valid date.',
      fix: 'Use an ISO date string such as 2026-07-12T09:00:00Z.',
    },
    {
      error: 'Timezone is required',
      cause: 'convertTimezone was selected without a timezone.',
      fix: 'Set Timezone to an IANA value such as UTC or Asia/Kolkata.',
    },
  ],
  relatedNodes: [],
};
