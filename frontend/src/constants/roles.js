/**
 * src/constants/roles.js
 *
 * User roles and approval statuses, matching USER_ROLES and APPROVAL_STATUSES
 * in backend/app/models/choices.py (database-schema.md section 3).
 * Officials sign up and wait for an admin; admins are made only with
 * `python -m scripts.set_role <email> admin`.
 */

export const ROLES = {
  CITIZEN: 'citizen',
  OFFICIAL: 'official',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Citizen',
  [ROLES.OFFICIAL]: 'Official',
  [ROLES.ADMIN]: 'Admin',
};

// The Citizen / Official choice on the sign-in and sign-up pages. Admins
// choose Official; there is no admin option.
export const ACCOUNT_TYPES = {
  CITIZEN: 'citizen',
  OFFICIAL: 'official',
};

export const APPROVAL = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
};

// Where each role lands after login.
export const ROLE_PATHS = {
  [ROLES.CITIZEN]: '/citizen/dashboard',
  [ROLES.OFFICIAL]: '/official/dashboard',
  [ROLES.ADMIN]: '/admin',
};

// Pending and rejected officials can only see their application here.
export const PENDING_PATH = '/account/pending';

export function isAwaitingApproval(user) {
  return Boolean(user) && user.role === ROLES.OFFICIAL && user.approval_status !== APPROVAL.APPROVED;
}

/** The page this user should land on (after login, or when sent somewhere they can't use). */
export function homePathFor(user) {
  if (!user) return '/login';
  if (isAwaitingApproval(user)) return PENDING_PATH;
  return ROLE_PATHS[user.role] || '/login';
}
