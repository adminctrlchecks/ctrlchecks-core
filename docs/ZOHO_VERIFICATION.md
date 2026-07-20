# Zoho Migration Verification Checklist

## ✅ Quick Verification

If you ran this query and saw a row with `region` and `text`:
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'zoho_oauth_tokens' 
AND column_name = 'region';
```

**Then you're DONE!** ✅ The migration was successful.

---

## Complete Verification (Optional)

If you want to verify everything is set up correctly, run these queries:

### 1. Check Table Structure
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'zoho_oauth_tokens'
ORDER BY ordinal_position;
```

**Expected:** Should show all columns including `region` with default `'US'`

### 2. Check Unique Constraint
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'zoho_oauth_tokens'
AND constraint_type = 'UNIQUE';
```

**Expected:** Should show `zoho_oauth_tokens_user_id_region_key`

### 3. Check RLS Policies
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'zoho_oauth_tokens';
```

**Expected:** Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 4. Check Indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'zoho_oauth_tokens';
```

**Expected:** Should show indexes including `idx_zoho_oauth_tokens_user_id` and `idx_zoho_oauth_tokens_user_region`

---

## What to Do Next

Since your migration is complete:

1. ✅ **Database is ready** - No need to run SQL again
2. ✅ **Test the connection** - Go to Connections panel and try connecting Zoho
3. ✅ **Use in workflows** - Add Zoho node to your workflows

---

## If You Get Errors

### Error: "column region does not exist"
- **This shouldn't happen** if verification showed the column exists
- If it does, run the Quick Fix from the guide

### Error: "relation zoho_oauth_tokens does not exist"
- Run the full migration (STEP 1 from the guide)

### Error: "permission denied"
- Check RLS policies are created (run verification query #3 above)

---

## Summary

**If verification shows `region` column exists → You're all set! ✅**

No need to run the migration again. The table is ready to use.
