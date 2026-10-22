import React from 'react';
import { User, Briefcase } from 'lucide-react';
import { ACCOUNT_TYPES } from '../constants/roles';

const OPTIONS = [
  { value: ACCOUNT_TYPES.CITIZEN, label: 'Citizen', Icon: User },
  { value: ACCOUNT_TYPES.OFFICIAL, label: 'Official', Icon: Briefcase },
];

/**
 * AccountTypeToggle
 * The Citizen / Official choice on the sign-in and sign-up pages. Real radio
 * buttons (visually hidden) inside a fieldset, so arrow keys and screen
 * readers work as with any radio group.
 */
export default function AccountTypeToggle({ value, onChange, name, legend, disabled = false }) {
  return (
    <fieldset className="w-full" disabled={disabled}>
      <legend className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 px-1">
        {legend}
      </legend>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100 border border-slate-200">
        {OPTIONS.map(({ value: optionValue, label, Icon }) => {
          const selected = value === optionValue;
          return (
            <label
              key={optionValue}
              className={`flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500 ${
                selected ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={selected}
                onChange={() => onChange(optionValue)}
                className="sr-only"
              />
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
