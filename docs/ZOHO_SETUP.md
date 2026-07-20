# Zoho Integration Setup Guide

## Database Migration Instructions

### Step 1: Run the Main Migration

Run the SQL migration file to create the `zoho_oauth_tokens` table with the `region` column.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of:
   - `ctrl_checks/sql_migrations/22_zoho_oauth_tokens.sql`
   - OR
   - `ctrl_checks/supabase/migrations/20250203000000_add_zoho_oauth_tokens.sql`
5. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

**Option B: Using Supabase CLI**

```bash
# Navigate to your project root
cd ctrl_checks

# Run the migration
supabase db push
# OR
supabase migration up
```

**Option C: Manual SQL Execution (Line by Line)**

If you prefer to run it line by line, here's the order:

1. **Create the table** (if it doesn't exist):
```sql
CREATE TABLE IF NOT EXISTS public.zoho_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

2. **Add region column** (if missing):
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zoho_oauth_tokens' 
    AND column_name = 'region'
  ) THEN
    ALTER TABLE public.zoho_oauth_tokens 
    ADD COLUMN region TEXT DEFAULT 'US' CHECK (region IN ('US', 'EU', 'IN', 'AU', 'CN', 'JP'));
    
    UPDATE public.zoho_oauth_tokens 
    SET region = 'US' 
    WHERE region IS NULL;
  END IF;
END $$;
```

3. **Fix unique constraint**:
```sql
ALTER TABLE public.zoho_oauth_tokens 
DROP CONSTRAINT IF EXISTS zoho_oauth_tokens_user_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'zoho_oauth_tokens_user_id_region_key'
  ) THEN
    ALTER TABLE public.zoho_oauth_tokens 
    ADD CONSTRAINT zoho_oauth_tokens_user_id_region_key UNIQUE (user_id, region);
  END IF;
END $$;
```

4. **Enable RLS**:
```sql
ALTER TABLE public.zoho_oauth_tokens ENABLE ROW LEVEL SECURITY;
```

5. **Create RLS Policies**:
```sql
DROP POLICY IF EXISTS "Users can view own Zoho tokens" ON public.zoho_oauth_tokens;
CREATE POLICY "Users can view own Zoho tokens" ON public.zoho_oauth_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own Zoho tokens" ON public.zoho_oauth_tokens;
CREATE POLICY "Users can insert own Zoho tokens" ON public.zoho_oauth_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Zoho tokens" ON public.zoho_oauth_tokens;
CREATE POLICY "Users can update own Zoho tokens" ON public.zoho_oauth_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own Zoho tokens" ON public.zoho_oauth_tokens;
CREATE POLICY "Users can delete own Zoho tokens" ON public.zoho_oauth_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

6. **Create trigger function**:
```sql
CREATE OR REPLACE FUNCTION public.update_zoho_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

7. **Create trigger**:
```sql
DROP TRIGGER IF EXISTS update_zoho_oauth_tokens_updated_at ON public.zoho_oauth_tokens;
CREATE TRIGGER update_zoho_oauth_tokens_updated_at
  BEFORE UPDATE ON public.zoho_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zoho_tokens_updated_at();
```

8. **Create indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_zoho_oauth_tokens_user_id ON public.zoho_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_oauth_tokens_user_region ON public.zoho_oauth_tokens(user_id, region);
```

### Step 2: Verify the Migration

Run this query to verify the table was created correctly:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'zoho_oauth_tokens'
ORDER BY ordinal_position;

-- Check if region column exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'zoho_oauth_tokens' 
  AND column_name = 'region'
) AS region_column_exists;
```

### Step 3: If You Get "region column does not exist" Error

If you still get the error after running the migration, run the fix migration:

**Quick Fix SQL:**
```sql
-- Add region column if it's missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zoho_oauth_tokens' 
    AND column_name = 'region'
  ) THEN
    ALTER TABLE public.zoho_oauth_tokens 
    ADD COLUMN region TEXT DEFAULT 'US' CHECK (region IN ('US', 'EU', 'IN', 'AU', 'CN', 'JP'));
    
    UPDATE public.zoho_oauth_tokens 
    SET region = 'US' 
    WHERE region IS NULL;
  END IF;
END $$;

-- Fix unique constraint
ALTER TABLE public.zoho_oauth_tokens 
DROP CONSTRAINT IF EXISTS zoho_oauth_tokens_user_id_key;

ALTER TABLE public.zoho_oauth_tokens 
DROP CONSTRAINT IF EXISTS zoho_oauth_tokens_user_id_region_key;

ALTER TABLE public.zoho_oauth_tokens 
ADD CONSTRAINT zoho_oauth_tokens_user_id_region_key UNIQUE (user_id, region);
```

## Troubleshooting

### Error: "column region does not exist"
- **Solution**: Run Step 3 (Quick Fix SQL) above
- This happens if the table was created before the region column was added

### Error: "relation zoho_oauth_tokens does not exist"
- **Solution**: Run the full migration from Step 1
- The table hasn't been created yet

### Error: "duplicate key value violates unique constraint"
- **Solution**: The unique constraint is working correctly
- You can only have one token per user per region
- Delete existing tokens or use a different region

## Testing the Setup

After running the migration, test the connection:

1. Go to your application
2. Navigate to **Connections** panel
3. Click **Connect Zoho**
4. Enter your credentials:
   - Client ID: `1000.FKUP0TM6KY4YTVOG7OZBIO72QE5UMQ`
   - Client Secret: `56d2c7721fbf12daf0fc32ef8d96f29df93bc51503`
   - Access Token: `1000.f1d03df1880e621bf10523bf7235357e.db08ec2b53c6be157855b821a0f7c8b5`
   - Refresh Token: `1000.c63a2f86711485b785cedc5afb91179e.03a19e2d36f3472a7d1d546bae6efcb3`
   - Region: `US` (or your region)
5. Click **Connect**

If successful, you should see "Zoho Connected" in the Connections panel.
