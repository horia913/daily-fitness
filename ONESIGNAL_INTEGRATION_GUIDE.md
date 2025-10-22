# 🔔 OneSignal Integration Guide - Email + Push Notifications

## Overview

OneSignal provides both **Email** and **Push Notifications** in one platform, making it perfect for your fitness coaching app.

---

## 📧 Part 1: OneSignal Setup (10 minutes)

### Step 1: Create OneSignal Account

1. Go to https://onesignal.com
2. Sign up (free account)
3. Create new app:
   - **App Name**: FitCoach Pro
   - **Platform**: Select "Web"

### Step 2: Get Your Credentials

After creating the app, you'll need:

- ✅ **App ID** (found in Settings → Keys & IDs)
- ✅ **REST API Key** (found in Settings → Keys & IDs)

Save these - you'll need them!

---

## 🔧 Part 2: Web Push Notifications Setup

### Step 1: Configure OneSignal for Web

In OneSignal Dashboard:

1. Go to **Settings → Platforms**
2. Click **Web Push**
3. Configure:

   - **Site URL**: `http://localhost:3000` (for testing)
   - **Auto Resubscribe**: ON
   - **Default Notification Icon**: Upload your logo
   - **Permission Prompt**: Choose "Slide Prompt" (less intrusive)

4. **Save** configuration

### Step 2: Get Web Configuration

OneSignal will show you a configuration snippet. Note these values:

- `appId`: Your OneSignal App ID
- `safari_web_id`: (if you want Safari support)

---

## 📧 Part 3: Email Setup in OneSignal

### Step 1: Configure Email Channel

In OneSignal Dashboard:

1. Go to **Messages → Email**
2. Click **Get Started** or **Settings**
3. Choose email setup method:

#### Option A: Use OneSignal Email (Easiest)

- Built-in email sending
- No additional setup
- Free tier: Limited sends

#### Option B: Integrate with Your Email Provider

- Connect SendGrid, Mailgun, or custom SMTP
- Better deliverability
- More control

### Step 2: Set Default Sender

