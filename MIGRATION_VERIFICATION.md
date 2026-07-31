# Migration Verification (Live Supabase)

**Queried at:** 2026-06-11T10:09:49.798Z  
**Data source:** live Supabase REST + PostgREST OpenAPI

---

## 1. Full live column lists

**Query (intended):**
```sql
SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (...)
ORDER BY table_name, ordinal_position;
```

**Executed via:** PostgREST OpenAPI introspection (`Accept: application/openapi+json`) because direct `information_schema` SQL could not be authenticated (see Surprises).

### `workout_set_entries`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| template_id | uuid | NO |  |  |
| set_order | integer | NO |  |  |
| set_name | character varying | YES |  |  |
| set_notes | text | YES |  |  |
| duration_seconds | integer | YES |  |  |
| rest_seconds | integer | YES |  |  |
| total_sets | integer | YES |  |  |
| reps_per_set | character varying | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| set_type | public.workout_set_type | NO | straight_set | enum: straight_set, superset, giant_set, drop_set, cluster_set, rest_pause, pyramid_set, pre_exhaustion, amrap, emom, emom_reps, tabata, circuit, for_time, ladder, hr_sets, speed_work, endurance, timed_set |

### `workout_set_entry_exercises`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| set_entry_id | uuid | NO |  |  |
| exercise_id | uuid | NO |  |  |
| exercise_order | integer | NO |  |  |
| exercise_letter | character varying | YES |  |  |
| sets | integer | YES |  |  |
| reps | character varying | YES |  |  |
| weight_kg | numeric | YES |  |  |
| rir | integer | YES |  |  |
| tempo | character varying | YES |  |  |
| rest_seconds | integer | YES |  |  |
| notes | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| load_percentage | numeric | YES |  |  |

### `workout_drop_sets`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| drop_order | integer | NO |  |  |
| weight_kg | numeric | YES |  |  |
| reps | character varying | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| set_entry_id | uuid | YES |  |  |
| exercise_id | uuid | YES |  |  |
| exercise_order | integer | YES | 1 |  |
| load_percentage | numeric | YES |  |  |
| drop_percentage | integer | YES |  |  |

### `workout_cluster_sets`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| reps_per_cluster | integer | NO |  |  |
| clusters_per_set | integer | NO |  |  |
| intra_cluster_rest | integer | YES | 15 |  |
| inter_set_rest | integer | YES | 120 |  |
| created_at | timestamp with time zone | YES | now() |  |
| set_entry_id | uuid | YES |  |  |
| exercise_id | uuid | YES |  |  |
| exercise_order | integer | YES | 1 |  |
| load_percentage | numeric | YES |  |  |
| weight_kg | numeric | YES |  |  |

### `workout_rest_pause_sets`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| weight_kg | numeric | YES |  |  |
| rest_pause_duration | integer | YES | 15 |  |
| max_rest_pauses | integer | YES | 3 |  |
| created_at | timestamp with time zone | YES | now() |  |
| set_entry_id | uuid | YES |  |  |
| exercise_id | uuid | YES |  |  |
| exercise_order | integer | YES | 1 |  |
| load_percentage | numeric | YES |  |  |

### `workout_time_protocols`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| set_entry_id | uuid | NO |  |  |
| protocol_type | character varying | NO |  |  |
| total_duration_minutes | integer | YES |  |  |
| work_seconds | integer | YES |  |  |
| rest_seconds | integer | YES |  |  |
| rounds | integer | YES |  |  |
| reps_per_round | integer | YES |  |  |
| rest_after_round_seconds | integer | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| exercise_id | uuid | YES |  |  |
| exercise_order | integer | YES | 1 |  |
| load_percentage | numeric | YES |  |  |
| set | integer | YES |  |  |
| rest_after_set | integer | YES |  |  |
| weight_kg | numeric | YES |  |  |
| target_reps | integer | YES |  |  |
| time_cap_minutes | integer | YES |  |  |
| emom_mode | character varying | YES |  |  |

### `workout_speed_sets`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| set_entry_id | uuid | NO |  |  |
| exercise_id | uuid | NO |  |  |
| exercise_order | integer | NO | 1 |  |
| intervals | integer | NO | 1 |  |
| distance_meters | numeric | YES |  |  |
| target_speed_pct | numeric | YES |  |  |
| target_hr_pct | numeric | YES |  |  |
| rest_seconds | integer | NO | 120 |  |
| load_pct_bw | numeric | YES |  |  |
| notes | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

### `workout_endurance_sets`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| set_entry_id | uuid | NO |  |  |
| exercise_id | uuid | NO |  |  |
| exercise_order | integer | NO | 1 |  |
| target_distance_meters | numeric | YES |  |  |
| target_time_seconds | integer | YES |  |  |
| target_pace_seconds_per_km | numeric | YES |  |  |
| target_hr_pct | numeric | YES |  |  |
| hr_zone | integer | YES |  |  |
| notes | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

### `program_progression_rules`

| column_name | data_type | is_nullable | column_default | enum_or_notes |
| --- | --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |  |
| program_id | uuid | NO |  |  |
| week_number | integer | NO |  |  |
| sets | integer | YES |  |  |
| reps | text | YES |  |  |
| weight_guidance | text | YES |  |  |
| rest_time | integer | YES |  |  |
| notes | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| program_schedule_id | uuid | YES |  |  |
| set_entry_id | uuid | YES |  |  |
| set_type | text | NO |  |  |
| exercise_id | uuid | YES |  |  |
| exercise_order | integer | YES |  |  |
| exercise_letter | character varying | YES |  |  |
| rest_seconds | integer | YES |  |  |
| tempo | character varying | YES |  |  |
| rir | integer | YES |  |  |
| second_exercise_id | uuid | YES |  |  |
| compound_exercise_id | uuid | YES |  |  |
| first_exercise_reps | character varying | YES |  |  |
| second_exercise_reps | character varying | YES |  |  |
| isolation_reps | character varying | YES |  |  |
| compound_reps | character varying | YES |  |  |
| rest_between_pairs | integer | YES |  |  |
| exercise_reps | character varying | YES |  |  |
| drop_set_reps | character varying | YES |  |  |
| weight_reduction_percentage | integer | YES |  |  |
| reps_per_cluster | integer | YES |  |  |
| clusters_per_set | integer | YES |  |  |
| intra_cluster_rest | integer | YES |  |  |
| rest_pause_duration | integer | YES |  |  |
| max_rest_pauses | integer | YES |  |  |
| rounds | integer | YES |  |  |
| work_seconds | integer | YES |  |  |
| rest_after_exercise | integer | YES |  |  |
| rest_after_set | integer | YES |  |  |
| duration_minutes | integer | YES |  |  |
| emom_mode | character varying | YES |  |  |
| target_reps | integer | YES |  |  |
| time_cap_minutes | integer | YES |  |  |
| set_order | integer | NO |  |  |
| set_name | text | YES |  |  |
| weight_kg | numeric | YES |  |  |
| load_percentage | numeric | YES |  |  |
| training_block_id | uuid | YES |  |  |
| speed_endurance_config | jsonb | YES |  |  |

