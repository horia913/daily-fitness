# workout_assignment_id Trace Through Component Chain

## Summary

The `workout_assignment_id` is being passed through the component chain correctly, but let's verify each step.

---

## Step 1: Page Component

**File:** `src/app/client/workouts/[id]/start/page.tsx`

### How the page gets the workout ID:

```typescript
// Line 120-122
const params = useParams();
const router = useRouter();
const assignmentId = params.id as string;
```

- **Source:** URL parameter `[id]` from Next.js route
- **Variable name:** `assignmentId`
- **Type:** `string`

### How it loads the assignment:

```typescript
// Line 403-436
const loadAssignment = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("workout_assignments")
      .select("*")
      .eq("id", assignmentId)  // ✅ Uses assignmentId
      .eq("client_id", user.id)
      .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignmentData) throw new Error("Workout assignment not found");

    setAssignment(assignmentData as WorkoutAssignment);
    // ... rest of code
  }
};
```

- **Query:** `workout_assignments` table
- **Filter:** `.eq("id", assignmentId)`
- **Stored in state:** `const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);`

### Where assignmentId is stored:

- **Variable:** `const assignmentId = params.id as string;` (line 122)
- **Not in state** - it's a constant from URL params
- **Also stored in assignment object:** `assignment.id` (but `assignmentId` variable is used)

### Is it passed to LiveWorkoutBlockExecutor?

**YES ✅**

```typescript
// Line 2379-2397
<LiveWorkoutBlockExecutor
  block={workoutBlocks[currentBlockIndex]}
  onBlockComplete={handleBlockComplete}
  onNextBlock={handleNextBlock}
  e1rmMap={e1rmMap}
  onE1rmUpdate={(exerciseId, e1rm) => {
    setE1rmMap((prev) => ({
      ...prev,
      [exerciseId]: e1rm,
    }));
  }}
  sessionId={sessionId}
  assignmentId={assignmentId}  // ✅ PASSED HERE
  allBlocks={workoutBlocks}
  currentBlockIndex={currentBlockIndex}
  onBlockChange={handleBlockChange}
  onSetLogged={handleSetLogged}
  onExerciseComplete={handleExerciseComplete}
/>
```

**Prop name:** `assignmentId`

---

## Step 2: LiveWorkoutBlockExecutor

**File:** `src/components/client/LiveWorkoutBlockExecutor.tsx`

### Does it receive assignmentId as prop?

**YES ✅**

```typescript
// Line 44-57
interface LiveWorkoutBlockExecutorProps {
  block: LiveWorkoutBlock;
  onBlockComplete: (blockId: string, loggedSets: LoggedSet[]) => void;
  onNextBlock: () => void;
  e1rmMap?: Record<string, number>;
  onE1rmUpdate?: (exerciseId: string, e1rm: number) => void;
  sessionId?: string | null;
  assignmentId?: string;  // ✅ DEFINED HERE
  allBlocks?: LiveWorkoutBlock[];
  currentBlockIndex?: number;
  onBlockChange?: (blockIndex: number) => void;
  onSetLogged?: (blockId: string, newCompletedSets: number) => void;
  onExerciseComplete?: (blockId: string) => void;
}

// Line 59-72
export default function LiveWorkoutBlockExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  sessionId,
  assignmentId,  // ✅ RECEIVED HERE
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
  onSetLogged,
  onExerciseComplete,
}: LiveWorkoutBlockExecutorProps) {
```

**Prop name:** `assignmentId`

### Does it use assignmentId in logSetToDatabase?

**YES ✅**

```typescript
// Line 210-224
const requestBody: any = {
  // Required for workout_set_logs
  block_id: block.block.id,
  block_type: data.block_type || block.block.type,
  client_id: user.id,
  workout_assignment_id: assignmentId || undefined,  // ✅ USED HERE
  // For API to get/create workout_log_id (session tracking)
  session_id: String(sessionId).trim(),
  template_exercise_id: currentExercise?.id || null,
  // Backwards compatible
  access_token: access_token,
  // Spread all data from executor (block-type-specific fields)
  ...data,
};
```

**Property name in request:** `workout_assignment_id`

### Does it pass to child executors?

**YES ✅**

```typescript
// Line 414-441
const commonProps: BaseBlockExecutorProps = {
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap,
  onE1rmUpdate,
  sessionId,
  assignmentId,  // ✅ PASSED TO CHILDREN
  allBlocks,
  currentBlockIndex,
  onBlockChange,
  currentExerciseIndex,
  onExerciseIndexChange: setCurrentExerciseIndex,
  logSetToDatabase,  // ✅ This function uses assignmentId from closure
  formatTime,
  calculateSuggestedWeight: (
    exerciseId: string,
    loadPercentage: number | null | undefined
  ) => calculateSuggestedWeightUtil(exerciseId, loadPercentage, e1rmMap),
  onVideoClick: openVideoModal,
  onAlternativesClick: (exerciseId: string) => {
    setAlternativesExerciseId(exerciseId);
    setShowAlternativesModal(true);
  },
  onRestTimerClick: handleRestTimerClick,
  onSetComplete: handleSetComplete,
};
```

