import React from 'react';
import { MapPin, Calendar, ChevronRight, ArrowRight, Lock } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import CategoryIcon from '../icons3d/CategoryIcon';
import { formatDate } from '../../utils/formatters';
import { categoryLabel } from '../../constants/civicCategories';
import { isLocked } from '../../constants/complaintStatuses';

// What happens next, in plain words, for each status.
function getNextStep(report) {
  switch (report.status) {
    case 'reported':
      return 'Waiting for an official to review it';
    case 'under_review':
      return 'An official is reviewing it';
    case 'in_progress':
      return 'Repair marked as started';
    case 'awaiting_verification':
      return 'Repair claimed: residents are checking it';
    case 'resolved':
      return 'Residents confirmed the repair';
    case 'closed':
      return 'Closed';
    default:
      return '';
  }
}

/**
 * ComplaintCard
 * One report in the dashboard grid (api-contract.md "Report object").
 */
export default function ComplaintCard({ complaint: report, onSelect }) {
  if (!report) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(report);
    }
  };

  return (
    <Card
      variant="flat"
      tilt={true}
      onClick={() => onSelect?.(report)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open report: ${report.title}`}
      className="p-4 sm:p-5 h-full flex flex-col justify-between cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon category={report.category || 'other'} size={26} />
            <span className="text-xs font-semibold text-navy/80 truncate">{categoryLabel(report.category)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isLocked(report) && (
              <span title="Sent for submission: editing is locked" className="text-muted">
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
            <StatusBadge status={report.status} />
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-navy group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">
          {report.title}
        </h3>
        <p className="text-xs text-muted line-clamp-2 mb-2">{report.description}</p>
        {report.location_text && (
          <div className="flex items-start gap-1.5 text-[11.5px] text-muted mb-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{report.location_text}</span>
          </div>
        )}

        <div className="mb-3 pt-2 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-navy">
          <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
            <ArrowRight className="w-3 h-3 text-emerald-700" />
            <span>Now</span>
          </span>
          <span className="truncate font-medium text-stone-700">{getNextStep(report)}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted font-medium mt-auto">
        <div className="flex items-center gap-1.5 tabular-nums">
          <Calendar className="w-3.5 h-3.5" />
          <span>Reported {formatDate(report.created_at)}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
          <span>Open</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
}
