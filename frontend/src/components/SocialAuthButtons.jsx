import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

/**
 * GoogleIcon
 * Official multi-colored Google 'G' vector logo.
 */
function GoogleIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * FacebookIcon
 * Official Facebook brand logo.
 */
function FacebookIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/**
 * AppleIcon
 * Official monochrome Apple logo.
 */
function AppleIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.6-0.73 1.01-1.75.9-2.77-.87.04-1.92.58-2.54 1.31-.55.64-.99 1.68-.86 2.67.97.08 1.94-.48 2.5-1.21z" />
    </svg>
  );
}

/**
 * SocialAuthButtons
 * Renders the circular Google, Facebook, and Apple authentication buttons
 * with official SVG logos and clear developer feedback.
 */
export default function SocialAuthButtons({ _actionText = 'sign in' }) {
  const [activeProviderNotice, setActiveProviderNotice] = useState(null);

  const handleSocialClick = (provider) => {
    setActiveProviderNotice({
      provider,
      message: `${provider} OAuth integration is awaiting client credentials in FastAPI config. Please use standard email authentication for now.`,
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Visual Separator: Clean Hairline Rule with "- or -" */}
      <div className="flex items-center gap-4 my-4 w-full">
        <div className="flex-1 h-px bg-[#E5DAC4]/80" />
        <span className="text-xs text-stone-600 font-semibold tracking-wider">
          - or -
        </span>
        <div className="flex-1 h-px bg-[#E5DAC4]/80" />
      </div>

      {/* Social Buttons Row (Official Google, Facebook, Apple logos - Enlarged) */}
      <div className="flex items-center justify-center gap-5">
        {/* Google */}
        <button
          type="button"
          onClick={() => handleSocialClick('Google')}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#E5DAC4] bg-[#FFFDF9] hover:bg-[#FAF6ED] hover:border-[#D8CEBA] active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
          aria-label="Sign in with Google"
          title="Sign in with Google"
        >
          <GoogleIcon className="w-6 h-6" />
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={() => handleSocialClick('Facebook')}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#E5DAC4] bg-[#FFFDF9] hover:bg-[#FAF6ED] hover:border-[#D8CEBA] active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
          aria-label="Sign in with Facebook"
          title="Sign in with Facebook"
        >
          <FacebookIcon className="w-6 h-6" />
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={() => handleSocialClick('Apple')}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-[#E5DAC4] bg-[#FFFDF9] hover:bg-[#FAF6ED] hover:border-[#D8CEBA] active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
          aria-label="Sign in with Apple"
          title="Sign in with Apple"
        >
          <AppleIcon className="w-6 h-6 text-stone-900" />
        </button>
      </div>

      {/* Non-intrusive Provider Notice Modal / Toast */}
      {activeProviderNotice && (
        <div
          role="status"
          className="mt-3.5 p-3 w-full max-w-sm rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-fadeIn shadow-xs"
        >
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <span className="font-semibold">{activeProviderNotice.provider} Authentication:</span>{' '}
            {activeProviderNotice.message}
          </div>
          <button
            type="button"
            onClick={() => setActiveProviderNotice(null)}
            className="text-amber-700 hover:text-amber-900 p-0.5 rounded focus:outline-none cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
