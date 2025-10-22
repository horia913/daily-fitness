'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, Flame, Target } from 'lucide-react'
import { PersonalRecord, formatRecordDisplay, getRecordType } from '@/lib/personalRecords'

interface TrophyRoomProps {
  personalRecords: PersonalRecord[]
  loading?: boolean
}

export function TrophyRoom({ personalRecords, loading = false }: TrophyRoomProps) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Trophy className="w-6 h-6" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-slate-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (personalRecords.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Trophy className="w-6 h-6" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-accent/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Records Yet</h3>
            <p className="text-slate-600">
              Complete some workouts to start building your personal records!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-accent">
          <Trophy className="w-6 h-6" />
          Personal Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalRecords.map((record) => {
            const recordType = getRecordType(record.weight, record.reps)
            const recordDisplay = formatRecordDisplay(record.weight, record.reps)
            
            return (
              <Card 
                key={record.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  record.isRecent 
                    ? 'bg-gradient-to-br from-accent/20 to-accent/10 border-accent/30' 
                    : 'bg-white border-slate-200'
                }`}
              >
                {record.isRecent && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-accent text-white text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      New!
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      recordType.type === 'power' 
                        ? 'bg-red-100 text-red-600'
                        : recordType.type === 'endurance'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {record.exerciseName}
                      </h3>
                      
                      <div className="mt-1">
                        <p className="text-lg font-bold text-slate-900">
                          {recordDisplay}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              recordType.type === 'power' 
                                ? 'border-red-200 text-red-600'
                                : recordType.type === 'endurance'
                                ? 'border-green-200 text-green-600'
                                : 'border-blue-200 text-blue-600'
                            }`}
                          >
                            {recordType.label}
                          </Badge>
                          
                          <div className="flex items-center gap-1 text-xs text-slate-500">
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
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {personalRecords.length > 0 && (
          <div className="mt-4 p-3 bg-accent/10 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-accent">
              <Target className="w-4 h-4" />
              <span className="font-medium">
                {personalRecords.filter(r => r.isRecent).length} new record(s) this month!
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
