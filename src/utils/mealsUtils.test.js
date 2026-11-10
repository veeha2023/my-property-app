import { mealsLabel } from './mealsUtils';

describe('mealsLabel', () => {
  test('null when no meals', () => {
    expect(mealsLabel({})).toBeNull();
    expect(mealsLabel()).toBeNull();
  });

  test('single meal', () => {
    expect(mealsLabel({ breakfast: true })).toBe('Breakfast included');
    expect(mealsLabel({ dinner: true })).toBe('Dinner included');
  });

  test('two meals joined with &', () => {
    expect(mealsLabel({ breakfast: true, dinner: true })).toBe('Breakfast & dinner included');
    expect(mealsLabel({ lunch: true, dinner: true })).toBe('Lunch & dinner included');
  });

  test('all three meals', () => {
    expect(mealsLabel({ breakfast: true, lunch: true, dinner: true })).toBe('Breakfast, lunch & dinner included');
  });
});
