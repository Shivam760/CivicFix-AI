/**
 * src/constants/civicCategories.js
 * 
 * Standard civic categories recognized by CivicFix AI.
 * Mirrors `CivicCategory` enum in FastAPI `ai/schemas.py`.
 * 
 * BACKEND INTEGRATION NOTE:
 * Do not hardcode lists in UI components; import from here or fetch dynamically
 * from GET /api/v1/meta/categories if provided by backend.
 */

export const CIVIC_CATEGORIES = [
  {
    id: 'pothole',
    label: 'Road Damage & Potholes',
    description: 'Cratered pavement, asphalt erosion, dangerous sinkholes',
    iconName: 'AlertTriangle',
    color: 'emerald',
  },
  {
    id: 'garbage',
    label: 'Garbage & Solid Waste',
    description: 'Overflowing dumpsters, illegal dumping, uncollected municipal waste',
    iconName: 'Trash2',
    color: 'teal',
  },
  {
    id: 'street_lighting',
    label: 'Street Lighting',
    description: 'Dark streets, flickering fixtures, fallen lamp posts',
    iconName: 'Lightbulb',
    color: 'amber',
  },
  {
    id: 'water_leakage',
    label: 'Water Leakage & Main Burst',
    description: 'High-pressure pipeline bursts, drinking water wastage',
    iconName: 'Droplets',
    color: 'blue',
  },
  {
    id: 'drainage_sewage',
    label: 'Drainage & Sewage Overflow',
    description: 'Blocked stormwater drains, open sewer contamination',
    iconName: 'Waves',
    color: 'purple',
  },
  {
    id: 'road_hazard',
    label: 'Road Hazard & Obstruction',
    description: 'Fallen trees, dangerous debris, missing manhole covers',
    iconName: 'ShieldAlert',
    color: 'rose',
  },
  {
    id: 'other_civic',
    label: 'Other Civic Infrastructure',
    description: 'Public parks, footpaths, civic signage issues',
    iconName: 'HelpCircle',
    color: 'stone',
  },
];

export const CATEGORY_MAP = CIVIC_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat;
  return acc;
}, {});
