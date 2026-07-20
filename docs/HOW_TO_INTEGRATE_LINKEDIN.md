# How to Integrate LinkedIn in Your Application

This guide shows you how to integrate LinkedIn functionality in different parts of your CtrlChecks application.

## 📋 Table of Contents

1. [Frontend Integration](#frontend-integration)
2. [Workflow Integration](#workflow-integration)
3. [Component Integration](#component-integration)
4. [API Integration](#api-integration)
5. [Custom Integration Examples](#custom-integration-examples)

---

## Frontend Integration

### 1. Using the LinkedIn Connection Status Component

The `LinkedInConnectionStatus` component is already available and can be used anywhere in your app:

```tsx
import LinkedInConnectionStatus from '@/components/LinkedInConnectionStatus';

function MyComponent() {
  return (
    <div>
      <h2>LinkedIn Connection</h2>
      <LinkedInConnectionStatus 
        onConnect={() => console.log('Connected!')}
        onDisconnect={() => console.log('Disconnected!')}
      />
    </div>
  );
}
```

**Props:**
- `onConnect?: () => void` - Callback when user connects
- `onDisconnect?: () => void` - Callback when user disconnects
- `compact?: boolean` - Show compact version (just icon)

### 2. Using the Connections Panel

The `ConnectionsPanel` component provides a full UI for managing connections:

```tsx
import ConnectionsPanel from '@/components/ConnectionsPanel';

function SettingsPage() {
  return (
    <div>
      <h1>Connections</h1>
      <ConnectionsPanel />
    </div>
  );
}
```

### 3. Manual OAuth Connection

To manually trigger LinkedIn OAuth:

```tsx
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();

  const handleConnectLinkedIn = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth/linkedin/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            scope: 'openid profile email w_member_social',
          },
        },
      });

      if (error) throw error;

      toast({
        title: 'Redirecting to LinkedIn...',
        description: 'Please authorize access to LinkedIn services',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect LinkedIn',
        variant: 'destructive',
      });
    }
  };

  return (
    <button onClick={handleConnectLinkedIn}>
      Connect LinkedIn
    </button>
  );
}
```

### 4. Check Connection Status

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('linkedin_oauth_tokens')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error:', error);
          setIsConnected(false);
          return;
        }

        if (data) {
          const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
          const now = new Date();
          setIsConnected(expiresAt ? expiresAt > now : true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setIsConnected(false);
      }
    };

    checkStatus();
  }, [user]);

  return (
    <div>
      {isConnected ? (
        <p>✅ LinkedIn Connected</p>
      ) : (
        <p>❌ LinkedIn Not Connected</p>
      )}
    </div>
  );
}
```

---

## Workflow Integration

### 1. Adding LinkedIn Node to Workflow

LinkedIn nodes can be added to workflows with different operations:

#### Get Profile

```json
{
  "id": "linkedin-profile",
  "type": "linkedin",
  "config": {
    "operation": "get_profile"
  }
}
```

#### Create Post

```json
{
  "id": "linkedin-post",
  "type": "linkedin",
  "config": {
    "operation": "post",
    "text": "Hello from CtrlChecks! 🚀",
    "visibility": "PUBLIC"
  }
}
```

#### Get Posts

```json
{
  "id": "linkedin-posts",
  "type": "linkedin",
  "config": {
    "operation": "get_posts",
    "count": 10
  }
}
```

#### Delete Post

```json
{
  "id": "linkedin-delete",
  "type": "linkedin",
  "config": {
    "operation": "delete_post",
    "postUrn": "urn:li:ugcPost:xxxxx"
  }
}
```

### 2. Using Expressions in LinkedIn Nodes

You can use expressions to dynamically set values:

```json
{
  "type": "linkedin",
  "config": {
    "operation": "post",
    "text": "{{input.message}} - Posted at {{$now}}",
    "visibility": "{{input.visibility || 'PUBLIC'}}"
  }
}
```

### 3. Chaining LinkedIn Operations

```json
{
  "nodes": [
    {
      "id": "get-profile",
      "type": "linkedin",
      "config": {
        "operation": "get_profile"
      }
    },
    {
      "id": "create-post",
      "type": "linkedin",
      "config": {
        "operation": "post",
        "text": "My name is {{get-profile.profile.firstName}} {{get-profile.profile.lastName}}",
        "visibility": "PUBLIC"
      }
    }
  ]
}
```

---

## Component Integration

### 1. Add LinkedIn Button to Your Component

```tsx
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export function MyLinkedInButton() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please sign in first',
        variant: 'destructive',
      });
      return;
    }

    const redirectUrl = `${window.location.origin}/auth/linkedin/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          scope: 'openid profile email w_member_social',
        },
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

  return (
    <Button onClick={handleConnect}>
      Connect LinkedIn
    </Button>
  );
}
```

