# Codebase Concerns

**Analysis Date:** 2026-02-24

## Security

### Exposed API Key in Source Code (CRITICAL)

**Issue:** Third-party API key is hardcoded in source code and client-accessible
- Files: `src/utils/currencyUtils.js` (lines 108, 111)
- Exposed Key: `fca_live_QWblV13xKQrCWDBd7heibrjh6OUDwaFYbwbBFwtm` (free currency exchange API)
- Impact:
  - API key is publicly visible in git history and browser network traffic
  - Rate limits can be abused by malicious actors
  - Key should be rotated immediately
  - Third party can see usage patterns and API call frequency
  - Deployed on Vercel - key is exposed in production

**Fix approach:**
1. Immediately rotate the API key in free currency API account
2. Move API key to environment variables (`REACT_APP_CURRENCY_API_KEY`)
3. Create backend proxy endpoint for currency conversion calls
4. Implement rate limiting on proxy
5. Add `.env.local` to `.gitignore` verification
6. Scan git history and remove key commits (if not already public)

**Remediation priority:** CRITICAL - do this first

---

## Component Size & Complexity

### Megacomponent: AdminDashboard.jsx (1,532 lines)

**Issue:** Single component handles too many responsibilities
- File: `src/pages/AdminDashboard.jsx`
- Lines: 1,532
- Responsibilities:
  - Client list management (CRUD operations)
  - Quote builder interface for 5+ content types
  - Auto-save orchestration (debounced save to Supabase)
  - Tab navigation and state management
  - Error handling and modal dialogs
  - Currency conversion UI
  - CSV import/export coordination
  - Finalization workflow

**Impact:**
- Difficult to test (no unit tests exist)
- Hard to maintain when features change
- Poor reusability - logic is tightly coupled to component
- Cognitive overload when reading/debugging
- Single point of failure if component crashes
- useAutoSave hook obscures save timing logic (42 useState calls across file)

**Safe modification path:**
1. Extract AdminSummaryView into separate component (already partial - lives inside file at line 15)
2. Create QuoteEditorView component wrapping PropertyForm + ActivityForm + TransportationForm + FlightForm
3. Extract ClientListView for sidebar client management
4. Move save logic into custom hook separate from useAutoSave
5. Use composition pattern for modals (ItineraryModal, GlobalSettingsModal, etc.)

**Test coverage gap:** No .test.js files for AdminDashboard or its logic

---

### Megacomponent: ClientView.jsx (1,150 lines)

**Issue:** Client-facing view is monolithic with mixed concerns
- File: `src/pages/ClientView.jsx`
- Lines: 1,150
- Responsibilities:
  - RPC authentication token handling
  - Data fetching with token validation
  - Currency conversion UI and state
  - Quote calculation and display
  - Image carousel for properties
  - Activity selection with delta pricing
  - Transportation and flight selection UI
  - Save-on-change for client selections

**Impact:**
- Similar to AdminDashboard - hard to test, modify, reuse
- Currency conversion state intertwined with data fetching (lines 39-45)
- Multiple image carousel instances without shared logic
- Calculation functions (calculateActivityDelta, calculateNights) duplicated from AdminDashboard

**Safe modification path:**
1. Extract PropertyCard component with carousel logic
2. Extract ActivitySelectionCard component
3. Extract QuoteSummaryView component
4. Create useCurrencyConversion hook for conversion state management
5. Move RPC client data fetching to custom hook
6. Deduplicate calculateActivityDelta logic - move to utils

**Test coverage gap:** No .test.js files for ClientView

---

### Large Form Component: PropertyForm.jsx (1,235 lines)

**Issue:** Property management form is oversized
- File: `src/components/PropertyForm.jsx`
- Lines: 1,235
- Contains: CSV import/export, CRUD operations, image handling, modal dialogs

**Safe modification path:**
1. Extract CSVImporter component
2. Extract PropertyFormModal component
3. Create usePropertyForm hook for validation and state

**Test coverage gap:** No tests for CSV import/export validation

---

## Financial Calculation Issues

### No Test Coverage for Delta-Based Pricing

