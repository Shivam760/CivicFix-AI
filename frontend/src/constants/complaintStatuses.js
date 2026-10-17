/**
 * src/constants/complaintStatuses.js
 * 
 * Standard civic complaint lifecycle statuses matching FastAPI backend schemas.
 * 
 * BACKEND INTEGRATION NOTE:
 * Workflow states:
 * - submitted: Report received, awaiting initial municipal triage
 * - under_review: Committee / automated AI triage underway
 * - assigned: Dispatched to verified municipal department / contractor
 * - in_progress: Active repair work underway on-site
 * - resolved: Remediation verified with photographic evidence
 * - rejected: Out of municipal jurisdiction, duplicate, or invalid
 */

export const COMPLAINT_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

export const STATUS_CONFIG = {
  [COMPLAINT_STATUS.SUBMITTED]: {
    label: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotClass: 'bg-amber-500',
    description: 'Complaint registered. Queued for department review.',
  },
  [COMPLAINT_STATUS.UNDER_REVIEW]: {
    label: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotClass: 'bg-blue-500',
    description: 'Municipal committee is verifying jurisdiction and severity.',
  },
  [COMPLAINT_STATUS.ASSIGNED]: {
    label: 'Assigned',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
    dotClass: 'bg-purple-500',
    description: 'Dispatched to responsible zonal engineering team.',
  },
  [COMPLAINT_STATUS.IN_PROGRESS]: {
    label: 'In Progress',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80',
    dotClass: 'bg-teal-500',
    description: 'Ground repair and remediation work is active.',
  },
  [COMPLAINT_STATUS.RESOLVED]: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
    description: 'Issue inspected and verified fixed by municipal authority.',
  },
  [COMPLAINT_STATUS.REJECTED]: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dotClass: 'bg-rose-500',
    description: 'Report could not be serviced (duplicate or outside jurisdiction).',
  },
};

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_CONFIG = {
  [PRIORITY_LEVELS.LOW]: {
    label: 'Low',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    indicatorClass: 'bg-slate-400',
  },
  [PRIORITY_LEVELS.MEDIUM]: {
    label: 'Medium',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    indicatorClass: 'bg-sky-500',
  },
  [PRIORITY_LEVELS.HIGH]: {
    label: 'High',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    indicatorClass: 'bg-amber-500',
  },
  [PRIORITY_LEVELS.CRITICAL]: {
    label: 'Critical',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-600',
  },
};
