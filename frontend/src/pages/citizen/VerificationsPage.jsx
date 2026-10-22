import React, { useCallback, useEffect, useState } from 'react';
import { Users, CheckCircle2, XCircle, MapPin, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import CategoryIcon from '../../components/icons3d/CategoryIcon';
import EvidencePhoto from '../../components/reports/EvidencePhoto';
import HomeLocationCard from '../../components/reports/HomeLocationCard';
import { Section, ErrorBox, NoteBox, btnPrimary, btnSecondary, btnDanger } from '../../components/reports/ui';
import { useToast } from '../../context/ToastContext';
import { errorText } from '../../services/apiClient';
import { fetchCurrentUser } from '../../services/authService';
import { listVerifications, castVote, fetchVerificationFile } from '../../services/verificationService';
import { ROLES } from '../../constants/roles';
import { categoryLabel } from '../../constants/civicCategories';
import { STATUS_CONFIG } from '../../constants/complaintStatuses';
import { formatDate } from '../../utils/formatters';

/**
 * VerificationCard
 * One claimed repair (api-contract.md section 11). Vote counts are not shown,
 * so earlier votes don't influence this one.
 */
function VerificationCard({ item, onVote }) {
  const repairPhotos = item.evidence.filter((e) => e.kind === 'repair_photo');
  const problemPhotos = item.evidence.filter((e) => e.kind === 'report_photo');

  const photoRow = (photos, title) =>
    photos.length > 0 && (
      <div className="space-y-1.5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{title}</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((ev) => (
            <EvidencePhoto
              key={ev.id}
              load={() => fetchVerificationFile(item.report_id, ev.id)}
              alt={ev.description || title}
              className="w-full aspect-square rounded-lg"
            />
          ))}
        </div>
      </div>
    );

  return (
    <Section>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon category={item.category || 'other'} size={26} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-navy">{item.title}</h3>
              <p className="text-[11px] text-muted">
                {categoryLabel(item.category)} ·{' '}
                {item.is_own_report ? 'Your report' : item.distance_km != null ? `${item.distance_km} km from your home` : 'Nearby'}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-muted tabular-nums">Repair claimed {formatDate(item.awaiting_since)}</span>
        </div>

        <p className="text-xs text-navy leading-relaxed">{item.description}</p>
        {item.location_text && (
          <p className="text-xs text-muted flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-px shrink-0" /> {item.location_text}
          </p>
        )}

        {photoRow(problemPhotos, 'Problem (before)')}
        {photoRow(repairPhotos, "Official's repair photos (their claim)")}

        <div className="pt-3 border-t border-border">
          {item.my_vote ? (
            <p className="text-xs font-semibold text-navy">
              You voted: {item.my_vote === 'fixed' ? 'Fixed' : 'Still broken'}. Votes cannot be changed.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-navy mr-1">Is it really fixed?</span>
              <button type="button" className={btnPrimary} onClick={() => onVote(item, 'fixed')}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Yes, fixed
              </button>
              <button type="button" className={btnDanger} onClick={() => onVote(item, 'still_broken')}>
                <XCircle className="w-3.5 h-3.5" /> No, still broken
              </button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

export default function VerificationsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingVote, setPendingVote] = useState(null); // { item, verdict }
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    const res = await listVerifications();
    if (res.ok) {
      setItems(res.data.items);
      setError('');
    } else {
      setError(errorText(res.error));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCurrentUser(); // refresh the saved home location
    load();
  }, [load]);

  const confirmVote = async () => {
    const { item, verdict } = pendingVote;
    setVoting(true);
    const res = await castVote(item.report_id, verdict);
    setVoting(false);
    setPendingVote(null);
    if (res.ok) {
      const label = STATUS_CONFIG[res.data.report_status]?.label || res.data.report_status;
      showToast({ type: 'success', title: 'Vote recorded', message: `The report is now: ${label}.` });
    } else {
      showToast({ type: 'error', title: 'Vote not recorded', message: errorText(res.error) });
    }
    load();
  };

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="Verify repairs"
      subtitle="Officials say these problems are fixed. Check them in person and vote."
      primaryAction={
        <button type="button" className={btnSecondary} onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      }
    >
      <div className="space-y-5">
        <HomeLocationCard onSaved={load} />

        <NoteBox tone="info">
          Two "fixed" votes mark a report resolved; two "still broken" votes (or the reporter's own) send it back
          to the official. Please vote only after looking at the place yourself.
        </NoteBox>

        <ErrorBox>{error}</ErrorBox>
        {loading ? (
          <LoadingState message="Loading repairs to check..." cardsCount={2} />
        ) : items.length === 0 && !error ? (
          <EmptyState
            title="Nothing to check right now"
            description="A report appears here only after an official says it is repaired (status: Awaiting verification). You see your own reports, and other people's reports within 2 km of your saved home."
            icon={Users}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <VerificationCard key={item.report_id} item={item} onVote={(it, verdict) => setPendingVote({ item: it, verdict })} />
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={Boolean(pendingVote)}
        title={pendingVote?.verdict === 'fixed' ? 'Vote "fixed"?' : 'Vote "still broken"?'}
        message="You can vote once for this repair, and the vote cannot be changed."
        confirmLabel="Cast vote"
        isDestructive={pendingVote?.verdict === 'still_broken'}
        isProcessing={voting}
        onConfirm={confirmVote}
        onCancel={() => setPendingVote(null)}
      />
    </DashboardLayout>
  );
}
