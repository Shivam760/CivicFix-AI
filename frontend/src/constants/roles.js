/**
 * src/constants/roles.js
 * 
 * Defines standard user roles and access capabilities for CivicFix AI.
 * 
 * BACKEND INTEGRATION NOTE:
 * These roles mirror the backend RBAC permissions enforced by FastAPI.
 * The backend is the single source of truth; frontend route protection
 * improves user experience but the backend MUST validate permissions on every endpoint.
 */

export const ROLES = {
  CITIZEN: 'citizen',
  COMMITTEE: 'committee',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.CITIZEN]: 'Normal Citizen',
  [ROLES.COMMITTEE]: 'Committee Member / Officer',
  [ROLES.ADMIN]: 'System Administrator',
};

export const ROLE_PATHS = {
  [ROLES.CITIZEN]: '/citizen/dashboard',
  [ROLES.COMMITTEE]: '/committee/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
};
