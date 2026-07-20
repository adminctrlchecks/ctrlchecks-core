import type { FieldDoc, NodeDoc, OperationDoc } from '../types';
import { richFieldHelp } from './_sharedFieldHelp';

const rich = (parts: {
  what: string;
  why: string;
  when: string;
  enter: string;
  source: string;
  format: string;
  example: string;
  empty: string;
  mistake: string;
}) => richFieldHelp({
  ...parts,
  later: 'On success, the runtime preserves incoming fields and adds {{$json.success}}, {{$json.provider}}, {{$json.action}}, and operation-specific top-level data such as pages, count, messageId, commentId, or raw.',
});

const resourceHelp = rich({
  what: 'The Facebook resource family selected in the visual panel.',
  why: 'The social dispatcher uses resource plus operation to decide which Facebook handler to run.',
  when: 'Required for every Facebook node.',
  enter: 'Choose user, page, post, photo, video, page_message, comment, event, lead, leadgen, or album. Only page/list, page_message/sendTextMessage, and comment/createComment have implemented handlers right now.',
  source: 'Select the resource from the dropdown.',
  format: 'One visible resource value: user, page, post, photo, video, page_message, comment, event, lead, leadgen, or album.',
  example: 'Use page with list to list managed Pages; use page_message with sendTextMessage to reply in Messenger.',
  empty: 'Runtime defaults to page.',
  mistake: 'Assuming every visible resource is fully implemented. Most are scaffolded and return a not yet implemented error today.',
});

const operationHelp = rich({
  what: 'The Facebook operation selected in the visual panel.',
  why: 'The selected operation is normalized by the Facebook node and routed to a Graph API handler when one exists.',
  when: 'Required for every Facebook node.',
  enter: 'For currently implemented behavior, use list with resource page, sendTextMessage with resource page_message, or createComment with resource comment. Other visible values are scaffolded.',
  source: 'Select the operation from the dropdown. Operation values include get, listPosts, createPost, list, update, updatePost, deletePost, getInsights, sendTextMessage, markSeen, typingOn, listComments, createComment, updateComment, deleteComment, like, upload, delete, and create.',
  format: 'One visible operation value: get, listPosts, createPost, list, update, updatePost, deletePost, getInsights, sendTextMessage, markSeen, typingOn, listComments, createComment, updateComment, deleteComment, like, upload, delete, or create.',
  example: 'To list Pages, set resource page and operation list. To reply in Messenger, set resource page_message and operation sendTextMessage.',
  empty: 'Runtime defaults to the configured operation and returns _error for unsupported or not-yet-implemented pairs.',
  mistake: 'Pairing page with createPost. The current implemented page operation is list; post creation is scaffolded and not yet implemented in the dispatcher.',
});

const legacySecretHelp = rich({
  what: 'A legacy Facebook access token field known by backend inventory.',
  why: 'Facebook needs an OAuth token, but the normal executor resolves it from the saved Facebook connection.',
  when: 'Normally leave this blank and use Connections.',
  enter: 'Use a saved Facebook OAuth connection rather than a raw token.',
  source: 'CtrlChecks Connections stores OAuth tokens in the credential vault after connecting Facebook.',
  format: 'OAuth token if a legacy workflow explicitly supplies one; treat it as a secret.',
  example: 'Reconnect Facebook in Connections and leave accessToken empty.',
  empty: 'Runtime uses the saved Facebook token; if none is found it returns _error saying no facebook token found.',
  mistake: 'Pasting Meta access tokens into normal node fields or examples.',
});

