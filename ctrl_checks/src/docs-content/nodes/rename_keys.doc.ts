import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const mappingsField: FieldDoc = {
  name: 'Key Mappings (JSON)',
  internalKey: 'mappings',
  type: 'json',
  required: true,
  description: 'A JSON object where each key is a current field name on the incoming item and each value is the new field name it should be renamed to.',
  helpText:
    'What this field is: A JSON object listing every field you want renamed, written as "current name": "new name" pairs.\n' +
    'Why it matters: This is the only setting on this node — it drives every rename this node performs. Without it, nothing can be renamed.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: A JSON object such as {"oldEmail": "email", "cust_name": "customerName"}. Each key on the left is the field name as it currently exists on the incoming item; each value on the right is what that field should be called afterward.\n' +
    'Where the value comes from: Typed directly as JSON — this field itself is not a template/expression field and does not accept {{$json...}} mapping the way most other fields do; only the object structure itself is fixed, though the object can be built dynamically upstream by an AI-generation step.\n' +
    'How to use it later: After this node runs, read the field under its NEW name, for example {{$json.email}} after renaming oldEmail to email. The old field name ({{$json.oldEmail}}) no longer exists on the output.\n' +
    'Accepted format: A JSON object whose keys and values are both plain strings — {"currentName": "newName", ...}. Multiple renames can be listed in the same object.\n' +
    'Real workplace example: An import feed sends fields named cust_email and cust_phone; {"cust_email": "email", "cust_phone": "phone"} renames both to the plain field names the rest of the workflow expects.\n' +
    'If it is empty or wrong: If this value is missing or is not a JSON object at all (for example, an empty string or a plain array), this node returns the error "Rename Keys: mappings must be an object" and stops. If it is a valid object but a listed current-name key does not actually exist on the incoming item, that one mapping is silently skipped — no error, no new field is added for it, and no field is deleted.\n' +
    'Common mistake: Mapping two different current names to the same new name, or mapping a field to a new name that already exists on the item — whichever rename runs last silently overwrites the earlier value at that name, with no warning that data was lost.',
  placeholder: '{"oldName":"name","oldEmail":"email"}',
  example: '{"oldName":"name","oldEmail":"email"}',
};

const renameOperation: OperationDoc = {
  name: 'Rename',
  value: 'default',
  description: 'Renames one or more fields on the current workflow item according to Key Mappings. For each mapping, if the current field name exists on the item, its value is copied to the new field name and the old field name is removed; if the current field name does not exist, that mapping is silently skipped. Fields not listed in the mappings are left completely unchanged.',
  fields: [mappingsField],
  outputExample: {
    name: 'Alice',
    email: 'alice@example.com',
    status: 'active',
  },
  outputDescription: 'The output is the same item that came in, with every successfully-mapped field renamed: the value moves to the new field name and the old field name is deleted. Fields not mentioned in Key Mappings (such as status above) pass through completely unchanged. There is no extra wrapper object and no success flag — the renamed item itself is the entire output. A mapping whose current name was not found on the input is silently skipped rather than reported.',
  usageExample: {
    scenario: 'Normalize inconsistent field names from an import feed before loading data into another system',
    inputValues: { mappings: '{"oldEmail":"email"}' },
    expectedOutput: 'The value that was at {{$json.oldEmail}} is now available as {{$json.email}}, and oldEmail no longer exists on the output.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const renameKeysDoc: NodeDoc = {
  slug: 'rename_keys',
  displayName: 'Rename Keys',
  category: 'Data',
  logoUrl: '/icons/nodes/rename_keys.svg',
  description: 'Rename one or more fields on the current workflow item using a simple old-name-to-new-name JSON mapping. Fields not listed in the mapping pass through unchanged; a mapped name that does not exist on the item is silently skipped rather than raising an error.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only renames fields already present on the current workflow item.',
    'No connection setup is required. Place this node anywhere upstream field names need to match what a later step (or a destination service) expects.',
    'Connect the Rename Keys output to the next step that should read the renamed fields. Downstream service node account connection setup is still required for nodes after Rename Keys; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'Rename Keys has a single action (internally the operation value default) that applies every entry in Key Mappings to the current item: matching fields are renamed in place, and any mapping whose current name is missing from the item is silently skipped.',
      operations: [renameOperation],
    },
  ],
  commonErrors: [
    {
      error: 'Rename Keys: mappings must be an object',
      cause: 'Key Mappings was left empty, or was set to something that is not a JSON object (such as a plain string, a number, or an array).',
      fix: 'Provide a valid JSON object such as {"oldName": "newName"}. Each key must be the field\'s current name and each value must be the new name.',
    },
    {
      error: 'A mapped current name is silently skipped when it does not exist on the item (no error is raised)',
      cause: 'One of the keys in Key Mappings does not match any field actually present on the incoming item — for example, a typo in the current-name key, or the upstream node did not produce that field this run.',
      fix: 'Check the exact field names on the item coming into this node (for example with a Log Output node just before it), and make sure every current-name key in Key Mappings matches one exactly, including case.',
    },
    {
      error: 'Renaming a field onto an existing name silently overwrites it (no error is raised)',
      cause: 'A mapping\'s new name already exists on the item — either because it was already there before this node ran, or because an earlier mapping in the same Key Mappings object already produced it.',
      fix: 'Choose new names that do not collide with existing fields, or double-check the order and uniqueness of the new names listed in Key Mappings.',
    },
    {
      error: 'Renamed fields are not automatically mapped in downstream nodes',
      cause: 'A downstream node was configured before this Rename Keys node was added, so it still references the old field name.',
      fix: 'After adding or changing Rename Keys, review downstream nodes and update any {{$json.oldName}} references to the new field name.',
    },
  ],
  relatedNodes: ['set', 'edit_fields', 'json_parser'],
};
