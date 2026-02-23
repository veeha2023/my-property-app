# Requirements: Veeha Travels — Client View UX Overhaul

**Defined:** 2026-02-24
**Core Value:** Clients can understand and customize their travel quote without needing a video walkthrough

## v1 Requirements

### Layout & Navigation

- [ ] **LAYOUT-01**: Client sees a sticky price summary sidebar on desktop (lg: 1024px+) showing base price, changes total, and final price
- [ ] **LAYOUT-02**: Client sees a fixed bottom bar on mobile/tablet (<1024px) showing final price with "Details" and "Confirm" buttons
- [ ] **LAYOUT-03**: Existing 3-card header grid (Base | Selections | Final) is replaced by the sidebar/bottom bar
- [ ] **LAYOUT-04**: Main content area has proper min-width and doesn't get crushed by sidebar
- [ ] **LAYOUT-05**: Mobile content has bottom padding to prevent overlap with fixed bottom bar

### Price Transparency

- [ ] **PRICE-01**: Client can open a full itemized breakdown modal/drawer showing every selection with its cost
- [ ] **PRICE-02**: Breakdown modal shows category subtotals (Properties, Activities, Transport, Flights)
- [ ] **PRICE-03**: Breakdown modal shows per-person math for activities (e.g., "NZ$549/person x 4")
- [ ] **PRICE-04**: Sidebar shows category subtotals (not full line items)
- [ ] **PRICE-05**: All prices in breakdown respect the client's selected currency conversion

### Activity Clarity

- [ ] **ACTV-01**: Each activity card displays "Included" (green) or "Optional" (blue) badge
- [ ] **ACTV-02**: Included + selected activities show "Part of your base package — no extra cost"
- [ ] **ACTV-03**: Optional + selected activities show "Adds {price} to your total"
- [ ] **ACTV-04**: Optional + unselected activities show "Available for {price} extra"
- [ ] **ACTV-05**: Included + deselected activities show "Removing saves {price}"
- [ ] **ACTV-06**: Activities with cost_per_pax show calculation breakdown (price x pax = total)
- [ ] **ACTV-07**: Activities with flat_price show it as a separate line in the math

### Contextual Labels

- [ ] **LABEL-01**: Property cards show "Saves NZ$X" in green for negative deltas
- [ ] **LABEL-02**: Property cards show "+NZ$X upgrade" in amber for positive deltas
- [ ] **LABEL-03**: Property cards show "Base option" neutral badge for zero delta
- [ ] **LABEL-04**: Transport and flight cards use same contextual label pattern
- [ ] **LABEL-05**: All labels are concise enough for mobile card layout

### Onboarding

- [ ] **ONBD-01**: First-time visitors see a welcome banner with client name and base quote amount
- [ ] **ONBD-02**: Banner is dismissible and dismissal persists via sessionStorage
- [ ] **ONBD-03**: Banner reappears on new browser sessions (intentional — brief and helpful)
- [ ] **ONBD-04**: Banner text is 2 lines maximum, no color-teaching or legend

### Summary Tab

- [ ] **SUMM-01**: Summary tab shows itinerary route visualization (location dots connected by lines)
- [ ] **SUMM-02**: Summary tab shows quick stats (locations count, flights, vehicles, activity counts)
- [ ] **SUMM-03**: Summary tab shows selected items grouped with included/optional badges
- [ ] **SUMM-04**: Summary tab shows total with "See full breakdown" link to modal

### Accessibility

- [ ] **A11Y-01**: Tab navigation uses role="tablist", role="tab", aria-selected, aria-controls
- [ ] **A11Y-02**: Tab panels use role="tabpanel" with matching id
- [ ] **A11Y-03**: All icon-only buttons have aria-label (carousel arrows, pax +/-, currency)
- [ ] **A11Y-04**: Price summary has aria-live="polite" to announce changes to screen readers
- [ ] **A11Y-05**: All interactive elements are minimum 44x44px touch targets
- [ ] **A11Y-06**: Interactive elements have focus-visible:ring-2 focus-visible:ring-blue-500

### Performance

