# UX Overhaul Plan: Make Client View Self-Explanatory

## Status: PLANNED (Feb 24, 2026) — Awaiting user approval

---

## Problem Statement

Clients receiving travel itinerary quotes consistently need video walkthroughs to understand the interface. The delta-based pricing model ("+$250", "-$150") is meaningless without context. There's no visible connection between the base quote and what it includes.

## Real Data Analysis: Janvi's Quote

**Client:** Janvi (147 - Updated) NZ Extraordinaire 2026
**Base Quote:** NZ$25,992.88
**Finalized:** Yes
**Conversion Date:** 2026-02-05

### Scale
- 31 properties across 10 NZ locations (Auckland, Coromandel, Rotorua, Te Anau, Queenstown, Tekapo, Christchurch, Waitomo, Wanaka, Kaikoura)
- 23 activities (16 included in base, 7 optional)
- 1 flight (Jetstar JQ267 Auckland→Queenstown, $0 delta both ways)
- 9 transportation options (2 Kia Carnivals selected, $0 delta)

### Pricing Breakdown
```
Base quote:                  NZ$25,993
Property deltas:               -NZ$150  (Urban Retreat Auckland saves $150)
Transport deltas:                  NZ$0  (base options selected)
Flight deltas:                     NZ$0
Optional activities added:   +NZ$2,943
  - Helicopter + Glacier:    +NZ$2,196  ($549/pax × 4)
  - Hydro Attack:              +NZ$587  ($179/pax × 3 + $50 flat)
  - Tekapo Hot Tubs:           +NZ$160  ($40/pax × 4)
──────────────────────────────────────
FINAL:                      NZ$28,786
```

### What Confuses Clients (Real Examples)
1. Property "Urban Retreat Auckland" shows "-NZ$150" — relative to what?
2. Property "Lakefront Access Villa Rotorua" shows "+NZ$256" — no context
3. "Helicopter + Glacier Landing" adds NZ$2,196 — just a big number
4. "Hydro Attack" = $179/person × 3 + $50 = $587 — math is hidden
5. 16 activities show "$0 change" — client doesn't know they're included
6. No explanation of what the NZ$25,993 base actually covers

## Research Findings

- **53% of travel customers abandon when confused by final price** (sticker shock)
- **Sticky price summaries boost conversions ~4.17%** (always-visible totals)
- **48% abandon due to hidden costs** — itemized breakdowns are critical
- Airbnb made total price display mandatory globally (2025)
- Per-person vs total pricing is a major industry confusion point
- Progressive disclosure prevents overwhelm with many options

---

## UI/UX Audit of Original Plan

