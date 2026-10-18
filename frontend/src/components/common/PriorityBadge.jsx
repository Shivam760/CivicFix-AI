import React from 'react';
import { PRIORITY_CONFIG, PRIORITY_LEVELS } from '../../constants/complaintStatuses';

/**
 * PriorityBadge
 * Displays consistent urgency indicators (Low, Medium, High, Critical).
 */
export default function PriorityBadge({ priority, className = '' }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[PRIORITY_LEVELS.MEDIUM];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.indicatorClass}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
