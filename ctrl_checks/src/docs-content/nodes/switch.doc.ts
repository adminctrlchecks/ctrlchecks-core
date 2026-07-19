import type { NodeDoc } from '../types';

export const switchDoc: NodeDoc = {
  slug: 'switch',
  displayName: 'Switch',
  category: 'Logic',
  logoUrl: '/icons/nodes/switch.svg',
  description: 'Route workflow runs into several named paths by matching one incoming value against a list of case values.',
  credentialType: 'None - Switch does not use credentials or a third-party account.',
  credentialSetupSteps: [
    'No third-party account is needed for the Switch node itself. It only reads data that already came from an earlier workflow step.',
    'Connect one outgoing line from each case output to the action for that case. The outgoing handle should match the case value, such as billing, technical, or general.',
    'Add a final fallback or review path when possible, so unmatched values have somewhere intentional to go.',
    'Every service node after a Switch branch, such as Gmail, Slack, Notion, HubSpot, or Jira, still needs its own account connection before that branch can run.',
    'Keep API keys, passwords, and tokens out of Switch fields. Store secrets in the destination service node connection instead.',
  ],
  credentialDocsUrl: '',
  resources: [
    {
      name: 'Configuration',
      description: 'Configure the value to inspect and the case values that become branch outputs.',
      operations: [
        {
          name: 'Configure',
          value: 'default',
          description: 'Evaluates one value from the incoming workflow data, compares it with each configured case value, and routes the run to the matching case branch. Use Switch when there are three or more outcomes, such as support ticket category, order status, lead source, region, or product line.',
          fields: [
            {
              name: 'Expression',
              internalKey: 'expression',
              type: 'string',
              required: true,
              description: 'The incoming value to inspect and compare against the case values.',
              helpText: `What this field is: The value Switch looks at to decide which branch should run, such as a ticket category, payment status, region, lead source, or product type.
Why it matters: Every case is compared with this one value. If the expression points to the wrong field, the workflow will choose the wrong branch or no branch.
When to fill it: Fill it whenever the workflow has several possible paths based on a previous node value.
What to enter: Enter a field path or template that resolves to one simple value. Common examples are {{$json.category}}, {{$json.status}}, {{$json.region}}, {{$json.plan}}, and {{$json.priority}}.
Where the value comes from: Inspect the output of the trigger or previous node and copy the exact field that contains the routing value.
How to use it later: The matched branch keeps the original business data, so downstream nodes can still use values like {{$json.customerEmail}}, {{$json.ticketId}}, or {{$json.orderId}}.
Accepted format: A template such as {{$json.status}}, a plain simple path supported by the workflow engine, or a lightweight expression that returns text, a number, true, or false. The final result is compared as text to cases[].value.
Real workplace example: In a help desk workflow, set Expression to {{$json.category}} so billing tickets go to Finance, technical tickets go to Engineering Support, and general tickets go to Customer Care.
If it is empty or wrong: The node returns no matched case or an error, and downstream case branches may be skipped.
Common mistake: Using the visible label from a form instead of the internal output key. Use {{$json.category}}, not "Ticket Category".`,
              placeholder: '{{$json.status}}',
              example: '{{$json.category}}',
              notes: 'Use If/Else instead when there are only two outcomes. Use Switch when one value can map to several named outcomes.',
            },
            {
              name: 'Cases',
              internalKey: 'cases',
              type: 'json',
              required: true,
              description: 'The list of branch definitions. Each case value becomes an outgoing branch handle.',
              helpText: `What this field is: The list of allowed values and human labels for the Switch branches.
Why it matters: Each case value becomes a branch output. The expression result must match one case value for that branch to run.
When to fill it: Fill it when you know the possible values, such as billing, technical, general, paid, failed, pending, US, EU, or APAC.
What to enter: Enter an array of objects. Each object needs value and label. The value is the exact machine value to match and the outgoing branch handle. The label is the friendly name people see in the workflow.
Where the value comes from: Case values should match the real values produced by the previous node. Check a sample run before inventing case names.
How to use it later: Connect each case output to its action. For example, connect billing to a finance queue, technical to an engineering support alert, and general to a standard support inbox.
Accepted format: JSON such as [{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]. Values must be unique, non-empty strings. Legacy string arrays may be normalized, but object cases are clearer.
Real workplace example: Route support tickets by category with billing, technical, and general case values.
If it is empty or wrong: The Switch has no usable branch outputs, duplicate values may fail validation, and unmatched values may fall through to fallback routing instead of a named branch.
Common mistake: Making labels unique but values duplicate. Branch identity comes from value, so every value must be unique.`,
              placeholder: '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]',
              example: '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]',
              notes: 'The case value is what edges wire to. Changing a case value after connecting branches can require reconnecting or validating those branch lines.',
            },
            {
              name: 'Routing Type',
              internalKey: 'routingType',
              type: 'string',
              required: false,
              description: 'Optional legacy hint for how the expression should be interpreted.',
              helpText: `What this field is: An optional compatibility hint for older saved Switch configs. Most users should leave it empty.
Why it matters: The current Switch runtime uses Expression as the routing value. Routing Type is not a replacement for Expression and should not be used to store the value being checked.
When to fill it: Only fill it when maintaining an older workflow or a generated config that already uses routingType.
What to enter: Use string for text-like values, number for numeric values, or expression when an older workflow explicitly expects that hint.
Where the value comes from: This comes from legacy workflow configuration, not from normal business data.
How to use it later: You usually do not use it later. Downstream routing depends on the matched case branch, while downstream nodes use original fields such as {{$json.status}}.
Accepted format: string, number, or expression as plain text. Leave empty for normal new workflows.
Real workplace example: An older status-routing workflow may keep routingType as string while Expression remains {{$json.status}} and Cases contain paid, failed, and pending.
If it is empty or wrong: New workflows usually still work when it is empty. If it is used incorrectly as the actual routing value, the Switch will not inspect the intended field.
Common mistake: Typing "string" here and leaving Expression empty. Expression is still required.`,
              placeholder: 'string',
              example: 'string',
              notes: 'This field is optional and may not appear in the main frontend panel for new workflows.',
            },
            {
              name: 'Rules',
              internalKey: 'rules',
              type: 'json',
              required: false,
              description: 'Deprecated alias for Cases that older workflows may still contain.',
              helpText: `What this field is: A legacy name for Cases. Older workflows may store branch definitions under rules instead of cases.
Why it matters: The runtime can migrate rules into cases so older workflows keep working, but new documentation and UI should use Cases.
When to fill it: Do not fill this for new workflows. Use it only when editing a legacy workflow that already has rules and no cases.
What to enter: Use the same shape as Cases: an array of objects with value and label.
Where the value comes from: It comes from old saved workflow configs or migration output, not from ordinary user input.
How to use it later: After migration, treat the values as case outputs and connect branch lines using those case values.
Accepted format: JSON such as [{"value":"paid","label":"Paid"},{"value":"failed","label":"Failed"},{"value":"pending","label":"Pending"}].
Real workplace example: A legacy payment workflow may have rules for paid, failed, and pending; those should become Cases when the workflow is updated.
If it is empty or wrong: New workflows are unaffected when Cases is present. A legacy workflow with only invalid rules may have no branch outputs.
Common mistake: Maintaining both rules and cases with different values. Keep Cases as the source of truth once the workflow is updated.`,
              placeholder: '[{"value":"paid","label":"Paid"},{"value":"failed","label":"Failed"},{"value":"pending","label":"Pending"}]',
              example: '[{"value":"paid","label":"Paid"},{"value":"failed","label":"Failed"},{"value":"pending","label":"Pending"}]',
              notes: 'Prefer Cases for all new workflows. Rules remains documented because it is part of the backend optional config contract.',
            },
          ],
          outputExample: {
            ticketId: 'TCK-2048',
            customerEmail: 'customer@example.com',
            category: 'billing',
            priority: 'normal',
            __routing: {
              matchedCase: 'billing',
              matchedLabel: 'Billing',
              expression: '{{$json.category}}',
              expressionValue: 'billing',
            },
          },
          outputDescription: 'The Switch output preserves incoming business data such as ticketId, customerEmail, category, and priority, then stores routing metadata under __routing with matchedCase, matchedLabel, expression, and expressionValue. Runtime metadata also reports branch and caseMatched. Backend inventory exposes output, data, and result-compatible outputs for downstream compatibility.',
          usageExample: {
            scenario: 'Route support tickets to Billing, Technical Support, or Customer Care based on the submitted category.',
            inputValues: {
              expression: '{{$json.category}}',
              cases: '[{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"},{"value":"general","label":"General"}]',
              routingType: 'string',
              rules: '',
            },
            expectedOutput: 'A ticket where {{$json.category}} is billing leaves through the billing case output, and downstream nodes can still use {{$json.customerEmail}} and {{$json.ticketId}}.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'Missing expression',
      cause: 'Expression is empty, so Switch does not know which incoming value to inspect.',
      fix: 'Set Expression to a real previous-step field, such as {{$json.status}}, {{$json.category}}, or {{$json.region}}.',
    },
    {
      error: 'Missing cases',
      cause: 'Cases is empty or invalid, so the node cannot create usable branch outputs.',
      fix: 'Add case objects such as [{"value":"billing","label":"Billing"},{"value":"technical","label":"Technical"}].',
    },
    {
      error: 'Duplicate case value',
      cause: 'Two case rows use the same value. Switch branch handles must be unique.',
      fix: 'Give every case a unique value, then reconnect any affected outgoing lines.',
    },
    {
      error: 'No matching case',
      cause: 'The expression result does not exactly match any case value, or casing/spelling differs.',
      fix: 'Compare a real previous node output with Cases. Make the value exactly match, such as billing matching billing.',
    },
    {
      error: 'Case branch is not connected',
      cause: 'A case value exists but its outgoing line is missing, so matching work has nowhere intentional to go.',
      fix: 'Connect each case output to the correct downstream node, and add a fallback/review path for unexpected values when possible.',
    },
    {
      error: 'Wrong field path',
      cause: 'Expression points to a display label or guessed key instead of the actual field in the previous output.',
      fix: 'Inspect a real run and copy the exact expression path, such as {{$json.category}} or {{$json.payment_status}}.',
    },
    {
      error: 'Permission denied in a branch action',
      cause: 'Switch itself does not use credentials, but a service node after a case branch is missing its account connection.',
      fix: 'Open the failing branch node and connect the required Gmail, Slack, Notion, CRM, Jira, or other service account.',
    },
  ],
  relatedNodes: ['if_else', 'merge', 'filter', 'stop_and_error', 'slack_message', 'google_gmail', 'jira'],
};
