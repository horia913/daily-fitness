# /api/log-set Endpoint Debugging Enhancements

## Problem

The `/api/log-set` endpoint was returning 400 (Bad Request) with empty error objects `{}`, making it impossible to debug why requests were failing.

## Solution

Added comprehensive error logging and validation throughout the endpoint to identify exactly where and why failures occur.

---

## Changes Made

### 1. Enhanced Request Parsing with Error Handling

**Before:**
```typescript
const body = await req.json()
```

**After:**
```typescript
let body: any;
try {
  body = await req.json();
  console.log("📦 Request body parsed successfully");
} catch (parseError) {
  console.error("❌ Error parsing request body:", parseError);
  return NextResponse.json(
    { 
      error: "Invalid JSON in request body",
      details: parseError instanceof Error ? parseError.message : String(parseError)
    },
    { status: 400 }
  );
}
```

**Result:** Catches JSON parsing errors and returns meaningful error messages.

---

### 2. Comprehensive Request Body Logging

**Added:**
- Logs all key fields from request body
- Shows types and presence of critical fields
- Lists all keys in the request body

**Example output:**
```
📦 Request body: {
  exercise_id: "abc-123",
  weight: 50,
  reps: 10,
  block_id: "block-456",
  client_id: "user-789",
  workout_assignment_id: "assignment-012",
  block_type: "straight_set",
  has_exercise_id: true,
  has_weight: true,
  has_reps: true,
  all_keys: ["exercise_id", "weight", "reps", ...]
}
```

---

### 3. Step-by-Step Validation Logging

**Each validation step now logs:**

#### User Authentication
```
🔍 Extracted parameters: { has_client_id: true, ... }
✅ Using client_id: user-789
```
OR
```
⚠️ No client_id provided, trying access_token...
🔐 Authenticating with access_token...
✅ Authenticated user: user-789
```

#### Block Type Validation
```
🔍 Validating block_type: straight_set
✅ Using block_type: straight_set
```
OR
```
❌ Invalid block_type: invalid_type
Valid types: ["straight_set", "superset", ...]
```

#### Workout Log Creation
```
🔍 Step 1: Getting/creating workout_log_id
  - Provided workout_log_id: none
  - workout_log_id not provided, will create new one
  - Creating workout_log with assignment_id: assignment-012
✅ Created new workout_log: log-345
```

#### Block ID Validation
```
🔍 Step 2: Building insert payload for workout_set_logs
✅ block_id validated: block-456
```

#### Block Type Processing
```
🔍 Processing block_type: straight_set
  - Processing straight_set
  - Validation: { has_exercise_id: true, weight: 50, reps: 10 }
✅ straight_set validation passed
```

#### Database Insert
```
💾 Step 3: Inserting to workout_set_logs: {
  block_type: "straight_set",
  block_id: "block-456",
  workout_log_id: "log-345",
  ...
}
✅ Successfully inserted to workout_set_logs
```

---

### 4. Enhanced Error Messages

**All error responses now include:**

- `error`: Human-readable error message
- `details`: Additional context or technical details
- `code`: Database error code (if applicable)
- `hint`: Database hint (if applicable)
- `received`: What was actually received (for validation errors)

**Example error response:**
```json
{
  "error": "Missing required fields for straight_set: exercise_id, weight, reps",
  "details": {
    "exercise_id": "missing",
    "weight": "missing or invalid",
    "reps": "missing or invalid",
    "received": {
      "exercise_id": null,
      "weight": undefined,
      "reps": "10"
    }
  }
}
```

---

### 5. Frontend Logging Enhancements

**In `LiveWorkoutBlockExecutor.tsx`:**

**Before:**
```typescript
const response = await fetch("/api/log-set", {...});
```

**After:**
```typescript
console.log('🚀 Sending to /api/log-set:', {
  workout_log_id: requestBody.workout_log_id,
  block_id: requestBody.block_id,
  block_type: requestBody.block_type,
  exercise_id: requestBody.exercise_id,
  weight: requestBody.weight,
  reps: requestBody.reps,
  client_id: requestBody.client_id,
  workout_assignment_id: requestBody.workout_assignment_id,
  all_keys: Object.keys(requestBody),
});

const response = await fetch("/api/log-set", {...});

console.log('📊 Response status:', response.status, response.statusText);
```

**Enhanced error handling:**
```typescript
let errorData: any;
try {
  const text = await response.text();
  console.error("❌ Response text:", text);
  errorData = JSON.parse(text);
} catch (parseError) {
  console.error("❌ Failed to parse error response:", parseError);
  errorData = { error: "Unknown error", raw_response: ... };
}
```

---

## How to Use

### 1. Check Browser Console

When logging a set, you should see:

