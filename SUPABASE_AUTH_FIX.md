# Supabase Auth 500 Error - Fix Guide

## The Problem

Getting 500 Internal Server Error from Supabase auth service during signup, even though connection tests pass.

## Most Common Causes & Solutions

### 1. Email Confirmation Settings (Most Likely)

**Fix:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Email" section
3. **DISABLE** "Enable email confirmations"
4. Save settings
5. Try signup again

### 2. Project Paused or Limited

**Check:**

1. Go to Supabase Dashboard → Settings → General
2. Verify project status is "Active"
3. Check Usage tab for any limits exceeded

### 3. Auth Provider Configuration

**Fix:**

1. Go to Authentication → Providers
2. Ensure "Email" provider is enabled
3. Check "Enable signup" is checked
4. Save settings

### 4. Rate Limiting

**Solution:**

- Wait 5-10 minutes between signup attempts
- Try with a completely different email address
- Clear browser cache

## Temporary Workaround

If the above doesn't work, we can create users manually:

### Manual User Creation

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Click "Create user"
5. Test login with these credentials

### Test Login Instead

Once you have a manually created user:

1. Go to `http://localhost:3000`
2. Use "Sign In" instead of "Sign Up"
3. Enter the manually created credentials
4. This will test the rest of the app

## Alternative: Use Different Supabase Project

If the current project has issues:

1. Create a new Supabase project
2. Update `.env.local` with new credentials
3. Run the database schema on the new project
4. Test signup

## Debug Steps

### Check Supabase Logs

1. Go to Supabase Dashboard → Logs
2. Look for Auth logs
3. Check for specific error messages
4. Look for rate limiting messages

### Network Debug

1. Open browser DevTools → Network tab
2. Try signup
3. Look at the failed request
4. Check response details

### Environment Check

Verify your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Expected Fix Results

After applying the fixes:

- ✅ Signup should work without 500 error
- ✅ User should be redirected to `/client`
- ✅ Console should show "User created: [user-id]"
- ✅ Profile creation should work (if database is set up)

## If Nothing Works

1. **Contact Supabase Support** with:

   - Project ID
   - Error details
   - Steps to reproduce

2. **Create New Project** as a temporary solution

3. **Use Manual User Creation** to continue development

The most likely fix is disabling email confirmation in your Supabase project settings. Try that first!
