'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Users, 
  Dumbbell, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  Settings,
  Calendar,
  Phone,
  Target,
  FileText,
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react'

interface UserFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  role: 'client' | 'coach'
  phone: string
  goals: string
  notes: string
  assignedCoachId: string
  inviteCode: string
}

interface Coach {
  id: string
  first_name?: string
  last_name?: string
  email: string
}

export default function CreateUserPage() {
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
    phone: '',
    goals: '',
    notes: '',
    assignedCoachId: '',
    inviteCode: ''
  })
  
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [createdUser, setCreatedUser] = useState<any>(null)

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: '', color: '' }
    if (password.length < 6) return { score: 1, label: 'Weak', color: 'text-red-500' }
    if (password.length < 8) return { score: 2, label: 'Fair', color: 'text-orange-500' }
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { score: 3, label: 'Strong', color: 'text-green-500' }
    }
    return { score: 2, label: 'Good', color: 'text-yellow-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // Fetch coaches for client assignment from public-safe coaches_public table
  // This table only exposes first_name, last_name (no PII like email)
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const { data, error } = await supabase
          .from('coaches_public')
          .select('coach_id, first_name, last_name')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('last_name', { ascending: true })

        if (error) {
          console.error('Error fetching coaches:', error)
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          if (error.code === '42P01') {
            console.error('Table coaches_public does not exist. Run migration 20260128_create_coaches_public.sql')
          }
          throw error
        }

        // Map coach_id to id so existing UI code works unchanged
        const mappedData = (data || []).map(coach => ({
          id: coach.coach_id,
          first_name: coach.first_name,
          last_name: coach.last_name,
        }))

        setCoaches(mappedData)
        if (!mappedData || mappedData.length === 0) {
          console.warn('No coaches found. Run 20260128_seed_coaches_public.sql to populate.')
        }
      } catch (error) {
        console.error('Error fetching coaches:', error)
      }
    }

    fetchCoaches()
  }, [])

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required'
    if (!formData.lastName.trim()) return 'Last name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!formData.email.includes('@')) return 'Please enter a valid email address'
    if (!formData.password) return 'Password is required'
    if (passwordStrength.score < 2) return 'Password is too weak. Please use at least 8 characters with numbers and uppercase letters.'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
    if (formData.role === 'client' && !formData.assignedCoachId) return 'Please assign a coach for the client'
    if (formData.role === 'client' && !formData.inviteCode.trim()) return 'Invite code is required for client creation'

    return null
  }

  const createUser = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user account')

      // Step 2: Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          role: formData.role,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone || null,
          goals: formData.goals || null,
          notes: formData.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Step 3: Create client-coach relationship if role is client
      if (formData.role === 'client' && formData.assignedCoachId) {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            coach_id: formData.assignedCoachId,
            client_id: authData.user.id,
            status: 'active',
            created_at: new Date().toISOString()
          })

        if (clientError) {
          console.error('Error creating client-coach relationship:', clientError)
          // Don't throw error here as the user was created successfully
        }
      }

      setCreatedUser({
        id: authData.user.id,
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role
      })

      setSuccess('User created successfully!')
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'client',
          phone: '',
          goals: '',
          notes: '',
          assignedCoachId: '',
          inviteCode: ''
        })
        setCreatedUser(null)
        setSuccess('')
      }, 5000)

    } catch (error: any) {
      console.error('Error creating user:', error)
      setError(error.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client',
      phone: '',
      goals: '',
      notes: '',
      assignedCoachId: '',
      inviteCode: ''
    })
    setError('')
    setSuccess('')
    setCreatedUser(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Create New User Account</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Administrative tool for creating new coach and client accounts
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800 text-lg">User Created Successfully!</h3>
                  {createdUser && (
                    <div className="mt-2 space-y-1 text-sm text-green-700">
                      <p><strong>Name:</strong> {createdUser.name}</p>
                      <p><strong>Email:</strong> {createdUser.email}</p>
                      <p><strong>Role:</strong> <Badge className="bg-green-100 text-green-800">{createdUser.role}</Badge></p>
                      <p><strong>User ID:</strong> {createdUser.id}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800 text-lg">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="w-5 h-5 text-blue-600" />
              User Information
            </CardTitle>
            <CardDescription>
              Enter the basic information for the new user account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter first name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium text-slate-700">User Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'client' | 'coach') => handleInputChange('role', value)}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select user role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Client
                    </div>
                  </SelectItem>
                  <SelectItem value="coach">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-green-600" />
                      Coach
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-12 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Password strength:</span>
                      <span className={`font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.score === 1 ? 'bg-red-500 w-1/3' :
                          passwordStrength.score === 2 ? 'bg-orange-500 w-2/3' :
                          passwordStrength.score === 3 ? 'bg-green-500 w-full' : 'w-0'
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 pr-12 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Confirm password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Client-specific fields */}
            {formData.role === 'client' && (
              <>
                {/* Coach Assignment */}
                <div className="space-y-2">
                  <Label htmlFor="assignedCoach" className="text-sm font-medium text-slate-700">Assigned Coach *</Label>
                  <Select 
                    value={formData.assignedCoachId} 
                    onValueChange={(value) => handleInputChange('assignedCoachId', value)}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-4 h-4 text-green-600" />
                            {coach.first_name} {coach.last_name} ({coach.email})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Invite Code */}
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-sm font-medium text-slate-700">Invite Code *</Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="inviteCode"
                      value={formData.inviteCode}
                      onChange={(e) => handleInputChange('inviteCode', e.target.value)}
                      className="pl-10 h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter invite code"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Required for client accounts. Generate one from the coach's client management page.
                  </p>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <Label htmlFor="goals" className="text-sm font-medium text-slate-700">Fitness Goals</Label>
                  <Input
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => handleInputChange('goals', e.target.value)}
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., Weight loss, Muscle building, Endurance"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Additional Notes</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Any additional notes about this user..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="h-12 rounded-xl border-slate-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <div className="flex gap-4">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="h-12 rounded-xl border-slate-200"
                >
                  Reset Form
                </Button>
                
                <Button
                  onClick={createUser}
                  disabled={loading}
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating User...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Create User Account
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Security Notice</h3>
                <p className="text-sm text-slate-600">
                  This is an administrative tool for creating user accounts. All users will be created with the specified credentials and will need to verify their email address before accessing the application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
