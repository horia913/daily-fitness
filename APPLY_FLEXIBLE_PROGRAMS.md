# 🚀 Apply Flexible Programs Database Schema

## ⚠️ IMPORTANT: Database Setup Required

The flexible programs system requires database schema changes that need to be applied to your Supabase database. The errors you're seeing indicate that the new tables and functions don't exist yet.

## 📋 Steps to Apply the Schema:

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy the entire content from `FLEXIBLE_PROGRAMS_SCHEMA.sql`**
4. **Paste it into the SQL Editor**
5. **Click "Run" to execute the schema**

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db reset
# Then apply the schema file
```

## 🗂️ What This Schema Creates:

### New Tables:

- `program_assignment_progress` - Tracks client progress through programs
- `completed_programs` - Stores completed programs for the "Completed Programs" section
- `program_workout_completions` - Records individual workout completions

### New Functions:

- `get_next_due_workout()` - Determines the next workout for a client
- `complete_workout()` - Marks workouts as completed and handles progression
- `get_completed_programs()` - Retrieves completed programs for display

### Updated Tables:

- `program_schedule` - Now supports Day 1-6 instead of weekdays

## 🔧 After Applying Schema:

1. **Refresh your app** - The errors should disappear
2. **Test the new system** - Create a program and assign it to a client
3. **Verify flexible scheduling** - Clients should see "Day 1, Day 2, etc." instead of weekdays

## 🚨 If You Get Errors:

- **Permission errors**: Make sure you're using the correct Supabase project
- **Function conflicts**: The schema uses `CREATE OR REPLACE FUNCTION` so it should handle existing functions
- **Table conflicts**: The schema uses `CREATE TABLE IF NOT EXISTS` so it should be safe

## 📞 Need Help?

If you encounter any issues applying the schema, let me know and I can help troubleshoot!

---

**Next Step**: Apply the schema in your Supabase dashboard, then test the app!
