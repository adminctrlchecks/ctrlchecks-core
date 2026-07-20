# Facebook Node Setup - Quick Start

Quick setup guide for the comprehensive Facebook node implementation.

## Prerequisites

✅ Facebook OAuth already integrated (see [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md))
✅ Access token available in workflow execution context
✅ Facebook app configured with required permissions

## Installation

### 1. Install Dependencies

```bash
cd worker
npm install form-data
npm install --save-dev @types/form-data
```

### 2. Verify Installation

The following files should exist:
- ✅ `worker/src/services/social/facebook-node.ts` - Main node implementation
- ✅ `worker/src/services/social/social-dispatcher.ts` - Updated dispatcher
- ✅ `worker/src/services/social/facebookService.ts` - Legacy service (backward compatible)

## Code Structure

```
worker/src/services/social/
├── facebook-node.ts          # New comprehensive node (resource/operation pattern)
├── facebookService.ts        # Legacy service (still works)
├── social-dispatcher.ts      # Routes to appropriate handler
└── types.ts                  # Common types
```

## Usage in Workflows

### New Pattern (Recommended)

```json
{
  "type": "facebook",
  "config": {
    "resource": "page",
    "operation": "createPost",
    "pageId": "123456789",
    "message": "Hello from CtrlChecks!",
    "link": "https://example.com",
    "published": true
  }
}
```

### Legacy Pattern (Still Supported)

```json
{
  "type": "facebook",
  "config": {
    "operation": "post",
    "message": "Hello!",
    "pageId": "123456789"
  }
}
```

## Available Resources

- `user` - User profile and posts
- `page` - Page management and posts
- `post` - Post operations (comments, likes)
- `photo` - Photo upload and management
- `video` - Video upload and management
- `event` - Event management
- `lead` - Lead retrieval
- `album` - Album management

## Common Operations

### Get User Profile

```json
{
  "resource": "user",
  "operation": "get",
  "fields": "id,name,email,picture"
}
```

### Create Page Post

```json
{
  "resource": "page",
  "operation": "createPost",
  "pageId": "{{input.pageId}}",
  "message": "{{input.message}}",
  "link": "{{input.link}}"
}
```

### Upload Photo

```json
{
  "resource": "photo",
  "operation": "upload",
  "pageId": "{{input.pageId}}",
  "photoUrl": "{{input.imageUrl}}",
  "caption": "Check this out!",
  "published": true
}
```

### List Page Posts

```json
{
  "resource": "page",
  "operation": "listPosts",
  "pageId": "{{input.pageId}}",
  "limit": 50
}
```

### Get Page Insights

```json
{
  "resource": "page",
  "operation": "getInsights",
  "pageId": "{{input.pageId}}",
  "metric": "page_fans,page_impressions",
  "period": "day"
}
```

## Token Handling

The node automatically handles token management:

1. **User Token**: If you provide a user token and `pageId`, it automatically fetches the page token
2. **Page Token**: If you provide a page token directly, it uses it as-is
3. **Caching**: Page tokens are cached during execution to avoid repeated API calls

## File Uploads

### Photo from URL

```json
{
  "resource": "photo",
  "operation": "upload",
  "pageId": "123",
  "photoUrl": "https://example.com/image.jpg"
}
```

### Photo from Base64

```json
{
  "resource": "photo",
  "operation": "upload",
  "pageId": "123",
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

### Video Upload

```json
{
  "resource": "video",
  "operation": "upload",
  "pageId": "123",
  "videoUrl": "https://example.com/video.mp4",
  "title": "My Video",
  "description": "Video description"
}
```

## Testing

### Test in Graph API Explorer

1. Go to https://developers.facebook.com/tools/explorer
2. Select your app
3. Get access token with required permissions
4. Test API calls manually

### Test in Workflow

1. Create a test workflow
2. Add Facebook node
3. Configure resource and operation
4. Run workflow
5. Check output

## Required Permissions

Ensure your Facebook app has these permissions:

- `email`
- `public_profile`
- `pages_manage_posts`
- `pages_read_engagement`
- `pages_show_list`
- `pages_read_user_content`
- `pages_manage_metadata`

## Error Handling

Errors are returned in a consistent format:

```json
{
  "success": false,
  "resource": "page",
  "operation": "createPost",
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "code": "100"
  }
}
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Test with simple operation (get user profile)
3. ✅ Test page operations
4. ✅ Test file uploads
5. ✅ Integrate into your workflows

## Documentation

- **Full Implementation Guide**: [FACEBOOK_NODE_IMPLEMENTATION.md](./FACEBOOK_NODE_IMPLEMENTATION.md)
- **OAuth Setup**: [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md)
- **Facebook Graph API**: https://developers.facebook.com/docs/graph-api

## Support

For issues:
1. Check error messages - they include Facebook error codes
2. Verify token has required permissions
3. Test in Graph API Explorer
4. Check Facebook API status
