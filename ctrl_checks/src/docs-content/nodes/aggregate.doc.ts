import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Which calculation to run across the incoming items array: sum, average, count, minimum, maximum, or join into text.',
  helpText:
    'What this field is: The dropdown that chooses which single calculation this node performs over the incoming items array.\n' +
    'Why it matters: This is the only thing that decides what {{$json.aggregate}} contains — a total, a mean, a count, an extreme value, or a joined string.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Sum to add numeric values, Average to compute the mean, Count to count items, Min to find the smallest value, Max to find the largest value, Join (text) to combine values into one string with a delimiter.\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: Read the result from {{$json.aggregate}} in every case; Join also duplicates it at {{$json.text}}.\n' +
    'Accepted format: One of the six literal values: sum, avg, count, min, max, join.\n' +
    'Real workplace example: A daily sales report uses Sum on the amount field to compute total revenue, then Count with no field to log how many orders were processed.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to sum); an unrecognized value that reaches Sum/Average/Min/Max\'s internal switch returns "Aggregate: Unknown operation \\"<value>\\". Supported: sum, avg, count, min, max, join".\n' +
    'Common mistake: Choosing Sum, Average, Min, or Max on a field that is not actually numeric (like a name or status) — those four operations silently return 0 with a _warning rather than an error, which is easy to miss.',
  options: ['sum', 'avg', 'count', 'min', 'max', 'join'],
};

const fieldField: FieldDoc = {
  name: 'Field (optional)',
  internalKey: 'field',
  type: 'string',
  required: false,
  description: 'The field name or nested path within each item to aggregate — leave blank to aggregate the items themselves.',
  helpText:
    'What this field is: The name (or dotted path) of the property inside each incoming item that this node should read for the calculation.\n' +
    'Why it matters: Items are usually objects with several fields (like {amount, status, name}); this tells the node exactly which one to pull out of each item before calculating.\n' +
    'When to fill it: Fill it whenever items are objects and you want to aggregate one specific property. Leave it blank when items is already a plain array of numbers or strings you want to aggregate directly.\n' +
    'What to enter: A simple field name like amount, or a nested path like order.total for a value inside a nested object.\n' +
    'Where the value comes from: Match it to the exact property name in the upstream items, visible in a previous node\'s output or test run.\n' +
    'How to use it later: The same field name is echoed back at {{$json.field}} (except for Count with no field, where it is omitted) so downstream steps can confirm what was aggregated.\n' +
    'Accepted format: Plain dot-notation text, with no {{ }} braces needed — a full expression like {{$json.amount}} is also accepted and automatically simplified down to amount.\n' +
    'Real workplace example: Given items like [{"amount":10},{"amount":20}], setting Field to amount with Sum returns 30; leaving Field blank on the same array would try to sum the objects themselves and find no numeric values.\n' +
    'If it is empty or wrong: A field name that does not exist on any item results in every value being treated as missing — Sum/Average/Min/Max then return 0 with a _warning, Count returns 0, and Join returns an empty string.\n' +
    'Common mistake: Using a field path that does not match the real nesting of the data (like order.amount when the actual structure is order.total) — this silently produces an empty result rather than a clear "field not found" error.',
  placeholder: 'price',
};

