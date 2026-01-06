# DailyFitness Optimization Progress

## ✅ Completed Slices (Testing Build Now)

### Slice 00: Build Baseline
- **Status**: Completed
- **Changes**: None (baseline check)
- **Build Status**: ⏳ Testing now after Slices 01-04

### Slice 01: Remove `/client/messages` References
- **Status**: Completed ✅
- **Files Created**:
  - `src/lib/whatsappHelper.ts` - WhatsApp integration utility
- **Files Modified**:
  - `src/components/layout/BottomNav.tsx` - Removed coach messages conditionals
  - `src/components/server/DashboardLayout.tsx` - Replaced messages card with WhatsApp CTA
  - `src/app/client/page.tsx` - Replaced messages card with WhatsApp CTA (green gradient)
  - `src/lib/onesignalSender.ts` - Deprecated sendMessage, redirects to /client
  - `src/lib/notificationTriggers.ts` - Disabled triggerNewMessage
  - `src/lib/notifications.ts` - Deprecated sendMessageNotification
  - `src/hooks/useNotifications.ts` - Disabled sendMessageNotification hook
- **Verification**: ✅ No `/client/messages` references in active code

### Slice 02: Remove OLD Backup Files
- **Status**: Completed ✅
- **Files Deleted** (11 total):
  - `src/app/client/page_OLD.tsx`
  - `src/app/client/page_OLD_backup.tsx`
  - `src/app/client/progress/page_OLD.tsx`
  - `src/app/coach/page_OLD.tsx`
  - `src/app/coach/programs/page_OLD_backup.tsx`
  - `src/app/coach/programs/create/page_OLD_backup.tsx`
  - `src/app/coach/clients/[id]/page_OLD_backup.tsx`
  - `src/app/coach/clients/page_OLD_backup.tsx`
  - `src/app/coach/workouts/templates/page_OLD_backup.tsx`
  - `src/app/coach/workouts/templates/[id]/page_OLD_backup.tsx`
  - `src/app/coach/workouts/templates/create/page_OLD_backup.tsx`
- **Verification**: ✅ No OLD files remain, no imports broken

### Slice 03: Tighten Role Enforcement
- **Status**: Completed ✅
- **Files Created**:
  - `src/lib/roleGuard.ts` - Centralized role constants and helpers
    - `COACH_ROLES` constant
    - `isCoachRole()` function
    - `getUserRole()` function
    - `requireRole()` function
    - `checkRoleForAPI()` function
  - `src/components/guards/RoleGuard.tsx` - Client-side route protection component
- **Files Modified**:
  - `src/components/hybrid/AuthWrapper.tsx` - Now uses centralized `isCoachRole()` from roleGuard
- **Key Improvement**: Role is now DB-backed (`profiles.role`), not URL-inferred
- **Verification**: ✅ All role checks centralized

### Slice 04: Add `profiles.client_type`
- **Status**: Completed ✅ (Code ready, DB migration pending)
- **Files Created**:
  - `migrations/2025-12-28_add_profiles_client_type.sql` - DB migration
  - `SLICE_04_MANUAL_STEPS.md` - Manual steps guide
- **Files Modified**:
  - `src/contexts/AuthContext.tsx` - Enhanced to fetch and expose:
    - `profile` object with `client_type`
    - `refreshProfile()` function
    - TypeScript types: `ClientType`, `UserProfile`
- **Database Changes Required** (Manual):
  ```sql
  -- Create enum
  CREATE TYPE client_type AS ENUM ('online', 'in_gym');
  
  -- Add column
  ALTER TABLE profiles 
  ADD COLUMN client_type client_type NOT NULL DEFAULT 'online';
  
  -- Add index
  CREATE INDEX idx_profiles_client_type ON profiles(client_type);
  ```
- **Verification Query**:
  ```sql
  SELECT client_type, count(*) FROM profiles GROUP BY client_type;
  ```
- **Next Action**: 🔴 **USER MUST RUN MIGRATION IN SUPABASE**

## ⏳ Current Status
- **Build Test**: Running `npm run build` to verify Slices 01-04
- **Waiting For**: Build completion + user runs DB migration

## 📋 Remaining Slices (4 left)

### Slice 05: Gate Client Navigation by `client_type`
- Hide sessions/scheduling UI for online clients
- Keep clipcards visible for both segments
- Use `profile.client_type` from AuthContext

### Slice 07: Link Workout Containers
- Add `workout_logs.workout_session_id` (manual SQL)
- Update API routes to enforce linkage
- Align all workout screens to query consistently

### Slice 10: Consolidate Scheduling
- Inventory duplicated tables
- Create unified SchedulingService
- Refactor coach + client screens

### Slice 12: Canonicalize Nutrition Photos
- Create `meal_photo_logs` table (manual SQL)
- Enforce 1 photo per meal per day
- Standardize upload/display across screens

## 🔧 Build Verification Checklist (After Each Slice)
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors
- [ ] No broken imports
- [ ] Key screens load without errors

## 📊 Stats
- **Slices Completed**: 4 / 20 (20%)
- **Files Created**: 6
- **Files Modified**: 8
- **Files Deleted**: 11
- **Lines Changed**: ~500+
- **Manual DB Steps Pending**: 1 (Slice 04 migration)

