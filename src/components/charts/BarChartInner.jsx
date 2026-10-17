import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/**
 * Custom animated tooltip for civic grievance activity
 */
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-surface/95 backdrop-blur-md p-3 rounded-xl border border-border shadow-lg text-xs min-w-[130px] animate-fadeIn">
      <div className="font-bold text-navy mb-1.5 pb-1 border-b border-border">{label}</div>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize">{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-navy tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * BarChartInner
 * Recharts implementation of the monthly activity comparison chart.
 */
export default function BarChartInner({ data = [], height = 220, title = 'Monthly Complaint Activity' }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-xs text-muted">No chart data available.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-navy uppercase tracking-wider">{title}</h4>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            <span>Submitted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />
            <span>Resolved</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #E5DAC4)" opacity={0.5} />
            <XAxis
              dataKey="month"
              stroke="var(--color-muted, #78716C)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border, #E5DAC4)' }}
            />
            <YAxis
              stroke="var(--color-muted, #78716C)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border, #E5DAC4)' }}
              className="tabular-nums"
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--color-border, #E5DAC4)', opacity: 0.2 }} />
            <Bar
              dataKey="submitted"
              name="Submitted"
              fill="var(--color-primary, #10B981)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="resolved"
              name="Resolved"
              fill="#14B8A6"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
