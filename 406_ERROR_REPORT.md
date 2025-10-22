# 406 Error Analysis Report

## 1. EXACT SQL QUERY CAUSING 406 ERROR

### REST API Call:

```
GET /rest/v1/workout_assignments?select=*&id=eq.7529d313-d23d-40ca-9927-01739e25824c&client_id=eq.af9325e2-76e7-4df6-8ed7-9effd9c764d8
```

### Equivalent SQL Query:

```sql
SELECT *
FROM public.workout_assignments
WHERE id = '7529d313-d23d-40ca-9927-01739e25824c'
AND client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'
```

### Query Details:

- **Table**: `public.workout_assignments`
- **Operation**: SELECT (read operation)
- **Filters**:
  - `id = '7529d313-d23d-40ca-9927-01739e25824c'`
  - `client_id = 'af9325e2-76e7-4df6-8ed7-9effd9c764d8'`
- **Error Code**: 406 Not Acceptable
- **Context**: Supabase REST API with RLS enabled

## 2. CURRENT RLS POLICIES

### Tables Involved:

- `workout_assignments` (primary table)
- `workout_templates` (related via foreign key)
- `workout_categories` (related via foreign key)
- `profiles` (related via foreign key)
- `workout_sessions` (related table)

### Policy Status:

Run the diagnostic scripts to get current policy details:

1. `COMPREHENSIVE_406_DIAGNOSTIC.sql` - Full policy analysis
2. `SUPABASE_ERROR_ANALYSIS.sql` - Detailed error analysis

## 3. TROUBLESHOOTING STEPS

### Step 1: Run Comprehensive Diagnostic

```sql
-- Copy and paste COMPREHENSIVE_406_DIAGNOSTIC.sql into Supabase SQL Editor
-- This will show:
-- - Exact query analysis
-- - RLS status on all tables
-- - All current policies
-- - Table permissions
-- - Record verification
-- - Foreign key relationships
-- - User context
-- - Policy evaluation tests
```

### Step 2: Run Error Analysis

```sql
-- Copy and paste SUPABASE_ERROR_ANALYSIS.sql into Supabase SQL Editor
-- This will show:
-- - Record access tests
-- - Specific policies on workout_assignments
-- - RLS status
-- - Permissions check
-- - Different query variations
-- - Constraint checks
-- - Session information
```

### Step 3: Emergency Bypass (if needed)

```sql
-- Copy and paste EMERGENCY_RLS_BYPASS.sql into Supabase SQL Editor
-- This will temporarily disable RLS to get the app working
```

## 4. POTENTIAL CAUSES OF 406 ERROR

### A. RLS Policy Issues:

- No SELECT policy on `workout_assignments`
- Policy condition not matching the query
- Policy using wrong user context
- Conflicting policies

### B. Permission Issues:

- `authenticated` role lacks SELECT permission
- Table-level permissions not granted
- Schema-level permissions missing

### C. Data Issues:

- Record doesn't exist
- Client ID mismatch
- ID format issues
- Constraint violations

### D. Supabase Configuration:

- RLS enabled but no policies
- API key issues
- Project configuration problems
- Database connection issues

## 5. INFORMATION TO COLLECT

### From Supabase Dashboard:

1. **Logs Tab**: Check for specific error messages
2. **API Tab**: Verify API key and project settings
3. **Database Tab**: Check table structure and constraints
4. **Auth Tab**: Verify user authentication

### From Application:

1. **Browser Console**: Network tab showing exact request/response
2. **Application Logs**: Any backend error messages
3. **Authentication Status**: Verify user is properly authenticated

## 6. NEXT STEPS

1. **Run both diagnostic scripts** to gather complete information
2. **Check Supabase dashboard logs** for specific error details
3. **Verify authentication status** in your application
4. **Test with emergency bypass** to confirm it's an RLS issue
5. **Implement proper RLS policies** based on diagnostic results

## 7. EXPECTED DIAGNOSTIC RESULTS

The diagnostic scripts will reveal:

- Whether the record exists and is accessible
- Current RLS policy configuration
- Permission status for authenticated users
- Specific policy conditions causing the block
- User context and authentication status

---

**Run the diagnostic scripts and share the results for detailed analysis!**
