# CSV Lenient Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CSV import parse dates, times, and numbers leniently and identically across all four forms, preserving raw values instead of showing "Invalid Date", with zero regressions for well-formed data.

**Architecture:** One shared module `src/utils/csvImport.js` holds the quote-aware CSV parser, flexible date/time/number parsers, and safe display formatters. All four forms (`ActivityForm`, `FlightForm`, `PropertyForm`, `TransportationForm`) delete their duplicated helpers and import the shared ones. Well-formed input produces byte-identical output to today; unrecognized values are normalized when possible, else echoed verbatim.

**Tech Stack:** React (CRA / react-scripts), Jest + @testing-library (`react-scripts test`), plain ES modules. No new dependencies. No DB/schema changes.

**Spec:** `docs/superpowers/specs/2026-05-18-csv-lenient-parsing-design.md`

**Test command (used throughout):**
`CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`

**Regression gate command:** `CI=true npm run build` (CRA fails the build on ESLint errors when `CI=true`).

---

## File Structure

- Create: `src/utils/csvImport.js` — all parsing/formatting (one responsibility: CSV-to-data + safe display).
- Create: `src/utils/csvImport.test.js` — unit tests.
- Modify: `src/components/ActivityForm.jsx` — use shared module; replace naive `split(',')`.
- Modify: `src/components/FlightForm.jsx` — use shared module; replace naive `split(',')`; guard `calculateDuration`.
- Modify: `src/components/PropertyForm.jsx` — use shared module; delete local `parseCSV`.
- Modify: `src/components/TransportationForm.jsx` — use shared module; delete local `parseCSV`; guard sort.

---

## Task 1: Create shared module with quote-aware `parseCSV`

**Files:**
- Create: `src/utils/csvImport.js`
- Test: `src/utils/csvImport.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/csvImport.test.js`:

```js
import { parseCSV } from './csvImport';

describe('parseCSV', () => {
  test('splits simple rows and cells, trims values', () => {
    expect(parseCSV('a,b,c\n1, 2 ,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  test('keeps commas inside quoted fields', () => {
    expect(parseCSV('name,note\n"Smith, J","hi, there"')).toEqual([
      ['name', 'note'],
      ['Smith, J', 'hi, there'],
    ]);
  });

  test('handles escaped double quotes', () => {
    expect(parseCSV('q\n"say ""hi"""')).toEqual([['q'], ['say "hi"']]);
  });

  test('handles CRLF and a trailing newline', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  test('supports a newline inside a quoted field', () => {
    expect(parseCSV('a,b\n"line1\nline2",x')).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'x'],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: FAIL — `Cannot find module './csvImport'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/csvImport.js` (this is the existing proven parser from `PropertyForm.jsx`, lifted verbatim and exported):

```js
// Shared CSV import + safe display helpers.
// Single source of truth for all four forms.

export const parseCSV = (text) => {
  const rows = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentLine += char;

    if (char === '"') {
      inQuotes = !inQuotes;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim()) {
        rows.push(currentLine.trim());
      }
      currentLine = '';
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // Skip the \n in a \r\n sequence
      }
    }
  }

  if (currentLine.trim()) {
    rows.push(currentLine.trim());
  }

  const parseLine = (line) => {
    const values = [];
    let currentVal = '';
    let inLineQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inLineQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inLineQuotes = !inLineQuotes;
        }
      } else if (char === ',' && !inLineQuotes) {
        values.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal);
    return values.map((v) => v.trim());
  };

  return rows.map(parseLine);
};
```

> Note: the multiline-quoted-field test relies on `currentLine` accumulation with `inQuotes` — the lifted parser already handles this because the newline is appended while `inQuotes` is true.

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (5 passing).

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvImport.js src/utils/csvImport.test.js
git commit -m "feat: shared quote-aware CSV parser"
```

---

## Task 2: `parseDateFlexible`

**Files:**
- Modify: `src/utils/csvImport.js`
- Test: `src/utils/csvImport.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/csvImport.test.js`:

