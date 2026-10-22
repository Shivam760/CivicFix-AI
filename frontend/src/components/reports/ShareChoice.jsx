import React from 'react';

/**
 * ShareChoice
 * The two sharing questions, used in the report wizard and on the report page:
 * share with residents within 2 km? and if so, show my name or stay anonymous?
 * "Anonymous" hides the name from officials too.
 *
 * Props: shared, showName, onChange(shared, showName), disabled, idPrefix,
 *        cannotShare (optional reason why sharing is not possible now)
 */
export default function ShareChoice({ shared, showName, onChange, disabled, idPrefix = 'share', cannotShare = '' }) {
  return (
    <div className="space-y-2.5">
      <label className="flex items-start gap-2.5 text-xs text-navy cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-emerald-600"
          checked={shared}
          disabled={disabled || (Boolean(cannotShare) && !shared)}
          onChange={(e) => onChange(e.target.checked, showName)}
        />
        <span>
          <span className="font-bold">Share with residents within 2 km</span>
          <span className="block text-muted">
            They can see the problem, its photos and status, and say "Me too". They never see your drafts, notes or home.
          </span>
          {cannotShare && !shared && <span className="block text-amber-700 font-semibold mt-0.5">{cannotShare}</span>}
        </span>
      </label>

      <fieldset className="pl-6 space-y-1.5" disabled={disabled}>
        <legend className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Your name</legend>
        <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
          <input
            type="radio"
            name={`${idPrefix}-show-name`}
            className="accent-emerald-600"
            checked={!showName}
            onChange={() => onChange(shared, false)}
          />
          Anonymous: nobody sees my name, not even officials
        </label>
        <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
          <input
            type="radio"
            name={`${idPrefix}-show-name`}
            className="accent-emerald-600"
            checked={showName}
            onChange={() => onChange(shared, true)}
          />
          Show my name to neighbours and officials
        </label>
      </fieldset>
    </div>
  );
}
