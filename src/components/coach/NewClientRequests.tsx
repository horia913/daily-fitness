'use client'

import { useState } from 'react'
import { UserPlus, Clock, Check, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewClientRequests() {
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
    <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
      <div className="pb-4 p-6 border-b border-[color:var(--fc-glass-border)]">
        <div className="flex items-center gap-3">
          <div className="fc-icon-tile fc-icon-workouts">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              New requests
            </span>
            <h3 className="text-lg font-semibold fc-text-primary mt-2">
              New Client Requests
            </h3>
          </div>
          <span className="ml-auto fc-pill fc-pill-glass fc-text-workouts text-xs">
            {requests.length}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className="fc-list-row rounded-2xl p-4 border border-[color:var(--fc-glass-border)] fc-glass-soft"
            >
              <div className="flex items-start gap-4">
                <div className="fc-icon-tile fc-icon-workouts">
                  <UserPlus className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold fc-text-primary text-sm">
                      {request.name}
                    </h3>
                    <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                      New
                    </span>
                  </div>
                  
                  <p className="text-sm fc-text-dim mb-2">
                    {request.email}
                  </p>
                  
                  <p className="text-sm fc-text-dim mb-3">
                    {request.message}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs fc-text-subtle mb-4">
                    <Clock className="w-3 h-3" />
                    <span>{request.timeAgo}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="fc-btn fc-btn-primary fc-press flex-1"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="fc-btn fc-btn-secondary fc-text-error"
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
        
        <div className="pt-4 border-t border-[color:var(--fc-glass-border)]">
          <Button 
            variant="outline" 
            className="w-full border-dashed fc-btn fc-btn-secondary"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            View All Requests
          </Button>
        </div>
      </div>
    </div>
  )
}
