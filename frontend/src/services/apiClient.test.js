import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiRequest, authStorage, errorText } from './apiClient';

// Tests run in Node, which has no browser storage or page URL, so we give
// the code small stand-ins for sessionStorage and window.location.
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

// A fetch stand-in that answers with one JSON response.
function respondWith(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', fakeStorage());
  vi.stubGlobal('window', { location: { pathname: '/citizen/dashboard', href: '' } });
});

describe('apiRequest', () => {
  it('returns the data on success', async () => {
    vi.stubGlobal('fetch', respondWith(200, { items: [], total: 0 }));
    const res = await apiRequest('/reports');
    expect(res).toEqual({ ok: true, status: 200, data: { items: [], total: 0 } });
  });

  it('calls the /api/v1 URL and sends the token when logged in', async () => {
    const fetch = respondWith(200, {});
    vi.stubGlobal('fetch', fetch);
    authStorage.setToken('abc123');

    await apiRequest('/reports');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/reports');
    expect(options.headers.Authorization).toBe('Bearer abc123');
  });

  it('sends JSON bodies with a JSON content type', async () => {
    const fetch = respondWith(201, {});
    vi.stubGlobal('fetch', fetch);

    await apiRequest('/reports', { method: 'POST', json: { title: 'Pothole' } });

    const [, options] = fetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe('{"title":"Pothole"}');
  });

  it("reads the backend's error format", async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(409, { error: { code: 'REPORT_LOCKED', message: 'The report is locked.', details: [] } })
    );
    const res = await apiRequest('/reports/1', { method: 'PATCH', json: {} });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('REPORT_LOCKED');
    expect(res.error.message).toBe('The report is locked.');
  });

  // The teammate's client invented mock data when the server was down.
  it('reports a network failure instead of inventing data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const res = await apiRequest('/reports');
    expect(res.ok).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error.code).toBe('NETWORK_ERROR');
  });

  it('logs out and goes to /login when the token is no longer valid', async () => {
    vi.stubGlobal('fetch', respondWith(401, { error: { code: 'INVALID_TOKEN', message: 'Invalid token.' } }));
    authStorage.setToken('expired');
    authStorage.setUser({ role: 'citizen' });

    await apiRequest('/reports');

    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
    expect(window.location.href).toBe('/login?expired=true');
  });

  it('does not treat a wrong password as an expired session', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } })
    );
    const res = await apiRequest('/auth/login', { method: 'POST', json: {} });
    expect(res.error.code).toBe('INVALID_CREDENTIALS');
    expect(window.location.href).toBe('');
  });
});

describe('errorText', () => {
  it('adds field details for validation errors', () => {
    const text = errorText({
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid fields.',
      details: [{ field: 'title', message: 'Field required' }],
    });
    expect(text).toBe('The request contains invalid fields. title: Field required');
  });

  it('uses the plain message for other errors', () => {
    expect(errorText({ code: 'EMAIL_TAKEN', message: 'Email taken.', details: [] })).toBe('Email taken.');
  });
});

describe('account access errors (api-contract.md section 3)', () => {
  it('sends an official who is not approved to their application page', async () => {
    vi.stubGlobal('fetch', respondWith(403, { error: { code: 'ACCOUNT_NOT_APPROVED', message: 'Not approved.' } }));
    authStorage.setToken('tok');

    await apiRequest('/reports');

    expect(window.location.href).toBe('/account/pending');
    expect(authStorage.getToken()).toBe('tok'); // still signed in: they can read their status
  });

  it('sends an admin to the admin page', async () => {
    vi.stubGlobal('fetch', respondWith(403, { error: { code: 'ADMIN_ACCOUNT', message: 'Admin.' } }));

    await apiRequest('/reports');

    expect(window.location.href).toBe('/admin');
  });

  it('leaves other 403s, like a wrong sign-in choice, to the page', async () => {
    vi.stubGlobal('fetch', respondWith(403, { error: { code: 'WRONG_ACCOUNT_TYPE', message: 'This is a citizen account.' } }));

    const res = await apiRequest('/auth/login', { method: 'POST', json: {} });

    expect(window.location.href).toBe('');
    expect(res.error.code).toBe('WRONG_ACCOUNT_TYPE');
  });
});
