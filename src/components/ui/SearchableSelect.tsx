'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { useTheme } from '@/contexts/ThemeContext'

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  items: Array<{ id: string; name: string; description?: string }>
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Search and select...",
  className,
  items,
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const selectedItem = items.find(item => item.id === value)

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    
    const query = searchQuery.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    )
  }, [items, searchQuery])

  const handleSelect = (itemId: string) => {
    onValueChange(itemId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onValueChange('')
    setSearchQuery('')
  }

  // Prevent scroll events from bubbling up when dropdown is open
  React.useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when dropdown is open
      document.body.style.overflow = 'hidden'
      
      // Prevent wheel events from scrolling the background, but allow dropdown scrolling
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as Element
        // Only prevent if the event is not targeting the dropdown content
        if (!target.closest('[data-dropdown-content]')) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Prevent touch events from scrolling the background, but allow dropdown scrolling
      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as Element
        // Only prevent if the event is not targeting the dropdown content
        if (!target.closest('[data-dropdown-content]')) {
          e.preventDefault()
          e.stopPropagation()
        }
      }

      // Add event listeners to prevent background scrolling
      document.addEventListener('wheel', handleWheel, { passive: false, capture: true })
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
      
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('wheel', handleWheel, { capture: true })
        document.removeEventListener('touchmove', handleTouchMove, { capture: true })
      }
    }
  }, [isOpen])

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-between h-8 rounded-lg text-sm",
          "border-slate-200 dark:border-slate-600",
          "hover:bg-slate-50 dark:hover:bg-slate-700",
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          !selectedItem && "text-slate-500 dark:text-slate-400"
        )}
      >
        <span className="truncate">
          {selectedItem ? selectedItem.name : placeholder}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {selectedItem && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </div>
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div 
            className={cn(
              "absolute top-full left-0 right-0 z-[9999] mt-1",
              "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600",
              "rounded-lg shadow-lg max-h-80 overflow-hidden"
            )}
            data-dropdown-content
          >
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-600">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm rounded-lg border-slate-200 dark:border-slate-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      "flex items-center justify-between",
                      value === item.id && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {value === item.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                  {searchQuery ? 'No exercises found' : 'No exercises available'}
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredItems.length > 0 && (
              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-600">
                {filteredItems.length} exercise{filteredItems.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
