import type { DocsSearchIndexItem } from '../search-index';

export const twitterSearchIndex = [
  { type: 'node', title: 'Twitter/X', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter', text: 'Twitter X OAuth2 tweet user timeline search list media direct message space' },
  { type: 'operation', title: 'Twitter/X: Tweet actions', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter#operation-tweet', text: 'tweet create get lookup delete like retweet quoteTweet reply bookmark getBookmarks' },
  { type: 'operation', title: 'Twitter/X: User and timeline actions', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter#operation-user_timeline', text: 'user get getMe lookup follow unfollow followers following block mute timeline mentions' },
  { type: 'operation', title: 'Twitter/X: Search list media DM Space actions', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter#operation-advanced', text: 'search recent tweetCounts all list media upload metadata directMessage send space search' },
  { type: 'field', title: 'Twitter/X: Resource', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter', text: 'resource tweet user timeline search list media directMessage space' },
  { type: 'field', title: 'Twitter/X: Operation', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter', text: 'operation create get recent upload send getMe valid resource operation pair' },
  { type: 'field', title: 'Twitter/X: Tweet ID', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter', text: 'tweetId status URL ID reply like delete retweet bookmark' },
  { type: 'field', title: 'Twitter/X: Query', slug: 'twitter', category: 'Social', href: '/docs/nodes/twitter', text: 'query search recent all tweetCounts space search X search syntax' },
] satisfies DocsSearchIndexItem[];
