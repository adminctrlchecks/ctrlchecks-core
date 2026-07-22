import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const docsUrl = 'https://firebase.google.com/docs/admin/setup';

function rich(label: string, meaning: string, enter: string, wrong: string, later: string, source = 'Copy it from Firebase Console service account settings, Realtime Database settings, or map a workflow value such as {{$json.documentId}}.'): string {
  return (
    `What this field is: ${label} - ${meaning}\n` +
    `Why it matters: Firebase Admin SDK uses these values to authenticate, choose Firestore versus Realtime Database behavior, and select the document or path that will be read or changed.\n` +
    `When to fill it: Fill credential fields for every operation, then fill collection/path, documentId, data, filter, limit, or databaseUrl when the selected operation needs them.\n` +
    `What to enter: ${enter}\n` +
    `Where the value comes from: ${source}\n` +
    `How to use it later: ${later}\n` +
    `Accepted format: Operation is get, add, update, delete, query, realtime_get, or realtime_set. Data/filter are JSON objects, privateKey may contain escaped \\n line breaks, and databaseUrl starts with https://.\n` +
    `Real workplace example: A mobile app workflow maps {{$json.userId}} into Document ID, reads a Firestore profile, then sends {{$json.email}} or {{$json.data}} to a support step.\n` +
    `If it is empty or wrong: ${wrong}\n` +
    `Common mistake: Pasting a Firebase web API key. This node uses Firebase Admin service account credentials, not client-side Firebase config.`
  );
}

const fields: FieldDoc[] = [
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Firebase operation to run.', options: ['get', 'add', 'update', 'delete', 'query', 'realtime_get', 'realtime_set', 'Get Document', 'Add Document', 'Update Document', 'Delete Document', 'Query Collection', 'Realtime Get', 'Realtime Set'], defaultValue: 'get', helpText: rich('Operation', 'the Firestore or Realtime Database action.', 'Choose get, add, update, delete, query, realtime_get, or realtime_set. Display labels Get Document, Add Document, Update Document, Delete Document, Query Collection, Realtime Get, and Realtime Set are normalized to the same runtime values.', 'Blank or unsupported values return Invalid operation: <value>.', 'Use outputs such as {{$json.documentId}}, {{$json.deleted}}, {{$json.count}}, {{$json.data}}, or flattened document fields after the node runs.') },
  { name: 'Project ID', internalKey: 'projectId', type: 'string', required: true, description: 'Firebase project ID from the service account.', placeholder: 'my-firebase-project', helpText: rich('Project ID', 'the Firebase project to authenticate against.', 'Enter the project_id value from your service account JSON.', 'Blank returns projectId is required. Wrong IDs can cause Admin SDK credential errors.', 'This is setup-only; downstream nodes use data returned from Firestore or Realtime Database.') },
  { name: 'Client Email', internalKey: 'clientEmail', type: 'email', required: true, description: 'Service account client email.', placeholder: 'firebase-adminsdk-abc@project.iam.gserviceaccount.com', helpText: rich('Client Email', 'the service account identity used by Firebase Admin SDK.', 'Enter client_email from the downloaded service account JSON.', 'Blank returns clientEmail is required. Wrong emails usually fail Admin SDK authentication.', 'Do not map this later; use {{$json.data}} or returned document fields instead.') },
  { name: 'Private Key', internalKey: 'privateKey', type: 'textarea', required: true, description: 'Service account private key.', placeholder: '-----BEGIN PRIVATE KEY-----\\n...', helpText: rich('Private Key', 'the private key paired with Client Email.', 'Paste private_key from the service account JSON, preserving either real newlines or escaped \\n sequences.', 'Blank returns privateKey is required. Malformed keys return a Firebase Admin SDK error.', 'Never emit this to downstream nodes or logs; it should live in Connections/credential vault when possible.') },
  { name: 'Collection', internalKey: 'collection', type: 'string', required: false, description: 'Firestore collection name, or Realtime Database path for realtime operations.', placeholder: 'users', helpText: rich('Collection', 'the Firestore collection or Realtime Database path.', 'Enter users for Firestore, or /presence/user123 for Realtime Database paths.', 'Most operations without it return collection is required.', 'Query/get/add/update outputs can be read via {{$json.data}}, {{$json.count}}, or flattened document fields.') },
  { name: 'Document ID', internalKey: 'documentId', type: 'string', required: false, description: 'Firestore document ID for get/update/delete.', placeholder: 'user_123', helpText: rich('Document ID', 'the document inside the selected Firestore collection.', 'Enter a document ID copied from Firestore or map {{$json.documentId}} from an earlier Firebase Add result.', 'Get/update/delete without it return documentId is required.', 'Successful get/update/delete include {{$json.documentId}}; add returns a newly generated ID.') },
  { name: 'Data', internalKey: 'data', type: 'json', required: false, description: 'JSON payload for add, update, and realtime_set.', placeholder: '{"name":"Alice","status":"active"}', helpText: rich('Data', 'the object/string/value written to Firestore or Realtime Database.', 'Enter a JSON object for Firestore add/update, or any JSON value for realtime_set.', 'Add/update require truthy data; realtime_set rejects null or undefined with data is required. Invalid JSON strings are treated as plain strings by parseData.', 'Firestore add/update returns the saved data; object data may be flattened into top-level output by the legacy wrapper.') },
  { name: 'Filter', internalKey: 'filter', type: 'json', required: false, description: 'Simple equality filter object for query.', placeholder: '{"status":"active"}', helpText: rich('Filter', 'simple field/value conditions for Firestore query.', 'Enter {"status":"active"} to apply where("status", "==", "active"). Multiple keys are ANDed together.', 'Invalid JSON strings are treated as plain strings, so no object filters are applied. Unsupported operators are not implemented; every object key becomes equality.', 'Query returns {{$json.data}} as an array and {{$json.count}} as the number of documents.') },
  { name: 'Limit', internalKey: 'limit', type: 'number', required: false, description: 'Maximum documents for query. Defaults to 100.', placeholder: '100', helpText: rich('Limit', 'the maximum number of Firestore documents returned by query.', 'Enter a number such as 25 or 100.', 'Blank defaults to 100. Very high numbers may create large payloads; zero/false means no limit call is applied.', 'Use {{$json.count}} to see how many documents were returned.') },
  { name: 'Database URL', internalKey: 'databaseUrl', type: 'url', required: false, description: 'Realtime Database URL required for realtime_get and realtime_set.', placeholder: 'https://my-project-default-rtdb.firebaseio.com', helpText: rich('Database URL', 'the Firebase Realtime Database endpoint.', 'Enter the Realtime Database URL from Firebase Console when using realtime_get or realtime_set.', 'Realtime operations without it return databaseUrl is required. Firestore operations do not need it.', 'Realtime get returns the value in {{$json.data}}; realtime set returns {{$json.path}}.') },
];

