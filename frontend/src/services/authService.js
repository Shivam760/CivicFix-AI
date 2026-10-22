/**
 * src/services/authService.js
 *
 * Login, registration and the current user (api-contract.md section 3).
 *
 * Our POST /auth/login returns only { access_token, token_type }, so after
 * logging in we call GET /auth/me to learn the user's name and role.
 * The role stored here only decides which screens to show; the backend
 * checks permissions on every request.
 */

import { apiRequest, authStorage } from './apiClient';
import { ROLES } from '../constants/roles';

export async function loginUser({ email, password }) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    json: { email: email.trim(), password },
  });
  if (!res.ok) return res;

  authStorage.setToken(res.data.access_token);
  const me = await fetchCurrentUser();
  if (!me.ok) {
    authStorage.clearSession();
    return me;
  }
  return { ok: true, user: me.data };
}

// Creates a citizen account. It does not log in: the user signs in next on
// the login page. Returns { ok: true, data: user } on success.
export function registerUser({ name, email, password }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    json: { name: name.trim(), email: email.trim(), password },
  });
}

// GET /auth/me: refreshes the stored user (name, role, home location).
export async function fetchCurrentUser() {
  const res = await apiRequest('/auth/me');
  if (res.ok) authStorage.setUser(res.data);
  return res;
}

export function getCurrentUser() {
  return authStorage.getUser();
}

export function getActiveRole() {
  return authStorage.getUser()?.role || ROLES.CITIZEN;
}

export function signOutUser() {
  authStorage.clearSession();
}

// The home location is private: it is only used to find nearby repairs to verify.
export async function saveHomeLocation({ latitude, longitude }) {
  const res = await apiRequest('/auth/me/home-location', {
    method: 'PUT',
    json: { latitude, longitude },
  });
  if (res.ok) authStorage.setUser(res.data);
  return res;
}

export async function clearHomeLocation() {
  const res = await apiRequest('/auth/me/home-location', { method: 'DELETE' });
  if (res.ok) authStorage.setUser(res.data);
  return res;
}