```js
import { parseDateFlexible } from './csvImport';

describe('parseDateFlexible', () => {
  test('passes through ISO YYYY-MM-DD unchanged (legacy parity)', () => {
    expect(parseDateFlexible('2026-05-18')).toBe('2026-05-18');
  });
  test('day-first D/M/YYYY -> ISO (legacy parity)', () => {
    expect(parseDateFlexible('5/3/2026')).toBe('2026-03-05');
  });
  test('day-first with - or . separators', () => {
    expect(parseDateFlexible('05-03-2026')).toBe('2026-03-05');
    expect(parseDateFlexible('5.3.2026')).toBe('2026-03-05');
  });
  test('2-digit year becomes 20YY', () => {
    expect(parseDateFlexible('5/3/26')).toBe('2026-03-05');
  });
  test('YYYY/M/D form', () => {
    expect(parseDateFlexible('2026/5/1')).toBe('2026-05-01');
  });
  test('"15 May 2026" and "May 15, 2026"', () => {
    expect(parseDateFlexible('15 May 2026')).toBe('2026-05-15');
    expect(parseDateFlexible('May 15, 2026')).toBe('2026-05-15');
  });
  test('unrecognized text is returned raw, untouched', () => {
    expect(parseDateFlexible('sometime in spring')).toBe('sometime in spring');
  });
  test('empty / null -> empty string (legacy parity)', () => {
    expect(parseDateFlexible('')).toBe('');
    expect(parseDateFlexible(null)).toBe('');
    expect(parseDateFlexible(undefined)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: FAIL — `parseDateFlexible is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/utils/csvImport.js`:

```js
const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Returns a normalized YYYY-MM-DD when confidently parseable,
// otherwise the original trimmed string (so the UI can show it as-is).
export const parseDateFlexible = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';

  // 1. ISO YYYY-MM-DD — identical to legacy parseDateString
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // 2. Day-first D/M/YYYY with / - or . — identical to legacy DD/MM/YYYY
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  // 3. Day-first with 2-digit year -> 20YY
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/);
  if (m) return `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  // 4. YYYY/M/D
  m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

  // 5. Month-name forms
  const low = s.toLowerCase().replace(/,/g, '');
  m = low.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{2,4})$/); // 15 may 2026
  if (m && MONTHS[m[2].slice(0, 3)]) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${MONTHS[m[2].slice(0, 3)]}-${m[1].padStart(2, '0')}`;
  }
  m = low.match(/^([a-z]{3,})\s+(\d{1,2})\s+(\d{2,4})$/); // may 15 2026
  if (m && MONTHS[m[1].slice(0, 3)]) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${MONTHS[m[1].slice(0, 3)]}-${m[2].padStart(2, '0')}`;
  }

  // 6. Last resort: only attempt Date.parse on text that contains letters
  //    (a written date), never on bare numbers — keeps output predictable.
  if (/[a-z]/i.test(s)) {
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
  }

  // 7. Unrecognized -> raw, untouched
  return s;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (all `parseDateFlexible` tests green; Task 1 tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvImport.js src/utils/csvImport.test.js
git commit -m "feat: parseDateFlexible with raw fallback"
```

---

## Task 3: `parseTimeFlexible`

**Files:**
- Modify: `src/utils/csvImport.js`
- Test: `src/utils/csvImport.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/csvImport.test.js`:

