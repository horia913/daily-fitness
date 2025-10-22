# 🐛 Bug Testing Checklist

## How to Test

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Test each item below
4. Mark ✅ if works, ❌ if broken, and note the error

---

## 🔐 Authentication Screens

### Landing Page (`/`)

- [ ] Page loads
- [ ] Sign Up tab works
- [ ] Sign In tab works
- [ ] Password toggle (eye icon) works
- [ ] Form submits
- [ ] Error messages display
- [ ] Success messages display

### Simple Auth (`/simple-auth`)

- [ ] Page loads
- [ ] Toggle between Login/Signup works
- [ ] Form submission works
- [ ] Redirects after login

---

## 👨‍🏫 Coach Screens

### Coach Dashboard (`/coach`)

- [ ] Dashboard loads
- [ ] Stats display correctly
- [ ] "Add Client" button works
- [ ] "Create Workout" button works
- [ ] Navigation buttons work

### Client Management (`/coach/clients`)

- [ ] Clients list loads
- [ ] "Add Client" button opens modal
- [ ] Add Client modal scrolls properly
- [ ] Can create new client
- [ ] Client cards display
- [ ] View client details works

### Exercise Library (`/coach/exercises`)

- [ ] Exercise list loads
- [ ] "Add Exercise" button works
- [ ] Exercise form modal opens
- [ ] **Exercise form modal scrolls properly** ⭐
- [ ] Can add exercise
- [ ] Edit exercise button works
- [ ] **"Shuffle" (alternatives) button works** ⭐
- [ ] Alternatives modal opens
- [ ] Alternatives modal scrolls properly
- [ ] Can add alternative
- [ ] Can delete alternative
- [ ] Grid/List toggle works
- [ ] Search works
- [ ] Filters work

### Workout Management (`/coach/workouts`)

- [ ] Workouts list loads
- [ ] "Create Workout" button works
- [ ] Create workout modal opens
- [ ] Create workout modal scrolls
- [ ] Can add exercises to workout
- [ ] Can save workout
- [ ] Edit workout works
- [ ] Delete workout works

### Programs (`/coach/programs`)

- [ ] Programs list loads
- [ ] Create program button works
- [ ] Program form modal works
- [ ] Modal scrolls properly

### Nutrition (`/coach/nutrition` & `/coach/meals`)

- [ ] Nutrition page loads
- [ ] Meals page loads
- [ ] Create meal plan button works
- [ ] Form modal scrolls

### Sessions (`/coach/sessions`)

- [ ] Sessions page loads
- [ ] Create session button works
- [ ] Session form works

### Scheduling (`/coach/scheduling`)

- [ ] Availability page loads
- [ ] Can set availability
- [ ] Save button works

### Goals (`/coach/goals`)

- [ ] Goals page loads
- [ ] Create goal button works
- [ ] Goal modal scrolls

### Habits (`/coach/habits`)

- [ ] Habits page loads
- [ ] Create habit button works
- [ ] Habit modal works

### Clipcards (`/coach/clipcards`)

- [ ] Clipcards page loads
- [ ] Create clipcard button works
- [ ] Upload works

### Achievements (`/coach/achievements`)

- [ ] Achievements page loads
- [ ] Create achievement works

---

## 👤 Client Screens

### Client Dashboard (`/client`)

- [ ] Dashboard loads
- [ ] Today's workout displays
- [ ] Stats display
- [ ] "Start Workout" button works (if workout available)
- [ ] Current program displays

### Workouts (`/client/workouts`)

- [ ] Workouts page loads
- [ ] Today's workout card shows
- [ ] "Start Workout" button works
- [ ] Workout execution page loads (`/client/workouts/[id]/start`)
- [ ] Can log sets/reps
- [ ] Rest timer works
- [ ] **Exercise swap button works** ⭐
- [ ] Can complete workout
- [ ] History displays

### Nutrition (`/client/nutrition`)

- [ ] Nutrition page loads
- [ ] Can log food
- [ ] Macro dashboard displays
- [ ] Charts render

### Progress (`/client/progress`)