## 2. CHECK constraints and foreign keys on `workout_set_entries` and `workout_set_entry_exercises`

**Query (intended):**
```sql
SELECT c.conname AS constraint_name, c.contype AS constraint_type, t.relname AS table_name, pg_get_constraintdef(c.oid, true) AS definition FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid WHERE n.nspname = 'public' AND t.relname IN ('workout_set_entries', 'workout_set_entry_exercises') ORDER BY t.relname, c.contype, c.conname
```

**Executed via:** PostgREST OpenAPI FK/enum/PK annotations (live `pg_constraint` query not run — see Surprises).

### `workout_set_entries` (4 derived constraints)

| constraint_type | constraint_name | definition |
| --- | --- | --- |
| n | (postgrest) workout_set_entries_not_null_columns | NOT NULL: id, template_id, set_order, set_type |
| p | (postgrest) workout_set_entries_pkey | PRIMARY KEY (id) |
| f | (postgrest) workout_set_entries_template_id_fk | FOREIGN KEY (template_id) REFERENCES workout_templates(id) |
| c | (postgrest) workout_set_entries_set_type_enum | CHECK (set_type IN ('straight_set', 'superset', 'giant_set', 'drop_set', 'cluster_set', 'rest_pause', 'pyramid_set', 'pre_exhaustion', 'amrap', 'emom', 'emom_reps', 'tabata', 'circuit', 'for_time', 'ladder', 'hr_sets', 'speed_work', 'endurance', 'timed_set')) |

### `workout_set_entry_exercises` (4 derived constraints)

| constraint_type | constraint_name | definition |
| --- | --- | --- |
| n | (postgrest) workout_set_entry_exercises_not_null_columns | NOT NULL: id, set_entry_id, exercise_id, exercise_order |
| p | (postgrest) workout_set_entry_exercises_pkey | PRIMARY KEY (id) |
| f | (postgrest) workout_set_entry_exercises_set_entry_id_fk | FOREIGN KEY (set_entry_id) REFERENCES workout_set_entries(id) |
| f | (postgrest) workout_set_entry_exercises_exercise_id_fk | FOREIGN KEY (exercise_id) REFERENCES exercises(id) |

## 3. `exercise_id` on satellite tables

### `workout_drop_sets`

- **Has `exercise_id` column:** YES
- **Row count:** 7
- **Columns:** id, drop_order, weight_kg, reps, created_at, set_entry_id, exercise_id, exercise_order, load_percentage, drop_percentage
- **Sample rows (up to 3):**

```json
[
  {
    "id": "df3d5ca9-38b5-4e78-a96e-0211278bc6cc",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-03-24T18:21:08.488115+00:00",
    "set_entry_id": "0d67f19c-9ba6-47f2-a877-6b347e71a0ea",
    "exercise_id": "80ec4470-74fc-47b5-a870-9c0513df20d1",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 20
  },
  {
    "id": "d207758a-8d37-4b90-afa0-23fe04a11376",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-01-18T19:02:53.072185+00:00",
    "set_entry_id": "5cfd7af3-7332-4d64-9840-a577bbc29d4f",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 50
  },
  {
    "id": "6615e542-3733-4c2c-ac37-1f429318e762",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-03-23T21:55:11.355256+00:00",
    "set_entry_id": "7ac23964-b3f5-41dc-b48a-38f97e17c457",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 20
  }
]
```
### `workout_cluster_sets`

- **Has `exercise_id` column:** YES
- **Row count:** 3
- **Columns:** id, reps_per_cluster, clusters_per_set, intra_cluster_rest, inter_set_rest, created_at, set_entry_id, exercise_id, exercise_order, load_percentage, weight_kg
- **Sample rows (up to 3):**

```json
[
  {
    "id": "269f39bc-0efa-4d35-a765-c70522acd17b",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 180,
    "created_at": "2026-01-18T18:57:58.76623+00:00",
    "set_entry_id": "8b3c9c22-5e0d-40f3-ba92-d20b91959b36",
    "exercise_id": "5c66cb4a-907f-4612-9bbb-09852f7d81e3",
    "exercise_order": 1,
    "load_percentage": 70,
    "weight_kg": null
  },
  {
    "id": "28d12662-557d-4dce-8cca-1ae31212d01a",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 180,
    "created_at": "2026-03-23T21:11:35.280879+00:00",
    "set_entry_id": "c504cb19-c73b-4b62-b6c5-4c0b7d4edbea",
    "exercise_id": "5c66cb4a-907f-4612-9bbb-09852f7d81e3",
    "exercise_order": 1,
    "load_percentage": 70,
    "weight_kg": null
  },
  {
    "id": "00a768a3-96ba-4535-b3d0-f6fa9a7a4edb",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 60,
    "created_at": "2026-02-04T11:19:12.140218+00:00",
    "set_entry_id": "c9f166af-35ae-46fc-a13d-632aaa9f6714",
    "exercise_id": "a4326501-035d-44da-b79a-6f512e57c7d4",
    "exercise_order": 1,
    "load_percentage": 80,
    "weight_kg": null
  }
]
```
### `workout_rest_pause_sets`

- **Has `exercise_id` column:** YES
- **Row count:** 1
- **Columns:** id, weight_kg, rest_pause_duration, max_rest_pauses, created_at, set_entry_id, exercise_id, exercise_order, load_percentage
- **Sample rows (up to 3):**

```json
[
  {
    "id": "e3bdd57f-1b57-4ada-a8a6-3dbb1575f1b1",
    "weight_kg": null,
    "rest_pause_duration": 20,
    "max_rest_pauses": 4,
    "created_at": "2026-02-04T11:19:15.91272+00:00",
    "set_entry_id": "8be1cecd-208b-4927-a28a-87b9d12425bc",
    "exercise_id": "7263f634-80a1-440f-b8a1-3beec7433169",
    "exercise_order": 1,
    "load_percentage": 70
  }
]
```
### `workout_time_protocols`

- **Has `exercise_id` column:** YES
- **Row count:** 11
- **Columns:** id, set_entry_id, protocol_type, total_duration_minutes, work_seconds, rest_seconds, rounds, reps_per_round, rest_after_round_seconds, created_at, exercise_id, exercise_order, load_percentage, set, rest_after_set, weight_kg, target_reps, time_cap_minutes, emom_mode
- **Sample rows (up to 3):**

