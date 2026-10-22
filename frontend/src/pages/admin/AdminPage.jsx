import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Building2, Briefcase, CalendarClock, CheckCircle2, Mail, RefreshCw, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ReviewDialog from '../../components/admin/ReviewDialog';
import { ErrorBox, NoteBox, btnPrimary, btnSecondary, btnDanger } from '../../components/reports/ui';
import { approveOfficial, listOfficials, rejectOfficial } from '../../services/adminService';
import { errorText } from '../../services/apiClient';
import { APPROVAL, ROLES } from '../../constants/roles';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const TABS = [
  { value: APPROVAL.PENDING, label: 'Waiting' },
  { value: APPROVAL.APPROVED, label: 'Approved' },
  { value: APPROVAL.REJECTED, label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const STATUS_STYLE = {
  [APPROVAL.PENDING]: { label: 'Waiting', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  [APPROVAL.APPROVED]: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  [APPROVAL.REJECTED]: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const EMPTY_TEXT = {
  [APPROVAL.PENDING]: 'No applications are waiting. New official sign-ups appear here.',
  [APPROVAL.APPROVED]: 'No approved officials yet.',
  [APPROVAL.REJECTED]: 'No rejected applications.',
  all: 'No official accounts yet.',
};

/**
 * AdminPage (/admin)
 * Admins decide who may act as an official (api-contract.md section 13).
 * The list comes from GET /admin/officials (pending first, oldest first);
 * the tabs only filter it here, so the counts stay correct.
 */
export default function AdminPage() {
  useDocumentTitle('Official accounts · CivicFix AI');
  const reduce = useReducedMotion();
  const { showToast } = useToast();

  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(APPROVAL.PENDING);

  // The decision being made: { mode: 'approve' | 'reject' | 'revoke', official }.
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const showList = useCallback((res) => {
    setLoading(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setError('');
    setOfficials(res.data.items);
  }, []);

  useEffect(() => {
    let ignore = false;
    listOfficials().then((res) => {
      if (!ignore) showList(res);
    });
    return () => {
      ignore = true;
    };
  }, [showList]);

  const refresh = async () => {
    setRefreshing(true);
    showList(await listOfficials());
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const result = { all: officials.length };
    for (const { value } of TABS) {
      if (value !== 'all') result[value] = officials.filter((o) => o.approval_status === value).length;
    }
    return result;
  }, [officials]);

  const visible = tab === 'all' ? officials : officials.filter((o) => o.approval_status === tab);

  const openReview = (mode, official) => {
    setSaveError('');
    setReview({ mode, official });
  };
  const closeReview = useCallback(() => setReview(null), []);

  const confirmReview = async (note) => {
    const { mode, official } = review;
    setSaving(true);
    setSaveError('');
    const res = mode === 'approve' ? await approveOfficial(official.id, note) : await rejectOfficial(official.id, note);
    setSaving(false);
    if (!res.ok) {
      setSaveError(errorText(res.error));
      return;
    }
    // Replace the card with the server's version; it moves to its new tab.
    setOfficials((prev) => prev.map((o) => (o.id === res.data.id ? res.data : o)));
    setReview(null);
    const titles = { approve: 'Official approved', reject: 'Application rejected', revoke: 'Access removed' };
    showToast({ type: 'success', title: titles[mode], message: res.data.name });
  };

  return (
    <DashboardLayout
      activeRole={ROLES.ADMIN}
      title="Official accounts"
      subtitle="Approve people who work for an authority, so they can update reports."
      primaryAction={
        <button type="button" onClick={refresh} disabled={refreshing} className={btnSecondary}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      }
    >
      <div className="space-y-5">
        <NoteBox tone="warning">
          <strong>CivicFix AI cannot check that someone works for an authority.</strong> Before approving, confirm the
          job with their department outside the app, for example by phone. Approval records who decided and when; it
          is not proof.
        </NoteBox>

        {/* Tabs: the highlight slides between them, like the sign-in switch. */}
        <div role="tablist" aria-label="Filter by status" className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-surface border border-border">
          {TABS.map(({ value, label }) => {
            const selected = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(value)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  selected ? 'text-white' : 'text-muted hover:text-navy'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="admin-tab-pill"
                    transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-xl bg-primary"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">
                  {label}
                  <span className={`ml-1.5 tabular-nums ${selected ? 'text-white/80' : 'text-muted'}`}>{counts[value] ?? 0}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ErrorBox>{error}</ErrorBox>

        {loading ? (
          <p className="text-sm text-muted">Loading official accounts…</p>
        ) : visible.length === 0 && !error ? (
          <div className="p-8 rounded-2xl border border-dashed border-border bg-surface text-center text-sm text-muted">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-primary" aria-hidden="true" />
            {EMPTY_TEXT[tab]}
          </div>
        ) : (
          <ul className="grid gap-3 grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
            {/* minmax(0, 1fr) + min-w-0: a long email can't stretch a card past the screen. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((official) => (
                <motion.li
                  key={official.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                  className="min-w-0"
                >
                  <OfficialCard official={official} onReview={openReview} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ReviewDialog
        mode={review?.mode}
        official={review?.official}
        processing={saving}
        error={saveError}
        onConfirm={confirmReview}
        onCancel={closeReview}
      />
    </DashboardLayout>
  );
}

function OfficialCard({ official, onReview }) {
  const status = STATUS_STYLE[official.approval_status];
  const fromScript = !official.official_department;

  return (
    <article className="h-full min-w-0 bg-surface rounded-2xl border border-border shadow-2xs p-4 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-navy truncate">{official.name}</h3>
          <a href={`mailto:${official.email}`} className="flex items-center gap-1 min-w-0 text-xs text-muted hover:text-primary" title={official.email}>
            <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{official.email}</span>
          </a>
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.className}`}>{status.label}</span>
      </header>

      {fromScript ? (
        <p className="text-xs text-muted">Made with the set_role script, so there are no application details.</p>
      ) : (
        <dl className="grid gap-1.5 text-xs">
          <div className="flex items-start gap-2">
            <dt><Building2 className="w-3.5 h-3.5 text-muted mt-px" aria-label="Department" /></dt>
            <dd className="text-navy">{official.official_department}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt><Briefcase className="w-3.5 h-3.5 text-muted mt-px" aria-label="Job title" /></dt>
            <dd className="text-navy">{official.official_job_title}</dd>
          </div>
          {official.applied_at && (
            <div className="flex items-start gap-2">
              <dt><CalendarClock className="w-3.5 h-3.5 text-muted mt-px" aria-label="Applied" /></dt>
              <dd className="text-muted">Applied {formatDate(official.applied_at)}</dd>
            </div>
          )}
        </dl>
      )}

      {official.reviewed_at && (
        <div className="text-xs rounded-xl bg-surface-canvas border border-border p-2.5 text-muted">
          <span className="font-semibold text-navy">
            {official.approval_status === APPROVAL.APPROVED ? 'Approved' : 'Rejected'} by {official.reviewed_by_name || 'an admin'}
          </span>{' '}
          on {formatDate(official.reviewed_at)}
          {official.review_note && <p className="mt-1 whitespace-pre-line text-navy">“{official.review_note}”</p>}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {official.approval_status !== APPROVAL.APPROVED && (
          <button type="button" className={btnPrimary} onClick={() => onReview('approve', official)}>
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Approve
          </button>
        )}
        {official.approval_status === APPROVAL.PENDING && (
          <button type="button" className={btnDanger} onClick={() => onReview('reject', official)}>
            <XCircle className="w-4 h-4" aria-hidden="true" />
            Reject
          </button>
        )}
        {official.approval_status === APPROVAL.APPROVED && (
          <button type="button" className={btnDanger} onClick={() => onReview('revoke', official)}>
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            Remove access
          </button>
        )}
      </div>
    </article>
  );
}
