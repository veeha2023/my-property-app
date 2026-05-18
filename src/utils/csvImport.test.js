import { parseCSV, parseDateFlexible, parseTimeFlexible, parseNumberFlexible } from './csvImport';

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

  test('trims whitespace even inside quoted fields (intentional app behavior)', () => {
    expect(parseCSV('a\n"  hello  "')).toEqual([['a'], ['hello']]);
  });
});

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
  test('incomplete written dates are kept raw, never invented', () => {
    expect(parseDateFlexible('March 2025')).toBe('March 2025');
    expect(parseDateFlexible('Jan 5')).toBe('Jan 5');
    expect(parseDateFlexible('Dec 25')).toBe('Dec 25');
  });
  test('3-digit year falls through to raw', () => {
    expect(parseDateFlexible('15 May 202')).toBe('15 May 202');
  });
});

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
  test('invalid time components are returned raw, never clamped/wrapped', () => {
    expect(parseTimeFlexible('24:00')).toBe('24:00');
    expect(parseTimeFlexible('25:30')).toBe('25:30');
    expect(parseTimeFlexible('9:60')).toBe('9:60');
    expect(parseTimeFlexible('12:99')).toBe('12:99');
    expect(parseTimeFlexible('13am')).toBe('13am');
    expect(parseTimeFlexible('0am')).toBe('0am');
  });
  test('undefined -> empty string', () => {
    expect(parseTimeFlexible(undefined)).toBe('');
  });
});

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
