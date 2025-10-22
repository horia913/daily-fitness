# Session Booking System Setup Guide

## Overview

This guide will help you set up the complete session booking system for FitCoach Pro, allowing coaches to manage their availability and clients to book training sessions.

## Features Included

### For Coaches:

- ✅ Create and manage time slot availability
- ✅ Set recurring availability patterns (daily, weekly, custom)
- ✅ View all booked sessions
- ✅ Mark sessions as completed or no-show
- ✅ Add coach notes after sessions
- ✅ View session history and statistics

### For Clients:

- ✅ View available time slots
- ✅ Book training sessions
- ✅ Cancel scheduled sessions
- ✅ View session history
- ✅ Rate and provide feedback on completed sessions
- ✅ Track session statistics (completed, scheduled, avg rating)

## Database Setup

### Step 1: Run the SQL Schema

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file `SESSION_BOOKING_SCHEMA.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute

### Step 2: Verify the Setup

After running the SQL, you should see:

```
SESSION BOOKING SCHEMA SETUP COMPLETE
==============================================
Coach time slots: 0
Booked sessions: 0
Tables created:
  - coach_time_slots (with indexes and triggers)
  - booked_sessions (with indexes and triggers)
Helper functions created:
  - get_available_time_slots()
  - book_session()
  - cancel_session()
  - complete_session()
  - add_session_feedback()
