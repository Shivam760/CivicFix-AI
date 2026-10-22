import React from 'react';
import { Sparkles, HelpCircle, Building2, AlertTriangle } from 'lucide-react';
import { Section, NoteBox, ErrorBox, btnPrimary, btnSecondary } from './ui';
import { categoryLabel } from '../../constants/civicCategories';
import { formatDate } from '../../utils/formatters';

/**
 * AiSuggestionPanel
 * Shows the latest AI analysis (api-contract.md section 5). Everything here is
 * a suggestion: nothing is saved to the report until the citizen clicks
 * "Use this ...", which sends a PATCH.
 *
 * Props:
 *   analysis     the analyze/analysis response, or null if never analysed
 *   report       the current report (to see what is already applied)
 *   authorities  GET /authorities items (to show the suggested authority's real name)
 *   locked       report is locked or closed: no new analysis
 *   busy, error
 *   onAnalyze(), onApplyCategory(value), onApplyAuthority(id)
 */
export default function AiSuggestionPanel({
  analysis,
  report,
  authorities,
  locked,
  busy,
  error,
  onAnalyze,
  onApplyCategory,
  onApplyAuthority,
}) {
  const result = analysis?.result;
  const category = result?.suggested_category;
  const authorityId = result?.authority_suggestion?.authority_id;
  // The authority's name and verification come from the directory, never from the AI.
  const authority = authorityId ? authorities.find((a) => a.id === authorityId) : null;

  const analyzeButton = !locked && (
    <button type="button" className={result ? btnSecondary : btnPrimary} onClick={onAnalyze} disabled={busy}>
      <Sparkles className="w-3.5 h-3.5" />
      {busy ? 'Analysing...' : result ? 'Analyse again' : 'Get AI suggestion'}
    </button>
  );

  return (
    <Section title="AI suggestion" icon={Sparkles} action={analyzeButton}>
      <div className="space-y-3">
        <NoteBox tone="ai">
          The AI reads your report and suggests a category, an authority and a complaint text. These are
          suggestions that can be wrong: check them before you use them. Analysing again creates a new draft
          and clears any approval.
        </NoteBox>
        <ErrorBox>{error}</ErrorBox>

        {!result ? (
          <p className="text-xs text-muted">No AI suggestion yet.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-[10.5px] text-muted">
              Suggested {formatDate(analysis.completed_at)}
              {result.model_metadata?.model_name ? ` by ${result.model_metadata.model_name}` : ''}
            </p>

            {result.warnings?.length > 0 && (
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-900 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Category */}
            <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Suggested category</div>
              {category?.value === 'unknown' ? (
                <p className="text-xs text-navy">The AI could not tell the category from the report.</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-navy">
                    {categoryLabel(category?.value)}
                    {typeof category?.confidence === 'number' && (
                      <span className="ml-2 text-[11px] font-medium text-muted">
                        confidence {Math.round(category.confidence * 100)}% (not a guarantee)
                      </span>
                    )}
                  </span>
                  {report.category === category?.value ? (
                    <span className="text-[11px] font-semibold text-emerald-700">In use</span>
                  ) : (
                    !locked && (
                      <button type="button" className={btnSecondary} onClick={() => onApplyCategory(category.value)} disabled={busy}>
                        Use this category
                      </button>
                    )
                  )}
                </div>
              )}
              {category?.reason && <p className="text-xs text-muted">{category.reason}</p>}
            </div>

            {/* Authority */}
            <div className="p-3 rounded-xl bg-surface-canvas border border-border space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Suggested authority
              </div>
              {authority ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-navy">
                    {authority.name}
                    <span
                      className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        authority.verification_status === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {authority.verification_status === 'verified' ? 'Verified in directory' : 'Not verified'}
                    </span>
                  </span>
                  {report.authority_id === authority.id ? (
                    <span className="text-[11px] font-semibold text-emerald-700">In use</span>
                  ) : (
                    !locked &&
                    authority.verification_status === 'verified' && (
                      <button type="button" className={btnSecondary} onClick={() => onApplyAuthority(authority.id)} disabled={busy}>
                        Use this authority
                      </button>
                    )
                  )}
                </div>
              ) : (
                <p className="text-xs text-navy">No authority suggested.</p>
              )}
              {result.authority_suggestion?.reason && (
                <p className="text-xs text-muted">{result.authority_suggestion.reason}</p>
              )}
            </div>

            {/* Missing information */}
            {result.missing_fields?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">The AI suggests adding</div>
                <ul className="space-y-2">
                  {result.missing_fields.map((m, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-px" />
                      <span>
                        <strong className="text-navy">{m.question}</strong>
                        <span className="block text-muted">{m.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
