'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface TimeSlot {
  id?: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  recurring_pattern?: string
  recurring_end_date?: string
  notes?: string
}

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

export default function AvailabilitySettings() {
  const { isDark, performanceSettings } = useTheme()
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isRecurring, setIsRecurring] = useState(true)

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('coach_time_slots')
        .select('*')
        .eq('coach_id', user.id)
        .order('date')
        .order('start_time')

      if (error) throw error
      
      console.log('Loaded time slots:', data)
      setTimeSlots(data || [])
    } catch (error) {
      console.error('Error loading availability:', error)
      setMessage({ type: 'error', text: 'Failed to load availability settings' })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format date in local timezone as YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const addTimeSlot = (dayOfWeek: number) => {
    const today = new Date()
    
    // Calculate the next occurrence of the specified day of week
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const targetDay = dayOfWeek // The day we want (0 = Monday in our array, but we need to adjust)
    
    // Convert our array index (0=Monday) to JavaScript day (1=Monday)
    const jsTargetDay = targetDay === 6 ? 0 : targetDay + 1 // Sunday is 0 in JS, 6 in our array
    
    // Calculate days until next occurrence
    let daysUntilNext = jsTargetDay - currentDay
    if (daysUntilNext <= 0) {
      daysUntilNext += 7 // If the day already passed this week, get next week
    }
    
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + daysUntilNext)
    
    const newSlot: TimeSlot = {
      date: formatLocalDate(targetDate),
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: true,
      recurring_pattern: isRecurring ? 'weekly' : undefined,
      recurring_end_date: isRecurring ? formatLocalDate(new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)) : undefined
    }
    setTimeSlots([...timeSlots, newSlot])
  }

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: unknown) => {
    const updated = [...timeSlots]
    updated[index] = { ...updated[index], [field]: value }
    setTimeSlots(updated)
  }

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  const saveAvailability = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'User not authenticated' })
        setSaving(false)
        return
      }

      console.log('Saving availability for coach:', user.id)
      console.log('Time slots to save:', timeSlots)

      // Delete existing slots for this coach
      const { error: deleteError } = await supabase
        .from('coach_time_slots')
        .delete()
        .eq('coach_id', user.id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw deleteError
      }

      // Insert new slots with coach_id
      if (timeSlots.length > 0) {
        const slotsWithCoachId = timeSlots.map(slot => ({
          ...slot,
          coach_id: user.id
        }))

        console.log('Inserting slots:', slotsWithCoachId)

        const { data, error: insertError } = await supabase
          .from('coach_time_slots')
          .insert(slotsWithCoachId)
          .select()

        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }

        console.log('Inserted data:', data)
      }

      setMessage({ type: 'success', text: 'Availability settings saved successfully!' })
      loadAvailability() // Reload to get IDs from database
    } catch (error: unknown) {
      console.error('Error saving availability:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessage({ type: 'error', text: `Failed to save: ${errorMessage}` })
    } finally {
      setSaving(false)
    }
  }

  const getSlotsForDay = (dayOfWeek: number) => {
    return timeSlots.filter(slot => {
      // Parse date in local timezone to avoid off-by-one errors
      const [year, month, day] = slot.date.split('-').map(Number)
      const slotDate = new Date(year, month - 1, day)
      const jsDay = slotDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      // Convert our array index (0=Monday) to JavaScript day (1=Monday)
      const jsTargetDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1
      
      return jsDay === jsTargetDay
    })
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div style={{ 
          backgroundColor: isDark ? '#0A0A0A' : '#E8E9F3',
          backgroundImage: isDark 
            ? 'linear-gradient(to bottom right, #0A0A0A, #1A1A1A)' 
            : 'linear-gradient(to bottom right, #E8E9F3, #F5F5FF)',
          minHeight: '100vh',
          padding: '24px 20px',
          paddingBottom: '100px'
        }}>
          <div className="max-w-4xl mx-auto">
            <div style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '80px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid transparent',
                borderTopColor: '#6C5CE7',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
              <p style={{ 
                marginTop: '16px', 
                fontSize: '14px',
                fontWeight: '500',
                color: isDark ? '#9CA3AF' : '#6B7280'
              }}>Loading availability settings...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div style={{ 
        backgroundColor: isDark ? '#0A0A0A' : '#E8E9F3',
        backgroundImage: isDark 
          ? 'linear-gradient(to bottom right, #0A0A0A, #1A1A1A)' 
          : 'linear-gradient(to bottom right, #E8E9F3, #F5F5FF)',
        minHeight: '100vh',
        padding: '24px 20px',
        paddingBottom: '100px'
      }}>
        <div className="max-w-4xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '18px', 
                background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <Clock style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '32px', 
                  fontWeight: '800', 
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  margin: 0,
                  lineHeight: '1.2'
                }}>Availability Settings</h1>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '400', 
                  color: isDark ? '#D1D5DB' : '#6B7280',
                  margin: 0
                }}>Set your availability for client session bookings</p>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div style={{ 
              backgroundColor: message.type === 'success' 
                ? (isDark ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4')
                : (isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2'),
              borderRadius: '24px',
              padding: '24px',
              border: message.type === 'success'
                ? `2px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0'}`
                : `2px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA'}`,
              boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#10B981' }} />
                ) : (
                  <XCircle style={{ width: '20px', height: '20px', color: '#EF4444' }} />
                )}
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: message.type === 'success' 
                    ? (isDark ? '#6EE7B7' : '#047857') 
                    : (isDark ? '#FCA5A5' : '#B91C1C'),
                  margin: 0
                }}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Recurring Toggle */}
          <div style={{ 
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
            borderRadius: '24px',
            padding: '24px',
            border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`,
            boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ 
                  padding: '12px',
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  borderRadius: '16px'
                }}>
                  <Clock style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: isDark ? '#93C5FD' : '#1E3A8A',
                    margin: 0
                  }}>Recurring Availability</h3>
                  <p style={{ 
                    fontSize: '14px', 
                    fontWeight: '400', 
                    color: isDark ? '#93C5FD' : '#3B82F6',
                    margin: 0
                  }}>Set weekly recurring time slots</p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: isDark ? '#93C5FD' : '#1E3A8A'
                }}>
                  {isRecurring ? 'Weekly Recurring' : 'One-time Slots'}
                </span>
              </label>
            </div>
          </div>

          {/* Availability Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {daysOfWeek.map((day, dayIndex) => {
              const daySlots = getSlotsForDay(dayIndex)
              return (
                <div key={dayIndex} style={{ 
                  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                  borderRadius: '24px',
                  padding: '0',
                  border: `2px solid ${isDark ? '#333333' : '#E5E7EB'}`,
                  boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '20px 24px' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div style={{ 
                          padding: '12px',
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                          borderRadius: '16px',
                          flexShrink: 0
                        }}>
                          <Calendar style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                        </div>
                        <div className="min-w-0">
                          <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: '700', 
                            color: isDark ? '#FFFFFF' : '#1A1A1A',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>{day}</h3>
                          <span style={{ 
                            fontSize: '12px',
                            fontWeight: '500',
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            padding: '2px 8px',
                            border: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
                            borderRadius: '12px',
                            display: 'inline-block',
                            marginTop: '4px'
                          }}>
                            {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => addTimeSlot(dayIndex)}
                        style={{ 
                          background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                          color: '#FFFFFF',
                          borderRadius: '16px',
                          padding: '10px 20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Plus style={{ width: '16px', height: '16px' }} />
                        <span className="hidden sm:inline">Add Slot</span>
                        <span className="sm:hidden">Add</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '0 24px 24px 24px' }}>
                    {daySlots.length === 0 ? (
                      <p style={{ 
                        fontSize: '14px',
                        fontWeight: '400',
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        textAlign: 'center',
                        padding: '16px 0'
                      }}>
                        No availability set for {day}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {daySlots.map((slot) => {
                          const globalIndex = timeSlots.findIndex(s => s === slot)
                          return (
                            <div key={globalIndex} style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '12px', 
                              padding: '16px',
                              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : '#F9FAFB',
                              borderRadius: '16px',
                              border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`
                            }}>
                              {/* Date Input */}
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <div className="flex-1 relative">
                                  <input
                                    type="date"
                                    value={slot.date}
                                    onChange={(e) => updateTimeSlot(globalIndex, 'date', e.target.value)}
                                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 w-full text-sm opacity-0 absolute inset-0"
                                  />
                                  <div className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm pointer-events-none">
                                    {new Date(slot.date).toLocaleDateString('en-GB', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: 'numeric' 
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Time Inputs */}
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                <div className="flex items-center gap-1 flex-1">
                                  <select
                                    value={slot.start_time.split(':')[0]}
                                    onChange={(e) => {
                                      const minutes = slot.start_time.split(':')[1]
                                      updateTimeSlot(globalIndex, 'start_time', `${e.target.value}:${minutes}:00`)
                                    }}
                                    className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm flex-1"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                                      <option key={hour} value={hour}>{hour}</option>
                                    ))}
                                  </select>
                                  <span className="text-slate-500">:</span>
                                  <select
                                    value={slot.start_time.split(':')[1]}
                                    onChange={(e) => {
                                      const hours = slot.start_time.split(':')[0]
                                      updateTimeSlot(globalIndex, 'start_time', `${hours}:${e.target.value}:00`)
                                    }}
                                    className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm flex-1"
                                  >
                                    {['00', '15', '30', '45'].map(min => (
                                      <option key={min} value={min}>{min}</option>
                                    ))}
                                  </select>
                                </div>
                                <span className="text-slate-500 text-sm">-</span>
                                <div className="flex items-center gap-1 flex-1">
                                  <select
                                    value={slot.end_time.split(':')[0]}
                                    onChange={(e) => {
                                      const minutes = slot.end_time.split(':')[1]
                                      updateTimeSlot(globalIndex, 'end_time', `${e.target.value}:${minutes}:00`)
                                    }}
                                    className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm flex-1"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                                      <option key={hour} value={hour}>{hour}</option>
                                    ))}
                                  </select>
                                  <span className="text-slate-500">:</span>
                                  <select
                                    value={slot.end_time.split(':')[1]}
                                    onChange={(e) => {
                                      const hours = slot.end_time.split(':')[0]
                                      updateTimeSlot(globalIndex, 'end_time', `${hours}:${e.target.value}:00`)
                                    }}
                                    className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm flex-1"
                                  >
                                    {['00', '15', '30', '45'].map(min => (
                                      <option key={min} value={min}>{min}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              {/* Availability and Remove */}
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={slot.is_available}
                                    onChange={(e) => updateTimeSlot(globalIndex, 'is_available', e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                  <span style={{ 
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: isDark ? '#D1D5DB' : '#374151'
                                  }}>Available</span>
                                </label>
                                <button
                                  onClick={() => removeTimeSlot(globalIndex)}
                                  style={{ 
                                    backgroundColor: 'transparent',
                                    color: '#EF4444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Trash2 style={{ width: '16px', height: '16px' }} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Save Button */}
          <div className="flex justify-center pb-6">
            <button
              onClick={saveAvailability}
              disabled={saving || timeSlots.length === 0}
              style={{ 
                background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                color: '#FFFFFF',
                borderRadius: '20px',
                padding: '20px 48px',
                fontSize: '18px',
                fontWeight: '700',
                border: 'none',
                cursor: saving || timeSlots.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                opacity: saving || timeSlots.length === 0 ? 0.5 : 1,
                transform: 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              {saving ? (
                <>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    border: '2px solid transparent',
                    borderTopColor: '#FFFFFF',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save style={{ width: '24px', height: '24px' }} />
                  Save Availability to Database
                </>
              )}
            </button>
          </div>

          {timeSlots.length === 0 && (
            <div style={{ 
              backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : '#FFF7ED',
              borderRadius: '24px',
              padding: '24px',
              border: `2px solid ${isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA'}`,
              boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}>
              <div className="flex items-start gap-3">
                <div style={{ 
                  padding: '12px',
                  backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFEDD5',
                  borderRadius: '16px'
                }}>
                  <AlertCircle style={{ width: '20px', height: '20px', color: '#F97316' }} />
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isDark ? '#FED7AA' : '#9A3412',
                    marginBottom: '8px'
                  }}>No time slots added yet</h3>
                  <p style={{ 
                    fontSize: '14px',
                    fontWeight: '400',
                    color: isDark ? '#FDBA74' : '#C2410C'
                  }}>
                    Click the &ldquo;Add&rdquo; button on any day to create your first availability slot. Don&rsquo;t forget to save!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div style={{ 
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
            borderRadius: '24px',
            padding: '24px',
            border: `2px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}`,
            boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div className="flex items-start gap-3">
              <div style={{ 
                padding: '12px',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                borderRadius: '16px'
              }}>
                <Clock style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isDark ? '#93C5FD' : '#1E3A8A',
                  marginBottom: '8px'
                }}>How it works</h3>
                <ul style={{ 
                  fontSize: '14px',
                  fontWeight: '400',
                  color: isDark ? '#93C5FD' : '#3B82F6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingLeft: 0,
                  listStyle: 'none'
                }}>
                  <li>• Set your available time slots for each day of the week</li>
                  <li>• Clients can book sessions only during your available hours</li>
                  <li>• You can temporarily disable slots by unchecking &ldquo;Available&rdquo;</li>
                  <li>• Changes are saved automatically when you click &ldquo;Save&rdquo;</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
