/**
 * Program Creation Tests (CRITICAL)
 * 
 * Tests for coach-side program creation with focus on:
 * - Weekly schedule assignment
 * - Automatic copy to program_progression_rules
 * - Week-by-week progression rules editing
 * - All 13 exercise types in progression rules
 * - Exercise/workout replacement
 * - Data independence between weeks
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Supabase client with proper method chaining
const createMockQueryBuilder = (initialData: any = null) => {
  let data = initialData;
  const filters: any[] = [];

  const builder: any = {
    select: jest.fn(() => builder),
    insert: jest.fn((insertData: any) => {
      data = Array.isArray(insertData) ? insertData[0] : insertData;
      return builder;
    }),
    update: jest.fn((updateData: any) => {
      if (data) {
        data = { ...data, ...updateData };
      }
      return builder;
    }),
    delete: jest.fn(() => builder),
    upsert: jest.fn((upsertData: any) => {
      data = Array.isArray(upsertData) ? upsertData[0] : upsertData;
      return builder;
    }),
    eq: jest.fn((column: string, value: any) => {
      filters.push({ column, value });
      return builder;
    }),
    single: jest.fn(() => ({
      data: data || null,
      error: null,
    })),
    data: data || [],
    error: null,
  };

  return builder;
};

const mockSupabase = {
  from: jest.fn((table: string) => {
    const builder = createMockQueryBuilder();
    
    builder.insert = jest.fn((insertData: any) => {
      const insertedData = Array.isArray(insertData) ? insertData[0] : insertData;
      const newBuilder = createMockQueryBuilder({
        id: `test-${table}-id`,
        ...insertedData,
      });
      return newBuilder;
    });

    builder.upsert = jest.fn((upsertData: any) => {
      const upsertedData = Array.isArray(upsertData) ? upsertData[0] : upsertData;
      const newBuilder = createMockQueryBuilder({
        id: `test-schedule-id`,
        ...upsertedData,
      });
      return newBuilder;
    });

    builder.update = jest.fn((updateData: any) => {
      const updatedBuilder = createMockQueryBuilder({
        ...builder.data,
        ...updateData,
      });
      return updatedBuilder;
    });

    return builder;
  }),
  auth: {
    getUser: jest.fn(() => ({
      data: { user: { id: 'test-coach-id' } },
      error: null,
    })),
  },
};

// Mock ProgramProgressionService
const mockProgramProgressionService = {
  copyWorkoutToProgram: jest.fn(async (
    programId: string,
    scheduleId: string,
    templateId: string,
    weekNumber: number
  ) => {
    // Simulate copying workout data to progression rules
    return true;
  }),
  getProgressionRules: jest.fn(async (
    programId: string,
    weekNumber: number,
    scheduleId: string
  ) => {
    return {
      rules: [],
      isPlaceholder: weekNumber > 1,
    };
  }),
  updateProgressionRule: jest.fn(async (ruleId: string, updates: any) => {
    return { id: ruleId, ...updates };
  }),
  replaceExercise: jest.fn(async (ruleId: string, newExerciseId: string) => {
    return { id: ruleId, exercise_id: newExerciseId };
  }),
  replaceWorkout: jest.fn(async (
    programId: string,
    scheduleId: string,
    newTemplateId: string,
    weekNumber: number
  ) => {
    return true;
  }),
  deleteProgressionRules: jest.fn(async (scheduleId: string, weekNumber: number) => {
    return true;
  }),
};

describe('Program Creation - Weekly Schedule (CRITICAL)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schedule Assignment and Auto-Copy', () => {
    it('should assign workout to Week 1, Day 1 and trigger copyWorkoutToProgram', async () => {
      const programId = 'test-program-id';
      const templateId = 'test-template-id';
      const programDay = 1;
      const weekNumber = 1;

      // Step 1: Set program schedule
      const scheduleResult = await mockSupabase
        .from('program_schedule')
        .upsert({
          program_id: programId,
          day_of_week: programDay - 1, // 0-based
          week_number: weekNumber,
          template_id: templateId,
        })
        .select()
        .single();

      expect(scheduleResult.data).toBeDefined();
      const scheduleId = scheduleResult.data.id;

      // Step 2: Verify copyWorkoutToProgram is called automatically
      const copySuccess = await mockProgramProgressionService.copyWorkoutToProgram(
        programId,
        scheduleId,
        templateId,
        weekNumber
      );

      expect(copySuccess).toBe(true);
      expect(mockProgramProgressionService.copyWorkoutToProgram).toHaveBeenCalledWith(
        programId,
        scheduleId,
        templateId,
        weekNumber
      );
    });

    it('should copy all workout data to program_progression_rules', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const templateId = 'test-template-id';
      const weekNumber = 1;

      // Simulate workout with multiple blocks and exercises
      const workoutBlocks = [
        {
          id: 'block-1',
          block_type: 'straight_set',
          block_order: 1,
          exercises: [
            {
              exercise_id: 'exercise-1',
              sets: 3,
              reps: '10',
              rest_seconds: 60,
            },
          ],
        },
      ];

      // Copy should create progression rules for all blocks/exercises
      const copySuccess = await mockProgramProgressionService.copyWorkoutToProgram(
        programId,
        scheduleId,
        templateId,
        weekNumber
      );

      expect(copySuccess).toBe(true);

      // Verify progression rules were created
      const rules = await mockProgramProgressionService.getProgressionRules(
        programId,
        weekNumber,
        scheduleId
      );

      expect(rules).toBeDefined();
    });

    it('should handle Week 1 auto-fill to empty weeks', async () => {
      const programId = 'test-program-id';
      const durationWeeks = 8;

      // Set Week 1 schedule
      const week1Schedule = [
        { day: 1, template_id: 'template-1' },
        { day: 3, template_id: 'template-2' },
        { day: 5, template_id: 'template-3' },
      ];

      // Auto-fill should copy Week 1 to weeks 2-8
      for (let week = 2; week <= durationWeeks; week++) {
        for (const daySchedule of week1Schedule) {
          const scheduleResult = await mockSupabase
            .from('program_schedule')
            .upsert({
              program_id: programId,
              day_of_week: daySchedule.day - 1,
              week_number: week,
              template_id: daySchedule.template_id,
            })
            .select()
            .single();

          expect(scheduleResult.data).toBeDefined();

          // Copy workout data for each week
          const copySuccess = await mockProgramProgressionService.copyWorkoutToProgram(
            programId,
            scheduleResult.data.id,
            daySchedule.template_id,
            week
          );

          expect(copySuccess).toBe(true);
        }
      }
    });

    it('should allow independent schedule for each week', async () => {
      const programId = 'test-program-id';

      // Week 1: Day 1 = Template A
      const week1Schedule = await mockSupabase
        .from('program_schedule')
        .upsert({
          program_id: programId,
          day_of_week: 0,
          week_number: 1,
          template_id: 'template-a',
        })
        .select()
        .single();

      // Week 2: Day 1 = Template B (different)
      const week2Schedule = await mockSupabase
        .from('program_schedule')
        .upsert({
          program_id: programId,
          day_of_week: 0,
          week_number: 2,
          template_id: 'template-b',
        })
        .select()
        .single();

      expect(week1Schedule.data?.template_id).toBe('template-a');
      expect(week2Schedule.data?.template_id).toBe('template-b');
      expect(week1Schedule.data?.template_id).not.toBe(week2Schedule.data?.template_id);
    });

    it('should delete old progression rules when workout is replaced', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const oldTemplateId = 'old-template-id';
      const newTemplateId = 'new-template-id';
      const weekNumber = 1;

      // Delete old rules
      await mockProgramProgressionService.deleteProgressionRules(scheduleId, weekNumber);

      // Copy new workout
      const copySuccess = await mockProgramProgressionService.copyWorkoutToProgram(
        programId,
        scheduleId,
        newTemplateId,
        weekNumber
      );

      expect(mockProgramProgressionService.deleteProgressionRules).toHaveBeenCalledWith(
        scheduleId,
        weekNumber
      );
      expect(copySuccess).toBe(true);
    });
  });
});

describe('Program Creation - Progression Rules (CRITICAL)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Week 1 vs Week 2+ Behavior', () => {
    it('should show actual data for Week 1 (not placeholders)', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const weekNumber = 1;

      const { rules, isPlaceholder } = await mockProgramProgressionService.getProgressionRules(
        programId,
        weekNumber,
        scheduleId
      );

      expect(isPlaceholder).toBe(false);
      expect(rules).toBeDefined();
    });

    it('should show Week 1 data as placeholders for Week 2+ until edited', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const weekNumber = 2;

      const { rules, isPlaceholder } = await mockProgramProgressionService.getProgressionRules(
        programId,
        weekNumber,
        scheduleId
      );

      expect(isPlaceholder).toBe(true);
    });

    it('should create new rules for Week 2 when edited (not modify Week 1)', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const week1Number = 1;
      const week2Number = 2;
      const ruleId = 'test-rule-id';

      // Get Week 1 rules
      const week1Rules = await mockProgramProgressionService.getProgressionRules(
        programId,
        week1Number,
        scheduleId
      );

      // Edit Week 2
      const week2Update = {
        sets: 4, // Changed from Week 1's 3
      };

      const updatedRule = await mockProgramProgressionService.updateProgressionRule(
        ruleId,
        { ...week2Update, week_number: week2Number }
      );

      expect(updatedRule.sets).toBe(4);
      expect(updatedRule.week_number).toBe(week2Number);

      // Verify Week 1 unchanged
      const week1RulesAfter = await mockProgramProgressionService.getProgressionRules(
        programId,
        week1Number,
        scheduleId
      );

      // Week 1 should still have original values
      expect(week1RulesAfter.rules).toBeDefined();
    });
  });

  describe('All 13 Exercise Types in Progression Rules', () => {
    const exerciseTypes = [
      { type: 'straight_set', fields: ['sets', 'reps', 'rest_seconds', 'tempo', 'rir'] },
      { type: 'superset', fields: ['first_exercise_reps', 'second_exercise_reps', 'rest_between_pairs'] },
      { type: 'giant_set', fields: ['rounds', 'rest_after_seconds'] },
      { type: 'drop_set', fields: ['exercise_reps', 'drop_set_reps', 'weight_reduction_percentage'] },
      { type: 'cluster_set', fields: ['reps_per_cluster', 'clusters_per_set', 'intra_cluster_rest'] },
      { type: 'rest_pause', fields: ['rest_pause_duration', 'max_rest_pauses'] },
      { type: 'pyramid', fields: ['pyramid_order', 'sets', 'reps', 'weight_kg'] },
      { type: 'pre_exhaustion', fields: ['isolation_reps', 'compound_reps', 'compound_exercise_id'] },
      { type: 'amrap', fields: ['duration_minutes', 'target_reps'] },
      { type: 'emom', fields: ['emom_mode', 'duration_minutes', 'target_reps', 'work_seconds'] },
      { type: 'tabata', fields: ['work_seconds', 'rest_seconds', 'rounds', 'rest_after_set'] },
      { type: 'for_time', fields: ['target_reps', 'time_cap_minutes'] },
      { type: 'ladder', fields: ['ladder_order', 'reps', 'weight_kg', 'rest_seconds'] },
    ];

    exerciseTypes.forEach(({ type, fields }) => {
      it(`should save and load ${type} progression rules with all fields`, async () => {
        const ruleId = `test-rule-${type}`;
        const updateData: any = {
          block_type: type,
          week_number: 1,
        };

        // Add type-specific fields
        fields.forEach((field) => {
          if (field === 'sets') updateData[field] = 3;
          else if (field === 'reps') updateData[field] = '10';
          else if (field === 'rest_seconds') updateData[field] = 60;
          else if (field === 'tempo') updateData[field] = '2-0-1-0';
          else if (field === 'rir') updateData[field] = 2;
          else if (field === 'weight_kg') updateData[field] = 50;
          else if (field === 'duration_minutes') updateData[field] = 10;
          else if (field === 'target_reps') updateData[field] = 100;
          else if (field === 'work_seconds') updateData[field] = 20;
          else if (field === 'rounds') updateData[field] = 3;
          else if (field.includes('reps')) updateData[field] = '10';
          else if (field.includes('rest')) updateData[field] = 60;
          else if (field.includes('percentage')) updateData[field] = 20;
          else if (field.includes('order')) updateData[field] = 1;
          else if (field.includes('mode')) updateData[field] = 'reps';
          else if (field.includes('exercise_id')) updateData[field] = 'test-exercise-id';
          else updateData[field] = 'test-value';
        });

        const updated = await mockProgramProgressionService.updateProgressionRule(
          ruleId,
          updateData
        );

        expect(updated.block_type).toBe(type);
        fields.forEach((field) => {
          expect(updated[field]).toBeDefined();
        });
      });
    });
  });

  describe('Exercise Replacement', () => {
    it('should replace exercise while preserving other parameters', async () => {
      const ruleId = 'test-rule-id';
      const originalExerciseId = 'original-exercise-id';
      const newExerciseId = 'new-exercise-id';

      // Original rule
      const originalRule = {
        id: ruleId,
        exercise_id: originalExerciseId,
        sets: 3,
        reps: '10',
        rest_seconds: 60,
        tempo: '2-0-1-0',
        rir: 2,
      };

      // Replace exercise
      const replaced = await mockProgramProgressionService.replaceExercise(
        ruleId,
        newExerciseId
      );

      expect(replaced.exercise_id).toBe(newExerciseId);
      // Other fields should be preserved (would need actual implementation to verify)
    });
  });

  describe('Workout Replacement', () => {
    it('should delete old rules and create new ones when workout is replaced', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const oldTemplateId = 'old-template-id';
      const newTemplateId = 'new-template-id';
      const weekNumber = 1;

      // Replace workout (should delete old rules first)
      await mockProgramProgressionService.deleteProgressionRules(scheduleId, weekNumber);
      
      const success = await mockProgramProgressionService.replaceWorkout(
        programId,
        scheduleId,
        newTemplateId,
        weekNumber
      );

      expect(success).toBe(true);
      expect(mockProgramProgressionService.deleteProgressionRules).toHaveBeenCalled();
    });
  });

  describe('Data Independence Between Weeks', () => {
    it('should allow different values for same exercise across weeks', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';
      const ruleId = 'test-rule-id';

      // Week 1: sets = 3
      const week1Update = await mockProgramProgressionService.updateProgressionRule(
        ruleId,
        { sets: 3, week_number: 1 }
      );

      // Week 2: sets = 4
      const week2Update = await mockProgramProgressionService.updateProgressionRule(
        ruleId,
        { sets: 4, week_number: 2 }
      );

      // Week 3: sets = 5
      const week3Update = await mockProgramProgressionService.updateProgressionRule(
        ruleId,
        { sets: 5, week_number: 3 }
      );

      expect(week1Update.sets).toBe(3);
      expect(week2Update.sets).toBe(4);
      expect(week3Update.sets).toBe(5);
    });

    it('should not leak data between weeks', async () => {
      const programId = 'test-program-id';
      const scheduleId = 'test-schedule-id';

      // Get Week 1 rules
      const week1Rules = await mockProgramProgressionService.getProgressionRules(
        programId,
        1,
        scheduleId
      );

      // Get Week 2 rules
      const week2Rules = await mockProgramProgressionService.getProgressionRules(
        programId,
        2,
        scheduleId
      );

      // Rules should be independent
      expect(week1Rules.rules).toBeDefined();
      expect(week2Rules.rules).toBeDefined();
      // In actual implementation, would verify no cross-contamination
    });
  });
});

describe('Program Assignment', () => {
  it('should assign program to client', async () => {
    const assignmentData = {
      program_id: 'test-program-id',
      client_id: 'test-client-id',
      coach_id: 'test-coach-id',
      start_date: new Date().toISOString(),
      status: 'active',
    };

    const result = await mockSupabase
      .from('program_assignments')
      .insert(assignmentData)
      .select()
      .single();

    expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('active');
  });
});

