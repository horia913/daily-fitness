# Troubleshooting Guide - Supabase 500 Error

## Current Issue

Getting 500 Internal Server Error during signup, even though diagnostic tests pass.

## Step-by-Step Troubleshooting

### 1. Check Supabase Project Settings

Go to your Supabase dashboard → Authentication → Settings:

**Email Settings:**

- ✅ **Disable email confirmation** for testing
- ✅ **Allow signups** should be enabled
- ✅ **Email templates** should be configured

**Auth Providers:**

- ✅ **Email** provider should be enabled
- ✅ **Confirm email** should be **DISABLED** for testing

### 2. Check Project Status

In Supabase dashboard:

- ✅ Project should be **Active** (not paused)
- ✅ Check **Usage** tab for any limits exceeded
- ✅ Check **Logs** for any errors

### 3. Verify Environment Variables

Check your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Common issues:**

- ❌ Missing quotes around values
- ❌ Extra spaces or newlines
- ❌ Wrong project URL or key

### 4. Test with Different Approach

Try the simple auth page:

- Go to `http://localhost:3000/simple-auth`
- Try signing up with a test email
- Check browser console for detailed errors

### 5. Check Supabase Logs

In Supabase dashboard → Logs:

- Look for **Auth** logs
- Check for any error messages
- Look for rate limiting or quota issues

### 6. Common Solutions

**Solution 1: Disable Email Confirmation**

```sql
-- In Supabase SQL Editor
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'your-test-email@example.com';
```

**Solution 2: Check Rate Limits**

- Supabase has rate limits on auth operations
- Try with a different email
- Wait a few minutes between attempts

**Solution 3: Reset Auth Settings**
In Supabase dashboard → Authentication → Settings:

- Reset to default settings
- Re-enable email provider
- Disable email confirmation

### 7. Alternative Testing Method

If signup still fails, try this manual approach:

1. **Create user manually in Supabase:**

   - Go to Authentication → Users
   - Click "Add user"
   - Create a test user

2. **Test login instead of signup:**
   - Use the manually created user
   - Test the login flow

### 8. Debug Information

When testing, check browser console for:

- Network requests to Supabase
- Any CORS errors
- Detailed error messages
- Request/response data

### 9. Contact Supabase Support

If all else fails:

- Check Supabase status page
- Contact Supabase support
- Provide project ID and error details

## Quick Fixes to Try

1. **Restart everything:**

   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache:**

   - Hard refresh (Ctrl+Shift+R)
   - Clear site data

3. **Try incognito mode:**

   - Test in private/incognito window

4. **Check network:**
   - Try different network
   - Check firewall settings

## Expected Behavior

After fixes, you should see:

- ✅ Signup works without 500 error
- ✅ User gets redirected to `/client`
- ✅ Console shows "User created: [user-id]"
- ✅ Profile creation succeeds (if database is set up)

Let me know what you find in the Supabase logs and settings!
