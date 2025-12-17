"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Flame,
  TrendingDown,
  Link,
  PauseCircle,
  TrendingUp,
  Target,
  Rocket,
  Timer as TimerIcon,
  CloudLightning,
  Activity,
  BarChart3,
  Dumbbell,
  Repeat,
} from "lucide-react";
import { WorkoutBlockType, WORKOUT_BLOCK_CONFIGS } from "@/types/workoutBlocks";

interface BlockTypeBadgeProps {
  blockType: WorkoutBlockType;
  blockName?: string;
}

export function BlockTypeBadge({ blockType, blockName }: BlockTypeBadgeProps) {
  const config = WORKOUT_BLOCK_CONFIGS[blockType];

  const getIcon = () => {
    switch (blockType) {
      case "straight_set":
        return <Dumbbell className="w-4 h-4" />;
      case "superset":
        return <Zap className="w-4 h-4" />;
      case "giant_set":
        return <Flame className="w-4 h-4" />;
      case "drop_set":
        return <TrendingDown className="w-4 h-4" />;
      case "cluster_set":
        return <Link className="w-4 h-4" />;
      case "rest_pause":
        return <PauseCircle className="w-4 h-4" />;
      case "pyramid_set":
        return <TrendingUp className="w-4 h-4" />;
      case "pre_exhaustion":
        return <Target className="w-4 h-4" />;
      case "amrap":
        return <Rocket className="w-4 h-4" />;
      case "emom":
        return <TimerIcon className="w-4 h-4" />;
      case "tabata":
        return <CloudLightning className="w-4 h-4" />;
      case "circuit":
        return <Repeat className="w-4 h-4" />;
      case "for_time":
        return <Activity className="w-4 h-4" />;
      case "ladder":
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Dumbbell className="w-4 h-4" />;
    }
  };

  // Always prioritize config.name (block type name) over blockName (custom name)
  // Only use blockName as fallback if config doesn't exist
  const displayName = config?.name || blockName || "Unknown Block Type";

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border-2"
    >
      {getIcon()}
      <span>{displayName}</span>
    </Badge>
  );
}
