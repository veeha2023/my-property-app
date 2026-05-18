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