```json
[
  {
    "id": "1a919c1f-69bd-4c0a-b272-cf92d9760c13",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:36.369338+00:00",
    "exercise_id": "07074528-0a8e-467a-aef9-42defcdb75a8",
    "exercise_order": 1,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "8a61be43-f0a0-41ec-9938-3d3ef4bcd14f",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:41.031636+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 3,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "50f384a7-76f5-45e1-97b9-957e53a55aea",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:39.026278+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 2,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  }
]
```
### `workout_speed_sets`

- **Has `exercise_id` column:** YES
- **Row count:** 1
- **Columns:** id, set_entry_id, exercise_id, exercise_order, intervals, distance_meters, target_speed_pct, target_hr_pct, rest_seconds, load_pct_bw, notes, created_at, updated_at
- **Sample rows (up to 3):**

```json
[
  {
    "id": "032a71c0-b96c-446a-a1c3-7e2e20e2c535",
    "set_entry_id": "31cef3be-6c27-4082-8d29-e22b6dc72274",
    "exercise_id": "0d6dde78-ac70-678b-5398-2ec815c3d7d5",
    "exercise_order": 1,
    "intervals": 2,
    "distance_meters": 50,
    "target_speed_pct": 100,
    "target_hr_pct": null,
    "rest_seconds": 120,
    "load_pct_bw": 20,
    "notes": null,
    "created_at": "2026-04-05T07:13:47.494253+00:00",
    "updated_at": "2026-04-05T07:13:47.494253+00:00"
  }
]
```
### `workout_endurance_sets`

- **Has `exercise_id` column:** YES
- **Row count:** 2
- **Columns:** id, set_entry_id, exercise_id, exercise_order, target_distance_meters, target_time_seconds, target_pace_seconds_per_km, target_hr_pct, hr_zone, notes, created_at, updated_at
- **Sample rows (up to 3):**

```json
[
  {
    "id": "ddcc73bd-56ec-4d76-bce3-6658be0ee971",
    "set_entry_id": "a07322b5-9fa9-44ff-8970-8200f66ef70c",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T07:13:48.329129+00:00",
    "updated_at": "2026-04-05T07:13:48.329129+00:00"
  },
  {
    "id": "3dc09b03-dc9e-460a-b497-9ef77a7c0df6",
    "set_entry_id": "e03acbf2-b82c-4969-9ee4-41b8fdd03af5",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T06:47:30.775317+00:00",
    "updated_at": "2026-04-05T06:47:30.775317+00:00"
  }
]
```

## 4. Full row dumps — satellite tables

### `workout_drop_sets` (7 rows)

```json
[
  {
    "id": "df3d5ca9-38b5-4e78-a96e-0211278bc6cc",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-03-24T18:21:08.488115+00:00",
    "set_entry_id": "0d67f19c-9ba6-47f2-a877-6b347e71a0ea",
    "exercise_id": "80ec4470-74fc-47b5-a870-9c0513df20d1",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 20
  },
  {
    "id": "d207758a-8d37-4b90-afa0-23fe04a11376",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-01-18T19:02:53.072185+00:00",
    "set_entry_id": "5cfd7af3-7332-4d64-9840-a577bbc29d4f",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 50
  },
  {
    "id": "6615e542-3733-4c2c-ac37-1f429318e762",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-03-23T21:55:11.355256+00:00",
    "set_entry_id": "7ac23964-b3f5-41dc-b48a-38f97e17c457",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 20
  },
  {
    "id": "f1b19626-3293-482c-9a25-81dd6814ea74",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-01-18T19:08:28.155293+00:00",
    "set_entry_id": "98842794-68e8-471b-a8a8-5ccba009b216",
    "exercise_id": "b222ff99-c991-4a8a-9dd0-d85debab9398",
    "exercise_order": 1,
    "load_percentage": 70,
    "drop_percentage": 50
  },
  {
    "id": "c72b2fa0-36dc-4043-92c3-c3245b38d5d1",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "6",
    "created_at": "2026-01-18T18:51:26.937471+00:00",
    "set_entry_id": "b3282cc5-20c3-43d3-8474-452afafe9980",
    "exercise_id": "0ad0fbd6-f378-4758-977d-f066c6c8a143",
    "exercise_order": 1,
    "load_percentage": 75,
    "drop_percentage": 50
  },
  {
    "id": "90c35cbe-b267-415a-b996-d5b025722dd1",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "8",
    "created_at": "2026-05-17T19:56:38.340133+00:00",
    "set_entry_id": "df080326-3eb3-4067-a572-588707f7307d",
    "exercise_id": "06c91dd5-3891-4a6d-bdd8-8b05495cd35d",
    "exercise_order": 1,
    "load_percentage": 80,
    "drop_percentage": 20
  },
  {
    "id": "62979106-5844-4fce-bfef-6e6dd253ef58",
    "drop_order": 1,
    "weight_kg": null,
    "reps": "10",
    "created_at": "2026-02-04T11:19:08.726013+00:00",
    "set_entry_id": "f149188d-e0e0-4d8e-af7f-bc2540d3887a",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 50,
    "drop_percentage": 30
  }
]
```
### `workout_cluster_sets` (3 rows)

```json
[
  {
    "id": "269f39bc-0efa-4d35-a765-c70522acd17b",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 180,
    "created_at": "2026-01-18T18:57:58.76623+00:00",
    "set_entry_id": "8b3c9c22-5e0d-40f3-ba92-d20b91959b36",
    "exercise_id": "5c66cb4a-907f-4612-9bbb-09852f7d81e3",
    "exercise_order": 1,
    "load_percentage": 70,
    "weight_kg": null
  },
  {
    "id": "28d12662-557d-4dce-8cca-1ae31212d01a",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 180,
    "created_at": "2026-03-23T21:11:35.280879+00:00",
    "set_entry_id": "c504cb19-c73b-4b62-b6c5-4c0b7d4edbea",
    "exercise_id": "5c66cb4a-907f-4612-9bbb-09852f7d81e3",
    "exercise_order": 1,
    "load_percentage": 70,
    "weight_kg": null
  },
  {
    "id": "00a768a3-96ba-4535-b3d0-f6fa9a7a4edb",
    "reps_per_cluster": 5,
    "clusters_per_set": 4,
    "intra_cluster_rest": 15,
    "inter_set_rest": 60,
    "created_at": "2026-02-04T11:19:12.140218+00:00",
    "set_entry_id": "c9f166af-35ae-46fc-a13d-632aaa9f6714",
    "exercise_id": "a4326501-035d-44da-b79a-6f512e57c7d4",
    "exercise_order": 1,
    "load_percentage": 80,
    "weight_kg": null
  }
]
```
### `workout_rest_pause_sets` (1 rows)

