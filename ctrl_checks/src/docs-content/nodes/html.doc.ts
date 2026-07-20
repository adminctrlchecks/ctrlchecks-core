import type { NodeDoc, FieldDoc, OperationDoc } from '../types';

const operationField: FieldDoc = {
  name: 'Operation',
  internalKey: 'operation',
  type: 'select',
  required: true,
  description: 'Whether to parse page metadata, extract text via a CSS selector, or convert the whole body to plain text.',
  helpText:
    'What this field is: The dropdown that chooses which HTML processing this node performs.\n' +
    'Why it matters: It determines which fields are read (Selector only matters for Extract) and what the output shape looks like.\n' +
    'When to fill it: Always — it is required on every run.\n' +
    'What to enter: Parse to read the page title, meta tags, and body HTML; Extract to pull text out of elements matching a CSS selector; To Text to strip all tags from the body and get plain readable text.\n' +
    'Where the value comes from: Chosen directly from the dropdown.\n' +
    'How to use it later: Parse produces {{$json.title}}/{{$json.meta}}/{{$json.body}}; Extract produces {{$json.results}}/{{$json.count}}; To Text produces {{$json.text}} — the three operations never share output keys.\n' +
    'Accepted format: One of three literal values: parse, extract, toText (to_text is also accepted as a snake_case alias).\n' +
    'Real workplace example: A price-monitoring workflow fetches a product page with HTTP Request, then uses Extract with selector .price to pull out the current price text.\n' +
    'If it is empty or wrong: The frontend always sends a value (it defaults to parse); an unrecognized value returns "HTML: unsupported operation \\"<value>\\". Supported: parse, extract, toText".\n' +
    'Common mistake: Choosing Parse when you actually want specific data (like a price or headline) — Parse only returns page-level title/meta/body, not targeted content; use Extract with a CSS selector for that instead.',
  options: ['parse', 'extract', 'toText'],
};

const htmlField: FieldDoc = {
  name: 'HTML Content',
  internalKey: 'html',
  type: 'string',
  required: true,
  description: 'The HTML document or fragment this node reads. Used by all three operations.',
  helpText:
    'What this field is: The raw HTML text this node parses using Cheerio (a jQuery-like HTML parser).\n' +
    'Why it matters: Without HTML content, none of the three operations have anything to work with.\n' +
    'When to fill it: Always — it is required for every operation.\n' +
    'What to enter: A full HTML document, an HTML fragment, or an expression that resolves to one.\n' +
    'Where the value comes from: Typically {{$json.html}} or {{$json.pageContent}} from a previous HTTP Request or file-download step.\n' +
    'How to use it later: Not echoed back in the output — only the parsed/extracted/converted result is returned.\n' +
    'Accepted format: Any HTML text, well-formed or not — Cheerio is lenient and does its best with malformed markup rather than rejecting it outright.\n' +
    'Real workplace example: {{$json.pageContent}} from an HTTP Request step that fetched a webpage is passed here to extract or analyze its content.\n' +
    'If it is empty or wrong: An empty value (after also checking the legacy content config key as a fallback) fails immediately with "HTML: html (or content) field is required" before any parsing is attempted.\n' +
    'Common mistake: Passing a URL instead of the actual HTML content — this field expects the page\'s HTML text itself; fetch it first with an HTTP Request node, then pass its response body here.',
  placeholder: '<html>...</html>',
};

const selectorField: FieldDoc = {
  name: 'CSS Selector/Tag',
  internalKey: 'selector',
  type: 'string',
  required: false,
  description: 'A CSS selector identifying which elements to pull text from — required for Extract, ignored by Parse and To Text.',
  helpText:
    'What this field is: A standard CSS selector used to find one or more matching elements in the HTML.\n' +
    'Why it matters: It is what turns a whole HTML document into just the specific piece of text you actually want.\n' +
    'When to fill it: Required for Extract. Not used at all by Parse or To Text.\n' +
    'What to enter: Any valid CSS selector — a class (.price), an ID (#main-title), a tag (h1), an attribute selector (a[href]), or a nested path (div.product span.price).\n' +
    'Where the value comes from: Inspect the source page\'s HTML (browser DevTools "Inspect Element") to find the right class, ID, or tag to target.\n' +
    'How to use it later: Every matching element\'s trimmed text goes into {{$json.results}}, an array; {{$json.count}} tells you how many were found.\n' +
    'Accepted format: Standard CSS selector syntax, exactly as you would use in a browser\'s querySelectorAll.\n' +
    'Real workplace example: .price on a product listing page returns the text of every element with class "price" on that page, such as ["$42.00", "$35.99"].\n' +
    'If it is empty or wrong: An empty value fails immediately with "HTML extract: selector field is required". A syntactically valid selector that matches nothing does NOT error — it silently returns {results: [], count: 0, success: true}.\n' +
    'Common mistake: Assuming zero matches means something went wrong and will show up as an error — it will not; always check {{$json.count}} to confirm real matches were found rather than trusting the absence of an error.',
  placeholder: '.price',
};

