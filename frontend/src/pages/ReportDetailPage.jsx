import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, History, Pencil, Lock, XCircle, UserRound } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingState from '../components/common/LoadingState';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import CategoryIcon from '../components/icons3d/CategoryIcon';
import ComplaintTimeline from '../components/complaints/ComplaintTimeline';
import ReportPhotos from '../components/reports/ReportPhotos';
import AiSuggestionPanel from '../components/reports/AiSuggestionPanel';
import DraftApprovalPanel from '../components/reports/DraftApprovalPanel';
import StatusActionsPanel from '../components/reports/StatusActionsPanel';
import ReportEditForm from '../components/reports/ReportEditForm';
import SharingPanel from '../components/reports/SharingPanel';
import { Section, ErrorBox, NoteBox, btnSecondary, btnDanger } from '../components/reports/ui';
import { useToast } from '../context/ToastContext';
import { errorText } from '../services/apiClient';
import { getActiveRole } from '../services/authService';
import * as api from '../services/reportService';
import { ROLES, ROLE_PATHS } from '../constants/roles';
import { categoryLabel } from '../constants/civicCategories';
import { STATUS_CONFIG, isLocked, ownerCanClose, REPORT_STATUS } from '../constants/complaintStatuses';
import { formatDate } from '../utils/formatters';

/**
 * ReportDetailPage
 * One report. Citizens can only open their own reports (others are 404), so
 * a citizen here is always the owner. Officials see every report and get the
 * status and repair-photo tools instead of drafts and AI.
 */