```json
[
  {
    "id": "e3bdd57f-1b57-4ada-a8a6-3dbb1575f1b1",
    "weight_kg": null,
    "rest_pause_duration": 20,
    "max_rest_pauses": 4,
    "created_at": "2026-02-04T11:19:15.91272+00:00",
    "set_entry_id": "8be1cecd-208b-4927-a28a-87b9d12425bc",
    "exercise_id": "7263f634-80a1-440f-b8a1-3beec7433169",
    "exercise_order": 1,
    "load_percentage": 70
  }
]
```
### `workout_time_protocols` (11 rows)

```json
[
  {
    "id": "1a919c1f-69bd-4c0a-b272-cf92d9760c13",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:36.369338+00:00",
    "exercise_id": "07074528-0a8e-467a-aef9-42defcdb75a8",
    "exercise_order": 1,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "8a61be43-f0a0-41ec-9938-3d3ef4bcd14f",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:41.031636+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 3,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "50f384a7-76f5-45e1-97b9-957e53a55aea",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:39.026278+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 2,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "4ddb0046-3459-43f5-b730-58483d6d859b",
    "set_entry_id": "3f963f0e-60f9-46dd-a0fb-26f84746b791",
    "protocol_type": "emom",
    "total_duration_minutes": 5,
    "work_seconds": 30,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": 5,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:28.17467+00:00",
    "exercise_id": "f0c297a4-0d08-471e-a7e6-ec42ddab8192",
    "exercise_order": 1,
    "load_percentage": 45,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "rep_based"
  },
  {
    "id": "e0b631f6-c758-4fba-a233-4cb195c5c4b2",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:35.616352+00:00",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 2,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "a4047e26-22be-48a5-a1b3-290aa0c42b1f",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:33.359291+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "5dafa21f-c42b-4df5-bc3f-2ae0ffe15437",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:37.544144+00:00",
    "exercise_id": "f0c297a4-0d08-471e-a7e6-ec42ddab8192",
    "exercise_order": 3,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "c95ef154-42e2-4bc5-97b9-d81cba13586c",
    "set_entry_id": "a6af4c54-93c5-4e12-b7b7-78cf03d11458",
    "protocol_type": "amrap",
    "total_duration_minutes": 5,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:23.164023+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 50,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "03d05ae5-1197-4820-b64a-139487705f9d",
    "set_entry_id": "a7afb10e-7b94-4509-9214-28493581dac0",
    "protocol_type": "emom",
    "total_duration_minutes": 4,
    "work_seconds": 45,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:25.748048+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 30,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "time_based"
  },
  {
    "id": "35551d10-0d9a-4dee-999a-58d4a0123fde",
    "set_entry_id": "d2b838a0-ccf3-4f8d-b882-e08afbdbede8",
    "protocol_type": "for_time",
    "total_duration_minutes": null,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:30.606585+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 35,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": 50,
    "time_cap_minutes": 3,
    "emom_mode": null
  },
  {
    "id": "2d731998-6b7e-497a-9004-ebd4bb284dbb",
    "set_entry_id": "f26c2754-c44b-4e54-8d72-d22f32f8614d",
    "protocol_type": "for_time",
    "total_duration_minutes": null,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-11T14:26:36.286634+00:00",
    "exercise_id": "e6056418-c715-4f08-b3f6-7e3fbcc0d446",
    "exercise_order": 1,
    "load_percentage": null,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": 100,
    "time_cap_minutes": 10,
    "emom_mode": null
  }
]
```
### `workout_speed_sets` (1 rows)

```json
[
  {
    "id": "032a71c0-b96c-446a-a1c3-7e2e20e2c535",
    "set_entry_id": "31cef3be-6c27-4082-8d29-e22b6dc72274",
    "exercise_id": "0d6dde78-ac70-678b-5398-2ec815c3d7d5",
    "exercise_order": 1,
    "intervals": 2,
    "distance_meters": 50,
    "target_speed_pct": 100,
    "target_hr_pct": null,
    "rest_seconds": 120,
    "load_pct_bw": 20,
    "notes": null,
    "created_at": "2026-04-05T07:13:47.494253+00:00",
    "updated_at": "2026-04-05T07:13:47.494253+00:00"
  }
]
```
### `workout_endurance_sets` (2 rows)

```json
[
  {
    "id": "ddcc73bd-56ec-4d76-bce3-6658be0ee971",
    "set_entry_id": "a07322b5-9fa9-44ff-8970-8200f66ef70c",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T07:13:48.329129+00:00",
    "updated_at": "2026-04-05T07:13:48.329129+00:00"
  },
  {
    "id": "3dc09b03-dc9e-460a-b497-9ef77a7c0df6",
    "set_entry_id": "e03acbf2-b82c-4969-9ee4-41b8fdd03af5",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T06:47:30.775317+00:00",
    "updated_at": "2026-04-05T06:47:30.775317+00:00"
  }
]
```
## 5. Protocol-type set entries expanded

Set types: `amrap`, `emom`, `for_time`, `tabata`, `speed_work`, `endurance`.

### Set entry `a6af4c54-93c5-4e12-b7b7-78cf03d11458` — `amrap` (template `2d3a40ad-493b-4307-a5b6-683429f39c0c`, order 8)

**Parent `workout_set_entries` row:**

```json
{
  "id": "a6af4c54-93c5-4e12-b7b7-78cf03d11458",
  "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
  "set_order": 8,
  "set_name": "21s Curl",
  "set_notes": null,
  "duration_seconds": 300,
  "rest_seconds": null,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-04T11:19:22.179589+00:00",
  "updated_at": "2026-02-04T11:19:22.179589+00:00",
  "set_type": "amrap"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "c95ef154-42e2-4bc5-97b9-d81cba13586c",
    "set_entry_id": "a6af4c54-93c5-4e12-b7b7-78cf03d11458",
    "protocol_type": "amrap",
    "total_duration_minutes": 5,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:23.164023+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 50,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  }
]
```
---

### Set entry `3f963f0e-60f9-46dd-a0fb-26f84746b791` — `emom` (template `2d3a40ad-493b-4307-a5b6-683429f39c0c`, order 10)

**Parent `workout_set_entries` row:**

