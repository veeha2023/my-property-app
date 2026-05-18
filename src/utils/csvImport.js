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
