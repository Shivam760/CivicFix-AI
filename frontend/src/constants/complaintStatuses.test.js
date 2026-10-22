import { describe, it, expect } from 'vitest';
import { STATUS_CONFIG, STATUS_TRANSITIONS, ownerCanClose, isLocked, matchesStatusFilter } from './complaintStatuses';

// These copy backend rules (api-contract.md section 4) so the screen offers
// only buttons the backend will accept.
describe('report statuses', () => {
  it('has the six backend statuses', () => {
    expect(Object.keys(STATUS_CONFIG)).toEqual([
      'reported',
      'under_review',
      'in_progress',
      'awaiting_verification',
      'resolved',
      'closed',
    ]);
  });

  it('never lets an official set resolved: only residents votes do', () => {
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      expect(targets).not.toContain('resolved');
    }
  });

  it('does not allow closing while residents are checking a repair', () => {
    expect(STATUS_TRANSITIONS.awaiting_verification).toEqual(['in_progress']);
  });

  it('treats closed as final', () => {
    expect(STATUS_TRANSITIONS.closed).toEqual([]);
  });

  it('lets the owner close only before work starts', () => {
    expect(ownerCanClose('reported')).toBe(true);
    expect(ownerCanClose('under_review')).toBe(true);
    expect(ownerCanClose('in_progress')).toBe(false);
    expect(ownerCanClose('resolved')).toBe(false);
  });
});

describe('isLocked', () => {
  it('locks a report once it is pending, confirmed or unknown', () => {
    expect(isLocked({ submission_status: 'pending' })).toBe(true);
    expect(isLocked({ submission_status: 'confirmed' })).toBe(true);
    expect(isLocked({ submission_status: 'unknown' })).toBe(true);
    expect(isLocked({ submission_status: 'not_submitted' })).toBe(false);
    expect(isLocked({ submission_status: 'failed' })).toBe(false);
  });
});

describe('matchesStatusFilter', () => {
  it('hides only closed reports under the default "open" filter', () => {
    expect(matchesStatusFilter('closed', 'open')).toBe(false);
    for (const status of ['reported', 'under_review', 'in_progress', 'awaiting_verification', 'resolved']) {
      expect(matchesStatusFilter(status, 'open')).toBe(true);
    }
  });

  it('shows closed reports when asked for them or for all', () => {
    expect(matchesStatusFilter('closed', 'closed')).toBe(true);
    expect(matchesStatusFilter('closed', 'all')).toBe(true);
  });

  it('matches one exact status otherwise', () => {
    expect(matchesStatusFilter('reported', 'under_review')).toBe(false);
    expect(matchesStatusFilter('under_review', 'under_review')).toBe(true);
  });
});
