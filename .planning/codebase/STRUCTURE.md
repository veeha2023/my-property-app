# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
my-property-app/
├── public/                  # Static assets served by React
│   ├── index.html          # Entry HTML file
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   └── manifest.json       # PWA manifest
├── src/                     # All application source code
│   ├── pages/              # Full-page route components (2 main routes)
│   ├── components/         # Reusable form components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions (currency conversion)
│   ├── App.js              # Root routing component
│   ├── App.css             # App-level styles
│   ├── index.js            # React entry point
│   ├── index.css           # Base CSS
│   ├── tailwind.css        # Compiled Tailwind output (generated)
│   ├── supabaseClient.js   # Supabase initialization
│   ├── setupTests.js       # Jest test configuration
│   └── reportWebVitals.js  # Performance metrics
├── supabase/               # Supabase migrations and configurations
├── build/                  # Production build output (generated)
├── .planning/              # GSD planning documents
├── package.json            # NPM dependencies and scripts
├── package-lock.json       # Locked dependency versions
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration for Tailwind
└── .env.local              # Environment variables (not committed)
```

## Directory Purposes

**`src/pages/`:**
- Purpose: Full-page route components
- Contains: Admin dashboard, client view, authentication
- Key files:
  - `AdminDashboard.jsx` (1,532 lines) - Admin builder interface with quote management
  - `ClientView.jsx` (1,150 lines) - Client-facing selection interface
  - `Auth.jsx` (90 lines) - Login page

**`src/components/`:**
- Purpose: Reusable form components for quote sections
- Contains: Data entry forms, form state management, CSV import/export
- Key files:
  - `PropertyForm.jsx` (1,235 lines) - Property selection with images and amenities
  - `ActivityForm.jsx` (678 lines) - Activity management with CSV import/export
  - `TransportationForm.jsx` (773 lines) - Ground transportation pricing
  - `FlightForm.jsx` (471 lines) - Flight leg pricing
  - `ProtectedRoute.jsx` (36 lines) - Auth guard for admin routes

**`src/hooks/`:**
- Purpose: Custom React hooks for reusable logic
- Contains: Visibility detection, auto-save functionality
- Key files:
  - `useVisibility.js` (140 lines) - Tab visibility tracking and fetch optimization

**`src/utils/`:**
- Purpose: Shared utility functions
- Contains: Currency conversion, exchange rate handling, formatting
- Key files:
  - `currencyUtils.js` (222 lines) - 32-currency support, markup calculation, rate caching

**`supabase/`:**
- Purpose: Database migrations and RPC function definitions
- Generated: Yes (by Supabase CLI)
- Committed: Yes (version control tracked)

**`public/`:**
- Purpose: Static assets and HTML entry point
- Committed: Yes
- Generated: No

**`build/`:**
- Purpose: Production-ready compiled assets
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)

## Key File Locations

**Entry Points:**
- `src/index.js` - React DOM render, imports App component
- `public/index.html` - HTML template with root div
- `src/App.js` - React Router setup, route definitions

**Core Logic:**
- `src/supabaseClient.js` - Supabase client initialization and export
- `src/utils/currencyUtils.js` - All currency/exchange rate logic
- `src/hooks/useVisibility.js` - Auto-save and visibility hooks

**Authentication & Routing:**
- `src/components/ProtectedRoute.jsx` - Route guard for admin
- `src/pages/Auth.jsx` - Login form handler
- `src/pages/AdminDashboard.jsx` - Admin hub and save logic

**Client UI:**
- `src/pages/ClientView.jsx` - Client selection interface with currency conversion
- `src/components/PropertyForm.jsx` - Property selector
- `src/components/ActivityForm.jsx` - Activity selector with CSV support
- `src/components/TransportationForm.jsx` - Transportation options
- `src/components/FlightForm.jsx` - Flight pricing options

**Configuration:**
- `package.json` - Dependencies and build scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.local` - Environment variables (Supabase credentials, not committed)

## Naming Conventions

