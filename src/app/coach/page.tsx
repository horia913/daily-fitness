'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  Dumbbell,
  Apple,
  UserPlus,
  Users,
  CheckCircle,
  BookOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Client {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
}

export default function CoachDashboard() {
  const { user } = useAuth()
  
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalWorkouts: 0,
    totalMealPlans: 0
  })
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    
    try {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('client_id, status')
        .eq('coach_id', user.id)

      const totalClients = clientsData?.length || 0
      const activeClients = clientsData?.filter(c => c.status === 'active').length || 0

      // Load recent client profiles
      if (clientsData && clientsData.length > 0) {
        const recentClientIds = clientsData.slice(0, 3).map(c => c.client_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', recentClientIds)
        
        setRecentClients(profilesData || [])
      }

      // Load workout templates count
      const { data: workoutsData } = await supabase
        .from('workout_templates')
        .select('id')
        .eq('coach_id', user.id)
        .eq('is_active', true)

      // Load meal plans count
      const { data: mealPlansData } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('coach_id', user.id)
        .eq('is_active', true)

      setStats({
        totalClients,
        activeClients,
        totalWorkouts: workoutsData?.length || 0,
        totalMealPlans: mealPlansData?.length || 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user, loadDashboardData])

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', paddingBottom: '100px' }}>
          <div style={{ padding: '24px 20px' }}>
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="animate-pulse space-y-6">
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', height: '128px' }}></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', height: '96px' }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <div style={{ minHeight: '100vh', backgroundColor: '#E8E9F3', paddingBottom: '100px' }}>
        <div style={{ padding: '24px 20px' }}>
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Greeting Header */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A' }}>
                    Coach Dashboard
                  </h1>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Total Clients */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid #2196F3' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A' }}>{stats.totalClients}</p>
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Total Clients</p>
                      </div>
                    </div>
              </div>

              {/* Active Clients */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid #4CAF50' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A' }}>{stats.activeClients}</p>
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Active</p>
                      </div>
                    </div>
              </div>

              {/* Workout Templates */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid #F5576C' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Dumbbell style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A' }}>{stats.totalWorkouts}</p>
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Workouts</p>
                      </div>
                    </div>
              </div>

              {/* Meal Plans */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', border: '2px solid #6C5CE7' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Apple style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: '#1A1A1A' }}>{stats.totalMealPlans}</p>
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>Meal Plans</p>
                      </div>
                    </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Create & Assign */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Dumbbell style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                      </div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Create & Assign</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/coach/programs-workouts">
                        <Button className="w-full text-white flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', borderRadius: '20px', padding: '32px 16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '80px' }}>
                          <Dumbbell className="w-6 h-6" />
                          <span>Workouts</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/meal-plans">
                        <Button className="w-full text-white flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', borderRadius: '20px', padding: '32px 16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '80px' }}>
                          <Apple className="w-6 h-6" />
                          <span>Meal Plans</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/programs-workouts">
                        <Button className="w-full text-white flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', borderRadius: '20px', padding: '32px 16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '80px' }}>
                          <BookOpen className="w-6 h-6" />
                          <span>Programs</span>
                        </Button>
                      </Link>
                      
                      <Link href="/coach/clients">
                        <Button className="w-full text-white flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', borderRadius: '20px', padding: '32px 16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '80px' }}>
                          <UserPlus className="w-6 h-6" />
                          <span>Add Client</span>
                        </Button>
                      </Link>
                    </div>
              </div>

              {/* Client Management */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Recent Clients</h2>
                      </div>
                      <Link href="/coach/clients">
                        <Button size="sm" variant="ghost" style={{ borderRadius: '16px', fontSize: '14px', fontWeight: '600', color: '#6C5CE7' }}>
                          View All
                        </Button>
                      </Link>
                    </div>
                    
                    {recentClients.length > 0 ? (
                      <div className="space-y-3">
                        {recentClients.map((client) => (
                          <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: '#F9FAFB', borderRadius: '20px', border: '2px solid #E5E7EB' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '700', fontSize: '18px' }}>
                              {client.first_name?.[0] || 'C'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A1A' }} className="truncate">
                              {client.first_name} {client.last_name}
                            </p>
                          </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users style={{ width: '48px', height: '48px', color: '#D1D5DB', margin: '0 auto 12px' }} />
                        <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>No clients yet</p>
                      </div>
                    )}
              </div>
            </div>

            {/* Client Management Note */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', marginBottom: '20px' }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A1A' }}>Client Management</h2>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', marginBottom: '16px' }}>
                    Click on any client in the <Link href="/coach/clients" style={{ color: '#6C5CE7', fontWeight: '600', textDecoration: 'underline' }}>Client List</Link> to view detailed progress, workouts, meals, goals, habits, and more in dedicated modals.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <Link href="/coach/clients" className="flex-1">
                      <Button className="w-full text-white" style={{ background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)', borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '48px' }}>
                        <Users className="w-5 h-5 mr-2" />
                        <span>View All Clients</span>
                      </Button>
                    </Link>
                    <Link href="/coach/clients" className="flex-1 sm:flex-initial">
                      <Button className="w-full text-white" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', borderRadius: '20px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', height: '48px', minWidth: '160px' }}>
                        <UserPlus className="w-5 h-5 mr-2" />
                        <span>Add Client</span>
                      </Button>
                    </Link>
                  </div>
            </div>


          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

