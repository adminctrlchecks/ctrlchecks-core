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
How to use it later: Downstream nodes can read YouTube output such as {{$json.success}}, {{$json.operation}}, {{$json.items}}, {{$json.channel}}, {{$json.video}}, {{$json.statistics}}, {{$json.videoId}}, {{$json.url}}, {{$json.deleted}}, or {{$json._error}}.
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
    description: 'YouTube action to run.',
    options: ['list_my_channels', 'get_channel', 'search_videos', 'get_video_stats', 'upload_video', 'update_video_metadata', 'delete_video'],
    defaultValue: 'list_my_channels',
    helpText: help('Operation chooses the registry-owned YouTube action.', 'Each operation has a different YouTube Data API endpoint and required fields.', 'Choose it before filling the rest of the panel.', 'Use list_my_channels for authenticated channel discovery, get_channel for one channel, search_videos for YouTube search, get_video_stats for metrics, upload_video for publishing, update_video_metadata for title/description/tags, or delete_video for removal.', 'Choose from the workflow goal or map {{$json.operation}} only from a controlled step.', 'One of the supported operation values.', 'A content operations workflow uploads a private video, then updates metadata after review.', 'Unsupported values return YOUTUBE_FAILED with an error message.', 'Do not use stale values like create_post, reply_comment, or get_comments; the override rejects them.'),
  },
  {
    name: 'Video Title',
    internalKey: 'title',
    type: 'string',
    required: false,
    description: 'Title for upload or metadata update.',
    placeholder: 'Q3 product demo',
    helpText: help('Video Title is the public YouTube title for uploads or a replacement title for metadata updates.', 'upload_video requires it; update_video_metadata uses it when you want to change the current title.', 'Fill it for upload_video and when updating a title.', 'Type a title under YouTube limits or map {{$json.title}} from a CMS/video-planning step.', 'Comes from the video brief, CMS record, content calendar, or approved AI draft.', 'Plain text, typically 100 characters or less.', 'A product education workflow uploads "How to automate invoice reminders in CtrlChecks".', 'Blank title fails upload_video and is ignored during update when other metadata is supplied.', 'Do not put the full video description in the title field.'),
  },
  {
    name: 'Video Description',
    internalKey: 'description',
    type: 'textarea',
    required: false,
    description: 'YouTube video description.',
    placeholder: 'Learn how to build the workflow step by step.',
    helpText: help('Video Description is the body text shown under the video.', 'It helps viewers, search, and downstream marketing links, and update_video_metadata can replace it.', 'Fill it for upload_video or when updating the description.', 'Type approved description copy or map {{$json.description}} from a content brief.', 'Comes from the content calendar, CMS, transcript summary, or campaign record.', 'Plain text with URLs and line breaks as YouTube allows.', 'A tutorial workflow inserts the support-doc link and chapter summary into the description.', 'Blank description is allowed but may reduce discoverability.', 'Do not paste private notes or unreleased credentials into public descriptions.'),
  },
  {
    name: 'Tags',
    internalKey: 'tags',
    type: 'string',
    required: false,
    description: 'Comma-separated YouTube tags.',
    placeholder: 'automation, workflow, tutorial',
    helpText: help('Tags are comma-separated keywords sent in the video snippet.', 'They help organize metadata and can be updated with title/description.', 'Fill them for upload_video or metadata update when your team uses tags.', 'Enter comma-separated words such as automation, workflow, tutorial, or map {{$json.tags}}.', 'Comes from SEO planning, campaign taxonomy, or content metadata.', 'Comma-separated string; the runtime splits on commas during update.', 'A training-video workflow applies tags from the course category record.', 'Blank tags are allowed; malformed tags may be ignored or rejected by YouTube.', 'Do not enter a JSON array here; this field is comma-separated text.'),
  },
  {
    name: 'Video URL',
    internalKey: 'videoUrl',
    type: 'url',
    required: false,
    description: 'Public video file URL for upload.',
    placeholder: 'https://cdn.example.com/video.mp4',
    helpText: help('Video URL is a direct URL to the video bytes for upload_video.', 'The upload operation needs either videoUrl or videoDataBase64 to provide the actual file content.', 'Fill it for upload_video when the file is hosted at a reachable URL.', 'Paste a direct public HTTPS file URL or map {{$json.videoUrl}} from a file/rendering step.', 'Comes from S3, GCS, CDN, DAM, video renderer, or file export step.', 'Direct http/https URL to a video file.', 'A webinar workflow uploads the final MP4 from a storage URL after editing completes.', 'If both videoUrl and videoDataBase64 are blank, upload_video fails.', 'Do not paste a YouTube watch URL or a webpage containing the file.'),
  },
  {
    name: 'Video Data Base64',
    internalKey: 'videoDataBase64',
    type: 'textarea',
    required: false,
    description: 'Base64-encoded video file content for upload.',
    placeholder: 'AAAAIGZ0eXBtcDQy...',
    helpText: help('Video Data Base64 is the video file encoded as base64 text.', 'It is the alternative to videoUrl when the workflow already holds file bytes.', 'Fill it for upload_video only when a previous binary/file node produced base64 content.', 'Map {{$json.dataBase64}} or {{$json.videoDataBase64}} from a file-processing step.', 'Comes from Read Binary File, generated assets, or an upload form that produced base64.', 'Base64 string representing the video bytes.', 'A private asset workflow avoids public hosting by passing base64 video bytes from a secure file step.', 'Invalid or missing base64 can fail upload or create corrupt content.', 'Do not paste normal text or a URL into this field.'),
  },
  {
    name: 'MIME Type',
    internalKey: 'mimeType',
    type: 'string',
    required: false,
    description: 'Content type of the uploaded video.',
    placeholder: 'video/mp4',
    defaultValue: 'video/mp4',
    helpText: help('MIME Type tells the upload session what kind of video file is being sent.', 'YouTube needs it to process videoUrl or base64 uploads correctly.', 'Fill it for upload_video when the file is not MP4 or when a prior step knows the exact MIME type.', 'Enter video/mp4, video/quicktime, or map {{$json.mimeType}} from a file metadata step.', 'Comes from file metadata, the encoder, or storage object headers.', 'Valid MIME type string.', 'A video renderer outputs {{$json.mimeType}} and the YouTube node sends it with the upload.', 'Wrong MIME type can make YouTube reject or mis-handle the upload.', 'Do not use a file extension like .mp4 instead of video/mp4.'),
  },
  {
    name: 'Privacy Status',
    internalKey: 'privacyStatus',
    type: 'select',
    required: false,
    description: 'Initial privacy for uploaded video.',
    options: ['private', 'unlisted', 'public'],
    defaultValue: 'private',
    helpText: help('Privacy Status controls whether an uploaded video starts private, unlisted, or public.', 'It prevents accidental public publishing when videos still need review.', 'Fill it for upload_video; default private is safest for testing.', 'Choose private for drafts, unlisted for review links, or public for approved releases.', 'Comes from the publishing workflow stage or approval status.', 'private, unlisted, or public exactly.', 'A training workflow uploads as unlisted so reviewers can check the video before public release.', 'Invalid privacy values are rejected by YouTube.', 'Do not set public by default on automated upload workflows without approval.'),
  },
  {
    name: 'Made For Kids',
    internalKey: 'madeForKids',
    type: 'boolean',
    required: false,
    description: 'Whether the uploaded video is made for children.',
    defaultValue: 'false',
    helpText: help('Made For Kids is the YouTube child-directed-content declaration.', 'It affects compliance and YouTube features for uploaded videos.', 'Fill it for upload_video based on the content owner decision.', 'Use true only when the video is made for children; otherwise leave false.', 'Comes from compliance review, content policy, or channel publishing rules.', 'Boolean true or false.', 'An education channel marks a preschool tutorial as madeForKids=true after compliance review.', 'Wrong values may create policy or monetization problems.', 'Do not guess; use the content owner/compliance decision.'),
  },
  {
    name: 'Category ID',
    internalKey: 'categoryId',
    type: 'string',
    required: false,
    description: 'YouTube video category ID.',
    placeholder: '22',
    defaultValue: '22',
    helpText: help('Category ID is YouTube numeric metadata for the uploaded video category.', 'It is included in the video snippet during upload.', 'Fill it for upload_video when your channel needs a specific category.', 'Enter a YouTube category ID such as 22 for People & Blogs, or map {{$json.categoryId}}.', 'Comes from YouTube category lists or your channel publishing rules.', 'Numeric category ID string.', 'A tutorial channel uses category 27 for Education when uploading training videos.', 'Invalid categories can be rejected by YouTube.', 'Do not type category names like Education unless a prior step converts them to IDs.'),
  },
  {
    name: 'Video ID',
    internalKey: 'videoId',
    type: 'string',
    required: false,
    description: 'YouTube video ID.',
    placeholder: 'dQw4w9WgXcQ',
    helpText: help('Video ID identifies the YouTube video to inspect, update, or delete.', 'get_video_stats, update_video_metadata, and delete_video need it to target the correct video.', 'Fill it for those operations.', 'Paste the ID from a watch URL or map {{$json.videoId}} from upload/search output.', 'Comes from YouTube upload response, search result, or URL after v=.', 'YouTube video ID string, usually 11 characters.', 'A performance report maps {{$json.videoId}} to fetch statistics for a campaign video.', 'Blank videoId fails stats, update, and delete operations.', 'Do not paste the full watch URL into this field.'),
  },
  {
    name: 'Channel ID',
    internalKey: 'channelId',
    type: 'string',
    required: false,
    description: 'YouTube channel ID.',
    placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxx',
    helpText: help('Channel ID identifies a YouTube channel for get_channel or optional search filtering.', 'It lets the node read a specific channel or restrict search results to that channel.', 'Fill it for get_channel when you do not want the authenticated channel, or for search_videos to filter.', 'Paste a channel ID starting with UC, or map {{$json.channelId}} from list_my_channels.', 'Comes from YouTube Studio, channel URLs, or list_my_channels output.', 'YouTube channel ID string, usually starting with UC.', 'A competitor-monitoring workflow searches only videos from a known channel ID.', 'Blank channelId makes get_channel use mine=true where supported and search_videos search globally.', 'Do not use the channel handle @name if the API expects channelId.'),
  },
  {
    name: 'Search Query',
    internalKey: 'query',
    type: 'string',
    required: false,
    description: 'Video search keywords.',
    placeholder: 'workflow automation tutorial',
    helpText: help('Search Query is the phrase sent to YouTube search.', 'search_videos requires it to find matching videos.', 'Fill it for operation=search_videos.', 'Enter keywords or map {{$json.query}} from a monitoring/reporting step.', 'Comes from a search rule, campaign topic, training catalog, or user form.', 'Plain text search query.', 'A market research workflow searches "workflow automation tutorial" and summarizes the top videos.', 'Blank query returns YOUTUBE_FAILED for search_videos.', 'Do not use JSON or SQL-like filters here.'),
  },
  {
    name: 'Max Results',
    internalKey: 'maxResults',
    type: 'number',
    required: false,
    description: 'Maximum YouTube records to return.',
    placeholder: '10',
    defaultValue: '10',
    helpText: help('Max Results controls result count for list_my_channels and search_videos.', 'It keeps payload size and quota usage manageable.', 'Fill it when the default 10 is too low or too high.', 'Enter a number from 1 to 50; the runtime clamps values to YouTube limits.', 'Comes from dashboard/report needs or a user-selected page size.', 'Whole number, clamped between 1 and 50.', 'A daily trend workflow fetches the top 25 videos for a topic.', 'Invalid values fall back to 10 or are clamped.', 'Do not request 500 results; this node caps at 50 per request.'),
  },
  {
    name: 'Access Token',
    internalKey: 'accessToken',
    type: 'string',
    required: false,
    description: 'Deprecated direct OAuth token fallback.',
    helpText: help('Access Token is a deprecated raw token fallback for older workflows.', 'The registry override prefers a saved YouTube OAuth credential with required scopes.', 'Leave it blank for normal visual workflows.', 'Use Connections instead; if migrating old workflows, provide the OAuth access token only temporarily.', 'Comes from Google OAuth but should be stored in the credential vault.', 'Secret OAuth token string.', 'A migration workflow removes accessToken after confirming the saved YouTube connection works.', 'Expired tokens cause YOUTUBE_FAILED authorization errors.', 'Do not paste Google access tokens into normal workflow input data.'),
  },
];