**Files:**
- Pages: PascalCase with `.jsx` extension (e.g., `ClientView.jsx`, `Auth.jsx`)
- Components: PascalCase with `.jsx` extension (e.g., `PropertyForm.jsx`, `ProtectedRoute.jsx`)
- Hooks: camelCase starting with `use`, `.js` extension (e.g., `useVisibility.js`)
- Utils: camelCase with `.js` extension (e.g., `currencyUtils.js`)
- Styles: Match filename or explicit (e.g., `App.css`)

**Directories:**
- Feature folders: lowercase plural (e.g., `pages/`, `components/`, `hooks/`, `utils/`)

**Components:**
- Functional components (all React 19 patterns)
- Props destructuring at component declaration
- Internal state with `useState`
- Side effects with `useEffect`

**Functions:**
- Handlers prefixed with `handle` (e.g., `handleLogin`, `handleSave`)
- Utility functions: descriptive names (e.g., `formatNumberWithCommas`, `getCurrencySymbol`)
- Formatters/getters: `format*` or `get*` prefix pattern

**Variables:**
- React state: camelCase (e.g., `clientData`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (e.g., `CURRENCIES`, `DEFAULT_CURRENCY`, `MARKUP_PERCENTAGE`)
- Colors: camelCase (e.g., `accentColor = '#FFD700'`)

**Types/Interfaces:**
- Only inline TypeScript - no separate type files
- Flow types not used; reliance on JSDoc where needed

## Where to Add New Code

**New Feature (e.g., new quote section type):**
- Implementation: Create component in `src/components/YourNewForm.jsx`
- Import: Add import and usage in `src/pages/AdminDashboard.jsx`
- Client display: Add display logic in `src/pages/ClientView.jsx`
- Styling: Use Tailwind classes (no separate CSS files for new components)
- Tests: Create `src/components/YourNewForm.test.js` (alongside component)

**New Utility Function:**
- Shared helpers: `src/utils/newUtils.js` or add to existing utils file
- Currency-related: Add to `src/utils/currencyUtils.js`
- Hook-related: Add to `src/hooks/useVisibility.js` or create new hook file

**New Route/Page:**
- Create page component: `src/pages/YourPage.jsx`
- Add route: Update routing in `src/App.js`
- Protection: Wrap with `<ProtectedRoute>` if admin-only

**New Custom Hook:**
- Create file: `src/hooks/useYourHook.js`
- Export named function: `export const useYourHook = () => { ... }`
- Follow patterns in `useVisibility.js` for structure and JSDoc

**New Component (form or UI element):**
- Small/reusable: `src/components/YourComponent.jsx`
- Form-like (complex state): `src/components/YourForm.jsx`
- Route-level (full page): `src/pages/YourPage.jsx`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents and codebase analysis
- Generated: Yes (by GSD tools)
- Committed: Yes
- Contents: STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`supabase/`:**
- Purpose: Supabase project configuration and migrations
- Generated: Partially (CLI generated, then committed)
- Committed: Yes
- Key files: `migrations/` (SQL migration files), config files

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**`build/`:**
- Purpose: Production build artifacts
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)

## Component File Size Reference

For sizing new components:
- `PropertyForm.jsx`: 1,235 lines (complex: multi-image, CRUD, CSV import)
- `TransportationForm.jsx`: 773 lines (moderate: pricing matrix, validation)
- `ActivityForm.jsx`: 678 lines (moderate: CRUD, CSV import/export)
- `FlightForm.jsx`: 471 lines (simpler: dual pricing, limited state)

## Build & Development Flow

**Development:**
1. Start: `npm start` (runs Tailwind build first, then react-scripts)
2. Tailwind CSS compiled: `src/index.css` → `src/tailwind.css`
3. Changes auto-reload via react-scripts

**Production Build:**
1. Run: `npm run build`
2. Output: `build/` directory (static files)
3. Deployment: Vercel auto-deploys from `main` branch

**Testing:**
1. Run: `npm test` (Jest via react-scripts)
2. Pattern: `*.test.js` files co-located with source
3. Config: `src/setupTests.js`

---

*Structure analysis: 2026-02-24*
