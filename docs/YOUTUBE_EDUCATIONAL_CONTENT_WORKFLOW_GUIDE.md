# YouTube Educational Content Creation Workflow Guide

## Use Case Overview

**Scenario**: A YouTube content creator wants to automate the creation and publishing of educational biology content for Class 9 students.

**Workflow Requirements**:
1. **LLM Integration**: Generate biology chapter content/textual data using AI
2. **Video Generation**: Convert textual data into diagram/video presentations using Google Veo or similar video generation tools
3. **Automated Publishing**: Post the generated video to YouTube automatically at 9 AM every day

---

## Current Project Capabilities Analysis

### ✅ **Available Components**

#### 1. **LLM Integration** ✅ FULLY SUPPORTED
The project has comprehensive LLM integration capabilities:

- **Available LLM Nodes**:
  - `openai_gpt` - OpenAI GPT models (GPT-4, GPT-3.5)
  - `anthropic_claude` - Anthropic Claude models
  - `google_gemini` - Google Gemini models
  - `ollama` - Local Ollama models

- **Capabilities**:
  - Text generation from prompts
  - Content summarization
  - Structured data extraction
  - Custom prompt configuration
  - Temperature and token controls

- **Usage Example**:
  ```json
  {
    "type": "openai_gpt",
    "config": {
      "model": "gpt-4",
      "prompt": "Generate comprehensive biology chapter content for Class 9 students about cell structure. Include diagrams descriptions, key concepts, and explanations.",
      "temperature": 0.7,
      "maxTokens": 2000
    }
  }
  ```

#### 2. **YouTube Integration** ✅ FULLY SUPPORTED
The project has a dedicated YouTube node with comprehensive functionality:

- **Available Operations**:
  - `upload_video` - Upload videos to YouTube
  - `update_video` - Update video metadata
  - `delete_video` - Delete videos
  - `get_channel` - Get channel details
  - `get_video_stats` - Get video statistics
  - `search_videos` - Search for videos
  - `get_comments` - Get video comments
  - `reply_comment` - Reply to comments

- **Required Credentials**:
  - YouTube Data API v3 Key
  - OAuth 2.0 Access Token (for upload operations)
  - Required scopes: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube`

- **Configuration Fields**:
  - `videoUrl` - URL to the video file (MP4, MOV, AVI)
  - `title` - Video title (max 100 characters)
  - `description` - Video description with keywords
  - `tags` - Comma-separated tags
  - `privacyStatus` - Public, Unlisted, or Private
  - `channelId` - Target channel ID

- **Limitations**:
  - Video must be hosted at a publicly accessible URL
  - Maximum file size: 128GB
  - Maximum duration: 12 hours
  - Supported formats: MP4, MOV, AVI

#### 3. **Scheduling** ✅ FULLY SUPPORTED
The project has a Schedule Trigger node for time-based automation:

- **Schedule Trigger Node** (`schedule`):
  - **Time Format**: HH:MM (24-hour format)
  - **Timezone Support**: Configurable timezone (default: Asia/Kolkata)
  - **Daily Execution**: Can run at specific times every day
  - **Example**: Set time to `09:00` for 9 AM execution

- **Configuration**:
  ```json
  {
    "type": "schedule",
    "config": {
      "time": "09:00",
      "timezone": "America/New_York"
    }
  }
  ```

- **Alternative**: Interval Trigger (`interval`) for recurring intervals

#### 4. **HTTP Request Node** ✅ AVAILABLE
The project has an HTTP Request node that can make API calls:

- **Capabilities**:
  - GET, POST, PUT, DELETE, PATCH methods
  - Custom headers
  - JSON body support
  - Timeout configuration
  - Retry logic

- **Use Case**: Can be used to call external APIs (like Google Veo API) if available

---

### ❌ **Missing Components**

#### 1. **Google Veo Integration** ❌ NOT AVAILABLE
**Status**: Google Veo video generation is **NOT currently implemented** in the project.

**What's Missing**:
- No dedicated Google Veo node
- No text-to-video generation capability
- No diagram-to-video conversion
- No video generation API integration

**Current State**:
- The project has image processing capabilities (`text_to_image` for generating images)
- Video generation functionality is not present in the codebase

**What Would Be Needed**:
1. **Google Veo API Integration**:
   - Google Veo API endpoint integration
   - API key/authentication setup
   - Text-to-video prompt handling
   - Video generation status polling
   - Video file download/retrieval

2. **New Node Implementation**:
   - Create a `google_veo` node type
   - Implement video generation logic
   - Handle video file storage/retrieval
   - Add error handling for generation failures

3. **Alternative Solutions**:
   - Use HTTP Request node to call Google Veo API directly (if API is available)
   - Integrate other video generation services (RunwayML, Pika Labs, etc.)
   - Use text-to-image + image-to-video pipeline

---

## Implementation Guide

### **Option 1: Using HTTP Request Node (Workaround)**

If Google Veo API is available, you can use the HTTP Request node as a workaround:

#### Workflow Structure:
```
1. Schedule Trigger (9 AM daily)
   ↓
