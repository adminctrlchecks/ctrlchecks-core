import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const fieldField: FieldDoc = {
  name: 'Field (optional)',
  internalKey: 'field',
  type: 'string',
  required: false,
  description: 'The name of the field to sort object items by. Leave blank to sort a list of plain values (numbers or strings) directly.',
  helpText:
    'What this field is: The property name this node reads from each item in {{$json.items}} to decide sort order.\n' +
    'Why it matters: Object arrays (such as a list of customer or order records) need to know which property to compare — without a field name, every item would be compared as a whole object, which rarely produces a sensible order.\n' +
    'When to fill it: Fill it in whenever {{$json.items}} is an array of objects. Leave it blank when {{$json.items}} is already a plain list of numbers or strings.\n' +
    'What to enter: The exact property name as it appears on each item, such as score, price, or createdAt.\n' +
    'Where the value comes from: Type the field name directly — this is not a template/expression field, it is the literal key name to read from every item.\n' +
    'How to use it later: The sorted array is returned as {{$json.items}} in the same order this field produced — nothing about the field name itself appears in the output.\n' +
    'Accepted format: A plain text field name, matching a key on the objects in {{$json.items}} exactly (case-sensitive).\n' +
    'Real workplace example: A leaderboard workflow sets Field to score and Direction to Descending Order to rank the highest scorers first.\n' +
    'If it is empty or wrong: Left blank, this node sorts the items themselves as plain values. If it is filled in but an item does not have that field (or is not an object at all), that item is silently treated as if the field value were missing — it sorts as if the value were 0 (Number type), an empty string (String type), or the epoch start (Date type) rather than raising an error.\n' +
    'Common mistake: Misspelling the field name (for example score vs Score) — every item then silently sorts as if the field were missing, clustering them all at one end instead of producing the expected order, with no error to reveal the typo.',
  placeholder: 'score',
  example: 'score',
};

const directionField: FieldDoc = {
  name: 'Direction',
  internalKey: 'direction',
  type: 'select',
  required: false,
  description: 'Whether the sorted list goes from smallest to largest (Ascending) or largest to smallest (Descending).',
  helpText:
    'What this field is: The dropdown that chooses whether the sort order goes low-to-high or high-to-low.\n' +
    'Why it matters: The same Field and Type produce the exact opposite item order depending on this setting.\n' +
    'When to fill it: Optional — defaults to Ascending Order if left at its default.\n' +
    'What to enter: Ascending Order for smallest-to-largest (A-Z, 0-9, earliest date first) or Descending Order for largest-to-smallest (Z-A, 9-0, latest date first).\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: This setting only changes the order of {{$json.items}} — it does not add any field to the output.\n' +
    'Accepted format: One of two literal values: asc, desc. The values ascending and descending are also accepted as aliases for asc/desc.\n' +
    'Real workplace example: A sales dashboard uses Descending Order on totalRevenue so the highest-earning accounts appear first.\n' +
    'If it is empty or wrong: Any value other than desc or descending (including a blank value or a typo) is silently treated as Ascending Order — there is no error for an invalid Direction.\n' +
    'Common mistake: Expecting the highest values first without explicitly choosing Descending Order — the default is Ascending Order (smallest first), which surprises anyone building a "top scorers" or "highest revenue" list.',
  placeholder: 'asc',
  defaultValue: 'asc',
  options: ['asc', 'desc'],
  example: 'desc',
};

const typeField: FieldDoc = {
  name: 'Type',
  internalKey: 'type',
  type: 'select',
  required: false,
  description: 'How values are compared: automatically detected, always as numbers, always as text, or always as dates.',
  helpText:
    'What this field is: The dropdown that chooses how the values pulled from Field (or the items themselves, if Field is blank) are compared to each other.\n' +
    'Why it matters: The same raw values can sort very differently as numbers versus text — for example, string-sorting the numbers 2, 10, and 9 produces 10, 2, 9 (alphabetical), not 2, 9, 10 (numeric).\n' +
    'When to fill it: Optional — Auto usually works. Set it explicitly when Auto guesses wrong, or when the data type needs to be forced regardless of how individual values look.\n' +
    'What to enter: Auto to let this node guess per comparison; Number to always compare numerically; String to always compare alphabetically; Date to always compare chronologically.\n' +
    'Where the value comes from: Chosen directly from the dropdown, based on what Field actually holds.\n' +
    'How to use it later: This setting only changes the order of {{$json.items}} — it does not add any field to the output.\n' +
    'Accepted format: One of four literal values: auto, number, string, date.\n' +
    'Real workplace example: A report field stores dates as text like "2026-07-18" — setting Type to Date (instead of leaving it on Auto and hoping it parses correctly) guarantees chronological rather than alphabetical order.\n' +
    'If it is empty or wrong: Left blank, this node defaults to Auto. On Auto, the type is re-detected for every pair of items being compared, based on that pair\'s own values (a real number becomes Number, a Date object becomes Date, a numeric-looking string becomes Number, a date-parseable string becomes Date, anything else becomes String) — in a list with inconsistent value types this can occasionally compare different pairs using different rules rather than one fixed type for the whole sort.\n' +
    'Common mistake: Leaving Type on Auto for a field that holds numbers written as text with leading zeros (such as "007") or mixed formats — Auto\'s numeric-string detection can produce a different order than expected. Set Type to String explicitly when exact text order matters more than numeric value.',
  placeholder: 'auto',
  defaultValue: 'auto',
  options: ['auto', 'number', 'string', 'date'],
  example: 'number',
};

