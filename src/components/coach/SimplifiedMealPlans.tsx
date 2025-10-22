'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { MealPlanService, MealPlan, Meal } from '@/lib/mealPlanService'
import { DatabaseService, Client } from '@/lib/database'
import MealCreator from './MealCreator'
import { 
  Search, 
  ChefHat, 
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  RefreshCw
} from 'lucide-react'

export default function SimplifiedMealPlans() {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  const { user } = useAuth()
  
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMealPlan, setEditingMealPlan] = useState<MealPlan | null>(null)
  const [showMealPlanDetails, setShowMealPlanDetails] = useState(false)
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [showMealCreator, setShowMealCreator] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [selectedMealPlanForAssignment, setSelectedMealPlanForAssignment] = useState<MealPlan | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  
  const [createForm, setCreateForm] = useState({
    name: '',
    target_calories: '',
    description: ''
  })
  const [editForm, setEditForm] = useState({
    name: '',
    target_calories: '',
    description: ''
  })

  useEffect(() => {
    if (user) {
      loadMealPlans()
    }
  }, [user])

  useEffect(() => {
    if (showMealPlanDetails && selectedMealPlan) {
      console.log('Meal plan details modal opened for:', selectedMealPlan.id)
      console.log('Current meals state:', meals)
    }
  }, [showMealPlanDetails, selectedMealPlan, meals])

  useEffect(() => {
    if (editingMealPlan) {
      setEditForm({
        name: editingMealPlan.name || '',
        target_calories: editingMealPlan.target_calories?.toString() || '',
        description: editingMealPlan.description || ''
      })
    }
  }, [editingMealPlan])

  const loadMealPlans = async () => {
    try {
      if (!user) return

      const mealPlans = await MealPlanService.getMealPlans(user.id)
      
      // Add mock stats for demo
      const mealPlansWithStats = mealPlans.map(plan => ({
        ...plan,
        meal_count: Math.floor(Math.random() * 7) + 1,
        usage_count: Math.floor(Math.random() * 20)
      }))
      
      setMealPlans(mealPlansWithStats)
    } catch (error) {
      console.error('Error loading meal plans:', error)
    }
  }

  const loadMeals = async (mealPlanId: string) => {
    try {
      console.log('Loading meals for mealPlanId:', mealPlanId)
      const meals = await MealPlanService.getMeals(mealPlanId)
      console.log('Loaded meals:', meals)
      setMeals(meals)
    } catch (error) {
      console.error('Error loading meals:', error)
    }
  }

  const handleCreateMealPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      if (!user) return

      await MealPlanService.createMealPlan({
        name: createForm.name,
        target_calories: createForm.target_calories ? parseInt(createForm.target_calories) : null,
        coach_id: user.id,
        is_active: true
      })

      setShowCreateForm(false)
      setCreateForm({
        name: '',
        target_calories: '',
        description: ''
      })
      loadMealPlans()
      alert('Meal plan created successfully!')
    } catch (error) {
      console.error('Error creating meal plan:', error)
      alert('Error creating meal plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMealPlan = async () => {
    if (!editingMealPlan) return
    
    try {
      setLoading(true)
      if (!user) return

      await MealPlanService.updateMealPlan(editingMealPlan.id, {
        name: editForm.name,
        description: editForm.description,
        target_calories: editForm.target_calories ? parseInt(editForm.target_calories) : null
      })

      setEditingMealPlan(null)
      setEditForm({
        name: '',
        target_calories: '',
        description: ''
      })
      loadMealPlans()
      alert('Meal plan updated successfully!')
    } catch (error) {
      console.error('Error updating meal plan:', error)
      alert('Error updating meal plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) return
    
    try {
      setLoading(true)
      await MealPlanService.deleteMealPlan(id)
      loadMealPlans()
      alert('Meal plan deleted successfully!')
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      alert('Error deleting meal plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleMealSaved = async () => {
    if (selectedMealPlan) {
      await loadMeals(selectedMealPlan.id)
    }
  }

  const handleAssignMealPlan = async (mealPlan: MealPlan) => {
    setSelectedMealPlanForAssignment(mealPlan)
    setSelectedClients([])
    
    // Load clients for this coach
    if (user?.id) {
      try {
        const coachClients = await DatabaseService.getClients(user.id)
        setClients(coachClients)
      } catch (error) {
        console.error('Error loading clients:', error)
        alert('Error loading clients. Please try again.')
        return
      }
    }
    
    setShowAssignmentModal(true)
  }

  const filteredMealPlans = mealPlans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <Button
            onClick={loadMealPlans}
            style={{
              flex: 1,
              borderRadius: '20px',
              padding: '16px 32px',
              fontSize: '14px',
              fontWeight: '600',
              border: '2px solid #E5E7EB',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            style={{
              flex: 1,
              borderRadius: '20px',
              padding: '16px 32px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Create Meal Plan
          </Button>
        </div>
      </div>

      {/* Meal Plans Grid */}
      {filteredMealPlans.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          textAlign: 'center'
        }}>
          <div style={{
            paddingTop: '48px',
            paddingBottom: '48px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ChefHat style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1A1A1A',
              marginBottom: '12px'
            }}>No meal plans found</h3>
            <p style={{
              fontSize: '16px',
              fontWeight: '400',
              color: '#6B7280',
              marginBottom: '24px'
            }}>
              Create your first meal plan to get started with nutrition planning.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              style={{
                borderRadius: '20px',
                padding: '16px 32px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Create Your First Meal Plan
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMealPlans.map((plan, index) => {
            // Different gradient backgrounds for each card - better distribution
            const gradients = [
              'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30',
              'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30',
              'bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/30',
              'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30',
              'bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/30',
              'bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/30',
              'bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/30',
              'bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/30',
              'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/30',
              'bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/30'
            ]
            // Create a hash from the entire ID for better distribution
            const hash = plan.id.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0)
              return a & a
            }, 0)
            const gradientClass = gradients[Math.abs(hash) % gradients.length]
            
            return (
              <div 
                key={plan.id} 
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid #E5E7EB'
                }}
                onClick={() => {
                  setSelectedMealPlan(plan)
                  setShowMealPlanDetails(true)
                  loadMeals(plan.id)
                }}
              >
                <div style={{ padding: '24px' }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '20px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1A1A1A',
                        marginBottom: '8px'
                      }}>{plan.name}</h3>
                      <p style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#6B7280',
                        lineHeight: '1.5'
                      }}>
                        {plan.description || 'No description'}
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingMealPlan(plan)
                      }}
                      style={{
                        borderRadius: '16px',
                        padding: '8px',
                        border: '2px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        marginLeft: '12px'
                      }}
                    >
                      <Edit style={{ width: '16px', height: '16px', color: '#6B7280' }} />
                    </Button>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#6B7280'
                      }}>Target Calories</span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1A1A1A'
                      }}>
                        {plan.target_calories || 'Not set'}
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#EDE7F6',
                      borderRadius: '16px',
                      border: '2px solid #6C5CE7'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#6B7280'
                      }}>Meals</span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1A1A1A'
                      }}>
                        {plan.meal_count || 0}
                      </span>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#D1FAE5',
                      borderRadius: '16px',
                      border: '2px solid #4CAF50'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#6B7280'
                      }}>Usage</span>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1A1A1A'
                      }}>
                        {plan.usage_count || 0} clients
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '16px',
                    borderTop: '2px solid #E5E7EB'
                  }}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMealPlan(plan)
                        setShowMealPlanDetails(true)
                        loadMeals(plan.id)
                      }}
                      style={{
                        flex: 1,
                        borderRadius: '20px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      Manage Meals
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssignMealPlan(plan)
                      }}
                      style={{
                        borderRadius: '20px',
                        padding: '10px',
                        border: '2px solid #4CAF50',
                        color: '#4CAF50',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <Users style={{ width: '16px', height: '16px' }} />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteMealPlan(plan.id)
                      }}
                      style={{
                        borderRadius: '20px',
                        padding: '10px',
                        border: '2px solid #EF4444',
                        color: '#EF4444',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Meal Plan Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '448px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1A1A1A'
              }}>Create Meal Plan</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  fontSize: '24px',
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px'
            }}>
              <form onSubmit={handleCreateMealPlan} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Meal Plan Name *</label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%'
                    }}
                    required
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Target Calories</label>
                  <Input
                    type="number"
                    value={createForm.target_calories}
                    onChange={(e) => setCreateForm({...createForm, target_calories: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%'
                    }}
                    placeholder="e.g., 2000"
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%',
                      minHeight: '96px',
                      resize: 'vertical'
                    }}
                    rows={3}
                    placeholder="Describe this meal plan..."
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  paddingTop: '16px'
                }}>
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    style={{
                      flex: 1,
                      borderRadius: '20px',
                      padding: '16px 32px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {loading ? 'Creating...' : 'Create Meal Plan'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setShowCreateForm(false)} 
                    style={{
                      borderRadius: '20px',
                      padding: '16px 32px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #E5E7EB',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Plan Modal */}
      {editingMealPlan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '448px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1A1A1A'
              }}>Edit Meal Plan</h2>
              <button
                onClick={() => setEditingMealPlan(null)}
                style={{
                  fontSize: '24px',
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px'
            }}>
              <form onSubmit={handleUpdateMealPlan} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Meal Plan Name *</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%'
                    }}
                    required
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Target Calories</label>
                  <Input
                    type="number"
                    value={editForm.target_calories}
                    onChange={(e) => setEditForm({...editForm, target_calories: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%'
                    }}
                    placeholder="e.g., 2000"
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1A1A1A'
                  }}>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    style={{
                      borderRadius: '16px',
                      border: '2px solid #E5E7EB',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '400',
                      width: '100%',
                      minHeight: '96px',
                      resize: 'vertical'
                    }}
                    rows={3}
                    placeholder="Describe this meal plan..."
                  />
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  paddingTop: '16px'
                }}>
                  <Button 
                    onClick={handleUpdateMealPlan}
                    disabled={loading}
                    style={{
                      flex: 1,
                      borderRadius: '20px',
                      padding: '16px 32px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setEditingMealPlan(null)}
                    style={{
                      borderRadius: '20px',
                      padding: '16px 32px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #E5E7EB',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Meal Plan Details Modal */}
      {showMealPlanDetails && selectedMealPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 pt-20 pb-20 z-[9999]">
          <Card className={`w-full max-w-4xl h-[87.5vh] flex flex-col overflow-hidden ${theme.card} ${theme.shadow} rounded-2xl`}>
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className={`text-xl font-semibold ${theme.text}`}>Meal Plan Details</h2>
                <p className={`text-sm ${theme.textSecondary}`}>{selectedMealPlan.name}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowMealCreator(true)}
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Meal
                </Button>
                <button
                  onClick={() => setShowMealPlanDetails(false)}
                  className={`${theme.textSecondary} hover:${theme.text} text-2xl`}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {meals.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>No meals added yet</h3>
                  <p className={`${theme.textSecondary} mb-6`}>Start building your meal plan by adding individual meals.</p>
                  <Button 
                    onClick={() => setShowMealCreator(true)}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Meal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {meals.map((meal, index) => {
                    // Different gradient backgrounds for meal cards
                    const mealGradients = [
                      'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/20',
                      'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/20',
                      'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/20',
                      'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/20'
                    ]
                    const mealGradientClass = mealGradients[index % mealGradients.length]
                    
                    return (
                      <Card key={index} className={`${mealGradientClass} ${theme.shadow} rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-shadow duration-200 ring-1 ring-slate-200/10 dark:ring-slate-700/10`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50 shadow-sm">
                                {meal.meal_type}
                              </Badge>
                              {meal.day_of_week && (
                                <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600 shadow-sm">
                                  Day {meal.day_of_week}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-5 gap-4 text-sm">
                              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className={`font-bold ${theme.text}`}>
                                  {Math.round(meal.total_calories)}
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Calories</div>
                              </div>
                              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className={`font-bold text-green-600 dark:text-green-400`}>
                                  {Math.round(meal.total_protein)}g
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Protein</div>
                              </div>
                              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className={`font-bold text-blue-600 dark:text-blue-400`}>
                                  {Math.round(meal.total_carbs)}g
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Carbs</div>
                              </div>
                              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className={`font-bold text-yellow-600 dark:text-yellow-400`}>
                                  {Math.round(meal.total_fat)}g
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Fat</div>
                              </div>
                              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className={`font-bold text-purple-600 dark:text-purple-400`}>
                                  {Math.round(meal.total_fiber)}g
                                </div>
                                <div className={`text-xs ${theme.textSecondary}`}>Fiber</div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className={`text-sm ${theme.textSecondary} mb-2`}>
                                {meal.items.length} food item{meal.items.length !== 1 ? 's' : ''}
                              </p>
                              {meal.items.length > 0 && (
                                <div className="space-y-1">
                                  {meal.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center justify-between text-xs bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg p-2 border border-slate-200/40 dark:border-slate-600/40 shadow-sm">
                                      <span className={`${theme.text} font-medium`}>
                                        {item.food?.name || 'Unknown Food'}
                                      </span>
                                      <span className={`${theme.textSecondary}`}>
                                        {item.quantity}g
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowMealPlanDetails(false)}
                className={`${theme.border} ${theme.textSecondary} rounded-xl`}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Meal Creator Modal */}
      {showMealCreator && selectedMealPlan && (
        <MealCreator
          mealPlanId={selectedMealPlan.id}
          onClose={() => setShowMealCreator(false)}
          onSave={handleMealSaved}
        />
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedMealPlanForAssignment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '448px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1A1A1A'
                }}>Assign Meal Plan</h2>
                <p style={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#6B7280'
                }}>{selectedMealPlanForAssignment.name}</p>
              </div>
              <button
                onClick={() => setShowAssignmentModal(false)}
                style={{
                  fontSize: '24px',
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px'
            }}>
              {clients.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users style={{ width: '32px', height: '32px', color: '#FFFFFF' }} />
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1A1A1A',
                    marginBottom: '8px'
                  }}>No clients found</h3>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#6B7280'
                  }}>You don't have any active clients to assign this meal plan to.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '320px',
                    overflowY: 'auto'
                  }}>
                    {clients.map((client) => {
                      const isSelected = selectedClients.includes(client.client_id)
                      return (
                        <div 
                          key={client.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            borderRadius: '20px',
                            border: isSelected ? '2px solid #4CAF50' : '2px solid #E5E7EB',
                            backgroundColor: isSelected ? '#D1FAE5' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClients(selectedClients.filter(id => id !== client.client_id))
                            } else {
                              setSelectedClients([...selectedClients, client.client_id])
                            }
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '2px solid',
                            borderColor: isSelected ? '#4CAF50' : '#E5E7EB',
                            backgroundColor: isSelected ? '#4CAF50' : '#FFFFFF'
                          }}>
                            {isSelected && (
                              <svg style={{ width: '12px', height: '12px', color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1A1A1A'
                            }}>
                              {client.profiles?.first_name} {client.profiles?.last_name}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '400',
                              color: '#6B7280'
                            }}>
                              {client.profiles?.email}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '16px'
                  }}>
                    <Button
                      onClick={() => setShowAssignmentModal(false)}
                      style={{
                        flex: 1,
                        borderRadius: '20px',
                        padding: '16px 32px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: '2px solid #E5E7EB',
                        color: '#6B7280',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (selectedClients.length === 0) {
                          alert('Please select at least one client.')
                          return
                        }
                        
                        try {
                          await MealPlanService.assignMealPlanToClients(
                            selectedMealPlanForAssignment.id,
                            selectedClients,
                            user?.id || ''
                          )
                          alert(`Meal plan assigned to ${selectedClients.length} client(s) successfully!`)
                          setShowAssignmentModal(false)
                          setSelectedClients([])
                        } catch (error) {
                          console.error('Error assigning meal plan:', error)
                          alert('Error assigning meal plan. Please try again.')
                        }
                      }}
                      disabled={selectedClients.length === 0}
                      style={{
                        flex: 1,
                        borderRadius: '20px',
                        padding: '16px 32px',
                        fontSize: '14px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        opacity: selectedClients.length === 0 ? 0.5 : 1
                      }}
                    >
                      Assign to {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
