'use client'

import { Trophy, Calendar, Flame, Target } from 'lucide-react'
import { PersonalRecord, formatRecordDisplay, getRecordType } from '@/lib/personalRecords'

interface TrophyRoomProps {
  personalRecords: PersonalRecord[]
  loading?: boolean
}

export function TrophyRoom({ personalRecords, loading = false }: TrophyRoomProps) {
  if (loading) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-5 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Trophy Room
              </span>
              <div className="text-lg font-semibold fc-text-primary mt-2">
                Personal Records
              </div>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-[color:var(--fc-glass-border)] rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (personalRecords.length === 0) {
    return (
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-5 border-b border-[color:var(--fc-glass-border)]">
          <div className="flex items-center gap-3">
            <div className="fc-icon-tile fc-icon-workouts">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                Trophy Room
              </span>
              <div className="text-lg font-semibold fc-text-primary mt-2">
                Personal Records
              </div>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="text-center py-8">
            <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold fc-text-primary mb-2">No Records Yet</h3>
            <p className="fc-text-subtle">
              Complete some workouts to start building your personal records!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="p-5 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Trophy Room
            </span>
            <div className="text-lg font-semibold fc-text-primary mt-2">
              Personal Records
            </div>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalRecords.map((record) => {
            const recordType = getRecordType(record.weight, record.reps)
            const recordDisplay = formatRecordDisplay(record.weight, record.reps)
            
            return (
              <div 
                key={record.id}
                className={`relative overflow-hidden transition-all fc-hover-rise fc-glass fc-card border border-[color:var(--fc-glass-border)] ${
                  record.isRecent ? 'ring-1 ring-[color:var(--fc-domain-workouts)]' : ''
                }`}
              >
                {record.isRecent && (
                  <div className="absolute top-2 right-2">
                    <span className="fc-pill fc-pill-glass fc-text-warning text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      New!
                    </span>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg fc-glass-soft border border-[color:var(--fc-glass-border)] fc-text-workouts">
                      <Trophy className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold fc-text-primary truncate">
                        {record.exerciseName}
                      </h3>
                      
                      <div className="mt-1">
                        <p className="text-lg font-bold fc-text-primary">
                          {recordDisplay}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`fc-pill fc-pill-glass text-xs ${
                            recordType.type === 'power' 
                              ? 'fc-text-error'
                              : recordType.type === 'endurance'
                              ? 'fc-text-success'
                              : 'fc-text-workouts'
                          }`}>
                            {recordType.label}
                          </span>
                          
                          <div className="flex items-center gap-1 text-xs fc-text-subtle">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(record.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {personalRecords.length > 0 && (
          <div className="mt-4 p-3 fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-lg">
            <div className="flex items-center gap-2 text-sm fc-text-subtle">
              <Target className="w-4 h-4" />
              <span className="font-medium">
                {personalRecords.filter(r => r.isRecent).length} new record(s) this month!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
