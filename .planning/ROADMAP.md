# Roadmap: Veeha Travels — Client View UX Overhaul

## Overview

Transform the client-facing travel quote interface from "needs video walkthrough" to self-explanatory through progressive UX enhancements. Starting with foundational layout changes (sticky price summary), building clarity through transparent pricing and contextual labels, then polishing with onboarding, accessibility, and performance improvements. The journey delivers immediate impact (sticky pricing) early while deferring optional features (Agent's Pick) to the end. Every phase can be verified through Janvi's real NZ$25,993 quote data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Sticky Price Summary Panel** - Desktop sidebar and mobile bottom bar replace scrolling header cards
- [ ] **Phase 2: Price Breakdown Modal** - Full itemized breakdown with per-person math and category subtotals
- [ ] **Phase 3: Activity Badges & Per-Person Math** - Included vs Optional badges with transparent cost calculations
- [ ] **Phase 4: Contextual Price Labels** - Replace raw deltas with clear "Saves NZ$150" and "+NZ$256 upgrade" labels
- [ ] **Phase 5: Welcome Banner** - First-time orientation with dismissible greeting
- [ ] **Phase 6: Summary Tab Enhancement** - Itinerary timeline and quick stats for at-a-glance understanding
- [ ] **Phase 7: Accessibility Fixes** - ARIA roles, keyboard navigation, and proper focus management
- [ ] **Phase 8: Performance & Loading** - Image lazy loading and skeleton screens
- [ ] **Phase 9: Agent's Pick** - Recommended activity/property badges with admin toggle

## Phase Details

### Phase 1: Sticky Price Summary Panel
**Goal**: Client always sees their current total and price breakdown without scrolling
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, PRICE-04
**Success Criteria** (what must be TRUE):
  1. Client on desktop (1024px+) sees sticky sidebar showing base price, changes total, final price, and category subtotals
  2. Client on mobile/tablet (<1024px) sees fixed bottom bar with final price and Details/Confirm buttons
  3. Old 3-card header grid (Base | Selections | Final) no longer appears on any screen size
  4. Main content remains readable with proper minimum width on desktop (sidebar doesn't crush content)
  5. Mobile content has bottom padding preventing overlap with fixed bottom bar
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md — Create sticky sidebar and mobile bottom bar with responsive layout integration

### Phase 2: Price Breakdown Modal
**Goal**: Client can see full itemized breakdown of every selection with transparent pricing
**Depends on**: Phase 1
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-05
**Success Criteria** (what must be TRUE):
  1. Client can click "See full breakdown" (desktop sidebar) or "Details" (mobile bottom bar) to open itemized modal
  2. Modal shows category subtotals (Properties, Activities, Transport, Flights) with individual line items
  3. Modal shows per-person math for activities (e.g., "NZ$549/person x 4 = NZ$2,196")
  4. All prices in modal respect client's selected currency conversion with 2% markup
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Activity Badges & Per-Person Math
**Goal**: Client immediately understands which activities are included vs optional and how costs are calculated
**Depends on**: Phase 1
**Requirements**: ACTV-01, ACTV-02, ACTV-03, ACTV-04, ACTV-05, ACTV-06, ACTV-07
**Success Criteria** (what must be TRUE):
  1. Each activity card displays either "Included" (green) or "Optional" (blue) badge
  2. Activity cards show contextual one-liners based on state (e.g., "Part of your base package — no extra cost", "Adds NZ$587 to your total", "Removing saves NZ$716")
  3. Activities with cost_per_pax show calculation breakdown (e.g., "NZ$179/person x 3 = NZ$537")
  4. Activities with both cost_per_pax and flat_price show full math (e.g., "NZ$537 + NZ$50 fee = NZ$587")
  5. Included activities with pax changes show before/after comparison math
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Contextual Price Labels
**Goal**: Client sees clear, scannable price context instead of meaningless raw deltas
**Depends on**: Phase 1
**Requirements**: LABEL-01, LABEL-02, LABEL-03, LABEL-04, LABEL-05
**Success Criteria** (what must be TRUE):
  1. Property cards with negative deltas show "Saves NZ$X" in green instead of raw "-NZ$X"
  2. Property cards with positive deltas show "+NZ$X upgrade" in amber instead of raw "+NZ$X"
  3. Property cards with zero delta show "Base option" neutral badge
  4. Transport and flight cards use same contextual label pattern (Saves/upgrade/Base option)
  5. All labels fit within mobile card layout without wrapping or truncation
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Welcome Banner
**Goal**: First-time visitors understand the interface purpose and how to use it
**Depends on**: Phase 1
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04
**Success Criteria** (what must be TRUE):
  1. First-time visitor sees dismissible banner greeting them with client name and base quote amount
  2. Client can dismiss banner and dismissal persists through page refreshes (sessionStorage)
  3. Banner reappears on new browser session (expected behavior — banner is brief and helpful)
  4. Banner text is maximum 2 lines without color-teaching or legend explanations
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Summary Tab Enhancement
**Goal**: Summary tab provides at-a-glance itinerary understanding instead of flat selection list
**Depends on**: Phase 1
**Requirements**: SUMM-01, SUMM-02, SUMM-03, SUMM-04
**Success Criteria** (what must be TRUE):
  1. Summary tab shows itinerary route visualization (location dots connected by lines)
  2. Summary tab shows quick stats (locations count, flights count, vehicles count, activity counts)
  3. Summary tab shows selected items grouped with included/optional badges
  4. Summary tab shows total price with "See full breakdown" link opening the modal from Phase 2
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Accessibility Fixes
**Goal**: Interface meets WCAG 2.1 Level AA standards for keyboard navigation and screen reader support
**Depends on**: Phase 1
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06
**Success Criteria** (what must be TRUE):
  1. Tab navigation bar uses proper ARIA roles (role="tablist", role="tab", aria-selected, aria-controls)
  2. Tab panels use role="tabpanel" with matching id for aria-controls
  3. All icon-only buttons have descriptive aria-label (carousel arrows, pax +/-, currency selector)
  4. Price summary sidebar has aria-live="polite" to announce changes to screen readers
  5. All interactive elements meet 44x44px minimum touch target size (especially pax +/- buttons)
  6. All interactive elements have visible focus indicators (focus-visible:ring-2 focus-visible:ring-blue-500)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Performance & Loading
**Goal**: Fast perceived load time on mobile networks with professional loading states
**Depends on**: Phase 1
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, LOAD-01, LOAD-02, LOAD-03
**Success Criteria** (what must be TRUE):
  1. All images except first visible in each section have loading="lazy" attribute
  2. All lazy-loaded images have decoding="async" for non-blocking decode
  3. Property carousels load only first image eagerly, rest are lazy
  4. Activity images all load lazily (below fold in their tab)
  5. Initial loading state shows skeleton layout with header placeholder, tab bar shapes, and card outlines
  6. Skeleton uses animate-pulse with bg-gray-200 rounded shapes (no "Loading..." text)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Agent's Pick
**Goal**: Admin can highlight recommended options to reduce client decision paralysis
**Depends on**: Phase 1
**Requirements**: PICK-01, PICK-02, PICK-03, PICK-04
**Success Criteria** (what must be TRUE):
  1. Admin can toggle "recommended" boolean on activities and properties via switch UI
  2. Client sees "Agent's Pick" gold badge on recommended activities with Lucide Star icon
  3. Client sees "Recommended" gold badge on recommended properties with Lucide Star icon
  4. Badge styling uses bg-amber-50 text-amber-800 border border-amber-300 for gold effect
  5. Backward compatible (no badge appears if recommended field is missing or false)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Sticky Price Summary Panel | 0/1 | Planning complete | - |
| 2. Price Breakdown Modal | 0/TBD | Not started | - |
| 3. Activity Badges & Per-Person Math | 0/TBD | Not started | - |
| 4. Contextual Price Labels | 0/TBD | Not started | - |
| 5. Welcome Banner | 0/TBD | Not started | - |
| 6. Summary Tab Enhancement | 0/TBD | Not started | - |
| 7. Accessibility Fixes | 0/TBD | Not started | - |
| 8. Performance & Loading | 0/TBD | Not started | - |
| 9. Agent's Pick | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-24*
*Last updated: 2026-02-24*
