/**
 * src/services/apiClient.js
 *
 * The one place that talks HTTP to the CivicFix backend (docs/api-contract.md).
 *
 * - Base URL from VITE_API_BASE_URL (frontend/.env), default http://localhost:8000.
 * - Adds "Authorization: Bearer <token>" when the user is logged in.
 * - Reads the backend's error format: {"error": {"code", "message", "details"}}.
 * - Never invents data: if a request fails, the caller gets ok: false and the
 *   real error. (The teammate's version fell back to mock data, which hid
 *   every failure.)
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_PREFIX = '/api/v1';
const DEFAULT_TIMEOUT_MS = 15000;

// sessionStorage keeps the login only for this browser tab; it is cleared
// when the tab closes. The token expires after 60 minutes anyway (no refresh).
const TOKEN_KEY = 'civicfix_token';
const USER_KEY = 'civicfix_user';

export const authStorage = {
  getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage blocked (private mode): the user simply stays logged out.
    }
  },
  getUser() {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    try {
      if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      else sessionStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage errors.
    }
  },
  isAuthenticated() {
    return Boolean(this.getToken());
  },
  clearSession() {
    this.setToken(null);
    this.setUser(null);
  },
};

// Turn any failure into the same shape: { code, message, details, status }.
function toError(status, data, fallbackMessage) {
  const err = data && typeof data === 'object' ? data.error : null;
  return {
    status,
    code: (err && err.code) || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
    message: (err && err.message) || fallbackMessage,
    details: (err && Array.isArray(err.details) && err.details) || [],
  };
}

// A message for the screen; adds field details for validation errors.
export function errorText(error) {
  if (!error) return '';
  if (error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
    const parts = error.details.map((d) => `${d.field}: ${d.message}`);
    return `${error.message} ${parts.join('; ')}`;
  }
  return error.message;
}

// When the token expired or is invalid, log out and go to the login page.
function handleUnauthorized(status, error) {
  if (status !== 401) return;
  // A wrong password on /auth/login is also 401; that is not an expired session.
  if (error.code === 'INVALID_CREDENTIALS') return;
  authStorage.clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login?expired=true';
  }
}

async function send(path, { method = 'GET', body, json, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const headers = { Accept: 'application/json' };
  const token = authStorage.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let requestBody = body; // FormData for uploads: the browser sets the boundary.
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(json);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * JSON request. Returns { ok: true, status, data } or { ok: false, status, error }.
 *
 * Examples:
 *   apiRequest('/reports')
 *   apiRequest('/reports', { method: 'POST', json: { title, description } })
 *   apiRequest('/reports/ID/evidence', { method: 'POST', body: formData })
 */
export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await send(path, options);
  } catch (e) {
    const message =
      e.name === 'AbortError'
        ? 'The server did not answer in time. Please try again.'
        : `Cannot reach the CivicFix server at ${API_BASE_URL}. Is the backend running?`;
    return { ok: false, status: 0, error: toError(0, null, message) };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = toError(response.status, data, `Request failed (HTTP ${response.status}).`);
    handleUnauthorized(response.status, error);
    return { ok: false, status: response.status, error };
  }
  return { ok: true, status: response.status, data };
}

/**
 * Download a protected file (an evidence photo) as an object URL for <img src>.
 * Call URL.revokeObjectURL(url) when the image is no longer shown.
 */
export async function apiFetchObjectUrl(path) {
  let response;
  try {
    response = await send(path);
  } catch {
    return { ok: false, error: toError(0, null, 'Cannot reach the server.') };
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = toError(response.status, data, `Could not load the photo (HTTP ${response.status}).`);
    handleUnauthorized(response.status, error);
    return { ok: false, error };
  }
  const blob = await response.blob();
  return { ok: true, url: URL.createObjectURL(blob) };
}

// GET /health lives outside /api/v1.
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
