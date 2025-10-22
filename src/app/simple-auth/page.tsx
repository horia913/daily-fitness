'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, LogIn, UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from 'lucide-react'

export default function SimpleAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [explicitSubmit, setExplicitSubmit] = useState(false)

  // Prevent form submission on Enter key press in input fields
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      // Only allow Enter to submit if user explicitly wants to (e.g., after clicking submit button)
      // This prevents accidental auto-submission while typing
      if (loading) {
        e.preventDefault()
        return
      }
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent submission if already loading
    if (loading) return
    
    // Only proceed if this is an explicit submit (button click)
    if (!explicitSubmit) return
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setSuccess('Login successful!')
      } else {
        // Simple signup without profile creation
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        if (data.user) {
          setSuccess(`Signup successful! User ID: ${data.user.id}`)
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
      setExplicitSubmit(false) // Reset the explicit submit flag
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">DailyFitness</h1>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 mb-2">
              {isLogin ? 'Welcome Back!' : 'Start Your Journey'}
            </CardTitle>
            <CardDescription className="text-slate-600 text-base">
              {isLogin ? 'Sign in to continue your fitness journey' : 'Create your account and begin transforming your health'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {/* Segmented Control */}
            <div className="mb-8">
              <div className="bg-slate-100 rounded-2xl p-1 flex">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true)
                    setError('')
                    setSuccess('')
                    setExplicitSubmit(false)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false)
                    setError('')
                    setSuccess('')
                    setExplicitSubmit(false)
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    !isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </div>
            </div>

            <form onSubmit={handleAuth} onKeyDown={handleKeyDown} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              
              {/* Password Field with Visibility Toggle */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-12 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  </div>
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                disabled={loading}
                onClick={() => setExplicitSubmit(true)}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {isLogin ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </div>
                )}
              </Button>
            </form>

            {/* Security Assurance */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Your data is protected with enterprise-grade security</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
