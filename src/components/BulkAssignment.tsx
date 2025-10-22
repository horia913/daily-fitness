'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Plus,
  Search,
  Trash2,
  Play,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  FileText,
  Zap,
  ArrowRight,
  ArrowLeft,
  Dumbbell,
  Utensils,
  BookOpen,
  UserCheck,
  CalendarDays,
  Timer,
  Shield,
  Bell,
  Send,
  CheckSquare,
  Square
} from 'lucide-react'
import { 
  BulkAssignmentManager,
  BulkOperationData,
  BulkOperationItem,
  BulkOperationSettings,
  BulkAssignmentValidation,
  Client,
  Program
} from '@/lib/bulkAssignment'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'

interface BulkAssignmentProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  coachId: string
  initialType?: 'program' | 'workout' | 'meal_plan'
}

export default function BulkAssignmentComponent({ 
  isOpen, 
  onClose, 
  onSuccess, 
  coachId,
  initialType = 'program'
}: BulkAssignmentProps) {
  const { isDark, getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [operationType, setOperationType] = useState<'program' | 'workout' | 'meal_plan'>(initialType)
  const [operationName, setOperationName] = useState('')
  const [operationNotes, setOperationNotes] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [operationItems, setOperationItems] = useState<BulkOperationItem[]>([])
  const [settings, setSettings] = useState<BulkOperationSettings>({
    start_date: new Date().toISOString().split('T')[0],
    skip_existing_assignments: false,
    send_notifications: true,
    auto_schedule: false,
    validation_level: 'moderate'
  })
  const [validation, setValidation] = useState<BulkAssignmentValidation | null>(null)
  const [, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [currentStep, setCurrentStep] = useState<'setup' | 'configure' | 'preview' | 'execute'>('setup')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [showClientDetails, setShowClientDetails] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('first_name')

      if (clientsError) throw clientsError

      // Load programs
      const { data: programsData, error: programsError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('name')

      if (programsError) throw programsError

      setClients(clientsData || [])
      setPrograms(programsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [coachId])

  const validateOperation = useCallback(() => {
    if (operationItems.length === 0 || !operationName) {
      setValidation(null)
      return
    }

    const operationData: BulkOperationData = {
      items: operationItems,
      settings,
      metadata: {
        created_by: coachId,
        created_at: new Date().toISOString(),
        notes: operationNotes
      }
    }

    const validationResult = BulkAssignmentManager.validateBulkAssignment(
      operationData,
      operationType,
      settings.validation_level
    )

    setValidation(validationResult)
  }, [operationItems, settings, operationName, operationNotes, coachId, operationType])

  useEffect(() => {
    if (isOpen) {
      loadData()
      setCurrentStep('setup')
      setOperationName('')
      setOperationNotes('')
      setSelectedClients([])
      setOperationItems([])
    }
  }, [isOpen, loadData])

  useEffect(() => {
    validateOperation()
  }, [operationItems, settings, operationName, validateOperation])

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSelectAllClients = () => {
    const filteredClients = getFilteredClients()
    const allSelected = filteredClients.every(client => selectedClients.includes(client.id))
    
    if (allSelected) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(client => client.id))
    }
  }

  const getFilteredClients = () => {
    return clients.filter(client => {
      const matchesSearch = !searchTerm || 
        client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLevel = !filterLevel || client.fitness_level === filterLevel
      
      return matchesSearch && matchesLevel
    })
  }

  const addOperationItem = () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client')
      return
    }

    const newItem: BulkOperationItem = {
      client_ids: [...selectedClients],
      start_date: settings.start_date,
      notes: operationNotes
    }

    if (operationType === 'program') {
      // For program assignments, we'll add a program selection step
      newItem.program_id = ''
    }

    setOperationItems(prev => [...prev, newItem])
    setSelectedClients([])
  }

  const removeOperationItem = (index: number) => {
    setOperationItems(prev => prev.filter((_, i) => i !== index))
  }

  // const updateOperationItem = (index: number, updates: Partial<BulkOperationItem>) => {
  //   setOperationItems(prev => prev.map((item, i) => 
  //     i === index ? { ...item, ...updates } : item
  //   ))
  // }

  const handleExecute = async () => {
    if (!validation?.isValid) {
      alert('Please fix validation errors before proceeding')
      return
    }

    setAssigning(true)
    try {
      const operationData: BulkOperationData = {
        items: operationItems,
        settings,
        metadata: {
          created_by: coachId,
          created_at: new Date().toISOString(),
          notes: operationNotes
        }
      }

      // Create bulk assignment
      const { data: bulkAssignment, error: bulkError } = await supabase
        .from('bulk_assignments')
        .insert({
          coach_id: coachId,
          operation_name: operationName,
          operation_type: operationType,
          status: 'pending',
          total_items: operationData.items.reduce((sum, item) => sum + item.client_ids.length, 0),
          operation_data: operationData,
          error_log: []
        })
        .select()
        .single()

      if (bulkError) throw bulkError

      // Create bulk assignment items
      const items = BulkAssignmentManager.generateBulkAssignmentItems(
        bulkAssignment.id,
        operationData,
        operationType
      )

      const { error: itemsError } = await supabase
        .from('bulk_assignment_items')
        .insert(items)

      if (itemsError) throw itemsError

      // Process the bulk assignment
      const { error: processError } = await supabase.rpc(
        'process_bulk_program_assignment',
        { p_bulk_assignment_id: bulkAssignment.id }
      )

      if (processError) throw processError

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error executing bulk assignment:', error)
      alert('Error executing bulk assignment. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  const getPreviewData = () => {
    if (operationItems.length === 0) return null

    const operationData: BulkOperationData = {
      items: operationItems,
      settings,
      metadata: {
        created_by: coachId,
        created_at: new Date().toISOString(),
        notes: operationNotes
      }
    }

    return BulkAssignmentManager.generateBulkAssignmentPreview(
      operationData,
      operationType,
      programs,
      clients
    )
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'setup':
        return operationName && operationItems.length > 0
      case 'configure':
        return validation?.isValid
      case 'preview':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    switch (currentStep) {
      case 'setup':
        setCurrentStep('configure')
        break
      case 'configure':
        setCurrentStep('preview')
        break
      case 'preview':
        setCurrentStep('execute')
        break
    }
  }

  const prevStep = () => {
    switch (currentStep) {
      case 'configure':
        setCurrentStep('setup')
        break
      case 'preview':
        setCurrentStep('configure')
        break
      case 'execute':
        setCurrentStep('preview')
        break
    }
  }

  if (!isOpen) return null

  const filteredClients = getFilteredClients()
  const previewData = getPreviewData()

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'setup': return <Users className="w-4 h-4" />
      case 'configure': return <Settings className="w-4 h-4" />
      case 'preview': return <Eye className="w-4 h-4" />
      case 'execute': return <Zap className="w-4 h-4" />
      default: return null
    }
  }

  // const getOperationTypeIcon = (type: string) => {
  //   switch (type) {
  //     case 'program': return <BookOpen className="w-5 h-5" />
  //     case 'workout': return <Dumbbell className="w-5 h-5" />
  //     case 'meal_plan': return <Utensils className="w-5 h-5" />
  //     default: return <Target className="w-5 h-5" />
  //   }
  // }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className={`${theme.card} ${theme.shadow} rounded-3xl border ${theme.border} h-full flex flex-col`}>
          {/* Header */}
          <div className="p-6 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-purple-100 to-blue-100'}`}>
                  <Users className={`w-6 h-6 ${theme.text}`} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${theme.text}`}>Bulk Assignment</h2>
                  <p className={`text-sm ${theme.textSecondary} mt-1`}>
                    Assign {operationType}s to multiple clients efficiently
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {['setup', 'configure', 'preview', 'execute'].map((step, index) => {
                  const stepIndex = ['setup', 'configure', 'preview', 'execute'].indexOf(currentStep)
                  const isActive = currentStep === step
                  const isCompleted = index < stepIndex
                  
                  return (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-2xl text-sm font-bold transition-all duration-200 ${
                        isActive 
                          ? `${theme.primary} text-white shadow-lg` 
                          : isCompleted
                          ? 'bg-green-500 text-white shadow-lg'
                          : `${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${theme.textSecondary}`
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          getStepIcon(step)
                        )}
                      </div>
                      <span className={`ml-3 text-sm font-semibold ${
                        isActive ? theme.text : theme.textSecondary
                      }`}>
                        {step.charAt(0).toUpperCase() + step.slice(1)}
                      </span>
                      {index < 3 && (
                        <div className={`w-20 h-1 mx-6 rounded-full transition-all duration-200 ${
                          isCompleted
                            ? 'bg-green-500'
                            : `${isDark ? 'bg-slate-700' : 'bg-slate-200'}`
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step Content */}
            {currentStep === 'setup' && (
              <div className="space-y-8">
                {/* Operation Details */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                        <Target className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Operation Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="operation_name" className={`text-sm font-medium ${theme.text}`}>Operation Name *</Label>
                      <Input
                        id="operation_name"
                        value={operationName}
                        onChange={(e) => setOperationName(e.target.value)}
                        placeholder="e.g., January Program Assignment"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="operation_type" className={`text-sm font-medium ${theme.text}`}>Assignment Type</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { value: 'program', label: 'Program Assignment', icon: BookOpen },
                          { value: 'workout', label: 'Workout Assignment', icon: Dumbbell },
                          { value: 'meal_plan', label: 'Meal Plan Assignment', icon: Utensils }
                        ].map(({ value, label, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={operationType === value ? 'default' : 'outline'}
                            onClick={() => setOperationType(value as 'program' | 'workout' | 'meal_plan')}
                            className={`rounded-xl h-auto p-4 flex flex-col items-center gap-2 ${
                              operationType === value 
                                ? `${theme.primary} text-white` 
                                : `${theme.textSecondary} hover:${theme.text} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'}`
                            }`}
                          >
                            <Icon className="w-6 h-6" />
                            <span className="text-sm font-medium">{label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="operation_notes" className={`text-sm font-medium ${theme.text}`}>Notes (Optional)</Label>
                      <Textarea
                        id="operation_notes"
                        value={operationNotes}
                        onChange={(e) => setOperationNotes(e.target.value)}
                        placeholder="Add any notes or instructions for this bulk assignment..."
                        rows={3}
                        className="rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Client Selection */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                          <Users className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Select Clients</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClientDetails(!showClientDetails)}
                        className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
                      >
                        {showClientDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showClientDetails ? 'Hide' : 'Show'} Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    {/* Filters */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 rounded-xl"
                          />
                        </div>
                      </div>
                      <Select value={filterLevel} onValueChange={setFilterLevel}>
                        <SelectTrigger className="w-40 rounded-xl">
                          <SelectValue placeholder="All Levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Levels</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Select All */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllClients}
                        className="rounded-xl"
                      >
                        {filteredClients.every(client => selectedClients.includes(client.id))
                          ? <CheckSquare className="w-4 h-4 mr-2" />
                          : <Square className="w-4 h-4 mr-2" />
                        }
                        {filteredClients.every(client => selectedClients.includes(client.id))
                          ? 'Deselect All'
                          : 'Select All'
                        }
                      </Button>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-xl">
                          {selectedClients.length} of {filteredClients.length} selected
                        </Badge>
                      </div>
                    </div>

                    {/* Client List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${
                            selectedClients.includes(client.id)
                              ? `${theme.primary} border-opacity-50 bg-opacity-10 text-white`
                              : `${theme.border} hover:${isDark ? 'bg-slate-700' : 'bg-slate-50'} hover:border-opacity-60`
                          }`}
                          onClick={() => handleClientToggle(client.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                selectedClients.includes(client.id)
                                  ? 'bg-white bg-opacity-20'
                                  : `${isDark ? 'bg-slate-600' : 'bg-slate-200'}`
                              }`}>
                                <UserCheck className={`w-5 h-5 ${
                                  selectedClients.includes(client.id)
                                    ? 'text-white'
                                    : theme.textSecondary
                                }`} />
                              </div>
                              <div>
                                <div className={`font-semibold ${
                                  selectedClients.includes(client.id) ? 'text-white' : theme.text
                                }`}>
                                  {client.first_name} {client.last_name}
                                </div>
                                <div className={`text-sm ${
                                  selectedClients.includes(client.id) ? 'text-white text-opacity-80' : theme.textSecondary
                                }`}>
                                  {client.email}
                                </div>
                                {client.fitness_level && (
                                  <Badge 
                                    variant="outline" 
                                    className={`mt-1 text-xs rounded-xl ${
                                      selectedClients.includes(client.id)
                                        ? 'border-white border-opacity-30 text-white'
                                        : ''
                                    }`}
                                  >
                                    {client.fitness_level}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedClients.includes(client.id) && (
                              <CheckCircle className="w-6 h-6 text-white" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add to Operation */}
                    <div className="pt-4 border-t border-slate-200/50">
                      <Button
                        onClick={addOperationItem}
                        disabled={selectedClients.length === 0}
                        className={`w-full rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''} to Operation
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Operation Items */}
                {operationItems.length > 0 && (
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                          <FileText className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>
                          Operation Items ({operationItems.length})
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="space-y-4">
                        {operationItems.map((item, index) => (
                          <div key={index} className={`p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                  <span className={`text-sm font-bold ${theme.text}`}>{index + 1}</span>
                                </div>
                                <div>
                                  <div className={`font-semibold ${theme.text}`}>
                                    {item.client_ids.length} Client{item.client_ids.length > 1 ? 's' : ''}
                                  </div>
                                  <div className={`text-sm ${theme.textSecondary} flex items-center gap-2`}>
                                    <CalendarDays className="w-4 h-4" />
                                    Start Date: {item.start_date}
                                  </div>
                                  {item.notes && (
                                    <div className={`text-sm ${theme.textSecondary} mt-1`}>
                                      Notes: {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeOperationItem(index)}
                                className={`rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 'configure' && (
              <div className="space-y-8">
                {/* Settings */}
                <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-orange-100'}`}>
                        <Settings className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                      </div>
                      <CardTitle className={`text-xl font-bold ${theme.text}`}>Assignment Settings</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="start_date" className={`text-sm font-medium ${theme.text}`}>Default Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={settings.start_date}
                          onChange={(e) => setSettings(prev => ({ ...prev, start_date: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="validation_level" className={`text-sm font-medium ${theme.text}`}>Validation Level</Label>
                        <Select 
                          value={settings.validation_level} 
                          onValueChange={(value: 'strict' | 'moderate' | 'lenient') => setSettings(prev => ({ ...prev, validation_level: value }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="strict">Strict - Maximum validation</SelectItem>
                            <SelectItem value="moderate">Moderate - Balanced validation</SelectItem>
                            <SelectItem value="lenient">Lenient - Minimal validation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className={`text-lg font-semibold ${theme.text}`}>Additional Options</h4>
                      <div className="space-y-4">
                        <div className={`flex items-center justify-between p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
                              <Shield className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <Label htmlFor="skip_existing" className={`font-medium ${theme.text}`}>Skip Existing Assignments</Label>
                              <p className={`text-sm ${theme.textSecondary}`}>Don&apos;t overwrite existing assignments</p>
                            </div>
                          </div>
                          <input
                            id="skip_existing"
                            type="checkbox"
                            checked={settings.skip_existing_assignments}
                            onChange={(e) => setSettings(prev => ({ ...prev, skip_existing_assignments: e.target.checked }))}
                            className="w-5 h-5 rounded"
                          />
                        </div>

                        <div className={`flex items-center justify-between p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'}`}>
                              <Bell className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                            </div>
                            <div>
                              <Label htmlFor="send_notifications" className={`font-medium ${theme.text}`}>Send Notifications</Label>
                              <p className={`text-sm ${theme.textSecondary}`}>Notify clients about new assignments</p>
                            </div>
                          </div>
                          <input
                            id="send_notifications"
                            type="checkbox"
                            checked={settings.send_notifications}
                            onChange={(e) => setSettings(prev => ({ ...prev, send_notifications: e.target.checked }))}
                            className="w-5 h-5 rounded"
                          />
                        </div>

                        <div className={`flex items-center justify-between p-4 border ${theme.border} rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'}`}>
                              <Timer className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                            </div>
                            <div>
                              <Label htmlFor="auto_schedule" className={`font-medium ${theme.text}`}>Auto Schedule</Label>
                              <p className={`text-sm ${theme.textSecondary}`}>Automatically schedule assignments</p>
                            </div>
                          </div>
                          <input
                            id="auto_schedule"
                            type="checkbox"
                            checked={settings.auto_schedule}
                            onChange={(e) => setSettings(prev => ({ ...prev, auto_schedule: e.target.checked }))}
                            className="w-5 h-5 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Validation Results */}
                {validation && (
                  <Card className={`${theme.card} border ${theme.border} rounded-2xl`}>
                    <CardHeader className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          validation.isValid 
                            ? (isDark ? 'bg-green-700' : 'bg-green-100')
                            : (isDark ? 'bg-red-700' : 'bg-red-100')
                        }`}>
                          {validation.isValid ? (
                            <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                          ) : (
                            <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                          )}
                        </div>
                        <CardTitle className={`text-xl font-bold ${theme.text}`}>Validation Results</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0 space-y-6">
                      {validation.errors.length > 0 && (
                        <div className="space-y-3">
                          <h4 className={`font-semibold text-red-600`}>Errors:</h4>
                          <div className="space-y-2">
                            {validation.errors.map((error, index) => (
                              <div key={index} className={`text-sm text-red-600 flex items-start gap-3 p-3 border border-red-200 rounded-xl ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {validation.warnings.length > 0 && (
                        <div className="space-y-3">
                          <h4 className={`font-semibold text-orange-600`}>Warnings:</h4>
                          <div className="space-y-2">
                            {validation.warnings.map((warning, index) => (
                              <div key={index} className={`text-sm text-orange-600 flex items-start gap-3 p-3 border border-orange-200 rounded-xl ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {validation.suggestions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className={`font-semibold text-blue-600`}>Suggestions:</h4>
                          <div className="space-y-2">
                            {validation.suggestions.map((suggestion, index) => (
                              <div key={index} className={`text-sm text-blue-600 flex items-start gap-3 p-3 border border-blue-200 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 'preview' && previewData && (
              <div className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Assignment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{previewData.summary.totalItems}</div>
                        <div className="text-sm text-blue-600">Total Items</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">{previewData.summary.totalClients}</div>
                        <div className="text-sm text-green-600">Unique Clients</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <div className="text-2xl font-bold text-purple-600">{previewData.summary.estimatedDuration}</div>
                        <div className="text-sm text-purple-600">Est. Duration</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded">
                        <div className="text-2xl font-bold text-orange-600">{operationItems.length}</div>
                        <div className="text-sm text-orange-600">Operations</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Items Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Items Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {previewData.items.map((item, index) => (
                        <div key={index} className="p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{item.itemName}</div>
                              <div className="text-sm text-slate-600">
                                {item.clientCount} client{item.clientCount > 1 ? 's' : ''} • Start: {item.item.start_date}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                {item.clientNames.slice(0, 3).join(', ')}
                                {item.clientNames.length > 3 && ` and ${item.clientNames.length - 3} more`}
                              </div>
                            </div>
                            <Badge variant="outline">
                              {item.clientCount} clients
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Warnings */}
                {previewData.warnings.length > 0 && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-800">
                        <AlertCircle className="w-5 h-5" />
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {previewData.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-orange-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {currentStep === 'execute' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Execute Bulk Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-800 mb-2">
                        Ready to Execute
                      </h3>
                      <p className="text-slate-600 mb-4">
                        This will assign {previewData?.summary.totalItems} items to {previewData?.summary.totalClients} clients.
                        Estimated duration: {previewData?.summary.estimatedDuration}
                      </p>
                      <div className="text-sm text-slate-500">
                        The operation will run in the background and you will be notified when complete.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200/50 p-6">
            <div className="flex items-center justify-between">
              <div className={`text-sm ${theme.textSecondary}`}>
                {currentStep === 'setup' && (
                  <div className="flex items-center gap-2">
                    {operationItems.length > 0 ? (
                      <div className={`flex items-center gap-2 text-green-600`}>
                        <CheckCircle className="w-4 h-4" />
                        {operationItems.length} operation{operationItems.length !== 1 ? 's' : ''} configured
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 ${theme.textSecondary}`}>
                        <AlertCircle className="w-4 h-4" />
                        Add operation items to continue
                      </div>
                    )}
                  </div>
                )}
                {currentStep === 'configure' && (
                  <div className="flex items-center gap-2">
                    {validation?.isValid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Configuration valid
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        Fix validation errors
                      </div>
                    )}
                  </div>
                )}
                {currentStep === 'preview' && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Eye className="w-4 h-4" />
                    Review and execute
                  </div>
                )}
                {currentStep === 'execute' && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Zap className="w-4 h-4" />
                    Ready to execute
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
                >
                  Cancel
                </Button>
                {currentStep !== 'setup' && (
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className={`rounded-xl ${theme.textSecondary} hover:${theme.text}`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                {currentStep !== 'execute' && (
                  <Button 
                    onClick={nextStep}
                    disabled={!canProceedToNextStep()}
                    className={`rounded-xl ${theme.primary} hover:opacity-90 transition-all duration-200`}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {currentStep === 'execute' && (
                  <Button 
                    onClick={handleExecute}
                    disabled={assigning || !validation?.isValid}
                    className={`rounded-xl bg-green-600 hover:bg-green-700 text-white transition-all duration-200`}
                  >
                    {assigning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Execute Assignment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
