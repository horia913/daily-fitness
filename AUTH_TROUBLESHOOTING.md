# 🔧 Auth Troubleshooting Guide

## Problem: "Database error saving new user"

This error occurs when Supabase Auth can't save user data to the database. Here's how to fix it:

## 🚨 **CRITICAL FIX STEPS**

### Step 1: Run the Database Fix Script

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** the entire contents of `database-auth-fix.sql`
3. **Click "Run"** to execute the script

This script will:

- ✅ Drop and recreate the `profiles` table with correct schema
- ✅ Create proper auth triggers
- ✅ Set up RLS policies
- ✅ Create the `invite_codes` table
- ✅ Grant necessary permissions

### Step 2: Verify the Fix

After running the script, you should see:

```
Database auth fix completed successfully! 🎉
```

### Step 3: Test User Creation

1. **Go to** `/coach/clients/add`
2. **Generate an invite code**
3. **Try to signup** with the invite code

## 🔍 **Alternative Solutions**

### Option A: Manual Database Setup

If the script doesn't work, manually create these tables:

```sql
-- 1. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('coach', 'client')),
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create basic policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### Option B: Disable Auth Triggers Temporarily

If triggers are causing issues:

```sql
-- Drop the auth trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

## 🐛 **Common Issues & Solutions**

### Issue 1: "relation 'profiles' does not exist"

**Solution**: Run the database fix script

### Issue 2: "permission denied for table profiles"

**Solution**: Check RLS policies and permissions

### Issue 3: "duplicate key value violates unique constraint"

**Solution**: Clear existing profiles table and recreate

### Issue 4: "trigger function does not exist"

**Solution**: Recreate the trigger function

## 📋 **Verification Checklist**

- [ ] `profiles` table exists
- [ ] `invite_codes` table exists
- [ ] RLS is enabled on both tables
- [ ] Auth trigger is created
- [ ] Permissions are granted
- [ ] Invite code generation works
- [ ] User signup completes successfully

## 🆘 **Still Having Issues?**

If you're still getting errors:

1. **Check Supabase logs** in the Dashboard
2. **Verify your Supabase URL and keys** in `.env.local`
3. **Try creating a user manually** in Supabase Auth
4. **Check if RLS is blocking operations**

## 📞 **Quick Test**

Run this in Supabase SQL Editor to test:

```sql
-- Test if profiles table exists and is accessible
SELECT * FROM public.profiles LIMIT 1;
```

If this works, the database is set up correctly!