const parseOperation: OperationDoc = {
  name: 'Parse',
  value: 'parse',
  description: 'Extracts the page title, every meta tag, and the raw body HTML from an HTML document. Useful for reading page metadata without targeting specific content.',
  fields: [operationField, htmlField],
  outputExample: { title: 'Example Domain', meta: { description: 'Example page', keywords: 'example, domain' }, body: '<h1>Example Domain</h1><p>This domain is for use in illustrative examples.</p>', success: true },
  outputDescription: 'title: the text content of the <title> tag, an empty string if none exists. meta: an object keyed by each meta tag\'s name or property attribute (whichever is present), with its content attribute as the value — tags with neither attribute are skipped entirely. body: the raw inner HTML of the <body> tag as a string (not plain text — tags are preserved), an empty string if there is no body tag. success: always true on this path; failures return _error instead with no success key.',
  usageExample: {
    scenario: 'Read the page title and SEO meta tags from a fetched webpage for content analysis',
    inputValues: { operation: 'parse', html: '{{$json.pageContent}}' },
    expectedOutput: 'Returns the page title in {{$json.title}} and meta tags in {{$json.meta}}; {{$json.meta.description}} can be checked directly for SEO review.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

const extractOperation: OperationDoc = {
  name: 'Extract',
  value: 'extract',
  description: 'Finds every element matching a CSS selector and returns each one\'s trimmed text content as an array. The most common operation for scraping a specific piece of data off a page.',
  fields: [operationField, htmlField, selectorField],
  outputExample: { results: ['$42.00', '$35.99', '$50.00'], count: 3, success: true },
  outputDescription: 'results: an array of trimmed text strings, one per matching element, in document order. An empty array (not an error) means the selector matched nothing. count: how many elements matched — always equal to results.length. success: always true on this path; failures return _error instead with no success key.',
  usageExample: {
    scenario: 'Scrape every product price from a fetched e-commerce category page',
    inputValues: { operation: 'extract', html: '{{$json.pageContent}}', selector: '.price' },
    expectedOutput: 'Returns every matching price in {{$json.results}}; {{$json.count}} confirms how many were found before further processing.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

const toTextOperation: OperationDoc = {
  name: 'To Text',
  value: 'toText',
  description: 'Strips every HTML tag from the document\'s body and returns the remaining plain text, trimmed of leading/trailing whitespace. Useful for preparing web content for AI models or plain-text analysis.',
  fields: [operationField, htmlField],
  outputExample: { text: 'Example Domain This domain is for use in illustrative examples in documents.', success: true },
  outputDescription: 'text: the plain text extracted from the <body> tag only (content outside <body>, like <head> text, is not included), with all tags removed and Cheerio\'s default whitespace handling applied. success: always true on this path; failures return _error instead with no success key.',
  usageExample: {
    scenario: 'Convert a fetched web page into plain text before sending it to an AI model for summarization',
    inputValues: { operation: 'toText', html: '{{$json.pageContent}}' },
    expectedOutput: 'Returns readable plain text in {{$json.text}}, ready to pass directly into an AI Chat Model node\'s prompt.',
  },
  externalDocsUrl: 'https://docs.ctrlchecks.com',
};

export const htmlDoc: NodeDoc = {
  slug: 'html',
  displayName: 'HTML',
  category: 'Data',
  logoUrl: '/icons/nodes/html.svg',
  description: 'Parse HTML page metadata, extract text using a CSS selector, or convert HTML body content to plain text, using the Cheerio parser. A selector matching zero elements is not an error — it returns an empty results array.',
  credentialType: 'None',
  credentialSetupSteps: [
    'This node has no third-party account or cloud credential and does not use credentials at all — it only processes HTML text already present in the workflow.',
    'No connection setup is required. Place this node after any step that fetches HTML, such as HTTP Request or a Google Drive file download.',
    'Connect the HTML output to a logging, If/Else, or follow-up node when later steps should inspect {{$json.results}} or {{$json.text}}. Downstream service node account connection setup is still required for nodes after HTML; this node itself has nothing to authorize.',
  ],
  credentialDocsUrl: 'https://docs.ctrlchecks.com',
  resources: [
    {
      name: 'Operations',
      description: 'HTML supports 3 operations, all built on the lenient Cheerio parser: Parse for page-level metadata, Extract for targeted CSS-selector scraping, and To Text for converting a page to plain text. A CSS selector that matches nothing is never treated as an error on Extract — always check the count field.',
      operations: [parseOperation, extractOperation, toTextOperation],
    },
  ],
  commonErrors: [
    {
      error: 'HTML: html (or content) field is required',
      cause: 'HTML Content was left empty (and the legacy content config key was also empty).',
      fix: 'Provide HTML text directly, or map it from a previous step\'s output such as {{$json.pageContent}} after an HTTP Request.',
    },
    {
      error: 'HTML extract: selector field is required',
      cause: 'Operation was set to Extract but CSS Selector/Tag was left empty.',
      fix: 'Set CSS Selector/Tag to a valid CSS selector such as .price, h1, or a[href].',
    },
    {
      error: 'Extract silently returns {results: [], count: 0, success: true} when the selector matches nothing (no error is raised)',
      cause: 'The CSS Selector/Tag value is syntactically valid but does not match any element in the provided HTML — a typo in a class/ID name or targeting the wrong page structure are the most common causes.',
      fix: 'Verify the selector against the real HTML structure using browser DevTools, and check {{$json.count}} rather than assuming a match happened because no error appeared.',
    },
    {
      error: 'HTML: unsupported operation "<value>". Supported: parse, extract, toText',
      cause: 'The Operation field held a value outside the three supported ones — only reachable via hand-edited workflow JSON, since the visual dropdown only offers valid values.',
      fix: 'Select Parse, Extract, or To Text from the Operation dropdown.',
    },
    {
      error: 'HTML error: <message>',
      cause: 'An unexpected error occurred while loading or querying the HTML with Cheerio — rare in practice, since Cheerio is deliberately lenient with malformed markup rather than throwing on it.',
      fix: 'Check the <message> text for specifics; if the HTML is extremely large or unusual, try isolating a smaller fragment to confirm whether the content itself is the cause.',
    },
  ],
  relatedNodes: ['http_request', 'google_drive', 'javascript', 'text_formatter', 'ai_chat_model', 'json_parser'],
};
