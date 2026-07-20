import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'The mathematical calculation to perform: a binary operation (two values), a unary operation (one value), or a list operation (an array of values).',
  helpText:
    'What this field is: The dropdown that chooses which calculation this node performs.\n' +
    'Why it matters: It decides which of Value 1 and Value 2 are actually read, and whether Value 1 is treated as a single number or a whole list of numbers.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Add/Subtract/Multiply/Divide/Modulo/Power for two-value binary math (using Value 1 and Value 2); Square Root/Absolute/Round/Floor/Ceiling for single-value math (using only Value 1); Minimum/Maximum/Average/Sum for calculations across a whole list (Value 1 treated as an array).\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: Every operation returns its numeric answer at {{$json.result}}, and the operation name is echoed back at {{$json.operation}}.\n' +
    'Accepted format: One of fifteen literal values: add, subtract, multiply, divide, modulo, power, sqrt, abs, round, floor, ceil, min, max, avg, sum.\n' +
    'Real workplace example: An invoicing workflow uses sum on a list of line-item amounts, then round with Precision 2 on the total to get a clean currency figure.\n' +
    'If it is empty or wrong: This field has a default of add, but a hand-edited or unrecognized value fails with "Unknown math operation: <value>" as an _error.\n' +
    'Common mistake: Choosing Divide without checking whether Value 2 could be zero — dividing by zero fails with a specific "Division by zero" error rather than returning Infinity or an unhelpful generic message.',
  options: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'min', 'max', 'avg', 'sum'],
};

const value1Field: FieldDoc = {
  name: 'Value 1',
  internalKey: 'value1',
  type: 'string',
  required: false,
  description: 'The primary input — a single number for binary/unary operations, or a comma-separated list (or array) for list operations (min/max/avg/sum).',
  helpText:
    'What this field is: The main number (or list of numbers) this calculation works on.\n' +
    'Why it matters: It is the primary input to every single operation this node supports — there is no operation that skips it.\n' +
    'When to fill it: Always relevant, though it silently defaults to 0 if left blank.\n' +
    'What to enter: A plain number for binary and unary operations; a comma-separated list of numbers (or an upstream array) for min/max/avg/sum.\n' +
    'Where the value comes from: Type a fixed number, or map it from a previous step such as {{$json.price}} or {{$json.amounts}} (an actual array).\n' +
    'How to use it later: Not echoed back directly — only the calculated {{$json.result}} is returned.\n' +
    'Accepted format: A number as text (10, 3.5), a comma-separated list ("1,2,3") for list operations, or an actual array value from an upstream expression.\n' +
    'Real workplace example: {{$json.amounts}} (an array of invoice line totals) with Operation set to sum computes the invoice grand total in one step.\n' +
    'If it is empty or wrong: Left blank, this node silently treats it as 0 (for single-value operations) rather than raising an error. A value containing non-numeric text is silently parsed as 0 rather than rejected — there is no "invalid number" error anywhere in this node.\n' +
    'Common mistake: Assuming a typo or non-numeric value here will be caught and reported — it will not; it is silently treated as 0, which can produce a plausible-looking but wrong result (for example, Add with a broken Value 1 quietly returns just Value 2).',
  placeholder: '{{$json.value1}}',
};

const value2Field: FieldDoc = {
  name: 'Value 2',
  internalKey: 'value2',
  type: 'string',
  required: false,
  description: 'The second number for binary operations only (add, subtract, multiply, divide, modulo, power) — ignored by every unary and list operation.',
  helpText:
    'What this field is: The second operand for two-value math.\n' +
    'Why it matters: Binary operations like Divide or Power need two numbers to produce a result — this is the second one.\n' +
    'When to fill it: Only relevant for Add, Subtract, Multiply, Divide, Modulo, and Power. Completely ignored by Square Root, Absolute, Round, Floor, Ceiling, Minimum, Maximum, Average, and Sum.\n' +
    'What to enter: A plain number, or an expression that resolves to one.\n' +
    'Where the value comes from: Type a fixed number, or map it from a previous step such as {{$json.discount}}.\n' +
    'How to use it later: Not echoed back directly — only {{$json.result}} is returned.\n' +
    'Accepted format: A number as text, such as 5 or 2.5.\n' +
    'Real workplace example: Value 1 set to {{$json.subtotal}}, Value 2 set to {{$json.taxRate}}, with Operation Multiply, calculates a tax amount to add to an invoice.\n' +
    'If it is empty or wrong: Left blank, this node silently treats it as 0 — Divide by an unset Value 2 fails with "Division by zero" the same as an explicit 0; Add/Subtract/Multiply/Modulo/Power with an unset Value 2 quietly proceed using 0 rather than erroring.\n' +
    'Common mistake: Filling this field in for a unary or list operation expecting it to matter — it is completely ignored by Square Root, Absolute, Round, Floor, Ceiling, Minimum, Maximum, Average, and Sum.',
  placeholder: '{{$json.value2}}',
};

