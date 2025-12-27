# Automated Test Suite

This directory contains automated tests for coach-side exercise, workout, and program creation functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test
```

3. Run tests in watch mode:
```bash
npm run test:watch
```

4. Run tests with coverage:
```bash
npm run test:coverage
```

## Test Structure

### `coach/exercise-creation.test.ts`
Tests for exercise CRUD operations, validation, search, and filters.

### `coach/workout-creation.test.ts`
Tests for workout template creation with all 13 exercise types.

### `coach/program-creation.test.ts` (CRITICAL)
Tests for program creation with focus on:
- Weekly schedule assignment
- Automatic copy to `program_progression_rules`
- Week-by-week progression rules editing
- All 13 exercise types in progression rules
- Exercise/workout replacement
- Data independence between weeks

### `coach/data-integrity.test.ts`
Tests for foreign keys, RLS policies, validation, and data consistency.

### `coach/integration.test.ts`
End-to-end workflow tests.

## Important Notes

1. **Mock Supabase Client**: Tests use mocked Supabase client. To test against real database, update mocks in test files.

2. **Test Database**: For integration tests, use a separate test database or ensure test data is isolated.

3. **Weekly Schedule & Progression Rules**: These are the most critical areas. Pay special attention to:
   - Automatic copy when workout assigned to schedule
   - Week 1 auto-fill to empty weeks
   - Week 2+ placeholder behavior
   - Independent week editing
   - All 13 exercise types working correctly

## Manual Testing

See `MANUAL_TESTING_CHECKLIST.md` for comprehensive manual testing procedures.

