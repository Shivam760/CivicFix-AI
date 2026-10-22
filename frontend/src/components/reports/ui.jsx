import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

/**
 * Small shared pieces so the report screens match the teammate's styling.
 */

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-canvas text-xs font-bold text-navy shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-surface-canvas border border-border text-xs sm:text-sm text-navy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60';

export const labelClass = 'block text-xs font-bold text-navy mb-1';

// A white card with a heading, like the teammate's dashboard panels.
export function Section({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`bg-surface rounded-2xl border border-border shadow-2xs p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-navy flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

export function NoteBox({ children, tone = 'info' }) {
  const tones = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    ai: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
  };
  return (
    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 leading-relaxed ${tones[tone] || tones.info}`}>
      <Info className="w-4 h-4 shrink-0 mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
