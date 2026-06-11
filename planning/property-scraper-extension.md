# Property Scraper Browser Extension (Apify-Powered)

## Context

The admin browses properties across 8+ booking websites (booking.com, airbnb, bookabach, ratehawk, expedia, hotels.com, vrbo, agoda, trip.com), manually copies details into Excel, then imports into the app via CSV. This takes hours per itinerary. The solution is a Chromium extension (works in Brave) that uses **Apify actors** — pre-built, battle-tested scrapers for each booking platform — to extract structured property data, then exports a CSV compatible with the app's existing PropertyForm CSV import.

## Why Apify

- **Dedicated actors per site** — purpose-built scrapers that extract ALL images, room details, and property info
- **Maintained by the community** — actors are updated when sites change their HTML
- **Universal AI Scraper** as fallback for unsupported sites (RateHawk, Bookabach, any other)
- **Free tier**: $5/mo in free credits (enough for dozens of property scrapes)

## Architecture

```
User has property pages open in tabs (specific URLs)
  → Clicks "Scrape This Page" (single) or "Scrape All Tabs" (bulk)
  → Extension reads tab URL(s) → detects domain → maps to correct Apify actor
  → Sends URL(s) to Apify API (parallel, up to 5 concurrent)
  → Actor runs on Apify cloud, fully scrapes each property page:
      - ALL photos/images from the gallery
      - Price, currency, bedrooms, bathrooms, description, location
      - Room types with per-room images (for hotels)
  → Extension normalizes data → stores in chrome.storage.local
  → User reviews/edits in popup → Exports CSV
  → Imports CSV into app via PropertyForm "Import CSV" button
```

## Actor Mapping

| Domain | Apify Actor | Actor ID |
|--------|-------------|----------|
| booking.com | Booking Hotel Scraper | `voyager/booking-scraper` |
| airbnb.com / airbnb.co.nz | Airbnb Scraper | `tri_angle/airbnb-scraper` |
| expedia.com | Expedia Hotels Scraper | `getdataforme/expedia-scraper` |
| hotels.com | Hotels.com Scraper | `jeremy_frost/hotels-com-scraper` |
| vrbo.com | VRBO Property Scraper | `easyapi/vrbo-property-listing-scraper` |
| agoda.com | Agoda Scraper | `knagymate/fast-agoda-scraper` |
| trip.com | Trip.com Hotel Scraper | `hotels-scrapers/trip-hotel-scraper` |
| bookabach.co.nz / ratehawk.com / any | Universal AI Web Scraper | `stanvanrooy6/universal-ai-web-scraper` |

*Actor IDs to be confirmed during implementation.*

## Field Verification

### Airbnb — Full coverage
All app fields map directly: `name`, `address`, `price`, `currency`, `bedrooms`, `bathrooms`, `description`, `images[].url`, `checkIn`/`checkOut` (input params).

### Booking.com — Mostly covered
Direct fields: `title`/`hotelName`, `address`, `price`, `currency`, `description`, photos.

**Bedroom/Bathroom inference logic** (in normalizer):
1. **Vacation rentals / homes**: Explicit `bedrooms`/`bathrooms` counts → use directly
2. **Apartment hotels / suites** (e.g. "2-Bedroom Suite"): Parse from room type name
3. **Standard hotel rooms**: Each room = 1 bedroom, 1 bathroom
4. **Fallback**: Default to 0, user fills in popup editor

### Hotel Room Types — One Row Per Room Type
Hotels with multiple room types (Standard, Deluxe, Suite) expand into separate rows:
- `"Hilton Auckland - Standard Double Room"` — $180/night, room-specific images
- `"Hilton Auckland - Executive Suite"` — $450/night, room-specific images

Vacation rental sites always produce one row per property.

## Bulk Scraping

1. User opens multiple property pages across tabs (e.g., 5 Airbnb tabs, 3 Booking tabs)
2. Opens popup → clicks **"Scrape All Tabs"**
3. Extension queries all open tabs, filters to booking domains
4. Runs Apify actors in parallel (up to 5 concurrent)
5. Progress shown: "Scraping 3/8 tabs..." with per-tab status
6. User can do multiple runs per location, accumulating the full list
7. Exports everything as one CSV when ready

**Workflow per client**:
- Open tabs for Location A → Scrape All → review
- Open tabs for Location B → Scrape All → review
- Repeat → Export single CSV → import into app

