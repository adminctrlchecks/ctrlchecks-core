import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const modeField: FieldDoc = {
  name: 'Mode',
  internalKey: 'mode',
  type: 'select',
  required: false,
  description: 'How this node combines data from every workflow branch connected into it: overwrite fields into one flat object, append each branch as a list item, or deep-merge nested objects.',
  helpText:
    'What this field is: The dropdown that chooses how incoming branch data is combined once every connected branch reaches this node.\n' +
    'Why it matters: Overwrite Fields silently relies on data the workflow engine already combined before this node ran; Append Items and Deep Merge Objects actively look up this node\'s own incoming connections in the saved workflow to rebuild the per-branch data.\n' +
    'When to fill it: Whenever more than one branch (for example, both paths out of an If/Else, or several Switch cases) needs to rejoin into a single payload before the next step.\n' +
    'What to enter: Overwrite Fields for simple flat objects where a later branch\'s value should replace an earlier one with the same field name; Append Items when the next node should receive a list of every branch\'s full output at {{$json.items}}; Deep Merge Objects when different branches add different nested details (such as customer info from one branch and approval info from another) that should all survive together.\n' +
    'Where the value comes from: Chosen directly from the dropdown — it is never mapped from a previous step.\n' +
    'How to use it later: In Overwrite Fields and Deep Merge Objects modes, read the combined fields directly from {{$json}} (for example {{$json.customer.email}}). In Append Items mode, the entire output becomes {{$json.items}}, an array with one entry per connected branch — no other top-level fields are present.\n' +
    'Accepted format: One of three literal values: overwrite, append, deep_merge.\n' +
    'Real workplace example: After a Switch node routes a support ticket through category-specific enrichment steps, Deep Merge Objects keeps the customer details from one branch and the ticket details from another branch under their own nested objects instead of one branch\'s data overwriting the other.\n' +
    'If it is empty or wrong: This field defaults to overwrite, and any value other than the exact text append or deep_merge (including a blank value, a typo, or an unsupported alias) is silently treated as overwrite — there is no error for an invalid Mode.\n' +
    'Common mistake: Selecting Deep Merge Objects and assuming arrays or plain values (not objects) at the same field name across branches get combined — they do not. When two branches disagree on a non-object field, the later branch\'s value silently replaces the earlier one, the same as Overwrite Fields would do for that field.',
  placeholder: 'overwrite',
  defaultValue: 'overwrite',
  options: ['overwrite', 'append', 'deep_merge'],
};

const mergeOperation: OperationDoc = {
  name: 'Merge',
  value: 'default',
  description: 'Combines the data produced by every workflow branch connected into this node, using the strategy chosen in Mode. This node runs the exact same underlying code as the Merge node (found in the Logic category) — Merge Data is simply the same behavior offered under the Data category with different labels on the Mode dropdown, for workflows that prefer to find it there.',
  fields: [modeField],
  outputExample: {
    ticketId: 'TCK-2048',
    customer: { email: 'customer@example.com', tier: 'VIP' },
    status: 'reviewed',
  },
  outputDescription: 'The output shape depends entirely on Mode, with no extra wrapper keys such as mergeMode or sourceCount added anywhere. In overwrite mode (the default, and also what happens for any unrecognized Mode value), the workflow engine has already combined every incoming branch into one flat object before this node runs — later branches win when a field name collides — and this node simply passes that combined object through unchanged, shown above. In append mode, the output is replaced entirely with {{$json.items}}, an array holding each connected branch\'s full output object — no other top-level fields survive. In deep_merge mode, this node looks up its own incoming connections and recursively combines nested object fields from every branch into one object, but arrays and non-object values at the same field name are replaced by the later branch\'s value rather than merged together.',
  usageExample: {
    scenario: 'Rejoin an approval branch and a customer-enrichment branch before sending one summary email',
    inputValues: { mode: 'deep_merge' },
    expectedOutput: 'The next node can read {{$json.customer.email}} and {{$json.approval.status}} together from one combined payload, even though each field came from a different branch.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const mergeDataDoc: NodeDoc = {
  slug: 'merge_data',
  displayName: 'Merge Data',
  category: 'Data',
  logoUrl: '/icons/nodes/merge_data.svg',
  description: 'Combine data arriving from multiple workflow branches into one output, using overwrite (flatten with later branches winning), append (collect every branch into an items list), or deep merge (recursively combine nested objects). This node shares the exact same execution code as the Merge node in the Logic category — it is the same behavior, listed a second time under Data for workflows that look for it there.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only combines data already produced by other nodes in this workflow.',
    'Connect two or more incoming branch outputs into Merge Data when separate paths (such as both sides of an If/Else, or several Switch cases) need to rejoin before a later step runs.',
    'Connect the Merge Data output to whatever comes next, such as a summary email, a database write, a Slack message, or a Log Output node.',
    'Every service node placed after Merge Data, such as Gmail, Slack, Notion, HubSpot, Google Sheets, or a CRM node, still needs its own account connection before it can run — Merge Data itself has nothing to authorize.',
    'Keep API keys, passwords, and tokens out of the data being merged. Store secrets in the destination service node\'s own connection, not inside fields flowing through this node.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Merge Data has a single action (internally the operation value default) that branches on the Mode field to run one of three combination strategies: overwrite (the default, a flat merge that already happened upstream in the workflow engine), append (collect every connected branch into an items list), and deep_merge (recursively combine nested objects). Append and deep_merge look up this node\'s own saved incoming connections to rebuild each branch\'s output; if that lookup fails or finds no connected branches, this node silently falls back to overwrite behavior rather than raising an error.',
      operations: [mergeOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Append or Deep Merge Objects mode has no connected branches to combine — output is silently unchanged instead of an error being raised',
      cause: 'Mode was set to append or deep_merge, but this node\'s saved incoming connections in the workflow produced zero usable branch outputs — for example, only one branch is actually connected, or an upstream branch never ran.',
      fix: 'Connect at least two branches into Merge Data before the workflow runs, and confirm every upstream branch actually executes and produces output. Check the workflow canvas for the expected number of incoming lines.',
    },
    {
      error: 'The workflow\'s saved connection data could not be looked up for Append or Deep Merge Objects mode — output is silently unchanged instead of an error being raised',
      cause: 'Append and deep_merge modes need to re-read this node\'s incoming connections directly from the saved workflow, and that lookup failed (for example, a temporary database issue).',
      fix: 'This is an internal/infrastructure issue, not something wrong with your field values. Re-run the workflow; if it keeps happening, overwrite mode does not need this lookup at all and can be used as a temporary workaround.',
    },
    {
      error: 'Deep Merge Objects does not combine arrays or mismatched types — the later branch silently replaces the earlier one instead of merging',
      cause: 'Two connected branches had the same field name, but the values were not both plain objects (for example, one branch had an array and another had a plain value, or both had arrays) at that field.',
      fix: 'Deep Merge Objects only recursively combines fields that are objects in every branch. For arrays or plain values at the same field name, rename the field in one branch upstream, or accept that the later-connected branch\'s value is what survives.',
    },
    {
      error: 'An unrecognized or misspelled Mode value is silently treated as Overwrite Fields',
      cause: 'Mode was left blank, or a workflow was hand-edited with a Mode value other than the exact text overwrite, append, or deep_merge.',
      fix: 'Choose Overwrite Fields, Append Items, or Deep Merge Objects directly from the dropdown. There is no validation error for a bad value — the node just behaves as if Overwrite Fields was chosen, which can produce a plausible-looking but unintended result.',
    },
  ],
  relatedNodes: ['merge', 'set', 'sort', 'limit', 'filter', 'split_in_batches'],
};
