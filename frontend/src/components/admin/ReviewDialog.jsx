import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { ErrorBox, btnPrimary, btnSecondary, inputClass, labelClass } from '../reports/ui';

const NOTE_MAX = 500;
// btnPrimary in red: swap its colour classes (adding a second bg- class would not win reliably).
const btnReject = btnPrimary
  .replace('bg-primary hover:bg-emerald-600', 'bg-rose-600 hover:bg-rose-700')
  .replace('focus-visible:ring-primary', 'focus-visible:ring-rose-500');

const COPY = {
  approve: {
    title: 'Approve this official?',
    body: 'They can use the official pages from their next click. Only approve after you have confirmed their job with the department.',
    label: 'Note (optional)',
    placeholder: 'e.g. Confirmed by phone with the Roads department.',
    confirm: 'Approve',
  },
  reject: {
    title: 'Reject this application?',
    body: 'The account is kept. The official sees your note and can correct their details and apply again.',
    label: 'Note for the official (required)',
    placeholder: 'e.g. We could not confirm your job. Please give your full department name.',
    confirm: 'Reject',
  },
  revoke: {
    title: 'Remove this official’s access?',
    body: 'They can no longer use the official pages. Their earlier work stays in the report history. They see your note and can apply again.',
    label: 'Note for the official (required)',
    placeholder: 'e.g. You have left the department.',
    confirm: 'Remove access',
  },
};

/**
 * ReviewDialog
 * Asks the admin to confirm an approve / reject / remove-access decision,
 * with a note. A note is required unless approving (the backend checks too).
 * Open it by passing mode + official; close it by passing neither. It stays
 * mounted, so it can fade out; each decision gets a fresh, empty note.
 */
export default function ReviewDialog({ mode, official, processing, error, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {mode && official && (
        <DialogPanel
          key={`${mode}-${official.id}`}
          mode={mode}
          official={official}
          processing={processing}
          error={error}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </AnimatePresence>
  );
}

function DialogPanel({ mode, official, processing, error, onConfirm, onCancel }) {
  const reduce = useReducedMotion();
  const [note, setNote] = useState('');
  const textareaRef = useRef(null);
  const copy = COPY[mode];
  const noteRequired = mode !== 'approve';
  const canConfirm = !processing && (!noteRequired || note.trim().length > 0);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !processing) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [processing, onCancel]);

  const submit = (e) => {
    e.preventDefault();
    if (canConfirm) onConfirm(note);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
    >
      <motion.form
        onSubmit={submit}
        className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-xl border border-border text-left space-y-4"
        initial={reduce ? false : { scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={reduce ? undefined : { scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              mode === 'approve'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
          >
            {mode === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="text-stone-400 hover:text-stone-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 id="review-dialog-title" className="text-base sm:text-lg font-bold text-navy">
            {copy.title}
          </h3>
          <p className="text-sm font-semibold text-navy mt-1">
            {official.name} <span className="font-normal text-muted">· {official.email}</span>
          </p>
          <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">{copy.body}</p>
        </div>

        <div>
          <label htmlFor="review-note" className={labelClass}>
            {copy.label}
          </label>
          <textarea
            id="review-note"
            ref={textareaRef}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.placeholder}
            className={`${inputClass} resize-y`}
            disabled={processing}
            required={noteRequired}
          />
          <div className="text-[11px] text-muted text-right mt-1">
            {note.length}/{NOTE_MAX}
          </div>
        </div>

        <ErrorBox>{error}</ErrorBox>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button type="button" onClick={onCancel} disabled={processing} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={!canConfirm} className={mode === 'approve' ? btnPrimary : btnReject}>
            {processing ? 'Saving…' : copy.confirm}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
