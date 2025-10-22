'use client'

import { useState } from 'react'
import { UserPlus, Clock, Check, X, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'

export default function NewClientRequests() {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const [requests, setRequests] = useState([
    {
      id: 1,
      name: 'Alex Johnson',
      email: 'alex.johnson@email.com',
      message: 'Interested in personal training for weight loss',
      timeAgo: '2 hours ago',
      status: 'pending'
    },
    {
      id: 2,
      name: 'Maria Garcia',
      email: 'maria.garcia@email.com',
      message: 'Looking for nutrition coaching and meal planning',
      timeAgo: '4 hours ago',
      status: 'pending'
    },
    {
      id: 3,
      name: 'David Chen',
      email: 'david.chen@email.com',
      message: 'Want to build muscle and improve strength',
      timeAgo: '1 day ago',
      status: 'pending'
    }
  ])

  const handleAccept = (id: number) => {
    setRequests(prev => prev.filter(req => req.id !== id))
    // Here you would typically make an API call to accept the client
  }

  const handleDecline = (id: number) => {
    setRequests(prev => prev.filter(req => req.id !== id))
    // Here you would typically make an API call to decline the client
  }

  if (requests.length === 0) {
    return null // Don't show the widget if there are no requests
  }

  return (
    <Card className={`${theme.card} ${theme.shadow} rounded-2xl border-2`}>
      <CardHeader className="pb-4">
        <CardTitle className={`flex items-center gap-2 ${theme.text}`}>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          New Client Requests
          <Badge className="bg-blue-500 text-white ml-auto">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className={`${theme.card} ${theme.shadow} rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${theme.text} text-sm`}>
                      {request.name}
                    </h3>
                    <Badge className="bg-blue-500 text-white text-xs">
                      New
                    </Badge>
                  </div>
                  
                  <p className={`text-sm ${theme.textSecondary} mb-2`}>
                    {request.email}
                  </p>
                  
                  <p className={`text-sm ${theme.textSecondary} mb-3`}>
                    {request.message}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <Clock className="w-3 h-3" />
                    <span>{request.timeAgo}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => handleDecline(request.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button 
            variant="outline" 
            className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Requests
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
