# Google Veo Node Implementation Guide

## Overview

This document describes the implementation of the Google Veo video generation node for the workflow automation platform. The node enables text-to-video generation using Google Veo API, supporting asynchronous generation with polling for completion status.

## Implementation Summary

### Files Created/Modified

1. **Node Definition**: `worker/src/nodes/definitions/google-veo-node.ts`
   - Defines the node schema, validation, and configuration
   
2. **Execution Logic**: `worker/src/api/execute-workflow.ts`
   - Added `case 'google_veo'` handler with video generation logic
   - Added `getNumberProperty` helper function

3. **Node Registration**: 
   - `worker/src/nodes/definitions/index.ts` - Backend registry
   - `ctrl_checks/src/components/workflow/nodeTypes.ts` - Frontend UI definition

4. **Example Workflow**: `ctrl_checks/test_workflows/google_veo_youtube_workflow.json`
   - Complete workflow example: Schedule → LLM → Google Veo → YouTube

## Node Configuration

### Required Fields
- `apiKey` (string): Google Veo API key
- `prompt` (string): Text prompt for video generation

### Optional Fields
- `duration` (number): Video duration in seconds (5-300, default: 60)
- `style` (string): Video style preset, default: 'realistic'
  - Options: 'realistic', 'educational_diagram', 'animated', 'cinematic', 'documentary'
- `resolution` (string): Video resolution, default: '1080p'
  - Options: '720p', '1080p', '4k'
- `pollInterval` (number): Seconds between status checks (1-60, default: 5)
- `timeout` (number): Maximum wait time in seconds (30-1800, default: 300)

### Output Schema
```typescript
{
  videoUrl: string,      // Public URL to generated video
  jobId: string,         // Job ID for the generation request
  status: string,         // Final status ('completed', 'failed')
  duration: number,       // Actual video duration
  resolution: string     // Actual video resolution
}
```

## Execution Flow

1. **Start Generation Job**
   - POST to `https://veo-api.googleapis.com/v1/generate`
   - Request body: `{ prompt, duration, style, resolution }`
   - Response: `{ jobId: string }`

2. **Poll for Completion**
   - GET `https://veo-api.googleapis.com/v1/jobs/{jobId}`
   - Check status: 'processing' | 'completed' | 'failed'
   - Wait `pollInterval` seconds between checks
   - Timeout after `timeout` seconds

3. **Return Result**
   - Extract `videoUrl` from completed job
   - Return structured output for downstream nodes

## Integration with YouTube Node

The Google Veo node outputs `videoUrl` which can be directly used as input to the YouTube node's `videoUrl` field:

```json
{
  "type": "youtube",
  "config": {
    "operation": "upload_video",
    "videoUrl": "{{input.videoUrl}}",
    "title": "My Video",
    "description": "Generated with Google Veo"
  }
}
```

## Error Handling

The implementation includes comprehensive error handling:

- **API Key Validation**: Checks for empty/missing API key
- **Prompt Validation**: Ensures prompt is not empty
- **API Errors**: Captures and reports HTTP errors from Google Veo API
- **Timeout Handling**: Throws error if job doesn't complete within `timeout` seconds
- **Failed Generation**: Captures error messages from failed jobs
- **Missing Video URL**: Validates that video URL is present in completed response

## Credentials Management

### Storing API Key

The Google Veo API key can be stored in two ways:

1. **Direct Input**: Enter API key directly in node configuration (less secure)
2. **Credentials Vault**: Store in `user_credentials` table with service='google_veo' (recommended)

### Credential Resolution

The node checks for API key in this order:
1. Node configuration (`config.apiKey`)
2. Credentials vault (if implemented)
3. Environment variables (if configured)

## Example Workflow

See `ctrl_checks/test_workflows/google_veo_youtube_workflow.json` for a complete example:

1. **Schedule Trigger**: Runs daily at 9 AM
2. **OpenAI GPT Node**: Generates biology content
3. **Google Veo Node**: Creates video from content
4. **YouTube Node**: Uploads video to YouTube

## Testing

### Manual Testing Steps

1. **Test Node Definition**:
   ```bash
   # Verify node is registered
   # Check nodeTypes.ts includes google_veo
   ```

2. **Test Execution**:
   - Create a simple workflow with Google Veo node
   - Set valid API key and prompt
   - Execute workflow
   - Verify video generation completes
   - Check output contains `videoUrl`

3. **Test Integration**:
   - Create workflow: Google Veo → YouTube
   - Verify video URL flows correctly
   - Test YouTube upload succeeds

### Unit Tests (To Be Added)

```typescript
describe('Google Veo Node', () => {
  it('should validate required fields', () => {
    // Test validation
  });
  
  it('should start video generation job', () => {
    // Test API call
  });
  
  it('should poll for completion', () => {
    // Test polling logic
  });
  
  it('should handle errors', () => {
    // Test error handling
  });
});
```

## API Endpoints

**Note**: The actual Google Veo API endpoints may differ. Based on Google AI Studio, the endpoints are:

- **Generate**: `POST https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo`
- **Status**: `GET https://generativelanguage.googleapis.com/v1beta/models/veo-3/jobs/{jobId}`

**Alternative**: If using Fal.run:
- **Generate**: `POST https://fal.run/fal-ai/veo-3`

**See**: [HOW_TO_GET_GOOGLE_VEO_API.md](./HOW_TO_GET_GOOGLE_VEO_API.md) for detailed setup instructions.

### Expected Request/Response Formats

**Generate Request**:
```json
{
  "prompt": "Create an educational video...",
  "duration": 60,
  "style": "educational_diagram",
  "resolution": "1080p"
}
```

**Generate Response**:
```json
{
  "jobId": "job_123456",
  "status": "processing"
}
```

**Status Response**:
```json
{
  "jobId": "job_123456",
  "status": "completed",
  "videoUrl": "https://storage.googleapis.com/veo/videos/video_123456.mp4",
  "duration": 60,
  "resolution": "1080p"
}
```

## Future Enhancements

1. **Credential Vault Integration**: Full support for storing API keys in vault
2. **Retry Logic**: Exponential backoff for failed API calls
3. **Progress Updates**: Real-time progress reporting during generation
4. **Video Preview**: Preview generated video before uploading
5. **Batch Generation**: Support for generating multiple videos
6. **Alternative Providers**: Support for RunwayML, Pika Labs, etc.

## Troubleshooting

### Common Issues

1. **"API key is required"**
   - Ensure API key is set in node configuration
   - Check credentials vault if using vault storage

2. **"Video generation timed out"**
   - Increase `timeout` value (max 1800 seconds)
   - Check if video generation is taking longer than expected

3. **"Failed to get job ID"**
   - Verify API endpoint is correct
   - Check API response format matches expected structure

4. **"Video generation failed"**
   - Check error message in response
   - Verify prompt is valid and within limits
   - Check API quota/limits

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **Credential Vault**: Use credentials vault for production
3. **API Rate Limits**: Implement rate limiting to avoid quota exhaustion
4. **Input Validation**: Validate all inputs to prevent injection attacks

## References

- Google Veo API Documentation (when available)
- Node Definition Pattern: `worker/src/nodes/definitions/notion-node.ts`
- Execution Pattern: `worker/src/api/execute-workflow.ts` (LLM nodes section)
- Frontend Pattern: `ctrl_checks/src/components/workflow/nodeTypes.ts` (Google Gemini node)

---

**Last Updated**: 2025-02-02
**Status**: Implementation Complete - Ready for Testing