const fieldHelp: Record<string, string> = {
  pageId: rich({
    what: 'The Facebook Page ID used for Page, Messenger, and page-scoped comment actions.',
    why: 'Messenger sends and page-token lookup need to know which Facebook Page owns the conversation or content.',
    when: 'Required for page_message sendTextMessage. Optional for comment createComment to fetch a page access token. Useful for Page-related Graph actions.',
    enter: 'A numeric Page ID from Facebook or from the List Pages operation.',
    source: 'Run resource page with operation list and map {{$json.pages[0].id}}, or copy it from Meta Page settings/Graph API.',
    format: 'Numeric Facebook Page ID string.',
    example: 'Reply from the support Page with pageId {{$json.pages[0].id}}.',
    empty: 'sendTextMessage returns _error saying pageId is required.',
    mistake: 'Using a personal profile id instead of the Page ID.',
  }),
  message: rich({
    what: 'Message text used by posts, Messenger sends, and comment replies.',
    why: 'Implemented Messenger and comment handlers need text content before they can send anything.',
    when: 'Required for sendTextMessage if Text is blank, and for createComment if Reply Text/Text/Comment Text is blank.',
    enter: 'Plain text typed directly or mapped from an upstream trigger or AI step.',
    source: 'Map {{$json.aiResponse}}, {{$json.response}}, {{$json.text}}, or {{$json.message}} from earlier workflow data.',
    format: 'Plain text string.',
    example: 'Thanks for reaching out, {{$json.firstName}}. We are checking this now.',
    empty: 'Runtime returns _error saying message or text is required for Messenger, or message/text/replyText/commentText is required for comment replies.',
    mistake: 'Putting a raw Graph API payload here; implemented handlers expect plain text.',
  }),
  text: rich({
    what: 'Messenger text body fallback for sending a Facebook page message.',
    why: 'The Messenger handler reads text before message and sends it as message.text.',
    when: 'Use for page_message sendTextMessage, especially after a Facebook Trigger or AI Agent.',
    enter: 'Plain text or an expression such as {{$json.aiResponse}}.',
    source: 'Map the generated reply from a previous AI or support-routing node.',
    format: 'Plain text string.',
    example: '{{$json.aiResponse}}',
    empty: 'sendTextMessage falls back to message or replyText; if all are blank it returns _error.',
    mistake: 'Using Text without Recipient PSID; Messenger also needs recipientId.',
  }),
  recipientId: rich({
    what: 'The Facebook Page-scoped recipient ID for Messenger.',
    why: 'Messenger needs a PSID to know which user receives the message.',
    when: 'Required for page_message sendTextMessage.',
    enter: 'A PSID from Facebook Trigger output, often senderId.',
    source: 'Map {{$json.senderId}}, {{$json.recipientId}}, {{$json.userId}}, or another trigger field that contains the PSID.',
    format: 'Facebook Page-scoped ID string.',
    example: '{{$json.senderId}}',
    empty: 'sendTextMessage returns _error saying recipientId is required.',
    mistake: 'Using an email address, phone number, or Facebook username instead of the PSID.',
  }),
  link: rich({
    what: 'Optional link URL for scaffolded post operations.',
    why: 'Legacy post paths and future link-post handlers may attach a URL to published content.',
    when: 'Only relevant for legacy/scaffolded post creation; not used by the three currently implemented resource handlers.',
    enter: 'A public HTTP or HTTPS URL.',
    source: 'Map a blog/article/product URL such as {{$json.url}}.',
    format: 'Full URL beginning with https:// or http://.',
    example: 'https://example.com/blog/{{$json.slug}}',
    empty: 'Implemented list, Messenger, and comment handlers ignore it.',
    mistake: 'Expecting Link URL to make scaffolded createPost work today.',
  }),
  photoUrl: rich({
    what: 'Public photo URL for scaffolded photo upload operations.',
    why: 'Photo upload handlers would need a public file URL to fetch media.',
    when: 'Only relevant to visible photo upload scaffolding; not implemented by the current dispatcher handlers.',
    enter: 'A publicly reachable HTTPS image URL.',
    source: 'Map an image asset URL from a previous step such as {{$json.imageUrl}}.',
    format: 'HTTPS URL to an image file.',
    example: 'https://cdn.example.com/campaign/{{$json.imageName}}.jpg',
    empty: 'Current implemented handlers ignore it; scaffolded photo operations return not yet implemented.',
    mistake: 'Using a private local file path or expecting upload to work before the handler exists.',
  }),
  videoUrl: rich({
    what: 'Public video URL for scaffolded video upload operations.',
    why: 'Video upload handlers would need a reachable media file URL.',
    when: 'Only relevant to visible video upload scaffolding; not implemented by the current dispatcher handlers.',
    enter: 'A publicly reachable HTTPS video URL.',
    source: 'Map a video asset URL such as {{$json.videoUrl}}.',
    format: 'HTTPS URL to a supported video file.',
    example: 'https://cdn.example.com/videos/{{$json.videoId}}.mp4',
    empty: 'Current implemented handlers ignore it; scaffolded video operations return not yet implemented.',
    mistake: 'Using a private drive link that Facebook Graph cannot fetch.',
  }),
  postId: rich({
    what: 'Facebook post ID used as a target for comment replies and scaffolded post actions.',
    why: 'Comment create can reply to a post when Comment ID is not supplied.',
    when: 'Use for comment/createComment when replying to a post, or scaffolded post operations.',
    enter: 'A post id from Facebook output or trigger data.',
    source: 'Map {{$json.postId}} from Facebook Trigger or a previous Graph result.',
    format: 'Facebook post ID, often pageId_postId.',
    example: '{{$json.postId}}',
    empty: 'createComment can use commentId instead; if both postId and commentId are blank it returns _error.',
    mistake: 'Using the Page ID as the Post ID.',
  }),
  commentId: rich({
    what: 'Facebook comment ID used as the target for a reply.',
    why: 'The implemented createComment handler posts to /{commentId}/comments when Comment ID is supplied.',
    when: 'Required for comment/createComment when Post ID is not used.',
    enter: 'A comment id from Facebook Trigger output or another Graph response.',
    source: 'Map {{$json.commentId}} from a Facebook comment trigger.',
    format: 'Facebook comment ID string.',
    example: '{{$json.commentId}}',
    empty: 'createComment can use postId instead; if both are blank it returns _error.',
    mistake: 'Putting reply text in Comment ID; text belongs in Reply Text, Text, or Message.',
  }),
  replyText: rich({
    what: 'Reply body for a Facebook comment reply or Messenger response.',
    why: 'The comment handler reads replyText along with commentText, text, and message to build the outgoing reply.',
    when: 'Use for comment/createComment or as a fallback for page_message sendTextMessage.',
    enter: 'Plain reply text or a mapped AI/support answer.',
    source: 'Map {{$json.aiResponse}} or {{$json.response}} from an AI Agent or support step.',
    format: 'Plain text string.',
    example: '{{$json.aiResponse}}',
    empty: 'createComment returns _error when no message/text/replyText/commentText is available.',
    mistake: 'Filling Reply Text without a postId or commentId target.',
  }),
  metric: rich({
    what: 'Comma-separated Facebook insight metric names for scaffolded insights operations.',
    why: 'Page insight handlers would need metric names to ask Graph API for the right analytics.',
    when: 'Only relevant for visible getInsights scaffolding; not implemented by the current handler map.',
    enter: 'Metric names separated by commas.',
    source: 'Use metrics from Meta Graph API documentation, such as page_impressions or page_reach.',
    format: 'Comma-separated metric names.',
    example: 'page_impressions,page_reach,page_engaged_users',
    empty: 'Current implemented handlers ignore it; scaffolded insights operations return not yet implemented.',
    mistake: 'Assuming insight metrics are returned by List Pages.',
  }),
  limit: rich({
    what: 'Maximum number of items requested for list-style Facebook calls.',
    why: 'The implemented List Pages handler uses limit, clamps it between 1 and 500, and passes it to /me/accounts.',
    when: 'Use with resource page and operation list. Scaffolded list operations may use it in future handlers.',
    enter: 'A number such as 25, or a mapped number from workflow settings.',
    source: 'Type a fixed number or map {{$json.limit}}.',
    format: 'Number between 1 and 500 for List Pages.',
    example: '25',
    empty: 'List Pages defaults to 25.',
    mistake: 'Expecting Limit to make not-yet-implemented list operations work.',
  }),
  credentialId: rich({
    what: 'Internal saved credential reference known by backend inventory.',
    why: 'Older generated configs may include it, but the social dispatcher normally resolves the saved Facebook connection by workflow owner.',
    when: 'Leave blank in normal visual workflows.',
    enter: 'Use Connections rather than typing credential ids.',
    source: 'Credential IDs are CtrlChecks system metadata, not values from Meta.',
    format: 'Internal id such as facebook_oauth_123 when present.',
    example: 'Select the Facebook account connection instead of typing a credential id.',
    empty: 'Blank is fine when the workflow owner has a Facebook connection.',
    mistake: 'Confusing credentialId with Page ID.',
  }),
};

