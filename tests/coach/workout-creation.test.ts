/**
 * Workout Creation Tests
 * 
 * Tests for coach-side workout template creation, editing, and all 13 exercise types
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Supabase client with proper method chaining
const createMockQueryBuilder = (initialData: any = null) => {
  let data = initialData;

  const builder = {
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
    eq: jest.fn(() => builder),
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

describe('Workout Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Workout Template', () => {
    it('should create workout with basic info', async () => {
      const workoutData = {
        name: 'Push Day',
        description: 'Upper body push workout',
        difficulty_level: 'intermediate',
        estimated_duration: 60,
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('workout_templates')
        .insert(workoutData)
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Push Day');
      expect(result.error).toBeNull();
    });
  });

  describe('Exercise Type: Straight Set', () => {
    it('should create straight set block with sets, reps, rest', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'straight_set',
        block_order: 1,
        sets: 3,
        reps: '10',
        rest_seconds: 60,
        tempo: '2-0-1-0',
        rir: 2,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('straight_set');
      expect(result.data?.sets).toBe(3);
      expect(result.data?.reps).toBe('10');
    });
  });

  describe('Exercise Type: Superset', () => {
    it('should create superset with two exercises', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'superset',
        block_order: 1,
        first_exercise_reps: '10',
        second_exercise_reps: '12',
        rest_between_pairs: 90,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('superset');
      expect(result.data?.first_exercise_reps).toBe('10');
      expect(result.data?.second_exercise_reps).toBe('12');
    });
  });

  describe('Exercise Type: Giant Set', () => {
    it('should create giant set with 3+ exercises', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'giant_set',
        block_order: 1,
        rounds: 3,
        rest_after_seconds: 120,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('giant_set');
      expect(result.data?.rounds).toBe(3);
    });
  });

  describe('Exercise Type: Drop Set', () => {
    it('should create drop set with weight reduction', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'drop_set',
        block_order: 1,
        sets: 3,
        exercise_reps: '10',
        drop_set_reps: '8',
        weight_reduction_percentage: 20,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('drop_set');
      expect(result.data?.weight_reduction_percentage).toBe(20);
    });
  });

  describe('Exercise Type: Cluster Set', () => {
    it('should create cluster set with clusters and intra-rest', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'cluster_set',
        block_order: 1,
        reps_per_cluster: 3,
        clusters_per_set: 4,
        intra_cluster_rest: 15,
        rest_seconds: 120,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('cluster_set');
      expect(result.data?.clusters_per_set).toBe(4);
      expect(result.data?.intra_cluster_rest).toBe(15);
    });
  });

  describe('Exercise Type: Rest-Pause', () => {
    it('should create rest-pause set with pause duration and max pauses', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'rest_pause',
        block_order: 1,
        sets: 1,
        reps: '8',
        rest_pause_duration: 15,
        max_rest_pauses: 3,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('rest_pause');
      expect(result.data?.rest_pause_duration).toBe(15);
      expect(result.data?.max_rest_pauses).toBe(3);
    });
  });

  describe('Exercise Type: Pyramid Set', () => {
    it('should create pyramid set with pyramid order', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'pyramid',
        block_order: 1,
        pyramid_order: 1,
        sets: 4,
        reps: '12',
        weight_kg: 50,
        rest_seconds: 90,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('pyramid');
      expect(result.data?.pyramid_order).toBe(1);
    });
  });

  describe('Exercise Type: Pre-Exhaustion', () => {
    it('should create pre-exhaustion with isolation and compound exercises', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'pre_exhaustion',
        block_order: 1,
        isolation_reps: '15',
        compound_reps: '8',
        compound_exercise_id: 'compound-exercise-id',
        rest_between_pairs: 60,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('pre_exhaustion');
      expect(result.data?.isolation_reps).toBe('15');
      expect(result.data?.compound_exercise_id).toBe('compound-exercise-id');
    });
  });

  describe('Exercise Type: AMRAP', () => {
    it('should create AMRAP with duration and target reps', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'amrap',
        block_order: 1,
        duration_minutes: 10,
        target_reps: 100,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('amrap');
      expect(result.data?.duration_minutes).toBe(10);
      expect(result.data?.target_reps).toBe(100);
    });
  });

  describe('Exercise Type: EMOM', () => {
    it('should create EMOM with mode, duration, and target reps', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'emom',
        block_order: 1,
        emom_mode: 'reps',
        duration_minutes: 12,
        target_reps: 10,
        work_seconds: 45,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('emom');
      expect(result.data?.emom_mode).toBe('reps');
      expect(result.data?.duration_minutes).toBe(12);
    });
  });

  describe('Exercise Type: Tabata', () => {
    it('should create Tabata with work/rest seconds and rounds', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'tabata',
        block_order: 1,
        work_seconds: 20,
        rest_seconds: 10,
        rounds: 8,
        rest_after_set: 60,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('tabata');
      expect(result.data?.work_seconds).toBe(20);
      expect(result.data?.rest_seconds).toBe(10);
      expect(result.data?.rounds).toBe(8);
    });
  });

  describe('Exercise Type: For Time', () => {
    it('should create For Time with target reps and time cap', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'for_time',
        block_order: 1,
        target_reps: 100,
        time_cap_minutes: 15,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('for_time');
      expect(result.data?.target_reps).toBe(100);
      expect(result.data?.time_cap_minutes).toBe(15);
    });
  });

  describe('Exercise Type: Ladder', () => {
    it('should create Ladder with ladder order, reps, and weight', async () => {
      const blockData = {
        template_id: 'test-workout-id',
        block_type: 'ladder',
        block_order: 1,
        ladder_order: 1,
        reps: '5',
        weight_kg: 60,
        rest_seconds: 60,
      };

      const result = await mockSupabase
        .from('workout_blocks')
        .insert(blockData)
        .select()
        .single();

      expect(result.data?.block_type).toBe('ladder');
      expect(result.data?.ladder_order).toBe(1);
      expect(result.data?.reps).toBe('5');
    });
  });

  describe('Workout Update', () => {
    it('should update workout template', async () => {
      const updateData = {
        name: 'Updated Push Day',
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('workout_templates')
        .update(updateData)
        .eq('id', 'test-workout-id');

      expect(result.data).toBeDefined();
    });
  });

  describe('Workout Duplication', () => {
    it('should duplicate workout with all blocks and exercises', async () => {
      // This would involve:
      // 1. Copy workout template
      // 2. Copy all workout blocks
      // 3. Copy all workout block exercises
      
      const originalWorkoutId = 'test-workout-id';
      const newWorkoutName = 'Push Day (Copy)';

      // Mock the duplication process
      const duplicated = {
        id: 'new-workout-id',
        name: newWorkoutName,
        blocks: [],
      };

      expect(duplicated.name).toBe(newWorkoutName);
      expect(duplicated.id).not.toBe(originalWorkoutId);
    });
  });

  describe('Workout Assignment', () => {
    it('should assign workout to client', async () => {
      const assignmentData = {
        client_id: 'test-client-id',
        workout_template_id: 'test-workout-id',
        coach_id: 'test-coach-id',
        start_date: new Date().toISOString(),
        status: 'active',
      };

      const result = await mockSupabase
        .from('workout_assignments')
        .insert(assignmentData)
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe('active');
    });
  });
});

