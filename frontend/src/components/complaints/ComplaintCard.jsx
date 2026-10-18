import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
  Clock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import CategoryIcon from '../icons3d/CategoryIcon';
import { formatDate } from '../../utils/formatters';

function getNextAction(complaint) {
  if (complaint.nextAction) return complaint.nextAction;
  switch (complaint.status) {
    case 'submitted':
      return 'Awaiting municipal intake & officer triage';
    case 'under_review':
      return complaint.aiAnalysis?.recommendedDepartment
        ? `Routing to ${complaint.aiAnalysis.recommendedDepartment}`
        : 'Evaluating priority & department assignment';
    case 'assigned':
      return `Dispatched to ${complaint.department || complaint.assignedDepartment || 'municipal field team'}`;
    case 'in_progress':
      return 'Active on-site inspection and repairs';
    case 'resolved':
      return 'Remediation completed & field-verified';
    case 'rejected':
      return 'Case reviewed and closed with remarks';
    default:
      return 'In municipal processing workflow';
  }
}

function getLatestUpdate(complaint) {
  if (complaint.latestUpdate) return complaint.latestUpdate;
  if (Array.isArray(complaint.updates) && complaint.updates.length > 0) {
    const last = complaint.updates[complaint.updates.length - 1];
    return last?.message || last?.note;
  }
  if (Array.isArray(complaint.timeline) && complaint.timeline.length > 0) {
    const recent = complaint.timeline[complaint.timeline.length - 1];
    return recent?.note || recent?.description || recent?.action || recent?.title;
  }
  if (complaint.resolutionNotes && complaint.status === 'resolved') {
    return complaint.resolutionNotes;
  }
  return null;
}

/**
 * ComplaintCard
 * High-clarity citizen grievance card displaying:
 * - Complaint ID and Civic Category icon
 * - Priority & Standard Status badges (submitted, under_review, assigned, in_progress, resolved)
 * - AI Triage / intake status indicators without blocking access
 * - Grievance Title & Location
 * - Clear Next Action indicator and Latest Update snippet
 * - Attached photographic evidence thumbnail with graceful image fallback
 * - Formatted submission date and direct "Track Complaint" CTA
 */
export default function ComplaintCard({ complaint, onSelect }) {
  const [imgError, setImgError] = useState(false);

  if (!complaint) return null;

  const hasPhoto = Boolean(complaint.attachmentUrl && !imgError);
  const nextAction = getNextAction(complaint);
  const latestUpdate = getLatestUpdate(complaint);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onSelect) onSelect(complaint);
    }
  };

  return (
    <Card
      variant="flat"
      tilt={true}
      onClick={() => onSelect && onSelect(complaint)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Track complaint ${complaint.id}: ${complaint.title}`}
      className="p-4 sm:p-5 flex flex-col justify-between cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div>
        {/* Top Header: Category Icon, Ticket ID & Status Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryIcon category={complaint.category} size={26} />
            <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 tabular-nums shrink-0">
              {complaint.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {complaint.aiStatus === 'pending' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-2.5 h-2.5 text-amber-600" />
                <span>AI Pending</span>
              </span>
            ) : complaint.aiAnalysis ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                <span>AI Triaged</span>
              </span>
            ) : complaint.status === 'submitted' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                <Clock className="w-2.5 h-2.5 text-stone-500" />
                <span>Awaiting Review</span>
              </span>
            ) : null}
            {complaint.priority && <PriorityBadge priority={complaint.priority} />}
            <StatusBadge status={complaint.status} />
          </div>
        </div>

        {/* Content Body with Optional Thumbnail */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-navy group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">
              {complaint.title}
            </h3>

            {/* Category & Location Details */}
            <div className="space-y-1 text-xs text-muted">
              <p className="font-semibold text-navy/80 truncate">
                {complaint.categoryLabel || complaint.category || 'Civic Infrastructure'}
              </p>
              {complaint.location && (
                <div className="flex items-start gap-1.5 text-[11.5px] text-muted">
                  <MapPin className="w-3.5 h-3.5 text-muted mt-0.5 shrink-0" />
                  <span className="line-clamp-1">
                    {complaint.location.address || complaint.location.ward || 'Bengaluru'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Evidence Thumbnail */}
          {hasPhoto ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface-canvas border border-border shrink-0 shadow-2xs group-hover:border-primary/40 transition-colors">
              <img
                src={complaint.attachmentUrl}
                alt={`Photo evidence for ${complaint.id}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImgError(true)}
                loading="lazy"
              />
              <span className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white backdrop-blur-xs">
                <ImageIcon className="w-2.5 h-2.5" />
              </span>
            </div>
          ) : complaint.hasAttachment ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-canvas border border-dashed border-border flex flex-col items-center justify-center text-muted shrink-0 text-[10px]">
              <ImageIcon className="w-4 h-4 mb-0.5 opacity-60" />
              <span>Evidence</span>
            </div>
          ) : null}
        </div>

        {/* Next Action & Latest Update Indicators */}
        <div className="mb-3 space-y-1.5 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[11px] text-navy">
            <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
              <ArrowRight className="w-3 h-3 text-emerald-700" />
              <span>Next</span>
            </span>
            <span className="truncate font-medium text-stone-700" title={nextAction}>
              {nextAction}
            </span>
          </div>

          {latestUpdate && (
            <div className="text-[11px] text-muted truncate flex items-center gap-1.5" title={latestUpdate}>
              <Activity className="w-3 h-3 text-muted shrink-0" />
              <span className="truncate italic">"{latestUpdate}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted font-medium mt-auto">
        <div className="flex items-center gap-1.5 tabular-nums text-muted">
          <Calendar className="w-3.5 h-3.5" />
          <span>Reported {formatDate(complaint.createdAt)}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
          <span>Track Complaint</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Card>
  );
}
