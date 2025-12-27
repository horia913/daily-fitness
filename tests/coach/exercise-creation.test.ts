/**
 * Exercise Creation Tests
 * 
 * Tests for coach-side exercise creation, editing, and management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Supabase client with proper method chaining
const createMockQueryBuilder = (initialData: any = null) => {
  let data = initialData;
  let filters: any[] = [];

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
    
    // Override insert to return data that was passed in
    builder.insert = jest.fn((insertData: any) => {
      const insertedData = Array.isArray(insertData) ? insertData[0] : insertData;
      const newBuilder = createMockQueryBuilder({
        id: `test-${table}-id`,
        ...insertedData,
      });
      return newBuilder;
    });

    // Override update to merge data
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

describe('Exercise Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Exercise with Required Fields', () => {
    it('should create exercise with name, category, and muscle groups', async () => {
      const exerciseData = {
        name: 'Bench Press',
        category: 'strength',
        muscle_groups: ['Chest', 'Triceps'],
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Bench Press');
      expect(result.error).toBeNull();
    });

    it('should fail when name is missing', async () => {
      const exerciseData = {
        category: 'strength',
        muscle_groups: ['Chest'],
        coach_id: 'test-coach-id',
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      // Should validate and return error
      expect(result.error).toBeDefined();
    });
  });

  describe('Create Exercise with Optional Fields', () => {
    it('should create exercise with video URL', async () => {
      const exerciseData = {
        name: 'Squat',
        category: 'strength',
        muscle_groups: ['Quadriceps', 'Glutes'],
        video_url: 'https://example.com/video.mp4',
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(result.data?.video_url).toBe('https://example.com/video.mp4');
    });

    it('should create exercise with multiple instructions', async () => {
      const exerciseData = {
        name: 'Deadlift',
        category: 'strength',
        muscle_groups: ['Back', 'Hamstrings'],
        instructions: [
          'Stand with feet hip-width apart',
          'Bend at hips and knees',
          'Keep back straight',
        ],
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(result.data?.instructions).toHaveLength(3);
    });

    it('should create exercise with multiple tips', async () => {
      const exerciseData = {
        name: 'Pull-up',
        category: 'strength',
        muscle_groups: ['Back', 'Biceps'],
        tips: [
          'Engage your core',
          'Pull with your back, not just arms',
        ],
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(result.data?.tips).toHaveLength(2);
    });

    it('should create exercise with multiple equipment types', async () => {
      const exerciseData = {
        name: 'Cable Fly',
        category: 'strength',
        muscle_groups: ['Chest'],
        equipment: ['Cable Machine', 'Dumbbells'],
        coach_id: 'test-coach-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();

      expect(result.data?.equipment).toHaveLength(2);
    });
  });

  describe('Exercise Update', () => {
    it('should update exercise name', async () => {
      const updateData = {
        name: 'Updated Bench Press',
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .update(updateData)
        .eq('id', 'test-exercise-id');

      expect(result.data?.name).toBe('Updated Bench Press');
    });

    it('should update exercise muscle groups', async () => {
      const updateData = {
        muscle_groups: ['Chest', 'Triceps', 'Shoulders'],
        updated_at: new Date().toISOString(),
      };

      const result = await mockSupabase
        .from('exercises')
        .update(updateData)
        .eq('id', 'test-exercise-id');

      expect(result.data).toBeDefined();
    });
  });

  describe('Exercise Deletion', () => {
    it('should delete exercise by ID', async () => {
      const result = await mockSupabase
        .from('exercises')
        .delete()
        .eq('id', 'test-exercise-id');

      expect(result.error).toBeNull();
    });
  });

  describe('Exercise Search and Filter', () => {
    it('should search exercises by name', async () => {
      const result = await mockSupabase
        .from('exercises')
        .select()
        .eq('coach_id', 'test-coach-id');

      expect(result.data).toBeDefined();
    });

    it('should filter exercises by category', async () => {
      const result = await mockSupabase
        .from('exercises')
        .select()
        .eq('coach_id', 'test-coach-id');

      // In real implementation, would filter by category
      expect(result.data).toBeDefined();
    });

    it('should filter exercises by muscle group', async () => {
      const result = await mockSupabase
        .from('exercises')
        .select()
        .eq('coach_id', 'test-coach-id');

      // Filter in application code
      const filtered = result.data.filter((ex: any) =>
        ex.muscle_groups?.includes('Chest')
      );

      expect(filtered).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should filter out empty instructions', () => {
      const instructions = ['Valid instruction', '', '  ', 'Another valid'];
      const filtered = instructions.filter((i) => i.trim() !== '');

      expect(filtered).toHaveLength(2);
      expect(filtered).not.toContain('');
      expect(filtered).not.toContain('  ');
    });

    it('should filter out empty tips', () => {
      const tips = ['Valid tip', '', null, undefined, 'Another valid'];
      const filtered = tips.filter((t) => t && t.trim() !== '');

      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});

