import React, { useState } from 'react';
import { FileText, CheckCircle2, Send, Sparkles, Pencil } from 'lucide-react';
import { Section, NoteBox, ErrorBox, btnPrimary, btnSecondary, inputClass } from './ui';
import { SUBMISSION_STATUS_CONFIG, isLocked } from '../../constants/complaintStatuses';
import { formatDate } from '../../utils/formatters';

/**
 * DraftApprovalPanel
 * The complaint text that would be sent to an authority (api-contract.md
 * sections 6-7).
 *
 * Rules shown on screen:
 * - Drafts are never changed: each edit saves a new version.
 * - The citizen approves one exact version. A new version, a new AI analysis,
 *   or editing the report's details clears the approval.
 * - Submitting needs a valid approval. There is no real authority connection
 *   yet, so the backend answers 503 and nothing is sent.
 *
 * Props:
 *   report, drafts (newest first), locked (sent for submission or closed), busy, error, submitNotice
 *   onSaveDraft(text), onApprove(draftId), onSubmit()
 */
export default function DraftApprovalPanel({
  report,
  drafts,
  locked,
  busy,
  error,
  submitNotice,
  onSaveDraft,
  onApprove,
  onSubmit,
}) {
  const latest = drafts[0] || null;
  const isApproved = Boolean(latest && report.approved_draft_id === latest.id);
  const canSubmit = isApproved && ['not_submitted', 'failed'].includes(report.submission_status);
  const submission = SUBMISSION_STATUS_CONFIG[report.submission_status] || SUBMISSION_STATUS_CONFIG.not_submitted;

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEditing = () => {
    setText(latest?.text || '');
    setEditing(true);
  };

  const handleSave = async () => {
    const ok = await onSaveDraft(text);
    if (ok) setEditing(false);
  };

  return (
    <Section
      title="Complaint draft"
      icon={FileText}
      action={
        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${submission.className}`}>
          {submission.label}
        </span>
      }
    >
      <div className="space-y-3">
        <ErrorBox>{error}</ErrorBox>

        {editing ? (
          <div className="space-y-2">
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${inputClass} resize-y`}
              disabled={busy}
              aria-label="Complaint text"
            />
            {isApproved && (
              <NoteBox tone="warning">Saving a new version clears your current approval.</NoteBox>
            )}
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={handleSave} disabled={busy || !text.trim()}>
                {busy ? 'Saving...' : `Save as version ${(latest?.version || 0) + 1}`}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        ) : latest ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-bold text-navy">Version {latest.version}</span>
              {latest.source === 'ai' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  <Sparkles className="w-3 h-3" /> AI-generated suggestion
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  <Pencil className="w-3 h-3" /> Written by you
                </span>
              )}
              <span className="text-muted tabular-nums">{formatDate(latest.created_at)}</span>
            </div>
            <p className="text-xs sm:text-sm text-navy whitespace-pre-wrap leading-relaxed p-3 rounded-xl bg-surface-canvas border border-border">
              {latest.text}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            No draft yet. Ask for an AI suggestion above, or write the complaint yourself.
          </p>
        )}

        {/* Approval state */}
        {latest && !editing && (
          isApproved ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                You approved version {latest.version} on {formatDate(report.approved_at)}.
              </span>
            </div>
          ) : (
            !locked && (
              <p className="text-[11px] text-muted">
                Not approved. Read the text carefully: only an approved version can be sent.
              </p>
            )
          )
        )}

        {!editing && !locked && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={btnSecondary} onClick={startEditing} disabled={busy}>
              <Pencil className="w-3.5 h-3.5" />
              {latest ? 'Edit text' : 'Write draft'}
            </button>
            {latest && !isApproved && (
              <button type="button" className={btnPrimary} onClick={() => onApprove(latest.id)} disabled={busy}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve version {latest.version}
              </button>
            )}
            {canSubmit && (
              <button type="button" className={btnPrimary} onClick={onSubmit} disabled={busy}>
                <Send className="w-3.5 h-3.5" />
                {busy ? 'Sending...' : 'Send to authority'}
              </button>
            )}
          </div>
        )}

        {locked && (
          <NoteBox tone="info">
            {isLocked(report)
              ? 'This report was sent for submission, so its details, drafts and photos can no longer be changed.'
              : 'This report is closed, so its details, drafts and photos can no longer be changed.'}
            {report.external_reference && <> Reference from the authority: <strong>{report.external_reference}</strong>.</>}
          </NoteBox>
        )}

        {submitNotice && <NoteBox tone={submitNotice.tone}>{submitNotice.text}</NoteBox>}
      </div>
    </Section>
  );
}
