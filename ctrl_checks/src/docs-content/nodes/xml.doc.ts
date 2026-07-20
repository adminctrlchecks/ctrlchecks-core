import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: false,
  description: 'Which XML action to run: convert XML to a JSON-like object, pull one value out with a simplified path, or check whether the XML is syntactically valid.',
  helpText:
    'What this field is: The dropdown that chooses what this node does with the XML in the XML field.\n' +
    'Why it matters: It decides which other field (XPath) is actually used, and what shape the output takes.\n' +
    'When to fill it: Optional — defaults to Parse.\n' +
    'What to enter: Parse to convert the whole XML document into a JSON-like object; Extract to pull out one value using a slash-separated path (also parses the whole document at the same time); Validate to check whether the XML is well-formed without converting it.\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: Parse and Extract both return the fully parsed document at {{$json.data}}; Extract additionally returns the one pulled-out value at {{$json.result}}; Validate returns {{$json.valid}} and {{$json.errors}} instead of any parsed data.\n' +
    'Accepted format: One of three literal values: parse, extract, validate.\n' +
    'Real workplace example: An HTTP Request node calls a supplier\'s XML order-status API; Extract with XPath /orderStatus/status pulls just the status text out of the full response for a follow-up If/Else check.\n' +
    'If it is empty or wrong: Left blank, this node defaults to Parse. A value other than parse, extract, or validate fails with "XML: unsupported operation" naming the bad value.\n' +
    'Common mistake: Choosing Extract without realizing XPath here is a simplified slash-path, not real XPath — it does not support wildcards, attribute selectors, or array indices the way a true XPath expression would.',
  placeholder: 'parse',
  defaultValue: 'parse',
  options: ['parse', 'extract', 'validate'],
  example: 'extract',
};

const xmlField: FieldDoc = {
  name: 'XML Content',
  internalKey: 'xml',
  type: 'textarea',
  required: true,
  description: 'The raw XML text this node processes, either typed directly or mapped from an earlier step such as an HTTP Request response body.',
  helpText:
    'What this field is: The XML document or fragment this node parses, extracts from, or validates.\n' +
    'Why it matters: It is the only source of data for every operation this node supports.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: A complete XML document such as <root><item>value</item></root>, or a template expression that resolves to one.\n' +
    'Where the value comes from: Type XML directly, or map it from a previous step\'s output, such as {{$json.responseBody}} after an HTTP Request node calls an XML-returning API.\n' +
    'How to use it later: Not echoed back verbatim as raw text — Parse and Extract return the parsed object at {{$json.data}} instead of the original XML string.\n' +
    'Accepted format: A well-formed XML string. Element attributes are parsed too, appearing in the output with an @_ prefix, such as @_id for an id="..." attribute.\n' +
    'Real workplace example: {{$json.responseBody}} from an HTTP Request node that called a shipping carrier\'s tracking API, which returns tracking data as XML.\n' +
    'If it is empty or wrong: An empty value (including one that resolves to an empty string) fails with "XML: xml field is required". XML larger than Max Size fails with a size-limit error before any parsing is attempted. Malformed XML that cannot be parsed at all fails with a generic "XML error:" message describing the parser failure (Validate is the exception — it reports malformed XML as a normal successful result with valid: false, not as an error).\n' +
    'Common mistake: Passing an HTML page or a plain JSON string into this field expecting it to work — this node expects real XML markup and will fail to parse non-XML content.',
  placeholder: '<root><item>value</item></root>',
  example: '{{$json.responseBody}}',
};

