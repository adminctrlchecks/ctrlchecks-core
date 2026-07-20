import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Which date/time calculation to perform: get the current time, format a date, add or subtract a duration, diff two dates, convert timezone, or read timezone info.',
  helpText:
    'What this field is: The dropdown that chooses which date/time operation this node performs.\n' +
    'Why it matters: Each operation reads a different combination of the other fields and produces a different output shape.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Now for the current timestamp, Format to render a date in a chosen style, Add/Subtract to shift a date by a duration, Diff to measure the gap between two dates, Convert Timezone to render a date in another timezone, Get Timezone Info to read offset/name metadata for a timezone.\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: The chosen operation determines which output keys appear — see each operation\'s own output example.\n' +
    'Accepted format: One of seven literal values: now, format, add, subtract, diff, convertTimezone, getTimezoneInfo (convert_timezone and get_timezone_info are also accepted as snake_case aliases).\n' +
    'Real workplace example: A subscription workflow uses Add with 30/days to compute a renewal date, then Diff later to check how many days remain before that date.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to now); an unrecognized value returns "DateTime: unsupported operation \\"<value>\\". Supported: now, format, add, subtract, diff, convertTimezone, getTimezoneInfo".\n' +
    'Common mistake: Expecting Format\'s Timezone field to also convert the underlying moment in time the way Convert Timezone does — Format only changes how an already-fixed instant is displayed, it does not shift which instant is being described.',
  options: ['now', 'format', 'add', 'subtract', 'diff', 'convertTimezone', 'getTimezoneInfo'],
};

const dateField: FieldDoc = {
  name: 'Date',
  internalKey: 'date',
  type: 'string',
  required: false,
  description: 'The base date/time this operation works from. Leave blank to use the current moment. Not used by Now, which always uses the current time.',
  helpText:
    'What this field is: The starting date/time value this operation reads and works from.\n' +
    'Why it matters: Every operation except Now needs a specific moment in time to format, shift, or compare — this is that moment.\n' +
    'When to fill it: Optional for every operation that uses it — leave it blank to use the current date/time at the moment this node runs. Not used at all by Now.\n' +
    'What to enter: An ISO 8601 date string, a Unix timestamp, or an expression that resolves to one.\n' +
    'Where the value comes from: Typically mapped from a previous step, such as {{$json.createdAt}} or {{$json.startDate}}, or left blank to use "right now."\n' +
    'How to use it later: Not echoed back directly under this key — the calculated result appears under operation-specific keys like datetime or diff.\n' +
    'Accepted format: An ISO 8601 string (2026-07-12T09:00:00Z), a Unix millisecond timestamp, or any string JavaScript\'s Date constructor can parse.\n' +
    'Real workplace example: {{$json.signupDate}} from a database record is used as the base date for an Add operation that calculates a 30-day trial expiration.\n' +
    'If it is empty or wrong: Left blank, this node uses the current date/time. A value that cannot be parsed as a date fails immediately with "DateTime: invalid date — provide a valid ISO date string in the date field", before any calculation happens.\n' +
    'Common mistake: Passing a locale-formatted date like "12/07/2026" — this is ambiguous (day or month first?) and may parse incorrectly or fail; use an unambiguous ISO 8601 string instead.',
  placeholder: '2026-07-12T09:00:00Z',
};

