import type { FieldDoc, NodeDoc, OperationDoc } from '../types';

const help = (
  label: string,
  why: string,
  when: string,
  enter: string,
  source: string,
  format: string,
  example: string,
  wrong: string,
  mistake: string,
) => `What this field means: ${label}
Why it matters: ${why}
When to fill it: ${when}
What to enter: ${enter}
Where the value comes from: ${source}
How to use it later: Downstream nodes can use returned values like {{$json.success}}, {{$json.postId}}, {{$json.assetUrn}}, {{$json.profile.personUrn}}, {{$json.posts}}, {{$json.postCount}}, {{$json.message}}, or {{$json._error}}.
Accepted format: ${format}
Real workplace example: ${example}
If it is empty or wrong: ${wrong}
Common mistake to avoid: ${mistake}`;

const fields: FieldDoc[] = [
  {
    name: 'Operation',
    internalKey: 'operation',
    type: 'select',
    required: true,
    description: 'LinkedIn action to run.',
    options: ['get_profile', 'get_me', 'create_post', 'create_post_media', 'create_article', 'create_company_post', 'get_posts', 'delete_post'],
    defaultValue: 'create_post',
    helpText: help('Operation chooses the LinkedIn action: get profile, create a text/media/article/company post, get recent posts, or delete a post.', 'The runtime normalizes create_post_media to create_post with media behavior, and maps get_org_updates/get_engagement to get_posts for legacy workflows.', 'Choose it before filling operation-specific fields.', 'Select get_profile for account identity, create_post for text, create_post_media for image/video, create_article for a link preview, create_company_post for organization pages, get_posts for recent posts, or delete_post for removal.', 'Choose from the workflow goal or map {{$json.operation}} only when it is a supported operation.', 'One of the supported operation values; camelCase is not used here.', 'A content workflow uses create_article to share a new blog post from the marketing calendar.', 'Unknown operations return _error listing the supported values.', 'Do not use old values such as get_org_updates unless you understand they normalize to get_posts.'),
    notes: 'Dropdown options covered: get_profile, get_me, create_post, create_post_media, create_article, create_company_post, get_posts, and delete_post.',
  },
  {
    name: 'Post Text',
    internalKey: 'text',
    type: 'textarea',
    required: false,
    description: 'Text content for LinkedIn posts.',
    placeholder: '{{$json.linkedinCopy}}',
    helpText: help('Post Text is the commentary shown on a personal, company, article, or media post.', 'Text-only and company posts require it, while media posts can be media-only if Media URL is provided.', 'Fill it for create_post, create_article, create_company_post, and most media posts.', 'Write approved LinkedIn copy or map {{$json.linkedinCopy}}, {{$json.summary}}, or {{$json.aiResponse}}.', 'Comes from content approval, a blog summary, a CRM campaign record, or an AI drafting step.', 'Plain text; keep it professional and avoid secrets or raw customer data.', 'A marketing workflow posts "Our Q3 automation report is live: {{$json.reportUrl}}".', 'Blank text returns _error for text-only and company posting; media-only posts still need Media URL.', 'Do not map unreviewed AI output directly to a public company page.'),
  },
  {
    name: 'Article URL',
    internalKey: 'articleUrl',
    type: 'url',
    required: false,
    description: 'Public article link for create_article.',
    placeholder: 'https://example.com/blog/product-launch',
    helpText: help('Article URL is the public webpage LinkedIn should attach as an article preview.', 'create_article requires it so LinkedIn can build a link card.', 'Fill it only for operation=create_article.', 'Paste a full https URL or map {{$json.articleUrl}} from a CMS/RSS step.', 'Comes from a blog, news page, landing page, or content-management record.', 'Full http or https URL reachable without login.', 'An RSS-triggered workflow shares a new company blog URL with a short LinkedIn caption.', 'Blank articleUrl returns _error for create_article.', 'Do not paste a draft/admin URL that LinkedIn cannot fetch publicly.'),
  },
  {
    name: 'Media URL',
    internalKey: 'mediaUrl',
    type: 'url',
    required: false,
    description: 'Public image or video URL for media posts.',
    placeholder: 'https://cdn.example.com/launch-card.jpg',
    helpText: help('Media URL is the public image or video file LinkedIn uploads before creating a media post.', 'create_post_media must register an upload, fetch the file, upload bytes, and then create the UGC post referencing the asset.', 'Fill it for operation=create_post_media or when create_post should attach media.', 'Paste a direct HTTPS file URL or map {{$json.mediaUrl}} from an asset step.', 'Comes from a CDN, DAM, S3 signed/public URL, generated image, or video export.', 'Direct public HTTPS URL to an image or video file.', 'A product launch workflow shares a dashboard screenshot hosted at {{$json.imageUrl}}.', 'Blank mediaUrl returns _error for media posts; private URLs fail during upload.', 'Do not use a webpage URL containing the media; use the direct file URL.'),
  },
  {
    name: 'Visibility',
    internalKey: 'visibility',
    type: 'select',
    required: false,
    description: 'Audience for the LinkedIn post.',
    options: ['PUBLIC', 'CONNECTIONS'],
    defaultValue: 'PUBLIC',
    helpText: help('Visibility controls whether the post is public or limited to connections.', 'It is sent with create_post, create_post_media, create_article, and create_company_post.', 'Fill it when posting; leave default PUBLIC for broad company announcements.', 'Choose PUBLIC for public reach or CONNECTIONS for a personal network-only post.', 'Comes from the campaign audience plan or compliance requirement.', 'PUBLIC or CONNECTIONS exactly.', 'A personal update about a team hire uses CONNECTIONS, while a launch announcement uses PUBLIC.', 'Invalid visibility can be rejected by LinkedIn.', 'Do not use CONNECTIONS for company-page posts unless the API and account permissions support the chosen audience.'),
  },
  {
    name: 'Person URN',
    internalKey: 'personUrn',
    type: 'string',
    required: false,
    description: 'LinkedIn member identifier used for personal posts.',
    placeholder: '123456789',
    helpText: help('Person URN is the numeric member ID or urn:li:person value for the authenticated LinkedIn member.', 'Personal posting and get_posts need an author; when this is blank the runtime tries to auto-resolve it from the OAuth token.', 'Fill it only if auto-resolution fails or you intentionally need a specific member ID.', 'Enter a numeric ID or urn:li:person:123 form, or map {{$json.profile.personUrn}} from Get My Profile.', 'Comes from LinkedIn profile API output or a prior Get My Profile operation.', 'Numeric ID or urn:li:person:<id>; the runtime rejects long free-text values.', 'A reusable posting workflow maps {{$json.profile.personUrn}} after verifying the connected account.', 'Invalid or blank values can return _error for operations that require a personal author.', 'Do not paste your LinkedIn vanity URL slug; it is not the API member ID.'),
  },
  {
    name: 'Organization ID',
    internalKey: 'organizationId',
    type: 'string',
    required: false,
    description: 'LinkedIn company page numeric ID.',
    placeholder: '123456789',
    helpText: help('Organization ID identifies the company page that should publish the post.', 'create_company_post needs it to build urn:li:organization:<id>.', 'Fill it only for operation=create_company_post.', 'Enter the numeric company page ID or map {{$json.organizationId}} from your workspace settings.', 'Find it in LinkedIn Company Page admin URLs, page info, or internal social-account settings.', 'Numeric organization ID string.', 'An employer-brand workflow posts a hiring announcement to the company page ID 123456789.', 'Blank organizationId returns _error for company posts.', 'Do not use the company page name instead of the numeric ID.'),
  },
  {
    name: 'Post ID (URN)',
    internalKey: 'postId',
    type: 'string',
    required: false,
    description: 'LinkedIn post ID or URN to delete.',
    placeholder: 'urn:li:activity:7123456789012345678',
    helpText: help('Post ID is the LinkedIn activity/share/UGC URN for an existing post.', 'delete_post needs it to remove the correct LinkedIn post.', 'Fill it for operation=delete_post, or use postUrn for legacy workflows.', 'Map {{$json.postId}} from a create operation or {{$json.posts[0].id}} from get_posts.', 'Comes from the output of Create Post, Create Media Post, Create Article, Create Company Post, or Get My Posts.', 'LinkedIn URN or ID string accepted by the delete helper.', 'A QA cleanup workflow deletes a test post after verifying the publish path.', 'Blank postId/postUrn returns _error for delete_post.', 'Do not use a browser URL when the API expects the post URN.'),
  },
  {
    name: 'Limit',
    internalKey: 'limit',
    type: 'number',
    required: false,
    description: 'Maximum posts to return for Get My Posts.',
    placeholder: '10',
    defaultValue: '10',
    helpText: help('Limit is the number of recent LinkedIn posts to fetch.', 'get_posts uses limit or legacy count to decide how many posts to request.', 'Fill it for operation=get_posts when the default 10 is not right.', 'Enter a number such as 5, 10, 25, or map {{$json.limit}} from a report setting.', 'Comes from dashboard/reporting needs or a previous workflow setting.', 'Whole number; the runtime falls back to 10 if parsing fails.', 'A weekly reporting workflow fetches the latest 20 posts for engagement review.', 'Invalid values fall back to 10.', 'Do not set a huge value for frequent workflows; LinkedIn may rate-limit the account.'),
  },
  {
    name: 'Access Token',
    internalKey: 'accessToken',
    type: 'string',
    required: false,
    description: 'Deprecated direct LinkedIn token fallback.',
    helpText: help('Access Token is a legacy direct token fallback; the preferred path is a saved LinkedIn connection.', 'The runtime checks this field before OAuth lookup, so a stale token here can override a good saved connection.', 'Leave it blank unless you are maintaining an old workflow that explicitly requires it.', 'Prefer Connections; if used, enter the OAuth access token value provided by LinkedIn.', 'Comes from LinkedIn OAuth, but should normally be stored in the credential vault.', 'Secret token string; do not store it in normal workflow data.', 'A migration workflow temporarily uses accessToken while moving old workflows to Connections.', 'Missing token is fine if a saved LinkedIn account is connected; stale token causes auth errors.', 'Do not paste LinkedIn tokens into input data or public examples.'),
  },
  {
    name: 'Dry Run',
    internalKey: 'dryRun',
    type: 'boolean',
    required: false,
    description: 'Return simulated request details without calling LinkedIn.',
    defaultValue: 'false',
    helpText: help('Dry Run tells the node to validate and return simulatedRequest instead of calling LinkedIn.', 'It is useful for testing workflow values without publishing, uploading, or deleting anything.', 'Turn it on during setup, demos, or QA, then turn it off for production publishing.', 'Use true or false, or map {{$json.dryRun}} from a controlled testing flag.', 'Comes from the workflow environment or manual testing decision.', 'Boolean true or false.', 'A launch workflow runs dryRun=true in staging and false after approval.', 'If left on, the workflow never publishes and only returns simulatedRequest.', 'Do not forget to turn Dry Run off after testing.'),
  },
  {
    name: 'Rich Text',
    internalKey: 'richText',
    type: 'string',
    required: false,
    description: 'Reserved field not sent by the current runtime.',
    helpText: help('Rich Text is a reserved compatibility field for future LinkedIn rich content.', 'The current runtime does not send richText to LinkedIn, so it should not be used for live post content.', 'Leave it blank unless an older generated workflow already includes it for metadata.', 'Use Post Text for content that should actually be posted.', 'May come from older AI-generated workflow configs, but it is not a runtime action field today.', 'Plain text or HTML-like string, ignored by current execution.', 'A documentation audit leaves this field blank and uses text instead.', 'Putting content here does not publish it.', 'Do not assume richText affects the LinkedIn post output.'),
  },
  {
    name: 'Media',
    internalKey: 'media',
    type: 'json',
    required: false,
    description: 'Reserved media configuration object not used by the current visual path.',
    helpText: help('Media is a reserved object from older/generated schema metadata.', 'The current runtime uses Media URL for media posts instead of this object.', 'Leave it blank unless a legacy workflow stores metadata here for reference.', 'Use a JSON object only if another custom step expects it, and use mediaUrl for actual uploads.', 'May come from a previous asset selection step, but LinkedIn upload reads mediaUrl.', 'Valid JSON object.', 'A migrated workflow keeps {"source":"campaign"} here for notes while using mediaUrl to upload the real file.', 'Invalid JSON may break editor parsing, and valid JSON still does not upload media by itself.', 'Do not place image bytes here expecting LinkedIn to upload them.'),
  },
];

