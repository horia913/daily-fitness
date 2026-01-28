'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  showHeader?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  actions?: React.ReactNode
  gradientFrame?: boolean
}

export default function ResponsiveModal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon,
  showHeader = true,
  maxWidth = '5xl',
  actions,
  gradientFrame = false
}: ResponsiveModalProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const maxWidthMap = {
    'sm': '24rem',
    'md': '28rem',
    'lg': '32rem',
    'xl': '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '80rem'
  }

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 ${isDark ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme={isDark ? 'dark' : 'light'}
    >
      {gradientFrame ? (
        <div className="rounded-3xl p-[1px] bg-blue-200 dark:bg-blue-800 shadow-2xl">
          <div 
            className={`relative ${theme.card} fc-glass fc-card shadow-2xl rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
            style={{
              animation: 'modalSlideIn 0.3s ease-out',
              maxWidth: `min(95vw, ${maxWidthMap[maxWidth]})`,
              height: 'min(88vh, calc(100vh - 4rem))',
              maxHeight: 'min(88vh, calc(100vh - 4rem))'
            }}
          >
        {/* Header */}
        {showHeader && (
          <div className={`sticky top-0 ${theme.card} fc-glass fc-card border-b ${theme.border} px-6 py-5 rounded-t-3xl flex-shrink-0`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {icon && (
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-purple-100 to-orange-100'}`} style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                  </div>
                )}
                <div>
                  {title && (
                    <h2 className={`text-2xl font-bold ${theme.text}`} style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className={`text-sm ${theme.textSecondary} mt-1`} style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                style={{ padding: '8px', borderRadius: '12px', backgroundColor: 'transparent', color: '#6B7280' }}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer Actions */}
        {actions && (
          <div className={`flex-shrink-0 ${theme.card} fc-glass fc-card border-t ${theme.border} px-6 py-4 rounded-b-3xl`}>
            {actions}
          </div>
        )}
          </div>
        </div>
      ) : (
        <div 
          className={`relative ${theme.card} fc-glass fc-card shadow-2xl rounded-3xl border ${theme.border} w-full flex flex-col transform transition-all duration-300 ease-out overflow-hidden`}
          style={{
            animation: 'modalSlideIn 0.3s ease-out',
            maxWidth: `min(95vw, ${maxWidthMap[maxWidth]})`,
            height: 'min(88vh, calc(100vh - 4rem))',
            maxHeight: 'min(88vh, calc(100vh - 4rem))'
          }}
        >
          {/* Header */}
          {showHeader && (
            <div className={`sticky top-0 ${theme.card} fc-glass fc-card border-b ${theme.border} px-6 py-5 rounded-t-3xl flex-shrink-0`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {icon && (
                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-purple-100 to-orange-100'}`} style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {icon}
                    </div>
                  )}
                  <div>
                    {title && (
                      <h2 className={`text-2xl font-bold ${theme.text}`} style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className={`text-sm ${theme.textSecondary} mt-1`} style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280' }}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className={`p-2 rounded-xl transition-all duration-200 ${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                  style={{ padding: '8px', borderRadius: '12px', backgroundColor: 'transparent', color: '#6B7280' }}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>

          {/* Footer Actions */}
          {actions && (
            <div className={`flex-shrink-0 ${theme.card} fc-glass fc-card border-t ${theme.border} px-6 py-4 rounded-b-3xl`}>
              {actions}
            </div>
          )}
        </div>
      )}

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

