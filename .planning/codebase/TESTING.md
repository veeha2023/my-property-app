# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Runner:**
- Jest (via react-scripts)
- Config: Managed by `react-scripts` (Create React App)
- No explicit `jest.config.js` — uses CRA defaults

**Assertion Library:**
- Jest built-in assertions (`expect`)
- `@testing-library/jest-dom` v6.6.3 for DOM matchers

**Testing Libraries:**
- `@testing-library/react` v16.3.0 — React component testing
- `@testing-library/dom` v10.4.0 — DOM utilities
- `@testing-library/user-event` v13.5.0 — User interaction simulation

**Run Commands:**
```bash
npm test                # Run all tests in watch mode
npm test -- --coverage  # Run with coverage report
npm test -- --watchAll  # Watch all files (default in dev)
npm test -- --bail      # Stop on first failure
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Pattern: `[FileName].test.js` or `[FileName].test.jsx`

**Naming:**
- `.test.js` extension for JavaScript files
- `.test.jsx` extension for JSX component files

**Current Test Files:**
- `src/App.test.js` — App component smoke test
- No other test files currently exist in codebase

## Test Structure

**Suite Organization:**

```javascript
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

**Patterns:**
- Single `test()` function per unit
- Query elements using Testing Library queries: `screen.getByText()`, `screen.getByRole()`, `screen.getByLabelText()`
- Assertions via Jest matchers extended by `@testing-library/jest-dom`
- No explicit `describe()` blocks used yet

**Setup:**
- `setupTests.js` at `src/setupTests.js` imports `@testing-library/jest-dom` globally
- Extends Jest matchers for DOM assertions like `.toBeInTheDocument()`, `.toHaveTextContent()`, `.toBeVisible()`

## Mocking

**Framework:** Jest mocking (via `jest.mock()`, `jest.fn()`)

**What to Mock:**
- Supabase client (Supabase auth and data operations)
- External API calls
- Router/navigation (`react-router-dom`)
- Environment variables

**What NOT to Mock:**
- React components within the same tree (render the real component)
- DOM APIs (jsdom provides these)
- Built-in utilities unless they make tests brittle

**Mocking Pattern for Supabase:**

```javascript
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } }))
    }
  }
}));
```

**Mocking User Interactions:**

```javascript
import userEvent from '@testing-library/user-event';

test('user can click button', async () => {
  render(<MyComponent />);
  const button = screen.getByRole('button', { name: /submit/i });
  await userEvent.click(button);
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

## Fixtures and Factories

**Test Data:**
- No centralized test fixtures or factories currently defined
- Tests should create inline mock data or factories as needed

**Recommended Location for Shared Fixtures:**
- `src/__test-utils__/fixtures/` — for reusable test data
- `src/__test-utils__/factories/` — for data generators

**Example Factory Pattern (recommended):**

```javascript
// src/__test-utils__/factories/activityFactory.js
export function createMockActivity(overrides = {}) {
  return {
    id: 'activity-1',
    name: 'Safari',
    location: 'Serengeti',
    cost_per_pax: 150,
    flat_price: 0,
    included_in_base: true,
    ...overrides
  };
}
```

## Coverage

**Requirements:** Not enforced (no coverage threshold configured)

**View Coverage:**
```bash
npm test -- --coverage
```

**Coverage Output:**
- Saved to `/coverage` directory (git-ignored)
- Includes line, branch, function, and statement coverage

**Current State:**
- Minimal coverage — only `App.test.js` exists
- Most components and utilities untested

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, React components in isolation
- Approach: Render component or call function with known inputs, assert outputs
- Example: Testing `currencyUtils.js` conversion logic with mock exchange rates

**Integration Tests:**
- Scope: Multiple components working together, component with hooks/context
- Approach: Render multiple components, simulate user interactions, verify side effects
- Example: ActivityForm component with form inputs and state updates

**E2E Tests:**
- Framework: Not currently used
- Recommendation: Consider Playwright or Cypress for full user journeys (e.g., admin creates quote → client selects items → price updates)

## Common Patterns

**Async Testing:**

```javascript
import { render, screen, waitFor } from '@testing-library/react';

test('loads data asynchronously', async () => {
  render(<MyComponent />);
  await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument();
  });
});
```

**Error Testing:**

```javascript
test('displays error message on failure', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<ComponentThatErrors />);
  expect(screen.getByText(/error/i)).toBeInTheDocument();
  console.error.mockRestore();
});
```

**Form Testing with User Events:**

```javascript
import userEvent from '@testing-library/user-event';

test('submits form with user input', async () => {
  const user = userEvent.setup();
  render(<FormComponent />);

  const input = screen.getByLabelText(/name/i);
  await user.type(input, 'John Doe');

  const submitButton = screen.getByRole('button', { name: /submit/i });
  await user.click(submitButton);

  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

## Testing Gaps & Recommendations

**Currently Untested Components:**
- `src/pages/AdminDashboard.jsx` — Complex admin UI with state management
- `src/pages/ClientView.jsx` — Main client-facing view with pricing logic
- `src/components/ActivityForm.jsx` — Complex form with CSV import/export
- `src/components/PropertyForm.jsx` — Multi-location property selection
- `src/components/FlightForm.jsx` — Flight pricing logic
- `src/components/TransportationForm.jsx` — Transportation options
- `src/utils/currencyUtils.js` — Currency conversion and formatting

**Priority Test Areas:**
1. `currencyUtils.js` — Currency conversion accuracy is critical
2. `ClientView.jsx` — Pricing calculations and state updates (delta-based pricing)
3. `ActivityForm.jsx` — CSV import/export functionality
4. Supabase integration — Token generation, data fetching, updates

**Recommended Test Suite Structure:**
- Core utilities: 100% coverage (currencyUtils, pricing logic)
- Component logic: 80%+ coverage (form submission, state changes)
- Integration flows: User journey coverage (admin creates quote → client views → selects items)

---

*Testing analysis: 2026-02-24*