- [ ] Progress page loads
- [ ] Can add measurements
- [ ] Can upload photos
- [ ] Charts display

### Sessions (`/client/sessions`)

- [ ] Sessions page loads
- [ ] Can book session
- [ ] Sessions list displays

### Scheduling (`/client/scheduling`)

- [ ] Coach availability loads
- [ ] Can select time slot
- [ ] Booking works

### Goals (`/client/goals`)

- [ ] Goals page loads
- [ ] Assigned goals display
- [ ] Can update progress

### Habits (`/client/habits`)

- [ ] Habits page loads
- [ ] Can check off habits
- [ ] Streaks display

### Clipcards (`/client/clipcards`)

- [ ] Clipcards page loads
- [ ] Can view content
- [ ] Videos/images load

### Achievements (`/client/achievements`)

- [ ] Achievements page loads
- [ ] Earned achievements display

---

## 📱 Mobile Testing

Test on mobile (iPhone size - 375px):

### Critical Mobile Tests

- [ ] Navigation menu works
- [ ] Modals fit on screen
- [ ] Modals scroll properly
- [ ] Forms are usable
- [ ] Buttons are tappable (44x44px minimum)
- [ ] No horizontal scroll
- [ ] Text is readable
- [ ] Cards stack properly

### Specific Modal Tests on Mobile

- [ ] Exercise Form modal (long form)
- [ ] Exercise Alternatives modal
- [ ] Create Workout modal
- [ ] Add Client modal
- [ ] Any modal with lots of content

---

## 🌙 Dark Mode Testing

Test EVERY screen in dark mode:

- [ ] Toggle dark mode works
- [ ] All text is readable
- [ ] All buttons are visible
- [ ] Modals display correctly
- [ ] Cards have proper contrast
- [ ] No white flashes on load

---

## 🔍 Common Issues to Look For

### Modal Issues

- **Symptom**: Modal content is cut off
- **Check**: Is `overflow-y-auto` on content div?
- **Check**: Is modal height constrained properly?
- **Check**: Does header/footer have `flex-shrink-0`?

### Button Issues

- **Symptom**: Button doesn't respond
- **Check**: Console for errors
- **Check**: Is `onClick` handler defined?
- **Check**: Is button disabled?
- **Check**: Is there a z-index issue?

### Scroll Issues

- **Symptom**: Can't scroll modal content
- **Check**: Is content div taller than modal?
- **Check**: Is `overflow-y-auto` applied?
- **Check**: Is content div flex-1?

### Form Issues

- **Symptom**: Can't submit form
- **Check**: Console for validation errors
- **Check**: Are all required fields filled?
- **Check**: Is submit button enabled?

---

## 🚨 Priority Fixes

Mark which issues are CRITICAL (must fix before deploy):

### Critical Bugs (Must Fix)

- [ ] Authentication broken
- [ ] Can't create workouts
- [ ] Can't assign workouts to clients
- [ ] Database errors
- [ ] App crashes

### High Priority (Should Fix)

- [ ] Modal scrolling issues
- [ ] Buttons not working
- [ ] Mobile layout broken
- [ ] Forms not submitting

### Medium Priority (Nice to Fix)

- [ ] UI glitches
- [ ] Dark mode inconsistencies
- [ ] Missing error messages

### Low Priority (Can Fix Post-Deploy)

- [ ] Visual polish
- [ ] Loading states
- [ ] Empty states

---

## 📝 Report Template

For each bug, use this format:

```
**Page**: /coach/exercises
**Issue**: Exercise Form modal doesn't scroll
**Steps**:
1. Click "Add Exercise"
2. Fill out long form
3. Try to scroll to save button
**Expected**: Modal content should scroll
**Actual**: Content is cut off, can't reach save button
**Console Error**: [paste any errors]
**Screenshot**: [if helpful]
```

---

## ✅ Once All Tests Pass

- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors on key pages
- [ ] All critical features work
- [ ] Mobile works
- [ ] Dark mode works
- [ ] Ready for deployment! 🚀

---

**Start testing and report back which items are ❌**

We'll fix them systematically!
