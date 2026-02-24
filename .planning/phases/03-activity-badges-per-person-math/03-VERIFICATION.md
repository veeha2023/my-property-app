---
phase: 03-activity-badges-per-person-math
verified: 2026-02-24T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Badge visibility over dark images"
    expected: "Green 'Included' and blue '+ Optional' badges remain readable when activity image background is dark; backdrop-blur-sm provides sufficient contrast"
    why_human: "Cannot assert visual contrast programmatically against real image content"
  - test: "Contextual label changes reactively on pax change"
    expected: "Changing pax from 3 to 4 immediately updates label from 'Part of your base package' to 'Base: 3 people → Now: 4' and updates math breakdown accordingly"
    why_human: "Requires interactive browser session with live React state changes"
  - test: "Mobile layout — no text wrapping or overflow"
    expected: "Math breakdown lines (e.g. 'NZ$179/person × 3 = NZ$537') do not overflow card bounds on 375px viewport; monospace font fits within card width"
    why_human: "Viewport-specific layout cannot be verified from static code analysis"
  - test: "Delta price below math breakdown is consistent"
    expected: "The delta price shown in the large bold number matches the total implied by the math breakdown (e.g., if math shows NZ$537 and activity is optional + selected, delta should be +NZ$537)"
    why_human: "Requires running the app with test data to compare two computed values"
---

# Phase 03: Activity Badges & Per-Person Math Verification Report

