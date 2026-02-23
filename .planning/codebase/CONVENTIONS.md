# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `AdminDashboard.jsx`, `PropertyForm.jsx`, `ProtectedRoute.jsx`)
- JavaScript utilities: camelCase with `.js` extension (e.g., `currencyUtils.js`, `supabaseClient.js`)
- Custom hooks: camelCase with `use` prefix, `.js` extension (e.g., `useVisibility.js`)
- Pages: PascalCase with `.jsx` extension in `src/pages/` (e.g., `ClientView.jsx`, `AdminDashboard.jsx`)
- Components live in `src/components/` (e.g., `ActivityForm.jsx`, `PropertyForm.jsx`, `TransportationForm.jsx`, `FlightForm.jsx`)

**Functions:**
- React components: PascalCase (e.g., `ClientView`, `PropertyForm`, `ActivityForm`)
- Regular functions/helpers: camelCase (e.g., `calculateActivityDelta`, `parseDateString`, `formatDate`)
- Event handlers: prefixed with `handle` + camelCase (e.g., `handleLogin`, `handleVisibilityChange`)
- Utility functions: descriptive camelCase (e.g., `getCurrencySymbol`, `formatNumberWithCommas`, `calculateNights`)

**Variables:**
- State variables: camelCase (e.g., `clientData`, `isLoading`, `selectedCurrency`)
- State setters: `set` + camelCase (e.g., `setClientData`, `setLoading`, `setSelectedCurrency`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_CURRENCY`, `CACHE_DURATION`, `MARKUP_PERCENTAGE`, `SWIPE_THRESHOLD`)
- Boolean flags: `is`/`show`/`has` prefix (e.g., `isVisible`, `isLoading`, `showAllCurrencies`, `hasActivities`)
- Object/array groupings: plural when multiple (e.g., `activities`, `properties`, `flights`, `transportation`)

**Types:**
- No TypeScript in codebase; all JSDoc used for documentation
- Object shapes documented in JSDoc (see below)

## Code Style

**Formatting:**
- No explicit formatter config found in project root
- Uses React Scripts default ESLint configuration (extends `"react-app"` and `"react-app/jest"`)
- Tailwind CSS for styling with custom utility classes
- Manually applied conventions observed:
  - 2-space indentation (visible in all files)
  - Semicolons at end of statements
  - Single quotes for strings in JSX attributes where allowed

**Linting:**
- ESLint config: defined in `package.json` at root level
  ```json
  "eslintConfig": {
    "extends": ["react-app", "react-app/jest"]
  }
  ```
- No separate `.eslintrc` file; configuration is embedded in package.json
- React Hooks ESLint plugin included via `"react-app/jest"`

## Import Organization

**Order:**
1. React and React-DOM imports (core dependencies)
2. React Router imports (routing)
3. Supabase client imports
4. Third-party UI libraries (lucide-react icons, date-fns)
5. Local component imports
6. Utility/hook imports
7. CSS/style imports (always last)

**Example from `src/pages/AdminDashboard.jsx`:**
```javascript
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient.js';
import PropertyForm from '../components/PropertyForm.jsx';
import ActivityForm from '../components/ActivityForm.jsx';
import TransportationForm from '../components/TransportationForm.jsx';
import FlightForm from '../components/FlightForm.jsx';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Eye, ExternalLink, ... } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { getCurrencySymbol, getCurrencyOptions, convertItemsCurrency, formatNumberWithCommas } from '../utils/currencyUtils.js';
import { useVisibility, useAutoSave } from '../hooks/useVisibility.js';
```

**Path Aliases:**
- No path aliases configured
- Always use relative paths with `../` notation
- All imports include file extensions (`.jsx`, `.js`)

## Error Handling

**Patterns:**
- Try-catch blocks with empty catch handlers that return safe defaults:
  ```javascript
  try {
    const start = parseISO(checkIn);
    const end = parseISO(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return differenceInDays(end, start);
  } catch { return 0; }
  ```
- Empty catch blocks are common when formatting/parsing data; handlers silently return fallback values
- String parsing wrapped in try-catch with return values like `'Invalid Date'`, `'N/A'`, or `''`
- Supabase errors thrown as custom Error objects with descriptive messages:
  ```javascript
  if (rpcError) throw rpcError;
  if (!responseData) throw new Error("Invalid or expired share link.");
  throw new Error("This itinerary link is no longer active. Please contact your travel agent for assistance.");
  ```
- Errors logged to console with `console.error()`:
  ```javascript
  console.error("Error during data fetch:", err);
  console.error('Failed to fetch exchange rates:', error);
  console.error("Error saving client selection:", err);
  ```

## Logging

**Framework:** `console` (native browser console)

**Patterns:**
- `console.error()` for errors in async operations (data fetching, API calls, state updates)
- `console.warn()` for warnings during initialization (e.g., missing environment variables in `src/supabaseClient.js`)
- No structured logging or logging library used
- Used sparingly; primarily for debugging failed operations

**Examples:**
```javascript
// src/supabaseClient.js - environment check
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set properly');
}

