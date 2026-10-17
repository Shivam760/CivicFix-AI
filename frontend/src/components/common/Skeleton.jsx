import React from 'react';

/**
 * Skeleton component with linear gradient shimmer animation.
 * Replaces spinner loading states with content-shaped placeholders.
 */
export default function Skeleton({
  variant = 'rectangular', // 'text' | 'circular' | 'rectangular' | 'card' | 'statCard'
  width,
  height,
  className = '',
}) {
  const baseClasses =
    'relative overflow-hidden bg-border/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent';

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} rounded-full shrink-0 ${className}`}
        style={{ width: width || '40px', height: height || '40px' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'text') {
    return (
      <div
        className={`${baseClasses} rounded-md h-3.5 my-1 ${className}`}
        style={{ width: width || '100%', height }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'statCard') {
    return (
      <div
        className={`p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between ${className}`}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <Skeleton variant="text" width="55%" height="12px" />
          <Skeleton variant="circular" width="36px" height="36px" />
        </div>
        <div>
          <Skeleton variant="rectangular" width="40%" height="28px" className="rounded-lg mb-2" />
          <Skeleton variant="text" width="70%" height="10px" />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`p-4 rounded-2xl bg-surface border border-border space-y-3 ${className}`}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="30%" height="14px" />
          <Skeleton variant="rectangular" width="60px" height="20px" className="rounded-full" />
        </div>
        <Skeleton variant="rectangular" width="100%" height="60px" className="rounded-xl" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant="text" width="45%" height="12px" />
          <Skeleton variant="text" width="25%" height="12px" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} rounded-xl ${className}`}
      style={{ width: width || '100%', height: height || '80px' }}
      aria-hidden="true"
    />
  );
}

/**
 * Composite Dashboard Skeleton grid matching dashboard stats and tables
 */
export function DashboardSkeleton({ count = 4 }) {
  return (
    <div className="space-y-6 w-full animate-fadeIn" aria-busy="true" aria-label="Loading content">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <Skeleton key={idx} variant="statCard" height="120px" />
        ))}
      </div>
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="220px" height="18px" />
          <Skeleton variant="rectangular" width="120px" height="32px" className="rounded-xl" />
        </div>
        <div className="space-y-2.5">
          <Skeleton variant="rectangular" width="100%" height="44px" className="rounded-lg" />
          <Skeleton variant="rectangular" width="100%" height="44px" className="rounded-lg" />
          <Skeleton variant="rectangular" width="100%" height="44px" className="rounded-lg" />
        </div>
      </div>
    </div>
  );
}
