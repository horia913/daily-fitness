# CALCULATION FORMULAS FOR APP

## Volume Calculations

### 1. Weekly Volume Load (Resistance Training)
```
Weekly Volume Load = Σ (Sets × Reps × Load) for each exercise

Where:
- Sets = number of working sets (exclude warm-up sets)
- Reps = repetitions performed
- Load = weight lifted in kg or lbs
```

**Example:**
- Exercise: Bench Press
- Week 1: 3 sets × 8 reps × 100kg = 2,400kg
- Week 2: 4 sets × 8 reps × 100kg = 3,200kg
- Volume increase = 33.3%

### 2. Sets Per Muscle Group Per Week
```
Total Sets for Muscle Group = Σ (Sets for all exercises targeting that muscle)

Count rules:
- Compound exercises: Count toward PRIMARY movers only
- Example: Bench Press counts as 1 set for chest, NOT chest + triceps + shoulders
- Isolation exercises: Count toward target muscle only
```

**Muscle Group Counting Guidelines:**

| Exercise | Primary Muscle | Count As |
|----------|---------------|----------|
| Bench Press | Chest | Chest sets |
| Squat | Quads | Quad sets |
| Deadlift | Hamstrings/Glutes/Back | Distribute or choose primary focus |
| Pull-up | Lats | Back sets |
| Overhead Press | Shoulders | Shoulder sets |
| Bicep Curl | Biceps | Bicep sets |

### 3. Volume Progression Calculation
```
Target Volume Week N = Current Volume × (1 + Progression %)

Where Progression % comes from Table 6 based on Category + Difficulty

Max safe increase per week:
- Beginner: 10%
- Intermediate: 15%
- Advanced/Athlete: 20%
```

**Safety Check:**
```
IF (New Volume - Current Volume) / Current Volume > Max % THEN
  Flag: "Volume increase too aggressive"
  Recommend: Reduce to max allowed %
END IF
```

### 4. Ground Contacts (Plyometrics)
```
Weekly Ground Contacts = Σ (Jumps/Hops/Bounds across all sessions)

Per Session = Weekly Target ÷ Sessions per Week

Example:
- Target: 900 contacts/week
- Sessions: 2 per week
- Per Session: 450 contacts ≈ 60-90 jumps
```

### 5. Sprint Volume
```
Weekly Sprint Volume (meters) = Σ (Distance per rep × Reps across all sessions)

Example:
- Session 1: 10 reps × 30m = 300m
- Session 2: 8 reps × 40m = 320m
- Weekly Total: 620m
```

---

## Intensity Calculations

### 6. RIR to % 1RM Conversion (Approximate)
```
Estimated % 1RM based on RIR and Reps:

For a given rep range:
% 1RM ≈ Base % - (RIR × Decrement)

Where:
- Base % = % 1RM at RIR 0 (failure) for that rep range
- Decrement = ~2.5% per RIR unit
```

**Lookup Table:**

| Target Reps | RIR 0 (Failure) | RIR 1 | RIR 2 | RIR 3 | RIR 4 |
|------------|---------------|-------|-------|-------|-------|
| 1 | 100% | 97% | 95% | 92% | 90% |
| 3 | 90% | 87% | 85% | 82% | 80% |
| 5 | 85% | 82% | 80% | 77% | 75% |
| 8 | 80% | 77% | 75% | 72% | 70% |
| 10 | 75% | 72% | 70% | 67% | 65% |
| 12 | 70% | 67% | 65% | 62% | 60% |
| 15 | 65% | 62% | 60% | 57% | 55% |

### 7. Estimated 1RM from Performance
```
Estimated 1RM = Weight × (1 + (Reps ÷ 30))

Alternative (Epley Formula):
Estimated 1RM = Weight × (1 + 0.0333 × Reps)

More accurate for lower reps (1-10)
```

**Example:**
- Lifted: 100kg for 8 reps at RIR 2
- Actual reps to failure ≈ 10 reps
- Estimated 1RM = 100 × (1 + 10/30) = 133kg

### 8. Load Progression
```
New Load = Current Load × (1 + Intensity Increase %)

Intensity Increase % from Table 6

Micro-loading increments:
- Upper body: 0.5-1kg (1-2.5lbs)
- Lower body: 2.5-5kg (5-10lbs)

IF calculated increase < micro-load increment THEN
  Wait until progression reaches minimum increment
END IF
```

### 9. Session RPE Calculation
```
Session RPE = (Session Duration in minutes × Average Exercise RPE) ÷ 10

Where Exercise RPE maps to RIR:
- RIR 4+ = RPE 6
- RIR 3 = RPE 7
- RIR 2 = RPE 8
- RIR 1 = RPE 9
- RIR 0 = RPE 10
```

