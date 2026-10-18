/**
 * src/services/authService.js
 * 
 * Authentication and session service for role-based dashboard authorization.
 * 
 * BACKEND INTEGRATION:
 * 1. Derives authenticated user identity and role from the server JWT payload / session.
 * 2. In production, roles are never trusted from client storage; FastAPI enforces RBAC.
 * 3. Provides clean helper functions for checking active role and switching test roles in development.
 */

import { authStorage } from './apiClient';
import { ROLES } from '../constants/roles';

const ROLE_PREVIEW_KEY = 'civicfix_active_preview_role';

const DEV_MOCK_USERS = import.meta.env.DEV
  ? {
      [ROLES.CITIZEN]: {
        id: 'usr-citizen-01',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        role: ROLES.CITIZEN,
        phone: '+91 98450 12345',
      },
      [ROLES.COMMITTEE]: {
        id: 'usr-committee-01',
        name: 'Er. Priya Sundaram',
        email: 'p.sundaram@bbmp.gov.in',
        role: ROLES.COMMITTEE,
        department: 'BBMP Road Infrastructure (East Zone)',
        badgeId: 'OFF-4029-BLR',
      },
      [ROLES.ADMIN]: {
        id: 'usr-admin-01',
        name: 'Rajesh Varma',
        email: 'admin.varma@civicfix.ai',
        role: ROLES.ADMIN,
        department: 'Central Municipal Platform Admin',
      },
    }
  : null;

/**
 * Gets the current authenticated user profile.
 * Falls back to active role preview profile in development/demo mode.
 */
export function getCurrentUser() {
  const storedUser = authStorage.getUser();
  if (storedUser && storedUser.role) {
    return storedUser;
  }

  // Check preview role
  if (import.meta.env.DEV && DEV_MOCK_USERS) {
    const previewRole = getActiveRole();
    return DEV_MOCK_USERS[previewRole] || DEV_MOCK_USERS[ROLES.CITIZEN];
  }

  return {
    id: 'usr-guest',
    name: 'Citizen',
    email: 'citizen@civicfix.ai',
    role: ROLES.CITIZEN,
  };
}

/**
 * Returns the active user role ('citizen' | 'committee' | 'admin').
 */
export function getActiveRole() {
  const storedUser = authStorage.getUser();
  if (storedUser && storedUser.role) {
    return storedUser.role;
  }

  // Developer / Demo role override
  const savedPreview = localStorage.getItem(ROLE_PREVIEW_KEY);
  if (savedPreview && Object.values(ROLES).includes(savedPreview)) {
    return savedPreview;
  }

  return ROLES.CITIZEN;
}

/**
 * Switch active role in development/demo preview mode.
 */
export function setActiveRolePreview(role) {
  if (!import.meta.env.DEV) {
    return;
  }
  if (Object.values(ROLES).includes(role)) {
    localStorage.setItem(ROLE_PREVIEW_KEY, role);
    const mockUser = DEV_MOCK_USERS?.[role] || DEV_MOCK_USERS?.[ROLES.CITIZEN];
    if (mockUser) {
      authStorage.setUser(mockUser);
    }
    if (!authStorage.getToken()) {
      authStorage.setToken('preview_dev_token');
    }
    window.dispatchEvent(new Event('civicfix_role_changed'));
  }
}

/**
 * Verifies if the active user possesses a specific role.
 */
export function hasRole(requiredRole) {
  return getActiveRole() === requiredRole;
}

/**
 * Sign out user and clear session state.
 */
export function signOutUser() {
  authStorage.clearSession();
  localStorage.removeItem(ROLE_PREVIEW_KEY);
}
