import type { FieldDoc, NodeDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const noCredentialSteps = [
  'No third-party account is required; Parallel only reads its own settings and incoming workflow data.',
  'Connect this node output to the next step with the outgoing line that should continue after the parallel marker.',
  'Any service node on a downstream branch still needs its own account connection in the service node settings.',
];

const modeField: FieldDoc = {
  name: 'Mode',
  internalKey: 'mode',
  type: 'select',
  required: false,
  description: 'Choose Wait for all (value all) to record all-branches orchestration, or Race (first completes) (value race) to record first-completion orchestration.',
  helpText: richFieldHelp({
    what: 'Mode is the orchestration label stored by the Parallel node. Wait for all records the value all; Race (first completes) records the value race.',
    why: 'The workflow engine uses branch wiring for fan-out and fan-in, while this node preserves the selected mode in output and metadata so later steps can see the intended behavior.',
    when: 'Leave the default when downstream branches should all complete before the workflow rejoins. Choose Race only when the first successful branch should decide what happens next.',
    enter: 'Pick Wait for all for normal parallel approvals, notifications, or lookups. Pick Race (first completes) for first-response wins patterns such as trying two enrichment sources.',
    source: 'This is a workflow design choice, not a value copied from another app. You can map {{$json.parallelMode}} only when a previous step intentionally supplies all or race.',
    later: 'Downstream nodes can read {{$json.mode}} and the registry metadata can include parallelMode. The runtime also includes {{$json.results}}, but it is an empty placeholder in this execution path.',
    format: 'Dropdown value all or race.',
    example: 'A support workflow sets Wait for all before separate Slack and email notification branches, then rejoins after both are wired.',
    empty: 'Blank or unrecognized values fall back to the runtime default all, so the output still contains mode: all.',
    mistake: 'Do not expect the Parallel node by itself to execute or collect branch results. Connect the branch paths in the workflow canvas and use Merge where data must be recombined.',
  }),
  placeholder: 'all',
  example: 'all',
  defaultValue: 'all',
  options: ['Wait for all', 'Race (first completes)'],
  notes: 'Wait for all keeps all downstream branches conceptually active. Race (first completes) records race intent, but this legacy runtime block still returns an empty results array; branch fan-out/fan-in is handled outside this node.',
};

export const parallelDoc: NodeDoc = {
  slug: 'parallel',
  displayName: 'Parallel',
  category: 'Flow',
  logoUrl: '/icons/nodes/parallel.svg',
  description: 'Pass workflow data through while recording the selected parallel orchestration mode.',
  credentialType: 'None',
  credentialSetupSteps: noCredentialSteps,
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Parallel has one configuration operation. It marks a fan-out point and passes input forward; actual branch wiring and any later merge are handled by the workflow engine and connected nodes.',
      operations: [
        {
          name: 'Configure',
          value: 'configure',
          description: 'Record whether the surrounding workflow should be treated as wait-for-all or race mode. The node does not call another service, does not need credentials, and does not collect live branch outputs itself; it forwards object input fields while adding mode and results.',
          fields: [modeField],
          outputExample: {
            orderId: 'ord_1042',
            customerEmail: 'buyer@example.com',
            mode: 'all',
            results: [],
          },
          outputDescription: 'The output keeps object input fields such as orderId and customerEmail, adds mode with all or race, and adds results as an empty array placeholder. Registry metadata can also include parallelMode. Primitive input is not preserved as a top-level field by this legacy block.',
          usageExample: {
            scenario: 'After an order is approved, mark the point where Slack notification, email receipt, and warehouse update branches should run independently before a later merge.',
            inputValues: {
              mode: 'all',
            },
            expectedOutput: 'The next connected step can read {{$json.orderId}}, {{$json.customerEmail}}, {{$json.mode}}, and {{$json.results}} while branch fan-out is controlled by the workflow wiring.',
          },
          externalDocsUrl: 'https://docs.ctrlchecks.com',
        },
      ],
    },
  ],
  commonErrors: [
    {
      error: 'No real branch outputs in results',
      cause: 'The runtime returns results: [] from this node. It records mode but does not gather downstream branch output into that array.',
      fix: 'Use connected branch paths and a Merge node when the workflow needs real data from multiple branches.',
    },
    {
      error: 'Race mode does not cancel downstream work',
      cause: 'The node records race intent as mode: race; cancellation of already-running downstream work is not performed inside this legacy execution block.',
      fix: 'Design downstream branches so duplicate work is safe, or add explicit conditions before side-effecting service nodes.',
    },
    {
      error: 'Primitive input is not preserved as a top-level field',
      cause: 'Only object-shaped input is spread into the output. Text, numbers, and arrays are not copied into named top-level fields by this case.',
      fix: 'Wrap primitive data in an object before Parallel, such as { "message": "text" }, when later nodes must map it.',
    },
    {
      error: 'Branch fan-out/fan-in is handled by the workflow engine',
      cause: 'The Parallel node settings alone do not create canvas branches or merge their data.',
      fix: 'Connect the outgoing lines to the intended branch nodes, then connect those branches into Merge or another join point.',
    },
  ],
  relatedNodes: ['merge', 'if_else', 'switch'],
};
