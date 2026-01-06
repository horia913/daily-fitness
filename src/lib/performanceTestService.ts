/**
 * Performance Test Service
 * Handles 1km run and step test tracking for monthly performance assessments
 */

import { supabase } from './supabase';

export interface PerformanceTest {
  id: string;
  client_id: string;
  tested_at: string; // YYYY-MM-DD
  test_type: '1km_run' | 'step_test';
  
  // 1km run fields
  time_seconds?: number | null;
  
  // Step test fields
  heart_rate_pre?: number | null;
  heart_rate_1min?: number | null;
  heart_rate_2min?: number | null;
  heart_rate_3min?: number | null;
  recovery_score?: number | null;
  
  // Context
  notes?: string | null;
  conditions?: string | null;
  perceived_effort?: number | null;
  tested_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type TestType = '1km_run' | 'step_test';

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all performance tests for a client
 */
export async function getClientPerformanceTests(
  clientId: string,
  testType?: TestType,
  limit?: number
): Promise<PerformanceTest[]> {
  try {
    let query = supabase
      .from('performance_tests')
      .select('*')
      .eq('client_id', clientId)
      .order('tested_at', { ascending: false });

    if (testType) {
      query = query.eq('test_type', testType);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching performance tests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getClientPerformanceTests:', error);
    return [];
  }
}

/**
 * Get latest performance test for a client
 */
export async function getLatestPerformanceTest(
  clientId: string,
  testType: TestType
): Promise<PerformanceTest | null> {
  try {
    const { data, error } = await supabase
      .from('performance_tests')
      .select('*')
      .eq('client_id', clientId)
      .eq('test_type', testType)
      .order('tested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest test:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLatestPerformanceTest:', error);
    return null;
  }
}

/**
 * Create a new performance test
 */
export async function createPerformanceTest(
  test: Omit<PerformanceTest, 'id' | 'created_at' | 'updated_at'>
): Promise<PerformanceTest | null> {
  try {
    const { data, error } = await supabase
      .from('performance_tests')
      .insert([test])
      .select()
      .single();

    if (error) {
      console.error('Error creating performance test:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createPerformanceTest:', error);
    return null;
  }
}

/**
 * Update an existing performance test
 */
export async function updatePerformanceTest(
  testId: string,
  updates: Partial<Omit<PerformanceTest, 'id' | 'client_id' | 'created_at'>>
): Promise<PerformanceTest | null> {
  try {
    const { data, error } = await supabase
      .from('performance_tests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', testId)
      .select()
      .single();

    if (error) {
      console.error('Error updating performance test:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePerformanceTest:', error);
    return null;
  }
}

/**
 * Delete a performance test
 */
export async function deletePerformanceTest(testId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('performance_tests')
      .delete()
      .eq('id', testId);

    if (error) {
      console.error('Error deleting performance test:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePerformanceTest:', error);
    return false;
  }
}

// ============================================================================
// Analysis & Progress
// ============================================================================

/**
 * Get performance progress over time
 */
export async function getPerformanceProgress(
  clientId: string,
  testType: TestType
): Promise<{
  latest: PerformanceTest | null;
  previous: PerformanceTest | null;
  improvement: number | null;
  improvementPercentage: number | null;
}> {
  try {
    const tests = await getClientPerformanceTests(clientId, testType, 2);

    if (tests.length === 0) {
      return {
        latest: null,
        previous: null,
        improvement: null,
        improvementPercentage: null
      };
    }

    const latest = tests[0];
    const previous = tests.length > 1 ? tests[1] : null;

    if (!previous) {
      return {
        latest,
        previous: null,
        improvement: null,
        improvementPercentage: null
      };
    }

    let improvement: number | null = null;
    let improvementPercentage: number | null = null;

    if (testType === '1km_run' && latest.time_seconds && previous.time_seconds) {
      // For run: lower time = better (negative improvement means faster)
      improvement = latest.time_seconds - previous.time_seconds;
      improvementPercentage = (improvement / previous.time_seconds) * 100;
    } else if (testType === 'step_test' && latest.recovery_score && previous.recovery_score) {
      // For step test: higher recovery score = better
      improvement = latest.recovery_score - previous.recovery_score;
      improvementPercentage = (improvement / previous.recovery_score) * 100;
    }

    return {
      latest,
      previous,
      improvement,
      improvementPercentage
    };
  } catch (error) {
    console.error('Error in getPerformanceProgress:', error);
    return {
      latest: null,
      previous: null,
      improvement: null,
      improvementPercentage: null
    };
  }
}

/**
 * Calculate step test recovery score
 * Based on heart rate recovery after stepping exercise
 */
export function calculateRecoveryScore(
  hrPre: number,
  hr1min: number,
  hr2min: number,
  hr3min: number
): number {
  // Recovery score formula: higher is better
  // Based on how quickly heart rate returns to pre-exercise level
  const recovery1 = hrPre - hr1min;
  const recovery2 = hrPre - hr2min;
  const recovery3 = hrPre - hr3min;
  
  // Weighted average (3min recovery weighted more)
  const score = (recovery1 * 0.2) + (recovery2 * 0.3) + (recovery3 * 0.5);
  
  return Math.round(score * 100) / 100;
}

/**
 * Check if client is due for performance test
 * (Should test monthly)
 */
export async function isDueForPerformanceTest(
  clientId: string,
  testType: TestType
): Promise<boolean> {
  try {
    const latest = await getLatestPerformanceTest(clientId, testType);

    if (!latest) {
      return true; // Never tested
    }

    const lastTested = new Date(latest.tested_at);
    const now = new Date();
    const daysSinceLastTest = Math.floor((now.getTime() - lastTested.getTime()) / (1000 * 60 * 60 * 24));

    // Due if more than 30 days
    return daysSinceLastTest >= 30;
  } catch (error) {
    console.error('Error checking if due for test:', error);
    return false;
  }
}

/**
 * Get test history trend (last 6 tests)
 */
export async function getPerformanceTrend(
  clientId: string,
  testType: TestType
): Promise<{
  dates: string[];
  values: number[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
}> {
  try {
    const tests = await getClientPerformanceTests(clientId, testType, 6);

    if (tests.length < 2) {
      return {
        dates: [],
        values: [],
        trend: 'insufficient_data'
      };
    }

    const dates = tests.map(t => t.tested_at).reverse();
    const values = tests.map(t => {
      if (testType === '1km_run') {
        return t.time_seconds || 0;
      } else {
        return t.recovery_score || 0;
      }
    }).reverse();

    // Calculate trend (simple linear regression)
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const changePercentage = (change / first) * 100;

    let trend: 'improving' | 'declining' | 'stable';
    
    if (testType === '1km_run') {
      // For run: lower time = better
      if (changePercentage < -2) trend = 'improving';
      else if (changePercentage > 2) trend = 'declining';
      else trend = 'stable';
    } else {
      // For step test: higher score = better
      if (changePercentage > 5) trend = 'improving';
      else if (changePercentage < -5) trend = 'declining';
      else trend = 'stable';
    }

    return {
      dates,
      values,
      trend
    };
  } catch (error) {
    console.error('Error in getPerformanceTrend:', error);
    return {
      dates: [],
      values: [],
      trend: 'insufficient_data'
    };
  }
}

/**
 * Format 1km run time from seconds to MM:SS
 */
export function formatRunTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validate performance test data
 */
export function validatePerformanceTest(
  test: Partial<PerformanceTest>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!test.test_type) {
    errors.push('Test type is required');
  }

  if (test.test_type === '1km_run') {
    if (!test.time_seconds || test.time_seconds <= 0) {
      errors.push('Run time must be greater than 0');
    }
    if (test.time_seconds && (test.time_seconds < 180 || test.time_seconds > 1800)) {
      errors.push('Run time seems unrealistic (3-30 minutes expected)');
    }
  }

  if (test.test_type === 'step_test') {
    if (!test.heart_rate_pre) {
      errors.push('Pre-exercise heart rate is required');
    }
    if (!test.heart_rate_1min || !test.heart_rate_2min || !test.heart_rate_3min) {
      errors.push('All recovery heart rates (1min, 2min, 3min) are required');
    }
    if (test.heart_rate_pre && (test.heart_rate_pre < 40 || test.heart_rate_pre > 120)) {
      errors.push('Pre-exercise HR seems unrealistic (40-120 bpm expected)');
    }
  }

  if (test.perceived_effort && (test.perceived_effort < 1 || test.perceived_effort > 10)) {
    errors.push('Perceived effort must be between 1 and 10');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

