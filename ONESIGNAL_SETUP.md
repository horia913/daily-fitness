# OneSignal Push Notifications Setup Guide

## 1. Create OneSignal Account

1. Go to [OneSignal.com](https://onesignal.com) and create a free account
2. Create a new app in the OneSignal dashboard
3. Choose "Web Push" as the platform

## 2. Get OneSignal Credentials

1. In your OneSignal dashboard, go to **Settings > Keys & IDs**
2. Copy the **App ID** (OneSignal App ID) - this is the main one you need

### For Safari Web ID (Required for Safari, iOS, macOS):

1. Go to **Settings > Web Push**
2. Look for **"Safari Web ID"** or **"Safari Web Push ID"**
3. If you don't see it, you may need to enable Safari support first:
   - In **Settings > Web Push**, look for Safari configuration
   - You might need to upload a Safari certificate or configure Safari settings
   - The Safari Web ID will appear after Safari is properly configured

### For REST API Key (Required for server-side notifications):

1. Go to **Settings > Keys & IDs**
2. Look for **"REST API Key"** or **"Server API Key"**
3. If you don't see it, you may need to generate it or it might be in a different section

**Note:** For full cross-browser and cross-device support, you need both the App ID and Safari Web ID.

## 3. Configure Environment Variables

Create a `.env.local` file in your project root with:

```env
# OneSignal Configuration (for cross-browser support)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your-safari-web-id

# Optional (for server-side notifications)
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

**Minimum for cross-browser support:**

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-actual-app-id-here
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your-actual-safari-web-id-here
```

## 4. Configure OneSignal App Settings

In your OneSignal dashboard:

1. Go to **Settings > Web Push**
2. Set your **Site URL** to your domain (e.g., `https://yourdomain.com`)
3. Upload your **Site Icon** (192x192px PNG)
4. Configure **Default Notification Icon** (192x192px PNG)

## 5. Test Push Notifications

1. Start your development server: `npm run dev`
2. Visit `/test-notifications` to test the notification system
3. Allow notifications when prompted
4. Test different notification types

## 6. Production Deployment

1. Update your OneSignal app settings with your production domain
2. Ensure your site is served over HTTPS (required for push notifications)
3. Test notifications in production

## 7. Server-Side Notifications

To send notifications from your server/backend:

```typescript
import { OneSignalSender } from "@/lib/onesignalSender";

// Send to specific user
await OneSignalSender.sendToUser("user-id", "Title", "Message body");

// Send workout reminder
await OneSignalSender.sendWorkoutReminder(
  "user-id",
  "Morning Cardio",
  "9:00 AM"
);

// Send achievement
await OneSignalSender.sendAchievement(
  "user-id",
  "First Workout",
  "Congratulations!"
);
```

## 8. Features Implemented

- ✅ True push notifications (work when app is closed)
- ✅ Background notification handling
- ✅ User segmentation and tagging
- ✅ Notification click handling
- ✅ Browser notification fallback
- ✅ Notification center UI
- ✅ Permission management
- ✅ Server-side notification sending

## 9. Troubleshooting

### Notifications not working?

1. Check browser console for errors
2. Verify OneSignal credentials in environment variables
3. Ensure site is served over HTTPS
4. Check OneSignal dashboard for delivery status

### Permission denied?

1. Clear browser data and try again
2. Check browser notification settings
3. Try in incognito mode

### OneSignal not initializing?

1. Check network connectivity
2. Verify App ID is correct
3. Check browser console for initialization errors