- [ ] **PERF-01**: All images except first visible in each section have loading="lazy"
- [ ] **PERF-02**: All lazy images have decoding="async"
- [ ] **PERF-03**: Property carousel: only first image eager, rest lazy
- [ ] **PERF-04**: Activity images: all lazy (below fold in their tab)

### Loading State

- [ ] **LOAD-01**: Loading state shows skeleton layout instead of "Loading client selection..." text
- [ ] **LOAD-02**: Skeleton includes header placeholder, tab bar shapes, and card outlines
- [ ] **LOAD-03**: Skeleton uses animate-pulse with bg-gray-200 rounded shapes

### Agent's Pick (Optional — requires admin changes)

- [ ] **PICK-01**: Admin can toggle "recommended" boolean on activities and properties
- [ ] **PICK-02**: Client sees "Agent's Pick" gold badge on recommended activities
- [ ] **PICK-03**: Client sees "Recommended" badge on recommended properties
- [ ] **PICK-04**: Badge uses Lucide Star icon, not emoji

## v2 Requirements

### Enhanced Features

- **V2-01**: Keyboard arrow key navigation between tabs
- **V2-02**: prefers-reduced-motion support for all animations
- **V2-03**: WebP/AVIF format detection for modern image compression
- **V2-04**: srcset for responsive images at different screen densities
- **V2-05**: Route visualization with map integration on Summary tab

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin dashboard redesign | Focus is client-facing UX only |
| New Supabase RPC functions | All data already available in existing JSONB blob |
| Real-time collaboration | Single client per share link, no concurrent editing |
| Print-friendly view | Clients use digital share links, not printouts |
| Email notifications | Out of scope for UI overhaul |
| Payment/booking integration | This is a quoting tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 1 | Pending |
| LAYOUT-02 | Phase 1 | Pending |
| LAYOUT-03 | Phase 1 | Pending |
| LAYOUT-04 | Phase 1 | Pending |
| LAYOUT-05 | Phase 1 | Pending |
| PRICE-01 | Phase 2 | Pending |
| PRICE-02 | Phase 2 | Pending |
| PRICE-03 | Phase 2 | Pending |
| PRICE-04 | Phase 1 | Pending |
| PRICE-05 | Phase 2 | Pending |
| ACTV-01 | Phase 3 | Pending |
| ACTV-02 | Phase 3 | Pending |
| ACTV-03 | Phase 3 | Pending |
| ACTV-04 | Phase 3 | Pending |
| ACTV-05 | Phase 3 | Pending |
| ACTV-06 | Phase 3 | Pending |
| ACTV-07 | Phase 3 | Pending |
| LABEL-01 | Phase 4 | Pending |
| LABEL-02 | Phase 4 | Pending |
| LABEL-03 | Phase 4 | Pending |
| LABEL-04 | Phase 4 | Pending |
| LABEL-05 | Phase 4 | Pending |
| ONBD-01 | Phase 5 | Pending |
| ONBD-02 | Phase 5 | Pending |
| ONBD-03 | Phase 5 | Pending |
| ONBD-04 | Phase 5 | Pending |
| SUMM-01 | Phase 6 | Pending |
| SUMM-02 | Phase 6 | Pending |
| SUMM-03 | Phase 6 | Pending |
| SUMM-04 | Phase 6 | Pending |
| A11Y-01 | Phase 7 | Pending |
| A11Y-02 | Phase 7 | Pending |
| A11Y-03 | Phase 7 | Pending |
| A11Y-04 | Phase 7 | Pending |
| A11Y-05 | Phase 7 | Pending |
| A11Y-06 | Phase 7 | Pending |
| PERF-01 | Phase 8 | Pending |
| PERF-02 | Phase 8 | Pending |
| PERF-03 | Phase 8 | Pending |
| PERF-04 | Phase 8 | Pending |
| LOAD-01 | Phase 8 | Pending |
| LOAD-02 | Phase 8 | Pending |
| LOAD-03 | Phase 8 | Pending |
| PICK-01 | Phase 9 | Pending |
| PICK-02 | Phase 9 | Pending |
| PICK-03 | Phase 9 | Pending |
| PICK-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap creation*
