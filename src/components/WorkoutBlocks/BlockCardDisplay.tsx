import React from "react";
import { BlockVariantProps, WorkoutBlockDisplay } from "./types";
import { StraightSetsDisplay } from "./StraightSetsDisplay";
import { SupersetsDisplay } from "./SupersetsDisplay";
import { DropsetsDisplay } from "./DropsetsDisplay";
import { CircuitsDisplay } from "./CircuitsDisplay";
import { DensityTrainingDisplay } from "./DensityTrainingDisplay";

type BlockVariantComponent = (props: BlockVariantProps) => React.ReactElement;

const DISPLAY_COMPONENTS: Record<string, BlockVariantComponent> = {
  straight_set: StraightSetsDisplay,
  straight_sets: StraightSetsDisplay,
  superset: SupersetsDisplay,
  drop_set: DropsetsDisplay,
  circuit: CircuitsDisplay,
  tabata: CircuitsDisplay,
  density: DensityTrainingDisplay,
  density_training: DensityTrainingDisplay,
  amrap: DensityTrainingDisplay,
  emom: DensityTrainingDisplay,
  for_time: DensityTrainingDisplay,
};

function normalizeType(type?: string | null) {
  if (!type) return "straight_set";
  return type.toLowerCase();
}

export interface BlockCardDisplayProps {
  block: WorkoutBlockDisplay;
  index: number;
}

export function BlockCardDisplay({ block, index }: BlockCardDisplayProps) {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    try {
      console.groupCollapsed(
        `%cBlockCardDisplay%c ${block.blockType ?? "unknown"} | ${
          block.blockName ?? block.displayType ?? "Unnamed"
        }`,
        "color:#6366f1;font-weight:600;",
        "color:inherit;font-weight:400;"
      );
      console.log("Index:", index);
      console.log("Block:", block);
      console.log("Raw block payload:", block.rawBlock);
      console.log("Block parameters:", block.parameters);
      console.log(
        "Exercises:",
        block.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          letter: exercise.exerciseLetter,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          weightGuidance: exercise.weightGuidance,
          meta: exercise.meta,
          raw: exercise.raw,
        }))
      );
      console.groupEnd();
    } catch (error) {
      console.warn("Failed to log block data", error);
    }
  }

  const normalizedType = normalizeType(block.blockType);
  const Component =
    DISPLAY_COMPONENTS[normalizedType] ?? DISPLAY_COMPONENTS["straight_set"];

  return <Component block={block} index={index} />;
}
