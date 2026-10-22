import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingState
 * Accessible loading indicator with optional skeleton cards.
 */
export default function LoadingState({ message = 'Loading records from municipal servers...', cardsCount = 3 }) {
  return (
    <div className="py-8 space-y-4" role="status" aria-live="polite">
      <div className="flex items-center justify-center gap-2.5 text-sm text-stone-500 font-medium">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        <span>{message}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-surface-canvas border border-border" />
        ))}
      </div>
    </div>
  );
}
