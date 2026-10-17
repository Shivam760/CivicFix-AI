import React from 'react';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  AlertTriangle,
  Building2,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Cpu,
  Layers,
  Clock,
  Copy,
} from 'lucide-react';
import PriorityBadge from '../common/PriorityBadge';
import { formatDate } from '../../utils/formatters';

/**
 * AiCaseInsightsPanel
 * Visually distinct operational panel displaying AI-assisted complaint triage,
 * model confidence, predicted category, severity, and department recommendations.
 * 
 * BACKEND INTEGRATION:
 * Consumes AI inference outputs from:
 * - GET /api/v1/complaints/{id}/ai-insights
 * - POST /api/v1/committee/complaints/{id}/apply-ai
 * 
 * Distinguishes AI-generated suggestions from confirmed administrative decisions.
 * When AI service is offline or pending for a case, presents a clean civic empty state
 * specifying the exact API endpoint required.
 */
export default function AiCaseInsightsPanel({
  complaint,
  onReviewRecommendation,
  onApplyRecommendation,
  onOpenDetails,
  onRequestTriage,
  onSelectUrgentCase,
  isApplying = false,
  isTriaging = false,
}) {
  // Case 1: No complaint selected - Compact executive banner
  if (!complaint) {
    return (
      <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-surface border border-emerald-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  AI Case Insights &amp; Automated Triage
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Vision v2.4
                </span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-1">
                Select any complaint from the operational queue to inspect AI predictions, confidence rating, and recommended routing.
              </p>
            </div>
          </div>

          {onSelectUrgentCase && (
            <button
              type="button"
              onClick={onSelectUrgentCase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Inspect Highest Priority Case</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const ai = complaint.aiAnalysis;

  // Case 2: Selected complaint has NO AI analysis (Empty / Integration state)
  if (!ai) {
    return (
      <div className="mb-6 p-6 rounded-3xl bg-[#FFFDF9] border border-amber-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#EBE3D0]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {complaint.id}
                </span>
                <h3 className="text-sm font-bold text-stone-900">
                  AI Triage Pending
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Inference Not Run
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-1">
                {complaint.title} &bull; {complaint.location?.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRequestTriage && (
              <button
                type="button"
                onClick={() => onRequestTriage(complaint)}
                disabled={isTriaging}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriaging ? 'animate-spin' : ''}`} />
                <span>{isTriaging ? 'Running AI Inference...' : 'Request AI Triage'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDetails && onOpenDetails(complaint)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Review Case Manually
            </button>
          </div>
        </div>

        {/* Backend API Integration Information */}
        <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>Backend Integration Notice</span>
            </div>
            <p className="text-[11.5px] text-amber-800">
              Automated image classification &amp; natural language triage require connection to FastAPI endpoint{' '}
              <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-950">
                GET /api/v1/complaints/{complaint.id}/ai-insights
              </code>{' '}
              or{' '}
              <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-950">
                POST /api/v1/ai/triage
              </code>.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2.5 py-1 rounded-md shrink-0 self-start md:self-auto">
            SERVICE READY FOR CONNECTION
          </span>
        </div>
      </div>
    );
  }

  // Case 3: Selected complaint has AI analysis data
  const isConfirmed =
    ai.isConfirmed ||
    complaint.status === 'assigned' ||
    complaint.status === 'in_progress' ||
    complaint.status === 'resolved';

  const confidencePercent =
    typeof ai.confidenceScore === 'number'
      ? Math.round(ai.confidenceScore <= 1 ? ai.confidenceScore * 100 : ai.confidenceScore)
      : null;

  return (
    <div
      className={`mb-4 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs ${
        isConfirmed
          ? 'bg-emerald-50/20 border-2 border-emerald-600/80'
          : 'bg-amber-50/20 border-2 border-dashed border-amber-400'
      }`}
    >
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBE3D0]">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isConfirmed
                ? 'bg-emerald-700 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {isConfirmed ? <ShieldCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                {complaint.id}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                AI Case Insights &amp; Recommendation
              </h3>
              {/* Distinct Badge: AI-Generated vs Confirmed Decision */}
              {isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Officer-Confirmed Decision</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>AI Suggestion (Pending Confirmation)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600 mt-1 font-medium truncate max-w-xl">
              {complaint.title} &bull; {complaint.location?.address}
            </p>
            {!isConfirmed && (
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                Advisory only: Officer confirmation required before municipal field dispatch.
              </p>
            )}
          </div>
        </div>

        {/* Model Confidence / Metadata */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs">
          {confidencePercent !== null && (
            <div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                <span>Model Confidence</span>
                <span className="text-emerald-700 font-mono font-extrabold">{confidencePercent}%</span>
              </div>
              <div className="w-24 bg-stone-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </div>
          )}
          {ai.modelVersion && (
            <div className="border-l border-stone-200 pl-3">
              <span className="text-[10px] text-stone-400 block font-semibold">Engine</span>
              <span className="text-[11px] font-mono font-bold text-stone-700">{ai.modelVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Inferences Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-4">
        {/* 1. Predicted Category */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              <span>Predicted Category</span>
              <Layers className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="text-xs font-extrabold text-stone-900 mt-1">
              {ai.categoryLabel || ai.predictedCategory}
            </div>
          </div>
          <div className="text-[10.5px] text-stone-500 mt-2 font-medium">
            Raw code: <code className="font-mono text-emerald-800">{ai.predictedCategory}</code>
          </div>
        </div>

        {/* 2. Estimated Severity */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              <span>Estimated Severity</span>
              <Clock className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <PriorityBadge priority={ai.estimatedPriority} />
            </div>
          </div>
          <div className="text-[10.5px] text-stone-500 mt-2 font-medium">
            Target SLA:{' '}
            <strong>
              {ai.estimatedPriority === 'critical'
                ? '< 6 hours'
                : ai.estimatedPriority === 'high'
                ? '24 hours'
                : '72 hours'}
            </strong>
          </div>
        </div>

        {/* 3. Suggested Department */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#E2D8C3] flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              <span>Suggested Department</span>
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="text-xs font-extrabold text-stone-900 mt-1 line-clamp-2">
              {ai.suggestedDepartment}
            </div>
          </div>
          <div className="text-[10.5px] text-teal-700 font-semibold mt-2">
            Zonal jurisdiction routed
          </div>
        </div>

        {/* 4. Recommended Next Action */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <span>Recommended Action</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-emerald-950 mt-1 line-clamp-3 leading-snug">
              {ai.recommendedAction}
            </p>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
            Standard Operating Procedure (SOP)
          </div>
        </div>
      </div>

      {/* Duplicate Candidates Section */}
      {ai.duplicateCandidates && ai.duplicateCandidates.length > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Potential Duplicate Grievances Detected ({ai.duplicateCandidates.filter((c) => !c.isDismissed).length} active)
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
              Officer Verification Required &bull; Never Automatically Merged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ai.duplicateCandidates.map((cand) => {
              const similarityPct = Math.round(
                cand.similarityScore <= 1 ? cand.similarityScore * 100 : cand.similarityScore
              );
              return (
                <div
                  key={cand.id}
                  className={`p-3 rounded-xl bg-white border transition-all flex flex-col justify-between ${
                    cand.isDismissed
                      ? 'border-stone-200 opacity-60 bg-stone-50'
                      : 'border-amber-200 shadow-2xs hover:border-amber-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {cand.id}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {similarityPct}% semantic match
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-stone-900 line-clamp-1">{cand.title}</h5>
                    <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-1">{cand.location?.address}</p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 capitalize">
                      {cand.isDismissed ? 'Dismissed by officer' : `Status: ${cand.status?.replace('_', ' ')}`}
                    </span>
                    {onOpenDetails && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenDetails({
                            id: cand.id,
                            title: cand.title,
                            location: cand.location,
                            status: cand.status,
                            category: cand.category,
                          })
                        }
                        className="text-amber-800 hover:text-amber-950 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect Candidate</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advisory Footer & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#EBE3D0]">
        <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>
            {ai.analyzedAt ? `Inference generated ${formatDate(ai.analyzedAt)}.` : 'Inference generated via model.'}{' '}
            AI recommendations are advisory and require officer sign-off.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isConfirmed && onApplyRecommendation && (
            <button
              type="button"
              disabled={isApplying}
              onClick={() => onApplyRecommendation(complaint, ai)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isApplying ? 'Applying Suggestion...' : 'Apply AI Recommendation'}</span>
            </button>
          )}

          {onReviewRecommendation && (
            <button
              type="button"
              onClick={() => onReviewRecommendation(complaint)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-600/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Review Recommendation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenDetails && (
            <button
              type="button"
              onClick={() => onOpenDetails(complaint)}
              className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              title="Open Full Complaint Dossier"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
