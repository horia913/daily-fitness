'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
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
import { useAuth } from '@/contexts/AuthContext'
import { emailService } from '@/lib/emailService'
import { useRouter } from 'next/navigation'

export default function AddClient() {
  const { user } = useAuth()
  const { getThemeStyles } = useTheme()
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
        console.log('Invite code generated via database function:', inviteCode)

      } catch (dbError) {
        console.log('Database function not available, using fallback method:', dbError)
        
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

        console.log('Invite code generated via fallback method:', inviteCode)
      }

      // Create the invite link with pre-filled email
      const baseUrl = window.location.origin
      const inviteLink = `${baseUrl}/?invite=${inviteCode}&email=${encodeURIComponent(formData.email)}`
      
      setGeneratedInviteLink(inviteLink)
      setSuccess('Invite link generated successfully!')
      
      // Send email with the invite link
      await sendInviteEmail(inviteLink, inviteCode)

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
      const success = await emailService.sendInviteEmail(
        formData.email,
        'there', // Generic greeting since we don't have name
        inviteCode,
        formData.inviteExpiryDays,
        inviteLink
      )
      
      if (success) {
        console.log('Invite email sent successfully')
      } else {
        console.log('Email service not configured - email would be sent:', {
          to: formData.email,
          inviteLink,
          expiryDays: formData.inviteExpiryDays
        })
      }
      
    } catch (error) {
      console.error('Error sending email:', error)
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
              helperText="We'll send the invite link to this email address"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Invite Link Expiry
              </label>
              <Select 
                value={formData.inviteExpiryDays.toString()} 
                onValueChange={(value) => handleInputChange('inviteExpiryDays', value)}
              >
                <SelectTrigger className="h-12 border-2 border-slate-300 focus:border-purple-500 dark:border-slate-600 dark:focus:border-purple-400">
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  Ready to Generate Invite Link
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  We'll create a personalized signup link for your client
                </p>
                
                {/* Summary Card */}
                <div className={`${theme.card} ${theme.shadow} rounded-xl p-6 mb-6 text-left`}>
                  <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Invite Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 dark:text-white">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Expires in:</span>
                      <span className="font-medium text-slate-800 dark:text-white">{formData.inviteExpiryDays} days</span>
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
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                    Invite Link Generated! 🎉
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Your client can now sign up using the link below
                  </p>
                </div>

                {/* Invite Link Display */}
                <div className={`${theme.card} ${theme.shadow} rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800`}>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Invite Link</p>
                    <div className="bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-lg mb-4 break-all">
                      <p className="text-sm font-mono">{generatedInviteLink}</p>
                    </div>
                    
                    <Button 
                      onClick={copyInviteLink}
                      variant="outline"
                      className="mb-4"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
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
      <div className={`min-h-screen ${theme.background}`}>
        {/* Enhanced Header */}
        <div className={`p-6 ${theme.background} relative overflow-hidden`}>
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
          </div>

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/coach/clients')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>
                    Add New Client 👥
                  </h1>
                  <p className={`text-lg ${theme.textSecondary}`}>
                    Send an invite link to a new client
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500 text-white">
                  Step {currentStep} of {steps.length}
                </Badge>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6 mb-8`}>
              <ProgressIndicator steps={steps} currentStep={currentStep} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Step Content Card */}
            <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
              <CardHeader className="pb-6">
                <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    {currentStep === 1 && <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    {currentStep === 2 && <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  {steps[currentStep - 1]?.title}
                  <Badge className="bg-purple-500 text-white ml-auto">
                    {currentStep}/{steps.length}
                  </Badge>
                </CardTitle>
                <CardDescription className={`${theme.textSecondary} text-base`}>
                  {currentStep === 1 && "Enter the client's email address"}
                  {currentStep === 2 && "Generate and send the invite link"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            {currentStep < 2 && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={nextStep}
                  className={`${theme.primary} ${theme.shadow} flex items-center gap-2`}
                >
                  {currentStep === 1 ? 'Generate Invite' : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-800 dark:text-red-200">Error</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}