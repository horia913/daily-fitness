'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FloatingInput } from '@/components/ui/floating-input'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  UserPlus, 
  Mail,
  Copy,
  Check,
  Send,
  Clock,
  Users,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function AddClient() {
  const { user } = useAuth()
  const { getThemeStyles, performanceSettings } = useTheme()
  const router = useRouter()
  const theme = getThemeStyles()

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    inviteExpiryDays: 30
  })
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedInviteLink, setGeneratedInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Progress steps
  const steps = [
    { id: 'email', title: 'Client Email', description: 'Enter client email' },
    { id: 'invite', title: 'Generate Invite', description: 'Create invite link' }
  ]

  // Validation functions
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address'
        }
        return ''
      default:
        return ''
    }
  }

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {}
    
    switch (currentStep) {
      case 1: // Email
        if (!formData.email.trim()) errors.email = 'Email is required'
        else {
          const emailError = validateField('email', formData.email)
          if (emailError) errors.email = emailError
        }
        break
      case 2: // Generate Invite - validation handled in generateInviteLink
        break
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < steps.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const generateInviteLink = async () => {
    if (!user) {
      setError('You must be logged in to generate invite links')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let inviteCode: string

      // Try database function first
      try {
        const { data, error } = await supabase.rpc('create_invite_code', {
          p_coach_id: user.id,
          p_client_email: formData.email,
          p_client_name: null,
          p_expires_days: formData.inviteExpiryDays,
          p_notes: null
        })

        if (error) throw error
        if (!data) throw new Error('No invite code returned from database')

        inviteCode = data

      } catch {
        // Fallback: Generate code client-side and insert directly
        inviteCode = generateClientSideInviteCode()
        
        // Calculate expiration date
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + formData.inviteExpiryDays)
        
        // Insert invite code directly
        const { error: insertError } = await supabase
          .from('invite_codes')
          .insert({
            code: inviteCode,
            coach_id: user.id,
            client_email: formData.email,
            client_name: null,
            expires_at: expiresAt.toISOString(),
            notes: null
          })

        if (insertError) {
          console.error('Error inserting invite code:', insertError)
          throw new Error('Failed to save invite code to database')
        }
      }

      // Invite links always use the production app URL (Vercel) so clients never get localhost
      const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
      const isLocalhost = /^https?:\/\/localhost(\:\d+)?$/i.test(envUrl) || envUrl === ''
      const appUrl = isLocalhost ? 'https://daily-fitness-six.vercel.app' : envUrl
      const inviteLink = `${appUrl}/?invite=${inviteCode}&email=${encodeURIComponent(formData.email)}`
      
      setGeneratedInviteLink(inviteLink)
      setSuccess('Invite link generated successfully! Copy the link below and send it to your client via WhatsApp or any messaging app.')
      
      // Email sending is optional - link can be shared manually
      // Uncomment the line below if you want to try sending email (requires OneSignal domain setup)
      // await sendInviteEmail(inviteLink, inviteCode)

    } catch (error: any) {
      console.error('Error generating invite link:', error)
      setError(error.message || 'Failed to generate invite link')
    } finally {
      setLoading(false)
    }
  }

  // Fallback function to generate invite codes client-side
  const generateClientSideInviteCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    
    // Generate 8-character code
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return result
  }

  const sendInviteEmail = async (inviteLink: string, inviteCode: string) => {
    try {
      const response = await fetchApi('/api/emails/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: formData.email,
          clientName: 'there', // Generic greeting since we don't have name
          inviteCode,
          expiryDays: formData.inviteExpiryDays,
          inviteLink
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Invite email sent
      } else {
        console.error('❌ Failed to send invite email:', result.error)
      }
      
    } catch (error) {
      console.error('❌ Error sending email:', error)
      // Don't throw error - invite link was still generated successfully
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedInviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      inviteExpiryDays: 30
    })
    setCurrentStep(1)
    setGeneratedInviteLink('')
    setError('')
    setSuccess('')
    setValidationErrors({})
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <FloatingInput
              label="Client Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={validationErrors.email}
              required
              placeholder="client@example.com"
              helperText="We'll generate a signup link with this email pre-filled"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                Invite Link Expiry
              </label>
              <Select 
                value={formData.inviteExpiryDays.toString()} 
                onValueChange={(value) => handleInputChange('inviteExpiryDays', value)}
              >
                <SelectTrigger className="h-12 border-2 border-[color:var(--fc-glass-border)] focus:border-[color:var(--fc-accent-primary)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[color:var(--fc-text-dim)]">
                How long should the invite link remain valid?
              </p>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            {!generatedInviteLink ? (
              <div className="text-center py-8">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-6">
                  <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-[color:var(--fc-text-primary)] mb-2">
                  Ready to Generate Invite Link
                </h3>
                <p className="text-[color:var(--fc-text-dim)] mb-6">
                  We'll create a personalized signup link for your client
                </p>
                
                {/* Summary Card */}
                <div className={`${theme.card} ${theme.shadow} rounded-xl p-6 mb-6 text-left`}>
                  <h4 className="font-semibold text-[color:var(--fc-text-primary)] mb-4">Invite Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--fc-text-dim)]">Email:</span>
                      <span className="font-medium text-[color:var(--fc-text-primary)]">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--fc-text-dim)]">Expires in:</span>
                      <span className="font-medium text-[color:var(--fc-text-primary)]">{formData.inviteExpiryDays} days</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={generateInviteLink}
                  disabled={loading}
                  className={`${theme.primary} ${theme.shadow} px-8 py-3 text-lg`}
                >
                  {loading ? (
                    <>
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Generating Invite Link...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success State */}
                <div className="text-center">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-[color:var(--fc-text-primary)] mb-2">
                    Invite Link Generated! 🎉
                  </h3>
                  <p className="text-[color:var(--fc-text-dim)]">
                    Your client can now sign up using the link below
                  </p>
                </div>

                {/* Invite Link Display */}
                <div className={`${theme.card} ${theme.shadow} rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800`}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[color:var(--fc-text-primary)] mb-3">📋 Signup Link</p>
                    <div className="fc-surface text-[color:var(--fc-text-primary)] p-4 rounded-lg mb-4 break-all border border-[color:var(--fc-surface-card-border)]">
                      <p className="text-sm font-mono select-all">{generatedInviteLink}</p>
                    </div>
                    
                    <Button 
                      onClick={copyInviteLink}
                      className={`${theme.primary} ${theme.shadow} mb-2 px-6 py-3 text-base font-semibold`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          Copied to Clipboard! ✓
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-[color:var(--fc-text-dim)] mt-2">
                      Click the button above or select and copy the link manually
                    </p>
                  </div>
                </div>

                {/* Success Message */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">Success!</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    An email with the invite link has been sent to {formData.email}
                  </p>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">What happens next:</h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">1.</span>
                      <span>Client receives email with invite link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Client clicks link and is taken to signup page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Email is pre-filled, client just needs to set password</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold">4.</span>
                      <span>Client completes signup and joins your coaching program</span>
                    </li>
                  </ol>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={resetForm} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Generate Another Link
                  </Button>
                  <Button 
                    onClick={() => router.push('/coach/clients')} 
                    className={`${theme.primary} flex-1`}
                  >
                    View All Clients
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-32 pt-10 sm:px-6 space-y-8">
          <header className="flex items-center gap-4 mb-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/coach/clients')}
              className="w-12 h-12 rounded-2xl fc-glass border border-[color:var(--fc-glass-border)] hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-6 h-6 fc-text-primary" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Add New Client</h1>
              <p className="text-sm fc-text-dim font-mono uppercase tracking-wider mt-1">Invite by email</p>
            </div>
          </header>

          <GlassCard elevation={2} className="fc-glass fc-card rounded-3xl p-6 sm:p-8">
            <ProgressIndicator steps={steps} currentStep={currentStep} />
            <div className="mt-6 pt-6 border-t border-[color:var(--fc-glass-border)]">
              <h2 className="text-lg font-semibold fc-text-primary mb-1">{steps[currentStep - 1]?.title}</h2>
              <p className="text-sm fc-text-dim mb-6">
                {currentStep === 1 ? "Enter the client's email address" : "Generate and send the invite link"}
              </p>
              <div className="space-y-6">
                {renderStepContent()}
              </div>
            </div>
          </GlassCard>

          {currentStep < 2 && (
            <div className="sticky bottom-0 left-0 right-0 fc-glass rounded-2xl border border-[color:var(--fc-glass-border)] p-4 flex items-center justify-between gap-4 -mx-4 sm:mx-0 sm:rounded-3xl">
              <Button variant="ghost" onClick={() => router.push('/coach/clients')} className="fc-btn fc-btn-ghost">
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 1} className="fc-btn fc-btn-ghost">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={nextStep} className="fc-btn fc-btn-primary">
                  {currentStep === 1 ? 'Generate Invite' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="fc-glass rounded-2xl border border-red-500/30 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium fc-text-primary">Error</span>
              </div>
              <p className="text-sm fc-text-dim mt-1">{error}</p>
            </div>
          )}
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}