# Phase S5: Gym Console — Audit Report

## Current implementation (pre-S5)

### Page: `src/app/coach/gym-console/page.tsx`

- **Layout:** Two-panel: left = searchable client list, right = next workout for the selected client.
- **Storage:** `localStorage` key `gym-console-last-client` (single client ID).
- **Data flow:**
  - On load: `GET /api/coach/clients` → filter active clients → set `selectedClientId` from storage or first client.
  - When `selectedClientId` changes: `GET /api/coach/pickup/next-workout?clientId=...` → sets `workoutData`. No polling.
  - Mark complete: `POST /api/coach/pickup/mark-complete` with `{ clientId }`, then re-fetch next-workout.
- **UI:** Client list (ClientListItem), workout preview (program name, position, template name, blocks with BlockCard/ExerciseRow), single "Mark Workout Complete" button. No skip-day, no start-workout, no multi-client grid.

### Next-workout API: `src/app/api/coach/pickup/next-workout/route.ts`

- Single query: RPC `get_coach_pickup_workout(p_client_id)`.
- RPC validates coach/admin, client ownership, then reads `program_assignments`, `program_progress`, `program_schedule`, `workout_templates`, `workout_blocks`, and block exercises.
- Returns JSON with status (`active` | `completed` | `no_program`), client/program/position, template name, blocks (with exercises). One client per request.

### Mark-complete API: `src/app/api/coach/pickup/mark-complete/route.ts`

- Auth via `validateApiAuth`; coach role and client ownership checked.
- Uses `getProgramState(supabaseAdmin, clientId)` for next slot.
- Reuses existing incomplete `workout_log` for (client_id, program_assignment_id, program_schedule_id) or creates `workout_assignments` + `workout_logs`.
- Calls `completeWorkout({ completedBy: user.id, notes })`.
- Returns success and updated state.

### Related endpoints

- **Skip day:** `POST /api/coach/program-assignments/skip-day` — body: `programAssignmentId`, `programScheduleId`, `reason?`.
- **Start-from-progress:** `POST /api/program-workouts/start-from-progress` — uses `validateOwnership(user.id, clientId)` so only the client can start their own workout; coach cannot call it for a client. A new coach-only "start workout" endpoint is required for the gym console.
