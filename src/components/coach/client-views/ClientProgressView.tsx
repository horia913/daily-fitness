'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  TrendingUp,
  Camera,
  Scale,
  Ruler,
  Calendar
} from 'lucide-react'

interface ClientProgressViewProps {
  clientId: string
}

interface CheckIn {
  id: string
  created_at: string
  weight?: number
  bodyFat?: number
  muscleMass?: number
  photos: string[]
  measurements: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    legs?: number
  }
}

export default function ClientProgressView({ clientId }: ClientProgressViewProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCheckIns()
  }, [clientId])

  const loadCheckIns = async () => {
    try {
      // Load from localStorage for now (will integrate with database later)
      const stored = localStorage.getItem(`checkIns_${clientId}`)
      if (stored) {
        setCheckIns(JSON.parse(stored))
      } else {
        setCheckIns([])
      }
    } catch (error) {
      console.error('Error loading check-ins:', error)
      setCheckIns([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse">
            <div className={`${theme.card} h-40`} style={{ borderRadius: '24px', padding: '24px' }}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-[1px] bg-gradient-to-r from-orange-500 to-amber-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>{checkIns.length}</p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Check-Ins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-indigo-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>
                  {checkIns.length > 0 && checkIns[0].weight ? `${checkIns[0].weight}kg` : '-'}
                </p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Current Weight</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-[1px] bg-gradient-to-r from-green-500 to-emerald-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '16px' }}>
              <div className="text-center">
                <p className={`${theme.text}`} style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.1' }}>
                  {checkIns.length > 1 && checkIns[0].weight && checkIns[checkIns.length - 1].weight
                    ? `${(checkIns[checkIns.length - 1].weight - checkIns[0].weight).toFixed(1)}kg`
                    : '-'}
                </p>
                <p className={`${theme.textSecondary}`} style={{ fontSize: '14px', fontWeight: '400' }}>Total Change</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-Ins List */}
      <div className="space-y-4">
        {checkIns.length === 0 ? (
          <Card className={`${theme.card} border-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
            <CardContent className="text-center" style={{ padding: '48px 24px' }}>
              <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className={`${theme.text} mb-2`} style={{ fontSize: '20px', fontWeight: '700' }}>
                No Check-Ins Yet
              </h3>
              <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>
                This client hasn't submitted any check-ins yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          checkIns.map((checkIn, index) => (
            <div key={checkIn.id} className="p-[1px] bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <Card className={`${theme.card} border-0`} style={{ borderRadius: '24px' }}>
                <CardContent style={{ padding: '20px' }}>
                  <div className="flex items-start gap-4">
                    {/* Date Badge */}
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md" style={{ width: '48px', height: '48px', borderRadius: '16px' }}>
                      <Calendar className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>
                          Check-In #{checkIns.length - index}
                        </h4>
                        <span className={`text-sm ${theme.textSecondary}`}>
                          {new Date(checkIn.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {checkIn.weight && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30" style={{ padding: '12px', borderRadius: '16px' }}>
                            <Scale className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
                            <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>{checkIn.weight}kg</p>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>Weight</p>
                          </div>
                        )}

                        {checkIn.bodyFat && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30" style={{ padding: '12px', borderRadius: '16px' }}>
                            <TrendingUp className="w-4 h-4 mb-1 text-orange-600 dark:text-orange-400" />
                            <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>{checkIn.bodyFat}%</p>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>Body Fat</p>
                          </div>
                        )}

                        {checkIn.muscleMass && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30" style={{ padding: '12px', borderRadius: '16px' }}>
                            <TrendingUp className="w-4 h-4 mb-1 text-green-600 dark:text-green-400" />
                            <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>{checkIn.muscleMass}kg</p>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>Muscle</p>
                          </div>
                        )}

                        {checkIn.photos && checkIn.photos.length > 0 && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30" style={{ padding: '12px', borderRadius: '16px' }}>
                            <Camera className="w-4 h-4 mb-1 text-purple-600 dark:text-purple-400" />
                            <p className="text-slate-800 dark:text-slate-200" style={{ fontSize: '14px', fontWeight: '600' }}>{checkIn.photos.length}</p>
                            <p className="text-slate-600 dark:text-slate-400" style={{ fontSize: '12px' }}>Photos</p>
                          </div>
                        )}
                      </div>

                      {/* Measurements */}
                      {checkIn.measurements && Object.keys(checkIn.measurements).length > 0 && (
                        <div className="mt-3 bg-slate-50 dark:bg-slate-800/50" style={{ padding: '12px', borderRadius: '16px' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Ruler className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-slate-700 dark:text-slate-300" style={{ fontSize: '14px', fontWeight: '600' }}>Measurements</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            {checkIn.measurements.chest && (
                              <span className={theme.textSecondary}>Chest: {checkIn.measurements.chest}cm</span>
                            )}
                            {checkIn.measurements.waist && (
                              <span className={theme.textSecondary}>Waist: {checkIn.measurements.waist}cm</span>
                            )}
                            {checkIn.measurements.hips && (
                              <span className={theme.textSecondary}>Hips: {checkIn.measurements.hips}cm</span>
                            )}
                            {checkIn.measurements.arms && (
                              <span className={theme.textSecondary}>Arms: {checkIn.measurements.arms}cm</span>
                            )}
                            {checkIn.measurements.legs && (
                              <span className={theme.textSecondary}>Legs: {checkIn.measurements.legs}cm</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

