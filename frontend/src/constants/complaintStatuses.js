/**
 * src/constants/complaintStatuses.js
 *
 * Report statuses, submission statuses and event labels, matching
 * backend/app/models/choices.py and api-contract.md sections 4 and 7.
 */

export const REPORT_STATUS = {
  REPORTED: 'reported',
  UNDER_REVIEW: 'under_review',
  IN_PROGRESS: 'in_progress',
  AWAITING_VERIFICATION: 'awaiting_verification',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

export const STATUS_CONFIG = {
  [REPORT_STATUS.REPORTED]: {
    label: 'Reported',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
    description: 'The report has been created. No official has reviewed it yet.',
  },
  [REPORT_STATUS.UNDER_REVIEW]: {
    label: 'Under review',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotClass: 'bg-blue-500',
    description: 'An official is looking at the report.',
  },
  [REPORT_STATUS.IN_PROGRESS]: {
    label: 'In progress',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80',
    dotClass: 'bg-teal-500',
    description: 'An official has marked the repair as started.',
  },
  [REPORT_STATUS.AWAITING_VERIFICATION]: {
    label: 'Awaiting verification',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
    dotClass: 'bg-purple-500',
    description: 'An official says it is repaired. Residents are checking the claim.',
  },
  [REPORT_STATUS.RESOLVED]: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
    description: 'Residents confirmed the repair. This is their judgement, not proof.',
  },
  [REPORT_STATUS.CLOSED]: {
    label: 'Closed',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    dotClass: 'bg-stone-500',
    description: 'The report is closed. This is final.',
  },
};

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

// Status filter for the dashboards. 'open' (the default) hides closed reports:
// they are kept, never deleted, and 'Closed' or 'All statuses' shows them.
export const OPEN_FILTER = 'open';
export const STATUS_FILTER_OPTIONS = [
  { value: OPEN_FILTER, label: 'Open reports' },
  { value: 'all', label: 'All statuses' },
  ...STATUS_OPTIONS,
];

export function matchesStatusFilter(status, filter) {
  if (filter === 'all') return true;
  if (filter === OPEN_FILTER) return status !== REPORT_STATUS.CLOSED;
  return status === filter;
}

// Allowed changes for POST /reports/{id}/status (api-contract.md section 4).
// `resolved` is never a target: only residents' votes move a report there.
export const STATUS_TRANSITIONS = {
  [REPORT_STATUS.REPORTED]: [REPORT_STATUS.UNDER_REVIEW, REPORT_STATUS.CLOSED],
  [REPORT_STATUS.UNDER_REVIEW]: [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.CLOSED],
  [REPORT_STATUS.IN_PROGRESS]: [REPORT_STATUS.AWAITING_VERIFICATION, REPORT_STATUS.CLOSED],
  [REPORT_STATUS.AWAITING_VERIFICATION]: [REPORT_STATUS.IN_PROGRESS],
  [REPORT_STATUS.RESOLVED]: [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.CLOSED],
  [REPORT_STATUS.CLOSED]: [],
};

// Button text for an official's status change, keyed "from->to".
export const TRANSITION_LABELS = {
  'reported->under_review': 'Start review',
  'under_review->in_progress': 'Mark repair started',
  'in_progress->awaiting_verification': 'Claim repair done (ask residents)',
  'awaiting_verification->in_progress': 'Withdraw repair claim',
  'resolved->in_progress': 'Reopen',
};

export function transitionLabel(from, to) {
  if (to === REPORT_STATUS.CLOSED) return 'Close report';
  return TRANSITION_LABELS[`${from}->${to}`] || `Move to ${STATUS_CONFIG[to]?.label || to}`;
}

// The owner may only close (withdraw) the report before work starts.
export function ownerCanClose(status) {
  return status === REPORT_STATUS.REPORTED || status === REPORT_STATUS.UNDER_REVIEW;
}

// Submission to an authority (api-contract.md section 7).
export const SUBMISSION_STATUS_CONFIG = {
  not_submitted: { label: 'Not sent to an authority', className: 'bg-stone-100 text-stone-700 border-stone-300' },
  pending: { label: 'Sent, waiting for confirmation', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmed: { label: 'Authority confirmed receipt', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  failed: { label: 'Sending failed', className: 'bg-rose-50 text-rose-800 border-rose-200' },
  unknown: { label: 'Outcome unknown', className: 'bg-amber-50 text-amber-800 border-amber-200' },
};

// A report is locked (no edits, drafts, analysis, approval or photos)
// while its submission is pending, confirmed or unknown.
export const LOCKED_SUBMISSION_STATUSES = ['pending', 'confirmed', 'unknown'];

export function isLocked(report) {
  return LOCKED_SUBMISSION_STATUSES.includes(report?.submission_status);
}

// Short titles for the event timeline (database-schema.md section 8).
export const EVENT_LABELS = {
  report_created: 'Report created',
  report_updated: 'Report edited',
  report_status_changed: 'Status changed',
  ai_analysis_completed: 'AI suggestion ready',
  ai_analysis_failed: 'AI analysis failed',
  draft_created: 'Draft created',
  draft_edited: 'Draft edited',
  draft_approved: 'Draft approved',
  approval_invalidated: 'Approval cleared',
  evidence_added: 'Photo added',
  submission_requested: 'Submission requested',
  submission_confirmed: 'Submission confirmed',
  submission_failed: 'Submission failed',
  submission_unknown: 'Submission outcome unknown',
  verification_vote_recorded: 'Resident vote recorded',
  report_sharing_changed: 'Sharing changed',
};
