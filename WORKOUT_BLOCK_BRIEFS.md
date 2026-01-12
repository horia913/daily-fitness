# Workout Block Type Briefs

## Overview
This document provides briefs for the two main categories of workout block types used in the workout completion page UI update.

---

## 1. Exercise-Based Block Types (workout_block_exercises)

These block types store exercise-level data in the `workout_block_exercises` table and represent structured sets/reps/weight protocols.

### Block Types:
- **straight_set** - Standard sets with reps and weight
- **superset** - Two exercises performed back-to-back (exercise_a and exercise_b)
- **giant_set** - Multiple exercises (3+) performed in sequence (stored as JSON array)
- **pre_exhaustion** - Isolation exercise followed immediately by compound exercise
- **drop_set** - Initial weight/reps, then drop percentage applied (stored in workout_drop_sets)
- **cluster_set** - Multiple mini-sets with short rest (stored in workout_cluster_sets)
- **rest_pause** - Initial set, then rest-pause sets (stored in workout_rest_pause_sets)
- **pyramid_set** - Progressive weight/reps pattern (stored in workout_pyramid_sets)
- **ladder** - Ascending or descending rep ladder (stored in workout_ladder_sets)

### Data Structure:
```typescript
interface BlockGroup {
  block_id: string;
  block_type: string; // One of the types above
  block_name: string;
  block_order: number;
  sets: WorkoutSetLog[]; // Logged sets from workout_set_logs
  exerciseNames: Map<string, string>; // exercise_id -> exercise name
  templateBlock?: any; // Full template block data for blocks with no sets
}

interface WorkoutSetLog {
  id: string;
  workout_log_id: string;
  block_id: string;
  block_type: string;
  exercise_id: string;
  weight: number | null;
  reps: number | null;
  set_number: number | null;
  completed_at: string;
  
  // Special columns for different block types:
  dropset_initial_weight?: number | null;
  dropset_initial_reps?: number | null;
  dropset_final_weight?: number | null;
  dropset_final_reps?: number | null;
  
  superset_exercise_a_id?: string | null;
  superset_weight_a?: number | null;
  superset_reps_a?: number | null;
  superset_exercise_b_id?: string | null;
  superset_weight_b?: number | null;
  superset_reps_b?: number | null;
  
  giant_set_exercises?: any; // JSON array
  
  preexhaust_isolation_exercise_id?: string | null;
  preexhaust_isolation_weight?: number | null;
  preexhaust_isolation_reps?: number | null;
  preexhaust_compound_exercise_id?: string | null;
  preexhaust_compound_weight?: number | null;
  preexhaust_compound_reps?: number | null;
  
  rest_pause_initial_weight?: number | null;
  rest_pause_initial_reps?: number | null;
  rest_pause_reps_after?: number | null;
  rest_pause_number?: number | null;
  
  cluster_number?: number | null;
  // ... other special type fields
}
```

### UI Display Notes:
- Blocks can be collapsed/expanded
- Each block shows: block_order, block_type (formatted), set_count
- Exercise names are displayed from exerciseNames Map
- Sets are sorted by set_number or completed_at
- Special block types display formatted data based on their specific fields

---

## 2. Time-Based Protocol Block Types (workout_time_protocols)

These block types store protocol-level data in the `workout_time_protocols` table and represent time-based training protocols (AMRAP, EMOM, etc.).

### Block Types:
- **amrap** - "As Many Rounds As Possible" within a time duration
- **emom** - "Every Minute On the Minute" - work interval each minute
- **for_time** - Complete target reps/work as fast as possible (time cap optional)
- **tabata** - 20 seconds work / 10 seconds rest intervals
- **circuit** - Multiple exercises in sequence, repeat for duration/rounds

### Data Structure:
```typescript
interface TimeProtocolBlock {
  block_id: string;
  block_type: string; // 'amrap' | 'emom' | 'for_time' | 'tabata' | 'circuit'
  block_name: string;
  block_order: number;
  
  // Time protocol data stored in workout_time_protocols:
  total_duration_minutes?: number;
  target_reps?: number;
  time_cap_seconds?: number;
  work_seconds?: number;
  rest_seconds?: number;
  rounds?: number;
  
  // Exercises for this protocol (from workout_block_exercises or protocol-specific)
  exercises?: Array<{
    exercise_id: string;
    name: string;
    // ... exercise-specific data
  }>;
  
  sets: WorkoutSetLog[]; // Logged protocol attempts
}

interface WorkoutSetLog {
  // ... base fields ...
  
  // Time protocol specific fields:
  amrap_total_reps?: number | null;
  amrap_duration_seconds?: number | null;
  amrap_target_reps?: number | null;
  
  fortime_total_reps?: number | null;
  fortime_time_taken_sec?: number | null;
  fortime_time_cap_sec?: number | null;
  fortime_target_reps?: number | null;
  
  emom_minute_number?: number | null;
  emom_total_reps_this_min?: number | null;
  emom_total_duration_sec?: number | null;
  
  tabata_rounds_completed?: number | null;
  tabata_total_duration_sec?: number | null;
}
```

### UI Display Notes:
- Blocks show protocol name and time-based metrics
- AMRAP: Shows rounds/reps completed and duration
- EMOM: Shows reps per minute, total duration
- For Time: Shows time taken, target reps, time cap if applicable
- Tabata: Shows rounds completed, total duration
- Circuit: Shows exercises in sequence, rounds completed

---

## Summary

Both block type categories are displayed in the workout completion page with:
- Glass morphism styling (transparent backgrounds, backdrop blur)
- Collapsible/expandable structure
- Exercise names mapped from exercise IDs
- Set logs displayed with formatted data based on block type
- Mobile-first responsive design
