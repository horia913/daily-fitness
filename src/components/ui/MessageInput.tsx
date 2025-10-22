'use client'

import { useEffect, useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Paperclip, Mic, Image as ImageIcon, Send, Smile, Dumbbell, Target, Trophy, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

type MessageType = 'text' | 'workout_feedback' | 'nutrition_tip' | 'motivation' | 'question'

interface MessageInputProps {
  value: string
  onChange: (val: string) => void
  onSend: (type: MessageType) => void
  onAttachFile?: () => void
  onAttachImage?: () => void
  onRecordAudio?: () => void
  placeholder?: string
  defaultType?: MessageType
  role?: 'client' | 'coach'
  disabled?: boolean
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  onAttachFile,
  onAttachImage,
  onRecordAudio,
  placeholder = 'Type your message...',
  defaultType = 'text',
  role = 'client',
  disabled = false,
}: MessageInputProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [expanded, setExpanded] = useState(false)
  const [messageType, setMessageType] = useState<MessageType>(defaultType)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textarea up to a max height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const scrollHeight = el.scrollHeight
    el.style.height = Math.min(scrollHeight, 160) + 'px' // up to ~8 lines
  }, [value])

  const canSend = value.trim().length > 0 && !disabled

  const typeOptions: { key: MessageType; label: string; icon: any; color: string }[] = [
    { key: 'text', label: 'Text', icon: MessageCircle, color: 'text-slate-600' },
    { key: 'question', label: 'Question', icon: MessageCircle, color: 'text-purple-600' },
    { key: 'workout_feedback', label: 'Workout', icon: Dumbbell, color: 'text-blue-600' },
    { key: 'nutrition_tip', label: 'Nutrition', icon: Target, color: 'text-green-600' },
    { key: 'motivation', label: 'Motivation', icon: Trophy, color: 'text-yellow-600' },
  ]

  const CurrentIcon = typeOptions.find(t => t.key === messageType)?.icon || MessageCircle

  const handleSend = () => {
    if (!canSend) return
    onSend(messageType)
  }

  return (
    <div className={cn('w-full', disabled && 'opacity-60 pointer-events-none')}>
      <div className={cn('rounded-2xl border-2 p-3', theme.card, theme.shadow)}>
        {/* Type selector + textarea + actions */}
        <div className="flex gap-3 items-end">
          {/* Type badge */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn('flex items-center gap-2 rounded-xl px-2.5 py-1.5 border text-xs',
              'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm',
              'hover:bg-white dark:hover:bg-slate-800',
              'transition-colors',
            )}
          >
            <CurrentIcon className="w-3.5 h-3.5" />
            <span className="font-medium capitalize">{messageType.replace('_', ' ')}</span>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={1}
              className="min-h-[44px] max-h-40 resize-none rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 pr-24"
            />
            {/* Inline right icons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <Smile className="w-4 h-4 text-slate-500" />
              </Button>
              {onAttachImage && (
                <Button type="button" onClick={onAttachImage} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                </Button>
              )}
              {onAttachFile && (
                <Button type="button" onClick={onAttachFile} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </Button>
              )}
              {onRecordAudio && (
                <Button type="button" onClick={onRecordAudio} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Mic className="w-4 h-4 text-slate-500" />
                </Button>
              )}
            </div>
          </div>

          {/* Send */}
          <Button
            type="button"
            onClick={handleSend}
            size="icon"
            disabled={!canSend}
            className="h-12 w-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        {/* Expanded type selector row */}
        {expanded && (
          <div className="mt-3 flex flex-wrap gap-2">
            {typeOptions.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMessageType(key)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs transition-colors',
                  messageType === key
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', color)} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


