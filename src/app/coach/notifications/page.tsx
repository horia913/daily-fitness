'use client'

import { useState, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { FloatingParticles } from '@/components/ui/FloatingParticles'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  Send,
  Users,
  Calendar,
  Target,
  Award,
  MessageCircle,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  ArrowRight,
  Sparkles,
  Activity,
  Star,
  Copy,
  UserPlus,
  Filter,
  SortAsc,
  Search,
  Flag,
  Timer,
  DollarSign,
  Package,
  Gift,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Today,
  Grid,
  List,
  MapPin,
  Phone,
  Mail,
  Video,
  Home,
  Building,
  Coffee,
  Dumbbell,
  Heart,
  Smile,
  ThumbsUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Info,
  Trophy,
  Flame,
  Apple,
  Plus,
  X,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  TrendingUp
} from 'lucide-react'

export default function CoachNotifications() {
  const { getThemeStyles, performanceSettings } = useTheme()
  const theme = getThemeStyles()
  
  const [notificationType, setNotificationType] = useState('')
  const [message, setMessage] = useState('')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [notificationTitle, setNotificationTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [schedule, setSchedule] = useState('now')
  const [priority, setPriority] = useState('normal')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('send')

  // Enhanced notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState({
    clientActivity: {
      workoutCompleted: true,
      goalAchieved: true,
      sessionMissed: true,
      progressUpdate: true
    },
    messaging: {
      newMessage: true,
      messageReply: true,
      urgentMessage: true
    },
    systemAlerts: {
      maintenanceNotice: true,
      featureUpdate: true,
      securityAlert: true
    },
    deliveryMethod: 'in-app', // 'in-app', 'email', 'both'
    frequency: 'instant' // 'instant', 'daily-digest', 'weekly-summary'
  })

  const notificationTypes = [
    { value: 'workout_reminder', label: 'Workout Reminder', icon: Calendar, color: 'from-blue-500 to-blue-600' },
    { value: 'goal_reminder', label: 'Goal Reminder', icon: Target, color: 'from-green-500 to-green-600' },
    { value: 'achievement', label: 'Achievement', icon: Award, color: 'from-yellow-500 to-yellow-600' },
    { value: 'message', label: 'Message', icon: MessageCircle, color: 'from-purple-500 to-purple-600' },
    { value: 'general', label: 'General', icon: Bell, color: 'from-slate-500 to-slate-600' }
  ]

  const clients = [
    { id: '1', name: 'John Smith', email: 'john@example.com', avatar: 'JS' },
    { id: '2', name: 'Maria Johnson', email: 'maria@example.com', avatar: 'MJ' },
    { id: '3', name: 'David Kim', email: 'david@example.com', avatar: 'DK' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', avatar: 'SW' }
  ]

  const handleSendNotification = useCallback(() => {
    // Handle sending notification
    console.log('Sending notification:', { 
      notificationType, 
      notificationTitle, 
      messageContent, 
      selectedClients, 
      schedule, 
      priority 
    })
  }, [notificationType, notificationTitle, messageContent, selectedClients, schedule, priority])

  const handleClientToggle = useCallback((clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }, [])

  const handleSelectAllClients = useCallback(() => {
    const filteredClients = getFilteredClients()
    const allSelected = filteredClients.every(client => selectedClients.includes(client.id))
    
    if (allSelected) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(client => client.id))
    }
  }, [selectedClients])

  const getFilteredClients = useCallback(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  const getClientAvatarColor = useCallback((name: string) => {
    const colors = [
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-pink-500 to-pink-600'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }, [])

  return (
    <ProtectedRoute requiredRole="coach">
      <AnimatedBackground>
        {performanceSettings.floatingParticles && <FloatingParticles />}
        <div className="min-h-screen">
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Enhanced Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`p-3 rounded-2xl ${theme.gradient} ${theme.shadow}`}>
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <h1 className={`text-4xl font-bold ${theme.text} bg-gradient-to-r from-purple-600 via-orange-500 to-green-500 bg-clip-text text-transparent`}>
                  Notification Management
                </h1>
              </div>
              <p className={`text-lg ${theme.textSecondary} max-w-2xl mx-auto`}>
                Send notifications to clients and manage your notification preferences
              </p>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full grid-cols-3 ${theme.card} ${theme.shadow} rounded-2xl p-2`}>
                <TabsTrigger 
                  value="send" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow}`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="preferences" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Preferences
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className={`rounded-xl data-[state=active]:${theme.gradient} data-[state=active]:text-white data-[state=active]:${theme.shadow}`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="space-y-6">
                {/* Enhanced Notification Types */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                Notification Types
              </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                Choose the type of notification to send
              </CardDescription>
            </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notificationTypes.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <Button
                      key={type.value}
                            variant="outline"
                            className={`h-20 flex flex-col gap-2 justify-center rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                              notificationType === type.value 
                                ? `border-purple-500 bg-purple-50 dark:bg-purple-900/20 ${theme.shadow}` 
                                : `${theme.border} hover:bg-slate-50 dark:hover:bg-slate-800`
                            }`}
                      onClick={() => setNotificationType(type.value)}
                    >
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${type.color} ${theme.shadow}`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <span className={`text-sm font-medium ${theme.text}`}>{type.label}</span>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

                {/* Enhanced Client Selection */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>
                Select Clients
              </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                Choose which clients will receive this notification
              </CardDescription>
            </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Enhanced Search */}
                      <div className="relative">
                        <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                        <Input
                          placeholder="Search clients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`pl-12 h-12 rounded-xl border-2 ${theme.border} ${theme.text} bg-transparent focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500`}
                        />
                      </div>

                      {/* Enhanced Select All/Clear All */}
                      <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                          onClick={handleSelectAllClients}
                          className={`${theme.border} ${theme.text} rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all`}
                  >
                          <CheckCircle className="w-4 h-4 mr-2" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClients([])}
                          className={`${theme.border} ${theme.text} rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all`}
                  >
                          <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                        <span className={`text-sm ${theme.textSecondary} ml-auto`}>
                          {selectedClients.length} of {getFilteredClients().length} selected
                        </span>
                </div>

                      {/* Enhanced Client Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getFilteredClients().map((client) => (
                    <div
                      key={client.id}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                        selectedClients.includes(client.id)
                                ? `border-purple-500 bg-purple-50 dark:bg-purple-900/20 ${theme.shadow}`
                                : `${theme.border} hover:bg-slate-50 dark:hover:bg-slate-800`
                            }`}
                            onClick={() => handleClientToggle(client.id)}
                    >
                      <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${getClientAvatarColor(client.name)} ${theme.shadow} flex items-center justify-center text-white font-bold text-sm`}>
                                  {client.avatar}
                                </div>
                        <div>
                                  <p className={`font-medium ${theme.text}`}>{client.name}</p>
                                  <p className={`text-sm ${theme.textSecondary}`}>{client.email}</p>
                                </div>
                        </div>
                        {selectedClients.includes(client.id) && (
                                <div className={`p-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

                {/* Enhanced Message Composition */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                Compose Message
              </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                Write your notification message
              </CardDescription>
            </CardHeader>
                  <CardContent className="p-6 space-y-6">
              <div>
                      <Label htmlFor="notification-title" className={`${theme.text} font-medium`}>
                  Notification Title
                      </Label>
                <Input
                        id="notification-title"
                  placeholder="Enter notification title..."
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12 mt-2`}
                />
              </div>
              
              <div>
                      <Label htmlFor="message-content" className={`${theme.text} font-medium`}>
                  Message Content
                      </Label>
                <Textarea
                        id="message-content"
                  placeholder="Write your message here..."
                  rows={4}
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        className={`${theme.border} ${theme.text} bg-transparent rounded-xl resize-none mt-2`}
                />
              </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="schedule" className={`${theme.text} font-medium`}>
                    Schedule
                        </Label>
                        <Select value={schedule} onValueChange={setSchedule}>
                          <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12 mt-2`}>
                      <SelectValue placeholder="Send now" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Now</SelectItem>
                      <SelectItem value="later">Schedule for Later</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                      <div>
                        <Label htmlFor="priority" className={`${theme.text} font-medium`}>
                    Priority
                        </Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12 mt-2`}>
                      <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

                {/* Enhanced Preview & Send */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                Preview & Send
              </CardTitle>
            </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Enhanced Preview */}
                      <div className={`p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 rounded-xl border-2 ${theme.border}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                            <Bell className="w-5 h-5 text-white" />
                          </div>
                          <span className={`font-medium ${theme.text}`}>Notification Preview</span>
                        </div>
                        <div className={`p-4 ${theme.card} rounded-xl ${theme.shadow} border-2 ${theme.border}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow} flex items-center justify-center`}>
                              <Bell className="w-4 h-4 text-white" />
                  </div>
                            <div className="flex-1">
                              <h4 className={`font-bold ${theme.text} mb-1`}>
                                {notificationTitle || 'Notification Title'}
                              </h4>
                              <p className={`text-sm ${theme.textSecondary} mb-2`}>
                                {messageContent || 'Your notification message will appear here...'}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl px-3 py-1">
                                  {notificationTypes.find(t => t.value === notificationType)?.label || 'General'}
                                </Badge>
                                <Badge className={`${priority === 'high' ? 'bg-red-100 text-red-800' : priority === 'low' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} rounded-xl px-3 py-1`}>
                                  {priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                </div>

                      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className={`w-4 h-4 ${theme.textSecondary}`} />
                            <span className={`${theme.textSecondary}`}>
                              {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className={`w-4 h-4 ${theme.textSecondary}`} />
                            <span className={`${theme.textSecondary}`}>
                              {schedule === 'now' ? 'Send immediately' : `Scheduled: ${schedule}`}
                            </span>
                          </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                          <Button 
                            variant="outline"
                            className={`${theme.border} ${theme.text} rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all`}
                          >
                      <Clock className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>
                          <Button 
                            onClick={handleSendNotification}
                            className={`${theme.gradient} ${theme.shadow} hover:scale-105 transition-all duration-200 rounded-xl px-6 py-3`}
                            disabled={!notificationType || !selectedClients.length || !notificationTitle || !messageContent}
                          >
                      <Send className="w-4 h-4 mr-2" />
                      Send Notification
                            <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                {/* Enhanced Notification Preferences */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      Client Activity Notifications
                    </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      Choose which client activities you want to be notified about
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center gap-3">
                          <Dumbbell className="w-5 h-5 text-green-600" />
                          <div>
                            <h4 className={`font-medium ${theme.text}`}>Workout Completed</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>Get notified when clients complete workouts</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notificationPreferences.clientActivity.workoutCompleted}
                          onCheckedChange={(checked) => setNotificationPreferences(prev => ({
                            ...prev,
                            clientActivity: { ...prev.clientActivity, workoutCompleted: checked }
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-yellow-600" />
                          <div>
                            <h4 className={`font-medium ${theme.text}`}>Goal Achieved</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>Get notified when clients reach their goals</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notificationPreferences.clientActivity.goalAchieved}
                          onCheckedChange={(checked) => setNotificationPreferences(prev => ({
                            ...prev,
                            clientActivity: { ...prev.clientActivity, goalAchieved: checked }
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <h4 className={`font-medium ${theme.text}`}>Session Missed</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>Get notified when clients miss scheduled sessions</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notificationPreferences.clientActivity.sessionMissed}
                          onCheckedChange={(checked) => setNotificationPreferences(prev => ({
                            ...prev,
                            clientActivity: { ...prev.clientActivity, sessionMissed: checked }
                          }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className={`font-medium ${theme.text}`}>Progress Update</h4>
                            <p className={`text-sm ${theme.textSecondary}`}>Get notified when clients update their progress</p>
                          </div>
                        </div>
                        <Switch 
                          checked={notificationPreferences.clientActivity.progressUpdate}
                          onCheckedChange={(checked) => setNotificationPreferences(prev => ({
                            ...prev,
                            clientActivity: { ...prev.clientActivity, progressUpdate: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Settings */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 ${theme.shadow}`}>
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      Delivery Settings
                    </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      Configure how and when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <Label className={`${theme.text} font-medium`}>Delivery Method</Label>
                      <Select 
                        value={notificationPreferences.deliveryMethod} 
                        onValueChange={(value) => setNotificationPreferences(prev => ({ ...prev, deliveryMethod: value }))}
                      >
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12 mt-2`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-app">In-App Only</SelectItem>
                          <SelectItem value="email">Email Only</SelectItem>
                          <SelectItem value="both">Both In-App and Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className={`${theme.text} font-medium`}>Notification Frequency</Label>
                      <Select 
                        value={notificationPreferences.frequency} 
                        onValueChange={(value) => setNotificationPreferences(prev => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger className={`${theme.border} ${theme.text} bg-transparent rounded-xl h-12 mt-2`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant Notifications</SelectItem>
                          <SelectItem value="daily-digest">Daily Digest</SelectItem>
                          <SelectItem value="weekly-summary">Weekly Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                {/* Enhanced Notification History */}
                <Card className={`${theme.card} ${theme.shadow} rounded-2xl`}>
                  <CardHeader className="p-6">
                    <CardTitle className={`flex items-center gap-3 ${theme.text}`}>
                      <div className={`p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 ${theme.shadow}`}>
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                Recent Notifications
              </CardTitle>
                    <CardDescription className={`${theme.textSecondary}`}>
                      Your recently sent notifications and their status
              </CardDescription>
            </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-700">
                        <div className={`p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${theme.shadow}`}>
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                  <div className="flex-1">
                          <p className={`font-medium ${theme.text}`}>Workout Reminder - Morning Session</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Sent to 4 clients • 2 hours ago</p>
                  </div>
                        <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl px-3 py-1">
                          Delivered
                        </Badge>
                </div>

                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700">
                        <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${theme.shadow}`}>
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                  <div className="flex-1">
                          <p className={`font-medium ${theme.text}`}>Goal Achievement Celebration</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Sent to John Smith • 1 day ago</p>
                  </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-3 py-1">
                          Delivered
                        </Badge>
                </div>

                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200 dark:border-amber-700">
                        <div className={`p-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 ${theme.shadow}`}>
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                  <div className="flex-1">
                          <p className={`font-medium ${theme.text}`}>Session Reschedule Notice</p>
                          <p className={`text-sm ${theme.textSecondary}`}>Sent to Maria Johnson • 2 days ago</p>
                  </div>
                        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl px-3 py-1">
                          Pending
                        </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AnimatedBackground>
    </ProtectedRoute>
  )
}