## Currency Handling

Each property uses its **native currency** from the actor output:
- NZ property → NZD | Thailand hotel → THB | US listing → USD | European → EUR

If no currency returned, infer from TLD (`.co.nz` → NZD). Default fallback: NZD.
The app's `currencyUtils.js` handles conversion at display time.

## Folder Structure

```
property-scraper-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/
│   ├── background.js        # Message routing, storage CRUD, orchestration
│   ├── apify.js             # Apify API client (run actors, fetch results)
│   └── normalizer.js        # Normalize actor outputs → unified property schema
├── content/
│   └── content.js           # Floating "Scrape" button on pages
├── settings/
│   ├── settings.html
│   └── settings.js
├── lib/
│   └── csv.js               # CSV generation matching PropertyForm.jsx format
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Design System (Extension Popup UI)

### Visual Identity
- **Style**: Dark mode dashboard with clean card-based layout
- **Colors**:
  - Background: `#020617` (slate-950)
  - Card/Surface: `#0F172A` (slate-900)
  - Card hover: `#1E293B` (slate-800)
  - CTA/Primary: `#22C55E` (green-500) — scrape action buttons
  - Text primary: `#F8FAFC` (slate-50)
  - Text muted: `#94A3B8` (slate-400)
  - Accent/Gold: `#FFD700` — matches the app's existing accent
  - Error: `#EF4444` (red-500)
  - Border: `#334155` (slate-700)
- **Typography**: System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) — no external fonts needed in extension
- **Icons**: Lucide icons (matches the app)
- **Border radius**: 8px cards, 6px buttons, 4px inputs

### Popup Layout (400px wide, 520px max height)

```
┌─────────────────────────────────────────┐
│  [house icon] Property Scraper    [⚙️]  │  ← Header + settings gear
│  ─────────────────────────────────────  │
│  [🔍 Scrape This Page]  [📑 Scrape All] │  ← Action buttons (green)
│  ─────────────────────────────────────  │
│  Properties (12)              [Export]   │  ← Count + CSV export button (gold)
│  ─────────────────────────────────────  │
│  ┌─────────────────────────────────┐   │
│  │ [img] Lakefront Lodge           │   │  ← Property card
│  │       Queenstown, NZ            │   │
│  │       NZ$280/night  ✏️  🗑️      │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ [img] Hilton - Deluxe Room      │   │  ← Hotel room type entry
│  │       Auckland, NZ              │   │
│  │       NZ$180/night  ✏️  🗑️      │   │
│  └─────────────────────────────────┘   │
│  ... (scrollable list)                  │
│  ─────────────────────────────────────  │
│  [Clear All]                            │  ← Bottom action (with confirm)
└─────────────────────────────────────────┘
```