```js
import { parseTimeFlexible } from './csvImport';

describe('parseTimeFlexible', () => {
  test('24h H:MM / HH:MM normalized, padded', () => {
    expect(parseTimeFlexible('9:00')).toBe('09:00');
    expect(parseTimeFlexible('21:30')).toBe('21:30');
  });
  test('12h am/pm forms', () => {
    expect(parseTimeFlexible('9am')).toBe('09:00');
    expect(parseTimeFlexible('9 AM')).toBe('09:00');
    expect(parseTimeFlexible('9:30 pm')).toBe('21:30');
    expect(parseTimeFlexible('12am')).toBe('00:00');
    expect(parseTimeFlexible('12pm')).toBe('12:00');
  });
  test('HHMM compact form', () => {
    expect(parseTimeFlexible('0900')).toBe('09:00');
    expect(parseTimeFlexible('2130')).toBe('21:30');
  });
  test('unrecognized text returned raw', () => {
    expect(parseTimeFlexible('morning')).toBe('morning');
  });
  test('empty / null -> empty string', () => {
    expect(parseTimeFlexible('')).toBe('');
    expect(parseTimeFlexible(null)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: FAIL — `parseTimeFlexible is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/utils/csvImport.js`:

```js
// Returns a normalized 24h HH:MM when parseable, otherwise the raw string.
export const parseTimeFlexible = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';

  let m = s.match(/^(\d{1,2}):(\d{2})$/); // 24h H:MM / HH:MM
  if (m) {
    const h = Math.min(23, parseInt(m[1], 10));
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }

  m = s.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/); // 12h
  if (m) {
    let h = parseInt(m[1], 10) % 12;
    if (m[3] === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
  }

  m = s.match(/^(\d{2})(\d{2})$/); // compact HHMM
  if (m && parseInt(m[1], 10) < 24 && parseInt(m[2], 10) < 60) {
    return `${m[1]}:${m[2]}`;
  }

  return s; // unrecognized -> raw
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvImport.js src/utils/csvImport.test.js
git commit -m "feat: parseTimeFlexible with raw fallback"
```

---

## Task 4: `parseNumberFlexible`

**Files:**
- Modify: `src/utils/csvImport.js`
- Test: `src/utils/csvImport.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/csvImport.test.js`:

```js
import { parseNumberFlexible } from './csvImport';

describe('parseNumberFlexible', () => {
  test('plain numbers (legacy parity)', () => {
    expect(parseNumberFlexible('42', 0)).toBe(42);
    expect(parseNumberFlexible('0', 0)).toBe(0);
    expect(parseNumberFlexible('-350', 0)).toBe(-350);
  });
  test('thousands separators stripped', () => {
    expect(parseNumberFlexible('1,200', 0)).toBe(1200);
  });
  test('currency symbols stripped', () => {
    expect(parseNumberFlexible('$1,200.50', 0)).toBe(1200.5);
    expect(parseNumberFlexible('NZ$ 980', 0)).toBe(980);
  });
  test('non-numeric / empty returns the provided fallback', () => {
    expect(parseNumberFlexible('TBD', 0)).toBe(0);
    expect(parseNumberFlexible('', 1)).toBe(1);
    expect(parseNumberFlexible(null, 1)).toBe(1);
  });
  test('already a number passes through', () => {
    expect(parseNumberFlexible(7, 0)).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: FAIL — `parseNumberFlexible is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/utils/csvImport.js`:

```js
// Strips currency symbols/spaces and thousands separators, then parses.
// Falls back to `fallback` for empty/non-numeric input.
export const parseNumberFlexible = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  const cleaned = s.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? fallback : n;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvImport.js src/utils/csvImport.test.js
git commit -m "feat: parseNumberFlexible (currency/thousands tolerant)"
```

---

## Task 5: `formatDateSafe` and `formatTimeSafe`

**Files:**
- Modify: `src/utils/csvImport.js`
- Test: `src/utils/csvImport.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/utils/csvImport.test.js`:

```js
import { formatDateSafe, formatTimeSafe } from './csvImport';

describe('formatDateSafe', () => {
  test('formats a real date exactly like the legacy formatDate', () => {
    // legacy: Intl en-GB { day:'numeric', month:'short', year:'numeric' }
    expect(formatDateSafe('2026-05-18')).toBe('18 May 2026');
    expect(formatDateSafe('5/3/2026')).toBe('5 Mar 2026');
  });
  test('echoes raw text instead of "Invalid Date"', () => {
    expect(formatDateSafe('sometime in spring')).toBe('sometime in spring');
  });
  test('empty -> N/A (legacy parity)', () => {
    expect(formatDateSafe('')).toBe('N/A');
    expect(formatDateSafe(null)).toBe('N/A');
  });
});

describe('formatTimeSafe', () => {
  test('formats real time exactly like the legacy formatTime', () => {
    // legacy: Intl en-US { hour:'numeric', minute:'numeric', hour12:true }
    expect(formatTimeSafe('09:00')).toBe('9:00 AM');
    expect(formatTimeSafe('21:30')).toBe('9:30 PM');
    expect(formatTimeSafe('9am')).toBe('9:00 AM');
  });
  test('echoes raw text instead of "Invalid Time"', () => {
    expect(formatTimeSafe('morning')).toBe('morning');
  });
  test('empty -> N/A (legacy parity)', () => {
    expect(formatTimeSafe('')).toBe('N/A');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: FAIL — `formatDateSafe is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/utils/csvImport.js`:

```js
// Pretty-prints a real date (identical output to the legacy formatDate);
// for anything that can't be normalized, returns the raw value as-is.
export const formatDateSafe = (value) => {
  if (!value) return 'N/A';
  const norm = parseDateFlexible(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    const d = new Date(norm + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      }).format(d);
    }
  }
  return String(value);
};

// Pretty-prints a real time (identical output to the legacy formatTime);
// for anything that can't be normalized, returns the raw value as-is.
export const formatTimeSafe = (value) => {
  if (!value) return 'N/A';
  const norm = parseTimeFlexible(value);
  const m = norm.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const d = new Date();
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10));
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: 'numeric', hour12: true,
    }).format(d);
  }
  return String(value);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (all green — full module covered).

