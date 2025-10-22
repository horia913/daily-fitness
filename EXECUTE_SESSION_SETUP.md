# Quick Setup Instructions for Session Booking

## 🚀 Execute These Steps in Order:

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)

### Step 2: Run the Schema

1. Click **"+ New query"**
2. Open the file: `SESSION_BOOKING_SCHEMA.sql` in your code editor
3. Copy **ALL** the contents (Ctrl+A, Ctrl+C)
4. Paste into the Supabase SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify Success

You should see output like:

```
SESSION BOOKING SCHEMA SETUP COMPLETE
==============================================
Coach time slots: 0
Booked sessions: 0
Tables created:
  - coach_time_slots
  - booked_sessions
Helper functions created
RLS policies enabled
==============================================
```

### Step 4: (Optional) Add Test Data

If you want to test with sample data:

1. Open `SESSION_BOOKING_SCHEMA.sql` again
2. Find the section labeled **"7. SAMPLE DATA (OPTIONAL - FOR TESTING)"** (around line 360)
3. Remove the `/*` at the start and `*/` at the end
4. Copy that section only
5. Paste and run it in Supabase SQL Editor

### Step 5: Test the Frontend

1. Go to your app: http://localhost:3000
2. Log in as a client
3. Click the **"Sessions"** button on the dashboard
4. You should see the sessions page without errors!

---

## ✅ What You Get:

After running the schema, you'll have:

### **Database Tables:**

- ✅ `coach_time_slots` - Coach availability
- ✅ `booked_sessions` - Client bookings

### **Automatic Features:**

- ✅ Auto-mark slots unavailable when booked
- ✅ Auto-mark slots available when cancelled
- ✅ Auto-update timestamps

### **Security:**

- ✅ Row Level Security (RLS) enabled
- ✅ Clients can only see their own sessions
- ✅ Coaches can only manage their own slots

### **Helper Functions:**

- ✅ `get_available_time_slots()` - Find open slots
- ✅ `book_session()` - Book a session
- ✅ `cancel_session()` - Cancel a session
- ✅ `complete_session()` - Mark as complete
- ✅ `add_session_feedback()` - Rate session

---

## 📱 Current Status:

### **Working Now:**

✅ Client can view their sessions page
✅ Empty state displays correctly
✅ No console errors
✅ Sessions will load once data exists

### **To Build Next:**

❌ Coach availability management UI
❌ Client booking interface
❌ Calendar view for sessions

---

## 🐛 Troubleshooting:

### "Error: relation does not exist"

➡️ You haven't run the SQL schema yet. Go back to Step 2.

### "Permission denied"

➡️ RLS policies are working! Make sure you're logged in as the correct user.

### Sessions page shows "No sessions yet"

➡️ This is correct! No sessions are booked yet. Either:

- Run the sample data (Step 4)
- Or manually create time slots and bookings in Supabase

---

## 📝 Files Created:

1. **`SESSION_BOOKING_SCHEMA.sql`** - Complete database schema (RUN THIS!)
2. **`SESSION_BOOKING_SETUP_GUIDE.md`** - Detailed documentation
3. **`EXECUTE_SESSION_SETUP.md`** - This quick guide

---

## ⏱️ Estimated Time:

- Schema execution: **< 1 minute**
- Testing: **2-3 minutes**
- **Total: ~5 minutes**

---

## 🎯 Ready?

1. Open Supabase
2. Copy `SESSION_BOOKING_SCHEMA.sql`
3. Paste and Run
4. Done! ✨

---

**Need help?** Check `SESSION_BOOKING_SETUP_GUIDE.md` for detailed documentation.
