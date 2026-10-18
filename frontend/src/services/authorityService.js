/**
 * src/services/authorityService.js
 * 
 * Municipal Authority Directory Service.
 * 
 * BACKEND INTEGRATION:
 * Communicates with FastAPI endpoints backed by the PostgreSQL `authorities` directory table.
 * Endpoints:
 * - GET /api/v1/admin/authorities
 * - POST /api/v1/admin/authorities
 * - PATCH /api/v1/admin/authorities/{id}/status
 * 
 * DESIGN RULE:
 * Never hardcode authority assignment in frontend business logic;
 * always query the backend directory service.
 */

import { apiRequest } from './apiClient';

let localAuthorities = null;

async function getLocalAuthorities() {
  if (localAuthorities) return localAuthorities;
  if (import.meta.env.DEV) {
    const { MOCK_ADMIN_AUTHORITIES } = await import('../mocks/adminDashboardMock');
    localAuthorities = [...MOCK_ADMIN_AUTHORITIES];
    return localAuthorities;
  }
  return [];
}

export async function getAuthorities(filters = {}) {
  const query = new URLSearchParams();
  if (filters.category && filters.category !== 'all') query.append('category', filters.category);
  if (filters.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters.search) query.append('search', filters.search);

  const res = await apiRequest(`/api/v1/admin/authorities?${query.toString()}`);
  if (res.ok && res.data) {
    const items = Array.isArray(res.data) ? res.data : res.data.items || [];
    return { success: true, data: items, total: items.length, isMock: false };
  }

  // Filter local authorities
  const authorities = await getLocalAuthorities();
  let filtered = [...authorities];
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter((a) => a.category === filters.category);
  }
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter((a) => a.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.jurisdictionZone.toLowerCase().includes(q)
    );
  }

  return { success: true, data: filtered, total: filtered.length, isMock: true };
}

export async function createAuthority(payload) {
  const res = await apiRequest('/api/v1/admin/authorities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalAuthorities();
  const newAuth = {
    id: `AUTH-${Date.now().toString(36).toUpperCase()}`,
    ...payload,
    isVerified: true,
    activeTickets: 0,
    status: 'active',
  };
  localAuthorities = [newAuth, ...(localAuthorities || [])];
  return { success: true, data: newAuth, isMock: true };
}

export async function toggleAuthorityStatus(authorityId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const res = await apiRequest(`/api/v1/admin/authorities/${authorityId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  });

  if (res.ok && res.data) {
    return { success: true, data: res.data, isMock: false };
  }

  await getLocalAuthorities();
  if (localAuthorities) {
    localAuthorities = localAuthorities.map((a) =>
      a.id === authorityId ? { ...a, status: newStatus } : a
    );
  }
  return { success: true, isMock: true, status: newStatus };
}
