import React from 'react';
import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/validation';

/**
 * PasswordStrength
 * Accessible, elegant visual strength meter and criteria checklist.
 */
export default function PasswordStrength({ password = '' }) {
  if (!password) return null;

  const { score, label, color, hasMinLength, hasLetter, hasNumber } =
    evaluatePasswordStrength(password);

  return (
    <div className="w-full mt-2.5 px-3 py-2 bg-gray-50/80 rounded-xl border border-gray-200 text-xs text-gray-600 transition-all">
      {/* Strength Bar */}
      <div className="flex items-center justify-between mb-1.5" id="password-strength-container">
        <span className="font-medium text-gray-700">Security strength:</span>
        <span id="password-strength-label" className="font-semibold" style={{ color }}>
          {label}
        </span>
      </div>

      <div className="flex gap-1 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${(score / 4) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Helpful criteria indicators */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700' : 'text-gray-500'}`}>
          {hasMinLength ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span>8+ characters</span>
        </div>
        <div className={`flex items-center gap-1 ${hasLetter && hasNumber ? 'text-emerald-700' : 'text-gray-500'}`}>
          {hasLetter && hasNumber ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span>Letters &amp; numbers</span>
        </div>
      </div>
    </div>
  );
}
