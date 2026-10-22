import React, { Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import pinAnimationData from '../../assets/lottie/pin.json';

// Lazy-load lottie-react to keep initial bundle size lean.
// lottie-react v3 has no default export (the component is the named export
// `Lottie`), but React.lazy needs { default: Component }. Without this mapping
// React throws and the whole page goes blank.
const LazyLottie = React.lazy(() => import('lottie-react').then((mod) => ({ default: mod.Lottie })));

/**
 * EmptyState
 * Accessible, clear empty state when no records exist.
 * Features a subtle civic map pin Lottie animation (<5kB) that respects
 * reduced motion settings by rendering a static icon fallback.
 */
export default function EmptyState({
  title = 'No records found',
  description = 'There are currently no items to display.',
  icon: FallbackIcon = MapPin,
  actionLabel,
  onAction,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bg-surface rounded-2xl border border-border p-10 text-center flex flex-col items-center justify-center my-4 shadow-2xs">
      <div className="w-20 h-20 rounded-2xl bg-surface-canvas/80 text-primary flex items-center justify-center mb-4 border border-border overflow-hidden">
        {shouldReduceMotion ? (
          <FallbackIcon className="w-8 h-8 text-primary" />
        ) : (
          <Suspense fallback={<FallbackIcon className="w-8 h-8 text-primary/70 animate-pulse" />}>
            <div className="w-16 h-16 flex items-center justify-center">
              <LazyLottie
                src={pinAnimationData}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </Suspense>
        )}
      </div>

      <h3 className="text-base font-bold text-navy mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-muted max-w-md mb-5 leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