2. LLM Node (Generate biology content)
   ↓
3. HTTP Request Node (Call Google Veo API)
   ↓
4. Wait/Poll Node (Wait for video generation)
   ↓
5. HTTP Request Node (Download generated video)
   ↓
6. YouTube Node (Upload video)
```

#### Step-by-Step Configuration:

**Step 1: Schedule Trigger**
- Type: `schedule`
- Time: `09:00`
- Timezone: Your timezone

**Step 2: LLM Node (Content Generation)**
- Type: `openai_gpt` or `google_gemini`
- Prompt: `"Generate comprehensive biology chapter content for Class 9 students about [TOPIC]. Include detailed descriptions of diagrams, key concepts, and explanations suitable for video narration."`
- Output: Structured text content

**Step 3: HTTP Request Node (Google Veo API Call)**
- Method: `POST`
- URL: `https://veo-api.googleapis.com/v1/generate` (example - actual URL may differ)
- Headers:
  ```json
  {
    "Authorization": "Bearer YOUR_GOOGLE_VEO_API_KEY",
    "Content-Type": "application/json"
  }
  ```
- Body:
  ```json
  {
    "prompt": "{{input.response_text}}",
    "duration": 60,
    "style": "educational_diagram"
  }
  ```

**Step 4: Poll for Video Generation**
- Use JavaScript node or Loop node to poll Google Veo API
- Check video generation status
- Wait until video is ready

**Step 5: Download Video**
- HTTP Request node to download video from Google Veo
- Store video URL for YouTube upload

**Step 6: YouTube Upload**
- Type: `youtube`
- Operation: `upload_video`
- Video URL: URL from Step 5
- Title: Generated from LLM content
- Description: Full biology content
- Privacy Status: `public`

---

### **Option 2: Implement Google Veo Node (Recommended)**

To properly support this use case, a dedicated Google Veo node should be implemented.

#### Implementation Requirements:

1. **Create Google Veo Node Definition**:
   - Location: `worker/src/nodes/definitions/google-veo-node.ts`
   - Node type: `google_veo`
   - Category: `ai` or `media`

2. **Required Configuration Fields**:
   - `apiKey` - Google Veo API key
   - `prompt` - Text prompt for video generation
   - `duration` - Video duration in seconds
   - `style` - Video style (educational, diagram, etc.)
   - `resolution` - Video resolution
   - `pollInterval` - Polling interval for status checks

3. **Node Implementation**:
   ```typescript
   // Pseudo-code:
   1. Call Google Veo API with prompt
   2. Receive job ID
   3. Poll API for generation status
   4. Download video when ready
   5. Return video URL
   ```

4. **Integration Points**:
   - Add to node registry
   - Add to node types definition
   - Add execution logic in `execute-workflow.ts`
   - Add to workflow builder

---

### **Option 3: Alternative Video Generation Services**

If Google Veo is not available, consider integrating alternative services:

1. **RunwayML API**:
   - Text-to-video generation
   - API available
   - Can be integrated via HTTP Request node

2. **Pika Labs API**:
   - Video generation from text
   - API integration possible

3. **Stable Video Diffusion**:
   - Open-source alternative
   - Requires self-hosting

4. **Image-to-Video Pipeline**:
   - Use existing `text_to_image` node
   - Add image-to-video conversion
   - Chain: Text → Image → Video

---

## Complete Workflow Example (With HTTP Request Workaround)

