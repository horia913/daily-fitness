'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Clock, 
  Dumbbell, 
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { 
  WorkoutBlock, 
  WorkoutBlockExercise, 
  WorkoutBlockType,
  WORKOUT_BLOCK_CONFIGS
} from '@/types/workoutBlocks'
import { WorkoutBlockService } from '@/lib/workoutBlockService'

interface WorkoutBlockBuilderProps {
  templateId: string
  blocks: WorkoutBlock[]
  onBlocksChange: (blocks: WorkoutBlock[]) => void
  availableExercises: any[]
}

export default function WorkoutBlockBuilder({
  templateId,
  blocks,
  onBlocksChange,
  availableExercises
}: WorkoutBlockBuilderProps) {
  const { getThemeStyles } = useTheme()
  const theme = getThemeStyles()
  
  const [selectedBlockType, setSelectedBlockType] = useState<WorkoutBlockType>('straight_set')
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [editingBlock, setEditingBlock] = useState<WorkoutBlock | null>(null)
  const [loading, setLoading] = useState(false)

  // Add new block
  const handleAddBlock = async () => {
    setLoading(true)
    try {
      const newBlock = await WorkoutBlockService.createWorkoutBlock(
        templateId,
        selectedBlockType,
        blocks.length + 1,
        {
          block_name: WORKOUT_BLOCK_CONFIGS[selectedBlockType].name,
          block_notes: '',
          rest_seconds: 60,
          total_sets: 3,
          reps_per_set: '10-12'
        }
      )

      if (newBlock) {
        onBlocksChange([...blocks, newBlock])
        setShowAddBlock(false)
      }
    } catch (error) {
      console.error('Error adding block:', error)
    } finally {
      setLoading(false)
    }
  }

  // Delete block
  const handleDeleteBlock = async (blockId: string) => {
    if (confirm('Are you sure you want to delete this block?')) {
      setLoading(true)
      try {
        const success = await WorkoutBlockService.deleteWorkoutBlock(blockId)
        if (success) {
          onBlocksChange(blocks.filter(block => block.id !== blockId))
        }
      } catch (error) {
        console.error('Error deleting block:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  // Update block
  const handleUpdateBlock = async (blockId: string, updates: Partial<WorkoutBlock>) => {
    setLoading(true)
    try {
      const updatedBlock = await WorkoutBlockService.updateWorkoutBlock(blockId, updates)
      if (updatedBlock) {
        onBlocksChange(blocks.map(block => 
          block.id === blockId ? updatedBlock : block
        ))
        setEditingBlock(null)
      }
    } catch (error) {
      console.error('Error updating block:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reorder blocks
  const handleReorderBlocks = async (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = blocks.findIndex(block => block.id === blockId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === blocks.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const reorderedBlocks = [...blocks]
    const [movedBlock] = reorderedBlocks.splice(currentIndex, 1)
    reorderedBlocks.splice(newIndex, 0, movedBlock)

    // Update block orders
    const blockOrders = reorderedBlocks.map((block, index) => ({
      blockId: block.id,
      newOrder: index + 1
    }))

    setLoading(true)
    try {
      const success = await WorkoutBlockService.reorderWorkoutBlocks(templateId, blockOrders)
      if (success) {
        onBlocksChange(reorderedBlocks.map((block, index) => ({
          ...block,
          block_order: index + 1
        })))
      }
    } catch (error) {
      console.error('Error reordering blocks:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
            Workout Blocks
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Build your workout using different training protocols
          </p>
        </div>
        <Button
          onClick={() => setShowAddBlock(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Block
        </Button>
      </div>

      {/* Add Block Modal */}
      {showAddBlock && (
        <Card className={`${theme.card} border ${theme.border}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add New Block</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddBlock(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Block Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(WORKOUT_BLOCK_CONFIGS).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedBlockType(type as WorkoutBlockType)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedBlockType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white">
                    {config.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {config.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddBlock}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {loading ? 'Adding...' : 'Add Block'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddBlock(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          const config = WORKOUT_BLOCK_CONFIGS[block.block_type]
          
          return (
            <Card key={block.id} className={`${theme.card} border ${theme.border}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {block.block_order}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">{config.icon}</span>
                        {block.block_name || config.name}
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorderBlocks(block.id, 'up')}
                      disabled={index === 0 || loading}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorderBlocks(block.id, 'down')}
                      disabled={index === blocks.length - 1 || loading}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingBlock(block)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Block Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Rest: {block.rest_seconds || 60}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Sets: {block.total_sets || 3}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Reps: {block.reps_per_set || '10-12'}
                    </span>
                  </div>
                  {block.duration_seconds && (
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Duration: {Math.floor(block.duration_seconds / 60)}m
                      </span>
                    </div>
                  )}
                </div>

                {/* Block Notes */}
                {block.block_notes && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {block.block_notes}
                    </p>
                  </div>
                )}

                {/* Exercises */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-800 dark:text-white">
                    Exercises ({block.exercises?.length || 0})
                  </h4>
                  
                  {block.exercises && block.exercises.length > 0 ? (
                    <div className="space-y-2">
                      {block.exercises
                        .sort((a, b) => a.exercise_order - b.exercise_order)
                        .map((exercise) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {exercise.exercise_letter || exercise.exercise_order}
                              </Badge>
                              <span className="font-medium text-slate-800 dark:text-white">
                                {exercise.exercise?.name || 'Unknown Exercise'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                              <span>{exercise.sets || 0} sets</span>
                              <span>{exercise.reps || 'N/A'} reps</span>
                              {exercise.weight_kg && (
                                <span>{exercise.weight_kg}kg</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No exercises added to this block</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          // TODO: Open exercise selector
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Exercise
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {blocks.length === 0 && (
        <Card className={`${theme.card} border ${theme.border}`}>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              No Workout Blocks Yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Start building your workout by adding different training blocks
            </p>
            <Button
              onClick={() => setShowAddBlock(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Block
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
