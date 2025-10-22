'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckSquare, MessageCircle, AlertTriangle, ArrowRight, Clock, ChevronLeft, ChevronRight, Eye, Star, Zap, Flame, Target, Users, Calendar, Bell, AlertCircle, CheckCircle2, XCircle, Timer, Play, Pause, RefreshCw, MoreHorizontal, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

export default function ActionItems() {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isScrolling, setIsScrolling] = useState(false)

  const actionItems = [
    {
      id: 1,
      title: "2 Pending Weekly Reviews",
      description: "Review client progress and provide feedback",
      icon: CheckSquare,
      priority: "urgent",
      urgency: "due_today",
      href: "/coach/reviews",
      timeAgo: "2 hours ago",
      clientName: "Multiple Clients",
      actionText: "Review Now",
      category: "reviews"
    },
    {
      id: 2,
      title: "Jane Doe sent a new message",
      description: "Questions about her workout routine",
      icon: MessageCircle,
      priority: "high",
      urgency: "new",
      href: "/coach/messages",
      timeAgo: "1 hour ago",
      clientName: "Jane Doe",
      actionText: "Reply",
      category: "messages"
    },
    {
      id: 3,
      title: "John Smith's ClipCard expires in 3 days",
      description: "Renewal required for continued access",
      icon: AlertTriangle,
      priority: "urgent",
      urgency: "expiring",
      href: "/coach/clipcards",
      timeAgo: "30 minutes ago",
      clientName: "John Smith",
      actionText: "Renew",
      category: "clipcards"
    },
    {
      id: 4,
      title: "Sarah Wilson needs program update",
      description: "Adjust workout intensity based on progress",
      icon: CheckSquare,
      priority: "medium",
      urgency: "pending",
      href: "/coach/programs-workouts",
      timeAgo: "4 hours ago",
      clientName: "Sarah Wilson",
      actionText: "Update",
      category: "programs"
    },
    {
      id: 5,
      title: "Mike Johnson missed 3 workouts",
      description: "Check-in required to maintain engagement",
      icon: Users,
      priority: "high",
      urgency: "overdue",
      href: "/coach/clients",
      timeAgo: "6 hours ago",
      clientName: "Mike Johnson",
      actionText: "Check-in",
      category: "engagement"
    },
    {
      id: 6,
      title: "New client onboarding scheduled",
      description: "Welcome call with new client tomorrow",
      icon: Calendar,
      priority: "medium",
      urgency: "upcoming",
      href: "/coach/scheduling",
      timeAgo: "1 day ago",
      clientName: "Alex Brown",
      actionText: "Prepare",
      category: "onboarding"
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-500 text-white',
          border: 'border-red-200 dark:border-red-800',
          glow: 'shadow-red-200 dark:shadow-red-800'
        }
      case 'high':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-600 dark:text-orange-400',
          badge: 'bg-orange-500 text-white',
          border: 'border-orange-200 dark:border-orange-800',
          glow: 'shadow-orange-200 dark:shadow-orange-800'
        }
      case 'medium':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500 text-white',
          border: 'border-blue-200 dark:border-blue-800',
          glow: 'shadow-blue-200 dark:shadow-blue-800'
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

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'due_today': return <Timer className="w-3 h-3" />
      case 'new': return <Star className="w-3 h-3" />
      case 'expiring': return <AlertCircle className="w-3 h-3" />
      case 'overdue': return <XCircle className="w-3 h-3" />
      case 'upcoming': return <Calendar className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      default: return <Bell className="w-3 h-3" />
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'due_today': return 'text-red-600 dark:text-red-400'
      case 'new': return 'text-green-600 dark:text-green-400'
      case 'expiring': return 'text-orange-600 dark:text-orange-400'
      case 'overdue': return 'text-red-600 dark:text-red-400'
      case 'upcoming': return 'text-blue-600 dark:text-blue-400'
      case 'pending': return 'text-slate-600 dark:text-slate-400'
      default: return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'due_today': return 'Due Today'
      case 'new': return 'New'
      case 'expiring': return 'Expiring'
      case 'overdue': return 'Overdue'
      case 'upcoming': return 'Upcoming'
      case 'pending': return 'Pending'
      default: return 'Action Required'
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const scrollAmount = 320 // Width of one card + gap
    const currentScroll = container.scrollLeft
    
    container.scrollTo({
      left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
      behavior: 'smooth'
    })
  }

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth)
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setIsScrolling(true)
      checkScrollButtons()
      setTimeout(() => setIsScrolling(false), 150)
    }

    container.addEventListener('scroll', handleScroll)
    checkScrollButtons()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2 relative overflow-hidden`}>
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
            <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl">
              <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Action Items</h2>
              <p className={`text-sm ${theme.textSecondary}`}>Urgent tasks requiring attention</p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1">
              {actionItems.length} items
            </Badge>
            {actionItems.length > 3 && (
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 relative z-10">
        {actionItems.length > 0 ? (
          <div className="relative">
            {/* Scroll buttons */}
            {canScrollLeft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 shadow-lg rounded-full w-8 h-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            
            {canScrollRight && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-2 shadow-lg rounded-full w-8 h-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {/* Horizontal scrolling container */}
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {actionItems.map((item) => {
                const Icon = item.icon
                const priorityColors = getPriorityColor(item.priority)
                
                return (
                  <Link key={item.id} href={item.href}>
                    <div 
                      className={`${theme.card} ${theme.shadow} rounded-2xl p-4 border-2 ${priorityColors.border} hover:shadow-xl transition-all duration-300 cursor-pointer group min-w-[300px] sm:min-w-[320px] hover:scale-105 hover:${priorityColors.glow} hover:shadow-lg`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${priorityColors.bg} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`w-5 h-5 ${priorityColors.text}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold ${theme.text} text-sm sm:text-base mb-1 line-clamp-2`}>
                                {item.title}
                              </h3>
                              <p className={`text-xs sm:text-sm ${theme.textSecondary} mb-2 line-clamp-2`}>
                                {item.description}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 ml-2">
                              <Badge className={`text-xs ${priorityColors.badge} px-2 py-1`}>
                                {item.priority === 'urgent' ? 'Urgent' : item.priority === 'high' ? 'High' : 'Medium'}
                              </Badge>
                              <div className={`flex items-center gap-1 text-xs ${getUrgencyColor(item.urgency)}`}>
                                {getUrgencyIcon(item.urgency)}
                                <span>{getUrgencyLabel(item.urgency)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>{item.timeAgo}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${theme.textSecondary}`}>
                                {item.clientName}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-xs px-2 py-1 h-6"
                              >
                                {item.actionText}
                                <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Scroll indicators */}
            {actionItems.length > 3 && (
              <div className="flex justify-center gap-1 mt-4">
                {[...Array(Math.ceil(actionItems.length / 3))].map((_, index) => (
                  <div
                    key={index}
                    className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl w-fit mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className={`text-xl font-bold ${theme.text} mb-2`}>
              All caught up! 🎉
            </h3>
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              No urgent action items at the moment. Great job staying on top of everything!
            </p>
            <Button variant="outline" className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
