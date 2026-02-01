'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Target,
  Users,
  Star,
  Edit,
  Play,
  Pause,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  coach_id: string
  start_date: string
  status: string
  total_days: number
  created_at: string
  workout_programs?: {
    id: string
    name: string
    description?: string
    difficulty_level: string
    duration_weeks: number
    target_audience: string
  }
}

interface ScheduleItem {
  id: string
  program_id: string
  template_id: string
  week_number: number
  day_of_week: number
  workout_templates?: {
    id: string
    name: string
    description?: string
    estimated_duration?: number
    difficulty_level?: string
  }
}

interface ClientProfile {
  id: string
  first_name: string
  last_name: string
  email: string
}

function ClientProgramDetailsContent() {
  const params = useParams()
  const router = useRouter()
  const { isDark, getSemanticColor, performanceSettings } = useTheme()
  
  const clientId = params.id as string
  const programId = params.programId as string
  
  const [assignment, setAssignment] = useState<ProgramAssignment | null>(null)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const difficultyColors: Record<string, string> = {
    'beginner': 'fc-text-success',
    'intermediate': 'fc-text-warning',
    'advanced': 'fc-text-error'
  }

  const targetAudienceLabels: Record<string, string> = {
    'general_fitness': 'General Fitness',
    'weight_loss': 'Weight Loss',
    'muscle_gain': 'Muscle Gain',
    'strength': 'Strength',
    'endurance': 'Endurance',
    'athletic_performance': 'Athletic Performance'
  }

  const statusColors: Record<string, string> = {
    'active': 'fc-text-success',
    'paused': 'fc-text-warning',
    'completed': 'fc-text-trust',
    'cancelled': 'fc-text-error'
  }

  useEffect(() => {
    loadData()
  }, [clientId, programId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load client profile
      const { data: clientData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', clientId)
        .single()
      
      if (clientData) setClient(clientData)

      // Load program assignment with program details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('program_assignments')
        .select('*, workout_programs(*)')
        .eq('client_id', clientId)
        .eq('program_id', programId)
        .single()

      if (assignmentError) {
        console.error('Error loading assignment:', assignmentError)
      } else if (assignmentData) {
        setAssignment(assignmentData)
      }

      // Load program schedule with templates
      const { data: scheduleData } = await supabase
        .from('program_schedule')
        .select('*')
        .eq('program_id', programId)
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true })

      if (scheduleData && scheduleData.length > 0) {
        // Fetch templates for schedule items
        const templateIds = [...new Set(scheduleData.map(s => s.template_id).filter(Boolean))]
        
        if (templateIds.length > 0) {
          const { data: templatesData } = await supabase
            .from('workout_templates')
            .select('*')
            .in('id', templateIds)
          
          if (templatesData) {
            const templatesMap = new Map(templatesData.map(t => [t.id, t]))
            const scheduleWithTemplates = scheduleData.map(s => ({
              ...s,
              workout_templates: s.template_id ? templatesMap.get(s.template_id) : null
            }))
            setSchedule(scheduleWithTemplates)
          }
        } else {
          setSchedule(scheduleData)
        }
      }

      // Load program progress (may not exist yet for new assignments)
      if (assignmentData?.id) {
        const { data: progressData } = await supabase
          .from('program_progress')
          .select('*')
          .eq('program_assignment_id', assignmentData.id)
          .maybeSingle()

        if (progressData) setProgress(progressData)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!assignment) return
    
    try {
      const { error } = await supabase
        .from('program_assignments')
        .update({ status: newStatus })
        .eq('id', assignment.id)

      if (error) throw error
      
      setAssignment({ ...assignment, status: newStatus })
      alert(`Program status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update program status')
    }
  }

  const program = assignment?.workout_programs
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client'

  // Group schedule by week
  const scheduleByWeek = schedule.reduce((acc, item) => {
    const week = item.week_number
    if (!acc[week]) acc[week] = []
    acc[week].push(item)
    return acc
  }, {} as Record<number, ScheduleItem[]>)

  const weeks = Object.keys(scheduleByWeek).map(Number).sort((a, b) => a - b)

  if (loading) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <GlassCard elevation={2} className="fc-glass fc-card p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 rounded-xl bg-[color:var(--fc-glass-highlight)] w-1/3"></div>
              <div className="h-4 rounded-xl bg-[color:var(--fc-glass-highlight)] w-2/3"></div>
              <div className="h-64 rounded-xl bg-[color:var(--fc-glass-highlight)]"></div>
            </div>
          </GlassCard>
        </div>
      </AnimatedBackground>
    )
  }

  if (!assignment || !program) {
    return (
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
          <GlassCard elevation={2} className="fc-glass fc-card p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 fc-text-error" />
            <h2 className="text-xl font-bold fc-text-primary mb-2">Program Not Found</h2>
            <p className="fc-text-dim mb-4">This program assignment could not be found.</p>
            <Link href={`/coach/clients/${clientId}`}>
              <Button className="fc-btn fc-btn-primary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Client
              </Button>
            </Link>
          </GlassCard>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground>
      {performanceSettings.floatingParticles && <FloatingParticles />}
      
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-10 space-y-6">
        {/* Back Button */}
        <Link href={`/coach/clients/${clientId}`}>
          <Button variant="ghost" size="sm" className="fc-btn fc-btn-ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {clientName}
          </Button>
        </Link>

        {/* Header */}
        <GlassCard elevation={2} className="fc-glass fc-card p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="fc-icon-tile fc-icon-workouts w-14 h-14">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="fc-pill fc-pill-glass fc-text-workouts">Program Assignment</span>
                  <span className={`fc-pill fc-pill-glass ${statusColors[assignment.status] || 'fc-text-subtle'}`}>
                    {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold fc-text-primary">
                  {program.name}
                </h1>
                <p className="fc-text-dim mt-1">
                  Assigned to <span className="fc-text-primary font-medium">{clientName}</span>
                </p>
                <p className="text-sm fc-text-subtle mt-1">
                  Started {new Date(assignment.start_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {assignment.status === 'active' && (
                <Button 
                  variant="outline" 
                  className="fc-btn fc-btn-secondary"
                  onClick={() => handleStatusChange('paused')}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              {assignment.status === 'paused' && (
                <Button 
                  className="fc-btn fc-btn-primary"
                  onClick={() => handleStatusChange('active')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {assignment.status !== 'completed' && (
                <Button 
                  variant="outline"
                  className="fc-btn fc-btn-ghost fc-text-success"
                  onClick={() => handleStatusChange('completed')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              <Link href={`/coach/programs/${program.id}/edit`}>
                <Button variant="outline" className="fc-btn fc-btn-secondary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Program
                </Button>
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* Program Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard elevation={2} className="fc-glass fc-card p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">{program.duration_weeks}</p>
                <p className="text-sm fc-text-dim">Weeks</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-workouts w-10 h-10">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold fc-text-primary">{schedule.length}</p>
                <p className="text-sm fc-text-dim">Total Workouts</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-habits w-10 h-10">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold fc-text-primary">
                  {targetAudienceLabels[program.target_audience] || program.target_audience}
                </p>
                <p className="text-sm fc-text-dim">Target</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard elevation={2} className="fc-glass fc-card p-4">
            <div className="flex items-center gap-3">
              <div className="fc-icon-tile fc-icon-warning w-10 h-10">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-lg font-bold ${difficultyColors[program.difficulty_level] || 'fc-text-primary'}`}>
                  {program.difficulty_level?.charAt(0).toUpperCase() + program.difficulty_level?.slice(1)}
                </p>
                <p className="text-sm fc-text-dim">Level</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Progress Section */}
        {progress && (
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <h2 className="text-xl font-bold fc-text-primary mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 fc-text-workouts" />
              Client Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <p className="text-sm fc-text-dim">Current Week</p>
                <p className="text-2xl font-bold fc-text-primary">{progress.current_week_index + 1}</p>
              </div>
              <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <p className="text-sm fc-text-dim">Current Day</p>
                <p className="text-2xl font-bold fc-text-primary">{progress.current_day_index + 1}</p>
              </div>
              <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)]">
                <p className="text-sm fc-text-dim">Status</p>
                <p className={`text-lg font-bold ${progress.is_completed ? 'fc-text-success' : 'fc-text-warning'}`}>
                  {progress.is_completed ? 'Completed' : 'In Progress'}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Description */}
        {program.description && (
          <GlassCard elevation={2} className="fc-glass fc-card p-6">
            <h2 className="text-xl font-bold fc-text-primary mb-3">Description</h2>
            <p className="fc-text-dim leading-relaxed">{program.description}</p>
          </GlassCard>
        )}

        {/* Weekly Schedule */}
        <GlassCard elevation={2} className="fc-glass fc-card p-6">
          <h2 className="text-xl font-bold fc-text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 fc-text-workouts" />
            Weekly Schedule
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              // Get workouts for this day across all weeks (just show week 1 as example)
              const dayWorkouts = schedule.filter(s => s.day_of_week === index && s.week_number === 1)
              return (
                <div key={day} className="p-3 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] text-center min-h-[100px]">
                  <h4 className="font-semibold fc-text-primary mb-2">{day}</h4>
                  {dayWorkouts.length > 0 ? (
                    <div className="space-y-1">
                      {dayWorkouts.map((item, idx) => (
                        <div key={idx} className="text-xs p-2 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)]">
                          <div className="font-medium fc-text-primary truncate">
                            {item.workout_templates?.name || 'Workout'}
                          </div>
                          <div className="fc-text-subtle">
                            {item.workout_templates?.estimated_duration || 60}m
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs fc-text-subtle">Rest</div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Full Schedule by Week */}
        <GlassCard elevation={2} className="fc-glass fc-card p-6">
          <h2 className="text-xl font-bold fc-text-primary mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 fc-text-workouts" />
            Full Program Schedule ({schedule.length} workouts)
          </h2>
          
          <div className="space-y-6">
            {weeks.map(weekNum => (
              <div key={weekNum}>
                <h3 className="text-lg font-semibold fc-text-primary mb-3 pb-2 border-b border-[color:var(--fc-glass-border)]">
                  Week {weekNum}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {scheduleByWeek[weekNum].map((item, idx) => (
                    <Link 
                      key={item.id || idx}
                      href={`/coach/workouts/templates/${item.template_id}`}
                      className="block"
                    >
                      <div className="p-4 rounded-xl fc-glass-soft border border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-domain-workouts)] transition-colors cursor-pointer">
                        <h4 className="font-semibold fc-text-primary mb-2 truncate">
                          {item.workout_templates?.name || 'Workout'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs fc-text-dim">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Day {item.day_of_week + 1}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.workout_templates?.estimated_duration || 60}m
                          </span>
                        </div>
                        {item.workout_templates?.difficulty_level && (
                          <span className={`mt-2 inline-block fc-pill fc-pill-glass text-xs ${difficultyColors[item.workout_templates.difficulty_level]}`}>
                            {item.workout_templates.difficulty_level}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AnimatedBackground>
  )
}

export default function ClientProgramDetailsPage() {
  return (
    <ProtectedRoute requiredRole="coach">
      <ClientProgramDetailsContent />
    </ProtectedRoute>
  )
}
