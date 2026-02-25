---
phase: 04-contextual-price-labels
plan: "02"
subsystem: client-view
tags: [ux, price-labels, contextual, transport, flights, activities, color-coding]
dependency_graph:
  requires:
    - phase: 04-01
      provides: formatContextualLabel and formatActivityLabel utilities in priceLabels.js
  provides:
    - transport-cards-contextual-labels
    - flight-cards-contextual-labels
    - activity-cards-contextual-labels
  affects: [src/pages/ClientView.jsx]
tech-stack:
  added: []
  patterns: [iife-in-jsx, styling-object-return, utility-separation-of-concerns]
key-files:
  created: []
  modified: [src/pages/ClientView.jsx]
key-decisions:
  - "Summary tab displayPriceWithSign calls kept as-is — those are compact list items not selection cards"
  - "formatActivityLabel receives parseCurrencyToNumber as argument — keeps utility pure, no component coupling"
  - "Removed priceColorStyle variables from transport and activity card scopes — unused after contextual label adoption"
patterns-established:
  - "IIFE pattern for inline label computation used consistently across all card types (property, transport, flight, activity)"
  - "Label utilities receive formatter callbacks (displayPrice) rather than raw amounts — enables currency conversion"
requirements-completed: [LABEL-04, LABEL-05]
duration: 5min
completed: 2026-02-25
---

# Phase 04 Plan 02: Contextual Price Labels for Transport, Flight, and Activity Cards Summary

**Contextual labels (Saves/+upgrade/Base option/Included/Optional) applied to all remaining selection card types using formatContextualLabel and formatActivityLabel utilities established in Plan 04-01.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T02:56:07Z
- **Completed:** 2026-02-25T02:01:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Transport cards now display "Saves NZ$X" (green), "+NZ$X upgrade" (amber), or "Base option" (gray badge) instead of raw delta
- Flight cards use same formatContextualLabel IIFE pattern with 'flight' context parameter
- Activity cards use specialized formatActivityLabel: included activities show "Included" or "Save NZ$X", optional show "+NZ$X" or "Optional"
- Removed all priceColorStyle/deltaPrice/displayPriceWithSign raw delta calls from selection cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Update transport and flight cards to use contextual labels** - `ecb7885` (feat)
2. **Task 2: Update activity cards to use specialized activity labels** - `086bada` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/pages/ClientView.jsx` - Updated transport, flight, and activity card price display sections with contextual label IIFEs; removed unused priceColorStyle/deltaPrice variables

## Decisions Made
- Summary tab's compact list views (lines 920, 939, 959, 979) retained `displayPriceWithSign` — these are informational summary rows, not selection cards, so raw delta values are appropriate there
- `parseCurrencyToNumber` passed directly into `formatActivityLabel` as callback — keeps the utility decoupled from React component state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused priceColorStyle variables**
- **Found during:** Task 1 (transport card update) and Task 2 (activity card update)
- **Issue:** After replacing `displayPriceWithSign` calls, `priceColorStyle` variables became unused, causing ESLint `no-unused-vars` warnings
- **Fix:** Removed `const priceColorStyle = { color: getPriceColor(price) }` from transport card scope and `const priceColorStyle = { color: getPriceColor(deltaPrice) }` + `const deltaPrice = calculateActivityDelta(activity)` from activity card scope
- **Files modified:** src/pages/ClientView.jsx
- **Verification:** ESLint only shows 3 pre-existing warnings (not from this plan), build passes
- **Committed in:** ecb7885 (Task 1), 086bada (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 - unused variable cleanup)
**Impact on plan:** Necessary cleanup after adopting contextual labels. No scope creep.

## Issues Encountered
None — all changes applied cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four selection card types (property, transport, flight, activity) now use consistent contextual labels
- Color scheme is unified: emerald = savings, amber = upgrades, gray = neutral/base
- Phase 4 complete — ready for Phase 5 or any subsequent phase

---
*Phase: 04-contextual-price-labels*
*Completed: 2026-02-25*

## Self-Check: PASSED

- src/pages/ClientView.jsx: FOUND
- .planning/phases/04-contextual-price-labels/04-02-SUMMARY.md: FOUND
- Commit ecb7885 (Task 1): FOUND
- Commit 086bada (Task 2): FOUND