- [ ] **Step 5: Commit**

```bash
git add src/utils/csvImport.js src/utils/csvImport.test.js
git commit -m "feat: formatDateSafe/formatTimeSafe (raw fallback, legacy-identical for valid)"
```

---

## Task 6: Wire `ActivityForm.jsx` to the shared module

**Files:**
- Modify: `src/components/ActivityForm.jsx` (import line 4; helpers 33–71; `handleFileUpload` 254–378; sort uses at 118–119, 131–134, 684)

- [ ] **Step 1: Add the import**

After line 4 (`import { applyDiscount, hasDiscount } from '../utils/discountUtils';`) add:

```js
import {
  parseCSV,
  parseDateFlexible,
  parseTimeFlexible,
  parseNumberFlexible,
  formatDateSafe,
  formatTimeSafe,
} from '../utils/csvImport';
```

- [ ] **Step 2: Delete the local duplicated helpers**

Delete the entire `parseDateString` (lines 33–50), `formatDate` (52–61), and `formatTime` (63–71) function definitions. Do not delete anything else in that range.

- [ ] **Step 3: Repoint references to the shared functions**

In this file replace every remaining call:
- `parseDateString(` → `parseDateFlexible(`
- `formatDate(` → `formatDateSafe(`
- `formatTime(` → `formatTimeSafe(`

(Affected sites include the sort/nights uses at ~118–119, ~131–134, ~684 and any JSX render of `formatDate`/`formatTime`.)

- [ ] **Step 4: Replace the naive split parser in `handleFileUpload`**

In `handleFileUpload`, replace lines 261–289 (from `const text = e.target.result;` through the `headers.forEach(...)` row builder) with the shared parser while keeping the existing missing-header check and `{ raw, index }` shape:

```js
const text = e.target.result;
const allRows = parseCSV(text).filter(
  (r) => r.some((c) => c !== '') && !String(r[0]).startsWith('#')
);
if (allRows.length < 2) {
  setError('CSV file must contain a header row and at least one data row.');
  return;
}
const headers = allRows[0];

const coreHeaders = ['name', 'location', 'duration', 'pax', 'cost_per_pax', 'currency', 'images'];
const missingHeaders = coreHeaders.filter((h) => !headers.includes(h));
if (missingHeaders.length > 0) {
  setError(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
  return;
}

const parsedRows = allRows.slice(1).map((cells, index) => {
  const activity = {};
  headers.forEach((header, i) => {
    activity[header] = cells[i] !== undefined ? cells[i] : '';
  });
  if (!activity.name || !activity.location) return null;
  return { raw: activity, index };
}).filter(Boolean);
```

