# CSV Lenient Parsing — Design

**Date:** 2026-05-18
**Status:** Approved (pending implementation)

## Problem

CSV import is implemented separately in four forms — `ActivityForm`,
`PropertyForm`, `FlightForm`, `TransportationForm`. Behavior is inconsistent
and brittle:

- `ActivityForm` and `FlightForm` parse rows with a naive `line.split(',')`,
  so any quoted field containing a comma corrupts the row.
- `parseDateString()` only recognizes `YYYY-MM-DD` and `DD/MM/YYYY`. Any other
  date shape falls through to `new Date()`, and on failure the UI literally
  renders the text **"Invalid Date"** (and **"Invalid Time"** for times not in
  strict `HH:MM`).
- Numbers use `parseFloat(x) || 0`, so `"1,200"` becomes `1`, `"$1,200"`
  becomes `0`, etc.
- `parseDateString` / `formatDate` / `formatTime` are duplicated 4×; the
  quote-aware parser is duplicated 2×. Improvements drift out of sync.

Goal: imported values parse much better, and identically, in every section.
Unrecognized values are preserved and shown as-is instead of "Invalid Date".

## Hard Constraint: No Regressions

This is a refinement of working software, not a rewrite.

- Well-formed input must produce **byte-identical** display output to today
  (`15/05/2026` → `15 May 2026`; `09:00` → `9:00 AM`).
- Already-stored quote data (Supabase JSONB) must keep rendering correctly with
  no migration and no schema change.
- Per-field numeric defaults stay exactly as they are today (`|| 0`, `|| 1`,
  etc.) — only the parsing of the raw cell improves.
- No row is ever silently dropped because of a bad date/time/number.

## Architecture

### New module: `src/utils/csvImport.js`

Single source of truth for CSV parsing and date/time display. Pure functions,
no React, independently unit-testable.

| Export | Input → Output | Notes |
|---|---|---|
| `parseCSV(text)` | raw file text → `string[][]` | The existing quote-aware parser (quoted fields, embedded commas, escaped quotes, CRLF/LF, multiline). Replaces `split(',')` in Activity/Flight. |
| `parseDateFlexible(value)` | string → `YYYY-MM-DD` or original raw string | Tries, in order: `YYYY-MM-DD`, `YYYY/M/D`, `D/M/YYYY`, `D-M-YYYY`, `D.M.YYYY`, 2-digit-year variants, `D Mon YYYY`, `Mon D, YYYY`, `D Month YYYY` (month names + abbreviations, case-insensitive), then a final `Date.parse` attempt. Confident parse → normalized; otherwise → **raw string returned untouched**. Empty/null → `''` (unchanged from today). |
| `parseTimeFlexible(value)` | string → `HH:MM` (24h) or original raw string | Recognizes `HH:MM`, `H:MM`, `HHMM`, `9am`, `9 AM`, `9:30 pm`, `21:30`. Unrecognized (e.g. `morning`) → raw string. Empty/null → `''`. |
| `parseNumberFlexible(value, fallback)` | string, fallback → number | Strips currency symbols, surrounding whitespace, and thousands separators before `parseFloat`. `"1,200"`→1200, `"$1,200.50"`→1200.5, `"NZ$ 980"`→980. Empty / non-numeric (`"TBD"`) → `fallback`. Caller passes the same default it uses today (`0`, `1`, …). |
| `formatDateSafe(value)` | stored value → display string | If value resolves to a real date → pretty `Intl` format (identical to current `formatDate` output). If not → return the raw string verbatim. Replaces the "Invalid Date" path. |
| `formatTimeSafe(value)` | stored value → display string | Same idea; replaces the "Invalid Time" path. |

`formatDateSafe` / `formatTimeSafe` keep the existing `'N/A'` return for
empty values so card layouts don't change for blank fields.

### Consumers

All four forms:

1. Delete their local `parseDateString`, `formatDate`, `formatTime` and (where
   present) their local `parseCSV`.
2. Import the shared functions from `src/utils/csvImport.js`.
3. In `handleFileUpload`: build rows with `parseCSV`, then run each
   date/time/number cell through the matching flexible parser before writing
   to the object. All other field handling is unchanged.

### Date-dependent logic guards

- `FlightForm.calculateDuration(...)`: if either endpoint did not normalize to
  a real date/time, return `''` (current behavior already shows blank/`N/A`
  duration when data is missing) instead of producing `NaN`.
- Any sort-by-date comparators: rows whose date did not normalize sort to a
  stable position (treat as epoch/keep original relative order) rather than
  throwing or scattering randomly.

## Data Flow

```
CSV file
  → parseCSV(text)                      // string[][], comma-safe
  → per row: map header → cell
  → date cells   → parseDateFlexible    // YYYY-MM-DD or raw
  → time cells   → parseTimeFlexible    // HH:MM or raw
  → number cells → parseNumberFlexible  // number or field default
  → object pushed to form state (no row dropped)
  → render: formatDateSafe / formatTimeSafe
            (pretty for real values, raw text otherwise)
```

Storage is unchanged: normalized value when we could normalize, otherwise the
raw string — written into the same fields/JSONB as today.

## Known Trade-off (documented, out of scope)

Edit modals use native `<input type="date">` / `<input type="time">`, which
only accept strict `YYYY-MM-DD` / `HH:MM`. A value too freeform to normalize is
preserved and displays correctly on cards/summary, but that one field shows
empty in the native picker when editing. Making such fields fall back to a text
input is a possible later enhancement and is **not** in this scope.

## Testing

Unit tests for `src/utils/csvImport.js`:

- `parseCSV`: quoted field with comma, escaped quotes, CRLF vs LF, multiline
  quoted field, trailing newline.
- `parseDateFlexible`: one case per recognized family + a raw-fallback case +
  empty/null. Assert well-formed inputs match today's normalized output.
- `parseTimeFlexible`: `HH:MM`, `9am`, `9:30 pm`, `2100`, `morning` (raw),
  empty.
- `parseNumberFlexible`: `1,200`; `$1,200.50`; `NZ$ 980`; `TBD`→fallback;
  `""`→fallback; plain `42`.
- `formatDateSafe` / `formatTimeSafe`: real value → unchanged pretty output;
  raw value → echoed verbatim; empty → `N/A`.

Regression check: import one clean, well-formed CSV per form and confirm output
is identical to current behavior; then a deliberately messy CSV and confirm no
row is dropped and raw values appear instead of "Invalid Date".
