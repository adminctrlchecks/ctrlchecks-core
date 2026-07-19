import type { NodeDoc } from '../types';

export const ifElseDoc: NodeDoc = {
  slug: 'if_else',
  displayName: 'If/Else',
  category: 'Logic',
  logoUrl: '/icons/nodes/if_else.svg',
  description: 'Make a yes-or-no decision in a workflow, then send matching work down the TRUE branch and everything else down the FALSE branch.',
  credentialType: 'None - If/Else does not use credentials or a third-party account.',
  credentialSetupSteps: [
    'No third-party account is needed for the If/Else node itself. It only reads data that already arrived from an earlier workflow step.',
    'Connect the TRUE output to the action that should run when the conditions match, such as sending a VIP email when {{$json.plan}} equals premium.',
    'Connect the FALSE output to the fallback action, such as sending a regular email, logging the item, or ending the workflow.',
    'Every service node after either branch, such as Gmail, Slack, Notion, or HubSpot, still needs its own account connection before that branch can run.',
    'Keep API keys, passwords, and tokens out of If/Else conditions. Put secrets in the destination service node connection instead.',
  ],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the rule rows that decide whether each run leaves through TRUE or FALSE.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Checks one or more values from previous workflow steps and routes the run to the TRUE output when the conditions pass, or to the FALSE output when they do not. Use it for approvals, lead qualification, priority routing, exception handling, and any workflow that needs a yes-or-no decision.',
          fields: [
            {
              name: 'Conditions',
              internalKey: 'conditions',
              type: 'json',
              required: true,
              description: 'The list of rule rows the node evaluates. Each row has a field, an operator, and a value.',
              helpText: `What this field is: The full set of yes-or-no checks for this branch point. Each condition row asks one plain question, such as "Is orderTotal greater than 500?" or "Does status equal approved?"
Why it matters: These rows decide which downstream path runs. A matching run leaves through TRUE; a non-matching run leaves through FALSE.
When to fill it: Fill this every time the workflow needs a decision, such as routing high-value orders to sales, sending failed payments to support, or separating urgent tickets from normal tickets.
What to enter: In the builder, choose the Field from earlier data, choose the Operator, then type the Value to compare against. In JSON mode, use objects like {"field":"$json.orderTotal","operator":"greater_than","value":500}.
Where the value comes from: The field usually comes from the trigger or previous node output, for example $json.status, $json.customerEmail, $json.orderTotal, or input.score.
How to use it later: Connect the TRUE output to the action for matching work and the FALSE output to the fallback action. Downstream nodes can still use the original data, such as {{$json.customerEmail}} or {{$json.orderTotal}}.
Accepted format: Use the builder rows for normal editing. JSON mode accepts an array of condition objects with field, operator, and value. Supported operators are equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, and not_contains.
Real workplace example: For enterprise leads, set Field to $json.companySize, Operator to greater_than_or_equal, and Value to 500. Connect TRUE to create a sales opportunity and FALSE to add the lead to a nurture list.
If it is empty or wrong: The workflow cannot reliably decide which branch to run, or the run may always leave through FALSE because the field path does not exist.
Common mistake: Comparing against a label people see in a form instead of the internal value produced by the earlier node. Check the previous node output and copy the exact field path.`,
              placeholder: '[{"field":"$json.orderTotal","operator":"greater_than_or_equal","value":500}]',
              example: '[{"field":"$json.orderTotal","operator":"greater_than_or_equal","value":500}]',
              notes: 'Use this when the decision has one or more rule rows. Add more rows when the same branch should depend on multiple facts, such as order amount and customer region.',
            },
            {
              name: 'Condition Field',
              internalKey: 'conditionField',
              type: 'string',
              required: true,
              description: 'The incoming value to check in a condition row.',
              helpText: `What this field is: The exact piece of data the rule should inspect, such as $json.status, $json.priority, $json.orderTotal, input.email, or input.age.
Why it matters: If the field points to the wrong place, the condition checks the wrong value and the branch decision will feel random.
When to fill it: Fill it for every condition row. Choose from the dropdown when the field is shown there, or type a custom field path when you need a value from a previous node that is not listed.
What to enter: Enter the field path exactly as it appears in the previous node output. Use $json.orderTotal for a normal workflow value, input.score for simple trigger data, or a nested path such as $json.customer.plan when the value is inside an object.
Where the value comes from: Open the last successful run or preview the previous node output, then copy the data key you want this If/Else to inspect.
How to use it later: The chosen field stays available after the branch, so a TRUE path email can still use {{$json.customerEmail}} and a FALSE path log can still record {{$json.orderTotal}}.
Accepted format: Plain field paths such as $json.status, $json.orderTotal, input.email, or input.score. Template wrappers like {{$json.status}} may be normalized, but the plain path is easier to read in the builder.
Real workplace example: In a refund workflow, set Condition Field to $json.refundAmount so orders above a threshold go to manager approval.
If it is empty or wrong: The rule is ignored or evaluates against an empty value, commonly sending work through the FALSE branch.
Common mistake: Typing the field label from a form, such as "Order Total", instead of the internal key, such as $json.orderTotal.`,
              placeholder: '$json.orderTotal',
              example: '$json.orderTotal',
              notes: 'This is a row-level control inside Conditions, not a separate backend field.',
            },
            {
              name: 'Condition Operator',
              internalKey: 'conditionOperator',
              type: 'select',
              required: true,
              description: 'The comparison to use between the selected field and the value.',
              helpText: `What this field is: The rule's comparison type. It tells If/Else whether to check for an exact match, a mismatch, a number being higher or lower, or text containing a phrase.
Why it matters: The same field and value can lead to different branch decisions depending on the operator. For example, status equals approved is very different from status not_equals approved.
When to fill it: Choose an operator for every condition row. Use equals for statuses and categories, not_equals for exclusions, greater_than and less_than for thresholds, greater_than_or_equal and less_than_or_equal when the boundary value should count, contains for text or lists that should include something, and not_contains for text or lists that must not include something.
What to enter: Pick one dropdown option: equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, or not_contains.
Where the value comes from: The operator comes from the kind of workplace rule you are modeling. Approval thresholds usually use greater_than_or_equal; routing by plan usually uses equals; filtering out test records often uses not_contains.
How to use it later: The branch result appears as conditionResult and branch metadata, while downstream nodes continue using fields like {{$json.status}} or {{$json.orderTotal}}.
Accepted format: Dropdown values are equals, not_equals, greater_than, less_than, greater_than_or_equal, less_than_or_equal, contains, and not_contains. JSON mode also accepts common aliases like ==, ===, !=, !==, >, <, >=, and <=.
Real workplace example: To alert the finance team about large invoices, choose greater_than_or_equal and enter 10000 as the value.
If it is empty or wrong: The condition may fail validation, compare values the wrong way, or route work to the opposite branch.
Common mistake: Using contains for an exact status such as paid. Use equals when the whole value must match.`,
              placeholder: 'greater_than_or_equal',
              example: 'greater_than_or_equal',
              options: [
                'equals',
                'not_equals',
                'greater_than',
                'less_than',
                'greater_than_or_equal',
                'less_than_or_equal',
                'contains',
                'not_contains',
              ],
              notes: 'Use number comparisons only when the incoming value is a number or a numeric string that represents a number.',
            },
            {
              name: 'Compare Value',
              internalKey: 'conditionValue',
              type: 'string',
              required: true,
              description: 'The value the selected field is compared with.',
              helpText: `What this field is: The target value for the condition row, such as approved, enterprise, 500, true, or support.
Why it matters: The condition can only pass when the incoming field matches this value according to the chosen operator.
When to fill it: Fill it after choosing the field and operator. Use the exact text, number, or true/false value that should trigger the TRUE branch.
What to enter: Enter plain text for statuses and categories, numbers for amount or score thresholds, and true or false for checkbox-style fields. Do not add quotes in the builder value box.
Where the value comes from: Use the value your business process already uses, such as approved from a CRM status, premium from a plan field, or 80 from a lead score threshold.
How to use it later: A matching value sends the run to TRUE. A non-matching value sends it to FALSE, where downstream nodes can still reference the original value with expressions like {{$json.status}}.
Accepted format: Text, numbers, true, false, or null in JSON mode. For contains and not_contains, enter the word, phrase, or list item that should be present or absent.
Real workplace example: In a hiring workflow, compare $json.interviewScore greater_than_or_equal 8 so strong candidates go to scheduling and everyone else goes to a polite follow-up.
If it is empty or wrong: The row is ignored by the builder or the workflow compares against the wrong target and chooses the wrong branch.
Common mistake: Typing "500 dollars" when the incoming field is a number. Use 500 for numeric comparisons and put the currency in a separate message field later.`,
              placeholder: '500',
              example: '500',
              notes: 'This is a row-level control inside Conditions. Keep it aligned with the operator and the incoming field type.',
            },
            {
              name: 'Combine Operation',
              internalKey: 'combineOperation',
              type: 'select',
              required: false,
              description: 'How multiple condition rows work together.',
              helpText: `What this field is: The setting that decides how If/Else handles more than one condition row.
Why it matters: It controls whether the TRUE branch requires every rule to pass or only one rule to pass.
When to fill it: Use it whenever Conditions has two or more rows. Leave the default AND for strict decisions; switch to OR when several different values should all qualify for the same TRUE path.
What to enter: Choose AND or OR. AND means every condition must be true. OR means at least one condition must be true.
Where the value comes from: This comes from your routing policy. For example, "customer is enterprise and region is US" uses AND, while "ticket is urgent or customer is VIP" uses OR.
How to use it later: The result decides the outgoing branch. TRUE and FALSE downstream nodes can still use values such as {{$json.customerEmail}}, {{$json.plan}}, or {{$json.ticketPriority}}.
Accepted format: Select AND or OR. AND is the default. JSON and saved workflow configs should store these as uppercase AND or OR.
Real workplace example: For a sales handoff, use AND when leadScore is greater_than_or_equal 80 and companySize is greater_than_or_equal 500. Use OR when priority equals urgent or customerTier equals VIP.
If it is empty or wrong: The workflow defaults to AND, which may be stricter than expected and send items to FALSE when only one row matched.
Common mistake: Choosing AND when the business rule means "any of these can qualify." If the sentence uses "or", choose OR.`,
              placeholder: 'AND',
              example: 'AND',
              defaultValue: 'AND',
              options: ['AND', 'OR'],
              notes: 'AND means all rows must match. OR means any row can match. With one condition row, both choices behave the same.',
            },
          ],
          outputExample: {
            orderId: 'ORD-1042',
            customerEmail: 'buyer@example.com',
            orderTotal: 725,
            status: 'paid',
            condition: true,
            condition_result: true,
            conditionResult: true,
            result: true,
            branch: 'true',
          },
          outputDescription: 'The output keeps the incoming business data, such as orderId, customerEmail, orderTotal, and status, then adds routing fields such as condition, condition_result, conditionResult, result, and branch metadata. Backend inventory also exposes output, data, and result-style outputs for downstream compatibility.',
          usageExample: {
            scenario: 'Send high-value paid orders to a finance review path and normal orders to a standard fulfillment path.',
            inputValues: {
              conditions: '[{"field":"$json.orderTotal","operator":"greater_than_or_equal","value":500},{"field":"$json.status","operator":"equals","value":"paid"}]',
              conditionField: '$json.orderTotal',
              conditionOperator: 'greater_than_or_equal',
              conditionValue: '500',
              combineOperation: 'AND',
            },
            expectedOutput: 'A paid order with {{$json.orderTotal}} of 725 leaves through TRUE, and downstream nodes can still use {{$json.customerEmail}}. An unpaid or smaller order leaves through FALSE.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Missing TRUE output path',
      cause: 'The If/Else node has no outgoing line from the TRUE handle, so matching work has nowhere useful to go.',
      fix: 'Connect the TRUE output to the node that should run when the conditions match, such as a Slack alert, approval step, or VIP email.',
    },
    {
      error: 'Missing FALSE output path',
      cause: 'The If/Else node has no outgoing line from the FALSE handle, so non-matching work is dropped or the workflow looks unfinished.',
      fix: 'Connect the FALSE output to a fallback node, log node, normal processing step, or an intentional end point.',
    },
    {
      error: 'Condition never matches',
      cause: 'The field path, operator, or compare value does not match the data coming from the previous step.',
      fix: 'Inspect the previous node output and use the exact path, such as $json.status, $json.orderTotal, or $json.customer.plan.',
    },
    {
      error: 'Wrong field path',
      cause: 'The condition uses a display label or guessed key instead of the actual internal field name in the previous node output.',
      fix: 'Copy the field path from a real run. For example, use $json.data.email only if the previous output actually nests email under data.',
    },
    {
      error: 'Wrong Combine Operation',
      cause: 'AND was used when any condition should pass, or OR was used when every condition should pass.',
      fix: 'Read the business rule out loud. If it says "and", choose AND. If it says "or", choose OR.',
    },
    {
      error: 'Text compared as number',
      cause: 'A greater-than or less-than operator was used on a value that is not a clean number.',
      fix: 'Make sure the previous node sends a number like 500, not text like "500 dollars".',
    },
    {
      error: 'Permission denied in a branch action',
      cause: 'If/Else itself does not use credentials, but a service node after TRUE or FALSE is missing its account connection.',
      fix: 'Open the failing service node on that branch and connect the required Gmail, Slack, Notion, CRM, or other account.',
    },
  ],
  relatedNodes: ['switch', 'filter', 'merge', 'stop_and_error', 'gmail', 'slack_message'],
};