const timezoneField: FieldDoc = {
  name: 'Timezone',
  internalKey: 'timezone',
  type: 'string',
  required: false,
  description: 'An IANA timezone name. Required for Convert Timezone; optional elsewhere.',
  helpText:
    'What this field is: An IANA timezone database identifier (like America/New_York) used to render or convert a date/time.\n' +
    'Why it matters: The same instant in time looks different depending on which timezone it is displayed in — this field controls that.\n' +
    'When to fill it: Required for Convert Timezone. Optional for Now and Format (defaults to UTC when blank). Not used by Add, Subtract, or Diff, which calculate purely on the underlying instant regardless of timezone. Optional for Get Timezone Info (defaults to the server\'s own local timezone when blank).\n' +
    'What to enter: A valid IANA timezone identifier, not an abbreviation or a UTC offset.\n' +
    'Where the value comes from: Look up your target region\'s IANA name, such as Asia/Kolkata for India or Europe/London for the UK.\n' +
    'How to use it later: For Convert Timezone and Get Timezone Info, the same value is echoed back at {{$json.timezone}}.\n' +
    'Accepted format: An IANA timezone name such as UTC, America/New_York, Asia/Kolkata, or Europe/Paris — not abbreviations like "EST" or "IST", and not raw offsets like "+05:30".\n' +
    'Real workplace example: Setting this to Asia/Kolkata on Convert Timezone turns a UTC meeting time into the equivalent local time for an India-based customer.\n' +
    'If it is empty or wrong: Left blank where optional, this node defaults to UTC (for Now/Format) or the server\'s own local timezone (for Get Timezone Info). Left blank on Convert Timezone, it fails immediately with "DateTime convertTimezone: timezone is required". An unrecognized timezone name throws a JavaScript RangeError from the underlying date formatter.\n' +
    'Common mistake: Entering a timezone abbreviation like "EST" or "PST" instead of a full IANA name — this node only accepts real IANA identifiers such as America/New_York.',
  placeholder: 'UTC',
};

const formatField: FieldDoc = {
  name: 'Format',
  internalKey: 'format',
  type: 'select',
  required: false,
  description: 'The output style for Format: ISO, TIMESTAMP, LOCALE, or CUSTOM.',
  helpText:
    'What this field is: The style Format renders the date/time in.\n' +
    'Why it matters: It is the single field that decides whether the result looks like a machine-readable ISO string, a raw number, a human-readable locale string, or a custom pattern.\n' +
    'When to fill it: Only used by Format; every other operation ignores it. Leave at the default ISO for the most broadly compatible output.\n' +
    'What to enter: ISO for a standard timestamp string, TIMESTAMP for Unix milliseconds as text, LOCALE for a human-readable string in a chosen language/region, CUSTOM for your own token pattern.\n' +
    'Where the value comes from: Chosen directly from the dropdown based on what the next step expects.\n' +
    'How to use it later: Read the result from {{$json.datetime}} regardless of which style was chosen — it is always a string, even for TIMESTAMP.\n' +
    'Accepted format: One of four literal values: ISO, TIMESTAMP, LOCALE, CUSTOM (matched case-insensitively).\n' +
    'Real workplace example: An internal API integration uses ISO, a billing export uses TIMESTAMP, a customer-facing email uses LOCALE with locale en-US, and a legacy system integration uses CUSTOM with YYYY-MM-DD.\n' +
    'If it is empty or wrong: Left blank, this node defaults to ISO. Any value that is not one of the four recognized styles (case-insensitively) also falls back to ISO rather than producing an error.\n' +
    'Common mistake: Choosing LOCALE without also setting Locale — it silently defaults to en-US rather than failing, which may not match the audience you intended.',
  placeholder: 'ISO',
  defaultValue: 'ISO',
  options: ['ISO', 'TIMESTAMP', 'LOCALE', 'CUSTOM'],
};

