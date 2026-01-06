# 📋 What's Next - Action Items

**Database fixes**: ✅ **COMPLETE**

---

## 🎯 Immediate Next Steps (In Order)

### **1. Storage Bucket Policies** ⏭️ **DO THIS NOW** (3 minutes)

**File to read**: `STORAGE_POLICIES_TO_UPDATE.md`

**Where**: Supabase Dashboard → Storage → `meal-photos` → Policies

**Action**: Remove client UPDATE/DELETE policies from storage bucket

---

### **2. Frontend Integration** ⏭️ **THEN THIS** (6-8 hours)

**Priorities** (in order):

#### **Priority 1: Client Dashboard** (2 hours)
- File: `src/app/client/page.tsx`
- Replace hardcoded `streak` and `weeklyProgress`
- Call `get_next_due_workout()` RPC
- Show week progress: "2/4 workouts this week"

#### **Priority 2: Workout Completion** (2 hours)
- File: `src/app/client/workouts/[id]/start/page.tsx` (complete handler)
- Call `complete_workout()` RPC with correct parameters
- Handle "week complete" celebration
- Refresh to next due workout

#### **Priority 3: Nutrition One-Shot** (2 hours)
- Files: `src/app/client/nutrition/page.tsx` + `src/app/client/progress/nutrition/page.tsx`
- Use `mealPhotoService.uploadMealPhoto()`
- Disable button when logged: `disabled={meal.logged}`
- Remove photo viewing (clients can't see back)

#### **Priority 4: Coach Client Detail** (2 hours)
- File: `src/app/coach/clients/[id]/page.tsx`
- Remove hardcoded "Sarah Johnson" data
- Query real program progress
- Show today's adherence metrics

**See**: `FRONTEND_BACKEND_GAP_ANALYSIS.md` for full details

---

### **3. Testing** ⏭️ **FINALLY THIS** (4 hours)

Test these scenarios:
- [ ] 3-workout week progression
- [ ] 5-workout week progression
- [ ] Any-order completion
- [ ] Week locking
- [ ] Duplicate prevention
- [ ] Meal photo one-shot

---

## 📁 Key Files for Reference

**Read these**:
- `DATABASE_FIXES_COMPLETE.md` ← What got fixed (summary)
- `FRONTEND_BACKEND_GAP_ANALYSIS.md` ← What UI needs updating
- `STORAGE_POLICIES_TO_UPDATE.md` ← Storage bucket setup
- `CRITICAL_ARCHITECTURE_FIXES_REQUIRED.md` ← Full explanation

**Code to update**:
- `src/app/client/page.tsx`
- `src/app/client/workouts/[id]/start/page.tsx`
- `src/app/client/nutrition/page.tsx`
- `src/app/coach/clients/[id]/page.tsx`
- `src/lib/mealPhotoService.ts`

**New code to create**:
- `src/lib/programProgressionService.ts` (wrapper for RPC functions)

---

## ⏱️ Time Estimate

- ✅ Database fixes: **DONE**
- ⏳ Storage policies: **3 minutes**
- ⏳ Frontend integration: **6-8 hours**
- ⏳ Testing: **4 hours**

**Total remaining**: ~12-14 hours (1.5-2 days of focused work)

---

## 🚀 Launch Readiness

**For January launch, you MUST complete**:
1. ✅ Database architecture fixes (DONE)
2. Storage bucket policies (3 min)
3. Frontend integration (core screens only)
4. Basic testing (8 scenarios)

**Optional (can do post-launch)**:
- Performance test UI
- Challenges UI
- Body metrics enhancements
- Service layer consolidation

---

**Start with storage policies, then tackle frontend integration. You're on the home stretch!** 🎯

