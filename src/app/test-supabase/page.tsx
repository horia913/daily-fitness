'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const testConnection = async () => {
    setStatus('Testing connection...')
    setError('')

    try {
      // Test 1: Check environment variables
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        throw new Error('Missing environment variables')
      }

      setStatus('Environment variables found ✓')

      // Test 2: Test basic connection
      const { data, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (connectionError) {
        throw new Error(`Connection error: ${connectionError.message}`)
      }

      setStatus('Database connection successful ✓')

      // Test 3: Test auth service
      const { data: authData, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        throw new Error(`Auth error: ${authError.message}`)
      }

      setStatus('Auth service working ✓')

    } catch (err: any) {
      setError(err.message)
      setStatus('Test failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Supabase Test</h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">Environment Variables:</p>
            <div className="bg-slate-50 p-2 rounded text-xs">
              <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}</p>
              <p>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}</p>
            </div>
          </div>

          <button
            onClick={testConnection}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Test Supabase Connection
          </button>

          {status && (
            <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
              {status}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 rounded text-sm text-red-800">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
