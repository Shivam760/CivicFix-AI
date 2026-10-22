import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginUser, registerUser, getActiveRole, updateOfficialApplication, updateProfile, changePassword } from './authService';
import { authStorage } from './apiClient';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
const OFFICIAL = { id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'official' };

beforeEach(() => {
  vi.stubGlobal('sessionStorage', fakeStorage());
  vi.stubGlobal('window', { location: { pathname: '/login', href: '' } });
});

describe('loginUser', () => {
  // Our login returns only the token, so the role must come from GET /auth/me.
  it('stores the token, then loads the role from /auth/me', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { access_token: 'tok', token_type: 'bearer' }))
      .mockResolvedValueOnce(json(200, OFFICIAL));
    vi.stubGlobal('fetch', fetch);

    const res = await loginUser({ email: ' asha@example.com ', password: 'secret123' });

    expect(res).toEqual({ ok: true, user: OFFICIAL });
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/login$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body).email).toBe('asha@example.com');
    expect(fetch.mock.calls[1][0]).toMatch(/\/api\/v1\/auth\/me$/);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer tok');
    expect(getActiveRole()).toBe('official');
  });

  it('keeps no session when the password is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }))
    );
    const res = await loginUser({ email: 'a@example.com', password: 'wrong' });
    expect(res.ok).toBe(false);
    expect(authStorage.getToken()).toBeNull();
  });

  // The teammate's version logged in a fake user when the server was down.
  it('does not log in when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const res = await loginUser({ email: 'admin@example.com', password: 'anything' });
    expect(res.ok).toBe(false);
    expect(authStorage.isAuthenticated()).toBe(false);
  });
});

describe('registerUser', () => {
  it('sends name, email and password (no phone) and does not log in', async () => {
    const citizen = { ...OFFICIAL, role: 'citizen' };
    const fetch = vi.fn().mockResolvedValueOnce(json(201, citizen));
    vi.stubGlobal('fetch', fetch);

    const res = await registerUser({ name: ' Asha ', email: 'asha@example.com', password: 'secret123' });

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'secret123',
    });
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1); // only /auth/register
    expect(authStorage.isAuthenticated()).toBe(false); // the user signs in next
  });
});

describe('official accounts', () => {
  it('sends the Citizen / Official choice when signing in', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { access_token: 'tok', token_type: 'bearer' }))
      .mockResolvedValueOnce(json(200, OFFICIAL));
    vi.stubGlobal('fetch', fetch);

    await loginUser({ email: 'asha@example.com', password: 'secret123', accountType: 'official' });

    expect(JSON.parse(fetch.mock.calls[0][1].body).account_type).toBe('official');
  });

  it('keeps no session when the choice is wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(403, { error: { code: 'WRONG_ACCOUNT_TYPE', message: 'This is a citizen account.' } }))
    );

    const res = await loginUser({ email: 'a@example.com', password: 'secret123', accountType: 'official' });

    expect(res.error.code).toBe('WRONG_ACCOUNT_TYPE');
    expect(authStorage.isAuthenticated()).toBe(false);
  });

  it('sends the department and job title, trimmed, for an official sign-up', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(201, OFFICIAL));
    vi.stubGlobal('fetch', fetch);

    await registerUser({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'secret123',
      accountType: 'official',
      department: ' Roads ',
      jobTitle: ' Engineer ',
    });

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'secret123',
      account_type: 'official',
      official_department: 'Roads',
      official_job_title: 'Engineer',
    });
  });

  it('never sends official details for a citizen', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(201, OFFICIAL));
    vi.stubGlobal('fetch', fetch);

    await registerUser({ name: 'Asha', email: 'a@example.com', password: 'secret123', department: 'Roads', jobTitle: 'X' });

    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body))).toEqual(['name', 'email', 'password']);
  });

  it('applies again and stores the updated account', async () => {
    const pending = { ...OFFICIAL, approval_status: 'pending', official_department: 'Water Board' };
    const fetch = vi.fn().mockResolvedValueOnce(json(200, pending));
    vi.stubGlobal('fetch', fetch);

    const res = await updateOfficialApplication({ department: ' Water Board ', jobTitle: 'Engineer' });

    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/me\/official-application$/);
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      official_department: 'Water Board',
      official_job_title: 'Engineer',
    });
    expect(res.ok).toBe(true);
    expect(authStorage.getUser().approval_status).toBe('pending');
  });
});

describe('profile settings', () => {
  it('saves a trimmed name, stores the user and tells the sidebar', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/profile', href: '' }, dispatchEvent });
    const fetch = vi.fn().mockResolvedValueOnce(json(200, { ...OFFICIAL, name: 'Asha K' }));
    vi.stubGlobal('fetch', fetch);

    const res = await updateProfile({ name: '  Asha K  ' });

    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/me$/);
    expect(fetch.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: 'Asha K' });
    expect(res.ok).toBe(true);
    expect(authStorage.getUser().name).toBe('Asha K');
    expect(dispatchEvent).toHaveBeenCalled(); // useCurrentUser redraws the sidebar and top bar
  });

  it('changes the password with the current one', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    vi.stubGlobal('fetch', fetch);

    const res = await changePassword({ currentPassword: 'old-pass-1', newPassword: 'new-pass-2' });

    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/me\/password$/);
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ current_password: 'old-pass-1', new_password: 'new-pass-2' });
    expect(res.ok).toBe(true); // 204 has no body, and that is fine
  });

  it('keeps the user signed in when the current password is wrong', async () => {
    authStorage.setToken('tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(400, { error: { code: 'CURRENT_PASSWORD_INCORRECT', message: 'The current password is incorrect.' } }))
    );

    const res = await changePassword({ currentPassword: 'wrong', newPassword: 'new-pass-2' });

    expect(res.error.code).toBe('CURRENT_PASSWORD_INCORRECT');
    expect(authStorage.getToken()).toBe('tok');
  });
});