const fields: FieldDoc[] = [
  { name: 'Resource', internalKey: 'resource', type: 'select', required: true, description: 'Choose the Facebook resource family.', helpText: resourceHelp, options: ['user', 'page', 'post', 'photo', 'video', 'page_message', 'comment', 'event', 'lead', 'leadgen', 'album'], defaultValue: 'page', example: 'page' },
  { name: 'Operation', internalKey: 'operation', type: 'select', required: true, description: 'Choose the Facebook operation.', helpText: operationHelp, options: ['get', 'listPosts', 'createPost', 'list', 'update', 'updatePost', 'deletePost', 'getInsights', 'sendTextMessage', 'markSeen', 'typingOn', 'listComments', 'createComment', 'updateComment', 'deleteComment', 'like', 'upload', 'delete', 'create'], defaultValue: 'list', example: 'list' },
  { name: 'Page ID', internalKey: 'pageId', type: 'string', required: false, description: 'Facebook Page ID.', helpText: fieldHelp.pageId, placeholder: '123456789012345', example: '{{$json.pages[0].id}}' },
  { name: 'Message', internalKey: 'message', type: 'textarea', required: false, description: 'Plain message text.', helpText: fieldHelp.message, placeholder: 'Your post, Messenger reply, or comment content', example: '{{$json.aiResponse}}' },
  { name: 'Text', internalKey: 'text', type: 'textarea', required: false, description: 'Messenger text body.', helpText: fieldHelp.text, placeholder: '{{$json.aiResponse}}', example: '{{$json.aiResponse}}' },
  { name: 'Recipient PSID', internalKey: 'recipientId', type: 'string', required: false, description: 'Messenger recipient Page-scoped ID.', helpText: fieldHelp.recipientId, placeholder: '{{$json.senderId}}', example: '{{$json.senderId}}' },
  { name: 'Link URL', internalKey: 'link', type: 'url', required: false, description: 'Optional link URL for scaffolded post operations.', helpText: fieldHelp.link, placeholder: 'https://example.com/article', example: '{{$json.url}}' },
  { name: 'Photo URL', internalKey: 'photoUrl', type: 'url', required: false, description: 'Public photo URL for scaffolded photo upload.', helpText: fieldHelp.photoUrl, placeholder: 'https://example.com/image.jpg', example: '{{$json.photoUrl}}' },
  { name: 'Video URL', internalKey: 'videoUrl', type: 'url', required: false, description: 'Public video URL for scaffolded video upload.', helpText: fieldHelp.videoUrl, placeholder: 'https://example.com/video.mp4', example: '{{$json.videoUrl}}' },
  { name: 'Post ID', internalKey: 'postId', type: 'string', required: false, description: 'Facebook post ID.', helpText: fieldHelp.postId, placeholder: '123456789012345_987654321098765', example: '{{$json.postId}}' },
  { name: 'Comment ID', internalKey: 'commentId', type: 'string', required: false, description: 'Facebook comment ID.', helpText: fieldHelp.commentId, placeholder: '123456789012345', example: '{{$json.commentId}}' },
  { name: 'Reply Text', internalKey: 'replyText', type: 'textarea', required: false, description: 'Reply body for comments or Messenger.', helpText: fieldHelp.replyText, placeholder: '{{$json.aiResponse}}', example: '{{$json.aiResponse}}' },
  { name: 'Insight Metric', internalKey: 'metric', type: 'string', required: false, description: 'Comma-separated insight metrics for scaffolded analytics operations.', helpText: fieldHelp.metric, placeholder: 'page_impressions,page_reach', example: 'page_impressions,page_reach' },
  { name: 'Limit', internalKey: 'limit', type: 'number', required: false, description: 'Maximum number of list results.', helpText: fieldHelp.limit, defaultValue: '25', example: '25' },
  { name: 'Access Token', internalKey: 'accessToken', type: 'password', required: false, description: 'Legacy Facebook OAuth token fallback; prefer Connections.', helpText: legacySecretHelp, placeholder: 'Stored in Connections', example: 'Stored in Connections' },
  { name: 'Credential ID', internalKey: 'credentialId', type: 'string', required: false, description: 'Internal saved credential reference for older configs.', helpText: fieldHelp.credentialId, placeholder: 'facebook_oauth_123', example: 'Selected via Connections' },
];

