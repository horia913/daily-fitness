'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { DatabaseService } from '@/lib/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Calendar, 
  Target, 
  Award, 
  Edit, 
  Save, 
  X,
  Camera,
  Settings,
  Shield,
  Activity,
  Bell,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Globe,
  Moon,
  Sun,
  Palette,
  Users,
  MessageCircle,
  BarChart3,
  Heart,
  Sparkles,
  Dumbbell,
  Clock,
  MapPin,
  Phone,
  Mail as MailIcon,
  UserCheck,
  Trophy,
  Zap,
  Target as TargetIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

export default function ClientProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { isDark, performanceSettings } = useTheme()
  // Check if we're viewing as another user (for coach view)
  const [viewAsUserId, setViewAsUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    coachMessages: true,
    progressUpdates: true,
    weeklyReports: true,
    motivationalTips: true,
    systemUpdates: false
  })
  const [appSettings, setAppSettings] = useState({
    theme: 'light',
    units: 'metric',
    language: 'en'
  })
  const [fitnessPreferences, setFitnessPreferences] = useState({
    workoutTypes: ['strength', 'cardio'],
    timeOfDay: 'morning',
    workoutDuration: '45',
    difficulty: 'intermediate'
  })
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    fitness_level: '',
    goals: [] as string[],
    bio: '',
    phone: '',
    date_of_birth: '',
    height: '',
    weight: '',
    emergency_contact: '',
    medical_conditions: '',
    injuries: ''
  })

  useEffect(() => {
    // Check URL for viewAs parameter
    const params = new URLSearchParams(window.location.search)
    const viewAs = params.get('viewAs')
    if (viewAs) {
      setViewAsUserId(viewAs)
    }
  }, [])

  useEffect(() => {
    const userId = viewAsUserId || user?.id
    if (userId) {
      loadProfile(userId)
    }
  }, [user, viewAsUserId])

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true)
      const data = await DatabaseService.getProfile(userId)
      
      if (data) {
        setProfile(data)
        setFormData({
          first_name: data?.first_name || '',
          last_name: data?.last_name || '',
          email: data?.email || '',
          fitness_level: data?.fitness_level || '',
          goals: data?.goals || [],
          bio: data?.bio || '',
          phone: data?.phone || '',
          date_of_birth: data?.date_of_birth || '',
          height: data?.height || '',
          weight: data?.weight || '',
          emergency_contact: data?.emergency_contact || '',
          medical_conditions: data?.medical_conditions || '',
          injuries: data?.injuries || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        console.error('Error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        })
        
        if (uploadError.message.includes('row-level security policy')) {
          alert('Storage bucket not configured. Please contact administrator to set up avatar storage.')
        } else {
          alert(`Error uploading image: ${uploadError.message}`)
        }
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id)

      if (updateError) {
        console.error('Update error:', updateError)
        alert('Error updating profile. Please try again.')
        return
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl })
      alert('Profile picture updated successfully!')
      
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user?.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Error updating profile. Please try again.')
        return
      }

      setProfile({ ...profile, ...formData })
      setEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      email: profile?.email || '',
      fitness_level: profile?.fitness_level || '',
      goals: profile?.goals || [],
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth || '',
      height: profile?.height || '',
      weight: profile?.weight || '',
      emergency_contact: profile?.emergency_contact || '',
      medical_conditions: profile?.medical_conditions || '',
      injuries: profile?.injuries || ''
    })
    setEditing(false)
  }

  const addGoal = (goal: string) => {
    if (goal && !formData.goals.includes(goal)) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, goal]
      }))
    }
  }

  const removeGoal = (goalToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal !== goalToRemove)
    }))
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="client">
        <div className="p-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded mb-4"></div>
              <div className="h-64 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="client">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        <div className="p-4">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Enhanced Header */}
            <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>My Profile & Settings</h1>
                        <p className={`text-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Manage your personal information and app preferences</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!viewAsUserId && (
                      editing ? (
                        <>
                          <Button variant="outline" onClick={handleCancel} className="rounded-2xl">
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Profile Picture Section */}
            <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Profile Picture</CardTitle>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your personal photo for your fitness journey</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex items-center gap-8">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-4 border-white shadow-lg">
                        <User className="w-16 h-16 text-slate-500" />
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-all duration-300 shadow-lg hover:scale-110">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Update Profile Picture</h3>
                    <p className={`mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Upload a photo that represents your fitness journey. 
                      This helps your coach connect with you on a personal level.
                    </p>
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Info className="w-4 h-4" />
                      <span>Max size: 5MB • JPG, PNG supported</span>
                    </div>
                    {uploadingImage && (
                      <div className="flex items-center gap-2 mt-3 text-blue-600">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Notification Preferences */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Notification Preferences</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Control how and when you receive notifications</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-800">Workout Reminders</p>
                      <p className="text-sm text-slate-600">Get reminded about scheduled workouts</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.workoutReminders}
                      onChange={(e) => setNotifications(prev => ({ ...prev, workoutReminders: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-800">Coach Messages</p>
                      <p className="text-sm text-slate-600">Notifications when your coach sends messages</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.coachMessages}
                      onChange={(e) => setNotifications(prev => ({ ...prev, coachMessages: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-slate-800">Progress Updates</p>
                      <p className="text-sm text-slate-600">Celebrate your achievements and milestones</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.progressUpdates}
                      onChange={(e) => setNotifications(prev => ({ ...prev, progressUpdates: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-slate-800">Motivational Tips</p>
                      <p className="text-sm text-slate-600">Daily motivation and fitness tips</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.motivationalTips}
                      onChange={(e) => setNotifications(prev => ({ ...prev, motivationalTips: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>App Preferences</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Customize your app experience</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Theme</Label>
                  <Select value={appSettings.theme} onValueChange={(value) => setAppSettings(prev => ({ ...prev, theme: value }))}>
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="dark">Dark Mode</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Units</Label>
                  <Select value={appSettings.units} onValueChange={(value) => setAppSettings(prev => ({ ...prev, units: value }))}>
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                      <SelectItem value="imperial">Imperial (lbs, ft)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Preferences */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <TargetIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Goals & Preferences</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your fitness goals and workout preferences</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Preferred Workout Time</Label>
                  <Select value={fitnessPreferences.timeOfDay} onValueChange={(value) => setFitnessPreferences(prev => ({ ...prev, timeOfDay: value }))}>
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 6PM)</SelectItem>
                      <SelectItem value="evening">Evening (6PM - 10PM)</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Workout Duration</Label>
                  <Select value={fitnessPreferences.workoutDuration} onValueChange={(value) => setFitnessPreferences(prev => ({ ...prev, workoutDuration: value }))}>
                    <SelectTrigger className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90+ minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Personal Information */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Personal Information</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your basic personal details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="first_name" className="text-sm font-semibold text-slate-700">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      disabled={!editing}
                      className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="last_name" className="text-sm font-semibold text-slate-700">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      disabled={!editing}
                      className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editing}
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!editing}
                      placeholder="+1 (555) 123-4567"
                      className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="date_of_birth" className="text-sm font-semibold text-slate-700">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      disabled={!editing}
                      className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bio" className="text-sm font-semibold text-slate-700">About Me</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!editing}
                    rows={4}
                    placeholder="Tell us about yourself, your fitness journey, and what motivates you..."
                    className="rounded-2xl border-slate-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>
            </CardContent>
          </Card>

          {/* Enhanced Fitness Information */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Fitness Information</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your current fitness level and measurements</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fitness_level">Fitness Level</Label>
                <Select 
                  value={formData.fitness_level} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fitness_level: value }))}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fitness level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                    disabled={!editing}
                    placeholder="e.g., 5'10 or 178cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    disabled={!editing}
                    placeholder="e.g., 150lbs or 68kg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.goals.map((goal, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {goal}
                      {editing && (
                        <button
                          onClick={() => removeGoal(goal)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a goal..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addGoal(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder="Add a goal..."]') as HTMLInputElement
                        if (input?.value) {
                          addGoal(input.value)
                          input.value = ''
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card className={`shadow-md ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <Shield className="w-5 h-5" />
                Health Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  disabled={!editing}
                  placeholder="Name and phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
                  disabled={!editing}
                  rows={3}
                  placeholder="List any medical conditions..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="injuries">Injuries</Label>
                <Textarea
                  id="injuries"
                  value={formData.injuries}
                  onChange={(e) => setFormData(prev => ({ ...prev, injuries: e.target.value }))}
                  disabled={!editing}
                  rows={3}
                  placeholder="List any current or past injuries..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Account Information */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Account Information</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Your account details and status</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Member Since</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Account Role</div>
                      <div className="text-sm text-slate-600 mt-1">Fitness Client</div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Client</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Privacy & Security</CardTitle>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Manage your account security and privacy</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-800">Change Password</p>
                        <p className="text-sm text-slate-600">Update your account password</p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-2xl">
                      <Lock className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-slate-800">Privacy Policy</p>
                        <p className="text-sm text-slate-600">Read our privacy policy and terms</p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-2xl">
                      <Globe className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-slate-800">Delete Account</p>
                        <p className="text-sm text-slate-600">Permanently delete your account</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Section */}
          <Card className={`${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-sm shadow-lg border-0 rounded-3xl overflow-hidden`}>
            <CardContent className="p-6">
              <div className="text-center">
                <Button 
                  variant="outline" 
                  className={`w-full rounded-2xl ${isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          </div>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
