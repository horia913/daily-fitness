'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Users, ArrowRight, Plus, Play, Pause, CheckCircle, AlertCircle, Timer, Phone, Video, Dumbbell, Utensils, MessageCircle, Target, Zap, Star, ExternalLink, ChevronRight, MapPin, Bell, RefreshCw, MoreHorizontal, Eye, Edit, Trash2, Copy, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
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
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-500 text-white',
          border: 'border-purple-200 dark:border-purple-800',
          glow: 'shadow-purple-200 dark:shadow-purple-800'
        }
      case 'consultation':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-600 dark:text-orange-400',
          badge: 'bg-orange-500 text-white',
          border: 'border-orange-200 dark:border-orange-800',
          glow: 'shadow-orange-200 dark:shadow-orange-800'
        }
      case 'check-in':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-500 text-white',
          border: 'border-green-200 dark:border-green-800',
          glow: 'shadow-green-200 dark:shadow-green-800'
        }
      case 'nutrition':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500 text-white',
          border: 'border-blue-200 dark:border-blue-800',
          glow: 'shadow-blue-200 dark:shadow-blue-800'
        }
      case 'phone call':
        return {
          bg: 'bg-teal-100 dark:bg-teal-900/30',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-500 text-white',
          border: 'border-teal-200 dark:border-teal-800',
          glow: 'shadow-teal-200 dark:shadow-teal-800'
        }
      case 'video call':
        return {
          bg: 'bg-indigo-100 dark:bg-indigo-900/30',
          text: 'text-indigo-600 dark:text-indigo-400',
          badge: 'bg-indigo-500 text-white',
          border: 'border-indigo-200 dark:border-indigo-800',
          glow: 'shadow-indigo-200 dark:shadow-indigo-800'
        }
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-900/30',
          text: 'text-slate-600 dark:text-slate-400',
          badge: 'bg-slate-500 text-white',
          border: 'border-slate-200 dark:border-slate-800',
          glow: 'shadow-slate-200 dark:shadow-slate-800'
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
      case 'current': return 'text-green-600 dark:text-green-400'
      case 'completed': return 'text-blue-600 dark:text-blue-400'
      case 'cancelled': return 'text-red-600 dark:text-red-400'
      default: return 'text-slate-600 dark:text-slate-400'
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
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-orange-100 to-blue-100 dark:from-orange-900/30 dark:to-blue-900/30 rounded-xl">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Today's Schedule</h2>
              <p className={`text-sm ${theme.textSecondary}`}>{formatDate(currentTime)}</p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-blue-500 text-white px-3 py-1">
              {sortedSessions.length} sessions
            </Badge>
            <Button variant="ghost" size="sm" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              View Calendar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        {sortedSessions.length > 0 ? (
          <div className="space-y-4">
            {/* Current time indicator */}
            <div className={`${theme.card} rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${theme.text}`}>
                    Current Time: {formatTime(currentTime.toISOString())}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
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
                    className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 ${sessionColors.border} hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-105 hover:${sessionColors.glow} hover:shadow-lg`}
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`p-3 rounded-xl ${sessionColors.bg} group-hover:scale-110 transition-transform duration-300`}>
                          {getSessionTypeIcon(session.session_type)}
                        </div>
                        {index < sortedSessions.length - 1 && (
                          <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold ${theme.text} text-sm sm:text-base mb-1`}>
                              {session.title}
                            </h3>
                            <p className={`text-sm ${theme.textSecondary} mb-2`}>
                              with {session.client_name}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 ml-2">
                            <Badge className={`text-xs ${sessionColors.badge} px-2 py-1`}>
                              {session.session_type}
                            </Badge>
                            <div className={`flex items-center gap-1 text-xs ${getStatusColor(status)}`}>
                              {getStatusIcon(status)}
                              <span>{getStatusLabel(status)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Bell className="w-3 h-3" />
                                <span>{timeUntil}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {session.location && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <MapPin className="w-3 h-3" />
                                <span>{session.location}</span>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs px-2 py-1 h-6"
                            >
                              {status === 'current' ? 'Join' : status === 'completed' ? 'Review' : 'View'}
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="space-y-3">
                              {session.notes && (
                                <div className="flex items-start gap-2">
                                  <MessageCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                                  <div>
                                    <p className={`text-xs font-medium ${theme.textSecondary} mb-1`}>Notes:</p>
                                    <p className={`text-sm ${theme.text}`}>{session.notes}</p>
                                  </div>
                                </div>
                              )}
                              
                              {session.meeting_link && (
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="rounded-xl">
                                    <Video className="w-3 h-3 mr-1" />
                                    Join Meeting
                                  </Button>
                                  <Button variant="outline" size="sm" className="rounded-xl">
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Link
                                  </Button>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl">
                                  <Share2 className="w-3 h-3 mr-1" />
                                  Share
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-xl text-red-600 hover:text-red-700">
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
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button 
                variant="outline" 
                className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Session
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-6">
              <Calendar className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
              No sessions today! 🎯
            </h3>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Perfect time to catch up on admin tasks or plan ahead for tomorrow
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className={`${theme.primary} ${theme.shadow} rounded-xl`}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Session
              </Button>
              <Button variant="outline" className="rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
