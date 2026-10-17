import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

/**
 * StatCard
 * Professional metric summary card with icon, number, label, optional trend, and supporting context.
 * Utilizes the reusable Card component with 3D tilt and tabular figures for numbers.
 */
export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor = 'emerald', // 'emerald' | 'teal' | 'blue' | 'amber' | 'purple' | 'rose'
  badge,
  trend, // Optional: { value: string, direction?: 'up' | 'down', isGood?: boolean, label?: string }
  onClick,
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      pill: 'bg-emerald-100 text-emerald-800',
    },
    teal: {
      bg: 'bg-teal-50 text-teal-700 border-teal-200/60',
      pill: 'bg-teal-100 text-teal-800',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200/60',
      pill: 'bg-blue-100 text-blue-800',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      pill: 'bg-amber-100 text-amber-800',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200/60',
      pill: 'bg-purple-100 text-purple-800',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      pill: 'bg-rose-100 text-rose-800',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.emerald;

  return (
    <Card
      variant="flat"
      tilt={true}
      onClick={onClick}
      className={`p-5 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-primary/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-bold text-muted uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${scheme.bg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight tabular-nums">
            {value}
          </span>
          {badge && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${scheme.pill}`}>
              {badge}
            </span>
          )}
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold">
            {trend.direction === 'down' ? (
              <TrendingDown
                className={`w-3.5 h-3.5 ${trend.isGood ? 'text-emerald-600' : 'text-rose-600'}`}
              />
            ) : (
              <TrendingUp
                className={`w-3.5 h-3.5 ${trend.isGood ? 'text-emerald-600' : 'text-rose-600'}`}
              />
            )}
            <span className={trend.isGood ? 'text-emerald-700' : 'text-rose-700'}>
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-muted font-normal">{trend.label}</span>
            )}
          </div>
        )}

        {subtext && <p className="text-xs text-muted font-medium mt-1 line-clamp-1">{subtext}</p>}
      </div>
    </Card>
  );
}
