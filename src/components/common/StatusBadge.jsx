import React from 'react';
import { STATUS_CONFIG, COMPLAINT_STATUS } from '../../constants/complaintStatuses';

/**
 * StatusBadge
 * Displays consistent, accessible status pills across all dashboards.
 */
export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[COMPLAINT_STATUS.SUBMITTED];

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