### What's Good (Keep As-Is)
- Sticky sidebar concept (#1) — industry standard, research-backed
- Included vs Optional badges (#3) — solves the biggest confusion point
- Per-person math (#4) — critical for price transparency
- Agent's Pick (#7) — smart way to reduce decision paralysis
- Priority ordering is correct — layout first, then content, then polish

### What Needs Fixing

**#1 Sticky Sidebar — Layout risk on tablet**
- Original: `w-[300px]` hardcoded. On 768px screens (iPad portrait), sidebar eats 40% of space, crushing content cards into single-column mush.
- Fix: Show sidebar only on `lg:` (1024px+), use mobile bottom bar for `md:` too. Add `lg:w-[320px]` with proper content minimum width.

**#1 Sticky Sidebar — Missing "per person" toggle**
- Original plan shows per-person as static `÷4`. But pax varies per activity (Hydro Attack is 3 pax, others are 4). A simple division is misleading.
- Fix: Remove static per-person from sidebar. Per-person math belongs on individual activity cards only (change #4).

**#2 Itemized Breakdown — Over-engineered for sidebar**
- Original puts full line-item breakdown inside the 300px sidebar. With 31 properties + 23 activities, this becomes a scrolling nightmare *inside* a sticky panel.
- Fix: Show only category subtotals in sidebar (Properties: -$150, Activities: +$2,943, Transport: $0, Flights: $0). Full itemized breakdown opens as a modal/drawer when "See full breakdown" is clicked.

**#5 Contextual Labels — "less/more than base option" is wordy**
- "NZ$150 less than base option" takes up too much horizontal space on mobile cards and competes with the property name for attention.
- Fix: Use shorter labels with color coding: `Saves NZ$150` (green), `+NZ$256 upgrade` (amber), `Base option` (neutral gray badge). The color provides the context the words used to carry.

**#6 Welcome Banner — localStorage is fragile**
- localStorage gets cleared by browser cleanup, incognito mode, or cookie consent tools. Client sees the banner again. Also, banner text is too long — 4 lines of text that clients will skip.
- Fix: Store dismissal in `sessionStorage` (survives page refreshes within session, reappears on new visits which is fine). Shorten to 2 lines max. Consider a tooltip/coach-mark approach instead — highlight the sidebar on first load with a brief callout.

**#6 Welcome Banner — Reveals internal logic**
- "Green prices mean savings, red means extra cost" teaches the client your color system. Clients shouldn't need a legend; the UI should be self-evident.
- Fix: Remove color-teaching text. Instead, make the colors self-explanatory by pairing them with contextual labels (change #5). Banner becomes a brief warm greeting only.

### What's Missing (New Additions)

**NEW #8: Accessibility Fixes (CRITICAL)**
Current code has only 4 `aria-label` attributes across 1,151 lines. Missing:
- `aria-label` on all icon-only buttons (image nav arrows, pax +/-, currency selector)
- `role="tablist"` and `role="tab"` on the navigation tabs (currently just `<button>` with no ARIA)
- `aria-selected` on active tab
- `aria-live="polite"` on price summary so screen readers announce changes
- Keyboard navigation: tab selection only works via click, no arrow key support
- No `loading="lazy"` on any images (31 properties × multiple images = heavy initial load)

**NEW #9: Image Lazy Loading (Performance)**
Currently all property/activity images load eagerly. With 31 properties (avg 3-5 images each = ~100+ images) plus activity images, initial page load is extremely heavy. Add `loading="lazy"` to all images except the first visible one in each section.

**NEW #10: Skeleton Loading State**
Current loading state is a centered "Loading client selection..." text. For a premium travel product, this undermines trust. Replace with skeleton screens showing the expected layout structure (card outlines, text placeholders).

**NEW #11: Summary Tab Enhancement**
The existing Summary tab (#781-869) is underutilized — it only shows selected items with deltas. This should become the primary landing tab that tells a story:
- Itinerary timeline (locations in chronological order with dates)
- Total breakdown (mini version of change #2)
- Quick actions: "Review Properties", "Review Activities" etc.
- This reduces the "wall of options" overwhelm for first-time visitors

---

## 11 Changes (Revised Priority Order)

### 1. Sticky Price Summary Panel
**Replaces:** 3 scrolling header cards (Base | Selections | Final)
**UX Principle:** Always-visible pricing anchor prevents "where did my total go?" confusion

**Desktop (lg+, 1024px):** Right sidebar, `sticky top-4`, `w-[320px]`:
```
YOUR TRIP TOTAL
──────────────────────────
Base Package      NZ$25,993
Your Changes       +NZ$2,793
──────────────────────────
FINAL PRICE       NZ$28,786

Properties          -NZ$150
Activities        +NZ$2,943
Transport              NZ$0
Flights                NZ$0

[▼ See full breakdown]
[Confirm My Selections]
```

**Tablet + Mobile (<lg):** Fixed bottom bar:
```
NZ$28,786 total  [Details ▲]  [Confirm]
```
- "Details" opens a bottom sheet / drawer with the full category breakdown
- Bottom bar height: `h-16` with `pb-safe` for iPhone notch area

**Layout change in ClientView.jsx:**
```jsx
{/* Desktop: sidebar layout */}
<div className="flex gap-6">
  <div className="flex-1 min-w-0">{/* existing tabs + content */}</div>
  <div className="hidden lg:block w-[320px] shrink-0">
    <div className="sticky top-4"><PriceSummaryPanel /></div>
  </div>
</div>

{/* Mobile/Tablet: fixed bottom bar */}
<div className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white border-t shadow-lg">
  <MobileBottomBar />
</div>
```

**Important:** Remove the existing 3-card header grid (lines 753-766 in current code). The sidebar replaces it entirely.

### 2. Itemized Price Breakdown (modal/drawer, not inline sidebar)
**Problem:** "+NZ$2,793 change" with zero explanation.
**UX Principle:** Progressive disclosure — summary first, details on demand

Sidebar shows **category subtotals** only (see #1 above). Clicking "See full breakdown" opens a **centered modal (desktop) / bottom sheet (mobile)** with full itemization:

```
YOUR TRIP BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BASE PACKAGE                          NZ$25,993
  Includes 16 activities, accommodation, flights, transport

PROPERTY CHANGES                        -NZ$150
  ✓ Urban Retreat Auckland              -NZ$150
    Saves NZ$150 vs base option
  ✓ All others at base price                 $0

OPTIONAL ACTIVITIES ADDED             +NZ$2,943
  ✓ Helicopter + Glacier (4 pax)      +NZ$2,196
    NZ$549/person × 4
  ✓ Hydro Attack (3 pax)               +NZ$587
    NZ$179/person × 3 + NZ$50 fee
  ✓ Tekapo Hot Tubs (4 pax)            +NZ$160
    NZ$40/person × 4

TRANSPORT & FLIGHTS                        NZ$0
  Base options selected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL PRICE                          NZ$28,786
```

**Why modal instead of inline sidebar:**
- Sidebar at 320px can't fit readable line items
- Modal gives full width for clean two-column layout (item name | price)
- Same modal works for mobile "Details" bottom sheet — one component, two presentations

### 3. "Included" vs "Optional" Badges on Activities
**Problem:** 23 activities, no way to tell what's in the NZ$25,993 base.
**UX Principle:** Categorize before pricing — users need to understand *what* before *how much*

Pill badges on each activity card:
- **Green pill:** `✓ Included` — `bg-emerald-100 text-emerald-800 border border-emerald-200`
- **Blue pill:** `+ Optional` — `bg-blue-100 text-blue-800 border border-blue-200`

Badge placement: Top of card, above the activity name, inside the image area (absolute positioned bottom-left with backdrop blur).

Contextual one-liner below activity name (not below badge — keeps badge clean):
- Included + selected + same pax: `Part of your base package — no extra cost`
- Included + selected + pax changed: `Base: {base_pax} people → Now: {current_pax}`
- Included + deselected: `Removing saves {base_price}`
- Optional + selected: `Adds {current_price} to your total`
- Optional + not selected: `Available for {current_price} extra`

### 4. Per-Person Math Display on Activities
**Problem:** "$587" with no explanation of the calculation.
**UX Principle:** Show your work — transparent math builds trust

When `cost_per_pax > 0`, show calculation below the contextual one-liner:
```
NZ$179/person × 3 = NZ$537
+ NZ$50 fee
= NZ$587
```

For included activities with pax change:
```
Base: NZ$179 × 4 = NZ$716
Now:  NZ$179 × 3 = NZ$537
Change: -NZ$179
```

**Visual treatment:** Light gray background strip (`bg-gray-50 rounded-lg p-2 text-sm font-mono`) — visually distinct from card content, clearly "calculation" area.

### 5. Contextual Price Labels (replace raw deltas)
**Problem:** "-NZ$150" and "+NZ$256" are meaningless without context.
**UX Principle:** Color + short label > raw number. Users should never have to decode.

| Current | New | Color/Style |
|---------|-----|-------------|
| `-NZ$150` on property | `Saves NZ$150` | `text-emerald-600` |
| `+NZ$256` on property | `+NZ$256 upgrade` | `text-amber-600` |
| `NZ$0` on property | `Base option` | `text-gray-500 bg-gray-100 rounded px-2` as badge |
| `+NZ$587` on optional activity | `+NZ$587` | `text-amber-600` (context from badge #3) |
| `NZ$0` on included activity | `Included` | `text-emerald-600` (context from badge #3) |
| `-NZ$500` deselected included | `Save NZ$500` | `text-emerald-600` |

**Key change from original:** Shorter labels. "NZ$150 less than base option" → "Saves NZ$150". Mobile-friendly, scannable.

### 6. Welcome Banner (simplified)
**Problem:** Client lands on 31 properties + 23 activities with no guidance.
**UX Principle:** Orient, don't lecture. 2-line max.

Dismissible banner (`sessionStorage` persistence, reappears on new sessions):
```
┌──────────────────────────────────────────────────────────────┐
│  Welcome, {clientName}!                                    ✕ │
│  Your travel package starts at {baseQuote}. Browse each      │
│  tab to customize, and the sidebar tracks your total.        │
└──────────────────────────────────────────────────────────────┘
```

**Design:**
- `bg-blue-50 border border-blue-200 rounded-xl p-4` — subtle, not alarming
- Info icon (Lucide `Info`) on left
- `X` close button on right
- Appears above tabs, below header
- `sessionStorage` key: `welcome_dismissed_{clientId}`

**Why sessionStorage over localStorage:**
- Survives page refreshes within the same visit
- Reappears on new visits (which is fine — brief and helpful)
- Doesn't persist forever, no stale data concerns

### 7. Agent's Pick Badge (optional, data model change)
**Problem:** 23 activities across 10 locations = decision paralysis.
**UX Principle:** Guided choice reduces cognitive load without removing options

Add `recommended: boolean` field to activity/property data model.
- **Admin:** Toggle switch in ActivityForm + PropertyForm (not checkbox — switches feel more intentional)
- **Client:** Badge on cards:
  - Activities: `Agent's Pick` gold badge — `bg-amber-50 text-amber-800 border border-amber-300`
  - Properties: `Recommended` badge with same styling
  - Use Lucide `Star` icon (not emoji) — per UI/UX Pro Max anti-pattern rule: "No emojis as UI icons"
- Backward-compatible — no badge if field missing/false

### 8. Accessibility Fixes (NEW — CRITICAL)
**Problem:** 4 `aria-label` attributes across 1,151 lines. Zero ARIA roles on tabs. No lazy loading.
**UX Principle:** Accessible UI is professional UI. Also legally required in many markets.

Changes:
- Tab navigation: Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- Tab panels: Add `role="tabpanel"`, `id` matching `aria-controls`
- Icon-only buttons: Add `aria-label` to all image carousel arrows, pax +/-, currency button
- Price updates: Add `aria-live="polite"` to the sticky sidebar total so screen readers announce changes
- Touch targets: Ensure all interactive elements are min 44x44px (check pax +/- buttons — currently `w-8 h-8` = 32px, needs `w-11 h-11`)
- Focus visible: Add `focus-visible:ring-2 focus-visible:ring-blue-500` to interactive elements that lack it

### 9. Image Lazy Loading (NEW — Performance)
**Problem:** ~100+ images load eagerly on page open. Slow on mobile networks.
**UX Principle:** Fast perceived load time builds trust. Skeleton > blank > spinner.

Changes:
- Add `loading="lazy"` to all `<img>` tags except the first visible image in each property group
- Property images in carousel: Only first image eager, rest lazy
- Activity images: All lazy (below fold in their tab)
- Add `decoding="async"` alongside lazy loading

### 10. Skeleton Loading State (NEW — Polish)
**Problem:** "Loading client selection..." text undermines premium feel.
**UX Principle:** Skeleton screens reduce perceived wait time by 30%+ (industry research)

Replace the text-only loading state (line 548) with skeleton layout:
- Header skeleton: Logo placeholder + text lines
- Tab bar skeleton: 5 pill shapes
- Content skeleton: 3 card outlines with image placeholder + text lines
- Use `animate-pulse` with `bg-gray-200 rounded` shapes
- Keep it simple — a single `<LoadingSkeleton />` component, ~30 lines

### 11. Summary Tab Enhancement (NEW — Information Architecture)
**Problem:** Summary tab only shows selected items as a flat list. Doesn't tell a "story."
**UX Principle:** The first thing a client sees should answer "what am I looking at?"

Enhanced Summary tab structure:
```
YOUR ITINERARY AT A GLANCE
━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Auckland → Coromandel → Rotorua → ... → Christchurch
   Feb 10 – Feb 24, 2026 · 14 nights

QUICK SUMMARY
  10 locations · 1 flight · 2 vehicles
  16 included activities · 3 optional added

YOUR SELECTIONS (same as current, but with badges)
  [Properties list with contextual labels]
  [Activities list with included/optional badges]
  [Transport + Flights]

TOTAL: NZ$28,786
  [See full breakdown]
```

- Route visualization: horizontal dots connected by lines, each dot = location
- This becomes the default landing tab (already is)
- Adds itinerary context that's completely missing today

---

## Implementation Sequence

**Phase 1 — Foundation (layout + data)**
1. Sticky sidebar + mobile bottom bar (layout restructure) — changes DOM structure
2. Price breakdown modal/drawer (new component) — depends on sidebar "See breakdown" CTA
3. Skeleton loading state (new component) — independent, can parallelize

**Phase 2 — Content clarity (cards + labels)**
4. Included/Optional badges on activities — card-level change
5. Per-person math display on activities — card-level change, pairs with #4
6. Contextual price labels on all tabs — touches property, transport, flight cards

**Phase 3 — Onboarding + polish**
7. Welcome banner — independent component
8. Summary tab enhancement — restructure existing tab content
9. Accessibility fixes — sprinkle across all components
10. Image lazy loading — quick pass across all `<img>` tags

**Phase 4 — Optional (requires admin changes)**
11. Agent's Pick badge — admin data model + client display

## Files to Modify
- **`src/pages/ClientView.jsx`** — Primary: layout, sidebar, badges, labels, banner, accessibility, lazy loading
- **`src/components/PriceSummaryPanel.jsx`** — NEW: extracted sidebar + mobile bottom bar component
- **`src/components/PriceBreakdownModal.jsx`** — NEW: full itemized breakdown modal/drawer
- **`src/components/LoadingSkeleton.jsx`** — NEW: skeleton loading state
- **`src/components/WelcomeBanner.jsx`** — NEW: dismissible welcome banner
- **`src/utils/currencyUtils.js`** — Reuse existing functions (no changes needed)
- **`src/pages/AdminDashboard.jsx`** — Minor: recommended toggle (change #11 only)
- **`src/components/ActivityForm.jsx`** — Minor: recommended switch (change #11 only)
- **`src/components/PropertyForm.jsx`** — Minor: recommended switch (change #11 only)

## Component Extraction Strategy
ClientView.jsx is already 1,151 lines. Adding all changes inline would push it past 1,500+. Extract:
- `<PriceSummaryPanel>` — sidebar + bottom bar + breakdown trigger (~150 lines)
- `<PriceBreakdownModal>` — full breakdown modal (~120 lines)
- `<LoadingSkeleton>` — loading state (~30 lines)
- `<WelcomeBanner>` — banner (~40 lines)

This keeps ClientView.jsx close to current size while adding significant functionality.

## Verification Checklist
1. `npm run build` — no compilation errors, no ESLint warnings
2. `npm start` — test on localhost:3000
3. Verify with Janvi's data:
   - Sidebar (desktop): NZ$25,993 base → NZ$28,786 final, category subtotals visible
   - Bottom bar (mobile): shows total, "Details" opens drawer with breakdown
   - Breakdown modal: Helicopter (+$2,196), Hydro Attack (+$587), Hot Tubs (+$160), property (-$150)
   - Badges: 16 "Included" vs 7 "Optional" activities clearly distinguished
   - Per-person math visible on Helicopter, Hydro Attack, Tekapo Hot Tubs
   - Property labels: "Saves NZ$150" / "+NZ$256 upgrade" / "Base option"
   - Welcome banner: appears first visit, dismissed, reappears on new session
   - Summary tab: shows itinerary route, location count, quick stats
   - Finalized view: still read-only, no save button, sidebar still shows total
   - Currency conversion: applies to ALL new displays (sidebar, breakdown, badges, math)
   - Mobile: bottom bar visible, doesn't overlap content (add `pb-20` to main content)
   - Accessibility: tabs navigable via keyboard, screen reader announces price changes
   - Images: lazy loading on below-fold images, no layout shift
   - Loading: skeleton screens, not text
4. Cross-browser: Chrome, Safari, Firefox (mobile Safari especially for bottom bar)
5. Breakpoints: 375px (iPhone SE), 768px (iPad), 1024px (iPad landscape/small laptop), 1440px (desktop)

## Tech Stack Reminder
- React 18 + Tailwind CSS + Lucide React icons
- Supabase (PostgreSQL + RPC functions)
- No new dependencies needed
- Vercel deployment (auto from main branch)