const localeField: FieldDoc = {
  name: 'Locale',
  internalKey: 'locale',
  type: 'string',
  required: false,
  description: 'The BCP 47 language/region code used when Format is LOCALE.',
  helpText:
    'What this field is: A language and region code controlling word order, month names, and 12/24-hour formatting for LOCALE-style output.\n' +
    'Why it matters: A date formatted for en-US reads differently from the same instant formatted for en-GB or fr-FR — this field is what selects that convention.\n' +
    'When to fill it: Only relevant when Format is LOCALE; ignored otherwise.\n' +
    'What to enter: A BCP 47 language tag, such as en-US, en-GB, fr-FR, de-DE, or ja-JP.\n' +
    'Where the value comes from: Match it to your audience\'s language/region — this is not something copied from elsewhere in the workflow, it is a fixed convention you choose.\n' +
    'How to use it later: Not echoed back separately — it only affects the text inside {{$json.datetime}}.\n' +
    'Accepted format: A valid BCP 47 tag like en-US or fr-FR.\n' +
    'Real workplace example: Setting this to fr-FR renders "12 juillet 2026" instead of English month names for a French-speaking customer segment.\n' +
    'If it is empty or wrong: Left blank, this node defaults to en-US. An invalid or unrecognized locale tag causes the underlying formatter to throw a JavaScript RangeError.\n' +
    'Common mistake: Using an underscore instead of a hyphen (en_US instead of en-US) — BCP 47 tags require a hyphen.',
  placeholder: 'en-US',
};

const customFormatField: FieldDoc = {
  name: 'Custom Format',
  internalKey: 'customFormat',
  type: 'string',
  required: false,
  description: 'A token pattern used when Format is CUSTOM — supports YYYY, MM, DD, HH, mm, ss, each replaced exactly once.',
  helpText:
    'What this field is: A simple pattern string where specific tokens get swapped for parts of the date.\n' +
    'Why it matters: It is the only way to produce an exact custom layout (like DD/MM/YYYY) that ISO, TIMESTAMP, and LOCALE cannot produce.\n' +
    'When to fill it: Only relevant when Format is CUSTOM; ignored otherwise.\n' +
    'What to enter: A pattern combining the six recognized tokens with any literal separators you want, such as YYYY-MM-DD HH:mm:ss or DD/MM/YYYY.\n' +
    'Where the value comes from: Written by hand to match whatever exact layout a downstream system or spreadsheet expects.\n' +
    'How to use it later: The rendered result is available at {{$json.datetime}}.\n' +
    'Accepted format: A string using the case-sensitive tokens YYYY (4-digit year), MM (2-digit month), DD (2-digit day), HH (2-digit 24-hour hour), mm (2-digit minute), ss (2-digit second) — this is simple find-and-replace, not full strftime support.\n' +
    'Real workplace example: DD/MM/YYYY produces "12/07/2026" for a UK-style spreadsheet import that expects day before month.\n' +
    'If it is empty or wrong: Left blank, the result is an empty string rather than an error, since there is no pattern to fill in.\n' +
    'Common mistake: Repeating the same token twice in one pattern (like YYYY (YYYY)) expecting both instances to be replaced — each token is only replaced once (the first occurrence), so a repeated token leaves the literal text "YYYY" in the second spot.',
  placeholder: 'YYYY-MM-DD HH:mm:ss',
};

const valueField: FieldDoc = {
  name: 'Value',
  internalKey: 'value',
  type: 'number',
  required: false,
  description: 'The numeric amount of time to add or subtract, used with Unit.',
  helpText:
    'What this field is: The size of the duration to add (Add) or subtract (Subtract) from Date.\n' +
    'Why it matters: Combined with Unit, this is the entire calculation — without it, nothing changes.\n' +
    'When to fill it: Relevant only for Add and Subtract; ignored by every other operation.\n' +
    'What to enter: A positive number, integer or decimal.\n' +
    'Where the value comes from: Type a fixed number, or map it from a previous step such as {{$json.durationDays}}.\n' +
    'How to use it later: Not echoed back directly — only the resulting {{$json.datetime}} is returned.\n' +
    'Accepted format: Any numeric value, including decimals such as 1.5.\n' +
    'Real workplace example: Value 30 with Unit days on Add computes a 30-day trial expiration date from a signup timestamp.\n' +
    'If it is empty or wrong: Left blank, this node treats it as 0, so Add/Subtract return the original date unchanged.\n' +
    'Common mistake: Entering a negative number to "subtract" while using the Add operation — it works arithmetically, but using the Subtract operation instead makes the workflow\'s intent much clearer to anyone reading it later.',
  placeholder: '7',
};