function op(name: string, value: string, description: string, outputExample: Record<string, unknown>, outputDescription: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description: `${description} This entry reflects the worker runtime and the legacy database-node wrapper output shape.`,
    fields,
    outputExample,
    outputDescription,
    usageExample: {
      scenario: `${name} in a Firebase-backed mobile or web app workflow`,
      inputValues: { operation: value, projectId: 'my-firebase-project', clientEmail: 'firebase-adminsdk-abc@my-firebase-project.iam.gserviceaccount.com', privateKey: '{{$credentials.firebase.privateKey}}', collection: 'users', ...inputValues },
      expectedOutput: 'The next node can use {{$json.documentId}}, {{$json.data}}, {{$json.count}}, {{$json.deleted}}, {{$json.path}}, or flattened document fields depending on the operation.',
    },
    externalDocsUrl: docsUrl,
  };
}

export const firebaseDoc: NodeDoc = {
  slug: 'firebase',
  displayName: 'Firebase',
  category: 'Database',
  logoUrl: '/icons/nodes/firebase.svg',
  description: 'Run Firebase Admin SDK operations for Firestore documents/collections and Firebase Realtime Database paths. The legacy wrapper flattens object data into top-level output on some successful operations.',
  credentialType: 'Firebase Credential',
  credentialSetupSteps: [
    'Create a Firebase service account in Firebase Console -> Project Settings -> Service accounts, then generate a private key JSON file.',
    'Store projectId, clientEmail, and privateKey in CtrlChecks Connections/credential vault where possible instead of normal workflow fields.',
    'Grant the service account only the Firestore/Realtime Database permissions this workflow needs.',
    'For realtime_get or realtime_set, also copy the Realtime Database URL from Firebase Console.',
    'After this node runs, connect its output to the next app, notification, CRM, or reporting step. Each downstream service node account connection is configured separately.',
  ],
  credentialDocsUrl: docsUrl,
  resources: [{ name: 'Firestore and Realtime Database', description: 'Firebase Admin SDK operations. A unique app instance is initialized and deleted for each execution.', operations: [
    op('Get Document', 'get', 'Reads one Firestore document by collection and documentId. Missing documents return success true with data:null before the wrapper leaves data:null in the output.', { documentId: 'user_123', email: 'buyer@example.com', status: 'active' }, 'For existing object documents, document fields may be flattened to top level with documentId. Missing documents return data:null and documentId. _error appears when validation/authentication fails.', { documentId: '{{$json.userId}}' }),
    op('Add Document', 'add', 'Adds a new Firestore document with an auto-generated ID and returns that ID plus the data that was written.', { documentId: 'newDocId123', email: 'buyer@example.com', status: 'active' }, 'documentId: generated Firestore document ID. Written object fields may be flattened to top level by the wrapper. _error appears when validation/authentication fails.', { data: '{"email":"{{$json.email}}","status":"active"}' }),
    op('Update Document', 'update', 'Merge-updates one Firestore document by collection and documentId using docRef.set(data, {merge:true}).', { documentId: 'user_123', status: 'active' }, 'documentId: updated Firestore document ID. Updated object fields may be flattened to top level. _error appears when validation/authentication fails.', { documentId: '{{$json.userId}}', data: '{"status":"active"}' }),
    op('Delete Document', 'delete', 'Deletes one Firestore document by collection and documentId. Firestore delete succeeds even if the document was already absent.', { documentId: 'user_123', deleted: true }, 'documentId: deleted document ID. deleted:true confirms the delete call completed. _error appears when validation/authentication fails.', { documentId: '{{$json.userId}}' }),
    op('Query Collection', 'query', 'Queries one Firestore collection with simple equality filters for each key and an optional limit.', { data: [{ id: 'user_123', email: 'buyer@example.com', status: 'active' }], count: 1 }, 'data: Array of documents with id plus fields. count: number returned. _error appears when validation/authentication fails.', { filter: '{"status":"active"}', limit: '100' }),
    op('Realtime Get', 'realtime_get', 'Reads a Firebase Realtime Database value from the Collection field, which is used as a path for realtime operations.', { data: { online: true, lastSeen: '2026-07-19T09:00:00.000Z' } }, 'data: snapshot.val() from the Realtime Database path. _error appears when databaseUrl, collection/path, or authentication fails.', { collection: '/presence/{{$json.userId}}', databaseUrl: 'https://my-project-default-rtdb.firebaseio.com' }),
    op('Realtime Set', 'realtime_set', 'Writes Data to a Firebase Realtime Database path from the Collection field and returns the path written.', { path: '/presence/user_123' }, 'path: Realtime Database path that was written. _error appears when databaseUrl, collection/path, data, or authentication fails.', { collection: '/presence/{{$json.userId}}', data: '{"online":true}', databaseUrl: 'https://my-project-default-rtdb.firebaseio.com' }),
  ] }],
  commonErrors: [
    { error: 'projectId is required', cause: 'Project ID was blank before Firebase Admin initialization.', fix: 'Copy project_id from the service account JSON or saved Firebase credential.' },
    { error: 'clientEmail is required', cause: 'Client Email was blank.', fix: 'Copy client_email from the service account JSON.' },
    { error: 'privateKey is required', cause: 'Private Key was blank.', fix: 'Store private_key in the Firebase credential and preserve newline formatting.' },
    { error: 'Invalid operation: <value>', cause: 'Operation was not one of get, add, update, delete, query, realtime_get, or realtime_set after label normalization.', fix: 'Choose a supported operation value from the dropdown.' },
    { error: 'collection/documentId/data/databaseUrl is required', cause: 'The selected operation is missing one of its required fields.', fix: 'Fill Collection for all operations, Document ID for get/update/delete, Data for add/update/realtime_set, and Database URL for realtime operations.' },
    { error: '<Firebase Admin SDK error> / _error', cause: 'Credential formatting, permissions, database URL, or Firebase service availability failed.', fix: 'Read {{$json._error}}, verify the service account JSON, and test the same collection/path in Firebase Console.' },
  ],
  relatedNodes: ['supabase', 'google_cloud_storage', 'mongodb'],
};
