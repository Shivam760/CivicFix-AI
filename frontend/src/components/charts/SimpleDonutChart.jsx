import React, { Suspense } from 'react';
import Skeleton from '../common/Skeleton';

// Lazy-load Recharts bundle to preserve minimal initial bundle size
const LazyDonutChartInner = React.lazy(() => import('./DonutChartInner'));

/**
 * SimpleDonutChart
 * Accessible, lazy-loaded Recharts donut chart for grievance category distribution.
 * Preserves exact original props (data, title, centerLabel, centerValue) with smooth skeleton fallback.
 */
export default function SimpleDonutChart(props) {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-3 py-2">
          <Skeleton variant="text" width="140px" height="14px" className="mb-4" />
          <div className="flex items-center gap-6">
            <Skeleton variant="circular" width="140px" height="140px" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="90%" height="12px" />
              <Skeleton variant="text" width="80%" height="12px" />
              <Skeleton variant="text" width="85%" height="12px" />
              <Skeleton variant="text" width="70%" height="12px" />
            </div>
          </div>
        </div>
      }
    >
      <LazyDonutChartInner {...props} />
    </Suspense>
  );
}
