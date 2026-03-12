'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/toast-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  CreditCard,
  Plus,
  Users,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  Package,
  Save,
  Edit,
  Trash2,
  Copy,
  ArrowRight,
  Star,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  Target,
  Dumbbell,
  Heart,
  Award,
  Eye,
  Settings,
  X,
  Download,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ClipCardType {
  id: string
  name: string
  sessions_count: number
  validity_days: number
  price: number
  coach_id: string
  is_active: boolean
  created_at: string
}

interface ClipCard {
  id: string
  client_id: string
  clipcard_type_id: string
  coach_id: string
  sessions_total: number
  sessions_used: number
  validity_days: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  client: {
    first_name: string
    last_name: string
  }
  clipcard_type: {
    name: string
    sessions_count: number
    validity_days: number
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function CoachClipCards() {
  const { getThemeStyles, performanceSettings } = useTheme()
  const { addToast } = useToast()
  const theme = getThemeStyles()
  
  const [clipcardTypes, setClipcardTypes] = useState<ClipCardType[]>([])
  const [clipcards, setClipcards] = useState<ClipCard[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateClipCard, setShowCreateClipCard] = useState(false)
  const [showCreateType, setShowCreateType] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [activeTab, setActiveTab] = useState<'types' | 'assignments'>('types')

  const [clipcardTypeForm, setClipcardTypeForm] = useState({
    name: '',
    sessions_count: 8,
    validity_days: 30,
    price: 0
  })

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load clipcard types
      try {
      const { data: typesData, error: typesError } = await supabase
        .from('clipcard_types')
        .select('*')
        .eq('coach_id', user.id)
        .eq('is_active', true)
        .order('sessions_count')

      if (typesError) {
        setClipcardTypes([])
      } else {
        setClipcardTypes(typesData || [])
        }
      } catch {
        setClipcardTypes([])
      }

      // Load clipcards
      try {
        // First try a simple query to test table access
      const { data: clipcardsData, error: clipcardsError } = await supabase
        .from('clipcards')
          .select('*')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (clipcardsError) {
        setClipcards([])
      } else {
        setClipcards(clipcardsData || [])
        }
      } catch {
        setClipcards([])
      }

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'client')

      if (clientsError) {
        setClients([])
      } else {
        setClients(clientsData || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setClipcardTypes([])
      setClipcards([])
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createClipCardType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('clipcard_types')
        .insert({
          coach_id: user.id,
          ...clipcardTypeForm
        })

      if (error) {
        console.error('Error creating clipcard type:', error)
        addToast({ title: 'Database tables not set up yet. Please run the database-clipcards.sql script first.', variant: 'destructive' })
        return
      }

      setShowCreateType(false)
      setClipcardTypeForm({ name: '', sessions_count: 8, validity_days: 30, price: 0 })
      loadData()
    } catch (error) {
      console.error('Error creating clipcard type:', error)
      addToast({ title: 'Error creating clipcard type. Please try again.', variant: 'destructive' })
    }
  }

  const createClipCard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('create_clipcard', {
        p_coach_id: user.id,
        p_client_id: selectedClient,
        p_clipcard_type_id: selectedType
      })

      if (error) {
        console.error('Error creating clipcard:', error)
        addToast({ title: 'Database tables not set up yet. Please run the database-clipcards.sql script first.', variant: 'destructive' })
        return
      }

      setShowCreateClipCard(false)
      setSelectedClient('')
      setSelectedType('')
      loadData()
    } catch (error) {
      console.error('Error creating clipcard:', error)
      addToast({ title: 'Error creating clipcard. Please try again.', variant: 'destructive' })
    }
  }

  const deleteClipCardType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
        return
      }

    try {
      const { error } = await supabase
        .from('clipcard_types')
        .delete()
        .eq('id', typeId)

      if (error) {
        console.error('Error deleting clipcard type:', error)
        addToast({ title: 'Error deleting package. Please try again.', variant: 'destructive' })
        return
      }

      loadData()
    } catch (error) {
      console.error('Error deleting clipcard type:', error)
      addToast({ title: 'Error deleting package. Please try again.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole="coach">
        <div className={`min-h-screen ${theme.background}`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`${theme.card} ${theme.shadow} rounded-2xl p-8`}>
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2"></div>
                </div>
              </div>
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
        <div className="min-h-screen">
        <div className="relative px-6 pb-16 pt-10">
          <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <nav className="flex items-center gap-2 text-sm fc-text-dim mb-4 font-mono">
                  <span>COACH</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="fc-text-primary">CLIPCARDS</span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight fc-text-primary">Voucher Matrix</h1>
                <p className="fc-text-dim mt-2">Manage session packages and client accessibility.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="fc-btn fc-btn-ghost">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
                  <DialogTrigger asChild>
                    <Button className="fc-btn fc-btn-primary">
                      <Plus className="w-5 h-5 mr-2" />
                      New Package Type
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </header>

            <div className="flex items-center gap-8 border-b border-[color:var(--fc-glass-border)] mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('types')}
                className={`pb-3 text-lg font-semibold transition-all ${activeTab === 'types' ? 'fc-text-primary border-b-2 border-[color:var(--fc-accent-primary)]' : 'fc-text-dim hover:fc-text-primary'}`}
              >
                Package Types
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`pb-3 text-lg font-semibold transition-all ${activeTab === 'assignments' ? 'fc-text-primary border-b-2 border-[color:var(--fc-accent-primary)]' : 'fc-text-dim hover:fc-text-primary'}`}
              >
                Active Assignments
              </button>
            </div>

            <GlassCard className="p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--fc-text-subtle)]" />
                  <Input
                    placeholder="Search packages or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="fc-input h-12 w-full pl-12"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="fc-select h-12 w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="fc-select h-12 w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-3 text-white shadow-lg">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">{clipcardTypes.length}</p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Total Packages</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-3 text-white shadow-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[color:var(--fc-text-primary)]">{clipcards.length}</p>
                    <p className="text-sm text-[color:var(--fc-text-dim)]">Active ClipCards</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Content by tab */}
            {activeTab === 'types' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clipcardTypes.map(type => (
                  <GlassCard key={type.id} className="fc-glass fc-card rounded-2xl overflow-hidden group p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl fc-glass-soft shrink-0">
                              <Package className="w-5 h-5 fc-text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold fc-text-primary truncate">
                                {type.name}
                              </h3>
                              <p className="text-sm fc-text-dim mt-1">
                                {type.sessions_count} sessions • {type.validity_days} days
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm fc-text-dim">Price</span>
                              <span className="font-semibold fc-text-primary">{type.price} RON</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm fc-text-dim">Validity</span>
                              <span className="font-semibold fc-text-primary">{type.validity_days} days</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteClipCardType(type.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                  </GlassCard>
                ))}
              </div>
            </div>
            )}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <p className="text-sm fc-text-dim">Active clipcard assignments. Assign from Package Types or use the Assign flow.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clipcards.slice(0, 12).map(cc => (
                    <GlassCard key={cc.id} className="fc-glass fc-card p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold fc-text-primary">{cc.client?.first_name} {cc.client?.last_name}</p>
                          <p className="text-sm fc-text-dim">{cc.clipcard_type?.name} • {cc.sessions_used}/{cc.sessions_total} used</p>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
                {clipcards.length === 0 && (
                  <GlassCard className="fc-glass fc-card p-8 text-center rounded-2xl">
                    <CreditCard className="w-12 h-12 fc-text-dim mx-auto mb-3" />
                    <p className="fc-text-dim">No assignments yet.</p>
                    <Dialog open={showCreateClipCard} onOpenChange={setShowCreateClipCard}>
                      <DialogTrigger asChild>
                        <Button className="fc-btn fc-btn-primary mt-4">
                          <Users className="w-4 h-4 mr-2" />
                          Assign ClipCard
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </GlassCard>
                )}
              </div>
            )}
          </div>

            {/* Create Package Modal */}
          <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
              <DialogContent className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(500px,95vw)] !m-0 !p-6">
                <DialogHeader className="space-y-3">
                  <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Create ClipCard Package</DialogTitle>
                  <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                  Define a new session package for your clients.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className={`${theme.text}`}>Package Name</Label>
                  <Input
                    id="name"
                    value={clipcardTypeForm.name}
                    onChange={(e) => setClipcardTypeForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., 8 Sessions"
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="sessions" className={`${theme.text}`}>Sessions Count</Label>
                  <Input
                    id="sessions"
                    type="number"
                    value={clipcardTypeForm.sessions_count}
                    onChange={(e) => setClipcardTypeForm(prev => ({ ...prev, sessions_count: parseInt(e.target.value) || 0 }))}
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="validity" className={`${theme.text}`}>Validity Days</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={clipcardTypeForm.validity_days}
                    onChange={(e) => setClipcardTypeForm(prev => ({ ...prev, validity_days: parseInt(e.target.value) || 0 }))}
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div>
                  <Label htmlFor="price" className={`${theme.text}`}>Price (RON)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={clipcardTypeForm.price}
                    onChange={(e) => setClipcardTypeForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}
                  />
                </div>
                <div className="flex gap-2">
                    <Button onClick={createClipCardType} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg">
                    <Save className="w-4 h-4 mr-2" />
                    Create Package
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateType(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

            {/* Create ClipCard Modal */}
          <Dialog open={showCreateClipCard} onOpenChange={setShowCreateClipCard}>
              <DialogContent className="fc-surface rounded-2xl border border-[color:var(--fc-glass-border)] shadow-2xl !fixed !top-1/2 !left-1/2 !transform !-translate-x-1/2 !-translate-y-1/2 !z-[9999] !max-w-[95vw] !max-h-[90vh] !w-[min(500px,95vw)] !m-0 !p-6">
                <DialogHeader className="space-y-3">
                  <DialogTitle className={`text-2xl font-bold ${theme.text} leading-tight`}>Assign ClipCard to Client</DialogTitle>
                  <DialogDescription className={`text-base ${theme.textSecondary} leading-relaxed`}>
                  Select a client and package to create a new ClipCard.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client" className={`${theme.text}`}>Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Users className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type" className={`${theme.text}`}>ClipCard Package</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl`}>
                      <Package className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Choose a package..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clipcardTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {type.price} RON
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createClipCard} 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                      disabled={!selectedClient || !selectedType}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Create ClipCard
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateClipCard(false)} className={`${theme.border} ${theme.text} rounded-xl`}>
                      Cancel
                    </Button>
                  </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
