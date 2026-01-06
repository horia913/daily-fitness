# Slice 10: Scheduling Consolidation

## ✅ Completed

### Files Created

1. **`src/lib/schedulingService.ts`** (500+ lines)
   - Centralized service for all scheduling/session operations
   - **3 Main Domains**:
     - **Coach Sessions**: In-gym session scheduling and attendance
     - **Coach Availability**: Define when coach is available for bookings
     - **Clipcards**: Session packs (in-gym) & monthly credits (online)

### Key Functions

#### Coach Sessions
- `getCoachSessions(coachId, startDate?, endDate?)` - Get all coach sessions
- `getClientSessions(clientId, includeCompleted?)` - Get client's gym sessions
- `createSession(session)` - Schedule a new session
- `updateSessionStatus(sessionId, status, notes?)` - Mark completed/cancelled
- `deleteSession(sessionId)` - Remove session

#### Coach Availability
- `getCoachAvailability(coachId)` - Get coach's weekly availability
- `upsertAvailability(availability)` - Create or update availability slot
- `deleteAvailability(availabilityId)` - Remove availability

#### Clipcards
- `getClientClipcards(clientId, activeOnly?)` - Get all clipcards for client
- `getActiveClipcardForClient(clientId)` - Get current active clipcard
- `createClipcardentry(clipcard)` - Create new clipcard (pack or monthly)
- `useClipcardSession(clipcardId)` - Decrement sessions_remaining
- `hasActiveClipcardcard(clientId)` - Quick check if client has active credits

#### Helper Functions
- `getSessionsForDate(coachId, date)` - Sessions on specific date
- `getTodaysSessions(coachId)` - Today's sessions
- `getUpcomingClientSessions(clientId, daysAhead?)` - Next N days of sessions

## 📊 Assumed Schema

The service assumes these tables exist (based on code analysis):

### `coach_sessions`
```sql
id UUID PRIMARY KEY
coach_id UUID REFERENCES profiles(id)
client_id UUID REFERENCES profiles(id)
session_date DATE
session_time TIME
duration_minutes INT
status TEXT ('scheduled'|'completed'|'cancelled'|'no_show')
session_type TEXT
notes TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `coach_availability`
```sql
id UUID PRIMARY KEY
coach_id UUID REFERENCES profiles(id)
day_of_week INT (0=Sunday, 6=Saturday)
start_time TIME
end_time TIME
is_active BOOLEAN
created_at TIMESTAMP
```

### `clipcards`
```sql
id UUID PRIMARY KEY
client_id UUID REFERENCES profiles(id)
coach_id UUID REFERENCES profiles(id)
sessions_total INT
sessions_used INT
sessions_remaining INT
start_date DATE
end_date DATE
status TEXT ('active'|'expired'|'exhausted')
is_recurring BOOLEAN (true for monthly online, false for packs)
notes TEXT
created_at TIMESTAMP
```

## ⚠️ Manual Verification Required

### Step 1: Run Slice 09 Inventory Queries
If you haven't already, run the queries in `SLICE_09_INVENTORY_QUERIES.sql` to understand your actual schema.

### Step 2: Verify Table Names
Check if these tables exist in your database:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('coach_sessions', 'coach_availability', 'clipcards');
```

**If table names differ**:
- Update `schedulingService.ts` to use your actual table names
- Common alternatives: `sessions`, `booked_sessions`, `session_packs`, `credits`

### Step 3: Verify Column Names
For each table, check column names match:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coach_sessions'; -- repeat for each table
```

**If columns differ**:
- Update TypeScript interfaces in `schedulingService.ts`
- Update `.select()` and `.insert()` queries

### Step 4: Check Relationships
Verify foreign keys:
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('coach_sessions', 'coach_availability', 'clipcards');
```

## 🔄 Migration Path (If Schema Differs)

### If Tables Don't Exist
You can create them using the assumed schema above, or:
1. Identify which tables DO handle scheduling in your DB
2. Adapt `schedulingService.ts` to use those tables
3. Update TypeScript interfaces to match

### If You Have Duplicate Tables
Example: Both `coach_sessions` AND `booked_sessions`:
1. Decide which is canonical (check which has more data)
2. Migrate data from deprecated table to canonical
3. Update service to use canonical table
4. Drop deprecated table (after verifying migration)

## 🎯 Usage Example

### Coach Scheduling Page
```typescript
import { getCoachSessions, getCoachAvailability } from '@/lib/schedulingService';

// Get this week's sessions
const sessions = await getCoachSessions(coachId, startOfWeek, endOfWeek);

// Get availability for settings
const availability = await getCoachAvailability(coachId);
```

### Client Sessions Page
```typescript
import { getUpcomingClientSessions, hasActiveClipcardcard } from '@/lib/schedulingService';

// Show upcoming sessions (in-gym clients only)
const upcomingSessions = await getUpcomingClientSessions(clientId, 14); // next 2 weeks

// Check if client can book
const canBook = await hasActiveClipcardcard(clientId);
```

### Clipcard Management
```typescript
import { getActiveClipcardForClient, useClipcardSession } from '@/lib/schedulingService';

// Show client's current pack/credits
const clipcard = await getActiveClipcardForClient(clientId);

// After attending a session
await useClipcardSession(clipcard.id);
```

## 📝 Next Steps (Slice 11)

**Slice 11** will update the actual scheduling pages to use this service:
- `/coach/scheduling` - Use service instead of direct queries
- `/coach/availability` - Use service for availability management
- `/client/sessions` - Use service for viewing upcoming sessions (in-gym only)
- `/client/scheduling` - Use service (or hide if not needed)

## ✅ Slice 10 Complete

**Status**: Service layer ready, awaiting schema verification

**Build Impact**: Zero (no existing code changed, service is additive)

**Manual Work**: Verify schema matches assumptions (see above)

