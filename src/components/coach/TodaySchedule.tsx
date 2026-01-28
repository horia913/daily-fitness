'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Users, ArrowRight, Plus, Play, CheckCircle, AlertCircle, Timer, Phone, Video, Dumbbell, Utensils, MessageCircle, Target, ExternalLink, ChevronRight, MapPin, Bell, Edit, Trash2, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  client_name: string
  start_time: string
  end_time?: string
  session_type: string
  duration_minutes?: number
  status?: 'upcoming' | 'current' | 'completed' | 'cancelled'
  location?: string
  meeting_link?: string
  notes?: string
  client_avatar?: string
}

interface TodayScheduleProps {
  sessions: Session[]
}

export default function TodaySchedule({ sessions }: TodayScheduleProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeString
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getSessionStatus = (session: Session) => {
    const now = currentTime
    const startTime = new Date(session.start_time)
    const endTime = session.end_time ? new Date(session.end_time) : new Date(startTime.getTime() + (session.duration_minutes || 60) * 60000)

    if (now < startTime) return 'upcoming'
    if (now >= startTime && now <= endTime) return 'current'
    if (now > endTime) return 'completed'
    return 'upcoming'
  }

  const getSessionTypeIcon = (sessionType: string) => {
    switch (sessionType.toLowerCase()) {
      case 'personal training':
        return <Dumbbell className="w-4 h-4" />
      case 'consultation':
        return <MessageCircle className="w-4 h-4" />
      case 'check-in':
        return <Target className="w-4 h-4" />
      case 'nutrition':
        return <Utensils className="w-4 h-4" />
      case 'phone call':
        return <Phone className="w-4 h-4" />
      case 'video call':
        return <Video className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getSessionTypeColor = (sessionType: string) => {
    switch (sessionType.toLowerCase()) {
      case 'personal training':
        return {
          badge: 'fc-text-workouts'
        }
      case 'consultation':
        return {
          badge: 'fc-text-warning'
        }
      case 'check-in':
        return {
          badge: 'fc-text-success'
        }
      case 'nutrition':
        return {
          badge: 'fc-text-habits'
        }
      case 'phone call':
        return {
          badge: 'fc-text-neutral'
        }
      case 'video call':
        return {
          badge: 'fc-text-workouts'
        }
      default:
        return {
          badge: 'fc-text-dim'
        }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current': return <Play className="w-3 h-3" />
      case 'completed': return <CheckCircle className="w-3 h-3" />
      case 'cancelled': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'fc-text-success'
      case 'completed': return 'fc-text-workouts'
      case 'cancelled': return 'fc-text-error'
      default: return 'fc-text-dim'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return 'Upcoming'
    }
  }

  const getTimeUntilSession = (session: Session) => {
    const now = currentTime
    const startTime = new Date(session.start_time)
    const diffMs = startTime.getTime() - now.getTime()
    
    if (diffMs <= 0) return null
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`
    } else {
      return 'Starting soon'
    }
  }

  const mockSessions = sessions.length > 0 ? sessions : [
    {
      id: '1',
      title: 'Morning Training Session',
      client_name: 'Jane Doe',
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      session_type: 'Personal Training',
      duration_minutes: 60,
      location: 'Gym Studio A',
      notes: 'Focus on upper body strength'
    },
    {
      id: '2',
      title: 'Progress Check-in',
      client_name: 'John Smith',
      start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 4.5 * 60 * 60 * 1000).toISOString(),
      session_type: 'Check-in',
      duration_minutes: 30,
      meeting_link: 'https://zoom.us/j/123456789'
    },
    {
      id: '3',
      title: 'Nutrition Consultation',
      client_name: 'Sarah Wilson',
      start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 6.75 * 60 * 60 * 1000).toISOString(),
      session_type: 'Consultation',
      duration_minutes: 45,
      meeting_link: 'https://zoom.us/j/987654321'
    },
    {
      id: '4',
      title: 'Evening Workout',
      client_name: 'Mike Johnson',
      start_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
      session_type: 'Personal Training',
      duration_minutes: 60,
      location: 'Gym Studio B',
      notes: 'Cardio and core focus'
    }
  ]

  // Sort sessions by start time
  const sortedSessions = [...mockSessions].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] relative overflow-hidden">
      <div className="pb-4 p-6 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Today
              </span>
              <h2 className="text-lg sm:text-xl font-bold fc-text-primary mt-2">
                Today's Schedule
              </h2>
              <p className="text-sm fc-text-dim">{formatDate(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              {sortedSessions.length} sessions
            </span>
            <Button variant="ghost" size="sm" className="text-xs fc-btn fc-btn-ghost">
              <ExternalLink className="w-3 h-3 mr-1" />
              View Calendar
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        {sortedSessions.length > 0 ? (
          <div className="space-y-4">
            {/* Current time indicator */}
            <div className="fc-glass-soft rounded-xl p-3 border border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium fc-text-primary">
                    Current Time: {formatTime(currentTime.toISOString())}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs fc-text-workouts">
                  <Timer className="w-3 h-3" />
                  <span>Live</span>
                </div>
              </div>
            </div>

            {/* Sessions timeline */}
            <div className="space-y-3">
              {sortedSessions.map((session, index) => {
                const sessionColors = getSessionTypeColor(session.session_type)
                const status = getSessionStatus(session)
                const timeUntil = getTimeUntilSession(session)
                const isExpanded = expandedSession === session.id
                
                return (
                  <div 
                    key={session.id}
                    className="fc-glass fc-card rounded-2xl p-4 border border-[color:var(--fc-glass-border)] transition-all duration-300 cursor-pointer group hover:shadow-lg"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className="fc-icon-tile fc-icon-workouts">
                          {getSessionTypeIcon(session.session_type)}
                        </div>
                        {index < sortedSessions.length - 1 && (
                          <div className="w-0.5 h-8 bg-[color:var(--fc-glass-border)] mt-2"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold fc-text-primary text-sm sm:text-base mb-1">
                              {session.title}
                            </h3>
                            <p className="text-sm fc-text-dim mb-2">
                              with {session.client_name}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 ml-2">
                            <span className={`fc-pill fc-pill-glass text-xs ${sessionColors.badge}`}>
                              {session.session_type}
                            </span>
                            <div className={`flex items-center gap-1 text-xs ${getStatusColor(status)}`}>
                              {getStatusIcon(status)}
                              <span>{getStatusLabel(status)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-wrap items-center gap-4 text-xs fc-text-subtle">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(session.start_time)}</span>
                              {session.end_time && (
                                <>
                                  <span>-</span>
                                  <span>{formatTime(session.end_time)}</span>
                                </>
                              )}
                            </div>
                            {session.duration_minutes && (
                              <div className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                <span>{session.duration_minutes} min</span>
                              </div>
                            )}
                            {timeUntil && (
                              <div className="flex items-center gap-1 fc-text-workouts">
                                <Bell className="w-3 h-3" />
                                <span>{timeUntil}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {session.location && (
                              <div className="flex items-center gap-1 text-xs fc-text-subtle">
                                <MapPin className="w-3 h-3" />
                                <span>{session.location}</span>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs px-2 py-1 h-6 fc-btn fc-btn-secondary"
                            >
                              {status === 'current' ? 'Join' : status === 'completed' ? 'Review' : 'View'}
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-[color:var(--fc-glass-border)]">
                            <div className="space-y-3">
                              {session.notes && (
                                <div className="flex items-start gap-2">
                                  <MessageCircle className="w-4 h-4 fc-text-subtle mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium fc-text-subtle mb-1">Notes:</p>
                                    <p className="text-sm fc-text-primary">{session.notes}</p>
                                  </div>
                                </div>
                              )}
                              
                              {session.meeting_link && (
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                                    <Video className="w-3 h-3 mr-1" />
                                    Join Meeting
                                  </Button>
                                  <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Link
                                  </Button>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary">
                                  <Share2 className="w-3 h-3 mr-1" />
                                  Share
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl fc-btn fc-btn-secondary fc-text-error">
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
              <Button 
                variant="outline" 
                className="w-full border-dashed fc-btn fc-btn-secondary rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Session
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl w-fit mx-auto mb-6">
              <Calendar className="w-12 h-12 fc-text-workouts" />
            </div>
            <h3 className="text-xl font-bold fc-text-primary mb-2">
              No sessions today! 🎯
            </h3>
            <p className="text-sm fc-text-dim mb-4">
              Perfect time to catch up on admin tasks or plan ahead for tomorrow
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="fc-btn fc-btn-primary fc-press rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
              <Button variant="outline" className="rounded-xl fc-btn fc-btn-secondary">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