const unitAddField: FieldDoc = {
  name: 'Unit',
  internalKey: 'unit',
  type: 'select',
  required: false,
  description: 'The time unit for Value on Add/Subtract: seconds, minutes, hours, days, weeks, months, or years.',
  helpText:
    'What this field is: The unit that Value is measured in for Add and Subtract.\n' +
    'Why it matters: The same Value of 7 means very different things as 7 minutes versus 7 months — this field disambiguates it.\n' +
    'When to fill it: Relevant only for Add and Subtract.\n' +
    'What to enter: One of seconds, minutes, hours, days, weeks, months, or years — partial text like "day" also matches "days" since this node checks with a starts-with match.\n' +
    'Where the value comes from: Chosen directly based on what the calculation calls for.\n' +
    'How to use it later: Not echoed back — only the resulting {{$json.datetime}} is returned.\n' +
    'Accepted format: One of the seven listed unit words (singular or plural both work, matched by prefix).\n' +
    'Real workplace example: Value 7 with Unit weeks on Subtract finds the date exactly seven weeks before a given reference date.\n' +
    'If it is empty or wrong: Left blank, or set to anything that does not start with sec/hour/day/week/month/year, this node silently treats it as minutes rather than raising an error — a typo here produces a wrong-but-plausible result instead of a clear failure.\n' +
    'Common mistake: Assuming Months and Years use real calendar arithmetic — they use fixed approximations (30 days per month, 365 days per year) rather than accounting for actual month lengths or leap years; for precise calendar math, use a JavaScript node instead.',
  placeholder: 'days',
  options: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
};

const unitDiffField: FieldDoc = {
  name: 'Unit',
  internalKey: 'unit',
  type: 'select',
  required: false,
  description: 'The time unit for the Diff result: seconds, minutes, hours, days, or weeks. Months and years are not supported for Diff.',
  helpText:
    'What this field is: The unit the calculated difference between Date and End Date is expressed in.\n' +
    'Why it matters: It determines whether {{$json.diff}} reads as a count of minutes, hours, days, or weeks.\n' +
    'When to fill it: Relevant only for Diff.\n' +
    'What to enter: One of seconds, minutes, hours, days, or weeks — partial text like "day" also matches "days" since this node checks with a starts-with match.\n' +
    'Where the value comes from: Chosen based on what scale is meaningful for the comparison — minutes for a fulfillment-time SLA, days for a subscription age.\n' +
    'How to use it later: The exact unit used is echoed back at {{$json.unit}}, alongside the rounded {{$json.diff}} and the exact {{$json.diffMs}}.\n' +
    'Accepted format: One of the five listed unit words — unlike Add/Subtract\'s Unit field, months and years are not recognized here at all.\n' +
    'Real workplace example: Unit days on Diff between a signup date and today measures how long a customer has held their account.\n' +
    'If it is empty or wrong: Left blank, or set to anything that does not start with sec/hour/day/week, this node silently falls back to minutes rather than raising an error.\n' +
    'Common mistake: Setting this to months or years expecting it to work the way it does on Add/Subtract — Diff has no month/year handling at all and silently treats any such value as minutes.',
  placeholder: 'minutes',
  options: ['seconds', 'minutes', 'hours', 'days', 'weeks'],
};