const outputDescription = 'success: true when the registry-owned YouTube operation succeeds. operation: normalized operation value after alias handling. items and pageInfo: returned by list_my_channels and search_videos. channel, channelId, and title: flattened channel details for channel reads. video, videoId, title, url, privacyStatus, and statistics: returned by video stats/upload/update operations. deleted: true after delete_video. _error and _errorDetails / YOUTUBE_FAILED: returned when OAuth is missing, query/videoId/title/video data is missing, an unsupported operation is selected, the video is not found, or the YouTube API rejects the request.';

const baseInput = {
  operation: 'list_my_channels',
  title: 'Q3 product demo',
  description: '{{$json.description}}',
  tags: 'automation, workflow, tutorial',
  videoUrl: '{{$json.videoUrl}}',
  videoDataBase64: '{{$json.dataBase64}}',
  mimeType: 'video/mp4',
  privacyStatus: 'private',
  madeForKids: 'false',
  categoryId: '22',
  videoId: '{{$json.videoId}}',
  channelId: '{{$json.channelId}}',
  query: 'workflow automation tutorial',
  maxResults: '10',
  accessToken: '',
};

function op(name: string, value: string, description: string, inputValues: Record<string, string>): OperationDoc {
  return {
    name,
    value,
    description,
    fields,
    outputExample: {
      success: true,
      operation: value,
      items: [{ id: 'UCxxxxxxxxxxxxxxxxxxxxxx', snippet: { title: 'CtrlChecks' } }],
      channel: { id: 'UCxxxxxxxxxxxxxxxxxxxxxx', title: 'CtrlChecks' },
      video: { id: 'dQw4w9WgXcQ', snippet: { title: 'Q3 product demo' } },
      statistics: { viewCount: '2450', likeCount: '120' },
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      deleted: true,
    },
    outputDescription,
    usageExample: {
      scenario: `${name} supports a video operations workflow such as channel discovery, video search, upload review, metadata update, performance reporting, or owned-video cleanup.`,
      inputValues,
      expectedOutput: 'Downstream nodes can use YouTube fields like {{$json.items}}, {{$json.videoId}}, {{$json.statistics}}, {{$json.url}}, {{$json.deleted}}, or {{$json._error}}.',
    },
    externalDocsUrl: 'https://developers.google.com/youtube/v3/docs',
  };
}

