'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AuthDebugResult {
  test: string
  success: boolean
  data?: any
  error?: any
  timestamp: string
}

export default function MobileAuthDebug() {
  const { user, loading } = useAuth()
  const [results, setResults] = useState<AuthDebugResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    const result: AuthDebugResult = {
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }
    setResults(prev => [...prev, result])
  }

  const runAuthTests = async () => {
    setIsRunning(true)
    setResults([])
    
    console.log('🔍 Starting Mobile Auth Debug Tests...')
    console.log('🔍 Auth Context:', { user, loading })

    // Test 1: Check auth context state
    addResult('Auth Context State', true, { 
      hasUser: !!user, 
      userEmail: user?.email, 
      userId: user?.id,
      isLoading: loading 
    })

    // Test 2: Check Supabase auth session directly
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      addResult('Supabase Auth Session', !sessionError, sessionData, sessionError)
    } catch (error) {
      addResult('Supabase Auth Session', false, null, error)
    }

    // Test 3: Check if user is authenticated in Supabase
    try {
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser()
      addResult('Supabase Auth User', !userError, supabaseUser, userError)
    } catch (error) {
      addResult('Supabase Auth User', false, null, error)
    }

    // Test 4: Check browser environment
    const browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    }
    addResult('Browser Environment', true, browserInfo)

    // Test 5: Check localStorage for auth tokens
    try {
      const supabaseAuthToken = localStorage.getItem('supabase.auth.token')
      const supabaseSession = localStorage.getItem('supabase.auth.session')
      addResult('Local Storage Auth', true, { 
        hasAuthToken: !!supabaseAuthToken,
        hasSession: !!supabaseSession,
        tokenLength: supabaseAuthToken?.length || 0,
        sessionLength: supabaseSession?.length || 0
      })
    } catch (error) {
      addResult('Local Storage Auth', false, null, error)
    }

    // Test 6: Check if we can make authenticated requests
    if (user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', user.id)
          .single()
        
        addResult('Authenticated Profile Query', !profileError, profile, profileError)
      } catch (error) {
        addResult('Authenticated Profile Query', false, null, error)
      }
    } else {
      addResult('Authenticated Profile Query', false, null, { message: 'No user available for test' })
    }

    // Test 7: Check network connectivity
    try {
      const response = await fetch(window.location.origin + '/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      })
      addResult('Network Connectivity', response.ok, { 
        status: response.status, 
        statusText: response.statusText 
      })
    } catch (error) {
      addResult('Network Connectivity', false, null, error)
    }

    // Test 8: Check if we're in a mobile browser
    const isMobileBrowser = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    addResult('Mobile Device Detection', true, {
      isMobileBrowser,
      isIOS,
      isAndroid,
      deviceType: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'
    })

    setIsRunning(false)
    console.log('🔍 Mobile Auth Debug Tests Complete')
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔐 Mobile Auth Debug</span>
          <div className="flex gap-2">
            <Button 
              onClick={runAuthTests} 
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              {isRunning ? 'Running...' : 'Run Auth Tests'}
            </Button>
            <Button 
              onClick={clearResults} 
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{result.test}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? '✅ PASS' : '❌ FAIL'}
                  </Badge>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
              </div>
              
              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                  <div className="text-sm font-medium text-red-800">Error:</div>
                  <div className="text-xs text-red-600 font-mono">
                    {JSON.stringify(result.error, null, 2)}
                  </div>
                </div>
              )}
              
              {result.data && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-sm font-medium text-green-800">Data:</div>
                  <div className="text-xs text-green-600 font-mono max-h-32 overflow-y-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {results.length === 0 && !isRunning && (
            <div className="text-center text-gray-500 py-4">
              Click "Run Auth Tests" to debug mobile authentication issues
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
