# Architecture

**Analysis Date:** 2025-02-24

## Pattern Overview

**Overall:** Client-Admin Split SPA with Supabase Backend

**Key Characteristics:**
- React single-page application with two distinct user flows (admin builder, client selector)
- Token-based client access without login (anonymous share links)
- Delta-based pricing model: finalQuote = baseQuote + sum(all deltas from selections)
- JSONB data storage in Supabase with RPC-based access control
- Monolithic page components with embedded form components
- Real-time auto-save with debouncing and visibility detection

## Layers

**Presentation Layer (UI):**
- Purpose: Render pages and forms with Tailwind styling, handle user interactions
- Location: `src/pages/*.jsx`, `src/components/*.jsx`
- Contains: Page components (AdminDashboard, ClientView, Auth), form components (ActivityForm, PropertyForm, FlightForm, TransportationForm)
- Depends on: State management (React hooks), utilities (currency, formatting), Supabase client
- Used by: Browser client

**Business Logic Layer:**
- Purpose: Calculate prices, manage selections, validate data, handle formatting
- Location: `src/utils/currencyUtils.js`, inline calculations in page components
- Contains: Currency conversion (32 currencies with exchange rate caching), pricing calculations (delta logic, activity pricing, flight pricing), date/time parsing, number formatting
- Depends on: External API (exchange rates), Supabase
- Used by: Presentation layer components

**Data Access Layer:**
- Purpose: Communicate with Supabase backend, manage authentication, sync client data
- Location: `src/supabaseClient.js`
- Contains: Supabase client initialization
- Depends on: Supabase hosted backend
- Used by: All pages

**Custom Hooks Layer:**
- Purpose: Encapsulate cross-cutting concerns (visibility tracking, auto-save)
- Location: `src/hooks/useVisibility.js`
- Contains: `useVisibility()` (detect tab focus), `useAutoSave()` (debounced save), `useVisibilityAwareFetch()` (intelligent fetching)
- Depends on: React hooks
- Used by: Page components

## Data Flow

**Admin Quote Creation Flow:**

1. Admin logs in via `Auth.jsx` (Supabase auth)
2. `ProtectedRoute` validates session
3. Admin lands on `AdminDashboard.jsx` which:
   - Fetches all clients (list view on left sidebar)
   - On client selection, fetches client data from Supabase
   - Displays `AdminSummaryView` (memoized calculation component)
4. Admin builds quote by selecting/editing:
   - Properties via `PropertyForm.jsx` (one per location, radio selection)
   - Activities via `ActivityForm.jsx` (multiple per location, checkbox selection)
   - Transportation via `TransportationForm.jsx` (multiple types: car, ferry, bus, driver)
   - Flights via `FlightForm.jsx` (dual pricing: selected vs not-selected)
5. `useAutoSave` hook debounces (2000ms) data writes to Supabase
6. Admin generates share token via RPC: `generate_client_share_token`
7. Share link format: `/client/:clientId?token=<uuid>`

**Client Selection Flow:**

1. Client opens share link: `/client/:clientId?token=<uuid>`
2. `ClientView.jsx` (unprotected) validates token via RPC: `get_client_data_with_token`
3. Displays read-only property/activity/transportation/flight options
4. Client makes selections (toggles, radio buttons, pax count adjustments)
5. Deltas calculated in real-time using delta pricing formulas
6. Summary shows: base quote + deltas = final quote
7. Final quote may be "finalized" by admin (client view becomes read-only, locked to selected items)
8. On save, `ClientView` sends back selection state via RPC: `update_client_data_with_token`

**Admin Summary View Calculation:**

1. Memoized calculation of selected items (properties, activities, transportation, flights)
2. For activities: `calculateActivityDelta()` applies logic:
   - If included in base + deselected: subtract base_price
   - If included in base + selected: add (current_price - base_price)
   - If optional + selected: add current_price
   - If optional + not selected: add 0
3. For flights: simple dual-price logic based on `selected` flag
4. Total change = sum of all deltas
5. Final quote = base quote + total change

**Data Structure (JSONB in Supabase `clients` table):**

```javascript
{
  quote: number,           // Base quote in NZD
  properties: [
    {
      id, name, location, selected, price,
      images, homeImageIndex,
      checkIn, checkOut, bedrooms, bathrooms
    }
  ],
  activities: [
    {
      id, name, location, selected, pax,
      cost_per_pax, flat_price, base_price,
      included_in_base, images, date, time
    }
  ],
  transportation: [
    {
      id, transportType, selected, price,
      pickupLocation, pickupDate, pickupTime,
      boardingFrom, boardingDate, boardingTime,
      pickupFrom, date, time
    }
  ],
  flights: [
    {
      id, airline, flightNumber, from, to,
      selected, price_if_selected, price_if_not_selected,
      airlineLogoUrl
    }
  ],
  finalized: boolean       // Admin locks view when true
}
```

