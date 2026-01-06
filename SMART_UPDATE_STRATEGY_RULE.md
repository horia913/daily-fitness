# Smart Update Strategy - General Rule for Data Integrity

## ❌ FLAWED APPROACH: Delete-All-and-Recreate

**NEVER use this pattern when data has referential integrity constraints:**

```typescript
// ❌ BAD: Deletes all existing data and recreates
const existingBlocks = await getExistingData();
for (const block of existingBlocks) {
  await deleteData(block.id); // Breaks foreign key relationships!
}
for (const newItem of newItems) {
  await createData(newItem); // Creates new IDs, breaks history
}
```

### Why This Is Flawed:
1. **Breaks Referential Integrity**: Other tables reference these IDs (logged sets, workout sessions, progression rules)
2. **Data Loss Risk**: If save fails partway, data is permanently lost
3. **Inefficient**: Unnecessarily deletes and recreates unchanged data
4. **Breaks Historical Data**: Historical records become orphaned when IDs change

---

## ✅ CORRECT APPROACH: Smart Update Strategy

**ALWAYS use this pattern when updating data that may be referenced elsewhere:**

### Core Principles:

1. **Preserve IDs**: When loading data for editing, preserve original IDs
2. **Match Before Update**: Compare existing vs new data by ID
3. **Update Matched Items**: Update existing records instead of deleting/recreating
4. **Create Only New**: Create records only for items without existing IDs
5. **Delete Only Removed**: Delete only items that exist in DB but not in new data

### Implementation Pattern:

```typescript
// ✅ GOOD: Smart update preserves IDs and referential integrity
async function saveData(templateId: string, newItems: Item[]) {
  // 1. Get existing data
  const existingItems = await getExistingData(templateId);
  const existingIds = new Set(existingItems.map(item => item.id));
  const newItemIds = new Set(
    newItems
      .map(item => item.id)
      .filter((id): id is string => Boolean(id))
  );

  // 2. Delete only removed items
  const itemsToDelete = existingItems.filter(
    item => !newItemIds.has(item.id)
  );
  for (const item of itemsToDelete) {
    await deleteItem(item.id); // Only delete what was actually removed
  }

  // 3. Process each item: UPDATE if exists, CREATE if new
  for (const item of newItems) {
    const isUpdate = item.id && existingIds.has(item.id);
    
    if (isUpdate && item.id) {
      // UPDATE: Preserve ID, update fields
      await deleteItemSpecialData(item.id); // Delete related data first
      await updateItem(item.id, item); // Update main record
      await recreateItemSpecialData(item.id, item); // Recreate related data
    } else {
      // CREATE: New record with new ID
      const newItem = await createItem(item);
      await createItemSpecialData(newItem.id, item);
    }
  }
}
```

### Key Implementation Details:

1. **ID Preservation on Load**:
   ```typescript
   // When loading data for editing, preserve original IDs
   const exercise = {
     id: block.id, // ✅ Preserve original block ID
     // ... other fields
   };
   ```

2. **Matching Logic**:
   ```typescript
   // Match by ID to determine if update or create
   const isUpdate = item.id && existingIds.has(item.id);
   ```

3. **Update Process**:
   ```typescript
   if (isUpdate) {
     // Delete related data first (due to foreign keys)
     await deleteRelatedData(item.id);
     // Update main record (preserves ID)
     await updateRecord(item.id, updates);
     // Recreate related data
     await createRelatedData(item.id, data);
   }
   ```

4. **Special Table Data Handling**:
   ```typescript
   // For updates, delete and recreate special table data
   // This ensures data matches the new structure
   await deleteBlockSpecialData(blockId);
   // ... update block ...
   await createSpecialData(blockId, newData);
   ```

---

## When to Use Smart Update Strategy

**Use this pattern when:**
- ✅ Data has foreign key relationships (other tables reference these IDs)
- ✅ Historical data exists (workout logs, sessions, analytics)
- ✅ Data may be referenced by multiple features
- ✅ Preserving IDs is critical for data integrity

**Examples:**
- Workout blocks (referenced by logged sets, sessions, progression rules)
- Workout templates (referenced by assignments, programs)
- Exercise library items (referenced by workout blocks, logs)
- Program schedules (referenced by client assignments)

---

## Anti-Patterns to Avoid

1. **❌ Delete-All-and-Recreate**: Never delete all data and recreate
2. **❌ Ignoring Foreign Keys**: Don't delete without checking references
3. **❌ Changing IDs**: Don't change IDs of existing records
4. **❌ Bulk Delete**: Don't delete everything "just to be safe"

---

## Benefits of Smart Update

1. **Data Integrity**: Preserves referential integrity with historical data
2. **Efficiency**: Only updates what changed
3. **Safety**: No data loss if save fails partway
4. **Auditability**: Historical records remain linked
5. **Performance**: Fewer database operations

---

## Testing Checklist

When implementing smart update, verify:
- [ ] Existing records are updated (not deleted/recreated)
- [ ] New records are created with new IDs
- [ ] Removed records are deleted
- [ ] Historical data (logs, sessions) remains linked
- [ ] Foreign key constraints are satisfied
- [ ] Special table data is properly updated
- [ ] No orphaned records are created

---

## Example: Workout Block Update

**Before (Flawed):**
```typescript
// Delete all blocks
for (const block of existingBlocks) {
  await deleteWorkoutBlock(block.id); // ❌ Breaks logged sets!
}
// Create all blocks
for (const exercise of exercises) {
  await createWorkoutBlock(exercise); // ❌ New IDs break history
}
```

**After (Smart Update):**
```typescript
// Match existing vs new
const existingBlockIds = new Set(existingBlocks.map(b => b.id));
const newExerciseIds = new Set(exercises.map(e => e.id).filter(Boolean));

// Delete only removed
const toDelete = existingBlocks.filter(b => !newExerciseIds.has(b.id));
for (const block of toDelete) {
  await deleteWorkoutBlock(block.id); // ✅ Only removed blocks
}

// Update or create
for (const exercise of exercises) {
  const isUpdate = exercise.id && existingBlockIds.has(exercise.id);
  if (isUpdate) {
    await updateWorkoutBlock(exercise.id, exercise); // ✅ Preserves ID
  } else {
    await createWorkoutBlock(exercise); // ✅ New block
  }
}
```

---

## Memory/Rule for Future Chats

**RULE: Always use Smart Update Strategy for data with referential integrity**

When updating data that:
- Has foreign key relationships
- May be referenced by historical records
- Is used across multiple features

**NEVER:**
- Delete all and recreate
- Change existing IDs
- Ignore foreign key constraints

**ALWAYS:**
- Preserve IDs when loading for editing
- Match existing vs new data by ID
- Update matched records (preserve ID)
- Create only new records
- Delete only removed records
- Handle special table data properly (delete then recreate on update)

