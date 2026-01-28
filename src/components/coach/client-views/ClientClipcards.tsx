'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { 
  CreditCard, 
  Plus, 
  Check,
  X,
  Package,
  Edit
} from 'lucide-react'

interface ClipcardType {
  id: string
  name: string
  sessions_count: number
  validity_days: number
  price: number
  is_active: boolean
}

interface Clipcard {
  id: string
  clipcard_type_id: string
  sessions_total: number
  sessions_used: number
  sessions_remaining: number | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  clipcard_types?: ClipcardType | null
}

interface ClientClipcards {
  clientId: string
  clientName: string
}

export default function ClientClipcards({ clientId, clientName }: ClientClipcards) {
  const [clipcards, setClipcards] = useState<Clipcard[]>([])
  const [clipcardTypes, setClipcardTypes] = useState<ClipcardType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingClipcard, setEditingClipcard] = useState<Clipcard | null>(null)
  
  const [newClipcard, setNewClipcard] = useState({
    clipcard_type_id: '',
    start_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadClipcards()
    loadClipcardTypes()
  }, [clientId])

  const loadClipcards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clipcards')
        .select(`
          *,
          clipcard_types (
            id,
            name,
            sessions_count,
            validity_days,
            price,
            is_active
          )
        `)
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

  const loadClipcardTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('clipcard_types')
        .select('id, name, sessions_count, validity_days, price, is_active')
        .eq('coach_id', user.id)
        .order('name')

      if (error) throw error
      setClipcardTypes(data || [])
    } catch (error) {
      console.error('Error loading clipcard types:', error)
      setClipcardTypes([])
    }
  }

  useEffect(() => {
    if (!newClipcard.clipcard_type_id && clipcardTypes.length > 0) {
      setNewClipcard((prev) => ({
        ...prev,
        clipcard_type_id: clipcardTypes[0].id
      }))
    }
  }, [clipcardTypes, newClipcard.clipcard_type_id])

  const createClipcard = async () => {
    try {
      setCreating(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const selectedType = clipcardTypes.find(
        (type) => type.id === newClipcard.clipcard_type_id
      )
      if (!selectedType) {
        alert('Please select a clipcard type.')
        return
      }

      const endDate = new Date(newClipcard.start_date)
      endDate.setDate(endDate.getDate() + selectedType.validity_days)

      const { error } = await supabase
        .from('clipcards')
        .insert({
          coach_id: user.id,
          client_id: clientId,
          clipcard_type_id: selectedType.id,
          sessions_total: selectedType.sessions_count,
          sessions_used: 0,
          start_date: newClipcard.start_date,
          end_date: endDate.toISOString().split('T')[0],
          is_active: true
        })

      if (error) throw error

      alert('Clipcard created successfully!')
      setShowCreateModal(false)
      setNewClipcard({
        clipcard_type_id: clipcardTypes[0]?.id || '',
        start_date: new Date().toISOString().split('T')[0]
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
          clipcard_type_id: editingClipcard.clipcard_type_id,
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

  const getStatusText = (clipcard: Clipcard) => {
    if (!clipcard.is_active) return 'Inactive'
    if (new Date(clipcard.end_date) < new Date()) return 'Expired'
    if (clipcard.sessions_remaining === 0) return 'Depleted'
    return 'Active'
  }

  const getStatusTone = (clipcard: Clipcard) => {
    const status = getStatusText(clipcard)
    if (status === 'Active') return 'fc-text-success'
    if (status === 'Depleted') return 'fc-text-warning'
    if (status === 'Expired') return 'fc-text-error'
    return 'fc-text-subtle'
  }

  const getRenewalInfo = (clipcard: Clipcard) => {
    if (clipcard.sessions_remaining === 0) {
      return { text: 'All sessions used', color: 'fc-text-error', urgent: true }
    }

    if (clipcard.sessions_remaining !== null) {
      if (clipcard.sessions_remaining <= 2) {
        return { text: `${clipcard.sessions_remaining} sessions left - renewal soon`, color: 'fc-text-warning', urgent: true }
      }
      return { text: `${clipcard.sessions_remaining} sessions remaining`, color: 'fc-text-success', urgent: false }
    }

    const endDate = new Date(clipcard.end_date)
    const today = new Date()
    const daysUntilRenewal = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilRenewal < 0) {
      return { text: 'Expired - Renewal needed', color: 'fc-text-error', urgent: true }
    } else if (daysUntilRenewal <= 7) {
      return { text: `Renews in ${daysUntilRenewal} days`, color: 'fc-text-warning', urgent: true }
    }
    return { text: `Renews on ${endDate.toLocaleDateString('en-GB')}`, color: 'fc-text-success', urgent: false }
  }

  const selectedNewType = clipcardTypes.find(
    (type) => type.id === newClipcard.clipcard_type_id
  )
  const selectedEditType = editingClipcard
    ? clipcardTypes.find((type) => type.id === editingClipcard.clipcard_type_id)
    : null

  const activeClipcards = clipcards.filter((clipcard) => getStatusText(clipcard) === 'Active')
  const attentionClipcards = clipcards.filter((clipcard) => getRenewalInfo(clipcard).urgent)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-6 animate-pulse"
          >
            <div className="h-24 fc-glass border border-[color:var(--fc-glass-border)] rounded-2xl"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)]">
        <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
              Clipcards
            </span>
            <h3 className="text-2xl font-bold fc-text-primary mt-2">
              ClipCards for {clientName}
            </h3>
            <p className="text-sm fc-text-dim">
              Manage session credits and packages
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="fc-btn fc-btn-primary fc-press"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create ClipCard
          </Button>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{clipcards.length}</p>
            <p className="text-sm fc-text-dim">Total Clipcards</p>
          </div>
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{activeClipcards.length}</p>
            <p className="text-sm fc-text-dim">Active</p>
          </div>
          <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold fc-text-primary">{attentionClipcards.length}</p>
            <p className="text-sm fc-text-dim">Needs Attention</p>
          </div>
        </div>
      </div>

      {/* Clipcards List */}
      {clipcards.length === 0 ? (
        <div className="fc-glass-soft border border-dashed border-[color:var(--fc-glass-border)] rounded-2xl text-center px-6 py-12">
          <div className="mx-auto mb-4 fc-icon-tile fc-icon-workouts w-16 h-16">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold fc-text-primary mb-2">
            No ClipCards Yet
          </h3>
          <p className="text-sm fc-text-dim mb-6">
            Create a clipcard to allow this client to book sessions
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="fc-btn fc-btn-primary fc-press"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create First ClipCard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {clipcards.map((clipcard) => (
            <div
              key={clipcard.id}
              className="fc-glass fc-card rounded-2xl border border-[color:var(--fc-glass-border)] p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left Section - Icon and Details */}
                <div className="flex items-start gap-4">
                  <div className="fc-icon-tile fc-icon-workouts">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold fc-text-primary">
                        {clipcard.clipcard_types?.name || `${clipcard.sessions_total} Sessions`}
                      </h4>
                      <span className={`fc-pill fc-pill-glass text-xs ${getStatusTone(clipcard)}`}>
                        {getStatusText(clipcard)}
                      </span>
                      <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                        {clipcard.clipcard_types?.price?.toFixed(2) || '0.00'} lei
                      </span>
                    </div>

                    {/* Renewal Info */}
                    <div className={`mb-3 ${getRenewalInfo(clipcard).color} text-sm font-semibold`}>
                      {getRenewalInfo(clipcard).urgent && '⚠️ '}
                      {getRenewalInfo(clipcard).text}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {clipcard.sessions_remaining !== null && (
                        <>
                          <div>
                            <p className="text-xs fc-text-subtle">Remaining</p>
                            <p className="text-sm font-semibold fc-text-primary">
                              {clipcard.sessions_remaining}/{clipcard.sessions_total}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs fc-text-subtle">Used</p>
                            <p className="text-sm font-semibold fc-text-primary">
                              {clipcard.sessions_used}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-xs fc-text-subtle">Start Date</p>
                        <p className="text-sm font-semibold fc-text-primary">
                          {new Date(clipcard.start_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs fc-text-subtle">Expires</p>
                        <p className="text-sm font-semibold fc-text-primary">
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
                    className="fc-btn fc-btn-secondary fc-press"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => toggleClipcardStatus(clipcard.id, clipcard.is_active)}
                    variant="outline"
                    className="fc-btn fc-btn-secondary fc-press"
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
            </div>
          ))}
        </div>
      )}

      {/* Create Clipcard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="fc-modal fc-card w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                    Clipcards
                  </span>
                  <h3 className="text-lg font-semibold fc-text-primary mt-2">
                    Create New ClipCard
                  </h3>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              {/* ClipCard Type */}
              <div>
                <Label className="fc-text-subtle">ClipCard Type</Label>
                <select
                  value={newClipcard.clipcard_type_id}
                  onChange={(e) =>
                    setNewClipcard({
                      ...newClipcard,
                      clipcard_type_id: e.target.value
                    })
                  }
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft fc-text-primary"
                >
                  {clipcardTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Details */}
              <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="fc-text-subtle">Sessions</p>
                    <p className="font-semibold fc-text-primary">
                      {selectedNewType?.sessions_count ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="fc-text-subtle">Validity</p>
                    <p className="font-semibold fc-text-primary">
                      {selectedNewType?.validity_days ?? '-'} days
                    </p>
                  </div>
                  <div>
                    <p className="fc-text-subtle">Price</p>
                    <p className="font-semibold fc-text-primary">
                      {selectedNewType?.price?.toFixed(2) ?? '0.00'} lei
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <Label className="fc-text-subtle">Start Date</Label>
                <Input
                  type="date"
                  value={newClipcard.start_date}
                  onChange={(e) =>
                    setNewClipcard({ ...newClipcard, start_date: e.target.value })
                  }
                  className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                />
              </div>

              {/* Summary */}
              <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4">
                <h4 className="font-semibold fc-text-primary mb-2">Summary</h4>
                <div className="space-y-1 text-sm fc-text-subtle">
                  <p>
                    <span className="font-semibold">Type:</span>{' '}
                    {selectedNewType?.name || 'Select a type'}
                  </p>
                  <p>
                    <span className="font-semibold">Valid Until:</span>{' '}
                    {selectedNewType
                      ? (() => {
                          const endDate = new Date(newClipcard.start_date)
                          endDate.setDate(endDate.getDate() + selectedNewType.validity_days)
                          return endDate.toLocaleDateString('en-GB')
                        })()
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={createClipcard}
                  disabled={creating || !selectedNewType}
                  className="flex-1 fc-btn fc-btn-primary fc-press"
                >
                  {creating ? 'Creating...' : 'Create ClipCard'}
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="fc-btn fc-btn-secondary fc-press"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Clipcard Modal - Fixed */}
      {showEditModal && editingClipcard && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-6 px-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="fc-modal fc-card w-full max-w-3xl overflow-hidden">
            <div className="p-6 border-b border-[color:var(--fc-glass-border)]">
              <div className="flex items-center gap-3">
                <div className="fc-icon-tile fc-icon-workouts">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <span className="fc-pill fc-pill-glass fc-text-workouts text-xs">
                    Clipcards
                  </span>
                  <h3 className="text-lg font-semibold fc-text-primary mt-2">
                    Edit ClipCard
                  </h3>
                </div>
              </div>
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {/* ClipCard Type */}
                <div>
                  <Label className="fc-text-subtle">ClipCard Type</Label>
                  <select
                    value={editingClipcard.clipcard_type_id}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      const selectedType = clipcardTypes.find((type) => type.id === selectedId) || null
                      setEditingClipcard({
                        ...editingClipcard,
                        clipcard_type_id: selectedId,
                        clipcard_types: selectedType
                      })
                    }}
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft fc-text-primary"
                  >
                    {clipcardTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Details */}
                <div className="fc-glass-soft border border-[color:var(--fc-glass-border)] rounded-2xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="fc-text-subtle">Sessions</p>
                      <p className="font-semibold fc-text-primary">
                        {selectedEditType?.sessions_count ?? '-'}
                      </p>
                    </div>
                    <div>
                      <p className="fc-text-subtle">Validity</p>
                      <p className="font-semibold fc-text-primary">
                        {selectedEditType?.validity_days ?? '-'} days
                      </p>
                    </div>
                    <div>
                      <p className="fc-text-subtle">Price</p>
                      <p className="font-semibold fc-text-primary">
                        {selectedEditType?.price?.toFixed(2) ?? '0.00'} lei
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="fc-text-subtle">Number of Sessions</Label>
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
                    className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                </div>

                <div>
                  <Label className="fc-text-subtle">Sessions Used</Label>
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
                    className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                </div>

                <div>
                  <Label className="fc-text-subtle">Sessions Remaining</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingClipcard.sessions_remaining ?? 0}
                    disabled
                    className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                  <p className="text-xs fc-text-subtle mt-1">
                    Automatically calculated by the system
                  </p>
                </div>

                {/* Start Date */}
                <div>
                  <Label className="fc-text-subtle">Start Date</Label>
                  <Input
                    type="date"
                    value={editingClipcard.start_date}
                    onChange={(e) =>
                      setEditingClipcard({
                        ...editingClipcard,
                        start_date: e.target.value
                      })
                    }
                    className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label className="fc-text-subtle">End Date</Label>
                  <Input
                    type="date"
                    value={editingClipcard.end_date}
                    onChange={(e) =>
                      setEditingClipcard({
                        ...editingClipcard,
                        end_date: e.target.value
                      })
                    }
                    className="mt-2 fc-glass-soft border border-[color:var(--fc-glass-border)]"
                  />
                </div>

                {/* Active Status */}
                <div>
                  <Label className="fc-text-subtle">Status</Label>
                  <select
                    value={editingClipcard.is_active ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setEditingClipcard({
                        ...editingClipcard,
                        is_active: e.target.value === 'active'
                      })
                    }
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft fc-text-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="p-6 border-t border-[color:var(--fc-glass-border)]">
              <div className="flex gap-3">
                <Button
                  onClick={editClipcard}
                  disabled={editing}
                  className="flex-1 fc-btn fc-btn-primary fc-press"
                >
                  {editing ? 'Updating...' : 'Update ClipCard'}
                </Button>
                <Button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingClipcard(null)
                  }}
                  variant="outline"
                  className="fc-btn fc-btn-secondary fc-press"
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

