# ✅ OneSignal Setup Checklist - Step by Step

## 📋 Complete Setup Guide

Follow these steps in order to properly integrate OneSignal for email and push notifications.

---

## Phase 1: OneSignal Account Setup (10 minutes)

### Step 1: Create OneSignal Account

- [ ] Go to https://onesignal.com
- [ ] Click "Get Started Free"
- [ ] Sign up with your email
- [ ] Verify your email

### Step 2: Create Your App

- [ ] Click "New App/Website"
- [ ] Name: "FitCoach Pro" (or your app name)
- [ ] Select platform: **Web**
- [ ] Click "Next"

### Step 3: Configure Web Push

- [ ] Site Name: FitCoach Pro
- [ ] Site URL (for now): `http://localhost:3000`
- [ ] Auto Resubscribe: **ON**
- [ ] Default Icon URL: Upload your app logo (optional)
- [ ] Choose prompt style: **Slide Prompt** (recommended)
- [ ] Click "Save"

### Step 4: Get Your Credentials

- [ ] Go to Settings → Keys & IDs
- [ ] Copy **App ID** - save it
- [ ] Copy **REST API Key** - save it
- [ ] Copy **Safari Web ID** (if shown) - save it

---

## Phase 2: Environment Variables (2 minutes)

### Add to `.env.local`:

```env
# OneSignal Credentials
NEXT_PUBLIC_ONESIGNAL_APP_ID=paste_your_app_id_here
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=paste_safari_web_id_here
ONESIGNAL_REST_API_KEY=paste_your_rest_api_key_here

# App URL (update after deploying to Vercel)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**:

- ✅ `NEXT_PUBLIC_*` variables are safe for frontend
- ⚠️ `ONESIGNAL_REST_API_KEY` has NO `NEXT_PUBLIC_` prefix (server-only!)

---

## Phase 3: Code Integration (Already Done! ✅)

I've already created these files for you:

- ✅ `src/lib/oneSignal.ts` - OneSignal SDK wrapper
- ✅ `src/lib/notifications.ts` - Server-side sending
- ✅ `src/lib/notificationHelpers.ts` - Helper functions
- ✅ `src/components/NotificationPrompt.tsx` - UI prompt
- ✅ `src/app/api/notifications/send/route.ts` - API route
- ✅ `public/OneSignalSDKWorker.js` - Service worker
- ✅ `next.config.ts` - Service worker configuration
- ✅ `src/contexts/AuthContext.tsx` - Auto-subscribe on login

---

## Phase 4: Add Notification Prompt to App (2 minutes)

### Update Client Dashboard

Add the notification prompt to `src/app/client/page.tsx`:

```typescript
import NotificationPrompt from "@/components/NotificationPrompt";

export default function ClientDashboard() {
  return (
    <div>
      {/* ... existing content ... */}

      <NotificationPrompt />
    </div>
  );
}
```

### Update Coach Dashboard (Optional)

Add to `src/app/coach/page.tsx` if you want coaches to get notifications too:

```typescript
import NotificationPrompt from "@/components/NotificationPrompt";

export default function CoachDashboard() {
  return (
    <div>
      {/* ... existing content ... */}

      <NotificationPrompt />
    </div>
  );
}
```

---

## Phase 5: Configure Email in OneSignal (5 minutes)

### Step 1: Enable Email Channel

- [ ] Go to OneSignal Dashboard
- [ ] Click **Messages** → **Email**
- [ ] Click **Get Started** or **Email Settings**

### Step 2: Choose Email Method

**Option A: Use OneSignal Email (Easiest)**

- [ ] Select "Use OneSignal Email"
- [ ] Set **From Name**: FitCoach Pro
- [ ] Set **From Email**: noreply@onesignal.com (or connect your domain)
- [ ] Save

**Option B: Connect Your Email Provider (Better)**

- [ ] Connect SendGrid, Mailgun, or custom SMTP
- [ ] Follow OneSignal's integration wizard
- [ ] Test connection

### Step 3: Verify Email Setup

- [ ] Send test email from OneSignal dashboard
- [ ] Check it arrives in your inbox
- [ ] Check it's not in spam

---

## Phase 6: Database Setup (3 minutes)

### Create Notification Preferences Table

Run this in Supabase SQL Editor:

```sql
-- User notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    workout_assigned BOOLEAN DEFAULT true,
    session_booked BOOLEAN DEFAULT true,
    achievement_earned BOOLEAN DEFAULT true,
    goal_reminder BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
ON public.notification_preferences FOR ALL
USING (user_id = auth.uid());
```

---

## Phase 7: Testing (10 minutes)

### Test Push Notifications:

1. **Start your app**:

   ```bash
   npm run dev
   ```

2. **Sign in to your app**

3. **Check browser console**:

   - Should see: "✅ OneSignal initialized successfully"
   - Should see: "✅ User subscribed to OneSignal: [user-id]"

4. **Look for notification prompt**:

   - Should appear after 5 seconds
   - Click "Enable"
   - Grant permission in browser

5. **Test sending from OneSignal Dashboard**:
   - Go to Messages → New Push
   - Send to "Test Users" or "Subscribed Users"
   - Check notification appears

### Test Email:

1. **In OneSignal Dashboard**:

   - Go to Messages → New Email
   - Select your test user
   - Send test email
   - Check inbox

2. **Test from App**:
   - Use the `/api/notifications/send` endpoint
   - Or trigger a workout assignment
   - Check email arrives

---

## Phase 8: Integration Points (Where to Add Notifications)

### Already Integrated:

- ✅ **Login/Logout** - Auto subscribe/unsubscribe (AuthContext)
- ✅ **User Identification** - Tags users with role, name

### Need to Add (Do These Next):

#### 1. Workout Assignment

File: When coach assigns workout to client

```typescript
import { notifyWorkoutAssigned } from "@/lib/notificationHelpers";