**Issue:** Critical financial logic has zero unit tests
- Files affected:
  - `src/pages/AdminDashboard.jsx` (lines 57-89, calculateActivityDelta)
  - `src/pages/ClientView.jsx` (lines 132-160, calculateActivityDelta)
  - `src/utils/currencyUtils.js` (lines 181-220, convertCurrency, convertItemsCurrency)
  - `src/components/PropertyForm.jsx`, `ActivityForm.jsx`, `FlightForm.jsx` (various calculations)

**Calculations at risk:**
1. `calculateActivityDelta()` - determines price adjustment when activity selected/deselected
   - Logic: if included_in_base=true and selected=false → return -base_price
   - if included_in_base=false and selected=true → return current_price
   - Currently calculated inline in two places (AdminDashboard and ClientView)
   - No validation of base_price field
   - Could silently produce wrong totals if base_price is missing

2. `convertCurrency()` - applies 2% markup on top of exchange rate
   - Line 200: `const finalAmount = convertedAmount * (1 + MARKUP_PERCENTAGE);`
   - Hardcoded 2% markup not exposed to UI
   - Markup applied AFTER conversion, not before (may be intentional but undocumented)
   - No validation that rates[currency] exists

3. `finalQuote = baseQuote + totalChangeValue` - accumulator in ClientView (line 457)
   - Sum of: properties + activities + transportation + flights deltas
   - Potential floating point rounding errors on large quotes (NZ$25,993 example)
   - Each currency conversion rounds to 2 decimals (line 202: `Math.round(finalAmount * 100) / 100`)
   - Multiple rounding events could compound

4. `calculateFinalFlightPrice()` - selects between two price fields
   - AdminDashboard line 91-95, ClientView line 164-168
   - Duplicated code
   - No validation that price_if_selected and price_if_not_selected exist

**Impact:**
- Client quotes could be off by rounding errors
- If activity base_price is undefined, delta becomes NaN, quote breaks
- Undetected calculation bugs would only surface when admin or client reports discrepancy
- Hard to validate correctness without automated tests
- Changes to pricing logic risk silent failures

**Fix approach:**
1. Create `tests/currencyUtils.test.js` with:
   - convertCurrency with known exchange rates (e.g., USD to NZD at 1.5 rate)
   - Test markup applied correctly
   - Test rounding to 2 decimals
   - Test edge cases: missing rates, zero amounts, negative prices

2. Create `tests/pricingLogic.test.js` with:
   - calculateActivityDelta for all 4 combinations of (included_in_base, selected)
   - Test with base_price missing (should fail or default to 0)
   - Test accumulation: baseQuote + sum of deltas
   - Test with multiple items, currencies

3. Move calculateActivityDelta to utils and export as single source of truth
4. Add JSDoc with expected inputs/outputs
5. Add invariant checks: e.g., `if (!activity.base_price) throw new Error('base_price required')`

**Priority:** HIGH - financial data is core to app value

---

### Markup Percentage Hardcoded

**Issue:** 2% markup on currency conversions is unchangeable
- File: `src/utils/currencyUtils.js` (line 36)
- Value: `export const MARKUP_PERCENTAGE = 0.02;`
- Used in: `convertCurrency()` function (line 200)

**Impact:**
- Admin cannot adjust markup for different client types or currencies
- If business model changes markup, requires code deployment
- Hidden from user - client sees final price but not breakdown of currency cost + markup

**Fix approach:**
- Move markup to global settings (stored in Supabase global_settings table)
- Fetch markup on app load, pass to currency conversion functions
- Consider per-currency markup rates (e.g., different for USD vs EUR)

**Priority:** MEDIUM - business decision required first

---

## Data Persistence & State Management

### Client Data Stored as JSONB Blob

**Issue:** All client data (properties, activities, flights, transportation) stored as single JSONB column
- File: `src/pages/AdminDashboard.jsx` (JSON.parse/stringify at lines 540, 585, 638, 859)
- Database: Supabase `clients` table, `client_properties` JSONB column
- Consumed by: ClientView.jsx, all Form components

