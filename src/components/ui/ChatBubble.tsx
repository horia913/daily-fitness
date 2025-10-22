'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Dumbbell, 
  Target, 
  Trophy, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  Copy,
  Reply,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Star,
  Flag,
  Eye,
  EyeOff
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: 'text' | 'workout_feedback' | 'nutrition_tip' | 'motivation' | 'question'
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    first_name: string
    last_name: string
    role: string
    avatar_url?: string
  }
  receiver?: {
    id: string
    first_name: string
    last_name: string
    role: string
    avatar_url?: string
  }
}

interface ChatBubbleProps {
  message: Message
  isOwnMessage: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
  showReadReceipt?: boolean
  onReply?: (message: Message) => void
  onCopy?: (content: string) => void
  onReact?: (messageId: string, reaction: string) => void
  onReport?: (messageId: string) => void
  className?: string
}

export default function ChatBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showTimestamp = true,
  showReadReceipt = true,
  onReply,
  onCopy,
  onReact,
  onReport,
  className
}: ChatBubbleProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [showActions, setShowActions] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'workout_feedback': return Dumbbell
      case 'nutrition_tip': return Target
      case 'motivation': return Trophy
      case 'question': return MessageCircle
      default: return MessageCircle
    }
  }

  const getMessageTypeColor = (type: string, isOwn: boolean) => {
    const baseColors = {
      workout_feedback: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500 dark:text-blue-400'
      },
      nutrition_tip: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-500 dark:text-green-400'
      },
      motivation: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-500 dark:text-yellow-400'
      },
      question: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        icon: 'text-purple-500 dark:text-purple-400'
      },
      default: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        icon: 'text-slate-500 dark:text-slate-400'
      }
    }

    return baseColors[type as keyof typeof baseColors] || baseColors.default
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const MessageTypeIcon = getMessageTypeIcon(message.message_type)
  const typeColors = getMessageTypeColor(message.message_type, isOwnMessage)

  return (
    <div 
      className={cn(
        "flex gap-3 group",
        isOwnMessage ? "justify-end" : "justify-start",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar for received messages */}
      {!isOwnMessage && showAvatar && (
        <div className="flex-shrink-0">
          <Avatar className="w-8 h-8 border-2 border-white dark:border-slate-800 shadow-sm">
            {message.sender?.avatar_url ? (
              <AvatarImage src={message.sender.avatar_url} alt={message.sender.first_name} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold">
                {message.sender?.first_name?.[0]}{message.sender?.last_name?.[0]}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      )}

      {/* Message bubble */}
      <div className={cn(
        "flex flex-col max-w-xs sm:max-w-sm lg:max-w-md",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Message content */}
        <div className={cn(
          "relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md",
          isOwnMessage 
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md" 
            : `${theme.card} ${theme.shadow} text-slate-800 dark:text-slate-200 rounded-bl-md border-2`,
          isHovered && "scale-105"
        )}>
          {/* Message type indicator */}
          {message.message_type !== 'text' && (
            <div className={cn(
              "flex items-center gap-2 mb-2 pb-2 border-b border-opacity-20",
              isOwnMessage ? "border-blue-200" : "border-slate-200 dark:border-slate-700"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                isOwnMessage ? "bg-blue-400/30" : typeColors.bg
              )}>
                <MessageTypeIcon className={cn(
                  "w-3 h-3",
                  isOwnMessage ? "text-blue-100" : typeColors.icon
                )} />
              </div>
              <span className={cn(
                "text-xs font-medium capitalize",
                isOwnMessage ? "text-blue-100" : typeColors.text
              )}>
                {message.message_type.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Message content by type */}
          {message.message_type === 'text' || message.message_type === 'question' ? (
            <p className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words",
              isOwnMessage ? "text-white" : theme.text
            )}>
              {message.content}
            </p>
          ) : null}

          {message.message_type === 'workout_feedback' && (
            <div className={cn(
              "rounded-xl p-3 border mt-1",
              isOwnMessage ? "border-blue-300/50" : typeColors.border,
              isOwnMessage ? "bg-blue-50/10" : "bg-blue-50 dark:bg-blue-900/10"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell className={cn("w-4 h-4", isOwnMessage ? "text-blue-100" : typeColors.icon)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wide", isOwnMessage ? "text-blue-100" : typeColors.text)}>
                  Workout Feedback
                </span>
              </div>
              <div className={cn("text-sm", isOwnMessage ? "text-white/90" : theme.text)}>
                {message.content}
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant={isOwnMessage ? "ghost" : "outline"} className="rounded-xl text-xs">
                  View Workout Details
                </Button>
              </div>
            </div>
          )}

          {message.message_type === 'nutrition_tip' && (
            <div className={cn(
              "rounded-xl p-3 border mt-1",
              isOwnMessage ? "border-green-300/50" : typeColors.border,
              isOwnMessage ? "bg-green-50/10" : "bg-green-50 dark:bg-green-900/10"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Target className={cn("w-4 h-4", isOwnMessage ? "text-green-100" : typeColors.icon)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wide", isOwnMessage ? "text-green-100" : typeColors.text)}>
                  Nutrition Tip
                </span>
              </div>
              <div className={cn("text-sm", isOwnMessage ? "text-white/90" : theme.text)}>
                {message.content}
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant={isOwnMessage ? "ghost" : "outline"} className="rounded-xl text-xs">
                  View Meal Plan
                </Button>
              </div>
            </div>
          )}

          {message.message_type === 'motivation' && (
            <div className={cn(
              "rounded-xl p-4 mt-1 bg-gradient-to-br",
              isOwnMessage 
                ? "from-yellow-400/20 to-orange-400/20 border border-yellow-300/40" 
                : "from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border " + typeColors.border
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className={cn("w-4 h-4", isOwnMessage ? "text-yellow-100" : typeColors.icon)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wide", isOwnMessage ? "text-yellow-100" : typeColors.text)}>
                  Motivation
                </span>
              </div>
              <div className={cn("text-base font-semibold", isOwnMessage ? "text-white" : theme.text)}>
                {message.content}
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant={isOwnMessage ? "ghost" : "outline"} className="rounded-xl text-xs">
                  Stay Motivated
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons (appear on hover) */}
          {isHovered && (
            <div className={cn(
              "absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              isOwnMessage ? "bg-blue-600/20 backdrop-blur-sm rounded-lg p-1" : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 shadow-sm"
            )}>
              {onCopy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(message.content)}
                  className="h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-slate-700/20"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              )}
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(message)}
                  className="h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-slate-700/20"
                >
                  <Reply className="w-3 h-3" />
                </Button>
              )}
              {onReact && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReact(message.id, 'like')}
                  className="h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-slate-700/20"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
              )}
              {onReport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReport(message.id)}
                  className="h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-slate-700/20"
                >
                  <Flag className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp and read receipt */}
        <div className={cn(
          "flex items-center gap-2 mt-1 px-1",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}>
          {showTimestamp && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">
                {formatTime(message.created_at)}
              </span>
            </div>
          )}
          
          {isOwnMessage && showReadReceipt && (
            <div className="flex items-center gap-1">
              {message.is_read ? (
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
              ) : (
                <CheckCircle className="w-3 h-3 text-slate-400" />
              )}
              <span className="text-xs text-slate-400">
                {message.is_read ? 'Read' : 'Sent'}
              </span>
            </div>
          )}
        </div>

        {/* Sender name for received messages */}
        {!isOwnMessage && message.sender && (
          <div className="mt-1 px-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {message.sender.first_name} {message.sender.last_name}
            </span>
          </div>
        )}
      </div>

      {/* Spacer for sent messages */}
      {isOwnMessage && <div className="flex-shrink-0 w-8"></div>}
    </div>
  )
}

// Specialized components for different message types
export function WorkoutFeedbackBubble(props: Omit<ChatBubbleProps, 'message'> & { message: Message }) {
  return (
    <div className="relative">
      <ChatBubble {...props} />
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          <Dumbbell className="w-3 h-3 mr-1" />
          Workout
        </Badge>
      </div>
    </div>
  )
}

export function NutritionTipBubble(props: Omit<ChatBubbleProps, 'message'> & { message: Message }) {
  return (
    <div className="relative">
      <ChatBubble {...props} />
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          <Target className="w-3 h-3 mr-1" />
          Nutrition
        </Badge>
      </div>
    </div>
  )
}

export function MotivationBubble(props: Omit<ChatBubbleProps, 'message'> & { message: Message }) {
  return (
    <div className="relative">
      <ChatBubble {...props} />
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          <Trophy className="w-3 h-3 mr-1" />
          Motivation
        </Badge>
      </div>
    </div>
  )
}

export function QuestionBubble(props: Omit<ChatBubbleProps, 'message'> & { message: Message }) {
  return (
    <div className="relative">
      <ChatBubble {...props} />
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
          <MessageCircle className="w-3 h-3 mr-1" />
          Question
        </Badge>
      </div>
    </div>
  )
}