export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const role = getActiveRole();
  const isOfficial = role === ROLES.OFFICIAL;
  const backPath = ROLE_PATHS[role];

  const [report, setReport] = useState(null);
  const [events, setEvents] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [authorities, setAuthorities] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Which action is running, and the last error for each panel.
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const [submitNotice, setSubmitNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const setError = (panel, message) => setErrors((prev) => ({ ...prev, [panel]: message }));

  // Load everything this role may see. Called again after each change, so
  // the screen always shows what the backend actually saved.
  const load = useCallback(async () => {
    const reportRes = await api.getReport(id);
    if (!reportRes.ok) {
      setLoadError(errorText(reportRes.error));
      setLoading(false);
      return;
    }
    const requests = [api.listReportEvents(id), api.listEvidence(id)];
    if (!isOfficial) {
      requests.push(api.listDrafts(id), api.getLatestAnalysis(id), api.listAuthorities());
    }
    const [eventsRes, evidenceRes, draftsRes, analysisRes, authRes] = await Promise.all(requests);

    setReport(reportRes.data);
    setEvents(eventsRes.ok ? eventsRes.data.items : []);
    setEvidence(evidenceRes.ok ? evidenceRes.data.items : []);
    if (!isOfficial) {
      setDrafts(draftsRes.ok ? draftsRes.data.items : []);
      // 404 ANALYSIS_NOT_FOUND just means it was never analysed.
      setAnalysis(analysisRes.ok ? analysisRes.data : null);
      setAuthorities(authRes.ok ? authRes.data.items : []);
    }
    setLoadError('');
    setLoading(false);
  }, [id, isOfficial]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one action: marks it busy, shows its error, reloads on success.
  const runAction = async (panel, request, successMessage) => {
    setBusy(panel);
    setError(panel, '');
    const res = await request();
    if (res.ok) {
      if (successMessage) showToast({ type: 'success', title: successMessage, message: '' });
      await load();
    } else {
      setError(panel, errorText(res.error));
    }
    setBusy('');
    return res;
  };

  if (loading) {
    return (
      <DashboardLayout activeRole={role}>
        <LoadingState message="Loading report..." cardsCount={2} />
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout activeRole={role} title="Report">
        <ErrorBox>{loadError}</ErrorBox>
        <Link to={backPath} className={`${btnSecondary} mt-4`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </DashboardLayout>
    );
  }

  const locked = isLocked(report);
  // Closed is final, so a closed report is read-only too (nothing left to edit or send).
  const closed = report.status === REPORT_STATUS.CLOSED;
  const readOnly = locked || closed;
  const lockedReason = locked
    ? 'This report was sent for submission, so new photos cannot be added.'
    : closed
    ? 'This report is closed, so new photos cannot be added.'
    : '';

  // --- Owner actions --------------------------------------------------------

  const handleSaveEdit = async (changes) => {
    const res = await runAction('edit', () => api.updateReport(id, changes), 'Report updated');
    if (res.ok) setEditing(false);
    return res.ok;
  };

  const handleAnalyze = () => runAction('ai', () => api.analyzeReport(id), 'AI suggestion ready');

  const handleApplyCategory = (category) =>
    runAction('ai', () => api.updateReport(id, { category }), 'Category updated');

  const handleApplyAuthority = (authorityId) =>
    runAction('ai', () => api.updateReport(id, { authority_id: authorityId }), 'Authority updated');

  const handleSaveDraft = async (text) => {
    const res = await runAction('draft', () => api.saveDraft(id, text), 'New draft version saved');
    return res.ok;
  };

  const handleApprove = (draftId) => runAction('draft', () => api.approveDraft(id, draftId), 'Draft approved');

  // The outcome is shown exactly as the backend reports it.
  const handleSubmit = async () => {
    setSubmitNotice(null);
    const res = await runAction('draft', () => api.submitReport(id));
    if (res.ok) {
      const status = res.data.submission_status;
      setSubmitNotice(
        status === 'confirmed'
          ? { tone: 'info', text: `The authority confirmed receipt. Reference: ${res.data.external_reference}.` }
          : status === 'pending'
          ? { tone: 'warning', text: 'Sent, but the authority has not confirmed receipt yet.' }
          : { tone: 'warning', text: 'The outcome could not be determined. The report is locked so it is not sent twice.' }
      );
    } else if (res.error.code === 'SUBMISSION_UNAVAILABLE') {
      setError('draft', '');
      setSubmitNotice({
        tone: 'warning',
        text: 'Nothing was sent: CivicFix is not connected to any authority yet. Your approved draft is saved.',
      });
    }
  };

  // After withdrawing, go back to the list (where closed reports are hidden).
  const handleWithdraw = async () => {
    setBusy('withdraw');
    setError('withdraw', '');
    const res = await api.changeReportStatus(id, REPORT_STATUS.CLOSED, 'Withdrawn by the reporter.');
    setBusy('');
    setConfirmWithdraw(false);
    if (res.ok) {
      showToast({ type: 'success', title: 'Report withdrawn', message: 'It is closed and hidden from your list.' });
      navigate(backPath);
    } else {
      setError('withdraw', errorText(res.error));
    }
  };

  const handleSaveSharing = async (shared, showName) => {
    const message = shared ? 'Shared with nearby residents' : 'Sharing saved';
    const res = await runAction('sharing', () => api.setSharing(id, shared, showName), message);
    return res.ok;
  };

  // --- Official actions -----------------------------------------------------

  const handleChangeStatus = async (status, note) => {
    const res = await runAction('status', () => api.changeReportStatus(id, status, note), `Status: ${STATUS_CONFIG[status]?.label}`);
    return res.ok;
  };

  const uploadWith = (upload) => async (file, description) => {
    const res = await upload(id, file, description);
    if (res.ok) {
      showToast({ type: 'success', title: 'Photo uploaded', message: '' });
      await load();
    }
    return res;
  };

  return (
    <DashboardLayout
      activeRole={role}
      title={report.title}
      subtitle={STATUS_CONFIG[report.status]?.description}
      breadcrumbs={[
        { label: isOfficial ? 'All reports' : 'My reports', to: backPath },
        { label: 'Report' },
      ]}
      primaryAction={
        <Link to={backPath} className={btnSecondary}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <Section
            title="Details"
            icon={Pencil}
            action={
              !isOfficial && !readOnly && !editing && (
                <button type="button" className={btnSecondary} onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )
            }
          >
            {editing ? (
              <ReportEditForm
                report={report}
                busy={busy === 'edit'}
                error={errors.edit}
                onSave={handleSaveEdit}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={report.status} />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
                    <CategoryIcon category={report.category || 'other'} size={20} />
                    {categoryLabel(report.category)}
                  </span>
                  {locked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
                <p className="text-sm text-navy whitespace-pre-wrap leading-relaxed">{report.description}</p>
                <div className="space-y-1 text-xs text-muted">
                  {report.location_text && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 mt-px shrink-0" /> {report.location_text}
                    </p>
                  )}
                  <p className="tabular-nums">
                    {report.latitude != null && report.longitude != null
                      ? `Coordinates: ${report.latitude}, ${report.longitude}`
                      : 'No coordinates: only the reporter can confirm a repair.'}
                  </p>
                  <p className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5" /> Reported {formatDate(report.created_at)} · updated{' '}
                    {formatDate(report.updated_at)}
                  </p>
                  {isOfficial && (
                    <p className="flex items-center gap-1.5">
                      <UserRound className="w-3.5 h-3.5" />
                      Reported by {report.reporter_name || 'an anonymous resident'}
                      {report.support_count > 0 &&
                        ` · ${report.support_count} resident${report.support_count === 1 ? '' : 's'} nearby see${report.support_count === 1 ? 's' : ''} this too`}
                    </p>
                  )}
                </div>

                {!isOfficial && ownerCanClose(report.status) && (
                  <div className="pt-2 border-t border-border">
                    <button type="button" className={btnDanger} onClick={() => setConfirmWithdraw(true)}>
                      <XCircle className="w-3.5 h-3.5" /> Withdraw report
                    </button>
                    <ErrorBox>{errors.withdraw}</ErrorBox>
                  </div>
                )}
                {!isOfficial && report.status === REPORT_STATUS.AWAITING_VERIFICATION && (
                  <NoteBox tone="info">
                    An official says this is repaired. Please check it and vote on the{' '}
                    <Link to="/citizen/verifications" className="font-bold underline">Verify repairs</Link> page.
                  </NoteBox>
                )}
              </div>
            )}
          </Section>

          {isOfficial && (
            <StatusActionsPanel report={report} busy={busy === 'status'} error={errors.status} onChangeStatus={handleChangeStatus} />
          )}

          {!isOfficial && (
            <>
              <SharingPanel
                key={`${report.shared_at}-${report.show_name}`}
                report={report}
                busy={busy === 'sharing'}
                error={errors.sharing}
                onSave={handleSaveSharing}
              />
              <AiSuggestionPanel
                analysis={analysis}
                report={report}
                authorities={authorities}
                locked={readOnly}
                busy={busy === 'ai'}
                error={errors.ai}
                onAnalyze={handleAnalyze}
                onApplyCategory={handleApplyCategory}
                onApplyAuthority={handleApplyAuthority}
              />
              <DraftApprovalPanel
                report={report}
                drafts={drafts}
                locked={readOnly}
                busy={busy === 'draft'}
                error={errors.draft}
                submitNotice={submitNotice}
                onSaveDraft={handleSaveDraft}
                onApprove={handleApprove}
                onSubmit={handleSubmit}
              />
            </>
          )}

          <ReportPhotos
            evidence={evidence}
            loadFile={(evidenceId) => api.fetchEvidenceFile(id, evidenceId)}
            canAddReportPhoto={!isOfficial && !readOnly}
            canAddRepairPhoto={isOfficial && report.status === REPORT_STATUS.IN_PROGRESS}
            onUploadReportPhoto={uploadWith(api.uploadReportPhoto)}
            onUploadRepairPhoto={uploadWith(api.uploadRepairPhoto)}
            lockedReason={!isOfficial ? lockedReason : ''}
          />
        </div>

        <div className="space-y-5">
          <Section title="History" icon={History}>
            <ComplaintTimeline events={events} />
          </Section>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmWithdraw}
        title="Withdraw this report?"
        message="The report will be closed. Closing is final and cannot be undone."
        confirmLabel="Withdraw report"
        isDestructive
        isProcessing={busy === 'withdraw'}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </DashboardLayout>
  );
}