RLS policies enabled and configured
```

### Step 3: (Optional) Add Sample Data

If you want to test the system with sample data, uncomment the sample data section in the SQL file (lines marked with `/*` and `*/`) and run it again. This will create:

- 7 days of time slots for the first coach in your database
- Morning slots: 9 AM - 12 PM (3 one-hour slots)
- Afternoon slots: 2 PM - 6 PM (4 one-hour slots)

## Database Schema Details

### Tables

#### `coach_time_slots`

Stores coach availability.

| Column             | Type    | Description                          |
| ------------------ | ------- | ------------------------------------ |
| id                 | UUID    | Primary key                          |
| coach_id           | UUID    | Foreign key to profiles              |
| date               | DATE    | Date of availability                 |
| start_time         | TIME    | Slot start time                      |
| end_time           | TIME    | Slot end time                        |
| is_available       | BOOLEAN | Whether slot is available            |
| recurring_pattern  | TEXT    | 'weekly', 'daily', 'custom', or null |
| recurring_end_date | DATE    | When recurring pattern ends          |
| notes              | TEXT    | Coach notes about the slot           |

#### `booked_sessions`

Stores actual bookings.

| Column              | Type        | Description                                      |
| ------------------- | ----------- | ------------------------------------------------ |
| id                  | UUID        | Primary key                                      |
| time_slot_id        | UUID        | Foreign key to coach_time_slots                  |
| coach_id            | UUID        | Foreign key to profiles                          |
| client_id           | UUID        | Foreign key to profiles                          |
| session_type        | TEXT        | Type of session                                  |
| status              | TEXT        | 'scheduled', 'completed', 'cancelled', 'no_show' |
| notes               | TEXT        | Client notes when booking                        |
| coach_notes         | TEXT        | Coach notes after session                        |
| client_feedback     | TEXT        | Client feedback                                  |
| session_rating      | INTEGER     | 1-5 rating                                       |
| actual_start_time   | TIMESTAMPTZ | When session started                             |
| actual_end_time     | TIMESTAMPTZ | When session ended                               |
| cancelled_at        | TIMESTAMPTZ | When cancelled                                   |
| cancelled_by        | UUID        | Who cancelled                                    |
| cancellation_reason | TEXT        | Why cancelled                                    |

### Session Types

- `personal_training` - Regular training session
- `nutrition_consultation` - Nutrition advice/planning
- `check_in` - Progress check-in meeting
- `assessment` - Initial or periodic assessment

### Session Statuses

- `scheduled` - Upcoming session
- `completed` - Session finished
- `cancelled` - Session cancelled
- `no_show` - Client didn't show up

## Helper Functions

### 1. Get Available Time Slots

```sql
SELECT * FROM get_available_time_slots(
  'coach_uuid',  -- Coach ID
  '2025-10-15'   -- Date
);
```

### 2. Book a Session

```sql
SELECT book_session(
  'time_slot_uuid',        -- Time slot ID
  'client_uuid',           -- Client ID
  'personal_training',     -- Session type
  'Looking forward to this!' -- Notes (optional)
);
```

### 3. Cancel a Session

```sql
SELECT cancel_session(
  'session_uuid',          -- Session ID
  'user_uuid',             -- Who is cancelling
  'Schedule conflict'      -- Reason (optional)
);
```

### 4. Complete a Session

```sql
SELECT complete_session(
  'session_uuid',                -- Session ID
  'Great session today!'         -- Coach notes (optional)
);
```

### 5. Add Client Feedback

```sql
SELECT add_session_feedback(
  'session_uuid',          -- Session ID
  'client_uuid',           -- Client ID
  5,                       -- Rating (1-5)
  'Excellent session!'     -- Feedback (optional)
);
```

## Security (RLS Policies)

All tables have Row Level Security enabled:

### Coach Time Slots:

- ✅ Anyone can view available time slots
- ✅ Coaches can manage only their own time slots

### Booked Sessions:

- ✅ Clients can view only their own sessions
- ✅ Coaches can view all sessions they're involved in
- ✅ Clients can only book available time slots
- ✅ Clients can only cancel their own scheduled sessions
- ✅ Coaches can update session details (notes, status, etc.)

## Automatic Features

### 1. Time Slot Availability Management

When a session is booked, the time slot is automatically marked as unavailable.
When a session is cancelled, the time slot becomes available again.

### 2. Updated At Timestamps

Both tables automatically update their `updated_at` field on any modification.

## Frontend Integration

The client sessions page (`/client/sessions`) is now fully integrated and will:

1. ✅ Load all booked sessions for the logged-in client
2. ✅ Display session details (coach, date, time, type, status)
3. ✅ Show session statistics (completed, scheduled, avg rating, total)
4. ✅ Allow filtering by status (all, scheduled, completed, cancelled, no_show)
5. ✅ Allow sorting (newest, oldest, rating, duration)
6. ✅ Enable cancellation of scheduled sessions
7. ✅ Display motivational messages based on progress

## Next Steps for Coaches

To enable the full booking experience, you'll need to create:

1. **Coach Availability Management Screen** (`/coach/availability`)

   - UI to add/edit/delete time slots
   - Calendar view of availability
   - Recurring pattern setup

2. **Client Booking Interface** (`/client/book-session`)

   - Browse coaches
   - View available time slots
   - Book sessions
   - Select session type

3. **Session Management Dashboard** (for both roles)
   - Upcoming sessions
   - Session history
   - Quick actions (cancel, complete, rate)

## Testing Checklist

- [ ] Run the SQL schema in Supabase
- [ ] Verify tables were created
- [ ] (Optional) Add sample data
- [ ] Test client sessions page loads without errors
- [ ] Verify empty state displays correctly
- [ ] Create a time slot manually in Supabase
- [ ] Book a session manually in Supabase
- [ ] Verify session appears on client sessions page
- [ ] Test cancellation functionality
- [ ] Test filtering and sorting

## Troubleshooting

### Issue: "Could not find a relationship" error

**Solution**: Make sure you've run the complete SQL schema. The tables need to exist before the app can query them.

### Issue: Sessions not showing up

**Solution**: Check RLS policies. Make sure the logged-in user ID matches the client_id in the booked_sessions table.

### Issue: Can't book sessions

**Solution**: Verify that:

1. Time slots exist for the desired date
2. Time slots are marked as `is_available = true`
3. The client is logged in and their profile exists

### Issue: Cancellation not working

**Solution**: Ensure the session status is 'scheduled' and the logged-in user is the client who booked it.

## API Examples (for future implementation)

### TypeScript/React Examples

```typescript
// Get available slots
const getAvailableSlots = async (coachId: string, date: string) => {
  const { data, error } = await supabase.rpc("get_available_time_slots", {
    p_coach_id: coachId,
    p_date: date,
  });
  return data;
};

// Book a session
const bookSession = async (
  timeSlotId: string,
  clientId: string,
  notes?: string
) => {
  const { data, error } = await supabase.rpc("book_session", {
    p_time_slot_id: timeSlotId,
    p_client_id: clientId,
    p_session_type: "personal_training",
    p_notes: notes,
  });
  return data;
};

// Cancel a session
const cancelSession = async (
  sessionId: string,
  userId: string,
  reason?: string
) => {
  const { data, error } = await supabase.rpc("cancel_session", {
    p_session_id: sessionId,
    p_cancelled_by: userId,
    p_reason: reason,
  });
  return data;
};

// Rate a session
const rateSession = async (
  sessionId: string,
  clientId: string,
  rating: number,
  feedback?: string
) => {
  const { data, error } = await supabase.rpc("add_session_feedback", {
    p_session_id: sessionId,
    p_client_id: clientId,
    p_rating: rating,
    p_feedback: feedback,
  });
  return data;
};
```

## Support

If you encounter any issues during setup, check:

1. Supabase SQL Editor for error messages
2. Browser console for frontend errors
3. Supabase logs for RLS policy violations
4. This guide's troubleshooting section

---

**Last Updated**: October 2025
**Schema Version**: 1.0