- [ ] **Step 5: Make number/date reads lenient in `handleFileUpload`**

Within `handleFileUpload` only, replace the import-time field parsers:
- `parseFloat(raw.duration) || 0` → `parseNumberFlexible(raw.duration, 0)` (both the update branch ~311 and new branch ~350)
- `parseInt(raw.pax, 10) || 1` → `parseNumberFlexible(raw.pax, 1)` (~312, ~330)
- `parseFloat(raw.cost_per_pax) || 0` → `parseNumberFlexible(raw.cost_per_pax, 0)` (~313, ~331)
- `parseFloat(raw.flat_price) || 0` → `parseNumberFlexible(raw.flat_price, 0)` (~314, ~332)
- `parseFloat(raw.discount_value) || 0` → `parseNumberFlexible(raw.discount_value, 0)` (~322, ~342)
- `parseDateString(raw.date)` → `parseDateFlexible(raw.date)` (~316) and `raw.date ? parseDateString(raw.date) : ''` → `raw.date ? parseDateFlexible(raw.date) : ''` (~347)
- `existing.time = raw.time;` → `existing.time = parseTimeFlexible(raw.time);` (~317) and `time: raw.time || ''` → `time: parseTimeFlexible(raw.time)` (~348)

Leave the recalculation lines that read back from `existing.*` (e.g. ~324) untouched — those operate on already-normalized numbers.

- [ ] **Step 6: Guard date-based sort against raw (non-date) values**

At ~118–119 and ~131–134 the code does `new Date(parseDateFlexible(x) + 'T' + ...)`. Wrap the resulting time with a NaN guard so a raw value sorts stably instead of corrupting order. Replace the two comparator lines (~118–119):

```js
const tA = new Date(parseDateFlexible(a.date) + 'T' + (a.time || '00:00')).getTime();
const tB = new Date(parseDateFlexible(b.date) + 'T' + (b.time || '00:00')).getTime();
const dateA = Number.isNaN(tA) ? Infinity : tA;
const dateB = Number.isNaN(tB) ? Infinity : tB;
```

and use `dateA`/`dateB` in the existing subtraction. For the `sortDate` uses (~131–134), after constructing `sortDate`, add: `if (Number.isNaN(sortDate.getTime())) sortDate = new Date(8640000000000000);` (sorts unparseable legs last, deterministically).

- [ ] **Step 7: Run the module tests + build**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS (unchanged).
Run: `CI=true npm run build`
Expected: build succeeds, no ESLint errors (no unused `parseCSV`/imports, no undefined `parseDateString`/`formatDate`/`formatTime`).

- [ ] **Step 8: Commit**

```bash
git add src/components/ActivityForm.jsx
git commit -m "refactor: ActivityForm uses shared lenient CSV import"
```

---

## Task 7: Wire `FlightForm.jsx` to the shared module

**Files:**
- Modify: `src/components/FlightForm.jsx` (import line 4; helpers 31–64; `calculateDuration` 66–85; `handleFileUpload` 177–242)

- [ ] **Step 1: Add the import**

After line 4 (`import { getCurrencyOptions } from '../utils/currencyUtils';`) add:

```js
import {
  parseCSV,
  parseDateFlexible,
  parseTimeFlexible,
  parseNumberFlexible,
  formatDateSafe,
  formatTimeSafe,
} from '../utils/csvImport';
```

- [ ] **Step 2: Delete local helpers and repoint references**

Delete the local `parseDateString` (31–44), `formatDate` (46–~55), `formatTime` (56–64) definitions. Then replace remaining calls in the file: `parseDateString(` → `parseDateFlexible(`, `formatDate(` → `formatDateSafe(`, `formatTime(` → `formatTimeSafe(`.

