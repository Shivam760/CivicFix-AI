import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Mail, Lock, Phone } from 'lucide-react';

/**
 * FormField
 * Luxurious capsule input field with notched top label, subtle glass translucency,
 * refined leading icons, and accessible interactions.
 */
export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  error,
  required = false,
  disabled = false,
  className = '',
  backgroundColor = '#FAF6EB',
  showIcon = true,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const errorId = error ? `${id}-error` : undefined;

  // Determine appropriate leading civic icon
  let IconComponent = null;
  if (showIcon) {
    if (type === 'email' || (name && name.includes('email'))) {
      IconComponent = Mail;
    } else if (isPassword) {
      IconComponent = Lock;
    } else if (type === 'tel' || (name && name.includes('phone'))) {
      IconComponent = Phone;
    }
  }

  return (
    <div className={`w-full group ${className}`}>
      <div className="relative">
        {/* Notched / Floating Label sitting directly on the pill border */}
        {label && (
          <label
            htmlFor={id}
            style={{ backgroundColor: backgroundColor || '#FAF6EB' }}
            className={`absolute -top-2.5 left-6 px-2.5 text-[11.5px] font-bold uppercase tracking-wider transition-all duration-200 pointer-events-none z-10 ${
              error
                ? 'text-red-600'
                : 'text-stone-600 group-focus-within:text-emerald-700'
            }`}
          >
            {label}
          </label>
        )}

        {/* Pill-shaped Capsule Input Container with generous height */}
        <div
          className={`relative flex items-center min-h-[54px] sm:min-h-[58px] rounded-full border transition-all duration-200 ${
            error
              ? 'border-red-500 bg-red-50/20 ring-4 ring-red-500/10'
              : 'border-[#D8CEBA] bg-white/90 hover:border-[#B5A890] hover:bg-white focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/15 shadow-2xs hover:shadow-xs focus-within:shadow-md'
          } ${disabled ? 'opacity-60 bg-stone-100 cursor-not-allowed' : ''}`}
        >
          {/* Subtle Leading Icon - Sized up */}
          {IconComponent && (
            <div className="pl-5 pr-1 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors duration-200">
              <IconComponent className="w-5 h-5" aria-hidden="true" />
            </div>
          )}

          {/* Core Input Element - Transparent inner input, no border/outline/box-shadow */}
          <input
            id={id}
            name={name || id}
            type={inputType}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required={required}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none py-4 text-[15.5px] sm:text-[16px] font-medium text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed ${
              IconComponent ? 'pl-3 pr-5' : 'px-6'
            }`}
            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
          />

          {/* Accessible Password Reveal Toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={disabled}
              className="mr-5 p-1.5 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-full transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Eye className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Accessible Inline Validation Error Message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-1.5 ml-4 flex items-center gap-1.5 text-xs text-red-600 font-medium animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
