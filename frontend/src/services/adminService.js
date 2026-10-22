/**
 * src/services/adminService.js
 *
 * Admins approve and reject official accounts (api-contract.md section 13).
 * The backend answers 403 ADMIN_ONLY to everyone else.
 */

import { apiRequest } from './apiClient';

// approvalStatus: 'pending' | 'approved' | 'rejected', or leave it out for all.
export function listOfficials(approvalStatus) {
  const query = approvalStatus ? `?approval_status=${encodeURIComponent(approvalStatus)}` : '';
  return apiRequest(`/admin/officials${query}`);
}

// The note is optional when approving (e.g. how the job was confirmed).
export function approveOfficial(userId, note = '') {
  const clean = note.trim();
  return apiRequest(`/admin/officials/${userId}/approve`, {
    method: 'POST',
    json: clean ? { note: clean } : {},
  });
}

// Rejecting needs a note, so the official knows why. It also removes the
// access of an official who was approved before.
export function rejectOfficial(userId, note) {
  return apiRequest(`/admin/officials/${userId}/reject`, {
    method: 'POST',
    json: { note: note.trim() },
  });
}
