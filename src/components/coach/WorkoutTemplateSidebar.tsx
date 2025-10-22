'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  Search,
  Filter,
  Dumbbell,
  Clock,
  Target,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Upload,
  Share2,
  MessageCircle,
  Bell,
  BellOff,
  Lock,
  Unlock,
  Globe,
  Shield,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Timer as TimerIcon,
  Target as TargetIcon,
  TrendingUp as TrendingUpIcon,
  BarChart3 as BarChart3Icon,
  PieChart,
  LineChart,
  Activity as ActivityIcon,
  Zap as ZapIcon,
  Heart as HeartIcon,
  Dumbbell as DumbbellIcon,
  Award as AwardIcon,
  Star as StarIcon,
  Trophy,
  Medal,
  Crown,
  Gem,
  Sparkles,
  Flame,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  TreePine,
  Leaf,
  Flower,
  Bug,
  Fish,
  Bird,
  Cat,
  Dog,
  Rabbit,
  Car,
  Bike,
  Plane,
  Train,
  Ship,
  Rocket,
  Home,
  Building,
  School,
  Hospital,
  Bank,
  Store,
  Factory,
  Warehouse,
  Office,
  Library,
  Museum,
  Theater,
  Stadium,
  Park,
  Beach,
  Mountain,
  Forest,
  Desert,
  Island,
  Bridge,
  Tower,
  Castle,
  Church,
  Mosque,
  Temple,
  Synagogue,
  Cemetery,
  Garden,
  Farm,
  Barn,
  Windmill,
  Lighthouse,
  Tent,
  Cabin,
  House,
  Apartment,
  Condo,
  Villa,
  Mansion,
  Palace,
  Skyscraper,
  Observatory,
  Laboratory,
  Workshop,
  Garage,
  Shed,
  Greenhouse,
  Stable,
  Kennel,
  Aviary,
  Aquarium,
  Zoo,
  Circus,
  Carnival,
  Fair,
  Market,
  Mall,
  Shopping,
  Restaurant,
  Cafe,
  Bar,
  Hotel,
  Motel,
  Hostel,
  Campground,
  Resort,
  Spa,
  Gym,
  Pool,
  Beach,
  Lake,
  River,
  Ocean,
  Sea,
  Bay,
  Harbor,
  Port,
  Dock,
  Pier,
  Lighthouse,
  Buoy,
  Anchor,
  Sail,
  Mast,
  Rudder,
  Propeller,
  Engine,
  Motor,
  Battery,
  Fuel,
  Oil,
  Water,
  Fire,
  Ice,
  Snow,
  Rain,
  Storm,
  Lightning,
  Thunder,
  Tornado,
  Hurricane,
  Earthquake,
  Volcano,
  Tsunami,
  Flood,
  Drought,
  Heat,
  Cold,
  Warm,
  Cool,
  Hot,
  Freeze,
  Melt,
  Boil,
  Steam,
  Smoke,
  Fog,
  Mist,
  Dew,
  Frost,
  Hail,
  Sleet,
  Blizzard,
  Avalanche,
  Landslide,
  Erosion,
  Sediment,
  Rock,
  Stone,
  Pebble,
  Sand,
  Dirt,
  Soil,
  Clay,
  Mud,
  Dust,
  Ash,
  Lava,
  Magma,
  Crystal,
  Gem,
  Diamond,
  Ruby,
  Emerald,
  Sapphire,
  Pearl,
  Gold,
  Silver,
  Copper,
  Iron,
  Steel,
  Aluminum,
  Titanium,
  Platinum,
  Uranium,
  Radium,
  Carbon,
  Oxygen,
  Hydrogen,
  Nitrogen,
  Helium,
  Neon,
  Argon,
  Krypton,
  Xenon,
  Radon,
  Fluorine,
  Chlorine,
  Bromine,
  Iodine,
  Astatine,
  Lithium,
  Sodium,
  Potassium,
  Rubidium,
  Cesium,
  Francium,
  Beryllium,
  Magnesium,
  Calcium,
  Strontium,
  Barium,
  Radium,
  Scandium,
  Yttrium,
  Lanthanum,
  Actinium,
  Titanium,
  Zirconium,
  Hafnium,
  Rutherfordium,
  Vanadium,
  Niobium,
  Tantalum,
  Dubnium,
  Chromium,
  Molybdenum,
  Tungsten,
  Seaborgium,
  Manganese,
  Technetium,
  Rhenium,
  Bohrium,
  Iron,
  Ruthenium,
  Osmium,
  Hassium,
  Cobalt,
  Rhodium,
  Iridium,
  Meitnerium,
  Nickel,
  Palladium,
  Platinum,
  Darmstadtium,
  Copper,
  Silver,
  Gold,
  Roentgenium,
  Zinc,
  Cadmium,
  Mercury,
  Copernicium,
  Boron,
  Aluminum,
  Gallium,
  Indium,
  Thallium,
  Nihonium,
  Carbon,
  Silicon,
  Germanium,
  Tin,
  Lead,
  Flerovium,
  Nitrogen,
  Phosphorus,
  Arsenic,
  Antimony,
  Bismuth,
  Moscovium,
  Oxygen,
  Sulfur,
  Selenium,
  Tellurium,
  Polonium,
  Livermorium,
  Fluorine,
  Chlorine,
  Bromine,
  Iodine,
  Astatine,
  Tennessine,
  Helium,
  Neon,
  Argon,
  Krypton,
  Xenon,
  Radon,
  Oganesson
} from 'lucide-react'

