import React from 'react';

/**
 * SimpleGaugeChart
 * Radial arc gauge inspired by the Shopeers reference dashboard.
 * Perfect for municipal resolution SLA rates and compliance scores.
 * Uses theme tokens and tabular-nums for numeric figures.
 */
export default function SimpleGaugeChart({
  percentage = 74,
  title = 'Resolution SLA Rate',
  targetText = 'Municipal Target: 80%',
}) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));

  // Arch parameters: cx=80, cy=85, r=60
  // Arc length for 180-degree semi-circle = PI * r
  const radius = 60;
  const arcLength = Math.PI * radius; // ~188.5
  const strokeOffset = arcLength * (1 - clamped / 100);

  return (
    <div className="w-full text-center flex flex-col items-center justify-between h-full py-1">
      <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">{title}</h4>

      <div className="relative w-48 h-28 flex items-end justify-center">
        <svg
          className="w-48 h-28 overflow-visible"
          viewBox="0 0 160 95"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="slaGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="var(--color-primary, #10B981)" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20,85 A 60,60 0 0,1 140,85"
            fill="none"
            stroke="var(--color-border, #E5DAC4)"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Active progress arc sweeping clockwise from left (0%) to right (100%) */}
          <path
            d="M 20,85 A 60,60 0 0,1 140,85"
            fill="none"
            stroke="url(#slaGaugeGradient)"
            strokeWidth="11"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center percentage readout */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl sm:text-[34px] font-black text-navy tracking-tight leading-none tabular-nums">
            {clamped}%
          </span>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">
            Fulfilled
          </span>
        </div>
      </div>

      <p className="text-xs font-medium text-muted mt-2">{targetText}</p>
    </div>
  );
}