**Prop name:** `assignmentId`

---

## Step 3: Block Executors (StraightSetExecutor)

**File:** `src/components/client/workout-execution/blocks/StraightSetExecutor.tsx`

### Does it receive assignmentId as prop?

**YES ✅**

```typescript
// Line 18-38
export function StraightSetExecutor({
  block,
  onBlockComplete,
  onNextBlock,
  e1rmMap = {},
  onE1rmUpdate,
  sessionId,
  assignmentId,  // ✅ RECEIVED HERE
  allBlocks = [],
  currentBlockIndex = 0,
  onBlockChange,
  currentExerciseIndex = 0,
  onExerciseIndexChange,
  logSetToDatabase,  // ✅ This function has assignmentId in closure
  formatTime,
  calculateSuggestedWeight,
  onVideoClick,
  onAlternativesClick,
  onRestTimerClick,
  onSetComplete,
}: StraightSetExecutorProps) {
```

**Prop name:** `assignmentId`

### Is it used in logSetToDatabase call?

**INDIRECTLY ✅**

The `logSetToDatabase` function is passed as a prop from `LiveWorkoutBlockExecutor`, and it uses `assignmentId` from its closure:

```typescript
// Line 170-183 (StraightSetExecutor)
const logData: any = {
  block_type: "straight_set",
  set_number: currentSetNumber,
};

if (currentExercise?.exercise_id)
  logData.exercise_id = currentExercise.exercise_id;
if (weightNum !== undefined && weightNum !== null && !isNaN(weightNum))
  logData.weight = weightNum;
if (repsNum !== undefined && repsNum !== null && !isNaN(repsNum))
  logData.reps = repsNum;

const result = await logSetToDatabase(logData);  // ✅ Calls function
```

**Note:** `logData` doesn't include `assignmentId` because it's already in the `logSetToDatabase` function's closure (defined in LiveWorkoutBlockExecutor).

---

## Step 4: logSetToDatabase Function

**File:** `src/components/client/LiveWorkoutBlockExecutor.tsx`

### Is assignmentId included in request body?

**YES ✅**

```typescript
// Line 174-224
const logSetToDatabase = async (data: any) => {
  // ... validation code ...

  // Build request body with all data passed from executor + required fields
  const requestBody: any = {
    // Required for workout_set_logs
    block_id: block.block.id,
    block_type: data.block_type || block.block.type,
    client_id: user.id,
    workout_assignment_id: assignmentId || undefined,  // ✅ INCLUDED HERE
    // For API to get/create workout_log_id (session tracking)
    session_id: String(sessionId).trim(),
    template_exercise_id: currentExercise?.id || null,
    // Backwards compatible
    access_token: access_token,
    // Spread all data from executor (block-type-specific fields)
    ...data,
  };

  // ... fetch call ...
};
```

**Property name:** `workout_assignment_id`
**Value source:** `assignmentId` from component props (closure)

---

## Step 5: API Request

**File:** `src/app/api/log-set/route.ts`

### Does /api/log-set receive it?

**YES ✅**

```typescript
// Line 36-47
const {
  workout_log_id,
  block_id,
  client_id,
  notes,
  block_type: incomingBlockType,
  workout_assignment_id,  // ✅ EXTRACTED HERE
  // Backwards compatible fields
  access_token,
  session_id,
  template_exercise_id,
} = body
```

**Property name:** `workout_assignment_id`

### Does it use it to find/create workout_log?

**YES ✅**

```typescript
// Line 113-144
if (!workoutLogId) {
  if (!workout_assignment_id) {
    return NextResponse.json(
      { error: 'Missing required field: workout_assignment_id (required for workout_logs)' },
      { status: 400 }
    )
  }

  const { data: newLog, error: createError } = await supabaseAdmin
    .from('workout_logs')
    .insert([
      {
        client_id: userId,
        workout_assignment_id: workout_assignment_id,  // ✅ USED HERE
        started_at: new Date().toISOString(),
        completed_at: null,
      },
    ])
    .select('id')
    .single()
  // ...
}
```

**Usage:** Creates `workout_logs` row with `workout_assignment_id` when `workout_log_id` is not provided.

---

## Complete Chain Summary

