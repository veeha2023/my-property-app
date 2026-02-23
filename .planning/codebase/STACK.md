# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- JavaScript (ES6+) - Used throughout React components and utilities
- JSX - React component files (`.jsx` extension)

**Secondary:**
- TypeScript - Supabase Edge Functions (`.ts` files in `supabase/functions/`)

## Runtime

**Environment:**
- Node.js v22.16.0 (verified in project)
- Browser runtime (React app runs in Chrome, Firefox, Safari)

**Package Manager:**
- npm (version compatible with Node v22.16.0)
- Lockfile: `package-lock.json` present (672 KB, up to date)

## Frameworks

**Core:**
- React 19.1.0 - UI component framework
- React DOM 19.1.0 - React rendering for web
- React Router DOM 7.6.2 - Client-side routing for `/`, `/login`, `/client/:clientId` paths

**Styling:**
- Tailwind CSS 3.4.3 - Utility-first CSS framework
- PostCSS 8.4.38 - CSS processing pipeline
- Autoprefixer 10.4.19 - Vendor prefix generation

**UI Icons:**
- Lucide React 0.522.0 - Icon library (MapPin, Calendar, Users, Activity, Plane, Car, Building, Activity, Lock, Unlock, etc.)

**Testing:**
- React Scripts 5.0.1 - CRA test runner wrapper (includes Jest)
- Testing Library React 16.3.0 - React component testing
- Testing Library DOM 10.4.0 - DOM testing utilities
- Testing Library Jest-DOM 6.6.3 - Custom Jest matchers
- Testing Library User Event 13.5.0 - User interaction simulation

**Build/Dev:**
- React Scripts 5.0.1 - Create React App build tools (wraps Webpack, Babel, ESLint)
- ESLint - Linting (configured via CRA defaults: `react-app` + `react-app/jest`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.50.1 - Supabase database and auth client
  - Used for: Database queries, real-time listeners, RPC calls, authentication
  - Location: `src/supabaseClient.js` (client initialization)
- uuid 11.1.0 - UUID generation for client IDs and share tokens
- date-fns 4.1.0 - Date manipulation and parsing (ISO date handling, day calculations)

**Infrastructure:**
- web-vitals 2.1.4 - Web performance metrics

## Configuration

**Environment:**
- `.env.local` file present (300 bytes) - Contains:
  - `REACT_APP_SUPABASE_URL` - Supabase project URL
  - `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key
- Environment variables referenced in `src/supabaseClient.js`
- No `.nvmrc` file - relies on system Node.js

**Build:**
- `tailwind.config.js` - Tailwind configuration with custom accent color (#FFD700 gold)
- `postcss.config.js` - PostCSS plugins (tailwindcss, autoprefixer)
- `.babelrc` or equivalent - Via Create React App (implicit)
- `.eslintrc` configuration - Via Create React App (implicit)

## Platform Requirements

**Development:**
- Node.js 22.x
- npm or Node package manager
- Web browser (Chrome, Firefox, Safari tested)
- Supabase project credentials

**Production:**
- Vercel (GitHub auto-deploys from `main` branch)
- Web browsers (modern ES6 support)
- Supabase hosted PostgreSQL backend

## Build Output

**Development:**
```bash
npm start              # Compiles Tailwind CSS → src/tailwind.css, runs dev server
npm run build:css     # Tailwind CSS build only
```

**Production:**
```bash
npm run build         # Full production build with optimizations
npm test              # Run test suite (Jest)
```

---

*Stack analysis: 2026-02-24*
