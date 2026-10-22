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
import { ACCOUNT_TYPES, ROLES } from '../constants/roles';

// accountType is the page's Citizen / Official choice. If it doesn't match the
// account, the backend answers 403 WRONG_ACCOUNT_TYPE ("This is a citizen account...").
export async function loginUser({ email, password, accountType }) {
  const json = { email: email.trim(), password };
  if (accountType) json.account_type = accountType;
  const res = await apiRequest('/auth/login', { method: 'POST', json });
  if (!res.ok) return res;

  authStorage.setToken(res.data.access_token);
  const me = await fetchCurrentUser();
  if (!me.ok) {
    authStorage.clearSession();
    return me;
  }
  return { ok: true, user: me.data };
}

// Creates a citizen account, or an official account that waits for an admin
// (department and job title are sent only for officials). It does not log in:
// the user signs in next on the login page. Returns { ok: true, data: user }.
export function registerUser({ name, email, password, accountType = ACCOUNT_TYPES.CITIZEN, department, jobTitle }) {
  const json = { name: name.trim(), email: email.trim(), password };
  if (accountType === ACCOUNT_TYPES.OFFICIAL) {
    json.account_type = ACCOUNT_TYPES.OFFICIAL;
    json.official_department = department.trim();
    json.official_job_title = jobTitle.trim();
  }
  return apiRequest('/auth/register', { method: 'POST', json });
}

// A pending or rejected official corrects their details and applies again.
export async function updateOfficialApplication({ department, jobTitle }) {
  const res = await apiRequest('/auth/me/official-application', {
    method: 'PUT',
    json: { official_department: department.trim(), official_job_title: jobTitle.trim() },
  });
  if (res.ok) authStorage.setUser(res.data);
  return res;
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

// PATCH /auth/me: change your own name. The stored user is updated, so the
// sidebar and top bar show the new name at once.
export async function updateProfile({ name }) {
  const res = await apiRequest('/auth/me', { method: 'PATCH', json: { name: name.trim() } });
  if (res.ok) authStorage.setUser(res.data);
  return res;
}

// PUT /auth/me/password. A wrong current password is 400 CURRENT_PASSWORD_INCORRECT
// (not 401, so the user stays signed in). Success is 204 with no body.
export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/auth/me/password', {
    method: 'PUT',
    json: { current_password: currentPassword, new_password: newPassword },
  });
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