// src/pages/ClientView.jsx - error logging
console.error("Error during data fetch:", err);
console.error('Failed to fetch exchange rates:', error);
console.error("Error saving client selection:", err);

// src/hooks/useVisibility.js - auto-save errors
console.error('Auto-save failed:', error);
console.error('Immediate save failed:', error);
```

## Comments

**When to Comment:**
- File headers with version information and purpose (observed pattern in most files)
- Inline comments explaining complex logic (especially in calculations and data transformations)
- Inline comments before utility function groups marked with `// --- UTILITY FUNCTIONS ---`
- Comments explaining business logic (e.g., delta-based pricing calculations)
- Comments documenting date parsing strategies and edge cases

**Example from `src/pages/AdminDashboard.jsx`:**
```javascript
// src/pages/AdminDashboard.jsx - Version 9.0 (Auto-Save + Visibility Detection)

// Delta logic:
if (isIncludedInBase) {
    // Was included in base
    if (!isSelected) {
        // Deselected: subtract the base price
        return -basePrice;
    } else {
        // Still selected: delta is change from base
        return currentPrice - basePrice;
    }
} else {
    // Was NOT included in base (optional)
    if (isSelected) {
        // Selected: add the full current price
        return currentPrice;
    } else {
        // Not selected: no delta
        return 0;
    }
}
```

**JSDoc/TSDoc:**
- Used for custom hooks to document parameters and return types
- `@param` annotations with type and description
- No return type annotations on hooks (assumed to document return object)

**Example from `src/hooks/useVisibility.js`:**
```javascript
/**
 * Hook to auto-save data with debouncing
 * @param {Function} saveFunction - The function to call for saving
 * @param {number} delay - Debounce delay in milliseconds (default: 2000ms)
 */
export const useAutoSave = (saveFunction, delay = 2000) => { ... }

/**
 * Hook to prevent data fetching when tab visibility changes
 * Only fetches data on initial mount or when explicitly triggered
 * @param {Function} fetchFunction - The function to call for fetching data
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {boolean} skipOnHidden - Whether to skip fetch when tab becomes visible again
 */
export const useVisibilityAwareFetch = (fetchFunction, dependencies = [], skipOnHidden = true) => { ... }
```

## Function Design

**Size:**
- Large components (900-1500 lines) group related logic in helper functions but maintain all state at component level
- Complex calculations extracted into named functions (e.g., `calculateActivityDelta`, `calculateNights`, `parseDate`)
- Average component function ranges 30-150 lines; large components split into multiple view components (e.g., `AdminSummaryView` as sub-component)

**Parameters:**
- Destructuring used in component props:
  ```javascript
  const PropertyForm = ({
    properties,
    setProperties,
    onSave,
    adminMode = false
  }) => { ... }
  ```
- Default parameters used for optional values (e.g., `adminMode = false`, `delay = 2000`)
- Objects passed directly for related data (e.g., `clientData`, `newActivity`)

**Return Values:**
- Safe defaults used consistently:
  - Parsing functions return `0` for invalid numbers
  - Date functions return `'N/A'`, `'Invalid Date'`, or `''` for invalid dates
  - React components return JSX or `null`
  - Hooks return objects with named properties (e.g., `{ isVisible, refetch }`)

## Module Design

**Exports:**
- Named exports for utility functions: `export const functionName = (...) => { }`
- Default exports for React components: `export default ComponentName`
- Barrel file not used; imports always direct from source files

**Example from `src/utils/currencyUtils.js`:**
```javascript
export const CURRENCIES = { ... };
export const DEFAULT_CURRENCY = 'NZD';
export const MARKUP_PERCENTAGE = 0.02;
export const getCurrencySymbol = (currencyCode) => { ... };
export const getCurrencyName = (currencyCode) => { ... };
export const getCurrencyOptions = () => { ... };
export const formatNumberWithCommas = (number, currencyCode = 'NZD') => { ... };
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => { ... };
// etc.
```

**Barrel Files:**
- Not used in this codebase
- All imports are direct file imports (e.g., `import ActivityForm from '../components/ActivityForm.jsx'`)

## React-Specific Patterns

**Hooks Usage:**
- `useState` for all component state (no Redux or Context API)
- `useEffect` for side effects (data fetching, subscriptions, event listeners)
- `useCallback` for memoized event handlers and dependency tracking
- `useMemo` for expensive computations (filtering, sorting large arrays)
- `useRef` for accessing form inputs and managing timer references
- `useParams`, `useLocation`, `useNavigate` from react-router-dom
- Custom hooks defined in `src/hooks/` for reusable logic

**Component Composition:**
- Functional components with hooks (no class components)
- Sub-components defined as constants within parent component file (e.g., `PlaceholderContent`, `AdminSummaryView`)
- Props drilling used; no Context API detected
- Event handlers defined inline as arrow functions or with useCallback for dependencies

**State Management Patterns:**
- One-way data flow with setState callbacks
- Related state grouped together (e.g., all currency-related state in one block)
- Loading/error/message state follows consistent naming: `[loading, setLoading]`, `[error, setError]`, `[message, setMessage]`

---

*Convention analysis: 2026-02-24*