const outputDescription = 'success: true when LinkedIn accepted the operation or dryRun simulation. dryRun and simulatedRequest: returned when Dry Run is enabled. profile: returned by get_profile/get_me with id, name, email, and personUrn. posts and postCount: returned by get_posts. postId: returned by text, media, article, and company posts. assetUrn: returned by media post upload. message: returned after delete_post. _error and _errorDetails: returned for missing tokens, missing personUrn, missing text/mediaUrl/articleUrl/organizationId/postId, permission errors, rate limits, or unexpected LinkedIn failures.';

function op(name: string, value: string, description: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description,
    fields,
    outputExample: {
      success: true,
      postId: 'urn:li:activity:7123456789012345678',
      assetUrn: 'urn:li:digitalmediaAsset:D4D22AQFexample',
      profile: { id: '123456789', name: 'Alex Morgan', personUrn: '123456789' },
      posts: [{ id: 'urn:li:activity:7123456789012345678', text: 'Launch update' }],
      postCount: 1,
      message: 'Post deleted successfully',
    },
    outputDescription,
    usageExample: {
      scenario: `${name} supports a real LinkedIn workplace workflow such as marketing publishing, profile verification, company-page posting, or cleanup of test posts.`,
      inputValues,
      expectedOutput: 'Downstream nodes can use LinkedIn fields like {{$json.success}}, {{$json.postId}}, {{$json.profile.personUrn}}, {{$json.posts}}, or {{$json._error}}.',
    },
    externalDocsUrl: 'https://learn.microsoft.com/linkedin/',
  };
}

