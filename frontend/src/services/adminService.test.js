import { describe, it, expect, beforeEach, vi } from 'vitest';
import { approveOfficial, listOfficials, rejectOfficial } from './adminService';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

const ok = (body) => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
const body = (fetch) => JSON.parse(fetch.mock.calls[0][1].body);

beforeEach(() => {
  vi.stubGlobal('sessionStorage', fakeStorage());
  vi.stubGlobal('window', { location: { pathname: '/admin', href: '' } });
});

describe('adminService (api-contract.md section 13)', () => {
  it('lists all officials, or one status', async () => {
    const fetch = ok({ items: [] });
    vi.stubGlobal('fetch', fetch);

    await listOfficials();
    await listOfficials('pending');

    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/admin\/officials$/);
    expect(fetch.mock.calls[1][0]).toMatch(/\/api\/v1\/admin\/officials\?approval_status=pending$/);
  });

  it('approves with a trimmed note, or with no note at all', async () => {
    const fetch = ok({});
    vi.stubGlobal('fetch', fetch);

    await approveOfficial('u1', '  Confirmed by phone.  ');
    await approveOfficial('u1', '   ');

    expect(fetch.mock.calls[0][0]).toMatch(/\/admin\/officials\/u1\/approve$/);
    expect(body(fetch)).toEqual({ note: 'Confirmed by phone.' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({}); // blank -> no note
  });

  it('rejects with the note', async () => {
    const fetch = ok({});
    vi.stubGlobal('fetch', fetch);

    await rejectOfficial('u2', ' Could not confirm the job. ');

    expect(fetch.mock.calls[0][0]).toMatch(/\/admin\/officials\/u2\/reject$/);
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(body(fetch)).toEqual({ note: 'Could not confirm the job.' });
  });
});