// After successfully assigning workout:
await notifyWorkoutAssigned(
  clientId,
  workoutName,
  coachName,
  process.env.NEXT_PUBLIC_APP_URL!
);
```

#### 2. Session Booking

File: When client books session

```typescript
import { notifySessionBooked } from "@/lib/notificationHelpers";

// After booking confirmed:
await notifySessionBooked(
  coachId,
  clientName,
  sessionDate,
  sessionTime,
  process.env.NEXT_PUBLIC_APP_URL!
);
```

#### 3. Workout Completion

File: When client completes workout

```typescript
import { notifyWorkoutCompleted } from "@/lib/notificationHelpers";

// After workout completed:
await notifyWorkoutCompleted(
  coachId,
  clientName,
  workoutName,
  process.env.NEXT_PUBLIC_APP_URL!
);
```

#### 4. Achievement Earned

File: When client earns achievement

```typescript
import { notifyAchievementEarned } from "@/lib/notificationHelpers";

// After awarding achievement:
await notifyAchievementEarned(
  clientId,
  achievementName,
  process.env.NEXT_PUBLIC_APP_URL!
);
```

---

## Phase 9: Vercel Deployment Setup

### Environment Variables in Vercel:

When deploying to Vercel, add these in:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

```
NEXT_PUBLIC_SUPABASE_URL=your_value
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_value
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your_value
ONESIGNAL_REST_API_KEY=your_value (⚠️ NOT NEXT_PUBLIC_)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Update OneSignal After Deployment:

After deploying to Vercel:

1. [ ] Go to OneSignal → Settings → Platforms → Web Push
2. [ ] Update **Site URL** to: `https://your-app.vercel.app`
3. [ ] Add to **Allowed Origins**: `https://your-app.vercel.app`
4. [ ] Save changes

---

## Phase 10: Email Templates (Optional but Recommended)

### Create in OneSignal Dashboard:

1. Go to **Messages** → **Templates** → **Email Templates**
2. Create templates for:

   - [ ] Workout Assigned
   - [ ] Session Confirmed
   - [ ] Achievement Unlocked
   - [ ] Goal Reached
   - [ ] Weekly Summary

3. Use template IDs in your code

---

## 🧪 Final Testing Checklist

### Push Notifications:

- [ ] User sees notification prompt after login
- [ ] Clicking "Enable" requests browser permission
- [ ] Permission granted successfully
- [ ] Test notification appears from OneSignal dashboard
- [ ] Notification click opens correct URL

### Email Notifications:

- [ ] Test email sends from OneSignal dashboard
- [ ] Email arrives in inbox (check spam)
- [ ] Email renders correctly (images, links work)
- [ ] Unsubscribe link works (if included)

### App Integration:

- [ ] Workout assignment triggers notification
- [ ] Session booking triggers notification
- [ ] Notifications appear on mobile
- [ ] Notifications appear on desktop
- [ ] Email + Push both work together

---

## 🔧 Troubleshooting

### Issue: "OneSignal App ID not found"

**Solution**: Check `.env.local` has `NEXT_PUBLIC_ONESIGNAL_APP_ID`

### Issue: Notification doesn't send

**Solution**:

- Check API key is correct
- Check user is subscribed (OneSignal dashboard → Audience)
- Check browser console for errors

### Issue: Email doesn't arrive

**Solution**:

- Check spam folder
- Verify email channel is configured in OneSignal
- Check user has email in OneSignal (Dashboard → Audience → Users)

### Issue: Service worker not loading

**Solution**:

- Check `public/OneSignalSDKWorker.js` exists
- Check `next.config.ts` has headers configuration
- Hard refresh browser (Ctrl+Shift+R)

---

## 📊 Monitor & Analytics

### OneSignal Dashboard Shows:

- ✅ Total subscribers
- ✅ Notification delivery rate
- ✅ Click-through rate
- ✅ Email open rate
- ✅ User segments (coaches vs clients)

**Access**: OneSignal Dashboard → Analytics

---

## ✅ You're Done When:

- [ ] OneSignal app created
- [ ] Environment variables added
- [ ] App builds without errors
- [ ] User can sign in
- [ ] Notification prompt appears
- [ ] Push notifications work
- [ ] Emails work
- [ ] Notifications send from app actions

---

## 🚀 Next Steps

1. **Complete OneSignal setup** (this checklist)
2. **Test notifications thoroughly**
3. **Run database migrations** (exercise_alternatives, RLS policies)
4. **Test core features**
5. **Deploy to Vercel**
6. **Update OneSignal with production URL**
7. **Test on production**
8. **Share with real users!**

---

**This is the PROPER setup - no shortcuts, no cutting corners!** 💪

Take your time, follow each step, and you'll have a professional notification system.
