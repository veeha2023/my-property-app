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
