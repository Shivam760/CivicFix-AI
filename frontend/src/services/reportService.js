/**
 * src/services/reportService.js
 *
 * Reports, drafts, AI analysis, approval, submission, events and evidence
 * (api-contract.md sections 4-10). Each function returns what apiRequest
 * returns: { ok: true, data } or { ok: false, error }.
 */

import { apiRequest, apiFetchObjectUrl } from './apiClient';

const r = (reportId) => `/reports/${encodeURIComponent(reportId)}`;

// --- Reports -----------------------------------------------------------

// A citizen gets their own reports; an official gets all reports.
export function listReports({ status, category, page = 1, pageSize = 100 } = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) query.set('status', status);
  if (category) query.set('category', category);
  return apiRequest(`/reports?${query}`);
}

// Fetches every page, for dashboards that filter and count on screen.
export async function listAllReports(filters = {}) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const res = await listReports({ ...filters, page, pageSize: 100 });
    if (!res.ok) return res;
    items.push(...res.data.items);
    if (items.length >= res.data.total || res.data.items.length === 0) break;
  }
  return { ok: true, data: items };
}

export function getReport(reportId) {
  return apiRequest(r(reportId));
}

// fields: title, description, category?, location_text?, latitude?, longitude?
export function createReport(fields) {
  return apiRequest('/reports', { method: 'POST', json: fields });
}

// Changing title/description/location/authority clears any approval.
export function updateReport(reportId, fields) {
  return apiRequest(r(reportId), { method: 'PATCH', json: fields });
}

// Share with residents within 2 km (or stop), and show the name or stay anonymous.
export function setSharing(reportId, shared, showName) {
  return apiRequest(`${r(reportId)}/sharing`, { method: 'PUT', json: { shared, show_name: showName } });
}

export function changeReportStatus(reportId, status, note) {
  const json = { status };
  if (note && note.trim()) json.note = note.trim();
  return apiRequest(`${r(reportId)}/status`, { method: 'POST', json });
}

export function listReportEvents(reportId) {
  return apiRequest(`${r(reportId)}/events`);
}

// --- AI analysis and drafts ---------------------------------------------

export function analyzeReport(reportId) {
  // AI calls can be slow; allow a minute.
  return apiRequest(`${r(reportId)}/analyze`, { method: 'POST', timeout: 60000 });
}

// 404 ANALYSIS_NOT_FOUND simply means "not analysed yet".
export function getLatestAnalysis(reportId) {
  return apiRequest(`${r(reportId)}/analysis`);
}

export function listDrafts(reportId) {
  return apiRequest(`${r(reportId)}/drafts`);
}

export function saveDraft(reportId, text) {
  return apiRequest(`${r(reportId)}/drafts`, { method: 'POST', json: { text } });
}

export function approveDraft(reportId, draftId) {
  return apiRequest(`${r(reportId)}/approve`, { method: 'POST', json: { draft_id: draftId } });
}

// With no real integration configured the backend answers 503
// SUBMISSION_UNAVAILABLE. That is shown as it is: never as a success.
export function submitReport(reportId) {
  return apiRequest(`${r(reportId)}/submit`, { method: 'POST' });
}

export function listAuthorities(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiRequest(`/authorities${query}`);
}

// --- Evidence photos -------------------------------------------------------

export function listEvidence(reportId) {
  return apiRequest(`${r(reportId)}/evidence`);
}

function photoForm(file, description) {
  const form = new FormData();
  form.append('file', file);
  if (description && description.trim()) form.append('description', description.trim());
  return form;
}

// The owner's photo of the problem.
export function uploadReportPhoto(reportId, file, description) {
  return apiRequest(`${r(reportId)}/evidence`, {
    method: 'POST',
    body: photoForm(file, description),
    timeout: 60000,
  });
}

// An official's after-repair photo (only while in_progress).
export function uploadRepairPhoto(reportId, file, description) {
  return apiRequest(`${r(reportId)}/repair-photos`, {
    method: 'POST',
    body: photoForm(file, description),
    timeout: 60000,
  });
}

export function fetchEvidenceFile(reportId, evidenceId) {
  return apiFetchObjectUrl(`${r(reportId)}/evidence/${encodeURIComponent(evidenceId)}/file`);
}
