'use client'

import React from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface SimpleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showIcon?: boolean
  closeOnOverlayClick?: boolean
}

export default function SimpleModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  variant = 'default',
  size = 'md',
  showIcon = false,
  closeOnOverlayClick = true
}: SimpleModalProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          borderColor: 'border-green-200 dark:border-green-800',
          accentColor: 'text-green-600 dark:text-green-400'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          accentColor: 'text-yellow-600 dark:text-yellow-400'
        }
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-500',
          borderColor: 'border-red-200 dark:border-red-800',
          accentColor: 'text-red-600 dark:text-red-400'
        }
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          borderColor: 'border-blue-200 dark:border-blue-800',
          accentColor: 'text-blue-600 dark:text-blue-400'
        }
      default:
        return {
          icon: null,
          iconColor: '',
          borderColor: 'border-slate-200 dark:border-slate-700',
          accentColor: 'text-slate-600 dark:text-slate-400'
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      default:
        return 'max-w-md'
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()
  const IconComponent = variantStyles.icon

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={handleOverlayClick}
      data-theme={isDark ? 'dark' : 'light'}
    >
      <div 
        className={`relative w-full ${sizeStyles} max-h-[90vh] ${theme.card} ${theme.shadow} rounded-3xl border ${variantStyles.borderColor} flex flex-col transform transition-all duration-300 ease-out`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${variantStyles.borderColor} flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showIcon && IconComponent && (
                <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <IconComponent className={`w-5 h-5 ${variantStyles.iconColor}`} />
                </div>
              )}
              <h2 className={`text-xl font-bold ${theme.text}`}>{title}</h2>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
          <div className={`${theme.textSecondary} leading-relaxed`}>
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-5 border-t ${variantStyles.borderColor} flex-shrink-0`}>
            {footer}
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
