import type { NodeDoc } from '../types';

const operationHelpText = `What this field means: Operation chooses which Google Docs action this node performs.

Why it matters: It decides which Docs API calls run and which other fields become required.

When to fill it: Choose it first, before filling any other field.

What to enter: Choose read to extract a document's text, write to replace all of a document's content, create to make a brand-new document, or append to add text after the existing content.

Where the value comes from: This is a fixed dropdown choice made while building the workflow.

How to use it later: read returns the extracted text at {{$json.content}}; write/append confirm with {{$json.success}} and echo the content sent; create returns a new {{$json.documentId}}, {{$json.documentUrl}}, and {{$json.title}}.

Accepted format: One of read, write, create, or append from the dropdown.

Real workplace example: Use read to pull a contract's text into an AI review step, write to replace a template with generated content, create to produce a new report document, and append to add a new section to a running log document.

If it is empty or wrong: Runtime defaults to read when missing, and returns "Google Docs node: Unsupported operation" for any other value.

Common mistake: Choosing write when append was intended — write deletes all existing content before inserting the new text, while append only adds to the end.

Dropdown options: read fetches a document's plain text and needs Document ID or Document URL. write replaces the entire document body and needs Document ID/URL plus Content. create makes a new document and needs Document Title, with optional Content to fill it. append inserts text just before the end of the document and needs Document ID/URL plus Content.`;

const documentIdHelpText = `What this field means: Document ID is the unique identifier of the Google Doc this node reads from or writes to.

Why it matters: It tells the Docs API exactly which document to open.

When to fill it: Required for read, write, and append (not used for create, since create makes a brand-new document). This field is only shown in the visual panel when Operation is read — for write/append, use Document URL instead, which works for every operation.

What to enter: The ID segment from the document's browser URL, between /d/ and /edit.

Where the value comes from: Open the target Google Doc and copy it from the address bar: https://docs.google.com/document/d/THIS_PART/edit.

How to use it later: The same ID is echoed back at {{$json.documentId}} after read/write/append.

Accepted format: A Google Docs document ID string, such as 1a2b3c4d5e6f7g8h9i0j.

Real workplace example: Point a weekly report workflow at the same "Status Report" document ID every run so it always updates the same file.

If it is empty or wrong: If both Document ID and Document URL are empty for read/write/append, runtime returns "Google Docs node: Document ID or Document URL is required for the '<operation>' operation". A wrong ID returns a Google Docs API error.

Common mistake: Pasting the full document URL into this field instead of just the ID segment — use Document URL for that instead, this field wants only the ID.`;

const documentUrlHelpText = `What this field means: Document URL is the full Google Docs link, offered as an alternative to typing just the Document ID — and it works for every operation except create.

Why it matters: Runtime automatically extracts the document ID from this URL, so you can paste the link directly from your browser without editing it.

When to fill it: Use it whenever Document ID isn't shown (write, append) or as a convenient alternative to Document ID for read.

What to enter: The full URL exactly as it appears in the browser address bar when viewing the document.

Where the value comes from: Open the target Google Doc and copy the entire URL from the address bar.

How to use it later: Runtime extracts the document ID from this URL and echoes it back at {{$json.documentId}}; the URL itself is not returned for read/write/append (only create returns a fresh {{$json.documentUrl}}).

Accepted format: A full Google Docs URL matching https://docs.google.com/document/d/DOCUMENT_ID/edit (or similar, containing /d/DOCUMENT_ID/).

Real workplace example: https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit pasted directly from the browser tab.

If it is empty or wrong: If both Document URL and Document ID are empty for read/write/append, runtime returns "Google Docs node: Document ID or Document URL is required for the '<operation>' operation". A URL without a recognizable /d/ID/ segment leaves the document ID unresolved, which then fails the same way as if both fields were empty.

Common mistake: Pasting a Google Docs sharing/comment link that doesn't contain the standard /d/DOCUMENT_ID/ path segment — use the plain document edit URL instead.`;

const titleHelpText = `What this field means: Document Title is the name given to a brand-new Google Doc when Operation is create.

Why it matters: Every new Google Doc needs a title; without one, Drive shows a generic placeholder name.

When to fill it: Used only when Operation is create.

What to enter: A clear, descriptive title, optionally including dynamic data.

Where the value comes from: Type it directly, or map one from an earlier step, such as {{$json.reportName}}.

How to use it later: The saved title is echoed back at {{$json.title}} after create.

Accepted format: Plain text.

Real workplace example: "Weekly Report - {{$json.weekEnding}}".

If it is empty or wrong: Runtime defaults to "Untitled Document" when left blank.

Common mistake: Leaving every generated document titled "Untitled Document," making them hard to tell apart later in Drive.`;