## Key Abstractions

**AdminSummaryView Component:**
- Purpose: Memoized display of all client selections with delta prices
- Examples: `src/pages/AdminDashboard.jsx` (lines 15-340)
- Pattern: Receives clientData and calculates selections via useMemo, renders grouped summaries with color-coded prices (green for savings, red for extras)

**Currency Conversion System:**
- Purpose: Convert all prices between 32 currencies with live exchange rates
- Examples: `src/utils/currencyUtils.js` (lines 1-222)
- Pattern: Global `CURRENCIES` object, live rate fetching with 1-hour cache, 2% markup applied, currency-aware number formatting (INR uses Indian numbering system)

**Delta Pricing Engine:**
- Purpose: Calculate price impact of each selection (included-in-base vs optional logic)
- Examples: `calculateActivityDelta()` in `AdminDashboard.jsx` (lines 57-89), `calculateFinalFlightPrice()` (lines 91-95)
- Pattern: Callbacks memoized, passed to useMemo calculations, enable price color coding (green if negative, red if positive)

**Token-Based Access Control:**
- Purpose: Allow clients temporary read-write access without login
- Examples: RPC calls in `ClientView.jsx` and `AdminDashboard.jsx`
- Pattern: Frontend generates share token via admin action, token stored server-side, client provides token on each request for validation

**Auto-Save with Visibility Tracking:**
- Purpose: Reduce unnecessary network calls when tab is hidden
- Examples: `useAutoSave()`, `useVisibility()` in `src/hooks/useVisibility.js`
- Pattern: 2000ms debounce on mutations, immediate save option for critical operations, visibility check prevents saving when tab hidden

## Entry Points

**`src/index.js`:**
- Location: `src/index.js`
- Triggers: React renders on DOM load
- Responsibilities: Creates React root, imports Tailwind CSS, renders App component

**`src/App.js`:**
- Location: `src/App.js`
- Triggers: React component initialization
- Responsibilities: Set up React Router with three routes (/login, /, /client/:clientId), manage global auth session subscription, renders ProtectedRoute wrapper around AdminDashboard

**`src/pages/AdminDashboard.jsx`:**
- Location: `src/pages/AdminDashboard.jsx`
- Triggers: Route `/` accessed by authenticated user
- Responsibilities: Main admin interface, list all clients, on client selection fetch and display data, provide tab UI for editing properties/activities/transportation/flights, generate share links, auto-save edits, display real-time summary

**`src/pages/ClientView.jsx`:**
- Location: `src/pages/ClientView.jsx`
- Triggers: Route `/client/:clientId?token=<uuid>` accessed (no auth required)
- Responsibilities: Fetch and display client selections, allow client to modify selections, calculate real-time pricing, handle finalization lock state, currency conversion, save changes back to server

**`src/pages/Auth.jsx`:**
- Location: `src/pages/Auth.jsx`
- Triggers: Route `/login` accessed or unauthenticated navigation
- Responsibilities: Email/password login form, redirect to dashboard on success or to login on unauthorized access

## Error Handling

**Strategy:** Inline try-catch with user-facing alerts or console logging

**Patterns:**
- Date parsing: Fallback to 'Invalid Date' if parsing fails (dates handle both YYYY-MM-DD and DD/MM/YYYY formats)
- Number parsing: `parseFloat()` with 0 fallback if NaN
- Supabase calls: Error object checked, alert() shown to user for critical failures (login, token validation)
- Auto-save: Caught in `useAutoSave()` with console.error, continues running despite failure
- Currency conversion: Network error falls back to last cached rates or defaults to NZD

## Cross-Cutting Concerns

**Logging:**
- Console.log/warn used for auth state changes, visibility detection, auto-save state
- No centralized logging service

**Validation:**
- Client-side only: form fields validated via HTML5 attributes (required, type="email")
- Server RPC calls expect valid token, client ID; no explicit validation errors returned
- Data shape validated via optional chaining and parseFloat fallbacks

**Authentication:**
- Admin: Supabase email/password via `supabase.auth.signInWithPassword()`, session stored in React state
- Client: Token-based RPC validation, token obtained from admin-generated share link
- Auth state subscribed globally in App.js via `onAuthStateChange()`

**Pricing Logic:**
- Base quote stored in Supabase (NZD)
- All selections converted to current display currency before display
- Deltas calculated in base currency (NZD), then converted for display
- 2% markup applied to exchange rates for profit margin

---

*Architecture analysis: 2025-02-24*
