import React, { Suspense } from 'react';
import Skeleton from '../common/Skeleton';

// Lazy-load Recharts bundle to preserve minimal initial bundle size
const LazyBarChartInner = React.lazy(() => import('./BarChartInner'));

/**
 * SimpleBarChart
 * Accessible, lazy-loaded Recharts bar chart for civic grievance activity.
 * Preserves exact original props (data, height, title) with smooth skeleton fallback.
 */
export default function SimpleBarChart(props) {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-3 py-2">
          <div className="flex justify-between items-center mb-2">
            <Skeleton variant="text" width="160px" height="14px" />
            <Skeleton variant="rectangular" width="110px" height="14px" className="rounded-md" />
          </div>
          <Skeleton variant="rectangular" width="100%" height={`${props.height || 200}px`} className="rounded-xl" />
        </div>
      }
    >
      <LazyBarChartInner {...props} />
    </Suspense>
  );
}
