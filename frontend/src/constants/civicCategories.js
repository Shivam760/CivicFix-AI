/**
 * src/constants/civicCategories.js
 *
 * Issue categories, matching ISSUE_CATEGORIES in backend/app/models/choices.py
 * (database-schema.md section 2 is the source of truth).
 * A report's category may also be null ("not set yet").
 */

export const CIVIC_CATEGORIES = [
  {
    id: 'road_damage',
    label: 'Road damage',
    description: 'Potholes, broken road surface, damaged footpaths',
  },
  {
    id: 'garbage',
    label: 'Garbage',
    description: 'Overflowing bins, uncollected waste, illegal dumping',
  },
  {
    id: 'streetlight',
    label: 'Streetlight',
    description: 'Lights that are off, flickering, or damaged',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Any other civic problem',
  },
];

export const CATEGORY_MAP = CIVIC_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat;
  return acc;
}, {});

export function categoryLabel(category) {
  if (!category) return 'Category not set';
  return CATEGORY_MAP[category]?.label || category;
}