const sortOperation: OperationDoc = {
  name: 'Sort Items',
  value: 'default',
  description: 'Reads the array at {{$json.items}}, sorts a defensive copy of it using Field, Direction, and Type, and replaces {{$json.items}} with the sorted copy — every other field on the item is left untouched. If {{$json.items}} is missing or is not an array, this node makes no changes at all and returns the input exactly as it arrived.',
  fields: [fieldField, directionField, typeField],
  outputExample: {
    items: [
      { name: 'Alice', score: 95 },
      { name: 'Bob', score: 80 },
    ],
  },
  outputDescription: 'The output keeps every field the input already had and replaces items with the newly-sorted array — nothing else changes. If {{$json.items}} was missing or not an array to begin with, the entire input is returned completely unchanged instead, with no error and no items key added.',
  usageExample: {
    scenario: 'Sort a leaderboard by score from highest to lowest before posting the top result',
    inputValues: { field: 'score', direction: 'desc', type: 'number' },
    expectedOutput: 'The highest-scoring record is now first at {{$json.items[0]}}, ready for a follow-up node to read {{$json.items[0].name}}.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const sortDoc: NodeDoc = {
  slug: 'sort',
  displayName: 'Sort',
  category: 'Data',
  logoUrl: '/icons/nodes/sort.svg',
  description: 'Sort the array at {{$json.items}} by an optional field, direction, and comparison type. If items is missing or not an array, this node silently returns the input unchanged rather than raising an error.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only reorders an array already present on the workflow item.',
    'No connection setup is required. Place this node after any step that produces a list at {{$json.items}}, such as Google Sheets Read, HTTP Request, Aggregate, or CSV Parse.',
    'Connect the Sort output to the next step that needs the items in order, such as Limit (to keep only the top results) or a Log Output/report node. Downstream service node account connection setup is still required for nodes after Sort; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Sort has a single action (internally the operation value default) that reads {{$json.items}}, sorts a copy of it using Field/Direction/Type, and writes the sorted copy back to {{$json.items}}. There is no validation anywhere in this node — a missing items array, a missing field on some items, or an unparseable value are all handled silently rather than by raising an error.',
      operations: [sortOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Missing or non-array items is silently returned unchanged — no error is raised',
      cause: '{{$json.items}} was not present on the incoming item, or it held something other than an array (for example, a single object).',
      fix: 'Confirm an upstream node (such as Google Sheets Read, HTTP Request, Aggregate, or CSV Parse) actually produced an items array before this node runs.',
    },
    {
      error: 'An item missing the Field value silently sorts as if the value were 0, an empty string, or the earliest possible date (no error is raised)',
      cause: 'Field was set, but one or more items in the array do not have that property, or are not objects at all.',
      fix: 'Check that every item in the array actually has the field named in Field, using the exact same spelling and case. Items missing the field cluster at whichever end represents the "smallest" value for the chosen Type.',
    },
    {
      error: 'Auto Type can compare different pairs of items using different rules in a mixed-type list',
      cause: 'Type was left on Auto and the array contains a mix of value shapes for the same field — for example some items store a real number and others store the same value as text.',
      fix: 'Set Type explicitly to Number, String, or Date when the field\'s values are not consistently the same shape, instead of relying on Auto to guess correctly every time.',
    },
    {
      error: 'The result looks sorted the wrong way',
      cause: 'Direction defaults to Ascending Order (smallest first) when left unset — a common surprise when building a "top N" or "highest first" list.',
      fix: 'Set Direction to Descending Order explicitly whenever the largest, latest, or highest-ranked value should appear first.',
    },
  ],
  relatedNodes: ['limit', 'merge_data', 'aggregate', 'filter'],
};