### Edit Modal (within popup)
When user clicks edit on a property:
```
┌─────────────────────────────────────────┐
│  ← Back    Edit Property                │
│  ─────────────────────────────────────  │
│  Name:     [Lakefront Lodge           ] │
│  Location: [Queenstown, NZ            ] │
│  ─────────────────────────────────────  │
│  Check-in:  [2026-03-20]               │
│  Check-out: [2026-03-25]               │
│  ─────────────────────────────────────  │
│  Price:    [280    ]  Currency: [NZD ▼] │
│  Type:     (•) Per Night  ( ) Total     │
│  ─────────────────────────────────────  │
│  Bedrooms: [3]   Bathrooms: [2]        │
│  Category: [Luxury ▼]                   │
│  ─────────────────────────────────────  │
│  Description:                           │
│  [Beautiful lakefront property...     ] │
│  ─────────────────────────────────────  │
│  Images (12):                           │
│  [https://img1.jpg                    ] │
│  [https://img2.jpg                    ] │
│  ─────────────────────────────────────  │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

### UX Guidelines
- **Loading state**: Green pulsing progress bar during scraping, per-tab status for bulk
- **Success**: Brief green checkmark toast (2s)
- **Error**: Red toast with message, stays until dismissed
- **Touch targets**: All buttons min 36px height (extension context, not mobile)
- **Transitions**: 200ms for hover/focus states
- **Cursor**: `cursor-pointer` on all clickable elements
- **Focus**: Visible focus rings for keyboard navigation
- **Empty state**: "No properties scraped yet. Visit a property page and click Scrape." with illustration

### Content Script Floating Button
```
┌──────────────────────┐
│ 🏠 Scrape Property   │  ← Bottom-right, fixed, Shadow DOM
└──────────────────────┘
```
- Dark background (#0F172A), green text (#22C55E), 12px border-radius
- States: idle → loading (spinner) → success (checkmark, 2s) → back to idle
- Shadow DOM isolates styles from host page CSS

## CSV Output Format

Must match `PropertyForm.jsx` line 252 exactly:

```
name,location,checkIn,checkOut,currency,price,price_type,bedrooms,bathrooms,images,homeImageIndex,selected,description,category
```

- **images**: semicolon-separated URLs
- **price_type**: `"Per Night"` or `"Total Stay"`
- **category**: defaults to `"Luxury"` (editable)
- **currency**: 3-letter ISO from app's 32-currency list
- **selected**: `TRUE` / `FALSE`
- All fields double-quoted, internal quotes escaped as `""`

## Implementation Plan

### Phase 1: Extension Skeleton + Apify Client
1. **`manifest.json`** — Manifest V3, permissions: `storage`, `activeTab`, `scripting`, `tabs`
2. **`settings/settings.html` + `settings.js`** — API token configuration page
3. **`background/apify.js`** — Apify API client:
   - `ACTOR_MAP` domain → actor ID mapping
   - `buildActorInput(actorId, url)` — actor-specific input JSON
   - `scrapeProperty(url, apiToken)` — run actor, wait, fetch results
   - `scrapeMultiple(urls, apiToken)` — parallel batch with concurrency limit (5)
4. **`background/normalizer.js`** — Per-actor field mapping + bedroom/bathroom inference + room type expansion
5. **`background/background.js`** — Service worker with message handlers + storage CRUD + badge count
6. **`icons/`** — House icons (16/48/128px)
7. **`lib/csv.js`** — CSV generation matching PropertyForm parser
8. Verify extension loads in Brave

### Phase 2: Content Script
9. **`content/content.js`** — Floating "Scrape Property" button:
   - Shadow DOM for style isolation
   - States: idle → loading (spinner) → success/error
   - Sends `SCRAPE_PAGE` message to background with current URL

### Phase 3: Popup UI
10. **`popup/popup.html` + `popup.css` + `popup.js`**:
    - Dark theme popup (400x520px) per design system above
    - "Scrape This Page" + "Scrape All Tabs" buttons
    - Property list with thumbnails, edit/delete
    - Edit modal with all 14 CSV fields
    - "Export CSV" button (gold accent)
    - "Clear All" with confirmation
    - Loading/progress states for bulk scraping
    - Settings gear → opens settings page

### Phase 4: Testing
11. Test each actor against live property URLs on each supported site
12. Test CSV round-trip: scrape → export → import into PropertyForm → verify
13. Test bulk scraping: 5+ tabs simultaneously
14. Handle edge cases: timeouts, rate limits, missing fields
15. Test in Brave browser

## Key Files to Reference

| File | Why |
|------|-----|
| [PropertyForm.jsx:103-156](src/components/PropertyForm.jsx#L103-L156) | CSV parser — our output must be compatible |
| [PropertyForm.jsx:244-299](src/components/PropertyForm.jsx#L244-L299) | CSV export format to mirror |
| [currencyUtils.js:2-33](src/utils/currencyUtils.js#L2-L33) | 32 currencies for popup dropdown |

## Setup Steps

1. Sign up at apify.com (free, no credit card)
2. Settings → Integrations → API tokens → Copy token
3. Load extension in Brave: `brave://extensions` → Developer mode → Load unpacked
4. Extension Settings → Paste Apify API token
5. Navigate to property pages → Scrape → Export CSV → Import into app

## Verification

1. Load extension in `brave://extensions`
2. Paste Apify API token in settings
3. Test single scrape: booking.com property → verify name, price, images, location
4. Test Airbnb: verify bedrooms, bathrooms, all gallery images
5. Test bulk: open 5 tabs across different sites → Scrape All Tabs → verify progress + results
6. Test room types: hotel with multiple room types → verify separate rows
7. Edit a property in popup (change category, add dates)
8. Export CSV → verify headers match → import into PropertyForm → verify all fields
9. Test fallback: ratehawk.com or bookabach.co.nz → Universal AI Scraper
10. Test errors: invalid token, actor timeout, non-property page
