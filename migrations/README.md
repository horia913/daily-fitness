# Database Migrations for Mobility Metrics Update

## Overview

This migration updates the mobility metrics schema to support the new anatomical assessment fields and photo storage.

## Files

1. **`update_mobility_metrics_schema.sql`** - Updates the `mobility_metrics` table with new columns
2. **`create_progress_photos_storage.sql`** - Sets up photo storage columns and provides RLS policy guidance

## Migration Steps

### Step 1: Review Current Schema

Before running the migration, check your current `mobility_metrics` table structure:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mobility_metrics'
ORDER BY ordinal_position;
```

### Step 2: Backup Your Data

**IMPORTANT:** Always backup your database before running migrations.

```sql
-- Create a backup of mobility_metrics
CREATE TABLE mobility_metrics_backup AS SELECT * FROM mobility_metrics;
```

### Step 3: Run the Main Migration

Execute `update_mobility_metrics_schema.sql` in your Supabase SQL Editor:

```bash
# Or via Supabase Dashboard > SQL Editor
```

This will:

- Add all new anatomical fields (IR/ER, etc.)
- Add photos array column
- Add helpful comments
- Create indexes for better performance

### Step 4: Data Migration (if needed)

If you have existing data in old columns (like `left_shoulder_extension`), review the commented migration section in the SQL file. You may need to map old data to new columns before dropping old columns.

**Example data migration (review first!):**

```sql
-- Only run if you have data to migrate
-- UPDATE mobility_metrics
-- SET left_shoulder_er = left_shoulder_extension
-- WHERE left_shoulder_er IS NULL AND left_shoulder_extension IS NOT NULL;
```

### Step 5: Drop Old Columns (after data migration)

After reviewing and migrating data, uncomment the DROP COLUMN statements in the migration file:

```sql
ALTER TABLE mobility_metrics
DROP COLUMN IF EXISTS left_shoulder_extension,
DROP COLUMN IF EXISTS right_shoulder_extension,
-- ... etc
```

### Step 6: Set Up Photo Storage

1. **Create Storage Bucket:**

   - Go to Supabase Dashboard > Storage
   - Create new bucket: `progress-photos`
   - Set as **Public** (or configure RLS if you prefer private)

2. **Configure RLS Policies:**
   Go to Storage > `progress-photos` > Policies and add:

   **Policy 1: Allow authenticated users to upload**

   - Name: "Users can upload their own photos"
   - Policy:
     ```sql
     (bucket_id = 'progress-photos'::text) AND
     (auth.uid()::text = (storage.foldername(name))[2])
     ```

   **Policy 2: Allow authenticated users to read**

   - Name: "Users can view photos"
   - Policy:
     ```sql
     (bucket_id = 'progress-photos'::text) AND
     (
       auth.uid()::text = (storage.foldername(name))[2] OR
       EXISTS (
         SELECT 1 FROM clients
         WHERE client_id = auth.uid()::uuid
         AND coach_id::text = (storage.foldername(name))[2]
       )
     )
     ```

   **Policy 3: Allow authenticated users to delete**

   - Name: "Users can delete their own photos"
   - Policy:
     ```sql
     (bucket_id = 'progress-photos'::text) AND
     (auth.uid()::text = (storage.foldername(name))[2])
     ```

   _Note: Storage RLS syntax may vary. Adjust based on your Supabase version._

3. **Add photos columns to other tables:**
   Run the relevant sections from `create_progress_photos_storage.sql` to add photos columns to `body_metrics` and `fms_assessments` tables.

### Step 7: Verify Migration

Run verification queries:

```sql
-- Check all new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mobility_metrics'
AND column_name IN (
  'left_shoulder_ir', 'left_shoulder_er',
  'left_hip_ir', 'left_hip_er',
  'photos'
)
ORDER BY column_name;

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mobility_metrics';
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Restore from backup
DROP TABLE IF EXISTS mobility_metrics;
ALTER TABLE mobility_metrics_backup RENAME TO mobility_metrics;
```

## Notes

- All new columns are nullable, so existing records won't break
- The migration uses `IF NOT EXISTS` to be idempotent (safe to run multiple times)
- Photo storage bucket must be created manually in Supabase Dashboard
- RLS policies for storage need to be configured based on your security requirements

## Testing

After migration, test:

1. Create a new mobility assessment with all field types
2. Upload photos and verify they appear in storage
3. Verify reference values display correctly in the UI
4. Test left/right toggle functionality
5. Verify data persists correctly on save

## Support

If you encounter issues:

1. Check Supabase logs for errors
2. Verify RLS policies are correctly configured
3. Ensure storage bucket exists and has proper permissions
4. Review column data types match the interface in `progressTrackingService.ts`
