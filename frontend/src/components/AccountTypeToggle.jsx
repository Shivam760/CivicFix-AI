import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
 *
 * The green pill slides to the chosen option (framer-motion layoutId, like the
 * sidebar's active item), the icon gives a small pop, and the hint below
 * cross-fades. All motion is skipped when the OS asks for reduced motion.
 *
 * hints: optional { citizen: '...', official: '...' } shown under the switch.
 */
export default function AccountTypeToggle({ value, onChange, name, legend, hints, disabled = false }) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 };

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
              className={`relative flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold cursor-pointer transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500 ${
                selected ? 'text-white' : 'text-slate-600 hover:text-slate-900'
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
              {selected && (
                // One pill per switch (layoutId uses the radio name), so two
                // switches on a page never fight over it.
                <motion.span
                  layoutId={`${name}-pill`}
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-emerald-600 shadow-sm shadow-emerald-700/30"
                  aria-hidden="true"
                />
              )}
              <motion.span
                key={selected ? 'on' : 'off'}
                initial={reduce || !selected ? false : { scale: 0.6, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={spring}
                className="relative z-10 flex"
                aria-hidden="true"
              >
                <Icon className="w-4 h-4" />
              </motion.span>
              <span className="relative z-10">{label}</span>
            </label>
          );
        })}
      </div>

      {hints && (
        <div className="relative min-h-[1.25rem] mt-1.5 px-1" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={value}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
              className="text-xs text-slate-500 text-left"
            >
              {hints[value]}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
    </fieldset>
  );
}
