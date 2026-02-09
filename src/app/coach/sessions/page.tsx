'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar,
  ChevronDown,
  Plus,
  Users,
  Clock,
  Search,
  CalendarDays,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserX,
  Video,
  MapPin,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Session {
  id: string
  coach_id: string
  client_id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  created_at: string
  updated_at: string
  client?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function CoachSessions() {
  const { getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [showEditSession, setShowEditSession] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [sessionForm, setSessionForm] = useState({
    client_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'no_show',
    notes: ''
  })

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load sessions
      try {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .eq('coach_id', user.id)
          .order('scheduled_at', { ascending: false })

        if (sessionsError) {
          console.log('Sessions table error:', sessionsError)
          setSessions([])
        } else {
          // Load client profiles for each session
          if (sessionsData && sessionsData.length > 0) {
            const clientIds = [...new Set(sessionsData.map(s => s.client_id))]
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', clientIds)

            const sessionsWithClients = sessionsData.map(session => ({
              ...session,
              client: profilesData?.find(p => p.id === session.client_id)
            }))

            console.log('Sessions loaded successfully:', sessionsWithClients.length, 'items')
            setSessions(sessionsWithClients)
          } else {
            setSessions([])
          }
        }
      } catch (error) {
        console.log('Sessions table error:', error)
        setSessions([])
      }

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('client_id')
        .eq('coach_id', user.id)
        .eq('status', 'active')

      if (clientsError) {
        console.log('Clients error:', clientsError)
        setClients([])
      } else if (clientsData && clientsData.length > 0) {
        const clientIds = clientsData.map(c => c.client_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)

        const clientsWithProfiles = profilesData?.map(profile => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email
        })) || []

        setClients(clientsWithProfiles)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setSessions([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('sessions')
        .insert({
          coach_id: user.id,
          ...sessionForm
        })

      if (error) {
        console.error('Error creating session:', error)
        alert('Error creating session. Please try again.')
        return
      }

      setShowCreateSession(false)
      setSessionForm({
        client_id: '',
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60,
        status: 'scheduled',
        notes: ''
      })
      loadData()
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Error creating session. Please try again.')
    }
  }

  const updateSession = async () => {
    try {
      if (!selectedSession) return

      const { error } = await supabase
        .from('sessions')
        .update(sessionForm)
        .eq('id', selectedSession.id)

      if (error) {
        console.error('Error updating session:', error)
        alert('Error updating session. Please try again.')
        return
      }

      setShowEditSession(false)
      setSelectedSession(null)
      loadData()
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Error updating session. Please try again.')
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.error('Error deleting session:', error)
        alert('Error deleting session. Please try again.')
        return
      }

      loadData()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Error deleting session. Please try again.')
    }
  }

  const handleEditSession = (session: Session) => {
    setSelectedSession(session)
    setSessionForm({
      client_id: session.client_id,
      title: session.title,
      description: session.description || '',
      scheduled_at: session.scheduled_at,
      duration_minutes: session.duration_minutes,
      status: session.status,
      notes: session.notes || ''
    })
    setShowEditSession(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Cancelled</Badge>
      case 'no_show':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">No Show</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'no_show':
        return <UserX className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div style={{ backgroundColor: '#E8E9F3', minHeight: '100vh', paddingBottom: '100px' }}>
          <div style={{ padding: '24px 20px' }}>
            <div className="max-w-7xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '32px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
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
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen pb-24">
        <div className="px-6 pt-10">
          <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight fc-text-primary">Session Management</h1>
                <p className="text-sm fc-text-dim mt-1">Manage your small group training schedule.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="fc-glass rounded-2xl border border-[color:var(--fc-glass-border)] p-1 flex">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === 'list' ? 'fc-glass-soft fc-text-primary shadow-sm' : 'fc-text-dim hover:fc-text-primary'}`}
                  >
                    List View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === 'calendar' ? 'fc-glass-soft fc-text-primary shadow-sm' : 'fc-text-dim hover:fc-text-primary'}`}
                  >
                    Calendar
                  </button>
                </div>
                <Button variant="ghost" size="icon" onClick={loadData} className="fc-btn fc-btn-ghost h-12 w-12 rounded-2xl">
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
            </header>

            {/* Filter bar — mockup: chips All Sessions, Upcoming, Completed, Cancelled */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {[
                    { value: "all", label: "All Sessions" },
                    { value: "scheduled", label: "Upcoming" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterStatus(value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all ${
                        filterStatus === value
                          ? "fc-glass-soft fc-text-primary border-[color:var(--fc-glass-border)] shadow-sm"
                          : "fc-glass border border-[color:var(--fc-glass-border)] fc-text-dim hover:fc-text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="hidden md:flex items-center gap-2 fc-glass border border-[color:var(--fc-glass-border)] rounded-xl px-4 py-2">
                  <Calendar className="w-4 h-4 fc-text-dim" />
                  <span className="text-sm font-medium fc-text-primary">This Week</span>
                  <ChevronDown className="w-4 h-4 fc-text-dim" />
                </div>
              </div>
            </section>

            <GlassCard className="p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
                  <Input
                    placeholder="Search sessions or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input h-12 w-full pl-12"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="fc-select h-12 w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard className="p-5 flex items-center gap-4 rounded-2xl">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <CalendarDays className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-2xl font-bold fc-text-primary leading-tight">{sessions.length}</p>
                  <p className="text-sm fc-text-dim">Total Sessions</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5 flex items-center gap-4 rounded-2xl">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-400 text-white">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-2xl font-bold fc-text-primary leading-tight">{sessions.filter(s => s.status === 'scheduled').length}</p>
                  <p className="text-sm fc-text-dim">Scheduled</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5 flex items-center gap-4 rounded-2xl">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 text-white">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-2xl font-bold fc-text-primary leading-tight">{sessions.filter(s => s.status === 'completed').length}</p>
                  <p className="text-sm fc-text-dim">Completed</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5 flex items-center gap-4 rounded-2xl">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-2xl font-bold fc-text-primary leading-tight">{clients.length}</p>
                  <p className="text-sm fc-text-dim">Active Clients</p>
                </div>
              </GlassCard>
            </div>

            {/* Sessions List or Calendar */}
            {viewMode === 'calendar' ? (
              <GlassCard className="p-6 rounded-2xl min-h-[400px] flex items-center justify-center">
                <p className="text-sm fc-text-dim">Calendar view coming soon. Use List View for now.</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold fc-text-primary">Sessions</h2>
                {filteredSessions.length === 0 ? (
                  <GlassCard className="p-12 text-center rounded-2xl">
                    <div className="p-4 rounded-2xl fc-glass-soft w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <CalendarDays className="w-10 h-10 fc-text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold fc-text-primary mb-2">No sessions yet</h3>
                    <p className="text-sm fc-text-dim mb-6 max-w-sm mx-auto">
                      Schedule training sessions with your clients to see them here.
                    </p>
                    <Button onClick={() => setShowCreateSession(true)} className="fc-btn fc-btn-primary">
                      <Plus className="w-5 h-5 mr-2" />
                      Schedule first session
                    </Button>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSessions.map(session => (
                      <GlassCard key={session.id} className="p-5 rounded-2xl">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl fc-glass-soft shrink-0">
                              {getStatusIcon(session.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold fc-text-primary truncate">{session.title}</h3>
                              {session.client && (
                                <p className="text-sm fc-text-dim">
                                  {session.client.first_name} {session.client.last_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm fc-text-dim">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(session.scheduled_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration_minutes} min
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--fc-glass-border)]">
                            {getStatusBadge(session.status)}
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditSession(session)} className="fc-btn fc-btn-ghost h-9">
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteSession(session.id)} className="text-red-500 hover:text-red-600 h-9">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Session Modal */}
            <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
              <DialogContent className="rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(500px,95vw)] !m-0 !p-6" style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <DialogHeader className="space-y-3">
                  <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Schedule Training Session</DialogTitle>
                  <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                    Schedule a new training session with a client
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client" className={`${theme.text}`}>Select Client</Label>
                    <Select value={sessionForm.client_id} onValueChange={(value) => setSessionForm(prev => ({ ...prev, client_id: value }))}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <Users className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title" className={`${theme.text}`}>Session Title</Label>
                    <Input
                      id="title"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Upper Body Strength Training"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Session details..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduled_at" className={`${theme.text}`}>Date & Time</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={sessionForm.scheduled_at}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className={`${theme.text}`}>Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={sessionForm.duration_minutes}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createSession} 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                      disabled={!sessionForm.client_id || !sessionForm.title || !sessionForm.scheduled_at}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Schedule Session
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateSession(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Session Modal */}
            <Dialog open={showEditSession} onOpenChange={setShowEditSession}>
              <DialogContent className="rounded-2xl border-0 shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(500px,95vw)] !m-0 !p-6" style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}>
                <DialogHeader className="space-y-3">
                  <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Edit Training Session</DialogTitle>
                  <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                    Update session details and status
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title" className={`${theme.text}`}>Session Title</Label>
                    <Input
                      id="edit-title"
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Upper Body Strength Training"
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description" className={`${theme.text}`}>Description (Optional)</Label>
                    <Textarea
                      id="edit-description"
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Session details..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-scheduled_at" className={`${theme.text}`}>Date & Time</Label>
                    <Input
                      id="edit-scheduled_at"
                      type="datetime-local"
                      value={sessionForm.scheduled_at}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-duration" className={`${theme.text}`}>Duration (minutes)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      value={sessionForm.duration_minutes}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status" className={`${theme.text}`}>Status</Label>
                    <Select value={sessionForm.status} onValueChange={(value: any) => setSessionForm(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-notes" className={`${theme.text}`}>Notes (Optional)</Label>
                    <Textarea
                      id="edit-notes"
                      value={sessionForm.notes}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Session notes..."
                      className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={updateSession} 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Update Session
                    </Button>
                    <Button variant="outline" onClick={() => setShowEditSession(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* FAB: New session */}
            <Button
              className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-2xl fc-btn-primary shadow-lg hover:scale-105 transition-transform"
              size="icon"
              onClick={() => setShowCreateSession(true)}
              aria-label="New session"
            >
              <Plus className="w-7 h-7" />
            </Button>
          </div>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