export const youtubeDoc: NodeDoc = {
  slug: 'youtube',
  displayName: 'YouTube',
  category: 'Social',
  logoUrl: '/icons/nodes/youtube.svg',
  description: 'List channels, search videos, upload videos, update metadata, fetch statistics, and delete owned YouTube videos through the YouTube Data API.',
  credentialType: 'YouTube OAuth2 / Google OAuth connection',
  credentialSetupSteps: [
    'Connect YouTube in Connections so CtrlChecks stores the Google OAuth access token in the credential vault and the registry override can resolve it at runtime.',
    'Required scopes include https://www.googleapis.com/auth/youtube.force-ssl for read/write metadata operations and https://www.googleapis.com/auth/youtube.upload for uploading videos.',
    'Test the connection with List My Channels before upload or delete operations. A healthy response returns items and channelId/title data.',
    'Do not store Google OAuth tokens in workflow input fields. accessToken is only a deprecated backend fallback for old workflows.',
    'After configuring the node, connect the output with an outgoing line. Any downstream service node still needs its own account connection.',
  ],
  credentialDocsUrl: 'https://developers.google.com/youtube/v3/guides/auth/installed-apps',
  resources: [
    {
      name: 'YouTube Data API',
      description: 'The YouTube node is executed by worker/src/core/registry/overrides/youtube.ts. The legacy switch path delegates to this registry-owned executor.',
      operations: [
        op('Read channels and search videos', 'list_my_channels', 'Covers list_my_channels, get_channel, and search_videos. Use these operations to discover authenticated channels, inspect a specific channel, or search YouTube videos by query and optional channel.', baseInput),
        op('Upload and update videos', 'upload_video', 'Covers upload_video and update_video_metadata. Upload requires title and either videoUrl or videoDataBase64; update requires videoId and at least one of title, description, or tags.', { ...baseInput, operation: 'upload_video' }),
        op('Fetch statistics or delete video', 'get_video_stats', 'Covers get_video_stats and delete_video. Both require videoId and operate on videos the connected account can access, with delete_video returning deleted: true on success.', { ...baseInput, operation: 'get_video_stats' }),
      ],
    },
  ],
  commonErrors: [
    { error: 'YouTube OAuth token not found. Connect YouTube before running this node.', cause: 'No saved YouTube credential or deprecated accessToken fallback was available.', fix: 'Connect YouTube in Connections with the required scopes and rerun List My Channels.' },
    { error: 'query is required for search_videos', cause: 'Search Videos was selected without a search query.', fix: 'Enter Search Query or map {{$json.query}} from a previous step.' },
    { error: 'videoId is required for get_video_stats', cause: 'The stats operation had no target video ID.', fix: 'Map the ID from upload/search output or paste the value after v= from the YouTube URL.' },
    { error: 'videoId is required for update_video_metadata', cause: 'Update metadata had no target video ID.', fix: 'Fill Video ID and at least one of Title, Description, or Tags.' },
    { error: 'At least one of title, description, or tags is required for update_video_metadata', cause: 'Update metadata would not change anything.', fix: 'Provide one metadata field to update.' },
    { error: 'videoId is required for delete_video', cause: 'Delete Video had no target video ID.', fix: 'Map {{$json.videoId}} from a prior YouTube operation.' },
    { error: 'YouTube operation "<operation>" is not supported yet. Select a supported YouTube v1 operation.', cause: 'A stale/generated operation such as create_post, reply_comment, or get_comments was selected.', fix: 'Choose one of the seven supported YouTube operations in the dropdown.' },
    { error: 'YOUTUBE_FAILED', cause: 'The YouTube API rejected the request because of missing scopes, invalid data, upload failure, not found video, or permission limits.', fix: 'Reconnect YouTube with youtube.force-ssl/youtube.upload scopes and verify the input fields.' },
  ],
  relatedNodes: ['google_drive', 'read_binary_file', 'twitter', 'linkedin'],
};