**Impact:**
- No validation at database level - invalid JSON structure silently accepted
- Querying specific activities requires parsing entire blob on server
- Migrations difficult - must migrate all existing data if schema changes
- Parse errors not caught at parse time
  - Example: If ClientView.jsx catches JSON.parse error at line 236, data is lost
  - Error handler returns empty state, user sees blank screen
  - Admin doesn't know quote data was corrupted

- No foreign key constraints between entities
- Concurrent edits can overwrite each other (last-write-wins if auto-save races)

**Safe modification path:**
1. Add try-catch with validation schema (e.g., zod or joi) at all JSON.parse sites
2. Document required schema for client_properties in comments
3. If needed in future: create normalized schema with properties, activities, flights, transportation as separate Supabase tables
4. For now: add JSON schema validation on read to catch corrupted data early

**Test coverage gap:** No error handling tests for malformed JSON

---

### useAutoSave Hook Debouncing Without Conflict Detection

**Issue:** Auto-save occurs every 2 seconds (configurable) but doesn't detect edit conflicts
- File: `src/hooks/useVisibility.js` (line 34-102)
- Debounce delay: 2000ms (line 34)
- Used in: AdminDashboard.jsx (line 1502 shows "Auto-saving...")

**Scenario:**
- Admin A edits client quote and adds activity
- Admin B opens same client in separate tab, deletes property
- Both have data in memory from same fetch
- After 2s, Admin A's auto-save overwrites Admin B's delete

**Impact:**
- Lost edits if two admins work on same quote
- No warning to admin about conflict
- Eventual data loss if second editor saves after first (last-write-wins)

**Current mitigation:** Single admin per client (enforced by UX, not data layer)

**Fix approach:**
1. Add `updated_at` timestamp to all Supabase records
2. Before save, fetch current `updated_at` from database
3. Compare against local copy's `updated_at`
4. If mismatch: show warning "This quote was modified elsewhere, reload to see latest" instead of auto-save
5. Implement optimistic locking with manual refresh

**Priority:** MEDIUM - only manifests if multiple admins work concurrently

---

### Event Listener Cleanup Bug in useVisibility Hook

**Issue:** Event listeners not properly cleaned up - creates duplicates on component remount
- File: `src/hooks/useVisibility.js` (lines 15-22)
- Problem: Anonymous function passed to removeEventListener
  ```javascript
  window.addEventListener('focus', () => setIsVisible(true));
  window.removeEventListener('focus', () => setIsVisible(true)); // New function, doesn't match
  ```
- This pattern creates new functions each render, removeEventListener can't find original

**Impact:**
- Event listeners accumulate on remount
- Multiple auto-save triggers after each tab focus
- Memory leak if component mounts/unmounts frequently
- In production with many admin tabs open, could degrade performance