- [ ] **Step 3: Guard `calculateDuration`**

In `calculateDuration` (66–85), at the top of the function body, after it reads its date/time inputs, add an early return when the inputs are not real dates:

```js
const dep = new Date(`${parseDateFlexible(departureDate)}T${parseTimeFlexible(departureTime) || '00:00'}`);
const arr = new Date(`${parseDateFlexible(arrivalDate)}T${parseTimeFlexible(arrivalTime) || '00:00'}`);
if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) return '';
```

Adapt the existing variable names in `calculateDuration` to match the function's actual parameters/locals; keep the rest of its math unchanged. The contract: unparseable in → `''` out (same as today's "no duration" display).

- [ ] **Step 4: Replace the naive split parser in `handleFileUpload`**

Replace lines 184–205 (from `const text = e.target.result;` through the `headers.forEach(...)` builder) with:

```js
const text = e.target.result;
const allRows = parseCSV(text).filter((r) => r.some((c) => c !== ''));
if (allRows.length < 2) {
  setError('CSV file must contain a header row and at least one data row.');
  return;
}
const headers = allRows[0];
const requiredHeaders = ['flightType', 'airline', 'airlineLogoUrl', 'flightNumber', 'from', 'to', 'departureDate', 'departureTime', 'arrivalDate', 'arrivalTime', 'price', 'currency', 'baggage_checkInKgs', 'baggage_checkInPieces', 'baggage_cabinKgs', 'baggage_cabinPieces'];
if (!requiredHeaders.every((h) => headers.includes(h))) {
  setError(`CSV must include the following headers: ${requiredHeaders.join(', ')}`);
  return;
}

const newFlightsFromCSV = allRows.slice(1).map((cells, index) => {
  const flight = {};
  headers.forEach((header, i) => {
    flight[header] = cells[i] !== undefined ? cells[i] : '';
  });
```

(Keep the existing object literal that follows — the `return { id: ..., flightType: ... }` block — and its closing `.filter(Boolean);`. Note the row-builder no longer drops short rows; missing trailing cells become `''`, which is the desired lenient behavior.)

- [ ] **Step 5: Make number/date/time reads lenient in the object literal**

In the returned flight object (≈207–230):
- `parseDateString(flight.departureDate)` → `parseDateFlexible(flight.departureDate)`
- `parseDateString(flight.arrivalDate)` → `parseDateFlexible(flight.arrivalDate)`
- `departureTime: flight.departureTime` → `departureTime: parseTimeFlexible(flight.departureTime)`
- `arrivalTime: flight.arrivalTime` → `arrivalTime: parseTimeFlexible(flight.arrivalTime)`
- `parseFloat(flight.price) || 0` → `parseNumberFlexible(flight.price, 0)`
- `parseInt(flight.baggage_checkInKgs, 10) || 0` → `parseNumberFlexible(flight.baggage_checkInKgs, 0)` (and the same pattern for `baggage_checkInPieces`, `baggage_cabinKgs`, `baggage_cabinPieces`)

