// Shared CSV import + safe display helpers.
// Single source of truth for all four forms.

/**
 * Parse CSV text into rows of trimmed string cells.
 * Quote-aware: handles quoted commas, escaped "" quotes, CRLF, and newlines inside quoted fields.
 * @param {string} text @returns {string[][]}
 */
export const parseCSV = (text) => {
  const rows = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    currentLine += char;

    if (char === '"') {
      // NOTE: this naive toggle does not collapse escaped "" pairs; a "" immediately before an embedded newline inside a quoted field can mis-split the row. Acceptable: does not occur in this app's CSV templates. Preserved verbatim from PropertyForm.
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
  m = low.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{2}|\d{4})$/); // 15 may 2026
  if (m && MONTHS[m[2].slice(0, 3)]) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${MONTHS[m[2].slice(0, 3)]}-${m[1].padStart(2, '0')}`;
  }
  m = low.match(/^([a-z]{3,})\s+(\d{1,2})\s+(\d{2}|\d{4})$/); // may 15 2026
  if (m && MONTHS[m[1].slice(0, 3)]) {
    const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yr}-${MONTHS[m[1].slice(0, 3)]}-${m[2].padStart(2, '0')}`;
  }

  // 6. Unrecognized -> raw, untouched
  return s;
};

// Returns a normalized 24h HH:MM when parseable, otherwise the raw string.
export const parseTimeFlexible = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';

  let m = s.match(/^(\d{1,2}):(\d{2})$/); // 24h H:MM / HH:MM
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return s; // invalid -> raw
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }

  m = s.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/); // 12h
  if (m) {
    const rawH = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (rawH < 1 || rawH > 12 || min > 59) return s; // invalid -> raw
    let h = rawH % 12;
    if (m[3] === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
  }

  m = s.match(/^(\d{2})(\d{2})$/); // compact HHMM
  if (m && parseInt(m[1], 10) < 24 && parseInt(m[2], 10) < 60) {
    return `${m[1]}:${m[2]}`;
  }

  return s; // unrecognized -> raw
};

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
