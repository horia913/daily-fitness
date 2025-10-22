'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  User, 
  Mail, 
  Phone,
  Calendar,
  MapPin,
  Dumbbell,
  Target,
  Ruler,
  Weight,
  Activity,
  Heart,
  AlertTriangle,
  Shield,
  Clock,
  Camera
} from 'lucide-react'
import { DatabaseService } from '@/lib/database'

interface ClientProfileViewProps {
  clientId: string
}

export default function ClientProfileView({ clientId }: ClientProfileViewProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClientProfile()
  }, [clientId])

  const loadClientProfile = async () => {
    try {
      setLoading(true)
      const data = await DatabaseService.getProfile(clientId)
      setProfile(data)
    } catch (error) {
      console.error('Error loading client profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Profile Not Found</h3>
        <p className={`${theme.textSecondary}`}>Unable to load client profile</p>
      </div>
    )
  }

  const InfoRow = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50" style={{ padding: '12px', borderRadius: '16px' }}>
      <div className="bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px' }}>
        <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${theme.textSecondary} mb-1`} style={{ fontSize: '12px', fontWeight: '500' }}>{label}</p>
        <p className={`${theme.text}`} style={{ fontSize: '14px', fontWeight: '600' }}>{value || 'Not provided'}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 1. Profile Picture Card */}
      <Card className={`${theme.card} ${theme.border}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid' }}>
        <CardHeader style={{ padding: '24px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
              <Camera className="w-6 h-6 text-white" />
            </div>
            <CardTitle className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>Profile Picture</CardTitle>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '24px', paddingTop: '0' }}>
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
              />
            ) : (
              <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-700 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-2xl font-bold">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className={`${theme.text} mb-1`} style={{ fontSize: '20px', fontWeight: '700' }}>
                {profile.first_name} {profile.last_name}
              </h3>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>{profile.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Personal Information Card */}
      <Card className={`${theme.card} ${theme.border}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid' }}>
        <CardHeader style={{ padding: '24px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
              <User className="w-6 h-6 text-white" />
            </div>
            <CardTitle className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>Personal Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3" style={{ padding: '24px', paddingTop: '0' }}>
          <InfoRow icon={User} label="Full Name" value={`${profile.first_name || ''} ${profile.last_name || ''}`.trim()} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          {profile.phone && <InfoRow icon={Phone} label="Phone" value={profile.phone} />}
          {profile.date_of_birth && (
            <InfoRow 
              icon={Calendar} 
              label="Date of Birth" 
              value={new Date(profile.date_of_birth).toLocaleDateString()}
            />
          )}
          {profile.bio && (
            <div className="bg-slate-50 dark:bg-slate-800/50" style={{ padding: '12px', borderRadius: '16px' }}>
              <p className={`${theme.textSecondary} mb-2`} style={{ fontSize: '12px', fontWeight: '500' }}>Bio</p>
              <p className={`${theme.text}`} style={{ fontSize: '14px' }}>{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Fitness Information Card */}
      <Card className={`${theme.card} ${theme.border}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid' }}>
        <CardHeader style={{ padding: '24px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <CardTitle className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>Fitness Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3" style={{ padding: '24px', paddingTop: '0' }}>
          <InfoRow icon={Activity} label="Fitness Level" value={profile.fitness_level || 'Not set'} />
          <InfoRow icon={Ruler} label="Height" value={profile.height ? `${profile.height} cm` : 'Not set'} />
          <InfoRow icon={Weight} label="Weight" value={profile.weight ? `${profile.weight} kg` : (profile.bodyweight ? `${profile.bodyweight} kg` : 'Not set')} />
          {profile.goals && profile.goals.length > 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20" style={{ padding: '12px', borderRadius: '16px' }}>
              <div className="flex items-start gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px' }}>
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className={`${theme.textSecondary} mb-2`} style={{ fontSize: '12px', fontWeight: '500' }}>Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.goals.map((goal: string, index: number) => (
                      <Badge 
                        key={index}
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0"
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <InfoRow icon={Target} label="Goals" value="Not set" />
          )}
        </CardContent>
      </Card>

      {/* 4. Health Information Card */}
      <Card className={`${theme.card} ${theme.border}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid' }}>
        <CardHeader style={{ padding: '24px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
              <Heart className="w-6 h-6 text-white" />
            </div>
            <CardTitle className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>Health Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3" style={{ padding: '24px', paddingTop: '0' }}>
          <InfoRow 
            icon={AlertTriangle} 
            label="Medical Conditions" 
            value={profile.medical_conditions || 'None reported'}
          />
          <InfoRow 
            icon={AlertTriangle} 
            label="Injuries" 
            value={profile.injuries || 'None reported'}
          />
          <InfoRow 
            icon={Phone} 
            label="Emergency Contact" 
            value={profile.emergency_contact || 'Not set'}
          />
        </CardContent>
      </Card>

      {/* 5. Account Information Card */}
      <Card className={`${theme.card} ${theme.border}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid' }}>
        <CardHeader style={{ padding: '24px', paddingBottom: '16px' }}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>Account Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3" style={{ padding: '24px', paddingTop: '0' }}>
          <InfoRow 
            icon={Shield} 
            label="Role" 
            value={profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || 'Client'}
          />
          {profile.created_at && (
            <InfoRow 
              icon={Clock} 
              label="Member Since" 
              value={new Date(profile.created_at).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            />
          )}
          <InfoRow 
            icon={Activity} 
            label="Account Status" 
            value="Active"
          />
        </CardContent>
      </Card>
    </div>
  )
}

