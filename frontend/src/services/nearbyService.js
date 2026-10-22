/**
 * src/services/nearbyService.js
 *
 * Nearby issues (api-contract.md section 12): reports other residents shared,
 * within 2 km of the user's saved home. Citizens only; officials get 403.
 */

import { apiRequest, apiFetchObjectUrl } from './apiClient';

const n = (reportId) => `/nearby/${encodeURIComponent(reportId)}`;

// 409 HOME_LOCATION_REQUIRED when no home location is saved.
export function listNearby() {
  return apiRequest('/nearby');
}

export function fetchNearbyPhoto(reportId, evidenceId) {
  return apiFetchObjectUrl(`${n(reportId)}/photos/${encodeURIComponent(evidenceId)}/file`);
}

// "Me too": returns { support_count, my_support }.
export function addSupport(reportId) {
  return apiRequest(`${n(reportId)}/support`, { method: 'POST' });
}

export function removeSupport(reportId) {
  return apiRequest(`${n(reportId)}/support`, { method: 'DELETE' });
}

// "Already reported?" check while reporting: other people's shared, open
// reports within 200 m of the new pin. Items have can_support (Me too allowed).
export function listAround(latitude, longitude) {
  const params = new URLSearchParams({ latitude, longitude });
  return apiRequest(`/nearby/around?${params}`);
}
