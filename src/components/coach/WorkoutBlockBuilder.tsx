"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  GripVertical,
  Timer,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  WorkoutBlock,
  WorkoutBlockExercise,
  WorkoutBlockType,
  WORKOUT_BLOCK_CONFIGS,
} from "@/types/workoutBlocks";
import { WorkoutBlockService } from "@/lib/workoutBlockService";

interface WorkoutBlockBuilderProps {
  templateId: string;
  blocks: WorkoutBlock[];
  onBlocksChange: (blocks: WorkoutBlock[]) => void;
  availableExercises: any[];
  allowedBlockTypes?: WorkoutBlockType[]; // Optional: filter available block types
}

export default function WorkoutBlockBuilder({
  templateId,
  blocks,
  onBlocksChange,
  availableExercises,
  allowedBlockTypes,
}: WorkoutBlockBuilderProps) {
  // Filter block types if allowedBlockTypes is provided
  const availableBlockConfigs = allowedBlockTypes
    ? Object.entries(WORKOUT_BLOCK_CONFIGS).filter(([type]) =>
        allowedBlockTypes.includes(type as WorkoutBlockType)
      )
    : Object.entries(WORKOUT_BLOCK_CONFIGS);

  const [selectedBlockType, setSelectedBlockType] =
    useState<WorkoutBlockType>("straight_set");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<WorkoutBlock | null>(null);
  const [loading, setLoading] = useState(false);

  // Add new block
  const handleAddBlock = async () => {
    setLoading(true);
    try {
      const newBlock = await WorkoutBlockService.createWorkoutBlock(
        templateId,
        selectedBlockType,
        blocks.length + 1,
        {
          set_name: WORKOUT_BLOCK_CONFIGS[selectedBlockType].name,
          set_notes: "",
          rest_seconds: 60,
          total_sets: 3,
          reps_per_set: "10-12",
        }
      );

      if (newBlock) {
        onBlocksChange([...blocks, newBlock]);
        setShowAddBlock(false);
      }
    } catch (error) {
      console.error("Error adding block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete block
  const handleDeleteBlock = async (blockId: string) => {
    if (confirm("Are you sure you want to delete this set entry?")) {
      setLoading(true);
      try {
        const success = await WorkoutBlockService.deleteWorkoutBlock(blockId);
        if (success) {
          onBlocksChange(blocks.filter((block) => block.id !== blockId));
        }
      } catch (error) {
        console.error("Error deleting block:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Update block
  const handleUpdateBlock = async (
    blockId: string,
    updates: Partial<WorkoutBlock>
  ) => {
    setLoading(true);
    try {
      const updatedBlock = await WorkoutBlockService.updateWorkoutBlock(
        blockId,
        updates
      );
      if (updatedBlock) {
        onBlocksChange(
          blocks.map((block) => (block.id === blockId ? updatedBlock : block))
        );
        setEditingBlock(null);
      }
    } catch (error) {
      console.error("Error updating block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reorder blocks
  const handleReorderBlocks = async (
    blockId: string,
    direction: "up" | "down"
  ) => {
    const currentIndex = blocks.findIndex((block) => block.id === blockId);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === blocks.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const reorderedBlocks = [...blocks];
    const [movedBlock] = reorderedBlocks.splice(currentIndex, 1);
    reorderedBlocks.splice(newIndex, 0, movedBlock);

    // Update block orders
    const blockOrders = reorderedBlocks.map((block, index) => ({
      blockId: block.id,
      newOrder: index + 1,
    }));

    setLoading(true);
    try {
      const success = await WorkoutBlockService.reorderWorkoutBlocks(
        templateId,
        blockOrders
      );
      if (success) {
        onBlocksChange(
          reorderedBlocks.map((block, index) => ({
            ...block,
            set_order: index + 1,
          }))
        );
      }
    } catch (error) {
      console.error("Error reordering blocks:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold fc-text-primary">
            Exercises
          </h3>
          <p className="text-sm fc-text-dim">
            Build your workout using different training protocols
          </p>
        </div>
        <Button
          onClick={() => setShowAddBlock(true)}
          variant="fc-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Exercise
        </Button>
      </div>

      {/* Add Block Modal */}
      {showAddBlock && (
        <div className="fc-card-shell border border-[color:var(--fc-glass-border)] rounded-2xl">
          <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold fc-text-primary">
                Add New Set Entry
              </div>
              <Button
                variant="fc-ghost"
                size="sm"
                onClick={() => setShowAddBlock(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            {/* Informational message when block types are filtered */}
            {allowedBlockTypes && allowedBlockTypes.length < Object.keys(WORKOUT_BLOCK_CONFIGS).length && (
              <div className="p-3 rounded-xl border border-[color:var(--fc-glass-border)] fc-glass-soft">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 fc-text-workouts mt-0.5 flex-shrink-0" />
                  <div className="text-xs fc-text-dim">
                    <p className="font-semibold mb-1">Volume Calculator Active</p>
                    <p>
                      Only resistance training exercises are available. Time-based exercises
                      (AMRAP, EMOM, For Time, Tabata) are excluded from volume calculations.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Block Type Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableBlockConfigs.map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedBlockType(type as WorkoutBlockType)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedBlockType === type
                      ? "border-[color:var(--fc-glass-border-strong)] fc-glass"
                      : "border-[color:var(--fc-glass-border)] hover:border-[color:var(--fc-glass-border-strong)] fc-glass-soft"
                  }`}
                >
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <div className="font-semibold text-sm fc-text-primary">
                    {config.name}
                  </div>
                  <div className="text-xs fc-text-dim mt-1">
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
                variant="fc-primary"
              >
                {loading ? "Adding..." : "Add Exercise"}
              </Button>
              <Button variant="fc-secondary" onClick={() => setShowAddBlock(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exercises list */}
      <div className="space-y-4">
        {blocks.map((block, index) => {
          const config = WORKOUT_BLOCK_CONFIGS[block.set_type];

          return (
            <div
              key={block.id}
              className="fc-card-shell border border-[color:var(--fc-glass-border)] rounded-2xl"
            >
              <div className="p-4 sm:p-6 border-b border-[color:var(--fc-glass-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="fc-icon-tile fc-icon-workouts text-sm font-bold">
                      {block.set_order}
                    </div>
                    <div>
                      <div className="text-lg font-semibold fc-text-primary flex items-center gap-2">
                        <span className="text-xl">{config.icon}</span>
                        {block.set_name || config.name}
                      </div>
                      <p className="text-sm fc-text-dim">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons */}
                    <Button
                      variant="fc-ghost"
                      size="sm"
                      onClick={() => handleReorderBlocks(block.id, "up")}
                      disabled={index === 0 || loading}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="fc-ghost"
                      size="sm"
                      onClick={() => handleReorderBlocks(block.id, "down")}
                      disabled={index === blocks.length - 1 || loading}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>

                    {/* Edit Button */}
                    <Button
                      variant="fc-ghost"
                      size="sm"
                      onClick={() => setEditingBlock(block)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="fc-destructive"
                      size="sm"
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Set entry info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {block.rest_seconds != null && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 fc-text-subtle" />
                      <span className="text-sm fc-text-dim">
                        Rest: {block.rest_seconds}s
                      </span>
                    </div>
                  )}
                  {block.total_sets != null && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 fc-text-subtle" />
                      <span className="text-sm fc-text-dim">
                        Sets: {block.total_sets}
                      </span>
                    </div>
                  )}
                  {block.reps_per_set && (
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 fc-text-subtle" />
                      <span className="text-sm fc-text-dim">
                        Reps: {block.reps_per_set}
                      </span>
                    </div>
                  )}
                  {block.duration_seconds != null && (
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 fc-text-subtle" />
                      <span className="text-sm fc-text-dim">
                        Duration: {Math.floor(block.duration_seconds / 60)}m
                      </span>
                    </div>
                  )}
                </div>

                {/* Set Notes */}
                {block.set_notes && (
                  <div className="fc-glass-soft rounded-lg p-3 mb-4 border border-[color:var(--fc-glass-border)]">
                    <p className="text-sm fc-text-dim">
                      {block.set_notes}
                    </p>
                  </div>
                )}

                {/* Exercises */}
                <div className="space-y-2">
                  <h4 className="font-medium fc-text-primary">
                    Exercises ({block.exercises?.length || 0})
                  </h4>

                  {block.exercises && block.exercises.length > 0 ? (
                    <div className="space-y-2">
                      {block.exercises
                        .sort((a, b) => a.exercise_order - b.exercise_order)
                        .map((exercise) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-3 fc-glass-soft rounded-lg border border-[color:var(--fc-glass-border)]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="fc-pill fc-pill-glass text-xs fc-text-subtle">
                                {exercise.exercise_letter ||
                                  exercise.exercise_order}
                              </span>
                              <span className="font-medium fc-text-primary">
                                {exercise.exercise?.name || "Unknown Exercise"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm fc-text-dim">
                              {exercise.sets != null && (
                                <span>{exercise.sets} sets</span>
                              )}
                              {exercise.reps && (
                                <span>{exercise.reps} reps</span>
                              )}
                              {exercise.weight_kg != null && (
                                <span>{exercise.weight_kg}kg</span>
                              )}
                              {exercise.tempo && (
                                <span>Tempo: {exercise.tempo}</span>
                              )}
                              {exercise.rir != null && (
                                <span>RPE: {exercise.rir}</span>
                              )}
                              {exercise.rest_seconds != null && (
                                <span>Rest: {exercise.rest_seconds}s</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-6">
                      <EmptyState
                        variant="inline"
                        title="No exercises in this set entry"
                      />
                      <Button
                        variant="fc-secondary"
                        size="sm"
                        onClick={() => {
                          // TODO: Open exercise selector
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add exercise
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="fc-card-shell border border-[color:var(--fc-glass-border)] rounded-2xl">
          <EmptyState
            icon={Dumbbell}
            title="No set entries yet"
            description="Add your first set entry to build this workout."
            actionLabel="Add set entry"
            onAction={() => setShowAddBlock(true)}
          />
        </div>
      )}
    </div>
  );
}
