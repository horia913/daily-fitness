'use client'

import { useState, useEffect } from 'react'
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
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[color:var(--fc-glass-border)] border-t-[color:var(--fc-domain-workouts)]"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 fc-icon-tile fc-icon-neutral w-12 h-12">
          <User className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold fc-text-primary mb-2">Profile Not Found</h3>
        <p className="fc-text-dim">Unable to load client profile</p>
      </div>
    )
  }

  const InfoRow = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
      <div className="fc-icon-tile fc-icon-workouts">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="fc-text-subtle mb-1 text-xs font-medium">{label}</p>
        <p className="fc-text-primary text-sm font-semibold">{value || 'Not provided'}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 1. Profile Picture Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Profile Picture</h3>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="flex items-center gap-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-[color:var(--fc-glass-border)] shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-[color:var(--fc-glass-border)] shadow-lg fc-glass-soft flex items-center justify-center text-2xl font-bold fc-text-primary">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
            )}
            <div>
              <h3 className="fc-text-primary mb-1 text-xl font-bold">
                {profile.first_name} {profile.last_name}
              </h3>
              <p className="fc-text-dim text-sm">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personal Information Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Personal Information</h3>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0">
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
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
              <p className="fc-text-subtle mb-2 text-xs font-medium">Bio</p>
              <p className="fc-text-primary text-sm">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Fitness Information Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Fitness Information</h3>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0">
          <InfoRow icon={Activity} label="Fitness Level" value={profile.fitness_level || 'Not set'} />
          <InfoRow icon={Ruler} label="Height" value={profile.height ? `${profile.height} cm` : 'Not set'} />
          <InfoRow icon={Weight} label="Weight" value={profile.weight ? `${profile.weight} kg` : (profile.bodyweight ? `${profile.bodyweight} kg` : 'Not set')} />
          {profile.goals && profile.goals.length > 0 ? (
            <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl px-3 py-3">
              <div className="flex items-start gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="fc-text-subtle mb-2 text-xs font-medium">Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.goals.map((goal: string, index: number) => (
                      <span 
                        key={index}
                        className="fc-pill fc-pill-glass fc-text-success text-xs"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <InfoRow icon={Target} label="Goals" value="Not set" />
          )}
        </div>
      </div>

      {/* 4. Health Information Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Health Information</h3>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0">
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
        </div>
      </div>

      {/* 5. Account Information Card */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary">Account Information</h3>
          </div>
        </div>
        <div className="space-y-3 p-6 pt-0">
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
        </div>
      </div>
    </div>
  )
}

