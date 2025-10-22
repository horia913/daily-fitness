'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  X
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
  const { getThemeStyles } = useTheme()
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
      const { data: typesData, error: typesError } = await supabase
        .from('clipcard_types')
        .select('*')
        .eq('coach_id', user.id)
        .eq('is_active', true)
        .order('sessions_count')

      if (typesError) {
        console.log('ClipCard types table not found, using empty array')
        setClipcardTypes([])
      } else {
        setClipcardTypes(typesData || [])
      }

      // Load clipcards
      const { data: clipcardsData, error: clipcardsError } = await supabase
        .from('clipcards')
        .select(`
          *,
          client:profiles(
            first_name,
            last_name
          ),
          clipcard_type:clipcard_types(
            name,
            sessions_count,
            validity_days
          )
        `)
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })

      if (clipcardsError) {
        console.log('ClipCards table not found, using empty array')
        setClipcards([])
      } else {
        setClipcards(clipcardsData || [])
      }

      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'client')

      if (clientsError) {
        console.log('Clients not found, using empty array')
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
        alert('Database tables not set up yet. Please run the database-clipcards.sql script first.')
        return
      }

      setShowCreateType(false)
      setClipcardTypeForm({ name: '', sessions_count: 8, validity_days: 30, price: 0 })
      loadData()
    } catch (error) {
      console.error('Error creating clipcard type:', error)
      alert('Error creating clipcard type. Please try again.')
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
        alert('Database tables not set up yet. Please run the database-clipcards.sql script first.')
        return
      }

      setShowCreateClipCard(false)
      setSelectedClient('')
      setSelectedType('')
      loadData()
    } catch (error) {
      console.error('Error creating clipcard:', error)
      alert('Error creating clipcard. Please try again.')
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
      <div className={`min-h-screen ${theme.background}`}>
        <div className="relative p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h1 className={`text-4xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                  ClipCard Management
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Manage session packages and track client ClipCard usage
              </p>
            </div>

            {/* Search and Filters */}
            <div className={`${theme.card} ${theme.shadow} rounded-2xl p-6`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                  <Input
                    placeholder="Search packages or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
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
                    <SelectTrigger className={`w-48 h-12 ${theme.border} ${theme.text} bg-transparent rounded-xl`}>
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
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
                <DialogTrigger asChild>
                  <Button className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3`}>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Package
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Dialog open={showCreateClipCard} onOpenChange={setShowCreateClipCard}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={`${theme.border} ${theme.text} hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl px-6 py-3`}>
                    <Users className="w-5 h-5 mr-2" />
                    Assign ClipCard
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{clipcardTypes.length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Total Packages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={`${theme.card} ${theme.shadow} hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme.text}`}>{clipcards.length}</p>
                      <p className={`text-sm ${theme.textSecondary}`}>Active ClipCards</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Packages Section */}
            <div className="space-y-6">
              <h2 className={`text-2xl font-bold ${theme.text} flex items-center gap-3`}>
                <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                  <Package className="w-6 h-6 text-white" />
                </div>
                ClipCard Packages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clipcardTypes.map(type => (
                  <Card key={type.id} className={`${theme.card} ${theme.shadow} hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className={`text-xl font-bold ${theme.text} group-hover:text-purple-600 transition-colors`}>
                                {type.name}
                              </CardTitle>
                              <div className={`${theme.textSecondary} text-sm mt-1`}>
                                {type.sessions_count} sessions • {type.validity_days} days
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`${theme.textSecondary} text-sm`}>Price</span>
                              <span className={`font-semibold ${theme.text}`}>{type.price} RON</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`${theme.textSecondary} text-sm`}>Validity</span>
                              <span className={`font-semibold ${theme.text}`}>{type.validity_days} days</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Create Package Modal */}
            <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                <DialogHeader>
                  <DialogTitle className={`${theme.text}`}>Create ClipCard Package</DialogTitle>
                  <DialogDescription className={`${theme.textSecondary}`}>
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
                    <Button onClick={createClipCardType} className={`flex-1 ${theme.gradient} ${theme.shadow} rounded-xl`}>
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
              <DialogContent className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                <DialogHeader>
                  <DialogTitle className={`${theme.text}`}>Assign ClipCard to Client</DialogTitle>
                  <DialogDescription className={`${theme.textSecondary}`}>
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
                      className={`flex-1 ${theme.gradient} ${theme.shadow} rounded-xl`}
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
      </div>
    </ProtectedRoute>
  )
}
