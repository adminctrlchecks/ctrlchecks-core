# Facebook Integration - Quick Start

A condensed guide for quickly setting up Facebook OAuth integration.

## Prerequisites Checklist

- [ ] Facebook Developer account
- [ ] Supabase project with admin access
- [ ] Database migration run (`21_social_tokens_unified.sql`)
- [ ] Encryption key generated and set

## 5-Minute Setup

### 1. Create Facebook App (2 min)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"** → Choose **"Consumer"**
3. Fill in app name and email → **"Create App"**
4. Add **"Facebook Login"** product → Select **"Web"** platform
5. Go to **"Facebook Login"** → **"Settings"**
6. Add redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
7. Go to **"Settings"** → **"Basic"**
8. Copy **App ID** and **App Secret** (click "Show" for secret)

### 2. Configure Supabase (1 min)

1. Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Facebook**
3. Paste **App ID** and **App Secret**
4. Add scopes: `email,public_profile,pages_manage_posts,pages_read_engagement`
5. **Authentication** → **URL Configuration**
6. Add redirect: `http://localhost:5173/auth/facebook/callback`

### 3. Set Environment Variables (1 min)

**Backend `.env`:**
```bash
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
ENCRYPTION_KEY=your_32_byte_hex_key
```

**Frontend `.env`:**
```bash
VITE_API_URL=http://localhost:3001
```

### 4. Code Already Done! ✅

The following are already implemented:
- ✅ Facebook callback handler (`ctrl_checks/src/pages/auth/facebook/Callback.tsx`)
- ✅ Route configured (`ctrl_checks/src/App.tsx`)
- ✅ Backend service (`worker/src/services/social/facebookService.ts`)
- ✅ Database schema (`21_social_tokens_unified.sql`)

### 5. Connect Facebook (1 min)

Add this function to your component:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

const connectFacebook = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/auth/facebook/callback`,
      scopes: 'email,public_profile,pages_manage_posts,pages_read_engagement',
    },
  });

  if (error) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  }
};
```

Add this button:

```tsx
<Button onClick={connectFacebook}>
  Connect Facebook
</Button>
```

## Test It

1. Click "Connect Facebook"
2. Authorize on Facebook
3. Should redirect back and show success
4. Check `social_tokens` table in Supabase

## Use in Workflows

```json
{
  "type": "facebook",
  "config": {
    "operation": "post",
    "message": "Hello from CtrlChecks!"
  }
}
```

## Troubleshooting

**Redirect URI mismatch:**
- Check Facebook App → Facebook Login → Settings
- Verify URI matches exactly: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`

**Token not saving:**
- Check backend API is running
- Check browser console for errors
- Verify encryption key is set

**For detailed troubleshooting:** See [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md)

---

**Full Guide:** [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md)
