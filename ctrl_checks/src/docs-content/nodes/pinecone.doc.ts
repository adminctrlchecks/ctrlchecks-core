import type { FieldDoc, NodeDoc } from '../types';

const h = (field: string, why: string, when: string, enter: string, source: string, format: string, example: string, wrong: string, mistake: string) => `What this field is: ${field}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Map input with {{$json.fieldName}} and use this node output later as {{$json.matches}}, {{$json.matches[0].metadata}}, or {{$json.upsertedCount}}.
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
    helpText: h('The Pinecone vector action to run.', 'It decides whether the node searches for similar vectors, stores a vector, or deletes a vector by ID.', 'Choose it before filling the other fields.', 'Use query for semantic search, upsert to store or update one vector, and delete to remove one vector ID.', 'Choose from the dropdown based on your AI/search workflow.', 'query, upsert, or delete.', 'query to find FAQ chunks similar to a customer question.', 'Unsupported values return Unsupported operation and no Pinecone call is made.', 'Do not use upsert/delete when you only need search results.'),
    defaultValue: 'query',
  },
  {
    name: 'Index',
    internalKey: 'index',
    type: 'string',
    required: true,
    description: 'Pinecone index name or full host URL.',
    helpText: h('The Pinecone index endpoint to operate on.', 'The runtime builds the request URL from this value.', 'Required for every operation.', 'For serverless indexes, paste the full host URL. For older pod/control-plane usage, enter the index name.', 'Find the host URL in the Pinecone console under the index details. You can map {{$json.pineconeHost}} for tenant-specific routing.', 'Index host URL beginning with https://, or an index name for the legacy controller path.', 'https://support-kb-abcd123.svc.us-east-1-aws.pinecone.io', 'Pinecone returns an API error or the runtime calls the wrong controller URL.', 'Do not paste the project URL or dashboard URL; use the index host URL.'),
    placeholder: 'https://my-index-abc123.svc.pinecone.io',
    example: 'https://support-kb-abcd123.svc.us-east-1-aws.pinecone.io',
  },
  {
    name: 'API Key',
    internalKey: 'apiKey',
    type: 'password',
    required: true,
    description: 'Pinecone API key used as the Api-Key header.',
    helpText: h('The secret key that authorizes Pinecone API calls.', 'Pinecone rejects unauthenticated query/upsert/delete requests.', 'Required unless a saved Pinecone credential injects it.', 'Use a Pinecone API key that can access the target index.', 'Create or copy it from Pinecone console -> API Keys, then store it in Connections when possible. Avoid mapping secrets from normal workflow payloads.', 'Secret text; in HTTP it is sent as the Api-Key header.', 'A saved Pinecone API Key credential for the production support index.', 'Pinecone returns 401/403 API errors.', 'Do not paste API keys into ordinary input data or logs.'),
    placeholder: 'Use Connections when possible',
    notes: 'Store Pinecone API keys in Connections or a credential vault whenever possible.',
  },
  {
    name: 'Vector',
    internalKey: 'vector',
    type: 'json',
    required: true,
    description: 'Embedding values for query or upsert.',
    helpText: h('A numeric embedding array.', 'Query compares it to stored vectors; upsert stores it as the vector values.', 'Required for query and upsert. Not used by delete.', 'Enter an array of numbers, usually mapped from an embedding model output.', 'Use an OpenAI, Cohere, or other embedding step output such as {{$json.embedding}}.', 'JSON array of numbers with the same dimensionality as the Pinecone index.', '[0.012, -0.044, 0.381]', 'Pinecone returns a 400 error if the vector is missing or has the wrong dimension.', 'Do not send the original text; send the embedding array generated from the text.'),
    placeholder: '[0.1, 0.2, 0.3]',
    example: '[0.012, -0.044, 0.381]',
  },
  {
    name: 'Top K',
    internalKey: 'topK',
    type: 'number',
    required: false,
    description: 'Number of nearest matches to return for query.',
    helpText: h('The maximum number of similar vectors Pinecone should return.', 'It controls how much context your next AI or ranking step receives.', 'Use it for query only.', 'Enter a small positive number such as 3, 5, or 10.', 'Choose it from the number of source chunks your answer/ranking step can handle. You can map {{$json.topK}}.', 'Number. Runtime defaults to 5.', '5 FAQ chunks for a support answer.', 'Too high can return noisy matches and increase response size; invalid values may cause API errors.', 'Do not set a huge topK when a later LLM prompt has limited context.'),
    placeholder: '5',
    defaultValue: '5',
    example: '5',
  },
  {
    name: 'Vector ID',
    internalKey: 'id',
    type: 'string',
    required: true,
    description: 'Unique vector identifier for upsert or delete.',
    helpText: h('The Pinecone vector ID.', 'Upsert uses it to create/update exactly one vector; delete uses it to remove exactly one vector.', 'Required for upsert and delete. Not used by query.', 'Enter a stable ID such as doc-1048-chunk-03.', 'Generate it from document IDs, ticket IDs, product IDs, or previous indexing steps. You can map {{$json.vectorId}}.', 'Plain string ID.', 'kb-returns-policy-0003 for the third chunk of a policy article.', 'Upsert may overwrite the wrong vector or delete may remove nothing.', 'Do not generate random IDs every run if you intend to update the same document chunk.'),
    placeholder: 'doc-1048-chunk-03',
    example: 'kb-returns-policy-0003',
  },
  {
    name: 'Metadata',
    internalKey: 'metadata',
    type: 'json',
    required: false,
    description: 'Metadata stored with an upserted vector.',
    helpText: h('A JSON object saved alongside the vector.', 'Metadata lets query results tell later steps where the match came from.', 'Use it for upsert; query returns it because includeMetadata is true.', 'Enter an object with source IDs, titles, URLs, categories, or tenant IDs.', 'Map from the document, CRM record, ticket, or file that produced the embedding.', 'JSON object with simple key/value metadata.', '{"source":"help-center","docId":"RETURNS-01","title":"Returns Policy"}', 'Bad JSON fails before/at the API; missing metadata makes matches harder to explain later.', 'Do not store confidential full documents as metadata when only source IDs are needed.'),
    placeholder: '{"source":"help-center","docId":"RETURNS-01"}',
    example: '{"source":"help-center","docId":"RETURNS-01"}',
  },
  {
    name: 'Namespace',
    internalKey: 'namespace',
    type: 'string',
    required: false,
    description: 'Optional Pinecone namespace.',
    helpText: h('A partition inside a Pinecone index.', 'Namespaces isolate vectors by tenant, environment, product, or data source.', 'Use it when one index stores separate groups of vectors.', 'Enter a namespace such as production, tenant_acme, or help_center.', 'Choose it from your indexing design or map {{$json.tenantId}} for multi-tenant workflows.', 'Plain string; leave empty for the default namespace.', 'tenant_acme for one customer knowledge base.', 'Query may search the wrong namespace or delete/upsert in the default namespace.', 'Do not mix production and test data in the same namespace.'),
    placeholder: 'production',
    example: 'tenant_acme',
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
    scenario: `${name} vectors in Pinecone as part of a retrieval, indexing, or cleanup workflow after an embedding or document step runs.`,
    inputValues: { operation: value, index: 'https://support-kb-abcd123.svc.us-east-1-aws.pinecone.io', apiKey: 'Use saved Pinecone connection', ...inputValues },
    expectedOutput: `Use Pinecone output later as {{$json.matches}} for search results or {{$json.upsertedCount}} for indexing confirmation.`,
  },
  externalDocsUrl: 'https://docs.pinecone.io/reference/api/introduction',
});

export const pineconeDoc: NodeDoc = {
  slug: 'pinecone',
  displayName: 'Pinecone',
  category: 'Data',
  logoUrl: '/icons/nodes/pinecone.svg',
  description: 'Store, search, and delete embedding vectors in a Pinecone index for semantic search, RAG, personalization, and AI retrieval workflows.',
  credentialType: 'Pinecone API Key',
  credentialSetupSteps: [
    'Create a Pinecone project and index with the same vector dimension as your embedding model.',
    'In Pinecone console -> API Keys, create an API key that can access the target index, then store it in CtrlChecks Connections or a credential vault.',
    'Use the index host URL from the index details for serverless indexes; it usually starts with https:// and ends with pinecone.io.',
    'Test Query with a known vector and small Top K before using results in an AI answer step.',
    'Connect this node output to the next node with an outgoing line; downstream service node account connection is still required for OpenAI, Slack, email, CRM, or storage nodes.',
  ],
  credentialDocsUrl: 'https://docs.pinecone.io/guides/projects/manage-api-keys',
  resources: [
    {
      name: 'Operations',
      description: 'Pinecone calls the REST API directly. Query returns matches, upsert returns upsertedCount, and delete returns success with no match list.',
      operations: [
        op('Query', 'query', 'Searches the index for the top K vectors most similar to the provided embedding and includes metadata in the returned matches.', { vector: '{{$json.embedding}}', topK: '5', namespace: 'tenant_acme' }, { success: true, operation: 'query', matches: [{ id: 'kb-returns-policy-0003', score: 0.92, metadata: { title: 'Returns Policy' } }], upsertedCount: 0 }, 'success: true when Pinecone accepts the query. operation echoes query. matches contains id, score, and metadata. upsertedCount is 0 for query. error appears on API/runtime failure.'),
        op('Upsert', 'upsert', 'Stores or replaces one vector by Vector ID with optional metadata and namespace. Use it when indexing documents, tickets, product descriptions, or knowledge-base chunks.', { id: 'kb-returns-policy-0003', vector: '{{$json.embedding}}', metadata: '{"title":"Returns Policy","docId":"RETURNS-01"}', namespace: 'tenant_acme' }, { success: true, operation: 'upsert', matches: [], upsertedCount: 1 }, 'success: true when Pinecone accepts the upsert. operation echoes upsert. matches is empty. upsertedCount is Pinecone upsertedCount or 1 fallback. error appears on API/runtime failure.'),
        op('Delete', 'delete', 'Deletes one vector ID from the selected index and optional namespace. Use it when source content is removed or reindexed under a different ID.', { id: 'kb-returns-policy-0003', namespace: 'tenant_acme' }, { success: true, operation: 'delete', matches: [], upsertedCount: 0 }, 'success: true when Pinecone accepts the delete request. operation echoes delete. matches is empty. upsertedCount is 0. error appears on API/runtime failure.'),
      ],
    },
  ],
  commonErrors: [
    { error: 'Unsupported operation: <operation>', cause: 'The operation was not query, upsert, or delete.', fix: 'Choose a supported dropdown operation.' },
    { error: 'Pinecone API error 400: <details>', cause: 'Vector is missing, wrong dimension, or request body is invalid.', fix: 'Confirm the embedding array length matches the index dimension.' },
    { error: 'Pinecone API error 401: <details>', cause: 'The API key is missing or invalid.', fix: 'Reconnect Pinecone or store a valid API key in Connections.' },
    { error: 'Pinecone API error 404: <details>', cause: 'The index host/name is wrong or unavailable.', fix: 'Copy the full index host URL from Pinecone index details.' },
    { error: 'Pinecone error', cause: 'Network, JSON, or unexpected runtime error occurred.', fix: 'Check index URL, API key, vector JSON, and service availability.' },
  ],
  relatedNodes: ['qdrant', 'openai_gpt', 'cohere', 'langchain'],
};