---

## Heart Rate & Endurance Calculations

### 10. Maximum Heart Rate Estimation
```
Method 1 (Simple):
Max HR = 220 - Age

Method 2 (More accurate for trained individuals):
Max HR = 208 - (0.7 × Age)

Method 3 (Field test):
Perform all-out 3-5 min effort, take highest HR achieved
```

### 11. Heart Rate Zones
```
Zone % = (Max HR - Resting HR) × Zone % + Resting HR

Example for Zone 2 (60-75%):
- Max HR: 180 bpm
- Resting HR: 60 bpm
- Reserve: 120 bpm

Zone 2 Lower = (120 × 0.60) + 60 = 132 bpm
Zone 2 Upper = (120 × 0.75) + 60 = 150 bpm
```

**Zone Ranges (% Max HR):**
- Zone 1: 50-60%
- Zone 2: 60-75%
- Zone 3: 75-85%
- Zone 4: 85-92%
- Zone 5: 92-100%

### 12. Training Distribution (Polarized Model)
```
Total Weekly Training Time = Σ all sessions

Zone 2 Target Time = Total Time × 0.75 to 0.80
Zone 4-5 Target Time = Total Time × 0.15 to 0.20
Zone 3 Time = Minimize (< 10%)

Validation:
IF Zone 3 Time > 10% of Total THEN
  Warning: "Too much time in grey zone"
END IF
```

---

## Status Indicators & Warnings

### 13. Volume Status
```
Current Volume = Σ Sets for Muscle Group this week
Optimal Range = From Table 1 based on Category + Difficulty

Status:
IF Current < Optimal Min THEN
  Status = "Below optimal - consider adding volume"
ELSE IF Current >= Optimal Min AND Current <= Optimal Max THEN
  Status = "Optimal range ✓"
ELSE IF Current > Optimal Max AND Current <= Max THEN
  Status = "High volume - monitor recovery"
ELSE
  Status = "⚠ Excessive volume - risk of overtraining"
END IF
```

### 14. Intensity Check
```
Current RIR = Logged RIR from sets
Target RIR Range = From Table 1 based on Category + Difficulty

Status:
IF Current RIR within Target Range THEN
  Status = "Intensity appropriate ✓"
ELSE IF Current RIR > Target Max + 1 THEN
  Status = "Too easy - increase load"
ELSE IF Current RIR < Target Min - 1 THEN
  Status = "Too hard - reduce load or volume"
END IF
```

### 15. Progression Rate Check
```
Volume Change % = ((This Week Volume - Last Week Volume) / Last Week Volume) × 100

Max Safe = From Table 6 based on Category + Difficulty

IF Volume Change % > Max Safe THEN
  Warning = "⚠ Volume increasing too fast - injury risk"
  Recommend = "Limit increase to " + Max Safe + "%"
END IF
```

### 16. Recovery Indicator
```
Recovery Score = Average of:
- Sleep Quality (1-10)
- Energy Levels (1-10)
- Inverted Soreness (10 - Soreness Score)
- Inverted RHR deviation (10 - normalized RHR increase)

Recovery Score:
- 8-10: Excellent recovery ✓
- 6-7.9: Adequate recovery
- 4-5.9: Poor recovery - monitor closely
- <4: ⚠ Compromised - reduce training

IF Recovery Score < 6 for 3+ consecutive days THEN
  Action = "Recommend deload or rest day"
END IF
```

### 17. Deload Reminder
```
Weeks Since Last Deload = Current Week - Last Deload Week

Deload Frequency = From Table 6

IF Weeks Since Last Deload >= Deload Frequency THEN
  Notification = "Deload week recommended"
  Auto-suggest = Reduce volume by Deload % from Table 6
END IF
```

---

## Display Formulas for UI

### 18. Progress Bar for Volume
```
Progress % = (Current Sets / Optimal Target) × 100

Display:
- Green zone: 80-120% of optimal
- Yellow zone: 60-79% or 121-140%
- Red zone: <60% or >140%
```

### 19. Weekly Summary Metrics
```
Total Volume Load = Σ (Sets × Reps × Load) all exercises
Total Sets = Σ all working sets
Average RIR = Σ RIR per set ÷ Number of sets
Volume Change vs Last Week = ((This Week - Last Week) / Last Week) × 100%
```

### 20. Program Completion %
```
Weeks Completed = Current Week Number
Total Program Weeks = From program settings

Completion % = (Weeks Completed / Total Program Weeks) × 100

Display milestones:
- 25%: "Quarter complete"
- 50%: "Halfway there"
- 75%: "Entering final stretch"
- 100%: "Program complete!"
```

---