**Success flow:**
```
🚀 Sending to /api/log-set: { block_id: "...", exercise_id: "...", ... }
📊 Response status: 200 OK
```

**Error flow:**
```
🚀 Sending to /api/log-set: { block_id: "...", exercise_id: null, ... }
📊 Response status: 400 Bad Request
❌ API returned error status: 400
❌ Response text: {"error":"Missing required fields...","details":{...}}
❌ API error response: { error: "...", details: {...} }
```

### 2. Check Server Logs

In your terminal/server logs, you'll see detailed step-by-step logs:

**Success:**
```
📥 /api/log-set called
📦 Request body parsed successfully
📦 Request body: { ... }
🔍 Extracted parameters: { ... }
✅ Using client_id: user-789
✅ Using block_type: straight_set
🔍 Step 1: Getting/creating workout_log_id
✅ Created new workout_log: log-345
🔍 Step 2: Building insert payload
✅ block_id validated: block-456
🔍 Processing block_type: straight_set
✅ straight_set validation passed
💾 Step 3: Inserting to workout_set_logs
✅ Successfully inserted to workout_set_logs
```

**Error:**
```
📥 /api/log-set called
📦 Request body parsed successfully
📦 Request body: { exercise_id: null, weight: undefined, ... }
🔍 Extracted parameters: { ... }
✅ Using client_id: user-789
✅ Using block_type: straight_set
🔍 Step 1: Getting/creating workout_log_id
✅ Created new workout_log: log-345
🔍 Step 2: Building insert payload
✅ block_id validated: block-456
🔍 Processing block_type: straight_set
  - Validation: { has_exercise_id: false, weight: null, reps: 10 }
❌ Missing required fields for straight_set: exercise_id, weight, reps
```

---

## Common Error Scenarios

### 1. Missing `exercise_id`

**Logs:**
```
❌ Missing required fields for straight_set: exercise_id, weight, reps
details: {
  exercise_id: "missing",
  weight: 50,
  reps: 10
}
```

**Fix:** Ensure `exercise_id` is included in the request body.

---

### 2. Missing `workout_assignment_id`

**Logs:**
```
🔍 Step 1: Getting/creating workout_log_id
  - workout_log_id not provided, will create new one
❌ Missing workout_assignment_id - required to create workout_log
```

**Fix:** Include `workout_assignment_id` in the request body when `workout_log_id` is not provided.

---

### 3. Invalid `block_type`

**Logs:**
```
🔍 Validating block_type: invalid_type
❌ Invalid block_type: invalid_type
Valid types: ["straight_set", "superset", ...]
```

**Fix:** Use a valid block type from the allowed list.

---

### 4. Database Insert Error

**Logs:**
```
💾 Step 3: Inserting to workout_set_logs
❌ Error logging set to workout_set_logs: {
  code: "23505",
  message: "duplicate key value violates unique constraint",
  details: "Key (id)=(...) already exists"
}
```

**Fix:** Check database constraints and ensure no duplicate keys.

---

## Testing

1. **Start a workout** and log a set
2. **Open browser console** (F12)
3. **Look for logs** starting with:
   - `🚀 Sending to /api/log-set`
   - `📊 Response status`
4. **Check server logs** for detailed step-by-step execution
5. **If error occurs**, the logs will show exactly which validation failed

---

## Expected Console Output

### Success Case:
```
🚀 Sending to /api/log-set: {
  block_id: "block-123",
  exercise_id: "ex-456",
  weight: 50,
  reps: 10,
  client_id: "user-789",
  workout_assignment_id: "assign-012"
}
📊 Response status: 200 OK
```

### Error Case:
```
🚀 Sending to /api/log-set: {
  block_id: "block-123",
  exercise_id: null,  // ❌ Missing!
  weight: 50,
  reps: 10,
  ...
}
📊 Response status: 400 Bad Request
❌ API returned error status: 400
❌ Response text: {"error":"Missing required fields...","details":{...}}
❌ API error response: {
  error: "Missing required fields for straight_set: exercise_id, weight, reps",
  details: {
    exercise_id: "missing",
    ...
  }
}
```

---

## Files Modified

1. **`src/app/api/log-set/route.ts`**
   - Added comprehensive logging at each step
   - Enhanced error messages with details
   - Added validation logging

2. **`src/components/client/LiveWorkoutBlockExecutor.tsx`**
   - Enhanced request logging
   - Improved error response parsing
   - Added response status logging

---

## Next Steps

After these changes:

1. **Test logging a set** and check console logs
2. **Identify the exact failure point** from the logs
3. **Fix the root cause** based on the error details
4. **Verify the fix** by checking logs again

The logs will now tell you exactly what's wrong, making debugging much easier!