const contentHelpText = `What this field means: Content is the text sent to the document — it replaces everything for write, becomes the initial body for create, and is added to the end for append.

Why it matters: It is the actual text that ends up in the Google Doc.

When to fill it: Required for write and append. Optional for create (an empty new document is created if left blank). Not used for read.

What to enter: Plain text content, optionally including mapped values from an earlier step.

Where the value comes from: Type it directly, or map generated text such as {{$json.aiSummary}} or {{$json.reportText}} from an AI Agent or data-processing step.

How to use it later: The same text is echoed back at {{$json.content}} after write/append/create, useful for confirming what was actually sent.

Accepted format: Plain text. Google Docs formatting (bold, headings, etc.) is not applied automatically from markup in this field — it is inserted as literal text.

Real workplace example: "{{$json.aiSummary}}" to write an AI-generated summary into a shared report document.

If it is empty or wrong: Runtime returns "Google Docs node: Content is required for write operation" or "...for append operation" when blank. For create, empty content simply creates a blank document.

Common mistake: Using write when the goal was to keep existing content and only add more — write deletes the entire existing body first; use append to preserve what's already there.`;

const formatHelpText = `What this field means: Output Format is a label on the extracted text for Read, offered as Plain text or Markdown.

Why it matters: Important limitation to know: this field currently only changes the value echoed back at {{$json.format}} — the actual extraction always pulls plain text from the document. Choosing Markdown does not convert headings, bold text, or lists into Markdown syntax today.

When to fill it: Optional; only shown for read.

What to enter: text (the honest default) or markdown, understanding that both currently return the same plain-text extraction.

Where the value comes from: This is a fixed workflow design choice.

How to use it later: {{$json.format}} simply echoes back whichever option was selected; {{$json.content}} contains the same plain text either way.

Accepted format: One of text or markdown.

Real workplace example: Selecting either option today yields identical plain-text content in {{$json.content}} — treat this as a label, not a converter, until Markdown extraction is implemented.

If it is empty or wrong: Runtime defaults to text. There is no functional difference from selecting markdown today.

Common mistake: Selecting Markdown expecting {{$json.content}} to contain **bold**/# heading syntax — it will not; the document's actual formatting is not preserved in either mode.`;

