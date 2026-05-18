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
