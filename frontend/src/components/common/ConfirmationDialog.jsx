import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

/**
 * ConfirmationDialog
 * Accessible modal dialog for destructive or high-impact actions.
 */
export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isProcessing = false,
  onConfirm,
  onCancel,
  icon: Icon,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  const EffectiveIcon = Icon || (isDestructive ? AlertTriangle : Info);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-xl border border-border text-left">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isDestructive
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <EffectiveIcon className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-stone-400 hover:text-stone-600 rounded-lg p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 id="confirm-dialog-title" className="text-base sm:text-lg font-bold text-stone-900 mb-2">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 mb-6 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500'
            } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
