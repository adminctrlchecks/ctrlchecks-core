import type { FieldDoc, NodeDoc } from '../types';

const h = (field: string, why: string, when: string, enter: string, source: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map input with {{$json.fieldName}} and use this node output later as {{$json.matches}}, {{$json.matches[0].payload}}, or {{$json.upsertedCount}}.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake: ${mistake}`;

const fields: FieldDoc[] = [
  {
    name: 'Operation',
    internalKey: 'operation',
    type: 'select',
    required: true,
    description: 'Choose query, upsert, or delete.',
    options: ['query', 'upsert', 'delete'],
    helpText: h('The Qdrant vector action to run.', 'It decides whether the node searches for similar points, stores a point, or deletes a point by ID.', 'Choose it before filling operation-specific fields.', 'Use query for similarity search, upsert to store/update a point, and delete to remove a point.', 'Choose from the dropdown based on your retrieval or indexing workflow.', 'query, upsert, or delete. The UI label Query/Search maps to runtime value query.', 'query to find support articles similar to a ticket description.', 'Unsupported values return Unsupported operation and no Qdrant write/search happens.', 'Do not use the old search/get_collection values in saved JSON; the runtime accepts query/upsert/delete.'),
    defaultValue: 'query',
  },
  {
    name: 'Qdrant URL',
    internalKey: 'url',
    type: 'url',
    required: true,
    description: 'Qdrant cluster or self-hosted endpoint.',
    helpText: h('The base URL for your Qdrant API.', 'The runtime calls /collections/{collection} under this URL.', 'Required for every operation.', 'Enter a full URL such as https://xyz.us-east-1-0.aws.cloud.qdrant.io or http://localhost:6333.', 'Copy it from Qdrant Cloud cluster overview or your self-hosted deployment. You can map {{$json.qdrantUrl}} for tenant-specific routing.', 'HTTP or HTTPS URL without a trailing slash.', 'https://support-search.us-east.aws.cloud.qdrant.io', 'The run returns Qdrant url is required or network/API errors.', 'Do not paste the Qdrant console page URL; use the API endpoint.'),
    placeholder: 'https://xyz.us-east-1-0.aws.cloud.qdrant.io',
    example: 'https://support-search.us-east.aws.cloud.qdrant.io',
  },
  {
    name: 'Collection Name',
    internalKey: 'collection',
    type: 'string',
    required: true,
    description: 'Qdrant collection to operate on.',
    helpText: h('The Qdrant collection containing vector points.', 'Every query, upsert, or delete request is scoped to one collection.', 'Required for every operation.', 'Enter the exact collection name.', 'Find it in Qdrant dashboard or your indexing code. You can map {{$json.collection}} for multi-tenant workflows.', 'Plain collection name.', 'support_articles for a help-center RAG index.', 'The run returns Qdrant collection is required or Qdrant API errors.', 'Do not confuse collection name with point ID or tenant namespace.'),
    placeholder: 'support_articles',
    example: 'support_articles',
  },
  {
    name: 'API Key',
    internalKey: 'apiKey',
    type: 'password',
    required: false,
    description: 'Qdrant Cloud API key.',
    helpText: h('The secret key sent as the api-key header.', 'Qdrant Cloud usually requires it; self-hosted instances may not.', 'Fill it for Qdrant Cloud or authenticated self-hosted clusters. Leave blank only for trusted self-hosted deployments without auth.', 'Use a key that can read/write the target collection.', 'Create it in Qdrant Cloud -> cluster/API keys, then store it in Connections when possible. Avoid mapping secrets from normal workflow payloads.', 'Secret text.', 'A saved Qdrant API Key credential for the support-search cluster.', 'Qdrant returns 401/403 errors when missing or invalid.', 'Do not paste API keys into ordinary input data or logs.'),
    placeholder: 'Use Connections when possible',
    notes: 'Store Qdrant API keys in Connections or a credential vault whenever possible.',
  },
  {
    name: 'Vector',
    internalKey: 'vector',
    type: 'json',
    required: true,
    description: 'Embedding vector for query or upsert.',
    helpText: h('A numeric embedding array.', 'Query searches by similarity; upsert stores it as the point vector. Upsert can create a missing collection using this length.', 'Required for query and upsert. Not used by delete.', 'Enter an array of numbers, usually mapped from an embedding model output.', 'Use output from OpenAI, Cohere, or another embedding step, such as {{$json.embedding}}.', 'JSON array of numbers matching the collection vector size.', '[0.012, -0.044, 0.381]', 'Qdrant returns API errors when the vector is missing or wrong length.', 'Do not send the source text; send the embedding array.'),
    placeholder: '[0.1, 0.2, 0.3]',
    example: '[0.012, -0.044, 0.381]',
  },
  {
    name: 'Limit',
    internalKey: 'limit',
    type: 'number',
    required: false,
    description: 'Maximum query matches.',
    helpText: h('The maximum number of similar points returned by query.', 'It controls result size and how much context downstream AI steps receive.', 'Use it for query.', 'Enter a small number such as 3, 5, or 10.', 'Choose it based on prompt/context budget or ranking needs. You can map {{$json.limit}}.', 'Number. Runtime defaults to 5.', '5 matches for a customer-support answer.', 'Too high may return noisy or large results; invalid values can cause API errors.', 'Do not return more matches than the next step can actually use.'),
    placeholder: '5',
    defaultValue: '5',
    example: '5',
  },
  {
    name: 'Include Payload',
    internalKey: 'withPayload',
    type: 'boolean',
    required: false,
    description: 'Return payload metadata with query matches.',
    helpText: h('Whether Qdrant returns stored payload objects with query matches.', 'Payload usually contains document IDs, titles, URLs, tenant IDs, or labels needed by the next step.', 'Use it for query. It defaults to true unless explicitly false.', 'Set true for normal RAG/search workflows; false only when scores and IDs are enough.', 'Choose from what the downstream step needs. You can map {{$json.withPayload}}.', 'Boolean true or false.', 'true to return help article titles and URLs with matches.', 'If false, later steps may not know which document a match represents.', 'Do not disable payload when the answer step needs source citations or IDs.'),
    defaultValue: 'true',
    example: 'true',
  },
  {
    name: 'Point ID',
    internalKey: 'id',
    type: 'string',
    required: true,
    description: 'Qdrant point ID for upsert or delete.',
    helpText: h('The unique identifier of one Qdrant point.', 'Upsert stores/replaces this point, and delete removes this point.', 'Required for upsert and delete. The runtime falls back to 1 for upsert if omitted, which can overwrite data, so always set it.', 'Enter a numeric string or UUID-style ID from your indexing design.', 'Build it from source document IDs, row IDs, ticket IDs, or previous indexing outputs such as {{$json.pointId}}.', 'Numeric string or UUID/string ID.', 'kb-returns-policy-0003 for one article chunk.', 'Delete may remove nothing, and upsert without a stable ID can overwrite point 1.', 'Do not leave ID blank during upsert.'),
    placeholder: 'kb-returns-policy-0003',
    example: 'kb-returns-policy-0003',
  },
  {
    name: 'Payload',
    internalKey: 'payload',
    type: 'json',
    required: false,
    description: 'Metadata saved with an upserted point.',
    helpText: h('A JSON object stored with the vector point.', 'Payload makes query matches useful by carrying source IDs, titles, categories, or tenant data.', 'Use it for upsert.', 'Enter an object such as {"docId":"RETURNS-01","title":"Returns Policy"}.', 'Map it from the source document, ticket, product, or file that produced the embedding.', 'JSON object.', '{"docId":"RETURNS-01","title":"Returns Policy","source":"help-center"}', 'Bad JSON or incompatible payload values can cause Qdrant API errors; missing payload makes matches harder to use.', 'Do not store unnecessary confidential content as payload.'),
    placeholder: '{"docId":"RETURNS-01","title":"Returns Policy"}',
    example: '{"docId":"RETURNS-01","title":"Returns Policy"}',
  },
];

const op = (name: string, value: string, description: string, inputValues: Record<string, string>, outputExample: Record<string, unknown>, outputDescription: string) => ({
  name,
  value,
  description,
  fields,
  outputExample,
  outputDescription,
  usageExample: {
    scenario: `${name} vectors in Qdrant as part of a semantic search, indexing, or cleanup workflow after an embedding step runs.`,
    inputValues: { operation: value, url: 'https://support-search.us-east.aws.cloud.qdrant.io', collection: 'support_articles', apiKey: 'Use saved Qdrant connection', ...inputValues },
    expectedOutput: `Use Qdrant output later as {{$json.matches}} for search results or {{$json.upsertedCount}} for indexing confirmation.`,
  },
  externalDocsUrl: 'https://qdrant.tech/documentation/',
});

export const qdrantDoc: NodeDoc = {
  slug: 'qdrant',
  displayName: 'Qdrant',
  category: 'Data',
  logoUrl: '/icons/nodes/qdrant.svg',
  description: 'Search, store, and delete vectors in Qdrant collections for semantic search, retrieval-augmented generation, recommendation, and AI memory workflows.',
  credentialType: 'Qdrant API Key',
  credentialSetupSteps: [
    'Create a Qdrant Cloud cluster or confirm your self-hosted Qdrant endpoint is reachable from the worker.',
    'Create an API key for Qdrant Cloud and store the key plus cluster URL in CtrlChecks Connections or a credential vault whenever possible.',
    'Create the collection ahead of time when possible. The current runtime can auto-create a collection during upsert when a vector is supplied, using Cosine distance and vector length.',
    'Test Query with a known embedding and small Limit before passing matches to an AI answer step.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for OpenAI, Slack, email, CRM, or storage nodes.',
  ],
  credentialDocsUrl: 'https://qdrant.tech/documentation/cloud/authentication/',
  resources: [
    {
      name: 'Operations',
      description: 'Qdrant calls the REST API directly. Query returns matches from data.result, upsert returns upsertedCount 1, and delete returns success with no matches.',
      operations: [
        op('Query/Search', 'query', 'Searches a collection for vectors similar to the provided embedding and optionally returns payload metadata. This replaces the old UI value search with the runtime value query.', { vector: '{{$json.embedding}}', limit: '5', withPayload: 'true' }, { success: true, operation: 'query', matches: [{ id: 'kb-returns-policy-0003', score: 0.91, payload: { title: 'Returns Policy' } }], upsertedCount: 0 }, 'success: true when Qdrant accepts the query. operation echoes query. matches contains Qdrant result points. upsertedCount is 0 for query. error appears on API/runtime failure.'),
        op('Upsert', 'upsert', 'Stores or replaces one Qdrant point with Vector and Payload. If the collection is missing and Vector is valid, the current runtime attempts to create it with Cosine distance.', { id: 'kb-returns-policy-0003', vector: '{{$json.embedding}}', payload: '{"title":"Returns Policy","docId":"RETURNS-01"}' }, { success: true, operation: 'upsert', matches: [], upsertedCount: 1 }, 'success: true when Qdrant accepts the upsert. operation echoes upsert. matches is empty. upsertedCount is 1 in the current runtime. error appears on API/runtime failure.'),
        op('Delete', 'delete', 'Deletes one Qdrant point by Point ID from the selected collection. Use it when a source record is removed, retracted, or reindexed under a different ID.', { id: 'kb-returns-policy-0003' }, { success: true, operation: 'delete', matches: [], upsertedCount: 0 }, 'success: true when Qdrant accepts the delete. operation echoes delete. matches is empty. upsertedCount is 0. error appears on API/runtime failure.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'Qdrant url is required', cause: 'URL was empty after trimming.', fix: 'Fill Qdrant URL from the cluster endpoint or saved connection.' },
    { error: 'Qdrant collection is required', cause: 'Collection Name was empty.', fix: 'Fill the collection name exactly as it appears in Qdrant.' },
    { error: 'Unsupported operation: <operation>', cause: 'The operation was not query, upsert, or delete.', fix: 'Use the updated UI values; Query/Search maps to query.' },
    { error: 'Qdrant API error 400: <details>', cause: 'Vector, point ID, payload, or collection shape was invalid.', fix: 'Confirm vector length, collection settings, and JSON payload.' },
    { error: 'Qdrant error', cause: 'Network, JSON, auth, or unexpected runtime failure occurred.', fix: 'Check URL, API key, collection, vector JSON, and service availability.' },
  ],
  relatedNodes: ['pinecone', 'openai_gpt', 'cohere', 'langchain'],
};