```json
{
  "id": "3f963f0e-60f9-46dd-a0fb-26f84746b791",
  "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
  "set_order": 10,
  "set_name": "Anderson Squat",
  "set_notes": null,
  "duration_seconds": 300,
  "rest_seconds": null,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-04T11:19:27.359901+00:00",
  "updated_at": "2026-02-04T11:19:27.359901+00:00",
  "set_type": "emom"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "4ddb0046-3459-43f5-b730-58483d6d859b",
    "set_entry_id": "3f963f0e-60f9-46dd-a0fb-26f84746b791",
    "protocol_type": "emom",
    "total_duration_minutes": 5,
    "work_seconds": 30,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": 5,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:28.17467+00:00",
    "exercise_id": "f0c297a4-0d08-471e-a7e6-ec42ddab8192",
    "exercise_order": 1,
    "load_percentage": 45,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "rep_based"
  }
]
```
---

### Set entry `a7afb10e-7b94-4509-9214-28493581dac0` — `emom` (template `2d3a40ad-493b-4307-a5b6-683429f39c0c`, order 9)

**Parent `workout_set_entries` row:**

```json
{
  "id": "a7afb10e-7b94-4509-9214-28493581dac0",
  "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
  "set_order": 9,
  "set_name": "21s Curl",
  "set_notes": null,
  "duration_seconds": 240,
  "rest_seconds": null,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-04T11:19:24.621665+00:00",
  "updated_at": "2026-02-04T11:19:24.621665+00:00",
  "set_type": "emom"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "03d05ae5-1197-4820-b64a-139487705f9d",
    "set_entry_id": "a7afb10e-7b94-4509-9214-28493581dac0",
    "protocol_type": "emom",
    "total_duration_minutes": 4,
    "work_seconds": 45,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:25.748048+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 30,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "time_based"
  }
]
```
---

### Set entry `0c94adfa-c714-46f0-a621-6fab481475d6` — `tabata` (template `4759769c-f9a4-47fa-aa55-30467d08ffba`, order 6)

**Parent `workout_set_entries` row:**

```json
{
  "id": "0c94adfa-c714-46f0-a621-6fab481475d6",
  "template_id": "4759769c-f9a4-47fa-aa55-30467d08ffba",
  "set_order": 6,
  "set_name": "Plank Jacks + Side Plank",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": 30,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-02T20:04:35.040509+00:00",
  "updated_at": "2026-02-02T20:04:35.040509+00:00",
  "set_type": "tabata"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "1a919c1f-69bd-4c0a-b272-cf92d9760c13",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:36.369338+00:00",
    "exercise_id": "07074528-0a8e-467a-aef9-42defcdb75a8",
    "exercise_order": 1,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "50f384a7-76f5-45e1-97b9-957e53a55aea",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:39.026278+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 2,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "8a61be43-f0a0-41ec-9938-3d3ef4bcd14f",
    "set_entry_id": "0c94adfa-c714-46f0-a621-6fab481475d6",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 3,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-02T20:04:41.031636+00:00",
    "exercise_id": "9bb3f2db-b10e-4828-977e-595e2b035722",
    "exercise_order": 3,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  }
]
```
---

### Set entry `6906fff5-bcaa-435d-bd18-76ccbf6f8231` — `tabata` (template `2d3a40ad-493b-4307-a5b6-683429f39c0c`, order 12)

**Parent `workout_set_entries` row:**

```json
{
  "id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
  "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
  "set_order": 12,
  "set_name": "21s Curl + 45-Degree Back Extension + 1 other",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": 30,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-04T11:19:32.32024+00:00",
  "updated_at": "2026-02-04T11:19:32.32024+00:00",
  "set_type": "tabata"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "5dafa21f-c42b-4df5-bc3f-2ae0ffe15437",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:37.544144+00:00",
    "exercise_id": "f0c297a4-0d08-471e-a7e6-ec42ddab8192",
    "exercise_order": 3,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "a4047e26-22be-48a5-a1b3-290aa0c42b1f",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:33.359291+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  },
  {
    "id": "e0b631f6-c758-4fba-a233-4cb195c5c4b2",
    "set_entry_id": "6906fff5-bcaa-435d-bd18-76ccbf6f8231",
    "protocol_type": "tabata",
    "total_duration_minutes": null,
    "work_seconds": 30,
    "rest_seconds": 10,
    "rounds": 1,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:35.616352+00:00",
    "exercise_id": "c8a477e3-d754-46cb-b7b3-943149117602",
    "exercise_order": 2,
    "load_percentage": null,
    "set": 1,
    "rest_after_set": 60,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": null
  }
]
```
---

### Set entry `d2b838a0-ccf3-4f8d-b882-e08afbdbede8` — `for_time` (template `2d3a40ad-493b-4307-a5b6-683429f39c0c`, order 11)

**Parent `workout_set_entries` row:**

```json
{
  "id": "d2b838a0-ccf3-4f8d-b882-e08afbdbede8",
  "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
  "set_order": 11,
  "set_name": "21s Curl",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": null,
  "total_sets": null,
  "reps_per_set": null,
  "created_at": "2026-02-04T11:19:29.568675+00:00",
  "updated_at": "2026-02-04T11:19:29.568675+00:00",
  "set_type": "for_time"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "35551d10-0d9a-4dee-999a-58d4a0123fde",
    "set_entry_id": "d2b838a0-ccf3-4f8d-b882-e08afbdbede8",
    "protocol_type": "for_time",
    "total_duration_minutes": null,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:30.606585+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 35,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": 50,
    "time_cap_minutes": 3,
    "emom_mode": null
  }
]
```
---

### Set entry `f26c2754-c44b-4e54-8d72-d22f32f8614d` — `for_time` (template `fda20610-2a9d-486c-b887-c3932b7d3f50`, order 6)

**Parent `workout_set_entries` row:**

```json
{
  "id": "f26c2754-c44b-4e54-8d72-d22f32f8614d",
  "template_id": "fda20610-2a9d-486c-b887-c3932b7d3f50",
  "set_order": 6,
  "set_name": "Walking Lunge",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": null,
  "total_sets": 1,
  "reps_per_set": null,
  "created_at": "2026-02-11T14:26:35.50564+00:00",
  "updated_at": "2026-02-11T14:26:35.50564+00:00",
  "set_type": "for_time"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_time_protocols`:**

```json
[
  {
    "id": "2d731998-6b7e-497a-9004-ebd4bb284dbb",
    "set_entry_id": "f26c2754-c44b-4e54-8d72-d22f32f8614d",
    "protocol_type": "for_time",
    "total_duration_minutes": null,
    "work_seconds": null,
    "rest_seconds": null,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-11T14:26:36.286634+00:00",
    "exercise_id": "e6056418-c715-4f08-b3f6-7e3fbcc0d446",
    "exercise_order": 1,
    "load_percentage": null,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": 100,
    "time_cap_minutes": 10,
    "emom_mode": null
  }
]
```
---

### Set entry `1ab803f1-6294-40f2-b4e1-755813f8258c` — `speed_work` (template `5e578970-4e9b-4846-a06a-e7cbda557227`, order 1)

