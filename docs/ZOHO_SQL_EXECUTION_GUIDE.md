# Zoho SQL Migration - Step-by-Step Execution Guide

## Quick Method: Run Entire File (Recommended)

**In Supabase SQL Editor:**
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy **ALL** lines from `22_zoho_oauth_tokens.sql` (lines 1-95)
4. Paste into the editor
5. Click **Run** (or press Ctrl+Enter)

This is the easiest and safest method.

---

## Line-by-Line Method (If You Need to Debug)

If you need to run it step by step, follow this order:

### STEP 1: Create the Table (Lines 4-15)
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
**Expected Result:** Table created (or already exists message)

---

### STEP 2: Add Region Column (Lines 17-34)
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
**Expected Result:** Region column added (or "already exists" - that's OK)

**⚠️ IMPORTANT:** This is the step that fixes the "column region does not exist" error!

---

### STEP 3: Fix Unique Constraint (Lines 36-50)
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
**Expected Result:** Constraint updated

---

### STEP 4: Enable RLS (Line 53)
```sql
ALTER TABLE public.zoho_oauth_tokens ENABLE ROW LEVEL SECURITY;
```
**Expected Result:** RLS enabled

---

### STEP 5: Drop Old Policies (Lines 55-59)
```sql
DROP POLICY IF EXISTS "Users can view own Zoho tokens" ON public.zoho_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own Zoho tokens" ON public.zoho_oauth_tokens;
DROP POLICY IF EXISTS "Users can update own Zoho tokens" ON public.zoho_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete own Zoho tokens" ON public.zoho_oauth_tokens;
```
**Expected Result:** Old policies removed (or "does not exist" - that's OK)

---

### STEP 6: Create RLS Policies (Lines 61-72)
```sql
CREATE POLICY "Users can view own Zoho tokens" ON public.zoho_oauth_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Zoho tokens" ON public.zoho_oauth_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Zoho tokens" ON public.zoho_oauth_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Zoho tokens" ON public.zoho_oauth_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```
**Expected Result:** 4 policies created

---

### STEP 7: Create Trigger Function (Lines 74-81)
```sql
CREATE OR REPLACE FUNCTION public.update_zoho_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
**Expected Result:** Function created

---

### STEP 8: Create Trigger (Lines 83-90)
```sql
DROP TRIGGER IF EXISTS update_zoho_oauth_tokens_updated_at ON public.zoho_oauth_tokens;

CREATE TRIGGER update_zoho_oauth_tokens_updated_at
  BEFORE UPDATE ON public.zoho_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zoho_tokens_updated_at();
```
**Expected Result:** Trigger created

---

### STEP 9: Create Indexes (Lines 92-94)
```sql
CREATE INDEX IF NOT EXISTS idx_zoho_oauth_tokens_user_id ON public.zoho_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_zoho_oauth_tokens_user_region ON public.zoho_oauth_tokens(user_id, region);
```
**Expected Result:** 2 indexes created

---

## Verification Query

After running all steps, verify the table structure:

```sql
-- Check if region column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'zoho_oauth_tokens'
ORDER BY ordinal_position;
```

**Expected Output:** Should show all columns including `region` with default value 'US'

---

## If You Still Get "region does not exist" Error

Run this **QUICK FIX** SQL:

```sql
-- Add region column immediately
ALTER TABLE public.zoho_oauth_tokens 
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'US';

-- Add check constraint
ALTER TABLE public.zoho_oauth_tokens 
ADD CONSTRAINT zoho_region_check 
CHECK (region IN ('US', 'EU', 'IN', 'AU', 'CN', 'JP'));

-- Update existing rows
UPDATE public.zoho_oauth_tokens 
SET region = 'US' 
WHERE region IS NULL;
```

Then verify:
```sql
SELECT region FROM public.zoho_oauth_tokens LIMIT 1;
```

---

## Common Issues

### Issue: "syntax error at or near 'DO'"
- **Solution:** Make sure you're running the entire `DO $$ ... END $$;` block together, not line by line

### Issue: "relation zoho_oauth_tokens does not exist"
- **Solution:** Run STEP 1 first to create the table

### Issue: "column region does not exist"
- **Solution:** Run STEP 2 (the DO block that adds the region column)

### Issue: "duplicate key value violates unique constraint"
- **Solution:** This is normal - you can only have one token per user per region. Delete existing tokens first if needed.

---

## Recommended Approach

**For most users:** Just copy the entire `22_zoho_oauth_tokens.sql` file and run it all at once in Supabase SQL Editor. It's designed to be idempotent (safe to run multiple times).
