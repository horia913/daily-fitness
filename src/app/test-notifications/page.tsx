'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Trophy, 
  MessageCircle, 
  Target, 
  Clock,
  CheckCircle
} from 'lucide-react'
import NotificationTriggers from '@/lib/notificationTriggers'
import { useNotifications } from '@/hooks/useNotifications'
import { oneSignalService } from '@/lib/onesignal'
import { OneSignalSender } from '@/lib/onesignalSender'

export default function TestNotifications() {
  const [sending, setSending] = useState(false)
  const [oneSignalReady, setOneSignalReady] = useState(false)
  const { permissionGranted, requestPermission } = useNotifications()

  useEffect(() => {
    const checkOneSignal = async () => {
      const ready = oneSignalService.isReady()
      setOneSignalReady(ready)
    }
    checkOneSignal()
  }, [])

  const handleRequestPermission = async () => {
    try {
      await requestPermission()
    } catch (error) {
      console.error('Error requesting permission:', error)
    }
  }

  const sendTestNotification = async (type: string) => {
    setSending(true)
    try {
      const userId = 'test-user-id' // In real app, this would be the actual user ID
      
      switch (type) {
        case 'workout':
          // Try OneSignal first, fallback to local notifications
          if (oneSignalReady) {
            await OneSignalSender.sendWorkoutComplete(userId, 'Test Workout', 45)
          } else {
            await NotificationTriggers.triggerWorkoutCompleted('Test Workout', 45)
          }
          break
        case 'achievement':
          if (oneSignalReady) {
            await OneSignalSender.sendAchievement(userId, 'Test Achievement', 'You completed a test!')
          } else {
            await NotificationTriggers.triggerAchievementUnlocked('Test Achievement', 'You completed a test!')
          }
          break
        case 'message':
          if (oneSignalReady) {
            await OneSignalSender.sendMessage(userId, 'Coach', 'Great job on your workout today!')
          } else {
            await NotificationTriggers.triggerNewMessage('Coach', 'Great job on your workout today!')
          }
          break
        case 'goal':
          if (oneSignalReady) {
            await OneSignalSender.sendGoalReminder(userId, 'Weight Loss Goal', 'You\'re 80% to your target!')
          } else {
            await NotificationTriggers.triggerGoalReminder('Weight Loss Goal', 'You\'re 80% to your target!')
          }
          break
        case 'reminder':
          if (oneSignalReady) {
            await OneSignalSender.sendWorkoutReminder(userId, 'Morning Cardio', '9:00 AM')
          } else {
            await NotificationTriggers.triggerWorkoutReminder('Morning Cardio', '9:00 AM')
          }
          break
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Test Notifications</h1>
            <p className="text-slate-500">Test the notification system</p>
          </div>

          {/* Permission Status */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {permissionGranted ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-slate-400" />
                  )}
                  <span className={permissionGranted ? 'text-green-600' : 'text-slate-600'}>
                    Browser Notifications: {permissionGranted ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {!permissionGranted && (
                  <Button onClick={handleRequestPermission} size="sm">
                    Enable Notifications
                  </Button>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {oneSignalReady ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-slate-400" />
                  )}
                  <span className={oneSignalReady ? 'text-green-600' : 'text-slate-600'}>
                    OneSignal Push: {oneSignalReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
                {!oneSignalReady && (
                  <span className="text-xs text-slate-500">
                    Configure OneSignal credentials
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Workout Complete */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Workout Complete
                </CardTitle>
                <CardDescription>Test workout completion notification</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={() => sendTestNotification('workout')}
                  disabled={sending || !permissionGranted}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>

            {/* Achievement */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Achievement Unlocked
                </CardTitle>
                <CardDescription>Test achievement notification</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={() => sendTestNotification('achievement')}
                  disabled={sending || !permissionGranted}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>

            {/* Message */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  New Message
                </CardTitle>
                <CardDescription>Test message notification</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={() => sendTestNotification('message')}
                  disabled={sending || !permissionGranted}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>

            {/* Goal Reminder */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Goal Reminder
                </CardTitle>
                <CardDescription>Test goal reminder notification</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={() => sendTestNotification('goal')}
                  disabled={sending || !permissionGranted}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>

            {/* Workout Reminder */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Workout Reminder
                </CardTitle>
                <CardDescription>Test workout reminder notification</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Button 
                  onClick={() => sendTestNotification('reminder')}
                  disabled={sending || !permissionGranted}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-blue-800 mb-2">How to Test Push Notifications:</h3>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li><strong>Setup OneSignal:</strong> Follow the setup guide in ONESIGNAL_SETUP.md</li>
                <li><strong>Configure credentials:</strong> Add OneSignal App ID and REST API Key to .env.local</li>
                <li><strong>Enable notifications:</strong> Click "Enable Notifications" when prompted</li>
                <li><strong>Test notifications:</strong> Click any "Send Test Notification" button</li>
                <li><strong>Check delivery:</strong> Notifications will appear even when app is closed!</li>
                <li><strong>View in app:</strong> Click the bell icon to see notification history</li>
                <li><strong>Test on mobile:</strong> Install as PWA for full push notification experience</li>
              </ol>
              <div className="mt-3 p-3 bg-blue-100 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> OneSignal push notifications work when the app is closed or in the background, 
                  unlike browser notifications which only work when the app is open.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