const endDateField: FieldDoc = {
  name: 'End Date',
  internalKey: 'endDate',
  type: 'string',
  required: true,
  description: 'The later date to compare Date against — required for Diff.',
  helpText:
    'What this field is: The second date/time in a Diff comparison, subtracted-from side of the calculation (End Date minus Date).\n' +
    'Why it matters: Diff cannot measure a gap between two moments without both ends of it — this is the second one.\n' +
    'When to fill it: Always, whenever Operation is Diff — there is no way to compute a difference without it.\n' +
    'What to enter: An ISO 8601 date string, a Unix timestamp, or an expression that resolves to one.\n' +
    'Where the value comes from: Typically mapped from a later event in the workflow, such as {{$json.completedAt}} compared against an earlier {{$json.createdAt}} in Date.\n' +
    'How to use it later: Not echoed back directly — the calculated gap appears at {{$json.diff}} and {{$json.diffMs}}.\n' +
    'Accepted format: An ISO 8601 string, a Unix millisecond timestamp, or any string JavaScript\'s Date constructor can parse.\n' +
    'Real workplace example: Date set to {{$json.createdAt}} and End Date set to {{$json.completedAt}} together measure how long a support ticket took to resolve.\n' +
    'If it is empty or wrong: An empty value fails immediately with "DateTime diff: endDate (or date2) is required". A value that cannot be parsed fails with "DateTime diff: endDate is not a valid date".\n' +
    'Common mistake: Putting the earlier date in End Date and the later date in Date — the result is still calculated correctly, but comes back as a negative number, which is easy to misread as an error.',
  placeholder: '2026-07-13T09:00:00Z',
};

function buildOperation(config: {
  name: string;
  value: string;
  description: string;
  fields: FieldDoc[];
  outputExample: Record<string, unknown>;
  outputDescription: string;
  scenario: string;
  inputValues: Record<string, string>;
  expectedOutput: string;
}): OperationDoc {
  return {
    name: config.name,
    value: config.value,
    description: config.description,
    fields: config.fields,
    outputExample: config.outputExample,
    outputDescription: config.outputDescription,
    usageExample: { scenario: config.scenario, inputValues: config.inputValues, expectedOutput: config.expectedOutput },
    externalDocsUrl: 'https://docs.ctrlchecks.com',
  };
}

const nowOperation = buildOperation({
  name: 'Now',
  value: 'now',
  description: 'Returns the current date/time, optionally rendered in a specific timezone. The only operation that never reads the Date field, since it always uses the exact moment this node runs.',
  fields: [operationField, timezoneField],
  outputExample: { datetime: '2026-07-12T09:00:00.000Z', timestamp: 1783855800000 },
  outputDescription: 'datetime: the current date/time as an ISO string when Timezone is blank, or a local-format string (no Z suffix) when a timezone is given. timestamp: the current Unix time in milliseconds since epoch, always present regardless of Timezone.',
  scenario: 'Stamp a record with the exact workflow execution timestamp for audit purposes',
  inputValues: { operation: 'now', timezone: 'UTC' },
  expectedOutput: 'Returns the current UTC time; {{$json.datetime}} gives the ISO string and {{$json.timestamp}} gives the numeric millisecond value for sorting or storage.',
});

const formatOperation = buildOperation({
  name: 'Format',
  value: 'format',
  description: 'Renders Date (or the current time, if blank) as an ISO string, a Unix timestamp, a locale-specific string, or a custom token pattern.',
  fields: [operationField, dateField, formatField, timezoneField, localeField, customFormatField],
  outputExample: { datetime: '2026-07-12T09:00:00.000Z' },
  outputDescription: 'datetime: the formatted result as a string in every case, including TIMESTAMP style (where it is the numeric value written out as text, not a JSON number).',
  scenario: 'Format a database timestamp into a human-readable date for an email notification',
  inputValues: { operation: 'format', date: '{{$json.createdAt}}', format: 'LOCALE', locale: 'en-US', timezone: 'America/New_York' },
  expectedOutput: 'Returns a readable string like "7/12/2026, 9:00:00 AM" in {{$json.datetime}} for direct use in the email body.',
});