const baseInput = {
  operation: 'create_post',
  text: '{{$json.linkedinCopy}}',
  articleUrl: '{{$json.articleUrl}}',
  mediaUrl: '{{$json.mediaUrl}}',
  visibility: 'PUBLIC',
  personUrn: '{{$json.profile.personUrn}}',
  organizationId: '123456789',
  postId: '{{$json.postId}}',
  limit: '10',
  accessToken: '',
  dryRun: 'false',
  richText: '',
  media: '{}',
};

export const linkedinDoc: NodeDoc = {
  slug: 'linkedin',
  displayName: 'LinkedIn',
  category: 'Social',
  logoUrl: '/icons/nodes/linkedin.svg',
  description: 'Publish and manage LinkedIn personal and company content through a connected LinkedIn OAuth account.',
  credentialType: 'LinkedIn OAuth connection',
  credentialSetupSteps: [
    'Connect LinkedIn in Connections so CtrlChecks stores the OAuth access token in the credential vault instead of workflow input data.',
    'The connected account needs openid, profile, email, and w_member_social for the current publishing and profile operations; company posts also require page/admin permission for the organization.',
    'Test the connection with Get My Profile before posting. A healthy response returns a profile object and personUrn.',
    'Keep OAuth tokens out of workflow input data. accessToken is only a legacy fallback and should normally stay blank.',
    'After the node is configured, connect the output with an outgoing line. Any downstream service node still needs its own account connection.',
  ],
  credentialDocsUrl: 'https://learn.microsoft.com/linkedin/shared/authentication/authorization-code-flow',
  resources: [
    {
      name: 'LinkedIn Operations',
      description: 'The LinkedIn node uses a single operation dropdown. Successful operations preserve incoming object fields and add the LinkedIn result fields.',
      operations: [
        op('Get profile and posts', 'read', 'Fetches the authenticated profile or recent personal posts. get_profile/get_me returns profile data; get_posts resolves personUrn and returns posts plus postCount.', { ...baseInput, operation: 'get_profile' }),
        op('Create personal, media, article, or company post', 'publish', 'Publishes text, media, article-link, or company-page content. Media posts register and upload the media first; text-only posting retries briefly on rate limits.', baseInput),
        op('Delete post or simulate request', 'delete_or_dry_run', 'Deletes an existing LinkedIn post by postId/postUrn, or returns simulatedRequest for supported operations when dryRun is true.', { ...baseInput, operation: 'delete_post', postId: 'urn:li:activity:7123456789012345678' }),
      ],
    },
  ],
  commonErrors: [
    { error: 'LinkedIn: Access token not found', cause: 'No direct token, saved LinkedIn OAuth token, or LINKEDIN_ACCESS_TOKEN fallback was available.', fix: 'Connect LinkedIn in Connections and run Get My Profile to verify access.' },
    { error: 'LinkedIn node: personUrn is required for get_posts operation', cause: 'The runtime could not auto-resolve a member ID from the token.', fix: 'Run Get My Profile and map {{$json.profile.personUrn}}, or enter a valid numeric member ID.' },
    { error: 'LinkedIn node: Text is required for post operation when no mediaUrl is provided.', cause: 'A text-only post had neither text nor media.', fix: 'Fill Post Text or switch to Create Post (Media) and provide Media URL.' },
    { error: 'LinkedIn node: mediaUrl is required for media posts (Create Post - Media).', cause: 'The media operation had no direct file URL to upload.', fix: 'Provide a public HTTPS image or video URL.' },
    { error: 'LinkedIn node: articleUrl is required for create_article operation', cause: 'An article-link post was missing the article URL.', fix: 'Map a public article URL from the CMS/RSS step.' },
    { error: 'LinkedIn node: organizationId is required for create_company_post operation', cause: 'A company-page post did not specify the organization ID.', fix: 'Enter the numeric company page ID and confirm the connected account is a page admin.' },
    { error: 'LinkedIn node: postUrn or postId is required for delete_post operation', cause: 'Delete Post had no target post identifier.', fix: 'Map the postId returned by a create or get_posts operation.' },
    { error: 'LinkedIn authorization error', cause: 'The token is expired, missing w_member_social, lacks organization admin permission, or cannot access the media URL.', fix: 'Reconnect LinkedIn with the required scopes and confirm the media URL is publicly reachable.' },
  ],
  relatedNodes: ['twitter', 'facebook', 'instagram', 'http_request'],
};
