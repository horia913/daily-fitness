# Achievement System Design

Based on user requirements and cleanest implementation approach.

---

## Requirements Summary

1. **Storage Method**: Cleanest method (database tables, NO JSON columns)
2. **Achievement Structure**: One achievement with tiers where tiers fit (e.g., "Workout Master" with tiers: 10, 100, 1000)
3. **Progress Tracking**: Cleanest method (on-the-fly calculation with event triggers)
4. **Unlocking**: On action completion - check progress, if threshold met, unlock and store
5. **"In Progress"**: Only achievements with > 0% progress but < 100% (must have started)
6. **Database Tables**: Need to verify structure - possibly `achievements` (templates) and `user_achievements` (unlocked)
7. **Storage**: Store template ID, tier level, metric value (all in separate columns, NO JSON)

**CRITICAL CONSTRAINT**: NO JSON columns - everything must have its own column!

---

## Proposed Database Structure

### Option A: Two-Table Approach (Cleanest)

#### Table 1: `achievement_templates`
Stores predefined achievements (same for everyone)

```sql
CREATE TABLE achievement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL, -- 'activity', 'performance', 'volume', etc.
  achievement_type TEXT NOT NULL, -- 'workout_count', 'streak_weeks', 'pr_count', 'program_completion', etc.
  is_tiered BOOLEAN NOT NULL DEFAULT false,
  -- For tiered achievements:
  tier_bronze_threshold NUMERIC,
  tier_bronze_label TEXT,
  tier_silver_threshold NUMERIC,
  tier_silver_label TEXT,
  tier_gold_threshold NUMERIC,
  tier_gold_label TEXT,
  tier_platinum_threshold NUMERIC,
  tier_platinum_label TEXT,
  -- For non-tiered achievements:
  single_threshold NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_achievement_templates_category ON achievement_templates(category);
CREATE INDEX idx_achievement_templates_type ON achievement_templates(achievement_type);
CREATE INDEX idx_achievement_templates_active ON achievement_templates(is_active);
```

#### Table 2: `user_achievements`
Stores unlocked achievements for each client

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_template_id UUID NOT NULL REFERENCES achievement_templates(id) ON DELETE CASCADE,
  tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum', NULL for non-tiered
  metric_value NUMERIC NOT NULL, -- The actual value that triggered unlock (e.g., 100 workouts)
  achieved_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique combination (client can only unlock each tier once)
  UNIQUE(client_id, achievement_template_id, tier)
);

-- Indexes
CREATE INDEX idx_user_achievements_client ON user_achievements(client_id);
CREATE INDEX idx_user_achievements_template ON user_achievements(achievement_template_id);
CREATE INDEX idx_user_achievements_date ON user_achievements(achieved_date DESC);
```

**Benefits of Two-Table Approach**:
- Clean separation: Templates (global) vs Unlocked (per-client)
- No JSON columns - everything has its own column
- Easy to query: All templates, client's unlocked, progress calculation
- Can add new templates without affecting existing data
- Can track which tier was unlocked for tiered achievements

---

### Option B: Single Table Approach (If current `achievements` table should be repurposed)

If `achievements` table is currently being used and we want to adapt it:

```sql
-- Check current structure first (use inspection SQL)
-- Then we can:
-- 1. Rename current table to user_achievements
-- 2. Create new achievement_templates table
-- OR
-- 1. Add template_id column to distinguish templates vs unlocked
-- 2. Add tier column for tiered achievements
-- 3. Add all required columns (NO JSON)
```

**I recommend Option A (Two-Table Approach)** - it's cleaner and avoids confusion.

---

## Progress Calculation Logic

### How It Works

1. **On Action Completion** (e.g., workout completion):
   - Get client's current metric value (e.g., total workouts = 100)
   - Query all `achievement_templates` where `achievement_type = 'workout_count'` and `is_active = true`
   - For each template:
     - If tiered: Check each tier threshold (bronze, silver, gold, platinum)
     - If non-tiered: Check single threshold
     - Calculate progress: `(current_value / threshold) * 100`
     - If `current_value >= threshold` AND not already unlocked: Unlock and store in `user_achievements`

2. **For "Achievements In Progress"**:
   - Get all `achievement_templates` where `is_active = true`
   - For each template, calculate current progress
   - Filter: `progress > 0 AND progress < 100 AND not already unlocked`
   - Count these

3. **Display Achievement Progress**:
   - Show all templates (locked, in progress, unlocked)
   - For each template:
     - Check if unlocked in `user_achievements`
     - If not unlocked: Calculate progress on-the-fly
     - Display: Locked (0%), In Progress (X%), or Unlocked (100%)

---

## Unlocking Logic (Pseudo-code)

```typescript
async function checkAndUnlockAchievements(clientId: string, metricType: string, currentValue: number) {
  // Get all relevant achievement templates
  const templates = await getAchievementTemplates(metricType)
  
  for (const template of templates) {
    if (template.is_tiered) {
      // Check each tier in order
      const tiers = [
        { name: 'bronze', threshold: template.tier_bronze_threshold },
        { name: 'silver', threshold: template.tier_silver_threshold },
        { name: 'gold', threshold: template.tier_gold_threshold },
        { name: 'platinum', threshold: template.tier_platinum_threshold }
      ]
      
      for (const tier of tiers) {
        if (tier.threshold && currentValue >= tier.threshold) {
          // Check if already unlocked
          const alreadyUnlocked = await checkIfUnlocked(clientId, template.id, tier.name)
          
          if (!alreadyUnlocked) {
            // Unlock this tier
            await unlockAchievement(clientId, template.id, tier.name, currentValue)
          }
        }
      }
    } else {
      // Non-tiered: Check single threshold
      if (template.single_threshold && currentValue >= template.single_threshold) {
        const alreadyUnlocked = await checkIfUnlocked(clientId, template.id, null)
        
        if (!alreadyUnlocked) {
          await unlockAchievement(clientId, template.id, null, currentValue)
        }
      }
    }
  }
}
```

---

## SQL Queries Needed

**Please run the inspection SQL** (`ACHIEVEMENT_SYSTEM_SCHEMA_INSPECTION.sql`) and share results so I can:

1. See current table structure
2. Determine if we need to create new tables or modify existing
3. Check for any JSON columns that need to be flattened
4. Design the exact schema based on what exists

---

## Next Steps

1. **Run SQL inspection** to see current structure
2. **Review results** and determine table structure needed
3. **Create/Modify tables** as needed (NO JSON columns)
4. **Implement progress calculation** logic
5. **Implement unlocking** logic (triggers on actions)
6. **Implement "in progress"** calculation
7. **Update UI** to show achievements with progress

---

## Questions Before Implementation

1. **Run the SQL inspection** (`ACHIEVEMENT_SYSTEM_SCHEMA_INSPECTION.sql`) and share results
2. **Confirm**: Should I proceed with two-table approach (`achievement_templates` + `user_achievements`) or adapt existing table?
3. **Trigger Points**: Which actions should trigger achievement checks?
   - Workout completion → Check workout_count achievements
   - PR set → Check pr_count achievements
   - Streak calculation → Check streak_weeks achievements
   - Program completion → Check program_completion achievements
   - Anything else?

Once I have the SQL results and confirmation, I can design the exact schema and implement the system!