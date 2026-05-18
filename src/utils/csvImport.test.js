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

  test('trims whitespace even inside quoted fields (intentional app behavior)', () => {
    expect(parseCSV('a\n"  hello  "')).toEqual([['a'], ['hello']]);
  });
});

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
