'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FloatingInput } from '@/components/ui/floating-input'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Copy,
  Check,
  Clock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
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
          <div className="space-y-3">
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
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Invite expiry
              </label>
              <Select 
                value={formData.inviteExpiryDays.toString()} 
                onValueChange={(value) => handleInputChange('inviteExpiryDays', value)}
              >
                <SelectTrigger className="h-9 text-sm border border-[color:var(--fc-glass-border)]">
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
          <div className="space-y-3">
            {!generatedInviteLink ? (
              <div className="space-y-3">
                <div className="text-xs text-[color:var(--fc-text-dim)] border border-[color:var(--fc-glass-border)] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-[color:var(--fc-text-dim)]">Email</span>
                    <span className="font-medium text-[color:var(--fc-text-primary)] truncate">{formData.email}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-[color:var(--fc-text-dim)]">Expires</span>
                    <span className="font-medium text-[color:var(--fc-text-primary)]">{formData.inviteExpiryDays} days</span>
                  </div>
                </div>
                <Button 
                  onClick={generateInviteLink}
                  disabled={loading}
                  size="sm"
                  className={`${theme.primary} w-full h-9 text-sm`}
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate invite link
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[color:var(--fc-text-primary)]">
                  Invite ready
                </p>
                <div className="fc-surface text-[color:var(--fc-text-primary)] p-3 rounded-lg break-all border border-[color:var(--fc-surface-card-border)]">
                  <p className="text-xs font-mono select-all leading-relaxed">{generatedInviteLink}</p>
                </div>
                <Button 
                  onClick={copyInviteLink}
                  size="sm"
                  className={`${theme.primary} w-full h-9 text-sm`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy link
                    </>
                  )}
                </Button>
                <p className="text-xs text-[color:var(--fc-text-dim)]">
                  Share the link with your client. {formData.email}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <Button 
                    onClick={resetForm} 
                    variant="outline" 
                    size="sm"
                    className="flex-1 h-9 text-sm"
                  >
                    Another link
                  </Button>
                  <Button 
                    onClick={() => router.push('/coach/clients')} 
                    size="sm"
                    className={`${theme.primary} flex-1 h-9 text-sm`}
                  >
                    Clients
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
        <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-32 pt-4 sm:px-6 space-y-4">
          <div className="flex min-h-11 max-h-12 items-center justify-between gap-2">
            <h1 className="text-lg font-semibold fc-text-primary truncate">
              Add client
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/coach/clients')}
              className="h-8 text-xs px-2 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </div>

          <div className="fc-glass fc-card rounded-xl border border-[color:var(--fc-glass-border)] p-4">
            <ProgressIndicator steps={steps} currentStep={currentStep} />
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <h2 className="text-sm font-semibold fc-text-primary">{steps[currentStep - 1]?.title}</h2>
              <div className="space-y-3 mt-2">
                {renderStepContent()}
              </div>
            </div>
          </div>

          {currentStep < 2 && (
            <div className="sticky bottom-0 left-0 right-0 fc-glass rounded-xl border border-[color:var(--fc-glass-border)] p-3 flex items-center justify-between gap-3 -mx-4 sm:mx-0">
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