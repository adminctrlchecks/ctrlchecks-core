import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const jsonField: FieldDoc = {
  name: 'JSON',
  internalKey: 'json',
  type: 'string',
  required: true,
  description: 'The JSON string (or already-parsed object) to convert into structured workflow data.',
  helpText:
    'What this field is: The JSON text (or object) this node parses into a usable JavaScript object.\n' +
    'Why it matters: Without it, there is nothing to parse — this is the entire input to the node.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: A JSON string, or an expression that resolves to one (or to an object that is already parsed).\n' +
    'Where the value comes from: Typically {{$json.body}} or {{$json.rawBody}} from a previous HTTP Request or webhook step.\n' +
    'How to use it later: The parsed result is always available at {{$json.parsed}}, regardless of whether Extract Fields is used.\n' +
    'Accepted format: A valid JSON string (object or array), or a value that is already a JavaScript object/array (in which case it is used as-is, without re-parsing).\n' +
    'Real workplace example: {{$json.rawBody}} from a webhook step containing a raw JSON payload is parsed here into a real object before individual fields are read downstream.\n' +
    'If it is empty or wrong: An empty value (after also checking the legacy jsonData and data config keys as fallbacks) fails immediately with "JSON Parser: json is required". A value that cannot be parsed as JSON fails with "JSON Parser: invalid JSON".\n' +
    'Common mistake: Passing JSON with single quotes instead of double quotes, or a trailing comma after the last item — both are invalid JSON syntax and fail parsing even though they look correct at a glance.',
  placeholder: '{"name":"Alice","email":"alice@example.com"}',
};

const extractFieldsField: FieldDoc = {
  name: 'Extract Fields',
  internalKey: 'extractFields',
  type: 'json',
  required: false,
  description: 'An optional JSON array of top-level field names to copy from the parsed object directly onto the output, in addition to the full object at {{$json.parsed}}.',
  helpText:
    'What this field is: A list of top-level key names from the parsed JSON that should also be copied straight onto the output, so they can be referenced without going through {{$json.parsed.*}}.\n' +
    'Why it matters: Without it, every field must be read as {{$json.parsed.fieldName}}; with it, commonly-used fields become directly available as {{$json.fieldName}}, which is shorter and easier to read in later nodes.\n' +
    'When to fill it: Optional — fill it in when a few specific fields will be reused often in downstream nodes. Leave it blank to only get the full object under {{$json.parsed}}.\n' +
    'What to enter: A JSON array of field-name strings, matching keys that exist at the top level of the parsed object.\n' +
    'Where the value comes from: Look at the structure of the JSON you expect to receive and pick the specific top-level keys you plan to reference repeatedly.\n' +
    'How to use it later: Each listed field becomes directly available as {{$json.<fieldName>}}, alongside the complete object still available at {{$json.parsed}}.\n' +
    'Accepted format: A JSON array of strings, such as ["name","email"] — not a comma-separated plain string and not an object.\n' +
    'Real workplace example: ["email","plan"] on a parsed subscription webhook payload makes {{$json.email}} and {{$json.plan}} directly available for a follow-up Filter or Email node, without needing {{$json.parsed.email}}.\n' +
    'If it is empty or wrong: Left blank or set to an empty array, this node skips the copy step entirely and only returns {{$json.parsed}} — no error is raised either way. Listing a field name that does not exist in the parsed object does not error either — it is silently copied onto the output as undefined rather than being flagged as missing.\n' +
    'Common mistake: Listing a nested path like "user.email" expecting it to work — this only reads true top-level keys; a field one level deep is not reachable this way and must instead be read as {{$json.parsed.user.email}}.',
  placeholder: '["name","email"]',
};

const parseOperation: OperationDoc = {
  name: 'Parse',
  value: 'default',
  description: 'Parses a JSON string (or passes through an already-parsed object unchanged) into a structured object at {{$json.parsed}}, and optionally copies specific top-level fields directly onto the output for shorter references.',
  fields: [jsonField, extractFieldsField],
  outputExample: { parsed: { userId: 123, email: 'alice@example.com', plan: 'premium' }, userId: 123, email: 'alice@example.com' },
  outputDescription: 'parsed: the complete parsed JSON as a JavaScript object or array — always present. When Extract Fields lists field names, each one is also copied directly onto the output at the top level (for example {{$json.email}}) in addition to living inside parsed. Every field already present on the incoming input is preserved unchanged alongside these new keys.',
  usageExample: {
    scenario: 'Parse a JSON payload received from a webhook and pull out a couple of commonly-used fields for later steps',
    inputValues: { json: '{{$json.rawBody}}', extractFields: '["email","plan"]' },
    expectedOutput: 'The full object is available as {{$json.parsed}}; {{$json.email}} and {{$json.plan}} are also directly available without drilling into parsed.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const jsonParserDoc: NodeDoc = {
  slug: 'json_parser',
  displayName: 'JSON Parser',
  category: 'Data',
  logoUrl: '/icons/nodes/json_parser.svg',
  description: 'Parse a JSON string (or pass through an already-parsed object) into structured workflow data, with an optional shortcut to copy specific top-level fields directly onto the output. This node has a single Parse action — there is no operation dropdown.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only converts JSON text already present in the workflow into a structured object.',
    'No connection setup is required. Place this node after any step that produces a JSON string, such as HTTP Request, Webhook, or a raw text field.',
    'Connect the JSON Parser output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.parsed}}. Downstream service node account connection setup is still required for nodes after JSON Parser; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Configuration',
      description: 'JSON Parser has a single action (internally the operation value default): parse the JSON field into an object and optionally copy chosen top-level fields directly onto the output. Legacy field aliases jsonData and data are also accepted as fallbacks for the main JSON field.',
      operations: [parseOperation],
    },
  ],
  commonErrors: [
    {
      error: 'JSON Parser: json is required',
      cause: 'The JSON field (and the legacy jsonData/data aliases) were all empty.',
      fix: 'Provide JSON text directly, or map it from a previous step\'s output such as {{$json.body}} after an HTTP Request or webhook.',
    },
    {
      error: 'JSON Parser: invalid JSON',
      cause: 'The text in JSON is not valid JSON — common causes are single quotes instead of double quotes, a trailing comma, or unclosed braces/brackets.',
      fix: 'Validate the JSON syntax (double-quoted keys and string values, no trailing commas, matched braces/brackets) before this node, or fix the upstream source producing it.',
    },
    {
      error: 'A field listed in Extract Fields that does not exist in the parsed object becomes undefined on the output (no error is raised)',
      cause: 'Extract Fields named a top-level key that is not actually present in the parsed JSON — often due to a typo, wrong casing, or a field that is nested rather than top-level.',
      fix: 'Double-check the exact top-level key names in the parsed JSON (case-sensitive), and remember that only true top-level keys are reachable this way — a nested field must instead be read from {{$json.parsed.*}} directly.',
    },
    {
      error: 'A non-array or empty Extract Fields value is silently skipped entirely (no error is raised)',
      cause: 'Extract Fields was left blank, set to an empty array, or set to something that is not a JSON array (such as a plain comma-separated string).',
      fix: 'Format Extract Fields as a genuine JSON array of field-name strings, such as ["name","email"], or leave it blank if you only need the full object at {{$json.parsed}}.',
    },
  ],
  relatedNodes: ['xml', 'set', 'edit_fields', 'http_request', 'text_formatter', 'javascript'],
};
