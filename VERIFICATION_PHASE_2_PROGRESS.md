# Phase 2 Verification - Workout Templates (In Progress)

## Phase 2.1: Template Management UI Verification

### Files to Verify
- `src/components/WorkoutTemplateForm.tsx` - Main template form
- `src/app/coach/workouts/templates/[id]/page.tsx` - Template edit page
- Template list/management pages

### Verification Checklist

#### Block Type Creation
- [ ] All block types can be created
  - [ ] straight_set
  - [ ] superset
  - [ ] giant_set
  - [ ] drop_set
  - [ ] cluster_set
  - [ ] rest_pause
  - [ ] pyramid_set (deprecated - should be removed)
  - [ ] ladder (deprecated - should be removed)
  - [ ] pre_exhaustion
  - [ ] amrap
  - [ ] emom
  - [ ] for_time
  - [ ] tabata
  - [ ] circuit (deprecated - should be removed)

#### Block Type Editing
- [ ] All block types can be edited (fields autopopulate correctly)
  - [ ] Fields load from database correctly
  - [ ] loadWorkoutBlocks() populates all fields
  - [ ] No missing data when editing existing templates

#### Form Validation
- [ ] Form validation works for all block types
  - [ ] Required fields are validated
  - [ ] Invalid data is caught
  - [ ] Error messages display correctly

#### Data Saving
- [ ] Form saves all data correctly (matches backend expectations)
  - [ ] All block types save correctly
  - [ ] All fields are saved to correct tables
  - [ ] Special table data is saved correctly
  - [ ] block_parameters are saved correctly
  - [ ] Smart update strategy preserves block IDs

#### localStorage Draft Persistence
- [ ] localStorage draft persistence works (for new templates)
  - [ ] Draft is saved on change
  - [ ] Draft is restored on page reload
  - [ ] Draft is cleared on successful save
  - [ ] Draft is cleared on cancel
  - [ ] Draft expires after 24 hours

#### Block Operations
- [ ] Block ordering/reordering works
- [ ] Block deletion works correctly
  - [ ] Deletes block and all related data
  - [ ] Smart update strategy handles deletion correctly

#### Field Handling
- [ ] load_percentage field handling (individual vs block-level per block type)
  - [ ] Individual load_percentage for superset, giant_set, pre_exhaustion
  - [ ] Block-level load_percentage for other types
- [ ] Tabata/EMOM don't show load_percentage field
- [ ] Circuit block type is removed (if applicable)

### Issues Found

TBD - Verification in progress

---

## Phase 2.2: Template Display Components Verification

### Files to Verify
- `src/app/client/workouts/[id]/details/page.tsx` - Client workout details view
- `src/app/coach/workouts/templates/[id]/page.tsx` - Coach template view
- Block display components

### Verification Checklist

#### Block Type Display
- [ ] All block types display correctly
- [ ] Block headers show correct data (from workout_blocks)
- [ ] Exercise cards show correct data (from special tables)
- [ ] All fields display from correct sources (per BLOCK_STORAGE_SCHEMA.md)
- [ ] Optional fields only show when set
- [ ] Display matches specification for each block type
- [ ] No missing data or incorrect data sources

#### Specific Block Type Display Issues
- [ ] Tabata: rest_after_set NOT shown in exercise cards (block-level only)
- [ ] Tabata: rounds shown in header (from total_sets), not in exercise cards
- [ ] Superset/Giant Set/Pre-Exhaustion: rest_seconds NOT shown in exercise cards (block-level only)
- [ ] For Time: target_reps and time_cap display correctly
- [ ] Rest-Pause: weight_kg and reps display correctly (from workout_blocks.reps_per_set)

### Issues Found

#### Known Issues (Recently Fixed)
- ✅ Superset/Giant Set/Pre-Exhaustion: rest_seconds removed from exercise cards
- ✅ For Time: time_cap and target_reps now save correctly to block_parameters
- ✅ Rest-Pause: weight_kg and reps display correctly

TBD - Full verification in progress

---

## Phase 2.3: Template Data Usage in Forms

### Files to Verify
- Any forms that read/edit template data
- Forms that create templates from other templates

### Verification Checklist

- [ ] Forms correctly load template data
- [ ] Forms correctly save template data
- [ ] Form fields match data structure

### Issues Found

TBD - Verification in progress

---

## Next Steps

1. Complete Phase 2.1 verification
2. Complete Phase 2.2 verification  
3. Complete Phase 2.3 verification
4. Document all issues found
5. Run build verification after each sub-phase
6. Create final Phase 2 results document