interface WorkoutTemplate {
  id: string
  name: string
  description: string
  category_id: string
  estimated_duration: number
  difficulty_level: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: {
    name: string
    color: string
  }
  usage_count?: number
  rating?: number
}

interface WorkoutTemplateSidebarProps {
  templates: WorkoutTemplate[]
  onTemplateSelect: (template: WorkoutTemplate) => void
  onTemplateDrag: (template: WorkoutTemplate) => void
  isOpen: boolean
  onClose: () => void
}

export default function WorkoutTemplateSidebar({
  templates,
  onTemplateSelect,
  onTemplateDrag,
  isOpen,
  onClose
}: WorkoutTemplateSidebarProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const difficultyColors = {
    'beginner': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'intermediate': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'advanced': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const difficultyLabels = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced'
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category?.name === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty_level === selectedDifficulty
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const category = template.category?.name || 'Uncategorized'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(template)
    return groups
  }, {} as Record<string, WorkoutTemplate[]>)

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'strength': return Dumbbell
      case 'cardio': return Heart
      case 'hiit': return Zap
      case 'flexibility': return Activity
      case 'upper body': return Target
      case 'lower body': return Dumbbell
      default: return Dumbbell
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xl z-50 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${theme.text}`}>Workout Templates</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="all">All Categories</option>
            {Object.keys(groupedTemplates).map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
            const isExpanded = expandedCategories.has(category)
            const CategoryIcon = getCategoryIcon(category)
            
            return (
              <div key={category}>
                {/* Category Header */}
                <Button
                  variant="ghost"
                  onClick={() => toggleCategoryExpansion(category)}
                  className="w-full justify-between p-2 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-4 h-4" />
                    <span className="font-medium">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {categoryTemplates.length}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                {/* Category Templates */}
                {isExpanded && (
                  <div className="space-y-2 ml-6">
                    {categoryTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onTemplateSelect(template)}
                        onDrag={() => onTemplateDrag(template)}
                        difficultyColors={difficultyColors}
                        difficultyLabels={difficultyLabels}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-8">
            <Dumbbell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className={`text-sm font-medium ${theme.text} mb-1`}>No templates found</h4>
            <p className={`text-xs ${theme.textSecondary}`}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Template Card Component
interface TemplateCardProps {
  template: WorkoutTemplate
  onSelect: () => void
  onDrag: () => void
  difficultyColors: any
  difficultyLabels: any
}

function TemplateCard({ template, onSelect, onDrag, difficultyColors, difficultyLabels }: TemplateCardProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'strength': return Dumbbell
      case 'cardio': return Heart
      case 'hiit': return Zap
      case 'flexibility': return Activity
      case 'upper body': return Target
      case 'lower body': return Dumbbell
      default: return Dumbbell
    }
  }

  const CategoryIcon = getCategoryIcon(template.category?.name || '')

  return (
    <Card 
      className={`${theme.card} ${theme.shadow} rounded-xl border-2 hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={onSelect}
      draggable
      onDragStart={onDrag}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Template Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800">
            <CategoryIcon className="w-5 h-5 text-slate-500" />
          </div>

          {/* Template Info */}
          <div className="flex-1 min-w-0">
            <h5 className={`font-medium ${theme.text} text-sm truncate`}>
              {template.name}
            </h5>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${difficultyColors[template.difficulty_level]} border-0 text-xs`}>
                {difficultyLabels[template.difficulty_level]}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{template.estimated_duration}m</span>
              </div>
            </div>
          </div>

          {/* Drag Handle */}
          <div className="flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Template Description */}
        {template.description && (
          <p className={`text-xs ${theme.textSecondary} mt-2 line-clamp-2`}>
            {template.description}
          </p>
        )}

        {/* Template Stats */}
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{template.usage_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{template.rating || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
