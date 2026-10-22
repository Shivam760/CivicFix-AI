import React from 'react';
import { Circle, Sparkles, Camera, CheckCircle2, AlertTriangle, Users, Send, Pencil, Flag } from 'lucide-react';
import { EVENT_LABELS } from '../../constants/complaintStatuses';
import { formatDate } from '../../utils/formatters';

const EVENT_ICONS = {
  report_created: Flag,
  report_updated: Pencil,
  report_status_changed: Circle,
  ai_analysis_completed: Sparkles,
  ai_analysis_failed: AlertTriangle,
  draft_created: Pencil,
  draft_edited: Pencil,
  draft_approved: CheckCircle2,
  approval_invalidated: AlertTriangle,
  evidence_added: Camera,
  verification_vote_recorded: Users,
  submission_requested: Send,
  submission_confirmed: Send,
  submission_failed: AlertTriangle,
  submission_unknown: AlertTriangle,
};

/**
 * ComplaintTimeline
 * The report's event history from GET /reports/{id}/events, oldest first.
 * Each event already has a readable `description` from the backend.
 */
export default function ComplaintTimeline({ events = [] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted">No history yet.</p>;
  }

  return (
    <ol className="relative space-y-4">
      {events.map((event, idx) => {
        const Icon = EVENT_ICONS[event.event_type] || Circle;
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3">
            {!isLast && <span className="absolute left-[13px] top-7 bottom-[-16px] w-px bg-border" aria-hidden="true" />}
            <span
              className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                isLast ? 'bg-primary text-white border-primary' : 'bg-surface text-primary border-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xs font-bold text-navy">
                  {EVENT_LABELS[event.event_type] || event.event_type}
                </span>
                <span className="text-[10.5px] text-muted tabular-nums">{formatDate(event.created_at)}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed break-words">{event.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
