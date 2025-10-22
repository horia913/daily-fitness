'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { 
  CreditCard, 
  Plus, 
  Calendar,
  Check,
  X,
  AlertCircle,
  Package,
  Edit
} from 'lucide-react'

interface Clipcard {
  id: string
  clipcard_type: 'session' | 'monthly'
  sessions_total: number
  sessions_used: number
  sessions_remaining: number
  start_date: string
  end_date: string
  is_active: boolean
  price?: number
  created_at: string
}

interface ClientClipcards {
  clientId: string
  clientName: string
}

export default function ClientClipcards({ clientId, clientName }: ClientClipcards) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [clipcards, setClipcards] = useState<Clipcard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingClipcard, setEditingClipcard] = useState<Clipcard | null>(null)
  
  const [newClipcard, setNewClipcard] = useState({
    clipcard_type: 'session' as 'session' | 'monthly',
    sessions_total: 10,
    validity_days: 30,
    start_date: new Date().toISOString().split('T')[0],
    price: 0
  })

  useEffect(() => {
    loadClipcards()
  }, [clientId])

  const loadClipcards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clipcards')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClipcards(data || [])
    } catch (error) {
      console.error('Error loading clipcards:', error)
    } finally {
      setLoading(false)
    }
  }

  const createClipcard = async () => {
    try {
      setCreating(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const endDate = new Date(newClipcard.start_date)
      if (newClipcard.clipcard_type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else {
        endDate.setDate(endDate.getDate() + newClipcard.validity_days)
      }

      const { error } = await supabase
        .from('clipcards')
        .insert({
          coach_id: user.id,
          client_id: clientId,
          clipcard_type: newClipcard.clipcard_type,
          sessions_total: newClipcard.clipcard_type === 'monthly' ? 999 : newClipcard.sessions_total,
          sessions_used: 0,
          start_date: newClipcard.start_date,
          end_date: endDate.toISOString().split('T')[0],
          is_active: true
        })

      if (error) throw error

      alert('Clipcard created successfully!')
      setShowCreateModal(false)
      setNewClipcard({
        clipcard_type: 'session',
        sessions_total: 10,
        validity_days: 30,
        start_date: new Date().toISOString().split('T')[0],
        price: 0
      })
      loadClipcards()
    } catch (error: any) {
      console.error('Error creating clipcard:', error)
      alert(`Failed to create clipcard: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  const toggleClipcardStatus = async (clipcardId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clipcards')
        .update({ is_active: !currentStatus })
        .eq('id', clipcardId)

      if (error) throw error
      loadClipcards()
    } catch (error) {
      console.error('Error updating clipcard:', error)
    }
  }

  const editClipcard = async () => {
    if (!editingClipcard) return

    try {
      setEditing(true)
      const { error } = await supabase
        .from('clipcards')
        .update({
          clipcard_type: editingClipcard.clipcard_type,
          sessions_total: editingClipcard.sessions_total,
          sessions_used: editingClipcard.sessions_used,
          start_date: editingClipcard.start_date,
          end_date: editingClipcard.end_date,
          is_active: editingClipcard.is_active
        })
        .eq('id', editingClipcard.id)

      if (error) throw error

      setClipcards(prev => prev.map(clipcard => 
        clipcard.id === editingClipcard.id ? editingClipcard : clipcard
      ))

      setShowEditModal(false)
      setEditingClipcard(null)
    } catch (error) {
      console.error('Error updating clipcard:', error)
    } finally {
      setEditing(false)
    }
  }

  const handleEditClick = (clipcard: Clipcard) => {
    setEditingClipcard({ ...clipcard })
    setShowEditModal(true)
  }

  const getStatusColor = (clipcard: Clipcard) => {
    if (!clipcard.is_active) return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    if (clipcard.sessions_remaining === 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    if (new Date(clipcard.end_date) < new Date()) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  }

  const getStatusText = (clipcard: Clipcard) => {
    if (!clipcard.is_active) return 'Inactive'
    if (clipcard.clipcard_type === 'monthly') {
      if (new Date(clipcard.end_date) < new Date()) return 'Expired'
      return 'Active'
    }
    if (clipcard.sessions_remaining === 0) return 'Depleted'
    if (new Date(clipcard.end_date) < new Date()) return 'Expired'
    return 'Active'
  }

  const getRenewalInfo = (clipcard: Clipcard) => {
    if (clipcard.clipcard_type === 'monthly') {
      const endDate = new Date(clipcard.end_date)
      const today = new Date()
      const daysUntilRenewal = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilRenewal < 0) {
        return { text: 'Expired - Renewal needed', color: 'text-red-600 dark:text-red-400', urgent: true }
      } else if (daysUntilRenewal <= 7) {
        return { text: `Renews in ${daysUntilRenewal} days`, color: 'text-orange-600 dark:text-orange-400', urgent: true }
      } else {
        return { text: `Renews on ${endDate.toLocaleDateString('en-GB')}`, color: 'text-green-600 dark:text-green-400', urgent: false }
      }
    } else {
      if (clipcard.sessions_remaining === 0) {
        return { text: 'All sessions used', color: 'text-red-600 dark:text-red-400', urgent: true }
      } else if (clipcard.sessions_remaining <= 2) {
        return { text: `${clipcard.sessions_remaining} sessions left - renewal soon`, color: 'text-orange-600 dark:text-orange-400', urgent: true }
      } else {
        return { text: `${clipcard.sessions_remaining} sessions remaining`, color: 'text-green-600 dark:text-green-400', urgent: false }
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse" style={{ borderRadius: '24px' }}>
            <CardContent style={{ padding: '24px' }}>
              <div className="bg-slate-200 dark:bg-slate-700" style={{ height: '96px', borderRadius: '16px' }}></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`${theme.text}`} style={{ fontSize: '28px', fontWeight: '700' }}>ClipCards for {clientName}</h3>
          <p className={`${theme.textSecondary}`} style={{ fontSize: '14px' }}>Manage session credits and packages</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold shadow-lg"
          style={{ borderRadius: '20px', padding: '12px 24px' }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create ClipCard
        </Button>
      </div>

      {/* Clipcards List */}
      {clipcards.length === 0 ? (
        <Card className="border-2 border-dashed" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <CardContent className="text-center" style={{ padding: '48px 24px' }}>
            <div className="bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center mx-auto mb-4" style={{ width: '64px', height: '64px', borderRadius: '24px' }}>
              <CreditCard className="w-8 h-8 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className={`${theme.text} mb-2`} style={{ fontSize: '20px', fontWeight: '700' }}>No ClipCards Yet</h3>
            <p className={`${theme.textSecondary} mb-6`} style={{ fontSize: '14px' }}>
              Create a clipcard to allow this client to book sessions
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
              style={{ borderRadius: '20px', padding: '12px 24px' }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First ClipCard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clipcards.map((clipcard) => (
            <Card key={clipcard.id} className="border-2" style={{ borderRadius: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
              <CardContent style={{ padding: '24px' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Section - Icon and Details */}
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0" style={{ width: '56px', height: '56px', borderRadius: '18px' }}>
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className={`${theme.text}`} style={{ fontSize: '18px', fontWeight: '600' }}>
                          {clipcard.clipcard_type === 'monthly' ? 'Monthly Unlimited' : `${clipcard.sessions_total} Session Package`}
                        </h4>
                        <Badge className={getStatusColor(clipcard)}>
                          {getStatusText(clipcard)}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {clipcard.price ? clipcard.price.toFixed(2) : '0.00'} lei
                        </Badge>
                      </div>
                      
                      {/* Renewal Info */}
                      <div className={`mb-3 ${getRenewalInfo(clipcard).color}`} style={{ fontSize: '14px', fontWeight: '600' }}>
                        {getRenewalInfo(clipcard).urgent && '⚠️ '}
                        {getRenewalInfo(clipcard).text}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {clipcard.clipcard_type === 'session' && (
                          <>
                            <div>
                              <p className={`${theme.textSecondary}`} style={{ fontSize: '12px' }}>Remaining</p>
                              <p className={`${theme.text}`} style={{ fontSize: '14px', fontWeight: '600' }}>{clipcard.sessions_remaining}/{clipcard.sessions_total}</p>
                            </div>
                            <div>
                              <p className={`${theme.textSecondary}`} style={{ fontSize: '12px' }}>Used</p>
                              <p className={`${theme.text}`} style={{ fontSize: '14px', fontWeight: '600' }}>{clipcard.sessions_used}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className={`${theme.textSecondary}`} style={{ fontSize: '12px' }}>Start Date</p>
                          <p className={`${theme.text}`} style={{ fontSize: '14px', fontWeight: '600' }}>
                            {new Date(clipcard.start_date).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div>
                          <p className={`${theme.textSecondary}`} style={{ fontSize: '12px' }}>
                            {clipcard.clipcard_type === 'monthly' ? 'Renews' : 'Expires'}
                          </p>
                          <p className={`${theme.text}`} style={{ fontSize: '14px', fontWeight: '600' }}>
                            {new Date(clipcard.end_date).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleEditClick(clipcard)}
                      variant="outline"
                      style={{ borderRadius: '16px', padding: '10px 20px' }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => toggleClipcardStatus(clipcard.id, clipcard.is_active)}
                      variant="outline"
                      style={{ borderRadius: '16px', padding: '10px 20px' }}
                    >
                      {clipcard.is_active ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Clipcard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md" style={{ borderRadius: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)' }}>
            <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-600 text-white" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px' }}>
              <CardTitle className="flex items-center gap-3" style={{ fontSize: '20px', fontWeight: '700' }}>
                <CreditCard className="w-6 h-6" />
                Create New ClipCard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" style={{ padding: '24px' }}>
              {/* ClipCard Type */}
              <div>
                <Label>ClipCard Type</Label>
                <select
                  value={newClipcard.clipcard_type}
                  onChange={(e) => setNewClipcard({ 
                    ...newClipcard, 
                    clipcard_type: e.target.value as 'session' | 'monthly',
                    sessions_total: e.target.value === 'monthly' ? 999 : 10
                  })}
                  className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="session">Session-Based (Pay per session count)</option>
                  <option value="monthly">Monthly Subscription (Unlimited sessions)</option>
                </select>
              </div>

              {/* Conditional Fields based on Type */}
              {newClipcard.clipcard_type === 'session' ? (
                <>
                  <div>
                    <Label>Number of Sessions</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newClipcard.sessions_total}
                      onChange={(e) => setNewClipcard({ ...newClipcard, sessions_total: parseInt(e.target.value) || 1 })}
                      onFocus={(e) => e.target.select()}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Validity (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newClipcard.validity_days}
                      onChange={(e) => setNewClipcard({ ...newClipcard, validity_days: parseInt(e.target.value) || 30 })}
                      onFocus={(e) => e.target.select()}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Sessions must be used within this period
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Monthly Subscription:</strong> Unlimited sessions for 30 days from start date. Auto-renews monthly.
                  </p>
                </div>
              )}

              {/* Price */}
              <div>
                <Label>Price (lei)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={newClipcard.price}
                  onChange={(e) => setNewClipcard({ ...newClipcard, price: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="mt-2"
                  placeholder="0"
                />
              </div>

              {/* Start Date */}
              <div>
                <Label>Start Date</Label>
                <div className="relative mt-2">
                  <input
                    type="date"
                    value={newClipcard.start_date}
                    onChange={(e) => setNewClipcard({ ...newClipcard, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 opacity-0 absolute inset-0"
                  />
                  <div className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 pointer-events-none">
                    {new Date(newClipcard.start_date).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border">
                <h4 className="font-semibold mb-2">Summary:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Type:</strong> {newClipcard.clipcard_type === 'monthly' ? 'Monthly Unlimited' : `${newClipcard.sessions_total} Sessions`}</p>
                  <p><strong>Price:</strong> {newClipcard.price ? newClipcard.price.toFixed(0) : '0'} lei</p>
                  <p><strong>Valid Until:</strong> {(() => {
                    const endDate = new Date(newClipcard.start_date)
                    if (newClipcard.clipcard_type === 'monthly') {
                      endDate.setMonth(endDate.getMonth() + 1)
                    } else {
                      endDate.setDate(endDate.getDate() + newClipcard.validity_days)
                    }
                    return endDate.toLocaleDateString('en-GB')
                  })()}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={createClipcard}
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                  style={{ borderRadius: '20px', padding: '12px 24px', fontWeight: '600' }}
                >
                  {creating ? 'Creating...' : 'Create ClipCard'}
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  style={{ borderRadius: '20px', padding: '12px 24px' }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Clipcard Modal - Fixed */}
      {showEditModal && editingClipcard && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-4 px-4 sm:px-8 bg-black/50 overflow-y-auto">
          <div style={{ backgroundColor: '#FFFFFF', maxWidth: '1600px', maxHeight: 'min(88vh, calc(100vh - 4rem))', height: 'min(88vh, calc(100vh - 4rem))', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="w-full">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white" style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px', margin: 0 }}>
              <div className="flex items-center gap-3" style={{ fontSize: '20px', fontWeight: '700' }}>
                <Edit className="w-6 h-6" />
                Edit ClipCard
              </div>
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
              <div className="space-y-3">
                {/* ClipCard Type */}
                <div>
                  <Label>ClipCard Type</Label>
                  <select
                    value={editingClipcard.clipcard_type}
                    onChange={(e) => setEditingClipcard({ 
                      ...editingClipcard, 
                      clipcard_type: e.target.value as 'session' | 'monthly',
                      sessions_total: e.target.value === 'monthly' ? 999 : editingClipcard.sessions_total
                    })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="session">Session-Based (Pay per session count)</option>
                    <option value="monthly">Monthly Subscription (Unlimited sessions)</option>
                  </select>
                </div>

                {/* Conditional Fields based on Type */}
                {editingClipcard.clipcard_type === 'session' ? (
                  <>
                    <div>
                      <Label>Number of Sessions</Label>
                      <Input
                        type="number"
                        min="1"
                        value={editingClipcard.sessions_total}
                        onChange={(e) => {
                          const total = parseInt(e.target.value) || 1
                          setEditingClipcard({ 
                            ...editingClipcard, 
                            sessions_total: total
                          })
                        }}
                        onFocus={(e) => e.target.select()}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Sessions Used</Label>
                      <Input
                        type="number"
                        min="0"
                        max={editingClipcard.sessions_total}
                        value={editingClipcard.sessions_used}
                        onChange={(e) => {
                          const used = parseInt(e.target.value) || 0
                          setEditingClipcard({ 
                            ...editingClipcard, 
                            sessions_used: used
                          })
                        }}
                        onFocus={(e) => e.target.select()}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Sessions Remaining</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editingClipcard.sessions_remaining}
                        disabled
                        className="mt-2 bg-slate-100 dark:bg-slate-800"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically calculated by the system
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Monthly Subscription:</strong> Unlimited sessions for 30 days from start date. Auto-renews monthly.
                    </p>
                  </div>
                )}

                {/* Price */}
                <div>
                  <Label>Price (lei)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editingClipcard.price || 0}
                    onChange={(e) => setEditingClipcard({ ...editingClipcard, price: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className="mt-2"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editingClipcard.start_date}
                    onChange={(e) => setEditingClipcard({ ...editingClipcard, start_date: e.target.value })}
                    className="mt-2"
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editingClipcard.end_date}
                    onChange={(e) => setEditingClipcard({ ...editingClipcard, end_date: e.target.value })}
                    className="mt-2"
                  />
                </div>

                {/* Active Status */}
                <div>
                  <Label>Status</Label>
                  <select
                    value={editingClipcard.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditingClipcard({ ...editingClipcard, is_active: e.target.value === 'active' })}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div style={{ padding: '24px', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <div className="flex gap-3">
                <Button
                  onClick={editClipcard}
                  disabled={editing}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  style={{ borderRadius: '20px', padding: '12px 24px', fontWeight: '600' }}
                >
                  {editing ? 'Updating...' : 'Update ClipCard'}
                </Button>
                <Button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingClipcard(null)
                  }}
                  variant="outline"
                  style={{ borderRadius: '20px', padding: '12px 24px' }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

