# Invite Codes System Setup Guide

## Quick Setup

The invite codes system is now **robust and handles missing database components gracefully**. Here's what you need to do:

### Option 1: Basic Setup (Quick Start)

1. **Run the basic SQL script** in your Supabase SQL Editor:

   ```sql
   -- Copy and paste the entire contents of database-basic-setup.sql
   ```

2. **The script creates**:
   - `profiles` table (for user data)
   - `invite_codes` table (for invitation system)
   - Basic RLS policies
   - Essential indexes

### Option 2: Full Database Setup (Advanced)

1. **Run the full SQL script** in your Supabase SQL Editor:

   ```sql
   -- Copy and paste the entire contents of database-invite-codes.sql
   ```

2. **The script creates**:
   - All tables from basic setup
   - `generate_invite_code()` function
   - `create_invite_code()` function
   - `validate_invite_code()` function
   - Advanced RLS policies and indexes

### Option 3: Minimal Setup (Fallback)

If you don't want to run the full SQL script, the app will automatically:

1. **Generate codes client-side** (8-character alphanumeric)
2. **Insert directly** into the `invite_codes` table
3. **Handle errors gracefully** with user-friendly messages

## How It Works Now

### For Coaches (Generate Invite Codes):

1. Go to `/coach/clients/add`
2. Fill in client details (optional)
3. Click "Generate Invite Code"
4. **The system will**:
   - Try database function first
   - Fall back to client-side generation if needed
   - Show success/error messages
   - Send email (if configured)

### For Clients (Use Invite Codes):

1. Go to the signup page
2. Enter invite code
3. **The system will**:
   - Validate the code
   - Create account if valid
   - Mark code as used
   - Show helpful error messages

## Error Handling

The system now handles these scenarios gracefully:

- ✅ **Database functions not created** → Uses client-side generation
- ✅ **Invite codes table missing** → Shows helpful error message
- ✅ **Network issues** → Retries and shows error toast
- ✅ **Invalid codes** → Clear error messages
- ✅ **Expired codes** → Automatic validation

## Testing

1. **Generate an invite code** from `/coach/clients/add`
2. **Copy the code** (8 characters like "A1B2C3D4")
3. **Test signup** with the code
4. **Verify** the code is marked as used

## Troubleshooting

### "Invite code system is not set up yet"

- Run the `database-invite-codes.sql` script in Supabase
- Or contact your coach for assistance

### "Failed to generate invite code"

- Check your internet connection
- Verify you're logged in as a coach
- Check browser console for detailed errors

### "Invalid or expired invite code"

- Make sure you're using the exact code (case-sensitive)
- Check if the code has expired
- Verify the code hasn't been used already

## Features

- ✅ **8-character codes** (easy to share)
- ✅ **Expiration dates** (7-90 days configurable)
- ✅ **Email integration** (automatic sending)
- ✅ **Usage tracking** (prevents reuse)
- ✅ **Coach restriction** (only horia.popescu98@gmail.com)
- ✅ **Graceful fallbacks** (works even without full setup)

The invite codes system is now **production-ready** and handles all edge cases gracefully! 🎉