const addOperation = buildOperation({
  name: 'Add',
  value: 'add',
  description: 'Adds Value (in Unit) to Date and returns the resulting date/time as an ISO string, useful for due dates, renewals, and expiration calculations.',
  fields: [operationField, dateField, valueField, unitAddField],
  outputExample: { datetime: '2026-07-19T09:00:00.000Z' },
  outputDescription: 'datetime: the resulting date/time after adding the duration, always returned as an ISO string regardless of the original Date\'s format.',
  scenario: 'Calculate a subscription renewal date 30 days after signup',
  inputValues: { operation: 'add', date: '{{$json.signupDate}}', value: '30', unit: 'days' },
  expectedOutput: 'Returns the date 30 days later in {{$json.datetime}}, ready to store as the renewal date or use in a reminder email.',
});

const subtractOperation = buildOperation({
  name: 'Subtract',
  value: 'subtract',
  description: 'Subtracts Value (in Unit) from Date and returns the resulting date/time as an ISO string, useful for lookback windows and past-date scheduling.',
  fields: [operationField, dateField, valueField, unitAddField],
  outputExample: { datetime: '2026-07-05T09:00:00.000Z' },
  outputDescription: 'datetime: the resulting date/time after subtracting the duration, always returned as an ISO string regardless of the original Date\'s format.',
  scenario: 'Find the start date of a 7-day lookback window from today, for a database query filter',
  inputValues: { operation: 'subtract', date: '{{$now}}', value: '7', unit: 'days' },
  expectedOutput: 'Returns the date 7 days ago in {{$json.datetime}}, used as the start boundary in a query filtering last week\'s records.',
});

const diffOperation = buildOperation({
  name: 'Diff',
  value: 'diff',
  description: 'Calculates End Date minus Date, expressed in the chosen Unit. Useful for elapsed-time measurements, SLA reporting, and account-age calculations.',
  fields: [operationField, dateField, endDateField, unitDiffField],
  outputExample: { diff: 1440, diffMs: 86400000, unit: 'minutes' },
  outputDescription: 'diff: the difference (End Date minus Date) in the chosen Unit, rounded to 3 decimal places. diffMs: the exact difference in milliseconds, unrounded. unit: the unit actually used for diff. A negative diff means Date was later than End Date.',
  scenario: 'Measure how many minutes a support ticket took from creation to resolution',
  inputValues: { operation: 'diff', date: '{{$json.createdAt}}', endDate: '{{$json.completedAt}}', unit: 'minutes' },
  expectedOutput: 'Returns the elapsed minutes in {{$json.diff}} (rounded) or {{$json.diffMs}} (exact), usable for SLA reporting.',
});

const convertTimezoneOperation = buildOperation({
  name: 'Convert Timezone',
  value: 'convertTimezone',
  description: 'Renders Date in a different target Timezone. Essential for showing a time in a user\'s local timezone rather than UTC.',
  fields: [operationField, dateField, timezoneField],
  outputExample: { datetime: '2026-07-12T14:30:00', timezone: 'Asia/Kolkata' },
  outputDescription: 'datetime: the date/time rendered in the target timezone, in a local-format string without a trailing Z (since it is no longer UTC). timezone: the target timezone that was used, echoed back for confirmation.',
  scenario: 'Convert a UTC event time into India Standard Time for a specific customer\'s confirmation email',
  inputValues: { operation: 'convertTimezone', date: '{{$json.eventTimeUTC}}', timezone: 'Asia/Kolkata' },
  expectedOutput: 'Returns the local event time in {{$json.datetime}} for display in a calendar invitation or notification.',
});