### 2. Display LinkedIn Connection Status

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function LinkedInStatus() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const authToken = (await supabase.auth.getSession()).data.session?.access_token;
        if (!authToken) {
          setConnected(false);
          setLoading(false);
          return;
        }

        const response = await fetch('/api/connections/linkedin/status', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConnected(data.connected);
        }
      } catch (error) {
        console.error('Error:', error);
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>LinkedIn Connected</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>LinkedIn Not Connected</span>
        </>
      )}
    </div>
  );
}
```

---

## API Integration

### 1. Check Connection Status

```typescript
async function checkLinkedInStatus() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/connections/linkedin/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check status');
  }

  return await response.json();
}

// Usage
const status = await checkLinkedInStatus();
console.log('Connected:', status.connected);
```

### 2. Test Connection

```typescript
async function testLinkedInConnection() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/connections/linkedin/test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Test failed');
  }

  return await response.json();
}

// Usage
const result = await testLinkedInConnection();
console.log('Profile:', result.profile);
```

### 3. Refresh Token

```typescript
async function refreshLinkedInToken() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/connections/linkedin/refresh-now', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Refresh failed');
  }

  return await response.json();
}

// Usage
await refreshLinkedInToken();
console.log('Token refreshed');
```

### 4. Disconnect

```typescript
async function disconnectLinkedIn() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/connections/linkedin', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Disconnect failed');
  }

  return await response.json();
}

// Usage
await disconnectLinkedIn();
console.log('Disconnected');
```

---

## Custom Integration Examples

### Example 1: LinkedIn Post Button

```tsx
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export function LinkedInPostButton({ text }: { text: string }) {
  const { user } = useAuth();
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    setPosting(true);

    try {
      // Execute workflow with LinkedIn node
      const response = await fetch('/api/execute-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow: {
            nodes: [
              {
                id: 'linkedin-post',
                type: 'linkedin',
                config: {
                  operation: 'post',
                  text: text,
                  visibility: 'PUBLIC',
                },
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to post');
      }

      const result = await response.json();
      alert('Posted successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Button onClick={handlePost} disabled={posting}>
      {posting ? 'Posting...' : 'Post to LinkedIn'}
    </Button>
  );
}
```

### Example 2: LinkedIn Profile Display

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function LinkedInProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/execute-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow: {
              nodes: [
                {
                  id: 'get-profile',
                  type: 'linkedin',
                  config: {
                    operation: 'get_profile',
                  },
                },
              ],
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setProfile(result.profile);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (!profile) {
    return <div>No LinkedIn profile found</div>;
  }

  return (
    <div>
      <h2>LinkedIn Profile</h2>
      <p>Name: {profile.firstName} {profile.lastName}</p>
      <p>Headline: {profile.headline}</p>
    </div>
  );
}
```

### Example 3: LinkedIn Posts Feed

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function LinkedInPostsFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/execute-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow: {
              nodes: [
                {
                  id: 'get-posts',
                  type: 'linkedin',
                  config: {
                    operation: 'get_posts',
                    count: 10,
                  },
                },
              ],
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setPosts(result.posts || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div>
      <h2>LinkedIn Posts</h2>
      {posts.length === 0 ? (
        <p>No posts found</p>
      ) : (
        <ul>
          {posts.map((post, index) => (
            <li key={index}>
              <p>{post.text}</p>
              <small>{new Date(post.created).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Quick Reference

### Available Operations

| Operation | Description | Required Fields |
|-----------|-------------|----------------|
| `get_profile` | Get user profile | None |
| `get_posts` | Get user posts | `count` (optional) |
| `post` | Create a post | `text`, `visibility` (optional) |
| `delete_post` | Delete a post | `postUrn` or `postId` |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connections/linkedin/status` | GET | Get connection status |
| `/api/connections/linkedin/test` | POST | Test connection |
| `/api/connections/linkedin/refresh-now` | POST | Refresh token |
| `/api/connections/linkedin` | DELETE | Disconnect |

### Required Scopes

- `openid` - OIDC sign-in
- `profile` - Basic profile
- `email` - Email address
- `w_member_social` - Post on behalf of user

---

## Next Steps

1. ✅ Set up LinkedIn app in Developer Portal
2. ✅ Configure Supabase OAuth provider
3. ✅ Add environment variables
4. ✅ Test connection in UI
5. ✅ Create workflows with LinkedIn nodes
6. ✅ Build custom components

For detailed setup instructions, see [LinkedIn Supabase Integration Guide](./LINKEDIN_SUPABASE_INTEGRATION_GUIDE.md).
