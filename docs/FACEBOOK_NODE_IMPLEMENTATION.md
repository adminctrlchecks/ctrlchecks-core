# Facebook Node Implementation Guide

Complete guide for the comprehensive Facebook Graph API node implementation.

## Overview

The Facebook node provides a production-ready integration with Facebook's Graph API, supporting multiple resources and operations similar to n8n's Facebook node. It uses a resource/operation pattern for clear, maintainable code.

## Architecture

### Core Components

1. **FacebookNode Class** (`worker/src/services/social/facebook-node.ts`)
   - Main node class handling all Facebook operations
   - Token management with automatic page token fetching
   - Resource-specific operation handlers
   - File upload support (photos/videos from URL or base64)

2. **Social Dispatcher Integration** (`worker/src/services/social/social-dispatcher.ts`)
   - Routes Facebook node operations
   - Supports both new resource/operation pattern and legacy operations
   - Backward compatible with existing workflows

## Installation

### Required Dependencies

The Facebook node requires the following packages (already in your `package.json`):

```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.5"
  }
}
```

### Install Missing Dependencies

If `form-data` is not installed:

```bash
cd worker
npm install form-data
npm install --save-dev @types/form-data
```

## Resources and Operations

### Supported Resources

1. **User** (`user`)
   - `get` - Get user profile
   - `listPosts` / `list` - List user posts
   - `createPost` / `create` - Create post on user timeline

2. **Page** (`page`)
   - `get` - Get page information
   - `list` - List pages user manages
   - `update` - Update page settings
   - `listPosts` - List page posts
   - `createPost` / `create` - Create page post
   - `updatePost` - Update page post
   - `deletePost` - Delete page post
   - `getInsights` - Get page insights

3. **Post** (`post`)
   - `get` - Get single post
   - `listComments` - List post comments
   - `createComment` - Add comment to post
   - `updateComment` - Update comment
   - `deleteComment` - Delete comment
   - `like` - Like/react to post

4. **Photo** (`photo`)
   - `list` / `listPhotos` - List photos from page
   - `upload` / `create` - Upload photo to page
   - `update` - Update photo metadata
   - `delete` - Delete photo

5. **Video** (`video`)
   - `list` / `listVideos` - List videos from page
   - `upload` / `create` - Upload video to page
   - `update` - Update video metadata
   - `delete` - Delete video

6. **Event** (`event`)
   - `list` / `listEvents` - List page events
   - `create` - Create event on page
   - `get` - Get single event
   - `update` - Update event
   - `delete` - Delete event

7. **Lead** (`lead`)
   - `list` / `listLeads` - List leads for page
   - `get` - Get single lead

8. **Album** (`album`)
   - `list` - List page albums
   - `create` - Create album
   - `get` - Get album details
   - `update` - Update album
   - `delete` - Delete album

## Usage Examples

### Example 1: Get User Profile

```typescript
const node = new FacebookNode(accessToken);
const result = await node.execute({
  resource: 'user',
  operation: 'get',
  fields: 'id,name,email,picture'
});

// Result:
// {
//   success: true,
//   resource: 'user',
//   operation: 'get',
//   data: { id: '123', name: 'John Doe', email: '...', picture: {...} },
//   error: null
// }
```

### Example 2: Create Page Post

```typescript
const result = await node.execute({
  resource: 'page',
  operation: 'createPost',
  pageId: '123456789',
  message: 'Hello from CtrlChecks!',
  link: 'https://example.com',
  published: true
});
```

### Example 3: Upload Photo to Page

```typescript
// From URL
const result = await node.execute({
  resource: 'photo',
  operation: 'upload',
  pageId: '123456789',
  photoUrl: 'https://example.com/image.jpg',
  caption: 'Check out this photo!',
  published: true
});

// From Base64
const result = await node.execute({
  resource: 'photo',
  operation: 'upload',
  pageId: '123456789',
  photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  caption: 'Base64 image'
});
```

### Example 4: List Page Posts with Pagination

```typescript
const result = await node.execute({
  resource: 'page',
  operation: 'listPosts',
  pageId: '123456789',
  limit: 50,
  after: 'cursor_string' // Optional, for pagination
});

// Result includes pagination info:
// {
//   success: true,
//   data: [...posts...],
//   pagination: {
//     next: 'next_cursor',
//     cursors: { before: '...', after: '...' }
//   }
// }
```

### Example 5: Get Page Insights

```typescript
const result = await node.execute({
  resource: 'page',
  operation: 'getInsights',
  pageId: '123456789',
  metric: 'page_fans,page_impressions',
  period: 'day',
  since: '1609459200', // Unix timestamp
  until: '1609545600'
});
```

### Example 6: Create Event

```typescript
const result = await node.execute({
  resource: 'event',
  operation: 'create',
  pageId: '123456789',
  name: 'Product Launch',
  startTime: '2024-12-31T18:00:00+0000', // ISO 8601
  endTime: '2024-12-31T20:00:00+0000',
  description: 'Join us for our product launch!',
  location: '123 Main St, City, State'
});
```

## Token Management

### Automatic Page Token Fetching

The node automatically fetches page access tokens when needed:

```typescript
// If you provide a user token and pageId for a page operation,
// the node will automatically fetch the page token
const result = await node.execute({
  resource: 'page',
  operation: 'createPost',
  pageId: '123456789', // Node will fetch page token automatically
  message: 'Hello!'
});
```

