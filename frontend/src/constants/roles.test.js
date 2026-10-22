import { describe, it, expect } from 'vitest';
import { homePathFor, isAwaitingApproval } from './roles';

// Where each account lands after signing in (ProtectedRoute uses the same rule).
describe('homePathFor', () => {
  it.each([
    [{ role: 'citizen', approval_status: 'approved' }, '/citizen/dashboard'],
    [{ role: 'official', approval_status: 'approved' }, '/official/dashboard'],
    [{ role: 'official', approval_status: 'pending' }, '/account/pending'],
    [{ role: 'official', approval_status: 'rejected' }, '/account/pending'],
    [{ role: 'admin', approval_status: 'approved' }, '/admin'],
    [null, '/login'],
  ])('%o -> %s', (user, path) => {
    expect(homePathFor(user)).toBe(path);
  });

  it('only officials can be waiting for approval', () => {
    // The database refuses an unapproved citizen; the frontend agrees.
    expect(isAwaitingApproval({ role: 'citizen', approval_status: 'pending' })).toBe(false);
    expect(isAwaitingApproval({ role: 'official', approval_status: 'pending' })).toBe(true);
  });
});
