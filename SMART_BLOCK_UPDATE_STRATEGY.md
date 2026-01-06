# Smart Block Update Strategy

## Problem
Currently, when saving a workout template, ALL blocks are deleted and recreated. This causes:
- **Data Integrity Issues**: Historical workout logs reference block IDs that get deleted
- **Foreign Key Violations**: Logged sets, workout sessions, and other features reference block IDs
- **Data Loss Risk**: If save fails partway, data is lost

## Solution: Smart Update Strategy

### Approach
1. **Preserve Block IDs**: When loading blocks for editing, preserve the original `block.id` in the exercise object
2. **Match Existing Blocks**: Compare exercises by block ID (`exercise.id === block.id`)
3. **Update Matched Blocks**: For blocks that exist, UPDATE instead of delete/recreate
4. **Create New Blocks**: For exercises without an ID, CREATE new blocks
5. **Delete Removed Blocks**: Only delete blocks that no longer exist in the new exercise list

### Implementation Steps

1. **When Loading Blocks** (already done):
   - `exercise.id = block.id` - preserves original block ID

2. **When Saving Blocks**:
   - Get existing blocks for template
   - For each exercise:
     - If `exercise.id` exists and matches an existing block → UPDATE
     - If `exercise.id` doesn't exist → CREATE
   - For each existing block not in new exercises → DELETE

3. **Update Process**:
   - Delete special table data for the block
   - Update block fields
   - Recreate special table data

4. **Benefits**:
   - Preserves block IDs for historical data
   - More efficient (only updates what changed)
   - Safer (no data loss if save fails)
   - Maintains referential integrity

## Status
- ✅ Block ID preservation in load (done)
- ⏳ Smart update logic in save (to be implemented)
- ⏳ Helper function for updating special table data (to be implemented)

