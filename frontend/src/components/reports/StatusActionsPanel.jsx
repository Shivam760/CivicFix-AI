import React, { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Section, ErrorBox, NoteBox, btnPrimary, btnSecondary, btnDanger, inputClass, labelClass } from './ui';
import ConfirmationDialog from '../common/ConfirmationDialog';
import {
  REPORT_STATUS,
  STATUS_TRANSITIONS,
  STATUS_CONFIG,
  transitionLabel,
} from '../../constants/complaintStatuses';

/**
 * StatusActionsPanel (officials)
 * Buttons for the allowed status changes (api-contract.md section 4), with an
 * optional note that appears in the report's history. The backend checks the
 * same rules again, e.g. 409 REPAIR_PHOTO_REQUIRED.
 *
 * Props: report, busy, error, onChangeStatus(status, note) -> Promise<boolean>
 */
export default function StatusActionsPanel({ report, busy, error, onChangeStatus }) {
  const [note, setNote] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const targets = STATUS_TRANSITIONS[report.status] || [];

  const run = async (status) => {
    const ok = await onChangeStatus(status, note);
    if (ok) setNote('');
    setConfirmClose(false);
  };

  return (
    <Section title="Update status" icon={ArrowRightLeft}>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Current status: <strong className="text-navy">{STATUS_CONFIG[report.status]?.label}</strong>
        </p>

        {report.status === REPORT_STATUS.IN_PROGRESS && (
          <NoteBox tone="info">
            To claim the repair is done, first upload at least one after-repair photo (in the Photos panel).
            Nearby residents then check the repair. Only their votes can mark it resolved.
          </NoteBox>
        )}
        {report.status === REPORT_STATUS.AWAITING_VERIFICATION && (
          <NoteBox tone="info">
            Residents are checking your repair claim. You cannot resolve or close the report now, but you can
            withdraw the claim.
          </NoteBox>
        )}

        {targets.length === 0 ? (
          <p className="text-xs text-muted">This report is closed. No further changes are possible.</p>
        ) : (
          <>
            <div>
              <label htmlFor="status-note" className={labelClass}>
                Note (optional, shown in the history)
              </label>
              <input
                id="status-note"
                type="text"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Crew scheduled for Monday."
                className={inputClass}
                disabled={busy}
              />
            </div>
            <ErrorBox>{error}</ErrorBox>
            <div className="flex flex-wrap gap-2">
              {targets.map((to) =>
                to === REPORT_STATUS.CLOSED ? (
                  <button key={to} type="button" className={btnDanger} onClick={() => setConfirmClose(true)} disabled={busy}>
                    {transitionLabel(report.status, to)}
                  </button>
                ) : (
                  <button
                    key={to}
                    type="button"
                    className={to === REPORT_STATUS.IN_PROGRESS && report.status !== REPORT_STATUS.UNDER_REVIEW ? btnSecondary : btnPrimary}
                    onClick={() => run(to)}
                    disabled={busy}
                  >
                    {transitionLabel(report.status, to)}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmClose}
        title="Close this report?"
        message="Closing is final: the report cannot be reopened."
        confirmLabel="Close report"
        isDestructive
        isProcessing={busy}
        onConfirm={() => run(REPORT_STATUS.CLOSED)}
        onCancel={() => setConfirmClose(false)}
      />
    </Section>
  );
}
