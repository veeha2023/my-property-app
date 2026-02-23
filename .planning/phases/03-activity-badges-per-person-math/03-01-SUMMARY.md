---
phase: 03-activity-badges-per-person-math
plan: 01
subsystem: ui
tags: [react, tailwind, lucide-react, currency-conversion]

# Dependency graph
requires:
  - phase: 02-price-breakdown-modal
    provides: displayPrice function with currency conversion support
provides:
  - Activity card badges (Included/Optional) with visual distinction
  - Contextual one-liner labels showing pricing state
  - Per-person math breakdown display for activities
  - Transparent cost calculation for client understanding
affects: [accessibility-fixes, performance-loading]

# Tech tracking
tech-stack:
  added: []
  patterns: [contextual-pricing-labels, per-person-math-display, badge-overlay-design]

key-files:
  created: []
  modified: [src/pages/ClientView.jsx]

key-decisions:
  - "Badge positioned bottom-left with backdrop blur to avoid collision with selection checkmark at top-left"
  - "Color-coded contextual labels (gray, amber, green, blue) for visual state scanning"
  - "Monospace font for math breakdown to align numbers and improve readability"
  - "Comparison format for included activities with pax changes shows before/after side-by-side"

patterns-established:
  - "Badge overlay pattern: absolute positioning with backdrop blur for readability over images"
  - "Math breakdown display: gray box with monospace font above delta price, not replacing it"
  - "Contextual label helper pattern: returns {text, color} object for flexible rendering"

requirements-completed: [ACTV-01, ACTV-02, ACTV-03, ACTV-04, ACTV-05, ACTV-06, ACTV-07]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 03 Plan 01: Activity Badges & Per-Person Math Summary

**Activity cards now display Included/Optional badges, contextual pricing labels, and transparent per-person math calculations using displayPrice with currency conversion**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-23T23:23:05Z
- **Completed:** 2026-02-23T23:26:28Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- All activity cards show green "Included" or blue "+ Optional" badges with backdrop blur
- Five distinct contextual labels based on activity state (included + same pax, included + pax changed, included + deselected, optional + selected, optional + not selected)
- Per-person math breakdown shows calculations like "NZ$179/person × 3 = NZ$537 + NZ$50 fee = NZ$587"
- Included activities with pax changes show before/after comparison math
- All prices respect selected currency conversion via displayPrice function

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Included/Optional badges to activity cards** - `442d23c` (feat)
2. **Task 2: Add contextual one-liner labels below activity names** - `46254b0` (feat)
3. **Task 3: Add per-person math calculation display** - `65c1b5c` (feat)

## Files Created/Modified
- `src/pages/ClientView.jsx` - Added badge overlay, contextual label helper (getActivityContextLabel), math breakdown helper (getActivityMathBreakdown), and integrated all displays into activity card rendering

## Decisions Made
- Badge positioned at bottom-left with backdrop blur to avoid collision with selection checkmark (top-left) and maintain readability over dark/light images
- Color-coded labels for visual scanning: gray (no change), amber (pax changed), green (savings), blue (optional add)
- Monospace font for math breakdown improves number alignment and calculation readability
- Math breakdown appears above delta price display (not replacing it) to show both calculation and impact

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 3 complete. Activity cards now provide transparent pricing context. Ready for Phase 4 (Contextual Price Labels) which will apply similar transparency improvements to properties and other sections.

All activity data displays correctly with currency conversion. No blockers for subsequent phases.

## Self-Check: PASSED

All claims verified:
- File exists: src/pages/ClientView.jsx ✓
- Commit 442d23c exists ✓
- Commit 46254b0 exists ✓
- Commit 65c1b5c exists ✓

---
*Phase: 03-activity-badges-per-person-math*
*Completed: 2026-02-23*
