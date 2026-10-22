/**
 * src/services/verificationService.js
 *
 * Neighbour verification of claimed repairs (api-contract.md section 11).
 * Available to citizens only; officials get 403 VERIFICATION_FORBIDDEN.
 */

import { apiRequest, apiFetchObjectUrl } from './apiClient';

const v = (reportId) => `/verifications/${encodeURIComponent(reportId)}`;

// My own reports awaiting verification, plus nearby ones (home within 2 km).
export function listVerifications() {
  return apiRequest('/verifications');
}

export function getVerification(reportId) {
  return apiRequest(v(reportId));
}

// verdict: 'fixed' | 'still_broken'. One vote per round; it cannot be changed.
export function castVote(reportId, verdict) {
  return apiRequest(`${v(reportId)}/votes`, { method: 'POST', json: { verdict } });
}

export function fetchVerificationFile(reportId, evidenceId) {
  return apiFetchObjectUrl(`${v(reportId)}/evidence/${encodeURIComponent(evidenceId)}/file`);
}