```json
{
  "name": "Biology Educational Content Automation",
  "nodes": [
    {
      "id": "node_1",
      "type": "schedule",
      "data": {
        "config": {
          "time": "09:00",
          "timezone": "America/New_York"
        }
      }
    },
    {
      "id": "node_2",
      "type": "openai_gpt",
      "data": {
        "config": {
          "model": "gpt-4",
          "prompt": "Generate comprehensive biology chapter content for Class 9 students about cell structure. Include detailed descriptions suitable for creating educational diagrams and video narration.",
          "temperature": 0.7,
          "maxTokens": 2000
        }
      }
    },
    {
      "id": "node_3",
      "type": "http_request",
      "data": {
        "config": {
          "method": "POST",
          "url": "https://veo-api.googleapis.com/v1/generate",
          "headers": {
            "Authorization": "Bearer YOUR_GOOGLE_VEO_API_KEY",
            "Content-Type": "application/json"
          },
          "body": {
            "prompt": "{{input.response_text}}",
            Create an educational video with diagrams showing: {{input.response_text}}",
            "duration": 60,
            "style": "educational"
          }
        }
      }
    },
    {
      "id": "node_4",
      "type": "javascript",
      "data": {
        "config": {
          "code": "// Poll for video generation status\nconst jobId = input.data.job_id;\nlet status = 'processing';\nwhile (status === 'processing') {\n  await new Promise(resolve => setTimeout(resolve, 5000));\n  // Make status check API call\n  status = 'completed';\n}\nreturn { videoUrl: input.data.video_url };"
        }
      }
    },
    {
      "id": "node_5",
      "type": "youtube",
      "data": {
        "config": {
          "operation": "upload_video",
          "videoUrl": "{{input.videoUrl}}",
          "title": "Biology Class 9: Cell Structure - {{$now}}",
          "description": "{{node_2.response_text}}",
          "tags": "biology, class9, education, cell structure",
          "privacyStatus": "public"
        }
      }
    }
  ],
  "edges": [
    { "source": "node_1", "target": "node_2" },
    { "source": "node_2", "target": "node_3" },
    { "source": "node_3", "target": "node_4" },
    { "source": "node_4", "target": "node_5" }
  ]
}
```

---

## Required Credentials Setup

### 1. **OpenAI API Key** (for LLM)
- Get from: https://platform.openai.com/api-keys
- Store in: Credentials vault
- Reference in: LLM node configuration

### 2. **Google Veo API Key** (if available)
- Get from: Google Cloud Console
- Enable: Google Veo API
- Store in: Credentials vault
- Use in: HTTP Request node or dedicated Google Veo node

### 3. **YouTube API Credentials**
- **API Key**: 
  - Get from: Google Cloud Console
  - Enable: YouTube Data API v3
  - Store in: Credentials vault
  
- **OAuth Access Token**:
  - Required for video uploads
  - OAuth 2.0 flow with scopes:
    - `https://www.googleapis.com/auth/youtube.upload`
    - `https://www.googleapis.com/auth/youtube`
  - Store in: Credentials vault

---

## Implementation Checklist

### ✅ **What Can Be Done Now** (Without Code Changes):
- [x] Set up Schedule Trigger for 9 AM daily execution
- [x] Configure LLM node to generate biology content
- [x] Use HTTP Request node to call Google Veo API (if available)
- [x] Configure YouTube node to upload videos
- [x] Chain all nodes together in workflow

### ❌ **What Needs to Be Added**:
- [ ] Google Veo API integration (if API is available)
- [ ] Dedicated Google Veo node implementation
- [ ] Video generation status polling logic
- [ ] Video file download/handling
- [ ] Error handling for video generation failures
- [ ] Video storage/temporary hosting solution

### 🔄 **Alternative Approaches**:
- [ ] Integrate RunwayML API for video generation
- [ ] Implement image-to-video pipeline
- [ ] Use text-to-image + video animation tools
- [ ] Integrate other video generation services

---

## Recommendations

### **Short-term Solution**:
1. Use HTTP Request node to call Google Veo API directly
2. Implement polling logic using JavaScript node
3. Test with a simple workflow first
4. Add error handling and retry logic

### **Long-term Solution**:
1. **Implement dedicated Google Veo node**:
   - Better error handling
   - Built-in polling
   - Status monitoring
   - Video caching

2. **Add video generation service abstraction**:
   - Support multiple video generation services
   - Fallback mechanisms
   - Service comparison/selection

3. **Enhance workflow capabilities**:
   - Video preview before publishing
   - Content approval workflow
   - A/B testing for video styles
   - Analytics integration

---

## Conclusion

**Current Status**: The project has **80% of the required functionality**:
- ✅ LLM integration (content generation)
- ✅ YouTube integration (video publishing)
- ✅ Scheduling (daily automation)
- ❌ Video generation (Google Veo) - **MISSING**

**To Complete the Use Case**:
1. **Option A: Use HTTP Request node** (quick workaround, requires manual API integration)
2. **Option B: Implement Google Veo node** (proper solution, requires development)
3. **Option C: Use alternative video generation service** (may require different API)

**Next Steps**:
1. Verify Google Veo API availability and documentation
2. Decide on implementation approach (HTTP Request vs. dedicated node)
3. Implement video generation integration
4. Test end-to-end workflow
5. Add error handling and monitoring

---

## Additional Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- Schedule Trigger Node: `worker/src/nodes/definitions/schedule-trigger-node.ts`
- YouTube Node Configuration: `ctrl_checks/src/components/workflow/nodeTypes.ts` (lines 6082-6209)
- HTTP Request Node: `worker/src/nodes/definitions/http-request-node.ts`

---

**Last Updated**: 2025-02-02
**Status**: Analysis Complete - Implementation Guide Ready
