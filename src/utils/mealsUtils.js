// src/utils/mealsUtils.js — Meals included with a property (breakfast / lunch / dinner flags)

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

// "Breakfast included", "Breakfast & dinner included", "Breakfast, lunch & dinner included"; null when none
export const mealsLabel = (property = {}) => {
  const names = MEALS.filter(m => property[m.key]).map(m => m.label.toLowerCase());
  if (names.length === 0) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} included`;
};
