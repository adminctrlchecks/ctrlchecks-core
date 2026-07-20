# Google Veo3 Duration Limit

## Issue
You set duration to 589 seconds, but the video only generated 8 seconds.

## Explanation

**Fal.ai Veo3 has a maximum duration limit of 8 seconds per video generation.**

This is a limitation of the Veo3 model itself, not a bug in the implementation. The model can only generate videos between 5-8 seconds in a single request.

## What Happens Now

The code has been updated to:
1. ✅ **Automatically cap duration at 8 seconds** - If you request more, it will use 8 seconds
2. ✅ **Log a warning** - You'll see a warning message if you requested more than 8 seconds
3. ✅ **Default to 8 seconds** - The default duration is now 8 seconds (was 60)

## Solutions for Longer Videos

### Option 1: Generate Multiple Segments (Recommended)

Create multiple 8-second videos and combine them:

1. **Split your content** into 8-second segments
2. **Generate each segment** separately using the Google Veo node
3. **Combine videos** using:
   - Video editing software (Premiere, Final Cut, etc.)
   - FFmpeg command line tool
   - Online video concatenation tools
   - Add a "Video Concatenation" node to your workflow (future enhancement)

**Example Workflow:**
```
Schedule → LLM (Generate content) → 
  Split Content (into 8-sec segments) →
  Loop (for each segment) →
    Google Veo (Generate 8-sec video) →
  Combine Videos →
  YouTube Upload
```

### Option 2: Use Video Editing

1. Generate multiple 8-second videos
2. Download all videos
3. Use video editing software to:
   - Add transitions between segments
   - Add background music
   - Add text overlays
   - Combine into one long video

### Option 3: Wait for Model Updates

- Google may release Veo4 or updated models with longer duration support
- Check Fal.ai documentation for model updates
- Monitor for new models with extended duration limits

## Current Limitations

| Model | Max Duration | Resolution | Aspect Ratios |
|-------|-------------|------------|---------------|
| Veo3 (via Fal.ai) | **8 seconds** | 720p, 1080p | 16:9, 9:16 |
| Veo3.1 (if available) | Check Fal.ai docs | Up to 4K | Multiple |

## Updated Configuration

The node now:
- **Default duration**: 8 seconds (changed from 60)
- **Maximum enforced**: 8 seconds (capped automatically)
- **Warning shown**: If you request more than 8 seconds

## Best Practices

1. **Keep prompts focused** - 8 seconds is perfect for:
   - Short explanations
   - Quick demonstrations
   - Educational snippets
   - Social media content

2. **Plan your content** - Break longer content into:
   - Introduction (8 sec)
   - Main points (8 sec each)
   - Conclusion (8 sec)

3. **Use transitions** - When combining segments:
   - Add fade transitions
   - Use consistent style
   - Maintain visual continuity

## Example: 60-Second Video

To create a 60-second video:
1. Generate 8 segments of 8 seconds each (64 seconds total)
2. Each segment covers a specific topic
3. Combine all segments
4. Trim to exactly 60 seconds if needed

## Future Enhancements

Potential workflow improvements:
- **Auto-segmentation**: Split long prompts into 8-second chunks
- **Video concatenation node**: Automatically combine multiple videos
- **Transition effects**: Add transitions between segments
- **Batch generation**: Generate multiple segments in parallel

---

**Status**: This is a model limitation, not a bug
**Workaround**: Generate multiple segments and combine them
**Last Updated**: 2025-02-15