### Token Caching

Page tokens are cached in memory during node execution to avoid repeated API calls:

```typescript
// First call fetches and caches the token
await node.execute({ resource: 'page', operation: 'createPost', pageId: '123', ... });

// Subsequent calls use cached token
await node.execute({ resource: 'page', operation: 'createPost', pageId: '123', ... });
```

### Using Page Tokens Directly

If you already have a page token, you can use it directly:

```typescript
const node = new FacebookNode(pageAccessToken);
// No need to provide pageId - token is already for the page
```

## File Uploads

### Photo Upload

Supports both URL and base64:

```typescript
// From URL
{
  resource: 'photo',
  operation: 'upload',
  pageId: '123',
  photoUrl: 'https://example.com/image.jpg'
}

// From Base64
{
  resource: 'photo',
  operation: 'upload',
  pageId: '123',
  photoBase64: 'data:image/jpeg;base64,...'
}
```

### Video Upload

Similar to photos:

```typescript
// From URL
{
  resource: 'video',
  operation: 'upload',
  pageId: '123',
  videoUrl: 'https://example.com/video.mp4',
  title: 'My Video',
  description: 'Video description'
}

// From Base64
{
  resource: 'video',
  operation: 'upload',
  pageId: '123',
  videoBase64: 'data:video/mp4;base64,...',
  title: 'My Video'
}
```

**Note:** Video uploads have a 5-minute timeout to handle large files.

## Error Handling

All errors are caught and returned in a consistent format:

```typescript
{
  success: false,
  resource: 'page',
  operation: 'createPost',
  data: {},
  error: {
    message: 'Error message from Facebook',
    statusCode: 400,
    code: '100',
    type: 'OAuthException'
  }
}
```

### Common Errors

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions
- **400 Bad Request**: Invalid parameters
- **429 Too Many Requests**: Rate limit exceeded

## Pagination

List operations support pagination:

```typescript
// First page
const firstPage = await node.execute({
  resource: 'page',
  operation: 'listPosts',
  pageId: '123',
  limit: 25
});

// Next page using cursor
const nextPage = await node.execute({
  resource: 'page',
  operation: 'listPosts',
  pageId: '123',
  limit: 25,
  after: firstPage.pagination?.cursors?.after
});
```

## Integration with Workflow System

### In execute-workflow.ts

The Facebook node is already integrated. When a node has `type: 'facebook'` and includes `resource` and `operation`:

```typescript
// Workflow node config
{
  type: 'facebook',
  config: {
    resource: 'page',
    operation: 'createPost',
    pageId: '123456789',
    message: '{{input.message}}',
    link: '{{input.link}}'
  }
}
```

The dispatcher automatically routes to `FacebookNode`:

```typescript
// In social-dispatcher.ts
case 'facebook':
  if (config.resource && config.operation) {
    const fbParams: FacebookNodeParams = {
      resource: config.resource,
      operation: config.operation,
      ...restConfig
    };
    return await executeFacebookNode(token, fbParams);
  }
```

### Legacy Support

For backward compatibility, legacy operations still work:

```typescript
{
  type: 'facebook',
  config: {
    operation: 'post', // Legacy operation
    message: 'Hello',
    pageId: '123'
  }
}
```

## Required Permissions (Scopes)

Ensure your Facebook app has the necessary permissions:

- `email` - Access user email
- `public_profile` - Access basic profile
- `pages_manage_posts` - Post to pages
- `pages_read_engagement` - Read page engagement
- `pages_show_list` - List pages user manages
- `pages_read_user_content` - Read page content
- `pages_manage_metadata` - Update page settings

## Environment Variables

No additional environment variables are required. The node uses the access token provided in the execution context.

## Testing

### Unit Testing Example

```typescript
import { FacebookNode } from './facebook-node';

describe('FacebookNode', () => {
  const accessToken = 'test_token';
  const node = new FacebookNode(accessToken);

  it('should get user profile', async () => {
    const result = await node.execute({
      resource: 'user',
      operation: 'get'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

## Performance Considerations

1. **Token Caching**: Page tokens are cached to reduce API calls
2. **Pagination**: Use appropriate `limit` values (max 100)
3. **File Uploads**: Large files may take time; video uploads have 5-minute timeout
4. **Rate Limiting**: Facebook has rate limits; the node doesn't handle retries automatically (use retry wrapper if needed)

## Troubleshooting

### "Page not found or user doesn't have access"

- Ensure the user token has `pages_show_list` permission
- Verify the pageId is correct
- Check that the user is an admin of the page

### "Invalid or expired token"

- Token may have expired
- Token may not have required permissions
- Check token in Facebook Graph API Explorer

### "Missing required parameter"

- Check that all required parameters for the operation are provided
- See parameter requirements in code comments

## Future Enhancements

Potential additions:

1. **Instagram Business Account** integration
2. **Ad Account** management
3. **Webhook** subscription management
4. **Batch requests** for multiple operations
5. **Automatic rate limit handling** with exponential backoff

## API Reference

See `worker/src/services/social/facebook-node.ts` for complete API documentation and type definitions.

## Support

For issues or questions:
1. Check Facebook Graph API documentation: https://developers.facebook.com/docs/graph-api
2. Test in Facebook Graph API Explorer: https://developers.facebook.com/tools/explorer
3. Review error messages - they include Facebook's error codes
