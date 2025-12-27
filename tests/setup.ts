/**
 * Test Setup File
 * 
 * Global test configuration and mocks
 */

// Mock Next.js environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock window object for browser APIs
if (typeof window === 'undefined') {
  global.window = {
    location: {
      href: '',
      pathname: '/',
      search: '',
      hash: '',
    },
  } as any;
}

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

