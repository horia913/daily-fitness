# Safari Web Push Setup Guide

## Why You Need Safari Web ID

For **cross-browser and cross-device support**, you need the Safari Web ID because:

- **Safari** (macOS/iOS) requires special configuration
- **iOS devices** need Safari Web Push for notifications
- **macOS Safari** needs Safari Web ID for push notifications
- **Chrome/Firefox** work with just App ID, but Safari needs both

## How to Find Safari Web ID

### Step 1: Enable Safari Support in OneSignal

1. Go to your OneSignal dashboard
2. Navigate to **Settings > Web Push**
3. Look for **"Safari"** section
4. You might see options like:
   - "Enable Safari Web Push"
   - "Safari Configuration"
   - "Safari Web Push Settings"

### Step 2: Configure Safari (if needed)

If Safari isn't enabled yet:

1. Click **"Enable Safari Web Push"** or similar
2. You might need to:
   - Upload a Safari certificate
   - Configure Safari-specific settings
   - Verify your domain for Safari

### Step 3: Find Safari Web ID

After Safari is configured, look for:

1. **"Safari Web ID"**
2. **"Safari Web Push ID"**
3. **"Safari Push ID"**
4. **"Web Push Safari ID"**

It will look something like: `web.onesignal.auto.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 4: Alternative Locations

If you can't find it in **Settings > Web Push**, check:

1. **Settings > Keys & IDs** - sometimes it's listed there
2. **Settings > Platforms** - might be under Safari platform
3. **App Settings** - could be in general app configuration

## Common Issues

### "Safari Web ID not found"

- Safari support might not be enabled yet
- You may need to configure Safari first
- Check if your OneSignal plan supports Safari

### "Safari configuration required"

- You might need to upload a Safari certificate
- Some plans require additional Safari setup
- Contact OneSignal support if needed

## Testing Safari Support

Once you have the Safari Web ID:

1. Add it to your `.env.local`:

   ```env
   NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
   NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your-safari-web-id
   ```

2. Test on different browsers:
   - **Chrome** ✅ (uses App ID)
   - **Firefox** ✅ (uses App ID)
   - **Safari** ✅ (uses Safari Web ID)
   - **iOS Safari** ✅ (uses Safari Web ID)
   - **macOS Safari** ✅ (uses Safari Web ID)

## Browser Support Matrix

| Browser        | App ID | Safari Web ID | Notes                  |
| -------------- | ------ | ------------- | ---------------------- |
| Chrome         | ✅     | ❌            | Works with App ID only |
| Firefox        | ✅     | ❌            | Works with App ID only |
| Edge           | ✅     | ❌            | Works with App ID only |
| Safari (macOS) | ✅     | ✅            | Requires both          |
| Safari (iOS)   | ✅     | ✅            | Requires both          |

## Need Help?

If you still can't find the Safari Web ID:

1. Check OneSignal documentation for Safari setup
2. Contact OneSignal support
3. Try creating a new app with Safari enabled from the start
4. Check your OneSignal plan - some features might require paid plans
