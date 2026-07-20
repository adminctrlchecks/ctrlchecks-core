# Notion OAuth - Supabase Setup Guide

This guide explains what you need to configure in Supabase for the Notion OAuth integration.

## ✅ What You Need to Do in Supabase

You only need to **run one migration** to create the `notion_oauth_tokens` table. Everything else (RLS policies, triggers, indexes) is included in the migration.

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar

### Step 2: Run the Migration

1. Open the migration file:
   - File location: `ctrl_checks/supabase/migrations/20250201000000_add_notion_oauth_tokens.sql`

2. **Copy the entire contents** of the file (all 60 lines)

3. **Paste it into the Supabase SQL Editor**

4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 3: Verify the Migration

After running, you should see:
- ✅ Success message
- The `notion_oauth_tokens` table created
- RLS policies enabled
- Trigger created
- Index created

You can verify by:
1. Go to **"Table Editor"** in Supabase
2. Look for `notion_oauth_tokens` in the table list
3. Check that it has these columns:
   - `id` (UUID)
   - `user_id` (UUID, references auth.users)
   - `access_token` (TEXT)
   - `refresh_token` (TEXT, nullable)
   - `expires_at` (TIMESTAMPTZ, nullable)
   - `workspace_name` (TEXT, nullable)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

## 🔒 What the Migration Creates

### 1. **Table: `notion_oauth_tokens`**
   - Stores OAuth tokens for each user
   - One token per user (UNIQUE constraint on `user_id`)
   - Automatically cascades delete when user is deleted

### 2. **Row Level Security (RLS) Policies**
   - ✅ Users can only view their own tokens
   - ✅ Users can only insert their own tokens
   - ✅ Users can only update their own tokens
   - ✅ Users can only delete their own tokens

### 3. **Automatic Timestamp Updates**
   - Trigger automatically updates `updated_at` when a row is modified

### 4. **Performance Index**
   - Index on `user_id` for fast token lookups

## ✅ That's It!

No additional configuration needed. The migration handles:
- ✅ Table creation
- ✅ Security policies (RLS)
- ✅ Data integrity (foreign keys, constraints)
- ✅ Performance (indexes)
- ✅ Automatic updates (triggers)

## 🧪 Testing

After running the migration, test the connection:

1. Start your backend: `cd worker && npm run dev`
2. Start your frontend: `cd ctrl_checks && npm run dev`
3. Go to your app and click **"Connections"** in the header
4. Click **"Connect"** next to Notion
5. Complete the OAuth flow
6. Check Supabase Table Editor - you should see a new row in `notion_oauth_tokens`

## 🔍 Troubleshooting

### "Table already exists" error
- The migration uses `CREATE TABLE IF NOT EXISTS`, so this shouldn't happen
- If it does, the table might have been created manually - that's okay, the migration will skip it

### "Permission denied" error
- Make sure you're running the SQL as a user with admin privileges
- In Supabase, you should be logged in as the project owner

### RLS policies not working
- Check that RLS is enabled: `ALTER TABLE public.notion_oauth_tokens ENABLE ROW LEVEL SECURITY;`
- Verify policies exist in: **Authentication** → **Policies** → `notion_oauth_tokens`

## 📝 Migration File Location

```
ctrl_checks/supabase/migrations/20250201000000_add_notion_oauth_tokens.sql
```

## 🎯 Next Steps

After running the migration:

1. ✅ Add Notion OAuth credentials to backend `.env`:
   ```env
   NOTION_OAUTH_CLIENT_ID=your_client_id
   NOTION_OAUTH_CLIENT_SECRET=your_client_secret
   ```

2. ✅ Restart your backend server

3. ✅ Test the OAuth connection in your app

That's all you need to do in Supabase! 🎉
