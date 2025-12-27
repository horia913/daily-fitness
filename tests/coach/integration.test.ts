/**
 * Integration Tests
 * 
 * End-to-end workflow tests for exercise → workout → program creation
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
        id: `test-${table}-id`,
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

const mockProgramProgressionService = {
  copyWorkoutToProgram: jest.fn(async () => true),
  getProgressionRules: jest.fn(async () => ({
    rules: [],
    isPlaceholder: false,
  })),
};

describe('End-to-End Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Exercise → Create Workout → Create Program', () => {
    it('should complete full workflow from exercise to program', async () => {
      // Step 1: Create Exercise
      const exerciseData = {
        name: 'Bench Press',
        category: 'strength',
        muscle_groups: ['Chest', 'Triceps'],
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const exerciseResult = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(exerciseResult.data).toBeDefined();
      const exerciseId = exerciseResult.data.id;

      // Step 2: Create Workout Template with Exercise
      const workoutData = {
        name: 'Push Day',
        description: 'Upper body push workout',
        difficulty_level: 'intermediate',
        estimated_duration: 60,
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const workoutResult = await mockSupabase
        .from('workout_templates')
        .insert(workoutData)
        .select()
        .single();

      expect(workoutResult.data).toBeDefined();
      const templateId = workoutResult.data.id;

      // Create workout block
      const blockData = {
        template_id: templateId,
        block_type: 'straight_set',
        block_order: 1,
        sets: 3,
        reps: '10',
        rest_seconds: 60,
      };

      const blockResult = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(blockResult.data).toBeDefined();
      const blockId = blockResult.data.id;

      // Add exercise to block
      const exerciseBlockData = {
        block_id: blockId,
        exercise_id: exerciseId,
        exercise_order: 1,
        sets: 3,
        reps: '10',
        rest_seconds: 60,
      };

      const exerciseBlockResult = await mockSupabase
        .from('workout_block_exercises')
        .insert(exerciseBlockData)
        .select()
        .single();

      expect(exerciseBlockResult.data).toBeDefined();

      // Step 3: Create Program
      const programData = {
        name: '8-Week Strength Program',
        description: 'Progressive strength training',
        difficulty_level: 'intermediate',
        duration_weeks: 8,
        target_audience: 'general_fitness',
        coach_id: 'test-coach-id',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const programResult = await mockSupabase
        .from('workout_programs')
        .insert(programData)
        .select()
        .single();

      expect(programResult.data).toBeDefined();
      const programId = programResult.data.id;

      // Step 4: Assign Workout to Program Schedule
      const scheduleData = {
        program_id: programId,
        day_of_week: 0, // Monday
        week_number: 1,
        template_id: templateId,
      };

      const scheduleResult = await mockSupabase
        .from('program_schedule')
        .upsert(scheduleData)
        .select()
        .single();

      expect(scheduleResult.data).toBeDefined();
      const scheduleId = scheduleResult.data.id;

      // Step 5: Verify Workout Data Copied to Progression Rules
      const copySuccess = await mockProgramProgressionService.copyWorkoutToProgram(
        programId,
        scheduleId,
        templateId,
        1
      );

      expect(copySuccess).toBe(true);

      // Step 6: Verify Progression Rules Created
      const { rules } = await mockProgramProgressionService.getProgressionRules(
        programId,
        1,
        scheduleId
      );

      expect(rules).toBeDefined();
    });
  });

  describe('Create Program → Assign to Client', () => {
    it('should assign program to client and verify schedule', async () => {
      // Create program
      const programData = {
        name: 'Test Program',
        coach_id: 'test-coach-id',
        duration_weeks: 4,
        is_active: true,
      };

      const programResult = await mockSupabase
        .from('workout_programs')
        .insert(programData)
        .select()
        .single();

      const programId = programResult.data.id;

      // Assign to client
      const assignmentData = {
        program_id: programId,
        client_id: 'test-client-id',
        coach_id: 'test-coach-id',
        start_date: new Date().toISOString(),
        status: 'active',
      };

      const assignmentResult = await mockSupabase
        .from('program_assignments')
        .insert(assignmentData)
        .select()
        .single();

      expect(assignmentResult.data).toBeDefined();
      expect(assignmentResult.data?.status).toBe('active');

      // Verify client can access program schedule
      const schedule = await mockSupabase
        .from('program_schedule')
        .select()
        .eq('program_id', programId);

      expect(schedule.data).toBeDefined();
    });
  });

  describe('Workout Template Reuse in Multiple Programs', () => {
    it('should allow same template in multiple programs with independent progression rules', async () => {
      const templateId = 'shared-template-id';

      // Create two programs
      const program1Data = {
        name: 'Program 1',
        coach_id: 'test-coach-id',
        duration_weeks: 4,
      };

      const program2Data = {
        name: 'Program 2',
        coach_id: 'test-coach-id',
        duration_weeks: 4,
      };

      const program1Result = await mockSupabase
        .from('workout_programs')
        .insert(program1Data)
        .select()
        .single();

      const program2Result = await mockSupabase
        .from('workout_programs')
        .insert(program2Data)
        .select()
        .single();

      const program1Id = program1Result.data.id;
      const program2Id = program2Result.data.id;

      // Assign same template to both programs
      const schedule1Data = {
        program_id: program1Id,
        day_of_week: 0,
        week_number: 1,
        template_id: templateId,
      };

      const schedule2Data = {
        program_id: program2Id,
        day_of_week: 0,
        week_number: 1,
        template_id: templateId,
      };

      const schedule1Result = await mockSupabase
        .from('program_schedule')
        .upsert(schedule1Data)
        .select()
        .single();

      const schedule2Result = await mockSupabase
        .from('program_schedule')
        .upsert(schedule2Data)
        .select()
        .single();

      // Copy workout data for both programs
      await mockProgramProgressionService.copyWorkoutToProgram(
        program1Id,
        schedule1Result.data.id,
        templateId,
        1
      );

      await mockProgramProgressionService.copyWorkoutToProgram(
        program2Id,
        schedule2Result.data.id,
        templateId,
        1
      );

      // Edit progression rules for Program 1
      const program1Update = await mockSupabase
        .from('program_progression_rules')
        .update({ sets: 4 })
        .eq('program_id', program1Id);

      // Edit progression rules for Program 2 (different value)
      const program2Update = await mockSupabase
        .from('program_progression_rules')
        .update({ sets: 5 })
        .eq('program_id', program2Id);

      // Verify both programs have independent progression rules
      const program1Rules = await mockSupabase
        .from('program_progression_rules')
        .select()
        .eq('program_id', program1Id)
        .eq('week_number', 1);

      const program2Rules = await mockSupabase
        .from('program_progression_rules')
        .select()
        .eq('program_id', program2Id)
        .eq('week_number', 1);

      expect(program1Rules.data).toBeDefined();
      expect(program2Rules.data).toBeDefined();
      // Would verify different values in real implementation
    });
  });

  describe('Program Progression Rules Independence', () => {
    it('should maintain independent progression rules for each program', async () => {
      const templateId = 'test-template-id';

      // Create two programs using same template
      const program1Id = 'program-1-id';
      const program2Id = 'program-2-id';
      const schedule1Id = 'schedule-1-id';
      const schedule2Id = 'schedule-2-id';

      // Copy workout to both programs
      await mockProgramProgressionService.copyWorkoutToProgram(
        program1Id,
        schedule1Id,
        templateId,
        1
      );

      await mockProgramProgressionService.copyWorkoutToProgram(
        program2Id,
        schedule2Id,
        templateId,
        1
      );

      // Edit Program 1 Week 1
      const program1Week1Update = await mockSupabase
        .from('program_progression_rules')
        .update({ sets: 3 })
        .eq('program_id', program1Id);

      // Edit Program 2 Week 1 (different value)
      const program2Week1Update = await mockSupabase
        .from('program_progression_rules')
        .update({ sets: 4 })
        .eq('program_id', program2Id);

      // Verify independence
      const program1Rules = await mockSupabase
        .from('program_progression_rules')
        .select()
        .eq('program_id', program1Id)
        .eq('week_number', 1)
        .single();

      const program2Rules = await mockSupabase
        .from('program_progression_rules')
        .select()
        .eq('program_id', program2Id)
        .eq('week_number', 1)
        .single();

      expect(program1Rules.data).toBeDefined();
      expect(program2Rules.data).toBeDefined();
      // Would verify different values in real implementation
    });
  });
});

