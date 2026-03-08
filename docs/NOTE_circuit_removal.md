# Circuit Block Type Removal

This implementation assumes **no production rows** with `set_type = 'circuit'` in `workout_set_entries` (or equivalent block table). If any templates use circuit blocks, run a data migration first (e.g. remap to tabata or deactivate those templates) before or alongside this code removal.
