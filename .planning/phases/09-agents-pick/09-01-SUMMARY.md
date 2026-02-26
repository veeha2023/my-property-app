---
phase: 09-agents-pick
plan: 01
subsystem: admin-forms, client-view
tags: [badges, recommended, agent-pick, ux, admin-ui]
dependency_graph:
  requires: []
  provides: [recommended-field-on-activities, recommended-field-on-properties, agent-pick-badges-in-client-view]
  affects: [src/components/ActivityForm.jsx, src/components/PropertyForm.jsx, src/pages/ClientView.jsx]
tech_stack:
  added: []
  patterns: [amber-gold-toggle-switch, conditional-badge-rendering, backward-compatible-boolean-field]
key_files:
  created: []
  modified:
    - src/components/ActivityForm.jsx
    - src/components/PropertyForm.jsx
    - src/pages/ClientView.jsx
decisions:
  - "Agent's Pick toggle uses amber/gold color scheme matching badge design for visual consistency"
  - "Toggle switch positioned after Included in Base Quote checkbox in ActivityForm, after Selected for Client checkbox in PropertyForm"
  - "Badge positioned top-right corner of card images to avoid conflict with selected checkmark at top-left"
  - "Backward compatibility via JavaScript truthiness: undefined/false recommended field shows no badge"
  - "Property badge label is Recommended (not Agent's Pick) per requirements for differentiated nomenclature"
metrics:
  duration: 10 minutes
  completed_date: "2026-02-26"
  tasks_completed: 3
  files_modified: 3
---

# Phase 9 Plan 1: Agent's Pick Badges Summary

Agent's Pick recommendation system added: admin toggle switches on ActivityForm and PropertyForm set a `recommended` boolean, while ClientView renders gold badges (Star icon, amber styling) on marked cards for both activities and properties.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add recommended toggle switch to ActivityForm admin UI | b35d3db | src/components/ActivityForm.jsx |
| 2 | Add recommended toggle switch to PropertyForm admin UI | 5b32806 | src/components/PropertyForm.jsx |
| 3 | Render Agent's Pick badges in ClientView for recommended items | d6e69ed | src/pages/ClientView.jsx |

## What Was Built

### ActivityForm (Admin)
- Added `recommended: false` to new activity state initialization
- Added amber-styled "Agent's Pick" toggle switch UI below the "Included in Base Quote" checkbox
- Toggle uses `bg-amber-50` background, `border-amber-200` border, `bg-amber-500` active state
- When editing existing activities, `recommended: activity.recommended || false` ensures backward compatibility

### PropertyForm (Admin)
- Added `recommended: false` to both `initialNewPropertyState` and the `useState` initialization
- Added amber-styled "Recommended" toggle switch UI below the "Selected for Client" checkbox
- When editing existing properties, `recommended: property.recommended || false` ensures backward compatibility

### ClientView (Client-Facing)
- Imported `Star` icon from `lucide-react`
- Added "Agent's Pick" badge on activity card images (top-right corner, amber gold styling)
- Added "Recommended" badge on property card images (top-right corner, amber gold styling, z-10 for carousel overlap)
- Badge: `bg-amber-50 text-amber-800 border border-amber-300` with `fill-amber-400 text-amber-600` Star icon
- Conditional rendering: `{activity.recommended && ...}` / `{property.recommended && ...}` — no badge if field missing or false

## Decisions Made

- **Agent's Pick toggle** uses amber/gold color scheme matching badge design for visual consistency between admin and client experiences
- **Toggle placement:** ActivityForm — after Included in Base Quote; PropertyForm — after Selected for Client (logical grouping with other status toggles)
- **Badge position:** Top-right corner of card images; selected checkmark remains top-left (no collision)
- **Backward compatibility:** JavaScript truthiness handles undefined fields — existing quotes show no badges, no errors
- **Nomenclature split:** Activities use "Agent's Pick" label; properties use "Recommended" label per plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `grep "recommended.*false" src/components/ActivityForm.jsx` — confirmed (line 170, 651)
- `grep "Agent's Pick" src/components/ActivityForm.jsx` — confirmed (lines 170, 504, 507)
- `grep "recommended.*false" src/components/PropertyForm.jsx` — confirmed (lines 47, 65, 324)
- `grep "bg-amber-50" src/components/PropertyForm.jsx` — confirmed (line 830)
- `Star` imported in ClientView (line 10)
- "Agent's Pick" badge in ClientView (line 1289-1294)
- "Recommended" badge in ClientView (line 1197-1210)
- `fill-amber-400` appears twice in ClientView (lines 1203, 1292)
- ActivityForm: 699 lines (>= 680 required)
- PropertyForm: 1259 lines (>= 1240 required)
- ClientView: 1597 lines (>= 1160 required)

## Self-Check: PASSED

Files verified:
- FOUND: src/components/ActivityForm.jsx (699 lines, contains recommended field and Agent's Pick UI)
- FOUND: src/components/PropertyForm.jsx (1259 lines, contains recommended field and Recommended UI)
- FOUND: src/pages/ClientView.jsx (1597 lines, contains Star import and both badges)

Commits verified:
- FOUND: b35d3db — feat(09-01): add Agent's Pick toggle to ActivityForm admin UI
- FOUND: 5b32806 — feat(09-01): add Recommended toggle to PropertyForm admin UI
- FOUND: d6e69ed — feat(09-01): render Agent's Pick and Recommended badges in ClientView
