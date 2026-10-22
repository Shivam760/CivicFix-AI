import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginUser, registerUser, getActiveRole } from './authService';
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