1. **From Name**: FitCoach Pro
2. **From Email**: noreply@yourdomain.com (or use OneSignal's)
3. **Reply-To Email**: support@yourdomain.com

### Step 3: Create Email Templates

Create templates for:

- ✅ Welcome email
- ✅ Workout assigned notification
- ✅ Session booked confirmation
- ✅ Password reset
- ✅ Achievement earned

---

## 💻 Part 4: Code Integration

### Step 1: Install OneSignal SDK

```bash
npm install react-onesignal
```

### Step 2: Create OneSignal Configuration

Create `src/lib/oneSignal.ts`:

```typescript
"use client";

import OneSignal from "react-onesignal";

export const initOneSignal = async () => {
  try {
    await OneSignal.init({
      appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
      safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID,
      notifyButton: {
        enable: false, // We'll use custom UI
      },
      allowLocalhostAsSecureOrigin: true, // For development
    });

    // Log initialization
    console.log("OneSignal initialized successfully");

    return true;
  } catch (error) {
    console.error("OneSignal initialization failed:", error);
    return false;
  }
};

// Subscribe user to push notifications
export const subscribeUser = async (
  userId: string,
  email?: string,
  tags?: object
) => {
  try {
    await OneSignal.setExternalUserId(userId);

    if (email) {
      await OneSignal.setEmail(email);
    }

    if (tags) {
      await OneSignal.sendTags(tags);
    }

    // Request permission
    await OneSignal.registerForPushNotifications();

    return true;
  } catch (error) {
    console.error("Failed to subscribe user:", error);
    return false;
  }
};

// Send tags (for targeting)
export const updateUserTags = async (tags: {
  role?: "coach" | "client";
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}) => {
  try {
    await OneSignal.sendTags(tags);
  } catch (error) {
    console.error("Failed to update user tags:", error);
  }
};

// Unsubscribe (logout)
export const unsubscribeUser = async () => {
  try {
    await OneSignal.setSubscription(false);
    await OneSignal.removeExternalUserId();
  } catch (error) {
    console.error("Failed to unsubscribe:", error);
  }
};
```

### Step 3: Create Environment Variables

Add to `.env.local`:

```env
# OneSignal
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_app_id_here
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your_safari_web_id_here
NEXT_PUBLIC_ONESIGNAL_REST_API_KEY=your_rest_api_key_here
```

### Step 4: Initialize in Layout

Update `src/app/layout.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { initOneSignal } from "@/lib/oneSignal";

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize OneSignal when app loads
    initOneSignal();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Step 5: Subscribe Users on Login

Update `src/contexts/AuthContext.tsx`:

```typescript
import {
  subscribeUser,
  updateUserTags,
  unsubscribeUser,
} from "@/lib/oneSignal";

// In your AuthProvider, after successful login:
useEffect(() => {
  if (user) {
    // Subscribe to notifications
    subscribeUser(user.id, user.email, {
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } else {
    // Unsubscribe on logout
    unsubscribeUser();
  }
}, [user]);
```

---

## 📨 Part 5: Sending Notifications from Your App

### Backend Function for Sending Notifications

Create `src/lib/notifications.ts`:

```typescript
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_API_KEY = process.env.NEXT_PUBLIC_ONESIGNAL_REST_API_KEY!;

interface NotificationPayload {
  userIds?: string[];
  segments?: string[];
  title: string;
  message: string;
  url?: string;
  data?: object;
}

export async function sendPushNotification({
  userIds,
  segments,
  title,
  message,
  url,
  data,
}: NotificationPayload) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        included_segments: segments,
        headings: { en: title },
        contents: { en: message },
        url: url,
        data: data,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}

export async function sendEmail({
  userIds,
  subject,
  htmlContent,
}: {
  userIds: string[];
  subject: string;
  htmlContent: string;
}) {
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        email_subject: subject,
        email_body: htmlContent,
        template_id: "your_template_id", // Optional: use OneSignal email template
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
```

---

## 📬 Part 6: Use Cases - When to Send Notifications

### Example: Workout Assigned

```typescript
// When coach assigns workout to client
import { sendPushNotification, sendEmail } from "@/lib/notifications";

async function assignWorkoutToClient(clientId: string, workoutName: string) {
  // ... your existing code to assign workout ...

  // Send push notification
  await sendPushNotification({
    userIds: [clientId],
    title: "New Workout Assigned! 💪",
    message: `Your coach assigned "${workoutName}" to you.`,
    url: "/client/workouts",
  });

  // Send email (optional)
  await sendEmail({
    userIds: [clientId],
    subject: "New Workout Assigned",
    htmlContent: `
      <h1>New Workout!</h1>
      <p>Your coach has assigned a new workout: <strong>${workoutName}</strong></p>
      <a href="https://your-app.vercel.app/client/workouts">View Workout</a>
    `,
  });
}
```

### Example: Session Booked

```typescript
async function bookSession(
  coachId: string,
  clientName: string,
  sessionDate: string
) {
  // ... your booking logic ...

  // Notify coach
  await sendPushNotification({
    userIds: [coachId],
    title: "New Session Booked! 📅",
    message: `${clientName} booked a session on ${sessionDate}`,
    url: "/coach/sessions",
  });
}
```

---

## 🎨 Part 7: Custom Notification UI Component

Create `src/components/NotificationPrompt.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, X } from "lucide-react";
import OneSignal from "react-onesignal";

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const perm = await OneSignal.getNotificationPermission();
    setPermission(perm as NotificationPermission);

    // Show prompt if not granted and not denied
    if (perm === "default") {
      setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
    }
  };

  const handleEnable = async () => {
    try {
      await OneSignal.registerForPushNotifications();
      setShowPrompt(false);
      setPermission("granted");
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    }
  };

  if (!showPrompt || permission !== "default") return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <Card className="bg-white dark:bg-slate-800 shadow-2xl border-2 border-purple-300 dark:border-purple-700">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Stay Updated!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get notified about workouts, sessions, and more
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrompt(false)}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleEnable}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Enable Notifications
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPrompt(false)}
              className="flex-1"
            >
              Not Now
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🗄️ Part 8: Database Setup for Notifications

### Create Notification Preferences Table

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
    message_received BOOLEAN DEFAULT true,
    goal_reminder BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid());
```

---

## 🔗 Part 9: Integration with Supabase Auth

### Update Supabase Email Settings

You'll use OneSignal for transactional emails:

**In Supabase Dashboard:**

1. Go to Authentication → Email Templates
2. Customize templates or use OneSignal's
3. For password reset, you can keep Supabase's default (it's simple)

**For App Notifications (workouts, sessions, etc.):**

- Use OneSignal API
- Full control over email design
- Track opens and clicks

---

## 📱 Part 10: Service Worker Setup

### Create Public Service Worker

Create `public/OneSignalSDKWorker.js`:

```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js");
```

### Update next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...

  async headers() {
    return [
      {
        source: "/OneSignalSDKWorker.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 🎯 Part 11: Notification Trigger Points

### Where to Send Notifications in Your App:

#### Coach Actions:

```typescript
// 1. Workout Assigned
// File: src/components/coach/WorkoutAssignment.tsx
await assignWorkout(clientId, workoutId);
await sendNotification(
  clientId,
  "New Workout!",
  `${workoutName} has been assigned`
);

// 2. Meal Plan Assigned
await assignMealPlan(clientId, mealPlanId);
await sendNotification(clientId, "New Meal Plan!", "Check your nutrition tab");

// 3. Session Approved
await approveSession(sessionId);
await sendNotification(
  clientId,
  "Session Confirmed!",
  `${sessionDate} at ${sessionTime}`
);

// 4. Achievement Awarded
await awardAchievement(clientId, achievementId);
await sendNotification(clientId, "Achievement Unlocked! 🏆", achievementName);
```

#### Client Actions:

```typescript
// 1. Workout Completed
await completeWorkout(workoutId);
await sendNotification(
  coachId,
  "Workout Completed!",
  `${clientName} finished ${workoutName}`
);