- [ ] **Step 6: Run the module tests + build**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS.
Run: `CI=true npm run build`
Expected: build succeeds, no ESLint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/FlightForm.jsx
git commit -m "refactor: FlightForm uses shared lenient CSV import"
```

---

## Task 8: Wire `PropertyForm.jsx` to the shared module

**Files:**
- Modify: `src/components/PropertyForm.jsx` (import line 23; `parseDateString` 89–102; local `parseCSV` 104–157; `handleFileUpload` 159–251; `formatDate` ~524)

- [ ] **Step 1: Add the import**

After line 23 (`import { getCurrencyOptions } from '../utils/currencyUtils';`) add:

```js
import {
  parseCSV,
  parseDateFlexible,
  parseNumberFlexible,
  formatDateSafe,
} from '../utils/csvImport';
```

(PropertyForm has no time field and no local `formatTime`; only import what it uses.)

- [ ] **Step 2: Delete the local `parseDateString` and local `parseCSV`**

Delete `parseDateString` (89–102) and the entire local `parseCSV` definition (104–157). Delete the local `formatDate` definition (~524) as well.

- [ ] **Step 3: Repoint references**

Replace in this file: `parseDateString(` → `parseDateFlexible(`, `formatDate(` → `formatDateSafe(`. The now-shared `parseCSV` call in `handleFileUpload` keeps the same name and signature (`parseCSV(text)` → `string[][]`), so the existing call site at ~169 needs no change.

- [ ] **Step 4: Make number/date reads lenient in `handleFileUpload`**

In `handleFileUpload` (≈208–216):
- `parseDateString(propertyData.checkIn)` → `parseDateFlexible(propertyData.checkIn)`
- `parseDateString(propertyData.checkOut)` → `parseDateFlexible(propertyData.checkOut)`
- `parseFloat(propertyData.price) || 0` → `parseNumberFlexible(propertyData.price, 0)`
- `parseInt(propertyData.bedrooms, 10) || 0` → `parseNumberFlexible(propertyData.bedrooms, 0)`
- `parseFloat(propertyData.bathrooms) || 0` → `parseNumberFlexible(propertyData.bathrooms, 0)`
- `parseInt(propertyData.homeImageIndex, 10) || 0` → `parseNumberFlexible(propertyData.homeImageIndex, 0)`

Leave the non-import `parseFloat`/`parseInt` at ~343–344 and the `parseFloat(cleanedString)` at ~423 unchanged (not CSV-import paths).

- [ ] **Step 5: Run the module tests + build**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS.
Run: `CI=true npm run build`
Expected: build succeeds, no ESLint errors (no unused imports, no undefined `parseCSV`/`parseDateString`/`formatDate`).

- [ ] **Step 6: Commit**

```bash
git add src/components/PropertyForm.jsx
git commit -m "refactor: PropertyForm uses shared lenient CSV import"
```

---

## Task 9: Wire `TransportationForm.jsx` to the shared module

**Files:**
- Modify: `src/components/TransportationForm.jsx` (import line 4; helpers 34–65; sort 103–116; local `parseCSV` 220–273; `handleFileUpload` 275–414)

- [ ] **Step 1: Add the import**

After line 4 (`import { getCurrencyOptions } from '../utils/currencyUtils';`) add:

```js
import {
  parseCSV,
  parseDateFlexible,
  parseTimeFlexible,
  parseNumberFlexible,
  formatDateSafe,
  formatTimeSafe,
} from '../utils/csvImport';
```

- [ ] **Step 2: Delete local helpers and local `parseCSV`**

Delete local `parseDateString` (34–45), `formatDate` (47–~55), `formatTime` (57–65), and the entire local `parseCSV` (220–273).

- [ ] **Step 3: Repoint references**

Replace in this file: `parseDateString(` → `parseDateFlexible(`, `formatDate(` → `formatDateSafe(`, `formatTime(` → `formatTimeSafe(`. The shared `parseCSV(text)` keeps the same name/signature so the call site in `handleFileUpload` needs no change.

- [ ] **Step 4: Guard the date sort (103–116)**

The comparator builds `new Date(\`${parseDateFlexible(getDate(x))}T${getTime(x)}\`)`. Replace lines 103–104 with a NaN-safe version:

```js
const rawA = new Date(`${parseDateFlexible(getDate(a))}T${getTime(a) || '00:00'}`).getTime();
const rawB = new Date(`${parseDateFlexible(getDate(b))}T${getTime(b) || '00:00'}`).getTime();
const dateTimeA = Number.isNaN(rawA) ? Infinity : rawA;
const dateTimeB = Number.isNaN(rawB) ? Infinity : rawB;
```

and use `dateTimeA`/`dateTimeB` in the existing comparison. For `sortDate` at ~116, after constructing it add: `if (Number.isNaN(sortDate.getTime())) sortDate = new Date(8640000000000000);`.

- [ ] **Step 5: Make number/date/time reads lenient in `handleFileUpload`**

Within `handleFileUpload` (≈323–380):
- `parseFloat(transportData.price) || 0` → `parseNumberFlexible(transportData.price, 0)` (~323)
- `parseFloat(transportData.excessAmount) || 0` → `parseNumberFlexible(transportData.excessAmount, 0)` (~343)
- `parseInt(transportData.driversIncluded, 10) || 1` → `parseNumberFlexible(transportData.driversIncluded, 1)` (~344)
- every `parseDateString(transportData.<field> || '')` → `parseDateFlexible(transportData.<field> || '')` (pickupDate ~337/~380, dropoffDate ~340, boardingDate ~351/~364, departingDate ~354/~367)
- for each corresponding time field written from `transportData.*Time`, wrap with `parseTimeFlexible(...)` (e.g. `pickupTime: transportData.pickupTime` → `pickupTime: parseTimeFlexible(transportData.pickupTime)`); apply to dropoff/boarding/departing time fields the same way

Leave the non-import `parseFloat`/`parseInt` at ~170–173 and ~648 unchanged.

- [ ] **Step 6: Run the module tests + build**

Run: `CI=true npx react-scripts test --watchAll=false src/utils/csvImport.test.js`
Expected: PASS.
Run: `CI=true npm run build`
Expected: build succeeds, no ESLint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/TransportationForm.jsx
git commit -m "refactor: TransportationForm uses shared lenient CSV import"
```

---

## Task 10: Full regression verification

**Files:** none modified — verification only.

- [ ] **Step 1: Full test suite**

Run: `CI=true npx react-scripts test --watchAll=false`
Expected: PASS, including the pre-existing `src/App.test.js`.

- [ ] **Step 2: Production build / lint gate**

Run: `CI=true npm run build`
Expected: "Compiled successfully" — no ESLint errors or warnings-as-errors. Confirms no dangling references to deleted `parseDateString`/`parseCSV`/`formatDate`/`formatTime` and no unused imports in any of the four forms.

- [ ] **Step 3: Manual smoke (well-formed = no regression)**

Run `npm start`. In each of Activities, Properties, Flights, Transportation: import a clean CSV (use each form's existing "download template" output as the input). Confirm dates render exactly as before (e.g. `5 Dec 2025`), times as before (e.g. `2:30 PM`), prices/numbers correct, rows created/updated as before.

- [ ] **Step 4: Manual smoke (messy = lenient, no crash)**

Import a CSV containing: a date like `15 May 2026`, a date like `next week`, a time like `9am`, a time like `morning`, a price like `$1,200`, a price like `TBD`, and a field with an embedded comma in quotes. Confirm: no row is dropped, normalized values display formatted, unrecognized values display as the raw text (never "Invalid Date"/"Invalid Time"), the embedded-comma field stays intact, and the app does not crash when sorting/editing those rows.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test: CSV lenient parsing regression verification"
```

(If Steps 1–4 pass with no changes, skip this commit.)

---

## Self-Review Notes

- **Spec coverage:** shared module (Tasks 1–5) ✓; all four forms wired (Tasks 6–9) ✓; naive `split(',')` removed from Activity/Flight (Tasks 6, 7) ✓; "Invalid Date"/"Invalid Time" eliminated via `formatDateSafe`/`formatTimeSafe` (Task 5) ✓; lenient numbers (Tasks 4, 6–9) ✓; date-logic guards for `calculateDuration` and sorts (Tasks 6, 7, 9) ✓; no-regression verified (Task 10) ✓; documented native-date-input trade-off requires no code (spec) ✓.
- **Type/name consistency:** module exports `parseCSV`, `parseDateFlexible`, `parseTimeFlexible`, `parseNumberFlexible`, `formatDateSafe`, `formatTimeSafe` — used with these exact names in Tasks 6–9. `parseCSV` returns `string[][]`, consumed as arrays in every wiring task.
- **No DB/schema change**, no new dependency, defaults preserved per field — matches the spec's no-regression constraint.