const getTimezoneInfoOperation = buildOperation({
  name: 'Get Timezone Info',
  value: 'getTimezoneInfo',
  description: 'Returns metadata about a timezone at a specific date — its GMT offset and full display name — without converting or reformatting the date itself.',
  fields: [operationField, dateField, timezoneField],
  outputExample: { timezone: 'Asia/Kolkata', offset: '+05:30', longName: 'India Standard Time', isoDate: '2026-07-12T09:00:00.000Z' },
  outputDescription: 'timezone: the IANA identifier used (echoed back, or the server\'s own local timezone if Timezone was left blank). offset: the GMT offset at that date (accounts for daylight saving where applicable). longName: the human-readable timezone name. isoDate: the input Date as a plain ISO string, unconverted.',
  scenario: 'Add timezone details to a meeting confirmation so the recipient sees both the time and its offset explicitly',
  inputValues: { operation: 'getTimezoneInfo', date: '{{$json.meetingTime}}', timezone: 'Asia/Kolkata' },
  expectedOutput: 'Returns timezone metadata; {{$json.offset}} and {{$json.longName}} combine into a display like "India Standard Time (GMT+05:30)".',
});

export const dateTimeDoc: NodeDoc = {
  slug: 'date_time',
  displayName: 'Date/Time',
  category: 'Data',
  logoUrl: '/icons/nodes/date_time.svg',
  description: 'Create, format, offset, compare, and inspect date/time values with IANA timezone support. Seven operations covering the current time, formatting, arithmetic, diffing, and timezone conversion.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it operates on date values already present in the workflow or the current system time.',
    'No connection setup is required. Place this node anywhere a date needs to be created, formatted, calculated, or compared.',
    'Connect the Date/Time output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.datetime}} or {{$json.diff}}. Downstream service node account connection setup is still required for nodes after Date/Time; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Date/Time supports 7 operations. All operations except Now read Date (defaulting to the current moment when blank); an unparseable Date fails immediately with a clear error before any calculation happens.',
      operations: [nowOperation, formatOperation, addOperation, subtractOperation, diffOperation, convertTimezoneOperation, getTimezoneInfoOperation],
    },
  ],
  commonErrors: [
    {
      error: 'DateTime: invalid date — provide a valid ISO date string in the date field',
      cause: 'The Date field (or End Date, for Diff) held a value that could not be parsed as a date at all.',
      fix: 'Provide a valid ISO 8601 string (e.g. 2026-07-12T09:00:00Z), a Unix millisecond timestamp, or a template expression that resolves to one of those.',
    },
    {
      error: 'DateTime convertTimezone: timezone is required',
      cause: 'Operation was set to Convert Timezone but the Timezone field was left empty.',
      fix: 'Set Timezone to a valid IANA timezone identifier such as UTC, America/New_York, or Asia/Kolkata.',
    },
    {
      error: 'DateTime diff: endDate (or date2) is required',
      cause: 'Operation was set to Diff but the End Date field was left empty.',
      fix: 'Set End Date to a valid date string or expression — this field is always required for Diff.',
    },
    {
      error: 'DateTime diff: endDate is not a valid date',
      cause: 'End Date was filled in for Diff, but its value could not be parsed as a date.',
      fix: 'Provide a valid ISO 8601 string or Unix timestamp in End Date.',
    },
    {
      error: 'DateTime: unsupported operation "<value>". Supported: now, format, add, subtract, diff, convertTimezone, getTimezoneInfo',
      cause: 'The Operation field held a value outside the seven supported ones — only reachable via hand-edited workflow JSON, since the visual dropdown only offers valid values.',
      fix: 'Select one of Now, Format, Add, Subtract, Diff, Convert Timezone, or Get Timezone Info from the Operation dropdown.',
    },
    {
      error: 'Unrecognized Unit value silently falls back to minutes (no error is raised)',
      cause: 'Unit on Add/Subtract/Diff was left blank or set to a value that does not start with a recognized unit word (sec/hour/day/week/month/year for Add/Subtract; sec/hour/day/week for Diff).',
      fix: 'Use one of the exact supported unit words for the operation — seconds, minutes, hours, days, weeks, months, or years for Add/Subtract; seconds, minutes, hours, days, or weeks for Diff — and double-check the result matches expectations rather than assuming a typo would have been caught.',
    },
  ],
  relatedNodes: ['javascript', 'edit_fields', 'http_request', 'google_calendar', 'filter', 'loop'],
};