// 2. Session Booked
await bookSession(coachId, sessionData);
await sendNotification(
  coachId,
  "New Booking!",
  `${clientName} booked ${sessionType}`
);

// 3. Goal Achieved
await achieveGoal(goalId);
await sendNotification(
  coachId,
  "Client Goal Achieved!",
  `${clientName} reached their goal`
);
```

---

## 📧 Part 12: Email Templates (OneSignal)

### Create in OneSignal Dashboard:

**Template 1: Workout Assigned**

```html
Subject: New Workout Assigned - {{workout_name}} Body: Hi {{first_name}}, Your
coach has assigned a new workout for you! Workout: {{workout_name}} Description:
{{workout_description}} Duration: {{duration}} minutes [View Workout Button]
Keep crushing your goals! 💪 - FitCoach Pro Team
```

**Template 2: Session Confirmed**

```html
Subject: Session Confirmed - {{session_date}} Body: Hi {{first_name}}, Your
training session has been confirmed! Date: {{session_date}} Time:
{{session_time}} Type: {{session_type}} Coach: {{coach_name}} [View Session
Details Button] See you soon!
```

---

## 🧪 Part 13: Testing OneSignal

### Test Push Notifications:

1. **In OneSignal Dashboard:**

   - Go to Messages → New Push
   - Send to "Test Users" or your user ID
   - Check if notification appears

2. **In Your App:**
   - Trigger an action (assign workout)
   - Check if notification sends
   - Verify delivery

### Test Emails:

1. **In OneSignal Dashboard:**

   - Go to Messages → New Email
   - Send test email to yourself
   - Check inbox/spam

2. **In Your App:**
   - Trigger email event
   - Check delivery
   - Verify template renders correctly

---

## 🔐 Part 14: Security & Best Practices

### API Key Security:

**NEVER expose REST API Key in frontend!**

Create API route: `src/app/api/notifications/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, title, message, type } = await request.json();

  // Verify user is authenticated
  // Send notification using server-side API key

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`, // Server-side only!
    },
    body: JSON.stringify({
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { en: title },
      contents: { en: message },
    }),
  });

  return NextResponse.json(await response.json());
}
```

---

## 📊 Part 15: Analytics & Tracking

OneSignal provides:

- ✅ Delivery rates
- ✅ Open rates (email)
- ✅ Click rates
- ✅ User segments
- ✅ A/B testing

**Access in**: OneSignal Dashboard → Analytics

---

## ✅ Complete Setup Checklist

### OneSignal Account:

- [ ] Create OneSignal account
- [ ] Create app
- [ ] Get App ID and API keys
- [ ] Configure web push settings
- [ ] Set up email sender

### Code Integration:

- [ ] Install react-onesignal
- [ ] Create oneSignal.ts lib
- [ ] Add environment variables
- [ ] Initialize in layout
- [ ] Subscribe users on login
- [ ] Create notification API route

### Database:

- [ ] Create notification_preferences table
- [ ] Set up RLS policies

### Testing:

- [ ] Test push notifications
- [ ] Test email sending
- [ ] Test from app (workout assign, etc.)
- [ ] Verify delivery on mobile
- [ ] Check spam folder

### Templates:

- [ ] Create email templates in OneSignal
- [ ] Customize notification copy
- [ ] Add branding/logo

---

## 🚀 Deployment with OneSignal

### Environment Variables in Vercel:

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_app_id
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your_safari_id
ONESIGNAL_REST_API_KEY=your_api_key (server-only!)
```

### Update Site URL:

After deploying to Vercel:

1. Go to OneSignal → Settings → Platforms → Web Push
2. Update Site URL to your Vercel URL
3. Update Allowed Origins

---

## 💰 OneSignal Pricing

### Free Tier:

- ✅ **10,000 web push subscribers**
- ✅ **Unlimited push notifications**
- ✅ **Basic email** (limited sends)
- ✅ **Basic analytics**

### Growth Plan ($9/month):

- ✅ **30,000 subscribers**
- ✅ **Unlimited everything**
- ✅ **Advanced segmentation**
- ✅ **A/B testing**

**You'll be fine with free tier for quite a while!**

---

## 🎓 Resources

- OneSignal Docs: https://documentation.onesignal.com
- React Integration: https://documentation.onesignal.com/docs/react-setup
- Email Setup: https://documentation.onesignal.com/docs/email-quickstart
- API Reference: https://documentation.onesignal.com/reference/create-notification

---

## 📝 Summary

OneSignal gives you:

1. ✅ **Push Notifications** (web + mobile later)
2. ✅ **Email Notifications** (transactional)
3. ✅ **User Segmentation** (target coaches vs clients)
4. ✅ **Analytics** (track engagement)
5. ✅ **Templates** (reusable notification designs)

**All in one platform, with generous free tier!**

---

**Ready to set up OneSignal properly? Let me know if you need help with any specific step!**
