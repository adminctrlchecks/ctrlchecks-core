import type { DocsSearchIndexItem } from '../search-index';

export const youtubeSearchIndex = [
  { type: 'node', title: 'YouTube', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube', text: 'YouTube Data API OAuth list channels search videos upload update metadata statistics delete' },
  { type: 'operation', title: 'YouTube: Read channels and search videos', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube#operation-list_my_channels', text: 'list_my_channels get_channel search_videos items pageInfo channelId query maxResults' },
  { type: 'operation', title: 'YouTube: Upload and update videos', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube#operation-upload_video', text: 'upload_video update_video_metadata title description tags videoUrl videoDataBase64 privacyStatus' },
  { type: 'operation', title: 'YouTube: Fetch statistics or delete video', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube#operation-get_video_stats', text: 'get_video_stats delete_video videoId statistics deleted YOUTUBE_FAILED' },
  { type: 'field', title: 'YouTube: Operation', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube', text: 'operation seven supported YouTube v1 registry override operations' },
  { type: 'field', title: 'YouTube: Video ID', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube', text: 'videoId get_video_stats update_video_metadata delete_video watch URL v parameter' },
  { type: 'field', title: 'YouTube: YouTube OAuth scopes', slug: 'youtube', category: 'Social', href: '/docs/nodes/youtube', text: 'youtube.force-ssl youtube.upload credential vault Connections OAuth token' },
] satisfies DocsSearchIndexItem[];
