/**
 * src/constants/roles.js
 *
 * User roles, matching USER_ROLES in backend/app/models/choices.py.
 * Registration always creates a citizen; officials are made with
 * `python -m scripts.set_role <email> official` (there is no admin role).
 */

export const ROLES = {
  CITIZEN: 'citizen',
  OFFICIAL: 'official',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.OFFICIAL]: 'Official',
};

// Where each role lands after login.
export const ROLE_PATHS = {
  [ROLES.CITIZEN]: '/citizen/dashboard',
  [ROLES.OFFICIAL]: '/official/dashboard',
};
