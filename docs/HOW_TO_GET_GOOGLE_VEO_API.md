# How to Get Google Veo API Access

## Overview

Google Veo is Google's text-to-video AI model that can generate high-quality videos from text prompts. This guide explains how to obtain API access and credentials for use with the Google Veo node in your workflow automation platform.

## Method 1: Google AI Studio (Recommended - Easiest)

### Step 1: Visit Google AI Studio
1. Go to **[Google AI Studio](https://aistudio.google.com/api-keys)**
2. Sign in with your Google account

### Step 2: Create API Key
1. Click **"Create API Key"** button
2. Select or create a Google Cloud project
3. Copy the API key immediately (starts with `AIza...`)
   - ⚠️ **Important**: You won't be able to see the key again after closing the dialog
4. Store the key securely

### Step 3: Enable Veo API
1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Select your project
3. Navigate to **"APIs & Services"** → **"Library"**
4. Search for **"Veo API"** or **"Google AI Studio API"**
5. Click **"Enable"**

### Step 4: Verify Access
- Check if Veo models are available in [Google AI Studio Models](https://aistudio.google.com/models/veo-3)
- Available models:
  - **Veo 3.1**: Latest model with 4K output, multiple aspect ratios, native audio
  - **Veo 3 Fast**: Optimized for speed and cost

## Method 2: Google Cloud Vertex AI (For Enterprise)

### Step 1: Set Up Google Cloud Project
1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Create a new project or select existing one
3. Enable billing (required for Vertex AI)

### Step 2: Enable Vertex AI API
1. Navigate to **"APIs & Services"** → **"Library"**
2. Search for **"Vertex AI API"**
3. Click **"Enable"**

### Step 3: Create Service Account
1. Go to **"IAM & Admin"** → **"Service Accounts"**
2. Click **"Create Service Account"**
3. Give it a name (e.g., "veo-api-service")
4. Grant role: **"Vertex AI User"**
5. Click **"Create Key"** → **"JSON"**
6. Download and store the JSON key file securely

### Step 4: Authenticate
Use the service account JSON key for authentication in your application.

## Method 3: Using Fal.run API (Alternative)

If direct Google Veo API access is limited, you can use Fal.run as an intermediary:

### Step 1: Get Fal.run Account
1. Visit **[Fal.run](https://fal.run)**
2. Sign up for an account
3. Get your API key from the dashboard

### Step 2: Use Fal.ai Endpoint
- Fal.ai provides access to Veo3 through their API
- Endpoint: `https://fal.run/fal-ai/veo3` (note: `veo3` not `veo-3`)
- Use your Fal.ai API key instead of Google API key
- **Important**: Make sure your Fal.ai account has access to the Veo3 model
  - Some accounts may need to request access or upgrade
  - Check your Fal.ai dashboard to verify model access

## API Endpoints

### Google AI Studio (Direct)
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
- **Veo Endpoint**: Check [Google AI Studio Documentation](https://ai.google.dev/gemini-api/docs/video)

### Fal.ai (Alternative - Recommended)
- **Base URL**: `https://fal.run`
- **Generate Endpoint**: `https://fal.run/fal-ai/veo3` (note: `veo3` not `veo-3`)
- **Status Endpoint**: `https://queue.fal.run/fal-ai/veo3/{jobId}`

## Configuration in Your Workflow

### Using Google AI Studio API Key
```json
{
  "type": "google_veo",
  "config": {
    "apiKey": "AIza...your-api-key-here",
    "prompt": "Create an educational video...",
    "duration": 60,
    "style": "educational_diagram",
    "resolution": "1080p"
  }
}
```

### Using Fal.run API Key
If using Fal.run, you may need to update the API endpoints in the node implementation:
- Update `GENERATE_ENDPOINT` to Fal.run endpoint
- Use Fal.run API key format

## Important Notes

### API Availability
- **Google AI Studio**: Free tier available, but may have rate limits
- **Vertex AI**: Requires billing, more reliable for production
- **Fal.run**: Third-party service, may have different pricing

### Rate Limits
- Free tier: Limited requests per day
- Paid tier: Higher limits based on usage
- Check current limits in Google Cloud Console

### Pricing
- Google AI Studio: Free tier available, then pay-as-you-go
- Vertex AI: Based on usage (check current pricing)
- Fal.run: Check their pricing page

### Model Versions
- **Veo 3.1**: Best quality, 4K support, multiple aspect ratios
- **Veo 3 Fast**: Faster generation, lower cost, good for social media

## Troubleshooting

### "API key is invalid"
- Verify the API key is correct
- Check if Veo API is enabled in your project
- Ensure you're using the correct project

### "API not enabled"
- Go to Google Cloud Console
- Enable "Veo API" or "Google AI Studio API"
- Wait a few minutes for activation

### "Quota exceeded"
- Check your usage in Google Cloud Console
- Upgrade to paid tier if needed
- Wait for quota reset (usually daily)

### "Access denied"
- Verify your Google account has access
- Check if Veo is available in your region
- Some regions may have limited access

## Testing Your API Key

### Quick Test with cURL
```bash
curl -X POST \
  'https://generativelanguage.googleapis.com/v1beta/models/veo-3:generateVideo' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "A cat playing with a ball",
    "duration": 5
  }'
```

### Test in Your Workflow
1. Create a simple workflow with Google Veo node
2. Enter your API key
3. Use a simple prompt: "A sunset over the ocean"
4. Set duration to 5 seconds (faster for testing)
5. Execute and check for errors

## Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Store in credentials vault
   - Use `.env` files (add to `.gitignore`)

2. **Restrict API key usage**
   - In Google Cloud Console, restrict key to specific APIs
   - Limit to specific IP addresses if possible
   - Set up usage quotas

3. **Rotate keys regularly**
   - Create new keys periodically
   - Revoke old keys when not needed

4. **Monitor usage**
   - Set up billing alerts
   - Monitor API usage in Cloud Console
   - Check for unexpected usage

## Alternative Video Generation Services

If Google Veo API is not available in your region or you need alternatives:

1. **RunwayML API**
   - Visit [RunwayML](https://runwayml.com)
   - Sign up and get API access
   - Similar text-to-video capabilities

2. **Pika Labs API**
   - Check [Pika Labs](https://pika.art)
   - API access may be limited

3. **Stable Video Diffusion**
   - Open-source alternative
   - Requires self-hosting
   - More technical setup

## Next Steps

1. ✅ Get your API key from Google AI Studio
2. ✅ Enable Veo API in Google Cloud Console
3. ✅ Test the API key with a simple request
4. ✅ Configure the Google Veo node in your workflow
5. ✅ Test end-to-end workflow: LLM → Veo → YouTube

## Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Google AI Documentation](https://ai.google.dev/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Veo 3 Model Page](https://aistudio.google.com/models/veo-3)
- [Fal.run Documentation](https://fal.run/docs)

## Support

If you encounter issues:
1. Check [Google AI Studio Status](https://status.cloud.google.com/)
2. Review [Google AI Documentation](https://ai.google.dev/gemini-api/docs)
3. Check API quotas in Google Cloud Console
4. Verify your account has access to Veo models

---

**Last Updated**: 2025-02-02
**Status**: Google Veo API available through Google AI Studio
