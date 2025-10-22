'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { oneSignalService } from '@/lib/onesignal'

interface OneSignalProviderProps {
  children: React.ReactNode
}

export default function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { user } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [userSubscribed, setUserSubscribed] = useState(false)

  useEffect(() => {
    const initializeOneSignal = async () => {
      try {
        // Check if OneSignal is supported
        const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator
        setIsSupported(supported)

        if (!supported) {
          console.log('OneSignal is not supported in this environment')
          return
        }

        // Initialize OneSignal
        const initialized = await oneSignalService.initialize()
        
        if (initialized) {
          setIsInitialized(true)
          console.log('OneSignal provider initialized successfully')
        } else {
          // Silently fallback to browser notifications
        }
      } catch (error) {
        console.error('Error initializing OneSignal provider:', error)
      }
    }

    initializeOneSignal()
  }, [])

  useEffect(() => {
    const setupUserContext = async () => {
      if (!isInitialized || !user || userSubscribed) {
        return
      }

      try {
        // Set up user context in OneSignal
        const userTags = {
          role: user.role || 'client',
          email: user.email || '',
          created_at: new Date().toISOString()
        }

        await oneSignalService.initializeWithUser(user.id, userTags)
        setUserSubscribed(true)
        console.log('OneSignal user context set up successfully')
      } catch (error) {
        console.error('Error setting up OneSignal user context:', error)
      }
    }

    setupUserContext()
  }, [isInitialized, user?.id, userSubscribed]) // Only depend on user.id to prevent loops

  return (
    <>
      {children}
      {/* OneSignal initialization status indicator (hidden to avoid UI interference) */}
      {false && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white p-2 rounded text-xs z-50">
          OneSignal: {isSupported ? (isInitialized ? '✅ Ready' : '⏳ Initializing') : '❌ Not Supported'}
        </div>
      )}
    </>
  )
}
