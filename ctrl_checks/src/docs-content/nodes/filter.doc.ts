import type { NodeDoc } from '../types';

export const filterDoc: NodeDoc = {
  slug: 'filter',
  displayName: 'Filter',
  category: 'Logic',
  logoUrl: '/icons/nodes/filter.svg',
  description: 'Keep only the records in a list that match a rule, then pass the smaller list to the next step.',
  credentialType: 'None - Filter does not use credentials or a third-party account.',
  credentialSetupSteps: [
    'No third-party account is needed for the Filter node itself. It only works with data already received from an earlier workflow step.',
    'Connect the Filter output to the next action that should receive the smaller list, such as sending follow-up emails only to active customers.',
    'Make sure the previous node outputs a list field, usually {{$json.items}}, {{$json.rows}}, {{$json.contacts}}, or {{$json.orders}}.',
    'Every service node after Filter, such as Gmail, Slack, Notion, HubSpot, Google Sheets, or Airtable, still needs its own account connection before it can run.',
    'Keep API keys, passwords, and tokens out of Filter expressions. Store secrets in the destination service node connection instead.',
  ],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the list to filter and the rule each item must pass.',
      operations: [
        {
          name: 'Configure',
          value: 'default',
          description: 'Reads an array from the incoming workflow data, checks each item against the filter condition, and replaces items with only the records that matched. Use it to keep active customers, paid orders, qualified leads, overdue tasks, or high-priority tickets before sending the list to later workflow steps.',
          fields: [
            {
              name: 'Array',
              internalKey: 'array',
              type: 'string',
              required: false,
              description: 'Optional expression for the list to filter. Leave empty to use the previous node items array.',
              helpText: `What this field is: The list of records Filter should inspect, such as customers, orders, rows, contacts, tasks, or tickets.
Why it matters: Filter only removes records from the list you point it at. If this points to the wrong place, the next node may receive the wrong records or an unchanged input.
When to fill it: Leave it empty when the previous node already sends the list as items. Fill it when the list is stored under a different key, such as contacts, rows, orders, or data.records.
What to enter: Use an expression that returns an array, such as {{$json.items}}, {{$json.contacts}}, {{$json.orders}}, {{$json.rows}}, or {{$json.data.records}}.
Where the value comes from: Inspect the previous node output and find the field that contains the list you want to narrow down.
How to use it later: Filter replaces {{$json.items}} with the smaller list. Downstream nodes can map over {{$json.items}} or pass it to Loop, Function Item, email, spreadsheet, or database nodes.
Accepted format: Leave blank to use input.items or enter a template/expression that resolves to an array. The array should contain objects when your condition checks fields like item.status or item.total.
Real workplace example: A CRM search returns {{$json.contacts}}. Set Array to {{$json.contacts}} and Condition to item.status === "active" so the next email step receives only active contacts.
If it is empty or wrong: If no array is found, the input passes through unchanged. If the expression points to a non-list value, no filtering happens.
Common mistake: Pointing to one record instead of the list. Use {{$json.contacts}}, not {{$json.contacts[0]}}.`,
              placeholder: '{{$json.items}}',
              example: '{{$json.contacts}}',
              notes: 'The backend optional config includes array. The frontend calls it Array Expression.',
            },
            {
              name: 'Condition',
              internalKey: 'condition',
              type: 'string',
              required: true,
              description: 'The rule each item must pass to stay in the list.',
              helpText: `What this field is: The rule that decides whether each item stays in the output list.
Why it matters: Items where the rule is true stay in {{$json.items}}. Items where the rule is false are removed before the next node runs.
When to fill it: Fill it any time you need to narrow a list, such as active customers only, paid orders only, leads above a score, support tickets with urgent priority, or rows missing an email address.
What to enter: Write a simple expression using item for the current record. Examples: item.status === "active", item.total >= 500, item.priority === "urgent", item.email && !item.email.includes("test"), or item.completed !== true.
Where the value comes from: Use field names from each object inside the array. If an item looks like {"status":"active","total":725}, use item.status and item.total.
How to use it later: The next node receives the same incoming object with {{$json.items}} replaced by only the matching records, while other business fields stay available.
Accepted format: A JavaScript-style expression that returns true or false for one item. Use === for exact text, !== for not equal, >= and <= for thresholds, && for "and", || for "or", and includes() when text or a list must contain something.
Real workplace example: In an order workflow, use item.status === "paid" && item.total >= 500 to keep only paid high-value orders before creating finance review tasks.
If it is empty or wrong: The node returns a condition-required error, a filter error, or an unchanged list. In secured deployments where JavaScript filtering is disabled, the node returns "Filter node execution is disabled for security reasons."
Common mistake: Using {{$json.status}} inside the item rule. Use item.status because the condition runs once per item in the array.`,
              placeholder: 'item.status === "active"',
              example: 'item.status === "active"',
              notes: 'Keep the condition small and readable. For complex transformations, use Function or Function Item after filtering.',
            },
          ],
          outputExample: {
            batchId: 'weekly-active-customers',
            items: [
              {
                id: 'cus_1001',
                name: 'Asha Rao',
                email: 'asha@example.com',
                status: 'active',
                lifetimeValue: 2400,
              },
              {
                id: 'cus_1003',
                name: 'Miguel Torres',
                email: 'miguel@example.com',
                status: 'active',
                lifetimeValue: 1450,
              },
            ],
            sourceCount: 4,
          },
          outputDescription: 'The node preserves incoming business fields such as batchId and sourceCount, then replaces items with the filtered array. Backend inventory exposes output, data, and result-compatible outputs. If no array is available, input can pass through unchanged; if the condition cannot run, the output can include _error.',
          usageExample: {
            scenario: 'Keep only active customers before sending a renewal campaign.',
            inputValues: {
              array: '{{$json.contacts}}',
              condition: 'item.status === "active" && item.email && !item.email.includes("test")',
            },
            expectedOutput: 'The next node receives {{$json.items}} containing only active contacts with real email addresses, while fields like {{$json.batchId}} remain available.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Condition is required',
      cause: 'The Condition field is empty, so Filter does not know which records should stay.',
      fix: 'Add a simple item-based rule, such as item.status === "active" or item.total >= 500.',
    },
    {
      error: 'Array expression is not a list',
      cause: 'Array points to a single object, text value, or missing field instead of an array.',
      fix: 'Inspect the previous node output and point Array to a real list, such as {{$json.items}}, {{$json.rows}}, or {{$json.contacts}}.',
    },
    {
      error: 'Filter node execution is disabled for security reasons',
      cause: 'The deployment has JavaScript-style filtering disabled for safety.',
      fix: 'Use a source-node query/filter when possible, or move the filtering rule to an approved Function/Code path configured for your workspace.',
    },
    {
      error: 'Condition removed every item',
      cause: 'The rule is too strict, uses the wrong field name, or compares text and numbers incorrectly.',
      fix: 'Preview one item from the array and test a smaller rule first, such as item.status === "active".',
    },
    {
      error: 'Wrong item field name',
      cause: 'The condition uses a display label or top-level workflow field instead of a field on each array item.',
      fix: 'Use item.fieldName from the records inside the array, such as item.email, item.status, or item.total.',
    },
    {
      error: 'Next node cannot find filtered items',
      cause: 'The downstream node expects the original array key, but Filter writes the filtered list to items.',
      fix: 'Map the downstream node from {{$json.items}}, or add a Set/Edit Fields step to rename the filtered list.',
    },
    {
      error: 'Permission denied after filtering',
      cause: 'Filter itself does not use credentials, but a service node after it is missing its account connection.',
      fix: 'Open the failing downstream service node and connect the required Gmail, Slack, Notion, Google Sheets, Airtable, or CRM account.',
    },
  ],
  relatedNodes: ['if_else', 'switch', 'loop', 'function_item', 'merge', 'google_sheets', 'airtable'],
};
