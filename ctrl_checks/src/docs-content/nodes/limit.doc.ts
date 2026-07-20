import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const limitField: FieldDoc = {
  name: 'Limit',
  internalKey: 'limit',
  type: 'number',
  required: true,
  description: 'The maximum number of items to keep from the array, counted from the beginning.',
  helpText:
    'What this field is: The maximum number of items this node keeps from the source array.\n' +
    'Why it matters: It is the entire purpose of this node — without it, there is nothing to cap.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: A whole number, zero or greater.\n' +
    'Where the value comes from: Chosen directly based on how many items downstream steps should actually process — for example a "top 5" report or a rate-limit-safe batch size.\n' +
    'How to use it later: The trimmed array replaces {{$json.items}} for every step after this node.\n' +
    'Accepted format: A non-negative integer, as text or number — for example 5, 10, or 100.\n' +
    'Real workplace example: Setting this to 5 on a search-results array keeps only the top 5 matches for a summary notification, discarding the rest.\n' +
    'If it is empty or wrong: Left blank, this node defaults to 10. A value that is not a valid non-negative number (NaN, or a negative number) is silently ignored — this node returns the input completely unchanged rather than raising an error or applying a partial limit.\n' +
    'Common mistake: Assuming a limit larger than the actual array size will cause a problem — it does not; the node simply returns every item that exists, with no error or padding.',
  placeholder: '10',
};

const arrayField: FieldDoc = {
  name: 'Array',
  internalKey: 'array',
  type: 'string',
  required: false,
  description: 'An optional specific array (or expression pointing to one) to limit. Leave blank to use the incoming items array automatically.',
  helpText:
    'What this field is: An optional override telling this node exactly which array to limit, instead of automatically using the incoming items array.\n' +
    'Why it matters: Most of the time items is already the right array, but occasionally the array you want to limit lives under a different key, like a nested results field from an API response.\n' +
    'When to fill it: Only fill it in when the array to limit is not the standard items array. Leave it blank for the common case — this node automatically falls back to input.items, then input.array, in that order.\n' +
    'What to enter: A template expression that resolves to an array, such as {{$json.results}}.\n' +
    'Where the value comes from: Point it at whichever field in the previous step\'s output actually holds the array you want capped.\n' +
    'How to use it later: Regardless of which source array was used, the trimmed result always replaces {{$json.items}} — there is no separate output key for this field\'s source.\n' +
    'Accepted format: A template expression resolving to an array, or a literal array value.\n' +
    'Real workplace example: {{$json.results}} on a step whose real array lives under results rather than items, so the standard automatic fallback would not have found it.\n' +
    'If it is empty or wrong: Left blank, this node automatically tries input.items and then input.array instead. If this field, input.items, and input.array are all empty or not arrays, this node returns the input completely unchanged — with no items key added and no error raised.\n' +
    'Common mistake: Assuming this field is required — it is optional, and filling it in unnecessarily when items already holds the right array has no benefit and adds a place for a typo to silently break the fallback chain.',
  placeholder: '{{$json.items}}',
};

const limitOperation: OperationDoc = {
  name: 'Limit Items',
  value: 'default',
  description: 'Keeps only the first N items (in original order) from the source array, where N is the configured Limit. Every other field already present on the input — including things like headers, rows, or google_sheets from an upstream node — is preserved unchanged alongside the trimmed items.',
  fields: [limitField, arrayField],
  outputExample: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
  outputDescription: 'items: the source array truncated to the first Limit entries, in their original order. There is no separate array output key — the result always replaces items only, regardless of which source (Array field, input.items, or input.array) supplied the original data. Every other field already on the input (such as headers or rows from a Parse-style upstream node) passes through unchanged.',
  usageExample: {
    scenario: 'Take only the top 5 search results from a large results array before sending a summary notification',
    inputValues: { limit: '5', array: '{{$json.results}}' },
    expectedOutput: 'Returns the first 5 entries from results in {{$json.items}}, ready for a Slack Message or Email node to summarize.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const limitDoc: NodeDoc = {
  slug: 'limit',
  displayName: 'Limit',
  category: 'Data',
  logoUrl: '/icons/nodes/limit.svg',
  description: 'Restricts an array to its first N items, keeping every other field on the input unchanged. This node never raises an error under any circumstance — a missing array or an invalid Limit value both silently pass the input through unchanged instead.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only trims an array already present in the workflow.',
    'No connection setup is required. Place this node after any step that outputs an array, such as HTTP Request, Google Sheets, or a Search operation.',
    'Connect the Limit output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.items}}. Downstream service node account connection setup is still required for nodes after Limit; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Limit has a single action (internally the operation value default): truncate an array to the first N items. It reads the array to limit from the Array field, then falls back to input.items, then input.array, in that priority order.',
      operations: [limitOperation],
    },
  ],
  commonErrors: [
    {
      error: 'This node never raises an error — a missing array silently returns the input completely unchanged',
      cause: 'The Array field, input.items, and input.array were all empty, null, or not arrays, leaving nothing to limit.',
      fix: 'Confirm the previous step actually outputs an array under items (the common case), or set Array to an expression pointing at wherever the real array lives, and check {{$json.items}} afterward rather than expecting an error to surface the problem.',
    },
    {
      error: 'An invalid Limit value (non-numeric or negative) silently returns the input completely unchanged, without applying any limit at all',
      cause: 'Limit resolved to something that is not a valid non-negative number — for example an empty expression, text, or a negative value.',
      fix: 'Confirm Limit is a plain non-negative number, and check the actual size of {{$json.items}} afterward rather than assuming a limit was applied.',
    },
    {
      error: 'There is no separate "array" output key, despite what older documentation for this node may have implied',
      cause: 'A misconception rather than a runtime condition — the result of limiting is always returned under items only.',
      fix: 'Read the trimmed array from {{$json.items}} in every case; do not build downstream logic expecting a duplicate {{$json.array}} key.',
    },
    {
      error: 'Setting Array to an expression that resolves to something other than an array is silently ignored, falling back to input.items/input.array instead',
      cause: 'The Array field\'s expression evaluated to an object, string, or undefined rather than a real array.',
      fix: 'Confirm the expression in Array truly points at an array-valued field, and remember that if it does not resolve to an array, this node quietly falls back to input.items or input.array instead of failing loudly.',
    },
  ],
  relatedNodes: ['sort', 'merge_data', 'split_in_batches', 'filter', 'loop'],
};