```
PAGE LEVEL:
- Variable name: assignmentId
- Source: params.id (URL parameter)
- Value: "7d47f83d-8045-4b95-91ca-e395851acd30" (example)
- Line: 122

LIVEWORKOUTBLOCKEXECUTOR:
- Does it receive assignmentId as prop? ✅ YES
- What prop name? assignmentId
- Does it pass to child executors? ✅ YES (via commonProps)
- Does it use in logSetToDatabase? ✅ YES (line 216: workout_assignment_id: assignmentId || undefined)

BLOCK EXECUTORS (StraightSetExecutor, etc):
- Do they receive assignmentId as prop? ✅ YES
- Is it used in logSetToDatabase call? ✅ INDIRECTLY (function has it in closure)
- Prop name: assignmentId

LOGSETTODATABASE FUNCTION:
- Is assignmentId included in request body? ✅ YES
- What property name? workout_assignment_id
- Line: 216

API REQUEST:
- Does /api/log-set receive it? ✅ YES
- Property name: workout_assignment_id
- Does it use it to find/create workout_log? ✅ YES
- Line: 42 (extraction), 126 (usage)
```

---

## Potential Issues

### Issue 1: assignmentId might be undefined

**Check:** Is `assignmentId` actually being passed from the page?

**Debug:**
```typescript
// In LiveWorkoutBlockExecutor, add:
console.log("🔍 LiveWorkoutBlockExecutor assignmentId:", assignmentId);

// In logSetToDatabase, add:
console.log("🔍 logSetToDatabase assignmentId:", assignmentId);
console.log("🔍 requestBody.workout_assignment_id:", requestBody.workout_assignment_id);
```

### Issue 2: assignmentId might be wrong value

**Check:** Is the URL parameter correct?

**Debug:**
```typescript
// In page component, add:
console.log("🔍 Page assignmentId from params:", params.id);
console.log("🔍 Page assignmentId variable:", assignmentId);
```

### Issue 3: API might not be receiving it

**Check:** Is `workout_assignment_id` in the request body?

**Debug:**
```typescript
// In /api/log-set, already logged:
console.log("📦 Request body:", { workout_assignment_id: body.workout_assignment_id });
```

---

## Verification Steps

1. **Check browser console** when logging a set:
   - Look for `🚀 Sending to /api/log-set:` log
   - Verify `workout_assignment_id` is present and not `undefined`

2. **Check server logs** (terminal):
   - Look for `📦 Request body:` log
   - Verify `workout_assignment_id` is present

3. **Check API logs**:
   - Look for `🔍 Step 1: Getting/creating workout_log_id`
   - Verify it's using `workout_assignment_id` to create the log

4. **Check database**:
   ```sql
   SELECT id, workout_assignment_id, client_id, started_at
   FROM workout_logs
   WHERE workout_assignment_id = 'YOUR_ASSIGNMENT_ID'
   ORDER BY started_at DESC
   LIMIT 5;
   ```

---

## Files Involved

1. **Page:** `src/app/client/workouts/[id]/start/page.tsx`
   - Line 122: `const assignmentId = params.id as string;`
   - Line 2391: `<LiveWorkoutBlockExecutor assignmentId={assignmentId} ... />`

2. **LiveWorkoutBlockExecutor:** `src/components/client/LiveWorkoutBlockExecutor.tsx`
   - Line 51: `assignmentId?: string;` (prop definition)
   - Line 66: `assignmentId,` (prop destructuring)
   - Line 216: `workout_assignment_id: assignmentId || undefined,` (in request body)
   - Line 422: `assignmentId,` (passed to commonProps)

3. **Types:** `src/components/client/workout-execution/types.ts`
   - Line 16: `assignmentId?: string;` (in BaseBlockExecutorProps)

4. **StraightSetExecutor:** `src/components/client/workout-execution/blocks/StraightSetExecutor.tsx`
   - Line 25: `assignmentId,` (prop destructuring)
   - Line 183: `await logSetToDatabase(logData)` (calls function with assignmentId in closure)

5. **API:** `src/app/api/log-set/route.ts`
   - Line 42: `workout_assignment_id,` (extracted from body)
   - Line 114-126: Used to create workout_log if needed

---

## Conclusion

The chain appears to be **correctly set up**. The `assignmentId` flows from:
1. URL params → Page variable
2. Page → LiveWorkoutBlockExecutor prop
3. LiveWorkoutBlockExecutor → logSetToDatabase closure
4. logSetToDatabase → API request body as `workout_assignment_id`
5. API → Uses to create/find workout_log

**If it's not working, the issue is likely:**
- `assignmentId` is `undefined` at some point
- The URL parameter is wrong
- The prop is not being passed correctly

**Next step:** Add the debug logs above to verify the value at each step.

