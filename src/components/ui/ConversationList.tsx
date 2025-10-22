'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, 
  Search,
  Filter,
  Star,
  Pin,
  MoreHorizontal,
  Clock,
  Dumbbell,
  Target,
  Trophy,
  CheckCircle,
  Users,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  Phone,
  Video,
  Mail,
  Calendar,
  Activity,
  TrendingUp,
  Zap,
  Heart,
  Smile
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export interface Conversation {
  id: string
  participant_id: string
  participant_name: string
  participant_role: string
  participant_avatar?: string
  last_message?: {
    id: string
    content: string
    message_type: string
    created_at: string
    sender_id: string
  }
  unread_count: number
  updated_at: string
  is_pinned?: boolean
  is_starred?: boolean
  is_archived?: boolean
  is_online?: boolean
  last_seen?: string
}

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId?: string
  onSelectConversation: (conversation: Conversation) => void
  onNewConversation?: () => void
  onSearch?: (query: string) => void
  onFilter?: (filter: string) => void
  loading?: boolean
  emptyMessage?: string
  emptySubMessage?: string
  className?: string
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onSearch,
  onFilter,
  loading = false,
  emptyMessage = "No conversations yet",
  emptySubMessage = "Start a new conversation",
  className
}: ConversationListProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred' | 'pinned'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'workout_feedback': return Dumbbell
      case 'nutrition_tip': return Target
      case 'motivation': return Trophy
      case 'question': return MessageCircle
      default: return MessageCircle
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'workout_feedback': return 'text-blue-600 dark:text-blue-400'
      case 'nutrition_tip': return 'text-green-600 dark:text-green-400'
      case 'motivation': return 'text-yellow-600 dark:text-yellow-400'
      case 'question': return 'text-purple-600 dark:text-purple-400'
      default: return 'text-slate-500 dark:text-slate-400'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const matchesSearch = !searchQuery || 
      conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Type filter
    const matchesFilter = filterType === 'all' || 
      (filterType === 'unread' && conv.unread_count > 0) ||
      (filterType === 'starred' && conv.is_starred) ||
      (filterType === 'pinned' && conv.is_pinned)
    
    return matchesSearch && matchesFilter
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleFilter = (filter: string) => {
    setFilterType(filter as any)
    onFilter?.(filter)
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'All', icon: Users },
              { key: 'unread', label: 'Unread', icon: Eye },
              { key: 'starred', label: 'Starred', icon: Star },
              { key: 'pinned', label: 'Pinned', icon: Pin }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filterType === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilter(key)}
                className="rounded-xl whitespace-nowrap"
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => {
            const isSelected = selectedConversationId === conversation.participant_id
            const MessageTypeIcon = conversation.last_message ? getMessageTypeIcon(conversation.last_message.message_type) : MessageCircle
            const messageTypeColor = conversation.last_message ? getMessageTypeColor(conversation.last_message.message_type) : 'text-slate-500 dark:text-slate-400'
            
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected 
                    ? `${theme.card} ${theme.shadow} border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20` 
                    : `${theme.card} ${theme.shadow} border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:scale-105`,
                  conversation.unread_count > 0 && "ring-2 ring-blue-200 dark:ring-blue-800 ring-opacity-50"
                )}
                onClick={() => onSelectConversation(conversation)}
              >
                {/* Pinned/Starred Indicators */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {conversation.is_pinned && (
                    <Pin className="w-3 h-3 text-yellow-500 fill-current" />
                  )}
                  {conversation.is_starred && (
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  )}
                </div>

                <div className="flex items-start gap-3">
                  {/* Avatar with Online Status */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 border-2 border-white dark:border-slate-800 shadow-sm">
                      {conversation.participant_avatar ? (
                        <AvatarImage src={conversation.participant_avatar} alt={conversation.participant_name} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {conversation.participant_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Online Status Indicator */}
                    {conversation.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                    )}
                  </div>

                  {/* Conversation Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name and Unread Count */}
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "font-bold truncate",
                        conversation.unread_count > 0 ? "text-slate-900 dark:text-slate-100" : theme.text
                      )}>
                        {conversation.participant_name}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>

                    {/* Last Message */}
                    <div className="flex items-center gap-2 mb-2">
                      {conversation.last_message && (
                        <MessageTypeIcon className={cn("w-3 h-3 flex-shrink-0", messageTypeColor)} />
                      )}
                      <p className={cn(
                        "text-sm truncate",
                        conversation.unread_count > 0 ? "text-slate-700 dark:text-slate-300 font-medium" : theme.textSecondary
                      )}>
                        {conversation.last_message?.content || 'No messages yet'}
                      </p>
                    </div>

                    {/* Timestamp and Role */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {conversation.last_message ? formatTime(conversation.last_message.created_at) : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                          {conversation.participant_role}
                        </span>
                        {conversation.last_seen && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            • {formatTime(conversation.last_seen)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Menu (appears on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Unread Message Indicator */}
                {conversation.unread_count > 0 && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                )}
              </div>
            )
          })
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl w-fit mx-auto mb-6">
              <MessageCircle className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", theme.text)}>
              {emptyMessage}
            </h3>
            <p className={cn("text-sm mb-4", theme.textSecondary)}>
              {emptySubMessage}
            </p>
            {onNewConversation && (
              <Button 
                onClick={onNewConversation}
                className={`${theme.primary} ${theme.shadow} rounded-xl`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start Conversation
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {conversations.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Users className="w-4 h-4" />
              <span>{filteredConversations.length} conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </Button>
              {onNewConversation && (
                <Button 
                  onClick={onNewConversation}
                  variant="outline" 
                  size="sm"
                  className="rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Specialized components for different conversation types
export function PinnedConversationList(props: ConversationListProps) {
  return (
    <ConversationList 
      {...props} 
      conversations={props.conversations.filter(conv => conv.is_pinned)}
      emptyMessage="No pinned conversations"
      emptySubMessage="Pin important conversations for quick access"
    />
  )
}

export function UnreadConversationList(props: ConversationListProps) {
  return (
    <ConversationList 
      {...props} 
      conversations={props.conversations.filter(conv => conv.unread_count > 0)}
      emptyMessage="All caught up!"
      emptySubMessage="No unread messages at the moment"
    />
  )
}
