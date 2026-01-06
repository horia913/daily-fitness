# Slice 05: Gate Client Navigation by `client_type`

## ✅ Completed Changes

### Files Created
1. **`src/components/guards/ClientTypeGuard.tsx`**
   - New guard component for gating features by client_type
   - Shows friendly "Feature Not Available" message for unauthorized access
   - Supports both 'online' and 'in_gym' client types
   - Loading and error states handled gracefully

### Files Modified
1. **`src/app/client/sessions/page.tsx`**
   - Wrapped with `<ClientTypeGuard requiredType="in_gym">`
   - Online clients now see access denied message
   - In-gym clients have full access

2. **`src/app/client/scheduling/page.tsx`**
   - Wrapped with `<ClientTypeGuard requiredType="in_gym">`
   - Online clients now see access denied message
   - In-gym clients have full access

### Files Verified (No Changes Needed)
- **`src/app/client/clipcards/page.tsx`**
  - ✅ Accessible to BOTH client types (as designed)
  - Used for monthly payment cadence tracking
  - No gating applied

## 🎯 Behavior Summary

### For Online Clients (`client_type = 'online'`)
- ❌ **Cannot access**: `/client/sessions`, `/client/scheduling`
- ✅ **Can access**: All other features including `/client/clipcards`
- 📱 **User Experience**: Shows friendly message explaining feature is for in-gym clients

### For In-Gym Clients (`client_type = 'in_gym'`)
- ✅ **Full access** to all features including sessions and scheduling
- 📅 Can view upcoming sessions (read-only)
- 💳 Can track clipcards for payment cadence

## 🧪 Testing Checklist

### Manual Testing Steps
1. **As Online Client**:
   - [ ] Navigate to `/client/sessions` → Should see "Feature Not Available" message
   - [ ] Navigate to `/client/scheduling` → Should see "Feature Not Available" message
   - [ ] Navigate to `/client/clipcards` → Should work normally
   - [ ] Click "Go to Dashboard" button → Should redirect to `/client`

2. **As In-Gym Client**:
   - [ ] Navigate to `/client/sessions` → Should see sessions page
   - [ ] Navigate to `/client/scheduling` → Should see scheduling page
   - [ ] Navigate to `/client/clipcards` → Should work normally

3. **Database Prerequisite**:
   - [ ] Migration from Slice 04 must be run first
   - [ ] Verify: `SELECT client_type, count(*) FROM profiles GROUP BY client_type;`
   - [ ] Test users should have correct `client_type` values

## 📝 Implementation Notes

- **Guard Component Pattern**: Reusable `ClientTypeGuard` can be applied to other features
- **Defaults to 'online'**: If `client_type` is null/undefined, assumes 'online' (safest default)
- **No Navigation Changes**: Bottom nav doesn't show/hide items (users can still attempt access)
- **Friendly UX**: Clear messaging when access is denied, not just a blank page

## 🔄 Next Steps (Remaining Slices)

After Slice 05, proceed to:
- **Slice 07**: Link workout containers (DB + API changes)
- **Slice 10**: Consolidate scheduling model
- **Slice 12**: Canonicalize nutrition photos

## ⚠️ User Action Required

Before testing Slice 05:
1. **Run Slice 04 migration** if not done yet:
   ```sql
   -- See migrations/2025-12-28_add_profiles_client_type.sql
   ```

2. **Set test users' client_type**:
   ```sql
   -- Mark specific clients as in_gym
   UPDATE profiles 
   SET client_type = 'in_gym' 
   WHERE email IN ('test-gym-client@example.com');
   
   -- Others default to 'online'
   ```

3. **Run `npm run build`** to verify no regressions