const precisionField: FieldDoc = {
  name: 'Decimal Precision',
  internalKey: 'precision',
  type: 'number',
  required: false,
  description: 'The number of decimal places applied to the final result, from 0 to 20.',
  helpText:
    'What this field is: How many digits after the decimal point the final {{$json.result}} is rounded to.\n' +
    'Why it matters: Raw floating-point math can produce results with many extra digits (like 0.1 + 0.2 = 0.30000000000000004) — this field controls the clean, rounded output.\n' +
    'When to fill it: Optional — leave it at the default of 10 for general use.\n' +
    'What to enter: A whole number from 0 (for a plain integer result) to 20 (for high scientific precision).\n' +
    'Where the value comes from: Choose based on what the result is used for — 2 for currency, 0 for a plain count, higher for scientific work.\n' +
    'How to use it later: The rounded value is what appears at {{$json.result}} — there is no separate unrounded value returned.\n' +
    'Accepted format: An integer from 0 to 20.\n' +
    'Real workplace example: Precision 2 on a Sum of invoice line items produces a clean currency figure like 149.99 instead of 149.9899999999999.\n' +
    'If it is empty or wrong: Left blank or set to something that cannot be parsed as a number, this node silently falls back to 10 rather than raising an error — there is no "invalid precision" error anywhere in this node.\n' +
    'Common mistake: Assuming this field also truncates for display purposes elsewhere — it only affects the numeric value in {{$json.result}} itself, which is rounded (not truncated), so 2.005 at precision 2 may round to 2.01 or 2.00 depending on floating-point representation.',
  placeholder: '10',
  defaultValue: '10',
};

const calculateOperation: OperationDoc = {
  name: 'Calculate',
  value: 'default',
  description: 'Runs the selected mathematical Operation against Value 1 (and Value 2, for binary operations), rounds the result to Precision decimal places, and returns it. This single action covers all fifteen supported operations — Operation is what actually differentiates the calculation, not a separate dropdown per math type.',
  fields: [operationField, value1Field, value2Field, precisionField],
  outputExample: { result: 15, operation: 'sum' },
  outputDescription: 'result: the calculated numeric answer, already rounded to Precision decimal places. operation: the operation that was actually performed, echoed back for confirmation. Every field already present on the input is preserved unchanged alongside these two. Minimum/Maximum on an empty list silently return Infinity/-Infinity rather than an error; Average on an empty list silently returns NaN.',
  usageExample: {
    scenario: 'Calculate the total of several invoice line-item amounts before generating a receipt',
    inputValues: { operation: 'sum', value1: '{{$json.amounts}}', precision: '2' },
    expectedOutput: 'Returns the total in {{$json.result}} rounded to 2 decimal places, ready for display or storage as a currency value.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const mathDoc: NodeDoc = {
  slug: 'math',
  displayName: 'Math',
  category: 'Data',
  logoUrl: '/icons/nodes/math.svg',
  description: 'Perform binary (two-value), unary (single-value), or list (array) mathematical calculations with configurable decimal precision. Non-numeric input is silently treated as 0 rather than rejected — there is no numeric validation anywhere in this node.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only performs arithmetic on numbers already present in the workflow or typed directly into its fields.',
    'No connection setup is required. Place this node anywhere a calculation is needed, whether on fixed values or values mapped from previous steps.',
    'Connect the Math output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.result}}. Downstream service node account connection setup is still required for nodes after Math; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'Math has a single action (internally the operation value default) that branches internally on the Operation field to run one of fifteen calculations: binary (add, subtract, multiply, divide, modulo, power), unary (sqrt, abs, round, floor, ceil), and list (min, max, avg, sum). Non-numeric values are silently coerced to 0 rather than rejected, and only Divide-by-zero and an unrecognized Operation value ever produce a real error.',
      operations: [calculateOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Division by zero',
      cause: 'Operation was set to Divide (or Modulo with a zero divisor behaves differently — see below) and Value 2 resolved to 0.',
      fix: 'Add an If/Else or Filter step before Math to skip or handle cases where the divisor could be zero, rather than relying on this node to catch it after the fact.',
    },
    {
      error: 'Unknown math operation: <value>',
      cause: 'The Operation field held a value outside the fifteen supported ones — only reachable via hand-edited workflow JSON, since the visual dropdown only offers valid values.',
      fix: 'Select one of the fifteen supported operations from the Operation dropdown.',
    },
    {
      error: 'Non-numeric Value 1 or Value 2 is silently treated as 0 (no error is raised)',
      cause: 'An expression like {{$json.amount}} resolved to text, undefined, or another non-numeric value instead of a real number.',
      fix: 'Confirm the upstream field genuinely contains a number, and sanity-check {{$json.result}} afterward rather than trusting that a bad input would have been caught automatically.',
    },
    {
      error: 'Minimum/Maximum on an empty list silently returns Infinity/-Infinity; Average on an empty list silently returns NaN (no error is raised for either)',
      cause: 'Value 1 resolved to an empty array (or an empty comma-separated string) while Operation was set to min, max, or avg.',
      fix: 'Confirm the upstream array actually has at least one numeric entry before this node runs, and check {{$json.result}} for Infinity/-Infinity/NaN rather than assuming an empty list would have produced an error.',
    },
    {
      error: 'An invalid Decimal Precision value is silently replaced with the default of 10 (no error is raised)',
      cause: 'Precision was left blank or set to a value that cannot be parsed as a number.',
      fix: 'Set Precision to a plain integer between 0 and 20 if a specific rounding level is required; otherwise the default of 10 is used automatically.',
    },
  ],
  relatedNodes: ['set', 'javascript', 'aggregate', 'edit_fields', 'filter'],
};