const xpathField: FieldDoc = {
  name: 'XPath Expression',
  internalKey: 'xpath',
  type: 'string',
  required: false,
  description: 'A simplified, slash-separated path used only by the Extract operation to pull one value out of the parsed XML, such as /root/order/id.',
  helpText:
    'What this field is: The path this node walks through the parsed XML to find one specific value, used only when Operation is Extract.\n' +
    'Why it matters: Without it, Extract has nothing to look for and fails immediately.\n' +
    'When to fill it: Required only when Operation is Extract. Ignored completely by Parse and Validate.\n' +
    'What to enter: A path like /root/item or /root/order/id, matching the nesting of element names in the XML — not a real XPath expression.\n' +
    'Where the value comes from: Built by looking at the XML\'s own element structure, or by first running Parse to see the parsed shape at {{$json.data}} and reading off the nesting from there.\n' +
    'How to use it later: The pulled-out value is returned at {{$json.result}}, and the path itself is echoed back at {{$json.xpath}}.\n' +
    'Accepted format: A slash-separated list of element names, such as /root/item/@_id for an attribute or /root/item for element text. This is a simplified dot-path walker, not real XPath — it has no support for wildcards (*), attribute selectors ([@id="x"]), array indices ([0]), or functions.\n' +
    'Real workplace example: /orderStatus/status pulls the order status text out of a supplier\'s XML order-status response.\n' +
    'If it is empty or wrong: Left blank while Operation is Extract, this node fails with "XML extract: xpath field is required" (the parsed document is still returned at {{$json.data}} even though this error fires). A path that does not match anything in the XML does not raise an error at all — it silently returns {{$json.result}} as null and {{$json.success}} as false.\n' +
    'Common mistake: Assuming a repeated sibling element (such as multiple <item> tags under one parent) can be indexed with something like /root/item[0] — it cannot; this simplified path walker has no array-index syntax, so it only ever returns whatever the raw parsed value at that path is (which may be an array of all the repeated elements, not a single one).',
  placeholder: '/root/item',
  example: '/root/order/id',
};

const maxSizeField: FieldDoc = {
  name: 'Max Size (bytes)',
  internalKey: 'maxSize',
  type: 'number',
  required: false,
  description: 'The largest XML payload, in bytes, this node will attempt to process. Larger input is rejected before parsing begins.',
  helpText:
    'What this field is: A safety limit on how large the XML in the XML field is allowed to be.\n' +
    'Why it matters: It protects the workflow from trying to parse an unexpectedly huge XML payload (for example, a runaway API response) that could be slow or memory-intensive.\n' +
    'When to fill it: Optional — the default of 5,242,880 bytes (5 MB) is generous for most API responses and exports.\n' +
    'What to enter: A whole number of bytes. Lower it to fail fast on unexpectedly large responses, or raise it for workflows that legitimately process large XML exports.\n' +
    'Where the value comes from: Typed directly as a plain number — this is not an expression field.\n' +
    'How to use it later: Not present on the output — it only affects whether this node proceeds or fails.\n' +
    'Accepted format: A positive whole number of bytes.\n' +
    'Real workplace example: Lowering Max Size to 524288 (512 KB) on a node that only ever expects a small status-check XML response, so an unexpectedly large payload fails loudly instead of being processed slowly.\n' +
    'If it is empty or wrong: Left blank, this node falls back to the default of 5,242,880 bytes. XML larger than the effective limit fails with "XML: input exceeds maxSize (<limit> bytes)" before any parsing is attempted.\n' +
    'Common mistake: Setting this too low for a workflow that legitimately handles large XML exports or feeds, causing every run to fail with the size-limit error even though the XML itself is valid.',
  placeholder: '5242880',
  defaultValue: '5242880',
  example: '5242880',
};