**Fix approach:**
```javascript
useEffect(() => {
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);
  const handleVisibilityChange = () => setIsVisible(!document.hidden);

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('focus', handleFocus);     // Same reference
    window.removeEventListener('blur', handleBlur);       // Same reference
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

**Priority:** LOW-MEDIUM - only affects admins with many tabs or long sessions

---

## CSV Import/Export Issues

### No Validation on CSV Import - Merge vs Replace Unclear

**Issue:** CSV import appends or updates, but logic is not documented or validated
- Files:
  - `src/components/ActivityForm.jsx` (lines 243-353)
  - `src/components/PropertyForm.jsx` (lines 101-241)
  - `src/components/TransportationForm.jsx` (lines 218-407)
  - `src/components/FlightForm.jsx` (lines 176-244)

**Current behavior:**
- ActivityForm: merges imported activities with existing (line 298 comment: "Update existing: only overwrite fields that have non-empty values in the CSV")
- PropertyForm: appends new properties (line 227: `const updatedProperties = [...properties, ...newPropertiesFromCSV];`)
- TransportationForm: appends (line 395: `const updatedTransportation = [...(transportation || []), ...newTransportationFromCSV];`)
- FlightForm: appends (line 240: `setFlights([...flights, ...newFlightsFromCSV]);`)

**Impact:**
- User might expect "replace all" but gets "add new" instead
- No duplicate detection - can import same CSV twice, creating duplicates
- No validation of required fields
  - ActivityForm checks headers (line 263-266) but allows empty values
  - PropertyForm checks headers (line 183-185) but doesn't validate data types
- CSV parse errors silently caught (console.error at line 223, 239, 391, 404 but no user feedback beyond generic "CSV Parsing Errors:")

**Safe modification path:**
1. Add "Import Mode" toggle: "Add New" vs "Replace All"
2. For each import, show preview with:
   - Number of items to add/replace
   - Any duplicate IDs detected
   - Missing required fields
   - Data type validation (e.g., prices must be numbers)
3. Require explicit confirmation before import
4. Add detailed error messages (not just "CSV Parsing Errors")
5. For update mode, show which fields will be overwritten

**Priority:** MEDIUM - currently causes data confusion but doesn't lose existing data

---

### CSV Export Missing for Flights

**Issue:** Flights can be imported but not exported, unlike other content types
- Files:
  - Activities: `src/components/ActivityForm.jsx` (lines 388-425) - has exportActivitiesToCSV()
  - Properties: `src/components/PropertyForm.jsx` (lines 263-300) - has exportToCSV()
  - Transportation: `src/components/TransportationForm.jsx` (lines 428-480) - has exportToCSV()
  - Flights: `src/components/FlightForm.jsx` - NO EXPORT FUNCTION

**Impact:**
- Admin cannot bulk-export flights for backup or reuse
- Inconsistent UX compared to other forms
- Hard to audit flight data outside app

**Fix approach:**
1. Add exportFlightsToCSV() function to FlightForm.jsx
2. Include: id, airline, departure, arrival, date, time, price_if_selected, price_if_not_selected, selected, currency
3. Add export button next to import button
4. Add download template button for consistency

**Priority:** LOW - flights less frequently modified than activities/properties

---

## Error Handling Gaps

### Uncaught JSON Parse Errors Lose Data

**Issue:** JSON.parse errors don't validate structure or provide recovery
- Files:
  - `src/pages/AdminDashboard.jsx` (lines 540, 585)
  - `src/pages/ClientView.jsx` (line 236)
- Pattern: `try { JSON.parse(data) } catch (error) { console.error(...) }`
- No recovery: client data is silently lost or set to null

**Scenarios:**
1. Supabase returns malformed JSON (edge case but possible in corruption)
2. App crashes mid-save, partial JSON written to database
3. Manual database edit introduces invalid structure

**Impact:**
- Admin opens client: sees blank quote (data gone)
- Error logged to console, but admin doesn't check console
- No way to recover or restore

**Fix approach:**
1. Add JSON schema validation (zod/joi):
   ```javascript
   const ClientDataSchema = z.object({
     properties: z.array(...),
     activities: z.array(...),
     // ... all required fields
   });

   const parsed = JSON.parse(client.client_properties);
   const validated = ClientDataSchema.parse(parsed); // Throws with details
   ```
2. On parse error:
   - Log to error tracking service (e.g., Sentry)
   - Show admin alert: "Client data corrupted. Please restore from backup or re-enter data."
   - Display last known good state if available
3. Add validation on save (before uploading to Supabase)

**Priority:** MEDIUM-HIGH - data loss scenario

---

### Missing Error Boundaries

**Issue:** No React error boundaries - a single component crash crashes entire app
- Files: No error boundary component found in codebase
- Current error handling: console.error calls only, no user-facing error recovery

**Impact:**
- Single malformed prop or failed calculation (e.g., NaN in totalChangeValue) crashes app
- User sees blank screen with no context
- No fallback UI

**Fix approach:**
1. Create ErrorBoundary.jsx component (class-based, per React docs)
2. Wrap AdminDashboard and ClientView in error boundaries
3. Show error message with retry button
4. Log to error tracking service

**Priority:** LOW - would help but requires React architecture change

---

## Performance Bottlenecks

### Duplicate Currency Symbol Functions

**Issue:** getCurrencySymbol() reimplemented in 3+ places without reusing utility
- AdminDashboard.jsx: inline getCurrencySymbol (no code shown but imported from utils)
- ClientView.jsx: inline getCurrencySymbol (lines 54-62)
- ActivityForm.jsx: inline getCurrencySymbol (lines 22-30)
- PropertyForm.jsx: likely duplicate
- currencyUtils.js: getCurrencySymbol (line 42, already exported)

**Impact:**
- Code duplication increases maintenance burden
- If format changes, must update multiple places
- More bundle size (though small)

**Fix approach:**
1. Import getCurrencySymbol from currencyUtils in all components
2. Remove inline implementations
3. Delete unused duplicate functions

**Priority:** LOW - code smell but minimal impact

---

### Exchange Rate Fetching On Every Currency Change

**Issue:** fetchExchangeRates called every time user changes currency, even if already cached
- File: `src/pages/ClientView.jsx` (lines 253-256)
- No debounce on user selecting currency dropdown
- Cache exists (in currencyUtils.js lines 38-40) but 1-hour TTL means many calls

**Impact:**
- Extra API calls increase latency (free tier API may rate limit)
- Visible delay when user switches currencies
- Cache miss if user switches currencies after 1 hour

**Fix approach:**
1. Debounce currency selection (e.g., 500ms)
2. Extend cache TTL to 24 hours for same-day conversions
3. Show loading state while fetching
4. Fallback to stale cache if API fails

**Priority:** LOW - only affects currency conversion feature, not core flow

---

## Testing & Quality

### Only One Test File (Placeholder)

**Issue:** Project has 1,150 + 1,532 lines of React components with only 1 test
- Test file: `src/App.test.js` (9 lines, placeholder)
- Content: Just renders App, checks for text "learn react"
- Missing test files: No tests for ClientView, AdminDashboard, forms, utilities, hooks

**Untested critical areas:**
- Financial calculations (delta pricing, currency conversion)
- CSV import/export (multiple formats)
- Supabase RPC calls (authentication, data fetch)
- Auto-save debouncing
- Form validation

**Fix approach:**
1. Set up jest/testing-library if not already configured (package.json shows installed)
2. Create tests directory: `src/__tests__/`
3. Start with high-impact tests:
   - currencyUtils.test.js - all conversion functions
   - pricingLogic.test.js - delta calculations
   - ActivityForm.test.js - CSV import edge cases
4. Aim for 80%+ coverage on utils, 50%+ on components
5. Add pre-commit hook to run tests

**Priority:** MEDIUM - improves confidence in refactors

---

## Dependencies

### Outdated or Risky Dependencies

**Issue:** Some dependencies have known issues or could be outdated
- Files: `package.json`

**Current dependencies:**
- react-scripts: ^5.0.1 - mature, stable
- supabase-js: ^2.50.1 - current, actively maintained
- tailwindcss: ^3.4.3 - current
- No explicit error tracking (Sentry, LogRocket, etc.)

**Risks:**
- If supabase-js has breaking changes in minor version, could break app
- No observability if errors occur in production
- UUID library used but no validation of UUID format from Supabase

**Fix approach:**
1. Pin to exact versions for production (use ^, ~, or exact version)
2. Add error tracking: `npm install @sentry/react @sentry/tracing`
3. Initialize Sentry in src/index.js
4. Test dependency upgrades in CI before deploying

**Priority:** LOW - current deps are stable

---

## Summary Table

| Issue | Category | Severity | File(s) | Effort to Fix |
|-------|----------|----------|---------|----------------|
| Hardcoded API key | Security | CRITICAL | currencyUtils.js | 1-2 hours |
| AdminDashboard size | Maintainability | MEDIUM | AdminDashboard.jsx | 4-6 hours |
| ClientView size | Maintainability | MEDIUM | ClientView.jsx | 3-5 hours |
| No financial tests | Quality | HIGH | currencyUtils.js, pages/ | 3-4 hours |
| CSV import unclear | UX/Data | MEDIUM | Form components | 2-3 hours |
| JSON parse errors | Reliability | MEDIUM | AdminDashboard.jsx, ClientView.jsx | 2-3 hours |
| useVisibility cleanup bug | Performance | LOW | useVisibility.js | 1 hour |
| Edit conflict detection | Data Integrity | MEDIUM | useAutoSave hook | 2-3 hours |
| Missing error boundaries | Reliability | LOW | App.js | 1-2 hours |
| Flights export missing | Feature Parity | LOW | FlightForm.jsx | 1 hour |

---

*Concerns audit: 2026-02-24*