const delimiterField: FieldDoc = {
  name: 'Delimiter (for Join)',
  internalKey: 'delimiter',
  type: 'string',
  required: false,
  description: 'The separator placed between each value when Operation is Join (text) — has no effect on any other operation.',
  helpText:
    'What this field is: The character or string inserted between each value when combining them into one string with Join.\n' +
    'Why it matters: Without a clear separator, joined values would run together and be impossible to split apart again downstream.\n' +
    'When to fill it: Only relevant when Operation is Join (text); it is silently ignored by Sum, Average, Count, Min, and Max.\n' +
    'What to enter: A literal delimiter string, using \\n for a newline or \\t for a tab if you want those specific characters.\n' +
    'Where the value comes from: Chosen based on what the next step expects — a comma for CSV-style text, a newline for a line-per-item list.\n' +
    'How to use it later: The exact delimiter used is echoed back at {{$json.delimiter}} (already unescaped to a real newline/tab if \\n or \\t was entered).\n' +
    'Accepted format: Any literal string; the special sequences \\n, \\t, and \\r\\n are automatically converted to a real newline, tab, or Windows line ending respectively.\n' +
    'Real workplace example: Setting this to ", " while joining an email field produces "alice@example.com, bob@example.com, charlie@example.com", ready to paste into an Email node\'s BCC field.\n' +
    'If it is empty or wrong: Left blank, the node defaults to \\n (a real newline) — values still join correctly, just separated by line breaks instead of a custom character.\n' +
    'Common mistake: Typing the two characters \\ and n expecting a literal backslash-n in the output — this field specifically recognizes \\n, \\t, and \\r\\n as escape sequences and converts them to real whitespace characters, not literal text.',
  placeholder: '\\n',
  defaultValue: '\\n',
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

const sumOperation = buildOperation({
  name: 'Sum',
  value: 'sum',
  description: 'Adds every numeric value from the items array (or the chosen Field within each item) and returns the total. Non-numeric values are silently dropped before adding.',
  fields: [operationField, fieldField],
  outputExample: { aggregate: 4500, operation: 'sum', field: 'amount' },
  outputDescription: 'aggregate: the computed sum of every numeric value found. operation: echoes back "sum". field: the field path used, present only when Field was filled in. If no numeric values are found at all, aggregate returns 0 and a _warning field is added instead of an error.',
  scenario: 'Calculate total order revenue from an array of order items for a daily sales summary',
  inputValues: { operation: 'sum', field: 'amount' },
  expectedOutput: 'Returns the total of every amount field in {{$json.aggregate}}, ready to store in a database or send in a notification email.',
});

const avgOperation = buildOperation({
  name: 'Average',
  value: 'avg',
  description: 'Calculates the arithmetic mean of every numeric value from the items array (or the chosen Field within each item) and returns it.',
  fields: [operationField, fieldField],
  outputExample: { aggregate: 75.5, operation: 'avg', field: 'score' },
  outputDescription: 'aggregate: the computed average (mean) of every numeric value found. operation: echoes back "avg". field: the field path used, present only when Field was filled in. If no numeric values are found at all, aggregate returns 0 and a _warning field is added instead of an error.',
  scenario: 'Calculate the average customer satisfaction score from a batch of survey responses',
  inputValues: { operation: 'avg', field: 'score' },
  expectedOutput: 'Returns the mean of every score value in {{$json.aggregate}}, ready to display on a dashboard or compare against a threshold.',
});

const countOperation = buildOperation({
  name: 'Count',
  value: 'count',
  description: 'Counts how many items have a non-missing value, either counting every item directly or only items where the chosen Field is present.',
  fields: [operationField, fieldField],
  outputExample: { aggregate: 25, operation: 'count' },
  outputDescription: 'aggregate: the count of items (or items where Field had a value, if Field was filled in). operation: echoes back "count". field is omitted entirely when Field was left blank, unlike every other operation. If items is empty, aggregate returns 0.',
  scenario: 'Count how many orders arrived in a batch before starting a processing loop',
  inputValues: { operation: 'count' },
  expectedOutput: 'Returns the total item count in {{$json.aggregate}}, useful for logging batch size or branching on whether there is anything to process.',
});

const minOperation = buildOperation({
  name: 'Min',
  value: 'min',
  description: 'Finds the smallest numeric value from the items array (or the chosen Field within each item) and returns it.',
  fields: [operationField, fieldField],
  outputExample: { aggregate: 10, operation: 'min', field: 'price' },
  outputDescription: 'aggregate: the smallest numeric value found. operation: echoes back "min". field: the field path used, present only when Field was filled in. If no numeric values are found at all, aggregate returns 0 and a _warning field is added instead of an error.',
  scenario: 'Find the lowest price across a list of competing product offers',
  inputValues: { operation: 'min', field: 'price' },
  expectedOutput: 'Returns the smallest price in {{$json.aggregate}}, usable to highlight the cheapest option or trigger a price-match check.',
});

const maxOperation = buildOperation({
  name: 'Max',
  value: 'max',
  description: 'Finds the largest numeric value from the items array (or the chosen Field within each item) and returns it.',
  fields: [operationField, fieldField],
  outputExample: { aggregate: 500, operation: 'max', field: 'score' },
  outputDescription: 'aggregate: the largest numeric value found. operation: echoes back "max". field: the field path used, present only when Field was filled in. If no numeric values are found at all, aggregate returns 0 and a _warning field is added instead of an error.',
  scenario: 'Find the highest score from a batch of graded test results',
  inputValues: { operation: 'max', field: 'score' },
  expectedOutput: 'Returns the largest score in {{$json.aggregate}}, usable to identify a top performer or set a new benchmark.',
});

const joinOperation = buildOperation({
  name: 'Join (text)',
  value: 'join',
  description: 'Combines every value from the items array (or the chosen Field within each item) into a single text string, separated by Delimiter. Non-string values are converted to text automatically.',
  fields: [operationField, fieldField, delimiterField],
  outputExample: { aggregate: 'Alice\nBob\nCharlie', text: 'Alice\nBob\nCharlie', operation: 'join', delimiter: '\n', field: 'name' },
  outputDescription: 'aggregate: the joined text string. text: an exact duplicate of aggregate under a second key, unique to this operation. operation: echoes back "join". delimiter: the delimiter actually used (already converted from \\n/\\t if entered that way). field: the field path used, present only when Field was filled in. If items is empty, aggregate returns an empty string rather than an error.',
  scenario: 'Build a comma-separated list of customer email addresses to BCC on a newsletter send',
  inputValues: { operation: 'join', field: 'email', delimiter: ', ' },
  expectedOutput: 'Returns a string like "alice@example.com, bob@example.com, charlie@example.com" in {{$json.aggregate}} or {{$json.text}}, ready to paste into an Email node\'s BCC field.',
});

export const aggregateDoc: NodeDoc = {
  slug: 'aggregate',
  displayName: 'Aggregate',
  category: 'Data',
  logoUrl: '/icons/nodes/aggregate.svg',
  description: 'Compute a single value from an array of items — sum, average, count, minimum, maximum, or join into text. Silently passes data through unchanged if the input has no items array at all, rather than raising an error.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only operates on data already present in the workflow (an items array from a previous step).',
    'No connection setup is required. Simply place this node after any step that outputs an items array, such as HTTP Request, Google Sheets, or Loop.',
    'Connect the Aggregate output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.aggregate}}. Downstream service node account connection setup is still required for nodes after Aggregate; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Aggregate reads input.items (an array from a previous step) and computes one of six single values from it. If input.items is missing or is not an array, this node silently passes the input through completely unchanged — it does not raise an error or add a warning for that specific case.',
      operations: [sumOperation, avgOperation, countOperation, minOperation, maxOperation, joinOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Aggregate: Unknown operation "<value>". Supported: sum, avg, count, min, max, join',
      cause: 'The Operation field held a value other than the six supported ones — this can only happen via hand-edited workflow JSON, since the visual dropdown only offers the six valid values.',
      fix: 'Select one of Sum, Average, Count, Min, Max, or Join (text) from the Operation dropdown.',
    },
    {
      error: 'Aggregate: no numeric values found (_warning field, not an error)',
      cause: 'Sum, Average, Min, or Max ran against values that could not be converted to numbers — text, null, undefined, or objects — so there was nothing numeric to calculate.',
      fix: 'Set Field to a genuinely numeric field path, use Count or Join instead for non-numeric data, or add a Filter node before Aggregate to remove non-numeric items first.',
    },
    {
      error: 'No output changes at all when items is missing',
      cause: 'The upstream node did not provide an items array (or the value at that key is not an array). This node does not throw an error for this case — it returns the input completely unchanged, with no aggregate key at all.',
      fix: 'Confirm the previous node actually outputs a field literally named items containing an array — use Edit Fields to rename the array to items if it arrives under a different key, then re-run to confirm {{$json.aggregate}} now appears.',
    },
    {
      error: 'Field path resolves to nothing for every item',
      cause: 'The Field value does not match the real structure of the items — for example order.amount when the real nesting is order.total, or a field name from a different node\'s output shape entirely.',
      fix: 'Run the previous node alone first and inspect its real output shape, then set Field to match the exact nesting using dot notation, or leave Field blank to aggregate the items themselves.',
    },
  ],
  relatedNodes: ['edit_fields', 'filter', 'loop', 'sort', 'csv', 'google_sheets'],
};
