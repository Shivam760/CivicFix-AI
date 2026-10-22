import React from 'react';
import { STATUS_CONFIG } from '../../constants/complaintStatuses';

/**
 * StatusBadge
 * Status pill used on every screen. Hover shows what the status means.
 */
export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    dotClass: 'bg-stone-500',
    description: '',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
      title={config.description}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