**Phase Goal:** Client immediately understands which activities are included vs optional and how costs are calculated
**Verified:** 2026-02-24T12:00:00Z
**Status:** human_needed — all automated checks pass; 4 items require browser-level confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each activity card displays either "Included" (green) or "Optional" (blue) badge | VERIFIED | Lines 1082-1091 in ClientView.jsx: conditional renders `bg-emerald-100 text-emerald-800` or `bg-blue-100 text-blue-800` span based on `activity.included_in_base !== false` |
| 2 | Activity cards show contextual one-liners based on state (5 variants) | VERIFIED | `getActivityContextLabel` at line 170 returns one of five `{text, color}` objects; rendered at line 1103-1108 |
| 3 | Activities with cost_per_pax show calculation breakdown (e.g., "NZ$179/person × 3 = NZ$537") | VERIFIED | `getActivityMathBreakdown` at line 216 builds line array with `/person ×` format when `costPerPax > 0`; rendered in monospace gray box at lines 1163-1177 |
| 4 | Activities with both cost_per_pax and flat_price show full math (subtotal + fee + total) | VERIFIED | Lines 254-259: `+ ${displayPrice(flatPrice)} fee` appended when `flatPrice > 0`, followed by `= ${displayPrice(currentTotal)}` |
| 5 | Included activities with pax changes show before/after comparison math | VERIFIED | Lines 232-245: comparison branch triggered when `isIncludedInBase && isSelected && currentPax !== basePax && basePax > 0`; returns three-line "Base / Now / Change" block |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/ClientView.jsx` | Activity card badges, contextual labels, and per-person math display | VERIFIED | 1,360 lines; contains all three features — badge overlay (line 1080), context label call (line 1103), math breakdown call (line 1163) |

**Artifact level checks:**

- Level 1 (Exists): File present at `src/pages/ClientView.jsx` — 1,360 lines
- Level 2 (Substantive): Contains `bg-emerald-100 text-emerald-800` (badge), `getActivityContextLabel` (label helper), `getActivityMathBreakdown` (math helper) — not a stub
- Level 3 (Wired): Both helpers are defined AND called in render: `getActivityContextLabel(activity)` at line 1103, `getActivityMathBreakdown(activity)` at line 1164

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Activity badge logic | `activity.included_in_base` boolean | Conditional render at line 1082: `activity.included_in_base !== false` | WIRED | Correct pattern — guards both render paths (Included green / Optional blue) |
| Contextual label logic | Activity state (selected, pax, base_pax) | `getActivityContextLabel` reads `included_in_base`, `selected`, `pax`, `base_pax` at lines 171-174 | WIRED | Five distinct branches covering all required states |
| Per-person math display | `displayPrice` formatter | `getActivityMathBreakdown` uses `displayPrice` at lines 240, 241, 242, 251, 255, 259; `displayPrice` defined at line 371 with live currency conversion | WIRED | `displayPrice` is a real implementation using `convertPrice` + exchange rates, not a stub |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ACTV-01 | 03-01-PLAN.md | Each activity card displays "Included" (green) or "Optional" (blue) badge | SATISFIED | Lines 1082-1091: conditional badge with correct Tailwind color classes |
| ACTV-02 | 03-01-PLAN.md | Included + selected shows "Part of your base package — no extra cost" | SATISFIED | Line 196: string literal in `getActivityContextLabel` third branch |
| ACTV-03 | 03-01-PLAN.md | Optional + selected shows "Adds {price} to your total" | SATISFIED | Line 204: `` `Adds ${displayPrice(currentPrice)} to your total` `` |
| ACTV-04 | 03-01-PLAN.md | Optional + unselected shows "Available for {price} extra" | SATISFIED | Line 209: `` `Available for ${displayPrice(currentPrice)} extra` `` |
| ACTV-05 | 03-01-PLAN.md | Included + deselected shows "Removing saves {price}" | SATISFIED | Line 184: `` `Removing saves ${displayPrice(basePrice)}` `` |
| ACTV-06 | 03-01-PLAN.md | Activities with cost_per_pax show calculation breakdown (price x pax = total) | SATISFIED | Lines 250-251: `` `${displayPrice(costPerPax)}/person × ${currentPax} = ${displayPrice(currentSubtotal)}` `` |
| ACTV-07 | 03-01-PLAN.md | Activities with flat_price show it as a separate line in the math | SATISFIED | Lines 254-255: `` `+ ${displayPrice(flatPrice)} fee` `` appended when `flatPrice > 0` |

No orphaned requirements — all 7 ACTV-0x IDs from REQUIREMENTS.md are accounted for in plan 03-01.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns detected |

Scan notes:
- No TODO/FIXME/HACK comments in modified sections
- `PlaceholderContent` component at line 18 is a legitimate empty-state UI for when no data exists — not a stub implementation
- `return null` in math breakdown (line 1176) is correct guard when `costPerPax === 0` — intentional, not a stub

---

### Human Verification Required

#### 1. Badge readability over dark images

**Test:** Load the client view with an activity that has a dark hero image; check that the green "Included" or blue "+ Optional" badge text is legible.
**Expected:** `backdrop-blur-sm` on the container and `bg-emerald-100` / `bg-blue-100` background on the pill provide enough contrast over any image.
**Why human:** Visual contrast against real image content cannot be asserted via static code search.

#### 2. Contextual label live reactivity on pax change

**Test:** Find an included activity with `cost_per_pax > 0`. Note the current label ("Part of your base package"). Click the + pax button to increase pax above `base_pax`. Observe the label.
**Expected:** Label immediately changes to `"Base: N people → Now: M"` with amber color; math breakdown switches to comparison format.
**Why human:** Requires live React state update cycle in a running browser.

#### 3. Mobile layout — math breakdown overflow

**Test:** Open DevTools, set viewport to 375px (iPhone SE). Navigate to Activities tab. Inspect activity cards with long math lines (e.g., "NZ$179/person × 3 = NZ$537").
**Expected:** Text fits within card; no horizontal scroll; monospace font line wraps gracefully within the `bg-gray-50` box.
**Why human:** CSS overflow behavior at specific viewport widths requires browser rendering.

#### 4. Delta price consistency with math breakdown

**Test:** Find an optional activity with `cost_per_pax = 179` and `pax = 3`. The math box should show "NZ$179/person × 3 = NZ$537". The bold delta price below should show "+NZ$537".
**Expected:** Both numbers agree. The math breakdown and delta price derive from the same source (activity data), but are computed by different functions (`getActivityMathBreakdown` vs `calculateActivityDelta`).
**Why human:** Requires test data with known values to compare two runtime-computed outputs.

---

### Gaps Summary

No gaps found. All five observable truths are fully implemented, all three artifacts are wired, and all seven requirements (ACTV-01 through ACTV-07) are satisfied by substantive code — not stubs.

Four items are flagged for human verification because they depend on visual rendering, live state, or viewport-specific layout behavior that cannot be confirmed through static analysis.

---

### Commit Verification

All three task commits from SUMMARY.md are confirmed to exist in the repository:

| Task | Commit | Status |
|------|--------|--------|
| Add Included/Optional badges | `442d23c` | Confirmed (git cat-file type: commit) |
| Add contextual one-liner labels | `46254b0` | Confirmed (git cat-file type: commit) |
| Add per-person math calculation display | `65c1b5c` | Confirmed (git cat-file type: commit) |

---

_Verified: 2026-02-24T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