const xmlOperation: OperationDoc = {
  name: 'Process XML',
  value: 'default',
  description: 'Runs the selected Operation against the XML in XML Content. Parse converts the whole document to a JSON-like object at {{$json.data}}. Extract does the same parsing and additionally pulls one value out using XPath Expression, returned at {{$json.result}}. Validate only checks whether the XML is well-formed, without producing any parsed data.',
  fields: [operationField, xmlField, xpathField, maxSizeField],
  outputExample: {
    data: { root: { item: 'value' } },
    success: true,
  },
  outputDescription: 'Every field the input already had is kept, with these fields added on top. Parse adds data (the parsed XML as a JSON-like object) and success: true. Extract adds result (the value found at XPath Expression, or null if the path did not match anything — with no error raised for a non-matching path), xpath (the path used), data (the full parsed document), and success (true only when result was actually found). Validate adds valid (true or false) and errors (an array of {message, line} objects, empty when valid) — malformed XML during Validate is a normal, successful check result, not an error.',
  usageExample: {
    scenario: 'Pull the order status out of a supplier\'s XML order-status API response',
    inputValues: { operation: 'extract', xml: '{{$json.responseBody}}', xpath: '/orderStatus/status' },
    expectedOutput: 'The extracted status text is available at {{$json.result}}, and the full parsed document is still available at {{$json.data}} if more fields are needed later.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const xmlDoc: NodeDoc = {
  slug: 'xml',
  displayName: 'XML',
  category: 'Data',
  logoUrl: '/icons/nodes/xml.svg',
  description: 'Parse XML into a JSON-like object, extract one value using a simplified slash-separated path, or validate that XML is well-formed. Extract\'s XPath Expression is a simplified path walker, not real XPath — it has no wildcard, attribute-selector, or array-index support.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only processes XML text already present in the workflow.',
    'No connection setup is required. Place this node after any step that produces XML, such as an HTTP Request node calling an XML-based API.',
    'Connect the XML output to the next step that needs the parsed data or extracted value. Downstream service node account connection setup is still required for nodes after XML; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'XML supports three operations selected by the Operation field: parse (convert to an object), extract (parse, then pull out one value by path), and validate (check well-formedness only). All three share the same XML Content and Max Size fields; only Extract also uses XPath Expression.',
      operations: [xmlOperation],
    },
  ],
  commonErrors: [
    {
      error: 'XML: xml field is required',
      cause: 'XML Content was empty, or an expression in it resolved to an empty value.',
      fix: 'Provide XML content directly, or point XML Content at an upstream field that actually contains XML, such as {{$json.responseBody}}.',
    },
    {
      error: 'XML: input exceeds maxSize (<limit> bytes)',
      cause: 'The XML text was larger than the Max Size limit (5,242,880 bytes by default).',
      fix: 'Raise Max Size if the larger payload is expected and legitimate, or confirm the upstream response is not unexpectedly large before it reaches this node.',
    },
    {
      error: 'XML extract: xpath field is required',
      cause: 'Operation was set to Extract but XPath Expression was left blank.',
      fix: 'Enter a slash-separated path such as /root/item. The parsed document is still available at {{$json.data}} even while this error is present, if that is enough on its own.',
    },
    {
      error: 'A non-matching XPath Expression silently returns null (no error is raised)',
      cause: 'XPath Expression was filled in, but no element in the parsed XML matched that exact path.',
      fix: 'Run Parse first (or check {{$json.data}} from a prior Extract attempt) to see the real nesting of element names, and correct XPath Expression to match exactly, including case.',
    },
    {
      error: 'XML: unsupported operation "<value>"',
      cause: 'Operation held a value other than parse, extract, or validate — only reachable via a hand-edited workflow, since the visual dropdown only offers valid values.',
      fix: 'Select Parse, Extract, or Validate from the Operation dropdown.',
    },
    {
      error: 'XML error: <parser message>',
      cause: 'The XML in XML Content was not well-formed enough for the parser to process at all, on Parse or Extract (Validate handles this case differently — see the next entry).',
      fix: 'Check the raw XML text for unclosed tags, mismatched quotes, or invalid characters. Use Validate first to check well-formedness without needing the XML to fully parse.',
    },
    {
      error: 'Invalid XML during Validate is a normal result, not an error',
      cause: 'Operation was set to Validate and the XML was not well-formed.',
      fix: 'This is expected — read {{$json.valid}} (false) and {{$json.errors}} (details) rather than expecting {{$json._error}} to be set.',
    },
  ],
  relatedNodes: ['json_parser', 'html', 'text_formatter'],
};