export const googleDocDoc: NodeDoc = {
  slug: 'google_doc',
  displayName: 'Google Docs',
  category: 'Google',
  logoUrl: '/icons/nodes/google_doc.svg',
  description: 'Read, overwrite, create, or append content in Google Docs documents through the connected Google account.',
  credentialType: 'Google OAuth (Docs scope) - saved in Connections and shared with other Google nodes',
  credentialSetupSteps: [
    'In CtrlChecks, open Connections -> Add Connection -> Google, sign in with the Google account that owns or can access the target document, and grant the Docs permission requested.',
    'The OAuth token is stored in the credential system. Do not paste Google tokens, client secrets, or passwords into Google Docs workflow fields.',
    'The connected Google account needs at least Viewer access to the document for Read, and Editor access for Write, Create, and Append.',
    'The same Google connection can also power Gmail, Google Sheets, and Google Drive nodes if those scopes are granted.',
    'Connect the Google Docs output to a logging, If/Else, error-handling, or follow-up node when later steps should inspect {{$json.content}}, {{$json.documentId}}, {{$json.documentUrl}}, or {{$json._error}}.',
    'Downstream service node account connection setup is still required for nodes after Google Docs; the Google connection only authorizes Docs (and optionally Gmail/Sheets/Drive) access.',
  ],
  credentialDocsUrl: 'https://developers.google.com/docs/api/how-tos/authorizing',
  resources: [
    {
      name: 'Document',
      description: 'Read, overwrite, create, or append to a Google Doc.',
      operations: [
        {
          name: 'Read',
          value: 'read',
          description: 'Extracts the plain text content of an existing Google Doc, so downstream steps such as an AI Agent or a database write can use the document\'s text.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Docs action to run.', helpText: operationHelpText, placeholder: 'read', example: 'read', defaultValue: 'read', options: ['read', 'write', 'create', 'append'] },
            { name: 'Document Id', internalKey: 'documentId', type: 'string', required: false, description: 'Which document to read.', helpText: documentIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '1a2b3c4d5e6f7g8h9i0j' },
            { name: 'Document Url', internalKey: 'documentUrl', type: 'string', required: false, description: 'Alternative to Document Id — the full document link.', helpText: documentUrlHelpText, placeholder: 'https://docs.google.com/document/d/DOCUMENT_ID/edit', example: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit' },
            { name: 'Output Format', internalKey: 'format', type: 'select', required: false, description: 'Label for the extraction mode; both options currently return plain text.', helpText: formatHelpText, placeholder: 'text', example: 'text', defaultValue: 'text', options: ['text', 'markdown'] },
          ],
          outputExample: { content: 'Quarterly Report\n\nRevenue increased 12% year over year...', format: 'text', documentId: '1a2b3c4d5e6f7g8h9i0j' },
          outputDescription: 'content: the document\'s extracted plain text. format: echoes back the selected Output Format (text or markdown) without changing extraction. documentId: the resolved document ID that was read. Failures return _error instead.',
          usageExample: {
            scenario: 'Pull a contract\'s text into an AI Agent step for a compliance review',
            inputValues: { operation: 'read', documentId: '{{$json.documentId}}', documentUrl: '', format: 'text' },
            expectedOutput: 'The document\'s text is returned. Map {{$json.content}} into an AI Agent prompt for review or summarization.',
          },
          externalDocsUrl: 'https://developers.google.com/docs/api/reference/rest/v1/documents/get',
        },
        {
          name: 'Write (overwrite)',
          value: 'write',
          description: 'Deletes all existing content in the document and replaces it with new Content, in one step — use Append instead when the existing text should stay.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Docs action to run.', helpText: operationHelpText, placeholder: 'write', example: 'write', defaultValue: 'read', options: ['read', 'write', 'create', 'append'] },
            { name: 'Document Id', internalKey: 'documentId', type: 'string', required: false, description: 'Which document to overwrite (visible in this panel only for Read — use Document Url here instead).', helpText: documentIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '' },
            { name: 'Document Url', internalKey: 'documentUrl', type: 'string', required: true, description: 'Which document to overwrite.', helpText: documentUrlHelpText, placeholder: 'https://docs.google.com/document/d/DOCUMENT_ID/edit', example: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit' },
            { name: 'Content', internalKey: 'content', type: 'textarea', required: true, description: 'The new full content of the document.', helpText: contentHelpText, placeholder: 'Document content...', example: '{{$json.aiSummary}}' },
          ],
          outputExample: { success: true, documentId: '1a2b3c4d5e6f7g8h9i0j', content: 'Updated report content...' },
          outputDescription: 'success: true once the document body is replaced. documentId: the resolved document that was overwritten. content: the exact text that was written, echoed back for confirmation. Failures return _error instead.',
          usageExample: {
            scenario: 'Overwrite a template document with freshly generated report content each week',
            inputValues: { operation: 'write', documentId: '', documentUrl: 'https://docs.google.com/document/d/{{$json.documentId}}/edit', content: '{{$json.reportText}}' },
            expectedOutput: 'The document\'s entire body is replaced. Use {{$json.success}} to confirm before notifying stakeholders.',
          },
          externalDocsUrl: 'https://developers.google.com/docs/api/reference/rest/v1/documents/request#deletecontentrangerequest',
        },
        {
          name: 'Create new document',
          value: 'create',
          description: 'Creates a brand-new Google Doc with the given title, optionally filled with initial Content, returning a ready-to-share link.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Docs action to run.', helpText: operationHelpText, placeholder: 'create', example: 'create', defaultValue: 'read', options: ['read', 'write', 'create', 'append'] },
            { name: 'Document Title', internalKey: 'title', type: 'string', required: false, description: 'Title for the new document.', helpText: titleHelpText, placeholder: 'My New Document', example: 'Weekly Report - {{$json.weekEnding}}' },
            { name: 'Content', internalKey: 'content', type: 'textarea', required: false, description: 'Optional initial content for the new document.', helpText: contentHelpText, placeholder: 'Document content...', example: '{{$json.reportText}}' },
          ],
          outputExample: { success: true, documentId: 'newDoc789xyz', title: 'Weekly Report - 2025-01-19', documentUrl: 'https://docs.google.com/document/d/newDoc789xyz/edit', content: 'Report content...' },
          outputDescription: 'success: true once the document is created. documentId: the new document\'s ID — save this to read/write/append to it later. title: the saved title. documentUrl: a ready-to-share link to the new document. content: the initial content that was inserted, if any. Failures return _error instead.',
          usageExample: {
            scenario: 'Generate a new weekly report document from an AI summary',
            inputValues: { operation: 'create', title: 'Weekly Report - {{$json.weekEnding}}', content: '{{$json.aiSummary}}' },
            expectedOutput: 'A new document appears in Drive. Use {{$json.documentUrl}} to share it, and {{$json.documentId}} for a follow-up Append step next week.',
          },
          externalDocsUrl: 'https://developers.google.com/docs/api/reference/rest/v1/documents/create',
        },
        {
          name: 'Append',
          value: 'append',
          description: 'Inserts Content just before the end of an existing document, leaving everything already there untouched, unlike Write which replaces it all.',
          fields: [
            { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Google Docs action to run.', helpText: operationHelpText, placeholder: 'append', example: 'append', defaultValue: 'read', options: ['read', 'write', 'create', 'append'] },
            { name: 'Document Id', internalKey: 'documentId', type: 'string', required: false, description: 'Which document to append to (visible in this panel only for Read — use Document Url here instead).', helpText: documentIdHelpText, placeholder: '1a2b3c4d5e6f7g8h9i0j', example: '' },
            { name: 'Document Url', internalKey: 'documentUrl', type: 'string', required: true, description: 'Which document to append to.', helpText: documentUrlHelpText, placeholder: 'https://docs.google.com/document/d/DOCUMENT_ID/edit', example: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit' },
            { name: 'Content', internalKey: 'content', type: 'textarea', required: true, description: 'The text to add after the existing content.', helpText: contentHelpText, placeholder: 'Document content...', example: '\n{{$now}}: {{$json.logEntry}}' },
          ],
          outputExample: { success: true, documentId: '1a2b3c4d5e6f7g8h9i0j', content: '\n2025-01-19: Deployment completed successfully.' },
          outputDescription: 'success: true once the new text is inserted. documentId: the resolved document that was appended to. content: the text that was added, echoed back for confirmation (the document\'s prior content is not returned). Failures return _error instead.',
          usageExample: {
            scenario: 'Add a new dated entry to a running deployment log document',
            inputValues: { operation: 'append', documentId: '', documentUrl: 'https://docs.google.com/document/d/{{$json.documentId}}/edit', content: '\n{{$now}}: {{$json.logEntry}}' },
            expectedOutput: 'The new line is added at the end of the document, after everything already there. Use {{$json.success}} to confirm the entry was saved.',
          },
          externalDocsUrl: 'https://developers.google.com/docs/api/reference/rest/v1/documents/request#inserttextrequest',
        },
      ],
    },
  ],
  commonErrors: [
    { error: 'Google Docs node: Document ID or Document URL is required for the', cause: 'Both Document ID and Document URL resolved to empty for read, write, or append.', fix: 'Fill Document URL (works for every operation) or Document ID (read only) with a valid Google Docs link or ID.' },
    { error: 'Google Docs: OAuth token not found', cause: 'Neither the workflow owner nor the current user has a Google account connected.', fix: 'Open Connections, add a Google connection, and grant the Docs permission requested.' },
    { error: 'Google Docs node: Content is required for write operation', cause: 'Content resolved to empty for a write operation.', fix: 'Fill Content or map it from an earlier step\'s output.' },
    { error: 'Google Docs node: Content is required for append operation', cause: 'Content resolved to empty for an append operation.', fix: 'Fill Content or map it from an earlier step\'s output.' },
    { error: 'Google Docs API error', cause: 'The Docs API rejected the request — commonly a wrong or inaccessible document ID, or insufficient permission on the document.', fix: 'Verify the Document ID/URL and confirm the connected account has access to that document.' },
    { error: 'Google Docs node: Unsupported operation', cause: 'Operation holds a value other than read, write, create, or append.', fix: 'Choose one of the four supported operations from the dropdown.' },
    { error: 'Next node cannot find document content', cause: 'The downstream node expects Markdown-formatted content or a nested field that does not exist.', fix: 'Use {{$json.content}} for plain text (Markdown extraction is not implemented despite the Output Format option), and {{$json.documentId}}/{{$json.documentUrl}} for identifiers.' },
    { error: 'Permission denied after Google Docs', cause: 'The Google connection only authorizes Docs (and optionally Gmail/Sheets/Drive) access; downstream service nodes still need their own account connections and permissions.', fix: 'Connect the required account on the downstream service node and confirm that provider permission separately from Google Docs.' },
  ],
  relatedNodes: ['google_drive', 'google_sheets', 'google_gmail', 'ai_agent', 'http_request'],
};
