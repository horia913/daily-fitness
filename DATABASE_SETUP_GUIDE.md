# Database Setup Guide - Proper Implementation

## The Right Way to Handle Supabase Auth Integration

### Problem

Supabase's `auth.users` table is in the `auth` schema, which we cannot modify or reference directly in foreign key constraints. This is by design for security reasons.

### Solution

We create our own `profiles` table in the `public` schema that mirrors the user data we need, and we maintain the relationship through application logic rather than database constraints.

## Step 1: Run the Database Schema

1. Copy the contents of `database-schema-simple.sql`
2. Paste and run in Supabase → SQL Editor
3. This creates all our tables without referencing `auth.users`

## Step 2: Understanding the Architecture

### Profiles Table

- **Purpose**: Stores user profile information (role, name, etc.)
- **ID**: Uses the same UUID as `auth.users.id` but without foreign key constraint
- **Relationship**: Maintained through application logic, not database constraints

### Security Functions

- `get_user_profile()`: Returns the current user's profile
- `is_coach()`: Checks if current user is a coach
- `is_client()`: Checks if current user is a client

### Row Level Security

- All policies use `auth.uid()` to get the current user's ID
- Policies ensure users can only access their own data
- Coaches can access their clients' data

## Step 3: Profile Creation Flow

### Automatic Profile Creation

When a user signs up, our app automatically creates a profile:

```typescript
// In signup flow
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

if (data.user) {
  await supabase.from("profiles").insert({
    id: data.user.id, // Same ID as auth.users
    email: data.user.email!,
    role: "client", // Default role
  });
}
```

### Manual Profile Creation (for existing users)

If you have existing users, create profiles manually:

```sql
-- Get user ID from auth.users table
SELECT id, email FROM auth.users;

-- Create profile for that user
INSERT INTO public.profiles (id, email, role, first_name, last_name)
VALUES ('user-id-from-auth-users', 'user@example.com', 'client', 'First', 'Last');
```

## Step 4: Data Integrity

### Application-Level Integrity

- We ensure profile creation happens immediately after user signup
- We validate user roles in our application logic
- We use Supabase RLS policies to enforce access control

### No Database-Level Foreign Keys

- We don't use foreign key constraints to `auth.users`
- We maintain referential integrity through application logic
- This is the recommended approach for Supabase

## Step 5: Testing the Setup

1. **Sign up a new user**: Profile should be created automatically
2. **Check profiles table**: Should see the new profile with correct role
3. **Test RLS policies**: Users should only see their own data
4. **Test role-based access**: Coaches and clients should see appropriate data

## Benefits of This Approach

✅ **Security**: No direct access to auth schema
✅ **Flexibility**: Can add custom fields to profiles
✅ **Performance**: No complex joins with auth tables
✅ **Maintainability**: Clear separation of concerns
✅ **Supabase Best Practice**: Recommended by Supabase team

## Common Issues and Solutions

### Issue: "Profile not found"

**Solution**: Ensure profile was created during signup or create manually

### Issue: "Permission denied"

**Solution**: Check RLS policies and user authentication status

### Issue: "Role not recognized"

**Solution**: Verify profile exists and has correct role value

This approach follows Supabase best practices and provides a robust, secure foundation for our fitness app.
