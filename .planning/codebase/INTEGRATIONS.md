# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**Currency Exchange:**
- Free Currency API (https://api.freecurrencyapi.com)
  - What it's used for: Live exchange rates for 32 currencies, historical rate lookup
  - SDK/Client: Fetch API (native browser)
  - Auth: API key `fca_live_QWblV13xKQrCWDBd7heibrjh6OUDwaFYbwbBFwtm` (embedded in `src/utils/currencyUtils.js`)
  - Features:
    - Endpoint: `/v1/latest` (current rates)
    - Endpoint: `/v1/historical?date=YYYY-MM-DD` (historical rates)
    - Cache: 1-hour in-memory cache per date
    - Markup: 2% applied to all conversions

**Web Scraping:**
- Generic HTTP URLs (via Supabase Edge Function)
  - What it's used for: Extract property images from URLs
  - SDK/Client: Deno fetch API
  - User-Agent headers: Chrome 120.0.0.0 spoofing
  - Implementation: `supabase/functions/scrape-images/index.ts`

## Data Storage

**Databases:**
- PostgreSQL (Supabase hosted)
  - Connection: Via Supabase client (`@supabase/supabase-js`)
  - Env vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
  - Tables: `clients` (main table with JSONB `client_properties` column)
  - Client: Supabase JavaScript SDK 2.50.1

**File Storage:**
- Image URLs stored as strings in JSONB column
- Remote: Property images accessed via HTTP URLs (Airbnb, hotel websites, etc.)
- No local file storage

**Caching:**
- Browser local storage: Not used (state management only)
- In-memory: Exchange rates cached for 1 hour per date
- Real-time: Supabase auth state change listeners

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Email/password authentication
  - Location: `src/pages/Auth.jsx` (login form)
  - Session management: `supabase.auth.getSession()`, `onAuthStateChange()`
  - Protected routes: `src/components/ProtectedRoute.jsx`
  - Client-facing links: Token-based access (RPC `generate_client_share_token`)

**Auth Flow:**
- Admin: Email/password via Supabase Auth
- Client: UUID token in URL query param (`?token=<uuid>`)
  - Token validated by Supabase RPC `get_client_data_with_token`

## Monitoring & Observability

**Error Tracking:**
- None detected - errors logged to console only

**Logs:**
- Browser console: `console.error()`, `console.warn()`, `console.log()`
- Supabase RPC errors returned in destructured objects: `{ data, error }`

## CI/CD & Deployment

**Hosting:**
- Vercel (Frontend)
  - Auto-deploys on `main` branch push
  - Environment variables: `.env.local` equivalent in Vercel project settings

**Backend:**
- Supabase hosted PostgreSQL
- Supabase Edge Functions (Deno runtime)
  - Function: `scrape-images` (serves images from third-party URLs)
  - Config: `supabase/config.toml` (JWT verification enabled)

**CI Pipeline:**
- None detected - Vercel handles build/deploy automatically

## Environment Configuration

**Required env vars:**
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous API key

**Secrets location:**
- `.env.local` file (development)
- Vercel project settings (production)

## Webhooks & Callbacks

**Incoming:**
- Supabase RPC callbacks: Authentication tokens validated server-side
- No external webhook endpoints

**Outgoing:**
- Client share links: Generated as `/client/:clientId?token=<uuid>`
- No outbound webhooks to external services

## Supabase RPC Functions

**Available Functions:**
- `generate_client_share_token(p_client_id)` - Creates shareable UUID token
  - Called in: `src/pages/AdminDashboard.jsx` (share client data)
- `get_client_data_with_token(p_client_id, p_token)` - Retrieves quote with token validation
  - Called in: `src/pages/ClientView.jsx` (client loads quote)
- `update_client_data_with_token(p_client_id, p_token, new_properties)` - Updates quote selections
  - Called in: `src/pages/ClientView.jsx` (client saves selections)

## Data Flow

**Quote Build:**
1. Admin logs in via Supabase Auth
2. Admin creates quote (properties, activities, flights, transportation)
3. Admin calls `generate_client_share_token` to create share link
4. Admin shares URL with client

**Client View:**
1. Client opens `/client/:clientId?token=<uuid>` link
2. Client makes RPC call `get_client_data_with_token`
3. Supabase validates token server-side
4. Client data returned as single JSONB object
5. Client selects items (activities, properties, flights)
6. Client selections saved via `update_client_data_with_token`

---

*Integration audit: 2026-02-24*
