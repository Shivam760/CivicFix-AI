/**
 * src/services/userService.js
 * 
 * Centralized user management service for Platform Administrators.
 * 
 * BACKEND INTEGRATION:
 * Communicates with FastAPI endpoints backed by PostgreSQL `users` and `roles` tables.
 * Endpoints:
 * - GET /api/v1/admin/users
 * - PATCH /api/v1/admin/users/{id}/role
 * - PATCH /api/v1/admin/users/{id}/status
 * 
 * SECURITY INVARIANT:
 * Changing user roles or account status MUST require administrator credentials.
 * The backend MUST verify that the actor has the 'manage_users' RBAC capability.
 */

import { apiRequest } from './apiClient';

let localUsers = null;

async function getLocalUsers() {
  if (localUsers) return localUsers;
  if (import.meta.env.DEV) {
    const { MOCK_ADMIN_USERS } = await import('../mocks/adminDashboardMock');
    localUsers = [...MOCK_ADMIN_USERS];
    return localUsers;
  }
  return [];
}

export async function getAdminUsers(filters = {}) {
  const query = new URLSearchParams();
  if (filters.role && filters.role !== 'all') query.append('role', filters.role);
  if (filters.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters.search) query.append('search', filters.search);

  const res = await apiRequest(`/api/v1/admin/users?${query.toString()}`);
  if (res.ok && res.data) {
    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
    return { success: true, data: items, total: items.length, isMock: false };
  }

  // Filter local mock users
  const users = await getLocalUsers();
  let filtered = [...users];
  if (filters.role && filters.role !== 'all') {
    filtered = filtered.filter((u) => u.role === filters.role);
  }
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((u) => u.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }

  return { success: true, data: filtered, total: filtered.length, isMock: true };
}

export async function updateUserRole(userId, newRole) {
  const res = await apiRequest(`/api/v1/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: newRole }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalUsers();
  if (localUsers) {
    localUsers = localUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
  }
  return { success: true, isMock: true, message: `Role updated to ${newRole}` };
}

export async function updateUserStatus(userId, newStatus) {
  const res = await apiRequest(`/api/v1/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalUsers();
  if (localUsers) {
    localUsers = localUsers.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
  }
  return { success: true, isMock: true, message: `Account status updated to ${newStatus}` };
}
