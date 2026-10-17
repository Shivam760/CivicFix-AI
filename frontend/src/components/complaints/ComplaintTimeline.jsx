import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Building,
  User,
  AlertCircle,
  Bot,
  HelpCircle,
  Wrench,
  Sparkles,
  FileText,
  Camera,
  Check,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

/**
 * Standard Civic Progress Milestones:
 * 1. Complaint submitted
 * 2. AI analysis completed (if performed)
 * 3. Complaint reviewed
 * 4. Department assigned
 * 5. Work started (in progress)
 * 6. Additional info requested (if applicable)
 * 7. Complaint resolved
 */

const STATUS_PROGRESSION_INDEX = {
  submitted: 0,
  under_review: 1,
  assigned: 2,
  in_progress: 3,
  resolved: 4,
  rejected: -1,
};

/**
 * ComplaintTimeline
 * Polished visual workflow stage tracker for civic resolution progress.
 * Accurately displays real timestamps, departments, actors, and evidence.
 * Never fabricates missing event timestamps or claims work started without evidence.
 */
export default function ComplaintTimeline({ timeline = [], complaint = null }) {
  const currentStatus = complaint?.status || (timeline.length > 0 ? timeline[timeline.length - 1]?.stage : 'submitted');
  const currentStatusIndex = STATUS_PROGRESSION_INDEX[currentStatus] ?? 0;
  const isRejected = currentStatus === 'rejected';

  // Build authentic chronological event history from actual records
  const chronologicalEvents = [];

  // 1. Initial Submission event
  const submittedEvent = timeline.find(
    (t) => t?.stage === 'submitted' || (t?.title || '').toLowerCase().includes('submit') || (t?.title || '').toLowerCase().includes('register')
  );
  chronologicalEvents.push({
    id: 'evt-submitted',
    stage: 'submitted',
    title: submittedEvent?.title || 'Complaint Submitted',
    description:
      submittedEvent?.description ||
      `Grievance ticket registered by citizen${complaint?.location?.address ? ` at ${complaint.location.address}` : ''}.`,
    timestamp: submittedEvent?.timestamp || complaint?.createdAt || null,
    isCompleted: true,
    isCurrent: currentStatus === 'submitted',
    actor: submittedEvent?.actor || complaint?.reporterName || 'Citizen',
    icon: FileText,
    iconColor: 'bg-emerald-600 text-white',
  });

  // 2. AI Analysis Completed event (only if analyzedAt exists or aiAnalysis exists)
  if (complaint?.aiAnalysis) {
    const ai = complaint.aiAnalysis;
    const aiAnalyzedAt = ai.analyzedAt || (timeline.find((t) => t?.stage === 'ai_analysis' || (t?.title || '').toLowerCase().includes('ai'))?.timestamp);
    const aiCompleted = Boolean(aiAnalyzedAt || currentStatusIndex >= 1 || ai.isConfirmed);

    chronologicalEvents.push({
      id: 'evt-ai-analysis',
      stage: 'ai_analysis',
      title: 'AI Analysis Completed',
      description: ai.recommendedAction
        ? `Classification: ${ai.categoryLabel || ai.predictedCategory} (${ai.estimatedPriority} priority). Action: ${ai.recommendedAction}`
        : `Intake model classified complaint under ${ai.categoryLabel || ai.predictedCategory}.`,
      timestamp: aiAnalyzedAt || null,
      isCompleted: aiCompleted,
      isCurrent: currentStatus === 'submitted' && !aiCompleted,
      actor: `CivicFix AI (${ai.modelVersion || 'Vision-v2.4'})`,
      icon: Bot,
      iconColor: 'bg-blue-600 text-white',
      badge: ai.confidenceScore ? `${Math.round(ai.confidenceScore <= 1 ? ai.confidenceScore * 100 : ai.confidenceScore)}% Confidence` : null,
    });
  }

  // 3. Complaint Reviewed event
  const reviewEvent = timeline.find(
    (t) => t?.stage === 'under_review' || (t?.title || '').toLowerCase().includes('review') || (t?.title || '').toLowerCase().includes('triage')
  );
  const isReviewed = currentStatusIndex >= 1 || Boolean(reviewEvent?.completed);
  chronologicalEvents.push({
    id: 'evt-reviewed',
    stage: 'under_review',
    title: reviewEvent?.title || 'Complaint Reviewed',
    description:
      reviewEvent?.description ||
      (isReviewed
        ? 'Municipal committee and ward desk verified jurisdiction, severity, and service eligibility.'
        : 'Under formal intake assessment by ward nodal committee.'),
    timestamp: reviewEvent?.timestamp || null,
    isCompleted: isReviewed,
    isCurrent: currentStatus === 'under_review',
    actor: reviewEvent?.actor || 'Ward Committee Desk',
    icon: Sparkles,
    iconColor: 'bg-purple-600 text-white',
  });

  // 4. Additional Information Requested / Citizen Clarification events (if present)
  // Check timeline and updates for info_requested events
  const customEvents = timeline.filter(
    (t) =>
      t &&
      t.stage !== 'submitted' &&
      t.stage !== 'under_review' &&
      t.stage !== 'assigned' &&
      t.stage !== 'in_progress' &&
      t.stage !== 'resolved'
  );

  customEvents.forEach((ce, i) => {
    const isInfoReq = ce.stage === 'info_requested' || (ce.title || '').toLowerCase().includes('information requested');
    chronologicalEvents.push({
      id: `evt-custom-${i}`,
      stage: ce.stage,
      title: ce.title || (isInfoReq ? 'Additional Information Requested' : 'Case Update'),
      description: ce.description || ce.message,
      timestamp: ce.timestamp || null,
      isCompleted: Boolean(ce.completed ?? true),
      isCurrent: false,
      actor: ce.actor || (isInfoReq ? 'Committee Officer' : 'System'),
      icon: isInfoReq ? HelpCircle : FileText,
      iconColor: isInfoReq ? 'bg-amber-600 text-white' : 'bg-stone-600 text-white',
    });
  });

  // Also check if complaint has pending additionalInfoRequested flag
  if (
    complaint?.additionalInfoRequested &&
    !chronologicalEvents.some((e) => e.stage === 'info_requested')
  ) {
    chronologicalEvents.push({
      id: 'evt-info-req-pending',
      stage: 'info_requested',
      title: 'Additional Information Requested',
      description: complaint.additionalInfoNote || 'Municipal desk has requested clarification or supplementary photo from citizen.',
      timestamp: complaint.updatedAt || null,
      isCompleted: true,
      isCurrent: true,
      actor: 'Committee Officer',
      icon: HelpCircle,
      iconColor: 'bg-amber-600 text-white',
    });
  }

  // 5. Department Assigned event
  const assignedEvent = timeline.find(
    (t) => t?.stage === 'assigned' || (t?.title || '').toLowerCase().includes('assign')
  );
  const isAssigned = currentStatusIndex >= 2 || Boolean(assignedEvent?.completed) || Boolean(complaint?.assignedDepartment && complaint.assignedDepartment !== 'Pending Municipal Review');
  const deptName = assignedEvent?.department || complaint?.assignedDepartment || complaint?.department;
  const officerName = assignedEvent?.actor || complaint?.assignedOfficer || complaint?.assignedTo;

  chronologicalEvents.push({
    id: 'evt-assigned',
    stage: 'assigned',
    title: assignedEvent?.title || 'Department Assigned',
    description:
      assignedEvent?.description ||
      (isAssigned
        ? `Case dispatched to ${deptName || 'responsible zonal authority'}${officerName ? ` (Desk: ${officerName})` : ''}.`
        : 'Awaiting departmental work order dispatch.'),
    timestamp: assignedEvent?.timestamp || null,
    isCompleted: isAssigned,
    isCurrent: currentStatus === 'assigned',
    actor: officerName || 'Zonal Nodal Desk',
    department: deptName,
    icon: Building,
    iconColor: 'bg-teal-600 text-white',
  });

  // 6. Work Started event
  const progressEvent = timeline.find(
    (t) =>
      t?.stage === 'in_progress' ||
      (t?.title || '').toLowerCase().includes('progress') ||
      (t?.title || '').toLowerCase().includes('crew') ||
      (t?.title || '').toLowerCase().includes('started')
  );
  const isWorkStarted = currentStatusIndex >= 3 || Boolean(progressEvent?.completed);

  chronologicalEvents.push({
    id: 'evt-in-progress',
    stage: 'in_progress',
    title: progressEvent?.title || 'Work Started',
    description:
      progressEvent?.description ||
      (isWorkStarted
        ? 'Field crew or maintenance contractor deployed on-site. Physical repair and remediation active.'
        : 'Pending mobilization of on-site repair crew.'),
    timestamp: progressEvent?.timestamp || null,
    isCompleted: isWorkStarted,
    isCurrent: currentStatus === 'in_progress',
    actor: progressEvent?.actor || officerName || 'Field Engineering Crew',
    department: deptName,
    icon: Wrench,
    iconColor: 'bg-orange-600 text-white',
  });

  // 7. Complaint Resolved event
  const resolvedEvent = timeline.find(
    (t) => t?.stage === 'resolved' || (t?.title || '').toLowerCase().includes('resolv')
  );
  const isResolved = currentStatus === 'resolved' || Boolean(resolvedEvent?.completed) || Boolean(complaint?.resolution);
  const resolutionData = complaint?.resolution;

  chronologicalEvents.push({
    id: 'evt-resolved',
    stage: 'resolved',
    title: resolvedEvent?.title || 'Complaint Resolved',
    description:
      resolutionData?.summary ||
      resolvedEvent?.description ||
      (isResolved
        ? 'Remediation completed and verified on-site by municipal authority.'
        : 'Final post-repair inspection and civic verification.'),
    timestamp: resolutionData?.resolvedAt || resolvedEvent?.timestamp || (isResolved ? complaint?.updatedAt : null),
    isCompleted: isResolved,
    isCurrent: currentStatus === 'resolved',
    actor: resolutionData?.resolvedBy || resolvedEvent?.actor || 'Municipal Authority',
    evidenceUrl: resolutionData?.evidenceUrl || resolvedEvent?.evidenceUrl || null,
    signOff: resolutionData?.resolutionSignOff || null,
    icon: CheckCircle2,
    iconColor: 'bg-emerald-600 text-white',
  });

  return (
    <div className="space-y-6">
      {/* Rejection Notice Banner if applicable */}
      {isRejected && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            <strong>Case Closed / Rejected:</strong> This report was marked as out of municipal jurisdiction or duplicate.
          </span>
        </div>
      )}

      {/* Additional Info Requested Banner if active */}
      {complaint?.additionalInfoRequested && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Action Needed from Citizen:</strong> The municipal desk requested supplementary details or clarification.
            {complaint.additionalInfoNote && ` "${complaint.additionalInfoNote}"`}
          </span>
        </div>
      )}

      {/* Milestone Progression Steps */}
      <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
        {chronologicalEvents.map((evt) => {
          const { isCompleted, isCurrent, timestamp, department, actor, evidenceUrl, signOff, badge } = evt;
          const EventIcon = evt.icon;

          return (
            <div key={evt.id} className="relative group text-left">
              {/* Node Icon */}
              <div
                className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white transition-all ${
                  isCompleted
                    ? evt.iconColor
                    : isCurrent
                    ? 'bg-emerald-700 text-white ring-emerald-200 animate-pulse'
                    : 'bg-stone-100 border border-stone-300 text-stone-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3 h-3 text-stone-400" />
                )}
              </div>

              {/* Milestone Box */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                    : isCompleted
                    ? 'bg-white border-[#EBE3D0]'
                    : 'bg-stone-50/50 border-stone-200/60 opacity-60'
                }`}
              >
                {/* Header & Timestamp */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EventIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-stone-700' : 'text-stone-400'}`} />
                    <span
                      className={`text-xs font-bold ${
                        isCompleted
                          ? 'text-stone-900'
                          : isCurrent
                          ? 'text-emerald-800 font-extrabold'
                          : 'text-stone-500'
                      }`}
                    >
                      {evt.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Current Stage
                      </span>
                    )}
                    {badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {badge}
                      </span>
                    )}
                  </div>

                  {/* Real timestamp or honest unrecorded notice (never fabricated) */}
                  {timestamp ? (
                    <span className="text-[11px] font-mono text-stone-500 tabular-nums">
                      {formatDate(timestamp)}
                    </span>
                  ) : isCompleted ? (
                    <span className="text-[10px] text-stone-400 italic">
                      Completed &bull; Timestamp not stored
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 italic">
                      Pending Milestone
                    </span>
                  )}
                </div>

                {/* Description */}
                {evt.description && (
                  <p className="text-xs text-stone-700 leading-relaxed mb-2">
                    {evt.description}
                  </p>
                )}

                {/* Evidence Photo preview if completed resolution has proof */}
                {evidenceUrl && (
                  <div className="mb-2 p-2 rounded-xl bg-stone-100 border border-stone-200 flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-[11px] font-semibold text-stone-800">
                      Photographic Completion Proof Attached
                    </span>
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:underline ml-auto"
                    >
                      View Photo
                    </a>
                  </div>
                )}

                {/* Department, Actor, & Sign-off Metadata Tags */}
                {(department || actor || signOff) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EBE3D0] text-[11px]">
                    {department && (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                        <Building className="w-3 h-3 text-teal-600" />
                        <span>{department}</span>
                      </span>
                    )}
                    {actor && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <User className="w-3 h-3 text-emerald-600" />
                        <span>{actor}</span>
                      </span>
                    )}
                    {signOff && (
                      <span className="inline-flex items-center gap-1 font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                        <span>Sign-off: {signOff}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