**Parent `workout_set_entries` row:**

```json
{
  "id": "1ab803f1-6294-40f2-b4e1-755813f8258c",
  "template_id": "5e578970-4e9b-4846-a06a-e7cbda557227",
  "set_order": 1,
  "set_name": "Sled Acceleration",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": 120,
  "total_sets": 2,
  "reps_per_set": null,
  "created_at": "2026-04-05T06:47:30.086214+00:00",
  "updated_at": "2026-04-05T06:47:30.086214+00:00",
  "set_type": "speed_work"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

---

### Set entry `31cef3be-6c27-4082-8d29-e22b6dc72274` — `speed_work` (template `08fca358-c890-46ce-a463-d183758bd603`, order 1)

**Parent `workout_set_entries` row:**

```json
{
  "id": "31cef3be-6c27-4082-8d29-e22b6dc72274",
  "template_id": "08fca358-c890-46ce-a463-d183758bd603",
  "set_order": 1,
  "set_name": "Sled Acceleration",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": 120,
  "total_sets": 2,
  "reps_per_set": null,
  "created_at": "2026-04-05T07:13:47.271733+00:00",
  "updated_at": "2026-04-05T07:13:47.271733+00:00",
  "set_type": "speed_work"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_speed_sets`:**

```json
[
  {
    "id": "032a71c0-b96c-446a-a1c3-7e2e20e2c535",
    "set_entry_id": "31cef3be-6c27-4082-8d29-e22b6dc72274",
    "exercise_id": "0d6dde78-ac70-678b-5398-2ec815c3d7d5",
    "exercise_order": 1,
    "intervals": 2,
    "distance_meters": 50,
    "target_speed_pct": 100,
    "target_hr_pct": null,
    "rest_seconds": 120,
    "load_pct_bw": 20,
    "notes": null,
    "created_at": "2026-04-05T07:13:47.494253+00:00",
    "updated_at": "2026-04-05T07:13:47.494253+00:00"
  }
]
```
---

### Set entry `a07322b5-9fa9-44ff-8970-8200f66ef70c` — `endurance` (template `08fca358-c890-46ce-a463-d183758bd603`, order 2)

**Parent `workout_set_entries` row:**

```json
{
  "id": "a07322b5-9fa9-44ff-8970-8200f66ef70c",
  "template_id": "08fca358-c890-46ce-a463-d183758bd603",
  "set_order": 2,
  "set_name": "Wicket Run at 50–60%",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": null,
  "total_sets": 1,
  "reps_per_set": null,
  "created_at": "2026-04-05T07:13:48.073692+00:00",
  "updated_at": "2026-04-05T07:13:48.073692+00:00",
  "set_type": "endurance"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_endurance_sets`:**

```json
[
  {
    "id": "ddcc73bd-56ec-4d76-bce3-6658be0ee971",
    "set_entry_id": "a07322b5-9fa9-44ff-8970-8200f66ef70c",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T07:13:48.329129+00:00",
    "updated_at": "2026-04-05T07:13:48.329129+00:00"
  }
]
```
---

### Set entry `e03acbf2-b82c-4969-9ee4-41b8fdd03af5` — `endurance` (template `5e578970-4e9b-4846-a06a-e7cbda557227`, order 2)

**Parent `workout_set_entries` row:**

```json
{
  "id": "e03acbf2-b82c-4969-9ee4-41b8fdd03af5",
  "template_id": "5e578970-4e9b-4846-a06a-e7cbda557227",
  "set_order": 2,
  "set_name": "Wicket Run at 50–60%",
  "set_notes": null,
  "duration_seconds": null,
  "rest_seconds": null,
  "total_sets": 1,
  "reps_per_set": null,
  "created_at": "2026-04-05T06:47:30.54852+00:00",
  "updated_at": "2026-04-05T06:47:30.54852+00:00",
  "set_type": "endurance"
}
```
**`workout_set_entry_exercises` count:** 0

_Zero `workout_set_entry_exercises` rows._

**`workout_endurance_sets`:**

```json
[
  {
    "id": "3dc09b03-dc9e-460a-b497-9ef77a7c0df6",
    "set_entry_id": "e03acbf2-b82c-4969-9ee4-41b8fdd03af5",
    "exercise_id": "47c1e8a8-1497-c058-1089-245bd70e2b7f",
    "exercise_order": 1,
    "target_distance_meters": 1000,
    "target_time_seconds": 600,
    "target_pace_seconds_per_km": 500,
    "target_hr_pct": null,
    "hr_zone": 5,
    "notes": null,
    "created_at": "2026-04-05T06:47:30.775317+00:00",
    "updated_at": "2026-04-05T06:47:30.775317+00:00"
  }
]
```
---

## 6. EMOM semantics (live rows + `EmomExecutor`)

### Live EMOM data

**Distinct `emom_mode` in `workout_time_protocols` where `protocol_type = 'emom'`:**

```json
[
  {
    "emom_mode": "rep_based",
    "n": 1
  },
  {
    "emom_mode": "time_based",
    "n": 1
  }
]
```
**`work_seconds` values on EMOM protocol rows:**

```json
[
  {
    "work_seconds": 30,
    "n": 1
  },
  {
    "work_seconds": 45,
    "n": 1
  }
]
```
**All live EMOM `workout_set_entries` rows:**

```json
[
  {
    "id": "3f963f0e-60f9-46dd-a0fb-26f84746b791",
    "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
    "set_order": 10,
    "set_name": "Anderson Squat",
    "set_notes": null,
    "duration_seconds": 300,
    "rest_seconds": null,
    "total_sets": null,
    "reps_per_set": null,
    "created_at": "2026-02-04T11:19:27.359901+00:00",
    "updated_at": "2026-02-04T11:19:27.359901+00:00",
    "set_type": "emom"
  },
  {
    "id": "a7afb10e-7b94-4509-9214-28493581dac0",
    "template_id": "2d3a40ad-493b-4307-a5b6-683429f39c0c",
    "set_order": 9,
    "set_name": "21s Curl",
    "set_notes": null,
    "duration_seconds": 240,
    "rest_seconds": null,
    "total_sets": null,
    "reps_per_set": null,
    "created_at": "2026-02-04T11:19:24.621665+00:00",
    "updated_at": "2026-02-04T11:19:24.621665+00:00",
    "set_type": "emom"
  }
]
```
**All live EMOM `workout_time_protocols` rows:**

```json
[
  {
    "id": "4ddb0046-3459-43f5-b730-58483d6d859b",
    "set_entry_id": "3f963f0e-60f9-46dd-a0fb-26f84746b791",
    "protocol_type": "emom",
    "total_duration_minutes": 5,
    "work_seconds": 30,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": 5,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:28.17467+00:00",
    "exercise_id": "f0c297a4-0d08-471e-a7e6-ec42ddab8192",
    "exercise_order": 1,
    "load_percentage": 45,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "rep_based"
  },
  {
    "id": "03d05ae5-1197-4820-b64a-139487705f9d",
    "set_entry_id": "a7afb10e-7b94-4509-9214-28493581dac0",
    "protocol_type": "emom",
    "total_duration_minutes": 4,
    "work_seconds": 45,
    "rest_seconds": 30,
    "rounds": null,
    "reps_per_round": null,
    "rest_after_round_seconds": null,
    "created_at": "2026-02-04T11:19:25.748048+00:00",
    "exercise_id": "dd7fb2cd-19d6-46ec-8794-50a468309219",
    "exercise_order": 1,
    "load_percentage": 30,
    "set": null,
    "rest_after_set": null,
    "weight_kg": null,
    "target_reps": null,
    "time_cap_minutes": null,
    "emom_mode": "time_based"
  }
]
```
### `EmomExecutor` code behavior

Source: `src/components/client/workout-execution/blocks/EmomExecutor.tsx`

- **Round interval:** hard-coded **60 seconds** per minute. Timer initializes `timeRemaining` to `60`; on minute rollover it resets to `60`. No column read for per-minute interval length.
- **`work_seconds` from protocol:** read into `workSeconds` but used only when `emomMode !== 'target_reps'` (display label "Work interval"); **not** used as the countdown interval (countdown stays 60s).
- **Live `emom_mode` values:** `rep_based` (1 row), `time_based` (1 row). OpenAPI column description says `target_reps` or `target_time`; stored data uses different strings.
- **`emom_mode` values in code:** defaults to `"target_reps"` when null (not `rep_based`). UI label: `target_reps` → "Target reps"; any other mode → "Time based". Live `rep_based` rows therefore render as "Time based" in the executor.
- **Logging:** code branch is `emomMode === 'target_reps'` for reps logging; live `rep_based` rows take the duration branch (`emom_total_duration_sec`).
- **Duration:** `total_duration_minutes` from `workout_time_protocols` (fallback: `block.duration_seconds / 60` or 10 min).

## 7. Proposed column name collision check

### `workout_set_entries`

Proposed: `rounds_driver`, `interval_seconds`, `time_cap_seconds`

**Collisions found:** none

### `workout_set_entry_exercises`

Proposed: `measurement`, `work_seconds`, `distance_meters`, `target_time_seconds`, `target_pace_seconds_per_km`, `hr_zone`, `target_hr_pct`, `technique`, `drop_percentage`, `max_drops`, `reps_per_cluster`, `clusters_per_set`, `intra_cluster_rest_seconds`, `rest_pause_seconds`, `max_rest_pauses`

**Collisions found:** none

## 8. Letter/order reality (multi-exercise set entries)

**Query:** all `workout_set_entry_exercises` rows where set entry has >1 exercise.

**Multi-exercise set entry count by `set_type`:**

```json
[
  {
    "set_type": "superset",
    "multi_exercise_entries": 17
  },
  {
    "set_type": "giant_set",
    "multi_exercise_entries": 1
  },
  {
    "set_type": "pre_exhaustion",
    "multi_exercise_entries": 1
  }
]
```
**Full dump (`set_entry_id`, `set_type`, `exercise_letter`, `exercise_order`, `exercise_id`):**

| set_entry_id | set_type | exercise_letter | exercise_order | exercise_id |
| --- | --- | --- | --- | --- |
| 065c748d-6e96-4945-a0e3-347845e0c28d | superset | B | 1 | f2e6826a-d023-40a6-a915-fdad005b3448 |
| 065c748d-6e96-4945-a0e3-347845e0c28d | superset | A | 1 | 3a8f1f8b-fd93-46f8-a970-4a297689b8af |
| 0710f991-270b-41ac-90e2-8e47eb463afb | giant_set | B | 1 | 45ee6f3b-8e8a-4d62-8bbf-41e1ee841a51 |
| 0710f991-270b-41ac-90e2-8e47eb463afb | giant_set | C | 1 | 6ee8e730-69d8-4f7e-86d7-d8b4d4fb6ee6 |
| 0710f991-270b-41ac-90e2-8e47eb463afb | giant_set | A | 1 | dd7fb2cd-19d6-46ec-8794-50a468309219 |
| 1264367e-c028-4c2b-969e-643e88eb699d | superset | B | 1 | f8175f4e-27c8-4d5d-a0f4-78ad81c5c681 |
| 1264367e-c028-4c2b-969e-643e88eb699d | superset | A | 1 | ae37e4de-e73b-44ee-886c-9b0b969d7338 |
| 56e008a2-bf21-497d-9b13-c8c0765b0df8 | superset | A | 1 | 8b9cda3a-d668-4d4b-a6c0-db77513fbab4 |
| 56e008a2-bf21-497d-9b13-c8c0765b0df8 | superset | B | 1 | 219ce315-3e72-44fe-8035-490ca0106e2d |
| 63c72712-dad2-4a8e-aa66-41f5145a56a1 | superset | B | 1 | eb29aa10-9e1b-4a5f-83a1-de70b5ea4e0b |
| 63c72712-dad2-4a8e-aa66-41f5145a56a1 | superset | A | 1 | 4bbb6d9b-5098-4def-a3ad-7b6bcb02b4e6 |
| 74502ecb-3db4-4458-b92d-58007ef7dfad | superset | B | 1 | 4bbb6d9b-5098-4def-a3ad-7b6bcb02b4e6 |
| 74502ecb-3db4-4458-b92d-58007ef7dfad | superset | A | 1 | eb29aa10-9e1b-4a5f-83a1-de70b5ea4e0b |
| 749d035a-aafe-4084-8065-267890a1503b | superset | B | 1 | 239e6281-9925-483d-b004-c25098f2f498 |
| 749d035a-aafe-4084-8065-267890a1503b | superset | A | 1 | 8ae09605-b173-4f1b-abf7-58f4bc475b0b |
| 8bdb1e5f-34d3-408c-bd88-914106e5ac69 | superset | A | 1 | 2c716950-2c2f-4e4f-a9ba-2a276df3a96b |
| 8bdb1e5f-34d3-408c-bd88-914106e5ac69 | superset | B | 1 | 8b9cda3a-d668-4d4b-a6c0-db77513fbab4 |
| 94b5c6a8-fd0d-4df8-8788-a8fe28b53a0b | superset | A | 1 | 27afce8b-1cbe-4b29-99d3-dcab3bb7d73a |
| 94b5c6a8-fd0d-4df8-8788-a8fe28b53a0b | superset | B | 1 | 2c9a8353-e5fd-4e4c-a2ba-f1c455fe0076 |
| a6da4a08-856a-4be0-86f8-36ea4f56f2d2 | superset | B | 1 | 719bbb44-672e-4456-a82b-2e5fb167f89c |
| a6da4a08-856a-4be0-86f8-36ea4f56f2d2 | superset | A | 1 | 87e9607c-9eb6-4680-aed2-43af5b140e84 |
| aa9a74ec-a217-4699-9c20-cecc6614e429 | superset | B | 1 | a2d77cce-0c1d-40f8-9a7e-bf9c81998197 |
| aa9a74ec-a217-4699-9c20-cecc6614e429 | superset | A | 1 | 107f115f-638c-4234-855c-86d94a0b61b8 |
| af5ed3dc-8370-4cf7-afe2-08854fa14ace | superset | B | 1 | 88fbaa37-a0b8-4757-8181-278d04bac4c2 |
| af5ed3dc-8370-4cf7-afe2-08854fa14ace | superset | A | 1 | f9ab3682-3368-4c0e-a96d-d04704de9ad5 |
| c0e88206-e488-4e32-a0fe-c24ccc78cb20 | pre_exhaustion | A | 1 | dd7fb2cd-19d6-46ec-8794-50a468309219 |
| c0e88206-e488-4e32-a0fe-c24ccc78cb20 | pre_exhaustion | B | 1 | c8a477e3-d754-46cb-b7b3-943149117602 |
| c361078f-dbf9-4570-ab91-7c8d2daf28d7 | superset | B | 1 | 8797afd1-0d73-4714-872a-3d46a560799e |
| c361078f-dbf9-4570-ab91-7c8d2daf28d7 | superset | A | 1 | 88fbaa37-a0b8-4757-8181-278d04bac4c2 |
| d14a7b11-95d0-4722-be6a-8cd46fa75337 | superset | B | 1 | f8175f4e-27c8-4d5d-a0f4-78ad81c5c681 |
| d14a7b11-95d0-4722-be6a-8cd46fa75337 | superset | A | 1 | ae37e4de-e73b-44ee-886c-9b0b969d7338 |
| d810ee15-de8c-48fd-967e-23674b8fa39d | superset | B | 1 | 239e6281-9925-483d-b004-c25098f2f498 |
| d810ee15-de8c-48fd-967e-23674b8fa39d | superset | A | 1 | 8ae09605-b173-4f1b-abf7-58f4bc475b0b |
| e9fb7c88-cb9f-4924-94ab-c6e2bf942f1f | superset | A | 1 | 8b9cda3a-d668-4d4b-a6c0-db77513fbab4 |
| e9fb7c88-cb9f-4924-94ab-c6e2bf942f1f | superset | B | 1 | 219ce315-3e72-44fe-8035-490ca0106e2d |
| ee8cfc7d-e1df-4201-87e8-373823c6e221 | superset | A | 1 | 719bbb44-672e-4456-a82b-2e5fb167f89c |
| ee8cfc7d-e1df-4201-87e8-373823c6e221 | superset | B | 1 | 0fd792b9-7263-43d1-83a2-ba35b9a9b5b2 |
| f80518f9-460a-41a6-ad65-0186eb27bd15 | superset | B | 1 | 5ccc757a-439f-4e42-8ce6-2aa8b702b933 |
| f80518f9-460a-41a6-ad65-0186eb27bd15 | superset | A | 1 | 524618fb-a723-4eaf-9056-2c8ff508f3d1 |

## Surprises

1. **`MAIN_MIGRATION_SPEC.md` not present** in repo at verification time — cannot cross-check spec contradictions directly.
2. **Direct PostgreSQL / `information_schema` / `pg_constraint` queries could not run:** `SUPABASE_DB_URL` host `db.kvwvmpjdvqdptpvfgx.supabase.co` does not resolve (ENOTFOUND); host `db.usmemrjcjsexwterrble.supabase.co` (matching live REST project ref) resolves but password auth fails (28P01). Column and constraint sections use **live PostgREST OpenAPI** instead.
3. **PostgREST `set_type` enum on `workout_set_entries` still lists removed types** (`pyramid_set`, `ladder`, `circuit`, `hr_sets`, `emom_reps`) alongside active types — live CHECK may still permit or the enum cache may be stale vs applied migrations.
4. **All six satellite tables have an `exercise_id` column** on live schema (`workout_drop_sets` nullable; `workout_cluster_sets`, `workout_rest_pause_sets`, `workout_time_protocols`, `workout_speed_sets`, `workout_endurance_sets` vary nullable/NOT NULL). Rows link via `set_entry_id` + `exercise_id` (+ `exercise_order` where present).
5. **All 11 protocol-type set entries** (`amrap`, `emom`, `for_time`, `tabata`, `speed_work`, `endurance`) have **zero** `workout_set_entry_exercises` rows in live data; exercise identity is on satellite rows (`workout_time_protocols`, `workout_speed_sets`, or `workout_endurance_sets`).
6. **EMOM round interval is 60s in executor** regardless of live `work_seconds` values (30 and 45 on the two EMOM protocol rows). Live `emom_mode` uses `rep_based` / `time_based`; executor expects `target_reps` / other.
7. **Multi-exercise `exercise_order` is frequently `1` for all exercises in a group:** supersets, pre-exhaustion, and the lone `giant_set` entry all use `exercise_order = 1` on every row; exercises are distinguished by `exercise_letter` (A/B/C).
8. **`workout_cluster_sets` column is `intra_cluster_rest`** (not `intra_cluster_rest_seconds`). `program_progression_rules` already contains many protocol fields (`work_seconds`, `reps_per_cluster`, `max_rest_pauses`, `emom_mode`, etc.) on the progression table itself.
9. **Live `workout_set_entries` census:**

```json
[
  {
    "set_type": "straight_set",
    "n": 103
  },
  {
    "set_type": "superset",
    "n": 17
  },
  {
    "set_type": "drop_set",
    "n": 8
  },
  {
    "set_type": "cluster_set",
    "n": 3
  },
  {
    "set_type": "emom",
    "n": 2
  },
  {
    "set_type": "tabata",
    "n": 2
  },
  {
    "set_type": "for_time",
    "n": 2
  },
  {
    "set_type": "speed_work",
    "n": 2
  },
  {
    "set_type": "endurance",
    "n": 2
  },
  {
    "set_type": "giant_set",
    "n": 1
  },
  {
    "set_type": "rest_pause",
    "n": 1
  },
  {
    "set_type": "pre_exhaustion",
    "n": 1
  },
  {
    "set_type": "amrap",
    "n": 1
  }
]
```
