import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

/**
 * Custom tooltip for category breakdown donut chart
 */
function CustomDonutTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];

  return (
    <div className="bg-surface/95 backdrop-blur-md p-2.5 rounded-xl border border-border shadow-lg text-xs min-w-[110px] animate-fadeIn">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: item.payload.color || item.color }}
        />
        <span className="font-bold text-navy truncate">{item.name}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>Cases:</span>
        <span className="font-mono font-bold text-navy tabular-nums">{item.value}</span>
      </div>
      {item.payload.percentage !== undefined && (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Share:</span>
          <span className="font-mono font-bold text-primary tabular-nums">{item.payload.percentage}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * DonutChartInner
 * Recharts implementation of the category distribution breakdown chart.
 */
export default function DonutChartInner({
  data = [],
  title = 'Category Breakdown',
  centerLabel = 'Total',
  centerValue = '1,482',
}) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-xs text-muted">No distribution data.</div>;
  }

  // Format data for Recharts Pie
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.count || d.value || 0,
    color: d.color,
    percentage: d.percentage,
  }));

  return (
    <div className="w-full">
      <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-4">{title}</h4>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Recharts Pie Donut Ring with Center Overlay */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomDonutTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={68}
                paddingAngle={3}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || 'var(--color-primary, #10B981)'}
                    className="hover:opacity-85 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Statistic Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
              {centerLabel}
            </span>
            <span className="text-lg font-black text-navy tabular-nums">{centerValue}</span>
          </div>
        </div>

        {/* Category Legend List */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-navy/80 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 tabular-nums">
                <span className="text-muted">{item.count}</span>
                <span className="font-bold text-navy">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
