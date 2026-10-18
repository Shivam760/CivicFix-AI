import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

/**
 * PrimaryButton
 * Institutional Municipal Authority button in deep emerald & teal gradient with specular depth.
 * Features:
 * - High-trust civic emerald gradient with top bevel highlight
 * - Fluid hover, active, and focus transitions
 * - Dynamic arrow motion on hover
 * - Accessible loading spinner state
 * - Screen-reader friendly aria-busy attribute
 */
export default function PrimaryButton({
  children,
  onClick,
  type = 'submit',
  disabled = false,
  loading = false,
  className = '',
  showArrow = true,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`group relative w-full min-h-[54px] sm:min-h-[58px] py-4 px-8 rounded-full font-bold text-[16px] sm:text-[17px] tracking-wide text-white bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-600 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all duration-200 border-t border-emerald-300/40 shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:shadow-emerald-700/30 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-white" aria-hidden="true" />
          <span>Processing request...</span>
        </>
      ) : (
        <span className="inline-flex items-center gap-2.5 transition-transform duration-200">
          <span>{children}</span>
          {showArrow && (
            <ArrowRight className="w-5 h-5 text-emerald-200 transition-transform duration-200 group-hover:translate-x-1.5 group-hover:text-white" aria-hidden="true" />
          )}
        </span>
      )}
    </button>
  );
}