const outputDescription = 'Success returns incoming fields plus success, provider, action, and operation data spread at the top level, such as pages/count/summary for List Pages, messageId/raw for Messenger sends, or commentId/raw for comment replies. Failures preserve incoming fields and return _error. Scaffolded operations return a not yet implemented error rather than fabricated post, photo, video, insight, or lead data.';

const makeOperation = (operation: {
  name: string;
  value: string;
  description: string;
  inputValues: Record<string, string>;
  outputExample: Record<string, unknown>;
  scenario: string;
  expectedOutput: string;
}): OperationDoc => ({
  name: operation.name,
  value: operation.value,
  description: operation.description,
  fields,
  outputExample: operation.outputExample,
  outputDescription,
  usageExample: {
    scenario: operation.scenario,
    inputValues: operation.inputValues,
    expectedOutput: operation.expectedOutput,
  },
  externalDocsUrl: 'https://developers.facebook.com/docs/graph-api/',
});

export const facebookDoc: NodeDoc = {
  slug: 'facebook',
  displayName: 'Facebook',
  category: 'Social',
  logoUrl: '/icons/nodes/facebook.svg',
  description: 'Use the connected Facebook account to list managed Pages, send Messenger text, and create comment replies through the social dispatcher.',
  credentialType: 'Facebook OAuth2 / Meta Graph API Connection',
  credentialSetupSteps: [
    'What this is: The Facebook node uses a saved Facebook OAuth2 connection so CtrlChecks can call Meta Graph API without exposing access tokens in workflow fields.',
    'Where to start: In Meta for Developers or Meta Business Suite, make sure the Facebook app and Page have the needed permissions such as pages_show_list, pages_read_engagement, pages_manage_posts, pages_messaging, and comment-related access for the action.',
    'How to connect: In CtrlChecks, open Connections, choose Add Connection, select Facebook, and authorize the Facebook account/Page access in the credential vault.',
    'What is stored: CtrlChecks stores OAuth access/refresh token material in Connections. Legacy accessToken and credentialId fields are documented only because backend inventory still knows them.',
    'What not to store: Do not paste Facebook access tokens, app secrets, client secrets, page tokens, or passwords into normal workflow fields or downstream nodes.',
    'Test it: Run resource page with operation list. A healthy connection calls /me/accounts and returns pages, count, and summary.',
    'Connect the output or outgoing line to the next node that should use returned Facebook data such as {{$json.pages}}, {{$json.messageId}}, {{$json.commentId}}, or {{$json._error}}.',
    'Every downstream service node still needs its own account connection; the Facebook service node account connection does not authenticate Slack, email, Trello, Linear, or CRM nodes.',
  ],
  credentialDocsUrl: 'https://developers.facebook.com/docs/graph-api/',
  resources: [
    {
      name: 'Implemented Facebook actions and visible scaffolding',
      description: 'The visual panel exposes a broad Graph API scaffold, but the current dispatcher has implemented handlers only for Page list, Messenger send text, and Comment create reply.',
      operations: [
        makeOperation({
          name: 'List Managed Pages',
          value: 'page.list',
          description: 'List Facebook Pages managed by the connected account by calling /me/accounts. This is the safest connection test and the main discovery step for Page ID and Page access.',
          inputValues: { resource: 'page', operation: 'list', pageId: '', message: '', text: '', recipientId: '', postId: '', commentId: '', replyText: '', link: '', photoUrl: '', videoUrl: '', metric: '', limit: '25' },
          outputExample: { success: true, provider: 'facebook', action: 'page.getAllPages', pages: [{ id: '123456789012345', name: 'Acme Support' }], count: 1, summary: { managedPages: 1 } },
          scenario: 'Find the company support Page ID before sending Messenger replies from that Page.',
          expectedOutput: 'A later Facebook node can map {{$json.pages[0].id}} into Page ID.',
        }),
        makeOperation({
          name: 'Send Messenger Text',
          value: 'page_message.sendTextMessage',
          description: 'Send a text message from a Facebook Page to a Page-scoped recipient ID. Runtime requires Page ID, Recipient PSID, and Message or Text, then returns the Facebook message id when Graph accepts the send.',
          inputValues: { resource: 'page_message', operation: 'sendTextMessage', pageId: '{{$json.pageId}}', message: '{{$json.aiResponse}}', text: '{{$json.aiResponse}}', recipientId: '{{$json.senderId}}', postId: '', commentId: '', replyText: '', link: '', photoUrl: '', videoUrl: '', metric: '', limit: '25' },
          outputExample: { success: true, provider: 'facebook', action: 'page_message.sendTextMessage', pageId: '123456789012345', recipientId: 'psid_123', message: 'Thanks for reaching out.', messageId: 'mid.$abc', raw: { recipient_id: 'psid_123', message_id: 'mid.$abc' } },
          scenario: 'Reply to a Facebook Messenger trigger with an AI-generated support response.',
          expectedOutput: 'The workflow can log {{$json.messageId}} and still use {{$json.senderId}} from the incoming trigger data.',
        }),
        makeOperation({
          name: 'Create Comment Reply',
          value: 'comment.createComment',
          description: 'Create a Facebook comment reply on a post or existing comment. Runtime needs Comment ID or Post ID plus message text from Reply Text, Text, or Message, and can use Page ID to fetch a Page token.',
          inputValues: { resource: 'comment', operation: 'createComment', pageId: '{{$json.pageId}}', message: '', text: '', recipientId: '', postId: '{{$json.postId}}', commentId: '{{$json.commentId}}', replyText: '{{$json.aiResponse}}', link: '', photoUrl: '', videoUrl: '', metric: '', limit: '25' },
          outputExample: { success: true, provider: 'facebook', action: 'comment.createComment', pageId: '123456789012345', targetId: 'comment_123', commentId: 'reply_456', message: 'We are checking this now.', raw: { id: 'reply_456' } },
          scenario: 'Reply automatically to a Facebook comment after moderation classifies it as a support request.',
          expectedOutput: 'A later audit step can store {{$json.commentId}} and {{$json.raw}}.',
        }),
        makeOperation({
          name: 'Visible Scaffolded Operations',
          value: 'scaffolded',
          description: 'The visual dropdown also shows user, post, photo, video, event, lead, leadgen, album, and operations such as get, listPosts, createPost, update, updatePost, deletePost, getInsights, markSeen, typingOn, listComments, updateComment, deleteComment, like, upload, delete, and create. Those paths are allowed or legacy-normalized in parts of the Facebook node scaffold, but they do not have concrete handlers in the current dispatcher and return a not yet implemented or unsupported error instead of real Graph data.',
          inputValues: { resource: 'post', operation: 'createPost', pageId: '{{$json.pageId}}', message: '{{$json.message}}', text: '', recipientId: '', postId: '', commentId: '', replyText: '', link: '{{$json.url}}', photoUrl: '{{$json.photoUrl}}', videoUrl: '{{$json.videoUrl}}', metric: 'page_impressions,page_reach', limit: '25' },
          outputExample: { _error: 'facebook node: Not yet implemented: post.createTextPost. Expected completion date: 2026-05-15.' },
          scenario: 'A workflow imported an old Facebook createPost config and needs to be corrected before production use.',
          expectedOutput: 'Error handling can route on {{$json._error}} until the specific Facebook operation handler is implemented.',
        }),
      ],
    },
  ],
  commonErrors: [
    { error: 'No facebook token found', cause: 'No saved Facebook connection was found for the workflow owner or current user.', fix: 'Reconnect Facebook in Connections, approve Page access, and rerun List Managed Pages.' },
    { error: 'Operation createTextPost is not supported for resource page', cause: 'A stale page/createPost pairing was used. The implemented Page action is list; post creation is scaffolded.', fix: 'Use resource page with operation list for implemented discovery, or wait for the post handler before publishing.' },
    { error: 'Not yet implemented: <resource>.<operation>', cause: 'The selected visible operation is scaffolded but has no concrete handler in worker/src/services/social/facebook/actions/index.ts.', fix: 'Use page/list, page_message/sendTextMessage, or comment/createComment until the handler exists.' },
    { error: 'pageId is required to send a Facebook Messenger message', cause: 'Send Messenger Text was selected without Page ID.', fix: 'Run List Managed Pages and map {{$json.pages[0].id}} into Page ID.' },
    { error: 'recipientId is required to send a Facebook Messenger message', cause: 'Messenger send needs the Page-scoped user ID.', fix: 'Map {{$json.senderId}} from Facebook Trigger or the upstream Messenger event.' },
    { error: 'message or text is required to send a Facebook Messenger message', cause: 'Messenger send had no Message, Text, or Reply Text value.', fix: 'Map the AI/support reply such as {{$json.aiResponse}} into Text or Message.' },
    { error: 'commentId or postId is required to create a Facebook comment reply', cause: 'Create Comment was selected without a target comment or post.', fix: 'Map {{$json.commentId}} or {{$json.postId}} from Facebook Trigger/output.' },
    { error: 'message, text, replyText, or commentText is required to create a Facebook comment reply', cause: 'Comment reply had a target but no reply body.', fix: 'Fill Reply Text or map {{$json.aiResponse}}.' },
    { error: 'Permission error or access token expired', cause: 'Meta rejected the token, Page role, app mode, or permission scopes.', fix: 'Reconnect Facebook, approve needed Graph permissions, and confirm the user has Page access in Meta Business Suite.' },
  ],
  relatedNodes: ['facebook_trigger', 'instagram', 'whatsapp', 'slack_message', 'log_output'],
};
