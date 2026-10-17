import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext } from '../../context/ToastContext';

/**
 * ToastItem
 * Individual toast notification with remaining time progress bar and dismiss button.
 */
function ToastItem({ toast, onDismiss }) {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    success: {
      border: 'border-emerald-300',
      bg: 'bg-surface',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      bar: 'bg-emerald-500',
    },
    error: {
      border: 'border-rose-300',
      bg: 'bg-surface',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
      bar: 'bg-rose-500',
    },
    info: {
      border: 'border-blue-300',
      bg: 'bg-surface',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
      bar: 'bg-blue-500',
    },
  };

  const style = variantStyles[toast.type] || variantStyles.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 20, scale: 0.9 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative w-[calc(100vw-2rem)] sm:w-96 max-w-md rounded-2xl border ${style.border} ${style.bg} shadow-lg p-3.5 overflow-hidden flex items-start gap-3 pointer-events-auto`}
      role="alert"
    >
      {style.icon}
      <div className="flex-1 min-w-0 pr-2">
        {toast.title && <div className="text-xs font-bold text-navy mb-0.5">{toast.title}</div>}
        <div className="text-xs text-muted leading-relaxed">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-lg text-muted hover:text-navy hover:bg-border/30 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar counting down 4 seconds */}
      {!shouldReduceMotion && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 4, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-1 ${style.bar} opacity-70`}
        />
      )}
    </motion.div>
  );
}

/**
 * ToastProvider
 * In-memory toast notification manager supporting success, error, and info alerts.
 */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Fixed Toast Container positioned bottom-right to avoid obscuring top navigation or primary action buttons */}
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col-reverse gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}
