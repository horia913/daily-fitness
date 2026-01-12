# Live Workout Session Page UI Updates

## Overview

This document summarizes the UI updates made to the Live Workout Session page (`/client/workouts/[id]/start`) to implement the glass morphism style matching the Coach Dashboard UI style.

## Date

January 2025

## Components Updated

### 1. Main Workout Card

**File:** `src/components/client/workout-execution/BaseBlockExecutor.tsx`

- **Change:** Replaced custom `div` with `GlassCard` component
- **Elevation:** `elevation={2}` (main card)
- **Location:** Main wrapper around entire block content
- **Style:** Uses `GlassCard` with `className="p-6"`

### 2. Block Progress Indicator (Top Section)

**File:** `src/app/client/workouts/[id]/start/page.tsx`

- **Change:** Replaced `Card` or custom `div` with `GlassCard` component
- **Elevation:** `elevation={2}`
- **Location:** Session header showing workout name and block progress
- **Style:** Uses `GlassCard` with `className="p-6 mb-5"` for header, `className="p-4 mb-4"` for block progress

### 3. Metric Cards (SETS, REPS, REST, LOAD, TEMPO, RIR)

**File:** `src/components/client/workout-execution/ui/BlockDetailsGrid.tsx`

- **Change:** Replaced individual `div` elements with `GlassCard` components
- **Elevation:** `elevation={1}` (smaller cards)
- **Location:** Grid of metric cards displaying block details
- **Style:** Uses `GlassCard` with `className="p-4 text-center"`
- **Implementation:**
  ```tsx
  <GlassCard key={index} elevation={1} className="p-4 text-center">
    {/* Label and value content */}
  </GlassCard>
  ```

### 4. Weight/Reps Input Containers (All Block Executors)

**Files:** All block executor files in `src/components/client/workout-execution/blocks/`

- **Change:** Replaced solid `div` containers with `GlassCard` components
- **Elevation:** `elevation={1}` for all input containers
- **Location:** Containers wrapping Weight and Reps input fields in all block types
- **Style:** Uses `GlassCard` with `className="p-4"` or `className="p-4 space-y-4"` depending on content
- **Pattern Applied To:**
  - **StraightSetExecutor:** Single container with Weight/Reps inputs
  - **GiantSetExecutor:** Multiple containers (one per exercise in the giant set)
  - **DropSetExecutor:** Two containers (Initial Set & Drop Set)
  - **RestPauseExecutor:** Two containers (Initial Reps & Rest-Pause Attempts)
  - **ClusterSetExecutor:** Single container with Weight input and cluster info
  - **TabataExecutor:** Multiple containers (one per set)
  - **SupersetExecutor:** Two containers (Exercise A & Exercise B)
  - **PreExhaustionExecutor:** Two containers (Isolation & Compound exercises)
  - **ForTimeExecutor:** Single container with Weight/Reps inputs
  - **AmrapExecutor:** Single container with Weight/Reps inputs
  - **EmomExecutor:** Single container with Weight/Reps inputs
- **Before (Example from StraightSetExecutor):**
  ```tsx
  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-4">
  ```
- **After (Example from StraightSetExecutor):**
  ```tsx
  <GlassCard elevation={1} className="p-4 space-y-4">
  ```
- **Import Added to All Files:** `import { GlassCard } from "@/components/ui/GlassCard";`

### 5. Block Navigation Card ("Block n of n")

**File:** `src/components/client/workout-execution/ui/NavigationControls.tsx`

- **Change:** Replaced solid `div` container (`bg-slate-50 dark:bg-slate-800`) with `GlassCard`
- **Elevation:** `elevation={1}`
- **Location:** Bottom navigation card showing "Block {currentBlock} of {totalBlocks}" with Previous/Next buttons
- **Style:** Uses `GlassCard` with `className="flex items-center justify-between p-4"`
- **Before:**
  ```tsx
  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
  ```
- **After:**
  ```tsx
  <GlassCard elevation={1} className="flex items-center justify-between p-4">
  ```
- **Import Added:** `import { GlassCard } from "@/components/ui/GlassCard";`

## GlassCard Component Specifications

### Dark Mode:

- **Background:** `rgba(28, 28, 30, 0.80)` (80% opacity)
- **Backdrop Filter:** `blur(20px) saturate(150%)`
- **Border:** `1px solid rgba(255, 255, 255, 0.08)`
- **Border Radius:** `1rem` (16px)
- **Box Shadow:** Varies by elevation (e.g., `elevation={2}` uses `0px 4px 16px rgba(0,0,0,0.6)`)

### Light Mode:

- **Background:** `rgba(255, 255, 255, 0.85)` (85% opacity)
- **Backdrop Filter:** `blur(20px) saturate(150%)`
- **Border:** `1px solid rgba(255, 255, 255, 0.18)`
- **Border Radius:** `1rem` (16px)
- **Box Shadow:** Varies by elevation (e.g., `elevation={2}` uses `0px 4px 16px rgba(0,0,0,0.12)`)

### Elevation Levels:

- **elevation={1}:** Smaller cards (metric cards, input containers, navigation)
- **elevation={2}:** Main content cards (exercise cards, block containers)

## Key Principles

1. **Reuse GlassCard Component:** Always use the existing `GlassCard` component from `@/components/ui/GlassCard` rather than creating custom inline styles.

2. **Elevation Usage:**

   - Main content areas: `elevation={2}`
   - Smaller/supporting cards: `elevation={1}`

3. **Light Mode Compatibility:** The `GlassCard` component automatically handles both light and dark modes - no additional styling needed.

4. **Consistent Styling:** All cards now use the same glass morphism style, ensuring visual consistency across the application.

## Components NOT Updated (Intentionally)

### LOG SET Button

**Reason:** The LOG SET button remains a `Button` component with gradient background (`bg-gradient-to-r from-blue-600 to-indigo-600`). Buttons typically don't use glass morphism style - they use solid gradient backgrounds for better visibility and interaction.

## Files Modified

1. `src/components/client/workout-execution/BaseBlockExecutor.tsx`
2. `src/components/client/workout-execution/ui/BlockDetailsGrid.tsx`
3. `src/components/client/workout-execution/blocks/StraightSetExecutor.tsx`
4. `src/components/client/workout-execution/ui/NavigationControls.tsx`
5. `src/app/client/workouts/[id]/start/page.tsx`

## Reference

- **Source of Truth for UI Style:** `COACH_DASHBOARD_UI_STYLE.md`
- **GlassCard Component:** `src/components/ui/GlassCard.tsx`

## Next Steps for Bulk Updates

When updating other workout-related pages, follow this pattern:

1. Identify components using solid backgrounds (`bg-slate-50 dark:bg-slate-800`, `bg-white`, etc.)
2. Replace with `GlassCard` component
3. Choose appropriate elevation (1 for smaller cards, 2 for main cards)
4. Preserve all existing functionality and props
5. Import `GlassCard` from `@/components/ui/GlassCard`
6. Remove custom border/background/backdrop-filter styles (GlassCard handles these)

## Testing Notes

- ✅ Dark mode: All cards display with proper transparency and blur
- ✅ Light mode: All cards display with proper transparency and blur
- ✅ Animated background: Visible through all glass cards
- ✅ Functionality: All interactive elements (buttons, inputs) work as before
- ✅ Responsive: Layout remains mobile-first and responsive
